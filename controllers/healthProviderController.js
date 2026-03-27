//health Provider controller
import mongoose from "mongoose";
import User from "../models/user.js";
import haversineDistance from '../utils/distanceCalculator.js';
import { Doctor, Pharmacy, Therapist, Laboratory } from "../models/healthProviders.js";
import { Reviews, Prescription, TestResult } from "../models/services.js";
import { upload } from "../config/cloudinary.js";
import moment from 'moment';
import ConsultationSession from "../models/consultationModel.js";
import MedicalRecord from "../models/medicalRecordModel.js";

const healthProviderControllers = {

  setCredentials: async (req, res) => {
    try {
      const providerId = req.params.providerId;
      
      const {
        fullName,
        registrationNumber,
        registrationYear,
        registrationCouncil,
        country,
        address,
        gender,
        about,
        medicalSpecialty 
      } = req.body;

      // Validation: Check if all required fields are provided
      const requiredFields = {
        fullName: 'Full name',
        registrationNumber: 'Registration number',
        registrationYear: 'Registration year',
        registrationCouncil: 'Registration council',
        country: 'Country',
        address: 'Address',
        gender: 'Gender',
        about: 'About section',
        medicalSpecialty: 'Medical specialty'
      };

      const missingFields = [];
      for (const [field, displayName] of Object.entries(requiredFields)) {
        if (!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
          missingFields.push(displayName);
        }
      }

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: `Please provide the following required fields: ${missingFields.join(', ')}`,
          missingFields: missingFields
        });
      }

      // Validate registration year
      const currentYear = new Date().getFullYear();
      const regYear = parseInt(registrationYear);
      if (isNaN(regYear) || regYear < 1900 || regYear > currentYear) {
        return res.status(400).json({
          success: false,
          error: 'Invalid registration year',
          message: `Registration year must be a valid year between 1900 and ${currentYear}`
        });
      }

      // Validate gender
      const validGenders = ['male', 'female', 'other'];
      if (!validGenders.includes(gender.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid gender',
          message: 'Gender must be one of: male, female, other'
        });
      }

      // Validate medical specialty structure
      if (typeof medicalSpecialty === 'string' && medicalSpecialty.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Invalid medical specialty',
          message: 'Medical specialty cannot be empty'
        });
      }

      if (typeof medicalSpecialty === 'object' && (!medicalSpecialty.name || medicalSpecialty.name.trim() === '')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid medical specialty',
          message: 'Medical specialty name is required'
        });
      }
  
      // Find the user by ID
      const foundUser = await Doctor.findById(providerId);
      //find user from User model
      const userModelUser = await User.findById(providerId)
  
      if (!foundUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
  
      // Convert medicalSpecialty to object if it's a string
    let medicalSpecialtyObj = medicalSpecialty;
    if (typeof medicalSpecialty === 'string') {
      medicalSpecialtyObj = {
        name: medicalSpecialty.toLowerCase(), // Convert name to lowercase
        fee: 1000 // Default fee, adjust as needed
      };
    } else if (medicalSpecialty && typeof medicalSpecialty === 'object' && medicalSpecialty.name) {
      medicalSpecialtyObj.name = medicalSpecialty.name.toLowerCase();
    }
  
      // Update the doctor's profile with the new information
      foundUser.fullName = fullName || foundUser.fullName;
      foundUser.registrationNumber = registrationNumber || foundUser.registrationNumber;
      foundUser.registrationYear = registrationYear || foundUser.registrationYear;
      foundUser.registrationCouncil = registrationCouncil || foundUser.registrationCouncil;
      foundUser.country = country || foundUser.country;
      foundUser.address = address || foundUser.address;
      foundUser.gender = gender || foundUser.gender;
      foundUser.about = about || foundUser.about;
      if (medicalSpecialtyObj) {
        foundUser.medicalSpecialty = medicalSpecialtyObj; // Assign the object
      }
  
      // Save the updated user profile
       await foundUser.save(); // Saving the updates and storing in variable

      // Handle file uploads to Cloudinary
      const updateQueries = {};
      const uploadedImages = [];
  
      // Iterate over each file and upload to Cloudinary
      for (const key in req.files) {
        const image = req.files[key];
        const fileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        const imageSize = 9024; // assuming you want to use 8.81 MB = 9024 KB
  
        if (!fileTypes.includes(image.mimetype)) {
          return res.status(400).json({ success: false, error: 'Image formats supported: JPG, PNG, JPEG' });
        }
  
        if (image.size / 9024 > imageSize) { // assuming size is in bytes, you need to convert to KB
          return res.status(400).json({ success: false, error: `Image size should be less than ${imageSize}kb` });
        }
  
        // Upload to Cloudinary
        const cloudFile = await upload(image.tempFilePath, providerId);
        uploadedImages.push({ [key]: cloudFile.url });
        updateQueries[`images.${key}`] = cloudFile.url;
      }
  
      // Update user model with the Cloudinary URLs for all images
      const updatedDoctor = await Doctor.findByIdAndUpdate(providerId, { $set: updateQueries }, { new: true });

       // Set kycVerification to true after successful profile and image updates
       
       userModelUser.kycVerificationStatus = 'Pending';
       userModelUser.isApproved = 'Pending';
       await foundUser.save(); 
  
      res.status(201).json({
        success: true,
        message: 'Profile and image updated successfully',
        updatedDoctor: updatedDoctor, // Sending the updated doctor information
        imageUrls: uploadedImages,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      // It's useful to log the actual error message to understand what went wrong
      res.status(500).json({ success: false, error: 'Error updating profile', errorMessage: error.message });
    }
  },

  setOtherCredentials: async (req, res) => {
    try {
      const providerId = req.params.providerId;
      
      const {
        name,
        providerType,
        registrationNumber,
        registrationYear,
        registrationCouncil,
        country,
        address,
        phone,
        about,
      } = req.body;

      // Validation: Check if all required fields are provided
      const requiredFields = {
        name: 'Provider name',
        providerType: 'Provider type',
        registrationNumber: 'Registration number',
        registrationYear: 'Registration year',
        registrationCouncil: 'Registration council',
        country: 'Country',
        address: 'Address',
        phone: 'Phone number',
        about: 'About section'
      };

      const missingFields = [];
      for (const [field, displayName] of Object.entries(requiredFields)) {
        if (!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
          missingFields.push(displayName);
        }
      }

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: `Please provide the following required fields: ${missingFields.join(', ')}`,
          missingFields: missingFields
        });
      }

      // Validate provider type
      const validProviderTypes = ['doctor', 'pharmacy', 'therapist', 'laboratory'];
      if (!validProviderTypes.includes(providerType.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid provider type',
          message: `Provider type must be one of: ${validProviderTypes.join(', ')}`
        });
      }

      // Validate registration year
      const currentYear = new Date().getFullYear();
      const regYear = parseInt(registrationYear);
      if (isNaN(regYear) || regYear < 1900 || regYear > currentYear) {
        return res.status(400).json({
          success: false,
          error: 'Invalid registration year',
          message: `Registration year must be a valid year between 1900 and ${currentYear}`
        });
      }

      // Validate phone number format (basic validation)
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number',
          message: 'Please provide a valid phone number'
        });
      }
  
  
      // Determine the appropriate model based on providerType
      let Model;
      switch (providerType) {
        case 'doctor':
          Model = Doctor;
          break;
        case 'pharmacy':
          Model = Pharmacy;
          break;
        case 'therapist':
          Model = Therapist;
          break;
        case 'laboratory':
          Model = Laboratory;
          break;
        default:
          return res.status(400).json({ success: false, error: 'Invalid provider type' });
      }
  
      // Find the provider by ID using the selected model
      const foundUser = await Model.findById(providerId);
      // find user from user model to update isApproved and kyc
      const userModelUser = await User.findById(providerId)
  
      if (!foundUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
  
      // Update the provider's profile with the new information
      foundUser.name = name || foundUser.name;
      foundUser.registrationNumber = registrationNumber || foundUser.registrationNumber;
      foundUser.registrationYear = registrationYear || foundUser.registrationYear;
      foundUser.registrationCouncil = registrationCouncil || foundUser.registrationCouncil;
      foundUser.country = country || foundUser.country;
      foundUser.address = address || foundUser.address;
      foundUser.phone = phone || foundUser.phone;
      foundUser.about = about || foundUser.about;
  
      // Save the updated user profile
      await foundUser.save();
  
      // Handle file uploads to Cloudinary
      const updateQueries = {};
      const uploadedImages = [];
  
      // Iterate over each file and upload to Cloudinary
      for (const key in req.files) {
        const image = req.files[key];
        const fileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        const imageSize = 9024; // assuming you want to use 8.81 MB = 9024 KB
  
        if (!fileTypes.includes(image.mimetype)) {
          return res.status(400).json({ success: false, error: 'Image formats supported: JPG, PNG, JPEG' });
        }
  
        if (image.size / 9024 > imageSize) { // assuming size is in bytes, you need to convert to KB
          return res.status(400).json({ success: false, error: `Image size should be less than ${imageSize}kb` });
        }
  
        // Upload to Cloudinary
        const cloudFile = await upload(image.tempFilePath, providerId);
        uploadedImages.push({ [key]: cloudFile.url });
        updateQueries[`images.${key}`] = cloudFile.url;
      }
  
      // Update user model with the Cloudinary URLs for all images
      const updatedUser = await Model.findByIdAndUpdate(providerId, { $set: updateQueries }, { new: true });
  
      // Set kycVerification to true after successful profile and image updates
      userModelUser.kycVerificationStatus = 'Pending';
      userModelUser.isApproved = 'Pending';
      await foundUser.save();
  
      res.status(201).json({
        success: true,
        message: 'Profile and image updated successfully',
        updatedUser: updatedUser, // Sending the updated user information
        imageUrls: uploadedImages,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ success: false, error: 'Error updating profile', errorMessage: error.message });
    }
  },
  




  addReview: async (req, res) => {
    try {
      const doctorId = req.params.doctorId;
      const { patientId, rating, comment } = req.body;

      // Ensure rating is within the 1-5 range
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
      }

      // Find the doctor by ID
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({ success: false, message: "Doctor not found" });
      }

      // Find the most recent completed consultation session for this doctor and patient
    const session = await ConsultationSession.findOne({
      doctor: doctorId,
      patient: patientId,
      status: 'completed', // Only find sessions that have been completed
    }).sort({ endTime: -1 }); // Sort by endTime to get the most recent session

    if (!session) {
      return res.status(404).json({ success: false, message: "No completed consultation session found between this doctor and patient." });
    }


    // Check if a review already exists for this session
    const existingReview = await Reviews.findOne({ consultationSession: session._id });
    if (existingReview) {
      return res.status(400).json({ success: false, message: "Review already submitted for this session." });
    }

      // Create a new review
      const review = await Reviews.create({
        doctor: doctorId,
        patient: patientId,
        consultationSession: session._id,
        rating,
        comment,
      });

      // Add review to doctor's reviews
      doctor.reviews.push(review._id);
      await doctor.save();

      return res.status(201).json({ success: true, message: "Review added successfully", review });
    } catch (error) {
      console.error("Error adding review:", error);
      return res.status(500).json({ success: false, message: "Error adding review" });
    }
  },

  // Add this function within the healthProviderControllers object

