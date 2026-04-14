// backend/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      error: 'Duplicate entry - this record already exists',
      details: err.detail || 'Unique constraint violation'
    });
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      error: 'Invalid reference - related record not found',
      details: err.detail || 'Foreign key constraint violation'
    });
  }

  if (err.code === '23514') { // PostgreSQL check constraint violation
    return res.status(400).json({
      error: 'Invalid data - constraint violation',
      details: err.detail || 'Check constraint violation'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;