import { useState } from 'react';
import Layout, { Crumbs } from '../site/Layout.jsx';
import Faq from '../site/Faq.jsx';
import coverage from '../content/uad-coverage.json';
import { UAD_CHECKLIST_PATH, UAD_ERROR_GUIDES, UAD_SPEC, UCDP_FAQ, UCDP_GUIDE, VALIDATOR } from './UadErrorGuides.jsx';

export { UAD_CHECKLIST_PATH };

// Same sources as the error guides (see UadErrorGuides.jsx). Each outcome below is what the published rule
// severity or the UCDP General User Guide says; nothing is taken from vendor or forum posts.
const ITEMS = [
  {
    id: 'below-grade', label: 'Below grade areas are filled in, even when they are 0',
    what: 'UAD 3.6 reports below grade space as separate measures: finished, unfinished, and finished nonstandard. Each must be provided for the subject dwelling even if the value is 0 (UAD1189, UAD1190, UAD1484), and finished and unfinished for every sales comparable (UAD1483, UAD1776). Each level also needs a grade level type (UAD1141).',
    ucdp: 'Fatal finding. The report is Not Successful until it is corrected.',
    hint: 'In the area or levels section, type 0 instead of leaving a field blank, then check each comparable.',
    guide: 'uad36-basement-fields-hard-stop',
  },
  {
    id: 'view-location', label: 'View and site influence (location) use values from the list',
    what: 'View type, range of view and site influence are picked from lists in the delivery specification. The subject and every sales comparable need at least one view type and one site influence (UAD1361, UAD1450, UAD1328, UAD1769), the subject needs a range of view (UAD1364), and any Other needs a description.',
    ucdp: 'A missing value or a missing Other description is a Fatal finding. A typed value that is not on the list does not meet the specification.',
    hint: 'Pick from the list your software offers. If you chose Other anywhere, fill in the description next to it.',
    guide: 'uad36-location-view-codes-rejected',
  },
  {
    id: 'concessions', label: 'Sales concessions are answered and match the contract you read',
    what: 'If you reviewed a sales contract, say whether it has concessions (UAD1128), whether the amount is known (UAD1127), and if known, the total (UAD1133). UCDP checks that these answers are there. It cannot see the contract, so it cannot check that the amount matches.',
    ucdp: 'A missing answer is a Fatal finding. The amount matching the contract is on you, not on a UCDP rule.',
    hint: 'Put the contract next to the screen and compare the concession total line by line.',
    guide: 'uad36-concession-mismatch',
  },
  {
    id: 'address', label: 'Subject address is complete, with a valid ZIP and state code',
    what: 'Address line, city, county, state and ZIP are all required (UAD1001 to UAD1004, UAD1006). The ZIP must be 5 digits or ZIP+4 with a hyphen (UAD1005), and the state a valid 2-letter code (UAD1007). UCDP standardizes the format itself, so Street becoming St is not an error.',
    ucdp: 'A missing part or a bad ZIP or state code is a Fatal finding.',
    hint: 'Check the county field, which is easy to miss, and look the address up with the postal service.',
    guide: 'uad36-address-usps-flag',
  },
  {
    id: 'ratings', label: 'Condition and quality ratings are UAD codes, for the subject and every comparable',
    what: 'Overall condition is C1 to C6 and overall quality is Q1 to Q6. Both are required for the subject (UAD1384, UAD1385) and for each sales comparable (UAD1434, UAD1435), along with the interior ratings (UAD1160, UAD1161, UAD1419, UAD1420).',
    ucdp: 'A missing rating is a Fatal finding. Narrative text is not one of the supported values.',
    hint: 'Look at the rating cells in the comparables grid, not just the subject.',
  },
  {
    id: 'prices', label: 'Contract price, contract date and sale prices are present and well formed',
    what: 'If you reviewed a contract, give the contract price and the date it was fully executed (UAD1129, UAD1130), as a full year, month and day (UAD1728). Each sales comparable needs a sale price or the reason it is not available (UAD1439), and amounts cannot be negative (UAD1442).',
    ucdp: 'Fatal findings. A contract date after the effective date of the appraisal is a Warning (UAD1131).',
    hint: 'Check the contract section and the sale price row of the comparables grid.',
  },
  {
    id: 'package', label: 'The package is one clean UAD 3.6 ZIP, under 60 MB, sent once',
    what: 'From November 2, 2026, UCDP requires UAD 3.6 ZIP files for new appraisal submissions. The ZIP holds one XML file plus the report and images. True and false values must be lower case or the XML fails schema validation.',
    ucdp: 'Rejected, with no Doc File ID, for an invalid ZIP, a missing XML file or too many, XML that is not well formed or not UTF-8, missing attachments, a duplicate submission or a file that is too large.',
    hint: 'Export a fresh ZIP from your software rather than editing files inside it, and check the file size before you send it.',
    guide: 'ucdp-not-successful-vs-rejected',
  },
];

