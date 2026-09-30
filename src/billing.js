import { supabase } from './supabaseClient.js';

// All billing calls send the signed-in user's Supabase access token. The server derives
// identity from that token; we never send an email or user id for it to trust.
async function authedPost(path, body) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Not signed in');
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function startCheckout(plan) {
  const { url } = await authedPost('/api/create-checkout-session', { plan });
  window.location.href = url;
}

export async function openBillingPortal() {
  const { url } = await authedPost('/api/customer-portal');
  window.location.href = url;
}
