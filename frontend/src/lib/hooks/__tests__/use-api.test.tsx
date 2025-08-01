import React from 'react'
import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { http, HttpResponse } from 'msw'
import { server, mockAPI } from '@/__tests__/utils/api-mocks'
import { MockDataGenerator } from '@/__tests__/utils/mock-data'
import { useAuthStore } from '@/lib/store/auth-store'
import { useCourseStore } from '@/lib/store/course-store'
import { useGenerationStore } from '@/lib/store/generation-store'
import { useUIStore } from '@/lib/store/ui-store'
import {
  useLogin,
  useRegister,
  useLogout,
  useDocuments,
  useDocument,
  useUploadDocument,
  useDeleteDocument,
  useCourses,
  useCourse,
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
  useGenerateCourse,
  useGenerateCourseContent,
  useJobStatus,
  useCancelJob,
  useExportCourse,
  useHealthCheck,
  useUser,
  useForgotPassword,
  useUploadMultipleDocuments,
  useInfiniteCourses,
  useUploadCourseResources,
  useAddUrlToCourse,
  useJobs,
  useExportBundle,
  useDownloadExport,
  useBulkDeleteCourses,
  usePrefetchCourse,
  useInvalidateCache,
  useJobSubscription,
} from '../use-api'

// Base API URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Helper to create successful response
const createSuccessResponse = <T,>(data: T) => ({
  success: true,
  data,
})

