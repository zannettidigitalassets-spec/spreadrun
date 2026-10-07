import { useEffect, useState } from 'react';
import Badges from '../site/Badges.jsx';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import CodeSample from '../site/CodeSample.jsx';
import { PbjDemo } from '../site/Demo.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import example from '../content/examples/pbj-demo-fail.json';

const API = apiBySlug('pbj-staffing-qa');
// Risk-Based Survey facts (start September 8, 2026; 5-star overall and at least 3-star staffing among the
// qualifying criteria; roughly half the onsite time; about 12% qualify) checked against this memo, October 2026.
const RBS_MEMO = 'https://www.cms.gov/files/document/qso-26-14-nh-revised-2026-09-29.pdf';

// Every fact on this page was checked against the documents linked in PBJ_SOURCES (October 2026).
export const PBJ_SOURCES = [
  ['CMS Staffing Data Submission (PBJ) page: data specifications v4.10.0, Policy Manual v2.8 and FAQ',
    'https://www.cms.gov/medicare/quality/nursing-home-improvement/staffing-data-submission'],
  ['CMS PBJ audit selection criteria, as reported by Skilled Nursing News (November 2018)',
    'https://skillednursingnews.com/2018/11/cms-peels-back-curtain-providers-receive-pbj-audits/'],
  ['CMS Nursing Home Five-Star Quality Rating System: Technical Users\' Guide (September 2026) and cut point tables',
    'https://www.cms.gov/medicare/health-safety-standards/certification-compliance/five-star-quality-rating-system'],
  ['HHS OIG report A-09-24-02005 on RN hours reported in PBJ (June 2026)',
    'https://oig.hhs.gov/reports/all/2026/cmss-processes-were-not-effective-in-ensuring-the-accuracy-of-staffing-information-reported-in-the-payroll-based-journal/'],
];

// PBJ is due by the end of the 45th day after each federal fiscal quarter (11:59 PM Eastern). The page shows the next
// deadline; the build renders the one current at build time and the browser updates the count on load.
const QUARTER_ENDS = [[0, 1, 1], [3, 1, 2], [6, 1, 3], [9, 1, 4]];   // [month index of the day after, day, FY quarter]
export function nextPbjDeadline(now) {
  const y = now.getFullYear();
  const today = Date.UTC(y, now.getMonth(), now.getDate());
  const cands = [];
  for (const yr of [y - 1, y, y + 1]) {
    for (const [m, , fq] of QUARTER_ENDS) {
      const end = Date.UTC(yr, m, 0);                       // last day of the quarter
      const due = end + 45 * 86400000;
      const start = new Date(Date.UTC(yr, m - 3, 1));
      cands.push({ due, end, start, fq, fy: yr });   // the quarter ending Dec 31 of yr - 1 is fiscal yr quarter 1
    }
  }
  const next = cands.filter((c) => c.due >= today).sort((a, b) => a.due - b.due)[0];
  return { ...next, days: Math.round((next.due - today) / 86400000) };
}
const fmt = (ms) => new Date(ms).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' });
const BUILD_DEADLINE = nextPbjDeadline(new Date(Date.UTC(2026, 9, 3)));

export function DeadlineBanner() {
  const [d, setD] = useState(BUILD_DEADLINE);
  const [live, setLive] = useState(false);
  useEffect(() => { setD(nextPbjDeadline(new Date())); setLive(true); }, []);
  return (
    <div className="deadline" role="note">
      <div className="deadline-days">{live ? <><b>{d.days}</b> {d.days === 1 ? 'day' : 'days'} left</> : <b>Next deadline</b>}</div>
      <div>
        <b>{fmt(d.due)}, 11:59 PM Eastern</b> is the CMS deadline for hours from {fmt(d.start)} to {fmt(d.end)} (fiscal {d.fy} quarter {d.fq}).
        {' '}CMS accepts no files after it, and a quarter with no accepted file gets a one-star staffing rating.
      </div>
    </div>
  );
}

