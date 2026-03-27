# 🚀 Advanced Notification System Setup Guide

## 📦 **Packages Installed**
- ✅ **bull** - Email queue management
- ✅ **firebase-admin** - Push notifications (FCM)
- ✅ **twilio** - SMS notifications

---

## 🔧 **Setup Instructions**

### **1. Firebase Cloud Messaging (Push Notifications)**

#### **Step 1: Create Firebase Project**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name (e.g., "mobile-doctor-app")
4. Enable Google Analytics (optional)
5. Click **"Create project"**

#### **Step 2: Get Service Account Key**
1. Go to **Project Settings** → **Service accounts**
2. Click **"Generate new private key"**
3. Select **JSON** format
4. Download the JSON file
5. Copy the contents to your `.env` file:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

#### **Step 3: Update .env**
```bash
# Add to your .env file
FIREBASE_PROJECT_ID=your-actual-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

---

### **2. Twilio SMS Service**

#### **Step 1: Create Twilio Account**
1. Go to [Twilio Console](https://www.twilio.com/console)
2. Sign up for a free account
3. Verify your phone number

#### **Step 2: Get Twilio Credentials**
1. Go to **Console** → **Settings** → **General**
2. Copy **Account SID** and **Auth Token**
3. Get a Twilio phone number from **Phone Numbers** → **Buy Number**

#### **Step 3: Update .env**
```bash
# Add to your .env file
TWILIO_ACCOUNT_SID=your-actual-account-sid
TWILIO_AUTH_TOKEN=your-actual-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

---

### **3. Redis (Email Queue - Optional)**

#### **Option A: Local Redis Installation**
```bash
# Windows (using WSL or Docker)
docker run --name redis -p 6379:6379 -d redis:latest

# Or install Redis locally
# Download from https://redis.io/download
```

