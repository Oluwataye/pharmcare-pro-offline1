@echo off
:: This script installs PharmCare Pro Offline as a background Windows Service using NSSM.
:: NSSM.exe should be downloaded from https://nssm.cc/ and placed in this directory or client installer folder.

set SERVICE_NAME=PharmCareProServer
set SERVER_DIR=%~dp0..
set START_SCRIPT=%SERVER_DIR%\index.js
set NODE_EXE=node.exe

echo.
echo ========================================================
echo   PharmCare Pro - Installing Windows Service
echo ========================================================
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Please run this Command Prompt as Administrator!
    pause
    exit /b 1
)

:: Find nssm.exe
set NSSM_BIN=""
if exist "%~dp0nssm.exe" (
    set NSSM_BIN="%~dp0nssm.exe"
) else if exist "%SERVER_DIR%\Installer\nssm.exe" (
    set NSSM_BIN="%SERVER_DIR%\Installer\nssm.exe"
) else (
    echo [WARNING] nssm.exe not found in this folder or Installer folder.
    echo.
    echo Please download NSSM from https://nssm.cc/download, extract nssm.exe
    echo (64-bit version) to this directory, and run this script again.
    echo.
    echo [INFO] Attempting to download NSSM from nssm.cc...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile '%~dp0nssm.zip'" 2>nul
    if exist "%~dp0nssm.zip" (
        powershell -Command "Expand-Archive -Path '%~dp0nssm.zip' -DestinationPath '%~dp0nssm_temp'"
        copy "%~dp0nssm_temp\nssm-2.24\win64\nssm.exe" "%~dp0nssm.exe" >nul
        del "%~dp0nssm.zip"
        rmdir /s /q "%~dp0nssm_temp"
        set NSSM_BIN="%~dp0nssm.exe"
        echo [✓] NSSM auto-downloaded successfully!
    ) else (
        echo [ERROR] Failed to download NSSM automatically. Please download manually and place nssm.exe here.
        pause
        exit /b 1
    )
)

echo.
echo Installing service '%SERVICE_NAME%'...
%NSSM_BIN% install %SERVICE_NAME% "%NODE_EXE%" "%START_SCRIPT%"
%NSSM_BIN% set %SERVICE_NAME% AppDirectory "%SERVER_DIR%"
%NSSM_BIN% set %SERVICE_NAME% Description "Local API and static files server for PharmCare Pro Offline EMR"
%NSSM_BIN% set %SERVICE_NAME% Start SERVICE_AUTO_START
%NSSM_BIN% set %SERVICE_NAME% AppRotateFiles 1
%NSSM_BIN% set %SERVICE_NAME% AppRotateOnline 1
%NSSM_BIN% set %SERVICE_NAME% AppRotateSeconds 86400
%NSSM_BIN% set %SERVICE_NAME% AppRotateBytes 10485760

echo.
echo Starting service '%SERVICE_NAME%'...
net start %SERVICE_NAME%

if %errorLevel% equ 0 (
    echo [✓] Service '%SERVICE_NAME%' installed and started successfully!
) else (
    echo [WARNING] Service installed but failed to start. Please check Event Viewer or NSSM logs.
)

pause
