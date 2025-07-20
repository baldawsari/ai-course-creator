import { apiClient } from './client'
import type {
  User,
  Course,
  Document,
  GenerationJob,
  ExportOptions,
  LoginCredentials,
  RegisterData,
  CourseConfig,
  CourseUpdateData,
} from '@/types'

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Documents
  DOCUMENTS: {
    UPLOAD: '/documents/upload',
    LIST: '/documents',
    GET: (id: string) => `/documents/${id}`,
    DELETE: (id: string) => `/documents/${id}`,
    PROCESS: (id: string) => `/documents/${id}/process`,
  },

  // Courses
  COURSES: {
    LIST: '/courses',
    CREATE: '/courses',
    GET: (id: string) => `/courses/${id}`,
    UPDATE: (id: string) => `/courses/${id}`,
    DELETE: (id: string) => `/courses/${id}`,
    GENERATE: '/courses/generate',
    UPLOAD_RESOURCES: (id: string) => `/courses/${id}/upload`,
    ADD_URL: (id: string) => `/courses/${id}/add-url`,
    GENERATE_CONTENT: (id: string) => `/courses/${id}/generate`,
  },

  // Export
  EXPORT: {
    HTML: (courseId: string) => `/export/html/${courseId}`,
    PDF: (courseId: string) => `/export/pdf/${courseId}`,
    POWERPOINT: (courseId: string) => `/export/powerpoint/${courseId}`,
    BUNDLE: (courseId: string) => `/export/bundle/${courseId}`,
  },

  // Jobs/Queue
  JOBS: {
    STATUS: (jobId: string) => `/jobs/${jobId}/status`,
    CANCEL: (jobId: string) => `/jobs/${jobId}/cancel`,
    LIST: '/jobs',
  },

  // Health
  HEALTH: '/health',
} as const

// Authentication API
export const authApi = {
  login: (credentials: LoginCredentials) => 
    apiClient.post<{ user: User; token: string; refreshToken: string }>(API_ENDPOINTS.AUTH.LOGIN, credentials),
  
  register: (data: RegisterData) => 
    apiClient.post<{ user: User; token: string; refreshToken: string }>(API_ENDPOINTS.AUTH.REGISTER, data),
  
  logout: () => 
    apiClient.post(API_ENDPOINTS.AUTH.LOGOUT),
  
  me: () => 
    apiClient.get<User>(API_ENDPOINTS.AUTH.ME),
  
  forgotPassword: (email: string) => 
    apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email }),
  
  resetPassword: (token: string, password: string) => 
    apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { token, password }),
}

// Documents API
export const documentsApi = {
  upload: (file: File, onProgress?: (progress: number) => void) => 
    apiClient.uploadFile<Document>(API_ENDPOINTS.DOCUMENTS.UPLOAD, file, onProgress),
  
  uploadMultiple: (files: File[], onProgress?: (progress: number) => void) => 
    apiClient.uploadFiles<Document[]>(API_ENDPOINTS.DOCUMENTS.UPLOAD, files, onProgress),
  
  list: (params?: { page?: number; limit?: number; search?: string }) => 
    apiClient.get<{ documents: Document[]; total: number; page: number; limit: number }>(API_ENDPOINTS.DOCUMENTS.LIST, { params }),
  
  get: (id: string) => 
    apiClient.get<Document>(API_ENDPOINTS.DOCUMENTS.GET(id)),
  
  delete: (id: string) => 
    apiClient.delete(API_ENDPOINTS.DOCUMENTS.DELETE(id)),
  
  process: (id: string) => 
    apiClient.post<{ jobId: string }>(API_ENDPOINTS.DOCUMENTS.PROCESS(id)),
}

