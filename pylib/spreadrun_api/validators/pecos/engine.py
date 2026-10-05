"""SpreadRun PECOS Medicare Enrollment Pre-Check (SpreadRun's own engine, not a DataForge copy).

Checks a draft CMS-855I, CMS-855B or CMS-855S enrollment, revalidation or change of information, sent as JSON, for
deterministic problems before it goes into PECOS. One live call per run to the public NPPES NPI Registry API checks
the NPI, its type, the name and the taxonomy codes. Registry data is used inside the run only: it is not stored,
cached or returned (the report says which checks ran, never what the registry holds).

Reports never repeat a value from the submission: findings carry a rule ID, a JSON path and a fixed message.

Sources (checked October 2026):
  CMS-855I (05/23), CMS-855B (12/2025), CMS-855S (12/23) and their instructions
  42 CFR 424.502, 424.510(d), 424.515, 424.540, 424.57
  CMS NPI check digit (Luhn with the 80840 prefix), NPPES NPI Registry API v2.1
"""
import hashlib
import json
import re
import unicodedata
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

MAX_FINDINGS = 500
MAX_ITEMS = 200            # locations, credentials, officials, documents, taxonomy codes each
MAX_TEXT = 300
DEFAULT_WINDOW_DAYS = 90
NPPES_URL = 'https://npiregistry.cms.hhs.gov/api/'
NPPES_TIMEOUT = 8

SOURCES = {
    'cms855i': 'CMS-855I (05/23), Medicare enrollment application for physicians and non-physician practitioners',
    'cms855b': 'CMS-855B (12/2025), Medicare enrollment application for clinics, group practices and certain other suppliers',
    'cms855s': 'CMS-855S (12/23), Medicare enrollment application for DMEPOS suppliers',
    'cfr424.510': '42 CFR 424.510(d), enrollment application content and signature requirements',
    'cfr424.515': '42 CFR 424.515, revalidation every 5 years (3 years for DMEPOS suppliers)',
    'cfr424.540': '42 CFR 424.540, deactivation, and no payment for services furnished while deactivated',
    'cfr424.57': '42 CFR 424.57, DMEPOS supplier standards (posted hours, liability insurance, surety bond)',
    'npi': 'CMS NPI check digit (Luhn formula with the 80840 prefix)',
    'nppes': 'NPPES NPI Registry API, version 2.1 (queried live during the run)',
}
FORM_SOURCE = {'855I': 'cms855i', '855B': 'cms855b', '855S': 'cms855s'}
TYPES = tuple(FORM_SOURCE)
REASONS = ('initial', 'revalidation', 'change')
STATES = set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC '
             'ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR VI GU AS MP'.split())
CREDENTIAL_TYPES = ('license', 'certification', 'dea', 'liability_insurance', 'malpractice_insurance', 'surety_bond',
                    'accreditation')
ROLES = ('authorized', 'delegated')

