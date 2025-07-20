/**
 * Collaboration Hooks
 * React hooks for real-time collaboration features
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'
import { getWebSocketClient, WebSocketClient, CollaborationUser, UserPresence, ContentChange, CursorPosition, ActivityEvent, RealtimeNotification } from '@/lib/websocket/client'

/**
 * Hook for managing WebSocket connection
 */
export function useWebSocket() {
  const [client, setClient] = useState<WebSocketClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'>('disconnected')
  const { user, token } = useAuthStore()

  useEffect(() => {
    if (!user || !token) return

    const wsClient = getWebSocketClient({
      autoConnect: true,
      enableLogging: process.env.NODE_ENV === 'development'
    })

    setClient(wsClient)

    // Monitor connection state
    const updateConnectionState = () => {
      setConnectionState(wsClient.getConnectionState())
      setIsConnected(wsClient.isConnected())
    }

    const unsubscribeConnect = wsClient.on('connect', () => {
      updateConnectionState()
    })

    const unsubscribeDisconnect = wsClient.on('disconnect', () => {
      updateConnectionState()
    })

    const unsubscribeReconnect = wsClient.on('reconnect', () => {
      updateConnectionState()
    })

    // Initial connection
    wsClient.connect(token)
    updateConnectionState()

    return () => {
      unsubscribeConnect()
      unsubscribeDisconnect()
      unsubscribeReconnect()
    }
  }, [user, token])

  return {
    client,
    isConnected,
    connectionState
  }
}

/**
 * Hook for managing course collaboration
 */
export function useCourseCollaboration(courseId: string) {
  const { client } = useWebSocket()
  const [users, setUsers] = useState<CollaborationUser[]>([])
  const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(new Map())
  const { user } = useAuthStore()

  useEffect(() => {
    if (!client || !courseId) return

    // Join course room
    client.joinCourse(courseId)

    // Listen for user events
    const unsubscribeUserJoined = client.on('user_joined', (newUser: CollaborationUser) => {
      setUsers(prev => {
        const existing = prev.find(u => u.id === newUser.id)
        if (existing) return prev
        return [...prev, newUser]
      })
    })

    const unsubscribeUserLeft = client.on('user_left', (userId: string) => {
      setUsers(prev => prev.filter(u => u.id !== userId))
      setUserPresence(prev => {
        const newMap = new Map(prev)
        newMap.delete(userId)
        return newMap
      })
    })

    const unsubscribePresenceUpdate = client.on('user_presence_update', (presence: UserPresence) => {
      setUserPresence(prev => new Map(prev).set(presence.userId, presence))
    })

    // Send initial presence
    if (user) {
      client.updatePresence({
        userId: user.id,
        status: 'online',
        currentPage: window.location.pathname,
        lastActivity: new Date()
      })
    }

    // Update presence on activity
    const handleActivity = () => {
      if (user) {
        client.updatePresence({
          userId: user.id,
          status: 'online',
          currentPage: window.location.pathname,
          lastActivity: new Date()
        })
      }
    }

    // Listen for user activity
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('click', handleActivity)

    return () => {
      client.leaveCourse(courseId)
      unsubscribeUserJoined()
      unsubscribeUserLeft()
      unsubscribePresenceUpdate()
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('click', handleActivity)
    }
  }, [client, courseId, user])

  const sendPresenceUpdate = useCallback((update: Partial<UserPresence>) => {
    if (client && user) {
      client.updatePresence({
        userId: user.id,
        ...update,
        lastActivity: new Date()
      })
    }
  }, [client, user])

  return {
    users,
    userPresence,
    sendPresenceUpdate
  }
}

/**
 * Hook for collaborative text editing
 */
export function useCollaborativeEditor(courseId: string, sessionId?: string, activityId?: string) {
  const { client } = useWebSocket()
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map())
  const [selections, setSelections] = useState<Map<string, any>>(new Map())
  const [pendingChanges, setPendingChanges] = useState<ContentChange[]>([])
  const { user } = useAuthStore()
  const lastChangeRef = useRef<string | null>(null)

  useEffect(() => {
    if (!client) return

    const unsubscribeCursor = client.on('cursor_position', (cursor: CursorPosition) => {
      if (cursor.userId !== user?.id) {
        setCursors(prev => new Map(prev).set(cursor.userId, cursor))
      }
    })

    const unsubscribeSelection = client.on('selection_change', (selection: any) => {
      if (selection.userId !== user?.id) {
        setSelections(prev => new Map(prev).set(selection.userId, selection))
      }
    })

    const unsubscribeContentChange = client.on('content_change', (change: ContentChange) => {
      if (change.userId !== user?.id && change.id !== lastChangeRef.current) {
        setPendingChanges(prev => [...prev, change])
      }
    })

    return () => {
      unsubscribeCursor()
      unsubscribeSelection()
      unsubscribeContentChange()
    }
  }, [client, user])

  const sendCursorPosition = useCallback((position: Omit<CursorPosition, 'userId' | 'timestamp'>) => {
    if (client && user) {
      client.sendCursorPosition({
        ...position,
        userId: user.id,
        color: user.color || '#7C3AED'
      })
    }
  }, [client, user])

  const sendContentChange = useCallback((change: Omit<ContentChange, 'id' | 'userId' | 'timestamp'>) => {
    if (client && user) {
      const changeId = `${user.id}-${Date.now()}`
      lastChangeRef.current = changeId
      
      client.sendContentChange({
        ...change,
        userId: user.id,
        target: {
          courseId,
          sessionId,
          activityId,
          ...change.target
        }
      })
    }
  }, [client, user, courseId, sessionId, activityId])

  const applyPendingChanges = useCallback(() => {
    const changes = [...pendingChanges]
    setPendingChanges([])
    return changes
  }, [pendingChanges])

  return {
    cursors,
    selections,
    pendingChanges,
    sendCursorPosition,
    sendContentChange,
    applyPendingChanges
  }
}

