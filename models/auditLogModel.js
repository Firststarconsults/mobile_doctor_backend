import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  // Who performed the action
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedByRole: { type: String, required: true }, // admin, doctor, patient, pharmacy, laboratory
  
  // Action details
  action: { type: String, required: true }, // e.g., "updated_user", "approved_kyc", "resolved_dispute"
  actionType: { 
    type: String, 
    enum: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'resolve', 'suspend', 'activate'],
    required: true 
  },
  
  // Target of the action
  targetType: { type: String }, // user, transaction, prescription, dispute, etc.
  targetId: { type: mongoose.Schema.Types.ObjectId },
  
  // Details
  description: { type: String, required: true },
  changes: { type: mongoose.Schema.Types.Mixed }, // Store old/new values for updates
  
  // Metadata
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
  
  // Status
  status: { 
    type: String, 
    enum: ['success', 'failure', 'pending'],
    default: 'success' 
  },
  errorMessage: String,
}, { timestamps: true });

// Index for efficient queries
auditLogSchema.index({ performedBy: 1, timestamp: -1 });
auditLogSchema.index({ actionType: 1, timestamp: -1 });
auditLogSchema.index({ targetType: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
