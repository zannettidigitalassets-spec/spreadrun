"""Make the synthetic PBJ test files: a fictional facility, federal fiscal 2026 Q4 (July 1 to September 30, 2026).

    python3 scripts/pbj/make_fixtures.py

Writes pylib/tests/fixtures/pbj-pass.xml (passes every check), pbj-fail.xml (one example of each problem) and
copies both to public/samples/ for the website test form. Every ID and value is invented.
"""
import datetime as dt
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pylib' / 'spreadrun_api' / 'validators' / 'pbj'))
import engine  # noqa: E402

FIX = ROOT / 'pylib' / 'tests' / 'fixtures'
PUB = ROOT / 'public' / 'samples'
START, END = dt.date(2026, 7, 1), dt.date(2026, 9, 30)
AS_OF = dt.date(2026, 10, 3)

# (employee ID, job title code, pay type, shift hours after the meal break, working weekday pattern, hire date)
STAFF = [
    ('SR-ADM-01', 1, 1, 7.5, 'MTWTF..', '2019-03-11'),
    ('SR-DON-01', 5, 1, 7.5, 'MTWTF..', '2021-06-01'),
    ('SR-RN-01', 7, 2, 11.5, 'MT..FS.', '2022-01-10'),
    ('SR-RN-02', 7, 2, 11.5, '..WT..S', '2023-08-21'),
    ('SR-RN-03', 7, 2, 11.5, 'M.W.F.S', '2024-02-05'),
    ('SR-RN-04', 7, 2, 7.5, '.T.T.S.', '2025-05-12'),
    ('SR-LPN-01', 9, 2, 7.5, 'MTWTF..', '2020-11-02'),
    ('SR-LPN-02', 9, 2, 7.5, '..WTFSS', '2023-04-17'),
    ('SR-LPN-03', 9, 2, 11.5, 'MT...SS', '2025-09-08'),
    ('SR-CNA-01', 10, 2, 7.5, 'MTWTF..', '2018-07-30'),
    ('SR-CNA-02', 10, 2, 7.5, '.TWTFS.', '2021-02-15'),
    ('SR-CNA-03', 10, 2, 7.5, 'M..TFSS', '2024-10-01'),
    ('SR-CNA-04', 10, 2, 11.5, 'MTW...S', '2025-12-01'),
    ('SR-AGY-CNA-07', 10, 3, 7.5, '...T.SS', None),   # agency CNA: one unique ID per person, as CMS requires
]


def days():
    d = START
    while d <= END:
        yield d
        d += dt.timedelta(1)


def build(staff, extra_hours=None, version='4.10.0', employees_extra='', header_extra=''):
    emp = []
    for sid, _, _, _, _, hire in staff:
        hire_xml = f'\n      <hireDate>{hire}</hireDate>' if hire else ''
        emp.append(f'    <employee>\n      <employeeId>{sid}</employeeId>{hire_xml}\n    </employee>')
    hours = []
    for sid, job, pay, shift, pattern, _ in staff:
        wds = []
        for d in days():
            if pattern[d.weekday()] == '.':
                continue
            wds.append(f'        <workDay>\n          <date>{d.isoformat()}</date>\n          <hourEntries>\n'
                       f'            <hourEntry>\n              <hours>{shift}</hours>\n              <jobTitleCode>{job}</jobTitleCode>\n'
                       f'              <payTypeCode>{pay}</payTypeCode>\n            </hourEntry>\n          </hourEntries>\n        </workDay>')
        for extra in (extra_hours or {}).get(sid, []):
            wds.append(extra)
        hours.append(f'    <staffHours>\n      <employeeId>{sid}</employeeId>\n      <workDays>\n' + '\n'.join(wds)
                     + '\n      </workDays>\n    </staffHours>')
    return (f'<?xml version="1.0" encoding="ASCII"?>\n'
            f'<!-- Synthetic PBJ staffing file made by SpreadRun (scripts/pbj/make_fixtures.py). Fictional facility; '
            f'every ID and value is invented. -->\n'
            f'<nursingHomeData xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="nhpbj_4_10_0.xsd">\n'
            f'  <header fileSpecVersion="{version}">\n    <facilityId>SRDEMO01</facilityId>\n    <stateCode>OH</stateCode>\n'
            f'    <reportQuarter>4</reportQuarter>\n    <federalFiscalYear>2026</federalFiscalYear>\n'
            f'    <softwareVendorName>SpreadRun Example</softwareVendorName>{header_extra}\n  </header>\n'
            f'  <employees>\n' + '\n'.join(emp) + employees_extra + '\n  </employees>\n'
            f'  <staffingHours processType="merge">\n' + '\n'.join(hours) + '\n  </staffingHours>\n</nursingHomeData>\n')


