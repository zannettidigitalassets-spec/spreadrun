"""PBJ (Payroll-Based Journal) staffing file pre-submission QA, CMS PBJ Data Specifications v4.10.0.

spec.json and nhpbj_4_10_0.xsd come from the CMS PBJ data specifications package (public domain), built by
scripts/pbj/build_spec.py. Rule IDs:

  CMS-<edit>   a CMS PBJ submission edit from the v4.10.0 specifications, with CMS's own severity
               (Fatal -> error, Warning -> warning). Only edits that can be decided from the file alone.
  XSD          structure required by the NHPBJ 4.10.0 XSD: unknown elements, order, required elements.
  RISK-*       audit and rating risk patterns CMS has documented, each citing its source. Always warnings.
  SR-*         internal consistency of the file itself (dates, duplicate IDs). Warnings.

Every finding names a location and a rule. No value from the file is ever repeated in a finding or report.
"""
import calendar
import datetime as dt
import hashlib
import io
import json
import re
import xml.etree.ElementTree as ET
import zipfile
import zlib
from collections import Counter, defaultdict
from pathlib import Path

SPEC = json.loads((Path(__file__).parent / 'spec.json').read_text('utf-8'))
VERSION = SPEC['version']
STATES = set(SPEC['stateCodes'])
JOB_TITLES = {int(k): v for k, v in SPEC['jobTitleCodes'].items()}
PAY_TYPES = {int(k): v for k, v in SPEC['payTypeCodes'].items()}
RN_CODES = set(SPEC['rnJobTitleCodes'])
NURSE_CODES = set(range(5, 13))     # Five-Star total nurse staffing: RN 5-7, LPN 8-9, nurse aide 10-12
AIDE_CODES = {10, 11, 12}
RETIRED_VERSIONS = set(SPEC['retiredFileSpecVersions'])
RETIRE_DATE = dt.date(2026, 4, 1)
MAX_FINDINGS = 500
MAX_XML_BYTES = 50 * 1024 * 1024    # CMS: each XML inside the upload ZIP may be up to 50 MB
MAX_FILES = 20
MONTHLY_HOURS_FLAG = 400

SOURCES = {
    'spec': f'CMS PBJ Data Specifications v{VERSION} (January 16, 2026), edit IDs and XSD',
    'manual': 'CMS PBJ Policy Manual v2.8 (August 2026)',
    'faq': 'CMS PBJ Policy Manual FAQ (August 2026)',
    'fivestar': 'CMS Nursing Home Five-Star Quality Rating System Technical Users\' Guide (September 2026)',
    'audit2018': 'CMS PBJ audit selection criteria as stated by CMS and reported by Skilled Nursing News (November 2018)',
}

# Structure from nhpbj_4_10_0.xsd: (child name, min occurs, max occurs or None for unbounded), in order.
SCHEMA = {
    'nursingHomeData': [('header', 1, 1), ('employees', 0, 1), ('staffingHours', 0, 1)],
    'header': [('facilityId', 1, 1), ('stateCode', 1, 1), ('reportQuarter', 1, 1), ('federalFiscalYear', 1, 1),
               ('softwareVendorName', 0, 1), ('softwareVendorEmail', 0, 1), ('softwareProductName', 0, 1),
               ('softwareProductVersion', 0, 1)],
    'employees': [('employee', 0, None)],
    'employee': [('employeeId', 1, 1), ('hireDate', 0, 1), ('terminationDate', 0, 1)],
    'staffingHours': [('staffHours', 0, None)],
    'staffHours': [('employeeId', 1, 1), ('workDays', 1, 1)],
    'workDays': [('workDay', 1, None)],
    'workDay': [('date', 1, 1), ('hourEntries', 1, None)],
    'hourEntries': [('hourEntry', 1, None)],
    'hourEntry': [('hours', 1, 1), ('jobTitleCode', 1, 1), ('payTypeCode', 1, 1)],
}
# Which CMS edit a missing required element triggers.
REQUIRED_EDIT = {'header': '-4003', 'employee': '-4004', 'staffHours': '-4006', 'workDay': '-4006', 'hourEntry': '-4006'}

