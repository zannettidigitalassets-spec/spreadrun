import { useState } from 'react';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import { checkCrafts } from '../site/apprentice.js';

const WH347 = apiBySlug('wh347-payroll-precheck');
export const APPRENTICE_PATH = '/tools/davis-bacon-apprentice-checker';
const CFR = 'https://www.ecfr.gov/current/title-29/subtitle-A/part-5/subpart-A/section-5.5';
const DAYS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

// Facts checked against 29 CFR 5.5(a)(3)(i)(D) and 5.5(a)(4)(i) (eCFR, current text, October 2026).
export const APPRENTICE_FAQ = [
  ['What apprentice ratio applies on a Davis-Bacon job?',
    'The ratio in your registered apprenticeship program. Under 29 CFR 5.5(a)(4)(i), the ratio of apprentices to journeyworkers on the job site in any craft classification must not be greater than the ratio your registered program allows, or the ratio for the locality of the project. When you work in a locality other than the one where your program is registered, the ratios and wage rates of the locality where the work is done apply. There is no single public table of ratios, so this tool does not suggest one.'],
  ['What happens to an apprentice over the ratio?',
    'An apprentice working on the job site beyond the allowed ratio must be paid at least the wage determination rate for the work actually performed, the journeyworker rate, not the apprentice rate. The same goes for anyone listed as an apprentice who is not individually registered in a registered program.'],
  ['Who counts as registered?',
    'An apprentice individually registered in a bona fide apprenticeship program registered with the U.S. Department of Labor Office of Apprenticeship, or with a State Apprenticeship Agency it recognizes. A person in the first 90 days of probationary employment as an apprentice in such a program can also be paid the apprentice rate if certified as eligible.'],
  ['Can this tool verify my program or registration number?',
    'No. It only checks that you entered one for each classification that has apprentices on site. Whether the number is real and current is between you, your program sponsor and the registration agency.'],
];

const emptyDays = () => DAYS.map((label) => ({ label, apprentices: '', journeyworkers: '' }));
const EXAMPLE = [{
  name: 'Electrician', ratio: '1:3', registration: '',
  days: DAYS.map((label, i) => ({ label, apprentices: i < 5 ? (i === 2 ? '2' : '1') : '', journeyworkers: i < 5 ? '3' : '' })),
}];

