"""
Analytics service.
All heavy SQL aggregations, trend calculations, and AI-generated insights.
"""

import logging
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from sqlalchemy import func, text, case, distinct

logger = logging.getLogger(__name__)


def _is_sqlite() -> bool:
    from extensions import db
    return "sqlite" in str(db.engine.url)


def _date_trunc(expr: str, period: str) -> str:
    """Return dialect-appropriate date truncation expression."""
    if _is_sqlite():
        fmt_map = {
            "daily": f"DATE({expr})",
            "weekly": f"DATE({expr}, 'weekday 0', '-6 days')",
            "monthly": f"STRFTIME('%Y-%m-01', {expr})",
            "yearly": f"STRFTIME('%Y-01-01', {expr})",
        }
    else:
        fmt_map = {
            "daily": f"DATE({expr})",
            "weekly": f"DATE(DATE_SUB({expr}, INTERVAL WEEKDAY({expr}) DAY))",
            "monthly": f"DATE_FORMAT({expr}, '%%Y-%%m-01')",
            "yearly": f"DATE_FORMAT({expr}, '%%Y-01-01')",
        }
    return fmt_map.get(period, fmt_map["monthly"])


def _group_by_month(expr: str) -> str:
    if _is_sqlite():
        return f"STRFTIME('%Y-%m-01', {expr})"
    return f"DATE_FORMAT({expr}, '%%Y-%%m-01')"

def _query_df(sql: str, params: dict = None) -> pd.DataFrame:
    """Run raw SQL and return a DataFrame."""
    from extensions import db
    with db.engine.connect() as conn:
        result = conn.execute(text(sql), params or {})
        rows = result.fetchall()
        cols = result.keys()
        return pd.DataFrame(rows, columns=list(cols))


# ──────────────────────────────────────────────────────────────
# DASHBOARD KPIs
# ──────────────────────────────────────────────────────────────

def get_kpis(start_date: Optional[str] = None, end_date: Optional[str] = None,
             category: Optional[str] = None, region: Optional[str] = None) -> Dict:
    """High-level KPI summary."""
    filters, params = _build_filters(start_date, end_date, category, region)
    where = ("WHERE " + " AND ".join(filters)) if filters else ""

    sql = f"""
        SELECT
            COUNT(DISTINCT o.id)          AS total_orders,
            COUNT(DISTINCT o.customer_id) AS total_customers,
            COALESCE(SUM(o.revenue), 0)   AS total_revenue,
            COALESCE(SUM(o.profit),  0)   AS total_profit,
            COALESCE(SUM(o.cost),    0)   AS total_cost,
            COALESCE(AVG(o.revenue), 0)   AS avg_order_value,
            COALESCE(SUM(o.quantity), 0)  AS total_units
        FROM orders o
        JOIN products  p  ON o.product_id  = p.id
        JOIN categories c ON p.category_id = c.id
        JOIN regions    r ON o.region_id   = r.id
        {where}
    """
    df = _query_df(sql, params)
    row = df.iloc[0]

    revenue = float(row["total_revenue"])
    cost = float(row["total_cost"])
    profit = float(row["total_profit"])
    profit_margin = (profit / revenue * 100) if revenue else 0

    # Previous period comparison
    prev = _get_prev_period_revenue(start_date, end_date, category, region)
    rev_growth = ((revenue - prev) / prev * 100) if prev else 0

    return {
        "total_orders": int(row["total_orders"]),
        "total_customers": int(row["total_customers"]),
        "total_revenue": round(revenue, 2),
        "total_profit": round(profit, 2),
        "total_cost": round(cost, 2),
        "avg_order_value": round(float(row["avg_order_value"]), 2),
        "total_units": int(row["total_units"]),
        "profit_margin": round(profit_margin, 2),
        "revenue_growth": round(rev_growth, 2),
    }


def _get_prev_period_revenue(start_date, end_date, category, region) -> float:
    if not start_date or not end_date:
        return 0
    try:
        s = date.fromisoformat(start_date)
        e = date.fromisoformat(end_date)
        delta = (e - s).days + 1
        prev_start = (s - timedelta(days=delta)).isoformat()
        prev_end = (s - timedelta(days=1)).isoformat()
        filters, params = _build_filters(prev_start, prev_end, category, region)
        where = ("WHERE " + " AND ".join(filters)) if filters else ""
        sql = f"""
            SELECT COALESCE(SUM(o.revenue), 0) AS revenue
            FROM orders o
            JOIN products p ON o.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            JOIN regions r ON o.region_id = r.id
            {where}
        """
        df = _query_df(sql, params)
        return float(df.iloc[0]["revenue"])
    except Exception:
        return 0


