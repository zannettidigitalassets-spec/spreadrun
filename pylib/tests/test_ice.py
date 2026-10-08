"""Tests for the Incurred Cost Submission Adequacy Pre-Check.
Run from the repo root:  python3.12 -m unittest discover -s pylib/tests -v

Workbooks come from ice_build.py (invented company, every figure computed so the math foots), plus DCAA's own ICE
model demo workbook (ICE Demo 2024, Power Query model v1.08, downloaded from dcaa.mil in October 2026) as a fixture.

The acceptance criteria from the build prompt map to the classes below:
  1 TemplateClean   2 Footing   3 CrossTie   4 Certificate   5 Deadline   6 TemplateIndependence
  7 Inputs and Billing (.xls message, 4 MB limit, no dashes, one $250 debit per paid run)
"""
import copy
import datetime as dt
import hashlib
import io
import json
import re
import sys
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pylib'))
sys.path.insert(0, str(Path(__file__).parent))

import ice_build  # noqa: E402
from spreadrun_api import catalog, handler, runners, store  # noqa: E402
from test_api import FakeStore, call  # noqa: E402

ICE = 'ice-adequacy-precheck'
engine = runners.ice_module()
FIX = Path(__file__).parent / 'fixtures' / 'ice-dcaa-demo-2024-v1.08.xlsx'
Q = {'fiscalYearEnd': ice_build.FYE, 'asOf': '2026-10-07'}


def run(body, **q):
    return runners.run_ice(body, query={**Q, **q})


def rules(r, severity=None):
    return {f['ruleId'] for f in r['findings'] if severity is None or f['severity'] == severity}


def at(r, rule):
    return [f for f in r['findings'] if f['ruleId'] == rule]


class TemplateClean(unittest.TestCase):
    """Criterion 1: a complete workbook in the DCAA template layout with correct math passes every check."""

    def test_pass_on_all_checks(self):
        r = run(ice_build.build('dcaa'))
        self.assertEqual(r['status'], 'PASS')
        self.assertEqual(r['findings'], [])
        self.assertEqual(set(r['checks'].values()), {'pass'})
        self.assertEqual(r['schedulesMissing'], [])
        self.assertTrue(all(s['foundBy'] == 'tab name' for s in r['schedules']))
        auto = [x for x in r['checklist'] if x['automatic']]
        self.assertEqual({x['status'] for x in auto}, {'pass'})
        self.assertEqual(len(r['checklist']), 47)
        self.assertEqual(r['deadline']['due'], '2026-12-31')

    def test_dcaa_own_demo_workbook(self):
        """DCAA's published demo: every schedule found, all the math foots, the ties hold. What remains is real: the
        certificate is unsigned, and one contract carries different numbers on Schedules I and O."""
        r = run(FIX.read_bytes(), fiscalYearEnd='2024-12-31', asOf='2025-05-01')
        self.assertEqual(r['schedulesMissing'], [])
        self.assertEqual(r['checks']['math'], 'pass')
        self.assertEqual(rules(r, 'error'), set())
        self.assertEqual(rules(r), {'ICE-CERT-UNSIGNED', 'ICE-I-O', 'ICE-O-I'})
        self.assertEqual(r['status'], 'WARN')
        auto = {x['item']: x['status'] for x in r['checklist'] if x['automatic']}
        for item in (4, 5, 6, 19, 21, 26, 30, 31, 38, 41):
            self.assertEqual(auto[item], 'pass', item)


