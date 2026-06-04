# Mobile Doctor Backend API Guide

## Base URL
```
https://mobile-doctor-api.onrender.com/api
```

## Authentication
Most endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

## Endpoints by Workflow

### 1. Registration & Authentication
```
POST /auth/register
POST /auth/login
POST /auth/verify
POST /auth/logout
GET /auth/user-details
```

### 2. Consultation Flow
```
POST /auth/start-consultation
POST /auth/accept-consultation
POST /auth/reject-consultation
POST /auth/completeConsultation
POST /auth/cancelConsultation
GET /auth/is-doctor-available/:doctorId
```

### 3. Prescription Flow
```
POST /prescription/createPrescription/:doctorId
POST /prescription/share-prescription/:patientId
POST /prescription/costing/:providerId
POST /prescription/approve-costing/:patientId
POST /prescription/review-test-result/:doctorId
POST /prescription/update-delivery-status/:providerId
GET /prescription/prescriptions/patient/:patientId
```

### 4. Wallet & Payments
```
POST /auth/fund-wallet/:userId
POST /auth/withdraw/:userId
GET /auth/wallet-balance/:userId
POST /auth/verify-payment/:userId
GET /auth/transaction-history/:userId
GET /auth/pending-withdrawals/:adminId
POST /auth/approve-withdrawal/:adminId
POST /auth/finalize-withdrawal/:adminId
```

### 5. Admin Dashboard
```
GET /admin/statistics-cards
GET /admin/patients
GET /admin/pharmacies
GET /admin/laboratories
GET /admin/approveRequestList
PUT /admin/:adminId/users/:userId
DELETE /admin/:adminId/users/:userId
GET /admin/:adminId/user-transactions
GET /admin/financial-overview
GET /admin/transaction-trends
POST /admin/updateKycVerificationStatus/:adminId
```

### 6. Provider Management
```
POST /provider/credentialsDetails/:providerId
POST /provider/otherProvidersCredentials/:providerId
PUT /provider/:providerId/update-isOnline
GET /provider/pharmacies
GET /provider/laboratories
GET /provider/all-doctors
```

### 7. Location & Search
```
POST /user/update-location
GET /user/find-nearby-providers/:userId
GET /search/verified-doctors
```

## Rate Limits
- Registration: 10 attempts/hour per IP
- Auth: 5 attempts/15min per IP
- Wallet: 10 operations/minute per IP
