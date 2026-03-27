// healthProviders.js
import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    default: "Point",
    enum: ["Point"] // 'location.type' must be 'Point'
  },
  coordinates: {
    type: [Number], // Array of numbers for longitude and latitude
    index: "2dsphere"
  }
});


const sharedPrescriptionSchema = new mongoose.Schema({
  prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
  deliveryOption: { type: String, enum: ['home', 'inshop'] },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});




// Doctor schema
const doctorSchema = new mongoose.Schema({
  fullName: { type: String, default: null },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reviews' }],
  approval: { type: Boolean, default: false },
  isRecommended: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  sponsored: { type: Boolean, default: false },
  medicalSpecialty: {
    name: { type: String },
    fee: { type: Number, default: 1000 }
},
  images: {
    profilePhoto: { type: String, default: null },
    governmentIdfront: { type: String },
    governmentIdback: { type: String },
    license: { type: String },
    certificate: { type: String },
    educationQualification: { type: String },
  },
  registrationNumber: String,
  registrationYear: String,
  registrationCouncil: String,
  country: String,
  address: String,
  gender: String,
  about: String,
  kycVerification: { type: Boolean, default: false },
  feedback: [{ 
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comment: String,
    rating: { type: Number, min: 1, max: 5 }
}],

recommendations: [
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  },
],

prescriptions: [sharedPrescriptionSchema],
});


// Pharmacy schema
const pharmacySchema = new mongoose.Schema({
  name: { type: String, required: true },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reviews' }],
  approved: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  sponsored: { type: Boolean, default: false },
  kycVerification: { type: Boolean, default: false },
  location: locationSchema,
  address: { type: String, default: null },
  phone: { type: String, default: null },
  recommendations: [
    {
      doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
      patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    },
  ],
  images: {
    profilePhoto: { type: String, default: null },
    governmentIdfront: { type: String },
    governmentIdback: { type: String },
    license: { type: String },
    certificate: { type: String },
    educationQualification: { type: String },
  },
  registrationNumber: String,
  registrationYear: String,
  registrationCouncil: String,
  country: String,
  gender: String,
  about: String,
  kycVerification: { type: Boolean, default: false },
  feedback: [{ 
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comment: String,
    rating: { type: Number, min: 1, max: 5 }
}],
prescriptions: [sharedPrescriptionSchema],
});

// Therapist schema
const therapistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reviews' }],
  approved: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  sponsored: { type: Boolean, default: false },
  kycVerification: { type: Boolean, default: false },
  location: locationSchema,
  address: { type: String, default: null },
  phone: { type: String, default: null },
  recommendations: [
    {
      doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
      patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    },
  ],
  images: {
    profilePhoto: { type: String, default: null },
    governmentIdfront: { type: String },
    governmentIdback: { type: String },
    license: { type: String },
    certificate: { type: String },
    educationQualification: { type: String },
  },
  registrationNumber: String,
  registrationYear: String,
  registrationCouncil: String,
  country: String,
  gender: String,
  about: String,
  kycVerification: { type: Boolean, default: false },
  feedback: [{ 
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comment: String,
    rating: { type: Number, min: 1, max: 5 }
}],
prescriptions: [sharedPrescriptionSchema],
});

// Laboratory schema
const laboratorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reviews' }],
  approved: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  sponsored: { type: Boolean, default: false },
  location: locationSchema,
  address: { type: String, default: null },
  phone: { type: String, default: null },
  recommendations: [
    {
      doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
      patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    },
  ],
  images: {
    profilePhoto: { type: String, default: null },
    governmentIdfront: { type: String },
    governmentIdback: { type: String },
    license: { type: String },
    certificate: { type: String },
    educationQualification: { type: String },
  },
  registrationNumber: String,
  registrationYear: String,
  registrationCouncil: String,
  country: String,
  gender: String,
  about: String,
  kycVerification: { type: Boolean, default: false },
  feedback: [{ 
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comment: String,
    rating: { type: Number, min: 1, max: 5 }
}],
prescriptions: [sharedPrescriptionSchema],
});

const Doctor = mongoose.model("Doctor", doctorSchema);
const Pharmacy = mongoose.model("Pharmacy", pharmacySchema);
const Therapist = mongoose.model("Therapist", therapistSchema);
const Laboratory = mongoose.model("Laboratory", laboratorySchema);




export { Doctor, Pharmacy, Therapist, Laboratory };
