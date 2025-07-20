/**
 * Activity Feed Component
 * Live activity stream with filtering and time grouping
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useActivityFeed } from '@/lib/collaboration/hooks'
import { ActivityEvent } from '@/lib/websocket/client'
import { cn, formatRelativeTime, formatSmartDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Activity,
  BookOpen,
  Plus,
  Edit3,
  MessageSquare,
  Download,
  Users,
  Settings,
  Filter,
  Clock,
  Sparkles,
  FileText,
  PlayCircle,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw
} from 'lucide-react'

// Activity type configurations
const activityConfig = {
  course_created: {
    icon: Plus,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950',
    label: 'Course Created',
    description: (activity: ActivityEvent) => `Created course "${activity.courseName}"`
  },
  course_updated: {
    icon: Edit3,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    label: 'Course Updated',
    description: (activity: ActivityEvent) => `Updated course "${activity.courseName}"`
  },
  session_added: {
    icon: BookOpen,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    label: 'Session Added',
    description: (activity: ActivityEvent) => `Added session "${activity.target?.name}" to ${activity.courseName}`
  },
  activity_created: {
    icon: PlayCircle,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950',
    label: 'Activity Created',
    description: (activity: ActivityEvent) => `Created activity "${activity.target?.name}"`
  },
  user_joined: {
    icon: Users,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950',
    label: 'User Joined',
    description: (activity: ActivityEvent) => `Joined the course`
  },
  comment_added: {
    icon: MessageSquare,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    label: 'Comment Added',
    description: (activity: ActivityEvent) => `Added a comment`
  },
  export_completed: {
    icon: Download,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    label: 'Export Completed',
    description: (activity: ActivityEvent) => `Exported course "${activity.courseName}"`
  },
  generation_started: {
    icon: Sparkles,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    label: 'Generation Started',
    description: (activity: ActivityEvent) => `Started generating course content`
  }
}

interface ActivityItemProps {
  activity: ActivityEvent
  showCourse?: boolean
  compact?: boolean
}

function ActivityItem({ activity, showCourse = true, compact = false }: ActivityItemProps) {
  const config = activityConfig[activity.type] || {
    icon: Activity,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-950',
    label: 'Activity',
    description: () => 'Unknown activity'
  }

  const Icon = config.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group relative"
    >
      <div className={cn(
        "flex items-start gap-3",
        compact ? "py-2" : "py-3"
      )}>
        {/* Avatar and icon */}
        <div className="relative flex-shrink-0">
          <Avatar className={cn(
            compact ? "h-6 w-6" : "h-8 w-8"
          )}>
            <AvatarImage src={activity.userAvatar} alt={activity.userName} />
            <AvatarFallback className="text-xs">
              {activity.userName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Activity type icon */}
          <div className={cn(
            "absolute -bottom-1 -right-1 rounded-full border-2 border-background flex items-center justify-center",
            config.bgColor,
            compact ? "h-4 w-4" : "h-5 w-5"
          )}>
            <Icon className={cn(
              config.color,
              compact ? "h-2 w-2" : "h-3 w-3"
            )} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium",
                compact ? "text-xs" : "text-sm"
              )}>
                {activity.userName}
                <span className="font-normal text-muted-foreground ml-1">
                  {config.description(activity)}
                </span>
              </p>
              
              {showCourse && activity.courseName && (
                <p className={cn(
                  "text-muted-foreground truncate",
                  compact ? "text-xs" : "text-xs"
                )}>
                  in {activity.courseName}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  compact && "text-xs px-1.5 py-0.5"
                )}
              >
                {config.label}
              </Badge>
              
              <span className={cn(
                "text-muted-foreground whitespace-nowrap",
                compact ? "text-xs" : "text-xs"
              )}>
                {formatRelativeTime(activity.timestamp)}
              </span>
            </div>
          </div>

          {/* Metadata */}
          {activity.metadata && !compact && (
            <div className="mt-2 text-xs text-muted-foreground">
              {Object.entries(activity.metadata).map(([key, value]) => (
                <span key={key} className="mr-3">
                  {key}: {value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute right-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              <Settings className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <FileText className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {activity.courseId && (
              <DropdownMenuItem>
                <BookOpen className="h-4 w-4 mr-2" />
                Go to Course
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Hide Activity
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  )
}

interface ActivityGroupProps {
  date: string
  activities: ActivityEvent[]
  showCourse?: boolean
  compact?: boolean
}

function ActivityGroup({ date, activities, showCourse, compact }: ActivityGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="space-y-2">
      {/* Date header */}
      <div className="flex items-center gap-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs font-medium text-muted-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {formatSmartDate(new Date(date))}
          <span className="ml-2">({activities.length})</span>
        </Button>
        <Separator className="flex-1" />
      </div>

      {/* Activities */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                showCourse={showCourse}
                compact={compact}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ActivityFeedProps {
  courseId?: string
  className?: string
  maxItems?: number
  compact?: boolean
  showHeader?: boolean
  showFilters?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

export function ActivityFeed({
  courseId,
  className,
  maxItems = 100,
  compact = false,
  showHeader = true,
  showFilters = true,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: ActivityFeedProps) {
  const { 
    activities, 
    groupedActivities, 
    filters, 
    updateFilters, 
    totalCount 
  } = useActivityFeed(courseId)

  const [isRefreshing, setIsRefreshing] = useState(false)

  // Activity type options for filtering
  const activityTypes = useMemo(() => 
    Object.keys(activityConfig).map(type => ({
      value: type,
      label: activityConfig[type as keyof typeof activityConfig].label
    })), []
  )

  // User options for filtering
  const users = useMemo(() => {
    const uniqueUsers = new Map()
    activities.forEach(activity => {
      if (!uniqueUsers.has(activity.userId)) {
        uniqueUsers.set(activity.userId, {
          id: activity.userId,
          name: activity.userName,
          avatar: activity.userAvatar
        })
      }
    })
    return Array.from(uniqueUsers.values())
  }, [activities])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Add refresh logic here
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  // Auto-refresh
  React.useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(handleRefresh, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  const displayedActivities = activities.slice(0, maxItems)
  const hasMore = activities.length > maxItems

  return (
    <Card className={cn("flex flex-col", className)}>
      {showHeader && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <h3 className="font-semibold">
                {courseId ? 'Course Activity' : 'Activity Feed'}
              </h3>
              {totalCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {totalCount}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Refresh button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn(
                  "h-4 w-4",
                  isRefreshing && "animate-spin"
                )} />
              </Button>

              {/* Filters */}
              {showFilters && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Filter Activities</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Time range filter */}
                    <div className="p-2">
                      <label className="text-xs font-medium">Time Range</label>
                      <Select
                        value={filters.timeRange}
                        onValueChange={(value: any) => 
                          updateFilters({ timeRange: value })
                        }
                      >
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hour">Last hour</SelectItem>
                          <SelectItem value="day">Last 24 hours</SelectItem>
                          <SelectItem value="week">Last week</SelectItem>
                          <SelectItem value="month">Last month</SelectItem>
                          <SelectItem value="all">All time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <DropdownMenuSeparator />

                    {/* Activity types filter */}
                    <DropdownMenuLabel>Activity Types</DropdownMenuLabel>
                    {activityTypes.map(type => (
                      <DropdownMenuCheckboxItem
                        key={type.value}
                        checked={filters.types.includes(type.value)}
                        onCheckedChange={(checked) => {
                          const newTypes = checked
                            ? [...filters.types, type.value]
                            : filters.types.filter(t => t !== type.value)
                          updateFilters({ types: newTypes })
                        }}
                      >
                        {type.label}
                      </DropdownMenuCheckboxItem>
                    ))}

                    <DropdownMenuSeparator />

                    {/* Users filter */}
                    <DropdownMenuLabel>Users</DropdownMenuLabel>
                    {users.slice(0, 10).map(user => (
                      <DropdownMenuCheckboxItem
                        key={user.id}
                        checked={filters.users.includes(user.id)}
                        onCheckedChange={(checked) => {
                          const newUsers = checked
                            ? [...filters.users, user.id]
                            : filters.users.filter(u => u !== user.id)
                          updateFilters({ users: newUsers })
                        }}
                      >
                        {user.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Active filters */}
          {(filters.types.length > 0 || filters.users.length > 0 || filters.timeRange !== 'day') && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-muted-foreground">Filters:</span>
              
              {filters.timeRange !== 'day' && (
                <Badge variant="outline" className="text-xs">
                  {filters.timeRange}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => updateFilters({ timeRange: 'day' })}
                  >
                    ×
                  </Button>
                </Badge>
              )}

              {filters.types.map(type => (
                <Badge key={type} variant="outline" className="text-xs">
                  {activityConfig[type as keyof typeof activityConfig]?.label || type}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => updateFilters({ 
                      types: filters.types.filter(t => t !== type)
                    })}
                  >
                    ×
                  </Button>
                </Badge>
              ))}

              {filters.types.length > 0 || filters.users.length > 0 || filters.timeRange !== 'day' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => updateFilters({ 
                    types: [], 
                    users: [], 
                    timeRange: 'day' 
                  })}
                >
                  Clear all
                </Button>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Activity list */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {displayedActivities.length > 0 ? (
            <div className="space-y-4">
              {groupedActivities.map(({ date, activities }) => (
                <ActivityGroup
                  key={date}
                  date={date}
                  activities={activities}
                  showCourse={!courseId}
                  compact={compact}
                />
              ))}

              {hasMore && (
                <div className="text-center py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Load more activities
                    }}
                  >
                    Load more activities
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activity to show</p>
              <p className="text-xs">
                {filters.types.length > 0 || filters.users.length > 0
                  ? "Try adjusting your filters"
                  : "Activity will appear here as users interact with courses"
                }
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}

export default ActivityFeed