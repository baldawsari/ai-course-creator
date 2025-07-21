import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { QueryClient, QueryCache } from '@tanstack/react-query'
import {
  queryClient,
  queryKeys,
  invalidateQueries,
  prefetchQueries,
  optimisticUpdates,
  backgroundSync,
  errorRecovery,
  performanceMonitoring,
} from '../query-client'
import * as toastModule from '@/hooks/use-toast'

// Mock use-toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

// Mock QueryClient methods
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query') as any
  return {
    ...actual,
    QueryClient: jest.fn().mockImplementation(function(this: any, config: any) {
      this.defaultOptions = config?.defaultOptions || {}
      this.invalidateQueries = jest.fn()
      this.prefetchQuery = jest.fn()
      this.setQueryData = jest.fn()
      this.resetQueries = jest.fn()
      this.refetchQueries = jest.fn()
      this.clear = jest.fn()
      this.getQueryCache = jest.fn()
    }),
  }
})

describe('Query Client Configuration', () => {
  const mockToast = toastModule.toast as jest.MockedFunction<typeof toastModule.toast>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('retry configuration', () => {
    it('should not retry on 401, 403, 404 errors', () => {
      const retryFn = (queryClient as any).defaultOptions.queries.retry
      
      expect(retryFn(0, { status: 401 })).toBe(false)
      expect(retryFn(0, { status: 403 })).toBe(false)
      expect(retryFn(0, { status: 404 })).toBe(false)
    })

    it('should retry other errors up to 3 times', () => {
      const retryFn = (queryClient as any).defaultOptions.queries.retry
      
      expect(retryFn(0, { status: 500 })).toBe(true)
      expect(retryFn(1, { status: 500 })).toBe(true)
      expect(retryFn(2, { status: 500 })).toBe(true)
      expect(retryFn(3, { status: 500 })).toBe(false)
    })

    it('should calculate exponential backoff for retry delay', () => {
      const retryDelayFn = (queryClient as any).defaultOptions.queries.retryDelay
      
      expect(retryDelayFn(0)).toBe(1000)  // 1s
      expect(retryDelayFn(1)).toBe(2000)  // 2s
      expect(retryDelayFn(2)).toBe(4000)  // 4s
      expect(retryDelayFn(3)).toBe(8000)  // 8s
      expect(retryDelayFn(10)).toBe(30000) // max 30s
    })
  })

  describe('mutation error handling', () => {
    it('should show toast for non-401 errors', () => {
      const onError = (queryClient as any).defaultOptions.mutations.onError
      
      onError({ status: 500, message: 'Server error' })
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Server error',
        variant: 'destructive',
      })
    })

    it('should not show toast for 401 errors', () => {
      const onError = (queryClient as any).defaultOptions.mutations.onError
      
      onError({ status: 401 })
      
      expect(mockToast).not.toHaveBeenCalled()
    })

    it('should handle errors without message', () => {
      const onError = (queryClient as any).defaultOptions.mutations.onError
      
      onError({})
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'destructive',
      })
    })
  })

  describe('mutation success handling', () => {
    it('should show success toast when enabled', () => {
      const onSuccess = (queryClient as any).defaultOptions.mutations.onSuccess
      
      onSuccess('data', 'variables', { showSuccessToast: true, successMessage: 'Custom success' })
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Custom success',
        variant: 'default',
      })
    })

    it('should use default success message', () => {
      const onSuccess = (queryClient as any).defaultOptions.mutations.onSuccess
      
      onSuccess('data', 'variables', { showSuccessToast: true })
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Operation completed successfully',
        variant: 'default',
      })
    })

    it('should not show toast when disabled', () => {
      const onSuccess = (queryClient as any).defaultOptions.mutations.onSuccess
      
      onSuccess('data', 'variables', {})
      
      expect(mockToast).not.toHaveBeenCalled()
    })
  })

  describe('mutation retry configuration', () => {
    it('should not retry mutations', () => {
      const retryFn = (queryClient as any).defaultOptions.mutations.retry
      
      expect(retryFn(0, { status: 500 })).toBe(false)
      expect(retryFn(1, { status: 500 })).toBe(false)
    })
  })
})

