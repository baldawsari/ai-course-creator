# Test Improvement Guide

This guide provides instructions for continuing and improving the test coverage for the AI Course Creator backend services.

## Current Status (as of Jul 21, 2025)

### Overall Coverage
- **Statements:** 57.62%
- **Branches:** 46.61%
- **Functions:** 47.87%
- **Lines:** 57.8%
- **Target:** 80% minimum for all metrics

### Coverage by Service

| Service | Statement Coverage | Status | Priority |
|---------|-------------------|---------|----------|
| jinaClient | 89% | ✅ Exceeds target | Low |
| pdfGenerator | 82% | ✅ Exceeds target | Low |
| claudeService | 81% | ✅ Exceeds target | Low |
| documentProcessor | 78% | ⚠️ Close to target | Medium |
| htmlExporter | 71% | ❌ Below target | High |
| vectorService | 61% | ❌ Below target | High |
| courseGenerator | 45% | ❌ Significantly below | Critical |
| ragPipeline | 43% | ❌ Significantly below | Critical |
| fileProcessor | 37% | ❌ Significantly below | Critical |
| designEngine | 55% | ❌ Below target | High |
| visualIntelligence | 33% | ❌ Significantly below | Critical |

## Known Issues to Fix

### 1. Integration Test Setup
The integration tests are failing with `beforeAll is not defined` error. This needs to be fixed in the test setup files.

**Fix:** The jest environment needs to be configured properly for integration tests. Check `tests/integration/setup.js` and ensure jest globals are available.

### 2. Failing Unit Tests

#### VectorService Tests
- All tests failing due to undefined `supabaseAdmin.from` mock
- **Fix:** Properly mock the supabaseAdmin object structure:
```javascript
jest.mock('../../../src/config/database', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }))
  }
}));
```

#### VisualIntelligence Tests
- Pattern detection tests failing due to confidence thresholds
- **Fix:** Adjust test expectations or mock the pattern detection logic more accurately

#### FileProcessor Tests
- Embedding generation failing with `position` undefined error
- **Fix:** Mock the chunk structure properly with position field

### 3. Coverage Gaps

#### High Priority Services (Need immediate attention)

**courseGenerator.js (45% coverage)**
- Missing tests for:
  - Error handling in parallel session generation
  - Session content enrichment
  - Progress tracking functionality
  - Cache invalidation logic

**ragPipeline.js (43% coverage)**
- Missing tests for:
  - Document indexing flow
  - Hybrid search functionality
  - Result reranking edge cases
  - Collection management

**fileProcessor.js (37% coverage)**
- Missing tests for:
  - Large file handling
  - Concurrent file processing
  - Progress reporting
  - Cleanup on failure

## Recommended Improvements

### 1. Add Missing Test Cases

#### For courseGenerator.js:
```javascript
describe('CourseGenerator - Additional Tests', () => {
  it('should handle session generation failures gracefully', async () => {
    // Test partial failure in parallel generation
  });
  
  it('should track progress accurately during generation', async () => {
    // Test progress callbacks
  });
  
  it('should invalidate cache on configuration change', async () => {
    // Test cache invalidation
  });
});
```

#### For ragPipeline.js:
```javascript
describe('RAGPipeline - Additional Tests', () => {
  it('should handle large document indexing', async () => {
    // Test with documents > 1000 chunks
  });
  
  it('should perform hybrid search with filters', async () => {
    // Test combining vector and keyword search
  });
  
  it('should manage collection lifecycle', async () => {
    // Test create, update, delete collection
  });
});
```

### 2. Integration Test Improvements

1. **Fix the setup configuration** to properly initialize jest globals
2. **Add end-to-end tests** for complete workflows:
   - File upload → Processing → Vector storage → Search
   - Course generation → Export → Download
3. **Add performance tests** for critical paths
4. **Add load tests** for concurrent operations

### 3. Test Quality Improvements

1. **Reduce test interdependencies** - Each test should be completely isolated
2. **Improve mock quality** - Mocks should closely mirror actual service behavior
3. **Add edge case testing** - Test boundary conditions and error scenarios
4. **Add regression tests** - For any bugs found in production

### 4. Testing Infrastructure

1. **Set up test database** - Use a dedicated test Supabase instance
2. **Create test fixtures** - Reusable test data for consistency
3. **Add test utilities** - Helper functions for common test operations
4. **Set up CI/CD integration** - Run tests automatically on PR

## Next Steps

1. **Immediate (This Week)**
   - Fix failing integration tests setup
   - Fix vectorService mock issues
   - Add tests for courseGenerator to reach 80%

2. **Short Term (Next Sprint)**
   - Improve ragPipeline coverage to 80%
   - Improve fileProcessor coverage to 80%
   - Fix all failing tests

3. **Medium Term (Next Month)**
   - Achieve 80% coverage across all services
   - Add performance benchmarks
   - Set up automated coverage reporting

## Testing Commands

```bash
# Run all tests with coverage
npm run test:coverage

# Run specific service tests
npm test tests/unit/services/courseGenerator.test.js

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm test -- tests/unit

# Run with specific coverage threshold
npm test -- --coverage --coverageThreshold='{"global":{"statements":80}}'
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](../docs/TESTING.md)
- [Project Testing Strategy](../docs/TESTING.md)
- [Mock Data Utilities](./utils/mockData.js)

## Contributing

When adding new tests:
1. Follow existing patterns in the test files
2. Use descriptive test names
3. Test both success and failure cases
4. Mock external dependencies
5. Keep tests focused and isolated
6. Update this guide with any new patterns or issues found

Remember: Good tests are as important as good code. They ensure reliability and enable confident refactoring.