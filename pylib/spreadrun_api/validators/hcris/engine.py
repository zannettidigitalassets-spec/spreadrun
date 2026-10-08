"""SpreadRun Medicare cost report (CMS-2552-10) pre-audit QA.

Checks a hospital's electronic cost report (ECR) file and its supporting listings the way the deterministic part of
a MAC review frames them: is the file in the CMS record format, do the worksheets tie, does the Worksheet S-10 math
recompute, do the bad debt and charity care listings support the amounts claimed, and is the report on time.
SpreadRun's own engine. Standard library only. No network calls.

It never decides whether a cost, a bad debt or a charity care amount is allowable or what Medicare will pay. That is
the MAC's judgment, not math, and the report says so.

Input: a .zip package with the ECR file and the listings (Exhibit 2A Medicare bad debts, Exhibit 3B charity care,
Exhibit 3C total bad debts, each .xlsx in the CMS template layout or .csv in the same grid), or the ECR file alone.
The cost reporting period start and end dates come as query parameters.

Rules, read October 8, 2026:
  42 CFR 413.24(f)(2)            due on or before the last day of the fifth month after the period ends (150 days
                                 when the period ends mid-month); extensions only for extraordinary circumstances.
  42 CFR 413.24(f)(5)(i)(B), (D) a cost report is rejected without a Medicare bad debt listing that corresponds to
                                 the bad debt claimed, or (DSH hospitals) a charity care listing that corresponds to
                                 the charity care claimed.
  42 CFR 413.24(f)(5)(ii)        the ECR file must conform to the ECR Specifications Manual.
  42 CFR 413.89(e), (f)          allowable bad debt: deductible and coinsurance only, a bill within 120 days of the
                                 remittance advice, at least 120 days of collection effort, written off in the
                                 period the account is deemed worthless.
  CMS Pub. 15-2, chapter 40 (Form CMS-2552-10), Transmittal 26, June 30, 2026:
      4095 Table 1               record types 1 to 4, positions and lengths (ECR specification date 2026181).
      4095 Table 6               level 1 edits 10000 to 11000 and the Worksheet S-10 edits 14000S to 14021S.
      4004.2                     Exhibit 2A, listing of Medicare bad debts.
      4012.1, 4012.2             Worksheet S-10 line by line, Exhibits 3B and 3C.
      4020, 4023.1, 4030.1/.2    Worksheets B, C and E transfers.
  CMS ECR exhibit specifications for Exhibits 2A, 3B and 3C (cell locations and data rules).

Every amount the report shows is read from, or recomputed from, the files. Patient names, MBIs and Medicaid numbers
are refused (the listings must have them blanked before upload), and a patient account number is shown by its last
four characters only.
"""
import csv
import datetime as dt
import hashlib
import io
import re
import time
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict

MAX_BYTES = 4_000_000   # Vercel caps request bodies near 4.5 MB
MAX_UNZIPPED = 60_000_000
MAX_FILES = 24
MAX_ROWS = 60000
MAX_FINDINGS = 400
TIME_BUDGET_S = 20.0
TOL = 1.0            # dollars: the ECR carries whole dollars, so a recomputed amount may differ by rounding
RATIO_TOL = 0.0000011  # ratios are carried to six decimals

SPEC_DATE = '2026181'
TRANSMITTAL = 'CMS Pub. 15-2, chapter 40, Transmittal 26 (June 30, 2026)'
SPEC_NOTE = ('ECR specification dated 2026181, valid for cost reporting periods ending on or after June 30, 2026, '
             'with the record layouts and edits in section 4095')
# Table 1, record 1, field 14: the current specification date and the prior approvals.
APPROVED_SPEC_DATES = ['2026181', '2025365', '2025181', '2024275', '2023274', '2023213', '2023091', '2023001',
                       '2022274', '2021365', '2019365', '2018273', '2018031', '2017305', '2017274', '2016274',
                       '2015274', '2015181', '2014274', '2014181', '2013274', '2012275', '2012182', '2010121']
LISTING_FORMAT_START = dt.date(2022, 10, 1)   # Exhibits 2A, 3B and 3C: periods beginning on or after this date
STATUS4_START = dt.date(2025, 10, 1)          # Exhibit 3B insurance status 4 and column 22 (Transmittal 26)

SOURCES = {
    '413.24(f)(2)': '42 CFR 413.24(f)(2), due dates for cost reports',
    '413.24(f)(5)': '42 CFR 413.24(f)(5)(i)(B) and (D), cost report rejected without the bad debt and charity care '
                    'listings that correspond to the amounts claimed',
    '413.24(f)(5)(ii)': '42 CFR 413.24(f)(5)(ii), the ECR file must conform to the ECR Specifications Manual',
    '413.89': '42 CFR 413.89(e) and (f), criteria for allowable Medicare bad debt and the period of write-off',
    'ecr-t1': 'CMS Pub. 15-2, chapter 40, section 4095, Table 1, record specifications',
    'ecr-t6': 'CMS Pub. 15-2, chapter 40, section 4095, Table 6, edits',
    's10': 'CMS Pub. 15-2, chapter 40, section 4012.1, Worksheet S-10 line instructions',
    'ex2a': 'CMS Pub. 15-2, chapter 40, section 4004.2, Exhibit 2A, and the CMS Exhibit 2A specification',
    'ex3b': 'CMS Pub. 15-2, chapter 40, section 4012.2, Exhibit 3B, and the CMS Exhibit 3B specification',
    'ex3c': 'CMS Pub. 15-2, chapter 40, section 4012.2, Exhibit 3C, and the CMS Exhibit 3C specification',
    'wb': 'CMS Pub. 15-2, chapter 40, section 4020, Worksheet B, Part I',
    'wc': 'CMS Pub. 15-2, chapter 40, section 4023.1, Worksheet C, Part I',
    'we': 'CMS Pub. 15-2, chapter 40, sections 4030.1 and 4030.2, Worksheet E, Parts A and B',
}

NOT_CHECKED = [
    'Whether any cost, bad debt or charity care amount is allowable, or what Medicare will pay. That is the MAC\'s '
    'judgment, and a PASS does not decide it.',
    'Cost finding choices: statistics, allocation bases, reclassifications and adjustments are taken as filed.',
    'Collection effort documentation, indigence determinations, Medicaid remittance advices and the bad debt '
    'collection policy. Only the dates and amounts in the listings are checked.',
    'Whether the listings match your patient accounting system.',
    'The type 4 encryption code. Only approved vendor software can produce it; the check confirms the records are '
    'there.',
    'Listings for components other than the hospital (subprovider, SNF and other CCNs) are checked row by row but not '
    'tied to their worksheets.',
    'Worksheets and edits outside this list: the full set of level 1 and level 2 edits runs in your vendor software '
    'and again at the MAC.',
]

SCOPE = ('A pre-audit math check: is the ECR file in the CMS format, do Worksheets S, A, B, C, D and E tie, does '
         'Worksheet S-10 recompute, and do the listings support what is claimed. A PASS is not MAC acceptance and '
         'does not determine allowability or payment.')

# The free demo runs the two published sample packages (public/samples/hcris-*.zip, built by
# scripts/hcris/make_samples.py) and nothing else: checking your own cost report is the paid product. Matched byte for
# byte; test_hcris.py recomputes these from the files.
DEMO_SAMPLES = {
    '330bd45fd116cb1786fd3b5a0701e4842bae118fc07646c7c75bbc8df646bed3': 'hcris-sample-clean',
    'ebaa9beb2cdbafe26cf1b561f884bd5d3a61b0138555ad65034325a8e6854e0c': 'hcris-sample-errors',
}
DEMO_ONLY = ('The free demo runs the sample packages only. To check your own cost report, sign in with $200.00 of '
             'credit or call the paid API. Nothing was charged.')


class InputError(ValueError):
    """The input cannot be checked (400, never charged). Messages never repeat file content."""


class Timeout(InputError):
    pass


class Clock:
    def __init__(self, budget):
        self.end = time.monotonic() + budget

    def tick(self):
        if time.monotonic() > self.end:
            raise Timeout('The check ran out of time on this package. Split very large listings by CCN and run '
                          'them separately, or contact support. Nothing was charged.')


# ------------------------------------------------------------------ helpers
def rnd(x, places=2):
    return round(float(x) + 0.0, places)


def money(x):
    return round(float(x), 2)


def fmt_line(line, sub):
    """ECR line '027' + subline '01' -> '27.01'."""
    n = str(int(line)) if line.strip().isdigit() else line.strip()
    return n if not sub or int(sub or 0) == 0 else f'{n}.{int(sub):02d}'


def fmt_col(col, sub=''):
    c = col.strip().lstrip('0') or '0'
    return c if not sub or not sub.strip() or int(sub) == 0 else f'{c}.{int(sub):02d}'


def julian(s):
    if not re.fullmatch(r'\d{7}', s or ''):
        return None
    y, d = int(s[:4]), int(s[4:])
    try:
        base = dt.date(y, 1, 1)
    except ValueError:
        return None
    if not 1 <= d <= (366 if (y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)) else 365):
        return None
    return base + dt.timedelta(days=d - 1)


def mdy(s):
    m = re.fullmatch(r'\s*(\d{1,2})/(\d{1,2})/(\d{4})\s*', s or '')
    if not m:
        return None
    try:
        return dt.date(int(m.group(3)), int(m.group(1)), int(m.group(2)))
    except ValueError:
        return None


def iso(d):
    return d.isoformat() if d else None


def last_day(y, m):
    nxt = dt.date(y + (m == 12), m % 12 + 1, 1)
    return nxt - dt.timedelta(days=1)


def due_date(fye):
    """42 CFR 413.24(f)(2)(i): the last day of the fifth month after the period ends; 150 days when the period ends
    on a day other than the last day of a month."""
    if fye == last_day(fye.year, fye.month):
        m = fye.month + 5
        y = fye.year + (m - 1) // 12
        m = (m - 1) % 12 + 1
        return last_day(y, m), 'month-end'
    return fye + dt.timedelta(days=150), '150-days'


def mask(acct):
    a = re.sub(r'\s+', '', str(acct or ''))
    return ('...' + a[-4:]) if len(a) > 4 else ('...' + a if a else '(blank)')


# ------------------------------------------------------------------ parameters
def parse_params(query, today=None):
    q = {str(k): (v if isinstance(v, str) else str(v)) for k, v in (query or {}).items()}
    known = {'periodStart', 'periodEnd', 'asOf'}
    if [k for k in q if k not in known]:
        raise InputError('Unknown parameter. Parameters are periodStart and periodEnd (required) and asOf (optional), '
                         'as YYYY-MM-DD.')
    for k in ('periodStart', 'periodEnd'):
        if not q.get(k):
            raise InputError('periodStart and periodEnd are required: the first and last day of the cost reporting '
                             'period, as YYYY-MM-DD.')

    def day(name):
        try:
            return dt.date.fromisoformat(q.get(name, '').strip())
        except ValueError:
            raise InputError(f'{name} must be a date written YYYY-MM-DD.') from None

    start, end = day('periodStart'), day('periodEnd')
    if end <= start:
        raise InputError('periodEnd must be after periodStart.')
    if (end - start).days > 400:
        raise InputError('A cost reporting period is generally 12 months. Check periodStart and periodEnd.')
    if start < LISTING_FORMAT_START:
        raise InputError('This version checks cost reporting periods beginning on or after October 1, 2022, the '
                         'periods that use the Exhibit 2A, 3B and 3C listing formats.')
    as_of = day('asOf') if q.get('asOf') else (today or dt.datetime.now(dt.timezone.utc).date())
    return start, end, as_of


