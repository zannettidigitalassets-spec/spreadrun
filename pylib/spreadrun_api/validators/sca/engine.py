"""SpreadRun SCA Health and Welfare fringe math checker.

Checks, employee by employee, whether a Service Contract Act contractor furnished the health and welfare (H&W) fringe
benefit a fixed-rate wage determination requires for one pay period, and flags the recordkeeping problems DOL lists as
common violations in Fact Sheet #67B. SpreadRun's own engine (not a DataForge copy). No network calls.

Input, either:
  * JSON: {"parameters": {...}, "employeesCsv": "..."}
  * CSV text (the employees table) with the parameters in the query string
  * an .xlsx workbook: an "Employees" sheet (or the first sheet), parameters in the query string or in an optional
    "Parameters" sheet of name and value rows

Rules, all read October 7, 2026:
  29 CFR 4.175(a) and 4.172  H&W is due on all hours paid, including paid vacation, sick leave and holidays, up to
                             40 hours a week and 2,080 hours a year on each contract; no deduction for the
                             contractor's administrative costs.
  29 CFR 4.175(a)(2), FS67B  a fixed per-hour rate is met employee by employee, never averaged.
  29 CFR 4.175(b), AAM 246   average cost H&W wage determinations: not issued or used for new contracts after
                             July 16, 2024. Not supported here.
  29 CFR 4.175(c), 4.176     part-time employees get H&W pro-rated to hours paid; plan exclusions mean cash instead.
  29 CFR 4.177               the obligation may be met with bona fide benefits, cash in lieu, or both, equal in cost.
  29 CFR 4.170(a)            wages above the wage determination rate cannot offset H&W; wages and fringe payments must
                             be recorded separately.
  29 CFR 4.171(a)(1)         contributions made by employees, or taken from their wages, are not creditable.
  rates.json                 the rates (AAM 252, effective August 10, 2026). Never hardcoded below.

Reports never contain a value from the input (employee references, hours or amounts as entered). Rows are named by
their line number in the file; the per-employee figures are computed by this engine.
"""
import csv
import hashlib
import io
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONFIG = json.loads((HERE / 'rates.json').read_text())
RATES = {k: Decimal(v) for k, v in CONFIG['rates'].items()}

WEEKLY_CAP = Decimal(40)
ANNUAL_CAP = Decimal(2080)
CENT = Decimal('0.01')
HOUR = Decimal('0.01')
MAX_ROWS = 5000
DEMO_MAX_ROWS = 10
MAX_WEEKS = 53
MAX_FINDINGS = 500
MAX_XLSX_UNZIPPED = 50 * 1024 * 1024
MAX_RATE = Decimal(100)

SOURCES = {
    'cfr4.170': '29 CFR 4.170(a): fringe benefits separate from and in addition to wages; no offset by higher wages; '
                'separate records',
    'cfr4.171': '29 CFR 4.171(a)(1): employee contributions are not creditable',
    'cfr4.172': '29 CFR 4.172: the stated amount is the minimum; no deduction for administrative costs; 40 hours a '
                'week and 2,080 a year',
    'cfr4.175': '29 CFR 4.175: health and welfare on all hours paid, employee by employee; average cost '
                'determinations; employees excluded from a plan',
    'cfr4.176': '29 CFR 4.176: temporary and part-time employees, pro-rated benefits',
    'cfr4.177': '29 CFR 4.177: meeting the obligation with equivalent benefits or cash',
    'fs67b': 'DOL Wage and Hour Division Fact Sheet #67B (October 2024): Meeting Requirements for SCA Fringe Benefits, '
             'Common Violations',
    'aam246': 'DOL All Agency Memorandum No. 246 (July 16, 2024): average cost H&W wage determinations not issued or '
              'used for new contracts',
    'rates': f"DOL {CONFIG['memo']}, effective {CONFIG['effective']}, as printed on current SAM.gov wage determinations",
}

METHODOLOGY = [
    'Hours counted: all hours paid in the period, including paid vacation, sick leave and holidays, up to 40 per week. '
    'With weekly hour columns each week is capped at 40; without them the period total is capped at 40 times the '
    'number of weeks. If ytd_hw_hours is given, hours past 2,080 for the contract year are not counted.',
    'Required H&W: hours counted times the H&W rate, rounded to the cent.',
    'Furnished H&W: bona fide plan contributions plus cash in lieu, less any administrative costs or employee-paid '
    'amounts included in the contributions, which cannot be credited.',
    'Shortfall: required minus furnished, when positive. Each employee is checked on their own; an overpayment for '
    'one employee never covers another.',
    'Back wage exposure: the sum of the shortfalls for the period.',
]

