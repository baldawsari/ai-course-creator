/**
 * Collaborative Editor Component
 * Real-time collaborative text editing with live cursors and conflict resolution
 */

'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollaborativeEditor, useCourseCollaboration } from '@/lib/collaboration/hooks'
import { CursorPosition } from '@/lib/websocket/client'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Users, Eye, Edit3, MessageSquare, AlertTriangle } from 'lucide-react'

interface CollaborativeEditorProps {
  courseId: string
  sessionId?: string
  activityId?: string
  content: string
  onChange: (content: string) => void
  onSelectionChange?: (selection: any) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showPresence?: boolean
  showConflicts?: boolean
}

// Live cursor component
function LiveCursor({ cursor, className }: { cursor: CursorPosition; className?: string }) {
  const { users } = useCourseCollaboration('')
  const user = users.find(u => u.id === cursor.userId)

  if (!user) return null

  return (
    <motion.div
      className={cn('absolute pointer-events-none z-50', className)}
      style={{ 
        left: `${cursor.position.column * 8}px`, // Approximate character width
        top: `${cursor.position.line * 24}px`,   // Approximate line height
        borderLeftColor: cursor.color
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
    >
      {/* Cursor line */}
      <div 
        className="w-0.5 h-6 animate-pulse"
        style={{ backgroundColor: cursor.color }}
      />
      
      {/* User label */}
      <div 
        className="absolute -top-8 left-0 px-2 py-1 text-xs text-white rounded-md whitespace-nowrap shadow-lg"
        style={{ backgroundColor: cursor.color }}
      >
        {user.name}
      </div>
    </motion.div>
  )
}

// User presence indicator
function PresenceIndicator({ courseId }: { courseId: string }) {
  const { users, userPresence } = useCourseCollaboration(courseId)
  const activeUsers = users.filter(user => {
    const presence = userPresence.get(user.id)
    return presence?.status === 'online'
  })

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {activeUsers.slice(0, 5).map(user => {
            const presence = userPresence.get(user.id)
            const isEditing = presence?.currentSection === 'editor'
            
            return (
              <Tooltip key={user.id}>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback style={{ backgroundColor: user.color }}>
                        {user.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Status indicator */}
                    <div className={cn(
                      'absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background',
                      presence?.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    )} />
                    
                    {/* Editing indicator */}
                    {isEditing && (
                      <motion.div
                        className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Edit3 className="h-2 w-2 text-white" />
                      </motion.div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-muted-foreground">{user.role}</div>
                    {presence && (
                      <div className="text-xs mt-1">
                        {isEditing ? 'Currently editing' : 'Viewing'}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {activeUsers.length > 5 && (
          <Badge variant="secondary" className="text-xs">
            +{activeUsers.length - 5}
          </Badge>
        )}

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{activeUsers.length}</span>
        </div>
      </div>
    </TooltipProvider>
  )
}

// Conflict resolution component
function ConflictResolution({ 
  conflicts, 
  onResolve 
}: { 
  conflicts: any[]
  onResolve: (conflictId: string, resolution: 'accept' | 'reject' | 'merge') => void 
}) {
  if (conflicts.length === 0) return null

  return (
    <Card className="p-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-amber-900 dark:text-amber-100">
            Content Conflicts Detected
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">
            Other users have made changes while you were editing. Please resolve the conflicts below.
          </p>
          
          <div className="mt-3 space-y-2">
            {conflicts.map((conflict, index) => (
              <div key={conflict.id || index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
                <div className="text-sm">
                  <div className="font-medium">Change by {conflict.userName}</div>
                  <div className="text-muted-foreground mt-1">{conflict.description}</div>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onResolve(conflict.id, 'accept')}
                  >
                    Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onResolve(conflict.id, 'reject')}
                  >
                    Reject
                  </Button>
                  {conflict.canMerge && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onResolve(conflict.id, 'merge')}
                    >
                      Auto-merge
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

export function CollaborativeEditor({
  courseId,
  sessionId,
  activityId,
  content,
  onChange,
  onSelectionChange,
  placeholder = "Start typing...",
  className,
  disabled = false,
  showPresence = true,
  showConflicts = true
}: CollaborativeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localContent, setLocalContent] = useState(content)
  const [conflicts, setConflicts] = useState<any[]>([])
  const [isTyping, setIsTyping] = useState(false)
  
  const {
    cursors,
    selections,
    pendingChanges,
    sendCursorPosition,
    sendContentChange,
    applyPendingChanges
  } = useCollaborativeEditor(courseId, sessionId, activityId)

  // Handle cursor position updates
  const handleCursorPosition = useCallback(() => {
    if (!textareaRef.current || disabled) return

    const textarea = textareaRef.current
    const position = textarea.selectionStart
    const text = textarea.value
    const lines = text.substring(0, position).split('\n')
    const line = lines.length - 1
    const column = lines[lines.length - 1].length

    sendCursorPosition({
      position: {
        line,
        column,
        blockId: activityId,
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd
      },
      color: '#7C3AED' // This should come from user settings
    })
  }, [sendCursorPosition, activityId, disabled])

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
    if (disabled) return

    const oldContent = localContent
    setLocalContent(newContent)
    setIsTyping(true)

    // Send change to other users
    sendContentChange({
      type: 'insert', // This should be more sophisticated
      target: {
        courseId,
        sessionId,
        activityId,
        blockId: activityId
      },
      data: {
        oldContent,
        newContent,
        position: textareaRef.current?.selectionStart || 0
      }
    })

    // Notify parent
    onChange(newContent)

    // Clear typing indicator after delay
    setTimeout(() => setIsTyping(false), 1000)
  }, [localContent, disabled, sendContentChange, courseId, sessionId, activityId, onChange])

  // Apply pending changes from other users
  useEffect(() => {
    if (pendingChanges.length > 0) {
      const changes = applyPendingChanges()
      
      // Simple conflict detection
      const hasConflicts = changes.some(change => {
        const changeTime = new Date(change.timestamp).getTime()
        const now = Date.now()
        return now - changeTime < 5000 && isTyping // Conflict if changed within 5 seconds while typing
      })

      if (hasConflicts && showConflicts) {
        setConflicts(prev => [...prev, ...changes.map(change => ({
          id: change.id,
          userName: change.userId, // Should map to actual user name
          description: `Modified ${change.target.blockId ? 'activity' : 'content'}`,
          canMerge: change.type === 'insert',
          change
        }))])
      } else {
        // Auto-apply non-conflicting changes
        // This is a simplified version - real implementation would need operational transformation
        const latestChange = changes[changes.length - 1]
        if (latestChange?.data?.newContent) {
          setLocalContent(latestChange.data.newContent)
          onChange(latestChange.data.newContent)
        }
      }
    }
  }, [pendingChanges, applyPendingChanges, isTyping, showConflicts, onChange])

  // Handle conflict resolution
  const handleConflictResolution = useCallback((conflictId: string, resolution: 'accept' | 'reject' | 'merge') => {
    setConflicts(prev => {
      const conflict = prev.find(c => c.id === conflictId)
      if (!conflict) return prev

      switch (resolution) {
        case 'accept':
          // Apply the change
          if (conflict.change.data.newContent) {
            setLocalContent(conflict.change.data.newContent)
            onChange(conflict.change.data.newContent)
          }
          break
        case 'reject':
          // Keep current content, do nothing
          break
        case 'merge':
          // Implement merge logic
          break
      }

      return prev.filter(c => c.id !== conflictId)
    })
  }, [onChange])

  // Update content when prop changes
  useEffect(() => {
    if (content !== localContent && !isTyping) {
      setLocalContent(content)
    }
  }, [content, localContent, isTyping])

  return (
    <div className={cn("relative", className)}>
      {/* Presence indicator */}
      {showPresence && (
        <div className="flex items-center justify-between mb-4">
          <PresenceIndicator courseId={courseId} />
          
          {isTyping && (
            <Badge variant="secondary" className="text-xs">
              <Edit3 className="h-3 w-3 mr-1" />
              Typing...
            </Badge>
          )}
        </div>
      )}

      {/* Conflict resolution */}
      {showConflicts && conflicts.length > 0 && (
        <div className="mb-4">
          <ConflictResolution 
            conflicts={conflicts}
            onResolve={handleConflictResolution}
          />
        </div>
      )}

      {/* Editor container */}
      <div className="relative">
        {/* Live cursors */}
        <AnimatePresence>
          {Array.from(cursors.values()).map(cursor => (
            <LiveCursor key={cursor.userId} cursor={cursor} />
          ))}
        </AnimatePresence>

        {/* Text editor */}
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={(e) => handleContentChange(e.target.value)}
          onSelect={handleCursorPosition}
          onMouseUp={handleCursorPosition}
          onKeyUp={handleCursorPosition}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full min-h-[200px] p-4 border rounded-lg resize-none",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "font-mono text-sm leading-6",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        />

        {/* Selection overlays */}
        <AnimatePresence>
          {Array.from(selections.values()).map((selection, index) => (
            <motion.div
              key={`selection-${index}`}
              className="absolute pointer-events-none bg-blue-200/30 dark:bg-blue-800/30"
              style={{
                left: `${selection.selection.start.column * 8}px`,
                top: `${selection.selection.start.line * 24}px`,
                width: `${(selection.selection.end.column - selection.selection.start.column) * 8}px`,
                height: '24px'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{localContent.length} characters</span>
          <span>{localContent.split('\n').length} lines</span>
        </div>
        
        <div className="flex items-center gap-2">
          {pendingChanges.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {pendingChanges.length} pending
            </Badge>
          )}
          {conflicts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {conflicts.length} conflicts
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

export default CollaborativeEditor