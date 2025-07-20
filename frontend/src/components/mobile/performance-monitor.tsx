'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  Zap, 
  Gauge, 
  Wifi, 
  HardDrive, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null     // Largest Contentful Paint
  fid: number | null     // First Input Delay
  cls: number | null     // Cumulative Layout Shift
  fcp: number | null     // First Contentful Paint
  ttfb: number | null    // Time to First Byte
  
  // Custom metrics
  memoryUsage: number
  connectionType: string
  renderTime: number
  apiResponseTime: number
  bundleSize: number
  
  // Scores
  performanceScore: number
  timestamp: number
}

interface PerformanceMonitorProps {
  showDetails?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void
  className?: string
}

export function PerformanceMonitor({
  showDetails = false,
  position = 'bottom-right',
  onMetricsUpdate,
  className
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(process.env.NODE_ENV === 'development')

  useEffect(() => {
    let observer: PerformanceObserver | null = null
    let intervalId: NodeJS.Timeout | null = null

    const collectMetrics = () => {
      const newMetrics: PerformanceMetrics = {
        lcp: null,
        fid: null,
        cls: null,
        fcp: null,
        ttfb: null,
        memoryUsage: getMemoryUsage(),
        connectionType: getConnectionType(),
        renderTime: getRenderTime(),
        apiResponseTime: getAverageApiResponseTime(),
        bundleSize: getBundleSize(),
        performanceScore: 0,
        timestamp: Date.now()
      }

      // Calculate performance score
      newMetrics.performanceScore = calculatePerformanceScore(newMetrics)

      setMetrics(newMetrics)
      if (onMetricsUpdate) {
        onMetricsUpdate(newMetrics)
      }
    }

    // Collect Core Web Vitals
    if ('PerformanceObserver' in window) {
      observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          setMetrics(prev => {
            if (!prev) return prev
            
            const updated = { ...prev }
            
            switch (entry.entryType) {
              case 'largest-contentful-paint':
                updated.lcp = entry.startTime
                break
              case 'first-input':
                updated.fid = (entry as any).processingStart - entry.startTime
                break
              case 'layout-shift':
                if (!(entry as any).hadRecentInput) {
                  updated.cls = (updated.cls || 0) + (entry as any).value
                }
                break
              case 'navigation':
                const navEntry = entry as PerformanceNavigationTiming
                updated.fcp = navEntry.responseStart - navEntry.requestStart
                updated.ttfb = navEntry.responseStart - navEntry.requestStart
                break
            }
            
            updated.performanceScore = calculatePerformanceScore(updated)
            
            if (onMetricsUpdate) {
              onMetricsUpdate(updated)
            }
            
            return updated
          })
        })
      })

      try {
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'navigation'] })
      } catch (e) {
        console.warn('Some performance metrics not supported:', e)
      }
    }

    // Initial collection and periodic updates
    collectMetrics()
    intervalId = setInterval(collectMetrics, 5000)

    return () => {
      if (observer) {
        observer.disconnect()
      }
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [onMetricsUpdate])

  if (!isVisible || !metrics) return null

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 90) return CheckCircle
    if (score >= 70) return AlertTriangle
    return XCircle
  }

  const formatMetric = (value: number | null, unit = 'ms') => {
    if (value === null) return 'N/A'
    return `${value.toFixed(1)}${unit}`
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }

  const ScoreIcon = getScoreIcon(metrics.performanceScore)

  return (
    <motion.div
      className={cn(
        "fixed z-50 max-w-sm",
        positionClasses[position],
        className
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-3 bg-background/95 backdrop-blur-sm border shadow-lg">
        {/* Header */}
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Performance</span>
          <div className="flex items-center gap-1 ml-auto">
            <ScoreIcon className={cn("w-4 h-4", getScoreColor(metrics.performanceScore))} />
            <span className={cn("text-sm font-bold", getScoreColor(metrics.performanceScore))}>
              {metrics.performanceScore.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Detailed View */}
        <AnimatePresence>
          {(isExpanded || showDetails) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3">
                {/* Core Web Vitals */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Core Web Vitals</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <MetricItem
                      label="LCP"
                      value={formatMetric(metrics.lcp)}
                      status={getVitalStatus(metrics.lcp, [2500, 4000])}
                    />
                    <MetricItem
                      label="FID"
                      value={formatMetric(metrics.fid)}
                      status={getVitalStatus(metrics.fid, [100, 300])}
                    />
                    <MetricItem
                      label="CLS"
                      value={formatMetric(metrics.cls, '')}
                      status={getVitalStatus(metrics.cls, [0.1, 0.25])}
                    />
                    <MetricItem
                      label="FCP"
                      value={formatMetric(metrics.fcp)}
                      status={getVitalStatus(metrics.fcp, [1800, 3000])}
                    />
                  </div>
                </div>

                {/* System Metrics */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">System</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        <span>Memory</span>
                      </div>
                      <span>{formatMetric(metrics.memoryUsage, 'MB')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Wifi className="w-3 h-3" />
                        <span>Connection</span>
                      </div>
                      <span>{metrics.connectionType}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>API Response</span>
                      </div>
                      <span>{formatMetric(metrics.apiResponseTime)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs h-6 px-2"
                    onClick={() => window.location.reload()}
                  >
                    Refresh
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs h-6 px-2"
                    onClick={() => setIsVisible(false)}
                  >
                    Hide
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

interface MetricItemProps {
  label: string
  value: string
  status: 'good' | 'needs-improvement' | 'poor'
}

function MetricItem({ label, value, status }: MetricItemProps) {
  const statusColors = {
    good: 'bg-green-100 text-green-800 border-green-200',
    'needs-improvement': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    poor: 'bg-red-100 text-red-800 border-red-200'
  }

  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded border",
      statusColors[status]
    )}>
      <span className="font-medium">{label}</span>
      <span>{value}</span>
    </div>
  )
}

// Helper functions
function getMemoryUsage(): number {
  if ('memory' in performance) {
    const memory = (performance as any).memory
    return Math.round(memory.usedJSHeapSize / 1024 / 1024)
  }
  return 0
}

function getConnectionType(): string {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection
    return connection.effectiveType || connection.type || 'unknown'
  }
  return 'unknown'
}

function getRenderTime(): number {
  const entries = performance.getEntriesByType('measure')
  const renderEntries = entries.filter(entry => entry.name.includes('render'))
  return renderEntries.length > 0 
    ? renderEntries[renderEntries.length - 1].duration 
    : 0
}

function getAverageApiResponseTime(): number {
  const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  if (entries.length > 0) {
    const entry = entries[0]
    return entry.responseEnd - entry.responseStart
  }
  return 0
}

function getBundleSize(): number {
  // This would need to be calculated during build time
  // For now, return a mock value
  return 1.2
}

function calculatePerformanceScore(metrics: PerformanceMetrics): number {
  let score = 100
  
  // Deduct points based on Core Web Vitals
  if (metrics.lcp && metrics.lcp > 2500) score -= 20
  if (metrics.fid && metrics.fid > 100) score -= 20
  if (metrics.cls && metrics.cls > 0.1) score -= 20
  if (metrics.fcp && metrics.fcp > 1800) score -= 15
  if (metrics.ttfb && metrics.ttfb > 800) score -= 15
  
  // Deduct points for high resource usage
  if (metrics.memoryUsage > 100) score -= 10
  
  return Math.max(0, score)
}

function getVitalStatus(value: number | null, thresholds: [number, number]): 'good' | 'needs-improvement' | 'poor' {
  if (value === null) return 'poor'
  if (value <= thresholds[0]) return 'good'
  if (value <= thresholds[1]) return 'needs-improvement'
  return 'poor'
}

export default PerformanceMonitor