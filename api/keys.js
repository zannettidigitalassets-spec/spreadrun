import { randomBytes, createHash } from 'node:crypto';
import { requireUser, ensureAccount, supabaseAdmin, json, fail } from './_lib/clients.js';

// POST   /api/keys          { name? }  -> creates a key; the full key is returned once and never stored
// DELETE /api/keys?id=<id>            -> revokes one of the caller's keys
export async function POST(request) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || 'Default').trim().slice(0, 60);

  try {
    await ensureAccount(user);
    const key = `sr_${randomBytes(24).toString('base64url')}`;
    const hash = createHash('sha256').update(key).digest('hex');
    const { data, error } = await supabaseAdmin.rpc('create_api_key', {
      p_user_id: user.id, p_key_hash: hash, p_key_prefix: key.slice(0, 10), p_name: name,
    });
    if (error) {
      if (/key_limit/.test(error.message)) return fail(400, 'key_limit', 'You can have up to 10 active keys. Revoke one first.');
      throw new Error(error.message);
    }
    return json({ ...data, key }, 201);
  } catch (e) {
    console.error('create key error', e.message);
    return fail(500, 'internal_error', 'Could not create the key. Try again.');
  }
}

export async function DELETE(request) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(400, 'input_error', 'Pass the key id as ?id=.');

  const { data, error } = await supabaseAdmin.rpc('revoke_api_key', { p_user_id: user.id, p_key_id: id });
  if (error) {
    console.error('revoke key error', error.message);
    return fail(500, 'internal_error', 'Could not revoke the key. Try again.');
  }
  if (!data) return fail(404, 'not_found', 'No active key with that id on your account.');
  return json({ revoked: true, id });
}
