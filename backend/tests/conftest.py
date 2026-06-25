import os
import sys
import pytest

# Add the backend directory to sys.path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from extensions import db as _db
from models.models import User

@pytest.fixture(scope="session")
def app():
    # Use in-memory SQLite for testing to avoid overwriting production/development DBs
    app = create_app("sqlite:///:memory:")
    app.config.update({
        "TESTING": True,
        "JWT_SECRET_KEY": "test-jwt-secret",
        "SECRET_KEY": "test-secret",
        "UPLOAD_FOLDER": os.path.join(os.path.dirname(__file__), "test_uploads"),
        "REPORTS_FOLDER": os.path.join(os.path.dirname(__file__), "test_reports"),
    })

    # Create directories if they don't exist
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["REPORTS_FOLDER"], exist_ok=True)

    with app.app_context():
        # Manually run full seed data for unit tests
        from app import _seed_data
        _seed_data(_db)
        yield app

    # Cleanup temp test directories
    import shutil
    if os.path.exists(app.config["UPLOAD_FOLDER"]):
        shutil.rmtree(app.config["UPLOAD_FOLDER"])
    if os.path.exists(app.config["REPORTS_FOLDER"]):
        shutil.rmtree(app.config["REPORTS_FOLDER"])

@pytest.fixture(scope="function")
def client(app):
    return app.test_client()

@pytest.fixture(scope="function")
def db(app):
    with app.app_context():
        yield _db
        # Rollback in case of pending transaction errors
        _db.session.rollback()

@pytest.fixture(scope="function")
def admin_token(client, app):
    """Generate JWT auth token for default admin user."""
    response = client.post("/api/auth/login", json={
        "email": "admin@dashboard.com",
        "password": "Admin@123"
    })
    return response.json["data"]["access_token"]

@pytest.fixture(scope="function")
def auth_headers(admin_token):
    return {
        "Authorization": f"Bearer {admin_token}"
    }
