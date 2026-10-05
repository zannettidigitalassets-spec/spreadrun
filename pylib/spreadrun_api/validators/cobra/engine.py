"""SpreadRun COBRA Notice Content QA (SpreadRun's own engine, not a DataForge copy).

Checks a draft COBRA election notice or general (initial) notice before it goes out: whether the text contains each
content item the DOL regulation requires for that notice type, whether it goes out within the deadline counted from
the event date, and whether the dates and terms it states agree with the statutory minimums.

Everything is deterministic: fixed patterns over the notice text and date arithmetic. A pattern can find that an item
is addressed; it cannot judge whether the wording is legally sufficient. Reports never repeat text, names, amounts or
dates from the submission: findings carry a rule ID, the regulation item and a fixed message.

Sources (checked October 2026):
  29 CFR 2590.606-1 (general notice: 90-day deadline, six content items), 2590.606-2 (employer notice to the
  administrator, 30 days), 2590.606-3 (qualified beneficiary notices), 2590.606-4 (election notice: 14 days, 44 days
  when the employer is the administrator, fourteen content items in (b)(4)); 29 USC 1162 and 1165;
  26 CFR 54.4980B-6 (60-day election period), 54.4980B-7 (maximum periods), 54.4980B-8 (102 percent, 45 days for
  the first payment, 30-day grace period); DOL model notices FAQ (May 2020) for the Medicare explanation.
"""
import base64
import binascii
import hashlib
import io
import json
import re
import zipfile
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from xml.etree import ElementTree

MAX_TEXT_CHARS = 200_000
MIN_TEXT_CHARS = 200
MAX_FILE_BYTES = 3_000_000

NOTICE_TYPES = ('election', 'general')
# Events the employer reports (606-2) and events a qualified beneficiary reports (606-3).
EMPLOYER_EVENTS = ('termination', 'reduction-of-hours', 'death', 'medicare-entitlement', 'bankruptcy')
BENEFICIARY_EVENTS = ('divorce', 'legal-separation', 'dependent-child')
EVENT_TYPES = EMPLOYER_EVENTS + BENEFICIARY_EVENTS
EIGHTEEN_MONTH_EVENTS = ('termination', 'reduction-of-hours')

ELECTION_NOTICE_DAYS = 14          # 606-4(b)(1)
EMPLOYER_TO_ADMIN_DAYS = 30        # 606-2(b)
EMPLOYER_IS_ADMIN_DAYS = 44        # 606-4(b)(2)
ELECTION_PERIOD_DAYS = 60          # 54.4980B-6 Q&A-1, 29 USC 1165(a)(1)
GENERAL_NOTICE_DAYS = 90           # 606-1(b)(1)
FIRST_PAYMENT_DAYS = 45            # 54.4980B-8 Q&A-5(b)
GRACE_DAYS = 30                    # 54.4980B-8 Q&A-5(a)

SOURCES = {
    'cfr2590.606-1': '29 CFR 2590.606-1, general notice of continuation coverage (deadline and content)',
    'cfr2590.606-2': '29 CFR 2590.606-2, employer notice of a qualifying event to the administrator (30 days)',
    'cfr2590.606-3': '29 CFR 2590.606-3, notices from qualified beneficiaries',
    'cfr2590.606-4': '29 CFR 2590.606-4, election notice (14 days, or 44 days when the employer is the administrator; '
                     'content items (b)(4)(i) to (xiv))',
    'usc1162': '29 USC 1162, period of coverage and premium limits',
    'usc1165': '29 USC 1165, election period',
    'cfr54.4980B-6': '26 CFR 54.4980B-6, election period of at least 60 days',
    'cfr54.4980B-7': '26 CFR 54.4980B-7, maximum coverage periods (18, 29 and 36 months)',
    'cfr54.4980B-8': '26 CFR 54.4980B-8, premiums: 102 percent, 45 days for the first payment, 30-day grace period',
    'dol-model-2020': 'DOL model general and election notices, updated 2020 to explain how COBRA and Medicare interact',
}


class InputError(ValueError):
    """The request cannot be checked at all (400, not charged). Messages never repeat submitted values."""


# The free demo runs the three sample notices on the product page and nothing else: checking your own notice is the
# paid product. A body matches when its JSON is the same as a sample's, whatever the spacing or key order. The hashes
# are of the canonical JSON of public/samples/cobra-*.json; test_cobra.py recomputes them from those files.
DEMO_SAMPLES = {
    '620913f7a201183a2356494961164d9ed1e5a1cfe4af035598ab31720c6e8655': 'cobra-election-clean',
    '4f7a8aefe3a2057427c00c3f106585a2adbe249edb37b053f337188b42c66691': 'cobra-election-errors',
    'd0142d44e61c67354869d2150efafe543a4a5254b32f7a0a999dc130965cb174': 'cobra-general-clean',
}
DEMO_ONLY_SAMPLES = ('The free demo runs the three sample notices only. To check your own notice, sign in with $25.00 of '
                     'credit or call the paid API. Nothing was charged.')


