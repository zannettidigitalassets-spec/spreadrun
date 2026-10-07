"""HTTP glue shared by every Python route in /api.

process() holds the whole request flow and is plain Python so tests can call it without a server.
Paid flow: authenticate key -> check balance -> run validator -> charge_request -> return report.
Input errors are never charged. A report is never returned without a successful charge.
"""
import base64
import hashlib
import json
import re
import os
import sys
import time
import uuid
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlsplit

from . import billing, runners, store
from .catalog import APIS, DEMO_RUNS_PER_DAY

DOCS = 'https://www.spreadrun.com/docs/'


def _err(status, code, message, **extra):
    return status, {'error': {'code': code, 'message': message, **extra}}


def _log(api, mode, outcome, *, request_id, caller=None, status=None, duration_ms=None, bytes_in=None, ip_hash=None):
    """Best effort. Measurement never blocks or fails a request."""
    try:
        store.rpc('log_api_call', {
            'p_request_id': request_id, 'p_api': api, 'p_mode': mode, 'p_outcome': outcome,
            'p_user_id': caller.user_id if caller else None, 'p_key_id': caller.key_id if caller else None,
            'p_status': status, 'p_duration_ms': duration_ms, 'p_bytes_in': bytes_in, 'p_ip_hash': ip_hash,
        })
    except store.StoreUnavailable as exc:
        print(f'[spreadrun] log_api_call skipped: {exc}', file=sys.stderr)


def _client_ip(headers):
    fwd = headers.get('X-Forwarded-For') or ''
    return fwd.split(',')[0].strip() or headers.get('X-Real-IP') or 'unknown'


def _ip_hash(headers):
    salt = os.environ.get('DEMO_IP_SALT', 'spreadrun-demo')
    return hashlib.sha256(f'{salt}:{_client_ip(headers)}'.encode()).hexdigest()


def _run(api, body, query, *, demo):
    if api == 'clinical-trial-table-validator':
        return runners.run_clinical(body)
    if api == 'uad-36-appraisal-validator':
        return runners.run_uad(body, as_of=(query.get('asOf') or [None])[0])
    if api == 'pbj-staffing-qa':
        staffing = {k: (query.get(k) or [None])[0] for k in runners.PBJ_STAFFING_INPUTS}
        return runners.run_pbj(body, as_of=(query.get('asOf') or [None])[0], staffing=staffing)
    if api == 'wh347-payroll-precheck':
        return runners.run_wh347(body)
    if api == 'pecos-enrollment-precheck':
        return runners.run_pecos(body)
    if api == 'cobra-notice-qa':
        return runners.run_cobra(body, demo=demo)
    if api == 'cmmc-self-assessment-validator':
        return runners.run_cmmc(body, demo=demo)
    if api == 'sca-hw-fringe-checker':
        # Every query key except the route's own goes to the engine, which refuses unknown ones (no silent typos).
        params = {k: v[0] for k, v in query.items() if k not in ('channel', 'slug')}
        return runners.run_sca(body, query=params, demo=demo)
    cfg = APIS[api]
    mode = (query.get('mode') or ['sample'])[0]
    raw_max = (query.get('maxRecords') or [str(cfg['default_max_records'])])[0]
    try:
        max_records = int(raw_max)
    except ValueError:
        raise runners.InputError('maxRecords must be an integer.') from None
    if demo:
        max_records = min(max_records, cfg['demo_max_records'])
    filename = (query.get('filename') or [None])[0]
    return runners.run_mrf(body, mode=mode, max_records=max_records, filename=filename)


