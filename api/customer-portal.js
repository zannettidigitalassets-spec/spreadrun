import { stripe, supabaseAdmin, requireUser, siteOrigin, json, fail } from './_lib/clients.js';

// POST /api/customer-portal  (signed-in user)
// Opens the Stripe billing portal (receipts, saved card) for the SIGNED-IN user only.
// Security fix: identity comes from the verified Supabase session. Anything in the request body,
// including an "email" field, is ignored. The old version trusted {email} from the body.
export async function POST(request) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  const { data: account, error } = await supabaseAdmin
    .from('api_accounts')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !account?.stripe_customer_id) {
    return fail(404, 'no_billing_history', 'No purchases on this account yet.');
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: `${siteOrigin(request)}/account`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error('portal error', e.message);
    return fail(503, 'portal_unavailable', 'The billing portal is not available right now.');
  }
}
