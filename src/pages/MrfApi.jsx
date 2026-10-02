import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import CodeSample from '../site/CodeSample.jsx';
import { MrfDemo } from '../site/Demo.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import example from '../content/examples/mrf-demo-fail.json';

const API = apiBySlug('hospital-mrf-validator');
export const CMS_TOOL = 'https://cmsgov.github.io/hpt-tool/';

// Copy: content/PAGE_mrf-validator.md. Edited to match V1: uploads only (no URL fetching), flat $0.25,
// checks list limited to rules the validator runs, honest size limits. See REBUILD_NOTES.md.
export const MRF_FAQ = [
  ['How is this different from CMS\'s own validator?',
    'CMS publishes a free Hospital Price Transparency Validator, online and as a command-line tool, that tests files against the CMS templates. It is a good tool for a one-off manual check, and it reads the whole file. Ours is built for programmatic use: a REST API with no installation, structured JSON reports your pipeline can parse, and all three CMS layouts (JSON, tall CSV, wide CSV) behind one endpoint. If a person needs to check one file once, use CMS\'s tool. If a system needs to check files repeatedly, use this.'],
  ['Which file formats are supported?',
    'CMS v3.0.0 JSON, tall CSV, and wide CSV: the three layouts in the CMS template and data specifications. UTF-8 only. Gzip-compressed uploads are fine. The format is detected automatically.'],
  ['Does a passing result mean our hospital is compliant?',
    'No. A validation checks the file against the published CMS template and data specifications: structure, required elements, formatting. Compliance is a legal determination CMS makes during enforcement review, and it can consider factors no file checker can see. Treat a passing report as evidence of diligence, not as a legal opinion.'],
  ['Can it fetch the file directly from our website?',
    'Not yet. In this version you upload the file. URL fetching is not offered, so there is nothing to configure on your server.'],
  ['Our files are huge. Will it handle them?',
    'Partly, and the report says exactly how much. An upload can be up to 4.4 MB, or up to 16 MB of content once a gzip upload is expanded. The validator checks the file\'s metadata and template structure, then inspects up to 1,000 standard-charge records (100 by default). Anything beyond that is not validated and the report says so with a SAMPLE_LIMIT warning. For exhaustive checks of very large files, run CMS\'s free validator on the whole file.'],
  ['Does it check the 2026 requirements?',
    'Yes, for the fields the CMS v3.0.0 schema defines. When a payer charge is a percentage or an algorithm, the count of allowed amounts is required, and the median, 10th percentile and 90th percentile allowed amounts are required unless the count is 0. Type 2 NPIs and the attestation must be present. It does not verify that the numbers were calculated from real remittance data, or that NPIs exist in the NPI registry.'],
  ['Is our file data stored or shared?',
    'Files are processed in memory for the length of the request and are not stored or shared. Reports do not repeat values from your file. For billing and usage we log the time, endpoint, result status, upload size and duration, never the file contents.'],
  ['What do I get in the report?',
    'A deterministic findings list: each problem with its severity, rule code and location (a record number with the CMS field path, or the part of the file it concerns), plus checks for parseability, required metadata and template structure, the number of records inspected, and a PASS, WARN or FAIL verdict. Structured JSON via the API and a readable summary in the test form.'],
  ['When is a run charged?',
    'When the validator finishes and returns a report, whether it says PASS, WARN or FAIL. That includes a FAIL for a file that turns out not to be a valid price file at all. Requests rejected before validation (empty body, corrupt gzip, invalid parameters, missing key) are free.'],
];

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/hospital-mrf-validator?maxRecords=500" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data-binary @123456789_example-hospital_standardcharges.json`;

const PY = `import os, requests

with open("standardcharges.csv.gz", "rb") as f:
    r = requests.post(
        "https://www.spreadrun.com/api/v1/hospital-mrf-validator",
        params={"maxRecords": 500},
        headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
        data=f,
        timeout=60,
    )
r.raise_for_status()
report = r.json()["report"]
print(report["status"], report["file"]["recordsInspected"], "records inspected")
for issue in report["issues"]:
    print(issue["severity"], issue["code"], issue["location"])`;

