# UTILITIES.md

Utility Functions Documentation for AI Course Creator

## Overview

The AI Course Creator backend includes a comprehensive set of utility functions providing enterprise-grade functionality for validation, error handling, async operations, content processing, file management, and performance monitoring.

## Test Utilities - Testing Infrastructure Support

### testHelpers.js - Comprehensive Test Helper Functions
Located in `tests/utils/testHelpers.js`, provides enterprise-grade testing utilities:

- **Mock Data Generation:** User, document, course, vector, and chunk generators
- **File System Helpers:** Temporary file creation and cleanup
- **API Mocking:** Express request/response mocking, authentication helpers  
- **External Service Mocks:** Supabase, Claude AI, Jina AI, Qdrant client mocking
- **Performance Measurement:** Execution time and memory usage tracking
- **Database Helpers:** Test database setup and transaction management

```javascript
// Example usage
const { testHelpers } = require('../../utils/testHelpers');

// Generate mock data
const user = testHelpers.generateMockUser();
const document = testHelpers.generateMockDocument();
const course = testHelpers.generateMockCourse();

// Performance measurement
const { result, duration } = await testHelpers.measureExecutionTime(asyncFunction);
const { result, memory } = await testHelpers.measureMemoryUsage(memoryIntensiveFunction);

// Cleanup
await testHelpers.cleanup();
```

### mockData.js - Test Data Fixtures and Generators
Provides pre-defined test data and intelligent generators:

- **Sample Content:** PDF content, course structures, realistic test data
- **File Generators:** PDF, DOCX, and invalid file mocks with proper metadata
- **API Response Mocks:** Claude AI, Jina AI, and external service responses
- **Performance Data:** Large document sets for load testing
- **Error Scenarios:** Invalid data and edge cases for error handling tests

### apiClient.js - API Testing Client
Simplified API testing interface with authentication and assertion helpers:

- **Authentication Flow:** Login, registration, token management
- **Request Builders:** GET, POST, PUT, DELETE with automatic headers
- **File Upload Testing:** Multipart form data handling
- **Batch Operations:** Multiple request execution and result aggregation
- **Response Assertions:** Success/error validation with detailed checking

## 1. validators.js - File, Course Config, URL & Content Quality Validation

### File Validation
- **Type checking:** Extension and MIME type validation
- **Size limits:** Configurable min/max file sizes
- **Security checks:** Path traversal protection, suspicious file detection
- **MIME validation:** Magic number detection for accurate file type identification

```javascript
// Example usage
const { validateFile, validateCourseConfig, validateURL, validateContentQuality } = require('./utils/validators');

// File validation with security checks
const fileResult = validateFile(uploadedFile, {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: ['pdf', 'docx', 'txt']
});

// Returns: { valid, errors, warnings, metadata }
```

### Course Configuration Validation
- **Title and description:** Length and content validation
- **Level validation:** Beginner, intermediate, advanced, expert
- **Duration limits:** 1-200 hours with sensible defaults
- **Session count:** 1-50 sessions with optimization recommendations
- **Objectives and prerequisites:** Array validation with length limits

```javascript
// Course configuration validation
const courseResult = validateCourseConfig({
  title: 'Machine Learning Fundamentals',
  level: 'intermediate',
  duration: 20,
  sessionCount: 8,
  objectives: ['Learn ML basics', 'Implement algorithms'],
  language: 'en'
});

// Returns: { valid, errors, warnings, sanitized }
```

### URL Validation and Security
- **Protocol checking:** HTTP/HTTPS validation
- **Domain filtering:** Blacklist/whitelist support
- **Security filtering:** Private IP and localhost protection
- **Length validation:** Reasonable URL length limits

```javascript
// URL validation with security
const urlResult = validateURL('https://example.com/document.pdf', {
  allowedProtocols: ['https:'],
  blacklist: ['malicious-site.com'],
  allowPrivate: false
});

// Returns: { valid, errors, warnings, sanitized }
```

