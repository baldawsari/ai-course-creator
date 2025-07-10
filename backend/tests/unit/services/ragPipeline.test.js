const { RAGPipeline } = require('../../../src/services/ragPipeline');
const { mockData, generateMockChunks, generateMockSearchResults } = require('../../utils/mockData');
const { testHelpers } = require('../../utils/testHelpers');

// Mock dependencies
jest.mock('../../../src/services/jinaClient', () => {
  return jest.fn().mockImplementation(() => ({
    embeddings: jest.fn(),
    rerank: jest.fn(),
  }));
});

jest.mock('../../../src/config/database-simple', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

jest.mock('llamaindex', () => ({
  Document: jest.fn().mockImplementation((opts) => ({ 
    text: opts.text, 
    metadata: opts.metadata 
  })),
  VectorStoreIndex: {
    fromDocuments: jest.fn().mockResolvedValue({
      asRetriever: jest.fn().mockReturnValue({
        retrieve: jest.fn().mockResolvedValue([])
      }),
      asQueryEngine: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue({
          response: 'Test response',
          sourceNodes: []
        })
      })
    }),
  },
  IngestionPipeline: jest.fn().mockImplementation(() => ({
    run: jest.fn().mockResolvedValue([
      { text: 'chunk 1', metadata: { chunk_index: 0 } },
      { text: 'chunk 2', metadata: { chunk_index: 1 } }
    ]),
  })),
  SentenceSplitter: jest.fn().mockImplementation(() => ({})),
  Settings: {
    embedModel: null,
    chunkSize: 1000,
    chunkOverlap: 50,
  },
  SimpleKeywordTableIndex: {
    fromDocuments: jest.fn().mockResolvedValue({
      asRetriever: jest.fn().mockReturnValue({
        retrieve: jest.fn().mockResolvedValue([])
      })
    }),
  },
  QueryFusionRetriever: jest.fn().mockImplementation(() => ({
    retrieve: jest.fn(),
  })),
  BaseEmbedding: class MockBaseEmbedding {},
}));