NOT_CHECKED = [
    'Whether your wage determination is the right one for the contract, and whether its rate is the one in effect. '
    'Existing contracts change rates only when the contracting officer adds a revised wage determination.',
    'Whether each worker is a covered service employee and correctly classified.',
    'Whether your plans are bona fide under 29 CFR 4.171: written, funded, irrevocable and communicated to employees.',
    'Vacation, holiday and EO 13706 paid sick leave obligations. Paid sick leave under EO 13706 cannot be credited '
    'toward H&W.',
    'Whether cash in lieu was paid on the regular payday and whether the hours and amounts you entered are accurate.',
    'Average cost health and welfare wage determinations.',
]

SCOPE = ('A math check of the H&W amounts you entered against the published SCA rules. It is not a compliance '
         'determination, not legal advice and not DOL acceptance. A PASS means the arithmetic on these rows meets the '
         'rate you chose; your obligations under the contract remain yours.')

AVERAGE_COST = ('This check supports fixed-rate (employee by employee) health and welfare wage determinations only. '
                'Average cost determinations work differently: contributions are averaged across everyone in the plan '
                '(29 CFR 4.175(b)), and DOL stopped issuing them for new contracts in All Agency Memorandum 246 (July '
                '16, 2024). No result was produced and nothing was charged.')

COLUMNS = {
    'employee_ref': ('employee_ref', 'employee_id', 'employee', 'emp_id', 'id', 'ref', 'employee_number'),
    'hours_paid': ('hours_paid', 'total_hours_paid', 'hours', 'paid_hours'),
    'plan_contributions': ('plan_contributions', 'bona_fide_plan_contributions', 'contributions', 'hw_contributions',
                           'plan_contribution'),
    'cash_in_lieu': ('cash_in_lieu', 'cash_in_lieu_paid', 'cil', 'hw_cash_in_lieu'),
    'ytd_hw_hours': ('ytd_hw_hours', 'ytd_hours', 'prior_hw_hours'),
    'admin_costs_credited': ('admin_costs_credited', 'admin_costs', 'administrative_costs', 'admin_fees'),
    'employee_paid_included': ('employee_paid_included', 'employee_contributions', 'employee_paid'),
    'hw_hours_credited': ('hw_hours_credited', 'hours_credited', 'credited_hours'),
    'wage_rate_paid': ('wage_rate_paid', 'rate_paid', 'hourly_rate_paid'),
    'wd_wage_rate': ('wd_wage_rate', 'wd_rate', 'wage_determination_rate'),
    'cash_in_lieu_separate': ('cash_in_lieu_separate', 'cil_separate_line', 'cash_in_lieu_separate_line'),
    'hphca_covered': ('hphca_covered', 'hawaii_hphca', 'hphca'),
}
ALIASES = {a: k for k, names in COLUMNS.items() for a in names}
WEEK_COL = re.compile(r'^hours_week_(\d{1,2})$')
REQUIRED = ('hours_paid', 'plan_contributions', 'cash_in_lieu')
FORBIDDEN_COLUMNS = re.compile(r'(^|_)(ssn|social_security|name|first_name|last_name)($|_)')
SSN = re.compile(r'^\d{3}-\d{2}-\d{4}$')

RULE_ITEM = {'SCA-CIL-NOT-SEPARATE': 'separate', 'SCA-WAGE-OFFSET': 'separate', 'SCA-PART-TIME': 'partTime',
             'SCA-CREDIT-HOURS-HIGH': 'partTime', 'SCA-ADMIN-COSTS': 'adminCosts'}
RECORDKEEPING = [
    ('separate', 'Wages kept separate from H&W fringe on payroll records'),
    ('partTime', 'Part-time employees given pro-rated H&W'),
    ('adminCosts', 'No administrative costs or fees credited against H&W'),
]


class InputError(ValueError):
    """The input cannot be checked (400, never charged). Messages never repeat submitted values."""


