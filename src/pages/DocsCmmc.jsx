import Layout, { Crumbs } from '../site/Layout.jsx';
import CodeSample, { Json } from '../site/CodeSample.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import paidPass from '../content/examples/cmmc-paid-pass.json';
import demoFail from '../content/examples/cmmc-demo-fail.json';
import inputError from '../content/examples/cmmc-input-error.json';
import { CmmcSources } from './CmmcApi.jsx';
import { REQS, FAMILIES } from '../site/CmmcDemo.jsx';

const API = apiBySlug('cmmc-self-assessment-validator');

const TOP = [
  ['asOf', 'Optional. YYYY-MM-DD the dates are checked against. Default: today (UTC).'],
  ['assessment.level', 'Required. 2. Level 1 has no score and is not supported.'],
  ['assessment.assessmentDate', 'YYYY-MM-DD. Must not be in the future or three or more years old.'],
  ['assessment.claimedScore', 'Optional whole number: the score you plan to post. Compared with the verified score.'],
  ['assessment.cageCodes', 'List of every industry CAGE code associated with the systems in scope. Each is five letters or digits.'],
  ['assessment.scopeDefined', 'true when the CMMC Assessment Scope (every asset assessed) is defined.'],
  ['assessment.sspInPlace', 'true when a system security plan covers every system in scope. false means no score.'],
  ['assessment.poamInPlace', 'true when a POA&M is in place for every requirement not MET.'],
  ['assessment.statusDate', 'Optional. YYYY-MM-DD the result was posted in SPRS (the CMMC Status Date). Used for the 180-day POA&M closeout window.'],
  ['affirmation.affirmingOfficialIdentified', 'true when the Affirming Official is named. Do not send the name.'],
  ['affirmation.titleAndContactProvided', 'true when their title and contact information are included.'],
  ['affirmation.statementAffirmed', 'true when the affirmation statement has been made.'],
  ['affirmation.affirmationDate', 'YYYY-MM-DD of the latest affirmation.'],
  ['requirements', 'List of objects, one per requirement: id (3.1.1, or AC.L2-3.1.1) and status. Send this or requirementsCsv.'],
  ['requirementsCsv', 'CSV text with a header row naming a requirement column (requirement, requirement id, id or control) and a status column (status or result). Other columns are ignored. Up to 64 KB.'],
];

const STATUSES = [
  ['MET', 'All applicable assessment objectives are met. No deduction. Enduring exceptions and temporary deficiencies handled as the regulation describes count as MET.'],
  ['NOT MET', 'One or more objectives not met. The requirement\'s full value is deducted.'],
  ['NOT APPLICABLE', 'Also N/A or NA. Counts as MET. 3.12.4 can never be N/A.'],
  ['PARTIAL', '3.5.3 and 3.13.11 only, 3 points deducted instead of 5. 3.5.3: MFA is implemented only for remote and privileged users. 3.13.11: encryption is employed but is not FIPS-validated.'],
];

const RULES = [
  ['CMMC-REQ-MISSING', 'error', 'No result for a requirement. No score is given until all 110 have one.'],
  ['CMMC-REQ-UNKNOWN', 'error', 'A row that is not one of the 110 NIST SP 800-171 Rev 2 requirements, or has the wrong family prefix.'],
  ['CMMC-REQ-DUPLICATE', 'error', 'A requirement given more than once.'],
  ['CMMC-REQ-STATUS', 'error', 'A result other than MET, NOT MET, NOT APPLICABLE or PARTIAL.'],
  ['CMMC-REQ-PARTIAL', 'error', 'PARTIAL on a requirement other than 3.5.3 or 3.13.11.'],
  ['CMMC-SSP-MISSING', 'error', '3.12.4 not MET, marked N/A, or sspInPlace false. No score can be given.'],
  ['CMMC-SSP-CONFIRM', 'warning', 'sspInPlace not confirmed.'],
  ['CMMC-SCORE-MISMATCH', 'error', 'The claimed score differs from the verified score.'],
  ['CMMC-SCORE-RANGE', 'error', 'The claimed score is outside -203 to 110.'],
  ['CMMC-POAM-MISSING', 'error', 'Requirements are NOT MET and poamInPlace is not true.'],
  ['CMMC-POAM-INELIGIBLE', 'warning', 'A NOT MET requirement that may not be on a POA&M, so no Level 2 (Self) status is possible until it is MET.'],
  ['CMMC-BAND-NONE', 'warning', 'The verified score does not reach a Level 2 (Self) status.'],
  ['CMMC-BAND-CONDITIONAL', 'warning', 'Conditional, not Final: the POA&M must be closed out within 180 days of the CMMC Status Date.'],
  ['CMMC-STATUS-EXPIRING', 'warning', 'The 180-day closeout window ends within 30 days of asOf.'],
  ['CMMC-STATUS-EXPIRED', 'error', 'More than 180 days since the CMMC Status Date of a conditional result.'],
  ['CMMC-CAGE-MISSING', 'error', 'No CAGE code.'],
  ['CMMC-CAGE-FORMAT', 'error', 'A CAGE code that is not five letters or digits.'],
  ['CMMC-CAGE-DUPLICATE', 'warning', 'The same CAGE code listed twice.'],
  ['CMMC-SCOPE-MISSING', 'error', 'scopeDefined is not true.'],
  ['CMMC-DATE-MISSING', 'error', 'No assessment date.'],
  ['CMMC-DATE-FORMAT', 'error', 'Assessment date not in YYYY-MM-DD form.'],
  ['CMMC-DATE-FUTURE', 'error', 'Assessment date after asOf.'],
  ['CMMC-DATE-EXPIRED', 'error', 'Assessment three or more years before asOf.'],
  ['CMMC-AFFIRM-MISSING', 'error', 'One of the three affirmation items is not true.'],
  ['CMMC-AFFIRM-DATE', 'error or warning', 'Affirmation date missing (warning) or not a valid date (error).'],
  ['CMMC-AFFIRM-FUTURE', 'error', 'Affirmation date after asOf.'],
  ['CMMC-AFFIRM-BEFORE', 'error', 'Affirmation dated before the assessment.'],
  ['CMMC-AFFIRM-STALE', 'error', 'Latest affirmation a year or more before asOf.'],
];