# Character sets and lengths from the XSD (CMS edits -3690, -3692, -3793, -3802, -4018).
TEXT_RULES = {
    'facilityId': (16, None, None),
    'softwareVendorName': (30, re.compile(r"[a-zA-Z0-9\-.+/@_,' &]*"), '-3802'),
    'softwareVendorEmail': (50, re.compile(r"[^,;:'\"<>\\()\[\]{} ]+@[\w.-]+\.\w{2,3}"), '-3692'),
    'softwareProductName': (50, re.compile(r"[a-zA-Z0-9\-.+/@_,' &]*"), '-3802'),
    'softwareProductVersion': (20, re.compile(r"[a-zA-Z0-9\-.+/@_,' ]*"), '-3690'),
    'employeeId': (30, re.compile(r"[a-zA-Z0-9_,.\-\\ ]*"), '-4018'),
}
SSN_LIKE = re.compile(r'\d{3}-?\d{2}-?\d{4}')
DATE_RE = re.compile(r'\d{4}-\d{2}-\d{2}')
HOURS_RE = re.compile(r'\+?(\d+(\.\d*)?|\.\d+)')


class InputError(ValueError):
    """Not a PBJ submission file this validator can check. Never billed."""


def edit_severity(eid):
    return 'error' if SPEC['edits'][eid]['severity'] == 'Fatal' else 'warning'


# ---------------------------------------------------------------- input

def unpack(body: bytes):
    """Returns ([xml bytes, ...], container). CMS takes PBJ uploads as a ZIP that may hold several XML files."""
    if body[:2] == b'\x1f\x8b':
        try:
            d = zlib.decompressobj(16 + zlib.MAX_WBITS)
            data = d.decompress(body, MAX_XML_BYTES + 1)
        except zlib.error:
            raise InputError('The gzip upload is corrupt.') from None
        if len(data) > MAX_XML_BYTES:
            raise InputError(f'The file is over {MAX_XML_BYTES // 1024 // 1024} MB once decompressed.')
        return [data], 'gzip'
    if body[:4] == b'PK\x03\x04':
        try:
            zf = zipfile.ZipFile(io.BytesIO(body))
            xmls = [i for i in zf.infolist() if not i.is_dir() and i.filename.lower().endswith('.xml')
                    and not i.filename.startswith(('__MACOSX/', '.'))]
        except (zipfile.BadZipFile, ValueError):
            raise InputError('This looks like a ZIP file but it could not be opened.') from None
        if not xmls:
            raise InputError('The ZIP file holds no .xml file. CMS also rejects an empty ZIP.')
        if len(xmls) > MAX_FILES:
            raise InputError(f'The ZIP file holds more than {MAX_FILES} XML files.')
        out = []
        for info in xmls:
            if info.file_size > MAX_XML_BYTES:
                raise InputError(f'An XML file in the ZIP is over {MAX_XML_BYTES // 1024 // 1024} MB, the CMS limit.')
            try:
                with zf.open(info) as fh:
                    data = fh.read(MAX_XML_BYTES + 1)
            except (zipfile.BadZipFile, RuntimeError, NotImplementedError, zlib.error):
                raise InputError('An XML file in the ZIP could not be read (encrypted or corrupt).') from None
            if len(data) > MAX_XML_BYTES:
                raise InputError(f'An XML file in the ZIP is over {MAX_XML_BYTES // 1024 // 1024} MB, the CMS limit.')
            out.append(data)
        return out, 'zip'
    return [body], 'xml'


def parse(data: bytes):
    if re.search(rb'<!DOCTYPE|<!ENTITY', data, re.I):
        raise InputError('DOCTYPE and entity declarations are not accepted. PBJ files do not use them.')
    if data[:5] == b'%PDF-':
        raise InputError('This is a PDF. Send the PBJ XML file.')
    try:
        root = ET.fromstring(data)
    except ET.ParseError as exc:
        raise InputError(f'The file is not well-formed XML ({exc}).') from None
    if root.tag != 'nursingHomeData':
        raise InputError('The root element must be nursingHomeData (no namespace). This does not look like a PBJ '
                         'submission file.')
    if root.find('employeeLinks') is not None or root.find('.//employeeLink') is not None:
        raise InputError('This is a PBJ Administration Submission file (Employee Link section). This version checks '
                         'PBJ staffing submission files only.')
    return root


# ---------------------------------------------------------------- report helpers

class Report:
    def __init__(self):
        self.findings = []
        self._seen = set()
        self.xp = {}

    def add(self, sev, rule, path, msg, source=None):
        k = (rule, path, msg)
        if k in self._seen:
            return
        self._seen.add(k)
        f = {'severity': sev, 'ruleId': rule, 'path': path, 'message': msg}
        if source:
            f['source'] = source
        self.findings.append(f)

    def edit(self, eid, path, msg):
        self.add(edit_severity(eid), 'CMS' + eid, path, msg, 'spec')


def xpath(parent_map, e, cache):
    if e in cache:
        return cache[e]
    parts, cur = [], e
    while cur is not None:
        par = parent_map.get(cur)
        if par is not None:
            same = [c for c in par if c.tag == cur.tag]
            parts.append(f'{cur.tag}[{same.index(cur) + 1}]' if len(same) > 1 else cur.tag)
        else:
            parts.append(cur.tag)
        cur = par
    cache[e] = '/' + '/'.join(reversed(parts))
    return cache[e]


