@echo off
setlocal

:: === CORRECTED CREDENTIALS ===
set DB_USER=root
set DB_PASS=#1Olorunsogo
set DB_NAME=pharmcare_offline
set DB_PORT=3306
set BACKUP_DIR=C:\PharmCareBackups
set USB_BACKUP_DIR=E:\PharmCareBackups

:: === AUTO-DETECT MYSQL BINARY ===
if exist "C:\xampp\mysql\bin\mysqldump.exe" (
    set MYSQL_BIN="C:\xampp\mysql\bin\mysqldump.exe"
) else if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" (
    set MYSQL_BIN="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
) else if exist "C:\Program Files\MariaDB 11.0\bin\mysqldump.exe" (
    set MYSQL_BIN="C:\Program Files\MariaDB 11.0\bin\mysqldump.exe"
) else (
    :: Fallback to PATH
    set MYSQL_BIN=mysqldump
)

:: === CREATE DIRECTORIES ===
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: === TIMESTAMP ===
set CUR_YYYY=%date:~10,4%
set CUR_MM=%date:~4,2%
set CUR_DD=%date:~7,2%
set CUR_HH=%time:~0,2%
set CUR_NN=%time:~3,2%
if "%CUR_HH:~0,1%" == " " set CUR_HH=0%CUR_HH:~1,1%
set TIMESTAMP=%CUR_YYYY%-%CUR_MM%-%CUR_DD%_%CUR_HH%-%CUR_NN%

set FILE_NAME=%BACKUP_DIR%\%DB_NAME%_%TIMESTAMP%.sql

echo [Backup] Starting backup to %FILE_NAME% ...

%MYSQL_BIN% --user=%DB_USER% --password=%DB_PASS% --port=%DB_PORT% --single-transaction --routines --triggers --databases %DB_NAME% --result-file="%FILE_NAME%" 2>"%BACKUP_DIR%\backup_log.txt"

if %ERRORLEVEL% equ 0 (
    echo [Backup] SUCCESS: %FILE_NAME%
    :: Mirror to USB drive if present
    if exist "%USB_BACKUP_DIR%" (
        if not exist "%USB_BACKUP_DIR%" mkdir "%USB_BACKUP_DIR%"
        copy "%FILE_NAME%" "%USB_BACKUP_DIR%\" >nul 2>&1
        if %ERRORLEVEL% equ 0 (echo [Backup] Mirrored to USB drive.) else (echo [WARNING] Failed to mirror to USB drive.)
    ) else (
        echo [INFO] USB backup drive E: not detected, skipping mirror.
    )
) else (
    echo [Backup] FAILED. Check %BACKUP_DIR%\backup_log.txt
)

:: Retain last 30 backups
for /f "skip=30 eol=: delims=" %%F in ('dir /b /o-d "%BACKUP_DIR%\%DB_NAME%_*.sql"') do del "%BACKUP_DIR%\%%F"
