import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MockDataGenerator, MOCK_DATA } from './mock-data'

// Base API URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// API response helpers - these return the data directly since axios extracts .data
const createSuccessResponse = <T>(data: T) => data

const createErrorResponse = (message: string, status = 400, code?: string) => ({
  message,
  code,
  status,
})

const createPaginatedResponse = <T>(
  items: T[], 
  page = 1, 
  limit = 20, 
  total?: number
) => ({
  data: items,
  pagination: {
    page,
    limit,
    total: total || items.length,
    totalPages: Math.ceil((total || items.length) / limit),
    hasNextPage: page * limit < (total || items.length),
    hasPrevPage: page > 1,
  },
})

// Mock handlers
export const apiHandlers = [
  // Authentication endpoints
  http.post(`${API_BASE}/auth/login`, async () => {
    return HttpResponse.json(createSuccessResponse({
      user: MOCK_DATA.users.admin,
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
    }), { status: 200 })
  }),

  http.post(`${API_BASE}/auth/register`, async () => {
    const newUser = MockDataGenerator.user()
    return HttpResponse.json(createSuccessResponse({
      user: newUser,
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
    }), { status: 201 })
  }),

  http.post(`${API_BASE}/auth/logout`, async () => {
    return HttpResponse.json(createSuccessResponse({ message: 'Logged out successfully' }), { status: 200 })
  }),

  http.get(`${API_BASE}/auth/me`, async () => {
    return HttpResponse.json(createSuccessResponse(MOCK_DATA.users.admin), { status: 200 })
  }),

  http.post(`${API_BASE}/auth/forgot-password`, async () => {
    return HttpResponse.json(createSuccessResponse({
      message: 'Password reset instructions sent to your email'
    }), { status: 200 })
  }),

  // Document endpoints
  http.get(`${API_BASE}/documents`, async ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const limit = Number(url.searchParams.get('limit')) || 20
    const search = url.searchParams.get('search')
    
    let documents = MockDataGenerator.documents(25)
    
    if (search) {
      documents = documents.filter(doc => 
        doc.filename.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const pageDocuments = documents.slice(startIndex, endIndex)
    
    return HttpResponse.json(createPaginatedResponse(pageDocuments, page, limit, documents.length), { status: 200 })
  }),

  http.post(`${API_BASE}/documents/upload`, async () => {
    const newDocument = MockDataGenerator.document({
      status: 'processing',
    })
    
    return HttpResponse.json(createSuccessResponse(newDocument), { status: 201 })
  }),

  http.get(`${API_BASE}/documents/:id`, async ({ params }) => {
    const { id } = params
    const document = MockDataGenerator.document({ id: id as string })
    
    return HttpResponse.json(createSuccessResponse(document), { status: 200 })
  }),

  http.delete(`${API_BASE}/documents/:id`, async () => {
    return HttpResponse.json(createSuccessResponse({ message: 'Document deleted successfully' }), { status: 200 })
  }),

  // Course endpoints
  http.get(`${API_BASE}/courses`, async ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const limit = Number(url.searchParams.get('limit')) || 20
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')
    const difficulty = url.searchParams.get('difficulty')
    
    let courses = MockDataGenerator.courses(15)
    
    if (search) {
      courses = courses.filter(course => 
        course.title.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    if (status) {
      courses = courses.filter(course => course.status === status)
    }
    
    if (difficulty) {
      courses = courses.filter(course => course.difficulty === difficulty)
    }
    
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const pageCourses = courses.slice(startIndex, endIndex)
    
    return HttpResponse.json(createPaginatedResponse(pageCourses, page, limit, courses.length), { status: 200 })
  }),

  http.post(`${API_BASE}/courses`, async () => {
    const newCourse = MockDataGenerator.course({
      status: 'draft',
    })
    
    return HttpResponse.json(createSuccessResponse(newCourse), { status: 201 })
  }),

  http.get(`${API_BASE}/courses/:id`, async ({ params }) => {
    const { id } = params
    const course = MockDataGenerator.course({ id: id as string })
    
    return HttpResponse.json(createSuccessResponse(course), { status: 200 })
  }),

  http.put(`${API_BASE}/courses/:id`, async ({ params }) => {
    const { id } = params
    const updatedCourse = MockDataGenerator.course({ 
      id: id as string,
      updatedAt: new Date().toISOString(),
    })
    
    return HttpResponse.json(createSuccessResponse(updatedCourse), { status: 200 })
  }),

  http.delete(`${API_BASE}/courses/:id`, async () => {
    return HttpResponse.json(createSuccessResponse({ message: 'Course deleted successfully' }), { status: 200 })
  }),

  http.delete(`${API_BASE}/courses/bulk`, async () => {
    return HttpResponse.json(createSuccessResponse({ 
      message: 'Courses deleted successfully',
      deletedCount: 2,
    }), { status: 200 })
  }),

  // Generation endpoints
  http.post(`${API_BASE}/courses/generate`, async () => {
    const job = MockDataGenerator.job({
      type: 'course_generation',
      status: 'running',
      progress: 0,
    })
    
    return HttpResponse.json(createSuccessResponse({
      jobId: job.id,
      courseId: MockDataGenerator.course().id,
      status: 'started',
    }), { status: 201 })
  }),

  http.post(`${API_BASE}/courses/:id/generate`, async () => {
    const job = MockDataGenerator.job({
      type: 'content_generation',
      status: 'running',
      progress: 0,
    })
    
    return HttpResponse.json(createSuccessResponse({
      jobId: job.id,
      status: 'started',
    }), { status: 201 })
  }),

  // Job endpoints
  http.get(`${API_BASE}/jobs/:id`, async ({ params }) => {
    const { id } = params
    const job = MockDataGenerator.job({ id: id as string })
    
    return HttpResponse.json(createSuccessResponse(job), { status: 200 })
  }),

  http.post(`${API_BASE}/jobs/:id/cancel`, async ({ params }) => {
    const { id } = params
    const job = MockDataGenerator.job({ 
      id: id as string,
      status: 'cancelled',
    })
    
    return HttpResponse.json(createSuccessResponse(job), { status: 200 })
  }),

  http.get(`${API_BASE}/jobs`, async () => {
    const jobs = MockDataGenerator.jobs(10)
    
    return HttpResponse.json(createSuccessResponse(jobs), { status: 200 })
  }),

  // Export endpoints
  http.post(`${API_BASE}/export/html/:courseId`, async () => {
    const job = MockDataGenerator.job({
      type: 'export',
      status: 'running',
    })
    
    return HttpResponse.json(createSuccessResponse({
      jobId: job.id,
      status: 'started',
    }), { status: 201 })
  }),

  http.post(`${API_BASE}/export/pdf/:courseId`, async () => {
    const job = MockDataGenerator.job({
      type: 'export',
      status: 'running',
    })
    
    return HttpResponse.json(createSuccessResponse({
      jobId: job.id,
      status: 'started',
    }), { status: 201 })
  }),

  http.post(`${API_BASE}/export/bundle/:courseId`, async () => {
    const job = MockDataGenerator.job({
      type: 'export',
      status: 'running',
    })
    
    return HttpResponse.json(createSuccessResponse({
      jobId: job.id,
      status: 'started',
    }), { status: 201 })
  }),

  http.get(`${API_BASE}/exports/:id/download`, async () => {
    // Mock file download
    const fileContent = new Blob(['Mock exported content'], { type: 'application/zip' })
    
    return new HttpResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="course-export.zip"',
      },
    })
  }),

  // Error scenarios
  http.post(`${API_BASE}/auth/login-error`, async () => {
    return HttpResponse.json(createErrorResponse('Invalid credentials', 401, 'INVALID_CREDENTIALS'), { status: 401 })
  }),

  http.get(`${API_BASE}/courses/not-found`, async () => {
    return HttpResponse.json(createErrorResponse('Course not found', 404, 'NOT_FOUND'), { status: 404 })
  }),

  http.post(`${API_BASE}/documents/upload-error`, async () => {
    return HttpResponse.json(createErrorResponse('File too large', 413, 'FILE_TOO_LARGE'), { status: 413 })
  }),

  http.post(`${API_BASE}/generate/error`, async () => {
    return HttpResponse.json(createErrorResponse('Generation service unavailable', 500, 'SERVICE_UNAVAILABLE'), { status: 500 })
  }),
]