class Report:
    def __init__(self):
        self.findings = []

    def add(self, sev, rule, line, msg, source):
        self.findings.append({'severity': sev, 'ruleId': rule, 'path': f'/employees/line[{line}]', 'line': line,
                              'message': msg, 'source': source})


def norm_key(k):
    return re.sub(r'[^a-z0-9]+', '_', str(k).strip().lower()).strip('_')


def money(d):
    return str(d.quantize(CENT, ROUND_HALF_UP))


def hours_str(d):
    return str(d.quantize(HOUR, ROUND_HALF_UP))


# ------------------------------------------------------------------ parameters
TRUE = {'true', 'yes', 'y', '1', 'on'}
FALSE = {'false', 'no', 'n', '0', 'off'}


def _bool(v, name):
    if isinstance(v, bool):
        return v
    s = str(v).strip().lower()
    if s in TRUE:
        return True
    if s in FALSE:
        return False
    raise InputError(f'{name} must be true or false.')


def _rate(v, name):
    try:
        d = Decimal(str(v).strip().replace('$', ''))
    except InvalidOperation:
        raise InputError(f'{name} must be a dollar amount per hour, such as the H&W rate printed on your wage '
                         'determination.') from None
    if not d.is_finite() or d <= 0 or d >= MAX_RATE:
        raise InputError(f'{name} must be more than 0 and less than {MAX_RATE} dollars per hour.')
    return d.quantize(Decimal('0.0001'), ROUND_HALF_UP).normalize()


PARAM_KEYS = {'wdtype': 'wdType', 'eo13706': 'eo13706', 'hawaii': 'hawaii', 'periodweeks': 'periodWeeks',
              'hwrate': 'hwRate', 'hwratehphca': 'hwRateHphca'}


def parse_params(raw):
    p = {}
    for k, v in (raw or {}).items():
        key = PARAM_KEYS.get(re.sub(r'[^a-z0-9]', '', str(k).lower()))
        if key is None:
            raise InputError('Unknown parameter. Parameters are wdType, eo13706, hawaii, periodWeeks, hwRate and '
                             'hwRateHphca.')
        if v is None or (isinstance(v, str) and not v.strip()):
            continue
        p[key] = v
    wd_type = str(p.get('wdType', 'fixed')).strip().lower().replace('-', '').replace(' ', '').replace('_', '')
    if wd_type in ('average', 'averagecost', 'avg'):
        raise InputError(AVERAGE_COST)
    if wd_type not in ('fixed', 'fixedrate', 'fixedcost', 'employeebyemployee'):
        raise InputError('wdType must be "fixed" (employee by employee). Average cost determinations are not '
                         'supported.')
    hawaii = _bool(p['hawaii'], 'hawaii') if 'hawaii' in p else False
    eo = _bool(p['eo13706'], 'eo13706') if 'eo13706' in p else None
    weeks = p.get('periodWeeks', 1)
    try:
        weeks = int(str(weeks).strip()) if not isinstance(weeks, bool) else None
    except ValueError:
        weeks = None
    if weeks is None or not 1 <= weeks <= MAX_WEEKS:
        raise InputError(f'periodWeeks must be a whole number of weeks from 1 to {MAX_WEEKS}.')
    hw = _rate(p['hwRate'], 'hwRate') if 'hwRate' in p else None
    hw_h = _rate(p['hwRateHphca'], 'hwRateHphca') if 'hwRateHphca' in p else None
    if hw_h is not None and not hawaii:
        raise InputError('hwRateHphca applies only when hawaii is true.')
    needs_eo = (hw is None) or (hawaii and hw_h is None)
    if needs_eo and eo is None:
        raise InputError('eo13706 is required: true if the contract is covered by Executive Order 13706 (paid sick '
                         'leave), false if not. It decides which H&W rate applies. Or send hwRate, the rate on your '
                         'wage determination.')
    if hw is None:
        hw, basis = RATES['eo13706' if eo else 'standard'], 'default'
    else:
        basis = 'supplied'
    rates = {'rate': hw}
    if hawaii:
        if hw_h is None:
            hw_h, basis_h = RATES['hawaiiHphcaEo13706' if eo else 'hawaiiHphca'], 'default'
        else:
            basis_h = 'supplied'
        rates['rateHphca'] = hw_h
    else:
        basis_h = None
    return {'wdType': 'fixed', 'eo13706': eo, 'hawaii': hawaii, 'periodWeeks': weeks, 'rates': rates,
            'basis': basis, 'basisHphca': basis_h}


