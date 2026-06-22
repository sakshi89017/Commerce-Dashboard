"""
Data cleaning, validation, and import service.
Handles CSV/Excel uploads, cleans data, and persists to MySQL.
"""

import uuid
import logging
import re
from datetime import datetime
from typing import Dict, Tuple

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = {
    "Order_ID", "Order_Date", "Customer_ID", "Customer_Name",
    "Product_ID", "Product_Name", "Category", "Quantity",
    "Price", "Cost", "Revenue", "Profit",
    "Region", "State", "City", "Payment_Method"
}

VALID_CATEGORIES = {"Electronics", "Clothing", "Home & Kitchen", "Books", "Sports", "Beauty"}
VALID_REGIONS = {"North", "South", "East", "West"}
VALID_PAYMENTS = {"Credit Card", "Debit Card", "UPI", "Net Banking", "Cash on Delivery", "EMI"}


def _normalise_str(s: str, options: set) -> str:
    """Case-insensitive match against known options; return best match or original."""
    s = str(s).strip()
    for opt in options:
        if opt.lower() == s.lower():
            return opt
    return s


def clean_dataframe(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """
    Full cleaning pipeline.
    Returns (cleaned_df, report_dict).
    """
    report = {
        "original_rows": len(df),
        "issues": [],
    }

    # ── 1. Normalise column names ─────────────────────────────
    def _norm_col(c):
        c = c.strip().replace(" ", "_")
        # Title-case each word but preserve _ID, _Date etc.
        parts = c.split("_")
        titled = "_".join(p.capitalize() for p in parts)
        # Fix common suffix casing
        titled = titled.replace("_Id", "_ID").replace("_Date", "_Date")
        return titled

    df.columns = [_norm_col(c) for c in df.columns]
    # Map common aliases
    col_aliases = {
        "Unit_Price": "Price",
        "Order_Amount": "Revenue",
        "Product_Category": "Category",
        "Payment": "Payment_Method",
        "Customer": "Customer_Name",
    }
    df.rename(columns=col_aliases, inplace=True)

    # ── 2. Missing required columns ───────────────────────────
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")

    # ── 3. Drop fully empty rows ──────────────────────────────
    before = len(df)
    df.dropna(how="all", inplace=True)
    dropped_empty = before - len(df)
    if dropped_empty:
        report["issues"].append(f"Removed {dropped_empty} fully empty rows")

    # ── 4. Remove duplicates on Order_ID ─────────────────────
    before = len(df)
    df.drop_duplicates(subset=["Order_Id"] if "Order_Id" in df.columns else ["Order_ID"], inplace=True)
    # Also try normalised
    oid_col = "Order_ID" if "Order_ID" in df.columns else "Order_Id"
    before = len(df)
    df.drop_duplicates(subset=[oid_col], inplace=True)
    dropped_dup = before - len(df)
    if dropped_dup:
        report["issues"].append(f"Removed {dropped_dup} duplicate Order_IDs")

    # ── 5. Coerce numeric columns ─────────────────────────────
    num_cols = ["Quantity", "Price", "Cost", "Revenue", "Profit"]
    for col in num_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col].astype(str).str.replace(r"[₹,$,€,£,\s]", "", regex=True), errors="coerce")

    # Drop rows with non-parseable numerics
    before = len(df)
    df.dropna(subset=num_cols, inplace=True)
    dropped_num = before - len(df)
    if dropped_num:
        report["issues"].append(f"Removed {dropped_num} rows with invalid numeric values")

    # ── 6. Validate business rules ────────────────────────────
    before = len(df)
    df = df[df["Quantity"].astype(float) > 0]
    df = df[df["Price"].astype(float) > 0]
    dropped_biz = before - len(df)
    if dropped_biz:
        report["issues"].append(f"Removed {dropped_biz} rows with zero/negative price or quantity")

    # ── 7. Recalculate Revenue & Profit if suspicious ─────────
    df["Revenue"] = df["Revenue"].astype(float)
    df["Cost"] = df["Cost"].astype(float)
    df["Profit"] = df["Revenue"] - df["Cost"]

    # ── 8. Parse dates ────────────────────────────────────────
    date_col = "Order_Date"
    df[date_col] = pd.to_datetime(df[date_col], format="mixed", errors="coerce")
    before = len(df)
    df.dropna(subset=[date_col], inplace=True)
    dropped_date = before - len(df)
    if dropped_date:
        report["issues"].append(f"Removed {dropped_date} rows with unparseable dates")

    # ── 9. Normalise categorical columns ─────────────────────
    df["Category"] = df["Category"].apply(lambda x: _normalise_str(x, VALID_CATEGORIES))
    df["Region"] = df["Region"].apply(lambda x: _normalise_str(x, VALID_REGIONS))
    df["Payment_Method"] = df["Payment_Method"].apply(lambda x: _normalise_str(x, VALID_PAYMENTS))

    # ── 10. Strip whitespace from string columns ──────────────
    str_cols = ["Customer_Name", "Product_Name", "Category", "Region", "State", "City", "Payment_Method"]
    for col in str_cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.title()

    # Fix category casing (Title case breaks "Home & Kitchen")
    df["Category"] = df["Category"].replace({
        "Home & Kitchen": "Home & Kitchen",
        "Home &Amp; Kitchen": "Home & Kitchen",
    })

    report["cleaned_rows"] = len(df)
    report["dropped_total"] = report["original_rows"] - len(df)
    return df, report


