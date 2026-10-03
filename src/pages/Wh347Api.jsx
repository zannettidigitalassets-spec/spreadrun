import Badges from '../site/Badges.jsx';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import CodeSample from '../site/CodeSample.jsx';
import { Wh347Demo } from '../site/Demo.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import example from '../content/examples/wh347-demo-fail.json';

const API = apiBySlug('wh347-payroll-precheck');

// Every rule on this page was checked against these documents (October 2026).
export const WH347_SOURCES = [
  ['DOL Wage and Hour Division: Form WH-347 (Rev. January 2025) and its instructions', 'https://www.dol.gov/agencies/whd/forms/wh347'],
  ['29 CFR part 5: Davis-Bacon contract clauses (5.5), fringe benefit crediting (5.31) and overtime (5.32)', 'https://www.ecfr.gov/current/title-29/subtitle-A/part-5'],
  ['SAM.gov wage determinations, where the rates for your contract are published', 'https://sam.gov/content/wage-determinations'],
];

export const WH347_FAQ = [
  ['The WH-347 form is free from the Department of Labor. Why pay for this?',
    'The form and its instructions are free, and you should use them, or any format with the same information. What the form does not do is check itself. SpreadRun recomputes every row against the wage determination rates and tells you, before you sign the Statement of Compliance, which rows are short, which totals do not add up and where. It runs from this page or from your payroll system through the API, in seconds, every week.'],
  ['Does a PASS mean the payroll complies with Davis-Bacon?',
    'No. A PASS means the payroll passed the checks listed on this page against the rates you supplied. It cannot tell whether those are the right rates for the contract, whether workers are classified correctly for the work they did, or whether fringe benefit plans are bona fide. These are structural checks, not legal or compliance advice.'],
  ['Where do the wage determination rates come from?',
    'From you. Copy the basic hourly rate and fringe benefit rate for each classification from the wage determination in your contract (published on SAM.gov) into the Wage Determination sheet or table. SpreadRun does not look rates up: there is no stable public interface for wage determinations that we could verify, and a wrong automatic match would be worse than none. The report checks the payroll against exactly the rates you send.'],
  ['Which file formats work?',
    'An .xlsx workbook with sheets named Header, Payroll, Wage Determination and, if you have apprentices, Apprenticeship. Or, through the API, a JSON object with the header fields and the three tables as CSV text. Download the sample workbook on this page to start from the right columns. PDF payrolls cannot be read.'],
  ['How is overtime checked?',
    'On contracts subject to the Contract Work Hours and Safety Standards Act (generally over $100,000), hours over 40 in the workweek must be paid at one and one-half times the basic rate. The check flags more than 40 straight time hours for a worker across all rows, and an overtime rate below one and one-half times the wage determination\'s basic rate. Fringe benefits and cash in lieu of them are left out of the overtime calculation, as 29 CFR 5.32 allows. If the contract is not subject to that Act, set cwhssa to no.'],
  ['How are fringe benefits checked?',
    'The way 29 CFR 5.31 describes: the basic hourly rate must be paid in cash, and the fringe benefit rate can be met by plan contributions (column 6B), cash in lieu of benefits (column 6C), cash wages above the basic rate, or a mix. A row fails when everything paid for its hours comes to less than the basic rate plus the fringe rate owed. Fringe credit can never make up a basic rate below the wage determination.'],
  ['What about apprentices?',
    'List each registered apprenticeship program\'s wage schedule in the Apprenticeship sheet: classification, level, wage percentage of the journeyworker rate, fringe percentage (leave it blank if the program does not specify, and the full fringe rate applies) and the ratio. Apprentice rows are checked against their level\'s rate, and each day\'s count of apprentices against journeyworkers in the same classification on this payroll. An apprentice with no program schedule must be paid the journeyworker rate.'],
  ['Is the payroll data stored?',
    'No. Files are processed in memory for the length of the request and are not stored or shared. Certified payrolls name workers and carry identifying numbers and pay, which is personal data. Findings name the row, the column, the rule and the problem, never a value from your file. For billing and usage we log the time, endpoint, result status, upload size and duration, never the file contents.'],
  ['When is a run charged?',
    `When the check finishes and returns a report, whether it says PASS, WARN or FAIL: ${dollars(API.priceCents)} per report. Requests rejected before a report exists are free: a PDF, a workbook without the required sheets, JSON without the payroll or wage determination table, unreadable CSV.`],
];

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/wh347-payroll-precheck" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" \\
  --data-binary @payroll_week_06.xlsx`;

const PY = `import os, requests