def _filled_form(api, body, query, report):
    """WH-347 only, paid calls only, on request (?form=pdf): the official form filled from the payroll, for a PASS
    report only. Returned to the caller in this response and nowhere else: not stored, not logged, not cached.
    It sits outside `report`, which never contains values from the input."""
    if api != 'wh347-payroll-precheck' or (query.get('form') or [''])[0] != 'pdf':
        return None
    if report.get('status') != 'PASS':
        return {'available': False, 'reason': 'The completed form is only produced for a PASS report. Fix the findings '
                                              'and run the check again.'}
    try:
        pdf = runners.wh347_pdf(body)
    except Exception as exc:  # noqa: BLE001 - the report still stands; never leak internals or input
        print(f'[spreadrun] wh347 form error: {type(exc).__name__}', file=sys.stderr)
        return {'available': False, 'reason': 'The form could not be produced for this payroll. The report is unaffected.'}
    return {'available': True, 'filename': 'WH-347-filled-unsigned.pdf', 'contentType': 'application/pdf',
            'bytes': len(pdf), 'base64': base64.b64encode(pdf).decode('ascii'),
            'note': 'Filled from your payroll. The Statement of Compliance is not signed or checked: the certifying '
                    'official completes and signs page 2.'}


PBJ_RECORDS_NOTE = ('Included in the report price. Built for this response only: not stored, logged or cached. The '
                    'brief reports what the checks found; it is not a compliance determination, and the staffing star '
                    'is an estimate, not the CMS rating.')


def _pbj_records(api, body, report):
    """PBJ only, paid calls only: the one-page PBJ Star & Audit-Risk Brief and the records ZIP (the brief, the upload
    byte for byte, a README). Outside `report`, which never contains values from the input; the brief does not either,
    the ZIP carries the upload as the caller sent it. Returns (auditBrief, submissionPackage) or (None, None)."""
    if api != 'pbj-staffing-qa':
        return None, None
    try:
        brief, zipped, names = runners.pbj_records(body, report)
    except Exception as exc:  # noqa: BLE001 - the report still stands; never leak internals or input
        print(f'[spreadrun] pbj records error: {type(exc).__name__}', file=sys.stderr)
        down = {'available': False, 'reason': 'The brief and records ZIP could not be produced for this file. The '
                                              'report is unaffected.'}
        return dict(down), dict(down)
    b = {'available': True, 'filename': runners.pbj_brief_module().BRIEF_NAME, 'contentType': 'application/pdf',
         'bytes': len(brief), 'base64': base64.b64encode(brief).decode('ascii'), 'note': PBJ_RECORDS_NOTE}
    z = {'available': True, 'filename': f'SpreadRun-PBJ-records-{report.get("asOf", "")}.zip',
         'contentType': 'application/zip', 'bytes': len(zipped), 'files': names,
         'base64': base64.b64encode(zipped).decode('ascii'),
         'note': 'A records packet, not a filing: the brief, your upload exactly as received, and a README. Upload '
                 'your file to CMS yourself.'}
    return b, z


# Vercel caps a function's response at 4.5 MB. Leave headroom for headers and encoding.
RESPONSE_LIMIT = 4_400_000


def _fit_response(payload):
    """Drop the records ZIP (then the brief) when the response would pass Vercel's limit, saying why."""
    for key, reason in (('submissionPackage', 'Your upload is too large to send back inside this response next to the '
                                              'report. Keep your original file with the brief.'),
                        ('auditBrief', 'The response would be too large to include the brief.')):
        if len(json.dumps(payload, separators=(',', ':'))) <= RESPONSE_LIMIT:
            break
        if payload.get(key, {}).get('available'):
            payload[key] = {'available': False, 'reason': reason}
    return payload


