import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import {
  analytics,
  Analytics,
  AnalyticsEvents,
  trackEvent,
  trackPageView,
  identifyUser,
  courseAnalytics,
  performanceAnalytics,
  engagementAnalytics,
} from '../analytics'

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock Google Analytics
const mockGtag = jest.fn()
;(global as any).gtag = mockGtag

describe('analytics utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.clear()
    mockGtag.mockClear()
    ;(global as any).gtag = mockGtag
    analytics.clearData()
    analytics.setEnabled(true)
  })

  afterEach(() => {
    analytics.setEnabled(false)
    analytics.clearData()
    jest.clearAllMocks()
  })

  describe('Analytics class', () => {
    it('should initialize with default settings', () => {
      expect(analytics.isAnalyticsEnabled()).toBe(true)
    })

    it('should track events when enabled', () => {
      analytics.setEnabled(true)
      analytics.track('test_event', { property: 'value' })

      expect(mockGtag).toHaveBeenCalledWith('event', 'test_event', {
        property: 'value',
        timestamp: expect.any(String),
      })
    })

    it('should not track events when disabled', () => {
      analytics.setEnabled(false)
      analytics.track('test_event', { property: 'value' })

      expect(mockGtag).not.toHaveBeenCalled()
    })

    it('should track page views', () => {
      analytics.page('/dashboard', { section: 'courses' })

      expect(mockGtag).toHaveBeenCalledWith('config', expect.any(String), {
        page_path: '/dashboard',
        section: 'courses',
        timestamp: expect.any(String),
      })
    })

    it('should identify users', () => {
      const userProps = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      }

      analytics.identify('user-123', userProps)

      expect(mockGtag).toHaveBeenCalledWith('config', expect.any(String), {
        user_id: 'user-123',
        custom_map: userProps,
      })
    })

    it('should store events locally when localStorage provider is active', () => {
      analytics.track('local_event', { test: true })

      const storedEvents = JSON.parse(mockLocalStorage.getItem('analytics_events') || '[]')
      expect(storedEvents).toHaveLength(1)
      expect(storedEvents[0]).toMatchObject({
        event: 'local_event',
        properties: { test: true },
      })
    })

    it('should export analytics data', () => {
      analytics.track('event1', { prop: 'value1' })
      analytics.track('event2', { prop: 'value2' })

      const exportedData = analytics.exportData()
      expect(exportedData).toHaveLength(2)
      expect(exportedData[0].event).toBe('event1')
      expect(exportedData[1].event).toBe('event2')
    })

    it('should clear analytics data', () => {
      analytics.track('event1', { prop: 'value1' })
      analytics.track('event2', { prop: 'value2' })

      analytics.clearData()

      const exportedData = analytics.exportData()
      expect(exportedData).toHaveLength(0)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('analytics_events')
    })

    it('should respect user privacy settings', () => {
      // Simulate user declining analytics
      mockLocalStorage.setItem('analytics_consent', 'false')
      
      const newAnalytics = new Analytics()
      expect(newAnalytics.isAnalyticsEnabled()).toBe(false)
    })

    it('should handle provider errors gracefully', () => {
      // Mock gtag to throw an error
      mockGtag.mockImplementation(() => {
        throw new Error('Analytics provider error')
      })

      expect(() => {
        analytics.track('error_event', { test: true })
      }).not.toThrow()
    })
  })

  describe('convenience functions', () => {
    it('should track events using convenience function', () => {
      trackEvent('button_clicked', { button_id: 'submit' })

      expect(mockGtag).toHaveBeenCalledWith('event', 'button_clicked', {
        button_id: 'submit',
        timestamp: expect.any(String),
      })
    })

    it('should track page views using convenience function', () => {
      trackPageView('/courses', { section: 'course-list' })

      expect(mockGtag).toHaveBeenCalledWith('config', expect.any(String), {
        page_path: '/courses',
        section: 'course-list',
        timestamp: expect.any(String),
      })
    })

    it('should identify users using convenience function', () => {
      identifyUser('user-456', { role: 'editor' })

      expect(mockGtag).toHaveBeenCalledWith('config', expect.any(String), {
        user_id: 'user-456',
        custom_map: { role: 'editor' },
      })
    })
  })

  describe('course analytics', () => {
    it('should track course creation', () => {
      courseAnalytics.created('course-123', {
        title: 'JavaScript Fundamentals',
        difficulty: 'beginner',
      })

      expect(mockGtag).toHaveBeenCalledWith('event', AnalyticsEvents.COURSE_CREATED, {
        course_id: 'course-123',
        title: 'JavaScript Fundamentals',
        difficulty: 'beginner',
        timestamp: expect.any(String),
      })
    })

    it('should track course updates', () => {
      courseAnalytics.updated('course-123', {
        changes: ['title', 'description'],
        session_count: 5,
      })

      expect(mockGtag).toHaveBeenCalledWith('event', AnalyticsEvents.COURSE_UPDATED, {
        course_id: 'course-123',
        changes: ['title', 'description'],
        session_count: 5,
        timestamp: expect.any(String),
      })
    })

    it('should track course views', () => {
      courseAnalytics.viewed('course-123', {
        view_duration: 120,
        user_role: 'student',
      })

      expect(mockGtag).toHaveBeenCalledWith('event', AnalyticsEvents.COURSE_VIEWED, {
        course_id: 'course-123',
        view_duration: 120,
        user_role: 'student',
        timestamp: expect.any(String),
      })
    })

    it('should track course sharing', () => {
      courseAnalytics.shared('course-123', {
        share_method: 'email',
        recipient_count: 3,
      })

      expect(mockGtag).toHaveBeenCalledWith('event', AnalyticsEvents.COURSE_SHARED, {
        course_id: 'course-123',
        share_method: 'email',
        recipient_count: 3,
        timestamp: expect.any(String),
      })
    })
  })

  describe('performance analytics', () => {
    it('should track page load time', () => {
      performanceAnalytics.pageLoad('/dashboard', 1250)

      expect(mockGtag).toHaveBeenCalledWith('event', AnalyticsEvents.PAGE_LOAD_TIME, {
        page_path: '/dashboard',
        load_time: 1250,
        timestamp: expect.any(String),
      })
    })

    it('should track API response time', () => {
      performanceAnalytics.apiResponse('/api/courses', 'GET', 450, 200)

      expect(mockGtag).toHaveBeenCalledWith('event', AnalyticsEvents.API_RESPONSE_TIME, {
        endpoint: '/api/courses',
        method: 'GET',
        response_time: 450,
        status_code: 200,
        timestamp: expect.any(String),
      })
    })

    it('should track errors', () => {
      performanceAnalytics.error('TypeError: Cannot read property', '/courses', {
        component: 'CourseList',
        stack: 'Error at CourseList.render',
      })

      expect(mockGtag).toHaveBeenCalledWith('event', AnalyticsEvents.ERROR_OCCURRED, {
        error_message: 'TypeError: Cannot read property',
        page_path: '/courses',
        component: 'CourseList',
        stack: 'Error at CourseList.render',
        timestamp: expect.any(String),
      })
    })

    it('should track Core Web Vitals', () => {
      performanceAnalytics.coreWebVitals({
        lcp: 2.5,
        fid: 100,
        cls: 0.1,
        fcp: 1.8,
        ttfb: 600,
      })

      expect(mockGtag).toHaveBeenCalledWith('event', 'core_web_vitals', {
        lcp: 2.5,
        fid: 100,
        cls: 0.1,
        fcp: 1.8,
        ttfb: 600,
        timestamp: expect.any(String),
      })
    })
  })

  describe('engagement analytics', () => {
    it('should track feature usage', () => {
      engagementAnalytics.featureUsed('course_builder', {
        step: 'configuration',
        completion_rate: 0.75,
      })

      expect(mockGtag).toHaveBeenCalledWith('event', AnalyticsEvents.FEATURE_USED, {
        feature_name: 'course_builder',
        step: 'configuration',
        completion_rate: 0.75,
        timestamp: expect.any(String),
      })
    })

    it('should track search queries', () => {
      engagementAnalytics.search('javascript functions', {
        results_count: 15,
        clicked_result: 3,
      })

      expect(mockGtag).toHaveBeenCalledWith('event', AnalyticsEvents.SEARCH_PERFORMED, {
        search_query: 'javascript functions',
        results_count: 15,
        clicked_result: 3,
        timestamp: expect.any(String),
      })
    })

    it('should track button clicks', () => {
      engagementAnalytics.buttonClick('create_course', {
        page: '/dashboard',
        position: 'header',
      })

      expect(mockGtag).toHaveBeenCalledWith('event', AnalyticsEvents.BUTTON_CLICKED, {
        button_id: 'create_course',
        page: '/dashboard',
        position: 'header',
        timestamp: expect.any(String),
      })
    })

    it('should track downloads', () => {
      engagementAnalytics.download('course-export.zip', {
        format: 'html',
        size: '2.5MB',
      })

      expect(mockGtag).toHaveBeenCalledWith('event', AnalyticsEvents.EXPORT_DOWNLOADED, {
        file_name: 'course-export.zip',
        format: 'html',
        size: '2.5MB',
        timestamp: expect.any(String),
      })
    })
  })

  describe('privacy and consent', () => {
    it('should respect Do Not Track header', () => {
      // Mock Do Not Track
      Object.defineProperty(navigator, 'doNotTrack', {
        value: '1',
        writable: true,
      })

      const analytics = new Analytics()
      expect(analytics.isAnalyticsEnabled()).toBe(false)
    })

    it('should handle consent withdrawal', () => {
      analytics.setEnabled(true)
      analytics.track('event_before_withdrawal', {})

      analytics.setEnabled(false)
      analytics.track('event_after_withdrawal', {})

      // Should only have been called once
      expect(mockGtag).toHaveBeenCalledTimes(1)
    })

    it('should allow data export for GDPR compliance', () => {
      analytics.track('gdpr_event_1', { data: 'value1' })
      analytics.track('gdpr_event_2', { data: 'value2' })

      const exportedData = analytics.exportData()
      expect(exportedData).toHaveLength(2)
      expect(typeof exportedData[0].timestamp).toBe('string')
      expect(typeof exportedData[0].event).toBe('string')
    })

    it('should allow complete data deletion', () => {
      analytics.track('event_to_delete', {})
      analytics.clearData()

      const exportedData = analytics.exportData()
      expect(exportedData).toHaveLength(0)
    })
  })

  describe('error handling and resilience', () => {
    it('should handle missing gtag gracefully', () => {
      delete (global as any).gtag

      expect(() => {
        analytics.track('test_event', {})
      }).not.toThrow()
    })

    it('should handle localStorage unavailability', () => {
      const originalLocalStorage = window.localStorage
      delete (window as any).localStorage

      expect(() => {
        const analytics = new Analytics()
        analytics.track('test_event', {})
      }).not.toThrow()

      // Restore localStorage
      ;(window as any).localStorage = originalLocalStorage
    })

    it('should handle malformed stored events', () => {
      mockLocalStorage.setItem('analytics_events', 'invalid json')

      expect(() => {
        const analytics = new Analytics()
        analytics.exportData()
      }).not.toThrow()
    })

    it('should sanitize event properties', () => {
      const unsafeProps = {
        safe_prop: 'value',
        script: '<script>alert("xss")</script>',
        function: () => {},
        object: { nested: 'value' },
      }

      analytics.track('sanitization_test', unsafeProps)

      expect(mockGtag).toHaveBeenCalled()
      const call = mockGtag.mock.calls[0]
      expect(call[0]).toBe('event')
      expect(call[1]).toBe('sanitization_test')
      const eventProps = call[2]
      expect(eventProps.safe_prop).toBe('value')
      expect(eventProps.script).toBe('[Sanitized]')
      expect(eventProps.function).toBe('[Function]')
      expect(eventProps.object).toBe('[Object]')
    })
  })

  describe('batch operations', () => {
    it('should support batching events', () => {
      const events = [
        { event: 'event1', properties: { prop1: 'value1' } },
        { event: 'event2', properties: { prop2: 'value2' } },
        { event: 'event3', properties: { prop3: 'value3' } },
      ]

      analytics.trackBatch(events)

      expect(mockGtag).toHaveBeenCalledTimes(3)
      expect(mockGtag).toHaveBeenNthCalledWith(1, 'event', 'event1', expect.any(Object))
      expect(mockGtag).toHaveBeenNthCalledWith(2, 'event', 'event2', expect.any(Object))
      expect(mockGtag).toHaveBeenNthCalledWith(3, 'event', 'event3', expect.any(Object))
    })

    it('should respect enabled state for batch operations', () => {
      analytics.setEnabled(false)

      const events = [
        { event: 'event1', properties: {} },
        { event: 'event2', properties: {} },
      ]

      analytics.trackBatch(events)

      expect(mockGtag).not.toHaveBeenCalled()
    })
  })
})