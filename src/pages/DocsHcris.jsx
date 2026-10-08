import Layout, { Crumbs } from '../site/Layout.jsx';
import CodeSample, { Json } from '../site/CodeSample.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import paidPass from '../content/examples/hcris-paid-pass.json';
import demoFail from '../content/examples/hcris-demo-fail.json';
import inputError from '../content/examples/hcris-input-error.json';
import { HcrisSources } from './HcrisApi.jsx';

const API = apiBySlug('hcris-preaudit-qa');

const PARAMS = [
  ['periodStart', 'Required. YYYY-MM-DD, the first day of the cost reporting period. Must match the ECR file. Periods beginning on or after October 1, 2022.'],
  ['periodEnd', 'Required. YYYY-MM-DD, the last day of the period. The deadline is the last day of the fifth month after it, or 150 days after it when it is not a month end.'],
  ['asOf', 'Optional. YYYY-MM-DD to measure the deadline from. Default: today (UTC).'],
];

const PACKAGE = [
  ['ECR file', 'Exactly one. Found by its first record (type 1, record number 1), whatever its name. A body that is not a .zip is read as the ECR file alone.'],
  ['Exhibit 2A', '"Supporting Exhibit" in A1 and "Medicare Bad Debt Listing" in B1. One listing for inpatient and one for outpatient (header IP or OP), per CCN.'],
  ['Exhibit 3B', '"Supporting Exhibit" in A1 and "Charity Care Charges" in B1. One per CCN; Component CCN blank for the hospital.'],
  ['Exhibit 3C', '"Supporting Exhibit" in A1 and "Total Bad Debt" in B1. One per CCN; Component CCN blank for the hospital.'],
  ['Prior-year listings', 'Any of the above with an FYE before periodStart. Used only to find accounts claimed again.'],
];

const FINDING = [
  ['severity', 'error or warning. Any error makes the report FAIL; warnings alone make it WARN.'],
  ['ruleId', 'One of the rule IDs below.'],
  ['group', 'ecrFormat, crossTies, s10, listings or deadline: the check it counts toward.'],
  ['worksheet, line, column', 'Worksheet findings: for example S-10, Part I, line 30, column 1.'],
  ['exhibit, file, row, column', 'Listing findings: the exhibit, the file name in the package, the spreadsheet row and the exhibit column number.'],
  ['record, positions', 'ECR format findings: the record number in the file and the character positions.'],
  ['expected, actual', 'Amounts, where the finding compares two. Expected is what the rule or the other worksheet says; actual is what was filed.'],
  ['message', 'What is wrong, in plain words. Never repeats text from the files; an account appears by its last four characters.'],
  ['source', 'A key in sources.'],
];

