import { hydrateRoot, createRoot } from 'react-dom/client';
import './site.css';

// Per-page code splitting: each page loads only its own component. Keep the keys in sync with
// routes.jsx (scripts/check-site.mjs fails the build if a prerendered page has no loader here).
export const LOADERS = {
  '/': () => import('./pages/Home.jsx'),
  '/apis': () => import('./pages/Catalog.jsx'),
  '/apis/clinical-trial-table-validator': () => import('./pages/ClinicalApi.jsx'),
  '/apis/hospital-mrf-validator': () => import('./pages/MrfApi.jsx'),
  '/apis/uad-36-appraisal-validator': () => import('./pages/UadApi.jsx'),
  '/apis/pbj-staffing-qa': () => import('./pages/PbjApi.jsx'),
  '/apis/wh347-payroll-precheck': () => import('./pages/Wh347Api.jsx'),
  '/docs': () => import('./pages/Docs.jsx'),
  '/docs/clinical-trial-table-validator': () => import('./pages/DocsClinical.jsx'),
  '/docs/hospital-mrf-validator': () => import('./pages/DocsMrf.jsx'),
  '/docs/uad-36-appraisal-validator': () => import('./pages/DocsUad.jsx'),
  '/docs/pbj-staffing-qa': () => import('./pages/DocsPbj.jsx'),
  '/docs/wh347-payroll-precheck': () => import('./pages/DocsWh347.jsx'),
  '/guides': () => import('./pages/Guides.jsx'),
  '/guides/hospital-price-transparency-file-requirements-2026': () => import('./pages/MrfGuide.jsx'),
  '/guides/uad-3-6-requirements-2026': () => import('./pages/UadGuide.jsx'),
  '/guides/clinical-trial-data-quality-checks': () => import('./pages/ClinicalGuide.jsx'),
  '/account': () => import('./pages/Account.jsx'),
  '/contact': () => import('./Contact.jsx'),
  '/privacy': () => import('./Privacy.jsx'),
  '/terms': () => import('./Terms.jsx'),
  '/404': () => import('./NotFound.jsx'),
};

const p = window.location.pathname;
const path = p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
const { default: Component } = await (LOADERS[path] || LOADERS['/404'])();
const root = document.getElementById('root');
if (root.firstElementChild) hydrateRoot(root, <Component />);
else createRoot(root).render(<Component />);
