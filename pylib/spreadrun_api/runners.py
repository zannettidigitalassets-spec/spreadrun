"""Run the copied DataForge validators. No network, no persistence of submitted data."""
import hashlib
import importlib.util
import io
import json
import re
import sys
import tempfile
import zlib
from pathlib import Path

from .catalog import APIS

HERE = Path(__file__).parent / 'validators'
PROVENANCE = json.loads((HERE / 'PROVENANCE.json').read_text())


class InputError(ValueError):
    """The submitted input cannot be audited. Never billed."""


class RegistryUnavailable(RuntimeError):
    """A public registry the run depends on could not be reached. Never billed."""


class ProvenanceError(RuntimeError):
    """A copied validator no longer matches its recorded DataForge hash."""


def _check(rel):
    expected = PROVENANCE['files'][rel]['sha256']
    actual = hashlib.sha256((HERE / rel).read_bytes()).hexdigest()
    if actual != expected:
        raise ProvenanceError(f'{rel} hash {actual} does not match PROVENANCE.json')


def _load(name, rel):
    for f in PROVENANCE['files']:
        if f.startswith(rel.split('/')[0] + '/'):
            _check(f)
    spec = importlib.util.spec_from_file_location(name, HERE / rel)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


_clinical = None
_mrf = None


def clinical_module():
    global _clinical
    if _clinical is None:
        _clinical = _load('spreadrun_clinical_validator', 'clinical/validator.py')
    return _clinical


def mrf_module():
    global _mrf
    if _mrf is None:
        _mrf = _load('spreadrun_mrf_validator', 'mrf/validator.py')
    return _mrf


_uad = None


def uad_module():
    """SpreadRun's own UAD 3.6 engine (not a DataForge copy). Rules: validators/uad/rules.json,
    generated from the GSE appendices by scripts/uad/build_rules.py."""
    global _uad
    if _uad is None:
        spec = importlib.util.spec_from_file_location('spreadrun_uad_engine', HERE / 'uad' / 'engine.py')
        module = importlib.util.module_from_spec(spec)
        sys.modules['spreadrun_uad_engine'] = module
        spec.loader.exec_module(module)
        _uad = module
    return _uad


def run_uad(body: bytes, *, as_of=None):
    """Validate one UAD 3.6 URAR XML file. as_of (YYYY-MM-DD) sets the date the clock-based rules
    (effective date in the future, more than 367 days old) are evaluated against; default today (UTC)."""
    import datetime as dt
    v = uad_module()
    today = None
    if as_of is not None:
        try:
            today = dt.date.fromisoformat(as_of)
        except ValueError:
            raise InputError('asOf must be a date in YYYY-MM-DD format.') from None
    try:
        report = v.validate(body, today=today)
    except v.InputError as exc:
        raise InputError(str(exc)) from None
    report['asOf'] = (today or dt.datetime.now(dt.timezone.utc).date()).isoformat()
    return report


_pbj = None


def pbj_module():
    """SpreadRun's own PBJ engine. Rules: validators/pbj/spec.json, built from the CMS PBJ data
    specifications v4.10.0 by scripts/pbj/build_spec.py."""
    global _pbj
    if _pbj is None:
        spec = importlib.util.spec_from_file_location('spreadrun_pbj_engine', HERE / 'pbj' / 'engine.py')
        module = importlib.util.module_from_spec(spec)
        sys.modules['spreadrun_pbj_engine'] = module
        spec.loader.exec_module(module)
        _pbj = module
    return _pbj


# Optional inputs for the PBJ staffing estimate: name -> (minimum, maximum, whole number only, message).
# Messages never repeat the value sent.
PBJ_STAFFING_INPUTS = {
    'census': (1, 1_000_000, False, 'census must be the total resident days in the quarter, a number above 0.'),
    'weekendCensus': (1, 1_000_000, False, 'weekendCensus must be the resident days on Saturdays and Sundays, a number '
                      'above 0 and no more than census.'),
    'caseMixRatio': (0.2, 5, False, 'caseMixRatio must be a number from 0.2 to 5 (1.0 is the national average).'),
    'rnTurnover': (0, 100, False, 'rnTurnover must be a percentage from 0 to 100.'),
    'nurseTurnover': (0, 100, False, 'nurseTurnover must be a percentage from 0 to 100.'),
    'adminDepartures': (0, 50, True, 'adminDepartures must be a whole number from 0 to 50.'),
}


