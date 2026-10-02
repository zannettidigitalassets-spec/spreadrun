import { useEffect, useState } from 'react';
import ReportSheet from './ReportSheet.jsx';
import { dollars } from '../catalog.js';

// Test forms on product pages. Two modes:
//   demo: anyone, free, small limits, 10 runs a day (POST /api/demo/<api>)
//   paid: a signed-in user whose credit covers this API's price. Full limits, charged per completed
//         report from their balance (POST /api/v1/<api> with their session token, no API key needed).

const kb = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

// Only load the sign-in library for visitors who have signed in before on this browser.
const hasStoredSession = () => {
  try {
    return Object.keys(window.localStorage).some((k) => /^sb-.+-auth-token$/.test(k));
  } catch {
    return false;
  }
};

export function useCredits(api) {
  const [credits, setCredits] = useState({ status: 'anon', session: null, balanceCents: 0 });
  useEffect(() => {
    if (!hasStoredSession()) return undefined;
    let cancelled = false;
    (async () => {
      const { supabase } = await import('../supabaseClient.js');
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session || cancelled) return;
      const res = await fetch('/api/account', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok || cancelled) return;
      const account = await res.json();
      setCredits({ status: 'signed-in', session, balanceCents: account.balanceCents });
    })().catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const canPay = credits.status === 'signed-in' && credits.balanceCents >= api.priceCents;
  const spent = (balanceCents) => setCredits((c) => ({ ...c, balanceCents }));
  return { ...credits, canPay, spent };
}

async function runValidation(api, { paid, session, body, contentType, query = '' }) {
  const url = `/api/${paid ? 'v1' : 'demo'}/${api.slug}${query}`;
  const headers = { 'Content-Type': contentType, ...(paid ? { Authorization: `Bearer ${session.access_token}` } : {}) };
  const res = await fetch(url, { method: 'POST', headers, body });
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) {
    throw new Error(data?.error?.message || `The ${paid ? 'API' : 'demo endpoint'} returned HTTP ${res.status}.`);
  }
  if (window.gtag) window.gtag('event', paid ? 'web_paid_run' : 'demo_run', { api: api.slug, status: data.report.status });
  return data;
}

function useRunner(api, credits) {
  const [state, setState] = useState({ phase: 'idle', report: null, error: '', paid: false });
  const run = async ({ paid, ...args }) => {
    setState({ phase: 'running', report: null, error: '', paid });
    try {
      const data = await runValidation(api, { paid, session: credits.session, ...args });
      if (paid && typeof data.balanceCents === 'number') credits.spent(data.balanceCents);
      setState({ phase: 'done', report: data.report, error: '', paid });
    } catch (e) {
      setState({ phase: 'error', report: null, error: e.message, paid });
    }
  };
  return [state, run];
}

// Which mode the form runs in, and the matching limits. A paying user can still choose the free demo.
function useMode(api, credits) {
  const [preferDemo, setPreferDemo] = useState(false);
  const paid = credits.canPay && !preferDemo;
  return { paid, preferDemo, setPreferDemo, maxBytes: paid ? api.maxBodyBytes : api.demoMaxBodyBytes };
}

export function ModeNote({ api, credits, mode, demoLimits }) {
  const price = dollars(api.priceCents);
  if (credits.canPay) {
    return (
      <div className="note" style={{ margin: '0 0 16px' }}>
        <p style={{ marginBottom: 8 }}>
          {mode.paid
            ? <>Signed in: full validation, <b>{price}</b> per completed report from your credit (<b>{dollars(credits.balanceCents)}</b> left). No demo limits.</>
            : <>Free demo mode: {demoLimits}. Nothing is charged.</>}
        </p>
        <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={mode.preferDemo} onChange={(e) => mode.setPreferDemo(e.target.checked)} />
          Use the free demo instead (no charge)
        </label>
      </div>
    );
  }
  if (credits.status === 'signed-in') {
    return (
      <p className="small muted">
        Free demo: {demoLimits}. Your credit ({dollars(credits.balanceCents)}) is below this check's {price} price.{' '}
        <a href="/account">Buy credits</a> to run full validations here, without demo limits.
      </p>
    );
  }
  return (
    <p className="small muted">
      Free demo, no account: {demoLimits}. For full validations from this form, <a href="/account">sign in and buy credits</a>: {price} per completed report, packs from $5.
    </p>
  );
}

