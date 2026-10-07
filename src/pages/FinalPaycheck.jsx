import { useState } from 'react';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import ToolSignup from '../site/ToolSignup.jsx';
import { STATES, TYPES, finalPayDeadline, longDate, stateByCode } from '../site/final-pay.js';
import { apiBySlug, dollars } from '../catalog.js';

export const FINAL_PAY_PATH = '/tools/final-paycheck-deadline';
const WH347 = apiBySlug('wh347-payroll-precheck');
const WH347_API = `/apis/${WH347.slug}`;

// Every state row in src/site/final-pay.js was read in the state's own code or labor department page on
// October 6, 2026, and carries that URL.
export const FINAL_PAY_FAQ = [
  ['What counts as "wages" in the final paycheck?',
    'It depends on the state. Regular pay and earned commissions always count. Accrued vacation is the classic trap: California and Illinois say earned vacation must be paid out and cannot be forfeited, Maine requires payout for vacation accrued since 2023 at employers with more than 10 employees, Nebraska counts earned unused vacation as wages, and many other states only require it if your written policy or agreement promises it. The calculator shows the rule for the state you pick when the statute addresses it.'],
  ['Why does the calculator ask for the next regular payday?',
    'Many states tie the deadline to the payday the employee would have been paid on if they had stayed. Only you know that date. Without it, the calculator still shows the fixed-day part of the rule, labeled as the latest or earliest the deadline can be.'],
  ['How are business days counted?',
    'Monday to Friday. Holidays are not skipped, so a business-day deadline shown here is never later than the real one. If a holiday falls inside the window, the law may give you one more day, but paying on the date shown is always on time.'],
  ['What about layoffs?',
    'Some states treat a layoff like a discharge and some give laid-off employees until the next payday. Where a state\'s law does not say, the calculator uses the earlier of the two and says so.'],
];

const RULE_SHORT = (r) => {
  switch (r.k) {
    case 'now': return 'Last day';
    case 'hours': return `${r.n} hours`;
    case 'days': return `${r.n} days`;
    case 'bdays': return `${r.n} business day${r.n === 1 ? '' : 's'}`;
    case 'payday': return 'Next payday';
    case 'periodEnd': return 'End of pay period';
    case 'demand': return 'On written demand';
    case 'mnQuit': return 'First payday (20 day limit)';
    case 'none': return 'No state law';
    case 'earlier': return `Earlier of ${r.of.map(RULE_SHORT).join(' or ').toLowerCase()}`;
    case 'later': return `Later of ${r.of.map(RULE_SHORT).join(' or ').toLowerCase()}`;
    default: return '';
  }
};

