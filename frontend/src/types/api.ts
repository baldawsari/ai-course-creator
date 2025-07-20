// Generic API Response Types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export interface ApiError {
  message: string
  code?: string
  details?: Record<string, any>
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface JobResponse {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  message?: string
  result?: any
  error?: string
}

// Request Types
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SearchParams extends PaginationParams {
  query?: string
  filters?: Record<string, any>
}

// File Upload Types
export interface FileUploadResponse {
  filename: string
  originalName: string
  mimetype: string
  size: number
  url: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

// Health Check
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  services: {
    database: 'healthy' | 'unhealthy'
    redis: 'healthy' | 'unhealthy'
    vectorStore: 'healthy' | 'unhealthy'
    ai: 'healthy' | 'unhealthy'
  }
}