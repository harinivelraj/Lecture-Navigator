@echo off
echo ========================================
echo   Lecture Navigator - Port Fix Guide
echo ========================================
echo.
echo PROBLEM: Backend running on wrong port (5173 instead of 8000)
echo SOLUTION: Kill current backend and restart on port 8000
echo.
echo Step 1: Kill any process using port 5173 or 8000
netstat -ano | findstr :5173
netstat -ano | findstr :8000
echo.
echo If you see processes above, note the PID and kill them:
echo   taskkill /PID [PID_NUMBER] /F
echo.
echo Step 2: Start backend on correct port 8000
echo.
cd /d "%~dp0"
echo Starting backend server on PORT 8000 (required for frontend proxy)...
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause