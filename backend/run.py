"""
Commerce Dashboard – Backend Entry Point
Run with:  python run.py
"""

import os
from dotenv import load_dotenv          # pip install python-dotenv

# Load .env if it exists (safe to skip if not present)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

import sys
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app

app = create_app()

if __name__ == "__main__":
    host  = os.getenv("HOST", "0.0.0.0")
    port  = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"

    print("=" * 56)
    print("  Commerce Analytics Dashboard – Backend")
    print("=" * 56)
    print(f"  URL  : http://{host}:{port}")
    print(f"  Debug: {debug}")
    print(f"  DB   : {os.getenv('DATABASE_URL', 'SQLite (demo)')}")
    print("=" * 56)
    print("  Default login: admin@dashboard.com / Admin@123")
    print("=" * 56)

    app.run(host=host, port=port, debug=debug)
