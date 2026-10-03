"""Tests for the Davis-Bacon WH-347 certified payroll pre-check.

Run from the repo root:  python3.12 -m unittest discover -s pylib/tests -v
Fixtures are synthetic (scripts/wh347/make_fixtures.py): a fictional contractor, invented workers and invented rates.
"""
import csv
import io
import json
import sys
import unittest
import zipfile
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pylib'))
sys.path.insert(0, str(Path(__file__).parent))
FIX = Path(__file__).parent / 'fixtures'

from spreadrun_api import handler, runners, store  # noqa: E402
from test_api import FakeStore, call  # noqa: E402

WH = 'wh347-payroll-precheck'
engine = runners.wh347_module()


def payload():
    return json.loads((FIX / 'wh347-pass.json').read_text())


def rows_of(text):
    r = list(csv.DictReader(io.StringIO(text)))
    return r, list(r[0].keys())


def to_csv(rows, cols):
    buf = io.StringIO()
    w = csv.DictWriter(buf, cols, lineterminator='\n')
    w.writeheader()
    w.writerows(rows)
    return buf.getvalue()


def with_rows(p, fn, table='payrollCsv'):
    rows, cols = rows_of(p[table])
    fn(rows)
    p[table] = to_csv(rows, cols)
    return p


def run(p):
    return runners.run_wh347(json.dumps(p).encode() if isinstance(p, dict) else p)


def rules(p):
    return set(run(p)['ruleCounts'])


class Wh347Reports(unittest.TestCase):
    def test_pass_json_and_xlsx(self):
        for n in ('wh347-pass.json', 'wh347-pass.xlsx'):
            r = run((FIX / n).read_bytes())
            self.assertEqual((r['status'], r['findingCount']), ('PASS', 0), n)
            self.assertEqual(r['counts']['workers'], 4)
            self.assertEqual(r['weekEnding'], '2026-09-26')

    def test_fail_json_and_xlsx_agree(self):
        a, b = run((FIX / 'wh347-fail.json').read_bytes()), run((FIX / 'wh347-fail.xlsx').read_bytes())
        self.assertEqual(a['status'], 'FAIL')
        self.assertEqual(a['findings'], b['findings'])
        self.assertEqual((a['input']['format'], b['input']['format']), ('json', 'xlsx'))

    def test_findings_have_only_known_keys(self):
        r = run((FIX / 'wh347-fail.json').read_bytes())
        for f in r['findings']:
            self.assertLessEqual(set(f), {'severity', 'ruleId', 'path', 'message', 'source'})
            self.assertTrue(f['path'].startswith(('/payroll', '/header', '/wageDetermination', '/apprenticeship')))
        self.assertIn('not legal or compliance advice', r['scope'])


