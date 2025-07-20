'use client'

interface PendingAction {
  id: string
  type: 'create' | 'update' | 'delete'
  endpoint: string
  method: string
  data?: any
  timestamp: number
  retries: number
  maxRetries: number
}

interface OfflineData {
  courses: any[]
  documents: any[]
  exports: any[]
  lastSync: number
}

class OfflineManager {
  private dbName = 'ai-course-creator-offline'
  private dbVersion = 1
  private db: IDBDatabase | null = null
  private initialized = false
  private syncInProgress = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      this.db = await this.openDatabase()
      this.initialized = true
      
      // Listen for online/offline events
      window.addEventListener('online', this.handleOnline.bind(this))
      window.addEventListener('offline', this.handleOffline.bind(this))
      
      // Sync pending actions if online
      if (navigator.onLine) {
        await this.syncPendingActions()
      }
    } catch (error) {
      console.error('Failed to initialize offline manager:', error)
    }
  }

  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create stores
        if (!db.objectStoreNames.contains('pendingActions')) {
          db.createObjectStore('pendingActions', { keyPath: 'id' })
        }
        
        if (!db.objectStoreNames.contains('offlineData')) {
          db.createObjectStore('offlineData', { keyPath: 'key' })
        }
        
        if (!db.objectStoreNames.contains('courses')) {
          const courseStore = db.createObjectStore('courses', { keyPath: 'id' })
          courseStore.createIndex('updatedAt', 'updatedAt')
        }
        
        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' })
          docStore.createIndex('createdAt', 'createdAt')
        }
      }
    })
  }

  // Cache data for offline access
  async cacheData(type: 'courses' | 'documents' | 'exports', data: any[]): Promise<void> {
    if (!this.db) return

    try {
      const transaction = this.db.transaction([type], 'readwrite')
      const store = transaction.objectStore(type)
      
      // Clear existing data
      await store.clear()
      
      // Add new data
      for (const item of data) {
        await store.add({
          ...item,
          cachedAt: Date.now()
        })
      }
      
      // Update last sync time
      await this.updateLastSync()
    } catch (error) {
      console.error(`Failed to cache ${type}:`, error)
    }
  }

  // Get cached data
  async getCachedData(type: 'courses' | 'documents' | 'exports'): Promise<any[]> {
    if (!this.db) return []

    try {
      const transaction = this.db.transaction([type], 'readonly')
      const store = transaction.objectStore(type)
      const request = store.getAll()
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`Failed to get cached ${type}:`, error)
      return []
    }
  }

  // Queue action for offline sync
  async queueAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    if (!this.db) return

    const pendingAction: PendingAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
      maxRetries: action.maxRetries || 3
    }

    try {
      const transaction = this.db.transaction(['pendingActions'], 'readwrite')
      const store = transaction.objectStore('pendingActions')
      await store.add(pendingAction)
      
      console.log('Queued offline action:', pendingAction)
      
      // Try to sync immediately if online
      if (navigator.onLine) {
        await this.syncPendingActions()
      }
    } catch (error) {
      console.error('Failed to queue action:', error)
    }
  }

  // Sync pending actions when back online
  async syncPendingActions(): Promise<void> {
    if (!this.db || this.syncInProgress || !navigator.onLine) return

    this.syncInProgress = true
    
    try {
      const transaction = this.db.transaction(['pendingActions'], 'readwrite')
      const store = transaction.objectStore('pendingActions')
      const actions = await this.getAllFromStore(store)
      
      console.log(`Syncing ${actions.length} pending actions`)
      
      for (const action of actions) {
        try {
          await this.executeAction(action)
          await store.delete(action.id)
          console.log('Synced action:', action.id)
        } catch (error) {
          console.error('Failed to sync action:', action, error)
          
          // Increment retry count
          action.retries++
          
          if (action.retries >= action.maxRetries) {
            // Remove action after max retries
            await store.delete(action.id)
            console.warn('Removed action after max retries:', action.id)
          } else {
            // Update with new retry count
            await store.put(action)
          }
        }
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  private async executeAction(action: PendingAction): Promise<void> {
    const response = await fetch(action.endpoint, {
      method: action.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: action.data ? JSON.stringify(action.data) : undefined
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  private getAuthToken(): string {
    // Get auth token from storage or state management
    return localStorage.getItem('auth-token') || ''
  }

  private async getAllFromStore(store: IDBObjectStore): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  private async updateLastSync(): Promise<void> {
    if (!this.db) return

    try {
      const transaction = this.db.transaction(['offlineData'], 'readwrite')
      const store = transaction.objectStore('offlineData')
      await store.put({
        key: 'lastSync',
        value: Date.now()
      })
    } catch (error) {
      console.error('Failed to update last sync:', error)
    }
  }

  async getLastSync(): Promise<number> {
    if (!this.db) return 0

    try {
      const transaction = this.db.transaction(['offlineData'], 'readonly')
      const store = transaction.objectStore('offlineData')
      const request = store.get('lastSync')
      
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result?.value || 0)
        request.onerror = () => resolve(0)
      })
    } catch (error) {
      console.error('Failed to get last sync:', error)
      return 0
    }
  }

  private handleOnline(): void {
    console.log('Back online - syncing pending actions')
    this.syncPendingActions()
  }

  private handleOffline(): void {
    console.log('Gone offline - actions will be queued')
  }

  // Check if data is stale and needs refresh
  isDataStale(maxAge: number = 5 * 60 * 1000): boolean {
    const lastSync = this.getLastSync()
    return Date.now() - lastSync > maxAge
  }

  // Get connection status
  isOnline(): boolean {
    return navigator.onLine
  }

  // Clean up old cached data
  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) return

    try {
      const stores = ['courses', 'documents', 'exports']
      const cutoff = Date.now() - maxAge

      for (const storeName of stores) {
        const transaction = this.db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const items = await this.getAllFromStore(store)
        
        for (const item of items) {
          if (item.cachedAt < cutoff) {
            await store.delete(item.id)
          }
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error)
    }
  }

  // Export data for debugging
  async exportData(): Promise<any> {
    if (!this.db) return null

    try {
      const data: any = {}
      const stores = ['courses', 'documents', 'exports', 'pendingActions']
      
      for (const storeName of stores) {
        const transaction = this.db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        data[storeName] = await this.getAllFromStore(store)
      }
      
      data.lastSync = await this.getLastSync()
      return data
    } catch (error) {
      console.error('Export failed:', error)
      return null
    }
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager()

// Initialize when module loads
if (typeof window !== 'undefined') {
  offlineManager.initialize()
}

export default offlineManager