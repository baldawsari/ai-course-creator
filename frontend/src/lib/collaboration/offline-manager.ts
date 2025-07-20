/**
 * Offline Manager
 * Handles offline support, conflict resolution, and performance optimization
 */

import { debounce, throttle } from '@/lib/utils'
import { ContentChange, ConflictResolution } from '@/lib/websocket/client'

// Offline change types
export interface OfflineChange {
  id: string
  type: 'content' | 'metadata' | 'structure'
  timestamp: Date
  userId: string
  target: {
    courseId: string
    sessionId?: string
    activityId?: string
    blockId?: string
  }
  operation: {
    type: 'insert' | 'delete' | 'update' | 'move'
    path: string[]
    oldValue?: any
    newValue?: any
    position?: number
  }
  dependencies?: string[] // IDs of changes this depends on
  conflicts?: string[] // IDs of conflicting changes
}

// Conflict resolution strategies
export type ConflictStrategy = 
  | 'local_wins'     // Keep local changes
  | 'remote_wins'    // Accept remote changes
  | 'merge'          // Attempt automatic merge
  | 'manual'         // Require manual resolution

// Operational transformation for text
interface TextOperation {
  type: 'retain' | 'insert' | 'delete'
  length?: number
  text?: string
}

/**
 * Offline Change Manager
 * Tracks and synchronizes changes when offline
 */
export class OfflineChangeManager {
  private changes = new Map<string, OfflineChange>()
  private pendingSync = new Set<string>()
  private syncInProgress = false
  private storage: Storage

  constructor(storage: Storage = localStorage) {
    this.storage = storage
    this.loadFromStorage()
  }

  /**
   * Add a change to the offline queue
   */
  addChange(change: Omit<OfflineChange, 'id' | 'timestamp'>): string {
    const id = this.generateId()
    const fullChange: OfflineChange = {
      ...change,
      id,
      timestamp: new Date()
    }

    this.changes.set(id, fullChange)
    this.pendingSync.add(id)
    this.saveToStorage()

    return id
  }

  /**
   * Get all pending changes
   */
  getPendingChanges(): OfflineChange[] {
    return Array.from(this.pendingSync)
      .map(id => this.changes.get(id))
      .filter(Boolean) as OfflineChange[]
  }

  /**
   * Mark change as synced
   */
  markAsSynced(changeId: string): void {
    this.pendingSync.delete(changeId)
    this.saveToStorage()
  }

  /**
   * Remove change
   */
  removeChange(changeId: string): void {
    this.changes.delete(changeId)
    this.pendingSync.delete(changeId)
    this.saveToStorage()
  }

  /**
   * Clear all changes
   */
  clear(): void {
    this.changes.clear()
    this.pendingSync.clear()
    this.saveToStorage()
  }

