import Layout, { Crumbs } from '../site/Layout.jsx';

export const MRF_GUIDE = {
  slug: 'hospital-price-transparency-file-requirements-2026',
  title: 'Hospital Price Transparency File Requirements: The Complete 2026 Guide',
  published: '2026-10-02',
};

const CMS_HPT = 'https://www.cms.gov/hospital-price-transparency';
const CMS_TOOL = 'https://cmsgov.github.io/hpt-tool/';
const PRODUCT = '/apis/hospital-mrf-validator';

// Copy: content/ARTICLE_mrf-guide.md. Edits: no em dashes; CMS tool named without an unverified
// version number and linked to CMS; SpreadRun section matches V1 (uploads, $0.25, bounded sampling).
export default function MrfGuide() {
  return (
    <Layout path={`/guides/${MRF_GUIDE.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/guides', 'Guides'], [null, '2026 MRF requirements']]} />
      <article className="wrap section article" style={{ paddingTop: 24 }}>
        <h1 style={{ maxWidth: '22ch' }}>Hospital Price Transparency File Requirements: The Complete 2026 Guide</h1>
        <p className="small muted" style={{ marginTop: 16 }}>Published October 2, 2026</p>

        <p>If your hospital publishes a machine-readable price file (and since 2021, every hospital operating in the US is required to), 2026 changed what has to be in it. CMS finalized new data elements, started enforcing them on April 1, 2026, and the files are now expected to contain claims-derived statistics, not estimates.</p>
        <p>This guide covers what the file must contain, which formats CMS accepts, what changed in 2026, the mistakes that most commonly break files, and how to check yours before it goes public.</p>

        <h2>The two things CMS requires</h2>
        <p>The hospital price transparency rule has two deliverables. They are often confused; they are not interchangeable.</p>
        <ol>
          <li><b>A comprehensive machine-readable file (MRF)</b> containing standard charges for all items and services the hospital provides. This is the technical file, and the subject of this guide.</li>
          <li><b>A consumer-friendly display of shoppable services:</b> a human-readable web page showing prices for common shoppable services.</li>
        </ol>
        <p>This guide covers the MRF only. If you're responsible for the shoppable display, CMS publishes a separate "10 steps" document for it. But most of the enforcement attention, and most of the file-format pain, lives in the MRF.</p>

        <h2>File formats: JSON, tall CSV, or wide CSV</h2>
        <p>Since July 1, 2024, hospitals have been required to use a CMS template layout and data specifications, not a homegrown format. CMS publishes the current template as <b>v3.0</b>, in three layouts:</p>
        <ul>
          <li><b>JSON (v3.0 schema):</b> the structured option; best for hospitals with many payers and plans, and the format most downstream consumers prefer to parse.</li>
          <li><b>Tall CSV:</b> one row per item or service, payer and plan combination. Long files, simple structure.</li>
          <li><b>Wide CSV:</b> one row per item or service, with payer and plan charges spread across columns. Shorter files, wider rows, easier to break.</li>
        </ul>
        <p>All three are legal. Pick the one your data pipeline can generate correctly and consistently: a correct tall CSV beats a broken JSON file every time. Whichever you choose, the file must conform to the CMS data dictionary for that layout. Field names, value formats, and required elements are specified, not suggested.</p>
        <p>CMS also publishes an <b>MRF file naming wizard</b> that generates compliant file names under the required naming convention. Use it. Non-conforming file names are one of the most avoidable failure modes.</p>

        <h2>What's inside the file</h2>
        <p>At a high level, the MRF must contain each type of <b>standard charge</b> for every item and service the hospital provides:</p>
        <ul>
          <li><b>Gross charges:</b> the chargemaster rate.</li>
          <li><b>Discounted cash prices:</b> what a self-pay patient pays.</li>
          <li><b>Payer-specific negotiated charges:</b> the rates negotiated with each payer and plan, identified by payer name and plan name.</li>
          <li><b>De-identified minimum and maximum negotiated charges:</b> the floor and ceiling across payers.</li>
        </ul>
        <p>Each charge must be tied to the item or service it describes, with relevant <b>billing codes</b> (CPT, HCPCS, MS-DRG, NDC, and others as applicable), descriptions, and, where the rule requires it, the contracting method and other modifiers. The file also carries hospital identity metadata and must reflect current standard charge information, updated at least annually.</p>

        <h2 id="changes-2026">What changed in 2026</h2>
        <p>The Calendar Year 2026 Outpatient Prospective Payment System final rule replaced estimates with actuals and added statistical reporting. The requirements took effect January 1, 2026, with enforcement beginning April 1, 2026. The changes:</p>
        <p><b>Allowed amounts are now actual dollar amounts, not estimates.</b> For payer-specific negotiated charges based on a percentage or algorithm, hospitals must encode the <b>median allowed amount</b>, replacing the old estimated allowed amount, plus the <b>10th and 90th percentile allowed amounts</b>, all in dollars.</p>
        <p><b>You must also encode the count.</b> Alongside the three allowed-amount figures, the file must include the <b>count of allowed amounts</b> used to calculate them.</p>
        <p><b>The lookback period is specified.</b> Hospitals must calculate these figures from electronic remittance data (EDI 835 electronic remittance advice, or an equivalent source) using a lookback period of <b>no less than 12 months and no longer than 15 months</b> prior to posting the MRF.</p>
        <p><b>Organizational NPI is required.</b> The MRF must report any Type 2 (organizational) National Provider Identifiers associated with the hospital's primary taxonomy code, active as of the most recent update to the standard charge information.</p>
        <p><b>A senior official must attest.</b> Hospitals must include an attestation from a senior official confirming the information is accurate and complete. The MRF affirmation statement was also modified under the 2026 rule.</p>
        <p>In plain terms: CMS moved from "publish your best estimate of the format" to "publish claims-derived statistics computed a specified way, and have someone senior sign off on them." Files generated under the old assumptions, especially anything still encoding estimated allowed amounts, need to be rebuilt, not patched. (Our validator checks that these fields are present and well-formed; <a href={`${PRODUCT}#faq`}>see what it covers</a>.)</p>

        <h2>The cms-hpt.txt discovery file</h2>
        <p>CMS requires each hospital to serve a small text file at the root of the public site hosting the MRF: <code>https://&lt;your-domain&gt;/cms-hpt.txt</code>. It tells CMS (and everyone else) where your files live. The format uses five fields per hospital location, repeatable for multiple locations:</p>
        <ul>
          <li><code>location-name</code></li>
          <li><code>source-page-url</code></li>
          <li><code>mrf-url</code></li>
          <li><code>contact-name</code></li>
          <li><code>contact-email</code></li>
        </ul>
        <p>CMS publishes a TXT file generator to produce it correctly. Common mistakes: hosting it on the corporate domain while the MRF lives on a vendor's domain (the rule allows the hosting site to be a health-system or vendor origin, but the txt file must point at the real file), letting the contact email go stale, and forgetting to update the <code>mrf-url</code> when the file moves. CMS expressly permits the txt URL itself to redirect, so use that rather than serving a stale file.</p>

        <h2>Common failure modes</h2>
        <p>Across the industry, the same categories of defects recur. One independent open-source analysis estimated that while roughly 90% of hospitals had posted an MRF by early 2026, only about one in five files was fully compliant on data quality. Treat that as directional, but the gap between "posted" and "correct" is the entire game here.</p>
        <p><b>Schema and layout errors.</b> Fields that don't match the v3.0 data dictionary: wrong names, wrong types, extra undeclared fields in strict contexts. This is what validators catch first and fastest.</p>
        <p><b>Missing required data elements.</b> The 2026 additions are the current trap: files that still encode estimated allowed amounts, or omit the median, percentile and count trio, or lack the organizational NPI. Every rule change creates a cohort of files that were compliant last year and aren't this year.</p>
        <p><b>Stale data.</b> Standard charge information must be current, updated at least annually. A file generated eighteen months ago and never refreshed is a compliance problem regardless of its format.</p>
        <p><b>Broken discovery.</b> A perfect MRF that <code>cms-hpt.txt</code> doesn't point to, or points to with a dead URL, fails the practical test. CMS's enforcement process starts from discovery.</p>
        <p><b>Encoding and size problems.</b> CSVs with encoding corruption, truncated rows from interrupted exports, JSON files that no parser can finish reading. These are pipeline bugs, not policy disagreements, and they're embarrassing to discover via a CMS warning notice.</p>
        <p><b>Inconsistent payer and plan structures.</b> Payer names and plan names that vary row to row ("Blue Cross" vs "BCBS" vs "BlueCross BlueShield"): the file parses, but it's unusable, and it signals the underlying data was never normalized.</p>

        <h2>How to check your file before posting</h2>
        <p><b>Step 1: run CMS's own validator.</b> CMS publishes a free <a href={CMS_TOOL}>Hospital Price Transparency Validator</a>, online and as a downloadable command-line tool, that tests MRFs against the required template layouts and data specifications, alongside the naming wizard and TXT generator. Run your file through it before anything else. If it fails there, fix it there.</p>
        <p><b>Step 2: check discovery end to end.</b> Fetch <code>https://&lt;your-domain&gt;/cms-hpt.txt</code> from a clean browser, follow the <code>mrf-url</code>, and confirm you land on the current file, not last quarter's. Do this after every posting cycle, not just the first one.</p>
        <p><b>Step 3: automate the check in your pipeline.</b> Manual validation works once; posting cycles repeat. This is the gap SpreadRun's <a href={PRODUCT}>MRF validator</a> fills: a hosted API that checks JSON v3.0, tall CSV, and wide CSV against the CMS v3.0.0 schema and templates, including the 2026 data elements, and returns a deterministic, itemized report your pipeline can gate on. Upload the file and get each finding with its rule and location. No installation, no Docker, $0.25 per completed validation. It inspects a bounded part of each file (metadata, template structure and up to 1,000 records), and the report says how much it read.</p>
        <p>The honest version: CMS's free tool is fine for a person checking one file, and it reads the whole file. If files move through a system (vendor onboarding, quarterly reposting, multi-hospital health systems), the check belongs in the pipeline, not in someone's browser.</p>

        <h2>Enforcement: what happens if the file is wrong</h2>
        <p>CMS audits a sample of hospitals, investigates complaints, and its enforcement toolkit escalates: warning notices, required corrective action plans, and civil monetary penalties that may be publicly reported. The 2026 rule's shift toward claims-derived, statistically specified data elements makes files more mechanically auditable than before, which cuts both ways. It's easier to verify a correct file, and easier to spot a wrong one.</p>
        <p>The cheapest compliance strategy hasn't changed: generate the file from real data, validate it against the spec before posting, keep discovery working, and re-verify on every cycle. The hospitals that get warning notices are rarely the ones with exotic legal theories. They're the ones with stale files, broken links, and missing data elements.</p>
        <p className="small muted">Official source: <a href={CMS_HPT}>CMS hospital price transparency resources</a>. This guide is general information, not legal advice.</p>

        <div className="note" style={{ marginTop: 32 }}>
          <p><b>Check your file before CMS does.</b> Run the Hospital Price Transparency MRF Validator: deterministic report, exact finding locations, $0.25 per completed validation. <a href={`${PRODUCT}#demo`}>Validate a file</a></p>
        </div>
      </article>
    </Layout>
  );
}