describe('RAGPipeline Service', () => {
  let ragPipeline;
  let mockJinaClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up JinaClient mock
    const JinaClient = require('../../../src/services/jinaClient');
    mockJinaClient = {
      embeddings: jest.fn(),
      rerank: jest.fn(),
    };
    JinaClient.mockImplementation(() => mockJinaClient);
    
    // Create pipeline instance
    ragPipeline = new RAGPipeline();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ingestDocuments', () => {
    it('should successfully ingest documents through the RAG pipeline', async () => {
      const documents = [
        {
          text: 'This is test document content',
          metadata: { title: 'Test Document', quality_score: 85 }
        }
      ];
      const courseId = 'course-123';

      // Mock embeddings
      mockJinaClient.embeddings.mockResolvedValue({
        data: [
          { embedding: testHelpers.generateMockVector() },
          { embedding: testHelpers.generateMockVector() }
        ],
      });

      const result = await ragPipeline.ingestDocuments(documents, courseId);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('totalChunks');
      expect(result.success).toHaveLength(1);
      expect(result.success[0]).toHaveProperty('document', 'Test Document');
      expect(mockJinaClient.embeddings).toHaveBeenCalled();
    });

    it('should handle documents with low quality', async () => {
      const lowQualityDoc = {
        text: 'Short text',
        metadata: { title: 'Low Quality', quality_score: 30 }
      };
      const courseId = 'course-123';

      const result = await ragPipeline.ingestDocuments([lowQualityDoc], courseId, { 
        qualityThreshold: 50 
      });

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].reason).toBe('Quality below threshold');
      expect(result.success).toHaveLength(0);
    });

    it('should handle embedding generation errors', async () => {
      const documents = [
        {
          text: 'Test document content',
          metadata: { title: 'Test Document', quality_score: 85 }
        }
      ];
      const courseId = 'course-123';

      // Mock embedding error
      mockJinaClient.embeddings.mockRejectedValue(new Error('Embedding API error'));

      const result = await ragPipeline.ingestDocuments(documents, courseId);
      
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].reason).toContain('Embedding API error');
      expect(result.success).toHaveLength(0);
    });

  });

  describe('searchSimilar', () => {
    it('should perform semantic search successfully', async () => {
      const query = 'What is machine learning?';
      
      // Mock that vector index exists
      ragPipeline.vectorIndex = {
        asRetriever: jest.fn().mockReturnValue({
          retrieve: jest.fn().mockResolvedValue([
            { 
              id: '1', 
              score: 0.9, 
              text: 'ML content 1',
              metadata: { title: 'ML Basics' }
            },
            { 
              id: '2', 
              score: 0.8, 
              text: 'ML content 2',
              metadata: { title: 'ML Advanced' }
            },
          ])
        })
      };

      const results = await ragPipeline.searchSimilar(query);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('score', 0.9);
      expect(results[0]).toHaveProperty('text', 'ML content 1');
      expect(results[0]).toHaveProperty('searchType', 'semantic');
    });

    it('should handle search with no results', async () => {
      const query = 'Non-existent topic';

      // Mock that vector index exists but returns no results
      ragPipeline.vectorIndex = {
        asRetriever: jest.fn().mockReturnValue({
          retrieve: jest.fn().mockResolvedValue([])
        })
      };

      const results = await ragPipeline.searchSimilar(query);

      expect(results).toHaveLength(0);
    });

    it('should handle missing vector index', async () => {
      const query = 'Machine learning';
      
      // Ensure vector index is null
      ragPipeline.vectorIndex = null;

      await expect(ragPipeline.searchSimilar(query))
        .rejects.toThrow('No index available. Please ingest documents first.');
    });
  });

  describe('retrieveRelevantContent', () => {
    it('should retrieve relevant content using query engine', async () => {
      const query = 'What is machine learning?';
      
      // Mock that query engine exists
      ragPipeline.queryEngine = {
        query: jest.fn().mockResolvedValue({
          response: 'Machine learning is a subset of artificial intelligence.',
          sourceNodes: [
            {
              node: {
                text: 'ML content 1',
                metadata: { title: 'ML Basics' }
              },
              score: 0.9
            }
          ]
        })
      };

      const results = await ragPipeline.retrieveRelevantContent(query);

      expect(results).toHaveProperty('response');
      expect(results).toHaveProperty('sources');
      expect(results.sources).toHaveLength(1);
      expect(results.sources[0]).toHaveProperty('score', 0.9);
    });

    it('should handle empty query', async () => {
      const query = '';
      
      await expect(ragPipeline.retrieveRelevantContent(query))
        .rejects.toThrow('Query cannot be empty');
    });
  });

  describe('rerankResults', () => {
    it('should rerank search results', async () => {
      const query = 'Machine learning basics';
      const results = [
        { text: 'Advanced ML algorithms', score: 0.7 },
        { text: 'Introduction to machine learning', score: 0.8 },
        { text: 'Deep learning fundamentals', score: 0.6 },
      ];

      mockJinaClient.rerank.mockResolvedValue({
        results: [
          { index: 1, relevance_score: 0.95 },
          { index: 2, relevance_score: 0.80 },
          { index: 0, relevance_score: 0.65 },
        ],
      });

      const reranked = await ragPipeline.rerankResults(results, query);

      expect(reranked).toHaveLength(3);
      expect(reranked[0].text).toBe('Introduction to machine learning');
      expect(reranked[0].score).toBe(0.95);
    });

    it('should handle reranking errors gracefully', async () => {
      const query = 'Test query';
      const results = [
        { text: 'Doc 1', score: 0.8 },
        { text: 'Doc 2', score: 0.6 }
      ];

      mockJinaClient.rerank.mockRejectedValue(new Error('Reranking API error'));

      // Should return original order on error
      const reranked = await ragPipeline.rerankResults(results, query);

      expect(reranked).toHaveLength(2);
      expect(reranked[0].text).toBe('Doc 1');
      expect(reranked[0].score).toBe(0.8);
    });
  });

  describe('healthCheck', () => {
    it('should perform health check on RAG pipeline', async () => {
      const health = await ragPipeline.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('components');
      expect(health.components).toHaveProperty('pipeline');
      expect(health.components).toHaveProperty('embedding');
    });
  });

  describe('getStats', () => {
    it('should retrieve pipeline statistics', async () => {
      const stats = await ragPipeline.getStats();

      expect(stats).toHaveProperty('chunkSize');
      expect(stats).toHaveProperty('chunkOverlap');
      expect(stats).toHaveProperty('initialized');
      expect(stats).toHaveProperty('vectorIndex');
      expect(stats).toHaveProperty('keywordIndex');
    });
  });
});