'use client'

import { motion } from 'framer-motion'
import { Clock, Users, BarChart3, Calendar, MoreVertical, Play, Edit } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface CourseCardProps {
  id: string
  title: string
  description?: string
  thumbnail?: string
  progress?: number
  students?: number
  duration?: string
  sessions?: number
  status?: 'draft' | 'published' | 'archived' | 'generating'
  lastModified?: Date
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  className?: string
  compact?: boolean
  onClick?: (course: any) => void
  onEdit?: (course: any) => void
  onView?: () => void
  onDelete?: () => void
}

const statusColors = {
  draft: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  published: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  generating: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  intermediate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
}

export function CourseCard({
  id,
  title,
  description,
  thumbnail,
  progress = 0,
  students = 0,
  duration,
  sessions,
  status = 'draft',
  lastModified,
  difficulty,
  className,
  compact = false,
  onClick,
  onEdit,
  onView,
  onDelete
}: CourseCardProps) {
  // Format relative time
  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'just now'
  }

  // Create the course object to pass to callbacks
  const courseData = {
    id,
    title,
    description,
    difficulty,
    status,
    sessions: sessions ? Array(sessions).fill({}) : [],
    estimatedDuration: duration ? parseInt(duration.replace('h', '')) * 60 : 0,
    metadata: {
      studentCount: students
    },
    createdAt: new Date().toISOString(),
    updatedAt: lastModified?.toISOString() || new Date().toISOString(),
    userId: 'user-id'
  }

  const handleClick = (e: React.MouseEvent) => {
    if (onClick && !e.defaultPrevented) {
      onClick(courseData)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault()
      onClick(courseData)
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn("group cursor-pointer", className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Course: ${title}`}
    >
      <Card className={cn(
        "h-full overflow-hidden border-0 bg-white/50 backdrop-blur-sm dark:bg-gray-900/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300",
        compact && "p-3"
      )}>
        <CardHeader className={cn("p-0 relative", compact && "hidden")}>
          {thumbnail ? (
            <div className="h-48 w-full bg-gradient-to-br from-primary/20 to-secondary/20 relative overflow-hidden">
              <img 
                src={thumbnail} 
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="h-48 w-full bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center">
              <div className="text-6xl font-bold text-primary/30 select-none">
                {title ? title.charAt(0).toUpperCase() : '?'}
              </div>
            </div>
          )}
          
          {/* Status Badge */}
          <Badge 
            variant="secondary" 
            className={cn(
              "absolute top-3 left-3 text-xs font-medium",
              statusColors[status]
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-3 right-3 h-8 w-8 p-0 bg-white/80 hover:bg-white dark:bg-gray-900/80 dark:hover:bg-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                onClick={(e) => e.stopPropagation()}
                aria-label="More actions"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" role="menu">
              {onView && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  onView()
                }} className="cursor-pointer" role="menuitem">
                  <Play className="h-4 w-4 mr-2" />
                  View Course
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  onEdit(courseData)
                }} className="cursor-pointer" role="menuitem">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className="cursor-pointer text-red-600 dark:text-red-400"
                  role="menuitem"
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className={cn("p-6", compact && "p-3")} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-3">
            <div>
              <h3 className={cn(
                "font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-2",
                compact ? "text-sm" : "text-lg"
              )}>
                {title}
              </h3>
              {description && !compact && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {description}
                </p>
              )}
            </div>

            {/* Progress Bar */}
            {(status === 'generating' || progress > 0) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Progress</span>
                  <span className="text-primary font-medium">{progress}%</span>
                </div>
                <Progress 
                  value={progress} 
                  className="h-2" 
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            )}

            {/* Metadata */}
            {!compact && (
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              {duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{duration}</span>
                </div>
              )}
              {sessions !== undefined && (
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  <span>{sessions} {sessions === 1 ? 'session' : 'sessions'}</span>
                </div>
              )}
              {students > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{students} students</span>
                </div>
              )}
            </div>
            )}

            {/* Tags */}
            <div className="flex items-center gap-2">
              {difficulty && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    difficultyColors[difficulty]
                  )}
                >
                  {difficulty}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>

        {!compact && (
        <CardFooter className="px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="h-3 w-3" />
              {lastModified ? (
                <span>
                  Updated {getRelativeTime(lastModified)}
                </span>
              ) : (
                <span>No recent activity</span>
              )}
            </div>
            
            <motion.div
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              whileHover={{ scale: 1.05 }}
            >
              <Button size="sm" variant="ghost" className="text-primary">
                Open →
              </Button>
            </motion.div>
          </div>
        </CardFooter>
        )}
      </Card>
    </motion.article>
  )
}