def _build_filters(start_date, end_date, category, region, prefix="o") -> tuple:
    filters = []
    params = {}
    if start_date:
        filters.append(f"{prefix}.order_date >= :start_date")
        params["start_date"] = start_date
    if end_date:
        filters.append(f"{prefix}.order_date <= :end_date")
        params["end_date"] = end_date
    if category:
        filters.append("c.name = :category")
        params["category"] = category
    if region:
        filters.append("r.name = :region")
        params["region"] = region
    return filters, params


# ──────────────────────────────────────────────────────────────
# SALES TRENDS
# ──────────────────────────────────────────────────────────────

def get_sales_trend(period: str = "monthly", start_date: str = None,
                    end_date: str = None, category: str = None,
                    region: str = None) -> List[Dict]:
    filters, params = _build_filters(start_date, end_date, category, region)
    where = ("WHERE " + " AND ".join(filters)) if filters else ""

    period_map = {
        "daily": _date_trunc("o.order_date", "daily"),
        "weekly": _date_trunc("o.order_date", "weekly"),
        "monthly": _date_trunc("o.order_date", "monthly"),
        "yearly": _date_trunc("o.order_date", "yearly"),
    }
    group_expr = period_map.get(period, period_map["monthly"])

    sql = f"""
        SELECT
            {group_expr}          AS period_date,
            SUM(o.revenue)        AS revenue,
            SUM(o.profit)         AS profit,
            SUM(o.cost)           AS cost,
            COUNT(DISTINCT o.id)  AS orders,
            SUM(o.quantity)       AS units
        FROM orders o
        JOIN products  p  ON o.product_id  = p.id
        JOIN categories c ON p.category_id = c.id
        JOIN regions    r ON o.region_id   = r.id
        {where}
        GROUP BY {group_expr}
        ORDER BY period_date
    """
    df = _query_df(sql, params)
    df["period_date"] = df["period_date"].astype(str)
    for col in ["revenue", "profit", "cost"]:
        df[col] = df[col].astype(float).round(2)
    return df.to_dict("records")


# ──────────────────────────────────────────────────────────────
# PRODUCT ANALYTICS
# ──────────────────────────────────────────────────────────────

def get_product_analytics(limit: int = 10, sort_by: str = "revenue",
                          start_date: str = None, end_date: str = None) -> Dict:
    filters, params = _build_filters(start_date, end_date, None, None)
    where = ("WHERE " + " AND ".join(filters)) if filters else ""

    sql = f"""
        SELECT
            p.product_id,
            p.name                          AS product_name,
            c.name                          AS category,
            SUM(o.revenue)                  AS revenue,
            SUM(o.profit)                   AS profit,
            SUM(o.quantity)                 AS units_sold,
            COUNT(DISTINCT o.id)            AS order_count,
            AVG(o.unit_price)               AS avg_price
        FROM orders o
        JOIN products   p ON o.product_id  = p.id
        JOIN categories c ON p.category_id = c.id
        {where}
        GROUP BY p.id, p.product_id, p.name, c.name
        ORDER BY {sort_by} DESC
    """
    df = _query_df(sql, params)
    for col in ["revenue", "profit", "avg_price"]:
        df[col] = df[col].astype(float).round(2)

    top_n = df.head(limit).to_dict("records")
    bottom_n = df.tail(limit).sort_values("revenue").to_dict("records")

    # Category breakdown
    cat_sql = f"""
        SELECT
            c.name              AS category,
            SUM(o.revenue)      AS revenue,
            SUM(o.profit)       AS profit,
            SUM(o.quantity)     AS units_sold,
            COUNT(DISTINCT o.id) AS order_count
        FROM orders o
        JOIN products   p ON o.product_id  = p.id
        JOIN categories c ON p.category_id = c.id
        {where}
        GROUP BY c.name
        ORDER BY revenue DESC
    """
    cat_df = _query_df(cat_sql, params)
    for col in ["revenue", "profit"]:
        cat_df[col] = cat_df[col].astype(float).round(2)

    return {
        "top_products": top_n,
        "bottom_products": bottom_n,
        "category_breakdown": cat_df.to_dict("records"),
    }


# ──────────────────────────────────────────────────────────────
# CUSTOMER ANALYTICS
# ──────────────────────────────────────────────────────────────

