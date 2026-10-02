import Layout from '../site/Layout.jsx';

// Shared shell for /privacy and /terms: SpreadRun header and footer, one H1, parts as large headings.
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

export const Part = ({ id, children }) => (
  <h2 id={id} style={{ fontSize: 26, marginTop: 48, paddingTop: 24, borderTop: '2px solid var(--ink)' }}>{children}</h2>
);
