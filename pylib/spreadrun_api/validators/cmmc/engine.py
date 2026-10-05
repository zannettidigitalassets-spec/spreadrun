"""SpreadRun CMMC Self-Assessment Score Validator (SpreadRun's own engine, not a DataForge copy).

Verifies a contractor's CMMC Level 2 self-assessment package, which is the NIST SP 800-171 Rev 2 self-assessment
whose result goes into SPRS. It recomputes the score from the per-requirement results with the CMMC Level 2 Scoring
Methodology, compares it with the score the contractor plans to post, checks the SPRS submission details and the
affirmation, and places the result against the Conditional and Final Level 2 (Self) thresholds.

Reports never repeat a value from the submission: findings carry a rule ID, a path, a requirement ID from the NIST
list and a fixed message. The verified score and deductions are computed by SpreadRun from the published point values.

Sources (checked October 2026):
  32 CFR 170.24 (scoring: 110 maximum, 5, 3 and 1 point values, partial credit for 3.5.3 and 3.13.11, SSP required,
  N/A equals MET), 170.21 (POA&M: 0.8 threshold, which requirements may be on a POA&M, 180-day closeout),
  170.16 (Level 2 self-assessment, SPRS contents, three-year cycle, affirmation), 170.22 (affirmations),
  170.4 (definitions), NIST SP 800-171 Rev 2 and SP 800-171A (June 2018), DLA (CAGE code: five characters).
"""
import csv
import hashlib
import io
import json
import re
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
_DATA = json.loads((HERE / 'requirements.json').read_text())
REQUIREMENTS = {r['id']: r for r in _DATA['requirements']}
ORDER = [r['id'] for r in _DATA['requirements']]
FAMILIES = _DATA['families']

