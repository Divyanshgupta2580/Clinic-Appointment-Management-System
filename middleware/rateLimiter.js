const rateLimit = require('express-rate-limit');

/**
 * Basic rate limiter for authentication routes (login/register)
 * Limits brute-force attacks while remaining generous for hackathon testing
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again in 15 minutes.',
  },
  handler: (req, res, next, options) => {
    const isApi = req.originalUrl.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json');
    if (isApi) {
      return res.status(429).json(options.message);
    }
    if (req.session) {
      req.session.flash = req.session.flash || {};
      req.session.flash.error = [options.message.message];
    }
    return res.status(429).redirect(req.originalUrl.split('?')[0]);
  },
});

module.exports = { authLimiter };
