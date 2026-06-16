import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  'https://deqchbqeajwrwdfwzxuc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerEmail = session.customer_details?.email;
        const stripeCustomerId = session.customer;

        if (customerEmail) {
          await supabaseAdmin
            .from('profiles')
            .upsert(
              {
                email: customerEmail,
                stripe_customer_id: stripeCustomerId,
                subscription_status: 'active',
                subscription_tier: 'starter',
              },
              { onConflict: 'email' }
            );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer;

        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'cancelled', subscription_tier: 'free' })
          .eq('stripe_customer_id', stripeCustomerId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const stripeCustomerId = invoice.customer;

        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', stripeCustomerId);
        break;
      }

      default:
        break;
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response('Internal error processing webhook', { status: 500 });
  }
}
