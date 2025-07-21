# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

📚 **Documentation Navigation:**
- [System Architecture](docs/ARCHITECTURE.md) - Multi-tier architecture, database schema, authentication
- [Services & Components](docs/SERVICES.md) - RAG pipeline, Claude AI, document processing, vector database
- [API Documentation](docs/API.md) - REST API endpoints, authentication, error handling
- [Frontend Guide](docs/FRONTEND.md) - Next.js 14 frontend, components, state management, UI design system
- [Mobile Optimization](docs/MOBILE.md) - Mobile-first design, PWA features, touch interactions, performance optimization
- [Backend Testing](docs/TESTING.md) - Backend testing strategy and commands
- [Frontend Testing](docs/TESTING-FRONTEND.md) - Frontend testing guide with progress tracker
- [Utility Functions](docs/UTILITIES.md) - Validation, error handling, async patterns, content processing
- [Documentation Rules](DOCUMENTATION_RULES.md) - Rules for updating documentation automatically

## Project Overview

AI Course Creator is a production-ready application that helps IT, Data, and AI instructors generate interactive HTML course materials using advanced RAG (Retrieval-Augmented Generation) technology.

**Core Tech Stack:**
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend:** Node.js, Express, TypeScript
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **AI Services:** Anthropic Claude API, Jina AI (embeddings/reranking), Visual Intelligence (AI-powered visual generation)
- **Vector Database:** Qdrant
- **RAG Framework:** LlamaIndex
- **Queue System:** Bull with Redis
- **Authentication:** JWT with Supabase Auth
- **Testing:** Jest, React Testing Library, Playwright
- **Visual Generation:** SVG-based infographics, flowcharts, data visualizations

## Development Commands

### Backend Development
```bash
# Development server with hot reload
npm run dev

# Build and run production
npm run build && npm start

# Type checking
npm run typecheck

# Code quality
npm run lint
npm run lint:fix
npm run format
```

### Frontend Development
```bash
# Frontend development (from frontend/ directory)
cd frontend && npm run dev

# Frontend build and production
cd frontend && npm run build && npm start

# Frontend testing
cd frontend && npm test
cd frontend && npm run test:e2e

# Frontend code quality
cd frontend && npm run lint
cd frontend && npm run typecheck
```

### Database Management
```bash
# Run all migrations
npm run migration:run

# Create new migration file
npm run migration:create
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
All async routes wrapped with `asyncHandler` for consistent error propagation. Custom error classes with HTTP status codes.

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
4. Update TypeScript types

### Adding External Service Integration
1. Create client in `src/services/`
2. Add environment variables and validation
3. Implement error handling and retry logic
4. Add configuration to dependency injection

## System Status

✅ **Fully Operational** - All systems are functioning correctly:
- Backend API server with complete error handling
- Supabase database with RLS policies
- Document processing pipeline with quality assessment
- RAG pipeline with Qdrant vector search and Jina AI
- Claude AI integration for course generation
- **NEW:** Visual Intelligence engine for AI-powered visual generation
- Multi-format export system (HTML, PDF, PowerPoint) with visual enhancement
- Next.js 14 frontend with complete UI/UX
- Testing infrastructure (Frontend: 13% coverage, 213/285 tests passing)

## Documentation Organization

This documentation is split into focused files for better maintainability. Each specialized doc file contains detailed information about its domain:

- **CLAUDE.md** (this file): Core project info, development commands, environment setup
- **docs/ARCHITECTURE.md**: System architecture, database schema, security
- **docs/SERVICES.md**: Service implementations and integrations
- **docs/API.md**: REST API endpoints and authentication
- **docs/FRONTEND.md**: Next.js frontend, components, state management
- **docs/MOBILE.md**: Mobile optimization, PWA features, performance
- **docs/TESTING.md**: Testing strategy and validation procedures
- **docs/UTILITIES.md**: Utility functions and helper libraries

When updating documentation, refer to [DOCUMENTATION_RULES.md](DOCUMENTATION_RULES.md) for guidelines on which file to update.

---

**Quick Start:** For new developers, begin with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) to understand the system structure, then refer to the specialized documentation for your area of focus.

## Workflow Standards

### Issue-Driven Development
- Every task starts with a GitHub issue number
- Branch naming: `issue-{number}-{description}`
- Commit format: `type: Description (#issue-number)`
- One issue = One feature = One PR

### Parallel Development Rules
- Use git worktrees for features touching different areas
- Maximum 3 active worktrees
- Clear context between issues with `/clear`
- Always pull latest main before creating worktree

### Quality Gates
- Write tests BEFORE implementation
- Frontend: Minimum 90% coverage target
- Backend: Maintain current 90% coverage
- Run full test suite before PR
- Use Puppeteer for UI changes

### RAG Pipeline Specific Rules
- Test vector search performance for any Qdrant changes
- Verify chunk quality scores remain above thresholds
- Document any changes to embedding strategies
- Performance benchmark for queries > 1000 chunks