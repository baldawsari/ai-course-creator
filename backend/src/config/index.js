const path = require('path');
const Joi = require('joi');

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_DEVELOPMENT = NODE_ENV === 'development';
const IS_TEST = NODE_ENV === 'test';

const configSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  
  // Server Configuration
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  HOST: Joi.string().hostname().default('localhost'),
  
  // Database Configuration
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_KEY: Joi.string().required(),
  
  // AI Service Configuration
  ANTHROPIC_API_KEY: Joi.string().required(),
  JINA_API_KEY: Joi.string().required(),
  
  // Vector Database Configuration
  QDRANT_URL: Joi.string().uri().required(),
  QDRANT_API_KEY: Joi.string().optional(),
  
  // Authentication Configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  
  // Redis Configuration
  REDIS_HOST: Joi.string().hostname().default('localhost'),
  REDIS_PORT: Joi.number().integer().min(1).max(65535).default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().integer().min(0).max(15).default(0),
  
  // File Processing Configuration
  MAX_FILE_SIZE: Joi.number().integer().min(1024).default(50 * 1024 * 1024), // 50MB
  UPLOAD_DIR: Joi.string().default('./temp-uploads'),
  
  // Document Processing Configuration
  MAX_CHUNK_SIZE: Joi.number().integer().min(100).max(5000).default(1000),
  MIN_CHUNK_SIZE: Joi.number().integer().min(50).max(500).default(100),
  OVERLAP_SIZE: Joi.number().integer().min(0).max(200).default(50),
  QUALITY_MINIMUM: Joi.number().integer().min(0).max(100).default(50),
  QUALITY_RECOMMENDED: Joi.number().integer().min(0).max(100).default(70),
  QUALITY_PREMIUM: Joi.number().integer().min(0).max(100).default(85),
  
  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().min(1).default(100),
  
  // Logging Configuration
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'combined', 'dev').default('combined'),
  LOG_DIR: Joi.string().default('./logs'),
  
  // Performance Configuration
  ENABLE_COMPRESSION: Joi.boolean().default(true),
  ENABLE_HELMET: Joi.boolean().default(true),
  ENABLE_MORGAN: Joi.boolean().default(true),
  
  // Queue Configuration
  QUEUE_CONCURRENCY: Joi.number().integer().min(1).max(10).default(3),
  QUEUE_MAX_ATTEMPTS: Joi.number().integer().min(1).max(10).default(3),
  QUEUE_BACKOFF_DELAY: Joi.number().integer().min(1000).default(5000),
  
  // Cache Configuration
  CACHE_TTL: Joi.number().integer().min(60).default(300), // 5 minutes
  CACHE_MAX_SIZE: Joi.number().integer().min(10).default(1000),
  
  // CORS Configuration
  CORS_ORIGIN: Joi.string().default('*'),
  CORS_METHODS: Joi.string().default('GET,HEAD,PUT,PATCH,POST,DELETE'),
  CORS_CREDENTIALS: Joi.boolean().default(true),
  
  // Monitoring Configuration
  ENABLE_METRICS: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().integer().min(1).max(65535).default(9090),
  ENABLE_ERROR_TRACKING: Joi.boolean().default(true),
  
  // Development Configuration
  ENABLE_DEV_LOGGING: Joi.boolean().default(IS_DEVELOPMENT),
  ENABLE_DEBUG_ROUTES: Joi.boolean().default(IS_DEVELOPMENT),
}).unknown();

function validateConfig() {
  const { error, value } = configSchema.validate(process.env);
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join(', ');
    throw new Error(`Configuration validation failed: ${errorMessages}`);
  }
  
  return value;
}

function getEnvironmentSpecificConfig() {
  const baseConfig = validateConfig();
  
  const environmentConfigs = {
    development: {
      LOG_LEVEL: 'debug',
      ENABLE_DEV_LOGGING: true,
      ENABLE_DEBUG_ROUTES: true,
      CORS_ORIGIN: '*',
      RATE_LIMIT_MAX_REQUESTS: 1000,
    },
    production: {
      LOG_LEVEL: 'info',
      ENABLE_DEV_LOGGING: false,
      ENABLE_DEBUG_ROUTES: false,
      CORS_ORIGIN: process.env.FRONTEND_URL || 'https://your-frontend-domain.com',
      RATE_LIMIT_MAX_REQUESTS: 100,
      ENABLE_COMPRESSION: true,
      ENABLE_HELMET: true,
    },
    test: {
      LOG_LEVEL: 'warn',
      ENABLE_DEV_LOGGING: false,
      ENABLE_DEBUG_ROUTES: false,
      ENABLE_METRICS: false,
      RATE_LIMIT_MAX_REQUESTS: 10000,
      CACHE_TTL: 10,
    }
  };
  
  return {
    ...baseConfig,
    ...environmentConfigs[NODE_ENV],
  };
}

