const rateLimit = require('express-rate-limit');

/**
 * Applies rate limiting to API endpoints.
 * @returns {Function} Express middleware.
 */
const employeeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

module.exports = employeeLimiter;