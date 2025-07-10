const { QdrantClient } = require('@qdrant/js-client-rest');
// Load environment variables directly
require('dotenv').config();
const env = process.env;
const winston = require('winston');

// Configure logger for Qdrant operations
const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class QdrantConfig {
  constructor() {
    this.config = {
      url: env.QDRANT_URL || 'http://localhost:6333',
      apiKey: env.QDRANT_API_KEY || undefined,
      timeout: parseInt(env.QDRANT_TIMEOUT) || 30000,
      maxRetries: parseInt(env.QDRANT_MAX_RETRIES) || 3,
      baseDelay: parseInt(env.QDRANT_BASE_DELAY) || 1000,
      enableGrpc: env.QDRANT_ENABLE_GRPC === 'true',
      grpcPort: parseInt(env.QDRANT_GRPC_PORT) || 6334
    };

    this.collectionConfig = {
      defaultVectorSize: parseInt(env.QDRANT_VECTOR_SIZE) || 1024,
      defaultDistance: env.QDRANT_DISTANCE || 'Cosine',
      defaultHnswConfig: {
        m: parseInt(env.QDRANT_HNSW_M) || 16,
        ef_construct: parseInt(env.QDRANT_HNSW_EF_CONSTRUCT) || 100,
        on_disk: env.QDRANT_HNSW_ON_DISK === 'true'
      },
      optimizerConfig: {
        indexing_threshold: parseInt(env.QDRANT_INDEXING_THRESHOLD) || 20000,
        memmap_threshold: parseInt(env.QDRANT_MEMMAP_THRESHOLD) || 50000,
        max_segment_size: parseInt(env.QDRANT_MAX_SEGMENT_SIZE) || null
      },
      quantizationConfig: env.QDRANT_ENABLE_QUANTIZATION === 'true' ? {
        scalar: {
          type: 'int8',
          quantile: parseFloat(env.QDRANT_QUANTIZATION_QUANTILE) || 0.99,
          always_ram: env.QDRANT_QUANTIZATION_ALWAYS_RAM === 'true'
        }
      } : undefined
    };

    this.batchConfig = {
      maxBatchSize: parseInt(env.QDRANT_MAX_BATCH_SIZE) || 1000,
      maxConcurrentBatches: parseInt(env.QDRANT_MAX_CONCURRENT_BATCHES) || 5,
      waitForIndexing: env.QDRANT_WAIT_FOR_INDEXING === 'true'
    };
  }

  getClientConfig() {
    const config = { ...this.config };
    
    // Remove undefined values
    Object.keys(config).forEach(key => {
      if (config[key] === undefined) {
        delete config[key];
      }
    });

    return config;
  }

  getCollectionConfig(overrides = {}) {
    return {
      ...this.collectionConfig,
      ...overrides
    };
  }

  getBatchConfig(overrides = {}) {
    return {
      ...this.batchConfig,
      ...overrides
    };
  }

  validateConfig() {
    const required = ['url'];
    const missing = required.filter(key => !this.config[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required Qdrant configuration: ${missing.join(', ')}`);
    }

    // Validate URL format
    try {
      new URL(this.config.url);
    } catch (error) {
      throw new Error('Invalid Qdrant URL format');
    }

    // Validate timeout
    if (this.config.timeout < 1000) {
      throw new Error('Qdrant timeout must be at least 1000ms');
    }

    // Validate batch size
    if (this.batchConfig.maxBatchSize < 1 || this.batchConfig.maxBatchSize > 10000) {
      throw new Error('Qdrant max batch size must be between 1 and 10000');
    }

    logger.info('✅ Qdrant configuration validated successfully');
    return true;
  }
}

class ResilientQdrantClient {
  constructor(config) {
    this.config = config;
    this.client = new QdrantClient(config.getClientConfig());
    this.maxRetries = config.config.maxRetries;
    this.baseDelay = config.config.baseDelay;
    this.connectionPool = new Map(); // Simple connection tracking
    this.metrics = {
      requestsTotal: 0,
      requestsSuccess: 0,
      requestsFailed: 0,
      avgResponseTime: 0,
      lastRequestTime: null
    };
  }

  async executeWithRetry(operation, operationName, ...args) {
    let lastError;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.withTimeout(
          operation.apply(this.client, args),
          this.config.config.timeout
        );
        
        // Update metrics
        this.updateMetrics(true, Date.now() - startTime);
        
        if (attempt > 1) {
          logger.info(`${operationName} succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Update metrics
        this.updateMetrics(false, Date.now() - startTime);
        
        // Don't retry on client errors (4xx) or auth errors
        if (this.isNonRetryableError(error)) {
          logger.error(`${operationName} failed with non-retryable error:`, error.message);
          throw error;
        }

        if (attempt < this.maxRetries) {
          const delay = this.calculateDelay(attempt);
          logger.warn(`${operationName} failed (attempt ${attempt}/${this.maxRetries}). Retrying in ${delay}ms...`, {
            error: error.message,
            attempt,
            operationName
          });
          await this.sleep(delay);
        }
      }
    }

    logger.error(`${operationName} failed after ${this.maxRetries} attempts:`, lastError.message);
    throw new Error(`${operationName} failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  async withTimeout(promise, timeoutMs) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]);
  }

  calculateDelay(attempt) {
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isNonRetryableError(error) {
    // Client errors (4xx) and authentication errors should not be retried
    const status = error?.status || error?.response?.status;
    return (status >= 400 && status < 500) || 
           error.message?.includes('authentication') ||
           error.message?.includes('authorization') ||
           error.message?.includes('not found');
  }

  updateMetrics(success, responseTime) {
    this.metrics.requestsTotal++;
    this.metrics.lastRequestTime = Date.now();
    
    if (success) {
      this.metrics.requestsSuccess++;
    } else {
      this.metrics.requestsFailed++;
    }
    
    // Calculate rolling average response time
    const total = this.metrics.requestsTotal;
    this.metrics.avgResponseTime = ((this.metrics.avgResponseTime * (total - 1)) + responseTime) / total;
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.requestsTotal > 0 
        ? (this.metrics.requestsSuccess / this.metrics.requestsTotal) * 100 
        : 0
    };
  }

  // Health check method
  async healthCheck() {
    try {
      const collections = await this.executeWithRetry(
        this.client.getCollections.bind(this.client),
        'healthCheck'
      );
      
      return {
        healthy: true,
        status: 'connected',
        collectionsCount: collections.collections?.length || 0,
        metrics: this.getMetrics(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'disconnected',
        error: error.message,
        metrics: this.getMetrics(),
        timestamp: new Date().toISOString()
      };
    }
  }

  // Wrapped client methods with retry logic
  async getCollections() {
    return this.executeWithRetry(
      this.client.getCollections.bind(this.client),
      'getCollections'
    );
  }

  async createCollection(collectionName, config) {
    return this.executeWithRetry(
      this.client.createCollection.bind(this.client),
      'createCollection',
      collectionName,
      config
    );
  }

  async deleteCollection(collectionName) {
    return this.executeWithRetry(
      this.client.deleteCollection.bind(this.client),
      'deleteCollection',
      collectionName
    );
  }

  async getCollection(collectionName) {
    return this.executeWithRetry(
      this.client.getCollection.bind(this.client),
      'getCollection',
      collectionName
    );
  }

  async createPayloadIndex(collectionName, indexConfig) {
    return this.executeWithRetry(
      this.client.createPayloadIndex.bind(this.client),
      'createPayloadIndex',
      collectionName,
      indexConfig
    );
  }

  async upsert(collectionName, upsertConfig) {
    return this.executeWithRetry(
      this.client.upsert.bind(this.client),
      'upsert',
      collectionName,
      upsertConfig
    );
  }

  async search(collectionName, searchConfig) {
    return this.executeWithRetry(
      this.client.search.bind(this.client),
      'search',
      collectionName,
      searchConfig
    );
  }

  async query(collectionName, queryConfig) {
    return this.executeWithRetry(
      this.client.query.bind(this.client),
      'query',
      collectionName,
      queryConfig
    );
  }

  async delete(collectionName, deleteConfig) {
    return this.executeWithRetry(
      this.client.delete.bind(this.client),
      'delete',
      collectionName,
      deleteConfig
    );
  }

  async count(collectionName, countConfig = {}) {
    return this.executeWithRetry(
      this.client.count.bind(this.client),
      'count',
      collectionName,
      countConfig
    );
  }

  async scroll(collectionName, scrollConfig = {}) {
    return this.executeWithRetry(
      this.client.scroll.bind(this.client),
      'scroll',
      collectionName,
      scrollConfig
    );
  }
}

// Initialize configuration and client
const qdrantConfig = new QdrantConfig();
let qdrantClient = null;

function createQdrantClient() {
  try {
    qdrantConfig.validateConfig();
    qdrantClient = new ResilientQdrantClient(qdrantConfig);
    logger.info('✅ Qdrant client initialized successfully');
    return qdrantClient;
  } catch (error) {
    logger.error('❌ Failed to initialize Qdrant client:', error.message);
    throw error;
  }
}

function getQdrantClient() {
  if (!qdrantClient) {
    return createQdrantClient();
  }
  return qdrantClient;
}

module.exports = {
  QdrantConfig,
  ResilientQdrantClient,
  createQdrantClient,
  getQdrantClient,
  qdrantConfig,
  logger
};