def canonical_sha(data):
    return hashlib.sha256(json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def demo_sample(body: bytes):
    """The sample's name if the body is one of the demo sample requests, otherwise None."""
    try:
        return DEMO_SAMPLES.get(canonical_sha(json.loads(body.decode('utf-8'))))
    except (UnicodeDecodeError, ValueError, RecursionError):
        return None


class Report:
    def __init__(self):
        self.findings = []

    def add(self, sev, rule, item, msg, source, path='/noticeText'):
        self.findings.append({'severity': sev, 'ruleId': rule, 'item': item, 'path': path, 'message': msg,
                              'source': source})


# ------------------------------------------------------------------ text
def _norm(t):
    t = t.replace(' ', ' ').replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    t = re.sub(r'[‐-―]', '-', t)
    return re.sub(r'[ \t]+', ' ', t)


def text_from_pdf(raw):
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(raw))
        return '\n'.join((p.extract_text() or '') for p in reader.pages)
    except Exception:  # noqa: BLE001 - any parse failure is an input problem; never echo internals
        raise InputError('The PDF could not be read. Send the notice as text or as a DOCX file.') from None


W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def text_from_docx(raw):
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            xml = z.read('word/document.xml')
        root = ElementTree.fromstring(xml)
    except Exception:  # noqa: BLE001
        raise InputError('The DOCX file could not be read. Send the notice as text or as a PDF.') from None
    paras = []
    for p in root.iter(f'{W}p'):
        paras.append(''.join(n.text or '' for n in p.iter() if n.tag in (f'{W}t', f'{W}tab')))
    return '\n'.join(paras)


def parse_date(v):
    if not isinstance(v, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', v.strip()):
        return None
    try:
        return date.fromisoformat(v.strip())
    except ValueError:
        return None


def parse_body(body: bytes):
    try:
        data = json.loads(body.decode('utf-8'))
    except (UnicodeDecodeError, ValueError):
        raise InputError('Send the request as a UTF-8 JSON object.') from None
    if not isinstance(data, dict):
        raise InputError('Send the request as a JSON object.')
    nt = data.get('noticeType')
    if nt not in NOTICE_TYPES:
        raise InputError('noticeType must be election or general.')
    has_text, has_file = 'noticeText' in data, 'noticeFile' in data
    if has_text == has_file:
        raise InputError('Send the notice as either noticeText or noticeFile, not both.')
    if has_text:
        text = data['noticeText']
        if not isinstance(text, str):
            raise InputError('noticeText must be a string.')
    else:
        f = data['noticeFile']
        if not isinstance(f, dict) or f.get('type') not in ('pdf', 'docx') or not isinstance(f.get('base64'), str):
            raise InputError('noticeFile must be an object with type (pdf or docx) and base64.')
        try:
            raw = base64.b64decode(f['base64'], validate=True)
        except (binascii.Error, ValueError):
            raise InputError('noticeFile.base64 is not valid base64.') from None
        if len(raw) > MAX_FILE_BYTES:
            raise InputError('The file is over 3 MB.')
        text = text_from_pdf(raw) if f['type'] == 'pdf' else text_from_docx(raw)
    text = _norm(text)
    if len(text) > MAX_TEXT_CHARS:
        raise InputError(f'The notice text is over {MAX_TEXT_CHARS:,} characters.')
    if len(text.strip()) < MIN_TEXT_CHARS:
        raise InputError('The notice has almost no text. A scanned PDF has no text layer: send the text or a DOCX.')
    ev = data.get('qualifyingEvent', {})
    if not isinstance(ev, dict):
        raise InputError('qualifyingEvent must be an object.')
    if nt == 'election':
        if ev.get('type') not in EVENT_TYPES:
            raise InputError('qualifyingEvent.type must be one of: ' + ', '.join(EVENT_TYPES) + '.')
        for k in ('employerIsAdministrator', 'periodStartsAtLossOfCoverage'):
            if k in ev and not isinstance(ev[k], bool):
                raise InputError(f'qualifyingEvent.{k} must be true or false.')
    for k in ('noticeDate', 'coverageStartDate', 'asOf'):
        if k in data and data[k] is not None and not isinstance(data[k], str):
            raise InputError(f'{k} must be a date string (YYYY-MM-DD).')
    return data, nt, text


# ------------------------------------------------------------------ patterns
def rx(p):
    return re.compile(p, re.I | re.S)


PHONE = rx(r'(?:\(\d{3}\)\s?|\b\d{3}[-. ])\d{3}[-. ]\d{4}\b|\b1-8\d\d-\d{3}-\d{4}\b')
ADDRESS = rx(r'\b(?:p\.?\s?o\.?\s?box\s+\d+|\d{1,6}\s+[A-Za-z0-9 .]{2,40}\b(?:street|st|avenue|ave|road|rd|drive|dr|'
             r'boulevard|blvd|lane|ln|way|parkway|pkwy|suite|court|ct|place|pl|plaza|circle|highway|hwy)\b)'
             r'|\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b')
PLAN_NAME = re.compile(r'\b(?:[A-Z][\w&.,\'-]*\s+){1,8}(?:Group\s+)?(?:Health|Medical|Dental|Vision|Welfare|Benefit|'
                       r'Benefits|Health\s+and\s+Welfare|Employee\s+Benefit)\s+Plan\b')
MONEY = rx(r'\$\s?\d[\d,]*(?:\.\d{2})?')
SSN = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')
MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|' \
         'jun|jul|aug|sep|sept|oct|nov|dec'
DATE_RX = rx(rf'\b(?:(?P<mon>{MONTHS})\.?\s+(?P<d1>\d{{1,2}}),?\s+(?P<y1>\d{{4}})|(?P<m2>\d{{1,2}})/(?P<d2>\d{{1,2}})/'
             rf'(?P<y2>\d{{4}})|(?P<y3>\d{{4}})-(?P<m3>\d{{2}})-(?P<d3>\d{{2}}))\b')
MONTH_NUM = {m: i for i, ms in enumerate(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov',
                                          'dec'], 1) for m in (ms,)}