/**
 * Hook for real-time notifications
 */
export function useRealtimeNotifications() {
  const { client } = useWebSocket()
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!client) return

    const unsubscribe = client.on('notification', (notification: RealtimeNotification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 99)]) // Keep last 100
      setUnreadCount(prev => prev + 1)

      // Show desktop notification if permission granted
      if (Notification.permission === 'granted' && notification.persistent !== false) {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id
        })
      }

      // Play sound if enabled
      if (notification.sound && 'Audio' in window) {
        const audio = new Audio('/sounds/notification.mp3')
        audio.volume = 0.3
        audio.play().catch(() => {
          // Ignore audio errors
        })
      }
    })

    return unsubscribe
  }, [client])

  const markAsRead = useCallback((notificationId?: string) => {
    if (notificationId) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    }
  }, [])

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }, [])

  return {
    notifications,
    unreadCount,
    markAsRead,
    requestNotificationPermission
  }
}

/**
 * Hook for activity feed
 */
export function useActivityFeed(courseId?: string) {
  const { client } = useWebSocket()
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [filteredActivities, setFilteredActivities] = useState<ActivityEvent[]>([])
  const [filters, setFilters] = useState<{
    types: string[]
    users: string[]
    timeRange: 'hour' | 'day' | 'week' | 'month' | 'all'
  }>({
    types: [],
    users: [],
    timeRange: 'day'
  })

  useEffect(() => {
    if (!client) return

    const unsubscribe = client.on('activity_update', (activity: ActivityEvent) => {
      // Filter by course if specified
      if (courseId && activity.courseId !== courseId) return

      setActivities(prev => {
        // Avoid duplicates
        const existing = prev.find(a => a.id === activity.id)
        if (existing) return prev
        
        // Keep last 200 activities
        return [activity, ...prev.slice(0, 199)]
      })
    })

    return unsubscribe
  }, [client, courseId])

  // Apply filters
  useEffect(() => {
    let filtered = [...activities]

    // Filter by type
    if (filters.types.length > 0) {
      filtered = filtered.filter(a => filters.types.includes(a.type))
    }

    // Filter by user
    if (filters.users.length > 0) {
      filtered = filtered.filter(a => filters.users.includes(a.userId))
    }

    // Filter by time range
    if (filters.timeRange !== 'all') {
      const now = new Date()
      const cutoff = new Date()
      
      switch (filters.timeRange) {
        case 'hour':
          cutoff.setHours(now.getHours() - 1)
          break
        case 'day':
          cutoff.setDate(now.getDate() - 1)
          break
        case 'week':
          cutoff.setDate(now.getDate() - 7)
          break
        case 'month':
          cutoff.setMonth(now.getMonth() - 1)
          break
      }

      filtered = filtered.filter(a => new Date(a.timestamp) >= cutoff)
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    setFilteredActivities(filtered)
  }, [activities, filters])

  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const groupByTime = useCallback(() => {
    const groups = new Map<string, ActivityEvent[]>()
    
    filteredActivities.forEach(activity => {
      const date = new Date(activity.timestamp)
      const key = date.toDateString()
      
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(activity)
    })

    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      activities: items
    }))
  }, [filteredActivities])

  return {
    activities: filteredActivities,
    groupedActivities: groupByTime(),
    filters,
    updateFilters,
    totalCount: activities.length
  }
}

/**
 * Hook for managing comments in collaborative context
 */
export function useCollaborativeComments(courseId: string, targetId?: string) {
  const { client } = useWebSocket()
  const [comments, setComments] = useState<any[]>([])
  const { user } = useAuthStore()

  useEffect(() => {
    if (!client) return

    const unsubscribeAdded = client.on('comment_added', (comment: any) => {
      if (comment.courseId === courseId && (!targetId || comment.targetId === targetId)) {
        setComments(prev => [...prev, comment])
      }
    })

    const unsubscribeUpdated = client.on('comment_updated', (comment: any) => {
      if (comment.courseId === courseId && (!targetId || comment.targetId === targetId)) {
        setComments(prev => prev.map(c => c.id === comment.id ? comment : c))
      }
    })

    const unsubscribeDeleted = client.on('comment_deleted', (commentId: string) => {
      setComments(prev => prev.filter(c => c.id !== commentId))
    })

    return () => {
      unsubscribeAdded()
      unsubscribeUpdated()
      unsubscribeDeleted()
    }
  }, [client, courseId, targetId])

  const addComment = useCallback((content: string, targetId?: string) => {
    if (client && user) {
      const comment = {
        id: `${user.id}-${Date.now()}`,
        courseId,
        targetId,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        content,
        timestamp: new Date()
      }
      
      client.emit('add_comment', comment)
    }
  }, [client, user, courseId])

  const updateComment = useCallback((commentId: string, content: string) => {
    if (client) {
      client.emit('update_comment', { commentId, content })
    }
  }, [client])

  const deleteComment = useCallback((commentId: string) => {
    if (client) {
      client.emit('delete_comment', { commentId })
    }
  }, [client])

  return {
    comments,
    addComment,
    updateComment,
    deleteComment
  }
}