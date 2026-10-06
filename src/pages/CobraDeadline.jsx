import { useState } from 'react';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import ToolSignup from '../site/ToolSignup.jsx';
import { EVENTS, cobraDeadlines, longDate } from '../site/cobra-deadlines.js';
import { apiBySlug, dollars } from '../catalog.js';

export const COBRA_DEADLINE_PATH = '/tools/cobra-deadline-calculator';
const COBRA = apiBySlug('cobra-notice-qa');
const COBRA_API = `/apis/${COBRA.slug}`;

const ECFR29 = 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XXV/subchapter-L/part-2590/subpart-A/section-';
const ECFR26 = 'https://www.ecfr.gov/current/title-26/chapter-I/subchapter-D/part-54/section-';
const SOURCES = [
  ['29 CFR 2590.606-2', `${ECFR29}2590.606-2`, 'employer notice to the administrator'],
  ['29 CFR 2590.606-3', `${ECFR29}2590.606-3`, 'notices from covered employees and qualified beneficiaries'],
  ['29 CFR 2590.606-4', `${ECFR29}2590.606-4`, 'the election notice'],
  ['26 CFR 54.4980B-6', `${ECFR26}54.4980B-6`, 'the election period'],
  ['26 CFR 54.4980B-7', `${ECFR26}54.4980B-7`, 'how long coverage lasts'],
  ['26 CFR 54.4980B-8', `${ECFR26}54.4980B-8`, 'premium payments'],
];

// Every rule here was read on eCFR on October 6, 2026. See src/site/cobra-deadlines.js for the citation per date.
export const COBRA_DEADLINE_FAQ = [
  ['Why does the calculator assume each step happens on its last day?',
    'The calculator cannot know when the employer actually reported the event or when the notice actually went out. So it shows the latest each step can happen. If a step happens earlier, the steps after it can come earlier too. The election period, for example, runs at least 60 days from the date the notice is actually provided, not from its deadline.'],
  ['Do these deadlines move if they land on a weekend?',
    'The regulations count calendar days and do not say a deadline moves to the next business day. This calculator does not move them. If a date lands on a weekend or holiday, plan to finish before it.'],
  ['What is "the plan measures from the loss of coverage"?',
    'Some plans start the 30-day employer notice and the maximum coverage period on the date coverage is lost instead of the date of the event. That only applies if the plan document says so for both. If you are not sure, leave the box unticked; the event date is the default in the regulations.'],
  ['Does this cover the general notice?',
    'No. The general notice, the one sent when someone first joins the plan, is due within 90 days after coverage begins. This calculator covers the deadlines that start with a qualifying event.'],
];

