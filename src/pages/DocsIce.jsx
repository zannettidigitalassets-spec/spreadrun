import Layout, { Crumbs } from '../site/Layout.jsx';
import CodeSample, { Json } from '../site/CodeSample.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import paidPass from '../content/examples/ice-paid-pass.json';
import demoFail from '../content/examples/ice-demo-fail.json';
import inputError from '../content/examples/ice-input-error.json';
import { IceSources } from './IceApi.jsx';

const API = apiBySlug('ice-adequacy-precheck');

const PARAMS = [
  ['fiscalYearEnd', 'Required. YYYY-MM-DD, the last day of the fiscal year the submission covers. The deadline is this date plus 6 months; a month-end date stays at month end (December 31 gives June 30).'],
  ['asOf', 'Optional. YYYY-MM-DD to measure the deadline from. Default: today (UTC).'],
];

const FINDING = [
  ['severity', 'error or warning. Any error makes the report FAIL; warnings alone make it WARN.'],
  ['ruleId', 'One of the rule IDs below.'],
  ['tab', 'The worksheet name, or null for the workbook as a whole.'],
  ['range', 'The cell or cells, such as K74 or B23, B25.'],
  ['sumRange', 'Footing findings: the cells that were added up.'],
  ['expected, actual', 'Amounts, where the finding compares two. Expected is what the rows or the other schedule say; actual is what the cell says.'],
  ['message', 'What is wrong, in plain words. Never repeats text from the workbook.'],
  ['source', 'A key in sources.'],
  ['checklistItem', 'The DCAA checklist item, where one applies.'],
];

const RULES = [
  ['ICE-SCHEDULE-MISSING', 'error', 'A schedule A to O was not found, or more than one tab could be it. The message says what was looked for.'],
  ['ICE-SCHEDULE-EMPTY', 'warning', 'A schedule tab with nothing on it and no statement that it does not apply.'],
  ['ICE-FOOT', 'error', 'A total that does not equal any reading of the rows it totals.'],
  ['ICE-ROW-MATH', 'error', 'Claimed is not books plus adjustments on a row.'],
  ['ICE-NO-VALUES', 'error', 'Formulas with no saved result: open the workbook in Excel, let it calculate and save it.'],
  ['ICE-RATE', 'error', 'A Schedule A rate that is not pool divided by base at the precision shown.'],
  ['ICE-A-UNREADABLE', 'error', 'Schedule A has no rows with a pool, a base and a rate.'],
  ['ICE-TIE', 'error', 'Two schedules that should agree do not. Reported on both tabs.'],
  ['ICE-H-RATE', 'error', 'Indirect expense on Schedule H not at the Schedule A rate.'],
  ['ICE-K-LABOR', 'error', 'Schedule K labor that is not rate times hours.'],
  ['ICE-H-K', 'error', 'A T&M or labor-hour contract on Schedule H missing from Schedule K.'],
  ['ICE-I-O, ICE-O-I', 'warning', 'Contracts complete on one of Schedules I and O but not found on the other.'],
  ['ICE-NOTES', 'warning', 'An adjustment with no explanatory note beside it.'],
  ['ICE-CERT-MISSING', 'error', 'No certificate of final indirect costs (FAR 42.703-2).'],
  ['ICE-CERT-UNSIGNED', 'warning', 'The certificate is there but its signature, name, title, date or proposal lines are blank.'],
  ['ICE-CERT-LEVEL', 'warning', 'The certifying official\'s title does not read as vice president, CFO or higher (FAR 52.242-4).'],
  ['ICE-D-ALLOCATION', 'warning', 'Schedule D lacks the base, percentage or dollars allocated per recipient.'],
  ['ICE-J-DETAIL', 'warning', 'Schedule J lacks columns DCAA expects for each subcontract.'],
  ['ICE-O-DETAIL', 'warning', 'Schedule O lacks level of effort, fee, period of performance or ceiling.'],
  ['ICE-M-EMPTY', 'warning', 'Schedule M is empty with no statement that there is nothing to report.'],
  ['ICE-FYE-MISMATCH', 'warning', 'The fiscal year end written in the workbook differs from the one you sent.'],
  ['ICE-DEADLINE-PASSED', 'warning', 'Past the 6-month mark (FAR 52.216-7(d)(2)(i)).'],
];