def dates_in(text):
    out = []
    for m in DATE_RX.finditer(text):
        try:
            if m.group('mon'):
                d = date(int(m.group('y1')), MONTH_NUM[m.group('mon').lower()[:3]], int(m.group('d1')))
            elif m.group('m2'):
                d = date(int(m.group('y2')), int(m.group('m2')), int(m.group('d2')))
            else:
                d = date(int(m.group('y3')), int(m.group('m3')), int(m.group('d3')))
        except ValueError:
            continue
        out.append((m.start(), m.end(), d))
    return out


def near(text, anchor, target, span=250):
    """True when target matches within span characters after (or shortly before) any anchor match."""
    for m in anchor.finditer(text):
        if target.search(text[max(0, m.start() - 60): m.end() + span]):
            return True
    return False


def has(text, p):
    return bool(rx(p).search(text))


ELECT_ANCHOR = rx(r'\belect(?:ion)?s?\b|\belecting\b')
DEADLINE_WORDS = rx(r'\b(?:by|no later than|on or before|before|deadline|due|postmarked|must be (?:made|received|'
                    r'returned|sent)|within)\b')
COVERAGE_END = rx(r'\bcoverage\b[^.]{0,80}\b(?:will end|ends|ended|will terminate|terminates|terminated|will be lost|'
                  r'will stop|stops|end on|terminate on)\b|\blast day of coverage\b|\bcoverage end date\b')


def stated_election_dates(text):
    """Dates that appear in a sentence about the election deadline."""
    out = []
    for s, e, d in dates_in(text):
        sentence_start = max(text.rfind('.', 0, s), text.rfind('\n', 0, s)) + 1
        window = text[sentence_start: e + 40]
        if ELECT_ANCHOR.search(window) and DEADLINE_WORDS.search(window) and not re.search(
                r'\bcoverage (?:will )?(?:end|terminate)', window, re.I):
            out.append(d)
    return out


def stated_coverage_end_dates(text):
    out = []
    for s, e, d in dates_in(text):
        sentence_start = max(text.rfind('.', 0, s), text.rfind('\n', 0, s)) + 1
        if COVERAGE_END.search(text[sentence_start: e + 20]):
            out.append(d)
    return out


def numbers_near(text, anchor_pattern, unit_pattern, span=160):
    """Whole numbers immediately followed by the unit (for example "45 days") within span of an anchor."""
    nums = []
    for m in rx(anchor_pattern).finditer(text):
        window = text[max(0, m.start() - span): m.end() + span]
        for n in re.finditer(rf'\b(\d{{1,3}})[- ]{unit_pattern}', window, re.I):
            nums.append(int(n.group(1)))
    return nums


