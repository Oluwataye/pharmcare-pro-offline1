# Run this script as Administrator to register the Daily Backup Task
# -------------------------------------------------------------

$taskName = "PharmCareDailyBackup"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$actionScript = Join-Path $scriptDir "backup_db.bat"

Write-Host "Registering Daily Backup Task for PharmCare Pro..."
Write-Host "Backup Script Path: $actionScript"

if (-not (Test-Path $actionScript)) {
    Write-Error "Could not find backup_db.bat at $actionScript. Please ensure this script is in the same directory."
    Exit 1
}

# Create action
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$actionScript`""

# Trigger daily at 21:00 (9:00 PM)
$trigger = New-ScheduledTaskTrigger -Daily -At "21:00"

# Settings: run only if network is available = false, wake to run = true
$settings = New-ScheduledTaskSettingsSet -RunOnlyIfNetworkAvailable:$false -WakeToRun:$true

# Register task (will run as SYSTEM user to ensure it runs even if logged out)
try {
    Register-ScheduledTask -TaskName $taskName `
      -Action $action `
      -Trigger $trigger `
      -Settings $settings `
      -User "SYSTEM" `
      -RunLevel Highest `
      -Force
    Write-Host "[SUCCESS] Registered Windows Task Scheduler job '$taskName' successfully." -ForegroundColor Green
    Write-Host "The database will be backed up daily at 21:00 (9:00 PM) to C:\PharmCareBackups." -ForegroundColor Green
} catch {
    Write-Error "Failed to register Scheduled Task: $_. Make sure you run this PowerShell terminal as Administrator."
}
