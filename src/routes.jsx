// One table for every page: component, <head> metadata, JSON-LD, sitemap. Used by the build-time
// prerender (entry-server.jsx) and by the browser to hydrate (entry-client.jsx).
import Home, { HOME_FAQ } from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import ClinicalApi, { CLINICAL_FAQ } from './pages/ClinicalApi.jsx';
import MrfApi, { MRF_FAQ } from './pages/MrfApi.jsx';
import UadApi, { UAD_FAQ } from './pages/UadApi.jsx';
import PbjApi, { PBJ_FAQ } from './pages/PbjApi.jsx';
import Docs from './pages/Docs.jsx';
import DocsClinical from './pages/DocsClinical.jsx';
import DocsMrf from './pages/DocsMrf.jsx';
import DocsUad from './pages/DocsUad.jsx';
import DocsPbj from './pages/DocsPbj.jsx';
import Guides from './pages/Guides.jsx';
import MrfGuide, { MRF_GUIDE } from './pages/MrfGuide.jsx';
import UadGuide, { UAD_GUIDE } from './pages/UadGuide.jsx';
import ClinicalGuide, { CLINICAL_GUIDE } from './pages/ClinicalGuide.jsx';
import Account from './pages/Account.jsx';
import Contact from './Contact.jsx';
import NotFound from './NotFound.jsx';
import Privacy from './Privacy.jsx';
import Terms from './Terms.jsx';
import { APIS } from './catalog.js';

export const ORIGIN = 'https://www.spreadrun.com';
export const ORG = { '@type': 'Organization', name: 'SpreadRun', url: ORIGIN };

const faqLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map(([q, a]) => ({
    '@type': 'Question', name: q,
    acceptedAnswer: { '@type': 'Answer', text: Array.isArray(a) ? a.join(' ') : a },
  })),
});
const crumbsLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([path, name], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + path })),
});
const appLd = (slug, description) => {
  const a = APIS.find((x) => x.slug === slug);
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: a.name,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    url: `${ORIGIN}/apis/${slug}`,
    description,
    offers: {
      '@type': 'Offer', price: (a.priceCents / 100).toFixed(2), priceCurrency: 'USD',
      description: `$${(a.priceCents / 100).toFixed(2)} per ${a.unit}, paid from prepaid credits that work on every SpreadRun API. No subscription.`,
    },
    publisher: ORG,
  };
};

// Meta descriptions are 150 to 160 characters (scripts/check-site.mjs enforces it).
const D = {
  home: 'Data validation APIs for regulated industries: hospital price files, clinical trial tables, UAD 3.6 appraisals. Per-use pricing, free tests, no subscription.',
  apis: 'Every SpreadRun data validation API with per-run pricing: clinical trial table QA, hospital MRF validation, UAD 3.6 appraisals and PBJ staffing data QA.',
  clinical: 'Audit clinical trial results tables before analysis: NCT ID validity, required fields, duplicates, orphan outcomes, dates. $0.25 per audit, free live test.',
  mrf: 'Validate hospital machine-readable price files against the CMS v3.0 template: JSON, tall and wide CSV, plain or gzip. $0.25 per validation, free live test.',
  uad: 'Check UAD 3.6 appraisal XML against GSE delivery specs and compliance rules before UCDP submission. Every finding has an XPath. $1.00 per report, free test.',
  docs: 'SpreadRun API documentation: authentication, prepaid credit billing, error codes, rate limits, and free demo endpoints for every validator in the catalog.',
  docsClinical: 'Clinical Trial Results Table QA API reference: endpoints, request format, required columns, report schema, finding codes, error codes, and code samples.',
  docsMrf: 'Hospital MRF Validator API reference: endpoints, upload formats, query parameters, sampling limits, report schema, finding codes, error codes, and samples.',
  pbj: 'Check nursing home PBJ staffing XML against CMS v4.10.0 specs before upload, with documented audit risk flags. Results in seconds. $1.00 per report, free test.',
  docsPbj: 'PBJ Staffing Data Pre-Submission QA API reference: endpoints, ZIP and XML uploads, the asOf date, report schema, CMS edit and risk rule IDs, and error codes.',
  docsUad: 'UAD 3.6 Appraisal Report Validator API reference: endpoints, request format, ZIP packages, report schema, rule IDs, rules not yet covered, and error codes.',
  guides: 'Plain-English guides to the data rules our validators check: hospital price transparency files, clinical trial data quality, and UAD 3.6 appraisal reports.',
  mrfGuide: 'What hospital machine-readable price files must contain in 2026: CMS v3.0 formats, new data elements, common failures, and how to check yours before posting.',
  uadGuide: 'What UAD 3.6 is, the November 2, 2026 deadline, the delivery specification and compliance rules, common appraisal XML failures, and how to check a file first.',
  clinicalGuide: 'How to validate clinical trial data before analysis: NCT number format, required fields, duplicate keys, orphan outcomes, outcome types and results dates.',
  contact: 'Contact SpreadRun about an API, a validator you wish existed, volume pricing, or a problem with a report. Use the form on this page; we read every message.',
  privacy: 'What SpreadRun collects when you use its data-validation APIs and website, how submitted files are handled in memory, how data is used, and your choices.',
  terms: 'Terms for SpreadRun data-validation APIs: accounts, API keys, prepaid credits, per-run prices, refunds, personal data in appraisal files, and acceptable use.',
};

const HOME = [['/', 'Home']];
const product = (slug, name, title, desc, faq) => ({
  Component: { 'clinical-trial-table-validator': ClinicalApi, 'hospital-mrf-validator': MrfApi, 'uad-36-appraisal-validator': UadApi, 'pbj-staffing-qa': PbjApi }[slug],
  title, description: desc, priority: '0.9',
  jsonLd: () => [appLd(slug, desc), faqLd(faq), crumbsLd([...HOME, ['/apis', 'APIs'], [`/apis/${slug}`, name]])],
});
const docsPage = (slug, Component, name, desc) => ({
  Component, title: `${name} API Reference | SpreadRun`, description: desc, priority: '0.7',
  jsonLd: () => [crumbsLd([...HOME, ['/docs', 'Docs'], [`/docs/${slug}`, `${name} API Reference`]])],
});
const guidePage = (g, Component, desc, crumb, title = `${g.title} | SpreadRun`) => ({
  Component, title, description: desc, priority: '0.8', ogType: 'article',
  jsonLd: () => [
    {
      '@context': 'https://schema.org', '@type': 'Article',
      headline: g.title, description: desc,
      datePublished: g.published, dateModified: g.published,
      author: ORG, publisher: ORG, mainEntityOfPage: `${ORIGIN}/guides/${g.slug}`,
    },
    crumbsLd([...HOME, ['/guides', 'Guides'], [`/guides/${g.slug}`, crumb]]),
  ],
});

export const ROUTES = {
  '/': {
    Component: Home,
    title: 'SpreadRun: Data Validation APIs for Regulated Data',
    description: D.home,
    priority: '1.0',
    jsonLd: () => [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'SpreadRun', url: ORIGIN },
      {
        '@context': 'https://schema.org', '@type': 'ItemList', name: 'SpreadRun API catalog',
        itemListElement: APIS.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.name, url: `${ORIGIN}/apis/${a.slug}` })),
      },
      faqLd(HOME_FAQ),
    ],
  },
  '/apis': {
    Component: Catalog,
    title: 'Data Validation API Catalog and Pricing | SpreadRun',
    description: D.apis,
    priority: '0.9',
    jsonLd: () => [
      {
        '@context': 'https://schema.org', '@type': 'ItemList', name: 'SpreadRun APIs',
        itemListElement: APIS.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.name, url: `${ORIGIN}/apis/${a.slug}` })),
      },
      crumbsLd([...HOME, ['/apis', 'APIs']]),
    ],
  },
  '/apis/clinical-trial-table-validator': product('clinical-trial-table-validator', 'Clinical Trial Results Table QA',
    'Clinical Trial Table QA API: Validate Clinical Trial Results Data | SpreadRun', D.clinical, CLINICAL_FAQ),
  '/apis/hospital-mrf-validator': product('hospital-mrf-validator', 'Hospital MRF Validator',
    'Hospital MRF Validator: CMS Price Transparency API', D.mrf, MRF_FAQ),
  '/apis/uad-36-appraisal-validator': product('uad-36-appraisal-validator', 'UAD 3.6 Appraisal Report Validator',
    'UAD 3.6 Appraisal Validator API: URAR XML Checks | SpreadRun', D.uad, UAD_FAQ),
  '/apis/pbj-staffing-qa': product('pbj-staffing-qa', 'PBJ Staffing Data Pre-Submission QA',
    'PBJ Staffing Data Validator: Check CMS PBJ XML Before Upload | SpreadRun', D.pbj, PBJ_FAQ),
  '/docs': {
    Component: Docs,
    title: 'API Docs: Authentication, Billing and Errors | SpreadRun',
    description: D.docs,
    priority: '0.7',
    jsonLd: () => [crumbsLd([...HOME, ['/docs', 'Docs']])],
  },
  '/docs/clinical-trial-table-validator': docsPage('clinical-trial-table-validator', DocsClinical, 'Clinical Trial Results Table QA', D.docsClinical),
  '/docs/hospital-mrf-validator': docsPage('hospital-mrf-validator', DocsMrf, 'Hospital MRF Validator', D.docsMrf),
  '/docs/uad-36-appraisal-validator': docsPage('uad-36-appraisal-validator', DocsUad, 'UAD 3.6 Appraisal Report Validator', D.docsUad),
  '/docs/pbj-staffing-qa': docsPage('pbj-staffing-qa', DocsPbj, 'PBJ Staffing Data Pre-Submission QA', D.docsPbj),
  '/guides': {
    Component: Guides,
    title: 'Guides: Hospital Price Transparency and Clinical Data | SpreadRun',
    description: D.guides,
    priority: '0.6',
    jsonLd: () => [crumbsLd([...HOME, ['/guides', 'Guides']])],
  },
  [`/guides/${MRF_GUIDE.slug}`]: guidePage(MRF_GUIDE, MrfGuide, D.mrfGuide, '2026 MRF requirements',
    'Hospital Price Transparency File Requirements (2026 Guide) | SpreadRun'),
  [`/guides/${UAD_GUIDE.slug}`]: guidePage(UAD_GUIDE, UadGuide, D.uadGuide, 'UAD 3.6 requirements'),
  [`/guides/${CLINICAL_GUIDE.slug}`]: guidePage(CLINICAL_GUIDE, ClinicalGuide, D.clinicalGuide, 'Clinical trial data quality checks'),
  '/account': {
    Component: Account,
    title: 'Account | SpreadRun',
    description: 'Manage SpreadRun API keys, credits and usage.',
    noindex: true,
  },
  '/contact': {
    Component: Contact,
    title: 'Contact SpreadRun: API Support and Validator Requests',
    description: D.contact,
    priority: '0.4',
  },
  '/privacy': {
    Component: Privacy,
    title: 'Privacy Policy | SpreadRun',
    description: D.privacy,
    priority: '0.2',
  },
  '/terms': {
    Component: Terms,
    title: 'Terms of Service | SpreadRun',
    description: D.terms,
    priority: '0.2',
  },
  '/404': {
    Component: NotFound,
    title: 'Page not found | SpreadRun',
    description: 'This page does not exist on SpreadRun.',
    noindex: true,
    sitemap: false,
  },
};

export const normalize = (p) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p);
export const routeFor = (path) => ROUTES[normalize(path)] || ROUTES['/404'];
