"""Writes the three ICE sample workbooks in public/samples/ and prints their SHA-256 hashes for DEMO_SAMPLES.
Run from the repo root:  python3.12 scripts/ice/make_samples.py
The free demo accepts these files only, byte for byte, so after regenerating them update DEMO_SAMPLES in
pylib/spreadrun_api/validators/ice/engine.py (test_ice.py checks the two agree)."""
import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'pylib' / 'tests'))
import ice_build  # noqa: E402

OUT = ROOT / 'public' / 'samples'


def errors(S, n):
    # 1. Schedule G: a total that does not foot (the labor line was changed after the total was keyed).
    g = S['G']
    i, _ = ice_build.find(g, 'LABOR')
    g[i][2] += 25000
    g[i][4] += 25000
    # 2. Schedule B: professional fees corrected and the pool total updated, but Schedule A still shows the old pool.
    b = S['B']
    i, _ = ice_build.find(b, 'Professional fees')
    b[i][8] += 4000
    b[i][10] += 4000
    t, _ = ice_build.find(b, 'TOTAL GENERAL AND ADMIN EXPENSE POOL')
    b[t][8] += 4000
    b[t][10] += 4000
    # 3. Schedule C: an adjustment with no explanation.
    c = S['C']
    i, _ = ice_build.find(c, 'Supplies')
    c[i][12] = None
    # 4. Schedule N: the certificate is there but not completed.
    S['N'] = [r if not (r and len(r) > 1 and isinstance(r[1], str) and ':' in r[1] and r[1].split(':')[0] in
                       ('Signature', 'Name of Certifying Official', 'Title', 'Date of Execution'))
              else [None, r[1].split(':')[0] + ': ______________________'] for r in S['N']]


if __name__ == '__main__':
    files = {
        'ice-template-clean.xlsx': ice_build.build('dcaa'),
        'ice-own-format-clean.xlsx': ice_build.build('own'),
        'ice-errors.xlsx': ice_build.build('dcaa', mods=errors),
    }
    for name, data in files.items():
        (OUT / name).write_bytes(data)
        print(f"    '{hashlib.sha256(data).hexdigest()}': '{name[:-5]}',")
