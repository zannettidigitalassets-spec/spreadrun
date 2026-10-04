"""PBJ Star & Audit-Risk Brief and the submission records ZIP, for paid PBJ runs.

Both are built in memory from a finished PBJ report (engine.validate) and returned in that response only: nothing is
stored, logged or cached. The brief draws only on the report, which never holds a value from the file, so the brief
holds none either. The ZIP carries the brief, the upload exactly as received (byte for byte, never changed, corrected
or re-created) and a README.

The brief is a one-page PDF written directly (PDF 1.4, the standard Helvetica fonts, no new dependency). It reports
what the checks found. It is never a compliance determination, and the staffing star is always labelled an estimate.
"""
import datetime as dt
import hashlib
import io
import json
import zipfile
from pathlib import Path

SPEC = json.loads((Path(__file__).parent / 'spec.json').read_text('utf-8'))

BRIEF_NAME = 'PBJ-Star-Audit-Risk-Brief.pdf'
README_NAME = 'README.txt'
UPLOAD_NAMES = {'xml': 'uploaded-pbj-file.xml', 'gzip': 'uploaded-pbj-file.xml.gz', 'zip': 'uploaded-pbj-upload.zip'}

FOOTER = ('A PASS is not CMS acceptance: CMS runs its own edits when you upload. The staffing star is an estimate, not '
          'the CMS rating. This brief reports what the SpreadRun checks found in the file. It is not a compliance '
          'determination and not legal advice.')

