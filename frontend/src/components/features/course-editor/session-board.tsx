'use client'

import { useState } from 'react'
import { motion, Reorder, AnimatePresence } from 'framer-motion'
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Play,
  BookOpen,
  FileText,
  Users,
  Trophy,
  MessageSquare,
  Code,
  Image
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Session, Activity, ActivityType } from '@/types/course'

interface SessionBoardProps {
  sessions: Session[]
  selectedSessionId: string | null
  selectedActivityId: string | null
  onSessionSelect: (sessionId: string) => void
  onActivitySelect: (sessionId: string, activityId: string) => void
  onSessionUpdate: (sessionId: string, updates: Partial<Session>) => void
  onActivityUpdate: (sessionId: string, activityId: string, updates: Partial<Activity>) => void
  onAddSession: () => void
  onDeleteSession: (sessionId: string) => void
  onReorderSessions: (sessions: Session[]) => void
  onAddActivity: (sessionId: string, type: ActivityType) => void
  onDeleteActivity: (sessionId: string, activityId: string) => void
  onReorderActivities: (sessionId: string, activities: Activity[]) => void
  searchQuery?: string
}

const activityIcons: Record<ActivityType, React.ElementType> = {
  text: FileText,
  quiz: Trophy,
  exercise: Code,
  video: Play,
  image: Image,
  code: Code,
  discussion: MessageSquare
}

const activityColors: Record<ActivityType, string> = {
  text: 'bg-blue-100 text-blue-700',
  quiz: 'bg-yellow-100 text-yellow-700',
  exercise: 'bg-green-100 text-green-700',
  video: 'bg-purple-100 text-purple-700',
  image: 'bg-pink-100 text-pink-700',
  code: 'bg-gray-100 text-gray-700',
  discussion: 'bg-orange-100 text-orange-700'
}

