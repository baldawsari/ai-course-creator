import { jest } from '@jest/globals'

// WebSocket mock events
export interface MockWebSocketEvent {
  type: 'open' | 'message' | 'error' | 'close'
  data?: any
  code?: number
  reason?: string
}

// Mock WebSocket class
export class MockWebSocket extends EventTarget {
  public url: string
  public readyState: number
  public CONNECTING = 0
  public OPEN = 1
  public CLOSING = 2
  public CLOSED = 3
  
  private eventListeners: Map<string, Function[]> = new Map()
  private messageQueue: any[] = []
  private isConnected = false

  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  constructor(url: string) {
    super()
    this.url = url
    this.readyState = MockWebSocket.CONNECTING
    
    // Simulate connection after a brief delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.isConnected = true
      this.dispatchEvent(new Event('open'))
    }, 10)
  }

  send(data: string | ArrayBuffer | Blob) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    
    // Store sent message for testing
    this.messageQueue.push(data)
    
    // Emit custom event for testing
    this.dispatchEvent(new CustomEvent('send', { detail: data }))
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSING
    
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED
      this.isConnected = false
      this.dispatchEvent(new CloseEvent('close', { code, reason }))
    }, 10)
  }

  // Test helpers
  mockMessage(data: any) {
    if (this.isConnected) {
      const messageEvent = new MessageEvent('message', { data: JSON.stringify(data) })
      this.dispatchEvent(messageEvent)
    }
  }

  mockError(error: string) {
    const errorEvent = new ErrorEvent('error', { message: error })
    this.dispatchEvent(errorEvent)
  }

  mockClose(code = 1000, reason = 'Normal closure') {
    this.close(code, reason)
  }

  getSentMessages() {
    return this.messageQueue
  }

  getLastSentMessage() {
    return this.messageQueue[this.messageQueue.length - 1]
  }

  clearSentMessages() {
    this.messageQueue = []
  }
}

// WebSocket connection manager mock
export class MockWebSocketManager {
  private connections: Map<string, MockWebSocket> = new Map()
  private eventHandlers: Map<string, Function[]> = new Map()

  connect(url: string): MockWebSocket {
    const ws = new MockWebSocket(url)
    this.connections.set(url, ws)
    return ws
  }

  getConnection(url: string): MockWebSocket | undefined {
    return this.connections.get(url)
  }

  disconnect(url: string) {
    const ws = this.connections.get(url)
    if (ws) {
      ws.close()
      this.connections.delete(url)
    }
  }

  disconnectAll() {
    this.connections.forEach(ws => ws.close())
    this.connections.clear()
  }

  // Broadcast to all connections
  broadcast(data: any) {
    this.connections.forEach(ws => ws.mockMessage(data))
  }

  // Simulate network issues
  simulateNetworkError() {
    this.connections.forEach(ws => ws.mockError('Network error'))
  }

  simulateConnectionLoss() {
    this.connections.forEach(ws => ws.mockClose(1006, 'Connection lost'))
  }
}

// Progress tracking mock
export class MockProgressTracker {
  private stages = [
    'document_analysis',
    'content_extraction', 
    'ai_processing',
    'structure_generation'
  ]
  
  private currentStage = 0
  private progress = 0
  private websocket: MockWebSocket | null = null

  constructor(websocket: MockWebSocket) {
    this.websocket = websocket
  }

  startProgress() {
    this.simulateStage(0)
  }

