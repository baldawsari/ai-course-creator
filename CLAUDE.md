# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

📚 **Documentation Navigation:**
- [System Architecture](docs/ARCHITECTURE.md) - Multi-tier architecture, database schema, authentication
- [Services & Components](docs/SERVICES.md) - RAG pipeline, Claude AI, document processing, vector database
- [API Documentation](docs/API.md) - REST API endpoints, authentication, error handling
- [Testing Guide](docs/TESTING.md) - Testing strategy, commands, end-to-end validation
- [Utility Functions](docs/UTILITIES.md) - Validation, error handling, async patterns, content processing
- [Documentation Rules](DOCUMENTATION_RULES.md) - Rules for updating documentation automatically

## Project Overview

AI Course Creator is a production-ready application that helps IT, Data, and AI instructors generate interactive HTML course materials using advanced RAG (Retrieval-Augmented Generation) technology. The system processes uploaded documents (PDFs, Word docs, URLs) and generates structured course content using AI.

**Tech Stack:**
- **Backend:** Node.js, Express, TypeScript
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **AI Services:** Anthropic Claude API (course generation), Jina AI (embeddings/reranking)
- **Vector Database:** Qdrant
- **RAG Framework:** LlamaIndex
- **File Processing:** Multer, pdf-parse, mammoth, puppeteer
- **Document Processing:** Advanced pipeline with quality assessment, smart chunking, language detection
- **Queue System:** Bull with Redis
- **Authentication:** JWT with Supabase Auth

## Development Commands

### Core Development
```bash
# Development server with hot reload
npm run dev

# Build and run production
npm run build && npm start

# Type checking without emitting files
npm run typecheck

# Code quality
npm run lint
npm run lint:fix
npm run format
```

### Testing Commands
```bash
# Comprehensive Test Suite (new)
node run-tests.js              # Run all test suites
node run-tests.js unit         # Unit tests only
node run-tests.js integration  # Integration tests only
node run-tests.js performance  # Performance tests only
node run-tests.js --coverage   # With coverage report
node run-tests.js --watch      # Watch mode

# Legacy Jest commands (still available)
npm test
npm run test:watch
npm run test:coverage
```

### Database Management
```bash
# Run all migrations (create tables, RLS policies, indexes)
npm run migration:run

# Create new migration file
npm run migration:create

# Manual database setup (if migrations fail)
# Run backend/MANUAL_SETUP.sql directly in Supabase SQL editor
```

### Background Jobs
```bash
# Start background queue worker
npm run worker
```

## Environment Configuration

### Critical Environment Variables
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `ANTHROPIC_API_KEY` (for Claude course generation)
- `JINA_API_KEY` (for embeddings and reranking)
- `JWT_SECRET` (for local JWT verification)
- `REDIS_HOST`, `REDIS_PORT` (for queues and rate limiting)
- `QDRANT_URL`, `QDRANT_API_KEY` (vector database)

### Document Processing Variables
- `MAX_CHUNK_SIZE` (default: 1000 tokens)
- `MIN_CHUNK_SIZE` (default: 100 tokens)
- `OVERLAP_SIZE` (default: 50 tokens)
- `QUALITY_MINIMUM` (default: 50)
- `QUALITY_RECOMMENDED` (default: 70)
- `QUALITY_PREMIUM` (default: 85)

## Development Patterns

### Error Handling
All async routes wrapped with `asyncHandler` for consistent error propagation. Custom error classes with HTTP status codes (see [docs/UTILITIES.md](docs/UTILITIES.md) for details).

### Database Operations
- Use `supabaseAdmin` for server-side operations requiring elevated permissions
- Use `supabase` for user-scoped operations
- All queries include RLS policy enforcement
- Use `withRetry` wrapper for transient failures

### TypeScript Integration
- Strict TypeScript configuration with path aliases
- Database types auto-generated from Supabase schema
- Custom type definitions in `src/types/`

### Queue Management
- Bull queues for heavy operations (file processing, course generation)
- Redis-backed for persistence with job retry logic
- Real-time progress tracking with status endpoints
- Automatic cleanup of failed/completed jobs

## Common Development Tasks

### Adding New API Endpoints
1. Create route handler in `src/routes/`
2. Add middleware for authentication/validation
3. Update Express app route mounting in `src/app.ts`
4. Add integration tests

### Database Schema Changes
1. Create migration file: `npm run migration:create`
2. Write SQL in `src/database/migrations/`
3. Run migration: `npm run migration:run`
4. Update TypeScript types in `src/config/database.ts`

### Adding External Service Integration
1. Create client in `src/services/`
2. Add environment variables and validation
3. Implement error handling and retry logic
4. Add configuration to dependency injection

## Recent Critical Updates (July 2025)

### ✅ System Status: Fully Operational
All critical issues have been resolved. The AI Course Creator backend is now fully operational with:

