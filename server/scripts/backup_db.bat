@echo off
setlocal

:: Configuration
set DB_USER=root
set DB_PASS="#1Admin123"
set DB_NAME=pharmcare_offline
set DB_PORT=3307
set BACKUP_DIR=C:\PharmCareBackups
set MYSQL_BIN="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"

:: Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Timestamp for filename (YYYY-MM-DD_HH-MM)
set CUR_YYYY=%date:~10,4%
set CUR_MM=%date:~4,2%
set CUR_DD=%date:~7,2%
set CUR_HH=%time:~0,2%
set CUR_NN=%time:~3,2%
if "%CUR_HH:~0,1%" == " " set CUR_HH=0%CUR_HH:~1,1%
set TIMESTAMP=%CUR_YYYY%-%CUR_MM%-%CUR_DD%_%CUR_HH%-%CUR_NN%

set FILE_NAME=%BACKUP_DIR%\%DB_NAME%_%TIMESTAMP%.sql

echo [Backup] Starting backup for %DB_NAME%...

:: Execute Backup
mysqldump --user=%DB_USER% --password=%DB_PASS% --port=%DB_PORT% --databases %DB_NAME% --result-file="%FILE_NAME%" 2> "%BACKUP_DIR%\backup_log.txt"

if %ERRORLEVEL% equ 0 (
    echo [Backup] Success! File saved to: %FILE_NAME%
) else (
    echo [Backup] FAILED! Check backup_log.txt for details.
)

:: Retention Policy (Keep last 30 backups)
for /f "skip=30 eol=: delims=" %%F in ('dir /b /o-d "%BACKUP_DIR%\%DB_NAME%_*.sql"') do del "%BACKUP_DIR%\%%F"

timeout /t 5