class Wh347Rules(unittest.TestCase):
    def test_header_required_and_formats(self):
        p = payload()
        del p['header']['wage_determination_no']
        p['header']['week_ending'] = 'last friday'
        p['header']['payroll_no'] = '0'
        r = run(p)
        self.assertEqual(r['ruleCounts'], {'WH-HEADER-FORMAT': 2, 'WH-HEADER-REQUIRED': 1})

    def test_rate_below_wd(self):
        p = with_rows(payload(), lambda rs: rs[2].update(st_rate='31.19', gross_project='1798.40'))
        self.assertIn('WH-RATE-BASE', rules(p))

    def test_cash_can_cover_fringe_but_not_base(self):
        # Paying base + fringe as one cash rate (no 6B, no 6C) meets both obligations.
        def f(rs):
            rs[2].update(st_rate='45.30', cash_in_lieu='0', cash_in_lieu_hourly='', gross_project='1812.00')
        self.assertEqual(rules(with_rows(payload(), f)) - {'WH-NET-PAY', 'WH-GROSS-ALL-WORK'}, set())
        # Extra fringe credit cannot make up a basic rate below the wage determination.
        def g(rs):
            rs[2].update(st_rate='30.00', cash_in_lieu_hourly='20.00', cash_in_lieu='800.00', gross_project='2000.00')
        self.assertIn('WH-RATE-BASE', rules(with_rows(payload(), g)))

    def test_overtime_rates(self):
        self.assertIn('WH-RATE-OT-BASE', rules(with_rows(payload(), lambda rs: rs[0].update(ot_rate='57.74'))))
        # 1.5 x the WD base but below 1.5 x the rate paid: a warning, not an error (29 CFR 5.32(c)).
        r = run(with_rows(payload(), lambda rs: rs[0].update(ot_rate='57.75', gross_project='1791.00')))
        self.assertEqual(r['ruleCounts'].get('WH-RATE-OT-PAID'), 1)
        self.assertNotIn('WH-RATE-OT-BASE', r['ruleCounts'])

    def test_overtime_hours_and_cwhssa_switch(self):
        def f(rs):
            rs[0].update(st_6='4', ot_6='', ot_rate='', total_hours='44')
        p = with_rows(payload(), f)
        self.assertIn('WH-OT-HOURS', rules(p))
        p['cwhssa'] = False
        self.assertNotIn('WH-OT-HOURS', rules(p))
        self.assertEqual(run(p)['overtimeRule'], 'not-applied')

    def test_fringe_short_and_credit_math(self):
        # 17.00 an hour: 1.25 short for 44 hours, more than the 0.50 an hour paid above the basic rate covers.
        self.assertIn('WH-FRINGE-SHORT', rules(with_rows(payload(), lambda rs: rs[0].update(
            fringe_credit_hourly='17.00', fringe_credit='748.00'))))
        # 18.00 an hour is covered by the cash wage above the basic rate (29 CFR 5.31(b)(3)).
        self.assertNotIn('WH-FRINGE-SHORT', rules(with_rows(payload(), lambda rs: rs[0].update(
            fringe_credit_hourly='18.00', fringe_credit='792.00'))))
        self.assertIn('WH-FRINGE-CREDIT-MATH', rules(with_rows(payload(), lambda rs: rs[0].update(fringe_credit='800.00'))))
        self.assertIn('WH-CASH-LIEU-MATH', rules(with_rows(payload(), lambda rs: rs[2].update(cash_in_lieu='560.00'))))

    def test_hours_arithmetic(self):
        self.assertIn('WH-HOURS-TOTAL', rules(with_rows(payload(), lambda rs: rs[0].update(total_hours='45'))))
        self.assertIn('WH-HOURS-DAY', rules(with_rows(payload(), lambda rs: rs[0].update(st_1='20', ot_1='5'))))

    def test_gross_deductions_net(self):
        self.assertIn('WH-GROSS-SHORT', rules(with_rows(payload(), lambda rs: rs[0].update(gross_project='1000.00'))))
        self.assertIn('WH-DEDUCTIONS-TOTAL', rules(with_rows(payload(), lambda rs: rs[0].update(fica='1.00'))))
        self.assertIn('WH-NET-PAY', rules(with_rows(payload(), lambda rs: rs[0].update(net_pay='1.00'))))
        self.assertIn('WH-GROSS-ALL-WORK', rules(with_rows(payload(), lambda rs: rs[0].update(gross_all_work='10.00'))))

    def test_weekly_fields_once_per_worker(self):
        def f(rs):
            rs[4].update(net_pay='5.00')
        self.assertIn('WH-ENTRY-CONSISTENCY', rules(with_rows(payload(), f)))
        def g(rs):
            rs[3].update(net_pay='')
        self.assertIn('WH-REQUIRED', rules(with_rows(payload(), g)))

    def test_classification_identity_and_ssn(self):
        self.assertIn('WH-WD-CLASSIFICATION', rules(with_rows(payload(), lambda rs: rs[0].update(classification='Plumber'))))
        # Classification matching ignores case and spacing.
        self.assertEqual(rules(with_rows(payload(), lambda rs: rs[0].update(classification='  ELECTRICIAN '))), set())
        self.assertIn('WH-ID-FULL-SSN', rules(with_rows(payload(), lambda rs: rs[0].update(worker_id='123456789'))))
        self.assertIn('WH-ENTRY-CONSISTENCY', rules(with_rows(payload(), lambda rs: rs[4].update(worker_id='0000'))))
        self.assertIn('WH-WORKER-TYPE', rules(with_rows(payload(), lambda rs: rs[0].update(worker_type='T'))))

    def test_apprentices(self):
        self.assertIn('WH-APPR-RATE', rules(with_rows(payload(), lambda rs: rs[1].update(st_rate='23.09'))))
        self.assertIn('WH-APPR-LEVEL', rules(with_rows(payload(), lambda rs: rs[1].update(apprentice_level=''))))
        self.assertIn('WH-APPR-PROGRAM', rules(with_rows(payload(), lambda rs: rs[1].update(apprentice_level='9'))))
        # Program silent on fringe: the full wage determination fringe is owed.
        p = with_rows(payload(), lambda rs: rs[1].update(fringe_credit_hourly='10.95', fringe_credit='438.00'))
        self.assertIn('WH-FRINGE-SHORT', rules(p))
        # Program fringe at 60 percent: 10.95 an hour is enough.
        p = with_rows(p, lambda rs: rs[0].update(fringe_percent='60'), 'apprenticeshipCsv')
        self.assertNotIn('WH-FRINGE-SHORT', rules(p))
        # Ratio 1:1 with no journeyworker on Friday.
        p = with_rows(payload(), lambda rs: rs[0].update(st_5='', total_hours='36', fringe_credit='657.00',
                                                        gross_project='1638.00'))
        self.assertIn('WH-APPR-RATIO', rules(p))

    def test_missing_columns_and_bad_numbers(self):
        p = payload()
        p['payrollCsv'] = p['payrollCsv'].replace('net_pay', 'take_home')
        self.assertEqual(run(p)['ruleCounts'], {'WH-COLUMN-MISSING': 1})
        self.assertIn('WH-FORMAT', rules(with_rows(payload(), lambda rs: rs[0].update(st_rate='abc'))))
        self.assertIn('WH-FORMAT', rules(with_rows(payload(), lambda rs: rs[0].update(fica='-1'))))
        p = payload()
        p['wageDeterminationCsv'] += 'Electrician,40.00,1.00\n'
        self.assertIn('WH-WD-DUPLICATE', rules(p))

    def test_money_formats(self):
        def f(rs):
            rs[0].update(gross_all_work='$' + format(float(rs[0]['gross_all_work']), ',.2f'))
        self.assertEqual(rules(with_rows(payload(), f)), set())


