# SERVICES.md

Service Documentation for AI Course Creator

## Advanced Document Processing Pipeline

### Upload System Architecture
The file upload system supports multiple file types and URL processing with comprehensive validation and async processing:

1. **Upload** → Multer validation → Temporary storage → Queue job creation
2. **Processing** → File type detection → Content extraction → Storage upload
3. **Document Analysis** → Quality assessment → Language detection → Content preprocessing
4. **Smart Chunking** → Semantic/sentence/paragraph/fixed-size strategies → Chunk optimization
5. **Quality Scoring** → Readability analysis → Coherence assessment → Error detection
6. **Embedding Generation** → Chunk-based embeddings → Vector storage → Metadata preservation
7. **Cleanup** → Temporary file removal → Status updates → Error recovery

### Document Processing Features

#### Quality Assessment (0-100 scale)
- Readability scoring (Flesch-Kincaid, Gunning Fog, SMOG, etc.)
- Content coherence analysis between chunks
- Error detection (encoding issues, truncation, duplication)
- Completeness and distribution analysis

#### Intelligent Chunking Strategies
- **Semantic:** Preserves content coherence and topic boundaries
- **Sentence:** Maintains complete sentences for readability
- **Paragraph:** Preserves document structure and logical grouping
- **Fixed-size:** Consistent token counts with overlap for continuity

#### Content Preprocessing
- Language detection with 50+ language support
- Encoding normalization (UTF-8, Latin1, ASCII)
- Special character handling and content deduplication
- Metadata extraction (title, word count, reading time, key phrases)

### Supported File Types
- **PDF Files:** Text extraction with metadata parsing, handles corrupted files
- **Word Documents:** .doc/.docx support with style preservation and image detection
- **Text Files:** UTF-8/Latin1 encoding detection with content normalization
- **URLs:** Web scraping with content cleaning, screenshot capture, retry logic

### Quality-Based Course Generation
The system automatically filters content based on quality scores to ensure effective learning experiences:

- **Premium Quality (85-100):** Professional-grade content for high-value courses
- **Recommended Quality (70-84):** Standard quality for effective learning
- **Acceptable Quality (50-69):** Basic content that may need improvement
- **Below Threshold (<50):** Content requiring significant enhancement

### Processing Configuration
```javascript
// Chunking strategies available
const strategies = ['semantic', 'sentence', 'paragraph', 'fixed'];

// Quality thresholds (configurable)
const thresholds = {
  premium: 85,
  recommended: 70,
  minimum: 50
};

// Chunk size limits
const chunkLimits = {
  maxTokens: 1000,
  minTokens: 100,
  overlapTokens: 50
};
```

## Advanced RAG Pipeline Service

### Hybrid Search Architecture
The RAG pipeline implements a sophisticated hybrid search system that combines multiple retrieval strategies for optimal content discovery:

- **Semantic Search:** Vector similarity using Jina AI embeddings (v4) with 2048 dimensions
- **Keyword Search:** BM25-based text matching via SimpleKeywordTableIndex
- **Hybrid Search:** QueryFusionRetriever with Reciprocal Rank Fusion (RRF) combining both approaches
- **Query Reranking:** Jina AI reranker (m0) for result quality optimization

### Search Modes and Configuration
```javascript
// Search mode options
const searchModes = {
  semantic: 'Pure vector/embedding search',
  keyword: 'Pure BM25/keyword search', 
  hybrid: 'Combined approach (default)'
};

// Hybrid search configuration
const hybridConfig = {
  semanticWeight: 0.7,    // Weight for semantic search
  keywordWeight: 0.3,     // Weight for keyword search
  fusionMode: 'rrf',      // Reciprocal Rank Fusion
  numQueries: 3           // Query variations for coverage
};
```

### Core RAG Methods
- **`ingestDocuments(documents, courseId, options)`** - Process and index documents with quality filtering
- **`retrieveRelevantContent(query, filters)`** - Multi-mode search with automatic fallbacks
- **`generateQueryEmbedding(query)`** - Query-optimized embedding generation
- **`rerankResults(results, query, options)`** - Advanced result reranking with Jina AI
- **`searchSimilar(text, options)`** - Direct similarity search with mode selection

### Usage Examples
```javascript
// Hybrid search (default)
const results = await ragPipeline.retrieveRelevantContent(query, {
  topK: 10,
  minQuality: 70,
  enableReranking: true
});

// Pure semantic search
const results = await ragPipeline.retrieveRelevantContent(query, {
  searchMode: 'semantic',
  courseId: 'course-123'
});

// Quality-filtered ingestion
await ragPipeline.ingestDocuments(documents, courseId, {
  qualityThreshold: 75,
  chunkStrategy: 'semantic'
});
```

### Performance Optimizations
- **Batch Processing:** Jina AI embeddings processed in configurable batch sizes (default: 10)
- **Rate Limiting:** Built-in delays between API calls for cost optimization
- **Caching:** Embedding metadata stored in database for future reference
- **Fallback Logic:** Automatic degradation from hybrid → semantic → keyword search
- **Error Recovery:** Graceful handling of API failures with retry mechanisms

## Claude API Integration Service

### Comprehensive Course Generation
The Claude service provides enterprise-grade course content generation with advanced prompt engineering and optimization:

