import { useState } from 'react';
import AppShell from './AppShell.jsx';
import { C, Button, card } from './ui.jsx';
import { startCheckout, openBillingPortal } from '../billing.js';

const PLAN_INFO = {
  solo: { label: 'Solo', price: '$19/mo', detail: '1 number, 300 texts/mo' },
  shop: { label: 'Shop', price: '$29/mo', detail: '3 numbers, 1,000 texts/mo, after-hours rules' },
};

function AccountBody({ ent }) {
  const [busy, setBusy] = useState(null);
  const banner = new URLSearchParams(window.location.search).get('checkout');
  const run = (key, fn) => async () => {
    setBusy(key);
    try { await fn(); } catch (e) { console.error(e); setBusy(null); }
  };
  const subscribed = ent.state === 'subscribed' || ent.state === 'past_due';

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 680 }}>
      {banner === 'success' && <div style={{ background: '#E8F8F1', border: `1px solid ${C.ok}`, borderRadius: 10, padding: '10px 14px' }}>Thanks, you're subscribed. It can take a few seconds to show up here.</div>}
      {banner === 'cancelled' && <div style={{ background: C.tint, borderRadius: 10, padding: '10px 14px' }}>Checkout cancelled. You haven't been charged.</div>}

      <div style={card}>
        <h2 style={{ color: C.ink, margin: '0 0 8px' }}>Your plan</h2>
        {subscribed ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.ink }}>{PLAN_INFO[ent.tier].label} <span style={{ fontSize: 16, color: C.muted, fontWeight: 600 }}>{PLAN_INFO[ent.tier].price}</span></div>
            <div style={{ color: C.muted, marginBottom: 16 }}>{PLAN_INFO[ent.tier].detail}{ent.state === 'past_due' ? ' · payment failed' : ''}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button disabled={!!busy} onClick={run('portal', openBillingPortal)}>{busy === 'portal' ? 'Loading…' : 'Change plan'}</Button>
              <Button kind="plain" disabled={!!busy} onClick={run('cancel', openBillingPortal)}>Cancel subscription</Button>
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>Change or cancel in two clicks. Cancelling keeps your plan until the end of the billing period.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>
              {ent.state === 'trial' ? `Free trial · ${ent.daysLeft} day${ent.daysLeft === 1 ? '' : 's'} left` : 'Free trial ended'}
            </div>
            <div style={{ color: C.muted, marginBottom: 16 }}>No card needed during the trial. Pick a plan any time to keep going.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {Object.entries(PLAN_INFO).map(([id, p]) => (
                <div key={id} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 800, color: C.ink }}>{p.label} · {p.price}</div>
                  <div style={{ fontSize: 14, margin: '4px 0 12px' }}>{p.detail}</div>
                  <Button disabled={!!busy} onClick={run(id, () => startCheckout(id))}>{busy === id ? 'Loading…' : `Choose ${p.label}`}</Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Account() {
  return <AppShell active="/account" allowExpired>{({ ent }) => <AccountBody ent={ent} />}</AppShell>;
}