def get_customer_analytics(start_date: str = None, end_date: str = None) -> Dict:
    filters, params = _build_filters(start_date, end_date, None, None)
    where = ("WHERE " + " AND ".join(filters)) if filters else ""

    # Segment counts
    seg_sql = """
        SELECT segment, COUNT(*) AS count
        FROM customers
        GROUP BY segment
    """
    seg_df = _query_df(seg_sql)

    # Top customers by revenue
    top_sql = f"""
        SELECT
            cu.customer_id,
            cu.customer_name,
            cu.segment,
            SUM(o.revenue)        AS total_revenue,
            SUM(o.profit)         AS total_profit,
            COUNT(DISTINCT o.id)  AS order_count,
            MAX(o.order_date)     AS last_order_date
        FROM orders o
        JOIN customers cu ON o.customer_id = cu.id
        {where}
        GROUP BY cu.id, cu.customer_id, cu.customer_name, cu.segment
        ORDER BY total_revenue DESC
        LIMIT 20
    """
    top_df = _query_df(top_sql, params)
    for col in ["total_revenue", "total_profit"]:
        top_df[col] = top_df[col].astype(float).round(2)
    top_df["last_order_date"] = top_df["last_order_date"].astype(str)

    # Monthly new customer growth
    growth_sql = f"""
        SELECT
            {_group_by_month('MIN(o.order_date)')} AS month,
            COUNT(DISTINCT o.customer_id)           AS new_customers
        FROM orders o
        {where}
        GROUP BY o.customer_id
    """
    growth_df = _query_df(growth_sql, params)
    growth_agg = (
        growth_df.groupby("month")["new_customers"].sum()
        .reset_index()
        .sort_values("month")
    )

    # Payment method breakdown
    pay_sql = f"""
        SELECT
            o.payment_method,
            COUNT(*) AS count,
            SUM(o.revenue) AS revenue
        FROM orders o
        {where}
        GROUP BY o.payment_method
        ORDER BY count DESC
    """
    pay_df = _query_df(pay_sql, params)
    pay_df["revenue"] = pay_df["revenue"].astype(float).round(2)

    return {
        "segments": seg_df.to_dict("records"),
        "top_customers": top_df.to_dict("records"),
        "growth_trend": growth_agg.to_dict("records"),
        "payment_methods": pay_df.to_dict("records"),
        "summary": {
            "total_customers": int(seg_df["count"].sum()),
            "vip_count": int(seg_df.loc[seg_df["segment"] == "VIP", "count"].sum() if len(seg_df) else 0),
            "returning_count": int(seg_df.loc[seg_df["segment"] == "Returning", "count"].sum() if len(seg_df) else 0),
        }
    }


# ──────────────────────────────────────────────────────────────
# REGIONAL ANALYTICS
# ──────────────────────────────────────────────────────────────

def get_regional_analytics(start_date: str = None, end_date: str = None) -> Dict:
    filters, params = _build_filters(start_date, end_date, None, None)
    where = ("WHERE " + " AND ".join(filters)) if filters else ""

    region_sql = f"""
        SELECT
            r.name              AS region,
            SUM(o.revenue)      AS revenue,
            SUM(o.profit)       AS profit,
            COUNT(DISTINCT o.id) AS orders,
            COUNT(DISTINCT o.customer_id) AS customers
        FROM orders o
        JOIN regions r ON o.region_id = r.id
        {where}
        GROUP BY r.name
        ORDER BY revenue DESC
    """
    region_df = _query_df(region_sql, params)
    for col in ["revenue", "profit"]:
        region_df[col] = region_df[col].astype(float).round(2)

    state_sql = f"""
        SELECT
            o.state,
            r.name              AS region,
            SUM(o.revenue)      AS revenue,
            SUM(o.profit)       AS profit,
            COUNT(DISTINCT o.id) AS orders
        FROM orders o
        JOIN regions r ON o.region_id = r.id
        {where}
        GROUP BY o.state, r.name
        ORDER BY revenue DESC
        LIMIT 20
    """
    state_df = _query_df(state_sql, params)
    for col in ["revenue", "profit"]:
        state_df[col] = state_df[col].astype(float).round(2)

    city_sql = f"""
        SELECT
            o.city,
            o.state,
            r.name              AS region,
            SUM(o.revenue)      AS revenue,
            COUNT(DISTINCT o.id) AS orders
        FROM orders o
        JOIN regions r ON o.region_id = r.id
        {where}
        GROUP BY o.city, o.state, r.name
        ORDER BY revenue DESC
        LIMIT 15
    """
    city_df = _query_df(city_sql, params)
    city_df["revenue"] = city_df["revenue"].astype(float).round(2)

    return {
        "regions": region_df.to_dict("records"),
        "states": state_df.to_dict("records"),
        "cities": city_df.to_dict("records"),
    }


