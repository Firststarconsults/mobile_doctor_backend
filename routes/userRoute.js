import express from "express";
import userController from "../controllers/userController.js";
import { ensureAuthenticated, ensureOwner, ensureAdmin, ensureHealthProvider } from "../middleware/auth.js";
import {
  validateProfileUpdate,
  validateLocationUpdate,
  validateObjectId,
  validatePasswordReset,
  validatePasswordResetWithOtp,
} from "../middleware/validation.js";
import {
  passwordResetLimiter,
  generalLimiter,
} from "../middleware/rateLimiter.js";


const router = express.Router();

// Welcome message
router.get("/", (req, res) => {
  res.json({ message: "Welcome to Mobile Doctor user route" });
});




//get users profile
router.get("/profile/:userId", ensureAuthenticated, ensureOwner, userController.getProfile);
//get online users
router.get('/online-users/:role', ensureAuthenticated, userController.getOnlineUsers)

// Route to find nearby health providers
router.post('/update-location', ensureAuthenticated, validateLocationUpdate, userController.updateLocation);
//for doctor to use and get nearby HealthProvider
router.get('/find-nearby-providers/:userId', ensureAuthenticated, validateObjectId("userId"), ensureOwner, userController.getNearbyProvider )
// get notification
router.get('/get-notifications/:userId', ensureAuthenticated, validateObjectId("userId"), ensureOwner, userController.getNotifications);
router.get('/online-status/:userId', ensureAuthenticated, validateObjectId("userId"), ensureOwner, userController.getOnlineStatus);
//update user location
router.post('/map/patient/update-location', ensureAuthenticated, validateLocationUpdate, userController.updateLocation)
// Update user profile route

router.put("/updateProfile/:userId", ensureAuthenticated, validateObjectId("userId"), ensureOwner, validateProfileUpdate, userController.upDateprofile);
// reset password and reset pasword with token
router.post("/reset-password/:userId", ensureAuthenticated, validateObjectId("userId"), ensureOwner, passwordResetLimiter, userController.resetPassword);
// router.post("/resetWithToken", userController.resetPasswordWithToken);
//update Online Status
router.post('/updateOnlineStatus/:userId', ensureAuthenticated, validateObjectId("userId"), ensureOwner, userController.updateOnlineStatus)


router.post('/forgot-password', passwordResetLimiter, validatePasswordReset, userController.forgotPassword);
router.post('/reset-password-with-otp', passwordResetLimiter, validatePasswordResetWithOtp, userController.resetPasswordWithOtp);

// router.post('/reset-password', userController.resetPasswordWithToken);

router.delete('/:userId', ensureAuthenticated, ensureAdmin, userController.deleteUser);





export default router;
