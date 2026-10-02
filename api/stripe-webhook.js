// POST /api/stripe-webhook  (called by Stripe)
// Grants prepaid API credits after a paid Checkout session, exactly once per session, then emails a receipt.
// Removed 2026-10-02: the real-estate Payment Link (plink_) tier mapping and its welcome email.

import { Resend } from 'resend';
import { stripe, supabaseAdmin, PACKS, PRICE_PER_CALL_CENTS } from './_lib/clients.js';
import { receiptEmail } from './_lib/receipt.js';

// Created lazily: the Resend constructor throws when the key is missing (e.g. a preview without email).
const resendClient = () => new Resend(process.env.RESEND_API_KEY);

async function grantCredits(session) {
  const meta = session.metadata || {};
  if (meta.kind !== 'spreadrun_credits') return 'ignored: not a credit purchase';
  if (session.payment_status !== 'paid') return 'ignored: not paid yet';

  const pack = PACKS[meta.pack];
  // Never trust the browser or metadata for amounts: the pack must exist and Stripe must have charged its price.
  if (!pack || session.amount_total !== pack.priceCents || session.currency !== 'usd') {
    console.error('credit purchase mismatch', { session: session.id, pack: meta.pack, amount: session.amount_total });
    return 'ignored: amount mismatch';
  }
  const email = session.customer_details?.email || session.customer_email;
  const { data, error } = await supabaseAdmin.rpc('grant_credits', {
    p_user_id: meta.user_id,
    p_email: email || 'unknown',
    p_credit_cents: pack.creditCents,
    p_session_id: session.id,
    p_pack: meta.pack,
    p_amount_paid_cents: session.amount_total,
    p_stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
  });
  if (error) throw new Error(`grant_credits failed: ${error.message}`); // 500 -> Stripe retries; grant is idempotent

  if (data.granted && email && process.env.RESEND_API_KEY) {
    const mail = receiptEmail({
      packLabel: pack.label, amountPaidCents: session.amount_total, creditCents: pack.creditCents,
      balanceCents: data.balance_cents, pricePerCallCents: PRICE_PER_CALL_CENTS, sessionId: session.id,
    });
    const { error: mailError } = await resendClient().emails.send({
      from: 'SpreadRun <hello@spreadrun.com>', to: email, replyTo: 'spreadrun@gmail.com', ...mail,
    });
    if (mailError) console.error('receipt email failed', JSON.stringify(mailError));
  }
  return data.granted ? 'granted' : 'already granted';
}

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const result = await grantCredits(event.data.object);
        console.log('checkout', event.data.object.id, result);
        break;
      }

      // Kept for any legacy subscriptions still on the account (old real-estate tiers).
      case 'customer.subscription.deleted': {
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'cancelled', subscription_tier: 'free' })
          .eq('stripe_customer_id', event.data.object.customer);
        break;
      }
      case 'invoice.payment_failed': {
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', event.data.object.customer);
        break;
      }

      default:
        break;
    }
    return Response.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err.message);
    return new Response('Internal error processing webhook', { status: 500 });
  }
}
