"""
Flask application factory.
Supports MySQL (production) and SQLite (demo/testing).
"""

import os
import logging
from datetime import timedelta

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.security import generate_password_hash

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def create_app(db_url: str = None) -> Flask:
    app = Flask(__name__)

    # ── Core config ───────────────────────────────────────────
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod!")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "jwt-dev-secret!")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

    # Database: SQLite for demo, MySQL for production
    if db_url:
        app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    elif os.getenv("DATABASE_URL"):
        app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    else:
        # Demo mode: SQLite in /tmp
        db_path = "/tmp/commerce_dashboard.db"
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
        logger.info(f"Using SQLite demo database: {db_path}")

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}

    # Upload settings
    app.config["UPLOAD_FOLDER"] = os.getenv("UPLOAD_FOLDER", "/tmp/commerce_uploads")
    app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024
    app.config["ALLOWED_EXTENSIONS"] = {"csv", "xlsx", "xls"}
    app.config["REPORTS_FOLDER"] = os.getenv("REPORTS_FOLDER", "/tmp/commerce_reports")

    # ── Extensions ────────────────────────────────────────────
    from extensions import db, jwt

    db.init_app(app)
    jwt.init_app(app)

    CORS(app,
         resources={r"/api/*": {"origins": "*"}},
         supports_credentials=True)

    # ── JWT error handlers ────────────────────────────────────
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"success": False, "message": "Token has expired"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"success": False, "message": "Invalid token"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"success": False, "message": "Authorization token required"}), 401

    # ── Register blueprints ───────────────────────────────────
    from api.routes import (
        auth_bp, upload_bp, dashboard_bp, sales_bp, products_bp,
        customers_bp, profit_bp, regions_bp, forecast_bp,
        reports_bp, filters_bp
    )

    for bp in [auth_bp, upload_bp, dashboard_bp, sales_bp, products_bp,
               customers_bp, profit_bp, regions_bp, forecast_bp,
               reports_bp, filters_bp]:
        app.register_blueprint(bp)

    # ── Health check ──────────────────────────────────────────
    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "Commerce Dashboard API"})

    # ── Create tables and seed data ───────────────────────────
    with app.app_context():
        db.create_all()
        _seed_data(db)

    return app


def _seed_data(db):
    """Seed admin user and sample data if tables are empty."""
    from models.models import User, Order

    # Admin user
    if not User.query.filter_by(email="admin@dashboard.com").first():
        admin = User(
            email="admin@dashboard.com",
            password_hash=generate_password_hash("Admin@123"),
            full_name="Admin User",
            role="admin",
        )
        db.session.add(admin)
        db.session.commit()
        logger.info("Created default admin user: admin@dashboard.com / Admin@123")

    # Auto-load sample data if DB is empty
    if Order.query.count() == 0:
        _load_sample_data(db)


def _load_sample_data(db):
    """Load the generated CSV sample data into the database."""
    import sys
    import os
    sys.path.insert(0, os.path.dirname(__file__) + "/../scripts")

    csv_path = os.path.join(
        os.path.dirname(__file__), "../database/sample_commerce_data.csv"
    )
    if not os.path.exists(csv_path):
        logger.warning("Sample data CSV not found — skipping auto-load")
        return

    try:
        from services.data_service import load_file, clean_dataframe, import_to_db
        from models.models import User

        logger.info("Auto-loading sample data...")
        df = load_file(csv_path)
        cleaned_df, _ = clean_dataframe(df)

        admin = User.query.filter_by(email="admin@dashboard.com").first()
        result = import_to_db(cleaned_df, "BATCH-SAMPLE", admin.id if admin else 1)
        logger.info(f"Sample data loaded: {result['imported']} orders imported")
    except Exception as e:
        logger.exception(f"Sample data load failed: {e}")


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
