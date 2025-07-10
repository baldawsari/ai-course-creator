const { getSecurityConfig, IS_PRODUCTION, IS_DEVELOPMENT } = require('./index');

class SecurityConfig {
  constructor() {
    this.config = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    this.config = getSecurityConfig();
    this.validateConfig();
    this.initialized = true;
    
    console.log('Security configuration initialized');
  }

  validateConfig() {
    if (!this.config || typeof this.config !== 'object') {
      throw new Error('Security configuration is invalid');
    }

    this.validateJWTConfig();
    this.validateCORSConfig();
    this.validateRateLimitConfig();
    this.validateHelmetConfig();
  }

  validateJWTConfig() {
    const { jwt } = this.config;
    
    if (!jwt || typeof jwt !== 'object') {
      throw new Error('JWT configuration is invalid');
    }

    if (!jwt.secret || typeof jwt.secret !== 'string' || jwt.secret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters long');
    }

    if (!jwt.expiresIn || typeof jwt.expiresIn !== 'string') {
      throw new Error('JWT expires in must be a valid time string');
    }
  }

  validateCORSConfig() {
    const { cors } = this.config;
    
    if (!cors || typeof cors !== 'object') {
      throw new Error('CORS configuration is invalid');
    }

    if (!cors.origin || typeof cors.origin !== 'string') {
      throw new Error('CORS origin must be a non-empty string');
    }

    if (!cors.methods || typeof cors.methods !== 'string') {
      throw new Error('CORS methods must be a non-empty string');
    }
  }

  validateRateLimitConfig() {
    const { rateLimit } = this.config;
    
    if (!rateLimit || typeof rateLimit !== 'object') {
      throw new Error('Rate limit configuration is invalid');
    }

    if (!rateLimit.windowMs || typeof rateLimit.windowMs !== 'number' || rateLimit.windowMs <= 0) {
      throw new Error('Rate limit window must be a positive number');
    }

    if (!rateLimit.max || typeof rateLimit.max !== 'number' || rateLimit.max <= 0) {
      throw new Error('Rate limit max must be a positive number');
    }
  }

  validateHelmetConfig() {
    const { helmet } = this.config;
    
    if (!helmet || typeof helmet !== 'object') {
      throw new Error('Helmet configuration is invalid');
    }

    if (typeof helmet.enabled !== 'boolean') {
      throw new Error('Helmet enabled must be a boolean');
    }
  }

  getJWTConfig() {
    return {
      ...this.config.jwt,
      algorithms: ['HS256'],
      issuer: 'ai-course-creator',
      audience: 'ai-course-creator-users',
      options: {
        expiresIn: this.config.jwt.expiresIn,
        issuer: 'ai-course-creator',
        audience: 'ai-course-creator-users',
        algorithm: 'HS256',
      },
      verify: {
        algorithms: ['HS256'],
        issuer: 'ai-course-creator',
        audience: 'ai-course-creator-users',
      },
    };
  }

  getCORSConfig() {
    const origins = this.config.cors.origin === '*' ? true : this.config.cors.origin.split(',').map(o => o.trim());
    
    return {
      origin: origins,
      methods: this.config.cors.methods.split(',').map(m => m.trim()),
      credentials: this.config.cors.credentials,
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Request-ID',
      ],
      exposedHeaders: [
        'X-Request-ID',
        'X-Rate-Limit-Limit',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset',
      ],
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 204,
    };
  }

  getRateLimitConfig() {
    return {
      ...this.config.rateLimit,
      skip: (req) => {
        // Skip rate limiting for health checks
        if (req.path === '/health' || req.path === '/status') {
          return true;
        }
        
        // Skip for localhost in development
        if (IS_DEVELOPMENT && (req.ip === '127.0.0.1' || req.ip === '::1')) {
          return true;
        }
        
        return false;
      },
      keyGenerator: (req) => {
        // Use API key if present, otherwise use IP
        return req.headers['x-api-key'] || req.ip;
      },
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too Many Requests',
          message: this.config.rateLimit.message,
          retryAfter: Math.ceil(this.config.rateLimit.windowMs / 1000),
        });
      },
    };
  }

  getHelmetConfig() {
    if (!this.config.helmet.enabled) {
      return false;
    }

    return {
      contentSecurityPolicy: IS_PRODUCTION ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          childSrc: ["'self'"],
          frameSrc: ["'none'"],
          workerSrc: ["'self'"],
          manifestSrc: ["'self'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      } : false,
      crossOriginEmbedderPolicy: IS_PRODUCTION,
      crossOriginOpenerPolicy: IS_PRODUCTION,
      crossOriginResourcePolicy: IS_PRODUCTION ? { policy: "cross-origin" } : false,
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: IS_PRODUCTION ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      } : false,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: "no-referrer-when-downgrade" },
      xssFilter: true,
    };
  }

  getAPIKeyConfig() {
    return {
      header: 'x-api-key',
      prefix: 'acc_',
      length: 32,
      validation: {
        required: false,
        format: /^acc_[a-zA-Z0-9]{32}$/,
      },
      scopes: {
        'read': ['GET'],
        'write': ['POST', 'PUT', 'PATCH'],
        'delete': ['DELETE'],
        'admin': ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000,
        message: 'API key rate limit exceeded',
      },
    };
  }

  getAuthConfig() {
    return {
      supabase: {
        enabled: true,
        required: true,
        header: 'authorization',
        prefix: 'Bearer ',
      },
      jwt: this.getJWTConfig(),
      apiKey: this.getAPIKeyConfig(),
      session: {
        enabled: false,
        name: 'ai-course-creator-session',
        secret: this.config.jwt.secret,
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: IS_PRODUCTION,
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          sameSite: 'strict',
        },
      },
    };
  }

  getPasswordConfig() {
    return {
      bcrypt: {
        saltRounds: 12,
      },
      validation: {
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        allowedSpecialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      },
      strength: {
        minScore: 3,
        policies: ['length', 'lowercase', 'uppercase', 'numbers', 'symbols'],
      },
    };
  }

  getEncryptionConfig() {
    return {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      tagLength: 16,
      encoding: 'hex',
      secret: this.config.jwt.secret,
    };
  }

  getConfig() {
    return {
      initialized: this.initialized,
      jwt: this.getJWTConfig(),
      cors: this.getCORSConfig(),
      rateLimit: this.getRateLimitConfig(),
      helmet: this.getHelmetConfig(),
      auth: this.getAuthConfig(),
      password: this.getPasswordConfig(),
      encryption: this.getEncryptionConfig(),
    };
  }
}

const securityConfig = new SecurityConfig();

module.exports = {
  securityConfig,
  initialize: () => securityConfig.initialize(),
  getJWTConfig: () => securityConfig.getJWTConfig(),
  getCORSConfig: () => securityConfig.getCORSConfig(),
  getRateLimitConfig: () => securityConfig.getRateLimitConfig(),
  getHelmetConfig: () => securityConfig.getHelmetConfig(),
  getAPIKeyConfig: () => securityConfig.getAPIKeyConfig(),
  getAuthConfig: () => securityConfig.getAuthConfig(),
  getPasswordConfig: () => securityConfig.getPasswordConfig(),
  getEncryptionConfig: () => securityConfig.getEncryptionConfig(),
  getConfig: () => securityConfig.getConfig(),
};