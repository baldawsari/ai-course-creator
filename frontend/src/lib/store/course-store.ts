import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Course, Session, Activity, CourseUpdateData } from '@/types'

interface CourseFilters {
  search?: string
  status?: string[]
  tags?: string[]
  dateRange?: { start: Date; end: Date }
  sortBy?: 'title' | 'updatedAt' | 'createdAt' | 'status'
  sortOrder?: 'asc' | 'desc'
}

interface CourseState {
  // State
  courses: Course[]
  currentCourse: Course | null
  isLoading: boolean
  error: string | null
  filters: CourseFilters
  pagination: {
    page: number
    limit: number
    total: number
  }
  
  // Cache and optimization
  lastFetch: number | null
  isDirty: boolean
  
  // Actions - Basic CRUD
  setCourses: (courses: Course[]) => void
  setCurrentCourse: (course: Course | null) => void
  addCourse: (course: Course) => void
  updateCourse: (id: string, updates: CourseUpdateData) => void
  deleteCourse: (id: string) => void
  
  // Actions - UI State
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  setFilters: (filters: Partial<CourseFilters>) => void
  setPagination: (pagination: Partial<CourseState['pagination']>) => void
  
  // Actions - Course Content Management
  updateSession: (courseId: string, sessionId: string, updates: Partial<Session>) => void
  addSession: (courseId: string, session: Session) => void
  deleteSession: (courseId: string, sessionId: string) => void
  reorderSessions: (courseId: string, sessionIds: string[]) => void
  
  updateActivity: (courseId: string, sessionId: string, activityId: string, updates: Partial<Activity>) => void
  addActivity: (courseId: string, sessionId: string, activity: Activity) => void
  deleteActivity: (courseId: string, sessionId: string, activityId: string) => void
  reorderActivities: (courseId: string, sessionId: string, activityIds: string[]) => void
  
  // Actions - Bulk Operations
  bulkUpdateCourses: (updates: { id: string; data: Partial<Course> }[]) => void
  bulkDeleteCourses: (ids: string[]) => void
  duplicateCourse: (id: string, newTitle?: string) => Course | null
  
  // Actions - Cache Management
  invalidateCache: () => void
  markDirty: () => void
  markClean: () => void
  
  // Computed values
  getFilteredCourses: () => Course[]
  getCourseById: (id: string) => Course | undefined
  getSessionById: (courseId: string, sessionId: string) => Session | undefined
  getActivityById: (courseId: string, sessionId: string, activityId: string) => Activity | undefined
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const useCourseStore = create<CourseState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      courses: [],
      currentCourse: null,
      isLoading: false,
      error: null,
      filters: {
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
      },
      lastFetch: null,
      isDirty: false,

      // Basic CRUD operations
      setCourses: (courses: Course[]) => {
        set((state) => {
          state.courses = courses
          state.lastFetch = Date.now()
          state.isDirty = false
          state.pagination.total = courses.length
        })
      },

      setCurrentCourse: (currentCourse: Course | null) => {
        set((state) => {
          state.currentCourse = currentCourse
        })
      },

      addCourse: (course: Course) => {
        set((state) => {
          state.courses.unshift(course)
          state.pagination.total += 1
          state.isDirty = true
        })
      },

      updateCourse: (id: string, updates: CourseUpdateData) => {
        set((state) => {
          const courseIndex = state.courses.findIndex(c => c.id === id)
          if (courseIndex !== -1) {
            Object.assign(state.courses[courseIndex], updates, { updatedAt: new Date().toISOString() })
          }
          
          if (state.currentCourse?.id === id) {
            Object.assign(state.currentCourse, updates, { updatedAt: new Date().toISOString() })
          }
          
          state.isDirty = true
        })
      },

      deleteCourse: (id: string) => {
        set((state) => {
          state.courses = state.courses.filter(course => course.id !== id)
          if (state.currentCourse?.id === id) {
            state.currentCourse = null
          }
          state.pagination.total -= 1
          state.isDirty = true
        })
      },

      // UI State management
      setLoading: (isLoading: boolean) => {
        set((state) => {
          state.isLoading = isLoading
          if (isLoading) {
            state.error = null
          }
        })
      },

      setError: (error: string | null) => {
        set((state) => {
          state.error = error
          state.isLoading = false
        })
      },

      clearError: () => {
        set((state) => {
          state.error = null
        })
      },

      setFilters: (filters: Partial<CourseFilters>) => {
        set((state) => {
          Object.assign(state.filters, filters)
          state.pagination.page = 1 // Reset to first page when filtering
        })
      },

      setPagination: (pagination: Partial<CourseState['pagination']>) => {
        set((state) => {
          Object.assign(state.pagination, pagination)
        })
      },

