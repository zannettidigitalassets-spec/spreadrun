import AppShell from './AppShell.jsx';
import { C, card, useStored } from './ui.jsx';
import { SETTINGS_KEY, DEFAULT_SETTINGS } from './Settings.jsx';
import { DEFAULT_AUTO_REPLY } from './mockData.js';

function Step({ done, title, detail, href, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 0', borderBottom: `1px solid ${C.tint}`, opacity: disabled ? 0.6 : 1 }}>
      <div style={{ width: 26, height: 26, borderRadius: 99, background: done ? C.ok : '#fff', border: `2px solid ${done ? C.ok : C.line}`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{done ? '✓' : ''}</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: C.ink, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 14 }}>{detail}</div>
      </div>
      {href && !disabled && <a href={href} style={{ color: C.accent, fontWeight: 700, fontSize: 14 }}>{done ? 'Edit' : 'Do this'}</a>}
    </div>
  );
}

function OnboardingBody() {
  const [s] = useStored(SETTINGS_KEY, DEFAULT_SETTINGS);
  const steps = [
    { title: 'Connect your number', detail: 'Coming soon. We will set up your SecondRing number and text registration for you.', done: false, disabled: true },
    { title: 'Set your business name', detail: s.businessName || 'Not set yet.', done: Boolean(s.businessName.trim()), href: '/settings' },
    { title: 'Write your auto-reply text', detail: s.autoReply, done: s.autoReply.trim() !== '' && s.autoReply !== DEFAULT_AUTO_REPLY, href: '/settings' },
    { title: 'Set your hours', detail: `${s.openTime} to ${s.closeTime}`, done: s.openTime !== DEFAULT_SETTINGS.openTime || s.closeTime !== DEFAULT_SETTINGS.closeTime, href: '/settings' },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  return (
    <div style={{ ...card, maxWidth: 680 }}>
      <h2 style={{ color: C.ink, margin: '0 0 4px' }}>Get set up</h2>
      <p style={{ margin: '0 0 12px', color: C.muted }}>{doneCount} of {steps.length} done</p>
      {steps.map((x) => <Step key={x.title} {...x} />)}
      <p style={{ marginBottom: 0, fontSize: 14 }}>Then <a href="/settings" style={{ color: C.accent, fontWeight: 700 }}>follow the forwarding guide</a> for your carrier.</p>
    </div>
  );
}

export default function Onboarding() {
  return <AppShell active="/onboarding">{() => <OnboardingBody />}</AppShell>;
}
