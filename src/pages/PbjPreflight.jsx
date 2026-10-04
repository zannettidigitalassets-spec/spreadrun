import { useState } from 'react';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import { ZERO_RN_DAY_LIMIT, mealBreak, parseDailyHours, zeroRnDays } from '../site/pbjPreflight.js';

const PBJ = apiBySlug('pbj-staffing-qa');
export const PBJ_PREFLIGHT_PATH = '/tools/pbj-preflight-checks';
const CMS_PBJ = 'https://www.cms.gov/medicare/quality/nursing-home-improvement/staffing-data-submission';
const CMS_FIVE_STAR = 'https://www.cms.gov/medicare/health-safety-standards/certification-compliance/five-star-quality-rating-system';

// Facts checked against the Five-Star Technical Users' Guide (September 2026) and the PBJ Policy Manual v2.8 and
// its FAQ (August 2026).
export const PREFLIGHT_FAQ = [
  ['How many days without an RN trigger a one-star staffing rating?',
    'Four. Under the CMS Five-Star Technical Users\' Guide (September 2026), a nursing home whose PBJ data shows four or more days in the quarter with no RN hours (job codes 5, 6 and 7) on days when one or more residents were in the building gets a one-star staffing rating for the quarter, whatever its other staffing scores.'],
  ['Do I deduct a meal break even if the employee worked through it?',
    'Yes. The PBJ Policy Manual says a 30-minute meal break must be deducted for each full shift, paid or unpaid, whether or not the employee actually took it. If the break was longer than 30 minutes, the actual time comes out instead.'],
  ['What about shifts shorter than 8 hours?',
    'CMS gives worked examples for 8, 8.5, 12, 16 and 17 hour shifts and says it expects meal time to be deducted for shorter shifts too, reporting only the hours staff are paid to deliver services. It does not set a minimum shift length, so this calculator applies the deduction to any shift you tell it had a meal break.'],
  ['How do I round minutes for PBJ?',
    'PBJ hours are entered as fractions of an hour, not minutes. The Policy Manual converts minutes to tenths in 6-minute steps: 1 to 6 minutes is 0.1, 7 to 12 is 0.2, up to 55 to 60 as 1.0. Facilities may use hundredths instead. 7 hours 33 minutes is reported as 7.6 or 7.55, never 7.33.'],
];

const Cta = () => (
  <div className="calc-cta">
    These are 2 of the checks. The full {dollars(PBJ.priceCents)} pre-submission QA checks your actual PBJ XML against the CMS v4.10.0 specs and flags every staffing pattern CMS has named as an audit or rating risk, before you upload to iQIES. <a href="https://www.spreadrun.com/apis/pbj-staffing-qa">See the PBJ pre-submission QA</a>
  </div>
);

// The most recently ended federal fiscal quarter, for the quick-fill template.
function lastQuarter(now = new Date()) {
  const y = now.getFullYear();
  const startMonth = Math.floor(now.getMonth() / 3) * 3 - 3;     // the quarter before the current calendar quarter
  const start = new Date(Date.UTC(y, startMonth, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 0));
  return { start, end };
}
const iso = (d) => d.toISOString().slice(0, 10);

