import Layout, { Crumbs } from '../site/Layout.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import coverage from '../content/uad-coverage.json';
import { DEADLINE_GUIDES, SRC, deadlineGuideBySlug } from '../content/deadline-guides.js';

// Every statement of fact on these pages is tied to a primary source next to it (see SRC in
// src/content/deadline-guides.js, checked October 5, 2026). Claims we could not source were cut, not softened:
// see REBUILD_NOTES.md.

const PBJ = apiBySlug('pbj-staffing-qa');
const UAD = apiBySlug('uad-36-appraisal-validator');
const PBJ_API = `/apis/${PBJ.slug}`;
const UAD_API = `/apis/${UAD.slug}`;
const PREFLIGHT = '/tools/pbj-preflight-checks';

// "(Source: title, where)" with the title linked to the document.
function Cite({ k, at }) {
  const [label, url] = SRC[k];
  return <span className="small muted"> (Source: <a href={url}>{label}</a>{at ? `, ${at}` : ''}.)</span>;
}

const Rule = ({ children }) => <code>{children}</code>;
const Quote = ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--line)', margin: '12px 0', padding: '4px 0 4px 14px' }}>{children}</blockquote>;

function PbjCta({ scanner }) {
  return (
    <div className="note" style={{ marginTop: 32 }}>
      {scanner && <p><b>Count your zero-RN days now, free.</b> The <a href={PREFLIGHT}>Zero-RN Day Scanner</a> takes your daily RN hours and tells you how many days in the quarter had none. It runs in your browser and nothing is uploaded. <a href={PREFLIGHT}>Open the scanner</a></p>}
      <p><b>Check the whole PBJ file before November 14.</b> The <a href={PBJ_API}>PBJ Staffing Data Pre-Submission QA</a> checks your XML against the CMS v4.10.0 specifications and flags the staffing patterns CMS has named as rating or audit risks, including four or more days with no RN hours. {dollars(PBJ.priceCents)} per report, with a free test on the page. <a href={`${PBJ_API}#demo`}>Check a PBJ file</a></p>
      <p className="small" style={{ marginTop: 8 }}>A PASS is not CMS acceptance. iQIES runs its own checks, and CMS calculates the star rating.</p>
    </div>
  );
}

function UadCta() {
  return (
    <div className="note" style={{ marginTop: 32 }}>
      <p><b>Check the whole report before it goes back.</b> The <a href={UAD_API}>SpreadRun UAD 3.6 validator</a> runs the delivery specification checks and {coverage.rulesImplemented} of the {coverage.rulesTotal} published URAR compliance rules on your XML or ZIP, and lists every finding with its rule ID and where it is. {dollars(UAD.priceCents)} per completed report from prepaid credits, with a free test on the page. <a href={`${UAD_API}#demo`}>Check a report</a></p>
      <p className="small" style={{ marginTop: 8 }}>A PASS is not UCDP acceptance. UCDP also runs rules the validator does not, plus GSE proprietary and system checks.</p>
    </div>
  );
}

function Sources({ g }) {
  return (
    <section style={{ marginTop: 32 }} aria-labelledby="src-h">
      <h2 id="src-h">Sources</h2>
      <ul className="small">{g.sources.map((k) => <li key={k}><a href={SRC[k][1]}>{SRC[k][0]}</a></li>)}</ul>
      <p className="small muted">Checked October 5, 2026. SpreadRun is not affiliated with or endorsed by {g.family === 'pbj' ? 'CMS' : 'Fannie Mae or Freddie Mac'}. This is general information, not legal or compliance advice.</p>
    </section>
  );
}

