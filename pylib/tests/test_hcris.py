"""Tests for the Medicare Cost Report (CMS-2552-10) Pre-Audit QA.
Run from the repo root:  python3.12 -m unittest discover -s pylib/tests -v

ECR files are rebuilt from real CMS HCRIS extracts (fixtures/hcris/*.csv.gz, cut from HOSP10FY2024.ZIP) by
hcris_build.py, so the worksheet ties and the S-10 math are tested on amounts hospitals actually filed. The listings
(Exhibits 2A, 3B and 3C) are not public: hcris_build makes invented, de-identified rows that add up to each report.

The acceptance criteria from the build prompt map to the classes below:
  1 CleanPass   2 S10Line30   3 DuplicateAccount   4 OneTwentyDays   5 DeductibleCoinsuranceCap
  6 MissingListings   7 Deadline   8 DemoAndBilling (sample demo, one $200 debit, no dashes)

The PHI-free input contract (October 8, 2026 rework): listings with pseudonymous IDs, no name or MBI columns, Y for a
Medicaid number, every date shifted by one offset, and the period shifted by the same offset. Its criteria:
  1 PhiRefused (MBI in the ID column)   2 PhiRefused (name-like text)   3 ShiftInvariance
  4 NoDatesOrIdentifiers   5 SamplesFollowTheContract
"""
import copy
import datetime as dt
import hashlib
import io
import json
import re
import sys
import unittest
import zipfile
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pylib'))
sys.path.insert(0, str(Path(__file__).parent))

import hcris_build as hb  # noqa: E402
from spreadrun_api import catalog, handler, runners, store  # noqa: E402
from test_api import FakeStore, call  # noqa: E402

API = 'hcris-preaudit-qa'
engine = runners.hcris_module()
TODAY = dt.date(2026, 10, 8)
SAMPLE_Q = {'periodStart': '2021-09-05', 'periodEnd': '2022-09-04', 'asOf': '2025-10-15'}   # shifted by -1000 days
SHIFT = -700   # the offset the tests' listings use
# Real reports whose filed amounts tie: every check passes once listings that match them are added.
CLEAN = ['844286', '794731', '798868', '813196', '811259', '810755', '813686', '835003', '818658']


def period(fx, as_of_days=30, shift=SHIFT):
    """Parameters for a run: the period shifted like the listings, and asOf measured from the real period end."""
    s, e = hb.shifted_period(fx, shift)
    return {'periodStart': s.isoformat(), 'periodEnd': e.isoformat(),
            'asOf': (hb.mdy(fx['rpt'][6]) + dt.timedelta(days=as_of_days)).isoformat()}


def run(body, q, **kw):
    return engine.validate(body, query=q, today=TODAY, **kw)


def report(name='844286', *, mutate=None, ecr_kw=None, leave_out=(), fmt='xlsx', extra=(), q=None, shift=SHIFT,
           drop=hb.DELETED):
    fx = hb.load_fixture(name)
    lst = hb.listings_for(fx, shift=shift)
    if mutate:
        mutate(lst)
    ecr = hb.ecr_from_hcris(fx, **(ecr_kw or {}))
    body = hb.build_package(fx, lst, ecr=ecr, fmt=fmt, leave_out=leave_out, extra=extra, drop=drop)
    return run(body, q or period(fx, shift=shift))


def rules(r, severity=None):
    return {f['ruleId'] for f in r['findings'] if severity is None or f['severity'] == severity}


def at(r, rule):
    return [f for f in r['findings'] if f['ruleId'] == rule]


def sample(name):
    return (ROOT / 'public/samples' / f'{name}.zip').read_bytes()


class CleanPass(unittest.TestCase):
    """Criterion 1: a clean HCRIS cost report with matching 3B and 3C listings passes every check."""

    def test_sample_package_passes(self):
        r = run(sample('hcris-sample-clean'), SAMPLE_Q)
        self.assertEqual(r['status'], 'PASS', r['findings'])
        self.assertEqual(r['findings'], [])
        self.assertEqual(set(r['checks'].values()), {'pass'})
        self.assertEqual(r['listings']['required'], {'2A': True, '3B': True, '3C': True})
        self.assertEqual({x['exhibit'] for x in r['listings']['found']}, {'2A', '3B', '3C'})
        self.assertGreater(r['tiesChecked'], 500)

    def test_real_extracts_pass(self):
        for name in CLEAN:
            with self.subTest(report=name):
                r = report(name)
                self.assertEqual(r['status'], 'PASS', [(f['ruleId'], f['message']) for f in r['findings']][:5])

    def test_csv_listings_read_the_same_as_xlsx(self):
        a, b = report('798868'), report('798868', fmt='csv')
        self.assertEqual((a['status'], b['status']), ('PASS', 'PASS'))
        self.assertEqual(a['tiesChecked'], b['tiesChecked'])

    def test_prints_the_transmittal_checked(self):
        r = run(sample('hcris-sample-clean'), SAMPLE_Q)
        self.assertIn('Transmittal 26 (June 30, 2026)', r['checkedAgainst']['transmittal'])
        self.assertEqual(r['checkedAgainst']['specDate'], '2026181')
        self.assertIn('2026181', r['checkedAgainst']['ecrSpecification'])

    def test_scope_says_pass_is_not_mac_acceptance(self):
        r = run(sample('hcris-sample-clean'), SAMPLE_Q)
        self.assertIn('A PASS is not MAC acceptance and does not determine allowability or payment', r['scope'])
        self.assertTrue(any('allowable' in x for x in r['notChecked']))

    def test_ecr_alone_without_claims_needs_no_listings(self):
        fx = hb.load_fixture('813686')
        r = run(hb.ecr_from_hcris(fx), period(fx))
        self.assertEqual(r['status'], 'PASS')
        self.assertEqual(r['input']['format'], 'ecr')