# ------------------------------------------------------------------ audit-risk patterns
# Each rule the PBJ engine can report belongs to one pattern. rank orders patterns of the same severity: a lower rank
# is listed first (rating and audit exposure before tidiness). why and fix are plain English and never mention a value.
PATTERNS = {
    'structure': {
        'rules': ['XSD'], 'rank': 1,
        'title': 'File structure does not match the CMS schema',
        'why': 'CMS checks every file against the PBJ XML schema (version 4.10.0). A missing, unknown or out-of-order '
               'element gets the whole file rejected. If no accepted file is in by the deadline, CMS gives the '
               'facility a one-star staffing rating.',
        'fix': 'Export the file again from your payroll or timekeeping system in the 4.10.0 format, then run this '
               'check again. If a vendor builds the file, send them the rule ID and location from the full report.',
    },
    'version': {
        'rules': ['CMS-1021', 'CMS-1020'], 'rank': 2,
        'title': 'Retired file format version',
        'why': 'Since April 1, 2026 CMS accepts only fileSpecVersion 4.10.0 and rejects files in the older versions.',
        'fix': 'Ask your software vendor for a 4.10.0 export or update the software. Changing the version number by '
               'hand is not enough if the rest of the file follows the old layout.',
    },
    'required': {
        'rules': ['CMS-4003', 'CMS-4004', 'CMS-4006', 'CMS-4008', 'CMS-3702'], 'rank': 3,
        'title': 'Required data is missing',
        'why': 'A required header item, employee ID, work date, hour entry or processType is missing or blank. CMS '
               'rejects the whole file for it.',
        'fix': 'Fill in the missing item in your source system and export again. processType must be "merge" or '
               '"replace" on the staffingHours section.',
    },
    'daily-hours': {
        'rules': ['CMS-4025'], 'rank': 4,
        'title': 'More than 22.5 hours for one person on one day',
        'why': 'CMS rejects the file. It usually points to a duplicate punch, a missing clock-out, or several people '
               'reported under one employee ID, which is also what auditors look for.',
        'fix': 'Open that employee\'s time records for the date, remove the duplicate or correct the punch, and give '
               'every person their own ID. Then export again.',
    },
    'future-dates': {
        'rules': ['CMS-4002'], 'rank': 5,
        'title': 'Hours dated in the future',
        'why': 'CMS rejects a file with work dates later than the day it is submitted.',
        'fix': 'Export only days that have already been worked. Scheduled shifts do not belong in PBJ.',
    },
    'codes': {
        'rules': ['CMS-3676'], 'rank': 6,
        'title': 'Codes CMS does not recognize',
        'why': 'A state code, job title code, pay type code, processType or version is not one CMS lists. CMS rejects '
               'the file.',
        'fix': 'Map every job title and pay type in your payroll system to a CMS code (job titles 1 to 40, pay types '
               '1 exempt, 2 non-exempt, 3 contract) and export again.',
    },
    'numbers': {
        'rules': ['CMS-3679'], 'rank': 7,
        'title': 'Hours or numbers outside the allowed range',
        'why': 'Each hour entry must be from 0 to 22.5 with at most two decimal places, and the fiscal year must be '
               '2016 or later. CMS rejects the file otherwise.',
        'fix': 'Round hours to two decimals and split any entry above 22.5 at the source, then export again.',
    },
    'dates': {
        'rules': ['CMS-3677', 'CMS-1009', 'CMS-4019'], 'rank': 8,
        'title': 'Dates CMS cannot read',
        'why': 'A hire, termination or work date is empty, not written as YYYY-MM-DD, or outside the years CMS allows '
               '(1895 to 2050). CMS rejects the file.',
        'fix': 'Correct the date in your source system, or remove an empty hireDate or terminationDate tag, then '
               'export again.',
    },
    'text': {
        'rules': ['CMS-4018', 'CMS-3793', 'CMS-3690', 'CMS-3692', 'CMS-3802'], 'rank': 9,
        'title': 'IDs or text with characters or lengths CMS rejects',
        'why': 'Employee IDs may use only letters, digits, spaces, hyphen, period, comma, underscore and backslash, '
               'up to 30 characters. Vendor fields have their own limits. CMS rejects the file otherwise.',
        'fix': 'Clean the IDs or software vendor fields at the source so they use only the allowed characters, then '
               'export again.',
    },
    'no-rn-days': {
        'rules': ['RISK-NO-RN-DAYS'], 'rank': 10,
        'title': 'Days with no RN hours',
        'why': 'CMS gives a one-star staffing rating when a facility has four or more days in the quarter with '
               'residents but no registered nurse hours (job title codes 5, 6 and 7).',
        'fix': 'Check whether RN time on those days is missing from the file, for example agency RNs or RNs coded '
               'under another job title. If RNs worked, add the hours with the right code. Contract hours count.',
    },
    'hours-per-month': {
        'rules': ['RISK-HOURS-PER-MONTH'], 'rank': 11,
        'title': 'One employee ID with more than 400 hours in a month',
        'why': 'CMS has named this as a reason to select a facility for a PBJ audit, and the PBJ FAQ lists several '
               'contract workers grouped under one ID as a reason audits fail.',
        'fix': 'Confirm the ID belongs to one person. Give every agency or contract worker their own ID and look for '
               'shifts counted twice.',
    },
    'empty-replace': {
        'rules': ['RISK-EMPTY-REPLACE'], 'rank': 12,
        'title': 'A "replace" file with no hours',
        'why': 'When CMS accepts a "replace" file it deletes all staffing hours already submitted for the quarter. '
               'One with no hours empties the quarter.',
        'fix': 'Use processType "merge", or put the full quarter\'s hours in the replace file.',
    },
    'ssn-ids': {
        'rules': ['RISK-ID-PII'], 'rank': 13,
        'title': 'Employee IDs shaped like Social Security numbers',
        'why': 'The PBJ Policy Manual says employee IDs must not contain personal information such as an SSN.',
        'fix': 'Move to IDs your system generates. CMS\'s Employee Link file maps old IDs to new ones so staff '
               'history carries over.',
    },
    'outside-quarter': {
        'rules': ['CMS-1010'], 'rank': 14,
        'title': 'Hours dated outside the reporting quarter',
        'why': 'CMS does not process staffing records dated outside the quarter named in the header, so those hours '
               'do not count toward staffing levels.',
        'fix': 'Check reportQuarter and federalFiscalYear in the header and export only that quarter\'s days. Send '
               'other quarters in their own files.',
    },
    'unlisted-ids': {
        'rules': ['CMS-4016-PARTIAL'], 'rank': 15,
        'title': 'Employee IDs with hours but no employee record in this file',
        'why': 'CMS rejects the file if an ID in the hours section does not already exist in the PBJ system. This '
               'file does not list it, so it must have been accepted in an earlier submission.',
        'fix': 'Confirm the ID was accepted before, or add the employee, with a hire date, to the employees section.',
    },
    'employment-dates': {
        'rules': ['SR-OUTSIDE-EMPLOYMENT', 'SR-DATE-ORDER'], 'rank': 16,
        'title': 'Hours outside an employee\'s hire and termination dates',
        'why': 'The file still loads, but hours before a hire date or after a termination date will not match '
               'payroll, and payroll is what a PBJ audit compares the hours with.',
        'fix': 'Correct the hire or termination date in your HR system, or the date of the hours, so both agree '
               'with payroll.',
    },
    'duplicate-ids': {
        'rules': ['SR-DUPLICATE-EMPLOYEE'], 'rank': 17,
        'title': 'The same employee ID listed more than once',
        'why': 'With repeated records it is unclear which hire and termination dates apply to the person.',
        'fix': 'Keep one employee record per ID, with that person\'s correct dates.',
    },
    'ascii': {
        'rules': ['CMS-ASCII'], 'rank': 18,
        'title': 'Characters outside plain ASCII',
        'why': 'CMS warns on characters such as curly quotes or accented letters, which often arrive when text is '
               'copied from other software.',
        'fix': 'Replace them with plain ASCII in the source system and export again.',
    },
}
RULE_PATTERN = {rule: key for key, p in PATTERNS.items() for rule in p['rules']}


