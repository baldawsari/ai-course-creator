'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PopoverProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: 'click' | 'hover' | 'manual'
  closeOnClickOutside?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  arrow?: boolean
  offset?: number
  className?: string
  contentClassName?: string
  disabled?: boolean
}

export function Popover({
  children,
  content,
  side = 'bottom',
  align = 'center',
  isOpen: controlledOpen,
  onOpenChange,
  trigger = 'click',
  closeOnClickOutside = true,
  closeOnEscape = true,
  showCloseButton = false,
  arrow = true,
  offset = 8,
  className,
  contentClassName,
  disabled = false
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>()

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  
  const setIsOpen = (open: boolean) => {
    if (controlledOpen !== undefined) {
      onOpenChange?.(open)
    } else {
      setInternalOpen(open)
      onOpenChange?.(open)
    }
  }

  const calculatePosition = () => {
    if (!triggerRef.current || !contentRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const contentRect = contentRef.current.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    let x = 0
    let y = 0
    const arrowSize = arrow ? 8 : 0

    // Calculate base position
    switch (side) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2
        y = triggerRect.top - contentRect.height - offset - arrowSize
        break
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2
        y = triggerRect.bottom + offset + arrowSize
        break
      case 'left':
        x = triggerRect.left - contentRect.width - offset - arrowSize
        y = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2
        break
      case 'right':
        x = triggerRect.right + offset + arrowSize
        y = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2
        break
    }

    // Apply alignment
    if (side === 'top' || side === 'bottom') {
      switch (align) {
        case 'start':
          x = triggerRect.left
          break
        case 'end':
          x = triggerRect.right - contentRect.width
          break
      }
    } else {
      switch (align) {
        case 'start':
          y = triggerRect.top
          break
        case 'end':
          y = triggerRect.bottom - contentRect.height
          break
      }
    }

    // Prevent popover from going off screen
    const padding = 8
    x = Math.max(padding, Math.min(x, viewport.width - contentRect.width - padding))
    y = Math.max(padding, Math.min(y, viewport.height - contentRect.height - padding))

    setPosition({ x, y })
  }

  const handleTriggerClick = () => {
    if (disabled) return
    if (trigger === 'click') {
      setIsOpen(!isOpen)
    }
  }

  const handleTriggerMouseEnter = () => {
    if (disabled) return
    if (trigger === 'hover') {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      setIsOpen(true)
    }
  }

  const handleTriggerMouseLeave = () => {
    if (disabled) return
    if (trigger === 'hover') {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsOpen(false)
      }, 100)
    }
  }

  const handleContentMouseEnter = () => {
    if (trigger === 'hover' && hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
  }

  const handleContentMouseLeave = () => {
    if (trigger === 'hover') {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsOpen(false)
      }, 100)
    }
  }

  useEffect(() => {
    if (isOpen) {
      calculatePosition()
      
      const handleResize = () => {
        calculatePosition()
      }
      
      const handleScroll = () => {
        calculatePosition()
      }

      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll, true)
      
      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [isOpen])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        closeOnClickOutside &&
        isOpen &&
        triggerRef.current &&
        contentRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, closeOnClickOutside])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && isOpen && event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, closeOnEscape])

  const getArrowClasses = () => {
    const baseClasses = "absolute w-0 h-0 border-solid"
    
    switch (side) {
      case 'top':
        return cn(
          baseClasses,
          "top-full left-1/2 transform -translate-x-1/2",
          "border-l-[8px] border-l-transparent",
          "border-r-[8px] border-r-transparent",
          "border-t-[8px] border-t-white dark:border-t-gray-950"
        )
      case 'bottom':
        return cn(
          baseClasses,
          "bottom-full left-1/2 transform -translate-x-1/2",
          "border-l-[8px] border-l-transparent",
          "border-r-[8px] border-r-transparent",
          "border-b-[8px] border-b-white dark:border-b-gray-950"
        )
      case 'left':
        return cn(
          baseClasses,
          "left-full top-1/2 transform -translate-y-1/2",
          "border-t-[8px] border-t-transparent",
          "border-b-[8px] border-b-transparent",
          "border-l-[8px] border-l-white dark:border-l-gray-950"
        )
      case 'right':
        return cn(
          baseClasses,
          "right-full top-1/2 transform -translate-y-1/2",
          "border-t-[8px] border-t-transparent",
          "border-b-[8px] border-b-transparent",
          "border-r-[8px] border-r-white dark:border-r-gray-950"
        )
      default:
        return baseClasses
    }
  }

  return (
    <>
      <div
        ref={triggerRef}
        onClick={handleTriggerClick}
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
        className={cn("inline-block", className)}
      >
        {children}
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <div className="fixed inset-0 z-40 lg:hidden" />
            
            <motion.div
              ref={contentRef}
              initial={{ opacity: 0, scale: 0.95, y: side === 'top' ? 10 : -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: side === 'top' ? 10 : -10 }}
              transition={{ 
                duration: 0.15,
                ease: "easeOut"
              }}
              className="fixed z-50"
              style={{
                left: position.x,
                top: position.y,
              }}
              onMouseEnter={handleContentMouseEnter}
              onMouseLeave={handleContentMouseLeave}
            >
              <div className={cn(
                "relative bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg",
                "max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl",
                contentClassName
              )}>
                {/* Close Button */}
                {showCloseButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}

                {/* Content */}
                <div className={cn(
                  "p-4",
                  showCloseButton && "pr-10"
                )}>
                  {content}
                </div>

                {/* Arrow */}
                {arrow && (
                  <div className={getArrowClasses()} />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// Pre-configured variants
export function InfoPopover({
  title,
  description,
  children,
  ...props
}: Omit<PopoverProps, 'content'> & {
  title: string
  description: string
}) {
  return (
    <Popover
      content={
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
      }
      {...props}
    >
      {children}
    </Popover>
  )
}

export function MenuPopover({
  items,
  children,
  ...props
}: Omit<PopoverProps, 'content'> & {
  items: Array<{
    label: string
    onClick: () => void
    icon?: React.ElementType
    disabled?: boolean
  }>
}) {
  return (
    <Popover
      content={
        <div className="py-1 min-w-[160px]">
          {items.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={index}
                onClick={() => {
                  item.onClick()
                  // Close popover after action
                }}
                disabled={item.disabled}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-left",
                  "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {item.label}
              </button>
            )
          })}
        </div>
      }
      {...props}
    >
      {children}
    </Popover>
  )
}