class S10Line30(unittest.TestCase):
    """Criterion 2: S-10 line 30 that is not line 23, column 3 plus line 29 fails with worksheet, line, expected and
    actual."""

    def test_line_30_mismatch(self):
        fx = hb.load_fixture('844286')
        v = hb.amounts(fx)
        k30, k31 = ('S100001', '03000', '00100'), ('S100001', '03100', '00100')
        r = report(ecr_kw={'override': {k30: v[k30] + 12000, k31: v[k31] + 12000}})
        self.assertEqual(r['status'], 'FAIL')
        f = [x for x in at(r, 'S10-LINE') if x['line'] == '30']
        self.assertEqual(len(f), 1)
        self.assertEqual((f[0]['worksheet'], f[0]['line'], f[0]['column']), ('S-10, Part I', '30', '1'))
        self.assertEqual(f[0]['expected'], v[('S100001', '02300', '00300')] + v[('S100001', '02900', '00100')])
        self.assertEqual(f[0]['actual'], v[k30] + 12000)
        self.assertEqual(r['checks']['s10'], 'fail')
        self.assertEqual([x['line'] for x in at(r, 'S10-LINE')], ['30'])   # line 31 was carried, so it still ties

    def test_line_31_and_ccr(self):
        fx = hb.load_fixture('798868')
        v = hb.amounts(fx)
        r = report('798868', ecr_kw={'override': {('S100001', '03100', '00100'): v[('S100001', '03100', '00100')] - 5,
                                                  ('S100001', '00100', '00100'): 0.31}})
        self.assertIn('S10-CCR', rules(r))
        ccr = at(r, 'S10-CCR')[0]
        self.assertEqual(ccr['expected'], round(v[('C000001', '20200', '00300')] / v[('C000001', '20200', '00800')], 6))
        self.assertTrue(any(x['line'] == '31' for x in at(r, 'S10-LINE')))

    def test_line_27_01_ties_to_worksheet_e(self):
        fx = hb.load_fixture('798868')   # bad debts on E, Part A, E, Part B and six rural health clinics
        v = hb.amounts(fx)
        r = report('798868', ecr_kw={'override': {('S100001', '02701', '00100'): v[('S100001', '02701', '00100')] + 500}})
        self.assertIn('S10-E-TIE', rules(r))


class DuplicateAccount(unittest.TestCase):
    """Criterion 3: a listing with a duplicate account fails and names the account by its pseudonymous ID."""

    def test_duplicate_on_3c(self):
        def dup(lst):
            rows = lst['3C'][2]
            rows[7]['acct'], rows[7]['from'] = rows[3]['acct'], rows[3]['from']
        r = report(mutate=dup)
        f = at(r, 'TBD-DUPLICATE')
        self.assertEqual(len(f), 1)
        self.assertIn('B0000004', f[0]['message'])
        self.assertEqual(f[0]['actual'], 'account B0000004')
        self.assertEqual(r['status'], 'FAIL')

    def test_duplicate_on_2a_and_3b(self):
        def dup(lst):
            ip = lst['2A-IP'][2]
            ip[2]['acct'], ip[2]['from'] = ip[1]['acct'], ip[1]['from']
            cc = lst['3B'][2]
            cc[2]['acct'], cc[2]['from'] = cc[0]['acct'], cc[0]['from']
        r = report(mutate=dup)
        self.assertTrue({'BD-DUPLICATE', 'CC-DUPLICATE'} <= rules(r))

    def test_a_real_looking_account_number_is_refused(self):
        def real(lst):
            lst['3C'][2][0]['acct'] = 'ACCT77123456'
        with self.assertRaises(engine.InputError) as cm:
            report(mutate=real)
        self.assertNotIn('77123456', str(cm.exception))
        self.assertIn('row ID', str(cm.exception))


