import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, beforeAll, afterAll, jest } from '@jest/globals'
import { TextEncoder, TextDecoder } from 'util'
import { server } from './utils/api-mocks'

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

// Add Response/Request/Headers polyfills for MSW
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body?: any, init?: any) {
      this.body = body
      this.status = init?.status || 200
      this.statusText = init?.statusText || 'OK'
      this.headers = new Map(Object.entries(init?.headers || {}))
    }
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
  } as any
}

if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(public url: string, public init?: any) {}
  } as any
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    private map = new Map<string, string>()
    
    append(name: string, value: string) {
      this.map.set(name.toLowerCase(), value)
    }
    
    get(name: string) {
      return this.map.get(name.toLowerCase())
    }
    
    has(name: string) {
      return this.map.has(name.toLowerCase())
    }
  } as any
}

// Add BroadcastChannel polyfill for MSW
if (typeof global.BroadcastChannel === 'undefined') {
  global.BroadcastChannel = class BroadcastChannel {
    name: string
    postMessage: () => void
    close: () => void
    onmessage: () => void
    
    constructor(name: string) {
      this.name = name
      this.postMessage = jest.fn()
      this.close = jest.fn()
      this.onmessage = jest.fn()
    }
  } as any
}

// Mock localStorage with working implementation
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString()
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
    key: jest.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
  }
})()
global.localStorage = localStorageMock as any
global.sessionStorage = localStorageMock as any

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 10000, // Increased timeout to handle complex async operations
})

// Setup portal root for dialogs and modals
beforeEach(() => {
  // Setup document body structure for Radix UI portals
  document.body.innerHTML = ''
  
  // Create multiple portal roots for different Radix UI components
  const portalIds = [
    'radix-0', // Default radix portal
    'radix-1', // Additional radix portals
    'radix-2',
    'radix-3',
    'radix-:r0:', // Common Radix UI portal ID pattern
    'radix-:r1:',
    'radix-:r2:',
    'dialog-portal-root', // Custom dialog portal
    'modal-portal-root', // Custom modal portal
  ]
  
  portalIds.forEach(id => {
    const portal = document.createElement('div')
    portal.setAttribute('id', id)
    portal.setAttribute('data-radix-portal', '')
    document.body.appendChild(portal)
  })
  
  // Create a generic portal container that Radix UI might use
  const radixPortalContainer = document.createElement('div')
  radixPortalContainer.setAttribute('data-radix-popper-content-wrapper', '')
  document.body.appendChild(radixPortalContainer)
  
  // Mock document.elementFromPoint for Radix UI interactions
  document.elementFromPoint = jest.fn(() => document.body)
})

// Start MSW server
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

// Reset handlers after each test
afterEach(() => {
  // Cleanup React components first
  cleanup()
  
  // Clear all mocks and timers
  jest.clearAllMocks()
  jest.clearAllTimers()
  jest.useRealTimers()
  
  // Reset MSW handlers
  server.resetHandlers()
  
  // Clean up portal roots and body
  document.body.innerHTML = ''
  
  // Reset any global state
  if (typeof window !== 'undefined') {
    // Reset any window properties that might have been modified
    ;(window as any).__dropzoneState = undefined
  }
})

// Clean up after all tests
afterAll(() => server.close())

// Mock use-toast hook
jest.mock('@/hooks/use-toast', () => require('@/__mocks__/hooks/use-toast'))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useParams: () => ({
    id: 'test-id',
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Next.js image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />
  },
}))

// Mock Next.js link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock environment variables - Note: API client expects URL without /api suffix
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001'
process.env.NEXT_PUBLIC_WS_URL = 'http://localhost:3001'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Mock Web APIs that aren't available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = jest.fn()
  unobserve = jest.fn()
  disconnect = jest.fn()
  constructor(callback: ResizeObserverCallback) {}
} as any

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe = jest.fn()
  unobserve = jest.fn()
  disconnect = jest.fn()
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {}
} as any

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('')),
  },
  writable: true,
  configurable: true,
})

// Mock geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
  },
  writable: true,
})

// Mock vibration API
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(),
  writable: true,
})

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn().mockReturnValue([]),
    getEntriesByName: jest.fn().mockReturnValue([]),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    now: jest.fn().mockReturnValue(1000),
  },
  writable: true,
})

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
  return setTimeout(() => cb(Date.now()), 16) as any
}) as any
global.cancelAnimationFrame = jest.fn((id: number) => {
  clearTimeout(id as any)
}) as any

// Mock scrollTo
window.scrollTo = jest.fn()

// Remove global fetch mock to allow MSW to work
// global.fetch = jest.fn()

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

// Add polyfill for hasPointerCapture which is missing in jsdom (needed for Radix UI)
if (typeof Element !== 'undefined' && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = function() {
    return false
  }
  Element.prototype.setPointerCapture = function() {}
  Element.prototype.releasePointerCapture = function() {}
}

// Add scrollIntoView mock for jsdom (needed for Radix UI Select)
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn()
}