class Footing(unittest.TestCase):
    """Criterion 2: a schedule total that does not foot fails with the tab, the cell range, expected and actual."""

    def test_total_that_does_not_foot(self):
        def mods(S, n):
            i, _ = ice_build.find(S['C'], 'Depreciation')
            S['C'][i][8] += 1500           # GL balance changed; the claimed amount and the total were not
            S['C'][i][10] += 1500
        r = run(ice_build.build('dcaa', mods))
        self.assertEqual(r['status'], 'FAIL')
        f = [x for x in at(r, 'ICE-FOOT') if x['tab'] == 'C']
        self.assertTrue(f)
        claimed = next(x for x in f if x['range'].startswith('K'))
        self.assertEqual(claimed['expected'] - claimed['actual'], 1500)
        self.assertRegex(claimed['range'], r'^K\d+$')
        self.assertRegex(claimed['sumRange'], r'^K\d+:K\d+$')
        self.assertIn('does not foot', claimed['message'])

    def test_row_math_books_plus_adjustments(self):
        def mods(S, n):
            i, _ = ice_build.find(S['B'], 'Professional fees')
            S['B'][i][10] += 700           # claimed no longer equals books plus adjustments
            t, _ = ice_build.find(S['B'], 'TOTAL GENERAL AND ADMIN EXPENSE POOL')
            S['B'][t][10] += 700
        r = run(ice_build.build('dcaa', mods))
        f = at(r, 'ICE-ROW-MATH')
        self.assertEqual(len(f), 2)       # the row and the total row
        self.assertEqual({x['tab'] for x in f}, {'B'})

    def test_a_rate_that_is_not_pool_over_base(self):
        def mods(S, n):
            i, _ = ice_build.find(S['A'], 'OVERHEAD', 2)
            S['A'][i][5] = round(S['A'][i][5] + 0.01, 4)
        r = run(ice_build.build('dcaa', mods))
        f = at(r, 'ICE-RATE')
        self.assertEqual(len(f), 1)
        self.assertEqual(f[0]['tab'], 'A')
        self.assertAlmostEqual(f[0]['expected'], f[0]['actual'] - 0.01, places=3)

    def test_indirect_not_at_claimed_rates_on_h(self):
        def mods(S, n):
            i = next(k for k, r in enumerate(S['H']) if r and len(r) > 2 and r[2] == ice_build.CONTRACTS[0][1])
            S['H'][i][12] += 900          # overhead on one contract
        r = run(ice_build.build('dcaa', mods))
        self.assertIn('ICE-H-RATE', rules(r))

    def test_k_labor_rate_times_hours(self):
        def mods(S, n):
            i, _ = ice_build.find(S['K'], 'Engineer')
            S['K'][i][8] += 950
        r = run(ice_build.build('dcaa', mods))
        self.assertIn('ICE-K-LABOR', rules(r))


class CrossTie(unittest.TestCase):
    """Criterion 3: Schedule B's pool changes without Schedule A: the tie fails on both tabs."""

    def test_b_pool_changed_without_a(self):
        def mods(S, n):
            i, _ = ice_build.find(S['B'], 'Accounting salaries')
            S['B'][i][8] += 5000
            S['B'][i][10] += 5000
            t, _ = ice_build.find(S['B'], 'TOTAL GENERAL AND ADMIN EXPENSE POOL')
            S['B'][t][8] += 5000
            S['B'][t][10] += 5000
        r = run(ice_build.build('dcaa', mods))
        f = at(r, 'ICE-TIE')
        self.assertEqual({x['tab'] for x in f}, {'A', 'B'})
        a = next(x for x in f if x['tab'] == 'A')
        b = next(x for x in f if x['tab'] == 'B')
        self.assertEqual(a['expected'], b['actual'])
        self.assertEqual(b['expected'], a['actual'])
        self.assertEqual(b['actual'] - a['actual'], 5000)
        self.assertEqual(r['checks']['crossTies'], 'fail')
        self.assertNotIn('ICE-FOOT', rules(r))      # B itself still foots

    def test_g_to_h_and_l_to_h(self):
        def mods(S, n):
            i, _ = ice_build.find(S['L'], 'Direct Labor')
            S['L'][i][4] += 10
            t, _ = ice_build.find(S['L'], 'TOTAL LABOR DISTRIBUTION')
            S['L'][t][4] += 10
            for lbl in ('Wages per Forms 941, four quarters', 'TOTAL PAYROLL'):
                k, _ = ice_build.find(S['L'], lbl)
                S['L'][k][4] += 10
        r = run(ice_build.build('dcaa', mods))
        self.assertEqual({f['tab'] for f in at(r, 'ICE-TIE')}, {'L', 'H'})

    def test_i_current_year_to_h(self):
        def mods(S, n):
            i = next(k for k, r in enumerate(S['I']) if r and len(r) > 2 and r[2] == ice_build.CONTRACTS[1][1])
            S['I'][i][8] += 300
            S['I'][i][9] += 300
            for lbl in ('SUBTOTAL: COST TYPE AND FLEXIBLY PRICED', '**TOTAL**'):
                k, _ = ice_build.find(S['I'], lbl)
                S['I'][k][8] += 300
                S['I'][k][9] += 300
        r = run(ice_build.build('dcaa', mods))
        f = at(r, 'ICE-TIE')
        self.assertTrue(any(x['tab'] == 'I' and x['checklistItem'] == 30 for x in f))


