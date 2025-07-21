import React from 'react'
import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { http, HttpResponse } from 'msw'
import { server, mockAPI } from '@/__tests__/utils/api-mocks'
import { MockDataGenerator } from '@/__tests__/utils/mock-data'
import {
  useLogin,
  useRegister,
  useLogout,
  useCourses,
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
  useUploadDocument,
  useGenerateCourse,
  useJobStatus,
  useExportCourse,
  useForgotPassword,
  useUser,
  useDocuments,
  useDocument,
  useUploadMultipleDocuments,
  useDeleteDocument,
  useInfiniteCourses,
  useCourse,
  useUploadCourseResources,
  useAddUrlToCourse,
  useGenerateCourseContent,
  useCancelJob,
  useJobs,
  useExportBundle,
  useDownloadExport,
  useHealthCheck,
  useJobSubscription,
  useBulkDeleteCourses,
  usePrefetchCourse,
  useInvalidateCache,
} from '../use-api'

// Mock stores
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: jest.fn(() => ({
    user: null,
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
  })),
}))

jest.mock('@/lib/store/course-store', () => ({
  useCourseStore: jest.fn(() => ({
    courses: [],
    currentCourse: null,
    setCurrentCourse: jest.fn(),
    addCourse: jest.fn(),
    updateCourse: jest.fn(),
    deleteCourse: jest.fn(),
    bulkDeleteCourses: jest.fn(),
  })),
}))

jest.mock('@/lib/store/generation-store', () => ({
  useGenerationStore: jest.fn(() => ({
    generations: {},
    startGeneration: jest.fn(),
    updateGeneration: jest.fn(),
    cancelGeneration: jest.fn(),
    subscribeToJob: jest.fn(() => () => {}),
  })),
}))

jest.mock('@/lib/store/ui-store', () => ({
  useUIStore: jest.fn(() => ({
    notifications: [],
    addNotification: jest.fn(),
  })),
}))

