import { useState } from 'react';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import ToolSignup from '../site/ToolSignup.jsx';
import {
  FACTORS, FACTOR_LABEL, STATE_TESTS, TYPE_NAME, RATING, RULE_URL, FAB_URL, NPRM_URL,
  stateByCode, stateTests, stateQuestions, overall, E, C,
} from '../site/contractor-check.js';
import { apiBySlug, dollars } from '../catalog.js';

export const CONTRACTOR_PATH = '/tools/contractor-vs-employee-check';
const WH347 = apiBySlug('wh347-payroll-precheck');
const WH347_API = `/apis/${WH347.slug}`;

export const CONTRACTOR_FAQ = [
  ['Is this a legal answer?',
    'No. It is a risk rating built from your answers. Classification turns on the whole relationship and how it works in practice, and agencies and courts can weigh the same facts differently. If the result is anything other than a clear "likely employee", and especially if it says high risk, talk to an employment attorney before you rely on it.'],
  ['Which federal test does this use?',
    'The six economic reality factors in the Department of Labor\'s 2024 rule, 29 CFR 795.110. In May 2025 the department told its investigators to stop applying that rule (Field Assistance Bulletin 2025-1), and in February 2026 it proposed a replacement. The 2024 rule is still in the regulations and still applies in private lawsuits, so the six factors are still worth checking.'],
  ['Why does the state matter?',
    'State unemployment, wage and workers\' compensation laws use their own tests, and many are stricter than the federal one. An ABC test, for example, presumes the worker is an employee unless all three parts are proven. A worker can pass the federal factors and still be an employee under state law.'],
  ['What does a 1099 or a signed contractor agreement change?',
    'On its own, very little. Most tests look at how the work actually happens, not what the paperwork calls it. A few states, like West Virginia and Nevada, give contracts and paperwork more weight, and the tool shows those rules when you pick the state.'],
];

const TONE = {
  fail: { border: 'var(--fail)', bg: 'var(--fail-soft)' },
  warn: { border: 'var(--warn)', bg: 'var(--warn-soft)' },
  pass: { border: 'var(--pass)', bg: 'var(--pass-soft)' },
};