# ------------------------------------------------------------------ input
def parse_body(body: bytes, query=None):
    query = {k: v for k, v in (query or {}).items()}
    if not body or not body.strip():
        raise InputError('Send the employees table as CSV, an .xlsx workbook, or JSON with employeesCsv.')
    if body[:2] == b'PK':
        rows, sheet_params = parse_xlsx(body)
        if sheet_params and query:
            raise InputError('Send the parameters in the query string or in the Parameters sheet, not both.')
        return rows, parse_params(sheet_params or query), 'xlsx'
    if body[:5] == b'%PDF-':
        raise InputError('This is a PDF. Send the employees table as CSV, an .xlsx workbook, or JSON.')
    try:
        text = body.decode('utf-8-sig')
    except UnicodeDecodeError:
        raise InputError('The body must be UTF-8 text (CSV or JSON) or an .xlsx workbook.') from None
    if text.lstrip().startswith('{'):
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            raise InputError('The body looks like JSON but cannot be read as JSON.') from None
        if not isinstance(payload, dict) or not isinstance(payload.get('employeesCsv'), str):
            raise InputError('The JSON body needs employeesCsv: the employees table as CSV text with a header row.')
        params = payload.get('parameters', {})
        if not isinstance(params, dict):
            raise InputError('parameters must be an object.')
        if query:
            raise InputError('With a JSON body, send the parameters in its parameters object, not the query string.')
        return read_csv(payload['employeesCsv']), parse_params(params), 'json'
    return read_csv(text), parse_params(query), 'csv'


def read_csv(text):
    try:
        recs = list(csv.reader(io.StringIO(text.lstrip('﻿'))))
    except csv.Error:
        raise InputError('The employees table is not readable CSV.') from None
    return [(i + 1, r) for i, r in enumerate(recs)]


def table(numbered):
    """numbered: [(line, cells)]. Returns (columns, [(line, {col: value})], week columns)."""
    numbered = [(n, r) for n, r in numbered if any(str(c).strip() for c in r)]
    if not numbered:
        raise InputError('The employees table is empty. It needs a header row and one row per employee.')
    head_line, head = numbered[0]
    raw = [norm_key(c) for c in head]
    if any(FORBIDDEN_COLUMNS.search(c) for c in raw if c):
        raise InputError('Leave out names and Social Security numbers. Use employee_ref for your own internal '
                         'reference, or leave it out and go by line number.')
    cols = []
    for c in raw:
        if WEEK_COL.match(c):
            cols.append(c)
        else:
            cols.append(ALIASES.get(c, c) if c else '')
    dup = [c for c, n in Counter(c for c in cols if c).items() if n > 1]
    if dup:
        raise InputError('A column appears twice (counting other names for the same column). Each may appear once.')
    unknown = [c for c in cols if c and c not in COLUMNS and not WEEK_COL.match(c)]
    if unknown:
        raise InputError('The header has a column this check does not use. Columns: employee_ref, hours_paid, '
                         'plan_contributions, cash_in_lieu, and optionally hours_week_1 to hours_week_N, ytd_hw_hours, '
                         'admin_costs_credited, employee_paid_included, hw_hours_credited, wage_rate_paid, '
                         'wd_wage_rate, cash_in_lieu_separate, hphca_covered.')
    missing = [c for c in REQUIRED if c not in cols]
    if missing:
        raise InputError(f'The header needs {", ".join(missing)}. Required columns: hours_paid, plan_contributions, '
                         'cash_in_lieu (use 0 where nothing was paid).')
    rows = []
    for line, r in numbered[1:]:
        if len(r) > len(cols) and any(str(c).strip() for c in r[len(cols):]):
            raise InputError(f'Line {line} has more cells than the header row.')
        rows.append((line, {c: (str(r[i]).strip() if i < len(r) else '') for i, c in enumerate(cols) if c}))
    if not rows:
        raise InputError('The employees table has a header row but no employees.')
    if len(rows) > MAX_ROWS:
        raise InputError(f'Send at most {MAX_ROWS} employees per run.')
    weeks = sorted(int(WEEK_COL.match(c).group(1)) for c in cols if c and WEEK_COL.match(c))
    return set(c for c in cols if c), rows, weeks


