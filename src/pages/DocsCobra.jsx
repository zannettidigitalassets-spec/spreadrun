import Layout, { Crumbs } from '../site/Layout.jsx';
import CodeSample, { Json } from '../site/CodeSample.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import paidPass from '../content/examples/cobra-paid-pass.json';
import demoFail from '../content/examples/cobra-demo-fail.json';
import inputError from '../content/examples/cobra-input-error.json';
import { CobraSources, ELECTION_ITEMS, GENERAL_ITEMS, ItemList } from './CobraApi.jsx';

const API = apiBySlug('cobra-notice-qa');

const TOP = [
  ['noticeType', 'Required. election or general.'],
  ['noticeText', 'The notice as plain text, up to 200,000 characters. Send this or noticeFile.'],
  ['noticeFile', 'Object: type (pdf or docx) and base64, up to 3 MB before encoding. A PDF needs a text layer; scanned images are rejected.'],
  ['noticeDate', 'YYYY-MM-DD the notice goes out. Default: asOf.'],
  ['asOf', 'Optional. YYYY-MM-DD used when noticeDate is missing. Default: today (UTC).'],
  ['qualifyingEvent.type', 'Election notices, required: termination, reduction-of-hours, death, medicare-entitlement, bankruptcy, divorce, legal-separation or dependent-child.'],
  ['qualifyingEvent.date', 'Election notices: YYYY-MM-DD of the qualifying event. Needed for the deadline math.'],
  ['qualifyingEvent.lossOfCoverageDate', 'YYYY-MM-DD plan coverage ends. Used for the 60-day election period and to compare with the end date stated in the notice.'],
  ['qualifyingEvent.employerIsAdministrator', 'true (default) for the 44-day rule; false when a separate administrator sends the notice.'],
  ['qualifyingEvent.periodStartsAtLossOfCoverage', 'true when the plan starts the notice period at the loss of coverage instead of the event.'],
  ['qualifyingEvent.administratorNotifiedDate', 'YYYY-MM-DD the administrator was notified. Needed for a separate administrator and for divorce, legal separation or loss of dependent status.'],
  ['coverageStartDate', 'General notices: YYYY-MM-DD plan coverage began, for the 90-day deadline.'],
];

