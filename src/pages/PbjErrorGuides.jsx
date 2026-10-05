import Layout, { Crumbs } from '../site/Layout.jsx';
import { apiBySlug, dollars } from '../catalog.js';

// Every error statement on these pages was checked in October 2026 against:
//  - CMS iQIES PBJ Error Messages list (QTSO, posted 07/31/2026): message, severity, potential cause, action,
//    effective start date
//  - CMS PBJ Data Submission Specifications v4.10.0 (edit table and XSD, the same files the validator is built from)
//  - QTSO: PBJ functionality live in iQIES as of August 17, 2026; specs v4.10.0 enforce 22.5 hours per day
//  - CMS PBJ technical call minutes, February 26, 2026 (edit -4025 takes effect March 22, 2026)
// -4012 is in neither the iQIES list nor the v4.10.0 edits, and -4015 was deleted in v4.10.0, so no page is built
// for them.
const PBJ = apiBySlug('pbj-staffing-qa');
const PRODUCT = `/apis/${PBJ.slug}`;
export const PBJ_DEADLINE = 'November 14';   // the quarterly deadline named on these pages; update the date here only
const IQIES_ERRORS = 'https://qtso.cms.gov/reference-and-manuals/iqies-payroll-based-journal-pbj-manuals';
const IQIES_LIVE = 'https://qtso.cms.gov/news-and-updates/pbj-functionality-now-available-iqies';
const CMS_PBJ = 'https://www.cms.gov/medicare/quality/nursing-home-improvement/staffing-data-submission';

export const PBJ_ERROR_GUIDES = [
  {
    slug: 'pbj-error-minus-1025', code: '-1025',
    title: 'PBJ Error -1025: The 22.5-Hour Limit Across Linked Employee IDs',
    crumb: 'PBJ error -1025',
    description: 'What iQIES PBJ error -1025 means: one person over 22.5 hours on a date across linked employee IDs. Why it is fatal, what triggers it, and how to fix it.',
    blurb: 'New with PBJ in iQIES. Hours for linked employee IDs are added together, and one date cannot pass 22.5.',
  },
  {
    slug: 'pbj-error-4025', code: '-4025',
    title: 'PBJ Error -4025: More Than 22.5 Hours for One Employee on One Date',
    crumb: 'PBJ error -4025',
    description: 'PBJ error -4025 explained: an employee ID with more than 22.5 hours on one date, all job titles together. Why it is fatal and how to fix it before resubmitting.',
    blurb: 'All job titles for one employee ID on one date add up to more than 22.5 hours. The record is rejected.',
  },
  {
    slug: 'pbj-error-3679', code: '-3679',
    title: 'PBJ Error -3679: A Number Outside the Allowed Range',
    crumb: 'PBJ error -3679',
    description: 'PBJ error -3679 explained: a numeric value outside what the CMS data specifications allow, such as hours over 22.5 or with 3 decimals. How to find and fix it.',
    blurb: 'A number the specifications do not allow, most often hours above 22.5, below 0, or with more than two decimals.',
  },
  {
    slug: 'pbj-error-3676', code: '-3676',
    title: 'PBJ Error -3676: A Code That Is Not on the CMS List',
    crumb: 'PBJ error -3676',
    description: 'PBJ error -3676 explained: a coded value that is not in the CMS Item Values table, like a bad job title, pay type, state or spec version. How to fix it fast.',
    blurb: 'A code the specifications do not list: the spec version, state, quarter, process type, job title or pay type.',
  },
  {
    slug: 'pbj-error-4016', code: '-4016',
    title: 'PBJ Error -4016: Employee ID Not Found in the PBJ System',
    crumb: 'PBJ error -4016',
    description: 'PBJ error -4016 explained: staffing hours for an employee ID the PBJ system does not have on file. Why it is fatal, what causes it, and how to fix the file.',
    blurb: 'Hours are reported for an employee ID that the PBJ system has no record of.',
  },
];
export const PBJ_GUIDE_PUBLISHED = '2026-10-05';
export const pbjGuideBySlug = (slug) => PBJ_ERROR_GUIDES.find((g) => g.slug === slug);

