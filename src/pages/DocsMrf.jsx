import Layout, { Crumbs } from '../site/Layout.jsx';
import CodeSample, { Json } from '../site/CodeSample.jsx';
import { MRF_CODES } from '../site/codes.js';
import { apiBySlug } from '../catalog.js';
import paidPass from '../content/examples/mrf-paid-pass.json';
import inputError from '../content/examples/mrf-input-error.json';

const API = apiBySlug('hospital-mrf-validator');

const CURL = `# JSON file
curl -X POST "https://www.spreadrun.com/api/v1/hospital-mrf-validator?maxRecords=500" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data-binary @standardcharges.json

# Gzip upload, metadata and headers only
curl -X POST "https://www.spreadrun.com/api/v1/hospital-mrf-validator?mode=preflight" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  --data-binary @standardcharges.csv.gz`;

const PY = `import os, requests

with open("123456789_example-hospital_standardcharges.json", "rb") as f:
    r = requests.post(
        "https://www.spreadrun.com/api/v1/hospital-mrf-validator",
        params={"maxRecords": 1000, "filename": "123456789_example-hospital_standardcharges.json"},
        headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
        data=f,
        timeout=60,
    )
r.raise_for_status()
report = r.json()["report"]
if report["status"] == "FAIL":
    raise SystemExit([i["code"] for i in report["issues"]])`;

export default function DocsMrf() {
  return (
    <Layout path={`/docs/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/docs', 'Docs'], [null, 'Hospital MRF Validator']]} />
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>Hospital MRF Validator API</h1>
        <p className="lede" style={{ marginTop: 20 }}>Beta. Structural preflight of a hospital price file against the CMS v3.0.0 schema and CSV templates. <a href={`/apis/${API.slug}`}>Product page and free test form.</a></p>
        <nav className="toc" aria-label="On this page">
          <a href="#endpoint">Endpoint</a><a href="#input">Request</a><a href="#coverage">What gets inspected</a><a href="#report">Report</a><a href="#codes">Finding codes</a><a href="#errors">Errors</a><a href="#examples">Code samples</a>
        </nav>

        <h2 id="endpoint">Endpoint</h2>
        <table className="doc-table"><tbody>
          <tr><th>Paid</th><td><code>POST https://www.spreadrun.com/api/v1/hospital-mrf-validator</code>, API key required, $0.25 per completed validation</td></tr>
          <tr><th>Demo</th><td><code>POST https://www.spreadrun.com/api/demo/hospital-mrf-validator</code>, no key, 2 MB, 100 records, 10 runs per day</td></tr>
          <tr><th>Body</th><td>The raw file bytes. Any Content-Type; the format is detected from the content.</td></tr>
        </tbody></table>

        <h2 id="input">Request</h2>
        <p>Send the file itself as the request body: CMS v3.0.0 JSON, tall CSV or wide CSV, in UTF-8, optionally gzip-compressed. There is no URL mode in this version.</p>
        <table className="doc-table">
          <thead><tr><th>Query parameter</th><th>Default</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>mode</code></td><td><code>sample</code></td><td><code>sample</code> checks metadata, structure and records. <code>preflight</code> checks metadata and structure only. Records are not read, so a file that has records gets a SAMPLE_LIMIT warning.</td></tr>
            <tr><td><code>maxRecords</code></td><td><code>100</code></td><td>Standard-charge records to inspect, 1 to 1000. Same price at any value.</td></tr>
            <tr><td><code>filename</code></td><td>none</td><td>Optional. Used only to report whether the name follows the CMS naming pattern (<code>source.cmsFilenamePattern</code>).</td></tr>
          </tbody>
        </table>
        <p>Rejected with HTTP 400 and not charged: an empty body, a corrupt or incomplete gzip upload, or invalid parameters. Over 4.4 MB: HTTP 413. A file that is not a valid price file (a PDF, HTML, broken JSON) is not an input error: it gets a completed FAIL report with <code>UNSUPPORTED_FORMAT</code> or <code>PARSER_ERROR</code>, and that run is charged.</p>

        <h2 id="coverage">What gets inspected</h2>
        <p>Up to 4.4 MB of upload, expanded to at most 16 MB if gzip. Within that, the validator reads metadata and template structure, then the first <code>maxRecords</code> standard-charge records. Real hospital files are often far larger, so most reports on full-size files cover a sample: <code>file.recordsInspected</code> and <code>file.truncatedByLimit</code> say exactly what was read, and a <code>SAMPLE_LIMIT</code> warning turns a clean result into WARN rather than PASS. For full-file validation use CMS's free <a href="https://cmsgov.github.io/hpt-tool/">Hospital Price Transparency Validator</a>.</p>

        <h2 id="report">Report</h2>
        <table className="doc-table">
          <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>status</code></td><td><code>FAIL</code> if any error, <code>WARN</code> if only warnings (for example a sample limit), otherwise <code>PASS</code>.</td></tr>
            <tr><td><code>validationMode</code></td><td><code>sample</code> or <code>preflight</code>.</td></tr>
            <tr><td><code>source</code></td><td>Upload facts: <code>format</code> (json or csv), <code>encoding</code>, <code>compressed</code>, <code>cmsFilenamePattern</code>.</td></tr>
            <tr><td><code>file</code></td><td><code>bytesRead</code>, <code>decompressedBytes</code>, <code>recordsInspected</code>, <code>truncatedByLimit</code>, <code>sha256</code> of the upload.</td></tr>
            <tr><td><code>checks</code></td><td><code>parseable</code>, <code>requiredMetadataPresent</code>, <code>requiredStructurePresent</code> (true, false or null when undetermined). <code>reachable</code> is null for uploads.</td></tr>
            <tr><td><code>coverage</code></td><td>Records inspected and the share that have a description, code information and standard charges.</td></tr>
            <tr><td><code>issues</code></td><td>Up to 100 findings with <code>severity</code> (ERROR or WARNING), <code>code</code>, <code>location</code> and <code>message</code>. Values from your file are never echoed.</td></tr>
            <tr><td><code>issueCounts</code>, <code>issuesOmitted</code></td><td>Totals per severity, and findings beyond the 100 listed.</td></tr>
            <tr><td><code>summary.safeForDownstreamIngestion</code></td><td>true for PASS, false for FAIL, null for WARN.</td></tr>
            <tr><td><code>limitations</code></td><td>What the validator does not determine.</td></tr>
          </tbody>
        </table>

        <h2 id="codes">Finding codes</h2>
        <p>Schema findings are named <code>SCHEMA_</code> plus the JSON Schema rule that failed.</p>
        <table className="doc-table">
          <thead><tr><th>Code</th><th>Meaning</th></tr></thead>
          <tbody>{Object.entries(MRF_CODES).map(([c, m]) => <tr key={c}><td><code>{c}</code></td><td>{m}</td></tr>)}</tbody>
        </table>

        <h2>Example response</h2>
        <p>A paid validation of the <a href="/samples/mrf-valid-tall.csv">synthetic tall CSV sample</a> with <code>maxRecords=500</code>. Generated by running the real endpoint code.</p>
        <Json value={paidPass.body} />

        <h2 id="errors">Errors</h2>
        <p>See the <a href="/docs#errors">shared error table</a>. Example input error (HTTP {inputError.status}, not charged):</p>
        <Json value={inputError.body} />

        <h2 id="examples">Code samples</h2>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </div>
    </Layout>
  );
}