describe('Query Keys', () => {
  describe('auth keys', () => {
    it('should generate correct auth keys', () => {
      expect(queryKeys.auth.user()).toEqual(['auth', 'user'])
      expect(queryKeys.auth.permissions()).toEqual(['auth', 'permissions'])
    })
  })

  describe('documents keys', () => {
    it('should generate correct document keys', () => {
      expect(queryKeys.documents.all()).toEqual(['documents'])
      expect(queryKeys.documents.lists()).toEqual(['documents', 'list'])
      expect(queryKeys.documents.list({ page: 1 })).toEqual(['documents', 'list', { page: 1 }])
      expect(queryKeys.documents.details()).toEqual(['documents', 'detail'])
      expect(queryKeys.documents.detail('doc-123')).toEqual(['documents', 'detail', 'doc-123'])
      expect(queryKeys.documents.uploads()).toEqual(['documents', 'uploads'])
    })
  })

  describe('courses keys', () => {
    it('should generate correct course keys', () => {
      expect(queryKeys.courses.all()).toEqual(['courses'])
      expect(queryKeys.courses.lists()).toEqual(['courses', 'list'])
      expect(queryKeys.courses.list({ search: 'test' })).toEqual(['courses', 'list', { search: 'test' }])
      expect(queryKeys.courses.details()).toEqual(['courses', 'detail'])
      expect(queryKeys.courses.detail('course-123')).toEqual(['courses', 'detail', 'course-123'])
      expect(queryKeys.courses.sessions('course-123')).toEqual(['courses', 'course-123', 'sessions'])
      expect(queryKeys.courses.activities('course-123', 'session-456')).toEqual([
        'courses', 'course-123', 'sessions', 'session-456', 'activities'
      ])
    })
  })

  describe('jobs keys', () => {
    it('should generate correct job keys', () => {
      expect(queryKeys.jobs.all()).toEqual(['jobs'])
      expect(queryKeys.jobs.lists()).toEqual(['jobs', 'list'])
      expect(queryKeys.jobs.list({ status: 'running' })).toEqual(['jobs', 'list', { status: 'running' }])
      expect(queryKeys.jobs.details()).toEqual(['jobs', 'detail'])
      expect(queryKeys.jobs.detail('job-123')).toEqual(['jobs', 'detail', 'job-123'])
      expect(queryKeys.jobs.status('job-123')).toEqual(['jobs', 'status', 'job-123'])
    })
  })

  describe('exports keys', () => {
    it('should generate correct export keys', () => {
      expect(queryKeys.exports.all()).toEqual(['exports'])
      expect(queryKeys.exports.lists()).toEqual(['exports', 'list'])
      expect(queryKeys.exports.list({ type: 'pdf' })).toEqual(['exports', 'list', { type: 'pdf' }])
      expect(queryKeys.exports.details()).toEqual(['exports', 'detail'])
      expect(queryKeys.exports.detail('export-123')).toEqual(['exports', 'detail', 'export-123'])
    })
  })

  describe('health keys', () => {
    it('should generate correct health key', () => {
      expect(queryKeys.health()).toEqual(['health'])
    })
  })
})

describe('Invalidate Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should invalidate user queries', () => {
    invalidateQueries.user()
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ 
      queryKey: ['auth', 'user'] 
    })
  })

  it('should invalidate all documents', () => {
    invalidateQueries.documents()
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ 
      queryKey: ['documents'] 
    })
  })

  it('should invalidate specific document', () => {
    invalidateQueries.document('doc-123')
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ 
      queryKey: ['documents', 'detail', 'doc-123'] 
    })
  })

  it('should invalidate all courses', () => {
    invalidateQueries.courses()
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ 
      queryKey: ['courses'] 
    })
  })

  it('should invalidate specific course', () => {
    invalidateQueries.course('course-123')
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ 
      queryKey: ['courses', 'detail', 'course-123'] 
    })
  })

  it('should invalidate course sessions', () => {
    invalidateQueries.courseSessions('course-123')
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ 
      queryKey: ['courses', 'course-123', 'sessions'] 
    })
  })

  it('should invalidate all jobs', () => {
    invalidateQueries.jobs()
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ 
      queryKey: ['jobs'] 
    })
  })

  it('should invalidate specific job', () => {
    invalidateQueries.job('job-123')
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ 
      queryKey: ['jobs', 'detail', 'job-123'] 
    })
  })

  it('should invalidate job status', () => {
    invalidateQueries.jobStatus('job-123')
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ 
      queryKey: ['jobs', 'status', 'job-123'] 
    })
  })

  it('should invalidate all exports', () => {
    invalidateQueries.exports()
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ 
      queryKey: ['exports'] 
    })
  })
})

describe('Prefetch Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should prefetch user data', async () => {
    await prefetchQueries.user()
    
    expect(queryClient.prefetchQuery).toHaveBeenCalledWith({
      queryKey: ['auth', 'user'],
      staleTime: 1000 * 60 * 10, // 10 minutes
    })
  })

  it('should prefetch courses list', async () => {
    await prefetchQueries.courses({ page: 1 })
    
    expect(queryClient.prefetchQuery).toHaveBeenCalledWith({
      queryKey: ['courses', 'list', { page: 1 }],
      staleTime: 1000 * 60 * 5, // 5 minutes
    })
  })

  it('should prefetch courses without params', async () => {
    await prefetchQueries.courses()
    
    expect(queryClient.prefetchQuery).toHaveBeenCalledWith({
      queryKey: ['courses', 'list', undefined],
      staleTime: 1000 * 60 * 5,
    })
  })

  it('should prefetch specific course', async () => {
    await prefetchQueries.course('course-123')
    
    expect(queryClient.prefetchQuery).toHaveBeenCalledWith({
      queryKey: ['courses', 'detail', 'course-123'],
      staleTime: 1000 * 60 * 5, // 5 minutes
    })
  })
})

