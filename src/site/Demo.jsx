import { useState } from 'react';
import ReportSheet from './ReportSheet.jsx';

const kb = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

async function runDemo(slug, body, contentType) {
  const res = await fetch(`/api/demo/${slug}`, { method: 'POST', headers: { 'Content-Type': contentType }, body });
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) {
    const msg = data?.error?.message || `The demo endpoint returned HTTP ${res.status}.`;
    throw new Error(msg);
  }
  if (window.gtag) window.gtag('event', 'demo_run', { api: slug, status: data.report.status });
  return data.report;
}

function useRunner(slug, kind) {
  const [state, setState] = useState({ phase: 'idle', report: null, error: '' });
  const run = async (body, contentType) => {
    setState({ phase: 'running', report: null, error: '' });
    try {
      const report = await runDemo(slug, body, contentType);
      setState({ phase: 'done', report, error: '' });
    } catch (e) {
      setState({ phase: 'error', report: null, error: e.message });
    }
  };
  return [state, run, kind];
}

function Result({ state, kind, sample, sampleLabel }) {
  if (state.phase === 'done') return <ReportSheet kind={kind} report={state.report} label="Your report" sub="Live result from the demo endpoint" />;
  return <ReportSheet kind={kind} report={sample} label="Sample report" sub={sampleLabel} />;
}

export function ClinicalDemo({ sample, maxBytes }) {
  const [studies, setStudies] = useState('');
  const [outcomes, setOutcomes] = useState('');
  const [state, run] = useRunner('clinical-trial-table-validator', 'clinical');

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
  const tooBig = new Blob([body]).size > maxBytes;
  const submit = (e) => {
    e.preventDefault();
    run(body, 'application/json');
  };

  return (
    <div className="split">
      <form className="demo" onSubmit={submit} aria-describedby="clin-demo-note">
        <p id="clin-demo-note" className="small muted">Free, no account. Up to {kb(maxBytes)} per run and 10 runs a day. Paste CSV, upload files, or load a synthetic sample.</p>
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
          {state.phase === 'running' ? 'Running audit' : 'Run audit'}
        </button>
        <div className="status-line" aria-live="polite">
          {state.phase === 'running' && 'Auditing both tables.'}
          {state.phase === 'done' && `Done. ${state.report.issueCount} findings.`}
        </div>
        {tooBig && <div className="error-box">These tables are over the {kb(maxBytes)} demo limit. Use the API with a key for up to 4.4 MB.</div>}
        {state.phase === 'error' && <div className="error-box" role="alert">{state.error}</div>}
      </form>
      <div><Result state={state} kind="clinical" sample={sample} sampleLabel="Synthetic tables with six kinds of defect" /></div>
    </div>
  );
}

const SAMPLES = [
  ['mrf-valid-tall.csv', 'Valid tall CSV', 'text/csv'],
  ['mrf-valid.json', 'Valid JSON', 'application/json'],
  ['mrf-defective.json', 'JSON with an error', 'application/json'],
];

export function MrfDemo({ sample, maxBytes }) {
  const [file, setFile] = useState(null); // { name, blob, type }
  const [state, run] = useRunner('hospital-mrf-validator', 'mrf');

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile({ name: f.name, blob: f, type: f.name.endsWith('.json') ? 'application/json' : f.name.endsWith('.gz') ? 'application/gzip' : 'text/csv' });
  };
  const loadSample = async ([path, , type]) => {
    const blob = await fetch(`/samples/${path}`).then((r) => r.blob());
    setFile({ name: path, blob, type });
  };
  const tooBig = file && file.blob.size > maxBytes;
  const submit = (e) => {
    e.preventDefault();
    if (file) run(file.blob, file.type);
  };

  return (
    <div className="split">
      <form className="demo" onSubmit={submit}>
        <p className="small muted">Free, no account. Files up to {kb(maxBytes)}, the first 100 records, 10 runs a day. JSON, tall CSV, wide CSV or gzip of any of them.</p>
        <div className="field">
          <label htmlFor="mrf-file">Price file</label>
          <input id="mrf-file" type="file" accept=".json,.csv,.gz,application/json,text/csv,application/gzip" onChange={pick} />
          <span className="hint">The file is processed in memory and not stored.</span>
        </div>
        <div className="btn-row" style={{ margin: '0 0 16px' }}>
          {SAMPLES.map((s) => (
            <button key={s[0]} type="button" className="btn secondary small" onClick={() => loadSample(s)}>{s[1]}</button>
          ))}
        </div>
        {file && <p className="small">Selected: <code>{file.name}</code> ({kb(file.blob.size)})</p>}
        <button className="btn" type="submit" disabled={!file || state.phase === 'running' || tooBig}>
          {state.phase === 'running' ? 'Validating' : 'Validate file'}
        </button>
        <div className="status-line" aria-live="polite">
          {state.phase === 'running' && 'Checking the file against the CMS v3.0.0 schema and templates.'}
          {state.phase === 'done' && `Done. ${state.report.file.recordsInspected} ${state.report.file.recordsInspected === 1 ? 'record' : 'records'} inspected.`}
        </div>
        {tooBig && <div className="error-box">This file is over the {kb(maxBytes)} demo limit. Compress it with gzip or use the API with a key (up to 4.4 MB per upload).</div>}
        {state.phase === 'error' && <div className="error-box" role="alert">{state.error}</div>}
      </form>
      <div><Result state={state} kind="mrf" sample={sample} sampleLabel="Synthetic JSON file with a bad last_updated_on date" /></div>
    </div>
  );
}