function Related({ g }) {
  const links = g.family === 'pbj'
    ? [[PREFLIGHT, 'Free PBJ pre-flight checks: zero-RN days and meal breaks'], ['/guides/pbj-error-4025', 'PBJ Error -4025: more than 22.5 hours for one employee on one date'], ['/guides/pbj-error-4016', 'PBJ Error -4016: employee ID not found']]
    : [['/guides/uad36-fatal-findings-explained', 'UAD 3.6 Fatal Findings Explained'], ['/guides/ucdp-not-successful-vs-rejected', 'UCDP Not Successful vs Rejected'], ['/tools/uad36-preflight-checklist', 'Free UAD 3.6 pre-submission checklist']];
  const batch = DEADLINE_GUIDES.filter((x) => x.family === g.family && x.slug !== g.slug).map((x) => [`/guides/${x.slug}`, x.title]);
  return (
    <section style={{ marginTop: 32 }} aria-labelledby="more-h">
      <h2 id="more-h">Related</h2>
      <ul>{[...batch, ...links].map(([href, t]) => <li key={href}><a href={href}>{t}</a></li>)}</ul>
    </section>
  );
}

// ------------------------------------------------------------------ 1. zero-RN days
function ZeroRn() {
  return (
    <>
      <p>One number can sink a nursing home's staffing star for a whole quarter: four. If your Payroll Based Journal data shows four or more days in the quarter with no RN hours while residents were in the building, CMS gives you a one-star staffing rating for that quarter. It does not matter how strong the rest of your staffing is.</p>

      <h2>What CMS counts as a zero-RN day</h2>
      <p>A zero-RN day is a date in the quarter where your PBJ data has no hours at all under the three RN job codes, on a day when at least one resident was in the facility.</p>
      <ul>
        <li><b>The RN job codes:</b> 5 (RN director of nursing), 6 (registered nurse with administrative duties) and 7 (registered nurse).<Cite k="fiveStar" at="p. 9" /></li>
        <li><b>Residents present:</b> CMS works out the daily resident census itself, from MDS assessments, not from anything in your PBJ file.<Cite k="fiveStar" at="pp. 9-10" /></li>
      </ul>
      <p>So hours under other job codes do not help. An LPN covering a night, or a director of nursing whose hours were coded under a different job title, still leaves a zero-RN day if nothing is reported under codes 5, 6 or 7.</p>

      <h2>The 4-day rule</h2>
      <p>The Five-Star Technical Users' Guide lists it among the staffing scoring exceptions:</p>
      <Quote>Providers that submit staffing data indicating that there were four or more days in the quarter with no RN staffing hours (job codes 5-7) on days when there were one or more residents in the nursing home will receive a one-star staffing rating for the quarter.<Cite k="fiveStar" at="p. 17" /></Quote>
      <p>Three days do not trigger it. Four do. The count runs across the whole quarter, so the risk builds quietly: a weekend here, a holiday there.</p>
      <p>The same section has two other ways to land on one star: not submitting any staffing data by the deadline, and failing to respond to a CMS staffing audit or having the audit find significant discrepancies (that one lasts three months).<Cite k="fiveStar" at="p. 17" /></p>

      <h2>What it does to your overall rating</h2>
      <p>The staffing rating feeds the overall star. CMS starts from the health inspection rating, then adjusts for staffing:</p>
      <Quote>Add one star to the Step 1 result if the staffing rating is five stars; subtract one star if the staffing rating is one star.<Cite k="fiveStar" at="p. 24" /></Quote>
      <p>So four zero-RN days cost you a star on the overall rating, not just on staffing. The overall rating cannot drop below one star.<Cite k="fiveStar" at="p. 24" /></p>

      <h2>How to check before you submit</h2>
      <ol>
        <li>Pull daily RN hours for the quarter: every hour reported under job codes 5, 6 and 7, added up by date.</li>
        <li>Look for dates with zero. Check weekends and holidays first.</li>
        <li>For each zero, find out why. If an RN worked and the hours did not make it into the file (wrong job code, a missing contract nurse, a time clock gap), fix the source data and export again. If no RN worked that day, leave it as it is: correcting data means making it match what happened, never adding hours.</li>
        <li>Count again. Four or more zero days with residents present means the one-star rule applies.</li>
        <li>Fix the schedule going forward. Data cannot be corrected into compliance after the fact.</li>
      </ol>
      <p>Data for July 1 to September 30, 2026 is due November 14, 2026: CMS counts a submission as timely when it is received by the end of the 45th calendar day after the quarter ends, 11:59 PM Eastern.<Cite k="pbjSubmission" /></p>
      <PbjCta scanner />
    </>
  );
}

