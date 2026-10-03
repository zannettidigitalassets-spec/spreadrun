"""Build the PBJ spec table from the CMS PBJ Data Specifications v4.10.0 package.

    python3 scripts/pbj/build_spec.py --spec-dir <folder holding the unzipped CMS downloads>

Expects, inside --spec-dir (downloaded from the CMS Staffing Data Submission PBJ page):
  nhpbj-4-10-0/nhpbj_4_10_0.xsd                                    (NHPBJ XSD File 4.10.0)
  pbj-data-specs-v4-10-0/PBJ Data Specs CSV Files (V4.10.0) .../itm_val.csv
  pbj-data-specs-v4-10-0/PBJ Data Specs HTML Files (V4.10.0) .../pe_*.html

CMS marks these materials public domain. Writes pylib/spreadrun_api/validators/pbj/spec.json: allowed values,
edit IDs with type, severity and text, and the SHA-256 of each source file; and copies the XSD next to it.
"""
import argparse
import csv
import glob
import hashlib
import html
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'pylib' / 'spreadrun_api' / 'validators' / 'pbj'


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def text(f):
    t = Path(f).read_text('utf-8', errors='replace')
    t = re.sub(r'(?is)<(script|style).*?</\1>', '', t)
    t = re.sub(r'<br\s*/?>|</(p|tr|div|h\d|li|td|th)>', '\n', t)
    t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
    return re.sub(r'\s+', ' ', t).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--spec-dir', required=True)
    d = Path(ap.parse_args().spec_dir)
    xsd = d / 'nhpbj-4-10-0' / 'nhpbj_4_10_0.xsd'
    val_csv = next(d.glob('pbj-data-specs-v4-10-0/PBJ Data Specs CSV Files*/itm_val.csv'))
    html_dir = next(p for p in d.glob('pbj-data-specs-v4-10-0/PBJ Data Specs HTML Files*') if p.is_dir())

    x = xsd.read_text('ascii')
    states = re.findall(r'<xs:enumeration value="([A-Z]{2})"', x)
    file_spec = re.search(r'fixed="([\d.]+)" name="fileSpecVersion"', x).group(1)

    rows = list(csv.DictReader(open(val_csv, encoding='latin-1')))
    vals = lambda item: {r['val_id']: r['val_txt'] for r in rows if r['itm_id'] == item}
    job_titles = {int(k): v for k, v in vals('jobTitleCode').items()}
    pay_types = {int(k): v for k, v in vals('payTypeCode').items()}
    quarters = {int(k): v for k, v in vals('reportQuarter').items()}

    edits = {}
    for f in sorted(glob.glob(str(html_dir / 'pe_[0-9]*.html'))):
        t = text(f)
        m = re.search(r'Edit Type (\w+) Severity (\w+) Edit Text (.*?) Version Notes', t)
        if not m:
            continue
        eid = '-' + Path(f).stem.split('_')[1]
        edits[eid] = {'type': m.group(1), 'severity': m.group(2), 'text': m.group(3).strip(),
                      'deleted': 'DELETED IN V4.10.0' in m.group(3)}

    spec = {
        'title': 'CMS PBJ Data Specifications', 'version': file_spec, 'published': '2026-01-16',
        'sources': {'xsd': {'file': xsd.name, 'sha256': sha(xsd)}, 'itm_val.csv': {'sha256': sha(val_csv)}},
        'stateCodes': states, 'jobTitleCodes': job_titles, 'payTypeCodes': pay_types, 'reportQuarters': quarters,
        'rnJobTitleCodes': [5, 6, 7], 'retiredFileSpecVersions': ['2.00.0', '2.00.3', '4.00.0'],
        'edits': edits,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'spec.json').write_text(json.dumps(spec, indent=1, sort_keys=True) + '\n')
    shutil.copy(xsd, OUT / xsd.name)
    print(f'PBJ {file_spec}: {len(states)} states, {len(job_titles)} job titles, {len(pay_types)} pay types, '
          f'{len(edits)} edits ({sum(1 for e in edits.values() if not e["deleted"])} active)')


if __name__ == '__main__':
    main()
