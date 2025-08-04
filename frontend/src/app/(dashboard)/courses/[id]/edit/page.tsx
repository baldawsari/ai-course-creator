'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PanelLeft,
  PanelRight,
  Save,
  Undo,
  Redo,
  Eye,
  EyeOff,
  Users,
  MessageSquare,
  History,
  Search,
  Command,
  Sparkles,
  Settings,
  ArrowLeft,
  Plus,
  GripVertical,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SessionBoard } from '@/components/features/course-editor/session-board'
import { ContentEditor } from '@/components/features/course-editor/content-editor'
import { AIEnhancementPanel } from '@/components/features/course-editor/ai-enhancement-panel'
import { CollaborationPanel } from '@/components/features/course-editor/collaboration-panel'
import { VersionHistory } from '@/components/features/course-editor/version-history'
import { ExportModal } from '@/components/features/course-editor/export-modal'
import { useCourse } from '@/hooks/useCourse'
import { useCourseEditor } from '@/hooks/useCourseEditor'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'

export default function CourseEditPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  
  // UI State
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [rightPanelContent, setRightPanelContent] = useState<'ai' | 'collaboration' | 'history'>('ai')
  const [focusMode, setFocusMode] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)

  // Data & State Management
  const { course, isLoading, error, updateCourse } = useCourse(courseId)
  const {
    editorState,
    autoSaveStatus,
    canUndo,
    canRedo,
    undo,
    redo,
    updateSession,
    updateActivity,
    addSession,
    deleteSession,
    reorderSessions,
    addActivity,
    deleteActivity,
    reorderActivities
  } = useCourseEditor(courseId)

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    'mod+s': () => handleSave(),
    'mod+z': () => undo(),
    'mod+shift+z': () => redo(),
    'mod+k': () => setShowCommandPalette(true),
    'mod+\\': () => setLeftPanelOpen(!leftPanelOpen),
    'mod+shift+\\': () => setRightPanelOpen(!rightPanelOpen),
    'escape': () => {
      setFocusMode(false)
      setShowCommandPalette(false)
    },
    'f': () => setFocusMode(!focusMode)
  })

  const handleSave = useCallback(async () => {
    if (course && editorState.isDirty) {
      try {
        await updateCourse(editorState.courseData)
      } catch (error) {
        console.error('Save failed:', error)
      }
    }
  }, [course, editorState, updateCourse])

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setSelectedActivityId(null)
  }

  const handleActivitySelect = (sessionId: string, activityId: string) => {
    setSelectedSessionId(sessionId)
    setSelectedActivityId(activityId)
  }

  const openAIPanel = () => {
    setRightPanelContent('ai')
    setRightPanelOpen(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course editor...</p>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Course</h2>
          <p className="text-gray-600 mb-4">{error || 'Course not found'}</p>
          <Button onClick={() => router.push('/courses')}>
            Back to Courses
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" data-testid="course-editor mobile-editor-layout">
      {/* Header */}
      <div className={cn(
        "bg-white border-b border-gray-200 px-6 py-3 transition-all duration-300",
        focusMode && "opacity-0 pointer-events-none"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/courses')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {course.title}
              </h1>
              <p className="text-sm text-gray-500">
                {course.sessions?.length || 0} sessions • Course Editor
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>

            {/* Auto-save Status */}
            <div className="flex items-center text-sm">
              <div className={cn(
                "w-2 h-2 rounded-full mr-2",
                autoSaveStatus === 'saved' && "bg-green-500",
                autoSaveStatus === 'saving' && "bg-yellow-500 animate-pulse",
                autoSaveStatus === 'error' && "bg-red-500"
              )} />
              <span className="text-gray-600">
                {autoSaveStatus === 'saved' ? 'Saved' : 
                 autoSaveStatus === 'saving' ? 'Saving...' : 'Save failed'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={!canUndo}
                className="p-2"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={!canRedo}
                className="p-2"
              >
                <Redo className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCommandPalette(true)}
                className="p-2"
              >
                <Command className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFocusMode(!focusMode)}
                className="p-2"
              >
                {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>

            {/* Panel Toggles */}
            <div className="flex items-center space-x-1">
              <Button
                variant={leftPanelOpen ? "default" : "ghost"}
                size="sm"
                onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                className="p-2"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={rightPanelOpen ? "default" : "ghost"}
                size="sm"
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                className="p-2"
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Collaboration */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRightPanelContent('collaboration')
                  setRightPanelOpen(true)
                }}
              >
                <Users className="h-4 w-4 mr-1" />
                <Badge variant="secondary" className="text-xs">2</Badge>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRightPanelContent('history')
                  setRightPanelOpen(true)
                }}
              >
                <History className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />
            
            <Button onClick={handleSave} disabled={!editorState.isDirty}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setShowExportModal(true)}
              data-testid="export-button"
            >
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Session Board */}
        <AnimatePresence>
          {leftPanelOpen && !focusMode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white border-r border-gray-200 flex flex-col"
            >
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">Sessions</h2>
                  <Button
                    size="sm"
                    onClick={() => addSession()}
                    className="p-2"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Session Management Toolbar */}
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Expand All
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Collapse All
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto" data-testid="session-board">
                <SessionBoard
                  sessions={course.sessions || []}
                  selectedSessionId={selectedSessionId}
                  selectedActivityId={selectedActivityId}
                  onSessionSelect={handleSessionSelect}
                  onActivitySelect={handleActivitySelect}
                  onSessionUpdate={updateSession}
                  onActivityUpdate={updateActivity}
                  onAddSession={addSession}
                  onDeleteSession={deleteSession}
                  onReorderSessions={reorderSessions}
                  onAddActivity={addActivity}
                  onDeleteActivity={deleteActivity}
                  onReorderActivities={reorderActivities}
                  searchQuery={searchQuery}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden" data-testid="content-editor">
          <ContentEditor
            courseId={courseId}
            selectedSession={selectedSessionId ? course.sessions?.find(s => s.id === selectedSessionId) || null : null}
            selectedActivity={selectedActivityId}
            onSessionUpdate={updateSession}
            onActivityUpdate={updateActivity}
            onOpenAIPanel={openAIPanel}
            focusMode={focusMode}
            searchQuery={searchQuery}
          />
        </div>

        {/* Right Panel - AI Enhancement / Collaboration / History */}
        <AnimatePresence>
          {rightPanelOpen && !focusMode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white border-l border-gray-200 flex flex-col"
            >
              {/* Panel Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={rightPanelContent === 'ai' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setRightPanelContent('ai')}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      AI
                    </Button>
                    <Button
                      variant={rightPanelContent === 'collaboration' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setRightPanelContent('collaboration')}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                    <Button
                      variant={rightPanelContent === 'history' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setRightPanelContent('history')}
                    >
                      <History className="h-4 w-4 mr-1" />
                      History
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRightPanelOpen(false)}
                    className="p-2"
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-hidden">
                {rightPanelContent === 'ai' && (
                  <AIEnhancementPanel
                    courseId={courseId}
                    selectedSession={selectedSessionId ? course.sessions?.find(s => s.id === selectedSessionId) || null : null}
                    selectedActivity={selectedActivityId}
                    onApplySuggestion={(suggestion) => {
                      // Apply AI suggestion
                      console.log('Applying suggestion:', suggestion)
                    }}
                  />
                )}

                {rightPanelContent === 'collaboration' && (
                  <CollaborationPanel
                    courseId={courseId}
                    selectedSession={selectedSessionId}
                    selectedActivity={selectedActivityId}
                  />
                )}

                {rightPanelContent === 'history' && (
                  <VersionHistory
                    courseId={courseId}
                    onRestoreVersion={(version) => {
                      // Restore version
                      console.log('Restoring version:', version)
                    }}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating AI Button */}
      {!rightPanelOpen && !focusMode && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6"
        >
          <Button
            size="lg"
            onClick={openAIPanel}
            className="rounded-full w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
          >
            <Sparkles className="h-6 w-6" />
          </Button>
        </motion.div>
      )}

      {/* Command Palette */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl"
          >
            <div className="p-4">
              <Input
                placeholder="Type a command or search..."
                className="w-full"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowCommandPalette(false)
                  }
                }}
              />
            </div>
            {/* Command palette content would go here */}
          </motion.div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        courseId={courseId}
        courseTitle={course?.title || 'Course'}
        onExport={async (options) => {
          // Mock export API call
          await apiClient.post(`/export/bundle/${courseId}`, options)
        }}
      />
    </div>
  )
}