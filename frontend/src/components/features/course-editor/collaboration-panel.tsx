'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  MessageSquare,
  Send,
  Smile,
  Paperclip,
  MoreHorizontal,
  UserCircle,
  Clock,
  Dot,
  Reply,
  Trash2,
  Edit,
  Pin,
  Eye,
  EyeOff,
  AtSign
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface CollaborationPanelProps {
  courseId: string
  selectedSession: string | null
  selectedActivity: string | null
}

interface Comment {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar?: string
    color: string
  }
  timestamp: Date
  sessionId?: string
  activityId?: string
  position?: { x: number, y: number }
  replies?: Comment[]
  isPinned?: boolean
  isResolved?: boolean
}

interface Collaborator {
  id: string
  name: string
  email: string
  avatar?: string
  color: string
  status: 'online' | 'away' | 'offline'
  lastSeen?: Date
  cursor?: { x: number, y: number, sessionId?: string, activityId?: string }
}

const mockCollaborators: Collaborator[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    color: 'bg-purple-500',
    status: 'online',
    cursor: { x: 100, y: 200 }
  },
  {
    id: '2',
    name: 'Mike Chen',
    email: 'mike@example.com',
    color: 'bg-blue-500',
    status: 'online',
    lastSeen: new Date(Date.now() - 5 * 60 * 1000)
  },
  {
    id: '3',
    name: 'Emma Wilson',
    email: 'emma@example.com',
    color: 'bg-green-500',
    status: 'away',
    lastSeen: new Date(Date.now() - 30 * 60 * 1000)
  }
]

const mockComments: Comment[] = [
  {
    id: '1',
    content: 'This section could use more examples. What do you think about adding a practical scenario?',
    author: {
      id: '1',
      name: 'Sarah Johnson',
      color: 'bg-purple-500'
    },
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    sessionId: 'session-1',
    replies: [
      {
        id: '1-1',
        content: 'Great idea! I\'ll add a real-world example with code samples.',
        author: {
          id: '2',
          name: 'Mike Chen',
          color: 'bg-blue-500'
        },
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
      }
    ]
  },
  {
    id: '2',
    content: 'The introduction looks good, but maybe we should make it more engaging?',
    author: {
      id: '3',
      name: 'Emma Wilson',
      color: 'bg-green-500'
    },
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    sessionId: 'session-1',
    isPinned: true
  }
]