class Certificate(unittest.TestCase):
    """Criterion 4: no Schedule N certificate fails, citing FAR 42.703-2."""

    def test_missing_certificate(self):
        r = run(ice_build.build('dcaa', lambda S, n: S.pop('N')))
        f = at(r, 'ICE-CERT-MISSING')
        self.assertEqual(len(f), 1)
        self.assertEqual(f[0]['source'], 'far42.703-2')
        self.assertIn('FAR 42.703-2', r['sources']['far42.703-2'])
        self.assertEqual(r['checks']['certificate'], 'fail')
        self.assertEqual(r['status'], 'FAIL')
        self.assertIn('N', r['schedulesMissing'])

    def test_unsigned_certificate_warns(self):
        def mods(S, n):
            S['N'] = [[None, r[1].split(':')[0] + ': ____________'] if r and len(r) > 1 and isinstance(r[1], str)
                      and r[1].startswith(('Signature', 'Title', 'Date of Execution')) else r for r in S['N']]
        r = run(ice_build.build('dcaa', mods))
        self.assertEqual(rules(r), {'ICE-CERT-UNSIGNED'})
        self.assertEqual(r['status'], 'WARN')

    def test_certifying_official_level(self):
        def mods(S, n):
            i, _ = ice_build.find(S['N'], 'Title:')
            S['N'][i][1] = 'Title: Staff Accountant'
        r = run(ice_build.build('dcaa', mods))
        self.assertIn('ICE-CERT-LEVEL', rules(r))


class Deadline(unittest.TestCase):
    """Criterion 5: fiscal year ending December 31, checked on July 15: past the 6-month mark, a warning."""

    def build_dec(self):
        def mods(S, n):
            S['A'][4] = ['Fiscal Year End - 12/31/2025']
        return ice_build.build('dcaa', mods)

    def test_july_15_is_late(self):
        r = run(self.build_dec(), fiscalYearEnd='2025-12-31', asOf='2026-07-15')
        self.assertEqual(r['deadline']['due'], '2026-06-30')
        self.assertEqual(r['deadline']['status'], 'late')
        self.assertEqual(r['deadline']['daysLeft'], -15)
        self.assertEqual(rules(r), {'ICE-DEADLINE-PASSED'})
        self.assertEqual(r['status'], 'WARN')
        self.assertEqual(at(r, 'ICE-DEADLINE-PASSED')[0]['severity'], 'warning')

    def test_on_and_before_the_due_date(self):
        self.assertEqual(run(self.build_dec(), fiscalYearEnd='2025-12-31', asOf='2026-06-30')['status'], 'PASS')
        self.assertEqual(run(self.build_dec(), fiscalYearEnd='2025-12-31', asOf='2026-06-15')['deadline']['status'], 'due-soon')

    def test_month_end_arithmetic(self):
        f = engine.add_months_end
        self.assertEqual(f(dt.date(2025, 12, 31), 6), dt.date(2026, 6, 30))
        self.assertEqual(f(dt.date(2026, 6, 30), 6), dt.date(2026, 12, 31))
        self.assertEqual(f(dt.date(2025, 9, 30), 6), dt.date(2026, 3, 31))
        self.assertEqual(f(dt.date(2023, 8, 31), 6), dt.date(2024, 2, 29))
        self.assertEqual(f(dt.date(2025, 3, 15), 6), dt.date(2025, 9, 15))

    def test_fiscal_year_end_mismatch(self):
        r = run(ice_build.build('dcaa'), fiscalYearEnd='2026-09-30', asOf='2026-10-07')
        self.assertIn('ICE-FYE-MISMATCH', rules(r))


