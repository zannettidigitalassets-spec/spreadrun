"""Tests for the CMMC Self-Assessment Score Validator.

Run from the repo root:  python3.12 -m unittest discover -s pylib/tests -v
Fixtures are synthetic: an invented contractor with the placeholder CAGE code 00000. Nothing here touches the network.
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

from spreadrun_api import runners, store  # noqa: E402
from test_api import FakeStore, call  # noqa: E402

CMMC = 'cmmc-self-assessment-validator'
engine = runners.cmmc_module()
IDS = list(engine.ORDER)


def pkg(name='cmmc-clean'):
    return json.loads((FIX / f'{name}.json').read_text())


def with_results(changes, base='cmmc-clean', claimed='auto'):
    p = pkg(base)
    p['requirements'] = [{'id': r['id'], 'status': changes.get(r['id'], r['status'])} for r in p['requirements']]
    if claimed == 'auto':
        p['assessment'].pop('claimedScore', None)
    else:
        p['assessment']['claimedScore'] = claimed
    return p


def run(p, as_of=date(2026, 10, 5)):
    return runners.run_cmmc(json.dumps(p).encode(), as_of=as_of)


def rules(p, **kw):
    return set(run(p, **kw)['ruleCounts'])


class Methodology(unittest.TestCase):
    """The point values are 32 CFR 170.24(c)(2)(i)(B), checked against eCFR in October 2026."""

    def test_table(self):
        pts = {r: engine.REQUIREMENTS[r]['points'] for r in IDS}
        self.assertEqual(len(IDS), 110)
        self.assertEqual(sum(1 for v in pts.values() if v == 5), 44)       # 42 listed plus 3.5.3 and 3.13.11
        self.assertEqual(sum(1 for v in pts.values() if v == 3), 14)
        self.assertEqual(sum(1 for v in pts.values() if v == 1), 51)
        self.assertIsNone(pts['3.12.4'])
        self.assertEqual(engine.MIN_SCORE, -203)                            # DOJ: "score range of -203 to 110"
        self.assertEqual(engine.CONDITIONAL_MIN, 88)
        for r, v in {'3.1.1': 5, '3.1.5': 3, '3.1.3': 1, '3.12.2': 3, '3.14.7': 3, '3.13.16': 1, '3.4.8': 5}.items():
            self.assertEqual(pts[r], v, r)

    def test_requirement_ids_match_nist_families(self):
        sizes = {'1': 22, '2': 3, '3': 9, '4': 9, '5': 11, '6': 3, '7': 6, '8': 9, '9': 2, '10': 6, '11': 3, '12': 4,
                 '13': 16, '14': 7}
        for fam, n in sizes.items():
            self.assertEqual(sum(1 for r in IDS if r.split('.')[1] == fam), n, fam)

    def test_all_met_is_110(self):
        r = run(pkg())
        self.assertEqual((r['status'], r['verifiedScore'], r['band']['key']), ('PASS', 110, 'final'), r['findings'])
        self.assertEqual({x['status'] for x in r['readiness']}, {'ready'})

    def test_all_not_met_is_minus_203(self):
        p = with_results({i: 'NOT MET' for i in IDS if i != '3.12.4'})
        p['assessment']['poamInPlace'] = True
        self.assertEqual(run(p)['verifiedScore'], -203)

    def test_not_applicable_counts_as_met(self):
        self.assertEqual(run(with_results({'3.13.5': 'NOT APPLICABLE', '3.1.16': 'N/A'}))['verifiedScore'], 110)

    def test_partial_credit(self):
        self.assertEqual(run(with_results({'3.5.3': 'PARTIAL'}))['verifiedScore'], 107)
        self.assertEqual(run(with_results({'3.5.3': 'NOT MET'}))['verifiedScore'], 105)
        self.assertEqual(run(with_results({'3.13.11': 'PARTIAL'}))['verifiedScore'], 107)
        self.assertEqual(run(with_results({'3.13.11': 'not met'}))['verifiedScore'], 105)
        self.assertIn('CMMC-REQ-PARTIAL', rules(with_results({'3.1.1': 'PARTIAL'})))

    def test_ssp_required(self):
        for st in ('NOT MET', 'NOT APPLICABLE'):
            r = run(with_results({'3.12.4': st}))
            self.assertIsNone(r['verifiedScore'])
            self.assertIn('CMMC-SSP-MISSING', r['ruleCounts'])
            self.assertEqual(r['band']['key'], 'not-scored')
        p = pkg()
        p['assessment']['sspInPlace'] = False
        self.assertIn('CMMC-SSP-MISSING', rules(p))

    def test_claimed_score(self):
        self.assertNotIn('CMMC-SCORE-MISMATCH', rules(with_results({'3.1.1': 'NOT MET'}, claimed=105)))
        self.assertIn('CMMC-SCORE-MISMATCH', rules(with_results({'3.1.1': 'NOT MET'}, claimed=109)))
        self.assertIn('CMMC-SCORE-RANGE', rules(with_results({}, claimed=111)))
        r = run(with_results({}, claimed='auto'))
        self.assertEqual(r['claimedScore'], {'provided': False, 'matches': None})

    def test_ids_with_cmmc_prefix(self):
        p = pkg()
        p['requirements'] = [{'id': f"{engine.REQUIREMENTS[x['id']]['family']}.L2-{x['id']}", 'status': x['status']}
                             for x in p['requirements']]
        self.assertEqual(run(p)['verifiedScore'], 110)
        p['requirements'][0]['id'] = 'SC.L2-3.1.1'   # wrong family prefix
        self.assertIn('CMMC-REQ-UNKNOWN', rules(p))


class Thresholds(unittest.TestCase):
    def test_conditional_at_88(self):
        ones = [i for i in IDS if engine.REQUIREMENTS[i]['points'] == 1 and i not in engine.POAM_EXCLUDED]
        p = with_results({i: 'NOT MET' for i in ones[:22]})
        p['assessment']['poamInPlace'] = True
        r = run(p)
        self.assertEqual((r['verifiedScore'], r['band']['key'], r['status']), (88, 'conditional', 'WARN'))
        p = with_results({i: 'NOT MET' for i in ones[:23]})
        p['assessment']['poamInPlace'] = True
        r = run(p)
        self.assertEqual((r['verifiedScore'], r['band']['key']), (87, 'none'))
        self.assertIn('CMMC-BAND-NONE', r['ruleCounts'])

    def test_poam_eligibility(self):
        def blocked(changes):
            p = with_results(changes)
            p['assessment']['poamInPlace'] = True
            r = run(p)
            return {f['requirement'] for f in r['findings'] if f['ruleId'] == 'CMMC-POAM-INELIGIBLE'}, r['band']['key']
        self.assertEqual(blocked({'3.1.3': 'NOT MET'}), (set(), 'conditional'))
        self.assertEqual(blocked({'3.13.11': 'PARTIAL'}), (set(), 'conditional'))     # the one 3-point exception
        self.assertEqual(blocked({'3.5.3': 'PARTIAL'}), ({'3.5.3'}, 'none'))
        self.assertEqual(blocked({'3.1.5': 'NOT MET'}), ({'3.1.5'}, 'none'))
        self.assertEqual(blocked({'3.10.3': 'NOT MET'}), ({'3.10.3'}, 'none'))        # 1 point, but excluded
        self.assertEqual(blocked({'3.13.11': 'NOT MET'}), ({'3.13.11'}, 'none'))

    def test_poam_required(self):
        self.assertIn('CMMC-POAM-MISSING', rules(with_results({'3.1.3': 'NOT MET'})))
        self.assertNotIn('CMMC-POAM-MISSING', rules(pkg()))

    def test_conditional_closeout_window(self):
        p = pkg('cmmc-conditional')
        self.assertNotIn('CMMC-STATUS-EXPIRED', rules(p))
        self.assertIn('CMMC-STATUS-EXPIRING', rules(p, as_of=date(2027, 3, 1)))
        self.assertIn('CMMC-STATUS-EXPIRED', rules(p, as_of=date(2027, 3, 20)))


class SprsDetails(unittest.TestCase):
    def test_cage(self):
        p = pkg()
        p['assessment']['cageCodes'] = []
        self.assertIn('CMMC-CAGE-MISSING', rules(p))
        p['assessment']['cageCodes'] = ['1ab2c', '1AB2C', '12-45', '123456']
        r = run(p)
        self.assertEqual(r['ruleCounts'].get('CMMC-CAGE-FORMAT'), 2)
        self.assertEqual(r['ruleCounts'].get('CMMC-CAGE-DUPLICATE'), 1)

    def test_dates(self):
        for v, rule in (('2026-13-01', 'CMMC-DATE-FORMAT'), ('2026-12-01', 'CMMC-DATE-FUTURE'),
                        ('2023-10-05', 'CMMC-DATE-EXPIRED')):
            p = pkg()
            p['assessment']['assessmentDate'] = v
            p['affirmation']['affirmationDate'] = '2026-10-01'
            self.assertIn(rule, rules(p), v)
        p = pkg()
        del p['assessment']['assessmentDate']
        self.assertIn('CMMC-DATE-MISSING', rules(p))

    def test_scope(self):
        p = pkg()
        p['assessment']['scopeDefined'] = False
        self.assertIn('CMMC-SCOPE-MISSING', rules(p))

    def test_affirmation(self):
        for key in ('affirmingOfficialIdentified', 'titleAndContactProvided', 'statementAffirmed'):
            p = pkg()
            p['affirmation'][key] = False
            self.assertIn('CMMC-AFFIRM-MISSING', rules(p), key)
        p = pkg()
        p['affirmation']['affirmationDate'] = '2026-09-01'
        self.assertIn('CMMC-AFFIRM-BEFORE', rules(p))
        p['assessment']['assessmentDate'] = '2025-06-01'
        p['affirmation']['affirmationDate'] = '2025-06-02'
        self.assertIn('CMMC-AFFIRM-STALE', rules(p))
        del p['affirmation']['affirmationDate']
        self.assertIn('CMMC-AFFIRM-DATE', rules(p))


class RowChecks(unittest.TestCase):
    def test_missing_duplicate_unknown_status(self):
        p = pkg()
        p['requirements'] = p['requirements'][1:] + [{'id': '3.2.1', 'status': 'MET'}, {'id': '3.15.1', 'status': 'MET'}]
        p['requirements'][5]['status'] = 'Yes'
        r = run(p)
        self.assertIsNone(r['verifiedScore'])
        for rule in ('CMMC-REQ-MISSING', 'CMMC-REQ-DUPLICATE', 'CMMC-REQ-UNKNOWN', 'CMMC-REQ-STATUS'):
            self.assertIn(rule, r['ruleCounts'])
        self.assertEqual(r['readiness'][0]['status'], 'fix')

    def test_csv_input(self):
        r = run(pkg('cmmc-conditional'))
        self.assertEqual((r['verifiedScore'], r['band']['key']), (102, 'conditional'))
        p = pkg()
        rows = '\n'.join(f"{x['id']},{x['status']}" for x in p.pop('requirements'))
        p['requirementsCsv'] = '﻿Requirement ID,Result,Notes\n' + rows.replace('3.1.1,MET', '3.1.1,Not Met') + '\n,,\n'
        self.assertEqual(run(p)['verifiedScore'], 105)

    def test_samples(self):
        self.assertEqual(run(pkg('cmmc-clean'))['status'], 'PASS')
        r = run(pkg('cmmc-errors'))
        self.assertEqual((r['status'], r['verifiedScore']), ('FAIL', 94))
        for rule in ('CMMC-SCORE-MISMATCH', 'CMMC-POAM-INELIGIBLE', 'CMMC-POAM-MISSING', 'CMMC-CAGE-FORMAT',
                     'CMMC-AFFIRM-MISSING', 'CMMC-BAND-NONE'):
            self.assertIn(rule, r['ruleCounts'])

    def test_demo_sample_hashes_match_the_published_samples(self):
        found = {}
        for name in ('cmmc-clean', 'cmmc-conditional', 'cmmc-errors'):
            raw = (ROOT / 'public' / 'samples' / f'{name}.json').read_bytes()
            self.assertEqual(engine.demo_sample(raw), name)
            self.assertEqual(raw, (FIX / f'{name}.json').read_bytes(), 'test fixtures are copies of the samples')
            found[name] = True
        self.assertEqual(len(engine.DEMO_SAMPLES), 3)
        self.assertIsNone(engine.demo_sample(b'not json'))

    def test_demo_error_does_not_echo(self):
        p = pkg('cmmc-errors')
        p['assessment']['cageCodes'] = [MARK]
        with self.assertRaises(runners.InputError) as cm:
            runners.run_cmmc(json.dumps(p).encode(), demo=True)
        self.assertNotIn(MARK, str(cm.exception))

    def test_input_errors(self):
        p = pkg()
        cases = [b'not json', b'[]', json.dumps({**p, 'assessment': None}).encode(),
                 json.dumps({**p, 'assessment': {**p['assessment'], 'level': 1}}).encode(),
                 json.dumps({**p, 'requirementsCsv': 'requirement,status\n'}).encode(),
                 json.dumps({k: v for k, v in p.items() if k != 'requirements'}).encode(),
                 json.dumps({**p, 'requirements': []}).encode(),
                 json.dumps({**p, 'assessment': {**p['assessment'], 'claimedScore': '110'}}).encode(),
                 json.dumps({**p, 'requirementsCsv': 'a,b\n1,2\n', 'requirements': None}).encode(),
                 json.dumps({k: v for k, v in {**p, 'requirementsCsv': 'control,notes\n3.1.1,x\n'}.items()
                             if k != 'requirements'}).encode()]
        for body in cases:
            with self.assertRaises(runners.InputError, msg=body[:80]):
                runners.run_cmmc(body)


MARK = 'ZQXMARK'


class CmmcNoEcho(unittest.TestCase):
    """Reports and errors never repeat a value from the submission: only rule IDs, paths and NIST requirement IDs."""

    def _marked(self, p):
        p = copy.deepcopy(p)
        p['assessment']['cageCodes'] = [f'{MARK}1', 'Z' + MARK[:4]]
        p['assessment']['scopeNotes'] = f'{MARK} enclave'
        p['assessment']['claimedScore'] = 97
        p['affirmation']['officialName'] = f'{MARK} official'
        p['affirmation']['affirmationDate'] = f'{MARK}-date'
        p['assessment']['assessmentDate'] = '2026-09-13'
        return p

    def test_no_marker_in_report(self):
        for name in ('cmmc-clean', 'cmmc-conditional', 'cmmc-errors'):
            p = self._marked(pkg(name))
            if 'requirements' in p:
                p['requirements'][3] = {'id': f'{MARK}3.1.4', 'status': f'{MARK}MET', 'evidence': MARK}
                p['requirements'][4]['status'] = MARK
            else:
                p['requirementsCsv'] = p['requirementsCsv'].replace('3.1.4,MET', f'{MARK},{MARK}', 1)
                p['requirementsCsv'] = p['requirementsCsv'].replace('requirement,status', f'requirement,status,{MARK}')
            out = json.dumps(run(p))
            self.assertNotIn(MARK, out)
            self.assertNotIn('2026-09-13', out, 'dates from the submission are not echoed')
            self.assertNotIn('97', json.dumps(run(p)['claimedScore']))

    def test_errors_do_not_echo(self):
        p = pkg()
        for body in (f'{{"assessment": {{"level": "{MARK}"}}}}'.encode(),
                     json.dumps({**p, 'assessment': {**p['assessment'], 'claimedScore': MARK}}).encode(),
                     json.dumps({**p, 'assessment': {**p['assessment'], 'cageCodes': MARK}}).encode(),
                     json.dumps({**p, 'assessment': {**p['assessment'], 'scopeNotes': MARK * 40}}).encode(),
                     json.dumps({k: v for k, v in {**p, 'requirementsCsv': f'{MARK},{MARK}\n'}.items()
                                 if k != 'requirements'}).encode()):
            with self.assertRaises(runners.InputError) as cm:
                runners.run_cmmc(body)
            self.assertNotIn(MARK, str(cm.exception))

    def test_paid_response_and_stored_rows_do_not_echo(self):
        fake = FakeStore()
        key, _ = fake.add_user(5000)
        body = json.dumps(self._marked(pkg('cmmc-errors'))).encode()
        with mock.patch.object(store, 'rpc', fake.rpc), mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'}):
            status, payload = call(CMMC, 'paid', body, {'Authorization': f'Bearer {key}'})
        self.assertEqual(status, 200, payload)
        self.assertNotIn(MARK, json.dumps(payload))
        self.assertNotIn(MARK, json.dumps([fake.ledger, fake.calls]))


class CmmcRoute(unittest.TestCase):
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
        status, payload = call(CMMC, 'paid', json.dumps(pkg()).encode(), {'Authorization': f'Bearer {self.key}'})
        self.assertEqual(status, 200, payload)
        self.assertTrue(payload['charged'])
        self.assertEqual(payload['priceCents'], 2500)
        self.assertEqual(payload['balanceCents'], 500)
        self.assertEqual(payload['report']['verifiedScore'], 110)
        self.assertEqual([c['outcome'] for c in self.fake.calls], ['completed'])

    def test_fail_report_is_still_charged(self):
        status, payload = call(CMMC, 'paid', json.dumps(pkg('cmmc-errors')).encode(), {'Authorization': f'Bearer {self.key}'})
        self.assertEqual((status, payload['charged'], payload['report']['status']), (200, True, 'FAIL'))

    def test_input_error_uncharged(self):
        status, payload = call(CMMC, 'paid', b'{"assessment": {"level": 1}}', {'Authorization': f'Bearer {self.key}'})
        self.assertEqual(status, 400)
        self.assertEqual(self.fake.balance[self.user], 3000)
        self.assertEqual([c['outcome'] for c in self.fake.calls], ['input_error'])

    def test_short_credit_402(self):
        key, _ = self.fake.add_user(2400)
        status, payload = call(CMMC, 'paid', json.dumps(pkg()).encode(), {'Authorization': f'Bearer {key}'})
        self.assertEqual(status, 402)
        self.assertEqual(payload['error']['priceCents'], 2500)

    def test_demo_free(self):
        status, payload = call(CMMC, 'demo', json.dumps(pkg('cmmc-errors')).encode(), {'X-Forwarded-For': '203.0.113.9'})
        self.assertEqual(status, 200, payload)
        self.assertFalse(payload['charged'])
        self.assertEqual(self.fake.balance[self.user], 3000)

    def test_demo_runs_each_sample_free(self):
        for name in ('cmmc-clean', 'cmmc-conditional', 'cmmc-errors'):
            raw = (ROOT / 'public' / 'samples' / f'{name}.json').read_bytes()
            reformatted = json.dumps(json.loads(raw), separators=(',', ':'), sort_keys=True).encode()
            for body in (raw, reformatted):
                status, payload = call(CMMC, 'demo', body, {'X-Forwarded-For': '203.0.113.9'})
                self.assertEqual(status, 200, (name, payload))
                self.assertFalse(payload['charged'])
        self.assertEqual(self.fake.balance[self.user], 3000)

    def test_demo_refuses_own_data(self):
        own = [pkg(), with_results({'3.1.3': 'NOT MET'}, claimed=109)]
        changed = pkg('cmmc-errors')
        changed['assessment']['claimedScore'] = 94           # one value changed from the sample
        own.append(changed)
        for p in own:
            status, payload = call(CMMC, 'demo', json.dumps({**p, 'asOf': '2026-10-04'}).encode(),
                                   {'X-Forwarded-For': '203.0.113.9'})
            self.assertEqual(status, 400, payload)
            self.assertEqual(payload['error']['code'], 'input_error')
            self.assertIn('sample packages only', payload['error']['message'])
            self.assertIn('$25.00', payload['error']['message'])
        self.assertEqual(self.fake.balance[self.user], 3000)
        self.assertTrue(all(c['outcome'] == 'input_error' for c in self.fake.calls))

    def test_paid_runs_own_data(self):
        p = with_results({'3.1.3': 'NOT MET'}, claimed=109)
        p['assessment']['poamInPlace'] = True
        status, payload = call(CMMC, 'paid', json.dumps(p).encode(), {'Authorization': f'Bearer {self.key}'})
        self.assertEqual((status, payload['charged'], payload['priceCents']), (200, True, 2500))
        self.assertEqual(payload['report']['verifiedScore'], 109)

    def test_demo_size_limit(self):
        p = pkg()
        p['requirementsPadding'] = 'x' * (65 * 1024)
        status, _ = call(CMMC, 'demo', json.dumps(p).encode(), {'X-Forwarded-For': '203.0.113.9'})
        self.assertEqual(status, 413)

    def test_catalog_price(self):
        from spreadrun_api.catalog import APIS
        self.assertEqual(APIS[CMMC]['price_cents'], 2500)


if __name__ == '__main__':
    unittest.main()
