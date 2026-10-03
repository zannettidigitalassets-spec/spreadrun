import Layout, { Crumbs } from '../site/Layout.jsx';

export const CLINICAL_GUIDE = {
  slug: 'clinical-trial-data-quality-checks',
  title: 'Clinical Trial Data Quality Checks: A Practical Guide',
  published: '2026-10-02',
};

const CTGOV = 'https://clinicaltrials.gov/';
const PRODUCT = '/apis/clinical-trial-table-validator';

export default function ClinicalGuide() {
  return (
    <Layout path={`/guides/${CLINICAL_GUIDE.slug}`}>
      <Crumbs items={[['/', 'Home'], ['/guides', 'Guides'], [null, 'Clinical trial data quality checks']]} />
      <article className="wrap section article" style={{ paddingTop: 24 }}>
        <h1 style={{ maxWidth: '22ch' }}>Clinical Trial Data Quality Checks: A Practical Guide</h1>
        <p className="small muted" style={{ marginTop: 16 }}>Published October 2, 2026</p>

        <p>Most clinical trial analyses that go wrong do not go wrong in the statistics. They go wrong earlier, in the tables: a study table and an outcomes table pulled from a registry or an export, cleaned by hand, joined, and trusted. A malformed trial ID or a shifted date at that stage quietly removes trials from a meta-analysis or attaches results to the wrong study, and nothing downstream complains.</p>
        <p>This guide covers why extracted trial tables break, the checks worth running before any analysis, the NCT number format, and the duplicate and orphan patterns that do the most damage.</p>

        <h2>Why extracted trial tables break</h2>
        <p><b>Bad joins.</b> Study-level and outcome-level data usually live in separate tables keyed on the trial ID. Any difference in that key between the two tables (a trailing space, a lowercase prefix, a digit dropped in a copy and paste) turns a match into a miss. Inner joins drop those rows silently; outer joins keep them with empty study fields.</p>
        <p><b>Mangled dates.</b> Spreadsheet software rewrites dates on open: <code>2024-03-05</code> becomes <code>3/5/2024</code>, day and month swap between regional settings, and impossible dates such as February 30 survive because nobody parses them. Results-posting dates drive time-to-reporting analyses, so a wrong date is a wrong finding.</p>
        <p><b>Invalid trial IDs.</b> IDs stored as numbers lose their prefix, truncated cells lose digits, and hand-typed IDs pick up typos. A wrong ID is worse than a missing one, because it can collide with a real trial.</p>
        <p><b>Inconsistent coding.</b> Outcome types written as "Primary", "primary outcome" and "PRIMARY" in the same column cannot be filtered or counted reliably.</p>

        <h2>The NCT number format</h2>
        <p>Every study registered on <a href={CTGOV}>ClinicalTrials.gov</a> gets an identifier of the form <code>NCT</code> followed by exactly eight digits, for example <code>NCT01234567</code>. That makes it one of the easiest fields in any trial dataset to validate, and one of the most valuable: a regular expression such as <code>^NCT[0-9]{'{8}'}$</code> catches a missing prefix, a lowercase <code>nct</code>, seven or nine digits, embedded spaces and stray characters in one pass. Run it on both tables, not just the study table, because the outcome side is where hand edits tend to happen.</p>

        <h2>The checks that matter before analysis</h2>
        <ol>
          <li><b>Trial ID format</b> in every row of every table, as above.</li>
          <li><b>Required fields present.</b> Decide which columns an analysis cannot run without (trial ID, condition and phase for studies; outcome ID, outcome type and results status for outcomes) and flag every empty cell, not just missing columns.</li>
          <li><b>One row per key.</b> One row per trial in the study table, one row per trial and outcome pair in the outcomes table. Duplicates double-count in every aggregate.</li>
          <li><b>No orphan outcomes.</b> Every outcome row must point to a trial that exists in the study table. An orphan is either a bad ID or a missing study, and both need a person to look.</li>
          <li><b>Controlled vocabularies.</b> Outcome type drawn from a fixed list, in a fixed spelling, such as PRIMARY, SECONDARY and OTHER_PRE_SPECIFIED.</li>
          <li><b>Real dates.</b> Dates written as <code>YYYY-MM-DD</code> and parsed as calendar dates, so February 30 fails instead of passing as text.</li>
          <li><b>Well-formed tables.</b> Unique column headers and the same number of cells in every row. A ragged row usually means a delimiter inside an unquoted field, and every value after it is shifted.</li>
        </ol>
        <p>Run them in that order of cheapness and repeat them every time the tables are regenerated, not once. Fixed-format checks like these are deterministic: the same tables always give the same findings, which is what you want from a gate before a dataset is locked for analysis.</p>

        <h2>Orphan outcomes and duplicates</h2>
        <p>These two deserve a closer look because they are invisible in a quick scan. A duplicate study row inflates every count it touches, and if the two copies disagree (different phase, different condition) the analysis picks one at random depending on join order. A duplicate outcome row double-counts results. An orphan outcome looks like a complete row on its own; only a lookup against the study table shows that its trial does not exist. Count both before and after every cleaning step: a cleaning script that creates orphans is common, and nobody notices until the totals stop adding up.</p>

        <h2>Doing it yourself, or calling an API</h2>
        <p>None of these checks needs special software. In pandas, a regular expression on the ID column, <code>duplicated()</code> on the keys, an anti-join between the two tables and <code>to_datetime(..., errors="coerce")</code> on the dates cover most of the list in a few lines; the same takes a handful of SQL queries. If you check one dataset once, write them yourself.</p>
        <p>If tables move through a pipeline (a recurring registry pull, a vendor delivery, an agent that assembles datasets) the check belongs in that pipeline, with a report your code can act on. That is what SpreadRun's <a href={PRODUCT}>Clinical Trial Results Table QA</a> API does: send the study and outcomes tables as CSV and get a deterministic audit covering NCT ID format, required fields, duplicates, orphan outcomes, outcome types and results-posting dates, with the table, row and field for every finding. It checks structure only: it does not verify that a trial or its results are real, current or accurate.</p>

        <p className="small muted">Trial identifiers: <a href={CTGOV}>ClinicalTrials.gov</a>. This guide is general information about data quality, not medical, statistical or regulatory advice.</p>

        <div className="note" style={{ marginTop: 32 }}>
          <p><b>Audit your trial tables before analysis.</b> Run Clinical Trial Results Table QA: exact row locations for every finding, $0.25 per completed audit, free test on the page. <a href={`${PRODUCT}#demo`}>Audit your tables</a></p>
        </div>
      </article>
    </Layout>
  );
}
