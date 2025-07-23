const JinaClient = require('../../../src/services/jinaClient');
const axios = require('axios');

jest.mock('axios');

describe('JinaClient', () => {
  let jinaClient;
  const mockApiKey = 'test-api-key-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jinaClient = new JinaClient(mockApiKey);
  });

  describe('constructor', () => {
    it('should initialize with API key and endpoints', () => {
      expect(jinaClient.apiKey).toBe(mockApiKey);
      expect(jinaClient.endpoints).toHaveProperty('embeddings');
      expect(jinaClient.endpoints).toHaveProperty('rerank');
      expect(jinaClient.endpoints).toHaveProperty('reader');
      expect(jinaClient.endpoints).toHaveProperty('search');
      expect(jinaClient.endpoints).toHaveProperty('classify');
      expect(jinaClient.endpoints).toHaveProperty('segment');
    });
  });

  describe('embeddings', () => {
    const mockResponse = {
      data: {
        data: [
          {
            object: 'embedding',
            index: 0,
            embedding: Array(768).fill(0.1)
          }
        ],
        model: 'jina-embeddings-v3',
        usage: {
          total_tokens: 10
        }
      }
    };

    it('should generate embeddings for single input', async () => {
      axios.post.mockResolvedValue(mockResponse);

      const result = await jinaClient.embeddings('Hello world');

      expect(axios.post).toHaveBeenCalledWith(
        jinaClient.endpoints.embeddings,
        {
          model: 'jina-embeddings-v3',
          input: ['Hello world'],
          embedding_type: 'float',
          task: 'retrieval.passage',
          dimensions: undefined,
          normalized: false,
          late_chunking: false,
          truncate: false
        },
        {
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should generate embeddings for multiple inputs', async () => {
      axios.post.mockResolvedValue(mockResponse);

      const inputs = ['Hello', 'World'];
      const result = await jinaClient.embeddings(inputs);

      expect(axios.post).toHaveBeenCalledWith(
        jinaClient.endpoints.embeddings,
        expect.objectContaining({
          input: inputs
        }),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should accept custom options', async () => {
      axios.post.mockResolvedValue(mockResponse);

      const options = {
        model: 'jina-embeddings-v2',
        embedding_type: 'binary',
        task: 'retrieval.query',
        dimensions: 512,
        normalized: true,
        late_chunking: true,
        truncate: true
      };

      await jinaClient.embeddings('Test text', options);

      expect(axios.post).toHaveBeenCalledWith(
        jinaClient.endpoints.embeddings,
        expect.objectContaining({
          model: 'jina-embeddings-v2',
          embedding_type: 'binary',
          task: 'retrieval.query',
          dimensions: 512,
          normalized: true,
          late_chunking: true,
          truncate: true
        }),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      error.response = { status: 401, data: { error: 'Unauthorized' } };
      axios.post.mockRejectedValue(error);

      await expect(jinaClient.embeddings('Test'))
        .rejects.toThrow('API Error');
    });
  });

  describe('rerank', () => {
    const mockQuery = 'What is machine learning?';
    const mockDocuments = [
      'Machine learning is a subset of AI.',
      'Dogs are domestic animals.',
      'ML algorithms learn from data.'
    ];

    const mockResponse = {
      data: {
        model: 'jina-reranker-v2-base-multilingual',
        results: [
          { index: 0, document: mockDocuments[0], relevance_score: 0.9 },
          { index: 2, document: mockDocuments[2], relevance_score: 0.8 },
          { index: 1, document: mockDocuments[1], relevance_score: 0.1 }
        ],
        usage: { total_tokens: 50 }
      }
    };

    it('should rerank documents', async () => {
      axios.post.mockResolvedValue(mockResponse);

      const result = await jinaClient.rerank(mockQuery, mockDocuments);

      expect(axios.post).toHaveBeenCalledWith(
        jinaClient.endpoints.rerank,
        {
          model: 'jina-reranker-v2-base-multilingual',
          query: mockQuery,
          documents: mockDocuments,
          top_n: undefined,
          return_documents: true
        },
        {
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should accept custom options', async () => {
      axios.post.mockResolvedValue(mockResponse);

      const options = {
        model: 'jina-reranker-v1',
        top_n: 2,
        return_documents: false
      };

      await jinaClient.rerank(mockQuery, mockDocuments, options);

      expect(axios.post).toHaveBeenCalledWith(
        jinaClient.endpoints.rerank,
        expect.objectContaining({
          model: 'jina-reranker-v1',
          top_n: 2,
          return_documents: false
        }),
        expect.any(Object)
      );
    });

    it('should handle empty documents', async () => {
      axios.post.mockResolvedValue({ data: { results: [] } });

      const result = await jinaClient.rerank(mockQuery, []);

      expect(result.results).toEqual([]);
    });
  });

  describe('reader', () => {
    const mockUrl = 'https://example.com/article';
    const mockResponse = {
      data: {
        title: 'Example Article',
        content: 'This is the article content...',
        url: mockUrl,
        publishedAt: '2024-01-01'
      }
    };

    it('should read web content', async () => {
      axios.post.mockResolvedValue(mockResponse);

      const result = await jinaClient.reader(mockUrl);

      expect(axios.post).toHaveBeenCalledWith(
        jinaClient.endpoints.reader,
        { url: mockUrl },
        {
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include optional headers', async () => {
      axios.post.mockResolvedValue(mockResponse);

      const options = {
        engine: 'chrome',
        timeout: 30,
        targetSelector: '.article-content',
        waitForSelector: '.comments',
        removeSelector: '.ads',
        withLinksSummary: true,
        withImagesSummary: true,
        withGeneratedAlt: true,
        noCache: true,
        returnFormat: 'markdown'
      };

      await jinaClient.reader(mockUrl, options);

      expect(axios.post).toHaveBeenCalledWith(
        jinaClient.endpoints.reader,
        { url: mockUrl },
        {
          headers: expect.objectContaining({
            'X-Engine': 'chrome',
            'X-Timeout': 30,
            'X-Target-Selector': '.article-content',
            'X-Wait-For-Selector': '.comments',
            'X-Remove-Selector': '.ads',
            'X-With-Links-Summary': true,
            'X-With-Images-Summary': true,
            'X-With-Generated-Alt': true,
            'X-No-Cache': true,
            'X-Return-Format': 'markdown'
          })
        }
      );
    });

    it('should handle invalid URLs', async () => {
      const error = new Error('Invalid URL');
      error.response = { status: 400 };
      axios.post.mockRejectedValue(error);

      await expect(jinaClient.reader('not-a-url'))
        .rejects.toThrow('Invalid URL');
    });
  });

  describe('search', () => {
    const mockQuery = 'artificial intelligence news';
    const mockResponse = {
      data: {
        results: [
          {
            title: 'AI News Article 1',
            url: 'https://example.com/ai-news-1',
            snippet: 'Latest developments in AI...'
          },
          {
            title: 'AI News Article 2',
            url: 'https://example.com/ai-news-2',
            snippet: 'Machine learning breakthroughs...'
          }
        ]
      }
    };

    it('should search web content', async () => {
      axios.get.mockResolvedValue(mockResponse);

      const result = await jinaClient.search(mockQuery);

      expect(axios.get).toHaveBeenCalledWith(
        `${jinaClient.endpoints.search}${encodeURIComponent(mockQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Accept': 'application/json'
          }
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle special characters in query', async () => {
      axios.get.mockResolvedValue(mockResponse);

      const specialQuery = 'search with special chars: & ? #';
      await jinaClient.search(specialQuery);

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(specialQuery)),
        expect.any(Object)
      );
    });

    it('should handle empty results', async () => {
      axios.get.mockResolvedValue({ data: { results: [] } });

      const result = await jinaClient.search('very specific query');

      expect(result.results).toEqual([]);
    });
  });

  describe('segment', () => {
    const mockText = 'This is a long document. It has multiple paragraphs.\n\nThis is the second paragraph. It contains more information.';
    const mockResponse = {
      data: {
        chunks: [
          {
            text: 'This is a long document. It has multiple paragraphs.',
            start: 0,
            end: 52
          },
          {
            text: 'This is the second paragraph. It contains more information.',
            start: 54,
            end: 113
          }
        ],
        tokens: []
      }
    };

    it('should segment text into chunks', async () => {
      axios.post.mockResolvedValue(mockResponse);

      const result = await jinaClient.segment(mockText);

      expect(axios.post).toHaveBeenCalledWith(
        jinaClient.endpoints.segment,
        {
          content: mockText,
          return_chunks: true,
          return_tokens: false,
          max_chunk_length: 1000,
          segmenter: 'AUTO'
        },
        {
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should accept custom segmentation options', async () => {
      axios.post.mockResolvedValue(mockResponse);

      const options = {
        return_chunks: false,
        return_tokens: true,
        max_chunk_length: 500,
        segmenter: 'SENTENCE'
      };

      await jinaClient.segment(mockText, options);

      expect(axios.post).toHaveBeenCalledWith(
        jinaClient.endpoints.segment,
        expect.objectContaining({
          content: mockText,
          return_chunks: false,
          return_tokens: true,
          max_chunk_length: 500,
          segmenter: 'SENTENCE'
        }),
        expect.any(Object)
      );
    });

    it('should handle empty text', async () => {
      axios.post.mockResolvedValue({ data: { chunks: [] } });

      const result = await jinaClient.segment('');

      expect(result.chunks).toEqual([]);
    });

    it('should handle very long text', async () => {
      const longText = 'A'.repeat(10000);
      axios.post.mockResolvedValue({
        data: {
          chunks: [
            { text: 'A'.repeat(1000), start: 0, end: 1000 },
            { text: 'A'.repeat(1000), start: 1000, end: 2000 }
          ]
        }
      });

      const result = await jinaClient.segment(longText);

      expect(result.chunks.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      networkError.code = 'ECONNREFUSED';
      axios.post.mockRejectedValue(networkError);

      await expect(jinaClient.embeddings('test'))
        .rejects.toThrow('Network error');
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.response = { 
        status: 429, 
        data: { error: 'Too many requests' },
        headers: { 'retry-after': '60' }
      };
      axios.post.mockRejectedValue(rateLimitError);

      await expect(jinaClient.embeddings('test'))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized');
      authError.response = {
        status: 401,
        data: { error: 'Invalid API key' }
      };
      axios.post.mockRejectedValue(authError);

      await expect(jinaClient.embeddings('test'))
        .rejects.toThrow('Unauthorized');
    });

    it('should handle server errors', async () => {
      const serverError = new Error('Internal server error');
      serverError.response = {
        status: 500,
        data: { error: 'Server error' }
      };
      axios.post.mockRejectedValue(serverError);

      await expect(jinaClient.embeddings('test'))
        .rejects.toThrow('Internal server error');
    });
  });
});