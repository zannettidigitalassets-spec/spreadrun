import Badges from '../site/Badges.jsx';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import CodeSample from '../site/CodeSample.jsx';
import HcrisDemo from '../site/HcrisDemo.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import example from '../content/examples/hcris-demo-fail.json';

const API = apiBySlug('hcris-preaudit-qa');
const ECFR = 'https://www.ecfr.gov/current/title-42/section-';

// Every fact on this page was checked against these documents on October 8, 2026. Left out for lack of a primary
// source we could read: an OIG audit figure, a reported S-10 audit reduction at one hospital, HFMA chapter decks and
// outside preparation prices. No hospital count: "thousands" only.
export const HCRIS_SOURCES = [
  ['42 CFR 413.24(f)(2): due dates for cost reports', `${ECFR}413.24`],
  ['42 CFR 413.24(f)(5): an acceptable cost report submission, the listings it needs and the ECR Specifications Manual', `${ECFR}413.24`],
  ['42 CFR 413.89: bad debts, charity and courtesy allowances, including the 120-day collection effort', `${ECFR}413.89`],
  ['CMS Pub. 15-2, chapter 40 (Form CMS-2552-10), Transmittal 26, June 30, 2026: worksheet instructions, Exhibits 2A, 3B and 3C, and the ECR specifications in section 4095', 'https://www.cms.gov/medicare/regulations-guidance/transmittals/2026-transmittals/r26p240i'],
  ['CMS electronic cost report exhibit templates and specifications for Exhibits 2A, 3B and 3C', 'https://www.cms.gov/medicare/audits-compliance/part-a-cost-report/electronic-cost-report-exhibit-templates'],
  ['CMS Healthcare Cost Report Information System (HCRIS) cost report data, used for the test corpus', 'https://www.cms.gov/data-research/statistics-trends-and-reports/cost-reports'],
];

export const HCRIS_FAQ = [
  ['Does a PASS mean the MAC will accept the cost report, or that the amounts are allowable?',
    'No to both. A PASS means the ECR file is in the CMS format, the worksheets tie, S-10 recomputes and the listings support what the report claims. A PASS is not MAC acceptance and does not determine allowability or payment. The MAC runs its own edits, desk review and audit, and the amounts you claim remain your responsibility.'],
  ['What do I send?',
    'The ECR file your cost report software exports for MCReF, and the listings that support it: Exhibit 2A for Medicare bad debts (inpatient and outpatient), Exhibit 3B for charity care and Exhibit 3C for total bad debts, in the CMS template layout as .xlsx or as .csv in the same grid. Zip them together, or pick them all in the form and the browser zips them. Add last year\'s listings to the same .zip and the check also looks for accounts claimed again.'],
  ['What about patient information in the listings?',
    'Remove it first. The check refuses a listing with anything in the patient name columns, the MBI column or the Medicaid number column, before a report exists and without a charge. Put Y in the Medicaid number column for a dual eligible beneficiary. The checks need dates, amounts and a consistent account reference, so you can also replace account numbers with your own reference, as long as each account keeps the same one. Reports show an account by its last four characters only.'],
  ['What does it recompute?',
    'Worksheet B, Part I, column 0 against Worksheet A, column 7, line by line; the step-down total on Worksheet B; Worksheet B, column 26 into Worksheet C, column 1; Worksheet C totals, line 202 and total charges; Worksheet D, Part V into Worksheet E, Part B, line 1; the 35 percent bad debt reduction on Worksheet E; and every line of Worksheet S-10 that is a calculation, including lines 27 and 27.01 against Worksheet E and the other worksheets the instructions name. Each finding gives the worksheet, line, column, expected and actual.'],
  ['Which listings does it expect?',
    'The ones the cost report itself calls for. Medicare bad debts on Worksheet E need Exhibit 2A; charity care on S-10, line 20 needs Exhibit 3B; bad debts on S-10, line 26 need Exhibit 3C. A cost report filed without the bad debt or charity care listings that correspond to the amounts claimed is rejected and treated as if it had never been filed (42 CFR 413.24(f)(5)). Each listing must add up to the line it supports.'],
  ['Which bad debt rules does it check?',
    'From 42 CFR 413.89 and the Exhibit 2A instructions: the account written off inside the cost reporting period, at least 120 days of collection effort after the first bill, the first bill within 120 days of the remittance advice, the allowable amount no larger than the deductible and coinsurance less payments and recoveries, the Medicaid remittance date for dual eligible beneficiaries, and the order of the write-off dates. Indigent and dual eligible beneficiaries follow their own rules and are not held to the 120 days.'],
  ['Which version of the specifications is it checked against?',
    'CMS Pub. 15-2, chapter 40, Transmittal 26 (June 30, 2026), with ECR specification 2026181. Every report prints it. A file built to an older specification than the one in effect for its period end gets a warning. This version checks cost reporting periods beginning on or after October 1, 2022, the periods that use Exhibits 2A, 3B and 3C.'],
  ['When is the cost report due?',
    'On or before the last day of the fifth month after the period ends: a June 30 year end is due November 30, a December 31 year end May 31. A period that ends mid-month is due 150 days later. Extensions are granted only for extraordinary circumstances beyond your control, such as a flood or fire (42 CFR 413.24(f)(2)). Past the date, the report warns and still checks the rest.'],
  ['When is a run charged?',
    `When the pre-audit finishes and returns a report, whether it says PASS, WARN or FAIL: ${dollars(API.priceCents)} per completed pre-audit. Requests rejected before a report exists are free, such as a file that is not an ECR file, a package over 4 MB, a missing period, or a listing with patient identifiers.`],
  ['Can I try it for free?',
    'Yes, on the two sample packages on this page: a clean cost report with its listings, and the same report with planted errors. The ECR file in both carries the amounts of a real cost report from the CMS HCRIS dataset with the hospital\'s name, address and CCN replaced; the listings are invented. They run free, up to 10 times a day. Your own cost report is the paid pre-audit: sign in with enough credit and run it from the same form, or call the API.'],
];

