'use client'

import { useRef, useState, useCallback } from 'react'
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SwipeGestureProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  disabled?: boolean
  direction?: 'horizontal' | 'vertical' | 'both'
  className?: string
  resetOnRelease?: boolean
}

export function SwipeGesture({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 100,
  disabled = false,
  direction = 'horizontal',
  className,
  resetOnRelease = true
}: SwipeGestureProps) {
  const [isDragging, setIsDragging] = useState(false)
  const constraintsRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Transform for visual feedback
  const rotateX = useTransform(y, [-threshold, threshold], [5, -5])
  const rotateY = useTransform(x, [-threshold, threshold], [-5, 5])
  const scale = useTransform([x, y], ([x, y]) => {
    const distance = Math.sqrt(x * x + y * y)
    return Math.max(0.95, 1 - distance / (threshold * 4))
  })

  const getDragConstraints = () => {
    switch (direction) {
      case 'horizontal':
        return { top: 0, bottom: 0, left: -threshold * 2, right: threshold * 2 }
      case 'vertical':
        return { left: 0, right: 0, top: -threshold * 2, bottom: threshold * 2 }
      case 'both':
        return { 
          left: -threshold * 2, 
          right: threshold * 2, 
          top: -threshold * 2, 
          bottom: threshold * 2 
        }
      default:
        return { top: 0, bottom: 0, left: 0, right: 0 }
    }
  }

  const handleDragStart = useCallback(() => {
    if (disabled) return false
    setIsDragging(true)
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(20)
    }
  }, [disabled])

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    setIsDragging(false)
    
    const { offset } = info
    let actionTriggered = false

    // Check for swipe gestures based on direction and threshold
    if (direction === 'horizontal' || direction === 'both') {
      if (offset.x > threshold && onSwipeRight) {
        onSwipeRight()
        actionTriggered = true
      } else if (offset.x < -threshold && onSwipeLeft) {
        onSwipeLeft()
        actionTriggered = true
      }
    }

    if (direction === 'vertical' || direction === 'both') {
      if (offset.y > threshold && onSwipeDown) {
        onSwipeDown()
        actionTriggered = true
      } else if (offset.y < -threshold && onSwipeUp) {
        onSwipeUp()
        actionTriggered = true
      }
    }

    // Add stronger haptic feedback for successful swipe
    if (actionTriggered && navigator.vibrate) {
      navigator.vibrate(50)
    }

    // Reset position if specified or no action was triggered
    if (resetOnRelease || !actionTriggered) {
      x.set(0)
      y.set(0)
    }
  }, [
    direction,
    threshold,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    resetOnRelease,
    x,
    y
  ])

  const getDragProps = () => {
    if (disabled) return {}

    return {
      drag: direction === 'both' ? true : direction === 'horizontal' ? 'x' : 'y',
      dragConstraints: getDragConstraints(),
      dragElastic: 0.2,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
      style: { x, y, rotateX, rotateY, scale },
      whileDrag: { cursor: 'grabbing' },
    }
  }

  return (
    <div ref={constraintsRef} className={cn("relative", className)}>
      <motion.div
        {...getDragProps()}
        className={cn(
          "touch-pan-x select-none",
          !disabled && "cursor-grab",
          isDragging && "cursor-grabbing"
        )}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {children}
      </motion.div>

      {/* Visual indicators for swipe directions (optional) */}
      {isDragging && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Left indicator */}
          {(direction === 'horizontal' || direction === 'both') && onSwipeLeft && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: x.get() < -threshold / 2 ? 1 : 0,
                x: x.get() < -threshold / 2 ? 0 : -20
              }}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-red-500"
            >
              ←
            </motion.div>
          )}

          {/* Right indicator */}
          {(direction === 'horizontal' || direction === 'both') && onSwipeRight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: x.get() > threshold / 2 ? 1 : 0,
                x: x.get() > threshold / 2 ? 0 : 20
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-500"
            >
              →
            </motion.div>
          )}

          {/* Up indicator */}
          {(direction === 'vertical' || direction === 'both') && onSwipeUp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: y.get() < -threshold / 2 ? 1 : 0,
                y: y.get() < -threshold / 2 ? 0 : -20
              }}
              className="absolute top-4 left-1/2 transform -translate-x-1/2 text-blue-500"
            >
              ↑
            </motion.div>
          )}

          {/* Down indicator */}
          {(direction === 'vertical' || direction === 'both') && onSwipeDown && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: y.get() > threshold / 2 ? 1 : 0,
                y: y.get() > threshold / 2 ? 0 : 20
              }}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-purple-500"
            >
              ↓
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}

export default SwipeGesture