function ZeroRnScanner() {
  const [text, setText] = useState('');
  const fill = () => {
    const { start, end } = lastQuarter();
    const lines = ['date,rn_hours'];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) lines.push(`${iso(d)},8`);
    setText(lines.join('\n'));
  };
  const upload = (e) => {
    const f = e.target.files?.[0];
    if (f) f.text().then(setText);
  };
  const parsed = parseDailyHours(text);
  const r = parsed.days.length ? zeroRnDays(parsed.days) : null;
  return (
    <div className="split">
      <form className="demo" style={{ alignSelf: 'start' }} onSubmit={(e) => e.preventDefault()} aria-label="Zero-RN day scanner">
        <div className="field">
          <label htmlFor="rn-days">Daily RN hours for the quarter</label>
          <span className="hint">One value per line, values separated by commas, or date,hours lines. RN hours are job codes 5, 6 and 7 combined. Count only days with at least one resident.</span>
          <textarea id="rn-days" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} placeholder={'8\n16\n0\n12\n...'} />
        </div>
        <div className="btn-row" style={{ margin: '0 0 12px' }}>
          <button type="button" className="btn secondary small" onClick={fill}>Fill a 92-day template</button>
          <label className="btn secondary small" style={{ cursor: 'pointer' }}>
            Upload CSV<input type="file" accept=".csv,text/csv,text/plain" onChange={upload} style={{ display: 'none' }} />
          </label>
        </div>
        <p className="small muted" style={{ margin: 0 }}>The template fills the last full quarter with 8 hours a day. Change the days that had no RN to 0.</p>
        {parsed.errors.length > 0 && <div className="error-box">Line {parsed.errors.slice(0, 5).join(', ')}{parsed.errors.length > 5 ? ' and more' : ''}: use a number of 0 or more.</div>}
      </form>
      <div className="calc-result" style={{ alignSelf: 'start' }} aria-live="polite">
        {r ? (
          <>
            <div className="calc-big"><span className="small muted">Days with no RN hours</span><b style={{ color: r.oneStar ? 'var(--fail)' : 'var(--ink)' }}>{r.count} of {r.total}</b></div>
            {r.oneStar
              ? <p><b>CMS assigns an automatic 1-star staffing rating for the quarter.</b> Fix coverage or correct the data before submitting.</p>
              : <p><b>No automatic penalty from this rule</b>, but review weekends: RN gaps cluster there, and {ZERO_RN_DAY_LIMIT - r.count} more {ZERO_RN_DAY_LIMIT - r.count === 1 ? 'day' : 'days'} without an RN would trigger it.</p>}
            {r.count > 0 && <p className="small">Days with 0 RN hours: {r.zeroDays.slice(0, 12).map((d) => d.label).join(', ')}{r.count > 12 ? ` and ${r.count - 12} more` : ''}.</p>}
            {(r.total < 90 || r.total > 92) && <p className="small muted">{r.total} days entered. A quarter has 90 to 92 days.</p>}
            <p className="small muted">This checks one CMS rule only: four or more days with no RN hours means a one-star staffing rating. It is not a full validation and not CMS acceptance.</p>
            <Cta />
          </>
        ) : <p className="small muted">Paste or upload a quarter of daily RN hours.</p>}
      </div>
    </div>
  );
}

const PRESETS = [
  ['8-hour shift, paid lunch', { hours: '8', minutes: '0', paid: true, breakMin: '30', shifts: '1' }],
  ['8-hour shift, unpaid lunch', { hours: '7', minutes: '30', paid: false, breakMin: '30', shifts: '1' }],
  ['12-hour shift', { hours: '12', minutes: '0', paid: true, breakMin: '30', shifts: '1' }],
];

const fmtMin = (m) => `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')} min`;

