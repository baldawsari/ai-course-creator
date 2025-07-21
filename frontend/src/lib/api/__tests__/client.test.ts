import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { apiClient } from '../client'
import * as toastModule from '@/hooks/use-toast'

// Mock axios
jest.mock('axios')

// Mock use-toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

// Mock DOM APIs
const mockCreateElement = jest.fn()
const mockAppendChild = jest.fn()
const mockRemoveChild = jest.fn()
const mockClick = jest.fn()
const mockCreateObjectURL = jest.fn()
const mockRevokeObjectURL = jest.fn()

describe('ApiClient', () => {
  const mockAxios = axios as jest.Mocked<typeof axios>
  const mockToast = toastModule.toast as jest.MockedFunction<typeof toastModule.toast>
  let mockAxiosInstance: any
  let mockCancelTokenSource: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })

    // Mock DOM methods
    document.createElement = mockCreateElement.mockReturnValue({
      click: mockClick,
      href: '',
      download: '',
    })
    document.body.appendChild = mockAppendChild
    document.body.removeChild = mockRemoveChild
    window.URL.createObjectURL = mockCreateObjectURL.mockReturnValue('blob:mock-url')
    window.URL.revokeObjectURL = mockRevokeObjectURL

    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
      defaults: {
        baseURL: 'http://localhost:3001/api',
      },
    }

    // Mock cancel token
    mockCancelTokenSource = {
      token: 'mock-cancel-token',
      cancel: jest.fn(),
    }

    mockAxios.create.mockReturnValue(mockAxiosInstance)
    mockAxios.CancelToken = {
      source: jest.fn().mockReturnValue(mockCancelTokenSource),
    } as any
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('constructor and setup', () => {
    it('should create axios instance with default config', () => {
      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3001/api',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })
  })

  describe('request interceptor', () => {
    it('should add auth token to requests', async () => {
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0]
      window.localStorage.getItem = jest.fn().mockReturnValue('test-token')

      const config = { headers: {} }
      const result = await requestInterceptor(config)

      expect(result.headers.Authorization).toBe('Bearer test-token')
    })

    it('should handle requests without auth token', async () => {
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0]
      window.localStorage.getItem = jest.fn().mockReturnValue(null)

      const config = { headers: {} }
      const result = await requestInterceptor(config)

      expect(result.headers.Authorization).toBeUndefined()
    })

    it('should handle request interceptor errors', async () => {
      const errorInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][1]
      const error = new Error('Request error')

      await expect(errorInterceptor(error)).rejects.toEqual(error)
    })
  })

  describe('response interceptor', () => {
    let successHandler: Function
    let errorHandler: Function

    beforeEach(() => {
      successHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][0]
      errorHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][1]
    })

    it('should pass through successful responses', async () => {
      const response = { data: { success: true } }
      const result = await successHandler(response)

      expect(result).toEqual(response)
    })

    describe('token refresh', () => {
      it('should refresh token on 401 error', async () => {
        window.localStorage.getItem = jest.fn().mockImplementation((key) => {
          if (key === 'refresh_token') return 'refresh-token'
          return null
        })

        const mockPost = jest.fn().mockResolvedValue({
          data: {
            token: 'new-token',
            refreshToken: 'new-refresh-token',
          },
        })
        mockAxios.post = mockPost

        const error = {
          response: { status: 401 },
          config: { headers: {} },
        } as AxiosError

        mockAxiosInstance.mockImplementation(() => Promise.resolve({ data: 'retry-success' }))

        const result = await errorHandler(error)

        expect(mockPost).toHaveBeenCalledWith(
          'http://localhost:3001/api/auth/refresh',
          { refreshToken: 'refresh-token' }
        )
        expect(window.localStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token')
        expect(window.localStorage.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh-token')
        expect(result).toEqual({ data: 'retry-success' })
      })

      it('should redirect to login on refresh failure', async () => {
        window.localStorage.getItem = jest.fn().mockImplementation((key) => {
          if (key === 'refresh_token') return 'refresh-token'
          return null
        })

        const mockPost = jest.fn().mockRejectedValue(new Error('Refresh failed'))
        mockAxios.post = mockPost

        const error = {
          response: { status: 401 },
          config: { headers: {} },
        } as AxiosError

        delete (window as any).location
        window.location = { href: '' } as any

        await expect(errorHandler(error)).rejects.toThrow('Refresh failed')
        expect(window.location.href).toBe('/login')
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('auth_token')
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('refresh_token')
      })

      it('should not retry if already retried', async () => {
        const error = {
          response: { status: 401 },
          config: { headers: {}, _retry: true },
        } as AxiosError

        await expect(errorHandler(error)).rejects.toMatchObject({
          message: 'Request failed with status 401',
          status: 401,
        })
      })

      it('should handle missing refresh token', async () => {
        window.localStorage.getItem = jest.fn().mockReturnValue(null)

        const error = {
          response: { status: 401 },
          config: { headers: {} },
        } as AxiosError

        delete (window as any).location
        window.location = { href: '' } as any

        await expect(errorHandler(error)).rejects.toThrow('No refresh token available')
        expect(window.location.href).toBe('/login')
      })
    })

    describe('retry logic', () => {
      it('should retry on 5xx errors', async () => {
        const error = {
          response: { status: 500 },
          config: { headers: {} },
        } as AxiosError

        let callCount = 0
        mockAxiosInstance.mockImplementation(() => {
          callCount++
          if (callCount < 3) {
            return Promise.reject(error)
          }
          return Promise.resolve({ data: 'success' })
        })

        jest.useFakeTimers()
        const promise = errorHandler(error)
        
        // Advance timers for retries
        jest.advanceTimersByTime(2000) // First retry after 2^1 * 1000ms
        jest.advanceTimersByTime(4000) // Second retry after 2^2 * 1000ms
        
        const result = await promise

        expect(result).toEqual({ data: 'success' })
        expect(callCount).toBe(3)
        
        jest.useRealTimers()
      })

      it('should not retry on 4xx errors', async () => {
        const error = {
          response: { status: 400, data: { message: 'Bad Request' } },
          config: { headers: {} },
        } as AxiosError

        await expect(errorHandler(error)).rejects.toMatchObject({
          message: 'Bad Request',
          status: 400,
        })
      })

      it('should stop retrying after max attempts', async () => {
        const error = {
          response: { status: 500 },
          config: { headers: {}, _retryCount: 3 },
        } as AxiosError

        await expect(errorHandler(error)).rejects.toMatchObject({
          message: 'Request failed with status 500',
          status: 500,
        })
      })

      it('should handle network errors with retry', async () => {
        const error = {
          request: {},
          config: { headers: {} },
        } as AxiosError

        let callCount = 0
        mockAxiosInstance.mockImplementation(() => {
          callCount++
          if (callCount < 2) {
            return Promise.reject(error)
          }
          return Promise.resolve({ data: 'success' })
        })

        jest.useFakeTimers()
        const promise = errorHandler(error)
        
        jest.advanceTimersByTime(2000)
        
        const result = await promise

        expect(result).toEqual({ data: 'success' })
        
        jest.useRealTimers()
      })
    })

    describe('error transformation', () => {
      it('should transform response errors', async () => {
        const error = {
          response: { 
            status: 400, 
            data: { message: 'Validation error', code: 'VALIDATION_ERROR' } 
          },
          config: { headers: {} },
        } as AxiosError

        await expect(errorHandler(error)).rejects.toMatchObject({
          message: 'Validation error',
          status: 400,
          code: 'VALIDATION_ERROR',
        })
      })

      it('should transform network errors', async () => {
        const error = {
          request: {},
          config: { headers: {} },
        } as AxiosError

        await expect(errorHandler(error)).rejects.toMatchObject({
          message: 'Network error - please check your connection',
          status: 0,
          code: 'NETWORK_ERROR',
        })
      })

      it('should transform unknown errors', async () => {
        const error = {
          message: 'Something went wrong',
          config: { headers: {} },
        } as AxiosError

        await expect(errorHandler(error)).rejects.toMatchObject({
          message: 'Something went wrong',
          status: 0,
          code: 'UNKNOWN_ERROR',
        })
      })
    })

    describe('error notifications', () => {
      it('should show toast for server errors', async () => {
        const error = {
          response: { status: 500, data: { message: 'Server error' } },
          config: { headers: {} },
        } as AxiosError

        await expect(errorHandler(error)).rejects.toBeDefined()

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Server error',
          variant: 'destructive',
        })
      })

      it('should not show toast for 401 errors', async () => {
        const error = {
          response: { status: 401 },
          config: { headers: {} },
        } as AxiosError

        await expect(errorHandler(error)).rejects.toBeDefined()

        expect(mockToast).not.toHaveBeenCalled()
      })

      it('should not show toast for 404 errors', async () => {
        const error = {
          response: { status: 404 },
          config: { headers: {} },
        } as AxiosError

        await expect(errorHandler(error)).rejects.toBeDefined()

        expect(mockToast).not.toHaveBeenCalled()
      })
    })
  })

  describe('HTTP methods', () => {
    describe('get', () => {
      it('should make GET request and return data', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: { result: 'success' } })

        const result = await apiClient.get('/test')

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined)
        expect(result).toEqual({ result: 'success' })
      })

      it('should pass config to GET request', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: { result: 'success' } })
        const config = { params: { id: 1 } }

        await apiClient.get('/test', config)

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', config)
      })
    })

    describe('post', () => {
      it('should make POST request with data', async () => {
        mockAxiosInstance.post.mockResolvedValue({ data: { id: 1 } })
        const postData = { name: 'Test' }

        const result = await apiClient.post('/test', postData)

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', postData, undefined)
        expect(result).toEqual({ id: 1 })
      })
    })

    describe('put', () => {
      it('should make PUT request with data', async () => {
        mockAxiosInstance.put.mockResolvedValue({ data: { updated: true } })
        const putData = { name: 'Updated' }

        const result = await apiClient.put('/test/1', putData)

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', putData, undefined)
        expect(result).toEqual({ updated: true })
      })
    })

    describe('patch', () => {
      it('should make PATCH request with data', async () => {
        mockAxiosInstance.patch.mockResolvedValue({ data: { patched: true } })
        const patchData = { field: 'value' }

        const result = await apiClient.patch('/test/1', patchData)

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test/1', patchData, undefined)
        expect(result).toEqual({ patched: true })
      })
    })

    describe('delete', () => {
      it('should make DELETE request', async () => {
        mockAxiosInstance.delete.mockResolvedValue({ data: { deleted: true } })

        const result = await apiClient.delete('/test/1')

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1', undefined)
        expect(result).toEqual({ deleted: true })
      })
    })
  })

  describe('file operations', () => {
    describe('uploadFile', () => {
      it('should upload single file with progress tracking', async () => {
        const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
        const onProgress = jest.fn()
        mockAxiosInstance.post.mockResolvedValue({ data: { id: 'file-123' } })

        const result = await apiClient.uploadFile('/upload', file, onProgress)

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/upload',
          expect.any(FormData),
          expect.objectContaining({
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: expect.any(Function),
          })
        )
        expect(result).toEqual({ id: 'file-123' })
      })

      it('should track upload progress', async () => {
        const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
        const onProgress = jest.fn()
        
        mockAxiosInstance.post.mockImplementation((url, data, config) => {
          // Simulate progress events
          config?.onUploadProgress?.({ loaded: 50, total: 100 })
          config?.onUploadProgress?.({ loaded: 100, total: 100 })
          return Promise.resolve({ data: { id: 'file-123' } })
        })

        await apiClient.uploadFile('/upload', file, onProgress)

        expect(onProgress).toHaveBeenCalledWith(50)
        expect(onProgress).toHaveBeenCalledWith(100)
      })

      it('should handle upload without progress callback', async () => {
        const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
        mockAxiosInstance.post.mockResolvedValue({ data: { id: 'file-123' } })

        const result = await apiClient.uploadFile('/upload', file)

        expect(result).toEqual({ id: 'file-123' })
      })

      it('should handle undefined total in progress event', async () => {
        const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
        const onProgress = jest.fn()
        
        mockAxiosInstance.post.mockImplementation((url, data, config) => {
          config?.onUploadProgress?.({ loaded: 50, total: undefined })
          return Promise.resolve({ data: { id: 'file-123' } })
        })

        await apiClient.uploadFile('/upload', file, onProgress)

        expect(onProgress).not.toHaveBeenCalled()
      })
    })

    describe('uploadFiles', () => {
      it('should upload multiple files', async () => {
        const files = [
          new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
          new File(['content2'], 'test2.pdf', { type: 'application/pdf' }),
        ]
        mockAxiosInstance.post.mockResolvedValue({ data: { count: 2 } })

        const result = await apiClient.uploadFiles('/upload-multiple', files)

        const formDataCall = mockAxiosInstance.post.mock.calls[0][1] as FormData
        expect(formDataCall).toBeInstanceOf(FormData)
        expect(result).toEqual({ count: 2 })
      })

      it('should track progress for multiple files', async () => {
        const files = [
          new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
          new File(['content2'], 'test2.pdf', { type: 'application/pdf' }),
        ]
        const onProgress = jest.fn()
        
        mockAxiosInstance.post.mockImplementation((url, data, config) => {
          config?.onUploadProgress?.({ loaded: 150, total: 200 })
          return Promise.resolve({ data: { count: 2 } })
        })

        await apiClient.uploadFiles('/upload-multiple', files, onProgress)

        expect(onProgress).toHaveBeenCalledWith(75)
      })
    })

    describe('downloadFile', () => {
      it('should download file with default filename', async () => {
        const blob = new Blob(['file content'], { type: 'application/pdf' })
        mockAxiosInstance.get.mockResolvedValue({ data: blob })

        await apiClient.downloadFile('/download/123')

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          '/download/123',
          expect.objectContaining({
            responseType: 'blob',
            onDownloadProgress: expect.any(Function),
          })
        )
        expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob))
        expect(mockCreateElement).toHaveBeenCalledWith('a')
        expect(mockClick).toHaveBeenCalled()
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
      })

      it('should download file with custom filename', async () => {
        const blob = new Blob(['file content'], { type: 'application/pdf' })
        mockAxiosInstance.get.mockResolvedValue({ data: blob })

        const mockLink = {
          click: mockClick,
          href: '',
          download: '',
        }
        mockCreateElement.mockReturnValue(mockLink)

        await apiClient.downloadFile('/download/123', 'custom-file.pdf')

        expect(mockLink.download).toBe('custom-file.pdf')
      })

      it('should track download progress', async () => {
        const blob = new Blob(['file content'], { type: 'application/pdf' })
        const onProgress = jest.fn()
        
        mockAxiosInstance.get.mockImplementation((url, config) => {
          config?.onDownloadProgress?.({ loaded: 50, total: 100 })
          config?.onDownloadProgress?.({ loaded: 100, total: 100 })
          return Promise.resolve({ data: blob })
        })

        await apiClient.downloadFile('/download/123', 'file.pdf', onProgress)

        expect(onProgress).toHaveBeenCalledWith(50)
        expect(onProgress).toHaveBeenCalledWith(100)
      })

      it('should handle download without progress callback', async () => {
        const blob = new Blob(['file content'], { type: 'application/pdf' })
        mockAxiosInstance.get.mockResolvedValue({ data: blob })

        await apiClient.downloadFile('/download/123', 'file.pdf')

        expect(mockClick).toHaveBeenCalled()
      })

      it('should cleanup DOM elements after download', async () => {
        const blob = new Blob(['file content'], { type: 'application/pdf' })
        mockAxiosInstance.get.mockResolvedValue({ data: blob })

        const mockLink = { click: mockClick, href: '', download: '' }
        mockCreateElement.mockReturnValue(mockLink)

        await apiClient.downloadFile('/download/123')

        expect(mockAppendChild).toHaveBeenCalledWith(mockLink)
        expect(mockRemoveChild).toHaveBeenCalledWith(mockLink)
      })
    })
  })

  describe('auth token management', () => {
    it('should set auth token', () => {
      apiClient.setAuthToken('new-token')

      expect(window.localStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token')
    })

    it('should set auth and refresh tokens', () => {
      apiClient.setAuthToken('new-token', 'new-refresh-token')

      expect(window.localStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token')
      expect(window.localStorage.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh-token')
    })

    it('should clear auth tokens', () => {
      apiClient.clearAuthToken()

      expect(window.localStorage.removeItem).toHaveBeenCalledWith('auth_token')
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('refresh_token')
    })

    it('should get auth token', () => {
      window.localStorage.getItem = jest.fn().mockReturnValue('stored-token')

      const token = apiClient.getAuthToken()

      expect(window.localStorage.getItem).toHaveBeenCalledWith('auth_token')
      expect(token).toBe('stored-token')
    })

    it('should return null when no auth token', () => {
      window.localStorage.getItem = jest.fn().mockReturnValue(null)

      const token = apiClient.getAuthToken()

      expect(token).toBeNull()
    })
  })

  describe('request cancellation', () => {
    it('should create cancel token', () => {
      const cancelToken = apiClient.createCancelToken()

      expect(mockAxios.CancelToken.source).toHaveBeenCalled()
      expect(cancelToken).toEqual(mockCancelTokenSource)
    })
  })

  describe('health check', () => {
    it('should return true when health check succeeds', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { status: 'ok' } })

      const result = await apiClient.healthCheck()

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health', undefined)
      expect(result).toBe(true)
    })

    it('should return false when health check fails', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'))

      const result = await apiClient.healthCheck()

      expect(result).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle SSR environment', () => {
      // Temporarily remove window
      const originalWindow = global.window
      delete (global as any).window

      // Should not throw
      expect(() => {
        const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0]
        requestInterceptor({ headers: {} })
      }).not.toThrow()

      // Restore window
      global.window = originalWindow
    })

    it('should handle missing response data in errors', async () => {
      const errorHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][1]
      const error = {
        response: { status: 500 },
        config: { headers: {} },
      } as AxiosError

      await expect(errorHandler(error)).rejects.toMatchObject({
        message: 'Request failed with status 500',
        status: 500,
      })
    })

    it('should handle errors without message', async () => {
      const errorHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][1]
      const error = {
        config: { headers: {} },
      } as AxiosError

      await expect(errorHandler(error)).rejects.toMatchObject({
        message: 'An unexpected error occurred',
        status: 0,
        code: 'UNKNOWN_ERROR',
      })
    })
  })
})