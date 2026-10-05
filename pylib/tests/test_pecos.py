"""Tests for the PECOS Medicare Enrollment Pre-Check.

Run from the repo root:  python3.12 -m unittest discover -s pylib/tests -v
Fixtures are synthetic: an invented practice with an NPI that passes the check digit but is not in NPPES. The live
NPPES call is replaced by a stand-in in every test; nothing here touches the network.
"""
import copy
import json
import sys
import unittest
from datetime import date
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pylib'))
sys.path.insert(0, str(Path(__file__).parent))
FIX = Path(__file__).parent / 'fixtures'

from spreadrun_api import handler, runners, store  # noqa: E402
from test_api import FakeStore, call  # noqa: E402

PECOS = 'pecos-enrollment-precheck'
engine = runners.pecos_module()


def draft(name='pecos-clean'):
    return json.loads((FIX / f'{name}.json').read_text())


def org_record(name='Example Valley Family Medicine LLC', codes=('261QP2300X',), status='A', kind='NPI-2'):
    return {'number': '1555555550', 'enumeration_type': kind,
            'basic': {'status': status, 'organization_name': name, 'first_name': 'Pat', 'last_name': 'Example'},
            'taxonomies': [{'code': c, 'primary': i == 0} for i, c in enumerate(codes)]}


def run(p, rec='default'):
    rec = org_record() if rec == 'default' else rec
    return runners.run_pecos(json.dumps(p).encode(), lookup=lambda npi: rec)


def rules(p, rec='default'):
    return set(run(p, rec)['ruleCounts'])


