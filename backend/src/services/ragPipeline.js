const {
  Document,
  VectorStoreIndex,
  IngestionPipeline,
  SentenceSplitter,
  Settings,
  SimpleKeywordTableIndex,
  QueryFusionRetriever,
  BaseEmbedding
} = require('llamaindex');
const JinaClient = require('./jinaClient');
// Load environment variables directly
require('dotenv').config();
const env = process.env;
const { supabaseAdmin } = require('../config/database-simple');
const natural = require('natural');

class JinaEmbedding extends BaseEmbedding {
  constructor(jinaClient, options = {}) {
    super();
    this.jinaClient = jinaClient;
    this.model = options.model || 'jina-embeddings-v4';
    this.dimensions = options.dimensions || 1024;
    this.taskType = options.taskType || 'retrieval.passage';
    this.batchSize = options.batchSize || 10;
  }

  async getTextEmbedding(text) {
    try {
      const result = await this.jinaClient.embeddings([text], {
        model: this.model,
        task: this.taskType,
        dimensions: this.dimensions,
        normalized: true
      });
      return result.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  async getTextEmbeddings(texts) {
    try {
      const batches = [];
      for (let i = 0; i < texts.length; i += this.batchSize) {
        batches.push(texts.slice(i, i + this.batchSize));
      }

      const allEmbeddings = [];
      for (const batch of batches) {
        const result = await this.jinaClient.embeddings(batch, {
          model: this.model,
          task: this.taskType,
          dimensions: this.dimensions,
          normalized: true
        });
        allEmbeddings.push(...result.data.map(item => item.embedding));
        
        // Rate limiting - small delay between batches
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      return allEmbeddings;
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw new Error(`Failed to generate batch embeddings: ${error.message}`);
    }
  }
}

class RAGPipeline {
  constructor() {
    this.jinaClient = new JinaClient(env.JINA_API_KEY);
    this.embeddingService = new JinaEmbedding(this.jinaClient);
    this.vectorIndex = null;
    this.keywordIndex = null;
    this.hybridRetriever = null;
    this.queryEngine = null;
    
    // Pipeline configuration
    this.chunkSize = parseInt(env.MAX_CHUNK_SIZE) || 1000;
    this.chunkOverlap = parseInt(env.OVERLAP_SIZE) || 50;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    
    // Hybrid search configuration
    this.semanticWeight = 0.7; // Weight for semantic search
    this.keywordWeight = 0.3;  // Weight for keyword search
    this.fusionMode = 'rrf';   // Reciprocal Rank Fusion
    
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('Initializing RAG Pipeline...');
      
      // Configure LlamaIndex settings
      Settings.embedModel = this.embeddingService;
      Settings.chunkSize = this.chunkSize;
      Settings.chunkOverlap = this.chunkOverlap;

      console.log(' RAG Pipeline initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('L Failed to initialize RAG Pipeline:', error);
      throw new Error(`RAG Pipeline initialization failed: ${error.message}`);
    }
  }

  async ingestDocuments(documents, courseId, options = {}) {
    await this.initialize();
    
    try {
      console.log(`Ingesting ${documents.length} documents for course ${courseId}`);
      
      const results = {
        success: [],
        failed: [],
        totalChunks: 0,
        averageQuality: 0,
        processedNodes: []
      };

      // Configure ingestion pipeline
      const pipeline = new IngestionPipeline({
        transformations: [
          new SentenceSplitter({
            chunkSize: this.chunkSize,
            chunkOverlap: this.chunkOverlap
          })
        ]
      });

      for (const doc of documents) {
        try {
          console.log(`Processing document: ${doc.metadata?.title || 'Unknown'}`);
          
          // Filter by quality if specified
          const qualityThreshold = options.qualityThreshold || 0;
          const docQuality = doc.metadata?.quality_score || 0;
          
          if (docQuality < qualityThreshold) {
            console.log(`Skipping document with quality ${docQuality} below threshold ${qualityThreshold}`);
            results.failed.push({
              document: doc.metadata?.title || 'Unknown',
              reason: 'Quality below threshold'
            });
            continue;
          }

          // Create LlamaIndex Document
          const llamaDoc = new Document({
            text: doc.text,
            metadata: {
              ...doc.metadata,
              course_id: courseId,
              ingestion_timestamp: new Date().toISOString(),
              chunk_strategy: options.chunkStrategy || 'sentence'
            }
          });

          // Process through pipeline
          const nodes = await pipeline.run({
            documents: [llamaDoc]
          });

          // Generate embeddings for each node
          const nodeTexts = nodes.map(node => node.text);
          const embeddings = await this.embeddingService.getTextEmbeddings(nodeTexts);

          // Attach embeddings to nodes
          nodes.forEach((node, index) => {
            node.embedding = embeddings[index];
            node.metadata = {
              ...node.metadata,
              embedding_model: 'jina-embeddings-v4',
              chunk_index: index,
              total_chunks: nodes.length
            };
          });

          results.processedNodes.push(...nodes);
          results.totalChunks += nodes.length;

          // Store embedding metadata in database
          await this.storeEmbeddingMetadata(courseId, doc, nodes.length);

          results.success.push({
            document: doc.metadata?.title || 'Unknown',
            chunks: nodes.length,
            quality: docQuality
          });

          console.log(` Successfully processed document with ${nodes.length} chunks`);

        } catch (error) {
          console.error(`L Failed to process document:`, error);
          results.failed.push({
            document: doc.metadata?.title || 'Unknown',
            reason: error.message
          });
        }
      }

      // Calculate average quality
      const successfulDocs = results.success.filter(doc => doc.quality > 0);
      results.averageQuality = successfulDocs.length > 0 
        ? successfulDocs.reduce((sum, doc) => sum + doc.quality, 0) / successfulDocs.length 
        : 0;

      // Create hybrid indexes from processed nodes
      if (results.processedNodes.length > 0) {
        const documents = results.processedNodes.map(node => new Document({
          text: node.text,
          metadata: node.metadata
        }));

        // Create vector index for semantic search
        this.vectorIndex = await VectorStoreIndex.fromDocuments(documents);

        // Create keyword index for BM25/keyword search
        this.keywordIndex = await SimpleKeywordTableIndex.fromDocuments(documents);

        // Setup hybrid retriever with query fusion
        this.hybridRetriever = new QueryFusionRetriever({
          retrievers: [
            this.vectorIndex.asRetriever({ similarityTopK: 15 }),
            this.keywordIndex.asRetriever({ topK: 15 })
          ],
          mode: this.fusionMode,
          numQueries: 3, // Generate 3 query variations for better coverage
          useAsyncMode: true
        });

        // Setup query engine with hybrid retrieval and reranking
        this.queryEngine = this.vectorIndex.asQueryEngine({
          retriever: this.hybridRetriever,
          similarityTopK: 20,
          responseSynthesizer: {
            responseMode: 'compact'
          }
        });
      }

      console.log(` Ingestion complete: ${results.success.length} success, ${results.failed.length} failed, ${results.totalChunks} total chunks`);
      return results;

    } catch (error) {
      console.error('Error in document ingestion:', error);
      throw new Error(`Document ingestion failed: ${error.message}`);
    }
  }

  async retrieveRelevantContent(query, filters = {}) {
    await this.initialize();
    
    if (!this.queryEngine) {
      throw new Error('No documents have been ingested yet. Please ingest documents first.');
    }

    try {
      console.log(`Retrieving content for query: "${query.substring(0, 100)}..."`);
      
      let documents = [];
      
      // Choose retrieval strategy based on filters
      if (filters.searchMode === 'semantic' && this.vectorIndex) {
        // Pure semantic search
        documents = await this.performSemanticSearch(query, filters);
      } else if (filters.searchMode === 'keyword' && this.keywordIndex) {
        // Pure keyword search
        documents = await this.performKeywordSearch(query, filters);
      } else if (this.hybridRetriever) {
        // Hybrid search (default)
        documents = await this.performHybridSearch(query, filters);
      } else {
        // Fallback to standard query engine
        const response = await this.queryEngine.query({
          query: query,
          similarityTopK: filters.topK || 10
        });
        
        const sourceNodes = response.sourceNodes || [];
        documents = sourceNodes.map(node => ({
          id: node.id,
          text: node.text || node.node?.text || '',
          score: node.score,
          metadata: node.metadata || node.node?.metadata || {},
          searchType: 'standard'
        }));
      }

      // Apply quality filtering
      if (filters.minQuality) {
        documents = documents.filter(doc => 
          (doc.metadata.quality_score || 0) >= filters.minQuality
        );
      }

      // Apply course filtering
      if (filters.courseId) {
        documents = documents.filter(doc => 
          doc.metadata.course_id === filters.courseId
        );
      }

      // Apply reranking if enabled and we have multiple results
      let rankedResults = documents;
      if (filters.enableReranking !== false && documents.length > 1) {
        rankedResults = await this.rerankResults(documents, query, {
          topN: filters.finalTopK || Math.min(10, documents.length)
        });
      }

      console.log(` Retrieved ${rankedResults.length} relevant chunks`);
      return {
        results: rankedResults,
        query: query,
        totalFound: documents.length,
        searchType: documents[0]?.searchType || 'hybrid',
        filters: filters
      };

    } catch (error) {
      console.error('Error retrieving relevant content:', error);
      throw new Error(`Content retrieval failed: ${error.message}`);
    }
  }

  async performSemanticSearch(query, filters = {}) {
    try {
      const retriever = this.vectorIndex.asRetriever({
        similarityTopK: filters.topK || 10
      });
      
      const nodes = await retriever.retrieve(query);
      return nodes.map(node => ({
        id: node.id,
        text: node.text || node.node?.text || '',
        score: node.score,
        metadata: node.metadata || node.node?.metadata || {},
        searchType: 'semantic'
      }));
    } catch (error) {
      console.error('Error in semantic search:', error);
      throw error;
    }
  }

  async performKeywordSearch(query, filters = {}) {
    try {
      const retriever = this.keywordIndex.asRetriever({
        topK: filters.topK || 10
      });
      
      const nodes = await retriever.retrieve(query);
      return nodes.map(node => ({
        id: node.id,
        text: node.text || node.node?.text || '',
        score: node.score,
        metadata: node.metadata || node.node?.metadata || {},
        searchType: 'keyword'
      }));
    } catch (error) {
      console.error('Error in keyword search:', error);
      throw error;
    }
  }

  async performHybridSearch(query, filters = {}) {
    try {
      // Use hybrid retriever for combined semantic + keyword search
      const nodes = await this.hybridRetriever.retrieve(query);
      
      // Calculate hybrid scores
      const results = nodes.map(node => ({
        id: node.id,
        text: node.text || node.node?.text || '',
        score: node.score,
        metadata: node.metadata || node.node?.metadata || {},
        searchType: 'hybrid'
      }));

      // Sort by hybrid score (already done by QueryFusionRetriever)
      return results.slice(0, filters.topK || 10);
    } catch (error) {
      console.error('Error in hybrid search:', error);
      // Fallback to semantic search
      return await this.performSemanticSearch(query, filters);
    }
  }

  async generateQueryEmbedding(query) {
    try {
      return await this.jinaClient.embeddings([query], {
        model: 'jina-embeddings-v4',
        task: 'retrieval.query',
        dimensions: this.embeddingService.dimensions,
        normalized: true
      }).then(result => result.data[0].embedding);
    } catch (error) {
      console.error('Error generating query embedding:', error);
      throw new Error(`Query embedding generation failed: ${error.message}`);
    }
  }

  async rerankResults(results, query, options = {}) {
    try {
      if (results.length <= 1) return results;

      console.log(`Reranking ${results.length} results`);
      
      const documents = results.map(result => result.text);
      const rerankResponse = await this.jinaClient.rerank(query, documents, {
        model: 'jina-reranker-m0',
        top_n: options.topN || 10,
        return_documents: false
      });

      // Map reranked results back to original format
      const rerankedResults = rerankResponse.results.map(item => ({
        ...results[item.index],
        relevanceScore: item.relevance_score,
        originalIndex: item.index
      }));

      console.log(` Reranked to ${rerankedResults.length} top results`);
      return rerankedResults;

    } catch (error) {
      console.error('Error reranking results:', error);
      // Fallback to original results if reranking fails
      return results.slice(0, options.topN || 10);
    }
  }

  async storeEmbeddingMetadata(courseId, document, chunkCount) {
    try {
      const { error } = await supabaseAdmin
        .from('content_embeddings')
        .insert({
          course_id: courseId,
          resource_id: document.metadata?.resource_id,
          chunk_count: chunkCount,
          embedding_model: 'jina-embeddings-v4',
          chunk_strategy: document.metadata?.chunk_strategy || 'sentence',
          quality_score: document.metadata?.quality_score || 0,
          language: document.metadata?.language || 'en',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing embedding metadata:', error);
      }
    } catch (error) {
      console.error('Error storing embedding metadata:', error);
    }
  }

  async searchSimilar(text, options = {}) {
    await this.initialize();
    
    if (!this.vectorIndex) {
      throw new Error('No index available. Please ingest documents first.');
    }

    try {
      // Use hybrid search if available, otherwise fall back to semantic
      if (this.hybridRetriever && options.searchMode !== 'semantic') {
        return await this.performHybridSearch(text, { topK: options.limit || 10 });
      } else {
        return await this.performSemanticSearch(text, { topK: options.limit || 10 });
      }

    } catch (error) {
      console.error('Error in similarity search:', error);
      throw new Error(`Similarity search failed: ${error.message}`);
    }
  }

  async healthCheck() {
    try {
      // Check Jina API
      let jinaHealth = 'healthy';
      try {
        await this.jinaClient.embeddings(['test'], { 
          model: 'jina-embeddings-v4',
          task: 'retrieval.query' 
        });
      } catch (error) {
        jinaHealth = 'unhealthy';
      }

      return {
        status: jinaHealth === 'healthy' ? 'healthy' : 'degraded',
        components: {
          jina: jinaHealth,
          initialized: this.initialized,
          hasVectorIndex: !!this.vectorIndex,
          hasKeywordIndex: !!this.keywordIndex,
          hasHybridRetriever: !!this.hybridRetriever,
          hasQueryEngine: !!this.queryEngine
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getStats() {
    return {
      initialized: this.initialized,
      hasVectorIndex: !!this.vectorIndex,
      hasKeywordIndex: !!this.keywordIndex,
      hasHybridRetriever: !!this.hybridRetriever,
      hasQueryEngine: !!this.queryEngine,
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
      embeddingModel: 'jina-embeddings-v4',
      rerankerModel: 'jina-reranker-m0',
      searchCapabilities: {
        semantic: !!this.vectorIndex,
        keyword: !!this.keywordIndex,
        hybrid: !!this.hybridRetriever
      },
      hybridConfig: {
        semanticWeight: this.semanticWeight,
        keywordWeight: this.keywordWeight,
        fusionMode: this.fusionMode
      }
    };
  }

  reset() {
    this.vectorIndex = null;
    this.keywordIndex = null;
    this.hybridRetriever = null;
    this.queryEngine = null;
    this.initialized = false;
  }
}

// Export singleton instance
const ragPipeline = new RAGPipeline();

module.exports = {
  RAGPipeline,
  ragPipeline,
  JinaEmbedding
};