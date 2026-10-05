"""Tests for the COBRA Notice Content QA.

Run from the repo root:  python3.12 -m unittest discover -s pylib/tests -v
Fixtures are synthetic: an invented plan and administrator, beneficiaries named by status only. No network.
"""
import base64
import copy
import io
import json
import sys
import unittest
import zipfile
from datetime import date
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pylib'))
sys.path.insert(0, str(Path(__file__).parent))
FIX = Path(__file__).parent / 'fixtures'

from spreadrun_api import runners, store  # noqa: E402
from test_api import FakeStore, call  # noqa: E402

COBRA = 'cobra-notice-qa'
engine = runners.cobra_module()


def req(name='cobra-election-clean'):
    return json.loads((FIX / f'{name}.json').read_text())


def run(p):
    return runners.run_cobra(json.dumps(p).encode())


def rules(p):
    return set(run(p)['ruleCounts'])


def without(p, *phrases):
    p = copy.deepcopy(p)
    for ph in phrases:
        assert ph in p['noticeText'], ph
        p['noticeText'] = p['noticeText'].replace(ph, '')
    return p


def docx(text):
    paras = ''.join(f'<w:p><w:r><w:t xml:space="preserve">{line.replace("&", "&amp;").replace("<", "&lt;")}</w:t></w:r></w:p>'
                    for line in text.split('\n'))
    xml = ('<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/'
           f'wordprocessingml/2006/main"><w:body>{paras}</w:body></w:document>')
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        z.writestr('[Content_Types].xml', '<Types/>')
        z.writestr('word/document.xml', xml)
    return buf.getvalue()


def pdf(lines):
    """A minimal one-page PDF with a text layer, built by hand (no PDF writer dependency)."""
    esc = lambda s: s.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')  # noqa: E731
    stream = 'BT /F1 9 Tf 20 780 Td 11 TL ' + ' '.join(f'({esc(l)}) Tj T*' for l in lines) + ' ET'
    objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 5000] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            f'<< /Length {len(stream)} >>\nstream\n{stream}\nendstream',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
    out, offs = b'%PDF-1.4\n', []
    for i, o in enumerate(objs, 1):
        offs.append(len(out))
        out += f'{i} 0 obj\n{o}\nendobj\n'.encode('latin-1')
    xref = len(out)
    out += f'xref\n0 {len(objs) + 1}\n0000000000 65535 f \n'.encode() + b''.join(f'{o:010d} 00000 n \n'.encode() for o in offs)
    out += f'trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
    return out


class Content(unittest.TestCase):
    def test_clean_samples_pass(self):
        r = run(req())
        self.assertEqual(r['status'], 'PASS', r['findings'])
        self.assertEqual(r['contentItems'], {'required': 14, 'found': 14, 'missing': 0})
        self.assertEqual({x['status'] for x in r['readiness']}, {'ready'})
        g = run(req('cobra-general-clean'))
        self.assertEqual(g['status'], 'PASS', g['findings'])
        self.assertEqual(g['contentItems'], {'required': 6, 'found': 6, 'missing': 0})

    def test_each_election_item_is_detected(self):
        p = req()
        cases = {
            'COBRA-E01-PHONE': ('Telephone: (555) 010-0100.', 'at (555) 010-0100'),
            'COBRA-E04-INDEPENDENT': ('Each qualified beneficiary has an independent right to elect continuation coverage. ',),
            'COBRA-E06-REVOKE': ('If you waive coverage now, you may revoke the waiver at any time before the election '
                                 'deadline by sending a written revocation to the COBRA Administrator. Coverage then '
                                 'begins on the date the revocation is received.',),
            'COBRA-E09-SECOND-EVENT': ('A second qualifying event, such as', 'To get the second qualifying event '
                                       'extension, you must notify the COBRA Administrator in writing within 60 days of the '
                                       'second qualifying event. '),
            'COBRA-E11-AMOUNT': (': $612.00 for employee only, $1,224.00 for employee plus spouse, and $1,836.00 for family '
                                 'coverage',),
            'COBRA-E12-GRACE': ('There is a grace period of 30 days after the first day of each month. ',
                                'by the end of the grace period'),
            'COBRA-E13-ADDRESSES': ('Keep the Plan informed of address changes\n', 'To protect your rights, keep the COBRA Administrator informed of any change of address '
                                    'for you, your spouse and your dependents, and keep a copy of any notices you send.',),
            'COBRA-E14-STATEMENT': ('This notice does not fully describe continuation coverage or other rights under the '
                                    'Plan. More complete information is available',),
            'COBRA-MEDICARE': ('What about Medicare?\nIf you are eligible for Medicare, you should generally enroll when you '
                               'first become eligible. If you do not enroll in Medicare and elect COBRA instead, you may '
                               'have to pay a Part B late enrollment penalty and may have a gap in coverage. If you have '
                               'both, Medicare generally pays first.', ' or if a qualified beneficiary becomes entitled to '
                               'Medicare after electing'),
        }
        for rule, phrases in cases.items():
            self.assertIn(rule, rules(without(p, *phrases)), rule)

    def test_item_x_only_for_18_month_notices(self):
        p = without(req(), 'You must also notify the Plan within 30 days if the Social Security Administration later '
                           'determines that the qualified beneficiary is no longer disabled.')
        self.assertIn('COBRA-E10-NO-LONGER', rules(p))
        p['qualifyingEvent']['type'] = 'death'
        r = run(p)
        self.assertNotIn('COBRA-E10-NO-LONGER', r['ruleCounts'])
        self.assertEqual(r['contentItems']['required'], 13)

    def test_general_items(self):
        p = without(req('cobra-general-clean'), 'For a divorce, a legal separation, or a child losing dependent status, '
                                                 'you must notify the Plan Administrator within 60 days after the '
                                                 'qualifying event occurs. Send the notice in writing to the Plan '
                                                 'Administrator at the address below, on the form the Plan provides.',
                    ' or a divorce or legal separation')
        self.assertIn('COBRA-G03-EVENTS', rules(p))


