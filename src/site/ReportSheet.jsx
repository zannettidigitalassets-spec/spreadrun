import { CLINICAL_CODES, MRF_CODES } from './codes.js';

// Renders a real validator report. kind: 'clinical' | 'mrf' | 'uad'.
export default function ReportSheet({ kind, report, label, sub }) {
  if (!report) return null;
  return (
    <div className="sheet" role="region" aria-label={label || 'Validation report'}>
      <div className="sheet-head">
        <div>
          <div className="sheet-title">{label || 'Report'}</div>
          {sub && <div className="sheet-sub">{sub}</div>}
        </div>
        <span className={`stamp ${report.status}`}>{report.status}</span>
      </div>
      <div className="sheet-body">
        {kind === 'clinical' ? <Clinical r={report} /> : kind === 'uad' ? <Uad r={report} /> : <Mrf r={report} />}
      </div>
    </div>
  );
}

function Clinical({ r }) {
  return (
    <>
      <div className="facts">
        <span><b>{r.rowCounts.studiesCsv}</b> studies</span>
        <span><b>{r.rowCounts.outcomesCsv}</b> outcomes</span>
        <span><b>{r.issueCount}</b> {r.issueCount === 1 ? 'finding' : 'findings'}</span>
      </div>
      {r.issues.length > 0 ? (
        <div className="table-scroll">
          <table className="findings">
            <thead><tr><th>Table</th><th>Row</th><th>Field</th><th>Rule</th></tr></thead>
            <tbody>
              {r.issues.map((i, n) => (
                <tr key={n} title={CLINICAL_CODES[i.code]}>
                  <td>{i.table === 'studiesCsv' ? 'studies' : 'outcomes'}</td>
                  <td>{i.record}</td>
                  <td><code>{i.field}</code></td>
                  <td className="code">{i.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="small" style={{ margin: 0 }}>No findings. Every rule passed.</p>}
      {r.issuesTruncated && <p className="small muted">The first 1,000 findings are listed. issueCounts has the full totals.</p>}
    </>
  );
}

function Mrf({ r }) {
  const yesNo = (v) => (v === true ? 'yes' : v === false ? 'no' : 'not determined');
  return (
    <>
      <div className="facts">
        <span>Format <b>{r.source.format}</b></span>
        <span><b>{r.file.recordsInspected}</b> records inspected</span>
        <span>Metadata complete <b>{yesNo(r.checks.requiredMetadataPresent)}</b></span>
        <span>Template structure <b>{yesNo(r.checks.requiredStructurePresent)}</b></span>
      </div>
      {r.issues.length > 0 ? (
        <div className="table-scroll">
          <table className="findings">
            <thead><tr><th>Severity</th><th>Rule</th><th>Location</th></tr></thead>
            <tbody>
              {r.issues.map((i, n) => (
                <tr key={n} title={MRF_CODES[i.code] || i.message}>
                  <td className={`sev-${i.severity}`}>{i.severity === 'ERROR' ? 'Error' : 'Warning'}</td>
                  <td className="code">{i.code}</td>
                  <td><code>{i.location || 'file'}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="small" style={{ margin: 0 }}>No findings in the inspected portion.</p>}
      {r.issuesOmitted > 0 && <p className="small muted">{r.issuesOmitted} more findings are counted in issueCounts.</p>}
      {r.file.truncatedByLimit && <p className="small muted">Only part of the file was inspected. The rest is not validated.</p>}
    </>
  );
}

// MISMO paths are long; show them from the last well-known container, with the full XPath on hover.
export const shortPath = (p) => {
  for (const anchor of ['/VALUATION_ANALYSIS/', '/SERVICE/', '/SERVICE[', '/DOCUMENT/']) {
    const i = p.indexOf(anchor);
    if (i >= 0) return '\u2026' + p.slice(i);
  }
  return p;
};

function Uad({ r }) {
  const comps = Object.entries(r.properties || {}).filter(([k]) => k !== 'SubjectProperty').reduce((n, [, v]) => n + v, 0);
  return (
    <>
      <div className="facts">
        <span>Report <b>{r.reportType}</b></span>
        <span><b>{comps}</b> {comps === 1 ? 'other property' : 'other properties'}</span>
        <span><b>{r.findingCounts.error}</b> {r.findingCounts.error === 1 ? 'error' : 'errors'}</span>
        <span><b>{r.findingCounts.warning}</b> {r.findingCounts.warning === 1 ? 'warning' : 'warnings'}</span>
        <span><b>{r.coverage.complianceRulesEvaluated}</b> compliance rules run</span>
      </div>
      {r.findings.length > 0 ? (
        <div className="table-scroll">
          <table className="findings">
            <thead><tr><th>Severity</th><th>Rule</th><th>Where and what</th></tr></thead>
            <tbody>
              {r.findings.map((f, n) => (
                <tr key={n}>
                  <td className={`sev-${f.severity === 'error' ? 'ERROR' : 'WARNING'}`}>{f.severity === 'error' ? 'Error' : 'Warning'}</td>
                  <td className="code">{f.ruleId}</td>
                  <td><code title={f.path} style={{ wordBreak: 'break-all' }}>{shortPath(f.path)}</code><div className="small">{f.message}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="small" style={{ margin: 0 }}>No findings from the implemented checks. A PASS here is not UCDP acceptance.</p>}
      {r.findingsTruncated && <p className="small muted">The first 500 findings are listed. findingCounts has the full totals.</p>}
      {r.asOf && <p className="small muted" style={{ marginTop: 8 }}>Date rules evaluated as of {r.asOf}.</p>}
    </>
  );
}