def quarter_range(fy, q):
    """Federal fiscal year quarters: Q1 Oct to Dec of the prior calendar year, Q2 Jan to Mar, Q3 Apr to Jun, Q4 Jul to Sep."""
    start = {1: (fy - 1, 10), 2: (fy, 1), 3: (fy, 4), 4: (fy, 7)}[q]
    end_month = start[1] + 2
    return dt.date(start[0], start[1], 1), dt.date(start[0], end_month, calendar.monthrange(start[0], end_month)[1])


def as_date(v):
    if not DATE_RE.fullmatch(v or ''):
        return None
    try:
        return dt.date.fromisoformat(v)
    except ValueError:
        return None


def as_int(v):
    return int(v) if re.fullmatch(r'[+-]?\d+', v or '') else None


# ---------------------------------------------------------------- checks

def check_structure(root, rep, parent_map, cache):
    """Element order, unknown elements and required elements, per the XSD."""
    for e in root.iter():
        rule = SCHEMA.get(e.tag)
        if rule is None:
            continue
        names = [r[0] for r in rule]
        last = -1
        counts = Counter()
        for c in e:
            if not isinstance(c.tag, str):
                continue
            if c.tag not in names:
                rep.add('error', 'XSD', xpath(parent_map, c, cache),
                        f'{c.tag} is not allowed inside {e.tag} by the NHPBJ {VERSION} XSD.', 'spec')
                continue
            i = names.index(c.tag)
            if i < last:
                rep.add('error', 'XSD', xpath(parent_map, c, cache),
                        f'{c.tag} is out of order inside {e.tag}. The XSD requires: {", ".join(names)}.', 'spec')
            last = max(last, i)
            counts[c.tag] += 1
        for name, lo, hi in rule:
            if counts[name] < lo:
                eid = REQUIRED_EDIT.get(e.tag)
                path = xpath(parent_map, e, cache) + '/' + name
                if eid:
                    rep.edit(eid, path, f'{name} is required in {e.tag}.')
                else:
                    rep.add('error', 'XSD', path, f'{name} is required in {e.tag}.', 'spec')
            if hi is not None and counts[name] > hi:
                rep.add('error', 'XSD', xpath(parent_map, e, cache) + '/' + name,
                        f'{name} may appear at most {hi} time{"s" if hi > 1 else ""} in {e.tag}.', 'spec')
    if root.find('employees') is None and root.find('staffingHours') is None:
        rep.add('error', 'XSD', '/nursingHomeData', 'The file has a header but neither an employees nor a '
                'staffingHours section. CMS requires at least one of them.', 'spec')


def check_text(rep, path, name, v):
    if not v:
        msg = f'{name} is empty. Blank values are not accepted; remove optional tags that have no value.'
        if name == 'facilityId':
            rep.edit('-3702', path, msg)
        elif name == 'employeeId':
            rep.edit('-4004', path, msg)
        else:
            rep.add('error', 'XSD', path, msg, 'spec')   # optional header items: XSD minLength 1
        return
    maxlen, pattern, eid = TEXT_RULES[name]
    if len(v) > maxlen:
        rep.edit('-3793', path, f'{name} is longer than the {maxlen} characters allowed.')
    if pattern and not pattern.fullmatch(v):
        rep.edit(eid, path, f'{name} contains characters the specification does not allow.')


