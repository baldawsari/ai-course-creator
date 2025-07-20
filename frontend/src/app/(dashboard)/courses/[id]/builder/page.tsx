'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Settings, 
  Play, 
  History,
  Save,
  Undo,
  Redo,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StepIndicator } from '@/components/features/course-builder/step-indicator'
import { ResourceUpload } from '@/components/features/course-builder/resource-upload'
import { CourseConfiguration } from '@/components/features/course-builder/course-configuration'
import { GenerationControls } from '@/components/features/course-builder/generation-controls'
import { PreviewPanel } from '@/components/features/course-builder/preview-panel'
import { useCourseBuilder } from '@/hooks/useCourseBuilder'

export type BuilderStep = 'upload' | 'configure' | 'generate'

const steps = [
  { id: 'upload', title: 'Upload Resources', icon: FileText },
  { id: 'configure', title: 'Configure Course', icon: Settings },
  { id: 'generate', title: 'Generate Content', icon: Play }
] as const

export default function CourseBuilderPage() {
  const params = useParams()
  const courseId = params.id as string
  
  const [currentStep, setCurrentStep] = useState<BuilderStep>('upload')
  const [showPreview, setShowPreview] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  
  const {
    courseData,
    updateCourse,
    uploadFiles,
    generateCourse,
    canUndo,
    canRedo,
    undo,
    redo,
    isLoading,
    error
  } = useCourseBuilder(courseId)

  // Auto-save functionality
  useEffect(() => {
    const autoSave = async () => {
      if (courseData && courseData.isDirty) {
        setAutoSaveStatus('saving')
        try {
          await updateCourse(courseData)
          setAutoSaveStatus('saved')
        } catch (error) {
          setAutoSaveStatus('error')
        }
      }
    }

    const timer = setTimeout(autoSave, 2000) // Auto-save after 2 seconds of inactivity
    return () => clearTimeout(timer)
  }, [courseData, updateCourse])

  const handleStepChange = (step: BuilderStep) => {
    setCurrentStep(step)
  }

  const handleNextStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id)
    }
  }

  const handlePrevStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id)
    }
  }

  const canProceedToNext = () => {
    switch (currentStep) {
      case 'upload':
        return courseData?.resources && courseData.resources.length > 0
      case 'configure':
        return courseData?.title && courseData?.description
      case 'generate':
        return true
      default:
        return false
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course builder...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Course</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.history.back()}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {courseData?.title || 'New Course'}
              </h1>
              <p className="text-sm text-gray-500">
                Course Builder • Step {steps.findIndex(s => s.id === currentStep) + 1} of {steps.length}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Auto-save Status */}
            <div className="flex items-center text-sm">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                autoSaveStatus === 'saved' ? 'bg-green-500' : 
                autoSaveStatus === 'saving' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-gray-600">
                {autoSaveStatus === 'saved' ? 'Saved' : 
                 autoSaveStatus === 'saving' ? 'Saving...' : 'Save failed'}
              </span>
            </div>

            {/* Undo/Redo */}
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
            </div>

            {/* Preview Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center"
            >
              <Eye className="h-4 w-4 mr-1" />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>

            {/* History */}
            <Button variant="ghost" size="sm">
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Step Indicator - Fixed Left Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 min-h-screen">
          <StepIndicator
            steps={steps}
            currentStep={currentStep}
            onStepChange={handleStepChange}
            courseData={courseData}
          />
        </div>

        {/* Main Content Area */}
        <div className={`flex-1 ${showPreview ? 'flex' : ''}`}>
          {/* Form Panel */}
          <div className={`${showPreview ? 'w-1/2 border-r border-gray-200' : 'w-full'} min-h-screen bg-gray-50`}>
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {currentStep === 'upload' && (
                    <ResourceUpload
                      courseId={courseId}
                      resources={courseData?.resources || []}
                      onUpload={uploadFiles}
                      onUpdate={async (resources) => {
                        await updateCourse({ resources })
                      }}
                    />
                  )}

                  {currentStep === 'configure' && (
                    <CourseConfiguration
                      courseData={courseData}
                      onUpdate={async (data) => {
                        await updateCourse(data)
                      }}
                    />
                  )}

                  {currentStep === 'generate' && (
                    <GenerationControls
                      courseData={courseData}
                      onGenerate={generateCourse}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Footer */}
              <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={currentStep === 'upload'}
                  className="flex items-center"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    onClick={() => courseData && updateCourse(courseData)}
                    disabled={autoSaveStatus === 'saving' || !courseData}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save Draft
                  </Button>

                  {currentStep !== 'generate' ? (
                    <Button
                      onClick={handleNextStep}
                      disabled={!canProceedToNext()}
                      className="flex items-center"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => generateCourse({
                        model: 'claude-3-sonnet',
                        creativity: 0.7,
                        includeActivities: true,
                        includeAssessments: true,
                        sessionCount: 8,
                        interactivityLevel: 'medium'
                      })}
                      disabled={!courseData || !canProceedToNext()}
                      className="bg-purple-600 hover:bg-purple-700 text-white flex items-center"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Generate Course
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="w-1/2 bg-white">
              <PreviewPanel
                courseData={courseData}
                currentStep={currentStep}
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            size="lg"
            className="rounded-full w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-6 w-6" />
          </Button>
        </motion.div>
        
        {autoSaveStatus === 'error' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <Button
              size="lg"
              variant="destructive"
              className="rounded-full w-14 h-14 shadow-lg"
              onClick={() => courseData && updateCourse(courseData)}
            >
              <Save className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}