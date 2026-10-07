import { useState } from 'react';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import ToolSignup from '../site/ToolSignup.jsx';
import { LIEN_STATES, PROJECT_TYPES, ROLES, ATTORNEY, lienDeadlines, longDate } from '../site/lien-deadlines.js';
import { apiBySlug, dollars } from '../catalog.js';

export const LIEN_PATH = '/tools/mechanics-lien-deadline-calculator';
const WH347 = apiBySlug('wh347-payroll-precheck');
const WH347_API = `/apis/${WH347.slug}`;

export const LIEN_FAQ = [
  ['Why does it ask for my first and last furnishing dates?',
    'Preliminary notices usually run from the day you first furnished labor or materials, and lien deadlines usually run from the day you last did. Some states measure from completion of the whole project or from a notice the owner records instead. This calculator cannot see those dates, so it measures from your own last day of work, which is never later than the real deadline, and says so next to the date.'],
  ['What does "confirm with a construction attorney in this state" mean here?',
    'It appears wherever the statute depends on something the calculator cannot know (a notice of completion, a final settlement date, the tier you work in) or where the wording can be read more than one way. In those spots the date shown is the earliest reasonable reading. Filing by that date is safe; filing after it might not be.'],
  ['Are weekends and holidays skipped?',
    'No. Deadlines are shown as calendar dates and are not moved off weekends or holidays. Some states give you the next business day, but filing by the date shown is always on time.'],
  ['What about federal projects?',
    'Federal construction falls under the Miller Act, which this tool does not cover. Public works here means state and local government projects, where most states replace lien rights with a claim against the contractor\'s payment bond or against the funds the public owner is holding.'],
  ['What if I have a supplier contract with the general contractor instead of a subcontractor?',
    'Many bond statutes only require notices from people who do not deal directly with the prime contractor. The calculator assumes the stricter case for suppliers (that you sell to a subcontractor) and says so where it matters.'],
];

function Step({ title, r }) {
  if (!r) return null;
  const isDate = !!r.date;
  let head;
  if (r.kind === 'na') head = 'Not applicable';
  else if (r.kind === 'none') head = 'Not required';
  else if (r.before) head = `Before you start (by ${longDate(r.date)})`;
  else if (isDate && r.lastDate) head = `${longDate(r.date)} for your first month, ${longDate(r.lastDate)} for your last`;
  else if (isDate) head = longDate(r.date);
  else head = 'See below';
  return (
    <div style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}>
      <span className="small muted">{title}</span>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>{head}</div>
      <p className="small" style={{ margin: '6px 0 0' }}>{r.text}{/[.)]$/.test(r.text) ? '' : '.'}{r.assumed ? ' Counted as if you file on the last allowed day; enter your actual filing date above for the exact date.' : ''}</p>
      {r.flag && <p className="small" style={{ margin: '6px 0 0', color: 'var(--warn)' }}><b>{r.flag.replace(` ${ATTORNEY}`, '')} {ATTORNEY}</b></p>}
      {r.cite && <p className="small muted" style={{ margin: '6px 0 0' }}>Source: {r.url ? <a href={r.url}>{r.cite}</a> : r.cite}</p>}
    </div>
  );
}

