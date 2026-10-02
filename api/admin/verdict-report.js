import { Resend } from 'resend';
import { supabaseAdmin, json, fail, money } from '../_lib/clients.js';
import { authorized } from './metrics.js';

// GET /api/admin/verdict-report  (Vercel Cron, weekly; production only)
// Emails the current launch verdict so the 30-day test reports on itself.
// Vercel sends "Authorization: Bearer <CRON_SECRET>" on cron calls.
export async function GET(request) {
  if (!authorized(request, process.env.CRON_SECRET, process.env.ADMIN_TOKEN)) return fail(401, 'unauthorized', 'Not allowed.');
  const { data: m, error } = await supabaseAdmin.rpc('storefront_metrics');
  if (error) return fail(500, 'internal_error', error.message);

  const lines = [
    `Verdict: ${m.verdict}`,
    m.window.start ? `Window: ${m.window.start.slice(0, 10)} to ${m.window.end.slice(0, 10)} (${m.window.daysRemaining} days left)` : 'Window: not started (set storefront_settings.launch_at)',
    `Paying users: ${m.payingUsers} of ${m.targets.payingUsers}`,
    `Paid runs: ${m.paidRuns} of ${m.targets.paidRuns}`,
    `Credit purchases: ${m.creditPurchases} (${money(m.revenueCents)})`,
    `Sign-ups: ${m.signups}`,
    `Demo runs: ${m.demoRuns}`,
    '',
    m.rule,
  ];
  const to = process.env.REPORT_EMAIL || 'spreadrun@gmail.com';
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: mailError } = await resend.emails.send({
      from: 'SpreadRun <hello@spreadrun.com>', to,
      subject: `SpreadRun storefront: ${m.verdict} (${m.payingUsers} payers, ${m.paidRuns} paid runs)`,
      text: lines.join('\n'),
    });
    if (mailError) return fail(500, 'email_failed', JSON.stringify(mailError));
  }
  return json({ sent: Boolean(process.env.RESEND_API_KEY), to, metrics: m });
}
