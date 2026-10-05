import Layout, { Crumbs } from '../site/Layout.jsx';
import { apiBySlug, dollars } from '../catalog.js';
import { SRC, WH347_GUIDES, wh347GuideBySlug } from '../content/wh347-guides.js';

// Every statement of fact on these pages is tied to a primary source next to it (see SRC in
// src/content/wh347-guides.js, checked October 5, 2026). Claims we could not source were cut, not softened:
// see REBUILD_NOTES.md. The worked examples use made-up rates; the arithmetic follows the cited method.

const WH = apiBySlug('wh347-payroll-precheck');
const WH_API = `/apis/${WH.slug}`;
const APPRENTICE = '/tools/davis-bacon-apprentice-checker';
const FRINGE = '/tools/davis-bacon-fringe-calculator';
const OVERTIME = '/tools/davis-bacon-overtime-calculator';

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

function PrecheckCta({ lead }) {
  return (
    <div className="note" style={{ marginTop: 32 }}>
      <p><b>{lead}</b> The <a href={WH_API}>WH-347 Certified Payroll Pre-Check</a> recomputes every row of a weekly payroll against the wage determination rates you give it: classifications, rates, fringe, overtime, apprentice rates and ratios, and the gross, deductions and net math. {dollars(WH.priceCents)} per completed check, with a free test on the page. <a href={`${WH_API}#demo`}>Check a payroll</a></p>
      <p className="small" style={{ marginTop: 8 }}>A PASS is not acceptance by the contracting agency or the Department of Labor, and it is not legal advice.</p>
    </div>
  );
}

function ToolCta({ href, name, what }) {
  return (
    <div className="note" style={{ marginTop: 32 }}>
      <p><b>Run your own numbers, free.</b> The <a href={href}>{name}</a> {what} It runs in your browser and nothing is uploaded. <a href={href}>Open the calculator</a></p>
      <p className="small" style={{ marginTop: 8 }}>Checking a whole payroll? The <a href={WH_API}>WH-347 Certified Payroll Pre-Check</a> does every row at once, {dollars(WH.priceCents)} per completed check.</p>
    </div>
  );
}

function Sources({ g }) {
  return (
    <section style={{ marginTop: 32 }} aria-labelledby="src-h">
      <h2 id="src-h">Sources</h2>
      <ul className="small">{g.sources.map((k) => <li key={k}><a href={SRC[k][1]}>{SRC[k][0]}</a></li>)}</ul>
      <p className="small muted">Checked October 5, 2026. SpreadRun is not affiliated with or endorsed by the Department of Labor. This is general information, not legal or compliance advice. Where this page and the regulations differ, the regulations control.</p>
    </section>
  );
}

function Related({ g }) {
  const tools = [[OVERTIME, 'Free Davis-Bacon overtime calculator'], [FRINGE, 'Free fringe benefit annualization calculator'], [APPRENTICE, 'Free apprentice ratio checker']];
  const batch = WH347_GUIDES.filter((x) => x.slug !== g.slug).map((x) => [`/guides/${x.slug}`, x.title]);
  return (
    <section style={{ marginTop: 32 }} aria-labelledby="more-h">
      <h2 id="more-h">Related</h2>
      <ul>{[...batch, ...tools].map(([href, t]) => <li key={href}><a href={href}>{t}</a></li>)}</ul>
    </section>
  );
}

