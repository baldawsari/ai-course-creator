import { test, expect } from '@playwright/test'
import { TestHelpers } from '../utils/test-helpers'

test.describe('Dashboard', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await helpers.login()
  })

  test('should display dashboard correctly', async ({ page }) => {
    await helpers.goToDashboard()
    
    // Check main dashboard elements
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
    await expect(page.locator('[data-testid="welcome-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="stats-cards"]')).toBeVisible()
    await expect(page.locator('[data-testid="recent-courses"]')).toBeVisible()
    await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible()
    
    // Check navigation elements
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should show personalized welcome message', async ({ page }) => {
    await helpers.mockApiResponse('**/auth/me', {
      user: { id: '1', name: 'John Doe', email: 'john@example.com' }
    })
    
    await helpers.goToDashboard()
    
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome back, John!')
  })

  test('should display accurate stats cards', async ({ page }) => {
    await helpers.mockApiResponse('**/dashboard/stats', {
      totalCourses: 15,
      publishedCourses: 12,
      totalStudents: 245,
      avgRating: 4.7,
      tokensUsed: 125000,
      storageUsed: 2.3, // GB
    })
    
    await helpers.goToDashboard()
    
    // Check stats cards content
    await expect(page.locator('[data-testid="stat-total-courses"]')).toContainText('15')
    await expect(page.locator('[data-testid="stat-published-courses"]')).toContainText('12')
    await expect(page.locator('[data-testid="stat-total-students"]')).toContainText('245')
    await expect(page.locator('[data-testid="stat-avg-rating"]')).toContainText('4.7')
    
    // Check animated counters
    const totalCoursesCounter = page.locator('[data-testid="counter-total-courses"]')
    await expect(totalCoursesCounter).toHaveClass(/animate-counter/)
  })

  test('should display recent courses with correct actions', async ({ page }) => {
    await helpers.mockApiResponse('**/courses?recent=true&limit=6', {
      courses: [
        {
          id: 'course-1',
          title: 'JavaScript Fundamentals',
          status: 'published',
          lastModified: '2024-01-15T10:30:00Z',
          thumbnail: '/thumbnails/js-course.jpg'
        },
        {
          id: 'course-2', 
          title: 'React Advanced Patterns',
          status: 'draft',
          lastModified: '2024-01-14T16:45:00Z',
          thumbnail: '/thumbnails/react-course.jpg'
        }
      ]
    })
    
    await helpers.goToDashboard()
    
    // Check recent courses section
    const recentCourses = page.locator('[data-testid="recent-courses"]')
    await expect(recentCourses.locator('[data-testid="course-card-course-1"]')).toBeVisible()
    await expect(recentCourses.locator('[data-testid="course-card-course-2"]')).toBeVisible()
    
    // Check course actions
    const courseCard = recentCourses.locator('[data-testid="course-card-course-1"]')
    await courseCard.hover()
    await expect(courseCard.locator('[data-testid="quick-edit-button"]')).toBeVisible()
    await expect(courseCard.locator('[data-testid="quick-share-button"]')).toBeVisible()
    
    // Test quick edit action
    await courseCard.locator('[data-testid="quick-edit-button"]').click()
    await expect(page).toHaveURL('/courses/course-1/edit')
  })

  test('should show analytics charts with real data', async ({ page }) => {
    await helpers.mockApiResponse('**/analytics/usage', {
      aiTokenUsage: [
        { date: '2024-01-01', tokens: 15000, cost: 45.00 },
        { date: '2024-01-02', tokens: 18000, cost: 54.00 },
        { date: '2024-01-03', tokens: 12000, cost: 36.00 },
      ],
      storageBreakdown: {
        documents: 1.2,
        exports: 0.8,
        media: 0.3,
        total: 2.3
      },
      successRates: {
        courseGeneration: 95,
        documentProcessing: 98,
        exports: 97
      }
    })
    
    await helpers.goToDashboard()
    
    // Check analytics section
    await expect(page.locator('[data-testid="analytics-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="token-usage-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="storage-breakdown-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-rate-indicators"]')).toBeVisible()
    
    // Check chart data points
    await expect(page.locator('[data-testid="chart-data-point"]')).toHaveCount(3)
  })

  test('should display activity feed with real-time updates', async ({ page }) => {
    await helpers.mockApiResponse('**/activity/feed?limit=10', {
      activities: [
        {
          id: 'activity-1',
          type: 'course_generated',
          message: 'Course "JavaScript Fundamentals" was generated successfully',
          timestamp: '2024-01-15T10:30:00Z',
          status: 'success'
        },
        {
          id: 'activity-2',
          type: 'document_uploaded',
          message: 'Document "intro-to-js.pdf" was uploaded',
          timestamp: '2024-01-15T09:15:00Z',
          status: 'info'
        },
        {
          id: 'activity-3',
          type: 'export_completed',
          message: 'HTML export for "React Basics" completed',
          timestamp: '2024-01-15T08:45:00Z',
          status: 'success'
        }
      ]
    })
    
    await helpers.goToDashboard()
    
    // Check activity feed
    const activityFeed = page.locator('[data-testid="activity-feed"]')
    await expect(activityFeed).toBeVisible()
    
    // Check activity items
    await expect(activityFeed.locator('[data-testid="activity-item"]')).toHaveCount(3)
    
    // Check activity details
    const firstActivity = activityFeed.locator('[data-testid="activity-item"]').first()
    await expect(firstActivity).toContainText('Course "JavaScript Fundamentals" was generated')
    await expect(firstActivity.locator('[data-testid="activity-timestamp"]')).toBeVisible()
    await expect(firstActivity.locator('[data-testid="activity-status-success"]')).toBeVisible()
  })

  test('should handle quick actions from dashboard', async ({ page }) => {
    await helpers.goToDashboard()
    
    // Test create course quick action
    await page.click('[data-testid="quick-action-create-course"]')
    await expect(page).toHaveURL('/courses/new')
    
    await page.goBack()
    await helpers.goToDashboard()
    
    // Test upload document quick action
    await page.click('[data-testid="quick-action-upload-document"]')
    await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible()
    
    // Test export courses quick action
    await helpers.closeModal()
    await page.click('[data-testid="quick-action-export-courses"]')
    await expect(page).toHaveURL('/exports')
  })

  test('should refresh data with pull-to-refresh', async ({ page }) => {
    await helpers.goToDashboard()
    
    // Simulate pull-to-refresh gesture
    await page.evaluate(() => {
      const refreshZone = document.querySelector('[data-testid="refresh-zone"]')
      if (refreshZone) {
        const startY = 100
        const endY = 200
        
        const touchStartEvent = new TouchEvent('touchstart', {
          touches: [{ clientY: startY, clientX: 100 } as Touch]
        })
        const touchMoveEvent = new TouchEvent('touchmove', {
          touches: [{ clientY: endY, clientX: 100 } as Touch]
        })
        const touchEndEvent = new TouchEvent('touchend', {
          changedTouches: [{ clientY: endY, clientX: 100 } as Touch]
        })
        
        refreshZone.dispatchEvent(touchStartEvent)
        refreshZone.dispatchEvent(touchMoveEvent)
        refreshZone.dispatchEvent(touchEndEvent)
      }
    })
    
    // Should show refresh indicator
    await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible()
    
    // Wait for refresh to complete
    await helpers.waitForLoadingToFinish()
    await helpers.waitForToast('Dashboard refreshed')
  })

  test('should handle empty states gracefully', async ({ page }) => {
    // Mock empty responses
    await helpers.mockApiResponse('**/courses?recent=true&limit=6', { courses: [] })
    await helpers.mockApiResponse('**/activity/feed?limit=10', { activities: [] })
    
    await helpers.goToDashboard()
    
    // Check empty states
    await expect(page.locator('[data-testid="no-recent-courses"]')).toBeVisible()
    await expect(page.locator('[data-testid="no-recent-courses"]')).toContainText('No courses yet')
    
    await expect(page.locator('[data-testid="no-activity"]')).toBeVisible()
    await expect(page.locator('[data-testid="no-activity"]')).toContainText('No recent activity')
    
    // Check call-to-action buttons
    await expect(page.locator('[data-testid="create-first-course-button"]')).toBeVisible()
  })

  test('should display upgrade prompts for plan limits', async ({ page }) => {
    await helpers.mockApiResponse('**/dashboard/stats', {
      totalCourses: 15,
      planLimit: {
        courses: 20,
        tokensPerMonth: 100000,
        storageGB: 5
      },
      usage: {
        courses: 18, // Near limit
        tokensThisMonth: 95000, // Near limit
        storageUsed: 4.2 // Near limit
      }
    })
    
    await helpers.goToDashboard()
    
    // Should show upgrade prompts
    await expect(page.locator('[data-testid="upgrade-prompt-courses"]')).toBeVisible()
    await expect(page.locator('[data-testid="upgrade-prompt-tokens"]')).toBeVisible()
    await expect(page.locator('[data-testid="upgrade-prompt-storage"]')).toBeVisible()
    
    // Check upgrade button
    await page.click('[data-testid="upgrade-plan-button"]')
    await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible()
  })

  test('should show notification center with badges', async ({ page }) => {
    await helpers.mockApiResponse('**/notifications', {
      notifications: [
        {
          id: 'notif-1',
          type: 'course_generation_complete',
          title: 'Course Generation Complete',
          message: 'Your course "JavaScript Fundamentals" is ready',
          read: false,
          timestamp: '2024-01-15T10:30:00Z'
        },
        {
          id: 'notif-2',
          type: 'plan_limit_warning',
          title: 'Approaching Plan Limit',
          message: 'You have used 90% of your monthly tokens',
          read: false,
          timestamp: '2024-01-15T09:00:00Z'
        }
      ],
      unreadCount: 2
    })
    
    await helpers.goToDashboard()
    
    // Check notification badge
    const notificationBell = page.locator('[data-testid="notification-bell"]')
    await expect(notificationBell.locator('[data-testid="notification-badge"]')).toContainText('2')
    
    // Open notification center
    await notificationBell.click()
    await expect(page.locator('[data-testid="notification-center"]')).toBeVisible()
    
    // Check notifications
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(2)
    
    // Mark notification as read
    const firstNotification = page.locator('[data-testid="notification-item"]').first()
    await firstNotification.click()
    
    // Should navigate to relevant page or show details
    await expect(page.locator('[data-testid="notification-details"]')).toBeVisible()
  })
})

