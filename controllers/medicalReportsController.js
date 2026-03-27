import MedicalRecord from "../models/medicalRecordModel.js";
import { upload } from "../config/cloudinary.js";

export const updateMedicalReport = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { genotype, bloodGroup, maritalStatus, allergies, weight, others } = req.body;

    // Find the existing medical record by its user ID
    const existingMedicalRecord = await MedicalRecord.findById(userId);

    if (existingMedicalRecord) {
      // Update the fields of the existing medical record with new data
      existingMedicalRecord.genotype = genotype;
      existingMedicalRecord.bloodGroup = bloodGroup;
      existingMedicalRecord.maritalStatus = maritalStatus;
      existingMedicalRecord.allergies = allergies;
      existingMedicalRecord.weight = weight;
      existingMedicalRecord.others = others;

      // Save the updated medical record
      await existingMedicalRecord.save();
      res.status(200).json({ message: "Medical report updated successfully" });
    } else {
      // If no existing medical record is found, return a "record not found" message
      res.status(404).json({ message: "Medical record not found for the specified user" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



export const getMedicalReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const medicalRecord = await MedicalRecord.findById(userId);
    if (medicalRecord) {
      res.json(medicalRecord);
    } else {
      res.status(404).json({ message: "Medical record not found for the specified user" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const uploadTestResult = async (req, res) => {
  try {
    const { userId } = req.params;
    const files = req.files; // Assuming files are uploaded as an array of files

    // Find the medical record by user ID
    const medicalRecord = await MedicalRecord.findById(userId);

    if (!medicalRecord) {
      return res.status(404).json({ success: false, error: 'Medical record not found for the specified user' });
    }

    const uploadedFiles = [];

    // Iterate over each file and upload to Cloudinary
    for (const key in files) {
      const file = files[key];
      const fileTypes = ['image/jpeg', 'image/png', 'image/jpg']; // Update file types as needed
      const imageSize = 1024; // Assuming you want to use 1 MB = 1024 KB

      if (!fileTypes.includes(file.mimetype)) {
        return res.status(400).json({ success: false, error: 'File formats supported: JPG, PNG, JPEG' });
      }

      if (file.size / 1024 > imageSize) { // Assuming size is in bytes, convert to KB
        return res.status(400).json({ success: false, error: `File size should be less than ${imageSize}kb` });
      }

      // Upload file to Cloudinary
      const cloudFile = await upload(file.tempFilePath, userId);
      uploadedFiles.push(cloudFile.url);
    }

    // Update medical record model with the Cloudinary URLs for all uploaded files
    medicalRecord.testResults.push(...uploadedFiles);
    const updatedMedicalRecord = await medicalRecord.save();

    res.status(201).json({
      success: true,
      message: 'Test results uploaded successfully',
      updatedMedicalRecord: updatedMedicalRecord,
      fileUrls: uploadedFiles,
    });
  } catch (error) {
    console.error('Error uploading test results:', error);
    res.status(500).json({ success: false, error: 'Error uploading test results', errorMessage: error.message });
  }
};




export const getTestResult = async (req, res) => {
  try {
    const { userId } = req.params; // Assuming userId is sent as a parameter in the request

    // Find the medical record by user ID
    const medicalRecord = await MedicalRecord.findById(userId);

    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found for the specified user' });
    }

    res.json({ testResults: medicalRecord.testResults });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