class OneTwentyDays(unittest.TestCase):
    """Criterion 4: a bad debt written off 60 days after the first bill fails on the 120 day rule."""

    def _first_plain(self, lst):
        return next(r for r in lst['2A-IP'][2] if not r['medicaid'])

    def test_sixty_days(self):
        def early(lst):
            row = self._first_plain(lst)
            row['first_bill'] = row['mcr_wo'] - dt.timedelta(days=60)
            row['ra'] = row['first_bill'] - dt.timedelta(days=5)
        r = report(mutate=early)
        f = at(r, 'BD-120-DAYS')
        self.assertEqual(len(f), 1)
        self.assertEqual(f[0]['actual'], '60 days')
        self.assertIn('413.89', f[0]['source'])
        self.assertEqual(r['status'], 'FAIL')
        self.assertNotIn('BD-BILL-120', rules(r))

    def test_dual_eligible_and_indigent_are_not_held_to_it(self):
        def mark(lst):
            row = self._first_plain(lst)
            row['first_bill'] = row['mcr_wo'] - dt.timedelta(days=30)
            row['indigent'] = 'Y'
            row['bene_resp'] = 0.0
        self.assertNotIn('BD-120-DAYS', rules(report(mutate=mark)))

    def test_bill_must_go_out_within_120_days_of_the_remittance(self):
        def late(lst):
            row = self._first_plain(lst)
            row['ra'] = row['first_bill'] - dt.timedelta(days=200)
        f = at(report(mutate=late), 'BD-BILL-120')
        self.assertEqual(f[0]['actual'], '200 days')

    def test_write_off_outside_the_period(self):
        def outside(lst):
            row = self._first_plain(lst)
            row['mcr_wo'] = row['ar_wo'] = row['ceased'] = hb.mdy(lst['2A-IP'][1]['fyb'].strftime('%m/%d/%Y')) - \
                dt.timedelta(days=3)
            row['first_bill'] = row['mcr_wo'] - dt.timedelta(days=150)
            row['ra'] = row['first_bill'] - dt.timedelta(days=10)
            cc = lst['3C'][2][0]
            cc['wo'] = lst['3C'][1]['fye'] + dt.timedelta(days=1)
        r = report(mutate=outside)
        self.assertTrue({'BD-WRITEOFF-PERIOD', 'TBD-WRITEOFF-PERIOD'} <= rules(r))


class DeductibleCoinsuranceCap(unittest.TestCase):
    """Criterion 5: a bad debt above the deductible and coinsurance fails."""

    def test_over_the_cap(self):
        def over(lst):
            row = max(lst['2A-IP'][2], key=lambda x: x['allowable'])
            row['coinsurance'] = 0.0
            row['deductible'] = round(row['allowable'] - 100, 2)
        r = report(mutate=over)
        f = at(r, 'BD-CAP')
        self.assertEqual(len(f), 1)
        self.assertEqual(f[0]['column'], '23')
        self.assertTrue(f[0]['expected'].startswith('at most'))
        self.assertEqual(r['status'], 'FAIL')

    def test_payments_before_write_off_lower_the_cap(self):
        def paid(lst):
            lst['2A-OP'][2][0]['paid_prior'] = 50.0
        self.assertIn('BD-CAP', rules(report(mutate=paid)))

    def test_3c_bad_debt_cannot_exceed_charges_net_of_payments(self):
        def paid(lst):
            row = lst['3C'][2][0]
            row['phys'] = round(row['charges'] * 0.1, 2)
            row['third_party'] = round(row['third_party'] + row['bad_debt'], 2)
        f = at(report(mutate=paid), 'TBD-CAP')
        self.assertEqual((len(f), f[0]['column']), (1, '17'))

    def test_3b_charity_cannot_include_physician_charges(self):
        def phys(lst):
            row = lst['3B'][2][0]
            row['phys'] = 10.0
        self.assertIn('CC-CHARGES', rules(report(mutate=phys)))


class MissingListings(unittest.TestCase):
    """Criterion 6: a missing Exhibit 3B or 3C fails, citing 42 CFR 413.24(f)(5)."""

    def test_missing_3b(self):
        r = report(leave_out=('3B', '3B-COMP'))
        f = [x for x in at(r, 'LIST-MISSING') if x['exhibit'] == '3B']
        self.assertEqual(len(f), 1)
        self.assertIn('413.24(f)(5)(i)(D)', f[0]['message'])
        self.assertIn('413.24(f)(5)', f[0]['source'])
        self.assertEqual(r['status'], 'FAIL')

    def test_missing_3c(self):
        r = report(leave_out=('3C', '3C-COMP'))
        f = [x for x in at(r, 'LIST-MISSING') if x['exhibit'] == '3C']
        self.assertEqual(len(f), 1)
        self.assertIn('413.24(f)(5)', f[0]['message'])
        self.assertEqual(r['status'], 'FAIL')

    def test_missing_2a(self):
        r = report(leave_out=('2A-IP', '2A-OP'))
        f = [x for x in at(r, 'LIST-MISSING') if x['exhibit'] == '2A']
        self.assertIn('413.24(f)(5)(i)(B)', f[0]['message'])

    def test_missing_outpatient_2a_only(self):
        r = report(leave_out=('2A-OP',))
        self.assertTrue(any('OP listing' in x['message'] for x in at(r, 'LIST-MISSING')))

    def test_listing_totals_must_match_the_worksheets(self):
        def short(lst):
            lst['3C'][2].pop()
            lst['2A-IP'][2].pop()
        r = report(mutate=short)
        self.assertTrue({'TBD-TIE', 'BD-TIE'} <= rules(r))
        self.assertTrue(any(x['worksheet'] == 'E, Part A' and x['line'] == '64' for x in at(r, 'BD-TIE')))

    def test_s2_line_12_yes_with_nothing_claimed_is_a_warning(self):
        r = report('797189')   # as filed: line 12 is Y, no Medicare bad debt anywhere
        self.assertEqual(rules(r), {'LIST-S2-12'})
        self.assertEqual(r['status'], 'WARN')


