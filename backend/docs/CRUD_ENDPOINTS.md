# CRUD API Endpoints Documentation

## Overview

This document describes the core CRUD (Create, Read, Update, Delete) operations available in the AI Course Creator API.

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All endpoints return responses in the following format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "status": 400,
  "details": ["Additional error details"]
}
```

## Courses API

### GET /api/courses
List user's courses with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `search` (string): Search in title and description
- `level` (string): Filter by level (beginner, intermediate, advanced)
- `status` (string): Filter by status (draft, published, archived)
- `tags` (string[]): Filter by tags
- `sortBy` (string): Sort field (title, level, status, created_at, updated_at)
- `sortOrder` (string): Sort order (asc, desc)

### GET /api/courses/:id
Get single course details including sessions and resources.

### POST /api/courses
Create a new course.

**Request Body:**
```json
{
  "title": "Course Title",
  "description": "Course description",
  "level": "intermediate",
  "duration": "4 weeks",
  "target_audience": "Developers",
  "prerequisites": ["Basic programming"],
  "objectives": ["Learn X", "Master Y"],
  "tags": ["programming", "web"]
}
```

### PUT /api/courses/:id
Update course metadata.

### DELETE /api/courses/:id
Delete a course (soft delete with cascade).

### GET /api/courses/:id/export
Export course data as JSON.

## Sessions API

### GET /api/courses/:courseId/sessions
List all sessions for a course.

### POST /api/courses/:courseId/sessions
Create a new session in a course.

**Request Body:**
```json
{
  "title": "Session Title",
  "description": "Session description",
  "duration_minutes": 60,
  "objectives": ["Objective 1", "Objective 2"],
  "content": {},
  "sequence_number": 1
}
```

### PUT /api/sessions/:id
Update session details.

### DELETE /api/sessions/:id
Delete a session and reorder remaining sessions.

### PUT /api/sessions/:id/reorder
Change session position within a course.

**Request Body:**
```json
{
  "newPosition": 3
}
```

## Activities API

Activities are stored within sessions as JSONB.

### GET /api/sessions/:sessionId/activities
List all activities in a session.

### POST /api/sessions/:sessionId/activities
Add an activity to a session.

**Request Body:**
```json
{
  "type": "lecture",
  "title": "Introduction to Topic",
  "description": "Activity description",
  "duration_minutes": 30,
  "content": {},
  "order": 0
}
```

**Activity Types:**
- lecture
- quiz
- assignment
- discussion
- lab
- reading

### PUT /api/activities/:id
Update an activity.

### DELETE /api/activities/:id
Delete an activity from its session.

## User Profile API

### GET /api/profile
Get current user's profile.

**Response:**
```json
{
  "profile": {
    "id": "user-id",
    "email": "user@example.com",
    "full_name": "John Doe",
    "username": "johndoe",
    "role": "instructor",
    "avatar_url": "/uploads/avatars/avatar.jpg",
    "courseCount": 10,
    "apiKeyCount": 2
  }
}
```

### PUT /api/profile
Update user profile.

**Request Body:**
```json
{
  "full_name": "John Doe",
  "username": "johndoe",
  "bio": "Instructor and developer",
  "website": "https://example.com",
  "location": "New York",
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notifications": {
      "email": true,
      "push": false
    }
  }
}
```

### POST /api/profile/avatar
Upload a new avatar image.

**Request:** Multipart form data with `avatar` field
**Supported formats:** JPEG, PNG, GIF, WebP
**Max size:** 5MB

### GET /api/profile/usage
Get usage statistics for the current user.

**Response:**
```json
{
  "usage": {
    "courses": {
      "total": 15,
      "draft": 3,
      "published": 10,
      "archived": 2
    },
    "resources": {
      "total": 45,
      "totalSize": 524288000,
      "processed": 42,
      "pending": 3
    },
    "generation": {
      "totalJobs": 25,
      "completed": 20,
      "failed": 2,
      "pending": 3,
      "last30Days": 10
    },
    "storage": {
      "used": 524288000,
      "limit": 5368709120,
      "percentage": 9.77,
      "usedFormatted": "500 MB",
      "limitFormatted": "5 GB"
    }
  }
}
```

## Dashboard API

### GET /api/dashboard/stats
Get comprehensive dashboard statistics.

**Response includes:**
- Overview statistics (courses, sessions, resources)
- Recent activity metrics (last 7 days)
- Resource processing status
- Generation job success rates
- Monthly/weekly trends

### GET /api/dashboard/recent
Get recently updated courses.

**Query Parameters:**
- `limit` (number): Number of courses to return (default: 10, max: 50)

### GET /api/dashboard/activity
Get activity feed showing recent actions.

**Query Parameters:**
- `limit` (number): Items per page (default: 20, max: 100)
- `offset` (number): Pagination offset (default: 0)

**Activity Types:**
- course_created
- course_published
- resource_uploaded
- generation_completed
- generation_failed

## Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., username taken)
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- Default: 100 requests per 15 minutes
- Upload endpoints: Additional file size limits apply
- Generation endpoints: Subject to queue limits

## Permissions

Endpoints respect role-based permissions:
- **Admin**: Full access to all resources
- **Instructor**: CRUD on own courses, resources
- **Student**: Read-only access to enrolled courses