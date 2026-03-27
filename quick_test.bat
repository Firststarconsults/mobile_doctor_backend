@echo off
echo 🧪 Quick Security Test
echo ====================

echo.
echo 1. Testing server health...
curl -s -w "Health Check: HTTP %%{http_code}%%n" http://localhost:3000/api/health

echo.
echo 2. Testing admin route without auth (should fail)...
curl -s -w "Admin Route (no auth): HTTP %%{http_code}%%n" -X POST http://localhost:3000/api/admin/updateKycVerificationStatus/123 -H "Content-Type: application/json" -d "{\"userId\": \"123\", \"kycVerificationStatus\": \"approved\"}"

echo.
echo 3. Testing prescription route without auth (should fail)...
curl -s -w "Prescription Route (no auth): HTTP %%{http_code}%%n" -X POST http://localhost:3000/api/prescription/createPrescription/123 -H "Content-Type: application/json" -d "{\"patientId\": \"456\", \"medicines\": [{\"name\": \"Test\"}]}"

echo.
echo 4. Testing user registration with invalid email (should fail)...
curl -s -w "Invalid Email: HTTP %%{http_code}%%n" -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"userType\": \"patient\", \"email\": \"invalid-email\", \"password\": \"TestPass123\", \"phone\": \"08012345678\", \"firstName\": \"Test\", \"lastName\": \"User\"}"

echo.
echo 5. Testing user registration with valid data (should work)...
curl -s -w "Valid Registration: HTTP %%{http_code}%%n" -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"userType\": \"patient\", \"email\": \"test@example.com\", \"password\": \"TestPassword123\", \"phone\": \"08012345678\", \"firstName\": \"Test\", \"lastName\": \"User\"}"

echo.
echo 6. Testing security headers...
curl -s -I http://localhost:3000/api/health | findstr "X-Content-Type-Options" >nul
if %%errorlevel%% equ 0 (
    echo ✅ Security headers present
) else (
    echo ❌ Security headers missing
)

echo.
echo 🎉 Quick security test completed!
echo.
echo 💡 Expected results:
echo    - Health check: 200
echo    - Admin route (no auth): 401 or 403
echo    - Prescription route (no auth): 401 or 403
echo    - Invalid email: 400
echo    - Valid registration: 200
echo    - Security headers: Present
echo.
echo 📝 Check the results above to verify security fixes are working!

pause