// ------------------------------------------------------------------ 1. apprentices
function Apprentices() {
  return (
    <>
      <p>Apprentices are where a lot of certified payrolls go wrong, because the WH-347 asks about them in four places and the rules behind it are strict. Here is each place, using the current form, Rev. January 2025.</p>

      <h2>Column 2: J or RA</h2>
      <p>Column 2 says whether each worker is a journeyworker or a registered apprentice. The instructions:</p>
      <Quote>Enter "J" if the worker is a journeyworker or "RA" if the worker is a registered apprentice... For registered apprentices, also list their level of progression within the approved program.<Cite k="form" at="instructions, column 2" /></Quote>

      <h2>Column 3: the classification</h2>
      <p>Column 3 is the labor classification for the work actually performed, taken from the wage determination.<Cite k="form" at="instructions, column 3" /> For an apprentice, that is the classification of the work the apprentice actually did; the RA and the level in column 2 are what mark the worker as an apprentice. Page 2 of the form repeats the point: the person signing certifies that the classifications reported are the work each worker actually performed.<Cite k="form" at="page 2" /></p>

      <h2>The ratio rule</h2>
      <p>An apprentice can only be paid the apprentice rate when two things are true.</p>
      <ul>
        <li><b>Registered.</b> The apprentice is individually registered in a bona fide apprenticeship program registered with the DOL Office of Apprenticeship (OA) or with a State Apprenticeship Agency (SAA) the OA recognizes.<Cite k="cfr55" at="(a)(4)(i)" /> Someone in the first 90 days of probationary employment who is certified as eligible also qualifies.<Cite k="cfr55" at="(a)(4)(i)" /></li>
        <li><b>Within the ratio.</b> The number of apprentices to journeyworkers on the job site, in each craft classification, cannot be greater than the ratio the registered program allows.<Cite k="cfr55" at="(a)(4)(i)" /> Since the 2023 rule, it is the ratio and wage standards for the locality where the work is actually performed.<Cite k="dbraFaq" /></li>
      </ul>
      <h3>What happens when the ratio is exceeded</h3>
      <Quote>Any apprentice performing work on the job site in excess of the ratio permitted under this section must be paid not less than the applicable wage rate on the wage determination for the work actually performed.<Cite k="cfr55" at="(a)(4)(i)" /></Quote>
      <p>In plain terms: the extra apprentice is owed the full journeyworker rate for those hours, not the apprentice rate. The same goes for anyone listed as an apprentice who is not registered.<Cite k="cfr55" at="(a)(4)(i)" /> Underpaying them is a wage violation, and the payroll you certify would then be wrong.</p>
      <p>Example: the program allows 1 apprentice for every 3 journeyworkers in the electrician classification. On a day with 3 electrician journeyworkers on site, 1 apprentice is within the ratio. If 2 apprentices worked that day, one of them is over the ratio and is owed the electrician journeyworker rate for that day's hours.</p>

      <h2>Page 2: box 4 and the program block</h2>
      <p>The Statement of Compliance on page 2 has six statements to check. One of them says that any workers paid as apprentices are registered in a bona fide program registered with the OA or a recognized SAA, and that the program information below it is accurate.<Cite k="form" at="page 2" /> The instructions:</p>
      <Quote>box 4 must be checked and each program name... must be listed, with the appropriate box checked to indicate whether the apprenticeship program is registered with DOL's Office of Apprenticeship (OA) or a State Apprenticeship Agency (SAA), and the name of the labor classification entered.<Cite k="form" at="instructions, page 2" /></Quote>
      <p>So for every program with apprentices on the project that week: the program name, OA or SAA, and the classification.</p>

      <h2>A quick check before you sign</h2>
      <ol>
        <li>Every apprentice row has RA and a level in column 2.</li>
        <li>Column 3 names the trade classification from the wage determination.</li>
        <li>Each apprentice is individually registered, or is a certified probationary apprentice in the first 90 days.</li>
        <li>For each classification and each day, apprentices on site are within the program's ratio for this locality.</li>
        <li>Anyone over the ratio, or not registered, is paid the journeyworker rate.</li>
        <li>Box 4 is checked and every program is listed with OA or SAA and the classification.</li>
      </ol>
      <ToolCta href={APPRENTICE} name="Davis-Bacon apprentice ratio checker" what="tests each craft, each day, against your registered program's ratio, and flags apprentices with no registration number on file." />
      <PrecheckCta lead="Check the whole payroll before it goes in." />
    </>
  );
}

