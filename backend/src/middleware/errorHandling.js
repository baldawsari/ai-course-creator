/**
 * Error Handling Middleware
 * Re-exports asyncHandler from utils for consistency with existing routes
 */

const { asyncHandler } = require('../utils/asyncHandler');

module.exports = {
  asyncHandler
};