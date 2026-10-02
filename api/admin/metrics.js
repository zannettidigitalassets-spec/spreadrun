import { timingSafeEqual } from 'node:crypto';
import { supabaseAdmin, json, fail } from '../_lib/clients.js';

// GET /api/admin/metrics   Authorization: Bearer <ADMIN_TOKEN>
// Returns the launch verdict and funnel numbers, computed in Postgres by storefront_metrics().
export function authorized(request, ...secrets) {
  const given = Buffer.from((request.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''));
  return secrets.filter(Boolean).some((s) => {
    const want = Buffer.from(s);
    return given.length === want.length && timingSafeEqual(given, want);
  });
}

export async function GET(request) {
  if (!authorized(request, process.env.ADMIN_TOKEN)) return fail(401, 'unauthorized', 'Admin token required.');
  const { data, error } = await supabaseAdmin.rpc('storefront_metrics');
  if (error) return fail(500, 'internal_error', error.message);
  return json(data);
}
