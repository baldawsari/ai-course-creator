// =============================================================================
// PERFORMANCE MONITORING & OPTIMIZATION UTILITIES
// =============================================================================

// Performance metrics interface
interface PerformanceMetrics {
  // Core Web Vitals
  cls?: number // Cumulative Layout Shift
  fcp?: number // First Contentful Paint
  fid?: number // First Input Delay
  lcp?: number // Largest Contentful Paint
  ttfb?: number // Time to First Byte
  
  // Custom metrics
  pageLoadTime?: number
  apiResponseTime?: number
  renderTime?: number
  bundleSize?: number
  memoryUsage?: number
}

interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

// =============================================================================
// CORE PERFORMANCE MONITOR
// =============================================================================

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {}
  private observers: Map<string, PerformanceObserver> = new Map()
  private isEnabled: boolean = true

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers()
      this.measurePageLoad()
    }
  }

  // Initialize performance observers
  private initializeObservers(): void {
    // Core Web Vitals observer
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          this.metrics.lcp = lastEntry.startTime
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.set('lcp', lcpObserver)

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            this.metrics.fid = entry.processingStart - entry.startTime
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
        this.observers.set('fid', fidObserver)

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          })
          this.metrics.cls = clsValue
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
        this.observers.set('cls', clsObserver)

        // Paint metrics
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.fcp = entry.startTime
            }
          })
        })
        paintObserver.observe({ entryTypes: ['paint'] })
        this.observers.set('paint', paintObserver)

      } catch (error) {
        console.warn('Failed to initialize performance observers:', error)
      }
    }
  }

  // Measure page load time
  private measurePageLoad(): void {
    if ('performance' in window && 'timing' in window.performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const timing = window.performance.timing
          const navigationStart = timing.navigationStart
          const loadComplete = timing.loadEventEnd
          
          if (loadComplete > 0) {
            this.metrics.pageLoadTime = loadComplete - navigationStart
            this.metrics.ttfb = timing.responseStart - navigationStart
          }
        }, 0)
      })
    }
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    // Add memory usage if available
    if ('memory' in window.performance) {
      const memory = (window.performance as any).memory as MemoryInfo
      this.metrics.memoryUsage = memory.usedJSHeapSize
    }

    return { ...this.metrics }
  }

  // Measure specific operation
  measureOperation<T>(name: string, operation: () => T): T {
    const startTime = performance.now()
    const result = operation()
    const endTime = performance.now()
    
    console.log(`⚡ ${name}: ${(endTime - startTime).toFixed(2)}ms`)
    return result
  }

  // Measure async operation
  async measureAsyncOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const startTime = performance.now()
    const result = await operation()
    const endTime = performance.now()
    
    console.log(`⚡ ${name}: ${(endTime - startTime).toFixed(2)}ms`)
    return result
  }

  // Clean up observers
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
  }
}

// =============================================================================
// BUNDLE SIZE ANALYZER
// =============================================================================

class BundleSizeAnalyzer {
  private chunks: Map<string, number> = new Map()

  // Estimate bundle size
  estimateBundleSize(): number {
    if (typeof window === 'undefined') return 0

    let totalSize = 0
    
    // Estimate from script tags
    const scripts = document.querySelectorAll('script[src]')
    scripts.forEach(script => {
      const src = script.getAttribute('src')
      if (src && src.includes('_next/static')) {
        // Rough estimation - would need actual measurement in production
        totalSize += 100000 // 100KB estimate per chunk
      }
    })

    return totalSize
  }

  // Analyze chunk loading performance
  analyzeChunkLoading(): Promise<Map<string, number>> {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            if (entry.name.includes('_next/static')) {
              const duration = entry.responseEnd - entry.responseStart
              this.chunks.set(entry.name, duration)
            }
          })
          
          setTimeout(() => {
            observer.disconnect()
            resolve(new Map(this.chunks))
          }, 5000) // Collect for 5 seconds
        })
        
        observer.observe({ entryTypes: ['resource'] })
      } else {
        resolve(new Map())
      }
    })
  }
}

// =============================================================================
// MEMORY MONITOR
// =============================================================================

class MemoryMonitor {
  private intervalId: number | null = null
  private samples: MemoryInfo[] = []

