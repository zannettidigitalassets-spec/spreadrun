import { useState } from 'react';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import ToolSignup from '../site/ToolSignup.jsx';

export const CPSC_PATH = '/tools/cpsc-efiling-readiness-checklist';
const RULE = 'https://www.ecfr.gov/current/title-16/chapter-II/subchapter-B/part-1110';
const FR = 'https://www.federalregister.gov/documents/2025/01/08/2024-30826/certificates-of-compliance';
const CATAIR = 'https://www.govinfo.gov/app/details/GOVPUB-HS4_100-PURL-gpo255990';
const REGISTRY = 'https://www.cpsc.gov/eFiling-CPSC-Product-Registry';
const REGISTRY_FAQ = 'https://www.cpsc.gov/s3fs-public/Product_Registry_Frequently_Asked_Questions_V1-4.pdf';
const ROBOT = 'https://www.cpsc.gov/Business--Manufacturing/Regulatory-Robot/Safer-Products-Start-Here';
const LABS = 'https://www.cpsc.gov/labsearch';
const PERIODIC = 'https://www.ecfr.gov/current/title-16/chapter-II/subchapter-B/part-1107/subpart-C/section-1107.21';
const PENALTIES = 'https://www.federalregister.gov/documents/2021/12/01/2021-26082/civil-penalties-notice-of-adjusted-maximum-amounts';

// Every item traces to 16 CFR part 1110 (eCFR, current October 2026), the final rule (90 FR 1800, January 8, 2025, and
// its September 24, 2025 correction), the CPSC eFiling Implementation Guide v2.4 (May 2026), the Product Registry FAQ
// v1.4 (April 2026), 16 CFR 1107.21, and CPSC's certification pages. Not used for lack of an official source: cargo
// holds of a set length, storage costs, risk scores and marketplace delisting.
const ITEMS = [
  {
    id: 'type', label: 'You know whether the product needs a Children\'s Product Certificate or a General Certificate of Conformity',
    what: 'Children\'s products need a Children\'s Product Certificate (CPC) based on testing by a CPSC-accepted third-party lab. Other regulated consumer products need a General Certificate of Conformity (GCC), based on a test of each product or a reasonable testing program, with no third-party lab requirement.',
    how: <>Run the product through CPSC\'s <a href={ROBOT}>Regulatory Robot</a>, once per product. It is a guide to the requirements to review, not a ruling.</>,
  },
  {
    id: 'lab', label: 'There is a test report, and for a children\'s product the lab is CPSC-accepted with its Lab ID recorded',
    what: 'The certificate has to give the most recent date and place of testing, including each lab the certificate relies on. For a CPC the lab must be CPSC-accepted. In the eFiling message, a testing lab entry must carry the lab\'s four-digit CPSC Lab ID.',
    how: <>Find the lab in CPSC\'s <a href={LABS}>accepted lab search</a> and copy its Lab ID onto your record for this product.</>,
  },
  {
    id: 'citations', label: 'Every applicable safety rule is cited',
    what: 'The certificate must state each consumer product safety rule, or similar rule, ban, standard or regulation enforced by CPSC, that the product is certified to. A missing citation means the certificate does not cover that requirement.',
    how: 'Compare the citation list with the Regulatory Robot results and the test report. Every requirement tested should be cited, and every citation tested or excluded.',
  },
  {
    id: 'dates', label: 'Test dates are current for this product',
    what: 'The certificate gives the most recent testing date. For children\'s products, periodic testing is required at least once a year, or every two or three years under the conditions in 16 CFR 1107.21. General-use products rest on a test of each product or a reasonable testing program, with no fixed interval.',
    how: <>Check the last test date against your periodic testing plan and the <a href={PERIODIC}>16 CFR 1107.21</a> intervals that apply to you.</>,
  },
  {
    id: 'certifier', label: 'The certifier and the records contact are identified in full',
    what: 'The certificate must identify the finished product certifier, for imports usually the importer, with name, street address, city, state or province, country, email and telephone, plus the person who keeps the test records.',
    how: 'Read the certifier block on the certificate against your importer of record details. Old addresses and shared inboxes are easy to miss.',
  },
  {
    id: 'ids', label: 'For a Reference filing, the broker has the three Certificate Identifiers for each product',
    what: 'A Reference filing sends identifiers instead of the full data. CPSC names three: the Certifier ID (created with your Product Registry business account), the Product ID (one of GTIN, SKU, UPC, model number, serial number, registered number or alternate ID) and the Version ID of the certificate.',
    how: 'Send the broker all three for every product on the entry, and make sure the Version ID is the version that matches the goods shipped.',
  },
  {
    id: 'messageset', label: 'You know whether this entry is a Full or a Reference filing',
    what: 'Full means all certificate data is filed in the CPSC message set at the time of entry. Reference means the data is already in CPSC\'s Product Registry and the entry carries a reference to it. Both you and your broker need to know which one this entry uses.',
    how: 'Agree with your broker, product by product, which method you use, and who holds the data each method needs.',
  },
  {
    id: 'registry', label: 'For Reference filings, the certificate is in the Product Registry before the entry is filed',
    what: 'With a Reference filing, the importer enters the certificate data in the CPSC Product Registry before the entry is filed, then the entry references it. Data that is not there yet cannot be referenced.',
    how: <>Log in to the <a href={REGISTRY}>Product Registry</a> and confirm the certificate and its version exist before the broker files.</>,
  },
  {
    id: 'ftz', label: 'Foreign-trade zone entries are flagged for January 8, 2027',
    what: 'eFiling has applied to most regulated products since July 8, 2026. For products imported into a foreign-trade zone and then entered for consumption or warehousing, it applies from January 8, 2027.',
    how: 'Mark which of your products move through a foreign-trade zone, and plan their filings for the later date.',
  },
];

