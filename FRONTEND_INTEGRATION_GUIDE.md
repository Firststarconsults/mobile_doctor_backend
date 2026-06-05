# Mobile Doctor Frontend Integration Guide

## Overview
This guide provides a comprehensive walkthrough for integrating the Mobile Doctor backend with your frontend application based on the complete operational workflow.

## Base URL
```
Production: https://mobile-doctor-api.onrender.com/api
```

## Authentication
All protected endpoints require JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 1. User Registration & Authentication

### 1.1 Register User
```javascript
POST /auth/register
Content-Type: application/json

Body:
{
  "userType": "patient", // or "doctor", "pharmacy", "laboratory", "therapist"
  "email": "user@example.com",
  "password": "password123",
  "phone": "+2347012345678",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "gender": "male"
}

Response:
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "user": { ... }
}
```

### 1.2 Login
```javascript
POST /auth/login
Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### 1.3 Verify Email
```javascript
POST /auth/verify
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "code": "123456"
}

Response:
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

## 2. Consultation Workflow

### 2.1 Fund Wallet (Before Consultation)
```javascript
POST /auth/fund-wallet/:userId
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "amount": 5000
}

Response:
{
  "success": true,
  "authorizationUrl": "https://checkout.paystack.com/...",
  "reference": "ref_123456"
}
```

### 2.2 Start Consultation
```javascript
POST /auth/start-consultation
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "doctorId": "doctor_id",
  "patientId": "patient_id",
  "consultationFee": 2000
}

Response:
{
  "success": true,
  "sessionId": "session_id",
  "message": "Consultation started successfully",
  "escrowTransaction": { ... }
}
```

### 2.3 Doctor Accept Consultation
```javascript
POST /auth/accept-consultation
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "sessionId": "session_id"
}

Response:
{
  "success": true,
  "message": "Consultation accepted successfully",
  "sessionId": "session_id",
  "status": "in-progress"
}
```

### 2.4 Doctor Reject Consultation (with Refund)
```javascript
POST /auth/reject-consultation
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "sessionId": "session_id",
  "reason": "Doctor unavailable"
}

Response:
{
  "success": true,
  "message": "Consultation rejected and refund processed",
  "refundAmount": 2000
}
```

### 2.5 Complete Consultation
```javascript
POST /auth/completeConsultation
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "sessionId": "session_id"
}

Response:
{
  "success": true,
  "message": "Consultation completed successfully"
}
```

### 2.6 Cancel Consultation
```javascript
POST /auth/cancelConsultation
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "sessionId": "session_id"
}

Response:
{
  "success": true,
  "message": "Consultation cancelled and refund processed"
}
```

---

## 3. Prescription Workflow

### 3.1 Create Prescription (Doctor)
```javascript
POST /prescription/createPrescription/:doctorId
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "patientId": "patient_id",
  "diagnosis": "Malaria",
  "medicines": [
    {
      "name": "Artemether",
      "dosage": "20mg",
      "daysOfTreatment": "3"
    }
  ],
  "labTests": ["Malaria Parasite Test"],
  "providerType": "pharmacy" // or "laboratory"
}

Response:
{
  "success": true,
  "prescriptionId": "prescription_id",
  "message": "Prescription created successfully"
}
```

### 3.2 Share Prescription with Providers (Patient)
```javascript
POST /prescription/share-prescription/:patientId
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "prescriptionId": "prescription_id",
  "providerType": "pharmacy",
  "deliveryOption": "home" // or "inshop"
}

Response:
{
  "success": true,
  "nearbyProviders": [
    {
      "providerId": "pharmacy_id",
      "name": "Health Plus Pharmacy",
      "address": "123 Main St",
      "distance": 2.5,
      "phone": "+2347012345678"
    }
  ]
}
```

### 3.3 Add Costing (Provider)
```javascript
POST /prescription/costing/:providerId
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "prescriptionId": "prescription_id",
  "amount": 5000
}

Response:
{
  "success": true,
  "message": "Costing added successfully",
  "transaction": { ... }
}
```

