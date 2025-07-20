'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  showPercentage?: boolean
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  animated?: boolean
  className?: string
  children?: React.ReactNode
}

const colorConfig = {
  primary: {
    stroke: 'stroke-primary',
    text: 'text-primary'
  },
  success: {
    stroke: 'stroke-green-500',
    text: 'text-green-500'
  },
  warning: {
    stroke: 'stroke-amber-500',
    text: 'text-amber-500'
  },
  error: {
    stroke: 'stroke-red-500',
    text: 'text-red-500'
  },
  info: {
    stroke: 'stroke-blue-500',
    text: 'text-blue-500'
  }
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  showPercentage = true,
  color = 'primary',
  animated = true,
  className,
  children
}: ProgressRingProps) {
  const normalizedProgress = Math.min(Math.max(progress, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference
  
  const config = colorConfig[color]

  return (
    <div 
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200 dark:text-gray-700"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={animated ? strokeDasharray : strokeDashoffset}
          className={cn("transition-all duration-300", config.stroke)}
          animate={animated ? {
            strokeDashoffset: strokeDashoffset
          } : {}}
          transition={{
            duration: 1.5,
            type: "spring",
            stiffness: 50,
            damping: 10
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children ? (
          children
        ) : showPercentage ? (
          <motion.div
            className="text-center"
            initial={animated ? { scale: 0, opacity: 0 } : {}}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className={cn("font-bold", config.text)}>
              <motion.span
                initial={animated ? { scale: 1.2 } : {}}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="text-2xl"
              >
                {Math.round(normalizedProgress)}
              </motion.span>
              <span className="text-lg">%</span>
            </div>
          </motion.div>
        ) : null}
      </div>

      {/* Pulse animation for completion */}
      {normalizedProgress >= 100 && animated && (
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full",
            config.stroke.replace('stroke-', 'bg-').replace('500', '100')
          )}
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.2, opacity: 0 }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatDelay: 1
          }}
        />
      )}
    </div>
  )
}