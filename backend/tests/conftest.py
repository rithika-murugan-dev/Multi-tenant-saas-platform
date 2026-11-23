import sys
from pathlib import Path

# Ensure the app module can be discovered by pytest
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