# Supporting documents, by form, from Section 12 (855I, 855B) and the 855S supporting documentation list. Each entry:
# key -> (label, condition key or None for always, form section). A condition key names a boolean in "conditions";
# a leading "!" means "required unless that condition is true".
DOCUMENTS = {
    '855I': {
        'cp575': ('IRS confirmation of the TIN and legal business name (for example CP-575)', 'usesEin', 'Section 12'),
        'irs8832': ('IRS Form 8832 (LLC treated as a disregarded entity)', 'llcDisregarded', 'Section 12'),
        'irs501c3': ('IRS 501(c)(3) determination letter', 'nonprofit', 'Section 12'),
        'cms588': ('CMS-588 EFT authorization with a voided check or bank letter', '!eftNotNeeded', 'Section 12'),
        'cms460': ('CMS-460 participation agreement', 'participating', 'Section 12'),
        'adverseActions': ('Final adverse legal action documentation', 'hasAdverseActions', 'Section 12'),
        'certificationProof': ('Certification and proof of educational requirements', 'requiresCertification', 'Section 12'),
    },
    '855B': {
        'licenses': ('Licenses, certifications and registrations required by Medicare or State law', None, 'Section 12'),
        'cp575': ('IRS confirmation of the TIN and legal business name (for example CP-575)', '!cp575NotNeeded', 'Section 12'),
        'cms588': ('CMS-588 EFT authorization with a voided check or bank letter', '!eftNotNeeded', 'Section 12'),
        'cms460': ('CMS-460 participation agreement', 'participating', 'Section 12'),
        'adverseActions': ('Final adverse legal action documentation', 'hasAdverseActions', 'Section 12'),
        'ownershipChange': ('Bill of sale or sales agreement for the ownership change', 'ownershipChange', 'Section 12'),
        'orgChart': ('Organizational structure diagram', 'hasOrganizationalOwners', 'Section 12'),
        'idtfLiabilityInsurance': ('Comprehensive liability insurance policy (IDTFs)', 'idtf', 'Section 12'),
    },
    '855S': {
        'licenses': ('Professional and business licenses', None, 'Supporting documentation'),
        'liabilityInsurance': ('Certificate of comprehensive liability insurance', None, 'Supporting documentation'),
        'cp575': ('IRS document showing the TIN and legal business name (for example CP-575)', None, 'Section 4A'),
        'cms588': ('CMS-588 EFT authorization with a voided check', '!eftNotNeeded', 'Supporting documentation'),
        'applicationFee': ('Proof of application fee payment', '!feeNotDue', 'Supporting documentation'),
        'suretyBond': ('Copy of the surety bond', '!suretyBondExempt', 'Supporting documentation'),
        'irs501c3': ('IRS 501(c)(3) determination letter', 'nonprofit', 'Supporting documentation'),
        'adverseActions': ('Final adverse legal action documentation', 'hasAdverseActions', 'Supporting documentation'),
        'contracts': ('Contracts for order filling, fabrication or fitting', 'contractedServices', 'Supporting documentation'),
    },
}
CONDITIONS = sorted({c.lstrip('!') for f in DOCUMENTS.values() for (_, c, _) in f.values() if c} | {'soleProprietor'})

READINESS = [
    ('npi', 'NPI is well formed and active in NPPES as the right type'),
    ('names', 'Legal name matches the IRS name and the NPPES record'),
    ('taxonomy', 'Taxonomy codes match the NPPES record'),
    ('addresses', 'Practice locations are complete, with ZIP+4'),
    ('credentials', 'Licenses, registrations and insurance stay current through the processing window'),
    ('documents', 'Supporting documents for this form are ready'),
    ('signatures', 'The right person is set to sign'),
    ('revalidation', 'Revalidation is not past its due date'),
]
RULE_AREA = {
    'PEC-NPI': 'npi', 'PEC-NPPES-FOUND': 'npi', 'PEC-NPPES-STATUS': 'npi', 'PEC-NPPES-TYPE': 'npi',
    'PEC-NAME': 'names', 'PEC-NPPES-NAME': 'names', 'PEC-NPPES-TAXONOMY': 'taxonomy', 'PEC-TAXONOMY': 'taxonomy',
    'PEC-ADDR': 'addresses', 'PEC-ZIP': 'addresses', 'PEC-STATE': 'addresses', 'PEC-PHONE': 'addresses',
    'PEC-HOURS': 'addresses', 'PEC-LOC': 'addresses', 'PEC-CRED': 'credentials', 'PEC-DOC': 'documents',
    'PEC-SIGN': 'signatures', 'PEC-REVAL': 'revalidation',
}


class InputError(ValueError):
    """The input cannot be checked. Never billed."""


class RegistryUnavailable(RuntimeError):
    """NPPES could not be reached. The run stops and is never billed."""


