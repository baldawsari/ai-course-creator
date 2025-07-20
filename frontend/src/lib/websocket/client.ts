/**
 * WebSocket Client for Real-time Collaboration
 * Provides Socket.io integration with auto-reconnection, event handling, and state synchronization
 */

import { io, Socket } from 'socket.io-client'
import { toast } from '@/hooks/use-toast'

// Event types for type safety
export interface CollaborationEvents {
  // Connection events
  connect: () => void
  disconnect: (reason: string) => void
  reconnect: (attemptNumber: number) => void
  reconnect_error: (error: Error) => void
  
  // User presence events
  user_joined: (user: CollaborationUser) => void
  user_left: (userId: string) => void
  user_presence_update: (presence: UserPresence) => void
  
  // Collaborative editing events
  content_change: (change: ContentChange) => void
  cursor_position: (cursor: CursorPosition) => void
  selection_change: (selection: TextSelection) => void
  
  // Real-time notifications
  notification: (notification: RealtimeNotification) => void
  activity_update: (activity: ActivityEvent) => void
  
  // Course-specific events
  course_update: (update: CourseUpdate) => void
  session_update: (update: SessionUpdate) => void
  comment_added: (comment: Comment) => void
  comment_updated: (comment: Comment) => void
  comment_deleted: (commentId: string) => void
}

export interface CollaborationUser {
  id: string
  name: string
  email: string
  avatar?: string
  color: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  lastSeen: Date
}

export interface UserPresence {
  userId: string
  status: 'online' | 'away' | 'offline'
  currentPage?: string
  currentSection?: string
  cursorPosition?: CursorPosition
  lastActivity: Date
}

export interface ContentChange {
  id: string
  userId: string
  timestamp: Date
  type: 'insert' | 'delete' | 'format' | 'move'
  target: {
    courseId: string
    sessionId?: string
    activityId?: string
    blockId?: string
  }
  data: any
  conflicts?: ConflictResolution[]
}

export interface CursorPosition {
  userId: string
  position: {
    line: number
    column: number
    blockId?: string
    selectionStart?: number
    selectionEnd?: number
  }
  color: string
  timestamp: Date
}

export interface TextSelection {
  userId: string
  selection: {
    start: { line: number; column: number }
    end: { line: number; column: number }
    blockId?: string
    text?: string
  }
  color: string
  timestamp: Date
}

export interface RealtimeNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  userId?: string
  courseId?: string
  actionUrl?: string
  timestamp: Date
  persistent?: boolean
  sound?: boolean
}

export interface ActivityEvent {
  id: string
  type: 'course_created' | 'course_updated' | 'session_added' | 'activity_created' | 
        'user_joined' | 'comment_added' | 'export_completed' | 'generation_started'
  userId: string
  userName: string
  userAvatar?: string
  courseId?: string
  courseName?: string
  target?: {
    type: 'course' | 'session' | 'activity' | 'comment'
    id: string
    name?: string
  }
  metadata?: Record<string, any>
  timestamp: Date
}

export interface CourseUpdate {
  courseId: string
  type: 'metadata' | 'structure' | 'content' | 'settings'
  userId: string
  changes: any
  timestamp: Date
  version: number
}

export interface SessionUpdate {
  courseId: string
  sessionId: string
  type: 'created' | 'updated' | 'deleted' | 'reordered'
  userId: string
  changes: any
  timestamp: Date
}

export interface Comment {
  id: string
  courseId: string
  sessionId?: string
  activityId?: string
  blockId?: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  mentions?: string[]
  replies?: Comment[]
  reactions?: { emoji: string; userIds: string[] }[]
  resolved?: boolean
  timestamp: Date
  updatedAt?: Date
}

export interface ConflictResolution {
  type: 'auto' | 'manual'
  strategy: 'merge' | 'overwrite' | 'reject'
  reason: string
  timestamp: Date
}

// WebSocket connection options
interface WebSocketOptions {
  autoConnect?: boolean
  reconnection?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
  maxReconnectionDelay?: number
  heartbeatInterval?: number
  heartbeatTimeout?: number
  enableLogging?: boolean
}

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

