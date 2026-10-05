import Layout, { Crumbs } from '../site/Layout.jsx';
import coverage from '../content/uad-coverage.json';

// Every UCDP and UAD 3.6 statement on these pages was checked in October 2026 against:
//  - UCDP General User Guide (February 2026), statuses p. 30, 34, 49-50, address p. 43, Appendix B p. 64-65
//  - Freddie Mac UCDP FAQ (who can submit, 60 MB ZIP limit, November 2, 2026, UAD 3.6 findings structure)
//  - Appendix H-1 URAR Compliance Rules v1.5 (rule IDs, severities, and the severity definitions in its column notes)
//  - Appendix A-1 URAR Delivery Specification 1.4 (supported enumerations, lower-case Booleans)
//  - UCDP Fannie Mae Messaging Guide for UAD 2.6 (June 2026), FNM0401 and FNM0803
// Claims we could not tie to those documents are left out.
export const UCDP_GUIDE = 'https://sf.freddiemac.com/docs/pdf/step-by-step-guides/ucdp-general-user-guide.pdf';
export const UCDP_FAQ = 'https://sf.freddiemac.com/faqs/ucdp-faq';
export const UAD_SPEC = 'https://singlefamily.fanniemae.com/delivering/uniform-mortgage-data-program/uniform-appraisal-dataset';
const FNM_26 = 'https://singlefamily.fanniemae.com/media/9371/display';
export const VALIDATOR = '/apis/uad-36-appraisal-validator';
export const UAD_CHECKLIST_PATH = '/tools/uad36-preflight-checklist';

export const UAD_ERROR_GUIDES = [
  {
    slug: 'uad36-fatal-findings-explained',
    title: 'UAD 3.6 Fatal Findings Explained: What Stops a Report in UCDP',
    crumb: 'Fatal findings explained',
    description: 'UAD 3.6 fatal findings explained: what makes a report Not Successful in UCDP, how Fatal differs from Warning, and the fatal rules by area with plain fixes.',
    blurb: '592 of the 728 URAR rules are Fatal. What that means, where they cluster, and where to start fixing.',
  },
  {
    slug: 'ucdp-not-successful-meaning',
    title: 'UCDP Not Successful: What It Means and How to Fix It',
    crumb: 'UCDP Not Successful',
    description: 'UCDP Not Successful means the UAD 3.6 report triggered fatal findings. What happens next, who sees it, and how a corrected file gets you to Successful.',
    blurb: 'Step by step: what happened to the report, who sees the result, and how a corrected file gets to Successful.',
  },
  {
    slug: 'uad36-warning-vs-fatal',
    title: 'UAD 3.6 Warning vs Fatal Findings: Which Ones Stop a Report',
    crumb: 'Warning vs Fatal',
    description: 'UAD 3.6 Warning vs Fatal findings in UCDP: which ones stop the submission, which ones can ride, and examples of each from the published compliance rules.',
    blurb: 'Fatal stops the report. Warning does not, but it is not a free pass either. Examples of each.',
  },
  {
    slug: 'uad36-basement-fields-hard-stop',
    title: 'UAD 3.6 Basement Fields: Fixing the Below Grade Hard Stop',
    crumb: 'Below grade hard stop',
    description: 'Why UAD 3.6 below grade area fields cause UCDP fatal findings, the exact rules (UAD1189, UAD1190, UAD1484), and how to fix them before the report goes out.',
    blurb: 'UAD 3.6 wants every below grade area reported, even when it is 0. Leaving one blank is a fatal finding.',
  },
  {
    slug: 'uad36-location-view-codes-rejected',
    title: 'UAD 3.6 View and Location Codes: Why UCDP Flags Them',
    crumb: 'View and location codes',
    description: 'UAD 3.6 view and site influence (location) fields take values from a fixed list. What UCDP checks, the fatal rules, and how to fix a UAD 3.6 view code error.',
    blurb: 'View and site influence are picked from a published list, and "Other" needs a description. Here is what UCDP checks.',
  },
  {
    slug: 'uad36-concession-mismatch',
    title: 'UAD 3.6 Sales Concessions: What UCDP Checks and What It Cannot',
    crumb: 'Sales concessions',
    description: 'How UAD 3.6 reports sales concessions, the three fatal rules UCDP runs on them, and why matching the contract amount is on the appraiser, not on UCDP.',
    blurb: 'UCDP checks that concessions are reported. It cannot see the contract, so the amount matching is on you.',
  },
  {
    slug: 'uad36-address-usps-flag',
    title: 'UAD 3.6 Subject Address Errors in UCDP: What Gets Flagged',
    crumb: 'Subject address errors',
    description: 'The UAD 3.6 address rules UCDP runs (UAD1001 to UAD1007), ZIP and state code formats, how UCDP standardizes addresses, and how to fix an address finding.',
    blurb: 'Seven fatal address rules, a strict ZIP format, and what UCDP does with the address you send.',
  },
  {
    slug: 'ucdp-not-successful-vs-rejected',
    title: 'UCDP Not Successful vs Rejected: What Each Status Means',
    crumb: 'Not Successful vs Rejected',
    description: 'UCDP statuses explained: Successful, Not Successful, In Progress and Rejected, what fatal findings and warnings do, and what an FNM0401 message means.',
    blurb: 'Not Successful means fatal findings to fix. Rejected means the package never got in. The difference matters.',
  },
];
export const UAD_GUIDE_PUBLISHED = '2026-10-05';
export const uadGuideBySlug = (slug) => UAD_ERROR_GUIDES.find((g) => g.slug === slug);

