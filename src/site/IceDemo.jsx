import { useState } from 'react';
import { ModeNote, Result, kb, runLabel, useCredits, useMode, useRunner } from './Demo.jsx';
import { dollars } from '../catalog.js';

// The ICE pre-check test form. The free demo runs the three published sample workbooks only (the demo endpoint
// refuses anything else). Your own workbook runs as the paid pre-check, so it needs a signed-in user whose credit
// covers the price. The workbook goes up as the request body; the fiscal year end goes in the query string.
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SAMPLES = [
  ['ice-template-clean', 'Sample: DCAA layout'],
  ['ice-own-format-clean', 'Sample: own format'],
  ['ice-errors', 'Sample with errors'],
];
const SAMPLE_FYE = '2026-06-30';
const MAX = 4_000_000;

export default function IceDemo({ api, sample }) {
  const credits = useCredits(api);
  const mode = useMode(api, credits);
  const [state, run] = useRunner(api, credits);
  const [file, setFile] = useState(null);          // { name, blob, sample }
  const [fye, setFye] = useState('');
  const [asOf, setAsOf] = useState('');
  const [problem, setProblem] = useState('');

  const loadSample = async ([base]) => {
    const blob = await fetch(`/samples/${base}.xlsx`).then((r) => r.blob());
    setFile({ name: `${base}.xlsx`, blob, sample: true });
    setFye(SAMPLE_FYE);
    setProblem('');
  };
  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setProblem('');
    if (/\.xls$/i.test(f.name)) {
      setFile(null);
      setProblem('This is an .xls file (Excel 97 to 2003 format). This version checks .xlsx only: open it in Excel, choose Save As, pick Excel Workbook (.xlsx), and upload that.');
      return;
    }
    if (f.size > MAX) {
      setFile(null);
      setProblem(`This workbook is ${(f.size / 1e6).toFixed(1)} MB. The limit is 4 MB. Remove data tabs the schedules do not need, or save the schedules alone as a new .xlsx.`);
      return;
    }
    setFile({ name: f.name, blob: f, sample: false });
  };
  const own = file && !file.sample;
  const blocked = own && !mode.paid;
  const ready = !!file && /^\d{4}-\d{2}-\d{2}$/.test(fye) && !blocked;
  const submit = (e) => {
    e.preventDefault();
    if (!ready) return;
    const q = new URLSearchParams({ fiscalYearEnd: fye, ...(asOf ? { asOf } : {}) });
    run({ paid: own ? true : false, body: file.blob, contentType: XLSX, query: `?${q}` });
  };

  return (
    <div className="split">
      <form className="demo" onSubmit={submit} style={{ minWidth: 0 }}>
        <ModeNote api={api} credits={credits} mode={mode} demoLimits="the three sample workbooks, 10 runs a day" />
        <div className="btn-row" style={{ margin: '0 0 16px' }}>
          {SAMPLES.map((s) => <button key={s[0]} type="button" className="btn secondary small" onClick={() => loadSample(s)}>{s[1]}</button>)}
        </div>
        <div className="field">
          <label htmlFor="ice-file">Incurred cost submission (.xlsx, up to 4 MB)</label>
          <input id="ice-file" type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={pick} />
          <span className="hint">Any layout: the DCAA ICE model or your own workbook, as long as each schedule A to O is on its own tab. Name tabs A to O (or "Schedule B" and so on), or give each sheet a title that says which schedule it is.</span>
        </div>
        {file && <p className="small">Selected: <code>{file.name}</code> ({kb(file.blob.size)}){file.sample ? ', a published sample' : ''}</p>}
        <div className="wh-grid" style={{ minWidth: 0 }}>
          <div className="field" style={{ margin: 0, minWidth: 0 }}>
            <label htmlFor="ice-fye">Fiscal year end</label>
            <input id="ice-fye" type="date" value={fye} onChange={(e) => setFye(e.target.value)} required />
          </div>
          <div className="field" style={{ margin: 0, minWidth: 0 }}>
            <label htmlFor="ice-asof">Measure the deadline from (optional)</label>
            <input id="ice-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </div>
        </div>
        <span className="hint small" style={{ display: 'block', margin: '6px 0 12px' }}>The submission is due within 6 months after the fiscal year end. Leave the second date blank to measure from today.</span>
        <p className="small muted" style={{ margin: '0 0 12px' }}>Processed in memory and not stored. The report names tabs and cells and shows amounts; it never repeats names, addresses or contract numbers from the workbook.</p>
        {blocked && (
          <div className="note" style={{ margin: '0 0 12px' }} role="status">
            <p style={{ margin: 0 }}>
              <b>Checking your own submission is a paid pre-check: {dollars(api.priceCents)}.</b>{' '}
              {credits.status === 'signed-in' && credits.canPay
                ? <>Untick "Use the free demo instead" to run it from your credit.</>
                : credits.status === 'signed-in'
                  ? <>Your credit ({dollars(credits.balanceCents)}) is below that. <a href="/account">Buy credits</a>, then run it here.</>
                  : <><a href="/account">Sign in and buy credits</a> to run it here, or use the API.</>}
              {' '}The free demo runs the sample workbooks: load one above to try it.
            </p>
          </div>
        )}
        {problem && <div className="error-box" role="alert" style={{ margin: '0 0 12px' }}>{problem}</div>}
        <button className="btn" type="submit" disabled={!ready || state.phase === 'running'}>
          {file?.sample ? (state.phase === 'running' ? 'Checking' : 'Run the sample (free)') : runLabel(mode.paid, api, 'Pre-check the submission', 'Checking', state.phase === 'running')}
        </button>
        <div className="status-line" aria-live="polite">
          {state.phase === 'running' && 'Reading every schedule, recomputing the totals and checking the ties.'}
          {state.phase === 'done' && `Done. ${state.report.summary}${state.paid ? ` Charged ${dollars(api.priceCents)}.` : ''}`}
        </div>
        {state.phase === 'error' && <div className="error-box" role="alert">{state.error}</div>}
      </form>
      <div style={{ minWidth: 0 }}><Result state={state} kind="ice" sample={sample} sampleLabel="Invented contractor with planted errors" /></div>
    </div>
  );
}
