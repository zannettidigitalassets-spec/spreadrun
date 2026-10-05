import { useState } from 'react';
import { ModeNote, Result, kb, runLabel, useCredits, useMode, useRunner } from './Demo.jsx';
import { dollars } from '../catalog.js';
import table from '../../pylib/spreadrun_api/validators/cmmc/requirements.json';

// The CMMC test form. Two ways in: walk through the 110 requirements here, or upload the CSV you already keep.
// Either way the form sends one JSON package; the score is computed on the server, not in the browser.

export const REQS = table.requirements;
export const FAMILIES = table.families;
const BY_FAMILY = Object.keys(FAMILIES).map((f) => [f, REQS.filter((r) => r.family === f)]);
const STATUS_OPTIONS = [['MET', 'MET'], ['NOT MET', 'NOT MET'], ['NOT APPLICABLE', 'N/A']];

const SAMPLES = [
  ['cmmc-clean', 'Sample: 110'],
  ['cmmc-conditional', 'Sample: conditional'],
  ['cmmc-errors', 'Sample with errors'],
];

const emptyMeta = () => ({
  assessmentDate: '', claimedScore: '', cageCodes: '', statusDate: '',
  scopeDefined: false, sspInPlace: false, poamInPlace: false,
  affirmingOfficialIdentified: false, titleAndContactProvided: false, statementAffirmed: false, affirmationDate: '',
});

function parseCsv(text) {
  const out = {};
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines.slice(1)) {
    const [id, status] = line.split(',').map((c) => (c || '').trim());
    const rid = (id || '').replace(/^[A-Z]{2}\.L2-/i, '');
    const st = (status || '').toUpperCase().replace(/[^A-Z]/g, '');
    const norm = { MET: 'MET', NOTMET: 'NOT MET', PARTIAL: 'PARTIAL', NOTAPPLICABLE: 'NOT APPLICABLE', NA: 'NOT APPLICABLE' }[st];
    if (rid && norm) out[rid] = norm;
  }
  return out;
}

