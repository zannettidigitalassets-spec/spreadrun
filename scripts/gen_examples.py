"""Regenerate the request/response examples used by the docs and demo pages.

Runs the real route handlers (pylib/spreadrun_api/handler.py, the same code Vercel serves) over HTTP on
localhost against the sample files in public/samples/. The only stand-in is the credit store, so the paid
example shows a realistic balance without touching Supabase.

Run from the repo root:  python3.12 scripts/gen_examples.py
"""
import json
import sys
import uuid
from http.server import HTTPServer
from pathlib import Path
from threading import Thread
from unittest import mock
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'pylib'))
sys.path.insert(0, str(ROOT / 'pylib' / 'tests'))
from spreadrun_api import handler, store  # noqa: E402
from test_api import FakeStore  # noqa: E402

SAMPLES = ROOT / 'public' / 'samples'
OUT = ROOT / 'src' / 'content' / 'examples'
OUT.mkdir(parents=True, exist_ok=True)

fake = FakeStore()
KEY, _ = fake.add_user(975)
REQ_ID = '7f3c2a1e-5b8d-4c6f-9e0a-1d2b3c4d5e6f'


def serve(api, mode):
    srv = HTTPServer(('127.0.0.1', 0), handler.make_handler(api, mode))
    Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def post(srv, body, headers=None, query=''):
    url = f'http://127.0.0.1:{srv.server_port}/x{query}'
    try:
        res = urlopen(Request(url, data=body, method='POST', headers=headers or {}))
        return res.status, json.loads(res.read())
    except HTTPError as e:
        return e.code, json.loads(e.read())


def stable(payload):
    """Fix the random request id so regenerated files only change when behavior changes."""
    if 'requestId' in payload:
        payload['requestId'] = REQ_ID
    if 'error' in payload and 'requestId' in payload['error']:
        payload['error']['requestId'] = REQ_ID
    return payload


def save(name, status, payload):
    (OUT / f'{name}.json').write_text(json.dumps({'status': status, 'body': stable(payload)}, indent=2) + '\n')
    print(f'{name}: HTTP {status}')


with mock.patch.dict('os.environ', {'SUPABASE_SERVICE_KEY': 'example'}), mock.patch.object(store, 'rpc', fake.rpc):
    auth = {'Authorization': f'Bearer {KEY}'}

    c = 'clinical-trial-table-validator'
    clinical_defects = json.dumps({'studiesCsv': (SAMPLES / 'clinical-studies.csv').read_text(),
                                   'outcomesCsv': (SAMPLES / 'clinical-outcomes.csv').read_text()}).encode()
    clinical_clean = json.dumps({'studiesCsv': (SAMPLES / 'clinical-pass-studies.csv').read_text(),
                                 'outcomesCsv': (SAMPLES / 'clinical-pass-outcomes.csv').read_text()}).encode()
    paid, demo = serve(c, 'paid'), serve(c, 'demo')
    save('clinical-paid-fail', *post(paid, clinical_defects, {**auth, 'Content-Type': 'application/json'}))
    save('clinical-demo-pass', *post(demo, clinical_clean, {'Content-Type': 'application/json'}))
    save('clinical-input-error', *post(paid, b'{"studiesCsv": "trial_id\\nNCT90000001\\n", "outcomesCsv": "x"}', auth))
    save('error-unauthorized', *post(paid, clinical_clean, {'Authorization': 'Bearer sr_revoked_or_unknown'}))
    poor, _ = fake.add_user(10)
    save('error-insufficient-credits', *post(paid, clinical_clean, {'Authorization': f'Bearer {poor}'}))

    m = 'hospital-mrf-validator'
    paid, demo = serve(m, 'paid'), serve(m, 'demo')
    save('mrf-paid-pass', *post(paid, (SAMPLES / 'mrf-valid-tall.csv').read_bytes(), {**auth, 'Content-Type': 'text/csv'},
                                '?maxRecords=500'))
    save('mrf-demo-fail', *post(demo, (SAMPLES / 'mrf-defective.json').read_bytes(), {'Content-Type': 'application/json'}))
    save('mrf-input-error', *post(paid, (SAMPLES / 'mrf-valid.json').read_bytes(), auth, '?maxRecords=5000'))

    u = 'uad-36-appraisal-validator'
    paid, demo = serve(u, 'paid'), serve(u, 'demo')
    as_of = '?asOf=2019-09-20'  # the synthetic files are dated 2019; see scripts/uad/make_fixtures.py
    save('uad-paid-pass', *post(paid, (SAMPLES / 'uad-pass.xml').read_bytes(), {**auth, 'Content-Type': 'application/xml'}, as_of))
    save('uad-demo-fail', *post(demo, (SAMPLES / 'uad-fail.xml').read_bytes(), {'Content-Type': 'application/xml'}, as_of))
    save('uad-input-error', *post(paid, b'<?xml version="1.0"?><VALUATION_RESPONSE/>', {**auth, 'Content-Type': 'application/xml'}))

    b = 'pbj-staffing-qa'
    paid, demo = serve(b, 'paid'), serve(b, 'demo')
    as_of = '?asOf=2026-10-03'  # the synthetic files cover July 1 to September 30, 2026; see scripts/pbj/make_fixtures.py
    rich, _ = fake.add_user(10000)   # $100 of credit: covers $25 professional-tier runs
    rich_auth = {'Authorization': f'Bearer {rich}'}
    save('pbj-paid-pass', *post(paid, (SAMPLES / 'pbj-pass.xml').read_bytes(), {**rich_auth, 'Content-Type': 'application/xml'}, as_of))
    save('pbj-demo-fail', *post(demo, (SAMPLES / 'pbj-fail.xml').read_bytes(), {'Content-Type': 'application/xml'}, as_of))
    save('pbj-input-error', *post(paid, b'<?xml version="1.0"?><nursingHomeData><header fileSpecVersion="4.10.0">', {**rich_auth, 'Content-Type': 'application/xml'}))

    w = 'wh347-payroll-precheck'
    paid, demo = serve(w, 'paid'), serve(w, 'demo')
    xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    rich, _ = fake.add_user(10000)   # $100 of credit: covers $25 professional-tier runs
    rich_auth = {'Authorization': f'Bearer {rich}'}
    save('wh347-paid-pass', *post(paid, (SAMPLES / 'wh347-pass.json').read_bytes(), {**rich_auth, 'Content-Type': 'application/json'}))
    save('wh347-demo-fail', *post(demo, (SAMPLES / 'wh347-fail.xlsx').read_bytes(), {'Content-Type': xlsx}))
    save('wh347-input-error', *post(paid, b'{"header": {}, "payrollCsv": "entry_no,last_name\\n1,x\\n"}', {**rich_auth, 'Content-Type': 'application/json'}))
