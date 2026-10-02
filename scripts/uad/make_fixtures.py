"""Make the synthetic UAD 3.6 test files committed to the repo and used by the website demo.

    python3 scripts/uad/make_fixtures.py --sample <GSE D-1 sample XML, e.g. SF1.xml>

The GSE sample scenarios are not committed (they carry a GSE copyright notice). This script keeps a
sample's element structure, which the delivery specification dictates, and replaces every name,
address, free-text value, identifier, file reference and amount with invented values, then drops
comments. Writes:

  pylib/tests/fixtures/uad-pass.xml     a URAR file that passes every implemented check
  pylib/tests/fixtures/uad-fail.xml     the same file with deliberate errors (one per check family)
  public/samples/uad-*.xml              copies for the website test form
"""
import argparse
import datetime as dt
import hashlib
import json
import re
import shutil
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pylib' / 'spreadrun_api' / 'validators' / 'uad'))
import engine  # noqa: E402

NS = engine.MISMO_NS
XLINK = 'http://www.w3.org/1999/xlink'
ET.register_namespace('', NS)
ET.register_namespace('xlink', XLINK)
ET.register_namespace('xsi', 'http://www.w3.org/2001/XMLSchema-instance')
FIX = ROOT / 'pylib' / 'tests' / 'fixtures'
PUB = ROOT / 'public' / 'samples'

STREETS = ['Example Street', 'Sample Avenue', 'Placeholder Road', 'Test Lane', 'Fixture Court', 'Demo Drive']
FIRST = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Taylor']
LAST = ['Example', 'Sample', 'Fixture', 'Placeholder', 'Testcase', 'Demo']
ORGS = ['Example Lending LLC', 'Sample Appraisal Co', 'Fixture Valuation Group', 'Demo Data Services']


def word(seed, n):
    h = hashlib.sha256(seed.encode()).hexdigest()
    return h[:n]


def synth(name, value, path, i, maxlen):
    """Replacement for a String data point, or None to keep the value (codes, enumerations, versions)."""
    def fit(s):
        return s[:maxlen] if maxlen else s
    if name == 'AddressLineText':
        return fit(f'{100 + i * 7} {STREETS[i % len(STREETS)]}')
    if name == 'CityName':
        return 'Sampleton'
    if name == 'CountyName':
        return 'Example'
    if name == 'NeighborhoodName':
        return fit(['Example Heights', 'Sample Park', 'Fixture Hills'][i % 3])
    if name == 'PostalCode':
        return '00501' if '-' not in value else '00501-0001'
    if name in ('FirstName',):
        return FIRST[i % len(FIRST)]
    if name in ('LastName',):
        return LAST[i % len(LAST)]
    if name in ('MiddleName', 'SuffixName'):
        return 'Q' if name == 'MiddleName' else 'Jr'
    if name in ('FullName', 'AppraiserCompanyName', 'DataSourceName', 'ValuationSoftwareVendorName',
                'ValuationSoftwareProductName', 'ProjectName', 'SubdivisionName', 'BuilderName', 'ManufacturerName'):
        return fit(ORGS[i % len(ORGS)])
    if name in ('ImageFileLocationIdentifier', 'ObjectURL'):
        ext = value.rsplit('.', 1)[-1] if '.' in value[-6:] else 'jpg'
        return f'image_{i:03d}.{ext}'
    if name.endswith('Identifier') and name not in ('ValuationReportContentIdentifier', 'DocumentFormIssuingEntityVersionIdentifier',
                                                    'AboutVersionIdentifier', 'MIMETypeIdentifier', 'LatitudeIdentifier',
                                                    'LongitudeIdentifier', 'UnitIdentifier', 'StructureIdentifier',
                                                    'AdditionalComparisonLineItemIdentifier', 'FloorIdentifier',
                                                    'ValuationSoftwareProductVersionIdentifier', 'AddressUnitIdentifier'):
        return fit('SR' + word(f'{name}{i}{value}', 10).upper())
    if name.endswith(('Text', 'Description', 'Comment', 'CommentText')) or name in ('ParcelIdentifier',):
        base = f'Synthetic {name[:-4] if name.endswith("Text") else name} {i}.'
        return fit(base) if maxlen and len(base) <= maxlen else fit('Synthetic text.')
    return None