# ------------------------------------------------------------------ content items
# Each check: (rule, severity, pattern test, message). An item is "missing" when any error-level test fails.
def election_items(text, event_type):
    eighteen = event_type in EIGHTEEN_MONTH_EVENTS
    items = [
        ('i', 'Plan name and the COBRA administrator\'s name, address and telephone number', [
            ('COBRA-E01-PLAN', 'warning', bool(PLAN_NAME.search(text)) or has(text, r'\bname of (?:the )?plan\b'),
             'No plan name was found (a name ending in "Plan", such as "Example Group Health Plan").'),
            ('COBRA-E01-ADMIN', 'error', has(text, r'\badministrat(?:or|ion)\b'),
             'The notice does not name the party responsible for administering COBRA coverage.'),
            ('COBRA-E01-PHONE', 'error', bool(PHONE.search(text)),
             'No telephone number for the COBRA administrator was found.'),
            ('COBRA-E01-ADDRESS', 'error', bool(ADDRESS.search(text)),
             'No mailing address for the COBRA administrator was found.'),
        ]),
        ('ii', 'Identification of the qualifying event', [
            ('COBRA-E02-EVENT', 'error', has(text, r'qualifying event'),
             'The notice does not identify the qualifying event.'),
            ('COBRA-E02-TYPE', 'warning', has(text, EVENT_WORDS[event_type]),
             'The notice does not appear to name the qualifying event you gave for this notice.'),
        ]),
        ('iii', 'Qualified beneficiaries, by status or name, and the date coverage ends', [
            ('COBRA-E03-BENEFICIARIES', 'error', has(text, r'qualified beneficiar'),
             'The notice does not identify the qualified beneficiaries who may elect.'),
            ('COBRA-E03-END-DATE', 'error', bool(stated_coverage_end_dates(text)),
             'No date on which plan coverage ends (or ended) was found next to a statement that coverage ends.'),
        ]),
        ('iv', 'Each qualified beneficiary\'s independent right to elect', [
            ('COBRA-E04-INDEPENDENT', 'error', has(text, r'independent(?:ly)?\b[^.]{0,40}\b(?:right|elect)'),
             'The notice does not say that each qualified beneficiary has an independent right to elect.'),
            ('COBRA-E04-ON-BEHALF', 'warning', has(text, r'on behalf of'),
             'The notice does not say that the employee or spouse may elect on behalf of the other qualified '
             'beneficiaries.'),
            ('COBRA-E04-GUARDIAN', 'warning', has(text, r'parent or (?:legal )?guardian|legal guardian'),
             'The notice does not say that a parent or legal guardian may elect for a minor child.'),
        ]),
        ('v', 'How to elect, the election period, and the date by which to elect', [
            ('COBRA-E05-PROCEDURE', 'error', has(text, r'(?:to|how to|you (?:may|can|must)) elect|election form'),
             'The notice does not explain how to elect continuation coverage.'),
            ('COBRA-E05-PERIOD', 'error', has(text, r'\b60[- ]days?\b|\bsixty\b'),
             'The notice does not state the election period (at least 60 days).'),
            ('COBRA-E05-DATE', 'error', bool(stated_election_dates(text)),
             'No specific date by which the election must be made was found. The regulation asks for the date, not '
             'only the period.'),
        ]),
        ('vi', 'What happens if you do not elect or you waive, and how to revoke a waiver', [
            ('COBRA-E06-CONSEQUENCES', 'error', has(text, r"(?:do not|don't|fail to|not to) elect|waive"),
             'The notice does not explain the consequences of not electing or of waiving coverage.'),
            ('COBRA-E06-REVOKE', 'error', has(text, r'revok|revocation|withdraw (?:a|the|your) waiver'),
             'The notice does not describe how to revoke a waiver before the election deadline.'),
            ('COBRA-E06-OTHER-RIGHTS', 'warning', has(text, r'special enrollment|marketplace|portability'),
             'The notice does not mention the effect on other coverage rights, such as special enrollment.'),
        ]),
        ('vii', 'The coverage offered and when it begins', [
            ('COBRA-E07-COVERAGE', 'error', has(text, r'same coverage|identical|summary plan description|\bSPD\b|'
                                                     r'coverage (?:you|they) (?:had|have)'),
             'The notice does not describe the coverage offered or refer to the summary plan description.'),
            ('COBRA-E07-START', 'warning', has(text, r'\b(?:begin|begins|start|starts|commence|commences|effective)\b'),
             'The notice does not say when continuation coverage begins.'),
        ]),
        ('viii', 'The maximum coverage period, the end date, and early termination', [
            ('COBRA-E08-MAXIMUM', 'error', has(text, r'\b(?:18|29|36|eighteen|thirty-six)[- ]months?\b'),
             'The notice does not state the maximum period of continuation coverage in months.'),
            ('COBRA-E08-EARLY-END', 'error', has(text, r'(?:end|terminat\w*|cut short|stop)\w*\b[^.]{0,40}\b(?:early|'
                                                       r'before the end)|(?:fail|failure) to pay|not paid|non-?payment|'
                                                       r'(?:become|becomes) covered under another'),
             'The notice does not explain what can end continuation coverage early.'),
        ]),
        ('ix', 'Extensions for disability or a second qualifying event', [
            ('COBRA-E09-DISABILITY', 'error', has(text, r'disab'),
             'The notice does not describe the disability extension.'),
            ('COBRA-E09-SECOND-EVENT', 'error', has(text, r'second qualifying event'),
             'The notice does not describe the extension for a second qualifying event.'),
        ]),
    ]
    if eighteen:
        items.append(('x', 'Your duty to give notice of a second qualifying event or a disability determination', [
            ('COBRA-E10-SSA', 'error', has(text, r'social security'),
             'The notice does not describe the notice to give after a Social Security disability determination.'),
            ('COBRA-E10-TIMING', 'error', near(text, rx(r'disab|second qualifying event'), rx(r'\b60[- ]days?\b|\bsixty\b')),
             'The notice does not give the time limit for notifying the plan of a disability determination or a '
             'second qualifying event.'),
            ('COBRA-E10-NO-LONGER', 'error', has(text, r'no longer disabled|not disabled|longer (?:be )?disabled'),
             'The notice does not explain the duty to report that a disabled beneficiary is no longer disabled.'),
        ]))
    items += [
        ('xi', 'The amount each qualified beneficiary must pay', [
            ('COBRA-E11-AMOUNT', 'error', bool(MONEY.search(text)),
             'No premium amount in dollars was found.'),
        ]),
        ('xii', 'Payment due dates, monthly payment, grace periods, where to pay, and late payment', [
            ('COBRA-E12-DUE', 'error', has(text, r'\bdue\b|first (?:day|payment)|initial (?:payment|premium)'),
             'The notice does not give the due dates for payments.'),
            ('COBRA-E12-MONTHLY', 'error', has(text, r'monthly|each month|per month|every month|month-to-month'),
             'The notice does not state the right to pay monthly.'),
            ('COBRA-E12-GRACE', 'error', has(text, r'grace period'),
             'The notice does not describe the grace period for payments.'),
            ('COBRA-E12-ADDRESS', 'error', near(text, rx(r'payments?|premiums?'), rx(r'send|mail|remit|payable to|pay to'))
             and bool(ADDRESS.search(text)),
             'The notice does not give the address to which payments should be sent.'),
            ('COBRA-E12-LATE', 'error', has(text, r'late|(?:fail|failure) to pay|not paid|non-?payment|not (?:made|'
                                                  r'received) on time'),
             'The notice does not explain the consequences of late payment or non-payment.'),
        ]),
        ('xiii', 'Keeping the administrator informed of current addresses', [
            ('COBRA-E13-ADDRESSES', 'error', has(text, r'(?:inform|notify|keep|tell|let)\b[^.]{0,80}\baddress|'
                                                     r'address(?:es)?\b[^.]{0,60}\b(?:change|current|up to date)'),
             'The notice does not explain the importance of keeping the administrator informed of current addresses.'),
        ]),
        ('xiv', 'A statement that the notice does not fully describe coverage, and where to find more', [
            ('COBRA-E14-STATEMENT', 'error', has(text, r'(?:does not|doesn\'t|not)\s+(?:fully|completely)\s+describe|'
                                                     r'not a (?:full|complete) description|more complete information'),
             'The notice does not state that it does not fully describe continuation coverage and where more complete '
             'information is available.'),
        ]),
    ]
    return items