class Deadline(unittest.TestCase):
    """Criterion 7: a June 30 year end measured on December 1 warns that the five month mark has passed."""

    def test_june_30_on_december_1(self):
        fx = hb.load_fixture('824909')   # 07/01/2024 to 06/30/2025
        r = report('824909', q={**period(fx), 'asOf': '2025-12-01'})
        f = at(r, 'DEADLINE-LATE')
        self.assertEqual(len(f), 1)
        self.assertEqual(f[0]['severity'], 'warning')
        self.assertEqual(r['deadline']['daysLeft'], -1)   # due November 30: one day late on December 1
        self.assertEqual(f[0]['actual'], '1 days late')
        self.assertEqual(r['deadline']['status'], 'late')
        self.assertEqual(r['checks']['deadline'], 'warn')
        self.assertIn('413.24(f)(2)', f[0]['source'])
        self.assertNotIn('error', {x['severity'] for x in r['findings']})

    def test_due_dates(self):
        self.assertEqual(engine.due_date(dt.date(2025, 6, 30))[0], dt.date(2025, 11, 30))
        self.assertEqual(engine.due_date(dt.date(2025, 9, 30))[0], dt.date(2026, 2, 28))
        self.assertEqual(engine.due_date(dt.date(2023, 9, 30))[0], dt.date(2024, 2, 29))
        self.assertEqual(engine.due_date(dt.date(2025, 12, 31))[0], dt.date(2026, 5, 31))
        self.assertEqual(engine.due_date(dt.date(2025, 6, 15))[0], dt.date(2025, 11, 12))   # mid-month: 150 days

    def test_on_time(self):
        r = run(sample('hcris-sample-clean'), {**SAMPLE_Q, 'asOf': '2025-10-31'})
        self.assertEqual(r['deadline']['status'], 'on-time')
        self.assertEqual(r['deadline']['daysLeft'], 0)


class EcrFormat(unittest.TestCase):
    """The record format of Table 1 and the level 1 edits of Table 6."""

    def setUp(self):
        self.fx = hb.load_fixture('844286')
        self.q = period(self.fx)

    def edit(self, fn, **kw):
        raw = hb.ecr_from_hcris(self.fx, **kw).decode('ascii').split('\r\n')
        return run('\r\n'.join(fn(raw)).encode('latin-1'), self.q)

    def test_record_edits(self):
        def bad(raw):
            raw[5] = raw[5].lower()
            raw[6] = raw[6] + ' ' * 40
            raw[8] = raw[7]
            raw.insert(9, '9 NOT A RECORD')
            return raw
        r = self.edit(bad)
        self.assertTrue({'ECR-10100', 'ECR-10050', 'ECR-10500', 'ECR-10000'} <= rules(r, 'error'))

    def test_line_feed_only(self):
        r = run(hb.ecr_from_hcris(self.fx, crlf=False), self.q)
        self.assertIn('ECR-10150', rules(r))

    def test_record_1(self):
        def bad(raw):
            raw[0] = raw[0][:16] + '19A208' + raw[0][22:36] + '2' + raw[0][37:]
            return raw
        r = self.edit(bad)
        self.assertTrue({'ECR-10200', 'ECR-MCR-VERSION'} <= rules(r))

    def test_periods_before_october_2022_are_refused(self):
        with mock.patch.object(engine, 'LISTING_FORMAT_START', dt.date(2030, 1, 1)), \
                self.assertRaises(engine.InputError) as cm:
            run(hb.ecr_from_hcris(self.fx), self.q)
        self.assertIn('October 1, 2022', str(cm.exception))

    def test_old_spec_date_warns(self):
        r = run(hb.ecr_from_hcris(self.fx, spec_date='2022274'), self.q)
        f = at(r, 'ECR-SPEC-DATE')
        self.assertEqual((f[0]['severity'], f[0]['expected'], f[0]['actual']), ('warning', '2024275', '2022274'))

    def test_missing_type_4(self):
        self.assertIn('ECR-TYPE4', rules(run(hb.ecr_from_hcris(self.fx, type4=False), self.q)))

    def test_label_missing(self):
        def drop(raw):
            return [x for x in raw if not x.startswith('2A000000  06000')]
        self.assertIn('ECR-10800', rules(self.edit(drop)))