MAX_SCORE = 110
MIN_SCORE = MAX_SCORE - sum(r['points'] or 0 for r in REQUIREMENTS.values())   # -203
CONDITIONAL_RATIO = 0.8
CONDITIONAL_MIN = -(-MAX_SCORE * 4 // 5)                                        # 88: score / 110 >= 0.8
POAM_EXCLUDED = ('3.1.20', '3.1.22', '3.12.4', '3.10.3', '3.10.4', '3.10.5')   # 170.21(a)(2)(iii)
POAM_CLOSEOUT_DAYS = 180
ASSESSMENT_CYCLE_YEARS = 3
MAX_ROWS = 300
MAX_TEXT = 200
MAX_CAGE = 50

STATUSES = {
    'MET': 'MET', 'NOTMET': 'NOT MET', 'PARTIAL': 'PARTIAL',
    'NOTAPPLICABLE': 'NOT APPLICABLE', 'NA': 'NOT APPLICABLE',
}
ID_RE = re.compile(r'^(?:([A-Z]{2})\.L2-)?(3\.\d{1,2}\.\d{1,2})$')
CAGE_RE = re.compile(r'^[A-Z0-9]{5}$')

SOURCES = {
    'cfr170.24': '32 CFR 170.24, CMMC Scoring Methodology (Level 2 point values, partial credit, SSP, N/A)',
    'cfr170.21': '32 CFR 170.21, Plan of Action and Milestones requirements (0.8 threshold, eligible requirements, '
                 '180-day closeout)',
    'cfr170.16': '32 CFR 170.16, CMMC Level 2 self-assessment (SPRS contents, three-year cycle, affirmation)',
    'cfr170.22': '32 CFR 170.22, Affirmation (Affirming Official, content, timing)',
    'cfr170.4': '32 CFR 170.4, Definitions (MET, NOT MET, N/A, CMMC Status Date, Affirming Official)',
    'nist800-171': 'NIST SP 800-171 Rev 2, the 110 CMMC Level 2 security requirements',
    'nist800-171a': 'NIST SP 800-171A (June 2018), assessment objectives (a requirement is MET only when all its '
                    'applicable objectives are met)',
    'dla-cage': 'Defense Logistics Agency: the CAGE code is five characters',
}
METHODOLOGY = {
    'name': 'CMMC Level 2 Scoring Methodology',
    'regulation': '32 CFR 170.24, as in effect October 2026',
    'requirements': 'NIST SP 800-171 Rev 2 (110 requirements), assessed with NIST SP 800-171A (June 2018)',
    'maxScore': MAX_SCORE,
    'minScore': MIN_SCORE,
    'conditionalMinimum': CONDITIONAL_MIN,
}

READINESS = [
    ('requirements', 'All 110 requirements assessed, once each'),
    ('ssp', 'System security plan in place (3.12.4)'),
    ('score', 'Score verified against the methodology'),
    ('poam', 'POA&M in place and allowed for every NOT MET requirement'),
    ('sprs', 'SPRS details: level, date, scope and CAGE codes'),
    ('affirmation', 'Affirmation by the Affirming Official'),
    ('status', 'Score reaches a Level 2 (Self) status'),
]
RULE_AREA = {
    'CMMC-REQ': 'requirements', 'CMMC-SSP': 'ssp', 'CMMC-SCORE': 'score', 'CMMC-POAM': 'poam',
    'CMMC-CAGE': 'sprs', 'CMMC-DATE': 'sprs', 'CMMC-SCOPE': 'sprs', 'CMMC-AFFIRM': 'affirmation',
    'CMMC-STATUS': 'status', 'CMMC-BAND': 'status',
}


class InputError(ValueError):
    """The request cannot be checked at all (400, not charged). Messages never repeat submitted values."""


class Report:
    def __init__(self):
        self.findings = []

    def add(self, sev, rule, path, msg, source, requirement=None):
        f = {'severity': sev, 'ruleId': rule, 'path': path, 'message': msg, 'source': source}
        if requirement:
            f['requirement'] = requirement
        self.findings.append(f)


def parse_date(v):
    if not isinstance(v, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', v.strip()):
        return None
    try:
        return date.fromisoformat(v.strip())
    except ValueError:
        return None


def _key(v):
    return re.sub(r'[^A-Z]', '', v.upper()) if isinstance(v, str) else ''


def _bool(v):
    return v is True


# ------------------------------------------------------------------ input
def parse_body(body: bytes):
    try:
        data = json.loads(body.decode('utf-8'))
    except (UnicodeDecodeError, ValueError):
        raise InputError('Send the self-assessment as a UTF-8 JSON object.') from None
    if not isinstance(data, dict):
        raise InputError('Send the self-assessment as a JSON object.')
    a = data.get('assessment')
    if not isinstance(a, dict):
        raise InputError('assessment is required: an object with the level, date, scope, CAGE codes and claimed score.')
    if str(a.get('level', '')).strip().upper() not in ('2', 'L2', 'LEVEL 2'):
        raise InputError('assessment.level must be 2. Only CMMC Level 2 self-assessments are scored; Level 1 is '
                         'MET or NOT MET in its entirety, with no score.')
    aff = data.get('affirmation', {})
    if not isinstance(aff, dict):
        raise InputError('affirmation must be an object.')
    cage = a.get('cageCodes', [])
    if not isinstance(cage, list) or len(cage) > MAX_CAGE or not all(isinstance(x, str) for x in cage):
        raise InputError(f'assessment.cageCodes must be a list of at most {MAX_CAGE} CAGE code strings.')
    cs = a.get('claimedScore')
    if cs is not None and (isinstance(cs, bool) or not isinstance(cs, int)):
        raise InputError('assessment.claimedScore must be a whole number, or left out.')
    has_list, has_csv = 'requirements' in data, 'requirementsCsv' in data
    if has_list == has_csv:
        raise InputError('Send the per-requirement results as either requirements (a list) or requirementsCsv '
                         '(CSV text), not both.')
    rows = _rows_from_list(data['requirements']) if has_list else _rows_from_csv(data['requirementsCsv'])
    if not rows:
        raise InputError('No requirement results were found.')
    if len(rows) > MAX_ROWS:
        raise InputError(f'Send at most {MAX_ROWS} requirement rows.')
    for v in _strings(data):
        if len(v) > MAX_TEXT and not (has_csv and v is data['requirementsCsv']):
            raise InputError(f'A text value is over {MAX_TEXT} characters.')
    return data, rows


def _strings(v):
    if isinstance(v, dict):
        for x in v.values():
            yield from _strings(x)
    elif isinstance(v, list):
        for x in v:
            yield from _strings(x)
    elif isinstance(v, str):
        yield v


def _rows_from_list(items):
    if not isinstance(items, list) or not all(isinstance(x, dict) for x in items):
        raise InputError('requirements must be a list of objects with id and status.')
    return [(f'/requirements[{i}]', x.get('id'), x.get('status')) for i, x in enumerate(items)]


HEADER_ID = {'REQUIREMENT', 'REQUIREMENTID', 'ID', 'CONTROL', 'CONTROLID', 'SECURITYREQUIREMENT'}
HEADER_STATUS = {'STATUS', 'RESULT', 'FINDING', 'ASSESSMENTRESULT'}


def _rows_from_csv(text):
    if not isinstance(text, str):
        raise InputError('requirementsCsv must be CSV text.')
    if len(text) > 64 * 1024:
        raise InputError('requirementsCsv is over 64 KB.')
    lines = list(csv.reader(io.StringIO(text.lstrip('﻿'))))
    lines = [ln for ln in lines if any(c.strip() for c in ln)]
    if not lines:
        raise InputError('requirementsCsv is empty.')
    head = [_key(c) for c in lines[0]]
    id_col = next((i for i, h in enumerate(head) if h in HEADER_ID), None)
    st_col = next((i for i, h in enumerate(head) if h in HEADER_STATUS), None)
    if id_col is None or st_col is None:
        raise InputError('requirementsCsv needs a header row with a requirement column and a status column, for '
                         'example: requirement,status')
    out = []
    for n, ln in enumerate(lines[1:], start=2):
        get = lambda i: ln[i] if i < len(ln) else None  # noqa: E731
        out.append((f'/requirementsCsv/row{n}', get(id_col), get(st_col)))
    return out


def norm_id(v):
    if not isinstance(v, str):
        return None
    m = ID_RE.match(v.strip().upper())
    if not m:
        return None
    rid = m.group(2)
    r = REQUIREMENTS.get(rid)
    if r is None or (m.group(1) and m.group(1) != r['family']):
        return None
    return rid


# ------------------------------------------------------------------ checks
def check_requirements(rep, rows):
    """Returns {requirement id: normalized status} for the rows that could be read."""
    seen, results = set(), {}
    for path, raw_id, raw_status in rows:
        rid = norm_id(raw_id)
        if rid is None:
            rep.add('error', 'CMMC-REQ-UNKNOWN', path, 'This row does not name one of the 110 NIST SP 800-171 Rev 2 '
                    'requirements (3.1.1 to 3.14.7, optionally with the CMMC prefix such as AC.L2-3.1.1).', 'nist800-171')
            continue
        if rid in seen:
            rep.add('error', 'CMMC-REQ-DUPLICATE', path, 'This requirement appears more than once. Each requirement '
                    'gets one result.', 'cfr170.24', rid)
            results.pop(rid, None)
            continue
        seen.add(rid)
        st = STATUSES.get(_key(raw_status))
        if st is None:
            rep.add('error', 'CMMC-REQ-STATUS', path, 'The result must be MET, NOT MET, NOT APPLICABLE, or PARTIAL '
                    '(3.5.3 and 3.13.11 only).', 'cfr170.24', rid)
            continue
        if st == 'PARTIAL' and REQUIREMENTS[rid].get('partialPoints') is None:
            rep.add('error', 'CMMC-REQ-PARTIAL', path, 'Partial credit exists only for 3.5.3 (multifactor '
                    'authentication) and 3.13.11 (FIPS-validated cryptography). Mark this requirement MET or NOT MET.',
                    'cfr170.24', rid)
            continue
        results[rid] = st
    dup = {f['requirement'] for f in rep.findings if f['ruleId'] == 'CMMC-REQ-DUPLICATE'}
    for rid in ORDER:
        if rid not in seen and rid not in dup:
            rep.add('error', 'CMMC-REQ-MISSING', f'/requirement/{rid}', 'No result for this requirement. The score is '
                    'based on all 110 requirements, including those NOT MET.', 'cfr170.24', rid)
    return results


def score(results):
    """Deductions per the methodology. Returns (score, deductions) or (None, deductions) when no score can be given."""
    deductions = []
    for rid in ORDER:
        st = results.get(rid)
        r = REQUIREMENTS[rid]
        if st in ('NOT MET', 'PARTIAL') and r['points'] is not None:
            pts = r['partialPoints'] if st == 'PARTIAL' else r['points']
            deductions.append({'requirement': rid, 'points': pts, 'partial': st == 'PARTIAL'})
    return MAX_SCORE - sum(d['points'] for d in deductions), deductions


def check_ssp(rep, data, results):
    a = data['assessment']
    st = results.get('3.12.4')
    if st in ('NOT MET', 'NOT APPLICABLE') or a.get('sspInPlace') is False:
        rep.add('error', 'CMMC-SSP-MISSING', '/requirement/3.12.4', 'No system security plan in place. Without an SSP '
                'covering each system in the assessment scope, an assessment cannot be completed and no score can be '
                'posted. An SSP is never N/A and can never go on a POA&M.', 'cfr170.24', '3.12.4')
        return False
    if a.get('sspInPlace') is not True:
        rep.add('warning', 'CMMC-SSP-CONFIRM', '/assessment/sspInPlace', 'Confirm the system security plan is in place '
                'and up to date (sspInPlace: true). The score assumes it is.', 'cfr170.24', '3.12.4')
    return st == 'MET'


def check_claim(rep, data, verified):
    cs = data['assessment'].get('claimedScore')
    if cs is None:
        return {'provided': False, 'matches': None}
    if not MIN_SCORE <= cs <= MAX_SCORE:
        rep.add('error', 'CMMC-SCORE-RANGE', '/assessment/claimedScore', f'The claimed score is outside the possible '
                f'range of {MIN_SCORE} to {MAX_SCORE}.', 'cfr170.24')
        return {'provided': True, 'matches': False}
    if verified is None:
        return {'provided': True, 'matches': None}
    if cs != verified:
        rep.add('error', 'CMMC-SCORE-MISMATCH', '/assessment/claimedScore', 'The claimed score does not match the score '
                'recomputed from the requirement results. Post the verified score, or correct the results it came '
                'from.', 'cfr170.24')
        return {'provided': True, 'matches': False}
    return {'provided': True, 'matches': True}


def check_poam(rep, data, results, deductions):
    """Which NOT MET requirements may be on a POA&M (170.21(a)(2)), and whether a POA&M is in place (170.24)."""
    blocked = []
    for d in deductions:
        rid = d['requirement']
        ok = rid not in POAM_EXCLUDED and (d['points'] <= 1 or (rid == '3.13.11' and d['partial']))
        if not ok:
            blocked.append(rid)
            why = ('is on the list that may never be on a POA&M' if rid in POAM_EXCLUDED else
                   'is worth more than 1 point as scored, and only 1-point requirements (or 3.13.11 when encryption is '
                   'employed but not FIPS-validated) may be on a POA&M')
            rep.add('warning', 'CMMC-POAM-INELIGIBLE', f'/requirement/{rid}', f'NOT MET, and this requirement {why}. '
                    'It must be MET before a Level 2 (Self) status is possible.', 'cfr170.21', rid)
    if deductions and data['assessment'].get('poamInPlace') is not True:
        rep.add('error', 'CMMC-POAM-MISSING', '/assessment/poamInPlace', 'There are NOT MET requirements, so a POA&M '
                'must be in place for each one (poamInPlace: true). A POA&M is not a substitute for a completed '
                'requirement, and the points stay deducted.', 'cfr170.24')
    return blocked


def check_sprs(rep, data, as_of):
    a = data['assessment']
    cages = [c.strip().upper() for c in a.get('cageCodes', [])]
    if not cages:
        rep.add('error', 'CMMC-CAGE-MISSING', '/assessment/cageCodes', 'SPRS needs every industry CAGE code associated '
                'with the systems in the assessment scope. None was given.', 'cfr170.16')
    for i, c in enumerate(cages):
        if not CAGE_RE.match(c):
            rep.add('error', 'CMMC-CAGE-FORMAT', f'/assessment/cageCodes[{i}]', 'A CAGE code is five characters, '
                    'letters and digits only.', 'dla-cage')
    for i, c in enumerate(cages):
        if CAGE_RE.match(c) and cages.index(c) != i:
            rep.add('warning', 'CMMC-CAGE-DUPLICATE', f'/assessment/cageCodes[{i}]', 'This CAGE code is listed more than '
                    'once.', 'cfr170.16')
    if a.get('scopeDefined') is not True:
        rep.add('error', 'CMMC-SCOPE-MISSING', '/assessment/scopeDefined', 'SPRS needs the CMMC Assessment Scope: the '
                'set of all assets that were assessed. Confirm it is defined (scopeDefined: true).', 'cfr170.16')
    raw = a.get('assessmentDate')
    d = parse_date(raw)
    if raw is None:
        rep.add('error', 'CMMC-DATE-MISSING', '/assessment/assessmentDate', 'The assessment date is missing (YYYY-MM-DD).',
                'cfr170.16')
    elif d is None:
        rep.add('error', 'CMMC-DATE-FORMAT', '/assessment/assessmentDate', 'The assessment date is not a valid date in '
                'YYYY-MM-DD form.', 'cfr170.16')
    elif d > as_of:
        rep.add('error', 'CMMC-DATE-FUTURE', '/assessment/assessmentDate', 'The assessment date is in the future.',
                'cfr170.16')
    elif _add_years(d, ASSESSMENT_CYCLE_YEARS) <= as_of:
        rep.add('error', 'CMMC-DATE-EXPIRED', '/assessment/assessmentDate', 'This assessment is more than three years '
                'old. A Level 2 self-assessment is required at least every three years, so it cannot support a current '
                'status. Assess again.', 'cfr170.16')
    return d


def check_affirmation(rep, data, assessed, as_of):
    aff = data.get('affirmation', {})
    items = (
        ('affirmingOfficialIdentified', 'Name the Affirming Official: the senior official responsible for CMMC '
         'compliance with the authority to affirm it.'),
        ('titleAndContactProvided', 'The affirmation must include the Affirming Official\'s title and contact '
         'information.'),
        ('statementAffirmed', 'The affirmation statement attests that all applicable CMMC requirements are implemented '
         'and will stay implemented. It has not been made.'),
    )
    for key, msg in items:
        if aff.get(key) is not True:
            rep.add('error', 'CMMC-AFFIRM-MISSING', f'/affirmation/{key}', msg, 'cfr170.22')
    raw = aff.get('affirmationDate')
    d = parse_date(raw)
    if raw is None:
        rep.add('warning', 'CMMC-AFFIRM-DATE', '/affirmation/affirmationDate', 'No affirmation date, so the annual '
                'affirmation could not be checked. An affirmation is due at each assessment and every year after.',
                'cfr170.22')
    elif d is None:
        rep.add('error', 'CMMC-AFFIRM-DATE', '/affirmation/affirmationDate', 'The affirmation date is not a valid date '
                'in YYYY-MM-DD form.', 'cfr170.22')
    elif d > as_of:
        rep.add('error', 'CMMC-AFFIRM-FUTURE', '/affirmation/affirmationDate', 'The affirmation date is in the future.',
                'cfr170.22')
    elif assessed and d < assessed:
        rep.add('error', 'CMMC-AFFIRM-BEFORE', '/affirmation/affirmationDate', 'The affirmation is dated before the '
                'assessment. An affirmation is required at the time of each assessment.', 'cfr170.22')
    elif _add_years(d, 1) <= as_of:
        rep.add('error', 'CMMC-AFFIRM-STALE', '/affirmation/affirmationDate', 'The last affirmation is more than a year '
                'old. Affirmation is required annually after the assessment.', 'cfr170.22')


def band(verified, blocked, ssp_ok, complete):
    if not complete or not ssp_ok or verified is None:
        return {'key': 'not-scored', 'label': 'No score: the package is incomplete',
                'reason': 'A score is only verified when all 110 requirements have a valid result and an SSP is in '
                          'place.'}
    if verified == MAX_SCORE:
        return {'key': 'final', 'label': 'Final Level 2 (Self) score',
                'reason': f'All requirements MET or N/A: {MAX_SCORE} of {MAX_SCORE}.'}
    if verified >= CONDITIONAL_MIN and not blocked:
        return {'key': 'conditional', 'label': 'Conditional Level 2 (Self) score',
                'reason': f'At least {CONDITIONAL_MIN} of {MAX_SCORE} (0.8), and every NOT MET requirement may be on a '
                          f'POA&M. The POA&M must be closed out within {POAM_CLOSEOUT_DAYS} days of the CMMC Status '
                          'Date.'}
    if verified >= CONDITIONAL_MIN:
        return {'key': 'none', 'label': 'No Level 2 (Self) status',
                'reason': 'The score reaches 0.8, but at least one NOT MET requirement may not be on a POA&M.'}
    return {'key': 'none', 'label': 'No Level 2 (Self) status',
            'reason': f'Below {CONDITIONAL_MIN} of {MAX_SCORE}, the minimum (0.8) for Conditional Level 2 (Self).'}


def check_band(rep, b, data, as_of):
    if b['key'] == 'none':
        rep.add('warning', 'CMMC-BAND-NONE', '/score', 'This score does not reach a Level 2 (Self) status. It can still '
                'be posted, but a contract that requires Level 2 (Self) cannot be awarded on it.', 'cfr170.21')
    elif b['key'] == 'conditional':
        rep.add('warning', 'CMMC-BAND-CONDITIONAL', '/score', f'Conditional, not Final: close every POA&M item and '
                f'confirm it with a closeout self-assessment within {POAM_CLOSEOUT_DAYS} days of the CMMC Status Date, '
                'or the conditional status expires.', 'cfr170.21')
        sd = parse_date(data['assessment'].get('statusDate'))
        if sd and sd <= as_of:
            ends = sd + timedelta(days=POAM_CLOSEOUT_DAYS)
            if ends <= as_of:
                rep.add('error', 'CMMC-STATUS-EXPIRED', '/assessment/statusDate', f'More than {POAM_CLOSEOUT_DAYS} days '
                        'have passed since the CMMC Status Date. Unless a POA&M closeout assessment was done, the '
                        'conditional status has expired.', 'cfr170.21')
            elif ends - as_of <= timedelta(days=30):
                rep.add('warning', 'CMMC-STATUS-EXPIRING', '/assessment/statusDate', 'The 180-day POA&M closeout '
                        'window ends within 30 days.', 'cfr170.21')


def _add_years(d, n):
    try:
        return d.replace(year=d.year + n)
    except ValueError:   # 29 February
        return d.replace(year=d.year + n, day=28)


# ------------------------------------------------------------------ run
def validate(body: bytes, *, as_of=None):
    data, rows = parse_body(body)
    today = datetime.now(timezone.utc).date()
    as_of = as_of or parse_date(data.get('asOf')) or today
    rep = Report()
    results = check_requirements(rep, rows)
    complete = not any(f['ruleId'].startswith('CMMC-REQ-') for f in rep.findings)
    ssp_ok = check_ssp(rep, data, results)
    total, deductions = score(results)
    verified = total if complete and ssp_ok else None
    claim = check_claim(rep, data, verified)
    blocked = check_poam(rep, data, results, deductions) if complete else []
    assessed = check_sprs(rep, data, as_of)
    check_affirmation(rep, data, assessed, as_of)
    b = band(verified, blocked, ssp_ok, complete)
    check_band(rep, b, data, as_of)
    return finish(rep, results, verified, deductions if verified is not None else [], claim, b, body, as_of)


def _area(rule):
    for prefix, area in sorted(RULE_AREA.items(), key=lambda kv: -len(kv[0])):
        if rule.startswith(prefix):
            return area
    return None


def finish(rep, results, verified, deductions, claim, b, body, as_of):
    order = {'error': 0, 'warning': 1}
    findings = sorted(rep.findings, key=lambda f: (order[f['severity']], f['ruleId'], f['path']))
    c = Counter(f['severity'] for f in findings)
    worst = {}
    for f in findings:
        a = _area(f['ruleId'])
        if a and worst.get(a) != 'fix':
            worst[a] = 'fix' if f['severity'] == 'error' else 'review'
    readiness = [{'item': k, 'label': label, 'status': worst.get(k, 'ready')} for k, label in READINESS]
    st = Counter(results.values())
    by_family = Counter()
    for d in deductions:
        by_family[REQUIREMENTS[d['requirement']]['family']] += d['points']
    return {
        'schemaVersion': 1,
        'status': 'FAIL' if c['error'] else ('WARN' if c['warning'] else 'PASS'),
        'level': 2,
        'asOf': as_of.isoformat(),
        'verifiedScore': verified,
        'maxScore': MAX_SCORE,
        'band': b,
        'claimedScore': claim,
        'counts': {'met': st['MET'], 'notMet': st['NOT MET'], 'partial': st['PARTIAL'],
                   'notApplicable': st['NOT APPLICABLE'], 'assessed': len(results), 'required': len(ORDER),
                   'pointsDeducted': sum(d['points'] for d in deductions)},
        'deductions': deductions,
        'deductionsByFamily': {k: by_family[k] for k in FAMILIES if by_family[k]},
        'readiness': readiness,
        'findingCount': len(findings),
        'findingCounts': {'error': c['error'], 'warning': c['warning']},
        'ruleCounts': dict(sorted(Counter(f['ruleId'] for f in findings).items())),
        'findings': findings,
        'methodology': METHODOLOGY,
        'notChecked': [
            'Whether each requirement is really MET. The score is recomputed from the results you entered; SpreadRun '
            'does not see your systems, evidence or SSP.',
            'Whether your assessment scope, asset categories and CAGE codes are the right ones for your contracts.',
            'Whether the CAGE codes are registered to your company. Only their format is checked.',
            'The SPRS entry itself, which you complete in SPRS.',
            'Level 1 and Level 3 assessments, and C3PAO certification assessments.',
        ],
        'sources': SOURCES,
        'scope': 'A verified score is arithmetic from the results you entered, checked against the published CMMC '
                 'scoring methodology. It is not a CMMC certification or assessment, not legal or compliance advice, '
                 'and a PASS does not mean your company meets NIST SP 800-171 or that DoD will accept the score.',
        'input': {'format': 'json', 'bytes': len(body)},
        'inputSha256': hashlib.sha256(body).hexdigest(),
    }
