import Layout, { Crumbs } from '../site/Layout.jsx';
import CodeSample, { Json } from '../site/CodeSample.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import paidPass from '../content/examples/uad-paid-pass.json';
import demoFail from '../content/examples/uad-demo-fail.json';
import inputError from '../content/examples/uad-input-error.json';
import coverage from '../content/uad-coverage.json';

const API = apiBySlug('uad-36-appraisal-validator');

const SPEC_RULES = [
  ['A1-UNKNOWN', 'warning', 'An element at a location the URAR Delivery Specification does not define. Reported once per path, at the outermost unknown element.'],
  ['A1-ENUM', 'error', 'An enumerated or boolean data point, or an attribute such as @ValuationUseType, holds a value that is not in its supported list. The value is shown, up to 40 characters.'],
  ['A1-FORMAT', 'error', 'A date, datetime, number or text value does not match the format the specification gives for it (date pattern, sign, digits before and after the decimal point, maximum length).'],
  ['A1-EMPTY', 'error', 'A data point element is present with no value.'],
  ['A1-REQUIRED', 'error', 'A data point the specification always requires (R) is missing from a container that is present. Only checked where the path has one meaning for that property type.'],
  ['A1-CARDINALITY', 'error', 'A container repeats more often under one parent than the specification allows for that property type.'],
];

const CURL = `# XML file
curl -X POST "https://www.spreadrun.com/api/v1/uad-36-appraisal-validator" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/xml" \\
  --data-binary @appraisal.xml

# UAD 3.6 ZIP package, date rules as of the signature date
curl -X POST "https://www.spreadrun.com/api/v1/uad-36-appraisal-validator?asOf=2026-09-15" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/zip" \\
  --data-binary @appraisal_package.zip`;

const PY = `import os, requests

with open("appraisal.xml", "rb") as f:
    r = requests.post(
        "https://www.spreadrun.com/api/v1/uad-36-appraisal-validator",
        headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
        data=f,
        timeout=60,
    )
if r.status_code == 400:            # not a UAD 3.6 URAR file: not charged
    raise SystemExit(r.json()["error"]["message"])
r.raise_for_status()
report = r.json()["report"]
errors = [f for f in report["findings"] if f["severity"] == "error"]
print(report["status"], len(errors), "errors")`;