def num(v, line, col, *, blank_zero=True):
    s = str(v).strip().replace(',', '').replace('$', '')
    if s == '':
        if blank_zero:
            return Decimal(0)
        raise InputError(f'Line {line}: {col} is blank.')
    try:
        d = Decimal(s)
    except InvalidOperation:
        raise InputError(f'Line {line}: {col} is not a number.') from None
    if not d.is_finite():
        raise InputError(f'Line {line}: {col} is not a number.')
    if d < 0:
        raise InputError(f'Line {line}: {col} cannot be negative.')
    return d


def yes_no(v, line, col):
    s = str(v).strip().lower()
    if s == '':
        return None
    if s in TRUE:
        return True
    if s in FALSE:
        return False
    raise InputError(f'Line {line}: {col} must be yes or no.')


# ------------------------------------------------------------------ minimal .xlsx reader (no dependencies)
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'pr': 'http://schemas.openxmlformats.org/package/2006/relationships'}


def safe_xml(data):
    if re.search(rb'<!DOCTYPE|<!ENTITY', data, re.I):
        raise InputError('The workbook contains DOCTYPE or entity declarations, which are not accepted.')
    try:
        return ET.fromstring(data)
    except ET.ParseError:
        raise InputError('The workbook is damaged: one of its parts is not well-formed XML.') from None


def parse_xlsx(body):
    try:
        zf = zipfile.ZipFile(io.BytesIO(body))
        infos = zf.infolist()
    except (zipfile.BadZipFile, ValueError):
        raise InputError('The file starts like an .xlsx workbook but cannot be opened.') from None
    if sum(i.file_size for i in infos) > MAX_XLSX_UNZIPPED:
        raise InputError('The workbook is over 50 MB uncompressed.')
    names = {i.filename for i in infos}
    if 'xl/workbook.xml' not in names:
        raise InputError('This ZIP is not an .xlsx workbook. Send an .xlsx file (not .xls or .xlsb), CSV or JSON.')

    def read(n):
        try:
            return zf.read(n)
        except (KeyError, zipfile.BadZipFile, RuntimeError, NotImplementedError):
            raise InputError('The workbook is damaged or encrypted.') from None

    wb = safe_xml(read('xl/workbook.xml'))
    rels = {}
    if 'xl/_rels/workbook.xml.rels' in names:
        for rel in safe_xml(read('xl/_rels/workbook.xml.rels')).iter(f'{{{NS["pr"]}}}Relationship'):
            t = rel.get('Target', '')
            rels[rel.get('Id')] = t.lstrip('/') if t.startswith('/') else 'xl/' + t
    shared = []
    if 'xl/sharedStrings.xml' in names:
        for si in safe_xml(read('xl/sharedStrings.xml')).iter(f'{{{NS["m"]}}}si'):
            shared.append(''.join(t.text or '' for t in si.iter(f'{{{NS["m"]}}}t')))
    sheets = []
    for sh in wb.iter(f'{{{NS["m"]}}}sheet'):
        target = rels.get(sh.get(f'{{{NS["r"]}}}id'))
        if target not in names:
            raise InputError('The workbook is damaged: a sheet it lists is missing.')
        sheets.append((norm_key(sh.get('name', '')), target))
    if not sheets:
        raise InputError('The workbook has no sheets.')
    by_name = dict(sheets)
    emp = by_name.get('employees') or sheets[0][1]
    params = None
    if 'parameters' in by_name and by_name['parameters'] != emp:
        params = {}
        for _, r in read_sheet(safe_xml(read(by_name['parameters'])), shared):
            if len(r) >= 2 and str(r[0]).strip():
                params[str(r[0]).strip()] = r[1]
    return read_sheet(safe_xml(read(emp)), shared), params


