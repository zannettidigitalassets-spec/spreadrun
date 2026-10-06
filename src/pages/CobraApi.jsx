import Badges from '../site/Badges.jsx';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import CodeSample from '../site/CodeSample.jsx';
import CobraDemo from '../site/CobraDemo.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import example from '../content/examples/cobra-demo-fail.json';

const API = apiBySlug('cobra-notice-qa');

// Every fact on this page was checked against these documents (October 2026). Left out for lack of a primary source:
// specific penalty amounts from recent cases (only law firm summaries carry them) and the separate excise tax figure.
export const COBRA_SOURCES = [
  ['29 CFR 2590.606-4: election notice (deadlines and the fourteen content items)', 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XXV/subchapter-L/part-2590/subpart-A/section-2590.606-4'],
  ['29 CFR 2590.606-1: general notice (deadline and the six content items)', 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XXV/subchapter-L/part-2590/subpart-A/section-2590.606-1'],
  ['29 CFR 2590.606-2: employer notice to the administrator', 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XXV/subchapter-L/part-2590/subpart-A/section-2590.606-2'],
  ['29 CFR 2590.606-3: notices from qualified beneficiaries', 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XXV/subchapter-L/part-2590/subpart-A/section-2590.606-3'],
  ['26 CFR 54.4980B-6: the election period', 'https://www.law.cornell.edu/cfr/text/26/54.4980B-6'],
  ['26 CFR 54.4980B-7: maximum coverage periods', 'https://www.law.cornell.edu/cfr/text/26/54.4980B-7'],
  ['26 CFR 54.4980B-8: premiums and payment timing', 'https://www.law.cornell.edu/cfr/text/26/54.4980B-8'],
  ['26 CFR 54.4980B-2: which employers are covered', 'https://www.law.cornell.edu/cfr/text/26/54.4980B-2'],
  ['29 USC 1132(c)(1): penalties for failing to give notice', 'https://www.law.cornell.edu/uscode/text/29/1132'],
  ['29 CFR 2575.502c-1: the $110 daily maximum', 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XXV/part-2575/section-2575.502c-1'],
  ['DOL: An Employer\'s Guide to Group Health Continuation Coverage Under COBRA', 'https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/publications/an-employers-guide-to-group-health-continuation-coverage-under-cobra'],
  ['DOL: COBRA model notices FAQ (May 2020)', 'https://www.dol.gov/sites/dolgov/files/EBSA/about-ebsa/our-activities/resource-center/faqs/cobra-model-notices.pdf'],
  ['Morehouse v. Steak n Shake (6th Cir. 2019): medical bills awarded under the "other relief" language, reversed on other grounds', 'https://law.justia.com/cases/federal/appellate-courts/ca6/18-4186/18-4186-2019-09-13.html'],
  ['Howard v. Ivy Creek of Tallapoosa (M.D. Ala. 2022): delegating the notice does not shift liability', 'https://law.justia.com/cases/federal/district-courts/alabama/almdce/3:2020cv00213/72466/76/'],
];

// 29 CFR 2590.606-4(b)(4)(i) to (xiv), shortened. The regulation text controls.
export const ELECTION_ITEMS = [
  ['i', 'The plan\'s name, and the name, address and telephone number of whoever administers COBRA coverage.'],
  ['ii', 'The qualifying event.'],
  ['iii', 'The qualified beneficiaries who may elect, by status or name, and the date plan coverage ends or ended.'],
  ['iv', 'That each qualified beneficiary has an independent right to elect, that the employee or spouse may elect for the others, and that a parent or legal guardian may elect for a minor child.'],
  ['v', 'How to elect, the election period, and the date by which the election must be made.'],
  ['vi', 'What happens if you do not elect or you waive, including the effect on other coverage rights, and how to revoke a waiver before the deadline.'],
  ['vii', 'The coverage offered and the date it begins, described or by reference to the summary plan description.'],
  ['viii', 'The maximum coverage period, when coverage ends, and what can end it early.'],
  ['ix', 'When the maximum period can be extended for a disability or a second qualifying event, and by how long.'],
  ['x', 'For coverage of less than 36 months: your duty to report a second qualifying event or a Social Security disability determination, how and by when, what happens if you do not, and your duty to report that a beneficiary is no longer disabled.'],
  ['xi', 'The amount each qualified beneficiary must pay.'],
  ['xii', 'Payment due dates, the right to pay monthly, grace periods, where to send payments, and what happens if a payment is late or missed.'],
  ['xiii', 'Why the administrator needs current addresses for everyone who is or may become a qualified beneficiary.'],
  ['xiv', 'A statement that the notice does not fully describe continuation coverage, and that more is in the summary plan description or available from the plan administrator.'],
];

// 29 CFR 2590.606-1(c)(1) to (6), shortened.
export const GENERAL_ITEMS = [
  ['1', 'The plan\'s name, and the name, address and telephone number of who to contact.'],
  ['2', 'A general description of COBRA coverage: who can become a qualified beneficiary, the qualifying events, the employer\'s duty to notify the administrator, the maximum period, extensions, and premium payment.'],
  ['3', 'Your duty to report a divorce, a legal separation or a child losing dependent status, and how to do it.'],
  ['4', 'Your duty to report a Social Security disability determination, and how to do it.'],
  ['5', 'Why the administrator needs current addresses.'],
  ['6', 'A statement that the notice does not fully describe continuation coverage, and where to find more.'],
];

export const COBRA_FAQ = [
  ['Does a clean report mean our notice is legally sufficient?',
    'No. It means the notice addresses each required item, goes out inside the deadline, and states dates and payment terms that meet the minimums. SpreadRun finds wording with fixed patterns; it cannot judge whether that wording is right for your plan and your situation. A clean report is not legal advice, not a substitute for benefits counsel, and not a guarantee against DOL penalties or lawsuits.'],
  ['What can a deficient notice cost?',
    'A plan administrator who fails to give a required COBRA notice can be held personally liable, at the court\'s discretion, for up to $110 a day, and the court can order other relief it considers proper. Courts have used that language to award unpaid medical bills, though not in every case.'],
  ['We use a COBRA vendor. Is that enough?',
    'The DOL says COBRA compliance is the employer\'s responsibility under ERISA regardless of who manages the plan, and at least one federal court has held that handing the notice to a vendor did not shield the employer. A vendor\'s notice is worth checking too.'],
  ['Which employers does federal COBRA cover?',
    'Group health plans of private employers that normally had 20 or more employees in the prior year. Part-time employees count as fractions. Smaller employers may be covered by a state continuation law instead, which this check does not cover.'],
  ['How are the deadlines worked out?',
    'An election notice is due 44 days after the qualifying event when the employer is also the plan administrator, or after the loss of coverage if the plan starts the clock there. When a separate administrator handles it, the employer has 30 days to notify the administrator and the administrator has 14 days from then. For divorce, legal separation or a child losing dependent status, the 14 days run from the beneficiary\'s notice. A general notice is due 90 days after plan coverage begins. The election period must run at least 60 days from the later of the loss of coverage and the notice.'],
  ['Can I send the finished notice with names filled in?',
    'Yes. A COBRA notice names the employee and family members and carries addresses and premium amounts, and SpreadRun processes it in memory only to produce the report; it is not stored. The check reads the wording, not the people, so a draft with placeholders works just as well. If the notice contains what looks like a Social Security number, the report warns you, because a notice should not carry one.'],
  ['Can I try it for free?',
    `Yes, on the three sample notices on this page: a complete election notice, one with planted errors, and a general notice. They run free, up to 10 times a day. Checking your own notice, pasted or uploaded, is the paid run: sign in with at least ${dollars(API.priceCents)} of credit and run it from the same form, or call the API.`],
  ['Is my data stored?',
    'No. The notice is processed in memory for the length of the request and is not stored or shared. The report names items and rules, never text, amounts, names or dates from your notice. For billing and usage we log the time, endpoint, result status, size and duration, never the contents.'],
  ['When is a run charged?',
    `When the check finishes and returns a report, PASS, WARN or FAIL: ${dollars(API.priceCents)} per completed QA run. Requests rejected before a report exists are free, such as a file that cannot be read, a scanned PDF with no text, or a missing notice type.`],
];

const CURL = `curl -X POST "https://www.spreadrun.com/api/v1/cobra-notice-qa" \\
  -H "Authorization: Bearer $SPREADRUN_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data-binary @notice_request.json`;

const PY = `import base64, os, requests

notice = open("election_notice.docx", "rb").read()
r = requests.post(
    "https://www.spreadrun.com/api/v1/cobra-notice-qa",
    headers={"Authorization": f"Bearer {os.environ['SPREADRUN_API_KEY']}"},
    json={
        "noticeType": "election",
        "noticeDate": "2026-10-09",
        "qualifyingEvent": {"type": "termination", "date": "2026-09-30",
                            "lossOfCoverageDate": "2026-09-30", "employerIsAdministrator": True},
        "noticeFile": {"type": "docx", "base64": base64.b64encode(notice).decode()},
    },
    timeout=60,
)
r.raise_for_status()
report = r.json()["report"]
print(report["status"], report["contentItems"], report["deadlines"].get("electionNoticeDue"))`;

export function CobraSources() {
  return <ul className="small">{COBRA_SOURCES.map(([label, url]) => <li key={url}><a href={url}>{label}</a></li>)}</ul>;
}

export function ItemList({ items }) {
  return <ol className="small" style={{ paddingLeft: 0, listStyle: 'none' }}>{items.map(([k, t]) => <li key={k} style={{ margin: '0 0 6px' }}><b>({k})</b> {t}</li>)}</ol>;
}

export default function CobraApi() {
  return (
    <Layout path={`/apis/${API.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/apis', 'APIs'], [null, 'COBRA Notice Content QA']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <Badges api={API} style={{ marginBottom: 14 }} />
        <h1>COBRA Notice Content QA</h1>
        <p className="lede" style={{ marginTop: 20 }}>Check a COBRA notice before it goes out. Send a draft election notice or general notice as text, PDF or DOCX, with the event date. You get back every required content item marked found or missing with its DOL citation, the deadline for sending it, and any stated date or payment term that falls short of the minimum.</p>
        <h2 style={{ marginTop: 32 }}>What a bad notice can cost</h2>
        <ul className="costs">
          <li><b>Up to $110 a day.</b> A court can hold the plan administrator personally liable for each day a required notice was not given, and order other relief it considers proper, which some courts have used to award unpaid medical bills.</li>
          <li><b>A vendor does not move the duty.</b> The DOL says COBRA compliance is the employer's responsibility regardless of who manages the plan.</li>
          <li><b>It happens every time.</b> Each termination or cut in hours triggers a new notice on a 44-day clock.</li>
        </ul>
        <p className="small">Sources: 29 USC 1132(c)(1), 29 CFR 2575.502c-1, the DOL employer's guide and the court opinion linked at the bottom of this page.</p>
        <div className="note">
          <p><b>Where this fits.</b> This is a content-completeness and deadline check. It tells you, item by item with the regulation cited, whether the notice addresses what the DOL requires and goes out on time. It cannot tell you whether the wording is legally sufficient in context. TPAs and brokers can run every client's notices through the same API.</p>
        </div>
        <div className="note">
          <p><b>A clean report is not legal advice and not a guarantee against DOL penalties.</b> It is not a substitute for benefits counsel.</p>
        </div>
        <div className="note">
          <p><b>Personal data.</b> A finished notice names the employee and family members and carries addresses and premium amounts. It is processed in memory only to produce the report and is not stored, and nothing from it is repeated in the report. The samples on this page describe an invented plan.</p>
        </div>
        <div className="btn-row">
          <a className="btn" href="#demo">Check a notice</a>
          <a className="btn secondary" href="/samples/cobra-election-clean.json">Download a sample request</a>
        </div>
      </div>

      <section className="section wrap split" aria-labelledby="checks">
        <div>
          <h2 id="checks">What it checks</h2>
          <h3>Election notice: the 14 items in 29 CFR 2590.606-4(b)(4)</h3>
          <ItemList items={ELECTION_ITEMS} />
          <h3>General notice: the 6 items in 29 CFR 2590.606-1(c)</h3>
          <ItemList items={GENERAL_ITEMS} />
          <h3>Deadlines and stated terms</h3>
          <ul className="checklist">
            <li><b>Sending deadline.</b> 44 days when the employer is the administrator; 30 plus 14 days with a separate administrator; 14 days after a beneficiary reports a divorce, separation or loss of dependent status; 90 days after coverage begins for the general notice.</li>
            <li><b>Election date.</b> The date stated in the notice is at least 60 days after the later of the loss of coverage and the notice.</li>
            <li><b>Payment terms.</b> First payment no sooner than 45 days after the election, a grace period of at least 30 days, and no premium above 102 percent (150 percent only during a disability extension).</li>
            <li><b>Coverage period.</b> 18 months stated for termination or reduced hours, 36 months for the other events.</li>
            <li><b>Medicare.</b> Whether the notice explains how COBRA and Medicare interact, as the DOL model notice does.</li>
          </ul>
          <p className="small">Just need the dates? The free <a href="/tools/cobra-deadline-calculator">COBRA deadline calculator</a> works out every deadline from the qualifying event, in your browser.</p>
          <p>Every report ends with a send-readiness checklist: content, deadline, stated terms, Medicare and personal identifiers, each Ready, Review or Fix.</p>
        </div>
        <div>
          <h2>Who it's for</h2>
          <ul>
            <li><b>Employers with 20 or more employees</b> and no benefits counsel on call.</li>
            <li><b>TPAs and benefits brokers:</b> run every client's notices through one check.</li>
            <li><b>HR teams:</b> check the template once, then each notice before it goes out.</li>
            <li><b>Software and automation:</b> a plain REST endpoint with JSON in and JSON out.</li>
          </ul>
          <h3 style={{ marginTop: 24 }}>Not checked</h3>
          <ul className="small">
            <li>Whether the wording is legally sufficient. A pattern finds that an item is addressed, not that it is right.</li>
            <li>Whether premiums, plan details and the people named are correct.</li>
            <li>Whether and how the notice was delivered.</li>
            <li>State continuation laws, and employers federal COBRA does not cover.</li>
            <li>Notices of unavailability or early termination, and the employer's notice to the administrator.</li>
            <li>Scanned PDFs with no text layer.</li>
          </ul>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="how">
        <h2 id="how">Input and output</h2>
        <ol className="steps">
          <li><h3>Send</h3><p>JSON with <code>noticeType</code> (election or general), the notice as <code>noticeText</code> or <code>noticeFile</code> (PDF or DOCX, base64, up to 3 MB), and the dates: the qualifying event, loss of coverage and notice date, or for a general notice the date coverage began.</p></li>
          <li><h3>Check</h3><p>Every content item for that notice type, the deadline math and the stated terms. No network calls, nothing stored.</p></li>
          <li><h3>Report</h3><p>JSON with <code>status</code>, <code>checklist</code> (each item found, review or missing), <code>deadlines</code>, <code>readiness</code> and <code>findings</code> (severity, ruleId, item, message, source).</p></li>
        </ol>
        <p className="small">Every field and all rule IDs are in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
      </section>

      <section className="section wrap" id="demo" aria-labelledby="demo-h">
        <h2 id="demo-h">Try it now</h2>
        <p>The sample notices run free. Your own notice, pasted or uploaded, runs as a paid check at {dollars(API.priceCents)} from your credit.</p>
        <CobraDemo api={API} sample={example.body.report} />
      </section>

      <section className="section wrap" aria-labelledby="price-h">
        <h2 id="price-h">Pricing</h2>
        <p><b>{dollars(API.priceCents)} per completed QA run.</b> One notice, one full report.</p>
        <ul>
          <li>Billed when a report is produced, PASS, WARN or FAIL. Invalid input is never billed.</li>
          <li>Paid from the same prepaid credits as every SpreadRun API, in $5, $20, $50 or $100 packs. A $50 pack covers {Math.floor(5000 / API.priceCents)} runs and a $100 pack covers {Math.floor(10000 / API.priceCents)}. Credits never expire. <a href="/apis#pricing">All pricing</a></li>
          <li>Running many clients? <a href="/contact">Talk to us</a> first so we can tell you honestly whether this fits.</li>
        </ul>
        <div className="btn-row"><a className="btn" href="#demo">Check a notice</a><a className="btn secondary" href="/account">Get API access</a></div>
      </section>

      <section className="section wrap" aria-labelledby="code-h">
        <h2 id="code-h">Call it from code</h2>
        <p>Fields, rule IDs, error codes and limits are in the <a href={`/docs/${API.slug}`}>API docs</a>.</p>
        <CodeSample samples={{ curl: CURL, Python: PY }} />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={COBRA_FAQ} />
        <h3 style={{ marginTop: 28 }}>Sources</h3>
        <CobraSources />
        <p className="small" style={{ marginTop: 16 }}>SpreadRun is not affiliated with or endorsed by the Department of Labor or the IRS. Where this check and the regulations differ, the regulations control.</p>
        <p className="small">More validators: <a href="/apis/pbj-staffing-qa">PBJ Staffing Data Pre-Submission QA</a> | <a href="/apis">the full catalog</a></p>
      </section>
    </Layout>
  );
}
