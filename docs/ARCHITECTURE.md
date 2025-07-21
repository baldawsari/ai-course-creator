# ARCHITECTURE.md

System Architecture Documentation for AI Course Creator

## Multi-Tier Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   External      │
│                 │    │                 │    │   Services      │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │                 │
│ │  Next.js 14 │ │    │ │ Express API │ │    │ ┌─────────────┐ │
│ │   React 18  │◄├────┤ │  TypeScript │ │    │ │ Claude API  │ │
│ │ TypeScript  │ │    │ │             │ │    │ │   Jina AI   │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ │   Qdrant    │ │
│                 │    │        │        │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │                 │
│ │   Zustand   │ │    │ │  Supabase   │ │    │ ┌─────────────┐ │
│ │TanStack Query│ │    │ │ PostgreSQL  │ │    │ │   Redis     │ │
│ │ Tailwind CSS│ │    │ │     RLS     │ │    │ │  (Queues)   │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────── HTTPS ───────┼────── REST API ──────┘
                                 │
                    ┌─────────────────┐
                    │   File Storage  │
                    │   (Supabase)    │
                    └─────────────────┘
```

## Core Service Architecture

**Backend Services:**
- **Advanced RAG Pipeline:** Document ingestion → Quality assessment → Smart chunking → Embedding → Vector storage → Retrieval → Generation
- **Hybrid Search System:** Combines semantic (vector) + keyword (BM25) search with QueryFusionRetriever and Reciprocal Rank Fusion
- **Document Processing:** Automated quality scoring, readability analysis, language detection, and intelligent content segmentation
- **Claude AI Integration:** Context-aware course generation with prompt engineering, caching, and parallel processing
- **Visual Intelligence:** AI-powered visual generation that analyzes content and creates infographics, flowcharts, data visualizations, and diagrams
- **Multi-tenant:** Row Level Security ensures user data isolation
- **Async Processing:** File uploads and course generation handled via Bull queues with progress tracking
- **Authentication:** JWT + API key dual authentication with role-based permissions

## Frontend Architecture

**Next.js 14 Application:**
- **App Router:** Modern Next.js routing with route groups for organization (auth), (dashboard), (public)
- **TypeScript:** Full type safety across components, hooks, and API interactions
- **Server-Side Rendering:** Optimized performance with static generation and server components

**Component Architecture:**
- **UI Components:** Shadcn/ui components built on Radix UI primitives for accessibility
- **Layout Components:** Header, Footer, Sidebar with responsive navigation
- **Feature Components:** FileUpload, CourseEditor, DocumentViewer with specialized functionality
- **Shared Components:** LoadingSpinner, ErrorBoundary, Toast notifications

**State Management:**
- **Zustand Stores:** Client-side state for authentication, course editing, and UI preferences
- **TanStack Query:** Server state management with automatic caching, background updates, and optimistic updates
- **React Hook Form:** Form state management with Zod validation schemas

**Design System:**
- **Tailwind CSS:** Utility-first styling with custom brand color palette
- **Custom Theme:** Forge Orange (#FF6B35), Deep Steel Blue (#1E3A5F), Electric Cyan (#00D9FF)
- **Responsive Design:** Mobile-first approach with dark/light mode support
- **Animations:** Framer Motion for micro-interactions and page transitions

## Key Database Schema

### Core Tables
- **courses:** Main course metadata and configuration
- **course_resources:** Uploaded files with processing status, quality scores, and quality reports
- **course_sessions:** Generated course structure (sessions/modules)
- **content_embeddings:** Vector embeddings for RAG retrieval with chunk metadata
- **generation_jobs:** Async job tracking for course generation
- **export_jobs:** Export job tracking with file paths and customization options

### User Management
- **user_profiles:** Extended user data with roles (admin/instructor/student)
- **api_keys:** API key authentication with permissions and rate limits

### Configuration
- **quality_thresholds:** Configurable quality standards (premium/recommended/minimum)

## Authentication & Authorization

### Authentication Methods
- **JWT Tokens:** Primary authentication via Supabase Auth
- **API Keys:** For programmatic access with granular permissions

### Permission System
- **Roles:** admin, instructor, student
- **Resources:** courses, resources, generation, users, api_keys
- **Actions:** create, read, update, delete, manage

### Rate Limiting
- User-based rate limiting (configurable per role)
- API key-based rate limiting (configurable per key)
- Redis-backed for distributed systems

## Queue Management Architecture

### Queue System (Bull + Redis)
- **File Processing Queue:** PDF extraction, Word processing, URL scraping
- **Document Processing Queue:** Quality assessment, chunking, embedding generation
- **Course Generation Queue:** AI-powered content creation with session management
- **Export Queue:** HTML generation with template processing

### Queue Features
- Real-time progress tracking with status endpoints
- Automatic cleanup of failed/completed jobs
- Job retry logic with exponential backoff
- Quality-based job prioritization (higher quality content processed first)

### Queue Monitoring
- Monitor job status via `/api/upload/status/:jobId` with quality metrics
- Failed jobs marked in database with error details
- Use `src/utils/fileCleanup.js` for maintenance operations

## Path Aliases Configuration

TypeScript path aliases are configured but require `tsconfig-paths/register` for runtime resolution:
- `@/*` → `src/*`
- `@config/*` → `src/config/*` 
- `@services/*` → `src/services/*`
- `@utils/*` → `src/utils/*`
- `@routes/*` → `src/routes/*`
- `@middleware/*` → `src/middleware/*`

**Note:** Use relative imports in test files to avoid path resolution issues.

## Development Patterns

### Error Handling
- All async routes wrapped with `asyncHandler` for consistent error propagation
- Custom error classes with HTTP status codes (see docs/UTILITIES.md for details)
- Centralized error logging with Winston

### Database Operations
- Use `supabaseAdmin` for server-side operations requiring elevated permissions
- Use `supabase` for user-scoped operations
- All queries include RLS policy enforcement
- Use `withRetry` wrapper for transient failures

### TypeScript Integration
- Strict TypeScript configuration with path aliases
- Database types auto-generated from Supabase schema
- Custom type definitions in `src/types/`

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

### Qdrant Vector Database Variables
- `QDRANT_URL` (default: http://localhost:6333)
- `QDRANT_API_KEY` (for authentication)
- `QDRANT_TIMEOUT` (default: 30000ms)
- `QDRANT_MAX_RETRIES` (default: 3)
- `QDRANT_VECTOR_SIZE` (default: 2048)
- `QDRANT_DISTANCE` (default: Cosine)
- `QDRANT_MAX_BATCH_SIZE` (default: 1000)
- `QDRANT_MAX_CONCURRENT_BATCHES` (default: 5)
- `QDRANT_ENABLE_QUANTIZATION` (default: false)
- `QDRANT_HNSW_M` (default: 16)
- `QDRANT_HNSW_EF_CONSTRUCT` (default: 100)

## Security Architecture

### Data Protection
- Row Level Security (RLS) for multi-tenant data isolation
- Encrypted API keys with permission scoping
- Input validation and sanitization at all entry points
- File upload security with type validation and magic number checking

### Rate Limiting & DDoS Protection
- Token bucket rate limiting with Redis backend
- Per-user and per-API-key rate limits
- Circuit breaker patterns for external service protection

### Authentication Security
- JWT token validation with configurable expiration
- API key rotation and revocation capabilities
- Role-based access control (RBAC) for all resources

---

For detailed service implementations, see [docs/SERVICES.md](SERVICES.md)
For API documentation, see [docs/API.md](API.md)
For testing procedures, see [docs/TESTING.md](TESTING.md)