# Postman Testing Guide - Mobile Doctor Backend

## 🔧 Base URL
```
Production: https://mobile-doctor-api.onrender.com/api
```

---

## 📝 Collection: Authentication

### 1. **Login (Get JWT Token)**
```
POST /auth/login
Content-Type: application/json

Body:
{
  "username": "your-email@example.com",
  "password": "your-password"
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Successfully logged in",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "your-email@example.com",
    "role": "patient",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Save the `token` value for next requests!**

---

### 2. **Fund Wallet (Using JWT Token)**
```
POST /auth/fund-wallet/:userId
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

Body:
{
  "amount": 1000
}
```

**Headers to Set in Postman:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |

**Expected Response (200 OK):**
```json
{
  "success": true,
  "authorizationUrl": "https://checkout.paystack.com/..."
}
```

---

### 3. **Get User Profile (Using JWT Token)**
```
GET /users/profile/:userId
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response (200 OK):**
```json
{
  "profilePhoto": "...",
  "firstName": "John",
  "lastName": "Doe",
  "role": "patient",
  "email": "your-email@example.com"
}
```

---

### 4. **Logout**
```
GET /auth/logout
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response (200 OK):**
```json
{
  "message": "Successfully logged out",
  "note": "Please remove the JWT token from client storage"
}
```

---

### 5. **Check Wallet Balance**
```
GET /auth/wallet-balance/:userId
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "walletBalance": 5000
}
```

---

## ⚠️ Common Errors

### 401 Unauthorized
**Cause:** Missing or invalid JWT token  
**Fix:** Add `Authorization: Bearer <token>` header

### 403 Forbidden
**Cause:** Trying to access another user's resources  
**Fix:** Ensure `userId` in URL matches the authenticated user

### 500 Internal Server Error
**Cause:** JWT_SECRET not set on Render  
**Fix:** Add `JWT_SECRET` environment variable in Render dashboard

---

## 🎯 Postman Setup Steps

### Step 1: Create Environment
```
Click gear icon (⚙️) → Manage Environments → Add

Variable Name    | Initial Value                    | Current Value
----------------|----------------------------------|------------------
base_url        | https://mobile-doctor-api.onrender.com/api | (same)
jwt_token       | (empty)                          | (will be filled after login)
user_id         | (empty)                          | (will be filled after login)
```

### Step 2: Use Variables in Requests
Instead of hardcoded values, use:
- URL: `{{base_url}}/auth/fund-wallet/{{user_id}}`
- Header: `Authorization: Bearer {{jwt_token}}`

### Step 3: Set Variables After Login
1. Run Login request
2. Go to "Tests" tab in Login request
3. Add this script to auto-save token:

```javascript
var jsonData = pm.response.json();
pm.environment.set("jwt_token", jsonData.token);
pm.environment.set("user_id", jsonData.user.id);
```

---

## 🧪 Test Collection (Import to Postman)

```json
{
  "info": {
    "name": "Mobile Doctor Backend",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Login",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "url": "{{base_url}}/auth/login",
        "body": {
          "mode": "raw",
          "raw": "{\"username\":\"your-email@example.com\",\"password\":\"your-password\"}"
        }
      }
    },
    {
      "name": "2. Fund Wallet",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Content-Type", "value": "application/json"},
          {"key": "Authorization", "value": "Bearer {{jwt_token}}"}
        ],
        "url": "{{base_url}}/auth/fund-wallet/{{user_id}}",
        "body": {
          "mode": "raw",
          "raw": "{\"amount\": 1000}"
        }
      }
    },
    {
      "name": "3. Get Profile",
      "request": {
        "method": "GET",
        "header": [{"key": "Authorization", "value": "Bearer {{jwt_token}}"}],
        "url": "{{base_url}}/users/profile/{{user_id}}"
      }
    },
    {
      "name": "4. Check Balance",
      "request": {
        "method": "GET",
        "header": [{"key": "Authorization", "value": "Bearer {{jwt_token}}"}],
        "url": "{{base_url}}/auth/wallet-balance/{{user_id}}"
      }
    }
  ]
}
```

---

## 🚀 Quick Test Using curl

### 1. Login
```bash
curl -X POST https://mobile-doctor-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-email@example.com","password":"your-password"}'
```

### 2. Fund Wallet (replace TOKEN and USER_ID)
```bash
curl -X POST https://mobile-doctor-api.onrender.com/api/auth/fund-wallet/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"amount": 1000}'
```

---

## ✅ Success Criteria

| Test | Success Indicator |
|------|-------------------|
| Login | Returns `token` field in response |
| Fund Wallet | Returns `authorizationUrl` from Paystack |
| Get Profile | Returns user data without 401 error |
| Logout | Returns success message |

**All tests passing = JWT authentication is working correctly! 🎉**
