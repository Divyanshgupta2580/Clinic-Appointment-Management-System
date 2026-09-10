/**
 * Centralized 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const isApi = req.originalUrl.startsWith('/api/');
  if (isApi || req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(404).json({
      success: false,
      message: `Resource not found: ${req.method} ${req.originalUrl}`,
    });
  }

  res.status(404).render('errors/404', {
    title: '404 - Page Not Found',
    path: req.originalUrl,
  });
};

/**
 * Centralized Application Error handler
 */
const errorHandler = (err, req, res, next) => {
  // Log server-side technical details safely
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }

  const isApi = req.originalUrl.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json');
  let statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = err.message || 'An unexpected error occurred. Please try again later.';

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field: ${err.path}`;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(', ');
  }

  // Handle duplicate key error if not caught by controller
  if (err.code === 11000) {
    statusCode = 409;
    message = 'A record with this information already exists.';
  }

  if (isApi) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
  }

  const templateMap = {
    403: 'errors/403',
    404: 'errors/404',
  };

  const view = templateMap[statusCode] || 'errors/500';

  res.status(statusCode).render(view, {
    title: `${statusCode} - ${statusCode === 403 ? 'Access Denied' : statusCode === 404 ? 'Not Found' : 'Error'}`,
    message,
    statusCode,
  });
};

module.exports = { notFoundHandler, errorHandler };