// ------------------------------------------------------------------ 2. Statement of Compliance
function Statement() {
  return (
    <>
      <p>Page 1 of a certified payroll says who worked and what they were paid. The Statement of Compliance on page 2 is what makes it certified: a signed statement, under federal penalties, that the payroll is right and the workers were paid what the law requires.</p>

      <h2>Who can sign</h2>
      <p>The regulation says the statement is signed by "the contractor or subcontractor, or the contractor's or subcontractor's agent who pays or supervises the payment of the persons working on the contract."<Cite k="cfr55" at="(a)(3)(ii)(C)" /> The WH-347 instructions say the same: the contractor or subcontractor, or their agent who paid or supervised the payment of the workers.<Cite k="form" at="instructions" /> The form's own first line reflects it: "I paid or supervised the payment of the laborers or mechanics working on the above project during the stated time period."<Cite k="form" at="page 2" /></p>
      <p>So the test is the role, not the title. Someone who neither pays nor supervises payment is not the right signer, even if senior. The signature must be an original handwritten signature or a legally valid electronic signature.<Cite k="cfr55" at="(a)(3)(ii)" /></p>

      <h2>The three things the signature certifies</h2>
      <p>29 CFR 5.5 lists three certifications:<Cite k="cfr55" at="(a)(3)(ii)(C)" /></p>
      <ol>
        <li><b>The payroll is complete.</b> It contains the information required, and the information is correct and complete.</li>
        <li><b>Full wages, no kickbacks.</b> Each laborer or mechanic, including each helper and apprentice, was paid the full weekly wages earned, without rebate, direct or indirect, and without deductions other than permissible ones.</li>
        <li><b>At least the prevailing wage.</b> Each laborer or mechanic was paid not less than the applicable wage rates and fringe benefits, or cash equivalents, for the classification of work actually performed, as in the wage determination in the contract.</li>
      </ol>
      <p>The January 2025 form spells these out as six statements to check: the payroll and the rates paid, the underlying records, the classifications, apprentices, fringe benefits, and no rebates or deductions other than those permitted under 29 CFR part 3.<Cite k="form" at="page 2" /> A contractor does not have to use the WH-347, but a properly executed copy of its page 2 statement satisfies the requirement.<Cite k="cfr55" at="(a)(3)(ii)" /></p>

      <h2>What a false statement can cost</h2>
      <p>The regulation says falsifying any of the certifications may subject the contractor or subcontractor to civil or criminal prosecution under 18 U.S.C. 1001 and 31 U.S.C. 3729.<Cite k="cfr55" at="(a)(3)(ii)" /> The form prints the warning above the signature line and adds debarment from future federal and federally assisted contracts.<Cite k="form" at="page 2" /></p>
      <ul>
        <li><b>18 U.S.C. 1001</b> is the federal false statements law. A conviction can bring a fine and imprisonment of not more than 5 years.<Cite k="usc1001" at="(a)" /></li>
        <li><b>31 U.S.C. 3729</b> covers liability for false claims made to the government.<Cite k="cfr55" at="(a)(3)(ii)" /></li>
      </ul>
      <p>The person signing is the one making the statement. Read page 1 before signing page 2.</p>

      <h2>Before you sign</h2>
      <ol>
        <li>Check every rate in column 6A against the wage determination for the classification in column 3.</li>
        <li>Check that fringe credit in column 6B matches the plan detail on page 2, and cash in lieu is in column 6C.</li>
        <li>Check overtime: hours over 40 at 1.5 times the basic rate, with fringe left out of the multiplier.</li>
        <li>Check apprentices: registered, within the ratio, and box 4 filled in.</li>
        <li>Check deductions: only those permitted.</li>
        <li>Then sign, by hand or with a legally valid electronic signature.</li>
      </ol>
      <PrecheckCta lead="Check the payroll before you put your name on it." />
    </>
  );
}

