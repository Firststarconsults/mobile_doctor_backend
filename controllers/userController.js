// userController.js
import User from "../models/user.js";
import Configuration from '../models/configModel.js';
import { Doctor, Pharmacy, Laboratory, Therapist } from "../models/healthProviders.js";
import DeletedUser from '../models/deleteModel.js';
// import nodemailer from 'nodemailer';
import { upload } from "../config/cloudinary.js";
import { sendForgetPasswordEmail } from "../utils/nodeMailer.js";
import { generateVerificationCode } from "../utils/verficationCodeGenerator.js";

const userController = {


  // To get user profile by userId

  getProfile: async (req, res) => {
    try {
      const userId = req.params.userId; // Assuming userId is passed as a route parameter
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      // Base user profile
      let userProfile = {
        profilePhoto: user.profilePhoto,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        email: user.email,
        gender: user.gender,
        country: user.country,
        state: user.state,
        emailVerification: user.isVerified,
        isApproved: user.isApproved,
        kycVerificationStatus: user.kycVerificationStatus
      };

      // Attempt to fetch additional details based on the user's role
      let providerDetails = null;
      switch (user.role) {
        case 'doctor':
          const doctorDetails = await Doctor.findById(userId).select('approval medicalSpecialty kycVerification about images').lean();
          if (doctorDetails) {
            userProfile = {
              ...userProfile, // Spread the existing userProfile fields
              approval: doctorDetails.approval,
              medicalSpecialty: doctorDetails.medicalSpecialty,
              kycVerification: doctorDetails.kycVerification,
              about: doctorDetails.about,
              profilePhoto: doctorDetails.images.profilePhoto // Get the profile photo from the images object
            };
          }
          break;
        case 'therapist':
          providerDetails = await Therapist.findById(userId).select('name kycVerification location').lean();
          break;
        case 'pharmacy':
          providerDetails = await Pharmacy.findById(userId).select('name kycVerification location').lean();
          break;
        case 'laboratory':
          providerDetails = await Laboratory.findById(userId).select('name location').lean();
          break;
      }

      // Append the fetched details to the userProfile object
      if (providerDetails) {
        userProfile[`${user.role}Details`] = providerDetails;
      }

      return res.status(200).json({ message: 'User profile retrieved successfully', userProfile });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Unexpected error during profile retrieval' });
    }
  },









  //To update user profile
  upDateprofile: async (req, res) => {
    try {
      const userId = req.params.userId;
  
      // Check if the user exists
      const existingUser = await User.findById(userId);
  
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Update user profile information
      existingUser.firstName = req.body.firstName || existingUser.firstName;
      existingUser.lastName = req.body.lastName || existingUser.lastName;
      existingUser.phone = req.body.phone || existingUser.phone;
      existingUser.gender = req.body.gender || existingUser.gender;
      existingUser.country = req.body.country || existingUser.country;
      existingUser.state = req.body.state || existingUser.state;
      existingUser.address = req.body.address || existingUser.address;
  
      // Check if an image is uploaded
      if (req.files && req.files.image) {
        const { image } = req.files;
        const fileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        const imageSize = 1024;
  
        // Validate image type
        if (!fileTypes.includes(image.mimetype)) {
          return res.status(400).json({ success: false, error: 'Image formats supported: JPG, PNG, JPEG' });
        }
  
        // Validate image size
        if (image.size / 1024 > imageSize) {
          return res.status(400).json({ success: false, error: `Image size should be less than ${imageSize}kb` });
        }
  
        // Upload image to Cloudinary
        const cloudFile = await upload(image.tempFilePath, userId); // Pass the user ID as the folderName
  
        // Update user model with the Cloudinary URL for the specific image type
        existingUser.profilePhoto = cloudFile.url;
      }
  
      // Save the updated user profile
      await existingUser.save();
  
      return res.status(200).json({ message: 'Profile information updated successfully', user: existingUser });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Unexpected error during profile update' });
    }
  },
  





  resetPassword: async (req, res) => {
    try {
      const userId = req.params.userId;
      const { oldPassword, newPassword } = req.body;

      // Find the user by ID
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // passport-local-mongoose provides a method to change the password
      user.changePassword(oldPassword, newPassword, async (err) => {
        if (err) {
          // If oldPassword is incorrect, it will throw an error
          if (err.name === 'IncorrectPasswordError') {
            return res.status(400).json({ message: 'Old password is incorrect' });
          } else {
            console.error(err);
            return res.status(500).json({ message: 'Could not update password', err });
          }
        }

        // Save the updated user record with the new password
        await user.save();
        res.status(200).json({ message: 'Password updated successfully' });
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Unexpected error during password reset' });
    }
  },

 // Optimized forgotPassword function - Non-blocking email sending
forgotPassword: async (req, res) => {
  const { email } = req.body;
  
  try {
    // Validate email input
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    console.log(`[${new Date().toISOString()}] Forgot password request for: ${email}`);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        message: 'No account with that email address exists.' 
      });
    }

    // Generate OTP
    const otp = generateVerificationCode();
    
    // Save OTP to database
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    console.log(`[${new Date().toISOString()}] OTP saved for ${email}, initiating email send...`);

    // Send email WITHOUT blocking the response
    // Fire and forget - don't await
    sendForgetPasswordEmail(user.email, otp)
      .then(() => {
        console.log(`[${new Date().toISOString()}] ✓ Password reset email sent successfully to ${email}`);
      })
      .catch((error) => {
        console.error(`[${new Date().toISOString()}] ✗ Failed to send password reset email to ${email}:`, error.message);
        // Email failed but user can still try to use OTP if it was saved
      });

    // Respond immediately - don't wait for email
    res.status(200).json({ 
      message: 'An OTP has been sent to ' + user.email + ' with further instructions.',
      success: true 
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Forgot password error:`, error);
    res.status(500).json({ 
      message: 'Unexpected error during the forgot password process',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
},


  resetPasswordWithOtp: async (req, res) => {
    try {
      const { otp, newPassword } = req.body;
  
      // Check if OTP and new password are provided
      if (!otp || !newPassword) {
        return res.status(400).json({ message: 'OTP and new password are required.' });
      }
  
      // Find user by OTP and check if the OTP is expired
      const user = await User.findOne({ resetPasswordOtp: otp, resetPasswordOtpExpires: { $gt: Date.now() } });
  
      if (!user) {
        return res.status(400).json({ message: 'OTP is invalid or has expired.' });
      }
  
      // Reset the password
      user.setPassword(newPassword, async (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Error resetting password' });
        }
  
        // Clear the OTP and expiry
        user.resetPasswordOtp = undefined;
        user.resetPasswordOtpExpires = undefined;
  
        await user.save();
        res.status(200).json({ message: 'Password has been reset successfully' });
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Unexpected error during the password reset process' });
    }
  },
  

 

  // To update online status
  updateOnlineStatus: async (req, res) => {
    try {
      const userId = req.params.userId;
      const isOnline = req.body.isOnline;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.isOnline = isOnline;
      await user.save();

      res.status(200).json({ message: 'Online status updated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Unexpected error updating online status' });
    }
  },

  // To get online status
getOnlineStatus: async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find the user by ID
    const user = await User.findById(userId);

    // If user not found, return a 404 error
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the online status of the user
    res.status(200).json({ isOnline: user.isOnline });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unexpected error retrieving online status' });
  }
},


  // Assuming this is in a controller file where User model is imported

  getOnlineUsers: async (req, res) => {
    const { role } = req.params; // Get the role from the request parameters

    try {
      const onlineUsers = await User.find({
        role: role,
        isOnline: true
      }).select('-password'); // Exclude sensitive information like passwords from the result

      if (onlineUsers.length === 0) {
        return res.status(404).json({ message: 'No online users found for this role' });
      }

      res.status(200).json(onlineUsers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'An error occurred while fetching online users' });
    }
  },


  findNearby: async (req, res) => {
    try {
      const { userId } = req.params; // or however you get the user's ID from the request
      const { distance, type } = req.query; // expects 'distance' in meters and 'type' as model name (Doctor, Pharmacy, etc.)

      const user = await User.findById(userId);
      if (!user || !user.location) {
        return res.status(404).json({ message: "User not found or location not set" });
      }

      const providers = await user.findNearbyProviders(type, Number(distance));
      res.status(200).json(providers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // POST /api/patient/update-location
  updateLocation: async (req, res) => {
    const { userId, latitude, longitude } = req.body;

    try {
      const user = await User.findById(userId);
      if (user) {
        // If location does not exist, initialize it
        if (!user.location) {
          user.location = { type: 'Point', coordinates: [] };
        }

        // Update patient's location coordinates
        user.location.coordinates = [longitude, latitude];
        await user.save();

        res.status(200).json({ message: 'Location updated successfully' });
      } else {
        res.status(404).json({ message: 'user not found' });
      }
    } catch (error) {
      console.error("Update location error:", error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }

  },


  // GET /api/doctor/find-nearby-providers/:patientId
  getNearbyProvider: async (req, res) => {
    const { userId } = req.params;
    const { role } = req.query;

    const getConfigValue = async (key) => {
      const config = await Configuration.findOne({ key });
      return config ? config.value : null;
    };
  
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
  
      const distanceConfig = await getConfigValue('distance');
      if (distanceConfig === null) return res.status(500).json({ message: "Distance configuration not found" });
  
      const providers = await user.findNearbyProvidersByRole(role, Number(distanceConfig));
      res.status(200).json(providers);
    } catch (error) {
      console.error('Error fetching nearby providers:', error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  },

  getNotifications: async (req, res) => {
    const userId = req.params.userId;
    console.log('User ID:', userId); // Add this logging statement
    
    try {
      // Find the user by ID
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Return the notifications array for the user
      res.status(200).json({ notifications: user.notifications });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Error fetching notifications', error: error.toString() });
    }
},

deleteUser: async (req, res) => {
  const userId = req.params.userId;
  console.log(`Received request to delete user with ID: ${userId}`);

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('User found:', user);

    // Fetch related data based on the user's role
    let relatedData = {};
    if (user.role === 'doctor') {
      relatedData.doctor = await Doctor.findById(userId);
    } else if (user.role === 'pharmacy') {
      relatedData.pharmacy = await Pharmacy.findById(userId);
    } else if (user.role === 'therapist') {
      relatedData.therapist = await Therapist.findById(userId);
    } else if (user.role === 'laboratory') {
      relatedData.laboratory = await Laboratory.findById(userId);
    }

    // Create a new entry in the DeletedUser collection with related data
    const deletedUser = new DeletedUser({
      originalUserId: user._id,
      role: user.role,
      deletedData: {
        user: user.toObject(),
        relatedData: {
          doctor: relatedData.doctor ? relatedData.doctor.toObject() : null,
          pharmacy: relatedData.pharmacy ? relatedData.pharmacy.toObject() : null,
          therapist: relatedData.therapist ? relatedData.therapist.toObject() : null,
          laboratory: relatedData.laboratory ? relatedData.laboratory.toObject() : null,
        },
      },
    });

   

    await deletedUser.save();
    console.log('Deleted user data saved to archive');

    // Delete related data from other schemas
    if (relatedData.doctor) {
      await Doctor.deleteOne({ _id: userId });
      console.log('Doctor data deleted');
    }

    if (relatedData.pharmacy) {
      await Pharmacy.deleteOne({ _id: userId });
      console.log('Pharmacy data deleted');
    }

    if (relatedData.therapist) {
      await Therapist.deleteOne({ _id: userId });
      console.log('Therapist data deleted');
    }

    if (relatedData.laboratory) {
      await Laboratory.deleteOne({ _id: userId });
      console.log('Laboratory data deleted');
    }

    // Delete the user from User schema
    await User.deleteOne({ _id: userId });
    console.log('User deleted from User collection');

    res.status(200).json({ message: 'User and related data deleted and moved to archive' });
  } catch (error) {
    console.error('Error during deletion process:', error);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
}



};

export default userController;
