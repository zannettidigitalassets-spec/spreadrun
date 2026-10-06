import Layout, { Crumbs } from '../site/Layout.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import { FINAL_GUIDES, SRC, finalGuideBySlug } from '../content/final-guides.js';
import { ENROLL_GUIDES } from '../content/enroll-guides.js';

// Every statement of fact on these pages is tied to a primary source next to it (see SRC in
// src/content/final-guides.js, read in full on October 5, 2026). Claims we could not source were cut, not softened:
// see REBUILD_NOTES.md. Penalty and relief figures are maximums or examples from the sources, never automatic.

const CMMC = apiBySlug('cmmc-self-assessment-validator');
const COBRA = apiBySlug('cobra-notice-qa');
const PECOS = apiBySlug('pecos-enrollment-precheck');
const CMMC_API = `/apis/${CMMC.slug}`;
const COBRA_API = `/apis/${COBRA.slug}`;
const PECOS_API = `/apis/${PECOS.slug}`;
const CPSC_TOOL = '/tools/cpsc-efiling-readiness-checklist';

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

function CmmcCta() {
  return (
    <div className="note" style={{ marginTop: 32 }}>
      <p><b>Check the score before it goes into SPRS.</b> The <a href={CMMC_API}>CMMC Self-Assessment Score Validator</a> recomputes a Level 2 score from your per-requirement results with the 32 CFR 170.24 point values, flags a claimed score that does not match, checks POA&amp;M eligibility against 170.21, and checks the SPRS details and the annual affirmation. {dollars(CMMC.priceCents)} per completed verification, with free sample runs on the page. <a href={`${CMMC_API}#demo`}>Verify a score</a></p>
      <p className="small" style={{ marginTop: 8 }}>A matching score is not a CMMC assessment and not a guarantee of contract eligibility. It is not legal advice.</p>
    </div>
  );
}

function CobraCta() {
  return (
    <div className="note" style={{ marginTop: 32 }}>
      <p><b>Check the notice before it goes out.</b> The <a href={COBRA_API}>COBRA Notice Content QA</a> checks a draft election or general notice for every required item, works out the deadline from the event date, and flags stated dates and payment terms that fall short of the minimums. {dollars(COBRA.priceCents)} per completed check, with free sample runs on the page. <a href={`${COBRA_API}#demo`}>Check a notice</a></p>
      <p className="small" style={{ marginTop: 8 }}>A clean report is not legal advice and not a guarantee against penalties or claims.</p>
    </div>
  );
}

function PecosCta() {
  return (
    <div className="note" style={{ marginTop: 32 }}>
      <p><b>Check the revalidation before it goes into PECOS.</b> The <a href={PECOS_API}>PECOS Medicare Enrollment Pre-Check</a> checks a draft CMS-855I, 855B or 855S: the NPI and taxonomy codes against the live NPPES registry, the legal name against the IRS name you attest to, ZIP+4 addresses, expiring credentials, signatures and the supporting documents the form asks for. {dollars(PECOS.priceCents)} per completed pre-check, with free sample runs on the page. <a href={`${PECOS_API}#demo`}>Pre-check an enrollment</a></p>
      <p className="small" style={{ marginTop: 8 }}>A clean pre-check does not guarantee the revalidation will be approved. The contractor decides, and it is not legal advice.</p>
    </div>
  );
}

function CpscCta() {
  return (
    <div className="note" style={{ marginTop: 32 }}>
      <p><b>Get the certificate package ready before the broker files.</b> The free <a href={CPSC_TOOL}>CPSC eFiling Readiness Checklist</a> walks through what to have in hand for each product: the certificate type, the rules cited, the lab and test dates, and whether the entry goes Full or Reference. No sign-up needed. <a href={CPSC_TOOL}>Open the checklist</a></p>
      <p className="small" style={{ marginTop: 8 }}>The checklist is general information, not legal or customs advice.</p>
    </div>
  );
}

const AGENCY = { cmmc: 'the Department of Defense', cobra: 'the Department of Labor or the IRS', pecos: 'CMS', cpsc: 'CPSC or CBP' };