export const PBJ_FAQ = [
  ['CMS already validates PBJ files for free. Why pay for this?',
    'You should still upload to CMS: it is free, and its Final File Validation Report in iQIES is the one that counts. The PBJ Policy Manual says that report can take up to 24 hours, and that facilities must leave time to fix errors and resubmit before the deadline. SpreadRun answers in seconds, before you upload, from this page or from code. It also checks things the CMS edits do not, such as dates outside an employee\'s hire and termination dates and duplicate employee IDs, and it flags staffing patterns CMS has documented as audit or rating risks.'],
  ['Does a PASS mean CMS will accept the file?',
    'No. A PASS means the file passed the checks listed on this page. CMS also checks things only its system knows, such as whether your facility ID and each employee ID are on file, and the facility has to confirm acceptance in the Final File Validation Report. These are structural checks, not legal or compliance advice.'],
  ['Does a PASS mean the file will survive a CMS audit?',
    'No. PBJ audits compare reported hours with payroll, invoices and contracts. SpreadRun only sees the XML file, so it cannot tell whether the hours are true. The risk flags point at patterns CMS has named, which is useful, but a file with no flags can still fail an audit.'],
  ['Where do the audit risk flags come from?',
    'Only from what CMS or the HHS Office of Inspector General has published, and each finding names its source. Today that is: individual employees reported at more than 400 hours in a month (a CMS audit selection criterion, reported in 2018), four or more days in the quarter with no RN hours (which brings a one-star staffing rating under the Five-Star Technical Users\' Guide), employee IDs shaped like Social Security Numbers (the Policy Manual says IDs must not contain one), and a replace upload with no hours in it. Numbers that circulate without a CMS or OIG source, such as hour thresholds per quarter, are not used.'],
  ['Which files can I send?',
    `The quarterly PBJ staffing XML file (fileSpecVersion 4.10.0), gzip of it, or the ZIP you upload to CMS, including a ZIP with several XML files. The request limit is 4.4 MB, and a large facility's XML can be bigger than that, so send the ZIP: staffing XML compresses to a few percent of its size. Each XML file inside may be up to 50 MB, the CMS limit. Employee Link (administration) files are not supported yet; they are rejected and not charged.`],
  ['Which quarter and deadline apply right now?',
    'PBJ follows the federal fiscal year. Hours for July 1 to September 30, 2026 are fiscal year 2026 quarter 4, and CMS must receive them by the end of the 45th day after the quarter ends: November 14, 2026, 11:59 PM Eastern Time. CMS accepts no submissions after the deadline. Since August 2026, PBJ files are uploaded in iQIES.'],
  ['Is the staffing data stored?',
    'No. Files are processed in memory for the length of the request and are not stored or shared. PBJ files identify staff by employee ID and contain hire and termination dates and hours worked, which is personal data about your staff. Findings name the location, the rule and the problem, never a value from your file. For billing and usage we log the time, endpoint, result status, upload size and duration, never the file contents.'],
  ['When is a run charged?',
    `When the validator finishes and returns a report, whether it says PASS, WARN or FAIL: ${dollars(API.priceCents)} per report. Requests rejected before a report exists are free: not XML, not a PBJ nursingHomeData file, an Employee Link file, a ZIP with no XML file, or DOCTYPE and entity declarations.`],
  ['How close is the staffing star estimate to the real rating?',
    'It follows the published CMS method (Five-Star Technical Users\' Guide, September 2026): reported nurse hours per resident day, adjusted for case mix, scored with the CMS cut points, plus the three turnover measures, against the 380-point scale. What it cannot match is CMS\'s inputs. CMS takes the census and case mix from MDS assessments and turnover from six quarters of PBJ data. If you send your resident days, case-mix ratio and turnover from your own reports, the estimate is close; leave any out and it shows a range. Either way it is an estimate, not your CMS rating.'],
  ['Why do some dates show as in the future?',
    'CMS rejects any date after the day you upload. The check uses today by default. To check a file as of the day you plan to upload it, pass asOf=YYYY-MM-DD. The count of days without RN hours also stops at that date, so a quarter still in progress is not penalized for days that have not happened.'],
];

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/pbj-staffing-qa" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/zip" \\
  --data-binary @pbj_2026_q4.zip`;

const PY = `import base64, os, requests

with open("pbj_2026_q4.zip", "rb") as f:   # the ZIP you upload to CMS, or the XML file itself
    r = requests.post(
        "https://www.spreadrun.com/api/v1/pbj-staffing-qa",
        headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
        data=f,
        timeout=60,
    )
