'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function NewCoursePage() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [courseData, setCourseData] = useState({
    title: '',
    description: ''
  })

  const handleCreateCourse = async () => {
    if (!courseData.title.trim()) return

    setIsCreating(true)
    
    try {
      // Simulate course creation - in real app this would call API
      const newCourseId = `course-${Date.now()}`
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Redirect to course builder
      router.push(`/courses/${newCourseId}/builder`)
    } catch (error) {
      console.error('Failed to create course:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const canCreate = courseData.title.trim().length > 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Course</h1>
          <p className="text-gray-600 mt-1">
            Get started by giving your course a name and description
          </p>
        </div>
      </div>

      {/* Course Creation Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-8">
          <div className="space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="course-title" className="text-sm font-medium text-gray-700 mb-2 block">
                  Course Title *
                </Label>
                <Input
                  id="course-title"
                  type="text"
                  placeholder="e.g., Introduction to Machine Learning"
                  value={courseData.title}
                  onChange={(e) => setCourseData(prev => ({ ...prev, title: e.target.value }))}
                  className="text-lg"
                />
              </div>

              <div>
                <Label htmlFor="course-description" className="text-sm font-medium text-gray-700 mb-2 block">
                  Course Description
                </Label>
                <textarea
                  id="course-description"
                  rows={4}
                  placeholder="Provide a brief description of what students will learn..."
                  value={courseData.description}
                  onChange={(e) => setCourseData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Create Button */}
            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                onClick={handleCreateCourse}
                disabled={!canCreate || isCreating}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8"
              >
                {isCreating ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Course...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Course
                  </div>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Next Steps Preview */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <h3 className="font-semibold text-purple-900 mb-3">What happens next?</h3>
        <div className="space-y-2 text-sm text-purple-800">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
            Upload your course materials (PDFs, documents, URLs)
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
            Configure course settings and learning objectives
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
            Generate structured course content with AI
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
            Export to multiple formats (HTML, PDF, PowerPoint)
          </div>
        </div>
      </Card>
    </div>
  )
}