export const CPSC_FAQ = [
  ['When did CPSC eFiling become mandatory?',
    'The Certificates of Compliance rule requires certificate data to be filed electronically with the entry in ACE for most regulated consumer products from July 8, 2026. Products imported into a foreign-trade zone and then entered for consumption or warehousing follow on January 8, 2027.'],
  ['What is the difference between Full and Reference filing?',
    'Full means all the certificate data goes into the CPSC message set at the time of entry. Reference means the data is already in CPSC\'s Product Registry, and the entry carries the Certifier ID, Product ID and Version ID that point to it.'],
  ['What can happen if a certificate is missing?',
    `Under the Consumer Product Safety Act, a product that is not accompanied by a required certificate shall be refused admission. Civil penalties under the Act are up to $120,000 for each violation and $17,150,000 for a related series of violations, under the most recent inflation adjustment (effective 2022); a new adjustment is due in December 2026.`],
  ['Is this legal advice?',
    'No. This is an assembly checklist, not a compliance determination. Importers with complex products should work with trade counsel or a licensed customs broker.'],
];

function Checklist() {
  const [done, setDone] = useState({});
  const ready = ITEMS.filter((i) => done[i.id]).length;
  const firstGap = ITEMS.find((i) => !done[i.id]);
  return (
    <div>
      {ITEMS.map((it, n) => (
        <div key={it.id} className="demo" style={{ margin: '0 0 16px' }}>
          <label htmlFor={`cpsc-${it.id}`} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 8, alignItems: 'start' }}>
            <input id={`cpsc-${it.id}`} type="checkbox" checked={!!done[it.id]} onChange={(e) => setDone({ ...done, [it.id]: e.target.checked })} style={{ marginTop: 4 }} />
            <span><b>{n + 1}. {it.label}</b></span>
          </label>
          <div style={{ paddingLeft: 30 }}>
            <p style={{ margin: '8px 0' }}>{it.what}</p>
            <p className="small muted" style={{ margin: 0 }}><b>How to check:</b> {it.how}</p>
          </div>
        </div>
      ))}
      <div className="calc-result" aria-live="polite">
        <div className="calc-big"><span className="small muted">Readiness</span><b style={{ color: ready === ITEMS.length ? 'var(--pass)' : 'var(--ink)' }}>{ready} of {ITEMS.length} ready</b></div>
        <p style={{ marginBottom: 0 }}>{ready === ITEMS.length
          ? 'Every item is checked for this shipment. Keep the certificate where you can produce it within 24 hours if CPSC or CBP asks.'
          : ready === 0
            ? 'Start with item 1: everything else depends on knowing which certificate the product needs.'
            : `Fix first: item ${ITEMS.indexOf(firstGap) + 1}, ${firstGap.label.charAt(0).toLowerCase()}${firstGap.label.slice(1)}. Items 1 to 5 are about the certificate itself; items 6 to 9 are about the filing.`}</p>
      </div>
    </div>
  );
}