def rule_severity(rule):
    if rule == 'XSD':
        return 'error'
    eid = rule[3:] if rule.startswith('CMS-') else None
    if eid in SPEC['edits']:
        return 'error' if SPEC['edits'][eid]['severity'] == 'Fatal' else 'warning'
    return 'warning'


def top_patterns(report, limit=3):
    """The run's most serious patterns, from its own findings only. Errors (CMS would reject the file) come before
    warnings; within a severity, rating and audit exposure before tidiness, then the most findings."""
    counts = report.get('ruleCounts') or {}
    findings = report.get('findings') or []
    groups = {}
    for rule, n in counts.items():
        if not n:
            continue
        key = RULE_PATTERN.get(rule, 'rule:' + rule)
        g = groups.setdefault(key, {'key': key, 'rules': [], 'count': 0, 'severity': 'warning'})
        g['rules'].append(rule)
        g['count'] += n
        if rule_severity(rule) == 'error':
            g['severity'] = 'error'
    out = []
    for g in groups.values():
        p = PATTERNS.get(g['key'])
        first = next((f for f in findings if f['ruleId'] in g['rules']), None)
        if p is None:   # a rule this catalog does not know yet: describe it from its own finding
            p = {'rank': 99, 'title': f'Finding under rule {g["rules"][0]}',
                 'why': first['message'] if first else 'See the full report.',
                 'fix': 'See the full report for each location and what to change.'}
        where = None
        if first:
            where = (f'XML file {first["file"]}: ' if first.get('file') else '') + first['path']
        out.append({**g, 'rules': sorted(g['rules']), 'title': p['title'], 'why': p['why'], 'fix': p['fix'],
                    'rank': p['rank'], 'firstLocation': where})
    out.sort(key=lambda g: (g['severity'] != 'error', g['rank'], -g['count'], g['title']))
    return out[:limit], len(out)


def _plural(n, word, many=None):
    return f'{n:,} {word if n == 1 else (many or word + "s")}'


