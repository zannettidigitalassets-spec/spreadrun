import { stripe, supabaseAdmin, requireUser, priceIdForPlan, PLANS, siteOrigin } from './_lib/clients.js';

// Creates a server-side Stripe Checkout Session for a flat SecondRing subscription.
// Replaces the old hardcoded buy.stripe.com Payment Links.
export async function POST(request) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  const plan = body?.plan;
  if (!PLANS[plan]) return new Response('Unknown plan', { status: 400 });

  const price = priceIdForPlan(plan);
  if (!price) {
    console.error(`Missing price env var for plan ${plan}`);
    return new Response('Billing is not configured', { status: 500 });
  }

  // Reuse the Stripe customer if this user already has one.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('email', user.email)
    .maybeSingle();

  const origin = siteOrigin(request);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    ...(profile?.stripe_customer_id
      ? { customer: profile.stripe_customer_id }
      : { customer_email: user.email }),
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan },
    subscription_data: { metadata: { user_id: user.id, plan } },
    allow_promotion_codes: true,
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/account?checkout=cancelled`,
  });

  return Response.json({ url: session.url });
}
