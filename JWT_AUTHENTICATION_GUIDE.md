# JWT Authentication Guide for Frontend Developers

## 🎉 JWT Authentication is Now Implemented!

The backend now supports **JWT (JSON Web Token)** authentication alongside the existing session-based auth. This solves the 401 authentication errors.

---

## 🔑 How JWT Authentication Works

### 1. **Login** → Get JWT Token
### 2. **Store Token** → Save in app state/local storage
### 3. **Send Token** → Include in all API requests via `Authorization` header

---

## 📱 Implementation Guide

### **Step 1: Login and Get Token**

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Successfully logged in",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "role": "patient",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

### **Step 2: Store the Token**

**React/React Native:**
```javascript
// After login
const data = await response.json();
const token = data.token;

// Store token
localStorage.setItem('token', token);        // Web
AsyncStorage.setItem('token', token);        // React Native
```

**Flutter:**
```dart
// Store token
await storage.write(key: 'token', value: token);
```

---

### **Step 3: Include Token in API Requests**

**JavaScript/Fetch:**
```javascript
const token = localStorage.getItem('token');

const response = await fetch('https://mobile-doctor-api.onrender.com/api/auth/fund-wallet/USER_ID', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,  // ← REQUIRED!
  },
  body: JSON.stringify({ amount: 1000 }),
});
```

**Axios:**
```javascript
const token = localStorage.getItem('token');

const api = axios.create({
  baseURL: 'https://mobile-doctor-api.onrender.com/api',
  headers: {
    'Authorization': `Bearer ${token}`,  // ← REQUIRED!
  },
});
```

**Flutter/Dart:**
```dart
final token = await storage.read(key: 'token');

final response = await http.post(
  Uri.parse('https://mobile-doctor-api.onrender.com/api/auth/fund-wallet/$userId'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token',  // ← REQUIRED!
  },
  body: jsonEncode({'amount': 1000}),
);
```

---

## 📋 Important Headers Format

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer YOUR_JWT_TOKEN` | ✅ YES |
| `Content-Type` | `application/json` | ✅ YES (for POST/PUT) |

---

## 🔒 Protected Endpoints (Require JWT Token)

All these endpoints need the `Authorization: Bearer {token}` header:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/fund-wallet/:userId` | POST | Wallet funding |
| `/auth/wallet-balance/:userId` | GET | Check balance |
| `/auth/transaction-history/:userId` | GET | Transaction history |
| `/auth/withdraw/:userId` | POST | Request withdrawal |
| `/auth/verify` | POST | Email verification |
| `/users/update-profile/:userId` | PUT | Update profile |
| `/users/change-password/:userId` | PUT | Change password |

---

## ⚠️ Common Mistakes

### ❌ **Wrong (No Token)**
```javascript
fetch('/api/auth/fund-wallet/123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 1000 }),
});
// → Returns 401 Unauthorized
```

### ✅ **Correct (With Token)**
```javascript
fetch('/api/auth/fund-wallet/123', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,  // ← ADD THIS!
  },
  body: JSON.stringify({ amount: 1000 }),
});
// → Returns 200 Success
```

---

## 🔄 Token Expiration

- **Token expires:** After 24 hours
- **On 401 error:** Redirect user to login screen
- **Refresh:** User must login again to get new token

---

## 🧪 Test Example

```bash
curl -X POST https://mobile-doctor-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test@test.com","password":"password123"}'

# Copy the token from response, then:

curl -X POST https://mobile-doctor-api.onrender.com/api/auth/fund-wallet/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"amount": 500}'
```

---

## 📝 Summary

1. **Login** → Get `token` from response
2. **Store** → Save token locally
3. **Send** → Add `Authorization: Bearer {token}` to ALL protected API calls
4. **Handle 401** → Redirect to login if token expires

**That's it! Your authentication issues should be resolved.** 🎉

---

## 🆘 Need Help?

If you still get 401 errors:
1. Check token is being sent (use browser dev tools)
2. Verify `Authorization` header format: `Bearer {token}`
3. Check token hasn't expired (login again)
4. Ensure user ID in URL matches logged-in user (unless admin)
