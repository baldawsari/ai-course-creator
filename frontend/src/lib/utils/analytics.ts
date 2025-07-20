// =============================================================================
// ANALYTICS & TRACKING UTILITIES
// =============================================================================

// Event tracking interface
interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  timestamp?: number
  userId?: string
  sessionId?: string
}

interface UserProperties {
  userId: string
  email?: string
  name?: string
  organization?: string
  role?: string
  plan?: string
  signupDate?: string
}

interface PageView {
  path: string
  title?: string
  referrer?: string
  timestamp?: number
  userId?: string
  sessionId?: string
}

// =============================================================================
// CORE ANALYTICS CLASS
// =============================================================================

export class Analytics {
  private userId: string | null = null
  private sessionId: string
  private isEnabled: boolean = true
  private queue: AnalyticsEvent[] = []
  private providers: AnalyticsProvider[] = []

  constructor() {
    this.sessionId = this.generateSessionId()
    this.loadUserFromStorage()
    this.loadConsentFromStorage()
    this.checkDoNotTrack()
  }
  
  private loadConsentFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const consent = localStorage.getItem('analytics_consent')
        if (consent === 'false') {
          this.isEnabled = false
        }
      } catch (error) {
        // localStorage might not be available
        console.warn('localStorage not available:', error)
      }
    }
  }
  
  private checkDoNotTrack(): void {
    if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') {
      this.isEnabled = false
    }
  }

  // Session management
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private loadUserFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('analytics_user_id')
        if (stored) {
          this.userId = stored
        }
      } catch (error) {
        // localStorage might not be available
        console.warn('localStorage not available:', error)
      }
    }
  }

  // User identification
  identify(userId: string, properties?: UserProperties): void {
    this.userId = userId
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('analytics_user_id', userId)
      } catch (error) {
        // localStorage might not be available
        console.warn('localStorage not available:', error)
      }
    }
    
    // Call gtag directly if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      try {
        (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX', {
          user_id: userId,
          custom_map: properties,
        })
      } catch (error) {
        console.warn('Analytics gtag error:', error)
      }
    }

    this.providers.forEach(provider => {
      provider.identify?.(userId, properties)
    })

    // Track identification event
    this.track('user_identified', {
      userId,
      ...properties,
    })
  }

  // Sanitize properties to remove sensitive data and dangerous values
  private sanitizeProps(properties?: Record<string, any>): Record<string, any> {
    if (!properties) return {}
    
    const sanitized: Record<string, any> = {}
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'api_key', 'auth', 'authorization']
    
    for (const [key, value] of Object.entries(properties)) {
      const lowerKey = key.toLowerCase()
      const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]'
      } else if (value === null || value === undefined) {
        // Skip null/undefined values
        continue
      } else if (typeof value === 'function') {
        sanitized[key] = '[Function]'
      } else if (typeof value === 'string' && value.includes('<script>')) {
        sanitized[key] = '[Sanitized]'
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = '[Object]'
      } else {
        sanitized[key] = value
      }
    }
    
    return sanitized
  }

  // Event tracking
  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return

    // Sanitize properties
    const sanitizedProps = this.sanitizeProps(properties)

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...sanitizedProps,
        timestamp: new Date().toISOString(),
      },
      timestamp: Date.now(),
      userId: this.userId || undefined,
      sessionId: this.sessionId,
    }

    this.queue.push(event)
    
    // Call gtag directly if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      try {
        (window as any).gtag('event', eventName, {
          ...sanitizedProps,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.warn('Analytics gtag error:', error)
      }
    }
    
    this.providers.forEach(provider => {
      provider.track?.(event)
    })

    // Send to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', event)
    }
  }

  // Page view tracking
  page(path: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return

    const pageView: PageView = {
      path,
      title: document?.title,
      referrer: document?.referrer,
      timestamp: Date.now(),
      userId: this.userId || undefined,
      sessionId: this.sessionId,
    }
    
    // Call gtag directly if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      try {
        (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX', {
          page_path: path,
          ...properties,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.warn('Analytics gtag error:', error)
      }
    }

    this.providers.forEach(provider => {
      provider.page?.(pageView)
    })

    // Track as event
    this.track('page_viewed', {
      path,
      title: pageView.title,
      referrer: pageView.referrer,
      ...properties,
    })
  }

  // Provider management
  addProvider(provider: AnalyticsProvider): void {
    this.providers.push(provider)
  }

  removeProvider(name: string): void {
    this.providers = this.providers.filter(p => p.name !== name)
  }

  // Privacy controls
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('analytics_consent', enabled ? 'true' : 'false')
      } catch (error) {
        // localStorage might not be available
        console.warn('localStorage not available:', error)
      }
    }
  }

  isAnalyticsEnabled(): boolean {
    return this.isEnabled
  }

  // Data export
  exportData(): any[] {
    return this.queue.map(event => ({
      event: event.name,
      properties: event.properties,
      timestamp: new Date(event.timestamp).toISOString(),
      userId: event.userId,
      sessionId: event.sessionId,
    }))
  }

  clearData(): void {
    this.queue = []
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('analytics_user_id')
        localStorage.removeItem('analytics_consent')
        localStorage.removeItem('analytics_events')
      } catch (error) {
        // localStorage might not be available
        console.warn('localStorage not available:', error)
      }
    }
  }

  // Batch tracking for multiple events
  trackBatch(events: Array<{ event: string; properties?: Record<string, any> } | { name: string; properties?: Record<string, any> }>): void {
    if (!this.isEnabled || !events || events.length === 0) return
    
    const batchTimestamp = Date.now()
    const batchEvents: AnalyticsEvent[] = []
    
    events.forEach((item) => {
      // Support both 'event' and 'name' properties for backward compatibility
      const eventName = 'event' in item ? item.event : item.name
      const sanitizedProps = this.sanitizeProps(item.properties)
      
      const event: AnalyticsEvent = {
        name: eventName,
        properties: {
          ...sanitizedProps,
          timestamp: new Date().toISOString(),
          batch_timestamp: new Date(batchTimestamp).toISOString(),
        },
        timestamp: Date.now(),
        userId: this.userId || undefined,
        sessionId: this.sessionId,
      }
      
      batchEvents.push(event)
      this.queue.push(event)
      
      // Track each event individually via gtag
      if (typeof window !== 'undefined' && (window as any).gtag) {
        try {
          (window as any).gtag('event', eventName, {
            ...sanitizedProps,
            timestamp: new Date().toISOString(),
            batch_timestamp: new Date(batchTimestamp).toISOString(),
          })
        } catch (error) {
          console.warn('Analytics gtag error:', error)
        }
      }
    })
    
    // Send batch to providers
    this.providers.forEach(provider => {
      if (provider.trackBatch) {
        provider.trackBatch(batchEvents)
      } else {
        // Fallback to individual tracking
        batchEvents.forEach(event => provider.track?.(event))
      }
    })
    
    // Send to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Batch:', batchEvents)
    }
  }
}