def general_items(text):
    return [
        ('1', 'Plan name and who to contact, with address and telephone number', [
            ('COBRA-G01-PLAN', 'warning', bool(PLAN_NAME.search(text)) or has(text, r'\bname of (?:the )?plan\b'),
             'No plan name was found (a name ending in "Plan").'),
            ('COBRA-G01-PHONE', 'error', bool(PHONE.search(text)), 'No contact telephone number was found.'),
            ('COBRA-G01-ADDRESS', 'error', bool(ADDRESS.search(text)), 'No contact address was found.'),
        ]),
        ('2', 'A general description of continuation coverage', [
            ('COBRA-G02-WHO', 'error', has(text, r'spouse') and has(text, r'dependent child|children'),
             'The notice does not identify who may become a qualified beneficiary (employee, spouse, dependent '
             'children).'),
            ('COBRA-G02-EVENTS', 'error', has(text, r'qualifying event') and has(text, r'reduc\w* (?:in|of) (?:your )?'
                                                                               r'hours|end of (?:your )?employment|'
                                                                               r'termination'),
             'The notice does not describe the qualifying events.'),
            ('COBRA-G02-EMPLOYER', 'error', near(text, rx(r'employer'), rx(r'notif|notice')),
             'The notice does not state the employer\'s obligation to notify the plan administrator of certain '
             'qualifying events.'),
            ('COBRA-G02-MAXIMUM', 'error', has(text, r'\b(?:18|36|eighteen|thirty-six)[- ]months?\b'),
             'The notice does not state the maximum coverage period.'),
            ('COBRA-G02-EXTENSION', 'error', has(text, r'disab') and has(text, r'second qualifying event'),
             'The notice does not explain when coverage may be extended (disability, second qualifying event).'),
            ('COBRA-G02-PREMIUM', 'error', has(text, r'premium|pay for'),
             'The notice does not mention the requirement to pay for continuation coverage.'),
        ]),
        ('3', 'Your duty to notify the plan of divorce, legal separation or a child losing dependent status', [
            ('COBRA-G03-EVENTS', 'error', has(text, r'divorce') and has(text, r'legal separation') and
             has(text, r'dependent'),
             'The notice does not cover divorce, legal separation and loss of dependent status as events you must '
             'report.'),
            ('COBRA-G03-PROCEDURE', 'error', has(text, r'\b60[- ]days?\b|\bsixty\b') and
             has(text, r'in writing|procedure|form|contact|send'),
             'The notice does not give the procedure and time limit for reporting these events.'),
        ]),
        ('4', 'Your duty to report a Social Security disability determination', [
            ('COBRA-G04-SSA', 'error', has(text, r'social security') and has(text, r'disab'),
             'The notice does not explain the duty to report a Social Security disability determination.'),
        ]),
        ('5', 'Keeping the administrator informed of current addresses', [
            ('COBRA-G05-ADDRESSES', 'error', has(text, r'(?:inform|notify|keep|tell|let)\b[^.]{0,80}\baddress|'
                                                     r'address(?:es)?\b[^.]{0,60}\b(?:change|current|up to date)'),
             'The notice does not explain the importance of keeping the administrator informed of addresses.'),
        ]),
        ('6', 'A statement that the notice does not fully describe coverage, and where to find more', [
            ('COBRA-G06-STATEMENT', 'error', has(text, r'(?:does not|doesn\'t|not)\s+(?:fully|completely)\s+describe|'
                                                     r'not a (?:full|complete) description|more complete information'),
             'The notice does not state that it does not fully describe continuation coverage and where to find more.'),
        ]),
    ]