def process(api, mode, headers, read_body, path='/'):
    """Returns (http_status, json_payload). headers: mapping with .get(); read_body(n) -> bytes."""
    request_id = str(uuid.uuid4())
    cfg = APIS[api]
    demo = mode == 'demo'
    query = parse_qs(urlsplit(path).query)
    caller = None
    ip_hash = None

    try:
        length = int(headers.get('Content-Length') or 0)
    except ValueError:
        length = -1
    limit = cfg['demo_max_body_bytes'] if demo else cfg['max_body_bytes']
    if length <= 0:
        return _err(400, 'input_error', 'Send the input as the request body (Content-Length required).', requestId=request_id)
    if length > limit:
        return _err(413, 'payload_too_large', f'Request body is over the {limit:,} byte limit for this endpoint.',
                    limitBytes=limit, requestId=request_id)

    if demo:
        ip_hash = _ip_hash(headers)
        try:
            allowed = store.rpc('demo_allow', {'p_ip_hash': ip_hash, 'p_api': api, 'p_limit': DEMO_RUNS_PER_DAY})
        except store.StoreUnavailable as exc:
            print(f'[spreadrun] demo rate limit unavailable, allowing: {exc}', file=sys.stderr)
            allowed = True
        if allowed is False:
            return _err(429, 'rate_limited', f'The free demo allows {DEMO_RUNS_PER_DAY} runs per day. Create an API key to keep going.',
                        requestId=request_id)
    else:
        if not store.configured():
            return _err(503, 'billing_unavailable', 'Paid calls are temporarily unavailable.', requestId=request_id)
        kind, credential = billing.extract_credential(headers)
        if not kind:
            return _err(401, 'unauthorized', 'Send your API key as "Authorization: Bearer sr_...".', requestId=request_id)
        try:
            caller = billing.authenticate(credential) if kind == 'key' else billing.authenticate_session(credential)
        except store.StoreUnavailable as exc:
            print(f'[spreadrun] auth failed: {exc}', file=sys.stderr)
            return _err(503, 'billing_unavailable', 'Paid calls are temporarily unavailable.', requestId=request_id)
        if caller is None:
            msg = 'Unknown or revoked API key.' if kind == 'key' else 'Your session expired. Sign in again.'
            return _err(401, 'unauthorized', msg, requestId=request_id)
        if caller.balance_cents < cfg['price_cents']:
            _log(api, mode, 'insufficient_credits', request_id=request_id, caller=caller)
            return _err(402, 'insufficient_credits', 'Not enough credits for this call. Buy credits on your account page.',
                        balanceCents=caller.balance_cents, priceCents=cfg['price_cents'], requestId=request_id)

    body = read_body(length)
    started = time.monotonic()
    try:
        report = _run(api, body, query, demo=demo)
    except runners.InputError as exc:
        _log(api, mode, 'input_error', request_id=request_id, caller=caller, bytes_in=len(body), ip_hash=ip_hash)
        return _err(400, 'input_error', str(exc), requestId=request_id, charged=False)
    except runners.RegistryUnavailable as exc:
        # api_calls.outcome accepts five values; a registry outage is logged as internal_error (never charged).
        _log(api, mode, 'internal_error', request_id=request_id, caller=caller, bytes_in=len(body), ip_hash=ip_hash)
        return _err(503, 'registry_unavailable', str(exc), requestId=request_id, charged=False)
    except Exception as exc:  # noqa: BLE001 - never leak internals or input
        print(f'[spreadrun] {api} internal error: {type(exc).__name__}', file=sys.stderr)
        _log(api, mode, 'internal_error', request_id=request_id, caller=caller, bytes_in=len(body), ip_hash=ip_hash)
        return _err(500, 'internal_error', 'The validator failed. You were not charged.', requestId=request_id, charged=False)
    duration_ms = int((time.monotonic() - started) * 1000)

    if demo:
        _log(api, mode, 'completed', request_id=request_id, status=report['status'], duration_ms=duration_ms,
             bytes_in=len(body), ip_hash=ip_hash)
        return 200, {'requestId': request_id, 'api': api, 'mode': 'demo', 'charged': False, 'report': report}

    filled = _filled_form(api, body, query, report)
    audit_brief, records = _pbj_records(api, body, report)

    try:
        result = billing.charge_request(caller, api=api, price_cents=cfg['price_cents'], request_id=request_id,
                                        status=report['status'], duration_ms=duration_ms, bytes_in=len(body))
    except store.StoreUnavailable as exc:
        print(f'[spreadrun] charge failed: {exc}', file=sys.stderr)
        _log(api, mode, 'billing_error', request_id=request_id, caller=caller, bytes_in=len(body))
        return _err(503, 'billing_unavailable', 'Billing failed, so the report was not delivered. You were not charged.',
                    requestId=request_id, charged=False)
    if not result.ok:
        return _err(402, 'insufficient_credits', 'Not enough credits for this call. Buy credits on your account page.',
                    balanceCents=result.balance_cents, priceCents=cfg['price_cents'], requestId=request_id, charged=False)
    payload = {'requestId': request_id, 'api': api, 'mode': 'paid', 'charged': True,
               'priceCents': cfg['price_cents'], 'balanceCents': result.balance_cents, 'report': report}
    if filled is not None:
        payload['filledForm'] = filled
    if audit_brief is not None:
        payload['auditBrief'] = audit_brief
        payload['submissionPackage'] = records
        _fit_response(payload)
    return 200, payload