### Content Quality Assessment
- **0-100 scoring:** Quality tier classification (premium/recommended/acceptable/below threshold)
- **Component scoring:** Readability, coherence, completeness, formatting
- **Recommendations:** AI-generated suggestions for improvement
- **Threshold validation:** Configurable quality requirements

```javascript
// Content quality assessment
const qualityResult = validateContentQuality(75, {
  requiredLevel: 'recommended',
  components: { 
    readability: 75, 
    coherence: 80,
    completeness: 85,
    formatting: 70
  }
});

// Returns: { valid, errors, warnings, recommendations, metadata }
```

## 2. errors.js - Custom Error Classes & Comprehensive Error Handling

### Custom Error Classes
- **AppError:** Base error class with operational flag
- **ValidationError:** Input validation failures with field details
- **AuthenticationError/AuthorizationError:** Auth-related errors
- **NotFoundError:** Resource not found with context
- **RateLimitError:** Rate limiting with retry-after information
- **ExternalServiceError:** External API failures with service context

```javascript
// Example usage
const { ValidationError, NotFoundError, errorHandler } = require('./utils/errors');

// Throw custom errors with context
throw new ValidationError('Invalid input', [
  { field: 'email', message: 'Invalid email format' }
]);

throw new NotFoundError('Course', courseId);

// Use error handler middleware
app.use(errorHandler);
```

### Error Utilities
- **formatErrorResponse:** Consistent API error formatting
- **getUserFriendlyMessage:** User-facing error messages
- **logError:** Structured error logging with context
- **isOperationalError:** Distinguish operational vs programming errors

## 3. async.js - Promise Utilities, Retry Logic & Advanced Async Patterns

### Core Utilities
- **sleep:** Promise-based delays
- **withTimeout:** Execute functions with timeout protection
- **retry:** Exponential backoff with jitter and custom retry conditions
- **parallel/sequence:** Controlled concurrent and sequential execution

```javascript
// Example usage
const { retry, parallel, AsyncQueue, CircuitBreaker } = require('./utils/async');

// Retry with exponential backoff
const result = await retry(
  () => claudeService.generateContent(prompt),
  {
    maxAttempts: 3,
    initialDelay: 1000,
    factor: 2,
    jitter: true,
    shouldRetry: (error) => error.code !== 'PERMANENT_FAILURE'
  }
);

// Process items in parallel with concurrency limit
const results = await parallel(tasks, 5);
```

### Advanced Classes
- **AsyncQueue:** Sequential processing with configurable concurrency
- **CircuitBreaker:** Fault tolerance for external services
- **processInBatches:** Batch processing with progress tracking

```javascript
// Circuit breaker for external services
const breaker = new CircuitBreaker({ 
  failureThreshold: 5,
  resetTimeout: 60000 
});
const data = await breaker.execute(() => externalAPI.call());

// Async queue for sequential operations
const queue = new AsyncQueue({ concurrency: 3 });
const result = await queue.add(() => processTask());
```

## 4. content.js - Advanced Text Processing & Language Detection

### Text Cleaning and Normalization
- **HTML removal:** Strip tags while preserving content structure
- **Whitespace normalization:** Consistent spacing and line endings
- **Special character handling:** Unicode normalization and encoding detection
- **Content sanitization:** Remove URLs, emails, numbers (configurable)

```javascript
// Example usage
const { cleanText, detectLanguage, calculateSimilarity, extractMetadata } = require('./utils/content');

// Clean and normalize text
const cleaned = cleanText(htmlContent, {
  removeHtml: true,
  removePunctuation: false,
  lowercase: true,
  removeUrls: true
});
```

### Language Detection
- **Multi-language support:** 12+ languages (EN, ES, FR, DE, IT, PT, JA, KO, ZH, AR, HI, RU)
- **Confidence scoring:** Reliability metrics for detection accuracy
- **Pattern matching:** Comprehensive regex patterns for accurate detection

```javascript
// Detect language with confidence
const { language, confidence, scores } = detectLanguage(text);
// Returns: { language: 'en', confidence: 0.95, scores: {...} }
```

