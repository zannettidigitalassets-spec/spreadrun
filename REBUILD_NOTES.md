# Rebuild notes: SpreadRun API storefront v1

Branch `spreadrun/storefront-v1`, 2026-10-02. Nothing here is on production until the owner merges it.

## What the site is now

A Vite + React site, prerendered to static HTML at build time (one file per page, each with its own title,
meta description, canonical and JSON-LD), plus serverless functions on Vercel:

| Path | What |
|---|---|
| `/` | Storefront homepage |
| `/apis` | Catalog with tier badges, plus `#pricing` |
| `/apis/clinical-trial-table-validator` | Product page with live demo |
| `/apis/hospital-mrf-validator` | Product page (beta) with live demo, names CMS's free validator |
| `/docs`, `/docs/<api>` | Shared API docs and per-API reference |
| `/guides`, `/guides/hospital-price-transparency-file-requirements-2026` | SEO guide |
| `/account` | Email-code sign-in, API keys, credits, usage (noindex) |
| `/contact` | Contact form (Formspree, unchanged integration) |
| `/secondring` | SecondRing landing, moved off `/`, marked paused |
| `/guides/lsa-missed-call-charges-october-2026` | SecondRing guide, unchanged except links now point to `/secondring` |
| `/privacy`, `/terms` | Still the SecondRing documents. Drafts of the new umbrella versions are in `docs/legal-drafts/` and are not live |

## Reused

- Vercel project and deploy pipeline, apex-to-www redirect.
- Stripe integration: same SDK and account. Checkout, the webhook and the authenticated portal pattern from `secondring/stripe`
  (`api/_lib/clients.js`). Nothing in the Stripe dashboard was renamed or changed.
- Supabase project, email one-time-code sign-in, Resend email, Google Analytics, Search Console / Impact / AdSense meta tags.
- `/api/early-access` (SecondRing list) and `/api/rent-estimate` (410) unchanged.
- DataForge validators, copied byte for byte (see Provenance).

## Rebuilt

- Prerender pipeline: `src/routes.jsx` (one table for pages, metadata, JSON-LD, sitemap), `src/entry-server.jsx`,
  `scripts/prerender.mjs`, per-page code splitting in `src/entry-client.jsx`. `sitemap.xml` is generated at build.
- `npm run build` also runs `scripts/check-provenance.mjs` and `scripts/check-site.mjs`, which fail the build on:
  validator hash mismatch, more or fewer than one H1, missing or duplicate titles, meta descriptions that differ from the
  content files, missing JSON-LD (`SoftwareApplication`, `FAQPage`, `Article`, `Organization`, `WebSite`, `ItemList`),
  sitemap gaps, broken internal links, em dashes, personal names, leftover SaaS or "coming soon" copy, a stale $0.35
  price, or the website and API disagreeing on price or size limits.
- Python API routes (`api/v1/*.py`, `api/demo/*.py`, logic in `pylib/spreadrun_api/`), stdlib plus two pinned
  dependencies for the MRF validator (`requirements.txt`).
- Node routes: `api/account.js`, `api/keys.js`, `api/credits/checkout.js`, `api/customer-portal.js` (fixed),
  `api/stripe-webhook.js` (credit grants + receipt), `api/admin/metrics.js`, `api/admin/verdict-report.js` (weekly cron).
- Supabase migration `supabase/migrations/20261002_storefront.sql`.

## Security fix: `/api/customer-portal`

The old version took `{email}` from the request body and returned that customer's billing portal with no auth.
The new version verifies the Supabase session token and looks the customer up by the verified user id only; the body
is ignored. Tests in `api/_tests/api.test.mjs` prove: no token gives 401 even with an email in the body, a forged token
gives 401, and a signed-in user only ever gets their own customer. The dormant `Auth.jsx` "Manage Subscription" call
was deleted, not revived.

## Billing

- Prepaid credits held in cents. Packs: $5 (20 calls), $20 (80), $50 (200). $0.25 per completed run on every API.
  Credits never expire.
- Charged only when a report is produced (PASS, WARN or FAIL). Input errors, internal errors and billing outages are
  never charged and never return a report. A report is never returned without a successful charge.
