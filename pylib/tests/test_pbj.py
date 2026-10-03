"""Tests for the PBJ staffing data pre-submission QA validator.

Run from the repo root:  python3.12 -m unittest discover -s pylib/tests -v
Fixtures are synthetic (scripts/pbj/make_fixtures.py): a fictional facility, federal fiscal 2026 Q4.
"""
import datetime as dt
import gzip
import io
import json
import re
import sys
import unittest
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pylib'))
sys.path.insert(0, str(Path(__file__).parent))
FIX = Path(__file__).parent / 'fixtures'

from spreadrun_api import handler, runners, store  # noqa: E402
from test_api import FakeStore, call  # noqa: E402

PBJ = 'pbj-staffing-qa'
AS_OF = '2026-10-03'
engine = runners.pbj_module()


def root():
    return ET.fromstring((FIX / 'pbj-pass.xml').read_bytes())


def run(r, as_of=AS_OF):
    body = r if isinstance(r, bytes) else ET.tostring(r)
    return runners.run_pbj(body, as_of=as_of)


def first_entry(r, sid):
    rec = next(s for s in r.iter('staffHours') if s.findtext('employeeId') == sid)
    return rec, rec.find('workDays/workDay'), rec.find('workDays/workDay/hourEntries/hourEntry')


class PbjReports(unittest.TestCase):
    def test_pass_file(self):
        r = run((FIX / 'pbj-pass.xml').read_bytes())
        self.assertEqual(r['status'], 'PASS', r['findings'][:5])
        self.assertEqual(r['specVersion'], '4.10.0')
        self.assertEqual(r['reportingQuarter'], {'federalFiscalYear': 2026, 'quarter': 4, 'start': '2026-07-01', 'end': '2026-09-30'})
        self.assertEqual(r['coverage']['daysWithoutRnHours'], 0)
        self.assertEqual(r['coverage']['daysWithHours'], 92)
        self.assertEqual(r['counts']['employees'], 14)
        self.assertIn('not mean CMS will accept', r['scope'])
        self.assertTrue(r['notChecked'])

    def test_fail_file(self):
        r = run((FIX / 'pbj-fail.xml').read_bytes())
        self.assertEqual(r['status'], 'FAIL')
        self.assertTrue({'CMS-1021', 'CMS-4025', 'CMS-1010', 'CMS-3676', 'CMS-3677', 'RISK-NO-RN-DAYS',
                         'RISK-HOURS-PER-MONTH', 'RISK-ID-PII'} <= set(r['ruleCounts']))
        for f in r['findings']:
            self.assertTrue(f['path'].startswith('/nursingHomeData'))
            self.assertIn(f['severity'], ('error', 'warning'))
            if f['ruleId'].startswith('RISK'):
                self.assertEqual(f['severity'], 'warning')
                self.assertIn(f['source'], engine.SOURCES)

    def test_gzip_and_zip(self):
        raw = (FIX / 'pbj-pass.xml').read_bytes()
        self.assertEqual(run(gzip.compress(raw))['input']['container'], 'gzip')
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('q4.xml', raw)
        r = run(buf.getvalue())
        self.assertEqual((r['status'], r['input']['container']), ('PASS', 'zip'))

    def test_zip_with_several_files(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('a.xml', (FIX / 'pbj-pass.xml').read_bytes())
            z.writestr('b.xml', (FIX / 'pbj-fail.xml').read_bytes())
        r = run(buf.getvalue())
        self.assertEqual((r['status'], r['input']['xmlFiles'], [f['status'] for f in r['files']]), ('FAIL', 2, ['PASS', 'FAIL']))
        self.assertTrue(all(f['file'] == 2 for f in r['findings']))
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w') as z:
            z.writestr('a.xml', (FIX / 'pbj-pass.xml').read_bytes())
            z.writestr('b.xml', b'not xml')
        with self.assertRaises(runners.InputError) as cm:
            run(buf.getvalue())
        self.assertIn('XML file 2', str(cm.exception))


class PbjRules(unittest.TestCase):
    def fires(self, r, rule, severity='error'):
        rep = run(r)
        hits = [f for f in rep['findings'] if f['ruleId'] == rule]
        self.assertTrue(hits, f'{rule} did not fire: {rep["ruleCounts"]}')
        self.assertEqual(hits[0]['severity'], severity)
        return rep

    def test_daily_total_over_22_5_across_job_titles(self):
        r = root()
        _, wd, he = first_entry(r, 'SR-RN-01')   # 11.5 hours as RN; add 11.5 as LPN the same day = 23
        extra = ET.fromstring(ET.tostring(he))
        extra.find('jobTitleCode').text = '9'
        wd.find('hourEntries').append(extra)
        self.fires(r, 'CMS-4025')

    def test_exactly_22_5_is_allowed(self):
        r = root()
        _, wd, he = first_entry(r, 'SR-RN-01')
        extra = ET.fromstring(ET.tostring(he))
        extra.find('hours').text = '11'
        wd.find('hourEntries').append(extra)
        self.assertNotIn('CMS-4025', run(r)['ruleCounts'])

    def test_codes_hours_and_dates(self):
        cases = [('jobTitleCode', '0', 'CMS-3676'), ('payTypeCode', '9', 'CMS-3676'), ('hours', '23', 'CMS-3679'),
                 ('hours', '7.555', 'CMS-3679'), ('hours', 'abc', 'CMS-3679')]
        for field, value, rule in cases:
            r = root()
            first_entry(r, 'SR-CNA-01')[2].find(field).text = value
            self.fires(r, rule)
        r = root()
        first_entry(r, 'SR-CNA-01')[1].find('date').text = '2026-02-30'
        self.fires(r, 'CMS-3677')
        r = root()
        first_entry(r, 'SR-CNA-01')[1].find('date').text = '2026-10-02'   # after the quarter, not in the future
        self.fires(r, 'CMS-1010', 'warning')
        rep = run(r, as_of='2026-10-01')                                     # now also in the future
        self.assertIn('CMS-4002', rep['ruleCounts'])

    def test_header_items(self):
        r = root()
        r.find('header/stateCode').text = 'ZZ'
        r.find('header/reportQuarter').text = '5'
        r.find('header/federalFiscalYear').text = '2015'
        r.find('header/facilityId').text = 'X' * 17
        rep = run(r)
        self.assertTrue({'CMS-3676', 'CMS-3679', 'CMS-3793'} <= set(rep['ruleCounts']), rep['ruleCounts'])
        r = root()
        r.find('header').remove(r.find('header/facilityId'))
        self.fires(r, 'CMS-4003')

    def test_versions(self):
        r = root()
        r.find('header').set('fileSpecVersion', '4.00.0')
        self.fires(r, 'CMS-1021')
        self.assertIn('CMS-1020', run(r, as_of='2026-03-01')['ruleCounts'])
        r.find('header').set('fileSpecVersion', '5.0.0')
        self.fires(r, 'CMS-3676')

    def test_structure(self):
        r = root()
        hdr = r.find('header')
        hdr.insert(0, hdr[3])          # federalFiscalYear moved before facilityId
        ET.SubElement(hdr, 'notes').text = 'x'
        rep = run(r)
        msgs = [f['message'] for f in rep['findings'] if f['ruleId'] == 'XSD']
        self.assertTrue(any('out of order' in m for m in msgs) and any('not allowed' in m for m in msgs), msgs)
        r = root()
        r.remove(r.find('employees'))
        r.remove(r.find('staffingHours'))
        self.assertIn('XSD', run(r)['ruleCounts'])

    def test_employee_ids(self):
        r = root()
        first_entry(r, 'SR-CNA-01')[0].find('employeeId').text = 'NOT-LISTED-1'
        self.fires(r, 'CMS-4016-PARTIAL', 'warning')
        r = root()
        r.find('employees/employee/employeeId').text = 'bad*id'
        self.fires(r, 'CMS-4018')
        r = root()
        emps = r.find('employees')
        emps.append(ET.fromstring(ET.tostring(emps[0])))
        self.fires(r, 'SR-DUPLICATE-EMPLOYEE', 'warning')

    def test_rn_days_rule_counts_days_and_respects_the_threshold(self):
        r = root()
        sh = r.find('staffingHours')
        for rec in list(sh):
            if rec.findtext('employeeId') in ('SR-RN-02', 'SR-RN-03', 'SR-RN-04'):
                sh.remove(rec)
        rep = self.fires(r, 'RISK-NO-RN-DAYS', 'warning')
        self.assertEqual(rep['coverage']['daysWithoutRnHours'], 13)   # every Sunday in the quarter
        r = root()
        rec = first_entry(r, 'SR-RN-02')[0]
        rec.find('workDays').remove(rec.find('workDays/workDay'))     # one uncovered day is not a rating risk
        self.assertNotIn('RISK-NO-RN-DAYS', run(r)['ruleCounts'])

    def test_empty_replace(self):
        r = root()
        sh = r.find('staffingHours')
        sh.set('processType', 'replace')
        for rec in list(sh):
            sh.remove(rec)
        self.fires(r, 'RISK-EMPTY-REPLACE', 'warning')

    def test_hire_and_termination_dates(self):
        r = root()
        emp = next(e for e in r.iter('employee') if e.findtext('employeeId') == 'SR-CNA-04')
        ET.SubElement(emp, 'terminationDate').text = '2025-11-01'   # before its 2025-12-01 hire date
        rep = run(r)
        self.assertIn('SR-DATE-ORDER', rep['ruleCounts'])
        self.assertIn('SR-OUTSIDE-EMPLOYMENT', rep['ruleCounts'])


class PbjInputErrors(unittest.TestCase):
    def bad(self, body, frag):
        with self.assertRaises(runners.InputError) as cm:
            runners.run_pbj(body)
        self.assertIn(frag, str(cm.exception))

    def test_not_a_pbj_file(self):
        self.bad(b'', 'request body')
        self.bad(b'{"a":1}', 'well-formed')
        self.bad(b'<MESSAGE/>', 'nursingHomeData')
        self.bad(b'%PDF-1.7', 'PDF')
        self.bad(b'<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "a">]><nursingHomeData/>', 'DOCTYPE')
        self.bad(b'<nursingHomeData><employeeLinks/></nursingHomeData>', 'Administration')
        self.bad(b'\x1f\x8bnot gzip', 'gzip')
        with self.assertRaises(runners.InputError):
            runners.run_pbj((FIX / 'pbj-pass.xml').read_bytes(), as_of='10/03/2026')


class PbjNoValueEcho(unittest.TestCase):
    """Reports never repeat a value from the file: every value and attribute becomes a marker, and no marker may
    appear in the report or in any error message."""
    MARK = 'ZQXMARK'

    def test_no_marker_in_report(self):
        r = root()
        n = 0
        for e in r.iter():
            if len(e) == 0:
                n += 1
                e.text = f'{self.MARK}{n}'
            for k in list(e.attrib):
                if not k.startswith('{'):
                    e.set(k, f'{self.MARK}a{n}')
        rep = run(r)
        self.assertEqual(rep['status'], 'FAIL')
        self.assertGreater(rep['findingCount'], 100)
        self.assertNotIn(self.MARK, json.dumps(rep))
        for f in rep['findings']:
            self.assertLessEqual(set(f), {'severity', 'ruleId', 'path', 'message', 'source'})

    def test_markers_in_ids_dates_and_hours_that_still_parse(self):
        # Valid-looking values carrying markers (IDs) or plain numbers: IDs must never be echoed.
        r = root()
        for e in r.iter('employeeId'):
            e.text = f'{self.MARK}-{e.text}'
        rep = run(r)
        self.assertNotIn(self.MARK, json.dumps(rep))

    def test_errors_do_not_echo(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w') as z:
            z.writestr(f'{self.MARK}.txt', b'x')
        for body in (f'<{self.MARK}/>'.encode(), f'<nursingHomeData>{self.MARK}'.encode(), buf.getvalue()):
            with self.assertRaises(runners.InputError) as cm:
                runners.run_pbj(body)
            self.assertNotIn(self.MARK, str(cm.exception))


    def test_zip_of_several_marked_files(self):
        r = root()
        for e in r.iter('employeeId'):
            e.text = f'{self.MARK}{e.text}'
        marked = ET.tostring(r)
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr(f'{self.MARK}_1.xml', marked)
            z.writestr(f'{self.MARK}_2.xml', (FIX / 'pbj-fail.xml').read_bytes())
        rep = runners.run_pbj(buf.getvalue(), as_of=AS_OF)
        self.assertEqual(rep['input']['xmlFiles'], 2)
        self.assertNotIn(self.MARK, json.dumps(rep))

    def test_nothing_stored_holds_a_value(self):
        """What the paid path writes (ledger, usage log) and returns never contains a value from the file."""
        fake = FakeStore()
        r = root()
        for e in r.iter():
            if len(e) == 0:
                e.text = f'{self.MARK}{e.text}'
        with mock.patch.object(store, 'rpc', fake.rpc), mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'}):
            key, _ = fake.add_user(500)
            status, out = call(PBJ, 'paid', ET.tostring(r), {'Authorization': f'Bearer {key}'}, f'/?asOf={AS_OF}')
            self.assertEqual((status, out['charged']), (200, True))
            status, err = call(PBJ, 'paid', f'<nursingHomeData>{self.MARK}'.encode(), {'Authorization': f'Bearer {key}'})
            self.assertEqual(status, 400)
        self.assertNotIn(self.MARK, json.dumps([out, err, fake.ledger, fake.calls, fake.demo], default=str))


class PbjBilling(unittest.TestCase):
    def setUp(self):
        self.fake = FakeStore()
        self.p = [mock.patch.object(store, 'rpc', self.fake.rpc), mock.patch.object(store, 'auth_user', self.fake.auth_user),
                  mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'})]
        for p in self.p:
            p.start()

    def tearDown(self):
        for p in self.p:
            p.stop()

    def test_completed_report_costs_one_dollar(self):
        key, user = self.fake.add_user(150)
        status, out = call(PBJ, 'paid', (FIX / 'pbj-fail.xml').read_bytes(), {'Authorization': f'Bearer {key}'}, f'/?asOf={AS_OF}')
        self.assertEqual((status, out['report']['status'], out['priceCents'], self.fake.balance[user]), (200, 'FAIL', 100, 50))

    def test_session_pays_and_low_balance_is_402(self):
        jwt, user = self.fake.add_session(100)
        status, out = call(PBJ, 'paid', (FIX / 'pbj-pass.xml').read_bytes(), {'Authorization': f'Bearer {jwt}'}, f'/?asOf={AS_OF}')
        self.assertEqual((status, self.fake.balance[user]), (200, 0))
        status, out = call(PBJ, 'paid', (FIX / 'pbj-pass.xml').read_bytes(), {'Authorization': f'Bearer {jwt}'})
        self.assertEqual(status, 402)

    def test_invalid_input_is_free_and_demo_is_capped(self):
        key, user = self.fake.add_user(500)
        status, out = call(PBJ, 'paid', b'not xml', {'Authorization': f'Bearer {key}'})
        self.assertEqual((status, out['error']['charged'], self.fake.balance[user]), (400, False, 500))
        status, out = call(PBJ, 'demo', (FIX / 'pbj-pass.xml').read_bytes(), {'X-Forwarded-For': '203.0.113.77'}, f'/?asOf={AS_OF}')
        self.assertEqual((status, out['charged'], out['report']['status']), (200, False, 'PASS'))
        status, _ = call(PBJ, 'demo', b'<nursingHomeData>' + b' ' * (1024 * 1024) + b'</nursingHomeData>', {'X-Forwarded-For': '203.0.113.77'})
        self.assertEqual(status, 413)

    def test_routes(self):
        self.assertEqual(handler.resolve_route(f'/api/v1/{PBJ}'), (PBJ, 'paid'))
        self.assertEqual(handler.resolve_route(f'/api/[channel]/[slug]?channel=demo&slug={PBJ}'), (PBJ, 'demo'))


class PbjSpec(unittest.TestCase):
    def test_spec_table(self):
        s = json.loads((ROOT / 'pylib/spreadrun_api/validators/pbj/spec.json').read_text())
        self.assertEqual(s['version'], '4.10.0')
        self.assertEqual(sorted(s['jobTitleCodes'], key=int), [str(i) for i in range(1, 41)])
        self.assertEqual(set(s['payTypeCodes']), {'1', '2', '3'})
        self.assertEqual(s['edits']['-4025']['severity'], 'Fatal')
        self.assertTrue(re.fullmatch(r'[0-9a-f]{64}', s['sources']['xsd']['sha256']))


if __name__ == '__main__':
    unittest.main()
