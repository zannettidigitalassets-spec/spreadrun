// Google Ads conversions (account 234-506-1509, tag AW-18496639249). The base tag is in index.html. Each conversion
// fires from code at the moment the action completes, never on page load, and each is its own funnel step:
//   A. paid validator run: once per charged run, value = that run's price, deduped on the run's requestId
//   B. credit pack purchase: once per Stripe Checkout session, value = amount paid, deduped on the session ID
//   C. email signup: once per successful free-tool signup, no value
// A per-run credit debit is never a credit pack purchase, and a demo or sample run is never a paid run.
// Nothing here sends submitted content, an email address or any other personal data to Google.

export const ADS_TAG = 'AW-18496639249';
export const SEND_TO = {
  paidRun: 'AW-18496639249/lWXpCImElJIdEJGi8fNE',
  creditPack: 'AW-18496639249/iSNECIyElJIdEJGi8fNE',
  emailSignup: 'AW-18496639249/OEiOCI-E1JIdEJGi8fNE',
};

const gtagOf = (w) => (w && typeof w.gtag === 'function' ? w.gtag : null);

// A. Call with the JSON body of a 200 response from /api/v1/<api>. Fires only for a run the server says it charged.
export function paidRunConversion(data, w = globalThis.window) {
  const gtag = gtagOf(w);
  if (!gtag || !data || data.mode !== 'paid' || data.charged !== true) return false;
  if (typeof data.requestId !== 'string' || !data.requestId) return false;
  if (!Number.isInteger(data.priceCents) || data.priceCents <= 0) return false;
  gtag('event', 'conversion', {
    send_to: SEND_TO.paidRun, value: data.priceCents / 100, currency: 'USD', transaction_id: data.requestId,
  });
  return true;
}

// B. Call with the Checkout session ID from the success URL and the purchases list from /api/account. Fires only
// once the webhook has recorded that session as paid (so the payment is confirmed server side), and only once per
// session in this browser tab: a sessionStorage flag stops reload double fires, and Google also dedupes on
// transaction_id.
export const purchaseFlagKey = (sessionId) => `sr_ads_purchase_${sessionId}`;
export const CHECKOUT_SESSION = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

export function creditPackConversion(sessionId, purchases, w = globalThis.window) {
  const gtag = gtagOf(w);
  if (!gtag || !CHECKOUT_SESSION.test(sessionId || '')) return 'skip';
  const row = (purchases || []).find((p) => p.stripe_session_id === sessionId);
  if (!row) return 'pending';
  if (!Number.isInteger(row.amount_paid_cents) || row.amount_paid_cents <= 0) return 'skip';
  try {
    if (w.sessionStorage.getItem(purchaseFlagKey(sessionId))) return 'already';
    w.sessionStorage.setItem(purchaseFlagKey(sessionId), '1');
  } catch { /* storage blocked: Google's transaction_id dedupe still applies */ }
  gtag('event', 'conversion', {
    send_to: SEND_TO.creditPack, value: row.amount_paid_cents / 100, currency: 'USD', transaction_id: sessionId,
  });
  return 'fired';
}

// C. Call once after the signup API accepted the address.
export function emailSignupConversion(w = globalThis.window) {
  const gtag = gtagOf(w);
  if (!gtag) return false;
  gtag('event', 'conversion', { send_to: SEND_TO.emailSignup });
  return true;
}

// Ad click IDs must survive any URL tidying, or attribution is lost.
const CLICK_IDS = ['gclid', 'gbraid', 'wbraid'];
export function keepClickIds(path, search) {
  const from = new URLSearchParams(search || '');
  const kept = new URLSearchParams();
  for (const k of CLICK_IDS) if (from.has(k)) kept.set(k, from.get(k));
  const q = kept.toString();
  return q ? `${path}?${q}` : path;
}
