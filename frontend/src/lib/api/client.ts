import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { toast } from '@/hooks/use-toast'

interface ApiError {
  message: string
  status: number
  code?: string
}

interface RetryConfig {
  retries: number
  retryDelay: (attempt: number) => number
  retryCondition: (error: AxiosError) => boolean
}

class ApiClient {
  private client: AxiosInstance
  private retryConfig: RetryConfig

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.retryConfig = {
      retries: 3,
      retryDelay: (attempt: number) => Math.pow(2, attempt) * 1000,
      retryCondition: (error: AxiosError) => {
        return !error.response || error.response.status >= 500
      },
    }

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token')
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number }

        // Handle 401 errors (token refresh)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          
          try {
            await this.refreshToken()
            return this.client(originalRequest)
          } catch (refreshError) {
            this.clearAuthToken()
            if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }
            return Promise.reject(refreshError)
          }
        }

        // Handle retry logic
        if (this.shouldRetry(error, originalRequest)) {
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1
          
          if (originalRequest._retryCount <= this.retryConfig.retries) {
            const delay = this.retryConfig.retryDelay(originalRequest._retryCount)
            await new Promise(resolve => setTimeout(resolve, delay))
            return this.client(originalRequest)
          }
        }

        // Transform error and show notification
        const apiError = this.transformError(error)
        this.handleErrorNotification(apiError)
        
        return Promise.reject(apiError)
      }
    )
  }

  private shouldRetry(error: AxiosError, config?: AxiosRequestConfig & { _retryCount?: number }): boolean {
    if (!config || config._retryCount >= this.retryConfig.retries) {
      return false
    }
    return this.retryConfig.retryCondition(error)
  }

  private transformError(error: AxiosError): ApiError {
    if (error.response) {
      const data = error.response.data as any
      return {
        message: data?.message || `Request failed with status ${error.response.status}`,
        status: error.response.status,
        code: data?.code,
      }
    } else if (error.request) {
      return {
        message: 'Network error - please check your connection',
        status: 0,
        code: 'NETWORK_ERROR',
      }
    } else {
      return {
        message: error.message || 'An unexpected error occurred',
        status: 0,
        code: 'UNKNOWN_ERROR',
      }
    }
  }

  private handleErrorNotification(error: ApiError): void {
    // Don't show notifications for certain errors
    if (error.status === 401 || error.status === 404) {
      return
    }

    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive',
    })
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await axios.post(
      `${this.client.defaults.baseURL}/auth/refresh`,
      { refreshToken }
    )

    const { token, refreshToken: newRefreshToken } = response.data
    localStorage.setItem('auth_token', token)
    localStorage.setItem('refresh_token', newRefreshToken)
  }

  // HTTP Methods
  async get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(endpoint, config)
    return response.data
  }

  async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(endpoint, data, config)
    return response.data
  }

  async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(endpoint, data, config)
    return response.data
  }

  async patch<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(endpoint, data, config)
    return response.data
  }

  async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(endpoint, config)
    return response.data
  }

  // File upload with progress
  async uploadFile<T = any>(
    endpoint: string, 
    file: File, 
    onProgress?: (progress: number) => void,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await this.client.post<T>(endpoint, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
    
    return response.data
  }

  // Multiple file upload with progress
  async uploadFiles<T = any>(
    endpoint: string, 
    files: File[], 
    onProgress?: (progress: number) => void,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })

    const response = await this.client.post<T>(endpoint, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
    
    return response.data
  }

  // Download file with progress
  async downloadFile(
    endpoint: string, 
    filename?: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const response = await this.client.get(endpoint, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })

    const blob = new Blob([response.data])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)
  }

  // Auth token management
  setAuthToken(token: string, refreshToken?: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken)
      }
    }
  }

  clearAuthToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
    }
  }

  getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  }

  // Request cancellation
  createCancelToken() {
    return axios.CancelToken.source()
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health')
      return true
    } catch {
      return false
    }
  }
}

export const apiClient = new ApiClient()
export default apiClient