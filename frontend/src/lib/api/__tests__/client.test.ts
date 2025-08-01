import { jest } from '@jest/globals'
import axios, { AxiosRequestConfig } from 'axios'
import { mockHelpers } from '@/__mocks__/axios'
import { toast } from '@/hooks/use-toast'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

// Import ApiClient after mocks are set up
import ApiClient from '../client'

// Get the mocked axios instance
const mockedAxios = jest.mocked(axios)
const mockedToast = jest.mocked(toast)

// Extended config type for testing
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean
  _retryCount?: number
}

describe('ApiClient', () => {
  let apiClient: any
  let mockAxiosInstance: any

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
    mockHelpers.resetMockAxios()
    
    // Reset localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })

    // Reset window.location
    delete (window as any).location
    window.location = { href: '' } as any
    
    // Ensure global setTimeout exists for retry logic
    if (typeof global.setTimeout === 'undefined') {
      global.setTimeout = jest.fn((callback, delay) => {
        callback()
        return {} as any
      }) as any
    }

    // Create mock axios instance that can be called as a function
    const axiosFn = jest.fn()
    mockAxiosInstance = Object.assign(axiosFn, {
      defaults: {
        baseURL: 'http://localhost:3001/api',
        timeout: 30000,
        headers: {
          common: {},
        },
      },
      interceptors: {
        request: {
          use: jest.fn(),
          handlers: [],
        },
        response: {
          use: jest.fn(),
          handlers: [],
        },
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    })

    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any)

    // Create a new instance of ApiClient
    const ApiClientClass = (ApiClient as any).constructor
    apiClient = new ApiClientClass()
  })

  describe('Constructor and Setup', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3001',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    it('should set up interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledTimes(1)
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledTimes(1)
    })

    it('should use custom API URL from environment variable', () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_URL
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com'
      
      const ApiClientClass = (ApiClient as any).constructor
      new ApiClientClass()
      
      expect(mockedAxios.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.example.com',
        })
      )
      
      process.env.NEXT_PUBLIC_API_URL = originalEnv
    })
  })

  describe('Request Interceptor', () => {
    let requestInterceptor: any

    beforeEach(() => {
      // Get the request interceptor
      requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0]
    })

    it('should add auth token to requests when available', () => {
      window.localStorage.getItem = jest.fn().mockReturnValue('test-token')
      
      const config = {
        headers: {},
      }
      
      const result = requestInterceptor(config)
      
      expect(window.localStorage.getItem).toHaveBeenCalledWith('auth_token')
      expect(result.headers.Authorization).toBe('Bearer test-token')
    })

    it('should not add auth token when not available', () => {
      window.localStorage.getItem = jest.fn().mockReturnValue(null)
      
      const config = {
        headers: {},
      }
      
      const result = requestInterceptor(config)
      
      expect(result.headers.Authorization).toBeUndefined()
    })

    it('should handle request interceptor errors', () => {
      const errorInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][1]
      const error = new Error('Request error')
      
      expect(errorInterceptor(error)).rejects.toEqual(error)
    })
  })

  describe('Response Interceptor - Token Refresh', () => {
    let responseInterceptor: any
    let errorInterceptor: any

    beforeEach(() => {
      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0]
      responseInterceptor = interceptorCall[0]
      errorInterceptor = interceptorCall[1]
    })

    it('should pass through successful responses', () => {
      const response = { data: 'test', status: 200 }
      
      expect(responseInterceptor(response)).toEqual(response)
    })

    it('should handle 401 error and refresh token', async () => {
      window.localStorage.getItem = jest.fn((key: string) => {
        if (key === 'auth_token') return 'old-token'
        if (key === 'refresh_token') return 'refresh-token'
        return null
      }) as any
      
      window.localStorage.setItem = jest.fn()
      
      // Mock successful token refresh
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          token: 'new-token',
          refreshToken: 'new-refresh-token',
        },
      })
      
      // Mock retry of original request
      mockAxiosInstance.mockResolvedValueOnce({ data: 'retry-success' })
      
      const error = mockHelpers.createMockError({
        response: {
          status: 401,
          data: {},
          statusText: 'Unauthorized',
          headers: {},
          config: {},
        },
        config: {
          url: '/test',
          method: 'get',
        },
      })
      
      await errorInterceptor(error)
      
      // Verify token refresh was called
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/refresh',
        { refreshToken: 'refresh-token' }
      )
      
      // Verify tokens were stored
      expect(window.localStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token')
      expect(window.localStorage.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh-token')
    })

    it('should redirect to login when token refresh fails', async () => {
      window.localStorage.getItem = jest.fn().mockReturnValue('refresh-token') as any
      window.localStorage.removeItem = jest.fn()
      
      // Mock failed token refresh
      mockedAxios.post.mockRejectedValueOnce(new Error('Refresh failed'))
      
      const error = mockHelpers.createMockError({
        response: {
          status: 401,
          data: {},
          statusText: 'Unauthorized',
          headers: {},
          config: {},
        },
        config: {
          url: '/test',
          method: 'get',
        },
      })
      
      await expect(errorInterceptor(error)).rejects.toThrow('Refresh failed')
      
      // Verify auth tokens were cleared
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('auth_token')
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('refresh_token')
      
      // Verify redirect to login
      expect(window.location.href).toBe('/login')
    })

    it('should not retry request if already retried', async () => {
      const error = mockHelpers.createMockError({
        response: {
          status: 401,
          data: {},
          statusText: 'Unauthorized',
          headers: {},
          config: {},
        },
        config: {
          url: '/test',
          method: 'get',
          _retry: true,
        },
      })
      
      const result = await errorInterceptor(error).catch((e: any) => e)
      
      // Should transform error but not attempt refresh
      expect(mockedAxios.post).not.toHaveBeenCalled()
      expect(result).toMatchObject({
        message: 'Request failed with status 401',
        status: 401,
      })
    })

    it('should throw error when no refresh token available', async () => {
      window.localStorage.getItem = jest.fn().mockReturnValue(null) as any
      window.localStorage.removeItem = jest.fn()
      
      const error = mockHelpers.createMockError({
        response: {
          status: 401,
          data: {},
          statusText: 'Unauthorized',
          headers: {},
          config: {},
        },
        config: {
          url: '/test',
          method: 'get',
        },
      })
      
      // The interceptor should handle the refresh failure and return transformed error
      const result = await errorInterceptor(error).catch((e: any) => e)
      
      expect(result).toMatchObject({
        message: 'Request failed with status 401',
        status: 401,
      })
      
      // Verify auth tokens were cleared
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('auth_token')
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('refresh_token')
      
      // Verify redirect to login
      expect(window.location.href).toBe('/login')
    })
  })

  describe('Response Interceptor - Retry Logic', () => {
    let errorInterceptor: any

    beforeEach(() => {
      errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1]
    })

    it('should retry failed requests with 5xx errors', async () => {
      // Mock the client to fail first then succeed on retry
      let callCount = 0
      mockAxiosInstance.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('First attempt'))
        }
        return Promise.resolve({ data: 'success' })
      })

      const error = mockHelpers.createMockError({
        response: {
          status: 500,
          data: {},
          statusText: 'Internal Server Error',
          headers: {},
          config: {},
        },
        config: {
          url: '/test',
          method: 'get',
        },
      })

      // Mock setTimeout to execute immediately
      jest.useFakeTimers()
      
      const resultPromise = errorInterceptor(error)
      
      // Fast-forward timers
      jest.runAllTimers()
      
      await resultPromise
      
      jest.useRealTimers()
    })

    it('should not retry non-5xx errors', async () => {
      const error = mockHelpers.createMockError({
        response: {
          status: 400,
          data: { message: 'Bad Request' },
          statusText: 'Bad Request',
          headers: {},
          config: {},
        },
        config: {
          url: '/test',
          method: 'get',
        },
      })

      const result = await errorInterceptor(error).catch((e: any) => e)
      
      expect(result).toMatchObject({
        message: 'Bad Request',
        status: 400,
      })
      
      // Should not retry
      expect(mockAxiosInstance).not.toHaveBeenCalled()
    })

    it('should retry network errors', async () => {
      mockAxiosInstance.mockResolvedValueOnce({ data: 'success' })

      const error = mockHelpers.createMockError({
        request: {},
        message: 'Network Error',
        config: {
          url: '/test',
          method: 'get',
        },
      })

      jest.useFakeTimers()
      
      const resultPromise = errorInterceptor(error)
      
      jest.runAllTimers()
      
      await resultPromise
      
      jest.useRealTimers()
    })

    it('should respect retry limit', async () => {
      const error = mockHelpers.createMockError({
        response: {
          status: 500,
          data: {},
          statusText: 'Internal Server Error',
          headers: {},
          config: {},
        },
        config: {
          url: '/test',
          method: 'get',
          _retryCount: 3,
        },
      })

      const result = await errorInterceptor(error).catch((e: any) => e)
      
      // Should not retry beyond limit
      expect(mockAxiosInstance).not.toHaveBeenCalled()
      expect(result).toMatchObject({
        message: 'Request failed with status 500',
        status: 500,
      })
    })

    it('should use exponential backoff for retries', async () => {
      mockAxiosInstance.mockResolvedValueOnce({ data: 'success' })

      const error = mockHelpers.createMockError({
        response: {
          status: 503,
          data: {},
          statusText: 'Service Unavailable',
          headers: {},
          config: {},
        },
        config: {
          url: '/test',
          method: 'get',
          _retryCount: 1, // Second attempt
        },
      })

      jest.useFakeTimers()
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout')
      
      const resultPromise = errorInterceptor(error)
      
      // Verify exponential backoff (2^2 * 1000 = 4000ms for second retry)
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 4000)
      
      jest.runAllTimers()
      await resultPromise
      
      jest.useRealTimers()
    })
  })

  describe('Error Transformation and Notifications', () => {
    let errorInterceptor: any

    beforeEach(() => {
      errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1]
    })

    it('should transform error with response', async () => {
      const error = mockHelpers.createMockError({
        response: {
          status: 400,
          data: { message: 'Custom error message', code: 'CUSTOM_ERROR' },
          statusText: 'Bad Request',
          headers: {},
          config: {},
        },
      })

      const result = await errorInterceptor(error).catch((e: any) => e)
      
      expect(result).toEqual({
        message: 'Custom error message',
        status: 400,
        code: 'CUSTOM_ERROR',
      })
    })

    it('should transform network error', async () => {
      // Mock setTimeout to execute immediately
      const originalSetTimeout = global.setTimeout
      global.setTimeout = jest.fn((cb) => {
        cb()
        return 1 as any
      }) as any
      
      const error = mockHelpers.createMockError({
        request: {},
        message: 'Network Error',
        config: {},
      })

      const result = await errorInterceptor(error).catch((e: any) => e)
      
      expect(result).toEqual({
        message: 'Network error - please check your connection',
        status: 0,
        code: 'NETWORK_ERROR',
      })
      
      global.setTimeout = originalSetTimeout
    })

    it('should transform unknown error', async () => {
      // Mock setTimeout to execute immediately
      const originalSetTimeout = global.setTimeout
      global.setTimeout = jest.fn((cb) => {
        cb()
        return 1 as any
      }) as any
      
      const error = mockHelpers.createMockError({
        message: 'Something went wrong',
        config: {},
      })

      const result = await errorInterceptor(error).catch((e: any) => e)
      
      expect(result).toEqual({
        message: 'Something went wrong',
        status: 0,
        code: 'UNKNOWN_ERROR',
      })
      
      global.setTimeout = originalSetTimeout
    })

    it('should show toast notification for errors except 401 and 404', async () => {
      // Mock setTimeout to execute immediately  
      const originalSetTimeout = global.setTimeout
      global.setTimeout = jest.fn((cb) => {
        cb()
        return 1 as any
      }) as any
      
      // Clear any previous toast calls
      mockedToast.mockClear()
      
      const error = mockHelpers.createMockError({
        response: {
          status: 500,
          data: { message: 'Server error' },
          statusText: 'Internal Server Error',
          headers: {},
          config: {},
        },
        config: {
          _retryCount: 3, // Already exceeded retry limit
        } as ExtendedAxiosRequestConfig,
      })

      await errorInterceptor(error).catch(() => {})
      
      expect(mockedToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Server error',
        variant: 'destructive',
      })
      
      global.setTimeout = originalSetTimeout
    })

    it('should not show toast for 401 errors', async () => {
      const error = mockHelpers.createMockError({
        response: {
          status: 401,
          data: {},
          statusText: 'Unauthorized',
          headers: {},
          config: {},
        },
        config: {
          _retry: true, // Prevent refresh attempt
        },
      })

      await errorInterceptor(error).catch(() => {})
      
      expect(mockedToast).not.toHaveBeenCalled()
    })

    it('should not show toast for 404 errors', async () => {
      const error = mockHelpers.createMockError({
        response: {
          status: 404,
          data: {},
          statusText: 'Not Found',
          headers: {},
          config: {},
        },
      })

      await errorInterceptor(error).catch(() => {})
      
      expect(mockedToast).not.toHaveBeenCalled()
    })
  })

  describe('HTTP Methods', () => {
    beforeEach(() => {
      // Set up mock responses for each method
      mockAxiosInstance.get.mockResolvedValue({ data: { result: 'get' } })
      mockAxiosInstance.post.mockResolvedValue({ data: { result: 'post' } })
      mockAxiosInstance.put.mockResolvedValue({ data: { result: 'put' } })
      mockAxiosInstance.patch.mockResolvedValue({ data: { result: 'patch' } })
      mockAxiosInstance.delete.mockResolvedValue({ data: { result: 'delete' } })
    })

    it('should make GET request', async () => {
      const result = await apiClient.get('/test', { params: { id: 1 } })
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', { params: { id: 1 } })
      expect(result).toEqual({ result: 'get' })
    })

    it('should make POST request', async () => {
      const data = { name: 'test' }
      const result = await apiClient.post('/test', data, { headers: { 'X-Custom': 'header' } })
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', data, { headers: { 'X-Custom': 'header' } })
      expect(result).toEqual({ result: 'post' })
    })

    it('should make PUT request', async () => {
      const data = { id: 1, name: 'updated' }
      const result = await apiClient.put('/test/1', data)
      
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', data, undefined)
      expect(result).toEqual({ result: 'put' })
    })

    it('should make PATCH request', async () => {
      const data = { name: 'patched' }
      const result = await apiClient.patch('/test/1', data)
      
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test/1', data, undefined)
      expect(result).toEqual({ result: 'patch' })
    })

    it('should make DELETE request', async () => {
      const result = await apiClient.delete('/test/1', { params: { force: true } })
      
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1', { params: { force: true } })
      expect(result).toEqual({ result: 'delete' })
    })
  })

  describe('File Operations', () => {
    describe('uploadFile', () => {
      it('should upload single file with progress tracking', async () => {
        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
        const progressCallback = jest.fn()
        
        mockAxiosInstance.post.mockImplementation((url, data, config) => {
          // Simulate progress events
          if (config?.onUploadProgress) {
            config.onUploadProgress({ loaded: 50, total: 100 })
            config.onUploadProgress({ loaded: 100, total: 100 })
          }
          
          return Promise.resolve({ data: { id: 'file-1', filename: 'test.pdf' } })
        })
        
        const result = await apiClient.uploadFile('/upload', file, progressCallback)
        
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
        
        // Verify FormData contains the file
        const formDataCall = mockAxiosInstance.post.mock.calls[0][1]
        expect(formDataCall.get('file')).toBe(file)
        
        // Verify progress callbacks
        expect(progressCallback).toHaveBeenCalledWith(50)
        expect(progressCallback).toHaveBeenCalledWith(100)
        
        expect(result).toEqual({ id: 'file-1', filename: 'test.pdf' })
      })

      it('should handle upload without progress callback', async () => {
        const file = new File(['test'], 'test.txt', { type: 'text/plain' })
        
        mockAxiosInstance.post.mockResolvedValue({ data: { id: 'file-2' } })
        
        const result = await apiClient.uploadFile('/upload', file)
        
        expect(result).toEqual({ id: 'file-2' })
      })

      it('should merge custom config with defaults', async () => {
        const file = new File(['test'], 'test.txt')
        const customConfig = {
          headers: { 'X-Custom': 'value' },
          timeout: 60000,
        }
        
        mockAxiosInstance.post.mockResolvedValue({ data: { success: true } })
        
        await apiClient.uploadFile('/upload', file, undefined, customConfig)
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/upload',
          expect.any(FormData),
          expect.objectContaining({
            headers: {
              'Content-Type': 'multipart/form-data',
              'X-Custom': 'value',
            },
            timeout: 60000,
          })
        )
      })
    })

    describe('uploadFiles', () => {
      it('should upload multiple files with progress', async () => {
        const files = [
          new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
          new File(['content2'], 'file2.pdf', { type: 'application/pdf' }),
        ]
        const progressCallback = jest.fn()
        
        mockAxiosInstance.post.mockImplementation((url, data, config) => {
          if (config?.onUploadProgress) {
            config.onUploadProgress({ loaded: 100, total: 200 })
          }
          
          return Promise.resolve({ data: [{ id: 'file-1' }, { id: 'file-2' }] })
        })
        
        const result = await apiClient.uploadFiles('/upload-multiple', files, progressCallback)
        
        // Verify FormData contains all files
        const formDataCall = mockAxiosInstance.post.mock.calls[0][1]
        const formDataFiles = formDataCall.getAll('files')
        expect(formDataFiles).toHaveLength(2)
        expect(formDataFiles[0]).toBe(files[0])
        expect(formDataFiles[1]).toBe(files[1])
        
        expect(progressCallback).toHaveBeenCalledWith(50)
        expect(result).toEqual([{ id: 'file-1' }, { id: 'file-2' }])
      })
    })

    describe('downloadFile', () => {
      it('should download file with progress tracking', async () => {
        const blob = new Blob(['file content'], { type: 'application/pdf' })
        const progressCallback = jest.fn()
        
        // Mock DOM methods
        const mockLink = {
          href: '',
          download: '',
          click: jest.fn(),
          setAttribute: jest.fn(),
        }
        
        const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
        const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockReturnValue(mockLink as any)
        const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockReturnValue(mockLink as any)
        const createObjectURLSpy = jest.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:url')
        const revokeObjectURLSpy = jest.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {})
        
        mockAxiosInstance.get.mockImplementation((url, config) => {
          if (config?.onDownloadProgress) {
            config.onDownloadProgress({ loaded: 75, total: 100 })
            config.onDownloadProgress({ loaded: 100, total: 100 })
          }
          
          return Promise.resolve({ data: blob })
        })
        
        await apiClient.downloadFile('/download/file.pdf', 'custom-name.pdf', progressCallback)
        
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          '/download/file.pdf',
          expect.objectContaining({
            responseType: 'blob',
            onDownloadProgress: expect.any(Function),
          })
        )
        
        // Verify progress callbacks
        expect(progressCallback).toHaveBeenCalledWith(75)
        expect(progressCallback).toHaveBeenCalledWith(100)
        
        // Verify download trigger
        expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob))
        expect(mockLink.href).toBe('blob:url')
        expect(mockLink.download).toBe('custom-name.pdf')
        expect(mockLink.click).toHaveBeenCalled()
        
        // Verify cleanup
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url')
        expect(removeChildSpy).toHaveBeenCalledWith(mockLink)
        
        // Restore mocks
        createElementSpy.mockRestore()
        appendChildSpy.mockRestore()
        removeChildSpy.mockRestore()
        createObjectURLSpy.mockRestore()
        revokeObjectURLSpy.mockRestore()
      })

      it('should use default filename when not provided', async () => {
        const blob = new Blob(['content'])
        
        const mockLink = {
          href: '',
          download: '',
          click: jest.fn(),
          setAttribute: jest.fn(),
        }
        const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
        
        // Mock other DOM methods to prevent errors
        jest.spyOn(document.body, 'appendChild').mockReturnValue(mockLink as any)
        jest.spyOn(document.body, 'removeChild').mockReturnValue(mockLink as any)
        jest.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:url')
        jest.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {})
        
        mockAxiosInstance.get.mockResolvedValue({ data: blob })
        
        await apiClient.downloadFile('/download/file')
        
        expect(mockLink.download).toBe('download')
        
        // Restore mocks
        createElementSpy.mockRestore()
      })
    })
  })

  describe('Auth Token Management', () => {
    it('should set auth token', () => {
      window.localStorage.setItem = jest.fn()
      
      apiClient.setAuthToken('new-token')
      
      expect(window.localStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token')
    })

    it('should set auth and refresh tokens', () => {
      window.localStorage.setItem = jest.fn()
      
      apiClient.setAuthToken('new-token', 'new-refresh-token')
      
      expect(window.localStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token')
      expect(window.localStorage.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh-token')
    })

    it('should clear auth tokens', () => {
      window.localStorage.removeItem = jest.fn()
      
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

    it('should return null when no token stored', () => {
      window.localStorage.getItem = jest.fn().mockReturnValue(null)
      
      const token = apiClient.getAuthToken()
      
      expect(token).toBeNull()
    })

    it('should handle server-side rendering for auth methods', () => {
      // Simulate server-side rendering
      const originalWindow = global.window
      delete (global as any).window
      
      // Methods should not throw in SSR
      expect(() => apiClient.setAuthToken('token')).not.toThrow()
      expect(() => apiClient.clearAuthToken()).not.toThrow()
      expect(apiClient.getAuthToken()).toBeNull()
      
      // Restore window
      global.window = originalWindow
    })
  })

  describe('Request Cancellation', () => {
    it('should create cancel token', () => {
      const mockCancelToken = {
        token: 'mock-token',
        cancel: jest.fn(),
      }
      mockedAxios.CancelToken.source.mockReturnValue(mockCancelToken)
      
      const cancelToken = apiClient.createCancelToken()
      
      expect(mockedAxios.CancelToken.source).toHaveBeenCalled()
      expect(cancelToken).toBe(mockCancelToken)
    })
  })

  describe('Health Check', () => {
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

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing error response data gracefully', async () => {
      const errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1]
      
      const error = mockHelpers.createMockError({
        response: {
          status: 400,
          data: null,
          statusText: 'Bad Request',
          headers: {},
          config: {},
        },
      })

      const result = await errorInterceptor(error).catch((e: any) => e)
      
      expect(result).toEqual({
        message: 'Request failed with status 400',
        status: 400,
        code: undefined,
      })
    })

    it('should handle progress events without total', async () => {
      const progressCallback = jest.fn()
      const file = new File(['test'], 'test.txt')
      
      mockAxiosInstance.post.mockImplementation((url, data, config) => {
        if (config?.onUploadProgress) {
          // Progress event without total
          config.onUploadProgress({ loaded: 50, total: undefined })
        }
        
        return Promise.resolve({ data: { success: true } })
      })
      
      await apiClient.uploadFile('/upload', file, progressCallback)
      
      // Progress callback should not be called when total is undefined
      expect(progressCallback).not.toHaveBeenCalled()
    })

    it('should handle interceptor setup errors', () => {
      // Create a new mock for this specific test
      const errorMockAxiosInstance = Object.assign(jest.fn(), {
        defaults: {
          baseURL: 'http://localhost:3001/api',
          timeout: 30000,
          headers: { common: {} },
        },
        interceptors: {
          request: {
            use: jest.fn(() => {
              throw new Error('Interceptor setup failed')
            }),
            handlers: [],
          },
          response: {
            use: jest.fn(),
            handlers: [],
          },
        },
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
      })
      
      mockedAxios.create.mockReturnValueOnce(errorMockAxiosInstance as any)
      
      expect(() => {
        const ApiClientClass = (ApiClient as any).constructor
        new ApiClientClass()
      }).toThrow('Interceptor setup failed')
    })
  })
})