def pbj_staffing_inputs(raw):
    """raw: name -> string from the query. Returns None when no census is sent (no estimate)."""
    import math
    raw = {k: v for k, v in (raw or {}).items() if v not in (None, '')}
    if not raw:
        return None
    if 'census' not in raw:
        raise InputError('census (total resident days in the quarter) is required for the staffing estimate.')
    out = {}
    for name, value in raw.items():
        lo, hi, whole, msg = PBJ_STAFFING_INPUTS[name]
        try:
            num = float(value)
        except (TypeError, ValueError):
            raise InputError(msg) from None
        if not math.isfinite(num) or not lo <= num <= hi or (whole and num != int(num)):
            raise InputError(msg)
        out[name] = int(num) if whole else num
    if out.get('weekendCensus') is not None and out['weekendCensus'] > out['census']:
        raise InputError(PBJ_STAFFING_INPUTS['weekendCensus'][3])
    return out


def run_pbj(body: bytes, *, as_of=None, staffing=None):
    """Validate one PBJ staffing submission file (XML, gzip or ZIP). as_of (YYYY-MM-DD) is the date CMS edit
    -4002 (no future dates), the RN-day count and the deadline countdown are evaluated against; default today (UTC).
    staffing: optional census and turnover inputs (see PBJ_STAFFING_INPUTS) for the Five-Star staffing estimate."""
    import datetime as dt
    v = pbj_module()
    today = None
    if as_of is not None:
        try:
            today = dt.date.fromisoformat(as_of)
        except ValueError:
            raise InputError('asOf must be a date in YYYY-MM-DD format.') from None
    est = pbj_staffing_inputs(staffing)
    try:
        report = v.validate(body, today=today, staffing=est)
    except v.InputError as exc:
        raise InputError(str(exc)) from None
    report['asOf'] = (today or dt.datetime.now(dt.timezone.utc).date()).isoformat()
    return report


_pbj_brief = None


def pbj_brief_module():
    global _pbj_brief
    if _pbj_brief is None:
        spec = importlib.util.spec_from_file_location('spreadrun_pbj_brief', HERE / 'pbj' / 'brief.py')
        module = importlib.util.module_from_spec(spec)
        sys.modules['spreadrun_pbj_brief'] = module
        spec.loader.exec_module(module)
        _pbj_brief = module
    return _pbj_brief


def pbj_records(body: bytes, report):
    """The PBJ Star & Audit-Risk Brief (one-page PDF, from the report alone) and the records ZIP (the brief, the upload
    byte for byte, a README). Built in memory for the response; never stored or logged. Returns
    (brief bytes, zip bytes, [names in the ZIP])."""
    import datetime as dt
    m = pbj_brief_module()
    generated = dt.datetime.now(dt.timezone.utc).date()
    brief = m.brief_pdf(report, generated)
    zipped, names = m.package(body, report, brief, generated)
    return brief, zipped, names


_wh347 = None


def wh347_module():
    """SpreadRun's own Davis-Bacon WH-347 engine. Rules from the WH-347 instructions (Rev. January 2025) and
    29 CFR 5.5, 5.31 and 5.32; wage determination rates come with each request."""
    global _wh347
    if _wh347 is None:
        spec = importlib.util.spec_from_file_location('spreadrun_wh347_engine', HERE / 'wh347' / 'engine.py')
        module = importlib.util.module_from_spec(spec)
        sys.modules['spreadrun_wh347_engine'] = module
        spec.loader.exec_module(module)
        _wh347 = module
    return _wh347


def run_wh347(body: bytes):
    """Check one weekly certified payroll: JSON with CSV tables, or an .xlsx workbook."""
    v = wh347_module()
    try:
        return v.validate(body)
    except v.InputError as exc:
        raise InputError(str(exc)) from None


_wh347_form = None