getDoctorReviews: async (req, res) => {
  try {
      const doctorId = req.params.doctorId;
      
      // Ensure the doctor exists
      const doctorExists = await Doctor.findById(doctorId);
      if (!doctorExists) {
          return res.status(404).json({ success: false, message: "Doctor not found" });
      }

      // Fetch reviews for the doctor and include patient's name
      const reviews = await Reviews.find({ doctor: doctorId })
                                   .populate({
                                      path: 'patient',
                                      select: 'firstName lastName -_id' // Adjust the fields as needed
                                   })
                                   .exec();

      if (reviews.length === 0) {
          return res.status(404).json({ success: false, message: "No reviews found for this doctor." });
      }

      res.status(200).json({ success: true, reviews });
  } catch (error) {
      console.error("Error fetching doctor reviews:", error);
      res.status(500).json({ success: false, message: "Error fetching reviews", error: error.message });
  }
},



  // Function to get top-rated doctors
  getTopRatedDoctors: async (req, res) => {
    try {
      const topRatedDoctors = await Doctor.aggregate([
        {
          $lookup: {
            from: "users", // Join with the "users" collection (which is the User model)
            localField: "_id", // Doctor's _id
            foreignField: "_id", // User's _id
            as: "userDetails" // Store the matched user details in userDetails
          }
        },
        {
          $unwind: "$userDetails" // Flatten the userDetails array to access user fields directly
        },
        {
          $match: {
            "userDetails.isApproved": "Approved" // Filter based on approval status only
          }
        },
        {
          $lookup: {
            from: "reviews", // Assuming the reviews collection is named "reviews"
            localField: "_id", // Doctor's _id
            foreignField: "doctor", // The field in the review that references the doctor
            as: "reviews" // Store the reviews in an array called reviews
          }
        },
        {
          $addFields: {
            reviewCount: { $size: "$reviews" },
            averageRating: { 
              $cond: {
                if: { $eq: [{ $size: "$reviews" }, 0] },
                then: 0, // Default rating for doctors with no reviews
                else: { $avg: "$reviews.rating" }
              }
            }
          }
        },
        {
          $sort: { averageRating: -1 } // Sort by average rating in descending order
        },
        {
          $limit: 10 // Limit to top 10 doctors (you can adjust as needed)
        }
      ]);
      
      console.log(`Found ${topRatedDoctors.length} top-rated doctors`);
  
      res.status(200).json({
        success: true,
        data: topRatedDoctors
      });
    } catch (error) {
      console.error("Error fetching top-rated doctors:", error); // For better error tracking
      res.status(500).json({ success: false, message: "Error fetching top-rated doctors", error });
    }
  }, 


  getAllLaboratories: async (req, res) => {
    try {
      // Find all laboratories whose id matches the User's id and check for Approved status only
      const laboratories = await Laboratory.aggregate([
        {
          $lookup: {
            from: 'users', // Assuming the collection name for the User model is 'users'
            localField: '_id', // Laboratory's _id
            foreignField: '_id', // User's _id
            as: 'userDetails' // Create an array field 'userDetails' to hold user info
          }
        },
        {
          $unwind: '$userDetails' // Flatten the 'userDetails' array to access user fields directly
        },
        {
          $match: {
            'userDetails.isApproved': 'Approved' // Match approved status only
          }
        }
      ]);
      
      res.status(200).json({ success: true, laboratories });
    } catch (error) {
      console.error("Error fetching laboratories:", error); // For better error tracking
      res.status(500).json({ success: false, message: 'Error fetching laboratories', error });
    }
  },

  getAllPharmacies: async (req, res) => {
    try {
      // Find all pharmacies whose id matches the User's id and check for Approved status only
      const pharmacies = await Pharmacy.aggregate([
        {
          $lookup: {
            from: 'users', // Assuming the collection name for the User model is 'users'
            localField: '_id', // Pharmacy's _id
            foreignField: '_id', // User's _id
            as: 'userDetails' // Create an array field 'userDetails' to hold user info
          }
        },
        {
          $unwind: '$userDetails' // Flatten the 'userDetails' array to access user fields directly
        },
        {
          $match: {
            'userDetails.isApproved': 'Approved' // Match approved status only
          }
        }
      ]);
      
      res.status(200).json({ success: true, pharmacies });
    } catch (error) {
      console.error("Error fetching pharmacies:", error); // For better error tracking
      res.status(500).json({ success: false, message: 'Error fetching pharmacies', error });
    }
  },

  getAllTherapists: async (req, res) => {
    try {
      // Find all therapists whose id matches the User's id and check for Approved status only
      const therapists = await Therapist.aggregate([
        {
          $lookup: {
            from: 'users', // Assuming the collection name for the User model is 'users'
            localField: '_id', // Therapist's _id
            foreignField: '_id', // User's _id
            as: 'userDetails' // Create an array field 'userDetails' to hold user info
          }
        },
        {
          $unwind: '$userDetails' // Flatten the 'userDetails' array to access user fields directly
        },
        {
          $match: {
            'userDetails.isApproved': 'Approved' // Match approved status only
          }
        }
      ]);
      
      res.status(200).json({ success: true, therapists });
    } catch (error) {
      console.error("Error fetching therapists:", error); // For better error tracking
      res.status(500).json({ success: false, message: 'Error fetching therapists', error });
    }
  },

  getAllDoctors: async (req, res) => {
     

    try {
      // Find all doctors whose id matches the User's id and check for Approved status only
      const doctors = await Doctor.aggregate([
        {
          $lookup: {
            from: 'users', // Assuming the collection name for the User model is 'users'
            localField: '_id', // Doctor's _id
            foreignField: '_id', // User's _id
            as: 'userDetails' // Create an array field 'userDetails' to hold user info
          }
        },
        {
          $unwind: '$userDetails' // Flatten the 'userDetails' array to access user fields directly
        },
        {
          $match: {
            'userDetails.isApproved': 'Approved' // Match approved status only
          }
        }
      ]);
  
      // Send the response with the list of doctors
      res.status(200).json({ success: true, doctors });
    } catch (error) {
      console.error("Error fetching doctors:", error); // For better error tracking
      res.status(500).json({ success: false, message: 'Error fetching doctors', error });
    }
  },

  // this function works with the prescription controller flow
  recommendHealthProvider: async (req, res) => {
    try {
      const { providerType, patientId } = req.body;
      const doctorId = req.params.doctorId;
  
      // Find the patient
      const patient = await User.findOne({ _id: patientId, role: 'patient' });
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }
  
      // Find the doctor
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }
  
      // Find approved providers by role (providerType)
      const providers = await User.find({ 
        role: providerType, 
        isApproved: "Approved"
      });
  
      // Ensure patient and providers have location data
      if (!patient.location || !patient.location.coordinates) {
        return res.status(400).json({ success: false, message: 'Patient location not found' });
      }
  
      const patientLocation = { lat: patient.location.coordinates[1], lon: patient.location.coordinates[0] };
  
      // Map providers to fetch detailed information from the respective schemas
      const providersWithDetails = await Promise.all(providers.map(async (provider) => {
        if (!provider.location || !provider.location.coordinates) return null;
  
        const providerLocation = {
          lat: provider.location.coordinates[1],
          lon: provider.location.coordinates[0]
        };
        const distance = haversineDistance(patientLocation.lat, patientLocation.lon, providerLocation.lat, providerLocation.lon);
  
        if (isNaN(distance)) {
          console.error('Invalid distance calculated:', { patientLocation, providerLocation });
          return null;
        }
  
        let providerDetails;
        switch (provider.role) {
          case 'doctor':
            providerDetails = await Doctor.findById(provider._id);
            break;
          case 'pharmacy':
            providerDetails = await Pharmacy.findById(provider._id);
            break;
          case 'therapist':
            providerDetails = await Therapist.findById(provider._id);
            break;
          case 'laboratory':
            providerDetails = await Laboratory.findById(provider._id);
            break;
          default:
            providerDetails = null;
        }
  
        return providerDetails ? {
          ...provider.toObject(),
          distance,
          providerName: providerDetails.name || providerDetails.fullName,
          address: providerDetails.address || 'N/A',
          about: providerDetails.about || 'No information available',
          profilePhoto: providerDetails.images.profilePhoto || null,
          phone: providerDetails.phone || null,
          recommendedBy: {
            doctorId: doctor._id,
            doctorName: doctor.fullName
          }
        } : null;
      }));
  
      // Filter out null values and sort by distance
      const sortedProviders = providersWithDetails.filter(provider => provider !== null).sort((a, b) => a.distance - b.distance);
  
      // Save the recommendation to the patient's data
      patient.recommendations = sortedProviders.map(provider => ({
        providerId: provider._id,
        providerName: provider.providerName,
        providerType: providerType,
        distance: provider.distance,
        address: provider.address,
        about: provider.about,
        profilePhoto: provider.profilePhoto,
        phone: provider.phone,
        recommendedBy: provider.recommendedBy
      }));
      await patient.save();
  
      res.status(200).json({ success: true, providers: sortedProviders });
    } catch (error) {
      console.error('Error recommending health provider:', error);
      res.status(500).json({ success: false, message: 'Error recommending health provider', error: error.message });
    }
  },
  
  

  
  