  // Start monitoring memory usage
  startMonitoring(intervalMs: number = 5000): void {
    if (typeof window === 'undefined' || !('memory' in window.performance)) {
      console.warn('Memory monitoring not supported')
      return
    }

    this.intervalId = window.setInterval(() => {
      const memory = (window.performance as any).memory as MemoryInfo
      this.samples.push({ ...memory })
      
      // Keep only last 100 samples
      if (this.samples.length > 100) {
        this.samples.shift()
      }
    }, intervalMs)
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  // Get memory statistics
  getMemoryStats(): {
    current: MemoryInfo | null
    peak: number
    average: number
    trend: 'increasing' | 'decreasing' | 'stable'
  } {
    if (this.samples.length === 0) {
      return {
        current: null,
        peak: 0,
        average: 0,
        trend: 'stable'
      }
    }

    const current = this.samples[this.samples.length - 1]
    const peak = Math.max(...this.samples.map(s => s.usedJSHeapSize))
    const average = this.samples.reduce((sum, s) => sum + s.usedJSHeapSize, 0) / this.samples.length

    // Determine trend from last 10 samples
    const recentSamples = this.samples.slice(-10)
    if (recentSamples.length >= 2) {
      const first = recentSamples[0].usedJSHeapSize
      const last = recentSamples[recentSamples.length - 1].usedJSHeapSize
      const change = (last - first) / first
      
      const trend = change > 0.1 ? 'increasing' : change < -0.1 ? 'decreasing' : 'stable'
      
      return { current, peak, average, trend }
    }

    return { current, peak, average, trend: 'stable' }
  }
}

// =============================================================================
// API PERFORMANCE TRACKER
// =============================================================================

class APIPerformanceTracker {
  private requests: Map<string, number[]> = new Map()

  // Track API request performance
  trackRequest(endpoint: string, duration: number): void {
    if (!this.requests.has(endpoint)) {
      this.requests.set(endpoint, [])
    }
    
    const durations = this.requests.get(endpoint)!
    durations.push(duration)
    
    // Keep only last 50 requests per endpoint
    if (durations.length > 50) {
      durations.shift()
    }
  }

  // Get performance stats for endpoint
  getEndpointStats(endpoint: string): {
    count: number
    average: number
    min: number
    max: number
    p95: number
  } | null {
    const durations = this.requests.get(endpoint)
    if (!durations || durations.length === 0) return null

    const sorted = [...durations].sort((a, b) => a - b)
    const count = durations.length
    const average = durations.reduce((sum, d) => sum + d, 0) / count
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const p95Index = Math.floor(count * 0.95)
    const p95 = sorted[p95Index]

    return { count, average, min, max, p95 }
  }

  // Get all endpoint stats
  getAllStats(): Record<string, ReturnType<APIPerformanceTracker['getEndpointStats']>> {
    const stats: Record<string, any> = {}
    
    this.requests.forEach((_, endpoint) => {
      stats[endpoint] = this.getEndpointStats(endpoint)
    })
    
    return stats
  }
}

// =============================================================================
// RENDER PERFORMANCE TRACKER
// =============================================================================

class RenderPerformanceTracker {
  private renderTimes: Map<string, number[]> = new Map()

  // Track component render time
  trackRender(componentName: string, renderTime: number): void {
    if (!this.renderTimes.has(componentName)) {
      this.renderTimes.set(componentName, [])
    }
    
    const times = this.renderTimes.get(componentName)!
    times.push(renderTime)
    
    // Keep only last 20 renders per component
    if (times.length > 20) {
      times.shift()
    }
  }

  // Get render stats
  getRenderStats(componentName: string): {
    count: number
    average: number
    slowest: number
    fastest: number
  } | null {
    const times = this.renderTimes.get(componentName)
    if (!times || times.length === 0) return null

    const count = times.length
    const average = times.reduce((sum, t) => sum + t, 0) / count
    const slowest = Math.max(...times)
    const fastest = Math.min(...times)

    return { count, average, slowest, fastest }
  }