function Sources({ g }) {
  return (
    <section style={{ marginTop: 32 }} aria-labelledby="src-h">
      <h2 id="src-h">Sources</h2>
      <ul className="small">{g.sources.map((k) => <li key={k}><a href={SRC[k][1]}>{SRC[k][0]}</a></li>)}</ul>
      <p className="small muted">Read October 5, 2026. SpreadRun is not affiliated with or endorsed by {AGENCY[g.family]}. This is general information, not legal advice. Where this page and the law differ, the law controls.</p>
    </section>
  );
}

function Related({ g }) {
  const same = FINAL_GUIDES.filter((x) => x.family === g.family && x.slug !== g.slug).map((x) => [`/guides/${x.slug}`, x.title]);
  const earlier = ENROLL_GUIDES.filter((x) => x.family === g.family).map((x) => [`/guides/${x.slug}`, x.title]);
  const product = {
    cmmc: [[CMMC_API, 'CMMC Self-Assessment Score Validator']],
    cobra: [[COBRA_API, 'COBRA Notice Content QA']],
    pecos: [[PECOS_API, 'PECOS Medicare Enrollment Pre-Check']],
    cpsc: [[CPSC_TOOL, 'Free CPSC eFiling Readiness Checklist']],
  }[g.family];
  return (
    <section style={{ marginTop: 32 }} aria-labelledby="more-h">
      <h2 id="more-h">Related</h2>
      <ul>{[...same, ...earlier, ...product].map(([href, t]) => <li key={href}><a href={href}>{t}</a></li>)}</ul>
    </section>
  );
}

