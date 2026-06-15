# Run this script as Administrator to bind MySQL to localhost (127.0.0.1)
# ------------------------------------------------------------------

$myIniPaths = @(
    'C:\xampp\mysql\bin\my.ini',
    'C:\Program Files\MySQL\MySQL Server 8.0\my.ini',
    'C:\ProgramData\MySQL\MySQL Server 8.0\my.ini'
)

$targetPath = $null
foreach ($path in $myIniPaths) {
    if (Test-Path $path) {
        $targetPath = $path
        break
    }
}

if ($null -eq $targetPath) {
    Write-Warning 'Could not find my.ini in typical locations. Please manually set bind-address = 127.0.0.1 in your MySQL configuration.'
    Exit 1
}

Write-Host "Found MySQL configuration at: $targetPath"
$content = Get-Content $targetPath -Raw

# Check if bind-address is already set
if ($content -match 'bind-address\s*=\s*127.0.0.1') {
    Write-Host '[✓] MySQL is already locked to 127.0.0.1 (localhost).' -ForegroundColor Green
    Exit 0
}

# Replace bind-address = 0.0.0.0 or uncomment bind-address
if ($content -match 'bind-address') {
    $content = $content -replace 'bind-address\s*=\s*\S+', 'bind-address = 127.0.0.1'
    $content = $content -replace '#\s*bind-address\s*=\s*\S+', 'bind-address = 127.0.0.1'
} else {
    # Add to [mysqld] section
    if ($content -match '\[mysqld\]') {
        $content = $content -replace '\[mysqld\]', "[mysqld]`nbind-address = 127.0.0.1"
    } else {
        $content += "`n[mysqld]`nbind-address = 127.0.0.1"
    }
}

try {
    Set-Content $targetPath $content -Force
    Write-Host '[✓] Updated my.ini to lock MySQL to 127.0.0.1.' -ForegroundColor Green
    
    # Restart MySQL service
    Write-Host 'Restarting MySQL Service...'
    Restart-Service -Name 'MySQL*' -Force -ErrorAction SilentlyContinue
    Restart-Service -Name 'wampmysqld*' -Force -ErrorAction SilentlyContinue
    Write-Host '[✓] MySQL service restarted successfully.' -ForegroundColor Green
} catch {
    Write-Error 'Failed to update my.ini. Make sure you run this script as Administrator.'
}