function Calculator() {
  const [v, setV] = useState({ state: '', type: 'com', role: 'sub', first: '', last: '', filed: '' });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const ready = v.state && v.first && v.last;
  const r = ready ? lienDeadlines({ ...v, lienDate: v.filed, claimDate: v.filed }) : null;
  const pub = v.type === 'pub';
  return (
    <div className="split">
      <form className="demo" style={{ alignSelf: 'start' }} onSubmit={(e) => e.preventDefault()} aria-label="Mechanics lien deadline calculator">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="ml-state">State where the project is</label>
          <select id="ml-state" value={v.state} onChange={set('state')}>
            <option value="">Pick a state</option>
            {LIEN_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ml-type">Project type</label>
          <select id="ml-type" value={v.type} onChange={set('type')}>
            {PROJECT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ml-role">Your role</label>
          <select id="ml-role" value={v.role} onChange={set('role')}>
            {ROLES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ml-first">First day you furnished labor or materials</label>
          <input id="ml-first" type="date" value={v.first} onChange={set('first')} />
        </div>
        <div className="field">
          <label htmlFor="ml-last">Last day you furnished labor or materials</label>
          <input id="ml-last" type="date" value={v.last} onChange={set('last')} />
        </div>
        <div className="field">
          <label htmlFor="ml-filed">{pub ? 'Date you sent the bond claim notice (optional)' : 'Date you recorded the lien (optional)'}</label>
          <input id="ml-filed" type="date" value={v.filed} onChange={set('filed')} />
          <span className="hint">Some suit deadlines run from the filing date. Leave blank to count from the last allowed day.</span>
        </div>
        <p className="small muted" style={{ margin: '14px 0 0' }}>Everything is worked out in your browser. Nothing you enter is sent anywhere or saved.</p>
      </form>
      <div className="calc-result" style={{ alignSelf: 'start' }} aria-live="polite">
        {!r && <p className="small muted">Pick the state and enter your first and last furnishing dates.</p>}
        {r?.error && <div className="error-box" role="alert">{r.error}</div>}
        {r?.unread && <p className="small" style={{ color: 'var(--warn)' }}><b>{r.unread} {ATTORNEY}</b></p>}
        {r && !r.error && !r.unread && (
          <>
            <p className="small muted" style={{ margin: 0 }}>{r.state.name}, {PROJECT_TYPES.find((t) => t.id === r.type).label.toLowerCase()}, {ROLES.find((x) => x.id === r.role).label.toLowerCase()}</p>
            <Step title="Preliminary notice" r={r.notice} />
            <Step title={pub ? 'Bond claim or claim on public funds' : 'Lien filing deadline'} r={r.lien} />
            <Step title={pub ? 'Deadline to sue on the bond or claim' : 'Deadline to sue to foreclose the lien'} r={r.suit} />
            {r.notes.map((n) => <p key={n} className="small muted" style={{ margin: '8px 0 0' }}>{n}</p>)}
          </>
        )}
      </div>
    </div>
  );
}

function StateList() {
  return (
    <div className="table-scroll">
      <table className="doc-table">
        <thead><tr><th>State</th><th>Statutes read</th></tr></thead>
        <tbody>
          {LIEN_STATES.map((s) => (
            <tr key={s.code}>
              <td>{s.name}</td>
              <td>{s.unread ? <span className="muted">Not confirmed from a free official source</span> : s.sources.map(([label, url], i) => <span key={url + i}>{i ? '; ' : ''}<a href={url}>{label}</a></span>)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LienDeadline() {
  return (
    <Layout path={LIEN_PATH}>
      <Crumbs items={[['/', 'Home'], ['/tools', 'Free tools'], [null, 'Mechanics Lien Deadline Calculator']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>Mechanics Lien Deadline Calculator</h1>
        <p className="lede" style={{ marginTop: 20 }}>Pick the state, the kind of project and your role, enter the first and last days you furnished labor or materials, and see three dates: the preliminary notice, the lien (or bond claim) deadline, and the deadline to sue. Each one links to the statute it comes from. Free, no signup, and nothing you enter leaves the page.</p>
        <p className="small" style={{ marginTop: 12 }}><b>This tool is informational only and is not legal advice. Lien rights are strict and easy to lose; where a rule depends on facts the calculator cannot see, it shows the earliest reasonable date and tells you to confirm with a construction attorney in the state.</b></p>
        <p className="small muted" style={{ marginTop: 8 }}>Covers private projects and state and local public projects. Federal projects under the Miller Act are not covered.</p>
      </div>

      <section className="section wrap" aria-labelledby="calc-h" style={{ paddingTop: 8 }}>
        <h2 id="calc-h">Lien deadline calculator</h2>
        <Calculator />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={LIEN_FAQ} />
      </section>

      <section className="section wrap" aria-labelledby="src-h">
        <h2 id="src-h">Statutes behind every state</h2>
        <p>Each state's rules were read on the state's own code site in October 2026. Four states publish their official code only through a commercial host, so the calculator does not give dates for them.</p>
        <StateList />
      </section>

      <section className="section wrap" aria-labelledby="cta-h">
        <div className="calc-result">
          <h2 id="cta-h" style={{ marginTop: 0 }}>Working on public jobs?</h2>
          <p>The same contractors who chase lien deadlines also file certified payroll on Davis-Bacon work. The <a href={WH347_API}>{WH347.name}</a> checks a certified payroll before it goes in. {dollars(WH347.priceCents)} per completed check, with free sample runs on the page.</p>
          <p style={{ marginBottom: 0 }}><a className="btn" href={WH347_API}>Check a certified payroll</a></p>
        </div>
      </section>
      <ToolSignup source={LIEN_PATH} blurb="We will email you when there is a new free tool for contractors, including lien notice checks." />
    </Layout>
  );
}

