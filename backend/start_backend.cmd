@echo off
REM Commerce Dashboard - Backend Startup Script (Windows)
REM Usage: start_backend.cmd

echo.
echo ========================================
echo  Commerce Dashboard - Backend Startup
echo ========================================
echo.

REM Check if venv exists
if not exist "venv\" (
  echo [ERROR] Virtual environment not found.
  echo [INFO] Creating venv...
  python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Check if dependencies are installed
pip freeze | findstr /I "Flask" >nul
if errorlevel 1 (
  echo [INFO] Installing dependencies...
  pip install --upgrade pip
  pip install -r requirements.txt
)

REM Set environment variables
set FLASK_APP=run.py
set FLASK_ENV=development
set FLASK_DEBUG=false
REM set DATABASE_URL=sqlite:///./commerce_dashboard.db

REM Display startup info
echo [INFO] Starting Commerce Dashboard Backend...
echo [INFO] Server will be available at: http://127.0.0.1:5000
echo [INFO] Health check endpoint: http://127.0.0.1:5000/api/health
echo [INFO] Default credentials: admin@dashboard.com / Admin@123
echo [INFO] Press Ctrl+C to stop the server
echo.

REM Start the backend server
python run.py

REM Error handling
if errorlevel 1 (
  echo [ERROR] Backend failed to start.
  pause
  exit /b 1
)

pause
