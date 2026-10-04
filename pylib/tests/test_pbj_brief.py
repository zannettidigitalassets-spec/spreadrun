"""Tests for the PBJ Star & Audit-Risk Brief and the records ZIP returned with paid PBJ runs.

Run from the repo root:  python3.12 -m unittest discover -s pylib/tests -v
"""
import base64
import gzip
import io
import itertools
import json
import re
import sys
import unittest
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pylib'))
sys.path.insert(0, str(Path(__file__).parent))
FIX = Path(__file__).parent / 'fixtures'

from spreadrun_api import handler, runners, store  # noqa: E402
from test_api import FakeStore, call  # noqa: E402

PBJ = 'pbj-staffing-qa'
AS_OF = '2026-10-03'
CENSUS = '&census=1840&weekendCensus=520'
brief = runners.pbj_brief_module()
DASHES = (chr(0x2014), chr(0x2013))   # em dash, en dash


def pdf_text(pdf):
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(pdf))
    return len(reader.pages), ' '.join(' '.join(p.extract_text().split()) for p in reader.pages)


class Paid(unittest.TestCase):
    def setUp(self):
        self.fake = FakeStore()
        self.p = [mock.patch.object(store, 'rpc', self.fake.rpc), mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'test'})]
        for p in self.p:
            p.start()
        self.key, self.user = self.fake.add_user(100000)

    def tearDown(self):
        for p in self.p:
            p.stop()

    def paid(self, body, q=f'/?asOf={AS_OF}'):
        return call(PBJ, 'paid', body, {'Authorization': f'Bearer {self.key}'}, q)

    @staticmethod
    def unpack(out):
        b, z = out['auditBrief'], out['submissionPackage']
        return base64.b64decode(b['base64']), zipfile.ZipFile(io.BytesIO(base64.b64decode(z['base64'])))


class PbjRecordsResponse(Paid):
    def test_paid_run_returns_brief_and_zip_at_the_same_price(self):
        body = (FIX / 'pbj-fail.xml').read_bytes()
        status, out = self.paid(body, f'/?asOf={AS_OF}{CENSUS}')
        self.assertEqual((status, out['priceCents'], out['charged']), (200, 2500, True))
        self.assertEqual(self.fake.balance[self.user], 100000 - 2500)          # one charge, brief and ZIP included
        pdf, z = self.unpack(out)
        self.assertEqual((pdf[:5], len(pdf), out['auditBrief']['contentType']), (b'%PDF-', out['auditBrief']['bytes'], 'application/pdf'))
        pages, text = pdf_text(pdf)
        self.assertEqual(pages, 1)
        self.assertIn('PBJ Star & Audit-Risk Brief', text)
        self.assertIn('estimate, not the CMS rating', text)
        self.assertIn('Estimated: 1 star', text)                                # four or more days without RN hours
        self.assertIn('A PASS is not CMS acceptance', text)
        self.assertIn('not a compliance determination', text)
        self.assertEqual(z.namelist(), ['PBJ-Star-Audit-Risk-Brief.pdf', 'uploaded-pbj-file.xml', 'README.txt'])
        self.assertEqual(out['submissionPackage']['files'], z.namelist())
        self.assertEqual(z.read('uploaded-pbj-file.xml'), body)               # byte for byte
        self.assertEqual(z.read('PBJ-Star-Audit-Risk-Brief.pdf'), pdf)
        readme = z.read('README.txt').decode('ascii')
        for s in ('Run date:', f'Checked as of: {AS_OF}', 'Result: FAIL', out['report']['inputSha256'],
                  'not a filing', 'A PASS is not CMS acceptance', 'The staffing star is an estimate'):
            self.assertIn(s, readme)

    def test_upload_kept_byte_for_byte_for_gzip_and_zip(self):
        xml = (FIX / 'pbj-pass.xml').read_bytes()
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr('a.xml', xml)
            zf.writestr('b.xml', (FIX / 'pbj-fail.xml').read_bytes())
        for body, name in ((gzip.compress(xml), 'uploaded-pbj-file.xml.gz'), (buf.getvalue(), 'uploaded-pbj-upload.zip')):
            status, out = self.paid(body)
            self.assertEqual(status, 200)
            pdf, z = self.unpack(out)
            self.assertEqual(z.read(name), body)
            self.assertEqual(pdf_text(pdf)[0], 1)

    def test_report_unchanged(self):
        body = (FIX / 'pbj-fail.xml').read_bytes()
        _, out = self.paid(body, f'/?asOf={AS_OF}{CENSUS}')
        direct = runners.run_pbj(body, as_of=AS_OF, staffing={'census': '1840', 'weekendCensus': '520'})
        self.assertEqual(out['report'], direct)
        self.assertNotIn('auditBrief', out['report'])

    def test_demo_and_other_apis_get_neither(self):
        status, out = call(PBJ, 'demo', (FIX / 'pbj-fail.xml').read_bytes(), {'X-Forwarded-For': '203.0.113.9'}, f'/?asOf={AS_OF}')
        self.assertEqual((status, out['mode']), (200, 'demo'))
        self.assertNotIn('auditBrief', out)
        self.assertNotIn('submissionPackage', out)
        status, out = call('wh347-payroll-precheck', 'paid', (FIX / 'wh347-pass.xlsx').read_bytes(),
                           {'Authorization': f'Bearer {self.key}'}, '/?form=pdf')
        self.assertEqual(status, 200)
        self.assertNotIn('auditBrief', out)
        self.assertNotIn('submissionPackage', out)

    def test_input_errors_get_nothing_and_are_free(self):
        status, out = self.paid(b'<nursingHomeData>')
        self.assertEqual((status, out['error']['charged']), (400, False))
        self.assertNotIn('auditBrief', out)
        self.assertEqual(self.fake.balance[self.user], 100000)

    def test_failure_keeps_the_report(self):
        with mock.patch.object(runners, 'pbj_records', side_effect=RuntimeError('ZQXMARK')):
            status, out = self.paid((FIX / 'pbj-pass.xml').read_bytes())
        self.assertEqual((status, out['report']['status']), (200, 'PASS'))
        self.assertFalse(out['auditBrief']['available'])
        self.assertFalse(out['submissionPackage']['available'])
        self.assertNotIn('ZQXMARK', json.dumps(out))

    def test_too_large_for_one_response_drops_the_zip_first(self):
        body = (FIX / 'pbj-pass.xml').read_bytes()
        _, full = self.paid(body)
        without_zip = dict(full, submissionPackage={'available': False, 'reason': 'x' * 120})
        limit = len(json.dumps(without_zip, separators=(',', ':'))) + 50
        with mock.patch.object(handler, 'RESPONSE_LIMIT', limit):
            _, out = self.paid(body)
        self.assertTrue(out['auditBrief']['available'])
        self.assertFalse(out['submissionPackage']['available'])
        self.assertIn('too large', out['submissionPackage']['reason'])
        self.assertLessEqual(len(json.dumps(out, separators=(',', ':'))), limit)


