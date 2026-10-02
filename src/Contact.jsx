import { useState } from 'react';
import Layout from './site/Layout.jsx';

// Contact form posts to the existing Formspree endpoint (unchanged integration).
const CONTACT_FORMSPREE_URL = 'https://formspree.io/f/mkoalqyg';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch(CONTACT_FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...form, _subject: 'SpreadRun contact form' }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setForm({ name: '', email: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <Layout path="/contact">
      <div className="wrap section split" style={{ paddingTop: 40 }}>
        <div>
          <h1>Contact</h1>
          <p className="lede" style={{ marginTop: 20 }}>Questions about an API, a validator you wish existed, volume pricing, or a problem with a report. We read every message.</p>
          <p>Or email <a href="mailto:spreadrun@gmail.com">spreadrun@gmail.com</a>.</p>
          <p className="small muted">If you are writing about a specific API call, include its request id from the response or your account page.</p>
        </div>
        {status === 'success' ? (
          <div className="ok-box" role="status" style={{ alignSelf: 'start' }}>Message sent. We will reply by email.</div>
        ) : (
          <form className="demo" onSubmit={submit}>
            <div className="field"><label htmlFor="c-name">Name</label><input id="c-name" type="text" required value={form.name} onChange={set('name')} autoComplete="name" /></div>
            <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></div>
            <div className="field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" required value={form.message} onChange={set('message')} style={{ fontFamily: 'var(--sans)', fontSize: 15 }} /></div>
            <button className="btn" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending' : 'Send message'}</button>
            {status === 'error' && <div className="error-box" role="alert">The message did not send. Try again, or email spreadrun@gmail.com.</div>}
          </form>
        )}
      </div>
    </Layout>
  );
}
