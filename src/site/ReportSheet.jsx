import { CLINICAL_CODES, MRF_CODES } from './codes.js';

// Renders a real validator report. kind: 'clinical' | 'mrf' | 'uad' | 'pbj' | 'wh347'.
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
        {kind === 'clinical' ? <Clinical r={report} /> : kind === 'uad' ? <Uad r={report} /> : kind === 'pbj' ? <Pbj r={report} /> : kind === 'wh347' ? <Wh347 r={report} /> : <Mrf r={report} />}
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

// PBJ paths are short enough to show from the section down: drop the root element.
const pbjPath = (p) => p.replace(/^\/nursingHomeData/, '') || '/';

function Pbj({ r }) {
  const q = r.reportingQuarter || (r.files && r.files[0].reportingQuarter);
  const counts = r.counts;
  const cov = r.coverage;
  return (
    <>
      <div className="facts">
        {q && q.quarter && <span>FY{q.federalFiscalYear} Q{q.quarter} <b>{q.start} to {q.end}</b></span>}
        {r.files && <span><b>{r.files.length}</b> XML files</span>}
        {counts && <span><b>{counts.employees}</b> employees</span>}
        {counts && <span><b>{counts.totalHours.toLocaleString('en-US')}</b> hours</span>}
        {cov && cov.daysWithoutRnHours !== null && <span><b>{cov.daysWithoutRnHours}</b> days without RN hours</span>}
        <span><b>{r.findingCounts.error}</b> {r.findingCounts.error === 1 ? 'error' : 'errors'}</span>
        <span><b>{r.findingCounts.warning}</b> {r.findingCounts.warning === 1 ? 'warning' : 'warnings'}</span>
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
                  <td><code title={f.path} style={{ wordBreak: 'break-all' }}>{f.file ? `file ${f.file}: ` : ''}{pbjPath(f.path)}</code><div className="small">{f.message}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="small" style={{ margin: 0 }}>No findings. A PASS here is not CMS acceptance and does not mean the file would survive an audit.</p>}
      {r.findingsTruncated && <p className="small muted">The first 500 findings are listed. findingCounts has the full totals.</p>}
      {r.submissionDeadline && (
        <p className="small" style={{ marginTop: 10 }}>
          {r.submissionDeadline.passed
            ? <>The CMS deadline for this quarter, {r.submissionDeadline.date}, has passed.</>
            : <>Due to CMS by <b>{r.submissionDeadline.date}</b>, {r.submissionDeadline.time}: <b>{r.submissionDeadline.daysRemaining}</b> {r.submissionDeadline.daysRemaining === 1 ? 'day' : 'days'} left.</>}
        </p>
      )}
      {r.staffingEstimate && <StaffingEstimate e={r.staffingEstimate} />}
      {r.asOf && <p className="small muted" style={{ marginTop: 8 }}>Checked as of {r.asOf}.</p>}
    </>
  );
}

function Wh347({ r }) {
  const c = r.counts;
  return (
    <>
      <div className="facts">
        {r.weekEnding && <span>Week ending <b>{r.weekEnding}</b></span>}
        <span><b>{c.workers}</b> {c.workers === 1 ? 'worker' : 'workers'}</span>
        <span><b>{c.rows}</b> rows</span>
        <span><b>{Number(c.totalHours).toLocaleString('en-US')}</b> hours</span>
        {c.apprentices > 0 && <span><b>{c.apprentices}</b> {c.apprentices === 1 ? 'apprentice' : 'apprentices'}</span>}
        <span><b>{r.findingCounts.error}</b> {r.findingCounts.error === 1 ? 'error' : 'errors'}</span>
        <span><b>{r.findingCounts.warning}</b> {r.findingCounts.warning === 1 ? 'warning' : 'warnings'}</span>
      </div>
      {r.findings.length > 0 ? (
        <div className="table-scroll">
          <table className="findings">
            <thead><tr><th>Severity</th><th>Rule</th><th>Where and what</th></tr></thead>
            <tbody>
              {r.findings.map((f, n) => (
                <tr key={n}>
                  <td className={`sev-${f.severity === 'error' ? 'ERROR' : 'WARNING'}`}>{f.severity === 'error' ? 'Error' : 'Warning'}</td>
                  <td className="code ids">{f.ruleId.split('-').map((p, k) => <span key={k}>{k ? <>-<wbr /></> : null}{p}</span>)}</td>
                  <td><code style={{ wordBreak: 'break-all' }}>{f.path}</code><div className="small">{f.message}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="small" style={{ margin: 0 }}>No findings against the rates supplied. A PASS here does not mean the payroll complies with Davis-Bacon requirements.</p>}
      {r.findingsTruncated && <p className="small muted">The first 500 findings are listed. findingCounts has the full totals.</p>}
      {r.overtimeRule === 'not-applied' && <p className="small muted" style={{ marginTop: 8 }}>Overtime rule not applied (cwhssa set to no).</p>}
    </>
  );
}

const starText = (e) => (e.stars ? `${e.stars} ${e.stars === 1 ? 'star' : 'stars'}` : `${e.starRange[0]} to ${e.starRange[1]} stars`);

function StaffingEstimate({ e }) {
  if (!e.available) return <div className="estimate"><p className="small" style={{ margin: 0 }}>{e.reason}</p></div>;
  return (
    <div className="estimate">
      <div className="sheet-title" style={{ fontSize: 15 }}>Staffing rating estimate</div>
      <p className="small muted" style={{ margin: '2px 0 8px' }}>{e.label}</p>
      {e.excluded
        ? <p className="small">{e.note}</p>
        : (
          <>
            <p style={{ margin: '0 0 6px' }}><span className="stars">{starText(e)}</span> <span className="small muted">score {e.scoreRange[0] === e.scoreRange[1] ? e.scoreRange[0] : `${e.scoreRange[0]} to ${e.scoreRange[1]}`} of 380</span></p>
            <div className="facts" style={{ marginBottom: 6 }}>
              <span>Total nurse <b>{e.adjustedHprd.total.toFixed(2)}</b> HPRD</span>
              <span>RN <b>{e.adjustedHprd.rn.toFixed(2)}</b></span>
              <span>Weekend <b>{e.adjustedHprd.weekendTotal.toFixed(2)}</b></span>
            </div>
            <p className="small" style={{ margin: '0 0 6px' }}>{e.note}</p>
          </>
        )}
      <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>{e.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
    </div>
  );
}
