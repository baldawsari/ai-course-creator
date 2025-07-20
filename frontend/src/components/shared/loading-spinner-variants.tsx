'use client'

import { motion } from 'framer-motion'
import { Loader2, RefreshCw, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'dots' | 'pulse' | 'bars' | 'ring' | 'wave' | 'bounce'
  color?: 'primary' | 'secondary' | 'muted'
  className?: string
  text?: string
}

const sizeConfig = {
  sm: { size: 'w-4 h-4', text: 'text-sm' },
  md: { size: 'w-6 h-6', text: 'text-base' },
  lg: { size: 'w-8 h-8', text: 'text-lg' },
  xl: { size: 'w-12 h-12', text: 'text-xl' }
}

const colorConfig = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  muted: 'text-muted-foreground'
}

export function LoadingSpinner({
  size = 'md',
  variant = 'default',
  color = 'primary',
  className,
  text
}: LoadingSpinnerProps) {
  const { size: sizeClass, text: textClass } = sizeConfig[size]
  const colorClass = colorConfig[color]

  const SpinnerVariant = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex items-center space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={cn("rounded-full bg-current", 
                  size === 'sm' ? 'w-1 h-1' :
                  size === 'md' ? 'w-1.5 h-1.5' :
                  size === 'lg' ? 'w-2 h-2' : 'w-3 h-3'
                )}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        )

      case 'pulse':
        return (
          <motion.div
            className={cn("rounded-full bg-current", sizeClass)}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )

      case 'bars':
        return (
          <div className="flex items-end space-x-1">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className={cn("bg-current rounded-sm",
                  size === 'sm' ? 'w-0.5 h-3' :
                  size === 'md' ? 'w-1 h-4' :
                  size === 'lg' ? 'w-1 h-6' : 'w-1.5 h-8'
                )}
                animate={{
                  scaleY: [1, 2, 1]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        )

      case 'ring':
        return (
          <div className={cn("relative", sizeClass)}>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-current border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <motion.div
              className="absolute inset-1 rounded-full border border-current border-b-transparent opacity-60"
              animate={{ rotate: -360 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </div>
        )

      case 'wave':
        return (
          <div className="flex items-center space-x-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className={cn("bg-current rounded-full",
                  size === 'sm' ? 'w-1 h-1' :
                  size === 'md' ? 'w-1.5 h-1.5' :
                  size === 'lg' ? 'w-2 h-2' : 'w-3 h-3'
                )}
                animate={{
                  y: [0, -8, 0]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        )

      case 'bounce':
        return (
          <motion.div
            className={cn("rounded-full bg-current", sizeClass)}
            animate={{
              y: [0, -16, 0]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )

      default:
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <Loader2 className={sizeClass} />
          </motion.div>
        )
    }
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3",
      colorClass,
      className
    )}>
      <SpinnerVariant />
      {text && (
        <motion.p
          className={cn("font-medium", textClass)}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}

// Specialized loading components
export function LoadingCard({ className, ...props }: LoadingSpinnerProps & { className?: string }) {
  return (
    <div className={cn(
      "flex items-center justify-center p-8 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-900/50",
      className
    )}>
      <LoadingSpinner {...props} />
    </div>
  )
}

export function LoadingOverlay({ 
  isVisible, 
  className, 
  children,
  ...props 
}: LoadingSpinnerProps & { 
  isVisible: boolean
  className?: string
  children?: React.ReactNode
}) {
  if (!isVisible) return children || null

  return (
    <div className={cn("relative", className)}>
      {children}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50"
      >
        <LoadingSpinner {...props} />
      </motion.div>
    </div>
  )
}

export function LoadingButton({ 
  isLoading, 
  children, 
  loadingText = "Loading...",
  ...buttonProps 
}: {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...buttonProps}
      disabled={isLoading || buttonProps.disabled}
      className={cn(
        "flex items-center justify-center gap-2",
        buttonProps.className
      )}
    >
      {isLoading && <LoadingSpinner size="sm" variant="default" />}
      {isLoading ? loadingText : children}
    </button>
  )
}

// Page-level loading component
export function PageLoading({ 
  title = "Loading...", 
  description,
  variant = "ring"
}: {
  title?: string
  description?: string
  variant?: LoadingSpinnerProps['variant']
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner size="xl" variant={variant} />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}