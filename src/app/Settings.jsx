import { useState } from 'react';
import AppShell from './AppShell.jsx';
import { C, Button, card, inputStyle, Field, useStored } from './ui.jsx';
import { DEFAULT_AUTO_REPLY } from './mockData.js';
import { CARRIERS, FORWARD_TO_PLACEHOLDER, GUIDE_FOOTER } from './forwardingGuide.js';

export const SETTINGS_KEY = 'sr.settings';
export const DEFAULT_SETTINGS = { businessName: '', autoReply: DEFAULT_AUTO_REPLY, openTime: '07:00', closeTime: '18:00', businessNumber: '', voicemailConfirmed: false };

function ForwardingGuide() {
  const [carrier, setCarrier] = useState(CARRIERS[0].id);
  const c = CARRIERS.find((x) => x.id === carrier);
  return (
    <div style={card}>
      <h3 style={{ color: C.ink, margin: '0 0 6px' }}>Call forwarding setup</h3>
      <p style={{ margin: '0 0 14px', fontSize: 14 }}>Forward only the calls you miss to SecondRing. Your number stays yours.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {CARRIERS.map((x) => (
          <Button key={x.id} kind={x.id === carrier ? 'primary' : 'plain'} onClick={() => setCarrier(x.id)}>{x.name}</Button>
        ))}
      </div>
      <p style={{ fontSize: 14, color: C.muted, marginTop: 0 }}>{c.intro}</p>
      <ol style={{ paddingLeft: 20, lineHeight: 1.8 }}>
        {c.steps.map((s) => <li key={s}>{s.replace('{NUMBER}', FORWARD_TO_PLACEHOLDER)}</li>)}
      </ol>
      <p style={{ fontSize: 14 }}>{c.turnOff}</p>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 0 }}>{GUIDE_FOOTER}</p>
      <p style={{ fontSize: 13, color: C.warn, marginBottom: 0 }}>Your SecondRing number appears here once your number is connected.</p>
    </div>
  );
}

function SettingsBody() {
  const [s, setS] = useStored(SETTINGS_KEY, DEFAULT_SETTINGS);
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card}>
        <h3 style={{ color: C.ink, margin: '0 0 14px' }}>Business</h3>
        <Field label="Business name"><input value={s.businessName} onChange={set('businessName')} style={inputStyle} placeholder="Reyes Plumbing" /></Field>
        <Field label="Your business number" hint="The number customers already call.">
          <input value={s.businessNumber} onChange={set('businessNumber')} style={inputStyle} placeholder="(412) 555-0100" />
        </Field>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Field label="Open"><input type="time" value={s.openTime} onChange={set('openTime')} style={inputStyle} /></Field>
          <Field label="Close"><input type="time" value={s.closeTime} onChange={set('closeTime')} style={inputStyle} /></Field>
        </div>
        <Field label="Auto-reply text" hint="Sent to every caller you miss, within about a minute.">
          <textarea rows={3} value={s.autoReply} onChange={set('autoReply')} style={inputStyle} />
        </Field>
        <div style={{ fontSize: 13, color: C.muted }}>Changes save automatically.</div>
      </div>
      <div style={card}>
        <h3 style={{ color: C.ink, margin: '0 0 6px' }}>Numbers</h3>
        <p style={{ margin: 0, fontSize: 14 }}>Connecting your number is coming soon. We'll set up your SecondRing number and the text-messaging registration for you during onboarding.</p>
      </div>
      <ForwardingGuide />
    </div>
  );
}

export default function Settings() {
  return <AppShell active="/settings">{() => <SettingsBody />}</AppShell>;
}
