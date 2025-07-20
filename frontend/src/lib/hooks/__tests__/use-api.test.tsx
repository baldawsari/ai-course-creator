import React from 'react'
import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
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
} from '../use-api'

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
})