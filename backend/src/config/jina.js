const axios = require('axios');
const { getConfig } = require('./index');

class JinaConfig {
  constructor() {
    this.config = null;
    this.client = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    this.config = this.getJinaConfig();
    this.validateConfig();
    this.createClient();
    this.initialized = true;
    
    console.log('Jina AI configuration initialized');
  }

  getJinaConfig() {
    const config = getConfig();
    return {
      apiKey: config.raw.JINA_API_KEY,
      baseURL: 'https://api.jina.ai/v1',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
    };
  }

  validateConfig() {
    if (!this.config.apiKey) {
      throw new Error('Jina API key is required');
    }

    if (this.config.apiKey.length < 10) {
      throw new Error('Jina API key appears to be invalid');
    }

    if (!this.config.apiKey.startsWith('jina_')) {
      console.warn('Jina API key format may be incorrect (should start with "jina_")');
    }
  }

  createClient() {
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Info': 'ai-course-creator-backend',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        console.log(`Jina API Request: ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`Jina API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 429 && !originalRequest._retry) {
          originalRequest._retry = true;
          const retryAfter = error.response.headers['retry-after'] || 1;
          console.log(`Jina API rate limited, retrying after ${retryAfter}s`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.client(originalRequest);
        }

        if (error.response?.status >= 500 && originalRequest._retryCount < this.config.maxRetries) {
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
          console.log(`Jina API server error, retry ${originalRequest._retryCount}/${this.config.maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
          return this.client(originalRequest);
        }

        return Promise.reject(error);
      }
    );
  }

  getClient() {
    if (!this.client) {
      throw new Error('Jina client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  getEmbeddingModels() {
    return {
      'jina-embeddings-v2-base-en': {
        dimensions: 768,
        maxTokens: 8192,
        languages: ['en'],
        use_case: 'general',
      },
      'jina-embeddings-v2-small-en': {
        dimensions: 512,
        maxTokens: 8192,
        languages: ['en'],
        use_case: 'fast_retrieval',
      },
      'jina-embeddings-v3': {
        dimensions: 1024,
        maxTokens: 8192,
        languages: ['multilingual'],
        use_case: 'latest',
      },
    };
  }

  getRerankModels() {
    return {
      'jina-reranker-v1-base-en': {
        maxTokens: 8192,
        languages: ['en'],
        use_case: 'general',
      },
      'jina-reranker-v1-turbo-en': {
        maxTokens: 8192,
        languages: ['en'],
        use_case: 'fast',
      },
      'jina-reranker-v2-base-multilingual': {
        maxTokens: 8192,
        languages: ['multilingual'],
        use_case: 'multilingual',
      },
    };
  }

  getDefaultEmbeddingModel() {
    return 'jina-embeddings-v3';
  }

  getDefaultRerankModel() {
    return 'jina-reranker-v1-base-en';
  }

  validateEmbeddingRequest(texts, model) {
    const modelConfig = this.getEmbeddingModels()[model];
    if (!modelConfig) {
      throw new Error(`Unsupported embedding model: ${model}`);
    }

    if (!Array.isArray(texts)) {
      throw new Error('Texts must be an array');
    }

    if (texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    if (texts.length > 100) {
      throw new Error('Maximum 100 texts per request');
    }

    const invalidTexts = texts.filter(text => typeof text !== 'string' || text.trim().length === 0);
    if (invalidTexts.length > 0) {
      throw new Error('All texts must be non-empty strings');
    }

    return true;
  }

  validateRerankRequest(query, documents, model) {
    const modelConfig = this.getRerankModels()[model];
    if (!modelConfig) {
      throw new Error(`Unsupported rerank model: ${model}`);
    }

    if (typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }

    if (!Array.isArray(documents)) {
      throw new Error('Documents must be an array');
    }

    if (documents.length === 0) {
      throw new Error('Documents array cannot be empty');
    }

    if (documents.length > 100) {
      throw new Error('Maximum 100 documents per request');
    }

    const invalidDocs = documents.filter(doc => typeof doc !== 'string' || doc.trim().length === 0);
    if (invalidDocs.length > 0) {
      throw new Error('All documents must be non-empty strings');
    }

    return true;
  }

  async testConnection() {
    try {
      const response = await this.client.get('/models');
      console.log('Jina API connection test successful');
      return true;
    } catch (error) {
      console.error('Jina API connection test failed:', error.message);
      return false;
    }
  }

  getUsageConfig() {
    return {
      embedding: {
        batchSize: 50,
        concurrency: 3,
        timeout: 30000,
        retries: 3,
      },
      reranking: {
        batchSize: 100,
        concurrency: 2,
        timeout: 30000,
        retries: 3,
      },
      rateLimit: {
        requestsPerMinute: 200,
        tokensPerMinute: 1000000,
      },
    };
  }

  getConfig() {
    return {
      baseURL: this.config.baseURL,
      hasApiKey: !!this.config.apiKey,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      initialized: this.initialized,
      embeddingModels: Object.keys(this.getEmbeddingModels()),
      rerankModels: Object.keys(this.getRerankModels()),
      defaultEmbeddingModel: this.getDefaultEmbeddingModel(),
      defaultRerankModel: this.getDefaultRerankModel(),
    };
  }
}

const jinaConfig = new JinaConfig();

module.exports = {
  jinaConfig,
  initialize: () => jinaConfig.initialize(),
  getClient: () => jinaConfig.getClient(),
  getEmbeddingModels: () => jinaConfig.getEmbeddingModels(),
  getRerankModels: () => jinaConfig.getRerankModels(),
  getDefaultEmbeddingModel: () => jinaConfig.getDefaultEmbeddingModel(),
  getDefaultRerankModel: () => jinaConfig.getDefaultRerankModel(),
  validateEmbeddingRequest: (texts, model) => jinaConfig.validateEmbeddingRequest(texts, model),
  validateRerankRequest: (query, documents, model) => jinaConfig.validateRerankRequest(query, documents, model),
  testConnection: () => jinaConfig.testConnection(),
  getUsageConfig: () => jinaConfig.getUsageConfig(),
  getConfig: () => jinaConfig.getConfig(),
};