const PY = `import os, requests

with open("incurred_cost_fy2025.xlsx", "rb") as f:
    r = requests.post(
        "https://www.spreadrun.com/api/v1/ice-adequacy-precheck",
        params={"fiscalYearEnd": "2025-12-31"},
        headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
        data=f,
        timeout=120,
    )
r.raise_for_status()
report = r.json()["report"]
print(report["status"], [s["schedule"] for s in report["schedules"] if s["status"] == "missing"])`;

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/ice-adequacy-precheck?fiscalYearEnd=2025-12-31" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" \\
  --data-binary @incurred_cost_fy2025.xlsx`;

export default function DocsIce() {
  const { notChecked, sources, checklist, ...shortReport } = paidPass.body.report;
  return (
    <Layout path={`/docs/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/docs', 'Docs'], [null, 'Incurred Cost Submission Adequacy Pre-Check']]} />
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>Incurred Cost Submission Adequacy Pre-Check API Reference</h1>
        <p className="lede" style={{ marginTop: 20 }}>Beta. Pre-checks one annual incurred cost submission workbook for adequacy: the schedules in FAR 52.216-7(d)(2)(iii), the math, the ties between schedules, the certificate in FAR 42.703-2 and 52.242-4, and the deadline in FAR 52.216-7(d)(2)(i), reported against DCAA's adequacy checklist (Version 3.4). Adequacy only: it does not judge allowability. <a href={`/apis/${API.slug}`}>Product page and free test form.</a></p>
        <nav className="toc" aria-label="On this page">
          <a href="#endpoint">Endpoint</a><a href="#params">Parameters</a><a href="#mapping">Finding the schedules</a><a href="#math">The math</a><a href="#report">Report</a><a href="#rules">Rule IDs</a><a href="#errors">Errors</a><a href="#examples">Code samples</a>
        </nav>

        <h2 id="endpoint">Endpoint</h2>
        <table className="doc-table"><tbody>
          <tr><th>Paid</th><td><code>POST https://www.spreadrun.com/api/v1/{API.slug}</code>, API key required, {dollars(API.priceCents)} per completed pre-check</td></tr>
          <tr><th>Demo</th><td><code>POST https://www.spreadrun.com/api/demo/{API.slug}</code>, no key, 10 runs per day. Runs the three published sample workbooks only (<a href="/samples/ice-template-clean.xlsx">DCAA layout</a>, <a href="/samples/ice-own-format-clean.xlsx">own format</a>, <a href="/samples/ice-errors.xlsx">with errors</a>), byte for byte. Their fiscal year ends June 30, 2026.</td></tr>
          <tr><th>Body</th><td>The .xlsx workbook, up to 4 MB. .xls is refused with instructions to save as .xlsx. The check stops after about 20 seconds with a plain message and no charge.</td></tr>
        </tbody></table>

        <h2 id="params">Parameters</h2>
        <table className="doc-table"><tbody>{PARAMS.map(([k, m]) => <tr key={k}><td><code>{k}</code></td><td>{m}</td></tr>)}</tbody></table>
        <p>Any other parameter is refused, so a typo never changes the result quietly.</p>

        <h2 id="mapping">Finding the schedules</h2>
        <p>The DCAA ICE model is not required. Each schedule is found, in this order:</p>
        <ol>
          <li><b>Tab name:</b> <code>A</code>, <code>Schedule B</code>, <code>Sch C</code>, <code>Sch. D</code>, <code>E - Bases</code>. Sub-schedules such as <code>F-1</code>, <code>H-1</code> and <code>H (Summary)</code> are read with their schedule.</li>
          <li><b>Sheet title:</b> "Schedule G" in the first rows of the sheet.</li>
          <li><b>Content:</b> a title that describes it, such as "Occupancy expenses" or "Certificate of Final Indirect Costs", if exactly one sheet matches.</li>
        </ol>
        <p>A schedule that does not apply should still be there, saying "None" or "Not applicable". Columns are read by their headings, so name them plainly (pool, base, rate; per books, adjustments, claimed; contract number, order number).</p>

        <h2 id="math">The math</h2>
        <ul>
          <li>Values are the ones Excel saved; formulas are never trusted, every total is recomputed. A formula with no saved value is reported.</li>
          <li>A total row is a row labeled Total, Subtotal or Grand total (or numbers under a row of Total labels). It is accepted when it equals any reading of what it totals: the rows since the previous total, the rows sharing its pool, contract or category, the rows its label names, everything above it, the subtotals above it, or the rows those subtotals cover. Differences up to $1 are rounding.</li>
          <li>Rate, factor, percentage, date, number and ranking columns are not footed.</li>
        </ul>

        <h2 id="report">Report</h2>
        <table className="doc-table">
          <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>status</code>, <code>summary</code></td><td>FAIL if any error, WARN if only warnings, otherwise PASS. A PASS is not DCAA acceptance and says nothing about allowability.</td></tr>
            <tr><td><code>deadline</code></td><td><code>due</code>, <code>asOf</code>, <code>daysLeft</code> (negative when late) and <code>status</code>: on-time, due-soon (30 days or less) or late.</td></tr>
            <tr><td><code>checks</code></td><td><code>schedules</code>, <code>math</code>, <code>crossTies</code>, <code>certificate</code> and <code>deadline</code>, each pass, warn or fail.</td></tr>
            <tr><td><code>schedules</code></td><td>A to O: <code>status</code> (found, missing, not-applicable, empty), <code>tab</code>, <code>foundBy</code> (tab name, sheet title, content) and <code>subSchedules</code>.</td></tr>
            <tr><td><code>findings</code></td><td>Errors first, up to 400.</td></tr>
            <tr><td><code>checklist</code>, <code>checklistCounts</code>, <code>checklistVersion</code></td><td>All 47 DCAA checklist items: <code>item</code>, <code>schedule</code>, <code>label</code> (in our words), <code>status</code> (pass, warn, fail, review, na) and <code>automatic</code>.</td></tr>
            <tr><td><code>notChecked</code>, <code>sources</code>, <code>scope</code>, <code>input</code>, <code>inputSha256</code></td><td>What the report does not cover, where the rules come from, what the verdict means, and a fingerprint of the workbook.</td></tr>
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
        <IceSources />
        <h3>Not checked</h3>
        <ul>{notChecked.map((n) => <li key={n}>{n}</li>)}</ul>

        <h2>Example responses</h2>
        <p>A paid pre-check of the <a href="/samples/ice-template-clean.xlsx">clean sample</a> (report shortened), and the findings from a demo run of the <a href="/samples/ice-errors.xlsx">sample with errors</a>. Both generated by running the real endpoint code.</p>
        <Json value={{ ...paidPass.body, report: { ...shortReport, checklist: `${checklist.length} items` } }} />
        <Json value={demoFail.body.report.findings} />

        <h2 id="errors">Errors</h2>
        <p>See the <a href="/docs#errors">shared error table</a>. Rejected and not charged: an .xls file, a file that is not an .xlsx workbook, a file over 4 MB (HTTP 413), a missing or malformed fiscalYearEnd, an unknown parameter, a workbook too large to finish in time, and on the demo endpoint anything other than a sample workbook. Example, an .xls upload (HTTP {inputError.status}):</p>
        <Json value={inputError.body} />

        <h2 id="examples">Code samples</h2>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </div>
    </Layout>
  );
}