// ------------------------------------------------------------------ 3. seven mistakes
function Mistakes() {
  return (
    <>
      <p>Agencies and the Department of Labor review certified payrolls to see whether workers got the wages and fringe benefits they were owed.<Cite k="form" at="page 1" /> These seven mistakes are the kind that review catches. Each one is checkable before the payroll goes in.</p>

      <h2>1. Using an old version of the form</h2>
      <p>The current WH-347 is Rev. January 2025. It carries OMB control number 1235-0008 with an expiration date of January 31, 2028.<Cite k="form" /> OMB approved this version on January 6, 2025.<Cite k="omb" /> DOL's notice for it said the revisions add fields to obtain more specific information about fringe benefits, and that the last substantive edits were made in 2011.<Cite k="frNotice" /></p>
      <p>An older version is missing what the new one asks for, such as the per-worker fringe plan detail and the apprenticeship program block. Download the form from the DOL page each time you set up a project rather than reusing an old file. Using the WH-347 at all is optional, but whatever format you use has to carry the information the regulation requires.<Cite k="cfr55" at="(a)(3)(ii)" /></p>

      <h2>2. Overtime figured on the wrong base</h2>
      <p>Overtime under the Contract Work Hours and Safety Standards Act is at least 1.5 times the basic rate for hours over 40 in the workweek.<Cite k="usc3702" at="(a)" /> Fringe benefit contributions and costs can be left out of the rate overtime is figured on, as long as that does not take it below the basic hourly rate on the wage determination.<Cite k="cfr532" /> One mistake is multiplying the fringe by 1.5 along with the wage, or figuring overtime on a rate below the determination. When one worker had two classifications that week, see <a href="/guides/davis-bacon-weighted-overtime">weighted-average overtime</a>.</p>

      <h2>3. Fringe entries that do not line up</h2>
      <p>On the January 2025 form, fringe is split three ways on page 1: the hourly rate in column 6A leaves out cash paid for fringe, column 6B is the credit for contributions to or costs of bona fide fringe benefit plans, and column 6C is cash paid in lieu of fringe benefits.<Cite k="form" at="instructions, columns 6A to 6C" /> If 6B has an amount, page 2 must show the hourly credit under each plan's name, type and number for that worker, and whether the plan is funded or unfunded. An unfunded plan is one where the contractor provides the benefit directly.<Cite k="form" at="instructions, page 2" /> A credit in 6B with no plan detail on page 2, or a funded box checked for a benefit the contractor pays directly, is a mismatch a reviewer will see.</p>

      <h2>4. An unsigned or wrongly signed statement</h2>
      <p>Each payroll needs the Statement of Compliance, signed by the contractor or the agent who pays or supervises payment, with an original handwritten or legally valid electronic signature.<Cite k="cfr55" at="(a)(3)(ii)" /> See <a href="/guides/wh347-statement-of-compliance">who can sign and what it certifies</a>.</p>

      <h2>5. Not submitting every week</h2>
      <p>The contractor or subcontractor must submit certified payrolls weekly, for each week in which any covered work is performed.<Cite k="cfr55" at="(a)(3)(ii)(A)" /> Skipping a slow week, or batching a month at once, misses that. Your contract or agency may set a more specific due date; follow it.</p>

      <h2>6. Missing or wrong worker identifiers</h2>
      <p>Column 1E is each worker's individual identifying number, such as the last four digits of the Social Security number or another number specific to that worker. The instructions are clear that full Social Security numbers must not be included.<Cite k="form" at="instructions, column 1E" /> The regulation says the same about weekly submissions, and leaves out home addresses, phone numbers and email addresses too.<Cite k="cfr55" at="(a)(3)(ii)" /> Both a blank and a full SSN are mistakes.</p>

      <h2>7. Apprentices over the ratio</h2>
      <p>An apprentice can be paid the apprentice rate only when registered and within the ratio the program allows for that craft on the job site. An apprentice over the ratio must be paid at least the wage determination rate for the work actually performed.<Cite k="cfr55" at="(a)(4)(i)" /> See <a href="/guides/wh347-apprentice-reporting">how to report apprentices</a>.</p>

      <h2>Catch them before you sign</h2>
      <p>Every one of these can be checked from the payroll itself, the wage determination and your apprenticeship programs, before the statement is signed.</p>
      <PrecheckCta lead="Find all seven in one pass." />
    </>
  );
}

