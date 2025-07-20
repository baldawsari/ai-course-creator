import { test, expect } from '@playwright/test'
import { TestHelpers } from '../utils/test-helpers'

test.describe('Performance Tests', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const vitals: any = {}
          
          entries.forEach((entry: any) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime
            }
            if (entry.name === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime
            }
            if (entry.entryType === 'layout-shift') {
              vitals.cls = (vitals.cls || 0) + entry.value
            }
          })
          
          // Get FID from event timing API
          if (entry.entryType === 'first-input') {
            vitals.fid = entry.processingStart - entry.startTime
          }
          
          resolve(vitals)
        })
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] })
        
        // Fallback timeout
        setTimeout(() => resolve({}), 5000)
      })
    })
    
    // Core Web Vitals thresholds
    if ((vitals as any).fcp) {
      expect((vitals as any).fcp).toBeLessThan(1800) // FCP < 1.8s (good)
    }
    if ((vitals as any).lcp) {
      expect((vitals as any).lcp).toBeLessThan(2500) // LCP < 2.5s (good)
    }
    if ((vitals as any).cls) {
      expect((vitals as any).cls).toBeLessThan(0.1) // CLS < 0.1 (good)
    }
    if ((vitals as any).fid) {
      expect((vitals as any).fid).toBeLessThan(100) // FID < 100ms (good)
    }
  })

  test('should load critical resources efficiently', async ({ page }) => {
    const resourceMetrics: any[] = []
    
    page.on('response', (response) => {
      const url = response.url()
      const timing = response.timing()
      
      resourceMetrics.push({
        url,
        status: response.status(),
        size: parseInt(response.headers()['content-length'] || '0'),
        timing: timing.responseEnd - timing.requestStart,
        type: response.headers()['content-type']
      })
    })
    
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Check critical resources
    const htmlResponse = resourceMetrics.find(r => r.url.includes('dashboard') && r.type?.includes('text/html'))
    const cssResources = resourceMetrics.filter(r => r.type?.includes('text/css'))
    const jsResources = resourceMetrics.filter(r => r.type?.includes('javascript'))
    
    // HTML should load quickly
    if (htmlResponse) {
      expect(htmlResponse.timing).toBeLessThan(1000)
      expect(htmlResponse.status).toBe(200)
    }
    
    // CSS bundle size should be reasonable
    const totalCssSize = cssResources.reduce((sum, r) => sum + r.size, 0)
    expect(totalCssSize).toBeLessThan(100 * 1024) // 100KB CSS budget
    
    // JavaScript bundle size should be reasonable
    const totalJsSize = jsResources.reduce((sum, r) => sum + r.size, 0)
    expect(totalJsSize).toBeLessThan(500 * 1024) // 500KB JS budget
  })

  test('should handle large form submissions efficiently', async ({ page }) => {
    await helpers.login()
    await page.goto('/courses/new')
    
    // Measure form submission performance
    const startTime = Date.now()
    
    // Fill large form data
    await page.fill('[data-testid="course-title-input"]', 'Performance Test Course')
    await page.fill('[data-testid="course-description-input"]', 'A'.repeat(5000)) // Large description
    
    // Add many learning objectives
    for (let i = 0; i < 20; i++) {
      await page.click('[data-testid="add-objective-button"]')
      await page.fill(`[data-testid="objective-input-${i}"]`, `Learning objective ${i + 1}`)
    }
    
    // Mock API response
    await helpers.mockApiResponse('**/courses', {
      id: 'course-123',
      title: 'Performance Test Course'
    })
    
    await page.click('[data-testid="save-course-button"]')
    await page.waitForSelector('[data-testid="success-message"]')
    
    const endTime = Date.now()
    const submissionTime = endTime - startTime
    
    expect(submissionTime).toBeLessThan(5000) // 5 second budget for large form
  })

  test('should render large lists efficiently', async ({ page }) => {
    await helpers.login()
    
    // Mock large course list
    const largeCourseList = Array.from({ length: 1000 }, (_, i) => ({
      id: `course-${i}`,
      title: `Course ${i}`,
      description: `Description for course ${i}`,
      status: i % 3 === 0 ? 'published' : 'draft',
      createdAt: new Date(Date.now() - i * 86400000).toISOString()
    }))
    
    await helpers.mockApiResponse('**/courses*', {
      courses: largeCourseList.slice(0, 50), // First page
      total: 1000,
      page: 1,
      pages: 20
    })
    
    const startTime = Date.now()
    await page.goto('/courses')
    await page.waitForSelector('[data-testid="courses-grid"]')
    const renderTime = Date.now() - startTime
    
    expect(renderTime).toBeLessThan(2000) // 2 second budget for initial render
    
    // Test scrolling performance
    const scrollStart = Date.now()
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
    await page.waitForTimeout(100)
    const scrollTime = Date.now() - scrollStart
    
    expect(scrollTime).toBeLessThan(500) // Smooth scrolling
  })

  test('should handle image loading efficiently', async ({ page }) => {
    await helpers.login()
    
    // Mock courses with many images
    const coursesWithImages = Array.from({ length: 20 }, (_, i) => ({
      id: `course-${i}`,
      title: `Course ${i}`,
      thumbnail: `https://example.com/thumbnails/course-${i}.jpg`,
      status: 'published'
    }))
    
    await helpers.mockApiResponse('**/courses*', {
      courses: coursesWithImages
    })
    
    // Intercept image requests
    const imageLoadTimes: number[] = []
    page.on('response', (response) => {
      if (response.url().includes('thumbnails')) {
        const timing = response.timing()
        imageLoadTimes.push(timing.responseEnd - timing.requestStart)
      }
    })
    
    await page.goto('/courses')
    await page.waitForLoadState('networkidle')
    
    // Check that images load within reasonable time
    const avgImageLoadTime = imageLoadTimes.reduce((sum, time) => sum + time, 0) / imageLoadTimes.length
    expect(avgImageLoadTime).toBeLessThan(1000) // 1 second average per image
    
    // Check lazy loading implementation
    const belowFoldImages = page.locator('[data-testid="course-thumbnail"]').nth(15)
    
    // Initially should not be loaded
    await expect(belowFoldImages).toHaveAttribute('loading', 'lazy')
    
    // Scroll to load
    await belowFoldImages.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    
    // Should now be loaded
    await expect(belowFoldImages).toHaveAttribute('src', /course-15\.jpg/)
  })

  test('should maintain 60fps during animations', async ({ page }) => {
    await helpers.login()
    await page.goto('/dashboard')
    
    // Start frame rate monitoring
    await page.evaluate(() => {
      (window as any).frameRates = []
      let lastTime = performance.now()
      
      function measureFPS() {
        const currentTime = performance.now()
        const fps = 1000 / (currentTime - lastTime)
        ;(window as any).frameRates.push(fps)
        lastTime = currentTime
        requestAnimationFrame(measureFPS)
      }
      
      requestAnimationFrame(measureFPS)
    })
    
    // Trigger animations
    await page.click('[data-testid="stats-card"]') // Card hover animation
    await page.hover('[data-testid="course-card"]') // Course card animation
    await page.click('[data-testid="user-menu"]') // Menu animation
    
    await page.waitForTimeout(2000) // Let animations run
    
    // Check frame rates
    const frameRates = await page.evaluate(() => (window as any).frameRates)
    const avgFPS = frameRates.reduce((sum: number, fps: number) => sum + fps, 0) / frameRates.length
    
    expect(avgFPS).toBeGreaterThan(55) // Close to 60fps
    
    // Check for frame drops
    const frameDrops = frameRates.filter((fps: number) => fps < 30).length
    expect(frameDrops / frameRates.length).toBeLessThan(0.05) // Less than 5% frame drops
  })

  test('should handle memory efficiently', async ({ page }) => {
    await helpers.login()
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    // Navigate through multiple pages
    await page.goto('/courses')
    await page.waitForLoadState('networkidle')
    
    await page.goto('/courses/new')
    await page.waitForLoadState('networkidle')
    
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    const memoryIncrease = finalMemory - initialMemory
    
    // Memory increase should be reasonable (less than 20MB)
    expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024)
    
    // Force garbage collection and check for leaks
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc()
      }
    })
    
    await page.waitForTimeout(1000)
    
    const afterGCMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    // Memory should decrease after GC
    expect(afterGCMemory).toBeLessThan(finalMemory)
  })

  test('should handle concurrent operations efficiently', async ({ page }) => {
    await helpers.login()
    await page.goto('/courses')
    
    // Start multiple concurrent operations
    const operations = [
      // Multiple API calls
      helpers.mockApiResponse('**/courses/search?q=test', { courses: [] }),
      helpers.mockApiResponse('**/courses/filters', { filters: [] }),
      helpers.mockApiResponse('**/activity/recent', { activities: [] }),
      
      // User interactions
      page.fill('[data-testid="search-input"]', 'test'),
      page.click('[data-testid="filter-button"]'),
      page.hover('[data-testid="course-card"]'),
    ]
    
    const startTime = Date.now()
    await Promise.all(operations)
    const concurrentTime = Date.now() - startTime
    
    expect(concurrentTime).toBeLessThan(3000) // 3 second budget for concurrent operations
    
    // Check that UI remains responsive
    await page.click('[data-testid="create-course-button"]')
    await expect(page).toHaveURL('/courses/new')
  })

  test('should optimize bundle size and loading', async ({ page }) => {
    // Analyze network requests
    const requests: any[] = []
    
    page.on('request', (request) => {
      requests.push({
        url: request.url(),
        resourceType: request.resourceType(),
        size: 0 // Will be updated on response
      })
    })
    
    page.on('response', (response) => {
      const request = requests.find(r => r.url === response.url())
      if (request) {
        request.size = parseInt(response.headers()['content-length'] || '0')
        request.compressed = response.headers()['content-encoding'] === 'gzip'
      }
    })
    
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Analyze JavaScript bundles
    const jsRequests = requests.filter(r => r.resourceType === 'script')
    const totalJSSize = jsRequests.reduce((sum, r) => sum + r.size, 0)
    
    expect(totalJSSize).toBeLessThan(1024 * 1024) // 1MB total JS budget
    
    // Check for gzip compression
    const largeJSBundles = jsRequests.filter(r => r.size > 50 * 1024) // Bundles > 50KB
    largeJSBundles.forEach(bundle => {
      expect(bundle.compressed).toBe(true)
    })
    
    // Check for code splitting (multiple JS chunks)
    expect(jsRequests.length).toBeGreaterThan(2) // Should have multiple chunks
    
    // Analyze CSS bundles
    const cssRequests = requests.filter(r => r.resourceType === 'stylesheet')
    const totalCSSSize = cssRequests.reduce((sum, r) => sum + r.size, 0)
    
    expect(totalCSSSize).toBeLessThan(200 * 1024) // 200KB CSS budget
  })

  test('should preload critical resources', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for resource hints
    const preloadLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('link[rel="preload"]')).map(link => ({
        href: (link as HTMLLinkElement).href,
        as: (link as HTMLLinkElement).as
      }))
    })
    
    // Should preload critical CSS and JS
    expect(preloadLinks.some(link => link.as === 'style')).toBe(true)
    expect(preloadLinks.some(link => link.as === 'script')).toBe(true)
    
    // Check for DNS prefetch
    const dnsPrefetches = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('link[rel="dns-prefetch"]')).map(link => 
        (link as HTMLLinkElement).href
      )
    })
    
    // Should prefetch external domains (API, CDN, etc.)
    expect(dnsPrefetches.length).toBeGreaterThan(0)
  })
})