# ------------------------------------------------------------------ package
def read_package(body, clock):
    """Return (ecr_bytes, ecr_name, [(name, bytes)]) from a zip package or a bare ECR file."""
    if not body:
        raise InputError('The request body is empty. Send the ECR file, or a .zip with the ECR file and the listings.')
    if len(body) > MAX_BYTES:
        raise InputError('The package is over the 4 MB limit. Zip the ECR file and the listings (a .zip usually shrinks '
                         'them several times over), or split large listings by CCN. Nothing was charged.')
    if body[:4] != b'PK\x03\x04':
        if body[:4] == b'%PDF':
            raise InputError('This is a PDF. Send the ECR file (the text file your cost report software exports for '
                             'MCReF), or a .zip with the ECR file and the listings. Nothing was charged.')
        if not looks_like_ecr(body):
            raise InputError('This is not an ECR file: its first record must be type 1, record number 1 (the line '
                             'that starts with "1" and carries the CCN and the period). Export the ECR file from your '
                             'cost report software. Nothing was charged.')
        return body, 'ECR file', []
    try:
        zf = zipfile.ZipFile(io.BytesIO(body))
        infos = [i for i in zf.infolist() if not i.is_dir() and not i.filename.split('/')[-1].startswith(('.', '~$'))
                 and '__MACOSX' not in i.filename]
    except zipfile.BadZipFile:
        raise InputError('The .zip package could not be opened. Zip the ECR file and the listings again.') from None
    names = {i.filename for i in zf.infolist()}
    if '[Content_Types].xml' in names and 'xl/workbook.xml' in names:
        raise InputError('This is a single spreadsheet. Send the ECR file, or a .zip with the ECR file and the '
                         'listings.')
    if len(infos) > MAX_FILES:
        raise InputError(f'The package has more than {MAX_FILES} files. Include the ECR file and the listings only.')
    if sum(i.file_size for i in infos) > MAX_UNZIPPED:
        raise InputError('The package unzips to more than 60 MB. Send the files for one cost report.')
    files = []
    for i in infos:
        clock.tick()
        try:
            files.append((i.filename.split('/')[-1], zf.read(i)))
        except (zipfile.BadZipFile, RuntimeError, NotImplementedError):
            raise InputError('A file in the package could not be read (encrypted or damaged). Zip it again without '
                             'a password.') from None
    ecrs = [(n, b) for n, b in files if looks_like_ecr(b)]
    if not ecrs:
        raise InputError('No ECR file was found in the package. The ECR file is the text file your cost report '
                         'software exports for MCReF (named like ECnnnnnn.yyLC); its first record starts with "1".')
    if len(ecrs) > 1:
        raise InputError('The package has more than one ECR file. Send one cost report per run.')
    others = [(n, b) for n, b in files if not looks_like_ecr(b)]
    return ecrs[0][1], ecrs[0][0], others


def looks_like_ecr(b):
    head = b[:200]
    if head[:2] == b'PK' or head[:4] == b'%PDF':
        return False
    try:
        t = head.decode('ascii')
    except UnicodeDecodeError:
        return False
    first = t.split('\n', 1)[0].rstrip('\r')
    return bool(re.match(r'^1.{10} 1   ', first))


# ------------------------------------------------------------------ ECR
class Ecr:
    def __init__(self):
        self.rec1 = None
        self.type1 = {}
        self.labels = {}       # (wk, line, sub, col, subcol) -> text
        self.data = {}         # (wk, line, sub, col, subcol) -> raw text
        self.type4 = 0
        self.lines = 0

    def num(self, wk, line, col, sub='00', subcol='00'):
        v = self.data.get((wk, line, sub, col, subcol))
        if v is None:
            return 0.0
        try:
            return float(v)
        except ValueError:
            return 0.0

    def text(self, wk, line, col, sub='00', subcol='00'):
        return (self.data.get((wk, line, sub, col, subcol)) or '').strip()

    def has(self, wk):
        return any(k[0] == wk for k in self.data)

    def column_any(self, wk):
        """True when the worksheet has at least one nonzero amount."""
        for k, v in self.data.items():
            if k[0] == wk:
                try:
                    if float(v):
                        return True
                except ValueError:
                    pass
        return False

    def column(self, wk, col, subcol='00'):
        """{(line, sub): value} for one worksheet column."""
        out = {}
        for k, v in self.data.items():
            if k[0] == wk and k[3] == col and k[4] == subcol:
                try:
                    out[(k[1], k[2])] = float(v)
                except ValueError:
                    pass
        return out

    def sum_matching(self, pattern, line, col, sub='00'):
        rx = re.compile(pattern)
        tot, used = 0.0, set()
        for k, v in self.data.items():
            if k[1] == line and k[2] == sub and k[3] == col and k[4] == '00' and rx.match(k[0]):
                try:
                    tot += float(v)
                    used.add(k[0])
                except ValueError:
                    pass
        return tot, sorted(used)


def parse_ecr(raw, rep, clock):
    """Parse the ECR file and apply the format edits of Table 1 and Table 6, level 1."""
    e = Ecr()
    try:
        text = raw.decode('ascii')
    except UnicodeDecodeError:
        text = raw.decode('latin-1')
        rep.add('error', 'ECR-CHARSET', 'The ECR file has characters outside plain ASCII. ECR records are plain text.',
                'ecr-t1', where={'record': 'file'})
    lines = text.split('\n')
    if lines and lines[-1] == '':
        lines.pop()
    e.lines = len(lines)
    if not lines:
        raise InputError('The ECR file is empty.')
    no_crlf = sum(1 for ln in lines if not ln.endswith('\r'))
    if no_crlf:
        rep.add('error', 'ECR-10150', f'{no_crlf} of {len(lines)} records do not end with a carriage return and line '
                'feed. Edit 10150 requires CR LF. Export the file again from your cost report software rather than '
                'saving it from an editor.', 'ecr-t6', where={'record': 'file'}, expected='CR LF', actual='LF only')
    seen = {}
    dupes = 0
    bad_type = long_rec = lower = bad_num = 0
    first_bad = {}
    for n, ln in enumerate(lines, 1):
        if n % 5000 == 0:
            clock.tick()
        r = ln.rstrip('\r')
        if not r.strip():
            continue
        t = r[0]
        if t not in '1234':
            bad_type += 1
            first_bad.setdefault('type', n)
            continue
        if len(r) > 60:
            long_rec += 1
            first_bad.setdefault('long', n)
        if t == '4':
            e.type4 += 1
            continue
        if t == '1':
            if n == 1:
                e.rec1 = r
            else:
                num = r[11:13].strip()
                e.type1[num] = r
                if num != '03' and r != r.upper():
                    lower += 1
                    first_bad.setdefault('lower', n)
            ident = r[:20]
        else:
            if r != r.upper():
                lower += 1
                first_bad.setdefault('lower', n)
            wk, line, sub, col, subcol = r[1:8], r[10:13], r[13:15], r[15:18], r[18:20]
            if not (line.strip().isdigit() and sub.strip().isdigit() and subcol.strip().isdigit()):
                bad_num += 1
                first_bad.setdefault('num', n)
            key = (wk, line.replace(' ', '0'), sub.replace(' ', '0'), col.replace(' ', '0'), subcol.replace(' ', '0'))
            val = r[20:]
            if t == '2':
                e.labels[key] = val.strip()
            else:
                e.data[key] = val.strip()
            ident = r[:20]
        if ident in seen:
            dupes += 1
            first_bad.setdefault('dupe', n)
        seen[ident] = n
    if bad_type:
        rep.add('error', 'ECR-10000', f'{bad_type} records start with a character other than 1, 2, 3 or 4 (first at '
                f'record {first_bad["type"]}).', 'ecr-t6', where={'record': first_bad['type']})
    if long_rec:
        rep.add('error', 'ECR-10050', f'{long_rec} records are longer than 60 characters (first at record '
                f'{first_bad["long"]}).', 'ecr-t6', where={'record': first_bad['long']}, expected='60 or fewer',
                actual='more than 60')
    if lower:
        rep.add('error', 'ECR-10100', f'{lower} records have lower case letters (first at record {first_bad["lower"]}). '
                'All alpha characters must be upper case.', 'ecr-t6', where={'record': first_bad['lower']})
    if bad_num:
        rep.add('error', 'ECR-10650', f'{bad_num} records have a line, subline or subcolumn number that is not numeric '
                f'(first at record {first_bad["num"]}).', 'ecr-t6', where={'record': first_bad['num']})
    if dupes:
        rep.add('error', 'ECR-10500', f'{dupes} record identifiers (positions 1 to 20) repeat (first at record '
                f'{first_bad["dupe"]}). Every record identifier must be unique.', 'ecr-t6',
                where={'record': first_bad['dupe']})
    if not e.data:
        raise InputError('The ECR file has no type 3 data records, so there is nothing to check.')
    return e


def check_record1(e, rep, start, end, today):
    """Table 1, type 1 record number 1, with edits 10200, 10300, 10350, 10450 and 11000. Returns facts for the
    report."""
    r = (e.rec1 or '').ljust(60)
    facts = {'ccn': None, 'specDate': None}
    if not e.rec1 or r[12] != '1':
        rep.add('error', 'ECR-10450', 'The first record is not type 1 record number 1. It must be the first record in '
                'the file.', 'ecr-t6', where={'record': 1})
        return facts
    ccn = r[16:22]
    facts['ccn'] = ccn if re.fullmatch(r'\d{6}', ccn) else None
    if not re.fullmatch(r'\d{6}', ccn):
        rep.add('error', 'ECR-10200', 'Record 1, positions 17 to 22: the CCN must be six numeric characters.', 'ecr-t6',
                where={'record': 1, 'positions': '17-22'})
    fyb, fye, created, spec = julian(r[22:29]), julian(r[29:36]), julian(r[44:51]), r[51:58]
    for label, pos, val in (('fiscal year beginning date', '23-29', fyb), ('fiscal year ending date', '30-36', fye),
                            ('creation date', '45-51', created), ('ECR specification date', '52-58', julian(spec))):
        if val is None:
            rep.add('error', 'ECR-10300', f'Record 1, positions {pos}: the {label} is not a possible Julian date '
                    '(YYYYDDD).', 'ecr-t6', where={'record': 1, 'positions': pos})
    if fyb and fye and fyb >= fye:
        rep.add('error', 'ECR-10350', 'Record 1: the fiscal year beginning date must be before the ending date.',
                'ecr-t6', where={'record': 1, 'positions': '23-36'}, expected='begin before end',
                actual=f'{fyb.isoformat()} to {fye.isoformat()}')
    if created and created > today:
        rep.add('error', 'ECR-11000', 'Record 1: the creation date is after today. Dates cannot be in the future.',
                'ecr-t6', where={'record': 1, 'positions': '45-51'}, actual=created.isoformat())
    if r[36] != '1':
        rep.add('error', 'ECR-MCR-VERSION', 'Record 1, position 37: the MCR version must be "1" for Form CMS-2552-10. '
                'This file is for a different form.', 'ecr-t1', where={'record': 1, 'positions': '37'},
                expected='1', actual=r[36].strip() or '(blank)')
    if r[40] not in 'PM':
        rep.add('warning', 'ECR-VENDOR-EQUIP', 'Record 1, position 41: vendor equipment should be P (PC) or M (main '
                'frame).', 'ecr-t1', where={'record': 1, 'positions': '41'})
    facts['specDate'] = spec if re.fullmatch(r'\d{7}', spec) else None
    if facts['specDate']:
        if spec not in APPROVED_SPEC_DATES:
            rep.add('warning', 'ECR-SPEC-DATE', 'Record 1, positions 52 to 58: the ECR specification date is not one '
                    'of the dates CMS lists as approved. Confirm your cost report software is current.', 'ecr-t1',
                    where={'record': 1, 'positions': '52-58'}, actual=spec)
        elif fye:
            in_effect = [s for s in APPROVED_SPEC_DATES if julian(s) <= fye]
            if in_effect and spec < max(in_effect) and spec[:4] != '2010':
                rep.add('warning', 'ECR-SPEC-DATE', 'Record 1, positions 52 to 58: the file was built to an older ECR '
                        'specification than the latest one in effect for this period end. Update your cost report '
                        'software before you file.', 'ecr-t1', where={'record': 1, 'positions': '52-58'},
                        expected=max(in_effect), actual=spec)
    if fyb and fye and (fyb != start or fye != end):
        rep.add('error', 'ECR-PERIOD', 'The period in the ECR file does not match the period you entered. Check the '
                'dates, or that this is the right file.', 'ecr-t1', where={'record': 1, 'positions': '23-36'},
                expected=f'{start.isoformat()} to {end.isoformat()}', actual=f'{fyb.isoformat()} to {fye.isoformat()}')
    facts['fyb'], facts['fye'], facts['created'] = fyb, fye, created
    return facts