class TemplateIndependence(unittest.TestCase):
    """Criterion 6: not the DCAA template, but every schedule and correct math: PASS."""

    def test_own_format_passes(self):
        r = run(ice_build.build('own'))
        self.assertEqual(r['status'], 'PASS', r['findings'])
        self.assertEqual(r['schedulesMissing'], [])
        found = {s['schedule']: s['foundBy'] for s in r['schedules']}
        self.assertEqual(found['C'], 'sheet title')       # tab "Overhead Pool", titled "Schedule C: ..."
        self.assertEqual(found['D'], 'content')           # tab "Occupancy Pool", no letter anywhere
        self.assertEqual(found['N'], 'sheet title')       # tab "Certificate"
        auto = {x['item']: x['status'] for x in r['checklist'] if x['automatic']}
        for item in (4, 5, 6, 21, 26, 30, 31, 38, 41):
            self.assertEqual(auto[item], 'pass', item)

    def test_own_format_still_catches_errors(self):
        def mods(S, n):
            i, _ = ice_build.find(S['B - G&A Expenses'], 'Executive salaries')
            S['B - G&A Expenses'][i][2] += 2000
            S['B - G&A Expenses'][i][4] += 2000
        r = run(ice_build.build('own', mods))
        self.assertTrue(any(f['tab'] == 'B - G&A Expenses' for f in at(r, 'ICE-FOOT')))

    def test_missing_schedule_says_how_it_looked(self):
        r = run(ice_build.build('own', lambda S, n: S.pop('Sch J Subcontracts')))
        f = [x for x in at(r, 'ICE-SCHEDULE-MISSING')]
        self.assertEqual(len(f), 1)
        self.assertIn('Schedule J', f[0]['message'])
        self.assertIn('rename the tab', f[0]['message'])
        self.assertEqual(r['schedulesMissing'], ['J'])

    def test_two_candidates_are_reported_as_ambiguous(self):
        def mods(S, n):
            S['Payroll recon one'] = [['Reconciliation of payroll per IRS Form 941']]
            S['Payroll recon two'] = [['Payroll per Form 941, second version']]
            S.pop('Sch L Payroll')
        r = run(ice_build.build('own', mods))
        f = at(r, 'ICE-SCHEDULE-MISSING')
        self.assertTrue(any('More than one tab' in x['message'] for x in f))

    def test_tab_name_variations(self):
        for name in ('Schedule B', 'Sch. B', 'SCH B - G&A', 'b'):
            def mods(S, n, name=name):
                S[name] = S.pop('B')
            r = run(ice_build.build('dcaa', mods))
            self.assertEqual(r['status'], 'PASS', name)

    def test_not_applicable_schedule(self):
        def mods(S, n):
            S['K'] = [['Schedule K'], ['Not applicable: no time-and-materials or labor-hour contracts this year.']]
        r = run(ice_build.build('dcaa', mods))
        k = next(s for s in r['schedules'] if s['schedule'] == 'K')
        self.assertEqual(k['status'], 'not-applicable')
        self.assertNotIn('ICE-SCHEDULE-MISSING', rules(r))


