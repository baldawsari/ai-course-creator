'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  RotateCcw,
  GitBranch,
  Clock,
  User,
  FileText,
  Plus,
  Minus,
  Eye,
  Download,
  MoreHorizontal,
  Calendar,
  Tag,
  Bookmark,
  Star
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface VersionHistoryProps {
  courseId: string
  onRestoreVersion: (version: CourseVersion) => void
}

interface CourseVersion {
  id: string
  title: string
  description?: string
  timestamp: Date
  author: {
    id: string
    name: string
    avatar?: string
    color: string
  }
  changes: VersionChange[]
  isStarred?: boolean
  isMajor?: boolean
  tags?: string[]
  size: number
}

interface VersionChange {
  type: 'added' | 'modified' | 'deleted'
  section: 'session' | 'activity' | 'content'
  title: string
  details?: string
}

const mockVersions: CourseVersion[] = [
  {
    id: '1',
    title: 'Added interactive quiz section',
    description: 'Enhanced Session 3 with multiple-choice questions and instant feedback',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    author: {
      id: '1',
      name: 'Sarah Johnson',
      color: 'bg-purple-500'
    },
    changes: [
      {
        type: 'added',
        section: 'activity',
        title: 'Interactive Quiz: JavaScript Fundamentals',
        details: '5 questions with explanations'
      },
      {
        type: 'modified',
        section: 'content',
        title: 'Session 3: Functions and Scope',
        details: 'Added quiz integration'
      }
    ],
    isStarred: true,
    isMajor: true,
    tags: ['quiz', 'interactive'],
    size: 2048
  },
  {
    id: '2',
    title: 'Content improvements and examples',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    author: {
      id: '2',
      name: 'Mike Chen',
      color: 'bg-blue-500'
    },
    changes: [
      {
        type: 'modified',
        section: 'content',
        title: 'Session 1: Introduction',
        details: 'Added real-world examples'
      },
      {
        type: 'modified',
        section: 'content',
        title: 'Session 2: Variables and Data Types',
        details: 'Improved code examples'
      }
    ],
    size: 1536
  },
  {
    id: '3',
    title: 'Initial course structure',
    description: 'Created the basic course outline with 5 sessions',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    author: {
      id: '1',
      name: 'Sarah Johnson',
      color: 'bg-purple-500'
    },
    changes: [
      {
        type: 'added',
        section: 'session',
        title: 'Session 1: Introduction to JavaScript'
      },
      {
        type: 'added',
        section: 'session',
        title: 'Session 2: Variables and Data Types'
      },
      {
        type: 'added',
        section: 'session',
        title: 'Session 3: Functions and Scope'
      },
      {
        type: 'added',
        section: 'session',
        title: 'Session 4: Objects and Arrays'
      },
      {
        type: 'added',
        section: 'session',
        title: 'Session 5: DOM Manipulation'
      }
    ],
    isMajor: true,
    tags: ['initial', 'structure'],
    size: 4096
  }
]

export function VersionHistory({
  courseId,
  onRestoreVersion
}: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<CourseVersion | null>(null)
  const [showDiff, setShowDiff] = useState(false)

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getChangeIcon = (type: VersionChange['type']) => {
    switch (type) {
      case 'added':
        return <Plus className="h-3 w-3 text-green-600" />
      case 'deleted':
        return <Minus className="h-3 w-3 text-red-600" />
      case 'modified':
        return <FileText className="h-3 w-3 text-blue-600" />
      default:
        return <FileText className="h-3 w-3 text-gray-600" />
    }
  }

  const getChangeColor = (type: VersionChange['type']) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 border-green-200'
      case 'deleted':
        return 'bg-red-50 border-red-200'
      case 'modified':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const toggleStar = (versionId: string) => {
    // Toggle star status for version
    console.log('Toggle star for version:', versionId)
  }

  const renderVersionCard = (version: CourseVersion) => (
    <motion.div
      key={version.id}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn(
        "p-4 transition-all duration-200 hover:shadow-md cursor-pointer",
        selectedVersion?.id === version.id && "ring-2 ring-purple-500 border-purple-200"
      )}>
        <div className="space-y-3">
          {/* Version Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <Avatar className="h-8 w-8 mt-0.5">
                <AvatarImage src={version.author.avatar} />
                <AvatarFallback className={cn("text-sm text-white", version.author.color)}>
                  {version.author.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {version.title}
                  </h4>
                  {version.isMajor && (
                    <Badge variant="secondary" className="text-xs">
                      Major
                    </Badge>
                  )}
                  {version.isStarred && (
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  )}
                </div>
                
                {version.description && (
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {version.description}
                  </p>
                )}
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {version.author.name}
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatRelativeTime(version.timestamp)}
                  </span>
                  <span className="flex items-center">
                    <FileText className="h-3 w-3 mr-1" />
                    {formatFileSize(version.size)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1 ml-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleStar(version.id)
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Star className={cn(
                        "h-3 w-3",
                        version.isStarred ? "text-yellow-500 fill-current" : "text-gray-400"
                      )} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {version.isStarred ? 'Remove star' : 'Star version'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <MoreHorizontal className="h-3 w-3 text-gray-400" />
              </Button>
            </div>
          </div>

          {/* Tags */}
          {version.tags && version.tags.length > 0 && (
            <div className="flex items-center space-x-1">
              {version.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="h-2 w-2 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Changes Summary */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <GitBranch className="h-3 w-3" />
              <span>{version.changes.length} change{version.changes.length !== 1 ? 's' : ''}</span>
            </div>
            
            <div className="space-y-1">
              {version.changes.slice(0, 3).map((change, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-2 rounded border text-xs",
                    getChangeColor(change.type)
                  )}
                >
                  <div className="flex items-center space-x-2">
                    {getChangeIcon(change.type)}
                    <span className="font-medium capitalize">{change.type}</span>
                    <span className="text-gray-600">•</span>
                    <span className="flex-1 truncate">{change.title}</span>
                  </div>
                  {change.details && (
                    <p className="text-gray-600 mt-1 ml-5 truncate">
                      {change.details}
                    </p>
                  )}
                </div>
              ))}
              
              {version.changes.length > 3 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{version.changes.length - 3} more change{version.changes.length - 3 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-3 text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Version Preview</DialogTitle>
                    <DialogDescription>
                      {version.title} • {formatRelativeTime(version.timestamp)}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-96 overflow-y-auto">
                    {/* Version preview content would go here */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Version preview would show the course content at this point in time.
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="ghost" size="sm" className="h-7 px-3 text-xs">
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>

            <Button
              size="sm"
              onClick={() => onRestoreVersion(version)}
              className="h-7 px-3 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Restore
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            Version History
          </h3>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="h-7 px-3 text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              Filter
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-3 text-xs">
              <Bookmark className="h-3 w-3 mr-1" />
              Bookmarks
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {mockVersions.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  No version history yet.
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {mockVersions.map(renderVersionCard)}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}