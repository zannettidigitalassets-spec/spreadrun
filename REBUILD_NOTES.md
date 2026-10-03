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
| `/apis/uad-36-appraisal-validator` | Product page (beta) with credit-aware test form; UAD 3.6 URAR validator, $1.00 |
| `/docs`, `/docs/<api>` | Shared API docs and per-API reference |
| `/guides`, `/guides/hospital-price-transparency-file-requirements-2026` | SEO guide |
| `/account` | Email-code sign-in, API keys, credits, usage (noindex) |
| `/contact` | Contact form (Formspree, unchanged integration) |
| `/privacy`, `/terms` | SpreadRun-only documents, approved 2026-10-02 |

## Reused

- Vercel project and deploy pipeline, apex-to-www redirect.
- Stripe integration: same SDK and account. Checkout, the webhook and the authenticated portal pattern from `secondring/stripe`
  (`api/_lib/clients.js`). Nothing in the Stripe dashboard was renamed or changed.
- Supabase project, email one-time-code sign-in, Resend email, Google Analytics, Search Console / Impact / AdSense meta tags.
- `/api/rent-estimate` and `/api/early-access` both answer 410 Gone from one function, `api/retired.js`, through
  `vercel.json` rewrites (see Function limit).
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
  `api/stripe-webhook.js` (credit grants + receipt), `api/admin/metrics.js`.
- Supabase migration `supabase/migrations/20261002_storefront.sql`.

## Security fix: `/api/customer-portal`

The old version took `{email}` from the request body and returned that customer's billing portal with no auth.
The new version verifies the Supabase session token and looks the customer up by the verified user id only; the body
is ignored. Tests in `api/_tests/api.test.mjs` prove: no token gives 401 even with an email in the body, a forged token
gives 401, and a signed-in user only ever gets their own customer. The dormant `Auth.jsx` "Manage Subscription" call
was deleted, not revived.

## Billing

- Prepaid credits held in cents. Packs: $5, $20, $50 of credit (20, 80, 200 standard runs at $0.25). Each API has its own
  price per completed run (`price_cents` in `pylib/spreadrun_api/catalog.py`, `priceCents` in `src/catalog.js`, the build
  fails if they differ): Clinical $0.25, MRF $0.25, UAD 3.6 $1.00. The Terms price table renders from the catalog.
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
`storefront_settings.internal_emails` never count. For V1 the owner checks it manually: `GET /api/admin/metrics` with
`Authorization: Bearer <ADMIN_TOKEN>`, or `select * from storefront_verdict;` in Supabase. (A weekly emailed verdict was built
and removed to stay under the Hobby function limit; it is in git history at `ef7c286` if wanted later.)

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

- SecondRing: removed from the site on 2026-10-02 (landing page, LSA guide, early-access form, legal Part B). `/secondring` and
  `/guides/lsa-missed-call-charges-october-2026` 308 to `/`; `/api/early-access` answers 410. Twilio was not touched, and the
  early-access signups already collected stay in the Supabase `early_access` table. Product code stays on the `secondring/*` branches.
- Real-estate SaaS: calculators, guides, analyzer, My Deals and their Payment Links were removed from `main`'s source
  (they live in git history). Old URLs 301 to `/` or `/guides`.
- FetchAll: separate project, not touched.

## Function limit (Hobby plan)

Vercel Hobby allows at most 12 serverless functions per deployment. The project uses 8:

| Function | Serves |
|---|---|
| `api/[channel]/[slug].py` | every validator, both `/api/v1/<api>` (paid) and `/api/demo/<api>` (free demo) |
| `api/account.js`, `api/keys.js`, `api/credits/checkout.js`, `api/customer-portal.js`, `api/stripe-webhook.js` | accounts and billing |
| `api/admin/metrics.js` | the launch verdict |
| `api/retired.js` | 410 Gone for `/api/rent-estimate` and `/api/early-access` (via `vercel.json` rewrites) |