  private simulateStage(stageIndex: number) {
    if (stageIndex >= this.stages.length) {
      this.complete()
      return
    }

    const stageName = this.stages[stageIndex]
    this.currentStage = stageIndex
    
    // Send stage start event
    this.websocket?.mockMessage({
      type: 'stage_update',
      data: {
        stage: stageName,
        progress: stageIndex * 25,
        status: 'started',
      }
    })

    // Simulate progress within stage
    const progressInterval = setInterval(() => {
      this.progress += 5
      const stageProgress = (stageIndex * 25) + (this.progress % 25)
      
      this.websocket?.mockMessage({
        type: 'stage_update',
        data: {
          stage: stageName,
          progress: stageProgress,
          status: 'in_progress',
        }
      })

      // Send logs
      this.websocket?.mockMessage({
        type: 'log',
        data: {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Processing ${stageName}: ${stageProgress}% complete`,
          category: 'system',
        }
      })

      if (this.progress % 25 === 0) {
        clearInterval(progressInterval)
        
        // Send stage completion
        this.websocket?.mockMessage({
          type: 'stage_update',
          data: {
            stage: stageName,
            progress: (stageIndex + 1) * 25,
            status: 'completed',
          }
        })

        // Move to next stage
        setTimeout(() => this.simulateStage(stageIndex + 1), 500)
      }
    }, 200)
  }

  private complete() {
    this.websocket?.mockMessage({
      type: 'complete',
      data: {
        courseId: 'course-123',
        progress: 100,
        status: 'completed',
      }
    })
  }

  simulateError(stage?: string, error?: string) {
    this.websocket?.mockMessage({
      type: 'error',
      data: {
        stage: stage || this.stages[this.currentStage],
        error: error || 'Processing failed',
        progress: this.progress,
      }
    })
  }
}

// RAG context simulator
export class MockRAGContextSimulator {
  private websocket: MockWebSocket | null = null
  private contexts = [
    {
      id: 'context-1',
      content: 'JavaScript variables and data types',
      relevance: 0.95,
      source: 'document-1.pdf',
      pageNumber: 1,
    },
    {
      id: 'context-2', 
      content: 'Function declarations and expressions',
      relevance: 0.87,
      source: 'document-1.pdf',
      pageNumber: 5,
    },
    {
      id: 'context-3',
      content: 'Object-oriented programming concepts',
      relevance: 0.92,
      source: 'document-2.pdf',
      pageNumber: 12,
    },
  ]

  constructor(websocket: MockWebSocket) {
    this.websocket = websocket
  }

  sendContextUpdate() {
    this.websocket?.mockMessage({
      type: 'rag_context',
      data: {
        contexts: this.contexts,
        knowledgeGraph: {
          nodes: this.contexts.map(ctx => ({
            id: ctx.id,
            label: ctx.content.substring(0, 30) + '...',
            relevance: ctx.relevance,
          })),
          edges: [
            { source: 'context-1', target: 'context-2', relationship: 'related' },
            { source: 'context-2', target: 'context-3', relationship: 'builds_on' },
          ],
        },
      }
    })
  }
}

// Generation preview simulator
export class MockGenerationPreviewSimulator {
  private websocket: MockWebSocket | null = null
  private sessions = [
    {
      id: 'session-1',
      title: 'Introduction to JavaScript',
      activities: [
        { id: 'activity-1', title: 'What is JavaScript?', type: 'lesson' },
        { id: 'activity-2', title: 'Setting up development environment', type: 'exercise' },
      ]
    },
    {
      id: 'session-2', 
      title: 'Variables and Data Types',
      activities: [
        { id: 'activity-3', title: 'Declaring variables', type: 'lesson' },
        { id: 'activity-4', title: 'Working with different data types', type: 'exercise' },
        { id: 'activity-5', title: 'Variables quiz', type: 'quiz' },
      ]
    },
  ]

  constructor(websocket: MockWebSocket) {
    this.websocket = websocket
  }

  sendPreviewUpdate(sessionIndex = 0, activityIndex = 0) {
    const session = this.sessions[sessionIndex]
    if (!session) return

    // Send session created event
    this.websocket?.mockMessage({
      type: 'preview_update',
      data: {
        type: 'session_created',
        session: {
          ...session,
          activities: session.activities.slice(0, activityIndex + 1),
        },
        qualityScore: Math.floor(Math.random() * 30) + 70, // 70-100
      }
    })
  }

  sendAllPreviews() {
    this.sessions.forEach((session, sessionIndex) => {
      session.activities.forEach((_, activityIndex) => {
        setTimeout(() => {
          this.sendPreviewUpdate(sessionIndex, activityIndex)
        }, (sessionIndex * 1000) + (activityIndex * 300))
      })
    })
  }
}

// Main mock factory
export const createMockWebSocket = (url: string): MockWebSocket => {
  return new MockWebSocket(url)
}

export const createMockGenerationWebSocket = (url: string): MockWebSocket => {
  const ws = new MockWebSocket(url)
  const progressTracker = new MockProgressTracker(ws)
  const ragSimulator = new MockRAGContextSimulator(ws)
  const previewSimulator = new MockGenerationPreviewSimulator(ws)

  // Auto-start simulation after connection
  setTimeout(() => {
    progressTracker.startProgress()
    ragSimulator.sendContextUpdate()
    previewSimulator.sendAllPreviews()
  }, 100)

  return ws
}

// Test utilities
export const mockWebSocketUtils = {
  // Replace global WebSocket with mock
  mockGlobalWebSocket: () => {
    ;(global as any).WebSocket = MockWebSocket
  },

  // Restore original WebSocket
  restoreGlobalWebSocket: () => {
    delete (global as any).WebSocket
  },

  // Create WebSocket mock for specific URL
  mockWebSocketForURL: (url: string) => {
    const originalWebSocket = global.WebSocket
    ;(global as any).WebSocket = jest.fn().mockImplementation((wsUrl) => {
      if (wsUrl === url) {
        return new MockWebSocket(wsUrl)
      }
      return new originalWebSocket(wsUrl)
    })
  },

  // Wait for WebSocket events
  waitForWebSocketEvent: async (ws: MockWebSocket, eventType: string, timeout = 5000): Promise<Event> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${eventType} event`))
      }, timeout)

      ws.addEventListener(eventType, (event) => {
        clearTimeout(timer)
        resolve(event)
      }, { once: true })
    })
  },

  // Simulate WebSocket scenarios
  simulateReconnection: async (ws: MockWebSocket) => {
    ws.mockClose(1006, 'Connection lost')
    
    // Simulate reconnection after delay
    setTimeout(() => {
      ws.readyState = MockWebSocket.OPEN
      ws.dispatchEvent(new Event('open'))
    }, 1000)
  },

  simulateSlowConnection: (ws: MockWebSocket) => {
    const originalMockMessage = ws.mockMessage
    ws.mockMessage = function(data: any) {
      setTimeout(() => originalMockMessage.call(this, data), 2000)
    }
  },
}

// Export instances for common test scenarios
export const mockWebSocketManager = new MockWebSocketManager()

// Jest setup helper
export const setupWebSocketMocks = () => {
  beforeEach(() => {
    mockWebSocketUtils.mockGlobalWebSocket()
  })

  afterEach(() => {
    mockWebSocketManager.disconnectAll()
    mockWebSocketUtils.restoreGlobalWebSocket()
  })
}