# ──────────────────────────────────────────────────────────────
# PROFIT ANALYTICS
# ──────────────────────────────────────────────────────────────

def get_profit_analytics(start_date: str = None, end_date: str = None) -> Dict:
    filters, params = _build_filters(start_date, end_date, None, None)
    where = ("WHERE " + " AND ".join(filters)) if filters else ""

    monthly_sql = f"""
        SELECT
            {_group_by_month('o.order_date')} AS month,
            SUM(o.revenue)  AS revenue,
            SUM(o.cost)     AS cost,
            SUM(o.profit)   AS profit,
            CAST(SUM(o.profit) AS FLOAT)/CAST(SUM(o.revenue) AS FLOAT)*100 AS profit_margin
        FROM orders o
        JOIN products  p ON o.product_id  = p.id
        JOIN categories c ON p.category_id = c.id
        JOIN regions   r ON o.region_id   = r.id
        {where}
        GROUP BY {_group_by_month('o.order_date')}
        ORDER BY month
    """
    monthly_df = _query_df(monthly_sql, params)
    for col in ["revenue", "cost", "profit", "profit_margin"]:
        monthly_df[col] = monthly_df[col].astype(float).round(2)
    monthly_df["month"] = monthly_df["month"].astype(str)

    cat_profit_sql = f"""
        SELECT
            c.name              AS category,
            SUM(o.revenue)      AS revenue,
            SUM(o.cost)         AS cost,
            SUM(o.profit)       AS profit,
            CAST(SUM(o.profit) AS FLOAT)/CAST(SUM(o.revenue) AS FLOAT)*100 AS profit_margin
        FROM orders o
        JOIN products   p ON o.product_id  = p.id
        JOIN categories c ON p.category_id = c.id
        JOIN regions    r ON o.region_id   = r.id
        {where}
        GROUP BY c.name
        ORDER BY profit DESC
    """
    cat_df = _query_df(cat_profit_sql, params)
    for col in ["revenue", "cost", "profit", "profit_margin"]:
        cat_df[col] = cat_df[col].astype(float).round(2)

    return {
        "monthly_trend": monthly_df.to_dict("records"),
        "category_profit": cat_df.to_dict("records"),
    }


# ──────────────────────────────────────────────────────────────
# FORECASTING
# ──────────────────────────────────────────────────────────────

def get_forecast(days: int = 30) -> Dict:
    """Linear regression + simple trend forecast for next N days."""
    try:
        from sklearn.linear_model import LinearRegression
        from sklearn.preprocessing import PolynomialFeatures

        sql = """
            SELECT
                DATE(order_date)    AS ds,
                SUM(revenue)        AS y
            FROM orders
            GROUP BY DATE(order_date)
            ORDER BY ds
        """
        df = _query_df(sql)
        if len(df) < 30:
            return {"error": "Not enough data for forecasting (need at least 30 days)"}

        df["ds"] = pd.to_datetime(df["ds"])
        df["y"] = df["y"].astype(float)
        df = df.sort_values("ds").tail(180)  # last 6 months

        # Numeric index
        df["x"] = (df["ds"] - df["ds"].min()).dt.days.values

        X = df[["x"]].values
        y = df["y"].values

        # Polynomial regression degree 2 for trend
        poly = PolynomialFeatures(degree=2)
        Xp = poly.fit_transform(X)
        model = LinearRegression()
        model.fit(Xp, y)

        # Generate future dates
        last_date = df["ds"].max()
        future_dates = [last_date + timedelta(days=i + 1) for i in range(days)]
        last_x = int(df["x"].max())
        future_x = np.array([[last_x + i + 1] for i in range(days)])
        future_Xp = poly.transform(future_x)
        preds = model.predict(future_Xp)

        # Historical actuals (last 60 days)
        hist = df.tail(60)[["ds", "y"]].copy()
        hist["ds"] = hist["ds"].dt.strftime("%Y-%m-%d")
        hist["y"] = hist["y"].round(2)

        forecast = [
            {"date": d.strftime("%Y-%m-%d"), "predicted_revenue": round(max(0, float(p)), 2)}
            for d, p in zip(future_dates, preds)
        ]

        total_forecast = sum(f["predicted_revenue"] for f in forecast)
        prev_30_revenue = float(df.tail(30)["y"].sum())
        growth = (total_forecast - prev_30_revenue) / prev_30_revenue * 100 if prev_30_revenue else 0

        return {
            "historical": hist.to_dict("records"),
            "forecast": forecast,
            "summary": {
                "forecast_total": round(total_forecast, 2),
                "prev_period_total": round(prev_30_revenue, 2),
                "expected_growth_pct": round(growth, 2),
            }
        }
    except Exception as e:
        logger.exception("Forecast error")
        return {"error": str(e)}


