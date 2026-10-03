"""SpreadRun Davis-Bacon WH-347 certified payroll pre-check.

Recomputes one weekly certified payroll (the WH-347 fields, Rev. January 2025) against the wage determination rates
the caller supplies, and reports PASS / WARN / FAIL with a location, a rule ID and a message for every finding.

Input, either:
  * JSON: {"header": {...}, "payrollCsv": "...", "wageDeterminationCsv": "...", "apprenticeshipCsv": "..." (optional)}
  * an .xlsx workbook with sheets "Header", "Payroll", "Wage Determination" and optionally "Apprenticeship".

Rule families:
  WH-*   checks from the WH-347 instructions and 29 CFR 5.5, 5.31 and 5.32. Errors make the report FAIL.
Findings never contain a value from the input (names, IDs, classifications, amounts): only a path, a rule ID, a
message written here, and a source key.
"""
import csv
import datetime as dt
import hashlib
import io
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

FORM = 'WH-347 (Rev. January 2025)'
MAX_ROWS = 5000
MAX_XLSX_UNZIPPED = 50 * 1024 * 1024
MAX_FINDINGS = 500
CENT = Decimal('0.01')
ST_WEEK_LIMIT = Decimal(40)

SOURCES = {
    'wh347': 'DOL Wage and Hour Division, Instructions for Completing Form WH-347 (Rev. January 2025)',
    'cfr5.5': '29 CFR 5.5(a), Davis-Bacon contract clauses: wage payment, certified payrolls, apprentices',
    'cfr5.5b': '29 CFR 5.5(b)(1), Contract Work Hours and Safety Standards Act overtime (contracts over $100,000)',
    'cfr5.31': '29 CFR 5.31, meeting wage determination obligations (basic rate and fringe benefits)',
    'cfr5.32': '29 CFR 5.32, overtime payments (fringe benefits and cash in lieu excluded from the basic rate)',
}


class InputError(ValueError):
    """The input cannot be checked. Never billed."""


# ------------------------------------------------------------------ field definitions
HEADER_FIELDS = {
    'project_name': 'Project name',
    'project_no': 'Project or contract number',
    'payroll_no': 'Certified payroll number',
    'contractor_name': 'Contractor business name',
    'project_location': 'Project location',
    'wage_determination_no': 'Wage determination number',
    'week_ending': 'Week ending date',
    'contractor_address': 'Contractor business address',
}
HEADER_ALIASES = {
    'contract_no': 'project_no', 'project_or_contract_no': 'project_no', 'certified_payroll_no': 'payroll_no',
    'business_name': 'contractor_name', 'wd_no': 'wage_determination_no', 'wd_number': 'wage_determination_no',
    'week_ending_date': 'week_ending', 'business_address': 'contractor_address',
}
DAYS = range(1, 8)
PAYROLL_REQUIRED = (['entry_no', 'last_name', 'first_name', 'worker_id', 'worker_type', 'classification']
                    + [f'st_{d}' for d in DAYS] + [f'ot_{d}' for d in DAYS]
                    + ['total_hours', 'st_rate', 'ot_rate', 'fringe_credit', 'cash_in_lieu', 'gross_project',
                       'gross_all_work', 'tax_withholding', 'fica', 'other_deductions', 'total_deductions', 'net_pay'])
PAYROLL_OPTIONAL = ['middle_initial', 'apprentice_level', 'fringe_credit_hourly', 'cash_in_lieu_hourly']
WEEKLY_FIELDS = ['gross_all_work', 'tax_withholding', 'fica', 'other_deductions', 'total_deductions', 'net_pay']
WD_REQUIRED = ['classification', 'base_rate', 'fringe_rate']
APPR_REQUIRED = ['classification', 'level', 'wage_percent', 'ratio']
APPR_OPTIONAL = ['fringe_percent', 'program_name']


def norm_key(k):
    return re.sub(r'[^a-z0-9]+', '_', str(k).strip().lower()).strip('_')


def norm_text(v):
    return re.sub(r'\s+', ' ', str(v or '').strip()).casefold()


