import Badges from '../site/Badges.jsx';
import Layout from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import ReportSheet from '../site/ReportSheet.jsx';
import { APIS, dollars } from '../catalog.js';
import clinicalExample from '../content/examples/clinical-paid-fail.json';

// Copy: content/PAGE_homepage.md, edited where the build forced it (see REBUILD_NOTES.md):
// flat $0.25 pricing, uploads only (no URL fetching in V1), no em dashes.
export const HOME_FAQ = [
  ['What is SpreadRun?',
    'A small catalog of data-validation APIs for regulated industries. Each product checks one specific thing, currently hospital price transparency files, clinical trial results tables, UAD 3.6 appraisal reports, nursing home PBJ staffing files and Davis-Bacon certified payrolls, through a documented REST API with per-use pricing.'],
  ['How is this different from the free government tools?',
    'Government validators, like the one CMS publishes, are built for one-off manual checks, and they are good at that. SpreadRun\'s APIs are built for repeated, programmatic use: no installation, structured JSON reports, and endpoints your pipeline or agent can call directly.'],
  ['How does pricing work?',
    'You buy prepaid credits through Stripe: $5, $20, $50, $100, $250 or $500 of credit that works on every API. Each API has its own price per completed run, from $0.25 (a $5 pack covers 20 standard runs). Credits never expire. No subscriptions, no seat licenses. Requests rejected as invalid input are not charged. The full price list is on the APIs page.'],
  ['Do I need an account to try it?',
    'No. Every product page has a live test form. Run a real validation or audit before creating an account or paying anything.'],
  ['Who builds the validators?',
    'SpreadRun\'s catalog is supplied by DataForge, which builds narrow data-validation capabilities and operates them as hosted APIs.'],
  ['Can I suggest a validator?',
    'Yes. The catalog grows from observed demand. Tell us what you need to check on the contact page.'],
];

export default function Home() {
  const [clinical, mrf, uad, pbj, wh347] = [APIS[0], APIS[1], APIS[2], APIS[3], APIS[4]];
  return (
    <Layout path="/">
      <div className="wrap hero">
        <div>
          <h1>Data validation APIs for regulated industries.</h1>
          <p className="lede">Narrow tools that check one thing correctly: hospital price files against the CMS v3.0 template, clinical trial tables before analysis, UAD 3.6 appraisal XML against the GSE rules, nursing home PBJ staffing files before they go to CMS, Davis-Bacon payrolls before they are certified. Per-use pricing. No subscriptions, no sales calls.</p>
          <div className="btn-row">
            <a className="btn" href="/apis">Browse the APIs</a>
            <a className="btn secondary" href="/docs">Read the docs</a>
          </div>
        </div>
        <ReportSheet kind="clinical" report={clinicalExample.body.report} label="Clinical Trial Results Table QA" sub="A real audit of synthetic tables" />
      </div>

      <section className="section wrap" aria-labelledby="how">
        <h2 id="how">How it works</h2>
        <ol className="steps">
          <li><h3>Pick a validator</h3><p>Each API does one job, documented end to end: what it checks, input schema, output schema, pricing.</p></li>
          <li><h3>Test it live</h3><p>Every product page has a working test form. Run your real file or tables before you pay anything.</p></li>
          <li><h3>Call it from your pipeline</h3><p>REST endpoints, API keys, structured JSON reports. Prepaid credits through Stripe.</p></li>
        </ol>
      </section>

      <section className="section wrap" aria-labelledby="catalog">
        <h2 id="catalog">The catalog</h2>
        <div className="cards">
          <div className="card">
            <Badges api={mrf} />
            <h3><a href={`/apis/${mrf.slug}`}>{mrf.name}</a></h3>
            <p>Validates hospital machine-readable price files against the CMS v3.0.0 schema and CSV templates. JSON, tall CSV, wide CSV. Checks required metadata, template columns, billing code types, payer rules and the 2026 allowed-amount elements.</p>
            <p className="price">{dollars(mrf.priceCents)} per completed validation</p>
            <a className="btn small" href={`/apis/${mrf.slug}#demo`}>Validate a file</a>
          </div>
          <div className="card">
            <Badges api={clinical} />
            <h3><a href={`/apis/${clinical.slug}`}>{clinical.name}</a></h3>
            <p>Audits normalized clinical-trial study and outcome tables: NCT ID validity, required fields, duplicates, orphan outcomes, outcome types and results-posting dates. Exact row locations for every finding.</p>
            <p className="price">{dollars(clinical.priceCents)} per completed audit</p>
            <a className="btn small" href={`/apis/${clinical.slug}#demo`}>Audit your tables</a>
          </div>
          <div className="card">
            <Badges api={uad} />
            <h3><a href={`/apis/${uad.slug}`}>{uad.name}</a></h3>
            <p>Checks UAD 3.6 URAR appraisal XML, or the whole ZIP package, against the GSE-published delivery specification and compliance rules. Every finding has an XPath, a rule ID and a message. A PASS is not UCDP acceptance.</p>
            <p className="price">{dollars(uad.priceCents)} per completed report</p>
            <a className="btn small" href={`/apis/${uad.slug}#demo`}>Check a report</a>
          </div>
          <div className="card">
            <Badges api={pbj} />
            <h3><a href={`/apis/${pbj.slug}`}>{pbj.name}</a></h3>
            <p>Checks a nursing home's quarterly Payroll Based Journal staffing XML, or the upload ZIP, against the CMS v4.10.0 specifications before it goes to CMS, and flags staffing patterns CMS has named as audit or rating risks. A PASS is not CMS acceptance.</p>
            <p className="price">{dollars(pbj.priceCents)} per completed report</p>
            <a className="btn small" href={`/apis/${pbj.slug}#demo`}>Check a PBJ file</a>
          </div>
          <div className="card">
            <Badges api={wh347} />
            <h3><a href={`/apis/${wh347.slug}`}>{wh347.name}</a></h3>
            <p>Recomputes a weekly Davis-Bacon certified payroll against your wage determination rates before you sign it: basic rates, fringe benefits, overtime, apprentice rates and ratios, and the gross, deductions and net pay math. A PASS is not a compliance finding.</p>
            <p className="price">{dollars(wh347.priceCents)} per completed report</p>
            <a className="btn small" href={`/apis/${wh347.slug}#demo`}>Check a payroll</a>
          </div>
          <div className="card quiet">
            <h3>Next validator</h3>
            <p>The catalog grows from observed demand. Each new validator gets the same treatment: documented checks, live test, per-use pricing.</p>
            <a className="btn secondary small" href="/contact">Suggest a validator</a>
          </div>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="why">
        <h2 id="why">Why this exists</h2>
        <p>Regulated data is full of narrow, annoying, high-stakes validation problems. The existing options are usually a government PDF, a command-line tool that takes an afternoon to install, or an enterprise vendor that wants a contract.</p>
        <p>SpreadRun sits in the gap: hosted, documented, per-use tools for the specific checks that compliance teams, vendors, and data pipelines actually need, built to be called by people and by agents alike.</p>
        <p>What we won't do: generic AI wrappers, broad horizontal platforms, or tools that need a sales call to understand. If a validator can't be explained, tested, and bought in ten minutes, it doesn't belong here.</p>
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={HOME_FAQ} />
      </section>
    </Layout>
  );
}