const CURL = `cd cost_report_fy2025 && zip ../package.zip ECnnnnnn.25A1 MedicareBD_IP.xlsx MedicareBD_OP.xlsx Charity.xlsx TotalBD.xlsx
curl -X POST "https://www.spreadrun.com/api/v1/hcris-preaudit-qa?periodStart=2024-07-01&periodEnd=2025-06-30" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/zip" \\
  --data-binary @../package.zip`;

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
print(report["status"], report["checkedAgainst"]["transmittal"], report["deadline"]["due"])
for f in report["findings"]:
    print(f["severity"], f.get("worksheet") or f.get("exhibit"), f.get("line") or f.get("row"),
          f.get("expected"), f.get("actual"), f["message"])`;

export function HcrisSources() {
  return <ul className="small">{HCRIS_SOURCES.map(([label, url], i) => <li key={i}><a href={url}>{label}</a></li>)}</ul>;
}

export default function HcrisApi() {
  return (
    <Layout path={`/apis/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/apis', 'APIs'], [null, 'Medicare Cost Report Pre-Audit QA']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <Badges api={API} style={{ marginBottom: 14 }} />
        <h1>Medicare Cost Report Pre-Audit QA</h1>
        <p className="lede" style={{ marginTop: 20 }}>Check a hospital's Medicare cost report (Form CMS-2552-10) the way the deterministic part of a MAC review checks it, before you file. Send the ECR file and the bad debt and charity care listings. You get back every record that breaks the CMS file format, every worksheet tie that does not hold, every S-10 line that does not recompute, every listing problem and the filing deadline, each with the worksheet, line, column, and the expected and actual amounts.</p>
        <h2 style={{ marginTop: 32 }}>Why it matters</h2>
        <ul className="costs">
          <li><b>Missing listings mean a rejected report.</b> A cost report without a bad debt listing that matches the bad debt claimed, or without the charity care listing that supports S-10, is rejected and treated as if it had never been filed (42 CFR 413.24(f)(5)).</li>
          <li><b>Bad debt has hard rules.</b> Only unpaid deductible and coinsurance, billed within 120 days of the remittance advice, after at least 120 days of collection effort, written off in the period it is claimed (42 CFR 413.89).</li>
          <li><b>The clock is five months.</b> Due on the last day of the fifth month after the period ends, with extensions only for extraordinary circumstances (42 CFR 413.24(f)(2)).</li>
        </ul>
        <p className="small">Sources: the regulations and CMS instructions linked at the bottom of this page.</p>
        <div className="note">
          <p><b>A pre-audit math check, not a determination.</b> This checks the format, the arithmetic, the ties and the listings. It does not judge cost finding choices or allowability. A PASS is not MAC acceptance and does not determine allowability or payment.</p>
        </div>
        <div className="btn-row">
          <a className="btn" href="#demo">Pre-audit a cost report</a>
          <a className="btn secondary" href="/samples/hcris-sample-clean.zip">Download a sample package</a>
        </div>
      </div>

      <section className="section wrap split" aria-labelledby="checks">
        <div>
          <h2 id="checks">What it checks</h2>
          <ul className="checklist">
            <li><b>The ECR file.</b> Record types 1 to 4 and the level 1 edits of the CMS ECR specifications: record length, upper case, unique record identifiers, line feeds, the CCN, the Julian dates and the period, plus the specification date.</li>
            <li><b>Worksheet ties.</b> A to B, the B step-down, B to C, the C totals and charges, D Part V to E Part B, and the bad debt reduction on E.</li>
            <li><b>Worksheet S-10.</b> The cost-to-charge ratio from Worksheet C, then lines 7 to 31 recomputed, lines 27 and 27.01 tied to Worksheet E, and the S-10 edits.</li>
            <li><b>Listings present.</b> Exhibit 2A when Medicare bad debts are claimed, 3B for S-10 charity care, 3C for S-10 bad debts.</li>
            <li><b>Listings correct.</b> Totals that match the worksheets, no duplicate accounts, write-offs inside the period, the 120-day rules, bad debt within deductible and coinsurance, and no physician or professional charges counted.</li>
            <li><b>Prior years.</b> Accounts already claimed, when last year's listings are in the package.</li>
            <li><b>The deadline.</b> Five months after the period ends, or 150 days for a mid-month end.</li>
          </ul>
          <p>Every report prints the transmittal and ECR specification it was checked against.</p>
        </div>
        <div>
          <h2>Who it's for</h2>
          <p>Thousands of hospitals file a Medicare cost report every year.</p>
          <ul>
            <li><b>Hospital reimbursement and finance teams:</b> find the rejections and the arithmetic before the MAC does.</li>
            <li><b>Reimbursement consultants and preparers:</b> a consistent last pass on every client's file.</li>
            <li><b>DSH hospitals:</b> S-10 and its listings, line by line, against each other.</li>
          </ul>
          <h3 style={{ marginTop: 24 }}>Not checked</h3>
          <ul className="small">
            <li>Whether any cost, bad debt or charity care is allowable, or what Medicare will pay.</li>
            <li>Statistics, allocation bases, reclassifications and adjustments, taken as filed.</li>
            <li>Collection documentation, indigence files and Medicaid remittances behind the listings.</li>
            <li>The type 4 encryption code itself, which only approved vendor software produces.</li>
            <li>Cost reporting periods beginning before October 1, 2022, and packages over 4 MB.</li>
          </ul>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="how">
        <h2 id="how">Input and output</h2>
        <ol className="steps">
          <li><h3>Send</h3><p>A .zip with the ECR file and the listings (or the ECR file alone) as the request body, up to 4 MB, with <code>periodStart</code>, <code>periodEnd</code> and optionally <code>asOf</code> (YYYY-MM-DD) in the query string.</p></li>
          <li><h3>Check</h3><p>Every rule on this page. Standard library code, no network calls, nothing stored.</p></li>
          <li><h3>Report</h3><p>JSON with <code>status</code>, <code>checkedAgainst</code>, <code>deadline</code>, <code>checks</code>, <code>listings</code> and <code>findings</code> (worksheet, line, column or listing row, expected, actual, message, source).</p></li>
        </ol>
        <p className="small">Every field and rule ID is in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
      </section>

      <section className="section wrap" id="demo" aria-labelledby="demo-h">
        <h2 id="demo-h">Try it now</h2>
        <p>The sample packages run free. Your own cost report runs as a paid pre-audit at {dollars(API.priceCents)} from your credit.</p>
        <HcrisDemo api={API} sample={example.body.report} />
      </section>

      <section className="section wrap" aria-labelledby="price-h">
        <h2 id="price-h">Pricing</h2>
        <p><b>{dollars(API.priceCents)} per completed pre-audit.</b> One cost report, its listings, one full report.</p>
        <ul>
          <li>Billed when a report is produced, PASS, WARN or FAIL. Invalid input is never billed.</li>
          <li>Paid from the same prepaid credits as every SpreadRun API, in $5, $20, $50, $100, $250 or $500 packs. A $250 pack covers {Math.floor(25000 / API.priceCents)} {Math.floor(25000 / API.priceCents) === 1 ? 'pre-audit' : 'pre-audits'} and a $500 pack covers {Math.floor(50000 / API.priceCents)}. Credits never expire. <a href="/apis#pricing">All pricing</a></li>
          <li>Preparing cost reports for many hospitals? <a href="/contact">Talk to us</a> first so we can tell you honestly whether this fits.</li>
        </ul>
        <div className="btn-row"><a className="btn" href="#demo">Pre-audit a cost report</a><a className="btn secondary" href="/account">Get API access</a></div>
      </section>

      <section className="section wrap" aria-labelledby="code-h">
        <h2 id="code-h">Call it from code</h2>
        <p>Parameters, report fields, rule IDs, error codes and limits are in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={HCRIS_FAQ} />
        <h3 style={{ marginTop: 28 }}>Sources</h3>
        <HcrisSources />
        <p className="small" style={{ marginTop: 16 }}>SpreadRun is not affiliated with or endorsed by CMS or any Medicare Administrative Contractor. Where this check and the regulations or CMS instructions differ, they control.</p>
        <p className="small">More validators: <a href="/apis/pbj-staffing-qa">PBJ Staffing Data Pre-Submission QA</a> | <a href="/apis/hospital-mrf-validator">Hospital Price Transparency MRF Validator</a> | <a href="/apis">the full catalog</a></p>
      </section>
    </Layout>
  );
}
