// messageRoute.js - Enhanced routes for messaging
import express from 'express';
import messageController from '../controllers/messageController.js';
import { ensureAuthenticated, ensureOwner } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';
import { generalLimiter, messageLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply authentication to all routes
router.use(ensureAuthenticated);

// Send message (HTTP fallback)
router.post('/send', messageLimiter, messageController.sendMessage);

// Get messages for a conversation (with pagination)
// Note: ensureOwner removed - controller checks if user is part of conversation
router.get('/:conversationId', validateObjectId("conversationId"), generalLimiter, messageController.getMessages);

// Get all conversations for a user
router.get('/conversations/:userId', validateObjectId("userId"), ensureOwner, generalLimiter, messageController.listConversations);

// Get recent chats with unread counts
router.get('/recent-chats/:userId', validateObjectId("userId"), ensureOwner, generalLimiter, messageController.getRecentChats);

// Get unread message count
router.get('/unread-count/:userId', validateObjectId("userId"), ensureOwner, generalLimiter, messageController.getUnreadCount);

// Mark messages as read
router.post('/mark-read', messageLimiter, messageController.markAsRead);

// Search messages in a conversation
// Note: ensureOwner removed - controller handles authorization
router.get('/search/:conversationId', validateObjectId("conversationId"), generalLimiter, messageController.searchMessages);

// Delete a message
router.delete('/:messageId', validateObjectId("messageId"), ensureOwner, messageLimiter, messageController.deleteMessage);

export default router;