export default function CmmcDemo({ api, sample }) {
  const credits = useCredits(api);
  const mode = useMode(api, credits);
  const [state, run] = useRunner(api, credits);
  const [input, setInput] = useState('form');
  const [results, setResults] = useState({});
  const [csv, setCsv] = useState('');
  const [meta, setMeta] = useState(emptyMeta);
  const answered = REQS.filter((r) => results[r.id]).length;

  const setResult = (id) => (e) => {
    const v = e.target.value;
    setResults((prev) => ({ ...prev, [id]: v }));
  };
  const setField = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setMeta((prev) => ({ ...prev, [k]: v }));
  };
  const allMet = () => setResults(Object.fromEntries(REQS.map((r) => [r.id, 'MET'])));

  const loadSample = async ([base]) => {
    const p = await fetch(`/samples/${base}.json`).then((r) => r.json());
    const a = p.assessment;
    const f = p.affirmation || {};
    setMeta({
      assessmentDate: a.assessmentDate || '', claimedScore: a.claimedScore ?? '', cageCodes: (a.cageCodes || []).join(', '),
      statusDate: a.statusDate || '', scopeDefined: !!a.scopeDefined, sspInPlace: !!a.sspInPlace, poamInPlace: !!a.poamInPlace,
      affirmingOfficialIdentified: !!f.affirmingOfficialIdentified, titleAndContactProvided: !!f.titleAndContactProvided,
      statementAffirmed: !!f.statementAffirmed, affirmationDate: f.affirmationDate || '',
    });
    if (p.requirementsCsv) {
      setCsv(p.requirementsCsv);
      setResults(parseCsv(p.requirementsCsv));
    } else {
      setResults(Object.fromEntries(p.requirements.map((r) => [r.id, r.status])));
      setCsv(['requirement,status', ...p.requirements.map((r) => `${r.id},${r.status}`)].join('\n'));
    }
  };

  const loadFile = async (e) => {
    const file = e.target.files?.[0];
    if (file) setCsv(await file.text());
  };

  const body = () => {
    const cage = meta.cageCodes.split(/[\s,;]+/).filter(Boolean);
    const assessment = {
      level: 2, scopeDefined: meta.scopeDefined, poamInPlace: meta.poamInPlace, cageCodes: cage,
    };
    // An unticked box is "not confirmed", not "no SSP": the report asks for confirmation instead of refusing a score.
    if (meta.sspInPlace) assessment.sspInPlace = true;
    if (meta.assessmentDate) assessment.assessmentDate = meta.assessmentDate;
    if (meta.statusDate) assessment.statusDate = meta.statusDate;
    if (String(meta.claimedScore).trim() !== '') {
      const n = Number(meta.claimedScore);
      assessment.claimedScore = Number.isInteger(n) ? n : String(meta.claimedScore);
    }
    const affirmation = {
      affirmingOfficialIdentified: meta.affirmingOfficialIdentified,
      titleAndContactProvided: meta.titleAndContactProvided,
      statementAffirmed: meta.statementAffirmed,
    };
    if (meta.affirmationDate) affirmation.affirmationDate = meta.affirmationDate;
    const p = { assessment, affirmation };
    if (input === 'csv') p.requirementsCsv = csv;
    else p.requirements = REQS.filter((r) => results[r.id]).map((r) => ({ id: r.id, status: results[r.id] }));
    return JSON.stringify(p);
  };

  const ready = input === 'csv' ? csv.trim().length > 0 : answered > 0;
  const size = ready ? new Blob([body()]).size : 0;
  const tooBig = size > mode.maxBytes;
  const submit = (e) => {
    e.preventDefault();
    if (ready) run({ paid: mode.paid, body: body(), contentType: 'application/json' });
  };
  const check = (k, label) => (
    <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '0 0 8px' }}>
      <input type="checkbox" checked={meta[k]} onChange={setField(k)} style={{ marginTop: 3 }} />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="split">
      <form className="demo" onSubmit={submit}>
        <ModeNote api={api} credits={credits} mode={mode} demoLimits={`up to ${kb(api.demoMaxBodyBytes)} per run, 10 runs a day`} />
        <div className="btn-row" style={{ margin: '0 0 16px' }}>
          {SAMPLES.map((s) => <button key={s[0]} type="button" className="btn secondary small" onClick={() => loadSample(s)}>{s[1]}</button>)}
        </div>

        <h3 style={{ marginTop: 0 }}>Assessment and SPRS details</h3>
        <div className="wh-grid">
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="cmmc-date">Assessment date</label>
            <input id="cmmc-date" type="date" value={meta.assessmentDate} onChange={setField('assessmentDate')} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="cmmc-claimed">Score you plan to post</label>
            <input id="cmmc-claimed" type="text" inputMode="numeric" value={meta.claimedScore} onChange={setField('claimedScore')} placeholder="Optional" />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="cmmc-cage">CAGE codes</label>
            <input id="cmmc-cage" type="text" value={meta.cageCodes} onChange={setField('cageCodes')} placeholder="Comma separated" />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="cmmc-status-date">CMMC Status Date</label>
            <input id="cmmc-status-date" type="date" value={meta.statusDate} onChange={setField('statusDate')} />
          </div>
        </div>
        {check('scopeDefined', 'The CMMC Assessment Scope (every asset assessed) is defined.')}
        {check('sspInPlace', 'A system security plan covering every system in scope is in place.')}
        {check('poamInPlace', 'A POA&M is in place for every requirement that is not MET.')}

        <h3>Affirmation</h3>
        {check('affirmingOfficialIdentified', 'The Affirming Official (the senior official responsible for CMMC compliance) is named.')}
        {check('titleAndContactProvided', 'Their title and contact information are included.')}
        {check('statementAffirmed', 'They affirm that all applicable requirements are implemented and will stay implemented.')}
        <div className="wh-grid">
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="cmmc-aff-date">Affirmation date</label>
            <input id="cmmc-aff-date" type="date" value={meta.affirmationDate} onChange={setField('affirmationDate')} />
          </div>
        </div>
        <p className="small muted">We never ask for names. Each box is a yes or no.</p>

        <h3>Requirement results</h3>
        <div className="code-tabs" role="tablist" style={{ marginBottom: 12 }}>
          <button type="button" role="tab" aria-selected={input === 'form'} onClick={() => setInput('form')}>Answer here</button>
          <button type="button" role="tab" aria-selected={input === 'csv'} onClick={() => setInput('csv')}>Upload a CSV</button>
        </div>

        {input === 'form' ? (
          <div>
            <p className="small" style={{ margin: '0 0 10px' }}>
              <b>{answered}</b> of 110 answered. <button type="button" className="linklike" onClick={allMet}>Start with all MET</button>, then change the exceptions.
              PARTIAL is only offered where the method gives partial credit.
            </p>
            {BY_FAMILY.map(([fam, reqs]) => {
              const open = reqs.filter((r) => results[r.id] && results[r.id] !== 'MET').length;
              return (
                <details key={fam} className="cmmc-family">
                  <summary>{FAMILIES[fam]} <span className="muted">({reqs.length}{open ? `, ${open} not MET or N/A` : ''})</span></summary>
                  {reqs.map((r) => (
                    <div className="cmmc-req" key={r.id}>
                      <label htmlFor={`req-${r.id}`}><code>{r.id}</code> {r.label}</label>
                      <select id={`req-${r.id}`} value={results[r.id] || ''} onChange={setResult(r.id)}>
                        <option value="">Choose</option>
                        {STATUS_OPTIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                        {r.partialPoints ? <option value="PARTIAL">PARTIAL</option> : null}
                      </select>
                      {r.partialMeans && <span className="hint small muted">PARTIAL: {r.partialMeans}</span>}
                    </div>
                  ))}
                </details>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="field">
              <label htmlFor="cmmc-file">CSV file</label>
              <span className="hint">One row per requirement with a header row: <code>requirement,status</code>. Status is MET, NOT MET, NOT APPLICABLE, or PARTIAL for 3.5.3 and 3.13.11. <a href="/samples/cmmc-template.csv">Download the template</a>.</span>
              <input id="cmmc-file" type="file" accept=".csv,text/csv" onChange={loadFile} />
            </div>
            <div className="field">
              <label htmlFor="cmmc-csv">Or paste it</label>
              <textarea id="cmmc-csv" value={csv} onChange={(e) => setCsv(e.target.value)} spellCheck={false} style={{ minHeight: 200 }} />
            </div>
          </div>
        )}

        <p className="small muted" style={{ margin: '12px 0' }}>Processed in memory and not stored. Reports never repeat your CAGE codes, dates or scores you entered.</p>
        <button className="btn" type="submit" disabled={!ready || state.phase === 'running' || tooBig}>
          {runLabel(mode.paid, api, 'Verify the score', 'Verifying', state.phase === 'running')}
        </button>
        <div className="status-line" aria-live="polite">
          {state.phase === 'running' && 'Recomputing the score and checking the package.'}
          {state.phase === 'done' && `Done. ${state.report.findingCount} ${state.report.findingCount === 1 ? 'finding' : 'findings'}.${state.paid ? ` Charged ${dollars(api.priceCents)}.` : ''}`}
        </div>
        {tooBig && <div className="error-box">This package is over the {kb(mode.maxBytes)} limit for this mode.</div>}
        {state.phase === 'error' && <div className="error-box" role="alert">{state.error}</div>}
      </form>
      <div><Result state={state} kind="cmmc" sample={sample} sampleLabel="Invented contractor with planted errors" /></div>
    </div>
  );
}