export default function DocsUad() {
  return (
    <Layout path={`/docs/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/docs', 'Docs'], [null, 'UAD 3.6 Appraisal Report Validator']]} />
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>UAD 3.6 Appraisal Report Validator API</h1>
        <p className="lede" style={{ marginTop: 20 }}>Beta. Structural checks of a UAD 3.6 URAR appraisal file against the GSE-published delivery specification and compliance rules. <a href={`/apis/${API.slug}`}>Product page and free test form.</a></p>
        <nav className="toc" aria-label="On this page">
          <a href="#endpoint">Endpoint</a><a href="#input">Request</a><a href="#coverage">Coverage</a><a href="#report">Report</a><a href="#rules">Rule IDs</a><a href="#not-implemented">Not implemented</a><a href="#errors">Errors</a><a href="#examples">Code samples</a>
        </nav>

        <h2 id="endpoint">Endpoint</h2>
        <table className="doc-table"><tbody>
          <tr><th>Paid</th><td><code>POST https://www.spreadrun.com/api/v1/uad-36-appraisal-validator</code>, API key required, {dollars(API.priceCents)} per completed report</td></tr>
          <tr><th>Demo</th><td><code>POST https://www.spreadrun.com/api/demo/uad-36-appraisal-validator</code>, no key, 1 MB, 10 runs per day</td></tr>
          <tr><th>Body</th><td>The UAD 3.6 URAR XML file, or the UAD 3.6 ZIP package. Any Content-Type; ZIP is detected from the content.</td></tr>
        </tbody></table>

        <h2 id="input">Request</h2>
        <p>Send the file itself as the request body, up to 4.4 MB (HTTP 413 above that). A ZIP must hold exactly one UAD XML file (MESSAGE root); its PDF and photos are not checked. If the package is over the limit because of photos, send the XML file on its own.</p>
        <table className="doc-table">
          <thead><tr><th>Query parameter</th><th>Default</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>asOf</code></td><td>today (UTC)</td><td>A date, <code>YYYY-MM-DD</code>. Rules UAD1258, UAD1259, UAD1505 and UAD1506 compare the effective date and the signature date with it: not in the future, not more than 367 days old. Use it to check an older report as of the date it was signed.</td></tr>
          </tbody>
        </table>
        <p>Rejected with HTTP 400 and not charged: an empty body, a file that is not well-formed XML, DOCTYPE or entity declarations, a root that is not the MISMO <code>MESSAGE</code> element, a MISMOReferenceModelIdentifier other than 3.6, a missing or non-URAR report type (Appraisal Update and Completion Reports included), a ZIP without exactly one UAD XML file, an invalid <code>asOf</code>. A URAR file with problems is not an input error: it gets a completed FAIL report, and that run is charged.</p>

        <h2 id="coverage">Coverage</h2>
        <p>The whole file is checked; nothing is sampled. Sources: {coverage.sources.a1.title} ({coverage.sources.a1.sheet}) and {coverage.sources.h1.title} ({coverage.sources.h1.sheet}).</p>
        <ul>
          <li><b>Delivery specification:</b> {coverage.dataPoints} data point and attribute locations, with their supported values, formats, required flags and repeat limits. See <a href="#rules">rule IDs</a>.</li>
          <li><b>Compliance rules:</b> {coverage.rulesImplemented} of {coverage.rulesTotal} implemented ({coverage.implementedBySeverity.Fatal} fatal, {coverage.implementedBySeverity.Warning} warning). A rule is evaluated for each property and container instance it applies to, with three-valued logic: when the file leaves a condition undetermined (a value the condition needs is missing or ambiguous), the rule does not fire. The rest are <a href="#not-implemented">listed below</a>.</li>
          <li><b>Not checked:</b> MISMO XSD schema validation, GSE proprietary findings, the PDF and photos in a package, and whether values are true.</li>
        </ul>
        <p>Tested against the twelve GSE sample scenarios for UAD 3.6 (single-family, condominium, cooperative, manufactured home and 2- to 4-unit): every one passes with no findings when checked as of its signature date. Where this validator and the Delivery Specification differ, the Delivery Specification controls. SpreadRun is not affiliated with or endorsed by Fannie Mae or Freddie Mac.</p>

        <h2 id="report">Report</h2>
        <table className="doc-table">
          <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>status</code></td><td><code>FAIL</code> if any error, <code>WARN</code> if only warnings, otherwise <code>PASS</code>. A PASS is not UCDP acceptance.</td></tr>
            <tr><td><code>reportType</code>, <code>reportContentIdentifier</code></td><td><code>URAR</code>, and the ValuationReportContentIdentifier from the file.</td></tr>
            <tr><td><code>mismoReferenceModelIdentifier</code></td><td>From the MESSAGE root, for example <code>3.6.0366</code>.</td></tr>
            <tr><td><code>input</code></td><td><code>container</code> (xml or zip), <code>xmlBytes</code>, and a note when a package was sent.</td></tr>
            <tr><td><code>properties</code></td><td>Count of valuation PROPERTY elements by <code>@ValuationUseType</code>.</td></tr>
            <tr><td><code>findings</code></td><td>Up to 500, errors first. Each has <code>severity</code> (error or warning), <code>ruleId</code>, <code>path</code> (XPath-style, with [n] where a container repeats), <code>message</code>, and <code>specReference</code> (the rule's or data point's unique ID in the appendix) when there is one.</td></tr>
            <tr><td><code>findingCount</code>, <code>findingCounts</code>, <code>ruleCounts</code>, <code>findingsTruncated</code></td><td>Totals, including findings beyond the 500 listed.</td></tr>
            <tr><td><code>coverage</code></td><td><code>complianceRulesTotal</code>, <code>complianceRulesEvaluated</code>, <code>complianceRulesNotImplemented</code> (rule IDs), <code>deliverySpecChecks</code>, <code>sampling</code>.</td></tr>
            <tr><td><code>asOf</code></td><td>The date the clock-based rules were evaluated against.</td></tr>
            <tr><td><code>inputSha256</code></td><td>SHA-256 of the request body.</td></tr>
            <tr><td><code>scope</code></td><td>What the verdict covers, in one sentence.</td></tr>
          </tbody>
        </table>

        <h2 id="rules">Rule IDs</h2>
        <p>Compliance rule findings use the GSE message ID (<code>UAD</code> and four digits) and its message text, with Fatal rules as errors and Warning rules as warnings. Delivery specification checks use these IDs:</p>
        <table className="doc-table">
          <thead><tr><th>Rule</th><th>Severity</th><th>Meaning</th></tr></thead>
          <tbody>{SPEC_RULES.map(([id, sev, m]) => <tr key={id}><td><code>{id}</code></td><td>{sev}</td><td>{m}</td></tr>)}</tbody>
        </table>

        <h2>Example responses</h2>
        <p>A paid check of the <a href="/samples/uad-pass.xml">synthetic URAR sample</a> with <code>asOf=2019-09-20</code>, and a demo check of the <a href="/samples/uad-fail.xml">sample with six deliberate errors</a>. Both generated by running the real endpoint code. The paid example's report is shortened here to its first fields.</p>
        <Json value={{ ...paidPass.body, report: { ...paidPass.body.report, coverage: { ...paidPass.body.report.coverage, complianceRulesNotImplemented: [`${paidPass.body.report.coverage.complianceRulesNotImplemented.length} rule IDs`] } } }} />
        <Json value={demoFail.body.report.findings.slice(0, 4)} />

        <h2 id="not-implemented">Compliance rules not implemented</h2>
        <p>{coverage.notImplemented.length} rules. None of them can produce a finding. Each needs a reading the published rule text does not settle, so it is left out rather than guessed.</p>
        <div className="table-scroll">
          <table className="doc-table">
            <thead><tr><th>Rule</th><th>Severity</th><th>Why not</th></tr></thead>
            <tbody>{coverage.notImplemented.map((r) => <tr key={r.id}><td><code>{r.id}</code></td><td>{r.severity}</td><td>{r.reason}</td></tr>)}</tbody>
          </table>
        </div>
        {Object.keys(coverage.corrections).length > 0 && (
          <p className="small">Evident typos in the published rule text that were corrected so the rule can run: {Object.entries(coverage.corrections).map(([id, c]) => `${id} (${c.join(', ')})`).join('; ')}.</p>
        )}

        <h2 id="errors">Errors</h2>
        <p>See the <a href="/docs#errors">shared error table</a>. Example input error (HTTP {inputError.status}, not charged):</p>
        <Json value={inputError.body} />

        <h2 id="examples">Code samples</h2>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </div>
    </Layout>
  );
}