# ──────────────────────────────────────────────────────────────
# AI INSIGHTS
# ──────────────────────────────────────────────────────────────

def generate_insights(kpis: Dict, sales_trend: List, product_data: Dict,
                      regional_data: Dict) -> List[Dict]:
    """Rule-based business insight generation."""
    insights = []

    # Revenue growth
    growth = kpis.get("revenue_growth", 0)
    if growth > 0:
        insights.append({
            "type": "positive",
            "icon": "trending-up",
            "title": "Revenue Growth",
            "message": f"Revenue increased by {growth:.1f}% compared to the previous period. Strong momentum in sales."
        })
    elif growth < -5:
        insights.append({
            "type": "warning",
            "icon": "trending-down",
            "title": "Revenue Decline",
            "message": f"Revenue dropped by {abs(growth):.1f}% vs prior period. Consider reviewing pricing or promotions."
        })

    # Profit margin
    margin = kpis.get("profit_margin", 0)
    if margin > 45:
        insights.append({
            "type": "positive",
            "icon": "dollar-sign",
            "title": "Healthy Profit Margin",
            "message": f"Profit margin stands at {margin:.1f}%, indicating strong cost management."
        })
    elif margin < 25:
        insights.append({
            "type": "warning",
            "icon": "alert-triangle",
            "title": "Low Profit Margin",
            "message": f"Profit margin of {margin:.1f}% is below the 25% threshold. Review cost structure."
        })

    # Top category
    cat_data = product_data.get("category_breakdown", [])
    if cat_data:
        top_cat = cat_data[0]
        insights.append({
            "type": "info",
            "icon": "package",
            "title": "Leading Category",
            "message": f"{top_cat['category']} is driving the most revenue at ₹{top_cat['revenue']:,.0f} with {top_cat['units_sold']:,} units sold."
        })

    # Top region
    regions = regional_data.get("regions", [])
    if regions:
        top_region = regions[0]
        insights.append({
            "type": "info",
            "icon": "map-pin",
            "title": "Top Performing Region",
            "message": f"{top_region['region']} leads in revenue with ₹{top_region['revenue']:,.0f}. Consider expanding inventory here."
        })

    # Top product
    top_products = product_data.get("top_products", [])
    if top_products:
        tp = top_products[0]
        insights.append({
            "type": "info",
            "icon": "star",
            "title": "Best Seller",
            "message": f"{tp['product_name']} is your top seller with ₹{tp['revenue']:,.0f} revenue and {tp['units_sold']:,} units."
        })

    # AOV
    aov = kpis.get("avg_order_value", 0)
    if aov > 5000:
        insights.append({
            "type": "positive",
            "icon": "shopping-cart",
            "title": "High Average Order Value",
            "message": f"Average order value of ₹{aov:,.0f} suggests customers are opting for premium products."
        })

    return insights


# ──────────────────────────────────────────────────────────────
# FILTERS METADATA
# ──────────────────────────────────────────────────────────────

def get_filter_options() -> Dict:
    cat_sql = "SELECT name FROM categories ORDER BY name"
    reg_sql = "SELECT name FROM regions ORDER BY name"
    cat_df = _query_df(cat_sql)
    reg_df = _query_df(reg_sql)

    date_sql = "SELECT MIN(order_date) as min_d, MAX(order_date) as max_d FROM orders"
    date_df = _query_df(date_sql)

    return {
        "categories": cat_df["name"].tolist() if len(cat_df) else [],
        "regions": reg_df["name"].tolist() if len(reg_df) else [],
        "date_range": {
            "min": str(date_df.iloc[0]["min_d"]) if len(date_df) else None,
            "max": str(date_df.iloc[0]["max_d"]) if len(date_df) else None,
        }
    }
