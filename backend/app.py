"""
Flask application factory.
Supports MySQL (production) and SQLite (demo/testing).
"""

import os
import logging
from datetime import timedelta, date

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.security import generate_password_hash
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text

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

    # Database: SQLite for demo, MySQL/Postgres for production
    if db_url:
        app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    elif os.getenv("DATABASE_URL"):
        # Render/Heroku fix: postgres:// -> postgresql://
        db_url = os.getenv("DATABASE_URL")
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    else:
        # Demo mode: SQLite in current directory instead of /tmp
        db_path = "commerce_dashboard.db"
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
        logger.info(f"Using SQLite demo database: {db_path}")

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}

    # Upload settings
    app.config["UPLOAD_FOLDER"] = os.getenv("UPLOAD_FOLDER", "uploads")
    app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024
    app.config["ALLOWED_EXTENSIONS"] = {"csv", "xlsx", "xls"}
    app.config["REPORTS_FOLDER"] = os.getenv("REPORTS_FOLDER", "reports")

    # ── Extensions ────────────────────────────────────────────
    from extensions import db, jwt

    db.init_app(app)
    jwt.init_app(app)

    origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:5173").split(",")
    CORS(app,
         resources={r"/api/*": {"origins": origins}},
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

    # ── Error handlers ────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "message": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        logger.exception(f"Server error: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.exception(f"Unhandled exception: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

    # ── Health check ──────────────────────────────────────────
    @app.route("/api/health")
    def health():
        try:
            # SQLAlchemy 2.0+ requires text() for raw SQL
            db.session.execute(text("SELECT 1"))
            db.session.commit()
            return jsonify({
                "status": "ok",
                "service": "Commerce Dashboard API",
                "database": "connected"
            }), 200
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return jsonify({
                "status": "error",
                "service": "Commerce Dashboard API",
                "database": "disconnected",
                "error": str(e)
            }), 503

    # ── TEMP SEED ROUTE - DELETE AFTER USE ────────────────────
    @app.route("/api/seed", methods=["POST"])
    def seed_database():
        """One-time route to populate DB. DELETE AFTER RUNNING ONCE."""
        try:
            from extensions import db
            from models.models import Order
            if Order.query.count() > 0:
                return jsonify({
                    "success": False,
                    "message": "Database already has data. Delete this route."
                }), 400

            _load_sample_data_manual(db)
            return jsonify({
                "success": True,
                "message": "Demo data created: 500 orders, 20 customers, 10 products"
            }), 201
        except Exception as e:
            logger.exception(f"Seed failed: {e}")
            return jsonify({"success": False, "message": str(e)}), 500

    # ── Create tables and seed data ───────────────────────────
    with app.app_context():
        db.create_all()
        _seed_data(db)

    # ── Manual seed command ───────────────────────────────────
    @app.cli.command("seed")
    def seed():
        """Flask CLI command to seed database. Run: flask seed"""
        from extensions import db
        _load_sample_data_manual(db)
        print("✅ Seeded 500 orders, 20 customers, 10 products")

    return app

def _seed_data(db):
    """Seed admin user and sample data if tables are empty."""
    from models.models import User, Order

    # Admin user - wrapped to handle gunicorn worker race conditions
    try:
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
        else:
            logger.info("Admin user already exists, skipping creation")
    except IntegrityError:
        db.session.rollback()
        logger.info("Admin user already exists - caught IntegrityError from concurrent worker")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Failed to seed admin user: {e}")

    # Auto-load sample data if DB is empty
    try:
        if Order.query.count() == 0:
            _load_sample_data(db)
    except Exception as e:
        logger.exception(f"Sample data check failed: {e}")

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

def _load_sample_data_manual(db):
    """Create demo data directly in database without CSV."""
    from datetime import timedelta
    import random
    from models.models import Category, Region, Customer, Product, Order

    logger.info("Creating demo data...")
    try:
        # Categories
        categories = {}
        for name in ["Electronics", "Clothing", "Books", "Sports"]:
            existing = Category.query.filter_by(name=name).first()
            if existing:
                categories[name] = existing
            else:
                cat = Category(name=name)
                db.session.add(cat)
                db.session.flush()
                categories[name] = cat

        # Regions
        regions = {}
        for name in ["North", "South", "East", "West"]:
            existing = Region.query.filter_by(name=name).first()
            if existing:
                regions[name] = existing
            else:
                reg = Region(name=name)
                db.session.add(reg)
                db.session.flush()
                regions[name] = reg

        db.session.commit()

        # Customers
        customers = []
        for i in range(1, 21):
            customer_id = f"CUST{i:03}"
            cust = Customer.query.filter_by(customer_id=customer_id).first()
            if not cust:
                cust = Customer(
                    customer_id=customer_id,
                    customer_name=f"Customer {i}",
                    segment="Regular",
                )
                db.session.add(cust)
                db.session.flush()
            customers.append(cust)
        db.session.commit()

        # Products
        products = []
        category_list = list(categories.values())
        for i in range(1, 11):
            product_id = f"PROD{i:03}"
            prod = Product.query.filter_by(product_id=product_id).first()
            if not prod:
                prod = Product(
                    product_id=product_id,
                    name=f"Product {i}",
                    category_id=random.choice(category_list).id,
                    base_price=random.randint(500, 5000),
                )
                db.session.add(prod)
                db.session.flush()
            products.append(prod)
        db.session.commit()

        # Orders - 500 Demo Orders
        region_list = list(regions.values())
        for i in range(1, 501):
            order_id = f"ORD{i:05}"
            existing_order = Order.query.filter_by(order_id=order_id).first()
            if existing_order:
                continue

            customer = random.choice(customers)
            product = random.choice(products)
            region = random.choice(region_list)
            quantity = random.randint(1, 5)
            price = float(product.base_price)
            revenue = quantity * price
            cost = revenue * 0.70
            profit = revenue - cost

            order = Order(
                order_id=order_id,
                order_date=date.today() - timedelta(days=random.randint(0, 365)),
                customer_id=customer.id,
                product_id=product.id,
                quantity=quantity,
                unit_price=price,
                revenue=revenue,
                cost=cost,
                profit=profit,
                region_id=region.id,
                state="Demo State",
                city="Demo City",
                payment_method="UPI",
                upload_batch="DEMO-DATA",
            )
            db.session.add(order)
            if i % 100 == 0:
                db.session.commit()
        db.session.commit()
        logger.info("Demo data created successfully: 500 orders")
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Failed creating demo data: {e}")

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
    