class CrossTies(unittest.TestCase):
    """Worksheets A, B, C, D and E, recomputed from the filed amounts."""

    def tie(self, key, delta, name='844286'):
        fx = hb.load_fixture(name)
        v = hb.amounts(fx)
        return run(hb.ecr_from_hcris(fx, override={key: v.get(key, 0) + delta}), period(fx))

    def test_a_to_b(self):
        f = at(self.tie(('B000001', '06000', '00000'), 5000), 'TIE-A-B')
        self.assertEqual((f[0]['worksheet'], f[0]['line'], f[0]['column']), ('B, Part I', '60', '0'))
        self.assertEqual(f[0]['actual'] - f[0]['expected'], 5000)

    def test_b_step_down_and_b_to_c(self):
        self.assertIn('TIE-B-TOTAL', rules(self.tie(('B000001', '20200', '02400'), 10)))
        self.assertIn('TIE-B-C', rules(self.tie(('C000001', '05000', '00100'), 10, '794731')))

    def test_c_footing_and_charges(self):
        r = self.tie(('C000001', '20000', '00600'), 25)
        self.assertTrue({'TIE-C-FOOT', 'TIE-C-202'} <= rules(r))
        self.assertIn('TIE-C-CHARGES', rules(self.tie(('C000001', '03000', '00700'), 3)))

    def test_d_to_e_and_bad_debt_reduction(self):
        self.assertIn('TIE-D-E', rules(self.tie(('E00A18B', '00100', '00100'), 100, '811259')))
        f = at(self.tie(('E00A18A', '06500', '00100'), 40, '811259'), 'TIE-E-BADDEBT')
        self.assertEqual(f[0]['line'], '65')

    def test_real_filings_with_inconsistencies(self):
        """Three reports as filed: the checks find what is actually wrong in them."""
        fx = hb.load_fixture('824347')   # E, Part B, line 36 (dual eligible) above line 34 (all bad debts)
        self.assertIn('TIE-E-DUAL', rules(run(hb.ecr_from_hcris(fx), period(fx))))
        for name in ('812094', '840559'):   # S-10, Part II, line 26 above Part I, line 26
            fx = hb.load_fixture(name)
            self.assertIn('S10-PART2-SUBSET', rules(run(hb.ecr_from_hcris(fx), period(fx))))


class PriorYears(unittest.TestCase):
    """Accounts already claimed: last year's listings in the package are compared row by row."""

    def test_account_claimed_last_year(self):
        fx = hb.load_fixture('844286')
        lst = hb.listings_for(fx, shift=SHIFT)
        _, head, rows = lst['3C']
        prev = copy.deepcopy(rows[:3])
        prior_head = dict(head, fyb=head['fyb'].replace(year=head['fyb'].year - 1),
                          fye=head['fye'].replace(year=head['fye'].year - 1))
        extra = [('TotalBD_prior.xlsx', hb.to_xlsx(hb.grid('3C', prior_head, prev)))]
        r = run(hb.build_package(fx, lst, extra=extra), period(fx))
        self.assertEqual(len(at(r, 'TBD-PRIOR')), 3)
        self.assertEqual(r['listings']['priorClaimCheck']['3C'], 'ran')
        self.assertEqual(r['listings']['priorYearListings'], 1)

    def test_not_run_without_last_years_listing(self):
        r = report()
        self.assertTrue(r['listings']['priorClaimCheck']['2A'].startswith('not run'))