class Inputs(unittest.TestCase):
    """Criterion 7, the inputs: .xls, size, not a workbook, formulas with no saved values, time budget, privacy."""

    def test_xls_gets_a_clear_message(self):
        with self.assertRaises(runners.InputError) as cm:
            run(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1' + b'\0' * 600)
        self.assertIn('.xls', str(cm.exception))
        self.assertIn('Save As', str(cm.exception))

    def test_over_4_mb(self):
        body = b'PK' + b'\0' * 4_000_100
        with self.assertRaises(runners.InputError) as cm:
            run(body)
        self.assertIn('4 MB', str(cm.exception))

    def test_other_files(self):
        for body in (b'%PDF-1.7', b'just text', b'PK\x03\x04broken'):
            with self.assertRaises(runners.InputError):
                run(body)

    def test_parameters(self):
        with self.assertRaises(runners.InputError):
            runners.run_ice(ice_build.build('dcaa'), query={})
        with self.assertRaises(runners.InputError):
            run(ice_build.build('dcaa'), fiscalYearEnd='12/31/2025')
        with self.assertRaises(runners.InputError):
            run(ice_build.build('dcaa'), fiscalyearend='2025-12-31')

    def test_formulas_without_saved_values(self):
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(ice_build.build('dcaa')))
        ws = wb['G']
        last = ws.max_row
        ws.cell(row=last, column=5).value = f'=SUM(E{last - 5}:E{last - 1})'
        buf = io.BytesIO()
        wb.save(buf)
        r = run(buf.getvalue())
        f = at(r, 'ICE-NO-VALUES')
        self.assertEqual(len(f), 1)
        self.assertEqual(f[0]['tab'], 'G')

    def test_time_budget(self):
        with self.assertRaises(engine.Timeout) as cm:
            engine.validate(ice_build.build('dcaa'), query=Q, budget=-1)
        self.assertIn('Nothing was charged', str(cm.exception))

    def test_long_schedules_stay_fast(self):
        """3,600 rows and 600 subtotals on Schedule H: footing is one pass with running sums, well inside the budget."""
        import random
        import time
        rnd_ = random.Random(2)

        def mods(S, n):
            h = S['H']
            hdr_i = next(i for i, r in enumerate(h) if r and 'CONTRACT_TYPE' in r)
            rows = []
            for g in range(600):
                grp = [[None, f'TYPE{g}', f'C-{g}-{k}', 'Task', str(k), 'CLAIMED'] + [rnd_.randint(0, 5000) for _ in range(14)]
                       for k in range(5)]
                rows += grp + [[None, f'TYPE{g} - SUBTOTAL', 'TOTAL', None, None, None]
                               + [sum(r[6 + j] for r in grp) for j in range(14)]]
            S['H'] = h[:hdr_i + 1] + rows
        body = ice_build.build('dcaa', mods)
        t = time.monotonic()
        r = run(body)
        self.assertLess(time.monotonic() - t, 8)
        self.assertNotIn('ICE-FOOT', rules(r))

    def test_report_never_repeats_workbook_text(self):
        r = run(FIX.read_bytes(), fiscalYearEnd='2024-12-31', asOf='2025-05-01')
        text = json.dumps(r)
        for s in ('Small Company', 'Tanza', 'Charleston', 'Southpark', 'Kingman', 'ICE Demo Company', 'N00039-90-C-0873',
                  'Clark Inc'):
            self.assertNotIn(s, text)

    def test_no_dashes_and_plain_scope(self):
        src = (ROOT / 'pylib/spreadrun_api/validators/ice/engine.py').read_text()
        self.assertIsNone(re.search('[–—−]', src))
        r = run(ice_build.build('dcaa'))
        self.assertIn('Adequacy is not allowability', r['scope'])
        self.assertIn('a PASS is not DCAA acceptance', r['scope'])
        self.assertTrue(any('FAR Part 31' in x for x in r['notChecked']))

    def test_checklist_is_the_dcaa_version_3_4(self):
        self.assertEqual([x[0] for x in engine.CHECKLIST], list(range(1, 48)))
        self.assertIn('Version 3.4, December 2021', run(ice_build.build('dcaa'))['checklistVersion'])

    def test_demo_samples_match_the_published_files(self):
        got = {hashlib.sha256((ROOT / 'public/samples' / f'{n}.xlsx').read_bytes()).hexdigest(): n
               for n in ('ice-template-clean', 'ice-own-format-clean', 'ice-errors')}
        self.assertEqual(got, engine.DEMO_SAMPLES)


