@echo off
REM Quick MRR@10 evaluation test
echo.
echo TESTING MRR@10 EVALUATION
echo =========================
echo.

cd /d "%~dp0"

echo Running MRR@10 evaluation against 39-query gold set...
python terminal_metrics_access.py mrr

echo.
echo Done! Check the terminal output above for MRR@10 results.
pause