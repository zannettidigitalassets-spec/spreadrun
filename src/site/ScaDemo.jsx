import { useState } from 'react';
import { ModeNote, kb, runLabel, useCredits, useMode, useRunner } from './Demo.jsx';
import ReportSheet from './ReportSheet.jsx';
import { dollars } from '../catalog.js';
import config from '../../pylib/spreadrun_api/validators/sca/rates.json';

// The SCA H&W test form. Paste the employees table (or load a sample, or pick a CSV or .xlsx file), set the run
// parameters, and the server does the math. The free demo takes any pasted CSV of up to DEMO_ROWS employees; more
// than that, or a workbook, runs as a paid check for a signed-in user whose credit covers the price.
// Employee references never come back from the server: the table here joins them to the report by line number, in
// the browser, from the data the user entered.
export const RATES = config.rates;
export const RATE_MEMO = config.memo;
export const RATE_EFFECTIVE = config.effective;
const DEMO_ROWS = 10;
const SAMPLES = [['sca-errors', 'Sample with errors'], ['sca-clean', 'Clean sample']];
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// CSV records the way Python's csv module counts them: record n (from 1) is "line n" in the report.
export function csvRecords(text) {
  const out = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (quoted) {
      if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); out.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); out.push(row); }
  return out;
}

const REF_COLS = ['employee_ref', 'employee_id', 'employee', 'emp_id', 'id', 'ref', 'employee_number'];
const norm = (k) => String(k).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// { line: reference } and the number of employee rows, from pasted CSV.
export function readRefs(text) {
  const recs = csvRecords(text);
  const first = recs.findIndex((r) => r.some((c) => c.trim()));
  if (first < 0) return { refs: {}, rows: 0 };
  const col = recs[first].map(norm).findIndex((c) => REF_COLS.includes(c));
  const refs = {};
  let rows = 0;
  recs.forEach((r, i) => {
    if (i <= first || !r.some((c) => c.trim())) return;
    rows += 1;
    if (col >= 0 && r[col] && r[col].trim()) refs[i + 1] = r[col].trim();
  });
  return { refs, rows };
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

export function reportCsv(report, refs) {
  const lines = [['line', 'employee_ref', 'hours_counted', 'rate', 'required', 'furnished', 'not_creditable', 'shortfall', 'result']];
  for (const e of report.employees) {
    lines.push([e.line, refs[e.line] || '', e.hoursCounted, e.rate, e.required, e.furnished, e.notCreditable, e.shortfall, e.result]);
  }
  lines.push([]);
  lines.push(['status', report.status]);
  lines.push(['back_wage_exposure', report.totals.backWageExposure]);
  lines.push(['rate_memo', `${report.parameters.rateMemo}, effective ${report.parameters.rateEffective}`]);
  for (const x of report.recordkeeping) lines.push([`recordkeeping: ${x.label}`, x.status, x.lines.join(' ')]);
  for (const f of report.findings) lines.push(['finding', f.line, refs[f.line] || '', f.ruleId, f.message]);
  lines.push(['scope', report.scope]);
  return lines.map((l) => l.map(csvCell).join(',')).join('\n') + '\n';
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const defaults = () => ({ wdType: 'fixed', eo13706: 'yes', hawaii: false, periodWeeks: '1', hwRate: '', hwRateHphca: '' });

export default function ScaDemo({ api, sample, sampleCsv }) {
  const credits = useCredits(api);
  const mode = useMode(api, credits);
  const [state, run] = useRunner(api, credits);
  const [p, setP] = useState(defaults);
  const [csv, setCsv] = useState('');
  const [file, setFile] = useState(null);       // { name, bytes } for an .xlsx upload
  const [ranRefs, setRanRefs] = useState({});
  const set = (k) => (e) => setP({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const eo = p.eo13706 === 'yes';
  const defaultRate = RATES[eo ? 'eo13706' : 'standard'];
  const defaultHphca = RATES[eo ? 'hawaiiHphcaEo13706' : 'hawaiiHphca'];
  const { refs, rows } = readRefs(csv);
  const average = p.wdType === 'average';

  const loadSample = async ([base]) => {
    const s = await fetch(`/samples/${base}.json`).then((r) => r.json());
    setP({ ...defaults(), eo13706: s.parameters.eo13706 ? 'yes' : 'no', periodWeeks: String(s.parameters.periodWeeks || 1) });
    setCsv(s.employeesCsv);
    setFile(null);
  };
  const pickFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (/\.xlsx$/i.test(f.name)) setFile({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
    else { setFile(null); setCsv(await f.text()); }
  };
  const parameters = () => {
    const out = { wdType: 'fixed', eo13706: eo, hawaii: p.hawaii, periodWeeks: Number(p.periodWeeks) || p.periodWeeks };
    if (p.hwRate.trim()) out.hwRate = p.hwRate.trim();
    if (p.hawaii && p.hwRateHphca.trim()) out.hwRateHphca = p.hwRateHphca.trim();
    return out;
  };
  const body = () => JSON.stringify({ parameters: parameters(), employeesCsv: csv });
  const query = () => `?${new URLSearchParams(Object.entries(parameters()).map(([k, v]) => [k, String(v)])).toString()}`;

  // The demo takes pasted CSV of up to DEMO_ROWS employees. A workbook, or more rows, is the paid check.
  const ready = !average && (file ? true : rows > 0);
  const needsPaid = file !== null || rows > DEMO_ROWS;
  const blocked = ready && needsPaid && !mode.paid;
  const size = file ? file.bytes.length : new Blob([body()]).size;
  const tooBig = size > (mode.paid ? api.maxBodyBytes : api.demoMaxBodyBytes);
  const submit = (e) => {
    e.preventDefault();
    if (!ready || blocked || tooBig) return;
    setRanRefs(file ? {} : refs);
    if (file) run({ paid: true, body: file.bytes, contentType: XLSX, query: query() });
    else run({ paid: mode.paid, body: body(), contentType: 'application/json' });
  };
  const done = state.phase === 'done';

  return (
    <div className="split">
      <form className="demo" onSubmit={submit} style={{ minWidth: 0 }}>
        <ModeNote api={api} credits={credits} mode={mode} demoLimits={`pasted CSV, up to ${DEMO_ROWS} employees, 10 runs a day`} />
        <div className="btn-row" style={{ margin: '0 0 16px' }}>
          {SAMPLES.map((s) => <button key={s[0]} type="button" className="btn secondary small" onClick={() => loadSample(s)}>{s[1]}</button>)}
        </div>

        <h3 style={{ marginTop: 0 }}>The contract</h3>
        <div className="wh-grid" style={{ minWidth: 0 }}>
          <div className="field" style={{ margin: 0, minWidth: 0 }}>
            <label htmlFor="sca-wd">Health and welfare on the wage determination</label>
            <select style={{ width: '100%', maxWidth: '100%' }} id="sca-wd" value={p.wdType} onChange={set('wdType')}>
              <option value="fixed">Fixed rate per hour</option>
              <option value="average">Average cost</option>
            </select>
          </div>
          <div className="field" style={{ margin: 0, minWidth: 0 }}>
            <label htmlFor="sca-eo">Covered by EO 13706 (paid sick leave)?</label>
            <select style={{ width: '100%', maxWidth: '100%' }} id="sca-eo" value={p.eo13706} onChange={set('eo13706')}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="field" style={{ margin: 0, minWidth: 0 }}>
            <label htmlFor="sca-weeks">Weeks in this pay period</label>
            <input id="sca-weeks" type="text" inputMode="numeric" pattern="[0-9]*" value={p.periodWeeks} onChange={set('periodWeeks')} />
          </div>
          <div className="field" style={{ margin: 0, minWidth: 0 }}>
            <label htmlFor="sca-rate">H&amp;W rate per hour</label>
            <input id="sca-rate" type="text" inputMode="decimal" value={p.hwRate} onChange={set('hwRate')} placeholder={`${defaultRate} (default)`} />
          </div>
        </div>
        <span className="hint small" style={{ display: 'block', margin: '6px 0 10px' }}>
          Leave the rate blank to use ${defaultRate}, the {eo ? 'EO 13706 ' : ''}rate in {RATE_MEMO} (effective {RATE_EFFECTIVE}). If your wage determination prints a different H&amp;W rate, enter that one: an existing contract keeps its rate until the contracting officer adds a revised wage determination.
        </span>
        <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '0 0 8px' }}>
          <input type="checkbox" checked={p.hawaii} onChange={set('hawaii')} style={{ marginTop: 3 }} />
          <span>Hawaii wage determination (add an <code>hphca_covered</code> yes or no column)</span>
        </label>
        {p.hawaii && (
          <div className="field">
            <label htmlFor="sca-rate-h">H&amp;W rate for employees covered by the Hawaii Prepaid Health Care Act</label>
            <input id="sca-rate-h" type="text" inputMode="decimal" value={p.hwRateHphca} onChange={set('hwRateHphca')} placeholder={`${defaultHphca} (default)`} />
          </div>
        )}
        {average && (
          <div className="error-box" role="status">
            This check supports fixed-rate (employee by employee) health and welfare wage determinations only. Average cost determinations average contributions across everyone in the plan, and DOL stopped issuing them for new contracts in All Agency Memorandum 246 (July 16, 2024). Nothing will be run or charged.
          </div>
        )}

        <h3>Employees, one row each</h3>
        <div className="field">
          <label htmlFor="sca-csv">Paste the table (CSV with a header row)</label>
          <span className="hint">Required: <code>hours_paid</code> (all hours paid, including holiday, vacation and sick hours), <code>plan_contributions</code>, <code>cash_in_lieu</code>. Optional: <code>employee_ref</code>, <code>admin_costs_credited</code>, <code>hw_hours_credited</code>, <code>wage_rate_paid</code> with <code>wd_wage_rate</code>, <code>cash_in_lieu_separate</code>, <code>hours_week_1</code> and up, <code>ytd_hw_hours</code>. <a href="/samples/sca-template.csv">Download the template</a>.</span>
          <textarea id="sca-csv" value={csv} onChange={(e) => { setCsv(e.target.value); setFile(null); }} spellCheck={false} style={{ minHeight: 180 }} />
        </div>
        <div className="field">
          <label htmlFor="sca-file">Or choose a file (.csv or .xlsx)</label>
          <input id="sca-file" type="file" accept=".csv,.xlsx,text/csv" onChange={pickFile} />
          {file && <span className="hint">Workbook loaded: {file.name}. Workbooks run as a paid check.</span>}
        </div>
        <p className="small muted" style={{ margin: '12px 0' }}>Use your own employee reference, never a name or Social Security number. Processed in memory and not stored. The report names rows by line number; the references in the table below are joined in your browser.</p>
        {blocked && (
          <div className="note" style={{ margin: '0 0 12px' }} role="status">
            <p style={{ margin: 0 }}>
              <b>{file ? 'A workbook' : `More than ${DEMO_ROWS} employees`} runs as a paid check: {dollars(api.priceCents)}.</b>{' '}
              {credits.status === 'signed-in' && credits.canPay
                ? <>Untick "Use the free demo instead" to run it from your credit.</>
                : credits.status === 'signed-in'
                  ? <>Your credit ({dollars(credits.balanceCents)}) is below that. <a href="/account">Buy credits</a>, then run it here.</>
                  : <><a href="/account">Sign in and buy credits</a> to run it here, or use the API.</>}
              {' '}The free demo checks pasted CSV of up to {DEMO_ROWS} employees.
            </p>
          </div>
        )}
        <button className="btn" type="submit" disabled={!ready || blocked || state.phase === 'running' || tooBig}>
          {runLabel(mode.paid || file !== null, api, 'Check the pay period', 'Checking', state.phase === 'running')}
        </button>
        <div className="status-line" aria-live="polite">
          {state.phase === 'running' && 'Working out the H&W for each employee.'}
          {done && `Done. ${state.report.summary}${state.paid ? ` Charged ${dollars(api.priceCents)}.` : ''}`}
        </div>
        {tooBig && <div className="error-box">This is over the {kb(mode.paid ? api.maxBodyBytes : api.demoMaxBodyBytes)} limit{mode.paid ? '' : ' for the free demo'}.</div>}
        {state.phase === 'error' && <div className="error-box" role="alert">{state.error}</div>}
      </form>
      <div style={{ minWidth: 0 }}>
        {done ? (
          <>
            <ReportSheet kind="sca" report={state.report} refs={ranRefs} label="Your report" sub={state.paid ? 'Full check, paid from your credit' : 'Live result from the demo endpoint'} />
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button type="button" className="btn small" onClick={() => download(`SpreadRun-SCA-HW-${state.report.status}.csv`, reportCsv(state.report, ranRefs), 'text/csv')}>
                {state.report.status === 'PASS' ? 'Report ready: download CSV' : 'Download the report (CSV)'}
              </button>
              <button type="button" className="btn secondary small" onClick={() => download(`SpreadRun-SCA-HW-${state.report.status}.json`, JSON.stringify(state.report, null, 2), 'application/json')}>Download JSON</button>
            </div>
          </>
        ) : (
          <ReportSheet kind="sca" report={sample} refs={readRefs(sampleCsv).refs} label="Sample report" sub="Invented employees with planted errors" />
        )}
      </div>
    </div>
  );
}
