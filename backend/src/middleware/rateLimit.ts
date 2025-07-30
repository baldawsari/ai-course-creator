import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { Request, Response } from 'express';
import { env } from '@config/environment';

// Create Redis client
const redisClient = createClient({
  socket: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  },
  password: env.REDIS_PASSWORD,
  database: env.REDIS_DB,
});

// Handle Redis connection errors
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis for rate limiting');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

// =============================================
// RATE LIMITER CONFIGURATIONS
// =============================================

/**
 * Default rate limiter for general API endpoints
 */
export const defaultRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: 'rl:default:',
  }),
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful auth attempts
});

/**
 * Rate limiter for file upload endpoints
 */
export const uploadRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: 'rl:upload:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    success: false,
    error: 'Upload limit exceeded',
    message: 'You have exceeded the upload limit. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for AI generation endpoints
 */
export const generationRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: 'rl:generation:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 generation requests per hour
  message: {
    success: false,
    error: 'Generation limit exceeded',
    message: 'You have exceeded the AI generation limit. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id || req.ip || 'anonymous';
  },
  skip: (req: Request) => {
    // Skip rate limiting for admin users
    return req.user?.role === 'admin';
  },
});

/**
 * Dynamic rate limiter based on user role
 */
export const createDynamicRateLimiter = (options: {
  windowMs?: number;
  maxForStudent?: number;
  maxForInstructor?: number;
  maxForAdmin?: number;
  prefix?: string;
}) => {
  const {
    windowMs = 15 * 60 * 1000,
    maxForStudent = 50,
    maxForInstructor = 200,
    maxForAdmin = 1000,
    prefix = 'rl:dynamic:',
  } = options;

  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix,
    }),
    windowMs,
    max: (req: Request) => {
      if (!req.user) return maxForStudent;
      
      switch (req.user.role) {
        case 'admin':
          return maxForAdmin;
        case 'instructor':
          return maxForInstructor;
        case 'student':
        default:
          return maxForStudent;
      }
    },
    keyGenerator: (req: Request) => {
      return req.user?.id || req.ip || 'anonymous';
    },
    handler: (req: Request, res: Response) => {
      const userRole = req.user?.role || 'anonymous';
      const limit = userRole === 'admin' ? maxForAdmin :
                   userRole === 'instructor' ? maxForInstructor :
                   maxForStudent;
      
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `You have exceeded the rate limit for ${userRole} users.`,
        limit,
        windowMs,
        retryAfter: new Date(Date.now() + windowMs).toISOString(),
      });
    },
  });
};

/**
 * IP-based rate limiter (fallback for unauthenticated requests)
 */
export const ipRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: 'rl:ip:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  message: {
    success: false,
    error: 'Too many requests from this IP',
    message: 'Too many requests from your IP address. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'anonymous',
});

/**
 * Create a custom rate limiter
 */
export const createCustomRateLimiter = (
  name: string,
  windowMs: number,
  max: number,
  message?: string
) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: `rl:${name}:`,
    }),
    windowMs,
    max,
    message: {
      success: false,
      error: 'Rate limit exceeded',
      message: message || `You have exceeded the ${name} rate limit.`,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Cleanup expired rate limit records
 */
export const cleanupRateLimitRecords = async (): Promise<number> => {
  try {
    const keys = await redisClient.keys('rl:*');
    let deletedCount = 0;

    for (const key of keys) {
      const ttl = await redisClient.ttl(key);
      if (ttl === -1) {
        // Key exists but has no expiration
        await redisClient.del(key);
        deletedCount++;
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up rate limit records:', error);
    return 0;
  }
};

/**
 * Get rate limit status for a user/IP
 */
export const getRateLimitStatus = async (
  identifier: string,
  prefix: string = 'rl:default:'
): Promise<{
  remaining: number;
  reset: Date;
  total: number;
} | null> => {
  try {
    const key = `${prefix}${identifier}`;
    const count = await redisClient.get(key);
    const ttl = await redisClient.ttl(key);

    if (!count) {
      return null;
    }

    const max = env.RATE_LIMIT_MAX_REQUESTS;
    const used = parseInt(count, 10);
    const remaining = Math.max(0, max - used);
    const reset = new Date(Date.now() + (ttl * 1000));

    return {
      remaining,
      reset,
      total: max,
    };
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    return null;
  }
};

// Export default rate limiter
export default defaultRateLimiter;