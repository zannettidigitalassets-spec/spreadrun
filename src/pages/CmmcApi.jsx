import Badges from '../site/Badges.jsx';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import CodeSample from '../site/CodeSample.jsx';
import CmmcDemo from '../site/CmmcDemo.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import example from '../content/examples/cmmc-demo-fail.json';

const API = apiBySlug('cmmc-self-assessment-validator');

// Every fact on this page was checked against these documents (October 2026). Left out for lack of a primary source:
// the exact date of the Phase 2 suspension memo (only law firm summaries carry it), and any claim about how common
// overstated scores are. Older DFARS clause numbers are not used.
export const CMMC_SOURCES = [
  ['32 CFR 170.24: CMMC Scoring Methodology', 'https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-G/part-170/subpart-D/section-170.24'],
  ['32 CFR 170.21: Plan of Action and Milestones requirements', 'https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-G/part-170/subpart-D/section-170.21'],
  ['32 CFR 170.16: CMMC Level 2 self-assessment and affirmation', 'https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-G/part-170/subpart-C/section-170.16'],
  ['32 CFR 170.22: Affirmation', 'https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-G/part-170/subpart-D/section-170.22'],
  ['DFARS 252.204-7021: Contractor compliance with the CMMC level requirement', 'https://www.acquisition.gov/dfars/252.204-7021-contractor-compliance-cybersecurity-maturity-model-certification-level-requirements.'],
  ['NIST SP 800-171 Rev 2: Protecting CUI in nonfederal systems', 'https://csrc.nist.gov/pubs/sp/800/171/r2/upd1/final'],
  ['NIST SP 800-171A: Assessing security requirements for CUI', 'https://csrc.nist.gov/pubs/sp/800/171/a/final'],
  ['DoD CIO: implementing the suspension of CMMC Phase 2', 'https://dodcio.defense.gov/Portals/0/Documents/Library/ImplementingSuspensionCMMC-PhaseII.pdf'],
  ['DOJ: $4.6 million settlement over cybersecurity requirements (March 2025)', 'https://www.justice.gov/opa/pr/defense-contractor-morsecorp-inc-agrees-pay-46-million-settle-cybersecurity-fraud'],
  ['DOJ: $507,144 settlement after a DoD assessment score of -170 (June 2026)', 'https://www.justice.gov/opa/pr/alabama-defense-contractor-agrees-pay-507144-resolve-false-claims-act-liability-relating'],
  ['DLA: the CAGE code is five characters', 'https://www.dla.mil/Portals/104/Documents/DLMS/CDS/PCDC/PCDC_0036-Updates_to_DoD_Debarment_Proposal_Initiators_Symbol_Volume_10_Table_183.pdf'],
];

export const CMMC_FAQ = [
  ['Does a PASS mean we are compliant, or that DoD will accept our score?',
    'No. A PASS means the score you plan to post matches the published scoring method applied to the results you entered, and that the package has what SPRS and the affirmation need. SpreadRun cannot see your systems or evidence, so it cannot tell whether a requirement is really MET. A verified score is arithmetic, not a CMMC certification or assessment, and not legal or compliance advice.'],
  ['The scoring method is public. Why pay for this?',
    'It is public, and free scoring spreadsheets exist. If a spreadsheet works for you, use it. What this adds: the math checked against the regulation with the rule cited on every finding, the POA&M limits a spreadsheet usually skips (which requirements may never be on one, and the partial-credit exceptions), the SPRS and affirmation details, and an API so a consultant or MSP can run every client the same way.'],
  ['How is the score calculated?',
    'Start at 110, one point per requirement. For each requirement NOT MET, subtract its value from 32 CFR 170.24: 5, 3 or 1 point. Two requirements give partial credit: 3.5.3 costs 3 points instead of 5 if multifactor authentication covers only remote and privileged users, and 3.13.11 costs 3 instead of 5 if encryption is used but is not FIPS-validated. N/A counts as MET. The lowest possible score is -203. Without a system security plan (3.12.4) there is no score at all.'],
  ['What makes a score Conditional or Final?',
    'Final Level 2 (Self) needs every requirement MET or N/A: 110. Conditional needs a score of at least 0.8 of 110, which is 88, with every NOT MET requirement allowed on a POA&M: only 1-point requirements, plus 3.13.11 when encryption is used but not FIPS-validated, and never 3.1.20, 3.1.22, 3.10.3, 3.10.4, 3.10.5 or 3.12.4. The POA&M must then be closed out within 180 days of the CMMC Status Date, or the conditional status expires.'],
  ['Does the Phase 2 suspension change anything here?',
    'Not for self-assessments. DoD suspended the planned November 2026 move to Phase 2, which leaves Level 1 (Self) and Level 2 (Self) as the designations in use. Where a contract includes DFARS 252.204-7021, the contractor still enters current self-assessment results in SPRS and keeps an annual affirmation current. Check the sources below for anything newer.'],
  ['Why do you not ask for the Affirming Official\'s name?',
    'Because nothing in the check needs it, and SpreadRun does not take personal data. The affirmation checks are yes or no: is the official named, are title and contact information included, and has the statement been made.'],
  ['Is my data stored?',
    'No. The package is processed in memory for the length of the request and is not stored or shared. The report names requirement IDs and rules, never your CAGE codes, dates or the score you claimed. For billing and usage we log the time, endpoint, result status, size and duration, never the contents.'],
  ['When is a run charged?',
    `When the verification finishes and returns a report, whether it says PASS, WARN or FAIL: ${dollars(API.priceCents)} per completed verification. Requests rejected before a report exists are free, such as a body that is not JSON, a level other than 2, or no requirement results.`],
  ['Can I try it for free?',
    `Yes, on the three sample packages on this page: a clean 110, a conditional result and a package with errors. They run free, up to 10 times a day. Verifying your own results, through the walk-through or a CSV, is the paid verification: sign in with at least ${dollars(API.priceCents)} of credit and run it from the same form, or call the API.`],
];

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/cmmc-self-assessment-validator" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data-binary @self_assessment.json`;

