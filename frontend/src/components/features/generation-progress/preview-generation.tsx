'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, 
  Clock, 
  Star, 
  PlayCircle, 
  FileText, 
  Users, 
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Target,
  Zap,
  Eye,
  Layout,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react'
import { PreviewSession, PreviewActivity } from '@/types'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface PreviewGenerationProps {
  sessions: PreviewSession[]
  className?: string
}

interface DevicePreviewProps {
  sessions: PreviewSession[]
  device: 'desktop' | 'tablet' | 'mobile'
  className?: string
}

const activityIcons = {
  lesson: BookOpen,
  exercise: Target,
  quiz: CheckCircle2,
  discussion: MessageSquare,
  assignment: FileText
}

const activityColors = {
  lesson: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  exercise: 'text-green-500 bg-green-500/10 border-green-500/20',
  quiz: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  discussion: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  assignment: 'text-red-500 bg-red-500/10 border-red-500/20'
}

const statusColors = {
  generating: 'text-yellow-500 bg-yellow-500/10',
  completed: 'text-green-500 bg-green-500/10',
  error: 'text-red-500 bg-red-500/10'
}

function QualityIndicator({ score }: { score?: number }) {
  if (score === undefined) return null

  const getQualityLevel = (score: number) => {
    if (score >= 85) return { label: 'Premium', color: 'text-green-500', bg: 'bg-green-500/10' }
    if (score >= 70) return { label: 'Good', color: 'text-blue-500', bg: 'bg-blue-500/10' }
    if (score >= 50) return { label: 'Fair', color: 'text-yellow-500', bg: 'bg-yellow-500/10' }
    return { label: 'Needs Work', color: 'text-red-500', bg: 'bg-red-500/10' }
  }

  const quality = getQualityLevel(score)

  return (
    <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs", quality.bg)}>
      <Star className={cn("h-3 w-3", quality.color)} />
      <span className={quality.color}>{quality.label}</span>
      <span className="text-muted-foreground">({score}%)</span>
    </div>
  )
}

