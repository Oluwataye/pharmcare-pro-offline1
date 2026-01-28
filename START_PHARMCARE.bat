@echo off
setlocal enabledelayedexpansion

:: ======================================================
:: PHARMCARE PRO - ROBUST ONE-CLICK STARTUP
:: ======================================================

echo.
echo ========================================
echo   PharmCare Pro - Starting...
echo ========================================
echo.

:: ======================================================
:: STEP 1: CLEANUP EXISTING INSTANCES
:: ======================================================
echo [1/5] Checking for existing server instances...

:: Check if port 80 is in use
netstat -ano | findstr ":80 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo   ^> Found existing server on port 80
    echo   ^> Gracefully terminating...
    
    :: Get PID of process using port 80
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":80 " ^| findstr "LISTENING"') do (
        set PID=%%a
        echo   ^> Stopping process !PID!...
        taskkill /PID !PID! /F >nul 2>&1
    )
    
    :: Wait for port to be released
    timeout /t 2 /nobreak >nul
    echo   ^> Cleanup complete
) else (
    echo   ^> No existing instances found
)

:: Additional cleanup: Kill any node.exe in this directory
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST ^| findstr "PID:"') do (
    set NODE_PID=%%i
    wmic process where "ProcessId=!NODE_PID!" get CommandLine 2>nul | findstr /C:"pharmcare-pro offline" >nul
    if !errorlevel! equ 0 (
        echo   ^> Cleaning up orphaned node process !NODE_PID!...
        taskkill /PID !NODE_PID! /F >nul 2>&1
    )
)

echo   ^> All cleanup complete
echo.

:: ======================================================
:: STEP 2: ENSURE DATABASE IS RUNNING
:: ======================================================
echo [2/5] Ensuring Database is running...

:: Try starting MySQL service (Standard names: MySQL, MySQL80)
net start MySQL80 >nul 2>&1
if %errorlevel% neq 0 (
    net start MySQL >nul 2>&1
)

:: Verify MySQL is running
sc query MySQL80 | findstr "RUNNING" >nul 2>&1
if %errorlevel% equ 0 (
    echo   ^> MySQL80 service is running
) else (
    sc query MySQL | findstr "RUNNING" >nul 2>&1
    if %errorlevel% equ 0 (
        echo   ^> MySQL service is running
    ) else (
        echo   ^> WARNING: MySQL service may not be running
        echo   ^> Attempting to continue...
    )
)

:: Wait for DB to initialize
timeout /t 2 /nobreak >nul
echo.

:: ======================================================
:: STEP 3: VERIFY ENVIRONMENT
:: ======================================================
echo [3/5] Verifying environment...

cd /d "%~dp0server"

:: Check if node_modules exists
if not exist "node_modules" (
    echo   ^> First time setup detected
    echo   ^> Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo   ^> ERROR: Failed to install dependencies
        echo   ^> Please run 'npm install' manually in the server folder
        pause
        exit /b 1
    )
) else (
    echo   ^> Dependencies verified
)

:: Verify .env file exists
if not exist "..\\.env" (
    echo   ^> WARNING: .env file not found in root directory
    echo   ^> Server may not start correctly
)

echo.

:: ======================================================
:: STEP 4: START APPLICATION SERVER
:: ======================================================
echo [4/5] Starting Application Server...

:: Start server in background
start /b "" node index.js >nul 2>&1

:: Wait and verify server started
echo   ^> Waiting for server to initialize...
timeout /t 3 /nobreak >nul

:: Check if port 80 is now listening
set SERVER_STARTED=0
for /L %%i in (1,1,10) do (
    netstat -ano | findstr ":80 " | findstr "LISTENING" >nul 2>&1
    if !errorlevel! equ 0 (
        set SERVER_STARTED=1
        goto :server_ready
    )
    timeout /t 1 /nobreak >nul
)

:server_ready
if %SERVER_STARTED% equ 1 (
    echo   ^> Server started successfully on port 80
) else (
    echo   ^> ERROR: Server failed to start on port 80
    echo   ^> Please check server logs for details
    echo   ^> You may need to run as Administrator
    pause
    exit /b 1
)

echo.

:: ======================================================
:: STEP 5: LAUNCH BROWSER
:: ======================================================
echo [5/5] Launching PharmCare Pro...

:: Wait a bit more for full initialization
timeout /t 2 /nobreak >nul

:: Open browser
start http://pharmcarepro/?startup=1

echo.
echo ========================================
echo   SYSTEM READY!
echo ========================================
echo.
echo   Access URL:  http://pharmcarepro/
echo   Admin Login: admin@pharmcarepro.com
echo   Password:    Admin@123!
echo.
echo   Keep this window open while using
echo   PharmCare Pro. Close it to stop
echo   the server.
echo.
echo ========================================
echo.

:: Keep window open
pause >nul
