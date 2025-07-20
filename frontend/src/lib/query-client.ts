import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { toast } from '@/hooks/use-toast'

// Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache time: how long data stays in cache when unused
      gcTime: 1000 * 60 * 30, // 30 minutes
      
      // Stale time: how long data is considered fresh
      staleTime: 1000 * 60 * 5, // 5 minutes
      
      // Background refetch settings
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 401, 403, 404
        if (error?.status && [401, 403, 404].includes(error.status)) {
          return false
        }
        
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
      
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    
    mutations: {
      // Global error handling for mutations
      onError: (error: any) => {
        // Don't show toast for specific errors
        if (error?.status === 401) {
          return
        }
        
        toast({
          title: 'Error',
          description: error?.message || 'Something went wrong',
          variant: 'destructive',
        })
      },
      
      // Global success handling for mutations
      onSuccess: (data: any, variables: any, context: any) => {
        // Show success toast for certain operations
        if (context?.showSuccessToast) {
          toast({
            title: 'Success',
            description: context.successMessage || 'Operation completed successfully',
            variant: 'default',
          })
        }
      },
      
      // Retry configuration for mutations
      retry: (failureCount, error: any) => {
        // Generally don't retry mutations automatically
        // Let the user decide to retry
        return false
      },
    },
  },
})

// Query keys factory
export const queryKeys = {
  // Authentication
  auth: {
    user: () => ['auth', 'user'] as const,
    permissions: () => ['auth', 'permissions'] as const,
  },
  
  // Documents
  documents: {
    all: () => ['documents'] as const,
    lists: () => ['documents', 'list'] as const,
    list: (params?: any) => ['documents', 'list', params] as const,
    details: () => ['documents', 'detail'] as const,
    detail: (id: string) => ['documents', 'detail', id] as const,
    uploads: () => ['documents', 'uploads'] as const,
  },
  
  // Courses
  courses: {
    all: () => ['courses'] as const,
    lists: () => ['courses', 'list'] as const,
    list: (params?: any) => ['courses', 'list', params] as const,
    details: () => ['courses', 'detail'] as const,
    detail: (id: string) => ['courses', 'detail', id] as const,
    sessions: (courseId: string) => ['courses', courseId, 'sessions'] as const,
    activities: (courseId: string, sessionId: string) => 
      ['courses', courseId, 'sessions', sessionId, 'activities'] as const,
  },
  
  // Jobs and Generation
  jobs: {
    all: () => ['jobs'] as const,
    lists: () => ['jobs', 'list'] as const,
    list: (params?: any) => ['jobs', 'list', params] as const,
    details: () => ['jobs', 'detail'] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
    status: (id: string) => ['jobs', 'status', id] as const,
  },
  
  // Exports
  exports: {
    all: () => ['exports'] as const,
    lists: () => ['exports', 'list'] as const,
    list: (params?: any) => ['exports', 'list', params] as const,
    details: () => ['exports', 'detail'] as const,
    detail: (id: string) => ['exports', 'detail', id] as const,
  },
  
  // Health
  health: () => ['health'] as const,
}

// Cache invalidation utilities
export const invalidateQueries = {
  // Invalidate all user data
  user: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() })
  },
  
  // Invalidate all documents
  documents: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.documents.all() })
  },
  
  // Invalidate specific document
  document: (id: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(id) })
  },
  
  // Invalidate all courses
  courses: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() })
  },
  
  // Invalidate specific course
  course: (id: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(id) })
  },
  
  // Invalidate course sessions
  courseSessions: (courseId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.courses.sessions(courseId) })
  },
  
  // Invalidate all jobs
  jobs: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() })
  },
  
  // Invalidate specific job
  job: (id: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(id) })
  },
  
  // Invalidate job status
  jobStatus: (id: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.status(id) })
  },
  
  // Invalidate all exports
  exports: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.exports.all() })
  },
}

// Prefetch utilities
export const prefetchQueries = {
  // Prefetch user data
  user: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.auth.user(),
      staleTime: 1000 * 60 * 10, // 10 minutes
    })
  },
  
  // Prefetch courses list
  courses: async (params?: any) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.courses.list(params),
      staleTime: 1000 * 60 * 5, // 5 minutes
    })
  },
  
  // Prefetch specific course
  course: async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.courses.detail(id),
      staleTime: 1000 * 60 * 5, // 5 minutes
    })
  },
}

// Optimistic update utilities
export const optimisticUpdates = {
  // Optimistically update course
  updateCourse: (id: string, updates: any) => {
    queryClient.setQueryData(queryKeys.courses.detail(id), (old: any) => {
      if (!old) return old
      return { ...old, ...updates }
    })
  },
  
  // Optimistically add course to list
  addCourse: (course: any, params?: any) => {
    queryClient.setQueryData(queryKeys.courses.list(params), (old: any) => {
      if (!old) return { courses: [course], total: 1, page: 1, limit: 20 }
      return {
        ...old,
        courses: [course, ...old.courses],
        total: old.total + 1,
      }
    })
  },
  
  // Optimistically remove course from list
  removeCourse: (id: string, params?: any) => {
    queryClient.setQueryData(queryKeys.courses.list(params), (old: any) => {
      if (!old) return old
      return {
        ...old,
        courses: old.courses.filter((course: any) => course.id !== id),
        total: old.total - 1,
      }
    })
  },
}

// Background sync utilities
export const backgroundSync = {
  // Enable background refetch for critical data
  enableForUser: () => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.auth.user(),
      type: 'active' 
    })
  },
  
  // Enable background refetch for active jobs
  enableForActiveJobs: () => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.jobs.all(),
      type: 'active',
      predicate: (query) => {
        // Only refetch jobs that are in progress
        const data = query.state.data as any
        return data?.status === 'processing' || data?.status === 'pending'
      }
    })
  },
}

// Error recovery utilities
export const errorRecovery = {
  // Reset error state for queries
  resetErrors: () => {
    queryClient.resetQueries({
      predicate: (query) => query.state.status === 'error'
    })
  },
  
  // Retry failed queries
  retryFailedQueries: () => {
    queryClient.refetchQueries({
      predicate: (query) => query.state.status === 'error'
    })
  },
  
  // Clear all cache and refetch
  hardRefresh: () => {
    queryClient.clear()
    window.location.reload()
  },
}

// Performance monitoring
export const performanceMonitoring = {
  // Get cache statistics
  getCacheStats: () => {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()
    
    return {
      totalQueries: queries.length,
      freshQueries: queries.filter(q => q.state.dataUpdatedAt > Date.now() - (q.options.staleTime || 0)).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      loadingQueries: queries.filter(q => q.state.status === 'pending').length,
    }
  },
  
  // Monitor cache size
  getCacheSize: () => {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()
    
    let totalSize = 0
    queries.forEach(query => {
      if (query.state.data) {
        // Rough estimate of data size
        totalSize += JSON.stringify(query.state.data).length
      }
    })
    
    return {
      estimatedSizeBytes: totalSize,
      estimatedSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      queryCount: queries.length,
    }
  },
}

export { queryClient }
export default queryClient