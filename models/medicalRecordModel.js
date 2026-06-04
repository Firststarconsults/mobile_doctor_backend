import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema({
  // Basic information
  genotype: String,
  bloodGroup: String,
  maritalStatus: String,
  allergies: [{
    name: String,
    severity: { type: String, enum: ['mild', 'moderate', 'severe', 'life-threatening'] },
    reaction: String,
  }],
  weight: Number,
  height: Number, // Height in cm
  
  // Vital signs
  bloodPressure: {
    systolic: Number,
    diastolic: Number,
    lastMeasured: Date,
  },
  heartRate: {
    value: Number,
    lastMeasured: Date,
  },
  temperature: {
    value: Number,
    lastMeasured: Date,
  },
  
  // Medical history
  chronicConditions: [{
    condition: String,
    diagnosedDate: Date,
    status: { type: String, enum: ['active', 'controlled', 'resolved'] },
    notes: String,
  }],
  previousIllnesses: [{
    illness: String,
    date: Date,
    treatment: String,
    outcome: String,
  }],
  surgeries: [{
    procedure: String,
    date: Date,
    hospital: String,
    surgeon: String,
    notes: String,
  }],
  
  // Current medications
  currentMedications: [{
    name: String,
    dosage: String,
    frequency: String,
    prescriber: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    startDate: Date,
    endDate: Date,
    reason: String,
  }],
  
  // Family medical history
  familyHistory: [{
    relationship: String,
    condition: String,
    notes: String,
  }],
  
  // Lifestyle
  lifestyle: {
    smoking: { type: String, enum: ['never', 'former', 'current'] },
    smokingDetails: String,
    alcohol: { type: String, enum: ['never', 'occasional', 'moderate', 'heavy'] },
    alcoholDetails: String,
    exercise: { type: String, enum: ['sedentary', 'light', 'moderate', 'active', 'very active'] },
    exerciseDetails: String,
    diet: String,
  },
  
  // Vaccination records
  vaccinations: [{
    vaccineName: String,
    dateAdministered: Date,
    administeredBy: String,
    nextDueDate: Date,
    notes: String,
  }],
  
  // Previous hospitalizations
  hospitalizations: [{
    date: Date,
    reason: String,
    hospital: String,
    duration: Number, // in days
    outcome: String,
    notes: String,
  }],
  
  // Insurance information
  insurance: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    memberId: String,
    coverageType: String,
    effectiveDate: Date,
    expirationDate: Date,
    copay: Number,
    deductible: Number,
  },
  
  // Emergency contact
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String,
    address: String,
  },
  
  // Disabilities
  disabilities: [{
    type: String,
    description: String,
    accommodations: String,
  }],
  
  // Dietary restrictions
  dietaryRestrictions: [{
    type: String,
    description: String,
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
  }],
  
  // Test results (array of Cloudinary URLs)
  testResults: [{ type: String }],
  
  // Other information
  others: String,
  
  // Metadata
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

export default MedicalRecord;
