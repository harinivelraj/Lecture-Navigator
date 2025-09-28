@echo off
echo.
echo SHOWING IMMEDIATE METRICS STATUS
echo ================================
echo.
echo Triggering metrics display in terminal...

curl -s http://localhost:8000/show_metrics_now

echo.
echo Done! Check the terminal running the backend server for the metrics display.
echo.
echo Next steps:
echo 1. If MRR@10 not evaluated: run ".\test_mrr.bat"  
echo 2. If P95 needs data: perform 5+ searches
echo 3. If Window Analysis needs data: perform varied searches
echo.
pause