EVENT_WORDS = {
    'termination': r'terminat\w* of (?:your )?employment|end of (?:your )?employment|employment (?:ended|ends|'
                   r'terminated)|termination',
    'reduction-of-hours': r'reduc\w* (?:in|of) (?:your |the )?(?:work )?hours',
    'death': r'\bdeath\b|\bdied\b',
    'medicare-entitlement': r'medicare',
    'bankruptcy': r'bankruptcy',
    'divorce': r'divorce',
    'legal-separation': r'legal separation',
    'dependent-child': r'dependent',
}


# ------------------------------------------------------------------ deadlines and consistency
def election_deadlines(rep, data, as_of):
    ev = data.get('qualifyingEvent', {})
    et = ev['type']
    event_date = parse_date(ev.get('date'))
    loss_date = parse_date(ev.get('lossOfCoverageDate'))
    notice_date = parse_date(data.get('noticeDate'))
    admin_notified = parse_date(ev.get('administratorNotifiedDate'))
    for key, val, label in (('qualifyingEvent/date', ev.get('date'), 'the qualifying event date'),
                            ('qualifyingEvent/lossOfCoverageDate', ev.get('lossOfCoverageDate'), 'the loss of coverage date'),
                            ('qualifyingEvent/administratorNotifiedDate', ev.get('administratorNotifiedDate'),
                             'the date the administrator was notified'),
                            ('noticeDate', data.get('noticeDate'), 'the notice date')):
        if val is not None and parse_date(val) is None:
            rep.add('error', 'COBRA-DATE-FORMAT', None, f'{label[0].upper()}{label[1:]} is not a valid YYYY-MM-DD date.',
                    'cfr2590.606-4', f'/{key}')
    if event_date is None:
        rep.add('error', 'COBRA-DATE-MISSING', None, 'The qualifying event date is required for the deadline math.',
                'cfr2590.606-4', '/qualifyingEvent/date')
        return {}
    if notice_date is None:
        notice_date = as_of
    if loss_date and loss_date < event_date:
        rep.add('warning', 'COBRA-DATE-ORDER', None, 'The loss of coverage date is before the qualifying event date.',
                'cfr2590.606-4', '/qualifyingEvent/lossOfCoverageDate')
    start = loss_date if (ev.get('periodStartsAtLossOfCoverage') and loss_date) else event_date
    out = {'noticeDateUsed': 'noticeDate' if data.get('noticeDate') else 'asOf'}
    if et in BENEFICIARY_EVENTS:
        if admin_notified is None:
            rep.add('warning', 'COBRA-DEADLINE-UNKNOWN', None, 'For divorce, legal separation or a child losing '
                    'dependent status, the 14 days run from the qualified beneficiary\'s notice to the administrator. '
                    'Give administratorNotifiedDate to check the deadline.', 'cfr2590.606-4',
                    '/qualifyingEvent/administratorNotifiedDate')
            deadline = None
        else:
            deadline = admin_notified + timedelta(days=ELECTION_NOTICE_DAYS)
            out['rule'] = '14 days after the qualified beneficiary notified the administrator'
    elif ev.get('employerIsAdministrator', True):
        deadline = start + timedelta(days=EMPLOYER_IS_ADMIN_DAYS)
        out['rule'] = '44 days after the ' + ('loss of coverage' if start != event_date else 'qualifying event')
    else:
        employer_by = start + timedelta(days=EMPLOYER_TO_ADMIN_DAYS)
        out['employerToAdministratorBy'] = employer_by.isoformat()
        if admin_notified is None:
            deadline = None
            rep.add('warning', 'COBRA-DEADLINE-UNKNOWN', None, 'The employer is not the administrator, so the 14 days '
                    'run from the date the administrator was notified. Give administratorNotifiedDate to check it.',
                    'cfr2590.606-4', '/qualifyingEvent/administratorNotifiedDate')
        else:
            if admin_notified > employer_by:
                rep.add('error', 'COBRA-EMPLOYER-LATE', None, 'The employer notified the administrator more than 30 '
                        'days after the qualifying event (or loss of coverage).', 'cfr2590.606-2',
                        '/qualifyingEvent/administratorNotifiedDate')
            deadline = admin_notified + timedelta(days=ELECTION_NOTICE_DAYS)
            out['rule'] = '14 days after the administrator was notified'
    if deadline:
        out['electionNoticeDue'] = deadline.isoformat()
        if notice_date > deadline:
            rep.add('error', 'COBRA-DEADLINE-LATE', None, 'The notice goes out after the election notice deadline.',
                    'cfr2590.606-4', '/noticeDate')
    lost = loss_date or event_date
    min_end = max(lost, notice_date) + timedelta(days=ELECTION_PERIOD_DAYS)
    out['electionPeriodEndsNoEarlierThan'] = min_end.isoformat()
    return out


