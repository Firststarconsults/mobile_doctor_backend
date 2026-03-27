// messageController.js - Enhanced with better Socket.io integration
import Message from '../models/messageModel.js';
import Conversation from '../models/conversationModel.js';
import User from '../models/user.js';
import {Doctor, Pharmacy, Laboratory, Therapist} from '../models/healthProviders.js';
import ConsultationSession from '../models/consultationModel.js';
import { io } from '../server.js'; 
import { upload } from '../config/cloudinary.js';
import { sendNotificationEmail } from "../utils/nodeMailer.js";
import { activeUsers } from '../utils/socketHandler.js';

const messageController = {

  // Send message via HTTP (backup if socket fails)
  sendMessage: async (req, res) => {
    try {
      const { conversationId, sender, receiver, content } = req.body;
      let fileUrl = null;

      // Check if a file is attached
      if (req.files && req.files.attachment) {
        const file = req.files.attachment;
        const uploadResult = await upload(file.tempFilePath, `messages/${conversationId}`);
        fileUrl = uploadResult.secure_url;
      }

      // Verify active consultation session
      const activeSession = await ConsultationSession.findOne({
        $or: [{ doctor: sender, patient: receiver }, { doctor: receiver, patient: sender }],
        status: { $in: ['scheduled', 'in-progress', 'pending'] }
      });

      if (!activeSession) {
        return res.status(403).json({ 
          message: 'No active consultation session found between the users. Please start a consultation first.' 
        });
      }

      // Create new message
      const newMessage = await Message.create({
        conversationId,
        sender,
        receiver,
        content,
        fileUrl,
        seen: false
      });

      // Populate sender and receiver details
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('sender', 'firstName lastName profilePhoto role')
        .populate('receiver', 'firstName lastName profilePhoto role');

      // Emit via Socket.io
      io.to(conversationId).emit('newMessage', populatedMessage);

      // Update conversation's last message
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: newMessage._id,
        updatedAt: new Date()
      });

      // Check if receiver is online
      const receiverSocketId = activeUsers.get(receiver);
      
      if (!receiverSocketId) {
        // Receiver is offline, send email notification
        const senderUser = await User.findById(sender);
        const receiverUser = await User.findById(receiver);
        
        if (senderUser && receiverUser) {
          const message = `Hello ${receiverUser.firstName},\n\nYou have received a new message from ${senderUser.firstName} ${senderUser.lastName}.\n\n"${content}"\n\nPlease log into the Mobile Doctor app to continue your conversation.\n\nBest regards,\nYour Healthcare Team`;
          
          await sendNotificationEmail(receiverUser.email, 'New Message in Mobile Doctor', message);
        }
      }

      return res.status(201).json({
        success: true,
        message: populatedMessage
      });
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  },

  // Get messages for a conversation with pagination
  getMessages: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const messages = await Message.find({ conversationId })
        .populate('sender', 'firstName lastName profilePhoto role')
        .populate('receiver', 'firstName lastName profilePhoto role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalMessages = await Message.countDocuments({ conversationId });
      
      return res.status(200).json({
        success: true,
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalMessages / parseInt(limit)),
          totalMessages,
          hasMore: skip + messages.length < totalMessages
        }
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  },

  // Get unread message count
  getUnreadCount: async (req, res) => {
    try {
      const { userId } = req.params;

      const unreadCount = await Message.countDocuments({
        receiver: userId,
        seen: false,
        isSystemMessage: false
      });

      return res.status(200).json({
        success: true,
        unreadCount
      });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Mark conversation messages as read
  markAsRead: async (req, res) => {
    try {
      const { conversationId, userId } = req.body;

      await Message.updateMany(
        {
          conversationId,
          receiver: userId,
          seen: false
        },
        { seen: true }
      );

      // Notify via socket
      io.to(conversationId).emit('messagesSeen', {
        conversationId,
        readBy: userId
      });

      return res.status(200).json({
        success: true,
        message: 'Messages marked as read'
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // List all conversations for a user
  listConversations: async (req, res) => {
    const userId = req.params.userId;

    try {
      const conversations = await Conversation.find({
        participants: userId
      })
        .populate('lastMessage')
        .populate({
          path: 'participants',
          select: 'firstName lastName profilePhoto role isOnline lastActive'
        })
        .sort('-updatedAt');

      return res.status(200).json({
        success: true,
        conversations
      });
    } catch (error) {
      console.error('Error listing conversations:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  },

  // Get recent chats with enhanced information
  getRecentChats: async (req, res) => {
    const { userId } = req.params;

    try {
      const recentChats = await Conversation.find({ participants: userId })
        .populate({
          path: 'lastMessage',
          select: 'content timestamp seen -_id',
          options: { sort: { 'timestamp': -1 } }
        })
        .populate({
          path: 'participants',
          select: 'firstName lastName profilePhoto role _id isOnline lastActive'
        })
        .sort({ 'updatedAt': -1 })
        .limit(20);

      const transformedChats = await Promise.all(
        recentChats.map(async (chat) => {
          const lastMessageContent = chat.lastMessage ? chat.lastMessage.content : '';
          const lastMessageTime = chat.lastMessage ? chat.lastMessage.timestamp : '';
          const lastMessageSeen = chat.lastMessage ? chat.lastMessage.seen : true;

          // Find the other participant
          const otherParticipant = chat.participants.find(p => p._id.toString() !== userId);

          if (!otherParticipant) {
            return null;
          }

          // Get unread count for this conversation
          const unreadCount = await Message.countDocuments({
            conversationId: chat._id,
            receiver: userId,
            seen: false,
            isSystemMessage: false
          });

          // Find most recent session
          const mostRecentSession = await ConsultationSession.findOne({
            $or: [
              { patient: userId, doctor: otherParticipant._id },
              { patient: otherParticipant._id, doctor: userId }
            ]
          }).sort({ startTime: -1 });

          return {
            conversationId: chat._id,
            lastMessage: lastMessageContent,
            lastMessageTime: lastMessageTime,
            lastMessageSeen: lastMessageSeen,
            unreadCount,
            otherParticipant: {
              _id: otherParticipant._id,
              firstName: otherParticipant.firstName,
              lastName: otherParticipant.lastName,
              profilePhoto: otherParticipant.profilePhoto,
              role: otherParticipant.role,
              isOnline: otherParticipant.isOnline,
              lastActive: otherParticipant.lastActive
            },
            sessionStatus: mostRecentSession ? mostRecentSession.status : 'No session'
          };
        })
      );

      const validChats = transformedChats.filter(chat => chat !== null);

      res.status(200).json({ 
        success: true, 
        recentChats: validChats 
      });
    } catch (error) {
      console.error('Error retrieving recent chats:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal Server Error', 
        error: error.toString() 
      });
    }
  },

  // Search messages in a conversation
  searchMessages: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { query } = req.query;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const messages = await Message.find({
        conversationId,
        content: { $regex: query, $options: 'i' },
        isSystemMessage: false
      })
        .populate('sender', 'firstName lastName profilePhoto')
        .sort({ timestamp: -1 })
        .limit(50);

      return res.status(200).json({
        success: true,
        messages,
        count: messages.length
      });
    } catch (error) {
      console.error('Error searching messages:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Delete a message (soft delete - mark as deleted)
  deleteMessage: async (req, res) => {
    try {
      const { messageId } = req.params;
      const { userId } = req.body;

      const message = await Message.findById(messageId);
      
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      // Only sender can delete
      if (message.sender.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this message'
        });
      }

      // Soft delete - update content
      message.content = 'This message was deleted';
      message.fileUrl = null;
      await message.save();

      // Notify via socket
      io.to(message.conversationId.toString()).emit('messageDeleted', {
        messageId: message._id,
        conversationId: message.conversationId
      });

      return res.status(200).json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

export default messageController;