def load_file(filepath: str) -> pd.DataFrame:
    """Load CSV or Excel into a DataFrame."""
    ext = filepath.rsplit(".", 1)[-1].lower()
    if ext == "csv":
        # Try multiple encodings
        for enc in ("utf-8", "latin-1", "cp1252"):
            try:
                return pd.read_csv(filepath, encoding=enc)
            except UnicodeDecodeError:
                continue
        raise ValueError("Could not decode CSV file")
    elif ext in ("xlsx", "xls"):
        return pd.read_excel(filepath)
    else:
        raise ValueError(f"Unsupported file type: .{ext}")


def import_to_db(df: pd.DataFrame, batch_id: str, user_id: int) -> Dict:
    """
    Persist cleaned DataFrame to MySQL via SQLAlchemy.
    Returns import summary.
    """
    # Import here to avoid circular imports
    from extensions import db
    from models.models import (
        Category, Region, Customer, Product, Order, UploadBatch
    )

    imported = 0
    skipped = 0
    errors = []

    # Cache lookups
    category_cache: Dict[str, int] = {}
    region_cache: Dict[str, int] = {}
    customer_cache: Dict[str, int] = {}
    product_cache: Dict[str, int] = {}

    def get_or_create_category(name: str) -> int:
        if name not in category_cache:
            cat = Category.query.filter_by(name=name).first()
            if not cat:
                cat = Category(name=name)
                db.session.add(cat)
                db.session.flush()
            category_cache[name] = cat.id
        return category_cache[name]

    def get_or_create_region(name: str) -> int:
        if name not in region_cache:
            reg = Region.query.filter_by(name=name).first()
            if not reg:
                reg = Region(name=name)
                db.session.add(reg)
                db.session.flush()
            region_cache[name] = reg.id
        return region_cache[name]

    def get_or_create_customer(cid: str, name: str, order_date) -> int:
        if cid not in customer_cache:
            cust = Customer.query.filter_by(customer_id=cid).first()
            if not cust:
                cust = Customer(
                    customer_id=cid,
                    customer_name=name,
                    first_seen=order_date,
                    last_seen=order_date,
                )
                db.session.add(cust)
                db.session.flush()
            customer_cache[cid] = cust.id
        return customer_cache[cid]

    def get_or_create_product(pid: str, name: str, category_id: int, price: float) -> int:
        if pid not in product_cache:
            prod = Product.query.filter_by(product_id=pid).first()
            if not prod:
                prod = Product(
                    product_id=pid,
                    name=name,
                    category_id=category_id,
                    base_price=price,
                )
                db.session.add(prod)
                db.session.flush()
            product_cache[pid] = prod.id
        return product_cache[pid]

    chunk_size = 500
    rows = df.to_dict("records")

    for i in range(0, len(rows), chunk_size):
        chunk = rows[i:i + chunk_size]
        for row in chunk:
            try:
                # Check duplicate
                existing = Order.query.filter_by(order_id=str(row.get("Order_ID", ""))).first()
                if existing:
                    skipped += 1
                    continue

                order_date = row["Order_Date"]
                if hasattr(order_date, "date"):
                    order_date = order_date.date()

                cat_id = get_or_create_category(str(row["Category"]))
                reg_id = get_or_create_region(str(row["Region"]))
                cust_id = get_or_create_customer(
                    str(row["Customer_ID"]),
                    str(row["Customer_Name"]),
                    order_date,
                )
                prod_id = get_or_create_product(
                    str(row["Product_ID"]),
                    str(row["Product_Name"]),
                    cat_id,
                    float(row["Price"]),
                )

                order = Order(
                    order_id=str(row["Order_ID"]),
                    order_date=order_date,
                    customer_id=cust_id,
                    product_id=prod_id,
                    quantity=int(row["Quantity"]),
                    unit_price=float(row["Price"]),
                    cost=float(row["Cost"]),
                    revenue=float(row["Revenue"]),
                    profit=float(row["Profit"]),
                    region_id=reg_id,
                    state=str(row["State"]).strip(),
                    city=str(row["City"]).strip(),
                    payment_method=str(row["Payment_Method"]).strip(),
                    upload_batch=batch_id,
                )
                db.session.add(order)
                imported += 1

            except Exception as e:
                skipped += 1
                errors.append(str(e))

        db.session.commit()

    # Update customer aggregates
    _update_customer_aggregates()

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:20],  # cap at 20 for readability
    }


def _update_customer_aggregates():
    """Recompute total_orders, total_spent, and segment for all customers."""
    from extensions import db
    from models.models import Customer, Order
    from sqlalchemy import func

    results = (
        db.session.query(
            Order.customer_id,
            func.count(Order.id).label("total_orders"),
            func.sum(Order.revenue).label("total_spent"),
            func.min(Order.order_date).label("first_seen"),
            func.max(Order.order_date).label("last_seen"),
        )
        .group_by(Order.customer_id)
        .all()
    )

    for r in results:
        cust = Customer.query.get(r.customer_id)
        if cust:
            cust.total_orders = r.total_orders
            cust.total_spent = float(r.total_spent or 0)
            cust.first_seen = r.first_seen
            cust.last_seen = r.last_seen
            # Segment logic
            spent = float(r.total_spent or 0)
            orders = r.total_orders
            if spent > 100000:
                cust.segment = "VIP"
            elif orders > 3:
                cust.segment = "Returning"
            else:
                cust.segment = "New"

    db.session.commit()
