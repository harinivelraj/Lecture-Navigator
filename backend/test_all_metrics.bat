@echo off
echo.
echo COMPREHENSIVE METRICS TEST - MAKE ALL 3 METRICS VISIBLE
echo ======================================================
echo.
echo This script will:
echo 1. Show current metrics status
echo 2. Run MRR@10 evaluation (if needed)
echo 3. Perform searches to generate P95 data (if needed)
echo 4. Test window size comparison (if needed)
echo.

cd /d "%~dp0"

echo Step 1: Checking current metrics status...
echo -------------------------------------------
curl -s http://localhost:8000/show_metrics_now
echo.

echo Step 2: Running MRR@10 evaluation on 39-query gold set...
echo ---------------------------------------------------------
echo This evaluates search quality against the gold standard.
curl -s -X POST http://localhost:8000/evaluate_mrr -H "Content-Type: application/json" -d "{\"search_type\":\"semantic\",\"k\":10}"
echo.

echo Step 3: Generating P95 latency data with test searches...  
echo -------------------------------------------------------
echo Performing 8 test searches to accumulate P95 statistics...

curl -s -X POST http://localhost:8000/search_timestamps -H "Content-Type: application/json" -d "{\"query\":\"machine learning\",\"search_type\":\"semantic\",\"k\":10}" > nul
curl -s -X POST http://localhost:8000/search_timestamps -H "Content-Type: application/json" -d "{\"query\":\"neural networks\",\"search_type\":\"semantic\",\"k\":10}" > nul
curl -s -X POST http://localhost:8000/search_timestamps -H "Content-Type: application/json" -d "{\"query\":\"deep learning\",\"search_type\":\"semantic\",\"k\":10}" > nul
curl -s -X POST http://localhost:8000/search_timestamps -H "Content-Type: application/json" -d "{\"query\":\"algorithms\",\"search_type\":\"semantic\",\"k\":10}" > nul
curl -s -X POST http://localhost:8000/search_timestamps -H "Content-Type: application/json" -d "{\"query\":\"data science\",\"search_type\":\"semantic\",\"k\":10}" > nul
curl -s -X POST http://localhost:8000/search_timestamps -H "Content-Type: application/json" -d "{\"query\":\"artificial intelligence\",\"search_type\":\"semantic\",\"k\":10}" > nul
curl -s -X POST http://localhost:8000/search_timestamps -H "Content-Type: application/json" -d "{\"query\":\"computer vision\",\"search_type\":\"semantic\",\"k\":10}" > nul
curl -s -X POST http://localhost:8000/search_timestamps -H "Content-Type: application/json" -d "{\"query\":\"natural language processing\",\"search_type\":\"semantic\",\"k\":10}" > nul

echo Done! Generated P95 latency data from 8 searches.

echo.
echo Step 4: Testing window size comparison...
echo ----------------------------------------
curl -s -X POST http://localhost:8000/test_window_sizes -H "Content-Type: application/json" -d "{\"query\":\"optimization techniques\",\"test_both_sizes\":true,\"k\":10}"
echo.

echo Step 5: Final metrics status check...
echo -------------------------------------
curl -s http://localhost:8000/show_metrics_now
echo.

echo ======================================================
echo METRICS TEST COMPLETE!
echo ======================================================
echo.
echo All three metrics should now be visible in the terminal:
echo 1. MRR@10: Evaluated against 39-query gold set
echo 2. P95 Latency: Calculated from accumulated search data  
echo 3. Window Analysis: 30s vs 60s comparison available
echo.
echo Check the backend terminal for the detailed metrics display.
echo Use ".\metrics.bat dashboard" for ongoing monitoring.
echo.
pause