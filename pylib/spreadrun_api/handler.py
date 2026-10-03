"""HTTP glue shared by every Python route in /api.

process() holds the whole request flow and is plain Python so tests can call it without a server.
Paid flow: authenticate key -> check balance -> run validator -> charge_request -> return report.
Input errors are never charged. A report is never returned without a successful charge.
"""
import hashlib
import json
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
    except Exception as exc:  # noqa: BLE001 - never leak internals or input
        print(f'[spreadrun] {api} internal error: {type(exc).__name__}', file=sys.stderr)
        _log(api, mode, 'internal_error', request_id=request_id, caller=caller, bytes_in=len(body), ip_hash=ip_hash)
        return _err(500, 'internal_error', 'The validator failed. You were not charged.', requestId=request_id, charged=False)
    duration_ms = int((time.monotonic() - started) * 1000)

    if demo:
        _log(api, mode, 'completed', request_id=request_id, status=report['status'], duration_ms=duration_ms,
             bytes_in=len(body), ip_hash=ip_hash)
        return 200, {'requestId': request_id, 'api': api, 'mode': 'demo', 'charged': False, 'report': report}

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
    return 200, {'requestId': request_id, 'api': api, 'mode': 'paid', 'charged': True,
                 'priceCents': cfg['price_cents'], 'balanceCents': result.balance_cents, 'report': report}


MODES = {'v1': 'paid', 'demo': 'demo'}


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