MODES = {'v1': 'paid', 'demo': 'demo'}

# Demand counters for free tools that test interest in a validator not built yet. POST /api/interest/<topic>.
# One anonymous count per visitor per day: the salted IP hash goes through demo_allow() with api
# "interest:<topic>", so a count is a row in demo_usage. Nothing else is read or stored, and no body is accepted.
INTEREST_TOPICS = {'cpsc-efiling'}


def record_interest(path, headers):
    """Returns (status, payload) for /api/interest/<topic>, or None for any other path."""
    parts = urlsplit(path)
    query = parse_qs(parts.query)
    seg = [p for p in parts.path.split('/') if p]
    if query.get('channel') == ['interest'] and 'slug' in query:
        topic = query['slug'][0]
    elif len(seg) == 3 and seg[0] == 'api' and seg[1] == 'interest':
        topic = seg[2]
    else:
        return None
    if topic not in INTEREST_TOPICS:
        return 404, {'error': {'code': 'not_found', 'message': 'No such counter.'}}
    try:
        first = store.rpc('demo_allow', {'p_ip_hash': _ip_hash(headers), 'p_api': f'interest:{topic}', 'p_limit': 1})
    except store.StoreUnavailable as exc:
        print(f'[spreadrun] interest count skipped: {exc}', file=sys.stderr)
        return 503, {'error': {'code': 'unavailable', 'message': 'The count could not be saved. Try again later.'}}
    return 200, {'counted': first is not False, 'topic': topic}


# Optional email signups from the free tools (POST /api/signup/subscribe and /api/signup/unsubscribe), served by
# this same function. The address goes to the tool_signups table only when the person submits the form with the
# consent box ticked. Responses never repeat the address. Nothing is sent from here.
SIGNUP_SOURCES = {'/tools/davis-bacon-overtime-calculator', '/tools/davis-bacon-fringe-calculator',
                  '/tools/pbj-preflight-checks', '/tools/i9-section2-deadline-calculator',
                  '/tools/uad36-preflight-checklist', '/tools/cpsc-efiling-readiness-checklist',
                  '/tools/davis-bacon-apprentice-checker', '/tools/cobra-deadline-calculator',
                  '/tools/final-paycheck-deadline', '/tools/contractor-vs-employee-check',
                  '/tools/mechanics-lien-deadline-calculator', '/tools/aca-fte-calculator',
                  '/tools/pecos-revalidation-calculator'}
SIGNUP_ACTIONS = {'subscribe', 'unsubscribe'}
SIGNUP_RUNS_PER_DAY = 20
EMAIL = re.compile(r'^[^@\s]{1,64}@[^@\s]+\.[^@\s]+$')


def _signup_action(path):
    parts = urlsplit(path)
    query = parse_qs(parts.query)
    seg = [p for p in parts.path.split('/') if p]
    if query.get('channel') == ['signup'] and 'slug' in query:
        return query['slug'][0]
    if len(seg) == 3 and seg[0] == 'api' and seg[1] == 'signup':
        return seg[2]
    return None


