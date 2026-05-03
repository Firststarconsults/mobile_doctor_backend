# Frontend Integration Guide - Mobile Doctor API

Hey team! This guide will walk you through integrating our JWT authentication into your frontend app. It's pretty straightforward once you get the hang of it.

## What's Changed?

We switched from session-based auth to JWT (JSON Web Tokens). This means instead of relying on cookies, you'll now get a token when you log in and send that token with every request that needs authentication.

---

## Getting Started

### Step 1: Login and Store the Token

When a user logs in successfully, the API will return a token. Grab it and store it somewhere safe (localStorage, AsyncStorage, etc.):

**React/React Native:**
```javascript
const login = async (email, password) => {
  try {
    const response = await fetch('https://mobile-doctor-api.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (data.token) {
      // Save this token - you'll need it for everything else
      localStorage.setItem('authToken', data.token);  // Web
      // OR
      await AsyncStorage.setItem('authToken', data.token);  // React Native
      
      return { success: true, user: data.user };
    }
  } catch (error) {
    console.error('Login failed:', error);
    return { success: false, error: error.message };
  }
};
```

---

### Step 2: Send the Token With Every Request

For any endpoint that requires authentication, you MUST include the token in the Authorization header:

```javascript
const token = localStorage.getItem('authToken');  // Or AsyncStorage for mobile

const fetchWalletBalance = async (userId) => {
  const response = await fetch(
    `https://mobile-doctor-api.onrender.com/api/auth/wallet-balance/${userId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // This is the important part!
      }
    }
  );
  
  return response.json();
};
```

**The format is always:** `Authorization: Bearer YOUR_TOKEN_HERE`

---

### Step 3: Handle 401 Errors (Token Expired)

Tokens expire after 24 hours. If you get a 401, send the user back to login:

```javascript
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('authToken');
    window.location.href = '/login';  // Redirect to login
    return;
  }
  
  return response.json();
};
```

---

## Common API Endpoints

Here's a quick reference for the most used endpoints:

### Authentication
| Endpoint | Method | Body | Auth Required |
|----------|--------|------|---------------|
| `/api/auth/login` | POST | `{ email, password }` | No |
| `/api/auth/register` | POST | `{ email, password, firstName, lastName, ... }` | No |
| `/api/auth/logout` | POST | - | Yes |
| `/api/auth/verify` | POST | `{ code }` | Yes |

### Wallet & Payments
| Endpoint | Method | Body | Auth Required |
|----------|--------|------|---------------|
| `/api/auth/wallet-balance/:userId` | GET | - | Yes |
| `/api/auth/fund-wallet/:userId` | POST | `{ amount }` | Yes |
| `/api/auth/withdraw/:userId` | POST | `{ amount, accountNumber, bankName, bankCode }` | Yes |

### User Profile
| Endpoint | Method | Body | Auth Required |
|----------|--------|------|---------------|
| `/api/users/profile/:userId` | GET | - | Yes |
| `/api/users/updateProfile/:userId` | PUT | Profile fields | Yes |
| `/api/users/reset-password/:userId` | PUT | `{ currentPassword, newPassword }` | Yes |

---

## Complete Example: Wallet Funding

Here's a real-world example of funding a wallet:

```javascript
const fundWallet = async (userId, amount) => {
  try {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(
      `https://mobile-doctor-api.onrender.com/api/auth/fund-wallet/${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      }
    );
    
    const data = await response.json();
    
    if (data.success && data.authorizationUrl) {
      // Redirect user to Paystack to complete payment
      window.location.href = data.authorizationUrl;
    } else {
      throw new Error(data.message || 'Failed to initiate payment');
    }
  } catch (error) {
    console.error('Wallet funding error:', error);
    throw error;
  }
};
```

---

## Testing Credentials

If you need to test with a real account:
- **Email:** opuaye.reginald@gmail.com
- **Password:** @19June@2016
- **User ID:** 69cedb14ad4a10d1a33815c7

---

## Troubleshooting

### Getting 401 on every request?
- Check that you're sending `Authorization: Bearer TOKEN` (not just the token)
- Make sure there's a space between "Bearer" and your token
- Verify the token hasn't expired (log in again to get a fresh one)

### Token not being saved?
- Check your browser's dev tools → Application → Local Storage
- On mobile, use React Native Debugger or console logs

### CORS errors?
- Make sure you're hitting `https://mobile-doctor-api.onrender.com` (not http)
- Check that your Content-Type header is set correctly

---

## Need Help?

If something's not working:
1. Check the browser console for error messages
2. Verify the token is being sent in the request headers (Network tab)
3. Test the same request in Postman first to isolate frontend vs backend issues

Good luck with the integration! 🚀
