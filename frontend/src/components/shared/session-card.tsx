'use client'

import { motion } from 'framer-motion'
import { Clock, CheckCircle, Circle, PlayCircle, BookOpen, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface SessionCardProps {
  id: string
  title: string
  description?: string
  duration?: number // in minutes
  activities?: number
  participants?: number
  progress?: number // 0-100
  status?: 'not-started' | 'in-progress' | 'completed'
  type?: 'lesson' | 'exercise' | 'quiz' | 'discussion' | 'assignment'
  isActive?: boolean
  className?: string
  onClick?: () => void
}

const statusConfig = {
  'not-started': {
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/50'
  },
  'in-progress': {
    icon: PlayCircle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20'
  },
  'completed': {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20'
  }
}

const typeConfig = {
  lesson: {
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    label: 'Lesson'
  },
  exercise: {
    icon: Users,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    label: 'Exercise'
  },
  quiz: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    label: 'Quiz'
  },
  discussion: {
    icon: Users,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
    label: 'Discussion'
  },
  assignment: {
    icon: BookOpen,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    label: 'Assignment'
  }
}

export function SessionCard({
  id,
  title,
  description,
  duration,
  activities,
  participants,
  progress = 0,
  status = 'not-started',
  type = 'lesson',
  isActive = false,
  className,
  onClick
}: SessionCardProps) {
  const StatusIcon = statusConfig[status].icon
  const TypeIcon = typeConfig[type].icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn("cursor-pointer", className)}
    >
      <Card 
        className={cn(
          "relative overflow-hidden border transition-all duration-300",
          isActive 
            ? "border-primary shadow-lg shadow-primary/20 bg-primary/5" 
            : "border-gray-200 dark:border-gray-800 hover:border-primary/50 hover:shadow-md",
          statusConfig[status].bgColor
        )}
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  className={cn(
                    "p-2 rounded-lg",
                    isActive ? "bg-primary/20" : "bg-gray-100 dark:bg-gray-800"
                  )}
                  whileHover={{ rotate: 5 }}
                >
                  <TypeIcon className={cn(
                    "h-5 w-5",
                    isActive ? "text-primary" : "text-gray-600 dark:text-gray-400"
                  )} />
                </motion.div>
                
                <div>
                  <h3 className={cn(
                    "font-semibold text-lg",
                    isActive 
                      ? "text-primary" 
                      : "text-gray-900 dark:text-gray-100"
                  )}>
                    {title}
                  </h3>
                  {description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusIcon className={cn("h-5 w-5", statusConfig[status].color)} />
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", typeConfig[type].color)}
                >
                  {typeConfig[type].label}
                </Badge>
              </div>
            </div>

            {/* Progress */}
            {status !== 'not-started' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Progress</span>
                  <span className={cn(
                    "font-medium",
                    status === 'completed' ? "text-green-600" : "text-primary"
                  )}>
                    {progress}%
                  </span>
                </div>
                <Progress 
                  value={progress} 
                  className="h-2"
                />
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                {duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{duration} min</span>
                  </div>
                )}
                {activities && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{activities} activities</span>
                  </div>
                )}
                {participants && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{participants} enrolled</span>
                  </div>
                )}
              </div>

              {isActive && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-primary text-sm font-medium"
                >
                  Current Session
                </motion.div>
              )}
            </div>

            {/* Status indicator line */}
            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-current to-transparent opacity-20" />
            
            {/* Hover effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0"
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}