// Mock framer-motion to remove animations
jest.mock('framer-motion', () => {
  const React = require('react')
  const forwardRef = React.forwardRef
  
  const createMotionComponent = (type: string) => 
    forwardRef(({ children, ...props }: any, ref: any) => {
      // Remove any animation-related props
      const cleanProps = { ...props }
      delete cleanProps.initial
      delete cleanProps.animate
      delete cleanProps.exit
      delete cleanProps.whileHover
      delete cleanProps.whileTap
      delete cleanProps.whileInView
      delete cleanProps.layout
      delete cleanProps.transition
      delete cleanProps.variants
      delete cleanProps.dragConstraints
      delete cleanProps.drag
      // Remove animation styles
      if (cleanProps.style) {
        delete cleanProps.style.opacity
        delete cleanProps.style.transform
        delete cleanProps.style.x
        delete cleanProps.style.y
        delete cleanProps.style.scale
      }
      return React.createElement(type, { ...cleanProps, ref }, children)
    })
  
  return {
    motion: {
      div: createMotionComponent('div'),
      span: createMotionComponent('span'),
      button: createMotionComponent('button'),
      a: createMotionComponent('a'),
      h1: createMotionComponent('h1'),
      h2: createMotionComponent('h2'),
      h3: createMotionComponent('h3'),
      h4: createMotionComponent('h4'),
      h5: createMotionComponent('h5'),
      h6: createMotionComponent('h6'),
      p: createMotionComponent('p'),
      section: createMotionComponent('section'),
      article: createMotionComponent('article'),
      main: createMotionComponent('main'),
      nav: createMotionComponent('nav'),
      aside: createMotionComponent('aside'),
      form: createMotionComponent('form'),
      input: createMotionComponent('input'),
      textarea: createMotionComponent('textarea'),
      img: createMotionComponent('img'),
      svg: createMotionComponent('svg'),
      path: createMotionComponent('path'),
      g: createMotionComponent('g'),
      circle: createMotionComponent('circle'),
      rect: createMotionComponent('rect'),
      ul: createMotionComponent('ul'),
      ol: createMotionComponent('ol'),
      li: createMotionComponent('li'),
    },
    AnimatePresence: ({ children }: any) => children,
    useAnimation: () => ({
      start: jest.fn(),
      stop: jest.fn(),
      set: jest.fn(),
    }),
    useInView: () => [null, true],
    useMotionValue: (initial: any) => ({
      get: () => initial,
      set: jest.fn(),
      onChange: jest.fn(),
    }),
    useTransform: () => ({
      get: () => 0,
      set: jest.fn(),
      onChange: jest.fn(),
    }),
    useSpring: () => ({
      get: () => 0,
      set: jest.fn(),
      onChange: jest.fn(),
    }),
    useScroll: () => ({
      scrollX: { get: () => 0 },
      scrollY: { get: () => 0 },
      scrollXProgress: { get: () => 0 },
      scrollYProgress: { get: () => 0 },
    }),
  }
})

// Mock react-dropzone
jest.mock('react-dropzone', () => {
  const dropzoneState = {
    callbacks: {
      onDrop: null as any,
    },
    state: {
      isDragActive: false,
      isDragAccept: false,
      isDragReject: false,
    }
  }

  // Make it available globally for tests
  if (typeof window !== 'undefined') {
    (window as any).__dropzoneState = dropzoneState
  }

  return {
    useDropzone: (config: any) => {
      // Store callbacks
      dropzoneState.callbacks.onDrop = config?.onDrop
      
      return {
        getRootProps: () => ({ 
          role: 'presentation',
          tabIndex: 0,
          onClick: jest.fn(),
        }),
        getInputProps: () => ({ 
          type: 'file',
          multiple: config?.multiple !== false,
          accept: config?.accept ? Object.keys(config.accept || {}).join(',') : '',
          style: { display: 'none' },
        }),
        isDragActive: dropzoneState.state.isDragActive,
        isDragAccept: dropzoneState.state.isDragAccept,
        isDragReject: dropzoneState.state.isDragReject,
        acceptedFiles: [],
        rejectedFiles: [],
      }
    },
  }
})

// Silence console warnings in tests unless TEST_VERBOSE is set
if (!process.env.TEST_VERBOSE) {
  const originalConsoleWarn = console.warn
  const originalConsoleError = console.error

  console.warn = (...args) => {
    // Ignore specific warnings that are expected in tests
    const warning = args[0]
    if (
      typeof warning === 'string' &&
      (warning.includes('validateDOMNesting') ||
        warning.includes('React does not recognize') ||
        warning.includes('componentWillReceiveProps'))
    ) {
      return
    }
    originalConsoleWarn(...args)
  }

  console.error = (...args) => {
    // Ignore specific errors that are expected in tests
    const error = args[0]
    if (
      typeof error === 'string' &&
      (error.includes('Warning: ReactDOM.render is no longer supported') ||
        error.includes('Warning: An invalid form control'))
    ) {
      return
    }
    originalConsoleError(...args)
  }
}

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveAccessibleName(name: string): R
      toHaveAccessibleDescription(description: string): R
      toBeVisible(): R
      toBeInTheDocument(): R
    }
  }
}

export {}