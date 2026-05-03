//authRoute.js

import passport from "passport";
import express from "express";
import authController from "../controllers/authController.js";
import {
  validateUserRegistration,
  validateUserLogin,
  validateEmailVerification,
  validateWalletFunding,
  validateWithdrawal,
  validateObjectId,
} from "../middleware/validation.js";
import { ensureAuthenticated, ensureOwner, ensureAdmin, ensureHealthProvider } from "../middleware/auth.js";
import {
  authLimiter,
  registrationLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  walletLimiter,
  withdrawalLimiter,
} from "../middleware/rateLimiter.js";




const router = express.Router();

// Welcome message
router.get("/", (req, res) => {
  res.json({ message: "Welcome to Mobile Doctor authentication" });
});

// Google authentication
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }) 
);


router.get(
  "/google/user",
  passport.authenticate("google", { failureRedirect: "/" }),
  async function (req, res) {
    try {
      // Generate JWT token for Google auth user
      const jwt = await import('jsonwebtoken');
      const token = jwt.default.sign(
        {
          userId: req.user._id.toString(),
          email: req.user.email,
          role: req.user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Successful authentication with JWT token
      res.status(200).json({
        message: "Successfully logged in with Google Auth",
        token: token,
        user: {
          profilePhoto: req.user.profilePhoto,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          isVerified: {status: req.user.isVerified, message: "Email verification"}
        },
      });
    } catch (error) {
      console.error("Error generating JWT for Google auth:", error);
      res.status(500).json({ message: "Error generating authentication token" });
    }
  }
);



// Get authenticated user details (supports both session and JWT)
router.get("/googleAuth/getUser", (req, res) => {
  // Check if user is authenticated (either session or JWT will set req.user)
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    const user = {
      profilePhoto: req.user.profilePhoto,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      isVerified: {status: req.user.isVerified, message: "Email verification"}
    };
    res.status(200).json({ message: "User details", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to retrieve user details" });
  }
});


// Logout route
router.get("/logout", authController.logout);
// Get transaction history
router.get('/transaction-history/:userId', authController.getTransactionHistory);
// Get wallet balance
router.get('/wallet-balance/:userId', authController.getWalletBalance);
// Endpoint for admin to view all pending withdrawal requests
router.get('/pending-withdrawals/:adminId', authController.getPendingWithdrawals); 
// Endpoint to get the active consultation session for a specific patient and doctor
router.get('/get-active-session/:patientId/:doctorId', authController.getActiveSession);
//get most recent active session
router.get('/mostRecentActiveSession/:userId', authController.getMostRecentActiveSession);

// Route to check if a doctor is available
router.get('/is-doctor-available/:doctorId', authController.checkDoctorAvailability);



// Registration and login routes
router.post("/register", registrationLimiter, validateUserRegistration, authController.register);
router.post("/login", authLimiter, validateUserLogin, authController.login);
router.post("/verify", ensureAuthenticated, emailVerificationLimiter, validateEmailVerification, authController.verify);

router.post('/fund-wallet/:userId', ensureAuthenticated, validateObjectId("userId"), walletLimiter, validateWalletFunding, ensureOwner, authController.fundWallet);
// Endpoint for users to initiate a withdrawal request
router.post('/withdraw/:userId', ensureAuthenticated, validateObjectId("userId"), withdrawalLimiter, validateWithdrawal, ensureHealthProvider, authController.withdraw); 

// Endpoint for admin to approve a withdrawal request
router.post('/approve-withdrawal/:adminId', ensureAuthenticated, validateObjectId("adminId"), ensureAdmin, authController.approveWithdrawal); 

//Endpoint to get OTP and finalize withdrawal
router.post('/finalize-withdrawal/:adminId', ensureAuthenticated, validateObjectId("adminId"), ensureAdmin, authController.finalizeWithdrawal);

router.post('/paystack/webhook', express.json(), authController.handlePaystackWebhook);

// Payment success callback route - redirects back to app after payment
router.get('/payment-success', authController.handlePaymentCallback);

// Start consultation and handle escrow
router.post('/start-consultation', authController.startConsultation);

//cancel consultation
router.post('/cancelConsultation', authController.cancelConsultation);

// Release funds from escrow
router.post('/completeConsultation', authController.completeConsultation);

router.post('/resend-verification-code', authController.resendVerificationCode);




export default router;
