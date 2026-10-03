import Layout, { Crumbs } from '../site/Layout.jsx';
import CodeSample, { Json } from '../site/CodeSample.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import paidPass from '../content/examples/wh347-paid-pass.json';
import demoFail from '../content/examples/wh347-demo-fail.json';
import inputError from '../content/examples/wh347-input-error.json';
import { Wh347Sources } from './Wh347Api.jsx';

const API = apiBySlug('wh347-payroll-precheck');

const HEADER = [
  ['project_name', 'Project name'], ['project_no', 'Project or prime contract number'],
  ['payroll_no', 'Certified payroll number: 1 for the first week, then 2, 3 and so on'],
  ['contractor_name', 'Contractor or subcontractor business name'], ['contractor_address', 'Business address'],
  ['project_location', 'Project address, or at least the county and state'],
  ['wage_determination_no', 'Wage determination number(s) and modification'],
  ['week_ending', 'Week ending date: YYYY-MM-DD, MM/DD/YYYY or an Excel date'],
  ['cwhssa', 'Optional. yes (default) if the contract is subject to the Contract Work Hours and Safety Standards Act, otherwise no. In JSON, a top-level true or false.'],
];

const PAYROLL = [
  ['entry_no', '1A', 'Worker entry number. Repeat it on each row when a worker has more than one classification.'],
  ['last_name, first_name, middle_initial', '1B to 1D', 'Worker name (middle initial optional).'],
  ['worker_id', '1E', 'Identifying number, such as the last four digits of the SSN. Never a full SSN.'],
  ['worker_type', '2', 'J (journeyworker) or RA (registered apprentice).'],
  ['apprentice_level', '2', 'Level of progression, for RA rows. Matches a level in the apprenticeship table.'],
  ['classification', '3', 'Labor classification, spelled as in the wage determination table (case and spacing are ignored).'],
  ['st_1 to st_7, ot_1 to ot_7', '4', 'Straight time and overtime hours for each day of the workweek, first day to last.'],
  ['total_hours', '5', 'Total hours for the row.'],
  ['st_rate, ot_rate', '6A', 'Hourly rate paid for straight time and overtime, without cash in lieu of fringe benefits.'],
  ['fringe_credit_hourly', 'page 2', 'Optional. Total hourly credit for fringe benefit plans.'],
  ['fringe_credit', '6B', 'Total fringe benefit credit for the row, in dollars.'],
  ['cash_in_lieu_hourly', '', 'Optional. Hourly cash paid in lieu of fringe benefits.'],
  ['cash_in_lieu', '6C', 'Payment in lieu of fringe benefits for the row, in dollars.'],
  ['gross_project', '7A', 'Gross amount earned on this project for the row.'],
  ['gross_all_work', '7B', 'Gross for all work in the week. Once per worker: on one of the worker\'s rows, or the same on each.'],
  ['tax_withholding, fica, other_deductions, total_deductions', '8', 'Deductions for all work. Once per worker, like 7B.'],
  ['net_pay', '9', 'Net pay for all work. Once per worker.'],
];

