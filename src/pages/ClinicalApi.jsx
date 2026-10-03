import Badges from '../site/Badges.jsx';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import CodeSample from '../site/CodeSample.jsx';
import { ClinicalDemo } from '../site/Demo.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import example from '../content/examples/clinical-paid-fail.json';

const API = apiBySlug('clinical-trial-table-validator');

// Copy: content/PAGE_clinical-trial-qa.md. "What it checks" was rewritten to list only the rules the
// validator actually runs (no near-duplicate, orphan-study, start/completion-date or JSON-table checks exist).
export const CLINICAL_FAQ = [
  ['What exactly do I submit?',
    'Two CSV tables, sent as CSV text inside one JSON request. The studies table needs the columns trial_id, condition and phase, one row per trial. The outcomes table needs trial_id, outcome_id, outcome_type, primary_endpoint, result_status and results_first_post_date, one row per outcome measure, linked to studies by trial_id. Other columns are allowed (up to 40 per table) and ignored.'],
  ['Where does the source data usually come from?',
    'Most users pull from the ClinicalTrials.gov API v2 or the AACT (Aggregate Analysis of ClinicalTrials.gov) database, then normalize into their own schema. The audit validates your normalized tables, whatever the upstream source.'],
  ['Does this replace ClinicalTrials.gov\'s own quality control?',
    'No. ClinicalTrials.gov\'s PRS system validates records submitted to the registry. This validates the tables you extracted and normalized for your own analysis or product: a different stage, with different failure modes (bad joins, dropped rows, mangled dates from your ETL, not theirs).'],
  ['Will it fix my data?',
    'No, deliberately. It reports, with exact locations. Automated fixing of trial data would be irresponsible; a person, or your pipeline logic, decides each correction. Re-run after fixing to confirm clean.'],
  ['What\'s an "orphan outcome" and why does it matter?',
    'An outcome row whose trial_id matches no row in the studies table. It usually means a dropped or mismatched study record upstream, and it silently breaks any join between the two tables. It is one of the most common silent-corruption patterns in merged trial datasets.'],
  ['How is pricing counted?',
    '$0.25 per completed audit: one submission of your table pair, one full report, PASS or FAIL. Requests rejected before an audit runs (bad JSON, missing columns, ragged rows, over the size limit) are free. Re-runs after fixes are billed the same way, which is why you fix from the report rather than guessing.'],
  ['Is my data stored or shared?',
    'Your tables are processed in memory for the length of the request and are not stored or shared. The report does not repeat your cell values. For billing and usage we log the time, endpoint, result status, request size and duration, never the table contents.'],
  ['Can I use this inside an automated pipeline?',
    'Yes, that is the primary design case. REST endpoint, API key, structured JSON report with machine-readable finding codes. A downstream step can fail the build whenever status is FAIL.'],
  ['Does it check clinical accuracy or regulatory compliance?',
    'No. It is structural QA of your tables. It does not judge whether results are clinically correct, current, authentic, or compliant with reporting rules.'],
];

const CURL = `curl -X POST https://www.spreadrun.com/api/v1/clinical-trial-table-validator \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data "$(jq -n --rawfile s studies.csv --rawfile o outcomes.csv \\
            '{studiesCsv: $s, outcomesCsv: $o}')"`;

const PY = `import os, requests

payload = {
    "studiesCsv": open("studies.csv", encoding="utf-8").read(),
    "outcomesCsv": open("outcomes.csv", encoding="utf-8").read(),
}
r = requests.post(
    "https://www.spreadrun.com/api/v1/clinical-trial-table-validator",
    headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
    json=payload,
    timeout=60,
)
r.raise_for_status()
report = r.json()["report"]
if report["status"] == "FAIL":
    for issue in report["issues"]:
        print(issue["table"], issue["record"], issue["field"], issue["code"])
    raise SystemExit(1)`;