class PecosChecks(unittest.TestCase):
    def test_clean_draft_passes(self):
        r = run(draft())
        self.assertEqual(r['status'], 'PASS', r['findings'])
        self.assertTrue(r['registry']['queried'])
        self.assertEqual({x['status'] for x in r['readiness']}, {'ready', 'not-applicable'})
        self.assertEqual(r['windowEnds'], '2027-01-03')

    def test_check_digit(self):
        self.assertTrue(engine.npi_check_digit_ok('1234567893'))   # the CMS worked example
        self.assertFalse(engine.npi_check_digit_ok('1234567890'))
        p = draft()
        p['provider']['npi'] = '1555555551'
        calls = []
        r = runners.run_pecos(json.dumps(p).encode(), lookup=lambda n: calls.append(n))
        self.assertIn('PEC-NPI-CHECKDIGIT', r['ruleCounts'])
        self.assertEqual(calls, [], 'a mistyped NPI is not sent to the registry')
        self.assertFalse(r['registry']['queried'])
        self.assertIn('not-checked', {x['status'] for x in r['readiness']})

    def test_registry_outcomes(self):
        self.assertIn('PEC-NPPES-FOUND', rules(draft(), None))
        self.assertIn('PEC-NPPES-STATUS', rules(draft(), org_record(status='D')))
        self.assertIn('PEC-NPPES-TYPE', rules(draft(), org_record(kind='NPI-1')))
        self.assertIn('PEC-NPPES-NAME', rules(draft(), org_record(name='Some Other Clinic LLC')))
        # punctuation and case do not count as a registry name mismatch
        self.assertNotIn('PEC-NPPES-NAME', rules(draft(), org_record(name='EXAMPLE VALLEY FAMILY MEDICINE, L.L.C.')))
        r = run(draft(), org_record(codes=('207Q00000X', '261QP2300X')))
        self.assertIn('PEC-NPPES-TAXONOMY-PRIMARY', r['ruleCounts'])
        self.assertIn('PEC-NPPES-TAXONOMY', rules(draft(), org_record(codes=('207Q00000X',))))

    def test_registry_down_is_not_billed(self):
        def down(npi):
            raise engine.RegistryUnavailable('timeout')
        with self.assertRaises(runners.RegistryUnavailable):
            runners.run_pecos(json.dumps(draft()).encode(), lookup=down)

    def test_names(self):
        p = draft()
        p['provider']['irsLegalName'] = 'Example Valley Family Medicine, LLC'
        self.assertIn('PEC-NAME-IRS-PUNCT', rules(p))
        p['provider']['irsLegalName'] = 'Another Name LLC'
        self.assertIn('PEC-NAME-IRS', rules(p))
        del p['provider']['irsLegalName']
        self.assertIn('PEC-NAME-IRS-MISSING', rules(p))

    def test_individual(self):
        p = draft()
        p['enrollmentType'] = '855I'
        p['provider'] = {'npi': '1555555550', 'firstName': 'Pat', 'lastName': 'Example', 'taxonomyCodes': ['207Q00000X']}
        p['documents'] = ['cms588']
        rec = org_record(kind='NPI-1', codes=('207Q00000X',))
        r = run(p, rec)
        self.assertEqual(r['status'], 'PASS', r['findings'])
        self.assertIn('PEC-NPPES-TYPE', rules(p, org_record(codes=('207Q00000X',))))
        p['provider']['lastName'] = 'Different'
        self.assertIn('PEC-NPPES-NAME', rules(p, rec))

    def test_addresses(self):
        found = rules(draft('pecos-errors'))
        for rule in ('PEC-ADDR-POBOX', 'PEC-ZIP-PLUS4', 'PEC-ZIP-FORMAT', 'PEC-STATE', 'PEC-PHONE-MISSING',
                     'PEC-TAXONOMY-FORMAT'):
            self.assertIn(rule, found)
        p = draft()
        p['practiceLocations'] = []
        self.assertIn('PEC-LOC-NONE', rules(p))

    def test_dmepos_hours_insurance_bond(self):
        p = draft()
        p['enrollmentType'] = '855S'
        p['documents'] = ['licenses', 'liabilityInsurance', 'cp575', 'cms588', 'applicationFee', 'suretyBond']
        r = rules(p)
        self.assertTrue({'PEC-HOURS-MISSING', 'PEC-CRED-LIABILITY', 'PEC-CRED-SURETY'} <= r)
        p['practiceLocations'][0]['hoursPerWeek'] = 20
        p['credentials'] += [{'type': 'liability_insurance', 'expirationDate': '2027-09-01'},
                             {'type': 'surety_bond', 'expirationDate': '2027-09-01'}]
        r = rules(p)
        self.assertIn('PEC-HOURS-30', r)
        self.assertFalse({'PEC-HOURS-MISSING', 'PEC-CRED-LIABILITY', 'PEC-CRED-SURETY'} & r)
        p['practiceLocations'][0]['hoursExceptionApplies'] = True
        self.assertNotIn('PEC-HOURS-30', rules(p))

    def test_expiry_window(self):
        p = draft()
        p['credentials'] = [{'type': 'license', 'expirationDate': '2026-10-04'},
                            {'type': 'dea', 'expirationDate': '2027-01-03'},
                            {'type': 'malpractice_insurance', 'expirationDate': '2027-01-04'},
                            {'type': 'license', 'expirationDate': '2026-13-01'},
                            {'type': 'license'}]
        r = run(p)
        by_path = {f['path']: f['ruleId'] for f in r['findings'] if f['ruleId'].startswith('PEC-CRED')}
        self.assertEqual(by_path['/credentials[0]/expirationDate'], 'PEC-CRED-EXPIRED')
        self.assertEqual(by_path['/credentials[1]/expirationDate'], 'PEC-CRED-EXPIRING')
        self.assertNotIn('/credentials[2]/expirationDate', by_path)
        self.assertEqual(by_path['/credentials[3]/expirationDate'], 'PEC-CRED-DATE')
        self.assertEqual(by_path['/credentials[4]/expirationDate'], 'PEC-CRED-NO-EXPIRY')
        p['processingWindowDays'] = 30
        self.assertNotIn('PEC-CRED-EXPIRING', rules(p))

    def test_documents_and_conditions(self):
        p = draft()
        p['documents'] = ['licenses']
        r = run(p)
        missing = sorted(f['path'] for f in r['findings'] if f['ruleId'] == 'PEC-DOC-MISSING')
        self.assertEqual(missing, ['/documents/cms588', '/documents/cp575'])
        p['conditions'] = {'eftNotNeeded': True, 'cp575NotNeeded': True}
        self.assertNotIn('PEC-DOC-MISSING', rules(p))
        p['conditions'] = {'eftNotNeeded': True, 'cp575NotNeeded': True, 'participating': True, 'idtf': True}
        self.assertEqual(run(p)['counts']['documentsMissing'], 2)

    def test_signatures_and_revalidation(self):
        p = draft()
        p['officials'] = [{'role': 'delegated'}]
        self.assertIn('PEC-SIGN-AUTHORIZED', rules(p))
        p['applicationReason'] = 'change'
        self.assertNotIn('PEC-SIGN-AUTHORIZED', rules(p))
        p['applicationReason'] = 'revalidation'
        p['officials'] = [{'role': 'authorized'}]
        self.assertIn('PEC-REVAL-NO-DATE', rules(p))
        p['revalidationDueDate'] = '2026-09-30'
        self.assertIn('PEC-REVAL-PAST-DUE', rules(p))
        p['revalidationDueDate'] = '2026-12-31'
        self.assertEqual(run(p)['status'], 'PASS')

    def test_input_errors(self):
        for body in (b'not json', b'[]', json.dumps({'enrollmentType': '855A', 'provider': {}}).encode(),
                     json.dumps({'enrollmentType': '855B'}).encode(),
                     json.dumps({**draft(), 'processingWindowDays': 0}).encode(),
                     json.dumps({**draft(), 'conditions': {'idtf': 'yes'}}).encode(),
                     json.dumps({**draft(), 'documents': [1]}).encode()):
            with self.assertRaises(runners.InputError):
                runners.run_pecos(body, lookup=lambda n: org_record())

    def test_errors_sample_fails(self):
        r = run(draft('pecos-errors'))
        self.assertEqual(r['status'], 'FAIL')
        self.assertTrue({'PEC-NAME-IRS', 'PEC-CRED-EXPIRED', 'PEC-CRED-EXPIRING', 'PEC-DOC-MISSING',
                         'PEC-SIGN-AUTHORIZED'} <= set(r['ruleCounts']))


