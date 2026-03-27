//admin controller

import { Doctor, Pharmacy, Laboratory } from "../models/healthProviders.js";
import User from "../models/user.js";
import Consultation from "../models/consultationModel.js";
import { Prescription } from "../models/services.js";
import { sendNotificationEmail } from "../utils/nodeMailer.js"
import moment from 'moment';
import { Transaction } from "../models/services.js"

// Import necessary modules for the new functions
import notificationController from "./notificationController.js";

const adminController = {
  

  updateKycVerificationStatus: async (req, res) => {
    try {
      // Use authenticated user from middleware instead of URL parameter
      const adminId = req.user._id;

      // Double-check admin role (redundant but safe)
      if (req.user.role !== 'admin' && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied. Only admin can update kycVerification status.',
        });
      }

      // Extract necessary information from the request
      const { userId, kycVerificationStatus } = req.body;

      // Find the user by ID
      const foundUser = await Doctor.findById(userId);

      if (!foundUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Update the kycVerification status
      foundUser.kycVerification = kycVerificationStatus;

      // Save the updated user
      const updatedUser = await foundUser.save();

      res.status(200).json({
        success: true,
        message: 'KycVerification status updated successfully',
        updatedUser,
      });
    } catch (error) {
      console.error('Error updating kycVerification status:', error);
      res.status(500).json({ success: false, error: 'Error updating kycVerification status' });
    }
  },

  getProvidersCredentials: async (req, res) => {
  try {
    const adminId = req.params.userId;
    const { providerId, providerType } = req.query;

    // Validate admin user
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    // Check if user is admin
    if (!admin.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied. Only admin can access provider credentials.'
      });
    }

    // Validate query parameters
    if (!providerId || !providerType) {
      return res.status(400).json({
        success: false,
        error: 'providerId and providerType are required.'
      });
    }

    // Define valid provider types
    const validProviderTypes = ['Doctor', 'Laboratory', 'Pharmacy'];
    if (!validProviderTypes.includes(providerType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid providerType. Must be Doctor, Laboratory, or Pharmacy.'
      });
    }

    // Query the appropriate model based on providerType
    let provider;
    switch (providerType) {
      case 'Doctor':
        provider = await Doctor.findById(providerId).select('images');
        break;
      case 'Laboratory':
        provider = await Laboratory.findById(providerId).select('images');
        break;
      case 'Pharmacy':
        provider = await Pharmacy.findById(providerId).select('images');
        break;
    }

    // Check if provider exists
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: `${providerType} not found.`
      });
    }

    // Extract credential URLs
    const credentials = {
      profilePhoto: provider.images.profilePhoto || null,
      governmentIdfront: provider.images.governmentIdfront || null,
      governmentIdback: provider.images.governmentIdback || null,
      license: provider.images.license || null,
      certificate: provider.images.certificate || null,
      educationQualification: provider.images.educationQualification || null
    };

    // Return success response with credentials
    return res.status(200).json({
      success: true,
      data: {
        providerId,
        providerType,
        credentials
      }
    });

  } catch (error) {
    console.error('Error fetching provider credentials:', error);
    return res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again.'
    });
  }
},


  updateConsultationFees: async (req, res) => {
    try {
      // Use authenticated user from middleware instead of URL parameter
      const adminId = req.user._id;

      // Double-check admin role
      if (req.user.role !== 'admin' && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied. Only admin can update consultation fees.',
        });
      }

      // Extract fee information from the request
      const { doctorId, specialty, newFee } = req.body;

      // Find the doctor by ID
      const doctor = await Doctor.findById(doctorId);

      if (!doctor) {
        return res.status(404).json({ success: false, error: 'Doctor not found' });
      }

      // Check if the specialty already exists
      const specialtyIndex = doctor.medicalSpecialty.findIndex(s => s.name === specialty);

      if (specialtyIndex > -1) {
        // Specialty exists, update the fee
        doctor.medicalSpecialty[specialtyIndex].fee = newFee;
      } else {
        // Specialty doesn't exist, add new specialty with fee
        doctor.medicalSpecialty.push({ name: specialty, fee: newFee });
      }

      // Save the updated doctor
      await doctor.save();

      res.status(200).json({
        success: true,
        message: 'Consultation fees updated successfully',
      });
    } catch (error) {
      console.error('Error updating consultation fees:', error);
      res.status(500).json({ success: false, error: 'Error updating consultation fees' });
    }
  },

  setFeeForAllSpecialties: async (req, res) => {
    try {
      // Use authenticated user from middleware instead of URL parameter
      const adminId = req.user._id;

      // Double-check admin role
      if (req.user.role !== 'admin' && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied. Only admin can set consultation fees.',
        });
      }

      // Extract fee information from the request
      const { specialtyToUpdate, newFee } = req.body;

  
      // Fetch all doctors with the specified specialty
      const doctors = await Doctor.find({ 'medicalSpecialty.name': specialtyToUpdate });
  
      // Update each doctor's fee for the specified specialty
      const updates = doctors.map(async (doctor) => {
        const specialtyIndex = doctor.medicalSpecialty.findIndex(s => s.name === specialtyToUpdate);
  
        if (specialtyIndex > -1) {
          // Specialty exists, update the fee
          doctor.medicalSpecialty[specialtyIndex].fee = newFee;
        } else {
          // Specialty doesn't exist, add new specialty with fee
          doctor.medicalSpecialty.push({ name: specialtyToUpdate, fee: newFee });
        }
  
        return doctor.save(); // Returns a promise
      });
  
      // Wait for all the update promises to resolve
      await Promise.all(updates);
  
      res.status(200).json({
        success: true,
        message: `Consultation fees for the specialty ${specialtyToUpdate} updated successfully across all doctors.`,
      });
    } catch (error) {
      console.error('Error setting fees for all specialties:', error);
      res.status(500).json({ success: false, error: 'Error setting fees for all specialties' });
    }
  },

  recommendDoctor: async (req, res) => {
    try {
        const { id } = req.params; // ID from the route parameters

        // First, confirm the user with this ID has a role of 'doctor'
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (user.role !== 'doctor') {
            return res.status(404).json({ message: "This user is not a doctor." });
        }

        // Since the User is a doctor, proceed to update the Doctor document using the same ID
        // Assuming the Doctor schema is separate but uses the same ID as the User schema for doctor roles
        const updatedDoctor = await Doctor.findByIdAndUpdate(
            id, // Use the ID directly since Doctor and User share the same ID
            { $set: { isRecommended: true } },
            { new: true }
        );

        if (!updatedDoctor) {
            return res.status(404).json({ message: "Doctor profile could not be updated." });
        }

        return res.status(200).json({
            message: "Doctor recommended successfully.",
            doctor: updatedDoctor
        });
    } catch (error) {
        console.error("Error recommending doctor:", error);
        res.status(500).json({ message: "Error recommending doctor", error: error.message });
    }
},


  getRecommendedDoctors: async (req, res) => {
    try {
      // Find all doctors that are recommended
      const recommendedDoctors = await Doctor.find({ isRecommended: true })
        .select('fullName images.profilePhoto medicalSpecialty')
        .lean(); // Add .lean() for performance if you don't need Mongoose documents
  
      res.status(200).json({
        message: "Recommended doctors retrieved successfully.",
        recommendedDoctors
      });
    } catch (error) {
      console.error("Error retrieving recommended doctors:", error);
      res.status(500).json({ message: "Error retrieving recommended doctors", error: error.message });
    }
  },



 // Controller function to update the sponsored status of a doctor