// [rule ID, severity, source, meaning]
const RULES = [
  ['WH-HEADER-REQUIRED', 'error', 'wh347', 'A WH-347 header field is missing.'],
  ['WH-HEADER-FORMAT', 'error', 'wh347', 'Week ending date is not a date, the payroll number is not a whole number from 1, or cwhssa is not yes or no.'],
  ['WH-COLUMN-MISSING', 'error', 'wh347', 'A required column is missing from the payroll, wage determination or apprenticeship table. Checks that need it are skipped.'],
  ['WH-REQUIRED', 'error', 'wh347', 'A required cell is blank (including 7B, 8 and 9 for a worker, and rates where hours are reported).'],
  ['WH-FORMAT', 'error', '', 'A number, percentage or ratio cell cannot be read, or is negative.'],
  ['WH-WD-CLASSIFICATION', 'error', 'wh347', 'A classification on the payroll (or apprenticeship table) is not in the wage determination table.'],
  ['WH-WD-DUPLICATE', 'error', '', 'A classification is listed twice in the wage determination table.'],
  ['WH-RATE-BASE', 'error', 'cfr5.31', 'Straight time rate below the basic hourly rate.'],
  ['WH-RATE-OT-BASE', 'error', 'cfr5.32', 'Overtime rate below one and one-half times the basic hourly rate (the apprentice rate for apprentices).'],
  ['WH-RATE-OT-PAID', 'warning', 'cfr5.32', 'Overtime rate below one and one-half times the straight time rate paid.'],
  ['WH-FRINGE-SHORT', 'error', 'cfr5.31', 'Wages, 6B and 6C together are less than the basic rate plus the fringe rate owed for the row\'s hours.'],
  ['WH-FRINGE-CREDIT-MATH', 'error', 'wh347', '6B does not equal total hours times the hourly fringe credit.'],
  ['WH-CASH-LIEU-MATH', 'error', 'wh347', '6C does not equal total hours times the hourly cash in lieu.'],
  ['WH-OT-HOURS', 'error', 'cfr5.5b', 'More than 40 straight time hours in the week for one worker, when cwhssa is yes.'],
  ['WH-HOURS-DAY', 'error', 'wh347', 'More than 24 hours on one day in one row.'],
  ['WH-HOURS-TOTAL', 'error', 'wh347', 'Column 5 does not equal the daily hours in column 4.'],
  ['WH-GROSS-SHORT', 'error', 'wh347', '7A is less than hours times the rates paid.'],
  ['WH-GROSS-MISMATCH', 'warning', 'wh347', '7A equals neither hours times rates nor that plus 6C.'],
  ['WH-GROSS-ALL-WORK', 'error', 'wh347', '7B is less than the worker\'s 7A total.'],
  ['WH-DEDUCTIONS-TOTAL', 'error', 'wh347', 'Total deductions is not tax withholdings plus FICA plus other.'],
  ['WH-NET-PAY', 'error', 'wh347', 'Net pay is not 7B minus total deductions.'],
  ['WH-ENTRY-CONSISTENCY', 'error', 'wh347', 'Rows with one entry number have different identifying numbers, or different weekly amounts.'],
  ['WH-ID-FULL-SSN', 'error', 'cfr5.5', 'An identifying number shaped like a full Social Security number.'],
  ['WH-WORKER-TYPE', 'error', 'wh347', 'worker_type is not J or RA.'],
  ['WH-APPR-LEVEL', 'error', 'wh347', 'An RA row without a level of progression.'],
  ['WH-APPR-PROGRAM', 'error', 'cfr5.5', 'No apprenticeship wage schedule was supplied for the row\'s classification and level, so the journeyworker rate applies.'],
  ['WH-APPR-RATE', 'error', 'cfr5.5', 'Apprentice straight time rate below the level\'s percentage of the journeyworker basic rate.'],
  ['WH-APPR-RATIO', 'warning', 'cfr5.5', 'More apprentices than the program ratio allows for the journeyworkers in the same classification, on one or more days of this payroll.'],
];

const CURL = `# Excel workbook
curl -X POST "https://www.spreadrun.com/api/v1/wh347-payroll-precheck" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" \\
  --data-binary @payroll_week_06.xlsx

# JSON with CSV tables
curl -X POST "https://www.spreadrun.com/api/v1/wh347-payroll-precheck" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data-binary @payroll_week_06.json`;

const PY = `import os, requests

with open("payroll_week_06.xlsx", "rb") as f:
    r = requests.post(
        "https://www.spreadrun.com/api/v1/wh347-payroll-precheck",
        headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
        data=f,
        timeout=60,
    )
if r.status_code == 400:            # not a readable payroll: not charged
    raise SystemExit(r.json()["error"]["message"])
r.raise_for_status()
report = r.json()["report"]
errors = [f for f in report["findings"] if f["severity"] == "error"]
print(report["status"], len(errors), "errors")`;

