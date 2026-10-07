import Layout, { Crumbs } from '../site/Layout.jsx';
import CodeSample, { Json } from '../site/CodeSample.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import paidPass from '../content/examples/sca-paid-pass.json';
import demoFail from '../content/examples/sca-demo-fail.json';
import inputError from '../content/examples/sca-input-error.json';
import { ScaSources } from './ScaApi.jsx';
import { RATES, RATE_EFFECTIVE, RATE_MEMO } from '../site/ScaDemo.jsx';

const API = apiBySlug('sca-hw-fringe-checker');

const PARAMS = [
  ['wdType', 'Optional. fixed (the default): a fixed health and welfare rate per hour, met employee by employee. average is refused with a limitation message and not charged.'],
  ['eo13706', 'true if the contract is covered by Executive Order 13706 (paid sick leave), false if not. Picks the default rate. Required unless you send hwRate (and, for Hawaii, hwRateHphca).'],
  ['hawaii', 'Optional, default false. true for a Hawaii wage determination: then every row needs hphca_covered.'],
  ['periodWeeks', 'Optional whole number from 1 to 53, default 1: the weeks in the pay period. The 40-hour cap is per week.'],
  ['hwRate', `Optional dollars per hour. The rate printed on your wage determination. Default: $${RATES.standard}, or $${RATES.eo13706} when eo13706 is true (${RATE_MEMO}, effective ${RATE_EFFECTIVE}).`],
  ['hwRateHphca', `Optional, Hawaii only. The rate for employees covered by the Hawaii Prepaid Health Care Act. Default: $${RATES.hawaiiHphca}, or $${RATES.hawaiiHphcaEo13706} when eo13706 is true. Employees not covered use hwRate.`],
];

const COLUMNS = [
  ['hours_paid', 'Required. All hours paid in the period, including paid vacation, sick leave and holiday hours.'],
  ['plan_contributions', 'Required. Contributions to bona fide health and welfare plans for this employee for the period, in dollars. 0 where none.'],
  ['cash_in_lieu', 'Required. Cash paid in lieu of health and welfare for the period, in dollars. 0 where none.'],
  ['employee_ref', 'Optional. Your own reference for the employee, unique per row. Never a name or Social Security number. Never repeated in the report.'],
  ['hours_week_1 to hours_week_N', 'Optional, one per week of periodWeeks. Each week is capped at 40. Without them the cap is applied to the period total.'],
  ['ytd_hw_hours', 'Optional. Hours already counted for health and welfare earlier in the contract year. Hours past 2,080 are not counted.'],
  ['admin_costs_credited', 'Optional. Administrative costs or fees included in plan_contributions. Not creditable: taken out and flagged.'],
  ['employee_paid_included', 'Optional. Amounts paid by the employee, or taken from their wages, included in plan_contributions. Not creditable: taken out and flagged.'],
  ['hw_hours_credited', 'Optional. The hours your payroll figured health and welfare on. Compared with the hours that count.'],
  ['wage_rate_paid, wd_wage_rate', 'Optional, together. The hourly wage paid and the wage determination rate for the classification. Used to flag wages offsetting a fringe shortfall.'],
  ['cash_in_lieu_separate', 'Optional yes or no. Whether cash in lieu is shown separately from wages on the payroll records.'],
  ['hphca_covered', 'Hawaii only, required then. yes if the employer provides coverage under the Hawaii Prepaid Health Care Act for this employee.'],
];

const RULES = [
  ['SCA-HW-SHORTFALL', 'error', 'Furnished health and welfare is below the required amount for this employee.', '29 CFR 4.172, 4.175'],
  ['SCA-WAGE-OFFSET', 'error', 'Short on health and welfare while paid above the wage determination rate. Higher wages cannot offset fringe.', '29 CFR 4.170(a)'],
  ['SCA-PART-TIME', 'error', 'A part-time employee received no health and welfare.', '29 CFR 4.175(c), 4.176; Fact Sheet #67B'],
  ['SCA-ADMIN-COSTS', 'error', 'Administrative costs or fees counted as health and welfare.', '29 CFR 4.172; Fact Sheet #67B'],
  ['SCA-EMPLOYEE-PAID', 'error', 'Employee-paid amounts counted as health and welfare.', '29 CFR 4.171(a)(1)'],
  ['SCA-CIL-NOT-SEPARATE', 'error', 'Cash in lieu not recorded separately from wages.', '29 CFR 4.170(a); Fact Sheet #67B'],
  ['SCA-CREDIT-HOURS-HIGH', 'warning', 'A part-time employee credited with health and welfare for more hours than were paid, as if full time.', '29 CFR 4.176'],
  ['SCA-CREDIT-HOURS-LOW', 'warning', 'Health and welfare figured on fewer hours than were paid, such as leaving out holiday or vacation hours.', '29 CFR 4.175(a)'],
  ['SCA-WEEKS-MISMATCH', 'warning', 'The weekly hours do not add up to hours_paid. The weekly hours were used.', '29 CFR 4.175(a)'],
];