class Deadlines(unittest.TestCase):
    def test_44_days_when_employer_is_administrator(self):
        p = req()
        r = run(p)
        self.assertEqual(r['deadlines']['electionNoticeDue'], '2026-11-13')
        p['noticeDate'] = p['asOf'] = '2026-11-14'
        self.assertIn('COBRA-DEADLINE-LATE', rules(p))
        p['noticeDate'] = p['asOf'] = '2026-11-13'
        self.assertNotIn('COBRA-DEADLINE-LATE', rules(p))

    def test_loss_of_coverage_start(self):
        p = req()
        p['qualifyingEvent'].update({'lossOfCoverageDate': '2026-10-31', 'periodStartsAtLossOfCoverage': True})
        self.assertEqual(run(p)['deadlines']['electionNoticeDue'], '2026-12-14')

    def test_separate_administrator(self):
        p = req()
        p['qualifyingEvent']['employerIsAdministrator'] = False
        r = run(p)
        self.assertIn('COBRA-DEADLINE-UNKNOWN', r['ruleCounts'])
        self.assertEqual(r['deadlines']['employerToAdministratorBy'], '2026-10-30')
        p['qualifyingEvent']['administratorNotifiedDate'] = '2026-10-20'
        r = run(p)
        self.assertEqual(r['deadlines']['electionNoticeDue'], '2026-11-03')
        p['qualifyingEvent']['administratorNotifiedDate'] = '2026-10-31'
        self.assertIn('COBRA-EMPLOYER-LATE', rules(p))

    def test_beneficiary_reported_event(self):
        p = req()
        p['qualifyingEvent'].update({'type': 'divorce', 'administratorNotifiedDate': '2026-09-20'})
        self.assertIn('COBRA-DEADLINE-LATE', rules(p))            # due October 4, sent October 9
        p['qualifyingEvent']['administratorNotifiedDate'] = '2026-09-30'
        self.assertNotIn('COBRA-DEADLINE-LATE', rules(p))

    def test_general_90_days(self):
        p = req('cobra-general-clean')
        self.assertEqual(run(p)['deadlines']['generalNoticeDue'], '2026-11-30')
        p['noticeDate'] = '2026-12-01'
        self.assertIn('COBRA-DEADLINE-LATE', rules(p))
        del p['coverageStartDate']
        self.assertIn('COBRA-DEADLINE-UNKNOWN', rules(p))


