// Build-time prerender: writes one static HTML file per route into dist/, with its own <head>.
// Runs after `vite build` (client) and `vite build --ssr` (server bundle in dist-ssr/).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const { render, paths, sitemap } = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href);

for (const p of paths()) {
  const { head, html } = render(p);
  const out = template.replace('<!--app-head-->', head).replace('<!--app-html-->', html);
  // cleanUrls on Vercel serves /apis from apis.html; / from index.html; unknown paths get 404.html.
  const file = p === '/' ? 'index.html' : `${p.slice(1)}.html`;
  fs.mkdirSync(path.dirname(path.join(dist, file)), { recursive: true });
  fs.writeFileSync(path.join(dist, file), out);
  console.log(`prerendered ${p} -> dist/${file}`);
}
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap(new Date().toISOString().slice(0, 10)));
fs.rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true });
console.log('wrote dist/sitemap.xml');
