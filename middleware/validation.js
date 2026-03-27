import { body, param, validationResult } from "express-validator";

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// User registration validation
export const validateUserRegistration = [
  body("userType")
    .isIn(["patient", "doctor", "pharmacy", "therapist", "laboratory"])
    .withMessage("Invalid user type"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  body("phone")
    .matches(/^(\+234|0)?[789]\d{9}$/)
    .withMessage("Invalid Nigerian phone number format"),
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .escape(),
  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .escape(),
  handleValidationErrors,
];

// User login validation
export const validateUserLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
  handleValidationErrors,
];

// Email verification validation
export const validateEmailVerification = [
  body("verifyCode")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("Verification code must be 6 digits"),
  handleValidationErrors,
];

// Password reset validation
export const validatePasswordReset = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
  handleValidationErrors,
];

// Password reset with OTP validation
export const validatePasswordResetWithOtp = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("OTP must be 6 digits"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  handleValidationErrors,
];

// Profile update validation
export const validateProfileUpdate = [
  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .escape(),
  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .escape(),
  body("phone")
    .optional()
    .matches(/^(\+234|0)?[789]\d{9}$/)
    .withMessage("Invalid Nigerian phone number format"),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address must not exceed 200 characters")
    .escape(),
  body("state")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("State must not exceed 50 characters")
    .escape(),
  body("gender")
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Invalid gender value"),
  handleValidationErrors,
];

// Location update validation
export const validateLocationUpdate = [
  body("coordinates")
    .isArray({ min: 2, max: 2 })
    .withMessage("Coordinates must be an array of [longitude, latitude]"),
  body("coordinates.0")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),
  body("coordinates.1")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),
  handleValidationErrors,
];

// Wallet funding validation
export const validateWalletFunding = [
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be greater than 0"),
  handleValidationErrors,
];

// Withdrawal validation
export const validateWithdrawal = [
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be greater than 0"),
  body("accountNumber")
    .isLength({ min: 10, max: 10 })
    .isNumeric()
    .withMessage("Account number must be 10 digits"),
  body("bankName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Bank name must be between 2 and 100 characters")
    .escape(),
  body("bankCode")
    .isLength({ min: 3, max: 3 })
    .isNumeric()
    .withMessage("Bank code must be 3 digits"),
  handleValidationErrors,
];

// MongoDB ObjectId validation
export const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
  handleValidationErrors,
];

// Generic sanitization middleware
export const sanitizeInput = (req, res, next) => {
  // Sanitize all string inputs to prevent XSS
  for (const key in req.body) {
    if (typeof req.body[key] === "string") {
      req.body[key] = req.body[key].trim();
    }
  }
  next();
};

// Admin action validation
export const validateAdminActions = [
  body("userId").optional().isMongoId().withMessage("Invalid user ID format"),
  body("kycVerificationStatus").optional().isIn(["pending", "approved", "rejected"]).withMessage("Invalid KYC status"),
  body("consultationFee").optional().isFloat({ gt: 0 }).withMessage("Consultation fee must be greater than 0"),
  body("amount").optional().isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  body("isApproved").optional().isIn(["Pending", "Approved", "Rejected"]).withMessage("Invalid approval status"),
  body("isSuspended").optional().isBoolean().withMessage("Suspension status must be boolean"),
  body("rejectionNote").optional().trim().isLength({ max: 500 }).withMessage("Rejection note too long"),
  handleValidationErrors,
];
