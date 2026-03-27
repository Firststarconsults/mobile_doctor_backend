import express from 'express';
import notificationController from '../controllers/notificationController.js';
import { ensureAuthenticated, ensureOwner } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply authentication to all routes
router.use(ensureAuthenticated);

// Protected notification operations
router.get('/getNotification/:userId', validateObjectId("userId"), ensureOwner, generalLimiter, notificationController.getNotifications);
router.patch('/:notificationId/read', validateObjectId("notificationId"), ensureOwner, generalLimiter, notificationController.markAsRead);
router.patch('/:notificationId/set-is-notified', validateObjectId("notificationId"), ensureOwner, generalLimiter, notificationController.setIsNotified);
router.put('/:id/token', validateObjectId("id"), ensureOwner, generalLimiter, notificationController.storeNotificationToken);

// Enhanced notification routes
router.post('/bulk', generalLimiter, notificationController.sendBulkNotifications);
router.post('/emergency', generalLimiter, notificationController.sendEmergencyNotification);
router.get('/stats/:userId', validateObjectId("userId"), ensureOwner, generalLimiter, notificationController.getNotificationStats);
router.delete('/:id/token', validateObjectId("id"), ensureOwner, generalLimiter, notificationController.removeNotificationToken);

export default router;