const RULES = [
  ['ECR-10000 to ECR-11000', 'error', 'The level 1 edits of Table 6 with the same number: record type, length, upper case, line feeds, CCN, Julian dates, period, record identifiers, numeric line numbers, labels.'],
  ['ECR-MCR-VERSION', 'error', 'Record 1, position 37 is not 1, so the file is not a Form CMS-2552-10 file.'],
  ['ECR-PERIOD, ECR-S2-PERIOD', 'error', 'The period in record 1, on Worksheet S-2, line 20, and in the parameters do not agree.'],
  ['ECR-SPEC-DATE', 'warning', 'The ECR specification date is not an approved one, or is older than the one in effect for the period end.'],
  ['ECR-TYPE4', 'warning', 'The three type 4 records (encryption and time stamp) are missing.'],
  ['TIE-A-B, TIE-B-TOTAL, TIE-B-C', 'error', 'Worksheet A to B, the B step-down total, B column 26 to C column 1.'],
  ['TIE-C-FOOT, TIE-C-202, TIE-C-CHARGES', 'error', 'Worksheet C, Part I totals, line 202, and total charges as inpatient plus outpatient.'],
  ['TIE-D-E', 'error', 'Worksheet D, Part V, line 202, columns 6 and 7 to Worksheet E, Part B, line 1.'],
  ['TIE-E-BADDEBT, TIE-E-DUAL', 'error', 'Worksheet E bad debts: the 65 percent line, and dual eligible within the total.'],
  ['S10-CCR', 'error', 'S-10 line 1 is not the Worksheet C cost-to-charge ratio (Part II without the excluded units).'],
  ['S10-LINE', 'error', 'An S-10 line that does not recompute from the lines it is built from.'],
  ['S10-E-TIE', 'error', 'S-10 lines 27 and 27.01 against Worksheet E and the other bad debt worksheets.'],
  ['S10-14000S to S10-14020S, S10-PART2-SUBSET', 'error', 'The S-10 edits of Table 6, and Part II amounts above Part I.'],
  ['LIST-MISSING', 'error', 'A listing the cost report calls for is not in the package (42 CFR 413.24(f)(5)).'],
  ['LIST-HEADER, LIST-FORMAT', 'error', 'A listing header with the wrong CCN or period, or a date or amount that cannot be read.'],
  ['LIST-S2-12', 'warning', 'Worksheet S-2, Part II, line 12 says bad debts are claimed but none are.'],
  ['BD-TIE, CC-TIE, TBD-TIE', 'error', 'A listing that does not add up to the worksheet line it supports.'],
  ['BD-DUPLICATE, CC-DUPLICATE, TBD-DUPLICATE', 'error', 'The same account and dates of service listed twice.'],
  ['BD-PRIOR, CC-PRIOR, TBD-PRIOR', 'error', 'An account already on last year\'s listing.'],
  ['BD-WRITEOFF-PERIOD, CC-WRITEOFF-PERIOD, TBD-WRITEOFF-PERIOD', 'error', 'A write-off date outside the cost reporting period.'],
  ['BD-120-DAYS', 'error', 'Written off less than 120 days after the first bill (42 CFR 413.89(e)(2)(i)(A)(5)).'],
  ['BD-BILL-120', 'error', 'First bill more than 120 days after the remittance advice (42 CFR 413.89(e)(2)(i)(A)(3)).'],
  ['BD-CAP', 'error', 'Allowable bad debt above the deductible and coinsurance less payments and recoveries.'],
  ['BD-REQUIRED, BD-DATES, BD-DUAL', 'error', 'A required Exhibit 2A column is empty, write-off dates are out of order, or a dual eligible row has no Medicaid remittance date.'],
  ['BD-RECOVERY, BD-INDIGENT, BD-HEADER-TOTAL', 'warning', 'A recovery not entered as a negative, an indigent beneficiary with a responsibility amount, or a header total that does not match the rows.'],
  ['CC-SUM, CC-STATUS, CC-DEDUCTIBLE, CC-CHARGES, CC-REQUIRED', 'error', 'Exhibit 3B rows: column 20 as 17 plus 18 plus 19, the columns each insurance status uses, column 19 within column 11, charity within charges net of physician charges and payments.'],
  ['TBD-CAP, TBD-STATUS, TBD-REQUIRED', 'error', 'Exhibit 3C rows: column 17 within the prorated cap, valid status and service indicator, required columns.'],
  ['DEADLINE-LATE', 'warning', 'Past the due date (42 CFR 413.24(f)(2)).'],
];

