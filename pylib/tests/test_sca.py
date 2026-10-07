"""Tests for the SCA Health and Welfare Fringe Checker.
Run from the repo root:  python3.12 -m unittest discover -s pylib/tests -v
Every employee here is invented, identified by a made-up reference. Nothing touches the network.

The acceptance criteria from the build prompt map to the classes below:
  1 FortyHourCap   2 PartTime   3 CashInLieu   4 WageOffset   5 AdminCosts   6 AverageCost   7 RateConfig
  8 Billing (free demo on pasted CSV, one $100 debit per paid run) and Copy (no dashes in any message).
"""
import io
import json
import re
import sys
import unittest
import zipfile
from decimal import Decimal
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pylib'))
sys.path.insert(0, str(Path(__file__).parent))

from spreadrun_api import catalog, handler, runners, store  # noqa: E402
from test_api import FakeStore, call  # noqa: E402

SCA = 'sca-hw-fringe-checker'
engine = runners.sca_module()
HEAD = 'employee_ref,hours_paid,plan_contributions,cash_in_lieu'
STD = engine.RATES['standard']          # 5.92 under AAM 252


def csv_body(*rows, head=HEAD):
    return ('\n'.join([head, *rows]) + '\n').encode()


def run(body, **params):
    params.setdefault('eo13706', 'false')
    return runners.run_sca(body, query={k: str(v) for k, v in params.items()})


def emp(report, line):
    return next(e for e in report['employees'] if e['line'] == line)


def rules_at(report, line):
    return {f['ruleId'] for f in report['findings'] if f['line'] == line}


class Rates(unittest.TestCase):
    """rates.json holds the AAM 252 figures, read on SAM.gov wage determinations in October 2026."""

    def test_current_rates(self):
        self.assertEqual(engine.CONFIG['effective'], '2026-08-10')
        self.assertEqual({k: str(v) for k, v in engine.RATES.items()},
                         {'standard': '5.92', 'eo13706': '5.42', 'hawaiiHphca': '2.51', 'hawaiiHphcaEo13706': '2.01'})

    def test_eo13706_picks_the_lower_rate(self):
        r = run(csv_body('A,40,0,0'), eo13706='true')
        self.assertEqual(emp(r, 2)['required'], '216.80')     # 40 x 5.42, as printed on WD 2015-4281: $216.80 a week
        r = run(csv_body('A,40,0,0'), eo13706='false')
        self.assertEqual(emp(r, 2)['required'], '236.80')     # 40 x 5.92: $236.80 a week

    def test_hawaii_rate_depends_on_hphca_coverage(self):
        body = csv_body('A,40,0,0,yes', 'B,40,0,0,no', head=HEAD + ',hphca_covered')
        r = run(body, hawaii='true', eo13706='false')
        self.assertEqual(emp(r, 2)['required'], '100.40')     # 40 x 2.51, WD 2015-5689: $100.40 a week
        self.assertEqual(emp(r, 3)['required'], '236.80')     # not covered by HPHCA: the standard rate
        r = run(body, hawaii='true', eo13706='true')
        self.assertEqual(emp(r, 2)['required'], '80.40')      # 40 x 2.01
        self.assertEqual(emp(r, 3)['required'], '216.80')

    def test_hawaii_needs_the_coverage_column(self):
        with self.assertRaises(runners.InputError):
            run(csv_body('A,40,0,0'), hawaii='true')

    def test_eo13706_is_required_unless_a_rate_is_given(self):
        with self.assertRaises(runners.InputError):
            runners.run_sca(csv_body('A,40,0,0'), query={})
        r = runners.run_sca(csv_body('A,40,0,0'), query={'hwRate': '5.55'})
        self.assertEqual(emp(r, 2)['required'], '222.00')
        self.assertEqual(r['parameters']['rates']['basis'], 'supplied')