def validate(body: bytes, today=None, staffing=None):
    """One report for the upload. A ZIP with several XML files gets one combined report with a per-file summary;
    each finding then says which file (by position in the ZIP, never by name) it belongs to."""
    today = today or dt.datetime.now(dt.timezone.utc).date()
    if not body or not body.strip():
        raise InputError('Send the PBJ XML file (or the ZIP you upload to CMS) as the request body.')
    files, container = unpack(body)
    parsed = []
    for i, data in enumerate(files, 1):
        try:
            parsed.append((parse(data), data))
        except InputError as exc:
            if len(files) == 1:
                raise
            raise InputError(f'XML file {i} in the ZIP: {exc}') from None
    reports = [validate_tree(root, data, today) for root, data in parsed]
    if len(reports) == 1:
        report = reports[0]
    else:
        findings = [dict(f, file=i) for i, r in enumerate(reports, 1) for f in r.pop('_all')]
        order = {'error': 0, 'warning': 1}
        findings.sort(key=lambda f: (order[f['severity']], f['file'], f['ruleId'], f['path']))
        counts = Counter(f['severity'] for f in findings)
        report = {
            'schemaVersion': 1,
            'status': 'FAIL' if counts['error'] else ('WARN' if counts['warning'] else 'PASS'),
            'specVersion': VERSION,
            'files': [{k: r[k] for k in ('status', 'fileSpecVersion', 'reportingQuarter', 'processType', 'counts',
                                         'coverage', 'findingCounts')} | {'file': i} for i, r in enumerate(reports, 1)],
            'findingCount': len(findings),
            'findingCounts': {'error': counts['error'], 'warning': counts['warning']},
            'ruleCounts': dict(sorted(Counter(f['ruleId'] for f in findings).items())),
            'findings': findings[:MAX_FINDINGS],
            'findingsTruncated': len(findings) > MAX_FINDINGS,
            'notChecked': reports[0]['notChecked'],
            'sources': SOURCES,
            'scope': reports[0]['scope'],
        }
    report.pop('_all', None)
    single = reports[0] if len(reports) == 1 else None
    quarters = {(r['reportingQuarter']['start'], r['reportingQuarter']['end']) for r in reports}
    report['submissionDeadline'] = deadline(reports[0]['reportingQuarter'], today) if len(quarters) == 1 else None
    if staffing:
        if single is None:
            report['staffingEstimate'] = {'available': False, 'reason': 'Not computed for a ZIP with several XML files. '
                                          'Send one facility\'s file to get an estimate.'}
        else:
            report['staffingEstimate'] = staffing_estimate(single, staffing, today)
    for r in reports:
        for k in ('_nurseHours', '_noRnDays', '_process'):
            r.pop(k, None)
    report['input'] = {'container': container, 'xmlFiles': len(files), 'xmlBytes': sum(len(d) for d in files)}
    report['inputSha256'] = hashlib.sha256(body).hexdigest()
    return report


