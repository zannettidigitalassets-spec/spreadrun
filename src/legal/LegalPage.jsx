import Layout from '../site/Layout.jsx';

// Shared shell for /privacy and /terms: SpreadRun header and footer, one H1.
export default function LegalPage({ path, title, updated, children }) {
  return (
    <Layout path={path}>
      <div className="wrap section article" style={{ paddingTop: 40 }}>
        <h1>{title}</h1>
        <p className="small muted" style={{ marginTop: 12 }}>Last updated: {updated}</p>
        {children}
      </div>
    </Layout>
  );
}


export const SectionTitle = ({ children }) => (
  <h3 style={{ fontSize: 20, fontWeight: 700, margin: '32px 0 12px' }}>{children}</h3>
);
export const P = ({ children }) => <p>{children}</p>;
export const UL = ({ children }) => <ul>{children}</ul>;