def day(date, *entries):
    he = ''.join(f'\n            <hourEntry>\n              <hours>{h}</hours>\n              <jobTitleCode>{j}</jobTitleCode>\n'
                 f'              <payTypeCode>{p}</payTypeCode>\n            </hourEntry>' for h, j, p in entries)
    return f'        <workDay>\n          <date>{date}</date>\n          <hourEntries>{he}\n          </hourEntries>\n        </workDay>'


def main():
    good = build(STAFF)
    r = engine.validate(good.encode(), today=AS_OF)
    if r['status'] != 'PASS':
        raise SystemExit(f'pass file does not pass: {r["ruleCounts"]}')

    # Fail file: three RNs are dropped (leaves Sundays with no RN hours), plus one planted problem of each kind.
    staff = [s for s in STAFF if s[0] not in ('SR-RN-02', 'SR-RN-03', 'SR-RN-04')]   # Sundays left without an RN
    staff += [
        ('SR-AGY-GROUP', 10, 3, 22.5, 'MTWTF..', None),   # one ID used for several agency aides: >400 hours a month
        ('123-45-6789', 10, 2, 7.5, '.....S.', None),      # an SSN-shaped employee ID
    ]
    extra = {
        'SR-LPN-01': [day('2026-07-02', (12, 9, 2), (11.5, 10, 2))],    # 23.5 hours on one date: CMS -4025
        'SR-CNA-01': [day('2026-06-30', (7.5, 10, 2))],                  # outside the quarter: CMS -1010
        'SR-CNA-02': [day('2026-08-04', (7.5, 41, 2))],                  # job title code 41: CMS -3676
        'SR-CNA-03': [day('2026-08-05', (7.5, 10, 4))],                  # pay type 4: CMS -3676
        'SR-RN-01': [day('2026-13-01', (7.5, 7, 2))],                    # not a date: CMS -3677
    }
    bad = build(staff, extra, version='4.00.0',
                employees_extra='\n    <employee>\n      <employeeId>SR-CNA-09</employeeId>\n      <hireDate></hireDate>\n    </employee>')
    r = engine.validate(bad.encode(), today=AS_OF)
    want = {'CMS-1021', 'CMS-4025', 'CMS-1010', 'CMS-3676', 'CMS-3677', 'RISK-NO-RN-DAYS', 'RISK-HOURS-PER-MONTH',
            'RISK-ID-PII'}
    if r['status'] != 'FAIL' or not want <= set(r['ruleCounts']):
        raise SystemExit(f'fail file missing {want - set(r["ruleCounts"])}: {r["ruleCounts"]}')

    FIX.mkdir(parents=True, exist_ok=True)
    PUB.mkdir(parents=True, exist_ok=True)
    (FIX / 'pbj-pass.xml').write_text(good)
    (FIX / 'pbj-fail.xml').write_text(bad)
    for n in ('pbj-pass.xml', 'pbj-fail.xml'):
        shutil.copy(FIX / n, PUB / n)
    print(f'pbj-pass.xml PASS ({len(good):,} bytes); pbj-fail.xml FAIL, {r["findingCount"]} findings: {sorted(r["ruleCounts"])}')


if __name__ == '__main__':
    main()
