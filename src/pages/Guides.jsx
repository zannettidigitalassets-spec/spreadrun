import Layout, { Crumbs } from '../site/Layout.jsx';
import { UAD_ERROR_GUIDES } from './UadErrorGuides.jsx';
import { PBJ_ERROR_GUIDES } from './PbjErrorGuides.jsx';
import { DEADLINE_GUIDES } from '../content/deadline-guides.js';
import { WH347_GUIDES } from '../content/wh347-guides.js';
import { ENROLL_GUIDES } from '../content/enroll-guides.js';
import { FINAL_GUIDES } from '../content/final-guides.js';

export const GUIDES = [
  ...DEADLINE_GUIDES.map((g) => ({ href: `/guides/${g.slug}`, title: g.title, blurb: g.blurb })),
  ...WH347_GUIDES.map((g) => ({ href: `/guides/${g.slug}`, title: g.title, blurb: g.blurb })),
  ...ENROLL_GUIDES.map((g) => ({ href: `/guides/${g.slug}`, title: g.title, blurb: g.blurb })),
  ...FINAL_GUIDES.map((g) => ({ href: `/guides/${g.slug}`, title: g.title, blurb: g.blurb })),
  {
    href: '/guides/hospital-price-transparency-file-requirements-2026',
    title: 'Hospital Price Transparency File Requirements: The Complete 2026 Guide',
    blurb: 'What the machine-readable file must contain, the three CMS formats, what changed in 2026, common failure modes, and how to check a file before posting.',
  },
  {
    href: '/guides/uad-3-6-requirements-2026',
    title: 'UAD 3.6 Requirements: The 2026 Guide',
    blurb: 'What UAD 3.6 is and what it replaces, the November 2, 2026 deadline, the delivery specification and compliance rules, common failures in appraisal XML, and a checklist.',
  },
  {
    href: '/guides/clinical-trial-data-quality-checks',
    title: 'Clinical Trial Data Quality Checks: A Practical Guide',
    blurb: 'Why extracted trial tables break, the NCT number format, the checks that matter before analysis, and the orphan-outcome and duplicate patterns that do the most damage.',
  },
  ...UAD_ERROR_GUIDES.map((g) => ({ href: `/guides/${g.slug}`, title: g.title, blurb: g.blurb })),
  ...PBJ_ERROR_GUIDES.map((g) => ({ href: `/guides/${g.slug}`, title: g.title, blurb: g.blurb })),
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
