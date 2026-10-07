import { useEffect, useState } from 'react';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import ToolSignup from '../site/ToolSignup.jsx';
import {
  TYPES, revalidation, localToday, longDate,
  ECFR_515, ECFR_57, ECFR_540, ECFR_555, ECFR_41, CMS_REVAL, CMS_LIST,
} from '../site/pecos-revalidation.js';
import { apiBySlug, dollars } from '../catalog.js';

export const PECOS_REVAL_PATH = '/tools/pecos-revalidation-calculator';
const PECOS = apiBySlug('pecos-enrollment-precheck');
const PECOS_API = `/apis/${PECOS.slug}`;

const SOURCES = [
  ['42 CFR 424.515', ECFR_515, 'the 5-year cycle, the CMS notice and the 60-day window'],
  ['42 CFR 424.57(g)', ECFR_57, 'the 3-year DMEPOS cycle'],
  ['42 CFR 410.41(c)(2)', ECFR_41, 'ambulance suppliers'],
  ['42 CFR 424.540', ECFR_540, 'deactivation and reactivation'],
  ['42 CFR 424.555(b)', ECFR_555, 'no payment while deactivated'],
  ['CMS, Revalidations (Renewing Your Enrollment)', CMS_REVAL, 'due dates, notices and timing'],
];

// Every rule here was read on eCFR and cms.gov on October 7, 2026. See src/site/pecos-revalidation.js.
export const PECOS_REVAL_FAQ = [
  ['Why is the due date an estimate?',
    'CMS sets the actual due date and posts it on the Medicare Revalidation List seven months ahead. The calculator adds the cycle length to the date you enter, which is how the regulations describe the cycle. If the list shows a different date, the list wins. CMS can also ask for a revalidation off cycle.'],
  ['Which date should I enter?',
    'The date your enrollment took effect, or the date your last revalidation was approved, whichever is later. A DMEPOS supplier revalidates 3 years after billing privileges were first granted or 3 years after its last revalidation. Everyone else enters a 5-year cycle once a completed application is submitted and validated.'],
  ['When will the revalidation notice come?',
    'CMS says your enrollment contractor sends it by email or mail about three to four months before the due date. Medicare Administrative Contractors send them to providers, groups and suppliers other than DMEPOS. The National Provider Enrollment East and West contractors send them to DMEPOS suppliers. You are responsible for the date whether or not a notice arrives.'],
  ['Can I revalidate early, or get more time?',
    'If the due date is more than seven months away and you have no notice, CMS returns the application unsolicited. Within three months of the due date, CMS says to revalidate even without a notice. CMS does not grant extensions, and there are no exemptions.'],
  ['What about ambulance suppliers?',
    'The revalidation rule sends ambulance suppliers to a separate rule that has them resubmit when the contractor asks. CMS says providers and suppliers generally revalidate every five years, so the calculator uses five years as the estimate. Go by the Medicare Revalidation List and your contractor\'s letter.'],
];

const STAGE = {
  early: ['Not yet', 'var(--line)', 'transparent'],
  window: ['Due date can be on the list', 'var(--accent)', 'var(--accent-soft)'],
  d90: ['90 days or less', 'var(--warn)', 'var(--warn-soft)'],
  d60: ['60 days or less', 'var(--warn)', 'var(--warn-soft)'],
  d30: ['30 days or less', 'var(--fail)', 'var(--fail-soft)'],
  overdue: ['Past the estimated due date', 'var(--fail)', 'var(--fail-soft)'],
};

const plural = (n, w) => `${n.toLocaleString('en-US')} ${w}${n === 1 ? '' : 's'}`;