updateSponsoredStatus: async (req, res) => {
  try {
    const adminId = req.body.adminId; // Extract admin ID from the request body

    // Fetch the user from the database to check if they're an admin
    const user = await User.findById(adminId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    const isAdmin = user.isAdmin;

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied. Only admin can update sponsored status.',
      });
    }

    // Extract necessary information from the request
    const { doctorId, isOnlineStatus } = req.body;

    // Find the doctor by ID
    const foundDoctor = await Doctor.findById(doctorId);

    if (!foundDoctor) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }

    // Update the sponsored status
    foundDoctor.sponsored = isOnlineStatus;

    // Save the updated doctor
    const updatedDoctor = await foundDoctor.save();

    res.status(200).json({
      success: true,
      message: 'Sponsored status updated successfully',
      updatedDoctor,
    });
  } catch (error) {
    console.error('Error updating sponsored status:', error);
    res.status(500).json({ success: false, error: 'Error updating sponsored status' });
  }
},

setApprovalStatus: async (req, res) => {
   
  console.log("i got hit o");
  

  try {
    const adminId = req.params.adminId; // Assuming you're using authentication middleware that adds user info to req
    const { userId, isApproved, type, rejectionNote } = req.body; // Extract approval status, type, and rejection note

    // Check if the admin exists and is authorized
    const admin = await User.findById(adminId);
    if (!admin || !admin.isAdmin) {
      console.log("Unauthorized admin access");
      return res.status(403).json({
        success: false,
        message: "Unauthorized to perform this action",
      });
    }

    // Validate user type and find provider
    let provider;
    if (type === "doctor") {
      provider = await Doctor.findById(userId);
    } else if (type === "laboratory") {
      provider = await Laboratory.findById(userId);
    } else if (type === "pharmacy") {
      provider = await Pharmacy.findById(userId);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid user type specified",
      });
    }

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    // Find the corresponding User record
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update approval status and KYC verification status on both models
    if (isApproved === "Approved") {
      // Update provider model
      provider.isApproved = true;
      provider.kycVerificationStatus = "Verified";
      
      // Update User model
      user.isApproved = "Approved";
      user.kycVerificationStatus = "Verified";
    } else if (isApproved === "Rejected") {
      if (!rejectionNote) {
        return res.status(400).json({
          success: false,
          message: "Rejection note is required when rejecting an approval",
        });
      }
      
      // Update provider model
      provider.isApproved = false;
      provider.kycVerificationStatus = "Rejected";
      provider.rejectionNote = rejectionNote; // Store the reason for rejection
      
      // Update User model
      user.isApproved = "Rejected";
      user.kycVerificationStatus = "Rejected";
      // Store rejection note if needed in User model
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid approval status. Use 'Approved' or 'Rejected'.",
      });
    }

    // Save both models
    await Promise.all([provider.save(), user.save()]);

    res.status(200).json({
      success: true,
      message: "Provider approval and KYC verification status updated successfully",
      provider,
      user,
    });
  } catch (error) {
    console.error("Error updating approval status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating approval status",
      error: error.message,
    });
  }
},