const PY = `import json, os, requests

r = requests.post(
    "https://www.spreadrun.com/api/v1/cmmc-self-assessment-validator",
    headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
    json=json.load(open("self_assessment.json")),
    timeout=60,
)
r.raise_for_status()
report = r.json()["report"]
print(report["verifiedScore"], report["band"]["key"], [f["ruleId"] for f in report["findings"]])`;

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/cmmc-self-assessment-validator" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data-binary @self_assessment.json`;

const points = (r) => (r.points === null ? 'none (SSP)' : r.partialPoints ? `${r.points} (partial ${r.partialPoints})` : r.points);

export default function DocsCmmc() {
  const { notChecked, sources, findings: _f, ...shortReport } = paidPass.body.report;
  return (
    <Layout path={`/docs/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/docs', 'Docs'], [null, 'CMMC Self-Assessment Score Validator']]} />
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>CMMC Self-Assessment Score Validator API Reference</h1>
        <p className="lede" style={{ marginTop: 20 }}>Beta. Verifies one CMMC Level 2 self-assessment: the score recomputed with the CMMC Level 2 Scoring Methodology in 32 CFR 170.24, the POA&amp;M rules in 170.21, the SPRS details in 170.16 and the affirmation in 170.22. <a href={`/apis/${API.slug}`}>Product page and free test form.</a></p>
        <nav className="toc" aria-label="On this page">
          <a href="#endpoint">Endpoint</a><a href="#input">Request</a><a href="#statuses">Results</a><a href="#method">Scoring</a><a href="#report">Report</a><a href="#rules">Rule IDs</a><a href="#points">Point values</a><a href="#errors">Errors</a><a href="#examples">Code samples</a>
        </nav>

        <h2 id="endpoint">Endpoint</h2>
        <table className="doc-table"><tbody>
          <tr><th>Paid</th><td><code>POST https://www.spreadrun.com/api/v1/{API.slug}</code>, API key required, {dollars(API.priceCents)} per completed verification</td></tr>
          <tr><th>Demo</th><td><code>POST https://www.spreadrun.com/api/demo/{API.slug}</code>, no key, 64 KB, 10 runs per day</td></tr>
          <tr><th>Body</th><td>A JSON object, UTF-8, up to 256 KB. Text values up to 200 characters, except requirementsCsv; up to 300 requirement rows.</td></tr>
        </tbody></table>

        <h2 id="input">Request</h2>
        <table className="doc-table"><tbody>{TOP.map(([k, m]) => <tr key={k}><td><code>{k}</code></td><td>{m}</td></tr>)}</tbody></table>
        <p>Start from the <a href="/samples/cmmc-clean.json">sample package</a> or the <a href="/samples/cmmc-template.csv">CSV template</a>. The sample contractor is invented and uses the placeholder CAGE code 00000.</p>

        <h2 id="statuses">Requirement results</h2>
        <table className="doc-table"><tbody>{STATUSES.map(([k, m]) => <tr key={k}><td><code>{k}</code></td><td>{m}</td></tr>)}</tbody></table>
        <p>Case and spacing do not matter: <code>Not Met</code> and <code>NOT_MET</code> both read as NOT MET.</p>

        <h2 id="method">How the score is computed</h2>
        <ul>
          <li>Start at 110, the number of Level 2 requirements.</li>
          <li>For each requirement NOT MET, subtract its value: 5, 3 or 1 point (table below). PARTIAL subtracts 3 for 3.5.3 and 3.13.11. The lowest possible score is -203.</li>
          <li>3.12.4, the system security plan, has no value: without an SSP the assessment cannot be completed and there is no score.</li>
          <li>Final Level 2 (Self): 110. Conditional Level 2 (Self): at least 88 (0.8 of 110), and every NOT MET requirement allowed on a POA&amp;M, which means a 1-point requirement or 3.13.11 as PARTIAL, and never 3.1.20, 3.1.22, 3.10.3, 3.10.4, 3.10.5 or 3.12.4.</li>
        </ul>

        <h2 id="report">Report</h2>
        <table className="doc-table">
          <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>status</code></td><td><code>FAIL</code> if any error, <code>WARN</code> if only warnings, otherwise <code>PASS</code>. A conditional result is at least WARN. A PASS is not a certification and does not mean DoD will accept the score.</td></tr>
            <tr><td><code>verifiedScore</code>, <code>maxScore</code></td><td>The recomputed score, or null when the package is incomplete or has no SSP.</td></tr>
            <tr><td><code>band</code></td><td><code>key</code> (final, conditional, none or not-scored), <code>label</code> and <code>reason</code>.</td></tr>
            <tr><td><code>claimedScore</code></td><td><code>provided</code> and <code>matches</code> (true, false or null). Your number is never repeated.</td></tr>
            <tr><td><code>deductions</code>, <code>deductionsByFamily</code></td><td>Each requirement that cost points, with the points and whether partial credit applied, and the totals by family.</td></tr>
            <tr><td><code>readiness</code></td><td>The submission checklist: requirements, ssp, score, poam, sprs, affirmation and status, each ready, review or fix.</td></tr>
            <tr><td><code>findings</code></td><td>Errors first. Each has <code>severity</code>, <code>ruleId</code>, <code>path</code>, <code>message</code>, <code>source</code> and, where one applies, <code>requirement</code>. Findings never repeat a value from the input.</td></tr>
            <tr><td><code>counts</code>, <code>findingCount</code>, <code>findingCounts</code>, <code>ruleCounts</code></td><td>Totals.</td></tr>
            <tr><td><code>methodology</code>, <code>notChecked</code>, <code>sources</code>, <code>scope</code>, <code>input</code>, <code>inputSha256</code></td><td>The method and version used, what the report does not cover, where the rules come from, what the verdict means, and a fingerprint of the request body.</td></tr>
          </tbody>
        </table>

        <h2 id="rules">Rule IDs</h2>
        <div className="table-scroll">
          <table className="doc-table">
            <thead><tr><th>Rule</th><th>Severity</th><th>Meaning</th></tr></thead>
            <tbody>{RULES.map(([id, sev, m]) => <tr key={id}><td><code>{id}</code></td><td>{sev}</td><td>{m}</td></tr>)}</tbody>
          </table>
        </div>
        <p>Source keys, as returned in every report:</p>
        <table className="doc-table"><tbody>{Object.entries(sources).map(([k, v]) => <tr key={k}><td><code>{k}</code></td><td>{v}</td></tr>)}</tbody></table>
        <CmmcSources />
        <h3>Not checked</h3>
        <ul>{notChecked.map((n) => <li key={n}>{n}</li>)}</ul>

        <h2 id="points">Point values</h2>
        <p>From 32 CFR 170.24(c)(2)(i)(B). Requirement wording is shortened from NIST SP 800-171 Rev 2.</p>
        {Object.entries(FAMILIES).map(([fam, name]) => (
          <div key={fam}>
            <h3>{name} ({fam})</h3>
            <div className="table-scroll">
              <table className="doc-table">
                <thead><tr><th>Requirement</th><th>Points</th><th>Summary</th></tr></thead>
                <tbody>{REQS.filter((r) => r.family === fam).map((r) => <tr key={r.id}><td><code>{r.id}</code></td><td>{points(r)}</td><td>{r.label}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        ))}

        <h2>Example responses</h2>
        <p>A paid verification of the <a href="/samples/cmmc-clean.json">sample package</a> (report shortened), and the findings from a demo run of the <a href="/samples/cmmc-errors.json">sample with errors</a>. Both generated by running the real endpoint code.</p>
        <Json value={{ ...paidPass.body, report: shortReport }} />
        <Json value={demoFail.body.report.findings.slice(0, 6)} />

        <h2 id="errors">Errors</h2>
        <p>See the <a href="/docs#errors">shared error table</a>. Rejected with HTTP 400 and not charged: a body that is not a JSON object, no assessment object, a level other than 2, no requirement results, both or neither of requirements and requirementsCsv, a CSV without requirement and status columns, or wrong value types. Example (HTTP {inputError.status}):</p>
        <Json value={inputError.body} />

        <h2 id="examples">Code samples</h2>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </div>
    </Layout>
  );
}