MARK = 'ZQXMARK'


class PecosNoEcho(unittest.TestCase):
    """Reports and errors never repeat a value from the submission. Every free-text value becomes a marker; the
    registry stand-in returns markers too, so registry data cannot leak into the report either."""

    def _marked(self, p):
        n = [0]

        def mark(v, key=None):
            if isinstance(v, dict):
                return {k: mark(x, k) for k, x in v.items()}
            if isinstance(v, list):
                return [mark(x, key) for x in v]
            if isinstance(v, str) and key not in ('enrollmentType', 'applicationReason', 'asOf', 'npi', 'type', 'role',
                                                  'expirationDate', 'revalidationDueDate') and key != 'documents':
                n[0] += 1
                return f'{MARK}{n[0]}x'
            return v
        return mark(p)

    def test_no_marker_in_report(self):
        for name in ('pecos-clean', 'pecos-errors'):
            p = self._marked(draft(name))
            p['documents'] = [f'{MARK}doc', 'cms588']
            rec = org_record(name=f'{MARK}registry', codes=(f'{MARK}TAX',))
            rec['basic']['first_name'] = MARK
            out = json.dumps(run(p, rec))
            self.assertNotIn(MARK, out)
            # dates from the submission are not echoed either
            self.assertNotIn('2026-11-15', out)

    def test_marker_values_that_still_match(self):
        p = draft()
        p['provider']['legalName'] = p['provider']['irsLegalName'] = f'{MARK} Clinic LLC'
        out = json.dumps(run(p, org_record(name=f'{MARK} Clinic LLC')))
        self.assertNotIn(MARK, out)

    def test_errors_do_not_echo(self):
        for body in (f'{{"enrollmentType": "{MARK}"}}'.encode(), json.dumps({**draft(), 'applicationReason': MARK}).encode(),
                     json.dumps({**draft(), 'provider': {'npi': '1555555550', 'taxonomyCodes': MARK}}).encode()):
            with self.assertRaises(runners.InputError) as cm:
                runners.run_pecos(body, lookup=lambda n: org_record())
            self.assertNotIn(MARK, str(cm.exception))

    def test_paid_response_and_stored_rows_do_not_echo(self):
        fake = FakeStore()
        key, user = fake.add_user(5000)
        p = self._marked(draft('pecos-errors'))
        body = json.dumps(p).encode()
        with mock.patch.object(store, 'rpc', fake.rpc), mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'}), \
                mock.patch.object(engine, 'nppes_lookup', lambda n: org_record(name=MARK)):
            status, payload = call(PECOS, 'paid', body, {'Authorization': f'Bearer {key}'})
        self.assertEqual(status, 200, payload)
        self.assertNotIn(MARK, json.dumps(payload))
        self.assertNotIn(MARK, json.dumps([fake.ledger, fake.calls]))


