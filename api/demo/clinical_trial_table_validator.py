# POST /api/demo/clinical-trial-table-validator  (demo)
# Thin entrypoint. All logic: pylib/spreadrun_api/handler.py
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'pylib'))

from spreadrun_api.handler import make_handler  # noqa: E402

# Vercel detects Python functions statically and needs a literal `class handler(...)`.
class handler(make_handler('clinical-trial-table-validator', 'demo')):
    pass
