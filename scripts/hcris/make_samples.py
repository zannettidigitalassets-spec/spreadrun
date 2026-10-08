"""Writes the HCRIS pre-audit sample packages in public/samples/ and prints their SHA-256 hashes for DEMO_SAMPLES.
Run from the repo root:  python3.12 scripts/hcris/make_samples.py

Each package is a .zip with an ECR file and the Exhibit 2A, 3B and 3C listings. The ECR file carries the amounts of
a real cost report from the CMS HCRIS dataset (HOSP10FY2024, pylib/tests/fixtures/hcris/844286.csv.gz) with the
hospital's name, address and CCN replaced. The listings are invented and de-identified: no names, no MBIs, account
numbers made up, and they add up to what the cost report claims. They follow the input contract: pseudonymous account
IDs, the patient name and MBI columns deleted, Y for dual eligibility, and every date shifted by SHIFT days. The demo
sends the period shifted by the same SHIFT.

The free demo accepts these files only, byte for byte, so after regenerating them update DEMO_SAMPLES in
pylib/spreadrun_api/validators/hcris/engine.py (test_hcris.py checks the two agree)."""
import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pylib' / 'tests'))
import hcris_build as hb  # noqa: E402

OUT = ROOT / 'public' / 'samples'
SOURCE = '844286'
CCN = '999208'
NAME = 'SAMPLE COMMUNITY HOSPITAL'
SHIFT = -1000   # days; any number works, as long as the period moves by the same number
PERIOD = ('2021-09-05', '2022-09-04')   # the sample period, 2024-06-01 to 2025-05-31, shifted by SHIFT
AS_OF = '2025-10-15'


def clean():
    fx = hb.load_fixture(SOURCE)
    listings = hb.listings_for(fx, ccn=CCN, name=NAME, shift=SHIFT)
    ecr = hb.ecr_from_hcris(fx, ccn=CCN, name=NAME)
    return fx, listings, ecr


def errors():
    """Planted problems, one of each kind the report checks."""
    fx = hb.load_fixture(SOURCE)
    v = hb.amounts(fx)
    # 1. Worksheet S-10, Part I, line 30 keyed $12,000 high, and line 31 carried from it.
    l30 = v[('S100001', '03000', '00100')] + 12000
    l31 = v[('S100001', '03100', '00100')] + 12000
    # 2. Worksheet B, Part I, column 0, line 60 (laboratory) does not carry Worksheet A, column 7.
    b060 = v[('B000001', '06000', '00000')] + 5000
    ecr = hb.ecr_from_hcris(fx, ccn=CCN, name=NAME, override={('S100001', '03000', '00100'): l30,
                                                              ('S100001', '03100', '00100'): l31,
                                                              ('B000001', '06000', '00000'): b060})
    listings = hb.listings_for(fx, ccn=CCN, name=NAME, shift=SHIFT)
    ip = listings['2A-IP'][2]
    plain = sorted((r for r in ip if not r['medicaid']), key=lambda r: -r['allowable'])
    # 3. A bad debt written off 60 days after the first bill (the bill went out late; the write-off date is unchanged).
    plain[0]['first_bill'] = plain[0]['mcr_wo'] - hb.dt.timedelta(days=60)
    # 4. A bad debt larger than the deductible and coinsurance it comes from.
    plain[1]['coinsurance'] = round(max(0.0, plain[1]['coinsurance'] - 150.0), 2)
    plain[1]['deductible'] = round(plain[1]['allowable'] - plain[1]['coinsurance'] - 150.0, 2)
    # 5. The same account listed twice on Exhibit 3C (split into two rows with the same dates of service).
    bd = listings['3C'][2]
    bd[5]['acct'], bd[5]['from'], bd[5]['to'] = bd[4]['acct'], bd[4]['from'], bd[4]['to']
    # 6. Exhibit 3B (both CCNs) left out of the package: see leave_out below.
    return fx, listings, ecr


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for name, make, leave_out in (('hcris-sample-clean', clean, ()), ('hcris-sample-errors', errors, ('3B', '3B-COMP'))):
        fx, listings, ecr = make()
        body = hb.build_package(fx, listings, ecr=ecr, ccn=CCN, leave_out=leave_out)
        (OUT / f'{name}.zip').write_bytes(body)
        print(f"    '{hashlib.sha256(body).hexdigest()}': '{name}',  # {len(body)} bytes")
