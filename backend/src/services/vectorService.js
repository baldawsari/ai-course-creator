// Load environment variables
require('dotenv').config();
const { getQdrantClient, qdrantConfig, logger } = require('../config/vectorStore');
const { supabaseAdmin } = require('../config/database-simple');
const { v4: uuidv4 } = require('uuid');

class VectorService {
  constructor() {
    this.client = null;
    this.config = qdrantConfig;
    this.cache = new Map(); // Simple in-memory cache
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      this.client = getQdrantClient();
      logger.info('VectorService initialized successfully');
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize VectorService:', error);
      throw error;
    }
  }

  // COLLECTION MANAGEMENT
  async createCollection(collectionName, vectorConfig = {}) {
    await this.initialize();
    
    const startTime = Date.now();
    const operationId = uuidv4();
    
    try {
      logger.info('Creating collection', {
        operationId,
        collectionName,
        vectorConfig
      });

      // Check if collection already exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(col => col.name === collectionName);
      
      if (exists) {
        logger.info('Collection already exists', { operationId, collectionName });
        return { success: true, existed: true };
      }

      // Merge with default configuration
      const defaultConfig = this.config.getCollectionConfig();
      const finalConfig = {
        vectors: {
          size: vectorConfig.vectorSize || defaultConfig.defaultVectorSize,
          distance: vectorConfig.distance || defaultConfig.defaultDistance,
          on_disk: vectorConfig.onDisk !== undefined ? vectorConfig.onDisk : false,
          ...(defaultConfig.quantizationConfig && { quantization: defaultConfig.quantizationConfig })
        },
        hnsw_config: {
          ...defaultConfig.defaultHnswConfig,
          ...vectorConfig.hnswConfig
        },
        optimizers_config: {
          ...defaultConfig.optimizerConfig,
          ...vectorConfig.optimizerConfig
        },
        replication_factor: vectorConfig.replicationFactor || 1,
        write_consistency_factor: vectorConfig.writeConsistencyFactor || 1
      };

      // Add sparse vectors if requested
      if (vectorConfig.enableSparseVectors) {
        finalConfig.sparse_vectors = {
          sparse: {
            index: { 
              on_disk: vectorConfig.sparseOnDisk || false 
            }
          }
        };
      }

      await this.client.createCollection(collectionName, finalConfig);

      // Create payload indexes for common fields
      await this.createDefaultIndexes(collectionName, vectorConfig.payloadIndexes);

      const duration = Date.now() - startTime;
      logger.info('Collection created successfully', {
        operationId,
        collectionName,
        duration,
        config: finalConfig
      });

      // Store collection metadata
      await this.storeCollectionMetadata(collectionName, finalConfig);

      return { 
        success: true, 
        existed: false, 
        config: finalConfig,
        duration 
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Collection creation failed', {
        operationId,
        collectionName,
        error: error.message,
        duration
      });
      throw new Error(`Failed to create collection ${collectionName}: ${error.message}`);
    }
  }

  async createDefaultIndexes(collectionName, customIndexes = []) {
    const defaultIndexes = [
      {
        field_name: 'course_id',
        field_schema: 'keyword'
      },
      {
        field_name: 'resource_id', 
        field_schema: 'keyword'
      },
      {
        field_name: 'quality_score',
        field_schema: 'float'
      },
      {
        field_name: 'language',
        field_schema: 'keyword'
      },
      {
        field_name: 'chunk_index',
        field_schema: 'integer'
      },
      {
        field_name: 'title',
        field_schema: {
          type: 'text',
          tokenizer: 'word',
          min_token_len: 2,
          max_token_len: 20,
          lowercase: true
        }
      }
    ];

    const allIndexes = [...defaultIndexes, ...customIndexes];

    for (const indexConfig of allIndexes) {
      try {
        await this.client.createPayloadIndex(collectionName, indexConfig);
        logger.info('Created payload index', {
          collectionName,
          fieldName: indexConfig.field_name
        });
      } catch (error) {
        // Index might already exist, log warning but continue
        logger.warn('Failed to create payload index', {
          collectionName,
          fieldName: indexConfig.field_name,
          error: error.message
        });
      }
    }
  }

  // VECTOR OPERATIONS
  async insertVectors(collectionName, vectors, options = {}) {
    await this.initialize();
    
    const startTime = Date.now();
    const operationId = uuidv4();
    const batchConfig = this.config.getBatchConfig(options.batchConfig);

    try {
      logger.info('Starting vector insertion', {
        operationId,
        collectionName,
        vectorCount: vectors.length,
        batchSize: batchConfig.maxBatchSize
      });

      // Validate vectors
      this.validateVectors(vectors);

      // Process in batches
      const results = await this.batchInsertVectors(
        collectionName, 
        vectors, 
        batchConfig,
        operationId
      );

      const duration = Date.now() - startTime;
      logger.info('Vector insertion completed', {
        operationId,
        collectionName,
        totalVectors: vectors.length,
        successfulBatches: results.successfulBatches,
        failedBatches: results.failedBatches,
        duration
      });

      return {
        success: true,
        totalVectors: vectors.length,
        ...results,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Vector insertion failed', {
        operationId,
        collectionName,
        error: error.message,
        duration
      });
      throw new Error(`Failed to insert vectors: ${error.message}`);
    }
  }

  async batchInsertVectors(collectionName, vectors, batchConfig, operationId) {
    const batches = this.chunkArray(vectors, batchConfig.maxBatchSize);
    let successfulBatches = 0;
    let failedBatches = 0;
    const errors = [];

    // Process batches with controlled concurrency
    for (let i = 0; i < batches.length; i += batchConfig.maxConcurrentBatches) {
      const batchGroup = batches.slice(i, i + batchConfig.maxConcurrentBatches);
      
      const batchPromises = batchGroup.map(async (batch, batchIndex) => {
        const globalBatchIndex = i + batchIndex;
        try {
          const points = batch.map((vector, pointIndex) => {
            // Generate compatible ID: use UUID format for all IDs to ensure compatibility
            let pointId;
            if (vector.id) {
              // If ID is provided, check if it's already UUID format or numeric
              if (typeof vector.id === 'number' || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vector.id)) {
                pointId = vector.id;
              } else {
                // Convert simple string IDs to UUID format to ensure compatibility
                pointId = uuidv4();
              }
            } else {
              pointId = uuidv4();
            }
            
            const payload = {
              ...vector.metadata,
              ingestion_timestamp: new Date().toISOString(),
              batch_index: globalBatchIndex,
              point_index: pointIndex
            };
            
            // Store original ID if it was provided and different from generated ID
            if (vector.id && vector.id !== pointId) {
              payload.original_id = vector.id;
            }
            
            const point = {
              id: pointId,
              vector: {
                default: vector.vector,
                sparse: vector.sparseVector
              },
              payload: payload
            };
            
            return point;
          });

          await this.client.upsert(collectionName, {
            points,
            wait: batchConfig.waitForIndexing
          });

          successfulBatches++;
          logger.debug('Batch inserted successfully', {
            operationId,
            batchIndex: globalBatchIndex,
            pointCount: points.length
          });

        } catch (error) {
          failedBatches++;
          errors.push({
            batchIndex: globalBatchIndex,
            error: error.message
          });
          logger.error('Batch insertion failed', {
            operationId,
            batchIndex: globalBatchIndex,
            error: error.message
          });
        }
      });

      await Promise.all(batchPromises);

      // Add delay between batch groups to avoid overwhelming the service
      if (i + batchConfig.maxConcurrentBatches < batches.length) {
        await this.sleep(100);
      }
    }

    return {
      successfulBatches,
      failedBatches,
      totalBatches: batches.length,
      errors
    };
  }

  async searchSimilar(collectionName, queryVector, filters = {}, limit = 10) {
    await this.initialize();
    
    const startTime = Date.now();
    const operationId = uuidv4();

    try {
      logger.info('Starting similarity search', {
        operationId,
        collectionName,
        vectorSize: queryVector.length,
        limit,
        hasFilters: Object.keys(filters).length > 0
      });

      // Build search configuration
      const searchConfig = {
        vector: queryVector,
        limit: limit,
        with_payload: true,
        with_vectors: filters.includeVectors || false,
        params: {
          hnsw_ef: filters.hnswEf || 128,
          exact: filters.exact || false
        }
      };

      // Add filters if provided
      if (Object.keys(filters).length > 0) {
        searchConfig.filter = this.buildFilter(filters);
      }

      const results = await this.client.search(collectionName, searchConfig);

      const duration = Date.now() - startTime;
      logger.info('Similarity search completed', {
        operationId,
        collectionName,
        resultCount: results.length,
        duration
      });

      return {
        results: results.map(result => ({
          id: result.id,
          score: result.score,
          payload: result.payload,
          vector: result.vector
        })),
        query: {
          vector: queryVector,
          filters,
          limit
        },
        metadata: {
          searchType: 'similarity',
          duration,
          resultCount: results.length
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Similarity search failed', {
        operationId,
        collectionName,
        error: error.message,
        duration
      });
      throw new Error(`Similarity search failed: ${error.message}`);
    }
  }

  async hybridSearch(collectionName, queryVector, sparseVector, filters = {}, limit = 10) {
    await this.initialize();
    
    const startTime = Date.now();
    const operationId = uuidv4();

    try {
      logger.info('Starting hybrid search', {
        operationId,
        collectionName,
        denseVectorSize: queryVector?.length,
        sparseVectorSize: sparseVector?.indices?.length,
        limit
      });

      const queryConfig = {
        prefetch: [],
        fusion: {
          method: filters.fusionMode || 'rrf'
        },
        limit: limit,
        filter: this.buildFilter(filters),
        with_payload: true,
        with_vectors: filters.includeVectors || false
      };

      if (queryVector && queryVector.length > 0) {
        queryConfig.prefetch.push({
          query: {
            nearest: {
              vector: {
                name: "default",
                vector: queryVector,
              },
            },
          },
          limit: filters.denseLimit || limit
        });
      }

      if (sparseVector && sparseVector.indices && sparseVector.values) {
        queryConfig.prefetch.push({
          query: {
            nearest: {
              vector: {
                name: "sparse",
                vector: sparseVector,
              },
            },
          },
          limit: filters.sparseLimit || limit
        });
      }

      if (queryConfig.prefetch.length === 0) {
        throw new Error('Hybrid search requires at least one of dense or sparse vectors.');
      }

      const results = await this.client.query(collectionName, queryConfig);

      const duration = Date.now() - startTime;
      logger.info('Hybrid search completed', {
        operationId,
        collectionName,
        resultCount: results.length,
        duration
      });

      return {
        results: results.map(result => ({
          id: result.id,
          score: result.score,
          payload: result.payload,
          vector: result.vector
        })),
        query: {
          denseVector: queryVector,
          sparseVector: sparseVector,
          filters,
          limit
        },
        metadata: {
          searchType: 'hybrid',
          fusionMode: filters.fusionMode || 'rrf',
          duration,
          resultCount: results.length
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Hybrid search failed', {
        operationId,
        collectionName,
        error: error.message,
        duration
      });
      throw new Error(`Hybrid search failed: ${error.message}`);
    }
  }

  async deleteByFilter(collectionName, filters) {
    await this.initialize();
    
    const startTime = Date.now();
    const operationId = uuidv4();

    try {
      logger.info('Starting deletion by filter', {
        operationId,
        collectionName,
        filters
      });

      const filter = this.buildFilter(filters);
      
      const collectionInfoBefore = await this.client.getCollection(collectionName);
      const countBeforeDeletion = collectionInfoBefore.points_count;

      const deleteConfig = { 
        filter: filter,
        wait: true  // Wait for operation to complete
      };

      const result = await this.client.delete(collectionName, deleteConfig);

      // Wait for a short period to allow the deletion to be processed
      await this.sleep(200);

      const collectionInfoAfter = await this.client.getCollection(collectionName);
      const countAfterDeletion = collectionInfoAfter.points_count;

      const deletedCount = countBeforeDeletion - countAfterDeletion;

      const duration = Date.now() - startTime;
      logger.info('Deletion by filter completed', {
        operationId,
        collectionName,
        duration,
        result,
        deletedCount
      });

      return {
        success: true,
        deletedCount,
        filters,
        duration,
        operationId: result.operation_id
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Deletion by filter failed', {
        operationId,
        collectionName,
        error: error.message,
        duration
      });
      throw new Error(`Deletion by filter failed: ${error.message}`);
    }
  }

  // UTILITY METHODS
  buildFilter(filters) {
    const conditions = [];

    // Course ID filter
    if (filters.courseId) {
      conditions.push({
        key: 'course_id',
        match: { value: filters.courseId }
      });
    }

    // Resource IDs filter
    if (filters.resourceIds && Array.isArray(filters.resourceIds) && filters.resourceIds.length > 0) {
      conditions.push({
        key: 'resource_id',
        match: { any: filters.resourceIds }
      });
    }

    // Quality score filter
    if (filters.minQuality !== undefined) {
      conditions.push({
        key: 'quality_score',
        range: { gte: filters.minQuality }
      });
    }

    if (filters.maxQuality !== undefined) {
      conditions.push({
        key: 'quality_score',
        range: { lte: filters.maxQuality }
      });
    }

    // Language filter
    if (filters.language) {
      conditions.push({
        key: 'language',
        match: { value: filters.language }
      });
    }

    // Custom filters
    if (filters.custom && Array.isArray(filters.custom)) {
      conditions.push(...filters.custom);
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      const dateFilter = { key: 'ingestion_timestamp', range: {} };
      if (filters.dateFrom) dateFilter.range.gte = filters.dateFrom;
      if (filters.dateTo) dateFilter.range.lte = filters.dateTo;
      conditions.push(dateFilter);
    }

    return conditions.length > 0 ? { must: conditions } : undefined;
  }

  fuseResults(results, limit) {
    // Deduplicate by ID and keep highest score
    const resultMap = new Map();
    
    results.forEach(result => {
      const existing = resultMap.get(result.id);
      if (!existing || result.score > existing.score) {
        resultMap.set(result.id, result);
      }
    });
    
    // Sort by score and limit
    const fusedResults = Array.from(resultMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return fusedResults;
  }

  validateVectors(vectors) {
    if (!Array.isArray(vectors) || vectors.length === 0) {
      throw new Error('Vectors must be a non-empty array');
    }

    vectors.forEach((vector, index) => {
      if (!vector.vector || !Array.isArray(vector.vector)) {
        throw new Error(`Vector at index ${index} must have a 'vector' property that is an array`);
      }

      if (vector.vector.length === 0) {
        throw new Error(`Vector at index ${index} cannot be empty`);
      }

      // Check for valid numbers
      if (!vector.vector.every(v => typeof v === 'number' && !isNaN(v) && isFinite(v))) {
        throw new Error(`Vector at index ${index} contains invalid numbers`);
      }
    });

    // Check vector dimensions consistency
    const firstVectorSize = vectors[0].vector.length;
    const inconsistentVector = vectors.find(v => v.vector.length !== firstVectorSize);
    if (inconsistentVector) {
      throw new Error(`All vectors must have the same dimension. Expected ${firstVectorSize}, but found ${inconsistentVector.vector.length}`);
    }
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // COLLECTION INFORMATION
  async getCollectionInfo(collectionName) {
    await this.initialize();
    
    try {
      const info = await this.client.getCollection(collectionName);
      const count = await this.client.count(collectionName);
      
      return {
        name: collectionName,
        vectorCount: count.count,
        status: info.status,
        config: info.config,
        indexedVectorsCount: info.indexed_vectors_count,
        pointsCount: info.points_count,
        segments: info.segments_count
      };
    } catch (error) {
      logger.error('Failed to get collection info', {
        collectionName,
        error: error.message
      });
      throw new Error(`Failed to get collection info: ${error.message}`);
    }
  }

  async listCollections() {
    await this.initialize();
    
    try {
      const response = await this.client.getCollections();
      return response.collections.map(col => ({
        name: col.name,
        vectorsCount: col.vectors_count,
        pointsCount: col.points_count
      }));
    } catch (error) {
      logger.error('Failed to list collections', { error: error.message });
      throw new Error(`Failed to list collections: ${error.message}`);
    }
  }

  // MONITORING AND HEALTH
  async healthCheck() {
    try {
      if (!this.client) {
        await this.initialize();
      }
      return await this.client.healthCheck();
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  getMetrics() {
    return this.client ? this.client.getMetrics() : null;
  }

  // DATABASE INTEGRATION
  async storeCollectionMetadata(collectionName, config) {
    try {
      const { error } = await supabaseAdmin
        .from('vector_collections')
        .upsert({
          collection_name: collectionName,
          vector_size: config.vectors.size,
          distance_metric: config.vectors.distance,
          config: config,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        logger.warn('Failed to store collection metadata', {
          collectionName,
          error: error.message
        });
      }
    } catch (error) {
      logger.warn('Failed to store collection metadata', {
        collectionName,
        error: error.message
      });
    }
  }

  // CACHE MANAGEMENT
  getCacheKey(operation, params) {
    return `${operation}:${JSON.stringify(params)}`;
  }

  setCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.value;
  }

  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
const vectorService = new VectorService();

module.exports = {
  VectorService,
  vectorService
};