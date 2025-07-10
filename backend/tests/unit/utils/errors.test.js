const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
  RateLimitError,
  DatabaseError,
  FileProcessingError,
  QueueError,
  ConfigurationError,
  errorHandler,
  formatErrorResponse,
  getStatusCode,
  getUserFriendlyMessage,
  logError,
} = require('../../../src/utils/errors');

describe('Error Utilities', () => {
  describe('AppError', () => {
    it('should create base application error', () => {
      const error = new AppError('Test error', 400);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should capture stack trace correctly', () => {
      const error = new AppError('Stack trace test', 500);
      
      expect(error.stack).toContain('AppError');
      expect(error.stack).toContain('errors.test.js');
    });

    it('should have correct error name', () => {
      const error = new AppError('Named error', 400);
      
      expect(error.name).toBe('AppError');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with details', () => {
      const details = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ];
      
      const error = new ValidationError('Validation failed', details);
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(400);
      expect(error.errors).toEqual(details);
      expect(error.name).toBe('ValidationError');
    });

    it('should handle single validation issue', () => {
      const error = new ValidationError('Invalid input', [
        { field: 'email', message: 'Invalid format' }
      ]);
      
      expect(error.errors).toEqual([
        { field: 'email', message: 'Invalid format' },
      ]);
    });

    it('should work without details', () => {
      const error = new ValidationError('General validation error');
      
      expect(error.errors).toEqual([]);
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should have correct status code', () => {
      const error = new AuthenticationError('Token expired');
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error', () => {
      const error = new AuthorizationError('Insufficient permissions');
      
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('AuthorizationError');
    });

    it('should have correct status code', () => {
      const error = new AuthorizationError('Access denied');
      
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error', () => {
      const error = new NotFoundError('Document not found');
      
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });

    it('should include resource type', () => {
      const error = new NotFoundError('course', 'course-123');
      
      expect(error.resource).toBe('course');
      expect(error.identifier).toBe('course-123');
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error', () => {
      const error = new ConflictError('Email already exists');
      
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.statusCode).toBe(409);
      expect(error.name).toBe('ConflictError');
    });

    it('should include conflict details', () => {
      const error = new ConflictError('Duplicate entry', {
        field: 'email',
        value: 'test@example.com',
      });
      
      expect(error.conflictingResource).toEqual({
        field: 'email',
        value: 'test@example.com',
      });
    });
  });

  describe('ExternalServiceError', () => {
    it('should create external service error', () => {
      const error = new ExternalServiceError('claude');
      
      expect(error).toBeInstanceOf(ExternalServiceError);
      expect(error.statusCode).toBe(502);
      expect(error.service).toBe('claude');
      expect(error.name).toBe('ExternalServiceError');
    });

    it('should include original error', () => {
      const originalError = new Error('Connection timeout');
      const error = new ExternalServiceError('jina', originalError);
      
      expect(error.originalError).toBe(originalError);
      expect(error.message).toContain('jina');
    });

    it('should handle different status codes', () => {
      const error = new ExternalServiceError('openai');
      
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    });
  });

  describe('errorHandler', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        method: 'GET',
        url: '/api/test',
        headers: {},
      };
      
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        headersSent: false,
      };
      
      mockNext = jest.fn();
    });

    it('should handle operational errors', () => {
      const error = new ValidationError('Invalid input');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'Invalid input',
          name: 'ValidationError',
          statusCode: 400,
        }),
      });
    });

    it('should handle non-operational errors', () => {
      const error = new Error('Unexpected error');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'An unexpected error occurred',
          name: 'Error',
          statusCode: 500,
        }),
      });
    });

    it('should handle AppError correctly', () => {
      const error = new AppError('Test error', 400);
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'Test error',
          statusCode: 400,
        }),
      });
    });

    it('should process errors correctly', () => {
      const error = new AppError('Test error', 400);
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Dev error');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            stack: expect.any(String),
          }),
        })
      );
      
      process.env.NODE_ENV = 'test';
    });
  });

  describe('Operational error checking', () => {
    it('should identify operational errors by property', () => {
      const operationalErrors = [
        new AppError('Test', 400),
        new ValidationError('Invalid'),
        new AuthenticationError('Unauthorized'),
        new NotFoundError('Not found'),
      ];
      
      operationalErrors.forEach(error => {
        expect(error.isOperational).toBe(true);
      });
    });

    it('should identify non-operational errors', () => {
      const nonOperationalErrors = [
        new Error('System error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
      ];
      
      nonOperationalErrors.forEach(error => {
        expect(error.isOperational).toBeUndefined();
      });
    });
  });

  describe('Error serialization', () => {
    it('should serialize errors to JSON', () => {
      const error = new ValidationError('Validation failed', [
        { field: 'email', message: 'Invalid' },
      ]);
      
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'ValidationError',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        timestamp: expect.any(String),
        errors: [{ field: 'email', message: 'Invalid' }],
      });
    });

    it('should include all custom properties', () => {
      const error = new ExternalServiceError('test-service');
      
      const json = error.toJSON();
      
      expect(json).toHaveProperty('service', 'test-service');
      expect(json).toHaveProperty('name', 'ExternalServiceError');
      expect(json).toHaveProperty('code', 'EXTERNAL_SERVICE_ERROR');
    });
  });

  describe('Error factory functions', () => {
    it('should create errors from status codes', () => {
      const errorMap = {
        400: ValidationError,
        401: AuthenticationError,
        403: AuthorizationError,
        404: NotFoundError,
        409: ConflictError,
      };
      
      Object.entries(errorMap).forEach(([statusCode, ErrorClass]) => {
        const error = createErrorFromStatus(parseInt(statusCode), 'Test message');
        expect(error).toBeInstanceOf(ErrorClass);
        expect(error.statusCode).toBe(parseInt(statusCode));
      });
    });
  });
});

// Helper function for testing
function createErrorFromStatus(statusCode, message) {
  switch (statusCode) {
    case 400:
      return new ValidationError(message);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError(message);
    case 409:
      return new ConflictError(message);
    default:
      return new AppError(message, statusCode);
  }
}