# ------------------------------------------------------------------ input parsing
def parse_body(body: bytes):
    if not body or not body.strip():
        raise InputError('Send the payroll as a JSON object or an .xlsx workbook in the request body.')
    if body[:2] == b'PK':
        return parse_xlsx(body), 'xlsx'
    if body[:5] == b'%PDF-':
        raise InputError('This is a PDF. Send the payroll data as an .xlsx workbook or as JSON with CSV tables.')
    try:
        payload = json.loads(body.decode('utf-8-sig'))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise InputError('The body must be a JSON object (header, payrollCsv, wageDeterminationCsv) or an .xlsx '
                         'workbook.') from None
    if not isinstance(payload, dict):
        raise InputError('The JSON body must be an object with header, payrollCsv and wageDeterminationCsv.')
    for k in ('payrollCsv', 'wageDeterminationCsv'):
        if not isinstance(payload.get(k), str) or not payload[k].strip():
            raise InputError(f'{k} is required: the table as CSV text, with a header row.')
    if not isinstance(payload.get('header', {}), dict):
        raise InputError('header must be an object of WH-347 header fields.')
    appr = payload.get('apprenticeshipCsv')
    if appr is not None and not isinstance(appr, str):
        raise InputError('apprenticeshipCsv must be CSV text when present.')
    header = {norm_key(k): v for k, v in (payload.get('header') or {}).items()}
    if 'cwhssa' in payload:
        header['cwhssa'] = payload['cwhssa']
    return {
        'header': header,
        'payroll': read_csv(payload['payrollCsv'], 'payrollCsv'),
        'wd': read_csv(payload['wageDeterminationCsv'], 'wageDeterminationCsv'),
        'appr': read_csv(appr, 'apprenticeshipCsv') if appr and appr.strip() else None,
    }, 'json'


def read_csv(text, name):
    try:
        rows = list(csv.reader(io.StringIO(text.lstrip('﻿'))))
    except csv.Error:
        raise InputError(f'{name} is not readable CSV.') from None
    return table(rows, name)


def table(rows, name):
    rows = [r for r in rows if any(str(c).strip() for c in r)]
    if not rows:
        raise InputError(f'{name} is empty. It needs a header row.')
    cols = [norm_key(c) for c in rows[0]]
    if len(rows) - 1 > MAX_ROWS:
        raise InputError(f'{name} has more than {MAX_ROWS} rows.')
    dup = [c for c, n in Counter(c for c in cols if c).items() if n > 1]
    if dup:
        raise InputError(f'{name} has a repeated column name. Each column may appear once.')
    data = []
    for r in rows[1:]:
        if len(r) > len(cols) and any(str(c).strip() for c in r[len(cols):]):
            raise InputError(f'{name} has a row with more cells than the header row.')
        data.append({c: (r[i] if i < len(r) else '') for i, c in enumerate(cols) if c})
    return {'columns': set(c for c in cols if c), 'rows': data}


# ------------------------------------------------------------------ minimal .xlsx reader (no dependencies)
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'pr': 'http://schemas.openxmlformats.org/package/2006/relationships'}
SHEETS = {'header': 'header', 'payroll': 'payroll', 'wage_determination': 'wd', 'wagedetermination': 'wd',
          'wd': 'wd', 'apprenticeship': 'appr', 'apprentices': 'appr'}


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
        raise InputError('The file starts like a ZIP or .xlsx workbook but cannot be opened.') from None
    if sum(i.file_size for i in infos) > MAX_XLSX_UNZIPPED:
        raise InputError('The workbook is over 50 MB uncompressed.')
    names = {i.filename for i in infos}
    if 'xl/workbook.xml' not in names:
        raise InputError('This ZIP is not an .xlsx workbook. Send an .xlsx file (not .xls or .xlsb) or JSON.')

    def read(n):
        try:
            return zf.read(n)
        except (KeyError, zipfile.BadZipFile, RuntimeError, NotImplementedError):
            raise InputError('The workbook is damaged or encrypted.') from None

    wb = safe_xml(read('xl/workbook.xml'))
    date1904 = any(e.get('date1904') in ('1', 'true') for e in wb.iter(f'{{{NS["m"]}}}workbookPr'))
    rels = {}
    if 'xl/_rels/workbook.xml.rels' in names:
        for rel in safe_xml(read('xl/_rels/workbook.xml.rels')).iter(f'{{{NS["pr"]}}}Relationship'):
            t = rel.get('Target', '')
            t = t.lstrip('/') if t.startswith('/') else 'xl/' + t
            rels[rel.get('Id')] = t
    shared = []
    if 'xl/sharedStrings.xml' in names:
        for si in safe_xml(read('xl/sharedStrings.xml')).iter(f'{{{NS["m"]}}}si'):
            shared.append(''.join(t.text or '' for t in si.iter(f'{{{NS["m"]}}}t')))
    found = {}
    for sh in wb.iter(f'{{{NS["m"]}}}sheet'):
        key = SHEETS.get(norm_key(sh.get('name', '')))
        if key and key not in found:
            target = rels.get(sh.get(f'{{{NS["r"]}}}id'))
            if target not in names:
                raise InputError('The workbook is damaged: a sheet it lists is missing.')
            found[key] = read_sheet(safe_xml(read(target)), shared)
    for key, label in (('header', 'Header'), ('payroll', 'Payroll'), ('wd', 'Wage Determination')):
        if key not in found:
            raise InputError(f'The workbook needs a sheet named "{label}". Sheets used: Header, Payroll, '
                             'Wage Determination, and optionally Apprenticeship.')
    header = {}
    for r in found['header']:
        if len(r) >= 2 and str(r[0]).strip():
            header[norm_key(r[0])] = r[1]
    return {
        'header': header, 'date1904': date1904,
        'payroll': table(found['payroll'], 'The Payroll sheet'),
        'wd': table(found['wd'], 'The Wage Determination sheet'),
        'appr': table(found['appr'], 'The Apprenticeship sheet') if found.get('appr') else None,
    }


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
        cells = {}
        nxt = 0
        for c in row.findall(f'{{{m}}}c'):
            i = col_index(c.get('r'))
            i = nxt if i is None else i
            nxt = i + 1
            if i > 500:
                raise InputError('A sheet has more than 500 columns.')
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
            elif t in ('str', 'e'):
                val = v.text or ''
            elif t == 'b':
                val = 'TRUE' if (v.text or '') == '1' else 'FALSE'
            else:
                val = Num(v.text or '')
            cells[i] = val
        if cells:
            row_vals = [''] * (max(cells) + 1)
            for i, val in cells.items():
                row_vals[i] = val
            out.append(row_vals)
        if len(out) > MAX_ROWS + 1:
            raise InputError(f'A sheet has more than {MAX_ROWS} rows.')
    return out


