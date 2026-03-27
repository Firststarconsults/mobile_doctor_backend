import mongoose from 'mongoose';

const consultationSessionSchema = new mongoose.Schema({
  doctor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Doctor', 
    required: true 
  },
  doctorUser: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // Reference to the User schema for isOnline status
     
  },
  patient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  medicalRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalRecord', // Reference to the MedicalRecord model
  },
  startTime: { 
    type: Date, 
    required: true 
  },
  endTime: { 
    type: Date 
  },
  status: { 
    type: String, 
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'pending'], 
    default: 'scheduled' 
  },
  escrowTransaction: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Transaction',
    required: false // This can be optional, depending on whether payment is required upfront
  },
  notes: {
    type: String, 
    required: false // Any notes or diagnosis from the session
  },
  prescription: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Prescription',
    required: false // Reference to a Prescription model if you have one
  },
  conversationId: { // New field to track conversation associated with the session
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: false // Assuming conversation isn't always necessary
  }
}, {
  timestamps: true // Automatically manage createdAt and updatedAt timestamps
});

const ConsultationSession = mongoose.model('ConsultationSession', consultationSessionSchema);

export default ConsultationSession;
