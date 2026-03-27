import admin from 'firebase-admin';
import 'dotenv/config.js';

// Check if Firebase credentials are provided
const hasFirebaseCredentials = process.env.FIREBASE_PROJECT_ID && 
                                process.env.FIREBASE_CLIENT_EMAIL && 
                                process.env.FIREBASE_PRIVATE_KEY;

// Initialize Firebase Admin SDK only if credentials are available
if (hasFirebaseCredentials && !admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
  }
} else if (!hasFirebaseCredentials) {
  console.log('⚠️  Firebase not configured - push notifications will not work');
}

// Enhanced push notification service
export class PushNotificationService {
  static async sendToUser(userId, notification, data = {}) {
    try {
      // Get user's FCM tokens from database
      const User = (await import('../models/user.js')).default;
      const user = await User.findById(userId);
      
      if (!user || !user.notificationTokens || user.notificationTokens.length === 0) {
        console.warn(`⚠️ No notification tokens found for user ${userId}`);
        return { success: false, reason: 'No tokens found' };
      }

      const message = {
        notification: {
          title: notification.title || 'Mobile Doctor',
          body: notification.body || 'You have a new notification',
          icon: notification.icon || '/icon.png',
          clickAction: notification.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
        },
        data: {
          userId: userId.toString(),
          type: data.type || 'general',
          ...data,
        },
        tokens: user.notificationTokens,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'mobile_doctor_channel',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendMulticast(message);
      
      // Handle invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token') {
            invalidTokens.push(user.notificationTokens[idx]);
          }
        });

        // Remove invalid tokens from database
        if (invalidTokens.length > 0) {
          await User.updateOne(
            { _id: userId },
            { $pull: { notificationTokens: { $in: invalidTokens } } }
          );
          console.log(`🗑️ Removed ${invalidTokens.length} invalid tokens for user ${userId}`);
        }
      }

      console.log(`📱 Push notification sent to ${userId}: ${response.successCount}/${response.failureCount} successful`);
      
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses,
      };
    } catch (error) {
      console.error(`❌ Failed to send push notification to ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  static async sendToMultipleUsers(userIds, notification, data = {}) {
    const results = [];
    
    for (const userId of userIds) {
      const result = await this.sendToUser(userId, notification, data);
      results.push({ userId, result });
    }
    
    return results;
  }

  static async sendToTopic(topic, notification, data = {}) {
    try {
      const message = {
        notification: {
          title: notification.title || 'Mobile Doctor',
          body: notification.body || 'New update available',
        },
        data: {
          type: data.type || 'broadcast',
          ...data,
        },
        topic: topic,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'mobile_doctor_channel',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log(`📱 Broadcast notification sent to topic ${topic}:`, response.messageId);
      
      return { success: true, messageId: response.messageId };
    } catch (error) {
      console.error(`❌ Failed to send broadcast notification to topic ${topic}:`, error);
      return { success: false, error: error.message };
    }
  }

  static async subscribeToTopic(userId, topic) {
    try {
      const User = (await import('../models/user.js')).default;
      const user = await User.findById(userId);
      
      if (!user || !user.notificationTokens || user.notificationTokens.length === 0) {
        throw new Error('No notification tokens found');
      }

      const response = await admin.messaging().subscribeToTopic(user.notificationTokens, topic);
      console.log(`✅ User ${userId} subscribed to topic ${topic}:`, response.successCount);
      
      return { success: true, successCount: response.successCount };
    } catch (error) {
      console.error(`❌ Failed to subscribe user ${userId} to topic ${topic}:`, error);
      return { success: false, error: error.message };
    }
  }

  static async unsubscribeFromTopic(userId, topic) {
    try {
      const User = (await import('../models/user.js')).default;
      const user = await User.findById(userId);
      
      if (!user || !user.notificationTokens || user.notificationTokens.length === 0) {
        throw new Error('No notification tokens found');
      }

      const response = await admin.messaging().unsubscribeFromTopic(user.notificationTokens, topic);
      console.log(`✅ User ${userId} unsubscribed from topic ${topic}:`, response.successCount);
      
      return { success: true, successCount: response.successCount };
    } catch (error) {
      console.error(`❌ Failed to unsubscribe user ${userId} from topic ${topic}:`, error);
      return { success: false, error: error.message };
    }
  }
}

// Notification templates
export const NotificationTemplates = {
  CONSULTATION_STARTED: (doctorName) => ({
    title: 'Consultation Started',
    body: `Dr. ${doctorName} has started your consultation`,
    data: { type: 'consultation', action: 'started' },
  }),
  
  CONSULTATION_COMPLETED: (doctorName) => ({
    title: 'Consultation Completed',
    body: `Your consultation with Dr. ${doctorName} is complete`,
    data: { type: 'consultation', action: 'completed' },
  }),
  
  PRESCRIPTION_READY: (pharmacyName) => ({
    title: 'Prescription Ready',
    body: `Your prescription is ready at ${pharmacyName}`,
    data: { type: 'prescription', action: 'ready' },
  }),
  
  PAYMENT_RECEIVED: (amount) => ({
    title: 'Payment Received',
    body: `Payment of $${amount} has been received`,
    data: { type: 'payment', action: 'received' },
  }),
  
  APPOINTMENT_REMINDER: (dateTime) => ({
    title: 'Appointment Reminder',
    body: `You have an appointment at ${dateTime}`,
    data: { type: 'appointment', action: 'reminder' },
  }),
  
  MESSAGE_RECEIVED: (senderName) => ({
    title: 'New Message',
    body: `You received a message from ${senderName}`,
    data: { type: 'message', action: 'received' },
  }),
};

export default PushNotificationService;
