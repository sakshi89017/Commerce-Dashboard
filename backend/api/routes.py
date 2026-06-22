"""
All Flask API blueprints.
auth, upload, dashboard, sales, products, customers, profit, regions, forecast, reports
"""

import os
import uuid
import logging
from datetime import datetime
from functools import wraps

from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import io

from extensions import db
from models.models import User, UploadBatch, Report

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in current_app.config["ALLOWED_EXTENSIONS"]
    )


def success(data=None, message="Success", status=200):
    return jsonify({"success": True, "message": message, "data": data}), status


def error(message="An error occurred", status=400, details=None):
    resp = {"success": False, "message": message}
    if details:
        resp["details"] = details
    return jsonify(resp), status


def require_roles(*roles):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            uid = get_jwt_identity()
            user = User.query.get(int(uid))
            if not user or user.role not in roles:
                return error("Insufficient permissions", 403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# ──────────────────────────────────────────────────────────────
# AUTH
# ──────────────────────────────────────────────────────────────

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    full_name = (data.get("full_name") or "").strip()

    if not email or not password or not full_name:
        return error("email, password, and full_name are required")

    if len(password) < 8:
        return error("Password must be at least 8 characters")

    if User.query.filter_by(email=email).first():
        return error("Email already registered", 409)

    user = User(
        email=email,
        password_hash=generate_password_hash(password),
        full_name=full_name,
        role="analyst",
    )
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return success({
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token,
    }, "Registration successful", 201)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return error("email and password are required")

    user = User.query.filter_by(email=email, is_active=True).first()
    if not user or not check_password_hash(user.password_hash, password):
        return error("Invalid credentials", 401)

    user.last_login = datetime.utcnow()
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return success({
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token,
    }, "Login successful")


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    uid = get_jwt_identity()
    access_token = create_access_token(identity=str(uid))
    return success({"access_token": access_token})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    uid = get_jwt_identity()
    user = User.query.get(int(uid))
    if not user:
        return error("User not found", 404)
    return success(user.to_dict())


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    uid = get_jwt_identity()
    user = User.query.get(int(uid))
    data = request.get_json(silent=True) or {}

    if not check_password_hash(user.password_hash, data.get("current_password", "")):
        return error("Current password is incorrect", 401)

    new_pw = data.get("new_password", "")
    if len(new_pw) < 8:
        return error("New password must be at least 8 characters")

    user.password_hash = generate_password_hash(new_pw)
    db.session.commit()
    return success(message="Password changed successfully")


# ──────────────────────────────────────────────────────────────
# UPLOAD
# ──────────────────────────────────────────────────────────────

upload_bp = Blueprint("upload", __name__, url_prefix="/api/upload")


@upload_bp.route("", methods=["POST"])
@jwt_required()
def upload_file():
    from services.data_service import load_file, clean_dataframe, import_to_db

    uid = get_jwt_identity()

    if "file" not in request.files:
        return error("No file part in request")

    file = request.files["file"]
    if not file.filename:
        return error("No file selected")

    if not allowed_file(file.filename):
        return error("Only CSV, XLSX, and XLS files are supported")

    filename = secure_filename(file.filename)
    upload_dir = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_dir, exist_ok=True)

    batch_id = f"BATCH-{uuid.uuid4().hex[:12].upper()}"
    save_path = os.path.join(upload_dir, f"{batch_id}_{filename}")
    file.save(save_path)

    file_size = os.path.getsize(save_path)

    batch = UploadBatch(
        batch_id=batch_id,
        file_name=filename,
        file_size=file_size,
        uploaded_by=int(uid),
        status="processing",
    )
    db.session.add(batch)
    db.session.commit()

    try:
        df = load_file(save_path)
        cleaned_df, clean_report = clean_dataframe(df)

        import_result = import_to_db(cleaned_df, batch_id, uid)

        batch.total_rows = clean_report["original_rows"]
        batch.imported_rows = import_result["imported"]
        batch.skipped_rows = import_result["skipped"] + clean_report.get("dropped_total", 0)
        batch.status = "completed"
        batch.completed_at = datetime.utcnow()
        if import_result.get("errors"):
            batch.error_log = "\n".join(import_result["errors"][:10])

    except Exception as e:
        logger.exception("Upload processing failed")
        batch.status = "failed"
        batch.error_log = str(e)[:500]
        db.session.commit()
        try:
            os.remove(save_path)
        except Exception:
            pass
        return error(f"Processing failed: {str(e)}", 500)

    db.session.commit()
    try:
        os.remove(save_path)
    except Exception:
        pass

    return success({
        "batch": batch.to_dict(),
        "clean_report": clean_report,
        "import_result": {
            "imported": import_result["imported"],
            "skipped": import_result["skipped"],
        }
    }, "Upload processed successfully", 201)