def _star_section(report):
    """(headline, [detail lines], [small lines]). Uses only the engine's own estimate; never computes a new one."""
    est = report.get('staffingEstimate')
    no_rn = (report.get('ruleCounts') or {}).get('RISK-NO-RN-DAYS')
    if est is None:
        details = ['No census was sent with this run, so no score was computed. Add the census (resident days in the '
                   'quarter) to the run to get an estimate.']
        if no_rn:
            details.append('The file has four or more days without RN hours. Under the CMS rule that alone brings a '
                           'one-star staffing rating, whatever the hours.')
        return 'Not estimated for this run', details, []
    if not est.get('available'):
        return 'Not estimated for this run', [est.get('reason', '')], []
    small = [est['label']] + list(est.get('assumptions') or [])
    if est.get('excluded'):
        return 'No star estimated', [est['note']], small
    lo, hi = est['starRange']
    head = f'Estimated: {_plural(lo, "star")}' if lo == hi else f'Estimated range: {lo} to {_plural(hi, "star")}'
    a = est['adjustedHprd']
    details = [f'Case-mix adjusted hours per resident day: total nurse {a["total"]:.3f}, RN {a["rn"]:.3f}, '
               f'weekend total nurse {a["weekendTotal"]:.3f}. Score {est["scoreRange"][0]} to '
               f'{est["scoreRange"][1]} of 380.' if est['scoreRange'][0] != est['scoreRange'][1] else
               f'Case-mix adjusted hours per resident day: total nurse {a["total"]:.3f}, RN {a["rn"]:.3f}, '
               f'weekend total nurse {a["weekendTotal"]:.3f}. Score {est["scoreRange"][0]} of 380.',
               est['note']]
    return head, details, small


def _status_line(report):
    c = report.get('findingCounts') or {}
    e, w = c.get('error', 0), c.get('warning', 0)
    s = report['status']
    if s == 'PASS':
        return 'PASS: the checks found no problems in this file.'
    if s == 'WARN':
        return (f'WARN: {_plural(w, "warning")}, no errors. Nothing found matches a CMS fatal edit, but the warnings '
                'below are worth a look before you upload.')
    return (f'FAIL: {_plural(e, "error")} and {_plural(w, "warning")}. At least one finding matches an edit CMS '
            'lists as fatal, and CMS rejects a file that fails a fatal edit.')


def _quarter_line(report):
    rq = report.get('reportingQuarter')
    if rq is None and report.get('files'):
        qs = {(f['reportingQuarter']['federalFiscalYear'], f['reportingQuarter']['quarter'],
               f['reportingQuarter']['start'], f['reportingQuarter']['end']) for f in report['files']}
        rq = dict(zip(('federalFiscalYear', 'quarter', 'start', 'end'), qs.pop())) if len(qs) == 1 else None
    if not rq or not rq.get('start'):
        return 'Reporting quarter: not readable from the header'
    return (f'Federal fiscal year {rq["federalFiscalYear"]}, quarter {rq["quarter"]} '
            f'({rq["start"]} to {rq["end"]})')


def brief_model(report, generated):
    """Everything the page says, as plain data. generated: the date the brief was produced (UTC)."""
    files = (report.get('input') or {}).get('xmlFiles', 1)
    meta = [_quarter_line(report), f'Checked as of {report.get("asOf", generated.isoformat())}',
            f'Produced {generated.isoformat()}']
    if files > 1:
        meta.insert(1, f'{files} XML files in the upload')
    dl = report.get('submissionDeadline')
    deadline = None
    if dl:
        deadline = (f'CMS deadline for this quarter: {dl["date"]}, {dl["time"]}. ' +
                    ('The deadline has passed.' if dl['passed'] else
                     f'{_plural(dl["daysRemaining"], "day")} left as of {dl["asOf"]}.'))
    patterns, total = top_patterns(report)
    if not patterns:
        none_note = 'The checks found no problems in this file, so there are no patterns to list.'
    elif total <= len(patterns) and len(patterns) < 3:
        none_note = f'This run found {_plural(len(patterns), "pattern")} in all. Nothing else to list.'
    else:
        none_note = None
    rest = sum(g['count'] for g in top_patterns(report, limit=None)[0][len(patterns):])
    more = (f'{_plural(rest, "more finding")} under {_plural(total - len(patterns), "other pattern")} are in the full '
            'report.') if total > len(patterns) else None
    head, details, small = _star_section(report)
    return {'title': 'PBJ Star & Audit-Risk Brief', 'meta': meta, 'status': report['status'],
            'statusLine': _status_line(report), 'deadline': deadline,
            'star': {'headline': head, 'details': details, 'small': small},
            'patterns': patterns, 'patternNote': none_note, 'more': more,
            'footer': FOOTER, 'sha256': report.get('inputSha256')}


# ------------------------------------------------------------------ PDF
# Advance widths (1/1000 em) for ASCII 32 to 126 from the standard Helvetica and Helvetica-Bold AFM files.
_W = {
    'F1': [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556,
           556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278,
           500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469,
           556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500,
           278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584],
    'F2': [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556,
           556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278,
           556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584,
           556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556,
           333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584],
}
PAGE_W, PAGE_H = 612.0, 792.0        # US Letter
MARGIN = 54.0
INK, MUTED, RULE = (0.11, 0.12, 0.14), (0.38, 0.40, 0.44), (0.80, 0.82, 0.85)
STATUS_FILL = {'PASS': (0.90, 0.96, 0.91), 'WARN': (0.99, 0.95, 0.85), 'FAIL': (0.99, 0.91, 0.90)}


def _clean(s):
    s = ' '.join(str(s or '').split())
    return ''.join(ch if 32 <= ord(ch) < 127 else '?' for ch in s)


def _width(s, font, size):
    w = _W[font]
    return sum(w[ord(c) - 32] for c in s) * size / 1000


def _esc(s):
    return s.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def _break_long(word, font, size, width):
    """Split a token wider than the line (an XML path) after '/' where possible, otherwise by characters."""
    out, cur = [], ''
    for ch in word:
        if _width(cur + ch, font, size) > width and cur:
            cut = cur.rfind('/')
            if 0 < cut < len(cur) - 1:
                out.append(cur[:cut + 1])
                cur = cur[cut + 1:]
            else:
                out.append(cur)
                cur = ''
        cur += ch
    return out + [cur]


def wrap(text, font, size, width):
    lines, cur = [], ''
    for word in _clean(text).split(' '):
        if not word:
            continue
        trial = f'{cur} {word}' if cur else word
        if _width(trial, font, size) <= width:
            cur = trial
            continue
        if cur:
            lines.append(cur)
        if _width(word, font, size) > width:
            *full, cur = _break_long(word, font, size, width)
            lines.extend(full)
        else:
            cur = word
    if cur:
        lines.append(cur)
    return lines


