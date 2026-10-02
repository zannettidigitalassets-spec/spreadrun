# POST /api/v1/hospital-mrf-validator  (paid)
# Thin entrypoint. All logic: pylib/spreadrun_api/handler.py
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'pylib'))

from spreadrun_api.handler import make_handler  # noqa: E402

handler = make_handler('hospital-mrf-validator', 'paid')
