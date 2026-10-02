// One table for every page: component, <head> metadata, JSON-LD, sitemap. Used by the build-time
// prerender (entry-server.jsx) and by the browser to hydrate (entry-client.jsx).
import Home, { HOME_FAQ } from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import ClinicalApi, { CLINICAL_FAQ } from './pages/ClinicalApi.jsx';
import MrfApi, { MRF_FAQ } from './pages/MrfApi.jsx';
import Docs from './pages/Docs.jsx';
import DocsClinical from './pages/DocsClinical.jsx';
import DocsMrf from './pages/DocsMrf.jsx';
import Guides from './pages/Guides.jsx';
import MrfGuide, { MRF_GUIDE } from './pages/MrfGuide.jsx';
import Account from './pages/Account.jsx';
import Contact from './Contact.jsx';
import NotFound from './NotFound.jsx';
import SecondRingLanding from './SecondRingLanding.jsx';
import Privacy from './Privacy.jsx';
import Terms from './Terms.jsx';
import { SITE_TITLE as SECONDRING_TITLE, META_DESCRIPTION as SECONDRING_DESC } from './launchConfig.js';
import { APIS, PRICE_PER_CALL_CENTS } from './catalog.js';

export const ORIGIN = 'https://www.spreadrun.com';
const ORG = { '@type': 'Organization', name: 'SpreadRun', url: ORIGIN };
const price = (PRICE_PER_CALL_CENTS / 100).toFixed(2);

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
    operatingSystem: 'Any',
    url: `${ORIGIN}/apis/${slug}`,
    description,
    offers: { '@type': 'Offer', price, priceCurrency: 'USD' },
    publisher: ORG,
  };
};

const CLINICAL_DESC = 'Catch malformed NCT IDs, missing fields, duplicates, and bad dates in clinical trial results tables before analysis. $0.25 per completed audit.';
const MRF_DESC = 'Validate hospital machine-readable price files against CMS v3.0 specs. JSON and tall/wide CSV. Deterministic report, no install. $0.25 per validation.';
const HOME_DESC = 'Niche data-validation APIs for regulated industries. Hospital price transparency files, clinical trial tables, and more. Per-use pricing, no subscriptions.';
const GUIDE_DESC = 'CMS hospital price transparency requirements for 2026: MRF formats, data elements, new allowed-amount rules, and how to check your file before posting.';

export const ROUTES = {
  '/': {
    Component: Home,
    title: 'SpreadRun: Data Validation APIs for Regulated Data',
    description: HOME_DESC,
    priority: '1.0',
    jsonLd: () => [
      { '@context': 'https://schema.org', ...ORG, description: HOME_DESC },
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
    description: 'Every SpreadRun API in one place: clinical trial table QA and hospital price transparency file validation. $0.25 per completed run from prepaid credits.',
    priority: '0.9',
    jsonLd: () => [
      {
        '@context': 'https://schema.org', '@type': 'ItemList', name: 'SpreadRun APIs',
        itemListElement: APIS.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.name, url: `${ORIGIN}/apis/${a.slug}` })),
      },
      crumbsLd([['/', 'Home'], ['/apis', 'APIs']]),
    ],
  },
  '/apis/clinical-trial-table-validator': {
    Component: ClinicalApi,
    title: 'Clinical Trial Table QA API: Validate Results Data',
    description: CLINICAL_DESC,
    priority: '0.9',
    jsonLd: () => [appLd('clinical-trial-table-validator', CLINICAL_DESC), faqLd(CLINICAL_FAQ),
      crumbsLd([['/', 'Home'], ['/apis', 'APIs'], ['/apis/clinical-trial-table-validator', 'Clinical Trial Results Table QA']])],
  },
  '/apis/hospital-mrf-validator': {
    Component: MrfApi,
    title: 'Hospital MRF Validator: CMS Price Transparency API',
    description: MRF_DESC,
    priority: '0.9',
    jsonLd: () => [appLd('hospital-mrf-validator', MRF_DESC), faqLd(MRF_FAQ),
      crumbsLd([['/', 'Home'], ['/apis', 'APIs'], ['/apis/hospital-mrf-validator', 'Hospital MRF Validator']])],
  },
  '/docs': {
    Component: Docs,
    title: 'API Docs: Authentication, Billing and Errors | SpreadRun',
    description: 'How to call SpreadRun APIs: API keys, prepaid credits, the response envelope, error codes, limits and the free demo endpoints.',
    priority: '0.7',
  },
  '/docs/clinical-trial-table-validator': {
    Component: DocsClinical,
    title: 'Clinical Trial Results Table QA API Reference | SpreadRun',
    description: 'Request format, required columns, report fields, finding codes, errors and curl and Python samples for the Clinical Trial Results Table QA API.',
    priority: '0.7',
  },
  '/docs/hospital-mrf-validator': {
    Component: DocsMrf,
    title: 'Hospital MRF Validator API Reference | SpreadRun',
    description: 'Upload format, parameters, sampling limits, report fields, finding codes, errors and curl and Python samples for the Hospital MRF Validator API.',
    priority: '0.7',
  },
  '/guides': {
    Component: Guides,
    title: 'Guides: Hospital Price Transparency and Clinical Data | SpreadRun',
    description: 'Plain explanations of the data rules SpreadRun validators check, starting with the 2026 hospital price transparency file requirements.',
    priority: '0.6',
  },
  [`/guides/${MRF_GUIDE.slug}`]: {
    Component: MrfGuide,
    title: 'Hospital Price Transparency File Requirements (2026 Guide)',
    description: GUIDE_DESC,
    priority: '0.8',
    ogType: 'article',
    jsonLd: () => [
      {
        '@context': 'https://schema.org', '@type': 'Article',
        headline: MRF_GUIDE.title, description: GUIDE_DESC,
        datePublished: MRF_GUIDE.published, dateModified: MRF_GUIDE.published,
        author: ORG, publisher: ORG, mainEntityOfPage: `${ORIGIN}/guides/${MRF_GUIDE.slug}`,
      },
      crumbsLd([['/', 'Home'], ['/guides', 'Guides'], [`/guides/${MRF_GUIDE.slug}`, '2026 MRF requirements']]),
    ],
  },
  '/account': {
    Component: Account,
    title: 'Account | SpreadRun',
    description: 'Manage SpreadRun API keys, credits and usage.',
    noindex: true,
  },
  '/contact': {
    Component: Contact,
    title: 'Contact | SpreadRun',
    description: 'Questions about a SpreadRun API, volume pricing, or a validator you need. We read every message.',
    priority: '0.4',
  },
  '/secondring': {
    Component: SecondRingLanding,
    title: SECONDRING_TITLE,
    description: SECONDRING_DESC,
    priority: '0.3',
  },
  '/privacy': {
    Component: Privacy,
    title: 'Privacy Policy | SpreadRun',
    description: 'What SpreadRun and SecondRing collect, how it is used and shared, and your choices, including SMS opt-in data for SecondRing.',
    priority: '0.2',
  },
  '/terms': {
    Component: Terms,
    title: 'Terms of Service | SpreadRun',
    description: 'Terms for SpreadRun APIs, prepaid credits and refunds, and the paused SecondRing service, including its SMS terms.',
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