const JSON_SHAPE = {
  header: { project_name: '...', project_no: '...', payroll_no: 6, contractor_name: '...', contractor_address: '...', project_location: '...', wage_determination_no: '...', week_ending: '2026-09-26' },
  cwhssa: true,
  payrollCsv: 'entry_no,last_name,first_name,...,net_pay\\n1,...',
  wageDeterminationCsv: 'classification,base_rate,fringe_rate\\nElectrician,38.50,18.25\\n...',
  apprenticeshipCsv: 'classification,level,wage_percent,fringe_percent,ratio,program_name\\nElectrician,2,60,,1:1,...',
};

export default function DocsWh347() {
  const { notChecked, sources } = paidPass.body.report;
  const { notChecked: _n, sources: _s, ...shortReport } = paidPass.body.report;
  return (
    <Layout path={`/docs/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/docs', 'Docs'], [null, 'WH-347 Certified Payroll Pre-Check']]} />
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>Davis-Bacon WH-347 Certified Payroll Pre-Check API Reference</h1>
        <p className="lede" style={{ marginTop: 20 }}>Beta. Recomputes one weekly certified payroll, in the fields of Form WH-347 (Rev. January 2025), against the wage determination rates sent with it. <a href={`/apis/${API.slug}`}>Product page and free test form.</a></p>
        <nav className="toc" aria-label="On this page">
          <a href="#endpoint">Endpoint</a><a href="#input">Request</a><a href="#columns">Columns</a><a href="#report">Report</a><a href="#rules">Rule IDs</a><a href="#not-checked">Not checked</a><a href="#errors">Errors</a><a href="#examples">Code samples</a>
        </nav>

        <h2 id="endpoint">Endpoint</h2>
        <table className="doc-table"><tbody>
          <tr><th>Paid</th><td><code>POST https://www.spreadrun.com/api/v1/wh347-payroll-precheck</code>, API key required, {dollars(API.priceCents)} per completed report</td></tr>
          <tr><th>Demo</th><td><code>POST https://www.spreadrun.com/api/demo/wh347-payroll-precheck</code>, no key, 512 KB, 10 runs per day</td></tr>
          <tr><th>Body</th><td>An .xlsx workbook, or a JSON object with CSV tables. Any Content-Type; the format is detected from the content.</td></tr>
        </tbody></table>

        <h2 id="input">Request</h2>
        <p><b>Workbook.</b> Sheets named <code>Header</code> (two columns: field and value), <code>Payroll</code>, <code>Wage Determination</code>, and <code>Apprenticeship</code> when any worker is a registered apprentice. Row 1 of each table sheet holds the column names. Start from the <a href="/samples/wh347-pass.xlsx">sample workbook</a>; its rates are invented.</p>
        <p><b>JSON.</b> The same tables as CSV text, with the header fields as an object:</p>
        <Json value={JSON_SHAPE} />
        <p>Up to 4.4 MB and 5,000 rows per table. Money cells may include a dollar sign and thousands separators. The wage determination rates are never looked up: the check uses exactly the rates you send, copied from the wage determination in the contract.</p>
        <h3>Header fields</h3>
        <table className="doc-table"><tbody>{HEADER.map(([k, m]) => <tr key={k}><td><code>{k}</code></td><td>{m}</td></tr>)}</tbody></table>

        <h2 id="columns">Columns</h2>
        <p>Payroll: one row per worker per classification, as on the WH-347. Every column except the optional ones must be present; leave a cell blank or 0 where nothing applies.</p>
        <div className="table-scroll">
          <table className="doc-table">
            <thead><tr><th>Column</th><th>WH-347</th><th>Meaning</th></tr></thead>
            <tbody>{PAYROLL.map(([c, w, m]) => <tr key={c}><td><code>{c}</code></td><td>{w}</td><td>{m}</td></tr>)}</tbody>
          </table>
        </div>
        <p>Wage determination: <code>classification</code>, <code>base_rate</code>, <code>fringe_rate</code> (blank means 0). One row per classification.</p>
        <p>Apprenticeship: <code>classification</code>, <code>level</code>, <code>wage_percent</code> (of the journeyworker basic rate), <code>fringe_percent</code> (blank when the program does not specify fringe benefits, so the full rate applies), <code>ratio</code> (apprentices:journeyworkers, such as <code>1:3</code>), and optionally <code>program_name</code>.</p>

        <h2 id="report">Report</h2>
        <table className="doc-table">
          <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>status</code></td><td><code>FAIL</code> if any error, <code>WARN</code> if only warnings, otherwise <code>PASS</code>. A PASS does not mean the payroll complies with Davis-Bacon requirements.</td></tr>
            <tr><td><code>form</code>, <code>weekEnding</code>, <code>overtimeRule</code></td><td>The form version the fields follow, the week ending date read from the header, and <code>cwhssa</code> or <code>not-applied</code>.</td></tr>
            <tr><td><code>counts</code></td><td><code>rows</code>, <code>workers</code>, <code>apprentices</code>, <code>classifications</code>, <code>totalHours</code>.</td></tr>
            <tr><td><code>findings</code></td><td>Up to 500, errors first. Each has <code>severity</code>, <code>ruleId</code>, <code>path</code> (such as <code>/payroll/row[3]/st_rate</code>, counting data rows from 1), <code>message</code> and, for most rules, <code>source</code>. Findings never repeat a name, number or amount from the input.</td></tr>
            <tr><td><code>findingCount</code>, <code>findingCounts</code>, <code>ruleCounts</code>, <code>findingsTruncated</code></td><td>Totals, including findings beyond the 500 listed.</td></tr>
            <tr><td><code>notChecked</code>, <code>sources</code>, <code>scope</code></td><td>What the report does not cover, the documents rules come from, and what the verdict means.</td></tr>
            <tr><td><code>input</code>, <code>inputSha256</code></td><td>Format (json or xlsx), size, and the SHA-256 of the request body.</td></tr>
          </tbody>
        </table>

        <h2 id="rules">Rule IDs</h2>
        <p>Money comparisons allow one cent for rounding.</p>
        <div className="table-scroll">
          <table className="doc-table">
            <thead><tr><th>Rule</th><th>Severity</th><th>Source</th><th>Meaning</th></tr></thead>
            <tbody>{RULES.map(([id, sev, src, m]) => <tr key={id}><td><code>{id}</code></td><td>{sev}</td><td>{src ? <code>{src}</code> : 'SpreadRun'}</td><td>{m}</td></tr>)}</tbody>
          </table>
        </div>
        <p>Source keys, as returned in every report:</p>
        <table className="doc-table"><tbody>{Object.entries(sources).map(([k, v]) => <tr key={k}><td><code>{k}</code></td><td>{v}</td></tr>)}</tbody></table>
        <Wh347Sources />

        <h2 id="not-checked">Not checked</h2>
        <ul>{notChecked.map((n) => <li key={n}>{n}</li>)}</ul>

        <h2>Example responses</h2>
        <p>A paid check of the <a href="/samples/wh347-pass.json">clean sample payroll</a> (report shortened to its summary fields), and the first findings from a demo check of the <a href="/samples/wh347-fail.xlsx">sample with planted problems</a>. Both generated by running the real endpoint code.</p>
        <Json value={{ ...paidPass.body, report: shortReport }} />
        <Json value={demoFail.body.report.findings.slice(0, 4)} />

        <h2 id="errors">Errors</h2>
        <p>See the <a href="/docs#errors">shared error table</a>. Rejected with HTTP 400 and not charged: an empty body, a PDF, a ZIP that is not an .xlsx workbook, a workbook without Header, Payroll and Wage Determination sheets, DOCTYPE or entity declarations, JSON without <code>payrollCsv</code> or <code>wageDeterminationCsv</code>, CSV with repeated column names or ragged rows, more than 5,000 rows. Example (HTTP {inputError.status}):</p>
        <Json value={inputError.body} />

        <h2 id="examples">Code samples</h2>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </div>
    </Layout>
  );
}
