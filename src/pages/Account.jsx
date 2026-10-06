import { useEffect, useState, useCallback } from 'react';
import Layout from '../site/Layout.jsx';
import { dollars, APIS } from '../catalog.js';
import { creditPackConversion, keepClickIds } from '../site/ads.js';

// Client-only account page: Supabase email-code sign-in, API keys, credits, usage.
// All money and key operations go through /api/* with the Supabase session token; nothing is trusted from the browser.

let supabasePromise;
const getSupabase = () => (supabasePromise ||= import('../supabaseClient.js').then((m) => m.supabase));
const apiName = (slug) => APIS.find((a) => a.slug === slug)?.name || slug;
const when = (iso) => (iso ? new Date(iso).toLocaleString() : 'never');

async function api(session, path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Request failed (HTTP ${res.status}).`);
  return data;
}

export default function Account() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    let sub;
    getSupabase().then((sb) => {
      sb.auth.getSession().then(({ data }) => setSession(data.session || null));
      sub = sb.auth.onAuthStateChange((_e, s) => setSession(s || null)).data.subscription;
    });
    return () => sub?.unsubscribe();
  }, []);

  return (
    <Layout path="/account">
      <div className="wrap section" style={{ paddingTop: 40 }}>
        <h1>Account</h1>
        {session === undefined && <p className="muted" style={{ marginTop: 20 }}>Loading your account.</p>}
        {session === null && <SignIn />}
        {session && <Dashboard session={session} />}
      </div>
    </Layout>
  );
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const send = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const sb = await getSupabase();
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setErr(error.message); else setStep('code');
  };
  const verify = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const sb = await getSupabase();
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setErr('That code did not work. Check the latest email, or send a new code.');
  };

  return (
    <div className="split" style={{ marginTop: 24 }}>
      <div>
        <p className="lede">Sign in with your email to create API keys, buy credits and see usage. No password: we email you a code.</p>
        {step === 'email' ? (
          <form onSubmit={send} className="demo" style={{ maxWidth: 440 }}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending code' : 'Email me a code'}</button>
            {err && <div className="error-box" role="alert">{err}</div>}
          </form>
        ) : (
          <form onSubmit={verify} className="demo" style={{ maxWidth: 440 }}>
            <p className="small">We sent a code to <b>{email}</b>.</p>
            <div className="field">
              <label htmlFor="code">Code</label>
              <input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="btn-row" style={{ marginTop: 0 }}>
              <button className="btn" type="submit" disabled={busy}>{busy ? 'Checking' : 'Sign in'}</button>
              <button className="btn secondary" type="button" onClick={() => { setStep('email'); setCode(''); }}>Use a different email</button>
            </div>
            {err && <div className="error-box" role="alert">{err}</div>}
          </form>
        )}
      </div>
      <div>
        <h2>What you get</h2>
        <ul>
          <li>API keys for every SpreadRun API.</li>
          <li>Prepaid credits that work on every API, packs from $5. Each API has its own price per run, from $0.25. Credits never expire.</li>
          <li>Full validations from the test form on each product page, paid from your credits.</li>
          <li>Usage for the last 30 days, per API.</li>
        </ul>
        <p className="small muted">Just trying things out? The test form on each <a href="/apis">product page</a> works without an account.</p>
      </div>
    </div>
  );
}

function Dashboard({ session }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [keyName, setKeyName] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try { const d = await api(session, '/api/account'); setData(d); setErr(''); return d; } catch (e) { setErr(e.message); return null; }
  }, [session]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const tidy = () => window.history.replaceState(null, '', keepClickIds('/account', window.location.search));
    if (q.get('purchase') === 'success') {
      setNotice('Payment received. Credits are added as soon as Stripe confirms it, usually within a few seconds.');
      // The credit pack conversion fires only once the webhook has recorded this Checkout session as paid.
      const sessionId = q.get('session_id') || '';
      tidy();
      let stopped = false;
      let timer;
      const poll = async (left) => {
        const d = await load();
        if (stopped) return;
        const r = creditPackConversion(sessionId, d?.purchases);
        if (r === 'pending' && left > 0) timer = setTimeout(() => poll(left - 1), 3000);
      };
      poll(8);
      return () => { stopped = true; clearTimeout(timer); };
    }
    load();
    if (q.get('purchase') === 'cancelled') {
      setNotice('Checkout was cancelled. Nothing was charged.');
      tidy();
    }
    return undefined;
  }, [load]);

  const act = (label, fn) => async (...args) => {
    setBusy(label); setErr('');
    try { await fn(...args); } catch (e) { setErr(e.message); }
    setBusy('');
  };

  const buy = act('buy', async (pack) => {
    if (window.gtag) window.gtag('event', 'begin_checkout', { pack });
    const { url } = await api(session, '/api/credits/checkout', { method: 'POST', body: JSON.stringify({ pack }) });
    window.location.href = url;
  });
  const createKey = act('key', async (e) => {
    e.preventDefault();
    const k = await api(session, '/api/keys', { method: 'POST', body: JSON.stringify({ name: keyName || 'Default' }) });
    setNewKey(k); setKeyName(''); load();
  });
  const revoke = act('revoke', async (id) => {
    if (!window.confirm('Revoke this key? Calls using it will stop working immediately.')) return;
    await api(session, `/api/keys?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    load();
  });
  const portal = act('portal', async () => {
    const { url } = await api(session, '/api/customer-portal', { method: 'POST', body: '{}' });
    window.location.href = url;
  });
  const signOut = async () => (await getSupabase()).auth.signOut();

  if (!data) return (<>{err ? <div className="error-box" role="alert">{err}</div> : <p className="muted" style={{ marginTop: 20 }}>Loading your account.</p>}</>);

  const active = data.keys.filter((k) => !k.revoked_at);
  return (
    <div style={{ marginTop: 16 }}>
      <p className="muted">Signed in as <b>{data.email}</b>. <button className="btn secondary small" type="button" onClick={signOut}>Sign out</button></p>
      {notice && <div className="ok-box" role="status">{notice}</div>}
      {err && <div className="error-box" role="alert">{err}</div>}

      <section className="section" aria-labelledby="bal">
        <h2 id="bal">Credits</h2>
        <p style={{ fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}><b>{dollars(data.balanceCents)}</b> <span className="muted" style={{ fontSize: 16 }}>of credit, usable on every API</span></p>
        <p className="small muted">Enough for {APIS.map((a) => `${Math.floor(data.balanceCents / a.priceCents)} ${a.name} runs at ${dollars(a.priceCents)}`).join(', or ')}.</p>
        <div className="packs">
          {data.packs.map((p) => (
            <div className="pack" key={p.id}>
              <div className="amt">{dollars(p.priceCents)}</div>
              <div style={{ margin: '0 0 12px' }}>{Math.floor(p.creditCents / data.pricePerCallCents)} standard runs</div>
              <button className="btn small" type="button" disabled={!!busy} onClick={() => buy(p.id)}>Buy {dollars(p.priceCents)} pack</button>
            </div>
          ))}
        </div>
        <p className="small muted">Paid through Stripe. Credits never expire. Charged only for completed runs.{' '}
          {data.hasBillingHistory && <button className="btn secondary small" type="button" disabled={!!busy} onClick={portal}>Receipts and saved card</button>}
        </p>
      </section>

      <section className="section" aria-labelledby="keys">
        <h2 id="keys">API keys</h2>
        {newKey && (
          <div className="ok-box" role="status">
            <p style={{ margin: '0 0 8px' }}><b>Copy your new key now.</b> It is shown once; we only keep a hash of it.</p>
            <pre className="code" style={{ margin: '0 0 8px' }}><code>{newKey.key}</code></pre>
            <div className="btn-row" style={{ marginTop: 0 }}>
              <button className="btn small" type="button" onClick={() => navigator.clipboard?.writeText(newKey.key)}>Copy key</button>
              <button className="btn secondary small" type="button" onClick={() => setNewKey(null)}>I saved it</button>
            </div>
          </div>
        )}
        <form onSubmit={createKey} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', margin: '16px 0', maxWidth: 560 }}>
          <div className="field" style={{ flex: 1, minWidth: 220, margin: 0 }}>
            <label htmlFor="kname">Key name</label>
            <input id="kname" type="text" placeholder="For example: nightly pipeline" value={keyName} maxLength={60} onChange={(e) => setKeyName(e.target.value)} />
          </div>
          <button className="btn" type="submit" disabled={!!busy || active.length >= 10}>Create key</button>
        </form>
        {data.keys.length === 0 ? <p className="muted">No keys yet. Create one to call the API.</p> : (
          <div className="table-scroll">
            <table className="doc-table">
              <thead><tr><th>Name</th><th>Key</th><th>Created</th><th>Last used</th><th></th></tr></thead>
              <tbody>
                {data.keys.map((k) => (
                  <tr key={k.id}>
                    <td>{k.name}</td>
                    <td><code>{k.key_prefix}...</code></td>
                    <td>{when(k.created_at)}</td>
                    <td>{when(k.last_used_at)}</td>
                    <td>{k.revoked_at ? <span className="muted">Revoked</span> : <button className="btn secondary small" type="button" disabled={!!busy} onClick={() => revoke(k.id)}>Revoke</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small">How to use a key: <a href="/docs#auth">authentication docs</a>.</p>
      </section>

      <section className="section" aria-labelledby="usage">
        <h2 id="usage">Usage, last 30 days</h2>
        {Object.keys(data.usage30d.byApi).length === 0 ? <p className="muted">No paid calls yet.</p> : (
          <table className="doc-table">
            <thead><tr><th>API</th><th>Completed runs</th><th>Charged</th><th>Not charged</th></tr></thead>
            <tbody>
              {Object.entries(data.usage30d.byApi).map(([slug, u]) => (
                <tr key={slug}><td>{apiName(slug)}</td><td>{u.completed}</td><td>{dollars(u.chargedCents)}</td><td>{u.notCharged}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {data.usage30d.recent.length > 0 && (
          <div className="table-scroll">
            <table className="doc-table">
              <thead><tr><th>Time</th><th>API</th><th>Result</th><th>Charged</th><th>Request id</th></tr></thead>
              <tbody>
                {data.usage30d.recent.map((c) => (
                  <tr key={c.request_id}>
                    <td>{when(c.created_at)}</td><td>{apiName(c.api)}</td>
                    <td>{c.outcome === 'completed' ? c.report_status : c.outcome.replace(/_/g, ' ')}</td>
                    <td>{dollars(c.charged_cents)}</td><td><code>{c.request_id.slice(0, 8)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.purchases.length > 0 && (
          <>
            <h3 style={{ marginTop: 24 }}>Purchases</h3>
            <table className="doc-table">
              <thead><tr><th>Date</th><th>Pack</th><th>Paid</th></tr></thead>
              <tbody>{data.purchases.map((p, i) => <tr key={i}><td>{when(p.created_at)}</td><td>{p.pack}</td><td>{dollars(p.amount_paid_cents)}</td></tr>)}</tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}
