import Layout, { Crumbs } from '../site/Layout.jsx';
import CodeSample, { Json } from '../site/CodeSample.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import paidPass from '../content/examples/pbj-paid-pass.json';
import demoFail from '../content/examples/pbj-demo-fail.json';
import inputError from '../content/examples/pbj-input-error.json';
import { SourceList } from './PbjApi.jsx';

const API = apiBySlug('pbj-staffing-qa');

// [rule ID, severity, source, meaning]. CMS edit numbers and severities from the PBJ data specifications v4.10.0.
const RULES = [
  ['XSD', 'error', 'spec', 'The XML does not follow the CMS v4.10.0 XSD: an unknown or misplaced element, an element repeated more than allowed, or an empty optional header item.'],
  ['CMS-4003, CMS-4004, CMS-4006', 'error', 'spec', 'A required header, employee or staffing hours item is missing.'],
  ['CMS-1020', 'warning', 'spec', 'A retired fileSpecVersion (2.00.0, 2.00.3 or 4.00.0) on a check dated before April 1, 2026.'],
  ['CMS-1021', 'error', 'spec', 'A retired fileSpecVersion on or after April 1, 2026. Files must use 4.10.0.'],
  ['CMS-3676', 'error', 'spec', 'A coded value that is not allowed: fileSpecVersion, stateCode, reportQuarter, processType, jobTitleCode (1 to 40) or payTypeCode (1 to 3).'],
  ['CMS-3677', 'error', 'spec', 'A date that is empty or not a valid YYYY-MM-DD date.'],
  ['CMS-3679', 'error', 'spec', 'A number out of range: federalFiscalYear before 2016, or hours outside 0 to 22.5 or with more than two decimals.'],
  ['CMS-3690, CMS-3692, CMS-3802, CMS-4018', 'error', 'spec', 'Characters CMS does not allow in a text item, the email address, or an employee ID.'],
  ['CMS-3702', 'error', 'spec', 'facilityId is blank.'],
  ['CMS-3793', 'error', 'spec', 'Text longer than the item allows.'],
  ['CMS-1009, CMS-4019', 'error', 'spec', 'A year before 1895 or after 2050.'],
  ['CMS-4002', 'error', 'spec', 'A work date after asOf (today by default). CMS rejects dates after the upload date.'],
  ['CMS-4008', 'error', 'spec', 'processType is missing from staffingHours.'],
  ['CMS-4025', 'error', 'spec', 'More than 22.5 hours for one employee on one date, all job titles together.'],
  ['CMS-1010', 'warning', 'spec', 'A work date outside the quarter in the header. CMS does not process that record.'],
  ['CMS-4016-PARTIAL', 'warning', 'spec', 'Hours for an employee ID that is not in this file\'s employees section. CMS rejects the file unless the ID is already in its system, which only CMS can check.'],
  ['CMS-ASCII', 'warning', 'spec', 'Non-ASCII characters. CMS requires standard ASCII and issues a warning for anything else.'],
  ['RISK-HOURS-PER-MONTH', 'warning', 'audit2018', 'More than 400 hours in one calendar month for one employee ID.'],
  ['RISK-NO-RN-DAYS', 'warning', 'fivestar', 'Four or more days in the quarter, up to asOf, with no hours under job title codes 5, 6 or 7 (RN).'],
  ['RISK-ID-PII', 'warning', 'manual', 'An employee ID shaped like a Social Security Number.'],
  ['RISK-EMPTY-REPLACE', 'warning', 'spec', 'processType="replace" with no staffHours records, which deletes all staffing hours already submitted for the quarter.'],
  ['SR-OUTSIDE-EMPLOYMENT', 'warning', null, 'Hours before the employee\'s hireDate or after their terminationDate.'],
  ['SR-DATE-ORDER', 'warning', null, 'terminationDate before hireDate.'],
  ['SR-DUPLICATE-EMPLOYEE', 'warning', 'manual', 'The same employee ID listed more than once in the employees section.'],
];

const CURL = `# The ZIP you upload to CMS (or the XML file), checked as of the planned upload date
curl -X POST "https://www.spreadrun.com/api/v1/pbj-staffing-qa?asOf=2026-11-10" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/zip" \\
  --data-binary @pbj_2026_q4.zip`;

const PY = `import os, requests

with open("pbj_2026_q4.zip", "rb") as f:
    r = requests.post(
        "https://www.spreadrun.com/api/v1/pbj-staffing-qa",
        headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
        data=f,
        timeout=60,
    )
if r.status_code == 400:            # not a PBJ staffing file: not charged
    raise SystemExit(r.json()["error"]["message"])
r.raise_for_status()
report = r.json()["report"]
errors = [f for f in report["findings"] if f["severity"] == "error"]
print(report["status"], len(errors), "errors")`;