class InputsAndPrivacy(unittest.TestCase):

    def refused(self, mutate, drop=hb.DELETED):
        with self.assertRaises(engine.InputError) as cm:
            report(mutate=mutate, drop=drop)
        msg = str(cm.exception)
        self.assertIn('Nothing was charged', msg)
        self.assertIn('does not accept PHI', msg)
        return msg

    def test_name_columns_must_be_deleted_or_blank(self):
        msg = self.refused(lambda lst: lst['3C'][2][4].update(last='SMITH'), drop=())
        self.assertIn('row 18, column 1', msg)
        self.assertNotIn('SMITH', msg)

    def test_medicaid_numbers_are_refused(self):
        msg = self.refused(lambda lst: next(r for r in lst['2A-IP'][2] if r['medicaid']).update(medicaid='12345678'))
        self.assertIn('Medicaid number', msg)
        self.assertNotIn('12345678', msg)
    def test_report_never_repeats_hospital_text(self):
        fx = hb.load_fixture('794731')
        r = report('794731')
        text = json.dumps(r)
        for a in fx['alpha']:
            if a[0] == 'S200001' and a[2] == '00100' and len(a[3]) > 6:
                self.assertNotIn(a[3], text)

    def test_parameters(self):
        body = sample('hcris-sample-clean')
        for q in ({}, {'periodStart': '2021-09-05'}, {**SAMPLE_Q, 'periodEnd': '09/04/2022'},
                  {**SAMPLE_Q, 'fiscalYearEnd': '2022-09-04'}, {**SAMPLE_Q, 'periodEnd': '2021-09-01'}):
            with self.subTest(q=q), self.assertRaises(engine.InputError):
                run(body, q)

    def test_other_inputs(self):
        for body in (b'', b'%PDF-1.7', b'PK\x03\x04broken', hb.to_xlsx({(1, 1): 'x'})):
            with self.subTest(body=body[:8]), self.assertRaises(engine.InputError):
                run(body, SAMPLE_Q)
        fx = hb.load_fixture('844286')
        two = hb.package([('a', hb.ecr_from_hcris(fx)), ('b', hb.ecr_from_hcris(fx))])
        with self.assertRaises(engine.InputError) as cm:
            run(two, period(fx))
        self.assertIn('more than one ECR', str(cm.exception))

    def test_time_budget(self):
        with self.assertRaises(engine.Timeout) as cm:
            engine.validate(sample('hcris-sample-clean'), query=SAMPLE_Q, budget=-1)
        self.assertIn('Nothing was charged', str(cm.exception))

    def test_demo_samples_match_the_published_files(self):
        got = {hashlib.sha256(sample(n)).hexdigest(): n for n in ('hcris-sample-clean', 'hcris-sample-errors')}
        self.assertEqual(got, engine.DEMO_SAMPLES)

    def test_error_sample_shows_each_planted_problem(self):
        r = run(sample('hcris-sample-errors'), SAMPLE_Q)
        self.assertEqual(r['status'], 'FAIL')
        self.assertTrue({'TIE-A-B', 'S10-LINE', 'BD-120-DAYS', 'BD-CAP', 'TBD-DUPLICATE', 'LIST-MISSING'} <= rules(r))