// Setup MSW server
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress error logs in tests
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('API Hooks', () => {
  describe('useLogin', () => {
    it('should handle successful login', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useLogin(), { wrapper })

      expect(result.current.isIdle).toBe(true)
      expect(result.current.isLoading).toBe(false)

      // Mock successful login
      mockAPI.mockSuccessfulLogin()

      // Trigger login
      result.current.mutate({
        email: 'test@example.com',
        password: 'password123',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        user: expect.objectContaining({
          email: 'test@example.com',
        }),
        token: expect.any(String),
      })
    })

    it('should handle failed login', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useLogin(), { wrapper })

      // Mock failed login
      mockAPI.mockFailedLogin()

      result.current.mutate({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })

    it('should call onSuccess callback', async () => {
      const onSuccess = jest.fn()
      const wrapper = createWrapper()
      const { result } = renderHook(() => useLogin({ onSuccess }), { wrapper })

      mockAPI.mockSuccessfulLogin()

      result.current.mutate({
        email: 'test@example.com',
        password: 'password123',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.any(Object),
          token: expect.any(String),
        })
      )
    })

    it('should call onError callback', async () => {
      const onError = jest.fn()
      const wrapper = createWrapper()
      const { result } = renderHook(() => useLogin({ onError }), { wrapper })

      mockAPI.mockFailedLogin()

      result.current.mutate({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('useRegister', () => {
    it('should handle successful registration', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useRegister(), { wrapper })

      result.current.mutate({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securepassword123',
        confirmPassword: 'securepassword123',
        organization: 'Test Org',
        role: 'educator',
        useCase: 'corporate-training',
        agreeToTerms: true,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        user: expect.objectContaining({
          email: 'john@example.com',
        }),
        token: expect.any(String),
      })
    })

    it('should validate password confirmation', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useRegister(), { wrapper })

      result.current.mutate({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securepassword123',
        confirmPassword: 'differentpassword',
        organization: 'Test Org',
        role: 'educator',
        useCase: 'corporate-training',
        agreeToTerms: true,
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('useLogout', () => {
    it('should handle successful logout', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useLogout(), { wrapper })

      result.current.mutate()

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should clear local storage on logout', async () => {
      const clearStorageSpy = jest.spyOn(Storage.prototype, 'removeItem')
      const wrapper = createWrapper()
      const { result } = renderHook(() => useLogout(), { wrapper })

      result.current.mutate()

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(clearStorageSpy).toHaveBeenCalledWith('auth_token')
      expect(clearStorageSpy).toHaveBeenCalledWith('refresh_token')
    })
  })

  describe('useCourses', () => {
    it('should fetch courses successfully', async () => {
      const wrapper = createWrapper()
      const mockCourses = MockDataGenerator.courses(5)
      
      mockAPI.mockCourseList(mockCourses)

      const { result } = renderHook(() => useCourses(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
          }),
        ]),
        pagination: expect.objectContaining({
          page: expect.any(Number),
          total: expect.any(Number),
        }),
      })
    })

    it('should handle search parameters', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(
        () => useCourses({ search: 'JavaScript', difficulty: 'beginner' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Query should include search parameters
      expect(result.current.dataUpdatedAt).toBeGreaterThan(0)
    })

    it('should handle empty course list', async () => {
      const wrapper = createWrapper()
      mockAPI.mockEmptyCourseList()

      const { result } = renderHook(() => useCourses(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.data).toHaveLength(0)
    })

    it('should handle network errors', async () => {
      const wrapper = createWrapper()
      mockAPI.mockNetworkError()

      const { result } = renderHook(() => useCourses(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe('useCreateCourse', () => {
    it('should create course successfully', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useCreateCourse(), { wrapper })

      const courseData = {
        title: 'New Course',
        description: 'Course description',
        difficulty: 'beginner' as const,
        estimatedDuration: 120,
      }

      result.current.mutate(courseData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        title: 'New Course',
        difficulty: 'beginner',
      })
    })

    it('should handle validation errors', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useCreateCourse(), { wrapper })

      const invalidCourseData = {
        title: '', // Empty title should fail validation
        description: 'Course description',
        difficulty: 'beginner' as const,
        estimatedDuration: 120,
      }

      result.current.mutate(invalidCourseData)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    it('should invalidate courses query on success', async () => {
      const wrapper = createWrapper()
      const { result: coursesResult } = renderHook(() => useCourses(), { wrapper })
      const { result: createResult } = renderHook(() => useCreateCourse(), { wrapper })

      // Wait for initial courses fetch
      await waitFor(() => {
        expect(coursesResult.current.isSuccess).toBe(true)
      })

      const initialDataUpdatedAt = coursesResult.current.dataUpdatedAt

      // Create new course
      createResult.current.mutate({
        title: 'New Course',
        description: 'Course description',
        difficulty: 'beginner' as const,
        estimatedDuration: 120,
      })

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true)
      })

      // Courses query should be invalidated and refetched
      await waitFor(() => {
        expect(coursesResult.current.dataUpdatedAt).toBeGreaterThan(initialDataUpdatedAt)
      })
    })
  })

  describe('useUpdateCourse', () => {
    it('should update course successfully', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUpdateCourse(), { wrapper })

      const updateData = {
        id: 'course-123',
        title: 'Updated Course Title',
        description: 'Updated description',
      }

      result.current.mutate(updateData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        title: 'Updated Course Title',
      })
    })

    it('should handle optimistic updates', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUpdateCourse({ optimistic: true }), { wrapper })

      // Should immediately reflect changes before server response
      const updateData = {
        id: 'course-123',
        title: 'Optimistically Updated',
      }

      result.current.mutate(updateData)

      // Should show loading state but with optimistic update applied
      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('useDeleteCourse', () => {
    it('should delete course successfully', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDeleteCourse(), { wrapper })

      result.current.mutate('course-123')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should show confirmation before deletion', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDeleteCourse({ confirm: true }), { wrapper })

      result.current.mutate('course-123')

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('delete')
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should cancel deletion if user declines confirmation', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDeleteCourse({ confirm: true }), { wrapper })

      result.current.mutate('course-123')

      expect(confirmSpy).toHaveBeenCalled()
      expect(result.current.isIdle).toBe(true) // Should not proceed with deletion
    })
  })

  describe('useUploadDocument', () => {
    it('should upload document with progress tracking', async () => {
      const onProgress = jest.fn()
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUploadDocument({ onProgress }), { wrapper })

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      result.current.mutate(file)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        filename: expect.stringContaining('.pdf'),
        status: 'processing',
      })

      // Progress callback should have been called
      expect(onProgress).toHaveBeenCalled()
    })

    it('should handle upload errors', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUploadDocument(), { wrapper })

      // Mock upload error
      const invalidFile = new File(['content'], 'invalid.exe', { type: 'application/octet-stream' })

      result.current.mutate(invalidFile)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    it('should validate file size and type', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(
        () => useUploadDocument({ 
          maxSize: 1024 * 1024, // 1MB
          allowedTypes: ['application/pdf'] 
        }),
        { wrapper }
      )

      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.pdf', { 
        type: 'application/pdf' 
      })

      result.current.mutate(largeFile)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('useGenerateCourse', () => {
    it('should start course generation', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useGenerateCourse(), { wrapper })

      const generationData = {
        documentIds: ['doc-1', 'doc-2'],
        config: {
          model: 'claude-3-sonnet',
          creativity: 70,
          sessionCount: 5,
        },
      }

      result.current.mutate(generationData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        jobId: expect.any(String),
        status: 'started',
      })
    })

    it('should handle missing documents error', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useGenerateCourse(), { wrapper })

      const invalidData = {
        documentIds: [], // Empty documents should fail
        config: {
          model: 'claude-3-sonnet',
          creativity: 70,
          sessionCount: 5,
        },
      }

      result.current.mutate(invalidData)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('useJobStatus', () => {
    it('should poll job status', async () => {
      const wrapper = createWrapper()
      mockAPI.mockJobProgress('job-123', 50)

      const { result } = renderHook(
        () => useJobStatus('job-123', { refetchInterval: 100 }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        id: 'job-123',
        progress: 50,
        status: 'running',
      })

      // Should continue polling
      expect(result.current.isRefetching).toBe(false)
    })

    it('should stop polling when job completes', async () => {
      const wrapper = createWrapper()
      mockAPI.mockJobProgress('job-123', 100)

      const { result } = renderHook(
        () => useJobStatus('job-123', { refetchInterval: 100 }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.data?.status).toBe('completed')
      })

      // Polling should stop for completed jobs
      expect(result.current.isRefetching).toBe(false)
    })

    it('should handle job errors', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(
        () => useJobStatus('nonexistent-job'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('useExportCourse', () => {
    it('should export course successfully', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useExportCourse(), { wrapper })

      const exportData = {
        courseId: 'course-123',
        format: 'html' as const,
        options: {
          template: 'modern',
          includeTOC: true,
        },
      }

      result.current.mutate(exportData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        jobId: expect.any(String),
        status: 'started',
      })
    })

    it('should handle export format validation', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useExportCourse(), { wrapper })

      const invalidExportData = {
        courseId: 'course-123',
        format: 'invalid-format' as any,
      }

      result.current.mutate(invalidExportData)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('error handling and resilience', () => {
    it('should handle network timeouts', async () => {
      const wrapper = createWrapper()
      mockAPI.mockTimeout()

      const { result } = renderHook(() => useCourses(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      }, { timeout: 5000 })
    })

    it('should handle server errors gracefully', async () => {
      const wrapper = createWrapper()
      mockAPI.mockServerError()

      const { result } = renderHook(() => useCourses(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })

    it('should retry failed requests', async () => {
      const wrapper = createWrapper()
      
      // First request fails, second succeeds
      let requestCount = 0
      server.use(
        http.get(`${API_BASE}/courses`, async () => {
          requestCount++
          if (requestCount === 1) {
            return HttpResponse.json({ error: 'Server error' }, { status: 500 })
          }
          return HttpResponse.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } }, { status: 200 })
        })
      )

      const { result } = renderHook(
        () => useCourses(),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(requestCount).toBeGreaterThan(1)
    })
  })

  describe('caching and performance', () => {
    it('should cache successful responses', async () => {
      const wrapper = createWrapper()
      const { result: result1 } = renderHook(() => useCourses(), { wrapper })
      
      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true)
      })

      // Second hook should use cached data
      const { result: result2 } = renderHook(() => useCourses(), { wrapper })
      
      expect(result2.current.data).toEqual(result1.current.data)
      expect(result2.current.isLoading).toBe(false)
    })

    it('should invalidate cache on mutations', async () => {
      const wrapper = createWrapper()
      const { result: coursesResult } = renderHook(() => useCourses(), { wrapper })
      const { result: createResult } = renderHook(() => useCreateCourse(), { wrapper })

      await waitFor(() => {
        expect(coursesResult.current.isSuccess).toBe(true)
      })

      const initialData = coursesResult.current.data

      // Create course should invalidate cache
      createResult.current.mutate({
        title: 'New Course',
        description: 'Description',
        difficulty: 'beginner' as const,
        estimatedDuration: 120,
      })

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true)
      })

      // Data should be refetched
      await waitFor(() => {
        expect(coursesResult.current.data).not.toBe(initialData)
      })
    })
  })

  describe('useDocuments', () => {
    it('should fetch documents successfully', async () => {
      const wrapper = createWrapper()
      const mockDocuments = MockDataGenerator.documents(3)
      
      mockAPI.mockDocumentList(mockDocuments)

      const { result } = renderHook(() => useDocuments(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            filename: expect.any(String),
            status: expect.any(String),
          }),
        ]),
        pagination: expect.objectContaining({
          page: expect.any(Number),
          total: expect.any(Number),
        }),
      })
    })

    it('should handle pagination parameters', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(
        () => useDocuments({ page: 2, limit: 10, search: 'test.pdf' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Query should include pagination parameters
      expect(result.current.dataUpdatedAt).toBeGreaterThan(0)
    })

    it('should handle empty document list', async () => {
      const wrapper = createWrapper()
      mockAPI.mockEmptyDocumentList()

      const { result } = renderHook(() => useDocuments(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.data).toHaveLength(0)
    })
  })

  describe('useDocument', () => {
    it('should fetch single document details', async () => {
      const wrapper = createWrapper()
      const mockDocument = MockDataGenerator.document()
      
      mockAPI.mockDocumentDetail(mockDocument)

      const { result } = renderHook(() => useDocument(mockDocument.id), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        id: mockDocument.id,
        filename: mockDocument.filename,
        status: mockDocument.status,
      })
    })

    it('should not fetch if id is not provided', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDocument(''), { wrapper })

      expect(result.current.isIdle).toBe(true)
      expect(result.current.data).toBeUndefined()
    })

    it('should handle document not found', async () => {
      const wrapper = createWrapper()
      
      server.use(
        http.get(`${API_BASE}/documents/nonexistent`, async () => {
          return HttpResponse.json({ error: 'Document not found' }, { status: 404 })
        })
      )

      const { result } = renderHook(() => useDocument('nonexistent'), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe('useDeleteDocument', () => {
    it('should delete document successfully', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDeleteDocument(), { wrapper })

      mockAPI.mockDocumentDelete('doc-123')

      result.current.mutate('doc-123')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should handle deletion errors', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDeleteDocument(), { wrapper })

      server.use(
        http.delete(`${API_BASE}/documents/protected-doc`, async () => {
          return HttpResponse.json({ error: 'Cannot delete protected document' }, { status: 403 })
        })
      )

      result.current.mutate('protected-doc')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    it('should invalidate documents query on success', async () => {
      const wrapper = createWrapper()
      const { result: documentsResult } = renderHook(() => useDocuments(), { wrapper })
      const { result: deleteResult } = renderHook(() => useDeleteDocument(), { wrapper })

      // Wait for initial documents fetch
      await waitFor(() => {
        expect(documentsResult.current.isSuccess).toBe(true)
      })

      const initialDataUpdatedAt = documentsResult.current.dataUpdatedAt

      // Delete document
      mockAPI.mockDocumentDelete('doc-123')
      deleteResult.current.mutate('doc-123')

      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true)
      })

      // Documents query should be invalidated
      await waitFor(() => {
        expect(documentsResult.current.dataUpdatedAt).toBeGreaterThan(initialDataUpdatedAt)
      })
    })
  })

  describe('useUploadMultipleDocuments', () => {
    it('should upload multiple documents successfully', async () => {
      const onProgress = jest.fn()
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUploadMultipleDocuments(), { wrapper })

      const files = [
        new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'test2.pdf', { type: 'application/pdf' }),
      ]

      mockAPI.mockMultipleDocumentUpload(files.length)

      result.current.mutate({ files, onProgress })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(files.length)
    })

    it('should handle partial upload failures', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUploadMultipleDocuments(), { wrapper })

      const files = [
        new File(['content1'], 'valid.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'invalid.exe', { type: 'application/octet-stream' }),
      ]

      server.use(
        http.post(`${API_BASE}/documents/upload/multiple`, async () => {
          return HttpResponse.json({
            success: true,
            data: [
              { id: 'doc-1', filename: 'valid.pdf', status: 'processing' },
            ],
            errors: [
              { filename: 'invalid.exe', error: 'Invalid file type' },
            ],
          })
        })
      )

      result.current.mutate({ files })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(1)
    })
  })

  describe('useCourse', () => {
    it('should fetch single course details', async () => {
      const wrapper = createWrapper()
      const mockCourse = MockDataGenerator.course()
      
      mockAPI.mockCourseDetail(mockCourse)

      const { result } = renderHook(() => useCourse(mockCourse.id), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        id: mockCourse.id,
        title: mockCourse.title,
        difficulty: mockCourse.difficulty,
      })
    })

    it('should update course store on fetch', async () => {
      const wrapper = createWrapper()
      const mockCourse = MockDataGenerator.course()
      
      mockAPI.mockCourseDetail(mockCourse)

      const { result } = renderHook(() => useCourse(mockCourse.id), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Store should be updated
      const { result: storeResult } = renderHook(() => useCourseStore())
      expect(storeResult.current.currentCourse).toMatchObject({
        id: mockCourse.id,
        title: mockCourse.title,
      })
    })
  })

  describe('useInfiniteCourses', () => {
    it('should load courses with infinite scroll', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useInfiniteCourses({ limit: 5 }), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.pages).toHaveLength(1)
      expect(result.current.hasNextPage).toBeDefined()
    })

    it('should fetch next page', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useInfiniteCourses({ limit: 5 }), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const initialPageCount = result.current.data?.pages.length || 0

      // Fetch next page
      result.current.fetchNextPage()

      await waitFor(() => {
        expect(result.current.data?.pages.length).toBeGreaterThan(initialPageCount)
      })
    })
  })

  describe('useGenerateCourseContent', () => {
    it('should generate course content', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useGenerateCourseContent(), { wrapper })

      const generationData = {
        courseId: 'course-123',
        config: {
          model: 'claude-3-sonnet',
          creativity: 70,
          sessionCount: 5,
        },
      }

      mockAPI.mockCourseContentGeneration('job-456')

      result.current.mutate(generationData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        jobId: 'job-456',
      })
    })

    it('should update generation store on success', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useGenerateCourseContent(), { wrapper })

      const generationData = {
        courseId: 'course-123',
        config: {
          model: 'claude-3-sonnet',
          creativity: 70,
          sessionCount: 5,
        },
      }

      mockAPI.mockCourseContentGeneration('job-456')

      result.current.mutate(generationData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Check generation store
      const { result: storeResult } = renderHook(() => useGenerationStore())
      expect(storeResult.current.activeGenerations).toContainEqual(
        expect.objectContaining({
          jobId: 'job-456',
          courseId: 'course-123',
        })
      )
    })
  })

  describe('useCancelJob', () => {
    it('should cancel job successfully', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useCancelJob(), { wrapper })

      mockAPI.mockJobCancel('job-123')

      result.current.mutate('job-123')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should update generation store on cancel', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useCancelJob(), { wrapper })

      // Setup generation store with active job
      const { result: storeResult } = renderHook(() => useGenerationStore())
      storeResult.current.startGeneration('job-123', 'course-123')

      mockAPI.mockJobCancel('job-123')

      result.current.mutate('job-123')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Job should be removed from active generations
      expect(storeResult.current.activeGenerations).not.toContainEqual(
        expect.objectContaining({ jobId: 'job-123' })
      )
    })
  })

  describe('useJobs', () => {
    it('should fetch jobs list', async () => {
      const wrapper = createWrapper()
      const mockJobs = MockDataGenerator.jobs(5)
      
      mockAPI.mockJobsList(mockJobs)

      const { result } = renderHook(() => useJobs(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: expect.any(String),
            status: expect.any(String),
          }),
        ]),
      })
    })

    it('should filter jobs by status', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(
        () => useJobs({ status: 'completed', type: 'course_generation' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // All jobs should match the filter
      result.current.data?.data.forEach(job => {
        expect(job.status).toBe('completed')
        expect(job.type).toBe('course_generation')
      })
    })
  })

  describe('useUser', () => {
    it('should fetch current user when authenticated', async () => {
      const wrapper = createWrapper()
      
      // Mock authenticated state
      const { result: authResult } = renderHook(() => useAuthStore())
      authResult.current.login(
        { id: 'user-123', email: 'test@example.com', name: 'Test User' },
        'token',
        'refresh'
      )

      mockAPI.mockCurrentUser()

      const { result } = renderHook(() => useUser(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
      })
    })

    it('should not fetch when not authenticated', () => {
      const wrapper = createWrapper()
      
      // Ensure logged out
      const { result: authResult } = renderHook(() => useAuthStore())
      authResult.current.logout()

      const { result } = renderHook(() => useUser(), { wrapper })

      expect(result.current.isIdle).toBe(true)
      expect(result.current.data).toBeUndefined()
    })
  })

  describe('useForgotPassword', () => {
    it('should send password reset email', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useForgotPassword(), { wrapper })

      mockAPI.mockPasswordReset()

      result.current.mutate('user@example.com')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should handle invalid email', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useForgotPassword(), { wrapper })

      server.use(
        http.post(`${API_BASE}/auth/forgot-password`, async () => {
          return HttpResponse.json({ error: 'Invalid email address' }, { status: 400 })
        })
      )

      result.current.mutate('invalid-email')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('useUploadCourseResources', () => {
    it('should upload course resources', async () => {
      const onProgress = jest.fn()
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUploadCourseResources(), { wrapper })

      const files = [
        new File(['resource1'], 'slide1.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }),
        new File(['resource2'], 'notes.pdf', { type: 'application/pdf' }),
      ]

      mockAPI.mockCourseResourceUpload('course-123', files.length)

      result.current.mutate({
        courseId: 'course-123',
        files,
        onProgress,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(onProgress).toHaveBeenCalled()
    })
  })

  describe('useAddUrlToCourse', () => {
    it('should add URL to course', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useAddUrlToCourse(), { wrapper })

      mockAPI.mockAddUrlToCourse()

      result.current.mutate({
        courseId: 'course-123',
        url: 'https://example.com/resource',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should validate URL format', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useAddUrlToCourse(), { wrapper })

      server.use(
        http.post(`${API_BASE}/courses/:id/urls`, async () => {
          return HttpResponse.json({ error: 'Invalid URL format' }, { status: 400 })
        })
      )

      result.current.mutate({
        courseId: 'course-123',
        url: 'not-a-valid-url',
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('useExportBundle', () => {
    it('should export course bundle', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useExportBundle(), { wrapper })

      const exportData = {
        courseId: 'course-123',
        options: {
          formats: ['html', 'pdf', 'powerpoint'],
          template: 'modern',
          includeTOC: true,
        },
      }

      mockAPI.mockBundleExport('export-job-123')

      result.current.mutate(exportData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        jobId: 'export-job-123',
      })
    })
  })

  describe('useDownloadExport', () => {
    it('should download export with progress', async () => {
      const onProgress = jest.fn()
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDownloadExport(), { wrapper })

      mockAPI.mockExportDownload()

      result.current.mutate({
        jobId: 'export-job-123',
        filename: 'course-export.zip',
        onProgress,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(onProgress).toHaveBeenCalled()
    })
  })

  describe('useBulkDeleteCourses', () => {
    it('should delete multiple courses', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useBulkDeleteCourses(), { wrapper })

      const courseIds = ['course-1', 'course-2', 'course-3']

      // Mock successful deletion for all courses
      courseIds.forEach(id => {
        mockAPI.mockCourseDelete(id)
      })

      result.current.mutate(courseIds)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(courseIds.length)
    })

    it('should handle partial failures', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useBulkDeleteCourses(), { wrapper })

      const courseIds = ['course-1', 'course-2', 'protected-course']

      // Mock successful deletion for first two
      mockAPI.mockCourseDelete('course-1')
      mockAPI.mockCourseDelete('course-2')
      
      // Mock failure for the third
      server.use(
        http.delete(`${API_BASE}/courses/protected-course`, async () => {
          return HttpResponse.json({ error: 'Cannot delete protected course' }, { status: 403 })
        })
      )

      result.current.mutate(courseIds)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Should have results for all attempts
      expect(result.current.data).toHaveLength(3)
      
      // Check successful deletions
      const successful = result.current.data?.filter(r => r.status === 'fulfilled') || []
      expect(successful).toHaveLength(2)
    })
  })

  describe('useHealthCheck', () => {
    it('should check API health', async () => {
      const wrapper = createWrapper()
      
      mockAPI.mockHealthCheck()

      const { result } = renderHook(() => useHealthCheck(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
      })
    })

    it('should handle unhealthy API', async () => {
      const wrapper = createWrapper()
      
      server.use(
        http.get(`${API_BASE}/health`, async () => {
          return HttpResponse.json({
            status: 'unhealthy',
            services: {
              database: 'down',
              redis: 'up',
            },
          }, { status: 503 })
        })
      )

      const { result } = renderHook(() => useHealthCheck(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('usePrefetchCourse', () => {
    it('should return prefetch function', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => usePrefetchCourse('course-123'), { wrapper })

      expect(typeof result.current).toBe('function')
    })

    it('should prefetch course data', async () => {
      const wrapper = createWrapper()
      const mockCourse = MockDataGenerator.course()
      
      mockAPI.mockCourseDetail(mockCourse)

      const { result } = renderHook(() => usePrefetchCourse(mockCourse.id), { wrapper })
      
      // Call prefetch
      result.current()

      // Wait a bit for prefetch to complete
      await waitFor(() => {
        const queryClient = new QueryClient()
        const cachedData = queryClient.getQueryData(['courses', 'detail', mockCourse.id])
        expect(cachedData).toBeDefined()
      }, { timeout: 2000 })
    })
  })

  describe('useInvalidateCache', () => {
    it('should invalidate specific cache types', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useInvalidateCache(), { wrapper })

      // Load some data first
      const { result: coursesResult } = renderHook(() => useCourses(), { wrapper })
      await waitFor(() => {
        expect(coursesResult.current.isSuccess).toBe(true)
      })

      const initialDataUpdatedAt = coursesResult.current.dataUpdatedAt

      // Invalidate courses cache
      result.current('courses')

      // Data should be refetched
      await waitFor(() => {
        expect(coursesResult.current.dataUpdatedAt).toBeGreaterThan(initialDataUpdatedAt)
      })
    })

    it('should invalidate all caches when no type specified', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useInvalidateCache(), { wrapper })

      // This should not throw
      expect(() => result.current()).not.toThrow()
    })
  })

  describe('useJobSubscription', () => {
    it('should subscribe to job updates', () => {
      const wrapper = createWrapper()
      const onUpdate = jest.fn()
      
      renderHook(
        () => useJobSubscription('job-123', onUpdate),
        { wrapper }
      )

      // Subscription should be set up
      const { result: storeResult } = renderHook(() => useGenerationStore())
      expect(storeResult.current.subscriptions).toBeDefined()
    })

    it('should not subscribe when disabled', () => {
      const wrapper = createWrapper()
      const onUpdate = jest.fn()
      
      renderHook(
        () => useJobSubscription('job-123', onUpdate, { enabled: false }),
        { wrapper }
      )

      // No subscription should be created
      const { result: storeResult } = renderHook(() => useGenerationStore())
      expect(storeResult.current.subscriptions).toEqual({})
    })

    it('should unsubscribe on unmount', () => {
      const wrapper = createWrapper()
      const onUpdate = jest.fn()
      
      const { unmount } = renderHook(
        () => useJobSubscription('job-123', onUpdate),
        { wrapper }
      )

      // Unmount should clean up subscription
      unmount()

      const { result: storeResult } = renderHook(() => useGenerationStore())
      expect(storeResult.current.subscriptions['job-123']).toBeUndefined()
    })
  })
})