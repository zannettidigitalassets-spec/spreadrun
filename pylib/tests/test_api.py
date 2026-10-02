"""Offline tests for the Python API routes.

Run from the repo root:  python3.12 -m unittest discover -s pylib/tests -v
Needs requirements.txt installed. No network: the Supabase store is replaced by an in-memory fake
that mirrors the SQL functions' contracts (the SQL itself is tested in supabase/tests/).
"""
import gzip
import hashlib
import io
import json
import sys
import unittest
import uuid
from http.server import HTTPServer
from pathlib import Path
from threading import Thread
from unittest import mock
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pylib'))
FIX = Path(__file__).parent / 'fixtures'

from spreadrun_api import billing, handler, runners, store  # noqa: E402


class FakeStore:
    """Same contracts as the SQL functions in supabase/migrations/20261002_storefront.sql."""

    def __init__(self):
        self.keys = {}       # hash -> (user_id, key_id)
        self.balance = {}    # user_id -> cents
        self.ledger = []
        self.calls = []
        self.demo = {}

    def add_user(self, cents):
        user, key_id, raw = str(uuid.uuid4()), str(uuid.uuid4()), 'sr_' + uuid.uuid4().hex
        self.keys[billing.hash_key(raw)] = (user, key_id)
        self.balance[user] = cents
        return raw, user

    def rpc(self, fn, args, timeout=6):
        if fn == 'auth_api_key':
            hit = self.keys.get(args['p_key_hash'])
            return [{'user_id': hit[0], 'key_id': hit[1], 'balance_cents': self.balance[hit[0]]}] if hit else []
        if fn == 'charge_request':
            if any(l['request_id'] == args['p_request_id'] for l in self.ledger):
                return {'ok': True, 'balance_cents': self.balance[args['p_user_id']], 'duplicate': True}
            bal = self.balance[args['p_user_id']]
            if bal < args['p_price_cents']:
                return {'ok': False, 'reason': 'insufficient_credits', 'balance_cents': bal}
            self.balance[args['p_user_id']] = bal - args['p_price_cents']
            self.ledger.append({'request_id': args['p_request_id'], 'delta': -args['p_price_cents']})
            self.calls.append({'mode': 'paid', 'outcome': 'completed', 'api': args['p_api'], 'status': args['p_status']})
            return {'ok': True, 'balance_cents': self.balance[args['p_user_id']]}
        if fn == 'log_api_call':
            self.calls.append({'mode': args['p_mode'], 'outcome': args['p_outcome'], 'api': args['p_api'], 'status': args['p_status'],
                               'ip_hash': args['p_ip_hash']})
            return None
        if fn == 'demo_allow':
            k = (args['p_ip_hash'], args['p_api'])
            self.demo[k] = self.demo.get(k, 0) + 1
            return self.demo[k] <= args['p_limit']
        raise AssertionError(f'unexpected rpc {fn}')


def call(api, mode, body: bytes, headers=None, path='/'):
    h = {'Content-Length': str(len(body)), **(headers or {})}
    buf = io.BytesIO(body)
    return handler.process(api, mode, h, buf.read, path)


CLIN = 'clinical-trial-table-validator'
MRF = 'hospital-mrf-validator'


