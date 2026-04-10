# Mobile Doctor API - Wallet Funding Documentation

## 🔗 Base URL
```
https://mobile-doctor-api.onrender.com/api
```

---

## 💰 Wallet Funding Endpoint

### **Initialize Wallet Funding**

```http
POST /auth/fund-wallet/{userId}
```

**Headers:**
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | `Bearer {token}` | Yes (if required by middleware) |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | MongoDB ObjectId of the user |

**Request Body:**
```json
{
  "amount": 1000
}
```

**Field Details:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Amount in Naira (NGN). Minimum: 100 |

---

## ✅ Success Response (200)

```json
{
  "success": true,
  "authorizationUrl": "https://checkout.paystack.com/abc123xyz"
}
```

**Next Step:**
- Redirect the user to `authorizationUrl` to complete payment on Paystack
- After payment, Paystack will redirect back to your callback URL

---

## ❌ Error Responses

### Invalid Amount (400)
```json
{
  "success": false,
  "message": "Invalid amount"
}
```

### User Not Found (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

### Paystack Error (500)
```json
{
  "success": false,
  "message": "Unable to initiate wallet funding"
}
```

---

## 📱 Frontend Implementation Flow

### 1. **Call Fund Wallet API**
```javascript
const fundWallet = async (userId, amount) => {
  try {
    const response = await fetch(
      `https://mobile-doctor-api.onrender.com/api/auth/fund-wallet/${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // if required
        },
        body: JSON.stringify({ amount }),
      }
    );
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

### 2. **Handle Success - Open Paystack**
```javascript
const handleFundWallet = async () => {
  const result = await fundWallet(userId, 1000);
  
  if (result.success) {
    // Open Paystack checkout in browser/webview
    window.location.href = result.authorizationUrl;
    // OR for mobile app:
    // Linking.openURL(result.authorizationUrl);
  } else {
    // Show error to user
    alert(result.message);
  }
};
```

### 3. **Payment Completion**
- User completes payment on Paystack
- Paystack redirects to callback URL (configured on Paystack dashboard)
- **Backend webhook automatically credits wallet** - no frontend action needed

---

## 🔍 Check Wallet Balance

```http
GET /auth/wallet-balance/{userId}
```

**Response:**
```json
{
  "success": true,
  "walletBalance": 5000
}
```

---

## 📜 Transaction History

```http
GET /auth/transaction-history/{userId}?page=1&limit=10
```

**Response:**
```json
{
  "message": "Transaction history retrieved successfully",
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalDocs": 50
  }
}
```

---

## ⚠️ Important Notes

1. **Minimum Amount:** ₦100 (100 Naira)
2. **Currency:** All amounts are in Nigerian Naira (NGN)
3. **Authentication:** Endpoint requires user to be authenticated (`ensureAuthenticated` middleware)
4. **Rate Limiting:** Wallet funding has rate limiting applied (`walletLimiter`)
5. **Authorization:** User can only fund their own wallet (`ensureOwner` middleware)

---

## 🧪 Test Example

```bash
curl -X POST https://mobile-doctor-api.onrender.com/api/auth/fund-wallet/YOUR_USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{"amount": 500}'
```

---

## 🔗 Related Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/fund-wallet/:userId` | POST | Initialize wallet funding |
| `/auth/wallet-balance/:userId` | GET | Check wallet balance |
| `/auth/transaction-history/:userId` | GET | View transaction history |
| `/auth/withdraw/:userId` | POST | Request withdrawal (health providers only) |

---

## 📞 Support

If issues persist:
1. Check browser/app console for errors
2. Verify user is authenticated before calling API
3. Test with minimum amount (₦100)
4. Check Paystack dashboard for transaction status
