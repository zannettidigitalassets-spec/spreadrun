import Badges from '../site/Badges.jsx';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import CodeSample from '../site/CodeSample.jsx';
import IceDemo from '../site/IceDemo.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import example from '../content/examples/ice-demo-fail.json';

const API = apiBySlug('ice-adequacy-precheck');
const ECFR = 'https://www.ecfr.gov/current/title-48/section-';
export const DCAA_CHECKLIST = 'https://www.dcaa.mil/Portals/88/Documents/Checklists%20and%20Tools/Incurred%20Cost/Checklist%20for%20Determining%20Adequacy%20of%20Contractor%20Incurred%20Cost%20Proposal.pdf?ver=MIc1RgbjQ97S5M7FPXAAlg%3d%3d';

// Every fact on this page was checked against these documents on October 7, 2026. Left out for lack of a primary
// source: a reported 16.2 percent rate decrement and $5 million disallowance, and market prices for outside reviews.
export const ICE_SOURCES = [
  ['FAR 52.216-7(d)(2): the 6-month deadline and the content of an adequate proposal, items (A) to (O)', `${ECFR}52.216-7`],
  ['FAR 42.703-2: certificate of indirect costs, and unilateral rates without it', `${ECFR}42.703-2`],
  ['FAR 52.242-4: Certification of Final Indirect Costs (signing level and format)', `${ECFR}52.242-4`],
  ['FAR 42.705-1(b)(1): the adequacy review and written description of inadequacies', `${ECFR}42.705-1`],
  ['DCAA Checklist for Determining Adequacy of Contractor Incurred Cost Proposal, Version 3.4 (December 2021)', DCAA_CHECKLIST],
  ['DCAA ICE Model: Power Query version 1.08 (July 2026) and Visual Basic version 2.0.1h', 'https://www.dcaa.mil/Checklists-Tools/ICE-Model/'],
  ['GAO-13-131: DOD initiative to address the audit backlog (December 2012)', 'https://www.gao.gov/products/GAO-13-131'],
];

export const ICE_FAQ = [
  ['Does a PASS mean DCAA will find the submission adequate, or that the costs are allowable?',
    'No to both. A PASS means every required schedule was found, the math foots, the schedules tie and the certificate is there. Adequacy is not allowability: whether a cost is allowable under FAR Part 31 is judgment, and DCAA audits it after adequacy. DCAA makes its own adequacy determination, and the costs you claim remain your responsibility.'],
  ['Do we have to use the DCAA ICE model?',
    'No. DCAA\'s own checklist allows your internal reports in place of its example schedules. This check reads any .xlsx workbook: it finds each schedule by tab name (A, "Schedule B", "Sch C"), by a sheet title such as "Schedule D", or by what the title describes, and reads the columns by their headings. A schedule it cannot identify is reported as missing, with what it looked for.'],
  ['What does it recompute?',
    'Every total row on every schedule, from the rows above it, including subtotals by pool, contract type or contract; claimed amounts as books plus adjustments; each rate on Schedule A as pool divided by base; indirect expense on Schedule H at the Schedule A rates; and labor on Schedule K as rate times hours. It reads the values Excel saved, never the formulas, and recomputes them. A formula with no saved value is flagged, because its result cannot be checked.'],
  ['Which ties does it check?',
    'Schedule A pools to the totals on Schedules B, C and D; Schedule A bases to Schedules D and E; the cost of money bases on Schedule F to Schedule A; claimed direct costs on Schedule G to Schedule H; direct labor on Schedule L to Schedule H; current-year claimed costs on Schedule I to Schedule H (cost-type) and Schedule K (T&M); T&M contracts on Schedule H to Schedule K; and contracts marked physically complete on Schedule I to Schedule O. A tie that fails is reported on both tabs.'],
  ['What about the DCAA checklist items it cannot check?',
    'Each of the 47 items in DCAA\'s checklist (Version 3.4) is listed in the report as Pass, Fail, Review or Not applicable. About half need documents or judgment outside the workbook, such as the billing detail each contract requires or prior-year settled costs, and are marked Review by hand.'],
  ['When is it due?',
    'Within 6 months after the end of your fiscal year (FAR 52.216-7(d)(2)(i)). A December 31 year end is due June 30. Extensions are for exceptional circumstances, requested and granted in writing. Past the date, the report warns and still checks the rest.'],
  ['Is my workbook stored?',
    'No. It is processed in memory for the length of the request and is not stored or shared. The report names tabs and cells and shows amounts, and never repeats names, addresses, contract numbers or other text from the workbook. For billing and usage we log the time, endpoint, result status, size and duration, never the contents.'],
  ['When is a run charged?',
    `When the pre-check finishes and returns a report, whether it says PASS, WARN or FAIL: ${dollars(API.priceCents)} per completed pre-check. Requests rejected before a report exists are free, such as an .xls file, a file over 4 MB, a missing fiscal year end, or a workbook too large to finish in time.`],
  ['Can I try it for free?',
    'Yes, on the three sample workbooks on this page: a complete submission in the DCAA layout, the same submission in a contractor\'s own format, and one with planted errors. They run free, up to 10 times a day. Your own workbook is the paid pre-check: sign in with enough credit and run it from the same form, or call the API.'],
];

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/ice-adequacy-precheck?fiscalYearEnd=2025-12-31" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" \\
  --data-binary @incurred_cost_fy2025.xlsx`;

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
print(report["status"], report["deadline"]["due"], report["schedulesMissing"])
for f in report["findings"]:
    print(f["severity"], f["tab"], f["range"], f.get("expected"), f.get("actual"), f["message"])`;