const Rule = ({ children }) => <code>{children}</code>;

function Cta() {
  return (
    <div className="note" style={{ marginTop: 32 }}>
      <p><b>Check the whole file, not just this field.</b> The <a href={VALIDATOR}>SpreadRun UAD 3.6 validator</a> runs the delivery specification checks and {coverage.rulesImplemented} of the {coverage.rulesTotal} published URAR compliance rules on your XML or ZIP and lists every finding with its rule ID and location. $1.00 per completed report from prepaid credits, with a free test on the page. <a href={`${VALIDATOR}#demo`}>Check a report</a></p>
      <p className="small" style={{ marginTop: 8 }}>A PASS is not UCDP acceptance. UCDP also runs the rules the validator does not, GSE proprietary checks and its own system checks.</p>
    </div>
  );
}

function Related({ slug }) {
  return (
    <section style={{ marginTop: 32 }} aria-labelledby="more-h">
      <h2 id="more-h">More UAD 3.6 fixes</h2>
      <ul>
        <li><a href={UAD_CHECKLIST_PATH}>Free UAD 3.6 pre-submission checklist</a></li>
        {UAD_ERROR_GUIDES.filter((g) => g.slug !== slug).map((g) => <li key={g.slug}><a href={`/guides/${g.slug}`}>{g.title}</a></li>)}
        <li><a href="/guides/uad-3-6-requirements-2026">UAD 3.6 Requirements: The 2026 Guide</a></li>
      </ul>
      <p className="small muted">Sources: <a href={UCDP_GUIDE}>UCDP General User Guide</a> (February 2026), <a href={UCDP_FAQ}>UCDP FAQ</a>, and the URAR Delivery Specification (Appendix A-1) and Compliance Rules (Appendix H-1) on the <a href={UAD_SPEC}>Uniform Appraisal Dataset page</a>. SpreadRun is not affiliated with or endorsed by Fannie Mae or Freddie Mac. This is general information, not legal advice.</p>
    </section>
  );
}

const STATUS_NOTE = (
  <p>Only lenders and their agents can submit to UCDP. Appraisers cannot register. So findings reach you through the lender or AMC, from the Submission Summary Report (SSR). In the published compliance rules, a <b>Fatal</b> finding makes the submission status <b>Not Successful</b>, and a <b>Warning</b> does not stop a Successful status. To get to Successful, every fatal finding has to be resolved, which usually means correcting the data and sending a new file.</p>
);

