import mongoose from 'mongoose';

const { Schema } = mongoose;

const conversationSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  // Ensure lastMessage can be null, remove default if not needed
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  session: { type: Schema.Types.ObjectId, ref: 'ConsultationSession' }, // Reference to the session
}, {
  timestamps: true, // Mongoose manages createdAt and updatedAt fields automatically
});

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;



