import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  
  // Appointment details
  appointmentDate: { type: Date, required: true },
  appointmentTime: { type: String, required: true }, // Time slot (e.g., "09:00", "10:00")
  duration: { type: Number, default: 30 }, // Duration in minutes
  reason: { type: String, required: true },
  notes: { type: String },
  
  // Status
  status: { 
    type: String, 
    enum: ['scheduled', 'confirmed', 'cancelled', 'completed', 'no-show', 'rescheduled'],
    default: 'scheduled'
  },
  
  // Rescheduling
  rescheduledFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  rescheduledTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  rescheduledReason: String,
  
  // Consultation reference (if appointment leads to consultation)
  consultationSession: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsultationSession' },
  
  // Payment
  consultationFee: { type: Number },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  
  // Reminders
  reminderSent: { type: Boolean, default: false },
  reminderSentAt: Date,
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: Date,
  cancellationReason: String,
}, { timestamps: true });

// Index for efficient queries
appointmentSchema.index({ patient: 1, appointmentDate: 1 });
appointmentSchema.index({ doctor: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