class DemoAndBilling(unittest.TestCase):
    """Criterion 8: the demo runs the sample files; a paid run debits exactly one $200 run; no dashes."""

    def setUp(self):
        self.fake = FakeStore()
        self.key, self.user = self.fake.add_user(50000)
        self.p = [mock.patch.object(store, 'rpc', self.fake.rpc), mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'})]
        for p in self.p:
            p.start()

    def tearDown(self):
        for p in self.p:
            p.stop()

    QS = '?periodStart=2021-09-05&periodEnd=2022-09-04&asOf=2025-10-15'

    def test_price(self):
        self.assertEqual(catalog.APIS[API]['price_cents'], 20000)
        self.assertEqual(catalog.APIS[API]['max_body_bytes'], 4_000_000)

    def test_paid_run_debits_exactly_200(self):
        status, payload = call(API, 'paid', sample('hcris-sample-clean'), {'Authorization': f'Bearer {self.key}'},
                               path=f'/api/v1/{API}{self.QS}')
        self.assertEqual(status, 200, payload)
        self.assertTrue(payload['charged'])
        self.assertEqual(payload['priceCents'], 20000)
        self.assertEqual(self.fake.balance[self.user], 30000)
        self.assertEqual([x['delta'] for x in self.fake.ledger], [-20000])

    def test_fail_report_charged_input_error_not(self):
        status, payload = call(API, 'paid', sample('hcris-sample-errors'), {'Authorization': f'Bearer {self.key}'},
                               path=f'/api/v1/{API}{self.QS}')
        self.assertEqual((status, payload['report']['status']), (200, 'FAIL'))
        status, payload = call(API, 'paid', b'%PDF-1.7', {'Authorization': f'Bearer {self.key}'},
                               path=f'/api/v1/{API}{self.QS}')
        self.assertEqual(status, 400)
        self.assertFalse(payload['error']['charged'])
        self.assertEqual(self.fake.balance[self.user], 30000)

    def test_over_4_mb_is_refused_before_reading(self):
        status, payload = handler.process(API, 'paid', {'Content-Length': '4000001', 'Authorization': f'Bearer {self.key}'},
                                          lambda n: b'', f'/api/v1/{API}{self.QS}')
        self.assertEqual(status, 413)
        self.assertIn('4 MB', payload['error']['message'])
        self.assertEqual(self.fake.balance[self.user], 50000)

    def test_not_enough_credit(self):
        key, user = self.fake.add_user(19999)
        status, _ = call(API, 'paid', sample('hcris-sample-clean'), {'Authorization': f'Bearer {key}'},
                         path=f'/api/v1/{API}{self.QS}')
        self.assertEqual(status, 402)
        self.assertEqual(self.fake.balance[user], 19999)

    def test_demo_runs_samples_only(self):
        status, payload = call(API, 'demo', sample('hcris-sample-errors'), path=f'/api/demo/{API}{self.QS}')
        self.assertEqual((status, payload['charged'], payload['report']['status']), (200, False, 'FAIL'))
        status, payload = call(API, 'demo', sample('hcris-sample-clean'), path=f'/api/demo/{API}{self.QS}')
        self.assertEqual(payload['report']['status'], 'PASS')
        fx = hb.load_fixture('798868')
        status, payload = call(API, 'demo', hb.build_package(fx, hb.listings_for(fx, shift=SHIFT)), path=f'/api/demo/{API}{self.QS}')
        self.assertEqual(status, 400)
        self.assertIn('sample packages only', payload['error']['message'])

    def test_no_dashes(self):
        for rel in ('pylib/spreadrun_api/validators/hcris/engine.py', 'pylib/tests/hcris_build.py',
                    'scripts/hcris/make_samples.py'):
            self.assertIsNone(re.search('[–—−]', (ROOT / rel).read_text()), rel)
        for name in ('hcris-sample-clean', 'hcris-sample-errors'):
            r = run(sample(name), SAMPLE_Q)
            self.assertIsNone(re.search('[–—−]', json.dumps(r, ensure_ascii=False)))


# Calendar dates in any form a report could carry them. Seven-digit ECR specification dates (2026181) are CMS version
# identifiers, not dates from the files, and stay, as does the transmittal title.
DATE_RE = re.compile(r'\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}/\d{1,2}/\d{2,4}\b|\b(January|February|March|April|May|June|July|'
                     r'August|September|October|November|December) \d{1,2}, \d{4}\b(?<!June 30, 2026)')


class PhiRefused(unittest.TestCase):
    """PHI criteria 1 and 2: an MBI pattern, or patient-name-like text, anywhere in a listing is refused with a clear
    message and no charge."""

    def check(self, mutate, kind):
        with self.assertRaises(engine.InputError) as cm:
            report(mutate=mutate)
        msg = str(cm.exception)
        self.assertIn(kind, msg)
        self.assertIn('Nothing was charged', msg)
        return msg

    def test_mbi_in_the_id_column(self):
        for mbi in ('1EG4TE5MK73', '1EG4-TE5-MK73', '9AA9AA9AA99'):
            with self.subTest(mbi=mbi):
                msg = self.check(lambda lst: lst['2A-IP'][2][0].update(acct=mbi), 'an MBI')
                self.assertNotIn(mbi, msg)
                self.assertIn('column 5', msg)

    def test_hicn_and_ssn_patterns(self):
        self.check(lambda lst: lst['3B'][2][0].update(acct='123456789A'), 'a HICN')
        self.check(lambda lst: lst['2A-IP'][2][0].update(comments='SSN 123-45-6789'), 'a Social Security number')

    def test_name_like_text_in_any_column(self):
        for field, value in (('primary', 'SMITH, JOHN'), ('acct', 'Jane Doe'), ('secondary', 'MRS. JONES')):
            with self.subTest(field=field):
                msg = self.check(lambda lst: lst['3C'][2][0].update(**{field: value}), 'a patient name')
                self.assertNotIn(value, msg)
        self.check(lambda lst: lst['2A-IP'][2][0].update(comments='called pt re DOB'), 'a patient name')

    def test_payer_names_are_not_patient_names(self):
        def payers(lst):
            for r_, p_ in zip(lst['3C'][2], ('BLUE CROSS BLUE SHIELD', 'AETNA, INC', 'MEDICAID HMO', 'UNITED HEALTHCARE')):
                r_['primary'] = p_
        self.assertEqual(report(mutate=payers)['status'], 'PASS')

    def test_unshifted_listings_are_refused(self):
        with self.assertRaises(engine.InputError) as cm:
            report(shift=0)
        self.assertIn('not shifted', str(cm.exception))

    def test_period_not_shifted_as_a_block_is_refused(self):
        fx = hb.load_fixture('844286')
        q = period(fx)
        with self.assertRaises(engine.InputError) as cm:
            report(q={**q, 'periodEnd': (dt.date.fromisoformat(q['periodEnd']) + dt.timedelta(days=3)).isoformat()})
        self.assertIn('same number of days', str(cm.exception))

    def test_period_not_shifted_like_the_listings_warns_once(self):
        fx = hb.load_fixture('844286')
        r = report(q=period(fx, shift=SHIFT - 400), shift=SHIFT)
        self.assertEqual(len(at(r, 'LIST-SHIFT')), 1)
        self.assertFalse([f for f in r['findings'] if f['ruleId'].endswith('WRITEOFF-PERIOD')])


class ShiftInvariance(unittest.TestCase):
    """PHI criterion 3: shifting every listing date and the period by the same number of days changes nothing."""

    def findings(self, shift, mutate=None):
        with mock.patch.object(engine, 'REFUSE_UNSHIFTED', shift != 0 and engine.REFUSE_UNSHIFTED):
            r = report(shift=shift, mutate=mutate)
        return r['status'], r['tiesChecked'], json.dumps(r['findings'], sort_keys=True)

    def test_plus_500_days_matches_the_unshifted_listing(self):
        def planted(lst):
            row = next(r for r in lst['2A-IP'][2] if not r['medicaid'])
            row['first_bill'] = row['mcr_wo'] - dt.timedelta(days=63)
            row['ra'] = row['first_bill'] - dt.timedelta(days=5)
            lst['3C'][2][0]['wo'] = lst['3C'][1]['fye'] + dt.timedelta(days=9)
            lst['3B'][2][1]['acct'], lst['3B'][2][1]['from'] = lst['3B'][2][0]['acct'], lst['3B'][2][0]['from']
        base = self.findings(0, planted)
        self.assertEqual(base[0], 'FAIL')
        for shift in (500, -1200):
            with self.subTest(shift=shift):
                self.assertEqual(self.findings(shift, planted), base)
        self.assertIn('63 days', base[2])
        self.assertIn('9 days after the period ends', base[2])

    def test_clean_reports_pass_at_any_shift(self):
        for shift in (500, -3650):
            with self.subTest(shift=shift):
                self.assertEqual(report('798868', shift=shift)['status'], 'PASS')


class NoDatesOrIdentifiers(unittest.TestCase):
    """PHI criterion 4: no absolute date anywhere in a report, and no identifier beyond the pseudonymous ID."""

    def test_no_dates_in_any_report(self):
        fx = hb.load_fixture('844286')

        def everything(lst):
            row = next(r for r in lst['2A-IP'][2] if not r['medicaid'])
            row['mcr_wo'] = lst['2A-IP'][1]['fye'] + dt.timedelta(days=4)
            row['ar_wo'] = row['ceased'] = row['mcr_wo'] + dt.timedelta(days=2)
            lst['3C'][2][3]['acct'], lst['3C'][2][3]['from'] = lst['3C'][2][2]['acct'], lst['3C'][2][2]['from']
        reports = [report(mutate=everything, q={**period(fx), 'asOf': '2026-10-01'}),
                   run(sample('hcris-sample-errors'), SAMPLE_Q), run(sample('hcris-sample-clean'), SAMPLE_Q)]
        for r in reports:
            text = json.dumps(r)
            self.assertEqual(DATE_RE.findall(text), [], text[:300])
            self.assertNotIn('"due"', text)
            self.assertNotIn('"asOf"', text)
        self.assertTrue({'BD-WRITEOFF-PERIOD', 'BD-DATES', 'TBD-DUPLICATE', 'DEADLINE-LATE'} <= rules(reports[0]))

    def test_only_pseudonymous_ids_are_echoed(self):
        r = run(sample('hcris-sample-errors'), SAMPLE_Q)
        with zipfile.ZipFile(io.BytesIO(sample('hcris-sample-errors'))) as z:
            ids = set()
            for n in z.namelist():
                if n.endswith('.xlsx'):
                    for lst in engine.find_listings(n, z.read(n), engine.Clock(10)):
                        ids |= {engine.acct_key(row) for row in lst.rows}
        shown = set(re.findall(r'[Aa]ccount ([A-Z0-9]+)', json.dumps(r)))
        self.assertTrue(shown)
        self.assertTrue(shown <= ids)


class SamplesFollowTheContract(unittest.TestCase):
    """PHI criterion 5: the published samples have pseudonymous IDs, no name or MBI columns, and shifted dates."""

    def test_samples(self):
        fx = hb.load_fixture('844286')
        real = (hb.mdy(fx['rpt'][5]), hb.mdy(fx['rpt'][6]))
        for name in ('hcris-sample-clean', 'hcris-sample-errors'):
            with zipfile.ZipFile(io.BytesIO(sample(name))) as z:
                lists = [lst for n in z.namelist() if n.endswith('.xlsx')
                         for lst in engine.find_listings(n, z.read(n), engine.Clock(10))]
            self.assertTrue(lists)
            for lst in lists:
                with self.subTest(sample=name, file=lst.file):
                    self.assertFalse({'last', 'first', 'mbi'} & set(lst.colmap))
                    engine.privacy_guard(lst)   # raises if anything looks like PHI
                    fyb, fye = engine.as_date(lst.header['fyb']), engine.as_date(lst.header['fye'])
                    self.assertNotEqual((fyb, fye), real)
                    self.assertEqual((fye - fyb), real[1] - real[0])
                    self.assertEqual(fyb.isoformat(), SAMPLE_Q['periodStart'])
                    self.assertTrue(all(str(row.get('medicaid', '') or '') in ('', 'Y') for row in lst.rows))


if __name__ == '__main__':
    unittest.main()