  // Get slow components
  getSlowComponents(threshold: number = 16): string[] {
    const slowComponents: string[] = []
    
    this.renderTimes.forEach((times, componentName) => {
      const average = times.reduce((sum, t) => sum + t, 0) / times.length
      if (average > threshold) {
        slowComponents.push(componentName)
      }
    })
    
    return slowComponents
  }
}

// =============================================================================
// PERFORMANCE OPTIMIZATION SUGGESTIONS
// =============================================================================

export function getPerformanceInsights(metrics: PerformanceMetrics): {
  score: number
  insights: string[]
  warnings: string[]
} {
  const insights: string[] = []
  const warnings: string[] = []
  let score = 100

  // Core Web Vitals checks
  if (metrics.lcp && metrics.lcp > 2500) {
    score -= 20
    warnings.push('Largest Contentful Paint is too slow (>2.5s)')
    insights.push('Optimize images and critical resources loading')
  }

  if (metrics.fid && metrics.fid > 100) {
    score -= 15
    warnings.push('First Input Delay is too high (>100ms)')
    insights.push('Reduce JavaScript execution time and main thread blocking')
  }

  if (metrics.cls && metrics.cls > 0.1) {
    score -= 10
    warnings.push('Cumulative Layout Shift is too high (>0.1)')
    insights.push('Add size attributes to images and reserve space for dynamic content')
  }

  if (metrics.fcp && metrics.fcp > 1800) {
    score -= 10
    warnings.push('First Contentful Paint is slow (>1.8s)')
    insights.push('Optimize critical rendering path and reduce render-blocking resources')
  }

  // Memory usage checks
  if (metrics.memoryUsage && metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
    score -= 5
    warnings.push('High memory usage detected')
    insights.push('Consider implementing virtualization for large lists and cleaning up event listeners')
  }

  // Page load time checks
  if (metrics.pageLoadTime && metrics.pageLoadTime > 3000) {
    score -= 15
    warnings.push('Page load time is too slow (>3s)')
    insights.push('Implement code splitting and lazy loading')
  }

  return {
    score: Math.max(0, score),
    insights,
    warnings,
  }
}

// =============================================================================
// REACT PERFORMANCE HOOKS
// =============================================================================

import { useEffect, useRef, useState, useCallback } from 'react'

// Hook to measure component render time
export function useRenderPerformance(componentName: string) {
  const renderTracker = useRef(new RenderPerformanceTracker())
  const startTime = useRef<number>()

  useEffect(() => {
    if (startTime.current) {
      const renderTime = performance.now() - startTime.current
      renderTracker.current.trackRender(componentName, renderTime)
    }
  })

  // Start measuring at the beginning of render
  startTime.current = performance.now()

  return renderTracker.current.getRenderStats(componentName)
}

// Hook to track API performance
export function useAPIPerformance() {
  const tracker = useRef(new APIPerformanceTracker())

  const trackRequest = useCallback((endpoint: string, duration: number) => {
    tracker.current.trackRequest(endpoint, duration)
  }, [])

  const getStats = useCallback((endpoint?: string) => {
    return endpoint 
      ? tracker.current.getEndpointStats(endpoint)
      : tracker.current.getAllStats()
  }, [])

  return { trackRequest, getStats }
}

// Hook to monitor memory usage
export function useMemoryMonitor(enabled: boolean = false, interval: number = 5000) {
  const monitor = useRef(new MemoryMonitor())
  const [memoryStats, setMemoryStats] = useState<ReturnType<MemoryMonitor['getMemoryStats']> | null>(null)

  useEffect(() => {
    if (enabled) {
      monitor.current.startMonitoring(interval)
      
      const updateInterval = setInterval(() => {
        setMemoryStats(monitor.current.getMemoryStats())
      }, interval)

      return () => {
        monitor.current.stopMonitoring()
        clearInterval(updateInterval)
      }
    }
  }, [enabled, interval])

  return memoryStats
}

// Hook to get performance metrics
export function usePerformanceMetrics() {
  const monitor = useRef(new PerformanceMonitor())
  const [metrics, setMetrics] = useState<PerformanceMetrics>({})

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(monitor.current.getMetrics())
    }

    // Update metrics after page load
    window.addEventListener('load', () => {
      setTimeout(updateMetrics, 1000)
    })

    // Update metrics periodically
    const interval = setInterval(updateMetrics, 5000)

    return () => {
      clearInterval(interval)
      monitor.current.disconnect()
    }
  }, [])

  return metrics
}

// =============================================================================
// EXPORTS
// =============================================================================

// Create singleton instances
export const performanceMonitor = new PerformanceMonitor()
export const bundleSizeAnalyzer = new BundleSizeAnalyzer()
export const memoryMonitor = new MemoryMonitor()
export const apiPerformanceTracker = new APIPerformanceTracker()
export const renderPerformanceTracker = new RenderPerformanceTracker()

// Export classes for custom instances
export {
  PerformanceMonitor,
  BundleSizeAnalyzer,
  MemoryMonitor,
  APIPerformanceTracker,
  RenderPerformanceTracker,
}

// Export types
export type {
  PerformanceMetrics,
  MemoryInfo,
}