payload = {
    "header": {"project_name": "...", "project_no": "...", "payroll_no": 6,
               "contractor_name": "...", "project_location": "...",
               "wage_determination_no": "...", "week_ending": "2026-09-26",
               "contractor_address": "..."},
    "cwhssa": True,
    "payrollCsv": open("payroll.csv").read(),
    "wageDeterminationCsv": open("wage_determination.csv").read(),
    "apprenticeshipCsv": open("apprenticeship.csv").read(),   # optional
}
r = requests.post(
    "https://www.spreadrun.com/api/v1/wh347-payroll-precheck",
    headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
    json=payload,
    timeout=60,
)
r.raise_for_status()
report = r.json()["report"]
print(report["status"], report["findingCounts"])
for f in report["findings"]:
    print(f["severity"], f["ruleId"], f["path"], f["message"])`;

export function Wh347Sources() {
  return (
    <ul className="small">
      {WH347_SOURCES.map(([label, url]) => <li key={url}><a href={url}>{label}</a></li>)}
    </ul>
  );
}

export default function Wh347Api() {
  return (
    <Layout path={`/apis/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/apis', 'APIs'], [null, 'WH-347 Certified Payroll Pre-Check']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <Badges api={API} style={{ marginBottom: 14 }} />
        <h1>Davis-Bacon WH-347 Certified Payroll Pre-Check</h1>
        <p className="lede" style={{ marginTop: 20 }}>Check a weekly certified payroll before you sign it. Send the payroll and the wage determination rates, and SpreadRun recomputes every row: classifications, basic rates, fringe benefits, overtime, apprentice rates and the gross, deductions and net pay math. You get a PASS, WARN or FAIL report with the row, column, rule and a plain message for every finding.</p>
        <div className="note">
          <p><b>Where this fits.</b> The Department of Labor publishes Form WH-347 and its instructions for free, and using the form itself is optional: any format with the same information works. What nobody does for you is the arithmetic. SpreadRun recomputes the payroll against the wage determination programmatically, from this page or through the API, before the payroll is certified and filed. That is when a short rate or a total that does not add up is cheapest to fix.</p>
        </div>
        <div className="note">
          <p><b>A PASS does not mean the payroll complies with Davis-Bacon requirements.</b> These are structural checks, not legal or compliance advice. The check uses the wage determination rates you send and cannot tell whether they are the right ones, whether workers are classified correctly, or whether fringe plans are bona fide.</p>
        </div>
        <div className="note">
          <p><b>Personal data.</b> Certified payrolls name workers and carry identifying numbers and pay. Under the <a href="/terms">Terms</a>, files sent to this check may contain that data: it is processed in memory only to produce the report and is not stored, and no value from your file is repeated in the report. You confirm you are permitted to share the file with SpreadRun as a service provider. Never send full Social Security numbers: certified payrolls must not include them, and the check flags any that look like one. The sample files on this page are invented.</p>
        </div>
        <div className="btn-row">
          <a className="btn" href="#demo">Check a payroll</a>
          <a className="btn secondary" href="/samples/wh347-pass.xlsx">Download the sample workbook</a>
        </div>
      </div>

      <section className="section wrap split" aria-labelledby="checks">
        <div>
          <h2 id="checks">What it checks</h2>
          <ul className="checklist">
            <li><b>Required WH-347 fields.</b> Project name and number, payroll number, contractor name and address, project location, wage determination number, week ending date, and every per-worker column of the form.</li>
            <li><b>Classifications.</b> Every labor classification on the payroll is on the wage determination you supplied.</li>
            <li><b>Basic rates.</b> The straight time rate paid is at least the basic hourly rate for the classification. Fringe payments cannot make up a shortfall here.</li>
            <li><b>Fringe benefits.</b> Plan credit (6B), cash in lieu (6C) and any cash wage above the basic rate together cover the fringe rate for every hour worked, as 29 CFR 5.31 allows. 6B and 6C match hours times their hourly amounts.</li>
            <li><b>Overtime.</b> No more than 40 straight time hours a week per worker, and overtime paid at no less than one and one-half times the basic rate. A rate under one and one-half times the rate actually paid is a warning.</li>
            <li><b>Apprentices.</b> Registered apprentice rows at their level's percentage of the journeyworker rate, the program's fringe (or the full fringe when the program is silent), and the program ratio on each day of this payroll.</li>
            <li><b>Arithmetic.</b> Daily hours add up to the weekly total, gross pay covers hours times rates, gross for all work is at least gross on this project, deductions add up, and net pay equals gross for all work minus deductions.</li>
            <li><b>Identity.</b> No full Social Security numbers, and one identifying number per worker entry.</li>
          </ul>
          <p>Shortfalls and arithmetic errors are errors and make the report FAIL. Things that need a second look, like a gross amount that does not match either way of computing it, are warnings.</p>
        </div>
        <div>
          <h2>Who it's for</h2>
          <ul>
            <li><b>Contractors and subcontractors:</b> check each week's payroll before the certifying official signs it.</li>
            <li><b>Prime contractors:</b> check subcontractor payrolls as they come in.</li>
            <li><b>Payroll and construction software:</b> run the check from your export, with a structured JSON report.</li>
            <li><b>AI agents and automation:</b> a plain REST endpoint with a file in and JSON out.</li>
          </ul>
          <h3 style={{ marginTop: 24 }}>Not checked</h3>
          <ul className="small">
            <li>Whether the rates you supplied are the right wage determination for the contract, location and dates. There is no live lookup.</li>
            <li>Whether each worker's classification matches the work actually done.</li>
            <li>Hours on other projects for the same contractor, which count toward 40 but are not on this payroll.</li>
            <li>Apprentice registration, and the ratio across the contractor's whole workforce on site.</li>
            <li>Whether fringe plans are bona fide, annualization, and approval of unfunded plans.</li>
            <li>Whether deductions are permitted under 29 CFR part 3, and the signed Statement of Compliance.</li>
          </ul>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="how">
        <h2 id="how">Input and output</h2>
        <ol className="steps">
          <li><h3>Send</h3><p>An .xlsx workbook with Header, Payroll, Wage Determination and optional Apprenticeship sheets, or JSON with the header and the tables as CSV. One row per worker per classification, with daily straight time and overtime hours, as on the WH-347. Up to 4.4 MB.</p></li>
          <li><h3>Recompute</h3><p>Every row against its classification's basic and fringe rates, every worker's week against the overtime rule, and every total against its parts.</p></li>
          <li><h3>Report</h3><p>JSON with <code>status</code> (PASS, WARN or FAIL), <code>findings</code> (severity, ruleId, path such as <code>/payroll/row[3]/st_rate</code>, message, source), and counts of workers, rows, hours and apprentices.</p></li>
        </ol>
        <p className="small">Every column, the JSON format and the full report schema are in the <a href={`/docs/${API.slug}`}>API docs</a>. The <a href="/samples/wh347-pass.xlsx">sample workbook</a> doubles as a template; its rates are invented.</p>
      </section>

      <section className="section wrap" id="demo" aria-labelledby="demo-h">
        <h2 id="demo-h">Try it now</h2>
        <Wh347Demo api={API} sample={example.body.report} />
      </section>

      <section className="section wrap" aria-labelledby="price-h">
        <h2 id="price-h">Pricing</h2>
        <p><b>{dollars(API.priceCents)} per completed report.</b> One weekly payroll, one full report.</p>
        <ul>
          <li>Billed when a report is produced, PASS, WARN or FAIL. Invalid input is never billed: a PDF, a workbook missing a required sheet, JSON without the payroll or the rates.</li>
          <li>Paid from the same prepaid credits as every SpreadRun API, in $5, $20 or $50 packs. A $50 pack covers {Math.floor(5000 / API.priceCents)} weekly checks. Credits never expire. <a href="/apis#pricing">All pricing</a></li>
          <li>Running payrolls for many projects every week? <a href="/contact">Talk to us</a> first so we can tell you honestly whether this fits.</li>
        </ul>
        <div className="btn-row"><a className="btn" href="#demo">Check a payroll</a><a className="btn secondary" href="/account">Get API access</a></div>
      </section>

      <section className="section wrap" aria-labelledby="code-h">
        <h2 id="code-h">Call it from code</h2>
        <p>Columns, the JSON format, rule IDs, error codes and limits are in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={WH347_FAQ} />
        <h3 style={{ marginTop: 28 }}>Sources</h3>
        <Wh347Sources />
        <p className="small" style={{ marginTop: 16 }}>SpreadRun is not affiliated with or endorsed by the Department of Labor. Where this check and the regulations or the wage determination differ, the regulations and the wage determination control.</p>
        <p className="small">More validators: <a href="/apis/pbj-staffing-qa">PBJ Staffing Data Pre-Submission QA</a> | <a href="/apis">the full catalog</a></p>
      </section>
    </Layout>
  );
}