export default function MrfApi() {
  return (
    <Layout path={`/apis/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/apis', 'APIs'], [null, 'Hospital MRF Validator']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <div className="badges" style={{ marginBottom: 14 }}><span className="badge tier">Built by SpreadRun</span><span className="badge beta">Beta</span></div>
        <h1>Hospital Price Transparency MRF Validator</h1>
        <p className="lede" style={{ marginTop: 20 }}>Check a hospital machine-readable price file against the CMS template and data specifications before you post it, or before you spend compute ingesting someone else's. Upload a file and get a deterministic, itemized report in seconds. No installs, no Docker, no sign-up required to run a test.</p>
        <div className="note">
          <p><b>Free alternative:</b> CMS publishes its own <a href={CMS_TOOL}>Hospital Price Transparency Validator</a> at no cost, online and as a command-line tool, and it checks the whole file. Use it for one-off manual checks. This API is for checking files from code: no install, JSON reports, one endpoint for all three layouts. It inspects a bounded part of each file, described below.</p>
        </div>
        <div className="btn-row">
          <a className="btn" href="#demo">Run a validation</a>
          <a className="btn secondary" href="/account">Get API access</a>
        </div>
      </div>

      <section className="section wrap split" aria-labelledby="checks">
        <div>
          <h2 id="checks">What it checks</h2>
          <p>Every validation runs the same deterministic checks against the CMS v3.0.0 schema and templates:</p>
          <ul className="checklist">
            <li><b>File structure.</b> Valid JSON for the v3.0.0 schema, or well-formed tall or wide CSV with every column the CMS template requires, no duplicate or placeholder headers, and every row as wide as its header.</li>
            <li><b>Required metadata.</b> Hospital name, last-updated date (a valid date), location names, addresses, Type 2 NPIs, license information, the attestation and version 3.0.0 are present and well-formed.</li>
            <li><b>Standard charge records.</b> Each inspected record has a description, billing codes, a care setting and charges that fit the schema.</li>
            <li><b>2026 data elements.</b> For percentage or algorithm charges: count of allowed amounts, plus median, 10th and 90th percentile allowed amounts unless the count is 0.</li>
            <li><b>Billing codes.</b> Each code has a type from the CMS list: CPT, HCPCS, MS-DRG, NDC, RC, CDM and the rest.</li>
            <li><b>Payer rules.</b> Payer and plan names present, methodology from the CMS list, at least one of a dollar, percentage or algorithm charge, and notes when the methodology is "other".</li>
            <li><b>Numbers.</b> No negative or zero charges, no malformed or non-finite numbers.</li>
            <li><b>Ambiguity.</b> Duplicate keys in a JSON object are flagged.</li>
          </ul>
          <p>Large files are validated with bounded sampling: the report always says how many records were inspected and whether part of the file was not, so you know exactly what the verdict covers.</p>
        </div>
        <div>
          <h2>Who it's for</h2>
          <ul>
            <li><b>Hospital revenue-cycle and compliance teams:</b> check the file before it goes on your public site.</li>
            <li><b>Price-transparency vendors:</b> gate customer files in your onboarding pipeline instead of discovering breakage downstream.</li>
            <li><b>Developers and data teams:</b> preflight a third-party MRF before burning hours parsing it.</li>
            <li><b>AI agents and automation:</b> a plain REST endpoint with a file in and JSON out; no browser, no clicking.</li>
          </ul>
          <h3 style={{ marginTop: 24 }}>Not checked</h3>
          <p className="small">Payer and plan name consistency across rows, whether amounts were calculated from real remittance data, NPI registry lookups, file freshness, the cms-hpt.txt discovery file, and records beyond the inspected portion.</p>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="how">
        <h2 id="how">How it works</h2>
        <ol className="steps">
          <li><h3>Submit</h3><p>Upload the file as JSON, tall CSV or wide CSV, plain or gzip. The format is detected automatically.</p></li>
          <li><h3>Validate</h3><p>The file is checked against the CMS template layouts and the v3.0.0 schema. Structural, field-level and conditional checks run deterministically.</p></li>
          <li><h3>Report</h3><p>You get an itemized findings report with severity, rule and location for each problem, and a summary verdict. Keep the report as your pre-posting evidence.</p></li>
        </ol>
      </section>

      <section className="section wrap" id="demo" aria-labelledby="demo-h">
        <h2 id="demo-h">Try it now</h2>
        <MrfDemo api={API} sample={example.body.report} />
      </section>

      <section className="section wrap" aria-labelledby="price-h">
        <h2 id="price-h">Pricing</h2>
        <p><b>{dollars(API.priceCents)} per completed validation.</b> One file, one full report.</p>
        <ul>
          <li>You are billed when a validation completes and produces a report, PASS, WARN or FAIL. Requests rejected before validation (empty or corrupt upload, invalid parameters) are not billed.</li>
          <li>No subscription. No seat licenses. Prepaid credits from $5 (20 validations). Credits never expire. <a href="/apis#pricing">All pricing</a></li>
          <li>Validating hundreds of hospital files on a schedule? <a href="/contact">Talk to us</a> first so we can tell you honestly whether this fits.</li>
        </ul>
        <div className="btn-row"><a className="btn" href="#demo">Run a validation</a><a className="btn secondary" href="/account">Get API access</a></div>
      </section>

      <section className="section wrap" aria-labelledby="code-h">
        <h2 id="code-h">Call it from code</h2>
        <p>Parameters, the report format, error codes and limits are in the <a href={`/docs/${API.slug}`}>API docs</a>. For background on the rules, read the <a href="/guides/hospital-price-transparency-file-requirements-2026">2026 file requirements guide</a>.</p>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={MRF_FAQ} />
        <p className="small" style={{ marginTop: 24 }}>More validators: <a href="/apis/clinical-trial-table-validator">Clinical Trial Results Table QA</a> | <a href="/apis">the full catalog</a></p>
      </section>
    </Layout>
  );
}