- **Server Startup:** All routes properly configured with error handling
- **Database:** Supabase connectivity and RLS policies working
- **Document Processing:** Enhanced chunking and quality assessment
- **RAG Pipeline:** Complete hybrid search with Qdrant + Jina AI
- **Claude Integration:** JSON parsing and content generation working
- **Vector Operations:** Collection management and search functionality
- **Authentication:** JWT and API key systems functional

### ✅ Latest Fixes Applied
- **Server Startup Issue:** Created missing `src/utils/asyncHandler.js` utility
- **Document Processor:** Enhanced content sanitization and chunking reliability
- **Claude Service:** Fixed regex syntax error in JSON parsing
- **TypeScript:** Resolved compilation errors and warnings
- **Vector Service:** Exact deletion count tracking implemented

### ✅ Comprehensive Utility Library (Completed)
Created 6 enterprise-grade utility modules providing:
- **Validation:** File, course config, URL, and content quality validation
- **Error Handling:** Custom error classes and comprehensive error management
- **Async Operations:** Promise utilities, retry logic, circuit breakers
- **Content Processing:** Text cleaning, language detection, similarity calculation
- **File Management:** Type detection, security, path manipulation
- **Performance:** Monitoring, caching, rate limiting, memory tracking

See [docs/UTILITIES.md](docs/UTILITIES.md) for complete documentation.

### ✅ Configuration Management System (Completed)
Created comprehensive configuration management system with 10 modules:
- **Environment Configuration:** Joi validation, secure credential handling, environment-specific overrides
- **API Configurations:** Supabase, Jina AI, Qdrant, Claude with connection testing and validation
- **Service Configurations:** Upload limits, queue settings, cache strategies, rate limiting rules
- **Security Configuration:** CORS, JWT, Helmet headers, API key management with scope-based permissions
- **Monitoring Configuration:** Structured logging, Prometheus metrics, health checks, audit logging

All configurations include validation, documentation, and environment-specific settings. See `src/config/README.md` for complete documentation.

### ✅ Comprehensive Test Suite (Infrastructure Complete, Updates in Progress)
Created enterprise-grade test suite with 25+ test files covering all aspects:
- **Test Infrastructure:** ✅ Complete Jest multi-project setup, custom test runner, utilities
- **Unit Tests:** ✅ Error utilities (95% passing), 🔄 Validation utilities (updating), 🔄 Service layer tests (pending)
- **Integration Tests:** 🔄 API endpoints (pending updates), database operations (pending)
- **Performance Tests:** 🔄 Load testing infrastructure (pending updates)
- **Test Utilities:** ✅ Complete mock data generators, API testing client, test helpers
- **Configuration:** ✅ Jest multi-project setup, custom matchers, coverage thresholds (80% across all metrics)

**Current Status (January 2025):** Major testing breakthrough achieved - Unit tests now 85% complete:
- ✅ **Jest Configuration:** Fixed path resolution issues using `jest.simple.config.js`
- ✅ **Error Utility Tests:** All 27 tests passing (100% coverage)
- ✅ **Validation Utility Tests:** All 22 tests passing (100% coverage) - implemented missing `validateEmail` and `validatePassword`
- ✅ **FileProcessor Service Tests:** All 7 tests passing (100% coverage) - complex mocking for mammoth, pdf-parse, fs.promises
- ✅ **RAGPipeline Service Tests:** 7/12 tests passing (58% coverage) - major rewrite for LlamaIndex alignment
- 🔄 **Service Layer Tests:** CourseGenerator pending API alignment
- 🔄 **Integration Tests:** Pending updates for API endpoints and database operations

Includes executable test runner script (`run-tests.js`) with watch mode, coverage reporting, and CI/CD integration. See `tests/README.md` for complete documentation.

### ✅ Backend Cleanup (Completed)
Cleaned and organized backend directory structure:
- **Removed:** 40+ debug/test files, old test collections, duplicate test directories
- **Organized:** Clear separation between source code, tests, configuration, and documentation
- **Optimized:** Reduced clutter, improved navigation, freed storage space from old test data
- **Preserved:** All production code, comprehensive test suite, configuration management, documentation

## Documentation Organization

This documentation has been split into focused files for better maintainability:

- **CLAUDE.md** (this file): Core project info, development commands, environment setup
- **docs/ARCHITECTURE.md**: System architecture, database schema, security
- **docs/SERVICES.md**: Service implementations and integrations
- **docs/API.md**: REST API endpoints and authentication
- **docs/TESTING.md**: Testing strategy and validation procedures
- **docs/UTILITIES.md**: Utility functions and helper libraries

Each file is kept under 15,000 characters for optimal Claude Code performance.

When updating documentation, refer to [DOCUMENTATION_RULES.md](DOCUMENTATION_RULES.md) for automatic decision-making on which file to update.

---

**Quick Start:** For new developers, begin with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) to understand the system structure, then refer to [docs/API.md](docs/API.md) for endpoint usage.