  /**
   * Sync changes with server
   */
  async syncChanges(
    uploadFn: (changes: OfflineChange[]) => Promise<{ synced: string[]; conflicts: ConflictResolution[] }>
  ): Promise<ConflictResolution[]> {
    if (this.syncInProgress || this.pendingSync.size === 0) {
      return []
    }

    this.syncInProgress = true

    try {
      const changes = this.getPendingChanges()
      const result = await uploadFn(changes)

      // Mark synced changes
      result.synced.forEach(id => this.markAsSynced(id))

      return result.conflicts
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Load changes from storage
   */
  private loadFromStorage(): void {
    try {
      const stored = this.storage.getItem('offline_changes')
      if (stored) {
        const data = JSON.parse(stored)
        this.changes = new Map(data.changes || [])
        this.pendingSync = new Set(data.pendingSync || [])
      }
    } catch (error) {
      console.warn('Failed to load offline changes:', error)
    }
  }

  /**
   * Save changes to storage
   */
  private saveToStorage(): void {
    try {
      const data = {
        changes: Array.from(this.changes.entries()),
        pendingSync: Array.from(this.pendingSync)
      }
      this.storage.setItem('offline_changes', JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save offline changes:', error)
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Conflict Resolution Engine
 * Handles automatic and manual conflict resolution
 */
export class ConflictResolver {
  /**
   * Detect conflicts between changes
   */
  detectConflicts(localChanges: OfflineChange[], remoteChanges: ContentChange[]): ConflictResolution[] {
    const conflicts: ConflictResolution[] = []

    for (const localChange of localChanges) {
      for (const remoteChange of remoteChanges) {
        if (this.changesConflict(localChange, remoteChange)) {
          conflicts.push({
            type: 'auto',
            strategy: this.getConflictStrategy(localChange, remoteChange),
            reason: this.getConflictReason(localChange, remoteChange),
            timestamp: new Date(),
            localChange,
            remoteChange
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Resolve conflicts automatically where possible
   */
  resolveConflicts(conflicts: ConflictResolution[], strategy: ConflictStrategy = 'merge'): {
    resolved: ConflictResolution[]
    needsManual: ConflictResolution[]
  } {
    const resolved: ConflictResolution[] = []
    const needsManual: ConflictResolution[] = []

    for (const conflict of conflicts) {
      const resolution = this.attemptAutoResolve(conflict, strategy)
      if (resolution) {
        resolved.push(resolution)
      } else {
        needsManual.push(conflict)
      }
    }

    return { resolved, needsManual }
  }

  /**
   * Merge text using operational transformation
   */
  mergeText(
    baseText: string,
    localOps: TextOperation[],
    remoteOps: TextOperation[]
  ): { merged: string; conflicts: boolean } {
    try {
      // Transform operations to resolve conflicts
      const transformedLocal = this.transformOperations(localOps, remoteOps)
      const transformedRemote = this.transformOperations(remoteOps, localOps)

      // Apply operations
      let result = baseText
      result = this.applyOperations(result, transformedRemote)
      result = this.applyOperations(result, transformedLocal)

      return { merged: result, conflicts: false }
    } catch (error) {
      return { merged: baseText, conflicts: true }
    }
  }

  /**
   * Check if two changes conflict
   */
  private changesConflict(local: OfflineChange, remote: ContentChange): boolean {
    // Same target and overlapping time window
    const sameTarget = (
      local.target.courseId === remote.target.courseId &&
      local.target.sessionId === remote.target.sessionId &&
      local.target.activityId === remote.target.activityId &&
      local.target.blockId === remote.target.blockId
    )

    if (!sameTarget) return false

    // Check time overlap (conflicts if within 5 seconds)
    const timeDiff = Math.abs(
      new Date(remote.timestamp).getTime() - local.timestamp.getTime()
    )
    return timeDiff < 5000
  }

  /**
   * Get conflict resolution strategy
   */
  private getConflictStrategy(local: OfflineChange, remote: ContentChange): ConflictStrategy {
    // Text content can often be merged
    if (local.type === 'content' && remote.type === 'insert') {
      return 'merge'
    }

    // Structural changes need manual resolution
    if (local.type === 'structure') {
      return 'manual'
    }

    // Default to keeping local changes
    return 'local_wins'
  }

  /**
   * Get human-readable conflict reason
   */
  private getConflictReason(local: OfflineChange, remote: ContentChange): string {
    const target = local.target.blockId || local.target.activityId || local.target.sessionId || 'content'
    return `Conflicting changes to ${target} made around the same time`
  }

  /**
   * Attempt automatic conflict resolution
   */
  private attemptAutoResolve(
    conflict: ConflictResolution & { localChange: OfflineChange; remoteChange: ContentChange },
    strategy: ConflictStrategy
  ): ConflictResolution | null {
    switch (strategy) {
      case 'local_wins':
        return {
          ...conflict,
          type: 'auto',
          strategy: 'local_wins',
          resolution: 'keep_local'
        }

      case 'remote_wins':
        return {
          ...conflict,
          type: 'auto',
          strategy: 'remote_wins',
          resolution: 'accept_remote'
        }

      case 'merge':
        return this.attemptMerge(conflict)

      default:
        return null
    }
  }

  /**
   * Attempt to merge conflicting changes
   */
  private attemptMerge(
    conflict: ConflictResolution & { localChange: OfflineChange; remoteChange: ContentChange }
  ): ConflictResolution | null {
    const { localChange, remoteChange } = conflict

    // Only attempt merge for text content
    if (localChange.type !== 'content' || remoteChange.type !== 'insert') {
      return null
    }

    // Simple merge strategy for now
    // In a real implementation, this would use operational transformation
    try {
      const merged = {
        ...localChange.operation.newValue,
        ...remoteChange.data
      }

      return {
        ...conflict,
        type: 'auto',
        strategy: 'merge',
        resolution: 'merged',
        mergedValue: merged
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Transform operations to resolve conflicts
   */
  private transformOperations(ops1: TextOperation[], ops2: TextOperation[]): TextOperation[] {
    // Simplified operational transformation
    // Real implementation would need full OT algorithm
    return ops1.map(op => ({ ...op }))
  }

  /**
   * Apply text operations to a string
   */
  private applyOperations(text: string, operations: TextOperation[]): string {
    let result = text
    let offset = 0

    for (const op of operations) {
      switch (op.type) {
        case 'retain':
          offset += op.length || 0
          break
        case 'insert':
          result = result.slice(0, offset) + (op.text || '') + result.slice(offset)
          offset += op.text?.length || 0
          break
        case 'delete':
          result = result.slice(0, offset) + result.slice(offset + (op.length || 0))
          break
      }
    }

    return result
  }
}

/**
 * Performance Optimizer
 * Optimizes real-time collaboration performance
 */
export class CollaborationOptimizer {
  private updateQueue = new Map<string, any>()
  private batchTimeout: NodeJS.Timeout | null = null
  private readonly batchDelay = 100 // ms

  /**
   * Batch cursor updates to reduce network traffic
   */
  batchCursorUpdate = debounce((userId: string, position: any, sendFn: (data: any) => void) => {
    sendFn({ userId, position, timestamp: new Date() })
  }, 100)

  /**
   * Throttle content changes
   */
  throttleContentChange = throttle((change: any, sendFn: (data: any) => void) => {
    sendFn(change)
  }, 200)

  /**
   * Batch multiple updates
   */
  queueUpdate(key: string, data: any, sendFn: (batched: any[]) => void): void {
    this.updateQueue.set(key, data)

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }

    this.batchTimeout = setTimeout(() => {
      const batched = Array.from(this.updateQueue.values())
      this.updateQueue.clear()
      sendFn(batched)
    }, this.batchDelay)
  }

  /**
   * Compress data for transmission
   */
  compressData(data: any): any {
    // Simple compression - remove undefined values and minimize payload
    return JSON.parse(JSON.stringify(data, (key, value) => {
      if (value === undefined || value === null) return undefined
      return value
    }))
  }

  /**
   * Memory management for collaboration data
   */
  cleanupOldData(dataMap: Map<string, any>, maxAge: number = 300000): void {
    const now = Date.now()
    for (const [key, value] of dataMap.entries()) {
      if (value.timestamp && now - new Date(value.timestamp).getTime() > maxAge) {
        dataMap.delete(key)
      }
    }
  }
}

// Singleton instances
let offlineManager: OfflineChangeManager | null = null
let conflictResolver: ConflictResolver | null = null
let optimizer: CollaborationOptimizer | null = null

/**
 * Get offline manager instance
 */
export function getOfflineManager(): OfflineChangeManager {
  if (!offlineManager) {
    offlineManager = new OfflineChangeManager()
  }
  return offlineManager
}

/**
 * Get conflict resolver instance
 */
export function getConflictResolver(): ConflictResolver {
  if (!conflictResolver) {
    conflictResolver = new ConflictResolver()
  }
  return conflictResolver
}

/**
 * Get performance optimizer instance
 */
export function getCollaborationOptimizer(): CollaborationOptimizer {
  if (!optimizer) {
    optimizer = new CollaborationOptimizer()
  }
  return optimizer
}

/**
 * React hook for offline collaboration
 */
export function useOfflineCollaboration(courseId: string) {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine)
  const [pendingChanges, setPendingChanges] = React.useState<OfflineChange[]>([])
  const [conflicts, setConflicts] = React.useState<ConflictResolution[]>([])

  const offlineManager = getOfflineManager()
  const conflictResolver = getConflictResolver()

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  React.useEffect(() => {
    setPendingChanges(offlineManager.getPendingChanges())
  }, [offlineManager])

  const addOfflineChange = React.useCallback((change: Omit<OfflineChange, 'id' | 'timestamp'>) => {
    const id = offlineManager.addChange(change)
    setPendingChanges(offlineManager.getPendingChanges())
    return id
  }, [offlineManager])

  const syncChanges = React.useCallback(async (
    uploadFn: (changes: OfflineChange[]) => Promise<{ synced: string[]; conflicts: ConflictResolution[] }>
  ) => {
    const newConflicts = await offlineManager.syncChanges(uploadFn)
    setConflicts(prev => [...prev, ...newConflicts])
    setPendingChanges(offlineManager.getPendingChanges())
    return newConflicts
  }, [offlineManager])

  const resolveConflict = React.useCallback((conflictId: string, strategy: ConflictStrategy) => {
    // Implementation would resolve the specific conflict
    setConflicts(prev => prev.filter(c => c.id !== conflictId))
  }, [])

  return {
    isOnline,
    pendingChanges,
    conflicts,
    addOfflineChange,
    syncChanges,
    resolveConflict,
    hasPendingChanges: pendingChanges.length > 0,
    hasConflicts: conflicts.length > 0
  }
}