import Layout, { Crumbs } from '../site/Layout.jsx';
import CodeSample, { Json } from '../site/CodeSample.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import paidPass from '../content/examples/pecos-paid-pass.json';
import demoFail from '../content/examples/pecos-demo-fail.json';
import inputError from '../content/examples/pecos-input-error.json';
import { PecosSources } from './PecosApi.jsx';

const API = apiBySlug('pecos-enrollment-precheck');

const TOP = [
  ['enrollmentType', 'Required. 855I, 855B or 855S.'],
  ['applicationReason', 'initial (default), revalidation or change.'],
  ['asOf', 'Optional. YYYY-MM-DD the dates are checked against. Default: today (UTC).'],
  ['processingWindowDays', 'Optional. Whole number from 1 to 365, default 90. Your own planning assumption for how long the application takes; items expiring inside it are flagged.'],
  ['revalidationDueDate', 'For revalidations. YYYY-MM-DD, from the CMS revalidation lookup.'],
  ['provider', 'Required object: npi; legalName and irsLegalName (organizations, and individuals enrolling with an EIN); firstName and lastName (855I and DMEPOS sole proprietors); taxonomyCodes, a list with the primary first.'],
  ['practiceLocations', 'List of objects: name, street1, street2, city, state (2 letters), zip (ZIP+4 as 12345-6789), phone, isPrimary. For 855S also hoursPerWeek (posted hours open to the public) and hoursExceptionApplies.'],
  ['credentials', 'List of objects: type (license, certification, dea, liability_insurance, malpractice_insurance, surety_bond, accreditation), state, number, expirationDate (YYYY-MM-DD), notApplicable.'],
  ['officials', 'Organizations: list of objects with role, authorized or delegated. Names are not needed and not used.'],
  ['documents', 'List of the supporting document keys you have ready (table below).'],
  ['conditions', 'Object of true or false values that decide which documents and rules apply (table below). Anything left out is false.'],
];

const DOCS = {
  '855I': [['cp575', 'IRS confirmation of the TIN and legal business name', 'conditions.usesEin'], ['irs8832', 'IRS Form 8832', 'llcDisregarded'],
    ['irs501c3', 'IRS 501(c)(3) determination letter', 'nonprofit'], ['cms588', 'CMS-588 EFT authorization', 'unless eftNotNeeded'],
    ['cms460', 'CMS-460 participation agreement', 'participating'], ['adverseActions', 'Final adverse legal action documentation', 'hasAdverseActions'],
    ['certificationProof', 'Certification and proof of educational requirements', 'requiresCertification']],
  '855B': [['licenses', 'Licenses, certifications and registrations required by Medicare or State law', 'always'],
    ['cp575', 'IRS confirmation of the TIN and legal business name', 'unless cp575NotNeeded'], ['cms588', 'CMS-588 EFT authorization', 'unless eftNotNeeded'],
    ['cms460', 'CMS-460 participation agreement', 'participating'], ['adverseActions', 'Final adverse legal action documentation', 'hasAdverseActions'],
    ['ownershipChange', 'Bill of sale or sales agreement', 'ownershipChange'], ['orgChart', 'Organizational structure diagram', 'hasOrganizationalOwners'],
    ['idtfLiabilityInsurance', 'Comprehensive liability insurance policy (IDTFs)', 'idtf']],
  '855S': [['licenses', 'Professional and business licenses', 'always'], ['liabilityInsurance', 'Certificate of comprehensive liability insurance', 'always'],
    ['cp575', 'IRS document showing the TIN and legal business name', 'always'], ['cms588', 'CMS-588 EFT authorization', 'unless eftNotNeeded'],
    ['applicationFee', 'Proof of application fee payment', 'unless feeNotDue'], ['suretyBond', 'Copy of the surety bond', 'unless suretyBondExempt'],
    ['irs501c3', 'IRS 501(c)(3) determination letter', 'nonprofit'], ['adverseActions', 'Final adverse legal action documentation', 'hasAdverseActions'],
    ['contracts', 'Contracts for order filling, fabrication or fitting', 'contractedServices']],
};