const Quote = ({ children }) => <blockquote className="note" style={{ margin: '12px 0 20px' }}><p>{children}</p></blockquote>;

function Facts({ severity, since }) {
  return (
    <ul>
      <li><b>Severity:</b> {severity}. {severity === 'Fatal' ? 'The record is rejected and has to be fixed and sent again.' : 'The record is not rejected, but check it.'}</li>
      <li><b>In the iQIES error list since:</b> {since}.</li>
    </ul>
  );
}

function Cta({ covers }) {
  return (
    <div className="note" style={{ marginTop: 32 }}>
      <p><b>Check the whole file before the {PBJ_DEADLINE} quarterly deadline.</b> The <a href={PRODUCT}>PBJ Staffing Data Pre-Submission QA</a> checks your XML against the CMS v4.10.0 specifications and the staffing patterns CMS has named as audit or rating risks, before you upload to iQIES. {dollars(PBJ.priceCents)} per report, with a free test on the page. <a href={`${PRODUCT}#demo`}>Check a PBJ file</a></p>
      <p className="small" style={{ marginTop: 8 }}>{covers} A PASS is not CMS acceptance: iQIES runs its own checks and has the final word.</p>
    </div>
  );
}

function Related({ slug }) {
  return (
    <section style={{ marginTop: 32 }} aria-labelledby="more-h">
      <h2 id="more-h">More PBJ help</h2>
      <ul>
        <li><a href="/tools/pbj-preflight-checks">Free PBJ pre-flight checks</a>: zero-RN days and meal break deductions</li>
        {PBJ_ERROR_GUIDES.filter((g) => g.slug !== slug).map((g) => <li key={g.slug}><a href={`/guides/${g.slug}`}>{g.title}</a></li>)}
      </ul>
      <p className="small muted">Sources: the <a href={IQIES_ERRORS}>iQIES PBJ Error Messages list</a> (CMS, July 2026), the <a href={CMS_PBJ}>CMS PBJ data specifications v4.10.0 and Policy Manual</a>, and the QTSO notice that <a href={IQIES_LIVE}>PBJ is live in iQIES</a>. SpreadRun is not affiliated with or endorsed by CMS. This is general information, not legal or compliance advice.</p>
    </section>
  );
}

function E1025() {
  return (
    <>
      <p>Error -1025 arrived with PBJ in iQIES, which went live on August 17, 2026. It is the 22.5-hour rule applied to a person instead of a single employee ID.</p>
      <h2>What the error says</h2>
      <Quote>The total number of hours by a System Employee ID for a single date must be less than or equal to 22.50. This total includes the sum of all hours across all linked Employee IDs for the specified date. Please review the employee linkage for the listed Employee IDs.</Quote>
      <Facts severity="Fatal" since="August 17, 2026" />
      <h2>What triggers it</h2>
      <p>When two employee IDs are linked as the same person (through the Employee Link part of PBJ, which ties an old employee ID to a new one), iQIES adds their hours together. If the total for one date passes 22.5, the record is rejected.</p>
      <p>The iQIES error list gives two causes:</p>
      <ul>
        <li>This submission alone puts the person over 22.5 hours on a date.</li>
        <li>This submission, added to hours already submitted, puts the person over 22.5.</li>
      </ul>
      <p>The second one catches people out. The file you are sending can look fine on its own, and still fail because of hours sent earlier under the other linked ID.</p>
      <h2>How it differs from -4025</h2>
      <p>Error <a href="/guides/pbj-error-4025">-4025</a> checks one employee ID: all its job titles on one date, no more than 22.5 hours. Error -1025 checks all the employee IDs linked to one person. You can pass -4025 and still hit -1025.</p>
      <h2>How to fix it</h2>
      <ol>
        <li>Find the employee IDs named in the error on your Final Validation Report.</li>
        <li>Check the employee link. Are these IDs really the same person? If a link is wrong, correct it.</li>
        <li>Add up the hours for that person on the date named, across every linked ID, in this file and in what you already submitted.</li>
        <li>Correct the hours at the source (time clock or payroll) so the total is 22.5 or less, then export again.</li>
        <li>Resubmit and check the new Final Validation Report.</li>
      </ol>
      <p className="small">iQIES's own action for this error: review the current and past submitted values for that System Employee ID and correct the records.</p>
      <Cta covers="The QA checks the 22.5 total for each employee ID inside your file (the -4025 rule). It cannot see your earlier submissions or your employee links in iQIES, so it cannot fully predict -1025." />
    </>
  );
}

