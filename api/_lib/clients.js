// Shared server-side clients and helpers for the Node functions in /api.
// Files under api/_lib are not exposed as endpoints (leading underscore).
// Adapted from secondring/stripe (authenticated portal pattern), 2026-10-02.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Pinned on purpose. stripe-node v16 is typed against this version; bump both together.
export const STRIPE_API_VERSION = '2024-06-20';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_missing', {
  apiVersion: STRIPE_API_VERSION,
});

export const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://deqchbqeajwrwdfwzxuc.supabase.co';

export const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Prepaid credit packs. Prices are set here, server side, never taken from the browser.
// Credits are held in cents and work on every API. Each API has its own price per completed run
// (pylib/spreadrun_api/catalog.py): standard validators 25 cents, high-stakes validators 100 cents.
export const STANDARD_RUN_CENTS = 25;
export const RUN_PRICES_CENTS = [25, 100];
export const PRICE_PER_CALL_CENTS = STANDARD_RUN_CENTS; // kept for older callers
export const PACKS = {
  pack_5: { priceCents: 500, creditCents: 500, label: '$5 credit pack (20 standard runs)' },
  pack_20: { priceCents: 2000, creditCents: 2000, label: '$20 credit pack (80 standard runs)' },
  pack_50: { priceCents: 5000, creditCents: 5000, label: '$50 credit pack (200 standard runs)' },
};

export const json = (body, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export const fail = (status, code, message) => json({ error: { code, message } }, status);

// Authenticates a browser request. The client sends its Supabase access token as
// `Authorization: Bearer <jwt>`; we verify it with Supabase and return the verified user.
// Identity ALWAYS comes from the verified token, never from the request body.
export async function requireUser(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return { error: fail(401, 'unauthorized', 'Sign in first.') };

  const { data, error } = await supabaseAdmin.auth.getUser(match[1]);
  if (error || !data?.user?.email) {
    return { error: fail(401, 'unauthorized', 'Your session expired. Sign in again.') };
  }
  return { user: data.user };
}

// Creates the storefront account on first use and returns it.
export async function ensureAccount(user) {
  const { data, error } = await supabaseAdmin.rpc('ensure_account', {
    p_user_id: user.id,
    p_email: user.email,
  });
  if (error) throw new Error(`ensure_account failed: ${error.message}`);
  return data;
}

// Only our own origins are trusted for Stripe redirect targets.
export function siteOrigin(request) {
  const allowed = ['https://www.spreadrun.com', 'https://spreadrun.com'];
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
    if (host) allowed.push(`https://${host}`);
  }
  const origin = request.headers.get('origin');
  if (origin && allowed.includes(origin)) return origin;
  return process.env.SITE_URL || 'https://www.spreadrun.com';
}

export const money = (cents) => `$${(cents / 100).toFixed(2)}`;
