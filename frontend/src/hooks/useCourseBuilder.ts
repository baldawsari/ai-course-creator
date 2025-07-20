import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

interface FileResource {
  id: string
  name: string
  type: 'file' | 'url'
  size?: number
  url?: string
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress?: number
  preview?: string
  metadata?: {
    pages?: number
    words?: number
    language?: string
  }
  error?: string
}

interface Objective {
  id: string
  text: string
}

interface CourseData {
  id: string
  title?: string
  description?: string
  objectives?: Objective[]
  targetAudience?: string[]
  duration?: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  assessmentType?: 'none' | 'quiz' | 'assignment' | 'both'
  template?: string
  thumbnail?: string
  tags?: string[]
  resources?: FileResource[]
  isDirty?: boolean
  lastModified?: Date
  generated?: boolean
  content?: any
}

interface GenerationOptions {
  model: 'claude-3-haiku' | 'claude-3-sonnet' | 'claude-3-opus'
  creativity: number
  includeActivities: boolean
  includeAssessments: boolean
  sessionCount: number
  interactivityLevel: 'low' | 'medium' | 'high'
  customInstructions?: string
}

interface HistoryState {
  data: CourseData
  timestamp: Date
}

// API functions
const fetchCourse = async (courseId: string): Promise<CourseData> => {
  const response = await fetch(`/api/courses/${courseId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch course')
  }
  return response.json()
}

const updateCourseAPI = async (courseData: Partial<CourseData>): Promise<CourseData> => {
  const response = await fetch(`/api/courses/${courseData.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(courseData),
  })
  if (!response.ok) {
    throw new Error('Failed to update course')
  }
  return response.json()
}

const uploadFilesAPI = async (courseId: string, files: File[]): Promise<FileResource[]> => {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))
  
  const response = await fetch(`/api/courses/${courseId}/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    throw new Error('Failed to upload files')
  }
  return response.json()
}

const addUrlAPI = async (courseId: string, url: string): Promise<FileResource> => {
  const response = await fetch(`/api/courses/${courseId}/add-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  })
  if (!response.ok) {
    throw new Error('Failed to add URL')
  }
  return response.json()
}

const generateCourseAPI = async (courseId: string, options: GenerationOptions): Promise<any> => {
  const response = await fetch(`/api/courses/${courseId}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  })
  if (!response.ok) {
    throw new Error('Failed to generate course')
  }
  return response.json()
}

export function useCourseBuilder(courseId: string) {
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const autoSaveTimeout = useRef<NodeJS.Timeout>()
  const queryClient = useQueryClient()
  const router = useRouter()

  // Fetch course data
  const {
    data: courseData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => fetchCourse(courseId),
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  // Update course mutation
  const updateMutation = useMutation({
    mutationFn: updateCourseAPI,
    onSuccess: (updatedCourse) => {
      queryClient.setQueryData(['course', courseId], updatedCourse)
      addToHistory(updatedCourse)
    },
    onError: (error) => {
      console.error('Failed to update course:', error)
    }
  })

  // Upload files mutation
  const uploadMutation = useMutation({
    mutationFn: ({ files }: { files: File[] }) => uploadFilesAPI(courseId, files),
    onSuccess: (newResources) => {
      queryClient.setQueryData(['course', courseId], (old: CourseData) => ({
        ...old,
        resources: [...(old.resources || []), ...newResources],
        isDirty: true,
        lastModified: new Date()
      }))
    },
    onError: (error) => {
      console.error('Failed to upload files:', error)
    }
  })

  // Add URL mutation
  const addUrlMutation = useMutation({
    mutationFn: ({ url }: { url: string }) => addUrlAPI(courseId, url),
    onSuccess: (newResource) => {
      queryClient.setQueryData(['course', courseId], (old: CourseData) => ({
        ...old,
        resources: [...(old.resources || []), newResource],
        isDirty: true,
        lastModified: new Date()
      }))
    },
    onError: (error) => {
      console.error('Failed to add URL:', error)
    }
  })

  // Generate course mutation
  const generateMutation = useMutation({
    mutationFn: (options: GenerationOptions) => generateCourseAPI(courseId, options),
    onSuccess: (response) => {
      // Check if response has jobId for async generation
      if (response.jobId) {
        // Navigate to generation progress page
        router.push(`/generation/${response.jobId}`)
      } else {
        // Direct generation result
        queryClient.setQueryData(['course', courseId], (old: CourseData) => ({
          ...old,
          content: response,
          generated: true,
          isDirty: true,
          lastModified: new Date()
        }))
      }
    },
    onError: (error) => {
      console.error('Failed to generate course:', error)
    }
  })

  // History management
  const addToHistory = useCallback((data: CourseData) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push({
        data: { ...data },
        timestamp: new Date()
      })
      
      // Keep only last 50 states
      const trimmedHistory = newHistory.slice(-50)
      setHistoryIndex(trimmedHistory.length - 1)
      return trimmedHistory
    })
  }, [historyIndex])

  // Initialize history with current data
  useEffect(() => {
    if (courseData && history.length === 0) {
      addToHistory(courseData)
    }
  }, [courseData, history.length, addToHistory])

  // Optimistic update function
  const updateCourse = useCallback(async (updates: Partial<CourseData>) => {
    if (!courseData) return

    const updatedData = {
      ...courseData,
      ...updates,
      isDirty: true,
      lastModified: new Date()
    }

    // Optimistic update
    queryClient.setQueryData(['course', courseId], updatedData)

    // Clear existing timeout
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current)
    }

    // Set new timeout for auto-save
    autoSaveTimeout.current = setTimeout(() => {
      updateMutation.mutate(updatedData)
    }, 2000) // 2 second delay

    return updatedData
  }, [courseData, courseId, queryClient, updateMutation])

  // Upload files function
  const uploadFiles = useCallback(async (filesOrUrls: (File | string)[]) => {
    const files = filesOrUrls.filter((item): item is File => item instanceof File)
    const urls = filesOrUrls.filter((item): item is string => typeof item === 'string')

    // Upload files
    if (files.length > 0) {
      await uploadMutation.mutateAsync({ files })
    }

    // Add URLs
    for (const url of urls) {
      await addUrlMutation.mutateAsync({ url })
    }
  }, [uploadMutation, addUrlMutation])

  // Generate course function
  const generateCourse = useCallback(async (options: GenerationOptions) => {
    if (!courseData) return
    await generateMutation.mutateAsync(options)
  }, [courseData, generateMutation])

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1]
      setHistoryIndex(historyIndex - 1)
      queryClient.setQueryData(['course', courseId], previousState.data)
    }
  }, [history, historyIndex, courseId, queryClient])

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      queryClient.setQueryData(['course', courseId], nextState.data)
    }
  }, [history, historyIndex, courseId, queryClient])

  // Can undo/redo
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current)
      }
    }
  }, [])

  return {
    courseData,
    updateCourse,
    uploadFiles,
    generateCourse,
    undo,
    redo,
    canUndo,
    canRedo,
    isLoading: isLoading || updateMutation.isPending,
    error: error?.message || updateMutation.error?.message || uploadMutation.error?.message || generateMutation.error?.message,
    isUploading: uploadMutation.isPending || addUrlMutation.isPending,
    isGenerating: generateMutation.isPending,
    refetch
  }
}