      // Session management
      updateSession: (courseId: string, sessionId: string, updates: Partial<Session>) => {
        set((state) => {
          const updateCourseSession = (course: Course) => {
            const sessionIndex = course.sessions.findIndex(s => s.id === sessionId)
            if (sessionIndex !== -1) {
              Object.assign(course.sessions[sessionIndex], updates)
              course.updatedAt = new Date().toISOString()
            }
          }

          const courseIndex = state.courses.findIndex(c => c.id === courseId)
          if (courseIndex !== -1) {
            updateCourseSession(state.courses[courseIndex])
          }

          if (state.currentCourse?.id === courseId) {
            updateCourseSession(state.currentCourse)
          }

          state.isDirty = true
        })
      },

      addSession: (courseId: string, session: Session) => {
        set((state) => {
          const addToCourse = (course: Course) => {
            course.sessions.push(session)
            course.updatedAt = new Date().toISOString()
          }

          const courseIndex = state.courses.findIndex(c => c.id === courseId)
          if (courseIndex !== -1) {
            addToCourse(state.courses[courseIndex])
          }

          if (state.currentCourse?.id === courseId) {
            addToCourse(state.currentCourse)
          }

          state.isDirty = true
        })
      },

      deleteSession: (courseId: string, sessionId: string) => {
        set((state) => {
          const removeFromCourse = (course: Course) => {
            course.sessions = course.sessions.filter(s => s.id !== sessionId)
            course.updatedAt = new Date().toISOString()
          }

          const courseIndex = state.courses.findIndex(c => c.id === courseId)
          if (courseIndex !== -1) {
            removeFromCourse(state.courses[courseIndex])
          }

          if (state.currentCourse?.id === courseId) {
            removeFromCourse(state.currentCourse)
          }

          state.isDirty = true
        })
      },

      reorderSessions: (courseId: string, sessionIds: string[]) => {
        set((state) => {
          const reorderInCourse = (course: Course) => {
            const sessionMap = new Map(course.sessions.map(s => [s.id, s]))
            course.sessions = sessionIds.map((id, index) => {
              const session = sessionMap.get(id)
              if (session) {
                session.order = index
                return session
              }
              return null
            }).filter(Boolean) as Session[]
            course.updatedAt = new Date().toISOString()
          }

          const courseIndex = state.courses.findIndex(c => c.id === courseId)
          if (courseIndex !== -1) {
            reorderInCourse(state.courses[courseIndex])
          }

          if (state.currentCourse?.id === courseId) {
            reorderInCourse(state.currentCourse)
          }

          state.isDirty = true
        })
      },

      // Activity management
      updateActivity: (courseId: string, sessionId: string, activityId: string, updates: Partial<Activity>) => {
        set((state) => {
          const updateInCourse = (course: Course) => {
            const session = course.sessions.find(s => s.id === sessionId)
            if (session) {
              const activityIndex = session.activities.findIndex(a => a.id === activityId)
              if (activityIndex !== -1) {
                Object.assign(session.activities[activityIndex], updates)
                course.updatedAt = new Date().toISOString()
              }
            }
          }

          const courseIndex = state.courses.findIndex(c => c.id === courseId)
          if (courseIndex !== -1) {
            updateInCourse(state.courses[courseIndex])
          }

          if (state.currentCourse?.id === courseId) {
            updateInCourse(state.currentCourse)
          }

          state.isDirty = true
        })
      },

      addActivity: (courseId: string, sessionId: string, activity: Activity) => {
        set((state) => {
          const addToCourse = (course: Course) => {
            const session = course.sessions.find(s => s.id === sessionId)
            if (session) {
              session.activities.push(activity)
              course.updatedAt = new Date().toISOString()
            }
          }

          const courseIndex = state.courses.findIndex(c => c.id === courseId)
          if (courseIndex !== -1) {
            addToCourse(state.courses[courseIndex])
          }

          if (state.currentCourse?.id === courseId) {
            addToCourse(state.currentCourse)
          }

          state.isDirty = true
        })
      },

      deleteActivity: (courseId: string, sessionId: string, activityId: string) => {
        set((state) => {
          const removeFromCourse = (course: Course) => {
            const session = course.sessions.find(s => s.id === sessionId)
            if (session) {
              session.activities = session.activities.filter(a => a.id !== activityId)
              course.updatedAt = new Date().toISOString()
            }
          }

          const courseIndex = state.courses.findIndex(c => c.id === courseId)
          if (courseIndex !== -1) {
            removeFromCourse(state.courses[courseIndex])
          }

          if (state.currentCourse?.id === courseId) {
            removeFromCourse(state.currentCourse)
          }

          state.isDirty = true
        })
      },

      reorderActivities: (courseId: string, sessionId: string, activityIds: string[]) => {
        set((state) => {
          const reorderInCourse = (course: Course) => {
            const session = course.sessions.find(s => s.id === sessionId)
            if (session) {
              const activityMap = new Map(session.activities.map(a => [a.id, a]))
              session.activities = activityIds.map((id, index) => {
                const activity = activityMap.get(id)
                if (activity) {
                  activity.order = index
                  return activity
                }
                return null
              }).filter(Boolean) as Activity[]
              course.updatedAt = new Date().toISOString()
            }
          }

          const courseIndex = state.courses.findIndex(c => c.id === courseId)
          if (courseIndex !== -1) {
            reorderInCourse(state.courses[courseIndex])
          }

          if (state.currentCourse?.id === courseId) {
            reorderInCourse(state.currentCourse)
          }

          state.isDirty = true
        })
      },