#### **Option B: Redis Cloud (Recommended)**
1. Go to [Redis Cloud](https://redis.com/try-free/)
2. Create a free Redis database
3. Get the connection string

#### **Step 4: Update .env**
```bash
# Add to your .env file
REDIS_URL=redis://localhost:6379
# Or for Redis Cloud:
REDIS_URL=redis://username:password@host:port
```

---

## 🧪 **Testing the New Features**

### **1. Test Push Notifications**
```javascript
// In your frontend app:
import { getMessaging, getToken } from 'firebase/messaging';

const messaging = getMessaging();
getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' })
  .then((currentToken) => {
    if (currentToken) {
      // Send token to backend
      fetch('/api/notification/:userId/token', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationToken: currentToken })
      });
    }
  });
```

### **2. Test SMS Notifications**
```bash
# Test SMS sending
curl -X POST http://localhost:3000/api/notification/emergency \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "recipients": ["USER_ID_1", "USER_ID_2"],
    "message": "Emergency alert: System maintenance in 5 minutes",
    "options": { "sendSMS": true }
  }'
```

### **3. Test Email Queue**
```javascript
// Email queue is automatically used when sending emails
// Check queue stats:
import { getQueueStats } from './utils/emailQueue.js';
const stats = await getQueueStats();
console.log('Email queue stats:', stats);
```

---

## 📱 **New API Endpoints**

### **Enhanced Notification Routes**
```javascript
// Store notification token (for push notifications)
PUT /api/notification/:userId/token
{
  "notificationToken": "fcm_token_here"
}

// Send bulk notifications
POST /api/notification/bulk
{
  "recipients": [
    { "userId": "user1_id" },
    { "userId": "user2_id" }
  ],
  "notification": {
    "sender": "sender_id",
    "type": "CONSULTATION_STARTED",
    "message": "Your consultation has started",
    "relatedObject": "consultation_id",
    "relatedModel": "Consultation"
  },
  "options": {
    "sendPush": true,
    "sendEmail": false,
    "sendSMS": false
  }
}

// Emergency notifications
POST /api/notification/emergency
{
  "recipients": ["user1_id", "user2_id"],
  "message": "Emergency alert message",
  "options": { "sendSMS": true }
}

// Notification statistics
GET /api/notification/stats/:userId

// Remove notification token
DELETE /api/notification/:userId/token
{
  "notificationToken": "fcm_token_to_remove"
}
```

---

## 🔔 **Notification Templates**

### **Built-in Templates**
```javascript
// Available notification types:
- CONSULTATION_STARTED
- CONSULTATION_COMPLETED  
- PRESCRIPTION_READY
- PAYMENT_RECEIVED
- APPOINTMENT_REMINDER
- MESSAGE_RECEIVED

// Usage example:
await notificationController.createNotification(
  userId,
  senderId,
  'CONSULTATION_STARTED',
  'Your consultation has started',
  consultationId,
  'Consultation',
  { sendPush: true, sendEmail: true }
);
```

---

## 📊 **Features Implemented**

### **✅ Push Notifications (Firebase FCM)**
- Multi-device support (multiple tokens per user)
- Automatic invalid token cleanup
- Topic-based subscriptions
- Rich notifications with images/actions
- Platform-specific (Android/iOS) settings

### **✅ SMS Notifications (Twilio)**
- Verification codes
- Password reset OTPs
- Appointment reminders
- Emergency alerts
- Bulk SMS with rate limiting

### **✅ Email Queue (Bull)**
- Redis-backed job queue
- Automatic retries with exponential backoff
- Job priorities and delays
- Queue monitoring and statistics
- Graceful error handling

### **✅ Multi-Channel Notifications**
- Send via Push + Email + SMS simultaneously
- Configurable delivery options per notification
- Template-based notifications
- Bulk notification support
- Emergency broadcast system

---

## 🚀 **Production Deployment**

### **Environment Variables Required**
```bash
# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=required
FIREBASE_CLIENT_EMAIL=required  
FIREBASE_PRIVATE_KEY=required

# Twilio (SMS)
TWILIO_ACCOUNT_SID=required
TWILIO_AUTH_TOKEN=required
TWILIO_PHONE_NUMBER=required

# Redis (Email Queue - Optional)
REDIS_URL=optional (falls back to memory)
```

### **Scaling Considerations**
- **Redis**: Use Redis Cloud for production email queue
- **Firebase**: No scaling needed (Google handles it)
- **Twilio**: Upgrade to paid tier for higher volume
- **Monitoring**: Add queue stats to your monitoring system

---

## 🎯 **Usage Examples**

### **Medical Consultation Flow**
```javascript
// 1. Start consultation - Send push + email
await notificationController.createNotification(
  patientId,
  doctorId,
  'CONSULTATION_STARTED',
  `Dr. ${doctorName} has started your consultation`,
  consultationId,
  'Consultation',
  { sendPush: true, sendEmail: true }
);

// 2. Send SMS reminder (if enabled)
await SMSService.sendAppointmentReminder(
  patientPhone,
  patientName,
  appointmentTime,
  doctorName
);

// 3. Complete consultation - Send all channels
await notificationController.createNotification(
  patientId,
  doctorId,
  'CONSULTATION_COMPLETED',
  `Your consultation with Dr. ${doctorName} is complete`,
  consultationId,
  'Consultation',
  { sendPush: true, sendEmail: true, sendSMS: true }
);
```

### **Emergency System Alert**
```javascript
// Send emergency notification to all users
const allUsers = await User.find({ role: 'patient' });
await notificationController.sendEmergencyNotification(
  allUsers.map(u => u._id),
  'System maintenance in 5 minutes. Please save your work.',
  { sendSMS: true, sendPush: true }
);
```

---

## 🎉 **Ready for Production!**

Your Mobile Doctor Backend now has:
- ✅ **Enterprise-grade notification system**
- ✅ **Multi-channel delivery** (Push + Email + SMS)
- ✅ **Queue-based email processing**
- ✅ **Template-based notifications**
- ✅ **Emergency broadcast system**
- ✅ **Comprehensive error handling**
- ✅ **Production-ready configuration**

**The advanced notification system is now fully implemented and ready for production!** 🚀
