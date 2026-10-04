import { useState } from 'react';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import { overtime } from '../site/overtime.js';

const WH347 = apiBySlug('wh347-payroll-precheck');
export const OT_CALC_PATH = '/tools/davis-bacon-overtime-calculator';

// Facts checked against 29 CFR 5.5(b) and 5.32 (eCFR, current text, October 2026).
export const OT_FAQ = [
  ['How is overtime calculated on a Davis-Bacon job?',
    'Davis-Bacon itself sets hourly rates, not overtime. Overtime comes from the Contract Work Hours and Safety Standards Act, which covers most federal and federally assisted construction contracts over $100,000: every hour over 40 in the workweek must be paid at no less than one and one-half times the basic rate of pay. The basic rate can never be lower than the basic hourly rate on the wage determination (29 CFR 5.5(b)(1) and 5.32).'],
  ['Do fringe benefits get time and a half too?',
    'No. Fringe benefits paid to a bona fide plan, and cash paid in lieu of fringe benefits, are left out of the rate overtime is figured on (29 CFR 5.32). The fringe rate is owed for every hour worked, overtime hours included, at the straight amount. If extra pay is simply part of the hourly wage rather than a stated payment in lieu of fringe benefits, overtime is due on the full rate paid.'],
  ['What are the $33 a day liquidated damages?',
    'When a contractor covered by the Contract Work Hours and Safety Standards Act fails to pay required overtime, it owes the unpaid wages plus liquidated damages to the United States of $33 for each worker for each calendar day that worker worked over 40 hours in the workweek without overtime pay (29 CFR 5.5(b)(2)). Contract payments can be withheld to cover both.'],
  ['Does this calculator check that my payroll complies?',
    'No. It does the overtime arithmetic for the numbers you type. It does not know whether you are using the right wage determination, whether the worker is in the right classification, whether your fringe plan is bona fide, or how many hours were worked on other jobs that week. For a whole weekly payroll checked row by row, use the WH-347 certified payroll pre-check.'],
];

const parse = (v) => {
  if (String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const money = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hrs = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });


function Field({ id, label, hint, value, onChange }) {
  return (
    <div className="field" style={{ margin: 0 }}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" inputMode="decimal" min="0" step="any" value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

function Calculator() {
  const [v, setV] = useState({ st: '40', ot: '6', rate: '38.50', fringe: '18.25' });
  const set = (k) => (x) => setV({ ...v, [k]: x });
  const st = parse(v.st), ot = parse(v.ot), rate = parse(v.rate), fringe = parse(v.fringe);
  const bad = [st, ot, rate, fringe].some((n) => Number.isNaN(n));
  const ready = !bad && st !== null && ot !== null && rate !== null;
  const r = ready ? overtime({ st, ot, rate, fringe: fringe || 0 }) : null;
  return (
    <div className="split">
      <form className="demo" style={{ alignSelf: 'start' }} onSubmit={(e) => e.preventDefault()} aria-label="Overtime calculator">
        <div className="input-grid" style={{ marginTop: 0 }}>
          <Field id="ot-st" label="Straight time hours" hint="For the workweek, up to 40." value={v.st} onChange={set('st')} />
          <Field id="ot-ot" label="Overtime hours" hint="Hours over 40 in the workweek." value={v.ot} onChange={set('ot')} />
          <Field id="ot-rate" label="Basic hourly rate ($)" hint="At least the wage determination's basic rate." value={v.rate} onChange={set('rate')} />
          <Field id="ot-fringe" label="Fringe rate per hour ($)" hint="Optional. From the wage determination." value={v.fringe} onChange={set('fringe')} />
        </div>
        <p className="small muted" style={{ margin: '14px 0 0' }}>Everything is worked out in your browser. Nothing you type is sent anywhere.</p>
        {bad && <div className="error-box">Use numbers of 0 or more.</div>}
      </form>
      <div className="calc-result" style={{ alignSelf: 'start' }} aria-live="polite">
        {r ? (
          <>
            <div className="calc-big"><span className="small muted">Overtime premium owed</span><b>{money(r.premium)}</b></div>
            <div className="calc-big"><span className="small muted">Total gross for the week{fringe ? ', with fringe paid in cash' : ''}</span><b>{money(r.total)}</b></div>
            <h3 style={{ marginTop: 18 }}>How it adds up</h3>
            <ul className="calc-math">
              <li>Straight time: {hrs(st)} hours at {money(rate)} = <b>{money(r.stPay)}</b></li>
              <li>Overtime rate: {money(rate)} × 1.5 = <b>{money(r.otRate)}</b> an hour</li>
              <li>Overtime pay: {hrs(ot)} hours at {money(r.otRate)} = <b>{money(r.otPay)}</b>, of which the premium (the extra half) is <b>{money(r.premium)}</b></li>
              <li>Wages: {money(r.stPay)} + {money(r.otPay)} = <b>{money(r.wages)}</b></li>
              {fringe ? <li>Fringe: {hrs(st + ot)} hours at {money(fringe)}, no premium = <b>{money(r.fringeOwed)}</b>, paid to a plan, in cash, or a mix</li> : null}
            </ul>
            {st > 40 && <p className="small" style={{ color: 'var(--warn)' }}>More than 40 straight time hours: on a contract covered by the Contract Work Hours and Safety Standards Act, the hours over 40 are overtime.</p>}
            <p className="small muted">This is arithmetic, not compliance advice. It does not check the wage determination, the worker's classification, whether the fringe plan is bona fide, or hours worked on other jobs.</p>
            <div className="calc-cta">
              Checking a full weekly payroll? <a href={`/apis/${WH347.slug}`}>Run the {dollars(WH347.priceCents)} certified payroll pre-check</a>.
            </div>
          </>
        ) : <p className="small muted">Enter straight time hours, overtime hours and the basic hourly rate.</p>}
      </div>
    </div>
  );
}

export default function OvertimeCalculator() {
  return (
    <Layout path={OT_CALC_PATH}>
      <Crumbs items={[['/', 'Home'], [null, 'Davis-Bacon Overtime Calculator']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>Davis-Bacon Overtime Calculator</h1>
        <p className="lede" style={{ marginTop: 20 }}>Work out overtime on a prevailing wage job in a few seconds: one and one-half times the basic hourly rate for hours over 40, the fringe owed for every hour, and the week's gross. Free, no signup, no limits.</p>
        <Calculator />
      </div>

      <section className="section wrap" aria-labelledby="rules-h">
        <h2 id="rules-h">The rules behind the math</h2>
        <ul>
          <li><b>Hours over 40 are overtime.</b> On contracts subject to the Contract Work Hours and Safety Standards Act, generally federal and federally assisted construction over $100,000, every hour over 40 in the workweek is paid at no less than one and one-half times the basic rate.</li>
          <li><b>The basic rate is the floor, not the fringe.</b> Overtime is figured on the basic rate, never lower than the wage determination's basic hourly rate. Fringe benefits, whether paid to a plan or in cash in lieu, are owed per hour at the straight amount.</li>
          <li><b>Mistakes cost more than the premium.</b> Unpaid overtime brings back wages plus $33 in liquidated damages for each worker for each day worked over 40 hours without overtime pay.</li>
        </ul>
        <p className="small">Sources: <a href="https://www.ecfr.gov/current/title-29/subtitle-A/part-5">29 CFR 5.5(b) and 5.32</a>.</p>
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={OT_FAQ} />
        <p className="small" style={{ marginTop: 24 }}>Checking a whole week? The <a href={`/apis/${WH347.slug}`}>WH-347 certified payroll pre-check</a> recomputes every row of the payroll against your wage determination, and for a payroll that passes, gives you the completed WH-347 ready to sign.</p>
        <p className="small">Also free: the <a href="/tools/davis-bacon-fringe-calculator">Davis-Bacon fringe benefit annualization calculator</a>.</p>
      </section>
    </Layout>
  );
}