class Wh347Xlsx(unittest.TestCase):
    def sheet(self, xml_rows):
        return ('<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/'
                'spreadsheetml/2006/main"><sheetData>' + xml_rows + '</sheetData></worksheet>')

    def workbook(self, sheets, date1904=False, extra=None):
        ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
        rns = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w') as z:
            z.writestr('xl/workbook.xml', f'<workbook xmlns="{ns}" xmlns:r="{rns}">'
                       + (f'<workbookPr date1904="1"/>' if date1904 else '') + '<sheets>'
                       + ''.join(f'<sheet name="{n}" sheetId="{i}" r:id="rId{i}"/>' for i, n in enumerate(sheets, 1))
                       + '</sheets></workbook>')
            z.writestr('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/'
                       '2006/relationships">' + ''.join(f'<Relationship Id="rId{i}" Target="worksheets/s{i}.xml"/>'
                                                        for i in range(1, len(sheets) + 1)) + '</Relationships>')
            for i, rows in enumerate(sheets.values(), 1):
                z.writestr(f'xl/worksheets/s{i}.xml', self.sheet(rows))
            for k, v in (extra or {}).items():
                z.writestr(k, v)
        return buf.getvalue()

    def cells(self, rows):
        out = ''
        for i, r in enumerate(rows, 1):
            out += f'<row r="{i}">'
            for j, v in enumerate(r):
                ref = chr(65 + j) + str(i)
                if isinstance(v, (int, float)):
                    out += f'<c r="{ref}"><v>{v}</v></c>'
                else:
                    out += f'<c r="{ref}" t="inlineStr"><is><t>{v}</t></is></c>'
            out += '</row>'
        return out

    def test_inline_strings_and_serial_dates(self):
        p = payload()
        header = [['field', 'value']] + [[k, v] for k, v in p['header'].items() if k != 'week_ending']
        pay, pc = rows_of(p['payrollCsv'])
        wd, wc = rows_of(p['wageDeterminationCsv'])
        ap, ac = rows_of(p['apprenticeshipCsv'])
        for serial, d1904 in ((46291, False), (44829, True)):     # 2026-09-26 in each date system
            book = self.workbook({'Header': self.cells(header + [['week_ending', serial]]),
                                  'Payroll': self.cells([pc] + [[r[c] for c in pc] for r in pay]),
                                  'Wage Determination': self.cells([wc] + [[r[c] for c in wc] for r in wd]),
                                  'Apprenticeship': self.cells([ac] + [[r[c] for c in ac] for r in ap])}, date1904=d1904)
            r = run(book)
            self.assertEqual((r['status'], r['weekEnding']), ('PASS', '2026-09-26'))

    def test_workbook_input_errors(self):
        cases = [
            (self.workbook({'Header': '', 'Payroll': ''}), 'Wage Determination'),
            (self.workbook({'Header': '', 'Payroll': '', 'Wage Determination': ''},
                           extra={'xl/sharedStrings.xml': '<!DOCTYPE x [<!ENTITY a "b">]><sst/>'}), 'DOCTYPE'),
        ]
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w') as z:
            z.writestr('readme.txt', 'x')
        cases.append((buf.getvalue(), 'not an .xlsx'))
        cases.append((b'PK\x03\x04garbage', 'cannot be opened'))
        for body, text in cases:
            with self.assertRaises(runners.InputError) as cm:
                run(body)
            self.assertIn(text, str(cm.exception))