# ------------------------------------------------------------------ registry
def nppes_lookup(npi):
    """One live NPPES call. Returns the first result dict, or None when the NPI is not in the registry.
    Nothing is cached: every run asks again."""
    url = NPPES_URL + '?' + urlencode({'version': '2.1', 'number': npi})
    try:
        with urlopen(Request(url, headers={'Accept': 'application/json', 'User-Agent': 'SpreadRun-PECOS-Precheck'}),
                     timeout=NPPES_TIMEOUT) as res:
            data = json.loads(res.read(2_000_000))
    except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
        raise RegistryUnavailable(type(exc).__name__) from None
    if not isinstance(data, dict) or 'Errors' in data:
        raise RegistryUnavailable('registry error')
    results = data.get('results') or []
    return results[0] if results else None


# ------------------------------------------------------------------ helpers
def npi_check_digit_ok(npi):
    """CMS NPI check digit: Luhn over the 9 base digits with the 80840 prefix (the constant 24 stands in for it)."""
    if not re.fullmatch(r'\d{10}', npi):
        return False
    total = 24
    for i, ch in enumerate(reversed(npi[:9])):
        d = int(ch)
        if i % 2 == 0:
            d *= 2
            d = d - 9 if d > 9 else d
        total += d
    return (10 - total % 10) % 10 == int(npi[9])


def norm_name(v):
    v = unicodedata.normalize('NFKC', str(v or '')).casefold()
    return re.sub(r'\s+', ' ', v).strip()


def bare_name(v):
    return re.sub(r'[^0-9a-z]+', '', norm_name(v))


