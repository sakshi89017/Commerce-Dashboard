# Commerce Dashboard - Backend Startup Script (PowerShell)
# Usage: .\start_backend.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Commerce Dashboard - Backend Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if venv exists
if (-not (Test-Path "venv")) {
    Write-Host "[INFO] Virtual environment not found. Creating venv..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
& .\venv\Scripts\Activate.ps1

# Check if dependencies are installed
try {
    pip freeze | Select-String -Pattern "Flask" -ErrorAction Stop | Out-Null
} catch {
    Write-Host "[INFO] Installing dependencies..." -ForegroundColor Yellow
    python -m pip install --upgrade pip
    pip install -r requirements.txt
}

# Set environment variables
$env:FLASK_APP = "run.py"
$env:FLASK_ENV = "development"
$env:FLASK_DEBUG = "false"
# $env:DATABASE_URL = "sqlite:///./commerce_dashboard.db"

# Display startup info
Write-Host ""
Write-Host "[INFO] Starting Commerce Dashboard Backend..." -ForegroundColor Green
Write-Host "[INFO] Server will be available at: http://127.0.0.1:5000" -ForegroundColor Green
Write-Host "[INFO] Health check endpoint: http://127.0.0.1:5000/api/health" -ForegroundColor Green
Write-Host "[INFO] Default credentials: admin@dashboard.com / Admin@123" -ForegroundColor Green
Write-Host "[INFO] Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the backend server
try {
    python run.py
} catch {
    Write-Host "[ERROR] Backend failed to start: $_" -ForegroundColor Red
    exit 1
}
