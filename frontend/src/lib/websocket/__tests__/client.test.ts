import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { Socket } from 'socket.io-client'
import { WebSocketClient, getWebSocketClient, destroyWebSocketClient } from '../client'
import * as toastModule from '@/hooks/use-toast'

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(),
  Socket: jest.fn(),
}))

// Mock use-toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

describe('WebSocketClient', () => {
  let mockSocket: any
  let client: WebSocketClient
  const mockToast = toastModule.toast as jest.MockedFunction<typeof toastModule.toast>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-auth-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    })

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    })

    // Create mock socket
    mockSocket = {
      connected: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    }

    // Mock io function to return our mock socket
    const io = require('socket.io-client').io as jest.MockedFunction<any>
    io.mockReturnValue(mockSocket)
  })

  afterEach(() => {
    jest.useRealTimers()
    if (client) {
      client.destroy()
    }
    destroyWebSocketClient()
  })

  describe('constructor', () => {
    it('should create instance with default options', () => {
      client = new WebSocketClient()
      
      expect(client).toBeDefined()
      expect(client.getConnectionState()).toBe('disconnected')
    })

    it('should auto-connect when autoConnect is true', () => {
      const io = require('socket.io-client').io as jest.MockedFunction<any>
      
      client = new WebSocketClient({ autoConnect: true })
      
      expect(io).toHaveBeenCalled()
    })

    it('should not auto-connect when autoConnect is false', () => {
      const io = require('socket.io-client').io as jest.MockedFunction<any>
      io.mockClear()
      
      client = new WebSocketClient({ autoConnect: false })
      
      expect(io).not.toHaveBeenCalled()
    })

    it('should accept custom options', () => {
      client = new WebSocketClient({
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        heartbeatInterval: 60000,
      })
      
      expect(client).toBeDefined()
    })
  })

  describe('connect', () => {
    it('should establish connection with auth token', async () => {
      const io = require('socket.io-client').io as jest.MockedFunction<any>
      
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
      
      expect(io).toHaveBeenCalledWith(
        'http://localhost:3001',
        expect.objectContaining({
          auth: { token: 'mock-auth-token' },
          transports: ['websocket', 'polling'],
        })
      )
    })

    it('should use provided token over localStorage', async () => {
      const io = require('socket.io-client').io as jest.MockedFunction<any>
      
      client = new WebSocketClient({ autoConnect: false })
      await client.connect('custom-token')
      
      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: { token: 'custom-token' },
        })
      )
    })

    it('should throw error when no auth token available', async () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue(null)
      
      client = new WebSocketClient({ autoConnect: false })
      
      await expect(client.connect()).rejects.toThrow('No authentication token available')
    })

    it('should not connect if already connected', async () => {
      const io = require('socket.io-client').io as jest.MockedFunction<any>
      mockSocket.connected = true
      
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
      
      io.mockClear()
      await client.connect()
      
      expect(io).not.toHaveBeenCalled()
    })

    it('should use custom WebSocket URL from environment', async () => {
      const io = require('socket.io-client').io as jest.MockedFunction<any>
      process.env.NEXT_PUBLIC_WS_URL = 'ws://custom-server:8080'
      
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
      
      expect(io).toHaveBeenCalledWith(
        'ws://custom-server:8080',
        expect.any(Object)
      )
    })
  })

  describe('disconnect', () => {
    it('should disconnect socket and clear heartbeat', async () => {
      client = new WebSocketClient()
      await client.connect()
      
      client.disconnect()
      
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(client.getConnectionState()).toBe('disconnected')
      expect(client.isConnected()).toBe(false)
    })

    it('should handle disconnect when not connected', () => {
      client = new WebSocketClient({ autoConnect: false })
      
      // Should not throw
      expect(() => client.disconnect()).not.toThrow()
    })
  })

  describe('connection state management', () => {
    it('should track connection state changes', async () => {
      client = new WebSocketClient({ autoConnect: false })
      
      expect(client.getConnectionState()).toBe('disconnected')
      
      await client.connect()
      expect(client.getConnectionState()).toBe('connecting')
      
      // Simulate successful connection
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1]
      mockSocket.connected = true
      connectHandler?.()
      
      expect(client.getConnectionState()).toBe('connected')
    })

    it('should return correct isConnected status', async () => {
      client = new WebSocketClient({ autoConnect: false })
      
      expect(client.isConnected()).toBe(false)
      
      await client.connect()
      mockSocket.connected = true
      
      expect(client.isConnected()).toBe(true)
    })
  })

  describe('event handling', () => {
    beforeEach(async () => {
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
    })

    it('should handle connect event', () => {
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1]
      
      mockSocket.connected = true
      connectHandler?.()
      
      expect(client.getConnectionState()).toBe('connected')
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Connected',
        description: 'Real-time collaboration is now active',
        variant: 'success',
      })
    })

    it('should handle disconnect event', () => {
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]
      
      disconnectHandler?.('io server disconnect')
      
      expect(client.getConnectionState()).toBe('disconnected')
    })

    it('should handle reconnect event', () => {
      const reconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect'
      )?.[1]
      
      reconnectHandler?.(3)
      
      expect(client.getConnectionState()).toBe('connected')
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Reconnected',
        description: 'Connection restored successfully',
        variant: 'success',
      })
    })

    it('should handle reconnect_error event', () => {
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect_error'
      )?.[1]
      
      const error = new Error('Connection failed')
      errorHandler?.(error)
      
      expect(mockToast).not.toHaveBeenCalled() // First attempt doesn't show toast
      
      // Simulate max reconnection attempts
      for (let i = 0; i < 5; i++) {
        errorHandler?.(error)
      }
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Connection Lost',
        description: 'Unable to restore connection. Working in offline mode.',
        variant: 'destructive',
      })
    })
  })

  describe('event subscription', () => {
    beforeEach(async () => {
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
    })

    it('should subscribe to events', () => {
      const callback = jest.fn()
      const unsubscribe = client.on('user_joined', callback)
      
      expect(mockSocket.on).toHaveBeenCalledWith('user_joined', callback)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should unsubscribe from events', () => {
      const callback = jest.fn()
      const unsubscribe = client.on('user_joined', callback)
      
      unsubscribe()
      
      expect(mockSocket.off).toHaveBeenCalledWith('user_joined', callback)
    })

    it('should handle multiple listeners for same event', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()
      
      client.on('content_change', callback1)
      client.on('content_change', callback2)
      
      expect(mockSocket.on).toHaveBeenCalledWith('content_change', callback1)
      expect(mockSocket.on).toHaveBeenCalledWith('content_change', callback2)
    })

    it('should forward events to listeners', () => {
      const callback = jest.fn()
      client.on('notification', callback)
      
      // Find and trigger the event handler
      const notificationHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'notification'
      )?.[1]
      
      const notification = {
        id: '123',
        type: 'info' as const,
        title: 'Test',
        message: 'Test message',
        timestamp: new Date(),
      }
      
      notificationHandler?.(notification)
      
      expect(callback).toHaveBeenCalledWith(notification)
    })
  })

  describe('emit methods', () => {
    beforeEach(async () => {
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
      mockSocket.connected = true
    })

    it('should emit events when connected', () => {
      client.emit('test_event', { data: 'test' })
      
      expect(mockSocket.emit).toHaveBeenCalledWith('test_event', { data: 'test' })
    })

    it('should queue events when offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
      
      client.emit('test_event', { data: 'test' })
      
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    it('should queue events when disconnected', () => {
      mockSocket.connected = false
      
      client.emit('test_event', { data: 'test' })
      
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })
  })

  describe('room management', () => {
    beforeEach(async () => {
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

  describe('presence and collaboration', () => {
    beforeEach(async () => {
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
      mockSocket.connected = true
    })

    it('should update user presence', () => {
      const presence = {
        status: 'online' as const,
        currentPage: '/course/123',
        lastActivity: new Date(),
      }
      
      client.updatePresence(presence)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('presence_update', presence)
    })

    it('should send content changes with generated ID', () => {
      const change = {
        userId: 'user-123',
        type: 'insert' as const,
        target: {
          courseId: 'course-123',
          blockId: 'block-456',
        },
        data: { text: 'New content' },
      }
      
      client.sendContentChange(change)
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'content_change',
        expect.objectContaining({
          ...change,
          id: expect.any(String),
          timestamp: expect.any(Date),
        })
      )
    })

    it('should send cursor position', () => {
      const position = {
        userId: 'user-123',
        position: {
          line: 10,
          column: 5,
          blockId: 'block-456',
        },
        color: '#FF0000',
      }
      
      client.sendCursorPosition(position)
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'cursor_position',
        expect.objectContaining({
          ...position,
          timestamp: expect.any(Date),
        })
      )
    })

    it('should send notifications', () => {
      const notification = {
        type: 'success' as const,
        title: 'Test',
        message: 'Test notification',
      }
      
      client.sendNotification(notification)
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({
          ...notification,
          id: expect.any(String),
          timestamp: expect.any(Date),
        })
      )
    })
  })

  describe('heartbeat', () => {
    it('should start heartbeat on connection', async () => {
      client = new WebSocketClient({ 
        autoConnect: false,
        heartbeatInterval: 1000,
      })
      await client.connect()
      mockSocket.connected = true
      
      jest.advanceTimersByTime(1000)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('ping')
      
      jest.advanceTimersByTime(1000)
      
      expect(mockSocket.emit).toHaveBeenCalledTimes(2)
    })

    it('should stop heartbeat on disconnect', async () => {
      client = new WebSocketClient({ 
        autoConnect: false,
        heartbeatInterval: 1000,
      })
      await client.connect()
      mockSocket.connected = true
      
      client.disconnect()
      
      jest.advanceTimersByTime(2000)
      
      expect(mockSocket.emit).not.toHaveBeenCalledWith('ping')
    })
  })

  describe('offline/online handling', () => {
    beforeEach(async () => {
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
      mockSocket.connected = true
    })

    it('should handle going offline', () => {
      const offlineEvent = new Event('offline')
      window.dispatchEvent(offlineEvent)
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Offline Mode',
        description: 'Changes will be synced when connection is restored',
        variant: 'warning',
      })
    })

    it('should handle coming back online', () => {
      // First go offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
      const offlineEvent = new Event('offline')
      window.dispatchEvent(offlineEvent)
      
      // Then come back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
      mockSocket.connected = false
      
      const onlineEvent = new Event('online')
      window.dispatchEvent(onlineEvent)
      
      // Should attempt to reconnect
      expect(mockSocket.connect).toHaveBeenCalled()
    })

    it('should process offline queue when reconnecting', () => {
      // Queue some events while offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
      client.emit('event1', { data: 1 })
      client.emit('event2', { data: 2 })
      
      // Come back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
      mockSocket.connected = true
      
      // Trigger connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1]
      connectHandler?.()
      
      // Should emit queued events
      expect(mockSocket.emit).toHaveBeenCalledWith('event1', { data: 1 })
      expect(mockSocket.emit).toHaveBeenCalledWith('event2', { data: 2 })
    })
  })

  describe('reconnection logic', () => {
    beforeEach(async () => {
      client = new WebSocketClient({ 
        autoConnect: false,
        reconnectionAttempts: 3,
        reconnectionDelay: 100,
        maxReconnectionDelay: 500,
      })
      await client.connect()
    })

    it('should attempt reconnection on server disconnect', () => {
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]
      
      disconnectHandler?.('io server disconnect')
      
      jest.advanceTimersByTime(100)
      
      expect(mockSocket.connect).toHaveBeenCalled()
    })

    it('should use exponential backoff for reconnection', () => {
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]
      
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect_error'
      )?.[1]
      
      // First disconnect
      disconnectHandler?.('io server disconnect')
      
      // First attempt after 100ms
      jest.advanceTimersByTime(100)
      expect(mockSocket.connect).toHaveBeenCalledTimes(1)
      
      // Simulate failure
      errorHandler?.(new Error('Failed'))
      
      // Second attempt after 200ms (100 * 2)
      jest.advanceTimersByTime(200)
      expect(mockSocket.connect).toHaveBeenCalledTimes(2)
      
      // Simulate another failure
      errorHandler?.(new Error('Failed'))
      
      // Third attempt after 400ms (100 * 2^2)
      jest.advanceTimersByTime(400)
      expect(mockSocket.connect).toHaveBeenCalledTimes(3)
    })

    it('should respect max reconnection delay', () => {
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]
      
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect_error'
      )?.[1]
      
      // Simulate multiple failures
      disconnectHandler?.('io server disconnect')
      
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(500) // Max delay
        mockSocket.connect.mockClear()
        errorHandler?.(new Error('Failed'))
      }
      
      // Should still use max delay of 500ms
      jest.advanceTimersByTime(500)
      expect(mockSocket.connect).toHaveBeenCalled()
    })

    it('should stop reconnecting after max attempts', () => {
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect_error'
      )?.[1]
      
      // Simulate max reconnection attempts
      for (let i = 0; i < 3; i++) {
        errorHandler?.(new Error('Failed'))
      }
      
      // Should show error toast
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Connection Lost',
        description: 'Unable to restore connection. Working in offline mode.',
        variant: 'destructive',
      })
      
      // Should not attempt more reconnections
      mockSocket.connect.mockClear()
      jest.advanceTimersByTime(10000)
      expect(mockSocket.connect).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should clean up resources on destroy', async () => {
      client = new WebSocketClient()
      await client.connect()
      
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
      
      client.destroy()
      
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('should clear event listeners on destroy', async () => {
      client = new WebSocketClient({ autoConnect: false })
      await client.connect()
      
      const callback1 = jest.fn()
      const callback2 = jest.fn()
      
      client.on('user_joined', callback1)
      client.on('content_change', callback2)
      
      client.destroy()
      
      // Try to emit events after destroy
      const userJoinedHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'user_joined'
      )?.[1]
      userJoinedHandler?.({ id: 'test', name: 'Test User' })
      
      // Callbacks should not be in the internal map anymore
      expect(client['eventListeners'].size).toBe(0)
    })

    it('should clear offline queue on destroy', () => {
      client = new WebSocketClient({ autoConnect: false })
      
      // Queue some events
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
      client.emit('test1', { data: 1 })
      client.emit('test2', { data: 2 })
      
      client.destroy()
      
      // Queue should be cleared
      expect(client['offlineQueue']).toHaveLength(0)
    })
  })

  describe('singleton instance', () => {
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

    it('should handle destroy when no instance exists', () => {
      // Should not throw
      expect(() => destroyWebSocketClient()).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('should handle socket creation errors', async () => {
      const io = require('socket.io-client').io as jest.MockedFunction<any>
      io.mockImplementation(() => {
        throw new Error('Socket creation failed')
      })
      
      client = new WebSocketClient({ autoConnect: false })
      
      await expect(client.connect()).rejects.toThrow('Socket creation failed')
      expect(client.getConnectionState()).toBe('error')
    })

    it('should handle missing socket on event operations', () => {
      client = new WebSocketClient({ autoConnect: false })
      
      // Should not throw
      expect(() => client.emit('test', {})).not.toThrow()
      expect(() => client.on('user_joined', jest.fn())).not.toThrow()
    })
  })

  describe('logging', () => {
    it('should log in development mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      client = new WebSocketClient({ 
        autoConnect: false,
        enableLogging: true,
      })
      await client.connect()
      mockSocket.connected = true
      
      client.emit('test_event', { data: 'test' })
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WebSocket]'),
        expect.any(String)
      )
      
      consoleSpy.mockRestore()
    })

    it('should not log in production mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      client = new WebSocketClient({ 
        autoConnect: false,
        enableLogging: false,
      })
      await client.connect()
      mockSocket.connected = true
      
      client.emit('test_event', { data: 'test' })
      
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[WebSocket]'),
        expect.any(String)
      )
      
      consoleSpy.mockRestore()
    })
  })
})