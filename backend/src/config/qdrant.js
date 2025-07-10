const { QdrantClient } = require('@qdrant/js-client-rest');
const { getDatabaseConfig } = require('./index');

class QdrantConfig {
  constructor() {
    this.config = null;
    this.client = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    this.config = this.getQdrantConfig();
    this.validateConfig();
    this.createClient();
    this.initialized = true;
    
    console.log('Qdrant configuration initialized');
  }

  getQdrantConfig() {
    const config = getDatabaseConfig().qdrant;
    return {
      url: config.url,
      apiKey: config.apiKey,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
    };
  }

  validateConfig() {
    if (!this.config.url) {
      throw new Error('Qdrant URL is required');
    }

    if (!this.config.url.startsWith('http')) {
      throw new Error('Qdrant URL must be a valid HTTP/HTTPS URL');
    }

    if (this.config.apiKey && this.config.apiKey.length < 10) {
      throw new Error('Qdrant API key appears to be invalid');
    }
  }

  createClient() {
    const clientConfig = {
      url: this.config.url,
      timeout: this.config.timeout,
    };

    if (this.config.apiKey) {
      clientConfig.apiKey = this.config.apiKey;
    }

    this.client = new QdrantClient(clientConfig);
  }

  getClient() {
    if (!this.client) {
      throw new Error('Qdrant client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  getCollectionConfigs() {
    return {
      documents: {
        vectors: {
          size: 1024,
          distance: 'Cosine',
        },
        optimizers_config: {
          deleted_threshold: 0.2,
          vacuum_min_vector_number: 1000,
          default_segment_number: 0,
          max_segment_size: 20000,
          memmap_threshold: 50000,
          indexing_threshold: 20000,
          flush_interval_sec: 5,
          max_optimization_threads: 1,
        },
        wal_config: {
          wal_capacity_mb: 32,
          wal_segments_ahead: 0,
        },
        hnsw_config: {
          m: 16,
          ef_construct: 100,
          full_scan_threshold: 10000,
          max_indexing_threads: 0,
          on_disk: false,
        },
      },
      test: {
        vectors: {
          size: 768,
          distance: 'Cosine',
        },
        optimizers_config: {
          deleted_threshold: 0.2,
          vacuum_min_vector_number: 100,
          default_segment_number: 0,
          max_segment_size: 5000,
          memmap_threshold: 10000,
          indexing_threshold: 5000,
          flush_interval_sec: 5,
          max_optimization_threads: 1,
        },
      },
    };
  }

  getDefaultCollectionConfig() {
    return this.getCollectionConfigs().documents;
  }

  validateCollectionName(name) {
    if (!name || typeof name !== 'string') {
      throw new Error('Collection name must be a non-empty string');
    }

    if (name.length < 2 || name.length > 255) {
      throw new Error('Collection name must be between 2 and 255 characters');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error('Collection name can only contain letters, numbers, underscores, and hyphens');
    }

    return true;
  }

  validateVectorConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Vector config must be an object');
    }

    if (!config.size || typeof config.size !== 'number' || config.size <= 0) {
      throw new Error('Vector size must be a positive number');
    }

    const validDistances = ['Cosine', 'Euclidean', 'Dot'];
    if (!config.distance || !validDistances.includes(config.distance)) {
      throw new Error(`Vector distance must be one of: ${validDistances.join(', ')}`);
    }

    return true;
  }

  validatePointData(points) {
    if (!Array.isArray(points)) {
      throw new Error('Points must be an array');
    }

    if (points.length === 0) {
      throw new Error('Points array cannot be empty');
    }

    if (points.length > 1000) {
      throw new Error('Maximum 1000 points per batch');
    }

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      
      if (!point || typeof point !== 'object') {
        throw new Error(`Point ${i} must be an object`);
      }

      if (!point.id) {
        throw new Error(`Point ${i} must have an id`);
      }

      if (!Array.isArray(point.vector)) {
        throw new Error(`Point ${i} must have a vector array`);
      }

      if (point.vector.length === 0) {
        throw new Error(`Point ${i} vector cannot be empty`);
      }

      const invalidValues = point.vector.filter(v => typeof v !== 'number' || !isFinite(v));
      if (invalidValues.length > 0) {
        throw new Error(`Point ${i} vector contains invalid values`);
      }
    }

