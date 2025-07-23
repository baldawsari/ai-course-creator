const { VectorService } = require('../../../src/services/vectorService');
const { getQdrantClient } = require('../../../src/config/vectorStore');
const { supabaseAdmin } = require('../../../src/config/database-simple');
const { v4: uuidv4 } = require('uuid');

jest.mock('../../../src/config/vectorStore', () => ({
  getQdrantClient: jest.fn(),
  qdrantConfig: {
    getCollectionConfig: jest.fn().mockReturnValue({
      defaultVectorSize: 768,
      defaultDistance: 'Cosine',
      defaultHnswConfig: { m: 16, ef_construct: 100 }
    }),
    getBatchConfig: jest.fn().mockReturnValue({
      maxBatchSize: 1000,
      maxConcurrentBatches: 5,
      waitForIndexing: false
    })
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));
jest.mock('../../../src/config/database-simple', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}));
jest.mock('uuid');

describe('VectorService', () => {
  let vectorService;
  let mockQdrantClient;
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockQdrantClient = {
      getCollections: jest.fn(),
      createCollection: jest.fn(),
      createPayloadIndex: jest.fn(),
      upsert: jest.fn(),
      search: jest.fn(),
      query: jest.fn(),
      delete: jest.fn(),
      getCollectionInfo: jest.fn(),
      health: jest.fn(),
      getCollection: jest.fn().mockReturnValue({
        get_collection_info: jest.fn(),
        info: jest.fn(),
        points_count: 100
      }),
      healthCheck: jest.fn().mockResolvedValue({ healthy: true, status: 'ok' }),
      count: jest.fn().mockResolvedValue({ count: 100 }),
      sleep: jest.fn()
    };
    
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null })
    };
    
    getQdrantClient.mockReturnValue(mockQdrantClient);
    supabaseAdmin.from.mockReturnValue(mockSupabase);
    uuidv4.mockReturnValue('mock-uuid-123');
    
    vectorService = new VectorService();
  });

  describe('constructor', () => {
    it('should initialize with correct defaults', () => {
      expect(vectorService.client).toBeNull();
      expect(vectorService.cache).toBeInstanceOf(Map);
      expect(vectorService.cacheTimeout).toBe(5 * 60 * 1000);
      expect(vectorService.initialized).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should initialize client successfully', async () => {
      await vectorService.initialize();

      expect(getQdrantClient).toHaveBeenCalled();
      expect(vectorService.client).toBe(mockQdrantClient);
      expect(vectorService.initialized).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await vectorService.initialize();
      await vectorService.initialize();

      expect(getQdrantClient).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      getQdrantClient.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      await expect(vectorService.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('createCollection', () => {
    const collectionName = 'test-collection';
    const vectorConfig = {
      vectorSize: 768,
      distance: 'Cosine',
      enableSparseVectors: true
    };

    beforeEach(async () => {
      await vectorService.initialize();
    });

    it('should create collection successfully', async () => {
      mockQdrantClient.getCollections.mockResolvedValue({
        collections: []
      });

      const result = await vectorService.createCollection(collectionName, vectorConfig);

      expect(mockQdrantClient.createCollection).toHaveBeenCalledWith(
        collectionName,
        expect.objectContaining({
          vectors: expect.objectContaining({
            size: 768,
            distance: 'Cosine'
          }),
          sparse_vectors: expect.objectContaining({
            sparse: expect.any(Object)
          })
        })
      );
      expect(result).toEqual({
        success: true,
        existed: false,
        config: expect.any(Object),
        duration: expect.any(Number)
      });
    });

    it('should handle existing collection', async () => {
      mockQdrantClient.getCollections.mockResolvedValue({
        collections: [{ name: collectionName }]
      });

      const result = await vectorService.createCollection(collectionName);

      expect(mockQdrantClient.createCollection).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        existed: true
      });
    });

    it('should create default indexes', async () => {
      mockQdrantClient.getCollections.mockResolvedValue({
        collections: []
      });

      await vectorService.createCollection(collectionName, vectorConfig);

      expect(mockQdrantClient.createPayloadIndex).toHaveBeenCalledTimes(6); // 6 default indexes
    });

    it('should handle collection creation errors', async () => {
      mockQdrantClient.getCollections.mockResolvedValue({
        collections: []
      });
      mockQdrantClient.createCollection.mockRejectedValue(new Error('Create failed'));

      await expect(vectorService.createCollection(collectionName))
        .rejects.toThrow('Failed to create collection');
    });
  });

  describe('insertVectors', () => {
    const collectionName = 'test-collection';
    const vectors = [
      {
        id: 'vec-1',
        vector: Array(768).fill(0.1),
        payload: { text: 'Test vector 1' }
      },
      {
        id: 'vec-2',
        vector: Array(768).fill(0.2),
        payload: { text: 'Test vector 2' }
      }
    ];

    beforeEach(async () => {
      await vectorService.initialize();
    });

    it('should insert vectors successfully', async () => {
      mockQdrantClient.upsert.mockResolvedValue({
        operation_id: 123,
        status: 'completed'
      });

      const result = await vectorService.insertVectors(collectionName, vectors);

      expect(mockQdrantClient.upsert).toHaveBeenCalledWith(
        collectionName,
        {
          wait: true,
          points: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              vector: vectors[0].vector,
              payload: expect.objectContaining({
                text: 'Test vector 1',
                original_id: 'vec-1'
              })
            })
          ])
        }
      );
      expect(result).toEqual({
        success: true,
        inserted: 2,
        operationId: 'mock-uuid-123',
        duration: expect.any(Number)
      });
    });

    it('should validate vectors before insertion', async () => {
      const invalidVectors = [
        { vector: null, payload: {} }
      ];

      await expect(vectorService.insertVectors(collectionName, invalidVectors))
        .rejects.toThrow('Failed to insert vectors: Vector at index 0 must have a \'vector\' property that is an array');
    });

    it('should handle empty vectors array', async () => {
      await expect(vectorService.insertVectors(collectionName, []))
        .rejects.toThrow('Failed to insert vectors: Vectors must be a non-empty array');
    });

    it('should handle inconsistent vector dimensions', async () => {
      const inconsistentVectors = [
        { vector: Array(768).fill(0.1), payload: {} },
        { vector: Array(512).fill(0.1), payload: {} }
      ];

      await expect(vectorService.insertVectors(collectionName, inconsistentVectors))
        .rejects.toThrow('Failed to insert vectors: All vectors must have the same dimension. Expected 768, but found 512');
    });

    it('should handle batch insertion with wait option', async () => {
      const largeVectors = Array(1500).fill(null).map((_, i) => ({
        vector: Array(768).fill(0.1),
        payload: { index: i }
      }));

      mockQdrantClient.upsert.mockResolvedValue({
        operation_id: 123,
        status: 'completed'
      });

      const result = await vectorService.insertVectors(collectionName, largeVectors, {
        wait: false,
        batchSize: 500
      });

      expect(mockQdrantClient.upsert).toHaveBeenCalledTimes(3); // 1500 / 500 = 3 batches
      expect(result.inserted).toBe(1500);
    });
  });

  describe('searchSimilar', () => {
    const collectionName = 'test-collection';
    const queryVector = Array(768).fill(0.1);

    beforeEach(async () => {
      await vectorService.initialize();
    });

    it('should search for similar vectors', async () => {
      const mockResults = [
        { id: 'vec-1', score: 0.95, payload: { text: 'Result 1' } },
        { id: 'vec-2', score: 0.85, payload: { text: 'Result 2' } }
      ];

      mockQdrantClient.search.mockResolvedValue(mockResults);

      const result = await vectorService.searchSimilar(collectionName, queryVector);

      expect(mockQdrantClient.search).toHaveBeenCalledWith(
        collectionName,
        {
          vector: queryVector,
          limit: 10,
          with_payload: true,
          with_vectors: false
        }
      );
      expect(result).toEqual({
        success: true,
        results: mockResults,
        count: 2,
        operationId: 'mock-uuid-123',
        cached: false
      });
    });

    it('should apply filters', async () => {
      mockQdrantClient.search.mockResolvedValue([]);

      const filters = {
        courseId: 'course-123',
        minQuality: 0.7,
        language: 'en'
      };

      await vectorService.searchSimilar(collectionName, queryVector, filters);

      expect(mockQdrantClient.search).toHaveBeenCalledWith(
        collectionName,
        expect.objectContaining({
          filter: {
            must: expect.arrayContaining([
              { key: 'course_id', match: { value: 'course-123' } },
              { key: 'quality_score', range: { gte: 0.7 } },
              { key: 'language', match: { value: 'en' } }
            ])
          }
        })
      );
    });

    it('should use cache when available', async () => {
      const mockResults = [{ id: 'vec-1', score: 0.95 }];
      mockQdrantClient.search.mockResolvedValue(mockResults);

      // First search
      await vectorService.searchSimilar(collectionName, queryVector);
      
      // Second search (should use cache)
      const result = await vectorService.searchSimilar(collectionName, queryVector);

      expect(mockQdrantClient.search).toHaveBeenCalledTimes(1);
      expect(result.cached).toBe(true);
    });

    it('should handle search errors', async () => {
      mockQdrantClient.search.mockRejectedValue(new Error('Search failed'));

      await expect(vectorService.searchSimilar(collectionName, queryVector))
        .rejects.toThrow('Vector search failed');
    });
  });

  describe('hybridSearch', () => {
    const collectionName = 'test-collection';
    const queryVector = Array(768).fill(0.1);
    const sparseVector = {
      indices: [1, 5, 10],
      values: [0.5, 0.3, 0.2]
    };

    beforeEach(async () => {
      await vectorService.initialize();
    });

    it('should perform hybrid search', async () => {
      const mockResults = [
        { id: 'vec-1', score: 0.9 },
        { id: 'vec-2', score: 0.8 }
      ];

      mockQdrantClient.query.mockResolvedValue({
        points: mockResults
      });

      const result = await vectorService.hybridSearch(
        collectionName,
        queryVector,
        sparseVector
      );

      expect(mockQdrantClient.query).toHaveBeenCalledWith(
        collectionName,
        expect.objectContaining({
          query: expect.objectContaining({
            fusion: 'RRF',
            prefetch: expect.arrayContaining([
              expect.objectContaining({
                query: { nearest: queryVector }
              }),
              expect.objectContaining({
                query: {
                  nearest: {
                    sparse: {
                      indices: sparseVector.indices,
                      values: sparseVector.values
                    }
                  }
                }
              })
            ])
          })
        })
      );
      expect(result).toEqual({
        success: true,
        results: mockResults,
        count: 2,
        operationId: 'mock-uuid-123'
      });
    });

    it('should handle missing sparse vector', async () => {
      mockQdrantClient.query.mockResolvedValue({ points: [] });

      await vectorService.hybridSearch(collectionName, queryVector, null);

      expect(mockQdrantClient.query).toHaveBeenCalledWith(
        collectionName,
        expect.objectContaining({
          query: expect.objectContaining({
            prefetch: expect.arrayContaining([
              expect.objectContaining({
                query: { nearest: queryVector }
              })
            ])
          })
        })
      );
    });

    it('should throw error if no vectors provided', async () => {
      await expect(vectorService.hybridSearch(collectionName, null, null))
        .rejects.toThrow('At least one vector type must be provided');
    });
  });

  describe('deleteByFilter', () => {
    const collectionName = 'test-collection';

    beforeEach(async () => {
      await vectorService.initialize();
    });

    it('should delete vectors by filter', async () => {
      mockQdrantClient.delete.mockResolvedValue({
        operation_id: 123,
        status: 'completed'
      });
      
      // Mock before and after counts
      mockQdrantClient.getCollection
        .mockResolvedValueOnce({ points_count: 100 })
        .mockResolvedValueOnce({ points_count: 80 });

      const filters = {
        courseId: 'course-123'
      };

      const result = await vectorService.deleteByFilter(collectionName, filters);

      expect(mockQdrantClient.delete).toHaveBeenCalledWith(
        collectionName,
        {
          wait: true,
          filter: {
            must: [
              { key: 'course_id', match: { value: 'course-123' } }
            ]
          }
        }
      );
      expect(result).toMatchObject({
        success: true,
        operationId: 123,
        deletedCount: 20
      });
    });

    it('should throw error if no filters provided', async () => {
      await expect(vectorService.deleteByFilter(collectionName, {}))
        .rejects.toThrow('At least one filter must be provided');
    });

    it('should handle deletion errors', async () => {
      mockQdrantClient.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(vectorService.deleteByFilter(collectionName, { courseId: '123' }))
        .rejects.toThrow('Failed to delete vectors');
    });
  });

  describe('getCollectionInfo', () => {
    const collectionName = 'test-collection';

    beforeEach(async () => {
      await vectorService.initialize();
    });

    it('should get collection info', async () => {
      const mockInfo = {
        vectors_count: 1000,
        indexed_vectors_count: 1000,
        points_count: 1000,
        segments_count: 1,
        status: 'green',
        config: {
          params: {
            vectors: { size: 768, distance: 'Cosine' }
          }
        }
      };

      mockQdrantClient.getCollection.mockResolvedValue(mockInfo);
      mockQdrantClient.count.mockResolvedValue({ count: 1000 });

      const result = await vectorService.getCollectionInfo(collectionName);

      expect(result).toEqual({
        name: collectionName,
        vectorCount: 1000,
        status: 'green',
        config: mockInfo.config,
        indexedVectorsCount: 1000,
        pointsCount: 1000,
        segments: 1
      });
    });

    it('should handle collection not found', async () => {
      mockQdrantClient.getCollectionInfo.mockRejectedValue(
        new Error('Collection not found')
      );

      await expect(vectorService.getCollectionInfo('non-existent'))
        .rejects.toThrow('Failed to get collection info');
    });
  });

  describe('utility methods', () => {
    describe('buildFilter', () => {
      it('should build complex filters', () => {
        const filters = {
          courseId: 'course-123',
          resourceIds: ['res-1', 'res-2'],
          minQuality: 0.7,
          maxQuality: 0.9,
          language: 'en',
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
          custom: [
            { key: 'type', value: 'document' }
          ]
        };

        const result = vectorService.buildFilter(filters);

        expect(result.must).toHaveLength(7);
        expect(result.must).toContainEqual(
          { key: 'course_id', match: { value: 'course-123' } }
        );
        expect(result.must).toContainEqual(
          { key: 'resource_id', match: { any: ['res-1', 'res-2'] } }
        );
      });
    });

    describe('validateVectors', () => {
      it('should validate valid vectors', () => {
        const vectors = [
          { vector: [0.1, 0.2, 0.3], payload: {} },
          { vector: [0.4, 0.5, 0.6], payload: {} }
        ];

        expect(() => vectorService.validateVectors(vectors)).not.toThrow();
      });

      it('should throw for invalid vectors', () => {
        const invalidVectors = [
          { vector: [0.1, NaN, 0.3], payload: {} }
        ];

        expect(() => vectorService.validateVectors(invalidVectors))
          .toThrow('contains invalid numbers');
      });
    });

    describe('cache management', () => {
      it('should cache and retrieve values', () => {
        const key = vectorService.getCacheKey('search', { collection: 'test' });
        vectorService.setCache(key, { results: [] });

        const cached = vectorService.getCache(key);

        expect(cached).toEqual({ results: [] });
      });

      it('should expire old cache entries', () => {
        const key = 'test-key';
        vectorService.setCache(key, { data: 'test' });
        
        // Manually set timestamp to past
        const cached = vectorService.cache.get(key);
        cached.timestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago

        const result = vectorService.getCache(key);

        expect(result).toBeNull();
        expect(vectorService.cache.has(key)).toBe(false);
      });

      it('should clear all cache', () => {
        vectorService.setCache('key1', 'value1');
        vectorService.setCache('key2', 'value2');

        vectorService.clearCache();

        expect(vectorService.cache.size).toBe(0);
      });
    });
  });

  describe('healthCheck', () => {
    beforeEach(async () => {
      await vectorService.initialize();
    });

    it('should return healthy status', async () => {
      mockQdrantClient.health.mockResolvedValue({ status: 'ok' });

      const result = await vectorService.healthCheck();

      expect(result).toEqual({
        healthy: true,
        status: 'ok'
      });
    });

    it('should return unhealthy status on error', async () => {
      mockQdrantClient.healthCheck.mockRejectedValue(new Error('Connection failed'));

      const result = await vectorService.healthCheck();

      expect(result).toEqual({
        healthy: false,
        error: 'Connection failed',
        timestamp: expect.any(String)
      });
    });
  });
});