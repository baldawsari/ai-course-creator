// Mock dependencies
jest.mock('../../../src/services/jinaClient');
jest.mock('../../../src/config/database-simple', () => {
  const mockInsert = jest.fn().mockReturnThis();
  const mockFrom = jest.fn(() => ({
    insert: mockInsert,
    update: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    gte: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  }));
  
  return {
    supabaseAdmin: {
      from: mockFrom,
      // Expose the mock for testing
      _mockInsert: mockInsert
    }
  };
});

jest.mock('../../../src/config/vectorStore', () => ({
  getQdrantClient: jest.fn(),
  qdrantConfig: {
    getCollectionConfig: jest.fn().mockReturnValue({}),
    getBatchConfig: jest.fn().mockReturnValue({})
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../../../src/services/vectorService');
jest.mock('../../../src/utils/logger');
jest.mock('llamaindex', () => ({
  Document: jest.fn().mockImplementation((data) => data),
  VectorStoreIndex: {
    fromDocuments: jest.fn().mockResolvedValue({
      asRetriever: jest.fn().mockReturnValue({
        retrieve: jest.fn().mockResolvedValue([])
      }),
      asQueryEngine: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue({
          sourceNodes: [],
          response: 'Test response'
        })
      })
    })
  },
  SimpleKeywordTableIndex: {
    fromDocuments: jest.fn().mockResolvedValue({
      asRetriever: jest.fn().mockReturnValue({
        retrieve: jest.fn().mockResolvedValue([])
      })
    })
  },
  QueryFusionRetriever: jest.fn().mockImplementation((config) => ({
    retrieve: jest.fn().mockResolvedValue([])
  })),
  IngestionPipeline: jest.fn().mockImplementation(() => ({
    run: jest.fn().mockResolvedValue([
      { text: 'chunk 1', metadata: {}, embedding: null },
      { text: 'chunk 2', metadata: {}, embedding: null }
    ])
  })),
  SentenceSplitter: jest.fn().mockImplementation(() => ({})),
  Settings: {},
  BaseEmbedding: jest.fn()
}));

const { RAGPipeline, JinaEmbedding } = require('../../../src/services/ragPipeline');
const JinaClient = require('../../../src/services/jinaClient');
const { supabaseAdmin } = require('../../../src/config/database-simple');
const { VectorStoreIndex, SimpleKeywordTableIndex, QueryFusionRetriever } = require('llamaindex');

describe('RAGPipeline Service', () => {
  let ragPipeline;
  let mockJinaClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up JinaClient mock
    mockJinaClient = {
      embeddings: jest.fn().mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }]
      }),
      rerank: jest.fn().mockResolvedValue({
        results: [{ index: 0, relevance_score: 0.9 }]
      }),
    };
    JinaClient.mockImplementation(() => mockJinaClient);
    
    // Create pipeline instance
    ragPipeline = new RAGPipeline();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await ragPipeline.initialize();
      
      expect(ragPipeline.initialized).toBe(true);
    });
    
    it('should not reinitialize if already initialized', async () => {
      await ragPipeline.initialize();
      await ragPipeline.initialize();
      
      expect(JinaClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('ingestDocuments', () => {
    const mockDocuments = [
      { 
        text: 'Test document content',
        metadata: { title: 'Test Doc', quality_score: 85 }
      }
    ];

    it('should ingest documents successfully', async () => {
      const result = await ragPipeline.ingestDocuments(mockDocuments, 'course-123');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('totalChunks', 2);
      expect(result.success).toHaveLength(1);
      expect(VectorStoreIndex.fromDocuments).toHaveBeenCalled();
      expect(SimpleKeywordTableIndex.fromDocuments).toHaveBeenCalled();
    });

    it('should filter documents by quality threshold', async () => {
      const lowQualityDocs = [
        { text: 'Low quality', metadata: { title: 'Bad Doc', quality_score: 30 } }
      ];
      
      const result = await ragPipeline.ingestDocuments(lowQualityDocs, 'course-123', {
        qualityThreshold: 50
      });
      
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].reason).toBe('Quality below threshold');
    });

    it('should handle documents without metadata', async () => {
      const docsWithoutMetadata = [{ text: 'Plain text' }];
      
      const result = await ragPipeline.ingestDocuments(docsWithoutMetadata, 'course-123');
      
      expect(result.success).toHaveLength(1);
    });

    it('should handle empty documents array', async () => {
      const result = await ragPipeline.ingestDocuments([], 'course-123');
      
      expect(result.totalChunks).toBe(0);
      expect(result.success).toHaveLength(0);
    });

    it('should handle ingestion errors', async () => {
      const errorPipeline = require('llamaindex').IngestionPipeline;
      errorPipeline.mockImplementationOnce(() => ({
        run: jest.fn().mockRejectedValue(new Error('Pipeline error'))
      }));

      const result = await ragPipeline.ingestDocuments(mockDocuments, 'course-123');
      
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].reason).toContain('Pipeline error');
    });
  });

  describe('retrieveRelevantContent', () => {
    beforeEach(async () => {
      // Setup indexes
      await ragPipeline.ingestDocuments([
        { text: 'Test content', metadata: { course_id: 'course-123' } }
      ], 'course-123');
    });

    it('should retrieve content using hybrid search', async () => {
      const mockNodes = [
        { 
          id: '1', 
          text: 'Result 1', 
          score: 0.9,
          metadata: { course_id: 'course-123' }
        }
      ];
      
      ragPipeline.hybridRetriever.retrieve = jest.fn().mockResolvedValue(mockNodes);
      
      const result = await ragPipeline.retrieveRelevantContent('test query');
      
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('query', 'test query');
      expect(result).toHaveProperty('searchType', 'hybrid');
    });

    it('should filter by course ID', async () => {
      const result = await ragPipeline.retrieveRelevantContent('test query', {
        courseId: 'course-123'
      });
      
      expect(result.filters).toHaveProperty('courseId', 'course-123');
    });

    it('should filter by minimum quality', async () => {
      const result = await ragPipeline.retrieveRelevantContent('test query', {
        minQuality: 70
      });
      
      expect(result.filters).toHaveProperty('minQuality', 70);
    });

    it('should handle semantic search mode', async () => {
      const mockRetriever = {
        retrieve: jest.fn().mockResolvedValue([
          { id: '1', text: 'Semantic result', score: 0.85, metadata: {} }
        ])
      };
      ragPipeline.vectorIndex.asRetriever = jest.fn().mockReturnValue(mockRetriever);
      
      const result = await ragPipeline.retrieveRelevantContent('test query', {
        searchMode: 'semantic'
      });
      
      expect(result.searchType).toBe('semantic');
    });

    it('should handle keyword search mode', async () => {
      const mockRetriever = {
        retrieve: jest.fn().mockResolvedValue([
          { id: '1', text: 'Keyword result', score: 0.75, metadata: {} }
        ])
      };
      ragPipeline.keywordIndex.asRetriever = jest.fn().mockReturnValue(mockRetriever);
      
      const result = await ragPipeline.retrieveRelevantContent('test query', {
        searchMode: 'keyword'
      });
      
      expect(result.searchType).toBe('keyword');
    });

    it('should rerank results when enabled', async () => {
      ragPipeline.hybridRetriever.retrieve = jest.fn().mockResolvedValue([
        { id: '1', text: 'Result 1', score: 0.9, metadata: {} },
        { id: '2', text: 'Result 2', score: 0.8, metadata: {} }
      ]);
      
      const result = await ragPipeline.retrieveRelevantContent('test query', {
        enableReranking: true
      });
      
      expect(mockJinaClient.rerank).toHaveBeenCalled();
    });

    it('should throw error when no documents ingested', async () => {
      const newPipeline = new RAGPipeline();
      
      await expect(newPipeline.retrieveRelevantContent('test'))
        .rejects.toThrow('No documents have been ingested');
    });
  });

  describe('searchSimilar', () => {
    beforeEach(async () => {
      await ragPipeline.ingestDocuments([
        { text: 'Test content', metadata: {} }
      ], 'course-123');
    });

    it('should perform similarity search', async () => {
      const result = await ragPipeline.searchSimilar('test query');
      
      expect(result).toBeDefined();
    });

    it('should use semantic search when specified', async () => {
      const mockRetriever = {
        retrieve: jest.fn().mockResolvedValue([])
      };
      ragPipeline.vectorIndex.asRetriever = jest.fn().mockReturnValue(mockRetriever);
      
      await ragPipeline.searchSimilar('test query', { searchMode: 'semantic' });
      
      expect(ragPipeline.vectorIndex.asRetriever).toHaveBeenCalled();
    });

    it('should throw error when no index available', async () => {
      const newPipeline = new RAGPipeline();
      
      await expect(newPipeline.searchSimilar('test'))
        .rejects.toThrow('No index available');
    });
  });

  describe('generateQueryEmbedding', () => {
    it('should generate embedding for query', async () => {
      const embedding = await ragPipeline.generateQueryEmbedding('test query');
      
      expect(mockJinaClient.embeddings).toHaveBeenCalledWith(
        ['test query'],
        expect.objectContaining({
          model: 'jina-embeddings-v4',
          task: 'retrieval.query'
        })
      );
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should handle API errors', async () => {
      mockJinaClient.embeddings.mockRejectedValueOnce(new Error('API error'));
      
      await expect(ragPipeline.generateQueryEmbedding('test'))
        .rejects.toThrow('Query embedding generation failed');
    });
  });

  describe('rerankResults', () => {
    const mockResults = [
      { id: '1', text: 'Result 1', score: 0.8, metadata: {} },
      { id: '2', text: 'Result 2', score: 0.7, metadata: {} }
    ];

    it('should rerank results', async () => {
      mockJinaClient.rerank.mockResolvedValueOnce({
        results: [
          { index: 1, relevance_score: 0.95 },
          { index: 0, relevance_score: 0.85 }
        ]
      });
      
      const reranked = await ragPipeline.rerankResults(mockResults, 'test query');
      
      expect(reranked[0]).toHaveProperty('relevanceScore', 0.95);
      expect(reranked[0].id).toBe('2');
    });

    it('should limit reranked results', async () => {
      const manyResults = Array(20).fill(null).map((_, i) => ({
        id: `${i}`,
        text: `Result ${i}`,
        score: 0.5,
        metadata: {}
      }));
      
      mockJinaClient.rerank.mockResolvedValueOnce({
        results: Array(5).fill(null).map((_, i) => ({
          index: i,
          relevance_score: 1 - (i * 0.05)
        }))
      });
      
      const reranked = await ragPipeline.rerankResults(manyResults, 'query', { topN: 5 });
      
      expect(reranked).toHaveLength(5);
    });

    it('should return original results if only one result', async () => {
      const singleResult = [mockResults[0]];
      
      const reranked = await ragPipeline.rerankResults(singleResult, 'query');
      
      expect(reranked).toEqual(singleResult);
      expect(mockJinaClient.rerank).not.toHaveBeenCalled();
    });

    it('should fallback to original results on error', async () => {
      mockJinaClient.rerank.mockRejectedValueOnce(new Error('Rerank failed'));
      
      const reranked = await ragPipeline.rerankResults(mockResults, 'query', { topN: 1 });
      
      expect(reranked).toHaveLength(1);
      expect(reranked[0]).toEqual(mockResults[0]);
    });
  });

  describe('storeEmbeddingMetadata', () => {
    it('should store metadata in database', async () => {
      const document = { metadata: { resource_id: 'res-123', quality_score: 85 } };
      
      supabaseAdmin.from().insert.mockResolvedValueOnce({ error: null });
      
      await ragPipeline.storeEmbeddingMetadata('course-123', document, 5);
      
      expect(supabaseAdmin.from).toHaveBeenCalledWith('content_embeddings');
      expect(supabaseAdmin.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          course_id: 'course-123',
          resource_id: 'res-123',
          chunk_count: 5,
          quality_score: 85
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      supabaseAdmin.from().insert.mockRejectedValueOnce(new Error('DB error'));
      
      // Should not throw
      await ragPipeline.storeEmbeddingMetadata('course-123', {}, 1);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      await ragPipeline.initialize();
      
      const result = await ragPipeline.healthCheck();
      
      expect(result).toHaveProperty('status', 'healthy');
      expect(result.components).toHaveProperty('jina', 'healthy');
      expect(result.components).toHaveProperty('initialized', true);
    });

    it('should indicate degraded status when Jina fails', async () => {
      mockJinaClient.embeddings.mockRejectedValueOnce(new Error('API down'));
      
      const result = await ragPipeline.healthCheck();
      
      expect(result).toHaveProperty('status', 'degraded');
      expect(result.components).toHaveProperty('jina', 'unhealthy');
    });

    it('should handle complete failure', async () => {
      // Create a pipeline that will throw an error
      const brokenPipeline = new RAGPipeline();
      // Replace the jinaClient with a broken one that throws errors
      brokenPipeline.jinaClient = {
        embeddings: jest.fn().mockRejectedValue(new Error('Complete failure'))
      };
      
      const result = await brokenPipeline.healthCheck();
      
      expect(result).toHaveProperty('status', 'degraded');
      expect(result.components).toHaveProperty('jina', 'unhealthy');
    });
  });

  describe('getStats', () => {
    it('should return pipeline statistics', async () => {
      await ragPipeline.initialize();
      await ragPipeline.ingestDocuments([
        { text: 'Test', metadata: {} }
      ], 'course-123');
      
      const stats = await ragPipeline.getStats();
      
      expect(stats).toHaveProperty('initialized', true);
      expect(stats).toHaveProperty('hasVectorIndex', true);
      expect(stats).toHaveProperty('hasKeywordIndex', true);
      expect(stats).toHaveProperty('embeddingModel', 'jina-embeddings-v4');
      expect(stats.searchCapabilities).toHaveProperty('hybrid', true);
    });
  });

  describe('reset', () => {
    it('should reset all indexes and state', async () => {
      await ragPipeline.initialize();
      await ragPipeline.ingestDocuments([
        { text: 'Test', metadata: {} }
      ], 'course-123');
      
      ragPipeline.reset();
      
      expect(ragPipeline.vectorIndex).toBeNull();
      expect(ragPipeline.keywordIndex).toBeNull();
      expect(ragPipeline.hybridRetriever).toBeNull();
      expect(ragPipeline.queryEngine).toBeNull();
      expect(ragPipeline.initialized).toBe(false);
    });
  });

  describe('performSemanticSearch', () => {
    it('should perform semantic search', async () => {
      await ragPipeline.ingestDocuments([
        { text: 'Test content', metadata: {} }
      ], 'course-123');
      
      const mockNodes = [
        { id: '1', text: 'Result', score: 0.9, metadata: {} }
      ];
      ragPipeline.vectorIndex.asRetriever().retrieve = jest.fn().mockResolvedValue(mockNodes);
      
      const results = await ragPipeline.performSemanticSearch('query');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('searchType', 'semantic');
    });
  });

  describe('performKeywordSearch', () => {
    it('should perform keyword search', async () => {
      await ragPipeline.ingestDocuments([
        { text: 'Test content', metadata: {} }
      ], 'course-123');
      
      const mockNodes = [
        { id: '1', text: 'Result', score: 0.8, metadata: {} }
      ];
      ragPipeline.keywordIndex.asRetriever().retrieve = jest.fn().mockResolvedValue(mockNodes);
      
      const results = await ragPipeline.performKeywordSearch('query');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('searchType', 'keyword');
    });
  });

  describe('performHybridSearch', () => {
    it('should perform hybrid search', async () => {
      await ragPipeline.ingestDocuments([
        { text: 'Test content', metadata: {} }
      ], 'course-123');
      
      const mockNodes = [
        { id: '1', text: 'Result', score: 0.85, metadata: {} }
      ];
      ragPipeline.hybridRetriever.retrieve = jest.fn().mockResolvedValue(mockNodes);
      
      const results = await ragPipeline.performHybridSearch('query');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('searchType', 'hybrid');
    });

    it('should fallback to semantic search on error', async () => {
      await ragPipeline.ingestDocuments([
        { text: 'Test content', metadata: {} }
      ], 'course-123');
      
      ragPipeline.hybridRetriever.retrieve = jest.fn().mockRejectedValue(new Error('Hybrid failed'));
      
      const mockNodes = [
        { id: '1', text: 'Fallback', score: 0.8, metadata: {} }
      ];
      ragPipeline.vectorIndex.asRetriever().retrieve = jest.fn().mockResolvedValue(mockNodes);
      
      const results = await ragPipeline.performHybridSearch('query');
      
      expect(results[0]).toHaveProperty('searchType', 'semantic');
    });
  });
});