### 3.4 Approve Costing (Patient)
```javascript
POST /prescription/approve-costing/:patientId
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "prescriptionId": "prescription_id"
}

Response:
{
  "success": true,
  "message": "Costing approved successfully",
  "transaction": { ... }
}
```

### 3.5 Update Delivery Status (Pharmacy)
```javascript
POST /prescription/update-delivery-status/:providerId
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "prescriptionId": "prescription_id",
  "deliveryStatus": "in_transit", // pending, preparing, picked_up, in_transit, delivered, failed
  "estimatedDeliveryTime": "2024-01-01T14:00:00Z",
  "deliveryPerson": "John Doe",
  "deliveryPersonPhone": "+2347012345678"
}

Response:
{
  "success": true,
  "message": "Delivery status updated successfully",
  "deliveryStatus": "in_transit"
}
```

---

## 4. Lab Test Workflow

### 4.1 Upload Test Result (Laboratory)
```javascript
POST /prescription/upload-result/:providerId
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
{
  "prescriptionId": "prescription_id",
  "testName": "Malaria Parasite Test",
  "testResult": "Positive",
  "testResultImage": <file>
}

Response:
{
  "success": true,
  "message": "Test result uploaded successfully",
  "testResultId": "test_result_id"
}
```

### 4.2 Doctor Reviews Test Result & Creates Follow-up Prescription
```javascript
POST /prescription/review-test-result/:doctorId
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "testResultId": "test_result_id",
  "diagnosis": "Confirmed Malaria",
  "medicines": [
    {
      "name": "Artemether",
      "dosage": "20mg",
      "daysOfTreatment": "3"
    }
  ],
  "notes": "Follow-up prescription after lab test review"
}

Response:
{
  "success": true,
  "message": "Test result reviewed and follow-up prescription created",
  "prescriptionId": "prescription_id",
  "testResultId": "test_result_id"
}
```

---

## 5. Wallet & Payment Workflow

### 5.1 Get Wallet Balance
```javascript
GET /auth/wallet-balance/:userId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "walletBalance": 15000
}
```

### 5.2 Get Transaction History
```javascript
GET /auth/transaction-history/:userId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "transactions": [
    {
      "type": "wallet funding",
      "amount": 5000,
      "status": "success",
      "date": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### 5.3 Withdraw Funds
```javascript
POST /auth/withdraw/:userId
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "amount": 5000,
  "accountNumber": "1234567890",
  "bankName": "Access Bank",
  "bankCode": "044"
}

Response:
{
  "success": true,
  "message": "Withdrawal request submitted",
  "transaction": { ... }
}
```

### 5.4 Verify Payment (Client-side)
```javascript
POST /auth/verify-payment/:userId
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "reference": "ref_123456"
}

Response:
{
  "success": true,
  "message": "Payment verified successfully",
  "walletBalance": 15000
}
```

---

## 6. Provider Management

### 6.1 Upload Credentials (KYC)
```javascript
POST /provider/credentialsDetails/:providerId
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
{
  "profilePhoto": <file>,
  "governmentIdfront": <file>,
  "governmentIdback": <file>,
  "license": <file>,
  "certificate": <file>,
  "educationQualification": <file>
}

Response:
{
  "success": true,
  "message": "Credentials uploaded successfully"
}
```

### 6.2 Update Online Status
```javascript
PUT /provider/:providerId/update-isOnline
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "isOnline": true
}

Response:
{
  "success": true,
  "message": "Online status updated"
}
```

### 6.3 Get Nearby Providers
```javascript
GET /user/find-nearby-providers/:userId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "nearbyProviders": [
    {
      "providerId": "provider_id",
      "name": "Dr. John Doe",
      "specialty": "General Medicine",
      "distance": 1.5,
      "isOnline": true
    }
  ]
}
```

---

## 7. Admin Dashboard

### 7.1 Get Statistics
```javascript
GET /admin/statistics-cards
Authorization: Bearer <token>

Response:
{
  "totalPatients": 150,
  "totalDoctors": 25,
  "totalPharmacies": 10,
  "totalLaboratories": 8,
  "pendingKYC": 5
}
```

### 7.2 Get Pending KYC Requests
```javascript
GET /admin/approveRequestList
Authorization: Bearer <token>