def check_structure(e, rep, facts):
    if not e.type4:
        rep.add('warning', 'ECR-TYPE4', 'The file has no type 4 records. Approved vendor software ends every ECR file '
                'with three type 4 records (the encryption code and date and time stamp); a file without them was '
                'probably edited after it was saved.', 'ecr-t1', where={'record': 'end of file'},
                expected='3 type 4 records', actual='0')
    elif e.type4 != 3:
        rep.add('warning', 'ECR-TYPE4', 'The file should end with three type 4 records (1, 1.01 and 1.02).', 'ecr-t1',
                where={'record': 'end of file'}, expected='3', actual=str(e.type4))
    # S-2, Part I, line 20: the period, which must agree with record 1 (edits 10200S and 10250).
    b, x = e.text('S200001', '020', '001'), e.text('S200001', '020', '002')
    if not b or not x:
        rep.add('error', 'ECR-S2-PERIOD', 'Worksheet S-2, Part I, line 20, columns 1 and 2 (the cost reporting period) '
                'must be present.', 'ecr-t6', where={'worksheet': 'S-2, Part I', 'line': '20', 'column': '1 and 2'})
    else:
        db, dx = mdy(b), mdy(x)
        if not db or not dx or len(b) != 10 or len(x) != 10:
            rep.add('error', 'ECR-10250', 'Worksheet S-2, Part I, line 20: dates must be 10 characters, MM/DD/YYYY.',
                    'ecr-t6', where={'worksheet': 'S-2, Part I', 'line': '20', 'column': '1 and 2'})
        elif facts.get('fyb') and facts.get('fye') and (db != facts['fyb'] or dx != facts['fye']):
            rep.add('error', 'ECR-S2-PERIOD', 'Worksheet S-2, Part I, line 20 does not agree with the period in record '
                    '1.', 'ecr-t1', where={'worksheet': 'S-2, Part I', 'line': '20', 'column': '1 and 2'},
                    expected=f'{facts["fyb"].isoformat()} to {facts["fye"].isoformat()}',
                    actual=f'{db.isoformat()} to {dx.isoformat()}')
        elif db >= dx:
            rep.add('error', 'ECR-10200S', 'Worksheet S-2, Part I, line 20: the beginning date must precede the ending '
                    'date.', 'ecr-t6', where={'worksheet': 'S-2, Part I', 'line': '20'})
    # Edit 10800: every line used on Worksheets A, B Part I and C Part I has a type 2 record.
    a_labels = {(k[1], k[2]) for k in e.labels if k[0] == 'A000000'}
    missing = set()
    for wk in ('A000000', 'B000001', 'C000001'):
        for k in e.data:
            if k[0] == wk and k[1].isdigit() and int(k[1]) < 200 and int(k[1]) != 118 and (k[1], k[2]) not in a_labels:
                missing.add((wk, k[1], k[2]))
    if missing:
        wk, ln, sb = sorted(missing)[0]
        rep.add('error', 'ECR-10800', f'{len(missing)} worksheet lines with data have no type 2 cost center label '
                f'(first: {WS_NAMES.get(wk, wk)}, line {fmt_line(ln, sb)}).', 'ecr-t6',
                where={'worksheet': WS_NAMES.get(wk, wk), 'line': fmt_line(ln, sb)})


WS_NAMES = {'A000000': 'A', 'B000001': 'B, Part I', 'C000001': 'C, Part I', 'S100001': 'S-10, Part I',
            'S100002': 'S-10, Part II', 'S200001': 'S-2, Part I', 'S200002': 'S-2, Part II',
            'E00A18A': 'E, Part A (hospital)', 'E00A18B': 'E, Part B (hospital)', 'D00A185': 'D, Part V (hospital, '
            'title XVIII)'}


# ------------------------------------------------------------------ report
class Report:
    def __init__(self):
        self.findings = []
        self.checks = {}

    def add(self, sev, rule, message, source, *, where=None, expected=None, actual=None, group=None):
        f = {'severity': sev, 'ruleId': rule, 'message': message, 'source': SOURCES.get(source, source)}
        if where:
            f.update({k: (str(v) if v is not None else None) for k, v in where.items()})
        if expected is not None:
            f['expected'] = expected
        if actual is not None:
            f['actual'] = actual
        f['group'] = group or GROUP_OF.get(rule.split('-')[0], 'ecrFormat')
        self.findings.append(f)
        return f

    def mark(self, check, status):
        order = {'fail': 4, 'warn': 3, 'pass': 1, 'na': 0}
        if check not in self.checks or order[status] > order[self.checks[check]]:
            self.checks[check] = status


GROUP_OF = {'ECR': 'ecrFormat', 'TIE': 'crossTies', 'S10': 's10', 'LIST': 'listings', 'BD': 'listings',
            'CC': 'listings', 'TBD': 'listings', 'DEADLINE': 'deadline'}


def tie(rep, rule, ok_count, *, worksheet, line, column, expected, actual, message, source, tol=TOL, ratio=False):
    """One recomputed tie. Returns True when it holds."""
    ok_count[rule] = ok_count.get(rule, 0) + 1
    if abs(expected - actual) <= (RATIO_TOL if ratio else tol):
        return True
    rep.add('error', rule, message, source, where={'worksheet': worksheet, 'line': line, 'column': column},
            expected=rnd(expected, 6 if ratio else 2), actual=rnd(actual, 6 if ratio else 2))
    return False


# ------------------------------------------------------------------ worksheet ties
def L(s):
    """'27.01' -> ('027', '01')."""
    a, _, b = str(s).partition('.')
    return a.zfill(3), (b or '00').ljust(2, '0')[:2]


def C(s):
    return str(s).zfill(3)


def val(e, wk, line, col):
    ln, sb = L(line)
    return e.num(wk, ln, C(col), sb)


def run_ties(e, rep, ok, clock):
    """Worksheets A, B, C, D and E: each transfer and total recomputed from the filed amounts."""
    a7 = e.column('A000000', '007')
    b0 = e.column('B000001', '000')
    if a7 and b0:
        for key in sorted(set(a7) | set(b0)):
            if int(key[0]) >= 200:
                continue
            tie(rep, 'TIE-A-B', ok, worksheet='B, Part I', line=fmt_line(*key), column='0',
                expected=a7.get(key, 0.0), actual=b0.get(key, 0.0), source='wb',
                message='Worksheet B, Part I, column 0 must carry the total direct cost from Worksheet A, column 7, '
                        'for the same line.')
    elif a7 or b0:
        rep.add('error', 'TIE-A-B', 'Worksheet A, column 7, and Worksheet B, Part I, column 0, must both be present.',
                'wb', where={'worksheet': 'B, Part I', 'line': None, 'column': '0'})
    if b0:
        tie(rep, 'TIE-B-TOTAL', ok, worksheet='B, Part I', line='202', column='24',
            expected=val(e, 'B000001', '202', '0'), actual=val(e, 'B000001', '202', '24'), source='wb',
            message='Worksheet B, Part I: the cost subtotal in column 24, line 202, must equal the total cost in '
                    'column 0, line 202. Cost was gained or lost in the step-down.')
    b26 = e.column('B000001', '026')
    c1 = e.column('C000001', '001')
    if b26 and c1:
        for key in sorted(set(b26) | set(c1)):
            n = int(key[0])
            if not 30 <= n <= 117 or n == 92:
                continue   # line 92 comes from Worksheet D-1, Part IV
            exp = b26.get(key, 0.0)
            if exp < 0:
                exp = 0.0   # credit balances are not carried forward
            tie(rep, 'TIE-B-C', ok, worksheet='C, Part I', line=fmt_line(*key), column='1',
                expected=exp, actual=c1.get(key, 0.0), source='wb',
                message='Worksheet C, Part I, column 1 must carry the total cost from Worksheet B, Part I, column 26, '
                        'for the same cost center.')
    clock.tick()
    if e.has('C000001'):
        for col in ('001', '002', '003', '004', '005', '006', '007', '008'):
            cc = e.column('C000001', col)
            if not cc:
                continue
            parts = sum(v for (ln, sb), v in cc.items() if 30 <= int(ln) <= 199
                        and not (col in ('006', '007', '008') and int(ln) == 61))
            tie(rep, 'TIE-C-FOOT', ok, worksheet='C, Part I', line='200', column=fmt_col(col),
                expected=parts, actual=cc.get(('200', '00'), 0.0), source='wc',
                message='Worksheet C, Part I, line 200 must be the sum of lines 30 through 199 (for charges, without '
                        'line 61, which is already in line 60).')
            tie(rep, 'TIE-C-202', ok, worksheet='C, Part I', line='202', column=fmt_col(col),
                expected=cc.get(('200', '00'), 0.0) - cc.get(('201', '00'), 0.0), actual=cc.get(('202', '00'), 0.0),
                source='wc', message='Worksheet C, Part I, line 202 must be line 200 less the observation bed cost on '
                                     'line 201.')
        c6, c7, c8 = e.column('C000001', '006'), e.column('C000001', '007'), e.column('C000001', '008')
        for key in sorted(set(c6) | set(c7) | set(c8)):
            tie(rep, 'TIE-C-CHARGES', ok, worksheet='C, Part I', line=fmt_line(*key), column='8',
                expected=c6.get(key, 0.0) + c7.get(key, 0.0), actual=c8.get(key, 0.0), source='ecr-t6',
                message='Worksheet C, Part I, column 8 (total charges) must equal inpatient charges (column 6) plus '
                        'outpatient charges (column 7). A total must equal the sum of its parts (edit 10950).')
    if e.has('E00A18B') and e.has('D00A185'):
        tie(rep, 'TIE-D-E', ok, worksheet='E, Part B (hospital)', line='1', column='1',
            expected=val(e, 'D00A185', '202', '6') + val(e, 'D00A185', '202', '7'),
            actual=val(e, 'E00A18B', '1', '1'), source='we',
            message='Worksheet E, Part B, line 1 must carry the title XVIII Part B cost from Worksheet D, Part V, '
                    'line 202, columns 6 and 7.')
    for wk, bd, red, dual, name in (('E00A18A', '64', '65', '66', 'E, Part A (hospital)'),
                                    ('E00A18B', '34', '35', '36', 'E, Part B (hospital)')):
        ok['TIE-E-DUAL'] = ok.get('TIE-E-DUAL', 0) + 1
        if val(e, wk, dual, '1') > max(val(e, wk, bd, '1'), 0.0) + TOL:
            rep.add('error', 'TIE-E-DUAL', f'Worksheet {name.split(" (")[0]}, line {dual} (dual eligible bad debts) is '
                    f'more than line {bd} (all allowable bad debts). Dual eligible bad debts are also reported on line '
                    f'{bd}, so they cannot exceed it.', 'we', where={'worksheet': name, 'line': dual, 'column': '1'},
                    expected=f'at most {rnd(val(e, wk, bd, "1"))}', actual=rnd(val(e, wk, dual, '1')))
        if e.has(wk) and (val(e, wk, bd, '1') or val(e, wk, red, '1')):
            tie(rep, 'TIE-E-BADDEBT', ok, worksheet=name, line=red, column='1',
                expected=round(val(e, wk, bd, '1') * 0.65), actual=val(e, wk, red, '1'), source='we',
                message=f'Worksheet {name.split(" (")[0]}, line {red} must be 65 percent of the allowable bad debts on '
                        f'line {bd} (the 35 percent reduction of 42 CFR 413.89(h)).')


