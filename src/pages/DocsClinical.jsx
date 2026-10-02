import Layout, { Crumbs } from '../site/Layout.jsx';
import CodeSample, { Json } from '../site/CodeSample.jsx';
import { CLINICAL_CODES } from '../site/codes.js';
import { apiBySlug } from '../catalog.js';
import paidFail from '../content/examples/clinical-paid-fail.json';
import inputError from '../content/examples/clinical-input-error.json';

const API = apiBySlug('clinical-trial-table-validator');

const REQ = `{
  "studiesCsv": "trial_id,condition,phase\\nNCT90000001,Type 2 diabetes,PHASE3\\n...",
  "outcomesCsv": "trial_id,outcome_id,outcome_type,primary_endpoint,result_status,results_first_post_date\\n..."
}`;

const CURL = `curl -X POST https://www.spreadrun.com/api/v1/clinical-trial-table-validator \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data "$(jq -n --rawfile s studies.csv --rawfile o outcomes.csv '{studiesCsv: $s, outcomesCsv: $o}')"`;

const PY = `import os, requests

r = requests.post(
    "https://www.spreadrun.com/api/v1/clinical-trial-table-validator",
    headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
    json={
        "studiesCsv": open("studies.csv", encoding="utf-8").read(),
        "outcomesCsv": open("outcomes.csv", encoding="utf-8").read(),
    },
    timeout=60,
)
if r.status_code == 400:
    print("Input rejected (not charged):", r.json()["error"]["message"])
r.raise_for_status()
body = r.json()
print(body["report"]["status"], body["report"]["issueCounts"], "balance", body["balanceCents"])`;

export default function DocsClinical() {
  return (
    <Layout path={`/docs/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/docs', 'Docs'], [null, API.name]]} />
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>{API.name} API</h1>
        <p className="lede" style={{ marginTop: 20 }}>Structural QA of two normalized tables. <a href={`/apis/${API.slug}`}>Product page and free test form.</a></p>
        <nav className="toc" aria-label="On this page">
          <a href="#endpoint">Endpoint</a><a href="#input">Request</a><a href="#report">Report</a><a href="#codes">Finding codes</a><a href="#errors">Errors</a><a href="#examples">Code samples</a>
        </nav>

        <h2 id="endpoint">Endpoint</h2>
        <table className="doc-table"><tbody>
          <tr><th>Paid</th><td><code>POST https://www.spreadrun.com/api/v1/clinical-trial-table-validator</code>, API key required, $0.25 per completed audit</td></tr>
          <tr><th>Demo</th><td><code>POST https://www.spreadrun.com/api/demo/clinical-trial-table-validator</code>, no key, 512 KB, 10 runs per day</td></tr>
          <tr><th>Content-Type</th><td><code>application/json</code></td></tr>
        </tbody></table>

        <h2 id="input">Request</h2>
        <p>A JSON object with exactly two string fields, each holding a UTF-8 CSV table with a header row. Extra fields are rejected.</p>
        <pre className="code"><code>{REQ}</code></pre>
        <table className="doc-table">
          <thead><tr><th>Field</th><th>Required columns</th></tr></thead>
          <tbody>
            <tr><td><code>studiesCsv</code></td><td><code>trial_id</code>, <code>condition</code>, <code>phase</code>. One row per trial.</td></tr>
            <tr><td><code>outcomesCsv</code></td><td><code>trial_id</code>, <code>outcome_id</code>, <code>outcome_type</code>, <code>primary_endpoint</code>, <code>result_status</code>, <code>results_first_post_date</code>. One row per outcome measure.</td></tr>
          </tbody>
        </table>
        <p>Rejected with HTTP 400 and not charged: a body that is not this JSON object, a missing or empty table, missing required columns, duplicate headers, more than 40 columns, rows with a different number of cells than the header, malformed CSV, more than 10,000 rows in a table, more than 5 MiB of CSV in total, or a request body over 4.4 MB (HTTP 413). The last limit comes first in practice.</p>

        <h2 id="report">Report</h2>
        <table className="doc-table">
          <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>status</code></td><td><code>PASS</code> when no rule fired, otherwise <code>FAIL</code>.</td></tr>
            <tr><td><code>rowCounts</code></td><td>Data rows read from each table.</td></tr>
            <tr><td><code>fieldCoverage</code></td><td>Share of rows with a non-empty value, per required column, 0 to 1.</td></tr>
            <tr><td><code>issueCount</code>, <code>issueCounts</code></td><td>Total findings and findings per code.</td></tr>
            <tr><td><code>issues</code></td><td>Up to 1,000 findings: <code>table</code>, <code>record</code> (1-based data row, header excluded), <code>field</code>, <code>code</code>. Cell values are never echoed.</td></tr>
            <tr><td><code>issuesTruncated</code></td><td>True when more than 1,000 findings exist.</td></tr>
            <tr><td><code>inputSha256</code></td><td>SHA-256 of each submitted table, so you can tie a report to an exact input.</td></tr>
            <tr><td><code>scope</code></td><td>What the audit does not certify.</td></tr>
          </tbody>
        </table>
        <p>The audit is deterministic: the same tables always produce the same report.</p>

        <h2 id="codes">Finding codes</h2>
        <table className="doc-table">
          <thead><tr><th>Code</th><th>Meaning</th></tr></thead>
          <tbody>{Object.entries(CLINICAL_CODES).map(([c, m]) => <tr key={c}><td><code>{c}</code></td><td>{m}</td></tr>)}</tbody>
        </table>

        <h2>Example response</h2>
        <p>A paid audit of the synthetic sample tables with defects (<a href="/samples/clinical-studies.csv">studies</a>, <a href="/samples/clinical-outcomes.csv">outcomes</a>). Generated by running the real endpoint code.</p>
        <Json value={paidFail.body} />

        <h2 id="errors">Errors</h2>
        <p>See the <a href="/docs#errors">shared error table</a>. Example input error (HTTP {inputError.status}, not charged):</p>
        <Json value={inputError.body} />

        <h2 id="examples">Code samples</h2>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </div>
    </Layout>
  );
}
