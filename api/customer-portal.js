import { stripe, supabaseAdmin, requireUser, siteOrigin } from './_lib/clients.js';

// Opens the Stripe Customer Portal for the SIGNED-IN user.
// Launch blocker fix: identity comes from the verified Supabase session, never from the
// request body. The Stripe customer is resolved from that user's own profile row.
export async function POST(request) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('email', user.email)
    .maybeSingle();

  if (error || !profile?.stripe_customer_id) {
    return new Response('No subscription found for this account', { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${siteOrigin(request)}/account`,
  });

  return Response.json({ url: session.url });
}