r.raise_for_status()
data = r.json()
report = data["report"]
print(report["status"], report["findingCounts"])
for f in report["findings"]:
    print(f["severity"], f["ruleId"], f["path"], f["message"])

# Included in every paid report: the one-page brief and the records ZIP
for part in ("auditBrief", "submissionPackage"):
    if data.get(part, {}).get("available"):
        with open(data[part]["filename"], "wb") as out:
            out.write(base64.b64decode(data[part]["base64"]))`;

export function SourceList() {
  return (
    <ul className="small">
      {PBJ_SOURCES.map(([label, url]) => <li key={url}><a href={url}>{label}</a></li>)}
    </ul>
  );
}

export default function PbjApi() {
  return (
    <Layout path={`/apis/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/apis', 'APIs'], [null, 'PBJ Staffing Data Pre-Submission QA']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <Badges api={API} style={{ marginBottom: 14 }} />
        <h1>PBJ Staffing Data Pre-Submission QA</h1>
        <DeadlineBanner />
        <p className="lede" style={{ marginTop: 20 }}>A bad PBJ quarter costs a nursing home a star. Check the staffing file before it goes to CMS and see what CMS will see: every problem with a rule ID and a plain explanation, an estimate of your staffing star rating, and the days left to the deadline.</p>
        <h2 style={{ marginTop: 32 }}>What a bad quarter costs</h2>
        <ul className="costs">
          <li><b>No accepted file by the deadline:</b> a one-star staffing rating for the quarter. CMS accepts nothing after the deadline, and there are no exceptions.</li>
          <li><b>Four or more days with no RN hours</b> while residents were in the building: a one-star staffing rating for the quarter.</li>
          <li><b>A failed or unanswered PBJ audit:</b> a one-star staffing rating for three months. Grouping several agency staff under one ID fails an audit with no reconsideration.</li>
          <li><b>And a one-star staffing rating takes a full star off the overall Care Compare rating.</b></li>
        </ul>
        <p className="small">Sources: CMS Five-Star Technical Users' Guide (September 2026) and the CMS PBJ Policy Manual and FAQ, linked at the bottom of this page.</p>
        <div className="note">
          <p><b>Where this fits.</b> Uploading to CMS is free, and you still have to do it: CMS runs its own edits and posts a Final File Validation Report in iQIES, which the PBJ Policy Manual says can take up to 24 hours to arrive. SpreadRun works above that layer, before you upload. It explains every problem with a rule ID, a location and the CMS document it comes from. It shows what CMS sees: the RN coverage gaps and audit patterns CMS has named, and, if you add your resident days, an estimate of the staffing star rating with the published CMS method. It keeps the deadline in front of you. And each report carries the date and a SHA-256 fingerprint of the exact file checked, so you can keep a record of what was checked before submission. No software to install, no contract, and the test below needs no account.</p>
        </div>
        <div className="note">
          <p><b>A PASS does not mean the filing will survive a CMS audit.</b> These are structural checks, not legal or compliance advice. A PASS does not mean CMS will accept the file either: CMS also checks your facility ID and employee IDs against its own records. PBJ audits compare reported hours with payroll, invoices and contracts, which this validator never sees.</p>
        </div>
        <div className="note">
          <p><b>Personal data.</b> PBJ files identify staff by employee ID and contain hire and termination dates and hours worked. Under the <a href="/terms">Terms</a>, files sent to this validator may contain that data: it is processed in memory only to produce the report and is not stored, and no value from your file is repeated in the report. You confirm you are permitted to share the file with SpreadRun as a service provider. Employee IDs should never be Social Security Numbers; CMS says so too, and the validator flags IDs that look like one. The sample files on this page are invented.</p>
        </div>
        <div className="btn-row">
          <a className="btn" href="#demo">Check a PBJ file</a>
          <a className="btn secondary" href="/account">Get API access</a>
        </div>
      </div>

      <section className="section wrap split" aria-labelledby="checks">
        <div>
          <h2 id="checks">What it checks</h2>
          <h3>1. CMS data specifications (v4.10.0)</h3>
          <ul className="checklist">
            <li><b>Structure.</b> The nursingHomeData root, header, employees and staffingHours sections in the order and with the elements the CMS v4.10.0 XSD defines, and every required element present.</li>
            <li><b>Header.</b> fileSpecVersion 4.10.0 (older versions have been rejected since April 1, 2026), state code, report quarter 1 to 4, federal fiscal year, text lengths and allowed characters.</li>
            <li><b>Allowed values.</b> Job title codes 1 to 40, pay type codes 1 to 3, processType merge or replace, employee ID characters.</li>
            <li><b>Dates and hours.</b> Valid YYYY-MM-DD dates, no work dates in the future, hours from 0 to 22.5 with at most two decimals, and no more than 22.5 hours for one employee on one date across all job titles.</li>
          </ul>
          <p>Every CMS edit is reported with its CMS edit number, as <code>CMS-</code> and the number, at the severity CMS gives it: Fatal edits are errors and make the report FAIL.</p>
          <h3 style={{ marginTop: 24 }}>2. Audit and rating risk flags</h3>
          <ul className="checklist">
            <li><b>Over 400 hours in a month for one employee ID.</b> A CMS audit selection criterion. Often a sign of several agency staff grouped under one ID, which the PBJ FAQ says fails an audit with no reconsideration.</li>
            <li><b>Four or more days with no RN hours.</b> Under the Five-Star Technical Users' Guide, that brings a one-star staffing rating when residents were present.</li>
            <li><b>Employee IDs shaped like a Social Security Number.</b> The Policy Manual says IDs must not contain one.</li>
            <li><b>A replace upload with no hours.</b> It deletes everything already submitted for the quarter.</li>
          </ul>
          <p>Risk flags are warnings, never errors, and each one names its source. No flag is used unless CMS or the OIG published it.</p>
          <h3 style={{ marginTop: 24 }}>3. Internal consistency</h3>
          <ul className="checklist">
            <li><b>Dates inside the quarter.</b> Work dates outside the quarter in the header (CMS skips those records), and hours before an employee's hire date or after their termination date.</li>
            <li><b>Employees.</b> Hours for an employee ID missing from the file's employees section, duplicate employee IDs, termination dates before hire dates.</li>
          </ul>
          <h3 style={{ marginTop: 24 }}>4. See what CMS sees (optional)</h3>
          <ul className="checklist">
            <li><b>Staffing star estimate.</b> Add your resident days for the quarter and the report computes total nurse, RN and weekend hours per resident day from the file, scores them with the CMS cut points, and gives an estimated staffing star rating or range. Add your case-mix ratio and turnover to narrow it. Always labelled as an estimate, not your CMS rating.</li>
            <li><b>Deadline.</b> Every report names the CMS deadline for the file's quarter and the days left.</li>
          </ul>
        </div>
        <div>
          <h2>Who it's for</h2>
          <ul>
            <li><b>Nursing home operators:</b> check the quarter's file before upload, with time left to fix it.</li>
            <li><b>Multi-facility groups:</b> check every building's file from one script.</li>
            <li><b>Payroll and scheduling vendors:</b> test a PBJ export in CI with a structured JSON report.</li>
            <li><b>AI agents and automation:</b> a plain REST endpoint with a file in and JSON out.</li>
          </ul>
          <h3 style={{ marginTop: 24 }}>Not checked</h3>
          <ul className="small">
            <li>Whether hours match payroll, invoices or contracts. That is what PBJ audits test, and only your records can answer it. The OIG found 45 of 100 sampled nursing homes reported RN hours that their records did not support (March 2024 data, report A-09-24-02005).</li>
            <li>Whether your facility ID and employee IDs are on file with CMS (CMS edits -3693 and -4016 need the CMS system). Hours for an ID that is not in the file's own employees section are flagged.</li>
            <li>Whether hours were worked onsite and whether the 30-minute meal break was deducted. The file has no shift times or locations.</li>
            <li>Your actual CMS staffing rating. CMS takes census and case mix from MDS and turnover from six quarters of PBJ; the estimate uses the numbers you send.</li>
            <li>Employee Link (administration) files, and ZIP and file naming rules.</li>
          </ul>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="rbs-h">
        <div className="calc-result">
          <h2 id="rbs-h" style={{ marginTop: 0 }}>Your staffing star just got more valuable</h2>
          <p>On September 8, CMS rolled out Risk-Based Surveys. Qualifying facilities get a streamlined inspection at roughly half the onsite time. The gate includes a 5-star overall rating and a staffing rating of at least 3 stars, and that staffing rating is built from the PBJ data you submit. CMS estimated about 12% of homes would qualify. A failed PBJ staffing data audit takes you out of the running entirely. Eligibility can shift, but the data is yours to check before the November 14 deadline. <a href="#demo">See the staffing picture CMS sees.</a></p>
          <p className="small muted" style={{ marginBottom: 0 }}>Source: <a href={RBS_MEMO}>CMS QSO-26-14-NH, Nursing Home Risk-Based Survey National Implementation (revised September 29, 2026)</a>.</p>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="how">
        <h2 id="how">Input and output</h2>
        <ol className="steps">
          <li><h3>Send</h3><p>POST the PBJ staffing XML file, a gzip of it, or the upload ZIP as the request body. Up to 4.4 MB per request; inside a ZIP, each XML file may be up to 50 MB. The whole file is checked: no sampling.</p></li>
          <li><h3>Validate</h3><p>Structure and allowed values from the CMS v4.10.0 specifications, then daily and monthly totals, quarter coverage and the risk patterns.</p></li>
          <li><h3>Report</h3><p>JSON with <code>status</code> (PASS, WARN or FAIL), <code>findings</code> (severity, ruleId, XPath-style path, message, source), the reporting quarter, counts of employees, days and hours, days with and without RN hours, the deadline, and the staffing estimate when you send a census.</p></li>
        </ol>
        <p className="small">Full request and report schema in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
      </section>

      <section className="section wrap" id="demo" aria-labelledby="demo-h">
        <h2 id="demo-h">Try it now</h2>
        <p className="small">Not ready for the full check? Try the free <a href="/tools/pbj-preflight-checks">PBJ pre-flight checkers</a> first: count zero-RN days and work out meal break deductions in your browser.</p>
        <PbjDemo api={API} sample={example.body.report} />
      </section>

      <section className="section wrap" aria-labelledby="price-h">
        <h2 id="price-h">Pricing</h2>
        <p><b>{dollars(API.priceCents)} per completed report.</b> One upload, one full report, even when the ZIP holds several XML files.</p>
        <ul>
          <li>Every paid report also comes with a one-page <b>PBJ Star &amp; Audit-Risk Brief</b> (the projected staffing star, always labelled an estimate, and the top audit-risk patterns the run found, each with a fix) and a <b>records ZIP</b> holding the brief, your file exactly as uploaded and a README. Same price, one charge. The free demo does not include them.</li>
          <li>Billed when a report is produced, PASS, WARN or FAIL. Invalid input is never billed: not XML, not a PBJ file, an Employee Link file, a ZIP with no XML.</li>
          <li>Paid from the same prepaid credits as every SpreadRun API, in $5, $20, $50, $100, $250 or $500 packs. A $50 pack covers {Math.floor(5000 / API.priceCents)} reports. Credits never expire. <a href="/apis#pricing">All pricing</a></li>
          <li>Checking files for many buildings every quarter? <a href="/contact">Talk to us</a> first so we can tell you honestly whether this fits.</li>
        </ul>
        <div className="btn-row"><a className="btn" href="#demo">Check a PBJ file</a><a className="btn secondary" href="/account">Get API access</a></div>
      </section>

      <section className="section wrap" aria-labelledby="code-h">
        <h2 id="code-h">Call it from code</h2>
        <p>Parameters, the report format, rule IDs, error codes and limits are in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={PBJ_FAQ} />
        <h3 style={{ marginTop: 28 }}>Sources</h3>
        <SourceList />
        <p className="small" style={{ marginTop: 16 }}>SpreadRun is not affiliated with or endorsed by CMS. Where this validator and the CMS PBJ data specifications differ, the CMS specifications control.</p>
        <p className="small">More validators: <a href="/apis/hospital-mrf-validator">Hospital MRF Validator</a> | <a href="/apis">the full catalog</a></p>
      </section>
    </Layout>
  );
}
