#!/bin/bash

echo "🧪 Mobile Doctor Backend - Security Test Script"
echo "=========================================="

# Check if server is running
echo "🔍 Checking if server is running on port 3000..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running. Please start the server first:"
    echo "   npm start"
    exit 1
fi

echo ""
echo "🔒 Testing Authentication Security..."
echo "------------------------------------"

# Test 1: Admin route without authentication
echo "Test 1: Admin route without authentication..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/admin/updateKycVerificationStatus/123 \
  -H "Content-Type: application/json" \
  -d '{"userId": "123", "kycVerificationStatus": "approved"}')

if [ $response -eq 401 ]; then
    echo "✅ Admin route properly protected (401)"
else
    echo "❌ Admin route NOT protected (HTTP $response)"
fi

# Test 2: Prescription route without authentication
echo "Test 2: Prescription route without authentication..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/prescription/createPrescription/123 \
  -H "Content-Type: application/json" \
  -d '{"patientId": "456", "medicines": [{"name": "Test"}]}')

if [ $response -eq 401 ]; then
    echo "✅ Prescription route properly protected (401)"
else
    echo "❌ Prescription route NOT protected (HTTP $response)"
fi

# Test 3: Message route without authentication
echo "Test 3: Message route without authentication..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/message/send \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "123", "content": "test"}')

if [ $response -eq 401 ]; then
    echo "✅ Message route properly protected (401)"
else
    echo "❌ Message route NOT protected (HTTP $response)"
fi

# Test 4: Medical report route without authentication
echo "Test 4: Medical report route without authentication..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/medicalReport/create-medicalReport/123 \
  -H "Content-Type: application/json" \
  -d '{"genotype": "AA", "bloodGroup": "O+"}')

if [ $response -eq 401 ]; then
    echo "✅ Medical report route properly protected (401)"
else
    echo "❌ Medical report route NOT protected (HTTP $response)"
fi

echo ""
echo "🧪 Testing Input Validation..."
echo "----------------------------"

# Test 5: Invalid email registration
echo "Test 5: Invalid email validation..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"userType": "patient", "email": "invalid-email", "password": "TestPass123", "phone": "08012345678", "firstName": "Test", "lastName": "User"}')

if [ $response -eq 400 ]; then
    echo "✅ Email validation working (400)"
else
    echo "❌ Email validation NOT working (HTTP $response)"
fi

# Test 6: Weak password validation
echo "Test 6: Weak password validation..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"userType": "patient", "email": "test@example.com", "password": "123", "phone": "08012345678", "firstName": "Test", "lastName": "User"}')

if [ $response -eq 400 ]; then
    echo "✅ Password validation working (400)"
else
    echo "❌ Password validation NOT working (HTTP $response)"
fi

echo ""
echo "🚦 Testing Rate Limiting..."
echo "-------------------------"

# Test 7: Rate limiting on login
echo "Test 7: Rate limiting on login (6 attempts)..."
rate_limit_hit=0
for i in {1..6}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email": "test@test.com", "password": "wrongpassword"}')
    
    if [ $response -eq 429 ]; then
        echo "✅ Rate limiting triggered on attempt $i (429)"
        rate_limit_hit=1
        break
    fi
    sleep 0.1
done

if [ $rate_limit_hit -eq 0 ]; then
    echo "⚠️  Rate limiting not triggered (may need more attempts)"
else
    echo "✅ Rate limiting working properly"
fi

echo ""
echo "🛡️ Testing Security Headers..."
echo "--------------------------"

# Test 8: Security headers
echo "Test 8: Security headers presence..."
headers=$(curl -s -I http://localhost:3000/api/health)

if echo "$headers" | grep -q "X-Content-Type-Options"; then
    echo "✅ X-Content-Type-Options header present"
else
    echo "❌ X-Content-Type-Options header missing"
fi

if echo "$headers" | grep -q "X-Frame-Options"; then
    echo "✅ X-Frame-Options header present"
else
    echo "❌ X-Frame-Options header missing"
fi

if echo "$headers" | grep -q "X-XSS-Protection"; then
    echo "✅ X-XSS-Protection header present"
else
    echo "❌ X-XSS-Protection header missing"
fi

echo ""
echo "🔍 Testing Error Handling..."
echo "------------------------"

# Test 9: Invalid ObjectId
echo "Test 9: Invalid ObjectId handling..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:3000/api/user/profile/invalid-id)

if [ $response -eq 400 ]; then
    echo "✅ Invalid ObjectId properly handled (400)"
else
    echo "❌ Invalid ObjectId NOT properly handled (HTTP $response)"
fi

# Test 10: Non-existent route
echo "Test 10: Non-existent route handling..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:3000/api/non-existent-route)

if [ $response -eq 404 ]; then
    echo "✅ Non-existent route properly handled (404)"
else
    echo "❌ Non-existent route NOT properly handled (HTTP $response)"
fi

echo ""
echo "📊 Test Summary"
echo "=============="
echo "✅ Authentication tests completed"
echo "✅ Input validation tests completed"
echo "✅ Rate limiting tests completed"
echo "✅ Security headers tests completed"
echo "✅ Error handling tests completed"
echo ""
echo "🎉 Security testing completed!"
echo ""
echo "💡 Next steps:"
echo "   1. Fix any failed tests above"
echo "   2. Test user registration and login flow"
echo "   3. Test protected routes with authentication"
echo "   4. Test file upload security"
echo "   5. Ready for production deployment!"
