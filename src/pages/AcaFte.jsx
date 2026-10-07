import { useState } from 'react';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import ToolSignup from '../site/ToolSignup.jsx';
import {
  MONTHS, FTE_DIVISOR, ALE_THRESHOLD, aleStatus, sameEveryMonth, reportingDeadlines, longDate,
  ECFR_ALE, ECFR_6056, IRS_ALE, IRS_ESRP, IRS_INSTR,
} from '../site/aca-fte.js';

export const ACA_PATH = '/tools/aca-fte-calculator';
const fmt = (n, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });

export const ACA_FAQ = [
  ['Who counts as full-time?',
    'An employee who averages at least 30 hours of service a week in a month, or at least 130 hours of service in the month. Everyone else goes into the full-time-equivalent count.'],
  ['How are part-time hours turned into FTEs?',
    'Add up the hours of service for the month of everyone who was not full-time, counting no more than 120 hours for any one person, and divide by 120. Fractions count. The IRS lets you round each month to the nearest hundredth.'],
  ['Why is 49.9 not 50?',
    'The yearly figure is the 12 monthly totals added up and divided by 12, and if the result is not a whole number it is rounded down. 49.9 becomes 49, which is under the threshold. 50.0 stays 50, which meets it.'],
  ['What about seasonal workers?',
    'If you were over 50 for no more than 120 days (four calendar months may be used instead) and the people above 50 in that stretch were seasonal workers, you are not an applicable large employer for the year. The calculator applies this when you enter month-by-month numbers and tick the box.'],
  ['Do related companies count together?',
    'Yes. Companies under common ownership or otherwise related under the section 414 rules of the Internal Revenue Code are combined to decide whether the group is an applicable large employer. Enter the whole group\'s numbers if that applies to you.'],
];

