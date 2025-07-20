'use client'

import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, useState } from 'react'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number | string
  previousValue?: number
  prefix?: string
  suffix?: string
  icon?: LucideIcon
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: number
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  animateOnMount?: boolean
  className?: string
  onClick?: () => void
}

const variantConfig = {
  default: {
    bg: 'bg-white dark:bg-gray-900',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    border: 'border-gray-200 dark:border-gray-800'
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800'
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800'
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800'
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800'
  }
}

const trendConfig = {
  up: {
    icon: TrendingUp,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30'
  },
  down: {
    icon: TrendingDown,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30'
  },
  neutral: {
    icon: TrendingUp,
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800'
  }
}

function useCountAnimation(
  target: number,
  duration: number = 2000,
  enabled: boolean = true
) {
  const [current, setCurrent] = useState(enabled ? 0 : target)
  const controls = useAnimationControls()

  useEffect(() => {
    if (!enabled) return

    const startTime = Date.now()
    const startValue = 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease out animation
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const value = Math.floor(startValue + (target - startValue) * easeOut)
      
      setCurrent(value)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setCurrent(target)
      }
    }

    requestAnimationFrame(animate)
  }, [target, duration, enabled])

  return current
}

export function StatCard({
  title,
  value,
  previousValue,
  prefix = '',
  suffix = '',
  icon: Icon,
  description,
  trend,
  trendValue,
  variant = 'default',
  animateOnMount = true,
  className,
  onClick
}: StatCardProps) {
  const config = variantConfig[variant]
  const numericValue = typeof value === 'number' ? value : 0
  const animatedValue = useCountAnimation(numericValue, 2000, animateOnMount && typeof value === 'number')
  const displayValue = typeof value === 'number' ? animatedValue : value

  const calculateTrendValue = () => {
    if (trendValue !== undefined) return trendValue
    if (previousValue !== undefined && typeof value === 'number') {
      return ((value - previousValue) / previousValue) * 100
    }
    return 0
  }

  const trendPercentage = calculateTrendValue()
  const TrendIcon = trend ? trendConfig[trend].icon : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -4, 
        transition: { type: "spring", stiffness: 300, damping: 20 } 
      }}
      className={cn("cursor-pointer group", className)}
      onClick={onClick}
    >
      <Card className={cn(
        "border transition-all duration-300 hover:shadow-lg",
        config.bg,
        config.border,
        "hover:shadow-primary/10"
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-3 flex-1">
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {title}
                </p>
                {Icon && (
                  <motion.div
                    className={cn(
                      "p-2 rounded-lg",
                      config.iconBg
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className={cn("h-5 w-5", config.iconColor)} />
                  </motion.div>
                )}
              </div>

              {/* Value */}
              <div className="space-y-1">
                <motion.div 
                  className="text-3xl font-bold text-gray-900 dark:text-gray-100"
                  key={displayValue}
                  initial={{ scale: 1.2, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {prefix}{displayValue.toLocaleString()}{suffix}
                </motion.div>

                {description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {description}
                  </p>
                )}
              </div>

              {/* Trend */}
              {trend && (
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs px-2 py-1",
                      trendConfig[trend].bg,
                      trendConfig[trend].color
                    )}
                  >
                    {TrendIcon && <TrendIcon className="h-3 w-3 mr-1" />}
                    {Math.abs(trendPercentage).toFixed(1)}%
                  </Badge>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    vs last period
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Hover effect overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg opacity-0"
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />

          {/* Success pulse animation */}
          {variant === 'success' && (
            <motion.div
              className="absolute top-3 right-3 w-2 h-2 bg-green-500 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}