### Content Analysis
- **Similarity calculation:** TF-IDF with cosine similarity
- **Keyword extraction:** TF-IDF based with stop word filtering
- **Metadata extraction:** Word count, reading time, keywords, title detection
- **Readability assessment:** Flesch Reading Ease, Flesch-Kincaid Grade Level

```javascript
// Calculate content similarity
const similarity = calculateSimilarity(text1, text2, {
  useStemming: true,
  removeStopWords: true,
  caseSensitive: false
});

// Extract comprehensive metadata
const metadata = extractMetadata(document);
// Returns: { wordCount, readingTime, language, keywords, title, etc. }
```

## 5. files.js - File Type Detection & Advanced File Management

### File Type Detection
- **MIME type detection:** Magic number analysis for accurate identification
- **25+ file types:** Documents, images, archives, code files
- **Security validation:** Extension vs content verification
- **Category classification:** Document, image, video, audio, data, archive

```javascript
// Example usage
const { detectFileType, formatFileSize, sanitizeFileName, cleanupTempFiles } = require('./utils/files');

// Detect file type from buffer or path
const typeInfo = await detectFileType(filePath);
// Returns: { mimeType, extension, category, icon, isText, isBinary }
```

### File Management
- **Name sanitization:** Safe filename generation with reserved name handling
- **Unique name generation:** Timestamp and random string combination
- **Size formatting:** Human-readable file size display
- **Directory operations:** Size calculation, recursive processing

```javascript
// Format file sizes
const humanSize = formatFileSize(bytes); // "1.5 MB"

// Sanitize file names for safe storage
const safeName = sanitizeFileName('my file (1).pdf'); // "my_file_1.pdf"

// Generate unique filenames
const uniqueName = generateUniqueFileName('document.pdf', {
  useTimestamp: true,
  useRandom: true
});
```

### Security Features
- **Path traversal protection:** Prevent directory traversal attacks
- **Reserved name handling:** Windows/Unix reserved name protection
- **Extension validation:** Whitelist-based extension checking
- **Temporary file management:** Automated cleanup with age-based filtering

```javascript
// Cleanup old temporary files
const cleanup = await cleanupTempFiles('/tmp', {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  pattern: /^tmp_/,
  dryRun: false
});
// Returns: { scanned, deleted, failed, totalSize }
```

## 6. performance.js - Performance Monitoring & Resource Management

### Timing and Profiling
- **Timer class:** High-precision timing with splits
- **measureTime:** Function execution timing
- **Debounced profiler:** Performance-aware debouncing

```javascript
// Example usage
const { Timer, MemoryTracker, RateLimiter, Cache, measureTime } = require('./utils/performance');

// Measure execution time
const timer = new Timer('Database Query').start();
await database.query(sql);
timer.split('Query Complete');
const elapsed = timer.stop(); // Logs timing automatically
```

### Memory Tracking
- **MemoryTracker class:** Real-time memory usage monitoring
- **Sampling:** Configurable interval-based memory snapshots
- **Statistics:** Min/max/average memory usage analysis
- **Threshold alerts:** Automatic warnings for memory usage

```javascript
// Track memory usage
const memTracker = new MemoryTracker({
  interval: 1000,
  maxSamples: 100
}).start();

// ... memory-intensive operations
const stats = memTracker.stop();
// Returns: { samples, duration, heapUsed, rss, formatted }
```

### Rate Limiting
- **Token bucket algorithm:** Fair rate limiting with refill
- **Per-identifier tracking:** User/IP/API key specific limits
- **Configurable rates:** Flexible token and refill rate configuration

```javascript
// Rate limiting
const limiter = new RateLimiter({ 
  maxTokens: 100, 
  refillRate: 10 // tokens per second
});

const { allowed, tokensRemaining, retryAfter } = limiter.checkLimit(userId, 1);
```

### Caching System
- **In-memory cache:** TTL-based caching with LRU eviction
- **Hit rate tracking:** Performance metrics and statistics
- **Automatic cleanup:** Expired entry removal and memory management