const PY = `import os, requests

with open("package.zip", "rb") as f:
    r = requests.post(
        "https://www.spreadrun.com/api/v1/hcris-preaudit-qa",
        params={"periodStart": "2024-07-01", "periodEnd": "2025-06-30"},
        headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
        data=f,
        timeout=120,
    )
r.raise_for_status()
report = r.json()["report"]
print(report["status"], report["checks"], report["listings"]["required"])`;

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/hcris-preaudit-qa?periodStart=2024-07-01&periodEnd=2025-06-30" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/zip" \\
  --data-binary @package.zip`;

export default function DocsHcris() {
  const { notChecked, sources, ...shortReport } = paidPass.body.report;
  return (
    <Layout path={`/docs/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/docs', 'Docs'], [null, 'Medicare Cost Report Pre-Audit QA']]} />
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>Medicare Cost Report Pre-Audit QA API Reference</h1>
        <p className="lede" style={{ marginTop: 20 }}>Beta. Pre-audits one hospital cost report (Form CMS-2552-10): the ECR file against the record specifications and level 1 edits in CMS Pub. 15-2, chapter 40, section 4095; the ties between Worksheets S, A, B, C, D and E; Worksheet S-10 line by line; the Exhibit 2A, 3B and 3C listings against the amounts claimed and 42 CFR 413.89; and the deadline in 42 CFR 413.24(f)(2). A math check: it does not judge allowability. <a href={`/apis/${API.slug}`}>Product page and free test form.</a></p>
        <nav className="toc" aria-label="On this page">
          <a href="#endpoint">Endpoint</a><a href="#params">Parameters</a><a href="#package">The package</a><a href="#privacy">Patient data</a><a href="#report">Report</a><a href="#rules">Rule IDs</a><a href="#errors">Errors</a><a href="#examples">Code samples</a>
        </nav>

        <h2 id="endpoint">Endpoint</h2>
        <table className="doc-table"><tbody>
          <tr><th>Paid</th><td><code>POST https://www.spreadrun.com/api/v1/{API.slug}</code>, API key required, {dollars(API.priceCents)} per completed pre-audit</td></tr>
          <tr><th>Demo</th><td><code>POST https://www.spreadrun.com/api/demo/{API.slug}</code>, no key, 10 runs per day. Runs the two published sample packages only (<a href="/samples/hcris-sample-clean.zip">clean</a>, <a href="/samples/hcris-sample-errors.zip">with errors</a>), byte for byte. Their period is June 1, 2024 to May 31, 2025; use <code>asOf=2025-10-15</code> to see the deadline as it stood before it passed.</td></tr>
          <tr><th>Body</th><td>A .zip with the ECR file and the listings, or the ECR file alone, up to 4 MB. The check stops after about 20 seconds with a plain message and no charge.</td></tr>
          <tr><th>Checked against</th><td>CMS Pub. 15-2, chapter 40, Transmittal 26 (June 30, 2026), ECR specification 2026181. Printed in every report as <code>checkedAgainst</code>.</td></tr>
        </tbody></table>

        <h2 id="params">Parameters</h2>
        <table className="doc-table"><tbody>{PARAMS.map(([k, m]) => <tr key={k}><td><code>{k}</code></td><td>{m}</td></tr>)}</tbody></table>
        <p>Any other parameter is refused, so a typo never changes the result quietly.</p>

        <h2 id="package">The package</h2>
        <p>Files are recognized by content, not by name. Listings are .xlsx in the CMS template layout, or .csv laid out in the same grid (the exhibit identifier in A1 and B1, the header labels in column A with values in column B, then the column labels and the column number row). Sheets without the identifier are ignored, as MCReF ignores them.</p>
        <table className="doc-table"><tbody>{PACKAGE.map(([k, m]) => <tr key={k}><th>{k}</th><td>{m}</td></tr>)}</tbody></table>
        <p>Which listings are required comes from the cost report: Exhibit 2A when Worksheet E, Part A, line 64, Part B, line 34 or S-10, line 27.01 claims Medicare bad debts; Exhibit 3B when S-10, line 20 claims charity care; Exhibit 3C when S-10, line 26 reports bad debts. A sole community hospital whose Worksheet E, Part A, line 48 is greater than line 47 does not need 3B or 3C.</p>

        <h2 id="privacy">Patient data</h2>
        <p>A listing with anything in the patient name columns (1 and 2), the MBI column (2A, column 6) or the Medicaid number column (2A, column 7, other than Y) is refused before any check runs, with the file, row and column and no charge. Put Y in column 7 for a dual eligible beneficiary. Account numbers may be replaced by your own reference, as long as each account keeps the same one across the listings and last year's. Reports show an account by its last four characters only.</p>

        <h2 id="report">Report</h2>
        <table className="doc-table">
          <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>status</code>, <code>summary</code></td><td>FAIL if any error, WARN if only warnings, otherwise PASS. A PASS is not MAC acceptance and does not determine allowability or payment.</td></tr>
            <tr><td><code>checkedAgainst</code></td><td>The transmittal and ECR specification the run was checked against.</td></tr>
            <tr><td><code>file</code></td><td>CCN, the ECR specification date in the file, and record counts.</td></tr>
            <tr><td><code>deadline</code></td><td><code>due</code>, <code>asOf</code>, <code>daysLeft</code> (negative when late), <code>status</code> (on-time or late) and the rule.</td></tr>
            <tr><td><code>checks</code></td><td><code>ecrFormat</code>, <code>crossTies</code>, <code>s10</code>, <code>listings</code> and <code>deadline</code>, each pass, warn, fail or na.</td></tr>
            <tr><td><code>listings</code></td><td><code>found</code> (exhibit, file, IP or OP, component, rows), <code>required</code>, <code>status</code> per exhibit, <code>priorClaimCheck</code> and <code>priorYearListings</code>.</td></tr>
            <tr><td><code>tiesChecked</code></td><td>How many amounts were recomputed or compared.</td></tr>
            <tr><td><code>findings</code></td><td>Errors first, up to 400.</td></tr>
            <tr><td><code>notChecked</code>, <code>sources</code>, <code>scope</code>, <code>input</code>, <code>inputSha256</code></td><td>What the report does not cover, where the rules come from, what the verdict means, and a fingerprint of the package.</td></tr>
          </tbody>
        </table>
        <h3>Each finding</h3>
        <table className="doc-table"><tbody>{FINDING.map(([k, m]) => <tr key={k}><td><code>{k}</code></td><td>{m}</td></tr>)}</tbody></table>

        <h2 id="rules">Rule IDs</h2>
        <div className="table-scroll">
          <table className="doc-table">
            <thead><tr><th>Rule</th><th>Severity</th><th>Meaning</th></tr></thead>
            <tbody>{RULES.map(([id, sev, m]) => <tr key={id}><td><code>{id}</code></td><td>{sev}</td><td>{m}</td></tr>)}</tbody>
          </table>
        </div>
        <p>Source keys, as returned in every report:</p>
        <table className="doc-table"><tbody>{Object.entries(sources).map(([k, v]) => <tr key={k}><td><code>{k}</code></td><td>{v}</td></tr>)}</tbody></table>
        <HcrisSources />
        <h3>Not checked</h3>
        <ul>{notChecked.map((n) => <li key={n}>{n}</li>)}</ul>

        <h2>Example responses</h2>
        <p>A paid pre-audit of the <a href="/samples/hcris-sample-clean.zip">clean sample</a>, and the findings from a demo run of the <a href="/samples/hcris-sample-errors.zip">sample with errors</a>. Both generated by running the real endpoint code.</p>
        <Json value={{ ...paidPass.body, report: shortReport }} />
        <Json value={demoFail.body.report.findings} />

        <h2 id="errors">Errors</h2>
        <p>See the <a href="/docs#errors">shared error table</a>. Rejected and not charged: a body that is not an ECR file or a .zip with one, a package over 4 MB (HTTP 413), more than one ECR file, a missing or malformed period, a period beginning before October 1, 2022, an unknown parameter, a listing with patient identifiers, an .xls listing, a package too large to finish in time, and on the demo endpoint anything other than a sample package. Example, a PDF (HTTP {inputError.status}):</p>
        <Json value={inputError.body} />

        <h2 id="examples">Code samples</h2>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </div>
    </Layout>
  );
}