function E4025() {
  return (
    <>
      <p>Error -4025 is the 22.5-hour rule for a single employee ID. The PBJ Policy Manual limits hours to 22.5 per employee ID per day. With data specifications v4.10.0, the system started rejecting anything over it.</p>
      <h2>What the error says</h2>
      <Quote>The total number of hours by an employee for a single date must be less than or equal to 22.50. This total includes the sum of all hours across all jobTitleCodes for the specified date.</Quote>
      <Facts severity="Fatal" since="April 1, 2026 (CMS announced enforcement from March 22, 2026, with specifications v4.10.0)" />
      <h2>What triggers it</h2>
      <ul>
        <li>One employee ID has hours under two or more job titles on the same date, and together they pass 22.5.</li>
        <li>Or this file, added to hours already submitted for that ID and date, passes 22.5.</li>
      </ul>
      <p>Places to look: a shift that crosses midnight recorded on one date, a duplicate punch, or the same hours exported under two job titles.</p>
      <h2>How to fix it</h2>
      <ol>
        <li>Find the employee ID and date on the Final Validation Report.</li>
        <li>Add up every job title's hours for that ID on that date, in this file and in earlier submissions.</li>
        <li>Fix the source data: split overnight shifts by date, remove duplicates, put hours under the right job title.</li>
        <li>Export again and resubmit.</li>
      </ol>
      <p>Each single hours entry also has to be from 0 to 22.5 with at most two decimals. A single entry over 22.5 is a different error, <a href="/guides/pbj-error-3679">-3679</a>.</p>
      <Cta covers="The QA flags any employee ID over 22.5 hours on a date inside your file, across all job titles. It cannot see hours you already submitted." />
    </>
  );
}

function E3679() {
  return (
    <>
      <p>Error -3679 means a number in your file is outside what the CMS data specifications allow. It is a format error: the value itself is wrong, not how it relates to other records.</p>
      <h2>What the error says</h2>
      <Quote>Values of Numeric Items: Only the values listed in the "Item Values" table of the Detailed Data Specifications Report may be submitted for this item. The submitted value must be greater than or equal to the minimum value listed in the table and less than or equal to the maximum value listed in the table, or it must match one of the remaining special values (if any) that are listed in the table.</Quote>
      <Facts severity="Fatal" since="October 1, 2015" />
      <h2>What triggers it</h2>
      <p>The iQIES error list names these items to review: the federal fiscal year, hours worked for a job title on a date, and the monthly resident counts (Medicaid, Medicare and other, on the last day of the month). In the staffing file, the usual causes are:</p>
      <ul>
        <li>An hours value below 0 or above 22.5.</li>
        <li>An hours value with more than two decimal places, such as 7.333.</li>
        <li>A federal fiscal year earlier than 2016.</li>
      </ul>
      <h2>How to fix it</h2>
      <ol>
        <li>Find the item named in the Final Validation Report.</li>
        <li>For hours, round to two decimals and split anything over 22.5 at the source. PBJ wants hours, not minutes: 7 hours 33 minutes is 7.55.</li>
        <li>For the fiscal year, remember PBJ uses the federal fiscal year: October to December belongs to the next year's first quarter.</li>
        <li>Export again and resubmit.</li>
      </ol>
      <Cta covers="The QA checks every hours value (0 to 22.5, two decimals) and the fiscal year in your file, with the exact location of each problem." />
    </>
  );
}