// Re-reads the date every minute so the countdown turns over at midnight while the page is open.
function useToday() {
  const [today, setToday] = useState(null);
  useEffect(() => {
    const tick = () => setToday((prev) => {
      const t = localToday();
      return prev && prev.getTime() === t.getTime() ? prev : t;
    });
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);
  return today;
}

function Calculator() {
  const [v, setV] = useState({ type: 'individual', baseDate: '' });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const today = useToday();
  const r = v.baseDate && today ? revalidation({ ...v, today }) : null;
  const ok = r && !r.error;
  const [stageLabel, stageColor, stageBg] = ok ? STAGE[r.stage] : [];
  return (
    <div className="split">
      <form className="demo" style={{ alignSelf: 'start' }} onSubmit={(e) => e.preventDefault()} aria-label="Medicare revalidation due date calculator">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="pr-type">Provider or supplier type</label>
          <select id="pr-type" value={v.type} onChange={set('type')}>
            {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pr-date">Enrollment effective date, or the date your last revalidation was approved</label>
          <input id="pr-date" type="date" value={v.baseDate} onChange={set('baseDate')} />
          <span className="hint">Use whichever is more recent.</span>
        </div>
        <div className="btn-row" style={{ margin: '14px 0 4px' }}>
          <button type="button" className="btn secondary small" onClick={() => setV({ type: 'dmepos', baseDate: '2024-03-15' })}>Try a DMEPOS supplier revalidated March 15, 2024</button>
        </div>
        <p className="small muted" style={{ margin: '14px 0 0' }}>Everything is worked out in your browser. Nothing you enter is sent anywhere or saved.</p>
      </form>
      <div className="calc-result" style={{ alignSelf: 'start' }} aria-live="polite">
        {!r && <p className="small muted">Pick the type and enter the date.</p>}
        {r?.error && <div className="error-box" role="alert">{r.error}</div>}
        {ok && (
          <>
            <div className="calc-big"><span className="small muted">Estimated revalidation due date</span><b>{longDate(r.due)}</b></div>
            <p className="small" style={{ margin: '0 0 12px' }}>
              {r.type.years} years after {longDate(r.base)} ({r.type.rule}).
            </p>
            <div style={{ border: `1px solid ${stageColor}`, background: stageBg, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {r.daysLeft >= 0 ? `${plural(r.daysLeft, 'day')} left` : `${plural(-r.daysLeft, 'day')} past due`}
              </div>
              <div className="small">{stageLabel}. Counted from today, {longDate(r.today)}.</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '12px 0' }}>
              {r.countdown.map((c) => (
                <div key={c.days} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', background: c.reached ? 'var(--warn-soft)' : 'transparent' }}>
                  <div style={{ fontWeight: 700 }}>{c.days} days</div>
                  <div className="small">{c.date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  <div className="small muted">{c.reached ? 'Reached' : 'Ahead'}</div>
                </div>
              ))}
            </div>
            <ol className="calc-math" style={{ paddingLeft: 20 }}>
              {r.marks.filter((m) => !/^d\d/.test(m.id)).map((m) => (
                <li key={m.id} style={{ marginTop: 8 }}>
                  <b>{longDate(m.date)}</b>{m.passed ? ' (passed)' : ''}: {m.label}
                </li>
              ))}
            </ol>
            {r.type.ambulance && <p className="small">Ambulance suppliers resubmit when the contractor asks (42 CFR 410.41(c)(2)), so treat this five-year date as a planning estimate.</p>}
            {r.stage === 'overdue' && <div className="error-box" role="status">If you revalidated after the date you entered, enter that approval date instead. If not, check the Medicare Revalidation List and your mail now, and read <a href="/guides/medicare-revalidation-missed-deadline">what happens after a missed revalidation</a>.</div>}
            <p className="small muted" style={{ marginBottom: 0 }}>Check your real due date on the <a href={CMS_LIST}>Medicare Revalidation List</a>. When adding years lands on February 29 in a year without one, the date shown is February 28.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function PecosRevalidation() {
  return (
    <Layout path={PECOS_REVAL_PATH}>
      <Crumbs items={[['/', 'Home'], ['/tools', 'Free tools'], [null, 'Medicare Revalidation Calculator']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>Free Medicare (PECOS) Revalidation Calculator</h1>
        <p className="lede" style={{ marginTop: 20 }}>Enter your provider or supplier type and the date your enrollment took effect or was last revalidated. See your estimated revalidation due date, a live countdown with the 90, 60 and 30 day marks, and when to expect the notice from your contractor.</p>
        <p className="small" style={{ marginTop: 12 }}><b>This tool is informational only and is not legal advice. The Medicare Revalidation List and your contractor's notice have the final word on your due date.</b></p>
      </div>

      <section className="section wrap" aria-labelledby="calc-h" style={{ paddingTop: 8 }}>
        <h2 id="calc-h">Revalidation due date calculator</h2>
        <p>Most providers and suppliers revalidate every 5 years. DMEPOS suppliers revalidate every 3 years. The dates and timing below come from the CMS enrollment regulations and the CMS revalidation page.</p>
        <Calculator />
      </section>

      <section className="section wrap" aria-labelledby="miss-h">
        <h2 id="miss-h">What happens if you miss it</h2>
        <p>CMS can deactivate your Medicare billing privileges if you do not send complete information within 90 days of the revalidation notice, and the deactivation can be dated back to when you fell out of compliance (<a href={ECFR_540}>42 CFR 424.540(a)(3) and (d)</a>). While you are deactivated, Medicare pays nothing for the services you furnish, the patient owes nothing for them, and anything you collected from the patient has to be refunded (<a href={ECFR_555}>42 CFR 424.555(b)</a>). Getting back in means recertifying your enrollment, and CMS can require a complete new CMS-855 application. Reactivation takes effect on the date your contractor receives the submission it approves, so the days in between are not paid (<a href={ECFR_540}>42 CFR 424.540(b) and (d)(2)</a>). CMS also warns that a late revalidation can bring a hold on your Medicare payments (<a href={CMS_REVAL}>CMS</a>).</p>
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={PECOS_REVAL_FAQ} />
        <p className="small" style={{ marginTop: 24 }}>Sources: {SOURCES.map(([label, url, what], i) => <span key={label}>{i ? '; ' : ''}<a href={url}>{label}</a>, {what}</span>)}.</p>
        <p className="small">Already late? Read <a href="/guides/medicare-revalidation-missed-deadline">Missed Your Medicare Revalidation Due Date? What Happens Next</a>. For why applications come back, see <a href="/guides/pecos-returned-for-corrections">PECOS Returned for Corrections</a>.</p>
      </section>

      <section className="section wrap" aria-labelledby="cta-h">
        <div className="calc-result">
          <h2 id="cta-h" style={{ marginTop: 0 }}>Revalidations get denied for the same enrollment errors the pre-check catches.</h2>
          <p>The <a href={PECOS_API}>PECOS Medicare Enrollment Pre-Check</a> reads a draft CMS-855I, 855B or 855S before it goes into PECOS. It checks the NPI and taxonomy against NPPES, the legal name against the IRS name, ZIP+4 addresses, expiring credentials and the supporting documents. {dollars(PECOS.priceCents)} per completed pre-check, with free sample runs on the page.</p>
          <p style={{ marginBottom: 0 }}><a className="btn" href={PECOS_API}>Pre-check a revalidation</a></p>
        </div>
      </section>
      <ToolSignup source={PECOS_REVAL_PATH} blurb="We will email you when there is a new free compliance tool." />
    </Layout>
  );
}
