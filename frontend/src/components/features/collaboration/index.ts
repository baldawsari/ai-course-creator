/**
 * Collaboration Features Export Index
 * Central export point for all real-time collaboration components and hooks
 */

// Core WebSocket client and types
export * from '@/lib/websocket/client'

// Collaboration hooks
export * from '@/lib/collaboration/hooks'

// Offline management and conflict resolution
export * from '@/lib/collaboration/offline-manager'

// Main collaboration components
export { CollaborationProvider, useCollaboration } from './collaboration-provider'
export { CollaborativeEditor } from './collaborative-editor'
export { NotificationCenter, useCollaborationToast } from './notification-center'
export { ActivityFeed } from './activity-feed'

// Re-export commonly used types for convenience
export type {
  CollaborationEvents,
  CollaborationUser,
  UserPresence,
  ContentChange,
  CursorPosition,
  TextSelection,
  RealtimeNotification,
  ActivityEvent,
  CourseUpdate,
  SessionUpdate,
  Comment,
  ConflictResolution
} from '@/lib/websocket/client'

export type {
  OfflineChange,
  ConflictStrategy
} from '@/lib/collaboration/offline-manager'

// Utility functions for collaboration
export {
  getWebSocketClient,
  destroyWebSocketClient
} from '@/lib/websocket/client'

export {
  getOfflineManager,
  getConflictResolver,
  getCollaborationOptimizer
} from '@/lib/collaboration/offline-manager'