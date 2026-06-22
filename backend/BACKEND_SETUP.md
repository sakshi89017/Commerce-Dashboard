# Commerce Dashboard – Backend Setup & Stability Guide

## Quick Start

### Windows (CMD)
```bash
cd backend
start_backend.cmd
```

### Windows (PowerShell)
```bash
cd backend
.\start_backend.ps1
```

### Manual (Any OS)
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate.bat

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python run.py
```

## Health Check

Verify the backend is running:

```bash
# Using the health check script
python health_check.py

# Using curl
curl http://127.0.0.1:5000/api/health

# Using PowerShell
Invoke-RestMethod http://127.0.0.1:5000/api/health
```

## Environment Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your values** (optional for demo mode):
   ```bash
   DATABASE_URL=sqlite:///./commerce_dashboard.db
   PORT=5000
   FLASK_DEBUG=false
   ```

3. **For production**, set secure keys:
   ```bash
   python -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"
   python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
   ```

## Default Credentials

- **Email:** `admin@dashboard.com`
- **Password:** `Admin@123`

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Backend health check |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | Register new account |
| GET | `/api/dashboard/overview` | Dashboard KPIs |
| GET | `/api/sales/analytics` | Sales data |
| GET | `/api/products/list` | Products list |
| GET | `/api/customers/list` | Customers list |

## Database

### SQLite (Development/Demo)
- **Location:** `./commerce_dashboard.db`
- **Auto-created:** Yes
- **Sample data:** Auto-loaded on first run (5000 orders)

### MySQL (Production)
```env
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/commerce_db
```

Install driver:
```bash
pip install PyMySQL
```

### PostgreSQL (Optional)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/commerce_db
```

Install driver:
```bash
pip install psycopg2-binary
```

## Stability Features

### Health Checks
- Real-time database connectivity monitoring
- HTTP health endpoint at `/api/health`
- Automatic error reporting

### Error Handling
- Centralized exception handlers
- Detailed logging of all errors
- Graceful shutdown on SIGINT/SIGTERM

### Connection Pooling
- SQLAlchemy connection pool with `pool_pre_ping`
- Automatic connection recycling
- Handles stale connections

### Logging
- Structured logging with timestamps
- Error tracking and debugging
- Output to console (configurable to file)

## Troubleshooting

### Port Already in Use
```bash
# Windows: Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux: Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

### Database Locked
- SQLite has one writer at a time
- Close other applications accessing the DB
- For high concurrency, use MySQL or PostgreSQL

### Connection Refused
```bash
# Check if backend is running
python health_check.py

# Restart backend
start_backend.cmd
```

### ImportError: No module named 'flask'
```bash
# Reinstall dependencies
pip install -r requirements.txt
```

## Performance Tips

1. **Use connection pooling** (enabled by default)
2. **Set `FLASK_ENV=production`** for production
3. **Use `gunicorn` or `waitress`** instead of dev server:
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 run:app
   ```
4. **Enable caching** for analytics queries
5. **Use MySQL/PostgreSQL** instead of SQLite for production

## Logs

Check backend logs in the terminal output or configure file logging:

```env
LOG_FILE=./logs/backend.log
LOG_LEVEL=INFO
```

## Testing

Test the auth endpoint:

```bash
$body = @{
    email = "admin@dashboard.com"
    password = "Admin@123"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://127.0.0.1:5000/api/auth/login" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

## Development Workflow

1. **Start backend:** `python run.py`
2. **Monitor logs:** Check console output
3. **Test endpoints:** `python health_check.py` or Postman
4. **Make changes:** Edit Python files
5. **Reload:** Flask auto-reloads on code changes (if `FLASK_DEBUG=true`)

## Production Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for:
- Docker containerization
- Kubernetes deployment
- Environment variable management
- Database migration strategies
