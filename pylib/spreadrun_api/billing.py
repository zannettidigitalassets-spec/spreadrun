"""Billing for paid API routes. Every paid route charges through charge_request() and nothing else.

V1 implementation: prepaid credits held in cents, debited atomically in Postgres (charge_request SQL function).
Later payment methods (agent payments, per-request payment proofs) become another branch inside
charge_request() with the same inputs and the same result shape, so routes do not change.
"""
import hashlib
from dataclasses import dataclass

from . import store

KEY_PREFIX = 'sr_'


def hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


@dataclass
class Caller:
    user_id: str
    key_id: str
    balance_cents: int


@dataclass
class ChargeResult:
    ok: bool
    balance_cents: int
    reason: str = ''


def extract_key(headers) -> str | None:
    auth = headers.get('Authorization') or ''
    if auth.lower().startswith('bearer '):
        token = auth[7:].strip()
    else:
        token = (headers.get('X-API-Key') or '').strip()
    if not token.startswith(KEY_PREFIX) or len(token) > 200:
        return None
    return token


def authenticate(raw_key: str) -> Caller | None:
    """Look up an active API key. Returns None for unknown or revoked keys."""
    rows = store.rpc('auth_api_key', {'p_key_hash': hash_key(raw_key)})
    if not rows:
        return None
    row = rows[0] if isinstance(rows, list) else rows
    return Caller(user_id=row['user_id'], key_id=row['key_id'], balance_cents=int(row['balance_cents']))


def charge_request(caller: Caller, *, api: str, price_cents: int, request_id: str,
                   status: str, duration_ms: int, bytes_in: int) -> ChargeResult:
    """Debit one completed run. Idempotent on request_id. Returns ok=False with
    reason 'insufficient_credits' if the balance cannot cover it (the report is then withheld)."""
    res = store.rpc('charge_request', {
        'p_user_id': caller.user_id,
        'p_key_id': caller.key_id,
        'p_api': api,
        'p_price_cents': price_cents,
        'p_request_id': request_id,
        'p_status': status,
        'p_duration_ms': duration_ms,
        'p_bytes_in': bytes_in,
    })
    return ChargeResult(ok=bool(res.get('ok')), balance_cents=int(res.get('balance_cents') or 0),
                        reason=res.get('reason') or '')