describe('Optimistic Updates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should optimistically update course', () => {
    const setQueryDataMock = jest.fn()
    queryClient.setQueryData = setQueryDataMock

    optimisticUpdates.updateCourse('course-123', { title: 'Updated Title' })
    
    expect(setQueryDataMock).toHaveBeenCalledWith(
      ['courses', 'detail', 'course-123'],
      expect.any(Function)
    )

    // Test the updater function
    const updaterFn = setQueryDataMock.mock.calls[0][1]
    const oldData = { id: 'course-123', title: 'Old Title', description: 'Description' }
    const newData = updaterFn(oldData)
    
    expect(newData).toEqual({
      id: 'course-123',
      title: 'Updated Title',
      description: 'Description',
    })
  })

  it('should handle null old data in updateCourse', () => {
    const setQueryDataMock = jest.fn()
    queryClient.setQueryData = setQueryDataMock

    optimisticUpdates.updateCourse('course-123', { title: 'Updated' })
    
    const updaterFn = setQueryDataMock.mock.calls[0][1]
    expect(updaterFn(null)).toBeNull()
  })

  it('should optimistically add course to list', () => {
    const setQueryDataMock = jest.fn()
    queryClient.setQueryData = setQueryDataMock

    const newCourse = { id: 'new-course', title: 'New Course' }
    optimisticUpdates.addCourse(newCourse, { page: 1 })
    
    expect(setQueryDataMock).toHaveBeenCalledWith(
      ['courses', 'list', { page: 1 }],
      expect.any(Function)
    )

    // Test the updater function with existing data
    const updaterFn = setQueryDataMock.mock.calls[0][1]
    const oldData = {
      courses: [{ id: 'course-1' }, { id: 'course-2' }],
      total: 2,
      page: 1,
      limit: 20,
    }
    const newData = updaterFn(oldData)
    
    expect(newData).toEqual({
      courses: [newCourse, { id: 'course-1' }, { id: 'course-2' }],
      total: 3,
      page: 1,
      limit: 20,
    })
  })

  it('should handle null old data in addCourse', () => {
    const setQueryDataMock = jest.fn()
    queryClient.setQueryData = setQueryDataMock

    const newCourse = { id: 'new-course', title: 'New Course' }
    optimisticUpdates.addCourse(newCourse)
    
    const updaterFn = setQueryDataMock.mock.calls[0][1]
    const newData = updaterFn(null)
    
    expect(newData).toEqual({
      courses: [newCourse],
      total: 1,
      page: 1,
      limit: 20,
    })
  })

  it('should optimistically remove course from list', () => {
    const setQueryDataMock = jest.fn()
    queryClient.setQueryData = setQueryDataMock

    optimisticUpdates.removeCourse('course-2', { page: 1 })
    
    expect(setQueryDataMock).toHaveBeenCalledWith(
      ['courses', 'list', { page: 1 }],
      expect.any(Function)
    )

    // Test the updater function
    const updaterFn = setQueryDataMock.mock.calls[0][1]
    const oldData = {
      courses: [{ id: 'course-1' }, { id: 'course-2' }, { id: 'course-3' }],
      total: 3,
      page: 1,
      limit: 20,
    }
    const newData = updaterFn(oldData)
    
    expect(newData).toEqual({
      courses: [{ id: 'course-1' }, { id: 'course-3' }],
      total: 2,
      page: 1,
      limit: 20,
    })
  })

  it('should handle null old data in removeCourse', () => {
    const setQueryDataMock = jest.fn()
    queryClient.setQueryData = setQueryDataMock

    optimisticUpdates.removeCourse('course-2')
    
    const updaterFn = setQueryDataMock.mock.calls[0][1]
    expect(updaterFn(null)).toBeNull()
  })
})

