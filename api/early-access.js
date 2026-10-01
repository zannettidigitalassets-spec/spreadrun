// POST /api/early-access  { name, email, company? }
// Stores an early-access signup. Does not start a trial or create an account.
// "company" is a honeypot field: real users never fill it in.
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  'https://deqchbqeajwrwdfwzxuc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.company) return Response.json({ ok: true }); // bot: pretend success

    const name = String(body.name || '').trim().slice(0, 120);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 254);

    if (!name) return Response.json({ error: 'Please enter your name.' }, { status: 400 });
    if (!EMAIL_RE.test(email)) return Response.json({ error: 'Please enter a valid email.' }, { status: 400 });

    const { error } = await supabaseAdmin.from('early_access').insert({ name, email, source: 'landing' });
    // 23505 = already signed up: treat as success so we never reveal who is on the list.
    if (error && error.code !== '23505') {
      console.error('early-access insert failed', error.message);
      return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error('early-access error', e);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
