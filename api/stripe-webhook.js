// This file lives at /api/stripe-webhook.js and Vercel automatically turns it into
// a live serverless endpoint at https://spreadrun.com/api/stripe-webhook
// Stripe calls this URL automatically every time a payment event happens.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  'https://deqchbqeajwrwdfwzxuc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// Modern Vercel Functions use the standard Web Request/Response objects directly,
// rather than the older Node-style (req, res) handler. request.text() gives us
// the exact raw, unparsed body Stripe needs to verify its signature.
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
      // Fires the moment someone completes checkout successfully.
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerEmail = session.customer_details?.email;
        const stripeCustomerId = session.customer;

        if (customerEmail) {
          const { data, error } = await supabaseAdmin
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

          if (error) {
            console.error('Supabase upsert failed:', JSON.stringify(error));
          } else {
            console.log('Supabase upsert succeeded:', JSON.stringify(data));

            // Send welcome email via Resend
            const { error: emailError } = await resend.emails.send({
              from: 'SpreadRun <hello@spreadrun.com>',
              to: customerEmail,
              replyTo: 'spreadrun@gmail.com',
              subject: 'Welcome to SpreadRun Starter 🎉',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #0D1B3E;">
                  <div style="margin-bottom: 28px;">
                    <span style="font-weight: 800; font-size: 18px; color: #0D1B3E;">SpreadRun</span>
                  </div>

                  <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 16px; letter-spacing: -0.5px;">
                    You're in. Welcome to Starter. 🎉
                  </h1>

                  <p style="font-size: 15px; color: #3D4F6E; line-height: 1.7; margin: 0 0 20px;">
                    Thank you for trusting SpreadRun to help you analyze your deals. That genuinely means a lot — and we're going to make sure it's worth it.
                  </p>

                  <p style="font-size: 15px; color: #3D4F6E; line-height: 1.7; margin: 0 0 24px;">
                    Here's what you now have access to:
                  </p>

                  <div style="background: #F0F4FF; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px;">
                    <div style="margin-bottom: 10px; font-size: 14px; color: #0D1B3E;">✓ &nbsp;<strong>Save up to 10 properties</strong> — come back to any deal anytime</div>
                    <div style="margin-bottom: 10px; font-size: 14px; color: #0D1B3E;">✓ &nbsp;<strong>Side-by-side deal comparison</strong> — stack your best options and see which wins on the numbers</div>
                    <div style="font-size: 14px; color: #0D1B3E;">✓ &nbsp;<strong>PDF deal reports</strong> — clean, branded exports you can share with partners or lenders</div>
                  </div>

                  <a href="https://spreadrun.com/app" style="display: inline-block; background: #0B5FFF; color: #fff; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none; margin-bottom: 28px;">
                    Go to SpreadRun →
                  </a>

                  <p style="font-size: 14px; color: #6B7A99; line-height: 1.7; margin: 0 0 8px;">
                    If you ever have a question, run into an issue, or just want to share feedback — reply directly to this email. We read every message and respond personally.
                  </p>

                  <p style="font-size: 14px; color: #6B7A99; line-height: 1.7; margin: 0 0 32px;">
                    Happy analyzing,<br/>
                    <strong style="color: #0D1B3E;">The SpreadRun Team</strong>
                  </p>

                  <div style="border-top: 1px solid #EBF0FF; padding-top: 20px;">
                    <p style="font-size: 12px; color: #9BA8C0; margin: 0;">
                      SpreadRun · <a href="https://spreadrun.com" style="color: #9BA8C0;">spreadrun.com</a> · For informational purposes only. Not financial advice.
                    </p>
                  </div>
                </div>
              `,
            });

            if (emailError) {
              console.error('Welcome email failed:', JSON.stringify(emailError));
            } else {
              console.log('Welcome email sent to:', customerEmail);
            }
          }
        } else {
          console.error('No customer email found on checkout session, skipping upsert.');
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

    return Response.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response('Internal error processing webhook', { status: 500 });
  }
}
