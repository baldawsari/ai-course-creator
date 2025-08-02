import { useState, useEffect } from 'react'
import type { Course } from '@/types/course'
import { api } from '@/lib/api/endpoints'

export function useCourse(courseId: string) {
  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const courseData = await api.courses.get(courseId)
        setCourse(courseData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        
        // Mock course data for development
        setCourse({
          id: courseId,
          title: 'JavaScript Fundamentals',
          description: 'Learn the basics of JavaScript programming',
          sessions: [
            {
              id: 'session-1',
              title: 'Introduction to JavaScript',
              description: 'Getting started with JavaScript',
              activities: [
                {
                  id: 'activity-1',
                  type: 'text',
                  title: 'What is JavaScript?',
                  content: 'JavaScript is a programming language...',
                  order: 0
                }
              ],
              order: 0
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'draft',
          documentIds: [],
          userId: 'user-1'
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (courseId) {
      fetchCourse()
    }
  }, [courseId])

  const updateCourse = async (updatedCourse: Course) => {
    try {
      const updated = await api.courses.update(courseId, updatedCourse)
      setCourse(updated)
      return updated
    } catch (err) {
      // For development, just update local state
      setCourse(updatedCourse)
      return updatedCourse
    }
  }

  return {
    course,
    isLoading,
    error,
    updateCourse
  }
}