function Calculator() {
  const [mode, setMode] = useState('same');
  const [same, setSame] = useState({ fullTime: '', hours: '' });
  const [rows, setRows] = useState(() => MONTHS.map(() => ({ fullTime: '', partTimeHours: '' })));
  const [seasonal, setSeasonal] = useState(false);
  const [year, setYear] = useState(2025);
  const months = mode === 'same' ? sameEveryMonth(same.fullTime, same.hours) : rows;
  const filled = mode === 'same' ? same.fullTime !== '' && same.hours !== '' : rows.every((r) => r.fullTime !== '' && r.partTimeHours !== '');
  const r = filled ? aleStatus({ months, seasonal: mode === 'monthly' && seasonal }) : null;
  const setRow = (i, k) => (e) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)));
  const dl = reportingDeadlines(year + 1);
  return (
    <div className="split">
      <form className="demo" style={{ alignSelf: 'start' }} onSubmit={(e) => e.preventDefault()} aria-label="ACA FTE calculator">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="aca-year">Workforce year you are measuring</label>
          <select id="aca-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y} (decides status for {y + 1})</option>)}
          </select>
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0 }}>
          <legend className="small" style={{ fontWeight: 600 }}>Your numbers</legend>
          <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0 0' }}>
            <input type="radio" name="aca-mode" checked={mode === 'same'} onChange={() => setMode('same')} /> About the same every month
          </label>
          <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0 0' }}>
            <input type="radio" name="aca-mode" checked={mode === 'monthly'} onChange={() => setMode('monthly')} /> Month by month (seasonal or changing staff)
          </label>
        </fieldset>
        {mode === 'same' ? (
          <>
            <div className="field">
              <label htmlFor="aca-ft">Full-time employees (30+ hours a week, or 130+ hours a month)</label>
              <input id="aca-ft" type="number" min="0" step="1" inputMode="numeric" value={same.fullTime} onChange={(e) => setSame({ ...same, fullTime: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="aca-hrs">Total part-time hours worked per month</label>
              <input id="aca-hrs" type="number" min="0" step="any" inputMode="decimal" value={same.hours} onChange={(e) => setSame({ ...same, hours: e.target.value })} />
              <span className="hint">Count no more than {FTE_DIVISOR} hours for any one person.</span>
            </div>
          </>
        ) : (
          <div className="table-scroll" style={{ marginTop: 12 }}>
            <table className="doc-table" style={{ marginBottom: 8 }}>
              <thead><tr><th>Month</th><th>Full-time</th><th>Part-time hours</th></tr></thead>
              <tbody>
                {MONTHS.map((m, i) => (
                  <tr key={m}>
                    <td>{m.slice(0, 3)}</td>
                    <td><input aria-label={`${m} full-time employees`} type="number" min="0" step="1" inputMode="numeric" style={{ width: 80 }} value={rows[i].fullTime} onChange={setRow(i, 'fullTime')} /></td>
                    <td><input aria-label={`${m} part-time hours`} type="number" min="0" step="any" inputMode="decimal" style={{ width: 100 }} value={rows[i].partTimeHours} onChange={setRow(i, 'partTimeHours')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={seasonal} onChange={(e) => setSeasonal(e.target.checked)} /> The employees above 50 in the busy months were seasonal workers
            </label>
          </div>
        )}
        <p className="small muted" style={{ margin: '14px 0 0' }}>Everything is worked out in your browser. Nothing you enter is sent anywhere or saved.</p>
      </form>

      <div className="calc-result" style={{ alignSelf: 'start' }} aria-live="polite">
        {!r && <p className="small muted">Enter your full-time count and part-time hours.</p>}
        {r?.error && <div className="error-box" role="alert">{r.error}</div>}
        {r && !r.error && <Result r={r} year={year} dl={dl} mode={mode} />}
      </div>
    </div>
  );
}

function Result({ r, year, dl, mode }) {
  const first = r.rows[0];
  return (
    <>
      <div className="calc-big">
        <span className="small muted">Full-time employees, including FTEs, for {year}</span>
        <b>{r.count}: {r.ale ? `an applicable large employer for ${year + 1}` : `not an applicable large employer for ${year + 1}`}</b>
      </div>
      <p className="small" style={{ marginTop: 0 }}><b>The math.</b>{' '}
        {mode === 'same'
          ? <>Each month: {fmt(first.partTimeHours)} part-time hours / {FTE_DIVISOR} = {fmt(first.fte)} FTEs, plus {first.fullTime} full-time = {fmt(first.total)}. </>
          : <>Monthly totals are in the table below. </>}
        Year: ({fmt(r.sumFt)} full-time + {fmt(r.sumFte)} FTEs) / 12 = {fmt(r.average, 4)}{Number.isInteger(Math.round(r.average * 1e6) / 1e6) ? '' : `, rounded down to ${r.count}`}. The threshold is {ALE_THRESHOLD}.
      </p>
      {r.seasonalApplies && <p className="small" style={{ color: 'var(--warn)' }}>The seasonal worker exception applies: you were over 50 in {r.monthsOver} month{r.monthsOver === 1 ? '' : 's'} and the extra employees were seasonal.</p>}
      {r.count >= ALE_THRESHOLD && !r.exceptionAvailable && mode === 'monthly' && <p className="small muted">The seasonal worker exception is not available: you were over 50 in {r.monthsOver} months, more than the four allowed.</p>}
      {mode === 'monthly' && (
        <div className="table-scroll">
          <table className="doc-table">
            <thead><tr><th>Month</th><th>Full-time</th><th>FTEs</th><th>Total</th></tr></thead>
            <tbody>{r.rows.map((x) => <tr key={x.month}><td>{x.month.slice(0, 3)}</td><td>{x.fullTime}</td><td>{fmt(x.fteRounded)}</td><td>{fmt(x.total)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {r.ale ? (
        <>
          <p className="small"><b>What this triggers for {year + 1}:</b> the employer shared responsibility provisions (offer affordable, minimum-value coverage to full-time employees and their dependents, or potentially owe a payment), and annual reporting on Forms 1094-C and 1095-C for {year + 1}.</p>
          <p className="small"><b>{year + 1} reporting deadlines (due in {year + 2}):</b></p>
          <ul className="small" style={{ marginTop: 0 }}>
            <li>Furnish Form 1095-C to each full-time employee: {longDate(dl.furnish)}</li>
            <li>File Forms 1094-C and 1095-C on paper: {longDate(dl.paper)}</li>
            <li>File electronically: {longDate(dl.electronic)} (required if you file 10 or more information returns of any kind)</li>
          </ul>
        </>
      ) : (
        <p className="small">Not an applicable large employer means the employer shared responsibility provisions and the Form 1094-C and 1095-C reporting do not apply for {year + 1}. If you sponsor a self-insured plan, separate coverage reporting can still apply.</p>
      )}
      <p className="small muted" style={{ marginBottom: 0 }}>Related companies under common ownership count together (Internal Revenue Code section 414). If that is you, enter the whole group's numbers.</p>
    </>
  );
}

function SeasonDates() {
  const rows = [2025, 2026].map(reportingDeadlines);
  return (
    <div className="table-scroll">
      <table className="doc-table">
        <thead><tr><th>Coverage year</th><th>Furnish 1095-C to employees</th><th>Paper filing</th><th>Electronic filing</th></tr></thead>
        <tbody>{rows.map((d) => <tr key={d.coverageYear}><td>{d.coverageYear}</td><td>{longDate(d.furnish)}</td><td>{longDate(d.paper)}</td><td>{longDate(d.electronic)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default function AcaFte() {
  return (
    <Layout path={ACA_PATH}>
      <Crumbs items={[['/', 'Home'], ['/tools', 'Free tools'], [null, 'ACA FTE Calculator']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>ACA Full-Time Equivalent (FTE) Calculator</h1>
        <p className="lede" style={{ marginTop: 20 }}>Enter your full-time headcount and part-time hours to see your full-time equivalent count, the math behind it, and whether you are an applicable large employer (50 or more). If you are, see what that triggers and the Form 1095-C deadlines. Free, no signup, and nothing you enter leaves the page.</p>
        <p className="small" style={{ marginTop: 12 }}><b>This tool is informational only and is not legal advice. Hours-of-service rules have details this calculator does not model; check with a benefits advisor or tax professional before relying on the result.</b></p>
      </div>

      <section className="section wrap" aria-labelledby="calc-h" style={{ paddingTop: 8 }}>
        <h2 id="calc-h">FTE and ALE calculator</h2>
        <Calculator />
      </section>

      <section className="section wrap" aria-labelledby="dates-h">
        <h2 id="dates-h">Form 1095-C filing season dates</h2>
        <p>Forms for a coverage year are due the following spring. Statements to employees are due January 31 with an automatic 30-day extension, paper returns February 28, electronic returns March 31, and a date that lands on a weekend moves to the next business day. The 2025 dates match the IRS instructions for 2025; the 2026 dates apply the same rules.</p>
        <SeasonDates />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={ACA_FAQ} />
        <p className="small" style={{ marginTop: 24 }}>Sources: <a href={ECFR_ALE}>26 CFR 54.4980H-2</a> (ALE status, FTEs, seasonal workers); <a href={IRS_ALE}>IRS, Determining if an employer is an applicable large employer</a>; <a href={IRS_ESRP}>IRS, Employer shared responsibility provisions</a>; <a href={ECFR_6056}>26 CFR 301.6056-1</a> (statement deadline and 30-day extension); <a href={IRS_INSTR}>IRS Instructions for Forms 1094-C and 1095-C (2025)</a>.</p>
      </section>

      <ToolSignup source={ACA_PATH} heading="1095-C filing season deadline alerts" blurb="Leave your email and we will remind you before the Form 1095-C furnishing and filing deadlines." />
    </Layout>
  );
}
