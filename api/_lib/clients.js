// Shared server-side clients and helpers for the Vercel functions in /api.
// Files under api/_lib are not exposed as endpoints (leading underscore).

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Pinned on purpose. stripe-node v16 is typed against this version; bump both together
// after testing against the dashboard's webhook/API version (see docs/stripe-setup.md).
export const STRIPE_API_VERSION = '2024-06-20';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
});

export const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://deqchbqeajwrwdfwzxuc.supabase.co';

export const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Flat subscription plans. Price IDs come from env so test and live mode can differ.
export const PLANS = {
  solo: { label: 'Solo', priceEnv: 'STRIPE_PRICE_SOLO', numbers: 1, texts: 300 },
  shop: { label: 'Shop', priceEnv: 'STRIPE_PRICE_SHOP', numbers: 3, texts: 1000 },
};

export function priceIdForPlan(plan) {
  const cfg = PLANS[plan];
  return cfg ? process.env[cfg.priceEnv] : undefined;
}

export function planForPriceId(priceId) {
  return Object.keys(PLANS).find((p) => process.env[PLANS[p].priceEnv] === priceId) ?? null;
}

// Stripe subscription.status -> the status we store on profiles.
export function mapStatus(stripeStatus) {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'cancelled';
    default:
      return 'incomplete';
  }
}

// Authenticates a request from the browser. The client sends its Supabase access token as
// `Authorization: Bearer <jwt>`; we verify it with Supabase and return the verified user.
// Identity ALWAYS comes from the verified token, never from the request body.
export async function requireUser(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return { error: new Response('Authentication required', { status: 401 }) };

  const { data, error } = await supabaseAdmin.auth.getUser(match[1]);
  if (error || !data?.user?.email) {
    return { error: new Response('Invalid or expired session', { status: 401 }) };
  }
  return { user: data.user };
}

export function siteOrigin(request) {
  // Only trust our own origin for redirect targets.
  const allowed = ['https://www.spreadrun.com', 'https://spreadrun.com'];
  const origin = request.headers.get('origin');
  if (origin && allowed.includes(origin)) return origin;
  return process.env.SITE_URL || 'https://www.spreadrun.com';
}
