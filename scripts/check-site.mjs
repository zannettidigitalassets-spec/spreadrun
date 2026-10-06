// Post-build checks on dist/: SEO metadata, JSON-LD, sitemap, internal links, copy rules.
// Fails the build on any problem.
import fs from 'node:fs';
import path from 'node:path';
import { APIS } from '../src/catalog.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const problems = [];
const fail = (m) => problems.push(m);

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(dist);
const pages = files.filter((f) => f.endsWith('.html'));
const urlOf = (f) => {
  const rel = path.relative(dist, f).replace(/\\/g, '/');
  return rel === 'index.html' ? '/' : '/' + rel.replace(/\.html$/, '');
};
const known = new Set(pages.map(urlOf));
const staticFiles = new Set(files.map((f) => '/' + path.relative(dist, f).replace(/\\/g, '/')));
const apiRoutes = new Set(['/api/account', '/api/keys', '/api/credits/checkout', '/api/customer-portal',
  ...APIS.flatMap((a) => [`/api/v1/${a.slug}`, `/api/demo/${a.slug}`])]);

// Exact titles and descriptions approved for the main pages (SEO pass, October 2026).
const EXPECT = {
  '/': ['SpreadRun: Data Validation APIs for Regulated Data', 'Data validation APIs for regulated industries: hospital price files, clinical trial tables, UAD 3.6 appraisals. Per-use pricing, free tests, no subscription.'],
  '/apis/clinical-trial-table-validator': ['Clinical Trial Table QA API: Validate Clinical Trial Results Data | SpreadRun', null],
  '/apis/hospital-mrf-validator': ['Hospital MRF Validator: CMS Price Transparency API', null],
  '/apis/uad-36-appraisal-validator': ['UAD 3.6 Appraisal Validator API: URAR XML Checks | SpreadRun', null],
  '/guides/hospital-price-transparency-file-requirements-2026': ['Hospital Price Transparency File Requirements (2026 Guide) | SpreadRun', null],
};
const PRODUCT_LD = ['SoftwareApplication', 'FAQPage', 'BreadcrumbList'];
const GUIDE_LD = ['Article', 'BreadcrumbList'];
const NEED_LD = {
  '/': ['WebSite', 'ItemList', 'FAQPage'],
  '/apis': ['ItemList', 'BreadcrumbList'],
  '/apis/clinical-trial-table-validator': PRODUCT_LD,
  '/apis/hospital-mrf-validator': PRODUCT_LD,
  '/apis/uad-36-appraisal-validator': PRODUCT_LD,
  '/apis/pbj-staffing-qa': PRODUCT_LD,
  '/apis/wh347-payroll-precheck': PRODUCT_LD,
  '/apis/pecos-enrollment-precheck': PRODUCT_LD,
  '/apis/cmmc-self-assessment-validator': PRODUCT_LD,
  '/apis/cobra-notice-qa': PRODUCT_LD,
  '/tools': ['ItemList', 'BreadcrumbList'],
  '/tools/davis-bacon-overtime-calculator': ['WebApplication', 'FAQPage', 'BreadcrumbList'],
  '/tools/davis-bacon-fringe-calculator': ['WebApplication', 'FAQPage', 'BreadcrumbList'],
  '/tools/davis-bacon-apprentice-checker': ['WebApplication', 'FAQPage', 'BreadcrumbList'],
  '/tools/pbj-preflight-checks': ['WebApplication', 'FAQPage', 'BreadcrumbList'],
  '/tools/i9-section2-deadline-calculator': ['WebApplication', 'FAQPage', 'BreadcrumbList'],
  '/tools/cobra-deadline-calculator': ['WebApplication', 'FAQPage', 'BreadcrumbList'],
  '/tools/uad36-preflight-checklist': ['WebApplication', 'FAQPage', 'BreadcrumbList'],
  '/tools/cpsc-efiling-readiness-checklist': ['WebApplication', 'FAQPage', 'BreadcrumbList'],
  '/docs': ['BreadcrumbList'],
  '/docs/clinical-trial-table-validator': ['BreadcrumbList'],
  '/docs/hospital-mrf-validator': ['BreadcrumbList'],
  '/docs/uad-36-appraisal-validator': ['BreadcrumbList'],
  '/docs/pbj-staffing-qa': ['BreadcrumbList'],
  '/docs/wh347-payroll-precheck': ['BreadcrumbList'],
  '/docs/pecos-enrollment-precheck': ['BreadcrumbList'],
  '/docs/cmmc-self-assessment-validator': ['BreadcrumbList'],
  '/docs/cobra-notice-qa': ['BreadcrumbList'],
  '/guides': ['BreadcrumbList'],
  '/guides/hospital-price-transparency-file-requirements-2026': GUIDE_LD,
  '/guides/uad-3-6-requirements-2026': GUIDE_LD,
  '/guides/clinical-trial-data-quality-checks': GUIDE_LD,
  '/guides/uad36-fatal-findings-explained': GUIDE_LD,
  '/guides/ucdp-not-successful-meaning': GUIDE_LD,
  '/guides/uad36-warning-vs-fatal': GUIDE_LD,
  '/guides/uad36-basement-fields-hard-stop': GUIDE_LD,
  '/guides/uad36-location-view-codes-rejected': GUIDE_LD,
  '/guides/uad36-concession-mismatch': GUIDE_LD,
  '/guides/uad36-address-usps-flag': GUIDE_LD,
  '/guides/ucdp-not-successful-vs-rejected': GUIDE_LD,
  '/guides/pbj-error-minus-1025': GUIDE_LD,
  '/guides/pbj-error-4025': GUIDE_LD,
  '/guides/pbj-error-3679': GUIDE_LD,
  '/guides/pbj-error-3676': GUIDE_LD,
  '/guides/pbj-error-4016': GUIDE_LD,
  '/guides/pbj-zero-rn-days': GUIDE_LD,
  '/guides/uad36-rule-uad1189': GUIDE_LD,
  '/guides/uad36-rule-uad1001': GUIDE_LD,
  '/guides/pbj-file-rejected': GUIDE_LD,
  '/guides/how-to-fix-ucdp-errors': GUIDE_LD,
  '/guides/wh347-apprentice-reporting': GUIDE_LD,
  '/guides/wh347-statement-of-compliance': GUIDE_LD,
  '/guides/wh347-common-mistakes': GUIDE_LD,
  '/guides/davis-bacon-fringe-annualization': GUIDE_LD,
  '/guides/davis-bacon-weighted-overtime': GUIDE_LD,
  '/guides/pecos-returned-for-corrections': GUIDE_LD,
  '/guides/npi-not-active-nppes': GUIDE_LD,
  '/guides/855i-rejection-reasons': GUIDE_LD,
  '/guides/cobra-election-notice-requirements': GUIDE_LD,
  '/guides/cobra-notice-deadlines': GUIDE_LD,
  '/guides/sprs-score-calculation': GUIDE_LD,
  '/guides/cmmc-poam-rules': GUIDE_LD,
  '/guides/cobra-penalty-110-per-day': GUIDE_LD,
  '/guides/medicare-revalidation-missed-deadline': GUIDE_LD,
  '/guides/what-is-cpsc-efiling': GUIDE_LD,
};
// No empty strings, arrays or objects anywhere inside a JSON-LD block.
const emptyField = (v, at = '') => {
  if (v === '' || v === null || v === undefined) return at || '(root)';
  if (Array.isArray(v)) return v.length ? v.map((x, i) => emptyField(x, `${at}[${i}]`)).find(Boolean) : at;
  if (typeof v === 'object') return Object.keys(v).length ? Object.entries(v).map(([k, x]) => emptyField(x, `${at}.${k}`)).find(Boolean) : at;
  return undefined;
};
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'");
const titles = new Map();