test.describe('Performance Tests - Mobile', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test('should meet mobile performance thresholds', async ({ page }) => {
    // Simulate slower mobile network
    await page.route('**/*', async (route) => {
      await page.waitForTimeout(100) // Add 100ms latency
      await route.continue()
    })
    
    const startTime = Date.now()
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(5000) // 5 second budget for mobile
    
    // Check mobile-specific optimizations
    const touchTargets = await page.locator('[role="button"], button, a').all()
    
    for (const target of touchTargets.slice(0, 10)) { // Check first 10
      const box = await target.boundingBox()
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44) // Minimum touch target size
        expect(box.width).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('should handle touch interactions smoothly', async ({ page }) => {
    await helpers.login()
    await page.goto('/courses')
    
    // Test touch scrolling performance
    const scrollContainer = page.locator('[data-testid="courses-grid"]')
    
    const startTime = Date.now()
    
    // Simulate touch scroll
    await page.evaluate(() => {
      const container = document.querySelector('[data-testid="courses-grid"]')
      if (container) {
        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientY: 100, clientX: 100 } as Touch]
        })
        const touchMove = new TouchEvent('touchmove', {
          touches: [{ clientY: 300, clientX: 100 } as Touch]
        })
        const touchEnd = new TouchEvent('touchend', {
          changedTouches: [{ clientY: 300, clientX: 100 } as Touch]
        })
        
        container.dispatchEvent(touchStart)
        container.dispatchEvent(touchMove)
        container.dispatchEvent(touchEnd)
      }
    })
    
    const scrollTime = Date.now() - startTime
    expect(scrollTime).toBeLessThan(100) // Should respond immediately to touch
  })
})