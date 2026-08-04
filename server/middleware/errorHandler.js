/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
  }

  // Multer file count error
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Too many files uploaded.' });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Validation failed', errors: messages });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ message: `Duplicate value for ${field}. Already exists.` });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token.' });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
