import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from '../config/database';
import { env } from '../config/environment';

// Custom error interface
interface CustomError {
  status: number;
}
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

// =============================================
// TYPES AND INTERFACES
// =============================================

export type UserRole = 'admin' | 'instructor' | 'student';

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  aud: string;
  exp: number;
  iat: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  metadata?: Record<string, any>;
}

export interface ApiKeyData {
  id: string;
  name: string;
  permissions: string[];
  rateLimit?: number;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      apiKey?: ApiKeyData;
      token?: string;
    }
  }
}

// =============================================
// ERROR CLASSES
// =============================================

export class AuthenticationError extends Error implements CustomError {
  status = 401;
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements CustomError {
  status = 403;
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class TokenExpiredError extends Error implements CustomError {
  status = 401;
  constructor(message: string = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends Error implements CustomError {
  status = 401;
  constructor(message: string = 'Invalid token provided') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

// =============================================
// TOKEN UTILITIES
// =============================================

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;

  // Check for Bearer token
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check for API key
  if (authHeader.startsWith('ApiKey ')) {
    return authHeader.substring(7);
  }

  return null;
};

/**
 * Verify JWT token with Supabase
 */
export const verifyJWT = async (token: string): Promise<JWTPayload> => {
  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw new InvalidTokenError('Token verification failed');
    }

    // Get user metadata including role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, metadata')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError);
    }

    // Decode JWT to get additional info
    const decoded = jwt.decode(token) as JWTPayload;

    if (!decoded) {
      throw new InvalidTokenError('Invalid token format');
    }

    // Check token expiration
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      throw new TokenExpiredError();
    }

    return {
      ...decoded,
      sub: user.id,
      email: user.email || '',
      role: profile?.role || 'student',
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new InvalidTokenError('Token verification failed');
  }
};

/**
 * Verify API key
 */
export const verifyApiKey = async (apiKey: string): Promise<ApiKeyData> => {
  try {
    // Check API key in database
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('key_hash', hashApiKey(apiKey))
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new InvalidTokenError('Invalid API key');
    }

    // Update last used timestamp
    await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    return {
      id: data.id,
      name: data.name,
      permissions: data.permissions || [],
      rateLimit: data.rate_limit,
    };
  } catch (error) {
    throw new InvalidTokenError('Invalid API key');
  }
};

/**
 * Hash API key for secure storage
 */
const hashApiKey = (apiKey: string): string => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

// =============================================
// MIDDLEWARE FUNCTIONS
// =============================================

/**
 * Authenticate user from JWT or API key
 */
export const authenticateUser = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return next();
    }

    // Store token for later use
    req.token = token;

    // Check if it's an API key
    if (authHeader?.startsWith('ApiKey ')) {
      const apiKeyData = await verifyApiKey(token);
      req.apiKey = apiKeyData;
      return next();
    }

    // Otherwise, verify JWT
    const payload = await verifyJWT(token);
    
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    // Don't fail here, just continue without auth
    // Let requireAuth handle mandatory authentication
    next();
  }
};

/**
 * Require authentication
 */
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user && !req.apiKey) {
    throw new AuthenticationError('Authentication required');
  }

  next();
};

/**
 * Require specific role(s)
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError(
        `Access denied. Required role: ${roles.join(' or ')}`
      );
    }

    next();
  };
};

/**
 * Check specific permission
 */
export const requirePermission = (permission: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Check user permissions
    if (req.user) {
      // Admin has all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      // Check role-based permissions
      const rolePermissions: Record<UserRole, string[]> = {
        admin: ['*'],
        instructor: [
          'courses.create',
          'courses.update',
          'courses.delete',
          'courses.read',
          'resources.upload',
          'resources.delete',
          'generation.start',
        ],
        student: ['courses.read', 'resources.read'],
      };

      const userPermissions = rolePermissions[req.user.role] || [];
      
      if (userPermissions.includes('*') || userPermissions.includes(permission)) {
        return next();
      }
    }

    // Check API key permissions
    if (req.apiKey && req.apiKey.permissions.includes(permission)) {
      return next();
    }

    throw new AuthorizationError(`Missing required permission: ${permission}`);
  };
};

// =============================================
// RATE LIMITING
// =============================================

// Redis client for rate limiting
const redisClient = createClient({
  socket: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  },
  password: env.REDIS_PASSWORD,
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

// Connect to Redis
(async () => {
  await redisClient.connect();
})();

/**
 * User-specific rate limiting
 */
export const rateLimitByUser = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
}) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: 'rl:user:',
    }),
    windowMs: options?.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options?.max || 100,
    message: options?.message || 'Too many requests from this user',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.id || req.ip;
    },
    skip: (req: Request) => {
      // Skip rate limiting for admin users
      return req.user?.role === 'admin';
    },
    handler: (req: Request, res: Response) => {
      const resetTime = new Date(Date.now() + (options?.windowMs || 15 * 60 * 1000));
      
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: options?.message || 'Too many requests from this user',
        retryAfter: resetTime.toISOString(),
        limit: options?.max || 100,
      });
    },
  });
};

/**
 * API key specific rate limiting
 */
export const rateLimitByApiKey = () => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: 'rl:apikey:',
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: (req: Request) => {
      // Use custom rate limit from API key or default
      return req.apiKey?.rateLimit || 1000;
    },
    keyGenerator: (req: Request) => {
      return req.apiKey?.id || 'anonymous';
    },
    skip: (req: Request) => {
      // Only apply to API key authenticated requests
      return !req.apiKey;
    },
  });
};

// =============================================
// SESSION MANAGEMENT HELPERS
// =============================================

/**
 * Refresh user session
 */
export const refreshSession = async (
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new TokenExpiredError('Failed to refresh session');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  } catch (error) {
    throw new TokenExpiredError('Failed to refresh session');
  }
};

/**
 * Validate user permissions for a resource
 */
export const checkResourceOwnership = async (
  userId: string,
  resourceType: 'course' | 'resource' | 'session',
  resourceId: string
): Promise<boolean> => {
  try {
    let query;

    switch (resourceType) {
      case 'course':
        query = supabaseAdmin
          .from('courses')
          .select('id')
          .eq('id', resourceId)
          .eq('user_id', userId)
          .single();
        break;

      case 'resource':
        query = supabaseAdmin
          .from('course_resources')
          .select('id')
          .eq('id', resourceId)
          .eq('course_id.user_id', userId)
          .single();
        break;

      case 'session':
        query = supabaseAdmin
          .from('course_sessions')
          .select('id')
          .eq('id', resourceId)
          .eq('course_id.user_id', userId)
          .single();
        break;

      default:
        return false;
    }

    const { data, error } = await query;
    return !error && !!data;
  } catch (error) {
    console.error('Error checking resource ownership:', error);
    return false;
  }
};

/**
 * Middleware to check resource ownership
 */
export const requireResourceOwnership = (
  resourceType: 'course' | 'resource' | 'session',
  paramName: string = 'id'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const resourceId = req.params[paramName];
    
    if (!resourceId) {
      throw new Error('Resource ID not found in request parameters');
    }

    const isOwner = await checkResourceOwnership(req.user.id, resourceType, resourceId);

    if (!isOwner && req.user.role !== 'admin') {
      throw new AuthorizationError('You do not have access to this resource');
    }

    next();
  };
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Generate API key
 */
export const generateApiKey = (): string => {
  const crypto = require('crypto');
  return `sk_${crypto.randomBytes(32).toString('hex')}`;
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<AuthenticatedUser | null> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      role: data.role,
      metadata: data.metadata,
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

// Export middleware as named exports
export const auth = authenticateUser;