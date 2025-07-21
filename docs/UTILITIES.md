# UTILITIES.md

Utility functions and helper libraries for the AI Course Creator backend.

## Overview

The backend includes comprehensive utility modules providing enterprise-grade functionality for common operations. All utilities are designed with error handling, type safety, and performance in mind.

## Utility Modules

### 1. validators.js
**Purpose:** Input validation for files, URLs, course configurations, and content quality

**Key Features:**
- File type and size validation with security checks
- Course configuration validation (title, level, duration, sessions)
- URL validation with protocol and domain filtering
- Content quality assessment scoring
- Email and password strength validation

### 2. errorHandlers.js
**Purpose:** Consistent error handling across the application

**Key Features:**
- Custom error classes (ValidationError, AuthError, NotFoundError, etc.)
- HTTP status code mapping
- Async route wrapper (asyncHandler)
- Centralized error middleware
- Error logging and monitoring integration

### 3. asyncHelpers.js
**Purpose:** Advanced async operation management

**Key Features:**
- Promise utilities (allSettled, timeout, parallel execution)
- Retry logic with exponential backoff
- Circuit breaker pattern for external services
- Batch processing with concurrency control
- Async queue management

### 4. contentProcessing.js
**Purpose:** Text and content manipulation utilities

**Key Features:**
- Text cleaning and sanitization
- Language detection and translation
- Similarity calculations (Jaccard, cosine)
- Keyword extraction and summarization
- Content chunking strategies

### 5. visualIntelligence.js
**Purpose:** AI-powered visual content generation utilities

**Key Features:**
- **Pattern Detection:** Identifies visual opportunities in content
  - List patterns (bullets, numbered lists)
  - Process patterns (steps, workflows)
  - Data patterns (percentages, metrics)
  - Timeline patterns (dates, chronology)
  - Comparison patterns (vs, pros/cons)

- **SVG Generation Utilities:**
  - `generateInfographic()`: Creates visual cards from lists
  - `generateFlowchart()`: Process diagrams with connections
  - `generateDataVisualization()`: Bar and pie charts
  - `generateTimeline()`: Chronological event displays
  - `generateComparisonChart()`: Side-by-side comparisons

- **Helper Functions:**
  - `findBestIcon()`: Semantic icon selection
  - `wrapText()`: SVG text wrapping
  - `escapeXml()`: XML character escaping
  - `assessVisualQuality()`: Quality scoring
  - `getColorFromPalette()`: Theme-based colors

- **Content Extraction:**
  - `extractListElements()`: Parse bullet/numbered lists
  - `extractProcessSteps()`: Identify workflow steps
  - `extractDataPoints()`: Find metrics and percentages
  - `extractTimelineEvents()`: Parse chronological data

### 5. fileHelpers.js
**Purpose:** File system operations and management

**Key Features:**
- Safe file operations with path validation
- File type detection (magic numbers)
- Temporary file management
- Archive creation and extraction
- Stream processing for large files

### 6. performanceUtils.js
**Purpose:** Performance monitoring and optimization

**Key Features:**
- Execution time measurement
- Memory usage tracking
- Caching strategies (memory, Redis)
- Rate limiting implementation
- Performance metrics collection

## Test Utilities

### testHelpers.js
**Purpose:** Comprehensive testing infrastructure support

**Key Features:**
- Mock data generators (users, documents, courses)
- External service mocking (Supabase, Claude AI, Jina AI)
- Performance measurement utilities
- Database transaction helpers
- Cleanup utilities

### mockData.js
**Purpose:** Test fixtures and realistic data generation

**Key Features:**
- Sample content for various file types
- API response mocks
- Error scenario generation
- Large datasets for load testing

### apiClient.js
**Purpose:** Simplified API testing interface

**Key Features:**
- Authentication flow testing
- Request builders with automatic headers
- File upload testing support
- Batch operation testing
- Response assertion helpers

## Usage Patterns

### Error Handling
```javascript
const { asyncHandler, ValidationError } = require('./utils/errorHandlers');

router.post('/api/endpoint', asyncHandler(async (req, res) => {
  // Throws are automatically caught and handled
  if (!req.body.data) {
    throw new ValidationError('Data is required');
  }
  // ... route logic
}));
```

### Validation
```javascript
const { validateFile, validateCourseConfig } = require('./utils/validators');

const fileResult = validateFile(uploadedFile, {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: ['pdf', 'docx']
});

if (!fileResult.valid) {
  // Handle validation errors
}
```

### Async Operations
```javascript
const { withRetry, CircuitBreaker } = require('./utils/asyncHelpers');

// Retry logic for external services
const result = await withRetry(
  () => externalServiceCall(),
  { maxAttempts: 3, delay: 1000 }
);

// Circuit breaker for fault tolerance
const breaker = new CircuitBreaker(externalService, {
  threshold: 5,
  timeout: 30000
});
```

## Best Practices

1. **Always validate inputs** using the validators module
2. **Use asyncHandler** for all async route handlers
3. **Implement retry logic** for external service calls
4. **Monitor performance** using performanceUtils
5. **Handle errors consistently** with custom error classes
6. **Use test utilities** for comprehensive testing

## Performance Considerations

- Utilities are optimized for production use
- Caching is implemented where appropriate
- Memory-efficient streaming for large files
- Connection pooling for external services
- Rate limiting to prevent abuse

---

For detailed function signatures and examples, refer to the source code in `src/utils/` or the comprehensive test suite in `tests/unit/utils/`.