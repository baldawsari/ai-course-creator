/**
 * Error Handling Middleware
 * Re-exports asyncHandler from utils for consistency with existing routes
 * and errorHandler middleware from errors module
 */

const { asyncHandler } = require('../utils/asyncHandler');
const { errorHandler } = require('../utils/errors');

module.exports = {
  asyncHandler,
  errorHandler
};