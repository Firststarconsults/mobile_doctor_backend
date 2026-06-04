import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema({
  pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
  
  // Drug details
  drugName: { type: String, required: true },
  genericName: String,
  brandName: String,
  drugCategory: String, // antibiotic, painkiller, etc.
  dosageForm: { type: String, enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'patch', 'other'] },
  strength: String, // e.g., "500mg", "10mg/ml"
  
  // Inventory details
  quantity: { type: Number, required: true, default: 0 },
  unit: { type: String, enum: ['tablets', 'capsules', 'bottles', 'vials', 'tubes', 'boxes', 'units'] },
  minimumStock: { type: Number, default: 10 },
  maximumStock: { type: Number },
  
  // Pricing
  unitPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  
  // Expiry and batch
  batchNumber: String,
  expiryDate: Date,
  manufacturer: String,
  supplier: String,
  
  // Status
  status: { 
    type: String, 
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'expired', 'discontinued'],
    default: 'in_stock'
  },
  
  // Storage conditions
  storageConditions: String,
  requiresRefrigeration: { type: Boolean, default: false },
  
  // Prescription requirement
  requiresPrescription: { type: Boolean, default: true },
  
  // Notes
  notes: String,
  
  // Metadata
  lastRestocked: Date,
  lastRestockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-update status based on quantity and expiry
inventorySchema.pre('save', function(next) {
  const now = new Date();
  
  // Check if expired
  if (this.expiryDate && this.expiryDate < now) {
    this.status = 'expired';
  }
  // Check if out of stock
  else if (this.quantity === 0) {
    this.status = 'out_of_stock';
  }
  // Check if low stock
  else if (this.quantity <= this.minimumStock) {
    this.status = 'low_stock';
  }
  // Otherwise in stock
  else {
    this.status = 'in_stock';
  }
  
  next();
});

// Indexes for efficient queries
inventoryItemSchema.index({ pharmacy: 1, drugName: 1 });
inventoryItemSchema.index({ pharmacy: 1, status: 1 });
inventoryItemSchema.index({ expiryDate: 1 });

const PharmacyInventory = mongoose.model('PharmacyInventory', inventoryItemSchema);

export default PharmacyInventory;