def wh347_pdf(body: bytes) -> bytes:
    """The official WH-347 (Rev. January 2025) filled from a payroll that passed: page 1 for every 8 rows, page 2 with
    the Statement of Compliance unsigned. Built in memory for the response; never stored or logged."""
    global _wh347_form
    if _wh347_form is None:
        spec = importlib.util.spec_from_file_location('spreadrun_wh347_form', HERE / 'wh347' / 'form.py')
        module = importlib.util.module_from_spec(spec)
        sys.modules['spreadrun_wh347_form'] = module
        spec.loader.exec_module(module)
        _wh347_form = module
    return _wh347_form.fill(wh347_module().form_data(body))


_pecos = None


def pecos_module():
    """SpreadRun's own PECOS enrollment pre-check engine (not a DataForge copy). It makes one live NPPES call per run."""
    global _pecos
    if _pecos is None:
        spec = importlib.util.spec_from_file_location('spreadrun_pecos_engine', HERE / 'pecos' / 'engine.py')
        module = importlib.util.module_from_spec(spec)
        sys.modules['spreadrun_pecos_engine'] = module
        spec.loader.exec_module(module)
        _pecos = module
    return _pecos


def run_pecos(body: bytes, *, lookup=None):
    """Pre-check one CMS-855I, 855B or 855S draft (JSON). lookup(npi) replaces the live NPPES call in tests."""
    v = pecos_module()
    try:
        return v.validate(body, lookup=lookup)
    except v.InputError as exc:
        raise InputError(str(exc)) from None
    except v.RegistryUnavailable:
        raise RegistryUnavailable('The NPPES NPI Registry could not be reached, so the pre-check did not run. You were '
                                  'not charged. Try again in a few minutes.') from None


_cobra = None


def cobra_module():
    """SpreadRun's own COBRA notice content engine (not a DataForge copy). No network calls."""
    global _cobra
    if _cobra is None:
        spec = importlib.util.spec_from_file_location('spreadrun_cobra_engine', HERE / 'cobra' / 'engine.py')
        module = importlib.util.module_from_spec(spec)
        sys.modules['spreadrun_cobra_engine'] = module
        spec.loader.exec_module(module)
        _cobra = module
    return _cobra


def run_cobra(body: bytes, *, as_of=None, demo=False):
    """Check one COBRA election or general notice (JSON with the text, or a PDF or DOCX as base64). demo=True accepts
    only the sample requests."""
    v = cobra_module()
    try:
        return v.validate(body, as_of=as_of, demo=demo)
    except v.InputError as exc:
        raise InputError(str(exc)) from None


_cmmc = None


def cmmc_module():
    """SpreadRun's own CMMC Level 2 self-assessment score engine (not a DataForge copy). No network calls."""
    global _cmmc
    if _cmmc is None:
        spec = importlib.util.spec_from_file_location('spreadrun_cmmc_engine', HERE / 'cmmc' / 'engine.py')
        module = importlib.util.module_from_spec(spec)
        sys.modules['spreadrun_cmmc_engine'] = module
        spec.loader.exec_module(module)
        _cmmc = module
    return _cmmc


def run_cmmc(body: bytes, *, as_of=None, demo=False):
    """Verify one CMMC Level 2 self-assessment package (JSON). demo=True accepts only the sample packages."""
    v = cmmc_module()
    try:
        return v.validate(body, as_of=as_of, demo=demo)
    except v.InputError as exc:
        raise InputError(str(exc)) from None


_sca = None


def sca_module():
    """SpreadRun's own SCA health and welfare fringe engine (not a DataForge copy). No network calls."""
    global _sca
    if _sca is None:
        spec = importlib.util.spec_from_file_location('spreadrun_sca_engine', HERE / 'sca' / 'engine.py')
        module = importlib.util.module_from_spec(spec)
        sys.modules['spreadrun_sca_engine'] = module
        spec.loader.exec_module(module)
        _sca = module
    return _sca


def run_sca(body: bytes, *, query=None, demo=False):
    """Check one pay period of SCA health and welfare amounts (CSV, JSON or .xlsx). query: the run parameters for a
    CSV or .xlsx body. demo=True limits the run to the demo's employee count."""
    v = sca_module()
    try:
        return v.validate(body, query=query, demo=demo)
    except v.InputError as exc:
        raise InputError(str(exc)) from None