def col_index(ref):
    letters = re.match(r'[A-Z]+', ref or '')
    if not letters:
        return None
    n = 0
    for ch in letters.group(0):
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_sheet(root, shared):
    m = NS['m']
    out = []
    for row in root.iter(f'{{{m}}}row'):
        try:
            line = int(row.get('r'))
        except (TypeError, ValueError):
            line = (out[-1][0] + 1) if out else 1
        cells = {}
        nxt = 0
        for c in row.findall(f'{{{m}}}c'):
            i = col_index(c.get('r'))
            i = nxt if i is None else i
            nxt = i + 1
            if i > 200:
                raise InputError('A sheet has more than 200 columns.')
            t = c.get('t')
            v = c.find(f'{{{m}}}v')
            if t == 'inlineStr':
                val = ''.join(x.text or '' for x in c.iter(f'{{{m}}}t'))
            elif v is None:
                val = ''
            elif t == 's':
                try:
                    val = shared[int(v.text)]
                except (ValueError, IndexError, TypeError):
                    raise InputError('The workbook is damaged: a cell points at a missing shared string.') from None
            elif t == 'b':
                val = 'TRUE' if (v.text or '') == '1' else 'FALSE'
            else:
                val = v.text or ''
            cells[i] = val
        if cells:
            vals = [''] * (max(cells) + 1)
            for i, val in cells.items():
                vals[i] = val
            out.append((line, vals))
        if len(out) > MAX_ROWS + 1:
            raise InputError(f'Send at most {MAX_ROWS} employees per run.')
    return out