class Num(str):
    """A numeric cell from a workbook (so dates stored as serial numbers can be told apart from text)."""


# ------------------------------------------------------------------ value helpers
def money(v):
    """Decimal or None (blank). Raises ValueError when not a number."""
    s = str(v).strip().replace(',', '').replace('$', '')
    if s == '':
        return None
    if s.startswith('(') and s.endswith(')'):
        s = '-' + s[1:-1]
    try:
        d = Decimal(s)
    except InvalidOperation:
        raise ValueError from None
    if not d.is_finite():
        raise ValueError
    return d


def as_date(v, date1904=False):
    if isinstance(v, Num):
        try:
            serial = float(v)
        except ValueError:
            return None
        base = dt.date(1904, 1, 1) if date1904 else dt.date(1899, 12, 30)
        if not 1 <= serial < 2958466:
            return None
        return base + dt.timedelta(days=int(serial))
    s = str(v).strip()
    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m/%d/%y'):
        try:
            return dt.datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def as_bool(v, default=True):
    s = '' if v is None else str(v).strip().casefold()
    if s in ('', 'none'):
        return default
    if s in ('yes', 'y', 'true', '1', 'x'):
        return True
    if s in ('no', 'n', 'false', '0'):
        return False
    return None


def cents(d):
    return d.quantize(CENT, rounding=ROUND_HALF_UP)


SSN_FULL = re.compile(r'\d{3}-?\d{2}-?\d{4}')
RATIO = re.compile(r'\s*(\d+(?:\.\d+)?)\s*(?::|to|/)\s*(\d+(?:\.\d+)?)\s*', re.I)


class Report:
    def __init__(self):
        self.findings = []

    def add(self, sev, rule, path, msg, source=None):
        f = {'severity': sev, 'ruleId': rule, 'path': path, 'message': msg}
        if source:
            f['source'] = source
        self.findings.append(f)


