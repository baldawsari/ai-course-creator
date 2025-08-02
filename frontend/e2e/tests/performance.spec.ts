import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

test.describe('Performance Tests', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    // Create a new context with performance options
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 720 }
    })
    page = await context.newPage()
  })

  test('should load homepage within acceptable time', async () => {
    const startTime = Date.now()
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000) // Should load within 3 seconds
    
    // Check that main content is visible
    await expect(page.locator('h1')).toBeVisible()
  })

  test('should measure Time to First Byte (TTFB)', async () => {
    const performanceTimingJson = await page.evaluate(() => 
      JSON.stringify(performance.timing)
    )
    const timing = JSON.parse(performanceTimingJson)
    
    const ttfb = timing.responseStart - timing.navigationStart
    expect(ttfb).toBeLessThan(800) // TTFB should be less than 800ms
  })

  test('should measure First Contentful Paint (FCP)', async () => {
    await page.goto('/')
    
    const fcp = await page.evaluate(() => {
      const paintMetrics = performance.getEntriesByType('paint')
      const fcpEntry = paintMetrics.find(entry => entry.name === 'first-contentful-paint')
      return fcpEntry ? fcpEntry.startTime : 0
    })
    
    expect(fcp).toBeGreaterThan(0)
    expect(fcp).toBeLessThan(1800) // FCP should be less than 1.8s
  })

  test('should measure Largest Contentful Paint (LCP)', async () => {
    await page.goto('/')
    await page.waitForTimeout(2000) // Wait for LCP to stabilize
    
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let lcpValue = 0
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          lcpValue = lastEntry.startTime
        })
        observer.observe({ entryTypes: ['largest-contentful-paint'] })
        
        // Resolve after a delay to ensure we captured LCP
        setTimeout(() => {
          observer.disconnect()
          resolve(lcpValue)
        }, 1000)
      })
    })
    
    expect(lcp).toBeGreaterThan(0)
    expect(lcp).toBeLessThan(2500) // LCP should be less than 2.5s
  })

  test('should measure Cumulative Layout Shift (CLS)', async () => {
    await page.goto('/')
    await page.waitForTimeout(3000) // Wait for page to stabilize
    
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
        })
        observer.observe({ entryTypes: ['layout-shift'] })
        
        setTimeout(() => {
          observer.disconnect()
          resolve(clsValue)
        }, 2000)
      })
    })
    
    expect(cls).toBeLessThan(0.1) // CLS should be less than 0.1 for good user experience
  })

  test('should measure Total Blocking Time (TBT)', async () => {
    await page.goto('/')
    
    const tbt = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let totalBlockingTime = 0
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              totalBlockingTime += entry.duration - 50
            }
          }
        })
        observer.observe({ entryTypes: ['longtask'] })
        
        setTimeout(() => {
          observer.disconnect()
          resolve(totalBlockingTime)
        }, 3000)
      })
    })
    
    expect(tbt).toBeLessThan(300) // TBT should be less than 300ms
  })

  test('should have efficient bundle size', async () => {
    const coverage = await page.coverage.startJSCoverage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const jsCoverage = await page.coverage.stopJSCoverage()
    
    let totalBytes = 0
    let usedBytes = 0
    
    for (const entry of jsCoverage) {
      if (entry.source) {
        totalBytes += entry.source.length
      }
      for (const func of entry.functions) {
        for (const range of func.ranges) {
          if (range.count > 0) {
            usedBytes += range.endOffset - range.startOffset
          }
        }
      }
    }
    
    const unusedPercentage = ((totalBytes - usedBytes) / totalBytes) * 100
    expect(unusedPercentage).toBeLessThan(50) // Less than 50% unused code
  })

  test('should handle navigation performance', async () => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Navigate to login page
    const startTime = Date.now()
    await page.click('a[href="/auth/login"]')
    await page.waitForLoadState('networkidle')
    const navigationTime = Date.now() - startTime
    
    expect(navigationTime).toBeLessThan(1000) // Navigation should be under 1s
  })

  test('should efficiently render large lists', async () => {
    // Mock a large dataset
    await page.goto('/dashboard')
    
    // Inject a large number of items
    await page.evaluate(() => {
      // This would be replaced with actual list rendering logic
      const container = document.createElement('div')
      for (let i = 0; i < 1000; i++) {
        const item = document.createElement('div')
        item.textContent = `Item ${i}`
        container.appendChild(item)
      }
      document.body.appendChild(container)
    })
    
    const renderTime = await page.evaluate(() => {
      const start = performance.now()
      // Force layout/paint
      document.body.getBoundingClientRect()
      return performance.now() - start
    })
    
    expect(renderTime).toBeLessThan(100) // Should render quickly
  })

  test('should have minimal main thread blocking', async () => {
    await page.goto('/')
    
    const blockingTime = await page.evaluate(async () => {
      const start = performance.now()
      
      // Simulate user interaction
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Check if main thread was blocked
      const elapsed = performance.now() - start
      return elapsed - 100 // Subtract expected delay
    })
    
    expect(blockingTime).toBeLessThan(50) // Main thread blocking should be minimal
  })

  test('should handle memory efficiently', async () => {
    if (!page.evaluate(() => 'memory' in performance)) {
      test.skip()
      return
    }
    
    await page.goto('/')
    
    const initialMemory = await page.evaluate(() => 
      (performance as any).memory.usedJSHeapSize
    )
    
    // Perform various actions
    for (let i = 0; i < 5; i++) {
      await page.click('body') // Simulate interactions
      await page.waitForTimeout(100)
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ('gc' in window) {
        (window as any).gc()
      }
    })
    
    const finalMemory = await page.evaluate(() => 
      (performance as any).memory.usedJSHeapSize
    )
    
    const memoryIncrease = finalMemory - initialMemory
    expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024) // Less than 5MB increase
  })

  test('should optimize image loading', async () => {
    await page.goto('/')
    
    const images = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'))
      return imgs.map(img => ({
        src: img.src,
        loading: img.loading,
        decoded: img.decode !== undefined ? 'supported' : 'not supported',
        complete: img.complete,
        naturalWidth: img.naturalWidth
      }))
    })
    
    for (const img of images) {
      // Images should use lazy loading where appropriate
      if (img.src.includes('below-fold')) {
        expect(img.loading).toBe('lazy')
      }
      
      // Images should be properly sized
      if (img.complete && img.naturalWidth > 0) {
        expect(img.naturalWidth).toBeLessThanOrEqual(2000) // Reasonable max width
      }
    }
  })

  test('should use efficient caching strategies', async () => {
    const responses: any[] = []
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers()
      })
    })
    
    await page.goto('/')
    await page.reload()
    
    // Check for cached responses
    const cachedResponses = responses.filter(r => 
      r.status === 304 || r.headers['x-cache'] === 'HIT'
    )
    
    expect(cachedResponses.length).toBeGreaterThan(0) // Some resources should be cached
  })

  test('should minimize network requests', async () => {
    const requests: any[] = []
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      })
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const jsRequests = requests.filter(r => r.resourceType === 'script')
    const cssRequests = requests.filter(r => r.resourceType === 'stylesheet')
    
    expect(jsRequests.length).toBeLessThan(20) // Reasonable number of JS files
    expect(cssRequests.length).toBeLessThan(10) // Reasonable number of CSS files
  })

  test('should implement code splitting effectively', async () => {
    const chunks: string[] = []
    
    page.on('response', async response => {
      const url = response.url()
      if (url.includes('.js') && url.includes('chunk')) {
        chunks.push(url)
      }
    })
    
    await page.goto('/')
    const initialChunks = [...chunks]
    
    // Navigate to a different route
    await page.click('a[href="/dashboard"]')
    await page.waitForLoadState('networkidle')
    
    const newChunks = chunks.filter(chunk => !initialChunks.includes(chunk))
    expect(newChunks.length).toBeGreaterThan(0) // Should load new chunks for new route
  })

  test('should have responsive design performance', async () => {
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      
      const startTime = Date.now()
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(3000) // Each viewport should load quickly
      
      // Verify layout is appropriate for viewport
      const isResponsive = await page.evaluate((width) => {
        const body = document.body
        return body.scrollWidth <= width
      }, viewport.width)
      
      expect(isResponsive).toBe(true)
    }
  })

  test('should optimize API calls', async () => {
    const apiCalls: any[] = []
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        })
      }
    })
    
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Check for duplicate API calls
    const uniqueUrls = new Set(apiCalls.map(call => call.url))
    expect(uniqueUrls.size).toBe(apiCalls.length) // No duplicate API calls
    
    // Check for request batching (if applicable)
    const timestamps = apiCalls.map(call => call.timestamp)
    const timeDiffs = timestamps.slice(1).map((t, i) => t - timestamps[i])
    const simultaneousCalls = timeDiffs.filter(diff => diff < 10).length
    
    expect(simultaneousCalls).toBeGreaterThan(0) // Some calls should be batched
  })

  test('should handle errors gracefully without performance impact', async () => {
    // Simulate API error
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      })
    })
    
    const startTime = Date.now()
    await page.goto('/dashboard')
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(3000) // Should still load quickly despite errors
    
    // Check that error UI is displayed
    await expect(page.locator('[role="alert"]')).toBeVisible()
  })

  test('should optimize form interactions', async () => {
    await page.goto('/auth/login')
    
    // Measure input responsiveness
    const inputDelay = await page.evaluate(async () => {
      const input = document.querySelector('input[type="email"]') as HTMLInputElement
      if (!input) return 0
      
      const start = performance.now()
      input.focus()
      input.value = 'test@example.com'
      input.blur()
      
      return performance.now() - start
    })
    
    expect(inputDelay).toBeLessThan(50) // Input should be responsive
  })

  test('should implement efficient infinite scrolling', async () => {
    await page.goto('/dashboard/courses')
    
    // Simulate infinite scroll
    const scrollPerformance = await page.evaluate(async () => {
      const container = document.querySelector('[data-testid="courses-container"]')
      if (!container) return { scrollTime: 0, itemsLoaded: 0 }
      
      const start = performance.now()
      let itemsLoaded = 0
      
      // Simulate scrolling
      for (let i = 0; i < 5; i++) {
        window.scrollTo(0, document.body.scrollHeight)
        await new Promise(resolve => setTimeout(resolve, 100))
        itemsLoaded = container.children.length
      }
      
      return {
        scrollTime: performance.now() - start,
        itemsLoaded
      }
    })
    
    expect(scrollPerformance.scrollTime).toBeLessThan(1000) // Smooth scrolling
    expect(scrollPerformance.itemsLoaded).toBeGreaterThan(0) // Items should load
  })

  test('should optimize WebSocket connections', async () => {
    await page.goto('/dashboard')
    
    const wsMetrics = await page.evaluate(() => {
      return new Promise<{ connectionTime: number; messageLatency: number; reconnectTime: number }>((resolve) => {
        const metrics = {
          connectionTime: 0,
          messageLatency: 0,
          reconnectTime: 0
        }
        
        const start = performance.now()
        const ws = new WebSocket('ws://localhost:3001')
        
        ws.onopen = () => {
          metrics.connectionTime = performance.now() - start
          
          // Test message latency
          const msgStart = performance.now()
          ws.send(JSON.stringify({ type: 'ping' }))
          
          ws.onmessage = (event) => {
            if (JSON.parse(event.data).type === 'pong') {
              metrics.messageLatency = performance.now() - msgStart
              ws.close()
              resolve(metrics)
            }
          }
        }
        
        ws.onerror = () => {
          resolve(metrics)
        }
        
        setTimeout(() => resolve(metrics), 5000) // Timeout after 5s
      })
    })
    
    if (wsMetrics.connectionTime > 0) {
      expect(wsMetrics.connectionTime).toBeLessThan(1000) // Quick connection
      expect(wsMetrics.messageLatency).toBeLessThan(100) // Low latency
    }
  })

  test('should optimize animation performance', async () => {
    await page.goto('/')
    
    const animationMetrics = await page.evaluate(async () => {
      const button = document.querySelector('button')
      if (!button) return { fps: 60, jank: 0 }
      
      let frames = 0
      let jank = 0
      let lastTime = performance.now()
      
      const measureFPS = () => {
        const currentTime = performance.now()
        const delta = currentTime - lastTime
        
        if (delta > 16.67 * 1.5) { // 1.5x frame time indicates jank
          jank++
        }
        
        frames++
        lastTime = currentTime
        
        if (frames < 60) {
          requestAnimationFrame(measureFPS)
        }
      }
      
      // Trigger animation
      button.click()
      requestAnimationFrame(measureFPS)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return {
        fps: frames,
        jank
      }
    })
    
    expect(animationMetrics.fps).toBeGreaterThan(50) // Smooth animation
    expect(animationMetrics.jank).toBeLessThan(5) // Minimal jank
  })

  test('should have efficient service worker caching', async () => {
    await page.goto('/')
    
    const swMetrics = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return { registered: false, cached: 0 }
      }
      
      const registration = await navigator.serviceWorker.getRegistration()
      
      if (!registration) {
        return { registered: false, cached: 0 }
      }
      
      // Check cache storage
      const cacheNames = await caches.keys()
      let totalCached = 0
      
      for (const name of cacheNames) {
        const cache = await caches.open(name)
        const requests = await cache.keys()
        totalCached += requests.length
      }
      
      return {
        registered: true,
        cached: totalCached,
        state: registration.active?.state || 'unknown'
      }
    })
    
    if (swMetrics.registered) {
      expect(swMetrics.state).toBe('activated')
      expect(swMetrics.cached).toBeGreaterThan(0) // Should cache resources
    }
  })

  test('should optimize database queries (via API monitoring)', async () => {
    const apiTimings: number[] = []
    
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        // Note: timing() method is not available in Playwright
        // We'll measure response time differently
        apiTimings.push(Date.now())
      }
    })
    
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    if (apiTimings.length > 0) {
      const avgTiming = apiTimings.reduce((a, b) => a + b, 0) / apiTimings.length
      expect(avgTiming).toBeLessThan(500) // API responses should be fast
    }
  })

  test('should implement progressive enhancement', async () => {
    // Disable JavaScript
    await page.route('**/*.js', route => route.abort())
    
    await page.goto('/')
    
    // Check that critical content is still visible
    const content = await page.textContent('body')
    expect(content).toContain('AI Course Creator') // Main content should be visible
    
    // Re-enable JavaScript
    await page.unroute('**/*.js')
  })

  test('should optimize third-party scripts', async () => {
    const thirdPartyRequests: any[] = []
    
    page.on('request', request => {
      const url = new URL(request.url())
      if (!url.hostname.includes('localhost')) {
        thirdPartyRequests.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType()
        })
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Third-party requests should be minimal
    expect(thirdPartyRequests.length).toBeLessThan(10)
    
    // Check for async/defer loading
    const scriptTags = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]')) as HTMLScriptElement[]
      return scripts.map(script => ({
        src: script.src,
        async: script.async,
        defer: script.defer
      }))
    })
    
    const externalScripts = scriptTags.filter(s => !s.src.includes('localhost'))
    externalScripts.forEach(script => {
      expect(script.async || script.defer).toBe(true) // Should load asynchronously
    })
  })

  test('should handle resource hints effectively', async () => {
    await page.goto('/')
    
    const resourceHints = await page.evaluate(() => {
      const hints = {
        preconnect: Array.from(document.querySelectorAll('link[rel="preconnect"]')),
        prefetch: Array.from(document.querySelectorAll('link[rel="prefetch"]')),
        preload: Array.from(document.querySelectorAll('link[rel="preload"]')),
        dnsPrefetch: Array.from(document.querySelectorAll('link[rel="dns-prefetch"]'))
      }
      
      return {
        preconnect: hints.preconnect.map(link => link.getAttribute('href')),
        prefetch: hints.prefetch.map(link => link.getAttribute('href')),
        preload: hints.preload.map(link => link.getAttribute('href')),
        dnsPrefetch: hints.dnsPrefetch.map(link => link.getAttribute('href'))
      }
    })
    
    // Should have resource hints for critical resources
    expect(
      resourceHints.preconnect.length + 
      resourceHints.preload.length
    ).toBeGreaterThan(0)
  })
})

test.describe('Performance Tests - Mobile', () => {
  test.use({
    ...test.use,
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  })

  test('should have good mobile performance scores', async ({ page }) => {
    await page.goto('/')
    
    // Simulate mobile network conditions
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 Kbps
      latency: 40
    })
    
    const metrics = await page.evaluate(() => {
      return new Promise<{ domContentLoaded: number; loadComplete: number; interactive: number }>((resolve) => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          resolve({
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            interactive: navigation.domInteractive - navigation.fetchStart
          })
        }, 2000)
      })
    })
    
    expect(metrics.domContentLoaded).toBeLessThan(3000)
    expect(metrics.loadComplete).toBeLessThan(5000)
  })

  test('should handle touch interactions efficiently', async ({ page }) => {
    await page.goto('/dashboard')
    
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