for (const f of pages) {
  const u = urlOf(f);
  const html = fs.readFileSync(f, 'utf8');
  const body = html.split('<body>')[1] || '';
  const text = decode(body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' '));

  if (/—/.test(html)) fail(`${u}: contains an em dash`);
  if (/secondring|second ring/i.test(html)) fail(`${u}: mentions SecondRing`);
  if (/a la mode|alamode|uad reader/i.test(text)) fail(`${u}: names a retired third-party UAD tool`);
  if (/zannetti|\bchris\b|pittsburgh|seven fields/i.test(html)) fail(`${u}: contains a personal name or location`);
  if (/coming soon|buy\.stripe\.com|plink_|\bpro plan\b|upgrade to pro|starter plan|basic plan/i.test(text + html)) fail(`${u}: leftover SaaS pricing or coming-soon copy`);
  if (/\$0\.35/.test(text)) fail(`${u}: stale $0.35 price`);

  const h1 = (body.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) fail(`${u}: ${h1} <h1> elements`);
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
  const desc = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  if (!title) fail(`${u}: missing <title>`);
  if (!desc) fail(`${u}: missing meta description`);
  const indexable = !html.includes('name="robots" content="noindex"');
  if (indexable && (desc.length < 150 || desc.length > 160)) fail(`${u}: meta description is ${desc.length} chars (want 150 to 160)`);
  if (!indexable && desc.length > 160) fail(`${u}: meta description is ${desc.length} chars`);
  if (titles.has(title)) fail(`${u}: duplicate title with ${titles.get(title)}`);
  titles.set(title, u);
  if (EXPECT[u] && (EXPECT[u][0] !== title || (EXPECT[u][1] && EXPECT[u][1] !== desc))) fail(`${u}: title/description differ from the approved text`);
  const noindex = html.includes('name="robots" content="noindex"');
  if (!noindex && !html.includes(`<link rel="canonical" href="https://www.spreadrun.com${u}"`)) fail(`${u}: missing canonical`);

  const types = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let obj;
    try { obj = JSON.parse(m[1]); } catch { fail(`${u}: invalid JSON-LD`); continue; }
    types.push(obj['@type']);
    if (obj['@context'] !== 'https://schema.org') fail(`${u}: JSON-LD ${obj['@type']} without schema.org context`);
    const empty = emptyField(obj);
    if (empty) fail(`${u}: JSON-LD ${obj['@type']} has an empty field at ${empty}`);
    if (/aggregateRating|"review"/i.test(m[1])) fail(`${u}: rating or review markup (there are none to mark up)`);
    if (obj['@type'] === 'SoftwareApplication') {
      const o = obj.offers || {};
      if (obj.applicationCategory !== 'DeveloperApplication' || obj.operatingSystem !== 'Web' || !obj.url || !o.price || o.priceCurrency !== 'USD' || !o.description) {
        fail(`${u}: SoftwareApplication is missing a required field`);
      }
    }
    if (obj['@type'] === 'Article' && !(obj.headline && obj.datePublished && obj.author?.['@type'] === 'Organization')) fail(`${u}: Article needs headline, datePublished, Organization author`);
    if (obj['@type'] === 'Organization' && (obj.name !== 'SpreadRun' || obj.url !== 'https://www.spreadrun.com')) fail(`${u}: Organization name/url`);
  }
  if (!types.includes('Organization')) fail(`${u}: missing Organization JSON-LD`);
  for (const t of NEED_LD[u] || []) if (!types.includes(t)) fail(`${u}: missing ${t} JSON-LD`);

  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const href = m[1].replace(/\/$/, '') || '/';
    if (!known.has(href) && !staticFiles.has(href) && !apiRoutes.has(href) && !href.startsWith('/assets/')) {
      fail(`${u}: broken internal link ${href}`);
    }
  }
}