function getDatabaseConfig() {
  const config = getEnvironmentSpecificConfig();
  return {
    supabase: {
      url: config.SUPABASE_URL,
      anonKey: config.SUPABASE_ANON_KEY,
      serviceKey: config.SUPABASE_SERVICE_KEY,
    },
    redis: {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD,
      db: config.REDIS_DB,
    },
    qdrant: {
      url: config.QDRANT_URL,
      apiKey: config.QDRANT_API_KEY,
    }
  };
}

function getSecurityConfig() {
  const config = getEnvironmentSpecificConfig();
  return {
    jwt: {
      secret: config.JWT_SECRET,
      expiresIn: config.JWT_EXPIRES_IN,
    },
    cors: {
      origin: config.CORS_ORIGIN,
      methods: config.CORS_METHODS,
      credentials: config.CORS_CREDENTIALS,
    },
    rateLimit: {
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    },
    helmet: {
      enabled: config.ENABLE_HELMET,
      contentSecurityPolicy: IS_PRODUCTION ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      } : false,
    }
  };
}

function getServiceConfig() {
  const config = getEnvironmentSpecificConfig();
  return {
    upload: {
      maxFileSize: config.MAX_FILE_SIZE,
      uploadDir: config.UPLOAD_DIR,
      allowedMimeTypes: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
      ],
    },
    processing: {
      maxChunkSize: config.MAX_CHUNK_SIZE,
      minChunkSize: config.MIN_CHUNK_SIZE,
      overlapSize: config.OVERLAP_SIZE,
      qualityMinimum: config.QUALITY_MINIMUM,
      qualityRecommended: config.QUALITY_RECOMMENDED,
      qualityPremium: config.QUALITY_PREMIUM,
    },
    queue: {
      concurrency: config.QUEUE_CONCURRENCY,
      maxAttempts: config.QUEUE_MAX_ATTEMPTS,
      backoffDelay: config.QUEUE_BACKOFF_DELAY,
    },
    cache: {
      ttl: config.CACHE_TTL,
      maxSize: config.CACHE_MAX_SIZE,
    }
  };
}

function getMonitoringConfig() {
  const config = getEnvironmentSpecificConfig();
  return {
    logging: {
      level: config.LOG_LEVEL,
      format: config.LOG_FORMAT,
      dir: config.LOG_DIR,
      enableDevLogging: config.ENABLE_DEV_LOGGING,
      enableMorgan: config.ENABLE_MORGAN,
    },
    metrics: {
      enabled: config.ENABLE_METRICS,
      port: config.METRICS_PORT,
    },
    errorTracking: {
      enabled: config.ENABLE_ERROR_TRACKING,
    },
    performance: {
      enableCompression: config.ENABLE_COMPRESSION,
    }
  };
}

function getConfig() {
  const config = getEnvironmentSpecificConfig();
  
  return {
    env: NODE_ENV,
    isProduction: IS_PRODUCTION,
    isDevelopment: IS_DEVELOPMENT,
    isTest: IS_TEST,
    
    server: {
      port: config.PORT,
      host: config.HOST,
    },
    
    database: getDatabaseConfig(),
    security: getSecurityConfig(),
    services: getServiceConfig(),
    monitoring: getMonitoringConfig(),
    
    // Raw config for backward compatibility
    raw: config,
  };
}

function validateEnvironment() {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'ANTHROPIC_API_KEY',
    'JINA_API_KEY',
    'QDRANT_URL',
    'JWT_SECRET',
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
}

function initializeConfig() {
  try {
    validateEnvironment();
    const config = getConfig();
    
    console.log(`Configuration initialized for environment: ${NODE_ENV}`);
    console.log(`Server will run on: ${config.server.host}:${config.server.port}`);
    console.log(`Database: ${config.database.supabase.url}`);
    console.log(`Vector DB: ${config.database.qdrant.url}`);
    console.log(`Redis: ${config.database.redis.host}:${config.database.redis.port}`);
    
    return config;
  } catch (error) {
    console.error('Configuration initialization failed:', error.message);
    process.exit(1);
  }
}

module.exports = {
  getConfig,
  getDatabaseConfig,
  getSecurityConfig,
  getServiceConfig,
  getMonitoringConfig,
  validateEnvironment,
  initializeConfig,
  NODE_ENV,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  IS_TEST,
};