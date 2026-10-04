import { useState } from 'react';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import { annualize } from '../site/fringe.js';

const WH347 = apiBySlug('wh347-payroll-precheck');
export const FRINGE_CALC_PATH = '/tools/davis-bacon-fringe-calculator';
const CFR = 'https://www.ecfr.gov/current/title-29/subtitle-A/part-5';

// Facts checked against 29 CFR 5.2, 5.5(a)(3), 5.25, 5.28, 5.29 and 5.31 (eCFR, current text, October 2026).
export const FRINGE_FAQ = [
  ['How is a Davis-Bacon fringe benefit credit calculated?',
    'By annualization. Divide the total cost of the benefit by the total hours worked in the period that cost covers, counting private work and Davis-Bacon work alike. The result is the hourly credit you can take against the fringe rate on the wage determination for each hour of Davis-Bacon work (29 CFR 5.25(c)(1)).'],
  ['Why can\'t I divide the cost by Davis-Bacon hours only?',
    'Because the benefit covers the worker for all of their hours, not only the hours on the federal job. Dividing by Davis-Bacon hours alone would charge the whole year of coverage to the prevailing wage work and overstate the credit. The rule is written to stop that.'],
  ['Are there exceptions to annualization?',
    'Yes, narrow ones. Contributions to a defined contribution pension plan that offers immediate participation and vests within the first 500 hours are excepted, and other plans can ask the Wage and Hour Division for an exception if the benefit is not continuous and does not pay for private work (29 CFR 5.25(c)(2) and (3)). If the contribution differs from worker to worker, the credit has to be worked out separately for each worker.'],
  ['Does a credit that covers the wage determination rate mean I am compliant?',
    'No. This page only does the arithmetic. Whether a plan is bona fide, whether the costs are documented, and whether the wage determination and classification are right are questions the calculator cannot answer, and the Department of Labor makes the final call.'],
];