class ValidatorParity(unittest.TestCase):
    """The copied validators produce DataForge's own recorded outputs."""

    def test_provenance_hashes(self):
        prov = json.loads((ROOT / 'pylib/spreadrun_api/validators/PROVENANCE.json').read_text())
        for rel, meta in prov['files'].items():
            data = (ROOT / 'pylib/spreadrun_api/validators' / rel).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), meta['sha256'], rel)

    def test_clinical_pass_matches_dataforge(self):
        out = runners.run_clinical((FIX / 'clinical-pass.json').read_bytes())
        self.assertEqual(out, json.loads((FIX / 'clinical-pass-expected.json').read_text()))

    def test_clinical_fail_matches_dataforge(self):
        out = runners.run_clinical((FIX / 'clinical-fail.json').read_bytes())
        self.assertEqual(out, json.loads((FIX / 'clinical-fail-expected.json').read_text()))

    def test_clinical_input_errors(self):
        for body in [b'not json', b'[]', json.dumps({'studiesCsv': 'a,b\n1,2\n', 'outcomesCsv': 'x'}).encode()]:
            with self.assertRaises(runners.InputError):
                runners.run_clinical(body)

    def test_mrf_valid_files_pass(self):
        for name in ('valid.json', 'valid-tall.csv', 'valid-wide.csv'):
            r = runners.run_mrf((FIX / name).read_bytes())
            self.assertEqual(r['status'], 'PASS', (name, r['issues']))
            self.assertIsNone(r['checks']['reachable'])

    def test_mrf_defective_fails(self):
        r = runners.run_mrf((FIX / 'defective.json').read_bytes())
        self.assertEqual(r['status'], 'FAIL')

    def test_mrf_gzip_and_sampling(self):
        raw = (FIX / 'valid.json').read_bytes()
        r = runners.run_mrf(gzip.compress(raw))
        self.assertEqual(r['status'], 'PASS')
        self.assertTrue(r['source']['compressed'])
        r = runners.run_mrf(raw, mode='preflight')
        self.assertEqual(r['status'], 'WARN')  # preflight never inspects records: disclosed as a sample limit

    def test_mrf_input_errors(self):
        for kwargs in ({'mode': 'full'}, {'max_records': 0}, {'max_records': 1001}):
            with self.assertRaises(runners.InputError):
                runners.run_mrf(b'{}', **kwargs)
        with self.assertRaises(runners.InputError):
            runners.run_mrf(b'\x1f\x8b' + b'garbage')

    def test_mrf_unsupported_content_is_a_completed_fail(self):
        r = runners.run_mrf(b'%PDF-1.7 not a price file')
        self.assertEqual(r['status'], 'FAIL')
        self.assertEqual(r['issues'][0]['code'], 'UNSUPPORTED_FORMAT')


