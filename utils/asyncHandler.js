/**
 * Wraps an async route handler to forward unhandled rejections to Express error middleware.
 * @param {Function} fn - Async express handler function
 * @returns {Function} Express route middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
