import { useState } from 'react';
import { ModeNote, Result, kb, runLabel, useCredits, useMode, useRunner } from './Demo.jsx';
import { dollars } from '../catalog.js';

// The COBRA test form: paste the notice or upload a PDF or DOCX, give the dates, run. The checks run on the server.
// The free demo runs the three sample notices only, sent exactly as published (the demo endpoint refuses anything
// else). Your own notice runs as a paid check, so it needs a signed-in user whose credit covers the price.

const SAMPLES = [
  ['cobra-election-clean', 'Sample election notice'],
  ['cobra-election-errors', 'Sample with errors'],
  ['cobra-general-clean', 'Sample general notice'],
];

const EVENTS = [
  ['termination', 'End of employment'],
  ['reduction-of-hours', 'Reduction in hours'],
  ['death', 'Death of the employee'],
  ['medicare-entitlement', 'Employee entitled to Medicare'],
  ['bankruptcy', 'Employer bankruptcy (retiree coverage)'],
  ['divorce', 'Divorce'],
  ['legal-separation', 'Legal separation'],
  ['dependent-child', 'Child loses dependent status'],
];
const BENEFICIARY_REPORTED = ['divorce', 'legal-separation', 'dependent-child'];

const empty = () => ({
  noticeType: 'election', eventType: 'termination', eventDate: '', lossDate: '', noticeDate: '', notifiedDate: '',
  coverageStartDate: '', employerIsAdministrator: true, periodStartsAtLossOfCoverage: false,
});