// ------------------------------------------------------------------ 4. fringe annualization
function Annualization() {
  return (
    <>
      <p>If you pay for a benefit plan all year and take credit for it on Davis-Bacon jobs, annualization decides how much credit you get per hour. The short version: spread the cost over every hour the worker worked, not just the Davis-Bacon hours.</p>

      <h2>The formula</h2>
      <p>29 CFR 5.25 says to divide the total cost of the fringe benefit contribution by the total number of hours worked on both private work and work covered by the Davis-Bacon and Related Acts, during the time period the cost covers.<Cite k="cfr525" at="(c)(1)" /> That gives the rate of contribution per hour you can credit.</p>
      <Quote>Hourly credit = total cost of the benefit for the period ÷ total hours worked in that period, private and Davis-Bacon work together</Quote>

      <h2>Worked example</h2>
      <p>A worker's health coverage costs the contractor $10,400 for the year. That year the worker works 2,000 hours: 1,200 on Davis-Bacon jobs and 800 on private jobs. The wage determination's fringe rate for the classification is $9.00 an hour.</p>
      <Table head={['Step', 'Math', 'Result']} rows={[
        ['Annualized credit', '$10,400 ÷ 2,000 hours', '$5.20 an hour'],
        ['Fringe still owed', '$9.00 - $5.20', '$3.80 an hour'],
        ['For the year', '$3.80 × 1,200 Davis-Bacon hours', '$4,560.00'],
      ]} />
      <p>The $3.80 an hour still owed is paid in cash or through other bona fide plans; the Statement of Compliance certifies that fringe benefits were paid in cash and/or to bona fide plans.<Cite k="form" at="page 2" /></p>
      <h3>The mistake</h3>
      <p>Dividing by Davis-Bacon hours only: $10,400 ÷ 1,200 = $8.67 an hour. That claims $3.47 an hour too much credit, about $4,160 over the year, and every hour of it is underpaid fringe. The private-work hours are in the denominator because the benefit covers the worker on private jobs too.</p>

      <h2>Per worker, not per crew</h2>
      <p>The rule is applied worker by worker when costs differ: "If the amount of contribution varies per worker, credit must be determined separately for the amount contributed on behalf of each worker."<Cite k="cfr525" at="(c)(1)" /> In the example, a coworker on family coverage that costs $18,000 for the year, also working 2,000 hours, has a credit of $9.00 an hour. You cannot average the two and credit both workers the same.</p>
      <p>On the WH-347, the credit for each worker goes in column 6B, with the plan detail and hourly credit for that worker on page 2.<Cite k="form" at="instructions" /></p>

      <h2>The exceptions</h2>
      <ul>
        <li><b>Defined contribution pension plans.</b> A defined contribution pension plan that provides immediate participation and essentially immediate vesting, meaning the benefit vests within the first 500 hours worked, is excepted from annualization.<Cite k="cfr525" at="(c)(2)" /></li>
        <li><b>Other plans, on request.</b> Other benefits can be excepted only if the benefit is not continuous in nature and does not compensate both private and Davis-Bacon work, and a request is made to the Wage and Hour Division.<Cite k="cfr525" at="(c)(2) and (c)(3)" /></li>
      </ul>
      <p>Year-round health coverage is continuous and covers the worker on private jobs too, so annualization applies to it.</p>
      <ToolCta href={FRINGE} name="fringe benefit annualization calculator" what="turns a plan's cost and the hours worked into the hourly credit, and compares it with the fringe rate on your wage determination." />
    </>
  );
}