@upload_bp.route("/batches", methods=["GET"])
@jwt_required()
def list_batches():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    q = UploadBatch.query.order_by(UploadBatch.created_at.desc())
    total = q.count()
    batches = q.offset((page - 1) * per_page).limit(per_page).all()

    return success({
        "batches": [b.to_dict() for b in batches],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    })


# ──────────────────────────────────────────────────────────────
# DASHBOARD
# ──────────────────────────────────────────────────────────────

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.route("", methods=["GET"])
@jwt_required()
def dashboard():
    from services.analytics_service import (
        get_kpis, get_sales_trend, get_product_analytics,
        get_customer_analytics, get_regional_analytics,
        generate_insights, get_filter_options
    )

    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    category = request.args.get("category")
    region = request.args.get("region")

    try:
        kpis = get_kpis(start_date, end_date, category, region)
        sales_trend = get_sales_trend("monthly", start_date, end_date, category, region)
        product_data = get_product_analytics(10, "revenue", start_date, end_date)
        customer_data = get_customer_analytics(start_date, end_date)
        regional_data = get_regional_analytics(start_date, end_date)
        insights = generate_insights(kpis, sales_trend, product_data, regional_data)
        filters = get_filter_options()

        return success({
            "kpis": kpis,
            "sales_trend": sales_trend,
            "product_data": product_data,
            "customer_data": customer_data,
            "regional_data": regional_data,
            "insights": insights,
            "filters": filters,
        })
    except Exception as e:
        logger.exception("Dashboard error")
        return error(str(e), 500)


# ──────────────────────────────────────────────────────────────
# SALES
# ──────────────────────────────────────────────────────────────

sales_bp = Blueprint("sales", __name__, url_prefix="/api/sales")


@sales_bp.route("", methods=["GET"])
@jwt_required()
def sales():
    from services.analytics_service import get_sales_trend

    period = request.args.get("period", "monthly")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    category = request.args.get("category")
    region = request.args.get("region")

    try:
        trend = get_sales_trend(period, start_date, end_date, category, region)
        return success(trend)
    except Exception as e:
        return error(str(e), 500)


# ──────────────────────────────────────────────────────────────
# PRODUCTS
# ──────────────────────────────────────────────────────────────

products_bp = Blueprint("products", __name__, url_prefix="/api/products")


@products_bp.route("", methods=["GET"])
@jwt_required()
def products():
    from services.analytics_service import get_product_analytics

    limit = request.args.get("limit", 10, type=int)
    sort_by = request.args.get("sort_by", "revenue")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    try:
        data = get_product_analytics(limit, sort_by, start_date, end_date)
        return success(data)
    except Exception as e:
        return error(str(e), 500)


# ──────────────────────────────────────────────────────────────
# CUSTOMERS
# ──────────────────────────────────────────────────────────────

customers_bp = Blueprint("customers", __name__, url_prefix="/api/customers")


@customers_bp.route("", methods=["GET"])
@jwt_required()
def customers():
    from services.analytics_service import get_customer_analytics

    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    try:
        data = get_customer_analytics(start_date, end_date)
        return success(data)
    except Exception as e:
        return error(str(e), 500)


# ──────────────────────────────────────────────────────────────
# PROFIT
# ──────────────────────────────────────────────────────────────

profit_bp = Blueprint("profit", __name__, url_prefix="/api/profit")


@profit_bp.route("", methods=["GET"])
@jwt_required()
def profit():
    from services.analytics_service import get_profit_analytics

    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    try:
        data = get_profit_analytics(start_date, end_date)
        return success(data)
    except Exception as e:
        return error(str(e), 500)