const parse = (v) => {
  if (String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const money = (n, digits = 2) => `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const num = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

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
  const [v, setV] = useState({ cost: '9360', hours: '2080', cash: '', required: '8.10' });
  const set = (k) => (x) => setV({ ...v, [k]: x });
  const cost = parse(v.cost), hours = parse(v.hours), cash = parse(v.cash), required = parse(v.required);
  const bad = [cost, hours, cash, required].some((n) => Number.isNaN(n));
  const zeroHours = hours === 0;
  const ready = !bad && !zeroHours && cost !== null && hours !== null;
  const r = ready ? annualize({ annualCost: cost, totalHours: hours, cashPerHour: cash || 0, requiredRate: required }) : null;
  return (
    <div className="split">
      <form className="demo" style={{ alignSelf: 'start' }} onSubmit={(e) => e.preventDefault()} aria-label="Fringe benefit calculator">
        <div className="input-grid" style={{ marginTop: 0 }}>
          <Field id="fr-cost" label="Annual cost of the benefit ($)" hint="What the employer pays for the plan in the year, for this worker, or for the group if every worker gets the same contribution." value={v.cost} onChange={set('cost')} />
          <Field id="fr-hours" label="Total hours worked in the year" hint="All hours, private and Davis-Bacon work. Annualization uses every hour, not just Davis-Bacon hours." value={v.hours} onChange={set('hours')} />
          <Field id="fr-cash" label="Cash in lieu of fringe, per hour ($)" hint="Optional. Paid to the worker as cash on top of the basic rate." value={v.cash} onChange={set('cash')} />
          <Field id="fr-required" label="Required fringe rate ($ per hour)" hint="Optional. The fringe rate on your wage determination." value={v.required} onChange={set('required')} />
        </div>
        <p className="small muted" style={{ margin: '14px 0 0' }}>Everything is worked out in your browser. Nothing you type is sent anywhere or saved.</p>
        {bad && <div className="error-box">Use numbers of 0 or more.</div>}
        {zeroHours && <div className="error-box">Total hours must be more than 0.</div>}
      </form>
      <div className="calc-result" style={{ alignSelf: 'start' }} aria-live="polite">
        {r ? (
          <>
            <div className="calc-big"><span className="small muted">Hourly fringe credit from the plan</span><b>{money(r.credit)}</b></div>
            {r.requiredRate !== undefined && (
              <div className="calc-big">
                <span className="small muted">{r.difference < 0 ? 'Shortfall against the required rate' : 'Surplus over the required rate'}</span>
                <b style={{ color: r.difference < 0 ? 'var(--fail)' : 'var(--pass)' }}>{money(r.difference < 0 ? r.shortfall : r.difference)} per hour</b>
              </div>
            )}
            <h3 style={{ marginTop: 18 }}>How it adds up</h3>
            <ol className="calc-math">
              <li>Annual cost divided by all hours worked: {money(cost)} / {num(hours)} hours = <b>{money(r.credit, 4)}</b> an hour, or {money(r.credit)} rounded.</li>
              {cash ? <li>Plus cash in lieu of fringe: {money(r.credit, 4)} + {money(cash)} = <b>{money(r.provided)}</b> an hour toward the fringe obligation.</li> : null}
              {r.requiredRate !== undefined && (
                <li>
                  Against the required fringe rate: {money(r.provided)} {r.difference < 0 ? '<' : '>='} {money(r.requiredRate)}.{' '}
                  {r.difference < 0
                    ? <>The worker is <b>{money(r.shortfall)}</b> an hour short. Pay the difference in cash or through the plan for every hour of Davis-Bacon work.</>
                    : <>The plan covers the required rate with <b>{money(r.difference)}</b> an hour to spare. Any excess cannot be used to make up a basic hourly rate below the wage determination.</>}
                </li>
              )}
            </ol>
            <p className="small muted">This computes the credit math only. It is not a compliance determination and does not guarantee the Department of Labor will accept the credit.</p>
          </>
        ) : <p className="small muted">Enter the annual cost of the benefit and the total hours worked.</p>}
      </div>
    </div>
  );
}

export default function FringeCalculator() {
  return (
    <Layout path={FRINGE_CALC_PATH}>
      <Crumbs items={[['/', 'Home'], [null, 'Davis-Bacon Fringe Benefit Calculator']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>Davis-Bacon Fringe Benefit Annualization Calculator</h1>
        <p className="lede" style={{ marginTop: 20 }}>Turn what you pay for a benefit plan into the hourly fringe credit you can take on a prevailing wage job, the way the Department of Labor requires: spread over every hour worked, not just the Davis-Bacon hours. Then see whether it covers the fringe rate on your wage determination. Free, no signup.</p>
        <Calculator />
      </div>

      <section className="section wrap split" aria-labelledby="counts-h">
        <div>
          <h2 id="counts-h">What counts as a fringe benefit</h2>
          <p>Credit is allowed for bona fide benefits paid to a fund, plan or program, or provided under an approved plan you fund yourself:</p>
          <ul>
            <li>Medical or hospital care, and insurance for it</li>
            <li>Pensions on retirement or death</li>
            <li>Life, disability, sickness and accident insurance</li>
            <li>Vacation and holiday pay</li>
            <li>Unemployment benefits you are not required by law to provide</li>
            <li>Costs of a registered apprenticeship program, within limits</li>
            <li>Other bona fide fringe benefits</li>
          </ul>
        </div>
        <div>
          <h2>What does not count</h2>
          <ul>
            <li><b>Anything the law already requires you to pay,</b> such as Social Security and Medicare (FICA), unemployment insurance taxes and workers' compensation insurance.</li>
            <li><b>Travel, subsistence and industry promotion payments,</b> which are not normally fringe benefits.</li>
            <li><b>Money you can take back.</b> Contributions must be irrevocable, paid to a trustee or third party not affiliated with you.</li>
          </ul>
          <h3 style={{ marginTop: 20 }}>Document it</h3>
          <p>Keep records of what each plan costs and the hours you spread it over. If you provide a benefit yourself instead of paying into a plan (an unfunded plan), it must be an enforceable, financially responsible commitment, communicated in writing to the workers, and approved by the Department of Labor before you take credit.</p>
        </div>
      </section>
      <section className="section wrap" aria-labelledby="src-h" style={{ paddingTop: 0 }}>
        <p className="small" id="src-h">Sources: <a href={CFR}>29 CFR 5.2, 5.5(a)(3), 5.25, 5.26, 5.28, 5.29 and 5.31</a>.</p>
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={FRINGE_FAQ} />
      </section>

      <section className="section wrap" aria-labelledby="cta-h">
        <div className="calc-result">
          <h2 id="cta-h" style={{ marginTop: 0 }}>Checked the fringe math?</h2>
          <p>Run the full payroll against your wage determination before you sign. The <a href={`/apis/${WH347.slug}`}>WH-347 certified payroll pre-check</a> recomputes every row's basic rate, fringe, overtime and totals for {dollars(WH347.priceCents)} a report, and a payroll that passes comes back as the completed WH-347, ready to sign.</p>
          <a className="btn" href={`/apis/${WH347.slug}`}>Run the {dollars(WH347.priceCents)} payroll pre-check</a>
          <p className="small muted" style={{ marginTop: 12 }}>Also free: the <a href="/tools/davis-bacon-overtime-calculator">Davis-Bacon overtime calculator</a>.</p>
        </div>
      </section>
    </Layout>
  );
}
