'use client'

import { useState, useRef } from 'react'
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MoreVertical, Heart, Share2, Edit, Trash2 } from 'lucide-react'

interface MobileCardProps {
  children: React.ReactNode
  className?: string
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onLongPress?: () => void
  swipeActions?: {
    left?: { icon: React.ComponentType; label: string; action: () => void; color?: string }
    right?: { icon: React.ComponentType; label: string; action: () => void; color?: string }
  }
  enableSwipe?: boolean
  enableLongPress?: boolean
}

export function MobileCard({
  children,
  className,
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  swipeActions,
  enableSwipe = true,
  enableLongPress = true
}: MobileCardProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const x = useMotionValue(0)
  const cardRef = useRef<HTMLDivElement>(null)
  
  // Transform for background color changes during swipe
  const leftBg = useTransform(x, [-100, 0], ['rgba(239, 68, 68, 0.1)', 'rgba(0, 0, 0, 0)'])
  const rightBg = useTransform(x, [0, 100], ['rgba(0, 0, 0, 0)', 'rgba(34, 197, 94, 0.1)'])

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100
    
    if (info.offset.x > threshold && onSwipeRight) {
      onSwipeRight()
    } else if (info.offset.x < -threshold && onSwipeLeft) {
      onSwipeLeft()
    }
    
    // Reset position
    x.set(0)
  }

  const handleLongPress = () => {
    if (enableLongPress && onLongPress) {
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      onLongPress()
      setShowActions(true)
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Swipe background indicators */}
      {enableSwipe && (
        <>
          {/* Left swipe background */}
          <motion.div
            style={{ backgroundColor: leftBg }}
            className="absolute inset-y-0 left-0 right-1/2 flex items-center justify-start pl-6"
          >
            {swipeActions?.left && (
              <div className="flex items-center gap-2 text-red-600">
                <swipeActions.left.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{swipeActions.left.label}</span>
              </div>
            )}
          </motion.div>

          {/* Right swipe background */}
          <motion.div
            style={{ backgroundColor: rightBg }}
            className="absolute inset-y-0 right-0 left-1/2 flex items-center justify-end pr-6"
          >
            {swipeActions?.right && (
              <div className="flex items-center gap-2 text-green-600">
                <span className="text-sm font-medium">{swipeActions.right.label}</span>
                <swipeActions.right.icon className="h-5 w-5" />
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* Main card */}
      <motion.div
        ref={cardRef}
        style={{ x }}
        drag={enableSwipe ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        onTapStart={() => setIsPressed(true)}
        onTap={() => setIsPressed(false)}
        onTapCancel={() => setIsPressed(false)}
        onLongPressStart={handleLongPress}
        className={cn(
          "relative bg-background border rounded-lg transition-all duration-200",
          isPressed && "scale-[0.98] shadow-sm",
          !isPressed && "shadow-md",
          enableSwipe && "cursor-grab active:cursor-grabbing",
          className
        )}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {children}
      </motion.div>

      {/* Action sheet overlay */}
      {showActions && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => setShowActions(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-full bg-background rounded-t-xl p-6 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6" />
            
            <div className="space-y-3">
              <ActionButton
                icon={Edit}
                label="Edit"
                onClick={() => {
                  setShowActions(false)
                  // Handle edit action
                }}
              />
              <ActionButton
                icon={Share2}
                label="Share"
                onClick={() => {
                  setShowActions(false)
                  // Handle share action
                }}
              />
              <ActionButton
                icon={Heart}
                label="Favorite"
                onClick={() => {
                  setShowActions(false)
                  // Handle favorite action
                }}
              />
              <ActionButton
                icon={Trash2}
                label="Delete"
                variant="destructive"
                onClick={() => {
                  setShowActions(false)
                  // Handle delete action
                }}
              />
            </div>

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setShowActions(false)}
            >
              Cancel
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive'
}

function ActionButton({ icon: Icon, label, onClick, variant = 'default' }: ActionButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start h-12 text-left",
        variant === 'destructive' && "text-red-600 hover:text-red-700 hover:bg-red-50"
      )}
      onClick={onClick}
    >
      <Icon className="h-5 w-5 mr-3" />
      {label}
    </Button>
  )
}

export default MobileCard