def election_consistency(rep, data, text, deadlines):
    ev = data.get('qualifyingEvent', {})
    et = ev['type']
    min_end = parse_date(deadlines.get('electionPeriodEndsNoEarlierThan'))
    stated = stated_election_dates(text)
    if min_end and stated and min(stated) < min_end:
        rep.add('error', 'COBRA-CONSIST-ELECTION-DATE', 'v', 'The election deadline stated in the notice is earlier '
                'than 60 days after the later of the loss of coverage and the notice date.', 'cfr54.4980B-6')
    loss = parse_date(ev.get('lossOfCoverageDate'))
    ends = stated_coverage_end_dates(text)
    if loss and ends and loss not in ends:
        rep.add('warning', 'COBRA-CONSIST-COVERAGE-END', 'iii', 'The coverage end date stated in the notice does not '
                'match the loss of coverage date you gave.', 'cfr2590.606-4')
    first = numbers_near(text, r'first (?:premium )?payment|initial (?:premium )?payment|initial premium', r'days?')
    if first and min(first) < FIRST_PAYMENT_DAYS:
        rep.add('error', 'COBRA-CONSIST-FIRST-PAYMENT', 'xii', 'The notice requires the first payment sooner than 45 '
                'days after the election.', 'cfr54.4980B-8')
    grace = numbers_near(text, r'grace period', r'days?')
    if grace and min(grace) < GRACE_DAYS:
        rep.add('error', 'COBRA-CONSIST-GRACE', 'xii', 'The notice gives a grace period shorter than 30 days.',
                'cfr54.4980B-8')
    months = set(int(m) for m in re.findall(r'\b(18|29|36)[- ]months?\b', text, re.I))
    if et in EIGHTEEN_MONTH_EVENTS:
        if months and 18 not in months:
            rep.add('error', 'COBRA-CONSIST-DURATION', 'viii', 'For termination or reduction of hours the maximum '
                    'period is 18 months, and the notice does not state 18 months.', 'cfr54.4980B-7')
    elif months and 36 not in months:
        rep.add('error', 'COBRA-CONSIST-DURATION', 'viii', 'For this qualifying event the maximum period is 36 months, '
                'and the notice does not state 36 months.', 'cfr54.4980B-7')
    pct = [int(p) for p in re.findall(r'\b(1\d\d)\s?(?:%|percent)', text, re.I)]
    if any(102 < p < 150 for p in pct) or any(p > 150 for p in pct):
        rep.add('error', 'COBRA-CONSIST-PREMIUM-PCT', 'xi', 'The notice states a premium above 102 percent of the '
                'plan cost (150 percent is allowed only during a disability extension).', 'usc1162')


def general_deadline(rep, data, as_of):
    start = parse_date(data.get('coverageStartDate'))
    raw = data.get('coverageStartDate')
    notice_date = parse_date(data.get('noticeDate')) or as_of
    if raw is not None and start is None:
        rep.add('error', 'COBRA-DATE-FORMAT', None, 'The coverage start date is not a valid YYYY-MM-DD date.',
                'cfr2590.606-1', '/coverageStartDate')
    if data.get('noticeDate') is not None and parse_date(data.get('noticeDate')) is None:
        rep.add('error', 'COBRA-DATE-FORMAT', None, 'The notice date is not a valid YYYY-MM-DD date.', 'cfr2590.606-1',
                '/noticeDate')
    if start is None:
        rep.add('warning', 'COBRA-DEADLINE-UNKNOWN', None, 'Give coverageStartDate to check the 90-day deadline for the '
                'general notice.', 'cfr2590.606-1', '/coverageStartDate')
        return {}
    due = start + timedelta(days=GENERAL_NOTICE_DAYS)
    if notice_date > due:
        rep.add('error', 'COBRA-DEADLINE-LATE', None, 'The general notice goes out more than 90 days after coverage '
                'began.', 'cfr2590.606-1', '/noticeDate')
    return {'generalNoticeDue': due.isoformat(), 'rule': '90 days after coverage begins',
            'noticeDateUsed': 'noticeDate' if data.get('noticeDate') else 'asOf'}


