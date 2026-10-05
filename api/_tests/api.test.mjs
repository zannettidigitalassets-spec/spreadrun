// Offline tests for the Node API functions. Run: node --test api/_tests/
// Stripe and Supabase are replaced by in-memory fakes (methods patched on the shared clients).
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripe, supabaseAdmin, PACKS } from '../_lib/clients.js';

const USER = { id: '11111111-1111-1111-1111-111111111111', email: 'buyer@example.com' };
const calls = [];
let account;

function reset() {
  calls.length = 0;
  account = { user_id: USER.id, email: USER.email, balance_cents: 0, stripe_customer_id: null };
  supabaseAdmin.auth.getUser = async (jwt) =>
    jwt === 'good-jwt' ? { data: { user: USER }, error: null } : { data: null, error: { message: 'bad' } };
  supabaseAdmin.rpc = async (fn, args) => {
    calls.push([fn, args]);
    if (fn === 'ensure_account') return { data: account, error: null };
    if (fn === 'grant_credits') {
      account.balance_cents += args.p_credit_cents;
      return { data: { granted: true, balance_cents: account.balance_cents }, error: null };
    }
    if (fn === 'create_api_key') return { data: { id: 'k1', prefix: args.p_key_prefix, name: args.p_name }, error: null };
    if (fn === 'storefront_metrics') return { data: { verdict: 'NOT_STARTED' }, error: null };
    if (fn === 'tool_signup_counts') return { data: { '/tools/pbj-preflight-checks': { subscribed: 2, unsubscribed: 1 } }, error: null };
    return { data: null, error: null };
  };
  supabaseAdmin.from = (table) => {
    const q = {
      select: () => q, eq: (col, val) => { q.filters.push([col, val]); return q; },
      maybeSingle: async () => ({ data: table === 'api_accounts' ? account : null, error: null }),
      filters: [],
    };
    calls.push(['from', table, q.filters]);
    return q;
  };
}

