import { useEffect, useState } from 'react';
import Layout from '../site/Layout.jsx';

const EMAIL = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]+$/;

export default function Unsubscribe() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ phase: 'idle', message: '' });
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('email');
    if (e) setEmail(e);
  }, []);
  const submit = async (ev) => {
    ev.preventDefault();
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setState({ phase: 'error', message: 'That does not look like an email address. Check it and try again.' });
      return;
    }
    setState({ phase: 'sending', message: '' });
    try {
      const res = await fetch('/api/signup/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: value }) });
      setState(res.ok ? { phase: 'done', message: '' } : { phase: 'error', message: 'That did not go through. Try again later.' });
    } catch {
      setState({ phase: 'error', message: 'That did not go through. Try again later.' });
    }
  };
  return (
    <Layout path="/unsubscribe">
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>Unsubscribe</h1>
        {state.phase === 'done' ? (
          <p role="status"><b>Done.</b> If that address was on our list, it will not get any more emails from SpreadRun. You do not need to do anything else.</p>
        ) : (
          <>
            <p>Stop deadline reminders and new-tool emails from SpreadRun. Enter the address you signed up with and press the button.</p>
            <form onSubmit={submit} noValidate style={{ maxWidth: 480 }}>
              <div className="field">
                <label htmlFor="unsub-email">Email</label>
                <input id="unsub-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
              </div>
              <button className="btn" type="submit" disabled={state.phase === 'sending'}>Unsubscribe</button>
              {state.phase === 'error' && <div className="error-box" role="alert">{state.message}</div>}
            </form>
            <noscript><p className="small">This page needs JavaScript. You can also ask to be removed through the <a href="/contact">contact page</a>.</p></noscript>
          </>
        )}
      </div>
    </Layout>
  );
}
