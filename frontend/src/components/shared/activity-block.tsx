'use client'

import { motion } from 'framer-motion'
import { 
  BookOpen, 
  PenTool, 
  MessageSquare, 
  CheckCircle, 
  Play, 
  Clock,
  Users,
  Star,
  MoreVertical,
  Edit,
  Copy,
  Trash2
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ActivityBlockProps {
  id: string
  title: string
  description?: string
  type: 'lesson' | 'exercise' | 'quiz' | 'discussion' | 'assignment' | 'project'
  duration?: number // in minutes
  points?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  isCompleted?: boolean
  isLocked?: boolean
  participants?: number
  rating?: number
  className?: string
  onStart?: () => void
  onEdit?: () => void
  onCopy?: () => void
  onDelete?: () => void
}

const typeConfig = {
  lesson: {
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/10',
    label: 'Lesson'
  },
  exercise: {
    icon: PenTool,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/10',
    label: 'Exercise'
  },
  quiz: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/10',
    label: 'Quiz'
  },
  discussion: {
    icon: MessageSquare,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/10',
    label: 'Discussion'
  },
  assignment: {
    icon: PenTool,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/10',
    label: 'Assignment'
  },
  project: {
    icon: BookOpen,
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/10',
    label: 'Project'
  }
}

const difficultyConfig = {
  easy: {
    color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    dots: 1
  },
  medium: {
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    dots: 2
  },
  hard: {
    color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    dots: 3
  }
}

export function ActivityBlock({
  id,
  title,
  description,
  type,
  duration,
  points,
  difficulty,
  isCompleted = false,
  isLocked = false,
  participants,
  rating,
  className,
  onStart,
  onEdit,
  onCopy,
  onDelete
}: ActivityBlockProps) {
  const config = typeConfig[type]
  const TypeIcon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -2,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      }}
      className={cn("group relative", className)}
    >
      <Card className={cn(
        "border transition-all duration-300 overflow-hidden",
        isCompleted 
          ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10" 
          : isLocked
          ? "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 opacity-60"
          : "border-gray-200 dark:border-gray-800 hover:border-primary/50 hover:shadow-md bg-white dark:bg-gray-900"
      )}>
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className={cn(
                  "p-2 rounded-lg",
                  isCompleted ? "bg-green-100 dark:bg-green-900/30" : config.bgColor
                )}
                whileHover={{ scale: 1.05 }}
              >
                <TypeIcon className={cn(
                  "h-5 w-5",
                  isCompleted ? "text-green-600 dark:text-green-400" : config.color.split(' ')[1]
                )} />
              </motion.div>
              
              <div className="space-y-1">
                <h3 className={cn(
                  "font-semibold text-lg",
                  isLocked ? "text-gray-400" : "text-gray-900 dark:text-gray-100"
                )}>
                  {title}
                </h3>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-xs", config.color)}>
                    {config.label}
                  </Badge>
                  
                  {difficulty && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", difficultyConfig[difficulty].color)}
                    >
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-1 h-1 rounded-full",
                              i < difficultyConfig[difficulty].dots 
                                ? "bg-current" 
                                : "bg-current opacity-30"
                            )}
                          />
                        ))}
                        <span className="ml-1">{difficulty}</span>
                      </div>
                    </Badge>
                  )}

                  {isCompleted && (
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Menu */}
            {!isLocked && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onStart && (
                    <DropdownMenuItem onClick={onStart} className="cursor-pointer">
                      <Play className="h-4 w-4 mr-2" />
                      {isCompleted ? 'Review' : 'Start'}
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onCopy && (
                    <DropdownMenuItem onClick={onCopy} className="cursor-pointer">
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={onDelete} 
                      className="cursor-pointer text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Description */}
          {description && (
            <p className={cn(
              "text-sm mb-4",
              isLocked ? "text-gray-400" : "text-gray-600 dark:text-gray-400"
            )}>
              {description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              {duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{duration} min</span>
                </div>
              )}
              
              {participants && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{participants}</span>
                </div>
              )}

              {rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-current text-amber-500" />
                  <span>{rating.toFixed(1)}</span>
                </div>
              )}

              {points && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">{points} pts</span>
                </div>
              )}
            </div>

            {/* Start Button */}
            {onStart && !isLocked && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <Button
                  variant={isCompleted ? "outline" : "default"}
                  size="sm"
                  onClick={onStart}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  {isCompleted ? 'Review' : 'Start'}
                </Button>
              </motion.div>
            )}

            {isLocked && (
              <Badge variant="outline" className="text-xs text-gray-400">
                Locked
              </Badge>
            )}
          </div>

          {/* Progress indicator for completed activities */}
          {isCompleted && (
            <motion.div
              className="absolute left-0 top-0 h-full w-1 bg-green-500"
              initial={{ height: 0 }}
              animate={{ height: '100%' }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          )}

          {/* Hover effect overlay */}
          {!isLocked && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0"
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}