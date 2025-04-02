const jwt = require('jsonwebtoken');

/**
 * Generates a JWT token for authentication.
 * @param {Object} user - The user object containing id, username, and role.
 * @returns {string} JWT token.
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

/**
 * Verifies a JWT token.
 * @param {string} token - The JWT token to verify.
 * @returns {Object} Decoded token payload.
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };