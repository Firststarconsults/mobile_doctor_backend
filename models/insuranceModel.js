import mongoose from "mongoose";

const insuranceSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Insurance provider details
  providerName: { type: String, required: true },
  providerAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
  },
  providerPhone: String,
  providerEmail: String,
  
  // Policy details
  policyNumber: { type: String, required: true, unique: true },
  groupNumber: String,
  memberId: String,
  policyType: { type: String, enum: ['individual', 'family', 'group'] },
  coverageType: String,
  
  // Coverage details
  effectiveDate: { type: Date, required: true },
  expirationDate: { type: Date, required: true },
  copay: { type: Number, default: 0 },
  deductible: { type: Number, default: 0 },
  outOfPocketMax: { type: Number },
  coverageLimit: { type: Number },
  
  // Coverage specifics
  coverage: {
    consultations: { type: Boolean, default: true },
    labTests: { type: Boolean, default: true },
    prescriptionDrugs: { type: Boolean, default: true },
    hospitalization: { type: Boolean, default: false },
    emergency: { type: Boolean, default: true },
    preventiveCare: { type: Boolean, default: true },
    specialist: { type: Boolean, default: true },
  },
  
  // Claims history
  claims: [{
    claimNumber: String,
    claimDate: Date,
    serviceType: String,
    amount: Number,
    approvedAmount: Number,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'partial'] },
    processedDate: Date,
    notes: String,
  }],
  
  // Status
  status: { 
    type: String, 
    enum: ['active', 'expired', 'cancelled', 'suspended'],
    default: 'active'
  },
  
  // Primary insured
  primaryInsured: {
    name: String,
    relationship: String,
    dateOfBirth: Date,
  },
  
  // Documents
  insuranceCard: { type: String }, // Cloudinary URL
  policyDocument: { type: String }, // Cloudinary URL
  
  // Notes
  notes: String,
  
  // Metadata
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const Insurance = mongoose.model('Insurance', insuranceSchema);

export default Insurance;