// WebSocket client class
export class WebSocketClient {
  private socket: Socket | null = null
  private options: Required<WebSocketOptions>
  private connectionState: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private heartbeatInterval: NodeJS.Timeout | null = null
  private eventListeners = new Map<string, Set<(...args: any[]) => void>>()
  private offlineQueue: Array<{ event: string; data: any }> = []
  private isOnline = navigator.onLine

  constructor(options: WebSocketOptions = {}) {
    this.options = {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      maxReconnectionDelay: 10000,
      heartbeatInterval: 30000,
      heartbeatTimeout: 5000,
      enableLogging: process.env.NODE_ENV === 'development',
      ...options
    }

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))

    if (this.options.autoConnect) {
      this.connect()
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect(token?: string): Promise<void> {
    if (this.socket?.connected) {
      this.log('Already connected')
      return
    }

    try {
      this.connectionState = 'connecting'
      
      const authToken = token || this.getAuthToken()
      if (!authToken) {
        throw new Error('No authentication token available')
      }

      const serverUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
      
      this.socket = io(serverUrl, {
        auth: { token: authToken },
        transports: ['websocket', 'polling'],
        reconnection: this.options.reconnection,
        reconnectionAttempts: this.options.reconnectionAttempts,
        reconnectionDelay: this.options.reconnectionDelay,
        maxReconnectionDelay: this.options.maxReconnectionDelay,
      })

      this.setupEventListeners()
      this.startHeartbeat()

    } catch (error) {
      this.connectionState = 'error'
      this.log('Connection failed:', error)
      throw error
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.connectionState = 'disconnected'
    this.reconnectAttempts = 0
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: any): void {
    if (!this.isOnline) {
      this.offlineQueue.push({ event, data })
      return
    }

    if (this.socket?.connected) {
      this.socket.emit(event, data)
      this.log(`Emitted: ${event}`, data)
    } else {
      this.log(`Cannot emit ${event}: not connected`)
      this.offlineQueue.push({ event, data })
    }
  }

  /**
   * Subscribe to events with type safety
   */
  on<K extends keyof CollaborationEvents>(
    event: K,
    callback: CollaborationEvents[K]
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    
    this.eventListeners.get(event)!.add(callback)
    
    if (this.socket) {
      this.socket.on(event, callback)
    }

    // Return unsubscribe function
    return () => this.off(event, callback)
  }

  /**
   * Unsubscribe from events
   */
  off<K extends keyof CollaborationEvents>(
    event: K,
    callback: CollaborationEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        this.eventListeners.delete(event)
      }
    }

    if (this.socket) {
      this.socket.off(event, callback)
    }
  }

  /**
   * Join a course room for collaboration
   */
  joinCourse(courseId: string): void {
    this.emit('join_course', { courseId })
  }

  /**
   * Leave a course room
   */
  leaveCourse(courseId: string): void {
    this.emit('leave_course', { courseId })
  }

  /**
   * Update user presence
   */
  updatePresence(presence: Partial<UserPresence>): void {
    this.emit('presence_update', presence)
  }

  /**
   * Send content change
   */
  sendContentChange(change: Omit<ContentChange, 'id' | 'timestamp'>): void {
    const fullChange: ContentChange = {
      ...change,
      id: this.generateId(),
      timestamp: new Date()
    }
    this.emit('content_change', fullChange)
  }

  /**
   * Send cursor position
   */
  sendCursorPosition(position: Omit<CursorPosition, 'timestamp'>): void {
    const fullPosition: CursorPosition = {
      ...position,
      timestamp: new Date()
    }
    this.emit('cursor_position', fullPosition)
  }

  /**
   * Send notification
   */
  sendNotification(notification: Omit<RealtimeNotification, 'id' | 'timestamp'>): void {
    const fullNotification: RealtimeNotification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date()
    }
    this.emit('notification', fullNotification)
  }

  /**
   * Process offline queue when back online
   */
  private processOfflineQueue(): void {
    if (this.offlineQueue.length > 0) {
      this.log(`Processing ${this.offlineQueue.length} queued events`)
      
      const queue = [...this.offlineQueue]
      this.offlineQueue = []
      
      queue.forEach(({ event, data }) => {
        this.emit(event, data)
      })
    }
  }

  /**
   * Setup Socket.io event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      this.connectionState = 'connected'
      this.reconnectAttempts = 0
      this.log('Connected to WebSocket server')
      
      // Process offline queue
      this.processOfflineQueue()
      
      // Notify listeners
      this.eventListeners.get('connect')?.forEach(callback => callback())
      
      toast({
        title: 'Connected',
        description: 'Real-time collaboration is now active',
        variant: 'success'
      })
    })

    this.socket.on('disconnect', (reason: string) => {
      this.connectionState = 'disconnected'
      this.log('Disconnected:', reason)
      
      this.eventListeners.get('disconnect')?.forEach(callback => callback(reason))
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.attemptReconnect()
      }
    })

    this.socket.on('reconnect', (attemptNumber: number) => {
      this.connectionState = 'connected'
      this.log(`Reconnected after ${attemptNumber} attempts`)
      
      this.eventListeners.get('reconnect')?.forEach(callback => callback(attemptNumber))
      
      toast({
        title: 'Reconnected',
        description: 'Connection restored successfully',
        variant: 'success'
      })
    })

    this.socket.on('reconnect_error', (error: Error) => {
      this.reconnectAttempts++
      this.log('Reconnection failed:', error)
      
      this.eventListeners.get('reconnect_error')?.forEach(callback => callback(error))
      
      if (this.reconnectAttempts >= this.options.reconnectionAttempts) {
        toast({
          title: 'Connection Lost',
          description: 'Unable to restore connection. Working in offline mode.',
          variant: 'destructive'
        })
      }
    })

    // Forward all other events to listeners
    const eventTypes = [
      'user_joined', 'user_left', 'user_presence_update',
      'content_change', 'cursor_position', 'selection_change',
      'notification', 'activity_update',
      'course_update', 'session_update',
      'comment_added', 'comment_updated', 'comment_deleted'
    ]

    eventTypes.forEach(eventType => {
      this.socket!.on(eventType, (data: any) => {
        this.log(`Received: ${eventType}`, data)
        this.eventListeners.get(eventType)?.forEach(callback => callback(data))
      })
    })
  }

  /**
   * Start heartbeat to monitor connection
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping')
      }
    }, this.options.heartbeatInterval)
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.options.reconnectionAttempts) {
      this.log('Maximum reconnection attempts reached')
      return
    }

    this.connectionState = 'reconnecting'
    this.reconnectAttempts++

    const delay = Math.min(
      this.options.reconnectionDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.options.maxReconnectionDelay
    )

    this.log(`Attempting reconnection ${this.reconnectAttempts}/${this.options.reconnectionAttempts} in ${delay}ms`)

    setTimeout(() => {
      if (this.socket) {
        this.socket.connect()
      }
    }, delay)
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.isOnline = true
    this.log('Back online')
    
    if (!this.socket?.connected) {
      this.connect()
    } else {
      this.processOfflineQueue()
    }
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.isOnline = false
    this.log('Gone offline')
    
    toast({
      title: 'Offline Mode',
      description: 'Changes will be synced when connection is restored',
      variant: 'warning'
    })
  }

  /**
   * Get authentication token
   */
  private getAuthToken(): string | null {
    // This should integrate with your auth system
    return localStorage.getItem('auth_token') || null
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Log messages if logging enabled
   */
  private log(message: string, data?: any): void {
    if (this.options.enableLogging) {
      console.log(`[WebSocket] ${message}`, data || '')
    }
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    window.removeEventListener('online', this.handleOnline.bind(this))
    window.removeEventListener('offline', this.handleOffline.bind(this))
    
    this.disconnect()
    this.eventListeners.clear()
    this.offlineQueue = []
  }
}

// Singleton instance
let webSocketClient: WebSocketClient | null = null

/**
 * Get or create WebSocket client instance
 */
export function getWebSocketClient(options?: WebSocketOptions): WebSocketClient {
  if (!webSocketClient) {
    webSocketClient = new WebSocketClient(options)
  }
  return webSocketClient
}

/**
 * Destroy WebSocket client instance
 */
export function destroyWebSocketClient(): void {
  if (webSocketClient) {
    webSocketClient.destroy()
    webSocketClient = null
  }
}