'use client'

import { motion } from 'framer-motion'
import { LucideIcon, FileX, Search, Users, BookOpen, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  variant?: 'default' | 'search' | 'error' | 'loading'
  illustration?: 'files' | 'search' | 'users' | 'courses' | 'custom'
  actionLabel?: string
  secondaryActionLabel?: string
  onAction?: () => void
  onSecondaryAction?: () => void
  className?: string
  children?: React.ReactNode
}

const illustrationConfig = {
  files: {
    icon: FileX,
    color: 'text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800'
  },
  search: {
    icon: Search,
    color: 'text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20'
  },
  users: {
    icon: Users,
    color: 'text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20'
  },
  courses: {
    icon: BookOpen,
    color: 'text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/20'
  },
  custom: {
    icon: FileX,
    color: 'text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800'
  }
}

const FloatingElements = () => (
  <>
    {Array.from({ length: 6 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 bg-primary/20 rounded-full"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -20, 0],
          opacity: [0.3, 0.8, 0.3],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 2,
          ease: "easeInOut"
        }}
      />
    ))}
  </>
)

export function EmptyState({
  title,
  description,
  icon: CustomIcon,
  variant = 'default',
  illustration = 'files',
  actionLabel,
  secondaryActionLabel,
  onAction,
  onSecondaryAction,
  className,
  children
}: EmptyStateProps) {
  const config = illustrationConfig[illustration]
  const IconComponent = CustomIcon || config.icon

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <Card className={cn(
      "border-dashed border-2 border-gray-200 dark:border-gray-800",
      "bg-gray-50/50 dark:bg-gray-900/50",
      className
    )}>
      <CardContent className="p-12">
        <motion.div
          className="text-center space-y-6 relative overflow-hidden"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Floating background elements */}
          <div className="absolute inset-0 pointer-events-none">
            <FloatingElements />
          </div>

          {/* Icon/Illustration */}
          <motion.div
            className="relative mx-auto"
            variants={itemVariants}
          >
            <div className={cn(
              "mx-auto w-24 h-24 rounded-full flex items-center justify-center relative",
              config.bgColor
            )}>
              <motion.div
                animate={variant === 'loading' ? {
                  rotate: 360
                } : {}}
                transition={variant === 'loading' ? {
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                } : {}}
              >
                <IconComponent className={cn("w-12 h-12", config.color)} />
              </motion.div>

              {/* Pulse effect */}
              <motion.div
                className={cn(
                  "absolute inset-0 rounded-full border-2",
                  config.color.replace('text-', 'border-')
                )}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </motion.div>

          {/* Content */}
          <motion.div className="space-y-3" variants={itemVariants}>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            
            {description && (
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                {description}
              </p>
            )}
          </motion.div>

          {/* Custom children content */}
          {children && (
            <motion.div variants={itemVariants}>
              {children}
            </motion.div>
          )}

          {/* Actions */}
          {(actionLabel || secondaryActionLabel) && (
            <motion.div
              className="flex items-center justify-center gap-3 pt-4"
              variants={itemVariants}
            >
              {actionLabel && onAction && (
                <Button
                  onClick={onAction}
                  className="gap-2"
                  size="lg"
                >
                  <Plus className="w-4 h-4" />
                  {actionLabel}
                </Button>
              )}
              
              {secondaryActionLabel && onSecondaryAction && (
                <Button
                  variant="outline"
                  onClick={onSecondaryAction}
                  className="gap-2"
                  size="lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  {secondaryActionLabel}
                </Button>
              )}
            </motion.div>
          )}

          {/* Additional decorative elements */}
          <motion.div
            className="absolute top-8 left-8 w-3 h-3 bg-primary/30 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <motion.div
            className="absolute bottom-8 right-8 w-2 h-2 bg-secondary/40 rounded-full"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.8, 0.4]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
        </motion.div>
      </CardContent>
    </Card>
  )
}