getStatisticsCards: async (req, res) => {
  try {
      // Total number of doctors
      const totalDoctors = await User.countDocuments({ role: 'doctor' });

      // Total number of patients
      const totalPatients = await User.countDocuments({ role: 'patient' });

      // Total number of scheduled consultations
      const totalScheduled = await Consultation.countDocuments({ status: 'scheduled' });

      // Total number of canceled consultations
      const totalCanceled = await Consultation.countDocuments({ status: 'cancelled' });

      // Sending the statistics response
      res.status(200).json({
          success: true,
          data: {
              totalDoctors,
              totalPatients,
              totalScheduled,
              totalCanceled,
          },
      });
  } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({
          success: false,
          message: 'An error occurred while fetching statistics',
          error: error.message,
      });
  }
},


getPatientStat: async (req, res) => {
  try {
    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    const weekStart = moment().startOf('isoWeek').toDate(); // ISO week for better consistency
    const weekEnd = moment().endOf('isoWeek').toDate();
    const monthStart = moment().startOf('month').toDate();
    const monthEnd = moment().endOf('month').toDate();

    // Query for daily patients
    const patientsPerDay = await User.countDocuments({
      role: 'patient',
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    // Query for weekly patients
    const patientsPerWeek = await User.countDocuments({
      role: 'patient',
      createdAt: { $gte: weekStart, $lte: weekEnd },
    });

    // Query for monthly patients
    const patientsPerMonth = await User.countDocuments({
      role: 'patient',
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    res.status(200).json({
      success: true,
      data: {
        patientsPerDay,
        patientsPerWeek,
        patientsPerMonth,
      },
    });
  } catch (error) {
    console.error('Error fetching patient statistics:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching patient statistics',
      error: error.message,
    });
  }
},


getTopAilments: async (req, res) => {
  try {
    const topAilments = await Prescription.aggregate([
      // Match only approved prescriptions, if necessary
      { $match: { diagnosis: { $exists: true, $ne: null } } },

      // Group by diagnosis and count occurrences
      { $group: { _id: "$diagnosis", count: { $sum: 1 } } },

      // Sort in descending order by count
      { $sort: { count: -1 } },

      // Optional: Limit to top 5 ailments
      { $limit: 5 },

      // Project the output for better readability
      { $project: { diagnosis: "$_id", count: 1, _id: 0 } }
    ]);

    // Calculate the total number of prescriptions for percentage calculation
    const totalPrescriptions = await Prescription.countDocuments({
      diagnosis: { $exists: true, $ne: null },
    });

    // Add percentage field to each diagnosis
    const result = topAilments.map(ailment => ({
      diagnosis: ailment.diagnosis,
      count: ailment.count,
      percentage: ((ailment.count / totalPrescriptions) * 100).toFixed(2) // Percentage
    }));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching top ailments:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching top ailments",
      error: error.message,
    });
  }
},


approveRequest: async (req, res) => {
  try {
    // Aggregate data from the User model
    const totalRequests = await User.countDocuments({
      role: { $in: ['doctor', 'pharmacy', 'laboratory'] },
    });
    const approved = await User.countDocuments({
      isApproved: 'Approved',
      role: { $in: ['doctor', 'pharmacy', 'laboratory'] },
    });
    const pending = await User.countDocuments({
      kycVerificationStatus: 'Pending',
      role: { $in: ['doctor', 'pharmacy', 'laboratory'] },
    });
    const rejected = await User.countDocuments({
      kycVerificationStatus: 'Rejected',
      role: { $in: ['doctor', 'pharmacy', 'laboratory'] },
    });

    // Return the aggregated data
    res.status(200).json({
      success: true,
      data: {
        totalRequests,
        approved,
        pending,
        rejected,
      },
    });
  } catch (error) {
    console.error('Error fetching request status:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch request status' });
  }
},


