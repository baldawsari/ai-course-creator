# TESTING.md

Backend testing guide for the AI Course Creator.

> **Note:** For frontend testing documentation, see [TESTING-FRONTEND.md](./TESTING-FRONTEND.md)

## Backend Testing Overview

- **Framework:** Jest with TypeScript support
- **Test Types:** Unit, Integration, and Performance tests
- **Coverage Goal:** 80% across all metrics
- **Database:** Test database with automatic cleanup
- **Mocking:** External services mocked in unit tests

## Backend Testing

### Test Runner
```bash
# From backend/ directory
node run-tests.js              # All test suites
node run-tests.js unit         # Unit tests only
node run-tests.js integration  # Integration tests only
node run-tests.js performance  # Performance tests only
node run-tests.js --coverage   # With coverage report
node run-tests.js --watch      # Watch mode
```

### Test Structure
```
backend/tests/
├── unit/           # Isolated unit tests
│   ├── services/   # Service layer tests
│   └── utils/      # Utility function tests
├── integration/    # API and database tests
└── performance/    # Load and stress tests
```

### Coverage Requirements
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%


## Testing Best Practices

### Backend Testing
1. Mock external services in unit tests
2. Use test database for integration tests
3. Clean up test data after each test
4. Test error scenarios thoroughly
5. Monitor test execution time


## CI/CD Integration

### GitHub Actions Workflow
- Runs on every pull request
- Parallel backend and frontend tests
- Cross-browser E2E testing
- Performance benchmarks
- Coverage reporting

### Local Development
- Pre-commit hooks for linting
- Watch mode for rapid development
- Fast unit test execution
- Isolated test environments

## Debugging Tests

### Backend
- Use `--verbose` flag for detailed output
- Check test logs in `tests/logs/`
- Use debugger with `node --inspect`


## Performance Benchmarks

### Backend Targets
- API response time: < 200ms (p95)
- File processing: < 30s for 10MB
- Database queries: < 50ms


---

For detailed test examples and patterns, refer to the test files directly or the testing utilities in `tests/utils/`.


### Visual Intelligence Tests

**Test File:** `tests/unit/services/visualIntelligence.test.js`

**Coverage Areas:**
- Content analysis and pattern detection
- SVG generation for all visual types
- Icon selection and color palette usage
- Quality assessment algorithms
- Error handling and graceful degradation
- Cache functionality

**Key Test Scenarios:**
1. Pattern detection for lists, processes, data, timelines
2. Visual generation with various options
3. AI integration fallback mechanisms
4. XML escaping and text wrapping
5. Visual quality scoring

**Running Visual Intelligence Tests:**
```bash
# Run specific test file
npm test -- visualIntelligence.test.js

# Run with coverage
npm test -- --coverage visualIntelligence.test.js
```

## Update Log


---

**Note:** Update this file after each testing session to track progress!
**Note:** Update log after each testing session to track progress!
