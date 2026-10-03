import Badges from '../site/Badges.jsx';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import CodeSample from '../site/CodeSample.jsx';
import { UadDemo } from '../site/Demo.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import example from '../content/examples/uad-demo-fail.json';
import coverage from '../content/uad-coverage.json';

const API = apiBySlug('uad-36-appraisal-validator');
export const UCDP_FAQ_URL = 'https://sf.freddiemac.com/faqs/ucdp-faq';
const NOT_DONE = coverage.rulesTotal - coverage.rulesImplemented;
const byReason = coverage.notImplemented.reduce((m, r) => ({ ...m, [r.reason]: (m[r.reason] || 0) + 1 }), {});

export const UAD_FAQ = [
  ['Does a PASS mean UCDP will accept the report?',
    `No. A PASS means the file passed the checks this validator runs: the delivery specification checks and ${coverage.rulesImplemented} of the ${coverage.rulesTotal} published URAR compliance rules. UCDP also runs the rules not implemented here, GSE proprietary checks and its own system checks, and it reviews the whole package, not just the XML. These are structural checks. They are not legal, compliance or underwriting advice.`],
  ['Our appraisal software already checks the report. Why use this?',
    'Your appraisal software runs the GSE compliance rules while the report is written, and UCDP runs them again when the lender submits it. Those are the right checks for an appraiser finishing a report. This API is for the systems around them: a lender or AMC checking every file at intake, a QC tool, or a developer testing a UAD 3.6 export, from code, with no portal login.'],
  ['What about Fannie Mae\'s UAD Compliance API?',
    'Fannie Mae offers a UAD Compliance API to technology vendors, arranged through Fannie Mae. If you have access to it, it is the authoritative source and you should use it. SpreadRun is for teams that do not: anyone with an API key and credits can call it.'],
  ['Which reports are supported?',
    `The Uniform Residential Appraisal Report (URAR), checked against Appendix A-1, the URAR Delivery Specification (${coverage.sources.a1.sheet.replace('UAD Delivery Spec ', 'v')}), and Appendix H-1, the URAR compliance rules (${coverage.sources.h1.sheet.replace('UAD Compliance Rules ', '')}). Appraisal Update and Completion Reports are not supported yet: they are rejected with a clear message and not charged.`],
  ['Can I send the whole UAD 3.6 ZIP package?',
    'Yes. Send the ZIP as the request body and the validator checks the one UAD XML file inside it. The PDF and photos in the package are not checked. The 4.4 MB request limit applies to the ZIP, so for packages with many photos, send the XML file on its own.'],
  ['Which compliance rules are not implemented?',
    `${NOT_DONE} of the ${coverage.rulesTotal} rules. Each one needs interpretation the published rule text does not settle, such as links between parts of the report, date arithmetic and sums, or row-by-row comparisons across comparables. Every report lists their rule IDs, and the API docs give the reason for each. A rule that is not implemented never produces a finding, so it can never make a report fail.`],
  ['Is the appraisal data stored?',
    'No. Files are processed in memory for the length of the request and are not stored or shared. Appraisal reports contain personal data such as borrower, owner and seller names and property addresses; the Terms allow it for this validator only, on that basis. Findings name the location, the rule and the problem, never a value from your file. For billing and usage we log the time, endpoint, result status, upload size and duration, never the file contents.'],
  ['Where do the rules come from?',
    'From the appendices the GSEs publish for UAD 3.6: the URAR Delivery Specification and the URAR compliance rules. They are translated into a machine-readable rule table by a script, and the translation is tested against the GSE sample scenarios. Where this validator and the Delivery Specification differ, the Delivery Specification controls. SpreadRun is not affiliated with or endorsed by Fannie Mae or Freddie Mac.'],
  ['When is a run charged?',
    `When the validator finishes and returns a report, whether it says PASS, WARN or FAIL: ${dollars(API.priceCents)} per report. Requests rejected before a report exists are free: not XML, not a MISMO 3.6 file, not a URAR, a ZIP without exactly one UAD XML file, or DOCTYPE and entity declarations.`],
  ['Why does a valid older report get a WARN?',
    'Two compliance rules compare the report\'s dates with today: the effective date cannot be in the future or more than 367 days old, and the same for the signature date. To check an older report as of the date it was signed, pass asOf=YYYY-MM-DD.'],
];

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/uad-36-appraisal-validator" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/xml" \\
  --data-binary @appraisal.xml`;

const PY = `import os, requests

