import { useState, useEffect } from 'react';

export const C = {
  ink: '#0D1B3E', body: '#2B3A5C', muted: '#6B7A99', accent: '#0B5FFF',
  tint: '#F0F4FF', line: '#D6DFFF', ok: '#00B67A', warn: '#B7791F', bad: '#D14343',
};

export const card = { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: 22 };

export function Button({ children, onClick, kind = 'primary', disabled, style }) {
  const base = {
    borderRadius: 9, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit', opacity: disabled ? 0.55 : 1,
  };
  const kinds = {
    primary: { background: C.accent, color: '#fff', border: 'none' },
    ghost: { background: '#fff', color: C.accent, border: `1.5px solid ${C.accent}` },
    plain: { background: 'none', color: C.muted, border: `1.5px solid ${C.line}` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...kinds[kind], ...style }}>{children}</button>;
}

export function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{hint}</div>}
    </label>
  );
}

export const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1.5px solid ${C.line}`,
  borderRadius: 8, fontSize: 15, fontFamily: 'inherit', color: C.ink,
};

// Small persisted state for the mock-data phase. Settings live in localStorage until
// Track B wires the real tables; every access is guarded (storage can be unavailable).
export function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }, [key, value]);
  return [value, setValue];
}
