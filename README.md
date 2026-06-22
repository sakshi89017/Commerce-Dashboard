# Commerce Analytics Dashboard

A production-ready full-stack analytics dashboard for e-commerce businesses.
Upload sales CSV/Excel files, auto-clean the data, and explore revenue, profit,
product, customer, regional, and forecasting insights through interactive charts.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS 3, Recharts |
| Backend | Python 3.11+, Flask 3, Flask-JWT-Extended |
| Database | SQLite (demo) / MySQL (production) |
| Data | Pandas, NumPy, scikit-learn |
| Reports | ReportLab (PDF), OpenPyXL (Excel) |
| Auth | JWT (access + refresh tokens) |

---

## Project Structure

```
commerce-dashboard/
├── backend/
│   ├── api/
│   │   └── routes.py          # All API blueprints
│   ├── config/
│   │   └── settings.py        # Environment config
│   ├── models/
│   │   └── models.py          # SQLAlchemy ORM models
│   ├── services/
│   │   ├── analytics_service.py  # SQL aggregations & insights
│   │   ├── data_service.py       # CSV/Excel cleaning & import
│   │   └── report_service.py     # PDF & Excel generation
│   ├── app.py                 # Flask application factory
│   ├── extensions.py          # db, jwt singletons
│   ├── run.py                 # Server entry point
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/          # Login & Register pages
│   │   │   ├── charts/        # Recharts wrappers
│   │   │   ├── dashboard/     # KPI cards, tables, filter bar
│   │   │   └── layout/        # Sidebar, DashboardLayout
│   │   ├── hooks/
│   │   │   └── useFetch.js    # Data fetching & filter hooks
│   │   ├── pages/
│   │   │   ├── OverviewPage.jsx
│   │   │   ├── SalesPage.jsx
│   │   │   ├── AnalyticsPages.jsx  # Products, Customers, Profit, Regions, Forecast
│   │   │   ├── UploadPage.jsx
│   │   │   └── ReportsPage.jsx
│   │   ├── services/
│   │   │   └── api.js         # Axios client + all API calls
│   │   ├── store/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── styles/
│   │   │   └── globals.css
│   │   └── utils/
│   │       └── helpers.js     # Formatters, colors, helpers
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── database/
│   ├── sample_commerce_data.csv   # 5 000 sample orders
│   ├── sample_commerce_data.xlsx
│   └── schema.sql                 # MySQL schema reference
├── scripts/
│   └── generate_sample_data.py    # Re-generate sample dataset
└── README.md
```

---

## Quick Start

### 1 — Backend

```bash
cd backend

# (Recommended) create a virtual environment
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (optional — SQLite demo works without .env)
cp .env.example .env
# Edit .env if you want MySQL or custom secrets

# Start the server
python run.py
```

Server starts at **http://localhost:5000**

On first run the backend automatically:
- Creates all database tables
- Seeds the default admin user
- Imports the 5 000-row sample dataset

**Default login credentials**
```
Email:    admin@dashboard.com
Password: Admin@123
```

---

### 2 — Frontend

```bash
cd frontend

npm install
npm run dev
```

App opens at **http://localhost:3000**

The Vite dev server proxies `/api/*` requests to `http://localhost:5000`
automatically — no CORS configuration needed in development.

---

### Production Build

