const { getServiceConfig } = require('./index');

class ServicesConfig {
  constructor() {
    this.config = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    this.config = getServiceConfig();
    this.validateConfig();
    this.initialized = true;
    
    console.log('Services configuration initialized');
  }

  validateConfig() {
    if (!this.config || typeof this.config !== 'object') {
      throw new Error('Services configuration is invalid');
    }

    this.validateUploadConfig();
    this.validateProcessingConfig();
    this.validateQueueConfig();
    this.validateCacheConfig();
  }

  validateUploadConfig() {
    const { upload } = this.config;
    
    if (!upload || typeof upload !== 'object') {
      throw new Error('Upload configuration is invalid');
    }

    if (!upload.maxFileSize || typeof upload.maxFileSize !== 'number' || upload.maxFileSize <= 0) {
      throw new Error('Upload max file size must be a positive number');
    }

    if (!upload.uploadDir || typeof upload.uploadDir !== 'string') {
      throw new Error('Upload directory must be a non-empty string');
    }

    if (!Array.isArray(upload.allowedMimeTypes) || upload.allowedMimeTypes.length === 0) {
      throw new Error('Upload allowed mime types must be a non-empty array');
    }
  }

  validateProcessingConfig() {
    const { processing } = this.config;
    
    if (!processing || typeof processing !== 'object') {
      throw new Error('Processing configuration is invalid');
    }

    const numericFields = ['maxChunkSize', 'minChunkSize', 'overlapSize', 'qualityMinimum', 'qualityRecommended', 'qualityPremium'];
    
    for (const field of numericFields) {
      if (!processing[field] || typeof processing[field] !== 'number' || processing[field] <= 0) {
        throw new Error(`Processing ${field} must be a positive number`);
      }
    }

    if (processing.minChunkSize >= processing.maxChunkSize) {
      throw new Error('Processing min chunk size must be less than max chunk size');
    }
  }

  validateQueueConfig() {
    const { queue } = this.config;
    
    if (!queue || typeof queue !== 'object') {
      throw new Error('Queue configuration is invalid');
    }

    const numericFields = ['concurrency', 'maxAttempts', 'backoffDelay'];
    
    for (const field of numericFields) {
      if (!queue[field] || typeof queue[field] !== 'number' || queue[field] <= 0) {
        throw new Error(`Queue ${field} must be a positive number`);
      }
    }
  }

  validateCacheConfig() {
    const { cache } = this.config;
    
    if (!cache || typeof cache !== 'object') {
      throw new Error('Cache configuration is invalid');
    }

    if (!cache.ttl || typeof cache.ttl !== 'number' || cache.ttl <= 0) {
      throw new Error('Cache TTL must be a positive number');
    }

    if (!cache.maxSize || typeof cache.maxSize !== 'number' || cache.maxSize <= 0) {
      throw new Error('Cache max size must be a positive number');
    }
  }

  getUploadConfig() {
    return {
      ...this.config.upload,
      multerOptions: {
        dest: this.config.upload.uploadDir,
        limits: {
          fileSize: this.config.upload.maxFileSize,
          files: 10,
          fieldSize: 1024 * 1024, // 1MB
        },
        fileFilter: (req, file, cb) => {
          if (this.config.upload.allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error(`File type ${file.mimetype} not allowed`), false);
          }
        },
      },
      storage: {
        type: 'local',
        path: this.config.upload.uploadDir,
        cleanup: {
          enabled: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          interval: 60 * 60 * 1000, // 1 hour
        },
      },
    };
  }

  getProcessingConfig() {
    return {
      ...this.config.processing,
      chunking: {
        strategy: 'semantic',
        maxSize: this.config.processing.maxChunkSize,
        minSize: this.config.processing.minChunkSize,
        overlap: this.config.processing.overlapSize,
        preserveStructure: true,
      },
      quality: {
        minimum: this.config.processing.qualityMinimum,
        recommended: this.config.processing.qualityRecommended,
        premium: this.config.processing.qualityPremium,
        metrics: ['readability', 'complexity', 'coherence'],
      },
      languages: {
        supported: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 'ko', 'zh'],
        default: 'en',
        detection: {
          enabled: true,
          confidence: 0.8,
        },
      },
    };
  }

  getQueueConfig() {
    return {
      ...this.config.queue,
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
      },
      jobs: {
        'document-processing': {
          concurrency: this.config.queue.concurrency,
          attempts: this.config.queue.maxAttempts,
          backoff: {
            type: 'exponential',
            delay: this.config.queue.backoffDelay,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
        'course-generation': {
          concurrency: 1,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 5,
          removeOnFail: 3,
        },
        'vector-embedding': {
          concurrency: 2,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      },
    };
  }

  getCacheConfig() {
    return {
      ...this.config.cache,
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 1,
        keyPrefix: 'cache:',
      },
      strategies: {
        'document-content': {
          ttl: this.config.cache.ttl * 10, // 50 minutes
          maxSize: this.config.cache.maxSize,
        },
        'vector-embeddings': {
          ttl: this.config.cache.ttl * 20, // 100 minutes
          maxSize: this.config.cache.maxSize * 2,
        },
        'api-responses': {
          ttl: this.config.cache.ttl, // 5 minutes
          maxSize: this.config.cache.maxSize / 2,
        },
        'user-sessions': {
          ttl: 30 * 60, // 30 minutes
          maxSize: 1000,
        },
      },
    };
  }

  getRateLimitConfig() {
    return {
      global: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000,
        message: 'Too many requests from this IP',
        standardHeaders: true,
        legacyHeaders: false,
      },
      api: {
        upload: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 10,
          message: 'Too many file uploads',
        },
        generation: {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 5,
          message: 'Too many course generation requests',
        },
        auth: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 20,
          message: 'Too many authentication attempts',
        },
      },
      bypass: {
        whitelist: ['127.0.0.1', '::1'],
        apiKeys: true,
      },
    };
  }

  getConfig() {
    return {
      initialized: this.initialized,
      upload: this.getUploadConfig(),
      processing: this.getProcessingConfig(),
      queue: this.getQueueConfig(),
      cache: this.getCacheConfig(),
      rateLimit: this.getRateLimitConfig(),
    };
  }
}

const servicesConfig = new ServicesConfig();

module.exports = {
  servicesConfig,
  initialize: () => servicesConfig.initialize(),
  getUploadConfig: () => servicesConfig.getUploadConfig(),
  getProcessingConfig: () => servicesConfig.getProcessingConfig(),
  getQueueConfig: () => servicesConfig.getQueueConfig(),
  getCacheConfig: () => servicesConfig.getCacheConfig(),
  getRateLimitConfig: () => servicesConfig.getRateLimitConfig(),
  getConfig: () => servicesConfig.getConfig(),
};