# Worksheet S-10, Part I, lines 27.01 and 27: the sources the line instructions name (section 4012.1).
S10_2701 = [(r'^E0..18A$', '64', '1'), (r'^E0..18B$', '34', '1'), (r'^E2..180$', '17', '1'), (r'^E2..180$', '17', '2'),
            (r'^E3..181$', '11', '1'), (r'^E3..182$', '23', '1'), (r'^E3..183$', '24', '1'), (r'^E3..184$', '14', '1'),
            (r'^E3..185$', '25', '1'), (r'^E3..186$', '8', '1'), (r'^H4..181$', '27', '2'), (r'^I500000$', '5.05', '2'),
            (r'^J3..180$', '21', '1'), (r'^M3..180$', '23', '2'), (r'^N4.....$', '9', '1')]
S10_27 = [(r'^E0..18A$', '65', '1'), (r'^E0..18B$', '35', '1'), (r'^E2..180$', '17.01', '1'),
          (r'^E2..180$', '17.01', '2'), (r'^E3..181$', '12', '1'), (r'^E3..182$', '24', '1'), (r'^E3..183$', '25', '1'),
          (r'^E3..184$', '15', '1'), (r'^E3..185$', '26', '1'), (r'^E3..186$', '10', '1'), (r'^I500000$', '11', '1'),
          (r'^H4..181$', '27.01', '2'), (r'^J3..180$', '22', '1'), (r'^M3..180$', '23.01', '2'),
          (r'^N4.....$', '10', '1')]
PART2_EXCLUDED = (40, 41, 42, 44, 45, 46, 88, 89, 94, 99, 101, 115, 116)


def sum_sources(e, spec):
    tot = 0.0
    for pat, line, col in spec:
        ln, sb = L(line)
        t, _ = e.sum_matching(pat, ln, C(col), sb)
        tot += t
    return tot


def run_s10(e, rep, ok):
    """Worksheet S-10 recomputed line by line (section 4012.1) plus the S-10 edits of Table 6."""
    if not e.column_any('S100001'):
        return False
    W = 'S-10, Part I'

    def s(line, col='1', wk='S100001'):
        return val(e, wk, line, col)

    def yn(line, wk='S100001'):
        ln, sb = L(line)
        return e.text(wk, ln, '001', sb).upper()

    def t(rule, line, col, exp, act, msg, ratio=False, wk=W):
        return tie(rep, rule, ok, worksheet=wk, line=line, column=col, expected=exp, actual=act, source='s10',
                   message=msg, ratio=ratio)

    c3, c8 = val(e, 'C000001', '202', '3'), val(e, 'C000001', '202', '8')
    if c8:
        t('S10-CCR', '1', '1', round(c3 / c8, 6), s('1'), 'The cost-to-charge ratio on line 1 must be Worksheet C, Part '
          'I, line 202, column 3 divided by column 8.', ratio=True)
    l1 = s('1')
    t('S10-LINE', '7', '1', l1 * s('6'), s('7'), 'Line 7 (Medicaid cost) must be line 1 times line 6.')
    t('S10-LINE', '8', '1', max(0.0, s('7') - s('2') - s('5')), s('8'), 'Line 8 must be line 7 less lines 2 and 5, '
      'and not below zero.')
    t('S10-LINE', '11', '1', l1 * s('10'), s('11'), 'Line 11 (stand-alone CHIP cost) must be line 1 times line 10.')
    t('S10-LINE', '12', '1', max(0.0, s('11') - s('9')), s('12'), 'Line 12 must be line 11 less line 9, and not '
      'below zero.')
    t('S10-LINE', '15', '1', l1 * s('14'), s('15'), 'Line 15 must be line 1 times line 14.')
    t('S10-LINE', '16', '1', max(0.0, s('15') - s('13')), s('16'), 'Line 16 must be line 15 less line 13, and not '
      'below zero.')
    t('S10-LINE', '19', '1', s('8') + s('12') + s('16'), s('19'), 'Line 19 must be the sum of lines 8, 12 and 16.')
    t('S10-LINE', '20', '3', s('20', '1') + s('20', '2'), s('20', '3'), 'Line 20, column 3 must be the sum of columns '
      '1 and 2.')
    t('S10-LINE', '21', '1', s('20', '1') * l1, s('21', '1'), 'Line 21, column 1 must be line 20, column 1 times '
      'the ratio on line 1.')
    ccr_part = s('25') + s('25.01')
    t('S10-LINE', '21', '2', (s('20', '2') - ccr_part) + ccr_part * l1, s('21', '2'), 'Line 21, column 2 must be '
      'line 20, column 2 less lines 25 and 25.01, plus lines 25 and 25.01 times the ratio on line 1.')
    t('S10-LINE', '21', '3', s('21', '1') + s('21', '2'), s('21', '3'), 'Line 21, column 3 must be the sum of '
      'columns 1 and 2.')
    for col in ('1', '2'):
        t('S10-LINE', '23', col, max(0.0, s('21', col) - s('22', col)), s('23', col), f'Line 23, column {col} must be '
          f'line 21 less line 22, and zero when line 22 is larger (edit 14010S).')
    t('S10-LINE', '23', '3', s('23', '1') + s('23', '2'), s('23', '3'), 'Line 23, column 3 must be the sum of '
      'columns 1 and 2.')
    t('S10-E-TIE', '27.01', '1', sum_sources(e, S10_2701), s('27.01'), 'Line 27.01 (Medicare allowable bad debts) must '
      'be the sum of the allowable bad debt lines on Worksheets E, Part A, line 64, E, Part B, line 34, and the other '
      'worksheets the line instructions list.')
    t('S10-E-TIE', '27', '1', sum_sources(e, S10_27), s('27'), 'Line 27 (Medicare reimbursable bad debts) must be the '
      'sum of Worksheets E, Part A, line 65, E, Part B, line 35, and the other worksheets the line instructions list.')
    t('S10-LINE', '28', '1', s('26') - s('27.01'), s('28'), 'Line 28 (non-Medicare bad debt) must be line 26 less '
      'line 27.01.')
    t('S10-LINE', '29', '1', s('28') * l1 + (s('27.01') - s('27')), s('29'), 'Line 29 must be line 28 times the ratio '
      'on line 1, plus line 27.01 less line 27 (the nonreimbursable Medicare bad debt, not reduced by the ratio).')
    t('S10-LINE', '30', '1', s('23', '3') + s('29'), s('30'), 'Line 30 (cost of uncompensated care) must be line 23, '
      'column 3 plus line 29.')
    t('S10-LINE', '31', '1', s('19') + s('30'), s('31'), 'Line 31 (cost of unreimbursed and uncompensated care) must '
      'be line 19 plus line 30.')

    def edit(rule, cond, msg, line, col='1'):
        ok[rule] = ok.get(rule, 0) + 1
        if not cond:
            rep.add('error', rule, msg, 'ecr-t6', where={'worksheet': W, 'line': line, 'column': col})

    if yn('3') == 'Y' and yn('4') == 'N':
        edit('S10-14000S', s('5') != 0, 'Line 3 is Y and line 4 is N, so line 5 (DSH and supplemental payments not '
             'in line 2) must not be zero (edit 14000S).', '5')
    c200_8 = val(e, 'C000001', '200', '8')
    if c200_8 and yn('115', 'S200001') != 'Y':
        ok['S10-14005S'] = ok.get('S10-14005S', 0) + 1
        if not s('20', '3') < c200_8:
            rep.add('error', 'S10-14005S', 'Line 20, column 3 (charity care charges) must be less than total charges on '
                    'Worksheet C, Part I, line 200, column 8 (edit 14005S).', 'ecr-t6',
                    where={'worksheet': W, 'line': '20', 'column': '3'}, expected=f'less than {rnd(c200_8)}',
                    actual=rnd(s('20', '3')))
    edit('S10-14006S', s('20', '2') + TOL >= s('25'), 'Line 20, column 2 must be at least line 25 (edit 14006S).', '25')
    if yn('24') not in ('Y', 'N'):
        edit('S10-14013S', False, 'Line 24 must be answered Y or N (edit 14013S).', '24')
    else:
        edit('S10-14013S', (yn('24') == 'Y') == (s('25') > 0), 'Line 24 must be Y exactly when line 25 is greater '
             'than zero (edit 14013S).', '24')
    if s('27.01') > 0:
        edit('S10-14015S', s('26') + TOL >= s('27.01') and s('27') < s('27.01'), 'With line 27.01 above zero, line 26 '
             'must be at least line 27.01 and line 27 must be less than line 27.01 (edit 14015S).', '27.01')
    if s('26') == 0:
        edit('S10-14020S', s('27.01') == 0, 'Line 26 is zero, so line 27.01 must be zero (edit 14020S).', '27.01')

    # Part II, the hospital CCN only (not completed by a CAH).
    if e.has('S100002'):
        P = 'S-10, Part II'

        def p(line, col='1'):
            return s(line, col, 'S100002')

        c3c, c8c = e.column('C000001', '003'), e.column('C000001', '008')
        ex3 = sum(v for (ln, sb), v in c3c.items() if int(ln) in PART2_EXCLUDED)
        ex8 = sum(v for (ln, sb), v in c8c.items() if int(ln) in PART2_EXCLUDED)
        if c8 - ex8:
            t('S10-CCR', '1', '1', round((c3 - ex3) / (c8 - ex8), 6), p('1'), 'Part II, line 1 must be the Worksheet C '
              'ratio without the excluded units (lines 40, 41, 42, 44, 45, 46, 88, 89, 94, 99, 101, 115 and 116, and '
              'their subscripts).', ratio=True, wk=P)
        pl1 = p('1')
        t('S10-LINE', '21', '1', p('20', '1') * pl1, p('21', '1'), 'Part II, line 21, column 1 must be line 20, column '
          '1 times the ratio on line 1.', wk=P)
        pc = p('25') + p('25.01')
        t('S10-LINE', '21', '2', (p('20', '2') - pc) + pc * pl1, p('21', '2'), 'Part II, line 21, column 2 must be line '
          '20, column 2 less lines 25 and 25.01, plus lines 25 and 25.01 times the ratio on line 1.', wk=P)
        for col in ('1', '2'):
            t('S10-LINE', '23', col, max(0.0, p('21', col) - p('22', col)), p('23', col), f'Part II, line 23, column '
              f'{col} must be line 21 less line 22, and zero when line 22 is larger (edit 14011S).', wk=P)
        ok['S10-PART2-SUBSET'] = ok.get('S10-PART2-SUBSET', 0) + 1
        if p('26') > s('26') + TOL:
            rep.add('error', 'S10-PART2-SUBSET', 'Part II, line 26 (hospital CCN bad debts) is more than Part I, line 26 '
                    '(the whole complex). Part II is a subset of Part I (section 4012.2).', 's10',
                    where={'worksheet': P, 'line': '26', 'column': '1'}, expected=f'at most {rnd(s("26"))}',
                    actual=rnd(p('26')))
        for col in ('1', '2', '3'):
            ok['S10-14007S'] = ok.get('S10-14007S', 0) + 1
            if p('20', col) > s('20', col) + TOL:
                rep.add('error', 'S10-14007S', f'Part II, line 20, column {col} (hospital CCN) cannot exceed Part I, '
                        f'line 20, column {col} (the whole complex) (edit 14007S).', 'ecr-t6',
                        where={'worksheet': P, 'line': '20', 'column': col}, expected=f'at most {rnd(s("20", col))}',
                        actual=rnd(p('20', col)))
    return True


# ------------------------------------------------------------------ spreadsheets (standard library only)
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'pr': 'http://schemas.openxmlformats.org/package/2006/relationships'}
CELL_RE = re.compile(r'^([A-Z]+)(\d+)$')


def col_index(letters):
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n