Response:
{
  "success": true,
  "pendingRequests": [
    {
      "providerId": "provider_id",
      "name": "Dr. Jane Doe",
      "type": "doctor",
      "credentials": { ... }
    }
  ]
}
```

### 7.3 Approve/Reject KYC
```javascript
POST /admin/updateKycVerificationStatus/:adminId
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "providerId": "provider_id",
  "status": "approved", // or "rejected"
  "rejectionReason": "Invalid license"
}

Response:
{
  "success": true,
  "message": "KYC status updated successfully"
}
```

### 7.4 Get Financial Overview
```javascript
GET /admin/financial-overview
Authorization: Bearer <token>

Response:
{
  "success": true,
  "totalRevenue": 500000,
  "totalWithdrawals": 100000,
  "pendingWithdrawals": 25000,
  "monthlyRevenue": 50000
}
```

---

## 8. Location & Search

### 8.1 Update User Location
```javascript
POST /user/update-location
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "latitude": 6.5244,
  "longitude": 3.3792
}

Response:
{
  "success": true,
  "message": "Location updated successfully"
}
```

### 8.2 Search Verified Doctors
```javascript
GET /search/verified-doctors
Authorization: Bearer <token>

Response:
{
  "success": true,
  "verifiedDoctors": [
    {
      "doctorId": "doctor_id",
      "name": "Dr. John Doe",
      "specialty": "Cardiology",
      "rating": 4.5,
      "isOnline": true
    }
  ]
}
```

---

## 9. Error Handling

### Common Error Codes
- **400**: Bad Request - Invalid input data
- **401**: Unauthorized - Token missing or expired
- **403**: Forbidden - User not authorized
- **404**: Not Found - Resource not found
- **429**: Too Many Requests - Rate limit exceeded
- **500**: Internal Server Error - Backend error

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## 10. Rate Limits

- **Registration**: 10 attempts/hour per IP
- **Authentication**: 5 attempts/15min per IP
- **Wallet Operations**: 10 operations/minute per IP
- **Prescription Operations**: 20 operations/minute per IP
- **Message Operations**: 50 operations/minute per IP

---

## 11. Complete Workflow Example

### Patient Consultation Flow
1. Patient registers and verifies email
2. Patient funds wallet via Paystack
3. Patient searches for nearby doctors
4. Patient starts consultation (fee deducted, held in escrow)
5. Doctor accepts consultation
6. Chat session begins
7. Doctor creates prescription
8. Patient shares prescription with pharmacy
9. Pharmacy adds costing
10. Patient approves costing (wallet deducted)
11. Pharmacy updates delivery status
12. Patient receives drugs

---

## 12. Testing Credentials

- **Admin Email:** opuaye.reginald@gmail.com
- **Admin Password:** @19June@2016
- **Admin ID:** 69cedb14ad4a10d1a33815c7

---

## 13. Best Practices

1. **Always validate user input** before sending to API
2. **Handle 401 errors** by redirecting to login
3. **Store JWT token securely** (localStorage/AsyncStorage)
4. **Include token in Authorization header** for all protected routes
5. **Implement retry logic** for failed requests
6. **Show loading states** during API calls
7. **Display user-friendly error messages**
8. **Test endpoints in Postman** before frontend integration

---

## 14. Socket.io Integration (Real-time Features)

### Connect to Socket
```javascript
import io from 'socket.io-client';

const socket = io('https://mobile-doctor-api.onrender.com', {
  auth: { token: localStorage.getItem('authToken') }
});

// Listen for consultation accepted
socket.on('consultationAccepted', (data) => {
  console.log('Consultation accepted:', data);
  // Update UI
});

// Listen for consultation rejected
socket.on('consultationRejected', (data) => {
  console.log('Consultation rejected:', data);
  // Show refund notification
});
```

---

## 15. File Uploads

Use `multipart/form-data` for file uploads:
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('prescriptionId', prescriptionId);

const response = await fetch('/prescription/upload-result/:providerId', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

---

## Support

For issues or questions:
- Check browser console for error messages
- Verify token is being sent in request headers
- Test endpoints in Postman first
- Check rate limits if getting 429 errors

Good luck with the integration! 🚀
