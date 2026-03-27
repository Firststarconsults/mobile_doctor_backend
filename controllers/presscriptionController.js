import mongoose from "mongoose";
import User from "../models/user.js";
import { Prescription, Transaction, TestResult } from "../models/services.js";
import { calculateFeesAndTransfer } from "../utils/inAppTransferService.js";
import {
  Doctor,
  Therapist,
  Pharmacy,
  Laboratory,
} from "../models/healthProviders.js";
import Message from "../models/messageModel.js";
import { upload } from "../config/cloudinary.js";
import { sendNotificationEmail, sendProviderContactEmail } from "../utils/nodeMailer.js";
import ConsultationSession from "../models/consultationModel.js";
import Conversation from "../models/conversationModel.js";
import { io } from "../server.js";
import notificationController from "./notificationController.js";
import { config } from "dotenv"
config();


// Assuming you have an admin user with a fixed ID for receiving fees
const adminId = process.env.ADMIN_ID || "676e9a195a2f8b6f664c2919";

// Log the admin ID to check if it's properly set
console.log('Admin ID from environment:', process.env.ADMIN_ID);
console.log('Default or fallback admin ID:', adminId);

const prescriptionController = {
  makePrescriptions: async (req, res) => {
    const { doctorId } = req.params;
    const {
      patientId,
      sessionId,
      medicines,
      labTests,
      diagnosis,
      providerType,
    } = req.body;

    try {
      const doctor = await Doctor.findById(doctorId);
      const patient = await User.findById(patientId);
      const session = await ConsultationSession.findById(sessionId);

      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found." });
      }
      if (doctor.kycVerification !== true) {
        return res.status(403).json({ message: "Doctor not verified." });
      }
      if (!patient) {
        return res.status(404).json({ message: "Patient not found." });
      }
      if (!session) {
        return res
          .status(404)
          .json({ message: "Consultation session not found." });
      }

      // Find or create a new prescription
      let prescription = await Prescription.findOne({
        patient: patientId,
        session: sessionId,
        status: { $in: ["completed", "pending"] },
      });

      if (!prescription) {
        // Create a new prescription
        prescription = new Prescription({
          doctor: doctorId,
          patient: patientId,
          session: sessionId,
          medicines: medicines || [],
          labTests: labTests || [],
          diagnosis: diagnosis || "",
          providerType: providerType || "",
          status: providerType === "laboratory" ? "pending" : "completed",
        });
      } else {
        // Update existing prescription
        if (medicines) {
          prescription.medicines = medicines;
        }
        if (labTests) {
          prescription.labTests = labTests;
        }
        if (diagnosis) {
          prescription.diagnosis = diagnosis;
        }

        // Set the correct status based on providerType
        if (providerType === "pharmacy") {
          prescription.status = "completed";
          session.status = "completed"; // Complete the session when a pharmacy prescription is made
          await session.save();
        } else if (providerType === "laboratory") {
          session.status = "in-progress"; // Keep the status pending for laboratory
        }

        prescription.providerType = providerType || prescription.providerType;
      }

      await prescription.save();

      // Use createNotification
      await notificationController.createNotification(
        patient._id,
        doctor._id,
        "Prescription Created",
        `A new prescription has been created for you by Dr. ${doctor.fullName}.`,
        prescription._id,
        "Prescription"
      );

      // Retrieve or create the conversation between the doctor and patient
      let conversation = await Conversation.findOne({
        participants: { $all: [doctorId, patientId] },
      });

      // Send automatic message within the conversation
      const message = new Message({
        conversationId: conversation._id, // Use conversation._id instead of sessionId
        sender: doctorId,
        receiver: patientId,
        content: "A new prescription has been issued",
        isSystemMessage: true,
      });
      await message.save();

      // Emit the system message to notify about the prescription creation
      io.emit("systemMessage", {
        type: "prescription",
        message: `Dr. ${doctor.firstName} ${doctor.lastName} has created a prescription for ${patient.firstName} ${patient.lastName}.`,
        prescriptionId: prescription._id,
        consultationId: session._id,
        timestamp: new Date(),
      });

      res.status(201).json({
        message: "Prescription created/updated successfully",
        prescriptionId: prescription._id,
        providerType: prescription.providerType,
        status: prescription.status,
      });
    } catch (error) {
      console.error("Failed to create/update prescription:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  },

  sharePrescription: async (req, res) => {
    const { prescriptionId, providerId, providerType, deliveryOption } =
      req.body;
    const patientId = req.params.patientId;

    // Validate inputs
    if (
      !mongoose.isValidObjectId(prescriptionId) ||
      !mongoose.isValidObjectId(providerId)
    ) {
      return res
        .status(400)
        .json({ message: "Invalid prescription or provider ID" });
    }

    try {
      const prescription = await Prescription.findById(prescriptionId);
      if (!prescription)
        return res.status(404).json({ message: "Prescription not found" });

      const patient = await User.findById(patientId);
      if (!patient)
        return res.status(404).json({ message: "Patient not found" });

      // Perform update using findByIdAndUpdate
      const updatedPrescription = await Prescription.findByIdAndUpdate(
        prescriptionId,
        {
          $set: {
            patientAddress: patient.address,
            deliveryOption: deliveryOption,
            providerType: providerType,
            provider: providerId, // Set provider reference
          },
        },
        { new: true } // Return the updated document
      );

      if (!updatedPrescription) {
        return res
          .status(500)
          .json({ message: "Failed to update prescription" });
      }

      const sharedPrescription = {
        prescription: prescription._id,
        deliveryOption,
        patient: patientId,
        patientAddress: prescription.patientAddress,
        diagnosis: prescription.diagnosis,
        deliveryOption: prescription.deliveryOption,
        medicines: prescription.medicines,
        createdAt: prescription.createdAt,
      };

      let ProviderModel;
      switch (providerType.toLowerCase()) {
        case "doctor":
          ProviderModel = Doctor;
          break;
        case "pharmacy":
          ProviderModel = Pharmacy;
          break;
        case "therapist":
          ProviderModel = Therapist;
          break;
        case "laboratory":
          ProviderModel = Laboratory;
          break;
        default:
          return res.status(400).json({ message: "Invalid provider type" });
      }

      const provider = await ProviderModel.findById(providerId);
      if (!provider)
        return res.status(404).json({ message: "Provider not found" });

      provider.prescriptions.push(sharedPrescription);
      await provider.save();

      // Fetch provider user information for email notification
      const providerUser = await User.findById(providerId);
      if (!providerUser)
        return res.status(404).json({ message: "Provider user not found" });

      // Send email notification
      const subject = "New Prescription Shared";
      const message = `A new prescription has been shared with you by patient ${patient.firstName} ${patient.lastName}. Please review it as soon as possible.`;
      await sendNotificationEmail(providerUser.email, subject, message);

      // Use createNotification
      await notificationController.createNotification(
        providerUser._id,
        patient._id,
        "Prescription Shared",
        `A new prescription has been shared with you by patient ${patient.firstName} ${patient.lastName}.`,
        prescriptionId,
        "Prescription"
      );

      res.status(200).json({
        message: "Prescription shared successfully",
        prescriptions: provider.prescriptions,
        patientAddress: prescription.patientAddress,
        diagnosis: prescription.diagnosis,
        deliveryOption: prescription.deliveryOption,
        medicines: prescription.medicines,
        createdAt: prescription.createdAt,
      });
    } catch (error) {
      console.error("Failed to share prescription:", error);
      res.status(500).json({ message: error.message });
    }
  },

  //at this point prescription has been share with a particular provider and patient should be able to get provider details
  getPatientPrescriptions: async (req, res) => {
    const patientId = req.params.patientId;

    try {
      // Fetch prescriptions, populate doctor details
      const prescriptions = await Prescription.find({ patient: patientId })
        .populate(
          "doctor",
          "fullName images.profilePhoto medicalSpecialty.name"
        )
        .sort({ createdAt: -1 });

      if (!prescriptions.length) {
        return res
          .status(404)
          .json({ message: "No prescriptions found for this patient" });
      }

      // Prepare an array to hold transformed prescriptions with provider details
      const prescriptionsWithDetails = await Promise.all(
        prescriptions.map(async (prescription) => {
          let providerDetails = null;

          // Fetch the provider based on the providerType (only for pharmacy and laboratory)
          if (prescription.providerType === "pharmacy") {
            providerDetails = await Pharmacy.findById(
              prescription.provider
            ).select("name address phone");
          } else if (prescription.providerType === "laboratory") {
            providerDetails = await Laboratory.findById(
              prescription.provider
            ).select("name address phone");
          }
          // Note: Contact details are only provided for pharmacy and laboratory providers

          // Transform the prescription data with provider and doctor details
          return {
            prescriptionId: prescription._id,
            doctorId: prescription.doctor._id,
            doctor: {
              fullName: prescription.doctor.fullName,
              profilePhoto: prescription.doctor.images.profilePhoto,
              medicalSpecialty: prescription.doctor.medicalSpecialty,
            },
            diagnosis: prescription.diagnosis,
            medicines: prescription.medicines,
            labTests: prescription.labTests,
            createdAt: prescription.createdAt,
            status: prescription.status,
            providerType: prescription.providerType,
            provider: providerDetails
              ? {
                  name: providerDetails.name || providerDetails.fullName,
                  address: providerDetails.address,
                  phoneNumber: providerDetails.phone,
                }
              : null,
          };
        })
      );

      res.status(200).json(prescriptionsWithDetails);
    } catch (error) {
      console.error("Failed to fetch prescriptions:", error);
      res.status(500).json({ message: error.message });
    }
  },

  // for provider to get presction
  getProviderPrescriptions: async (req, res) => {
    const providerId = req.params.providerId;
    const providerType = req.body.providerType;

    try {
      let ProviderModel;

      switch (providerType) {
        case "doctor":
          ProviderModel = Doctor;
          break;
        case "pharmacy":
          ProviderModel = Pharmacy;
          break;
        case "therapist":
          ProviderModel = Therapist;
          break;
        case "laboratory":
          ProviderModel = Laboratory;
          break;
        default:
          return res.status(400).json({ message: "Invalid provider type" });
      }

      const provider = await ProviderModel.findById(providerId).populate({
        path: "prescriptions.prescription",
        populate: [
          {
            path: "patient",
            model: "User",
            select: "firstName lastName profilePhoto", // Populating patient details
          },
          {
            path: "doctor",
            model: "Doctor",
            select: "fullName", // Populating doctor details
          },
        ],
      });

      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      const prescriptionsWithDetails = provider.prescriptions.map(
        (prescription) => {
          const prescriptionDoc = prescription.prescription.toObject();
          return {
            ...prescriptionDoc,
            prescriptionId: prescriptionDoc._id,
            providerName: provider.name || provider.fullName, // Ensure provider name is assigned
            patientFirstName: prescriptionDoc.patient.firstName,
            patientLastName: prescriptionDoc.patient.lastName,
            patientProfilePhoto: prescriptionDoc.patient.profilePhoto,
            patientAddress: prescriptionDoc.patientAddress,
            diagnosis: prescriptionDoc.diagnosis,
            medicines: prescriptionDoc.medicines,
            doctorName: prescriptionDoc.doctor.fullName,
            createdAt: prescriptionDoc.createdAt,
          };
        }
      );

      res.status(200).json(prescriptionsWithDetails);
    } catch (error) {
      console.error("Failed to get prescriptions:", error);
      res.status(500).json({ message: error.message });
    }
  },

  providerSinglePrescription: async (req, res) => {
    const providerId = req.params.providerId;
    const providerType = req.body.providerType;

    try {
      let ProviderModel;

      switch (providerType.toLowerCase()) {
        case "doctor":
          ProviderModel = Doctor;
          break;
        case "pharmacy":
          ProviderModel = Pharmacy;
          break;
        case "therapist":
          ProviderModel = Therapist;
          break;
        case "laboratory":
          ProviderModel = Laboratory;
          break;
        default:
          return res.status(400).json({ message: "Invalid provider type" });
      }

      const provider = await ProviderModel.findById(providerId).populate({
        path: "prescriptions.prescription",
        populate: {
          path: "patient",
          model: "User",
          select: "firstName lastName", // Populating patient details
        },
      });

      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      if (provider.prescriptions.length === 0) {
        return res
          .status(404)
          .json({ message: "No prescriptions found for this provider" });
      }

      // Sort prescriptions by createdAt in descending order and take the first one
      const recentPrescription = provider.prescriptions.sort(
        (a, b) => b.prescription.createdAt - a.prescription.createdAt
      )[0];

      const prescriptionDoc = recentPrescription.prescription.toObject();

      const recentPrescriptionDetails = {
        ...prescriptionDoc,
        providerName: provider.name || provider.fullName,
        patientFirstName: prescriptionDoc.patient.firstName,
        patientLastName: prescriptionDoc.patient.lastName,
        patientAddress: prescriptionDoc.patientAddress,
        diagnosis: prescriptionDoc.diagnosis,
        medicines: prescriptionDoc.medicines,
        createdAt: prescriptionDoc.createdAt,
      };

      res.status(200).json(recentPrescriptionDetails);
    } catch (error) {
      console.error("Failed to get the recent prescription:", error);
      res.status(500).json({ message: error.message });
    }
  },

  // Controller function to get the session ID based on patient and doctor details
  getSessionId: async (req, res) => {
    const { doctorId, patientId } = req.params;

    try {
      // Log IDs for debugging
      console.log("Doctor ID:", doctorId);
      console.log("Patient ID:", patientId);

      // Find the active or latest session for the doctor and patient
      const session = await ConsultationSession.findOne({
        doctor: doctorId,
        patient: patientId,
        status: { $in: ["in-progress", "pending"] },
      }).sort({ startTime: -1 });

      if (!session) {
        return res.status(404).json({
          message: "No pending session found for this doctor and patient.",
        });
      }

      res.status(200).json({
        message: "Session found",
        sessionId: session._id,
        status: session.status,
      });
    } catch (error) {
      console.error("Failed to retrieve session:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  },

  getPrescription: async (req, res) => {
    const { prescriptionId } = req.params;

    // Validate the prescriptionId
    if (!mongoose.isValidObjectId(prescriptionId)) {
      return res.status(400).json({ message: "Invalid prescription ID" });
    }

    try {
      // Find the prescription by ID
      const prescription = await Prescription.findById(prescriptionId)
        .populate("doctor", "fullName profilePhoto medicalSpecialty.name")
        .populate("patient", "firstName lastName address phone ");

      if (!prescription) {
        return res.status(404).json({ message: "Prescription not found" });
      }

      // Return the found prescription
      res.status(200).json({
        prescriptionId: prescription._id,
        doctor: prescription.doctor
          ? {
              doctorId: prescription.doctor._id,
              fullName: prescription.doctor.fullName,
              profilePhoto: prescription.doctor.profilePhoto,
              medicalSpecialty: prescription.doctor.medicalSpecialty.name,
            }
          : null,
        patient: prescription.patient
          ? {
              patientId: prescription.patient._id,
              firstName: prescription.patient.firstName,
              lastName: prescription.patient.lastName,
              address: prescription.patient.address, // Add address
              phone: prescription.patient.phone, // Add phone
            }
          : null,
        patientAddress: prescription.patientAddress,
        diagnosis: prescription.diagnosis,
        medicines: prescription.medicines,
        labTests: prescription.labTests,
        deliveryOption: prescription.deliveryOption,
        createdAt: prescription.createdAt,
        status: prescription.status,
        approved: prescription.approved,
        totalCost: prescription.totalCost,
        providerType: prescription.providerType,
        provider: prescription.provider,
      });
    } catch (error) {
      console.error("Failed to fetch prescription:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  },

  // Function to add costing details
  addCosting: async (req, res) => {
    const { prescriptionId, amount } = req.body;
    const providerId = req.params.providerId;

    try {
      const prescription = await Prescription.findById(prescriptionId);
      if (!prescription)
        return res.status(404).json({ message: "Prescription not found" });

      const isAuthorized =
        (await Laboratory.exists({ _id: providerId })) ||
        (await Pharmacy.exists({ _id: providerId }));
      if (!isAuthorized) {
        return res.status(403).json({
          message: "Not authorized to add costing to this prescription",
        });
      }

      prescription.totalCost = amount;
      await prescription.save();

      const transaction = new Transaction({
        user: prescription.patient,
        doctor: prescription.doctor,
        prescription: prescriptionId,
        type: "costing",
        status: "pending",
        amount,
      });

      await transaction.save();

      // Create an in-app and push notification for the patient
      const patient = await User.findById(prescription.patient);

      if (patient) {
        await notificationController.createNotification(
          patient._id,
          null,
          "Costing Added",
          `The provider has added a cost of ${amount} to your prescription. Please review and approve the cost.`,
          prescriptionId,
          "Prescription"
        );
      }

      res
        .status(200)
        .json({ message: "Costing added successfully", transaction });
    } catch (error) {
      console.error("Error adding costing:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Function to get costing details for review
  getCostingDetails: async (req, res) => {
    const { prescriptionId } = req.params;
    const patientId = req.query.patientId; // Assuming patientId is passed as a query parameter

    try {
      // Find the prescription
      const prescription = await Prescription.findById(prescriptionId);
      if (!prescription)
        return res.status(404).json({ message: "Prescription not found" });

      // Find the related transaction
      const transaction = await Transaction.findOne({
        prescription: prescriptionId,
      });
      if (!transaction)
        return res.status(404).json({ message: "Transaction not found" });

      // Calculate the amount to be paid, including any admin fee
      const amount = transaction.amount;
      const adminFeePercentage = 0.05; // 5% admin fee
      const adminFee = amount * adminFeePercentage;
      const totalAmount = amount + adminFee; // Total amount to be paid

      res.status(200).json({
        message: "Costing details fetched successfully",
        transaction: {
          amount,
          adminFee,
          totalAmount,
        },
        approved: prescription.approved,
      });
    } catch (error) {
      console.error("Error fetching costing details:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Function to approve costing
  approveCosting: async (req, res) => {
    const { prescriptionId } = req.body;
    const patientId = req.params.patientId;

    console.log("na the patient id be this", patientId);
    console.log("na the prescription id be this", prescriptionId);
    

    try {
      const prescription = await Prescription.findById(prescriptionId);

      if (!prescription)
        return res.status(404).json({ message: "Prescription not found" });

      // Check if the prescription has already been approved
      if (prescription.approved) {
        return res
          .status(400)
          .json({ error: "This prescription has already been approved." });
      }

      const amount = prescription.totalCost;

      const transaction = await Transaction.findOne({
        prescription: prescriptionId,
      });
      if (transaction) {
        transaction.status = "approved";
        await transaction.save();
      }

      let providerModel;
      switch (prescription.providerType) {
        case "pharmacy":
          providerModel = Pharmacy;
          break;
        case "laboratory":
          providerModel = Laboratory;
          break;
        default:
          return res.status(400).json({ message: "Invalid provider type. Only pharmacy and laboratory providers are supported for cost approval." });
      }

      const provider = await providerModel.findById(prescription.provider);
      if (!provider)
        return res.status(404).json({ message: "Provider not found" });

      // Check user's balance
      const user = await User.findById(patientId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.walletBalance < amount) {
        return res.status(400).json({ balanceMessage: "Insufficient balance" });
 }

      try {
        // Validate adminId and fetch admin user if needed
        let validAdminId = adminId;
        if (!validAdminId) {
          console.log('Admin ID is missing, attempting to find an admin user');
          const adminUser = await User.findOne({ role: 'admin' });
          
          if (!adminUser) {
            console.error('No admin user found in the database');
            return res.status(500).json({ message: 'Admin user not found. Please contact support.' });
          }
          
          validAdminId = adminUser._id;
          console.log('Found admin user with ID:', validAdminId);
        } else {
          // Verify that the admin user exists
          const adminUser = await User.findById(validAdminId);
          if (!adminUser) {
            console.error(`Admin user with ID ${validAdminId} not found in the database`);
            // Try to find any admin user
            const fallbackAdmin = await User.findOne({ role: 'admin' });
            
            if (!fallbackAdmin) {
              console.error('No admin user found in the database');
              return res.status(500).json({ message: 'Admin user not found. Please contact support.' });
            }
            
            validAdminId = fallbackAdmin._id;
            console.log('Found fallback admin user with ID:', validAdminId);
          }
        }
        
        await calculateFeesAndTransfer(
          patientId,
          prescription.provider,
          amount,
          validAdminId
        );

        // Set the approved field to true
        prescription.approved = true;
        await prescription.save();

        await notificationController.createNotification(
          provider._id,
          null,
          "Costing Approved",
          `The patient has approved the cost of ${amount} for the prescription.`,
          prescriptionId,
          "Prescription"
        );

        // Send provider contact email to patient (only for pharmacy and laboratory)
        if (prescription.providerType === "pharmacy" || prescription.providerType === "laboratory") {
          try {
            const patient = await User.findById(patientId);
            console.log("Patient found for email:", patient ? "Yes" : "No");
            console.log("Patient email:", patient?.email);
            
            if (patient && patient.email) {
              const providerDetails = {
                name: provider.name,
                phone: provider.phone,
                address: provider.address,
                type: prescription.providerType
              };

              const prescriptionDetails = {
                id: prescription._id,
                totalCost: prescription.totalCost
              };

              console.log("Sending email with provider details:", providerDetails);
              console.log("Prescription details:", prescriptionDetails);

              await sendProviderContactEmail(
                patient.email,
                patient.firstName || patient.fullName || 'Patient',
                providerDetails,
                prescriptionDetails
              );
              
              console.log("Provider contact email sent successfully to patient:", patient.email);
            } else {
              console.log("Patient not found or email missing for patient ID:", patientId);
            }
          } catch (emailError) {
            console.error("Error sending provider contact email:", emailError);
            console.error("Email error details:", emailError.message);
            // Don't fail the entire operation if email fails
          }
        } else {
          console.log("Provider contact email not sent - provider type is:", prescription.providerType, "(only pharmacy and laboratory supported)");
        }

        res
          .status(200)
          .json({ message: "Costing approved successfully", transaction });
      } catch (transferError) {
        console.error("Error in fee calculation or transfer:", transferError);
        
        // Handle specific error cases
        if (transferError.message.includes('not found')) {
          return res.status(404).json({ 
            message: "User not found", 
            details: transferError.message,
            error: transferError.message,
            errorType: 'UserNotFound'
          });
        } else if (transferError.message.includes('Insufficient balance')) {
          return res.status(400).json({ 
            message: "Insufficient balance", 
            details: transferError.message,
            error: transferError.message,
            errorType: 'InsufficientBalance'
          });
        } else if (transferError.message.includes('Invalid user ID')) {
          return res.status(400).json({ 
            message: "Invalid user ID", 
            details: transferError.message,
            error: transferError.message,
            errorType: 'InvalidUserId'
          });
        } else if (transferError.message.includes('Insufficient balance')) {
          return res.status(400).json({ 
            message: "Insufficient balance", 
            details: transferError.message 
          });
        } else if (transferError.message.includes('Invalid ID format')) {
          return res.status(400).json({ 
            message: "Invalid user ID", 
            details: transferError.message 
          });
        } else if (transferError.message.includes('Invalid amount')) {
          return res.status(400).json({ 
            message: "Invalid amount", 
            details: transferError.message,
            error: transferError.message,
            errorType: 'InvalidAmount'
          });
        } else if (transferError.message.includes('Transaction failed')) {
          return res.status(500).json({ 
            message: "Transaction failed", 
            details: transferError.message,
            error: transferError.message,
            errorType: 'TransactionFailed'
          });
        } else {
          return res.status(500).json({
            message: "Error processing payment",
            error: transferError.message,
            details: transferError.toString(),
            errorType: 'UnknownError'
          });
        }
      }
    } catch (error) {
      console.error("Error approving costing:", error);
      res.status(500).json({ 
        message: "Internal server error", 
        details: error.message,
        errorType: error.name || 'Unknown'
      });
    }
  },

  uploadTestResult: async (req, res) => {
    try {
      const { patientId, testName, prescriptionId } = req.body;
      const providerId = req.params.providerId;

      const patient = await User.findById(patientId);
      if (!patient || patient.role !== "patient") {
        return res.status(404).json({ message: "Patient not found" });
      }

      const healthProvider = await User.findById(providerId);

      // Find the prescription and populate the provider
      const prescription = await Prescription.findById(prescriptionId).populate(
        "provider"
      );

      if (!prescription) {
        return res.status(404).json({ message: "Prescription not found" });
      }

      // Get the doctor's email from the prescription
      const doctor = prescription.doctor;
      const doctorUser = await User.findById(doctor);
      const doctorEmail = doctorUser ? doctorUser.email : null;

      let providerName = null;
      if (prescription.provider) {
        const providerId = prescription.provider._id;
        const provider =
          (await Pharmacy.findById(providerId)) ||
          (await Laboratory.findById(providerId));
        providerName = provider ? provider.name : null;
      }

      // Handle file upload
      if (!req.files || !req.files.testResult) {
        return res
          .status(400)
          .json({ message: "No test result file uploaded" });
      }

      const file = req.files.testResult;
      const folderName = `test_results/${providerId}/${patientId}`;
      const uploadedFile = await upload(file.tempFilePath, folderName);

      const testResultEntry = new TestResult({
        patient: patientId,
        provider: providerId,
        testName,
        testResult: uploadedFile.secure_url,
        prescription: prescriptionId,
        providerName: providerName,
      });

      await testResultEntry.save();

      await notificationController.createNotification(
        patient._id,
        null,
        "Test Result Uploaded",
        `A new test result for ${testName} has been uploaded by ${healthProvider.firstName}.`,
        prescriptionId,
        "Prescription"
      );

      // Notify the health provider
      await notificationController.createNotification(
        healthProvider._id,
        null,
        "Test Result Sent to Patient", // Type
        `The test result for ${testName} has been sent to ${patient.firstName} ${patient.lastName}.`,
        prescriptionId,
        "Prescription"
      );

      // Notify the doctor about the new test result
      if (doctorEmail) {
        await notificationController.createNotification(
          doctor._id,
          null,
          "New Test Result for Your Patient",
          `A new test result for your patient, ${patient.firstName} ${patient.lastName}, has been uploaded. You can review patient portal.`,
          prescriptionId,
          "Prescription"
        );
      }

      // Send email notification to the patient
      const subject = "New Test Result Uploaded";
      const message = `Dear ${patient.firstName},\n\nA new test result for ${testName} has been uploaded by your provider. log into the mobile doctor app to download your result.\n\nBest regards,\nYour Healthcare Team`;

      await sendNotificationEmail(patient.email, subject, message);

      // Send email notification to the health provider
      const providerSubject = "Test Result Sent to Patient";
      const providerMessage = `Dear Dr. ${healthProvider.firstName},\n\nThe test result for ${testName} has been uploaded and sent to ${patient.firstName} ${patient.lastName}. You can now review the result in your provider portal.\n\nBest regards,\nYour Healthcare Team`;

      await sendNotificationEmail(
        healthProvider.email,
        providerSubject,
        providerMessage
      );

      // Send email notification to the doctor (if email exists)
      if (doctorEmail) {
        const doctorSubject = "New Test Result for Your Patient";
        const doctorMessage = `Dear Dr.,\n\nA new test result for your patient, ${patient.firstName} ${patient.lastName}, has been uploaded. You can review it in the provider portal.\n\nBest regards,\nYour Healthcare Team`;

        await sendNotificationEmail(doctorEmail, doctorSubject, doctorMessage);
      }

      res.status(201).json({
        message: "Test result uploaded successfully",
        testResult: testResultEntry,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  },

  getTestResults: async (req, res) => {
    try {
      const patientId = req.params.patientId;

      // Debug: Log patientId
      console.log("Fetching test results for patient ID:", patientId);

      const testResults = await TestResult.find({ patient: patientId })
        .populate("provider", "name profilePhoto")
        .sort({ date: -1 });

      // Debug: Log testResults before sending response
      console.log("Test results:", testResults);

      res.status(200).json(testResults);
    } catch (error) {
      console.error("Error fetching test results:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  },

  // Function to update the status of a prescription
  updatePrescriptionStatus: async (req, res) => {
    const { prescriptionId, status } = req.body;

    if (!["approved", "declined", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    try {
      // Fetch the prescription
      const prescription = await Prescription.findById(prescriptionId);
      if (!prescription)
        return res.status(404).json({ message: "Prescription not found" });

      // Update the status of the prescription
      prescription.status = status;
      await prescription.save();

      // Handle transaction state if needed
      const transaction = await Transaction.findOne({
        prescription: prescriptionId,
      });
      if (transaction) {
        transaction.status = status === "completed" ? "success" : "pending";
        await transaction.save();
      }

      // Fetch the patient details for notification
      const patient = await User.findById(prescription.patient);
      if (!patient)
        return res.status(404).json({ message: "Patient not found" });

      // Create an in-app notification for the patient
      await notificationController.createNotification(
        patient._id,
        null,
        "Prescription Status Updated",
        `The status of your prescription has been updated to "${status}". Please check your prescription details for more information.`, // message
        prescription._id,
        "Prescription"
      );

      res.status(200).json({ message: `Prescription ${status} successfully` });
    } catch (error) {
      console.error("Error updating prescription status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};

export default prescriptionController;
