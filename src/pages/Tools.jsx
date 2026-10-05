import Layout, { Crumbs } from '../site/Layout.jsx';

export const TOOLS_PATH = '/tools';
export const TOOLS = [
  {
    href: '/tools/i9-section2-deadline-calculator',
    title: 'I-9 Section 2 Deadline Calculator and Self-Audit Checklist',
    blurb: 'Find the date Section 2 of Form I-9 is due for a new hire, skipping weekends and federal holidays, then check a completed form against the rules in the USCIS handbook.',
  },
  {
    href: '/tools/uad36-preflight-checklist',
    title: 'UAD 3.6 Pre-Submission Checklist',
    blurb: 'Seven things to check on a UAD 3.6 appraisal before it goes to the lender, with what UCDP does when one is wrong and where to look in your software.',
  },
  {
    href: '/tools/davis-bacon-overtime-calculator',
    title: 'Davis-Bacon Overtime Calculator',
    blurb: 'Time and a half on the basic rate for hours over 40, the fringe owed for every hour, and the week\'s gross on a prevailing wage job.',
  },
  {
    href: '/tools/davis-bacon-fringe-calculator',
    title: 'Davis-Bacon Fringe Benefit Annualization Calculator',
    blurb: 'Turn what you pay for a benefit plan into the hourly fringe credit, spread over every hour worked, and compare it to your wage determination.',
  },
  {
    href: '/tools/pbj-preflight-checks',
    title: 'PBJ Pre-Flight Checks',
    blurb: 'Count days with no RN hours against the CMS one-star staffing rule and work out meal break deductions the way the PBJ Policy Manual requires.',
  },
];

export default function Tools() {
  return (
    <Layout path={TOOLS_PATH}>
      <Crumbs items={[['/', 'Home'], [null, 'Free tools']]} />
      <div className="wrap section article" style={{ paddingTop: 24 }}>
        <h1>Free Compliance Tools</h1>
        <p className="lede" style={{ marginTop: 20 }}>Quick calculators and checklists for the paperwork rules employers, nursing homes and appraisers trip over. Free, no signup, and everything runs in your browser. They are for information only and are not legal advice.</p>
        {TOOLS.map((t) => (
          <div key={t.href} style={{ borderTop: '1px solid var(--line)', padding: '20px 0' }}>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}><a href={t.href}>{t.title}</a></h2>
            <p>{t.blurb}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