- Every paid route charges through one function: `charge_request()` in `pylib/spreadrun_api/billing.py`, which calls the
  atomic `charge_request` SQL function (row lock, unique request id, balance can't go negative). Agent or per-request
  payments later become another branch inside that function; routes don't change.
- Checkout uses inline `price_data` from the server-side pack table, so no Stripe products had to be created. The webhook
  grants credits only for paid sessions whose amount matches the pack, once per session.
- Removed: the `plink_` Payment Link tier mapping and the real-estate welcome email. Replaced by a credit receipt email.

## Measurement and the 30-day verdict

Logged in Supabase, never with submitted data: demo runs, paid runs and their outcomes (`api_calls`), sign-ups, key
events and credit purchases (`storefront_events`, `credit_ledger`).

`storefront_metrics()` (also the `storefront_verdict` view, and `GET /api/admin/metrics` with `ADMIN_TOKEN`) computes:
PASS as soon as 3+ paying users or 25+ paid runs land within 30 days of `storefront_settings.launch_at`; KILL if the window
closes without either; IN_PROGRESS in between; NOT_STARTED until `launch_at` is set. Accounts whose email is in
`storefront_settings.internal_emails` never count. A Vercel cron emails the verdict every Monday
(`/api/admin/verdict-report`, production only) to `REPORT_EMAIL` (default spreadrun@gmail.com).

## Provenance

`pylib/spreadrun_api/validators/PROVENANCE.json` records the DataForge commit (`6604e1e`) and SHA-256 of each copied file.
The runtime refuses to run a validator whose hash doesn't match, and the build fails too. To update: change the validator in
DataForge, copy it here, update the hash, run the tests.

## Copy changes from the content files (honesty and V1 scope)

- Prices: content said $0.35 for MRF. Owner decision was a flat $0.25, so every page says $0.25.
- No em dashes anywhere: meta titles "X — Y" became "X: Y". Everything else in the meta tags is exactly as specified.
- MRF: URL fetching removed from the intro, how-it-works, homepage FAQ and guide (V1 is upload-only). The checks list now
  matches the validator: removed payer/plan consistency across rows, impossible-date checks beyond date format, and
  "retrieval safety"; added an explicit "Not checked" list and the real size limits (4.4 MB upload, 16 MB after gzip,
  up to 1,000 records). Pricing now says plainly that a non-MRF file gets a charged FAIL report.
- CMS's tool is named "Hospital Price Transparency Validator" with a link, without the unverified "V2.0".
  The guide links the CMS tool to CMS, not to our product page.
- Clinical: removed checks the validator does not run (near-duplicates, orphan studies, start and completion dates, JSON
  tables, "point the API at them"); listed the real rules and required columns. "Batch and scheduled audits are supported"
  became "call it from your scheduler" because no batch feature exists.
- The data-storage FAQ answers were filled in from the actual implementation (processed in memory, not stored, usage
  logs without contents). The bracketed "confirm with backend" notes and the homepage FAQ operator note were removed.

## Shelved, not deleted

- SecondRing: page at `/secondring` with a paused notice, early-access form and Twilio untouched. Product code stays on the
  `secondring/*` branches.
- Real-estate SaaS: calculators, guides, analyzer, My Deals and their Payment Links were removed from `main`'s source
  (they live in git history). Old URLs 301 to `/` or `/guides`.
- FetchAll: separate project, not touched.

## Known limitations

- Not deployed with real credentials yet: the Supabase migration must be applied and preview env vars set (owner checklist
  in the hand-off message) before paid calls, accounts and checkout work on a preview. The demo forms work without them.
- MRF validator only inspects a bounded part of large files, by design. Most real hospital files will come back WARN.
- No per-key rate limit; credits are the only throttle on paid calls.
- No tier-2 partner listings: none are approved. Tier 3 exists only in `src/catalog.js`.
- `/privacy` and `/terms` still show the SecondRing documents until the drafts are approved.
- The Stripe Customer Portal must be enabled in the Stripe dashboard (test and live) for the "Receipts and saved card"
  button; until then it shows a clear error.
- Factual claims in the MRF guide come from the owner's research file and were not independently re-verified, apart from
  the CMS validator links.
- DataForge's own demand scoring rated clinical table QA "REJECT, insufficient evidence" (2026-09-29). The verdict above is
  how this storefront tests that.

## Tests

- `node --test api/_tests/api.test.mjs`: portal auth fix, checkout pricing, webhook grants and tamper checks, key hashing, admin auth.
- `python3.12 -m unittest discover -s pylib/tests`: validator parity with DataForge's recorded outputs, upload adapter,
  paid flow (charge, no charge on input error, insufficient credits, races, billing outage), demo flow and limits, the real
  HTTP handler class.
- `npm i --no-save @electric-sql/pglite@0.3 && node supabase/tests/storefront.test.mjs`: the migration in an in-memory
  Postgres, including idempotent charges and grants, the 20-calls-per-$5 rule, revoked keys, demo limits and every verdict state.
- `python3.12 scripts/gen_examples.py` regenerates the docs examples by running the real handlers.
- Vercel only registers a Python route when the file has a literal `class handler(...)` (found by reproducing the failed preview build with `vercel build`). The four route files do that.