class Consistency(unittest.TestCase):
    def test_election_date_minimum(self):
        p = req()
        p['noticeText'] = p['noticeText'].replace('December 8, 2026', 'December 7, 2026')
        self.assertIn('COBRA-CONSIST-ELECTION-DATE', rules(p))
        p['noticeText'] = p['noticeText'].replace('December 7, 2026', '12/31/2026')
        self.assertNotIn('COBRA-CONSIST-ELECTION-DATE', rules(p))
        p = without(req(), 'Your election must be postmarked no later than December 8, 2026. ')
        self.assertIn('COBRA-E05-DATE', rules(p))

    def test_payment_terms(self):
        p = req()
        p['noticeText'] = p['noticeText'].replace('due 45 days after', 'due 30 days after')
        self.assertIn('COBRA-CONSIST-FIRST-PAYMENT', rules(p))
        p = req()
        p['noticeText'] = p['noticeText'].replace('grace period of 30 days', 'grace period of 10 days')
        self.assertIn('COBRA-CONSIST-GRACE', rules(p))
        p = req()
        p['noticeText'] = p['noticeText'].replace('102 percent', '110 percent')
        self.assertIn('COBRA-CONSIST-PREMIUM-PCT', rules(p))

    def test_duration_matches_event(self):
        p = req()
        p['noticeText'] = p['noticeText'].replace('lasts up to 18 months', 'lasts up to 36 months')
        self.assertNotIn('COBRA-CONSIST-DURATION', rules(p))     # 18 months still stated in the disability section
        p['noticeText'] = p['noticeText'].replace('first 18 months', 'first months')
        self.assertIn('COBRA-CONSIST-DURATION', rules(p))
        p = req()
        p['qualifyingEvent']['type'] = 'death'
        p['noticeText'] = p['noticeText'].replace('up to 36 months in total', 'longer')
        self.assertIn('COBRA-CONSIST-DURATION', rules(p))

    def test_coverage_end_date(self):
        p = req()
        p['qualifyingEvent']['lossOfCoverageDate'] = '2026-10-31'
        self.assertIn('COBRA-CONSIST-COVERAGE-END', rules(p))

    def test_errors_sample(self):
        r = run(req('cobra-election-errors'))
        self.assertEqual(r['status'], 'FAIL')
        for rule in ('COBRA-DEADLINE-LATE', 'COBRA-CONSIST-ELECTION-DATE', 'COBRA-CONSIST-FIRST-PAYMENT',
                     'COBRA-CONSIST-GRACE', 'COBRA-CONSIST-DURATION', 'COBRA-CONSIST-PREMIUM-PCT',
                     'COBRA-E04-INDEPENDENT', 'COBRA-E14-STATEMENT'):
            self.assertIn(rule, r['ruleCounts'])


class Files(unittest.TestCase):
    def test_docx(self):
        p = req()
        text = p.pop('noticeText')
        p['noticeFile'] = {'type': 'docx', 'base64': base64.b64encode(docx(text)).decode()}
        r = run(p)
        self.assertEqual((r['status'], r['input']['format']), ('PASS', 'file'), r['findings'])

    def test_pdf(self):
        p = req()
        text = p.pop('noticeText')
        lines = []
        for para in text.split('\n'):
            while len(para) > 110:
                cut = para.rfind(' ', 0, 110)
                lines.append(para[:cut])
                para = para[cut + 1:]
            lines.append(para)
        p['noticeFile'] = {'type': 'pdf', 'base64': base64.b64encode(pdf(lines)).decode()}
        r = run(p)
        self.assertEqual(r['contentItems']['missing'], 0, r['findings'])

    def test_bad_files(self):
        p = req()
        p.pop('noticeText')
        for f in ({'type': 'pdf', 'base64': base64.b64encode(b'not a pdf').decode()},
                  {'type': 'docx', 'base64': base64.b64encode(b'not a zip').decode()},
                  {'type': 'pdf', 'base64': '***'}, {'type': 'rtf', 'base64': ''},
                  {'type': 'pdf', 'base64': base64.b64encode(pdf(['tiny'])).decode()}):
            with self.assertRaises(runners.InputError):
                run({**p, 'noticeFile': f})

    def test_input_errors(self):
        p = req()
        for body in (b'nope', b'[]', json.dumps({**p, 'noticeType': 'initial'}).encode(),
                     json.dumps({**p, 'noticeFile': {}}).encode(),
                     json.dumps({**p, 'noticeText': 'short'}).encode(),
                     json.dumps({**p, 'qualifyingEvent': {**p['qualifyingEvent'], 'type': 'layoff'}}).encode(),
                     json.dumps({**p, 'qualifyingEvent': {**p['qualifyingEvent'], 'employerIsAdministrator': 'yes'}}).encode()):
            with self.assertRaises(runners.InputError, msg=body[:60]):
                runners.run_cobra(body)

    def test_ssn_warning(self):
        p = req()
        p['noticeText'] += '\nEmployee SSN 123-45-6789\n'
        self.assertIn('COBRA-PII-SSN', rules(p))


MARK = 'ZQXMARK'