def read_xlsx(b, clock):
    """Return [(sheet name, {(row, col): value})] with values as str or float. Formulas give their cached value."""
    try:
        z = zipfile.ZipFile(io.BytesIO(b))
        wb = ET.fromstring(z.read('xl/workbook.xml'))
        rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    except (zipfile.BadZipFile, KeyError, ET.ParseError):
        raise InputError('A spreadsheet in the package could not be opened. Save it again as an Excel workbook '
                         '(.xlsx).') from None
    target = {r.get('Id'): r.get('Target') for r in rels.findall('pr:Relationship', NS)}
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
            shared.append(''.join(x.text or '' for x in si.iter('{%s}t' % NS['m'])))
    out = []
    for sh in wb.findall('m:sheets/m:sheet', NS):
        rid = sh.get('{%s}id' % NS['r'])
        path = target.get(rid, '')
        path = path.lstrip('/') if path.startswith('/') else 'xl/' + path
        try:
            root = ET.fromstring(z.read(path))
        except (KeyError, ET.ParseError):
            continue
        grid = {}
        rows = 0
        for row in root.iter('{%s}row' % NS['m']):
            rows += 1
            if rows % 2000 == 0:
                clock.tick()
            if rows > MAX_ROWS:
                raise InputError(f'A listing has more than {MAX_ROWS} rows. Split it by CCN or by inpatient and '
                                 'outpatient, as the exhibits allow.')
            for c in row.findall('m:c', NS):
                m = CELL_RE.match(c.get('r') or '')
                if not m:
                    continue
                t = c.get('t')
                v = c.find('m:v', NS)
                if t == 's' and v is not None:
                    try:
                        value = shared[int(v.text)]
                    except (ValueError, IndexError):
                        value = ''
                elif t == 'inlineStr':
                    value = ''.join(x.text or '' for x in c.iter('{%s}t' % NS['m']))
                elif v is None or v.text is None:
                    continue
                elif t in ('str', 'e'):
                    value = v.text
                elif t == 'b':
                    value = 'TRUE' if v.text == '1' else 'FALSE'
                else:
                    try:
                        value = float(v.text)
                    except ValueError:
                        value = v.text
                if value == '':
                    continue
                grid[(int(m.group(2)), col_index(m.group(1)))] = value
        out.append((sh.get('name') or '', grid))
    return out


def read_csv(b):
    try:
        text = b.decode('utf-8-sig')
    except UnicodeDecodeError:
        text = b.decode('latin-1')
    grid = {}
    for r, row in enumerate(csv.reader(io.StringIO(text)), 1):
        if r > MAX_ROWS:
            raise InputError(f'A listing has more than {MAX_ROWS} rows. Split it by CCN or by inpatient and '
                             'outpatient, as the exhibits allow.')
        for c, v in enumerate(row, 1):
            if v.strip() != '':
                grid[(r, c)] = v.strip()
    return [('csv', grid)]


# ------------------------------------------------------------------ listings
EXHIBITS = {
    '2A': {'id': 'MEDICARE BAD DEBT LISTING', 'name': 'Exhibit 2A (Medicare bad debts)', 'source': 'ex2a'},
    '3B': {'id': 'CHARITY CARE CHARGES', 'name': 'Exhibit 3B (charity care)', 'source': 'ex3b'},
    '3C': {'id': 'TOTAL BAD DEBT', 'name': 'Exhibit 3C (total bad debts)', 'source': 'ex3c'},
}
# column number -> field
COLS = {
    '2A': {'1': 'last', '2': 'first', '3': 'from', '4': 'to', '5': 'acct', '6': 'mbi', '7': 'medicaid', '8': 'indigent',
           '9': 'ra', '10': 'mcaid_ra', '11': 'sec_ra', '12': 'bene_resp', '13': 'first_bill', '14': 'ar_wo',
           '15A': 'agency', '15': 'agency_ret', '16': 'ceased', '17': 'mcr_wo', '18': 'recovery', '19': 'recovery_fye',
           '20': 'deductible', '21': 'coinsurance', '22': 'paid_prior', '23': 'allowable', '24': 'comments'},
    '3B': {'1': 'last', '2': 'first', '3': 'from', '4': 'to', '5': 'acct', '6': 'status', '7': 'primary',
           '8': 'secondary', '9': 'charges', '10': 'phys', '11': 'ded_coins', '12': 'third_party', '13': 'contractual',
           '14': 'other_nonallow', '15': 'patient_paid', '16': 'bad_debt', '17': 'uninsured_disc', '18': 'noncovered',
           '19': 'other_charity', '20': 'charity_total', '21': 'wo', '22': 'trans_codes'},
    '3C': {'1': 'last', '2': 'first', '3': 'from', '4': 'to', '5': 'acct', '6': 'status', '7': 'primary',
           '8': 'secondary', '9': 'ipop', '10': 'charges', '11': 'phys', '12': 'patient_paid', '13': 'third_party',
           '14': 'charity', '15': 'contractual', '16': 'wo', '17': 'bad_debt'},
}
FIELD_COL = {ex: {f: n for n, f in cols.items()} for ex, cols in COLS.items()}
IDENTIFYING = {'2A': ('last', 'first', 'mbi', 'medicaid'), '3B': ('last', 'first'), '3C': ('last', 'first')}
REDACTED = re.compile(r'^(X+|\*+|-+|REDACTED|REMOVED|NONE|N/?A|BLANK)$', re.I)
DATE_FIELDS = {'from', 'to', 'ra', 'mcaid_ra', 'sec_ra', 'first_bill', 'ar_wo', 'agency_ret', 'ceased', 'mcr_wo',
               'recovery_fye', 'wo'}
AMOUNT_FIELDS = {'bene_resp', 'recovery', 'deductible', 'coinsurance', 'paid_prior', 'allowable', 'charges', 'phys', 'ded_coins',
                 'third_party', 'contractual', 'other_nonallow', 'patient_paid', 'bad_debt', 'uninsured_disc',
                 'noncovered', 'other_charity', 'charity_total', 'charity'}
HEADER_LABELS = {
    'provider name': 'name', 'provider number (ccn)': 'ccn', 'hospital ccn': 'ccn', 'component ccn': 'component',
    'subprovider ccn': 'component', 'fyb': 'fyb', 'fye': 'fye', 'crp beginning date': 'fyb',
    'crp ending date': 'fye', 'inpatient / outpatient': 'ipop', 'prepared by': 'prepared_by',
    'date prepared': 'date_prepared', 'total column 23': 'total', 'total dual eligible': 'total_dual',
    'uninsured column 20': 'total_uninsured', 'insured column 20': 'total_insured', 'total column 17': 'total',
}


def norm(s):
    return re.sub(r'\s+', ' ', str(s)).strip().upper()


def as_date(v):
    if isinstance(v, float):
        if 1 <= v < 2958466:
            return dt.date(1899, 12, 30) + dt.timedelta(days=int(v))
        return None
    s = str(v).strip()
    d = mdy(s)
    if d:
        return d
    m = re.fullmatch(r'(\d{4})-(\d{2})-(\d{2})(?:[ T]00:00:00)?', s)
    if m:
        try:
            return dt.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    return None


def as_amount(v):
    if isinstance(v, float):
        return v
    s = str(v).strip().replace(',', '').replace('$', '')
    neg = s.startswith('(') and s.endswith(')')
    s = s.strip('()')
    try:
        x = float(s)
    except ValueError:
        return None
    return -x if neg else x


class Listing:
    def __init__(self, exhibit, file, tab):
        self.exhibit, self.file, self.tab = exhibit, file, tab
        self.header = {}
        self.rows = []      # dicts with '_row'
        self.prior = False


def find_listings(name, b, clock):
    low = name.lower()
    if b[:2] == b'PK' or low.endswith(('.xlsx', '.xlsm')):
        sheets = read_xlsx(b, clock)
    elif low.endswith(('.csv', '.txt')):
        sheets = read_csv(b)
    elif low.endswith('.xls'):
        raise InputError('A listing is an .xls file (Excel 97 to 2003). MCReF takes .xlsx: open it in Excel, choose '
                         'Save As, pick Excel Workbook (.xlsx), and add that to the package.')
    else:
        return []
    found = []
    for tab, grid in sheets:
        a1, b1 = norm(grid.get((1, 1), '')), norm(grid.get((1, 2), ''))
        if a1 != 'SUPPORTING EXHIBIT':
            continue
        ex = next((k for k, v in EXHIBITS.items() if b1 == v['id'] or b1.startswith(v['id'][:12])), None)
        if not ex:
            continue
        found.append(parse_listing(ex, name, tab, grid))
    return found


def parse_listing(ex, file, tab, grid):
    lst = Listing(ex, file, tab)
    max_row = max((r for r, _ in grid), default=0)
    num_row = None
    for r in range(2, min(max_row, 30) + 1):
        nums = [norm(grid.get((r, c), '')).replace('.0', '') for c in range(1, 30)]
        if nums[:4] == ['1', '2', '3', '4']:
            num_row = r
            break
        if r < 13:
            lab = norm(grid.get((r, 1), '')).rstrip(':').lower()
            if lab in HEADER_LABELS and (r, 2) in grid:
                lst.header[HEADER_LABELS[lab]] = grid[(r, 2)]
    if num_row is None:
        raise InputError(f'{EXHIBITS[ex]["name"]} in {file} has no column number row (1, 2, 3 and so on under the '
                         'column labels). Use the CMS template layout.')
    colmap = {}
    for c in range(1, 40):
        key = norm(grid.get((num_row, c), '')).replace('.0', '')
        if key in COLS[ex]:
            colmap[COLS[ex][key]] = c
    lst.colmap = colmap
    for r in range(num_row + 1, max_row + 1):
        row = {f: grid[(r, c)] for f, c in colmap.items() if (r, c) in grid}
        if not row:
            continue
        row['_row'] = r
        lst.rows.append(row)
    return lst


def privacy_guard(lst):
    """The Terms do not allow patient identifiers. Names, MBI and Medicaid numbers must be blanked before upload."""
    for row in lst.rows:
        for f in IDENTIFYING[lst.exhibit]:
            v = str(row.get(f, '')).strip()
            if not v or REDACTED.match(v) or (f == 'medicaid' and v.upper() == 'Y'):
                continue
            col = FIELD_COL[lst.exhibit][f]
            raise InputError(f'{EXHIBITS[lst.exhibit]["name"]} in {lst.file}, row {row["_row"]}, column {col} has a '
                             'patient identifier. SpreadRun does not accept patient names, MBIs or Medicaid numbers. '
                             'Blank columns 1 and 2 (and, on Exhibit 2A, column 6; put Y in column 7 for a dual '
                             'eligible beneficiary), keep everything else, and run it again. Nothing was charged.')


def clean_rows(lst, rep):
    """Convert dates and amounts; report fields that are not valid for their type."""
    bad = Counter()
    first = {}
    for row in lst.rows:
        for f in list(row):
            if f in DATE_FIELDS:
                if lst.exhibit == '2A' and f in ('first_bill',) and norm(row[f]) == 'QMB':
                    row[f] = 'QMB'
                    continue
                if lst.exhibit == '2A' and f == 'mcaid_ra' and norm(row[f]) == 'AD':
                    row[f] = 'AD'
                    continue
                d = as_date(row[f])
                if d is None:
                    bad[f] += 1
                    first.setdefault(f, row['_row'])
                row[f] = d
            elif f in AMOUNT_FIELDS:
                if lst.exhibit == '2A' and f == 'bene_resp' and norm(row[f]) == 'QMB':
                    continue
                a = as_amount(row[f])
                if a is None:
                    bad[f] += 1
                    first.setdefault(f, row['_row'])
                row[f] = a
    for f, n in bad.items():
        rep.add('error', 'LIST-FORMAT', f'{n} {"entry is" if n == 1 else "entries are"} not a valid '
                f'{"date (MM/DD/YYYY)" if f in DATE_FIELDS else "dollar amount"} (first at row {first[f]}).',
                EXHIBITS[lst.exhibit]['source'],
                where={'exhibit': lst.exhibit, 'file': lst.file, 'row': first[f], 'column': FIELD_COL[lst.exhibit][f]})


def amt(row, f):
    v = row.get(f)
    return v if isinstance(v, float) else 0.0


