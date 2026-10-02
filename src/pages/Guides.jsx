import Layout, { Crumbs } from '../site/Layout.jsx';

export const GUIDES = [
  {
    href: '/guides/hospital-price-transparency-file-requirements-2026',
    title: 'Hospital Price Transparency File Requirements: The Complete 2026 Guide',
    blurb: 'What the machine-readable file must contain, the three CMS formats, what changed in 2026, common failure modes, and how to check a file before posting.',
  },
];

export default function Guides() {
  return (
    <Layout path="/guides">
      <Crumbs items={[['/', 'Home'], [null, 'Guides']]} />
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>Guides</h1>
        <p className="lede" style={{ marginTop: 20 }}>Plain explanations of the data rules our validators check.</p>
        {GUIDES.map((g) => (
          <div key={g.href} style={{ borderTop: '1px solid var(--line)', padding: '20px 0' }}>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}><a href={g.href}>{g.title}</a></h2>
            <p>{g.blurb}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