class Wh347InputErrors(unittest.TestCase):
    def test_rejected(self):
        p = payload()
        ragged = dict(p, payrollCsv=p['payrollCsv'].replace('\n2,', '\n2,extra,cells,', 1) + 'x,' * 60 + '\n')
        for body in (b'', b'   ', b'%PDF-1.7', b'not json', b'[1,2]', json.dumps({'payrollCsv': 'a'}).encode(),
                     json.dumps(dict(p, payrollCsv='')).encode(), json.dumps(dict(p, header='x')).encode(),
                     json.dumps(dict(p, payrollCsv='a,a\n1,2\n')).encode(), json.dumps(ragged).encode(),
                     json.dumps(dict(p, payrollCsv='a\n' + '1\n' * 5001)).encode()):
            with self.assertRaises(runners.InputError):
                run(body)


class Wh347NoValueEcho(unittest.TestCase):
    """Reports never repeat a value from the input: names, IDs, classifications, amounts, header text."""
    MARK = 'ZQXMARK'

    def test_every_cell_a_marker(self):
        p = payload()
        p['header'] = {k: f'{self.MARK}h{i}' for i, k in enumerate(p['header'])}
        for t in ('payrollCsv', 'wageDeterminationCsv', 'apprenticeshipCsv'):
            rows, cols = rows_of(p[t])
            for i, r in enumerate(rows):
                for c in cols:
                    r[c] = f'{self.MARK}{t[0]}{i}{c}'
            p[t] = to_csv(rows, cols)
        r = run(p)
        self.assertEqual(r['status'], 'FAIL')
        self.assertGreater(r['findingCount'], 50)
        self.assertNotIn(self.MARK, json.dumps(r))

    def test_markers_in_text_fields_that_still_validate(self):
        # Names, IDs and classification names carry markers and still match each other: the report must not echo them.
        p = payload()
        def f(rs):
            for r in rs:
                r['last_name'] = self.MARK + r['last_name']
                r['first_name'] = self.MARK
                r['worker_id'] = self.MARK + r['worker_id']
                r['classification'] = self.MARK + r['classification']
        p = with_rows(p, f)
        p = with_rows(p, lambda rs: [r.update(classification=self.MARK + r['classification']) for r in rs],
                      'wageDeterminationCsv')
        p = with_rows(p, lambda rs: [r.update(classification=self.MARK + r['classification']) for r in rs],
                      'apprenticeshipCsv')
        p['header']['project_name'] = self.MARK
        r = run(p)
        self.assertEqual(r['status'], 'PASS')
        self.assertNotIn(self.MARK, json.dumps(r))
        bad = with_rows(p, lambda rs: rs[0].update(st_rate='1.00', classification=self.MARK + 'Nowhere'))
        r = run(bad)
        self.assertEqual(r['status'], 'FAIL')
        self.assertNotIn(self.MARK, json.dumps(r))

    def test_errors_do_not_echo(self):
        p = payload()
        bodies = [f'{{"{self.MARK}": 1}}'.encode(), self.MARK.encode(),
                  json.dumps(dict(p, payrollCsv=f'{self.MARK},{self.MARK}\n1,2\n')).encode()]
        for body in bodies:
            with self.assertRaises(runners.InputError) as cm:
                run(body)
            self.assertNotIn(self.MARK, str(cm.exception))

    def test_nothing_stored_holds_a_value(self):
        fake = FakeStore()
        p = with_rows(payload(), lambda rs: [r.update(last_name=self.MARK, worker_id=self.MARK + '1') for r in rs])
        with mock.patch.object(store, 'rpc', fake.rpc), mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'}):
            key, _ = fake.add_user(500)
            status, out = call(WH, 'paid', json.dumps(p).encode(), {'Authorization': f'Bearer {key}'})
            self.assertEqual((status, out['charged']), (200, True))
            status, err = call(WH, 'paid', f'{{"x": "{self.MARK}"}}'.encode(), {'Authorization': f'Bearer {key}'})
            self.assertEqual(status, 400)
        self.assertNotIn(self.MARK, json.dumps([out, err, fake.ledger, fake.calls, fake.demo], default=str))


