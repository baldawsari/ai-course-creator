import React, { ReactElement, ReactNode } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { jest } from '@jest/globals'

// Mock implementations for stores
const mockAuthStore = {
  user: null,
  token: null,
  isAuthenticated: false,
  login: jest.fn(),
  logout: jest.fn(),
  setTokens: jest.fn(),
}

const mockUIStore = {
  theme: 'light' as const,
  sidebarState: 'expanded' as const,
  notifications: [],
  setTheme: jest.fn(),
  addNotification: jest.fn(),
  toggleSidebar: jest.fn(),
}

const mockCourseStore = {
  courses: [],
  currentCourse: null,
  setCourses: jest.fn(),
  addCourse: jest.fn(),
  updateCourse: jest.fn(),
  deleteCourse: jest.fn(),
}

// Mock stores
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: () => mockAuthStore,
}))

jest.mock('@/lib/store/ui-store', () => ({
  useUIStore: () => mockUIStore,
}))

jest.mock('@/lib/store/course-store', () => ({
  useCourseStore: () => mockCourseStore,
}))

// Test wrapper component
interface TestProvidersProps {
  children: ReactNode
  queryClient?: QueryClient
}

const TestProviders: React.FC<TestProvidersProps> = ({ 
  children, 
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  initialAuth?: Partial<typeof mockAuthStore>
  initialUI?: Partial<typeof mockUIStore>
  initialCourse?: Partial<typeof mockCourseStore>
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult => {
  const { queryClient, initialAuth, initialUI, initialCourse, ...renderOptions } = options

  // Override mock store values if provided
  if (initialAuth) {
    Object.assign(mockAuthStore, initialAuth)
  }
  if (initialUI) {
    Object.assign(mockUIStore, initialUI)
  }
  if (initialCourse) {
    Object.assign(mockCourseStore, initialCourse)
  }

  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
    <TestProviders queryClient={queryClient}>
      {children}
    </TestProviders>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// User event helpers
import userEvent from '@testing-library/user-event'

export const createUserEvent = () => userEvent.setup()

// Mock data generators
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  role: 'editor' as const,
  organization: 'Test Org',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockCourse = {
  id: 'course-123',
  title: 'Test Course',
  description: 'A test course for testing',
  difficulty: 'intermediate' as const,
  estimatedDuration: 120,
  status: 'draft' as const,
  userId: 'user-123',
  sessions: [],
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockDocument = {
  id: 'doc-123',
  filename: 'test-document.pdf',
  originalName: 'test-document.pdf',
  mimeType: 'application/pdf',
  size: 1024000,
  status: 'processed' as const,
  userId: 'user-123',
  path: '/uploads/test-document.pdf',
  metadata: {
    pages: 10,
    wordCount: 1000,
    language: 'en',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockSession = {
  id: 'session-123',
  title: 'Test Session',
  description: 'A test session',
  order: 1,
  courseId: 'course-123',
  activities: [],
  estimatedDuration: 30,
  objectives: ['Learn testing', 'Practice skills'],
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockActivity = {
  id: 'activity-123',
  title: 'Test Activity',
  description: 'A test activity',
  type: 'exercise' as const,
  order: 1,
  sessionId: 'session-123',
  content: 'Test activity content',
  estimatedDuration: 15,
  difficulty: 'medium' as const,
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// API mocking helpers
export const mockApiResponse = <T,>(data: T, delay = 0) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay)
  })
}

export const mockApiError = (message: string, status = 400, delay = 0) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(message)
      ;(error as any).status = status
      reject(error)
    }, delay)
  })
}

// WebSocket mocking
export const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
}

// Local storage mocking
export const mockLocalStorage = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  }
})()

// Replace localStorage in tests
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Helper to wait for async operations
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

// Helper to create mock file
export const createMockFile = (
  name = 'test.pdf',
  size = 1024,
  type = 'application/pdf'
) => {
  // Create a buffer with the specified size
  const buffer = new ArrayBuffer(size)
  const blob = new Blob([buffer], { type })
  const file = new File([blob], name, { type, lastModified: Date.now() })
  
  // Override the size property to match the requested size
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  })
  
  return file
}

// Export everything including the overridden render
export * from '@testing-library/react'
export { customRender as render }
export {
  mockAuthStore,
  mockUIStore,
  mockCourseStore,
  TestProviders,
}

// Export dialog helpers
export * from './dialog-helpers'