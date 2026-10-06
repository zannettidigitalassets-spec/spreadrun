// Google Ads conversions: the three events fire with the right send_to, value, currency and transaction_id, only
// for the action they measure, and never twice for the same run or Checkout session.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SEND_TO, ADS_TAG, paidRunConversion, creditPackConversion, emailSignupConversion, purchaseFlagKey, keepClickIds } from '../../src/site/ads.js';

function fakeWindow() {
  const calls = [];
  const store = new Map();
  return {
    calls,
    gtag: (...args) => calls.push(args),
    sessionStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) },
  };
}
const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('the base tag is in index.html next to the untouched GA4 tag', () => {
  const html = read('index.html');
  const head = html.slice(0, html.indexOf('</head>'));
  assert.ok(head.includes(`https://www.googletagmanager.com/gtag/js?id=${ADS_TAG}`));
  assert.ok(head.includes(`gtag('config', '${ADS_TAG}');`));
  assert.ok(head.includes("gtag('config', 'G-E3QLT6CZ2M');"));
  assert.equal((head.match(/gtag\('js', new Date\(\)\);/g) || []).length, 1, 'one js timestamp for the page');
  assert.ok(!/[–—]/.test(html));
});

test('A: a charged $1.00 UAD run fires once with its price and requestId', () => {
  const w = fakeWindow();
  const data = { requestId: '7f6c2a1e-0000-4000-8000-000000000001', api: 'uad-36-appraisal-validator', mode: 'paid', charged: true, priceCents: 100, balanceCents: 4900, report: {} };
  assert.equal(paidRunConversion(data, w), true);
  assert.deepEqual(w.calls, [['event', 'conversion', { send_to: SEND_TO.paidRun, value: 1, currency: 'USD', transaction_id: data.requestId }]]);
  assert.equal(SEND_TO.paidRun, 'AW-18496639249/lWXpCImElJIdEJGi8fNE');
});

test('A: values follow the run price (0.25, 1.00, 25.00)', () => {
  for (const [cents, value] of [[25, 0.25], [100, 1], [2500, 25]]) {
    const w = fakeWindow();
    paidRunConversion({ requestId: `r${cents}`, mode: 'paid', charged: true, priceCents: cents }, w);
    assert.equal(w.calls[0][2].value, value);
  }
});

test('A: demo, sample, uncharged and malformed responses fire nothing', () => {
  for (const data of [
    { requestId: 'd1', mode: 'demo', charged: false, report: {} },
    { requestId: 'd2', mode: 'paid', charged: false, priceCents: 100 },
    { mode: 'paid', charged: true, priceCents: 100 },
    { requestId: 'd3', mode: 'paid', charged: true },
    null,
  ]) {
    const w = fakeWindow();
    assert.equal(paidRunConversion(data, w), false);
    assert.equal(w.calls.length, 0);
  }
});

test('B: fires once the webhook has recorded the session, once per session, with the amount paid', () => {
  const w = fakeWindow();
  const sid = 'cs_test_a1B2c3D4e5F6g7H8i9J0';
  assert.equal(creditPackConversion(sid, [], w), 'pending');
  assert.equal(w.calls.length, 0);
  const purchases = [{ pack: 'pack_20', amount_paid_cents: 2000, stripe_session_id: sid }, { pack: 'pack_5', amount_paid_cents: 500, stripe_session_id: 'cs_test_other00000000' }];
  assert.equal(creditPackConversion(sid, purchases, w), 'fired');
  assert.deepEqual(w.calls, [['event', 'conversion', { send_to: SEND_TO.creditPack, value: 20, currency: 'USD', transaction_id: sid }]]);
  assert.equal(w.sessionStorage.getItem(purchaseFlagKey(sid)), '1');
  assert.equal(creditPackConversion(sid, purchases, w), 'already', 'a reload fires nothing new');
  assert.equal(w.calls.length, 1);
});

test('B: no session ID, a forged one, or an unknown session fires nothing', () => {
  const w = fakeWindow();
  for (const sid of ['', null, 'cs_test_<script>', 'pi_123', 'cs_test_doesnotmatchanyrow']) creditPackConversion(sid, [{ amount_paid_cents: 500, stripe_session_id: 'cs_test_realsession0000' }], w);
  assert.equal(w.calls.length, 0);
});

test('C: one conversion per successful signup, no value', () => {
  const w = fakeWindow();
  assert.equal(emailSignupConversion(w), true);
  assert.deepEqual(w.calls, [['event', 'conversion', { send_to: 'AW-18496639249/OEiOCI-E1JIdEJGi8fNE' }]]);
});

test('nothing fires and nothing breaks when gtag is blocked', () => {
  const w = { sessionStorage: fakeWindow().sessionStorage };
  assert.equal(paidRunConversion({ requestId: 'x', mode: 'paid', charged: true, priceCents: 100 }, w), false);
  assert.equal(creditPackConversion('cs_test_a1B2c3D4e5F6g7H8', [], w), 'skip');
  assert.equal(emailSignupConversion(w), false);
});

test('ad click IDs survive URL tidying', () => {
  assert.equal(keepClickIds('/account', '?purchase=success&session_id=cs_test_x&gclid=abc'), '/account?gclid=abc');
  assert.equal(keepClickIds('/account', '?gbraid=g1&wbraid=w1&purchase=cancelled'), '/account?gbraid=g1&wbraid=w1');
  assert.equal(keepClickIds('/account', '?purchase=success'), '/account');
});

test('wiring: each event is called from the one place it belongs', () => {
  const demo = read('src/site/Demo.jsx');
  assert.match(demo, /if \(paid\) paidRunConversion\(data\);/);
  const signup = read('src/site/ToolSignup.jsx');
  const okBranch = signup.slice(signup.indexOf('if (res.ok) {'), signup.indexOf('} else {', signup.indexOf('if (res.ok) {')));
  assert.match(okBranch, /emailSignupConversion\(\);/);
  const account = read('src/pages/Account.jsx');
  assert.match(account, /creditPackConversion\(sessionId, d\?\.purchases\)/);
  assert.ok(!/paidRunConversion|emailSignupConversion/.test(account), 'a per-run debit is not a pack purchase');
  assert.ok(read('api/credits/checkout.js').includes('session_id={CHECKOUT_SESSION_ID}'));
  assert.ok(read('api/account.js').includes('stripe_session_id'));
  for (const p of ['src/site/ads.js', 'src/site/Demo.jsx', 'src/site/ToolSignup.jsx', 'src/pages/Account.jsx']) assert.ok(!/[–—]/.test(read(p)), p);
});