Adding a validator means adding it to `pylib/spreadrun_api/catalog.py` and a runner; it adds no function. Static functions win
over the dynamic route because Vercel checks the filesystem first. The route file receives either the public path or the route
destination (`/api/[channel]/[slug]?channel=v1&slug=<api>`); `handler.resolve_route` accepts both. Verified on 2026-10-02 with
`vercel build` and by running the built bundle through Vercel's own Python runtime. `npm run build` fails above 12 functions.

History: 13 functions failed the first preview; dropping the rent-estimate function and the weekly verdict cron got to 11;
the dispatcher got to 8.

## UAD 3.6 Appraisal Report Validator (branch `spreadrun/uad-36-validator`)

SpreadRun's own validator, not a DataForge copy. `POST /api/v1/uad-36-appraisal-validator` (and `/api/demo/...`), same
dispatcher function, so still 8 functions. Body: a UAD 3.6 URAR XML file or the UAD 3.6 ZIP package (its one XML is used).

- **Sources.** GSE-published Appendix A-1 (URAR Delivery Specification, sheet "UAD Delivery Spec 1.4") and Appendix H-1
  (URAR Compliance Rules, sheet "UAD Compliance Rules v1.5"), downloaded 2026-10-02. They are not committed (public repo),
  nor is the MISMO XSD, which is not used at all. D-1 sample scenarios are not committed either (GSE copyright notice).
- **Rule table.** `scripts/uad/build_rules.py --spec-dir <folder with a1.xlsx, h1.xlsx>` writes
  `pylib/spreadrun_api/validators/uad/rules.json` (paths, formats, supported values, R/CR flags, cardinality, translated
  H-1 logic; no MISMO definitions) and `src/content/uad-coverage.json` (what the website states). Source SHA-256s are
  recorded in rules.json. Rerun it when the GSEs publish new appendix versions.
- **Translation.** H-1 rule logic is plain English. The script parses the shapes with one reading (required, conditional,
  comparisons, instance counts, uniqueness, date formats, ZIP/state codes, report age). Outside parentheses H-1 means
  "If A or B, and C is not provided" as (A or B) and C; that precedence is applied. 585 of 728 rules translate (480 Fatal,
  105 Warning). The other 143 are listed in every report and on the docs page with a reason: date arithmetic or sums
  (69), wording without one reading (47), RELATIONSHIP/xlink links (20), "for each combination" across comparables (4),
  names not in A-1 (3). Three evident typos are corrected and recorded (IMRPOVEMENT, ConstructionMethod, "in in").
- **Evaluation.** Three-valued: a rule fires only when its condition is definitely true, so a missing or ambiguous
  input never produces a finding. Rules are scoped per valuation PROPERTY (@ValuationUseType) and per container instance.
  A-1 checks: unknown elements (warning), closed enumerations (Enumerated/Boolean only), formats, empty elements,
  required (R) only where the container path has one context for that use type, cardinality per use type.
- **Verification.** All 12 D-1 samples PASS with zero findings as of their signature dates. Removal mutation sweep over
  every data point of every sample: 320 of 585 rules fire, zero findings about any other data point. Targeted mutations
  in `pylib/tests/test_uad.py` cover each rule family. `UAD_SAMPLES_DIR=<folder> python3.12 -m unittest ...` adds the
  sample test; without it that one test is skipped.
- **Fixtures.** `scripts/uad/make_fixtures.py --sample SF1.xml` writes synthetic `uad-pass.xml` / `uad-fail.xml`
  (every name, address, identifier and narrative replaced; schemaLocation with a local path removed) to the test fixtures
  and `public/samples/`. They are dated 2019, so they are checked with `asOf=2019-09-20`.
- **Not supported:** Appraisal Update (H-2) and Completion (H-3) reports are rejected as input errors (no samples to
  test them against). Invalid input is never charged.
