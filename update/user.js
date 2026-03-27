//user.js file
import mongoose from "mongoose";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import findOrCreate from 'mongoose-findorcreate';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';



export const generateSessionToken = () => {
  try {
    // Generate a random 32-character hexadecimal string
    const token = crypto.randomBytes(16).toString('hex');
    return token;
  } catch (error) {
    console.error('Error generating session token:', error);
    return null;
  }
};

//geographical location schema
const userLocationSchema = new mongoose.Schema({
  type: {
    type: String,
    default: "Point",
    enum: ["Point"]
  },
  coordinates: {
    type: [Number],
    index: "2dsphere"
  }
});

// Ensure to set the index for the geospatial query to work
userLocationSchema.index({ coordinates: '2dsphere' });

// User schema (patient, doctor, therapist, etc.)
const userSchema = new mongoose.Schema({
  profilePhoto: { type: String, default: null },
  role: { type: String, required: false },
  appropriate: { type: String, default: null },
  username: { type: String, required: true },
  // Add to your userSchema in the user.js file
  isOnline: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  password: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  notifications: [{
    type: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],  
  email: { type: String, required: false },
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  phone: { type: String, required: false },
  address: { type: String, default: null },
  state: { type: String, default: null },
  gender: { type: String, default: null },
  country: { type: String, default: null },
  location: userLocationSchema,
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
  pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', default: null },
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', default: null },
  laboratory: { type: mongoose.Schema.Types.ObjectId, ref: 'Laboratory', default: null },
  walletBalance: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  underInsurrance: { type: Boolean, default: false },
  verificationcode: String,
  googleId: String,
});


// Add method to find nearby providers
userSchema.methods.findNearbyProvidersByRole = async function(role, distance) {
  return await User.find({
    role: role, // Filter by role
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: this.location.coordinates,
        },
        $maxDistance: distance,
      },
    },
  });
};


// methods for password verification and password change
userSchema.methods.setPassword = function (oldPassword, newPassword, callback) {
  this.setPassword(oldPassword, newPassword, callback);
};

userSchema.methods.comparePassword = function (password, callback) {
  this.authenticate(password, callback);
};





userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);


passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id)
    .exec()
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, null);
    });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "https://shielded-beach-02064-bf50e65a75d1.herokuapp.com/api/auth/google/user",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Try to find the user based on their googleId
      let user = await User.findOne({ googleId: profile.id });

      // If the user doesn't exist, create a new user with the profile information
      if (!user) {
        user = new User({
          googleId: profile.id,
          email: profile._json.email, // Using directly from profile JSON
          username: profile._json.email, // Assuming username is the email
          firstName: profile._json.given_name,
          lastName: profile._json.family_name,
          role: 'patient', // default role
          isVerified: true, // default isVerified
          verificationcode: null, //default value
          profilePhoto: profile._json.picture // Optional: saving user's Google profile photo
        });

        await user.save();
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  userSchema.index({ "location.coordinates": "2dsphere" });

export default User






