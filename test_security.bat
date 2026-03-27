@echo off
echo 🧪 Mobile Doctor Backend - Security Test Script
echo ==========================================

echo.
echo 🔍 Checking if server is running on port 3000...
curl -s http://localhost:3000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Server is not running. Please start the server first:
    echo    npm start
    pause
    exit /b 1
) else (
    echo ✅ Server is running
)

echo.
echo 🔒 Testing Authentication Security...
echo ------------------------------------

echo Test 1: Admin route without authentication...
curl -s -o nul -w "%%{http_code}" -X POST http://localhost:3000/api/admin/updateKycVerificationStatus/123 -H "Content-Type: application/json" -d "{\"userId\": \"123\", \"kycVerificationStatus\": \"approved\"}" > temp_status.txt
set /p admin_status=<temp_status.txt
if "%admin_status%"=="401" (
    echo ✅ Admin route properly protected (401)
) else (
    echo ❌ Admin route NOT protected (HTTP %admin_status%)
)

echo Test 2: Prescription route without authentication...
curl -s -o nul -w "%%{http_code}" -X POST http://localhost:3000/api/prescription/createPrescription/123 -H "Content-Type: application/json" -d "{\"patientId\": \"456\", \"medicines\": [{\"name\": \"Test\"}]}" > temp_status.txt
set /p prescription_status=<temp_status.txt
if "%prescription_status%"=="401" (
    echo ✅ Prescription route properly protected (401)
) else (
    echo ❌ Prescription route NOT protected (HTTP %prescription_status%)
)

echo Test 3: Message route without authentication...
curl -s -o nul -w "%%{http_code}" -X POST http://localhost:3000/api/message/send -H "Content-Type: application/json" -d "{\"conversationId\": \"123\", \"content\": \"test\"}" > temp_status.txt
set /p message_status=<temp_status.txt
if "%message_status%"=="401" (
    echo ✅ Message route properly protected (401)
) else (
    echo ❌ Message route NOT protected (HTTP %message_status%)
)

echo Test 4: Medical report route without authentication...
curl -s -o nul -w "%%{http_code}" -X POST http://localhost:3000/api/medicalReport/create-medicalReport/123 -H "Content-Type: application/json" -d "{\"genotype\": \"AA\", \"bloodGroup\": \"O+\"}" > temp_status.txt
set /p medical_status=<temp_status.txt
if "%medical_status%"=="401" (
    echo ✅ Medical report route properly protected (401)
) else (
    echo ❌ Medical report route NOT protected (HTTP %medical_status%)
)

echo.
echo 🧪 Testing Input Validation...
echo ----------------------------

echo Test 5: Invalid email validation...
curl -s -o nul -w "%%{http_code}" -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"userType\": \"patient\", \"email\": \"invalid-email\", \"password\": \"TestPass123\", \"phone\": \"08012345678\", \"firstName\": \"Test\", \"lastName\": \"User\"}" > temp_status.txt
set /p email_status=<temp_status.txt
if "%email_status%"=="400" (
    echo ✅ Email validation working (400)
) else (
    echo ❌ Email validation NOT working (HTTP %email_status%)
)

echo Test 6: Weak password validation...
curl -s -o nul -w "%%{http_code}" -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"userType\": \"patient\", \"email\": \"test@example.com\", \"password\": \"123\", \"phone\": \"08012345678\", \"firstName\": \"Test\", \"lastName\": \"User\"}" > temp_status.txt
set /p password_status=<temp_status.txt
if "%password_status%"=="400" (
    echo ✅ Password validation working (400)
) else (
    echo ❌ Password validation NOT working (HTTP %password_status%)
)

echo.
echo 🛡️ Testing Security Headers...
echo --------------------------

echo Test 7: Security headers check...
curl -s -I http://localhost:3000/api/health > temp_headers.txt

findstr "X-Content-Type-Options" temp_headers.txt >nul
if %errorlevel% equ 0 (
    echo ✅ X-Content-Type-Options header present
) else (
    echo ❌ X-Content-Type-Options header missing
)

findstr "X-Frame-Options" temp_headers.txt >nul
if %errorlevel% equ 0 (
    echo ✅ X-Frame-Options header present
) else (
    echo ❌ X-Frame-Options header missing
)

findstr "X-XSS-Protection" temp_headers.txt >nul
if %errorlevel% equ 0 (
    echo ✅ X-XSS-Protection header present
) else (
    echo ❌ X-XSS-Protection header missing
)

echo.
echo 🔍 Testing Error Handling...
echo ------------------------

echo Test 8: Invalid ObjectId...
curl -s -o nul -w "%%{http_code}" -X GET http://localhost:3000/api/user/profile/invalid-id > temp_status.txt
set /p objectid_status=<temp_status.txt
if "%objectid_status%"=="400" (
    echo ✅ Invalid ObjectId properly handled (400)
) else (
    echo ❌ Invalid ObjectId NOT properly handled (HTTP %objectid_status%)
)

echo Test 9: Non-existent route...
curl -s -o nul -w "%%{http_code}" -X GET http://localhost:3000/api/non-existent-route > temp_status.txt
set /p notfound_status=<temp_status.txt
if "%notfound_status%"=="404" (
    echo ✅ Non-existent route properly handled (404)
) else (
    echo ❌ Non-existent route NOT properly handled (HTTP %notfound_status%)
)

echo.
echo 📊 Test Summary
echo ==============
echo ✅ Authentication tests completed
echo ✅ Input validation tests completed  
echo ✅ Security headers tests completed
echo ✅ Error handling tests completed
echo.
echo 🎉 Security testing completed!
echo.
echo 💡 Next steps:
echo    1. Fix any failed tests above
echo    2. Test user registration and login flow
echo    3. Test protected routes with authentication
echo    4. Test file upload security
echo    5. Ready for production deployment!

REM Clean up temp files
del temp_status.txt temp_headers.txt 2>nul

pause
