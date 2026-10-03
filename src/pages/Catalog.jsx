import Badges from '../site/Badges.jsx';
import Layout, { Crumbs } from '../site/Layout.jsx';
import { APIS, PARTNER_APIS, TIERS, CREDIT_PACKS, dollars } from '../catalog.js';

// One row per listed API, straight from the catalog, so prices here can never drift from the API.
export function PriceTable() {
  return (
    <div className="table-scroll">
      <table className="doc-table" style={{ maxWidth: 720 }}>
        <thead><tr><th>API</th><th>Price per completed run</th><th>Runs per $50 pack</th></tr></thead>
        <tbody>
          {APIS.map((a) => (
            <tr key={a.slug}><td><a href={`/apis/${a.slug}`}>{a.name}</a></td><td>{dollars(a.priceCents)}</td><td>{Math.floor(5000 / a.priceCents)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Catalog() {
  const listed = [...APIS, ...PARTNER_APIS].filter((a) => TIERS[a.tier].showOnSite);
  return (
    <Layout path="/apis">
      <Crumbs items={[['/', 'Home'], [null, 'APIs']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>Data Validation API Catalog and Pricing</h1>
        <p className="lede">Every API here is documented, testable for free on its page, and billed per completed run from prepaid credits.</p>
        <div className="cards">
          {listed.map((a) => (
            <div className="card" key={a.slug}>
              <Badges api={a} />
              <h3><a href={`/apis/${a.slug}`}>{a.name}</a></h3>
              <p>{a.summary}</p>
              <p className="price">{dollars(a.priceCents)} per {a.unit}</p>
              <div className="btn-row" style={{ marginTop: 4 }}>
                <a className="btn small" href={`/apis/${a.slug}#demo`}>Try it free</a>
                <a className="btn secondary small" href={`/docs/${a.slug}`}>Docs</a>
              </div>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 20 }}>Partner APIs from other providers will be listed here with a clear label when we have a partner agreement for them. There are none yet.</p>
      </div>

      <section className="section wrap" id="pricing" aria-labelledby="pricing-h">
        <h2 id="pricing-h">Pricing</h2>
        <p>Each API has a price per completed run, paid from prepaid credits. Credits are a dollar balance that works on every API, and they never expire.</p>
        <PriceTable />
        <h3 style={{ marginTop: 28 }}>Credit packs</h3>
        <p>{CREDIT_PACKS.map((p) => `$${p.priceCents / 100}`).join(', ').replace(/, ([^,]*)$/, ' and $1')} packs buy that much credit, usable on every API. A $5 pack covers 20 runs at $0.25 or 5 runs at $1.00. A $50 pack covers 2 runs at $25.00 and a $100 pack covers 4. Any mix works.</p>
        <ul>
          <li>A run is charged when it finishes and returns a report, whether the report says PASS, WARN or FAIL.</li>
          <li>Requests rejected before a report exists are free: bad JSON, clinical tables missing required columns or with ragged rows, an empty or corrupt gzip upload, invalid parameters, a missing or revoked key.</li>
          <li>A price file that turns out not to be a valid MRF (wrong format, unparseable) still gets a completed FAIL report, and that run is charged.</li>
          <li>For UAD appraisal files it is the other way round: anything that is not a UAD 3.6 URAR file (not XML, not MISMO 3.6, an Update or Completion Report) is rejected as invalid input and not charged. The same goes for PBJ staffing files: not XML, not a PBJ nursingHomeData file, or an Employee Link file. And for WH-347 payrolls: a PDF, a workbook missing a required sheet, or JSON without the payroll or the wage determination rates.</li>
          <li>If your balance is too low the report is not returned and nothing is charged.</li>
          <li>The test form on each product page is free, with daily limits. Signed in with credits, you can run full validations from the same form, paid from your balance.</li>
          <li>Unused credits are refundable on request within 30 days of purchase. See the <a href="/terms">Terms</a>.</li>
        </ul>
        <div className="btn-row"><a className="btn" href="/account">Get an API key</a></div>
      </section>
    </Layout>
  );
}
