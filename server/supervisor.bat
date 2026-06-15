@echo off
:: PharmCare Pro - Server Supervisor
:: Keeps node index.js running. If it crashes, waits 3s then restarts.
cd /d "%~dp0"

:loop
node index.js
echo.
echo [SUPERVISOR] Server stopped. Restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