test.describe('Dashboard - Performance', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await helpers.login()
  })

  test('should load dashboard within performance budget', async ({ page }) => {
    const loadTime = await helpers.measurePageLoad()
    expect(loadTime).toBeLessThan(3000) // 3 second budget
    
    const metrics = await helpers.checkPerformanceMetrics()
    expect(metrics.firstContentfulPaint).toBeLessThan(1500) // 1.5s FCP
    expect(metrics.domContentLoaded).toBeLessThan(100) // 100ms DCL
  })

  test('should handle large datasets efficiently', async ({ page }) => {
    // Mock large dataset
    const largeCourseList = Array.from({ length: 100 }, (_, i) => ({
      id: `course-${i}`,
      title: `Course ${i}`,
      status: i % 3 === 0 ? 'published' : 'draft',
      lastModified: new Date(Date.now() - i * 1000000).toISOString()
    }))
    
    await helpers.mockApiResponse('**/courses?recent=true&limit=6', {
      courses: largeCourseList.slice(0, 6)
    })
    
    await helpers.goToDashboard()
    
    // Should still render quickly
    await expect(page.locator('[data-testid="recent-courses"]')).toBeVisible()
    
    // Check memory usage doesn't spike
    const memoryInfo = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    expect(memoryInfo).toBeLessThan(50 * 1024 * 1024) // 50MB limit
  })

  test('should handle network timeouts gracefully', async ({ page }) => {
    // Mock slow API response
    await page.route('**/dashboard/stats', async (route) => {
      await page.waitForTimeout(5000) // 5 second delay
      await route.fulfill({
        status: 408,
        body: JSON.stringify({ error: 'Request timeout' })
      })
    })
    
    await helpers.goToDashboard()
    
    // Should show loading states and then error states
    await expect(page.locator('[data-testid="stats-loading"]')).toBeVisible()
    await expect(page.locator('[data-testid="stats-error"]')).toBeVisible({ timeout: 10000 })
    
    // Should offer retry option
    await expect(page.locator('[data-testid="retry-stats-button"]')).toBeVisible()
  })
})

