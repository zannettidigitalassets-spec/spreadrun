"""Optional email signups from the free tools: POST /api/signup/subscribe and /api/signup/unsubscribe."""
import io
import json
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'pylib'))
sys.path.insert(0, str(Path(__file__).parent))

from spreadrun_api import handler, store  # noqa: E402
from test_api import FakeStore  # noqa: E402

SRC = '/tools/pbj-preflight-checks'


class SignupStore(FakeStore):
    """FakeStore plus the tool_signups functions, with the same contract as the SQL (one row per address)."""

    def __init__(self):
        super().__init__()
        self.signups = {}

    def rpc(self, fn, args, timeout=6):
        if fn == 'tool_signup':
            e = args['p_email'].strip().lower()
            new = e not in self.signups
            self.signups[e] = {'source': args['p_source'], 'unsubscribed': False}
            return new
        if fn == 'tool_unsubscribe':
            e = args['p_email'].strip().lower()
            if e in self.signups:
                self.signups[e]['unsubscribed'] = True
            return None
        return super().rpc(fn, args, timeout)


def post(action, body, ip='203.0.113.5'):
    raw = json.dumps(body).encode() if not isinstance(body, bytes) else body
    h = {'Content-Length': str(len(raw)), 'X-Forwarded-For': ip}
    return handler.signup(f'/api/signup/{action}', h, io.BytesIO(raw).read)


class Signups(unittest.TestCase):
    def setUp(self):
        self.fake = SignupStore()
        self.p = [mock.patch.object(store, 'rpc', self.fake.rpc), mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'})]
        for p in self.p:
            p.start()

    def tearDown(self):
        for p in self.p:
            p.stop()

    def test_one_row_per_address(self):
        self.assertEqual(post('subscribe', {'email': 'Pat@Example.com', 'consent': True, 'source': SRC}), (200, {'ok': True, 'action': 'subscribe'}))
        self.assertEqual(post('subscribe', {'email': 'pat@example.com ', 'consent': True, 'source': '/tools/i9-section2-deadline-calculator'})[0], 200)
        self.assertEqual(list(self.fake.signups), ['pat@example.com'])
        self.assertEqual(self.fake.signups['pat@example.com']['source'], '/tools/i9-section2-deadline-calculator')

    def test_unsubscribe(self):
        post('subscribe', {'email': 'pat@example.com', 'consent': True, 'source': SRC})
        self.assertEqual(post('unsubscribe', {'email': 'PAT@example.com'})[0], 200)
        self.assertTrue(self.fake.signups['pat@example.com']['unsubscribed'])
        # Same answer for an address that was never on the list.
        self.assertEqual(post('unsubscribe', {'email': 'nobody@example.com'}), (200, {'ok': True, 'action': 'unsubscribe'}))

    def test_rejections_store_nothing_and_never_echo(self):
        for body in ({'email': 'not-an-email', 'consent': True, 'source': SRC},
                     {'email': 'pat@example.com', 'consent': False, 'source': SRC},
                     {'email': 'pat@example.com', 'consent': 'yes', 'source': SRC},
                     {'email': 'pat@example.com', 'consent': True, 'source': 'https://evil.example'},
                     {'email': 'pat@example.com', 'consent': True},
                     b'not json', b''):
            status, payload = post('subscribe', body)
            self.assertIn(status, (400,), body)
            self.assertNotIn('pat@example.com', json.dumps(payload))
        self.assertEqual(self.fake.signups, {})
        self.assertEqual(post('delete', {'email': 'pat@example.com'})[0], 404)
        self.assertIsNone(handler.signup('/api/demo/pbj-staffing-qa', {}, b''.__class__))

    def test_rate_limited(self):
        for i in range(handler.SIGNUP_RUNS_PER_DAY):
            self.assertEqual(post('subscribe', {'email': f'p{i}@example.com', 'consent': True, 'source': SRC})[0], 200)
        self.assertEqual(post('subscribe', {'email': 'late@example.com', 'consent': True, 'source': SRC})[0], 429)
        self.assertNotIn('late@example.com', self.fake.signups)

    def test_store_down(self):
        def down(*a, **k):
            raise store.StoreUnavailable('x')
        with mock.patch.object(store, 'rpc', down):
            self.assertEqual(post('subscribe', {'email': 'pat@example.com', 'consent': True, 'source': SRC})[0], 503)


if __name__ == '__main__':
    unittest.main()