function Basement() {
  return (
    <>
      <p>If the SSR on your report shows a fatal finding on a below grade field, the fix is usually one number. UAD 3.6 does not have the old basement square footage and percent finished boxes. It reports below grade area as separate measures, and it wants them even when the answer is 0.</p>
      <h2>What triggers it</h2>
      <p>For the subject dwelling, three rules are Fatal:</p>
      <ul>
        <li><Rule>UAD1189</Rule>: provide the Finished Below Grade area, even if the value is 0.</li>
        <li><Rule>UAD1190</Rule>: provide the Unfinished Below Grade area, even if the value is 0.</li>
        <li><Rule>UAD1484</Rule>: provide the Finished Below Grade (Nonstandard) area, even if the value is 0.</li>
      </ul>
      <p>The same applies to an accessory dwelling unit that is part of the real property. For each sales comparable, <Rule>UAD1483</Rule> (finished below grade) and <Rule>UAD1776</Rule> (unfinished below grade) are Fatal too. <Rule>UAD1777</Rule> is a Warning: if the subject has nonstandard finished area below grade, give it for the comparable as well.</p>
      <p>Two more rules sit next to these. <Rule>UAD1141</Rule> needs a Grade Level Type (Above Grade, Fully Below Grade, Partially Below Grade) for each level. <Rule>UAD1139</Rule> needs the exterior access type, such as walk-out or walk-up, when the below grade level has exterior access. Both are Fatal.</p>
      <h2>What UCDP does</h2>
      {STATUS_NOTE}
      <h2>How to fix it</h2>
      <ol>
        <li>Open the area or levels section in your appraisal software.</li>
        <li>Enter 0 in every below grade area field that does not apply. A blank is not the same as 0.</li>
        <li>Do the same for every sales comparable.</li>
        <li>Check that each level has a grade level type.</li>
        <li>Regenerate the ZIP and send the corrected report back to your client.</li>
      </ol>
      <p className="small muted">Rules quoted from Appendix H-1, URAR Compliance Rules v1.5.</p>
    </>
  );
}

function ViewCodes() {
  return (
    <>
      <p>In UAD 3.6, view and location are not free text boxes. Each is a value from a fixed list in the delivery specification, and the report can carry more than one. When a field is missing, or set to Other with no description, UCDP returns a fatal finding.</p>
      <h2>What the fields are</h2>
      <ul>
        <li><b>View Type</b>: one of 29 values, such as Residential, Park, Lake, Mountain, Woods, Highway or Other.</li>
        <li><b>Range of View</b>: Full, Partial, Seasonal or Other.</li>
        <li><b>Site Influence</b>: what the old forms called location. It is also a value from a list, with Other for anything not covered.</li>
      </ul>
      <h2>What triggers a finding</h2>
      <ul>
        <li><Rule>UAD1361</Rule> (subject) and <Rule>UAD1450</Rule> (each sales comparable): the view type must be included. Fatal.</li>
        <li><Rule>UAD1364</Rule>: provide the range of view. Fatal.</li>
        <li><Rule>UAD1328</Rule> (subject) and <Rule>UAD1769</Rule> (each sales comparable): the site influence must be included. Fatal.</li>
        <li><Rule>UAD1362</Rule>, <Rule>UAD1365</Rule>, <Rule>UAD1451</Rule>, <Rule>UAD1329</Rule> and <Rule>UAD1770</Rule>: when you pick Other, describe it. Fatal.</li>
        <li><Rule>UAD1363</Rule> (primary view indicator), <Rule>UAD1366</Rule> (impact on value and marketability) and <Rule>UAD1330</Rule> (site influence proximity) are Warnings.</li>
      </ul>
      <p>A value that is not on the list is a different problem. The delivery specification lists the supported values for each field, so typed text or an old UAD 2.6 abbreviation does not meet the specification. We found nothing in the UCDP user guide that says which status that produces, so we will not guess. Treat it as something to fix before the report goes out.</p>
      <h2>What UCDP does</h2>
      {STATUS_NOTE}
      <p>Note the wording. These findings make a report Not Successful. Rejected is a different UCDP status for packages that could not be processed at all. See <a href="/guides/ucdp-not-successful-vs-rejected">Not Successful vs Rejected</a>.</p>
      <h2>How to fix it</h2>
      <ol>
        <li>In the site section of your software, pick at least one view type and a range of view for the subject.</li>
        <li>Pick at least one site influence for the subject, and a view and site influence for every sales comparable.</li>
        <li>Wherever you chose Other, fill in the description.</li>
        <li>If your software let you type a value, replace it with one from the list.</li>
      </ol>
      <p className="small">About the validator: it checks every view, range and site influence value against the supported list, and it runs the Other description rules. The four "must be included" rules (UAD1361, UAD1450, UAD1328 and UAD1769) are among the ones it does not run yet, and every report lists them.</p>
      <p className="small muted">Rules quoted from Appendix H-1, URAR Compliance Rules v1.5. Values from Appendix A-1, URAR Delivery Specification.</p>
    </>
  );
}

