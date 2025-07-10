import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface Environment {
  // Server Configuration
  NODE_ENV: string;
  PORT: number;
  FRONTEND_URL: string;

  // Database Configuration (Supabase)
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;

  // AI Services
  ANTHROPIC_API_KEY: string;
  JINA_API_KEY: string;

  // Vector Database (Qdrant)
  QDRANT_URL: string;
  QDRANT_API_KEY: string;
  QDRANT_COLLECTION_NAME: string;
  QDRANT_TIMEOUT: string;
  QDRANT_MAX_RETRIES: string;
  QDRANT_BASE_DELAY: string;
  QDRANT_ENABLE_GRPC: string;
  QDRANT_GRPC_PORT: string;
  QDRANT_VECTOR_SIZE: string;
  QDRANT_DISTANCE: string;
  QDRANT_HNSW_M: string;
  QDRANT_HNSW_EF_CONSTRUCT: string;
  QDRANT_HNSW_ON_DISK: string;
  QDRANT_INDEXING_THRESHOLD: string;
  QDRANT_MEMMAP_THRESHOLD: string;
  QDRANT_MAX_SEGMENT_SIZE: string;
  QDRANT_ENABLE_QUANTIZATION: string;
  QDRANT_QUANTIZATION_QUANTILE: string;
  QDRANT_QUANTIZATION_ALWAYS_RAM: string;
  QDRANT_MAX_BATCH_SIZE: string;
  QDRANT_MAX_CONCURRENT_BATCHES: string;
  QDRANT_WAIT_FOR_INDEXING: string;

  // Authentication
  JWT_SECRET: string;
  JWT_EXPIRE_TIME: string;
  BCRYPT_SALT_ROUNDS: number;

  // File Upload
  MAX_FILE_SIZE: number;
  ALLOWED_FILE_TYPES: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Logging
  LOG_LEVEL: string;
  LOG_FORMAT: string;

  // CORS
  CORS_ALLOWED_ORIGINS: string;

  // Session
  SESSION_SECRET: string;
  SESSION_MAX_AGE: number;

  // Redis Configuration
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  REDIS_DB: number;
  REDIS_TLS_ENABLED: boolean;

  // Bull Queue Configuration
  BULL_REDIS_HOST: string;
  BULL_REDIS_PORT: number;
  BULL_REDIS_PASSWORD?: string;
  BULL_REDIS_DB: number;
  QUEUE_CONCURRENCY: number;
  QUEUE_DEFAULT_JOB_OPTIONS: string;

  // Job Processing
  MAX_CONCURRENT_JOBS: number;
  JOB_TIMEOUT_MS: number;
  ENABLE_JOB_MONITORING: boolean;

  // Email (optional)
  EMAIL_HOST?: string;
  EMAIL_PORT?: number;
  EMAIL_USER?: string;
  EMAIL_PASS?: string;
  EMAIL_FROM?: string;

  // Error Tracking (optional)
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;

  // Monitoring
  ENABLE_METRICS: boolean;
  METRICS_PORT: number;
}

