// userController.js
import crypto from 'crypto';
import User from "../models/user.js";
import { Doctor, Pharmacy, Laboratory, Therapist } from "../models/healthProviders.js";
// import nodemailer from 'nodemailer';
import { upload } from "../config/cloudinary.js";
import { sendVerificationEmail } from "../utils/nodeMailer.js";

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
        emailVerification: user.isVerified
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
      // Save the updated user profile
      await existingUser.save();



      const { image } = req.files;
      const fileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      const imageSize = 1024;

      if (!req.files || !req.files.image) {
        return res.status(400).json({ success: false, error: 'Please upload an image' });
      }

      if (!fileTypes.includes(image.mimetype)) return res.send('Image formats supported: JPG, PNG, JPEG');

      if (image.size / 1024 > imageSize) return res.send(`Image size should be less than ${imageSize}kb`);

      // Upload image to Cloudinary
      const cloudFile = await upload(image.tempFilePath, userId); // Pass the user ID as the folderName

      // Update user model with the Cloudinary URL for the specific image type
      existingUser.profilePhoto = cloudFile.url; // Update the profilePicture field directly

      await existingUser.save(); // Save the user model again

      return res.status(200).json({ message: 'Profile information updated successfully', user: existingUser });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Unexpected error during profile update' });
    }
  },


  //To update user profile


  //   upDateprofile: async (req, res) => {
  //   try {
  //     const userId = req.params.userId;

  //     // Check if the user exists
  //     const existingUser = await User.findById(userId);

  //     if (!existingUser) {
  //       return res.status(404).json({ message: 'User not found' });
  //     }

  //     // Update user profile information
  //     existingUser.firstName = req.body.firstName || existingUser.firstName;
  //     existingUser.lastName = req.body.lastName || existingUser.lastName;
  //     existingUser.phone = req.body.phone || existingUser.phone;
  //     existingUser.gender = req.body.gender || existingUser.gender;
  //     existingUser.country = req.body.country || existingUser.country;
  //     existingUser.state = req.body.state || existingUser.state;
  //     existingUser.address = req.body.address || existingUser.address;

  //     // Check for base64 image in the request body
  //     if (req.body.profilePhotoBase64) {
  //       try {
  //         // Upload image to Cloudinary
  //         const cloudFile = await uploadBase64(req.body.profilePhotoBase64, `user/${userId}`);
  //         // Update user model with the Cloudinary URL for the profile photo
  //         existingUser.profilePhoto = cloudFile.url;
  //       } catch (error) {
  //         console.error('Error uploading image to Cloudinary:', error);
  //         return res.status(500).json({ message: 'Error uploading image' });
  //       }
  //     }

  //     // Save the updated user profile
  //     await existingUser.save();

  //     return res.status(200).json({ message: 'Profile information updated successfully', user: existingUser });
  //   } catch (error) {
  //     console.error(error);
  //     return res.status(500).json({ message: 'Unexpected error during profile update' });
  //   }
  // },


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

  forgotPassword: async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'No account with that email address exists.' });
      }

      // Generate a token
      const token = crypto.randomBytes(20).toString('hex');

      // Set token and expiry on user model
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

      await user.save();

      // Prepare reset link
      const resetLink = `http://${req.headers.host}/api/user/reset-password/${token}`;

      // Use your sendVerificationEmail function
      await sendVerificationEmail(user.email, `Please click on the following link, or paste this into your browser to complete the process: ${resetLink}`);

      res.status(200).json({ message: 'An e-mail has been sent to ' + user.email + ' with further instructions.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Unexpected error during the forgot password process' });
    }
  },

  resetPasswordWithToken: async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });

      if (!user) {
        return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
      }

      // Reset the password
      user.setPassword(newPassword, async (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Error resetting password' });
        }

        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

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
    const { patientId, latitude, longitude } = req.body;

    try {
      const patient = await User.findById(patientId);
      if (patient) {
        // If location does not exist, initialize it
        if (!patient.location) {
          patient.location = { type: 'Point', coordinates: [] };
        }

        // Update patient's location coordinates
        patient.location.coordinates = [longitude, latitude];
        await patient.save();

        res.status(200).json({ message: 'Location updated successfully' });
      } else {
        res.status(404).json({ message: 'Patient not found' });
      }
    } catch (error) {
      console.error("Update location error:", error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }

  },


  // GET /api/doctor/find-nearby-providers/:patientId
  getNearbyProvider: async (req, res) => {
    const { userId } = req.params;
    const { role, distance } = req.query; // Expect 'role' to be 'therapist', 'pharmacist', etc.
  
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
  
      const providers = await user.findNearbyProvidersByRole(role, Number(distance));
      res.status(200).json(providers);
    } catch (error) {
      console.error(error);
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
}

  







};

export default userController;