with open("appraisal_package.zip", "rb") as f:   # the UAD 3.6 ZIP, or the XML file itself
    r = requests.post(
        "https://www.spreadrun.com/api/v1/uad-36-appraisal-validator",
        headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
        data=f,
        timeout=60,
    )
r.raise_for_status()
report = r.json()["report"]
print(report["status"], report["findingCounts"])
for f in report["findings"]:
    print(f["severity"], f["ruleId"], f["path"], f["message"])`;

export default function UadApi() {
  return (
    <Layout path={`/apis/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/apis', 'APIs'], [null, 'UAD 3.6 Appraisal Report Validator']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <Badges api={API} style={{ marginBottom: 14 }} />
        <h1>UAD 3.6 Appraisal Report Validator</h1>
        <p className="subhead">Don't trust your software's green check? Verify independently.</p>
        <p className="lede" style={{ marginTop: 16 }}>Check a UAD 3.6 URAR appraisal file from your own code. Send the XML, or the whole UAD 3.6 ZIP package, and get a PASS, WARN or FAIL report against the GSE-published delivery specification and compliance rules, with an XPath, a rule ID and a message for every finding.</p>
        <div className="note">
          <p><b>Where this fits.</b> Appraisal software already runs the GSE compliance rules while a report is written, and the Uniform Collateral Data Portal (UCDP) runs them again when the lender submits it, at no fee to lenders. Fannie Mae also offers a UAD Compliance API to technology vendors. SpreadRun is the programmatic option for everyone else who handles the XML: lenders, AMCs and QC teams checking files at intake, and developers testing a UAD 3.6 export, with no portal login and no vendor agreement. UAD 3.6 is required for new UCDP submissions from November 2, 2026 (<a href={UCDP_FAQ_URL}>UCDP FAQ</a>). New to the change? Start with <a href="/guides/uad-3-6-requirements-2026">UAD 3.6 Requirements: The 2026 Guide</a>.</p>
        </div>
        <div className="note">
          <p><b>A PASS does not mean UCDP acceptance.</b> These are structural checks, not legal, compliance or underwriting advice. {NOT_DONE} of the {coverage.rulesTotal} published URAR compliance rules are not implemented (listed below), UCDP also runs GSE proprietary checks, and only the XML is checked.</p>
        </div>
        <div className="note">
          <p><b>Personal data.</b> Appraisal reports name the borrower, the property owner and the seller and give the property address. Under the <a href="/terms">Terms</a>, files sent to this validator may contain that personal data: it is processed in memory only to produce the report and is not stored, and no value from your file is repeated in the report. You confirm you are permitted to share the file with SpreadRun as a service provider. The sample files on this page use invented names and addresses.</p>
        </div>
        <div className="btn-row">
          <a className="btn" href="#demo">Check a report</a>
          <a className="btn secondary" href="/account">Get API access</a>
        </div>
      </div>

      <section className="section wrap split" aria-labelledby="checks">
        <div>
          <h2 id="checks">What it checks</h2>
          <ul className="checklist">
            <li><b>XML and MISMO 3.6.</b> Well-formed XML with no DOCTYPE or entity declarations, a MESSAGE root in the MISMO residential namespace, MISMOReferenceModelIdentifier 3.6.0366, and a URAR report type.</li>
            <li><b>Known structure.</b> Every element sits at a location the URAR Delivery Specification defines ({coverage.dataPoints} data points and attributes). Anything else is a warning.</li>
            <li><b>Allowed values.</b> Enumerated fields hold only supported values: condition and quality ratings C1 to C6 and Q1 to Q6, lowercase true or false, property types, valuation use types and the rest.</li>
            <li><b>Formats.</b> ISO dates (YYYY, YYYY-MM or YYYY-MM-DD as specified), datetimes, number precision and sign, and text length limits.</li>
            <li><b>Required data.</b> Data points the specification always requires in a container that is present, and container repeat limits.</li>
            <li><b>Compliance rules.</b> {coverage.rulesImplemented} of the {coverage.rulesTotal} URAR compliance rules ({coverage.implementedBySeverity.Fatal} fatal, {coverage.implementedBySeverity.Warning} warning): required and conditionally required data for the subject, each comparable, each unit, room, level and component; cross-field comparisons such as contract date against effective date; instance counts; unique comparable numbers; ZIP and state code formats; report dates.</li>
          </ul>
          <p>Fatal rules and delivery specification violations are errors and make the report FAIL. Warning rules make it WARN. Each property is checked in its own scope, so a finding names the exact comparable, unit or room.</p>
        </div>
        <div>
          <h2>Who it's for</h2>
          <ul>
            <li><b>Lenders and AMCs:</b> check every appraisal XML at intake, before it reaches underwriting or UCDP.</li>
            <li><b>QC and review teams:</b> run the same checks on a batch of files from a script.</li>
            <li><b>Software teams:</b> test a UAD 3.6 export or import in CI with a structured JSON report.</li>
            <li><b>AI agents and automation:</b> a plain REST endpoint with a file in and JSON out.</li>
          </ul>
          <h3 style={{ marginTop: 24 }}>Not checked</h3>
          <ul className="small">
            <li>{NOT_DONE} compliance rules: {Object.entries(byReason).map(([k, v]) => `${k.toLowerCase()} (${v})`).join('; ')}. Their IDs are in every report.</li>
            <li>Appraisal Update and Completion Reports (rejected, not charged).</li>
            <li>Schema validation against the MISMO XSD, GSE proprietary findings, Collateral Underwriter, and the PDF and photos in a package.</li>
            <li>Whether the values are true, or the appraisal is credible.</li>
          </ul>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="how">
        <h2 id="how">Input and output</h2>
        <ol className="steps">
          <li><h3>Send</h3><p>POST the UAD 3.6 URAR XML file, or the UAD 3.6 ZIP package, as the request body. Up to 4.4 MB. The whole file is checked: no sampling.</p></li>
          <li><h3>Validate</h3><p>Structure, allowed values and formats from the delivery specification, then each implemented compliance rule for every property and container it applies to.</p></li>
          <li><h3>Report</h3><p>JSON with <code>status</code> (PASS, WARN or FAIL), <code>findings</code> (severity, ruleId, XPath-style path, message), counts, the report type and the coverage: which rules ran and which are not implemented.</p></li>
        </ol>
        <p className="small">Full request and report schema in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
      </section>

      <section className="section wrap" id="demo" aria-labelledby="demo-h">
        <h2 id="demo-h">Try it now</h2>
        <UadDemo api={API} sample={example.body.report} />
      </section>

      <section className="section wrap" aria-labelledby="price-h">
        <h2 id="price-h">Pricing</h2>
        <p><b>{dollars(API.priceCents)} per completed report.</b> One file, one full report.</p>
        <ul>
          <li>Billed when a report is produced, PASS, WARN or FAIL. Invalid input is never billed: not XML, not MISMO 3.6, not a URAR, a ZIP without exactly one UAD XML file.</li>
          <li>Paid from the same prepaid credits as every SpreadRun API. A $5 pack covers {Math.floor(500 / API.priceCents)} reports. Credits never expire. <a href="/apis#pricing">All pricing</a></li>
          <li>Checking thousands of appraisals a month? <a href="/contact">Talk to us</a> first so we can tell you honestly whether this fits.</li>
        </ul>
        <div className="btn-row"><a className="btn" href="#demo">Check a report</a><a className="btn secondary" href="/account">Get API access</a></div>
      </section>

      <section className="section wrap" aria-labelledby="code-h">
        <h2 id="code-h">Call it from code</h2>
        <p>Parameters, the report format, rule IDs, error codes and limits are in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={UAD_FAQ} />
        <p className="small" style={{ marginTop: 24 }}>Rules from the GSE-published UAD 3.6 appendices A-1 and H-1. SpreadRun is not affiliated with or endorsed by Fannie Mae or Freddie Mac. Where this validator and the Delivery Specification differ, the Delivery Specification controls.</p>
        <p className="small">More validators: <a href="/apis/hospital-mrf-validator">Hospital MRF Validator</a> | <a href="/apis">the full catalog</a></p>
      </section>
    </Layout>
  );
}