- **Personal data (owner approved 2026-10-02):** real UAD files name the borrower, owner and seller. The Terms and
  Privacy policy each gained one paragraph allowing that personal data for this validator only (processed in memory, not
  stored; the PHI prohibition still applies). Nothing else in the legal pages changed.
- **No value echo:** findings carry only severity, ruleId, path, message and specReference. Report metadata is limited
  to the six use types and the spec's own label and version patterns. `UadNoValueEcho` in `test_uad.py` overwrites every
  value and attribute in a report with markers and fails if any marker appears in the report or an error message.

## SEO pass (branch `spreadrun/seo-pass`, 2026-10-02)

- Titles, H1s and meta descriptions live in `src/routes.jsx` and the page files. Indexable pages must have 150 to 160
  character descriptions; `scripts/check-site.mjs` enforces it, plus one H1 per page, a self-referencing canonical
  (the homepage is `https://www.spreadrun.com/`, matching the sitemap), Organization JSON-LD on every page,
  BreadcrumbList on product, docs and guide pages, complete SoftwareApplication offers, no rating or review markup and
  no empty JSON-LD fields.
- Legacy URLs 301 straight to absolute www destinations and are listed before the apex-to-www rule, so neither host
  takes two hops. Vercel's own trailing-slash rule runs before user redirects, so `/secondring/` (with a slash) is
  308 then 301; nothing links to it.
- Fonts load without blocking first paint; `--muted` darkened to pass 4.5:1 contrast. Lighthouse on the local build:
  mobile performance 97 to 98, accessibility, SEO 100.
- New guides: `/guides/uad-3-6-requirements-2026`, `/guides/clinical-trial-data-quality-checks`.

## PBJ Staffing Data Pre-Submission QA (branch `spreadrun/pbj-staffing-qa`, 2026-10-03)

SpreadRun's own validator. `POST /api/v1/pbj-staffing-qa` (and `/api/demo/...`), same dispatcher function, so still 8
functions. $25.00 per completed report (professional tier, `PROFESSIONAL_RUN_CENTS`; was $1.00 at launch). Body: the quarterly PBJ staffing XML,
gzip of it, or the CMS upload ZIP (up to 20 XML files, each up to 50 MB uncompressed, one combined report and one charge).

- **Sources.** CMS PBJ Data Specifications v4.10.0 (January 16, 2026; the only version CMS accepts from April 1, 2026),
  downloaded from the CMS Staffing Data Submission page 2026-10-03. `scripts/pbj/build_spec.py --spec-dir <unzipped
  specs>` writes `pylib/spreadrun_api/validators/pbj/spec.json` (state, job title and pay type codes, edit IDs with CMS
  severity and text, source SHA-256s) and copies `nhpbj_4_10_0.xsd`. CMS material is public domain, so both are
  committed. Rerun when CMS publishes a new version. Policy Manual v2.8 and FAQ (August 2026), the Five-Star Technical
  Users' Guide (July 2026), the 2018 audit-selection criteria and OIG A-09-24-02005 were read for the risk flags and copy.
- **Rule families.** `XSD` and `CMS-<edit>` (CMS numbers and severities; Fatal = error), `RISK-*` (documented audit or
  rating risks, always warnings, each with a `source` key), `SR-*` (file consistency, warnings). Rule table on
  `/docs/pbj-staffing-qa`.
- **Risk flags used, and not used.** Used: >400 hours a month per employee ID (CMS audit selection criterion, 2018),
  4+ days without RN hours (Five-Star one-star staffing rule), SSN-shaped employee IDs (Policy Manual), empty replace
  upload (Data Specs Overview). Not used because no CMS or OIG source was found: an "800 to 900 hours per quarter"
  trigger and an OIG "39 to 55 percent" figure from the brief. OIG A-09-24-02005 says 45 of 100 sampled homes reported
  unsupported RN hours; that is cited as context, not turned into a rule.