function Concessions() {
  return (
    <>
      <p>People search for a "concession mismatch hard stop". The published UAD 3.6 rules do not contain one. UCDP checks that concessions are reported, not that the amount agrees with the contract. It never sees the contract. That part is on the appraiser who read it.</p>
      <h2>What UCDP checks</h2>
      <p>When the appraiser has reviewed a sales contract, these rules apply to the subject:</p>
      <ul>
        <li><Rule>UAD1128</Rule>: indicate whether the contract includes sales concessions. Fatal.</li>
        <li><Rule>UAD1127</Rule>: if there are concessions, indicate whether the total amount is known. Fatal.</li>
        <li><Rule>UAD1133</Rule>: if the amount is known, provide Total Sales Concessions. Fatal.</li>
        <li><Rule>UAD1129</Rule> and <Rule>UAD1130</Rule>: provide the contract price and the date the contract was fully executed. Fatal.</li>
        <li><Rule>UAD1728</Rule>: the contract date must include year, month and day. Fatal.</li>
        <li><Rule>UAD1131</Rule>: the contract date cannot be after the effective date of the appraisal. Warning.</li>
      </ul>
      <p>Those are all the concession rules in the URAR compliance rules. None compares the concession amount to the contract.</p>
      <h2>What UCDP does</h2>
      {STATUS_NOTE}
      <h2>How to get it right</h2>
      <ol>
        <li>Answer the concession questions in order: is there a contract, did you review it, does it include concessions, is the amount known.</li>
        <li>If the amount is known, enter the total from the contract you reviewed, and check it against the contract again before you send the report.</li>
        <li>Enter the contract date as a full date.</li>
        <li>If the contract changed after you reviewed it, get the current version and update the report.</li>
      </ol>
      <p className="small muted">Rules quoted from Appendix H-1, URAR Compliance Rules v1.5.</p>
    </>
  );
}

function Address() {
  return (
    <>
      <p>The subject address is the first thing UCDP reads, and the rules on it are strict about format. Most address findings come from a missing part or a ZIP code in the wrong shape.</p>
      <h2>What triggers a finding</h2>
      <ul>
        <li><Rule>UAD1001</Rule> to <Rule>UAD1004</Rule> and <Rule>UAD1006</Rule>: provide the address line, city, county, ZIP code and state. All Fatal.</li>
        <li><Rule>UAD1005</Rule>: the ZIP code must be 5 digits, or 5 digits, a hyphen and 4 digits. Fatal.</li>
        <li><Rule>UAD1007</Rule>: the state must be a valid 2-character US state or territory code. Fatal.</li>
        <li><Rule>UAD1390</Rule>: each sales comparable needs an address line. Fatal.</li>
      </ul>
      <h2>What UCDP does with the address</h2>
      <p>The UCDP user guide says UCDP automatically standardizes address formats, so 123 Main Street Southwest becomes 123 Main St SW. A spelled-out street suffix is not an error in itself.</p>
      <p>Address validation is a separate matter. Under UAD 2.6, Fannie Mae used message FNM0803 when an address could not be validated through its geocoding system, and that message is a Warning, not a hard stop. For UAD 3.6, the UCDP FAQ says GSE proprietary findings are no longer tied to hard stops. We found no published rule that makes a geocoding mismatch fatal, so we do not say it is one.</p>
      <h2>What the rules do</h2>
      {STATUS_NOTE}
      <h2>How to fix it</h2>
      <ol>
        <li>Fill in every part of the subject address, including the county.</li>
        <li>Use a 5-digit ZIP or ZIP+4 with a hyphen. No spaces, no extra characters.</li>
        <li>Use the 2-letter state code.</li>
        <li>Check the address against the postal service lookup.</li>
      </ol>
      <p className="small muted">Rules quoted from Appendix H-1, URAR Compliance Rules v1.5. Standardization from the UCDP General User Guide (February 2026). FNM0803 from the UCDP Fannie Mae Messaging Guide for UAD 2.6 (June 2026).</p>
    </>
  );
}

