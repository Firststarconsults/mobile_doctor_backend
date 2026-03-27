//authcontroller
import crypto from "crypto";
import { io } from "../server.js";
import { sendNotificationEmail } from "../utils/nodeMailer.js";
import Notification from "../models/notificationModel.js";
import { Prescription } from "../models/services.js";
import Message from "../models/messageModel.js";
import notificationController from "./notificationController.js";

import passport from "passport";
import User from "../models/user.js";
import {
  Doctor,
  Therapist,
  Pharmacy,
  Laboratory,
} from "../models/healthProviders.js";
import MedicalRecord from "../models/medicalRecordModel.js";
import determineRole from "../utils/determinUserRole.js";
import { sendVerificationEmail } from "../utils/nodeMailer.js";
import { generateVerificationCode } from "../utils/verficationCodeGenerator.js";
// import { generateSessionToken } from '../models/user.js';
import {
  chargePatient,
  verifyTransaction,
  initiateTransfer,
  createTransferRecipient,
  validateAccountNumber,
  submitOtpForTransfer,
} from "../config/paymentService.js";
import { Transaction } from "../models/services.js";
import { checkTransferStatus } from "../config/paymentService.js";
import ConsultationSession from "../models/consultationModel.js";
import Conversation from "../models/conversationModel.js";
import { isDoctorAvailable } from "../utils/isDoctorAvailableFunction.js";



const verificationcode = generateVerificationCode();
console.log("verification code: ", verificationcode);

