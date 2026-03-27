# PowerShell Security Test Script
Write-Host "🧪 Mobile Doctor Backend - Security Test" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

Write-Host ""
Write-Host "1. Testing server health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get
    Write-Host "✅ Health check: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Server not responding" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Testing admin route without auth (should fail)..." -ForegroundColor Yellow
try {
    $body = @{
        userId = "123"
        kycVerificationStatus = "approved"
    } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/updateKycVerificationStatus/123" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Admin route (no auth): $($response.StatusCode)" -ForegroundColor $(if($response.StatusCode -eq 401 -or $response.StatusCode -eq 403) {"Green"} else {"Red"})
} catch {
    Write-Host "❌ Admin route test failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Testing prescription route without auth (should fail)..." -ForegroundColor Yellow
try {
    $body = @{
        patientId = "456"
        medicines = @(
            @{
                name = "Test"
            }
        )
    } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/prescription/createPrescription/123" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Prescription route (no auth): $($response.StatusCode)" -ForegroundColor $(if($response.StatusCode -eq 401 -or $response.StatusCode -eq 403) {"Green"} else {"Red"})
} catch {
    Write-Host "❌ Prescription route test failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Testing invalid email validation (should fail)..." -ForegroundColor Yellow
try {
    $body = @{
        userType = "patient"
        email = "invalid-email"
        password = "TestPass123"
        phone = "08012345678"
        firstName = "Test"
        lastName = "User"
    } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Invalid email validation: $($response.StatusCode)" -ForegroundColor $(if($response.StatusCode -eq 400) {"Green"} else {"Red"})
} catch {
    Write-Host "❌ Email validation test failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "5. Testing valid registration (should work)..." -ForegroundColor Yellow
try {
    $body = @{
        userType = "patient"
        email = "test@example.com"
        password = "TestPassword123"
        phone = "08012345678"
        firstName = "Test"
        lastName = "User"
    } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Valid registration: $($response.StatusCode)" -ForegroundColor $(if($response.StatusCode -eq 200) {"Green"} else {"Red"})
} catch {
    Write-Host "❌ Registration test failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "6. Testing security headers..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -Headers @{"Accept"="application/json"}
    $hasContentSecurity = $response.Headers.ContainsKey("X-Content-Type-Options")
    $hasFrameOptions = $response.Headers.ContainsKey("X-Frame-Options")
    $hasXSSProtection = $response.Headers.ContainsKey("X-XSS-Protection")
    
    if ($hasContentSecurity -and $hasFrameOptions -and $hasXSSProtection) {
        Write-Host "✅ Security headers present" -ForegroundColor Green
    } else {
        Write-Host "❌ Some security headers missing" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Security headers test failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Security testing completed!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Expected results:" -ForegroundColor Cyan
Write-Host "   - Health check: 200" -ForegroundColor White
Write-Host "   - Admin route (no auth): 401 or 403" -ForegroundColor White
Write-Host "   - Prescription route (no auth): 401 or 403" -ForegroundColor White
Write-Host "   - Invalid email: 400" -ForegroundColor White
Write-Host "   - Valid registration: 200" -ForegroundColor White
Write-Host "   - Security headers: Present" -ForegroundColor White
Write-Host ""
Write-Host "📝 Check the results above to verify security fixes are working!" -ForegroundColor Cyan