# ------------------------------------------------------------------ the check
def check_rows(rep, cols, rows, weeks_cols, params):
    weeks = params['periodWeeks']
    if weeks_cols and weeks_cols != list(range(1, weeks + 1)):
        raise InputError(f'With weekly hour columns, send exactly hours_week_1 to hours_week_{weeks}, one for each '
                         'week in periodWeeks.')
    if params['hawaii'] and 'hphca_covered' not in cols:
        raise InputError('For Hawaii, add hphca_covered (yes or no) for each employee: the H&W rate depends on '
                         'whether the employer provides coverage under the Hawaii Prepaid Health Care Act.')
    if ('wage_rate_paid' in cols) != ('wd_wage_rate' in cols):
        raise InputError('Send wage_rate_paid and wd_wage_rate together, or leave both out.')
    refs = {}
    full_time_hours = WEEKLY_CAP * weeks
    out = []
    for line, r in rows:
        ref = r.get('employee_ref', '')
        if ref:
            if SSN.match(ref):
                raise InputError(f'Line {line}: employee_ref looks like a Social Security number. Use an internal '
                                 'reference instead, or leave the column out.')
            if ref.casefold() in refs:
                raise InputError(f'Lines {refs[ref.casefold()]} and {line} have the same employee_ref. Send one row '
                                 'per employee, with hours and amounts combined.')
            refs[ref.casefold()] = line
        hours = num(r['hours_paid'], line, 'hours_paid', blank_zero=False)
        plan = num(r['plan_contributions'], line, 'plan_contributions')
        cash = num(r['cash_in_lieu'], line, 'cash_in_lieu')
        admin = num(r.get('admin_costs_credited', ''), line, 'admin_costs_credited')
        emp_paid = num(r.get('employee_paid_included', ''), line, 'employee_paid_included')
        if admin + emp_paid > plan:
            raise InputError(f'Line {line}: admin_costs_credited and employee_paid_included are amounts included in '
                             'plan_contributions, so together they cannot be more than it.')
        if weeks_cols:
            wk = [num(r.get(f'hours_week_{w}', ''), line, f'hours_week_{w}') for w in weeks_cols]
            counted = sum((min(h, WEEKLY_CAP) for h in wk), Decimal(0))
            if abs(sum(wk, Decimal(0)) - hours) > HOUR:
                rep.add('warning', 'SCA-WEEKS-MISMATCH', line, 'The weekly hours do not add up to hours_paid. The '
                        'weekly hours were used.', 'cfr4.175')
        else:
            counted = min(hours, full_time_hours)
        if r.get('ytd_hw_hours', '') != '':
            ytd = num(r['ytd_hw_hours'], line, 'ytd_hw_hours')
            counted = min(counted, max(Decimal(0), ANNUAL_CAP - ytd))
        if params['hawaii']:
            covered = yes_no(r.get('hphca_covered', ''), line, 'hphca_covered')
            if covered is None:
                raise InputError(f'Line {line}: hphca_covered is blank. Enter yes or no.')
            rate = params['rates']['rateHphca'] if covered else params['rates']['rate']
        else:
            rate = params['rates']['rate']
        required = (counted * rate).quantize(CENT, ROUND_HALF_UP)
        not_creditable = admin + emp_paid
        furnished = (plan + cash - not_creditable).quantize(CENT, ROUND_HALF_UP)
        shortfall = max(Decimal(0), required - furnished)
        part_time = counted < full_time_hours

        if shortfall > 0:
            rep.add('error', 'SCA-HW-SHORTFALL', line, 'Furnished H&W is below the required amount for this employee. '
                    'The difference is owed to the employee as plan contributions or cash in lieu, and an overpayment '
                    'for another employee does not cover it.', 'cfr4.172')
        if part_time and required > 0 and furnished <= 0:
            rep.add('error', 'SCA-PART-TIME', line, 'A part-time employee received no H&W. Part-time employees are '
                    'owed H&W pro-rated to the hours they were paid, and those a plan excludes are owed the cash '
                    'equivalent. Fact Sheet #67B lists this as a common violation.', 'cfr4.176')
        if admin > 0:
            rep.add('error', 'SCA-ADMIN-COSTS', line, 'Administrative costs or fees were counted as H&W. They are a '
                    'business expense and cannot be credited, so they were taken out of the furnished amount. Fact '
                    'Sheet #67B lists this as a common violation.', 'cfr4.172')
        if emp_paid > 0:
            rep.add('error', 'SCA-EMPLOYEE-PAID', line, 'Contributions paid by the employee, or taken from their '
                    'wages, were counted as H&W. They cannot be credited, so they were taken out of the furnished '
                    'amount.', 'cfr4.171')
        if 'wage_rate_paid' in cols:
            paid_rate = num(r.get('wage_rate_paid', ''), line, 'wage_rate_paid', blank_zero=False)
            wd_rate = num(r.get('wd_wage_rate', ''), line, 'wd_wage_rate', blank_zero=False)
            if shortfall > 0 and paid_rate > wd_rate:
                rep.add('error', 'SCA-WAGE-OFFSET', line, 'This employee was paid above the wage determination rate, '
                        'but wages above that rate cannot make up an H&W shortfall. H&W must be furnished separately '
                        'and in addition to wages, so the shortfall is still owed.', 'cfr4.170')
        if cash > 0 and yes_no(r.get('cash_in_lieu_separate', ''), line, 'cash_in_lieu_separate') is False:
            rep.add('error', 'SCA-CIL-NOT-SEPARATE', line, 'Cash in lieu is not shown separately from wages on the '
                    'payroll records. Without a separate record, DOL may find the H&W was not paid. Fact Sheet #67B '
                    'lists this as a common violation.', 'cfr4.170')
        if r.get('hw_hours_credited', '') != '':
            credited = num(r['hw_hours_credited'], line, 'hw_hours_credited')
            if credited > counted + HOUR and part_time:
                rep.add('warning', 'SCA-CREDIT-HOURS-HIGH', line, 'Your records credit this part-time employee with '
                        'H&W for more hours than were paid, as if full time. The requirement is pro-rated to hours '
                        'paid; make sure the credit you claim matches what was actually contributed or paid.',
                        'cfr4.176')
            elif credited + HOUR < counted:
                rep.add('warning', 'SCA-CREDIT-HOURS-LOW', line, 'H&W was figured on fewer hours than were paid. It '
                        'is due on all hours paid, including paid vacation, sick leave and holidays, up to 40 a week.',
                        'cfr4.175')
        out.append({'line': line, 'hoursCounted': hours_str(counted), 'capped': counted < hours,
                    'rate': str(rate), 'required': money(required), 'furnished': money(furnished),
                    'notCreditable': money(not_creditable), 'shortfall': money(shortfall),
                    'result': 'FAIL' if shortfall > 0 else 'PASS', 'partTime': part_time,
                    '_required': required, '_furnished': furnished, '_shortfall': shortfall})
    return out


def recordkeeping(cols, findings):
    checked = {
        'separate': 'cash_in_lieu_separate' in cols or 'wage_rate_paid' in cols,
        'partTime': True,
        'adminCosts': 'admin_costs_credited' in cols,
    }
    how = {
        'separate': 'Add cash_in_lieu_separate (yes or no), or wage_rate_paid and wd_wage_rate, to check this.',
        'adminCosts': 'Add admin_costs_credited (0 where none) to check this.',
    }
    flagged = {}
    for f in findings:
        item = RULE_ITEM.get(f['ruleId'])
        if item:
            flagged.setdefault(item, set()).add(f['line'])
    out = []
    for item, label in RECORDKEEPING:
        lines = sorted(flagged.get(item, ()))
        status = 'flagged' if lines else ('clear' if checked[item] else 'not-checked')
        entry = {'item': item, 'label': label, 'status': status, 'lines': lines, 'source': 'fs67b'}
        if status == 'not-checked':
            entry['howToCheck'] = how[item]
        out.append(entry)
    return out