export default function DocsPbj() {
  const { findings: _f, notChecked, sources, ...shortReport } = paidPass.body.report;
  return (
    <Layout path={`/docs/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/docs', 'Docs'], [null, 'PBJ Staffing Data Pre-Submission QA']]} />
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>PBJ Staffing Data Pre-Submission QA API Reference</h1>
        <p className="lede" style={{ marginTop: 20 }}>Beta. Structural checks of a nursing home's quarterly PBJ staffing XML file against the CMS PBJ data specifications v4.10.0, internal consistency checks, and flags for documented audit and rating risks. <a href={`/apis/${API.slug}`}>Product page and free test form.</a></p>
        <nav className="toc" aria-label="On this page">
          <a href="#endpoint">Endpoint</a><a href="#input">Request</a><a href="#report">Report</a><a href="#rules">Rule IDs</a><a href="#not-checked">Not checked</a><a href="#errors">Errors</a><a href="#examples">Code samples</a>
        </nav>

        <h2 id="endpoint">Endpoint</h2>
        <table className="doc-table"><tbody>
          <tr><th>Paid</th><td><code>POST https://www.spreadrun.com/api/v1/pbj-staffing-qa</code>, API key required, {dollars(API.priceCents)} per completed report</td></tr>
          <tr><th>Demo</th><td><code>POST https://www.spreadrun.com/api/demo/pbj-staffing-qa</code>, no key, 1 MB, 10 runs per day</td></tr>
          <tr><th>Body</th><td>The PBJ staffing XML file, a gzip of it, or the ZIP you upload to CMS. Any Content-Type; gzip and ZIP are detected from the content.</td></tr>
        </tbody></table>

        <h2 id="input">Request</h2>
        <p>Send the file itself as the request body, up to 4.4 MB (HTTP 413 above that). Staffing XML compresses very well, so send the ZIP or a gzip for a large facility. Each XML file in a ZIP may be up to 50 MB uncompressed, the CMS limit, and a ZIP may hold up to 20 XML files; they are checked together and billed as one report.</p>
        <table className="doc-table">
          <thead><tr><th>Query parameter</th><th>Default</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>asOf</code></td><td>today (UTC)</td><td>A date, <code>YYYY-MM-DD</code>: the day you plan to upload. CMS edit -4002 rejects work dates after it, the count of days without RN hours stops at it, and the deadline countdown starts from it.</td></tr>
            <tr><td><code>census</code></td><td>none</td><td>Total resident days in the quarter (the sum of each day's census). Turns on the staffing estimate. Above 0.</td></tr>
            <tr><td><code>weekendCensus</code></td><td>estimated</td><td>Resident days on Saturdays and Sundays. When missing, estimated from <code>census</code> assuming the same census every day.</td></tr>
            <tr><td><code>caseMixRatio</code></td><td>1.0</td><td>The facility's nursing case-mix index divided by the national average, 0.2 to 5. Adjusted hours are reported hours divided by it.</td></tr>
            <tr><td><code>rnTurnover</code>, <code>nurseTurnover</code></td><td>none</td><td>Twelve-month turnover percentages, 0 to 100. When missing, the star range covers every possible turnover score.</td></tr>
            <tr><td><code>adminDepartures</code></td><td>none</td><td>Administrators who left in the last twelve months, a whole number.</td></tr>
          </tbody>
        </table>
        <p>Rejected with HTTP 400 and not charged: an empty body, a PDF, a file that is not well-formed XML, DOCTYPE or entity declarations, a root that is not <code>nursingHomeData</code>, an Employee Link (administration) file, a ZIP with no XML file or more than 20, a corrupt or encrypted ZIP, an invalid <code>asOf</code>. A PBJ file with problems is not an input error: it gets a completed FAIL report, and that run is charged.</p>

        <h2 id="report">Report</h2>
        <table className="doc-table">
          <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>status</code></td><td><code>FAIL</code> if any error, <code>WARN</code> if only warnings, otherwise <code>PASS</code>. A PASS is not CMS acceptance and does not mean the file would survive an audit.</td></tr>
            <tr><td><code>specVersion</code>, <code>fileSpecVersion</code></td><td>The CMS specification checked against (4.10.0), and the file's own version when it is a known one (otherwise <code>other</code>).</td></tr>
            <tr><td><code>reportingQuarter</code></td><td><code>federalFiscalYear</code>, <code>quarter</code>, and the quarter's <code>start</code> and <code>end</code> dates.</td></tr>
            <tr><td><code>processType</code></td><td><code>merge</code> or <code>replace</code>.</td></tr>
            <tr><td><code>counts</code></td><td><code>employees</code>, <code>staffHoursRecords</code>, <code>workDays</code>, <code>hourEntries</code>, <code>totalHours</code>.</td></tr>
            <tr><td><code>coverage</code></td><td><code>daysWithHours</code>, <code>daysWithRnHours</code>, <code>daysWithoutRnHours</code> (days in the quarter up to asOf).</td></tr>
            <tr><td><code>findings</code></td><td>Up to 500, errors first. Each has <code>severity</code> (error or warning), <code>ruleId</code>, <code>path</code> (XPath-style, with [n] where an element repeats), <code>message</code> and <code>source</code> (a key into <code>sources</code>). Findings never repeat a value from the file.</td></tr>
            <tr><td><code>findingCount</code>, <code>findingCounts</code>, <code>ruleCounts</code>, <code>findingsTruncated</code></td><td>Totals, including findings beyond the 500 listed.</td></tr>
            <tr><td><code>files</code></td><td>Only for a ZIP with several XML files: one summary per file, numbered by position in the ZIP, and each finding gets a <code>file</code> number.</td></tr>
            <tr><td><code>notChecked</code>, <code>sources</code>, <code>scope</code></td><td>What the report does not cover, the documents each rule comes from, and what the verdict means.</td></tr>
            <tr><td><code>submissionDeadline</code></td><td><code>date</code> (the end of the 45th day after the quarter), <code>time</code>, <code>daysRemaining</code> and <code>passed</code>, as of <code>asOf</code>.</td></tr>
            <tr><td><code>staffingEstimate</code></td><td>Only when <code>census</code> is sent. An estimate, not the CMS rating: <code>reportedHprd</code> and <code>adjustedHprd</code> (total nurse, RN and weekend total nurse hours per resident day; job title codes 5 to 12, RN 5 to 7), <code>points</code> per CMS Table A2, <code>scoreRange</code> out of 380, <code>starRange</code> and <code>stars</code> per Table 3, <code>oneStarException</code> (four or more days without RN hours), <code>excluded</code> (a CMS exclusion rule applies), <code>assumptions</code> and <code>label</code>. The inputs themselves are never repeated.</td></tr>
            <tr><td><code>input</code>, <code>inputSha256</code>, <code>asOf</code></td><td>Container (xml, gzip or zip), number and total size of XML files, the SHA-256 of the request body, and the date used.</td></tr>
          </tbody>
        </table>

        <h2 id="rules">Rule IDs</h2>
        <p>CMS edits keep their CMS number, so a finding can be matched to the edit the CMS system would report. Fatal CMS edits are errors; CMS warnings, risk flags and consistency checks are warnings.</p>
        <div className="table-scroll">
          <table className="doc-table">
            <thead><tr><th>Rule</th><th>Severity</th><th>Source</th><th>Meaning</th></tr></thead>
            <tbody>{RULES.map(([id, sev, src, m]) => <tr key={id}><td><code>{id}</code></td><td>{sev}</td><td>{src ? <code>{src}</code> : 'SpreadRun'}</td><td>{m}</td></tr>)}</tbody>
          </table>
        </div>
        <p>Source keys, as returned in every report:</p>
        <table className="doc-table"><tbody>
          {Object.entries(sources).map(([k, v]) => <tr key={k}><td><code>{k}</code></td><td>{v}</td></tr>)}
        </tbody></table>
        <SourceList />

        <h2 id="not-checked">Not checked</h2>
        <ul>{notChecked.map((n) => <li key={n}>{n}</li>)}</ul>

        <h2>Example responses</h2>
        <p>A paid check of the <a href="/samples/pbj-pass.xml">synthetic PBJ sample</a> with <code>asOf=2026-10-03</code> (report shortened to its summary fields), and the findings from a demo check of the <a href="/samples/pbj-fail.xml">sample with planted problems</a>. Both generated by running the real endpoint code.</p>
        <Json value={{ ...paidPass.body, report: shortReport }} />
        <Json value={demoFail.body.report.findings.slice(0, 4)} />

        <h2 id="errors">Errors</h2>
        <p>See the <a href="/docs#errors">shared error table</a>. Example input error (HTTP {inputError.status}, not charged):</p>
        <Json value={inputError.body} />

        <h2 id="examples">Code samples</h2>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </div>
    </Layout>
  );
}
