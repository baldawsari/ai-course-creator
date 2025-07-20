import { useState, useCallback, useEffect } from 'react'
import { useCourse } from './useCourse'
import type { Session, Activity, ActivityType } from '@/types/course'

interface EditorState {
  courseData: any
  isDirty: boolean
  history: any[]
  historyIndex: number
  maxHistorySize: number
}

export function useCourseEditor(courseId: string) {
  const { course, updateCourse } = useCourse(courseId)
  
  const [editorState, setEditorState] = useState<EditorState>({
    courseData: null,
    isDirty: false,
    history: [],
    historyIndex: -1,
    maxHistorySize: 50
  })
  
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')

  // Initialize editor state when course loads
  useEffect(() => {
    if (course) {
      setEditorState(prev => ({
        ...prev,
        courseData: course,
        history: [course],
        historyIndex: 0
      }))
    }
  }, [course])

  // Auto-save functionality
  useEffect(() => {
    if (editorState.isDirty) {
      const timer = setTimeout(async () => {
        setAutoSaveStatus('saving')
        try {
          await updateCourse(editorState.courseData)
          setAutoSaveStatus('saved')
          setEditorState(prev => ({ ...prev, isDirty: false }))
        } catch (error) {
          setAutoSaveStatus('error')
          console.error('Auto-save failed:', error)
        }
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [editorState.isDirty, editorState.courseData, updateCourse])

  const addToHistory = useCallback((newData: any) => {
    setEditorState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1)
      newHistory.push(newData)
      
      // Keep history within size limit
      if (newHistory.length > prev.maxHistorySize) {
        newHistory.shift()
      }
      
      return {
        ...prev,
        courseData: newData,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isDirty: true
      }
    })
  }, [])

  const updateSession = useCallback((sessionId: string, updates: Partial<Session>) => {
    if (!editorState.courseData) return

    const updatedCourse = {
      ...editorState.courseData,
      sessions: editorState.courseData.sessions.map((session: Session) =>
        session.id === sessionId ? { ...session, ...updates } : session
      )
    }
    
    addToHistory(updatedCourse)
  }, [editorState.courseData, addToHistory])

  const updateActivity = useCallback((sessionId: string, activityId: string, updates: Partial<Activity>) => {
    if (!editorState.courseData) return

    const updatedCourse = {
      ...editorState.courseData,
      sessions: editorState.courseData.sessions.map((session: Session) =>
        session.id === sessionId
          ? {
              ...session,
              activities: session.activities.map((activity: Activity) =>
                activity.id === activityId ? { ...activity, ...updates } : activity
              )
            }
          : session
      )
    }
    
    addToHistory(updatedCourse)
  }, [editorState.courseData, addToHistory])

  const addSession = useCallback(() => {
    if (!editorState.courseData) return

    const newSession: Session = {
      id: `session-${Date.now()}`,
      title: `New Session ${editorState.courseData.sessions.length + 1}`,
      description: '',
      activities: [],
      order: editorState.courseData.sessions.length
    }

    const updatedCourse = {
      ...editorState.courseData,
      sessions: [...editorState.courseData.sessions, newSession]
    }
    
    addToHistory(updatedCourse)
    return newSession.id
  }, [editorState.courseData, addToHistory])

  const deleteSession = useCallback((sessionId: string) => {
    if (!editorState.courseData) return

    const updatedCourse = {
      ...editorState.courseData,
      sessions: editorState.courseData.sessions.filter((session: Session) => session.id !== sessionId)
    }
    
    addToHistory(updatedCourse)
  }, [editorState.courseData, addToHistory])

  const reorderSessions = useCallback((sessions: Session[]) => {
    if (!editorState.courseData) return

    const updatedCourse = {
      ...editorState.courseData,
      sessions: sessions.map((session, index) => ({ ...session, order: index }))
    }
    
    addToHistory(updatedCourse)
  }, [editorState.courseData, addToHistory])

  const addActivity = useCallback((sessionId: string, type: ActivityType) => {
    if (!editorState.courseData) return

    const session = editorState.courseData.sessions.find((s: Session) => s.id === sessionId)
    if (!session) return

    const newActivity: Activity = {
      id: `activity-${Date.now()}`,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content: '',
      order: session.activities.length
    }

    const updatedCourse = {
      ...editorState.courseData,
      sessions: editorState.courseData.sessions.map((s: Session) =>
        s.id === sessionId
          ? { ...s, activities: [...s.activities, newActivity] }
          : s
      )
    }
    
    addToHistory(updatedCourse)
    return newActivity.id
  }, [editorState.courseData, addToHistory])

  const deleteActivity = useCallback((sessionId: string, activityId: string) => {
    if (!editorState.courseData) return

    const updatedCourse = {
      ...editorState.courseData,
      sessions: editorState.courseData.sessions.map((session: Session) =>
        session.id === sessionId
          ? {
              ...session,
              activities: session.activities.filter((activity: Activity) => activity.id !== activityId)
            }
          : session
      )
    }
    
    addToHistory(updatedCourse)
  }, [editorState.courseData, addToHistory])

  const reorderActivities = useCallback((sessionId: string, activities: Activity[]) => {
    if (!editorState.courseData) return

    const updatedCourse = {
      ...editorState.courseData,
      sessions: editorState.courseData.sessions.map((session: Session) =>
        session.id === sessionId
          ? { ...session, activities: activities.map((activity, index) => ({ ...activity, order: index })) }
          : session
      )
    }
    
    addToHistory(updatedCourse)
  }, [editorState.courseData, addToHistory])

  const undo = useCallback(() => {
    setEditorState(prev => {
      if (prev.historyIndex > 0) {
        const newIndex = prev.historyIndex - 1
        return {
          ...prev,
          courseData: prev.history[newIndex],
          historyIndex: newIndex,
          isDirty: true
        }
      }
      return prev
    })
  }, [])

  const redo = useCallback(() => {
    setEditorState(prev => {
      if (prev.historyIndex < prev.history.length - 1) {
        const newIndex = prev.historyIndex + 1
        return {
          ...prev,
          courseData: prev.history[newIndex],
          historyIndex: newIndex,
          isDirty: true
        }
      }
      return prev
    })
  }, [])

  const canUndo = editorState.historyIndex > 0
  const canRedo = editorState.historyIndex < editorState.history.length - 1

  return {
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
  }
}