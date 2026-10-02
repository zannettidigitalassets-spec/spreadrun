import Layout, { Crumbs } from '../site/Layout.jsx';
import { APIS, PARTNER_APIS, TIERS, CREDIT_PACKS, PRICE_PER_CALL_CENTS, dollars } from '../catalog.js';

export default function Catalog() {
  const listed = [...APIS, ...PARTNER_APIS].filter((a) => TIERS[a.tier].showOnSite);
  return (
    <Layout path="/apis">
      <Crumbs items={[['/', 'Home'], [null, 'APIs']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>APIs</h1>
        <p className="lede">Every API here is documented, testable for free on its page, and billed per completed run from prepaid credits.</p>
        <div className="cards">
          {listed.map((a) => (
            <div className="card" key={a.slug}>
              <div className="badges">
                <span className="badge tier">{TIERS[a.tier].label}</span>
                {a.status === 'beta' && <span className="badge beta">Beta</span>}
              </div>
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
        <p>One price for every API: <b>{dollars(PRICE_PER_CALL_CENTS)} per completed run.</b> Buy prepaid credits in your account. Credits never expire and work on every API.</p>
        <div className="packs">
          {CREDIT_PACKS.map((p) => (
            <div className="pack" key={p.id}>
              <div className="amt">{dollars(p.priceCents)}</div>
              <div>{p.calls} runs</div>
            </div>
          ))}
        </div>
        <ul>
          <li>A run is charged when it finishes and returns a report, whether the report says PASS, WARN or FAIL.</li>
          <li>Requests rejected before a report exists are free: bad JSON, clinical tables missing required columns or with ragged rows, an empty or corrupt gzip upload, invalid parameters, a missing or revoked key.</li>
          <li>A price file that turns out not to be a valid MRF (wrong format, unparseable) still gets a completed FAIL report, and that run is charged.</li>
          <li>If your balance is too low the report is not returned and nothing is charged.</li>
          <li>The test form on each product page is free, with daily limits.</li>
        </ul>
        <div className="btn-row"><a className="btn" href="/account">Get an API key</a></div>
      </section>
    </Layout>
  );
}