const req = (url, { method = 'POST', headers = {}, body } = {}) =>
  new Request(`https://www.spreadrun.com${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });

test('customer-portal: no session -> 401, even with an email in the body (old hole closed)', async () => {
  reset();
  const { POST } = await import('../customer-portal.js');
  let portalCreated = false;
  stripe.billingPortal.sessions.create = async () => { portalCreated = true; return { url: 'https://billing.stripe.com/x' }; };
  account.stripe_customer_id = 'cus_victim';
  const res = await POST(req('/api/customer-portal', { body: { email: 'victim@example.com' } }));
  assert.equal(res.status, 401);
  assert.equal(portalCreated, false);
});

test('customer-portal: forged token -> 401', async () => {
  reset();
  const { POST } = await import('../customer-portal.js');
  const res = await POST(req('/api/customer-portal', { headers: { authorization: 'Bearer forged' }, body: { email: USER.email } }));
  assert.equal(res.status, 401);
});

test('customer-portal: signed in -> portal for the verified user only, body ignored', async () => {
  reset();
  const { POST } = await import('../customer-portal.js');
  account.stripe_customer_id = 'cus_mine';
  let customer;
  stripe.billingPortal.sessions.create = async (p) => { customer = p.customer; return { url: 'https://billing.stripe.com/s' }; };
  const res = await POST(req('/api/customer-portal', { headers: { authorization: 'Bearer good-jwt' }, body: { email: 'someone-else@example.com' } }));
  assert.equal(res.status, 200);
  assert.equal(customer, 'cus_mine');
  const lookup = calls.find((c) => c[0] === 'from' && c[1] === 'api_accounts');
  assert.deepEqual(lookup[2], [['user_id', USER.id]]);
});

test('checkout: server-side price per pack, unknown pack rejected', async () => {
  reset();
  const { POST } = await import('../credits/checkout.js');
  let params;
  stripe.checkout.sessions.create = async (p) => { params = p; return { url: 'https://checkout.stripe.com/c' }; };
  const bad = await POST(req('/api/credits/checkout', { headers: { authorization: 'Bearer good-jwt' }, body: { pack: 'pack_1000' } }));
  assert.equal(bad.status, 400);
  const res = await POST(req('/api/credits/checkout', { headers: { authorization: 'Bearer good-jwt' }, body: { pack: 'pack_20', amount: 1 } }));
  assert.equal(res.status, 200);
  assert.equal(params.mode, 'payment');
  assert.equal(params.line_items[0].price_data.unit_amount, 2000);
  assert.equal(params.metadata.user_id, USER.id);
  assert.equal(params.customer_creation, 'always');
  const big = await POST(req('/api/credits/checkout', { headers: { authorization: 'Bearer good-jwt' }, body: { pack: 'pack_100' } }));
  assert.equal(big.status, 200);
  assert.equal(params.line_items[0].price_data.unit_amount, 10000);
  assert.equal(params.metadata.pack, 'pack_100');
});

test('webhook: paid credit session grants the server-side pack amount and is the only path', async () => {
  reset();
  const { POST } = await import('../stripe-webhook.js');
  const session = (over = {}) => ({
    id: 'cs_test_1', payment_status: 'paid', amount_total: 500, currency: 'usd', customer: 'cus_1',
    customer_details: { email: USER.email }, metadata: { kind: 'spreadrun_credits', user_id: USER.id, pack: 'pack_5' }, ...over,
  });
  const send = async (obj) => {
    stripe.webhooks.constructEvent = () => ({ type: 'checkout.session.completed', data: { object: obj } });
    return POST(new Request('https://x/api/stripe-webhook', { method: 'POST', body: '{}', headers: { 'stripe-signature': 't' } }));
  };

  assert.equal((await send(session())).status, 200);
  const grant = calls.find((c) => c[0] === 'grant_credits');
  assert.equal(grant[1].p_credit_cents, PACKS.pack_5.creditCents);
  assert.equal(account.balance_cents, 500);

  calls.length = 0;
  await send(session({ amount_total: 1 }));                     // tampered amount
  await send(session({ payment_status: 'unpaid' }));            // not paid yet
  await send({ id: 'cs_old', payment_status: 'paid', amount_total: 900, currency: 'usd', payment_link: 'plink_1Tm2nyPstGCqmCay1cCrKVO1', metadata: {} });
  assert.equal(calls.filter((c) => c[0] === 'grant_credits').length, 0);
  assert.equal(calls.filter((c) => c[0] === 'from' && c[1] === 'profiles').length, 0, 'old plink handling removed');
});

test('webhook: bad signature -> 400', async () => {
  reset();
  const { POST } = await import('../stripe-webhook.js');
  stripe.webhooks.constructEvent = () => { throw new Error('No signatures found'); };
  const res = await POST(new Request('https://x/api/stripe-webhook', { method: 'POST', body: '{}' }));
  assert.equal(res.status, 400);
});

test('keys: full key returned once, only its hash stored', async () => {
  reset();
  const { POST } = await import('../keys.js');
  const res = await POST(req('/api/keys', { headers: { authorization: 'Bearer good-jwt' }, body: { name: 'pipeline' } }));
  const out = await res.json();
  assert.equal(res.status, 201);
  assert.match(out.key, /^sr_[A-Za-z0-9_-]{32}$/);
  const args = calls.find((c) => c[0] === 'create_api_key')[1];
  assert.notEqual(args.p_key_hash, out.key);
  assert.equal(args.p_key_hash.length, 64);
  assert.ok(!JSON.stringify(calls).includes(out.key));
});

test('admin metrics: requires the admin token', async () => {
  reset();
  process.env.ADMIN_TOKEN = 'secret-token';
  const { GET } = await import('../admin/metrics.js');
  assert.equal((await GET(req('/api/admin/metrics', { method: 'GET' }))).status, 401);
  assert.equal((await GET(req('/api/admin/metrics', { method: 'GET', headers: { authorization: 'Bearer nope' } }))).status, 401);
  const ok = await GET(req('/api/admin/metrics', { method: 'GET', headers: { authorization: 'Bearer secret-token' } }));
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.deepEqual(body.toolSignupsBySource, { '/tools/pbj-preflight-checks': { subscribed: 2, unsubscribed: 1 } });
  assert.ok(!JSON.stringify(body).includes('@'), 'no addresses in metrics');
});

test('retired endpoints answer 410 from one function', async () => {
  const { POST } = await import('../retired.js');
  const res = await POST(new Request('https://www.spreadrun.com/api/retired', { method: 'POST', body: '{"userId":"x"}' }));
  assert.equal(res.status, 410);
  assert.deepEqual(await res.json(), { error: 'gone', message: 'This feature has been retired.' });
  const vercel = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  for (const src of ['/api/rent-estimate', '/api/early-access']) {
    assert.ok(vercel.rewrites.some((r) => r.source === src && r.destination === '/api/retired'), src);
  }
});