// ------------------------------------------------------------------ 5. weighted overtime
function WeightedOvertime() {
  return (
    <>
      <p>A worker who spends part of the week in one classification and part in another has two straight-time rates. When the week goes over 40 hours, which rate does overtime use? The Department of Labor allows two methods, and without an agreement made in advance it is the weighted average.</p>

      <h2>The rule</h2>
      <p>Overtime on covered contracts comes from the Contract Work Hours and Safety Standards Act: at least 1.5 times the basic rate of pay for every hour over 40 in the workweek.<Cite k="usc3702" at="(a)" /> When a worker has more than one rate in the week, DOL's guidance says the overtime pay may be computed on the weighted average rate, the total straight-time pay for the week divided by the total hours worked.<Cite k="pwrbOvertime" /> That is the same regular-rate method in the Fair Labor Standards Act regulations.<Cite k="cfr778" /></p>
      <Quote>Regular rate = total straight-time pay at all rates ÷ total hours worked<br />Overtime premium = regular rate × 0.5 × overtime hours</Quote>
      <p>The straight-time pay already pays every hour once, overtime hours included, so the overtime adds the half-time premium on top.</p>

      <h2>Worked example</h2>
      <p>One week: 26 hours as a carpenter at $40.00 and 20 hours as a laborer at $28.00. That is 46 hours, so 6 are overtime.</p>
      <Table head={['Step', 'Math', 'Result']} rows={[
        ['Carpenter straight time', '26 × $40.00', '$1,040.00'],
        ['Laborer straight time', '20 × $28.00', '$560.00'],
        ['Total straight time', '46 hours', '$1,600.00'],
        ['Regular rate', '$1,600.00 ÷ 46', '$34.78 an hour'],
        ['Overtime premium', '$34.7826 × 0.5 × 6', '$104.35'],
        ['Wages for the week', '$1,600.00 + $104.35', '$1,704.35'],
      ]} />
      <p>Carry the regular rate at full precision and round the result to the cent: $34.78 × 0.5 × 6 would give $104.34.</p>

      <h2>The other method: agreed in advance</h2>
      <p>DOL's guidance also allows the worker and employer to agree, in advance of doing the work, that overtime hours are paid at not less than 1.5 times the rate for the type of work performed during those overtime hours.<Cite k="pwrbOvertime" /> In the example, if the 6 overtime hours were carpenter work, the premium is 6 × $40.00 × 0.5 = $120.00. If they were laborer work, it is 6 × $28.00 × 0.5 = $84.00. Without an agreement made before the work, the regular rate is the weighted average.<Cite k="cfr778" /></p>

      <h2>Fringe stays out of the multiplier</h2>
      <p>Fringe benefits paid to bona fide plans, and cash paid to meet the fringe part of the prevailing wage, are excluded when computing overtime under the Act.<Cite k="pwrbOvertime" /> The regulation allows the exclusion as long as it does not bring the rate below the basic hourly rate on the wage determination.<Cite k="cfr532" /> Fringe is still owed for every hour worked, at the straight amount. If the carpenter fringe is $15.00 and the laborer fringe $10.00:</p>
      <Table head={['Fringe', 'Math', 'Result']} rows={[
        ['Carpenter hours', '26 × $15.00', '$390.00'],
        ['Laborer hours', '20 × $10.00', '$200.00'],
        ['Fringe for the week', 'not multiplied by 1.5', '$590.00'],
      ]} />
      <p>So do not add fringe to the hourly rate and then multiply the total by 1.5 for overtime hours. Figure overtime on the basic rate, and add fringe for every hour at the straight amount.</p>
      <ToolCta href={OVERTIME} name="Davis-Bacon overtime calculator" what="works out straight time, overtime at 1.5 times the basic rate, and fringe owed at the straight amount for each hour." />
    </>
  );
}

const BODIES = {
  'wh347-apprentice-reporting': Apprentices,
  'wh347-statement-of-compliance': Statement,
  'wh347-common-mistakes': Mistakes,
  'davis-bacon-fringe-annualization': Annualization,
  'davis-bacon-weighted-overtime': WeightedOvertime,
};

export function makeWh347Guide(slug) {
  const g = wh347GuideBySlug(slug);
  const Body = BODIES[slug];
  return function Wh347Guide() {
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
