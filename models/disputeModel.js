import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema({
  // Reference to the disputed item
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
  consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsultationSession' },
  
  // Dispute details
  disputeType: { 
    type: String, 
    enum: ['transaction', 'prescription', 'consultation', 'delivery', 'service_quality', 'other'],
    required: true 
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  
  // Parties involved
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  raisedAgainst: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Status
  status: { 
    type: String, 
    enum: ['open', 'under_review', 'resolved', 'rejected', 'escalated'],
    default: 'open' 
  },
  
  // Resolution
  resolutionNotes: String,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  
  // Priority
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium' 
  },
  
  // Evidence
  evidence: [{ type: String }], // Cloudinary URLs
  
  // Admin notes
  adminNotes: String,
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Dispute = mongoose.model('Dispute', disputeSchema);

export default Dispute;
