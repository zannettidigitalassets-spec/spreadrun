"""Minimal Supabase access for the Python routes: PostgREST RPC calls with the service key, stdlib only.

All business logic that touches money lives in SQL functions (supabase/migrations/20261002_storefront.sql)
so it is atomic. This module only calls them.
"""
import json
import os
import urllib.error
import urllib.request

DEFAULT_URL = 'https://deqchbqeajwrwdfwzxuc.supabase.co'


class StoreUnavailable(RuntimeError):
    pass


def configured():
    return bool(os.environ.get('SUPABASE_SERVICE_KEY'))


def rpc(fn, args, timeout=6):
    key = os.environ.get('SUPABASE_SERVICE_KEY')
    if not key:
        raise StoreUnavailable('SUPABASE_SERVICE_KEY is not set')
    base = os.environ.get('SUPABASE_URL', DEFAULT_URL).rstrip('/')
    req = urllib.request.Request(
        f'{base}/rest/v1/rpc/{fn}',
        data=json.dumps(args).encode('utf-8'),
        method='POST',
        headers={
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            raw = res.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read()[:300].decode('utf-8', 'replace')
        raise StoreUnavailable(f'{fn} failed: HTTP {exc.code} {detail}') from None
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise StoreUnavailable(f'{fn} failed: {exc}') from None
    return json.loads(raw) if raw else None


def auth_user(access_token, timeout=6):
    """Verify a Supabase session token. Returns {'id', 'email'} or None if the token is invalid."""
    key = os.environ.get('SUPABASE_SERVICE_KEY')
    if not key:
        raise StoreUnavailable('SUPABASE_SERVICE_KEY is not set')
    base = os.environ.get('SUPABASE_URL', DEFAULT_URL).rstrip('/')
    req = urllib.request.Request(f'{base}/auth/v1/user', method='GET',
                                 headers={'apikey': key, 'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            user = json.loads(res.read() or b'{}')
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403, 404, 422):
            return None
        raise StoreUnavailable(f'auth check failed: HTTP {exc.code}') from None
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise StoreUnavailable(f'auth check failed: {exc}') from None
    if not user.get('id') or not user.get('email'):
        return None
    return {'id': user['id'], 'email': user['email']}