    return true;
  }

  validateSearchParams(params) {
    if (!params || typeof params !== 'object') {
      throw new Error('Search params must be an object');
    }

    if (!Array.isArray(params.vector)) {
      throw new Error('Search vector must be an array');
    }

    if (params.vector.length === 0) {
      throw new Error('Search vector cannot be empty');
    }

    const invalidValues = params.vector.filter(v => typeof v !== 'number' || !isFinite(v));
    if (invalidValues.length > 0) {
      throw new Error('Search vector contains invalid values');
    }

    if (params.limit && (typeof params.limit !== 'number' || params.limit <= 0 || params.limit > 1000)) {
      throw new Error('Search limit must be a number between 1 and 1000');
    }

    if (params.score_threshold && (typeof params.score_threshold !== 'number' || params.score_threshold < 0 || params.score_threshold > 1)) {
      throw new Error('Score threshold must be a number between 0 and 1');
    }

    return true;
  }

  async testConnection() {
    try {
      const client = this.getClient();
      const response = await client.getCollections();
      console.log('Qdrant connection test successful');
      return true;
    } catch (error) {
      console.error('Qdrant connection test failed:', error.message);
      return false;
    }
  }

  async getClusterInfo() {
    try {
      const client = this.getClient();
      const response = await client.api('cluster');
      return response.data;
    } catch (error) {
      console.error('Failed to get Qdrant cluster info:', error.message);
      return null;
    }
  }

  async getCollectionInfo(collectionName) {
    try {
      const client = this.getClient();
      const response = await client.getCollection(collectionName);
      return response;
    } catch (error) {
      console.error(`Failed to get collection info for ${collectionName}:`, error.message);
      return null;
    }
  }

  getPerformanceConfig() {
    return {
      batchSize: 100,
      concurrency: 3,
      timeout: 30000,
      retries: 3,
      search: {
        defaultLimit: 10,
        maxLimit: 100,
        defaultScoreThreshold: 0.7,
      },
      upsert: {
        batchSize: 100,
        maxConcurrency: 5,
      },
      delete: {
        batchSize: 1000,
        maxConcurrency: 3,
      },
    };
  }

  getConfig() {
    return {
      url: this.config.url,
      hasApiKey: !!this.config.apiKey,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      initialized: this.initialized,
      collections: Object.keys(this.getCollectionConfigs()),
      defaultVectorSize: this.getDefaultCollectionConfig().vectors.size,
      defaultDistance: this.getDefaultCollectionConfig().vectors.distance,
    };
  }
}

const qdrantConfig = new QdrantConfig();

module.exports = {
  qdrantConfig,
  initialize: () => qdrantConfig.initialize(),
  getClient: () => qdrantConfig.getClient(),
  getCollectionConfigs: () => qdrantConfig.getCollectionConfigs(),
  getDefaultCollectionConfig: () => qdrantConfig.getDefaultCollectionConfig(),
  validateCollectionName: (name) => qdrantConfig.validateCollectionName(name),
  validateVectorConfig: (config) => qdrantConfig.validateVectorConfig(config),
  validatePointData: (points) => qdrantConfig.validatePointData(points),
  validateSearchParams: (params) => qdrantConfig.validateSearchParams(params),
  testConnection: () => qdrantConfig.testConnection(),
  getClusterInfo: () => qdrantConfig.getClusterInfo(),
  getCollectionInfo: (name) => qdrantConfig.getCollectionInfo(name),
  getPerformanceConfig: () => qdrantConfig.getPerformanceConfig(),
  getConfig: () => qdrantConfig.getConfig(),
};