- **Not checkable from the file:** payroll match, onsite work and meal-break deduction (no shift times), facility and
  employee IDs on file with CMS (-3693, -4016; -4016 is approximated against the file's own employees section as a
  warning), census and HPRD (MDS), Employee Link files (rejected as input errors), file naming. All listed in `notChecked`.
- **Clock.** `asOf` (default today UTC) drives -4002 (no future dates) and the RN-day count, which stops at asOf so an
  in-progress quarter is not penalized. Samples and examples use `asOf=2026-10-03`.
- **Fixtures.** `scripts/pbj/make_fixtures.py` writes `pbj-pass.xml` / `pbj-fail.xml` (fictional facility SRDEMO01,
  FY2026 Q4) to the test fixtures and `public/samples/`.
- **Personal data:** PBJ files carry pseudonymous employee IDs, hire and termination dates and hours. The Terms and
  Privacy paragraphs that would allow this are PROPOSED, NOT APPLIED; the product page links to the Terms on the
  assumption they are approved before merge. Do not merge without them.
- **No value echo:** `PbjNoValueEcho` in `test_pbj.py` marks every value and attribute (single XML, multi-file ZIP and
  error paths) and checks the report, error messages, ledger and usage log contain no marker. Findings carry only
  severity, ruleId, path, message, source (and file for multi-file ZIPs, a position, never a name).
- **Load:** a synthetic 300-employee quarter (5.8 MB XML, 70 KB gzipped) validates in about 1.2 s using about 89 MB.

## Davis-Bacon WH-347 Certified Payroll Pre-Check (branch `spreadrun/wh347-payroll-precheck`, 2026-10-03)

SpreadRun's own check. `POST /api/v1/wh347-payroll-precheck` (and `/api/demo/...`), same dispatcher, still 8 functions.
$25.00 per completed report (professional tier, `PROFESSIONAL_RUN_CENTS`). Demo limit 512 KB.

- **Input.** An .xlsx workbook (sheets Header, Payroll, Wage Determination, optional Apprenticeship) or JSON with the
  header object and the tables as CSV text. Columns follow Form WH-347 Rev. January 2025 (one row per worker per
  classification, daily ST and OT hours, 6A to 9). The .xlsx reader is our own (zipfile + ElementTree, no new
  dependency; DOCTYPE/ENTITY rejected, 50 MB uncompressed cap, 5,000 rows per table).
- **Wage determination rates are supplied by the caller.** No live lookup: the GSA API directory lists no SAM.gov wage
  determination API and wdol.gov is retired, so there is no stable public source to rely on. The page says so.
- **Sources (verified 2026-10-03):** DOL WH-347 page and instructions (form Rev. January 2025, OMB 1235-0008), the
  annotated guide, and 29 CFR part 5 from eCFR: 5.5(a)(1), 5.5(a)(3)(ii)(B) (no full SSNs), 5.5(a)(4)(i) apprentices,
  5.5(b)(1) CWHSSA overtime, 5.31 fringe crediting, 5.32 overtime excludes fringe and cash in lieu.
- **Deliberate choices.** Fringe check follows 5.31: any mix of plan credit, cash in lieu and cash wage above the basic
  rate counts, but nothing makes up a basic rate shortfall. OT below 1.5x the WD basic rate is an error; below 1.5x the
  rate actually paid is a warning (5.32(c) makes that a question of fact). 7A is an error only when below hours x rates;
  otherwise a mismatch is a warning, because DOL does not state whether 7A includes 6C. Apprentice ratio is a warning:
  only this payroll is visible. Trainees are not handled: the current 5.5(a)(4) and the 2025 form cover registered
  apprentices only.
- **Not checked:** correctness of the supplied rates, classification of work, hours on other projects, apprentice
  registration, bona fide plans/annualization/unfunded plan approval, permissible deductions, the signed statement.
- **Fixtures:** `scripts/wh347/make_fixtures.py` (needs openpyxl at build time only) writes pass/fail payrolls as .xlsx
  and JSON plus example CSVs, with invented workers and invented rates, to the fixtures and `public/samples/`.
