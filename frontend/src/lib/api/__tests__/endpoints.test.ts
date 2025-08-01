import { jest } from '@jest/globals'
import { 
  authApi, 
  documentsApi, 
  coursesApi, 
  exportApi, 
  jobsApi, 
  uploadApi, 
  generationApi, 
  healthApi,
  API_ENDPOINTS 
} from '../endpoints'
import { apiClient } from '../client'
import type { 
  User, 
  Document, 
  Course, 
  GenerationLog,
  AuthCredentials,
  RegisterData,
  CourseGenerationConfig,
  CourseExportOptions
} from '@/types'

// Define types that aren't exported
type CourseUpdateData = Partial<Course>
type CourseConfig = CourseGenerationConfig['options']
type ExportOptions = Partial<CourseExportOptions>
type GenerationJob = {
  id: string
  type: string
  status: string
  progress: number
  userId: string
  createdAt: string
  updatedAt: string
}

// Mock the API client
jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    uploadFile: jest.fn(),
    uploadFiles: jest.fn(),
    downloadFile: jest.fn(),
    setAuthToken: jest.fn(),
    clearAuthToken: jest.fn(),
    getAuthToken: jest.fn(),
  }
}))

// Type the mocked client
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Auth API', () => {
    describe('login', () => {
      it('should call apiClient.post with correct parameters', async () => {
        const credentials: AuthCredentials = { 
          email: 'test@example.com', 
          password: 'password123' 
        }
        const mockResponse = {
          user: { id: '1', email: 'test@example.com', name: 'Test User' } as User,
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token'
        }
        
        mockedApiClient.post.mockResolvedValue(mockResponse)
        
        const result = await authApi.login(credentials)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.AUTH.LOGIN,
          credentials
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('register', () => {
      it('should call apiClient.post with correct parameters', async () => {
        const registerData: RegisterData = {
          email: 'new@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          name: 'New User'
        }
        const mockResponse = {
          user: { id: '2', email: 'new@example.com', name: 'New User' } as User,
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token'
        }
        
        mockedApiClient.post.mockResolvedValue(mockResponse)
        
        const result = await authApi.register(registerData)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.AUTH.REGISTER,
          registerData
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('logout', () => {
      it('should call apiClient.post with correct endpoint', async () => {
        mockedApiClient.post.mockResolvedValue({ message: 'Logged out' })
        
        await authApi.logout()
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.LOGOUT)
      })
    })

    describe('me', () => {
      it('should call apiClient.get with correct endpoint', async () => {
        const mockUser: User = { 
          id: '1', 
          email: 'test@example.com', 
          name: 'Test User',
          role: 'instructor',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        mockedApiClient.get.mockResolvedValue(mockUser)
        
        const result = await authApi.me()
        
        expect(mockedApiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.ME)
        expect(result).toEqual(mockUser)
      })
    })

    describe('forgotPassword', () => {
      it('should call apiClient.post with email', async () => {
        const email = 'test@example.com'
        
        mockedApiClient.post.mockResolvedValue({ message: 'Email sent' })
        
        await authApi.forgotPassword(email)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
          { email }
        )
      })
    })

    describe('resetPassword', () => {
      it('should call apiClient.post with token and password', async () => {
        const token = 'reset-token'
        const password = 'newPassword123'
        
        mockedApiClient.post.mockResolvedValue({ message: 'Password reset' })
        
        await authApi.resetPassword(token, password)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.AUTH.RESET_PASSWORD,
          { token, password }
        )
      })
    })
  })

  describe('Documents API', () => {
    describe('upload', () => {
      it('should call apiClient.uploadFile with file', async () => {
        const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
        const mockDocument: Document = {
          id: 'doc-1',
          filename: 'test.pdf',
          originalName: 'test.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          status: 'processing',
          userId: 'user-1',
          uploadedAt: new Date().toISOString()
        }
        
        mockedApiClient.uploadFile.mockResolvedValue(mockDocument)
        
        const result = await documentsApi.upload(file)
        
        expect(mockedApiClient.uploadFile).toHaveBeenCalledWith(
          API_ENDPOINTS.DOCUMENTS.UPLOAD,
          file,
          undefined
        )
        expect(result).toEqual(mockDocument)
      })

      it('should call apiClient.uploadFile with progress callback', async () => {
        const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
        const progressCallback = jest.fn()
        
        mockedApiClient.uploadFile.mockResolvedValue({ id: 'doc-1' })
        
        await documentsApi.upload(file, progressCallback)
        
        expect(mockedApiClient.uploadFile).toHaveBeenCalledWith(
          API_ENDPOINTS.DOCUMENTS.UPLOAD,
          file,
          progressCallback
        )
      })
    })

    describe('uploadMultiple', () => {
      it('should call apiClient.uploadFiles with files array', async () => {
        const files = [
          new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
          new File(['content2'], 'file2.pdf', { type: 'application/pdf' })
        ]
        const mockDocuments: Document[] = [
          { id: 'doc-1', filename: 'file1.pdf' } as Document,
          { id: 'doc-2', filename: 'file2.pdf' } as Document
        ]
        
        mockedApiClient.uploadFiles.mockResolvedValue(mockDocuments)
        
        const result = await documentsApi.uploadMultiple(files)
        
        expect(mockedApiClient.uploadFiles).toHaveBeenCalledWith(
          API_ENDPOINTS.DOCUMENTS.UPLOAD,
          files,
          undefined
        )
        expect(result).toEqual(mockDocuments)
      })
    })

    describe('list', () => {
      it('should call apiClient.get with default parameters', async () => {
        const mockResponse = {
          documents: [],
          total: 0,
          page: 1,
          limit: 20
        }
        
        mockedApiClient.get.mockResolvedValue(mockResponse)
        
        const result = await documentsApi.list()
        
        expect(mockedApiClient.get).toHaveBeenCalledWith(
          API_ENDPOINTS.DOCUMENTS.LIST,
          { params: undefined }
        )
        expect(result).toEqual(mockResponse)
      })

      it('should call apiClient.get with custom parameters', async () => {
        const params = { page: 2, limit: 10, search: 'test' }
        
        mockedApiClient.get.mockResolvedValue({ documents: [] })
        
        await documentsApi.list(params)
        
        expect(mockedApiClient.get).toHaveBeenCalledWith(
          API_ENDPOINTS.DOCUMENTS.LIST,
          { params }
        )
      })
    })

    describe('get', () => {
      it('should call apiClient.get with document id', async () => {
        const docId = 'doc-123'
        const mockDocument = { id: docId, filename: 'test.pdf' }
        
        mockedApiClient.get.mockResolvedValue(mockDocument)
        
        const result = await documentsApi.get(docId)
        
        expect(mockedApiClient.get).toHaveBeenCalledWith(
          API_ENDPOINTS.DOCUMENTS.GET(docId)
        )
        expect(result).toEqual(mockDocument)
      })
    })

    describe('delete', () => {
      it('should call apiClient.delete with document id', async () => {
        const docId = 'doc-123'
        
        mockedApiClient.delete.mockResolvedValue({ message: 'Deleted' })
        
        await documentsApi.delete(docId)
        
        expect(mockedApiClient.delete).toHaveBeenCalledWith(
          API_ENDPOINTS.DOCUMENTS.DELETE(docId)
        )
      })
    })

    describe('process', () => {
      it('should call apiClient.post with document id', async () => {
        const docId = 'doc-123'
        const mockResponse = { jobId: 'job-456' }
        
        mockedApiClient.post.mockResolvedValue(mockResponse)
        
        const result = await documentsApi.process(docId)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.DOCUMENTS.PROCESS(docId)
        )
        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('Courses API', () => {
    describe('list', () => {
      it('should call apiClient.get with parameters', async () => {
        const params = { page: 1, limit: 10, search: 'AI', status: 'published' }
        const mockResponse = {
          courses: [],
          total: 0,
          page: 1,
          limit: 10
        }
        
        mockedApiClient.get.mockResolvedValue(mockResponse)
        
        const result = await coursesApi.list(params)
        
        expect(mockedApiClient.get).toHaveBeenCalledWith(
          API_ENDPOINTS.COURSES.LIST,
          { params }
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('create', () => {
      it('should call apiClient.post with course data', async () => {
        const courseData: Partial<Course> = {
          title: 'New Course',
          description: 'Course description'
        }
        const mockCourse: Course = {
          id: 'course-1',
          ...courseData,
          status: 'draft',
          userId: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as Course
        
        mockedApiClient.post.mockResolvedValue(mockCourse)
        
        const result = await coursesApi.create(courseData)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.COURSES.CREATE,
          courseData
        )
        expect(result).toEqual(mockCourse)
      })
    })

    describe('get', () => {
      it('should call apiClient.get with course id', async () => {
        const courseId = 'course-123'
        const mockCourse = { id: courseId, title: 'Test Course' }
        
        mockedApiClient.get.mockResolvedValue(mockCourse)
        
        const result = await coursesApi.get(courseId)
        
        expect(mockedApiClient.get).toHaveBeenCalledWith(
          API_ENDPOINTS.COURSES.GET(courseId)
        )
        expect(result).toEqual(mockCourse)
      })
    })

    describe('update', () => {
      it('should call apiClient.put with course id and data', async () => {
        const courseId = 'course-123'
        const updateData: CourseUpdateData = { title: 'Updated Title' }
        const mockCourse = { id: courseId, ...updateData }
        
        mockedApiClient.put.mockResolvedValue(mockCourse)
        
        const result = await coursesApi.update(courseId, updateData)
        
        expect(mockedApiClient.put).toHaveBeenCalledWith(
          API_ENDPOINTS.COURSES.UPDATE(courseId),
          updateData
        )
        expect(result).toEqual(mockCourse)
      })
    })

    describe('delete', () => {
      it('should call apiClient.delete with course id', async () => {
        const courseId = 'course-123'
        
        mockedApiClient.delete.mockResolvedValue({ message: 'Deleted' })
        
        await coursesApi.delete(courseId)
        
        expect(mockedApiClient.delete).toHaveBeenCalledWith(
          API_ENDPOINTS.COURSES.DELETE(courseId)
        )
      })
    })

    describe('uploadResources', () => {
      it('should call apiClient.uploadFiles with course id and files', async () => {
        const courseId = 'course-123'
        const files = [new File(['content'], 'resource.pdf', { type: 'application/pdf' })]
        const mockResponse = { documents: [{ id: 'doc-1' }] }
        
        mockedApiClient.uploadFiles.mockResolvedValue(mockResponse)
        
        const result = await coursesApi.uploadResources(courseId, files)
        
        expect(mockedApiClient.uploadFiles).toHaveBeenCalledWith(
          API_ENDPOINTS.COURSES.UPLOAD_RESOURCES(courseId),
          files,
          undefined
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('addUrl', () => {
      it('should call apiClient.post with course id and url', async () => {
        const courseId = 'course-123'
        const url = 'https://example.com/resource'
        const mockResponse = { document: { id: 'doc-1', url } }
        
        mockedApiClient.post.mockResolvedValue(mockResponse)
        
        const result = await coursesApi.addUrl(courseId, url)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.COURSES.ADD_URL(courseId),
          { url }
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('generateContent', () => {
      it('should call apiClient.post with course id and config', async () => {
        const courseId = 'course-123'
        const config: CourseConfig = { 
          sessionCount: 5, 
          difficulty: 'intermediate',
          includeQuizzes: true,
          includeExercises: true,
          language: 'en',
          tone: 'formal'
        }
        const mockResponse = { jobId: 'job-789' }
        
        mockedApiClient.post.mockResolvedValue(mockResponse)
        
        const result = await coursesApi.generateContent(courseId, config)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.COURSES.GENERATE_CONTENT(courseId),
          config
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('generate', () => {
      it('should call apiClient.post with document ids and config', async () => {
        const data = {
          documentIds: ['doc-1', 'doc-2'],
          config: { 
            sessionCount: 5, 
            difficulty: 'beginner',
            includeQuizzes: true,
            includeExercises: false,
            language: 'en',
            tone: 'casual'
          }
        }
        const mockResponse = { jobId: 'job-123', courseId: 'course-new' }
        
        mockedApiClient.post.mockResolvedValue(mockResponse)
        
        const result = await coursesApi.generate(data)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.COURSES.GENERATE,
          data
        )
        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('Export API', () => {
    describe('html', () => {
      it('should call apiClient.post with course id and options', async () => {
        const courseId = 'course-123'
        const options: ExportOptions = { format: 'html' }
        const mockResponse = { jobId: 'export-job-1' }
        
        mockedApiClient.post.mockResolvedValue(mockResponse)
        
        const result = await exportApi.html(courseId, options)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.EXPORT.HTML(courseId),
          options
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('pdf', () => {
      it('should call apiClient.post with course id', async () => {
        const courseId = 'course-123'
        const mockResponse = { jobId: 'export-job-2' }
        
        mockedApiClient.post.mockResolvedValue(mockResponse)
        
        const result = await exportApi.pdf(courseId)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.EXPORT.PDF(courseId),
          undefined
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('powerpoint', () => {
      it('should call apiClient.post with course id and options', async () => {
        const courseId = 'course-123'
        const options: ExportOptions = { template: 'modern' as any }
        const mockResponse = { jobId: 'export-job-3' }
        
        mockedApiClient.post.mockResolvedValue(mockResponse)
        
        const result = await exportApi.powerpoint(courseId, options)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.EXPORT.POWERPOINT(courseId),
          options
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('bundle', () => {
      it('should call apiClient.post with course id and formats', async () => {
        const courseId = 'course-123'
        const options = { formats: ['html', 'pdf', 'powerpoint'] }
        const mockResponse = { jobId: 'export-job-4' }
        
        mockedApiClient.post.mockResolvedValue(mockResponse)
        
        const result = await exportApi.bundle(courseId, options)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.EXPORT.BUNDLE(courseId),
          options
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('download', () => {
      it('should call apiClient.downloadFile with job id', async () => {
        const jobId = 'job-123'
        const filename = 'export.zip'
        const progressCallback = jest.fn()
        
        mockedApiClient.downloadFile.mockResolvedValue(undefined)
        
        await exportApi.download(jobId, filename, progressCallback)
        
        expect(mockedApiClient.downloadFile).toHaveBeenCalledWith(
          `/exports/${jobId}/download`,
          filename,
          progressCallback
        )
      })
    })
  })

  describe('Jobs API', () => {
    describe('getStatus', () => {
      it('should call apiClient.get with job id', async () => {
        const jobId = 'job-123'
        const mockJob: GenerationJob = {
          id: jobId,
          type: 'course_generation',
          status: 'running',
          progress: 75,
          userId: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        mockedApiClient.get.mockResolvedValue(mockJob)
        
        const result = await jobsApi.getStatus(jobId)
        
        expect(mockedApiClient.get).toHaveBeenCalledWith(
          API_ENDPOINTS.JOBS.STATUS(jobId)
        )
        expect(result).toEqual(mockJob)
      })
    })

    describe('cancel', () => {
      it('should call apiClient.post with job id', async () => {
        const jobId = 'job-123'
        
        mockedApiClient.post.mockResolvedValue({ message: 'Cancelled' })
        
        await jobsApi.cancel(jobId)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.JOBS.CANCEL(jobId)
        )
      })
    })

    describe('list', () => {
      it('should call apiClient.get with parameters', async () => {
        const params = { page: 1, limit: 10, status: 'running', type: 'export' }
        const mockResponse = {
          jobs: [],
          total: 0,
          page: 1,
          limit: 10
        }
        
        mockedApiClient.get.mockResolvedValue(mockResponse)
        
        const result = await jobsApi.list(params)
        
        expect(mockedApiClient.get).toHaveBeenCalledWith(
          API_ENDPOINTS.JOBS.LIST,
          { params }
        )
        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('Upload API', () => {
    describe('uploadFile', () => {
      it('should delegate to documentsApi.upload', async () => {
        const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
        const progressCallback = jest.fn()
        const mockDocument = { id: 'doc-1' }
        
        mockedApiClient.uploadFile.mockResolvedValue(mockDocument)
        
        const result = await uploadApi.uploadFile(file, progressCallback)
        
        expect(mockedApiClient.uploadFile).toHaveBeenCalledWith(
          API_ENDPOINTS.DOCUMENTS.UPLOAD,
          file,
          progressCallback
        )
        expect(result).toEqual(mockDocument)
      })
    })

    describe('uploadFiles', () => {
      it('should delegate to documentsApi.uploadMultiple', async () => {
        const files = [
          new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
          new File(['content2'], 'file2.pdf', { type: 'application/pdf' })
        ]
        const mockDocuments = [{ id: 'doc-1' }, { id: 'doc-2' }]
        
        mockedApiClient.uploadFiles.mockResolvedValue(mockDocuments)
        
        const result = await uploadApi.uploadFiles(files)
        
        expect(mockedApiClient.uploadFiles).toHaveBeenCalledWith(
          API_ENDPOINTS.DOCUMENTS.UPLOAD,
          files,
          undefined
        )
        expect(result).toEqual(mockDocuments)
      })
    })

    describe('uploadToCourse', () => {
      it('should delegate to coursesApi.uploadResources', async () => {
        const courseId = 'course-123'
        const files = [new File(['content'], 'resource.pdf', { type: 'application/pdf' })]
        const mockResponse = { documents: [{ id: 'doc-1' }] }
        
        mockedApiClient.uploadFiles.mockResolvedValue(mockResponse)
        
        const result = await uploadApi.uploadToCourse(courseId, files)
        
        expect(mockedApiClient.uploadFiles).toHaveBeenCalledWith(
          API_ENDPOINTS.COURSES.UPLOAD_RESOURCES(courseId),
          files,
          undefined
        )
        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('Generation API', () => {
    describe('generateCourse', () => {
      it('should call coursesApi.generate', async () => {
        const documentIds = ['doc-1', 'doc-2']
        const config: CourseConfig = { 
          sessionCount: 5, 
          difficulty: 'intermediate',
          includeQuizzes: true,
          includeExercises: true,
          language: 'en',
          tone: 'formal'
        }
        const mockResponse = { jobId: 'job-gen-1', courseId: 'course-new' }
        
        mockedApiClient.post.mockResolvedValue(mockResponse)
        
        const result = await generationApi.generateCourse(documentIds, config)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.COURSES.GENERATE,
          { documentIds, config }
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('generateContent', () => {
      it('should call coursesApi.generateContent', async () => {
        const courseId = 'course-123'
        const config: CourseConfig = { 
          sessionCount: 3, 
          difficulty: 'advanced',
          includeQuizzes: false,
          includeExercises: true,
          language: 'en',
          tone: 'academic'
        }
        const mockResponse = { jobId: 'job-gen-2' }
        
        mockedApiClient.post.mockResolvedValue(mockResponse)
        
        const result = await generationApi.generateContent(courseId, config)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.COURSES.GENERATE_CONTENT(courseId),
          config
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('getJobStatus', () => {
      it('should delegate to jobsApi.getStatus', async () => {
        const jobId = 'job-123'
        const mockJob = { id: jobId, status: 'running', progress: 50 }
        
        mockedApiClient.get.mockResolvedValue(mockJob)
        
        const result = await generationApi.getJobStatus(jobId)
        
        expect(mockedApiClient.get).toHaveBeenCalledWith(
          API_ENDPOINTS.JOBS.STATUS(jobId)
        )
        expect(result).toEqual(mockJob)
      })
    })

    describe('cancelJob', () => {
      it('should delegate to jobsApi.cancel', async () => {
        const jobId = 'job-123'
        
        mockedApiClient.post.mockResolvedValue({ message: 'Cancelled' })
        
        await generationApi.cancelJob(jobId)
        
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          API_ENDPOINTS.JOBS.CANCEL(jobId)
        )
      })
    })

    describe('subscribeToJob', () => {
      it('should create WebSocket connection', () => {
        const mockWebSocket = {
          onmessage: null as any,
          onerror: null as any,
          close: jest.fn()
        }
        
        global.WebSocket = jest.fn(() => mockWebSocket) as any

        const onUpdate = jest.fn()
        const unsubscribe = generationApi.subscribeToJob('job-123', onUpdate)

        expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3001/jobs/job-123')

        // Simulate receiving a message
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({ data: JSON.stringify({ progress: 50 }) } as any)
        }
        
        expect(onUpdate).toHaveBeenCalledWith({ progress: 50 })

        // Test cleanup
        unsubscribe()
        expect(mockWebSocket.close).toHaveBeenCalled()
      })

      it('should handle WebSocket errors gracefully', () => {
        const mockWebSocket = {
          onmessage: null as any,
          onerror: null as any,
          close: jest.fn()
        }
        
        global.WebSocket = jest.fn(() => mockWebSocket) as any
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

        generationApi.subscribeToJob('job-123', jest.fn())

        // Simulate error
        if (mockWebSocket.onerror) {
          mockWebSocket.onerror(new Error('Connection failed'))
        }

        expect(consoleError).toHaveBeenCalledWith('WebSocket error:', expect.any(Error))
        consoleError.mockRestore()
      })

      it('should return noop function in non-browser environment', () => {
        const originalWindow = global.window
        delete (global as any).window

        const onUpdate = jest.fn()
        const unsubscribe = generationApi.subscribeToJob('job-123', onUpdate)
        
        unsubscribe() // Should not throw
        expect(onUpdate).not.toHaveBeenCalled()

        global.window = originalWindow
      })
    })
  })

  describe('Health API', () => {
    describe('check', () => {
      it('should call apiClient.get with health endpoint', async () => {
        const mockResponse = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
        
        mockedApiClient.get.mockResolvedValue(mockResponse)
        
        const result = await healthApi.check()
        
        expect(mockedApiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.HEALTH)
        expect(result).toEqual(mockResponse)
      })
    })
  })
})