import { useState, useEffect, useRef, useCallback } from 'react'
import { GenerationProgress, GenerationProgressUpdate, GenerationLog } from '@/types'
import { api } from '@/lib/api/endpoints'

interface UseGenerationProgressOptions {
  jobId: string
  onComplete?: (progress: GenerationProgress) => void
  onError?: (error: string) => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

export function useGenerationProgress({
  jobId,
  onComplete,
  onError,
  autoReconnect = true,
  reconnectInterval = 3000
}: UseGenerationProgressOptions) {
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [logs, setLogs] = useState<GenerationLog[]>([])
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/generation/${jobId}`
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log(`WebSocket connected for job ${jobId}`)
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const update: GenerationProgressUpdate = JSON.parse(event.data)
          
          switch (update.type) {
            case 'stage_update':
              setProgress(prev => prev ? {
                ...prev,
                ...update.data,
                logs: [...prev.logs, ...((update.data.logs as GenerationLog[]) || [])]
              } : update.data)
              break
              
            case 'log':
              const newLog: GenerationLog = {
                ...update.data,
                timestamp: new Date(update.timestamp)
              }
              setLogs(prev => [...prev, newLog])
              setProgress(prev => prev ? {
                ...prev,
                logs: [...prev.logs, newLog]
              } : null)
              break
              
            case 'rag_context':
              setProgress(prev => prev ? {
                ...prev,
                ragContext: update.data.ragContext,
                knowledgeGraph: update.data.knowledgeGraph
              } : null)
              break
              
            case 'preview_update':
              setProgress(prev => prev ? {
                ...prev,
                previewSessions: update.data.previewSessions
              } : null)
              break
              
            case 'complete':
              setProgress(prev => prev ? {
                ...prev,
                ...update.data,
                isComplete: true
              } : update.data)
              onComplete?.(update.data)
              break
              
            case 'error':
              setProgress(prev => prev ? {
                ...prev,
                hasError: true,
                errorMessage: update.data.message
              } : null)
              onError?.(update.data.message)
              break
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log(`WebSocket closed for job ${jobId}:`, event.code, event.reason)
        setIsConnected(false)
        
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          setConnectionError(`Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError('Failed to reconnect after multiple attempts')
        }
      }

      ws.onerror = (error) => {
        console.error(`WebSocket error for job ${jobId}:`, error)
        setConnectionError('Connection error occurred')
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionError('Failed to establish connection')
    }
  }, [jobId, autoReconnect, reconnectInterval, onComplete, onError])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const pauseGeneration = useCallback(() => {
    sendMessage({ type: 'pause' })
  }, [sendMessage])

  const resumeGeneration = useCallback(() => {
    sendMessage({ type: 'resume' })
  }, [sendMessage])

  const cancelGeneration = useCallback(() => {
    sendMessage({ type: 'cancel' })
  }, [sendMessage])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    progress,
    logs,
    isConnected,
    connectionError,
    connect,
    disconnect,
    pauseGeneration,
    resumeGeneration,
    cancelGeneration,
    clearLogs,
    reconnectAttempts: reconnectAttemptsRef.current,
    maxReconnectAttempts
  }
}

// Alternative polling-based hook for environments without WebSocket support
export function useGenerationProgressPolling({
  jobId,
  onComplete,
  onError,
  pollInterval = 2000
}: {
  jobId: string
  onComplete?: (progress: GenerationProgress) => void
  onError?: (error: string) => void
  pollInterval?: number
}) {
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchProgress = useCallback(async () => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await api.jobs.getStatus(jobId)
      setProgress(data as GenerationProgress)

      if (data.isComplete) {
        onComplete?.(data)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else if (data.hasError) {
        onError?.(data.errorMessage || 'Generation failed')
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch progress'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [jobId, isLoading, onComplete, onError])

  const startPolling = useCallback(() => {
    if (intervalRef.current) return

    fetchProgress() // Initial fetch
    intervalRef.current = setInterval(fetchProgress, pollInterval)
  }, [fetchProgress, pollInterval])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    startPolling()
    return stopPolling
  }, [startPolling, stopPolling])

  return {
    progress,
    isLoading,
    error,
    startPolling,
    stopPolling,
    refetch: fetchProgress
  }
}