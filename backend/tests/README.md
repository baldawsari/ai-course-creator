# AI Course Creator - Test Suite

Comprehensive test suite for the AI Course Creator backend, including unit tests, integration tests, and performance tests.

## 📁 Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── services/           # Service layer tests
│   │   ├── fileProcessor.test.js
│   │   ├── ragPipeline.test.js
│   │   └── courseGenerator.test.js
│   └── utils/              # Utility function tests
│       ├── validation.test.js
│       └── errors.test.js
├── integration/            # Integration tests
│   ├── api/               # API endpoint tests
│   │   ├── auth.test.js
│   │   └── upload.test.js
│   └── setup.js
├── performance/           # Performance tests
│   ├── loadTest.test.js
│   └── setup.js
├── utils/                 # Test utilities
│   ├── testHelpers.js
│   ├── mockData.js
│   └── apiClient.js
├── fixtures/              # Test data fixtures
├── jest.config.js         # Jest configuration
├── setup.js              # Global test setup
├── setupAfterEnv.js      # After environment setup
├── .env.test             # Test environment variables
└── README.md             # This documentation
```

## 🚀 Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Set up test environment
cp tests/.env.test .env.test
```

### Test Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:performance

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test files
npm test -- fileProcessor.test.js
npm test -- --testNamePattern="File Upload"

# Run tests with debugging
npm test -- --verbose
npm test -- --detectOpenHandles
```

### Test Environment Variables

```bash
# Test Database
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_KEY=test-service-key

# Test AI Services  
ANTHROPIC_API_KEY=sk-ant-test-key
JINA_API_KEY=jina_test-key

# Test Vector Database
QDRANT_URL=http://localhost:6334
QDRANT_API_KEY=test-qdrant-key

# Test Configuration
NODE_ENV=test
LOG_LEVEL=error
SILENCE_TESTS=false
```

## 📊 Test Categories

### Unit Tests
Test individual components in isolation with mocked dependencies.

**Service Layer Tests:**
- `fileProcessor.test.js` - File processing and validation
- `ragPipeline.test.js` - RAG pipeline and vector operations
- `courseGenerator.test.js` - Course generation with Claude AI

**Utility Tests:**
- `validation.test.js` - Input validation functions
- `errors.test.js` - Error handling and custom error classes

### Integration Tests
Test complete workflows with real database and API interactions.

**API Endpoint Tests:**
- `auth.test.js` - Authentication flow (register, login, profile)
- `upload.test.js` - File upload and document management

**Database Tests:**
- CRUD operations
- Relationship integrity
- Query performance

**External Service Tests:**
- Supabase integration
- Claude AI API interaction
- Jina AI embedding/reranking
- Qdrant vector operations

### Performance Tests
Test system performance under various load conditions.

**Load Testing:**
- Concurrent file uploads
- API endpoint throughput
- Database operation performance
- Memory usage monitoring

**Stress Testing:**
- High concurrency scenarios
- Large file processing
- Extended operation periods

## 🛠️ Test Utilities

### TestHelpers (`tests/utils/testHelpers.js`)
Comprehensive test utility functions:

```javascript
const { testHelpers } = require('../utils/testHelpers');

// Mock data generation
const user = testHelpers.generateMockUser();
const document = testHelpers.generateMockDocument();
const course = testHelpers.generateMockCourse();

// File system helpers
const tempFile = await testHelpers.createTempFile('test.pdf', content);

// API helpers
const req = testHelpers.createMockRequest();
const res = testHelpers.createMockResponse();

// Performance measurement
const { result, duration } = await testHelpers.measureExecutionTime(fn);
const { result, memory } = await testHelpers.measureMemoryUsage(fn);

// Cleanup
await testHelpers.cleanup();
```

### MockData (`tests/utils/mockData.js`)
Pre-defined test data and generators:

```javascript
const { mockData, generateMockFile } = require('../utils/mockData');

// File data
const pdfFile = generateMockFile('pdf');
const docxFile = generateMockFile('docx');

// Sample content
const content = mockData.SAMPLE_PDF_CONTENT;
const courseStructure = mockData.SAMPLE_COURSE_STRUCTURE;

// Mock API responses
const claudeResponse = mockData.responses.claude.success;
const jinaEmbeddings = mockData.responses.jina.embeddings;
```

### APIClient (`tests/utils/apiClient.js`)
Simplified API testing client:

```javascript
const { createAPIClient } = require('../utils/apiClient');

const apiClient = createAPIClient(app);

// Authentication
await apiClient.login('user@example.com', 'password');
await apiClient.register(userData);

// API requests
const response = await apiClient.get('/api/documents');
const uploadResponse = await apiClient.uploadFile(filename, buffer);

