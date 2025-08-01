import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

type MockResponse = {
  data: any
  status: number
  statusText: string
  headers: any
  config: AxiosRequestConfig
}

type MockError = {
  response?: MockResponse
  request?: any
  message?: string
  config?: AxiosRequestConfig
}

const createMockResponse = (data: any, status = 200): AxiosResponse => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {} as AxiosRequestConfig,
})

const createMockError = (error: MockError): AxiosError => {
  const axiosError = new Error(error.message || 'Mock error') as AxiosError
  axiosError.response = error.response as AxiosResponse
  axiosError.request = error.request
  axiosError.config = error.config || ({} as AxiosRequestConfig)
  axiosError.isAxiosError = true
  axiosError.toJSON = () => ({})
  return axiosError
}

// Mock axios instance
const mockAxios = {
  defaults: {
    baseURL: 'http://localhost:3001/api',
    timeout: 30000,
    headers: {
      common: {},
      get: {},
      post: {},
      put: {},
      patch: {},
      delete: {},
    },
  },
  interceptors: {
    request: {
      use: jest.fn((onFulfilled, onRejected) => {
        mockAxios.interceptors.request.handlers.push({ onFulfilled, onRejected })
        return mockAxios.interceptors.request.handlers.length - 1
      }),
      eject: jest.fn(),
      handlers: [] as any[],
    },
    response: {
      use: jest.fn((onFulfilled, onRejected) => {
        mockAxios.interceptors.response.handlers.push({ onFulfilled, onRejected })
        return mockAxios.interceptors.response.handlers.length - 1
      }),
      eject: jest.fn(),
      handlers: [] as any[],
    },
  },
  get: jest.fn().mockImplementation(() => Promise.resolve(createMockResponse({}))),
  post: jest.fn().mockImplementation(() => Promise.resolve(createMockResponse({}))),
  put: jest.fn().mockImplementation(() => Promise.resolve(createMockResponse({}))),
  patch: jest.fn().mockImplementation(() => Promise.resolve(createMockResponse({}))),
  delete: jest.fn().mockImplementation(() => Promise.resolve(createMockResponse({}))),
  request: jest.fn().mockImplementation(() => Promise.resolve(createMockResponse({}))),
  head: jest.fn().mockImplementation(() => Promise.resolve(createMockResponse({}))),
  options: jest.fn().mockImplementation(() => Promise.resolve(createMockResponse({}))),
}

// Create function for axios.create
const create = jest.fn(() => mockAxios)

// CancelToken implementation
const CancelToken = {
  source: jest.fn(() => ({
    token: 'mock-cancel-token',
    cancel: jest.fn(),
  })),
}

// Export the mocked axios
const axios = {
  ...mockAxios,
  create,
  CancelToken,
  isAxiosError: (error: any): error is AxiosError => error.isAxiosError === true,
}

// Helper functions for tests
export const mockHelpers = {
  createMockResponse,
  createMockError,
  resetMockAxios: () => {
    jest.clearAllMocks()
    mockAxios.interceptors.request.handlers = []
    mockAxios.interceptors.response.handlers = []
  },
}

export default axios