export const UAD_CHECKLIST_FAQ = [
  ['What is the difference between Not Successful and Rejected in UCDP?',
    'Not Successful means the report was read and one or more Fatal findings were triggered; fix the data and send a corrected file. Rejected means UCDP did not accept the package at all, for example a broken ZIP, a duplicate submission or a file over the size limit; a rejected submission gets no Doc File ID.'],
  ['Can I submit my report to UCDP myself?',
    'No. Only lenders and their agents can register for UCDP; independent fee appraisers cannot. Findings reach you through the lender or AMC, on the Submission Summary Report.'],
  ['Does my appraisal software already run these checks?',
    'Appraisal software runs the GSE compliance rules while the report is written, and UCDP runs them again on submission. This checklist covers the items that are easy to miss, and it never sees your file.'],
];

function Checklist() {
  const [done, setDone] = useState({});
  const passed = ITEMS.filter((i) => done[i.id]).length;
  return (
    <div>
      {ITEMS.map((it, n) => (
        <div key={it.id} className="demo" style={{ margin: '0 0 16px' }}>
          <label htmlFor={`uad-${it.id}`} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 8, alignItems: 'start' }}>
            <input id={`uad-${it.id}`} type="checkbox" checked={!!done[it.id]} onChange={(e) => setDone({ ...done, [it.id]: e.target.checked })} style={{ marginTop: 4 }} />
            <span><b>{n + 1}. {it.label}</b></span>
          </label>
          <div style={{ paddingLeft: 30 }}>
            <p style={{ margin: '8px 0' }}>{it.what}</p>
            <p className="small" style={{ margin: '0 0 6px' }}><b>What UCDP does:</b> {it.ucdp}</p>
            <p className="small muted" style={{ margin: 0 }}><b>How to check in your software:</b> {it.hint}{it.guide && <> <a href={`/guides/${it.guide}`}>Read the fix</a></>}</p>
          </div>
        </div>
      ))}
      <div className="calc-result" aria-live="polite">
        <div className="calc-big"><span className="small muted">Your checklist</span><b style={{ color: passed === ITEMS.length ? 'var(--pass)' : 'var(--ink)' }}>{passed} of {ITEMS.length} checked</b></div>
        <p>{passed === ITEMS.length
          ? 'Every item is checked. That covers the common misses, not every rule.'
          : 'Work through the unchecked items before the report goes out.'}</p>
        <div className="calc-cta">
          Want this automated? Run your XML through the SpreadRun UAD 3.6 validator for $1 before submitting. <a href={VALIDATOR}>See the UAD 3.6 validator</a>
          <p className="small" style={{ margin: '8px 0 0' }}>It runs the delivery specification checks and {coverage.rulesImplemented} of the {coverage.rulesTotal} published URAR compliance rules, paid from prepaid credits, with a free test on the page. A PASS is not UCDP acceptance.</p>
        </div>
      </div>
    </div>
  );
}

export default function UadPreflight() {
  return (
    <Layout path={UAD_CHECKLIST_PATH}>
      <Crumbs items={[['/', 'Home'], ['/tools', 'Free tools'], [null, 'UAD 3.6 Pre-Submission Checklist']]} />
      <div className="wrap section" style={{ paddingTop: 24 }}>
        <h1>Free UAD 3.6 Pre-Submission Checklist</h1>
        <p className="lede" style={{ marginTop: 20 }}>Seven things to check on a UAD 3.6 appraisal before it goes to the lender, with what UCDP does when one is wrong and where to look in your software. Free, no signup, and it runs in your browser: nothing you tick is sent anywhere or saved.</p>
      </div>
      <section className="section wrap" aria-labelledby="list-h" style={{ paddingTop: 8 }}>
        <h2 id="list-h">The checklist</h2>
        <p>Rule IDs come from the published URAR Compliance Rules (Appendix H-1). A Fatal rule makes the UCDP status Not Successful. A Warning does not.</p>
        <Checklist />
      </section>
      <section className="section wrap" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        <Faq items={UAD_CHECKLIST_FAQ} />
        <h3 style={{ marginTop: 24 }}>Fix guides</h3>
        <ul>
          {UAD_ERROR_GUIDES.map((g) => <li key={g.slug}><a href={`/guides/${g.slug}`}>{g.title}</a></li>)}
        </ul>
        <p className="small muted" style={{ marginTop: 16 }}>Sources: <a href={UCDP_GUIDE}>UCDP General User Guide</a> (February 2026), <a href={UCDP_FAQ}>UCDP FAQ</a>, and Appendices A-1 and H-1 on the <a href={UAD_SPEC}>Uniform Appraisal Dataset page</a>. SpreadRun is not affiliated with or endorsed by Fannie Mae or Freddie Mac. This checklist is general information, not legal advice, and checking every box is not UCDP acceptance.</p>
        <p className="small">Also free: the <a href="/tools">other compliance tools</a>.</p>
      </section>
    </Layout>
  );
}
