"""SQLAlchemy ORM models."""

from datetime import datetime
from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.Enum("admin", "analyst", "viewer"), default="analyst", nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "created_at": self.created_at.isoformat(),
        }


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship("Product", back_populates="category", lazy="dynamic")


class Region(db.Model):
    __tablename__ = "regions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(80), unique=True, nullable=False)

    orders = db.relationship("Order", back_populates="region", lazy="dynamic")


class Customer(db.Model):
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    customer_id = db.Column(db.String(20), unique=True, nullable=False)
    customer_name = db.Column(db.String(150), nullable=False)
    first_seen = db.Column(db.Date)
    last_seen = db.Column(db.Date)
    total_orders = db.Column(db.Integer, default=0)
    total_spent = db.Column(db.Numeric(14, 2), default=0)
    segment = db.Column(db.Enum("New", "Returning", "VIP", "At-Risk"), default="New")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    orders = db.relationship("Order", back_populates="customer", lazy="dynamic")


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    product_id = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    base_price = db.Column(db.Numeric(12, 2), default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = db.relationship("Category", back_populates="products")
    orders = db.relationship("Order", back_populates="product", lazy="dynamic")


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.String(20), unique=True, nullable=False)
    order_date = db.Column(db.Date, nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.SmallInteger, default=1)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False)
    cost = db.Column(db.Numeric(12, 2), nullable=False)
    revenue = db.Column(db.Numeric(12, 2), nullable=False)
    profit = db.Column(db.Numeric(12, 2), nullable=False)
    region_id = db.Column(db.Integer, db.ForeignKey("regions.id"), nullable=False)
    state = db.Column(db.String(80), nullable=False)
    city = db.Column(db.String(80), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    upload_batch = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    customer = db.relationship("Customer", back_populates="orders")
    product = db.relationship("Product", back_populates="orders")
    region = db.relationship("Region", back_populates="orders")


class UploadBatch(db.Model):
    __tablename__ = "upload_batches"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    batch_id = db.Column(db.String(50), unique=True, nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer)
    total_rows = db.Column(db.Integer, default=0)
    imported_rows = db.Column(db.Integer, default=0)
    skipped_rows = db.Column(db.Integer, default=0)
    status = db.Column(db.Enum("processing", "completed", "failed"), default="processing")
    error_log = db.Column(db.Text)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            "batch_id": self.batch_id,
            "file_name": self.file_name,
            "file_size": self.file_size,
            "total_rows": self.total_rows,
            "imported_rows": self.imported_rows,
            "skipped_rows": self.skipped_rows,
            "status": self.status,
            "error_log": self.error_log,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class Report(db.Model):
    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    report_type = db.Column(db.Enum("pdf", "excel"), nullable=False)
    parameters = db.Column(db.JSON)
    file_path = db.Column(db.String(500))
    generated_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "report_type": self.report_type,
            "parameters": self.parameters,
            "created_at": self.created_at.isoformat(),
        }
