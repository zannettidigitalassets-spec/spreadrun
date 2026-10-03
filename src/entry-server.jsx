import { renderToString } from 'react-dom/server';
import { ROUTES, ORIGIN, ORG, routeFor } from './routes.jsx';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// JSON-LD inside <script>: escape "<" so no content can close the tag.
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

export const paths = () => Object.keys(ROUTES);

export function render(path) {
  const r = routeFor(path);
  const url = ORIGIN + path;   // the homepage is https://www.spreadrun.com/, as in the sitemap
  const head = [
    `<title>${esc(r.title)}</title>`,
    `<meta name="description" content="${esc(r.description)}" />`,
    r.noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${esc(r.title)}" />`,
    `<meta property="og:description" content="${esc(r.description)}" />`,
    `<meta property="og:type" content="${r.ogType || 'website'}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:site_name" content="SpreadRun" />`,
    ld({ '@context': 'https://schema.org', ...ORG }),   // every page
    ...(r.jsonLd ? r.jsonLd().map(ld) : []),
  ].join('\n    ');
  const html = renderToString(<r.Component />);
  return { head, html };
}

export function sitemap(today) {
  const urls = Object.entries(ROUTES)
    .filter(([, r]) => !r.noindex && r.sitemap !== false)
    .map(([p, r]) => `  <url>\n    <loc>${ORIGIN}${p === '/' ? '/' : p}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${r.priority || '0.5'}</priority>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
