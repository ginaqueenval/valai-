@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   val-e Reddit Test - Starting...
echo ========================================
echo.

REM Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not installed!
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found
echo.
echo Running test...
echo.

node test-reddit-local.js

echo.
echo ========================================
echo Press any key to close...
pause >nul