const RULES = [
  ['PEC-NPI-MISSING', 'error', 'No NPI.'], ['PEC-NPI-FORMAT', 'error', 'The NPI is not 10 digits.'],
  ['PEC-NPI-CHECKDIGIT', 'error', 'The NPI fails the CMS check digit; the registry is not queried.'],
  ['PEC-NPPES-FOUND', 'error', 'The NPI is not in NPPES.'], ['PEC-NPPES-STATUS', 'error', 'The NPI is not active in NPPES.'],
  ['PEC-NPPES-TYPE', 'error or warning', 'Wrong NPI type for the form (individual for 855I, organization for 855B). Warning for an individual NPI on an 855S that is not a sole proprietorship.'],
  ['PEC-NPPES-NAME', 'error or warning', 'The name differs from the NPPES record (error for 855B, warning otherwise). Case and punctuation are ignored.'],
  ['PEC-NPPES-TAXONOMY', 'warning', 'A taxonomy code is not on the NPPES record.'], ['PEC-NPPES-TAXONOMY-PRIMARY', 'warning', 'The first code is not the primary taxonomy on the record.'],
  ['PEC-TAXONOMY-FORMAT', 'error', 'A taxonomy code is not 9 letters or digits followed by X.'], ['PEC-TAXONOMY-MISSING', 'warning', 'No taxonomy codes to compare.'],
  ['PEC-NAME-MISSING', 'error', 'Legal business name, or the practitioner\'s first and last name, missing.'],
  ['PEC-NAME-IRS-MISSING', 'error', 'No IRS name to compare with.'], ['PEC-NAME-IRS', 'error', 'The legal business name differs from the IRS name.'],
  ['PEC-NAME-IRS-PUNCT', 'warning', 'It differs only in punctuation or spacing.'],
  ['PEC-LOC-NONE', 'error or warning', 'No practice location (error for 855B and 855S).'],
  ['PEC-ADDR-REQUIRED', 'error', 'Street, city, state or ZIP missing.'], ['PEC-ADDR-POBOX', 'error', 'A P.O. box as the practice location.'],
  ['PEC-STATE', 'error', 'Not a 2-letter US state or territory code.'], ['PEC-ZIP-FORMAT', 'error', 'Not a 5-digit ZIP or ZIP+4.'],
  ['PEC-ZIP-PLUS4', 'warning', 'Only 5 digits; the forms ask for ZIP+4.'], ['PEC-PHONE-MISSING', 'warning', 'No telephone number.'],
  ['PEC-PHONE-FORMAT', 'warning', 'Not a 10-digit US number.'], ['PEC-HOURS-MISSING', 'error', '855S: no posted hours of operation.'],
  ['PEC-HOURS-30', 'warning', '855S: under 30 hours a week open to the public, with no exception set.'],
  ['PEC-CRED-TYPE', 'error', 'Unknown credential type.'], ['PEC-CRED-DATE', 'error', 'Expiration date not in YYYY-MM-DD form.'],
  ['PEC-CRED-EXPIRED', 'error', 'Expired on or before asOf.'], ['PEC-CRED-EXPIRING', 'warning', 'Expires inside the processing window.'],
  ['PEC-CRED-NO-EXPIRY', 'warning', 'No expiration date for an item that expires.'], ['PEC-CRED-LICENSE', 'warning', '855I: no state license listed.'],
  ['PEC-CRED-LIABILITY', 'error', '855S: no liability insurance.'], ['PEC-CRED-SURETY', 'error', '855S: no surety bond and no exemption set.'],
  ['PEC-DOC-MISSING', 'error', 'A supporting document the form asks for in your situation is not marked ready.'], ['PEC-DOC-UNKNOWN', 'warning', 'Document keys this form does not use.'],
  ['PEC-SIGN-ROLE', 'error', 'role is not authorized or delegated.'],
  ['PEC-SIGN-AUTHORIZED', 'error', 'No authorized official for an organization\'s initial enrollment or revalidation, or no authorized or delegated official for a change.'],
  ['PEC-REVAL-NO-DATE', 'warning', 'Revalidation with no due date.'], ['PEC-REVAL-DATE', 'error', 'Due date not in YYYY-MM-DD form.'],
  ['PEC-REVAL-PAST-DUE', 'error', 'The revalidation due date has passed.'],
];