function Calculator() {
  const [v, setV] = useState({ event: 'termination', eventDate: '', coverageEnd: '', administrator: 'employer', fromLossOfCoverage: false });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const r = v.eventDate ? cobraDeadlines(v) : null;
  const beneficiary = EVENTS.find((e) => e.id === v.event)?.notice === 'beneficiary';
  return (
    <div className="split">
      <form className="demo" style={{ alignSelf: 'start' }} onSubmit={(e) => e.preventDefault()} aria-label="COBRA deadline calculator">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="cd-event">Qualifying event</label>
          <select id="cd-event" value={v.event} onChange={set('event')}>
            {EVENTS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cd-date">Date of the qualifying event</label>
          <input id="cd-date" type="date" value={v.eventDate} onChange={set('eventDate')} />
        </div>
        <div className="field">
          <label htmlFor="cd-cov">Date group health coverage ends, if different (optional)</label>
          <input id="cd-cov" type="date" value={v.coverageEnd} onChange={set('coverageEnd')} />
          <span className="hint">Leave blank if coverage ends on the event date.</span>
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0 }}>
          <legend className="small" style={{ fontWeight: 600 }}>Who administers the plan</legend>
          <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0 0' }}>
            <input type="radio" name="cd-admin" value="employer" checked={v.administrator === 'employer'} onChange={set('administrator')} /> The employer handles COBRA itself
          </label>
          <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0 0' }}>
            <input type="radio" name="cd-admin" value="separate" checked={v.administrator === 'separate'} onChange={set('administrator')} /> A separate plan administrator
          </label>
          {beneficiary && <span className="hint">For this event the beneficiary reports it, so the administrator's 14 days apply either way.</span>}
        </fieldset>
        <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0 0' }}>
          <input type="checkbox" checked={v.fromLossOfCoverage} onChange={set('fromLossOfCoverage')} /> The plan document measures from the loss of coverage
        </label>
        <div className="btn-row" style={{ margin: '14px 0 4px' }}>
          <button type="button" className="btn secondary small" onClick={() => setV({ ...v, event: 'termination', eventDate: '2026-01-15', coverageEnd: '', administrator: 'employer', fromLossOfCoverage: false })}>Try a termination on January 15, 2026</button>
        </div>
        <p className="small muted" style={{ margin: '14px 0 0' }}>Everything is worked out in your browser. Nothing you enter is sent anywhere or saved.</p>
      </form>
      <div className="calc-result" style={{ alignSelf: 'start' }} aria-live="polite">
        {!r && <p className="small muted">Pick the qualifying event and its date.</p>}
        {r?.error && <div className="error-box" role="alert">{r.error}</div>}
        {r && !r.error && (
          <>
            <div className="calc-big"><span className="small muted">Election notice must go out by</span><b>{longDate(r.noticeBy)}</b></div>
            <ol className="calc-math" style={{ paddingLeft: 20 }}>
              <li><b>{longDate(r.eventDate)}</b>: {r.event.label.toLowerCase()}.{r.coverageEnd > r.eventDate && <> Coverage ends {longDate(r.coverageEnd)}.</>}</li>
              {r.steps.map((s) => (
                <li key={s.id} style={{ marginTop: 10 }}>
                  <b>{s.date ? longDate(s.date) : 'Rule'}</b>{s.example ? ' (example)' : ''}: {s.title}.
                  {s.days ? <span className="small muted"> {s.days} days after {longDate(s.from)}.</span> : null}
                  <br /><span className="small">{s.detail}</span>
                  <br /><span className="small muted">Rule: {s.source}</span>
                </li>
              ))}
            </ol>
            {r.notes.map((n) => <p key={n} className="small">{n}</p>)}
            <p className="small muted" style={{ marginBottom: 0 }}>When adding months lands on a day the month does not have (August 31 plus 6 months), the date shown is the last day of that month.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function CobraDeadline() {
  return (
    <Layout path={COBRA_DEADLINE_PATH}>
      <Crumbs items={[['/', 'Home'], ['/tools', 'Free tools'], [null, 'COBRA Deadline Calculator']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>Free COBRA Deadline Calculator</h1>
        <p className="lede" style={{ marginTop: 20 }}>Enter the qualifying event and its date, and see every COBRA deadline that follows: the employer's notice, the election notice, the election period, the first premium and how long coverage can last. Free, no signup, and nothing you enter leaves the page.</p>
        <p className="small" style={{ marginTop: 12 }}><b>This tool is for information only and is not legal advice. Your plan document and your benefits counsel have the final word.</b></p>
      </div>

      <section className="section wrap" aria-labelledby="calc-h" style={{ paddingTop: 8 }}>
        <h2 id="calc-h">COBRA deadline calculator</h2>
        <p>The dates come from the Department of Labor's COBRA notice rules and the Treasury COBRA regulations. Each date shows the rule it comes from.</p>
        <Calculator />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={COBRA_DEADLINE_FAQ} />
        <p className="small" style={{ marginTop: 24 }}>Sources: {SOURCES.map(([label, url, what], i) => <span key={label}>{i ? '; ' : ''}<a href={url}>{label}</a>, {what}</span>)}.</p>
        <p className="small">For the full deadline map with a worked example, read <a href="/guides/cobra-notice-deadlines">COBRA Notice Deadlines</a>. For what the notice must contain, see <a href="/guides/cobra-election-notice-requirements">the 14-item checklist</a>.</p>
      </section>

      <section className="section wrap" aria-labelledby="cta-h">
        <div className="calc-result">
          <h2 id="cta-h" style={{ marginTop: 0 }}>Got the dates? Check the notice content before it goes out.</h2>
          <p>The <a href={COBRA_API}>COBRA Notice Content QA</a> checks a draft election or general notice for every item the DOL requires, works out the sending deadline from the event date, and flags stated dates and payment terms that fall short of the minimums. {dollars(COBRA.priceCents)} per completed check, with free sample runs on the page.</p>
          <p style={{ marginBottom: 0 }}><a className="btn" href={COBRA_API}>Check a COBRA notice</a></p>
        </div>
      </section>
      <ToolSignup source={COBRA_DEADLINE_PATH} blurb="We will email you when there is a new free compliance tool." />
    </Layout>
  );
}