describe('Background Sync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should enable background refetch for user', () => {
    backgroundSync.enableForUser()
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['auth', 'user'],
      type: 'active',
    })
  })

  it('should enable background refetch for active jobs', () => {
    backgroundSync.enableForActiveJobs()
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['jobs'],
      type: 'active',
      predicate: expect.any(Function),
    })
  })

  it('should filter active jobs by status', () => {
    backgroundSync.enableForActiveJobs()
    
    const call = (queryClient.invalidateQueries as jest.Mock).mock.calls[0][0]
    const predicateFn = call.predicate
    
    // Test predicate function
    const processingQuery = { state: { data: { status: 'processing' } } }
    const pendingQuery = { state: { data: { status: 'pending' } } }
    const completedQuery = { state: { data: { status: 'completed' } } }
    
    expect(predicateFn(processingQuery)).toBe(true)
    expect(predicateFn(pendingQuery)).toBe(true)
    expect(predicateFn(completedQuery)).toBe(false)
  })
})

describe('Error Recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should reset error queries', () => {
    errorRecovery.resetErrors()
    
    expect(queryClient.resetQueries).toHaveBeenCalledWith({
      predicate: expect.any(Function),
    })
  })

  it('should filter queries by error status', () => {
    errorRecovery.resetErrors()
    
    const call = (queryClient.resetQueries as jest.Mock).mock.calls[0][0]
    const predicateFn = call.predicate
    
    expect(predicateFn({ state: { status: 'error' } })).toBe(true)
    expect(predicateFn({ state: { status: 'success' } })).toBe(false)
  })

  it('should retry failed queries', () => {
    errorRecovery.retryFailedQueries()
    
    expect(queryClient.refetchQueries).toHaveBeenCalledWith({
      predicate: expect.any(Function),
    })
  })

  it('should filter failed queries for retry', () => {
    errorRecovery.retryFailedQueries()
    
    const call = (queryClient.refetchQueries as jest.Mock).mock.calls[0][0]
    const predicateFn = call.predicate
    
    expect(predicateFn({ state: { status: 'error' } })).toBe(true)
    expect(predicateFn({ state: { status: 'success' } })).toBe(false)
  })

  it('should perform hard refresh', () => {
    delete (window as any).location
    window.location = { reload: jest.fn() } as any
    
    errorRecovery.hardRefresh()
    
    expect(queryClient.clear).toHaveBeenCalled()
    expect(window.location.reload).toHaveBeenCalled()
  })
})

describe('Performance Monitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const mockQueries = [
        { 
          state: { dataUpdatedAt: Date.now() - 1000, status: 'success' },
          options: { staleTime: 5000 },
          isStale: () => false,
        },
        { 
          state: { dataUpdatedAt: Date.now() - 10000, status: 'success' },
          options: { staleTime: 5000 },
          isStale: () => true,
        },
        { 
          state: { status: 'error' },
          isStale: () => false,
        },
        { 
          state: { status: 'pending' },
          isStale: () => false,
        },
      ]

      const mockCache = {
        getAll: jest.fn().mockReturnValue(mockQueries),
      }
      queryClient.getQueryCache = jest.fn().mockReturnValue(mockCache)

      const stats = performanceMonitoring.getCacheStats()

      expect(stats).toEqual({
        totalQueries: 4,
        freshQueries: 1,
        staleQueries: 1,
        errorQueries: 1,
        loadingQueries: 1,
      })
    })

    it('should handle queries without staleTime', () => {
      const mockQueries = [
        { 
          state: { dataUpdatedAt: Date.now() - 1000, status: 'success' },
          options: {},
          isStale: () => false,
        },
      ]

      const mockCache = {
        getAll: jest.fn().mockReturnValue(mockQueries),
      }
      queryClient.getQueryCache = jest.fn().mockReturnValue(mockCache)

      const stats = performanceMonitoring.getCacheStats()

      expect(stats.freshQueries).toBe(0) // No staleTime means not fresh
    })
  })

  describe('getCacheSize', () => {
    it('should calculate cache size', () => {
      const mockQueries = [
        { state: { data: { id: 1, name: 'Test 1' } } },
        { state: { data: { id: 2, name: 'Test 2', description: 'A longer description' } } },
        { state: { data: null } },
        { state: {} },
      ]

      const mockCache = {
        getAll: jest.fn().mockReturnValue(mockQueries),
      }
      queryClient.getQueryCache = jest.fn().mockReturnValue(mockCache)

      const size = performanceMonitoring.getCacheSize()

      expect(size).toMatchObject({
        estimatedSizeBytes: expect.any(Number),
        estimatedSizeMB: expect.any(String),
        queryCount: 4,
      })
      expect(size.estimatedSizeBytes).toBeGreaterThan(0)
    })

    it('should handle empty cache', () => {
      const mockCache = {
        getAll: jest.fn().mockReturnValue([]),
      }
      queryClient.getQueryCache = jest.fn().mockReturnValue(mockCache)

      const size = performanceMonitoring.getCacheSize()

      expect(size).toEqual({
        estimatedSizeBytes: 0,
        estimatedSizeMB: '0.00',
        queryCount: 0,
      })
    })
  })
})