function Calculator() {
  const [v, setV] = useState({ state: '', type: 'fired', separation: '', payday: '', periodEnd: '', onePeriodNotice: false });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const st = v.state ? stateByCode(v.state) : null;
  const r = v.state && v.separation ? finalPayDeadline(v) : null;
  const needsPeriodEnd = st && ['AZ', 'WA'].includes(st.code);
  const needsPeriodNotice = st && st.onePeriodNotice && v.type === 'quitNotice';
  return (
    <div className="split">
      <form className="demo" style={{ alignSelf: 'start' }} onSubmit={(e) => e.preventDefault()} aria-label="Final paycheck deadline calculator">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="fp-state">State where the employee worked</label>
          <select id="fp-state" value={v.state} onChange={set('state')}>
            <option value="">Pick a state</option>
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="fp-type">How the job ended</label>
          <select id="fp-type" value={v.type} onChange={set('type')}>
            {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="fp-date">Last day of work</label>
          <input id="fp-date" type="date" value={v.separation} onChange={set('separation')} />
        </div>
        <div className="field">
          <label htmlFor="fp-payday">Next regular payday (optional)</label>
          <input id="fp-payday" type="date" value={v.payday} onChange={set('payday')} />
          <span className="hint">The payday the employee would have been paid on for this period if they had stayed.</span>
        </div>
        {needsPeriodEnd && (
          <div className="field">
            <label htmlFor="fp-period">End of the current pay period (optional)</label>
            <input id="fp-period" type="date" value={v.periodEnd} onChange={set('periodEnd')} />
          </div>
        )}
        {needsPeriodNotice && (
          <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0 0' }}>
            <input type="checkbox" checked={v.onePeriodNotice} onChange={set('onePeriodNotice')} /> The notice covered at least one full pay period
          </label>
        )}
        <p className="small muted" style={{ margin: '14px 0 0' }}>Everything is worked out in your browser. Nothing you enter is sent anywhere or saved.</p>
      </form>
      <div className="calc-result" style={{ alignSelf: 'start' }} aria-live="polite">
        {!r && <p className="small muted">Pick the state and the last day of work.</p>}
        {r?.error && <div className="error-box" role="alert">{r.error}</div>}
        {r && !r.error && <Result r={r} />}
      </div>
    </div>
  );
}

function Result({ r }) {
  const st = r.state;
  let headline;
  if (r.date) headline = longDate(r.date);
  else if (r.bound && r.boundKind === 'noLaterThan') headline = `No later than ${longDate(r.bound)}`;
  else if (r.bound) headline = `${longDate(r.bound)} or the next payday if later`;
  else headline = r.noLaw ? 'No state deadline' : 'Your next regular payday';
  return (
    <>
      <div className="calc-big"><span className="small muted">{st.name}: final pay is due</span><b>{headline}</b></div>
      <p style={{ marginTop: 8 }}>In plain words: final pay is due {r.text}.{r.bound ? ' Enter the next regular payday above for the exact date.' : ''}</p>
      {r.flag && <p className="small" style={{ color: 'var(--warn)' }}>{r.flag}</p>}
      <p className="small">{st.note}</p>
      <p className="small"><b>If it is late:</b> {st.penalty}</p>
      {st.daily && <p className="small muted">Daily amount: {st.daily}. Cap: {st.cap}.</p>}
      <p className="small"><b>What counts as wages:</b> {st.wages || 'This state\'s final pay law does not settle vacation payout on its own. Check your written policy and the state labor department.'}</p>
      <p className="small muted" style={{ marginBottom: 0 }}>Source: {st.sources.map(([label, url], i) => <span key={url}>{i ? '; ' : ''}<a href={url}>{label}</a></span>)}.</p>
    </>
  );
}

function StateTable() {
  return (
    <div className="table-scroll">
      <table className="doc-table">
        <thead><tr><th>State</th><th>Fired</th><th>Laid off</th><th>Quit with notice</th><th>Quit, no notice</th><th>Source</th></tr></thead>
        <tbody>
          {STATES.map((s) => (
            <tr key={s.code}>
              <td>{s.name}</td>
              {TYPES.map((t) => <td key={t.id}>{RULE_SHORT(s[t.id])}</td>)}
              <td><a href={s.sources[0][1]}>{s.sources[0][0]}</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FinalPaycheck() {
  return (
    <Layout path={FINAL_PAY_PATH}>
      <Crumbs items={[['/', 'Home'], ['/tools', 'Free tools'], [null, 'Final Paycheck Deadline by State']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>Final Paycheck Deadline by State</h1>
        <p className="lede" style={{ marginTop: 20 }}>Pick the state, how the job ended and the last day of work, and see the date the final paycheck is due, in plain words, plus the penalty for paying late. All 50 states and DC, each checked against the state's own law. Free, no signup, and nothing you enter leaves the page.</p>
        <p className="small" style={{ marginTop: 12 }}><b>This tool is informational only and is not legal advice. Laws change and some situations have exceptions; when in doubt, check with the state labor department or an employment attorney.</b></p>
      </div>

      <section className="section wrap" aria-labelledby="calc-h" style={{ paddingTop: 8 }}>
        <h2 id="calc-h">Final paycheck deadline calculator</h2>
        <Calculator />
      </section>

      <section className="section wrap" aria-labelledby="table-h">
        <h2 id="table-h">All 50 states and DC at a glance</h2>
        <p>The short version of each state's rule. Use the calculator above for the exact date, the details and the penalty.</p>
        <StateTable />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={FINAL_PAY_FAQ} />
        <p className="small" style={{ marginTop: 24 }}>Each state's rule links to the statute or state labor department page it comes from. For states with no final pay law, the <a href="https://www.dol.gov/general/topic/wages/lastpaycheck">U.S. Department of Labor</a> notes that federal law does not require immediate payment.</p>
      </section>

      <section className="section wrap" aria-labelledby="cta-h">
        <div className="calc-result">
          <h2 id="cta-h" style={{ marginTop: 0 }}>Running payroll on public jobs too?</h2>
          <p>Same payroll team, same compliance headaches. The <a href={WH347_API}>{WH347.name}</a> checks a Davis-Bacon certified payroll before it goes in. {dollars(WH347.priceCents)} per completed check, with free sample runs on the page.</p>
          <p style={{ marginBottom: 0 }}><a className="btn" href={WH347_API}>Check a certified payroll</a></p>
        </div>
      </section>
      <ToolSignup source={FINAL_PAY_PATH} blurb="We will email you when there is a new free payroll or compliance tool." />
    </Layout>
  );
}