function Interest() {
  const [state, setState] = useState('idle');
  const send = async () => {
    setState('sending');
    try {
      const res = await fetch('/api/interest/cpsc-efiling', { method: 'POST' });
      setState(res.ok ? 'done' : 'failed');
    } catch {
      setState('failed');
    }
    if (window.gtag) window.gtag('event', 'interest', { topic: 'cpsc-efiling' });
  };
  return (
    <div className="calc-result">
      <h2 id="interest-h" style={{ marginTop: 0 }}>Want this machine-checked?</h2>
      <p>This checklist covers the main assembly steps. If you want the full certificate package machine-checked before filing, tell us with one click. We count clicks only: no email, no name, nothing from the checklist. It is not an order, and no product or date is promised.</p>
      <button type="button" className="btn" onClick={send} disabled={state === 'sending' || state === 'done'}>
        {state === 'done' ? 'Counted. Thank you.' : 'I would use a full certificate check'}
      </button>
      {state === 'failed' && <p className="small" style={{ marginTop: 8 }}>That did not go through. Try again later.</p>}
    </div>
  );
}

export default function CpscChecklist() {
  return (
    <Layout path={CPSC_PATH}>
      <Crumbs items={[['/', 'Home'], ['/tools', 'Free tools'], [null, 'CPSC eFiling Readiness Checklist']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>CPSC eFiling Readiness Checklist</h1>
        <p className="lede" style={{ marginTop: 20 }}>Nine things to have ready before your broker files a shipment's CPSC certificate data in ACE. Each one explains what it is and why CPSC asks for it. Free, no signup, and the checklist runs in your browser: nothing you tick is sent anywhere or saved.</p>
        <div className="note">
          <p><b>This is an assembly checklist, not a compliance determination.</b> It does not decide which rules apply to your product or whether it complies. Importers with complex products should work with trade counsel or a licensed customs broker.</p>
        </div>
      </div>

      <section className="section wrap" aria-labelledby="list-h" style={{ paddingTop: 8 }}>
        <h2 id="list-h">The checklist</h2>
        <p>From the <a href={RULE}>Certificates of Compliance rule, 16 CFR part 1110</a>, and the <a href={CATAIR}>CPSC eFiling Implementation Guide, version 2.4</a> (May 2026).</p>
        <Checklist />
      </section>

      <section className="section wrap" aria-labelledby="interest-h">
        <Interest />
      </section>

      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={CPSC_FAQ} />
        <p className="small muted" style={{ marginTop: 24 }}>Sources: <a href={RULE}>16 CFR part 1110</a>; the final rule, <a href={FR}>90 FR 1800 (January 8, 2025)</a>; the <a href={CATAIR}>CPSC eFiling Implementation Guide v2.4</a>; the <a href={REGISTRY_FAQ}>Product Registry FAQ v1.4</a>; <a href={PERIODIC}>16 CFR 1107.21</a>; <a href={PENALTIES}>CPSC civil penalty adjustment (2021)</a>; 15 U.S.C. 2066(a). SpreadRun is not affiliated with or endorsed by CPSC or CBP.</p>
        <p className="small">Also free: <a href="/tools">other compliance tools</a>.</p>
      </section>
      <ToolSignup source={CPSC_PATH} heading="Get a reminder before the next CPSC eFiling date" blurb="eFiling for foreign-trade zone entries starts January 8, 2027. Sign up and we will email you before it, and when there is a new free tool." />
    </Layout>
  );
}