function parseBoolean(value: string | undefined, defaultValue: boolean = false): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env: Environment = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseNumber(process.env.PORT, 3000),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database Configuration (Supabase)
  SUPABASE_URL: requireEnv('SUPABASE_URL'),
  SUPABASE_ANON_KEY: requireEnv('SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_KEY: requireEnv('SUPABASE_SERVICE_KEY'),

  // AI Services
  ANTHROPIC_API_KEY: requireEnv('ANTHROPIC_API_KEY'),
  JINA_API_KEY: requireEnv('JINA_API_KEY'),

  // Vector Database (Qdrant)
  QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
  QDRANT_API_KEY: process.env.QDRANT_API_KEY || '',
  QDRANT_COLLECTION_NAME: process.env.QDRANT_COLLECTION_NAME || 'course_documents',
  QDRANT_TIMEOUT: process.env.QDRANT_TIMEOUT || '30000',
  QDRANT_MAX_RETRIES: process.env.QDRANT_MAX_RETRIES || '3',
  QDRANT_BASE_DELAY: process.env.QDRANT_BASE_DELAY || '1000',
  QDRANT_ENABLE_GRPC: process.env.QDRANT_ENABLE_GRPC || 'false',
  QDRANT_GRPC_PORT: process.env.QDRANT_GRPC_PORT || '6334',
  QDRANT_VECTOR_SIZE: process.env.QDRANT_VECTOR_SIZE || '1024',
  QDRANT_DISTANCE: process.env.QDRANT_DISTANCE || 'Cosine',
  QDRANT_HNSW_M: process.env.QDRANT_HNSW_M || '16',
  QDRANT_HNSW_EF_CONSTRUCT: process.env.QDRANT_HNSW_EF_CONSTRUCT || '100',
  QDRANT_HNSW_ON_DISK: process.env.QDRANT_HNSW_ON_DISK || 'false',
  QDRANT_INDEXING_THRESHOLD: process.env.QDRANT_INDEXING_THRESHOLD || '20000',
  QDRANT_MEMMAP_THRESHOLD: process.env.QDRANT_MEMMAP_THRESHOLD || '50000',
  QDRANT_MAX_SEGMENT_SIZE: process.env.QDRANT_MAX_SEGMENT_SIZE || '',
  QDRANT_ENABLE_QUANTIZATION: process.env.QDRANT_ENABLE_QUANTIZATION || 'false',
  QDRANT_QUANTIZATION_QUANTILE: process.env.QDRANT_QUANTIZATION_QUANTILE || '0.99',
  QDRANT_QUANTIZATION_ALWAYS_RAM: process.env.QDRANT_QUANTIZATION_ALWAYS_RAM || 'false',
  QDRANT_MAX_BATCH_SIZE: process.env.QDRANT_MAX_BATCH_SIZE || '1000',
  QDRANT_MAX_CONCURRENT_BATCHES: process.env.QDRANT_MAX_CONCURRENT_BATCHES || '5',
  QDRANT_WAIT_FOR_INDEXING: process.env.QDRANT_WAIT_FOR_INDEXING || 'false',

  // Authentication
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRE_TIME: process.env.JWT_EXPIRE_TIME || '7d',
  BCRYPT_SALT_ROUNDS: parseNumber(process.env.BCRYPT_SALT_ROUNDS, 10),

  // File Upload
  MAX_FILE_SIZE: parseNumber(process.env.MAX_FILE_SIZE, 52428800), // 50MB
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES || 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FORMAT: process.env.LOG_FORMAT || 'combined',

  // CORS
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000',

  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'your_session_secret_key',
  SESSION_MAX_AGE: parseNumber(process.env.SESSION_MAX_AGE, 86400000), // 24 hours

  // Redis Configuration
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseNumber(process.env.REDIS_PORT, 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DB: parseNumber(process.env.REDIS_DB, 0),
  REDIS_TLS_ENABLED: parseBoolean(process.env.REDIS_TLS_ENABLED),

  // Bull Queue Configuration
  BULL_REDIS_HOST: process.env.BULL_REDIS_HOST || 'localhost',
  BULL_REDIS_PORT: parseNumber(process.env.BULL_REDIS_PORT, 6379),
  BULL_REDIS_PASSWORD: process.env.BULL_REDIS_PASSWORD,
  BULL_REDIS_DB: parseNumber(process.env.BULL_REDIS_DB, 1),
  QUEUE_CONCURRENCY: parseNumber(process.env.QUEUE_CONCURRENCY, 5),
  QUEUE_DEFAULT_JOB_OPTIONS: process.env.QUEUE_DEFAULT_JOB_OPTIONS || '{"removeOnComplete":100,"removeOnFail":50,"attempts":3}',

  // Job Processing
  MAX_CONCURRENT_JOBS: parseNumber(process.env.MAX_CONCURRENT_JOBS, 5),
  JOB_TIMEOUT_MS: parseNumber(process.env.JOB_TIMEOUT_MS, 300000), // 5 minutes
  ENABLE_JOB_MONITORING: parseBoolean(process.env.ENABLE_JOB_MONITORING, true),

  // Email (optional)
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: parseNumber(process.env.EMAIL_PORT, 587),
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM,

  // Error Tracking (optional)
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,

  // Monitoring
  ENABLE_METRICS: parseBoolean(process.env.ENABLE_METRICS, true),
  METRICS_PORT: parseNumber(process.env.METRICS_PORT, 9090),
};

// Validate critical environment variables
export function validateEnvironment(): void {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_KEY',
    'ANTHROPIC_API_KEY',
    'JINA_API_KEY',
    'JWT_SECRET'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate Supabase URL format
  try {
    new URL(env.SUPABASE_URL);
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL');
  }

  // Validate port number
  if (env.PORT < 1 || env.PORT > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  console.log('✅ Environment validation passed');
}

export default env;