def parse_date(v):
    if not isinstance(v, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', v.strip()):
        return None
    try:
        return date.fromisoformat(v.strip())
    except ValueError:
        return None


def text(v):
    return v.strip() if isinstance(v, str) else ''


class Report:
    def __init__(self):
        self.findings = []

    def add(self, sev, rule, path, msg, source=None):
        f = {'severity': sev, 'ruleId': rule, 'path': path, 'message': msg}
        if source:
            f['source'] = source
        self.findings.append(f)


# ------------------------------------------------------------------ input
def parse_body(body: bytes):
    try:
        data = json.loads(body.decode('utf-8'))
    except (UnicodeDecodeError, ValueError):
        raise InputError('Send the enrollment draft as a UTF-8 JSON object.') from None
    if not isinstance(data, dict):
        raise InputError('Send the enrollment draft as a JSON object.')
    et = data.get('enrollmentType')
    if et not in TYPES:
        raise InputError('enrollmentType must be one of 855I, 855B or 855S. Other CMS-855 forms are not supported yet.')
    reason = data.get('applicationReason', 'initial')
    if reason not in REASONS:
        raise InputError('applicationReason must be initial, revalidation or change.')
    if not isinstance(data.get('provider'), dict):
        raise InputError('provider is required: an object with the NPI and legal name.')
    for key in ('practiceLocations', 'credentials', 'officials', 'documents'):
        v = data.get(key, [])
        if not isinstance(v, list) or len(v) > MAX_ITEMS:
            raise InputError(f'{key} must be a list of at most {MAX_ITEMS} items.')
        if key != 'documents' and not all(isinstance(x, dict) for x in v):
            raise InputError(f'Every item in {key} must be an object.')
        if key == 'documents' and not all(isinstance(x, str) and len(x) <= 60 for x in v):
            raise InputError('documents must be a list of document keys.')
    cond = data.get('conditions', {})
    if not isinstance(cond, dict) or not all(isinstance(v, bool) for v in cond.values()):
        raise InputError('conditions must be an object of true or false values.')
    tax = data['provider'].get('taxonomyCodes', [])
    if not isinstance(tax, list) or len(tax) > MAX_ITEMS or not all(isinstance(x, str) for x in tax):
        raise InputError('provider.taxonomyCodes must be a list of taxonomy code strings.')
    window = data.get('processingWindowDays', DEFAULT_WINDOW_DAYS)
    if isinstance(window, bool) or not isinstance(window, int) or not 1 <= window <= 365:
        raise InputError('processingWindowDays must be a whole number from 1 to 365.')
    for k, v in _walk(data):
        if isinstance(v, str) and len(v) > MAX_TEXT:
            raise InputError(f'A text value is over {MAX_TEXT} characters (at {k}).')
    return data


def _walk(v, path=''):
    if isinstance(v, dict):
        for k, x in v.items():
            yield from _walk(x, f'{path}/{k}')
    elif isinstance(v, list):
        for i, x in enumerate(v):
            yield from _walk(x, f'{path}[{i}]')
    else:
        yield path or '/', v


# ------------------------------------------------------------------ checks
def check_npi(rep, data, lookup):
    """Returns the registry record (used in this run only) or None."""
    src = FORM_SOURCE[data['enrollmentType']]
    npi = text(data['provider'].get('npi'))
    if not npi:
        rep.add('error', 'PEC-NPI-MISSING', '/provider/npi', 'The NPI is missing. Every CMS-855 application asks for it.',
                'cfr424.510')
        return None, False
    if not re.fullmatch(r'\d{10}', npi):
        rep.add('error', 'PEC-NPI-FORMAT', '/provider/npi', 'An NPI is exactly 10 digits.', 'npi')
        return None, False
    if not npi_check_digit_ok(npi):
        rep.add('error', 'PEC-NPI-CHECKDIGIT', '/provider/npi',
                'The NPI fails the CMS check digit test, so it is mistyped. The registry was not queried.', 'npi')
        return None, False
    rec = lookup(npi)
    if rec is None:
        rep.add('error', 'PEC-NPPES-FOUND', '/provider/npi', 'The NPI is not in the NPPES NPI Registry.', 'nppes')
        return None, True
    if (rec.get('basic') or {}).get('status') != 'A':
        rep.add('error', 'PEC-NPPES-STATUS', '/provider/npi', 'The NPI is not active in the NPPES NPI Registry.', 'nppes')
    et, kind = data['enrollmentType'], rec.get('enumeration_type')
    sole = data.get('conditions', {}).get('soleProprietor') is True
    if et == '855I' and kind != 'NPI-1':
        rep.add('error', 'PEC-NPPES-TYPE', '/provider/npi',
                'A CMS-855I is for an individual practitioner, but this NPI is registered to an organization (Type 2). '
                'Use the practitioner\'s individual NPI.', src)
    elif et == '855B' and kind != 'NPI-2':
        rep.add('error', 'PEC-NPPES-TYPE', '/provider/npi',
                'A CMS-855B is for an organization, but this NPI is registered to an individual (Type 1). Use the '
                'organization\'s NPI.', src)
    elif et == '855S' and kind == 'NPI-1' and not sole:
        rep.add('warning', 'PEC-NPPES-TYPE', '/provider/npi',
                'This NPI is registered to an individual (Type 1). That fits a sole proprietor; an incorporated DMEPOS '
                'supplier uses its organization NPI. Set conditions.soleProprietor if this is a sole proprietorship.', src)
    return rec, True


def check_names(rep, data, rec):
    et, p = data['enrollmentType'], data['provider']
    src = FORM_SOURCE[et]
    cond = data.get('conditions', {})
    individual = et == '855I' or (et == '855S' and cond.get('soleProprietor') is True)
    lbn, irs = text(p.get('legalName')), text(p.get('irsLegalName'))
    if individual:
        if not text(p.get('firstName')) or not text(p.get('lastName')):
            rep.add('error', 'PEC-NAME-MISSING', '/provider', 'The practitioner\'s first and last legal name are required.', src)
    elif not lbn:
        rep.add('error', 'PEC-NAME-MISSING', '/provider/legalName',
                'The legal business name is missing. It must be the name reported to the IRS.', src)
    irs_needed = (not individual) or cond.get('usesEin') is True
    if irs_needed and lbn:
        if not irs:
            rep.add('error', 'PEC-NAME-IRS-MISSING', '/provider/irsLegalName',
                    'Give the legal business name exactly as it appears on the IRS document (for example CP-575) so it '
                    'can be compared.', src)
        elif norm_name(lbn) != norm_name(irs):
            if bare_name(lbn) == bare_name(irs):
                rep.add('warning', 'PEC-NAME-IRS-PUNCT', '/provider/legalName',
                        'The legal business name differs from the IRS name only in punctuation or spacing. Enter it '
                        'exactly as the IRS shows it.', src)
            else:
                rep.add('error', 'PEC-NAME-IRS', '/provider/legalName',
                        'The legal business name does not match the IRS name you gave. CMS requires the name reported to '
                        'the IRS.', src)
    if rec is None:
        return
    b = rec.get('basic') or {}
    if rec.get('enumeration_type') == 'NPI-2' and lbn and not individual:
        if bare_name(lbn) != bare_name(b.get('organization_name')):
            rep.add('error' if et == '855B' else 'warning', 'PEC-NPPES-NAME', '/provider/legalName',
                    'The legal business name does not match the organization name on the NPPES record for this NPI. The '
                    'CMS-855B asks for the same legal business name and TIN used to get the NPI.', src)
    elif rec.get('enumeration_type') == 'NPI-1' and individual:
        if (bare_name(p.get('firstName')) != bare_name(b.get('first_name'))
                or bare_name(p.get('lastName')) != bare_name(b.get('last_name'))):
            rep.add('warning', 'PEC-NPPES-NAME', '/provider',
                    'The practitioner\'s name does not match the NPPES record for this NPI. Update NPPES or the draft so '
                    'they agree.', src)


def check_taxonomy(rep, data, rec):
    codes = [text(c).upper() for c in data['provider'].get('taxonomyCodes', [])]
    for i, c in enumerate(codes):
        if not re.fullmatch(r'[0-9A-Z]{9}X', c):
            rep.add('error', 'PEC-TAXONOMY-FORMAT', f'/provider/taxonomyCodes[{i}]',
                    'A taxonomy code is 10 characters: 9 letters or digits followed by X.', 'nppes')
    if not codes:
        rep.add('warning', 'PEC-TAXONOMY-MISSING', '/provider/taxonomyCodes',
                'No taxonomy codes were given, so they were not compared with NPPES.', 'nppes')
        return
    if rec is None:
        return
    reg = [(t.get('code') or '').upper() for t in rec.get('taxonomies') or []]
    primary = [(t.get('code') or '').upper() for t in rec.get('taxonomies') or [] if t.get('primary') is True]
    for i, c in enumerate(codes):
        if re.fullmatch(r'[0-9A-Z]{9}X', c) and c not in reg:
            rep.add('warning', 'PEC-NPPES-TAXONOMY', f'/provider/taxonomyCodes[{i}]',
                    'This taxonomy code is not on the NPPES record for the NPI. Update NPPES or the draft so they agree.',
                    'nppes')
    if primary and codes[0] not in primary and codes[0] in reg:
        rep.add('warning', 'PEC-NPPES-TAXONOMY-PRIMARY', '/provider/taxonomyCodes[0]',
                'The first taxonomy code (treated as primary) is not the primary taxonomy on the NPPES record.', 'nppes')


def check_locations(rep, data):
    et = data['enrollmentType']
    src = FORM_SOURCE[et]
    locs = data.get('practiceLocations', [])
    if not locs:
        rep.add('error' if et in ('855B', '855S') else 'warning', 'PEC-LOC-NONE', '/practiceLocations',
                'No practice location was given. The form asks for every location where services are furnished.', src)
    for i, loc in enumerate(locs):
        at = f'/practiceLocations[{i}]'
        for k, label in (('street1', 'street address'), ('city', 'city'), ('state', 'state'), ('zip', 'ZIP code')):
            if not text(loc.get(k)):
                rep.add('error', 'PEC-ADDR-REQUIRED', f'{at}/{k}', f'The practice location {label} is missing.', src)
        street = text(loc.get('street1'))
        if re.search(r'\bp\.?\s*o\.?\s*box\b|\bpost\s+office\s+box\b', street, re.I):
            rep.add('error', 'PEC-ADDR-POBOX', f'{at}/street1',
                    'A practice location must be a street address, not a P.O. box.', src)
        st = text(loc.get('state')).upper()
        if st and st not in STATES:
            rep.add('error', 'PEC-STATE', f'{at}/state', 'Use the 2-letter postal code for a US state or territory.', src)
        z = text(loc.get('zip'))
        if z:
            if re.fullmatch(r'\d{5}', z):
                rep.add('warning', 'PEC-ZIP-PLUS4', f'{at}/zip',
                        'Only 5 digits. The form asks for ZIP code + 4; look up the full ZIP+4 for this address.', src)
            elif not re.fullmatch(r'\d{5}-?\d{4}', z):
                rep.add('error', 'PEC-ZIP-FORMAT', f'{at}/zip', 'A ZIP code is 5 digits, or ZIP+4 as 12345-6789.', src)
        phone = text(loc.get('phone'))
        digits = re.sub(r'\D', '', phone)
        if not phone:
            rep.add('warning', 'PEC-PHONE-MISSING', f'{at}/phone',
                    'No telephone number for this location. The form asks for one if applicable.', src)
        elif not (len(digits) == 10 or (len(digits) == 11 and digits[0] == '1')):
            rep.add('warning', 'PEC-PHONE-FORMAT', f'{at}/phone', 'A US telephone number has 10 digits.', src)
        if et == '855S':
            hours = loc.get('hoursPerWeek')
            if hours is None or isinstance(hours, bool) or not isinstance(hours, (int, float)):
                rep.add('error', 'PEC-HOURS-MISSING', f'{at}/hoursPerWeek',
                        'Give the posted hours of operation for this location. DMEPOS suppliers must post them, and the '
                        'CMS-855S asks for them.', 'cfr424.57')
            elif hours < 30 and loc.get('hoursExceptionApplies') is not True:
                rep.add('warning', 'PEC-HOURS-30', f'{at}/hoursPerWeek',
                        'Under 30 hours a week. DMEPOS supplier standards require at least 30 hours open to the public, '
                        'with limited exceptions. Set hoursExceptionApplies if one applies.', 'cfr424.57')


def check_credentials(rep, data, as_of, window_end):
    et = data['enrollmentType']
    creds = data.get('credentials', [])
    types = []
    for i, c in enumerate(creds):
        at = f'/credentials[{i}]'
        t = c.get('type')
        if t not in CREDENTIAL_TYPES:
            rep.add('error', 'PEC-CRED-TYPE', f'{at}/type', 'Unknown credential type. Use one of: '
                    + ', '.join(CREDENTIAL_TYPES) + '.')
            continue
        types.append(t)
        if c.get('notApplicable') is True:
            continue
        exp_raw = c.get('expirationDate')
        if exp_raw in (None, ''):
            if t in ('license', 'dea', 'liability_insurance', 'malpractice_insurance', 'surety_bond'):
                rep.add('warning', 'PEC-CRED-NO-EXPIRY', f'{at}/expirationDate',
                        'No expiration date, so this item could not be checked against the processing window.')
            continue
        exp = parse_date(exp_raw)
        if exp is None:
            rep.add('error', 'PEC-CRED-DATE', f'{at}/expirationDate', 'Use a full date in YYYY-MM-DD format.')
        elif exp < as_of:
            rep.add('error', 'PEC-CRED-EXPIRED', f'{at}/expirationDate', 'This item has already expired. Renew it before you submit.')
        elif exp <= window_end:
            rep.add('warning', 'PEC-CRED-EXPIRING', f'{at}/expirationDate',
                    'This item expires inside the processing window you set. Renew it now, or plan to report the renewal '
                    'while the application is pending.')
    if et == '855I' and 'license' not in types:
        rep.add('warning', 'PEC-CRED-LICENSE', '/credentials',
                'No state license listed. The CMS-855I asks for active license information.', 'cms855i')
    if et == '855S':
        if 'liability_insurance' not in types:
            rep.add('error', 'PEC-CRED-LIABILITY', '/credentials',
                    'No comprehensive liability insurance listed. DMEPOS suppliers must carry it.', 'cfr424.57')
        if 'surety_bond' not in types and data.get('conditions', {}).get('suretyBondExempt') is not True:
            rep.add('error', 'PEC-CRED-SURETY', '/credentials',
                    'No surety bond listed. DMEPOS suppliers need one unless an exemption applies (set '
                    'conditions.suretyBondExempt).', 'cfr424.57')


def check_documents(rep, data):
    et = data['enrollmentType']
    have = {d.strip() for d in data.get('documents', [])}
    cond = data.get('conditions', {})
    required = []
    for key, (label, c, section) in DOCUMENTS[et].items():
        if c is None:
            need = True
        elif c.startswith('!'):
            need = cond.get(c[1:]) is not True
        else:
            need = cond.get(c) is True
        if need:
            required.append(key)
            if key not in have:
                rep.add('error', 'PEC-DOC-MISSING', f'/documents/{key}',
                        f'Missing supporting document: {label} ({section} of the form).', FORM_SOURCE[et])
    unknown = sorted(have - set(DOCUMENTS[et]))
    if unknown:
        rep.add('warning', 'PEC-DOC-UNKNOWN', '/documents',
                f'{len(unknown)} document {"key is" if len(unknown) == 1 else "keys are"} not used for this form and '
                f'{"was" if len(unknown) == 1 else "were"} ignored. See the docs for the list.')
    return required


def check_signatures(rep, data):
    et, reason = data['enrollmentType'], data.get('applicationReason', 'initial')
    if et == '855I' or (et == '855S' and data.get('conditions', {}).get('soleProprietor') is True):
        return
    roles = [o.get('role') for o in data.get('officials', [])]
    for i, r in enumerate(roles):
        if r not in ROLES:
            rep.add('error', 'PEC-SIGN-ROLE', f'/officials[{i}]/role', 'role must be authorized or delegated.')
    if reason in ('initial', 'revalidation') and 'authorized' not in roles:
        rep.add('error', 'PEC-SIGN-AUTHORIZED', '/officials',
                'An organization\'s initial enrollment or revalidation must be signed by an authorized official. None is '
                'listed.', 'cfr424.510')
    elif reason == 'change' and not ({'authorized', 'delegated'} & set(roles)):
        rep.add('error', 'PEC-SIGN-AUTHORIZED', '/officials',
                'A change of information must be signed by an authorized or delegated official. None is listed.',
                'cfr424.510')


def check_revalidation(rep, data, as_of):
    if data.get('applicationReason') != 'revalidation':
        return
    raw = data.get('revalidationDueDate')
    if raw in (None, ''):
        rep.add('warning', 'PEC-REVAL-NO-DATE', '/revalidationDueDate',
                'No revalidation due date given. CMS posts it in the revalidation lookup; add it to check the timing.',
                'cfr424.515')
        return
    due = parse_date(raw)
    if due is None:
        rep.add('error', 'PEC-REVAL-DATE', '/revalidationDueDate', 'Use a full date in YYYY-MM-DD format.')
    elif due < as_of:
        rep.add('error', 'PEC-REVAL-PAST-DUE', '/revalidationDueDate',
                'The revalidation due date has passed. Billing privileges can be deactivated, and Medicare does not pay '
                'for services furnished while deactivated. Submit now.', 'cfr424.540')


# ------------------------------------------------------------------ run
def validate(body: bytes, *, as_of=None, lookup=None):
    data = parse_body(body)
    lookup = lookup or nppes_lookup
    today = datetime.now(timezone.utc).date()
    as_of = as_of or parse_date(data.get('asOf')) or today
    window = data.get('processingWindowDays', DEFAULT_WINDOW_DAYS)
    window_end = as_of + timedelta(days=window)
    rep = Report()
    rec, queried = check_npi(rep, data, lookup)
    check_names(rep, data, rec)
    check_taxonomy(rep, data, rec)
    check_locations(rep, data)
    check_credentials(rep, data, as_of, window_end)
    required = check_documents(rep, data)
    check_signatures(rep, data)
    check_revalidation(rep, data, as_of)
    rec = None  # registry data is not kept past the checks
    return finish(rep, data, body, as_of, window, window_end, queried, required)


def _area(rule):
    for prefix, area in sorted(RULE_AREA.items(), key=lambda kv: -len(kv[0])):
        if rule.startswith(prefix):
            return area
    return None


def finish(rep, data, body, as_of, window, window_end, queried, required):
    order = {'error': 0, 'warning': 1}
    findings = sorted(rep.findings, key=lambda f: (order[f['severity']], f['ruleId'], f['path']))
    c = Counter(f['severity'] for f in findings)
    worst = {}
    for f in findings:
        a = _area(f['ruleId'])
        if a and worst.get(a) != 'fail':
            worst[a] = 'fail' if f['severity'] == 'error' else 'review'
    readiness = []
    for key, label in READINESS:
        st = worst.get(key, 'ready')
        if key == 'revalidation' and data.get('applicationReason') != 'revalidation':
            st = 'not-applicable'
        if key in ('npi', 'names', 'taxonomy') and not queried and st == 'ready':
            st = 'not-checked'
        readiness.append({'item': key, 'label': label, 'status': st})
    return {
        'schemaVersion': 1,
        'status': 'FAIL' if c['error'] else ('WARN' if c['warning'] else 'PASS'),
        'enrollmentType': data['enrollmentType'],
        'applicationReason': data.get('applicationReason', 'initial'),
        'asOf': as_of.isoformat(),
        'processingWindowDays': window,
        'windowEnds': window_end.isoformat(),
        'registry': {'queried': queried, 'source': SOURCES['nppes'],
                     'note': 'Queried live for this run only. Registry data is not stored, cached or returned.'},
        'counts': {'practiceLocations': len(data.get('practiceLocations', [])),
                   'credentials': len(data.get('credentials', [])),
                   'documentsRequired': len(required),
                   'documentsMissing': sum(1 for f in findings if f['ruleId'] == 'PEC-DOC-MISSING')},
        'readiness': readiness,
        'findingCount': len(findings),
        'findingCounts': {'error': c['error'], 'warning': c['warning']},
        'ruleCounts': dict(sorted(Counter(f['ruleId'] for f in findings).items())),
        'findings': findings[:MAX_FINDINGS],
        'findingsTruncated': len(findings) > MAX_FINDINGS,
        'notChecked': [
            'What the Medicare Administrative Contractor reviewer sees and decides, including site visits, background '
            'checks and fingerprinting.',
            'Whether licenses, registrations and insurance are valid with the issuing board or carrier. Expiration dates '
            'are checked only as you entered them.',
            'Ownership, managing employee and final adverse action details, and PECOS screens not covered by the input.',
            'The CMS-855A, CMS-855R, CMS-855O and CMS-20134 forms.',
            'Whether the documents you marked as ready are the right ones and are complete.',
        ],
        'sources': SOURCES,
        'scope': 'A pre-submission error check of the draft you sent. A clean pre-check does not guarantee that the '
                 'enrollment will be approved, it is not an enrollment filing, and it is not legal advice.',
        'input': {'format': 'json', 'bytes': len(body)},
        'inputSha256': hashlib.sha256(body).hexdigest(),
    }
