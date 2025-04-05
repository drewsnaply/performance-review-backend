const rateLimit = require('express-rate-limit');

/**
 * Applies rate limiting to API endpoints with environment-specific configurations.
 * More lenient in development, stricter in production.
 * @returns {Function} Express middleware.
 */
const employeeLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 5 * 60 * 1000 : 15 * 60 * 1000, // 5 minutes in dev, 15 in prod
  max: process.env.NODE_ENV === 'development' ? 200 : 100, // More requests allowed in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for local development if needed
  skip: (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    return process.env.NODE_ENV === 'development' && 
           (clientIP === '127.0.0.1' || clientIP === '::1');
  }
});

module.exports = employeeLimiter;