"""Tests for the UAD 3.6 appraisal validator.

Run from the repo root:  python3.12 -m unittest discover -s pylib/tests -v

Committed fixtures are synthetic (scripts/uad/make_fixtures.py). The GSE Appendix D-1 sample scenarios are
not committed; set UAD_SAMPLES_DIR to a folder holding their XML files to also run the false-positive
test against them (every sample must PASS as of its own signature date).
"""
import datetime as dt
import json
import os
import re
import sys
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pylib'))
sys.path.insert(0, str(Path(__file__).parent))
FIX = Path(__file__).parent / 'fixtures'

from spreadrun_api import handler, runners, store  # noqa: E402
from test_api import FakeStore, call  # noqa: E402

UAD = 'uad-36-appraisal-validator'
NS = 'http://www.mismo.org/residential/2009/schemas'
AS_OF = '2019-09-20'
ET.register_namespace('', NS)
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
engine = runners.uad_module()


def q(path):
    return '/'.join(f'{{{NS}}}{p}' for p in path.split('/'))


def pass_root():
    return ET.fromstring((FIX / 'uad-pass.xml').read_bytes())


def run(root_or_bytes, as_of=AS_OF):
    body = root_or_bytes if isinstance(root_or_bytes, bytes) else ET.tostring(root_or_bytes)
    return runners.run_uad(body, as_of=as_of)


def properties(root, use):
    return [p for p in root.iter(q('PROPERTY')) if p.get('ValuationUseType') == use]


class UadReports(unittest.TestCase):
    def test_synthetic_pass_file_passes(self):
        r = run((FIX / 'uad-pass.xml').read_bytes())
        self.assertEqual(r['status'], 'PASS', r['findings'][:5])
        self.assertEqual(r['findingCount'], 0)
        self.assertEqual(r['reportType'], 'URAR')
        self.assertEqual(r['mismoReferenceModelIdentifier'], '3.6.0366')
        self.assertEqual(r['asOf'], AS_OF)
        self.assertEqual(r['properties']['SubjectProperty'], 1)
        self.assertIn('not mean UCDP acceptance', r['scope'])
        cov = r['coverage']
        self.assertEqual(cov['complianceRulesEvaluated'] + len(cov['complianceRulesNotImplemented']) <= cov['complianceRulesTotal'], True)
        self.assertGreater(cov['complianceRulesEvaluated'], 500)
        self.assertIn('none', cov['sampling'])

    def test_clock_rules_use_today_by_default(self):
        r = runners.run_uad((FIX / 'uad-pass.xml').read_bytes())
        self.assertEqual(r['status'], 'WARN')  # a 2019 report is more than 367 days old today
        self.assertEqual(set(r['ruleCounts']), {'UAD1259', 'UAD1506'})
        self.assertEqual(r['asOf'], dt.datetime.now(dt.timezone.utc).date().isoformat())

    def test_synthetic_fail_file(self):
        r = run((FIX / 'uad-fail.xml').read_bytes())
        self.assertEqual(r['status'], 'FAIL')
        self.assertTrue({'A1-ENUM', 'A1-FORMAT', 'A1-REQUIRED', 'A1-UNKNOWN', 'UAD1004', 'UAD1260', 'UAD1263'} <= set(r['ruleCounts']),
                        r['ruleCounts'])
        for f in r['findings']:
            self.assertTrue(f['path'].startswith('/MESSAGE/'), f)
            self.assertIn(f['severity'], ('error', 'warning'))
            self.assertTrue(f['ruleId'] and f['message'])
        zip_finding = next(f for f in r['findings'] if f['ruleId'] == 'UAD1004')
        self.assertRegex(zip_finding['path'], r'PROPERTY\[1\]/ADDRESS/PostalCode$')
        self.assertEqual(r['findingCounts']['error'], sum(1 for f in r['findings'] if f['severity'] == 'error'))

    def test_findings_do_not_echo_free_text(self):
        root = pass_root()
        subj = properties(root, 'SubjectProperty')[0]
        subj.find(q('ADDRESS/CityName')).text = 'X' * 500   # over the String length limit
        r = run(root)
        f = next(f for f in r['findings'] if f['ruleId'] == 'A1-FORMAT')
        self.assertNotIn('XXXX', json.dumps(r))
        self.assertIn('characters', f['message'])


class UadRuleFamilies(unittest.TestCase):
    """One mutation of the passing file per kind of check. Each must fire, and only where it should."""

    def assertFires(self, root, rule_id, severity='error'):
        r = run(root)
        hits = [f for f in r['findings'] if f['ruleId'] == rule_id]
        self.assertTrue(hits, f'{rule_id} did not fire; got {r["ruleCounts"]}')
        self.assertEqual(hits[0]['severity'], severity)
        return r

    def test_required_data_point(self):
        root = pass_root()
        pd = properties(root, 'SubjectProperty')[0].find(q('PROPERTY_DETAIL'))
        pd.remove(pd.find(q('NativeAmericanLandsIndicator')))
        r = self.assertFires(root, 'UAD1040')
        self.assertEqual(r['status'], 'FAIL')

    def test_subject_rule_is_scoped_to_the_subject(self):
        root = pass_root()
        comp = properties(root, 'SalesComparable')[0]
        before = run(root)['ruleCounts']
        pd = comp.find(q('PROPERTY_DETAIL'))
        el = pd.find(q('NativeAmericanLandsIndicator'))
        if el is not None:
            pd.remove(el)
        self.assertNotIn('UAD1040', run(root)['ruleCounts'])
        self.assertEqual(before, {})

    def test_comparable_rule_names_the_right_comparable(self):
        root = pass_root()
        comp = properties(root, 'SalesComparable')[1]
        addr = comp.find(q('ADDRESS'))
        addr.remove(addr.find(q('PostalCode')))
        r = self.assertFires(root, 'UAD1392')
        f = next(f for f in r['findings'] if f['ruleId'] == 'UAD1392')
        idx = list(root.iter(q('PROPERTY'))).index(comp)
        self.assertIn(f'PROPERTY[{idx + 1}]/ADDRESS/PostalCode', f['path'])
        self.assertEqual(r['ruleCounts']['UAD1392'], 1)

    def test_conditional_required_in_each_instance(self):
        root = pass_root()
        hit = None
        for d in root.iter(q('CAR_STORAGE_DETAIL')):
            if (d.findtext(q('CarStorageType')) or '') in ('Garage', 'Carport', 'Driveway') and d.find(q('ParkingSpacesCount')) is not None:
                hit = d
                break
        self.assertIsNotNone(hit, 'fixture has a car storage with a parking count')
        hit.remove(hit.find(q('ParkingSpacesCount')))
        r = run(root)
        self.assertTrue({'UAD1671', 'UAD1411'} & set(r['ruleCounts']), r['ruleCounts'])

    def test_condition_false_means_no_finding(self):
        root = pass_root()
        # An "Other" description is only required when the type is "Other".
        for e in root.iter(q('ViewTypeOtherDescription')):
            raise unittest.SkipTest('fixture already uses ViewType Other')
        self.assertEqual(run(root)['findingCount'], 0)

    def test_numeric_comparison(self):
        root = pass_root()
        for e in root.iter(q('OpinionOfValueAmount')):
            e.text = '2000000000'
        self.assertFires(root, 'UAD1264')

    def test_comparison_inside_a_filtered_instance(self):
        root = pass_root()
        subj = properties(root, 'SubjectProperty')[0]
        for det in subj.iter(q('IMPROVEMENT_DETAIL')):
            if det.findtext(q('ImprovementType')) == 'Dwelling':
                det.find(q('PropertyStructureBuiltYear')).text = '1700'
                break
        self.assertFires(root, 'UAD1052', severity='warning')   # H-1 severity: Warning

    def test_instance_count(self):
        root = pass_root()
        subj = properties(root, 'SubjectProperty')[0]
        invs = subj.find(q('MARKET/MARKET_INVENTORIES'))
        active = next(i for i in invs if i.findtext(q('MarketInventoryType')) == 'ActiveListings')
        invs.append(ET.fromstring(ET.tostring(active)))
        self.assertFires(root, 'UAD1637')
        invs.remove(active)
        invs.remove(invs[-1])
        self.assertFires(root, 'UAD1638')

    def test_uniqueness(self):
        root = pass_root()
        comps = properties(root, 'SalesComparable')
        a, b = (c.find(q('COMPARABLE/COMPARABLE_DETAIL/PropertyOrdinalNumber')) for c in comps[:2])
        self.assertIsNotNone(a)
        b.text = a.text
        self.assertFires(root, 'UAD1432')

    def test_zip_and_state_formats(self):
        root = pass_root()
        addr = properties(root, 'SubjectProperty')[0].find(q('ADDRESS'))
        addr.find(q('PostalCode')).text = '1234'
        addr.find(q('StateCode')).text = 'ZZ'
        r = run(root)
        self.assertIn('UAD1005', r['ruleCounts'])
        self.assertIn('UAD1007', r['ruleCounts'])

    def test_date_rules(self):
        root = pass_root()
        r = run(root, as_of='2019-01-01')   # the report is dated after this
        self.assertIn('UAD1258', r['ruleCounts'])
        r = run(root, as_of='2021-01-01')
        self.assertEqual(set(r['ruleCounts']), {'UAD1259', 'UAD1506'})
        self.assertEqual(r['status'], 'WARN')

    def test_enumeration_and_boolean_and_cardinality(self):
        root = pass_root()
        subj = properties(root, 'SubjectProperty')[0]
        subj.find(q('PROPERTY_DETAIL/AttachmentType')).text = 'Floating'
        subj.find(q('PROPERTY_DETAIL/PUDIndicator')).text = 'yes'          # booleans are a closed list too
        subj.find(q('LOCATION_IDENTIFIER/GEOSPATIAL_INFORMATION/LatitudeIdentifier')).text = '38.1234567890'
        addr = subj.find(q('ADDRESS'))
        subj.insert(list(subj).index(addr) + 1, ET.fromstring(ET.tostring(addr)))   # ADDRESS is 1:1 for the subject
        r = run(root)
        enum_paths = [f['path'] for f in r['findings'] if f['ruleId'] == 'A1-ENUM']
        self.assertTrue(any(p.endswith('/AttachmentType') for p in enum_paths), enum_paths)
        self.assertTrue(any(p.endswith('/PUDIndicator') for p in enum_paths), enum_paths)
        self.assertTrue({'A1-FORMAT', 'A1-CARDINALITY'} <= set(r['ruleCounts']), r['ruleCounts'])

    def test_empty_and_unknown_elements(self):
        root = pass_root()
        pd = properties(root, 'SubjectProperty')[0].find(q('PROPERTY_DETAIL'))
        pd.find(q('DwellingCount')).text = ''
        ET.SubElement(pd, q('MadeUpElement')).text = '1'
        r = run(root)
        self.assertIn('A1-EMPTY', r['ruleCounts'])
        self.assertEqual(next(f for f in r['findings'] if f['ruleId'] == 'A1-UNKNOWN')['severity'], 'warning')


class UadInputErrors(unittest.TestCase):
    def assertInputError(self, body, fragment, **kw):
        with self.assertRaises(runners.InputError) as cm:
            runners.run_uad(body, **kw)
        self.assertIn(fragment, str(cm.exception))

    def test_not_a_uad_file(self):
        self.assertInputError(b'', 'request body')
        self.assertInputError(b'{"a": 1}', 'well-formed XML')
        self.assertInputError(b'<root/>', 'MESSAGE')
        self.assertInputError(b'%PDF-1.7', 'PDF')
        self.assertInputError(b'PK\x03\x04rest', 'ZIP')
        self.assertInputError(f'<MESSAGE xmlns="{NS}" MISMOReferenceModelIdentifier="2.6"/>'.encode(), 'legacy UAD')
        self.assertInputError(f'<MESSAGE xmlns="{NS}" MISMOReferenceModelIdentifier="3.6.0366"/>'.encode(), 'report type')

    def test_entities_are_refused(self):
        bomb = (b'<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;">]>'
                b'<MESSAGE>&lol2;</MESSAGE>')
        self.assertInputError(bomb, 'DOCTYPE')

    def test_update_and_completion_reports_are_not_supported(self):
        raw = (FIX / 'uad-pass.xml').read_text('utf-8')
        for rid, name in (('Appraisal Update Report Delivery Specification v1.0', 'Update Report'),
                          ('Completion Report Delivery Specification v1.0', 'Completion Report')):
            body = re.sub(r'(<ValuationReportContentIdentifier>)[^<]+', r'\g<1>' + rid, raw).encode()
            self.assertInputError(body, name)

    def test_bad_as_of(self):
        self.assertInputError((FIX / 'uad-pass.xml').read_bytes(), 'asOf', as_of='20/09/2019')