approveRequestsList: async (req, res) => {
  try {
    // Helper function to map requests
    const mapRequests = async (providerRequests, providerType) => {
      return Promise.all(
        providerRequests.map(async (provider) => {
          console.log(`Provider Object:`, provider);
          // Fetch user data using the provider's userId
          const user = await User.findById(provider._id).select(
            "isApproved kycVerificationStatus"
          );

          console.log(`User ${provider._id} Approval Status from DB:`, user?.isApproved);

          return {
            id: provider._id,
            name: provider.fullName || provider.name,
            type: providerType,
            status: user?.isApproved === "Approved" ? "Approved" : "Pending",
            kycVerificationStatus: user?.kycVerificationStatus,
            documents: provider.images, // Use images from the provider schema if required
          };
        })
      );
    };

    // Fetch requests from all providers
    const doctorRequests = await Doctor.find().select("fullName images userId").lean();
    const pharmacyRequests = await Pharmacy.find().select("name images userId").lean();
    const laboratoryRequests = await Laboratory.find().select("name images userId").lean();

    // Map each provider type with their user data
    const doctors = await mapRequests(doctorRequests, "doctor");
    const pharmacies = await mapRequests(pharmacyRequests, "pharmacy");
    const laboratories = await mapRequests(laboratoryRequests, "laboratory");

    // Combine all requests into a single response
    const allRequests = [...doctors, ...pharmacies, ...laboratories];

    return res.status(200).json({
      success: true,
      data: allRequests,
    });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch requests",
      error: error.message,
    });
  }
},

GetPatients: async (req, res) => {
  try {
    // Fetch all users with role 'patient' and populate the medicalRecord field
    const patients = await User.find({ role: 'patient' }).populate('medicalRecord'); 

    if (!patients || patients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No patients found.',
      });
    }

    // Iterate through each patient and map the result
    const patientData = patients.map((patient) => {
      return {
        id: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        address: patient.address,
        gender: patient.gender,
        country: patient.country,
        medicalRecord: patient.medicalRecord ? {
          genotype: patient.medicalRecord.genotype,
          bloodGroup: patient.medicalRecord.bloodGroup,
          maritalStatus: patient.medicalRecord.maritalStatus,
          allergies: patient.medicalRecord.allergies,
          weight: patient.medicalRecord.weight,
          testResults: patient.medicalRecord.testResults,
          others: patient.medicalRecord.others,
        } : null,
      };
    });

    // Return the data to the admin
    res.status(200).json({
      success: true,
      patients: patientData,
    });
  } catch (error) {
    console.error('Error fetching patients and medical records:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient data.',
      error: error.message,
    });
  }
},


