import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }, // ID of the recipient user
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // ID of the sender (optional)
  type: { type: String, required: true }, // Type of notification, e.g., 'message', 'prescription', 'review'
  message: { type: String, required: true }, // Notification message
  read: { type: Boolean, default: false }, // Indicates if the notification has been read by the recipient
  createdAt: { type: Date, default: Date.now }, // Timestamp for when the notification was created
  relatedObject: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the related object (optional)
    refPath: 'relatedModel',
  },
  relatedModel: {
    type: String, // Model name of the related object (e.g., 'Consultation', 'Prescription')
    enum: ['Consultation', 'Prescription', 'Review', 'Transaction'], // Add other relevant models here
  },
  isNotified: { type: Boolean, default: false }
});

// Add pagination plugin
notificationSchema.plugin(mongoosePaginate);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