// =============================================================================
// ANALYTICS PROVIDER INTERFACE
// =============================================================================

interface AnalyticsProvider {
  name: string
  identify?(userId: string, properties?: UserProperties): void
  track?(event: AnalyticsEvent): void
  trackBatch?(events: AnalyticsEvent[]): void
  page?(pageView: PageView): void
}

// =============================================================================
// BUILT-IN PROVIDERS
// =============================================================================

// Google Analytics 4 Provider
class GoogleAnalyticsProvider implements AnalyticsProvider {
  name = 'google-analytics'
  private measurementId: string

  constructor(measurementId: string) {
    this.measurementId = measurementId
    this.initialize()
  }

  private initialize(): void {
    if (typeof window === 'undefined') return

    // Load gtag script
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`
    document.head.appendChild(script)

    // Initialize gtag
    window.dataLayer = window.dataLayer || []
    function gtag(...args: any[]) {
      window.dataLayer.push(args)
    }
    
    gtag('js', new Date())
    gtag('config', this.measurementId)
    
    // Make gtag available globally
    ;(window as any).gtag = gtag
  }

  identify(userId: string, properties?: UserProperties): void {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('config', this.measurementId, {
        user_id: userId,
        custom_map: properties,
      })
    }
  }

  track(event: AnalyticsEvent): void {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('event', event.name, {
        ...event.properties,
        event_category: 'engagement',
        event_label: event.name,
      })
    }
  }

  page(pageView: PageView): void {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('config', this.measurementId, {
        page_path: pageView.path,
        page_title: pageView.title,
      })
    }
  }
}

// Console Provider (for development)
class ConsoleProvider implements AnalyticsProvider {
  name = 'console'

  identify(userId: string, properties?: UserProperties): void {
    console.log('👤 User Identified:', { userId, ...properties })
  }

  track(event: AnalyticsEvent): void {
    console.log('📊 Event Tracked:', event)
  }

  page(pageView: PageView): void {
    console.log('📄 Page Viewed:', pageView)
  }
}

// Local Storage Provider (for offline tracking)
class LocalStorageProvider implements AnalyticsProvider {
  name = 'localStorage'
  private storageKey = 'analytics_events'

  track(event: AnalyticsEvent): void {
    if (typeof window === 'undefined') return

    try {
      const existing = localStorage.getItem(this.storageKey)
      const events = existing ? JSON.parse(existing) : []
      
      // Store in the format expected by tests
      events.push({
        event: event.name,
        properties: event.properties,
        timestamp: event.timestamp,
        userId: event.userId,
        sessionId: event.sessionId,
      })
      
      // Keep only last 1000 events
      if (events.length > 1000) {
        events.splice(0, events.length - 1000)
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(events))
    } catch (error) {
      console.warn('Failed to store analytics event:', error)
    }
  }

  getStoredEvents(): AnalyticsEvent[] {
    if (typeof window === 'undefined') return []

    try {
      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  clearStoredEvents(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey)
    }
  }
}

// =============================================================================
// PREDEFINED EVENTS
// =============================================================================

export const AnalyticsEvents = {
  // Authentication
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  PASSWORD_RESET: 'password_reset',

  // Course Management
  COURSE_CREATED: 'course_created',
  COURSE_UPDATED: 'course_updated',
  COURSE_DELETED: 'course_deleted',
  COURSE_VIEWED: 'course_viewed',
  COURSE_SHARED: 'course_shared',

  // Document Upload
  DOCUMENT_UPLOADED: 'document_uploaded',
  DOCUMENT_PROCESSED: 'document_processed',
  DOCUMENT_DELETED: 'document_deleted',

  // Course Generation
  GENERATION_STARTED: 'generation_started',
  GENERATION_COMPLETED: 'generation_completed',
  GENERATION_FAILED: 'generation_failed',
  GENERATION_CANCELLED: 'generation_cancelled',

  // Export
  EXPORT_STARTED: 'export_started',
  EXPORT_COMPLETED: 'export_completed',
  EXPORT_DOWNLOADED: 'export_downloaded',

  // UI Interactions
  BUTTON_CLICKED: 'button_clicked',
  FEATURE_USED: 'feature_used',
  MODAL_OPENED: 'modal_opened',
  SEARCH_PERFORMED: 'search_performed',

  // Performance
  PAGE_LOAD_TIME: 'page_load_time',
  API_RESPONSE_TIME: 'api_response_time',
  ERROR_OCCURRED: 'error_occurred',

  // Engagement
  TIME_SPENT: 'time_spent',
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
} as const

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

// Create analytics instance
export const analytics = new Analytics()

// Add default providers
if (process.env.NODE_ENV === 'development') {
  analytics.addProvider(new ConsoleProvider())
}

analytics.addProvider(new LocalStorageProvider())

// Add Google Analytics if ID is provided
if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
  analytics.addProvider(new GoogleAnalyticsProvider(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID))
}

// Export main functions
export function trackEvent(name: string, properties?: Record<string, any>): void {
  analytics.track(name, properties)
}

export function trackPageView(path: string, properties?: Record<string, any>): void {
  analytics.page(path, properties)
}

export function identifyUser(userId: string, properties?: UserProperties): void {
  analytics.identify(userId, properties)
}

export function setAnalyticsEnabled(enabled: boolean): void {
  analytics.setEnabled(enabled)
}

export function isAnalyticsEnabled(): boolean {
  return analytics.isAnalyticsEnabled()
}

// Course-specific tracking helpers
export const courseAnalytics = {
  created: (courseId: string, properties?: Record<string, any>) => {
    trackEvent(AnalyticsEvents.COURSE_CREATED, {
      course_id: courseId,
      ...properties,
    })
  },

  updated: (courseId: string, properties?: Record<string, any>) => {
    trackEvent(AnalyticsEvents.COURSE_UPDATED, {
      course_id: courseId,
      ...properties,
    })
  },

  viewed: (courseId: string, properties?: Record<string, any>) => {
    trackEvent(AnalyticsEvents.COURSE_VIEWED, {
      course_id: courseId,
      ...properties,
    })
  },
  
  shared: (courseId: string, properties?: Record<string, any>) => {
    trackEvent(AnalyticsEvents.COURSE_SHARED, {
      course_id: courseId,
      ...properties,
    })
  },

  generated: (courseId: string, duration: number, properties?: Record<string, any>) => {
    trackEvent(AnalyticsEvents.GENERATION_COMPLETED, {
      courseId,
      duration,
      ...properties,
    })
  },

  exported: (courseId: string, format: string, properties?: Record<string, any>) => {
    trackEvent(AnalyticsEvents.EXPORT_COMPLETED, {
      courseId,
      format,
      ...properties,
    })
  },
}

// Performance tracking helpers
export const performanceAnalytics = {
  pageLoad: (path: string, loadTime: number) => {
    trackEvent(AnalyticsEvents.PAGE_LOAD_TIME, {
      page_path: path,
      load_time: loadTime,
    })
  },

  apiCall: (endpoint: string, responseTime: number, properties?: Record<string, any>) => {
    trackEvent(AnalyticsEvents.API_RESPONSE_TIME, {
      api_endpoint: endpoint,
      response_time_ms: responseTime,
      ...properties,
    })
  },
  
  apiResponse: (endpoint: string, method: string, responseTime: number, statusCode: number) => {
    trackEvent(AnalyticsEvents.API_RESPONSE_TIME, {
      endpoint,
      method,
      response_time: responseTime,
      status_code: statusCode,
    })
  },

  error: (errorMessage: string, path: string, context?: Record<string, any>) => {
    trackEvent(AnalyticsEvents.ERROR_OCCURRED, {
      error_message: errorMessage,
      page_path: path,
      ...context,
    })
  },
  
  coreWebVitals: (metrics: Record<string, number>) => {
    trackEvent('core_web_vitals', metrics)
  },
}

// Engagement tracking helpers
export const engagementAnalytics = {
  featureUsed: (feature: string, properties?: Record<string, any>) => {
    trackEvent(AnalyticsEvents.FEATURE_USED, {
      feature_name: feature,
      ...properties,
    })
  },

  timeSpent: (page: string, duration: number) => {
    trackEvent(AnalyticsEvents.TIME_SPENT, {
      page,
      duration,
    })
  },

  search: (query: string, properties?: Record<string, any>) => {
    trackEvent(AnalyticsEvents.SEARCH_PERFORMED, {
      search_query: query,
      ...properties,
    })
  },
  
  buttonClick: (buttonId: string, properties?: Record<string, any>) => {
    trackEvent(AnalyticsEvents.BUTTON_CLICKED, {
      button_id: buttonId,
      ...properties,
    })
  },
  
  download: (resource: string, properties?: Record<string, any>) => {
    trackEvent(AnalyticsEvents.EXPORT_DOWNLOADED, {
      file_name: resource,
      ...properties,
    })
  },
}

// =============================================================================
// REACT HOOKS
// =============================================================================

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

// Track page views automatically
export function usePageTracking(): void {
  const pathname = usePathname()
  const prevPathname = useRef<string>()

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      trackPageView(pathname)
      prevPathname.current = pathname
    }
  }, [pathname])
}

// Track time spent on page
export function useTimeTracking(pageName?: string): void {
  const startTime = useRef<number>()
  const pathname = usePathname()
  const page = pageName || pathname

  useEffect(() => {
    startTime.current = Date.now()

    return () => {
      if (startTime.current) {
        const duration = Date.now() - startTime.current
        engagementAnalytics.timeSpent(page, duration)
      }
    }
  }, [page])
}

// Track feature usage
export function useFeatureTracking(feature: string) {
  return (properties?: Record<string, any>) => {
    engagementAnalytics.featureUsed(feature, properties)
  }
}

// Export analytics instance for advanced usage
export { analytics }
export type { AnalyticsEvent, UserProperties, PageView, AnalyticsProvider }