getAllPharmacies: async (req, res) => {
  try {
    const pharmacies = await Pharmacy.find().select('name location address phone images reviews isOnline sponsored kycVerification'); // Select necessary fields
    res.status(200).json(pharmacies);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pharmacies', error });
  }
},

// Function to fetch all laboratories
getAllLaboratories: async (req, res) => {
  try {
    const laboratories = await Laboratory.find().select('name location address phone images reviews isOnline sponsored kycVerification'); // Select necessary fields
    res.status(200).json(laboratories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching laboratories', error });
  }
},


getTotalMoneyFlow: async (req, res) => {
  try {
    const adminId = req.params.adminId; // Admin making the request

    // Verify the admin
    const admin = await User.findById(adminId);
    if (!admin || !admin.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to perform this action",
      });
    }

    // Aggregate total inflow and outflow
    const totalFlow = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalInflow: {
            $sum: {
              $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0],
            },
          },
          totalOutflow: {
            $sum: {
              $cond: [{ $eq: ["$type", "withdrawal"] }, "$amount", 0],
            },
          },
        },
      },
    ]);

    if (!totalFlow || totalFlow.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No transactions found in the app",
      });
    }

    res.status(200).json({
      success: true,
      message: "Total money flow fetched successfully",
      data: {
        totalInflow: totalFlow[0].totalInflow,
        totalOutflow: totalFlow[0].totalOutflow,
      },
    });
  } catch (error) {
    console.error("Error fetching total money flow:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching total money flow",
      error: error.message,
    });
  }
},


getUserTransactions: async (req, res) => {
  try {
    const adminId = req.params.adminId; // Admin making the request
    const { email } = req.body; // Email of the user whose transactions need to be fetched

   

    // Verify the admin
    const admin = await User.findById(adminId);
    if (!admin || !admin.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to perform this action",
      });
    }

    // Find the user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    console.log("User found:", user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Fetch transactions for the specified user
    const transactions = await Transaction.find({ userId: user.user });

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No transactions found for this user",
      });
    }

    res.status(200).json({
      success: true,
      message: "User transactions fetched successfully",
      transactions,
    });
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user transactions",
      error: error.message,
    });
  }
},




