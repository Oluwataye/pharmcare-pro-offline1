@echo off
set PORT=3100
echo.
echo Stopping PharmCare Pro on port %PORT%...

set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    echo [!] Found process %%a listening on port %PORT%
    taskkill /PID %%a /F >nul 2>&1
    echo [✓] PharmCare Pro stopped successfully.
    set FOUND=1
)

if %FOUND% equ 0 (
    echo [!] WARNING: PharmCare Pro was not found running on port %PORT%.
)

timeout /t 2 >nul