// ------------------------------------------------------------------ 1. SPRS score calculation
function SprsScore() {
  return (
    <>
      <p>A CMMC Level 2 self-assessment score is simple arithmetic once you know the rules. You start at 110, one point for each of the 110 NIST SP 800-171 Rev 2 requirements, and subtract a fixed value for every requirement that is not met. The values are 5, 3 or 1. The result is the number that goes into SPRS, the Supplier Performance Risk System.</p>

      <h2>Start at 110</h2>
      <p>The maximum score equals the total number of Level 2 security requirements. If every requirement is met, you get the maximum. For each requirement not met, its value is subtracted, "which may result in a negative score."<Cite k="cfr170_24" at="(c)(2)" /> There is no partial credit for a requirement that is half done, with two exceptions covered below.<Cite k="cfr170_24" at="(a) and (c)(2)(i)(B)(4)" /> A POA&amp;M does not change this: a requirement that is not implemented is scored NOT MET whether or not it is on a POA&amp;M.<Cite k="cfr170_24" at="(c)(2)(i)(B)(6)" /></p>

      <h2>The 5, 3 and 1 point weights</h2>
      <p>The rule lists the 5-point and 3-point requirements by number. Every other derived requirement is worth 1.<Cite k="cfr170_24" at="(c)(2)(i)(B)(1) to (3)" /></p>
      <Table head={['Value', 'Why', 'Requirements']} rows={[
        ['5 points', 'If not implemented, could lead to significant exploitation of the network or exfiltration of CUI.', 'Basic: 3.1.1, 3.1.2, 3.2.1, 3.2.2, 3.3.1, 3.4.1, 3.4.2, 3.5.1, 3.5.2, 3.6.1, 3.6.2, 3.7.2, 3.8.3, 3.9.2, 3.10.1, 3.10.2, 3.12.1, 3.12.3, 3.13.1, 3.13.2, 3.14.1, 3.14.2, 3.14.3. Derived: 3.1.12, 3.1.13, 3.1.16, 3.1.17, 3.1.18, 3.3.5, 3.4.5, 3.4.6, 3.4.7, 3.4.8, 3.5.10, 3.7.5, 3.8.7, 3.11.2, 3.13.5, 3.13.6, 3.13.15, 3.14.4, 3.14.6.'],
        ['3 points', 'If not implemented, has a specific and confined effect on the security of the network and its data.', 'Basic: 3.3.2, 3.7.1, 3.8.1, 3.8.2, 3.9.1, 3.11.1, 3.12.2. Derived: 3.1.5, 3.1.19, 3.7.4, 3.8.8, 3.13.8, 3.14.5, 3.14.7.'],
        ['1 point', 'If not implemented, has a limited or indirect effect on the security of the network and its data.', 'All remaining derived requirements.'],
        ['3 or 5 points', 'Can be partially effective.', '3.5.3 (multifactor authentication) and 3.13.11 (FIPS-validated encryption).'],
      ]} />
      <p className="small">That is 42 requirements at 5 points and 14 at 3 points, counted from the lists in the rule.</p>

      <h2>Partial credit: MFA and encryption</h2>
      <p>Only two requirements can score in between:<Cite k="cfr170_24" at="(c)(2)(i)(B)(4)" /></p>
      <ul>
        <li><b>3.5.3, multifactor authentication.</b> Subtract 3 if MFA is implemented only for remote and privileged users. Subtract 5 if it is not implemented for any users.</li>
        <li><b>3.13.11, FIPS-validated encryption of CUI.</b> Subtract 3 if encryption is used but is not FIPS-validated. Subtract 5 if encryption is not used.</li>
      </ul>

      <h2>N/A counts as met</h2>
      <p>A requirement or objective can be Not Applicable when it does not apply at the time of the assessment. The rule's example is 3.13.5, public-access system separation, which might be N/A if there are no publicly accessible systems in scope. An objective assessed as N/A "is equivalent to the same assessment objective being assessed as MET," so it costs no points.<Cite k="cfr170_24" at="(b)(3)" /> Two other things also score as met: enduring exceptions described in the system security plan with their mitigations, and temporary deficiencies addressed in operational plans of action that show progress.<Cite k="cfr170_24" at="(b)(1)(i) and (ii)" /> A requirement for which the DoD CIO has adjudicated an alternative measure as equally effective is met if the environment has not changed, provided the adjudication is in the SSP.<Cite k="cfr170_24" at="(c)(2)(i)(B)(8)" /></p>

      <h2>The SSP is not a deduction</h2>
      <p>CA.L2-3.12.4, the system security plan, does not appear in any of the point lists. Instead, you must have an SSP at the time of the assessment, and without an up to date one the result is that the assessment could not be completed.<Cite k="cfr170_24" at="(c)(2)(i)(B)(5)" /> No SSP means no score, not a lower score.</p>

      <h2>The floor: -203</h2>
      <p>The rule does not print a minimum, but the lists fix it. If nothing is met: 42 requirements at 5 points is 210, the two partial-credit requirements at their full 5 points is 10, 14 requirements at 3 points is 42, and the remaining 51 requirements at 1 point is 51 (110 requirements, less 42, 14, the two partial ones and the SSP). That is 313 points of deductions, and 110 minus 313 is -203. It is the arithmetic of the lists in 170.24, not a separate rule.<Cite k="cfr170_24" at="(c)(2)(i)(B)" /></p>

      <h2>A worked example</h2>
      <p>Suppose a self-assessment finds four gaps, with everything else met or N/A:</p>
      <Table head={['Requirement not met', 'Value in 170.24', 'Running score']} rows={[
        ['Start', '', '110'],
        ['3.1.1, limit system access to authorized users', '5', '105'],
        ['3.3.2, trace actions to individual users', '3', '102'],
        ['3.1.8, limit unsuccessful logon attempts', '1 (a remaining derived requirement)', '101'],
        ['3.5.3, MFA in place for remote and privileged users only', '3 (partial)', '98'],
      ]} />
      <p>The score to post is 98 out of 110. Whether a score like this can carry a POA&amp;M is a separate question with its own rules: here it cannot, because 3.1.1, 3.3.2 and the partial 3.5.3 are each worth more than 1 point.<Cite k="cfr170_21" at="(a)(2)(ii)" /> See <a href="/guides/cmmc-poam-rules">the POA&amp;M rules</a>.</p>

      <h2>What goes into SPRS with the score</h2>
      <p>The self-assessment results in SPRS must include at least the CMMC level, the CMMC Status Date, the assessment scope, every CAGE code tied to the systems in scope, the overall score (the rule's example is "105 out of 110"), and POA&amp;M usage and compliance status if there is one.<Cite k="cfr170_16" at="(a)(1)(i)" /> An affirmation is required at the time of each assessment and annually after that, and the self-assessment is repeated every three years.<Cite k="cfr170_16" at="(a)(1) and (a)(2)" /></p>
      <CmmcCta />
    </>
  );
}

// ------------------------------------------------------------------ 2. POA&M rules
function PoamRules() {
  return (
    <>
      <p>A CMMC Level 2 self-assessment with gaps is not automatically a failure. Some gaps can go on a Plan of Action and Milestones (POA&amp;M) and be fixed within 180 days, which gives you a Conditional status in the meantime. But the rules on what can wait are strict, and a few requirements can never wait at all.</p>

      <h2>Level 1: no POA&amp;M at all</h2>
      <p>A POA&amp;M is not permitted at any time for a Level 1 self-assessment.<Cite k="cfr170_21" at="(a)(1)" /> Level 1 requirements must be fully implemented and are scored as MET or NOT MET in their entirety.<Cite k="cfr170_24" at="(c)(1)" /></p>

      <h2>Level 2: three conditions, all required</h2>
      <p>You can reach Conditional Level 2 (Self) only if all three of these hold:<Cite k="cfr170_21" at="(a)(2)" /></p>
      <ol>
        <li><b>The score is at least 80 percent of the maximum.</b> The rule says the score divided by the number of Level 2 requirements must be greater than or equal to 0.8. With 110 requirements, that is a score of 88 or more.</li>
        <li><b>Only 1-point requirements go on the POA&amp;M,</b> with one exception: 3.13.11 (CUI encryption) may be included if encryption is used but is not FIPS-validated, which is worth 3 points.</li>
        <li><b>None of the six excluded requirements is on it</b> (the list below).</li>
      </ol>
      <Table head={['Score', 'Score divided by 110', 'Meets the 0.8 threshold?']} rows={[
        ['104', '0.945', 'Yes'],
        ['88', '0.800', 'Yes, exactly at the threshold'],
        ['87', '0.791', 'No'],
      ]} />
      <p>The threshold is not enough on its own. A score of 98 that includes a 5-point gap still cannot go Conditional, because that gap cannot sit on a POA&amp;M. For how the score itself is worked out, see <a href="/guides/sprs-score-calculation">the SPRS score math</a>.</p>

      <h2>What can never go on a POA&amp;M</h2>
      <p>These six requirements are excluded by name, whatever their point value:<Cite k="cfr170_21" at="(a)(2)(iii)" /></p>
      <ul>
        <li>AC.L2-3.1.20, external connections (CUI data)</li>
        <li>AC.L2-3.1.22, control public information (CUI data)</li>
        <li>CA.L2-3.12.4, system security plan</li>
        <li>PE.L2-3.10.3, escort visitors (CUI data)</li>
        <li>PE.L2-3.10.4, physical access logs (CUI data)</li>
        <li>PE.L2-3.10.5, manage physical access (CUI data)</li>
      </ul>
      <p>Add to that every requirement worth 5 or 3 points, other than the 3.13.11 encryption exception, since condition 2 rules them out. So in practice the POA&amp;M can hold 1-point items not on the list above, and 3.13.11 when the only problem is FIPS validation.</p>
      <p>Being on a POA&amp;M does not make a requirement met. A requirement that is not implemented is scored NOT MET, POA&amp;M or not.<Cite k="cfr170_24" at="(c)(2)(i)(B)(6)" /></p>

      <h2>The 180-day closeout</h2>
      <p>Closing the POA&amp;M takes a closeout assessment that looks only at the NOT MET requirements that were on the POA&amp;M. It must be confirmed within 180 days of the Conditional CMMC Status Date.<Cite k="cfr170_21" at="(b)" /> For a Level 2 self-assessment, you perform the closeout yourself, in the same manner as the original self-assessment.<Cite k="cfr170_21" at="(b)(1)" /> You must remediate the gaps, perform the closeout self-assessment and post the results to SPRS within those 180 days.<Cite k="cfr170_16" at="(a)(1)(ii)(B)" /></p>

      <h2>What happens on day 181</h2>
      <p>If the POA&amp;M is not closed out within 180 days, the Conditional status expires. If it expires during the period of performance of a contract, "standard contractual remedies will apply," and you are ineligible for additional awards that require Level 2 (Self) or higher for that system until you achieve a new CMMC status.<Cite k="cfr170_16" at="(a)(1)(ii)(B)" /> A successful closeout moves you to Final Level 2 (Self).<Cite k="cfr170_16" at="(a)(1)(iii)" /></p>
      <p>Before award of a contract that requires Level 2 (Self), you need either a Conditional or a Final status, plus an affirmation in SPRS.<Cite k="cfr170_16" at="(b)" /></p>
      <CmmcCta />
    </>
  );
}

// ------------------------------------------------------------------ 3. COBRA penalty
function CobraPenalty() {
  return (
    <>
      <p>"$110 a day" is the number people quote about missed COBRA notices. It is real, but it is a ceiling a court may use, not a fine that applies by itself. Medical bills are in the same category: some courts have treated them as possible relief, and others have not awarded them. Separately, the tax code has its own excise tax. Here is what each source says.</p>

      <h2>The statute: up to $100 a day, in the court's discretion</h2>
      <p>ERISA section 502(c)(1) says an administrator who fails to meet certain notice requirements "may in the court's discretion be personally liable to such participant or beneficiary in the amount of up to $100 a day from the date of such failure or refusal, and the court may in its discretion order such other relief as it deems proper."<Cite k="usc1132" at="(c)(1)" /> A participant or beneficiary can bring a civil action for that relief.<Cite k="usc1132" at="(a)(1)(A)" /></p>
      <p>Three words in that sentence matter. <b>May:</b> the court decides whether to award anything. <b>Up to:</b> the court decides how much. <b>Personally:</b> the liability runs to the administrator, owed to each participant or beneficiary affected.</p>

      <h2>Where $110 comes from</h2>
      <p>The Department of Labor raised the maximum from $100 a day to $110 a day by regulation, for violations occurring after July 29, 1997.<Cite k="cfr2575" /> The current text of that regulation still reads $110.<Cite k="cfr2575" /> So $110 is the maximum per day, not a fixed rate.</p>

      <h2>Which COBRA notices it covers</h2>
      <p>The penalty provision names failures under paragraphs (1) and (4) of the COBRA notice section, 29 U.S.C. 1166(a).<Cite k="usc1132" at="(c)(1)(A)" /> Paragraph (1) is the general notice the plan gives each covered employee and spouse when coverage begins. Paragraph (4) is the administrator's notice to qualified beneficiaries of their rights after a qualifying event.<Cite k="usc1166" at="(a)(1) and (a)(4)" /> The employer's own 30-day notice of the event to the administrator is paragraph (2).<Cite k="usc1166" at="(a)(2)" /></p>

      <h2>What courts have actually done</h2>
      <p>None of these cases sets a rate. They show how much the outcome depends on the facts.</p>
      <ul>
        <li><b>Morehouse v. Steak N Shake (6th Cir. 2019).</b> The district court awarded $50 a day, $2,549.20 in dental bills and attorney's fees. The appeals court reversed all of it, because it found there had been no qualifying event that required a notice.<Cite k="morehouse" /></li>
        <li><b>Randolph v. East Baton Rouge Parish School System (5th Cir. 2021).</b> The court said courts have discretion to impose a penalty of $110 per day, and sent the penalty question back to the district court. It left in place the denial of medical expenses, noting that where the premiums the plaintiff would have owed exceed the medical costs, district courts have found no damages are owed.<Cite k="randolph" /></li>
        <li><b>Howard v. Ivy Creek of Tallapoosa (M.D. Ala.).</b> The court said equitable relief can include an order to pay the medical bills, or reimburse bills the plaintiff paid, and that delegating the mailing to a third party did not absolve the employer when it failed to provide the correct last known address. It did not set an amount at that stage.<Cite k="howard" /></li>
      </ul>
      <p>So "plus medical bills" is possible relief, not a line item. Whether bills are awarded, and whether premiums the person would have paid are offset against them, is up to the court.</p>

      <h2>The other exposure: the excise tax</h2>
      <p>The tax code imposes a tax on a group health plan's failure to meet the continuation coverage requirements, and those requirements include the notice requirements.<Cite k="usc4980b" at="(a) and (f)(6)" /> For a plan other than a multiemployer plan, the employer is liable.<Cite k="usc4980b" at="(e)(1)(A)" /> The key terms:</p>
      <ul>
        <li><b>$100 a day per qualified beneficiary</b> during the noncompliance period,<Cite k="usc4980b" at="(b)(1)" /> capped at $200 a day for all beneficiaries tied to the same qualifying event.<Cite k="usc4980b" at="(c)(3)" /></li>
        <li><b>No tax</b> for any period where no responsible person knew, or with reasonable diligence would have known, of the failure.<Cite k="usc4980b" at="(c)(1)" /></li>
        <li><b>No tax</b> if the failure was due to reasonable cause and not willful neglect, and is corrected within 30 days of when it was or should have been known.<Cite k="usc4980b" at="(c)(2)" /></li>
        <li><b>A minimum</b> of the lesser of $2,500 or the computed tax per beneficiary when failures are not corrected before a notice of examination is sent, or $15,000 where violations are more than de minimis.<Cite k="usc4980b" at="(b)(3)" /></li>
        <li><b>An annual cap</b> for failures due to reasonable cause and not willful neglect: for a single employer plan, the lesser of 10 percent of what the employer paid for group health plans in the preceding year, or $500,000.<Cite k="usc4980b" at="(c)(4)(A)" /></li>
        <li><b>Exceptions</b> for governmental plans, church plans, and qualifying events in a year that follows a calendar year in which all employers maintaining the plan normally employed fewer than 20 employees.<Cite k="usc4980b" at="(d)" /></li>
      </ul>

      <h2>What to take from this</h2>
      <p>Neither figure is automatic. The $110 is a maximum a court may award, and the excise tax has defenses and caps built in. What is certain is that each depends on whether a correct notice went out on time, which is the part you control. For what the notice must say and when, see <a href="/guides/cobra-election-notice-requirements">the 14-item checklist</a> and <a href="/guides/cobra-notice-deadlines">the deadline map</a>, or work out your own dates with the free <a href="/tools/cobra-deadline-calculator">COBRA deadline calculator</a>.</p>
      <CobraCta />
    </>
  );
}

// ------------------------------------------------------------------ 4. missed revalidation
function MissedRevalidation() {
  return (
    <>
      <p>If your Medicare revalidation due date has passed, or is about to, you are not out of Medicare yet. But the outcomes that follow cost money, and deactivation takes away payment for every day it lasts. Here is what CMS can do, the clocks that apply, and how to get back.</p>

      <h2>First, confirm the date</h2>
      <p>CMS posts revalidation due dates on the <a href={SRC.revalList[1]}>Medicare Revalidation List</a>, seven months in advance. Your contractor sends a notice by email or mail about three to four months before the due date, but you are responsible for tracking the date yourself.<Cite k="cmsReval" /> CMS does not grant extensions and there are no exemptions from revalidation.<Cite k="cmsReval" /> If you are within three months of the due date, revalidate even if no notice arrived.<Cite k="cmsReval" /></p>

      <h2>The clocks in the regulations</h2>
      <Table head={['Clock', 'What it says', 'Source']} rows={[
        ['60 days', 'After CMS notifies you to revalidate, submit the application with complete information and supporting documents within 60 calendar days.', <>42 CFR 424.515(a)(2)<Cite k="cfr424_515" at="(a)(2)" /></>],
        ['90 days', 'CMS may deactivate billing privileges if you do not furnish complete information within 90 calendar days of receiving the notice.', <>42 CFR 424.540(a)(3)<Cite k="cfr424_540" at="(a)(3)" /></>],
        ['30 days', 'If the contractor asks for missing information on an application you sent, it can be rejected if you do not respond within 30 calendar days.', <>42 CFR 424.525(a)(1)<Cite k="cfr424_525" at="(a)(1)" /></>],
        ['15 days', 'After written notice of a stay or a deactivation, you have 15 calendar days to send a rebuttal. CMS may extend it.', <>42 CFR 424.541(b) and 424.546(a)<Cite k="cfr424_541" at="(b)" /><Cite k="cfr424_546" at="(a)" /></>],
      ]} />

      <h2>Outcome 1: a stay of enrollment</h2>
      <p>CMS may stay your enrollment if you are out of compliance and can fix it with a change of information or revalidation application, which includes a revalidation application that was rejected. During a stay you remain enrolled, but claims with dates of service in the stay period are rejected. They become payable, and can be resubmitted, if you resume compliance before the stay period ends. A stay lasts at most 60 days.<Cite k="cfr424_541" at="(a)" /> CMS describes this as a possible "hold on your Medicare reimbursement."<Cite k="cmsReval" /></p>

      <h2>Outcome 2: deactivation</h2>
      <p>Deactivation stops your billing privileges. The effective date can be set back to the date you became non-compliant, not just the date CMS acts.<Cite k="cfr424_540" at="(d)(1)(ii)(A)" /> You may not receive payment for services furnished while deactivated.<Cite k="cfr424_540" at="(e)" /> Deactivation does not affect a provider agreement or conditions of participation.<Cite k="cfr424_540" at="(c)" /></p>

      <h3>Reactivation, and why it does not reach back</h3>
      <p>To reactivate, you recertify that your enrollment information is correct, furnish anything missing, and meet all enrollment requirements. CMS may require a complete Form CMS-855 application.<Cite k="cfr424_540" at="(b)" /> On its revalidation page, CMS says that after a deactivation you will need to re-submit a complete enrollment application.<Cite k="cmsReval" /></p>
      <p>The reactivation is effective on the date the contractor received the reactivation submission that was processed to approval.<Cite k="cfr424_540" at="(d)(2)" /> CMS puts it plainly: "Medicare won't reimburse you for any services during the period that you were deactivated."<Cite k="cmsReval" /> Every day between the deactivation date and the date your complete submission is received is a day you cannot bill for. That is why speed matters more than anything else here.</p>

      <h2>Outcome 3: revocation</h2>
      <p>Revocation ends enrollment. CMS may revoke for noncompliance with enrollment requirements, and the rule specifically covers revocations based on a failure to respond timely to a revalidation request.<Cite k="cfr424_535" at="(a)(1) and (c)(1)(ii)" /> In that case the reenrollment bar, which otherwise lasts from 1 to 10 years apart from listed exceptions, does not apply.<Cite k="cfr424_535" at="(c)(1)" /> A revocation is effective 30 days after the notice is mailed, apart from listed exceptions, and to come back you enroll again as a new provider with a new application.<Cite k="cfr424_535" at="(g)(1) and (d)(1)" /></p>

      <h2>What to do now</h2>
      <ol>
        <li>Look up your due date on the Medicare Revalidation List and read any letter or email from your contractor.</li>
        <li>If you have a notice, a rejection, a stay or a deactivation letter, note its date. The 15-day rebuttal window runs from it.</li>
        <li>Submit a complete revalidation in PECOS now. An incomplete one starts a new problem: missing information can bring a 30-day request and, if it goes unanswered, a rejection.<Cite k="cfr424_525" at="(a)(1)" /></li>
        <li>Do not submit if there is no due date on the list and no request from your contractor: CMS says those are returned.<Cite k="mln" /></li>
      </ol>
      <p>For the difference between a return, a rejection and a denial, see <a href="/guides/pecos-returned-for-corrections">PECOS Returned for Corrections</a>.</p>
      <PecosCta />
    </>
  );
}

// ------------------------------------------------------------------ 5. CPSC eFiling
function CpscEfiling() {
  return (
    <>
      <p>CPSC eFiling means the data from a product's certificate of compliance is filed electronically with U.S. Customs and Border Protection when the goods are entered, instead of the certificate sitting in a file until someone asks for it. It comes from CPSC's Certificates of Compliance rule, 16 CFR part 1110.</p>

      <h2>What the rule requires</h2>
      <p>For finished products made outside the United States and offered for import for consumption or warehousing, including entries from a foreign trade zone and shipments eligible for the de minimis exemption, the certifier must eFile the certificate data elements at the time of filing the entry (or entry and entry summary, if filed together) in ACE, CBP's Automated Commercial Environment.<Cite k="cfr1110" at="1110.13(a)(1)" /> For products imported by mail, the data goes into CPSC's Product Registry before the product arrives.<Cite k="cfr1110" at="1110.13(a)(1)" /></p>
      <p>For products made in the United States, nothing is filed at a border: the certificate must be issued on or before the date the product is distributed in commerce and be available to CPSC within 24 hours of a request.<Cite k="cfr1110" at="1110.13(a)(2)" /></p>

      <h2>The dates</h2>
      <Table head={['Products', 'eFiling applies from']} rows={[
        ['CPSC-regulated products required to be certified, except FTZ entries', 'July 8, 2026'],
        ['Products entered from a foreign trade zone for consumption or warehousing', 'January 8, 2027'],
      ]} />
      <p>Both dates are in the final rule.<Cite k="frRule" /> The January 8, 2027 date is the one still ahead for importers using foreign trade zones.</p>

      <h2>The seven certificate data elements</h2>
      <p>The rule sets what each finished product certificate must contain,<Cite k="cfr1110" at="1110.11(a)" /> and the Implementation Guide lists the same seven elements for eFiling:<Cite k="cpscIg" /></p>
      <ol>
        <li><b>Product identification.</b> At least one of GTIN, model number, registered number, serial number, SKU, UPC or an alternate identifier, with enough description to match the product to the certificate.</li>
        <li><b>The rules it is certified to.</b> Each applicable rule, ban, standard or regulation, listed separately, or the testing exclusion claimed.</li>
        <li><b>The certifier.</b> Name, street address, city, state or province, country, email and telephone.</li>
        <li><b>The records contact.</b> The person (or an always-staffed position) who keeps the test records, with the same contact details.</li>
        <li><b>Date and place of manufacture.</b> At least month and year, with the manufacturer's name and contact details.</li>
        <li><b>Date and place of testing.</b> The most recent test date and the lab or other party whose testing the certificate relies on.</li>
        <li><b>The attestation.</b> For eFiled certificates, it is built into the Product Registry and the message set.</li>
      </ol>
      <p>The certifier remains legally responsible for the information even when it relies on another party to test, certify or enter data.<Cite k="cfr1110" at="1110.15" /> Certificates and their supporting records are kept for at least five years.<Cite k="cfr1110" at="1110.17" /> Component part certificates are not eFiled.<Cite k="cfr1110" at="1110.19" /></p>

      <h2>Full vs Reference PGA Message Set</h2>
      <p>There are two ways to get the data into the entry. Both satisfy the rule.<Cite k="frRule" /></p>
      <Table head={['', 'Full PGA Message Set', 'Reference PGA Message Set']} rows={[
        ['Where the data goes', 'All the certificate data is filed in the PGA Message Set at the time of entry.', 'The certificate data is entered in CPSC\'s Product Registry before the entry is filed.'],
        ['What the entry carries', 'Every data element, product by product.', 'Identifiers that point to the registry record: the Certifier ID, the Product ID and the Version ID.'],
      ]} />
      <p>The descriptions are from the Implementation Guide,<Cite k="cpscIg" /> and the three identifiers are also listed in the Product Registry FAQ.<Cite k="registryFaq" /> The Implementation Guide also describes a disclaim message, used to tell CPSC that a product imported under a flagged tariff code does not require certificate data.<Cite k="cpscIg" /></p>

      <h2>What is at stake</h2>
      <p>Under the Consumer Product Safety Act, a product offered for import that is not accompanied by a required certificate shall be refused admission.<Cite k="usc2066" at="(a)" /> Civil penalties under the Act can reach $120,000 for each violation and $17,150,000 for a related series of violations, under the inflation adjustment CPSC published on December 1, 2021, for violations after January 1, 2022.<Cite k="cpscPenalties" /> Those are maximums, not set fines.</p>
      <CpscCta />
    </>
  );
}

const BODIES = {
  'sprs-score-calculation': SprsScore,
  'cmmc-poam-rules': PoamRules,
  'cobra-penalty-110-per-day': CobraPenalty,
  'medicare-revalidation-missed-deadline': MissedRevalidation,
  'what-is-cpsc-efiling': CpscEfiling,
};

export function makeFinalGuide(slug) {
  const g = finalGuideBySlug(slug);
  const Body = BODIES[slug];
  return function FinalGuide() {
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