// Assertions
apiClient.expectSuccess(response);
apiClient.expectError(response, 400, 'Validation error');
```

## 🎯 Custom Matchers

Extended Jest matchers for better assertions:

```javascript
// Range validation
expect(value).toBeWithinRange(1, 100);

// Array content
expect(array).toContainObject({ id: 1, name: 'test' });

// JSON validation
expect(jsonString).toBeValidJSON();

// UUID validation
expect(id).toBeValidUUID();
```

## 📈 Coverage Reports

### Coverage Thresholds
```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

### Viewing Coverage
```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# View terminal summary
npm test -- --coverage --coverageReporters=text
```

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)
- Multi-project setup (unit, integration, performance)
- Custom test environments
- Module name mapping
- Coverage configuration
- Timeout settings

### Environment Setup
- Global test setup in `setup.js`
- After environment setup in `setupAfterEnv.js`
- Test-specific environment variables
- Mock configurations

## 🚨 Testing Best Practices

### Writing Tests

1. **Use descriptive test names**
   ```javascript
   it('should reject file upload when user is not authenticated', async () => {
     // Test implementation
   });
   ```

2. **Follow AAA pattern (Arrange, Act, Assert)**
   ```javascript
   it('should create course from document', async () => {
     // Arrange
     const document = testHelpers.generateMockDocument();
     
     // Act
     const course = await courseGenerator.generate(document.id);
     
     // Assert
     expect(course).toHaveProperty('id');
     expect(course.modules).toHaveLength(5);
   });
   ```

3. **Use proper mocking**
   ```javascript
   // Mock external dependencies
   jest.mock('@anthropic-ai/sdk');
   
   // Use test helpers for consistent mocks
   const mockClaude = testHelpers.createMockClaudeClient();
   ```

4. **Clean up after tests**
   ```javascript
   afterEach(async () => {
     await testHelpers.cleanup();
     jest.clearAllMocks();
   });
   ```

### Performance Testing Guidelines

1. **Set realistic thresholds**
   ```javascript
   const thresholds = {
     responseTime: { p95: 2000, average: 1000 },
     memory: { maxHeapUsed: 500 * 1024 * 1024 },
     errorRate: 0.01,
   };
   ```

2. **Measure relevant metrics**
   - Response time percentiles
   - Memory usage patterns
   - Error rates
   - Throughput

3. **Use proper load patterns**
   ```javascript
   // Gradual ramp-up
   const workerStartTime = Date.now() + (i * rampUp / concurrency);
   
   // Realistic delays between requests
   await testHelpers.delay(100);
   ```

## 🐛 Debugging Tests

### Common Issues

1. **Async/Await Problems**
   ```javascript
   // ✅ Correct
   it('should handle async operation', async () => {
     await expect(asyncFunction()).resolves.toBe(result);
   });
   
   // ❌ Incorrect
   it('should handle async operation', () => {
     expect(asyncFunction()).resolves.toBe(result);
   });
   ```

2. **Memory Leaks**
   ```bash
   # Detect memory leaks
   npm test -- --detectOpenHandles --forceExit
   ```

3. **Timeout Issues**
   ```javascript
   // Increase timeout for slow tests
   jest.setTimeout(30000);
   
   // Or per test
   it('slow operation', async () => {
     // Test code
   }, 30000);
   ```

### Debug Commands
```bash
# Run with debugging
npm test -- --verbose --no-cache

# Run single test with debugging
npm test -- --testNamePattern="specific test" --verbose

# Detect hanging processes
npm test -- --detectOpenHandles

# Force exit after tests
npm test -- --forceExit
```

## 📋 Test Checklist

Before committing code, ensure:

- [ ] All tests pass
- [ ] Coverage thresholds met
- [ ] No test timeouts or hanging processes
- [ ] Performance tests within thresholds
- [ ] Integration tests cover critical paths
- [ ] Mock data is realistic
- [ ] Error cases are tested
- [ ] Edge cases are covered
- [ ] Tests are deterministic
- [ ] Clean up is properly implemented

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
- name: Run Tests
  run: |
    npm run test:unit
    npm run test:integration
    npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Test Reports
- JUnit XML reports for CI integration
- Coverage reports in multiple formats
- Performance benchmark results
- Test result artifacts

## 📚 Related Documentation

- [System Architecture](../docs/ARCHITECTURE.md)
- [API Documentation](../docs/API.md)
- [Configuration Guide](../src/config/README.md)
- [Development Guide](../CLAUDE.md)

---

For more information about the AI Course Creator project, see the main documentation in [CLAUDE.md](../CLAUDE.md).