# ------------------------------------------------------------------ validation
def validate(body: bytes):
    data, fmt = parse_body(body)
    rep = Report()
    date1904 = data.get('date1904', False)
    h = {HEADER_ALIASES.get(k, k): v for k, v in data['header'].items()}

    # 1. Header fields the WH-347 asks for.
    week_ending = None
    for key, label in HEADER_FIELDS.items():
        v = h.get(key)
        if v is None or str(v).strip() == '':
            rep.add('error', 'WH-HEADER-REQUIRED', f'/header/{key}', f'{label} is required on the WH-347.', 'wh347')
    if str(h.get('week_ending') or '').strip():
        week_ending = as_date(h['week_ending'], date1904)
        if week_ending is None:
            rep.add('error', 'WH-HEADER-FORMAT', '/header/week_ending',
                    'Week ending date must be a date (YYYY-MM-DD, MM/DD/YYYY or an Excel date).', 'wh347')
    if str(h.get('payroll_no') or '').strip():
        try:
            pn = money(h['payroll_no'])
            ok = pn is not None and pn == pn.to_integral_value() and pn >= 1
        except ValueError:
            ok = False
        if not ok:
            rep.add('error', 'WH-HEADER-FORMAT', '/header/payroll_no',
                    'Certified payroll number must be a whole number, starting at 1 for the first week.', 'wh347')
    cwhssa = as_bool(h.get('cwhssa'), default=True)
    if cwhssa is None:
        rep.add('error', 'WH-HEADER-FORMAT', '/header/cwhssa', 'cwhssa must be yes or no.')
        cwhssa = True
    # Optional check boxes at the top of the form: used only to fill the PDF.
    if as_bool(h.get('final_payroll'), default=False) is None:
        rep.add('error', 'WH-HEADER-FORMAT', '/header/final_payroll', 'final_payroll must be yes or no.', 'wh347')
    if str(h.get('contractor_role') or '').strip() and norm_text(h.get('contractor_role')) not in (
            'prime', 'prime contractor', 'sub', 'subcontractor'):
        rep.add('error', 'WH-HEADER-FORMAT', '/header/contractor_role', 'contractor_role must be prime or '
                'subcontractor.', 'wh347')

    # Wage determination table.
    wd = {}
    wdt = data['wd']
    missing = [c for c in WD_REQUIRED if c not in wdt['columns']]
    for c in missing:
        rep.add('error', 'WH-COLUMN-MISSING', f'/wageDetermination/columns/{c}',
                f'The wage determination table needs a {c} column.')
    if not wdt['rows']:
        rep.add('error', 'WH-REQUIRED', '/wageDetermination', 'The wage determination table has no rates.')
    if not missing:
        for i, r in enumerate(wdt['rows'], 1):
            p = f'/wageDetermination/row[{i}]'
            cls = norm_text(r.get('classification'))
            vals = {}
            for c in ('base_rate', 'fringe_rate'):
                try:
                    vals[c] = money(r.get(c, ''))
                except ValueError:
                    vals[c] = None
                    rep.add('error', 'WH-FORMAT', f'{p}/{c}', f'{c} must be a dollar amount.')
                    continue
                if vals[c] is None:
                    if c == 'fringe_rate':
                        vals[c] = Decimal(0)
                    else:
                        rep.add('error', 'WH-REQUIRED', f'{p}/{c}', f'{c} is required.')
                elif vals[c] < 0:
                    rep.add('error', 'WH-FORMAT', f'{p}/{c}', f'{c} cannot be negative.')
                    vals[c] = None
            if not cls:
                rep.add('error', 'WH-REQUIRED', f'{p}/classification', 'classification is required.')
                continue
            if cls in wd:
                rep.add('error', 'WH-WD-DUPLICATE', f'{p}/classification', 'This classification is listed more '
                        'than once in the wage determination table. List each classification once, with its rate.')
                continue
            wd[cls] = (vals.get('base_rate'), vals.get('fringe_rate'), p)

    # Apprenticeship programs (optional).
    programs = {}     # (classification, level) -> (pct, fringe_pct)
    ratios = {}       # classification -> (apprentices, journeyworkers)
    appr = data.get('appr')
    if appr:
        amiss = [c for c in APPR_REQUIRED if c not in appr['columns']]
        for c in amiss:
            rep.add('error', 'WH-COLUMN-MISSING', f'/apprenticeship/columns/{c}',
                    f'The apprenticeship table needs a {c} column.')
        if not amiss:
            for i, r in enumerate(appr['rows'], 1):
                p = f'/apprenticeship/row[{i}]'
                cls, lvl = norm_text(r.get('classification')), norm_text(r.get('level'))
                if not cls or not lvl:
                    rep.add('error', 'WH-REQUIRED', p, 'classification and level are required on every '
                            'apprenticeship row.')
                    continue
                if cls not in wd:
                    rep.add('error', 'WH-WD-CLASSIFICATION', f'{p}/classification', 'This apprenticeship '
                            'classification is not in the wage determination table.', 'cfr5.5')
                pct = fringe_pct = None
                try:
                    pct = money(r.get('wage_percent', ''))
                    fringe_pct = money(r.get('fringe_percent', ''))
                except ValueError:
                    rep.add('error', 'WH-FORMAT', p, 'wage_percent and fringe_percent must be numbers from 0 '
                            'to 100.')
                    continue
                if pct is None or not 0 < pct <= 100 or (fringe_pct is not None and not 0 <= fringe_pct <= 100):
                    rep.add('error', 'WH-FORMAT', f'{p}/wage_percent', 'wage_percent must be above 0 and at most '
                            '100, and fringe_percent from 0 to 100.')
                    continue
                m = RATIO.fullmatch(str(r.get('ratio', '')))
                if not m or Decimal(m.group(1)) <= 0 or Decimal(m.group(2)) <= 0:
                    rep.add('error', 'WH-FORMAT', f'{p}/ratio', 'ratio must be written as apprentices:journeyworkers, '
                            'for example 1:3.')
                else:
                    rt = (Decimal(m.group(1)), Decimal(m.group(2)))
                    if ratios.setdefault(cls, rt) != rt:
                        rep.add('error', 'WH-FORMAT', f'{p}/ratio', 'Rows for the same classification give '
                                'different ratios.')
                # A program that does not specify fringe benefits: the full WD fringe is owed (29 CFR 5.5(a)(4)(i)(B)).
                programs[(cls, lvl)] = (pct / 100, (fringe_pct if fringe_pct is not None else Decimal(100)) / 100)

    # Payroll rows.
    pt = data['payroll']
    pmiss = [c for c in PAYROLL_REQUIRED if c not in pt['columns']]
    for c in pmiss:
        rep.add('error', 'WH-COLUMN-MISSING', f'/payroll/columns/{c}', f'The payroll needs a {c} column '
                '(see the column list in the docs).', 'wh347')
    if not pt['rows']:
        rep.add('error', 'WH-REQUIRED', '/payroll', 'The payroll has no worker rows.', 'wh347')
    counts = {'rows': len(pt['rows']), 'workers': 0, 'apprentices': 0, 'classifications': 0, 'totalHours': '0.00'}
    if pmiss:
        return finish(rep, fmt, body, counts, cwhssa, week_ending)

    workers = defaultdict(list)       # entry_no -> [(index, row dict of parsed values)]
    numeric = ([f'st_{d}' for d in DAYS] + [f'ot_{d}' for d in DAYS]
               + ['total_hours', 'st_rate', 'ot_rate', 'fringe_credit', 'cash_in_lieu', 'gross_project']
               + WEEKLY_FIELDS + ['fringe_credit_hourly', 'cash_in_lieu_hourly'])
    total_hours_all = Decimal(0)
    classes_seen = set()
    for i, r in enumerate(pt['rows'], 1):
        p = f'/payroll/row[{i}]'
        v = {'_path': p, '_i': i}
        bad = False
        for c in ('entry_no', 'last_name', 'first_name', 'worker_id', 'worker_type', 'classification'):
            if not str(r.get(c, '')).strip():
                rep.add('error', 'WH-REQUIRED', f'{p}/{c}', f'{c} is required on every payroll row.', 'wh347')
                bad = True
        for c in numeric:
            if c not in r:
                v[c] = None
                continue
            try:
                v[c] = money(r[c])
            except ValueError:
                rep.add('error', 'WH-FORMAT', f'{p}/{c}', f'{c} must be a number.', 'wh347')
                v[c] = None
                bad = True
                continue
            if v[c] is not None and v[c] < 0:
                rep.add('error', 'WH-FORMAT', f'{p}/{c}', f'{c} cannot be negative.', 'wh347')
                v[c] = None
                bad = True
        wid = str(r.get('worker_id', '')).strip()
        if wid and SSN_FULL.fullmatch(wid.replace(' ', '')):
            rep.add('error', 'WH-ID-FULL-SSN', f'{p}/worker_id', 'This identifying number looks like a full Social '
                    'Security number. Certified payrolls must not include full SSNs; use the last four digits or '
                    'another number specific to the worker.', 'cfr5.5')
        wt = norm_text(r.get('worker_type')).upper()
        if wt and wt not in ('J', 'RA'):
            rep.add('error', 'WH-WORKER-TYPE', f'{p}/worker_type', 'worker_type must be J (journeyworker) or RA '
                    '(registered apprentice).', 'wh347')
            bad = True
        v['type'] = wt
        v['cls'] = norm_text(r.get('classification'))
        v['level'] = norm_text(r.get('apprentice_level'))
        v['wid'] = norm_text(wid)
        v['bad'] = bad
        hours_st = [v[f'st_{d}'] or Decimal(0) for d in DAYS]
        hours_ot = [v[f'ot_{d}'] or Decimal(0) for d in DAYS]
        v['st'], v['ot'] = sum(hours_st), sum(hours_ot)
        v['days'] = [s + o for s, o in zip(hours_st, hours_ot)]
        for d in DAYS:
            if v['days'][d - 1] > 24:
                rep.add('error', 'WH-HOURS-DAY', f'{p}/st_{d}', f'More than 24 hours on day {d} of the week.', 'wh347')
        hrs = v['st'] + v['ot']
        total_hours_all += hrs
        if v['total_hours'] is None:
            rep.add('error', 'WH-REQUIRED', f'{p}/total_hours', 'total_hours (column 5) is required.', 'wh347')
        elif v['total_hours'] != hrs:
            rep.add('error', 'WH-HOURS-TOTAL', f'{p}/total_hours', 'total_hours (column 5) does not equal the '
                    'straight time and overtime hours entered for each day (column 4).', 'wh347')
        if v['cls']:
            classes_seen.add(v['cls'])
        entry = norm_text(r.get('entry_no'))
        if entry:
            workers[entry].append(v)

    counts.update({'workers': len(workers), 'classifications': len(classes_seen),
                   'totalHours': str(cents(total_hours_all)),
                   'apprentices': sum(1 for rows in workers.values() if any(v['type'] == 'RA' for v in rows))})

    # Per row: classification, rates, fringe, arithmetic for columns 6B, 6C, 7A.
    for entry, rows in workers.items():
        for v in rows:
            p = v['_path']
            hrs = v['st'] + v['ot']
            if v['cls'] and v['cls'] not in wd:
                rep.add('error', 'WH-WD-CLASSIFICATION', f'{p}/classification', 'This labor classification is not in '
                        'the wage determination table. Workers must be paid the rate for the classification of work '
                        'actually performed; a classification missing from the wage determination needs a conformance '
                        'request through the contracting officer.', 'wh347')
                continue
            if not v['cls'] or v['cls'] not in wd:
                continue
            base, fringe, _ = wd[v['cls']]
            if base is None or fringe is None:
                continue
            req_base, req_fringe = base, fringe
            if v['type'] == 'RA':
                if not v['level']:
                    rep.add('error', 'WH-APPR-LEVEL', f'{p}/apprentice_level', 'A registered apprentice row needs the '
                            'apprentice\'s level of progression in the program.', 'wh347')
                    prog = None
                else:
                    prog = programs.get((v['cls'], v['level']))
                if v['level'] and prog is None:
                    rep.add('error', 'WH-APPR-PROGRAM', f'{p}/apprentice_level', 'No apprenticeship program wage '
                            'schedule was supplied for this classification and level, so the journeyworker rate on '
                            'the wage determination applies.', 'cfr5.5')
                if prog:
                    req_base, req_fringe = base * prog[0], fringe * prog[1]
            st_rate, ot_rate = v['st_rate'], v['ot_rate']
            if v['st'] > 0 and st_rate is None:
                rep.add('error', 'WH-REQUIRED', f'{p}/st_rate', 'st_rate is required when straight time hours are '
                        'reported.', 'wh347')
            if v['ot'] > 0 and ot_rate is None:
                rep.add('error', 'WH-REQUIRED', f'{p}/ot_rate', 'ot_rate is required when overtime hours are '
                        'reported.', 'wh347')
            if st_rate is not None and v['st'] > 0 and st_rate < cents(req_base):
                rule = 'WH-APPR-RATE' if req_base != base else 'WH-RATE-BASE'
                rep.add('error', rule, f'{p}/st_rate', 'The straight time rate is below the basic hourly rate required '
                        + ('by the apprenticeship wage schedule (percentage of the journeyworker rate).'
                           if rule == 'WH-APPR-RATE' else 'for this classification on the wage determination.')
                        + ' Fringe benefit payments cannot make up a shortfall in the basic rate.',
                        'cfr5.5' if rule == 'WH-APPR-RATE' else 'cfr5.31')
            if ot_rate is not None and v['ot'] > 0:
                if ot_rate < cents(req_base * Decimal('1.5')):
                    rep.add('error', 'WH-RATE-OT-BASE', f'{p}/ot_rate', 'The overtime rate is below one and one-half '
                            'times the basic hourly rate on the wage determination.', 'cfr5.32')
                elif st_rate is not None and ot_rate < cents(st_rate * Decimal('1.5')):
                    rep.add('warning', 'WH-RATE-OT-PAID', f'{p}/ot_rate', 'The overtime rate is below one and one-half '
                            'times the straight time rate paid. That is only correct if the part of the straight time '
                            'rate above the wage determination rate is a fringe benefit paid in cash; otherwise overtime '
                            'is owed on the full rate paid.', 'cfr5.32')
            # 6B and 6C against their hourly rates (page 2 hourly credit), when given.
            for total_c, hourly_c, rule, label in (('fringe_credit', 'fringe_credit_hourly', 'WH-FRINGE-CREDIT-MATH',
                                                    'Total fringe benefit credit (6B)'),
                                                   ('cash_in_lieu', 'cash_in_lieu_hourly', 'WH-CASH-LIEU-MATH',
                                                    'Payment in lieu of fringe benefits (6C)')):
                if v[hourly_c] is not None and v[total_c] is not None and \
                        abs(v[total_c] - cents(v[hourly_c] * hrs)) > CENT:
                    rep.add('error', rule, f'{p}/{total_c}', f'{label} does not equal total hours worked times the '
                            'hourly amount.', 'wh347')
            fb, cash = v['fringe_credit'] or Decimal(0), v['cash_in_lieu'] or Decimal(0)
            if st_rate is not None or ot_rate is not None:
                wages = (st_rate or 0) * v['st'] + (ot_rate or 0) * v['ot']
                # 29 CFR 5.31: basic rate plus fringe, met by any mix of cash wages, cash in lieu and plan credits.
                owed = req_base * v['st'] + req_base * Decimal('1.5') * v['ot'] + req_fringe * hrs
                if hrs > 0 and wages + fb + cash < cents(owed) - CENT:
                    rep.add('error', 'WH-FRINGE-SHORT', p, 'Wages, fringe benefit credit (6B) and cash in lieu of fringe '
                            'benefits (6C) together are less than the basic hourly rate plus the fringe benefit rate '
                            'owed for these hours (overtime premium on the basic rate only).', 'cfr5.31')
                gross = v['gross_project']
                if gross is None:
                    pass
                elif gross < cents(wages) - CENT:
                    rep.add('error', 'WH-GROSS-SHORT', f'{p}/gross_project', 'Gross amount earned on this project (7A) '
                            'is less than straight time and overtime hours times the rates paid.', 'wh347')
                elif abs(gross - cents(wages)) > CENT and abs(gross - cents(wages + cash)) > CENT:
                    rep.add('warning', 'WH-GROSS-MISMATCH', f'{p}/gross_project', 'Gross amount earned on this project '
                            '(7A) does not equal hours times the rates paid, with or without the payment in lieu of '
                            'fringe benefits (6C). Check for a missing or extra amount.', 'wh347')

    # Per worker: identity, overtime hours, columns 7B, 8 and 9.
    for entry, rows in workers.items():
        first = rows[0]['_path']
        if len({v['wid'] for v in rows}) > 1:
            rep.add('error', 'WH-ENTRY-CONSISTENCY', first, 'Rows with the same worker entry number have different '
                    'identifying numbers. Use one entry number per worker, repeated on each classification row.',
                    'wh347')
        st_total = sum(v['st'] for v in rows)
        if cwhssa and st_total > ST_WEEK_LIMIT:
            rep.add('error', 'WH-OT-HOURS', first, 'More than 40 straight time hours in the week for this worker '
                    '(all classification rows together). On contracts subject to the Contract Work Hours and Safety '
                    'Standards Act, hours over 40 must be paid as overtime.', 'cfr5.5b')
        weekly = {}
        for c in WEEKLY_FIELDS:
            vals = [v[c] for v in rows if v[c] is not None]
            if not vals:
                rep.add('error', 'WH-REQUIRED', f'{first}/{c}', f'{c} is required for each worker (on one of the '
                        'worker\'s rows).', 'wh347')
            elif len(set(vals)) > 1:
                rep.add('error', 'WH-ENTRY-CONSISTENCY', f'{first}/{c}', f'{c} is for all work in the week, so give it '
                        'once per worker (or the same amount on each of the worker\'s rows).', 'wh347')
            else:
                weekly[c] = vals[0]
        gross_project = [v['gross_project'] for v in rows]
        if all(g is None for g in gross_project):
            rep.add('error', 'WH-REQUIRED', f'{first}/gross_project', 'gross_project (7A) is required.', 'wh347')
        elif 'gross_all_work' in weekly and weekly['gross_all_work'] < sum(g or 0 for g in gross_project) - CENT:
            rep.add('error', 'WH-GROSS-ALL-WORK', f'{first}/gross_all_work', 'Gross amount earned for all work (7B) '
                    'is less than the gross amount earned on this project (7A).', 'wh347')
        if all(c in weekly for c in ('tax_withholding', 'fica', 'other_deductions', 'total_deductions')):
            if abs(weekly['tax_withholding'] + weekly['fica'] + weekly['other_deductions']
                   - weekly['total_deductions']) > CENT:
                rep.add('error', 'WH-DEDUCTIONS-TOTAL', f'{first}/total_deductions', 'Total deductions does not equal '
                        'tax withholdings plus FICA plus other deductions.', 'wh347')
        if all(c in weekly for c in ('gross_all_work', 'total_deductions', 'net_pay')):
            if abs(weekly['gross_all_work'] - weekly['total_deductions'] - weekly['net_pay']) > CENT:
                rep.add('error', 'WH-NET-PAY', f'{first}/net_pay', 'Net pay (9) does not equal gross amount earned for '
                        'all work (7B) minus total deductions (8).', 'wh347')

    # Apprentice ratio on this payroll, per classification and day.
    by_cls_day = defaultdict(lambda: [0, 0])       # (cls, day) -> [apprentices, journeyworkers]
    seen = set()
    for entry, rows in workers.items():
        for v in rows:
            for d in DAYS:
                if v['days'][d - 1] > 0 and (entry, v['cls'], d) not in seen:
                    seen.add((entry, v['cls'], d))
                    by_cls_day[(v['cls'], d)][0 if v['type'] == 'RA' else 1] += 1
    over = Counter()
    for (cls, d), (a, j) in by_cls_day.items():
        if a and cls in ratios:
            ra, rj = ratios[cls]
            if a * rj > j * ra:
                over[cls] += 1
    for cls, ndays in over.items():
        row = next(v['_path'] for rows in workers.values() for v in rows if v['cls'] == cls and v['type'] == 'RA')
        rep.add('warning', 'WH-APPR-RATIO', row, f'On {ndays} {"day" if ndays == 1 else "days"} this payroll shows more '
                'apprentices in this classification than the program ratio allows for the journeyworkers on it. '
                'Apprentices over the ratio must be paid the full journeyworker rate. Only this payroll is counted.',
                'cfr5.5')
    return finish(rep, fmt, body, counts, cwhssa, week_ending)