def lf(rep, sev, rule, lst, row, field, message, *, expected=None, actual=None, source=None):
    rep.add(sev, rule, message, source or EXHIBITS[lst.exhibit]['source'],
            where={'exhibit': lst.exhibit, 'file': lst.file, 'row': row['_row'] if row else None,
                   'column': FIELD_COL[lst.exhibit].get(field) if field else None},
            expected=expected, actual=actual)


def header_check(lst, rep, ccn, start, end):
    """Header cells: CCN, period and (2A) inpatient or outpatient. A listing for an earlier period is a prior-year
    listing, used only to look for accounts claimed again."""
    h = lst.header
    fyb, fye = as_date(h.get('fyb', '')), as_date(h.get('fye', ''))
    if fye and fye < start:
        lst.prior = True
        return
    src = EXHIBITS[lst.exhibit]['source']
    if not fyb or not fye:
        rep.add('error', 'LIST-HEADER', 'The FYB and FYE header cells must hold the cost reporting period dates.', src,
                where={'exhibit': lst.exhibit, 'file': lst.file, 'row': 'header', 'column': 'B6 and B7'})
    elif fyb != start or fye != end:
        rep.add('error', 'LIST-HEADER', 'The listing period does not match the cost reporting period.', src,
                where={'exhibit': lst.exhibit, 'file': lst.file, 'row': 'header', 'column': 'FYB and FYE'},
                expected=f'{start.isoformat()} to {end.isoformat()}', actual=f'{fyb.isoformat()} to {fye.isoformat()}')
    lccn = str(h.get('ccn', '')).strip().replace('.0', '')
    if ccn and lccn and lccn.zfill(6) != ccn:
        rep.add('error', 'LIST-HEADER', 'The listing CCN does not match the CCN in the ECR file.', src,
                where={'exhibit': lst.exhibit, 'file': lst.file, 'row': 'header', 'column': 'B4'},
                expected=ccn, actual=lccn)
    elif not lccn:
        rep.add('error', 'LIST-HEADER', 'The Provider Number (CCN) header cell is empty.', src,
                where={'exhibit': lst.exhibit, 'file': lst.file, 'row': 'header', 'column': 'B4'})
    if lst.exhibit == '2A' and norm(h.get('ipop', '')) not in ('IP', 'OP'):
        rep.add('error', 'LIST-HEADER', 'The Inpatient / Outpatient header cell must be IP or OP. Use one listing for '
                'inpatient and another for outpatient.', src,
                where={'exhibit': lst.exhibit, 'file': lst.file, 'row': 'header', 'column': 'B8'})


def hospital_ccn(lst):
    return not str(lst.header.get('component', '')).strip()


def in_period(d, start, end):
    return isinstance(d, dt.date) and start <= d <= end


def acct_key(row):
    a = re.sub(r'\s+', '', str(row.get('acct', '') or '')).upper()
    a = a[:-2] if a.endswith('.0') else a
    return a


def check_duplicates(lists, rep, rows_of, ex):
    seen = {}
    for lst in lists:
        for row in rows_of(lst):
            k = (acct_key(row), row.get('from'), lst.header.get('ipop', '') if ex == '2A' else '')
            if not k[0]:
                continue
            if k in seen:
                prev_lst, prev = seen[k]
                lf(rep, 'error', f'{ex_rule(ex)}-DUPLICATE', lst, row, 'acct',
                   f'Account {mask(k[0])} is listed twice for the same dates of service (rows {prev["_row"]} and '
                   f'{row["_row"]}{"" if prev_lst is lst else ", in different files"}). Claim each account once.',
                   actual=f'account {mask(k[0])}')
            else:
                seen[k] = (lst, row)


def ex_rule(ex):
    return {'2A': 'BD', '3B': 'CC', '3C': 'TBD'}[ex]


def check_prior(lists, priors, rep, rows_of, ex, ok):
    prior_keys = {}
    for p in priors:
        for row in p.rows:
            k = acct_key(row)
            if k:
                prior_keys.setdefault((k, row.get('from')), p)
    if not priors:
        return False
    for lst in lists:
        for row in rows_of(lst):
            ok[f'{ex_rule(ex)}-PRIOR'] = ok.get(f'{ex_rule(ex)}-PRIOR', 0) + 1
            k = (acct_key(row), row.get('from'))
            if k[0] and k in prior_keys:
                fye = as_date(prior_keys[k].header.get('fye', ''))
                lf(rep, 'error', f'{ex_rule(ex)}-PRIOR', lst, row, 'acct', f'Account {mask(k[0])}, same dates of '
                   f'service, was already listed for the period ending {iso(fye) or "earlier"}. An account is claimed '
                   'once, in the period it is written off.', actual=f'account {mask(k[0])}',
                   source='413.89' if ex == '2A' else 's10')
    return True


def writeoff_row(lst, row):
    """Exhibit 2A: a row is a current write-off unless column 19 names an earlier period (a recovery only row)."""
    rf = row.get('recovery_fye')
    fye = as_date(lst.header.get('fye', ''))
    return not (isinstance(rf, dt.date) and fye and rf < fye)


def check_2a(lists, rep, start, end, ok):
    for lst in lists:
        for row in lst.rows:
            def need(f, why=''):
                if row.get(f) in (None, ''):
                    lf(rep, 'error', 'BD-REQUIRED', lst, row, f, f'Column {FIELD_COL["2A"][f]} is required{why}.')
                    return False
                return True
            need('acct')
            need('from')
            need('to')
            need('allowable')
            if isinstance(row.get('from'), dt.date) and isinstance(row.get('to'), dt.date) and row['to'] < row['from']:
                lf(rep, 'error', 'BD-DATES', lst, row, 'to', 'Date of service to is before date of service from.')
            if not writeoff_row(lst, row):
                ok['BD-RECOVERY'] = ok.get('BD-RECOVERY', 0) + 1
                if abs(amt(row, 'allowable') + amt(row, 'recovery')) > 0.005:
                    lf(rep, 'warning', 'BD-RECOVERY', lst, row, 'allowable', 'A recovery for an earlier period goes in '
                       'column 23 as a negative amount equal to column 18.', expected=rnd(-amt(row, 'recovery')),
                       actual=rnd(amt(row, 'allowable')))
                continue
            dual = bool(str(row.get('medicaid', '') or '').strip())
            indigent = norm(row.get('indigent', '')) == 'Y'
            need('ra')
            if not row.get('mcaid_ra'):
                need('first_bill', ' when there is no Medicaid remittance advice date')
            for f in ('ar_wo', 'ceased', 'mcr_wo'):
                need(f)
            if norm(row.get('agency', '')) not in ('Y', 'N'):
                lf(rep, 'error', 'BD-REQUIRED', lst, row, 'agency', 'Column 15a (sent to a collection agency) must be '
                   'Y or N.')
            elif norm(row.get('agency', '')) == 'Y':
                need('agency_ret', ' when the account went to a collection agency')
            if dual and not row.get('mcaid_ra'):
                lf(rep, 'error', 'BD-DUAL', lst, row, 'mcaid_ra', 'A dual eligible beneficiary (column 7) needs the '
                   'Medicaid remittance advice date, or AD for alternate documentation, in column 10.',
                   source='413.89')
            if row.get('deductible') is None and row.get('coinsurance') is None:
                lf(rep, 'error', 'BD-REQUIRED', lst, row, 'deductible', 'Enter the Medicare deductible (column 20) or '
                   'coinsurance (column 21) the bad debt comes from.')
            wo = row.get('mcr_wo')
            if isinstance(wo, dt.date):
                for f in ('ar_wo', 'agency_ret', 'ceased'):
                    d = row.get(f)
                    if isinstance(d, dt.date) and wo < d:
                        lf(rep, 'error', 'BD-DATES', lst, row, 'mcr_wo', f'The Medicare write off date (column 17) must '
                           f'be on or after column {FIELD_COL["2A"][f]}.', expected=f'on or after {d.isoformat()}',
                           actual=wo.isoformat())
                ok['BD-WRITEOFF-PERIOD'] = ok.get('BD-WRITEOFF-PERIOD', 0) + 1
                if not in_period(wo, start, end):
                    lf(rep, 'error', 'BD-WRITEOFF-PERIOD', lst, row, 'mcr_wo', 'The Medicare write off date is outside '
                       'the cost reporting period. A bad debt is claimed in the period the account is written off.',
                       expected=f'{start.isoformat()} to {end.isoformat()}', actual=wo.isoformat(), source='413.89')
            fb = row.get('first_bill')
            if not dual and not indigent and isinstance(fb, dt.date):
                if isinstance(wo, dt.date):
                    ok['BD-120-DAYS'] = ok.get('BD-120-DAYS', 0) + 1
                    days = (wo - fb).days
                    if days < 120:
                        lf(rep, 'error', 'BD-120-DAYS', lst, row, 'mcr_wo', f'Written off {days} days after the first '
                           'bill. Collection effort must last at least 120 days after the first bill before the '
                           'account is written off (42 CFR 413.89(e)(2)(i)(A)(5)).', expected='120 days or more',
                           actual=f'{days} days', source='413.89')
                ras = [d for d in (row.get('ra'), row.get('sec_ra')) if isinstance(d, dt.date)]
                if ras:
                    ok['BD-BILL-120'] = ok.get('BD-BILL-120', 0) + 1
                    late = (fb - max(ras)).days
                    if late > 120:
                        lf(rep, 'error', 'BD-BILL-120', lst, row, 'first_bill', f'The first bill went out {late} days '
                           'after the later remittance advice. The beneficiary must be billed within 120 days of it '
                           '(42 CFR 413.89(e)(2)(i)(A)(3)).', expected='120 days or fewer', actual=f'{late} days',
                           source='413.89')
            if indigent and amt(row, 'bene_resp'):
                lf(rep, 'warning', 'BD-INDIGENT', lst, row, 'bene_resp', 'A beneficiary deemed indigent (column 8 is '
                   'Y) has a beneficiary responsibility of zero in column 12.')
            cap = amt(row, 'deductible') + amt(row, 'coinsurance') - amt(row, 'recovery') - amt(row, 'paid_prior')
            ok['BD-CAP'] = ok.get('BD-CAP', 0) + 1
            if amt(row, 'allowable') > cap + 0.005:
                lf(rep, 'error', 'BD-CAP', lst, row, 'allowable', 'The allowable bad debt (column 23) is more than the '
                   'deductible and coinsurance (columns 20 and 21) less recoveries and payments (columns 18 and 22). '
                   'Medicare bad debt can only come from unpaid deductible and coinsurance.',
                   expected=f'at most {rnd(cap)}', actual=rnd(amt(row, 'allowable')), source='413.89')
        total = sum(amt(r, 'allowable') for r in lst.rows)
        hdr = as_amount(lst.header['total']) if 'total' in lst.header else None
        if hdr is not None and abs(hdr - total) > 0.005:
            rep.add('warning', 'BD-HEADER-TOTAL', 'The Total Column 23 header cell does not match the sum of column 23.',
                    'ex2a', where={'exhibit': '2A', 'file': lst.file, 'row': 'header', 'column': 'B11'},
                    expected=rnd(total), actual=rnd(hdr))
        dual_total = sum(amt(r, 'allowable') for r in lst.rows if str(r.get('medicaid', '') or '').strip())
        hdr = as_amount(lst.header['total_dual']) if 'total_dual' in lst.header else None
        if hdr is not None and abs(hdr - dual_total) > 0.005:
            rep.add('warning', 'BD-HEADER-TOTAL', 'The Total Dual Eligible header cell does not match the sum of column '
                    '23 for rows with a Medicaid entry.', 'ex2a',
                    where={'exhibit': '2A', 'file': lst.file, 'row': 'header', 'column': 'B12'},
                    expected=rnd(dual_total), actual=rnd(hdr))
    check_duplicates(lists, rep, lambda l: [r for r in l.rows if writeoff_row(l, r)], '2A')


