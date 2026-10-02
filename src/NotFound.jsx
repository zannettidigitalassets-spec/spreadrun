import Layout from './site/Layout.jsx';

export default function NotFound() {
  return (
    <Layout path="/404">
      <div className="wrap section" style={{ paddingTop: 56 }}>
        <h1>Page not found</h1>
        <p className="lede" style={{ marginTop: 20 }}>That address does not match a page on SpreadRun. The real-estate calculators that used to live here have been retired.</p>
        <div className="btn-row">
          <a className="btn" href="/apis">Browse the APIs</a>
          <a className="btn secondary" href="/">Go to the homepage</a>
        </div>
      </div>
    </Layout>
  );
}
