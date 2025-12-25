# Security Fix: Remove .env.production files from repository
# These files contain sensitive secrets and should NOT be in version control
# Environment variables must be set in Vercel Dashboard instead

Write-Host "Removing .env.production files from repository..." -ForegroundColor Yellow

# Remove .env.production files
$filesToRemove = @(
    "frontend\.env.production",
    "middleware-api\.env.production",
    "frontend\.next\standalone\.env.production"
)

$removedCount = 0
foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        Remove-Item -Path $file -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Removed: $file" -ForegroundColor Green
        $removedCount++
    } else {
        Write-Host "  [SKIP] Not found: $file" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Verification: Checking for remaining .env.production files..." -ForegroundColor Cyan
$remaining = Get-ChildItem -Path . -Filter ".env.production" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.next*" }

if ($remaining) {
    Write-Host "  [WARN] Found remaining files:" -ForegroundColor Yellow
    $remaining | ForEach-Object { Write-Host "    - $($_.FullName)" -ForegroundColor Yellow }
} else {
    Write-Host "  [OK] No .env.production files found in repository" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Add all environment variables to Vercel Dashboard" -ForegroundColor White
Write-Host "  2. See ROOT_CAUSE_RESCUE_COMPLETE.md for complete variable list" -ForegroundColor White
Write-Host "  3. If files were committed to git, run:" -ForegroundColor White
Write-Host "     git rm --cached frontend/.env.production" -ForegroundColor Gray
Write-Host "     git rm --cached middleware-api/.env.production" -ForegroundColor Gray
Write-Host '     git commit -m "Security: Remove .env.production files"' -ForegroundColor Gray

Write-Host ""
Write-Host "Script completed. Removed $removedCount file(s)." -ForegroundColor Green