// Base API URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Helper to create successful response
const createSuccessResponse = <T>(data: T) => ({
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

  describe('useForgotPassword', () => {
    it('should send forgot password request', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useForgotPassword(), { wrapper })

      result.current.mutate('test@example.com')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should handle errors', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useForgotPassword(), { wrapper })

      server.use(
        http.post(`${API_BASE}/auth/forgot-password`, async () => {
          return HttpResponse.json({ error: 'User not found' }, { status: 404 })
        })
      )

      result.current.mutate('notfound@example.com')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('useUser', () => {
    it('should fetch current user when authenticated', async () => {
      const wrapper = createWrapper()
      const mockUser = MockDataGenerator.user()
      
      // Mock auth store
      const mockAuthStore = require('@/lib/store/auth-store')
      mockAuthStore.useAuthStore = jest.fn().mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
      })

      const { result } = renderHook(() => useUser(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeDefined()
    })

    it('should not fetch when not authenticated', () => {
      const wrapper = createWrapper()
      
      // Mock auth store
      const mockAuthStore = require('@/lib/store/auth-store')
      mockAuthStore.useAuthStore = jest.fn().mockReturnValue({
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useUser(), { wrapper })

      expect(result.current.isIdle).toBe(true)
      expect(result.current.data).toBeUndefined()
    })
  })

  describe('useDocuments', () => {
    it('should fetch documents list', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDocuments(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        documents: expect.any(Array),
        total: expect.any(Number),
      })
    })

    it('should fetch documents with parameters', async () => {
      const wrapper = createWrapper()
      const params = { page: 2, limit: 10, search: 'test' }
      const { result } = renderHook(() => useDocuments(params), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })
  })

  describe('useDocument', () => {
    it('should fetch single document', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDocument('doc-123'), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        id: 'doc-123',
      })
    })

    it('should not fetch when id is empty', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDocument(''), { wrapper })

      expect(result.current.isIdle).toBe(true)
    })
  })

  describe('useUploadMultipleDocuments', () => {
    it('should upload multiple files', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUploadMultipleDocuments(), { wrapper })

      const files = [
        new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'test2.pdf', { type: 'application/pdf' }),
      ]

      result.current.mutate({ files })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(2)
    })

    it('should track progress for multiple files', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUploadMultipleDocuments(), { wrapper })
      const onProgress = jest.fn()

      const files = [
        new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'test2.pdf', { type: 'application/pdf' }),
      ]

      result.current.mutate({ files, onProgress })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(onProgress).toHaveBeenCalled()
    })
  })

  describe('useDeleteDocument', () => {
    it('should delete document successfully', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDeleteDocument(), { wrapper })

      result.current.mutate('doc-123')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should handle deletion errors', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDeleteDocument(), { wrapper })

      server.use(
        http.delete(`${API_BASE}/documents/doc-404`, async () => {
          return HttpResponse.json({ error: 'Document not found' }, { status: 404 })
        })
      )

      result.current.mutate('doc-404')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('useInfiniteCourses', () => {
    it('should fetch courses with infinite scrolling', async () => {
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

      // Mock next page data
      server.use(
        http.get(`${API_BASE}/courses`, async ({ request }) => {
          const url = new URL(request.url)
          const page = Number(url.searchParams.get('page')) || 1
          if (page === 2) {
            return HttpResponse.json({
              courses: MockDataGenerator.courses(5),
              total: 10,
              page: 2,
              limit: 5,
            })
          }
          return HttpResponse.json({
            courses: MockDataGenerator.courses(5),
            total: 10,
            page: 1,
            limit: 5,
          })
        })
      )

      await result.current.fetchNextPage()

      await waitFor(() => {
        expect(result.current.data?.pages).toHaveLength(2)
      })
    })
  })

  describe('useCourse', () => {
    it('should fetch course and update store', async () => {
      const wrapper = createWrapper()
      const mockSetCurrentCourse = jest.fn()
      
      // Mock course store
      const mockCourseStore = require('@/lib/store/course-store')
      mockCourseStore.useCourseStore = jest.fn().mockReturnValue({
        setCurrentCourse: mockSetCurrentCourse,
      })

      const { result } = renderHook(() => useCourse('course-123'), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockSetCurrentCourse).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'course-123' })
      )
    })
  })

  describe('useUploadCourseResources', () => {
    it('should upload resources to course', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUploadCourseResources(), { wrapper })

      const files = [
        new File(['resource1'], 'resource1.pdf', { type: 'application/pdf' }),
        new File(['resource2'], 'resource2.pdf', { type: 'application/pdf' }),
      ]

      result.current.mutate({
        courseId: 'course-123',
        files,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        documents: expect.arrayContaining([
          expect.objectContaining({ filename: expect.any(String) })
        ])
      })
    })
  })

  describe('useAddUrlToCourse', () => {
    it('should add URL to course', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useAddUrlToCourse(), { wrapper })

      result.current.mutate({
        courseId: 'course-123',
        url: 'https://example.com/resource',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        document: expect.objectContaining({
          url: 'https://example.com/resource',
        })
      })
    })
  })

  describe('useGenerateCourseContent', () => {
    it('should generate course content', async () => {
      const wrapper = createWrapper()
      const mockStartGeneration = jest.fn()
      
      // Mock generation store
      const mockGenerationStore = require('@/lib/store/generation-store')
      mockGenerationStore.useGenerationStore = jest.fn().mockReturnValue({
        startGeneration: mockStartGeneration,
      })

      const { result } = renderHook(() => useGenerateCourseContent(), { wrapper })

      const config = { model: 'claude-3', creativity: 70 }
      result.current.mutate({
        courseId: 'course-123',
        config,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockStartGeneration).toHaveBeenCalledWith(
        expect.any(String),
        'course-123'
      )
    })
  })

  describe('useCancelJob', () => {
    it('should cancel job successfully', async () => {
      const wrapper = createWrapper()
      const mockCancelGeneration = jest.fn()
      
      // Mock generation store
      const mockGenerationStore = require('@/lib/store/generation-store')
      mockGenerationStore.useGenerationStore = jest.fn().mockReturnValue({
        cancelGeneration: mockCancelGeneration,
      })

      const { result } = renderHook(() => useCancelJob(), { wrapper })

      result.current.mutate('job-123')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockCancelGeneration).toHaveBeenCalledWith('job-123')
    })
  })

  describe('useJobs', () => {
    it('should fetch jobs list', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useJobs(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        jobs: expect.any(Array),
        total: expect.any(Number),
      })
    })

    it('should fetch jobs with filters', async () => {
      const wrapper = createWrapper()
      const params = { status: 'running', type: 'generation' }
      const { result } = renderHook(() => useJobs(params), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })
  })

  describe('useExportBundle', () => {
    it('should export course bundle', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useExportBundle(), { wrapper })

      result.current.mutate({
        courseId: 'course-123',
        options: { formats: ['html', 'pdf'] },
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        jobId: expect.any(String),
      })
    })
  })

  describe('useDownloadExport', () => {
    it('should download export with progress', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDownloadExport(), { wrapper })
      const onProgress = jest.fn()

      result.current.mutate({
        jobId: 'export-123',
        filename: 'course-export.zip',
        onProgress,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should download without filename', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDownloadExport(), { wrapper })

      result.current.mutate({
        jobId: 'export-123',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })
  })

  describe('useHealthCheck', () => {
    it('should check API health', async () => {
      const wrapper = createWrapper()
      
      server.use(
        http.get(`${API_BASE}/health`, async () => {
          return HttpResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          })
        })
      )

      const { result } = renderHook(() => useHealthCheck(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        status: 'ok',
        version: '1.0.0',
      })
    })

    it('should handle health check failures', async () => {
      const wrapper = createWrapper()
      
      server.use(
        http.get(`${API_BASE}/health`, async () => {
          return HttpResponse.json({ error: 'Service unavailable' }, { status: 503 })
        })
      )

      const { result } = renderHook(() => useHealthCheck(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('useJobSubscription', () => {
    it('should subscribe to job updates', () => {
      const wrapper = createWrapper()
      const mockSubscribe = jest.fn().mockReturnValue(() => {})
      const onUpdate = jest.fn()
      
      // Mock generation store
      const mockGenerationStore = require('@/lib/store/generation-store')
      mockGenerationStore.useGenerationStore = jest.fn().mockReturnValue({
        subscribeToJob: mockSubscribe,
      })

      const { unmount } = renderHook(
        () => useJobSubscription('job-123', onUpdate),
        { wrapper }
      )

      expect(mockSubscribe).toHaveBeenCalledWith('job-123', onUpdate)

      unmount()
    })

    it('should not subscribe when disabled', () => {
      const wrapper = createWrapper()
      const mockSubscribe = jest.fn()
      const onUpdate = jest.fn()
      
      // Mock generation store
      const mockGenerationStore = require('@/lib/store/generation-store')
      mockGenerationStore.useGenerationStore = jest.fn().mockReturnValue({
        subscribeToJob: mockSubscribe,
      })

      renderHook(
        () => useJobSubscription('job-123', onUpdate, { enabled: false }),
        { wrapper }
      )

      expect(mockSubscribe).not.toHaveBeenCalled()
    })

    it('should not subscribe without jobId', () => {
      const wrapper = createWrapper()
      const mockSubscribe = jest.fn()
      const onUpdate = jest.fn()
      
      // Mock generation store
      const mockGenerationStore = require('@/lib/store/generation-store')
      mockGenerationStore.useGenerationStore = jest.fn().mockReturnValue({
        subscribeToJob: mockSubscribe,
      })

      renderHook(
        () => useJobSubscription('', onUpdate),
        { wrapper }
      )

      expect(mockSubscribe).not.toHaveBeenCalled()
    })
  })

  describe('useBulkDeleteCourses', () => {
    it('should delete multiple courses', async () => {
      const wrapper = createWrapper()
      const mockBulkDelete = jest.fn()
      
      // Mock course store
      const mockCourseStore = require('@/lib/store/course-store')
      mockCourseStore.useCourseStore = jest.fn().mockReturnValue({
        bulkDeleteCourses: mockBulkDelete,
      })

      const { result } = renderHook(() => useBulkDeleteCourses(), { wrapper })

      const courseIds = ['course-1', 'course-2', 'course-3']
      result.current.mutate(courseIds)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockBulkDelete).toHaveBeenCalledWith(courseIds)
    })

    it('should handle partial failures', async () => {
      const wrapper = createWrapper()
      const mockBulkDelete = jest.fn()
      
      // Mock course store
      const mockCourseStore = require('@/lib/store/course-store')
      mockCourseStore.useCourseStore = jest.fn().mockReturnValue({
        bulkDeleteCourses: mockBulkDelete,
      })

      // Mock one failure
      server.use(
        http.delete(`${API_BASE}/courses/course-2`, async () => {
          return HttpResponse.json({ error: 'Cannot delete' }, { status: 400 })
        })
      )

      const { result } = renderHook(() => useBulkDeleteCourses(), { wrapper })

      const courseIds = ['course-1', 'course-2', 'course-3']
      result.current.mutate(courseIds)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Should still call bulkDelete with all IDs
      expect(mockBulkDelete).toHaveBeenCalledWith(courseIds)
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
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      
      const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery')
      
      const { result } = renderHook(
        () => usePrefetchCourse('course-123'),
        { 
          wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          )
        }
      )

      result.current()

      expect(prefetchSpy).toHaveBeenCalledWith({
        queryKey: ['courses', 'detail', 'course-123'],
        queryFn: expect.any(Function),
        staleTime: 1000 * 60 * 5,
      })
    })
  })

  describe('useInvalidateCache', () => {
    it('should return invalidate function', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useInvalidateCache(), { wrapper })

      expect(typeof result.current).toBe('function')
    })

    it('should invalidate specific cache type', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useInvalidateCache(), { wrapper })

      // Mock invalidateQueries functions
      const mockInvalidateQueries = require('@/lib/query-client')
      jest.spyOn(mockInvalidateQueries.invalidateQueries, 'courses')
      jest.spyOn(mockInvalidateQueries.invalidateQueries, 'documents')
      jest.spyOn(mockInvalidateQueries.invalidateQueries, 'jobs')

      result.current('courses')
      expect(mockInvalidateQueries.invalidateQueries.courses).toHaveBeenCalled()

      result.current('documents')
      expect(mockInvalidateQueries.invalidateQueries.documents).toHaveBeenCalled()

      result.current('jobs')
      expect(mockInvalidateQueries.invalidateQueries.jobs).toHaveBeenCalled()
    })

    it('should invalidate all cache when no type specified', () => {
      const wrapper = createWrapper()
      const queryClient = new QueryClient()
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')
      
      const { result } = renderHook(
        () => useInvalidateCache(),
        { 
          wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          )
        }
      )

      result.current()

      expect(invalidateSpy).toHaveBeenCalledWith()
    })
  })
})