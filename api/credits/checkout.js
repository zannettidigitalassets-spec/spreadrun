import { stripe, requireUser, ensureAccount, siteOrigin, json, fail, PACKS } from '../_lib/clients.js';

// POST /api/credits/checkout  { pack: "pack_5" | "pack_20" | "pack_50" }
// One-time Stripe Checkout payment for a prepaid credit pack. Credits are granted by the webhook,
// only after Stripe confirms payment. Price and credit amount come from PACKS, never the browser.
export async function POST(request) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;
  const body = await request.json().catch(() => ({}));
  const pack = PACKS[body.pack];
  if (!pack) return fail(400, 'input_error', 'Unknown credit pack.');

  try {
    const account = await ensureAccount(user);
    const origin = siteOrigin(request);
    const metadata = { kind: 'spreadrun_credits', user_id: user.id, pack: body.pack };
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: pack.priceCents,
          product_data: { name: `SpreadRun API credits: ${pack.label}` },
        },
      }],
      ...(account.stripe_customer_id
        ? { customer: account.stripe_customer_id }
        : { customer_email: user.email, customer_creation: 'always' }),
      client_reference_id: user.id,
      metadata,
      payment_intent_data: { metadata },
      success_url: `${origin}/account?purchase=success`,
      cancel_url: `${origin}/account?purchase=cancelled`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error('checkout error', e.message);
    return fail(500, 'internal_error', 'Could not start checkout. Try again.');
  }
}
