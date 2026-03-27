// socketHandler.js - Enhanced Socket.io handler for healthcare chat
import Message from '../models/messageModel.js';
import Conversation from '../models/conversationModel.js';
import User from '../models/user.js';
import ConsultationSession from '../models/consultationModel.js';
import { sendNotificationEmail } from '../utils/nodeMailer.js';

// Store active users with their socket IDs
const activeUsers = new Map();

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User comes online
    socket.on('userOnline', async (userId) => {
      try {
        // Store user's socket connection
        activeUsers.set(userId, socket.id);
        
        // Update user's online status in database
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastActive: new Date()
        });

        // Notify all participants in user's conversations
        const conversations = await Conversation.find({
          participants: userId
        }).populate('participants', '_id');

        conversations.forEach(conv => {
          conv.participants.forEach(participant => {
            if (participant._id.toString() !== userId) {
              const participantSocketId = activeUsers.get(participant._id.toString());
              if (participantSocketId) {
                io.to(participantSocketId).emit('userStatusChange', {
                  userId,
                  isOnline: true
                });
              }
            }
          });
        });

        console.log(`User ${userId} is now online`);
      } catch (error) {
        console.error('Error setting user online:', error);
      }
    });

    // Join a conversation room
    socket.on('joinConversation', async ({ conversationId, userId }) => {
      try {
        socket.join(conversationId);
        console.log(`User ${userId} joined conversation ${conversationId}`);

        // Mark all messages in this conversation as seen
        await Message.updateMany(
          {
            conversationId,
            receiver: userId,
            seen: false
          },
          { seen: true }
        );

        // Notify sender that messages were seen
        io.to(conversationId).emit('messagesSeen', {
          conversationId,
          readBy: userId
        });
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Leave a conversation room
    socket.on('leaveConversation', (conversationId) => {
      socket.leave(conversationId);
      console.log(`Socket ${socket.id} left conversation ${conversationId}`);
    });

    // Handle sending messages
    socket.on('sendMessage', async (messageData) => {
      try {
        const { conversationId, sender, receiver, content, fileUrl } = messageData;

        // Verify active consultation session exists
        const activeSession = await ConsultationSession.findOne({
          $or: [
            { doctor: sender, patient: receiver },
            { doctor: receiver, patient: sender }
          ],
          status: { $in: ['scheduled', 'in-progress', 'pending'] }
        });

        if (!activeSession) {
          return socket.emit('messageError', {
            message: 'No active consultation session found. Please start a consultation first.'
          });
        }

        // Create the new message
        const newMessage = await Message.create({
          conversationId,
          sender,
          receiver,
          content,
          fileUrl,
          seen: false,
          timestamp: new Date()
        });

        // Populate sender details for the response
        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'firstName lastName profilePhoto role')
          .populate('receiver', 'firstName lastName profilePhoto role');

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: newMessage._id,
          updatedAt: new Date()
        });

        // Emit to all users in the conversation room
        io.to(conversationId).emit('newMessage', populatedMessage);

        // Check if receiver is online
        const receiverSocketId = activeUsers.get(receiver);
        const receiverUser = await User.findById(receiver);
        
        if (!receiverSocketId && receiverUser) {
          // Receiver is offline, send email notification
          const senderUser = await User.findById(sender);
          if (senderUser) {
            const emailMessage = `Hello,\n\nYou have received a new message from ${senderUser.firstName} ${senderUser.lastName}.\n\n"${content}"\n\nPlease log into the Mobile Doctor app to continue your conversation.\n\nBest regards,\nYour Healthcare Team`;
            
            await sendNotificationEmail(
              receiverUser.email,
              'New Message in Mobile Doctor',
              emailMessage
            );
          }
        }

        // Send delivery confirmation to sender
        socket.emit('messageDelivered', {
          tempId: messageData.tempId, // Client can send temp ID for optimistic updates
          messageId: newMessage._id,
          timestamp: newMessage.timestamp
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('messageError', {
          message: 'Failed to send message',
          error: error.message
        });
      }
    });

    // Handle typing indicators
    socket.on('typing', ({ conversationId, userId, isTyping }) => {
      socket.to(conversationId).emit('userTyping', {
        conversationId,
        userId,
        isTyping
      });
    });

    // Mark messages as seen
    socket.on('markAsSeen', async ({ conversationId, userId }) => {
      try {
        await Message.updateMany(
          {
            conversationId,
            receiver: userId,
            seen: false
          },
          { seen: true }
        );

        io.to(conversationId).emit('messagesSeen', {
          conversationId,
          readBy: userId
        });
      } catch (error) {
        console.error('Error marking messages as seen:', error);
      }
    });

    // Handle file upload progress (for large files)
    socket.on('uploadProgress', ({ conversationId, progress }) => {
      socket.to(conversationId).emit('fileUploadProgress', {
        userId: socket.userId,
        progress
      });
    });

    // System messages (consultation started, ended, etc.)
    socket.on('systemMessage', async ({ conversationId, type, message }) => {
      try {
        const systemMessage = await Message.create({
          conversationId,
          content: message,
          isSystemMessage: true,
          timestamp: new Date()
        });

        io.to(conversationId).emit('systemMessage', {
          type,
          message: systemMessage,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error sending system message:', error);
      }
    });

    // Handle user going offline
    socket.on('userOffline', async (userId) => {
      await handleUserOffline(userId);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      
      // Find and update user status
      for (const [userId, socketId] of activeUsers.entries()) {
        if (socketId === socket.id) {
          await handleUserOffline(userId);
          activeUsers.delete(userId);
          break;
        }
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Helper function to handle user going offline
  async function handleUserOffline(userId) {
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastActive: new Date()
      });

      // Notify all participants in user's conversations
      const conversations = await Conversation.find({
        participants: userId
      }).populate('participants', '_id');

      conversations.forEach(conv => {
        conv.participants.forEach(participant => {
          if (participant._id.toString() !== userId) {
            const participantSocketId = activeUsers.get(participant._id.toString());
            if (participantSocketId) {
              io.to(participantSocketId).emit('userStatusChange', {
                userId,
                isOnline: false,
                lastActive: new Date()
              });
            }
          }
        });
      });

      console.log(`User ${userId} is now offline`);
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }
};

// Export active users map for other modules to use
export { activeUsers };