def signup(path, headers, read_body):
    """Returns (status, payload) for /api/signup/<action>, or None for any other path."""
    action = _signup_action(path)
    if action is None:
        return None
    if action not in SIGNUP_ACTIONS:
        return 404, {'error': {'code': 'not_found', 'message': 'No such action.'}}
    try:
        length = int(headers.get('Content-Length') or 0)
    except ValueError:
        length = -1
    if not 0 < length <= 2048:
        return 400, {'error': {'code': 'input_error', 'message': 'Send a small JSON body.'}}
    try:
        data = json.loads(read_body(length).decode('utf-8'))
    except (UnicodeDecodeError, ValueError):
        return 400, {'error': {'code': 'input_error', 'message': 'Send a JSON body.'}}
    email = str(data.get('email') or '').strip().lower() if isinstance(data, dict) else ''
    if len(email) > 254 or not EMAIL.match(email):
        return 400, {'error': {'code': 'input_error', 'message': 'That does not look like an email address.'}}
    if action == 'subscribe':
        if data.get('consent') is not True:
            return 400, {'error': {'code': 'input_error', 'message': 'Tick the box to agree to the emails first.'}}
        if data.get('source') not in SIGNUP_SOURCES:
            return 400, {'error': {'code': 'input_error', 'message': 'Unknown page.'}}
    try:
        if store.rpc('demo_allow', {'p_ip_hash': _ip_hash(headers), 'p_api': 'signup', 'p_limit': SIGNUP_RUNS_PER_DAY}) is False:
            return 429, {'error': {'code': 'rate_limited', 'message': 'Too many tries today. Try again tomorrow.'}}
        if action == 'subscribe':
            store.rpc('tool_signup', {'p_email': email, 'p_source': data['source']})
        else:
            store.rpc('tool_unsubscribe', {'p_email': email})
    except store.StoreUnavailable as exc:
        print(f'[spreadrun] signup {action} failed: {type(exc).__name__}', file=sys.stderr)
        return 503, {'error': {'code': 'unavailable', 'message': 'That did not go through. Try again later.'}}
    return 200, {'ok': True, 'action': action}


def resolve_route(path):
    """Work out (api, mode) for the single dynamic route api/[channel]/[slug].py.

    Vercel may hand the function either the public path (/api/v1/<api>?...) or the
    route destination (/api/[channel]/[slug]?channel=v1&slug=<api>&...). Both are accepted.
    Returns (None, None) when the path names no known API or mode."""
    parts = urlsplit(path)
    query = parse_qs(parts.query)
    seg = [p for p in parts.path.split('/') if p]
    # The route segment is named "channel", not "mode": the MRF API already uses ?mode=sample|preflight.
    if 'channel' in query and 'slug' in query:
        mode_key, slug = query['channel'][0], query['slug'][0]
    elif len(seg) == 3 and seg[0] == 'api':
        mode_key, slug = seg[1], seg[2]
    else:
        return None, None
    if mode_key not in MODES or slug not in APIS:
        return None, None
    return slug, MODES[mode_key]


class _JsonHandler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        raw = json.dumps(payload, separators=(',', ':')).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        if isinstance(payload, dict):
            rid = payload.get('requestId') or payload.get('error', {}).get('requestId')
            if rid:
                self.send_header('X-Request-Id', rid)
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, *args):  # do not log request paths or query values
        pass


class Dispatcher(_JsonHandler):
    """One function for every validator in both modes: /api/v1/<api> and /api/demo/<api>.
    Adding a validator to catalog.py adds no serverless function."""

    def _route(self):
        api, mode = resolve_route(self.path)
        if api is None:
            self._send(404, {'error': {'code': 'not_found', 'message': f'No such API. Catalog: {DOCS}'}})
        return api, mode

    def do_POST(self):
        interest = record_interest(self.path, self.headers)
        if interest is not None:
            self._send(*interest)
            return
        handled = signup(self.path, self.headers, self.rfile.read)
        if handled is not None:
            self._send(*handled)
            return
        api, mode = self._route()
        if api:
            self._send(*process(api, mode, self.headers, self.rfile.read, self.path))

    def do_GET(self):
        api, _ = self._route()
        if api:
            self._send(405, {'error': {'code': 'method_not_allowed', 'message': f'Use POST. Docs: {DOCS}{api}'}})


def make_handler(api, mode):
    """A handler fixed to one API and mode. Used by tests and local tools."""
    class Handler(_JsonHandler):
        def do_POST(self):
            self._send(*process(api, mode, self.headers, self.rfile.read, self.path))

        def do_GET(self):
            self._send(405, {'error': {'code': 'method_not_allowed',
                                       'message': f'Use POST. Docs: {DOCS}{api}'}})

    return Handler
