//authcontroller
import crypto from 'crypto';


import passport from "passport";
import User from "../models/user.js";
import { Doctor, Therapist, Pharmacy, Laboratory } from "../models/healthProviders.js"
import determineRole from "../utils/determinUserRole.js";
import { sendVerificationEmail } from "../utils/nodeMailer.js";
import { generateVerificationCode } from "../utils/verficationCodeGenerator.js";
// import { generateSessionToken } from '../models/user.js';
import { chargePatient, verifyTransaction, initiateTransfer, createTransferRecipient } from "../config/paymentService.js";
import { Transaction } from "../models/services.js";
import ConsultationSession from '../models/consultationModel.js';
import Conversation from '../models/conversationModel.js';

//i am wondering why am getting 500 when i from heroku

const verificationcode = generateVerificationCode();


const authController = {

  register: async (req, res) => {
    try {
      const { userType, email, password, phone, firstName, lastName, appropriate } = req.body;

      const role = determineRole(userType);

      // Create a new user instance
      const newUser = new User({
        username: email,
        email,
        firstName,
        lastName,
        role: role,
        phone,
        appropriate: role === 'doctor' ? appropriate : null,
        verificationcode,
        profilePhoto: "http://res.cloudinary.com/ditdm55co/image/upload/v1711405225/65f819a7b85308ae12b8bcd7/65f819a7b85308ae12b8bcd7/1711405225600.jpg",
      });

      // Choose the appropriate model based on userType
      let healthProviderModel;
      switch (userType) {
        case 'doctor':
          healthProviderModel = Doctor;
          break;
        case 'pharmacy':
          healthProviderModel = Pharmacy;
          break;
        case 'therapist':
          healthProviderModel = Therapist;
          break;
        case 'laboratory':
          healthProviderModel = Laboratory;
          break;
        // Add other cases as needed
        default:
          // Default to patient
          healthProviderModel = null;
      }

      // Create a new health provider instance if userType is one of the specified types
      let healthProvider;
      if (healthProviderModel) {
        healthProvider = new healthProviderModel({
          // Add fields specific to health providers
          name: role, // Example field; replace with actual fields
        });
      }

      await User.register(newUser, password, async (err, user) => {
        if (err) {
          // Handle registration errors
          console.error(err);
          if (err.name === 'UserExistsError') {
            return res.status(400).json({ message: 'User already registered' });
          } else {
            console.error(err);
            return res.status(500).json({ message: 'Internal Server Error' });
          }
        } else {
          // If a health provider was created, associate it with the user
          if (healthProvider) {
            healthProvider._id = user._id; // Set the health provider's _id to match the user's _id
            user.healthProvider = healthProvider._id;
            await healthProvider.save();
          }

          // Send verification code via email
          await sendVerificationEmail(user.email, verificationcode);

          passport.authenticate('local')(req, res, () => {
            // Redirect to verify route
            res.status(200).json({ message: `Verification code: ${verificationcode}`, redirectTo: "/verify" });
          });
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Unexpected error during registration' });
    }
  },



  login: async (req, res) => {
    const user = new User({
      username: req.body.email,
      password: req.body.password
    });

    req.login(user, async (err) => {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local", (err, user, info) => {
          if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Internal Server Error' });
          }

          if (!user) {
            return res.status(401).json({ message: 'Authentication failed' });
          }

          req.logIn(user, async (err) => {
            if (err) {
              console.log(err);
              return res.status(500).json({ message: 'Internal Server Error' });
            }


            // Prepare the response data
            const responseData = {
              message: 'Successfully logged in',
              user: {
                profilePhoto: user.profilePhoto,
                firstName: user.firstName,
                lastName: user.lastName,
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isVerified: { status: user.isVerified, message: "Alabo, this one na for email verification o" },
              },
            };


            // Include kycVerification for health providers
            if (['doctor', 'therapist', 'pharmacy', 'laboratory'].includes(user.role)) {
              let healthProviderInfo = null;
              switch (user.role) {
                case 'doctor':
                  healthProviderInfo = await Doctor.findById(user._id);
                  break;
                case 'therapist':
                  healthProviderInfo = await Therapist.findById(user._id);
                  break;
                case 'pharmacy':
                  healthProviderInfo = await Pharmacy.findById(user._id);
                  break;
                case 'laboratory':
                  healthProviderInfo = await Laboratory.findById(user._id);
                  break;
              }

              if (healthProviderInfo && healthProviderInfo.kycVerification !== undefined) {
                responseData.user.kycVerification = healthProviderInfo.kycVerification;
              }
            }

            res.status(201).json(responseData);
          });
        })(req, res);
      }
    });
  },


  logout: async function (req, res) {
    // Check if the user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
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
      console.error('Error during logout:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  },



  // Verify 
  verify: async (req, res) => {
    try {
      const verifyCode = req.body.verifyCode;


      // Check if the user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check if the user is already verified
      if (req.user.isVerified) {
        return res.status(400).json({ message: 'User is already verified' });
      }

      console.log(req.user.verificationcode, verifyCode);
      // Check if the verification code matches the one in the database
      if (req.user.verificationcode !== verifyCode) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }



      // Update user's verification status
      req.user.isVerified = true;
      req.user.verificationcode = null; //clear the code after successful verification
      await req.user.save();

      // Return information to populate dashboard
      return res.status(201).json({
        message: 'Email Verified Successfully, you can login into your account now'

      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Unexpected error during verification' });
    }
  },



  fundWallet: async (req, res) => {
    const { amount } = req.body; // Only get amount from the request body

    try {
      const userId = req.params.userId
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const email = user.email; // Get email from the user model

      const authorizationUrl = await chargePatient(email, amount);
      if (authorizationUrl) {
        // Directly send the authorization URL to the client


        res.status(200).json({ success: true, authorizationUrl });
      } else {
        throw new Error('Unable to initiate wallet funding');
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.toString() });
    }
  },



  handlePaystackWebhook: async (req, res) => {
    try {
      const event = req.body;
      // Verify Paystack webhook signature to ensure the request is legitimate
      const secret = process.env.PAYSTACK_SECRET_KEY;
      const hash = crypto.createHmac('sha512', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (req.headers['x-paystack-signature'] !== hash) {
        return res.status(401).send('Invalid signature');
      }
      // Handle the successful payment event
      if (event.event === 'charge.success') {
        const reference = event.data.reference;
        const verificationResult = await verifyTransaction(reference);
        if (verificationResult.success) {
          // Extract email and amount from the verified transaction
          const email = verificationResult.data.customer.email;
          const amount = verificationResult.data.amount / 100; // Convert from kobo to naira
          // Find the user by email and update their wallet balance
          const user = await User.findOne({ email: email });
          if (user) {
            user.walletBalance += amount; // Increase the user's wallet balance
            await user.save();
            // Record the successful transaction
            const transaction = new Transaction({
              user: user._id,
              type: 'wallet funding',
              amount: amount,
              status: 'success',
              date: new Date()
            });
            await transaction.save();

            // Create notification for the user that funded the wallet
            const notification = {
              type: 'funded Successfully',
              message: `Your account has been successfully funded with ${amount}. Your new wallet balance is ${user.walletBalance}.`,
              timestamp: new Date()
            };

            // Push the notification to the user's notifications array if available
            if (user.notifications) {
              user.notifications.push(notification);
            } else {
              // If notifications array is not initialized, initialize it with the new notification
              user.notifications = [notification];
            }

            // Save the updated user object with the new notification
            await user.save();


            res.status(200).send('Wallet funded and transaction recorded successfully');
          } else {
            console.error('User not found for email:', email);
            res.status(404).json({ message: 'User not found' });
          }
        } else {
          console.error('Payment verification failed:', verificationResult.message);
          res.status(500).json({ message: 'Payment verification failed' });
        }
      } else {
        res.status(200).send('Webhook received but not a charge.success event');
      }
    } catch (error) {
      console.error('Error handling Paystack webhook:', error);
      res.status(500).json({ message: 'Internal Server Error' });
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
    if (!user) throw new Error('User not found');

    user.walletBalance += isCredit ? amount : -amount;
    await user.save();
  },

  getTransactionHistory: async (req, res) => {
    try {
      const { userId } = req.params;

      const transactions = await Transaction.find({ user: userId }).sort({ date: -1 });
      res.status(200).json({ success: true, transactions });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getWalletBalance: async (req, res) => {
    try {
      const { userId } = req.params; // Assuming you pass userId as a URL parameter

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.status(200).json({ success: true, walletBalance: user.walletBalance });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Function to create a withdrawal request
  withdraw: async (req, res) => {
    try {
      const userId = req.params.userId;
      const { amount, accountNumber, bankName } = req.body;

      // This is where you'd call the bank's API
      // The specifics depend on the bank's API documentation
      //     const response = await someBankingAPI.verifyAccount({ accountNumber, bankCode });
      //     return response.isValid;
      //   } catch (error) {
      //     console.error('Error verifying bank account:', error);
      //     return false;
      //   }
      // }

      // Check if the user exists and has the appropriate role
      const user = await User.findById(userId);
      if (!user || !['doctor', 'laboratory', 'therapist', 'pharmacist'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Unauthorized! You are not a health provider' });
      }

      // Check if the wallet has enough balance
      if (user.walletBalance < amount) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }

      // Create a pending transaction with account details
      const transaction = new Transaction({
        user: userId,
        type: 'withdrawal',
        status: 'pending',
        amount: amount,
        accountNumber: accountNumber, // Saved for when the admin processes the withdrawal
        bankName: bankName, // Saved as additional info for admin or for withdrawal processing
      });

      await transaction.save();

      // Here, you can notify the admin for approval...

      res.status(200).json({ success: true, message: 'Withdrawal request created and pending approval' });
    } catch (error) {
      console.error('Error during withdrawal:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  },


  // Function to approve a withdrawal request by Admin
  approveWithdrawal: async (req, res) => {
    try {
      const adminId = req.params.adminId;
      const { transactionId, accountNumber, bankCode } = req.body;

      // Validate admin privileges
      const admin = await User.findById(adminId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ success: false, message: 'Unauthorized to perform this action' });
      }

      // Find the transaction and validate it
      const transaction = await Transaction.findById(transactionId);
      if (!transaction || transaction.status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Invalid or already processed transaction' });
      }

      // Find the user who requested the withdrawal
      const user = await User.findById(transaction.user);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Create a transfer recipient
      const recipientDetails = await createTransferRecipient(user.firstName + ' ' + user.lastName, accountNumber, bankCode);
      if (!recipientDetails) {
        transaction.status = 'failed';
        await transaction.save();
        return res.status(500).json({ success: false, message: 'Failed to create transfer recipient' });
      }

      // Initiate the transfer
      const transferResponse = await initiateTransfer(transaction.amount, recipientDetails.recipient_code);
      if (!transferResponse) {
        transaction.status = 'failed';
        await transaction.save();
        return res.status(500).json({ success: false, message: 'Failed to initiate transfer' });
      }

      // If transfer initiation is successful, deduct the amount from user's wallet balance and mark the transaction as succeeded
      user.walletBalance -= transaction.amount;
      transaction.status = 'success';
      await user.save();
      await transaction.save();

      res.status(200).json({ success: true, message: 'Withdrawal approved and processed', transferDetails: transferResponse });
    } catch (error) {
      console.error('Error during withdrawal approval:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  },

  getPendingWithdrawals: async (req, res) => {
    try {
      const adminId = req.params.adminId; // or req.user._id if you have the user ID stored in req.user

      // Validate admin privileges
      const admin = await User.findById(adminId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ success: false, message: 'Unauthorized to perform this action' });
      }

      // Retrieve all pending withdrawal transactions
      const pendingWithdrawals = await Transaction.find({ status: 'pending', type: 'withdrawal' }).populate('user', 'firstName lastName email');

      res.status(200).json({ success: true, pendingWithdrawals });
    } catch (error) {
      console.error('Error fetching pending withdrawals:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  },


  // startConsultation: async (req, res) => {
  //   const { patientId, doctorId, specialty } = req.body;

  //   try {
  //     // First, check if there is an existing active session for this patient and doctor
  //     const existingSession = await ConsultationSession.findOne({
  //       patient: patientId,
  //       doctor: doctorId,
  //       status: { $in: ['scheduled', 'in-progress'] }
  //     });

  //     // If an existing active session is found, return a message indicating so
  //     if (existingSession) {
  //       return res.status(400).json({
  //         message: "An active session already exists for this patient and doctor. Please complete or cancel the existing session before starting a new one."
  //       });
  //     }

  //     const patient = await User.findById(patientId);
  //     const doctor = await Doctor.findById(doctorId);

  //     if (!patient || !doctor) {
  //       return res.status(404).json({ message: 'Patient or Doctor not found' });
  //     }

  //     // Initialize consultationFee with a default value
  //     let consultationFee = 1000; // Default fee if no specialty matches

  //     // Log the specialties for debugging
  //     console.log("Doctor's Specialties:", doctor.medicalSpecialty);

  //     // Override consultationFee if a matching specialty is found
  //     if (specialty) {
  //       const specialtyInfo = doctor.medicalSpecialty.find(s => s.name.toLowerCase() === specialty.toLowerCase());
  //       if (specialtyInfo) {
  //         consultationFee = specialtyInfo.fee;
  //       } else {
  //         console.log("Specified specialty not found in doctor's specialties. Using default fee.");
  //       }
  //     };

  //     if (patient.walletBalance < consultationFee) {
  //       return res.status(400).json({ message: 'Insufficient wallet balance for this consultation.' });
  //     }

  //     // Proceed to deduct consultation fee from patient's wallet and update wallet balance
  //     patient.walletBalance -= consultationFee;
  //     await patient.save();

  //     // Record the transaction as held in escrow
  // const transaction = new Transaction({
  //   user: patientId,
  //   doctor: doctorId,
  //   type: 'consultation fee',
  //   status: 'success',
  //   escrowStatus: 'held', // Make sure this is set correctly
  //   amount: consultationFee,
  // });
  // await transaction.save();


  //     // Create and save the new consultation session
  //     const newSession = await new ConsultationSession({
  //       doctor: doctorId,
  //       patient: patientId,
  //       status: 'scheduled',
  //       escrowTransaction: transaction._id,
  //       startTime: new Date(),
  //       // Include additional session details as necessary
  //     }).save();

  //     // Return success response with session and transaction details
  //     res.status(200).json({
  //       message: 'New consultation session started successfully.',
  //       session: newSession,
  //       transaction: transaction
  //     });
  //   } catch (error) {
  //     console.error('Failed to start consultation:', error);
  //     res.status(500).json({ message: 'Error starting consultation', error: error.toString() });
  //   }
  // },

  startConsultation: async (req, res) => {
    const { patientId, doctorId, specialty } = req.body;

    try {
      // Check if there is an existing active session for this patient and doctor
      const existingSession = await ConsultationSession.findOne({
        patient: patientId,
        doctor: doctorId,
        status: { $in: ['scheduled', 'in-progress'] }
      });

      // If an existing active session is found, indicate that a new session can't be started
      if (existingSession) {
        return res.status(400).json({
          message: "An active session already exists for this patient and doctor. Please complete or cancel the existing session before starting a new one."
        });
      }

      // Ensure both patient and doctor exist
      const patient = await User.findById(patientId);
      const doctor = await Doctor.findById(doctorId);
      if (!patient || !doctor) {
        return res.status(404).json({ message: 'Patient or Doctor not found' });
      }

      // Initialize consultationFee with the default value from doctor.medicalSpecialty
      let consultationFee = doctor.medicalSpecialty.fee; // Use the default fee
      // Convert consultationFee to a Number to ensure correct data type
      consultationFee = Number(consultationFee);

      if (isNaN(consultationFee)) {
        return res.status(400).json({ message: 'Invalid consultation fee.' });
      }

      console.log(consultationFee);


      // Check patient's wallet balance
      if (patient.walletBalance < consultationFee) {
        return res.status(400).json({ message: 'Insufficient wallet balance for this consultation.' });
      }

      // Deduct consultation fee from patient's wallet
      patient.walletBalance -= consultationFee;
      await patient.save();

      // Record the transaction as held in escrow
      const transaction = new Transaction({
        user: patientId,
        doctor: doctorId,
        type: 'consultation fee',
        status: 'success',
        escrowStatus: 'held',
        amount: consultationFee,
      });
      await transaction.save();

      // Find or create a conversation between patient and doctor
      let conversation = await Conversation.findOne({
        participants: { $all: [patientId, doctorId] }
      });
      if (!conversation) {
        conversation = new Conversation({
          participants: [patientId, doctorId]
        });
        await conversation.save();
      }

      // Create the consultation session
      const newSession = new ConsultationSession({
        doctor: doctorId,
        patient: patientId,
        status: 'scheduled',
        escrowTransaction: transaction._id,
        startTime: new Date(),
        // You can add more details to the session here
      });
      await newSession.save();

      // Return success response with session details and conversation ID
      res.status(200).json({
        message: 'New consultation session started successfully.',
        session: newSession,
        conversationId: conversation._id, // Include the conversation ID in the response
      });
    } catch (error) {
      console.error('Failed to start consultation:', error);
      res.status(500).json({ message: 'Error starting consultation', error: error.toString() });
    }
  },




  getActiveSession: async (req, res) => {
    const { patientId, doctorId } = req.params;

    try {
      // First, find the conversation ID for the patient and doctor
      const conversation = await Conversation.findOne({
        participants: { $all: [patientId, doctorId] }
      }).select('_id');

      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found.' });
      }

      // Then, find the active session
      const activeSession = await ConsultationSession.findOne({
        patient: patientId,
        doctor: doctorId,
        status: { $in: ['scheduled', 'in-progress'] }
      })
        .sort({ createdAt: -1 })
        .populate('patient', 'firstName lastName profilePhoto');

      if (!activeSession) {
        return res.status(404).json({ message: 'Active session not found.' });
      }

      // Fetch the Doctor document to access the profilePhoto within the images object
      const doctorInfo = await Doctor.findById(doctorId).select('images.profilePhoto -_id');

      // Return the session info including the conversation ID
      res.status(200).json({
        sessionId: activeSession._id,
        conversationId: conversation._id,
        patientFirstName: activeSession.patient.firstName,
        patientLastName: activeSession.patient.lastName,
        patientProfilePhoto: activeSession.patient.profilePhoto,
        doctorProfilePhoto: doctorInfo ? doctorInfo.images.profilePhoto : null,
        startTime: activeSession.startTime,
      });
    } catch (error) {
      console.error('Error retrieving active session:', error);
      res.status(500).json({ message: 'Failed to retrieve active session.', error: error.message });
    }
  },


  getMostRecentActiveSession: async (req, res) => {
    const userId = req.params.userId;

    try {
      // First, identify the role of the user making the request
      const userMakingRequest = await User.findById(userId);
      if (!userMakingRequest) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Find the most recent active session for the user
      const mostRecentActiveSession = await ConsultationSession.findOne({
        $or: [{ patient: userId }, { doctor: userId }],
        status: { $in: ['scheduled', 'in-progress'] }
      })
        .sort({ startTime: -1 }) // Get the most recent session
        .lean(); // Use lean() for faster execution as we just need the object

      if (!mostRecentActiveSession) {
        return res.status(404).json({
          success: false,
          message: 'No active session found for this user.'
        });
      }

      // Now find the conversation related to the session
      const conversation = await Conversation.findOne({
        participants: { $all: [mostRecentActiveSession.patient, mostRecentActiveSession.doctor] }
      })
        .select('_id')
        .lean();

      // Attach conversationId to the session object if found
      mostRecentActiveSession.conversationId = conversation ? conversation._id : null;

      // Attach patient or doctor details based on the role of the requester
      const otherParticipantId = userMakingRequest.role === 'doctor' ? mostRecentActiveSession.patient : mostRecentActiveSession.doctor;
      const otherParticipantDetails = await User.findById(otherParticipantId, 'firstName lastName profilePhoto _id').lean();

      // Prepare the response object
      const responseObj = {
        success: true,
        message: 'Most recent active session retrieved successfully.',
        session: {
          sessionId: mostRecentActiveSession._id,
          startTime: mostRecentActiveSession.startTime,
          conversationId: mostRecentActiveSession.conversationId,
          otherParticipant: otherParticipantDetails
        }
      };

      res.status(200).json(responseObj);
    } catch (error) {
      console.error('Error retrieving the most recent active session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve the most recent active session.',
        error: error.message
      });
    }
  },











  cancelConsultation: async (req, res) => {
    const { sessionId } = req.body;

    try {
      // Retrieve the session and ensure to populate the escrowTransaction
      const session = await ConsultationSession.findById(sessionId).populate('escrowTransaction');
      if (!session) {
        return res.status(404).json({ message: 'Consultation session not found' });
      }

      console.log("Session found with escrowTransaction:", session);

      // Ensure that the escrowTransaction exists and is in the 'held' state
      if (!session.escrowTransaction || session.escrowTransaction.escrowStatus !== 'held') {
        console.log("Transaction details:", session.escrowTransaction);
        return res.status(400).json({ message: 'No escrow transaction found or not eligible for refund' });
      }

      // Retrieve the patient for the session
      const patient = await User.findById(session.patient);
      const doctor = await User.findById(session.doctor);



      if (!patient) {
        return res.status(404).json({ message: 'Patient not found for refund' });
      }

      // Refund the consultation fee to the patient's wallet
      patient.walletBalance += session.escrowTransaction.amount;
      await patient.save();

      // Update the escrowTransaction status to 'refunded'
      session.escrowTransaction.escrowStatus = 'refunded';
      await session.escrowTransaction.save();

      // Update the session status to 'cancelled'
      session.status = 'cancelled';
      await session.save();

      // Create notification for the patient
      const notification = {
        type: 'Consultation Canceled',
        message: `Your consultation with ${doctor.firstName} ${doctor.lastName}  has been canceled.`,
        timestamp: new Date()
      };

      // Push the notification to the patient's notifications array
      patient.notifications.push(notification);
      await patient.save();

      // Create notification for the doctor
      const doctorNotification = {
        type: 'Consultation Canceled',
        message: `Consultation with ${patient.firstName} ${patient.lastName} has been canceled.`,
        timestamp: new Date()
      };

      // Push the notification to the doctor's notifications array
      if (doctor.notifications) {
        doctor.notifications.push(doctorNotification);
        await doctor.save();
      }

      return res.status(200).json({ message: 'Consultation cancelled and fee refunded to patient' });
    } catch (error) {
      console.error('Error during consultation cancellation:', error);
      return res.status(500).json({ message: 'Error cancelling consultation', error: error.toString() });
    }
  },









  completeConsultation: async (req, res) => {
    const { sessionId } = req.body;
    let consultationComplete = false; // Initialize the flag as false

    try {
      const session = await ConsultationSession.findById(sessionId).populate('patient');
      if (!session) {
        return res.status(404).json({ message: 'Consultation session not found' });
      }

      if (session.status === 'completed') {
        return res.status(400).json({ message: 'Consultation session is already marked as completed.' });
      }

      session.status = 'completed';
      session.endTime = new Date();
      await session.save();

      const transaction = await Transaction.findById(session.escrowTransaction);
      if (transaction && transaction.escrowStatus === 'held') {
        const doctor = await User.findById(session.doctor);
        if (doctor) {
          doctor.walletBalance += transaction.amount;
          await doctor.save();

          transaction.escrowStatus = 'released';
          await transaction.save();
          consultationComplete = true;
        }
      }

      const patient = session.patient; // Retrieve the patient from the session
      const doctor = await User.findById(session.doctor);

      const notification = {
        type: 'Consultation Completed',
        message: `Your consultation with Dr. ${doctor.firstName} ${doctor.lastName} is completed.`,
        timestamp: new Date()
      };

      patient.notifications.push(notification); // Push the notification to the patient's notifications array
      await patient.save(); // Save the patient object

      // Create notification for the doctor
      const doctorNotification = {
        type: 'Consultation Completed',
        message: `The consultation with ${session.patient.firstName} ${session.patient.lastName} is completed.`,
        timestamp: new Date()
      };
      doctor.notifications.push(doctorNotification);
      await doctor.save();


      res.status(200).json({
        message: 'Consultation completed, funds released to doctor',
        consultationComplete: consultationComplete
      });
    } catch (error) {
      console.error('Error during consultation completion:', error);
      res.status(500).json({
        message: 'Error completing consultation',
        error: error.toString(),
        consultationComplete: consultationComplete
      });
    }
  },




};

export default authController;