class FortyHourCap(unittest.TestCase):
    """Criterion 1: a 45-hour week is computed on 40 hours, not 45 (29 CFR 4.175(a), 4.172)."""

    def test_45_hours_counts_as_40(self):
        r = run(csv_body('A,45,0,0'))
        e = emp(r, 2)
        self.assertEqual(e['hoursCounted'], '40.00')
        self.assertTrue(e['capped'])
        self.assertEqual(e['required'], money(40 * STD))
        self.assertNotEqual(e['required'], money(45 * STD))

    def test_paid_leave_counts_toward_the_40(self):
        # 32 worked plus 8 holiday hours: 40 hours paid, all count.
        self.assertEqual(emp(run(csv_body('A,40,0,0')), 2)['hoursCounted'], '40.00')

    def test_weekly_columns_cap_each_week(self):
        head = HEAD + ',hours_week_1,hours_week_2'
        r = run(csv_body('A,80,0,0,50,30', head=head), periodWeeks=2)
        self.assertEqual(emp(r, 2)['hoursCounted'], '70.00')   # 40 + 30, not 80
        r = run(csv_body('A,80,0,0'), periodWeeks=2)
        self.assertEqual(emp(r, 2)['hoursCounted'], '80.00')   # without weeks: the period cap, with a note
        self.assertTrue(any('weekly hour columns' in n for n in r['notes']))

    def test_annual_cap(self):
        r = run(csv_body('A,40,0,0,2060', head=HEAD + ',ytd_hw_hours'))
        self.assertEqual(emp(r, 2)['hoursCounted'], '20.00')   # only 20 left of 2,080

    def test_weekly_columns_must_match_the_period(self):
        with self.assertRaises(runners.InputError):
            run(csv_body('A,40,0,0,40', head=HEAD + ',hours_week_1'), periodWeeks=2)


class PartTime(unittest.TestCase):
    """Criterion 2: 20 hours a week is pro-rated, and full-time credit claimed on the upload is flagged."""

    def test_20_hours_is_pro_rated(self):
        e = emp(run(csv_body(f'A,20,{money(20 * STD)},0')), 2)
        self.assertEqual(e['required'], money(20 * STD))       # 118.40, half the 40-hour amount
        self.assertEqual(e['result'], 'PASS')
        self.assertTrue(e['partTime'])

    def test_full_time_credit_claimed_is_flagged(self):
        r = run(csv_body(f'A,20,{money(20 * STD)},0,40', head=HEAD + ',hw_hours_credited'))
        self.assertIn('SCA-CREDIT-HOURS-HIGH', rules_at(r, 2))
        rk = {x['item']: x for x in r['recordkeeping']}
        self.assertEqual(rk['partTime']['status'], 'flagged')
        self.assertEqual(rk['partTime']['lines'], [2])
        self.assertEqual(r['status'], 'WARN')

    def test_part_timer_with_nothing_is_a_violation(self):
        r = run(csv_body('A,20,0,0'))
        self.assertEqual(rules_at(r, 2), {'SCA-HW-SHORTFALL', 'SCA-PART-TIME'})
        self.assertEqual(emp(r, 2)['shortfall'], money(20 * STD))

    def test_hours_left_out_of_the_credit(self):
        # Paid 40 (32 worked and 8 holiday) but H&W figured on 32: flagged even when the money happens to be enough.
        r = run(csv_body('A,40,236.80,0,32', head=HEAD + ',hw_hours_credited'))
        self.assertIn('SCA-CREDIT-HOURS-LOW', rules_at(r, 2))


class CashInLieu(unittest.TestCase):
    """Criterion 3: cash in lieu that fully covers the requirement is a PASS with zero shortfall (29 CFR 4.177)."""

    def test_cash_in_lieu_covers_it(self):
        r = run(csv_body(f'A,40,0,{money(40 * STD)}', f'B,40,100.00,{money(40 * STD - 100)}'))
        self.assertEqual(r['status'], 'PASS')
        self.assertEqual(r['totals']['backWageExposure'], '0.00')
        self.assertEqual([e['shortfall'] for e in r['employees']], ['0.00', '0.00'])
        self.assertEqual(r['findings'], [])
        self.assertEqual(r['shortfallLines'], [])

    def test_a_cent_short_fails(self):
        r = run(csv_body(f'A,40,0,{money(40 * STD - Decimal("0.01"))}'))
        self.assertEqual(r['status'], 'FAIL')
        self.assertEqual(emp(r, 2)['shortfall'], '0.01')

    def test_cash_not_shown_separately_is_flagged(self):
        r = run(csv_body(f'A,40,0,{money(40 * STD)},no', head=HEAD + ',cash_in_lieu_separate'))
        self.assertIn('SCA-CIL-NOT-SEPARATE', rules_at(r, 2))
        self.assertEqual({x['item']: x['status'] for x in r['recordkeeping']}['separate'], 'flagged')

    def test_no_averaging_across_employees(self):
        # One overpaid, one underpaid by the same amount: the total balances, the underpaid employee still fails.
        r = run(csv_body(f'A,40,{money(40 * STD + 50)},0', f'B,40,{money(40 * STD - 50)},0'))
        self.assertEqual(r['shortfallLines'], [3])
        self.assertEqual(r['totals']['backWageExposure'], '50.00')


