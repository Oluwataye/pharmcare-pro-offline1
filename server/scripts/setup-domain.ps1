$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$entry = "127.0.0.1 pharmcarepro"

Write-Host "Checking Hosts file..."
try {
    if (-not (Select-String -Path $hostsPath -Pattern "pharmcarepro")) {
        Add-Content -Path $hostsPath -Value "`n$entry"
        Write-Host "✅ Added '127.0.0.1 pharmcarepro' to hosts file."
    } else {
        Write-Host "✅ Entry 'pharmcarepro' already exists."
    }
} catch {
    Write-Error "❌ Failed to modify Hosts file. Run this script as Administrator!"
}
