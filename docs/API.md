# API.md

API Documentation for AI Course Creator

## Upload API Endpoints

### File Upload System
- `POST /api/upload/files` - Multiple file upload (max 10 files, 50MB each) with automatic quality assessment
- `POST /api/upload/url` - URL content processing with validation and quality scoring
- `GET /api/upload/status/:jobId` - Real-time progress tracking with quality metrics
- `DELETE /api/upload/:fileId` - File deletion with cleanup
- `GET /api/upload/list` - Paginated file listing with quality scores and filters

#### File Upload Example
```javascript
// POST /api/upload/files
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);
formData.append('courseId', 'course-123');

const response = await fetch('/api/upload/files', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

#### URL Upload Example
```javascript
// POST /api/upload/url
const response = await fetch('/api/upload/url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    url: 'https://example.com/document.pdf',
    courseId: 'course-123'
  })
});
```

## Course Management API

### Comprehensive Course CRUD Operations

#### Course Operations
- `GET /api/courses` - Paginated course listing with search, filtering, and sorting
- `POST /api/courses` - Create courses with Joi validation and quality checks
- `GET /api/courses/:id` - Detailed course retrieval with session and resource data
- `PUT /api/courses/:id` - Update course metadata with validation
- `DELETE /api/courses/:id` - Secure course deletion with cascading cleanup

#### Resource Management
- `GET /api/courses/:id/resources` - List course resources with quality filtering
- `POST /api/courses/:id/resources` - Bulk resource assignment to courses
- `DELETE /api/courses/:id/resources/:resourceId` - Remove resources from courses

#### Session Management
- `GET /api/courses/:id/sessions` - Retrieve ordered course sessions
- `POST /api/courses/:id/sessions` - Create sessions with auto-sequencing
- `PUT /api/courses/:id/sessions/:sessionId` - Update session content
- `DELETE /api/courses/:id/sessions/:sessionId` - Delete sessions with automatic reordering
- `POST /api/courses/:id/sessions/reorder` - Bulk session reordering

### Course API Examples

#### Create Course
```javascript
// POST /api/courses
const courseData = {
  title: 'Machine Learning Fundamentals',
  description: 'Introduction to ML concepts and algorithms',
  level: 'intermediate',
  language: 'en',
  duration: 20,
  sessionCount: 8,
  objectives: [
    'Understand basic ML concepts',
    'Implement simple algorithms',
    'Evaluate model performance'
  ],
  tags: ['machine-learning', 'python', 'data-science']
};

const response = await fetch('/api/courses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(courseData)
});
```

#### Get Course with Sessions
```javascript
// GET /api/courses/:id
const response = await fetch('/api/courses/course-123', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const course = await response.json();
// Returns course with embedded sessions and resources
```

## Generation API

### Content Analysis and Course Generation

#### Content Analysis
- `POST /api/generation/analyze` - Deep content analysis with quality metrics, readability scoring, and topic extraction

#### Course Generation
- `POST /api/generation/generate` - Start advanced or basic course generation with customizable options
- `POST /api/generation/regenerate` - Regenerate specific sections (outline, sessions, assessments, activities)

#### Job Management
- `GET /api/generation/status/:jobId` - Real-time status tracking with progress indicators and estimated completion
- `GET /api/generation/result/:jobId` - Retrieve detailed generation results with course data
- `GET /api/generation/metrics` - Analytics dashboard with success rates, completion times, and usage statistics

### Generation API Examples

#### Start Course Generation
```javascript
// POST /api/generation/generate
const generationConfig = {
  courseId: 'course-123',
  generationType: 'advanced', // 'basic' or 'advanced'
  options: {
    includeAssessments: true,
    includeActivities: true,
    customPrompt: 'Focus on practical examples',
    qualityThreshold: 70,
    sessionCount: 8
  }
};

const response = await fetch('/api/generation/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(generationConfig)
});

const { jobId } = await response.json();
```

#### Check Generation Status
```javascript
// GET /api/generation/status/:jobId
const response = await fetch(`/api/generation/status/${jobId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const status = await response.json();
// Returns: { status, progress, estimatedCompletion, currentStep }
```

## Export API

### HTML Export System

#### HTML Export
- `POST /api/export/html` - Generate responsive HTML course exports with template selection
- `GET /api/export/templates` - List available templates with previews and feature descriptions
- `POST /api/export/customize` - Create customized exports with branding, themes, and layout options

#### Download Management
- `GET /api/export/status/:exportId` - Export progress tracking with file size and completion estimates
- `GET /api/export/download/:exportId` - Secure file downloads with automatic cleanup
- `GET /api/export/history` - User export history with filtering and pagination
- `DELETE /api/export/:exportId` - Export deletion with file cleanup

### Export API Examples

#### Start HTML Export
```javascript
// POST /api/export/html
const exportConfig = {
  courseId: 'course-123',
  template: 'modern', // 'modern', 'classic', 'minimal', 'interactive', 'mobile-first'
  format: 'single-page', // 'single-page' or 'multi-page'
  customization: {
    branding: {
      logo: 'https://example.com/logo.png',
      primaryColor: '#007bff',
      fontFamily: 'Inter'
    },
    features: {
      darkMode: true,
      printOptimized: true,
      interactive: false
    }
  }
};

const response = await fetch('/api/export/html', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(exportConfig)
});
```

#### Download Export
```javascript
// GET /api/export/download/:exportId
const response = await fetch(`/api/export/download/${exportId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Download as blob for file saving
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'course-export.zip';
a.click();
```

## Authentication API

### JWT Authentication
- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get current user profile

### API Key Management
- `POST /api/auth/api-keys` - Create new API key
- `GET /api/auth/api-keys` - List user's API keys
- `DELETE /api/auth/api-keys/:keyId` - Revoke API key
- `PUT /api/auth/api-keys/:keyId` - Update API key permissions

### Authentication Examples

#### Login
```javascript
// POST /api/auth/login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { token, user } = await response.json();
```

#### Create API Key
```javascript
// POST /api/auth/api-keys
const response = await fetch('/api/auth/api-keys', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Integration API Key',
    permissions: ['courses:read', 'generation:create'],
    expiresAt: '2024-12-31T23:59:59Z'
  })
});
```

## Health and Monitoring APIs

### Health Checks
- `GET /api/health` - Overall system health
- `GET /api/health/database` - Database connectivity
- `GET /api/health/vector` - Vector database status
- `GET /api/health/claude` - Claude API connectivity
- `GET /api/health/jina` - Jina AI service status

### Metrics
- `GET /api/metrics/system` - System performance metrics
- `GET /api/metrics/usage` - API usage statistics
- `GET /api/metrics/generation` - Course generation analytics

## Error Responses

### Standard Error Format
```javascript
{
  "success": false,
  "error": {
    "name": "ValidationError",
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "errors": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ],
    "timestamp": "2024-07-07T12:00:00Z"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` (400) - Input validation failed
- `AUTHENTICATION_ERROR` (401) - Authentication required
- `AUTHORIZATION_ERROR` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `EXTERNAL_SERVICE_ERROR` (502) - External service unavailable
- `INTERNAL_ERROR` (500) - Server error

## Rate Limiting

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### Rate Limits by Role
- **Admin:** 5000 requests/hour
- **Instructor:** 2000 requests/hour
- **Student:** 500 requests/hour
- **API Key:** Configurable per key

---

For service implementation details, see [docs/SERVICES.md](SERVICES.md)
For testing procedures, see [docs/TESTING.md](TESTING.md)
For utility functions, see [docs/UTILITIES.md](UTILITIES.md)