test.describe('Dashboard - Mobile', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await helpers.login()
  })

  test('should adapt layout for mobile screens', async ({ page }) => {
    await helpers.goToDashboard()
    
    // Check mobile layout elements
    await expect(page.locator('[data-testid="mobile-dashboard-layout"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-stats-cards"]')).toBeVisible()
    
    // Check that desktop-only elements are hidden
    await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible()
    
    // Check mobile navigation
    await expect(page.locator('[data-testid="mobile-bottom-nav"]')).toBeVisible()
  })

  test('should handle mobile gestures', async ({ page }) => {
    await helpers.goToDashboard()
    
    const recentCourses = page.locator('[data-testid="recent-courses"]')
    
    // Test horizontal scroll for course cards
    await helpers.swipeLeft(recentCourses)
    
    // Test pull-to-refresh
    const dashboard = page.locator('[data-testid="dashboard"]')
    await helpers.swipeRight(dashboard) // Pull down gesture
    
    await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible()
  })

  test('should handle mobile quick actions', async ({ page }) => {
    await helpers.goToDashboard()
    
    // Test floating action button
    const fab = page.locator('[data-testid="mobile-fab"]')
    await expect(fab).toBeVisible()
    
    await fab.click()
    await expect(page.locator('[data-testid="mobile-action-menu"]')).toBeVisible()
    
    // Test quick actions
    await page.click('[data-testid="mobile-quick-action-create"]')
    await expect(page).toHaveURL('/courses/new')
  })
})