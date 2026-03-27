import passport from "passport";

// Middleware to ensure user is authenticated
export const ensureAuthenticated = (req, res, next) => {
  passport.authenticate("session", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ message: "Unauthorized - Please log in" });
    }
    req.user = user;
    return next();
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