export default function ClinicalApi() {
  return (
    <Layout path={`/apis/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/apis', 'APIs'], [null, API.name]]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <Badges api={API} style={{ marginBottom: 14 }} />
        <h1>Clinical Trial Table QA API: Validate Results Data</h1>
        <p className="lede" style={{ marginTop: 20 }}>Validate normalized clinical-trial study and outcome tables before they feed your analysis, your joins, or your customers. Submit your tables; get a deterministic audit that flags malformed NCT IDs, missing required fields, duplicate records, orphan outcomes, invalid outcome types and bad results-posting dates, with exact row locations for every finding. {dollars(API.priceCents)} per completed audit. No subscription.</p>
        <div className="note">
          <p><b>A PASS does not mean the data is accepted anywhere.</b> These are structural checks, not legal, regulatory or compliance advice, and a PASS does not mean the tables would be accepted by a registry or survive an audit.</p>
        </div>
        <div className="btn-row">
          <a className="btn" href="#demo">Run an audit</a>
          <a className="btn secondary" href="/account">Get API access</a>
        </div>
      </div>

      <section className="section wrap split" aria-labelledby="checks">
        <div>
          <h2 id="checks">What it checks</h2>
          <p>One audit runs every rule, deterministically, every time:</p>
          <ul className="checklist">
            <li><b>NCT ID validity.</b> Every trial_id in both tables must be <code>NCT</code> followed by exactly 8 digits. Malformed IDs are listed with their row.</li>
            <li><b>Required fields.</b> The required columns must exist, and every row must have a value in each of them. <a href={`/docs/${API.slug}#input`}>See the required-column list.</a></li>
            <li><b>Duplicate records.</b> One row per trial_id in the studies table, one row per trial_id plus outcome_id in the outcomes table. Exact repeats are flagged.</li>
            <li><b>Orphan outcomes.</b> Outcome rows that reference a trial_id with no matching study row: the join-breaker.</li>
            <li><b>Outcome type.</b> Must be PRIMARY, SECONDARY or OTHER_PRE_SPECIFIED.</li>
            <li><b>Results posting date.</b> results_first_post_date must be a real calendar date written as YYYY-MM-DD, so 2026-02-30 is caught.</li>
            <li><b>Structural integrity.</b> Unique headers, the same number of cells in every row, well-formed CSV. Tables that fail these are rejected before the audit and not charged.</li>
          </ul>
          <p>Every finding includes the table, row number, field, and the rule that fired, so fixing is mechanical, not detective work. The report also gives the share of non-empty values per required column.</p>
          <p>Why these checks, and how trial tables break in the first place: <a href="/guides/clinical-trial-data-quality-checks">Clinical Trial Data Quality Checks: A Practical Guide</a>.</p>
        </div>
        <div>
          <h2>Who it's for</h2>
          <ul>
            <li><b>Researchers and evidence-synthesis teams:</b> audit extracted trial tables before meta-analysis or systematic review. A bad join upstream poisons everything downstream.</li>
            <li><b>Data vendors:</b> QA the trial datasets you sell or license, as a gate before each delivery.</li>
            <li><b>Developers:</b> validate tables pulled from the ClinicalTrials.gov API v2 or the AACT database after your own normalization.</li>
            <li><b>AI agents and automation:</b> REST endpoint, JSON in and out, deterministic results a downstream agent can act on without a person in the loop.</li>
          </ul>
          <p className="small muted">Limits per audit: 10,000 rows and 40 columns per table, request body up to 4.4 MB, the first 1,000 findings listed in full with complete counts.</p>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="how">
        <h2 id="how">How it works</h2>
        <ol className="steps">
          <li><h3>Submit</h3><p>Send your normalized studies table and outcomes table as CSV text in one JSON request, or upload them in the test form below.</p></li>
          <li><h3>Audit</h3><p>Every check runs deterministically against the documented rule set. Same input, same report, every time.</p></li>
          <li><h3>Fix from the report</h3><p>Each finding comes with its exact location. Correct your source data and re-run to confirm clean. A clean re-run is your QA evidence.</p></li>
        </ol>
      </section>

      <section className="section wrap" id="demo" aria-labelledby="demo-h">
        <h2 id="demo-h">Try it now</h2>
        <ClinicalDemo api={API} sample={example.body.report} />
      </section>

      <section className="section wrap" aria-labelledby="price-h">
        <h2 id="price-h">Pricing</h2>
        <p><b>{dollars(API.priceCents)} per completed audit.</b> One submission (studies table plus outcomes table), one full report.</p>
        <ul>
          <li>Billed only when an audit completes and produces a report, PASS or FAIL. Unreadable or malformed inputs are not billed.</li>
          <li>No subscription, no seats. Prepaid credits from $5 (20 audits). Credits never expire. <a href="/apis#pricing">All pricing</a></li>
          <li>Running it on a schedule? Each call is one audit, so call it from your scheduler or CI. Questions about volume: <a href="/contact">contact us</a>.</li>
        </ul>
        <div className="btn-row"><a className="btn" href="#demo">Run an audit</a><a className="btn secondary" href="/account">Get API access</a></div>
      </section>

      <section className="section wrap" aria-labelledby="code-h">
        <h2 id="code-h">Call it from code</h2>
        <p>Full request and response reference, error codes and limits are in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={CLINICAL_FAQ} />
        <p className="small" style={{ marginTop: 24 }}>More validators: <a href="/apis/hospital-mrf-validator">Hospital Price Transparency MRF Validator</a> | <a href="/apis">the full catalog</a></p>
      </section>
    </Layout>
  );
}
