# API.md

REST API endpoints and authentication for the AI Course Creator backend.

## Base URL
- Development: `http://localhost:3001/api`
- Production: Configure via `BACKEND_URL` environment variable

## Authentication

### JWT Token Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### API Key Authentication
Some endpoints support API key authentication:
```
X-API-Key: <api_key>
```

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns JWT)
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout and invalidate token
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

## Core API Endpoints

### Upload & Document Management
- `POST /api/upload/files` - Upload multiple files (max 10 files, 50MB each)
- `POST /api/upload/url` - Process content from URL
- `GET /api/upload/status/:jobId` - Check upload job status
- `GET /api/upload/list` - List uploaded documents (paginated)
- `DELETE /api/upload/:fileId` - Delete uploaded file

### Course Management
- `GET /api/courses` - List user's courses (paginated)
- `POST /api/courses` - Create new course
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course
- `POST /api/courses/:id/duplicate` - Duplicate course

### Course Generation
- `POST /api/generate/course` - Generate course from documents
- `GET /api/generate/status/:jobId` - Check generation status
- `POST /api/generate/enhance` - Enhance existing course content
- `GET /api/generate/models` - List available AI models

### Export Endpoints
- `POST /api/export/html` - Export course as HTML
- `POST /api/export/pdf` - Export course as PDF
- `POST /api/export/ppt` - Export course as PowerPoint
- `POST /api/export/bundle` - Export multiple formats
- `GET /api/export/status/:jobId` - Check export job status
- `GET /api/export/download/:fileId` - Download exported file

### Vector Search
- `POST /api/vectors/search` - Semantic search in documents
- `GET /api/vectors/collections` - List vector collections
- `DELETE /api/vectors/collection/:name` - Delete collection

### Health & Monitoring
- `GET /api/health` - Basic health check
- `GET /api/health/services` - Detailed service status
- `GET /api/health/queues` - Queue system status

## Request/Response Format

### Standard Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... }
  }
}
```

### Pagination Format
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

## Common Query Parameters

### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

### Filtering
- `search` - Text search query
- `status` - Filter by status
- `startDate` - Filter by date range
- `endDate` - Filter by date range

### Sorting
- `sortBy` - Field to sort by
- `sortOrder` - Sort direction (asc/desc)

## Rate Limiting

### Default Limits
- Anonymous: 10 requests/minute
- Authenticated: 100 requests/minute
- Premium: 1000 requests/minute

### Headers
- `X-RateLimit-Limit` - Request limit
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset timestamp

## WebSocket Events

### Connection
```javascript
const socket = io(WS_URL, {
  auth: { token: jwt_token }
});
```

### Events
- `job:progress` - Job progress updates
- `generation:status` - Course generation updates
- `export:complete` - Export completion
- `error` - Error notifications

## Error Codes

### Client Errors (4xx)
- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `RATE_LIMITED` - Too many requests

### Server Errors (5xx)
- `INTERNAL_ERROR` - Server error
- `SERVICE_UNAVAILABLE` - External service down
- `TIMEOUT` - Request timeout

## API Versioning

The API uses URL versioning. Current version: v1
- Future versions: `/api/v2/...`
- Deprecation notices via headers

---

For detailed request/response examples and integration guides, refer to the API client implementation in `frontend/src/lib/api/`.