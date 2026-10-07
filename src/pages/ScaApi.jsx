import Badges from '../site/Badges.jsx';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import CodeSample from '../site/CodeSample.jsx';
import ScaDemo, { RATES, RATE_EFFECTIVE, RATE_MEMO } from '../site/ScaDemo.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import example from '../content/examples/sca-demo-fail.json';
import sampleRequest from '../../public/samples/sca-errors.json';

const API = apiBySlug('sca-hw-fringe-checker');
const ECFR = 'https://www.ecfr.gov/current/title-29/section-';

// Every fact on this page was checked against these documents on October 7, 2026. The rates come from rates.json
// (AAM 252), confirmed on current SAM.gov wage determinations. Left out: a per-case average of back wages (GAO does
// not state one), and an enforcement case whose main violation was misclassification, which this check does not cover.
export const SCA_SOURCES = [
  ['29 CFR 4.170: furnishing fringe benefits, no offset by wages, separate records', `${ECFR}4.170`],
  ['29 CFR 4.171: bona fide fringe benefits', `${ECFR}4.171`],
  ['29 CFR 4.172: no deduction for administrative costs; 40 hours a week, 2,080 a year', `${ECFR}4.172`],
  ['29 CFR 4.175: health and welfare on all hours paid; average cost determinations', `${ECFR}4.175`],
  ['29 CFR 4.176: temporary and part-time employees', `${ECFR}4.176`],
  ['29 CFR 4.177: equivalent benefits and cash in lieu', `${ECFR}4.177`],
  ['DOL Fact Sheet #67B: Meeting Requirements for SCA Fringe Benefits (October 2024)', 'https://www.dol.gov/agencies/whd/fact-sheets/67b-meeting-requirements-sca'],
  ['DOL Fact Sheet #67: The McNamara-O\'Hara Service Contract Act (penalties and typical problems)', 'https://www.dol.gov/agencies/whd/fact-sheets/67-sca'],
  ['DOL All Agency Memorandum No. 246 (July 16, 2024): end of average cost wage determinations', 'https://www.dol.gov/sites/dolgov/files/WHD/AAM/AAM246.pdf'],
  [`SAM.gov All Agency Memorandums: ${RATE_MEMO}, the 2026 health and welfare rate`, 'https://sam.gov/content/wage-determinations/resources/all-agency-memos'],
  ['GAO-21-11: Actions Needed to Improve DOL\'s Enforcement of Service Worker Wage Protections (2020)', 'https://www.gao.gov/products/GAO-21-11'],
];

export const SCA_FAQ = [
  ['Does a PASS mean we are compliant, or that DOL agrees?',
    'No. A PASS means that, on the rows you sent, each employee received at least the health and welfare the rate requires for the hours paid, and none of the recordkeeping problems this check looks for showed up. It is a math check against the published rules, not a compliance determination, not legal advice and not DOL acceptance. Your obligations under the contract remain yours.'],
  ['Which hours count?',
    'All hours paid, including paid vacation, sick leave and holidays, up to 40 hours a week and 2,080 hours a year on each contract (29 CFR 4.175(a)). Hours past 40 in a week carry no health and welfare. Send weekly hour columns for a pay period longer than a week, or the cap is applied to the period total.'],
  ['Which rate does it use?',
    `The one you choose. Left blank, it uses ${RATE_MEMO}, effective ${RATE_EFFECTIVE}: $${RATES.standard} an hour, or $${RATES.eo13706} where Executive Order 13706 paid sick leave applies, and for Hawaii $${RATES.hawaiiHphca} (or $${RATES.hawaiiHphcaEo13706}) for employees covered by the Hawaii Prepaid Health Care Act. An existing contract keeps the rate on its wage determination until the contracting officer adds a revised one, so enter the rate printed on yours if it differs.`],
  ['Can we pay higher wages instead of health and welfare?',
    'No. Fringe benefits are separate from and in addition to wages, and wages above the wage determination rate cannot make up a fringe shortfall (29 CFR 4.170(a)). Give wage_rate_paid and wd_wage_rate and the check flags any employee who is short on health and welfare while paid above the rate. Cash in lieu of fringe does count, when it is paid as fringe and recorded separately from wages.'],
  ['What about part-time employees?',
    'They are owed health and welfare on the hours they were paid, so a 20-hour week is owed half of a 40-hour week. If your plan excludes them, they are owed the cash equivalent instead (29 CFR 4.175(c), 4.176). The check flags a part-time employee who received nothing, and a part-time employee your records credit as if full time.'],
  ['Do you support average cost wage determinations?',
    'No. Under an average cost determination contributions are averaged across everyone in the plan, which is different math. DOL stopped issuing and allowing them for new contracts in All Agency Memorandum 246 (July 16, 2024). Choose average cost and the check stops with that message; nothing is charged.'],
  ['Is my data stored?',
    'No. The table is processed in memory for the length of the request and is not stored or shared. The report names rows by line number and never repeats your employee references. Use an internal reference, never a name or Social Security number: columns named for those are refused. For billing and usage we log the time, endpoint, result status, size and duration, never the contents.'],
  ['When is a run charged?',
    `When the check finishes and returns a report, whether it says PASS, WARN or FAIL: ${dollars(API.priceCents)} per completed check of one pay period. Requests rejected before a report exists are free, such as a missing required column, an unreadable number, or an average cost determination.`],
  ['Can I try it for free?',
    'Yes. Paste up to 10 employees and run it free, up to 10 times a day, or load one of the samples. A full pay period, or a workbook, runs as the paid check: sign in with enough credit and run it from the same form, or call the API.'],
];

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/sca-hw-fringe-checker?eo13706=true&periodWeeks=1" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: text/csv" \\
  --data-binary @pay_period.csv`;

const PY = `import os, requests