class WageOffset(unittest.TestCase):
    """Criterion 4: wages above the WD rate covering a fringe shortfall are a violation (29 CFR 4.170(a))."""

    HEAD_W = HEAD + ',wage_rate_paid,wd_wage_rate'

    def test_wages_covering_the_shortfall(self):
        # FS67B's example: pay $25.00 against a $19.50 WD rate and no H&W. The higher wage does not count.
        r = run(csv_body('A,40,0,0,25.00,19.50', head=self.HEAD_W))
        self.assertEqual(rules_at(r, 2), {'SCA-HW-SHORTFALL', 'SCA-WAGE-OFFSET'})
        self.assertEqual(emp(r, 2)['shortfall'], money(40 * STD))
        self.assertEqual(r['status'], 'FAIL')
        f = next(f for f in r['findings'] if f['ruleId'] == 'SCA-WAGE-OFFSET')
        self.assertEqual(f['source'], 'cfr4.170')

    def test_higher_wages_with_full_hw_are_fine(self):
        r = run(csv_body(f'A,40,{money(40 * STD)},0,25.00,19.50', head=self.HEAD_W))
        self.assertEqual(r['status'], 'PASS')

    def test_both_rate_columns_or_neither(self):
        with self.assertRaises(runners.InputError):
            run(csv_body('A,40,0,0,25.00', head=HEAD + ',wage_rate_paid'))


class AdminCosts(unittest.TestCase):
    """Criterion 5: administrative costs entered as fringe credit are flagged (29 CFR 4.172, Fact Sheet #67B)."""

    def test_admin_costs_flagged_and_not_credited(self):
        r = run(csv_body(f'A,40,{money(40 * STD)},0,12.00', head=HEAD + ',admin_costs_credited'))
        self.assertIn('SCA-ADMIN-COSTS', rules_at(r, 2))
        e = emp(r, 2)
        self.assertEqual(e['furnished'], money(40 * STD - 12))
        self.assertEqual(e['shortfall'], '12.00')
        self.assertEqual(e['notCreditable'], '12.00')
        self.assertEqual({x['item']: x['status'] for x in r['recordkeeping']}['adminCosts'], 'flagged')

    def test_zero_admin_costs_is_clear(self):
        r = run(csv_body(f'A,40,{money(40 * STD)},0,0', head=HEAD + ',admin_costs_credited'))
        self.assertEqual({x['item']: x['status'] for x in r['recordkeeping']}['adminCosts'], 'clear')
        self.assertEqual(r['status'], 'PASS')

    def test_employee_paid_amounts_not_credited(self):
        r = run(csv_body(f'A,40,{money(40 * STD)},0,20.00', head=HEAD + ',employee_paid_included'))
        self.assertIn('SCA-EMPLOYEE-PAID', rules_at(r, 2))
        self.assertEqual(emp(r, 2)['shortfall'], '20.00')

    def test_admin_costs_cannot_exceed_contributions(self):
        with self.assertRaises(runners.InputError):
            run(csv_body('A,40,10,0,12', head=HEAD + ',admin_costs_credited'))


class AverageCost(unittest.TestCase):
    """Criterion 6: an average cost WD returns the limitation message and no result (AAM 246)."""

    def test_limitation_message_and_no_result(self):
        for v in ('average', 'average-cost', 'Average Cost'):
            with self.assertRaises(runners.InputError) as cm:
                run(csv_body('A,40,0,0'), wdType=v)
            self.assertIn('fixed-rate', str(cm.exception))
            self.assertIn('All Agency Memorandum 246', str(cm.exception))

    def test_not_charged_over_http(self):
        fake = FakeStore()
        key, user = fake.add_user(20000)
        with mock.patch.object(store, 'rpc', fake.rpc), mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'}):
            status, payload = call(SCA, 'paid', csv_body('A,40,0,0'), {'Authorization': f'Bearer {key}'},
                                   path='/api/v1/sca-hw-fringe-checker?wdType=average&eo13706=false')
        self.assertEqual(status, 400)
        self.assertFalse(payload['error']['charged'])
        self.assertNotIn('report', payload)
        self.assertEqual(fake.balance[user], 20000)