const toBase64 = (buf) => {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

export default function CobraDemo({ api, sample }) {
  const credits = useCredits(api);
  const mode = useMode(api, credits);
  const [state, run] = useRunner(api, credits);
  const [f, setF] = useState(empty);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);   // { name, type, base64, size }
  const [fileError, setFileError] = useState('');
  // The sample loaded into the form, while it is unchanged: { name, text }. Any edit makes it your own notice.
  const [loaded, setLoaded] = useState(null);
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setLoaded(null);
    setF((prev) => ({ ...prev, [k]: v }));
  };
  const election = f.noticeType === 'election';
  const needsNotified = election && (BENEFICIARY_REPORTED.includes(f.eventType) || !f.employerIsAdministrator);

  const loadSample = async ([base]) => {
    const raw = await fetch(`/samples/${base}.json`).then((r) => r.text());
    const p = JSON.parse(raw);
    const ev = p.qualifyingEvent || {};
    setF({
      noticeType: p.noticeType, eventType: ev.type || 'termination', eventDate: ev.date || '', lossDate: ev.lossOfCoverageDate || '',
      noticeDate: p.noticeDate || '', notifiedDate: ev.administratorNotifiedDate || '', coverageStartDate: p.coverageStartDate || '',
      employerIsAdministrator: ev.employerIsAdministrator !== false, periodStartsAtLossOfCoverage: !!ev.periodStartsAtLossOfCoverage,
    });
    setText(p.noticeText);
    setFile(null);
    setLoaded({ name: base, text: raw });
  };

  const pickFile = async (e) => {
    setFileError('');
    const picked = e.target.files?.[0];
    if (!picked) return;
    setLoaded(null);
    const type = /\.pdf$/i.test(picked.name) ? 'pdf' : /\.docx$/i.test(picked.name) ? 'docx' : null;
    if (!type) { setFileError('Upload a PDF or a DOCX file, or paste the text.'); return; }
    if (picked.size > 3_000_000) { setFileError('The file is over 3 MB.'); return; }
    setFile({ name: picked.name, type, size: picked.size, base64: toBase64(await picked.arrayBuffer()) });
  };

  const body = () => {
    const p = { noticeType: f.noticeType };
    if (file) p.noticeFile = { type: file.type, base64: file.base64 };
    else p.noticeText = text;
    if (f.noticeDate) p.noticeDate = f.noticeDate;
    if (election) {
      p.qualifyingEvent = { type: f.eventType, employerIsAdministrator: f.employerIsAdministrator,
        periodStartsAtLossOfCoverage: f.periodStartsAtLossOfCoverage };
      if (f.eventDate) p.qualifyingEvent.date = f.eventDate;
      if (f.lossDate) p.qualifyingEvent.lossOfCoverageDate = f.lossDate;
      if (needsNotified && f.notifiedDate) p.qualifyingEvent.administratorNotifiedDate = f.notifiedDate;
    } else if (f.coverageStartDate) {
      p.coverageStartDate = f.coverageStartDate;
    }
    return JSON.stringify(p);
  };

  const ready = !!file || text.trim().length > 0;
  // A sample runs free for everyone. Your own notice runs paid, or not at all without enough credit.
  const own = ready && !loaded;
  const blocked = own && !mode.paid;
  const size = own ? new Blob([body()]).size : 0;
  const tooBig = size > api.maxBodyBytes;
  const submit = (e) => {
    e.preventDefault();
    if (loaded) run({ paid: false, body: loaded.text, contentType: 'application/json' });
    else if (own && mode.paid && !tooBig) run({ paid: true, body: body(), contentType: 'application/json' });
  };
  const date = (id, k, label, hint) => (
    <div className="field" style={{ margin: 0 }}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="date" value={f[k]} onChange={set(k)} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );

  return (
    <div className="split">
      <form className="demo" onSubmit={submit}>
        <ModeNote api={api} credits={credits} mode={mode} demoLimits="the three sample notices, 10 runs a day" />
        <div className="btn-row" style={{ margin: '0 0 16px' }}>
          {SAMPLES.map((s) => <button key={s[0]} type="button" className="btn secondary small" onClick={() => loadSample(s)}>{s[1]}</button>)}
        </div>

        <div className="wh-grid">
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="cobra-type">Notice</label>
            <select id="cobra-type" value={f.noticeType} onChange={set('noticeType')}>
              <option value="election">Election notice</option>
              <option value="general">General (initial) notice</option>
            </select>
          </div>
          {election ? (
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="cobra-event">Qualifying event</label>
              <select id="cobra-event" value={f.eventType} onChange={set('eventType')}>
                {EVENTS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </div>
          ) : date('cobra-cov-start', 'coverageStartDate', 'Plan coverage began')}
          {election && date('cobra-event-date', 'eventDate', 'Qualifying event date')}
          {election && date('cobra-loss-date', 'lossDate', 'Coverage ends (loss of coverage)')}
          {date('cobra-notice-date', 'noticeDate', 'Date the notice goes out', 'Blank means today.')}
          {needsNotified && date('cobra-notified', 'notifiedDate', 'Administrator notified on', 'The 14 days run from this date.')}
        </div>
        {election && (
          <>
            <label className="small" style={{ display: 'flex', gap: 8, margin: '0 0 8px' }}>
              <input type="checkbox" checked={f.employerIsAdministrator} onChange={set('employerIsAdministrator')} />
              The employer is also the plan administrator (44-day deadline)
            </label>
            <label className="small" style={{ display: 'flex', gap: 8, margin: '0 0 16px' }}>
              <input type="checkbox" checked={f.periodStartsAtLossOfCoverage} onChange={set('periodStartsAtLossOfCoverage')} />
              The plan starts the notice period at the loss of coverage, not the event
            </label>
          </>
        )}

        <div className="field">
          <label htmlFor="cobra-text">Notice text</label>
          <span className="hint">Paste the notice, or upload it below. A finished notice with names and addresses is fine: it is processed in memory and not stored.</span>
          <textarea id="cobra-text" value={text} onChange={(e) => { setText(e.target.value); setFile(null); setLoaded(null); }} spellCheck={false} style={{ minHeight: 220 }} disabled={!!file} />
        </div>
        <div className="field">
          <label htmlFor="cobra-file">Or upload a PDF or DOCX</label>
          <input id="cobra-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={pickFile} />
          {file && <span className="hint">{file.name} ({kb(file.size)}) will be checked instead of the text box. <button type="button" className="linklike" onClick={() => { setFile(null); setLoaded(null); }}>Remove</button></span>}
          {fileError && <span className="hint" style={{ color: 'var(--fail)' }}>{fileError}</span>}
        </div>

        <p className="small muted" style={{ margin: '0 0 12px' }}>Processed in memory and not stored. Reports never repeat text, amounts, names or dates from your notice.</p>
        {blocked && (
          <div className="note" style={{ margin: '0 0 12px' }} role="status">
            <p style={{ margin: 0 }}>
              <b>Checking your own notice is a paid run: {dollars(api.priceCents)}.</b>{' '}
              {credits.status === 'signed-in' && credits.canPay
                ? <>Untick "Use the free demo instead" to run it from your credit.</>
                : credits.status === 'signed-in'
                  ? <>Your credit ({dollars(credits.balanceCents)}) is below that. <a href="/account">Buy credits</a>, then run it here.</>
                  : <><a href="/account">Sign in and buy credits</a> to run it here, or use the API.</>}
              {' '}The free demo runs the sample notices: load one above to try it.
            </p>
          </div>
        )}
        <button className="btn" type="submit" disabled={!ready || blocked || state.phase === 'running' || tooBig}>
          {loaded ? (state.phase === 'running' ? 'Checking' : 'Run the sample (free)') : runLabel(mode.paid, api, 'Check the notice', 'Checking', state.phase === 'running')}
        </button>
        <div className="status-line" aria-live="polite">
          {state.phase === 'running' && 'Checking the content items, deadlines and stated terms.'}
          {state.phase === 'done' && `Done. ${state.report.findingCount} ${state.report.findingCount === 1 ? 'finding' : 'findings'}.${state.paid ? ` Charged ${dollars(api.priceCents)}.` : ''}`}
        </div>
        {tooBig && <div className="error-box">This notice is over the {kb(api.maxBodyBytes)} limit. Paste the text instead of the file.</div>}
        {state.phase === 'error' && <div className="error-box" role="alert">{state.error}</div>}
      </form>
      <div><Result state={state} kind="cobra" sample={sample} sampleLabel="Invented plan with planted errors" /></div>
    </div>
  );
}
