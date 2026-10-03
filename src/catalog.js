// The API catalog. Drives the homepage cards, /apis, product pages, docs and the sitemap.
// Server-side facts (price, size limits) are enforced in pylib/spreadrun_api/catalog.py;
// scripts/check-site.mjs fails the build if the two disagree.

// Three price tiers per completed run. Each API's own price is its priceCents below.
export const STANDARD_RUN_CENTS = 25;
export const HIGH_STAKES_RUN_CENTS = 100;
export const PROFESSIONAL_RUN_CENTS = 2500;
export const PRICE_PER_CALL_CENTS = STANDARD_RUN_CENTS; // kept for older callers

// Packs buy cents of credit that work on every API. calls = standard runs.
export const CREDIT_PACKS = [
  { id: 'pack_5', priceCents: 500, calls: 20 },
  { id: 'pack_20', priceCents: 2000, calls: 80 },
  { id: 'pack_50', priceCents: 5000, calls: 200 },
  { id: 'pack_100', priceCents: 10000, calls: 400 },
];

// Three tiers in the data model. Only tiers with showOnSite are rendered.
//   built:   we build and run it (full margin)
//   partner: curated third-party API, listing page with an outbound link (needs an approved affiliate agreement)
//   resale:  orchestrated resale, only where commercial rights are verified for a specific deal. None in V1.
export const TIERS = {
  built: { label: 'Built by SpreadRun', showOnSite: true },
  partner: { label: 'Partner API', showOnSite: true },
  resale: { label: 'Resold API', showOnSite: false },
};

export const APIS = [
  {
    slug: 'clinical-trial-table-validator',
    name: 'Clinical Trial Results Table QA',
    tier: 'built',
    status: 'live',
    priceCents: PRICE_PER_CALL_CENTS,
    unit: 'completed audit',
    maxBodyBytes: 4_400_000,
    demoMaxBodyBytes: 512 * 1024,
    summary:
      'Audits normalized clinical-trial study and outcome tables: NCT ID format, required fields, duplicate keys, orphan outcomes, outcome types and results-posting dates. Every finding comes with its table, row and field.',
    cta: 'Audit your tables',
  },
  {
    slug: 'hospital-mrf-validator',
    name: 'Hospital Price Transparency MRF Validator',
    tier: 'built',
    status: 'beta',
    priceCents: PRICE_PER_CALL_CENTS,
    unit: 'completed validation',
    maxBodyBytes: 4_400_000,
    demoMaxBodyBytes: 2 * 1024 * 1024,
    summary:
      'Checks a hospital machine-readable price file against the CMS v3.0.0 JSON schema and tall or wide CSV templates, including the 2026 allowed-amount fields. Uploads only; large files are sampled.',
    cta: 'Validate a file',
  },
  {
    slug: 'uad-36-appraisal-validator',
    name: 'UAD 3.6 Appraisal Report Validator',
    tier: 'built',
    status: 'beta',
    priceCents: HIGH_STAKES_RUN_CENTS,
    unit: 'completed report',
    maxBodyBytes: 4_400_000,
    demoMaxBodyBytes: 1024 * 1024,
    summary:
      'Checks a UAD 3.6 URAR appraisal XML file, or the whole UAD 3.6 ZIP package, against the GSE-published delivery specification and compliance rules. Every finding has an XPath, a rule ID and a message.',
    cta: 'Check a report',
  },
  {
    slug: 'pbj-staffing-qa',
    name: 'PBJ Staffing Data Pre-Submission QA',
    tier: 'built',
    status: 'beta',
    priceCents: PROFESSIONAL_RUN_CENTS,
    unit: 'completed report',
    maxBodyBytes: 4_400_000,
    demoMaxBodyBytes: 1024 * 1024,
    summary:
      'Checks a nursing home\'s quarterly Payroll Based Journal staffing XML, or the ZIP you upload to CMS, against the CMS PBJ data specifications v4.10.0 before you submit, and flags staffing patterns CMS has documented as audit or rating risks.',
    cta: 'Check a PBJ file',
  },
  {
    slug: 'wh347-payroll-precheck',
    name: 'Davis-Bacon WH-347 Certified Payroll Pre-Check',
    tier: 'built',
    status: 'beta',
    priceCents: PROFESSIONAL_RUN_CENTS,
    unit: 'completed report',
    maxBodyBytes: 4_400_000,
    demoMaxBodyBytes: 512 * 1024,
    summary:
      'Recomputes a weekly Davis-Bacon certified payroll (WH-347 fields) against the wage determination rates you supply: classifications, basic rates, fringe benefits, overtime, apprentice rates and ratios, and the gross, deductions and net pay math.',
    cta: 'Check a payroll',
  },
];

// Tier 2 listings appear here only after an affiliate agreement is approved and signed by the owner.
export const PARTNER_APIS = [];

export const apiBySlug = (slug) => APIS.find((a) => a.slug === slug);
export const dollars = (cents) => `$${(cents / 100).toFixed(2)}`;