const client = fs.readFileSync(path.join(root, 'src/entry-client.jsx'), 'utf8');
for (const u of known) if (!client.includes(`'${u}': () => import(`)) fail(`${u}: no client loader in entry-client.jsx`);

const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
for (const u of ['/', '/apis', '/apis/clinical-trial-table-validator', '/apis/hospital-mrf-validator', '/apis/uad-36-appraisal-validator', '/apis/pbj-staffing-qa', '/apis/wh347-payroll-precheck', '/apis/pecos-enrollment-precheck', '/apis/cmmc-self-assessment-validator', '/apis/cobra-notice-qa', '/tools/davis-bacon-apprentice-checker', '/tools', '/tools/davis-bacon-overtime-calculator', '/tools/davis-bacon-fringe-calculator', '/tools/pbj-preflight-checks', '/tools/i9-section2-deadline-calculator', '/tools/cobra-deadline-calculator', '/tools/uad36-preflight-checklist', '/tools/cpsc-efiling-readiness-checklist', '/docs',
  '/docs/clinical-trial-table-validator', '/docs/hospital-mrf-validator', '/docs/uad-36-appraisal-validator', '/docs/pbj-staffing-qa', '/docs/wh347-payroll-precheck', '/docs/pecos-enrollment-precheck', '/docs/cmmc-self-assessment-validator', '/docs/cobra-notice-qa', '/guides',
  '/guides/hospital-price-transparency-file-requirements-2026', '/guides/uad-3-6-requirements-2026', '/guides/clinical-trial-data-quality-checks',
  '/guides/uad36-fatal-findings-explained', '/guides/ucdp-not-successful-meaning', '/guides/uad36-warning-vs-fatal', '/guides/uad36-basement-fields-hard-stop', '/guides/uad36-location-view-codes-rejected', '/guides/uad36-concession-mismatch', '/guides/uad36-address-usps-flag', '/guides/ucdp-not-successful-vs-rejected',
  '/guides/pbj-error-minus-1025', '/guides/pbj-error-4025', '/guides/pbj-error-3679', '/guides/pbj-error-3676', '/guides/pbj-error-4016',
  '/guides/pbj-zero-rn-days', '/guides/uad36-rule-uad1189', '/guides/uad36-rule-uad1001', '/guides/pbj-file-rejected', '/guides/how-to-fix-ucdp-errors',
  '/guides/wh347-apprentice-reporting', '/guides/wh347-statement-of-compliance', '/guides/wh347-common-mistakes', '/guides/davis-bacon-fringe-annualization', '/guides/davis-bacon-weighted-overtime',
  '/guides/pecos-returned-for-corrections', '/guides/npi-not-active-nppes', '/guides/855i-rejection-reasons', '/guides/cobra-election-notice-requirements', '/guides/cobra-notice-deadlines',
  '/guides/sprs-score-calculation', '/guides/cmmc-poam-rules', '/guides/cobra-penalty-110-per-day', '/guides/medicare-revalidation-missed-deadline', '/guides/what-is-cpsc-efiling']) {
  if (!sitemap.includes(`<loc>https://www.spreadrun.com${u}</loc>`)) fail(`sitemap missing ${u}`);
}
for (const u of ['/account', '/unsubscribe', '/404', '/secondring', '/guides/lsa-missed-call-charges-october-2026']) if (sitemap.includes(`${u}</loc>`)) fail(`sitemap should not list ${u}`);
// Guide batches 1 (deadline), 2 (WH-347), 3 (PECOS and COBRA) and 4 (CMMC, COBRA, PECOS and CPSC): every page cites its primary sources next to the claims, links its
// CTA, and is listed on the /guides index.
for (const [file, key] of [['src/content/deadline-guides.js', 'DEADLINE_GUIDES'], ['src/content/wh347-guides.js', 'WH347_GUIDES'], ['src/content/enroll-guides.js', 'ENROLL_GUIDES'], ['src/content/final-guides.js', 'FINAL_GUIDES']]) {
  const mod = await import(path.join(root, file));
  const SRC = mod.SRC;
  const index = fs.readFileSync(path.join(dist, 'guides.html'), 'utf8');
  for (const g of mod[key]) {
    const html = fs.readFileSync(path.join(dist, 'guides', `${g.slug}.html`), 'utf8');
    if (!index.includes(`href="/guides/${g.slug}"`)) fail(`/guides does not link ${g.slug}`);
    for (const href of g.cta) if (!html.includes(`href="${href}"`)) fail(`${g.slug}: CTA link ${href} missing`);
    for (const k of g.sources) if (!html.includes(SRC[k][1].replace(/&/g, '&amp;'))) fail(`${g.slug}: source ${k} not cited`);
    if ((html.match(/\(Source: /g) || []).length < 3) fail(`${g.slug}: fewer than 3 inline citations`);
    if (/\bverified\b/i.test(html.replace(/<[^>]+>/g, ' '))) fail(`${g.slug}: bare "verified" claim`);
  }
}

const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
if (!robots.includes('Sitemap: https://www.spreadrun.com/sitemap.xml')) fail('robots.txt missing sitemap');

// The website and the API must agree on price and limits.
const py = fs.readFileSync(path.join(root, 'pylib/spreadrun_api/catalog.py'), 'utf8');
for (const a of APIS) {
  const block = py.split(`'${a.slug}': {`)[1]?.split('},')[0] || '';
  const num = (k) => Number(eval((block.match(new RegExp(`'${k}': ([^,\\n]+)`)) || [])[1]?.replace(/_/g, '')));
  if (num('price_cents') !== a.priceCents) fail(`${a.slug}: price differs between src/catalog.js and catalog.py`);
  if (num('max_body_bytes') !== a.maxBodyBytes) fail(`${a.slug}: max body differs`);
  if (num('demo_max_body_bytes') !== a.demoMaxBodyBytes) fail(`${a.slug}: demo max body differs`);
}

// Legacy URLs: one 301 hop to the www site, listed before the apex rule so no request goes through two redirects,
// and never to a URL that is itself redirected.
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const apexAt = vercel.redirects.findIndex((r) => r.has);
const sources = new Set(vercel.redirects.filter((r) => !r.has).map((r) => r.source));
vercel.redirects.forEach((r, i) => {
  if (r.has) return;
  if (r.statusCode !== 301) fail(`redirect ${r.source}: status ${r.statusCode || (r.permanent ? 308 : 307)}, want 301`);
  if (i > apexAt) fail(`redirect ${r.source}: listed after the apex rule (redirect chain from spreadrun.com)`);
  const dest = r.destination.replace('https://www.spreadrun.com', '') || '/';
  if (!r.destination.startsWith('https://www.spreadrun.com/')) fail(`redirect ${r.source}: destination is not absolute www`);
  if (sources.has(dest)) fail(`redirect ${r.source}: points at another redirect (${dest})`);
  if (!known.has(dest.replace(/\/$/, '') || '/')) fail(`redirect ${r.source}: destination ${dest} is not a page`);
  if (sitemap.includes(`${r.source}</loc>`)) fail(`sitemap lists redirected ${r.source}`);
});
for (const legacy of ['/secondring', '/guides/lsa-missed-call-charges-october-2026']) {
  const r = vercel.redirects.find((x) => x.source === legacy);
  if (!r || r.destination !== 'https://www.spreadrun.com/') fail(`${legacy} must 301 to https://www.spreadrun.com/`);
}

// Vercel Hobby allows at most 12 functions per deployment. Count route files the way Vercel does:
// every .js/.py under api/ except files or folders starting with "_".
const routeFiles = walk(path.join(root, 'api'))
  .map((f) => path.relative(path.join(root, 'api'), f).replace(/\\/g, '/'))
  .filter((f) => /\.(js|mjs|py)$/.test(f) && !f.split('/').some((part) => part.startsWith('_')));
if (routeFiles.length > 12) fail(`${routeFiles.length} serverless functions; the Hobby plan allows 12: ${routeFiles.join(', ')}`);
console.log(`functions: ${routeFiles.length} of 12 (${routeFiles.join(', ')})`);

if (problems.length) {
  console.error(`check-site: ${problems.length} problem(s)\n - ` + problems.join('\n - '));
  process.exit(1);
}
console.log(`check-site ok: ${pages.length} pages, meta, JSON-LD, sitemap, links and copy rules verified`);
