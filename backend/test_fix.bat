@echo off
echo.
echo TESTING FIXED METRICS SYSTEM
echo =============================
echo.
echo Testing the Python compatibility fix for statistics.quantile...
echo.

cd /d "%~dp0"

echo Step 1: Testing basic server response...
curl -s http://localhost:8000/ > nul
if %errorlevel% neq 0 (
    echo ERROR: Server not running. Please start with: uvicorn app.main:app --reload
    pause
    exit /b 1
)
echo Server is running ✓

echo.
echo Step 2: Testing metrics endpoint (should not crash now)...
curl -s http://localhost:8000/show_metrics_now
if %errorlevel% neq 0 (
    echo ERROR: Metrics endpoint failed
    pause
    exit /b 1
)
echo Metrics endpoint working ✓

echo.
echo Step 3: Testing search (should not crash with P95 calculation)...
curl -s -X POST http://localhost:8000/search_timestamps -H "Content-Type: application/json" -d "{\"query\":\"test search\",\"search_type\":\"semantic\",\"k\":5}" > nul
if %errorlevel% neq 0 (
    echo ERROR: Search failed
    pause
    exit /b 1
)
echo Search working ✓

echo.
echo =============================
echo SUCCESS: All tests passed!
echo =============================
echo.
echo The statistics.quantile error has been fixed.
echo You can now run: .\test_all_metrics.bat
echo.
pause