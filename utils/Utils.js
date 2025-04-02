const sanitize = require('sanitize-html');

/**
 * Sanitizes input to prevent malicious data.
 * @param {string} input - The input string to sanitize.
 * @returns {string} Sanitized string.
 */
const sanitizeInput = (input) => {
  return sanitize(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
};

/**
 * Formats a date to ISO string.
 * @param {Date} date - The date to format.
 * @returns {string} ISO formatted date string.
 */
const formatDate = (date) => {
  return date.toISOString();
};

module.exports = { sanitizeInput, formatDate };