_ice = None


def ice_module():
    """SpreadRun's own incurred cost submission adequacy engine (not a DataForge copy). No network calls."""
    global _ice
    if _ice is None:
        spec = importlib.util.spec_from_file_location('spreadrun_ice_engine', HERE / 'ice' / 'engine.py')
        module = importlib.util.module_from_spec(spec)
        sys.modules['spreadrun_ice_engine'] = module
        spec.loader.exec_module(module)
        _ice = module
    return _ice


def run_ice(body: bytes, *, query=None, demo=False):
    """Pre-check one incurred cost submission workbook (.xlsx). query: fiscalYearEnd and optional asOf. demo=True accepts
    only the published sample workbooks."""
    v = ice_module()
    try:
        return v.validate(body, query=query, demo=demo)
    except v.InputError as exc:
        raise InputError(str(exc)) from None


def run_clinical(body: bytes):
    """Body is the JSON object the validator expects: {"studiesCsv": "...", "outcomesCsv": "..."}."""
    v = clinical_module()
    try:
        payload = json.loads(body.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise InputError('Request body must be a UTF-8 JSON object with studiesCsv and outcomesCsv.') from None
    try:
        return v.audit(payload)
    except v.InputError as exc:
        raise InputError(str(exc)) from None


CMS_FILENAME = re.compile(r'\d{9}_.+_standardcharges\.(csv|json)(\.gz)?', re.I)


def run_mrf(body: bytes, *, mode='sample', max_records=100, filename=None):
    """Validate an uploaded MRF (JSON, tall CSV or wide CSV, optionally gzip). Mirrors the
    DataForge download step (network.py) for uploads: same report fields, same decompression bound."""
    v = mrf_module()
    cfg_api = APIS['hospital-mrf-validator']
    if mode not in ('sample', 'preflight'):
        raise InputError('mode must be "sample" or "preflight".')
    if type(max_records) is not int or not 1 <= max_records <= cfg_api['max_records']:
        raise InputError(f"maxRecords must be an integer from 1 to {cfg_api['max_records']}.")
    if not body:
        raise InputError('Upload the file as the request body.')

    limit = cfg_api['max_decompressed_bytes']
    out = tempfile.TemporaryFile()
    truncated = False
    compressed = body[:2] == b'\x1f\x8b'
    unsupported = False
    if compressed:
        gz = zlib.decompressobj(16 + zlib.MAX_WBITS)
        try:
            data = gz.decompress(body, limit + 1)
        except zlib.error:
            out.close()
            raise InputError('The gzip upload is corrupt.') from None
        if len(data) > limit:
            data = data[:limit]
            truncated = True
        elif not gz.eof:
            out.close()
            raise InputError('The gzip upload is incomplete.')
        elif gz.unused_data:
            unsupported = True  # concatenated gzip members: unsupported, same as DataForge
        out.write(data)
        decoded = len(data)
    else:
        out.write(body)
        decoded = len(body)
    out.seek(0)

    source = {
        'url': 'upload',
        'finalUrl': None,
        'filename': '[upload]',
        'cmsFilenamePattern': bool(CMS_FILENAME.fullmatch(filename)) if filename else None,
        'httpStatus': None,
        'contentType': None,
        'contentLength': len(body),
        'redirects': [],
        'compressed': compressed,
        'unsupportedEncoding': unsupported,
    }
    file = {
        'bytesRead': len(body),
        'decompressedBytes': decoded,
        'truncatedByLimit': truncated,
        'sha256': hashlib.sha256(body).hexdigest(),
        'hashScope': 'full-upload',
    }
    cfg = {'validationMode': mode, 'maxRecords': max_records, 'maxDownloadBytes': cfg_api['max_body_bytes'], 'requestTimeoutSeconds': 0}
    try:
        report = v.audit(out, cfg, source, file)
    finally:
        out.close()
    # Not a download: the "reachable" check does not apply to an upload.
    report['checks']['reachable'] = None
    report['source'].pop('unsupportedEncoding', None)
    return report
