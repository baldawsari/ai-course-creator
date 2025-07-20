// Service Worker for PWA functionality
// This file will be registered and run in the browser as a service worker

const CACHE_NAME = 'ai-course-creator-v1'
const OFFLINE_URL = '/offline'

// Resources to cache for offline functionality
const CACHE_URLS = [
  '/',
  '/dashboard',
  '/courses',
  '/exports',
  '/settings',
  '/offline',
  '/manifest.json',
  // Add critical CSS and JS files
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/pages/_app.js',
  // Add fonts
  '/fonts/inter-var.woff2',
  '/fonts/lexend-var.woff2',
  // Add essential images
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/logo.svg',
]

// Install event - cache resources
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      console.log('Caching app shell')
      try {
        await cache.addAll(CACHE_URLS)
      } catch (error) {
        console.error('Failed to cache resources:', error)
        // Cache resources individually to avoid failures
        for (const url of CACHE_URLS) {
          try {
            await cache.add(url)
          } catch (err) {
            console.warn(`Failed to cache ${url}:`, err)
          }
        }
      }
    })()
  )
  
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          })
      )
      
      // Take control of all clients
      await self.clients.claim()
    })()
  )
})

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try network first
          const response = await fetch(request)
          return response
        } catch (error) {
          console.log('Network failed, serving offline page')
          // Serve offline page for navigation
          const cache = await caches.open(CACHE_NAME)
          const offlineResponse = await cache.match(OFFLINE_URL)
          return offlineResponse || new Response('Offline')
        }
      })()
    )
    return
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          // Always try network first for API requests
          const response = await fetch(request)
          
          // Cache successful GET requests
          if (response.ok && request.method === 'GET') {
            const cache = await caches.open(CACHE_NAME)
            cache.put(request, response.clone())
          }
          
          return response
        } catch (error) {
          // Try to serve from cache for GET requests
          if (request.method === 'GET') {
            const cachedResponse = await caches.match(request)
            if (cachedResponse) {
              return cachedResponse
            }
          }
          
          // Return error response for failed API requests
          return new Response(
            JSON.stringify({
              error: 'Network unavailable',
              message: 'Please check your internet connection'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
      })()
    )
    return
  }
  
  // Handle static assets
  event.respondWith(
    (async () => {
      // Try cache first for static assets
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        return cachedResponse
      }
      
      try {
        // Try network
        const response = await fetch(request)
        
        // Cache successful responses
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, response.clone())
        }
        
        return response
      } catch (error) {
        console.log('Failed to fetch:', request.url)
        
        // Return fallback for images
        if (request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="currentColor"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af">Image</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          )
        }
        
        throw error
      }
    })()
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event: any) => {
  console.log('Background sync event:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      (async () => {
        try {
          // Sync pending actions when back online
          const pendingActions = await getPendingActions()
          
          for (const action of pendingActions) {
            try {
              await syncAction(action)
              await removePendingAction(action.id)
            } catch (error) {
              console.error('Failed to sync action:', action, error)
            }
          }
        } catch (error) {
          console.error('Background sync failed:', error)
        }
      })()
    )
  }
})

// Push notification handling
self.addEventListener('push', (event: any) => {
  console.log('Push notification received')
  
  const options = {
    body: 'You have new updates in AI Course Creator',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  }
  
  if (event.data) {
    try {
      const data = event.data.json()
      options.body = data.body || options.body
      options.data = { ...options.data, ...data }
    } catch (error) {
      console.error('Failed to parse push data:', error)
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('AI Course Creator', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close()
  
  const urlToOpen = event.notification.data?.url || '/'
  
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window' })
      
      // Check if app is already open
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    })()
  )
})

// Helper functions for offline sync
async function getPendingActions(): Promise<any[]> {
  try {
    // Get pending actions from IndexedDB or localStorage
    const db = await openDB()
    const transaction = db.transaction(['pendingActions'], 'readonly')
    const store = transaction.objectStore('pendingActions')
    return await store.getAll()
  } catch (error) {
    console.error('Failed to get pending actions:', error)
    return []
  }
}

async function syncAction(action: any): Promise<void> {
  // Sync individual action with server
  const response = await fetch(action.url, {
    method: action.method,
    headers: action.headers,
    body: action.body
  })
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.statusText}`)
  }
}

async function removePendingAction(actionId: string): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction(['pendingActions'], 'readwrite')
    const store = transaction.objectStore('pendingActions')
    await store.delete(actionId)
  } catch (error) {
    console.error('Failed to remove pending action:', error)
  }
}

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ai-course-creator-db', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id' })
      }
    }
  })
}

export {}

declare const self: ServiceWorkerGlobalScope