function Result({ state, kind, sample, sampleLabel }) {
  if (state.phase === 'done') {
    return <ReportSheet kind={kind} report={state.report} label="Your report" sub={state.paid ? 'Full validation, paid from your credit' : 'Live result from the demo endpoint'} />;
  }
  return <ReportSheet kind={kind} report={sample} label="Sample report" sub={sampleLabel} />;
}

const runLabel = (paid, api, idle, busy, running) => (running ? busy : paid ? `${idle} (${dollars(api.priceCents)})` : idle);

export function ClinicalDemo({ api, sample }) {
  const [studies, setStudies] = useState('');
  const [outcomes, setOutcomes] = useState('');
  const credits = useCredits(api);
  const mode = useMode(api, credits);
  const [state, run] = useRunner(api, credits);

  const loadSample = async (which) => {
    const base = which === 'clean' ? 'clinical-pass' : 'clinical';
    const [s, o] = await Promise.all([
      fetch(`/samples/${base}-studies.csv`).then((r) => r.text()),
      fetch(`/samples/${base}-outcomes.csv`).then((r) => r.text()),
    ]);
    setStudies(s); setOutcomes(o);
  };
  const readFile = (set) => (e) => {
    const f = e.target.files?.[0];
    if (f) f.text().then(set);
  };
  const body = JSON.stringify({ studiesCsv: studies, outcomesCsv: outcomes });
  const tooBig = new Blob([body]).size > mode.maxBytes;
  const submit = (e) => {
    e.preventDefault();
    run({ paid: mode.paid, body, contentType: 'application/json' });
  };

  return (
    <div className="split">
      <form className="demo" onSubmit={submit}>
        <ModeNote api={api} credits={credits} mode={mode} demoLimits={`up to ${kb(api.demoMaxBodyBytes)} per run and 10 runs a day`} />
        <p className="small muted">Paste CSV, upload files, or load a synthetic sample.</p>
        <div className="btn-row" style={{ margin: '0 0 16px' }}>
          <button type="button" className="btn secondary small" onClick={() => loadSample('defects')}>Load sample with errors</button>
          <button type="button" className="btn secondary small" onClick={() => loadSample('clean')}>Load clean sample</button>
        </div>
        <div className="field">
          <label htmlFor="studies">Studies table (CSV)</label>
          <span className="hint">Columns: trial_id, condition, phase. One row per trial.</span>
          <input type="file" accept=".csv,text/csv" onChange={readFile(setStudies)} aria-label="Upload studies CSV" />
          <textarea id="studies" value={studies} onChange={(e) => setStudies(e.target.value)} spellCheck={false} />
        </div>
        <div className="field">
          <label htmlFor="outcomes">Outcomes table (CSV)</label>
          <span className="hint">Columns: trial_id, outcome_id, outcome_type, primary_endpoint, result_status, results_first_post_date.</span>
          <input type="file" accept=".csv,text/csv" onChange={readFile(setOutcomes)} aria-label="Upload outcomes CSV" />
          <textarea id="outcomes" value={outcomes} onChange={(e) => setOutcomes(e.target.value)} spellCheck={false} />
        </div>
        <button className="btn" type="submit" disabled={state.phase === 'running' || !studies.trim() || !outcomes.trim() || tooBig}>
          {runLabel(mode.paid, api, 'Run audit', 'Running audit', state.phase === 'running')}
        </button>
        <div className="status-line" aria-live="polite">
          {state.phase === 'running' && 'Auditing both tables.'}
          {state.phase === 'done' && `Done. ${state.report.issueCount} findings.${state.paid ? ` Charged ${dollars(api.priceCents)}.` : ''}`}
        </div>
        {tooBig && <div className="error-box">These tables are over the {kb(mode.maxBytes)} limit for this mode.{mode.paid ? '' : ' Sign in with credits, or use the API, for up to 4.4 MB.'}</div>}
        {state.phase === 'error' && <div className="error-box" role="alert">{state.error}</div>}
      </form>
      <div><Result state={state} kind="clinical" sample={sample} sampleLabel="Synthetic tables with six kinds of defect" /></div>
    </div>
  );
}

