const axios = require('axios');

class JinaClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.endpoints = {
      embeddings: 'https://api.jina.ai/v1/embeddings',
      rerank: 'https://api.jina.ai/v1/rerank',
      reader: 'https://r.jina.ai/',
      search: 'https://s.jina.ai/',
      classify: 'https://api.jina.ai/v1/classify',
      segment: 'https://api.jina.ai/v1/segment'
    };
  }

  async embeddings(input, options = {}) {
    const response = await axios.post(this.endpoints.embeddings, {
      model: options.model || 'jina-embeddings-v3',
      input: Array.isArray(input) ? input : [input],
      embedding_type: options.embedding_type || 'float',
      task: options.task || 'retrieval.passage',
      dimensions: options.dimensions,
      normalized: options.normalized || false,
      late_chunking: options.late_chunking || false,
      truncate: options.truncate || false
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    return response.data;
  }

  async rerank(query, documents, options = {}) {
    const response = await axios.post(this.endpoints.rerank, {
      model: options.model || 'jina-reranker-v2-base-multilingual',
      query: query,
      documents: documents,
      top_n: options.top_n,
      return_documents: options.return_documents !== false
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    return response.data;
  }

  async reader(url, options = {}) {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Add optional headers
    if (options.engine) headers['X-Engine'] = options.engine;
    if (options.timeout) headers['X-Timeout'] = options.timeout;
    if (options.targetSelector) headers['X-Target-Selector'] = options.targetSelector;
    if (options.waitForSelector) headers['X-Wait-For-Selector'] = options.waitForSelector;
    if (options.removeSelector) headers['X-Remove-Selector'] = options.removeSelector;
    if (options.withLinksSummary) headers['X-With-Links-Summary'] = options.withLinksSummary;
    if (options.withImagesSummary) headers['X-With-Images-Summary'] = options.withImagesSummary;
    if (options.withGeneratedAlt) headers['X-With-Generated-Alt'] = options.withGeneratedAlt;
    if (options.noCache) headers['X-No-Cache'] = options.noCache;
    if (options.returnFormat) headers['X-Return-Format'] = options.returnFormat;

    const response = await axios.post(this.endpoints.reader, { url }, { headers });
    return response.data;
  }

  async search(query, options = {}) {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Accept': 'application/json'
    };

    const url = `${this.endpoints.search}${encodeURIComponent(query)}`;
    const response = await axios.get(url, { headers });
    return response.data;
  }

  async segment(text, options = {}) {
    const response = await axios.post(this.endpoints.segment, {
      content: text,
      return_chunks: options.return_chunks !== false,
      return_tokens: options.return_tokens || false,
      max_chunk_length: options.max_chunk_length || 1000,
      segmenter: options.segmenter || 'AUTO'
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    return response.data;
  }
}

module.exports = JinaClient;