def check_3b(lists, rep, start, end, ok):
    s4 = start >= STATUS4_START
    for lst in lists:
        for row in lst.rows:
            for f in ('acct', 'from', 'to', 'status'):
                if row.get(f) in (None, ''):
                    lf(rep, 'error', 'CC-REQUIRED', lst, row, f, f'Column {FIELD_COL["3B"][f]} is required.')
            st = norm(row.get('status', '')).replace('.0', '')
            valid = ('1', '2', '3', '4') if s4 else ('1', '2', '3')
            if st and st not in valid:
                lf(rep, 'error', 'CC-STATUS', lst, row, 'status', f'Insurance status must be {", ".join(valid[:-1])} '
                   f'or {valid[-1]} for this period.', actual=st)
                continue
            if st in ('2', '3', '4') and not str(row.get('primary', '') or '').strip():
                lf(rep, 'error', 'CC-REQUIRED', lst, row, 'primary', 'The primary payor (column 7) is required when '
                   'the patient had insurance (status 2, 3 or 4).')
            paid = amt(row, 'third_party') + amt(row, 'patient_paid')
            if not paid and row.get('charity_total') is None:
                lf(rep, 'error', 'CC-REQUIRED', lst, row, 'charity_total', 'Column 20 is required.')
            parts = amt(row, 'uninsured_disc') + amt(row, 'noncovered') + amt(row, 'other_charity')
            ok['CC-SUM'] = ok.get('CC-SUM', 0) + 1
            if abs(parts - amt(row, 'charity_total')) > 0.005:
                lf(rep, 'error', 'CC-SUM', lst, row, 'charity_total', 'Column 20 must be the sum of columns 17, 18 and '
                   '19.', expected=rnd(parts), actual=rnd(amt(row, 'charity_total')))
            if st in ('3', '4') and amt(row, 'uninsured_disc'):
                lf(rep, 'error', 'CC-STATUS', lst, row, 'uninsured_disc', 'Column 17 (uninsured discount) must be '
                   'blank or zero for an insured patient (status 3 or 4).')
            if st == '1' and amt(row, 'contractual'):
                lf(rep, 'error', 'CC-STATUS', lst, row, 'contractual', 'Column 13 (insured contractual allowance) '
                   'must be blank or zero for an uninsured patient (status 1).')
            if st in ('1', '2') and (amt(row, 'noncovered') or amt(row, 'other_charity')):
                lf(rep, 'warning', 'CC-STATUS', lst, row, 'noncovered', 'Columns 18 and 19 are for insured patients '
                   '(status 3 or 4). For status 1 or 2 the charity care goes in column 17.')
            if st in ('3', '4') and amt(row, 'other_charity') > amt(row, 'ded_coins') + 0.005:
                lf(rep, 'error', 'CC-DEDUCTIBLE', lst, row, 'other_charity', 'Column 19 can only hold the deductible, '
                   'coinsurance and copayment written off to charity care, so it cannot exceed column 11.',
                   expected=f'at most {rnd(amt(row, "ded_coins"))}', actual=rnd(amt(row, 'other_charity')))
            room = amt(row, 'charges') - sum(amt(row, f) for f in ('phys', 'third_party', 'contractual',
                                                                    'other_nonallow', 'patient_paid', 'bad_debt'))
            ok['CC-CHARGES'] = ok.get('CC-CHARGES', 0) + 1
            if amt(row, 'charges') and amt(row, 'charity_total') > room + 0.005:
                lf(rep, 'error', 'CC-CHARGES', lst, row, 'charity_total', 'Charity care is more than the claim charges '
                   'less physician and professional charges, payments, allowances and bad debt (column 9 less columns '
                   '10 and 12 to 16). Physician and professional charges are never charity care on S-10.',
                   expected=f'at most {rnd(room)}', actual=rnd(amt(row, 'charity_total')))
            wo = row.get('wo')
            if wo is None and not paid:
                lf(rep, 'error', 'CC-REQUIRED', lst, row, 'wo', 'The write off date (column 21) is required.')
            if isinstance(wo, dt.date):
                ok['CC-WRITEOFF-PERIOD'] = ok.get('CC-WRITEOFF-PERIOD', 0) + 1
                if not in_period(wo, start, end):
                    lf(rep, 'error', 'CC-WRITEOFF-PERIOD', lst, row, 'wo', 'The charity care write off date is outside '
                       'the cost reporting period. Line 20 reports amounts written off during this period.',
                       expected=f'{start.isoformat()} to {end.isoformat()}', actual=wo.isoformat(), source='s10')
        for key, sts, cell in (('total_uninsured', ('1', '2'), 'B10'), ('total_insured', ('3', '4'), 'B11')):
            if key in lst.header:
                hdr = as_amount(lst.header[key])
                tot = sum(amt(r, 'charity_total') for r in lst.rows
                          if norm(r.get('status', '')).replace('.0', '') in sts)
                if hdr is not None and abs(hdr - tot) > 0.005:
                    rep.add('warning', 'CC-HEADER-TOTAL', f'The {cell} header total does not match the sum of column '
                            '20 for those insurance statuses.', 'ex3b',
                            where={'exhibit': '3B', 'file': lst.file, 'row': 'header', 'column': cell},
                            expected=rnd(tot), actual=rnd(hdr))
    check_duplicates(lists, rep, lambda l: l.rows, '3B')


def check_3c(lists, rep, start, end, ok):
    for lst in lists:
        for row in lst.rows:
            for f in ('acct', 'from', 'to', 'status', 'ipop', 'charges', 'wo', 'bad_debt'):
                if row.get(f) in (None, ''):
                    lf(rep, 'error', 'TBD-REQUIRED', lst, row, f, f'Column {FIELD_COL["3C"][f]} is required.')
            st = norm(row.get('status', '')).replace('.0', '')
            if st and st not in ('1', '2', '3'):
                lf(rep, 'error', 'TBD-STATUS', lst, row, 'status', 'Insurance status must be 1, 2 or 3.', actual=st)
            if st in ('2', '3') and not str(row.get('primary', '') or '').strip():
                lf(rep, 'error', 'TBD-REQUIRED', lst, row, 'primary', 'The primary payor (column 7) is required when '
                   'the patient had insurance (status 2 or 3).')
            if row.get('ipop') not in (None, '') and norm(row.get('ipop')) not in ('IP', 'OP'):
                lf(rep, 'error', 'TBD-REQUIRED', lst, row, 'ipop', 'The service indicator (column 9) must be IP or OP.')
            ch, ph = amt(row, 'charges'), amt(row, 'phys')
            reductions = sum(amt(row, f) for f in ('patient_paid', 'third_party', 'charity', 'contractual'))
            cap = ch - (ch / (ch + ph) if ch + ph else 0.0) * reductions
            ok['TBD-CAP'] = ok.get('TBD-CAP', 0) + 1
            if amt(row, 'bad_debt') > cap + 0.01:
                lf(rep, 'error', 'TBD-CAP', lst, row, 'bad_debt', 'The patient bad debt (column 17) is more than total '
                   'charges less their share of payments, charity care and allowances (column 10 less (column 10 '
                   'divided by columns 10 plus 11) times columns 12 to 15). The physician and professional share is '
                   'not bad debt on S-10.', expected=f'at most {rnd(cap)}', actual=rnd(amt(row, 'bad_debt')))
            wo = row.get('wo')
            if isinstance(wo, dt.date):
                ok['TBD-WRITEOFF-PERIOD'] = ok.get('TBD-WRITEOFF-PERIOD', 0) + 1
                if not in_period(wo, start, end):
                    lf(rep, 'error', 'TBD-WRITEOFF-PERIOD', lst, row, 'wo', 'The bad debt write off date is outside the '
                       'cost reporting period. Line 26 reports bad debts written off during this period.',
                       expected=f'{start.isoformat()} to {end.isoformat()}', actual=wo.isoformat(), source='s10')
        if 'total' in lst.header:
            hdr = as_amount(lst.header['total'])
            tot = sum(amt(r, 'bad_debt') for r in lst.rows)
            if hdr is not None and abs(hdr - tot) > 0.005:
                rep.add('warning', 'TBD-HEADER-TOTAL', 'The Total Column 17 header cell does not match the sum of '
                        'column 17.', 'ex3c', where={'exhibit': '3C', 'file': lst.file, 'row': 'header',
                                                     'column': 'B10'}, expected=rnd(tot), actual=rnd(hdr))
    check_duplicates(lists, rep, lambda l: l.rows, '3C')


def listing_ties(e, rep, cur, ok, start):
    """The listings must correspond to the amounts claimed in the cost report."""
    def t(rule, ex, worksheet, line, col, exp, act, msg):
        ok[rule] = ok.get(rule, 0) + 1
        if abs(exp - act) > TOL:
            rep.add('error', rule, msg, EXHIBITS[ex]['source'],
                    where={'exhibit': ex, 'worksheet': worksheet, 'line': line, 'column': col},
                    expected=rnd(exp), actual=rnd(act))

    ip = [l for l in cur['2A'] if norm(l.header.get('ipop', '')) == 'IP' and hospital_ccn(l)]
    op = [l for l in cur['2A'] if norm(l.header.get('ipop', '')) == 'OP' and hospital_ccn(l)]
    cah_bd = val(e, 'E30A185', '25', '1')   # a cost reimbursed hospital (CAH) claims inpatient bad debts on E-3, Part V
    ip_ws = ('E30A185', '25', None, 'E-3, Part V') if cah_bd and not val(e, 'E00A18A', '64', '1') else \
        ('E00A18A', '64', '66', 'E, Part A')
    for lists, (wk, line, dual_line, name), kind in ((ip, ip_ws, 'inpatient'),
                                                      (op, ('E00A18B', '34', '36', 'E, Part B'), 'outpatient')):
        if not lists:
            continue   # a missing listing is reported by required_listings
        tot = sum(amt(r, 'allowable') for l in lists for r in l.rows)
        t('BD-TIE', '2A', name, line, '1', tot, val(e, wk, line, '1'), f'The Exhibit 2A {kind} listings for the '
          f'hospital (column 23) must add up to Worksheet {name}, line {line}.')
        if dual_line:
            dual = sum(amt(r, 'allowable') for l in lists for r in l.rows if str(r.get('medicaid', '') or '').strip())
            t('BD-TIE', '2A', name, dual_line, '1', dual, val(e, wk, dual_line, '1'), f'Dual eligible bad debts on '
              f'the Exhibit 2A {kind} listings (column 23 where column 7 has an entry) must add up to Worksheet {name}, '
              f'line {dual_line}.')
    if e.has('S100001'):
        if cur['3B']:
            unins = sum(amt(r, 'charity_total') for l in cur['3B'] for r in l.rows
                        if norm(r.get('status', '')).replace('.0', '') in ('1', '2'))
            ins = sum(amt(r, 'charity_total') for l in cur['3B'] for r in l.rows
                      if norm(r.get('status', '')).replace('.0', '') in ('3', '4'))
            t('CC-TIE', '3B', 'S-10, Part I', '20', '1', unins, val(e, 'S100001', '20', '1'), 'Column 20 for uninsured '
              'patients (status 1 and 2), all 3B listings, must add up to Worksheet S-10, Part I, line 20, column 1.')
            t('CC-TIE', '3B', 'S-10, Part I', '20', '2', ins, val(e, 'S100001', '20', '2'), 'Column 20 for insured '
              'patients (status 3 and 4), all 3B listings, must add up to Worksheet S-10, Part I, line 20, column 2.')
            hosp = [l for l in cur['3B'] if hospital_ccn(l)]
            if hosp and e.has('S100002'):
                for col, sts in (('1', ('1', '2')), ('2', ('3', '4'))):
                    tot = sum(amt(r, 'charity_total') for l in hosp for r in l.rows
                              if norm(r.get('status', '')).replace('.0', '') in sts)
                    t('CC-TIE', '3B', 'S-10, Part II', '20', col, tot, val(e, 'S100002', '20', col), 'The hospital '
                      f'CCN listing must add up to Worksheet S-10, Part II, line 20, column {col}.')
            if start >= STATUS4_START:
                for st, line in (('3', '25.01'), ('4', '25')):
                    tot = sum(amt(r, 'noncovered') for l in cur['3B'] for r in l.rows
                              if norm(r.get('status', '')).replace('.0', '') == st)
                    t('CC-TIE', '3B', 'S-10, Part I', line, '1', tot, val(e, 'S100001', line, '1'), f'Column 18 for '
                      f'status {st} must add up to Worksheet S-10, Part I, line {line}.')
        if cur['3C']:
            tot = sum(amt(r, 'bad_debt') for l in cur['3C'] for r in l.rows)
            t('TBD-TIE', '3C', 'S-10, Part I', '26', '1', tot, val(e, 'S100001', '26', '1'), 'Column 17 on all Exhibit '
              '3C listings must add up to Worksheet S-10, Part I, line 26.')
            hosp = [l for l in cur['3C'] if hospital_ccn(l)]
            if hosp and e.has('S100002'):
                tot = sum(amt(r, 'bad_debt') for l in hosp for r in l.rows)
                t('TBD-TIE', '3C', 'S-10, Part II', '26', '1', tot, val(e, 'S100002', '26', '1'), 'Column 17 on the '
                  'hospital CCN listing must add up to Worksheet S-10, Part II, line 26.')