class RateConfig(unittest.TestCase):
    """Criterion 7: change the configured rate and every required figure follows. No rate lives in the logic."""

    def test_changing_the_config_changes_every_figure(self):
        body = csv_body('A,40,0,0', 'B,20,0,0', 'C,45,0,0', 'D,12.5,0,0')
        before = [e['required'] for e in run(body)['employees']]
        test_rates = {**engine.RATES, 'standard': Decimal('7.00')}
        with mock.patch.object(engine, 'RATES', test_rates):
            after = run(body)['employees']
        self.assertEqual([e['required'] for e in after], ['280.00', '140.00', '280.00', '87.50'])
        self.assertTrue(all(a != b for a, b in zip(before, (e['required'] for e in after))))
        self.assertTrue(all(e['rate'] == '7' or e['rate'] == '7.00' for e in after))

    def test_no_rate_hardcoded_in_the_engine(self):
        src = (ROOT / 'pylib/spreadrun_api/validators/sca/engine.py').read_text()
        for rate in engine.CONFIG['rates'].values():
            self.assertNotIn(rate, src)
        for old in ('5.55', '5.09', '2.42', '5.36', '4.93'):
            self.assertNotIn(old, src)


class Billing(unittest.TestCase):
    """Criterion 8: the free demo runs on pasted CSV; a paid run debits exactly one $100 run."""

    def setUp(self):
        self.fake = FakeStore()
        self.key, self.user = self.fake.add_user(25000)
        self.p = [mock.patch.object(store, 'rpc', self.fake.rpc), mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'})]
        for p in self.p:
            p.start()

    def tearDown(self):
        for p in self.p:
            p.stop()

    def json_body(self, rows, **params):
        return json.dumps({'parameters': {'eo13706': False, **params}, 'employeesCsv': '\n'.join([HEAD, *rows])}).encode()

    def test_price_is_100_dollars(self):
        self.assertEqual(catalog.APIS[SCA]['price_cents'], 10000)

    def test_free_demo_on_pasted_csv(self):
        status, payload = call(SCA, 'demo', self.json_body(['A,40,236.80,0', 'B,20,0,0']))
        self.assertEqual(status, 200)
        self.assertFalse(payload['charged'])
        self.assertEqual(payload['report']['status'], 'FAIL')
        self.assertEqual(self.fake.balance[self.user], 25000)

    def test_demo_is_limited_to_ten_employees(self):
        rows = [f'E{i},40,236.80,0' for i in range(11)]
        status, payload = call(SCA, 'demo', self.json_body(rows))
        self.assertEqual(status, 400)
        self.assertIn('up to 10 employees', payload['error']['message'])

    def test_paid_run_debits_exactly_one_run(self):
        status, payload = call(SCA, 'paid', self.json_body(['A,40,236.80,0']), {'Authorization': f'Bearer {self.key}'})
        self.assertEqual(status, 200)
        self.assertTrue(payload['charged'])
        self.assertEqual(payload['priceCents'], 10000)
        self.assertEqual(self.fake.balance[self.user], 15000)
        self.assertEqual([l['delta'] for l in self.fake.ledger], [-10000])

    def test_a_fail_report_is_charged_too(self):
        status, payload = call(SCA, 'paid', self.json_body(['A,40,0,0']), {'Authorization': f'Bearer {self.key}'})
        self.assertEqual((status, payload['report']['status']), (200, 'FAIL'))
        self.assertEqual(self.fake.balance[self.user], 15000)

    def test_not_enough_credit(self):
        key, user = self.fake.add_user(9999)
        status, payload = call(SCA, 'paid', self.json_body(['A,40,236.80,0']), {'Authorization': f'Bearer {key}'})
        self.assertEqual(status, 402)
        self.assertEqual(self.fake.balance[user], 9999)

    def test_csv_body_with_query_parameters(self):
        status, payload = call(SCA, 'paid', csv_body('A,45,0,236.80'), {'Authorization': f'Bearer {self.key}'},
                               path='/api/v1/sca-hw-fringe-checker?eo13706=false&periodWeeks=1')
        self.assertEqual((status, payload['report']['status']), (200, 'PASS'))

    def test_unknown_query_parameter_is_refused_not_ignored(self):
        status, payload = call(SCA, 'paid', csv_body('A,40,0,236.80'), {'Authorization': f'Bearer {self.key}'},
                               path='/api/v1/sca-hw-fringe-checker?eo13706=false&periodweek=2')
        self.assertEqual(status, 400)
        self.assertEqual(self.fake.balance[self.user], 25000)

    def test_route_resolves(self):
        self.assertEqual(handler.resolve_route('/api/v1/sca-hw-fringe-checker'), (SCA, 'paid'))
        self.assertEqual(handler.resolve_route('/api/demo/sca-hw-fringe-checker'), (SCA, 'demo'))


def xlsx(rows, params=None):
    """A minimal workbook with inline strings: an Employees sheet and optionally a Parameters sheet."""
    def sheet(data):
        out = []
        for i, r in enumerate(data, 1):
            cells = ''.join(f'<c r="{chr(65 + j)}{i}" t="inlineStr"><is><t>{v}</t></is></c>' for j, v in enumerate(r))
            out.append(f'<row r="{i}">{cells}</row>')
        return ('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
                + ''.join(out) + '</sheetData></worksheet>')
    sheets = [('Employees', rows)] + ([('Parameters', params)] if params else [])
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        z.writestr('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
                   'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
                   + ''.join(f'<sheet name="{n}" sheetId="{i}" r:id="rId{i}"/>' for i, (n, _) in enumerate(sheets, 1))
                   + '</sheets></workbook>')
        z.writestr('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/'
                   'relationships">' + ''.join(f'<Relationship Id="rId{i}" Target="worksheets/sheet{i}.xml"/>'
                                               for i in range(1, len(sheets) + 1)) + '</Relationships>')
        for i, (_, data) in enumerate(sheets, 1):
            z.writestr(f'xl/worksheets/sheet{i}.xml', sheet(data))
    return buf.getvalue()


class Inputs(unittest.TestCase):
    def test_xlsx_with_parameters_sheet(self):
        body = xlsx([HEAD.split(','), ['A', '45', '0', '236.80'], ['B', '20', '0', '0']],
                    [['eo13706', 'no'], ['periodWeeks', '1']])
        r = runners.run_sca(body)
        self.assertEqual(r['input']['format'], 'xlsx')
        self.assertEqual(r['shortfallLines'], [3])
        self.assertEqual(emp(r, 2)['hoursCounted'], '40.00')

    def test_xlsx_with_query_parameters(self):
        body = xlsx([HEAD.split(','), ['A', '40', '0', '236.80']])
        self.assertEqual(run(body)['status'], 'PASS')

    def test_rows_named_by_line_never_by_value(self):
        r = run(csv_body('EMP-77781,40,0,0'))
        text = json.dumps(r)
        self.assertNotIn('EMP-77781', text)
        self.assertEqual(r['findings'][0]['path'], '/employees/line[2]')

    def test_social_security_numbers_refused(self):
        with self.assertRaises(runners.InputError) as cm:
            run(csv_body('123-45-6789,40,0,0'))
        self.assertNotIn('123-45-6789', str(cm.exception))
        with self.assertRaises(runners.InputError):
            run(csv_body('x,Pat,40,0,0', head='employee_ref,first_name,hours_paid,plan_contributions,cash_in_lieu'))

    def test_one_row_per_employee(self):
        with self.assertRaises(runners.InputError) as cm:
            run(csv_body('A,20,0,0', 'a,20,0,0'))
        self.assertIn('Lines 2 and 3', str(cm.exception))

    def test_bad_numbers_name_the_line_not_the_value(self):
        with self.assertRaises(runners.InputError) as cm:
            run(csv_body('A,forty,0,0'))
        self.assertIn('Line 2', str(cm.exception))
        self.assertNotIn('forty', str(cm.exception))
        with self.assertRaises(runners.InputError):
            run(csv_body('A,-1,0,0'))

    def test_required_columns_and_unknown_columns(self):
        with self.assertRaises(runners.InputError):
            run(csv_body('A,40,0', head='employee_ref,hours_paid,plan_contributions'))
        with self.assertRaises(runners.InputError):
            run(csv_body('A,40,0,0,1', head=HEAD + ',bonus'))

    def test_aliases_and_blank_money_as_zero(self):
        r = run(csv_body('A,40,,236.80', head='employee_id,total_hours_paid,contributions,cil'))
        self.assertEqual(r['status'], 'PASS')

    def test_period_weeks(self):
        r = run(csv_body(f'A,80,0,{money(80 * STD)}'), periodWeeks=2)
        self.assertEqual(r['status'], 'PASS')
        with self.assertRaises(runners.InputError):
            run(csv_body('A,40,0,0'), periodWeeks=0)

    def test_pdf_and_empty_bodies(self):
        for body in (b'%PDF-1.7 x', b'', b'   '):
            with self.assertRaises(runners.InputError):
                runners.run_sca(body, query={'eo13706': 'false'})


class Copy(unittest.TestCase):
    """No em dashes, en dashes or minus signs anywhere a user can read, in the engine or the rates file."""

    def test_no_dashes(self):
        for f in ('validators/sca/engine.py', 'validators/sca/rates.json'):
            text = (ROOT / 'pylib/spreadrun_api' / f).read_text()
            self.assertIsNone(re.search('[–—−]', text), f)


def money(d):
    return str(Decimal(d).quantize(Decimal('0.01')))


if __name__ == '__main__':
    unittest.main()