function Statuses() {
  return (
    <>
      <p>UCDP uses a few words that sound alike and mean very different things. Here is what the UCDP General User Guide says each one means for a UAD 3.6 submission.</p>
      <h2>The statuses</h2>
      <ul>
        <li><b>Successful</b>: no fatal findings were triggered. Loans delivered to either GSE need an appraisal with a Successful status in UCDP.</li>
        <li><b>Not Successful</b>: one or more fatal findings were triggered. All fatal findings have to be resolved, which may mean correcting the data and resubmitting a corrected file.</li>
        <li><b>In Progress</b>: UCDP is still processing the file.</li>
        <li><b>Rejected</b>: UCDP did not accept the package. A rejected submission does not get a Doc File ID and does not add to or change any existing submission.</li>
      </ul>
      <h2>Fatal and Warning findings</h2>
      <p>The URAR compliance rules each carry a severity. Fatal causes a Not Successful status. Warning does not stop a Successful status, but it flags something that should be reviewed. The message text you see on the Submission Summary Report is the message text in the published rules, with a rule ID such as UAD1189.</p>
      <h2>What gets a submission Rejected</h2>
      <p>The UCDP user guide lists the messages that come with a rejected submission. They are about the package, not the appraisal data:</p>
      <ul>
        <li>Invalid ZIP file, missing XML file, or too many XML files</li>
        <li>XML not well formed, or XML with non UTF-8 characters</li>
        <li>Document type that cannot be detected, or expected file attachments missing</li>
        <li>An update or completion report sent before the appraisal report</li>
        <li>Duplicate submission for the same business unit and lender loan number</li>
        <li>File too large (a UAD 3.6 ZIP may not exceed 60 MB)</li>
        <li>Account and setup problems, such as a missing business unit number or lender loan number</li>
      </ul>
      <p>So a typo in a field makes a report Not Successful. A broken package makes it Rejected. The fix for the first is the data. The fix for the second is the file.</p>
      <h2>What does "hard stop 401" mean?</h2>
      <p>People often mean FNM0401, a Fannie Mae message from UAD 2.6. It says the appraiser reported materially different sales prices in one or more appraisal reports, and asks for the sales price to be verified. In the Fannie Mae messaging guide it is a Warning, not a hard stop. For UAD 3.6, the UCDP FAQ says submissions get a simpler findings structure that does not tie GSE proprietary findings to hard stops.</p>
      <h2>Who sees what</h2>
      <p>Only lenders and their agents can submit to UCDP, so appraisers see these statuses through the lender or AMC. If you are asked to correct a report, ask for the SSR: it names each finding and its rule ID.</p>
      <p className="small muted">From the UCDP General User Guide (February 2026), the UCDP FAQ, Appendix H-1 URAR Compliance Rules v1.5, and the <a href={FNM_26}>UCDP Fannie Mae Messaging Guide for UAD 2.6</a> (June 2026).</p>
    </>
  );
}


const AREAS = [
  ['Sales Comparison Approach', 70, 'Comparable data: proximity, parking, finished area, bedrooms, contract dates, and adjustment totals that must add up (UAD1461).'],
  ['Site', 66, 'View and site influence (UAD1361, UAD1328), utilities, access, water frontage, and descriptions whenever Other is picked.'],
  ['Unit Interior', 43, 'Room and bathroom counts, areas including below grade even when 0 (UAD1189, UAD1190, UAD1484), and interior ratings.'],
  ['Assignment Information', 41, 'The assignment reason, how inspections were done, and appraiser and supervisory appraiser details.'],
  ['Project Information', 41, 'Condominium, cooperative and other project data, when the property is in a project.'],
  ['Subject Property', 37, 'The subject address and its format (UAD1001 to UAD1007), dwelling and unit counts, and property rights.'],
  ['Dwelling Exterior', 28, 'At least one dwelling, construction method, foundation details and condition status.'],
  ['Data that does not display on the form', 78, 'Technical items in the XML, such as data sources, parcel identifiers and image file references. Many say to contact the software vendor.'],
];

