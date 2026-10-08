import { useState } from 'react';
import { CLINICAL_CODES, MRF_CODES } from './codes.js';

// Renders a real validator report. kind: 'clinical' | 'mrf' | 'uad' | 'pbj' | 'wh347' | 'pecos' | 'cmmc' | 'cobra' | 'sca' | 'ice'
// | 'hcris'.
// refs (SCA only): line number to the employee reference the user typed, joined in the browser. Reports never carry it.
export default function ReportSheet({ kind, report, label, sub, refs }) {
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
        {kind === 'clinical' ? <Clinical r={report} /> : kind === 'uad' ? <Uad r={report} /> : kind === 'pbj' ? <Pbj r={report} /> : kind === 'wh347' ? <Wh347 r={report} /> : kind === 'pecos' ? <Pecos r={report} /> : kind === 'cmmc' ? <Cmmc r={report} /> : kind === 'cobra' ? <Cobra r={report} /> : kind === 'sca' ? <Sca r={report} refs={refs} /> : kind === 'ice' ? <Ice r={report} /> : kind === 'hcris' ? <Hcris r={report} /> : <Mrf r={report} />}
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

const READY_TEXT = { ready: 'Ready', review: 'Review', fail: 'Fix', 'not-checked': 'Not checked', 'not-applicable': 'n/a' };

function Pecos({ r }) {
  return (
    <>
      <div className="facts">
        <span>Form <b>CMS-{r.enrollmentType}</b></span>
        <span>{r.applicationReason}</span>
        <span>Window ends <b>{r.windowEnds}</b></span>
        <span><b>{r.findingCounts.error}</b> {r.findingCounts.error === 1 ? 'error' : 'errors'}</span>
        <span><b>{r.findingCounts.warning}</b> {r.findingCounts.warning === 1 ? 'warning' : 'warnings'}</span>
      </div>
      <ul className="readiness" style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
        {r.readiness.map((x) => (
          <li key={x.item} className="small" style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
            <b className={x.status === 'fail' ? 'sev-ERROR' : x.status === 'review' ? 'sev-WARNING' : ''} style={{ minWidth: 86 }}>{READY_TEXT[x.status]}</b>
            <span>{x.label}</span>
          </li>
        ))}
      </ul>
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
      ) : <p className="small" style={{ margin: 0 }}>No findings. A clean pre-check does not guarantee the enrollment will be approved.</p>}
      {!r.registry.queried && <p className="small muted" style={{ marginTop: 8 }}>The NPPES registry was not queried because the NPI failed the format or check digit test.</p>}
    </>
  );
}

const CMMC_READY = { ready: 'Ready', review: 'Review', fix: 'Fix' };