class Billing(unittest.TestCase):
    """Criterion 7, the billing: a paid run debits exactly one $250 run; the demo runs the samples only."""

    def setUp(self):
        self.fake = FakeStore()
        self.key, self.user = self.fake.add_user(60000)
        self.p = [mock.patch.object(store, 'rpc', self.fake.rpc), mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'})]
        for p in self.p:
            p.start()

    def tearDown(self):
        for p in self.p:
            p.stop()

    PATH = f'/api/v1/{ICE}?fiscalYearEnd={ice_build.FYE}&asOf=2026-10-07'

    def test_price(self):
        self.assertEqual(catalog.APIS[ICE]['price_cents'], 25000)
        self.assertEqual(catalog.APIS[ICE]['max_body_bytes'], 4_000_000)

    def test_paid_run_debits_exactly_250(self):
        status, payload = call(ICE, 'paid', ice_build.build('dcaa'), {'Authorization': f'Bearer {self.key}'}, path=self.PATH)
        self.assertEqual(status, 200)
        self.assertTrue(payload['charged'])
        self.assertEqual(payload['priceCents'], 25000)
        self.assertEqual(self.fake.balance[self.user], 35000)
        self.assertEqual([x['delta'] for x in self.fake.ledger], [-25000])

    def test_fail_report_charged_input_error_not(self):
        bad = ice_build.build('dcaa', lambda S, n: S.pop('N'))
        status, payload = call(ICE, 'paid', bad, {'Authorization': f'Bearer {self.key}'}, path=self.PATH)
        self.assertEqual((status, payload['report']['status']), (200, 'FAIL'))
        status, payload = call(ICE, 'paid', b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1' + b'\0' * 100,
                               {'Authorization': f'Bearer {self.key}'}, path=self.PATH)
        self.assertEqual(status, 400)
        self.assertFalse(payload['error']['charged'])
        self.assertEqual(self.fake.balance[self.user], 35000)

    def test_over_4_mb_is_refused_before_reading(self):
        status, payload = handler.process(ICE, 'paid', {'Content-Length': '4000001', 'Authorization': f'Bearer {self.key}'},
                                          lambda n: b'', self.PATH)
        self.assertEqual(status, 413)
        self.assertIn('4 MB', payload['error']['message'])
        self.assertEqual(self.fake.balance[self.user], 60000)

    def test_not_enough_credit(self):
        key, user = self.fake.add_user(24999)
        status, _ = call(ICE, 'paid', ice_build.build('dcaa'), {'Authorization': f'Bearer {key}'}, path=self.PATH)
        self.assertEqual(status, 402)
        self.assertEqual(self.fake.balance[user], 24999)

    def test_demo_runs_samples_only(self):
        sample = (ROOT / 'public/samples/ice-errors.xlsx').read_bytes()
        status, payload = call(ICE, 'demo', sample, path=f'/api/demo/{ICE}?fiscalYearEnd={ice_build.FYE}&asOf=2026-10-07')
        self.assertEqual((status, payload['charged'], payload['report']['status']), (200, False, 'FAIL'))
        status, payload = call(ICE, 'demo', ice_build.build('dcaa'), path=f'/api/demo/{ICE}?fiscalYearEnd={ice_build.FYE}')
        self.assertEqual(status, 400)
        self.assertIn('sample workbooks only', payload['error']['message'])


if __name__ == '__main__':
    unittest.main()