export function SessionBoard({
  sessions,
  selectedSessionId,
  selectedActivityId,
  onSessionSelect,
  onActivitySelect,
  onSessionUpdate,
  onActivityUpdate,
  onAddSession,
  onDeleteSession,
  onReorderSessions,
  onAddActivity,
  onDeleteActivity,
  onReorderActivities,
  searchQuery = ''
}: SessionBoardProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editingActivity, setEditingActivity] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ title: string }>({ title: '' })
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [activityModalSession, setActivityModalSession] = useState<string | null>(null)
  const [newActivity, setNewActivity] = useState<{ title: string; type: ActivityType }>({ 
    title: '', 
    type: 'text' 
  })

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedSessions(newExpanded)
  }

  const startEditingSession = (session: Session) => {
    setEditingSession(session.id)
    setEditValues({ title: session.title })
  }

  const startEditingActivity = (activity: Activity) => {
    setEditingActivity(activity.id)
    setEditValues({ title: activity.title })
  }

  const saveSessionEdit = (sessionId: string) => {
    onSessionUpdate(sessionId, { title: editValues.title })
    setEditingSession(null)
  }

  const saveActivityEdit = (sessionId: string, activityId: string) => {
    onActivityUpdate(sessionId, activityId, { title: editValues.title })
    setEditingActivity(null)
  }

  const filteredSessions = sessions.filter(session => {
    if (!searchQuery) return true
    
    const sessionMatch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        session.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const activityMatch = session.activities?.some(activity =>
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    return sessionMatch || activityMatch
  })

  return (
    <div className="space-y-2 p-2">
      <Reorder.Group 
        axis="y" 
        values={filteredSessions} 
        onReorder={onReorderSessions}
        className="space-y-2"
      >
        <AnimatePresence>
          {filteredSessions.map((session, index) => {
            const isExpanded = expandedSessions.has(session.id)
            const isSelected = selectedSessionId === session.id
            
            return (
              <Reorder.Item
                key={session.id}
                value={session}
                className="list-none"
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className={cn(
                    "border transition-all duration-200 hover:shadow-md",
                    isSelected && "ring-2 ring-purple-500 border-purple-200"
                  )} data-testid={`session-card-${session.id}`}>
                    {/* Session Header */}
                    <div className="p-3">
                      <div className="flex items-center space-x-2">
                        <div className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSession(session.id)}
                          className="p-1"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>

                        <div className="flex-1 min-w-0">
                          {editingSession === session.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editValues.title}
                                onChange={(e) => setEditValues({ title: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveSessionEdit(session.id)
                                  if (e.key === 'Escape') setEditingSession(null)
                                }}
                                className="text-sm font-medium flex-1"
                                autoFocus
                                data-testid="title-input"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => saveSessionEdit(session.id)}
                                data-testid="save-title-button"
                                className="h-6 px-2"
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => onSessionSelect(session.id)}
                              className="text-left w-full"
                            >
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                Session {index + 1}: {session.title}
                              </h3>
                              {session.description && (
                                <p className="text-xs text-gray-500 truncate mt-1">
                                  {session.description}
                                </p>
                              )}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          <Badge variant="secondary" className="text-xs">
                            {session.activities?.length || 0}
                          </Badge>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-1">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => startEditingSession(session)} data-testid="edit-title-button">
                                <Edit className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {/* Duplicate session */}}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onDeleteSession(session.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    {/* Activities List */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-gray-100"
                        >
                          <div className="p-2 space-y-1">
                            <Reorder.Group
                              axis="y"
                              values={session.activities || []}
                              onReorder={(activities) => onReorderActivities(session.id, activities)}
                              className="space-y-1"
                            >
                              {session.activities?.map((activity) => {
                                const ActivityIcon = activityIcons[activity.type]
                                const isActivitySelected = selectedActivityId === activity.id
                                
                                return (
                                  <Reorder.Item
                                    key={activity.id}
                                    value={activity}
                                    className="list-none"
                                  >
                                    <motion.div
                                      layout
                                      className={cn(
                                        "flex items-center space-x-2 p-2 rounded-md transition-colors duration-200 hover:bg-gray-50 cursor-pointer",
                                        isActivitySelected && "bg-purple-50 border border-purple-200"
                                      )}
                                      onClick={() => onActivitySelect(session.id, activity.id)}
                                      data-testid={`activity-card-${activity.id}`}
                                    >
                                      <GripVertical className="h-3 w-3 text-gray-400 cursor-grab active:cursor-grabbing" />
                                      
                                      <div className={cn(
                                        "p-1 rounded",
                                        activityColors[activity.type]
                                      )}>
                                        <ActivityIcon className="h-3 w-3" />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        {editingActivity === activity.id ? (
                                          <Input
                                            value={editValues.title}
                                            onChange={(e) => setEditValues({ title: e.target.value })}
                                            onBlur={() => saveActivityEdit(session.id, activity.id)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') saveActivityEdit(session.id, activity.id)
                                              if (e.key === 'Escape') setEditingActivity(null)
                                            }}
                                            className="text-xs"
                                            autoFocus
                                          />
                                        ) : (
                                          <p className="text-xs font-medium text-gray-700 truncate">
                                            {activity.title}
                                          </p>
                                        )}
                                      </div>
                                      
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="p-1">
                                            <MoreHorizontal className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                          <DropdownMenuItem onClick={() => startEditingActivity(activity)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Rename
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => {/* Duplicate activity */}}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Duplicate
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={() => onDeleteActivity(session.id, activity.id)}
                                            className="text-red-600"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </motion.div>
                                  </Reorder.Item>
                                )
                              })}
                            </Reorder.Group>

                            {/* Add Activity Button */}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full justify-start text-xs text-gray-500 hover:text-gray-700"
                              data-testid="add-activity-button"
                              onClick={() => {
                                setActivityModalSession(session.id)
                                setShowActivityModal(true)
                                setNewActivity({ title: '', type: 'text' })
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Activity
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              </Reorder.Item>
            )
          })}
        </AnimatePresence>
      </Reorder.Group>

      {/* Add Session Button */}
      <Button
        variant="outline"
        onClick={onAddSession}
        className="w-full justify-start text-sm text-gray-600 hover:text-gray-900"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add New Session
      </Button>

      {/* Activity Creation Modal */}
      <Dialog open={showActivityModal} onOpenChange={setShowActivityModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="activity-title">Activity Title</Label>
              <Input
                id="activity-title"
                value={newActivity.title}
                onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                placeholder="Enter activity title"
                data-testid="activity-title-input"
              />
            </div>
            <div>
              <Label htmlFor="activity-type">Activity Type</Label>
              <Select
                value={newActivity.type}
                onValueChange={(value) => setNewActivity({ ...newActivity, type: value as ActivityType })}
              >
                <SelectTrigger id="activity-type" data-testid="activity-type-select">
                  <SelectValue placeholder="Select activity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Content</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="exercise">Exercise</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="discussion">Discussion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActivityModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (activityModalSession && newActivity.title) {
                  onAddActivity(activityModalSession, newActivity.type)
                  setShowActivityModal(false)
                  setNewActivity({ title: '', type: 'text' })
                }
              }}
              disabled={!newActivity.title}
              data-testid="create-activity-button"
            >
              Create Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}