export function CollaborationPanel({
  courseId,
  selectedSession,
  selectedActivity
}: CollaborationPanelProps) {
  const [activeTab, setActiveTab] = useState('comments')
  const [comments, setComments] = useState<Comment[]>(mockComments)
  const [collaborators, setCollaborators] = useState<Collaborator[]>(mockCollaborators)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [comments])

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const addComment = () => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: Date.now().toString(),
      content: newComment,
      author: {
        id: 'current-user',
        name: 'You',
        color: 'bg-gray-500'
      },
      timestamp: new Date(),
      sessionId: selectedSession || undefined,
      activityId: selectedActivity || undefined
    }

    if (replyingTo) {
      setComments(prev => 
        prev.map(c => 
          c.id === replyingTo 
            ? { ...c, replies: [...(c.replies || []), comment] }
            : c
        )
      )
      setReplyingTo(null)
    } else {
      setComments(prev => [...prev, comment])
    }

    setNewComment('')
  }

  const togglePin = (commentId: string) => {
    setComments(prev => 
      prev.map(c => 
        c.id === commentId 
          ? { ...c, isPinned: !c.isPinned }
          : c
      )
    )
  }

  const toggleResolve = (commentId: string) => {
    setComments(prev => 
      prev.map(c => 
        c.id === commentId 
          ? { ...c, isResolved: !c.isResolved }
          : c
      )
    )
  }

  const renderComment = (comment: Comment, isReply = false) => (
    <motion.div
      key={comment.id}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "space-y-2",
        isReply && "ml-8 border-l-2 border-gray-200 pl-4",
        comment.isResolved && "opacity-60"
      )}
    >
      <div className={cn(
        "p-3 rounded-lg border transition-all duration-200",
        comment.isPinned && "border-yellow-200 bg-yellow-50",
        comment.isResolved && "border-green-200 bg-green-50"
      )}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={comment.author.avatar} />
              <AvatarFallback className={cn("text-xs text-white", comment.author.color)}>
                {comment.author.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-gray-900">
              {comment.author.name}
            </span>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(comment.timestamp)}
            </span>
            {comment.isPinned && (
              <Pin className="h-3 w-3 text-yellow-600" />
            )}
            {comment.isResolved && (
              <Badge variant="secondary" className="text-xs">
                Resolved
              </Badge>
            )}
          </div>

          {!isReply && (
            <div className="flex items-center space-x-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePin(comment.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Pin className={cn(
                        "h-3 w-3",
                        comment.isPinned ? "text-yellow-600" : "text-gray-400"
                      )} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {comment.isPinned ? 'Unpin' : 'Pin'} comment
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleResolve(comment.id)}
                      className="h-6 w-6 p-0"
                    >
                      {comment.isResolved ? (
                        <EyeOff className="h-3 w-3 text-green-600" />
                      ) : (
                        <Eye className="h-3 w-3 text-gray-400" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {comment.isResolved ? 'Unresolve' : 'Resolve'} comment
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
          )}
        </div>

        <p className="text-sm text-gray-700 mb-2">
          {comment.content}
        </p>

        {!isReply && (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="h-6 px-2 text-xs text-gray-500"
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          </div>
        )}

        {replyingTo === comment.id && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-gray-200"
          >
            <div className="flex space-x-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    addComment()
                  }
                }}
              />
              <Button size="sm" onClick={addComment}>
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </motion.div>
  )

  const renderCollaborator = (collaborator: Collaborator) => (
    <motion.div
      key={collaborator.id}
      layout
      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={collaborator.avatar} />
            <AvatarFallback className={cn("text-sm text-white", collaborator.color)}>
              {collaborator.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
            collaborator.status === 'online' && "bg-green-500",
            collaborator.status === 'away' && "bg-yellow-500",
            collaborator.status === 'offline' && "bg-gray-400"
          )} />
        </div>
        
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {collaborator.name}
          </p>
          <p className="text-xs text-gray-500">
            {collaborator.status === 'online' ? 'Online' : 
             collaborator.status === 'away' ? 'Away' : 
             collaborator.lastSeen ? `Last seen ${formatRelativeTime(collaborator.lastSeen)}` : 'Offline'}
          </p>
        </div>
      </div>

      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </motion.div>
  )

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comments" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Comments
              {comments.filter(c => !c.isResolved).length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {comments.filter(c => !c.isResolved).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="collaborators" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Team
              <Badge variant="secondary" className="ml-1 text-xs">
                {collaborators.filter(c => c.status === 'online').length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="comments" className="flex-1 flex flex-col mt-0">
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      No comments yet. Start a conversation!
                    </p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {comments.map(comment => renderComment(comment))}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Comment Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    addComment()
                  }
                }}
              />
              <Button size="sm" onClick={addComment} disabled={!newComment.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="collaborators" className="flex-1 flex flex-col mt-0">
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-900">
                    Online ({collaborators.filter(c => c.status === 'online').length})
                  </h3>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    Invite
                  </Button>
                </div>

                {collaborators
                  .filter(c => c.status === 'online')
                  .map(renderCollaborator)}

                {collaborators.filter(c => c.status !== 'online').length > 0 && (
                  <>
                    <div className="pt-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">
                        Offline ({collaborators.filter(c => c.status !== 'online').length})
                      </h3>
                    </div>

                    {collaborators
                      .filter(c => c.status !== 'online')
                      .map(renderCollaborator)}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}