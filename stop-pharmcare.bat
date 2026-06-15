@echo off
set PORT=3100
echo.
echo Stopping PharmCare Pro on port %PORT% gracefully...

netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] WARNING: PharmCare Pro is not running on port %PORT%.
    timeout /t 2 >nul
    exit /b 0
)

:: Send shutdown command to localhost API
curl -d "" -X POST -s http://localhost:%PORT%/api/system/shutdown >nul 2>&1
echo   ^> Shutdown signal sent. Waiting for process to terminate...
timeout /t 2 /nobreak >nul

:: Check if still running, fallback to taskkill
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    echo   ^> Process %%a is still active. Forcing termination...
    taskkill /PID %%a /F >nul 2>&1
    set FOUND=1
)

if %FOUND% equ 1 (
    echo [✓] PharmCare Pro was force-killed.
) else (
    echo [✓] PharmCare Pro stopped gracefully.
)

timeout /t 2 >nul