# One pay period: the employees table you already export, plus the run parameters.
body = {
    "parameters": {"wdType": "fixed", "eo13706": True, "periodWeeks": 2},
    "employeesCsv": open("pay_period.csv").read(),
}
r = requests.post(
    "https://www.spreadrun.com/api/v1/sca-hw-fringe-checker",
    headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
    json=body,
    timeout=60,
)
r.raise_for_status()
report = r.json()["report"]
print(report["status"], report["totals"]["backWageExposure"], report["shortfallLines"])`;

export function ScaSources() {
  return <ul className="small">{SCA_SOURCES.map(([label, url]) => <li key={url}><a href={url}>{label}</a></li>)}</ul>;
}

export default function ScaApi() {
  return (
    <Layout path={`/apis/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/apis', 'APIs'], [null, 'SCA Health and Welfare Fringe Checker']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <Badges api={API} style={{ marginBottom: 14 }} />
        <h1>SCA Health and Welfare Fringe Checker</h1>
        <p className="lede" style={{ marginTop: 20 }}>Check your Service Contract Act health and welfare math before DOL does. Send one pay period, one row per employee: hours paid, plan contributions and cash in lieu. You get back what each employee was owed, what was furnished, the shortfall, the total back wage exposure, and the recordkeeping problems DOL itself lists as common violations.</p>
        <h2 style={{ marginTop: 32 }}>Why it matters</h2>
        <ul className="costs">
          <li><b>Violations are common.</b> In fiscal years 2014 through 2019 DOL completed over 5,000 SCA cases, found violations in 68 percent of them, mainly of wage and benefit protections, and employers agreed to pay around $224 million in back wages. Sixty cases ended in debarment.</li>
          <li><b>The penalties reach the contract.</b> DOL can withhold contract payments to cover underpaid wages and fringe benefits, terminate the contract, sue to recover the underpayment, and debar the company from federal contracts for up to three years.</li>
          <li><b>The math is per employee.</b> A fixed health and welfare rate is met employee by employee, on every hour paid up to 40 a week. An overpayment for one employee does not cover another, and a higher wage does not cover a fringe shortfall.</li>
        </ul>
        <p className="small">Sources: GAO-21-11 and DOL Fact Sheets #67 and #67B, linked at the bottom of this page.</p>
        <div className="note">
          <p><b>A math check, not a compliance determination.</b> It checks the amounts you enter against the published rules. A PASS is not legal advice and not DOL acceptance, and your obligations under the contract remain yours.</p>
        </div>
        <div className="btn-row">
          <a className="btn" href="#demo">Check a pay period</a>
          <a className="btn secondary" href="/samples/sca-template.csv">Download the CSV template</a>
        </div>
      </div>

      <section className="section wrap split" aria-labelledby="checks">
        <div>
          <h2 id="checks">What it checks</h2>
          <ul className="checklist">
            <li><b>Hours that count.</b> All hours paid, including paid vacation, sick and holiday hours, capped at 40 a week, and at 2,080 a year when you give the hours already counted.</li>
            <li><b>Required health and welfare.</b> Hours counted times the rate: the {RATE_MEMO} default (${RATES.standard}, or ${RATES.eo13706} under EO 13706, with the Hawaii rates) or the rate on your wage determination.</li>
            <li><b>What was furnished.</b> Bona fide plan contributions plus cash in lieu, less anything that cannot be credited.</li>
            <li><b>The shortfall,</b> employee by employee, and the total back wage exposure for the period.</li>
            <li><b>Wages offsetting fringe.</b> An employee short on health and welfare while paid above the wage determination rate.</li>
            <li><b>Part-time employees.</b> Pro-rated to hours paid; flagged when they received nothing, or are credited as if full time.</li>
            <li><b>Administrative costs and employee-paid amounts</b> counted as health and welfare.</li>
            <li><b>Separate records.</b> Cash in lieu not shown separately from wages.</li>
          </ul>
          <p>Every report ends with the Fact Sheet #67B checklist: each item Clear, Flagged with the rows, or Not checked with the column that would check it.</p>
        </div>
        <div>
          <h2>Who it's for</h2>
          <ul>
            <li><b>Federal service contractors:</b> check a pay period before payroll closes, or before a DOL investigator asks.</li>
            <li><b>Payroll and HR teams:</b> confirm cash in lieu and plan contributions add up for every employee, part-timers included.</li>
            <li><b>Government contracts consultants and accountants:</b> run each client the same way, from a script.</li>
          </ul>
          <h3 style={{ marginTop: 24 }}>Not checked</h3>
          <ul className="small">
            <li>Which wage determination applies, or whether its rate is the one in effect for your contract.</li>
            <li>Whether each worker is a covered service employee and correctly classified.</li>
            <li>Whether your plans are bona fide: written, funded, irrevocable and communicated to employees.</li>
            <li>Vacation, holidays and EO 13706 paid sick leave, which cannot be credited toward health and welfare.</li>
            <li>Whether cash in lieu was paid on the regular payday, and whether the hours and amounts you entered are right.</li>
            <li>Average cost health and welfare wage determinations.</li>
          </ul>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="how">
        <h2 id="how">Input and output</h2>
        <ol className="steps">
          <li><h3>Send</h3><p>CSV, an .xlsx workbook, or JSON with <code>parameters</code> and <code>employeesCsv</code>. One row per employee with <code>hours_paid</code>, <code>plan_contributions</code> and <code>cash_in_lieu</code>; optional columns turn on the recordkeeping checks. Up to 5,000 employees and 4.4 MB.</p></li>
          <li><h3>Check</h3><p>Every rule on this page, in exact decimal arithmetic. No network calls, nothing stored.</p></li>
          <li><h3>Report</h3><p>JSON with <code>employees</code> (line, hours counted, required, furnished, shortfall, result), <code>totals</code> with the back wage exposure, <code>recordkeeping</code> (the Fact Sheet #67B checklist) and <code>findings</code> (severity, ruleId, line, message, source).</p></li>
        </ol>
        <p className="small">Every column, parameter and rule ID is in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
      </section>

      <section className="section wrap" id="demo" aria-labelledby="demo-h">
        <h2 id="demo-h">Try it now</h2>
        <p>Paste up to 10 employees and run it free. A full pay period, or a workbook, runs as a paid check at {dollars(API.priceCents)} from your credit.</p>
        <ScaDemo api={API} sample={example.body.report} sampleCsv={sampleRequest.employeesCsv} />
      </section>

      <section className="section wrap" aria-labelledby="price-h">
        <h2 id="price-h">Pricing</h2>
        <p><b>{dollars(API.priceCents)} per completed check.</b> One pay period, every employee, one full report.</p>
        <ul>
          <li>Billed when a report is produced, PASS, WARN or FAIL. Invalid input is never billed.</li>
          <li>Paid from the same prepaid credits as every SpreadRun API, in $5, $20, $50 or $100 packs. A $100 pack covers {Math.floor(10000 / API.priceCents)} {Math.floor(10000 / API.priceCents) === 1 ? 'check' : 'checks'}. Credits never expire. <a href="/apis#pricing">All pricing</a></li>
          <li>Checking many contracts or clients? <a href="/contact">Talk to us</a> first so we can tell you honestly whether this fits.</li>
        </ul>
        <div className="btn-row"><a className="btn" href="#demo">Check a pay period</a><a className="btn secondary" href="/account">Get API access</a></div>
      </section>

      <section className="section wrap" aria-labelledby="code-h">
        <h2 id="code-h">Call it from code</h2>
        <p>Columns, parameters, rule IDs, error codes and limits are in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={SCA_FAQ} />
        <h3 style={{ marginTop: 28 }}>Sources</h3>
        <ScaSources />
        <p className="small" style={{ marginTop: 16 }}>SpreadRun is not affiliated with or endorsed by the Department of Labor. Where this check and the regulations or your wage determination differ, they control.</p>
        <p className="small">More validators: <a href="/apis/wh347-payroll-precheck">WH-347 Certified Payroll Pre-Check</a> | <a href="/apis">the full catalog</a></p>
      </section>
    </Layout>
  );
}
