import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  'https://deqchbqeajwrwdfwzxuc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  const { email } = body;

  if (!email) {
    return new Response('Email is required', { status: 400 });
  }

  // Look up the Stripe customer ID from the profiles table
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('email', email)
    .maybeSingle();

  if (error || !profile?.stripe_customer_id) {
    return new Response('No subscription found for this account', { status: 404 });
  }

  // Create a Stripe Customer Portal session for this customer
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: 'https://spreadrun.com/app',
  });

  return Response.json({ url: session.url });
}