const authController = {
  register: async (req, res) => {
    try {
      const {
        userType,
        email,
        password,
        phone,
        firstName,
        lastName,
        appropriate,
      } = req.body;

      const role = determineRole(userType);

      // Validation checks
      const phoneRegex = /^(\+234|0)?[789]\d{9}$/; // Regex for Nigerian phone numbers
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          message:
            "Invalid phone format. Example: +2347012345678 or 07012345678",
        });
      }

      //check passward lenght
      if (password.length < 8) {
        return res
          .status(400)
          .json({ message: "Password must be at least 8 characters long" });
      }

      // Create a new user instance
      const newUser = new User({
        username: email,
        email,
        firstName,
        lastName,
        role: role,
        phone,
        appropriate: role === "doctor" ? appropriate : null,
        verificationcode,
        profilePhoto:
          "http://res.cloudinary.com/ditdm55co/image/upload/v1711405225/65f819a7b85308ae12b8bcd7/65f819a7b85308ae12b8bcd7/1711405225600.jpg",
      });

      // Choose the appropriate model based on userType
      let healthProviderModel;
      let medicalReportModel;
      switch (userType.toLowerCase()) {
        case "doctor":
          healthProviderModel = Doctor;
          break;
        case "patient":
          medicalReportModel = MedicalRecord;
          break;
        case "pharmacy":
          healthProviderModel = Pharmacy;
          break;
        case "therapist":
          healthProviderModel = Therapist;
          break;
        case "laboratory":
          healthProviderModel = Laboratory;
          break;
        // Add other cases as needed
        default:
          // Default to patient
          healthProviderModel = null;
      }

      // Create a new health provider instance if userType is one of the specified types
      let healthProvider;
      let medicalRecord;
      if (healthProviderModel) {
        healthProvider = new healthProviderModel({
          // Add fields specific to health providers
          name: role, // Example field; replace with actual fields
        });
      }

      if (medicalReportModel) {
        medicalRecord = new MedicalRecord({
          genotype: null,
          bloodGroup: null,
          maritalStatus: null,
          allergies: [],
          weight: null,
          testResults: [],
          others: null,
        });
      }

      await User.register(newUser, password, async (err, user) => {
        if (err) {
          // Handle registration errors
          console.error(err);
          if (err.name === "UserExistsError") {
            return res.status(400).json({ message: "User already registered" });
          } else {
            console.error(err);
            return res.status(500).json({ message: "Internal Server Error" });
          }
        } else {
          // If a health provider was created, associate it with the user
          if (healthProvider) {
            healthProvider._id = user._id; // Set the health provider's _id to match the user's _id
            user.healthProvider = healthProvider._id;
            await healthProvider.save();
          }

          // If a medical record was created, associate it with the user
          if (medicalRecord) {
            medicalRecord._id = user._id; // Set the health provider's _id to match the user's _id
            user.medicalRecord = medicalRecord._id;
            await medicalRecord.save();
          }

          // Send verification code via email
          await sendVerificationEmail(user.email, verificationcode);

          passport.authenticate("local")(req, res, () => {
            // Redirect to verify route
            res.status(200).json({
              message: `Verification code: ${verificationcode}`,
              redirectTo: "/verify",
            });
          });
        }
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Unexpected error during registration" });
    }
  },

  resendVerificationCode: async (req, res) => {
    try {
      const { email } = req.body;

      // Find the user by email
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if the user is already verified
      if (user.isVerified) {
        // Set verification code to null since the user is already verified
        user.verificationcode = null;
        await user.save();

        return res.status(200).json({
          message:
            "User is already verified. No need to resend the verification code.",
        });
      }

      // Check if the user has a verification code
      if (!user.verificationcode) {
        return res.status(400).json({
          message: "No verification code found. Please register again.",
        });
      }

      // Resend the existing verification code via email
      await sendVerificationEmail(user.email, user.verificationcode);

      res
        .status(200)
        .json({ message: "Verification code resent successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  },

  login: async (req, res) => {
    const user = new User({
      username: req.body.email,
      password: req.body.password,
    });

    req.login(user, async (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      passport.authenticate("local", (err, user, info) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        if (!user) {
          // Return a specific message if authentication fails
          return res
            .status(401)
            .json({ message: "Username or password is incorrect" });
        }

        if (user.isSuspended === "true") {
          return res.status(403).json({ message: "Your account is suspended. Please contact support." });
        }
        

        req.logIn(user, async (err) => {
          if (err) {
            console.log(err);
            return res.status(500).json({ message: "Internal Server Error" });
          }


          // Prepare the response data
          const responseData = {
            message: "Successfully logged in",
            user: {
              profilePhoto: user.profilePhoto,
              firstName: user.firstName,
              lastName: user.lastName,
              id: user._id,
              username: user.username,
              email: user.email,
              role: user.role,
              isVerified: {
                status: user.isVerified,
                message: "Alabo, this one na for email verification o",
              },
              isOnline: user.isOnline, // Added isOnline status
              isApproved: user.isApproved,
            },
          };

          // Include kycVerification for health providers
          if (
            ["doctor", "therapist", "pharmacy", "laboratory"].includes(
              user.role
            )
          ) {
            let healthProviderInfo = null;
            switch (user.role) {
              case "doctor":
                healthProviderInfo = await Doctor.findById(user._id);
                break;
              case "therapist":
                healthProviderInfo = await Therapist.findById(user._id);
                break;
              case "pharmacy":
                healthProviderInfo = await Pharmacy.findById(user._id);
                break;
              case "laboratory":
                healthProviderInfo = await Laboratory.findById(user._id);
                break;
            }

            if (
              healthProviderInfo &&
              healthProviderInfo.kycVerification !== undefined
            ) {
              responseData.user.kycVerification =
                healthProviderInfo.kycVerification;
            }
          }


          res.status(201).json(responseData);
        });
      })(req, res);
    });
  },

  logout: async function (req, res) {
    // Check if the user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Logout the user
      req.logout((err) => {
        if (err) {
          console.log(err);
        } else {
          res.status(200).json({ message: "Successfully logged out" });
        }
      });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  // Verify
  verify: async (req, res) => {
    try {
      const verifyCode = req.body.verifyCode;

      // Check if the user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if the user is already verified
      if (req.user.isVerified) {
        return res.status(400).json({ message: "User is already verified" });
      }

      console.log(req.user.verificationcode, verifyCode);
      // Check if the verification code matches the one in the database
      if (req.user.verificationcode !== verifyCode) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Update user's verification status
      req.user.isVerified = true;
      req.user.verificationcode = null; //clear the code after successful verification
      await req.user.save();

      // Return information to populate dashboard
      return res.status(201).json({
        message:
          "Email Verified Successfully, you can login into your account now",
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Unexpected error during verification" });
    }
  },

  fundWallet: async (req, res) => {
    const { amount } = req.body; // Only get amount from the request body

    try {
      const userId = req.params.userId;
      const user = await User.findById(userId);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const email = user.email; // Get email from the user model

      const authorizationUrl = await chargePatient(email, amount);
      if (authorizationUrl) {
        // Directly send the authorization URL to the client
        res.status(200).json({ success: true, authorizationUrl });
      } else {
        throw new Error("Unable to initiate wallet funding");
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.toString() });
    }
  },

  handlePaystackWebhook: async (req, res) => {
    console.log("Webhook received:", req.body);

    try {
      const event = req.body;

      // Verify Paystack webhook signature to ensure the request is legitimate
      const secret = process.env.PAYSTACK_SECRET_KEY;
      const hash = crypto
        .createHmac("sha512", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");

        console.log("Received signature:", req.headers["x-paystack-signature"]);
        console.log("Calculated hash:", hash);

      if (req.headers["x-paystack-signature"] !== hash) {
        return res.status(401).send("Invalid signature");
      }

      console.log("Paystack webhook event:", JSON.stringify(event, null, 2));

      // Handle the successful payment event
      if (event.event === "charge.success") {
        const reference = event.data.reference;
        const verificationResult = await verifyTransaction(reference);

        console.log("Verification result:", verificationResult);

        if (verificationResult.success) {
          // Extract email and amount from the verified transaction
          const email = verificationResult.data.customer.email;
          const amount = verificationResult.data.amount / 100; // Convert from kobo to naira

          console.log("Email from transaction:", email);

          // Find the user by email and update their wallet balance
          const user = await User.findOne({ email: email });
          if (user) {
            user.walletBalance += amount; // Increase the user's wallet balance
            await user.save();

            // Record the successful transaction
            const transaction = new Transaction({
              user: user._id,
              type: "wallet funding",
              amount: amount,
              status: "success",
              date: new Date(),
            });
            await transaction.save();

            console.log("Wallet updated. New balance:", user.walletBalance);

            try {
              await notificationController.createNotification(
                  user._id,
                  null,
                  "wallet funding",
                  `Your account has been successfully funded with ₦${amount}. Your new wallet balance is ₦${user.walletBalance}.`,
                  transaction._id,
                  "Transaction"
              );
          } catch (error) {
              console.error("Error creating notification:", error);
          }

            res
              .status(200)
              .send("Wallet funded and transaction recorded successfully");
          } else {
            console.error("User not found for email:", email);
            res.status(404).json({ message: "User not found" });
          }
        } else {
          console.error(
            "Payment verification failed:",
            verificationResult.message
          );
          res.status(500).json({ message: "Payment verification failed" });
        }
      } else {
        res.status(200).send("Webhook received but not a charge.success event");
      }
    } catch (error) {
      console.error("Error handling Paystack webhook:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  // Add a transaction
  addTransaction: async (userId, type, amount, status) => {
    const transaction = new Transaction({
      user: userId,
      type,
      amount,
      status,
    });

    await transaction.save();
  },

  // Update wallet balance
  updateWalletBalance: async (userId, amount, isCredit) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    user.walletBalance += isCredit ? amount : -amount;
    await user.save();
  },

  getTransactionHistory: async (req, res) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const sort = req.query.sort || "-date";

      // Validate page and limit
      if (page < 1) {
        return res.status(400).json({
          message: "Page number must be greater than 0",
        });
      }
      
      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          message: "Limit must be between 1 and 100",
        });
      }

      const options = {
        page,
        limit,
        sort,
        populate: [
          { path: "user", select: "firstName lastName email" }
        ],
        lean: true,
      };

      const result = await Transaction.paginate({ user: userId }, options);

      res.status(200).json({
        message: "Transaction history retrieved successfully",
        data: result.docs,
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalDocs: result.totalDocs,
          limit: result.limit,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
          nextPage: result.hasNextPage ? result.nextPage : null,
          prevPage: result.hasPrevPage ? result.prevPage : null,
        },
      });
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      res.status(500).json({ 
        message: "Error fetching transaction history",
        error: error.message 
      });
    }
  },

  getWalletBalance: async (req, res) => {
    try {
      const { userId } = req.params; // Assuming you pass userId as a URL parameter

      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      res
        .status(200)
        .json({ success: true, walletBalance: user.walletBalance });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  
  // user.walletBalance -= transaction.amount;
  // await user.save();
  // console.log("User balance updated:", user.walletBalance);

  // Function to create a withdrawal request
  withdraw: async (req, res) => {
    try {
      const userId = req.params.userId;
      const { amount, accountNumber, bankName, bankCode } = req.body;

      // Log request details
      console.log(
        `Withdrawal request by User ID: ${userId}, Amount: ${amount}, Account Number: ${accountNumber}, Bank Name: ${bankName}, Bank Code: ${bankCode}`
      );

      // Check if the user exists and has the appropriate role
      const user = await User.findById(userId);
      if (
        !user ||
        !["doctor", "laboratory", "therapist", "pharmacy"].includes(user.role)
      ) {
        console.log("Unauthorized user role or user not found");
        return res.status(403).json({
          success: false,
          message: "Unauthorized! You are not a health provider",
        });
      }

      // Check if the wallet has enough balance
      if (user.walletBalance < amount) {
        console.log("Insufficient wallet balance");
        return res
          .status(400)
          .json({ success: false, message: "Insufficient wallet balance" });
      }

      // Create a pending transaction with account details
      const transaction = new Transaction({
        user: userId,
        type: "withdrawal",
        status: "pending",
        amount: amount,
        accountNumber: accountNumber,
        bankName: bankName,
        bankCode: bankCode,
      });

      const savedTransaction = await transaction.save();

      // Create a notification for the user about the withdrawal request
      const notification = new Notification({
        recipient: user._id,
        type: "withdrawal",
        message: `Your withdrawal request of ₦${amount} to ${bankName} (${accountNumber}) has been created and is pending approval.`,
        relatedObject: user._id,
        relatedModel: "Transaction",
      });
      await notification.save();

      res.status(200).json({
        success: true,
        message: "Withdrawal request created and pending approval",
        transactionId: savedTransaction._id,
      });
    } catch (error) {
      console.error("Error during withdrawal:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  },

  getPendingWithdrawals: async (req, res) => {
    try {
      const adminId = req.params.adminId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const sort = req.query.sort || "-createdAt";

      // Validate page and limit
      if (page < 1) {
        return res.status(400).json({
          message: "Page number must be greater than 0",
        });
      }
      
      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          message: "Limit must be between 1 and 100",
        });
      }

      // Validate admin privileges based on role
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== "admin") {
        console.log("Unauthorized admin access");
        return res.status(403).json({
          success: false,
          message: "Unauthorized to perform this action",
        });
      }

      const options = {
        page,
        limit,
        sort,
        populate: [
          { path: "user", select: "firstName lastName email" }
        ],
        lean: true,
      };

      // Retrieve paginated pending withdrawal transactions
      const result = await Transaction.paginate({
        status: "pending",
        type: "withdrawal",
      }, options);

      // Log the retrieved transactions
      console.log("Pending withdrawals:", result.docs);

      res.status(200).json({
        message: "Pending withdrawals retrieved successfully",
        data: result.docs,
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalDocs: result.totalDocs,
          limit: result.limit,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
          nextPage: result.hasNextPage ? result.nextPage : null,
          prevPage: result.hasPrevPage ? result.prevPage : null,
        },
      });
    } catch (error) {
      console.error("Error fetching pending withdrawals:", error);
      res
        .status(500)
        .json({ 
          message: "Error fetching pending withdrawals",
          error: error.message 
        });
    }
  },

  approveWithdrawal: async (req, res) => {
    try {
      const adminId = req.params.adminId;
      const { transactionId, accountNumber, bankCode } = req.body;

      // Validate admin privileges based on role
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== "admin") {
        console.log("Unauthorized admin access");
        return res.status(403).json({
          success: false,
          message: "Unauthorized to perform this action",
        });
      }

      // Find the transaction and prevent duplicate processing
      const transaction = await Transaction.findById(transactionId).populate(
        "user"
      );
      if (!transaction || transaction.status !== "pending") {
        console.log(
          `Invalid or already processed transaction. Transaction ID: ${transactionId}`
        );
        return res.status(400).json({
          success: false,
          message: "Invalid or already processed transaction",
        });
      }

      // Update transaction status to processing to prevent duplicate approvals
      transaction.status = "processing";
      await transaction.save();

      const user = transaction.user;
      if (!user) {
        console.log(`User not found for Transaction ID: ${transactionId}`);
        transaction.status = "failed";
        await transaction.save();
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Validate account number with bank code
      let accountValidation;
      try {
        accountValidation = await validateAccountNumber(
          accountNumber,
          bankCode
        );
        if (!accountValidation) {
          throw new Error("Account validation failed");
        }
      } catch (error) {
        console.error("Error during account validation:", error);
        transaction.status = "failed";
        await transaction.save();
        await sendFailureNotification(
          user,
          transaction,
          bankCode,
          accountNumber,
          "Account validation failed."
        );
        return res.status(400).json({
          success: false,
          message: "Invalid account details",
          transactionId,
        });
      }

      // Create transfer recipient
      const recipientName = accountValidation.account_name;
      let recipientDetails;
      try {
        recipientDetails = await createTransferRecipient(
          recipientName,
          accountNumber,
          bankCode
        );
        if (!recipientDetails) {
          throw new Error("Failed to create transfer recipient");
        }
      } catch (error) {
        console.error("Error during transfer recipient creation:", error);
        transaction.status = "failed";
        await transaction.save();
        await sendFailureNotification(
          user,
          transaction,
          bankCode,
          accountNumber,
          "Transfer recipient creation failed."
        );
        return res.status(500).json({
          success: false,
          message: "Failed to create transfer recipient",
          transactionId,
        });
      }

      // Initiate transfer
      let transferResponse;
      try {
        transferResponse = await initiateTransfer(
          transaction.amount,
          recipientDetails.recipient_code
        );
        if (!transferResponse) {
          throw new Error("Failed to initiate transfer");
        }
      } catch (error) {
        console.error("Error during transfer initiation:", error);
        transaction.status = "failed";
        await transaction.save();
        await sendFailureNotification(
          user,
          transaction,
          bankCode,
          accountNumber,
          "Transfer initiation failed."
        );
        return res.status(500).json({
          success: false,
          message: "Failed to initiate transfer",
          transactionId,
        });
      }

      // Store transfer code for OTP verification
      transaction.transferCode = transferResponse.transfer_code;
      transaction.recipientCode = recipientDetails.recipient_code;
      await transaction.save();

      // Notify user to finalize the transfer using OTP
      res.status(200).json({
        success: true,
        message:
          "Withdrawal approval processing, please finalize by sending OTP",
        transferDetails: transferResponse,
        transactionId,
      });
    } catch (error) {
      console.error("Error during withdrawal approval:", error);
      
      // Try to update transaction status if possible
      try {
        if (req.body && req.body.transactionId) {
          const transaction = await Transaction.findById(req.body.transactionId);
          if (transaction && transaction.status === "processing") {
            transaction.status = "failed";
            await transaction.save();
          }
        }
      } catch (err) {
        console.error("Error updating transaction status:", err);
      }
      
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        transactionId: req.body.transactionId,
      });
    }
  },

  finalizeWithdrawal: async (req, res) => {
    try {
      const adminId = req.params.adminId;
      const { otp, transferCode, transactionId } = req.body;

      const admin = await User.findById(adminId);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to perform this action",
        });
      }

      if (!otp || !transferCode) {
        return res.status(400).json({
          success: false,
          message: "OTP and transfer code are required.",
        });
      }

      const transaction = await Transaction.findById(transactionId).populate("user");
      if (!transaction || transaction.status !== "processing") {
        return res.status(400).json({
          success: false,
          message: "Invalid or already processed transaction",
        });
      }

      // Store transferCode in the transaction for future reference
      if (!transaction.transferCode) {
        transaction.transferCode = transferCode;
        await transaction.save();
      }

      const user = transaction.user;
      if (!user) {
        transaction.status = "failed";
        await transaction.save();
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Check if user has sufficient balance before proceeding
      if (user.walletBalance < transaction.amount) {
        transaction.status = "failed";
        await transaction.save();
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
        });
      }

      try {
        // Submit OTP for transfer
        const result = await submitOtpForTransfer(otp, transferCode);

        // Enhanced logging for Paystack response
  console.log('=== PAYSTACK OTP RESPONSE ===');
  console.log('Full Response:', JSON.stringify(result, null, 2));
  console.log('Success Status:', result.success);
  console.log('Response Message:', result.message);
  console.log('Response Data:', result.data);
  console.log('Transfer Code:', transferCode);
  console.log('Transaction ID:', transactionId);
  console.log('Timestamp:', new Date().toISOString());
  console.log('===============================');
        
        
        if (result.success) {
          // Only deduct balance after successful transfer
          user.walletBalance -= transaction.amount;
          await user.save();

          transaction.status = "success";
          transaction.completedAt = new Date();
          await transaction.save();

          // Send success notification
          await sendNotificationEmail(
            user.email,
            "Withdrawal Successful",
            `Your withdrawal of ₦${transaction.amount} to ${transaction.bankName} (${transaction.accountNumber}) has been completed successfully.`
          );

          // Create notification in the app
          try {
            await notificationController.createNotification(
              user._id,
              null,
              "withdrawal",
              `Your withdrawal of ₦${transaction.amount} to ${transaction.bankName} (${transaction.accountNumber}) has been completed successfully.`,
              transaction._id,
              "Transaction"
            );
          } catch (notificationError) {
            console.error("Error creating notification:", notificationError);
          }

          return res.status(200).json({
            success: true,
            message: "Withdrawal completed successfully",
            transactionId,
          });
        } else {
          // Handle OTP verification failure
          // Check if the error is just an OTP issue but the transaction might have gone through
          if (result.message && result.message.toLowerCase().includes("otp")) {
            // Mark as needing verification
            transaction.status = "verification_needed";
            transaction.notes = `OTP verification failed with message: ${result.message}. Transaction may have gone through. Manual verification required.`;
            await transaction.save();
            
            // Try to check the transfer status immediately
            try {
              const { checkTransferStatus } = await import("../config/paymentService.js");
              const transferStatus = await checkTransferStatus(transferCode);
              
              // If the check was successful and we can determine the status
              if (transferStatus.success && transferStatus.data) {
                const paystackStatus = transferStatus.data.status;
                transaction.notes = `${transaction.notes} | Immediate status check: ${paystackStatus}`;
                
                // If Paystack confirms the transfer was successful, update our records
                if (paystackStatus === "success") {
                  // Deduct balance as the transfer was successful
                  user.walletBalance -= transaction.amount;
                  await user.save();
                  
                  transaction.status = "success";
                  transaction.completedAt = new Date();
                  await transaction.save();
                  
                  // Send success notification
                  await sendNotificationEmail(
                    user.email,
                    "Withdrawal Successful",
                    `Your withdrawal of ₦${transaction.amount} to ${transaction.bankName} (${transaction.accountNumber}) has been completed successfully.`
                  );
                  
                  try {
                    await notificationController.createNotification(
                      user._id,
                      null,
                      "withdrawal",
                      `Your withdrawal of ₦${transaction.amount} to ${transaction.bankName} (${transaction.accountNumber}) has been completed successfully.`,
                      transaction._id,
                      "Transaction"
                    );
                  } catch (notificationError) {
                    console.error("Error creating notification:", notificationError);
                  }
                  
                  return res.status(200).json({
                    success: true,
                    message: "Withdrawal completed successfully after verification",
                    transactionId,
                  });
                } else if (paystackStatus === "failed") {
                  // If Paystack confirms the transfer failed
                  transaction.status = "failed";
                  transaction.notes = `${transaction.notes} | Transfer confirmed failed by Paystack`;
                  await transaction.save();
                  
                  return res.status(400).json({
                    success: false,
                    message: "Withdrawal failed. Please try again.",
                  });
                }
                // If status is pending or another state, keep as verification_needed
              }
              
              await transaction.save();
            } catch (statusCheckError) {
              console.error("Error checking transfer status:", statusCheckError);
              // Continue with the process even if status check fails
            }
            
            return res.status(202).json({
              success: false,
              message: "OTP verification failed. Manual verification required.",
              transactionId,
            });
          } else {
            // Definitely failed
            transaction.status = "failed";
            transaction.notes = `Withdrawal failed: ${result.message}`;
            await transaction.save();
            
            return res.status(400).json({
              success: false,
              message: "Withdrawal failed. Please try again.",
            });
          }
        }
      } catch (error) {
        console.error("Error during OTP submission:", error);
        
        // Check if the error message suggests the transaction might have succeeded
        if (error.message && (
            error.message.toLowerCase().includes("already") || 
            error.message.toLowerCase().includes("processed") ||
            error.message.toLowerCase().includes("completed")
        )) {
          // The transaction might have gone through despite the error
          transaction.status = "verification_needed";
          transaction.notes = `Error during OTP verification: ${error.message}. Transaction may have gone through. Manual verification required.`;
          
          // Try to check the transfer status immediately
          try {
            const { checkTransferStatus } = await import("../config/paymentService.js");
            const transferStatus = await checkTransferStatus(transferCode);
            
            if (transferStatus.success) {
              transaction.notes = `${transaction.notes} | Immediate status check: ${transferStatus.data.status}`;
            }
          } catch (statusCheckError) {
            console.error("Error checking transfer status:", statusCheckError);
          }
          
          await transaction.save();
          
          return res.status(202).json({
            success: false,
            message: "Error during verification. Manual verification required.",
            transactionId,
          });
        }
        
        // Mark as failed for other errors
        transaction.status = "failed";
        transaction.notes = `Error processing withdrawal: ${error.message}`;
        await transaction.save();
        
        return res.status(500).json({
          success: false,
          message: "Error processing withdrawal",
        });
      }
    } catch (error) {
      console.error("Error during finalizeWithdrawal:", error);
      
      // If there's an error, attempt to mark transaction as failed
      try {
        if (req.body && req.body.transactionId) {
          const transaction = await Transaction.findById(req.body.transactionId);
          if (transaction && transaction.status === "processing") {
            transaction.status = "failed";
            transaction.notes = `${transaction.notes || ''} | Error during finalization: ${error.message}`;
            await transaction.save();
          }
        }
      } catch (err) {
        console.error("Error updating transaction status:", err);
      }

      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  },

  getActiveSession: async (req, res) => {
    const { patientId, doctorId } = req.params;

    try {
      // First, find the conversation ID for the patient and doctor
      const conversation = await Conversation.findOne({
        participants: { $all: [patientId, doctorId] },
      }).select("_id");

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found." });
      }

      // Find the active session
      const activeSession = await ConsultationSession.findOne({
        patient: patientId,
        doctor: doctorId,
        status: { $in: ["scheduled", "in-progress"] },
      })
        .sort({ createdAt: -1 })
        .populate("patient", "firstName lastName profilePhoto isOnline")
        .populate({
          path: "doctor", // Fetch the doctor profilePhoto from Doctor schema
          select: "images.profilePhoto",
          populate: {
            path: "_id", // Populate User schema data for isOnline status
            model: "User",
            select: "isOnline",
          },
        });

      if (!activeSession) {
        return res.status(404).json({ message: "Active session not found." });
      }

      // Fetch the User document to get the isOnline status of the doctor
      const doctorUser = await User.findById(doctorId).select("isOnline");

      // Return the session info including the conversation ID
      res.status(200).json({
        sessionId: activeSession._id,
        conversationId: conversation._id,
        patientFirstName: activeSession.patient.firstName,
        patientLastName: activeSession.patient.lastName,
        patientProfilePhoto: activeSession.patient.profilePhoto,
        patientIsOnline: activeSession.patient.isOnline,
        doctorProfilePhoto: activeSession.doctor.images.profilePhoto,
        doctorIsOnline: doctorUser ? doctorUser.isOnline : null,
        startTime: activeSession.startTime,
      });
    } catch (error) {
      console.error("Error retrieving active session:", error);
      res.status(500).json({
        message: "Failed to retrieve active session.",
        error: error.message,
      });
    }
  },

  getMostRecentActiveSession: async (req, res) => {
    const userId = req.params.userId;

    try {
      // First, identify the role of the user making the request
      const userMakingRequest = await User.findById(userId);
      if (!userMakingRequest) {
        return res
          .status(404)
          .json({ success: false, message: "User not found." });
      }

      // Find the most recent active session for the user
      const mostRecentActiveSession = await ConsultationSession.findOne({
        $or: [{ patient: userId }, { doctor: userId }],
        status: { $in: ["scheduled", "in-progress"] },
      })
        .sort({ startTime: -1 }) // Get the most recent session
        .lean(); // Use lean() for faster execution as we just need the object

      if (!mostRecentActiveSession) {
        return res.status(404).json({
          success: false,
          message: "No active session found for this user.",
        });
      }

      // Now find the conversation related to the session
      const conversation = await Conversation.findOne({
        participants: {
          $all: [
            mostRecentActiveSession.patient,
            mostRecentActiveSession.doctor,
          ],
        },
      })
        .select("_id")
        .lean();

      // Attach conversationId to the session object if found
      mostRecentActiveSession.conversationId = conversation
        ? conversation._id
        : null;

      // Attach patient or doctor details based on the role of the requester
      const otherParticipantId =
        userMakingRequest.role === "doctor"
          ? mostRecentActiveSession.patient
          : mostRecentActiveSession.doctor;
      const otherParticipantDetails = await User.findById(
        otherParticipantId,
        "firstName lastName profilePhoto _id"
      ).lean();

      // Prepare the response object
      const responseObj = {
        success: true,
        message: "Most recent active session retrieved successfully.",
        session: {
          sessionId: mostRecentActiveSession._id,
          startTime: mostRecentActiveSession.startTime,
          conversationId: mostRecentActiveSession.conversationId,
          otherParticipant: otherParticipantDetails,
        },
      };

      res.status(200).json(responseObj);
    } catch (error) {
      console.error("Error retrieving the most recent active session:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve the most recent active session.",
        error: error.message,
      });
    }
  },

  startConsultation: async (req, res) => {
    const { patientId, doctorId } = req.body;

    try {
      // Check if the doctor is available or engaged in an "in-progress" session for lab results
      const available = isDoctorAvailable(doctorId);
      if (!available) {
        return res.status(400).json({
          message: "Doctor is currently engaged in another consultation.",
        });
      }

      // Check if there is an existing active session for this patient and doctor
      const existingPatientSession = await ConsultationSession.findOne({
        patient: patientId,
        doctor: doctorId,
        status: { $in: ["scheduled", "in-progress"] },
      });

      // If an existing active session is found for the patient and doctor, indicate that a new session can't be started
      if (existingPatientSession) {
        return res.status(400).json({
          message:
            "An active session already exists for this patient and doctor. Please complete or cancel the existing session before starting a new one.",
        });
      }

      // Ensure both patient and doctor exist
      const patient = await User.findById(patientId);
      const doctor = await Doctor.findById(doctorId);
      if (!patient || !doctor) {
        return res.status(404).json({ message: "Patient or Doctor not found" });
      }

      // Initialize consultationFee with the default value from doctor.medicalSpecialty
      let consultationFee = doctor.medicalSpecialty.fee; // Use the default fee
      consultationFee = Number(consultationFee);

      if (isNaN(consultationFee)) {
        return res.status(400).json({ message: "Invalid consultation fee." });
      }

      // Check patient's wallet balance
      if (patient.walletBalance < consultationFee) {
        return res.status(400).json({
          message: "Insufficient wallet balance for this consultation.",
        });
      }

      // Deduct consultation fee from patient's wallet
      patient.walletBalance -= consultationFee;
      await patient.save();

      // Record the transaction as held in escrow
      const transaction = new Transaction({
        user: patientId,
        doctor: doctorId,
        type: "consultation fee",
        status: "success",
        escrowStatus: "held",
        amount: consultationFee,
      });
      await transaction.save();

      // Find or create a conversation between patient and doctor
      let conversation = await Conversation.findOne({
        participants: { $all: [patientId, doctorId] },
      });
      if (!conversation) {
        conversation = new Conversation({
          participants: [patientId, doctorId],
        });
        await conversation.save();
      }

      // Create the consultation session
      const newSession = new ConsultationSession({
        doctor: doctorId,
        patient: patientId,
        status: "scheduled",
        escrowTransaction: transaction._id,
        conversationId: conversation._id,
        startTime: new Date(),
      });
      await newSession.save();

      // Notify the doctor about the new consultation session
      io.to(doctorId).emit("consultationStarted", {
        message: "A new consultation has started!",
        sessionId: newSession._id,
      });

      // Use notificationController.createNotification
      try {
        await notificationController.createNotification(
          doctorId,
          null,
          "Consultation",
          `Dear Doctor,\n\n You have a new consultation session scheduled with patient ${patient.firstName} ${patient.lastName}.`,
          newSession._id,
          "Consultation"
        );
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
      }

      // Send system message in chat
      const systemMessage = new Message({
        conversationId: conversation._id,
        sender: doctorId,
        receiver: patientId,
        content: "Your consultation has started.",
        isSystemMessage: true,
      });
      await systemMessage.save();

      // Retrieve the doctor's email from the User schema
      const doctorUser = await User.findById(doctorId);
      if (doctorUser && doctorUser.email) {
        // Send a notification email to the doctor
        sendNotificationEmail(
          doctorUser.email,
          "New Consultation Session",
          `You have a new consultation session scheduled with patient ${patient.firstName}. Please check your dashboard for more details.`
        );
      }

      // Return success response with session details and conversation ID
      res.status(200).json({
        message: "New consultation session started successfully.",
        session: newSession,
        conversationId: conversation._id,
      });
    } catch (error) {
      console.error("Failed to start consultation:", error);
      res.status(500).json({
        message: "Error starting consultation",
        error: error.toString(),
      });
    }
  },

  checkDoctorAvailability: async (req, res) => {
    const { doctorId } = req.params;

    try {
      const available = isDoctorAvailable(doctorId);

      if (available) {
        return res.status(200).json({
          available: true,
          message: "Doctor is available for a consultation.",
        });
      } else {
        return res.status(400).json({
          available: false,
          message: "Doctor is currently engaged in another consultation.",
        });
      }
    } catch (error) {
      console.error("Failed to check doctor availability:", error);
      return res.status(500).json({
        message: "Error checking doctor availability.",
        error: error.toString(),
      });
    }
  },

  cancelConsultation: async (req, res) => {
    const { sessionId } = req.body;

    try {
      // Retrieve the session and ensure to populate the escrowTransaction
      const session = await ConsultationSession.findById(sessionId).populate(
        "escrowTransaction"
      );
      if (!session) {
        return res
          .status(404)
          .json({ message: "Consultation session not found" });
      }

      console.log("Session found with escrowTransaction:", session);

      // Ensure that the escrowTransaction exists and is in the 'held' state
      if (
        !session.escrowTransaction ||
        session.escrowTransaction.escrowStatus !== "held"
      ) {
        console.log("Transaction details:", session.escrowTransaction);
        return res.status(400).json({
          message: "No escrow transaction found or not eligible for refund",
        });
      }

      // Retrieve the patient for the session
      const patient = await User.findById(session.patient);
      const doctor = await User.findById(session.doctor);

      if (!patient) {
        return res
          .status(404)
          .json({ message: "Patient not found for refund" });
      }

      // Assuming conversationId is part of the session model
      const conversationId = session.conversationId;

      if (!conversationId) {
        return res
          .status(400)
          .json({
            message:
              "Conversation ID not found for this session, System Message won't show in chat",
          });
      }

      // System message notification in chat:
      const systemMessage = new Message({
        sender: null, // or system ID if needed
        receiver: patient._id,
        content: "Your consultation has been canceled.",
        conversationId: session.conversationId, // Now using the actual conversationId from the session
        isSystemMessage: true, // Mark as system message
      });
      await systemMessage.save();

      // Refund the consultation fee to the patient's wallet
      patient.walletBalance += session.escrowTransaction.amount;
      await patient.save();

      // Update the escrowTransaction status to 'refunded'
      session.escrowTransaction.escrowStatus = "refunded";
      await session.escrowTransaction.save();

      // Update the session status to 'cancelled'
      session.status = "cancelled";
      await session.save();

      // Notify the patient
      await notificationController.createNotification(
        patient._id,
        null, // System notification
        "Canceled Consultation",
        `Your consultation session with Dr. ${doctor.firstName} ${doctor.lastName} has been canceled.`,
        session._id,
        "Consultation"
      );

      // Notify the doctor
      await notificationController.createNotification(
        doctor._id,
        null, // System notification
        "Canceled Consultation",
        `Your consultation session with patient ${patient.firstName} ${patient.lastName} has been canceled.`,
        session._id,
        "Consultation"
      );

      // Emit system message to notify about consultation cancellation
      io.emit("systemMessage", {
        type: "cancellation",
        message: `The consultation between Dr. ${doctor.firstName} ${doctor.lastName} and ${patient.firstName} ${patient.lastName} has been canceled.`,
        consultationId: session._id,
        timestamp: new Date(),
      });

      return res.status(200).json({
        message: "Consultation cancelled and fee refunded to patient",
      });
    } catch (error) {
      console.error("Error during consultation cancellation:", error);
      return res.status(500).json({
        message: "Error cancelling consultation",
        error: error.toString(),
      });
    }
  },

  completeConsultation: async (req, res) => {
    const { sessionId } = req.body;
    let consultationComplete = false;

    try {
      const session = await ConsultationSession.findById(sessionId).populate(
        "patient doctor"
      );
      if (!session) {
        return res
          .status(404)
          .json({ message: "Consultation session not found" });
      }

      if (session.status === "completed") {
        return res
          .status(400)
          .json({ message: "Consultation session is already completed." });
      }

      const { patient, doctor } = session;

      // Assuming conversationId is part of the session model
      const conversationId = session.conversationId;

      if (!conversationId) {
        return res
          .status(400)
          .json({
            message:
              "Conversation ID not found for this session. System Message wont show in chat",
          });
      }

      // Send a message in the correct conversation
      const systemMessage = new Message({
        sender: doctor._id,
        recipient: patient._id,
        content: "Your consultation has been completed.",
        conversationId: conversationId,
        isSystemMessage: true,
      });
      await systemMessage.save();

      const prescription = await Prescription.findOne({
        session: sessionId,
      }).sort({ createdAt: -1 });

      if (prescription) {
        if (
          prescription.providerType === "laboratory" &&
          prescription.status === "in-progress"
        ) {
          session.status = "pending"; // Continue the session for lab results
        } else {
          session.status = "completed"; // Complete the session for pharmacy prescriptions
        }
      } else {
        session.status = "completed"; // No prescription found, mark session as completed
      }

      session.endTime = new Date();
      await session.save();

      const transaction = await Transaction.findById(session.escrowTransaction);
      if (transaction && transaction.escrowStatus === "held") {
        const doctorUser = await User.findById(session.doctor);
        if (doctorUser) {
          doctorUser.walletBalance += transaction.amount;
          await doctorUser.save();
          transaction.escrowStatus = "released";
          await transaction.save();
          consultationComplete = true;
        } else {
          return res.status(404).json({ message: "Doctor user not found" });
        }
      }

       // Notify the patient
    if (patient) {
      await notificationController.createNotification(
        patient._id,
        doctor._id,
        "Consultation Completed",
        `Your consultation with Dr. ${doctor.firstName} ${doctor.lastName} has ended. If lab tests are required, please complete them and share the results with the doctor.`,
        session._id,
        "Consultation"
      );
    }

    // Notify the doctor
    if (doctor) {
      await notificationController.createNotification(
        doctor._id,
        patient._id,
        "Consultation Completed",
        `The consultation with ${patient.firstName} ${patient.lastName} is completed. If lab tests are required, please follow up.`,
        session._id,
        "Consultation"
      );
    }

      // Emit the system message via Socket.IO to notify about consultation completion
      io.emit("systemMessage", {
        type: "completion",
        message: `The consultation with Dr. ${doctor.firstName} ${doctor.lastName} is now complete.`,
        consultationId: session._id,
        timestamp: new Date(),
      });

      res
        .status(200)
        .json({ message: "Consultation processed", consultationComplete });
    } catch (error) {
      console.error("Error completing consultation:", error);
      res.status(500).json({
        message: "Error processing consultation",
        error: error.toString(),
      });
    }
  },

  checkWithdrawalStatus: async (req, res) => {
    try {
      const adminId = req.params.adminId;
      const { transactionId } = req.body;

      const admin = await User.findById(adminId);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to perform this action",
        });
      }

      const transaction = await Transaction.findById(transactionId).populate("user");
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      // If transaction is already marked as success or failed, return its status
      if (transaction.status === "success" || transaction.status === "failed") {
        return res.status(200).json({
          success: true,
          transactionStatus: transaction.status,
          message: `Transaction is ${transaction.status}`,
        });
      }

      // For transactions that need verification or are in processing state
      if ((transaction.status === "verification_needed" || transaction.status === "processing") && transaction.transferCode) {
        // Use the checkTransferStatus function to verify with Paystack
        const transferStatus = await checkTransferStatus(transaction.transferCode);
        
        if (transferStatus.success) {
          const paystackStatus = transferStatus.status;
          
          // Update transaction based on Paystack status
          if (paystackStatus === "success") {
            // Transaction was successful, update user balance and transaction status
            const user = transaction.user;
            if (user) {
              // Only deduct if not already deducted
              if (transaction.status !== "success") {
                user.walletBalance -= transaction.amount;
                await user.save();
              }
            }
            
            transaction.status = "success";
            transaction.completedAt = new Date();
            await transaction.save();
            
            // Send notification
            if (user) {
              await notificationController.createNotification(
                user._id,
                null,
                "withdrawal",
                `Your withdrawal of ₦${transaction.amount} to ${transaction.bankName} (${transaction.accountNumber}) has been completed successfully.`,
                transaction._id,
                "Transaction"
              );
            }
            
            return res.status(200).json({
              success: true,
              transactionStatus: "success",
              message: "Withdrawal confirmed as successful",
            });
          } else if (paystackStatus === "failed") {
            transaction.status = "failed";
            await transaction.save();
            
            return res.status(200).json({
              success: true,
              transactionStatus: "failed",
              message: "Withdrawal confirmed as failed",
            });
          } else {
            // Still pending or processing
            return res.status(200).json({
              success: true,
              transactionStatus: transaction.status,
              message: `Withdrawal is still ${paystackStatus} at Paystack`,
              paystackStatus: paystackStatus
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: "Failed to check transfer status with Paystack",
            error: transferStatus.message,
          });
        }
      }

      return res.status(200).json({
        success: true,
        transactionStatus: transaction.status,
        message: `Transaction is ${transaction.status}`,
      });
    } catch (error) {
      console.error("Error checking withdrawal status:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  },
};

export default authController;
