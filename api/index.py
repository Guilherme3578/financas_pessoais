import sys
from pathlib import Path

# Função serverless do Vercel: expõe a API FastAPI que fica em backend/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.main import app  # noqa: E402,F401