def finish(rep, fmt, body, counts, cwhssa, week_ending):
    order = {'error': 0, 'warning': 1}
    findings = sorted(rep.findings, key=lambda f: (order[f['severity']], f['ruleId'], f['path']))
    c = Counter(f['severity'] for f in findings)
    return {
        'schemaVersion': 1,
        'status': 'FAIL' if c['error'] else ('WARN' if c['warning'] else 'PASS'),
        'form': FORM,
        'weekEnding': week_ending.isoformat() if week_ending else None,
        'overtimeRule': 'cwhssa' if cwhssa else 'not-applied',
        'counts': counts,
        'findingCount': len(findings),
        'findingCounts': {'error': c['error'], 'warning': c['warning']},
        'ruleCounts': dict(sorted(Counter(f['ruleId'] for f in findings).items())),
        'findings': findings[:MAX_FINDINGS],
        'findingsTruncated': len(findings) > MAX_FINDINGS,
        'notChecked': [
            'Whether the wage determination rates you supplied are the right ones for the contract, project location '
            'and dates. SpreadRun checks against the rates you send; it does not look them up.',
            'Whether workers are classified correctly for the work they actually did.',
            'Hours worked on other projects for the same contractor, which count toward the 40-hour overtime threshold '
            'but are not on this payroll.',
            'Whether apprentices are individually registered, and the apprentice ratio across the contractor\'s whole '
            'workforce on the job site (only this payroll is counted).',
            'Whether fringe benefit plans are bona fide, annualization of fringe credits, and approval of unfunded plans.',
            'Whether deductions are permitted under 29 CFR part 3.',
            'The Statement of Compliance and signature on page 2.',
        ],
        'sources': SOURCES,
        'scope': 'Recomputes the payroll against the wage determination rates supplied. A PASS does not mean the '
                 'payroll complies with Davis-Bacon requirements, and this is not legal or compliance advice.',
        'input': {'format': fmt, 'bytes': len(body)},
        'inputSha256': hashlib.sha256(body).hexdigest(),
    }


