import { renderToString } from 'react-dom/server';
import { ROUTES, ORIGIN, routeFor } from './routes.jsx';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// JSON-LD inside <script>: escape "<" so no content can close the tag.
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

export const paths = () => Object.keys(ROUTES);

export function render(path) {
  const r = routeFor(path);
  const url = ORIGIN + (path === '/' ? '' : path);
  const head = [
    `<title>${esc(r.title)}</title>`,
    `<meta name="description" content="${esc(r.description)}" />`,
    r.noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${esc(r.title)}" />`,
    `<meta property="og:description" content="${esc(r.description)}" />`,
    `<meta property="og:type" content="${r.ogType || 'website'}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:site_name" content="SpreadRun" />`,
    ...(r.jsonLd ? r.jsonLd().map(ld) : []),
  ].join('\n    ');
  const html = renderToString(<r.Component />);
  return { head, html };
}

export function sitemap(today) {
  const urls = Object.entries(ROUTES)
    .filter(([, r]) => !r.noindex && r.sitemap !== false)
    .map(([p, r]) => `  <url>\n    <loc>${ORIGIN}${p === '/' ? '/' : p}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${r.priority || '0.5'}</priority>\n  </url>`);
  // The SecondRing guide is a static file in public/guides, not a React route.
  urls.push(`  <url>\n    <loc>${ORIGIN}/guides/lsa-missed-call-charges-october-2026</loc>\n    <lastmod>2026-09-30</lastmod>\n    <priority>0.3</priority>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