function FatalIndex() {
  return (
    <>
      <p>When a UAD 3.6 report comes back from UCDP as Not Successful, it is because of Fatal findings. This page explains what that means and where the fatal rules sit, so you know where to look.</p>
      <h2>What a Fatal finding is</h2>
      <p>Every URAR compliance rule has a severity. In the published rules, a <b>Fatal</b> finding makes the UCDP submission status <b>Not Successful</b>. A <b>Warning</b> does not stop a Successful status, but it flags something that should be reviewed. Of the {coverage.rulesTotal} URAR compliance rules, 592 are Fatal and 136 are Warnings.</p>
      <p>A Not Successful report is fixed by correcting the data and sending a new file. For what happens step by step, see <a href="/guides/ucdp-not-successful-meaning">UCDP Not Successful: what it means</a>. For how the two severities differ, see <a href="/guides/uad36-warning-vs-fatal">Warning vs Fatal</a>.</p>
      <p>Not Successful is not the same as Rejected. Rejected is a separate UCDP status for problems with the package itself, such as a broken ZIP, a missing or extra XML file, malformed XML, a duplicate submission or a file over 60 MB. See <a href="/guides/ucdp-not-successful-vs-rejected">Not Successful vs Rejected</a>.</p>
      <h2>Where the fatal rules are</h2>
      <p>The rules are grouped by the URAR section they belong to. These are the areas with the most Fatal rules, counted from the published rules:</p>
      <div className="table-scroll">
        <table className="doc-table">
          <thead><tr><th>Area</th><th>Fatal rules</th><th>What they cover</th></tr></thead>
          <tbody>{AREAS.map(([a, n, d]) => <tr key={a}><td>{a}</td><td>{n}</td><td>{d}</td></tr>)}</tbody>
        </table>
      </div>
      <p>89 of the rules say "For assistance with this message, contact the appraisal software vendor." The published notes call these technical and likely not something the appraiser can fix alone.</p>
      <h2>Fatal findings with their own fix guides</h2>
      <ul>
        <li><a href="/guides/uad36-basement-fields-hard-stop">Below grade areas left blank</a>: finished, unfinished and nonstandard below grade area are required even when 0.</li>
        <li><a href="/guides/uad36-location-view-codes-rejected">View and site influence missing</a>: at least one of each, and a description for Other.</li>
        <li><a href="/guides/uad36-concession-mismatch">Sales concession answers missing</a>: whether there are concessions, whether the amount is known, and the total.</li>
        <li><a href="/guides/uad36-address-usps-flag">Subject address incomplete</a>: every part of the address, a valid ZIP and a 2-letter state code.</li>
      </ul>
      <p className="small muted">Counts and rule IDs from Appendix H-1, URAR Compliance Rules v1.5. Areas are the rules' Report Section; a few rules span two sections and are not counted above.</p>
    </>
  );
}

function NotSuccessfulMeaning() {
  return (
    <>
      <p>Not Successful is the UCDP status a UAD 3.6 report gets when at least one Fatal finding was triggered. It is not a rejection of the file and not a judgment on the value. It means some data has to be fixed.</p>
      <h2>What happens, step by step</h2>
      <ol>
        <li><b>The lender submits the report.</b> Only lenders and their agents can submit to UCDP. Appraisers cannot register.</li>
        <li><b>UCDP processes it.</b> While it runs, the status is In Progress.</li>
        <li><b>Findings are issued.</b> For UAD 3.6 they come in three groups: system findings, UAD compliance findings and GSE proprietary findings.</li>
        <li><b>The status is set.</b> No Fatal findings: Successful. One or more Fatal findings: Not Successful.</li>
        <li><b>The lender sees it.</b> The Submission Summary Report (SSR) lists each finding with its message. The message text is the text in the published compliance rules, with a rule ID such as UAD1189.</li>
        <li><b>The report is corrected.</b> Usually the lender or AMC sends the findings back to the appraiser, who fixes the data in the appraisal software and produces a new file.</li>
        <li><b>The corrected file is resubmitted.</b> A revised URAR uploaded to the same submission replaces the earlier one.</li>
      </ol>
      <h2>Why it matters</h2>
      <p>Loans delivered to either GSE need an appraisal with a Successful status in UCDP, and the final version used in the underwriting decision must be the one that is Successful. A Not Successful report holds up the loan until it is fixed.</p>
      <h2>Can it be overridden?</h2>
      <p>The UCDP General User Guide describes override requests for UAD 2.6 hard stops. For UAD 3.6 it says all fatal findings must be resolved to reach Successful, which may require updating the data and resubmitting. We found no override path for UAD 3.6 fatal findings, so plan on a corrected file.</p>
      <h2>How to get to Successful</h2>
      <ol>
        <li>Get the SSR, or at least the list of findings with their rule IDs.</li>
        <li>Fix the Fatal ones first. Each message says what is missing or wrong.</li>
        <li>For messages that say to contact the appraisal software vendor, do that: they are usually about how the software wrote the file.</li>
        <li>Review the Warnings too.</li>
        <li>Produce a new ZIP from the software and send it back for resubmission.</li>
      </ol>
      <p className="small muted">From the UCDP General User Guide (February 2026), the UCDP FAQ, and Appendix H-1, URAR Compliance Rules v1.5.</p>
    </>
  );
}