# ------------------------------------------------------------------ data for the filled form (PASS reports only)
def form_data(body: bytes):
    """The values the filled WH-347 needs, from the same input validate() checked. Used only to draw the PDF that
    goes back to the caller who sent the data; never logged or stored."""
    data, _ = parse_body(body)
    h = {HEADER_ALIASES.get(k, k): v for k, v in data['header'].items()}
    header = {k: str(h.get(k) if h.get(k) is not None else '').strip() for k in HEADER_FIELDS}
    role = norm_text(h.get('contractor_role'))
    rows = data['payroll']['rows']
    fringe, seen = [], set()
    for r in rows:
        entry = norm_text(r.get('entry_no'))
        try:
            total_6b = money(r.get('fringe_credit', '')) or Decimal(0)
            hourly = money(r.get('fringe_credit_hourly', ''))
            hours = money(r.get('total_hours', '')) or Decimal(0)
        except ValueError:
            continue
        if entry in seen or total_6b <= 0:
            continue
        seen.add(entry)
        if hourly is None and hours > 0:
            hourly = (total_6b / hours).quantize(CENT, rounding=ROUND_HALF_UP)
        name = ', '.join(x for x in (str(r.get('last_name', '')).strip(), str(r.get('first_name', '')).strip()) if x)
        fringe.append((name, str(hourly) if hourly is not None else ''))
    programs, pseen = [], set()
    for r in (data['appr']['rows'] if data.get('appr') else []):
        key = (norm_text(r.get('program_name')), norm_text(r.get('classification')))
        if key not in pseen and (key[0] or key[1]):
            pseen.add(key)
            programs.append((str(r.get('program_name', '')).strip(), str(r.get('classification', '')).strip()))
    return {
        'header': header,
        'weekEnding': as_date(h.get('week_ending'), data.get('date1904', False)),
        'final': as_bool(h.get('final_payroll'), default=False) is True,
        'role': 'prime' if role in ('prime', 'prime contractor') else 'sub' if role in ('sub', 'subcontractor') else None,
        'rows': rows,
        'programs': programs,
        'fringe': fringe,
    }
