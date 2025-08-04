/**
 * Collaboration Provider Component
 * Central provider for all real-time collaboration features
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebSocket } from '@/lib/collaboration/hooks'
import { useOfflineCollaboration } from '@/lib/collaboration/offline-manager'
import { WebSocketClient, CollaborationUser, UserPresence } from '@/lib/websocket/client'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Wifi, 
  WifiOff, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  CloudOff,
  Cloud,
  Activity
} from 'lucide-react'
import { NotificationCenter } from './notification-center'
import { ActivityFeed } from './activity-feed'

// Collaboration context
interface CollaborationContextType {
  client: WebSocketClient | null
  isConnected: boolean
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
  isOnline: boolean
  users: CollaborationUser[]
  userPresence: Map<string, UserPresence>
  pendingChanges: number
  conflicts: number
  joinCourse: (courseId: string) => void
  leaveCourse: (courseId: string) => void
  sendPresenceUpdate: (update: Partial<UserPresence>) => void
}

const CollaborationContext = createContext<CollaborationContextType | null>(null)

export function useCollaboration() {
  const context = useContext(CollaborationContext)
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider')
  }
  return context
}

// Connection status indicator
function ConnectionStatus({ 
  isConnected, 
  connectionState, 
  isOnline,
  pendingChanges,
  conflicts 
}: {
  isConnected: boolean
  connectionState: string
  isOnline: boolean
  pendingChanges: number
  conflicts: number
}) {
  const getStatusColor = () => {
    if (!isOnline) return 'text-orange-500'
    if (!isConnected) return 'text-red-500'
    if (conflicts > 0) return 'text-amber-500'
    return 'text-green-500'
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    if (connectionState === 'connecting') return 'Connecting...'
    if (connectionState === 'reconnecting') return 'Reconnecting...'
    if (connectionState === 'error') return 'Connection Error'
    if (!isConnected) return 'Disconnected'
    if (conflicts > 0) return 'Conflicts Detected'
    return 'Connected'
  }

  const getStatusIcon = () => {
    if (!isOnline) return CloudOff
    if (!isConnected) return WifiOff
    if (conflicts > 0) return AlertTriangle
    return isConnected ? Wifi : WifiOff
  }

  const StatusIcon = getStatusIcon()

  return (
    <div className="flex items-center gap-2" data-testid={isConnected ? "connection-status-connected" : "connection-status-disconnected"}>
      <div className="flex items-center gap-1" data-testid="connection-info">
        <StatusIcon className={cn("h-4 w-4", getStatusColor())} />
        <span className={cn("text-sm font-medium", getStatusColor())}>
          {getStatusText()}
        </span>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-1">
        {pendingChanges > 0 && (
          <Badge variant="outline" className="text-xs" data-testid="pending-changes-indicator">
            <RefreshCw className="h-3 w-3 mr-1" />
            <span data-testid="pending-changes-count">{pendingChanges}</span> pending
          </Badge>
        )}
        
        {conflicts > 0 && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {conflicts} conflicts
          </Badge>
        )}
      </div>
    </div>
  )
}

// Offline mode banner
function OfflineBanner({ 
  isOnline, 
  pendingChanges,
  onSync 
}: { 
  isOnline: boolean
  pendingChanges: number
  onSync: () => void 
}) {
  if (isOnline) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      data-testid="offline-indicator"
    >
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <CloudOff className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-medium">Working offline</span>
            {pendingChanges > 0 && (
              <span className="ml-2 text-sm">
                {pendingChanges} changes will sync when connection is restored
              </span>
            )}
          </div>
          
          {pendingChanges > 0 && (
            <Button size="sm" variant="outline" onClick={onSync}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry Sync
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </motion.div>
  )
}

// Sync progress indicator
function SyncProgress({ 
  isVisible, 
  progress,
  message 
}: { 
  isVisible: boolean
  progress: number
  message: string 
}) {
  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed bottom-4 right-4 z-50"
      data-testid={progress === 100 ? "sync-complete-indicator" : "syncing-indicator"}
    >
      <Card className="p-4 w-80 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="animate-spin">
            <RefreshCw className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{message}</p>
            <Progress value={progress} className="mt-2" />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// Conflict resolution banner
function ConflictBanner({ 
  conflicts,
  onResolve 
}: { 
  conflicts: number
  onResolve: () => void 
}) {
  if (conflicts === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-medium">Content conflicts detected</span>
            <span className="ml-2 text-sm">
              {conflicts} conflict{conflicts !== 1 ? 's' : ''} need{conflicts === 1 ? 's' : ''} your attention
            </span>
          </div>
          
          <Button size="sm" variant="outline" onClick={onResolve}>
            Resolve Conflicts
          </Button>
        </AlertDescription>
      </Alert>
    </motion.div>
  )
}

interface CollaborationProviderProps {
  children: React.ReactNode
  courseId?: string
  showStatusBar?: boolean
  showNotifications?: boolean
  showActivityFeed?: boolean
  autoSync?: boolean
}

export function CollaborationProvider({
  children,
  courseId,
  showStatusBar = true,
  showNotifications = true,
  showActivityFeed = false,
  autoSync = true
}: CollaborationProviderProps) {
  const { client, isConnected, connectionState } = useWebSocket()
  const {
    isOnline,
    pendingChanges,
    conflicts,
    addOfflineChange,
    syncChanges,
    resolveConflict,
    hasPendingChanges,
    hasConflicts
  } = useOfflineCollaboration(courseId || '')

  const [users, setUsers] = useState<CollaborationUser[]>([])
  const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(new Map())
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncMessage, setSyncMessage] = useState('')

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && hasPendingChanges && autoSync && !isSyncing) {
      handleSync()
    }
  }, [isOnline, hasPendingChanges, autoSync, isSyncing])

  // Join course room when courseId changes
  useEffect(() => {
    if (client && courseId && isConnected) {
      client.joinCourse(courseId)
      return () => client.leaveCourse(courseId)
    }
  }, [client, courseId, isConnected])

  // Listen for user events
  useEffect(() => {
    if (!client) return

    const unsubscribeUserJoined = client.on('user_joined', (user: CollaborationUser) => {
      setUsers(prev => {
        const existing = prev.find(u => u.id === user.id)
        if (existing) return prev
        return [...prev, user]
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

    return () => {
      unsubscribeUserJoined()
      unsubscribeUserLeft()
      unsubscribePresenceUpdate()
    }
  }, [client])

  const joinCourse = useCallback((courseId: string) => {
    if (client) {
      client.joinCourse(courseId)
    }
  }, [client])

  const leaveCourse = useCallback((courseId: string) => {
    if (client) {
      client.leaveCourse(courseId)
    }
  }, [client])

  const sendPresenceUpdate = useCallback((update: Partial<UserPresence>) => {
    if (client) {
      client.updatePresence(update)
    }
  }, [client])

  const handleSync = useCallback(async () => {
    if (!client || isSyncing) return

    setIsSyncing(true)
    setSyncProgress(0)
    setSyncMessage('Syncing changes...')

    try {
      await syncChanges(async (changes) => {
        // Simulate sync progress
        for (let i = 0; i <= 100; i += 10) {
          setSyncProgress(i)
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        // Mock sync result
        return {
          synced: changes.map(c => c.id),
          conflicts: []
        }
      })

      setSyncMessage('Sync completed')
      setTimeout(() => setIsSyncing(false), 1000)
    } catch (error) {
      setSyncMessage('Sync failed')
      setTimeout(() => setIsSyncing(false), 2000)
    }
  }, [client, isSyncing, syncChanges])

  const handleResolveConflicts = useCallback(() => {
    // Open conflict resolution dialog
    console.log('Opening conflict resolution dialog')
  }, [])

  const contextValue: CollaborationContextType = {
    client,
    isConnected,
    connectionState,
    isOnline,
    users,
    userPresence,
    pendingChanges: pendingChanges.length,
    conflicts: conflicts.length,
    joinCourse,
    leaveCourse,
    sendPresenceUpdate
  }

  return (
    <CollaborationContext.Provider value={contextValue}>
      <div className="relative">
        {/* Status banners */}
        <AnimatePresence>
          <div className="space-y-2 mb-4">
            <OfflineBanner
              isOnline={isOnline}
              pendingChanges={pendingChanges.length}
              onSync={handleSync}
            />
            
            <ConflictBanner
              conflicts={conflicts.length}
              onResolve={handleResolveConflicts}
            />
          </div>
        </AnimatePresence>

        {/* Status bar */}
        {showStatusBar && (
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg mb-4">
            <ConnectionStatus
              isConnected={isConnected}
              connectionState={connectionState}
              isOnline={isOnline}
              pendingChanges={pendingChanges.length}
              conflicts={conflicts.length}
            />

            <div className="flex items-center gap-2">
              {/* Active users */}
              {users.length > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="user-presence">
                  <Users className="h-4 w-4" />
                  <span data-testid="online-users-count">{users.length}</span>
                </div>
              )}

              {/* Notifications */}
              {showNotifications && <NotificationCenter />}

              {/* Activity feed toggle */}
              {showActivityFeed && courseId && (
                <Button size="sm" variant="ghost">
                  <Activity className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex gap-4">
          {/* Primary content */}
          <div className="flex-1">
            {children}
          </div>

          {/* Activity feed sidebar */}
          {showActivityFeed && courseId && (
            <div className="w-80">
              <ActivityFeed
                courseId={courseId}
                compact
                maxItems={20}
                showHeader
                showFilters={false}
              />
            </div>
          )}
        </div>

        {/* Sync progress overlay */}
        <AnimatePresence>
          <SyncProgress
            isVisible={isSyncing}
            progress={syncProgress}
            message={syncMessage}
          />
        </AnimatePresence>
      </div>
    </CollaborationContext.Provider>
  )
}

export default CollaborationProvider