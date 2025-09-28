@echo off
echo ========================================
echo   Lecture Navigator - Clean Metrics
echo ========================================
echo.
echo Starting backend with clean terminal output...
echo Server logs minimized, metrics clearly displayed
echo.
cd /d "%~dp0"

REM Kill any existing processes on the ports
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do taskkill /f /pid %%a >nul 2>&1

echo Starting server on port 8000 with clean metrics display...
echo.

REM Start with reduced logging for cleaner output
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --log-level warning

pause