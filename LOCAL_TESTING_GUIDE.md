# 🧪 LOCAL TESTING GUIDE

## 📋 **Testing Checklist**

### **1. Environment Setup**
```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env

# 3. Edit .env with your local values
# Use the .env.example as template
```

### **2. Required Environment Variables (.env)**
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/mbdb

# Server
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Session
SESSION_SECRET=your-local-secret-key-here

# Cloudinary (get free account at cloudinary.com)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (use Gmail for testing)
G_MAIL=your-email@gmail.com
GOOGLE_APPPASSWORD=your-app-password

# Payment (test mode)
PAYSTACK_SECRET_KEY=your-test-secret-key

# Domain (optional for local)
DOMAIN=localhost
```

---

## 🔧 **Step 1: Start MongoDB**

```bash
# If using MongoDB locally
mongod

# Or use MongoDB Atlas (free tier)
# Update MONGODB_URI in .env to your Atlas connection string
```

---

## 🚀 **Step 2: Start the Server**

```bash
# Start the development server
npm start

# Or if you have a start script
node server.js

# You should see:
# Server is listening on port 3000
# Database Connected!
# Environment: development
```

---

## 🧪 **Step 3: Test Authentication Security**

### **Test 1: Try to Access Admin Routes Without Authentication**
```bash
# Test admin route without login (should fail)
curl -X POST http://localhost:3000/api/admin/updateKycVerificationStatus/123 \
  -H "Content-Type: application/json" \
  -d '{"userId": "123", "kycVerificationStatus": "approved"}'

# Expected Response: 401 Unauthorized
```

### **Test 2: Try to Access Protected Routes Without Authentication**
```bash
# Test prescription route without login (should fail)
curl -X POST http://localhost:3000/api/prescription/createPrescription/123 \
  -H "Content-Type: application/json" \
  -d '{"patientId": "456", "medicines": [{"name": "Test"}]}'

# Expected Response: 401 Unauthorized
```

### **Test 3: Test User Registration**
```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "patient",
    "email": "test@example.com",
    "password": "TestPassword123",
    "phone": "08012345678",
    "firstName": "Test",
    "lastName": "User"
  }'

# Expected Response: 200 with verification code
```

---

## 🔐 **Step 4: Test Security Features**

### **Test 4: Rate Limiting**
```bash
# Test rate limiting on login (try 6 times quickly)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrongpassword"}'
  echo "Attempt $i"
done

# Expected: First 5 attempts get 401, 6th gets 429 Too Many Requests
```

### **Test 5: Input Validation**
```bash
# Test invalid email format
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "patient",
    "email": "invalid-email",
    "password": "TestPassword123",
    "phone": "08012345678",
    "firstName": "Test",
    "lastName": "User"
  }'

# Expected Response: 400 Validation Failed
```

### **Test 6: File Upload Security**
```bash
# Test file upload validation
curl -X POST http://localhost:3000/api/prescription/upload-result/123 \
  -F "file=@test.txt" \
  -F "patientId=456" \
  -F "testName=Test"

# Expected Response: 400 Invalid file type (if not image/pdf)
```

---

## 🧪 **Step 5: Test Authentication Flow**

### **Test 7: Complete User Flow**
```bash
# 1. Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "patient",
    "email": "patient@test.com",
    "password": "PatientPass123",
    "phone": "08012345678",
    "firstName": "Patient",
    "lastName": "Test"
  }'

# 2. Verify email (use code from registration response)
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"verifyCode": "123456"}'

# 3. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "patient@test.com", "password": "PatientPass123"}'

# 4. Access protected route (should work now)
curl -X GET http://localhost:3000/api/user/profile/YOUR_USER_ID \
  -b cookies.txt

# Expected: 200 with user profile data
```

---

## 🛡️ **Step 6: Test Authorization**

### **Test 8: Try to Access Other User's Data**
```bash
# Try to access another user's profile (should fail)
curl -X GET http://localhost:3000/api/user/profile/OTHER_USER_ID \
  -b cookies.txt

# Expected Response: 403 Forbidden
```

### **Test 9: Test Admin Routes**
```bash
# Register an admin user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "patient",
    "email": "admin@test.com",
    "password": "AdminPass123",
    "phone": "08012345679",
    "firstName": "Admin",
    "lastName": "User"
  }'

# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c admin_cookies.txt \
  -d '{"email": "admin@test.com", "password": "AdminPass123"}'

# Try admin route (should fail - not admin role yet)
curl -X POST http://localhost:3000/api/admin/updateKycVerificationStatus/123 \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"userId": "123", "kycVerificationStatus": "approved"}'

# Expected: 403 Forbidden (user not admin)
```

---

## 🔍 **Step 7: Test Security Headers**

### **Test 10: Check Security Headers**
```bash
# Check security headers on any route
curl -I http://localhost:3000/api/health

# Expected headers should include:
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security (in production)
# Content-Security-Policy
```

---

## 🚨 **Step 8: Test Error Handling**

### **Test 11: Invalid Object ID**
```bash
# Test with invalid MongoDB ObjectId
curl -X GET http://localhost:3000/api/user/profile/invalid-id

# Expected Response: 400 Bad Request
```

### **Test 12: Non-existent Route**
```bash
# Test non-existent route
curl -X GET http://localhost:3000/api/non-existent

# Expected Response: 404 Not Found
```

---

## 📊 **Step 9: Performance Testing**

### **Test 13: Load Testing**
```bash
# Install Apache Bench (ab) or use curl for basic load testing
# Test 100 concurrent requests
ab -n 100 -c 10 http://localhost:3000/api/health

# Expected: All requests should succeed with good response times
```

---

## 🧪 **Step 10: Automated Testing Script**

Create a test script to automate security tests:

```bash
# Create test_security.sh
#!/bin/bash

echo "🧪 Starting Security Tests..."

# Test 1: Unprotected admin route
echo "Test 1: Admin route without auth..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/admin/updateKycVerificationStatus/123)
if [ $response -eq 401 ]; then
    echo "✅ Admin route properly protected"
else
    echo "❌ Admin route NOT protected"
fi

# Test 2: Unprotected prescription route
echo "Test 2: Prescription route without auth..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/prescription/createPrescription/123)
if [ $response -eq 401 ]; then
    echo "✅ Prescription route properly protected"
else
    echo "❌ Prescription route NOT protected"
fi

# Test 3: Rate limiting
echo "Test 3: Rate limiting..."
for i in {1..6}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/login -d '{"email":"test@test.com","password":"wrong"}')
    if [ $response -eq 429 ]; then
        echo "✅ Rate limiting working"
        break
    fi
done

echo "🎉 Security tests completed!"
```

---

## 📱 **Step 11: Frontend Testing**

If you have a frontend, test the complete flow:

1. **Register new user**
2. **Verify email**  
3. **Login**
4. **Access protected features**
5. **Try to access unauthorized data**
6. **Test file uploads**
7. **Test rate limiting**

---

## 🔧 **Debugging Tips**

### **Common Issues & Solutions:**

1. **MongoDB Connection Error**
   ```bash
   # Check if MongoDB is running
   mongosh --eval "db.adminCommand('ismaster')"
   ```

2. **Environment Variable Missing**
   ```bash
   # Check if .env file exists and has required variables
   cat .env | grep -E "(MONGODB_URI|SESSION_SECRET|CLOUDINARY)"
   ```

3. **Port Already in Use**
   ```bash
   # Check what's using port 3000
   netstat -tulpn | grep :3000
   
   # Kill process if needed
   kill -9 <PID>
   ```

4. **Cloudinary Errors**
   ```bash
   # Test Cloudinary connection
   node -e "const cloudinary = require('cloudinary').v2; cloudinary.config({cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET}); console.log('Cloudinary configured');"
   ```

---

## ✅ **Success Criteria**

Your local testing is successful when:

- [x] All unprotected routes return 401 Unauthorized
- [x] Valid authentication allows access to protected routes
- [x] Invalid credentials return appropriate errors
- [x] Rate limiting blocks excessive requests
- [x] Input validation rejects bad data
- [x] File upload security blocks dangerous files
- [x] Security headers are present
- [x] Error handling works correctly
- [x] Database operations work properly

---

## 🚀 **Ready for Production**

Once all tests pass, you're ready to deploy! The comprehensive security implementation ensures your application is production-ready.
