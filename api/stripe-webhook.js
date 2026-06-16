// This file lives at /api/stripe-webhook.js and Vercel automatically turns it into
// a live serverless endpoint at https://spreadrun.com/api/stripe-webhook
// Stripe calls this URL automatically every time a payment event happens.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  'https://deqchbqeajwrwdfwzxuc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

// Vercel needs the raw, unparsed request body to verify this came from Stripe,
// so we disable Vercel's automatic JSON parsing for this one endpoint.
export const config = {
  api: {
    bodyParser: false,
  },
};

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const rawBody = await buffer(req);
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    // This line is the security check: it confirms the request really came from
    // Stripe and wasn't faked by someone else hitting this URL directly.
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      // Fires the moment someone completes checkout successfully.
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

      // Fires if a subscription is cancelled or a renewal payment fails outright.
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer;

        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'cancelled', subscription_tier: 'free' })
          .eq('stripe_customer_id', stripeCustomerId);
        break;
      }

      // Fires on failed recurring payments (e.g. card declined on renewal).
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
        // Unhandled event types are fine to ignore; Stripe sends many we don't need.
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return res.status(500).send('Internal error processing webhook');
  }
}