def anonymise(src):
    body = src.read_bytes()
    body = re.sub(rb'<!--.*?-->', b'', body, flags=re.S)
    root = ET.fromstring(body)
    root.attrib.pop('{http://www.w3.org/2001/XMLSchema-instance}schemaLocation', None)  # points at a local file
    doc = engine.Doc(root)
    dps = engine.rules()['datapoints']
    for i, (path, elems) in enumerate(sorted(doc.by_path.items())):
        ents = dps.get(path)
        if not ents:
            continue
        name = path.rsplit('/', 1)[1]
        fmt = ents[0]['fmt']
        det = ents[0]['det']
        for j, e in enumerate(elems):
            v = (e.text or '').strip()
            if len(e) or not v:
                continue
            k = i * 31 + j
            if fmt == 'String':
                if all(en['enum'] and en['fmt'] in ('Enumerated', 'Boolean') for en in ents):
                    continue
                maxlen = int(det) if det.isdigit() else None
                new = synth(name, v, path, k, maxlen)
                if new is not None:
                    e.text = new
            elif fmt == 'Amount' and re.fullmatch(r'\d+', v) and int(v) > 1000:
                e.text = str(int(round(int(v) * 1.03, -2)))   # amounts nudged, still positive whole dollars
            elif name in ('LatitudeIdentifier', 'LongitudeIdentifier') and re.fullmatch(r'-?\d+\.\d+', v):
                e.text = f'{float(v) + 0.0137:.6f}'
    return root


def must(root, today):
    report = engine.validate(ET.tostring(root, xml_declaration=True, encoding='utf-8'), today=today)
    return report


def first(root, local_path):
    found = root.findall('.//' + '/'.join(f'{{{NS}}}{p}' for p in local_path.split('/')))
    return found


def break_it(root):
    """One deliberate error per check family. Returns the rule ids that must appear."""
    expected = set()
    doc = engine.Doc(root)
    subject = next(p for p in doc.by_path[engine.PROPERTY] if p.get('ValuationUseType') == 'SubjectProperty')
    # H-1 required: subject ZIP code removed (and A-1 required)
    addr = subject.find(f'{{{NS}}}ADDRESS')
    addr.remove(addr.find(f'{{{NS}}}PostalCode'))
    expected |= {'A1-REQUIRED'}
    # A-1 enumeration: a condition rating that does not exist
    pd = subject.find(f'{{{NS}}}PROPERTY_DETAIL')
    pd.find(f'{{{NS}}}OverallConditionRatingCode').text = 'C7'
    expected.add('A1-ENUM')
    # A-1 format: boolean in the wrong case
    pd.find(f'{{{NS}}}NativeAmericanLandsIndicator').text = 'True'
    expected.add('A1-FORMAT')
    # A-1 unknown element
    ET.SubElement(pd, f'{{{NS}}}LegacyGrossLivingArea').text = '1500'
    expected.add('A1-UNKNOWN')
    # H-1 comparison: opinion of value must be at least 1
    for e in root.iter(f'{{{NS}}}OpinionOfValueAmount'):
        e.text = '0'
    # H-1 date format
    for e in root.iter(f'{{{NS}}}AppraisalReportEffectiveDate'):
        e.text = e.text.replace('-', '/')
    return expected


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sample', required=True)
    args = ap.parse_args()
    src = Path(args.sample)
    root = anonymise(src)
    raw = ET.tostring(root, encoding='unicode')
    sig = max(re.findall(r'<ExecutionDate>(\d{4}-\d{2}-\d{2})<', raw))
    today = dt.date.fromisoformat(sig)
    rep = must(root, today)
    if rep['status'] != 'PASS':
        print(json.dumps(rep['findings'][:20], indent=1))
        raise SystemExit('synthetic pass file does not pass')
    header = (f'<?xml version="1.0" encoding="UTF-8"?>\n<!-- Synthetic UAD 3.6 URAR test file made by SpreadRun '
              f'(scripts/uad/make_fixtures.py). Every name, address, identifier and narrative value is invented. '
              f'Validate it with asOf={sig}; checked against today, the two rules on report age warn. -->\n')
    FIX.mkdir(parents=True, exist_ok=True)
    PUB.mkdir(parents=True, exist_ok=True)
    (FIX / 'uad-pass.xml').write_text(header + raw + '\n', 'utf-8')
    expected = break_it(root)
    raw_bad = ET.tostring(root, encoding='unicode')
    (FIX / 'uad-fail.xml').write_text(header + raw_bad + '\n', 'utf-8')
    bad = must(root, today)
    got = set(bad['ruleCounts'])
    missing = expected - got
    if bad['status'] != 'FAIL' or missing:
        raise SystemExit(f'fail file did not trigger {missing}')
    shutil.copy(FIX / 'uad-pass.xml', PUB / 'uad-pass.xml')
    shutil.copy(FIX / 'uad-fail.xml', PUB / 'uad-fail.xml')
    print(f'uad-pass.xml PASS as of {sig} ({(FIX / "uad-pass.xml").stat().st_size:,} bytes); '
          f'uad-fail.xml FAIL with {bad["findingCount"]} findings: {sorted(got)}')


if __name__ == '__main__':
    main()
