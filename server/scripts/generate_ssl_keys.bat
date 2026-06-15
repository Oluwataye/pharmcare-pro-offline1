@echo off
:: This script generates a self-signed SSL key pair for local LAN security (HTTPS).
:: It requires OpenSSL, which is pre-installed with Git, XAMPP, or can be downloaded separately.

set SSL_DIR=%~dp0..\ssl

echo.
echo ========================================================
echo   PharmCare Pro - Generating Self-Signed SSL Certificate
echo ========================================================
echo.

if not exist "%SSL_DIR%" mkdir "%SSL_DIR%"

:: Check if openssl is available in PATH
where openssl >nul 2>&1
if %errorLevel% neq 0 (
    :: Try standard Git/XAMPP paths
    if exist "C:\Program Files\Git\usr\bin\openssl.exe" (
        set OPENSSL_BIN="C:\Program Files\Git\usr\bin\openssl.exe"
    ) else if exist "C:\xampp\apache\bin\openssl.exe" (
        set OPENSSL_BIN="C:\xampp\apache\bin\openssl.exe"
    ) else (
        echo [ERROR] OpenSSL was not found on your system.
        echo Please make sure Git or XAMPP is installed, or add OpenSSL to your System PATH.
        pause
        exit /b 1
    )
) else (
    set OPENSSL_BIN=openssl
)

echo Generating certificate and key files in %SSL_DIR%...
%OPENSSL_BIN% req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "%SSL_DIR%\key.pem" -out "%SSL_DIR%\cert.pem" -subj "/C=NG/ST=Lagos/L=Lagos/O=Eye Hospital/OU=IT/CN=pharmcarepro"

if %errorLevel% equ 0 (
    echo [✓] SSL Key Pair generated successfully!
    echo   Key:  %SSL_DIR%\key.pem
    echo   Cert: %SSL_DIR%\cert.pem
) else (
    echo [ERROR] Failed to generate SSL Key Pair.
)

pause