# ──────────────────────────────────────────────────────────────
# REGIONS
# ──────────────────────────────────────────────────────────────

regions_bp = Blueprint("regions", __name__, url_prefix="/api/regions")


@regions_bp.route("", methods=["GET"])
@jwt_required()
def regions():
    from services.analytics_service import get_regional_analytics

    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    try:
        data = get_regional_analytics(start_date, end_date)
        return success(data)
    except Exception as e:
        return error(str(e), 500)


# ──────────────────────────────────────────────────────────────
# FORECAST
# ──────────────────────────────────────────────────────────────

forecast_bp = Blueprint("forecast", __name__, url_prefix="/api/forecast")


@forecast_bp.route("", methods=["GET"])
@jwt_required()
def forecast():
    from services.analytics_service import get_forecast

    days = request.args.get("days", 30, type=int)

    try:
        data = get_forecast(days)
        return success(data)
    except Exception as e:
        return error(str(e), 500)


# ──────────────────────────────────────────────────────────────
# REPORTS
# ──────────────────────────────────────────────────────────────

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


@reports_bp.route("/excel", methods=["GET"])
@jwt_required()
def download_excel():
    from services.analytics_service import (
        get_kpis, get_sales_trend, get_product_analytics, get_customer_analytics
    )
    from services.report_service import generate_excel_report

    uid = get_jwt_identity()
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    try:
        kpis = get_kpis(start_date, end_date)
        sales = get_sales_trend("monthly", start_date, end_date)
        products = get_product_analytics(20, "revenue", start_date, end_date)
        customers = get_customer_analytics(start_date, end_date)

        excel_bytes = generate_excel_report(kpis, sales, products, customers)

        report = Report(
            title=f"Commerce Report {datetime.now().strftime('%Y-%m-%d')}",
            report_type="excel",
            parameters={"start_date": start_date, "end_date": end_date},
            generated_by=int(uid),
        )
        db.session.add(report)
        db.session.commit()

        return send_file(
            io.BytesIO(excel_bytes),
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=f"commerce_report_{datetime.now().strftime('%Y%m%d')}.xlsx",
        )
    except Exception as e:
        logger.exception("Excel report error")
        return error(str(e), 500)


@reports_bp.route("/pdf", methods=["GET"])
@jwt_required()
def download_pdf():
    from services.analytics_service import (
        get_kpis, get_sales_trend, get_product_analytics,
        get_regional_analytics, generate_insights
    )
    from services.report_service import generate_pdf_report

    uid = get_jwt_identity()
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    try:
        kpis = get_kpis(start_date, end_date)
        sales = get_sales_trend("monthly", start_date, end_date)
        products = get_product_analytics(10, "revenue", start_date, end_date)
        regional = get_regional_analytics(start_date, end_date)
        insights = generate_insights(kpis, sales, products, regional)

        pdf_bytes = generate_pdf_report(kpis, sales, products, insights)

        report = Report(
            title=f"Commerce PDF Report {datetime.now().strftime('%Y-%m-%d')}",
            report_type="pdf",
            parameters={"start_date": start_date, "end_date": end_date},
            generated_by=int(uid),
        )
        db.session.add(report)
        db.session.commit()

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"commerce_report_{datetime.now().strftime('%Y%m%d')}.pdf",
        )
    except Exception as e:
        logger.exception("PDF report error")
        return error(str(e), 500)


@reports_bp.route("/history", methods=["GET"])
@jwt_required()
def report_history():
    uid = get_jwt_identity()
    reports = Report.query.filter_by(generated_by=uid).order_by(Report.created_at.desc()).limit(20).all()
    return success([r.to_dict() for r in reports])


# ──────────────────────────────────────────────────────────────
# FILTERS
# ──────────────────────────────────────────────────────────────

filters_bp = Blueprint("filters", __name__, url_prefix="/api/filters")


@filters_bp.route("", methods=["GET"])
@jwt_required()
def get_filters():
    from services.analytics_service import get_filter_options
    try:
        return success(get_filter_options())
    except Exception as e:
        return error(str(e), 500)