creditWalletBalance: async (req, res) => {
  const { adminId } = req.params;
  const { email, amount } = req.body;

  try {
   
    // Verify the adminId belongs to an admin
    const admin = await User.findById(adminId);
    if (!admin || !admin.isAdmin) {
      return res.status(403).json({ message: "Unauthorized: Only admins can suspend users." });
    }


    if (!email || isNaN(amount)) {
      return res.status(400).json({ message: "Email and valid amount are required." });
    }

    const roundedAmount = Math.round(amount * 100) / 100; // Ensure proper rounding
    if (roundedAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than zero." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.walletBalance = Math.round((user.walletBalance + roundedAmount) * 100) / 100; // Update balance with rounding
    await user.save();

    // Send notification email to admin
    await sendNotificationEmail(
      "admin@mail.com",
      "Wallet Balance Credited",
      `The wallet balance of ${email} has been credited with ${roundedAmount}. New balance: ${user.walletBalance}.`
    );

    res.status(200).json({ message: "Wallet balance credited successfully." });
  } catch (error) {
    console.error("Error crediting wallet balance:", error);
    res.status(500).json({ message: "Internal server error." });
  }
},

deductWalletBalance: async (req, res) => {
  const { adminId } = req.params;
  const { email, amount } = req.body;

  try {

    // Verify the adminId belongs to an admin
    const admin = await User.findById(adminId);
    if (!admin || !admin.isAdmin) {
      return res.status(403).json({ message: "Unauthorized: Only admins can suspend users." });
    }


    if (!email || isNaN(amount)) {
      return res.status(400).json({ message: "Email and valid amount are required." });
    }

    const roundedAmount = Math.round(amount * 100) / 100; // Ensure proper rounding
    if (roundedAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than zero." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.walletBalance < roundedAmount) {
      return res.status(400).json({ message: "Insufficient wallet balance." });
    }

    user.walletBalance = Math.round((user.walletBalance - roundedAmount) * 100) / 100; // Update balance with rounding
    await user.save();

    // Send notification email to admin
    await sendNotificationEmail(
      "admin@mail.com",
      "Wallet Balance Deducted",
      `The wallet balance of ${email} has been deducted by ${roundedAmount}. New balance: ${user.walletBalance}.`
    );

    res.status(200).json({ message: "Wallet balance deducted successfully." });
  } catch (error) {
    console.error("Error deducting wallet balance:", error);
    res.status(500).json({ message: "Internal server error." });
  }
},


suspendUser: async (req, res) => {
  const { adminId } = req.params;
  const { userId } = req.body;

  try {
    // Verify the adminId belongs to an admin
    const admin = await User.findById(adminId);
    if (!admin || !admin.isAdmin) {
      return res.status(403).json({ message: "Unauthorized: Only admins can suspend users." });
    }

    // Find the user to be suspended
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Suspend the user
    user.isSuspended = "true";
    await user.save();

    return res.status(200).json({ message: `User ${user.username} has been suspended successfully.` });
  } catch (error) {
    console.error("Error suspending user:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
},

 // Function to get all suspended accounts
 getSuspendedAccounts: async (req, res) => {
  try {
    // Find all suspended users
    const suspendedUsers = await User.find({ isSuspended: true });

    res.status(200).json({
      success: true,
      message: "Suspended accounts fetched successfully",
      suspendedUsers,
    });
  } catch (error) {
    console.error("Error fetching suspended accounts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching suspended accounts",
      error: error.message,
    });
  }
},

  // Function to get transactions that need verification
  getVerificationNeededTransactions: async (req, res) => {
    try {
      const adminId = req.params.adminId;

      // Verify the admin
      const admin = await User.findById(adminId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to perform this action",
        });
      }

      // Fetch transactions with 'verification_needed' status
      const transactions = await Transaction.find({ status: "verification_needed" })
        .populate('user', 'firstName lastName email')
        .sort({ date: -1 });

      if (!transactions || transactions.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No transactions found that need verification",
        });
      }

      res.status(200).json({
        success: true,
        message: "Transactions that need verification fetched successfully",
        transactions,
      });
    } catch (error) {
      console.error("Error fetching verification needed transactions:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching verification needed transactions",
        error: error.message,
      });
    }
  },

  // Function to manually verify a transaction
  manuallyVerifyTransaction: async (req, res) => {
    try {
      const adminId = req.params.adminId;
      const { transactionId, verificationStatus } = req.body;

      // Verify the admin
      const admin = await User.findById(adminId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to perform this action",
        });
      }

      // Find the transaction
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      // Check if the transaction is in 'verification_needed' status
      if (transaction.status !== "verification_needed") {
        return res.status(400).json({
          success: false,
          message: "This transaction does not need verification",
        });
      }

      // Update the transaction status based on admin verification
      if (verificationStatus === "success") {
        transaction.status = "success";
        transaction.notes = `${transaction.notes || ''} | Manually verified by admin ${admin.firstName} ${admin.lastName} on ${new Date().toISOString()}`;
        transaction.completedAt = new Date();

        // Find the user to send notification
        const user = await User.findById(transaction.user);
        if (user) {
          // Send email notification
          await sendNotificationEmail(
            user.email,
            "Withdrawal Successful",
            `Your withdrawal of ₦${transaction.amount} has been successfully processed.`
          );

          // Create in-app notification
          await notificationController.createNotification({
            recipient: user._id,
            title: "Withdrawal Successful",
            message: `Your withdrawal of ₦${transaction.amount} has been successfully processed.`,
            type: "transaction",
          });
        }
      } else if (verificationStatus === "failed") {
        transaction.status = "failed";
        transaction.notes = `${transaction.notes || ''} | Manually marked as failed by admin ${admin.firstName} ${admin.lastName} on ${new Date().toISOString()}`;

        // Find the user to send notification and refund the amount
        const user = await User.findById(transaction.user);
        if (user) {
          // Refund the amount to user's wallet
          user.walletBalance += transaction.amount;
          await user.save();

          // Send email notification
          await sendNotificationEmail(
            user.email,
            "Withdrawal Failed - Amount Refunded",
            `Your withdrawal of ₦${transaction.amount} has failed. The amount has been refunded to your wallet.`
          );

          // Create in-app notification
          await notificationController.createNotification({
            recipient: user._id,
            title: "Withdrawal Failed - Amount Refunded",
            message: `Your withdrawal of ₦${transaction.amount} has failed. The amount has been refunded to your wallet.`,
            type: "transaction",
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid verification status. Use 'success' or 'failed'.",
        });
      }

      // Save the updated transaction
      await transaction.save();

      res.status(200).json({
        success: true,
        message: `Transaction has been manually marked as ${verificationStatus}`,
        transaction,
      });
    } catch (error) {
      console.error("Error manually verifying transaction:", error);
      res.status(500).json({
        success: false,
        message: "Error manually verifying transaction",
        error: error.message,
      });
    }
  },

  // Function to check transfer status with Paystack
  checkTransferStatusWithPaystack: async (req, res) => {
    try {
      const adminId = req.params.adminId;
      const { transactionId } = req.body;

      // Verify the admin
      const admin = await User.findById(adminId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to perform this action",
        });
      }

      // Find the transaction
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      // Check if the transaction has a transferCode
      if (!transaction.transferCode) {
        return res.status(400).json({
          success: false,
          message: "This transaction does not have a transfer code to check",
        });
      }

      // Import the checkTransferStatus function
      const { checkTransferStatus } = await import("../config/paymentService.js");

      // Check the transfer status with Paystack
      const transferStatus = await checkTransferStatus(transaction.transferCode);

      // Update the transaction based on the Paystack status
      if (transferStatus === "success") {
        transaction.status = "success";
        transaction.notes = `${transaction.notes || ''} | Transfer verified with Paystack as successful on ${new Date().toISOString()}`;
        transaction.completedAt = new Date();

        // Find the user to send notification
        const user = await User.findById(transaction.user);
        if (user) {
          // Send email notification
          await sendNotificationEmail(
            user.email,
            "Withdrawal Successful",
            `Your withdrawal of ₦${transaction.amount} has been successfully processed.`
          );

          // Create in-app notification
          await notificationController.createNotification({
            recipient: user._id,
            title: "Withdrawal Successful",
            message: `Your withdrawal of ₦${transaction.amount} has been successfully processed.`,
            type: "transaction",
          });
        }
      } else if (transferStatus === "failed") {
        transaction.status = "failed";
        transaction.notes = `${transaction.notes || ''} | Transfer verified with Paystack as failed on ${new Date().toISOString()}`;

        // Find the user to send notification and refund the amount
        const user = await User.findById(transaction.user);
        if (user) {
          // Refund the amount to user's wallet
          user.walletBalance += transaction.amount;
          await user.save();

          // Send email notification
          await sendNotificationEmail(
            user.email,
            "Withdrawal Failed - Amount Refunded",
            `Your withdrawal of ₦${transaction.amount} has failed. The amount has been refunded to your wallet.`
          );

          // Create in-app notification
          await notificationController.createNotification({
            recipient: user._id,
            title: "Withdrawal Failed - Amount Refunded",
            message: `Your withdrawal of ₦${transaction.amount} has failed. The amount has been refunded to your wallet.`,
            type: "transaction",
          });
        }
      } else {
        // If the status is still pending or processing
        transaction.notes = `${transaction.notes || ''} | Transfer status checked with Paystack: ${transferStatus} on ${new Date().toISOString()}`;
      }

      // Save the updated transaction
      await transaction.save();

      res.status(200).json({
        success: true,
        message: `Transfer status checked with Paystack: ${transferStatus}`,
        paystackStatus: transferStatus,
        transaction,
      });
    } catch (error) {
      console.error("Error checking transfer status with Paystack:", error);
      res.status(500).json({
        success: false,
        message: "Error checking transfer status with Paystack",
        error: error.message,
      });
    }
  },

};

export default adminController;