function MealBreak() {
  const [v, setV] = useState(PRESETS[0][1]);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const nums = ['hours', 'minutes', 'breakMin', 'shifts'].map((k) => Number(v[k] === '' ? 0 : v[k]));
  const bad = nums.some((n) => !Number.isFinite(n) || n < 0) || !Number.isInteger(nums[3]) || nums[3] < 1;
  const paidMinutes = nums[0] * 60 + nums[1];
  const r = bad || paidMinutes <= 0 ? null : mealBreak({ paidMinutes, breakPaid: v.paid, breakMinutes: nums[2], shifts: nums[3] });
  return (
    <div className="split">
      <form className="demo" style={{ alignSelf: 'start' }} onSubmit={(e) => e.preventDefault()} aria-label="Meal break deduction calculator">
        <div className="btn-row" style={{ margin: '0 0 14px' }}>
          {PRESETS.map(([label, p]) => <button key={label} type="button" className="btn secondary small" onClick={() => setV(p)}>{label}</button>)}
        </div>
        <div className="input-grid" style={{ marginTop: 0 }}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="mb-hours">Hours paid</label>
            <input id="mb-hours" type="number" inputMode="numeric" min="0" step="1" value={v.hours} onChange={set('hours')} />
            <span className="hint">For the day, as on payroll.</span>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="mb-min">and minutes</label>
            <input id="mb-min" type="number" inputMode="numeric" min="0" max="59" step="1" value={v.minutes} onChange={set('minutes')} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="mb-break">Meal break length (minutes)</label>
            <input id="mb-break" type="number" inputMode="numeric" min="0" step="1" value={v.breakMin} onChange={set('breakMin')} />
            <span className="hint">CMS deducts at least 30, or more if the break was longer.</span>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="mb-shifts">Full shifts in the day</label>
            <input id="mb-shifts" type="number" inputMode="numeric" min="1" step="1" value={v.shifts} onChange={set('shifts')} />
            <span className="hint">A double, such as two 8-hour shifts, is 2.</span>
          </div>
        </div>
        <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '14px 0 0' }}>
          <input type="checkbox" checked={v.paid} onChange={set('paid')} /> The meal break is paid (included in the hours paid)
        </label>
        {bad && <div className="error-box">Use whole numbers of 0 or more, and at least 1 shift.</div>}
      </form>
      <div className="calc-result" style={{ alignSelf: 'start' }} aria-live="polite">
        {r ? (
          <>
            <div className="calc-big"><span className="small muted">Hours to report in PBJ</span><b>{r.tenths.toFixed(1)}</b></div>
            <h3 style={{ marginTop: 14 }}>How it adds up</h3>
            <ol className="calc-math">
              <li>Hours paid: {fmtMin(paidMinutes)}.</li>
              <li>Meal deduction per shift: the larger of 30 minutes and the actual break = {r.perShift} minutes.</li>
              <li>{v.paid ? 'The break is paid, so all of it comes out of paid time.' : `The break is unpaid, so ${r.alreadyUnpaid} minutes are already out of paid time; ${r.deductPerShift} more ${r.deductPerShift === 1 ? 'minute comes' : 'minutes come'} out per shift.`}</li>
              <li>Deducted: {r.deductPerShift} minutes × {nums[3]} {nums[3] === 1 ? 'shift' : 'shifts'} = {r.deducted} minutes. Reportable time: {fmtMin(r.reportMinutes)}.</li>
              <li>Converted with the CMS table (minutes to tenths, in 6-minute steps): <b>{r.tenths.toFixed(1)} hours</b>. If you report in hundredths: {r.hundredths.toFixed(2)}.</li>
            </ol>
            <p className="small muted">This is the CMS PBJ reporting rule for hours, not legal wage-law advice. It does not change what you pay the employee.</p>
            <Cta />
          </>
        ) : <p className="small muted">Enter the hours paid for the day.</p>}
      </div>
    </div>
  );
}

export default function PbjPreflight() {
  return (
    <Layout path={PBJ_PREFLIGHT_PATH}>
      <Crumbs items={[['/', 'Home'], [null, 'PBJ Pre-Flight Checks']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>PBJ Pre-Flight Checks: Zero-RN Days and Meal Break Deductions</h1>
        <p className="lede" style={{ marginTop: 20 }}>Two quick checks on the PBJ rules that trip nursing homes up most: the four-day RN rule that triggers a one-star staffing rating, and the meal break deduction CMS requires on every shift. Free, no signup, and everything runs in your browser: no data leaves the page.</p>
      </div>

      <section className="section wrap" aria-labelledby="rn-h" style={{ paddingTop: 8 }}>
        <h2 id="rn-h">Zero-RN day scanner</h2>
        <p>CMS gives a one-star staffing rating for the quarter when PBJ data shows <b>four or more days with no RN hours</b> while residents were in the building (<a href={CMS_FIVE_STAR}>Five-Star Technical Users' Guide, September 2026</a>, staffing scoring exceptions).</p>
        <ZeroRnScanner />
      </section>

      <section className="section wrap" aria-labelledby="mb-h">
        <h2 id="mb-h">Meal break deduction calculator</h2>
        <p>For each full shift, PBJ hours must leave out a 30-minute meal break, paid or unpaid, whether or not it was taken, or the actual break if it was longer (<a href={CMS_PBJ}>PBJ Policy Manual v2.8</a>, meal break policy).</p>
        <MealBreak />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={PREFLIGHT_FAQ} />
        <p className="small" style={{ marginTop: 24 }}>A PASS from any tool, including these, is not CMS acceptance. The staffing star estimate in the full QA is an estimate, not CMS's official rating. Sources: <a href={CMS_FIVE_STAR}>CMS Five-Star Quality Rating System</a>, <a href={CMS_PBJ}>CMS Staffing Data Submission (PBJ)</a>.</p>
      </section>
    </Layout>
  );
}
