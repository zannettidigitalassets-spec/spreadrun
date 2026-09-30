import { useState, useMemo } from 'react';
import AppShell from './AppShell.jsx';
import { C, Button, card, inputStyle, Field, useStored } from './ui.jsx';
import { MOCK_CONVERSATIONS, DEFAULT_AFTER_HOURS } from './mockData.js';
import { FEATURES } from './entitlements.js';

const TAGS = ['new', 'quoted', 'booked', 'lost'];
const TAG_COLOR = { all: C.ink, new: C.accent, quoted: C.warn, booked: C.ok, lost: C.muted };

const fmt = (iso) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function TagPill({ tag, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      border: `1.5px solid ${TAG_COLOR[tag]}`, background: active ? TAG_COLOR[tag] : '#fff',
      color: active ? '#fff' : TAG_COLOR[tag], borderRadius: 99, padding: '3px 12px', fontSize: 12.5,
      fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'inherit',
    }}>{tag}</button>
  );
}

function AfterHoursEditor({ ent }) {
  const [rule, setRule] = useStored('sr.afterHours', { enabled: true, start: '18:00', end: '07:00', message: DEFAULT_AFTER_HOURS });
  if (!FEATURES.afterHoursRules(ent)) {
    return (
      <div style={{ ...card, marginTop: 20 }}>
        <strong style={{ color: C.ink }}>After-hours rules</strong> are part of the Shop plan.{' '}
        <a href="/account" style={{ color: C.accent, fontWeight: 700 }}>Upgrade to Shop</a>
      </div>
    );
  }
  return (
    <div style={{ ...card, marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong style={{ color: C.ink, fontSize: 16 }}>After-hours rules</strong>
        <label style={{ fontSize: 14 }}><input type="checkbox" checked={rule.enabled} onChange={(e) => setRule({ ...rule, enabled: e.target.checked })} /> Enabled</label>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Field label="After hours start"><input type="time" value={rule.start} onChange={(e) => setRule({ ...rule, start: e.target.value })} style={inputStyle} /></Field>
        <Field label="Until"><input type="time" value={rule.end} onChange={(e) => setRule({ ...rule, end: e.target.value })} style={inputStyle} /></Field>
      </div>
      <Field label="After-hours message" hint="Sent instead of your normal auto-reply outside your hours.">
        <textarea rows={3} value={rule.message} onChange={(e) => setRule({ ...rule, message: e.target.value })} style={inputStyle} />
      </Field>
      <div style={{ fontSize: 12.5, color: C.muted }}>Preview only: after-hours sending starts working when live texting is connected.</div>
    </div>
  );
}

function InboxBody({ ent }) {
  const [convos, setConvos] = useState(MOCK_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState(MOCK_CONVERSATIONS[0].id);
  const [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState('');

  const visible = useMemo(() => convos.filter((c) => filter === 'all' || c.tag === filter), [convos, filter]);
  const selected = convos.find((c) => c.id === selectedId) ?? visible[0];

  const update = (id, patch) => setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const open = (id) => { setSelectedId(id); update(id, { unread: false }); };
  const send = () => {
    const body = draft.trim();
    if (!body || !selected) return;
    update(selected.id, { messages: [...selected.messages, { id: `local-${Date.now()}`, dir: 'out', kind: 'message', body, at: new Date().toISOString() }] });
    setDraft('');
  };

  return (
    <>
      <div style={{ background: '#FFF7E6', border: '1px solid #FFE3A8', borderRadius: 10, padding: '8px 14px', fontSize: 13.5, color: C.warn, marginBottom: 16 }}>
        Preview with sample conversations. Live missed-call texting turns on once your number is connected.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: `1px solid ${C.line}`, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <TagPill tag="all" active={filter === 'all'} onClick={() => setFilter('all')} />
            {TAGS.map((t) => <TagPill key={t} tag={t} active={filter === t} onClick={() => setFilter(t)} />)}
          </div>
          {visible.length === 0 && <div style={{ padding: 16, color: C.muted }}>No conversations.</div>}
          {visible.map((c) => {
            const last = c.messages[c.messages.length - 1];
            return (
              <button key={c.id} onClick={() => open(c.id)} style={{
                display: 'block', width: '100%', textAlign: 'left', border: 'none', borderBottom: `1px solid ${C.tint}`,
                background: selected?.id === c.id ? C.tint : '#fff', padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ color: C.ink, fontWeight: c.unread ? 800 : 600 }}>{c.unread ? '● ' : ''}{c.name}</strong>
                  <span style={{ fontSize: 12, color: TAG_COLOR[c.tag], fontWeight: 700, textTransform: 'capitalize' }}>{c.tag}</span>
                </div>
                <div style={{ fontSize: 13, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{last.body}</div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div style={{ ...card, padding: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div><strong style={{ color: C.ink }}>{selected.name}</strong><div style={{ fontSize: 13, color: C.muted }}>{selected.phone}</div></div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {TAGS.map((t) => <TagPill key={t} tag={t} active={selected.tag === t} onClick={() => update(selected.id, { tag: t })} />)}
              </div>
            </div>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 240 }}>
              {selected.messages.map((m) => m.kind === 'missed_call' ? (
                <div key={m.id} style={{ alignSelf: 'center', fontSize: 12.5, color: C.muted }}>📞 Missed call · {fmt(m.at)}</div>
              ) : (
                <div key={m.id} style={{ alignSelf: m.dir === 'out' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                  <div style={{ background: m.dir === 'out' ? C.accent : C.tint, color: m.dir === 'out' ? '#fff' : C.ink, borderRadius: 14, padding: '9px 14px', fontSize: 15 }}>{m.body}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, textAlign: m.dir === 'out' ? 'right' : 'left', marginTop: 2 }}>
                    {m.kind === 'auto_reply' ? 'Auto text-back · ' : ''}{fmt(m.at)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: 14, borderTop: `1px solid ${C.line}`, display: 'flex', gap: 8 }}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type a reply…" style={{ ...inputStyle, flex: 1 }} />
              <Button onClick={send} disabled={!draft.trim()}>Send</Button>
            </div>
          </div>
        )}
      </div>
      <AfterHoursEditor ent={ent} />
    </>
  );
}

export default function Inbox() {
  return <AppShell active="/inbox">{({ ent }) => <InboxBody ent={ent} />}</AppShell>;
}
