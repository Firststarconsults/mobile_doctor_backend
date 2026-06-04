import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
  serviceType: { type: String, required: true }, // consultation, lab test, drug purchase, etc.
  description: String,
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  reference: { type: mongoose.Schema.Types.ObjectId }, // Reference to consultation, prescription, etc.
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true, required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Invoice details
  items: [invoiceItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'pending'
  },
  
  // Payment details
  dueDate: { type: Date, required: true },
  paidDate: Date,
  paymentMethod: { type: String }, // wallet, card, insurance, etc.
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  
  // Insurance
  insuranceClaim: {
    submitted: { type: Boolean, default: false },
    claimNumber: String,
    approvedAmount: Number,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'partial'] },
  },
  
  // Notes
  notes: String,
  internalNotes: String,
  
  // Metadata
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issuedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
