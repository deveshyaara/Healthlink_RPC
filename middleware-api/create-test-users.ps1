# HealthLink - PowerShell Test User Creation Script
# Created to avoid JSON escaping issues in PowerShell

Write-Host "Testing Phase 1 User Registration" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:4000/api/auth"

# Test 1: Create Pharmacist
Write-Host "Creating Pharmacist User..." -ForegroundColor Yellow
$pharmacistBody = @{
    email = "test.pharmacist@healthlink.com"
    password = "Test123!@#"
    fullName = "Test Pharmacist"
    role = "pharmacist"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/register" -Method POST -Body $pharmacistBody -ContentType "application/json"
    Write-Host "SUCCESS: Pharmacist created!" -ForegroundColor Green
    Write-Host "   Email: test.pharmacist@healthlink.com" -ForegroundColor Gray
} catch {
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorBody.error -like "*already exists*") {
        Write-Host "INFO: Pharmacist user already exists" -ForegroundColor Blue
    } else {
        Write-Host "FAILED: $($errorBody.error)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 2: Create Hospital Admin
Write-Host "Creating Hospital Admin User..." -ForegroundColor Yellow
$hospitalBody = @{
    email = "test.hospital.admin@healthlink.com"
    password = "Test123!@#"
    fullName = "Test Hospital Admin"
    role = "hospital_admin"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/register" -Method POST -Body $hospitalBody -ContentType "application/json"
    Write-Host "SUCCESS: Hospital Admin created!" -ForegroundColor Green
    Write-Host "   Email: test.hospital.admin@healthlink.com" -ForegroundColor Gray
} catch {
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorBody.error -like "*already exists*") {
        Write-Host "INFO: Hospital Admin user already exists" -ForegroundColor Blue
    } else {
        Write-Host "FAILED: $($errorBody.error)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 3: Create Insurance
Write-Host "Creating Insurance User..." -ForegroundColor Yellow
$insuranceBody = @{
    email = "test.insurance@healthlink.com"
    password = "Test123!@#"
    fullName = "Test Insurance Agent"
    role = "insurance"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/register" -Method POST -Body $insuranceBody -ContentType "application/json"
    Write-Host "SUCCESS: Insurance user created!" -ForegroundColor Green
    Write-Host "   Email: test.insurance@healthlink.com" -ForegroundColor Gray
} catch {
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorBody.error -like "*already exists*") {
        Write-Host "INFO: Insurance user already exists" -ForegroundColor Blue
    } else {
        Write-Host "FAILED: $($errorBody.error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "User Creation Tests Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor White
Write-Host "  Pharmacist:     test.pharmacist@healthlink.com     / Test123!@#" -ForegroundColor Cyan
Write-Host "  Hospital Admin: test.hospital.admin@healthlink.com / Test123!@#" -ForegroundColor Cyan
Write-Host "  Insurance:      test.insurance@healthlink.com      / Test123!@#" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: Start frontend with 'npm run dev' and login at http://localhost:9002/signin" -ForegroundColor Yellow
Write-Host ""