class CobraNoEcho(unittest.TestCase):
    """Reports and errors never repeat a value from the submission: no text, amounts, names or dates."""

    def _marked(self, name):
        p = req(name)
        t = p['noticeText']
        t = t.replace('Example Manufacturing', f'{MARK} Manufacturing').replace('$612.00', '$61,234.56')
        t = t.replace('Example Benefits Administration', f'{MARK} Administration')
        p['noticeText'] = t + f'\n{MARK} 123-45-6789 {MARK}@example.com\n'
        p['planYear'] = MARK
        return p

    def test_no_marker_in_report(self):
        for name in ('cobra-election-clean', 'cobra-election-errors', 'cobra-general-clean'):
            out = json.dumps(run(self._marked(name)))
            self.assertNotIn(MARK, out)
            self.assertNotIn('61,234', out)
            self.assertNotIn('123-45-6789', out)
            self.assertNotIn('2026-09-30', out, 'the event date itself is not echoed')
            self.assertNotIn('December 8', out)

    def test_file_input_does_not_echo(self):
        p = self._marked('cobra-election-clean')
        p['noticeFile'] = {'type': 'docx', 'base64': base64.b64encode(docx(p.pop('noticeText'))).decode()}
        self.assertNotIn(MARK, json.dumps(run(p)))

    def test_errors_do_not_echo(self):
        p = req()
        for body in (json.dumps({**p, 'noticeType': MARK}).encode(),
                     json.dumps({**p, 'noticeText': MARK}).encode(),
                     json.dumps({**p, 'qualifyingEvent': {'type': MARK}}).encode(),
                     json.dumps({k: v for k, v in {**p, 'noticeFile': {'type': 'pdf', 'base64': base64.b64encode(
                         MARK.encode()).decode()}}.items() if k != 'noticeText'}).encode()):
            with self.assertRaises(runners.InputError) as cm:
                runners.run_cobra(body)
            self.assertNotIn(MARK, str(cm.exception))

    def test_paid_response_and_stored_rows_do_not_echo(self):
        fake = FakeStore()
        key, _ = fake.add_user(5000)
        with mock.patch.object(store, 'rpc', fake.rpc), mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'}):
            status, payload = call(COBRA, 'paid', json.dumps(self._marked('cobra-election-errors')).encode(),
                                   {'Authorization': f'Bearer {key}'})
        self.assertEqual(status, 200, payload)
        self.assertNotIn(MARK, json.dumps(payload))
        self.assertNotIn(MARK, json.dumps([fake.ledger, fake.calls]))


class CobraRoute(unittest.TestCase):
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
        status, payload = call(COBRA, 'paid', json.dumps(req()).encode(), {'Authorization': f'Bearer {self.key}'})
        self.assertEqual(status, 200, payload)
        self.assertEqual((payload['charged'], payload['priceCents'], payload['balanceCents']), (True, 2500, 500))
        self.assertEqual([c['outcome'] for c in self.fake.calls], ['completed'])

    def test_fail_report_is_charged(self):
        status, payload = call(COBRA, 'paid', json.dumps(req('cobra-election-errors')).encode(), {'Authorization': f'Bearer {self.key}'})
        self.assertEqual((status, payload['charged'], payload['report']['status']), (200, True, 'FAIL'))

    def test_input_error_uncharged(self):
        status, _ = call(COBRA, 'paid', b'{"noticeType": "initial"}', {'Authorization': f'Bearer {self.key}'})
        self.assertEqual(status, 400)
        self.assertEqual(self.fake.balance[self.user], 3000)

    def test_short_credit_402(self):
        key, _ = self.fake.add_user(2400)
        status, payload = call(COBRA, 'paid', json.dumps(req()).encode(), {'Authorization': f'Bearer {key}'})
        self.assertEqual((status, payload['error']['priceCents']), (402, 2500))

    def test_demo_free_with_own_data(self):
        p = req()
        p['noticeText'] = p['noticeText'].replace('Example Manufacturing', 'Other Company')
        status, payload = call(COBRA, 'demo', json.dumps(p).encode(), {'X-Forwarded-For': '203.0.113.9'})
        self.assertEqual((status, payload['charged']), (200, False))
        self.assertEqual(self.fake.balance[self.user], 3000)

    def test_demo_size_limit(self):
        p = req()
        p['padding'] = 'x' * (1024 * 1024)
        status, _ = call(COBRA, 'demo', json.dumps(p).encode(), {'X-Forwarded-For': '203.0.113.9'})
        self.assertEqual(status, 413)

    def test_catalog_price(self):
        from spreadrun_api.catalog import APIS
        self.assertEqual(APIS[COBRA]['price_cents'], 2500)


if __name__ == '__main__':
    unittest.main()