const RULES = [
  ['COBRA-E01-PLAN', 'warning', '(i) No plan name ending in "Plan".'], ['COBRA-E01-ADMIN', 'error', '(i) No administrator named.'],
  ['COBRA-E01-PHONE', 'error', '(i) No telephone number.'], ['COBRA-E01-ADDRESS', 'error', '(i) No mailing address.'],
  ['COBRA-E02-EVENT', 'error', '(ii) The qualifying event is not identified.'], ['COBRA-E02-TYPE', 'warning', '(ii) The notice does not name the event type you gave.'],
  ['COBRA-E03-BENEFICIARIES', 'error', '(iii) Qualified beneficiaries not identified.'], ['COBRA-E03-END-DATE', 'error', '(iii) No date on which coverage ends.'],
  ['COBRA-E04-INDEPENDENT', 'error', '(iv) No independent right to elect.'], ['COBRA-E04-ON-BEHALF', 'warning', '(iv) Electing on behalf of others not mentioned.'],
  ['COBRA-E04-GUARDIAN', 'warning', '(iv) Parent or legal guardian not mentioned.'],
  ['COBRA-E05-PROCEDURE', 'error', '(v) How to elect is not explained.'], ['COBRA-E05-PERIOD', 'error', '(v) No election period.'],
  ['COBRA-E05-DATE', 'error', '(v) No specific date by which to elect.'],
  ['COBRA-E06-CONSEQUENCES', 'error', '(vi) Consequences of not electing or waiving not explained.'], ['COBRA-E06-REVOKE', 'error', '(vi) Revoking a waiver not described.'],
  ['COBRA-E06-OTHER-RIGHTS', 'warning', '(vi) Effect on other coverage rights, such as special enrollment, not mentioned.'],
  ['COBRA-E07-COVERAGE', 'error', '(vii) Coverage offered not described, and no reference to the SPD.'], ['COBRA-E07-START', 'warning', '(vii) When coverage begins not stated.'],
  ['COBRA-E08-MAXIMUM', 'error', '(viii) Maximum period not stated in months.'], ['COBRA-E08-EARLY-END', 'error', '(viii) Early termination not explained.'],
  ['COBRA-E09-DISABILITY', 'error', '(ix) Disability extension not described.'], ['COBRA-E09-SECOND-EVENT', 'error', '(ix) Second qualifying event extension not described.'],
  ['COBRA-E10-SSA', 'error', '(x) 18-month notices: no Social Security disability notice duty.'], ['COBRA-E10-TIMING', 'error', '(x) No time limit for those notices.'],
  ['COBRA-E10-NO-LONGER', 'error', '(x) No duty to report a beneficiary is no longer disabled.'],
  ['COBRA-E11-AMOUNT', 'error', '(xi) No premium amount in dollars.'],
  ['COBRA-E12-DUE', 'error', '(xii) No payment due dates.'], ['COBRA-E12-MONTHLY', 'error', '(xii) Right to pay monthly not stated.'],
  ['COBRA-E12-GRACE', 'error', '(xii) No grace period.'], ['COBRA-E12-ADDRESS', 'error', '(xii) No address to send payments to.'],
  ['COBRA-E12-LATE', 'error', '(xii) Consequences of late payment or non-payment not explained.'],
  ['COBRA-E13-ADDRESSES', 'error', '(xiii) Keeping addresses current not explained.'], ['COBRA-E14-STATEMENT', 'error', '(xiv) No "does not fully describe" statement.'],
  ['COBRA-G01-PLAN', 'warning', 'General (1): no plan name.'], ['COBRA-G01-PHONE', 'error', 'General (1): no telephone number.'], ['COBRA-G01-ADDRESS', 'error', 'General (1): no address.'],
  ['COBRA-G02-WHO', 'error', 'General (2): who may become a qualified beneficiary.'], ['COBRA-G02-EVENTS', 'error', 'General (2): the qualifying events.'],
  ['COBRA-G02-EMPLOYER', 'error', 'General (2): the employer\'s duty to notify the administrator.'], ['COBRA-G02-MAXIMUM', 'error', 'General (2): the maximum period.'],
  ['COBRA-G02-EXTENSION', 'error', 'General (2): extensions.'], ['COBRA-G02-PREMIUM', 'error', 'General (2): paying for coverage.'],
  ['COBRA-G03-EVENTS', 'error', 'General (3): divorce, legal separation and dependent status as events to report.'],
  ['COBRA-G03-PROCEDURE', 'error', 'General (3): how and by when to report them.'], ['COBRA-G04-SSA', 'error', 'General (4): reporting a disability determination.'],
  ['COBRA-G05-ADDRESSES', 'error', 'General (5): keeping addresses current.'], ['COBRA-G06-STATEMENT', 'error', 'General (6): "does not fully describe" statement.'],
  ['COBRA-DEADLINE-LATE', 'error', 'The notice goes out after its deadline.'], ['COBRA-EMPLOYER-LATE', 'error', 'The employer notified a separate administrator more than 30 days after the event.'],
  ['COBRA-DEADLINE-UNKNOWN', 'warning', 'A date needed for the deadline is missing.'], ['COBRA-DATE-MISSING', 'error', 'No qualifying event date.'],
  ['COBRA-DATE-FORMAT', 'error', 'A date is not YYYY-MM-DD.'], ['COBRA-DATE-ORDER', 'warning', 'Loss of coverage before the event.'],
  ['COBRA-CONSIST-ELECTION-DATE', 'error', 'The stated election deadline is less than 60 days after the later of the loss of coverage and the notice.'],
  ['COBRA-CONSIST-COVERAGE-END', 'warning', 'The stated coverage end date differs from lossOfCoverageDate.'],
  ['COBRA-CONSIST-FIRST-PAYMENT', 'error', 'The first payment is due sooner than 45 days after the election.'],
  ['COBRA-CONSIST-GRACE', 'error', 'A grace period shorter than 30 days.'],
  ['COBRA-CONSIST-DURATION', 'error', 'The months stated do not include 18 (termination, reduced hours) or 36 (other events).'],
  ['COBRA-CONSIST-PREMIUM-PCT', 'error', 'A premium above 102 percent (other than 150 percent).'],
  ['COBRA-MEDICARE', 'warning', 'Election notices: Medicare not mentioned.'], ['COBRA-PII-SSN', 'warning', 'Something that looks like a Social Security number.'],
];

const PY = `import json, os, requests

r = requests.post(
    "https://www.spreadrun.com/api/v1/cobra-notice-qa",
    headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
    json=json.load(open("notice_request.json")),
    timeout=60,
)
r.raise_for_status()
report = r.json()["report"]
print(report["status"], [x["item"] for x in report["checklist"] if x["status"] == "missing"])`;

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/cobra-notice-qa" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data-binary @notice_request.json`;