const choiceStyle = (on) => ({
  display: 'block', textAlign: 'left', width: '100%', padding: '12px 14px', margin: '8px 0 0',
  border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`, background: on ? 'var(--accent-soft)' : '#fff',
  borderRadius: 'var(--radius)', font: 'inherit', color: 'var(--ink)', cursor: 'pointer',
});

function Choice({ on, onClick, children }) {
  return <button type="button" aria-pressed={on} style={choiceStyle(on)} onClick={onClick}>{children}</button>;
}

const YNU = [['yes', 'Yes'], ['unsure', 'Not sure'], ['no', 'No']];

function Checker() {
  const [step, setStep] = useState(0); // 0..5 factors, 6 state, 7 state questions, 8 result
  // Move the view back to the top of the checker when a step starts above the screen, so phones never land mid-page.
  const go = (n) => {
    setStep(n);
    const h = typeof document !== 'undefined' && document.getElementById('calc-h');
    if (h && h.getBoundingClientRect().top < 0) h.scrollIntoView({ block: 'start' });
  };
  const [factors, setFactors] = useState({});
  const [state, setState] = useState('');
  const [sa, setSa] = useState({});
  const total = FACTORS.length;
  const tests = state ? stateTests(state) : [];
  const st = state ? stateByCode(state) : null;
  const restart = () => { go(0); setFactors({}); setState(''); setSa({}); };

  if (step < total) {
    const f = FACTORS[step];
    return (
      <div className="calc-result">
        <p className="small muted" style={{ margin: 0 }}>Question {step + 1} of {total} (federal factors)</p>
        <h3 style={{ margin: '6px 0 0' }}>{f.question}</h3>
        <p className="small muted" style={{ margin: '4px 0 0' }}>{f.name}, {f.cite}</p>
        <div role="group" aria-label={f.question}>
          {f.answers.map(([v, text]) => (
            <Choice key={v} on={factors[f.id] === v} onClick={() => { setFactors({ ...factors, [f.id]: v }); go(step + 1); }}>{text}</Choice>
          ))}
        </div>
        {step > 0 && <p style={{ margin: '16px 0 0' }}><button type="button" className="btn small secondary" onClick={() => go(step - 1)}>Back</button></p>}
      </div>
    );
  }

  if (step === total) {
    return (
      <div className="calc-result">
        <p className="small muted" style={{ margin: 0 }}>Step 2: the state test</p>
        <div className="field">
          <label htmlFor="cc-state">State where the work is done</label>
          <select id="cc-state" value={state} onChange={(e) => { setState(e.target.value); setSa({}); }}>
            <option value="">Skip the state test</option>
            {STATE_TESTS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
          <span className="hint">States often use a stricter test than the federal one. Skipping it leaves that risk unchecked.</span>
        </div>
        {st && !st.ui && <p className="small" style={{ color: 'var(--warn)' }}>{st.unread} Check with the state labor or unemployment agency.</p>}
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button type="button" className="btn small secondary" onClick={() => go(total - 1)}>Back</button>
          <button type="button" className="btn small" onClick={() => go(tests.length ? total + 1 : total + 2)}>{tests.length ? 'Next' : 'See the result'}</button>
        </div>
      </div>
    );
  }

  if (step === total + 1) {
    const done = tests.every((t) => stateQuestions(t).every((q) => sa[t.key]?.[q.id]));
    return (
      <div className="calc-result">
        <p className="small muted" style={{ margin: 0 }}>Step 2: {st.name}</p>
        {tests.map((t) => (
          <div key={t.key} style={{ marginTop: 12 }}>
            <h3 style={{ margin: '0 0 4px' }}>{t.label}: {TYPE_NAME[t.type] || 'State test'}</h3>
            <p className="small" style={{ margin: 0 }}>{t.text}</p>
            <p className="small muted" style={{ margin: '4px 0 0' }}>Source: <a href={t.url}>{t.cite}</a></p>
            {stateQuestions(t).map((q) => (
              <fieldset key={q.id} style={{ border: 0, padding: 0, margin: '12px 0 0' }}>
                <legend style={{ fontWeight: 600 }}>{q.q}</legend>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  {YNU.map(([v, label]) => (
                    <button key={v} type="button" aria-pressed={sa[t.key]?.[q.id] === v}
                      style={{ ...choiceStyle(sa[t.key]?.[q.id] === v), width: 'auto', margin: 0, padding: '8px 16px' }}
                      onClick={() => setSa({ ...sa, [t.key]: { ...(sa[t.key] || {}), [q.id]: v } })}>{label}</button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        ))}
        <div className="btn-row" style={{ marginTop: 20 }}>
          <button type="button" className="btn small secondary" onClick={() => go(total)}>Back</button>
          <button type="button" className="btn small" disabled={!done} onClick={() => go(total + 2)}>See the result</button>
        </div>
      </div>
    );
  }

  const r = overall({ factors, state, stateAnswers: sa });
  if (r.error) return <div className="error-box" role="alert">{r.error}</div>;
  return <Result r={r} factors={factors} st={st} restart={restart} back={() => go(tests.length ? total + 1 : total)} />;
}

function Result({ r, factors, st, restart, back }) {
  const meta = RATING[r.rating];
  const tone = TONE[meta.tone];
  return (
    <div className="calc-result" aria-live="polite">
      <div style={{ border: `2px solid ${tone.border}`, background: tone.bg, borderRadius: 'var(--radius)', padding: 16 }}>
        <span className="small muted">Overall risk rating</span>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>{meta.title}</div>
        {r.rating === 'uncertain' && <p style={{ margin: '8px 0 0', fontWeight: 700 }}>High risk, talk to an employment attorney before you classify this worker.</p>}
        {r.rating === E && <p style={{ margin: '8px 0 0' }}>Your answers line up with how employees are usually treated. Paying this worker as a contractor carries real risk.</p>}
        {r.rating === C && <p style={{ margin: '8px 0 0' }}>Your answers line up with an independent business. That is a lower risk, not a guarantee. Keep the facts true in practice, not just on paper.</p>}
      </div>
      <p className="small" style={{ marginTop: 12 }}>This is a risk rating from your answers, not a legal conclusion.</p>

      <h3 style={{ marginBottom: 4 }}>Federal factors (29 CFR 795.110)</h3>
      <table className="doc-table">
        <thead><tr><th>Factor</th><th>Your answer</th></tr></thead>
        <tbody>
          {FACTORS.map((f) => (
            <tr key={f.id}><td>{f.name}</td><td>{FACTOR_LABEL[factors[f.id]]}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="small">Federal factors alone: <b>{RATING[r.federal.rating].title}</b> ({r.federal.employee} toward employee, {r.federal.mixed} mixed, {r.federal.contractor} toward contractor).</p>

      {st && r.states.length > 0 && (
        <>
          <h3 style={{ marginBottom: 4 }}>{st.name}</h3>
          {r.states.map((s) => (
            <p key={s.key} className="small" style={{ margin: '4px 0 0' }}>{s.label}: <b>{RATING[s.result].title}</b>{s.result === E ? '. One "no" is enough to fail this test.' : ''}</p>
          ))}
        </>
      )}
      {st?.extra && (
        <div style={{ marginTop: 12 }}>
          <p className="small" style={{ margin: 0 }}><b>Also in {st.name}, if it applies to you:</b></p>
          {st.extra.map((x) => (
            <p key={x.cite + x.text} className="small" style={{ margin: '6px 0 0' }}>{x.law ? <b>{x.law}. </b> : null}{x.text} <a href={x.url}>{x.cite}</a></p>
          ))}
        </div>
      )}
      {r.stateUnread && <p className="small" style={{ color: 'var(--warn)' }}>{r.stateUnread} This rating uses the federal factors only.</p>}
      {r.noState && <p className="small" style={{ color: 'var(--warn)' }}>You skipped the state test. Many states are stricter than the federal factors, so this rating may understate the risk.</p>}

      <div className="btn-row">
        <button type="button" className="btn small secondary" onClick={back}>Back</button>
        <button type="button" className="btn small secondary" onClick={restart}>Start over</button>
      </div>
    </div>
  );
}

function StateTable() {
  return (
    <div className="table-scroll">
      <table className="doc-table">
        <thead><tr><th>State</th><th>Unemployment test</th><th>Wage law test, if different</th><th>Source</th></tr></thead>
        <tbody>
          {STATE_TESTS.map((s) => (
            <tr key={s.code}>
              <td>{s.name}</td>
              <td>{s.ui ? TYPE_NAME[s.ui.type] : 'Not confirmed from an official source'}</td>
              <td>{s.wage ? TYPE_NAME[s.wage.type] : ''}</td>
              <td>{s.ui ? <a href={s.ui.url}>{s.ui.cite}</a> : ''}{s.wage ? <>; <a href={s.wage.url}>{s.wage.cite}</a></> : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ContractorCheck() {
  return (
    <Layout path={CONTRACTOR_PATH}>
      <Crumbs items={[['/', 'Home'], ['/tools', 'Free tools'], [null, 'Contractor vs Employee Check']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>Independent Contractor vs Employee Check</h1>
        <p className="lede" style={{ marginTop: 20 }}>Answer six short questions about how the work actually happens, pick the state, and get a risk rating for each federal factor plus an overall rating: likely employee, high risk, or likely contractor. State tests are layered on top, each linked to the statute it comes from. Free, no signup, and nothing you enter leaves the page.</p>
        <div className="calc-result" style={{ marginTop: 16, borderColor: 'var(--warn)' }}>
          <p className="small" style={{ margin: 0 }}><b>Read this first. This tool is informational only and is not legal advice.</b> How you classify a worker affects payroll taxes, unemployment and workers' compensation coverage, overtime and benefits, and your liability if an agency or court disagrees. Using this tool does not create an attorney-client relationship with anyone. It gives a risk rating, never a legal conclusion. For any real decision, and always when the result is high risk, talk to an employment attorney licensed in your state.</p>
        </div>
      </div>

      <section className="section wrap" aria-labelledby="calc-h" style={{ paddingTop: 8 }}>
        <h2 id="calc-h">Run the check</h2>
        <p className="small muted">Everything is worked out in your browser. Nothing you enter is sent anywhere or saved.</p>
        <Checker />
      </section>

      <section className="section wrap" aria-labelledby="rule-h">
        <h2 id="rule-h">Where the federal test stands</h2>
        <p>The six questions come from the Department of Labor's 2024 rule, <a href={RULE_URL}>29 CFR 795.110</a>: opportunity for profit or loss, investments, permanence, control, whether the work is integral to the business, and skill and initiative. No one factor decides it, and how the work happens in practice counts more than what a contract says.</p>
        <p>Two things changed since then. On May 1, 2025 the department told its investigators to stop applying the 2024 rule in their own investigations and to use its older guidance instead (<a href={FAB_URL}>Field Assistance Bulletin 2025-1</a>). That bulletin also says the 2024 rule still applies in private lawsuits. On February 26, 2026 the department proposed a rule to replace it, built on two core factors, control and opportunity for profit or loss (<a href={NPRM_URL}>proposed rule</a>). As of this writing it is a proposal, not a final rule.</p>
      </section>

      <section className="section wrap" aria-labelledby="table-h">
        <h2 id="table-h">State tests at a glance</h2>
        <p>Each state's unemployment test, and its wage law test where that is different, read on the state's own code or labor agency site. Construction and trucking often have extra rules; the checker shows those when you pick the state.</p>
        <StateTable />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={CONTRACTOR_FAQ} />
      </section>

      <section className="section wrap" aria-labelledby="cta-h">
        <div className="calc-result">
          <h2 id="cta-h" style={{ marginTop: 0 }}>Running crews on public jobs?</h2>
          <p>Same small contractors, same paperwork headaches. If you also run payroll on Davis-Bacon jobs, the <a href={WH347_API}>{WH347.name}</a> checks a certified payroll before it goes in. {dollars(WH347.priceCents)} per completed check, with free sample runs on the page.</p>
          <p style={{ marginBottom: 0 }}><a className="btn" href={WH347_API}>Check a certified payroll</a></p>
        </div>
      </section>
      <ToolSignup source={CONTRACTOR_PATH} blurb="We will email you when there is a new free payroll or compliance tool." />
    </Layout>
  );
}
