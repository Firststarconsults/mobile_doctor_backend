import crypto from 'crypto';

// Generate CSRF token
export const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// CSRF protection middleware
export const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Check for CSRF token in headers or body
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      message: 'CSRF token validation failed',
      error: 'Invalid or missing CSRF token'
    });
  }

  next();
};

// Middleware to set CSRF token in session and response
export const setCSRFToken = (req, res, next) => {
  // Generate new token if not exists
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCSRFToken();
  }

  // Set token in response header for easy access
  res.setHeader('X-CSRF-Token', req.session.csrfToken);
  
  // Also include in response data for API endpoints
  res.locals.csrfToken = req.session.csrfToken;
  
  next();
};

// Middleware to refresh CSRF token
export const refreshCSRFToken = (req, res, next) => {
  req.session.csrfToken = generateCSRFToken();
  res.setHeader('X-CSRF-Token', req.session.csrfToken);
  res.locals.csrfToken = req.session.csrfToken;
  next();
};
