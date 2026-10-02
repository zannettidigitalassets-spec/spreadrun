// Credit-purchase receipt email (replaces the old real-estate welcome email).
import { money, RUN_PRICES_CENTS } from './clients.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function receiptEmail({ packLabel, amountPaidCents, creditCents, balanceCents, sessionId }) {
  // For example "39 runs at $0.25 or 9 runs at $1.00": credits work on every API at that API's price.
  const runs = RUN_PRICES_CENTS.map((p) => `${Math.floor(balanceCents / p)} runs at ${money(p)}`).join(' or ');
  const text = [
    'Thanks for your purchase.',
    '',
    `Pack: ${packLabel}`,
    `Paid: ${money(amountPaidCents)}`,
    `Credit added: ${money(creditCents)}`,
    `Balance now: ${money(balanceCents)} (${runs})`,
    `Reference: ${sessionId}`,
    '',
    'Credits never expire and work on every SpreadRun API at that API\'s price per completed run. Requests rejected as invalid input are free. Unused credits are refundable on request within 30 days of purchase.',
    '',
    'Manage keys and see usage: https://www.spreadrun.com/account',
    'API docs: https://www.spreadrun.com/docs',
    '',
    'Questions? Reply to this email.',
    'SpreadRun',
  ].join('\n');

  const row = (k, v) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#5B6675">${esc(k)}</td><td style="padding:6px 0;color:#14213D;font-weight:600">${esc(v)}</td></tr>`;
  const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px 20px;color:#14213D">
  <p style="font-weight:700;font-size:17px;margin:0 0 20px">SpreadRun</p>
  <h1 style="font-size:21px;margin:0 0 12px">Receipt: API credits added</h1>
  <table style="border-collapse:collapse;font-size:14px;margin:0 0 20px">
    ${row('Pack', packLabel)}
    ${row('Paid', money(amountPaidCents))}
    ${row('Credit added', money(creditCents))}
    ${row('Balance now', `${money(balanceCents)} (${runs})`)}
    ${row('Reference', sessionId)}
  </table>
  <p style="font-size:14px;line-height:1.6;color:#3A4657;margin:0 0 12px">Credits never expire and work on every SpreadRun API. You are only charged for completed runs. Requests rejected as invalid input are free. Unused credits are refundable on request within 30 days of purchase.</p>
  <p style="font-size:14px;line-height:1.6;margin:0 0 24px">
    <a href="https://www.spreadrun.com/account" style="color:#0B5C5C">Manage keys and usage</a> &nbsp;|&nbsp;
    <a href="https://www.spreadrun.com/docs" style="color:#0B5C5C">API docs</a>
  </p>
  <p style="font-size:12px;color:#7A8594;margin:0">Questions? Reply to this email. Stripe also sends its own payment receipt.</p>
</div>`;
  return { subject: `SpreadRun receipt: ${money(creditCents)} in API credits`, text, html };
}