class _Page:
    def __init__(self, scale):
        self.ops = []
        self.s = scale
        self.y = PAGE_H - MARGIN
        self.width = PAGE_W - 2 * MARGIN

    def _color(self, rgb, stroke=False):
        self.ops.append('%.3f %.3f %.3f %s' % (*rgb, 'RG' if stroke else 'rg'))

    def text(self, x, y, s, font='F1', size=9.5, color=INK):
        self._color(color)
        self.ops.append(f'BT /{font} {size:.2f} Tf {x:.2f} {y:.2f} Td ({_esc(_clean(s))}) Tj ET')

    def para(self, s, font='F1', size=9.5, color=INK, indent=0.0, lead=1.3, after=0.0):
        size *= self.s
        for line in wrap(s, font, size, self.width - indent):
            self.y -= size * lead
            self.text(MARGIN + indent, self.y, line, font, size, color)
        self.y -= after * self.s

    def labelled(self, label, s, size=9.5, indent=0.0, after=0.0):
        """A bold run-in label followed by regular text on the same lines."""
        size *= self.s
        lw = _width(label + ' ', 'F2', size)
        lines = wrap(s, 'F1', size, self.width - indent - lw)
        first = lines[0] if lines else ''
        rest = wrap(' '.join(lines[1:]), 'F1', size, self.width - indent) if len(lines) > 1 else []
        self.y -= size * 1.3
        self.text(MARGIN + indent, self.y, label, 'F2', size)
        self.text(MARGIN + indent + lw, self.y, first, 'F1', size)
        for line in rest:
            self.y -= size * 1.3
            self.text(MARGIN + indent, self.y, line, 'F1', size)
        self.y -= after * self.s

    def rule(self, gap=8.0):
        self.y -= gap * self.s
        self._color(RULE, stroke=True)
        self.ops.append(f'0.6 w {MARGIN:.2f} {self.y:.2f} m {PAGE_W - MARGIN:.2f} {self.y:.2f} l S')
        self.y -= gap * self.s * 0.4

    def box(self, top, bottom, rgb):
        self.ops.insert(0, '%.3f %.3f %.3f rg %.2f %.2f %.2f %.2f re f' % (
            *rgb, MARGIN - 6, bottom, self.width + 12, top - bottom))

    def heading(self, s, size=11.5, before=10.0):
        self.y -= before * self.s
        self.para(s, 'F2', size, INK, lead=1.25, after=2.0)


def _layout(m, scale):
    p = _Page(scale)
    p.para(m['title'], 'F2', 18, INK, lead=1.0, after=4)
    p.para('SpreadRun PBJ pre-submission QA. ' + '. '.join(m['meta']) + '.', 'F1', 8.5, MUTED, after=2)
    p.rule(6)
    top = p.y + 3
    p.y -= 2 * scale
    p.para(m['statusLine'], 'F2', 10, INK, lead=1.35)
    if m['deadline']:
        p.para(m['deadline'], 'F1', 9.5, INK, lead=1.35)
    p.y -= 6 * scale
    p.box(top, p.y, STATUS_FILL.get(m['status'], STATUS_FILL['WARN']))

    st = m['star']
    p.heading('Projected staffing star (estimate, not the CMS rating)')
    p.para(st['headline'], 'F2', 13, INK, lead=1.3, after=1)
    for d in st['details']:
        p.para(d, 'F1', 9.5, INK)
    p.y -= 3 * scale if st['small'] else 0
    for d in st['small']:
        p.para(d, 'F1', 7.5, MUTED, lead=1.3)

    p.heading('Top audit-risk patterns in this run')
    if m['patternNote'] and not m['patterns']:
        p.para(m['patternNote'], 'F1', 9.5, INK)
    for i, g in enumerate(m['patterns'], 1):
        p.y -= 3 * scale
        p.para(f'{i}. {g["title"]}', 'F2', 10.5, INK, lead=1.35)
        p.para(f'{g["severity"].capitalize()}. {_plural(g["count"], "finding")}. '
               f'Rule{"s" if len(g["rules"]) > 1 else ""} {", ".join(g["rules"])}.', 'F1', 8, MUTED, indent=12)
        p.labelled('Why it matters:', g['why'], indent=12)
        p.labelled('Fix:', g['fix'], indent=12)
        if g['firstLocation']:
            p.para('First location: ' + g['firstLocation'], 'F1', 7.5, MUTED, indent=12)
    if m['patternNote'] and m['patterns']:
        p.para(m['patternNote'], 'F1', 9, MUTED, after=0)
    if m['more']:
        p.para(m['more'], 'F1', 9, MUTED)

    p.rule(10)
    p.para(m['footer'], 'F1', 8, MUTED)
    if m['sha256']:
        p.para(f'SHA-256 of the file checked: {m["sha256"]}', 'F1', 7, MUTED)
    return p


def fits(model, scale=1.0):
    return _layout(model, scale).y >= MARGIN


