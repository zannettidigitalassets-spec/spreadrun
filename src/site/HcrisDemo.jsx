import { useState } from 'react';
import { ModeNote, Result, kb, runLabel, useCredits, useMode, useRunner } from './Demo.jsx';
import { dollars } from '../catalog.js';

// The cost report pre-audit test form. The free demo runs the two published sample packages only (the demo endpoint
// refuses anything else). Your own cost report runs as the paid pre-audit, so it needs a signed-in user whose credit
// covers the price. Pick a .zip package, or the ECR file and the listings together: the browser zips them (stored,
// not compressed) and sends one body. The period and the date to measure the deadline from go in the query string.
const SAMPLES = [
  ['hcris-sample-clean', 'Sample: clean package'],
  ['hcris-sample-errors', 'Sample with errors'],
];
// The samples' listing dates are shifted 1,000 days back, so the period they are checked against is too.
const SAMPLE_PERIOD = { start: '2021-09-05', end: '2022-09-04', asOf: '2025-10-15' };
const MAX = 4_000_000;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// A minimal .zip writer (store method), enough to send several files as one request body.
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
export async function zipFiles(files) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const data = new Uint8Array(await f.arrayBuffer());
    const name = enc.encode(f.name.replace(/[\\/]/g, '_'));
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, name.length, true);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true); cen.setUint16(28, name.length, true);
    cen.setUint32(42, offset, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const size = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, size, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

export default function HcrisDemo({ api, sample }) {
  const credits = useCredits(api);
  const mode = useMode(api, credits);
  const [state, run] = useRunner(api, credits);
  const [file, setFile] = useState(null);          // { name, blob, sample, count }
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [asOf, setAsOf] = useState('');
  const [problem, setProblem] = useState('');

  const loadSample = async ([base]) => {
    const blob = await fetch(`/samples/${base}.zip`).then((r) => r.blob());
    setFile({ name: `${base}.zip`, blob, sample: true, count: 1 });
    setStart(SAMPLE_PERIOD.start);
    setEnd(SAMPLE_PERIOD.end);
    setAsOf(SAMPLE_PERIOD.asOf);
    setProblem('');
  };
  const pick = async (e) => {
    const list = [...(e.target.files || [])];
    if (!list.length) return;
    setProblem('');
    if (list.some((f) => /\.xls$/i.test(f.name))) {
      setFile(null);
      setProblem('One of the listings is an .xls file (Excel 97 to 2003). MCReF takes .xlsx: open it in Excel, choose Save As, pick Excel Workbook (.xlsx), and pick that.');
      return;
    }
    const blob = list.length === 1 ? list[0] : await zipFiles(list);
    if (blob.size > MAX) {
      setFile(null);
      setProblem(`That comes to ${(blob.size / 1e6).toFixed(1)} MB. The limit is 4 MB. Zip the files first (a .zip usually shrinks them several times over), or split large listings by CCN.`);
      return;
    }
    setFile({ name: list.length === 1 ? list[0].name : `${list.length} files, zipped`, blob, sample: false, count: list.length });
  };
  const own = file && !file.sample;
  const blocked = own && !mode.paid;
  const ready = !!file && DAY.test(start) && DAY.test(end) && !blocked;
  const submit = (e) => {
    e.preventDefault();
    if (!ready) return;
    const q = new URLSearchParams({ periodStart: start, periodEnd: end, ...(asOf ? { asOf } : {}) });
    const isZip = file.count > 1 || /\.zip$/i.test(file.name);
    run({ paid: own ? true : false, body: file.blob, contentType: isZip ? 'application/zip' : 'text/plain', query: `?${q}` });
  };

  return (
    <div className="split">
      <form className="demo" onSubmit={submit} style={{ minWidth: 0 }}>
        <ModeNote api={api} credits={credits} mode={mode} demoLimits="the two sample packages, 10 runs a day" />
        <div className="btn-row" style={{ margin: '0 0 16px' }}>
          {SAMPLES.map((s) => <button key={s[0]} type="button" className="btn secondary small" onClick={() => loadSample(s)}>{s[1]}</button>)}
        </div>
        <div className="note" role="note" style={{ margin: '0 0 12px' }}>
          <p style={{ margin: 0 }}><b>No PHI.</b> Do not upload patient names, MBIs, Medicaid numbers or real account numbers. This tool does not accept PHI, and files containing PHI patterns are refused without charge.</p>
        </div>
        <div className="field">
          <label htmlFor="hcris-file">ECR file and listings (a .zip, or pick several files, up to 4 MB)</label>
          <input id="hcris-file" type="file" multiple onChange={pick} />
          <span className="hint">The ECR file your cost report software exports for MCReF, as is, with the Exhibit 2A, 3B and 3C listings prepared as described above, in the CMS template layout (.xlsx or .csv).</span>
        </div>
        {file && <p className="small">Selected: <code>{file.name}</code> ({kb(file.blob.size)}){file.sample ? ', a published sample' : ''}</p>}
        <div className="wh-grid" style={{ minWidth: 0 }}>
          <div className="field" style={{ margin: 0, minWidth: 0 }}>
            <label htmlFor="hcris-start">Period start, shifted</label>
            <input id="hcris-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
          </div>
          <div className="field" style={{ margin: 0, minWidth: 0 }}>
            <label htmlFor="hcris-end">Period end, shifted</label>
            <input id="hcris-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </div>
        </div>
        <div className="field" style={{ margin: '12px 0 0', minWidth: 0 }}>
          <label htmlFor="hcris-asof">Measure the deadline from (optional)</label>
          <input id="hcris-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
        <span className="hint small" style={{ display: 'block', margin: '6px 0 12px' }}>Enter the period moved by the same number of days as your listing dates. The deadline comes from the real period in the ECR file: due the last day of the fifth month after it ends. Leave the last date blank to measure from today.</span>
        <p className="small muted" style={{ margin: '0 0 12px' }}>Processed in memory and not stored. The report names worksheets, lines, columns, listing rows and your row IDs, and gives day counts, never dates.</p>
        {blocked && (
          <div className="note" style={{ margin: '0 0 12px' }} role="status">
            <p style={{ margin: 0 }}>
              <b>Checking your own cost report is a paid pre-audit: {dollars(api.priceCents)}.</b>{' '}
              {credits.status === 'signed-in' && credits.canPay
                ? <>Untick "Use the free demo instead" to run it from your credit.</>
                : credits.status === 'signed-in'
                  ? <>Your credit ({dollars(credits.balanceCents)}) is below that. <a href="/account">Buy credits</a>, then run it here.</>
                  : <><a href="/account">Sign in and buy credits</a> to run it here, or use the API.</>}
              {' '}The free demo runs the sample packages: load one above to try it.
            </p>
          </div>
        )}
        {problem && <div className="error-box" role="alert" style={{ margin: '0 0 12px' }}>{problem}</div>}
        <button className="btn" type="submit" disabled={!ready || state.phase === 'running'}>
          {file?.sample ? (state.phase === 'running' ? 'Checking' : 'Run the sample (free)') : runLabel(mode.paid, api, 'Pre-audit the cost report', 'Checking', state.phase === 'running')}
        </button>
        <div className="status-line" aria-live="polite">
          {state.phase === 'running' && 'Reading the ECR file, recomputing the worksheets and checking the listings.'}
          {state.phase === 'done' && `Done. ${state.report.summary}${state.paid ? ` Charged ${dollars(api.priceCents)}.` : ''}`}
        </div>
        {state.phase === 'error' && <div className="error-box" role="alert">{state.error}</div>}
      </form>
      <div style={{ minWidth: 0 }}><Result state={state} kind="hcris" sample={sample} sampleLabel="Sample package with planted errors" /></div>
    </div>
  );
}
