"""The anonymous demand counter behind free smoke-test tools (POST /api/interest/<topic>)."""
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'pylib'))
sys.path.insert(0, str(Path(__file__).parent))

from spreadrun_api import handler, store  # noqa: E402
from test_api import FakeStore  # noqa: E402


class InterestCounter(unittest.TestCase):
    def setUp(self):
        self.fake = FakeStore()
        self.p = [mock.patch.object(store, 'rpc', self.fake.rpc), mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'})]
        for p in self.p:
            p.start()

    def tearDown(self):
        for p in self.p:
            p.stop()

    def test_counts_once_per_visitor_per_day(self):
        h = {'X-Forwarded-For': '203.0.113.7'}
        self.assertEqual(handler.record_interest('/api/interest/cpsc-efiling', h), (200, {'counted': True, 'topic': 'cpsc-efiling'}))
        self.assertEqual(handler.record_interest('/api/interest/cpsc-efiling', h)[1]['counted'], False)
        self.assertTrue(handler.record_interest('/api/interest/cpsc-efiling', {'X-Forwarded-For': '203.0.113.8'})[1]['counted'])
        rows = [k for k in self.fake.demo if k[1] == 'interest:cpsc-efiling']
        self.assertEqual(len(rows), 2)
        self.assertNotIn('203.0.113.7', str(self.fake.demo))   # only the salted hash is stored

    def test_route_forms_and_unknown_topics(self):
        self.assertEqual(handler.record_interest('/api/%5Bchannel%5D/%5Bslug%5D?channel=interest&slug=cpsc-efiling', {})[0], 200)
        self.assertEqual(handler.record_interest('/api/interest/anything-else', {})[0], 404)
        self.assertIsNone(handler.record_interest('/api/demo/pbj-staffing-qa', {}))
        self.assertIsNone(handler.record_interest('/api/v1/interest', {}))

    def test_store_down(self):
        def down(*a, **k):
            raise store.StoreUnavailable('x')
        with mock.patch.object(store, 'rpc', down):
            self.assertEqual(handler.record_interest('/api/interest/cpsc-efiling', {})[0], 503)


if __name__ == '__main__':
    unittest.main()
