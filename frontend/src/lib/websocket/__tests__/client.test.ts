import { jest } from '@jest/globals'
import { toast } from '@/hooks/use-toast'
import {
  WebSocketClient,
  getWebSocketClient,
  destroyWebSocketClient,
  ConnectionState,
  CollaborationUser,
  UserPresence,
  ContentChange,
  CursorPosition,
  RealtimeNotification,
  CollaborationEvents
} from '../client'

// Mock modules
jest.mock('socket.io-client')
jest.mock('@/hooks/use-toast')

// Import after mocking
import { io, Socket } from 'socket.io-client'

const mockedIo = jest.mocked(io)
const mockedToast = jest.mocked(toast)

// Helper to create mock socket
function createMockSocket(): jest.Mocked<Socket> {
  const mockSocket = {
    connected: false,
    id: 'mock-socket-id',
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  } as unknown as jest.Mocked<Socket>

  // Setup event handler storage
  const eventHandlers: Record<string, Set<Function>> = {}
  
  mockSocket.on.mockImplementation((event: string, handler: any) => {
    if (!eventHandlers[event]) {
      eventHandlers[event] = new Set()
    }
    eventHandlers[event].add(handler)
    return mockSocket
  })

  mockSocket.off.mockImplementation((event: string, handler: Function) => {
    if (eventHandlers[event]) {
      eventHandlers[event].delete(handler)
    }
    return mockSocket
  })

  // Helper to trigger events in tests
  ;(mockSocket as any).__trigger = (event: string, ...args: any[]) => {
    const handlers = eventHandlers[event]
    if (handlers) {
      handlers.forEach(handler => handler(...args))
    }
  }

  return mockSocket
}

