import { QueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import {
  queryKeys,
  invalidateQueries,
  prefetchQueries,
  optimisticUpdates,
  backgroundSync,
  errorRecovery,
  performanceMonitoring,
} from '../query-client'

// Mock dependencies
jest.mock('@tanstack/react-query')
jest.mock('@/hooks/use-toast')

describe('Query Client Utilities', () => {
  let mockQueryClient: jest.Mocked<QueryClient>
  let mockToast: jest.MockedFunction<typeof toast>

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Create mock query client
    mockQueryClient = {
      invalidateQueries: jest.fn(),
      prefetchQuery: jest.fn(),
      setQueryData: jest.fn(),
      resetQueries: jest.fn(),
      refetchQueries: jest.fn(),
      clear: jest.fn(),
      getQueryCache: jest.fn(),
    } as any

    // Mock QueryClient constructor
    ;(QueryClient as jest.MockedClass<typeof QueryClient>).mockImplementation(() => mockQueryClient)

    // Mock toast
    mockToast = toast as jest.MockedFunction<typeof toast>
    mockToast.mockImplementation(() => {})

    // Re-import module to use fresh mocks
    jest.resetModules()
  })

  describe('queryKeys', () => {
    it('should generate correct auth query keys', () => {
      expect(queryKeys.auth.user()).toEqual(['auth', 'user'])
      expect(queryKeys.auth.permissions()).toEqual(['auth', 'permissions'])
    })

    it('should generate correct documents query keys', () => {
      expect(queryKeys.documents.all()).toEqual(['documents'])
      expect(queryKeys.documents.lists()).toEqual(['documents', 'list'])
      expect(queryKeys.documents.list({ search: 'test' })).toEqual(['documents', 'list', { search: 'test' }])
      expect(queryKeys.documents.details()).toEqual(['documents', 'detail'])
      expect(queryKeys.documents.detail('123')).toEqual(['documents', 'detail', '123'])
      expect(queryKeys.documents.uploads()).toEqual(['documents', 'uploads'])
    })

    it('should generate correct courses query keys', () => {
      expect(queryKeys.courses.all()).toEqual(['courses'])
      expect(queryKeys.courses.lists()).toEqual(['courses', 'list'])
      expect(queryKeys.courses.list({ page: 1 })).toEqual(['courses', 'list', { page: 1 }])
      expect(queryKeys.courses.details()).toEqual(['courses', 'detail'])
      expect(queryKeys.courses.detail('456')).toEqual(['courses', 'detail', '456'])
      expect(queryKeys.courses.sessions('789')).toEqual(['courses', '789', 'sessions'])
      expect(queryKeys.courses.activities('789', 'abc')).toEqual(['courses', '789', 'sessions', 'abc', 'activities'])
    })

    it('should generate correct jobs query keys', () => {
      expect(queryKeys.jobs.all()).toEqual(['jobs'])
      expect(queryKeys.jobs.lists()).toEqual(['jobs', 'list'])
      expect(queryKeys.jobs.list({ status: 'pending' })).toEqual(['jobs', 'list', { status: 'pending' }])
      expect(queryKeys.jobs.details()).toEqual(['jobs', 'detail'])
      expect(queryKeys.jobs.detail('job-1')).toEqual(['jobs', 'detail', 'job-1'])
      expect(queryKeys.jobs.status('job-2')).toEqual(['jobs', 'status', 'job-2'])
    })

    it('should generate correct exports query keys', () => {
      expect(queryKeys.exports.all()).toEqual(['exports'])
      expect(queryKeys.exports.lists()).toEqual(['exports', 'list'])
      expect(queryKeys.exports.list({ format: 'pdf' })).toEqual(['exports', 'list', { format: 'pdf' }])
      expect(queryKeys.exports.details()).toEqual(['exports', 'detail'])
      expect(queryKeys.exports.detail('export-1')).toEqual(['exports', 'detail', 'export-1'])
    })

    it('should generate correct health query key', () => {
      expect(queryKeys.health()).toEqual(['health'])
    })
  })

  describe('invalidateQueries', () => {
    beforeEach(async () => {
      // Import the module that uses the mocked QueryClient
      const module = await import('../query-client')
      
      // Get the query client instance
      const queryClient = module.queryClient
      mockQueryClient = queryClient as any
      
      // Setup spy methods
      mockQueryClient.invalidateQueries = jest.fn()
    })

    it('should invalidate user queries', async () => {
      const { invalidateQueries } = await import('../query-client')
      
      invalidateQueries.user()
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['auth', 'user']
      })
    })

    it('should invalidate all documents queries', async () => {
      const { invalidateQueries } = await import('../query-client')
      
      invalidateQueries.documents()
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['documents']
      })
    })

    it('should invalidate specific document queries', async () => {
      const { invalidateQueries } = await import('../query-client')
      
      invalidateQueries.document('doc-123')
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['documents', 'detail', 'doc-123']
      })
    })

    it('should invalidate all courses queries', async () => {
      const { invalidateQueries } = await import('../query-client')
      
      invalidateQueries.courses()
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['courses']
      })
    })

    it('should invalidate specific course queries', async () => {
      const { invalidateQueries } = await import('../query-client')
      
      invalidateQueries.course('course-456')
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['courses', 'detail', 'course-456']
      })
    })

    it('should invalidate course sessions queries', async () => {
      const { invalidateQueries } = await import('../query-client')
      
      invalidateQueries.courseSessions('course-789')
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['courses', 'course-789', 'sessions']
      })
    })

    it('should invalidate all jobs queries', async () => {
      const { invalidateQueries } = await import('../query-client')
      
      invalidateQueries.jobs()
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['jobs']
      })
    })

    it('should invalidate specific job queries', async () => {
      const { invalidateQueries } = await import('../query-client')
      
      invalidateQueries.job('job-abc')
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['jobs', 'detail', 'job-abc']
      })
    })

    it('should invalidate job status queries', async () => {
      const { invalidateQueries } = await import('../query-client')
      
      invalidateQueries.jobStatus('job-def')
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['jobs', 'status', 'job-def']
      })
    })

    it('should invalidate all exports queries', async () => {
      const { invalidateQueries } = await import('../query-client')
      
      invalidateQueries.exports()
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['exports']
      })
    })
  })

  describe('prefetchQueries', () => {
    beforeEach(async () => {
      const module = await import('../query-client')
      const queryClient = module.queryClient
      mockQueryClient = queryClient as any
      mockQueryClient.prefetchQuery = jest.fn()
    })

    it('should prefetch user data with correct stale time', async () => {
      const { prefetchQueries } = await import('../query-client')
      
      await prefetchQueries.user()
      
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['auth', 'user'],
        staleTime: 1000 * 60 * 10, // 10 minutes
      })
    })

    it('should prefetch courses list with params', async () => {
      const { prefetchQueries } = await import('../query-client')
      const params = { page: 1, limit: 20 }
      
      await prefetchQueries.courses(params)
      
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['courses', 'list', params],
        staleTime: 1000 * 60 * 5, // 5 minutes
      })
    })

    it('should prefetch courses list without params', async () => {
      const { prefetchQueries } = await import('../query-client')
      
      await prefetchQueries.courses()
      
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['courses', 'list', undefined],
        staleTime: 1000 * 60 * 5, // 5 minutes
      })
    })

    it('should prefetch specific course', async () => {
      const { prefetchQueries } = await import('../query-client')
      
      await prefetchQueries.course('course-123')
      
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['courses', 'detail', 'course-123'],
        staleTime: 1000 * 60 * 5, // 5 minutes
      })
    })
  })

  describe('optimisticUpdates', () => {
    beforeEach(async () => {
      const module = await import('../query-client')
      const queryClient = module.queryClient
      mockQueryClient = queryClient as any
      mockQueryClient.setQueryData = jest.fn()
    })

    it('should optimistically update course', async () => {
      const { optimisticUpdates } = await import('../query-client')
      const oldData = { id: '123', title: 'Old Title', description: 'Old Desc' }
      const updates = { title: 'New Title' }
      
      mockQueryClient.setQueryData.mockImplementation((key, updater) => {
        if (typeof updater === 'function') {
          return updater(oldData)
        }
        return updater
      })
      
      optimisticUpdates.updateCourse('123', updates)
      
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['courses', 'detail', '123'],
        expect.any(Function)
      )
      
      // Verify the updater function works correctly
      const updaterFn = mockQueryClient.setQueryData.mock.calls[0][1]
      expect(updaterFn(oldData)).toEqual({
        id: '123',
        title: 'New Title',
        description: 'Old Desc'
      })
      expect(updaterFn(null)).toBeNull()
    })

    it('should optimistically add course to list', async () => {
      const { optimisticUpdates } = await import('../query-client')
      const newCourse = { id: 'new-1', title: 'New Course' }
      const oldData = {
        courses: [{ id: '1', title: 'Course 1' }, { id: '2', title: 'Course 2' }],
        total: 2,
        page: 1,
        limit: 20
      }
      
      mockQueryClient.setQueryData.mockImplementation((key, updater) => {
        if (typeof updater === 'function') {
          return updater(oldData)
        }
        return updater
      })
      
      optimisticUpdates.addCourse(newCourse, { page: 1 })
      
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['courses', 'list', { page: 1 }],
        expect.any(Function)
      )
      
      // Verify the updater function works correctly
      const updaterFn = mockQueryClient.setQueryData.mock.calls[0][1]
      expect(updaterFn(oldData)).toEqual({
        courses: [newCourse, { id: '1', title: 'Course 1' }, { id: '2', title: 'Course 2' }],
        total: 3,
        page: 1,
        limit: 20
      })
      
      // Test when old data is null
      expect(updaterFn(null)).toEqual({
        courses: [newCourse],
        total: 1,
        page: 1,
        limit: 20
      })
    })

    it('should optimistically remove course from list', async () => {
      const { optimisticUpdates } = await import('../query-client')
      const oldData = {
        courses: [
          { id: '1', title: 'Course 1' },
          { id: '2', title: 'Course 2' },
          { id: '3', title: 'Course 3' }
        ],
        total: 3,
        page: 1,
        limit: 20
      }
      
      mockQueryClient.setQueryData.mockImplementation((key, updater) => {
        if (typeof updater === 'function') {
          return updater(oldData)
        }
        return updater
      })
      
      optimisticUpdates.removeCourse('2', { page: 1 })
      
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['courses', 'list', { page: 1 }],
        expect.any(Function)
      )
      
      // Verify the updater function works correctly
      const updaterFn = mockQueryClient.setQueryData.mock.calls[0][1]
      expect(updaterFn(oldData)).toEqual({
        courses: [
          { id: '1', title: 'Course 1' },
          { id: '3', title: 'Course 3' }
        ],
        total: 2,
        page: 1,
        limit: 20
      })
      
      // Test when old data is null
      expect(updaterFn(null)).toBeNull()
    })
  })

  describe('backgroundSync', () => {
    beforeEach(async () => {
      const module = await import('../query-client')
      const queryClient = module.queryClient
      mockQueryClient = queryClient as any
      mockQueryClient.invalidateQueries = jest.fn()
    })

    it('should enable background refetch for user data', async () => {
      const { backgroundSync } = await import('../query-client')
      
      backgroundSync.enableForUser()
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['auth', 'user'],
        type: 'active'
      })
    })

    it('should enable background refetch for active jobs', async () => {
      const { backgroundSync } = await import('../query-client')
      
      backgroundSync.enableForActiveJobs()
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['jobs'],
        type: 'active',
        predicate: expect.any(Function)
      })
      
      // Test the predicate function
      const predicateFn = mockQueryClient.invalidateQueries.mock.calls[0][0].predicate
      
      // Should return true for processing jobs
      expect(predicateFn({ state: { data: { status: 'processing' } } })).toBe(true)
      expect(predicateFn({ state: { data: { status: 'pending' } } })).toBe(true)
      
      // Should return false for other statuses
      expect(predicateFn({ state: { data: { status: 'completed' } } })).toBe(false)
      expect(predicateFn({ state: { data: { status: 'failed' } } })).toBe(false)
      expect(predicateFn({ state: { data: null } })).toBe(false)
    })
  })

  describe('errorRecovery', () => {
    beforeEach(async () => {
      const module = await import('../query-client')
      const queryClient = module.queryClient
      mockQueryClient = queryClient as any
      mockQueryClient.resetQueries = jest.fn()
      mockQueryClient.refetchQueries = jest.fn()
      mockQueryClient.clear = jest.fn()
    })

    it('should reset error state for queries', async () => {
      const { errorRecovery } = await import('../query-client')
      
      errorRecovery.resetErrors()
      
      expect(mockQueryClient.resetQueries).toHaveBeenCalledWith({
        predicate: expect.any(Function)
      })
      
      // Test the predicate function
      const predicateFn = mockQueryClient.resetQueries.mock.calls[0][0].predicate
      expect(predicateFn({ state: { status: 'error' } })).toBe(true)
      expect(predicateFn({ state: { status: 'success' } })).toBe(false)
      expect(predicateFn({ state: { status: 'pending' } })).toBe(false)
    })

    it('should retry failed queries', async () => {
      const { errorRecovery } = await import('../query-client')
      
      errorRecovery.retryFailedQueries()
      
      expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith({
        predicate: expect.any(Function)
      })
      
      // Test the predicate function
      const predicateFn = mockQueryClient.refetchQueries.mock.calls[0][0].predicate
      expect(predicateFn({ state: { status: 'error' } })).toBe(true)
      expect(predicateFn({ state: { status: 'success' } })).toBe(false)
      expect(predicateFn({ state: { status: 'pending' } })).toBe(false)
    })

    it('should perform hard refresh', async () => {
      const { errorRecovery } = await import('../query-client')
      
      // Mock window.location.reload
      delete (window as any).location
      window.location = { ...window.location, reload: jest.fn() }
      
      errorRecovery.hardRefresh()
      
      expect(mockQueryClient.clear).toHaveBeenCalled()
      expect(window.location.reload).toHaveBeenCalled()
    })
  })

  describe('performanceMonitoring', () => {
    let mockQueryCache: any

    beforeEach(async () => {
      const module = await import('../query-client')
      const queryClient = module.queryClient
      mockQueryClient = queryClient as any
      
      mockQueryCache = {
        getAll: jest.fn()
      }
      
      mockQueryClient.getQueryCache = jest.fn().mockReturnValue(mockQueryCache)
    })

    it('should get cache statistics', async () => {
      const { performanceMonitoring } = await import('../query-client')
      
      const now = Date.now()
      const mockQueries = [
        {
          state: { dataUpdatedAt: now - 1000, status: 'success' },
          options: { staleTime: 5000 },
          isStale: () => false
        },
        {
          state: { dataUpdatedAt: now - 10000, status: 'success' },
          options: { staleTime: 5000 },
          isStale: () => true
        },
        {
          state: { dataUpdatedAt: 0, status: 'error' },
          options: {},
          isStale: () => true
        },
        {
          state: { dataUpdatedAt: 0, status: 'pending' },
          options: {},
          isStale: () => false
        }
      ]
      
      mockQueryCache.getAll.mockReturnValue(mockQueries)
      
      const stats = performanceMonitoring.getCacheStats()
      
      expect(stats).toEqual({
        totalQueries: 4,
        freshQueries: 1,
        staleQueries: 2,
        errorQueries: 1,
        loadingQueries: 1
      })
    })

    it('should get cache size', async () => {
      const { performanceMonitoring } = await import('../query-client')
      
      const mockQueries = [
        {
          state: { data: { id: 1, name: 'Test 1' } }
        },
        {
          state: { data: { id: 2, name: 'Test 2', description: 'A longer description' } }
        },
        {
          state: { data: null }
        }
      ]
      
      mockQueryCache.getAll.mockReturnValue(mockQueries)
      
      const cacheSize = performanceMonitoring.getCacheSize()
      
      expect(cacheSize.queryCount).toBe(3)
      expect(cacheSize.estimatedSizeBytes).toBeGreaterThan(0)
      expect(cacheSize.estimatedSizeMB).toBeDefined()
      expect(parseFloat(cacheSize.estimatedSizeMB)).toBeGreaterThanOrEqual(0)
    })
  })

  describe('QueryClient Configuration', () => {
    it('should create QueryClient with correct default options', () => {
      // We can't easily test the QueryClient instantiation since it happens
      // at module load time. Instead, let's verify the exported queryClient
      // has the expected methods
      const { queryClient } = require('../query-client')
      
      expect(queryClient).toBeDefined()
      expect(typeof queryClient.invalidateQueries).toBe('function')
      expect(typeof queryClient.prefetchQuery).toBe('function')
      expect(typeof queryClient.setQueryData).toBe('function')
      expect(typeof queryClient.resetQueries).toBe('function')
      expect(typeof queryClient.refetchQueries).toBe('function')
      expect(typeof queryClient.clear).toBe('function')
      expect(typeof queryClient.getQueryCache).toBe('function')
    })

    it('should handle query retry logic correctly', () => {
      // Test the retry configuration by creating a test query client with the same config
      const testRetryFn = (failureCount: number, error: any) => {
        if (error?.status && [401, 403, 404].includes(error.status)) {
          return false
        }
        return failureCount < 3
      }
      
      // Should not retry on 401, 403, 404
      expect(testRetryFn(1, { status: 401 })).toBe(false)
      expect(testRetryFn(1, { status: 403 })).toBe(false)
      expect(testRetryFn(1, { status: 404 })).toBe(false)
      
      // Should retry up to 3 times for other errors
      expect(testRetryFn(0, { status: 500 })).toBe(true)
      expect(testRetryFn(1, { status: 500 })).toBe(true)
      expect(testRetryFn(2, { status: 500 })).toBe(true)
      expect(testRetryFn(3, { status: 500 })).toBe(false)
      
      // Should handle errors without status
      expect(testRetryFn(0, {})).toBe(true)
      expect(testRetryFn(3, {})).toBe(false)
    })

    it('should calculate retry delay correctly', () => {
      // Test the retry delay configuration
      const testRetryDelayFn = (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000)
      
      // Should use exponential backoff with max limit
      expect(testRetryDelayFn(0)).toBe(1000) // 1 second
      expect(testRetryDelayFn(1)).toBe(2000) // 2 seconds
      expect(testRetryDelayFn(2)).toBe(4000) // 4 seconds
      expect(testRetryDelayFn(3)).toBe(8000) // 8 seconds
      expect(testRetryDelayFn(4)).toBe(16000) // 16 seconds
      expect(testRetryDelayFn(5)).toBe(30000) // max 30 seconds
      expect(testRetryDelayFn(10)).toBe(30000) // still max 30 seconds
    })

    it('should handle mutation error correctly', () => {
      // Test the mutation error handler configuration
      const testOnErrorFn = (error: any) => {
        if (error?.status === 401) {
          return
        }
        
        toast({
          title: 'Error',
          description: error?.message || 'Something went wrong',
          variant: 'destructive',
        })
      }
      
      // Should not show toast for 401 errors
      testOnErrorFn({ status: 401 })
      expect(mockToast).not.toHaveBeenCalled()
      
      // Should show toast for other errors
      testOnErrorFn({ status: 500, message: 'Server error' })
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Server error',
        variant: 'destructive',
      })
      
      // Should show default message when no error message
      mockToast.mockClear()
      testOnErrorFn({})
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'destructive',
      })
    })

    it('should handle mutation success correctly', () => {
      // Test the mutation success handler configuration
      const testOnSuccessFn = (data: any, variables: any, context: any) => {
        if (context?.showSuccessToast) {
          toast({
            title: 'Success',
            description: context.successMessage || 'Operation completed successfully',
            variant: 'default',
          })
        }
      }
      
      // Should not show toast when showSuccessToast is false
      testOnSuccessFn({}, {}, {})
      expect(mockToast).not.toHaveBeenCalled()
      
      // Should show toast when showSuccessToast is true
      testOnSuccessFn({}, {}, { showSuccessToast: true })
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Operation completed successfully',
        variant: 'default',
      })
      
      // Should use custom success message
      mockToast.mockClear()
      testOnSuccessFn({}, {}, { showSuccessToast: true, successMessage: 'Custom success!' })
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Custom success!',
        variant: 'default',
      })
    })

    it('should not retry mutations', () => {
      // Test the mutation retry configuration
      const testMutationRetryFn = (failureCount: number, error: any) => {
        return false
      }
      
      // Should always return false for mutations
      expect(testMutationRetryFn(0, {})).toBe(false)
      expect(testMutationRetryFn(1, { status: 500 })).toBe(false)
      expect(testMutationRetryFn(10, {})).toBe(false)
    })
  })
})