const PY = `import json, os, requests

r = requests.post(
    "https://www.spreadrun.com/api/v1/pecos-enrollment-precheck",
    headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
    json=json.load(open("enrollment_draft.json")),
    timeout=60,
)
if r.status_code == 503:              # NPPES unreachable: not charged, try again later
    print(r.json()["error"]["message"])
else:
    r.raise_for_status()
    report = r.json()["report"]
    print(report["status"], [f["ruleId"] for f in report["findings"]])`;

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/pecos-enrollment-precheck" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data-binary @enrollment_draft.json`;

export default function DocsPecos() {
  const { notChecked, sources, findings: _f, ...shortReport } = paidPass.body.report;
  return (
    <Layout path={`/docs/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/docs', 'Docs'], [null, 'PECOS Medicare Enrollment Pre-Check']]} />
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>PECOS Medicare Enrollment Pre-Check API Reference</h1>
        <p className="lede" style={{ marginTop: 20 }}>Beta. Checks one provider's draft CMS-855I, 855B or 855S enrollment, revalidation or change as JSON, with one live NPPES lookup per run. <a href={`/apis/${API.slug}`}>Product page and free test form.</a></p>
        <nav className="toc" aria-label="On this page">
          <a href="#endpoint">Endpoint</a><a href="#input">Request</a><a href="#documents">Documents</a><a href="#report">Report</a><a href="#rules">Rule IDs</a><a href="#registry">Registry</a><a href="#errors">Errors</a><a href="#examples">Code samples</a>
        </nav>

        <h2 id="endpoint">Endpoint</h2>
        <table className="doc-table"><tbody>
          <tr><th>Paid</th><td><code>POST https://www.spreadrun.com/api/v1/{API.slug}</code>, API key required, {dollars(API.priceCents)} per completed pre-check</td></tr>
          <tr><th>Demo</th><td><code>POST https://www.spreadrun.com/api/demo/{API.slug}</code>, no key, 64 KB, 10 runs per day</td></tr>
          <tr><th>Body</th><td>A JSON object, UTF-8, up to 256 KB. Text values up to 300 characters; lists up to 200 items.</td></tr>
        </tbody></table>

        <h2 id="input">Request</h2>
        <table className="doc-table"><tbody>{TOP.map(([k, m]) => <tr key={k}><td><code>{k}</code></td><td>{m}</td></tr>)}</tbody></table>
        <p>Start from the <a href="/samples/pecos-clean.json">sample draft</a>; the practice and NPI are invented.</p>
        <p>Other conditions: <code>soleProprietor</code> (855S run by a sole proprietor: individual name, individual signs).</p>

        <h2 id="documents">Supporting documents</h2>
        <p>A document is required when its condition is true, or always, or unless the named condition is true. Keys not used by the form are reported once as a warning and ignored.</p>
        {Object.entries(DOCS).map(([form, rows]) => (
          <div key={form}>
            <h3>CMS-{form}</h3>
            <div className="table-scroll">
              <table className="doc-table">
                <thead><tr><th>Key</th><th>Document</th><th>Required when</th></tr></thead>
                <tbody>{rows.map(([k, d, c]) => <tr key={k}><td><code>{k}</code></td><td>{d}</td><td>{c}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        ))}

        <h2 id="report">Report</h2>
        <table className="doc-table">
          <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>status</code></td><td><code>FAIL</code> if any error, <code>WARN</code> if only warnings, otherwise <code>PASS</code>. A clean pre-check does not guarantee that the enrollment will be approved.</td></tr>
            <tr><td><code>readiness</code></td><td>The submission-readiness checklist: one item per area (npi, names, taxonomy, addresses, credentials, documents, signatures, revalidation) with <code>status</code> ready, review, fail, not-checked or not-applicable.</td></tr>
            <tr><td><code>findings</code></td><td>Up to 500, errors first. Each has <code>severity</code>, <code>ruleId</code>, <code>path</code> (such as <code>/practiceLocations[0]/zip</code>), <code>message</code> and, for most rules, <code>source</code>. Findings never repeat a name, number or date from the input.</td></tr>
            <tr><td><code>enrollmentType</code>, <code>applicationReason</code>, <code>asOf</code>, <code>processingWindowDays</code>, <code>windowEnds</code></td><td>What was checked and the window used.</td></tr>
            <tr><td><code>registry</code></td><td>Whether NPPES was queried in this run. No registry data is returned.</td></tr>
            <tr><td><code>counts</code>, <code>findingCount</code>, <code>findingCounts</code>, <code>ruleCounts</code></td><td>Totals.</td></tr>
            <tr><td><code>notChecked</code>, <code>sources</code>, <code>scope</code>, <code>input</code>, <code>inputSha256</code></td><td>What the report does not cover, where the rules come from, what the verdict means, and a fingerprint of the request body.</td></tr>
          </tbody>
        </table>

        <h2 id="rules">Rule IDs</h2>
        <div className="table-scroll">
          <table className="doc-table">
            <thead><tr><th>Rule</th><th>Severity</th><th>Meaning</th></tr></thead>
            <tbody>{RULES.map(([id, sev, m]) => <tr key={id}><td><code>{id}</code></td><td>{sev}</td><td>{m}</td></tr>)}</tbody>
          </table>
        </div>
        <p>Source keys, as returned in every report:</p>
        <table className="doc-table"><tbody>{Object.entries(sources).map(([k, v]) => <tr key={k}><td><code>{k}</code></td><td>{v}</td></tr>)}</tbody></table>
        <PecosSources />
        <h3>Not checked</h3>
        <ul>{notChecked.map((n) => <li key={n}>{n}</li>)}</ul>

        <h2 id="registry">The NPPES lookup</h2>
        <p>When the NPI passes the format and check digit tests, each run makes one request to the public NPPES NPI Registry API (version 2.1) with that NPI and nothing else. The answer is used to run the registry rules and then discarded: it is not stored, cached between runs or included in the response. If the registry cannot be reached, the call returns HTTP 503 with the code <code>registry_unavailable</code> and is not charged.</p>

        <h2>Example responses</h2>
        <p>A paid pre-check of the <a href="/samples/pecos-clean.json">sample draft</a> (report shortened), and the findings from a demo run of the <a href="/samples/pecos-errors.json">sample with errors</a>. Both generated by running the real endpoint code; because the sample NPI is invented, the registry answer in these two examples is simulated.</p>
        <Json value={{ ...paidPass.body, report: shortReport }} />
        <Json value={demoFail.body.report.findings.slice(0, 5)} />

        <h2 id="errors">Errors</h2>
        <p>See the <a href="/docs#errors">shared error table</a>. Rejected with HTTP 400 and not charged: a body that is not a JSON object, an enrollmentType other than 855I, 855B or 855S, a missing provider, wrong value types, an out-of-range processingWindowDays. HTTP 503 <code>registry_unavailable</code>: NPPES could not be reached; not charged. Example (HTTP {inputError.status}):</p>
        <Json value={inputError.body} />

        <h2 id="examples">Code samples</h2>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </div>
    </Layout>
  );
}