function WarningVsFatal() {
  return (
    <>
      <p>Each UAD 3.6 compliance rule has one of two severities. The difference decides whether the report can go through.</p>
      <h2>The rule</h2>
      <ul>
        <li><b>Fatal</b>: the UCDP status becomes Not Successful. The report has to be corrected and sent again.</li>
        <li><b>Warning</b>: does not stop a Successful status. The published rules say an issue has been found that should be reviewed, and action may need to be taken.</li>
      </ul>
      <p>So Warnings can ride, in the sense that they do not block the status. They are not something to ignore. The lender and the GSEs see them on the Submission Summary Report too, and the UCDP user guide says all findings should be reviewed and considered.</p>
      <h2>Examples of Fatal findings</h2>
      <ul>
        <li><code>UAD1189</code>: provide the Finished Below Grade area, even if the value is 0.</li>
        <li><code>UAD1005</code>: the subject ZIP code must be 5 digits, or ZIP+4.</li>
        <li><code>UAD1361</code>: the type of view must be included.</li>
        <li><code>UAD1384</code>: provide the Overall Condition rating.</li>
        <li><code>UAD1461</code>: the Net Adjustment Total does not equal the sum of the individual adjustments.</li>
      </ul>
      <h2>Examples of Warnings</h2>
      <ul>
        <li><code>UAD1131</code>: the contract date cannot be after the effective date of the appraisal.</li>
        <li><code>UAD1363</code>: indicate whether the view is the primary view.</li>
        <li><code>UAD1366</code>: provide the impact the view has on value and marketability.</li>
        <li><code>UAD1777</code>: give the nonstandard finished below grade area for a comparable when the subject has it.</li>
        <li><code>UAD1647</code>: provide the median sale price.</li>
      </ul>
      <h2>By the numbers</h2>
      <p>Of the {coverage.rulesTotal} URAR compliance rules, 592 are Fatal and 136 are Warnings. Most of what the rules check can stop a report, so it pays to check before it goes out.</p>
      <p className="small muted">Rule text and severities from Appendix H-1, URAR Compliance Rules v1.5. Review guidance from the UCDP General User Guide (February 2026).</p>
    </>
  );
}

const BODIES = {
  'uad36-fatal-findings-explained': FatalIndex,
  'ucdp-not-successful-meaning': NotSuccessfulMeaning,
  'uad36-warning-vs-fatal': WarningVsFatal,
  'uad36-basement-fields-hard-stop': Basement,
  'uad36-location-view-codes-rejected': ViewCodes,
  'uad36-concession-mismatch': Concessions,
  'uad36-address-usps-flag': Address,
  'ucdp-not-successful-vs-rejected': Statuses,
};

export function makeUadErrorGuide(slug) {
  const g = uadGuideBySlug(slug);
  const Body = BODIES[slug];
  return function UadErrorGuide() {
    return (
      <Layout path={`/guides/${g.slug}`}>
        <Crumbs items={[['/', 'Home'], ['/guides', 'Guides'], [null, g.crumb]]} />
        <article className="wrap section article" style={{ paddingTop: 24 }}>
          <h1 style={{ maxWidth: '24ch' }}>{g.title}</h1>
          <p className="small muted" style={{ marginTop: 16 }}>Published October 5, 2026</p>
          <Body />
          <Cta />
          <Related slug={g.slug} />
        </article>
      </Layout>
    );
  };
}