class UadRuleTable(unittest.TestCase):
    """rules.json is SpreadRun's own table: paths, formats, enumerations and translated rule logic. It must not
    carry MISMO definitions, and every H-1 rule is either translated or listed as not implemented with a reason."""

    def setUp(self):
        self.r = json.loads((ROOT / 'pylib/spreadrun_api/validators/uad/rules.json').read_text('utf-8'))

    def test_sources_and_coverage(self):
        self.assertEqual(set(self.r['sources']), {'a1', 'h1'})
        for s in self.r['sources'].values():
            self.assertRegex(s['sha256'], r'^[0-9a-f]{64}$')
        ids = [x['id'] for x in self.r['rules']] + [x['id'] for x in self.r['notImplemented']]
        self.assertGreater(len(ids), 700)
        self.assertTrue(all(x['reason'] for x in self.r['notImplemented']))
        self.assertGreaterEqual(len(self.r['rules']) / len(ids), 0.7)

    def test_no_definitions_copied(self):
        for entries in self.r['datapoints'].values():
            for e in entries:
                self.assertEqual(set(e), {'id', 'fmt', 'det', 'enum', 'use', 'req'})


SAMPLES = os.environ.get('UAD_SAMPLES_DIR')


@unittest.skipUnless(SAMPLES and Path(SAMPLES).is_dir(), 'set UAD_SAMPLES_DIR to the GSE D-1 sample XML folder')
class GseSampleScenarios(unittest.TestCase):
    def test_every_sample_passes_as_of_its_signature_date(self):
        files = sorted(Path(SAMPLES).glob('*.xml'))
        self.assertGreaterEqual(len(files), 12)
        for f in files:
            b = f.read_bytes()
            dates = re.findall(rb'<(?:ExecutionDate|AppraisalReportEffectiveDate)>(\d{4}-\d{2}-\d{2})<', b)
            r = runners.run_uad(b, as_of=max(dates).decode())
            self.assertEqual(r['status'], 'PASS', (f.name, r['findings'][:3]))


class UadBilling(unittest.TestCase):
    def setUp(self):
        self.fake = FakeStore()
        self.p = [mock.patch.object(store, 'rpc', self.fake.rpc),
                  mock.patch.object(store, 'auth_user', self.fake.auth_user),
                  mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'})]
        for p in self.p:
            p.start()

    def tearDown(self):
        for p in self.p:
            p.stop()

    def test_completed_report_costs_one_dollar(self):
        key, user = self.fake.add_user(250)
        status, out = call(UAD, 'paid', (FIX / 'uad-fail.xml').read_bytes(), {'Authorization': f'Bearer {key}'},
                           f'/api/v1/{UAD}?asOf={AS_OF}')
        self.assertEqual(status, 200, out)
        self.assertEqual(out['report']['status'], 'FAIL')   # FAIL is a completed report: charged
        self.assertEqual((out['priceCents'], out['balanceCents']), (100, 150))
        self.assertEqual(self.fake.balance[user], 150)

    def test_signed_in_session_pays_too(self):
        jwt, user = self.fake.add_session(100)
        status, out = call(UAD, 'paid', (FIX / 'uad-pass.xml').read_bytes(), {'Authorization': f'Bearer {jwt}'}, f'/?asOf={AS_OF}')
        self.assertEqual((status, out['report']['status'], self.fake.balance[user]), (200, 'PASS', 0))

    def test_ninety_nine_cents_is_not_enough(self):
        key, user = self.fake.add_user(99)
        status, out = call(UAD, 'paid', (FIX / 'uad-pass.xml').read_bytes(), {'Authorization': f'Bearer {key}'})
        self.assertEqual(status, 402)
        self.assertEqual(out['error']['priceCents'], 100)
        self.assertEqual(self.fake.balance[user], 99)

    def test_invalid_input_is_free(self):
        key, user = self.fake.add_user(500)
        for body in (b'not xml', b'<root/>'):
            status, out = call(UAD, 'paid', body, {'Authorization': f'Bearer {key}'})
            self.assertEqual(status, 400)
            self.assertFalse(out['error']['charged'])
        self.assertEqual(self.fake.balance[user], 500)

    def test_demo_is_free_and_capped(self):
        status, out = call(UAD, 'demo', (FIX / 'uad-pass.xml').read_bytes(), {'X-Forwarded-For': '203.0.113.9'}, f'/?asOf={AS_OF}')
        self.assertEqual((status, out['charged'], out['report']['status']), (200, False, 'PASS'))
        big = b'<MESSAGE>' + b' ' * (1024 * 1024) + b'</MESSAGE>'
        status, out = call(UAD, 'demo', big, {'X-Forwarded-For': '203.0.113.9'})
        self.assertEqual(status, 413)

    def test_routes(self):
        self.assertEqual(handler.resolve_route(f'/api/v1/{UAD}?asOf=2026-01-01'), (UAD, 'paid'))
        self.assertEqual(handler.resolve_route(f'/api/[channel]/[slug]?channel=demo&slug={UAD}'), (UAD, 'demo'))


if __name__ == '__main__':
    unittest.main()
