import { useState } from 'react';
import { useAuth, AuthModal, UserMenu } from '../Auth.jsx';
import { useEntitlement, FEATURES } from './entitlements.js';
import { C, Button, card } from './ui.jsx';
import { startCheckout } from '../billing.js';

const NAV = [
  ['/inbox', 'Inbox'],
  ['/settings', 'Settings'],
  ['/account', 'Account'],
];

function Paywall({ ent }) {
  const [busy, setBusy] = useState(null);
  const go = async (plan) => { setBusy(plan); try { await startCheckout(plan); } catch (e) { console.error(e); setBusy(null); } };
  return (
    <div style={{ ...card, maxWidth: 560, margin: '48px auto', textAlign: 'center' }}>
      <h2 style={{ color: C.ink, margin: '0 0 8px' }}>Your free trial has ended</h2>
      <p style={{ margin: '0 0 6px' }}>Pick a plan to keep texting back missed calls.</p>
      {ent.dataRetained && (
        <p style={{ color: C.muted, fontSize: 14, margin: '0 0 20px' }}>
          Your conversations and settings are kept until {new Date(ent.retainedUntil).toLocaleDateString()}.
        </p>
      )}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button disabled={!!busy} onClick={() => go('solo')}>{busy === 'solo' ? 'Loading…' : 'Solo — $19/mo'}</Button>
        <Button disabled={!!busy} kind="ghost" onClick={() => go('shop')}>{busy === 'shop' ? 'Loading…' : 'Shop — $29/mo'}</Button>
      </div>
    </div>
  );
}

// Wraps every signed-in page: auth check, trial banner, nav, and the paywall.
// `allowExpired` lets the Account page stay reachable so people can subscribe or cancel.
export default function AppShell({ active, children, allowExpired = false }) {
  const { user, loading } = useAuth();
  const ent = useEntitlement(user);
  const [showAuth, setShowAuth] = useState(false);

  if (loading) return null;
  if (!user) {
    return (
      <div style={{ fontFamily: 'Inter, system-ui, sans-serif', textAlign: 'center', padding: '96px 20px', color: C.body }}>
        <h1 style={{ color: C.ink }}>Sign in to SecondRing</h1>
        <Button onClick={() => setShowAuth(true)}>Sign in with email</Button>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </div>
    );
  }

  const blocked = !allowExpired && ent.state === 'expired';
  const canUse = FEATURES.canUseApp(ent);

  return (
    <div style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: C.body, background: '#F7F9FF', minHeight: '100vh' }}>
      <header style={{ background: C.ink, padding: '0 20px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', alignItems: 'center', height: 58, gap: 24 }}>
          <a href="/" style={{ color: '#fff', fontWeight: 800, fontSize: 18, textDecoration: 'none' }}>SecondRing</a>
          <nav style={{ display: 'flex', gap: 18, flex: 1 }}>
            {NAV.map(([href, label]) => (
              <a key={href} href={href} style={{ color: active === href ? '#fff' : '#A8C4FF', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>{label}</a>
            ))}
          </nav>
          <UserMenu user={user} isStarter={ent.state === 'subscribed' || ent.state === 'past_due'} />
        </div>
      </header>

      {ent.state === 'trial' && (
        <div style={{ background: C.tint, borderBottom: `1px solid ${C.line}`, padding: '8px 20px', textAlign: 'center', fontSize: 14 }}>
          Free trial: <strong>{ent.daysLeft} day{ent.daysLeft === 1 ? '' : 's'} left</strong>. <a href="/account" style={{ color: C.accent, fontWeight: 700 }}>Choose a plan</a>
        </div>
      )}
      {ent.state === 'past_due' && (
        <div style={{ background: '#FFF7E6', borderBottom: '1px solid #FFE3A8', padding: '8px 20px', textAlign: 'center', fontSize: 14, color: C.warn }}>
          Your last payment failed. <a href="/account" style={{ color: C.accent, fontWeight: 700 }}>Update your card</a> to avoid losing access.
        </div>
      )}

      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 20px 64px' }}>
        {ent.state === 'loading' ? <p>Loading…</p> : blocked ? <Paywall ent={ent} /> : children({ ent, canUse })}
      </main>
    </div>
  );
}