```javascript
// Caching with TTL
const cache = new Cache({ 
  maxSize: 1000, 
  defaultTTL: 300000, // 5 minutes
  cleanupInterval: 60000 // 1 minute
});

cache.set('key', data, 600000); // 10 minutes TTL
const cached = cache.get('key');
const stats = cache.getStats(); // Hit rate, size, etc.
```

### System Monitoring
- **PerformanceMonitor class:** System-wide performance tracking
- **Memory warnings:** Automatic alerts for memory thresholds
- **CPU monitoring:** Process CPU usage tracking
- **Health metrics:** Comprehensive system health reporting

## Integration Examples

### Error Handling Integration
```javascript
// routes/upload.js - Updated with comprehensive error handling
const { ValidationError, FileProcessingError } = require('../utils/errors');
const { validateFile } = require('../utils/validators');

app.post('/api/upload', async (req, res, next) => {
  try {
    const validation = validateFile(req.file);
    if (!validation.valid) {
      throw new ValidationError('File validation failed', validation.errors);
    }
    // Process file...
  } catch (error) {
    next(error); // Handled by error middleware
  }
});
```

### Performance Monitoring Integration
```javascript
// services/courseGenerator.js - Enhanced with performance tracking
const { measureTime, MemoryTracker } = require('../utils/performance');

class CourseGenerator {
  async generateCourse(config) {
    const memTracker = new MemoryTracker('CourseGeneration').start();
    
    const result = await measureTime(
      () => this.performGeneration(config),
      'CourseGeneration'
    );
    
    memTracker.stop();
    return result;
  }
}
```

### Content Processing Integration
```javascript
// services/documentProcessor.js - Enhanced with content utilities
const { cleanText, detectLanguage, extractMetadata } = require('../utils/content');

class DocumentProcessor {
  async processDocument(content) {
    const cleaned = cleanText(content, { removeHtml: true });
    const { language, confidence } = detectLanguage(cleaned);
    const metadata = extractMetadata(cleaned);
    
    return {
      content: cleaned,
      language,
      metadata,
      qualityScore: this.calculateQuality(metadata)
    };
  }
}
```

## File Locations
- `backend/src/utils/validators.js` - Comprehensive validation utilities
- `backend/src/utils/errors.js` - Custom error classes and handling
- `backend/src/utils/async.js` - Promise utilities and async patterns
- `backend/src/utils/content.js` - Text processing and language detection
- `backend/src/utils/files.js` - File operations and management
- `backend/src/utils/performance.js` - Performance monitoring and caching

## Usage Recommendations

1. **Always use validators** for user input and file uploads
2. **Implement custom errors** for consistent error handling across the application
3. **Use async utilities** for external API calls and heavy operations
4. **Apply content processing** for all text-based content analysis
5. **Leverage file utilities** for secure file handling and storage
6. **Monitor performance** in production with built-in monitoring tools

## Key Features & Benefits

### 🔒 Security & Validation
- Comprehensive input validation and sanitization
- File type validation with magic number detection
- URL validation with domain filtering
- Path traversal and injection protection

### 🚀 Performance & Reliability
- Circuit breaker patterns for external services
- Exponential backoff retry mechanisms
- Memory and performance monitoring
- Efficient caching with automatic cleanup

### 🌐 Internationalization
- Multi-language detection and support
- Content readability assessment
- Text normalization and encoding handling
- Similarity calculation across languages

### 📊 Monitoring & Analytics
- Real-time performance metrics
- Memory usage tracking and alerts
- Rate limiting with detailed statistics
- Comprehensive error logging and reporting

### 🛠️ Developer Experience
- TypeScript-compatible with JSDoc
- Extensive configuration options
- Consistent error handling patterns
- Comprehensive logging integration

The utility library provides a solid foundation for enterprise-grade applications with comprehensive error handling, security, performance monitoring, and content processing capabilities.

---

For service integration examples, see [docs/SERVICES.md](SERVICES.md)
For API usage examples, see [docs/API.md](API.md)
For testing utility functions, see [docs/TESTING.md](TESTING.md)