class PaidFlow(unittest.TestCase):
    def setUp(self):
        self.fake = FakeStore()
        self.p = [mock.patch.object(store, 'rpc', self.fake.rpc),
                  mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'})]
        for p in self.p:
            p.start()

    def tearDown(self):
        for p in self.p:
            p.stop()

    def test_completed_audit_charges_25_cents(self):
        key, user = self.fake.add_user(500)
        status, out = call(CLIN, 'paid', (FIX / 'clinical-fail.json').read_bytes(), {'Authorization': f'Bearer {key}'})
        self.assertEqual(status, 200)
        self.assertEqual(out['report']['status'], 'FAIL')  # a FAIL report is a completed audit: billed
        self.assertTrue(out['charged'])
        self.assertEqual(out['balanceCents'], 475)
        self.assertEqual(self.fake.balance[user], 475)

    def test_mrf_completed_charges_and_accepts_x_api_key(self):
        key, user = self.fake.add_user(25)
        status, out = call(MRF, 'paid', (FIX / 'valid-tall.csv').read_bytes(), {'X-API-Key': key}, '/?maxRecords=500')
        self.assertEqual(status, 200, out)
        self.assertEqual(self.fake.balance[user], 0)

    def test_input_error_is_not_charged(self):
        key, user = self.fake.add_user(500)
        status, out = call(CLIN, 'paid', b'{"studiesCsv": ""}', {'Authorization': f'Bearer {key}'})
        self.assertEqual(status, 400)
        self.assertFalse(out['error']['charged'])
        self.assertEqual(self.fake.balance[user], 500)
        self.assertEqual(self.fake.calls[-1]['outcome'], 'input_error')

    def test_no_key_bad_key(self):
        body = (FIX / 'clinical-pass.json').read_bytes()
        self.assertEqual(call(CLIN, 'paid', body)[0], 401)
        self.assertEqual(call(CLIN, 'paid', body, {'Authorization': 'Bearer sr_unknown'})[0], 401)
        self.assertEqual(call(CLIN, 'paid', body, {'Authorization': 'Bearer not-a-key'})[0], 401)

    def test_insufficient_credits_withholds_report(self):
        key, user = self.fake.add_user(10)
        status, out = call(CLIN, 'paid', (FIX / 'clinical-pass.json').read_bytes(), {'Authorization': f'Bearer {key}'})
        self.assertEqual(status, 402)
        self.assertNotIn('report', out)
        self.assertEqual(self.fake.balance[user], 10)

    def test_race_lost_at_charge_withholds_report(self):
        key, user = self.fake.add_user(25)
        real = self.fake.rpc

        def drain(fn, args, timeout=6):
            if fn == 'charge_request':
                self.fake.balance[user] = 0  # another request spent the last credit meanwhile
            return real(fn, args, timeout)
        with mock.patch.object(store, 'rpc', drain):
            status, out = call(CLIN, 'paid', (FIX / 'clinical-pass.json').read_bytes(), {'Authorization': f'Bearer {key}'})
        self.assertEqual(status, 402)
        self.assertNotIn('report', out)

    def test_billing_outage_never_delivers_free_report(self):
        key, _ = self.fake.add_user(500)
        real = self.fake.rpc

        def broken(fn, args, timeout=6):
            if fn == 'charge_request':
                raise store.StoreUnavailable('down')
            return real(fn, args, timeout)
        with mock.patch.object(store, 'rpc', broken):
            status, out = call(CLIN, 'paid', (FIX / 'clinical-pass.json').read_bytes(), {'Authorization': f'Bearer {key}'})
        self.assertEqual(status, 503)
        self.assertNotIn('report', out)

    def test_paid_without_store_config_is_503(self):
        with mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': ''}):
            self.assertEqual(call(CLIN, 'paid', b'{}', {'Authorization': 'Bearer sr_x'})[0], 503)

    def test_body_limits(self):
        key, _ = self.fake.add_user(500)
        status, out = handler.process(CLIN, 'paid', {'Content-Length': '5000000', 'Authorization': f'Bearer {key}'}, None)
        self.assertEqual(status, 413)
        self.assertEqual(call(CLIN, 'paid', b'', {'Authorization': f'Bearer {key}'})[0], 400)


class DemoFlow(unittest.TestCase):
    def setUp(self):
        self.fake = FakeStore()
        self.patch = mock.patch.object(store, 'rpc', self.fake.rpc)
        self.patch.start()

    def tearDown(self):
        self.patch.stop()

    def test_demo_runs_free_and_logs_without_raw_ip(self):
        status, out = call(CLIN, 'demo', (FIX / 'clinical-pass.json').read_bytes(), {'X-Forwarded-For': '203.0.113.9'})
        self.assertEqual(status, 200)
        self.assertFalse(out['charged'])
        self.assertEqual(self.fake.calls[-1]['mode'], 'demo')
        self.assertNotIn('203.0.113.9', json.dumps(self.fake.calls))

    def test_demo_rate_limit(self):
        body = (FIX / 'clinical-pass.json').read_bytes()
        codes = [call(CLIN, 'demo', body, {'X-Forwarded-For': '198.51.100.1'})[0] for _ in range(11)]
        self.assertEqual(codes[:10], [200] * 10)
        self.assertEqual(codes[10], 429)

    def test_demo_caps(self):
        self.assertEqual(handler.process(MRF, 'demo', {'Content-Length': str(3 * 1024 * 1024)}, None)[0], 413)
        status, out = call(MRF, 'demo', (FIX / 'valid.json').read_bytes(), {}, '/?maxRecords=1000')
        self.assertEqual(status, 200)

    def test_demo_works_when_store_is_down(self):
        with mock.patch.object(store, 'rpc', side_effect=store.StoreUnavailable('down')):
            status, out = call(CLIN, 'demo', (FIX / 'clinical-pass.json').read_bytes())
        self.assertEqual(status, 200)


class OverHttp(unittest.TestCase):
    """The real BaseHTTPRequestHandler class, served on localhost, as Vercel would invoke it."""

    def test_handler_class_end_to_end(self):
        srv = HTTPServer(('127.0.0.1', 0), handler.make_handler(MRF, 'demo'))
        Thread(target=srv.serve_forever, daemon=True).start()
        try:
            with mock.patch.object(store, 'rpc', FakeStore().rpc):
                url = f'http://127.0.0.1:{srv.server_port}/api/demo/hospital-mrf-validator'
                res = urlopen(Request(url, data=(FIX / 'valid-wide.csv').read_bytes(), method='POST',
                                      headers={'Content-Type': 'text/csv'}))
                out = json.loads(res.read())
                self.assertEqual(out['report']['status'], 'PASS')
                self.assertTrue(res.headers['X-Request-Id'])
                with self.assertRaises(HTTPError) as ctx:
                    urlopen(url)
                self.assertEqual(ctx.exception.code, 405)
        finally:
            srv.shutdown()


if __name__ == '__main__':
    unittest.main()