describe('WebSocketClient', () => {
  let client: WebSocketClient
  let mockSocket: jest.Mocked<Socket>
  let originalConsoleLog: typeof console.log
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    })

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true
    })

    // Mock window event listeners
    const eventListeners: Record<string, Set<Function>> = {}
    ;(window.addEventListener as any) = jest.fn((event: string, handler: Function) => {
      if (!eventListeners[event]) {
        eventListeners[event] = new Set()
      }
      eventListeners[event].add(handler)
    })
    ;(window.removeEventListener as any) = jest.fn((event: string, handler: Function) => {
      if (eventListeners[event]) {
        eventListeners[event].delete(handler)
      }
    })
    ;(window as any).__triggerEvent = (event: string) => {
      const handlers = eventListeners[event]
      if (handlers) {
        handlers.forEach(handler => handler())
      }
    }

    // Setup console log spy
    originalConsoleLog = console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    // Setup mock socket
    mockSocket = createMockSocket()
    mockedIo.mockReturnValue(mockSocket as any)

    // Mock process.env
    ;(process.env as any).NODE_ENV = 'development'
    process.env.NEXT_PUBLIC_WS_URL = 'http://test-server:3001'
  })

  afterEach(() => {
    console.log = originalConsoleLog
    if (client) {
      client.destroy()
    }
    destroyWebSocketClient()
  })

  describe('Constructor and initialization', () => {
    it('should create client with default options', () => {
      // Set token to prevent auto-connect error
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('test-token')
      
      client = new WebSocketClient()
      
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('should create client with custom options', () => {
      const options = {
        autoConnect: false,
        reconnectionAttempts: 10,
        heartbeatInterval: 60000
      }
      
      client = new WebSocketClient(options)
      
      expect(mockedIo).not.toHaveBeenCalled() // autoConnect is false
    })

    it('should auto-connect when enabled', () => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('test-token')
      
      client = new WebSocketClient({ autoConnect: true })
      
      expect(mockedIo).toHaveBeenCalledWith(
        'http://test-server:3001',
        expect.objectContaining({
          auth: { token: 'test-token' },
          transports: ['websocket', 'polling']
        })
      )
    })
  })

  describe('Connection lifecycle', () => {
    beforeEach(() => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('test-token')
      client = new WebSocketClient({ autoConnect: false })
    })

    it('should connect successfully with token', async () => {
      await client.connect('custom-token')
      
      expect(mockedIo).toHaveBeenCalledWith(
        'http://test-server:3001',
        expect.objectContaining({
          auth: { token: 'custom-token' }
        })
      )
    })

    it('should use stored token if none provided', async () => {
      await client.connect()
      
      expect(mockedIo).toHaveBeenCalledWith(
        'http://test-server:3001',
        expect.objectContaining({
          auth: { token: 'test-token' }
        })
      )
    })

    it('should throw error if no token available', async () => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue(null)
      
      await expect(client.connect()).rejects.toThrow('No authentication token available')
    })

    it('should not reconnect if already connected', async () => {
      await client.connect()
      mockSocket.connected = true
      
      await client.connect()
      
      expect(mockedIo).toHaveBeenCalledTimes(1)
    })

    it('should handle connect event', async () => {
      await client.connect()
      
      mockSocket.connected = true
      ;(mockSocket as any).__trigger('connect')
      
      expect(mockedToast).toHaveBeenCalledWith({
        title: 'Connected',
        description: 'Real-time collaboration is now active',
        variant: 'success'
      })
      expect(client.getConnectionState()).toBe('connected')
    })

    it('should handle disconnect event', async () => {
      await client.connect()
      mockSocket.connected = true
      ;(mockSocket as any).__trigger('connect')
      
      mockSocket.connected = false
      ;(mockSocket as any).__trigger('disconnect', 'transport close')
      
      expect(client.getConnectionState()).toBe('disconnected')
    })

    it('should disconnect properly', async () => {
      await client.connect()
      
      client.disconnect()
      
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(client.getConnectionState()).toBe('disconnected')
    })
  })

  describe('Event handling', () => {
    beforeEach(async () => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('test-token')
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
    })

    it('should subscribe to events', () => {
      const handler = jest.fn()
      
      const unsubscribe = client.on('user_joined', handler)
      
      expect(mockSocket.on).toHaveBeenCalledWith('user_joined', handler)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should unsubscribe from events', () => {
      const handler = jest.fn()
      
      const unsubscribe = client.on('user_joined', handler)
      unsubscribe()
      
      expect(mockSocket.off).toHaveBeenCalledWith('user_joined', handler)
    })

    it('should handle multiple subscribers for same event', () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      
      client.on('user_joined', handler1)
      client.on('user_joined', handler2)
      
      const user: CollaborationUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        color: '#FF0000',
        role: 'editor',
        lastSeen: new Date()
      }
      
      ;(mockSocket as any).__trigger('user_joined', user)
      
      expect(handler1).toHaveBeenCalledWith(user)
      expect(handler2).toHaveBeenCalledWith(user)
    })

    it('should forward collaboration events', () => {
      const handlers: Record<string, jest.Mock> = {
        user_left: jest.fn(),
        content_change: jest.fn(),
        cursor_position: jest.fn(),
        notification: jest.fn()
      }
      
      Object.entries(handlers).forEach(([event, handler]) => {
        client.on(event as keyof CollaborationEvents, handler as any)
      })
      
      ;(mockSocket as any).__trigger('user_left', 'user-123')
      ;(mockSocket as any).__trigger('content_change', { id: 'change-1' })
      ;(mockSocket as any).__trigger('cursor_position', { userId: 'user-1' })
      ;(mockSocket as any).__trigger('notification', { id: 'notif-1' })
      
      expect(handlers.user_left).toHaveBeenCalledWith('user-123')
      expect(handlers.content_change).toHaveBeenCalledWith({ id: 'change-1' })
      expect(handlers.cursor_position).toHaveBeenCalledWith({ userId: 'user-1' })
      expect(handlers.notification).toHaveBeenCalledWith({ id: 'notif-1' })
    })
  })

  describe('Emit functionality', () => {
    beforeEach(async () => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('test-token')
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
      mockSocket.connected = true
    })

    it('should emit events when connected', () => {
      client.emit('test_event', { data: 'test' })
      
      expect(mockSocket.emit).toHaveBeenCalledWith('test_event', { data: 'test' })
    })

    it('should queue events when offline', () => {
      // Trigger offline event to update internal state
      Object.defineProperty(navigator, 'onLine', { value: false })
      ;(window as any).__triggerEvent('offline')
      
      client.emit('offline_event', { data: 'queued' })
      
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    it('should queue events when disconnected', () => {
      mockSocket.connected = false
      
      client.emit('disconnected_event', { data: 'queued' })
      
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    it('should process offline queue when reconnected', () => {
      // Queue some events while offline
      Object.defineProperty(navigator, 'onLine', { value: false })
      client.emit('event1', { data: '1' })
      client.emit('event2', { data: '2' })
      
      // Go back online and trigger connect
      Object.defineProperty(navigator, 'onLine', { value: true })
      mockSocket.connected = true
      ;(mockSocket as any).__trigger('connect')
      
      expect(mockSocket.emit).toHaveBeenCalledWith('event1', { data: '1' })
      expect(mockSocket.emit).toHaveBeenCalledWith('event2', { data: '2' })
    })
  })

  describe('Room management', () => {
    beforeEach(async () => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('test-token')
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
      mockSocket.connected = true
    })

    it('should join course room', () => {
      client.joinCourse('course-123')
      
      expect(mockSocket.emit).toHaveBeenCalledWith('join_course', { courseId: 'course-123' })
    })

    it('should leave course room', () => {
      client.leaveCourse('course-123')
      
      expect(mockSocket.emit).toHaveBeenCalledWith('leave_course', { courseId: 'course-123' })
    })
  })

  describe('Collaboration features', () => {
    beforeEach(async () => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('test-token')
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
      mockSocket.connected = true
    })

    it('should update user presence', () => {
      const presence: Partial<UserPresence> = {
        status: 'online',
        currentPage: '/course/123',
        lastActivity: new Date()
      }
      
      client.updatePresence(presence)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('presence_update', presence)
    })

    it('should send content change with generated id and timestamp', () => {
      const change = {
        userId: 'user-1',
        type: 'insert' as const,
        target: {
          courseId: 'course-123',
          sessionId: 'session-456'
        },
        data: { text: 'New content' }
      }
      
      client.sendContentChange(change)
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'content_change',
        expect.objectContaining({
          ...change,
          id: expect.stringMatching(/^\d+-[a-z0-9]+$/),
          timestamp: expect.any(Date)
        })
      )
    })

    it('should send cursor position with timestamp', () => {
      const position = {
        userId: 'user-1',
        position: {
          line: 10,
          column: 5,
          blockId: 'block-123'
        },
        color: '#FF0000'
      }
      
      client.sendCursorPosition(position)
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'cursor_position',
        expect.objectContaining({
          ...position,
          timestamp: expect.any(Date)
        })
      )
    })

    it('should send notification with generated id and timestamp', () => {
      const notification = {
        type: 'info' as const,
        title: 'Test Notification',
        message: 'This is a test',
        persistent: true
      }
      
      client.sendNotification(notification)
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({
          ...notification,
          id: expect.stringMatching(/^\d+-[a-z0-9]+$/),
          timestamp: expect.any(Date)
        })
      )
    })
  })

  describe('Auto-reconnection and exponential backoff', () => {
    beforeEach(async () => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('test-token')
      jest.useFakeTimers()
      client = new WebSocketClient({ 
        autoConnect: false,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        maxReconnectionDelay: 5000
      })
      await client.connect()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should attempt reconnection on server disconnect', () => {
      mockSocket.connect.mockClear()
      ;(mockSocket as any).__trigger('disconnect', 'io server disconnect')
      
      expect(mockSocket.connect).not.toHaveBeenCalled()
      
      jest.advanceTimersByTime(1000)
      
      expect(mockSocket.connect).toHaveBeenCalledTimes(1)
    })

    it('should use exponential backoff for reconnection attempts', () => {
      mockSocket.connect.mockClear()
      
      // First attempt - 1000ms delay
      ;(mockSocket as any).__trigger('disconnect', 'io server disconnect')
      jest.advanceTimersByTime(1000)
      expect(mockSocket.connect).toHaveBeenCalledTimes(1)
      
      // Simulate failure and trigger another disconnect
      ;(mockSocket as any).__trigger('disconnect', 'io server disconnect')
      // Second attempt - 2000ms delay
      jest.advanceTimersByTime(2000)
      expect(mockSocket.connect).toHaveBeenCalledTimes(2)
      
      // Simulate another failure
      ;(mockSocket as any).__trigger('disconnect', 'io server disconnect')
      // Third attempt - 4000ms delay
      jest.advanceTimersByTime(4000)
      expect(mockSocket.connect).toHaveBeenCalledTimes(3)
    })

    it('should stop reconnecting after max attempts', () => {
      mockSocket.connect.mockClear()
      
      // Exhaust all reconnection attempts
      ;(mockSocket as any).__trigger('disconnect', 'io server disconnect')
      
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(10000)
        if (i < 2) {
          ;(mockSocket as any).__trigger('reconnect_error', new Error('Failed'))
        }
      }
      
      // Final error should show toast
      ;(mockSocket as any).__trigger('reconnect_error', new Error('Failed'))
      
      expect(mockedToast).toHaveBeenCalledWith({
        title: 'Connection Lost',
        description: 'Unable to restore connection. Working in offline mode.',
        variant: 'destructive'
      })
      
      // No more reconnection attempts
      mockSocket.connect.mockClear()
      jest.advanceTimersByTime(10000)
      expect(mockSocket.connect).not.toHaveBeenCalled()
    })

    it('should handle successful reconnection', () => {
      ;(mockSocket as any).__trigger('reconnect', 2)
      
      expect(mockedToast).toHaveBeenCalledWith({
        title: 'Reconnected',
        description: 'Connection restored successfully',
        variant: 'success'
      })
      expect(client.getConnectionState()).toBe('connected')
    })
  })

  describe('Offline/Online handling', () => {
    beforeEach(async () => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('test-token')
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
      mockSocket.connected = true
    })

    it('should handle going offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false })
      ;(window as any).__triggerEvent('offline')
      
      expect(mockedToast).toHaveBeenCalledWith({
        title: 'Offline Mode',
        description: 'Changes will be synced when connection is restored',
        variant: 'warning'
      })
    })

    it('should reconnect when coming back online', () => {
      // Go offline first
      mockSocket.connected = false
      Object.defineProperty(navigator, 'onLine', { value: false })
      ;(window as any).__triggerEvent('offline')
      
      // Clear mocks
      mockedIo.mockClear()
      
      // Come back online
      Object.defineProperty(navigator, 'onLine', { value: true })
      ;(window as any).__triggerEvent('online')
      
      expect(mockedIo).toHaveBeenCalled()
    })

    it('should process offline queue when coming back online while connected', () => {
      // Trigger offline event first to update internal state
      Object.defineProperty(navigator, 'onLine', { value: false })
      ;(window as any).__triggerEvent('offline')
      
      // Queue events while offline
      client.emit('offline_event1', { data: '1' })
      client.emit('offline_event2', { data: '2' })
      
      // Clear emit calls
      mockSocket.emit.mockClear()
      
      // Come back online while still connected
      Object.defineProperty(navigator, 'onLine', { value: true })
      ;(window as any).__triggerEvent('online')
      
      expect(mockSocket.emit).toHaveBeenCalledWith('offline_event1', { data: '1' })
      expect(mockSocket.emit).toHaveBeenCalledWith('offline_event2', { data: '2' })
    })
  })

  describe('Heartbeat mechanism', () => {
    beforeEach(async () => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('test-token')
      jest.useFakeTimers()
      client = new WebSocketClient({ 
        autoConnect: false,
        heartbeatInterval: 30000
      })
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should start heartbeat on connection', async () => {
      await client.connect()
      mockSocket.connected = true
      
      mockSocket.emit.mockClear()
      jest.advanceTimersByTime(30000)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('ping')
    })

    it('should stop heartbeat on disconnect', async () => {
      await client.connect()
      mockSocket.connected = true
      
      client.disconnect()
      
      mockSocket.emit.mockClear()
      jest.advanceTimersByTime(30000)
      
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    it('should send heartbeat at regular intervals', async () => {
      await client.connect()
      mockSocket.connected = true
      
      mockSocket.emit.mockClear()
      
      // First heartbeat
      jest.advanceTimersByTime(30000)
      expect(mockSocket.emit).toHaveBeenCalledTimes(1)
      expect(mockSocket.emit).toHaveBeenCalledWith('ping')
      
      // Second heartbeat
      jest.advanceTimersByTime(30000)
      expect(mockSocket.emit).toHaveBeenCalledTimes(2)
      
      // Third heartbeat
      jest.advanceTimersByTime(30000)
      expect(mockSocket.emit).toHaveBeenCalledTimes(3)
    })
  })

  describe('Authentication token handling', () => {
    it('should use token from localStorage', async () => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('stored-token')
      client = new WebSocketClient({ autoConnect: false })
      
      await client.connect()
      
      expect(localStorage.getItem).toHaveBeenCalledWith('auth_token')
      expect(mockedIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: { token: 'stored-token' }
        })
      )
    })

    it('should prefer provided token over stored token', async () => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('stored-token')
      client = new WebSocketClient({ autoConnect: false })
      
      await client.connect('provided-token')
      
      expect(mockedIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: { token: 'provided-token' }
        })
      )
    })

    it('should throw error when no token is available', async () => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue(null)
      client = new WebSocketClient({ autoConnect: false })
      
      await expect(client.connect()).rejects.toThrow('No authentication token available')
    })
  })

  describe('Error scenarios and edge cases', () => {
    beforeEach(() => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('test-token')
    })

    it('should handle connection errors gracefully', async () => {
      mockedIo.mockImplementation(() => {
        throw new Error('Connection failed')
      })
      
      client = new WebSocketClient({ autoConnect: false })
      
      await expect(client.connect()).rejects.toThrow('Connection failed')
      expect(client.getConnectionState()).toBe('error')
    })

    it('should handle missing environment variables', async () => {
      delete process.env.NEXT_PUBLIC_WS_URL
      client = new WebSocketClient({ autoConnect: false })
      
      await client.connect()
      
      expect(mockedIo).toHaveBeenCalledWith(
        'http://localhost:3001',
        expect.any(Object)
      )
    })

    it('should handle event emission without data', async () => {
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
      mockSocket.connected = true
      
      client.emit('test_event')
      
      expect(mockSocket.emit).toHaveBeenCalledWith('test_event', undefined)
    })

    it('should clean up properly on destroy', () => {
      client = new WebSocketClient({ autoConnect: false })
      
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
      
      client.destroy()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
      expect(client.isConnected()).toBe(false)
    })

    it('should handle logging when disabled', () => {
      ;(process.env as any).NODE_ENV = 'production'
      client = new WebSocketClient({ 
        autoConnect: false,
        enableLogging: false 
      })
      
      client.emit('test_event')
      
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should handle logging when enabled', async () => {
      client = new WebSocketClient({ 
        autoConnect: false,
        enableLogging: true 
      })
      
      await client.connect()
      mockSocket.connected = true
      client.emit('test_event', { data: 'test' })
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[WebSocket] Emitted: test_event',
        { data: 'test' }
      )
    })
  })

  describe('Connection state management', () => {
    beforeEach(() => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('test-token')
      client = new WebSocketClient({ autoConnect: false })
    })

    it('should track connection states correctly', async () => {
      expect(client.getConnectionState()).toBe('disconnected')
      
      const connectPromise = client.connect()
      expect(client.getConnectionState()).toBe('connecting')
      
      await connectPromise
      mockSocket.connected = true
      ;(mockSocket as any).__trigger('connect')
      expect(client.getConnectionState()).toBe('connected')
      
      ;(mockSocket as any).__trigger('disconnect', 'transport close')
      expect(client.getConnectionState()).toBe('disconnected')
    })

    it('should report connection status correctly', async () => {
      expect(client.isConnected()).toBe(false)
      
      await client.connect()
      expect(client.isConnected()).toBe(false)
      
      mockSocket.connected = true
      expect(client.isConnected()).toBe(true)
      
      mockSocket.connected = false
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('Singleton pattern', () => {
    beforeEach(() => {
      ;(localStorage.getItem as jest.Mock) = jest.fn().mockReturnValue('test-token')
    })

    it('should return same instance from getWebSocketClient', () => {
      const instance1 = getWebSocketClient()
      const instance2 = getWebSocketClient()
      
      expect(instance1).toBe(instance2)
    })

    it('should create new instance after destroy', () => {
      const instance1 = getWebSocketClient()
      destroyWebSocketClient()
      const instance2 = getWebSocketClient()
      
      expect(instance1).not.toBe(instance2)
    })

    it('should pass options to first instance only', () => {
      const options1 = { heartbeatInterval: 10000, autoConnect: false }
      const options2 = { heartbeatInterval: 20000, autoConnect: false }
      
      const instance1 = getWebSocketClient(options1)
      const instance2 = getWebSocketClient(options2)
      
      expect(instance1).toBe(instance2)
      // Options from second call are ignored
    })
  })
})