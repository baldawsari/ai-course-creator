'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  delay?: number
  disabled?: boolean
  className?: string
  contentClassName?: string
  arrow?: boolean
  maxWidth?: number
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delay = 500,
  disabled = false,
  className,
  contentClassName,
  arrow = true,
  maxWidth = 200
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    let x = 0
    let y = 0
    const offset = 8 // Distance from trigger
    const arrowSize = arrow ? 6 : 0

    // Calculate base position
    switch (side) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        y = triggerRect.top - tooltipRect.height - offset - arrowSize
        break
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        y = triggerRect.bottom + offset + arrowSize
        break
      case 'left':
        x = triggerRect.left - tooltipRect.width - offset - arrowSize
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        break
      case 'right':
        x = triggerRect.right + offset + arrowSize
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        break
    }

    // Apply alignment
    if (side === 'top' || side === 'bottom') {
      switch (align) {
        case 'start':
          x = triggerRect.left
          break
        case 'end':
          x = triggerRect.right - tooltipRect.width
          break
      }
    } else {
      switch (align) {
        case 'start':
          y = triggerRect.top
          break
        case 'end':
          y = triggerRect.bottom - tooltipRect.height
          break
      }
    }

    // Prevent tooltip from going off screen
    x = Math.max(8, Math.min(x, viewport.width - tooltipRect.width - 8))
    y = Math.max(8, Math.min(y, viewport.height - tooltipRect.height - 8))

    setPosition({ x, y })
  }

  const showTooltip = () => {
    if (disabled) return
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    if (isVisible) {
      calculatePosition()
      
      const handleScroll = () => {
        calculatePosition()
      }
      
      const handleResize = () => {
        hideTooltip()
      }

      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [isVisible])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getArrowClasses = () => {
    const baseClasses = "absolute w-0 h-0 border-solid"
    
    switch (side) {
      case 'top':
        return cn(
          baseClasses,
          "top-full left-1/2 transform -translate-x-1/2",
          "border-l-[6px] border-l-transparent",
          "border-r-[6px] border-r-transparent",
          "border-t-[6px] border-t-gray-900 dark:border-t-gray-100"
        )
      case 'bottom':
        return cn(
          baseClasses,
          "bottom-full left-1/2 transform -translate-x-1/2",
          "border-l-[6px] border-l-transparent",
          "border-r-[6px] border-r-transparent",
          "border-b-[6px] border-b-gray-900 dark:border-b-gray-100"
        )
      case 'left':
        return cn(
          baseClasses,
          "left-full top-1/2 transform -translate-y-1/2",
          "border-t-[6px] border-t-transparent",
          "border-b-[6px] border-b-transparent",
          "border-l-[6px] border-l-gray-900 dark:border-l-gray-100"
        )
      case 'right':
        return cn(
          baseClasses,
          "right-full top-1/2 transform -translate-y-1/2",
          "border-t-[6px] border-t-transparent",
          "border-b-[6px] border-b-transparent",
          "border-r-[6px] border-r-gray-900 dark:border-r-gray-100"
        )
      default:
        return baseClasses
    }
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className={cn("inline-block", className)}
      >
        {children}
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ 
              duration: 0.15,
              ease: "easeOut"
            }}
            className="fixed z-50 pointer-events-none"
            style={{
              left: position.x,
              top: position.y,
              maxWidth: maxWidth
            }}
          >
            <div className={cn(
              "relative px-3 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md shadow-lg",
              "border border-gray-800 dark:border-gray-200",
              contentClassName
            )}>
              {content}
              
              {arrow && (
                <div className={getArrowClasses()} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Simple text tooltip
export function SimpleTooltip({
  text,
  children,
  ...props
}: Omit<TooltipProps, 'content'> & { text: string }) {
  return (
    <Tooltip content={text} {...props}>
      {children}
    </Tooltip>
  )
}

// Rich content tooltip
export function RichTooltip({
  title,
  description,
  children,
  ...props
}: Omit<TooltipProps, 'content'> & { 
  title: string
  description?: string 
}) {
  return (
    <Tooltip
      content={
        <div className="space-y-1">
          <div className="font-semibold">{title}</div>
          {description && (
            <div className="text-xs opacity-90">{description}</div>
          )}
        </div>
      }
      maxWidth={250}
      {...props}
    >
      {children}
    </Tooltip>
  )
}

// Keyboard shortcut tooltip
export function ShortcutTooltip({
  shortcut,
  description,
  children,
  ...props
}: Omit<TooltipProps, 'content'> & { 
  shortcut: string[]
  description: string 
}) {
  return (
    <Tooltip
      content={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">{description}</span>
          <div className="flex items-center gap-1">
            {shortcut.map((key, index) => (
              <span
                key={index}
                className="px-1.5 py-0.5 text-xs bg-gray-700 dark:bg-gray-300 text-gray-300 dark:text-gray-700 rounded border"
              >
                {key}
              </span>
            ))}
          </div>
        </div>
      }
      maxWidth={300}
      {...props}
    >
      {children}
    </Tooltip>
  )
}