describe('JinaEmbedding', () => {
  let jinaEmbedding;
  let mockJinaClient;

  beforeEach(() => {
    mockJinaClient = {
      embeddings: jest.fn().mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }]
      })
    };
    
    jinaEmbedding = new JinaEmbedding(mockJinaClient);
  });

  describe('getTextEmbedding', () => {
    it('should get embedding for single text', async () => {
      const embedding = await jinaEmbedding.getTextEmbedding('test text');
      
      expect(mockJinaClient.embeddings).toHaveBeenCalledWith(
        ['test text'],
        expect.objectContaining({
          model: 'jina-embeddings-v4',
          task: 'retrieval.passage',
          dimensions: 1024,
          normalized: true
        })
      );
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should handle API errors', async () => {
      mockJinaClient.embeddings.mockRejectedValueOnce(new Error('API error'));
      
      await expect(jinaEmbedding.getTextEmbedding('test'))
        .rejects.toThrow('Failed to generate embedding');
    });
  });

  describe('getTextEmbeddings', () => {
    it('should get embeddings for multiple texts', async () => {
      const texts = ['text1', 'text2'];
      mockJinaClient.embeddings.mockResolvedValueOnce({
        data: [
          { embedding: [0.1, 0.2] },
          { embedding: [0.3, 0.4] }
        ]
      });
      
      const embeddings = await jinaEmbedding.getTextEmbeddings(texts);
      
      expect(embeddings).toEqual([[0.1, 0.2], [0.3, 0.4]]);
    });

    it('should handle batch processing', async () => {
      const texts = Array(25).fill('text');
      jinaEmbedding.batchSize = 10;
      
      await jinaEmbedding.getTextEmbeddings(texts);
      
      // Should be called 3 times (10 + 10 + 5)
      expect(mockJinaClient.embeddings).toHaveBeenCalledTimes(3);
    });

    it('should include rate limiting between batches', async () => {
      const texts = Array(20).fill('text');
      jinaEmbedding.batchSize = 10;
      
      const start = Date.now();
      await jinaEmbedding.getTextEmbeddings(texts);
      const duration = Date.now() - start;
      
      // Should have at least 100ms delay between 2 batches
      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });
});