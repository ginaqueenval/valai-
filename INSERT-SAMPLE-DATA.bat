@echo off
REM INSERT-SAMPLE-DATA.bat
REM Windows batch script to insert sample Reddit data
REM
REM Usage:
REM   INSERT-SAMPLE-DATA.bat
REM   (then enter your Vercel URL or localhost:3000)

setlocal enabledelayedexpansion

set "BASE_URL=%1"

if "!BASE_URL!"=="" (
    echo.
    echo Enter your deployment URL:
    echo.
    echo Examples:
    echo   http://localhost:3000
    echo   https://valai-awtg.vercel.app
    echo.
    set /p "BASE_URL=URL: "
)

if "!BASE_URL!"=="" (
    echo Error: No URL provided
    pause
    exit /b 1
)

echo.
echo Inserting sample Reddit data...
echo Target: !BASE_URL!/api/test/insert-sample-data
echo.

powershell -NoProfile -Command ^
  "$content = Get-Content 'sample-reddit-data.json' -Raw; " ^
  "$uri = '!BASE_URL!/api/test/insert-sample-data'; " ^
  "$response = Invoke-WebRequest -Uri $uri -Method POST -Body $content -ContentType 'application/json'; " ^
  "Write-Output $response.Content"

echo.
echo.
echo Done! Check the response above.
echo.
echo Next steps:
echo 1. Verify data was inserted
echo 2. Check your-url/api/admin/stats to see the data
echo 3. Test the pipeline with your-url/api/cron/ingest
echo.
pause