def validate_tree(root, data, today):
    rep = Report()
    parent_map = {c: p for p in root.iter() for c in p}
    cache = {}
    xp = lambda e: xpath(parent_map, e, cache)
    val = lambda e: (e.text or '').strip() if e is not None else None

    if any(b > 127 for b in data):
        rep.add('warning', 'CMS-ASCII', '/nursingHomeData', 'The file contains non-ASCII characters. CMS issues a '
                'warning for these; PBJ files are expected to be plain ASCII.', 'spec')

    check_structure(root, rep, parent_map, cache)

    # ---------------------------------------------------------------- header
    header = root.find('header')
    fy = q = None
    file_version = None
    if header is not None:
        file_version = header.get('fileSpecVersion')
        hp = xp(header)
        if file_version is None:
            rep.edit('-4003', hp + '/@fileSpecVersion', 'fileSpecVersion is required on the header element.')
        elif file_version in RETIRED_VERSIONS:
            if today >= RETIRE_DATE:
                rep.edit('-1021', hp + '/@fileSpecVersion', f'This fileSpecVersion was retired on April 1, 2026. '
                         f'Files must use {VERSION}.')
            else:
                rep.edit('-1020', hp + '/@fileSpecVersion', f'This fileSpecVersion retires on April 1, 2026. '
                         f'Move to {VERSION}.')
        elif file_version != VERSION:
            rep.edit('-3676', hp + '/@fileSpecVersion', f'fileSpecVersion must be {VERSION}.')

        for name in ('facilityId', 'softwareVendorName', 'softwareVendorEmail', 'softwareProductName',
                     'softwareProductVersion'):
            e = header.find(name)
            if e is not None:
                check_text(rep, xp(e), name, val(e))
        e = header.find('stateCode')
        if e is not None and val(e) not in STATES:
            rep.edit('-3676', xp(e), 'stateCode is not one of the state codes the specification lists.')
        e = header.find('reportQuarter')
        if e is not None:
            q = as_int(val(e))
            if q not in (1, 2, 3, 4):
                rep.edit('-3676', xp(e), 'reportQuarter must be 1, 2, 3 or 4 (federal fiscal quarters).')
                q = None
        e = header.find('federalFiscalYear')
        if e is not None:
            fy = as_int(val(e))
            if fy is None or not 2016 <= fy <= 9999:
                rep.edit('-3679', xp(e), 'federalFiscalYear must be a year from 2016.')
                fy = None
    qstart, qend = quarter_range(fy, q) if fy and q else (None, None)

    # ---------------------------------------------------------------- employees
    employees = {}       # employeeId -> (hire, term, element)
    emp_ids = Counter()
    for emp in root.findall('employees/employee'):
        idel = emp.find('employeeId')
        eid = val(idel)
        if idel is not None:
            check_text(rep, xp(idel), 'employeeId', eid)
            if eid and SSN_LIKE.fullmatch(eid.replace(' ', '')):
                rep.add('warning', 'RISK-ID-PII', xp(idel), 'This employeeId has the shape of a Social Security '
                        'Number. CMS requires IDs that contain no personal information such as an SSN.', 'manual')
            emp_ids[eid] += 1
        dates = {}
        for name in ('hireDate', 'terminationDate'):
            de = emp.find(name)
            if de is None:
                continue
            v = val(de)
            d = as_date(v)
            if not v:
                rep.edit('-3677', xp(de), f'{name} is empty. Remove the tag when there is no date.')
            elif d is None:
                rep.edit('-3677', xp(de), f'{name} must be a valid date written as YYYY-MM-DD.')
            elif d.year < 1895:
                rep.edit('-1009', xp(de), f'{name} must be in 1895 or later.')
            elif d.year > 2050:
                rep.edit('-4019', xp(de), f'{name} must be in 2050 or earlier.')
            else:
                dates[name] = d
        if dates.get('hireDate') and dates.get('terminationDate') and dates['terminationDate'] < dates['hireDate']:
            rep.add('warning', 'SR-DATE-ORDER', xp(emp), 'terminationDate is before hireDate for this employee.')
        if eid:
            employees[eid] = (dates.get('hireDate'), dates.get('terminationDate'), emp)
    for eid, n in emp_ids.items():
        if eid and n > 1:
            first = employees[eid][2]
            rep.add('warning', 'SR-DUPLICATE-EMPLOYEE', xp(first), f'This employeeId appears {n} times in the '
                    'employees section. Each staff member needs one unique ID.', 'manual')

    # ---------------------------------------------------------------- staffing hours
    sh = root.find('staffingHours')
    process = None
    totals = {'staffHoursRecords': 0, 'workDays': 0, 'hourEntries': 0, 'totalHours': 0.0}
    per_day = defaultdict(float)             # (employeeId, date) -> hours
    per_day_el = {}
    per_month = defaultdict(float)           # (employeeId, year, month) -> hours
    per_month_el = {}
    rn_days, any_days = set(), set()
    nurse_hours = {'total': 0.0, 'rn': 0.0, 'weekendTotal': 0.0, 'aide': 0.0, 'weekendAide': 0.0}
    if sh is not None:
        process = sh.get('processType')
        if process is None:
            rep.edit('-4008', xp(sh) + '/@processType', 'processType ("merge" or "replace") is required.')
        elif process not in ('merge', 'replace'):
            rep.edit('-3676', xp(sh) + '/@processType', 'processType must be "merge" or "replace".')
            process = None
        records = sh.findall('staffHours')
        if process == 'replace' and not records:
            rep.add('warning', 'RISK-EMPTY-REPLACE', xp(sh), 'processType is "replace" and the section has no '
                    'staffHours records. CMS deletes all previously submitted staffing hours for the quarter when '
                    'this file is accepted.', 'spec')
        listed = root.find('employees') is not None
        for rec in records:
            totals['staffHoursRecords'] += 1
            idel = rec.find('employeeId')
            eid = val(idel)
            if idel is not None:
                check_text(rep, xp(idel), 'employeeId', eid)
                if listed and eid and eid not in employees:
                    rep.add('warning', 'CMS-4016-PARTIAL', xp(idel), 'This employeeId is not in this file\'s '
                            'employees section. CMS rejects the file unless the ID already exists in the PBJ system '
                            'from an earlier submission; check that it does.', 'spec')
            hire, term = employees.get(eid, (None, None, None))[:2]
            for wd in rec.findall('workDays/workDay'):
                totals['workDays'] += 1
                de = wd.find('date')
                v = val(de)
                d = as_date(v)
                if de is not None:
                    if not v or d is None:
                        rep.edit('-3677', xp(de), 'date must be a valid date written as YYYY-MM-DD.')
                    elif d.year < 1895:
                        rep.edit('-1009', xp(de), 'date must be in 1895 or later.')
                    else:
                        if d > today:
                            rep.edit('-4002', xp(de), 'date is in the future.')
                        if qstart and not qstart <= d <= qend:
                            rep.edit('-1010', xp(de), 'date is outside the reporting quarter in the header. CMS '
                                     'does not process staffing hours records outside the quarter.')
                        if hire and d < hire:
                            rep.add('warning', 'SR-OUTSIDE-EMPLOYMENT', xp(de), 'Hours are reported before this '
                                    'employee\'s hireDate.')
                        if term and d > term:
                            rep.add('warning', 'SR-OUTSIDE-EMPLOYMENT', xp(de), 'Hours are reported after this '
                                    'employee\'s terminationDate.')
                for he in wd.findall('hourEntries/hourEntry'):
                    totals['hourEntries'] += 1
                    he_h, he_j, he_p = he.find('hours'), he.find('jobTitleCode'), he.find('payTypeCode')
                    hours = None
                    if he_h is not None:
                        hv = val(he_h)
                        if not hv or not HOURS_RE.fullmatch(hv):
                            rep.edit('-3679', xp(he_h), 'hours must be a number from 0 to 22.5.')
                        else:
                            hours = float(hv)
                            if not 0 <= hours <= 22.5:
                                rep.edit('-3679', xp(he_h), 'hours must be from 0 to 22.5.')
                                hours = None
                            elif '.' in hv and len(hv.split('.')[1]) > 2:
                                rep.edit('-3679', xp(he_h), 'hours may have at most two decimal places.')
                    job = as_int(val(he_j)) if he_j is not None else None
                    if he_j is not None and job not in JOB_TITLES:
                        rep.edit('-3676', xp(he_j), 'jobTitleCode must be one of the CMS job title codes 1 to 40.')
                        job = None
                    if he_p is not None and as_int(val(he_p)) not in PAY_TYPES:
                        rep.edit('-3676', xp(he_p), 'payTypeCode must be 1 (exempt), 2 (non-exempt) or 3 (contract).')
                    if hours is not None and d is not None and eid:
                        totals['totalHours'] += hours
                        per_day[(eid, d)] += hours
                        per_day_el.setdefault((eid, d), wd)
                        per_month[(eid, d.year, d.month)] += hours
                        if job in NURSE_CODES and (qstart is None or qstart <= d <= qend):
                            weekend = d.weekday() >= 5
                            nurse_hours['total'] += hours
                            nurse_hours['weekendTotal'] += hours if weekend else 0.0
                            if job in RN_CODES:
                                nurse_hours['rn'] += hours
                            if job in AIDE_CODES:
                                nurse_hours['aide'] += hours
                                nurse_hours['weekendAide'] += hours if weekend else 0.0
                        per_month_el.setdefault((eid, d.year, d.month), rec)
                        if hours > 0 and (qstart is None or qstart <= d <= qend):
                            any_days.add(d)
                            if job in RN_CODES:
                                rn_days.add(d)

    # CMS -4025: total hours per employee per date, across all job titles, at most 22.5.
    for key, h in per_day.items():
        if h > 22.5 + 1e-9:
            rep.edit('-4025', xp(per_day_el[key]), 'This employee has more than 22.5 hours in total on this date '
                     '(all job titles together). CMS allows at most 22.5 and rejects the file above it.')

    # RISK: individual employee IDs over 400 hours in a month (past CMS audit selection criterion).
    for key, h in per_month.items():
        if h > MONTHLY_HOURS_FLAG:
            rep.add('warning', 'RISK-HOURS-PER-MONTH', xp(per_month_el[key]), f'This employee ID has more than '
                    f'{MONTHLY_HOURS_FLAG} hours in one calendar month. CMS has named individual employees reporting '
                    f'over {MONTHLY_HOURS_FLAG} hours a month as an audit selection criterion. The PBJ FAQ separately lists '
                    'grouping several contract staff under one ID as a reason audits fail. Check that this ID is one '
                    'person.', 'audit2018')

    # RISK: days in the quarter with no RN hours (job codes 5, 6, 7). Four or more: one-star staffing rating.
    no_rn_days = None
    if qstart and sh is not None and totals['hourEntries'] and qstart <= today:
        last = min(qend, today)
        days = [qstart + dt.timedelta(n) for n in range((last - qstart).days + 1)]
        no_rn_days = sum(1 for d in days if d not in rn_days)
        if no_rn_days >= 4:
            if process == 'merge':
                tail = ' This file is a merge, so hours already in the PBJ system may cover some of those days.'
            else:
                tail = ''
            rep.add('warning', 'RISK-NO-RN-DAYS', xp(sh), f'{no_rn_days} days in the reporting quarter have no RN '
                    'hours (job title codes 5, 6 and 7). CMS gives a one-star staffing rating for four or more such '
                    f'days when residents were in the facility.{tail}', 'fivestar')

    order = {'error': 0, 'warning': 1}
    findings = sorted(rep.findings, key=lambda f: (order[f['severity']], f['ruleId'], f['path']))
    counts = Counter(f['severity'] for f in findings)
    status = 'FAIL' if counts['error'] else ('WARN' if counts['warning'] else 'PASS')
    return {
        'schemaVersion': 1,
        'status': status,
        'specVersion': VERSION,
        'fileSpecVersion': file_version if file_version in RETIRED_VERSIONS | {VERSION} else ('other' if file_version else None),
        'reportingQuarter': {'federalFiscalYear': fy, 'quarter': q,
                             'start': qstart.isoformat() if qstart else None, 'end': qend.isoformat() if qend else None},
        'processType': process,
        'counts': {'employees': len(root.findall('employees/employee')), **{k: (round(v, 2) if isinstance(v, float) else v)
                                                                            for k, v in totals.items()}},
        'coverage': {'daysWithHours': len(any_days), 'daysWithRnHours': len(rn_days), 'daysWithoutRnHours': no_rn_days},
        'findingCount': len(findings),
        'findingCounts': {'error': counts['error'], 'warning': counts['warning']},
        'ruleCounts': dict(sorted(Counter(f['ruleId'] for f in findings).items())),
        'findings': findings[:MAX_FINDINGS],
        'findingsTruncated': len(findings) > MAX_FINDINGS,
        '_all': findings,
        '_nurseHours': nurse_hours,
        '_noRnDays': no_rn_days,
        '_process': process,
        'notChecked': [
            'Whether facilityId and employee IDs match what CMS has on file (CMS edits -3693 and -4016 need the PBJ system).',
            'Whether hours match payroll, invoices or contracts, which is what PBJ audits verify.',
            'Whether hours were worked onsite, and whether meal breaks were actually deducted (the file has no shift times).',
            'The CMS staffing rating itself. With a census you send, the report estimates hours per resident day and a '
            'star range; CMS uses its own MDS census, case mix and six quarters of turnover data.',
            'PBJ Administration Submission files (Employee Link).',
            'ZIP and XML file naming rules, and the 5 MB limit CMS applies to the upload ZIP.',
        ],
        'sources': SOURCES,
        'scope': ('Structural checks against the CMS PBJ data specifications and documented risk patterns. A PASS does '
                  'not mean CMS will accept the file or that it will survive a CMS audit, and this is not legal or '
                  'compliance advice.'),
    }


