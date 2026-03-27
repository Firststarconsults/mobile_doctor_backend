// models/messageModel.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String},
  timestamp: { type: Date, default: Date.now },
  fileUrl: { type: String }, 
  seen: { type: Boolean, default: false },
  isSystemMessage: { type: Boolean, default: false }
  
});

const Message = mongoose.model('Message', messageSchema);

export default Message;