const PY = `import os, requests

with open("pay_period.csv", "rb") as f:
    r = requests.post(
        "https://www.spreadrun.com/api/v1/sca-hw-fringe-checker",
        params={"eo13706": "true", "periodWeeks": 2},
        headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}", "Content-Type": "text/csv"},
        data=f,
        timeout=60,
    )
r.raise_for_status()
report = r.json()["report"]
for e in report["employees"]:
    if e["result"] == "FAIL":
        print(e["line"], e["required"], e["furnished"], e["shortfall"])
print("Back wage exposure:", report["totals"]["backWageExposure"])`;

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/sca-hw-fringe-checker?eo13706=true" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" \\
  --data-binary @pay_period.xlsx`;

export default function DocsSca() {
  const { notChecked, sources, methodology, ...shortReport } = paidPass.body.report;
  return (
    <Layout path={`/docs/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/docs', 'Docs'], [null, 'SCA Health and Welfare Fringe Checker']]} />
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>SCA Health and Welfare Fringe Checker API Reference</h1>
        <p className="lede" style={{ marginTop: 20 }}>Beta. Checks one pay period of Service Contract Act health and welfare, employee by employee, for a fixed-rate wage determination: the required amount on all hours paid up to 40 a week (29 CFR 4.175 and 4.172), what was furnished as plan contributions and cash in lieu (4.177), the shortfall, and the Fact Sheet #67B recordkeeping problems. <a href={`/apis/${API.slug}`}>Product page and free test form.</a></p>
        <nav className="toc" aria-label="On this page">
          <a href="#endpoint">Endpoint</a><a href="#params">Parameters</a><a href="#columns">Columns</a><a href="#method">Method</a><a href="#report">Report</a><a href="#rules">Rule IDs</a><a href="#errors">Errors</a><a href="#examples">Code samples</a>
        </nav>

        <h2 id="endpoint">Endpoint</h2>
        <table className="doc-table"><tbody>
          <tr><th>Paid</th><td><code>POST https://www.spreadrun.com/api/v1/{API.slug}</code>, API key required, {dollars(API.priceCents)} per completed check</td></tr>
          <tr><th>Demo</th><td><code>POST https://www.spreadrun.com/api/demo/{API.slug}</code>, no key, 10 runs per day, up to 10 employees and 64 KB.</td></tr>
          <tr><th>Body</th><td>One of: CSV text (parameters in the query string); an .xlsx workbook with an <code>Employees</code> sheet, or the first sheet (parameters in the query string or a <code>Parameters</code> sheet of name and value rows); or JSON <code>{'{"parameters": {...}, "employeesCsv": "..."}'}</code>. Up to 5,000 employees and 4.4 MB.</td></tr>
        </tbody></table>

        <h2 id="params">Parameters</h2>
        <table className="doc-table"><tbody>{PARAMS.map(([k, m]) => <tr key={k}><td><code>{k}</code></td><td>{m}</td></tr>)}</tbody></table>
        <p>An unknown parameter is refused, so a typo never changes the result quietly. True and false may also be written yes and no.</p>

        <h2 id="columns">Columns</h2>
        <p>A header row, then one row per employee. Case and spacing in column names do not matter, and a few other names are accepted (for example <code>employee_id</code>, <code>contributions</code>, <code>cil</code>). Blank money cells count as 0. Columns for names or Social Security numbers are refused.</p>
        <table className="doc-table"><tbody>{COLUMNS.map(([k, m]) => <tr key={k}><td><code>{k}</code></td><td>{m}</td></tr>)}</tbody></table>
        <p>Start from the <a href="/samples/sca-template.csv">CSV template</a> or the <a href="/samples/sca-errors.json">sample with errors</a>. The employees in the samples are invented.</p>

        <h2 id="method">Method</h2>
        <ul>{methodology.map((m) => <li key={m}>{m}</li>)}</ul>

        <h2 id="report">Report</h2>
        <table className="doc-table">
          <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>status</code></td><td><code>FAIL</code> if any error, <code>WARN</code> if only warnings, otherwise <code>PASS</code>. A PASS is a math check, not a compliance determination and not DOL acceptance.</td></tr>
            <tr><td><code>employees</code></td><td>One entry per row: <code>line</code> (its line in your file), <code>hoursCounted</code>, <code>capped</code>, <code>rate</code>, <code>required</code>, <code>furnished</code>, <code>notCreditable</code>, <code>shortfall</code>, <code>result</code>, <code>partTime</code>. Amounts are strings with two decimals.</td></tr>
            <tr><td><code>totals</code></td><td><code>employees</code>, <code>passing</code>, <code>failing</code>, <code>required</code>, <code>furnished</code> and <code>backWageExposure</code>, the sum of the shortfalls.</td></tr>
            <tr><td><code>shortfallLines</code></td><td>The lines of every employee with a shortfall.</td></tr>
            <tr><td><code>recordkeeping</code></td><td>The Fact Sheet #67B items: <code>separate</code>, <code>partTime</code> and <code>adminCosts</code>, each <code>clear</code>, <code>flagged</code> (with <code>lines</code>) or <code>not-checked</code> (with <code>howToCheck</code>).</td></tr>
            <tr><td><code>findings</code></td><td>By line, errors first. Each has <code>severity</code>, <code>ruleId</code>, <code>path</code>, <code>line</code>, <code>message</code> and <code>source</code>. Up to 500; <code>findingsTruncated</code> says when there were more.</td></tr>
            <tr><td><code>parameters</code></td><td>What the run used, including the rates, whether each was the default or supplied, and the rate memo.</td></tr>
            <tr><td><code>notes</code>, <code>methodology</code>, <code>notChecked</code>, <code>sources</code>, <code>scope</code>, <code>input</code>, <code>inputSha256</code></td><td>Anything to know about this run, the method, what the report does not cover, where the rules come from, what the verdict means, and a fingerprint of the request body.</td></tr>
          </tbody>
        </table>
        <p>The report never repeats your employee references. Join it back to your file by <code>line</code>.</p>

        <h2 id="rules">Rule IDs</h2>
        <div className="table-scroll">
          <table className="doc-table">
            <thead><tr><th>Rule</th><th>Severity</th><th>Meaning</th><th>Rule source</th></tr></thead>
            <tbody>{RULES.map(([id, sev, m, src]) => <tr key={id}><td><code>{id}</code></td><td>{sev}</td><td>{m}</td><td>{src}</td></tr>)}</tbody>
          </table>
        </div>
        <p>Source keys, as returned in every report:</p>
        <table className="doc-table"><tbody>{Object.entries(sources).map(([k, v]) => <tr key={k}><td><code>{k}</code></td><td>{v}</td></tr>)}</tbody></table>
        <ScaSources />
        <h3>Not checked</h3>
        <ul>{notChecked.map((n) => <li key={n}>{n}</li>)}</ul>

        <h2>Example responses</h2>
        <p>A paid check of the <a href="/samples/sca-clean.json">clean sample</a> (report shortened), and the findings from a demo run of the <a href="/samples/sca-errors.json">sample with errors</a>. Both generated by running the real endpoint code.</p>
        <Json value={{ ...paidPass.body, report: shortReport }} />
        <Json value={demoFail.body.report.findings.slice(0, 6)} />

        <h2 id="errors">Errors</h2>
        <p>See the <a href="/docs#errors">shared error table</a>. Rejected with HTTP 400 and not charged: an average cost determination, a missing required column or parameter, a column this check does not use, an unreadable or negative number, a repeated employee_ref, a name or Social Security number column, weekly columns that do not match periodWeeks, and on the demo endpoint more than 10 employees. Example, an average cost determination (HTTP {inputError.status}):</p>
        <Json value={inputError.body} />

        <h2 id="examples">Code samples</h2>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </div>
    </Layout>
  );
}