- **Anthropic SDK Integration:** Full configuration management with retry logic and rate limiting
- **Advanced Prompt Templates:** Specialized templates for course structure, sessions, assessments, and activities
- **Context Integration:** RAG result injection for enhanced content generation
- **Multi-Strategy JSON Parsing:** Automatic repair and validation for reliable responses
- **Performance Optimization:** Token usage tracking, response caching, and parallel generation

### Generation Methods
```javascript
// Generate complete course structure
const courseStructure = await claudeService.generateCourseStructure(config, ragContext);

// Generate detailed session content
const sessionDetails = await claudeService.generateSessionDetails(session, ragContext, courseContext);

// Create comprehensive assessments
const assessments = await claudeService.generateAssessments(config, ragContext);

// Design learning activities
const activities = await claudeService.generateActivities(objectives, ragContext, courseContext);

// Parallel session generation for performance
const sessions = await claudeService.generateSessionsInParallel(sessionArray, ragContext, courseContext, concurrency);
```

### Simplified JSON Templates
All templates use simplified JSON structures for reliability:
- **Course Structure:** Title, description, duration, level, objectives, sessions array
- **Session Details:** Title, overview, duration, objectives, activities, materials
- **Assessments:** Overview, quizzes, assignments, final exam configuration
- **Activities:** Overview, activity list with type/duration/materials

### Cost and Usage Management
- **Token Optimization:** Smart prompt construction to minimize token usage
- **Cost Tracking:** Real-time cost calculation with configurable limits
- **Response Caching:** Avoid duplicate API calls for identical requests
- **Usage Statistics:** Comprehensive metrics for monitoring and optimization

## Qdrant Vector Database Service

### Enterprise-Grade Vector Storage
The Qdrant integration provides production-ready vector database capabilities with comprehensive error handling, performance optimization, and monitoring:

- **Resilient Client:** Exponential backoff, circuit breaker patterns, automatic retry logic
- **Collection Management:** Dynamic creation, schema configuration, payload indexing
- **Hybrid Search:** Dense + sparse vector fusion with Reciprocal Rank Fusion (RRF)
- **Performance Optimization:** Batch operations, connection pooling, quantization support
- **Monitoring:** Real-time health checks, metrics collection, structured logging

### Vector Service Architecture
```javascript
// Collection Configuration
const collectionConfig = {
  vectorSize: 2048,           // Embedding dimensions
  distance: 'Cosine',         // Distance metric (Cosine, Euclidean, Dot)
  enableSparseVectors: true,  // Hybrid search support
  quantization: true,         // Memory optimization
  hnswConfig: {
    m: 16,                    // Graph connectivity
    ef_construct: 100         // Index build quality
  }
};

// Performance Configuration  
const batchConfig = {
  maxBatchSize: 1000,         // Vectors per batch
  maxConcurrentBatches: 5,    // Parallel processing
  waitForIndexing: false      // Async indexing
};
```

### Core Vector Operations
- **`createCollection(name, config)`** - Full collection setup with optimized indexes
- **`insertVectors(vectors, options)`** - Batch insertion with concurrency control
- **`searchSimilar(queryVector, filters)`** - Semantic similarity search with filtering
- **`hybridSearch(denseVector, sparseVector)`** - Combined dense/sparse search with RRF
- **`deleteByFilter(filters)`** - Selective deletion with complex filter conditions

### Advanced Filtering System
```javascript
// Multi-dimensional filtering
const filters = {
  courseId: 'course-123',           // Exact course match
  resourceIds: ['res1', 'res2'],    // Multiple resources
  minQuality: 75,                   // Quality threshold
  maxQuality: 95,                   // Upper quality bound
  language: 'en',                   // Language filtering
  dateFrom: '2024-01-01',          // Date range
  dateTo: '2024-12-31',            // Date range
  custom: [                         // Custom conditions
    {
      key: 'category',
      match: { value: 'technical' }
    },
    {
      key: 'difficulty',
      range: { gte: 3, lte: 8 }
    }
  ]
};
```

### Monitoring and Resilience
- **Health Monitoring:** Connection status, collection metrics, response times
- **Error Recovery:** Automatic retries with jitter, graceful degradation
- **Performance Metrics:** Success rates, average response times, throughput tracking
- **Cost Optimization:** Request batching, connection reuse, smart caching

### Production Deployment Features
- **Connection Pooling:** Persistent connections with automatic reconnection
- **Batch Processing:** Configurable chunk sizes with controlled concurrency  
- **Index Optimization:** Automatic payload indexes for common query patterns
- **Memory Management:** On-disk storage options, vector quantization support
- **Fault Tolerance:** Circuit breaker patterns, timeout handling, rate limiting

## Course Generation Orchestrator

### Enhanced Workflow Management
- Comprehensive workflow management with RAG-enhanced context building
- Quality validation and content refinement mechanisms
- Async job processing with Bull queue integration
- Progressive course generation with session-by-session creation
- Content analysis, topic coverage, and recommendation systems
- Validation workflows for outline coherence and session progression

### Integration Patterns
All services are designed to work together seamlessly:
- **Document Processor** feeds quality-scored content to **RAG Pipeline**
- **RAG Pipeline** provides context to **Claude Service** for generation
- **Vector Service** stores and retrieves embeddings for semantic search
- **Queue System** orchestrates async processing across all services

---

For API endpoints, see [docs/API.md](API.md)
For utility functions, see [docs/UTILITIES.md](UTILITIES.md)
For testing procedures, see [docs/TESTING.md](TESTING.md)