def validate(body: bytes, *, query=None, demo=False):
    numbered, params, fmt = parse_body(body, query)
    cols, rows, week_cols = table(numbered)
    if demo and len(rows) > DEMO_MAX_ROWS:
        raise InputError(f'The free demo checks up to {DEMO_MAX_ROWS} employees. Sign in with credit, or call the '
                         'paid API, to check the full period. Nothing was charged.')
    rep = Report()
    employees = check_rows(rep, cols, rows, week_cols, params)
    return finish(rep, employees, params, cols, week_cols, fmt, body)


def finish(rep, employees, params, cols, week_cols, fmt, body):
    order = {'error': 0, 'warning': 1}
    findings = sorted(rep.findings, key=lambda f: (f['line'], order[f['severity']], f['ruleId']))
    c = Counter(f['severity'] for f in findings)
    failing = [e for e in employees if e['result'] == 'FAIL']
    totals = {
        'employees': len(employees),
        'passing': len(employees) - len(failing),
        'failing': len(failing),
        'required': money(sum((e['_required'] for e in employees), Decimal(0))),
        'furnished': money(sum((e['_furnished'] for e in employees), Decimal(0))),
        'backWageExposure': money(sum((e['_shortfall'] for e in employees), Decimal(0))),
    }
    for e in employees:
        for k in ('_required', '_furnished', '_shortfall'):
            e.pop(k)
    rates = {'rate': str(params['rates']['rate']), 'basis': params['basis']}
    if params['hawaii']:
        rates['rateHphca'] = str(params['rates']['rateHphca'])
        rates['basisHphca'] = params['basisHphca']
    notes = []
    if params['periodWeeks'] > 1 and not week_cols:
        notes.append('Without weekly hour columns the 40-hour cap was applied to the period total. If any one week '
                     'was over 40 hours, the required amount shown can be higher than what is owed. Add '
                     f'hours_week_1 to hours_week_{params["periodWeeks"]} for an exact figure.')
    if 'default' in (params['basis'], params['basisHphca']):
        notes.append(f"Default rate from {CONFIG['memo']}, effective {CONFIG['effective']}. Use the rate printed on "
                     'your contract\'s wage determination if it is different: an existing contract keeps its rate '
                     'until the contracting officer adds a revised wage determination.')
    status = 'FAIL' if c['error'] else ('WARN' if c['warning'] else 'PASS')
    return {
        'schemaVersion': 1,
        'status': status,
        'summary': ('Every employee received at least the required H&W, and no recordkeeping problems were found.'
                    if status == 'PASS' else
                    f"{totals['failing']} of {totals['employees']} employees "
                    f"{'is' if totals['failing'] == 1 else 'are'} short on H&W."
                    if totals['failing'] else 'No employee is short on H&W, but there are findings to review.'),
        'parameters': {'wdType': 'fixed', 'eo13706': params['eo13706'], 'hawaii': params['hawaii'],
                       'periodWeeks': params['periodWeeks'], 'weeklyHours': bool(week_cols),
                       'annualCapApplied': 'ytd_hw_hours' in cols, 'rates': rates,
                       'rateMemo': CONFIG['memo'], 'rateEffective': CONFIG['effective']},
        'totals': totals,
        'employees': employees,
        'shortfallLines': [e['line'] for e in employees if e['result'] == 'FAIL'],
        'recordkeeping': recordkeeping(cols, findings),
        'findingCount': len(findings),
        'findingCounts': {'error': c['error'], 'warning': c['warning']},
        'ruleCounts': dict(sorted(Counter(f['ruleId'] for f in findings).items())),
        'findings': findings[:MAX_FINDINGS],
        'findingsTruncated': len(findings) > MAX_FINDINGS,
        'notes': notes,
        'methodology': METHODOLOGY,
        'notChecked': NOT_CHECKED,
        'sources': SOURCES,
        'scope': SCOPE,
        'input': {'format': fmt, 'bytes': len(body), 'columns': sorted(cols)},
        'inputSha256': hashlib.sha256(body).hexdigest(),
    }