export function IceSources() {
  return <ul className="small">{ICE_SOURCES.map(([label, url]) => <li key={url}><a href={url}>{label}</a></li>)}</ul>;
}

export default function IceApi() {
  return (
    <Layout path={`/apis/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/apis', 'APIs'], [null, 'Incurred Cost Submission Adequacy Pre-Check']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <Badges api={API} style={{ marginBottom: 14 }} />
        <h1>Incurred Cost Submission Adequacy Pre-Check</h1>
        <p className="lede" style={{ marginTop: 20 }}>Check your annual incurred cost submission the way DCAA checks it for adequacy, before you send it. Upload the workbook, in the DCAA ICE model or your own format. You get back every missing schedule, every total that does not foot, every schedule that does not tie to another, the certificate, and the deadline, each with the tab, the cell, and the expected and actual amounts.</p>
        <h2 style={{ marginTop: 32 }}>Why it matters</h2>
        <ul className="costs">
          <li><b>An inadequate proposal comes back.</b> The auditor sends the contractor and contracting officer a written description of the inadequacies, and unresolved ones go to the contracting office (FAR 42.705-1). GAO describes DCAA finding proposals inadequate when they are not certified or contain math errors, and asking for them to be revised and resubmitted.</li>
          <li><b>No certificate, no agreement.</b> A proposal is not accepted without the certificate of final indirect costs, and the contracting officer may set rates unilaterally, low enough that unallowable costs are not reimbursed (FAR 42.703-2).</li>
          <li><b>The clock is 6 months.</b> An adequate proposal is due within 6 months after your fiscal year ends, with extensions only in writing for exceptional circumstances (FAR 52.216-7).</li>
        </ul>
        <p className="small">Sources: the FAR sections, DCAA's adequacy checklist and GAO-13-131, linked at the bottom of this page.</p>
        <div className="note">
          <p><b>Adequacy, not allowability.</b> This checks that the submission is complete and that its math and ties are right. It does not decide whether any cost is allowable under FAR Part 31, a PASS is not DCAA acceptance, and the costs you claim remain your responsibility.</p>
        </div>
        <div className="btn-row">
          <a className="btn" href="#demo">Pre-check a submission</a>
          <a className="btn secondary" href="/samples/ice-own-format-clean.xlsx">Download a sample workbook</a>
        </div>
      </div>

      <section className="section wrap split" aria-labelledby="checks">
        <div>
          <h2 id="checks">What it checks</h2>
          <ul className="checklist">
            <li><b>All 15 schedules.</b> A through O, the content FAR 52.216-7(d)(2)(iii) requires, found by tab name, sheet title or content. A schedule marked "None" or "Not applicable" counts as present.</li>
            <li><b>Every total.</b> Recomputed from the rows above it, including subtotals by pool, contract type or contract, and claimed amounts as books plus adjustments.</li>
            <li><b>Schedule A rates.</b> Each rate is the pool divided by the base, at the precision shown.</li>
            <li><b>The ties.</b> A to B, C, D, E and F; G and L to H; I to H and K; H to K; I to O. A tie that fails is reported on both tabs.</li>
            <li><b>Rates applied.</b> Indirect expense on Schedule H at the Schedule A rates, and T&amp;M labor on Schedule K as rate times hours.</li>
            <li><b>The certificate.</b> Present, completed, and signed at vice president or CFO level or higher (FAR 52.242-4).</li>
            <li><b>Explanatory notes</b> beside every adjustment on Schedules B, C, D and G.</li>
            <li><b>The deadline.</b> Fiscal year end plus 6 months.</li>
          </ul>
          <p>Every report ends with DCAA's 47-item adequacy checklist, each item Pass, Fail, Review or Not applicable.</p>
        </div>
        <div>
          <h2>Who it's for</h2>
          <ul>
            <li><b>Contractors with cost-type, T&amp;M or other flexibly priced contracts:</b> find the inadequacies before the auditor does.</li>
            <li><b>Government contracts accountants and consultants:</b> a consistent first pass on every client's workbook.</li>
            <li><b>Finance teams that build their own schedules:</b> no need to rebuild them in the DCAA model.</li>
          </ul>
          <h3 style={{ marginTop: 24 }}>Not checked</h3>
          <ul className="small">
            <li>Whether any cost is allowable, allocable or reasonable under FAR Part 31.</li>
            <li>Whether the workbook matches your books, payroll and billing system.</li>
            <li>Checklist items that need documents outside the workbook, marked Review by hand.</li>
            <li>The signature itself, which lives on the signed copy you submit.</li>
            <li>.xls files (save as .xlsx) and workbooks over 4 MB.</li>
          </ul>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="how">
        <h2 id="how">Input and output</h2>
        <ol className="steps">
          <li><h3>Send</h3><p>The .xlsx workbook as the request body, up to 4 MB, with <code>fiscalYearEnd</code> and optionally <code>asOf</code> (both YYYY-MM-DD) in the query string.</p></li>
          <li><h3>Check</h3><p>Every rule on this page, on the values Excel saved. No network calls, nothing stored.</p></li>
          <li><h3>Report</h3><p>JSON with <code>status</code>, <code>deadline</code>, <code>checks</code>, <code>schedules</code> (where each was found), <code>findings</code> (tab, range, expected, actual, message, source) and <code>checklist</code> (all 47 DCAA items).</p></li>
        </ol>
        <p className="small">Every field and rule ID is in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
      </section>

      <section className="section wrap" id="demo" aria-labelledby="demo-h">
        <h2 id="demo-h">Try it now</h2>
        <p>The sample workbooks run free. Your own workbook runs as a paid pre-check at {dollars(API.priceCents)} from your credit.</p>
        <IceDemo api={API} sample={example.body.report} />
      </section>

      <section className="section wrap" aria-labelledby="price-h">
        <h2 id="price-h">Pricing</h2>
        <p><b>{dollars(API.priceCents)} per completed pre-check.</b> One workbook, every schedule, one full report.</p>
        <ul>
          <li>Billed when a report is produced, PASS, WARN or FAIL. Invalid input is never billed.</li>
          <li>Paid from the same prepaid credits as every SpreadRun API, in $5, $20, $50, $100, $250 or $500 packs. A $250 pack covers {Math.floor(25000 / API.priceCents)} {Math.floor(25000 / API.priceCents) === 1 ? 'pre-check' : 'pre-checks'} and a $500 pack covers {Math.floor(50000 / API.priceCents)}. Credits never expire. <a href="/apis#pricing">All pricing</a></li>
          <li>Preparing submissions for many clients? <a href="/contact">Talk to us</a> first so we can tell you honestly whether this fits.</li>
        </ul>
        <div className="btn-row"><a className="btn" href="#demo">Pre-check a submission</a><a className="btn secondary" href="/account">Get API access</a></div>
      </section>

      <section className="section wrap" aria-labelledby="code-h">
        <h2 id="code-h">Call it from code</h2>
        <p>Parameters, report fields, rule IDs, error codes and limits are in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={ICE_FAQ} />
        <h3 style={{ marginTop: 28 }}>Sources</h3>
        <IceSources />
        <p className="small" style={{ marginTop: 16 }}>SpreadRun is not affiliated with or endorsed by DCAA, DCMA or the Department of Defense. Where this check and the FAR or DCAA guidance differ, they control.</p>
        <p className="small">More validators: <a href="/apis/sca-hw-fringe-checker">SCA Health and Welfare Fringe Checker</a> | <a href="/apis">the full catalog</a></p>
      </section>
    </Layout>
  );
}