```bash
# Frontend
cd frontend && npm run build
# Output: frontend/dist/

# Backend (use gunicorn or similar)
pip install gunicorn
cd backend
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

---

## Features

### Authentication
- JWT login / register with access + refresh tokens
- Protected dashboard routes
- Role-based access (admin / analyst / viewer)

### Dashboard Overview
- Total Revenue, Orders, Customers, Profit KPI cards
- Average Order Value and Profit Margin %
- Revenue vs Profit trend (area chart)
- Category revenue donut chart
- AI-generated business insights panel
- Global date-range, category, and region filters

### Sales Analytics
- Daily / Weekly / Monthly / Yearly trend toggle
- Revenue, Profit, Cost, and Order volume charts
- Tabular breakdown with all periods

### Product Analytics
- Top 10 and Bottom products by revenue
- Category-wise revenue (donut + horizontal bar)
- Product profit ranking table

### Customer Analytics
- Segment breakdown: New / Returning / VIP / At-Risk
- Customer growth trend (area chart)
- Payment method distribution (pie chart)
- Top 20 customers by lifetime value

### Profit Analysis
- Monthly gross profit and cost breakdown (composed chart)
- Profit margin trend line
- Category-level profit margin table

### Regional Analysis
- Region / State / City revenue breakdown
- Interactive bar chart by region
- Top 15 cities by revenue table

### Revenue Forecast
- Polynomial regression forecast (14 / 30 / 60 day horizons)
- Historical actuals + predicted trend on single chart
- Expected growth % vs prior period summary
- Daily forecast detail table

### Data Upload
- CSV and Excel (.xlsx / .xls) file upload (up to 50 MB)
- Automatic data cleaning pipeline:
  - Remove duplicates on Order_ID
  - Parse and validate dates
  - Coerce numeric columns
  - Normalise category / region names
  - Drop invalid rows with logging
- Upload history with status and row counts

### Reports
- **Excel** — multi-sheet workbook (KPIs, Sales, Top Products, Customers)
- **PDF** — executive summary with KPIs, product table, AI insights
- Report generation history log

---

## API Reference

All endpoints return:
```json
{ "success": true, "data": {}, "message": "Success" }
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT tokens |
| POST | `/api/auth/register` | Create account |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/dashboard` | KPIs + all summary data |
| GET | `/api/sales` | Sales trend (`?period=monthly`) |
| GET | `/api/products` | Product analytics |
| GET | `/api/customers` | Customer analytics |
| GET | `/api/profit` | Profit analysis |
| GET | `/api/regions` | Regional breakdown |
| GET | `/api/forecast` | Revenue forecast (`?days=30`) |
| POST | `/api/upload` | Upload CSV/Excel file |
| GET | `/api/upload/batches` | Upload history |
| GET | `/api/reports/excel` | Download Excel report |
| GET | `/api/reports/pdf` | Download PDF report |
| GET | `/api/filters` | Available filter options |

All dashboard/analytics endpoints accept optional query params:
`?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&category=Electronics&region=North`

---

## Sample Dataset

`database/sample_commerce_data.csv` — 5 000 orders across 2023–2024

| Column | Description |
|--------|-------------|
| Order_ID | Unique order identifier |
| Order_Date | YYYY-MM-DD |
| Customer_ID | Unique customer code |
| Customer_Name | Full name |
| Product_ID | Product code |
| Product_Name | Product label |
| Category | Electronics / Clothing / Home & Kitchen / Books / Sports / Beauty |
| Quantity | Units ordered |
| Price | Unit price (₹) |
| Cost | Cost of goods (₹) |
| Revenue | Price × Quantity |
| Profit | Revenue − Cost |
| Region | North / South / East / West |
| State | Indian state name |
| City | City name |
| Payment_Method | Credit Card / Debit Card / UPI / Net Banking / Cash on Delivery / EMI |

To regenerate:
```bash
python scripts/generate_sample_data.py
```

---

## MySQL (Production)

```sql
-- Create database
CREATE DATABASE commerce_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dashboard'@'localhost' IDENTIFIED BY 'strongpassword';
GRANT ALL PRIVILEGES ON commerce_dashboard.* TO 'dashboard'@'localhost';
```

```env
# backend/.env
DATABASE_URL=mysql+pymysql://dashboard:strongpassword@localhost:3306/commerce_dashboard
```

The schema is auto-created by SQLAlchemy on first run.
`database/schema.sql` is provided as a reference / migration baseline.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `dev-secret…` | Flask secret (change in production) |
| `JWT_SECRET_KEY` | `jwt-dev…` | JWT signing key (change in production) |
| `DATABASE_URL` | SQLite | Full SQLAlchemy DB URI |
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `5000` | Bind port |
| `FLASK_DEBUG` | `false` | Enable debug mode |
| `UPLOAD_FOLDER` | `/tmp/commerce_uploads` | Temp upload directory |
| `REPORTS_FOLDER` | `/tmp/commerce_reports` | Generated reports directory |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` (proxied) | Backend base URL |

---

## License

MIT
