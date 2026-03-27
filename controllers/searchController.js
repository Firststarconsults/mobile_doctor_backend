//Search controller
import { Doctor } from "../models/healthProviders.js";
import User from "../models/user.js";


const SearchControllers = {

  getVerifiedDoctors: async (req, res) => {
    try {
      const verifiedDoctors = await Doctor.aggregate([
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
        }
      ]);
  
      if (verifiedDoctors.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No approved doctors found',
        });
      }
  
      res.status(200).json({
        success: true,
        message: 'Approved doctors retrieved successfully',
        verifiedDoctors,
      });
    } catch (error) {
      console.error('Error retrieving approved doctors:', error); // For better error tracking
      res.status(500).json({ success: false, error: 'Error retrieving approved doctors', details: error });
    }
  },

  


 // Endpoint to get all users with their roles
 getAllRoles: async (req, res) => {
    try {
      const users = await User.find({}, 'firstName lastName role');
      return res.status(200).json({ users });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Endpoint to get appropriate information based on a specific role
  getAppropriateByRole: async (req, res) => {
    try {
      const role = req.params.role;
      const users = await User.find({ role }, 'appropriate firstName lastName');
      return res.status(200).json({ users });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  searchDoctorsBySpecialty: async (req, res) => {
    try {
      const { specialty } = req.query; 
  
     
      const doctorsBySpecialty = await Doctor.find({
        medicalSpecialty: { $elemMatch: { name: { $regex: new RegExp(specialty, 'i') } } },
        kycVerification: true, 
      });
  
      if (!doctorsBySpecialty.length) {
        return res.status(404).json({
          success: false,
          message: `No verified doctors found for the specialty ${specialty}`,
        });
      }
  
      res.status(200).json({
        success: true,
        message: `Verified doctors for the specialty ${specialty} retrieved successfully`,
        doctorsBySpecialty,
      });
    } catch (error) {
      console.error(`Error retrieving doctors for the specialty ${specialty}:`, error);
      res.status(500).json({ success: false, error: `Error retrieving doctors for the specialty ${specialty}` });
    }
  },
};

export default SearchControllers;
