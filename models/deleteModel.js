// models/deletedUser.js
import mongoose from 'mongoose';

const deletedUserSchema = new mongoose.Schema({
  originalUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
  role: { type: String, required: true },
  deletedData: mongoose.Schema.Types.Mixed,
  deletionDate: { type: Date, default: Date.now }
});

const DeletedUser = mongoose.model('DeletedUser', deletedUserSchema);

export default DeletedUser;