function Cmmc({ r }) {
  return (
    <>
      <div className="calc-big" style={{ marginBottom: 8 }}>
        <span className="small muted">Verified score</span>
        <b>{r.verifiedScore === null ? 'Not scored' : `${r.verifiedScore} of ${r.maxScore}`}</b>
        <span className="small">{r.band.label}</span>
      </div>
      <div className="facts">
        <span>Claimed score <b>{!r.claimedScore.provided ? 'not given' : r.claimedScore.matches === true ? 'matches' : r.claimedScore.matches === false ? 'does not match' : 'not compared'}</b></span>
        <span><b>{r.counts.notMet + r.counts.partial}</b> not MET</span>
        <span><b>{r.counts.pointsDeducted}</b> points deducted</span>
        <span><b>{r.findingCounts.error}</b> {r.findingCounts.error === 1 ? 'error' : 'errors'}</span>
        <span><b>{r.findingCounts.warning}</b> {r.findingCounts.warning === 1 ? 'warning' : 'warnings'}</span>
      </div>
      <ul className="readiness" style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
        {r.readiness.map((x) => (
          <li key={x.item} className="small" style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
            <b className={x.status === 'fix' ? 'sev-ERROR' : x.status === 'review' ? 'sev-WARNING' : ''} style={{ minWidth: 64 }}>{CMMC_READY[x.status]}</b>
            <span>{x.label}</span>
          </li>
        ))}
      </ul>
      {r.deductions.length > 0 && (
        <details style={{ margin: '0 0 12px' }}>
          <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>Deductions ({r.deductions.length})</summary>
          <table className="findings" style={{ marginTop: 8 }}>
            <thead><tr><th>Requirement</th><th>Points</th></tr></thead>
            <tbody>{r.deductions.map((d) => <tr key={d.requirement}><td className="code">{d.requirement}{d.partial ? ' (partial)' : ''}</td><td>-{d.points}</td></tr>)}</tbody>
          </table>
        </details>
      )}
      {r.findings.length > 0 ? (
        <div className="table-scroll">
          <table className="findings">
            <thead><tr><th>Severity</th><th>Rule</th><th>Where and what</th></tr></thead>
            <tbody>
              {r.findings.slice(0, 60).map((f, n) => (
                <tr key={n}>
                  <td className={`sev-${f.severity === 'error' ? 'ERROR' : 'WARNING'}`}>{f.severity === 'error' ? 'Error' : 'Warning'}</td>
                  <td className="code ids">{f.ruleId.split('-').map((p, k) => <span key={k}>{k ? <>-<wbr /></> : null}{p}</span>)}</td>
                  <td><code style={{ wordBreak: 'break-all' }}>{f.path}</code><div className="small">{f.message}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.findings.length > 60 && <p className="small muted">{r.findings.length - 60} more in the JSON report.</p>}
        </div>
      ) : <p className="small" style={{ margin: 0 }}>No findings. A PASS means the math and the package check out. It is not a certification and does not mean DoD will accept the score.</p>}
    </>
  );
}

const SCA_RK = { flagged: 'Flagged', clear: 'Clear', 'not-checked': 'Not checked' };
const usd = (s) => `$${Number(s).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Sca({ r, refs }) {
  const [showAll, setShowAll] = useState(false);
  const who = (line) => (refs && refs[line] ? `${refs[line]} (line ${line})` : `Line ${line}`);
  const rows = [...r.employees].sort((a, b) => (a.result === b.result ? a.line - b.line : a.result === 'FAIL' ? -1 : 1));
  const shown = showAll ? rows : rows.slice(0, 25);
  const t = r.totals;
  return (
    <>
      <div className="calc-big" style={{ marginBottom: 8 }}>
        <span className="small muted">Back wage exposure this period</span>
        <b>{usd(t.backWageExposure)}</b>
        <span className="small">{r.summary}</span>
      </div>
      <div className="facts">
        <span><b>{t.employees}</b> {t.employees === 1 ? 'employee' : 'employees'}</span>
        <span><b>{t.failing}</b> short</span>
        <span>Required <b>{usd(t.required)}</b></span>
        <span>Furnished <b>{usd(t.furnished)}</b></span>
        <span>Rate <b>${r.parameters.rates.rate}</b>/hr{r.parameters.rates.rateHphca ? <> (HPHCA <b>${r.parameters.rates.rateHphca}</b>)</> : null}</span>
      </div>
      <div className="table-scroll" style={{ margin: '0 0 12px' }}>
        <table className="findings">
          <thead><tr><th>Employee</th><th>Hours</th><th>Required</th><th>Furnished</th><th>Short</th><th>Result</th></tr></thead>
          <tbody>
            {shown.map((e) => (
              <tr key={e.line}>
                <td style={{ wordBreak: 'break-word' }}>{who(e.line)}</td>
                <td>{e.hoursCounted}{e.capped ? '*' : ''}</td>
                <td>{usd(e.required)}</td>
                <td>{usd(e.furnished)}</td>
                <td>{usd(e.shortfall)}</td>
                <td className={e.result === 'FAIL' ? 'sev-ERROR' : ''}><b>{e.result}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 25 && !showAll && <button type="button" className="linklike small" onClick={() => setShowAll(true)}>Show all {rows.length} employees</button>}
        {r.employees.some((e) => e.capped) && <p className="small muted" style={{ margin: '6px 0 0' }}>* Capped at 40 hours a week (or 2,080 a year): hours past the cap carry no H&amp;W.</p>}
      </div>
      <div className="sheet-title" style={{ fontSize: 15, margin: '0 0 6px' }}>Recordkeeping (DOL Fact Sheet #67B common violations)</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
        {r.recordkeeping.map((x) => (
          <li key={x.item} className="small" style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
            <b className={x.status === 'flagged' ? 'sev-ERROR' : ''} style={{ minWidth: 86 }}>{SCA_RK[x.status]}</b>
            <span>{x.label}{x.lines.length ? <>: {x.lines.map(who).join(', ')}</> : null}{x.howToCheck ? <span className="muted"> {x.howToCheck}</span> : null}</span>
          </li>
        ))}
      </ul>
      {r.findings.length > 0 ? (
        <div className="table-scroll">
          <table className="findings">
            <thead><tr><th>Severity</th><th>Rule</th><th>Who and what</th></tr></thead>
            <tbody>
              {r.findings.slice(0, 60).map((f, n) => (
                <tr key={n}>
                  <td className={`sev-${f.severity === 'error' ? 'ERROR' : 'WARNING'}`}>{f.severity === 'error' ? 'Error' : 'Warning'}</td>
                  <td className="code ids">{f.ruleId.split('-').map((p, k) => <span key={k}>{k ? <>-<wbr /></> : null}{p}</span>)}</td>
                  <td><b>{who(f.line)}</b><div className="small">{f.message}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.findings.length > 60 && <p className="small muted">{r.findings.length - 60} more in the JSON report.</p>}
        </div>
      ) : <p className="small" style={{ margin: 0 }}>No findings. A PASS means the math on these rows meets the rate used. It is not a compliance determination and not DOL acceptance.</p>}
      {r.notes.map((n) => <p key={n} className="small muted" style={{ margin: '8px 0 0' }}>{n}</p>)}
    </>
  );
}

const ICE_STATUS = { pass: 'Pass', warn: 'Review', fail: 'Fail', review: 'Review by hand', na: 'Not applicable' };
const ICE_SCHED = { found: 'Found', missing: 'Missing', 'not-applicable': 'None to report', empty: 'Empty' };
const ICE_GROUPS = [['schedules', 'Required schedules'], ['math', 'Math foots'], ['crossTies', 'Schedules tie'],
  ['certificate', 'Certificate'], ['deadline', 'Deadline']];
const num = (v) => (typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 6 }) : v);
const sevClass = (st) => (st === 'fail' ? 'sev-ERROR' : st === 'warn' ? 'sev-WARNING' : '');

function Ice({ r }) {
  const [all, setAll] = useState(false);
  const d = r.deadline;
  const found = r.schedules.filter((x) => x.status !== 'missing').length;
  return (
    <>
      <div className="calc-big" style={{ marginBottom: 8 }}>
        <span className="small muted">Adequacy pre-check, fiscal year ended {fmtDate(r.fiscalYearEnd)}</span>
        <b style={{ fontSize: 20 }}>{r.summary}</b>
        <span className="small">Due {fmtDate(d.due)}: {d.daysLeft < 0 ? `${-d.daysLeft} days past the 6-month mark` : `${d.daysLeft} days left`}.</span>
      </div>
      <div className="facts">
        <span><b>{found}</b> of 15 schedules</span>
        <span><b>{r.findingCounts.error}</b> {r.findingCounts.error === 1 ? 'error' : 'errors'}</span>
        <span><b>{r.findingCounts.warning}</b> to review</span>
        <span><b>{r.checklistCounts.pass}</b> checklist items pass</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
        {ICE_GROUPS.map(([k, label]) => (
          <li key={k} className="small" style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
            <b className={sevClass(r.checks[k])} style={{ minWidth: 64 }}>{ICE_STATUS[r.checks[k]] || r.checks[k]}</b><span>{label}</span>
          </li>
        ))}
      </ul>
      <div className="ice-sched" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 6, margin: '0 0 12px' }}>
        {r.schedules.map((x) => (
          <span key={x.schedule} title={`Schedule ${x.schedule}: ${ICE_SCHED[x.status]}${x.tab ? ` (tab ${x.tab})` : ''}`}
            className="small" style={{ textAlign: 'center', border: '1px solid var(--line)', borderRadius: 6, padding: '4px 0',
              background: x.status === 'missing' ? 'var(--fail-soft)' : x.status === 'empty' ? 'var(--warn-soft)' : 'transparent' }}>
            <b>{x.schedule}</b><br />{x.status === 'missing' ? 'Missing' : x.status === 'found' ? 'Found' : x.status === 'empty' ? 'Empty' : 'None'}
          </span>
        ))}
      </div>
      {r.findings.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {r.findings.slice(0, 60).map((f, n) => (
            <li key={n} style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }}>
              <div className="small" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline' }}>
                <b className={`sev-${f.severity === 'error' ? 'ERROR' : 'WARNING'}`}>{f.severity === 'error' ? 'Error' : 'Warning'}</b>
                <span style={{ wordBreak: 'break-word' }}>{f.tab ? <><b>{f.tab}</b>{f.range ? <> {f.range}</> : null}</> : 'Workbook'}</span>
                <code className="ids" style={{ fontSize: 12 }}>{f.ruleId}</code>
              </div>
              {(f.expected !== undefined || f.actual !== undefined) && (
                <div className="small" style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px', margin: '2px 0' }}>
                  {f.expected !== undefined && <span>Expected <b>{num(f.expected)}</b></span>}
                  {f.actual !== undefined && <span>Actual <b>{num(f.actual)}</b></span>}
                </div>
              )}
              <div className="small">{f.message}</div>
            </li>
          ))}
          {r.findings.length > 60 && <li className="small muted">{r.findings.length - 60} more in the JSON report.</li>}
        </ul>
      ) : <p className="small" style={{ margin: 0 }}>No findings. A PASS means the workbook is complete and its math and ties check out. Adequacy is not allowability, and a PASS is not DCAA acceptance.</p>}
      <details style={{ marginTop: 12 }} open={all} onToggle={(e) => setAll(e.target.open)}>
        <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>DCAA adequacy checklist, item by item (47)</summary>
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
          {r.checklist.map((x) => (
            <li key={x.item} className="small" style={{ display: 'flex', gap: 8, padding: '2px 0' }}>
              <b className={sevClass(x.status)} style={{ minWidth: 104 }}>{ICE_STATUS[x.status]}</b>
              <span>{x.item}. Schedule {x.schedule}: {x.label}</span>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}

const HCRIS_GROUPS = [['ecrFormat', 'ECR file format'], ['crossTies', 'Worksheets tie'], ['s10', 'S-10 recomputes'],
  ['listings', 'Listings support the claims'], ['deadline', 'Deadline']];
const HCRIS_EX = { '2A': 'Exhibit 2A, Medicare bad debts', '3B': 'Exhibit 3B, charity care', '3C': 'Exhibit 3C, total bad debts' };
const HCRIS_STATUS = { pass: 'Pass', warn: 'Review', fail: 'Fail', na: 'Not needed' };

function hcrisWhere(f) {
  if (f.exhibit && f.row) return <><b>Exhibit {f.exhibit}</b> {f.file ? <span className="muted">{f.file}</span> : null} row {f.row}{f.column ? `, column ${f.column}` : ''}</>;
  if (f.worksheet) return <><b>Worksheet {f.worksheet}</b>{f.line ? `, line ${f.line}` : ''}{f.column ? `, column ${f.column}` : ''}</>;
  if (f.exhibit) return <b>Exhibit {f.exhibit}</b>;
  if (f.record) return <><b>ECR file</b> record {f.record}{f.positions ? `, positions ${f.positions}` : ''}</>;
  return 'Cost report';
}

function Hcris({ r }) {
  const d = r.deadline;
  const L = r.listings;
  return (
    <>
      <div className="calc-big" style={{ marginBottom: 8 }}>
        <span className="small muted">Cost reporting period {fmtDate(r.period.start)} to {fmtDate(r.period.end)}</span>
        <b style={{ fontSize: 20 }}>{r.summary}</b>
        <span className="small">Due {fmtDate(d.due)}: {d.daysLeft < 0 ? `${-d.daysLeft} days past the five month mark` : `${d.daysLeft} days left`} as of {fmtDate(d.asOf)}.</span>
      </div>
      <div className="facts">
        <span><b>{r.tiesChecked.toLocaleString('en-US')}</b> amounts recomputed</span>
        <span><b>{r.findingCounts.error}</b> {r.findingCounts.error === 1 ? 'error' : 'errors'}</span>
        <span><b>{r.findingCounts.warning}</b> to review</span>
        <span><b>{L.found.length}</b> {L.found.length === 1 ? 'listing' : 'listings'}</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
        {HCRIS_GROUPS.map(([k, label]) => (
          <li key={k} className="small" style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
            <b className={sevClass(r.checks[k])} style={{ minWidth: 64 }}>{HCRIS_STATUS[r.checks[k]] || r.checks[k]}</b><span>{label}</span>
          </li>
        ))}
      </ul>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
        {Object.keys(HCRIS_EX).map((ex) => (
          <li key={ex} className="small" style={{ display: 'flex', gap: 8, padding: '2px 0', flexWrap: 'wrap' }}>
            <b className={sevClass(L.status[ex])} style={{ minWidth: 64 }}>{L.status[ex] === 'na' ? (L.required[ex] ? 'Missing' : 'Not needed') : HCRIS_STATUS[L.status[ex]]}</b>
            <span>{HCRIS_EX[ex]}: {L.found.filter((x) => x.exhibit === ex).reduce((a, x) => a + x.rows, 0).toLocaleString('en-US')} rows{L.required[ex] ? ', required by what the report claims' : ''}</span>
          </li>
        ))}
      </ul>
      {r.findings.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {r.findings.slice(0, 60).map((f, n) => (
            <li key={n} style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }}>
              <div className="small" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline' }}>
                <b className={`sev-${f.severity === 'error' ? 'ERROR' : 'WARNING'}`}>{f.severity === 'error' ? 'Error' : 'Warning'}</b>
                <span style={{ wordBreak: 'break-word' }}>{hcrisWhere(f)}</span>
                <code className="ids" style={{ fontSize: 12 }}>{f.ruleId}</code>
              </div>
              {(f.expected !== undefined || f.actual !== undefined) && (
                <div className="small" style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px', margin: '2px 0' }}>
                  {f.expected !== undefined && <span>Expected <b>{num(f.expected)}</b></span>}
                  {f.actual !== undefined && <span>Actual <b>{num(f.actual)}</b></span>}
                </div>
              )}
              <div className="small">{f.message}</div>
            </li>
          ))}
          {r.findings.length > 60 && <li className="small muted">{r.findings.length - 60} more in the JSON report.</li>}
        </ul>
      ) : <p className="small" style={{ margin: 0 }}>No findings. A PASS means the file is in the CMS format, the worksheets tie, S-10 recomputes and the listings support the claims. It is not MAC acceptance and does not determine allowability or payment.</p>}
      <p className="small muted" style={{ marginTop: 12 }}>Checked against {r.checkedAgainst.transmittal}, ECR specification {r.checkedAgainst.specDate}.</p>
    </>
  );
}

const COBRA_ITEM = { found: 'Found', review: 'Review', missing: 'Missing' };
const COBRA_READY = { ready: 'Ready', review: 'Review', fix: 'Fix', 'not-checked': 'Not checked' };
const fmtDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function Cobra({ r }) {
  const d = r.deadlines || {};
  return (
    <>
      <div className="facts">
        <span><b>{r.noticeType === 'election' ? 'Election' : 'General'}</b> notice</span>
        <span><b>{r.contentItems.found}</b> of {r.contentItems.required} items found</span>
        {d.electionNoticeDue && <span>Send by <b>{fmtDate(d.electionNoticeDue)}</b></span>}
        {d.generalNoticeDue && <span>Send by <b>{fmtDate(d.generalNoticeDue)}</b></span>}
        {d.electionPeriodEndsNoEarlierThan && <span>Election open until at least <b>{fmtDate(d.electionPeriodEndsNoEarlierThan)}</b></span>}
        <span><b>{r.findingCounts.error}</b> {r.findingCounts.error === 1 ? 'error' : 'errors'}</span>
        <span><b>{r.findingCounts.warning}</b> {r.findingCounts.warning === 1 ? 'warning' : 'warnings'}</span>
      </div>
      <ul className="readiness" style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
        {r.readiness.map((x) => (
          <li key={x.item} className="small" style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
            <b className={x.status === 'fix' ? 'sev-ERROR' : x.status === 'review' ? 'sev-WARNING' : ''} style={{ minWidth: 86 }}>{COBRA_READY[x.status]}</b>
            <span>{x.label}</span>
          </li>
        ))}
      </ul>
      <details style={{ margin: '0 0 12px' }}>
        <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>Content items ({r.regulation})</summary>
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
          {r.checklist.map((x) => (
            <li key={x.item} className="small" style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
              <b className={x.status === 'missing' ? 'sev-ERROR' : x.status === 'review' ? 'sev-WARNING' : ''} style={{ minWidth: 64 }}>{COBRA_ITEM[x.status]}</b>
              <span>({x.item}) {x.label}</span>
            </li>
          ))}
        </ul>
      </details>
      {r.findings.length > 0 ? (
        <div className="table-scroll">
          <table className="findings">
            <thead><tr><th>Severity</th><th>Rule</th><th>What</th></tr></thead>
            <tbody>
              {r.findings.map((f, n) => (
                <tr key={n}>
                  <td className={`sev-${f.severity === 'error' ? 'ERROR' : 'WARNING'}`}>{f.severity === 'error' ? 'Error' : 'Warning'}</td>
                  <td className="code ids">{f.ruleId.split('-').map((p, k) => <span key={k}>{k ? <>-<wbr /></> : null}{p}</span>)}</td>
                  <td><div className="small">{f.item ? `Item (${f.item}). ` : ''}{f.message}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="small" style={{ margin: 0 }}>No findings. A clean check is not legal advice and not a guarantee against DOL penalties.</p>}
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