// Error handlers for specific scenarios
export const errorHandlers = {
  networkError: http.get(`${API_BASE}/*`, async () => {
    return HttpResponse.error()
  }),
  
  timeout: http.get(`${API_BASE}/*`, async () => {
    await new Promise(() => {}) // Never resolves
  }),
  
  serverError: http.get(`${API_BASE}/*`, async () => {
    return HttpResponse.json(createErrorResponse('Internal server error', 500, 'INTERNAL_ERROR'), { status: 500 })
  }),
  
  unauthorized: http.get(`${API_BASE}/*`, async () => {
    return HttpResponse.json(createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED'), { status: 401 })
  }),
}

// Mock server setup
export const server = setupServer(...apiHandlers)

// Helper functions for tests
export const mockAPI = {
  setupServer: () => {
    beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())
  },
  
  mockSuccessfulLogin: () => {
    server.use(
      http.post(`${API_BASE}/auth/login`, async () => {
        return HttpResponse.json(createSuccessResponse({
          user: MOCK_DATA.users.admin,
          token: 'mock-jwt-token',
        }), { status: 200 })
      })
    )
  },
  
  mockFailedLogin: () => {
    server.use(
      http.post(`${API_BASE}/auth/login`, async () => {
        return HttpResponse.json(createErrorResponse('Invalid credentials', 401), { status: 401 })
      })
    )
  },
  
  mockCourseList: (courses = MockDataGenerator.courses(5)) => {
    server.use(
      http.get(`${API_BASE}/courses`, async () => {
        return HttpResponse.json(createPaginatedResponse(courses), { status: 200 })
      })
    )
  },
  
  mockEmptyCourseList: () => {
    server.use(
      http.get(`${API_BASE}/courses`, async () => {
        return HttpResponse.json(createPaginatedResponse([]), { status: 200 })
      })
    )
  },
  
  mockJobProgress: (jobId: string, progress: number) => {
    server.use(
      http.get(`${API_BASE}/jobs/${jobId}`, async () => {
        const job = MockDataGenerator.job({
          id: jobId,
          progress,
          status: progress === 100 ? 'completed' : 'running',
        })
        return HttpResponse.json(createSuccessResponse(job), { status: 200 })
      })
    )
  },
  
  mockNetworkError: () => {
    server.use(errorHandlers.networkError)
  },
  
  mockServerError: () => {
    server.use(errorHandlers.serverError)
  },
  
  mockTimeout: () => {
    server.use(errorHandlers.timeout)
  },
}