# ------------------------------------------------------------------ deadline
def deadline(rq, today):
    """CMS must receive the quarter's file by the end of the 45th day after the quarter (11:59 PM Eastern)."""
    if not rq or not rq.get('end'):
        return None
    due = dt.date.fromisoformat(rq['end']) + dt.timedelta(days=45)
    left = (due - today).days
    return {'date': due.isoformat(), 'time': '11:59 PM Eastern Time', 'asOf': today.isoformat(),
            'daysRemaining': max(left, 0), 'passed': left < 0,
            'note': ('CMS accepts no submissions after the deadline.' if left >= 0 else
                     'The deadline for this quarter has passed. CMS accepts no submissions after it.')}


# ------------------------------------------------------------------ Five-Star staffing estimate
# CMS Nursing Home Five-Star Technical Users' Guide, September 2026: staffing domain, Table 3 and Appendix Table A2.
# Each row: (points, lower bound). A value gets the points of the highest lower bound it reaches.
CUTS = {
    'rn': [(100, 1.202), (90, 0.934), (80, 0.786), (70, 0.678), (60, 0.591), (50, 0.513), (40, 0.440), (30, 0.368),
           (20, 0.275), (10, 0.0)],
    'total': [(100, 5.070), (90, 4.499), (80, 4.151), (70, 3.910), (60, 3.692), (50, 3.493), (40, 3.293), (30, 3.051),
              (20, 2.722), (10, 0.0)],
    'weekendTotal': [(50, 4.464), (45, 3.958), (40, 3.668), (35, 3.429), (30, 3.233), (25, 3.044), (20, 2.862),
                     (15, 2.637), (10, 2.354), (5, 0.0)],
}
# Turnover, percent: (points, upper bound). Lower turnover earns more points.
TURNOVER_CUTS = {
    'rnTurnover': [(50, 20.000), (45, 28.571), (40, 35.714), (35, 41.667), (30, 44.444), (25, 52.941), (20, 60.000),
                   (15, 66.667), (10, 80.000), (5, 100.0)],
    'nurseTurnover': [(50, 31.126), (45, 37.500), (40, 41.739), (35, 45.679), (30, 49.254), (25, 53.425),
                      (20, 57.692), (15, 62.791), (10, 69.792), (5, 100.0)],
}
STAR_CUTS = [(5, 320), (4, 255), (3, 205), (2, 155), (1, 0)]
EST_LABEL = ('Estimate only. This is not the CMS staffing rating, which CMS computes from its own MDS census, case mix '
             'and six quarters of PBJ data.')


