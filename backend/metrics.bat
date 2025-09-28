@echo off
REM Terminal Metrics Access - Windows Batch Script
REM Usage: metrics.bat dashboard|mrr|p95|window|test [query]

cd /d "%~dp0"

if "%1"=="" (
    echo.
    echo 🎛️ TERMINAL METRICS ACCESS
    echo ==========================
    echo.
    echo Usage: metrics.bat [command] [query]
    echo.
    echo Commands:
    echo   dashboard  - Show comprehensive metrics dashboard
    echo   mrr        - Run MRR@10 evaluation
    echo   p95        - Show P95 latency status  
    echo   window     - Test window size comparison
    echo   test query - Test window sizes with custom query
    echo.
    echo Examples:
    echo   metrics.bat dashboard
    echo   metrics.bat mrr
    echo   metrics.bat test "machine learning concepts"
    echo.
    goto :eof
)

if "%1"=="dashboard" (
    python terminal_metrics_access.py dashboard
) else if "%1"=="mrr" (
    python terminal_metrics_access.py mrr
) else if "%1"=="p95" (
    python terminal_metrics_access.py p95
) else if "%1"=="window" (
    python terminal_metrics_access.py window
) else if "%1"=="test" (
    python terminal_metrics_access.py test %2 %3 %4 %5 %6 %7 %8 %9
) else (
    echo ❌ Unknown command: %1
    echo Use 'metrics.bat' without arguments to see usage
)

pause