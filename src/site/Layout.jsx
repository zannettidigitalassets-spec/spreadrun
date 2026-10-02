import { APIS } from '../catalog.js';

const NAV = [
  ['/apis', 'APIs'],
  ['/docs', 'Docs'],
  ['/apis#pricing', 'Pricing'],
  ['/guides', 'Guides'],
  ['/contact', 'Contact'],
];

export default function Layout({ path = '/', children }) {
  const current = (href) => (href === path || (href !== '/' && path.startsWith(href + '/')) ? 'page' : undefined);
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="wrap">
          <a className="brand" href="/"><span className="brand-mark" aria-hidden="true" />SpreadRun</a>
          <nav className="nav" aria-label="Main">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} aria-current={current(href)}>{label}</a>
            ))}
            <a href="/account" aria-current={current('/account')}>Account</a>
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <div className="wrap">
          <div>
            <div>SpreadRun data validation APIs, supplied by DataForge.</div>
            <div>{APIS.map((a, i) => <span key={a.slug}>{i ? ' | ' : ''}<a href={`/apis/${a.slug}`}>{a.name}</a></span>)}</div>
          </div>
          <nav aria-label="Footer">
            <a href="/docs">Docs</a>
            <a href="/guides">Guides</a>
            <a href="/contact">Contact</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </nav>
        </div>
      </footer>
    </>
  );
}

export function Crumbs({ items }) {
  return (
    <nav className="crumbs wrap" aria-label="Breadcrumb">
      {items.map(([href, label], i) => (
        <span key={label}>{i ? ' / ' : ''}{href ? <a href={href}>{label}</a> : <span aria-current="page">{label}</span>}</span>
      ))}
    </nav>
  );
}
