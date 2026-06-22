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
    import signal
    import atexit
    
    host  = os.getenv("HOST", "0.0.0.0")
    port  = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    workers = int(os.getenv("WORKERS", 1))

    print("=" * 56)
    print("  Commerce Analytics Dashboard – Backend")
    print("=" * 56)
    print(f"  URL  : http://{host}:{port}")
    print(f"  Debug: {debug}")
    print(f"  DB   : {os.getenv('DATABASE_URL', 'SQLite (demo)')}")
    print(f"  Workers: {workers}")
    print("=" * 56)
    print("  Default login: admin@dashboard.com / Admin@123")
    print("  Health check: GET /api/health")
    print("=" * 56)
    print()

    def shutdown_handler(signum, frame):
        print("\n[INFO] Shutting down gracefully...")
        exit(0)

    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)
    atexit.register(lambda: print("[INFO] Backend stopped."))

    # Run with Werkzeug development server (use gunicorn/waitress for production)
    try:
        app.run(host=host, port=port, debug=debug, threaded=True)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"[ERROR] Port {port} is already in use.")
            print(f"[TIP] Kill the process or use: lsof -ti:{port} | xargs kill -9")
            exit(1)
        raise
