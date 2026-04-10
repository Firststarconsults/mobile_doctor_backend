import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

// Middleware to ensure user is authenticated (supports both session and JWT)
export const ensureAuthenticated = async (req, res, next) => {
  // First, try session authentication
  passport.authenticate("session", async (err, user, info) => {
    if (err) {
      return next(err);
    }

    // If session auth succeeded, use that
    if (user) {
      req.user = user;
      return next();
    }

    // If session auth failed, try JWT authentication
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized - Please log in" });
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      if (!token) {
        return res.status(401).json({ message: "Unauthorized - No token provided" });
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user from token
      const userFromToken = await User.findById(decoded.userId);

      if (!userFromToken) {
        return res.status(401).json({ message: "Unauthorized - User not found" });
      }

      // Attach user to request
      req.user = userFromToken;
      return next();
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError.message);
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
  })(req, res, next);
};

// Middleware to ensure user has specific role
export const ensureRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Forbidden - Insufficient permissions" 
      });
    }
    
    next();
  };
};

// Middleware to ensure user can only access their own resources
export const ensureOwner = (req, res, next) => {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const requestedUserId = req.params.userId;
  const currentUserId = req.user._id.toString();
  
  if (requestedUserId !== currentUserId && req.user.role !== "admin") {
    return res.status(403).json({ 
      message: "Forbidden - You can only access your own resources" 
    });
  }
  
  next();
};

// Middleware for admin-only routes
export const ensureAdmin = ensureRole(["admin"]);

// Middleware for health providers (doctors, pharmacies, etc.)
export const ensureHealthProvider = ensureRole(["doctor", "pharmacy", "therapist", "laboratory"]);

// Middleware for patients only
export const ensurePatient = ensureRole(["patient"]);