// this function works with the prescription controller flow
  getRecommendedProviders: async (req, res) => {
    try {
      const patientId = req.params.patientId;
  
      // Find the patient
      const patient = await User.findOne({ _id: patientId, role: 'patient' });
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }
  
      // Return the recommended providers
      res.status(200).json({ success: true, recommendations: patient.recommendations });
    } catch (error) {
      console.error('Error fetching recommended providers:', error);
      res.status(500).json({ success: false, message: 'Error fetching recommended providers', error: error.message });
    }
  },
  


  // Controller function to check the online status of a health provider
  checkOnlineStatus: async (req, res) => {
    try {
      const providerId = req.params.providerId;

      // Find the health provider by ID
      const provider = await Doctor.findById(providerId);

      if (!provider) {
        return res.status(404).json({ success: false, message: 'Health provider not found' });
      }

      // Respond with the online status of the health provider
      res.status(200).json({ success: true, isOnline: provider.isOnline });
    } catch (error) {
      console.error('Error checking online status:', error);
      res.status(500).json({ success: false, error: 'Error checking online status' });
    }
  },

   // Controller function to get online and sponsored doctors
   getOnlineSponsoredDoctors: async (req, res) => {
    try {
      // Query the database for doctors with isOnline and sponsored set to true
      const doctors = await Doctor.find({ isOnline: true, sponsored: true });

      // Respond with the list of doctors
      res.status(200).json({ success: true, doctors });
    } catch (error) {
      console.error('Error fetching online and sponsored doctors:', error);
      res.status(500).json({ success: false, error: 'Error fetching online and sponsored doctors' });
    }
  },

  // Controller function to update the isOnline status of a doctor
  updateIsOnlineStatus: async (req, res) => {
    try {
      const { doctorId } = req.params;
      const { isOnline } = req.body;

      // Find the doctor by ID
      const doctor = await Doctor.findById(doctorId);

      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }

      // Update the isOnline status
      doctor.isOnline = isOnline;
      await doctor.save();

      // Respond with the updated doctor
      res.status(200).json({ success: true, doctor });
    } catch (error) {
      console.error('Error updating isOnline status:', error);
      res.status(500).json({ success: false, error: 'Error updating isOnline status' });
    }
  },


  //
  doctorSummary: async (req, res) => {
    try {
        const doctorId = req.params.doctorId;

        // Fetch user and doctor data
        const user = await User.findById(doctorId);
        const doctor = await Doctor.findById(doctorId);

        if (!user || !doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        // Calculate today's earnings
        const startOfDay = moment().startOf('day').toDate();
        const endOfDay = moment().endOf('day').toDate();

        const todayEarnings = await ConsultationSession.aggregate([
            { 
                $match: { 
                    doctor: new mongoose.Types.ObjectId(doctorId), 
                    status: 'completed' || 'in-progressn', 
                    createdAt: { $gte: startOfDay, $lt: endOfDay }
                }
            },
            { 
                $lookup: {
                    from: 'transactions', // The name of the collection that holds your transactions
                    localField: 'escrowTransaction',
                    foreignField: '_id',
                    as: 'transactions'
                }
            },
            { $unwind: '$transactions' },
            { $group: { _id: null, totalEarnings: { $sum: '$transactions.amount' } } }
        ]);

        // Count today's patients attended to
        const todayPatientsCount = await ConsultationSession.countDocuments({
            doctor: doctorId,
            status: 'completed' || 'in-progress',
            createdAt: { $gte: startOfDay, $lt: endOfDay }
        });

        // Calculate overall rating from the Reviews schema
        const overallRating = await Reviews.aggregate([
            { $match: { doctor: new mongoose.Types.ObjectId(doctorId) } },
            { $group: { _id: null, averageRating: { $avg: "$rating" } } }
        ]);

        // Completed consultations
        const completedConsultations = await ConsultationSession.countDocuments({
            doctor: doctorId,
            status: 'completed'
        });

        res.json({
            walletBalance: user.walletBalance,
            todayEarnings: todayEarnings[0]?.totalEarnings || 0,
            patientsAttendedTo: todayPatientsCount,
            overallRating: overallRating.length > 0 ? overallRating[0].averageRating.toFixed(1) : 0,
            completedConsultations: completedConsultations
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
},

getPatientsOfDoctor: async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    console.log('Doctor ID:', doctorId); // Debugging line

    // Fetch all consultation sessions involving the doctor
    const sessions = await ConsultationSession.find({ doctor: doctorId })
      .populate({
        path: 'patient',
        select: 'firstName lastName profilePhoto',
      })
      .populate({
        path: 'prescription',
        populate: [
          { path: 'doctor', select: 'fullName' },
          { path: 'patient', select: 'firstName lastName' },
          { path: 'provider', select: 'name' },
        ],
      })
      .exec();


    // Extract patient IDs (with null check)
    const patientIds = [...new Set(sessions
      .filter(session => session.patient && session.patient._id) // Filter out sessions with null patient
      .map(session => session.patient._id.toString())
    )];

    // Fetch prescriptions for these patients and doctor
    const prescriptions = await Prescription.find({ patient: { $in: patientIds }, doctor: doctorId })
      .populate({
        path: 'provider',
        select: 'name',
      })
      .exec();


    // Fetch test results for prescriptions
    const prescriptionIds = [...new Set(prescriptions.map(prescription => prescription._id.toString()))];
    const testResults = await TestResult.find({ prescription: { $in: prescriptionIds } })
      .populate({
        path: 'provider',
        select: 'name',
      })
      .exec();


    // Fetch medical records for these patients
    const medicalRecords = await MedicalRecord.find({ _id: { $in: patientIds } })
      .exec();


    // Format the result
    const result = sessions
      .filter(session => session.patient && session.patient._id) // Filter out sessions with null patient
      .map(session => {
        const patientPrescriptions = prescriptions.filter(prescription => prescription.patient.toString() === session.patient._id.toString());
        const patientResults = testResults.filter(result => patientPrescriptions.some(prescription => prescription._id.toString() === result.prescription.toString()));
        const patientMedicalRecord = medicalRecords.find(record => record._id.toString() === session.patient._id.toString()) || null;

      return {
        patient: {
          ...session.patient.toObject(),
          sessionId: session._id.toString(), // Add sessionId inside the patient object
          medicalRecord: patientMedicalRecord, // Include medical record or null if not available
          status: session.status,
          prescriptions: patientPrescriptions,
          testResults: patientResults,
        },
      };
    });

    return res.json(result);
  } catch (error) {
    console.error('Error fetching patients of doctor:', error);
    return res.status(500).json({ error: 'Error fetching data' });
  }
}







  
  
  





};

export default healthProviderControllers;
