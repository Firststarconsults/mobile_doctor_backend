import Notification from '../models/notificationModel.js';
import User from '../models/user.js';
import mongoose from 'mongoose';
import { queueNotificationEmail } from '../utils/emailQueue.js';
import { PushNotificationService, NotificationTemplates } from '../utils/pushNotifications.js';
import { SMSService, SMSTemplates } from '../utils/smsService.js';

const notificationController = {

  createNotification: async (recipient, sender, type, message, relatedObject, relatedModel, options = {}) => {
    try {
      const user = await User.findById(recipient);
      const notification = new Notification({
        recipient,
        sender,
        type,
        message,
        relatedObject,
        relatedModel,
      });
      await notification.save();

      // Multi-channel notification delivery
      const deliveryPromises = [];

      // Push notification
      if (options.sendPush !== false && user.notificationTokens && user.notificationTokens.length > 0) {
        const pushNotification = NotificationTemplates[type] || {
          title: 'Mobile Doctor',
          body: message,
        };
        
        deliveryPromises.push(
          PushNotificationService.sendToUser(recipient, pushNotification, {
            type,
            relatedObject,
            relatedModel,
          })
        );
      }

      // Email notification
      if (options.sendEmail === true && user.email) {
        deliveryPromises.push(
          queueNotificationEmail(user.email, `${type} - Mobile Doctor`, message, {
            priority: 'normal',
          })
        );
      }

      // SMS notification
      if (options.sendSMS === true && user.phone) {
        deliveryPromises.push(
          SMSService.sendSMS(user.phone, message, {
            priority: 'normal',
          })
        );
      }

      // Execute all delivery methods
      const results = await Promise.allSettled(deliveryPromises);
      
      // Log results
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`❌ Notification delivery failed (${index}):`, result.reason);
        }
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Error creating notification');
    }
  },

  getNotifications: async (req, res) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sort = req.query.sort || "-createdAt";

      // Validate page and limit
      if (page < 1) {
        return res.status(400).json({
          message: "Page number must be greater than 0",
        });
      }
      
      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          message: "Limit must be between 1 and 100",
        });
      }

      const options = {
        page,
        limit,
        sort,
        lean: true,
      };

      // Check if Notification model has paginate method
      let result;
      if (typeof Notification.paginate === 'function') {
        result = await Notification.paginate({ recipient: userId }, options);
      } else {
        // Fallback to regular find with pagination
        const skip = (page - 1) * limit;
        const notifications = await Notification.find({ recipient: userId })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean();
        
        const total = await Notification.countDocuments({ recipient: userId });
        
        result = {
          docs: notifications,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          totalDocs: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        };
      }

      res.status(200).json({
        message: "Notifications retrieved successfully",
        data: result.docs,
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalDocs: result.totalDocs,
          limit: result.limit,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
          nextPage: result.hasNextPage ? result.page + 1 : null,
          prevPage: result.hasPrevPage ? result.page - 1 : null,
        },
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ 
        message: "Error fetching notifications",
        error: error.message 
      });
    }
  },

  markAsRead: async (req, res) => {
    try {
      const { notificationId } = req.params;
      await Notification.findByIdAndUpdate(notificationId, { read: true });
      res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  setIsNotified: async (req, res) => {
    try {
      const { notificationId } = req.params;

      // Find the notification and update its isNotified field
      const updatedNotification = await Notification.findByIdAndUpdate(
        notificationId,
        { isNotified: true },
        { new: true }
      );

      if (!updatedNotification) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      res.status(200).json({ message: 'Notification marked as notified', notification: updatedNotification });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  storeNotificationToken: async (req, res) => {
    try {
      const userId = req.params.id;
      const { notificationToken } = req.body;
      
      if (!notificationToken) {
        return res.status(400).json({ error: 'Notification token is required' });
      }

      // Add token to user's notificationTokens array (avoid duplicates)
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          $addToSet: { notificationTokens: notificationToken },
          $set: { lastActive: new Date() }
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ 
        message: 'Notification token stored successfully',
        tokenCount: updatedUser.notificationTokens.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Send bulk notifications
  sendBulkNotifications: async (req, res) => {
    try {
      const { recipients, notification, options = {} } = req.body;
      
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'Recipients array is required' });
      }

      const results = [];
      
      for (const recipient of recipients) {
        try {
          const result = await notificationController.createNotification(
            recipient.userId,
            notification.sender,
            notification.type,
            notification.message,
            notification.relatedObject,
            notification.relatedModel,
            options
          );
          results.push({ userId: recipient.userId, success: true, notificationId: result._id });
        } catch (error) {
          results.push({ userId: recipient.userId, success: false, error: error.message });
        }
      }

      res.status(200).json({
        message: 'Bulk notifications processed',
        results,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Send emergency notification
  sendEmergencyNotification: async (req, res) => {
    try {
      const { recipients, message, options = {} } = req.body;
      
      if (!recipients || !message) {
        return res.status(400).json({ error: 'Recipients and message are required' });
      }

      const emergencyNotification = {
        title: '🚨 Emergency Alert',
        body: message,
        data: { type: 'emergency', priority: 'high' },
      };

      const results = await PushNotificationService.sendToMultipleUsers(
        recipients,
        emergencyNotification,
        { type: 'emergency', priority: 'high' }
      );

      // Also send SMS if requested
      if (options.sendSMS) {
        const users = await User.find({ _id: { $in: recipients } });
        const smsPromises = users
          .filter(user => user.phone)
          .map(user => SMSService.sendEmergencyAlert(user.phone, message));
        
        const smsResults = await Promise.allSettled(smsPromises);
        console.log(`📱 Emergency SMS sent: ${smsResults.filter(r => r.status === 'fulfilled').length}/${smsResults.length}`);
      }

      res.status(200).json({
        message: 'Emergency notifications sent',
        results,
        successCount: results.filter(r => r.result.success).length,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get notification statistics
  getNotificationStats: async (req, res) => {
    try {
      const { userId } = req.params;
      
      const stats = await Notification.aggregate([
        { $match: { recipient: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            unread: { $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] } },
          },
        },
        {
          $group: {
            _id: null,
            totalNotifications: { $sum: '$count' },
            totalUnread: { $sum: '$unread' },
            types: {
              $push: {
                type: '$_id',
                count: '$count',
                unread: '$unread',
              },
            },
          },
        },
      ]);

      const result = stats[0] || {
        totalNotifications: 0,
        totalUnread: 0,
        types: [],
      };

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Remove notification token
  removeNotificationToken: async (req, res) => {
    try {
      const userId = req.params.id;
      const { notificationToken } = req.body;
      
      if (!notificationToken) {
        return res.status(400).json({ error: 'Notification token is required' });
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $pull: { notificationTokens: notificationToken } },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ 
        message: 'Notification token removed successfully',
        tokenCount: updatedUser.notificationTokens.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

export default notificationController;
