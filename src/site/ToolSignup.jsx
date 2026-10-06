import { useEffect, useState } from 'react';
import { emailSignupConversion } from './ads.js';

// Optional email signup under a free tool. Never gates the tool, never a popup, nothing pre-checked. The form only
// appears once the page's JavaScript runs, so without JavaScript nothing can be submitted by accident; the tool
// above is unaffected either way. The address leaves the browser only when the person submits this form.
const EMAIL = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]+$/;

export default function ToolSignup({ source, heading = 'Get new free-tool alerts', blurb }) {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState({ phase: 'idle', message: '' });
  useEffect(() => setMounted(true), []);

  const submit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL.test(value) || value.length > 254) {
      setState({ phase: 'error', message: 'That does not look like an email address. Check it and try again.' });
      return;
    }
    if (!consent) {
      setState({ phase: 'error', message: 'Tick the box to agree to the emails first.' });
      return;
    }
    setState({ phase: 'sending', message: '' });
    try {
      const res = await fetch('/api/signup/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, consent: true, source }),
      });
      if (res.ok) {
        setState({ phase: 'done', message: '' });
        if (window.gtag) window.gtag('event', 'tool_signup', { source });
        emailSignupConversion();
      } else {
        const data = await res.json().catch(() => null);
        setState({ phase: 'error', message: data?.error?.message || 'That did not go through. Try again later.' });
      }
    } catch {
      setState({ phase: 'error', message: 'That did not go through. Try again later.' });
    }
  };

  return (
    <section className="section wrap" aria-labelledby="signup-h" id="signup">
      <div className="calc-result" style={{ maxWidth: 640 }}>
        <h2 id="signup-h" style={{ marginTop: 0 }}>{heading}</h2>
        {blurb && <p>{blurb}</p>}
        {state.phase === 'done' ? (
          <p role="status"><b>Thanks, you are on the list.</b> You can <a href="/unsubscribe">unsubscribe</a> at any time.</p>
        ) : mounted ? (
          <form onSubmit={submit} noValidate>
            <div className="field" style={{ margin: '0 0 10px' }}>
              <label htmlFor="signup-email">Email</label>
              <input id="signup-email" type="email" autoComplete="email" inputMode="email" value={email}
                onChange={(e) => setEmail(e.target.value)} maxLength={254} />
            </div>
            <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '0 0 12px' }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
              <span>Email me deadline reminders and new SpreadRun tools. Unsubscribe anytime.</span>
            </label>
            <button className="btn" type="submit" disabled={state.phase === 'sending'}>{state.phase === 'sending' ? 'Signing up' : 'Sign up'}</button>
            {state.phase === 'error' && <div className="error-box" role="alert">{state.message}</div>}
          </form>
        ) : (
          <noscript><p className="small">Signing up needs JavaScript. The tool above works without it.</p></noscript>
        )}
        <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>Optional. The tool above runs in your browser; your email is sent to SpreadRun only if you submit this form. See the <a href="/privacy">Privacy Policy</a>.</p>
      </div>
    </section>
  );
}
