@echo off
echo.
echo METRICS STATUS - ALL THREE METRICS FIXED
echo =========================================
echo.

echo Checking metrics status...
echo.

powershell -Command "Invoke-WebRequest -Uri 'http://localhost:8000/show_metrics_now' | Select-Object -ExpandProperty Content | ConvertFrom-Json | Format-List"

echo.
echo All three metrics should now be visible in the uvicorn terminal:
echo 1. MRR@10: Evaluated against 39-query gold set
echo 2. P95 Latency: Calculated from accumulated searches
echo 3. Window Analysis: 30s vs 60s comparison data available
echo.
echo If you want to see detailed metrics, check the backend terminal window.
echo.
pause