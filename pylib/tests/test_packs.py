"""Credit packs against run prices: a pack's credit is spent down by completed runs through the real request flow.
The two validators priced at $250 and $300 are test stand-ins (the SCA engine with its price patched); no live
validator's price changes."""
import json
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'pylib'))
sys.path.insert(0, str(Path(__file__).parent))

from spreadrun_api import catalog, store  # noqa: E402
from test_api import FakeStore, call  # noqa: E402

SCA = 'sca-hw-fringe-checker'
BODY = json.dumps({'parameters': {'eo13706': True}, 'employeesCsv': 'hours_paid,plan_contributions,cash_in_lieu\n40,216.80,0\n'}).encode()
PACK_250, PACK_500 = 25000, 50000     # api/_lib/clients.js: one dollar of credit per dollar


class PackCoverage(unittest.TestCase):
    def setUp(self):
        self.fake = FakeStore()
        self.p = [mock.patch.object(store, 'rpc', self.fake.rpc), mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'})]
        for p in self.p:
            p.start()

    def tearDown(self):
        for p in self.p:
            p.stop()

    def paid_run(self, key, price):
        with mock.patch.dict(catalog.APIS[SCA], {'price_cents': price}):
            return call(SCA, 'paid', BODY, {'Authorization': f'Bearer {key}'})

    def test_250_pack_covers_one_250_run_and_leaves_zero(self):
        key, user = self.fake.add_user(PACK_250)
        status, payload = self.paid_run(key, 25000)
        self.assertEqual((status, payload['charged'], payload['balanceCents']), (200, True, 0))
        status, payload = self.paid_run(key, 25000)
        self.assertEqual(status, 402)                      # nothing left, nothing charged
        self.assertEqual(self.fake.balance[user], 0)

    def test_500_pack_covers_one_300_run_and_leaves_200(self):
        key, user = self.fake.add_user(PACK_500)
        status, payload = self.paid_run(key, 30000)
        self.assertEqual((status, payload['balanceCents']), (200, 20000))
        self.assertEqual(self.paid_run(key, 30000)[0], 402)
        self.assertEqual(self.fake.balance[user], 20000)

    def test_existing_prices_unchanged(self):
        existing = {
            'clinical-trial-table-validator': 25, 'hospital-mrf-validator': 25, 'uad-36-appraisal-validator': 100,
            'pbj-staffing-qa': 2500, 'wh347-payroll-precheck': 2500, 'pecos-enrollment-precheck': 2500,
            'cobra-notice-qa': 2500, 'cmmc-self-assessment-validator': 2500, SCA: 10000}
        for slug, cents in existing.items():
            self.assertEqual(catalog.APIS[slug]['price_cents'], cents, slug)


if __name__ == '__main__':
    unittest.main()
