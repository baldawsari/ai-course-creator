# SERVICES.md

Service architecture and components for the AI Course Creator backend.

## Core Services Overview

### Document Processing Service
**Purpose:** Handles file uploads, content extraction, and quality assessment

**Key Features:**
- Multi-format support (PDF, DOCX, TXT, URLs)
- Content quality scoring (0-100 scale)
- Intelligent chunking strategies
- Language detection and preprocessing
- Async processing with Bull queues

**Quality Thresholds:**
- Premium (85-100): Professional-grade content
- Recommended (70-84): Standard quality
- Acceptable (50-69): Basic content
- Below Threshold (<50): Requires enhancement

### RAG Pipeline Service
**Purpose:** Implements Retrieval-Augmented Generation for course content

**Components:**
- **Vector Storage:** Qdrant integration for semantic search
- **Embeddings:** Jina AI for text embeddings
- **Reranking:** Jina AI reranker for relevance optimization
- **Hybrid Search:** Combines vector and keyword search
- **LlamaIndex Integration:** Orchestrates RAG workflow

**Pipeline Flow:**
1. Document chunking → Embedding generation
2. Vector storage → Index creation
3. Query processing → Hybrid retrieval
4. Reranking → Context assembly
5. Generation → Quality filtering

### Claude AI Service
**Purpose:** Generates course content using Anthropic's Claude API

**Features:**
- Structured course generation
- JSON response parsing
- Rate limiting and error handling
- Multiple model support (Haiku, Sonnet, Opus)
- Context-aware content creation

### Visual Intelligence Service
**Purpose:** AI-powered visual content generation from text

**Core Capabilities:**
- **Content Analysis:** Pattern detection for lists, processes, data, timelines
- **Visual Generation:** SVG-based infographics, flowcharts, charts, diagrams
- **AI Enhancement:** Claude API integration for intelligent visual decisions
- **Quality Assessment:** Automatic scoring of generated visuals

**Visual Types:**
1. **Infographics:** Lists, objectives, key points
2. **Flowcharts:** Process steps, workflows
3. **Data Visualizations:** Bar charts, pie charts for metrics
4. **Timelines:** Chronological events, milestones
5. **Comparison Charts:** Side-by-side comparisons
6. **Hierarchy Diagrams:** Organizational structures

**Features:**
- 30+ semantic icon library
- 5 color palettes (tech, business, creative, academic, default)
- Print-ready SVG output
- Responsive design with viewBox
- Professional styling (gradients, shadows, animations)

**Integration Points:**
- DesignEngine: Handlebars helpers ({{aiVisual}}, {{smartTransform}})
- HTMLExporter: Automatic visual enhancement during export
- Content Enhancement: Analyzes and enriches course materials

### Design Engine Service
**Purpose:** Advanced template and styling system with visual intelligence integration

**Enhanced Features:**
- Template compilation and caching
- Dynamic CSS generation
- Visual Intelligence integration
- Component-based architecture
- Quality-based content prioritization

**New Capabilities:**
- `enhanceContentWithVisuals()`: Automatically adds visuals to content
- `generateVisualReport()`: Creates comprehensive visual reports
- AI-powered Handlebars helpers for template enhancement

### Export Services

#### HTML Export Service
**Purpose:** Generates HTML course packages

**Features:**
- 5 professional templates
- Handlebars templating engine
- ZIP archive creation
- Asset management
- Responsive design

#### PDF Export Service
**Purpose:** Converts courses to PDF documents

**Features:**
- Puppeteer-based rendering
- Table of contents generation
- Custom headers/footers
- Multiple page formats
- Brand customization

#### PowerPoint Export Service
**Purpose:** Creates presentation versions of courses

**Features:**
- pptxgenjs integration
- Multiple slide templates
- Automatic layout selection
- Brand color support
- 16:9 and 4:3 aspect ratios

#### Bundle Export Service
**Purpose:** Multi-format export in single package

**Features:**
- Combines HTML, PDF, PowerPoint
- Unified ZIP packaging
- Format-specific options
- Error resilience
- Progress tracking

### Design Engine Service
**Purpose:** Template and component management

**Features:**
- Component architecture (headers, sessions, activities)
- CSS variable theming
- Quality score integration
- Responsive breakpoints
- Performance optimization

## Service Architecture Patterns

### Queue Management
All heavy operations use Bull queues:
- Document processing jobs
- Course generation jobs
- Export generation jobs
- Retry logic with exponential backoff
- Progress tracking and status updates

### External Service Integration
- **Supabase:** Database and file storage
- **Qdrant:** Vector database operations
- **Jina AI:** Embeddings and reranking
- **Claude AI:** Content generation
- **Redis:** Queue backend and caching

### Error Handling
- Service-specific error classes
- Retry strategies for transient failures
- Circuit breaker pattern for external APIs
- Comprehensive logging and monitoring

### Performance Optimization
- Chunking for large documents
- Parallel processing where possible
- Caching strategies (Redis, memory)
- Connection pooling
- Rate limiting

## Configuration

### Environment Variables
Each service requires specific configuration:
- API keys for external services
- Rate limits and timeouts
- Queue concurrency settings
- Storage configurations

### Service Dependencies
Services are loosely coupled with clear interfaces:
- Document processing → RAG pipeline
- RAG pipeline → Claude service
- Claude service → Export services
- All services → Queue system

## Monitoring and Health Checks

### Service Health Endpoints
- `/health/services` - Overall service status
- `/health/queues` - Queue system status
- `/health/external` - External service connectivity

### Metrics Collection
- Processing times
- Success/failure rates
- Queue depths
- API usage tracking

---

For implementation details and code examples, refer to the source code in `src/services/` or the service-specific test suites.