- **Personal data:** Terms and Privacy each gained one paragraph for certified payrolls (separate commits, for review).
- **No value echo:** `Wh347NoValueEcho` in `test_wh347.py` (every cell a marker; markers in names, IDs and
  classifications that still validate; error messages; ledger and usage log).
- **Load:** 5,000 payroll rows (700 KB JSON) checked in about 0.4 s, about 52 MB.
## Professional tier, PBJ staffing estimate, $100 pack (branch `spreadrun/pbj-professional`, 2026-10-03)

- **Pricing.** `PROFESSIONAL_RUN_CENTS = 2500`. PBJ moves to $25.00 per completed report; UAD stays $1.00, clinical and
  MRF stay $0.25. A $100 pack (`pack_100`) joins $5/$20/$50 in server-side `PACKS` (checkout and webhook read only
  that) and in `src/catalog.js`. Checkout uses inline `price_data`, so no Stripe dashboard change is needed.
- **Staffing estimate.** Optional query inputs on the PBJ endpoint: `census` (resident days in the quarter),
  `weekendCensus`, `caseMixRatio`, `rnTurnover`, `nurseTurnover`, `adminDepartures`. Method: CMS Five-Star Technical
  Users' Guide, September 2026 (job codes 5-12 total nurse, 5-7 RN; weekend = Saturday and Sunday; adjusted = reported
  / case-mix ratio, an approximation of CMS's reported / case-mix x national average; Table A2 cut points compared at
  three decimals; Table 3 star thresholds; staffing-level exclusions; four-or-more-no-RN-days one-star exception).
  Missing turnover gives a score and star range. Always labelled as an estimate with its assumptions. Not computed for
  multi-file ZIPs. Inputs are never echoed (`PbjStaffingEstimate.test_staffing_inputs_never_echoed`).
- **Deadline.** Every PBJ report has `submissionDeadline` (quarter end + 45 days, days remaining as of asOf). The page
  banner computes the next deadline in the browser.
- **Copy.** PBJ page leads with the cost of a bad quarter (one-star staffing rating for no accepted file, four or more
  days without RN hours, failed audits; one-star staffing removes a star from the overall rating). Clinical and MRF
  pages gained the "a PASS is not acceptance" note required on every product page. The Terms pack sentence lists $100.

## Known limitations

- Not deployed with real credentials yet: the Supabase migration must be applied and preview env vars set (owner checklist
  in the hand-off message) before paid calls, accounts and checkout work on a preview. The demo forms work without them.
- MRF validator only inspects a bounded part of large files, by design. Most real hospital files will come back WARN.
- No per-key rate limit; credits are the only throttle on paid calls.
- No tier-2 partner listings: none are approved. Tier 3 exists only in `src/catalog.js`.
- Refunds (unused credits within 30 days, per the Terms) are handled by hand: refund in the Stripe dashboard, then record a negative
  `adjustment` row in `credit_ledger` and lower `api_accounts.balance_cents`. There is no refund tooling in V1.
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
  HTTP handler class, the UAD validator (`test_uad.py`: rule families, input errors, ZIP, $1.00 billing, rule table),
  and the PBJ validator (`test_pbj.py`: every rule family, input errors, ZIP and gzip, no value echo, $1.00 billing),
  and the WH-347 pre-check (`test_wh347.py`: every rule, workbook reader, input errors, no value echo, billing).
- `npm i --no-save @electric-sql/pglite@0.3 && node supabase/tests/storefront.test.mjs`: the migration in an in-memory
  Postgres, including idempotent charges and grants, the 20-calls-per-$5 rule, revoked keys, demo limits and every verdict state.
- `python3.12 scripts/gen_examples.py` regenerates the docs examples by running the real handlers.
- Vercel only registers a Python route when the file has a literal `class handler(...)` (found by reproducing the failed preview build with `vercel build`). The four route files do that.