class PbjBriefContent(unittest.TestCase):
    def report(self, name='pbj-fail.xml', staffing=None, body=None):
        return runners.run_pbj(body or (FIX / name).read_bytes(), as_of=AS_OF, staffing=staffing)

    def test_top_three_come_from_this_runs_findings(self):
        rep = self.report()
        top, total = brief.top_patterns(rep)
        self.assertEqual(len(top), 3)
        found = set(rep['ruleCounts'])
        for g in top:
            self.assertTrue(set(g['rules']) <= found)
            self.assertEqual(g['count'], sum(rep['ruleCounts'][r] for r in g['rules']))
        errors = [g for g in top if g['severity'] == 'error']
        self.assertEqual(top[:len(errors)], errors)                              # errors before warnings
        self.assertEqual(sum(g['count'] for g in brief.top_patterns(rep, None)[0]), rep['findingCount'])
        self.assertEqual(total, len(brief.top_patterns(rep, None)[0]))

    def test_fewer_than_three_shows_only_what_exists(self):
        r = ET.fromstring((FIX / 'pbj-pass.xml').read_bytes())
        e = next(r.iter('employees')).find('employee/employeeId')
        old = e.text
        e.text = '123-45-6789'
        for s in r.iter('staffHours'):
            if s.findtext('employeeId') == old:
                s.find('employeeId').text = e.text
        rep = self.report(body=ET.tostring(r))
        self.assertEqual(set(rep['ruleCounts']), {'RISK-ID-PII'})
        top, total = brief.top_patterns(rep)
        self.assertEqual((len(top), total, top[0]['title']), (1, 1, brief.PATTERNS['ssn-ids']['title']))
        pages, text = pdf_text(brief.brief_pdf(rep))
        self.assertEqual(pages, 1)
        self.assertIn('1. Employee IDs shaped like Social Security numbers', text)
        self.assertNotIn('2. ', text)
        self.assertIn('This run found 1 pattern in all.', text)

        rep = self.report('pbj-pass.xml')
        self.assertEqual(brief.top_patterns(rep), ([], 0))
        self.assertIn('no patterns to list', pdf_text(brief.brief_pdf(rep))[1])

    def test_star_is_the_engines_estimate_and_always_labelled(self):
        rep = self.report('pbj-pass.xml', {'census': '1840', 'weekendCensus': '520'})
        est = rep['staffingEstimate']
        head = brief.brief_model(rep, brief.dt.date(2026, 10, 4))['star']['headline']
        lo, hi = est['starRange']
        self.assertIn(f'{lo} to {hi}' if lo != hi else f'{lo} star', head)
        text = pdf_text(brief.brief_pdf(rep))[1]
        self.assertIn('Projected staffing star (estimate, not the CMS rating)', text)
        self.assertIn(' '.join(est['label'].split()), text)
        text = pdf_text(brief.brief_pdf(self.report('pbj-pass.xml')))[1]
        self.assertIn('Not estimated for this run', text)
        self.assertNotIn('Estimated:', text)

    def test_every_rule_the_engine_can_report_has_a_pattern(self):
        src = (ROOT / 'pylib/spreadrun_api/validators/pbj/engine.py').read_text()
        rules = {'CMS' + e for e in re.findall(r"edit\('(-\d+)'", src)}
        rules |= set(re.findall(r"'((?:RISK|SR|CMS)-[A-Z0-9-]+)'", src)) | {'XSD'}
        rules |= {'CMS' + e for e in re.findall(r"'(-\d{4})'", src.split('REQUIRED_EDIT = ')[1].split('\n')[0])}
        rules |= {'CMS' + e for e in re.findall(r"'(-\d{4})'\)", src.split('TEXT_RULES = ')[1].split('\n}')[0])}
        self.assertGreater(len(rules), 25)
        self.assertEqual(sorted(rules - set(brief.RULE_PATTERN)), [])

    def test_worst_case_fits_one_page_without_shrinking(self):
        rep = self.report('pbj-fail.xml', {'census': '1840'})
        est = rep['staffingEstimate']
        est['assumptions'] = est['assumptions'] + ['This file is a merge: only the hours in this file are counted, not '
                                                   'hours already submitted to CMS for the quarter.',
                                                   'The quarter is not over yet: hours and census should cover the same days.']
        model = brief.brief_model(rep, brief.dt.date(2026, 10, 4))
        model['more'] = '99,999 more findings under 15 other patterns are in the full report.'
        longest = sorted(brief.PATTERNS.values(), key=lambda p: len(p['why']) + len(p['fix']) + len(p['title']))
        path = 'XML file 20: /nursingHomeData/staffingHours/staffHours[9999]/workDays/workDay[92]/hourEntries/hourEntry[12]/jobTitleCode'
        for combo in itertools.combinations(longest[-6:], 3):
            model['patterns'] = [dict(p, key='x', rules=p['rules'] * 2, count=99999, severity='error',
                                      firstLocation=path) for p in combo]
            self.assertTrue(brief.fits(model, 1.0))

    def test_no_value_from_the_file_in_the_brief_or_readme(self):
        mark = 'ZQXMARK'
        r = ET.fromstring((FIX / 'pbj-fail.xml').read_bytes())
        n = 0
        for e in r.iter():
            if len(e) == 0:
                n += 1
                e.text = f'{mark}{n}'
        body = ET.tostring(r)
        rep = runners.run_pbj(body, as_of=AS_OF)
        pdf, zipped, names = runners.pbj_records(body, rep)
        self.assertNotIn(mark.encode(), pdf)
        self.assertNotIn(mark, pdf_text(pdf)[1])
        z = zipfile.ZipFile(io.BytesIO(zipped))
        self.assertNotIn(mark, z.read('README.txt').decode())
        self.assertEqual(z.read(names[1]), body)                                # the upload, as sent

    def test_wrong_upload_is_refused(self):
        rep = self.report('pbj-pass.xml')
        with self.assertRaises(ValueError):
            brief.package(b'something else', rep, b'%PDF-')


class PbjBriefWording(unittest.TestCase):
    """No em or en dashes anywhere the brief, README, API messages or the page show."""

    def test_no_dashes(self):
        texts = [json.dumps(brief.PATTERNS), brief.FOOTER, handler.PBJ_RECORDS_NOTE,
                 (ROOT / 'pylib/spreadrun_api/validators/pbj/brief.py').read_text(),
                 (ROOT / 'pylib/spreadrun_api/handler.py').read_text(),
                 (ROOT / 'src/site/Demo.jsx').read_text(), (ROOT / 'src/pages/DocsPbj.jsx').read_text(),
                 (ROOT / 'src/pages/PbjApi.jsx').read_text()]
        for name in ('pbj-fail.xml', 'pbj-pass.xml'):
            body = (FIX / name).read_bytes()
            rep = runners.run_pbj(body, as_of=AS_OF, staffing={'census': '1840'})
            pdf, zipped, _ = runners.pbj_records(body, rep)
            texts += [pdf_text(pdf)[1], zipfile.ZipFile(io.BytesIO(zipped)).read('README.txt').decode()]
        for t in texts:
            for d in DASHES:
                self.assertNotIn(d, t)


if __name__ == '__main__':
    unittest.main()
