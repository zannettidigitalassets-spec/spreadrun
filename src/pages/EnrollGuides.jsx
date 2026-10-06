import Layout, { Crumbs } from '../site/Layout.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import { ENROLL_GUIDES, SRC, enrollGuideBySlug } from '../content/enroll-guides.js';

// Every statement of fact on these pages is tied to a primary source next to it (see SRC in
// src/content/enroll-guides.js, read in full on October 5, 2026). Claims we could not source were cut, not softened:
// see REBUILD_NOTES.md. Reasons are never ranked: CMS does not publish how often each occurs.

const PECOS = apiBySlug('pecos-enrollment-precheck');
const COBRA = apiBySlug('cobra-notice-qa');
const PECOS_API = `/apis/${PECOS.slug}`;
const COBRA_API = `/apis/${COBRA.slug}`;

function Cite({ k, at }) {
  const [label, url] = SRC[k];
  return <span className="small muted"> (Source: <a href={url}>{label}</a>{at ? `, ${at}` : ''}.)</span>;
}

const Quote = ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--line)', margin: '12px 0', padding: '4px 0 4px 14px' }}>{children}</blockquote>;

function Table({ head, rows }) {
  return (
    <div className="table-scroll">
      <table className="doc-table">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function PecosCta() {
  return (
    <div className="note" style={{ marginTop: 32 }}>
      <p><b>Check the draft before it goes into PECOS.</b> The <a href={PECOS_API}>PECOS Medicare Enrollment Pre-Check</a> checks a draft CMS-855I, 855B or 855S: the NPI and taxonomy codes against the live NPPES registry, the legal name against the IRS name you attest to, ZIP+4 addresses, expiring credentials, signatures and the supporting documents the form asks for. {dollars(PECOS.priceCents)} per completed pre-check, with free sample runs on the page. <a href={`${PECOS_API}#demo`}>Pre-check an enrollment</a></p>
      <p className="small" style={{ marginTop: 8 }}>A clean pre-check does not guarantee the enrollment will be approved. The contractor decides, and it is not legal advice.</p>
    </div>
  );
}

function CobraCta() {
  return (
    <div className="note" style={{ marginTop: 32 }}>
      <p><b>Check the notice before it goes out.</b> The <a href={COBRA_API}>COBRA Notice Content QA</a> checks a draft election or general notice for every required item, works out the deadline from the event date, and flags stated dates and payment terms that fall short of the minimums. {dollars(COBRA.priceCents)} per completed check, with free sample runs on the page. <a href={`${COBRA_API}#demo`}>Check a notice</a></p>
      <p className="small" style={{ marginTop: 8 }}>A clean report is not legal advice and not a guarantee against DOL penalties.</p>
    </div>
  );
}

function Sources({ g }) {
  return (
    <section style={{ marginTop: 32 }} aria-labelledby="src-h">
      <h2 id="src-h">Sources</h2>
      <ul className="small">{g.sources.map((k) => <li key={k}><a href={SRC[k][1]}>{SRC[k][0]}</a></li>)}</ul>
      <p className="small muted">Read October 5, 2026. SpreadRun is not affiliated with or endorsed by {g.family === 'pecos' ? 'CMS' : 'the Department of Labor or the IRS'}. This is general information, not legal advice. Where this page and the regulations differ, the regulations control.</p>
    </section>
  );
}

function Related({ g }) {
  const batch = ENROLL_GUIDES.filter((x) => x.family === g.family && x.slug !== g.slug).map((x) => [`/guides/${x.slug}`, x.title]);
  const product = g.family === 'pecos' ? [[PECOS_API, 'PECOS Medicare Enrollment Pre-Check']] : [[COBRA_API, 'COBRA Notice Content QA']];
  return (
    <section style={{ marginTop: 32 }} aria-labelledby="more-h">
      <h2 id="more-h">Related</h2>
      <ul>{[...batch, ...product].map(([href, t]) => <li key={href}><a href={href}>{t}</a></li>)}</ul>
    </section>
  );
}

// ------------------------------------------------------------------ 1. returned for corrections
function Returned() {
  return (
    <>
      <p>"Returned for Corrections" in PECOS means your Medicare Administrative Contractor (MAC) looked at the application, found something to fix, and sent it back to you to fix it. It is not a final decision. But it comes with a clock, and if the clock runs out, the application is rejected.</p>

      <h2>What the status means</h2>
      <p>CMS lists how PECOS treats applications by status:<Cite k="mln" /></p>
      <Table head={['PECOS status', 'What happens if you do nothing']} rows={[
        ['Returned for Corrections', 'Rejected if corrections are not received within 30 days.'],
        ['Opened for Corrections', 'Deleted if not submitted within 20 days.'],
        ['New or Edit', 'Deleted after 120 days of inactivity.'],
        ['Rejected', 'Deleted if not re-opened within 60 days. Once re-opened, deleted if not modified within 120 days.'],
      ]} />
      <p>The 30 days match the rule in the regulations: an application can be rejected when the provider does not furnish complete information within 30 calendar days from the date of the contractor's request.<Cite k="cfr424_525" at="(a)(1)" /> CMS can extend that period at its discretion if you are actively working with it to resolve the issues.<Cite k="cfr424_525" at="(b)" /></p>

      <h2>Returned, rejected and denied are not the same</h2>
      <p>Four outcomes get mixed up. They have different causes and different ways back.</p>
      <ul>
        <li><b>Returned for corrections</b> (a PECOS status): fix what the MAC asked for within 30 days, and processing continues.<Cite k="mln" /></li>
        <li><b>Returned</b> (42 CFR 424.526): CMS sends the application back for one of thirteen listed reasons, without deciding it. There are no appeal rights for a returned application.<Cite k="cfr424_526" at="(a) and (b)" /></li>
        <li><b>Rejected</b> (42 CFR 424.525): the information or documents did not arrive in time. To enroll after a rejection, you complete and submit a new application with all supporting documentation, and there are no appeal rights.<Cite k="cfr424_525" at="(c) and (d)" /></li>
        <li><b>Denied</b> (42 CFR 424.530): CMS decided you do not qualify, for reasons such as noncompliance with enrollment requirements, certain felonies, or false or misleading information.<Cite k="cfr424_530" at="(a)" /> A denial can be appealed under 42 CFR part 498.<Cite k="cfr424_545" at="(a)" /></li>
      </ul>

      <h3>The reasons for a return</h3>
      <p>Some of the reasons 42 CFR 424.526 lists, as they apply to a practitioner:<Cite k="cfr424_526" at="(a)" /></p>
      <ul>
        <li>A paper application sent to the wrong Medicare contractor.</li>
        <li>An application received more than 60 days before the effective date it lists.</li>
        <li>A revalidation submitted more than 7 months before the revalidation due date.</li>
        <li>An application that is not needed for, or does not apply to, the transaction.</li>
        <li>An exact duplicate of an application already processed or pending.</li>
        <li>A paper application on an outdated version of the form.</li>
        <li>A request from you to withdraw it.</li>
      </ul>
      <p>CMS adds one practical case: if there is no due date on the Medicare Revalidation List and you did not get a letter asking you to revalidate, do not submit a revalidation, because your MAC will return it.<Cite k="mln" /></p>

      <h2>The signature rule</h2>
      <p>A signature problem is an easy way to lose the 30 days, and an easy one to prevent.</p>
      <ul>
        <li><b>In PECOS:</b> the MAC will not fully process the application without your electronic or uploaded signature, and documents that need a signature cannot be mailed.<Cite k="mln" /></li>
        <li><b>On the CMS-855I:</b> "As an individual practitioner, you are the only person who can sign this application. The authority to sign the application on your behalf may not be delegated to any other person."<Cite k="cms855i" at="section 15" /></li>
        <li><b>What counts against you:</b> an application that is unsigned or undated, has a copied or stamped signature, was signed more than 120 days before the MAC received it, or was signed by someone not authorized to sign.<Cite k="cfr424_525" at="(a)(1)(ii) to (v)" /></li>
      </ul>

      <h2>How to resubmit</h2>
      <ol>
        <li>Read the MAC's request. It says what is missing or wrong.</li>
        <li>Open the application in PECOS and make every correction asked for, not just the first one.</li>
        <li>If a document is missing, upload it, or mail it to the MAC with the PECOS tracking ID.<Cite k="mln" /></li>
        <li>Make sure the signature is in place: the practitioner's own electronic or uploaded signature.</li>
        <li>Submit within the 30 days. If you need more time and are working on it, ask the MAC before the deadline.</li>
      </ol>
      <p>If the window has already closed and the application was rejected, the way back is a new application with all supporting documents.<Cite k="cfr424_525" at="(c)" /></p>
      <PecosCta />
    </>
  );
}

// ------------------------------------------------------------------ 2. NPI not active
function NpiNotActive() {
  return (
    <>
      <p>A Medicare enrollment starts from your NPI. If the NPI is not active in NPPES, or the NPPES record does not match what you put on the enrollment, the application will not go through cleanly. Here is what "not active" means and what to check.</p>

      <h2>What "not active" means</h2>
      <p>The National Provider System assigns each provider one NPI and keeps the information about it current. It can deactivate an NPI when an organization dissolves, when an individual provider dies, or in other circumstances that justify it, and it can reactivate a deactivated NPI when it gets the right information.<Cite k="cfr162" at="45 CFR 162.408(b) to (d)" /> A deactivated NPI is never given to anyone else.<Cite k="cfr162" at="45 CFR 162.408(e)" /></p>
      <p>In the public NPI Registry, each record carries a status field in its basic information. Active records show the status "A". The registry's data comes from NPPES daily.<Cite k="npiApi" /></p>

      <h3>Not the same as Medicare deactivation</h3>
      <p>NPPES deactivating an NPI is one thing. Medicare deactivating your billing privileges is another, under a different rule, for reasons such as no Medicare claims for 6 consecutive calendar months, not reporting a change, or not answering a revalidation request within 90 days.<Cite k="cfr424_540" at="(a)" /> To reactivate Medicare billing privileges, you recertify that your enrollment information is correct and furnish anything missing, and CMS can require a complete new CMS-855.<Cite k="cfr424_540" at="(b)" /> If your NPI is fine but Medicare says you are deactivated, this is the rule to read.</p>

      <h2>How to check the registry</h2>
      <ol>
        <li>Go to the <a href={SRC.npiSearch[1]}>NPI Registry search</a> and enter your NPI number. You can also search by type, taxonomy, name or location.<Cite k="npiSearch" /></li>
        <li>Check the type. The registry calls Type 1 NPIs "Individual Providers" (NPI-1) and Type 2 NPIs "Organizational Providers" (NPI-2).<Cite k="npiApi" /> An individual practitioner enrolling on the CMS-855I uses their own individual NPI.</li>
        <li>Check the name, exactly as spelled.</li>
        <li>Check the taxonomy codes and which one is primary. Each record lists its taxonomies with the code, a primary flag, and the license and state.<Cite k="npiApi" /></li>
        <li>Remember the registry only reflects NPPES. The NPI Registry itself says issuing an NPI does not ensure or validate that the provider is licensed or credentialed.<Cite k="npiApi" /></li>
      </ol>

      <h2>The mismatches that hold up PECOS</h2>
      <p>The CMS-855I is direct about this:</p>
      <Quote>The Name and Social Security Number (SSN) that you furnish in section 2A and, if applicable, the Legal Business Name (LBN) and Tax Identification Number (TIN) you furnish in section 4A must be the same Name, SSN, LBN and TIN you used to obtain your NPI. Once this information is entered into PECOS from this application, your Name, SSN, LBN, TIN and NPI must match exactly in both PECOS and NPPES.<Cite k="cms855i" at="page 2" /></Quote>
      <ul>
        <li><b>Name:</b> a married name in PECOS and a former name in NPPES, a missing middle name, or a different spelling.</li>
        <li><b>Legal business name and TIN:</b> enrolling a professional corporation or LLC, or a sole proprietorship with an EIN, means the name and TIN in section 4A, the IRS confirmation (such as a CP-575) and NPPES all have to agree.<Cite k="cms855i" at="section 12" /></li>
        <li><b>Type:</b> an organization NPI where your individual NPI belongs, or the reverse.</li>
        <li><b>Taxonomy:</b> the specialty on your enrollment and the taxonomy on NPPES describe the same practice. The CMS-855I's exact-match list does not include taxonomy, so treat a difference as something to review and correct in whichever record is wrong, not as a rule we can cite.</li>
      </ul>

      <h2>How to fix it</h2>
      <ol>
        <li>Fix NPPES first. Covered providers must report changes to their NPPES data within 30 days of the change.<Cite k="cfr162" at="45 CFR 162.410(a)(4)" /></li>
        <li>If the NPI was deactivated, ask NPPES to reactivate it rather than applying for a new one.<Cite k="cfr162" at="45 CFR 162.408(d)" /></li>
        <li>Check the registry again: it refreshes from NPPES daily.<Cite k="npiApi" /></li>
        <li>Then submit or correct the PECOS application so it matches NPPES exactly.</li>
      </ol>
      <PecosCta />
    </>
  );
}

// ------------------------------------------------------------------ 3. 855I rejection reasons
function Rejections() {
  return (
    <>
      <p>Under the rejection rule, a CMS-855I is rejected when a fix does not arrive in time after the MAC asks for it: 30 calendar days from the request for missing information, or 30 days from submission for supporting documents.<Cite k="cfr424_525" at="(a)(1) and (a)(2)" /> A rejected application cannot be appealed, and you start again with a new application.<Cite k="cfr424_525" at="(c) and (d)" /></p>
      <p>These seven reasons come straight from the rejection rule and the form. They are in no particular order: CMS does not publish how often each one happens.</p>

      <h2>1. Your name or business name does not match</h2>
      <p>The name and SSN in section 2A, and any legal business name and TIN in section 4A, must be the same ones you used to get your NPI, and must match exactly in PECOS and NPPES.<Cite k="cms855i" at="page 2" /> The form's own tips say to make sure the legal business name in section 4 matches the name on the tax documents.<Cite k="cms855i" at="page 2" /></p>
      <p><b>Fix:</b> compare the 855I with your NPPES record and the IRS confirmation letter, character by character. Correct NPPES or the application before you submit.</p>

      <h2>2. A supporting document is missing</h2>
      <p>Not furnishing all required supporting documentation within 30 days of submitting is its own rejection reason.<Cite k="cfr424_525" at="(a)(2)" /> Section 12 of the 855I lists them. The ones that apply to most practitioners:<Cite k="cms855i" at="section 12" /></p>
      <ul>
        <li>The CMS-588 Electronic Funds Transfer Authorization Agreement, with a voided check or bank letter. It is not required if you already get paid electronically and your banking is not changing, or if you reassign all of your payments to a group.</li>
        <li>IRS confirmation of your TIN and legal business name, such as a CP-575, when you enroll a professional corporation, professional association or LLC, or enroll as a sole proprietor using an EIN.</li>
        <li>Documentation of any final adverse legal actions.</li>
      </ul>
      <p><b>Fix:</b> go through section 12 line by line and attach every document that applies to you before you submit.</p>

      <h2>3. The application is unsigned or undated</h2>
      <p>An unsigned or undated application is listed as a rejection reason.<Cite k="cfr424_525" at="(a)(1)(ii)" /> The certification statement says you must sign and date it to be enrolled.<Cite k="cms855i" at="section 15" /></p>
      <p><b>Fix:</b> sign and date section 15, or in PECOS add your electronic or uploaded signature. PECOS will not fully process the application without it.<Cite k="mln" /></p>

      <h2>4. The signature is copied or stamped</h2>
      <p>An application with a copied or stamped signature is listed as a rejection reason.<Cite k="cfr424_525" at="(a)(1)(iii)" /></p>
      <p><b>Fix:</b> a real signature from the practitioner, in ink on paper or as an electronic or uploaded signature in PECOS.</p>

      <h2>5. It was signed too long ago</h2>
      <p>An application signed more than 120 days before the MAC received it is listed as a rejection reason.<Cite k="cfr424_525" at="(a)(1)(iv)" /></p>
      <p><b>Fix:</b> if a signed application sat for months, sign and date it again before sending.</p>

      <h2>6. Someone else signed it</h2>
      <p>An application signed by a person not authorized to sign is listed as a rejection reason.<Cite k="cfr424_525" at="(a)(1)(v)" /> On the 855I, the practitioner is the only person who can sign, and that authority cannot be delegated.<Cite k="cms855i" at="section 15" /></p>
      <p><b>Fix:</b> the practitioner signs personally. An office manager or credentialing staff member cannot sign for them.</p>

      <h2>7. The wrong form, or the wrong reason for applying</h2>
      <p>Submitting the incorrect CMS-855 application is listed as a rejection reason.<Cite k="cfr424_525" at="(a)(1)(x)" /> Section 1A of the 855I asks you to check one reason: new enrollee, revalidating, reactivating, reporting a change, and so on.<Cite k="cms855i" at="section 1" /> Picking the wrong one sends the application down the wrong path. An application that is not needed for the transaction, or a revalidation sent more than 7 months before its due date, is returned rather than processed.<Cite k="cfr424_526" at="(a)(7) and (a)(8)" /> CMS also says not to submit a revalidation if no due date is listed for you, because the MAC will return it.<Cite k="mln" /></p>
      <p><b>Fix:</b> confirm what you are doing before you start. The 855I is for individual physicians and eligible professionals; check the Medicare Revalidation List before revalidating.</p>

      <h2>When the MAC writes to you</h2>
      <p>Answer within 30 days, and answer everything in the letter. CMS can extend the period if you are actively working with it to resolve the issues, so if you need longer, say so before the deadline.<Cite k="cfr424_525" at="(b)" /></p>
      <PecosCta />
    </>
  );
}

// ------------------------------------------------------------------ 4. election notice items
const ITEMS = [
  ['i', 'Plan name and administrator contact', 'The name of the plan, and the name, address and telephone number of whoever administers COBRA coverage.', 'Use the plan\'s actual name and a phone number and mailing address that reach the COBRA administrator.'],
  ['ii', 'The qualifying event', 'Identification of the qualifying event.', 'Say what happened: end of employment, reduced hours, death, divorce and so on.'],
  ['iii', 'Who can elect, and when coverage ends', 'The qualified beneficiaries, by status or name, and the date plan coverage will end (or ended) unless COBRA is elected.', 'Name people by status ("you, your spouse, your dependent children") if you prefer, and give the actual date.'],
  ['iv', 'Independent right to elect', 'That each qualified beneficiary has an independent right to elect, that the employee or spouse may elect for all the others, and that a parent or legal guardian may elect for a minor child.', 'All three parts, not just "you may elect".'],
  ['v', 'How and by when to elect', 'The plan\'s election procedures, the election period, and the date by which the election must be made.', 'A specific date, not only "60 days".'],
  ['vi', 'Not electing or waiving', 'What happens if they do not elect or they waive, including the effect on portability, access to individual coverage and special enrollment, where to learn more, and how to revoke a waiver before the deadline.', 'Include the revocation procedure, not just the consequences.'],
  ['vii', 'The coverage offered', 'A description of the coverage, including the date it starts, or a reference to the summary plan description.', 'Say when coverage begins.'],
  ['viii', 'How long it lasts', 'The maximum period, the termination date, and the events that can end coverage early.', 'Give the months that apply to this event and list the early-termination events.'],
  ['ix', 'Extensions', 'When the maximum period can be extended because of a second qualifying event or a Social Security disability determination, and by how long.', 'Both kinds of extension, with their lengths.'],
  ['x', 'Notice duties for extensions', 'For coverage of less than 36 months: the beneficiary\'s duty to report a second qualifying event or a disability determination, how and within what time, what happens if they do not, and the duty to report that a disabled beneficiary is no longer disabled.', 'Needed for 18-month notices (end of employment, reduced hours).'],
  ['xi', 'What it costs', 'The amount, if any, each qualified beneficiary must pay.', 'Actual amounts.'],
  ['xii', 'How to pay', 'Due dates, the right to pay monthly, grace periods, the address for payments, and what happens if a payment is late or missed.', 'Every one of those five points.'],
  ['xiii', 'Keep addresses current', 'Why the administrator needs current addresses for everyone who is or may become a qualified beneficiary.', 'One clear sentence will do.'],
  ['xiv', 'Not the full story', 'A statement that the notice does not fully describe continuation coverage or other rights, and that more is in the summary plan description or available from the plan administrator.', 'A closing paragraph works well.'],
];
const GENERAL = [
  ['1', 'The plan\'s name, and the name, address and telephone number of someone who can give more information.'],
  ['2', 'A general description of continuation coverage: who can become a qualified beneficiary, the qualifying events, the employer\'s duty to notify the administrator of certain events, the maximum period, extensions, and premium payment.'],
  ['3', 'The beneficiary\'s duty to notify the administrator of a divorce, legal separation or a child losing dependent status, and how to do it.'],
  ['4', 'The duty of beneficiaries on COBRA to report a Social Security disability determination, and how to do it.'],
  ['5', 'Why the administrator needs current addresses.'],
  ['6', 'A statement that the notice does not fully describe the rights, and that more is available from the plan administrator and in the summary plan description.'],
];

function ElectionItems() {
  return (
    <>
      <p>The COBRA election notice is the one that offers continuation coverage after a qualifying event. Its content is set by regulation: fourteen items, each of which has to be there. The notice also has to be "written in a manner calculated to be understood by the average plan participant."<Cite k="cfr606_4" at="(b)(4)" /></p>

      <h2>The 14 items</h2>
      <p>Paraphrased here. The full text is in 29 CFR 2590.606-4(b)(4)(i) to (xiv).<Cite k="cfr606_4" at="(b)(4)" /></p>
      <div className="table-scroll">
        <table className="doc-table">
          <thead><tr><th>Item</th><th>What the regulation requires</th><th>In practice</th></tr></thead>
          <tbody>{ITEMS.map(([n, name, req, tip]) => <tr key={n}><td><b>({n})</b> {name}</td><td>{req}</td><td>{tip}</td></tr>)}</tbody>
        </table>
      </div>
      <p>Two items are worth a second look:</p>
      <ul>
        <li><b>Item (x) depends on the event.</b> It applies to a notice that offers coverage with a maximum duration of less than 36 months.<Cite k="cfr606_4" at="(b)(4)(x)" /></li>
        <li><b>Item (vi) has a procedure in it.</b> It is not only about consequences: it also requires the plan's procedures for revoking a waiver before the election deadline.<Cite k="cfr606_4" at="(b)(4)(vi)" /></li>
      </ul>

      <h2>The general notice: 6 items</h2>
      <p>The general (initial) notice goes to each covered employee and spouse when coverage starts. It has its own, shorter list:<Cite k="cfr606_1" at="(c)" /></p>
      <ol>{GENERAL.map(([n, t]) => <li key={n}>{t}</li>)}</ol>
      <p>When an election notice is due before the general notice would be, giving the election notice satisfies the general notice requirement for that person.<Cite k="cfr606_1" at="(b)(1)(ii) and (b)(3)" /></p>

      <h2>Using the list</h2>
      <ol>
        <li>Put the notice next to the table and find each item in it.</li>
        <li>For items with several parts, such as (iv), (vi) and (xii), check every part.</li>
        <li>Check the dates: the coverage end date, the election deadline, the first payment and the grace period. See <a href="/guides/cobra-notice-deadlines">COBRA notice deadlines</a>.</li>
        <li>Read it as a participant would. The regulation asks for wording the average plan participant can understand.</li>
      </ol>
      <CobraCta />
    </>
  );
}

// ------------------------------------------------------------------ 5. deadlines
function Deadlines() {
  return (
    <>
      <p>COBRA has a chain of deadlines, and most of them run from a different starting point. Here is each one, who it applies to, and where it comes from.</p>

      <h2>The deadline map</h2>
      <Table head={['Deadline', 'Who', 'Rule']} rows={[
        [<b key="a">30 days</b>, 'The employer notifies the plan administrator of the qualifying event (employee\'s death, end of employment, reduced hours, Medicare entitlement, employer bankruptcy).', <span key="a2">30 days after the event, or after the loss of coverage if the plan starts the clock there.<Cite k="cfr606_2" at="(a) and (b)" /></span>],
        [<b key="b">14 days</b>, 'The plan administrator sends the election notice.', <span key="b2">14 days after receiving the notice of the qualifying event.<Cite k="cfr606_4" at="(b)(1)" /></span>],
        [<b key="c">44 days</b>, 'When the employer is also the plan administrator.', <span key="c2">44 days after the event, or after the loss of coverage if the plan starts the clock there.<Cite k="cfr606_4" at="(b)(2)" /></span>],
        [<b key="d">60 days, then 14</b>, 'Divorce, legal separation, or a child losing dependent status: the beneficiary reports it, then the administrator sends the election notice.', <span key="d2">The plan's reporting period cannot end before 60 days after the latest of the event, the loss of coverage, or the date the beneficiary was told about the duty to report.<Cite k="cfr606_3" at="(c)(1)" /> The administrator then has 14 days.<Cite k="cfr606_4" at="(b)(1)" /></span>],
        [<b key="e">90 days</b>, 'The general notice to each covered employee and spouse.', <span key="e2">90 days after coverage begins, or earlier if an election notice is due first.<Cite k="cfr606_1" at="(b)(1)" /></span>],
        [<b key="f">60 days</b>, 'The election period.', <span key="f2">Cannot end before 60 days after the later of the loss of coverage and the date the election notice is provided.<Cite k="cfr54_6" at="Q&A-1(a)" /></span>],
        [<b key="g">45 days</b>, 'The first premium payment.', <span key="g2">A plan cannot require payment earlier than 45 days after the election.<Cite k="cfr54_8" at="Q&A-5(b)" /></span>],
        [<b key="h">30 days</b>, 'Grace period for each later payment.', <span key="h2">Payment is timely if made within 30 days after the first day of the period it covers, or later if the plan allows.<Cite k="cfr54_8" at="Q&A-5(a)" /></span>],
      ]} />

      <h2>30 plus 14 versus 44</h2>
      <p>With a separate plan administrator, the employer has 30 days to report the event and the administrator then has 14 days from receiving that report.<Cite k="cfr606_2" at="(b)" /><Cite k="cfr606_4" at="(b)(1)" /> When the employer is also the administrator, the regulation gives one combined deadline of 44 days.<Cite k="cfr606_4" at="(b)(2)" /> Multiemployer plans have their own timing: the later of the 14-day period or the period in the plan's terms.<Cite k="cfr606_4" at="(b)(3)" /></p>

      <h2>Worked timeline</h2>
      <p>An employee's job ends on September 30, 2026, and plan coverage ends the same day. The employer administers its own plan.</p>
      <Table head={['Step', 'Date']} rows={[
        ['Election notice due (44 days after September 30)', 'November 13, 2026'],
        ['Notice actually sent', 'October 9, 2026'],
        ['Election period open until at least (60 days after October 9, the later date)', 'December 8, 2026'],
        ['The employee elects (sends the election form)', 'November 20, 2026'],
        ['Earliest date the plan can require the first payment (45 days after November 20)', 'January 4, 2027'],
      ]} />
      <p>An election counts as made on the date it is sent to the plan administrator, not the date it arrives.<Cite k="cfr54_6" at="Q&A-1(b)" /> After the first payment, each month's payment is timely within 30 days after the first day of that month.<Cite k="cfr54_8" at="Q&A-5(a)" /></p>

      <h2>Where these go wrong</h2>
      <ul>
        <li>An election deadline in the notice that is less than 60 days after the notice date, because it was counted from the event instead.</li>
        <li>A first payment demanded sooner than 45 days after the election.</li>
        <li>A grace period shorter than 30 days.</li>
        <li>Counting 44 days when a separate administrator is involved, or 14 days when the employer is its own administrator.</li>
      </ul>
      <p>Every one of these is a date in the notice you can check against the event before it goes out. To get every date for your own event, use the free <a href="/tools/cobra-deadline-calculator">COBRA deadline calculator</a>. For what the notice itself must say, see <a href="/guides/cobra-election-notice-requirements">the 14-item checklist</a>.</p>
      <CobraCta />
    </>
  );
}

const BODIES = {
  'pecos-returned-for-corrections': Returned,
  'npi-not-active-nppes': NpiNotActive,
  '855i-rejection-reasons': Rejections,
  'cobra-election-notice-requirements': ElectionItems,
  'cobra-notice-deadlines': Deadlines,
};

export function makeEnrollGuide(slug) {
  const g = enrollGuideBySlug(slug);
  const Body = BODIES[slug];
  return function EnrollGuide() {
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