const MRF_SAMPLES = [
  ['mrf-valid-tall.csv', 'Valid tall CSV', 'text/csv'],
  ['mrf-valid.json', 'Valid JSON', 'application/json'],
  ['mrf-defective.json', 'JSON with an error', 'application/json'],
];

export function MrfDemo({ api, sample }) {
  const [file, setFile] = useState(null); // { name, blob, type }
  const [maxRecords, setMaxRecords] = useState(1000);
  const credits = useCredits(api);
  const mode = useMode(api, credits);
  const [state, run] = useRunner(api, credits);

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile({ name: f.name, blob: f, type: f.name.endsWith('.json') ? 'application/json' : f.name.endsWith('.gz') ? 'application/gzip' : 'text/csv' });
  };
  const loadSample = async ([path, , type]) => {
    const blob = await fetch(`/samples/${path}`).then((r) => r.blob());
    setFile({ name: path, blob, type });
  };
  const tooBig = file && file.blob.size > mode.maxBytes;
  const submit = (e) => {
    e.preventDefault();
    if (file) run({ paid: mode.paid, body: file.blob, contentType: file.type, query: mode.paid ? `?maxRecords=${maxRecords}` : '' });
  };

  return (
    <div className="split">
      <form className="demo" onSubmit={submit}>
        <ModeNote api={api} credits={credits} mode={mode} demoLimits={`files up to ${kb(api.demoMaxBodyBytes)}, the first 100 records, 10 runs a day`} />
        <p className="small muted">JSON, tall CSV, wide CSV or gzip of any of them.</p>
        <div className="field">
          <label htmlFor="mrf-file">Price file</label>
          <input id="mrf-file" type="file" accept=".json,.csv,.gz,application/json,text/csv,application/gzip" onChange={pick} />
          <span className="hint">The file is processed in memory and not stored.</span>
        </div>
        {mode.paid && (
          <div className="field">
            <label htmlFor="mrf-records">Records to inspect</label>
            <select id="mrf-records" value={maxRecords} onChange={(e) => setMaxRecords(Number(e.target.value))} style={{ maxWidth: 220 }}>
              {[100, 500, 1000].map((n) => <option key={n} value={n}>{n.toLocaleString()}</option>)}
            </select>
            <span className="hint">Same price at any setting.</span>
          </div>
        )}
        <div className="btn-row" style={{ margin: '0 0 16px' }}>
          {MRF_SAMPLES.map((s) => (
            <button key={s[0]} type="button" className="btn secondary small" onClick={() => loadSample(s)}>{s[1]}</button>
          ))}
        </div>
        {file && <p className="small">Selected: <code>{file.name}</code> ({kb(file.blob.size)})</p>}
        <button className="btn" type="submit" disabled={!file || state.phase === 'running' || tooBig}>
          {runLabel(mode.paid, api, 'Validate file', 'Validating', state.phase === 'running')}
        </button>
        <div className="status-line" aria-live="polite">
          {state.phase === 'running' && 'Checking the file against the CMS v3.0.0 schema and templates.'}
          {state.phase === 'done' && `Done. ${state.report.file.recordsInspected} ${state.report.file.recordsInspected === 1 ? 'record' : 'records'} inspected.${state.paid ? ` Charged ${dollars(api.priceCents)}.` : ''}`}
        </div>
        {tooBig && <div className="error-box">This file is over the {kb(mode.maxBytes)} limit for this mode.{mode.paid ? ' Compress it with gzip.' : ' Compress it with gzip, or sign in with credits for up to 4.4 MB.'}</div>}
        {state.phase === 'error' && <div className="error-box" role="alert">{state.error}</div>}
      </form>
      <div><Result state={state} kind="mrf" sample={sample} sampleLabel="Synthetic JSON file with a bad last_updated_on date" /></div>
    </div>
  );
}

