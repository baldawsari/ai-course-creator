'use client'

import { motion } from 'framer-motion'
import { Check, CircleDot, FileText, Settings, Play } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export type BuilderStep = 'upload' | 'configure' | 'generate'

interface StepData {
  id: BuilderStep
  title: string
  icon: React.ComponentType<any>
}

interface StepIndicatorProps {
  steps: readonly StepData[]
  currentStep: BuilderStep
  onStepChange: (step: BuilderStep) => void
  courseData?: any
}

export function StepIndicator({ 
  steps, 
  currentStep, 
  onStepChange, 
  courseData 
}: StepIndicatorProps) {
  
  const getStepStatus = (stepId: BuilderStep): 'completed' | 'current' | 'pending' => {
    const currentIndex = steps.findIndex(s => s.id === currentStep)
    const stepIndex = steps.findIndex(s => s.id === stepId)
    
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'pending'
  }

  const isStepAccessible = (stepId: BuilderStep): boolean => {
    switch (stepId) {
      case 'upload':
        return true
      case 'configure':
        return courseData?.resources && courseData.resources.length > 0
      case 'generate':
        return courseData?.title && courseData?.description && 
               courseData?.resources && courseData.resources.length > 0
      default:
        return false
    }
  }

  const getStepProgress = (stepId: BuilderStep): number => {
    switch (stepId) {
      case 'upload':
        return courseData?.resources?.length > 0 ? 100 : 0
      case 'configure':
        const configFields = ['title', 'description', 'objectives', 'targetAudience']
        const completedFields = configFields.filter(field => 
          courseData?.[field] && 
          (typeof courseData[field] === 'string' ? courseData[field].length > 0 : courseData[field].length > 0)
        ).length
        return Math.round((completedFields / configFields.length) * 100)
      case 'generate':
        return courseData?.generated ? 100 : 0
      default:
        return 0
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Course Builder</h2>
        <p className="text-sm text-gray-500">Follow these steps to create your course</p>
      </div>

      {/* Progress Overview */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {Math.round(steps.reduce((acc, step) => acc + getStepProgress(step.id), 0) / steps.length)}%
          </div>
          <div className="text-sm text-gray-600">Overall Progress</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <motion.div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ 
                width: `${Math.round(steps.reduce((acc, step) => acc + getStepProgress(step.id), 0) / steps.length)}%` 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id)
          const isAccessible = isStepAccessible(step.id)
          const progress = getStepProgress(step.id)
          const Icon = step.icon

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Button
                variant="ghost"
                className={`w-full p-4 h-auto justify-start relative ${
                  status === 'current' 
                    ? 'bg-purple-50 border border-purple-200 text-purple-700' 
                    : status === 'completed'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'hover:bg-gray-50 text-gray-600'
                } ${!isAccessible ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => isAccessible && onStepChange(step.id)}
                disabled={!isAccessible}
              >
                <div className="flex items-center w-full">
                  {/* Step Icon/Status */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                    status === 'completed' 
                      ? 'bg-green-100 text-green-600' 
                      : status === 'current'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {status === 'completed' ? (
                      <Check className="h-5 w-5" />
                    ) : status === 'current' ? (
                      <CircleDot className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{step.title}</span>
                      <span className="text-xs font-semibold">{progress}%</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <motion.div
                        className={`h-1.5 rounded-full ${
                          status === 'completed' ? 'bg-green-500' :
                          status === 'current' ? 'bg-purple-500' : 'bg-gray-300'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      />
                    </div>

                    {/* Step Description */}
                    <div className="text-xs text-gray-500 mt-1">
                      {step.id === 'upload' && 'Upload documents, PDFs, and URLs'}
                      {step.id === 'configure' && 'Set course details and objectives'}
                      {step.id === 'generate' && 'Generate course content with AI'}
                    </div>
                  </div>
                </div>

                {/* Current Step Indicator */}
                {status === 'current' && (
                  <motion.div
                    className="absolute left-0 top-0 w-1 h-full bg-purple-500 rounded-r"
                    layoutId="currentStep"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Button>

              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="flex justify-center py-2">
                  <div className={`w-0.5 h-4 ${
                    getStepStatus(steps[index + 1].id) !== 'pending' ? 'bg-green-300' : 'bg-gray-200'
                  }`} />
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Step Details */}
      <Card className="p-4 bg-gray-50">
        <h3 className="font-medium text-gray-900 mb-2">Current Step</h3>
        <div className="text-sm text-gray-600 space-y-2">
          {currentStep === 'upload' && (
            <div>
              <p className="font-medium">Upload Resources</p>
              <p>Add documents, PDFs, Word files, or URLs that will be used to generate your course content.</p>
              <div className="mt-2 text-xs">
                • Supported formats: PDF, DOCX, TXT, URLs
                • Maximum file size: 10MB per file
                • Recommended: 3-10 source documents
              </div>
            </div>
          )}
          
          {currentStep === 'configure' && (
            <div>
              <p className="font-medium">Configure Course</p>
              <p>Define your course structure, learning objectives, and target audience.</p>
              <div className="mt-2 text-xs">
                • Course title and description
                • Learning objectives
                • Target audience and difficulty
                • Assessment preferences
              </div>
            </div>
          )}
          
          {currentStep === 'generate' && (
            <div>
              <p className="font-medium">Generate Content</p>
              <p>Use AI to create structured course materials from your uploaded resources.</p>
              <div className="mt-2 text-xs">
                • AI-powered content generation
                • Interactive activities and assessments
                • Multiple export formats available
                • Estimated generation time: 2-5 minutes
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-blue-600">
            {courseData?.resources?.length || 0}
          </div>
          <div className="text-xs text-gray-500">Resources</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-purple-600">
            {courseData?.estimatedDuration || 0}h
          </div>
          <div className="text-xs text-gray-500">Duration</div>
        </Card>
      </div>
    </div>
  )
}