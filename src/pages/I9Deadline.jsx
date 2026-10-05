import { useState } from 'react';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import { HOLIDAY_YEARS, longDate, section2Deadline } from '../site/i9.js';

export const I9_PATH = '/tools/i9-section2-deadline-calculator';
const M274 = 'https://www.uscis.gov/i-9-central/form-i-9-resources/handbook-for-employers-m-274';
const CFR_2742 = 'https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-274a/subpart-A/section-274a.2';
const CFR_27410 = 'https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-274a/subpart-A/section-274a.10';
const OPM = 'https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/';

// Facts checked against 8 CFR 274a.2 and 274a.10 (eCFR, current October 2026), the USCIS M-274 handbook sections
// 3.0, 4.0 and 10.0, the DOJ IER Form I-9 guidance on reverification, and the OPM federal holiday tables.
export const I9_FAQ = [
  ['What counts as a business day for Section 2?',
    'The regulation and the M-274 handbook say Section 2 is due within three business days of the first day of employment, and give the example of a Monday start finished by Thursday. Neither defines a business day. This calculator skips weekends and federal holidays by default. If your business is open on Saturdays, Sundays or holidays, tick those boxes and those days count too. When in doubt, finish earlier.'],
  ['What if the job lasts less than three business days?',
    'Then Section 2 is due on the first day of employment, not three business days later (8 CFR 274a.2(b)(1)(iii)). Tick the short job box and the calculator shows that date.'],
  ['When is Section 1 due?',
    'No later than the employee\'s first day of employment. The employee fills it in and signs it; you cannot do it for them, though a preparer or translator can help if they complete Supplement A.'],
];

const CHECKLIST = [
  ['Section 1', 'Due no later than the first day of employment.', [
    ['s1-fields', 'Every required field is filled in', 'Name, address, date of birth and citizenship or immigration status. Email and phone are optional, and so is the Social Security number unless you use E-Verify.'],
    ['s1-sign', 'Signed and dated by the employee', 'An employee who cannot sign can make a mark instead.'],
    ['s1-prep', 'Supplement A completed if someone helped', 'Each preparer or translator fills in their own certification block.'],
  ]],
  ['Section 2', 'Due within 3 business days of the first day of employment.', [
    ['s2-sign', 'Signed and dated by the employer within the deadline', 'By the person who examined the documents, with their name, title and the business name and address.'],
    ['s2-date', 'First day of employment entered and correct', 'The day the employee started work for pay, not the offer date.'],
    ['s2-docs', 'Every document fully recorded', 'Title, issuing authority, number and expiration date, if it has one.'],
  ]],
  ['Documents', null, [
    ['d-lists', 'One List A document, or one from List B plus one from List C', 'Never two from the same list. The employee picks which documents to show; you cannot ask for specific ones.'],
    ['d-genuine', 'Documents reasonably appear genuine and relate to the person', 'Original, unexpired documents, checked against the person in front of you.'],
  ]],
  ['Reverification', null, [
    ['r-when', 'Reverified on Supplement B before work authorization expires', 'Only when a List A or List C document showing temporary permission to work runs out.'],
    ['r-never', 'Never reverified when the rules say not to', 'Do not reverify U.S. citizens, U.S. nationals, Permanent Resident Cards or List B documents.'],
  ]],
  ['Retention', null, [
    ['k-keep', 'Kept for 3 years after hire or 1 year after employment ends, whichever is later', 'Someone who worked under two years: three years from hire. Longer: one year after they leave.'],
  ]],
];
const TOTAL = CHECKLIST.reduce((n, [, , items]) => n + items.length, 0);

function Calculator() {
  const [v, setV] = useState({ start: '', openSaturday: false, openSunday: false, openHolidays: false, shortTerm: false });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const r = v.start ? section2Deadline(v.start, v) : null;
  const box = (k, label) => (
    <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0 0' }}>
      <input type="checkbox" checked={v[k]} onChange={set(k)} /> {label}
    </label>
  );
  return (
    <div className="split">
      <form className="demo" style={{ alignSelf: 'start' }} onSubmit={(e) => e.preventDefault()} aria-label="Section 2 deadline calculator">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="i9-start">First day of work for pay</label>
          <input id="i9-start" type="date" value={v.start} onChange={set('start')} />
          <span className="hint">Federal holidays are loaded for {HOLIDAY_YEARS[0]} and {HOLIDAY_YEARS[1]}.</span>
        </div>
        <div className="btn-row" style={{ margin: '12px 0 4px' }}>
          <button type="button" className="btn secondary small" onClick={() => setV({ ...v, start: '2026-01-05' })}>Try Monday, January 5, 2026</button>
        </div>
        <p className="small" style={{ margin: '12px 0 0' }}><b>Days your business is open</b></p>
        {box('openSaturday', 'Open on Saturdays')}
        {box('openSunday', 'Open on Sundays')}
        {box('openHolidays', 'Open on federal holidays')}
        <p className="small" style={{ margin: '14px 0 0' }}><b>Short job</b></p>
        {box('shortTerm', 'Hired for less than 3 business days')}
        <p className="small muted" style={{ margin: '14px 0 0' }}>Everything is worked out in your browser. Nothing you enter is sent anywhere or saved.</p>
      </form>
      <div className="calc-result" style={{ alignSelf: 'start' }} aria-live="polite">
        {r ? (
          <>
            <div className="calc-big"><span className="small muted">Section 2 must be complete by</span><b>{longDate(r.deadline)}</b></div>
            {r.shortTerm
              ? <p>A job shorter than three business days needs Section 2 done on the first day of employment.</p>
              : (
                <ol className="calc-math">
                  <li>The first day of employment, {longDate(r.start)}, is day 0.</li>
                  {r.skipped.length > 0 && <li>Not counted: {r.skipped.map((s) => `${longDate(new Date(s.date + 'T00:00:00Z')).replace(/, \d{4}$/, '')}: ${s.why}`).join('; ')}.</li>}
                  <li>Business days 1, 2 and 3: {r.counted.map((d) => longDate(new Date(d + 'T00:00:00Z')).replace(/, \d{4}$/, '')).join(', ')}. The third is the deadline.</li>
                </ol>
              )}
            {!r.holidaysCovered && <p className="small" style={{ color: 'var(--warn)' }}>This start date is outside {HOLIDAY_YEARS[0]} to {HOLIDAY_YEARS[1]}, so federal holidays are not skipped. Check the calendar yourself.</p>}
            <p className="small muted">Section 2 is due within three business days of the first day of work for pay. Section 1 is due no later than that first day. Finishing both on day one is the safest habit.</p>
          </>
        ) : <p className="small muted">Pick the employee's first day of work for pay.</p>}
      </div>
    </div>
  );
}

function Checklist() {
  const [done, setDone] = useState({});
  const passed = Object.values(done).filter(Boolean).length;
  return (
    <div>
      {CHECKLIST.map(([group, note, items]) => (
        <fieldset key={group} className="demo" style={{ margin: '0 0 16px', border: '1px solid var(--line, #d8dee6)' }}>
          <legend style={{ fontWeight: 600, color: 'var(--ink)', padding: '0 6px' }}>{group}</legend>
          {note && <p className="small muted" style={{ margin: '0 0 8px' }}>{note}</p>}
          {items.map(([id, label, why]) => (
            <label key={id} htmlFor={`ck-${id}`} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 8, alignItems: 'start', margin: '10px 0' }}>
              <input id={`ck-${id}`} type="checkbox" checked={!!done[id]} onChange={(e) => setDone({ ...done, [id]: e.target.checked })} style={{ marginTop: 4 }} />
              <span><b>{label}</b><br /><span className="small muted">{why}</span></span>
            </label>
          ))}
        </fieldset>
      ))}
      <div className="calc-result" aria-live="polite">
        <div className="calc-big"><span className="small muted">Your self-audit</span><b style={{ color: passed === TOTAL ? 'var(--pass)' : 'var(--ink)' }}>{passed} of {TOTAL} checks passed</b></div>
        <p style={{ marginBottom: 0 }}>{passed === TOTAL
          ? 'Every item is checked. Keep doing this for each new hire, and spot-check older forms too.'
          : `${TOTAL - passed} ${TOTAL - passed === 1 ? 'item is' : 'items are'} unchecked. Any unchecked item is a potential fine: paperwork violations run $288 to $2,861 per form under the January 2025 inflation adjustment (8 CFR 274a.10(b)(2)).`}</p>
      </div>
    </div>
  );
}

export default function I9Deadline() {
  return (
    <Layout path={I9_PATH}>
      <Crumbs items={[['/', 'Home'], [null, 'I-9 Section 2 Deadline Calculator']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>Free I-9 Section 2 Deadline Calculator and Self-Audit Checklist</h1>
        <p className="lede" style={{ marginTop: 20 }}>Find the date Section 2 of Form I-9 is due for a new hire, then run through the mistakes that most often turn up when an I-9 is checked. Free, no signup, and nothing you enter leaves the page.</p>
        <p className="small" style={{ marginTop: 12 }}><b>This tool is for information only and is not legal advice. Immigration paperwork has real consequences; when in doubt, talk to an immigration attorney.</b></p>
      </div>

      <section className="section wrap" aria-labelledby="calc-h" style={{ paddingTop: 8 }}>
        <h2 id="calc-h">Section 2 deadline calculator</h2>
        <p>The employer must finish Section 2 within three business days of the employee's first day of work for pay: start Monday, done by Thursday (<a href={CFR_2742}>8 CFR 274a.2(b)(1)(ii)</a> and the <a href={M274}>USCIS M-274 handbook</a>). The first day is day 0. Weekends and <a href={OPM}>federal holidays</a> are skipped unless you are open on them.</p>
        <Calculator />
      </section>

      <section className="section wrap" aria-labelledby="audit-h">
        <h2 id="audit-h">I-9 self-audit checklist</h2>
        <p>Pull one completed Form I-9 and tick each item it gets right. Based on the USCIS M-274 handbook and 8 CFR 274a.2. Nothing is saved; refresh the page to start over for the next form.</p>
        <Checklist />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={I9_FAQ} />
        <p className="small" style={{ marginTop: 24 }}>Sources: <a href={CFR_2742}>8 CFR 274a.2</a>, <a href={CFR_27410}>8 CFR 274a.10</a>, <a href={M274}>USCIS Handbook for Employers (M-274)</a>, <a href={OPM}>OPM federal holidays</a>.</p>
        <p className="small">Also free: the <a href="/tools/davis-bacon-overtime-calculator">Davis-Bacon overtime calculator</a>, the <a href="/tools/davis-bacon-fringe-calculator">fringe benefit annualization calculator</a> and the <a href="/tools/pbj-preflight-checks">PBJ pre-flight checks</a>.</p>
      </section>

      <section className="section wrap" aria-labelledby="cta-h">
        <div className="calc-result">
          <h2 id="cta-h" style={{ marginTop: 0 }}>Doing this for dozens of employees?</h2>
          <p style={{ marginBottom: 0 }}>A pre-audit scan catches what checklists miss. <a href="https://www.spreadrun.com/">Learn more</a></p>
        </div>
      </section>
    </Layout>
  );
}
