// Stripe webhook endpoint: https://www.spreadrun.com/api/stripe-webhook
// Keeps public.profiles in sync with the customer's Stripe subscription (solo / shop).

import { Resend } from 'resend';
import { stripe, supabaseAdmin, PLANS, planForPriceId, mapStatus } from './_lib/clients.js';

const resend = new Resend(process.env.RESEND_API_KEY);

// request.text() gives the raw, unparsed body Stripe needs to verify its signature.
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
        await handleCheckoutCompleted(event.data.object);
        break;

      // Plan changes, renewals, trial endings, cancel-at-period-end toggles, etc.
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await syncSubscription(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await updateByCustomer(event.data.object.customer, {
          subscription_status: 'cancelled',
          subscription_tier: 'free',
          cancel_at_period_end: false,
        });
        break;

      case 'invoice.payment_failed':
        await updateByCustomer(event.data.object.customer, { subscription_status: 'past_due' });
        break;

      default:
        break; // Stripe sends many events we don't need.
    }
    return Response.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response('Internal error processing webhook', { status: 500 });
  }
}

function fieldsFromSubscription(sub) {
  const priceId = sub.items?.data?.[0]?.price?.id;
  const plan = planForPriceId(priceId) ?? sub.metadata?.plan ?? null;
  const status = mapStatus(sub.status);
  const fields = {
    stripe_subscription_id: sub.id,
    subscription_status: status,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
  };
  if (status === 'cancelled') fields.subscription_tier = 'free';
  else if (plan && PLANS[plan]) fields.subscription_tier = plan;
  else console.error('Unrecognized price on subscription', sub.id, priceId);
  return fields;
}

async function updateByCustomer(customerId, fields) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update(fields)
    .eq('stripe_customer_id', customerId);
  if (error) throw new Error(`profiles update failed: ${JSON.stringify(error)}`);
}

async function syncSubscription(sub) {
  await updateByCustomer(sub.customer, fieldsFromSubscription(sub));
}

async function handleCheckoutCompleted(session) {
  if (session.mode !== 'subscription') return;

  const email = session.customer_details?.email;
  if (!email) {
    console.error('No customer email on checkout session; skipping profile update.');
    return;
  }

  const sub = await stripe.subscriptions.retrieve(session.subscription);
  const fields = fieldsFromSubscription(sub);

  const { error } = await supabaseAdmin.from('profiles').upsert(
    {
      email,
      user_id: session.client_reference_id ?? null,
      stripe_customer_id: session.customer,
      ...fields,
    },
    { onConflict: 'email' }
  );
  if (error) throw new Error(`profiles upsert failed: ${JSON.stringify(error)}`);

  const planLabel = PLANS[fields.subscription_tier]?.label ?? 'SecondRing';
  const { error: emailError } = await resend.emails.send({
    from: 'SecondRing <hello@spreadrun.com>',
    to: email,
    replyTo: 'spreadrun@gmail.com',
    subject: `Welcome to SecondRing ${planLabel}`,
    html: welcomeEmail(planLabel),
  });
  if (emailError) console.error('Welcome email failed:', JSON.stringify(emailError));
}

function welcomeEmail(planLabel) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #0D1B3E;">
    <div style="margin-bottom: 28px;"><span style="font-weight: 800; font-size: 18px;">SecondRing</span></div>
    <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 16px; letter-spacing: -0.5px;">You're in. Welcome to ${planLabel}.</h1>
    <p style="font-size: 15px; color: #3D4F6E; line-height: 1.7; margin: 0 0 20px;">
      From now on, a missed call doesn't have to mean a lost job. Next steps:
    </p>
    <div style="background: #F0F4FF; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; font-size: 14px; line-height: 1.8;">
      1. Set your business name and auto-reply text<br/>
      2. Follow the call-forwarding guide for your carrier<br/>
      3. Reply to your first lead from the inbox
    </div>
    <a href="https://www.spreadrun.com/inbox" style="display: inline-block; background: #0B5FFF; color: #fff; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none; margin-bottom: 28px;">Open your inbox →</a>
    <p style="font-size: 14px; color: #6B7A99; line-height: 1.7; margin: 0 0 8px;">
      Questions? Reply to this email and a real person will answer. You can cancel anytime from your account page.
    </p>
  </div>`;
}
