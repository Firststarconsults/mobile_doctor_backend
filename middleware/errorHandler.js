// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error response
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500,
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.status = 400;
    error.message = 'Validation Error';
    error.errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.name === 'CastError') {
    error.status = 400;
    error.message = 'Invalid ID format';
  } else if (err.code === 11000) {
    // Duplicate key error
    error.status = 409;
    error.message = 'Duplicate entry';
    const field = Object.keys(err.keyValue)[0];
    error.errors = [{ field, message: `${field} already exists` }];
  } else if (err.name === 'JsonWebTokenError') {
    error.status = 401;
    error.message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    error.status = 401;
    error.message = 'Token expired';
  } else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    error.status = 500;
    error.message = 'Database error';
  }

  // Don't expose stack trace in production
  const response = {
    message: error.message,
    status: error.status,
  };

  if (error.errors) {
    response.errors = error.errors;
  }

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.error = err;
  }

  res.status(error.status).json(response);
};

// Async error wrapper to catch unhandled promise rejections
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for undefined routes
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};
