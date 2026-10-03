import Layout, { Crumbs } from '../site/Layout.jsx';
import coverage from '../content/uad-coverage.json';

export const UAD_GUIDE = {
  slug: 'uad-3-6-requirements-2026',
  title: 'UAD 3.6 Requirements: The 2026 Guide',
  published: '2026-10-02',
};

const GSE_FAQ = 'https://sf.freddiemac.com/faqs/uad-and-forms-redesign';
const UCDP_FAQ = 'https://sf.freddiemac.com/faqs/ucdp-faq';
const PRODUCT = '/apis/uad-36-appraisal-validator';

// Facts checked against the GSE UAD and UCDP FAQs (October 2026) and the URAR appendices A-1 and H-1.
export default function UadGuide() {
  return (
    <Layout path={`/guides/${UAD_GUIDE.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/guides', 'Guides'], [null, 'UAD 3.6 requirements']]} />
      <article className="wrap section article" style={{ paddingTop: 24 }}>
        <h1 style={{ maxWidth: '22ch' }}>UAD 3.6 Requirements: The 2026 Guide</h1>
        <p className="small muted" style={{ marginTop: 16 }}>Published October 2, 2026</p>

        <p>On November 2, 2026, the way residential appraisals reach Fannie Mae and Freddie Mac changes for good. Every new appraisal submitted to the Uniform Collateral Data Portal (UCDP) has to use UAD 3.6: a new dataset, a redesigned report, and a new set of compliance rules that decide whether a submission goes through.</p>
        <p>This guide explains what UAD 3.6 is, who the deadline applies to, how the delivery specification and compliance rules fit together, where appraisal XML most often goes wrong, and how to check a file before it reaches UCDP.</p>

        <h2>What UAD 3.6 is, and what it replaces</h2>
        <p>The Uniform Appraisal Dataset (UAD) is the standard set of data points the GSEs require in an appraisal. Version 3.6 is a rebuild, not an update. The old model was a set of fixed forms, each with its own layout. UAD 3.6 is data first: a single, dynamic report whose sections appear or disappear depending on the property, built on version 3.6 of the MISMO reference model.</p>
        <p>The redesigned Uniform Residential Appraisal Report (URAR) replaces thirteen legacy forms, including the 1004/70 single-family report, the 1073/465 condominium report, the 1025/72 small income property report and the 1004D/442 update and completion form. Alongside the URAR there are two smaller reports under UAD 3.6: an appraisal update report and a completion report, each tied to an existing UAD 3.6 URAR.</p>

        <h2>The November 2, 2026 deadline</h2>
        <p>The transition ran in three phases:</p>
        <ul>
          <li><b>September 8, 2025:</b> a limited production period, with restricted early use of UAD 3.6.</li>
          <li><b>January 26, 2026:</b> broad production. Lenders could submit either UAD 2.6 or UAD 3.6.</li>
          <li><b>November 2, 2026:</b> UAD 3.6 is required for all new appraisal submissions to UCDP, and the legacy forms retire.</li>
        </ul>
        <p>The deadline is about submission. It applies to appraisals delivered through UCDP for loans sold to Fannie Mae or Freddie Mac, which in practice means lenders and their agents (only they can register with UCDP), and the appraisers and appraisal management companies who produce reports for them. UAD 3.6 reports are submitted as a ZIP package that holds the XML data file, the printable report and the photos. The GSEs describe limited policy exceptions for some sellers; check the official <a href={GSE_FAQ}>UAD and forms redesign FAQ</a> for your situation.</p>

        <h2>The delivery specification and the compliance rules</h2>
        <p>Two documents do most of the work, and it helps to keep them apart.</p>
        <p><b>The delivery specification</b> (Appendix A-1 for the URAR) is the map. For every data point it gives the location in the XML, the data type and format, the allowed values for coded fields, whether it is required or conditionally required, and how many times its container may repeat. Condition ratings must be C1 to C6, quality ratings Q1 to Q6, indicators lowercase <code>true</code> or <code>false</code>, dates <code>YYYY-MM-DD</code>, and so on, for roughly {Math.round(coverage.dataPoints / 10) * 10} data points and attributes.</p>
        <p><b>The compliance rules</b> (Appendix H-1 for the URAR) are the tests UCDP runs. There are {coverage.rulesTotal} of them for the URAR, each with a message ID such as UAD1040 and a severity. Most read like "if this is true and that is not provided, stop": provide the ZIP code for each sales comparable, describe the heating system when its type is Other, give the number of parking spaces for a garage. A <b>fatal</b> finding is a hard stop: the submission does not go through until it is fixed. A <b>warning</b> does not stop the submission, but it flags something that should be reviewed.</p>
        <p>UCDP layers its own checks on top: system checks on the package itself, the UAD compliance findings above, and GSE proprietary findings that are not published as rules (<a href={UCDP_FAQ}>UCDP FAQ</a>).</p>

        <h2>Common failure modes in appraisal XML</h2>
        <p>Most rejected files fail for ordinary reasons. Going by what the published rules test, these are the ones to watch:</p>
        <ul>
          <li><b>Conditionally required data left out.</b> The biggest category by far. "Other" chosen without a description, a garage without a parking count, a dwelling without interior condition and quality ratings for each unit. Each one is required only in a given situation, which is exactly why it slips through.</li>
          <li><b>Values outside the allowed list.</b> A condition rating of C7, a property type spelled the way the old form spelled it, <code>True</code> instead of <code>true</code>. Coded fields accept only the values the specification lists.</li>
          <li><b>Formats and dates.</b> <code>09/20/2026</code> where <code>2026-09-20</code> belongs, a year built before 1800, an effective date in the future or more than a year old.</li>
          <li><b>Per-property gaps.</b> The subject is complete but a comparable is missing its ZIP code, sale date or dwelling count. Every comparable is checked on its own.</li>
          <li><b>Numbers that disagree.</b> Comparable numbers repeated, an opinion of value of zero, counts that do not match the units described.</li>
          <li><b>The wrong file altogether.</b> A legacy UAD 2.6 file, the wrong MISMO version, or elements placed where the specification does not define them, usually after a hand edit or a conversion script.</li>
        </ul>

        <h2>A UAD 3.6 checklist before submission</h2>
        <ol>
          <li>The file is MISMO 3.6 (the MESSAGE root says <code>MISMOReferenceModelIdentifier="3.6.0366"</code>) and declares the report type.</li>
          <li>The subject and every comparable carry their own required data: address, ZIP code, dates, counts.</li>
          <li>Every coded field uses an allowed value, in the exact spelling and case of the specification.</li>
          <li>Every "Other" has a description, and every conditional field whose condition applies is filled in.</li>
          <li>Dates are <code>YYYY-MM-DD</code>; the effective date and signature date are current.</li>
          <li>The ZIP package holds the XML file, the PDF and the photos it references.</li>
          <li>The file has been run through the compliance rules before it reaches UCDP.</li>
        </ol>

        <h2>How to check a file before UCDP</h2>
        <p><b>If you write appraisals,</b> your appraisal software runs the GSE compliance rules as you work and is the first and best check. Fix what it flags before you export.</p>
        <p><b>If you are a lender,</b> UCDP is the authoritative check, it charges lenders no fee, and its findings are what count. Fannie Mae also offers a UAD Compliance API to technology vendors; if you build appraisal software and have access, it is the closest thing to UCDP's own answer.</p>
        <p><b>If files move through a system before they reach UCDP</b> (an AMC intake queue, a QC step, a conversion or export you are building and testing) the check belongs in that system, before submission. That is the gap SpreadRun's <a href={PRODUCT}>UAD 3.6 Appraisal Report Validator</a> fills: a REST API that takes the URAR XML or the whole ZIP package and returns a PASS, WARN or FAIL report with the XPath, rule ID and message for every finding. It runs the delivery specification checks and {coverage.rulesImplemented} of the {coverage.rulesTotal} URAR compliance rules, and lists the rest in every report. A PASS is not UCDP acceptance, and it is not legal or compliance advice: UCDP still has the final word.</p>

        <p className="small muted">Official sources: the GSE <a href={GSE_FAQ}>UAD and forms redesign FAQ</a> and <a href={UCDP_FAQ}>UCDP FAQ</a>, and the UAD 3.6 appendices they publish. SpreadRun is not affiliated with or endorsed by Fannie Mae or Freddie Mac. This guide is general information, not legal advice.</p>

        <div className="note" style={{ marginTop: 32 }}>
          <p><b>Check an appraisal file before UCDP does.</b> Run the UAD 3.6 Appraisal Report Validator: every finding with its XPath and rule ID, $1.00 per completed report, free test on the page. <a href={`${PRODUCT}#demo`}>Check a report</a></p>
        </div>
      </article>
    </Layout>
  );
}