// ------------------------------------------------------------------ 2. UAD1189 cluster
const BELOW_GRADE = [
  ['UAD1189', 'Fatal', 'Subject', "Provide the 'Finished Below Grade' Area, even if the value is 0."],
  ['UAD1190', 'Fatal', 'Subject', "Provide the 'Unfinished Below Grade' Area, even if the value is 0."],
  ['UAD1484', 'Fatal', 'Subject', "Provide the 'Finished Below Grade (Nonstandard)' Area, even if the value is 0."],
  ['UAD1483', 'Fatal', 'Each sales comparable', "Provide the 'Finished Below Grade' Area, even if the value is 0."],
  ['UAD1776', 'Fatal', 'Each sales comparable', "Provide the 'Unfinished Area Below Grade' for the sales comparable, even if the value is 0."],
  ['UAD1141', 'Fatal', 'Subject, each level', 'Provide the Grade Level Type (i.e., Above Grade, Fully Below Grade, Partially Below Grade) for the level.'],
  ['UAD1139', 'Fatal', 'Subject, below grade area with exterior access', 'Provide the primary exterior access method (e.g., walk-out, walk-up) for the below grade area.'],
];

function RuleTable({ rows }) {
  return (
    <div className="table-scroll">
      <table className="doc-table">
        <thead><tr><th>Rule</th><th>Severity</th><th>Applies to</th><th>Message</th></tr></thead>
        <tbody>{rows.map(([id, sev, to, msg]) => <tr key={id}><td><Rule>{id}</Rule></td><td>{sev}</td><td>{to}</td><td>{msg}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function BelowGrade() {
  return (
    <>
      <p>If the Submission Summary Report on a UAD 3.6 appraisal shows <Rule>UAD1189</Rule>, <Rule>UAD1190</Rule> or <Rule>UAD1484</Rule>, a below grade area field was left empty. All three are Fatal, so the report is Not Successful until they are filled in. The fix is usually typing a 0.</p>

      <h2>What each rule requires</h2>
      <p>UAD 3.6 reports below grade area as three separate measures for the subject: finished, unfinished, and finished but nonstandard. Each has its own rule, and each wants a number even when there is no basement at all.</p>
      <ul>
        <li><Rule>UAD1189</Rule>: Finished Below Grade area. Finished space below grade that meets the standard for finished area.</li>
        <li><Rule>UAD1190</Rule>: Unfinished Below Grade area. Below grade space that is not finished.</li>
        <li><Rule>UAD1484</Rule>: Finished Below Grade (Nonstandard) area. Finished space below grade that does not meet the standard, reported on its own line.</li>
      </ul>
      <p>The GSEs' lessons-learned job aid makes the same point for the whole area breakdown: report standard and nonstandard finished area separately, without counting the same space twice.<Cite k="lessons" at="item 2" /></p>
      <h3>The rules, word for word</h3>
      <RuleTable rows={BELOW_GRADE} />
      <p className="small muted">Rule IDs, severities and messages from Appendix H-1, URAR Compliance Rules v1.5.<Cite k="h1" /></p>

      <h2>Why a 0 passes and a blank fails</h2>
      <p>Each message ends with "even if the value is 0". The rule checks that the value is there, not that it is above zero. A house on a slab has 0 square feet of finished, unfinished and nonstandard below grade area, and the report has to say 0 three times. A blank reads as "not reported", which is the fatal finding.</p>
      <p>The same goes for every sales comparable (<Rule>UAD1483</Rule> and <Rule>UAD1776</Rule>), so a report with three comparables needs those values on every one.</p>

      <h2>Where these fields sit</h2>
      <p>On the UAD 3.6 URAR, below grade area is part of the Area Breakdown in the Unit Interior section, and the job aid notes that below grade area is considered a level, so it needs its own row in the Level and Room Detail too.<Cite k="lessons" at="items 2 and 3" /> That is why <Rule>UAD1141</Rule> (a grade level type for each level) often shows up next to these rules.</p>
      <p>Each appraisal program lays these out on its own screens. We do not describe vendor screens we cannot source, so check your program's UAD 3.6 help for where the Unit Interior area breakdown is entered.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Open the Unit Interior area breakdown for the subject.</li>
        <li>Enter a number in all three below grade fields: finished, unfinished, and finished nonstandard. Use 0 where there is none.</li>
        <li>Make sure any below grade level has its own level row with a grade level type.</li>
        <li>Repeat for every sales comparable.</li>
        <li>Produce a new file and send it back for resubmission. A revised report sent to the same appraisal tab replaces the earlier file in UCDP.<Cite k="ucdpGuide" at="p. 56" /></li>
      </ol>
      <p>For the wider picture of below grade reporting, see <a href="/guides/uad36-basement-fields-hard-stop">UAD 3.6 Basement Fields: Fixing the Below Grade Hard Stop</a>.</p>
      <UadCta />
    </>
  );
}

// ------------------------------------------------------------------ 3. UAD1001 cluster
const ADDRESS = [
  ['UAD1001', 'Missing', 'Provide the address line for the subject property physical address.', 'Enter the street address line: number and street name, plus any unit.'],
  ['UAD1002', 'Missing', 'Provide the city name for the subject property physical address.', 'Enter the city.'],
  ['UAD1003', 'Missing', 'Provide the county name for the subject property physical address.', 'Enter the county name.'],
  ['UAD1004', 'Missing', 'Provide the ZIP code for the subject property physical address.', 'Enter the ZIP code.'],
  ['UAD1005', 'Malformed', 'The ZIP code for the subject property physical address must be either 5 digits, or 5 digits, a hyphen, and 4 digits (ZIP+4).', 'Use 12345 or 12345-6789. No spaces, no missing hyphen, no 9 digits run together.'],
  ['UAD1006', 'Missing', 'Provide the state code for the subject property physical address.', 'Enter the state.'],
  ['UAD1007', 'Malformed', 'The state code for the subject property physical address must be a valid 2-character US State or Territory Code.', 'Use the 2-letter code, such as TX or PR. Not the full name, not a lowercase or 3-letter abbreviation.'],
];

function AddressRules() {
  return (
    <>
      <p>Rules <Rule>UAD1001</Rule> to <Rule>UAD1007</Rule> cover the subject property's physical address. All seven are Fatal: any one of them makes a UAD 3.6 report Not Successful in UCDP. They come in two kinds, and the fix depends on which one you hit.</p>
      <ul>
        <li><b>Missing:</b> <Rule>UAD1001</Rule>, <Rule>UAD1002</Rule>, <Rule>UAD1003</Rule>, <Rule>UAD1004</Rule> and <Rule>UAD1006</Rule> say a part of the address is not in the file at all.</li>
        <li><b>Malformed:</b> <Rule>UAD1005</Rule> and <Rule>UAD1007</Rule> say the ZIP code or state code is there but in the wrong shape.</li>
      </ul>

      <h2>Each rule and its fix</h2>
      <div className="table-scroll">
        <table className="doc-table">
          <thead><tr><th>Rule</th><th>Kind</th><th>Message</th><th>Fix</th></tr></thead>
          <tbody>{ADDRESS.map(([id, kind, msg, fix]) => <tr key={id}><td><Rule>{id}</Rule></td><td>{kind}</td><td>{msg}</td><td>{fix}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="small muted">Rule IDs, severities and messages from Appendix H-1, URAR Compliance Rules v1.5. All seven are Fatal.<Cite k="h1" /></p>
      <p>Comparables have their own rule: <Rule>UAD1390</Rule>, "Provide the address line for the sales comparable." It is Fatal as well.<Cite k="h1" /></p>

      <h2>What these rules are not about</h2>
      <p>These rules check that each address part is present and correctly formatted. They do not check that the address exists or matches postal records. The UCDP user guide says UCDP standardizes address formats on its own, so a spelled-out "Street" or "Southwest" is not an error.<Cite k="ucdpGuide" at="p. 43" /> For what UCDP does with the address after these rules pass, see <a href="/guides/uad36-address-usps-flag">UAD 3.6 Subject Address Errors in UCDP</a>.</p>

      <h2>A quick way through the cluster</h2>
      <ol>
        <li>Find the rule IDs on the Submission Summary Report.</li>
        <li>For a missing-element rule, fill in that part of the subject address, county included.</li>
        <li>For <Rule>UAD1005</Rule>, retype the ZIP as 5 digits or ZIP+4 with a hyphen.</li>
        <li>For <Rule>UAD1007</Rule>, use the 2-letter state or territory code.</li>
        <li>Check every comparable has an address line.</li>
        <li>Produce a new file and send it back for resubmission.<Cite k="ucdpGuide" at="p. 56" /></li>
      </ol>
      <UadCta />
    </>
  );
}

// ------------------------------------------------------------------ 4. PBJ file rejected
function PbjRejected() {
  return (
    <>
      <p>You submitted your PBJ file and something came back rejected. Before you start changing data, read the Final Validation Report. It tells you which records failed, why, and whether the problem stops the data or just needs a look.</p>

      <h2>Where to find the report</h2>
      <p>PBJ moved to iQIES on August 17, 2026. PBJ in the old QIES system went read-only that day and was retired on September 15, 2026, reports included.<Cite k="pbjSubmission" /> So for anything you submit now, the report is in iQIES:</p>
      <ul>
        <li><b>Automatic report:</b> the PBJ Final Validation Report is generated within 24 hours of a successful file submission. Go to the Reports section in iQIES to view it.<Cite k="pbjErrorGuide" /></li>
        <li><b>If the automatic report does not appear:</b> some fatal errors in the file or one of its records can stop iQIES from creating it. The person who submitted the file can then request the PBJ Submitter Final Validation Report in iQIES to see the errors.<Cite k="pbjErrorGuide" /></li>
        <li><b>On demand:</b> the 60-day wait for requesting an on-demand Final Validation Report has been removed.<Cite k="pbjIqiesNotice" /></li>
      </ul>
      <p>Access to reports in iQIES depends on your role, the way it did in CASPER.<Cite k="pbjIqiesNotice" /></p>

      <h2>Fatal vs warning</h2>
      <p>The report sorts problems into two kinds, and they mean very different things:</p>
      <ul>
        <li><b>Fatal:</b> "Records with fatal errors will be rejected. All fatal errors in a record must be corrected and resubmitted."<Cite k="pbjErrorGuide" /></li>
        <li><b>Warning:</b> not a rejection, but "All warning errors should be reviewed and corrected if appropriate, to ensure the data uploaded is accurate and complete."<Cite k="pbjErrorGuide" /></li>
      </ul>
      <p>The CMS guide describes rejection record by record, and a rejected record is not in your data until you correct and resubmit it.</p>

      <h2>Fatal errors to know</h2>
      <p>CMS publishes the full list of iQIES PBJ error messages, with severity, likely cause and the action to take.<Cite k="pbjErrorList" /> CMS does not publish which ones happen most often, so we will not rank them. These fatal errors each have a fix guide on this site:</p>
      <ul>
        <li><a href="/guides/pbj-error-4025">Error -4025</a>: more than 22.5 hours for one employee ID on one date.</li>
        <li><a href="/guides/pbj-error-minus-1025">Error -1025</a>: more than 22.5 hours across linked employee IDs on one date.</li>
        <li><a href="/guides/pbj-error-4016">Error -4016</a>: the employee ID is not found in the PBJ system.</li>
        <li><a href="/guides/pbj-error-3676">Error -3676</a>: a code that is not on the CMS list.</li>
        <li><a href="/guides/pbj-error-3679">Error -3679</a>: a number outside the allowed range.</li>
      </ul>

      <h2>How to work through the report</h2>
      <ol>
        <li>Open the Final Validation Report for the file. If it is not there after 24 hours, request the Submitter Final Validation Report.</li>
        <li>Start with the fatal errors. Those records are not in until they are fixed.</li>
        <li>For each fatal error, note the error number, the record and the field, and look up the action in the CMS error list.</li>
        <li>Fix the data at the source (payroll, time clock, employee setup), not just in the exported file, so the next quarter does not repeat it.</li>
        <li>Export and resubmit the corrected records, then check the new report.</li>
        <li>Go through the warnings. They do not reject anything, but CMS asks you to review them.</li>
      </ol>
      <p>Leave time for at least one round of fixes. Data for July 1 to September 30, 2026 is due by the end of November 14, 2026, 11:59 PM Eastern.<Cite k="pbjSubmission" /></p>
      <PbjCta />
    </>
  );
}

// ------------------------------------------------------------------ 5. Fix UCDP errors
const SEVERITIES = [
  ['Fatal', 'Makes the Document File Status and Document Status Not Successful.', 'Fix first. The loan cannot be delivered on this report.'],
  ['Severe', 'The collateral representation and warranty relief for property value eligibility is affected.', 'Fix or explain next. It affects the lender, so expect questions.'],
  ['Warning', 'An issue has been found that should be reviewed, and action may need to be taken.', 'Review every one. Fix what is a real error.'],
  ['Informational (Fannie Mae) or Notification (Freddie Mac)', 'For information.', 'Read them. No action required by the severity itself.'],
];

function FixUcdp() {
  return (
    <>
      <p>From November 2, 2026, UAD 3.6 files are required for all new appraisal report submissions to UCDP.<Cite k="ucdpFaq" /> When one comes back with findings, there is an order that saves time: read the report by severity, fix what stops the loan first, check the file again, then resubmit.</p>

      <h2>Step 1: Get the Submission Summary Report</h2>
      <p>The lender or AMC sees the report in UCDP and can download the SSR as a PDF. The button does not appear while the submission is In Progress.<Cite k="ucdpGuide" at="p. 58" /> If you are the appraiser, ask for the SSR itself, not a summary: you need the rule IDs.</p>
      <p>The UAD 3.6 SSR has three parts: Loan Metadata, Document Level Results, and Submission Findings Results, which lists the messages for each submitted report.<Cite k="ssrGuide" /> The findings come in three groups:</p>
      <ul>
        <li><b>System findings:</b> whether the ZIP file is complete and valid in UCDP.</li>
        <li><b>UAD compliance findings:</b> whether the XML meets the UAD 3.6 specification. These carry rule IDs such as UAD1189.</li>
        <li><b>GSE proprietary findings:</b> each GSE's own appraisal requirements.<Cite k="ucdpGuide" at="p. 58" /></li>
      </ul>

      <h2>Step 2: Sort by severity, Fatal first</h2>
      <div className="table-scroll">
        <table className="doc-table">
          <thead><tr><th>Severity</th><th>What the SSR guide says it means</th><th>What to do</th></tr></thead>
          <tbody>{SEVERITIES.map(([s, m, d]) => <tr key={s}><td><b>{s}</b></td><td>{m}</td><td>{d}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="small muted">Severity meanings from the SSR Guide for UAD 3.6.<Cite k="ssrGuide" /> The "what to do" column is our suggested order.</p>
      <p>Only Fatal changes the status. A loan delivered to either GSE needs an appraisal with a Successful status.<Cite k="ucdpGuide" at="p. 58" /> Every published URAR compliance rule is either Fatal or Warning; Severe and the informational levels appear on other findings.<Cite k="h1" /></p>

      <h2>Step 3: Fix each finding at the source</h2>
      <p>Each compliance finding's message says what is missing or wrong. Fix it in the appraisal software, not in the XML, so the next export is right. Messages that say to contact the appraisal software vendor are usually about how the program wrote the file. Guides for the clusters people hit:</p>
      <ul>
        <li><a href="/guides/uad36-rule-uad1189">UAD1189, UAD1190, UAD1484</a>: below grade area left blank.</li>
        <li><a href="/guides/uad36-rule-uad1001">UAD1001 to UAD1007</a>: subject address missing or malformed.</li>
        <li><a href="/guides/uad36-location-view-codes-rejected">View and site influence</a>: missing values, or Other with no description.</li>
        <li><a href="/guides/uad36-concession-mismatch">Sales concessions</a>: the concession questions left unanswered.</li>
      </ul>

      <h2>Five issues the GSEs keep seeing</h2>
      <p>Neither GSE publishes a ranked list of the most frequent findings. What they have published is a lessons-learned job aid for appraisers, from early UAD 3.6 reports.<Cite k="lessons" /> Five of its items worth checking before any resubmission:</p>
      <ol>
        <li><b>Sales comparison grid rows.</b> Use the predefined rows, not blank ones, so the XML carries the right data and valid values.</li>
        <li><b>Area breakdown.</b> Report standard and nonstandard finished area separately, without duplicating space.</li>
        <li><b>Levels.</b> The number of levels must match the rows in Level and Room Detail, and below grade area counts as a level.</li>
        <li><b>Comparable weight.</b> The reconciliation commentary has to agree with the comparable weights on the grid.</li>
        <li><b>Condition.</b> The rating has to fit the defects reported. The job aid's example: missing floor coverings call for C5.</li>
      </ol>

      <h2>Step 4: Check the file again before it goes back</h2>
      <p>Do not use UCDP as the test. The final version of the report used in the underwriting decision must be the one with a Successful status before the loan is sold.<Cite k="ucdpGuide" at="p. 56" /> The GSEs offer a UAD Compliance API that software providers and lenders can use to validate UAD 3.6 XML before production.<Cite k="complianceApi" /> Ask your software vendor whether it runs those checks, or run the file through an independent check.</p>

      <h2>Step 5: Resubmit</h2>
      <p>When the corrected file is uploaded to the same appraisal tab, UCDP detects the document type and replaces the existing report file in that tab.<Cite k="ucdpGuide" at="p. 56" /> Then check the new SSR: a fix in one place can expose a rule that depends on it.</p>
      <UadCta />
    </>
  );
}

const BODIES = {
  'pbj-zero-rn-days': ZeroRn,
  'uad36-rule-uad1189': BelowGrade,
  'uad36-rule-uad1001': AddressRules,
  'pbj-file-rejected': PbjRejected,
  'how-to-fix-ucdp-errors': FixUcdp,
};

export function makeDeadlineGuide(slug) {
  const g = deadlineGuideBySlug(slug);
  const Body = BODIES[slug];
  return function DeadlineGuide() {
    return (
      <Layout path={`/guides/${g.slug}`}>
        <Crumbs items={[['/', 'Home'], ['/guides', 'Guides'], [null, g.crumb]]} />
        <article className="wrap section article" style={{ paddingTop: 24 }}>
          <h1 style={{ maxWidth: '26ch' }}>{g.title}</h1>
          <p className="small muted" style={{ marginTop: 16 }}>Published October 5, 2026</p>
          <Body />
          <Related g={g} />
          <Sources g={g} />
        </article>
      </Layout>
    );
  };
}
