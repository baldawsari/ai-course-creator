'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button, ButtonProps } from '@/components/ui/button'

interface TouchButtonProps extends Omit<ButtonProps, 'onTouchStart' | 'onTouchEnd'> {
  hapticFeedback?: boolean
  longPressDelay?: number
  onLongPress?: () => void
  pressScale?: number
  pressOpacity?: number
  rippleEffect?: boolean
  rippleColor?: string
}

export function TouchButton({
  children,
  className,
  hapticFeedback = true,
  longPressDelay = 500,
  onLongPress,
  pressScale = 0.95,
  pressOpacity = 0.8,
  rippleEffect = true,
  rippleColor = 'rgba(255, 255, 255, 0.3)',
  disabled,
  onClick,
  ...props
}: TouchButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([])
  const buttonRef = useRef<HTMLButtonElement>(null)
  const longPressTimer = useRef<NodeJS.Timeout>()
  const rippleCounter = useRef(0)

  const handleTouchStart = (event: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return

    setIsPressed(true)

    // Haptic feedback
    if (hapticFeedback && navigator.vibrate) {
      navigator.vibrate(10)
    }

    // Create ripple effect
    if (rippleEffect && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const touch = 'touches' in event ? event.touches[0] : event as React.MouseEvent
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top

      const newRipple = {
        id: rippleCounter.current++,
        x,
        y,
      }

      setRipples(prev => [...prev, newRipple])

      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
      }, 600)
    }

    // Long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        if (hapticFeedback && navigator.vibrate) {
          navigator.vibrate(50)
        }
        onLongPress()
      }, longPressDelay)
    }
  }

  const handleTouchEnd = () => {
    setIsPressed(false)
    
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    
    // Clear long press timer on click
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }

    if (onClick) {
      onClick(event)
    }
  }

  return (
    <motion.div
      animate={{
        scale: isPressed ? pressScale : 1,
        opacity: isPressed ? pressOpacity : 1,
      }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <Button
        ref={buttonRef}
        className={cn(
          "relative overflow-hidden touch-manipulation select-none",
          "active:scale-95 transition-transform duration-100",
          disabled && "pointer-events-none",
          className
        )}
        disabled={disabled}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleClick}
        {...props}
      >
        {/* Button content */}
        <span className="relative z-10">
          {children}
        </span>

        {/* Ripple effects */}
        {rippleEffect && ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: ripple.x,
              top: ripple.y,
              backgroundColor: rippleColor,
            }}
            initial={{
              width: 0,
              height: 0,
              x: '-50%',
              y: '-50%',
              opacity: 1,
            }}
            animate={{
              width: 300,
              height: 300,
              opacity: 0,
            }}
            transition={{
              duration: 0.6,
              ease: 'easeOut',
            }}
          />
        ))}
      </Button>
    </motion.div>
  )
}

// Preset touch buttons for common use cases
export function TouchFAB({
  className,
  ...props
}: Omit<TouchButtonProps, 'size' | 'variant'>) {
  return (
    <TouchButton
      size="lg"
      variant="default"
      className={cn(
        "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow",
        "bg-gradient-to-r from-primary to-secondary",
        className
      )}
      pressScale={0.9}
      hapticFeedback
      rippleEffect
      {...props}
    />
  )
}

export function TouchIconButton({
  className,
  ...props
}: Omit<TouchButtonProps, 'size' | 'variant'>) {
  return (
    <TouchButton
      size="sm"
      variant="ghost"
      className={cn(
        "h-12 w-12 rounded-full",
        className
      )}
      pressScale={0.9}
      hapticFeedback
      rippleEffect
      {...props}
    />
  )
}

export function TouchListItem({
  className,
  onLongPress,
  ...props
}: TouchButtonProps) {
  return (
    <TouchButton
      variant="ghost"
      className={cn(
        "w-full justify-start h-auto py-3 px-4 rounded-lg",
        "hover:bg-muted/50 active:bg-muted",
        className
      )}
      pressScale={0.98}
      pressOpacity={0.9}
      hapticFeedback
      rippleEffect
      longPressDelay={800}
      onLongPress={onLongPress}
      {...props}
    />
  )
}

export default TouchButton