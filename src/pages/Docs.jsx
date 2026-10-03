import Layout, { Crumbs } from '../site/Layout.jsx';
import { Json } from '../site/CodeSample.jsx';
import { APIS, dollars } from '../catalog.js';
import unauthorized from '../content/examples/error-unauthorized.json';
import insufficient from '../content/examples/error-insufficient-credits.json';

export const ERRORS = [
  ['400', 'input_error', 'The input cannot be validated: bad JSON, missing required columns, empty body, corrupt gzip, invalid parameters. Not charged.'],
  ['401', 'unauthorized', 'Missing, unknown or revoked API key.'],
  ['402', 'insufficient_credits', 'Your balance is below the price of one run. The report is not returned and nothing is charged.'],
  ['405', 'method_not_allowed', 'Use POST.'],
  ['413', 'payload_too_large', 'Request body over the endpoint limit (4.4 MB for paid calls; lower for the free demo).'],
  ['429', 'rate_limited', 'Free demo endpoints only: 10 runs per day per API.'],
  ['500', 'internal_error', 'The validator failed. Not charged. Retrying with the same input is safe.'],
  ['503', 'billing_unavailable', 'Billing could not be confirmed, so the report was withheld. Not charged. Retry later.'],
];

export function ErrorTable() {
  return (
    <div className="table-scroll">
      <table className="doc-table">
        <thead><tr><th>HTTP</th><th>error.code</th><th>Meaning</th></tr></thead>
        <tbody>{ERRORS.map(([h, c, m]) => <tr key={c}><td>{h}</td><td><code>{c}</code></td><td>{m}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default function Docs() {
  return (
    <Layout path="/docs">
      <Crumbs items={[['/', 'Home'], [null, 'Docs']]} />
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>SpreadRun API documentation</h1>
        <p className="lede" style={{ marginTop: 20 }}>Everything common to every SpreadRun API: authentication, billing, errors and limits. Each API has its own page for request and report formats.</p>

        <h2>APIs</h2>
        <table className="doc-table">
          <thead><tr><th>API</th><th>Endpoint</th><th>Price</th></tr></thead>
          <tbody>
            {APIS.map((a) => (
              <tr key={a.slug}>
                <td><a href={`/docs/${a.slug}`}>{a.name}</a>{a.status === 'beta' ? ' (beta)' : ''}</td>
                <td><code>POST /api/v1/{a.slug}</code></td>
                <td>{dollars(a.priceCents)} per {a.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 id="auth">Authentication</h2>
        <p>Create a key on your <a href="/account">account page</a>. Keys start with <code>sr_</code> and are shown once; we store only a hash. Send the key on every paid call:</p>
        <pre className="code"><code>Authorization: Bearer sr_your_key</code></pre>
        <p><code>X-API-Key: sr_your_key</code> also works. Revoke a key on the account page and it stops working immediately. Up to 10 active keys per account.</p>

        <h2 id="billing">Credits and billing</h2>
        <ul>
          <li>Each API has its own price per completed run (see the table above), taken from prepaid credits. Credits are held in cents and work on every API. Packs: $5, $20, $50 and $100 of credit, which is 20, 80, 200 or 400 standard runs at $0.25. Credits never expire.</li>
          <li>A run is charged once, when it returns a report (PASS, WARN or FAIL). Each response carries a <code>requestId</code>; the same request is never charged twice.</li>
          <li>Input errors, internal errors and billing outages are never charged, and in those cases no report is returned.</li>
          <li>Successful responses include <code>priceCents</code>, what this run cost, and <code>balanceCents</code>, your remaining credit after the charge.</li>
          <li>Signed in on the website, the test form on each product page can run full validations paid from the same balance, with no API key.</li>
        </ul>

        <h2 id="response">Response envelope</h2>
        <p>Successful calls return HTTP 200 with the validator's report inside an envelope:</p>
        <pre className="code"><code>{`{
  "requestId": "uuid",
  "api": "clinical-trial-table-validator",
  "mode": "paid",
  "charged": true,
  "priceCents": 25,
  "balanceCents": 950,
  "report": { ... }
}`}</code></pre>
        <p>The report format is different for each API and documented on its page. Every response also has an <code>X-Request-Id</code> header.</p>

        <h2 id="errors">Errors</h2>
        <p>Errors return a JSON body with <code>error.code</code> and a plain-language <code>error.message</code>.</p>
        <ErrorTable />
        <p>Example: HTTP {unauthorized.status}</p>
        <Json value={unauthorized.body} />
        <p>Example: HTTP {insufficient.status}</p>
        <Json value={insufficient.body} />

        <h2 id="limits">Limits</h2>
        <ul>
          <li>Request body: up to 4.4 MB on paid endpoints. The hosting platform rejects anything over 4.5 MB before it reaches us.</li>
          <li>Time: a run that takes longer than 30 seconds is stopped and not charged. Typical runs take well under a second.</li>
          <li>Rate: there is no per-key rate limit in this version. If you plan sustained traffic above one request per second, <a href="/contact">tell us first</a>.</li>
        </ul>

        <h2 id="demo">Free demo endpoints</h2>
        <p>Each API has a demo endpoint that needs no key and is never charged: <code>POST /api/demo/&lt;api&gt;</code>. It takes the same input with smaller limits (512 KB for clinical tables, 2 MB and 100 records for MRF files, 1 MB for UAD appraisal files and PBJ staffing files, 512 KB for WH-347 payrolls) and allows 10 runs per day per API from one network. It is what the test forms on the product pages use.</p>

        <h2 id="privacy">Your data</h2>
        <p>Submitted tables, files and appraisal reports are processed in memory for the length of the request and are not stored. We log the time, endpoint, outcome, report status, request size and duration for billing and usage, never the submitted contents.</p>
      </div>
    </Layout>
  );
}