export default function DocsCobra() {
  const { notChecked, sources, findings: _f, ...shortReport } = paidPass.body.report;
  return (
    <Layout path={`/docs/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/docs', 'Docs'], [null, 'COBRA Notice Content QA']]} />
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>COBRA Notice Content QA API Reference</h1>
        <p className="lede" style={{ marginTop: 20 }}>Beta. Checks one draft COBRA election notice against 29 CFR 2590.606-4(b)(4), or general notice against 2590.606-1(c), plus the deadlines and the dates and payment terms it states. <a href={`/apis/${API.slug}`}>Product page and free test form.</a></p>
        <nav className="toc" aria-label="On this page">
          <a href="#endpoint">Endpoint</a><a href="#input">Request</a><a href="#items">Content items</a><a href="#method">How it checks</a><a href="#report">Report</a><a href="#rules">Rule IDs</a><a href="#errors">Errors</a><a href="#examples">Code samples</a>
        </nav>

        <h2 id="endpoint">Endpoint</h2>
        <table className="doc-table"><tbody>
          <tr><th>Paid</th><td><code>POST https://www.spreadrun.com/api/v1/{API.slug}</code>, API key required, {dollars(API.priceCents)} per completed QA run</td></tr>
          <tr><th>Demo</th><td><code>POST https://www.spreadrun.com/api/demo/{API.slug}</code>, no key, 10 runs per day. Runs the three published sample requests only (<a href="/samples/cobra-election-clean.json">election notice</a>, <a href="/samples/cobra-election-errors.json">with errors</a>, <a href="/samples/cobra-general-clean.json">general notice</a>); spacing and key order do not matter, any changed value does. Your own notice goes to the paid endpoint.</td></tr>
          <tr><th>Body</th><td>A JSON object, UTF-8, up to 4.4 MB.</td></tr>
        </tbody></table>

        <h2 id="input">Request</h2>
        <table className="doc-table"><tbody>{TOP.map(([k, m]) => <tr key={k}><td><code>{k}</code></td><td>{m}</td></tr>)}</tbody></table>
        <p>Start from the <a href="/samples/cobra-election-clean.json">sample election notice request</a> or the <a href="/samples/cobra-general-clean.json">general notice request</a>. The plan and administrator are invented, and beneficiaries are named by status. Finished notices with names are accepted; they are processed in memory and not stored.</p>

        <h2 id="items">Content items</h2>
        <h3>Election notice, 29 CFR 2590.606-4(b)(4)</h3>
        <ItemList items={ELECTION_ITEMS} />
        <p>Item (x) applies only when the coverage offered lasts less than 36 months, so it is checked for termination and reduction of hours.</p>
        <h3>General notice, 29 CFR 2590.606-1(c)</h3>
        <ItemList items={GENERAL_ITEMS} />

        <h2 id="method">How it checks</h2>
        <ul>
          <li>Each item is a set of fixed patterns over the notice text. A missing pattern that the item needs is an error; a missing detail that is easy to word differently is a warning. Patterns can miss unusual wording and can be satisfied by wording that is not adequate, so read each finding against your notice.</li>
          <li>Dates in the notice are read in the forms October 9, 2026, 10/09/2026 and 2026-10-09. The election deadline is a date in a sentence about electing by, before or no later than a date.</li>
          <li>Deadlines: 44 days from the event (or the loss of coverage, if the plan says so) when the employer is the administrator; 14 days from the administrator being notified otherwise, with the employer's 30 days checked too; 90 days from the start of coverage for a general notice.</li>
          <li>The election period must end no earlier than 60 days after the later of the loss of coverage (or the event, if not given) and the notice date.</li>
        </ul>

        <h2 id="report">Report</h2>
        <table className="doc-table">
          <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>status</code></td><td><code>FAIL</code> if any error, <code>WARN</code> if only warnings, otherwise <code>PASS</code>. A PASS is not legal advice and not a guarantee against penalties.</td></tr>
            <tr><td><code>checklist</code></td><td>One entry per content item: <code>item</code>, <code>label</code>, <code>status</code> found, review or missing.</td></tr>
            <tr><td><code>contentItems</code></td><td>Required, found and missing counts.</td></tr>
            <tr><td><code>deadlines</code></td><td>Computed dates: <code>electionNoticeDue</code> or <code>generalNoticeDue</code>, <code>electionPeriodEndsNoEarlierThan</code>, <code>employerToAdministratorBy</code> where it applies, and the <code>rule</code> used.</td></tr>
            <tr><td><code>readiness</code></td><td>The send-readiness checklist: content, deadline, consistency, medicare and privacy, each ready, review, fix or not-checked.</td></tr>
            <tr><td><code>findings</code></td><td>Errors first. Each has <code>severity</code>, <code>ruleId</code>, <code>item</code>, <code>path</code>, <code>message</code> and <code>source</code>. Findings never repeat text, amounts, names or dates from the notice.</td></tr>
            <tr><td><code>regulation</code>, <code>notChecked</code>, <code>sources</code>, <code>scope</code>, <code>input</code>, <code>inputSha256</code></td><td>The content list used, what the report does not cover, where the rules come from, what the verdict means, and a fingerprint of the request body.</td></tr>
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
        <CobraSources />
        <h3>Not checked</h3>
        <ul>{notChecked.map((n) => <li key={n}>{n}</li>)}</ul>

        <h2>Example responses</h2>
        <p>A paid check of the <a href="/samples/cobra-election-clean.json">sample election notice</a> (report shortened), and the findings from a demo run of the <a href="/samples/cobra-election-errors.json">sample with errors</a>. Both generated by running the real endpoint code.</p>
        <Json value={{ ...paidPass.body, report: shortReport }} />
        <Json value={demoFail.body.report.findings.slice(0, 6)} />

        <h2 id="errors">Errors</h2>
        <p>See the <a href="/docs#errors">shared error table</a>. Rejected with HTTP 400 and not charged: a body that is not a JSON object, a noticeType other than election or general, both or neither of noticeText and noticeFile, a file that cannot be read, a scanned PDF with no text, an unknown qualifying event type, or wrong value types; on the demo endpoint, anything other than a sample request. Example (HTTP {inputError.status}):</p>
        <Json value={inputError.body} />

        <h2 id="examples">Code samples</h2>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </div>
    </Layout>
  );
}
