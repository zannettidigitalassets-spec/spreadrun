import Badges from '../site/Badges.jsx';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import CodeSample from '../site/CodeSample.jsx';
import { PecosDemo } from '../site/Demo.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import example from '../content/examples/pecos-demo-fail.json';

const API = apiBySlug('pecos-enrollment-precheck');

// Every fact on this page was checked against these documents (October 2026). Processing-time claims are left out:
// CMS publishes MAC timeliness standards, but no single processing time we could verify.
export const PECOS_SOURCES = [
  ['CMS-855I (05/23) enrollment application for physicians and non-physician practitioners', 'https://www.cms.gov/medicare/cms-forms/cms-forms/downloads/cms855i.pdf'],
  ['CMS-855B (12/2025) enrollment application for clinics, group practices and certain other suppliers', 'https://www.cms.gov/medicare/cms-forms/cms-forms/downloads/cms855b.pdf'],
  ['CMS-855S (12/23) enrollment application for DMEPOS suppliers', 'https://www.cms.gov/medicare/cms-forms/cms-forms/downloads/cms855s.pdf'],
  ['42 CFR part 424, subpart P: enrollment (424.510), revalidation (424.515), rejection (424.525), deactivation (424.540)', 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-424/subpart-P'],
  ['42 CFR 424.57: DMEPOS supplier standards', 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-424/subpart-D/section-424.57'],
  ['CMS: Medicare revalidations', 'https://www.cms.gov/medicare/enrollment-renewal/providers-suppliers/revalidations'],
  ['CMS: NPI check digit', 'https://www.cms.gov/Regulations-and-Guidance/Administrative-Simplification/NationalProvIdentStand/Downloads/NPIcheckdigit.pdf'],
  ['NPPES NPI Registry', 'https://npiregistry.cms.hhs.gov/'],
];

export const PECOS_FAQ = [
  ['Does a clean pre-check mean my enrollment will be approved?',
    'No. It means the draft passed the checks on this page. The Medicare Administrative Contractor reviews the application, may ask for more information, and may run site visits and background checks. SpreadRun cannot see any of that. This is a pre-submission error check, not an enrollment filing, and not legal advice.'],
  ['Which forms does it cover?',
    'The CMS-855I (individual practitioners), CMS-855B (clinics, group practices and certain other suppliers) and CMS-855S (DMEPOS suppliers), for initial enrollment, revalidation and changes of information. The CMS-855A, 855R, 855O and 20134 are not covered yet.'],
  ['How does the registry check work?',
    'Each run sends the NPI, and only the NPI, to the public NPPES NPI Registry API and compares the answer with your draft: whether the NPI exists and is active, whether it is the right type for the form, whether the name matches, and whether your taxonomy codes are on the record. The registry answer is used for that run only. It is not stored, cached or included in the report. If the registry cannot be reached, the run stops and you are not charged.'],
  ['Where does the processing window come from?',
    `From you. Set processingWindowDays to how long you expect the application to take; the default is 90 days. Anything that expires inside that window is flagged so you can renew it first. CMS does not publish a single processing time that we could verify, so we do not claim one. CMS does say PECOS applications tend to process faster than paper ones.`],
  ['Why does revalidation timing matter?',
    'Most providers and suppliers revalidate every 5 years, DMEPOS suppliers every 3. If you miss it, CMS can deactivate your Medicare billing privileges, and Medicare does not pay for services furnished while you are deactivated. Give the due date from the CMS revalidation lookup and the pre-check flags a date that has passed.'],
  ['Is my data stored?',
    'No. The draft is processed in memory for the length of the request and is not stored or shared. Findings name the field, the rule and the problem, never a name, number or date from your draft. For billing and usage we log the time, endpoint, result status, upload size and duration, never the contents.'],
  ['When is a run charged?',
    `When the pre-check finishes and returns a report, whether it says PASS, WARN or FAIL: ${dollars(API.priceCents)} per completed pre-check. Requests rejected before a report exists are free, and so is a run stopped because the NPPES registry could not be reached.`],
];

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/pecos-enrollment-precheck" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data-binary @enrollment_draft.json`;

const PY = `import json, os, requests

draft = json.load(open("enrollment_draft.json"))   # one provider per call
r = requests.post(
    "https://www.spreadrun.com/api/v1/pecos-enrollment-precheck",
    headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
    json=draft,
    timeout=60,
)
r.raise_for_status()
report = r.json()["report"]
print(report["status"], report["findingCounts"])
for item in report["readiness"]:
    print(item["status"], item["label"])`;

export function PecosSources() {
  return <ul className="small">{PECOS_SOURCES.map(([label, url]) => <li key={url}><a href={url}>{label}</a></li>)}</ul>;
}

export default function PecosApi() {
  return (
    <Layout path={`/apis/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/apis', 'APIs'], [null, 'PECOS Medicare Enrollment Pre-Check']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <Badges api={API} style={{ marginBottom: 14 }} />
        <h1>PECOS Medicare Enrollment Pre-Check</h1>
        <p className="lede" style={{ marginTop: 20 }}>Catch the mistakes in a Medicare enrollment before the contractor does. Send a draft CMS-855I, 855B or 855S as JSON and get back every problem SpreadRun can find with a rule ID: the NPI and taxonomy codes checked live against NPPES, the legal name against the IRS name, ZIP+4 on every location, anything that expires before the application is likely to finish, and the supporting documents the form asks for.</p>
        <h2 style={{ marginTop: 32 }}>What a bad application can cost</h2>
        <ul className="costs">
          <li><b>Rejection.</b> If you do not supply missing information within 30 calendar days of the contractor's request, the application can be rejected, with no appeal, and you file a new one.</li>
          <li><b>Deactivation.</b> Miss a revalidation and CMS can deactivate your Medicare billing privileges. Medicare does not pay for services furnished while you are deactivated.</li>
          <li><b>A wasted cycle.</b> A name that does not match the IRS, a mistyped NPI or a missing document sends the application back for correction.</li>
        </ul>
        <p className="small">Sources: 42 CFR 424.525 and 424.540 and CMS's revalidation guidance, linked at the bottom of this page.</p>
        <div className="note">
          <p><b>Where this fits.</b> You still enroll in PECOS yourself, and the contractor still decides. SpreadRun works before that: deterministic checks of the draft against the form's own requirements and the public NPPES registry, plus the expiry-versus-timeline math a spreadsheet does not do. Credentialing teams can run it for every provider from a script, through the same API.</p>
        </div>
        <div className="note">
          <p><b>A clean pre-check does not guarantee that the enrollment will be approved.</b> It cannot see what the contractor's reviewer sees, it is not an enrollment filing, and it is not legal advice.</p>
        </div>
        <div className="note">
          <p><b>Personal data.</b> An enrollment draft can name a practitioner and carry license and DEA numbers. It is processed in memory only to produce the report and is not stored, and no value from your draft is repeated in the report. The NPI is sent to the public NPPES registry for the run. The sample drafts on this page describe an invented practice.</p>
        </div>
        <div className="btn-row">
          <a className="btn" href="#demo">Pre-check an enrollment</a>
          <a className="btn secondary" href="/samples/pecos-clean.json">Download the sample draft</a>
        </div>
      </div>

      <section className="section wrap split" aria-labelledby="checks">
        <div>
          <h2 id="checks">What it checks</h2>
          <ul className="checklist">
            <li><b>NPI.</b> Ten digits that pass the CMS check digit, then a live NPPES lookup: on the registry, active, and the right type (individual for the 855I, organization for the 855B).</li>
            <li><b>Legal name.</b> The legal business name against the IRS name you attest to, and against the NPPES record. A difference in punctuation only is a warning; anything else is an error.</li>
            <li><b>Taxonomy codes.</b> Well formed, on the NPPES record, and the first one matching the record's primary taxonomy.</li>
            <li><b>Practice locations.</b> Street, city, state and ZIP present; no P.O. box; a valid state code; ZIP+4, which the forms ask for; a telephone number; and for DMEPOS suppliers, posted hours of operation.</li>
            <li><b>Expiry against the timeline.</b> Licenses, DEA registration, insurance, surety bonds and accreditation: anything already expired is an error, anything that expires inside your processing window is a warning.</li>
            <li><b>Supporting documents.</b> The documents the form lists for your situation, such as the IRS CP-575, the CMS-588 for EFT, the CMS-460 if you participate, and for DMEPOS the liability insurance certificate and surety bond.</li>
            <li><b>Signatures.</b> An authorized official for an organization's initial enrollment or revalidation; an authorized or delegated official for a change.</li>
            <li><b>Revalidation timing.</b> A due date that has already passed.</li>
          </ul>
          <p>Every report ends with a submission-readiness checklist: each area marked Ready, Review or Fix.</p>
        </div>
        <div>
          <h2>Who it's for</h2>
          <ul>
            <li><b>Small practices and groups:</b> check the draft before the application goes in.</li>
            <li><b>DME suppliers:</b> hours, insurance, bond and documents in one pass.</li>
            <li><b>Credentialing consultants:</b> run every client provider from one script.</li>
            <li><b>Software and automation:</b> a plain REST endpoint with JSON in and JSON out.</li>
          </ul>
          <h3 style={{ marginTop: 24 }}>Not checked</h3>
          <ul className="small">
            <li>What the contractor's reviewer sees and decides, including site visits, background checks and fingerprinting.</li>
            <li>Whether licenses, registrations and insurance are valid with the board or carrier. Dates are checked as you enter them.</li>
            <li>Ownership, managing employees, final adverse actions and other PECOS screens beyond the input.</li>
            <li>The CMS-855A, 855R, 855O and 20134 forms.</li>
            <li>Whether the documents you mark as ready are the right ones and complete.</li>
          </ul>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="how">
        <h2 id="how">Input and output</h2>
        <ol className="steps">
          <li><h3>Send</h3><p>One provider's draft as JSON: the form (855I, 855B or 855S), the reason, the NPI, legal names, taxonomy codes, practice locations, credentials with expiration dates, officials, and the documents you have ready. Up to 256 KB.</p></li>
          <li><h3>Check</h3><p>Every rule on this page, plus one live NPPES lookup for the NPI.</p></li>
          <li><h3>Report</h3><p>JSON with <code>status</code> (PASS, WARN or FAIL), <code>readiness</code> (the checklist), and <code>findings</code> (severity, ruleId, path such as <code>/practiceLocations[0]/zip</code>, message, source).</p></li>
        </ol>
        <p className="small">Every field, the input and output schemas and all rule IDs are in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
      </section>

      <section className="section wrap" id="demo" aria-labelledby="demo-h">
        <h2 id="demo-h">Try it now</h2>
        <PecosDemo api={API} sample={example.body.report} />
      </section>

      <section className="section wrap" aria-labelledby="price-h">
        <h2 id="price-h">Pricing</h2>
        <p><b>{dollars(API.priceCents)} per completed pre-check.</b> One provider's draft, one full report.</p>
        <ul>
          <li>Billed when a report is produced, PASS, WARN or FAIL. Invalid input is never billed, and neither is a run stopped because the NPPES registry could not be reached.</li>
          <li>Paid from the same prepaid credits as every SpreadRun API, in $5, $20, $50 or $100 packs. A $50 pack covers {Math.floor(5000 / API.priceCents)} pre-checks. Credits never expire. <a href="/apis#pricing">All pricing</a></li>
          <li>Checking many providers? <a href="/contact">Talk to us</a> first so we can tell you honestly whether this fits.</li>
        </ul>
        <div className="btn-row"><a className="btn" href="#demo">Pre-check an enrollment</a><a className="btn secondary" href="/account">Get API access</a></div>
      </section>

      <section className="section wrap" aria-labelledby="code-h">
        <h2 id="code-h">Call it from code</h2>
        <p>Fields, rule IDs, error codes and limits are in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={PECOS_FAQ} />
        <h3 style={{ marginTop: 28 }}>Sources</h3>
        <PecosSources />
        <p className="small" style={{ marginTop: 16 }}>SpreadRun is not affiliated with or endorsed by CMS. Where this check and the forms or regulations differ, the forms and regulations control.</p>
        <p className="small">More validators: <a href="/apis/pbj-staffing-qa">PBJ Staffing Data Pre-Submission QA</a> | <a href="/apis">the full catalog</a></p>
      </section>
    </Layout>
  );
}
