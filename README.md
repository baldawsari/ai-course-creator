# 🎓 AI Course Creator

> Transform documents into interactive HTML courses using advanced RAG (Retrieval-Augmented Generation) technology powered by Claude AI and Jina AI.

## 🚀 Overview

AI Course Creator is a production-ready application that helps IT, Data, and AI instructors generate comprehensive, interactive HTML course materials from uploaded documents. The system processes PDFs, Word documents, and URLs to create structured course content with advanced AI-powered content generation.

### ✨ Key Features

- **🤖 Advanced RAG Pipeline** - Hybrid search combining semantic and keyword search using Qdrant vector database
- **📚 Multi-Format Support** - Process PDFs, Word docs, text files, and web URLs
- **🎨 Interactive HTML Export** - Generate beautiful, responsive course materials
- **📊 Quality Assessment** - Automated content quality scoring and recommendations
- **🔍 Smart Chunking** - Intelligent document segmentation with overlap optimization
- **⚡ Real-time Processing** - Background job processing with progress tracking
- **🔐 Enterprise Security** - Row-level security with Supabase and JWT authentication

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   AI Services  │
│   (React)       │◄──►│  (Node.js/TS)   │◄──►│   Claude AI     │
│                 │    │                 │    │   Jina AI       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │   Supabase      │              │
         │              │  (PostgreSQL)   │              │
         │              └─────────────────┘              │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   File Storage  │    │     Qdrant      │    │     Redis       │
│   (Supabase)    │    │ (Vector Store)  │    │   (Queues)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL with RLS)
- **Vector Database:** Qdrant
- **AI Services:** Anthropic Claude API, Jina AI
- **RAG Framework:** LlamaIndex
- **Queue System:** Bull with Redis
- **File Processing:** Multer, pdf-parse, mammoth, puppeteer

### Frontend
- **Framework:** React with Vite
- **Styling:** Tailwind CSS
- **State Management:** React hooks + Context
- **File Upload:** React Dropzone
- **Authentication:** Supabase Auth

### Infrastructure
- **Authentication:** JWT with Supabase Auth
- **File Storage:** Supabase Storage
- **Rate Limiting:** Redis-backed
- **Monitoring:** Structured logging with Winston
- **Testing:** Jest with comprehensive test suite

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL (or Supabase account)
- Redis instance
- Qdrant instance
- API keys for Claude AI and Jina AI

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ai-course-creator.git
cd ai-course-creator
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

3. **Environment setup**
```bash
# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

4. **Configure environment variables**

See [GET_API_KEYS.md](backend/GET_API_KEYS.md) for detailed API key setup instructions.

**Backend (.env):**
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# AI Services
ANTHROPIC_API_KEY=your_claude_api_key
JINA_API_KEY=your_jina_api_key

# Vector Database
QDRANT_URL=http://localhost:6334
QDRANT_API_KEY=your_qdrant_key

# Queue System
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your_jwt_secret_minimum_32_characters
```

5. **Database setup**
```bash
cd backend
npm run migration:run
```

6. **Start services**
```bash
# Start backend
cd backend
npm run dev

# Start frontend (in new terminal)
cd frontend  
npm run dev
```

## 📚 Documentation

- **[Architecture Guide](docs/ARCHITECTURE.md)** - System design and database schema
- **[Services Documentation](docs/SERVICES.md)** - RAG pipeline and AI service integrations  
- **[API Reference](docs/API.md)** - REST endpoints and authentication
- **[Testing Guide](docs/TESTING.md)** - Comprehensive testing strategy
- **[Utilities Reference](docs/UTILITIES.md)** - Helper functions and validation

## 🧪 Testing

The project includes a comprehensive test suite with 85% unit test coverage:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm test -- tests/unit/
npm test -- tests/integration/

# Use custom test runner
node run-tests.js --coverage --watch
```

**Current Test Status:**
- ✅ Error utilities: 100% (27/27 tests)
- ✅ Validation utilities: 100% (22/22 tests)  
- ✅ File processor: 100% (7/7 tests)
- ✅ RAG pipeline: 58% (7/12 tests)

## 🔧 Development

### Key Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run typecheck       # TypeScript validation
npm run lint            # Code linting
npm run format          # Code formatting

# Database
npm run migration:run    # Run migrations
npm run migration:create # Create new migration

# Testing
npm test                # Run test suite
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Adding New Features

1. **API Endpoints:** Create route handlers in `backend/src/routes/`
2. **Services:** Add business logic in `backend/src/services/` 
3. **Database:** Create migrations in `backend/src/database/migrations/`
4. **Frontend:** Add components in `frontend/src/components/`
5. **Tests:** Add test files following existing patterns

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Manual Deployment

1. Build the application
2. Set production environment variables
3. Run database migrations
4. Start the server with process manager (PM2)

See deployment guides in the docs folder for detailed instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Follow existing code style
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation:** Check the [docs](docs/) folder
- **Issues:** Create an issue on GitHub
- **Discussions:** Use GitHub Discussions for questions

## 🙏 Acknowledgments

- **Anthropic** for Claude AI API
- **Jina AI** for embeddings and reranking
- **Supabase** for database and authentication
- **Qdrant** for vector database
- **LlamaIndex** for RAG framework

---

**Built with ❤️ for educators and content creators**