function ActivityPreview({ activity, delay = 0 }: { 
  activity: PreviewActivity
  delay?: number 
}) {
  const IconComponent = activityIcons[activity.type] || BookOpen
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={cn(
        "border rounded-lg p-3 transition-all duration-200",
        activityColors[activity.type],
        activity.status === 'generating' && 'animate-pulse',
        activity.status === 'error' && 'border-red-500/50'
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <IconComponent className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{activity.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs h-5 px-2 capitalize", statusColors[activity.status])}
                >
                  {activity.status}
                </Badge>
                {activity.estimatedDuration && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {activity.estimatedDuration}min
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <QualityIndicator score={activity.qualityScore} />
            {activity.status === 'generating' && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        </div>

        {activity.content && (
          <div className="text-xs text-muted-foreground">
            <p className={cn("transition-all duration-200", isExpanded ? "" : "line-clamp-2")}>
              {activity.content}
            </p>
            {activity.content.length > 100 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 px-0 text-xs mt-1"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function SessionCard({ session, delay = 0 }: { 
  session: PreviewSession
  delay?: number 
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const completedActivities = session.activities.filter(a => a.status === 'completed').length
  const totalActivities = session.activities.length
  const progress = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay + (session.fadeInDelay || 0), duration: 0.6 }}
      className="group"
    >
      <Card className={cn(
        "transition-all duration-300 hover:shadow-lg",
        session.status === 'generating' && 'ring-2 ring-primary/20 shadow-primary/10',
        session.status === 'error' && 'border-red-500/50'
      )}>
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">{session.title}</h3>
                {session.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {session.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <QualityIndicator score={session.qualityScore} />
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", statusColors[session.status])}
                >
                  {session.status}
                </Badge>
              </div>
            </div>

            {/* Progress and Duration */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{session.duration || 'TBD'}min</span>
                </div>
                <div className="text-muted-foreground">
                  {completedActivities}/{totalActivities} activities
                </div>
              </div>
              
              <div className="text-muted-foreground">
                {Math.round(progress)}% complete
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  session.status === 'completed' ? 'bg-success' :
                  session.status === 'generating' ? 'bg-primary' :
                  session.status === 'error' ? 'bg-destructive' :
                  'bg-muted'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: delay + 0.3, duration: 0.8 }}
              />
            </div>
          </div>

          {/* Activities Preview */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 px-0 text-xs text-muted-foreground hover:text-foreground"
            >
              <Eye className="h-3 w-3 mr-1" />
              {isExpanded ? 'Hide' : 'Show'} activities ({session.activities.length})
            </Button>
            
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {session.activities.map((activity, index) => (
                    <ActivityPreview
                      key={activity.id}
                      activity={activity}
                      delay={index * 0.1}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

function DevicePreview({ sessions, device, className }: DevicePreviewProps) {
  const deviceDimensions = {
    desktop: 'w-full max-w-4xl mx-auto',
    tablet: 'w-full max-w-2xl mx-auto',
    mobile: 'w-full max-w-sm mx-auto'
  }

  const deviceIcons = {
    desktop: Monitor,
    tablet: Tablet,
    mobile: Smartphone
  }

  const IconComponent = deviceIcons[device]

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <IconComponent className="h-4 w-4" />
        <span className="capitalize">{device} Preview</span>
      </div>
      
      <div className={cn(
        "border-2 border-dashed border-muted/50 rounded-lg p-4",
        deviceDimensions[device]
      )}>
        <div className="space-y-4">
          {sessions.map((session, index) => (
            <SessionCard
              key={session.id}
              session={session}
              delay={index * 0.2}
            />
          ))}
          
          {sessions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sessions generated yet</p>
              <p className="text-xs mt-1">Content will appear here as it's generated</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function PreviewGeneration({ sessions, className }: PreviewGenerationProps) {
  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [showOnlyCompleted, setShowOnlyCompleted] = useState(false)

  const filteredSessions = useMemo(() => {
    return showOnlyCompleted ? 
      sessions.filter(s => s.status === 'completed') : 
      sessions
  }, [sessions, showOnlyCompleted])

  const stats = useMemo(() => {
    const total = sessions.length
    const completed = sessions.filter(s => s.status === 'completed').length
    const generating = sessions.filter(s => s.status === 'generating').length
    const errors = sessions.filter(s => s.status === 'error').length
    const totalActivities = sessions.reduce((sum, s) => sum + s.activities.length, 0)
    const avgQuality = sessions.length > 0 ? 
      sessions.reduce((sum, s) => sum + (s.qualityScore || 0), 0) / sessions.length : 0

    return { total, completed, generating, errors, totalActivities, avgQuality }
  }, [sessions])

  const devices = [
    { id: 'desktop' as const, label: 'Desktop', icon: Monitor },
    { id: 'tablet' as const, label: 'Tablet', icon: Tablet },
    { id: 'mobile' as const, label: 'Mobile', icon: Smartphone }
  ]

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with stats */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              <h3 className="font-semibold">Live Preview</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={showOnlyCompleted ? "default" : "outline"}
                onClick={() => setShowOnlyCompleted(!showOnlyCompleted)}
                className="h-8"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed Only
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-success">{stats.completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-500">{stats.generating}</div>
              <div className="text-xs text-muted-foreground">Generating</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-500">{stats.errors}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-500">{stats.totalActivities}</div>
              <div className="text-xs text-muted-foreground">Activities</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-500">
                {Math.round(stats.avgQuality)}%
              </div>
              <div className="text-xs text-muted-foreground">Avg Quality</div>
            </div>
          </div>

          {/* Device Selector */}
          <div className="flex justify-center">
            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
              {devices.map(device => {
                const IconComponent = device.icon
                return (
                  <Button
                    key={device.id}
                    size="sm"
                    variant={selectedDevice === device.id ? "default" : "ghost"}
                    onClick={() => setSelectedDevice(device.id)}
                    className="h-8 px-3"
                  >
                    <IconComponent className="h-3 w-3 mr-1" />
                    {device.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Device Preview */}
      <DevicePreview
        sessions={filteredSessions}
        device={selectedDevice}
      />

      {/* Generation Tips */}
      {stats.generating > 0 && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                Content Generation in Progress
              </h4>
              <div className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
                <p>• Sessions will appear and update in real-time as they're generated</p>
                <p>• Quality scores improve as AI refines the content</p>
                <p>• You can preview content on different devices while generation continues</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Success Celebration */}
      <AnimatePresence>
        {stats.total > 0 && stats.completed === stats.total && stats.errors === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center py-8"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                repeatType: 'reverse'
              }}
              className="text-6xl mb-4"
            >
              🎉
            </motion.div>
            <h3 className="text-xl font-bold text-success mb-2">
              Preview Complete!
            </h3>
            <p className="text-muted-foreground">
              All {stats.total} sessions have been successfully generated with an average quality of {Math.round(stats.avgQuality)}%
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}