// Courses API
export const coursesApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => 
    apiClient.get<{ courses: Course[]; total: number; page: number; limit: number }>(API_ENDPOINTS.COURSES.LIST, { params }),
  
  create: (data: Partial<Course>) => 
    apiClient.post<Course>(API_ENDPOINTS.COURSES.CREATE, data),
  
  get: (id: string) => 
    apiClient.get<Course>(API_ENDPOINTS.COURSES.GET(id)),
  
  update: (id: string, data: CourseUpdateData) => 
    apiClient.put<Course>(API_ENDPOINTS.COURSES.UPDATE(id), data),
  
  delete: (id: string) => 
    apiClient.delete(API_ENDPOINTS.COURSES.DELETE(id)),
  
  uploadResources: (id: string, files: File[], onProgress?: (progress: number) => void) => 
    apiClient.uploadFiles<{ documents: Document[] }>(API_ENDPOINTS.COURSES.UPLOAD_RESOURCES(id), files, onProgress),
  
  addUrl: (id: string, url: string) => 
    apiClient.post<{ document: Document }>(API_ENDPOINTS.COURSES.ADD_URL(id), { url }),
  
  generateContent: (id: string, config: CourseConfig) => 
    apiClient.post<{ jobId: string }>(API_ENDPOINTS.COURSES.GENERATE_CONTENT(id), config),
  
  generate: (data: { documentIds: string[]; config: CourseConfig }) => 
    apiClient.post<{ jobId: string; courseId: string }>(API_ENDPOINTS.COURSES.GENERATE, data),
}

// Export API
export const exportApi = {
  html: (courseId: string, options?: ExportOptions) => 
    apiClient.post<{ jobId: string }>(API_ENDPOINTS.EXPORT.HTML(courseId), options),
  
  pdf: (courseId: string, options?: ExportOptions) => 
    apiClient.post<{ jobId: string }>(API_ENDPOINTS.EXPORT.PDF(courseId), options),
  
  powerpoint: (courseId: string, options?: ExportOptions) => 
    apiClient.post<{ jobId: string }>(API_ENDPOINTS.EXPORT.POWERPOINT(courseId), options),
  
  bundle: (courseId: string, options?: ExportOptions & { formats: string[] }) => 
    apiClient.post<{ jobId: string }>(API_ENDPOINTS.EXPORT.BUNDLE(courseId), options),
  
  download: (jobId: string, filename?: string, onProgress?: (progress: number) => void) => 
    apiClient.downloadFile(`/exports/${jobId}/download`, filename, onProgress),
}

// Jobs API
export const jobsApi = {
  getStatus: (jobId: string) => 
    apiClient.get<GenerationJob>(API_ENDPOINTS.JOBS.STATUS(jobId)),
  
  cancel: (jobId: string) => 
    apiClient.post(API_ENDPOINTS.JOBS.CANCEL(jobId)),
  
  list: (params?: { page?: number; limit?: number; status?: string; type?: string }) => 
    apiClient.get<{ jobs: GenerationJob[]; total: number; page: number; limit: number }>(API_ENDPOINTS.JOBS.LIST, { params }),
}

// Upload API (for resource management)
export const uploadApi = {
  uploadFile: (file: File, onProgress?: (progress: number) => void) => 
    documentsApi.upload(file, onProgress),
  
  uploadFiles: (files: File[], onProgress?: (progress: number) => void) => 
    documentsApi.uploadMultiple(files, onProgress),
  
  uploadToCourse: (courseId: string, files: File[], onProgress?: (progress: number) => void) => 
    coursesApi.uploadResources(courseId, files, onProgress),
}

// Generation API (for AI operations)
export const generationApi = {
  generateCourse: (documentIds: string[], config: CourseConfig) => 
    coursesApi.generate({ documentIds, config }),
  
  generateContent: (courseId: string, config: CourseConfig) => 
    coursesApi.generateContent(courseId, config),
  
  getJobStatus: (jobId: string) => 
    jobsApi.getStatus(jobId),
  
  cancelJob: (jobId: string) => 
    jobsApi.cancel(jobId),
  
  // WebSocket for real-time updates
  subscribeToJob: (jobId: string, onUpdate: (data: any) => void) => {
    if (typeof window === 'undefined') return () => {}
    
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/jobs/${jobId}`)
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onUpdate(data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    return () => {
      ws.close()
    }
  },
}

// Health check
export const healthApi = {
  check: () => 
    apiClient.get<{ status: 'ok'; timestamp: string; version: string }>(API_ENDPOINTS.HEALTH),
}

// Export all APIs
export const api = {
  auth: authApi,
  documents: documentsApi,
  courses: coursesApi,
  export: exportApi,
  jobs: jobsApi,
  upload: uploadApi,
  generation: generationApi,
  health: healthApi,
}