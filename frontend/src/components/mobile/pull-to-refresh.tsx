'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion'
import { RefreshCw, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
  threshold?: number
  disabled?: boolean
  className?: string
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  disabled = false,
  className
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [canRefresh, setCanRefresh] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const y = useMotionValue(0)
  
  // Transform values for animations
  const refreshOpacity = useTransform(y, [0, threshold], [0, 1])
  const refreshRotation = useTransform(y, [0, threshold * 2], [0, 180])
  const refreshScale = useTransform(y, [0, threshold], [0.5, 1])

  const handleDragStart = useCallback(() => {
    if (disabled || isRefreshing) return false
    
    // Only allow pull-to-refresh when scrolled to the top
    const container = containerRef.current
    if (container && container.scrollTop > 0) {
      return false
    }
    
    return true
  }, [disabled, isRefreshing])

  const handleDrag = useCallback((event: any, info: PanInfo) => {
    const currentY = info.offset.y
    
    if (currentY < 0) {
      y.set(0)
      setCanRefresh(false)
      return
    }
    
    // Apply resistance curve for more natural feel
    const resistance = Math.max(0, 1 - (currentY / (threshold * 3)))
    const dampedY = currentY * resistance
    
    y.set(Math.min(dampedY, threshold * 1.5))
    setCanRefresh(dampedY >= threshold)
  }, [threshold, y])

  const handleDragEnd = useCallback(async (event: any, info: PanInfo) => {
    if (disabled || isRefreshing) return
    
    if (info.offset.y >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      
      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setIsRefreshing(false)
        setCanRefresh(false)
        y.set(0)
      }
    } else {
      setCanRefresh(false)
      y.set(0)
    }
  }, [disabled, isRefreshing, threshold, onRefresh, y])

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Pull indicator */}
      <motion.div
        style={{ 
          y: y,
          opacity: refreshOpacity,
        }}
        className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 bg-background/80 backdrop-blur-sm z-10"
      >
        <motion.div
          style={{ 
            scale: refreshScale,
            rotate: isRefreshing ? undefined : refreshRotation
          }}
          animate={isRefreshing ? { rotate: 360 } : {}}
          transition={isRefreshing ? {
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          } : undefined}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-colors",
            canRefresh 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          )}
        >
          {isRefreshing ? (
            <>
              <RefreshCw className="h-4 w-4" />
              <span className="text-sm font-medium">Refreshing...</span>
            </>
          ) : canRefresh ? (
            <>
              <ArrowDown className="h-4 w-4" />
              <span className="text-sm font-medium">Release to refresh</span>
            </>
          ) : (
            <>
              <ArrowDown className="h-4 w-4" />
              <span className="text-sm font-medium">Pull to refresh</span>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* Content container */}
      <motion.div
        ref={containerRef}
        style={{ y }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="h-full overflow-auto"
      >
        <div style={{ paddingTop: isRefreshing ? '60px' : '0px' }}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}

export default PullToRefresh