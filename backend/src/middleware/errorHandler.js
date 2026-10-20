// ============================================================================
// Centralized Error Handling Middleware
// ============================================================================

export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    code: err.code || 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};

