'use client'

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/endpoints'
import { queryKeys, invalidateQueries, optimisticUpdates } from '@/lib/query-client'
import { useAuthStore } from '@/lib/store/auth-store'
import { useCourseStore } from '@/lib/store/course-store'
import { useGenerationStore } from '@/lib/store/generation-store'
import { useUIStore } from '@/lib/store/ui-store'
import { toast } from '@/hooks/use-toast'
import type {
  User,
  Course,
  Document,
  GenerationJob,
  LoginCredentials,
  RegisterData,
  CourseConfig,
  CourseUpdateData,
  ExportOptions,
} from '@/types'

// =============================================================================
// AUTHENTICATION HOOKS
// =============================================================================

export function useUser() {
  const { user, isAuthenticated } = useAuthStore()
  
  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: api.auth.me,
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
    initialData: user,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  const { login } = useAuthStore()
  
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => api.auth.login(credentials),
    onSuccess: (data) => {
      login(data.user, data.token, data.refreshToken)
      queryClient.setQueryData(queryKeys.auth.user(), data.user)
      
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${data.user.name}`,
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive',
      })
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  const { login } = useAuthStore()
  
  return useMutation({
    mutationFn: (data: RegisterData) => api.auth.register(data),
    onSuccess: (data) => {
      login(data.user, data.token, data.refreshToken)
      queryClient.setQueryData(queryKeys.auth.user(), data.user)
      
      toast({
        title: 'Welcome to AI Course Creator!',
        description: 'Your account has been created successfully',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Registration failed',
        description: error.message || 'Unable to create account',
        variant: 'destructive',
      })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const { logout } = useAuthStore()
  
  return useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => {
      logout()
      queryClient.clear()
      
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      })
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api.auth.forgotPassword(email),
    onSuccess: () => {
      toast({
        title: 'Password reset sent',
        description: 'Check your email for password reset instructions',
      })
    },
  })
}

// =============================================================================
// DOCUMENT HOOKS
// =============================================================================

export function useDocuments(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: queryKeys.documents.list(params),
    queryFn: () => api.documents.list(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: queryKeys.documents.detail(id),
    queryFn: () => api.documents.get(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: ({ 
      file, 
      onProgress 
    }: { 
      file: File; 
      onProgress?: (progress: number) => void 
    }) => api.documents.upload(file, onProgress),
    
    onSuccess: (document, { file }) => {
      invalidateQueries.documents()
      
      addNotification({
        type: 'success',
        title: 'Upload successful',
        message: `${file.name} has been uploaded and is being processed`,
      })
    },
    
    onError: (error: any, { file }) => {
      addNotification({
        type: 'error',
        title: 'Upload failed',
        message: `Failed to upload ${file.name}: ${error.message}`,
      })
    },
  })
}

export function useUploadMultipleDocuments() {
  const queryClient = useQueryClient()
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: ({ 
      files, 
      onProgress 
    }: { 
      files: File[]; 
      onProgress?: (progress: number) => void 
    }) => api.documents.uploadMultiple(files, onProgress),
    
    onSuccess: (documents, { files }) => {
      invalidateQueries.documents()
      
      addNotification({
        type: 'success',
        title: 'Upload successful',
        message: `${files.length} files uploaded successfully`,
      })
    },
    
    onError: (error: any, { files }) => {
      addNotification({
        type: 'error',
        title: 'Upload failed',
        message: `Failed to upload files: ${error.message}`,
      })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: (id: string) => api.documents.delete(id),
    onSuccess: () => {
      invalidateQueries.documents()
      
      addNotification({
        type: 'success',
        title: 'Document deleted',
        message: 'Document has been deleted successfully',
      })
    },
  })
}

// =============================================================================
// COURSE HOOKS
// =============================================================================

export function useCourses(params?: { page?: number; limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.courses.list(params),
    queryFn: () => api.courses.list(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useInfiniteCourses(params?: { limit?: number; search?: string; status?: string }) {
  return useInfiniteQuery({
    queryKey: ['courses', 'infinite', params],
    queryFn: ({ pageParam = 1 }) => 
      api.courses.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const hasNextPage = lastPage.courses.length === (params?.limit || 20)
      return hasNextPage ? allPages.length + 1 : undefined
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useCourse(id: string) {
  const { setCurrentCourse } = useCourseStore()
  
  return useQuery({
    queryKey: queryKeys.courses.detail(id),
    queryFn: async () => {
      const course = await api.courses.get(id)
      setCurrentCourse(course)
      return course
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()
  const { addCourse } = useCourseStore()
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: (data: Partial<Course>) => api.courses.create(data),
    onMutate: async (newCourse) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.courses.lists() })
      
      const tempCourse = {
        ...newCourse,
        id: `temp_${Date.now()}`,
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      optimisticUpdates.addCourse(tempCourse)
      return { tempCourse }
    },
    onSuccess: (course, _, context) => {
      addCourse(course)
      invalidateQueries.courses()
      
      addNotification({
        type: 'success',
        title: 'Course created',
        message: `"${course.title}" has been created successfully`,
      })
    },
    onError: (error, _, context) => {
      // Revert optimistic update
      if (context?.tempCourse) {
        optimisticUpdates.removeCourse(context.tempCourse.id)
      }
      
      addNotification({
        type: 'error',
        title: 'Failed to create course',
        message: error.message || 'Unable to create course',
      })
    },
  })
}

export function useUpdateCourse() {
  const queryClient = useQueryClient()
  const { updateCourse } = useCourseStore()
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CourseUpdateData }) => 
      api.courses.update(id, data),
    
    onMutate: async ({ id, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.courses.detail(id) })
      
      const previousCourse = queryClient.getQueryData(queryKeys.courses.detail(id))
      optimisticUpdates.updateCourse(id, data)
      
      return { previousCourse }
    },
    
    onSuccess: (course, { id }) => {
      updateCourse(id, course)
      invalidateQueries.course(id)
      
      addNotification({
        type: 'success',
        title: 'Course updated',
        message: 'Your changes have been saved',
      })
    },
    
    onError: (error, { id }, context) => {
      // Revert optimistic update
      if (context?.previousCourse) {
        queryClient.setQueryData(queryKeys.courses.detail(id), context.previousCourse)
      }
      
      addNotification({
        type: 'error',
        title: 'Failed to update course',
        message: error.message || 'Unable to save changes',
      })
    },
  })
}

export function useDeleteCourse() {
  const queryClient = useQueryClient()
  const { deleteCourse } = useCourseStore()
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: (id: string) => api.courses.delete(id),
    onSuccess: (_, id) => {
      deleteCourse(id)
      invalidateQueries.courses()
      
      addNotification({
        type: 'success',
        title: 'Course deleted',
        message: 'Course has been deleted successfully',
      })
    },
  })
}

export function useUploadCourseResources() {
  const queryClient = useQueryClient()
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: ({ 
      courseId, 
      files, 
      onProgress 
    }: { 
      courseId: string; 
      files: File[]; 
      onProgress?: (progress: number) => void 
    }) => api.courses.uploadResources(courseId, files, onProgress),
    
    onSuccess: (_, { courseId }) => {
      invalidateQueries.course(courseId)
      
      addNotification({
        type: 'success',
        title: 'Resources uploaded',
        message: 'Course resources have been uploaded successfully',
      })
    },
  })
}

export function useAddUrlToCourse() {
  const queryClient = useQueryClient()
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: ({ courseId, url }: { courseId: string; url: string }) => 
      api.courses.addUrl(courseId, url),
    
    onSuccess: (_, { courseId }) => {
      invalidateQueries.course(courseId)
      
      addNotification({
        type: 'success',
        title: 'URL added',
        message: 'Web resource has been added to the course',
      })
    },
  })
}

// =============================================================================
// GENERATION HOOKS
// =============================================================================

export function useGenerateCourse() {
  const { startGeneration } = useGenerationStore()
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: ({ documentIds, config }: { documentIds: string[]; config: CourseConfig }) =>
      api.generation.generateCourse(documentIds, config),
    
    onSuccess: ({ jobId, courseId }) => {
      startGeneration(jobId, courseId)
      
      addNotification({
        type: 'info',
        title: 'Course generation started',
        message: 'Your course is being generated. You can track progress in the dashboard.',
        duration: 0, // Don't auto-dismiss
      })
    },
  })
}

export function useGenerateCourseContent() {
  const { startGeneration } = useGenerationStore()
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: ({ courseId, config }: { courseId: string; config: CourseConfig }) =>
      api.generation.generateContent(courseId, config),
    
    onSuccess: ({ jobId }, { courseId }) => {
      startGeneration(jobId, courseId)
      
      addNotification({
        type: 'info',
        title: 'Content generation started',
        message: 'Course content is being generated. Track progress in the generation panel.',
        duration: 0,
      })
    },
  })
}

export function useJobStatus(jobId: string, options?: { 
  enabled?: boolean; 
  refetchInterval?: number 
}) {
  const { updateGeneration } = useGenerationStore()
  
  return useQuery({
    queryKey: queryKeys.jobs.status(jobId),
    queryFn: () => api.generation.getJobStatus(jobId),
    enabled: !!jobId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval || 2000,
    onSuccess: (job) => {
      updateGeneration(jobId, { progress: job.progress })
    },
  })
}

export function useCancelJob() {
  const { cancelGeneration } = useGenerationStore()
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: (jobId: string) => api.generation.cancelJob(jobId),
    onSuccess: (_, jobId) => {
      cancelGeneration(jobId)
      
      addNotification({
        type: 'info',
        title: 'Job cancelled',
        message: 'Generation job has been cancelled',
      })
    },
  })
}

export function useJobs(params?: { page?: number; limit?: number; status?: string; type?: string }) {
  return useQuery({
    queryKey: queryKeys.jobs.list(params),
    queryFn: () => api.jobs.list(params),
    staleTime: 1000 * 60 * 1, // 1 minute
  })
}

// =============================================================================
// EXPORT HOOKS
// =============================================================================

export function useExportCourse() {
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: ({ 
      courseId, 
      format, 
      options 
    }: { 
      courseId: string; 
      format: 'html' | 'pdf' | 'powerpoint'; 
      options?: ExportOptions 
    }) => {
      switch (format) {
        case 'html':
          return api.export.html(courseId, options)
        case 'pdf':
          return api.export.pdf(courseId, options)
        case 'powerpoint':
          return api.export.powerpoint(courseId, options)
        default:
          throw new Error(`Unsupported format: ${format}`)
      }
    },
    
    onSuccess: ({ jobId }, { format }) => {
      addNotification({
        type: 'info',
        title: `${format.toUpperCase()} export started`,
        message: 'Your export is being generated. You can download it when ready.',
        duration: 0,
      })
    },
  })
}

export function useExportBundle() {
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: ({ 
      courseId, 
      options 
    }: { 
      courseId: string; 
      options?: ExportOptions & { formats: string[] } 
    }) => api.export.bundle(courseId, options),
    
    onSuccess: ({ jobId }) => {
      addNotification({
        type: 'info',
        title: 'Bundle export started',
        message: 'Your bundle is being generated with all selected formats.',
        duration: 0,
      })
    },
  })
}

export function useDownloadExport() {
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: ({ 
      jobId, 
      filename, 
      onProgress 
    }: { 
      jobId: string; 
      filename?: string; 
      onProgress?: (progress: number) => void 
    }) => api.export.download(jobId, filename, onProgress),
    
    onSuccess: (_, { filename }) => {
      addNotification({
        type: 'success',
        title: 'Download complete',
        message: `${filename || 'Export'} has been downloaded successfully`,
      })
    },
  })
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

export function useHealthCheck() {
  return useQuery({
    queryKey: queryKeys.health(),
    queryFn: api.health.check,
    staleTime: 1000 * 30, // 30 seconds
    retry: 1,
  })
}

// WebSocket hook for real-time updates
export function useJobSubscription(
  jobId: string, 
  onUpdate?: (data: any) => void,
  options?: { enabled?: boolean }
) {
  const { subscribeToJob } = useGenerationStore()
  
  React.useEffect(() => {
    if (!jobId || options?.enabled === false) return
    
    const unsubscribe = subscribeToJob(jobId, onUpdate)
    return unsubscribe
  }, [jobId, subscribeToJob, onUpdate, options?.enabled])
}

// Batch operations
export function useBulkDeleteCourses() {
  const { bulkDeleteCourses } = useCourseStore()
  const { addNotification } = useUIStore()
  
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map(id => api.courses.delete(id))
      )
      return results
    },
    onSuccess: (results, ids) => {
      const successful = results.filter(r => r.status === 'fulfilled').length
      bulkDeleteCourses(ids)
      invalidateQueries.courses()
      
      addNotification({
        type: 'success',
        title: 'Bulk delete complete',
        message: `${successful} of ${ids.length} courses deleted successfully`,
      })
    },
  })
}

// Cache management hooks
export function usePrefetchCourse(id: string) {
  const queryClient = useQueryClient()
  
  return React.useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.courses.detail(id),
      queryFn: () => api.courses.get(id),
      staleTime: 1000 * 60 * 5,
    })
  }, [queryClient, id])
}

export function useInvalidateCache() {
  const queryClient = useQueryClient()
  
  return React.useCallback((type?: 'courses' | 'documents' | 'jobs' | 'all') => {
    switch (type) {
      case 'courses':
        invalidateQueries.courses()
        break
      case 'documents':
        invalidateQueries.documents()
        break
      case 'jobs':
        invalidateQueries.jobs()
        break
      default:
        queryClient.invalidateQueries()
    }
  }, [queryClient])
}