      // Bulk operations
      bulkUpdateCourses: (updates: { id: string; data: Partial<Course> }[]) => {
        set((state) => {
          const updateMap = new Map(updates.map(u => [u.id, u.data]))
          
          state.courses.forEach(course => {
            const update = updateMap.get(course.id)
            if (update) {
              Object.assign(course, update, { updatedAt: new Date().toISOString() })
            }
          })

          if (state.currentCourse) {
            const update = updateMap.get(state.currentCourse.id)
            if (update) {
              Object.assign(state.currentCourse, update, { updatedAt: new Date().toISOString() })
            }
          }

          state.isDirty = true
        })
      },

      bulkDeleteCourses: (ids: string[]) => {
        set((state) => {
          const idSet = new Set(ids)
          state.courses = state.courses.filter(course => !idSet.has(course.id))
          
          if (state.currentCourse && idSet.has(state.currentCourse.id)) {
            state.currentCourse = null
          }

          state.pagination.total -= ids.length
          state.isDirty = true
        })
      },

      duplicateCourse: (id: string, newTitle?: string) => {
        const state = get()
        const course = state.courses.find(c => c.id === id)
        if (!course) return null

        const duplicated: Course = {
          ...course,
          id: `course_${Date.now()}`,
          title: newTitle || `${course.title} (Copy)`,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sessions: course.sessions.map(session => ({
            ...session,
            id: `session_${Date.now()}_${Math.random()}`,
            activities: session.activities.map(activity => ({
              ...activity,
              id: `activity_${Date.now()}_${Math.random()}`
            }))
          }))
        }

        get().addCourse(duplicated)
        return duplicated
      },

      // Cache management
      invalidateCache: () => {
        set((state) => {
          state.lastFetch = null
          state.isDirty = true
        })
      },

      markDirty: () => {
        set((state) => {
          state.isDirty = true
        })
      },

      markClean: () => {
        set((state) => {
          state.isDirty = false
        })
      },

      // Computed getters
      getFilteredCourses: () => {
        const state = get()
        let filtered = [...state.courses]

        // Apply search filter
        if (state.filters.search) {
          const search = state.filters.search.toLowerCase()
          filtered = filtered.filter(course =>
            course.title.toLowerCase().includes(search) ||
            course.description.toLowerCase().includes(search)
          )
        }

        // Apply status filter
        if (state.filters.status?.length) {
          filtered = filtered.filter(course =>
            state.filters.status!.includes(course.status)
          )
        }

        // Apply date range filter
        if (state.filters.dateRange) {
          const { start, end } = state.filters.dateRange
          filtered = filtered.filter(course => {
            const courseDate = new Date(course.updatedAt)
            return courseDate >= start && courseDate <= end
          })
        }

        // Apply sorting
        if (state.filters.sortBy) {
          filtered.sort((a, b) => {
            const aVal = a[state.filters.sortBy!]
            const bVal = b[state.filters.sortBy!]
            
            if (state.filters.sortOrder === 'desc') {
              return bVal > aVal ? 1 : -1
            }
            return aVal > bVal ? 1 : -1
          })
        }

        return filtered
      },

      getCourseById: (id: string) => {
        return get().courses.find(course => course.id === id)
      },

      getSessionById: (courseId: string, sessionId: string) => {
        const course = get().getCourseById(courseId)
        return course?.sessions.find(session => session.id === sessionId)
      },

      getActivityById: (courseId: string, sessionId: string, activityId: string) => {
        const session = get().getSessionById(courseId, sessionId)
        return session?.activities.find(activity => activity.id === activityId)
      },
    })),
    {
      name: 'course-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        courses: state.courses,
        currentCourse: state.currentCourse,
        filters: state.filters,
        pagination: state.pagination,
        lastFetch: state.lastFetch,
      }),
    }
  )
)

// Utility hooks
export const useCurrentCourse = () => useCourseStore(state => state.currentCourse)
export const useCourseFilters = () => useCourseStore(state => state.filters)
export const useCoursePagination = () => useCourseStore(state => state.pagination)
export const useCourseLoading = () => useCourseStore(state => state.isLoading)
export const useCourseError = () => useCourseStore(state => state.error)

// Cache validation
export const useCacheValidation = () => {
  const { lastFetch, invalidateCache } = useCourseStore()
  
  const isCacheValid = () => {
    if (!lastFetch) return false
    return Date.now() - lastFetch < CACHE_DURATION
  }
  
  const validateCache = () => {
    if (!isCacheValid()) {
      invalidateCache()
      return false
    }
    return true
  }
  
  return { isCacheValid, validateCache }
}