const PY = `import csv, json, os, requests

# One client per call: the results you keep as CSV, plus the SPRS details.
package = {
    "assessment": {
        "level": 2, "assessmentDate": "2026-09-15", "claimedScore": 104,
        "cageCodes": ["00000"], "scopeDefined": True, "sspInPlace": True, "poamInPlace": True,
    },
    "affirmation": {
        "affirmingOfficialIdentified": True, "titleAndContactProvided": True,
        "statementAffirmed": True, "affirmationDate": "2026-09-16",
    },
    "requirementsCsv": open("results.csv").read(),
}
r = requests.post(
    "https://www.spreadrun.com/api/v1/cmmc-self-assessment-validator",
    headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
    json=package,
    timeout=60,
)
r.raise_for_status()
report = r.json()["report"]
print(report["verifiedScore"], report["band"]["label"], report["status"])`;

export function CmmcSources() {
  return <ul className="small">{CMMC_SOURCES.map(([label, url]) => <li key={url}><a href={url}>{label}</a></li>)}</ul>;
}

export default function CmmcApi() {
  return (
    <Layout path={`/apis/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/apis', 'APIs'], [null, 'CMMC Self-Assessment Score Validator']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <Badges api={API} style={{ marginBottom: 14 }} />
        <h1>CMMC Self-Assessment Score Validator</h1>
        <p className="lede" style={{ marginTop: 20 }}>Check the math before you post it. Send your CMMC Level 2 self-assessment results, all 110 NIST SP 800-171 Rev 2 requirements, with the details that go into SPRS. You get back the score recomputed with the published DoD method, whether it matches the score you planned to post, what the result qualifies for, and every gap in the package, each with its rule and source.</p>
        <h2 style={{ marginTop: 32 }}>Why the number matters</h2>
        <ul className="costs">
          <li><b>The score is yours to stand behind.</b> A Level 2 self-assessment is posted in SPRS and affirmed by a senior official, at each assessment and every year after.</li>
          <li><b>False Claims Act exposure.</b> In March 2025 a defense contractor paid $4.6 million to settle allegations that included a posted score of 104 that a consultant later put at -142. In June 2026 another paid $507,144 after a DoD assessment scored it -170, near the bottom of the -203 to 110 range.</li>
          <li><b>Self-assessment carries the weight.</b> DoD suspended the planned November 2026 move to Phase 2, so Level 2 (Self) stays the designation for CUI work.</li>
        </ul>
        <p className="small">Sources: the DOJ releases, DFARS 252.204-7021 and the DoD CIO memo, linked at the bottom of this page.</p>
        <div className="note">
          <p><b>Where this fits.</b> SPRS has no file upload for this: you type the score and details into SPRS yourself. SpreadRun checks the package before you do. The scoring method is public and free spreadsheets exist; what this adds is verified math with the rule cited on every finding, the POA&amp;M limits spreadsheets tend to skip, the SPRS and affirmation checks, and an API for consultants and MSPs who run many clients.</p>
        </div>
        <div className="note">
          <p><b>A verified score is arithmetic, not a certification.</b> It is computed from the results you enter. It is not a CMMC assessment, not legal or compliance advice, and a PASS does not mean your company meets NIST SP 800-171 or that DoD will accept the score.</p>
        </div>
        <div className="btn-row">
          <a className="btn" href="#demo">Verify a score</a>
          <a className="btn secondary" href="/samples/cmmc-template.csv">Download the CSV template</a>
        </div>
      </div>

      <section className="section wrap split" aria-labelledby="checks">
        <div>
          <h2 id="checks">What it checks</h2>
          <ul className="checklist">
            <li><b>The score.</b> 110 minus the published value of each requirement NOT MET: 5, 3 or 1 point, with partial credit only for 3.5.3 (multifactor authentication) and 3.13.11 (FIPS-validated cryptography). N/A counts as MET.</li>
            <li><b>Your claimed score.</b> Flagged if it does not match the recomputed score, or falls outside -203 to 110.</li>
            <li><b>Completeness.</b> All 110 requirements, each once, with a valid result. Unknown or duplicate rows are flagged.</li>
            <li><b>The system security plan.</b> 3.12.4 must be MET. Without an SSP no score can be posted.</li>
            <li><b>POA&amp;M rules.</b> A POA&amp;M for every NOT MET requirement, and each one allowed on a POA&amp;M: 1-point requirements, plus 3.13.11 when encryption is not FIPS-validated, never the six that are excluded.</li>
            <li><b>The threshold.</b> Final (110), Conditional (at least 88, every gap allowed on a POA&amp;M), or no Level 2 (Self) status, with the 180-day POA&amp;M closeout window when you give the CMMC Status Date.</li>
            <li><b>SPRS details.</b> At least one CAGE code, each five characters; a defined assessment scope; an assessment date that is real, not in the future and under three years old.</li>
            <li><b>The affirmation.</b> Official named, title and contact included, statement made, dated on or after the assessment and within the last year.</li>
          </ul>
          <p>Every report ends with a submission checklist: each area marked Ready, Review or Fix.</p>
        </div>
        <div>
          <h2>Who it's for</h2>
          <ul>
            <li><b>Defense contractors and subcontractors:</b> check the number before the senior official affirms it.</li>
            <li><b>MSPs and MSSPs:</b> run every client through the same check, from a script.</li>
            <li><b>Readiness consultants:</b> a second look at a client's math, with the rule behind each finding.</li>
            <li><b>Software and automation:</b> a plain REST endpoint with JSON in and JSON out.</li>
          </ul>
          <h3 style={{ marginTop: 24 }}>Not checked</h3>
          <ul className="small">
            <li>Whether each requirement is really MET. SpreadRun never sees your systems, evidence or SSP.</li>
            <li>Whether your scope, asset categories and CAGE codes are the right ones for your contracts.</li>
            <li>Whether a CAGE code is registered to you. Only the format is checked.</li>
            <li>The SPRS entry itself.</li>
            <li>Level 1 and Level 3, and C3PAO certification assessments.</li>
          </ul>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="how">
        <h2 id="how">Input and output</h2>
        <ol className="steps">
          <li><h3>Send</h3><p>JSON with <code>assessment</code> (level 2, assessment date, claimed score, CAGE codes, and yes or no for scope, SSP and POA&amp;M), <code>affirmation</code> (yes or no for each part, and the date), and the 110 results as a list or as the CSV you already keep. Up to 256 KB.</p></li>
          <li><h3>Check</h3><p>Every rule on this page. No network calls, nothing stored.</p></li>
          <li><h3>Report</h3><p>JSON with <code>verifiedScore</code>, <code>band</code>, <code>claimedScore</code>, <code>deductions</code> (requirement and points), <code>readiness</code> (the checklist) and <code>findings</code> (severity, ruleId, path, requirement, message, source).</p></li>
        </ol>
        <p className="small">Every field and all rule IDs are in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
      </section>

      <section className="section wrap" id="demo" aria-labelledby="demo-h">
        <h2 id="demo-h">Try it now</h2>
        <p>The sample packages run free. Your own results, answered here or uploaded as a CSV, run as a paid verification at {dollars(API.priceCents)} from your credit.</p>
        <CmmcDemo api={API} sample={example.body.report} />
      </section>

      <section className="section wrap" aria-labelledby="price-h">
        <h2 id="price-h">Pricing</h2>
        <p><b>{dollars(API.priceCents)} per completed verification.</b> One self-assessment, one full report.</p>
        <ul>
          <li>Billed when a report is produced, PASS, WARN or FAIL. Invalid input is never billed.</li>
          <li>Paid from the same prepaid credits as every SpreadRun API, in $5, $20, $50 or $100 packs. A $50 pack covers {Math.floor(5000 / API.priceCents)} verifications and a $100 pack covers {Math.floor(10000 / API.priceCents)}. Credits never expire. <a href="/apis#pricing">All pricing</a></li>
          <li>Running many clients? <a href="/contact">Talk to us</a> first so we can tell you honestly whether this fits.</li>
        </ul>
        <div className="btn-row"><a className="btn" href="#demo">Verify a score</a><a className="btn secondary" href="/account">Get API access</a></div>
      </section>

      <section className="section wrap" aria-labelledby="code-h">
        <h2 id="code-h">Call it from code</h2>
        <p>Fields, rule IDs, error codes and limits are in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={CMMC_FAQ} />
        <h3 style={{ marginTop: 28 }}>Sources</h3>
        <CmmcSources />
        <p className="small" style={{ marginTop: 16 }}>SpreadRun is not affiliated with or endorsed by the Department of Defense, NIST or the Cyber AB. Where this check and the regulations differ, the regulations control.</p>
        <p className="small">More validators: <a href="/apis/wh347-payroll-precheck">WH-347 Certified Payroll Pre-Check</a> | <a href="/apis">the full catalog</a></p>
      </section>
    </Layout>
  );
}
