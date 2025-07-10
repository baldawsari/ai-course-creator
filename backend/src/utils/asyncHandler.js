/**
 * Async Handler Utility
 * Wraps async route handlers to catch errors and pass them to Express error middleware
 */

/**
 * Wraps an async function to catch errors and pass them to Express next()
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    // Execute the async function and catch any errors
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  asyncHandler,
};