function Craft({ c, i, update, remove, canRemove }) {
  const set = (k) => (e) => { const v = e.target.value; update(i, (cur) => ({ ...cur, [k]: v })); };
  const setDay = (d, k) => (e) => { const v = e.target.value; update(i, (cur) => ({ ...cur, days: cur.days.map((x, n) => (n === d ? { ...x, [k]: v } : x)) })); };
  return (
    <fieldset className="demo" style={{ margin: '0 0 16px', border: '1px solid var(--line)' }}>
      <legend style={{ fontWeight: 600, color: 'var(--ink)', padding: '0 6px' }}>Classification {i + 1}</legend>
      <div className="input-grid" style={{ marginTop: 0 }}>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor={`ap-name-${i}`}>Craft or classification</label>
          <input id={`ap-name-${i}`} value={c.name} onChange={set('name')} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor={`ap-ratio-${i}`}>Your program ratio (apprentices:journeyworkers)</label>
          <input id={`ap-ratio-${i}`} value={c.ratio} onChange={set('ratio')} placeholder="1:3" />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor={`ap-reg-${i}`}>Program or registration number</label>
          <input id={`ap-reg-${i}`} value={c.registration} onChange={set('registration')} />
          <span className="hint">Checked for presence only. It cannot be verified here.</span>
        </div>
      </div>
      <div className="table-scroll" style={{ marginTop: 14 }}>
        <table className="findings">
          <thead><tr><th>Day</th><th>Apprentices on site</th><th>Journeyworkers on site</th></tr></thead>
          <tbody>
            {c.days.map((d, n) => (
              <tr key={d.label}>
                <td>{d.label}</td>
                <td><input aria-label={`${d.label} apprentices, classification ${i + 1}`} type="number" inputMode="numeric" min="0" step="1" value={d.apprentices} onChange={setDay(n, 'apprentices')} style={{ width: '100%', maxWidth: 110 }} /></td>
                <td><input aria-label={`${d.label} journeyworkers, classification ${i + 1}`} type="number" inputMode="numeric" min="0" step="1" value={d.journeyworkers} onChange={setDay(n, 'journeyworkers')} style={{ width: '100%', maxWidth: 110 }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canRemove && <button type="button" className="btn secondary small" style={{ marginTop: 10 }} onClick={() => remove(i)}>Remove this classification</button>}
    </fieldset>
  );
}

function Checker() {
  const [crafts, setCrafts] = useState(EXAMPLE);
  const update = (i, fn) => setCrafts((all) => all.map((x, n) => (n === i ? fn(x) : x)));
  const remove = (i) => setCrafts((all) => all.filter((_, n) => n !== i));
  const r = checkCrafts(crafts);
  return (
    <div className="split">
      <form style={{ alignSelf: 'start' }} onSubmit={(e) => e.preventDefault()} aria-label="Apprentice ratio checker">
        {crafts.map((c, i) => <Craft key={i} c={c} i={i} update={update} remove={remove} canRemove={crafts.length > 1} />)}
        <div className="btn-row" style={{ margin: '0 0 12px' }}>
          <button type="button" className="btn secondary small" onClick={() => setCrafts([...crafts, { name: '', ratio: '', registration: '', days: emptyDays() }])}>Add a classification</button>
          <button type="button" className="btn secondary small" onClick={() => setCrafts([{ name: '', ratio: '', registration: '', days: emptyDays() }])}>Clear</button>
        </div>
        <p className="small muted" style={{ margin: 0 }}>Everything is worked out in your browser. Nothing you enter is sent anywhere or saved. The example shows one week for one craft; replace it with your own numbers.</p>
      </form>
      <div className="calc-result" style={{ alignSelf: 'start' }} aria-live="polite">
        <div className="calc-big">
          <span className="small muted">Result</span>
          <b style={{ color: r.ok ? 'var(--pass)' : 'var(--fail)' }}>{r.checkedDays === 0 && !r.problems.length && !r.missingRegistration.length ? 'Nothing to check yet' : r.ok ? 'Within your ratio' : 'Needs attention'}</b>
        </div>
        {r.breaches.length > 0 && (
          <>
            <h3 style={{ marginTop: 14 }}>Over the ratio</h3>
            <ul className="calc-math">
              {r.breaches.map((b, n) => (
                <li key={n}>{b.day}, {b.craft}: {b.apprentices} {b.apprentices === 1 ? 'apprentice' : 'apprentices'} with {b.journeyworkers} {b.journeyworkers === 1 ? 'journeyworker' : 'journeyworkers'}. At {b.ratio}, {b.journeyworkers} {b.journeyworkers === 1 ? 'journeyworker allows' : 'journeyworkers allow'} {b.allowed}. <b>{b.over} over</b>: pay {b.over === 1 ? 'that apprentice' : 'those apprentices'} at least the journeyworker rate for the work performed that day.</li>
              ))}
            </ul>
          </>
        )}
        {r.missingRegistration.length > 0 && (
          <>
            <h3 style={{ marginTop: 14 }}>No program or registration number</h3>
            <ul className="calc-math">
              {r.missingRegistration.map((m) => <li key={m.craft}>{m.craft}: apprentices are on site, but no number was entered. Only apprentices individually registered in a registered program can be paid the apprentice rate.</li>)}
            </ul>
          </>
        )}
        {r.problems.map((p) => (
          <div className="error-box" key={p.craft + p.kind}>{p.craft}: {p.kind === 'ratio' ? 'enter your program ratio as apprentices:journeyworkers, such as 1:3.' : 'use whole numbers of 0 or more.'}</div>
        ))}
        {r.checkedDays > 0 && r.ok && <p>Every day with apprentices on site is within the ratio you entered, and each classification has a program or registration number.</p>}
        <p className="small muted">This checks your numbers against the ratio you entered. It does not know your program's real ratio, any stepped ratio your program uses, or whether a registration is valid.</p>
        <div className="calc-cta">
          Checking the math is step one. Run the full payroll through the {dollars(WH347.priceCents)} WH-347 pre-check before you certify. <a href={`/apis/${WH347.slug}`}>See the WH-347 pre-check</a>
        </div>
      </div>
    </div>
  );
}

export default function ApprenticeChecker() {
  return (
    <Layout path={APPRENTICE_PATH}>
      <Crumbs items={[['/', 'Home'], ['/tools', 'Free tools'], [null, 'Davis-Bacon Apprentice Ratio Checker']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>Davis-Bacon Apprentice Ratio Checker</h1>
        <p className="lede" style={{ marginTop: 20 }}>Enter how many apprentices and journeyworkers each craft had on site each day, and the ratio from your registered apprenticeship program. The checker flags every day a craft went over, and every craft with apprentices but no program or registration number. Free, no signup, and nothing you enter leaves the page.</p>
        <div className="note">
          <p><b>Your ratio comes from your program.</b> Apprentice ratios are set by each registered apprenticeship program. There is no public table of correct ratios, and this tool does not tell you what yours should be. It checks your numbers against the ratio you enter.</p>
        </div>
      </div>

      <section className="section wrap" aria-labelledby="tool-h" style={{ paddingTop: 8 }}>
        <h2 id="tool-h">Check a week</h2>
        <noscript><p className="note">The checker needs JavaScript. The rules and the documentation checklist below work without it.</p></noscript>
        <Checker />
      </section>

      <section className="section wrap split" aria-labelledby="rules-h">
        <div>
          <h2 id="rules-h">The rule</h2>
          <ul>
            <li><b>Registered apprentices only.</b> Apprentices can be paid less than the wage determination rate only when they are individually registered in a bona fide program registered with the Department of Labor Office of Apprenticeship or a recognized State Apprenticeship Agency.</li>
            <li><b>The ratio is per craft, on the job site.</b> The ratio of apprentices to journeyworkers in any craft classification must not be greater than the ratio your program allows, or the ratio for the project's locality.</li>
            <li><b>Out-of-area work.</b> When you build in a locality other than where your program is registered, the ratios and wage rates of the locality where the work is done apply.</li>
            <li><b>Over the ratio means journeyworker pay.</b> An apprentice beyond the allowed ratio, or one who is not registered, must be paid at least the wage determination rate for the work actually performed.</li>
          </ul>
          <p className="small">Source: <a href={CFR}>29 CFR 5.5(a)(4)(i)</a>.</p>
        </div>
        <div>
          <h2>What to have on file</h2>
          <p>The contract clauses require you to keep written evidence of:</p>
          <ul className="checklist">
            <li>The registration of each apprenticeship program you use.</li>
            <li>The registration of each apprentice.</li>
            <li>The ratios and wage rates the program prescribes.</li>
          </ul>
          <p>Also worth keeping with each payroll: which program covers each apprentice's craft, each apprentice's level, and for out-of-area work, the ratio and rates of the locality where the work was done.</p>
          <p className="small">Source: <a href={CFR}>29 CFR 5.5(a)(3)(i)(D)</a>.</p>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={APPRENTICE_FAQ} />
        <p className="small" style={{ marginTop: 24 }}>This is arithmetic, not legal or compliance advice. SpreadRun is not affiliated with or endorsed by the Department of Labor.</p>
        <p className="small">Also free: the <a href="/tools/davis-bacon-overtime-calculator">Davis-Bacon overtime calculator</a> and the <a href="/tools/davis-bacon-fringe-calculator">fringe benefit annualization calculator</a>. <a href="/tools">All free tools</a>.</p>
      </section>
    </Layout>
  );
}
