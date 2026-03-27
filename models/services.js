//services.js
import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";





const prescriptionSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  session: {type: mongoose.Schema.Types.ObjectId, ref: 'ConsultationSession'},
  patientAddress: { type: String, default: null },
  diagnosis: { type: String, required: false },
  medicines: [{
    name: { type: String },
    dosage: { type: String },
    daysOfTreatment: String
  }],
  labTests: [{ type: String }],
  deliveryOption: { type: String },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved', 'declined', 'completed'], default: 'pending' },
  approved: { type: Boolean, default: false },
  totalCost: { type: Number},
  providerType: { type: String, enum: ['pharmacy', 'laboratory'] }, // Added provider type field
  provider: { type: mongoose.Schema.Types.ObjectId  } // Reference to either Pharmacy or Laboratory
});




// Review schema
const reviewSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  consultationSession: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsultationSession'},
  rating: { type: Number },
  comment: { type: String },
});


// transaction history
const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: false }, // Reference to the Doctor
  consultationSession: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', required: false }, // Optional, if you have a consultation model
  prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: false },
  type: { type: String, required: true }, // e.g., 'payout', 'consultation fee'
  status: { type: String, required: true }, // e.g., 'pending', 'success', 'failed', 'processing', 'verification_needed'
  escrowStatus: { type: String, enum: ['held', 'released', 'refunded'], default: null }, // Handles escrow state
  amount: { type: Number, required: true },
  accountNumber: String,
  bankName: String,
  bankCode: String,
  paymentMethod: { type: String },
  transferCode: { type: String }, // For storing Paystack transfer code during withdrawal
  recipientCode: { type: String }, // For storing Paystack recipient code during withdrawal
  notes: { type: String }, // For storing additional information about the transaction
  completedAt: { type: Date }, // When the transaction was completed
  date: { type: Date, default: Date.now },
});

// Add pagination plugin to transaction schema
transactionSchema.plugin(mongoosePaginate);



// Test result schema
const testResultSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Laboratory', required: true },
  providerName: { type: String, required: true },
  testName: { type: String, required: true },
  testResult: { type: String, required: true },
  prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true }, 
  date: { type: Date, default: Date.now },

  // Other fields as needed
});

const TestResult = mongoose.model('TestResult', testResultSchema);
// const Notification = new mongoose.model('Notification', notificationSchema);
const Transaction = new mongoose.model('Transaction', transactionSchema);
// const Consultation = new mongoose.model("Consultation", consultationSchema);
const Prescription = new mongoose.model("Prescription", prescriptionSchema);
const Reviews = new mongoose.model("Reviews", reviewSchema);



export { Prescription, Reviews, Transaction, TestResult};