def render(model):
    """One Letter page. Shrinks the type in small steps in the unlikely case the content runs long; never adds a page."""
    for scale in (1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7):
        page = _layout(model, scale)
        if page.y >= MARGIN:
            break
    return _pdf('\n'.join(page.ops).encode('latin-1'), model['title'])


def _pdf(content, title):
    fonts = '/Type /Font /Subtype /Type1 /Encoding /WinAnsiEncoding /BaseFont'
    objs = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        (f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_W:.0f} {PAGE_H:.0f}] /Contents 4 0 R '
         '/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>').encode(),
        b'<< /Length %d >>\nstream\n' % len(content) + content + b'\nendstream',
        f'<< {fonts} /Helvetica >>'.encode(),
        f'<< {fonts} /Helvetica-Bold >>'.encode(),
        f'<< /Title ({_esc(_clean(title))}) /Producer (SpreadRun) /Creator (SpreadRun) >>'.encode(),
    ]
    out = io.BytesIO()
    out.write(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
    offsets = []
    for i, body in enumerate(objs, 1):
        offsets.append(out.tell())
        out.write(b'%d 0 obj\n' % i + body + b'\nendobj\n')
    xref = out.tell()
    out.write(b'xref\n0 %d\n0000000000 65535 f \n' % (len(objs) + 1))
    for off in offsets:
        out.write(b'%010d 00000 n \n' % off)
    out.write(b'trailer\n<< /Size %d /Root 1 0 R /Info 7 0 R >>\nstartxref\n%d\n%%%%EOF\n' % (len(objs) + 1, xref))
    return out.getvalue()


def brief_pdf(report, generated=None):
    generated = generated or dt.datetime.now(dt.timezone.utc).date()
    return render(brief_model(report, generated))


# ------------------------------------------------------------------ ZIP
def readme(report, generated, upload_name):
    c = report.get('findingCounts') or {}
    return '\r\n'.join([
        'SpreadRun PBJ records packet',
        '',
        f'Run date: {generated.isoformat()} (UTC)',
        f'Checked as of: {report.get("asOf", generated.isoformat())}',
        f'Result: {report["status"]} ({_plural(c.get("error", 0), "error")}, {_plural(c.get("warning", 0), "warning")})',
        '',
        'Files',
        f'- {BRIEF_NAME}: a one-page summary of this run. The projected staffing star (an estimate) and the top '
        'audit-risk patterns the checks found, each with a fix.',
        f'- {upload_name}: the file you uploaded for this run, byte for byte. SpreadRun did not change, correct or '
        're-create it.',
        f'  SHA-256: {report.get("inputSha256", "")}',
        f'- {README_NAME}: this file.',
        '',
        'This ZIP is a record of what was checked and when. It is not a filing. Upload your PBJ file to CMS yourself, '
        'as usual.',
        '',
        FOOTER,
        '',
    ]).encode('ascii')


def package(body, report, brief, generated=None):
    """The records ZIP: the brief, the upload unchanged, and a README. Returns (zip bytes, [file names])."""
    generated = generated or dt.datetime.now(dt.timezone.utc).date()
    container = (report.get('input') or {}).get('container', 'xml')
    upload_name = UPLOAD_NAMES.get(container, UPLOAD_NAMES['xml'])
    if hashlib.sha256(body).hexdigest() != report.get('inputSha256'):
        raise ValueError('upload does not match the report it was checked for')
    stamp = (generated.year, generated.month, generated.day, 0, 0, 0)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        for name, data, method in (
                (BRIEF_NAME, brief, zipfile.ZIP_DEFLATED),
                (upload_name, body, zipfile.ZIP_DEFLATED if container == 'xml' else zipfile.ZIP_STORED),
                (README_NAME, readme(report, generated, upload_name), zipfile.ZIP_DEFLATED)):
            info = zipfile.ZipInfo(name, stamp)
            info.compress_type = method
            info.external_attr = 0o644 << 16
            z.writestr(info, data)
    return buf.getvalue(), [BRIEF_NAME, upload_name, README_NAME]
