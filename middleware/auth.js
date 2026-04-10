import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

// Middleware to ensure user is authenticated (supports both session and JWT)
export const ensureAuthenticated = async (req, res, next) => {
  try {
    // First, try JWT authentication (newer method)
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7); // Remove "Bearer " prefix

      if (token) {
        try {
          // Verify JWT token
          const decoded = jwt.verify(token, process.env.JWT_SECRET);

          // Find user from token
          const userFromToken = await User.findById(decoded.userId);

          if (userFromToken) {
            // Attach user to request
            req.user = userFromToken;
            return next();
          }
        } catch (jwtError) {
          console.error("JWT verification failed:", jwtError.message);
          // Continue to try session auth if JWT fails
        }
      }
    }

    // If JWT failed or not provided, try session authentication (legacy method)
    passport.authenticate("session", (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (user) {
        req.user = user;
        return next();
      }

      // Neither JWT nor session auth succeeded
      return res.status(401).json({ message: "Unauthorized - Please log in" });
    })(req, res, next);

  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(401).json({ message: "Unauthorized - Authentication error" });
  }
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