function E3676() {
  return (
    <>
      <p>Error -3676 means a coded field holds a value that is not on the CMS list. Like <a href="/guides/pbj-error-3679">-3679</a>, it is a format error, and the whole record is rejected.</p>
      <h2>What the error says</h2>
      <Quote>Values of Code and Checklist Items: Only the coded values listed in the "Item Values" table of the Detailed Data Specifications Report may be submitted for this item.</Quote>
      <Facts severity="Fatal" since="October 1, 2015" />
      <h2>What triggers it</h2>
      <p>The iQIES error list names the specifications version code, the facility's state postal code, the reporting quarter, the pay type code and the process type. In practice:</p>
      <ul>
        <li><b>fileSpecVersion</b> is not 4.10.0. Older versions stopped being accepted on April 1, 2026.</li>
        <li><b>stateCode</b> is not one of the state codes the specifications list.</li>
        <li><b>reportQuarter</b> is not 1, 2, 3 or 4.</li>
        <li><b>processType</b> is not merge or replace.</li>
        <li><b>jobTitleCode</b> is not one of the CMS job title codes, 1 to 40.</li>
        <li><b>payTypeCode</b> is not 1 (exempt), 2 (non-exempt) or 3 (contract).</li>
      </ul>
      <h2>How to fix it</h2>
      <ol>
        <li>Find the field named on the Final Validation Report.</li>
        <li>Compare the value with the Item Values table in the CMS data specifications.</li>
        <li>If the code comes from a payroll mapping, fix the mapping, not just this file, or it will come back next quarter.</li>
        <li>Export again and resubmit.</li>
      </ol>
      <Cta covers="The QA checks every coded value above against the v4.10.0 lists and points to each one that is not allowed." />
    </>
  );
}

function E4016() {
  return (
    <>
      <p>Error -4016 means your file reports hours for an employee ID that the PBJ system has no record of. The hours cannot be tied to anyone, so the record is rejected.</p>
      <h2>What the error says</h2>
      <Quote>A value submitted for employeeId in the Staffing Hours section must match an existing value for employeeId in the PBJ system. If a match cannot be found, the PBJ submission file will be rejected.</Quote>
      <Facts severity="Fatal" since="October 1, 2015" />
      <h2>What triggers it</h2>
      <ul>
        <li>An employee was never submitted to PBJ, but their hours were.</li>
        <li>The employee ID in the hours does not match the ID the employee was submitted under: a changed ID, a typo, or a different format such as dropped leading zeros.</li>
      </ul>
      <h2>How to fix it</h2>
      <ol>
        <li>Find the employee ID named on the Final Validation Report.</li>
        <li>Check that an employee record for exactly that ID was submitted. If not, add the employee to the Employee section and resubmit.</li>
        <li>If the person's ID changed, use the same ID everywhere, or link the old and new IDs in the Employee Link section.</li>
        <li>Make sure your export does not reformat IDs (leading zeros, spaces, letter case).</li>
      </ol>
      <Cta covers="The QA flags hours for any employee ID that is not in your file's own Employee section. Whether an ID is already on file with CMS can only be checked by the PBJ system." />
    </>
  );
}

const BODIES = { 'pbj-error-minus-1025': E1025, 'pbj-error-4025': E4025, 'pbj-error-3679': E3679, 'pbj-error-3676': E3676, 'pbj-error-4016': E4016 };

export function makePbjErrorGuide(slug) {
  const g = pbjGuideBySlug(slug);
  const Body = BODIES[slug];
  return function PbjErrorGuide() {
    return (
      <Layout path={`/guides/${g.slug}`}>
        <Crumbs items={[['/', 'Home'], ['/guides', 'Guides'], [null, g.crumb]]} />
        <article className="wrap section article" style={{ paddingTop: 24 }}>
          <h1 style={{ maxWidth: '24ch' }}>{g.title}</h1>
          <p className="small muted" style={{ marginTop: 16 }}>Published October 5, 2026</p>
          <Body />
          <Related slug={g.slug} />
        </article>
      </Layout>
    );
  };
}