# ------------------------------------------------------------------ run
READINESS = {
    'election': [('content', 'All required content items present'), ('deadline', 'Sent within the deadline'),
                 ('consistency', 'Stated dates and terms meet the minimums'), ('medicare', 'Medicare explained'),
                 ('privacy', 'No personal identifiers in the draft')],
    'general': [('content', 'All required content items present'), ('deadline', 'Sent within the deadline'),
                ('privacy', 'No personal identifiers in the draft')],
}


def _area(f):
    r = f['ruleId']
    if r.startswith(('COBRA-E', 'COBRA-G')):
        return 'content'
    if r.startswith('COBRA-CONSIST'):
        return 'consistency'
    if r.startswith('COBRA-MEDICARE'):
        return 'medicare'
    if r.startswith('COBRA-PII'):
        return 'privacy'
    return 'deadline'


def validate(body: bytes, *, as_of=None, demo=False):
    if demo and demo_sample(body) is None:
        raise InputError(DEMO_ONLY_SAMPLES)
    data, nt, text = parse_body(body)
    today = datetime.now(timezone.utc).date()
    as_of = as_of or parse_date(data.get('asOf')) or today
    rep = Report()
    if nt == 'election':
        et = data['qualifyingEvent']['type']
        items = election_items(text, et)
        src = 'cfr2590.606-4'
    else:
        items = general_items(text)
        src = 'cfr2590.606-1'
    checklist = []
    for item, label, checks in items:
        missing = False
        for rule, sev, ok, msg in checks:
            if not ok:
                rep.add(sev, rule, item, msg, src)
                missing = missing or sev == 'error'
        checklist.append({'item': item, 'label': label,
                          'status': 'missing' if missing else ('review' if any(not ok for _, _, ok, _ in checks)
                                                               else 'found')})
    if nt == 'election':
        deadlines = election_deadlines(rep, data, as_of)
        election_consistency(rep, data, text, deadlines)
        if not has(text, r'medicare'):
            rep.add('warning', 'COBRA-MEDICARE', None, 'The notice does not explain how COBRA and Medicare interact, as '
                    'the DOL model election notice does.', 'dol-model-2020')
    else:
        deadlines = general_deadline(rep, data, as_of)
    if SSN.search(text):
        rep.add('warning', 'COBRA-PII-SSN', None, 'The notice contains what looks like a Social Security number. '
                'Remove personal identifiers before sending a draft for checking.', 'cfr2590.606-4')
    return finish(rep, nt, data, items, checklist, deadlines, body, as_of)


def finish(rep, nt, data, items, checklist, deadlines, body, as_of):
    order = {'error': 0, 'warning': 1}
    findings = sorted(rep.findings, key=lambda f: (order[f['severity']], f['ruleId']))
    c = Counter(f['severity'] for f in findings)
    worst = {}
    for f in findings:
        a = _area(f)
        if worst.get(a) != 'fix':
            worst[a] = 'fix' if f['severity'] == 'error' else 'review'
    readiness = []
    for key, label in READINESS[nt]:
        st = worst.get(key, 'ready')
        if key == 'deadline' and not deadlines.get('electionNoticeDue') and not deadlines.get('generalNoticeDue') \
                and st == 'ready':
            st = 'not-checked'
        readiness.append({'item': key, 'label': label, 'status': st})
    found = sum(1 for x in checklist if x['status'] != 'missing')
    return {
        'schemaVersion': 1,
        'status': 'FAIL' if c['error'] else ('WARN' if c['warning'] else 'PASS'),
        'noticeType': nt,
        'qualifyingEventType': data.get('qualifyingEvent', {}).get('type') if nt == 'election' else None,
        'asOf': as_of.isoformat(),
        'regulation': '29 CFR 2590.606-4(b)(4)' if nt == 'election' else '29 CFR 2590.606-1(c)',
        'contentItems': {'required': len(checklist), 'found': found, 'missing': len(checklist) - found},
        'checklist': checklist,
        'deadlines': deadlines,
        'readiness': readiness,
        'findingCount': len(findings),
        'findingCounts': {'error': c['error'], 'warning': c['warning']},
        'ruleCounts': dict(sorted(Counter(f['ruleId'] for f in findings).items())),
        'findings': findings,
        'notChecked': [
            'Whether the wording is legally sufficient in context. A pattern can find that an item is addressed, not '
            'that it is right.',
            'Whether the premium amounts, plan details and beneficiaries named are correct for your plan.',
            'Whether the notice was actually delivered, and how (first-class mail, separate notices to a spouse at '
            'another address).',
            'State continuation (mini-COBRA) laws, and plans of employers with fewer than 20 employees, which federal '
            'COBRA does not cover.',
            'The notice of unavailability, the notice of early termination and the employer notice to the '
            'administrator.',
        ],
        'sources': SOURCES,
        'scope': 'A content-completeness and deadline check of the draft you sent. A clean report is not legal advice, '
                 'not a substitute for benefits counsel, and not a guarantee against DOL penalties or lawsuits.',
        'input': {'format': 'file' if 'noticeFile' in data else 'text', 'bytes': len(body)},
        'inputSha256': hashlib.sha256(body).hexdigest(),
    }
