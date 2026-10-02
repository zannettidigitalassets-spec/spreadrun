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

// Exact metadata from the content files (em dashes in the original titles became colons, prices became $0.25).
const EXPECT = {
  '/': ['SpreadRun: Data Validation APIs for Regulated Data', 'Niche data-validation APIs for regulated industries. Hospital price transparency files, clinical trial tables, and more. Per-use pricing, no subscriptions.'],
  '/apis/clinical-trial-table-validator': ['Clinical Trial Table QA API: Validate Results Data', 'Catch malformed NCT IDs, missing fields, duplicates, and bad dates in clinical trial results tables before analysis. $0.25 per completed audit.'],
  '/apis/hospital-mrf-validator': ['Hospital MRF Validator: CMS Price Transparency API', 'Validate hospital machine-readable price files against CMS v3.0 specs. JSON and tall/wide CSV. Deterministic report, no install. $0.25 per validation.'],
  '/guides/hospital-price-transparency-file-requirements-2026': ['Hospital Price Transparency File Requirements (2026 Guide)', 'CMS hospital price transparency requirements for 2026: MRF formats, data elements, new allowed-amount rules, and how to check your file before posting.'],
};
const NEED_LD = {
  '/': ['Organization', 'WebSite', 'ItemList', 'FAQPage'],
  '/apis/clinical-trial-table-validator': ['SoftwareApplication', 'FAQPage'],
  '/apis/hospital-mrf-validator': ['SoftwareApplication', 'FAQPage'],
  '/guides/hospital-price-transparency-file-requirements-2026': ['Article'],
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
  if (/zannetti|\bchris\b|pittsburgh|seven fields/i.test(html)) fail(`${u}: contains a personal name or location`);
  if (/coming soon|buy\.stripe\.com|plink_|\bpro plan\b|upgrade to pro|starter plan|basic plan/i.test(text + html)) fail(`${u}: leftover SaaS pricing or coming-soon copy`);
  if (/\$0\.35/.test(text)) fail(`${u}: stale $0.35 price`);

  const h1 = (body.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) fail(`${u}: ${h1} <h1> elements`);
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
  const desc = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  if (!title) fail(`${u}: missing <title>`);
  if (!desc) fail(`${u}: missing meta description`);
  if (desc.length > 160) fail(`${u}: meta description is ${desc.length} chars`);
  if (titles.has(title)) fail(`${u}: duplicate title with ${titles.get(title)}`);
  titles.set(title, u);
  if (EXPECT[u] && (EXPECT[u][0] !== title || EXPECT[u][1] !== desc)) fail(`${u}: title/description differ from the content file`);
  const noindex = html.includes('name="robots" content="noindex"');
  if (!noindex && !html.includes(`<link rel="canonical" href="https://www.spreadrun.com${u === '/' ? '' : u}"`)) fail(`${u}: missing canonical`);

  const types = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { types.push(JSON.parse(m[1])['@type']); } catch { fail(`${u}: invalid JSON-LD`); }
  }
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
for (const u of ['/', '/apis', '/apis/clinical-trial-table-validator', '/apis/hospital-mrf-validator', '/docs',
  '/docs/clinical-trial-table-validator', '/docs/hospital-mrf-validator', '/guides',
  '/guides/hospital-price-transparency-file-requirements-2026']) {
  if (!sitemap.includes(`<loc>https://www.spreadrun.com${u}</loc>`)) fail(`sitemap missing ${u}`);
}
for (const u of ['/account', '/404', '/secondring', '/guides/lsa-missed-call-charges-october-2026']) if (sitemap.includes(`${u}</loc>`)) fail(`sitemap should not list ${u}`);
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
