# AI Course Creator Backend

A production-ready Node.js backend for the AI Course Creator application that helps instructors generate interactive HTML course materials using advanced RAG technology.

## Tech Stack

- **Node.js & Express** - Server framework
- **Supabase** - Database and authentication
- **LlamaIndex** - RAG implementation
- **Jina AI** - Embeddings and document processing
- **Qdrant** - Vector database
- **Claude API** - Content generation
- **Multer** - File uploads
- **JWT** - Authentication

## Project Structure

```
backend/
├── src/
│   ├── routes/         # API route handlers
│   ├── services/       # Business logic and external service integrations
│   ├── utils/          # Utility functions and helpers
│   ├── middleware/     # Express middleware
│   ├── config/         # Configuration files
│   ├── models/         # Data models
│   └── app.js          # Express application setup
├── tests/              # Test files
├── docs/               # API documentation
├── uploads/            # Uploaded files (gitignored)
├── package.json        # Dependencies and scripts
├── .env.example        # Environment variables template
├── .gitignore         # Git ignore file
├── Dockerfile         # Docker configuration
└── README.md          # This file
```

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Anthropic API key
- Jina AI API key
- Qdrant instance (local or cloud)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` with your actual configuration values

5. Create uploads directory:
```bash
mkdir uploads
```

## Development

Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000` by default.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/profile` - Get user profile

### File Upload
- `POST /api/upload/files` - Upload course materials (PDFs, DOCX, etc.)
- `POST /api/upload/url` - Add URL resource
- `GET /api/upload/list` - List uploaded files
- `DELETE /api/upload/:id` - Delete uploaded file

### Courses
- `GET /api/courses` - List all courses
- `GET /api/courses/:id` - Get course details
- `POST /api/courses` - Create new course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Generation
- `POST /api/generation/start` - Start course generation
- `GET /api/generation/status/:id` - Check generation status
- `POST /api/generation/export` - Export course as HTML

### Health Check
- `GET /health` - Server health status

## Scripts

```bash
npm start         # Start production server
npm run dev       # Start development server with nodemon
npm test          # Run tests
npm run lint      # Run ESLint
npm run format    # Format code with Prettier
```

## Environment Variables

See `.env.example` for all required environment variables and their descriptions.

## Docker Support

Build and run with Docker:
```bash
docker build -t ai-course-backend .
docker run -p 3000:3000 --env-file .env ai-course-backend
```

## Testing

Run the test suite:
```bash
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

## Security

- Helmet.js for security headers
- CORS configured for specific origins
- Rate limiting on sensitive endpoints
- JWT authentication
- Input validation with Joi
- SQL injection protection via Supabase

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.