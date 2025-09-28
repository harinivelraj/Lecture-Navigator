@echo off
echo Starting Lecture Navigator Backend Server...
echo.
echo IMPORTANT: Backend must run on port 8000 for frontend proxy to work
echo Frontend runs on port 5173 and proxies API requests to port 8000
echo.
cd /d "%~dp0"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause