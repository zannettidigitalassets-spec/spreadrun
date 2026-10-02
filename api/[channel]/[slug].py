# POST /api/v1/<api>    paid (API key or signed-in session)
# POST /api/demo/<api>  free demo
# One dynamic route serves every validator in both modes, so new validators cost no extra
# serverless function (Vercel Hobby allows 12). All logic: pylib/spreadrun_api/handler.py
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'pylib'))

from spreadrun_api.handler import Dispatcher  # noqa: E402


# Vercel detects Python functions statically and needs a literal `class handler(...)`.
class handler(Dispatcher):
    pass