// Synthetic URAR files (scripts/uad/make_fixtures.py). Their report is dated 2019, so the two rules on report age
// would warn against today's date: the samples are checked as of their signature date instead.
const UAD_SAMPLE_AS_OF = '2019-09-20';
const UAD_SAMPLES = [
  ['uad-pass.xml', 'Valid URAR (synthetic)'],
  ['uad-fail.xml', 'URAR with errors'],
];

export function UadDemo({ api, sample }) {
  const [file, setFile] = useState(null); // { name, blob }
  const [asOf, setAsOf] = useState('');
  const credits = useCredits(api);
  const mode = useMode(api, credits);
  const [state, run] = useRunner(api, credits);

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile({ name: f.name, blob: f }); setAsOf(''); }
  };
  const loadSample = async ([path]) => {
    const blob = await fetch(`/samples/${path}`).then((r) => r.blob());
    setFile({ name: path, blob });
    setAsOf(UAD_SAMPLE_AS_OF);
  };
  const tooBig = file && file.blob.size > mode.maxBytes;
  const submit = (e) => {
    e.preventDefault();
    if (!file) return;
    const isZip = file.name.toLowerCase().endsWith('.zip');
    run({ paid: mode.paid, body: file.blob, contentType: isZip ? 'application/zip' : 'application/xml', query: asOf ? `?asOf=${asOf}` : '' });
  };

  return (
    <div className="split">
      <form className="demo" onSubmit={submit}>
        <ModeNote api={api} credits={credits} mode={mode} demoLimits={`files up to ${kb(api.demoMaxBodyBytes)}, 10 runs a day`} />
        <p className="small muted">A UAD 3.6 URAR XML file, or the UAD 3.6 ZIP package (only its XML is checked).</p>
        <div className="field">
          <label htmlFor="uad-file">Appraisal file</label>
          <input id="uad-file" type="file" accept=".xml,.zip,application/xml,text/xml,application/zip" onChange={pick} />
          <span className="hint">Processed in memory and not stored. Replace borrower, owner and seller names first (see the Terms).</span>
        </div>
        <div className="btn-row" style={{ margin: '0 0 16px' }}>
          {UAD_SAMPLES.map((s) => (
            <button key={s[0]} type="button" className="btn secondary small" onClick={() => loadSample(s)}>{s[1]}</button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="uad-asof">Check date rules as of (optional)</label>
          <input id="uad-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} style={{ maxWidth: 220 }} />
          <span className="hint">Leave empty for today. Two rules compare the report's dates with this date: not in the future, not more than 367 days old.</span>
        </div>
        {file && <p className="small">Selected: <code>{file.name}</code> ({kb(file.blob.size)})</p>}
        <button className="btn" type="submit" disabled={!file || state.phase === 'running' || tooBig}>
          {runLabel(mode.paid, api, 'Check report', 'Checking', state.phase === 'running')}
        </button>
        <div className="status-line" aria-live="polite">
          {state.phase === 'running' && 'Checking against the UAD 3.6 delivery specification and compliance rules.'}
          {state.phase === 'done' && `Done. ${state.report.findingCount} ${state.report.findingCount === 1 ? 'finding' : 'findings'}.${state.paid ? ` Charged ${dollars(api.priceCents)}.` : ''}`}
        </div>
        {tooBig && <div className="error-box">This file is over the {kb(mode.maxBytes)} limit for this mode.{mode.paid ? ' Send the XML file instead of the whole package.' : ' Send the XML file instead of the package, or sign in with credits for up to 4.4 MB.'}</div>}
        {state.phase === 'error' && <div className="error-box" role="alert">{state.error}</div>}
      </form>
      <div><Result state={state} kind="uad" sample={sample} sampleLabel="Synthetic URAR file with six deliberate errors" /></div>
    </div>
  );
}