def level_points(measure, value):
    v = round(value, 3)
    return next(p for p, lo in CUTS[measure] if v >= lo)


def turnover_points(measure, pct):
    v = round(pct, 3)
    return next(p for p, hi in TURNOVER_CUTS[measure] if v <= hi)


def stars(score):
    return next(s for s, lo in STAR_CUTS if score >= lo)


def staffing_estimate(r, inp, today):
    rq = r['reportingQuarter']
    if not rq.get('start'):
        return {'available': False, 'reason': 'The header has no valid reporting quarter, so there is no quarter to '
                'estimate.'}
    qstart, qend = dt.date.fromisoformat(rq['start']), dt.date.fromisoformat(rq['end'])
    days = (qend - qstart).days + 1
    weekend_days = sum(1 for n in range(days) if (qstart + dt.timedelta(n)).weekday() >= 5)
    h = r['_nurseHours']
    census = inp['census']
    assumptions = ['Every day in the quarter had at least one resident.']
    weekend_census = inp.get('weekendCensus')
    if weekend_census is None:
        weekend_census = census * weekend_days / days
        assumptions.append('Weekend resident days were estimated from the quarter total, assuming the same census '
                           'every day. Send weekendCensus for a closer estimate.')
    ratio = inp.get('caseMixRatio')
    if ratio is None:
        ratio = 1.0
        assumptions.append('Case mix at the national average (nursing case-mix ratio 1.0). CMS adjusts for your '
                           'residents\' acuity; send caseMixRatio if you know it.')
    assumptions.append('Case-mix adjustment approximated as reported hours divided by the case-mix ratio.')
    if r['_process'] == 'merge':
        assumptions.append('This file is a merge: only the hours in this file are counted, not hours already '
                           'submitted to CMS for the quarter.')
    if today < qend:
        assumptions.append('The quarter is not over yet: hours and census should cover the same days.')
    reported = {'total': h['total'] / census, 'rn': h['rn'] / census, 'weekendTotal': h['weekendTotal'] / weekend_census}
    aide = h['aide'] / census
    aide_weekend = h['weekendAide'] / weekend_census
    adjusted = {k: v / ratio for k, v in reported.items()}
    out = {
        'available': True,
        'label': EST_LABEL,
        'method': 'CMS Five-Star Technical Users\' Guide (September 2026), staffing domain, Table 3 and Table A2',
        'reportedHprd': {k: round(v, 3) for k, v in reported.items()},
        'adjustedHprd': {k: round(v, 3) for k, v in adjusted.items()},
        'assumptions': assumptions,
    }
    # CMS staffing-level exclusions: improbable data means no staffing measures are reported.
    if (reported['total'] == 0 or reported['weekendTotal'] == 0 or reported['total'] > 12
            or reported['weekendTotal'] > 12 or aide > 5.25 or aide_weekend > 5.25):
        out.update({'excluded': True, 'stars': None, 'starRange': None,
                    'note': 'These staffing levels fall under a CMS exclusion rule (total nurse staffing of zero or '
                            'above 12 hours per resident day, or nurse aide staffing above 5.25). CMS would not report '
                            'staffing levels, and the facility may get no staffing rating or a one-star rating.'})
        return out
    points = {k: level_points(k, v) for k, v in adjusted.items()}
    lo = hi = sum(points.values())
    for m, (pmin, pmax) in (('rnTurnover', (5, 50)), ('nurseTurnover', (5, 50))):
        if inp.get(m) is not None:
            points[m] = turnover_points(m, inp[m])
            lo += points[m]
            hi += points[m]
        else:
            points[m] = None
            lo += pmin
            hi += pmax
    if inp.get('adminDepartures') is not None:
        n = inp['adminDepartures']
        points['adminTurnover'] = 30 if n == 0 else 25 if n == 1 else 10
        lo += points['adminTurnover']
        hi += points['adminTurnover']
    else:
        points['adminTurnover'] = None
        lo, hi = lo + 10, hi + 30
    if any(points[m] is None for m in ('rnTurnover', 'nurseTurnover', 'adminTurnover')):
        assumptions.append('Turnover measures not supplied: the range covers every possible turnover score.')
    star_lo, star_hi = stars(lo), stars(hi)
    one_star = r['_noRnDays'] is not None and r['_noRnDays'] >= 4
    if one_star:
        star_lo = star_hi = 1
    out.update({
        'excluded': False,
        'points': points,
        'scoreRange': [lo, hi],
        'starRange': [star_lo, star_hi],
        'stars': star_lo if star_lo == star_hi else None,
        'oneStarException': one_star,
        'note': ('Four or more days in the quarter have no RN hours, which brings a one-star staffing rating whatever '
                 'the score.' if one_star else 'Points and stars use the CMS cut points for each measure and the '
                 'Table 3 thresholds (155, 205, 255 and 320 of 380 points).'),
    })
    return out
