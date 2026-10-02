import { requireUser, ensureAccount, supabaseAdmin, json, fail, PRICE_PER_CALL_CENTS, PACKS } from './_lib/clients.js';

// GET /api/account  (signed-in user)
// Creates the account on first visit (logged once as a signup), then returns balance, keys and usage.
export async function GET(request) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  try {
    const account = await ensureAccount(user);
    const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

    const [keys, calls, purchases] = await Promise.all([
      supabaseAdmin.from('api_keys')
        .select('id, key_prefix, name, created_at, last_used_at, revoked_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }),
      supabaseAdmin.from('api_calls')
        .select('request_id, api, outcome, report_status, charged_cents, duration_ms, created_at')
        .eq('user_id', user.id).eq('mode', 'paid').gte('created_at', since)
        .order('created_at', { ascending: false }).limit(200),
      supabaseAdmin.from('credit_ledger')
        .select('pack, delta_cents, amount_paid_cents, created_at')
        .eq('user_id', user.id).eq('reason', 'purchase')
        .order('created_at', { ascending: false }).limit(50),
    ]);
    for (const r of [keys, calls, purchases]) if (r.error) throw new Error(r.error.message);

    const byApi = {};
    for (const c of calls.data) {
      const s = (byApi[c.api] ||= { completed: 0, notCharged: 0, chargedCents: 0 });
      if (c.outcome === 'completed') { s.completed += 1; s.chargedCents += c.charged_cents; } else s.notCharged += 1;
    }

    return json({
      email: account.email,
      balanceCents: account.balance_cents,
      callsRemaining: Math.floor(account.balance_cents / PRICE_PER_CALL_CENTS),
      pricePerCallCents: PRICE_PER_CALL_CENTS,
      hasBillingHistory: Boolean(account.stripe_customer_id),
      packs: Object.entries(PACKS).map(([id, p]) => ({ id, ...p })),
      keys: keys.data,
      usage30d: { byApi, recent: calls.data.slice(0, 25) },
      purchases: purchases.data,
    });
  } catch (e) {
    console.error('account error', e.message);
    return fail(500, 'internal_error', 'Could not load your account. Try again.');
  }
}