class Wh347Billing(unittest.TestCase):
    def setUp(self):
        self.fake = FakeStore()
        self.p = [mock.patch.object(store, 'rpc', self.fake.rpc), mock.patch.object(store, 'auth_user', self.fake.auth_user),
                  mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'})]
        for p in self.p:
            p.start()

    def tearDown(self):
        for p in self.p:
            p.stop()

    def test_completed_report_costs_one_dollar(self):
        key, user = self.fake.add_user(150)
        status, out = call(WH, 'paid', (FIX / 'wh347-fail.xlsx').read_bytes(), {'Authorization': f'Bearer {key}'})
        self.assertEqual((status, out['report']['status'], out['priceCents'], self.fake.balance[user]), (200, 'FAIL', 100, 50))

    def test_session_pays_and_low_balance_is_402(self):
        jwt, user = self.fake.add_session(100)
        status, _ = call(WH, 'paid', (FIX / 'wh347-pass.json').read_bytes(), {'Authorization': f'Bearer {jwt}'})
        self.assertEqual((status, self.fake.balance[user]), (200, 0))
        status, _ = call(WH, 'paid', (FIX / 'wh347-pass.json').read_bytes(), {'Authorization': f'Bearer {jwt}'})
        self.assertEqual(status, 402)

    def test_invalid_input_is_free_and_demo_is_capped(self):
        key, user = self.fake.add_user(500)
        status, out = call(WH, 'paid', b'not a payroll', {'Authorization': f'Bearer {key}'})
        self.assertEqual((status, out['error']['charged'], self.fake.balance[user]), (400, False, 500))
        status, out = call(WH, 'demo', (FIX / 'wh347-pass.xlsx').read_bytes(), {'X-Forwarded-For': '203.0.113.9'})
        self.assertEqual((status, out['charged'], out['report']['status']), (200, False, 'PASS'))
        status, _ = call(WH, 'demo', b'{' + b' ' * (512 * 1024) + b'}', {'X-Forwarded-For': '203.0.113.9'})
        self.assertEqual(status, 413)

    def test_route(self):
        self.assertEqual(handler.resolve_route(f'/api/v1/{WH}'), (WH, 'paid'))
        self.assertEqual(handler.resolve_route(f'/api/demo/{WH}'), (WH, 'demo'))


if __name__ == '__main__':
    unittest.main()