def required_listings(e, rep, cur, start):
    """Which listings the cost report needs, from what it claims. Returns {exhibit: required?}."""
    sch_exempt = val(e, 'E00A18A', '48', '1') > val(e, 'E00A18A', '47', '1') > 0
    claims_bd = (val(e, 'E00A18A', '64', '1') != 0 or val(e, 'E00A18B', '34', '1') != 0
                 or val(e, 'E30A185', '25', '1') != 0 or val(e, 'S100001', '27.01', '1') != 0)
    if e.text('S200002', '012', '001').upper() == 'Y' and not claims_bd:
        rep.add('warning', 'LIST-S2-12', 'Worksheet S-2, Part II, line 12 says Medicare bad debts are claimed, but no '
                'Medicare bad debt amount is in the cost report. Answer N, or enter the bad debts and add the Exhibit '
                '2A listings.', 'ex2a', where={'worksheet': 'S-2, Part II', 'line': '12', 'column': '1'})
    need = {
        '2A': claims_bd,
        '3B': e.has('S100001') and val(e, 'S100001', '20', '3') > 0 and not sch_exempt,
        '3C': e.has('S100001') and val(e, 'S100001', '26', '1') > 0 and not sch_exempt,
    }
    if need['2A'] and not cur['2A']:
        rep.add('error', 'LIST-MISSING', 'The cost report claims Medicare bad debts (Worksheet E, Part A, line 64, Part '
                'B, line 34, or S-10, line 27.01) but no Exhibit 2A listing is in the package. A cost '
                'report is rejected without a bad debt listing that corresponds to the bad debt claimed (42 CFR '
                '413.24(f)(5)(i)(B)).', '413.24(f)(5)', where={'exhibit': '2A'})
    elif cur['2A']:
        hosp = [l for l in cur['2A'] if hospital_ccn(l)]
        for kind, amount, where in (('IP', val(e, 'E00A18A', '64', '1') or val(e, 'E30A185', '25', '1'),
                                     'Worksheet E, Part A, line 64'),
                                    ('OP', val(e, 'E00A18B', '34', '1'), 'Worksheet E, Part B, line 34')):
            if amount and not any(norm(l.header.get('ipop', '')) == kind for l in hosp):
                rep.add('error', 'LIST-MISSING', f'{where} claims {"inpatient" if kind == "IP" else "outpatient"} '
                        f'Medicare bad debts but there is no Exhibit 2A {kind} listing for the hospital. Complete '
                        'separate listings for inpatient and outpatient bad debts (42 CFR 413.24(f)(5)(i)(B)).',
                        '413.24(f)(5)', where={'exhibit': '2A'})
    if need['3B'] and not cur['3B']:
        rep.add('error', 'LIST-MISSING', 'Worksheet S-10, line 20 claims charity care but no Exhibit 3B listing is in '
                'the package. A cost report is rejected without the listing that supports the charity care claimed '
                '(42 CFR 413.24(f)(5)(i)(D)).', '413.24(f)(5)', where={'exhibit': '3B'})
    if need['3C'] and not cur['3C']:
        rep.add('error', 'LIST-MISSING', 'Worksheet S-10, line 26 reports bad debts but no Exhibit 3C listing is in the '
                'package. Exhibit 3C must be submitted to support line 26 (Pub. 15-2, section 4012.2), and the '
                'listings rule of 42 CFR 413.24(f)(5) applies to the cost report as filed.', 'ex3c',
                where={'exhibit': '3C'})
    return need, sch_exempt


# ------------------------------------------------------------------ main
def validate(body: bytes, *, query=None, today=None, demo=False, budget=TIME_BUDGET_S):
    clock = Clock(budget)
    sha = hashlib.sha256(body or b'').hexdigest()
    if demo and sha not in DEMO_SAMPLES:
        raise InputError(DEMO_ONLY)
    start, end, as_of = parse_params(query, today)
    today = today or dt.datetime.now(dt.timezone.utc).date()
    ecr_raw, ecr_name, others = read_package(body, clock)
    rep = Report()
    ok = {}
    e = parse_ecr(ecr_raw, rep, clock)
    facts = check_record1(e, rep, start, end, today)
    check_structure(e, rep, facts)
    clock.tick()
    run_ties(e, rep, ok, clock)
    s10 = run_s10(e, rep, ok)
    clock.tick()

    listings, unknown = [], []
    for name, b in others:
        clock.tick()
        got = find_listings(name, b, clock)
        if got:
            listings.extend(got)
        else:
            unknown.append(name)
    for lst in listings:
        privacy_guard(lst)
    for lst in listings:
        header_check(lst, rep, facts.get('ccn'), start, end)
        clean_rows(lst, rep)
    cur = {ex: [l for l in listings if l.exhibit == ex and not l.prior] for ex in EXHIBITS}
    pri = {ex: [l for l in listings if l.exhibit == ex and l.prior] for ex in EXHIBITS}
    clock.tick()
    check_2a(cur['2A'], rep, start, end, ok)
    check_3b(cur['3B'], rep, start, end, ok)
    check_3c(cur['3C'], rep, start, end, ok)
    prior_ran = {}
    for ex, rows_of in (('2A', lambda l: [r for r in l.rows if writeoff_row(l, r)]), ('3B', lambda l: l.rows),
                        ('3C', lambda l: l.rows)):
        prior_ran[ex] = check_prior(cur[ex], pri[ex], rep, rows_of, ex, ok)
    listing_ties(e, rep, cur, ok, start)
    need, sch_exempt = required_listings(e, rep, cur, start)

    due, how = due_date(end)
    days = (due - as_of).days
    late = as_of > due
    if late:
        rep.add('warning', 'DEADLINE-LATE', f'The cost report was due {due.isoformat()}, {-days} days before '
                f'{as_of.isoformat()}. Reports are due on the last day of the fifth month after the period ends '
                '(150 days after a period that ends mid-month). Extensions are granted only for extraordinary '
                'circumstances, so file now and talk to your MAC.', '413.24(f)(2)',
                where={'worksheet': None}, expected=f'filed by {due.isoformat()}', actual=f'not filed as of '
                                                                                         f'{as_of.isoformat()}')
    return finish(rep, e, facts, ok, s10, listings, cur, pri, prior_ran, need, sch_exempt, unknown, start, end,
                  as_of, due, days, late, body, ecr_name)


def finish(rep, e, facts, ok, s10, listings, cur, pri, prior_ran, need, sch_exempt, unknown, start, end, as_of, due,
           days, late, body, ecr_name):
    order = {'error': 0, 'warning': 1}
    findings = sorted(rep.findings, key=lambda f: (order[f['severity']], f['group'], f['ruleId'],
                                                   str(f.get('worksheet') or f.get('exhibit') or ''),
                                                   str(f.get('row') or '')))
    c = Counter(f['severity'] for f in findings)

    def group_status(g, ran=True):
        fs = [f for f in findings if f['group'] == g]
        if any(f['severity'] == 'error' for f in fs):
            return 'fail'
        if fs:
            return 'warn'
        return 'pass' if ran else 'na'

    lst_rows = []
    for ex in EXHIBITS:
        for l in cur[ex]:
            lst_rows.append({'exhibit': ex, 'file': l.file, 'kind': norm(l.header.get('ipop', '')) or None,
                             'component': bool(str(l.header.get('component', '')).strip()), 'rows': len(l.rows)})
    status = 'FAIL' if c['error'] else ('WARN' if c['warning'] else 'PASS')
    listing_status = {}
    for ex in EXHIBITS:
        fs = [f for f in findings if f.get('exhibit') == ex]
        if any(f['severity'] == 'error' for f in fs):
            listing_status[ex] = 'fail'
        elif fs:
            listing_status[ex] = 'warn'
        elif cur[ex]:
            listing_status[ex] = 'pass'
        else:
            listing_status[ex] = 'na'
    checks = {
        'ecrFormat': group_status('ecrFormat'),
        'crossTies': group_status('crossTies', ran=bool(e.has('B000001') or e.has('C000001'))),
        's10': group_status('s10', ran=s10),
        'listings': group_status('listings', ran=bool(listings) or any(need.values())),
        'deadline': 'warn' if late else 'pass',
    }
    if status == 'PASS':
        summary = ('The ECR file is in the CMS format, the worksheets tie, S-10 recomputes and the listings support '
                   'the amounts claimed. Ready to file, as far as these checks go.')
    elif c['error']:
        summary = (f'{c["error"]} {"problem" if c["error"] == 1 else "problems"} to fix before you file'
                   + (f', and {c["warning"]} to review.' if c['warning'] else '.'))
    else:
        summary = f'{c["warning"]} {"item" if c["warning"] == 1 else "items"} to review before you file.'
    return {
        'schemaVersion': 1,
        'status': status,
        'summary': summary,
        'checkedAgainst': {'transmittal': TRANSMITTAL, 'ecrSpecification': SPEC_NOTE, 'specDate': SPEC_DATE},
        'file': {'ccn': facts.get('ccn'), 'ecrSpecDate': facts.get('specDate'), 'records': e.lines,
                 'dataRecords': len(e.data), 'labelRecords': len(e.labels), 'type4Records': e.type4},
        'period': {'start': start.isoformat(), 'end': end.isoformat()},
        'deadline': {'due': due.isoformat(), 'asOf': as_of.isoformat(), 'daysLeft': days,
                     'status': 'late' if late else 'on-time',
                     'rule': 'The last day of the fifth month after the period ends, or 150 days after a period that '
                             'ends mid-month (42 CFR 413.24(f)(2)).'},
        'checks': checks,
        'listings': {
            'found': lst_rows,
            'required': need,
            'status': listing_status,
            'priorYearListings': sum(len(v) for v in pri.values()),
            'priorClaimCheck': {ex: ('ran' if prior_ran[ex] else 'not run: add last year\'s listing to the package')
                                for ex in EXHIBITS if cur[ex]},
            'schExemptFromS10Listings': sch_exempt,
            'unrecognizedFiles': len(unknown),
        },
        'tiesChecked': sum(ok.values()),
        'ruleCounts': dict(sorted(Counter(f['ruleId'] for f in findings).items())),
        'findingCount': len(findings),
        'findingCounts': {'error': c['error'], 'warning': c['warning']},
        'findings': findings[:MAX_FINDINGS],
        'findingsTruncated': len(findings) > MAX_FINDINGS,
        'notChecked': NOT_CHECKED,
        'sources': SOURCES,
        'scope': SCOPE,
        'input': {'format': 'zip' if body[:2] == b'PK' else 'ecr', 'bytes': len(body), 'files': 1 + len(listings) +
                  len(unknown)},
        'inputSha256': hashlib.sha256(body).hexdigest(),
    }