class PecosRoute(unittest.TestCase):
    def setUp(self):
        self.fake = FakeStore()
        self.key, self.user = self.fake.add_user(3000)
        self.patches = [mock.patch.object(store, 'rpc', self.fake.rpc), mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'})]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in self.patches:
            p.stop()

    def test_paid_run_charges_25(self):
        with mock.patch.object(engine, 'nppes_lookup', lambda n: org_record()):
            status, payload = call(PECOS, 'paid', json.dumps(draft()).encode(), {'Authorization': f'Bearer {self.key}'})
        self.assertEqual(status, 200, payload)
        self.assertTrue(payload['charged'])
        self.assertEqual(payload['priceCents'], 2500)
        self.assertEqual(payload['balanceCents'], 500)
        self.assertEqual(payload['report']['status'], 'PASS')

    def test_registry_down_returns_503_uncharged(self):
        def down(n):
            raise engine.RegistryUnavailable('x')
        with mock.patch.object(engine, 'nppes_lookup', down):
            status, payload = call(PECOS, 'paid', json.dumps(draft()).encode(), {'Authorization': f'Bearer {self.key}'})
        self.assertEqual(status, 503)
        self.assertEqual(payload['error']['code'], 'registry_unavailable')
        self.assertFalse(payload['error']['charged'])
        self.assertEqual(self.fake.balance[self.user], 3000)
        # api_calls.outcome only accepts five values, so the outage is logged as internal_error.
        self.assertEqual([c['outcome'] for c in self.fake.calls], ['internal_error'])

    def test_input_error_uncharged(self):
        status, payload = call(PECOS, 'paid', b'{"enrollmentType": "855A"}', {'Authorization': f'Bearer {self.key}'})
        self.assertEqual(status, 400)
        self.assertEqual(self.fake.balance[self.user], 3000)

    def test_short_credit_402(self):
        key, _ = self.fake.add_user(2400)
        status, payload = call(PECOS, 'paid', json.dumps(draft()).encode(), {'Authorization': f'Bearer {key}'})
        self.assertEqual(status, 402)
        self.assertEqual(payload['error']['priceCents'], 2500)

    def test_demo_free(self):
        with mock.patch.object(engine, 'nppes_lookup', lambda n: None):
            status, payload = call(PECOS, 'demo', json.dumps(draft()).encode(), {'X-Forwarded-For': '203.0.113.9'})
        self.assertEqual(status, 200, payload)
        self.assertFalse(payload['charged'])
        self.assertIn('PEC-NPPES-FOUND', payload['report']['ruleCounts'])

    def test_no_cache_between_runs(self):
        seen = []
        with mock.patch.object(engine, 'nppes_lookup', lambda n: seen.append(n) or org_record()):
            for _ in range(2):
                call(PECOS, 'demo', json.dumps(draft()).encode(), {'X-Forwarded-For': '203.0.113.9'})
        self.assertEqual(len(seen), 2, 'every run queries the registry again')

    def test_catalog_price(self):
        from spreadrun_api.catalog import APIS
        self.assertEqual(APIS[PECOS]['price_cents'], 2500)


if __name__ == '__main__':
    unittest.main()
