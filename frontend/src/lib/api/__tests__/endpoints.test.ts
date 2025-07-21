import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { api, authApi, documentsApi, coursesApi, exportApi, jobsApi, generationApi, healthApi } from '../endpoints'
import { apiClient } from '../client'

// Mock the apiClient
jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    uploadFile: jest.fn(),
    uploadFiles: jest.fn(),
    downloadFile: jest.fn(),
  },
}))

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation((url) => ({
  onmessage: null,
  onerror: null,
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
})) as any

describe('API Endpoints', () => {
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('authApi', () => {
    describe('login', () => {
      it('should call login endpoint with credentials', async () => {
        const credentials = { email: 'test@example.com', password: 'password123' }
        const mockResponse = { user: { id: '1', email: 'test@example.com' }, token: 'token', refreshToken: 'refresh' }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const result = await authApi.login(credentials)

        expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', credentials)
        expect(result).toEqual(mockResponse)
      })
    })

    describe('register', () => {
      it('should call register endpoint with data', async () => {
        const registerData = {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          organization: 'Test Org',
        }
        const mockResponse = { user: { id: '1', email: 'test@example.com' }, token: 'token', refreshToken: 'refresh' }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const result = await authApi.register(registerData)

        expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', registerData)
        expect(result).toEqual(mockResponse)
      })
    })

    describe('logout', () => {
      it('should call logout endpoint', async () => {
        mockApiClient.post.mockResolvedValue({ success: true })

        await authApi.logout()

        expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout')
      })
    })

    describe('me', () => {
      it('should call me endpoint', async () => {
        const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' }
        mockApiClient.get.mockResolvedValue(mockUser)

        const result = await authApi.me()

        expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me')
        expect(result).toEqual(mockUser)
      })
    })

    describe('forgotPassword', () => {
      it('should call forgot password endpoint with email', async () => {
        const email = 'test@example.com'
        mockApiClient.post.mockResolvedValue({ message: 'Reset email sent' })

        await authApi.forgotPassword(email)

        expect(mockApiClient.post).toHaveBeenCalledWith('/auth/forgot-password', { email })
      })
    })

    describe('resetPassword', () => {
      it('should call reset password endpoint with token and password', async () => {
        const token = 'reset-token'
        const password = 'newpassword123'
        mockApiClient.post.mockResolvedValue({ success: true })

        await authApi.resetPassword(token, password)

        expect(mockApiClient.post).toHaveBeenCalledWith('/auth/reset-password', { token, password })
      })
    })
  })

  describe('documentsApi', () => {
    describe('upload', () => {
      it('should upload single file', async () => {
        const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
        const onProgress = jest.fn()
        const mockDocument = { id: 'doc-1', filename: 'test.pdf' }
        mockApiClient.uploadFile.mockResolvedValue(mockDocument)

        const result = await documentsApi.upload(file, onProgress)

        expect(mockApiClient.uploadFile).toHaveBeenCalledWith('/documents/upload', file, onProgress)
        expect(result).toEqual(mockDocument)
      })

      it('should upload file without progress callback', async () => {
        const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
        const mockDocument = { id: 'doc-1', filename: 'test.pdf' }
        mockApiClient.uploadFile.mockResolvedValue(mockDocument)

        const result = await documentsApi.upload(file)

        expect(mockApiClient.uploadFile).toHaveBeenCalledWith('/documents/upload', file, undefined)
        expect(result).toEqual(mockDocument)
      })
    })

    describe('uploadMultiple', () => {
      it('should upload multiple files', async () => {
        const files = [
          new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
          new File(['content2'], 'test2.pdf', { type: 'application/pdf' })
        ]
        const onProgress = jest.fn()
        const mockDocuments = [
          { id: 'doc-1', filename: 'test1.pdf' },
          { id: 'doc-2', filename: 'test2.pdf' }
        ]
        mockApiClient.uploadFiles.mockResolvedValue(mockDocuments)

        const result = await documentsApi.uploadMultiple(files, onProgress)

        expect(mockApiClient.uploadFiles).toHaveBeenCalledWith('/documents/upload', files, onProgress)
        expect(result).toEqual(mockDocuments)
      })
    })

    describe('list', () => {
      it('should list documents with params', async () => {
        const params = { page: 2, limit: 20, search: 'test' }
        const mockResponse = {
          documents: [{ id: 'doc-1' }, { id: 'doc-2' }],
          total: 50,
          page: 2,
          limit: 20
        }
        mockApiClient.get.mockResolvedValue(mockResponse)

        const result = await documentsApi.list(params)

        expect(mockApiClient.get).toHaveBeenCalledWith('/documents', { params })
        expect(result).toEqual(mockResponse)
      })

      it('should list documents without params', async () => {
        const mockResponse = {
          documents: [],
          total: 0,
          page: 1,
          limit: 20
        }
        mockApiClient.get.mockResolvedValue(mockResponse)

        const result = await documentsApi.list()

        expect(mockApiClient.get).toHaveBeenCalledWith('/documents', { params: undefined })
        expect(result).toEqual(mockResponse)
      })
    })

    describe('get', () => {
      it('should get document by id', async () => {
        const mockDocument = { id: 'doc-1', filename: 'test.pdf' }
        mockApiClient.get.mockResolvedValue(mockDocument)

        const result = await documentsApi.get('doc-1')

        expect(mockApiClient.get).toHaveBeenCalledWith('/documents/doc-1')
        expect(result).toEqual(mockDocument)
      })
    })

    describe('delete', () => {
      it('should delete document by id', async () => {
        mockApiClient.delete.mockResolvedValue({ success: true })

        await documentsApi.delete('doc-1')

        expect(mockApiClient.delete).toHaveBeenCalledWith('/documents/doc-1')
      })
    })

    describe('process', () => {
      it('should process document', async () => {
        const mockResponse = { jobId: 'job-123' }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const result = await documentsApi.process('doc-1')

        expect(mockApiClient.post).toHaveBeenCalledWith('/documents/doc-1/process')
        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('coursesApi', () => {
    describe('list', () => {
      it('should list courses with params', async () => {
        const params = { page: 1, limit: 10, search: 'javascript', status: 'published' }
        const mockResponse = {
          courses: [{ id: 'course-1' }, { id: 'course-2' }],
          total: 25,
          page: 1,
          limit: 10
        }
        mockApiClient.get.mockResolvedValue(mockResponse)

        const result = await coursesApi.list(params)

        expect(mockApiClient.get).toHaveBeenCalledWith('/courses', { params })
        expect(result).toEqual(mockResponse)
      })
    })

    describe('create', () => {
      it('should create course', async () => {
        const courseData = { title: 'New Course', description: 'Description' }
        const mockCourse = { id: 'course-1', ...courseData }
        mockApiClient.post.mockResolvedValue(mockCourse)

        const result = await coursesApi.create(courseData)

        expect(mockApiClient.post).toHaveBeenCalledWith('/courses', courseData)
        expect(result).toEqual(mockCourse)
      })
    })

    describe('get', () => {
      it('should get course by id', async () => {
        const mockCourse = { id: 'course-1', title: 'Test Course' }
        mockApiClient.get.mockResolvedValue(mockCourse)

        const result = await coursesApi.get('course-1')

        expect(mockApiClient.get).toHaveBeenCalledWith('/courses/course-1')
        expect(result).toEqual(mockCourse)
      })
    })

    describe('update', () => {
      it('should update course', async () => {
        const updateData = { title: 'Updated Title' }
        const mockCourse = { id: 'course-1', ...updateData }
        mockApiClient.put.mockResolvedValue(mockCourse)

        const result = await coursesApi.update('course-1', updateData)

        expect(mockApiClient.put).toHaveBeenCalledWith('/courses/course-1', updateData)
        expect(result).toEqual(mockCourse)
      })
    })

    describe('delete', () => {
      it('should delete course', async () => {
        mockApiClient.delete.mockResolvedValue({ success: true })

        await coursesApi.delete('course-1')

        expect(mockApiClient.delete).toHaveBeenCalledWith('/courses/course-1')
      })
    })

    describe('uploadResources', () => {
      it('should upload resources to course', async () => {
        const files = [new File(['content'], 'resource.pdf')]
        const onProgress = jest.fn()
        const mockResponse = { documents: [{ id: 'doc-1' }] }
        mockApiClient.uploadFiles.mockResolvedValue(mockResponse)

        const result = await coursesApi.uploadResources('course-1', files, onProgress)

        expect(mockApiClient.uploadFiles).toHaveBeenCalledWith(
          '/courses/course-1/upload',
          files,
          onProgress
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('addUrl', () => {
      it('should add URL to course', async () => {
        const url = 'https://example.com/resource'
        const mockResponse = { document: { id: 'doc-1', url } }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const result = await coursesApi.addUrl('course-1', url)

        expect(mockApiClient.post).toHaveBeenCalledWith('/courses/course-1/add-url', { url })
        expect(result).toEqual(mockResponse)
      })
    })

    describe('generateContent', () => {
      it('should generate course content', async () => {
        const config = { model: 'claude-3', creativity: 70 }
        const mockResponse = { jobId: 'job-123' }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const result = await coursesApi.generateContent('course-1', config)

        expect(mockApiClient.post).toHaveBeenCalledWith('/courses/course-1/generate', config)
        expect(result).toEqual(mockResponse)
      })
    })

    describe('generate', () => {
      it('should generate new course', async () => {
        const data = {
          documentIds: ['doc-1', 'doc-2'],
          config: { model: 'claude-3', creativity: 70 }
        }
        const mockResponse = { jobId: 'job-123', courseId: 'course-1' }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const result = await coursesApi.generate(data)

        expect(mockApiClient.post).toHaveBeenCalledWith('/courses/generate', data)
        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('exportApi', () => {
    describe('html', () => {
      it('should export to HTML', async () => {
        const options = { template: 'modern' }
        const mockResponse = { jobId: 'export-123' }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const result = await exportApi.html('course-1', options)

        expect(mockApiClient.post).toHaveBeenCalledWith('/export/html/course-1', options)
        expect(result).toEqual(mockResponse)
      })

      it('should export to HTML without options', async () => {
        const mockResponse = { jobId: 'export-123' }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const result = await exportApi.html('course-1')

        expect(mockApiClient.post).toHaveBeenCalledWith('/export/html/course-1', undefined)
        expect(result).toEqual(mockResponse)
      })
    })

    describe('pdf', () => {
      it('should export to PDF', async () => {
        const options = { includeNotes: true }
        const mockResponse = { jobId: 'export-123' }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const result = await exportApi.pdf('course-1', options)

        expect(mockApiClient.post).toHaveBeenCalledWith('/export/pdf/course-1', options)
        expect(result).toEqual(mockResponse)
      })
    })

    describe('powerpoint', () => {
      it('should export to PowerPoint', async () => {
        const options = { theme: 'professional' }
        const mockResponse = { jobId: 'export-123' }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const result = await exportApi.powerpoint('course-1', options)

        expect(mockApiClient.post).toHaveBeenCalledWith('/export/powerpoint/course-1', options)
        expect(result).toEqual(mockResponse)
      })
    })

    describe('bundle', () => {
      it('should export bundle with formats', async () => {
        const options = { formats: ['html', 'pdf'] }
        const mockResponse = { jobId: 'export-123' }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const result = await exportApi.bundle('course-1', options)

        expect(mockApiClient.post).toHaveBeenCalledWith('/export/bundle/course-1', options)
        expect(result).toEqual(mockResponse)
      })
    })

    describe('download', () => {
      it('should download export', async () => {
        const onProgress = jest.fn()
        mockApiClient.downloadFile.mockResolvedValue(undefined)

        await exportApi.download('export-123', 'course-export.zip', onProgress)

        expect(mockApiClient.downloadFile).toHaveBeenCalledWith(
          '/exports/export-123/download',
          'course-export.zip',
          onProgress
        )
      })

      it('should download without filename', async () => {
        mockApiClient.downloadFile.mockResolvedValue(undefined)

        await exportApi.download('export-123')

        expect(mockApiClient.downloadFile).toHaveBeenCalledWith(
          '/exports/export-123/download',
          undefined,
          undefined
        )
      })
    })
  })

  describe('jobsApi', () => {
    describe('getStatus', () => {
      it('should get job status', async () => {
        const mockJob = { id: 'job-123', status: 'running', progress: 50 }
        mockApiClient.get.mockResolvedValue(mockJob)

        const result = await jobsApi.getStatus('job-123')

        expect(mockApiClient.get).toHaveBeenCalledWith('/jobs/job-123/status')
        expect(result).toEqual(mockJob)
      })
    })

    describe('cancel', () => {
      it('should cancel job', async () => {
        mockApiClient.post.mockResolvedValue({ success: true })

        await jobsApi.cancel('job-123')

        expect(mockApiClient.post).toHaveBeenCalledWith('/jobs/job-123/cancel')
      })
    })

    describe('list', () => {
      it('should list jobs with params', async () => {
        const params = { page: 1, limit: 20, status: 'running', type: 'generation' }
        const mockResponse = {
          jobs: [{ id: 'job-1' }, { id: 'job-2' }],
          total: 10,
          page: 1,
          limit: 20
        }
        mockApiClient.get.mockResolvedValue(mockResponse)

        const result = await jobsApi.list(params)

        expect(mockApiClient.get).toHaveBeenCalledWith('/jobs', { params })
        expect(result).toEqual(mockResponse)
      })

      it('should list jobs without params', async () => {
        const mockResponse = { jobs: [], total: 0, page: 1, limit: 20 }
        mockApiClient.get.mockResolvedValue(mockResponse)

        const result = await jobsApi.list()

        expect(mockApiClient.get).toHaveBeenCalledWith('/jobs', { params: undefined })
        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('uploadApi', () => {
    it('should delegate uploadFile to documentsApi', async () => {
      const file = new File(['content'], 'test.pdf')
      const onProgress = jest.fn()
      const mockDocument = { id: 'doc-1' }
      mockApiClient.uploadFile.mockResolvedValue(mockDocument)

      const result = await uploadApi.uploadFile(file, onProgress)

      expect(mockApiClient.uploadFile).toHaveBeenCalledWith('/documents/upload', file, onProgress)
      expect(result).toEqual(mockDocument)
    })

    it('should delegate uploadFiles to documentsApi', async () => {
      const files = [new File(['content'], 'test.pdf')]
      const onProgress = jest.fn()
      const mockDocuments = [{ id: 'doc-1' }]
      mockApiClient.uploadFiles.mockResolvedValue(mockDocuments)

      const result = await uploadApi.uploadFiles(files, onProgress)

      expect(mockApiClient.uploadFiles).toHaveBeenCalledWith('/documents/upload', files, onProgress)
      expect(result).toEqual(mockDocuments)
    })

    it('should upload files to course', async () => {
      const files = [new File(['content'], 'test.pdf')]
      const onProgress = jest.fn()
      const mockResponse = { documents: [{ id: 'doc-1' }] }
      mockApiClient.uploadFiles.mockResolvedValue(mockResponse)

      const result = await uploadApi.uploadToCourse('course-1', files, onProgress)

      expect(mockApiClient.uploadFiles).toHaveBeenCalledWith(
        '/courses/course-1/upload',
        files,
        onProgress
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('generationApi', () => {
    describe('generateCourse', () => {
      it('should generate course', async () => {
        const documentIds = ['doc-1', 'doc-2']
        const config = { model: 'claude-3', creativity: 70 }
        const mockResponse = { jobId: 'job-123', courseId: 'course-1' }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const result = await generationApi.generateCourse(documentIds, config)

        expect(mockApiClient.post).toHaveBeenCalledWith('/courses/generate', { documentIds, config })
        expect(result).toEqual(mockResponse)
      })
    })

    describe('generateContent', () => {
      it('should generate content for course', async () => {
        const config = { model: 'claude-3', creativity: 70 }
        const mockResponse = { jobId: 'job-123' }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const result = await generationApi.generateContent('course-1', config)

        expect(mockApiClient.post).toHaveBeenCalledWith('/courses/course-1/generate', config)
        expect(result).toEqual(mockResponse)
      })
    })

    describe('getJobStatus', () => {
      it('should get job status', async () => {
        const mockJob = { id: 'job-123', status: 'completed' }
        mockApiClient.get.mockResolvedValue(mockJob)

        const result = await generationApi.getJobStatus('job-123')

        expect(mockApiClient.get).toHaveBeenCalledWith('/jobs/job-123/status')
        expect(result).toEqual(mockJob)
      })
    })

    describe('cancelJob', () => {
      it('should cancel job', async () => {
        mockApiClient.post.mockResolvedValue({ success: true })

        await generationApi.cancelJob('job-123')

        expect(mockApiClient.post).toHaveBeenCalledWith('/jobs/job-123/cancel')
      })
    })

    describe('subscribeToJob', () => {
      it('should create WebSocket connection for job updates', () => {
        const onUpdate = jest.fn()
        const mockWs = {
          onmessage: null,
          onerror: null,
          close: jest.fn(),
        }
        global.WebSocket = jest.fn().mockReturnValue(mockWs) as any

        const unsubscribe = generationApi.subscribeToJob('job-123', onUpdate)

        expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3001/jobs/job-123')
        expect(typeof unsubscribe).toBe('function')

        // Test message handling
        const messageEvent = { data: JSON.stringify({ progress: 50 }) }
        mockWs.onmessage!(messageEvent as any)
        expect(onUpdate).toHaveBeenCalledWith({ progress: 50 })

        // Test unsubscribe
        unsubscribe()
        expect(mockWs.close).toHaveBeenCalled()
      })

      it('should handle WebSocket parse errors', () => {
        const onUpdate = jest.fn()
        const mockWs = {
          onmessage: null,
          onerror: null,
          close: jest.fn(),
        }
        global.WebSocket = jest.fn().mockReturnValue(mockWs) as any
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

        generationApi.subscribeToJob('job-123', onUpdate)

        // Send invalid JSON
        const messageEvent = { data: 'invalid json' }
        mockWs.onmessage!(messageEvent as any)

        expect(onUpdate).not.toHaveBeenCalled()
        expect(consoleSpy).toHaveBeenCalledWith('Failed to parse WebSocket message:', expect.any(Error))

        consoleSpy.mockRestore()
      })

      it('should handle WebSocket errors', () => {
        const onUpdate = jest.fn()
        const mockWs = {
          onmessage: null,
          onerror: null,
          close: jest.fn(),
        }
        global.WebSocket = jest.fn().mockReturnValue(mockWs) as any
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

        generationApi.subscribeToJob('job-123', onUpdate)

        // Trigger error
        const error = new Error('Connection failed')
        mockWs.onerror!(error as any)

        expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', error)

        consoleSpy.mockRestore()
      })

      it('should use custom WebSocket URL from environment', () => {
        process.env.NEXT_PUBLIC_WS_URL = 'ws://custom-server:8080'
        const onUpdate = jest.fn()
        const mockWs = { onmessage: null, onerror: null, close: jest.fn() }
        global.WebSocket = jest.fn().mockReturnValue(mockWs) as any

        generationApi.subscribeToJob('job-123', onUpdate)

        expect(global.WebSocket).toHaveBeenCalledWith('ws://custom-server:8080/jobs/job-123')
      })

      it('should return noop function in SSR environment', () => {
        const originalWindow = global.window
        delete (global as any).window

        const onUpdate = jest.fn()
        const unsubscribe = generationApi.subscribeToJob('job-123', onUpdate)

        expect(typeof unsubscribe).toBe('function')
        expect(() => unsubscribe()).not.toThrow()

        global.window = originalWindow
      })
    })
  })

  describe('healthApi', () => {
    it('should check health', async () => {
      const mockHealth = { status: 'ok', timestamp: '2024-01-01T00:00:00Z', version: '1.0.0' }
      mockApiClient.get.mockResolvedValue(mockHealth)

      const result = await healthApi.check()

      expect(mockApiClient.get).toHaveBeenCalledWith('/health')
      expect(result).toEqual(mockHealth)
    })
  })

  describe('api namespace', () => {
    it('should expose all API modules', () => {
      expect(api.auth).toBe(authApi)
      expect(api.documents).toBe(documentsApi)
      expect(api.courses).toBe(coursesApi)
      expect(api.export).toBe(exportApi)
      expect(api.jobs).toBe(jobsApi)
      expect(api.upload).toBe(uploadApi)
      expect(api.generation).toBe(generationApi)
      expect(api.health).toBe(healthApi)
    })
  })
})