const logger = require('./logger');

/**
 * Custom error classes and error handling utilities
 */

/**
 * Base custom error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

/**
 * Validation error - 400
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors
    };
  }
}

/**
 * Authentication error - 401
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error - 403
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not found error - 404
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource', identifier = '') {
    const message = identifier 
      ? `${resource} '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.resource = resource;
    this.identifier = identifier;
  }
}

/**
 * Conflict error - 409
 */
class ConflictError extends AppError {
  constructor(message, conflictingResource = null) {
    super(message, 409, 'CONFLICT');
    this.conflictingResource = conflictingResource;
  }
}

/**
 * Rate limit error - 429
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter = null) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter
    };
  }
}

/**
 * External service error - 502
 */
class ExternalServiceError extends AppError {
  constructor(service, originalError = null) {
    const message = `External service '${service}' error`;
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
    this.originalError = originalError;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      service: this.service,
      originalError: process.env.NODE_ENV === 'development' 
        ? this.originalError?.message || this.originalError 
        : undefined
    };
  }
}

/**
 * Database error - 500
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', operation = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.operation = operation;
  }
}

/**
 * File processing error - 422
 */
class FileProcessingError extends AppError {
  constructor(message, fileName = null, details = null) {
    super(message, 422, 'FILE_PROCESSING_ERROR');
    this.fileName = fileName;
    this.details = details;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      fileName: this.fileName,
      details: this.details
    };
  }
}

/**
 * Queue/Job error - 500
 */
class QueueError extends AppError {
  constructor(message, jobId = null, jobType = null) {
    super(message, 500, 'QUEUE_ERROR');
    this.jobId = jobId;
    this.jobType = jobType;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      jobId: this.jobId,
      jobType: this.jobType
    };
  }
}

/**
 * Configuration error - 500
 */
class ConfigurationError extends AppError {
  constructor(message, missingConfig = null) {
    super(message, 500, 'CONFIGURATION_ERROR');
    this.missingConfig = missingConfig;
  }
}

/**
 * Error formatting utilities
 */

/**
 * Format error for API response
 * @param {Error} error - Error object
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(error) {
  // Handle custom AppError instances
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.toJSON()
    };
  }

  // Handle validation errors from libraries (e.g., Joi)
  if (error.name === 'ValidationError' && error.details) {
    return {
      success: false,
      error: {
        name: 'ValidationError',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        }))
      }
    };
  }

  // Handle Mongoose validation errors
  if (error.name === 'ValidationError' && error.errors) {
    const errors = Object.keys(error.errors).map(field => ({
      field,
      message: error.errors[field].message,
      value: error.errors[field].value
    }));

    return {
      success: false,
      error: {
        name: 'ValidationError',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        errors
      }
    };
  }

  // Handle syntax errors
  if (error instanceof SyntaxError) {
    return {
      success: false,
      error: {
        name: 'SyntaxError',
        message: 'Invalid syntax in request',
        code: 'SYNTAX_ERROR',
        statusCode: 400
      }
    };
  }

  // Handle type errors
  if (error instanceof TypeError) {
    return {
      success: false,
      error: {
        name: 'TypeError',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Type error occurred',
        code: 'TYPE_ERROR',
        statusCode: 400
      }
    };
  }

  // Default error response
  return {
    success: false,
    error: {
      name: error.name || 'Error',
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  };
}

/**
 * Extract HTTP status code from error
 * @param {Error} error - Error object
 * @returns {number} HTTP status code
 */
function getStatusCode(error) {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  if (error.name === 'ValidationError' || error instanceof SyntaxError || error instanceof TypeError) {
    return 400;
  }

  if (error.name === 'UnauthorizedError') {
    return 401;
  }

  if (error.name === 'ForbiddenError') {
    return 403;
  }

  if (error.statusCode && typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  return 500;
}

/**
 * Create user-friendly error message
 * @param {Error} error - Error object
 * @returns {string} User-friendly message
 */
function getUserFriendlyMessage(error) {
  const friendlyMessages = {
    VALIDATION_ERROR: 'Please check your input and try again.',
    AUTHENTICATION_ERROR: 'Please log in to continue.',
    AUTHORIZATION_ERROR: 'You do not have permission to perform this action.',
    NOT_FOUND: 'The requested item could not be found.',
    CONFLICT: 'This action conflicts with existing data.',
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
    EXTERNAL_SERVICE_ERROR: 'An external service is temporarily unavailable.',
    DATABASE_ERROR: 'A database error occurred. Please try again.',
    FILE_PROCESSING_ERROR: 'There was an error processing your file.',
    QUEUE_ERROR: 'Your request is being processed. Please check back later.',
    CONFIGURATION_ERROR: 'The system is not properly configured.',
    INTERNAL_ERROR: 'An unexpected error occurred. Please try again.'
  };

  if (error instanceof AppError) {
    return friendlyMessages[error.code] || error.message;
  }

  return friendlyMessages.INTERNAL_ERROR;
}

/**
 * Log error with appropriate level
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode || getStatusCode(error),
    ...context
  };

  // Determine log level based on error type
  if (error instanceof AppError && error.statusCode < 500) {
    // Client errors (4xx) - info level
    logger.info('Client error:', errorInfo);
  } else if (error instanceof AppError && error.isOperational) {
    // Operational errors - warn level
    logger.warn('Operational error:', errorInfo);
  } else {
    // Programming errors - error level
    logger.error('Server error:', errorInfo);
  }
}

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logError(err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user?.id
  });

  // Get status code and formatted response
  const statusCode = getStatusCode(err);
  const response = formatErrorResponse(err);

  // Add request ID if available
  if (req.id) {
    response.requestId = req.id;
  }

  // Send response
  res.status(statusCode).json(response);
}

/**
 * Wrap error with additional context
 * @param {Error} error - Original error
 * @param {string} message - Additional message
 * @param {Object} context - Additional context
 * @returns {Error} Wrapped error
 */
function wrapError(error, message, context = {}) {
  const wrappedError = new Error(message);
  wrappedError.originalError = error;
  wrappedError.context = context;
  wrappedError.stack = error.stack;
  return wrappedError;
}

/**
 * Check if error is operational (expected)
 * @param {Error} error - Error object
 * @returns {boolean} True if operational
 */
function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  FileProcessingError,
  QueueError,
  ConfigurationError,

  // Utilities
  formatErrorResponse,
  getStatusCode,
  getUserFriendlyMessage,
  logError,
  errorHandler,
  wrapError,
  isOperationalError
};