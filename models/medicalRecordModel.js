import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema({
  genotype: String,
  bloodGroup: String,
  maritalStatus: String,
  allergies: [String],
  weight: Number,
  testResults: [{ type: String }], // Array of Cloudinary URLs
  others: String,
});

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

export default MedicalRecord;
