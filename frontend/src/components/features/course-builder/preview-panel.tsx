'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Eye, 
  Monitor, 
  Smartphone, 
  Tablet,
  Book,
  Target,
  Users,
  Clock,
  CheckSquare,
  FileText,
  Palette,
  Maximize2,
  RefreshCw,
  BarChart3
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type BuilderStep = 'upload' | 'configure' | 'generate'
type ViewMode = 'desktop' | 'tablet' | 'mobile'

interface CourseData {
  title?: string
  description?: string
  objectives?: Array<{ id: string; text: string }>
  tags?: string[]
  duration?: number
  difficulty?: string
  assessmentType?: string
  template?: string
  resources?: Array<{ id: string; name: string; type: string; status: string }>
}

interface PreviewPanelProps {
  courseData?: CourseData
  currentStep: BuilderStep
}

const viewModes = [
  { id: 'desktop', icon: Monitor, label: 'Desktop', width: '100%' },
  { id: 'tablet', icon: Tablet, label: 'Tablet', width: '768px' },
  { id: 'mobile', icon: Smartphone, label: 'Mobile', width: '375px' }
] as const

export function PreviewPanel({ courseData, currentStep }: PreviewPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const getPreviewContent = () => {
    switch (currentStep) {
      case 'upload':
        return <ResourcePreview courseData={courseData} />
      case 'configure':
        return <ConfigurationPreview courseData={courseData} />
      case 'generate':
        return <CoursePreview courseData={courseData} />
      default:
        return <DefaultPreview />
    }
  }

  const getCurrentViewWidth = () => {
    const mode = viewModes.find(m => m.id === viewMode)
    return mode?.width || '100%'
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'} flex flex-col`}>
      {/* Preview Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <Eye className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Preview</h3>
          <span className="text-sm text-gray-500 capitalize">
            {currentStep} Step
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {viewModes.map(mode => {
              const Icon = mode.icon
              return (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === mode.id 
                      ? 'bg-white text-purple-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title={mode.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              )
            })}
          </div>

          {/* Refresh */}
          <Button variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Fullscreen Toggle */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="flex justify-center">
          <motion.div
            initial={false}
            animate={{ width: getCurrentViewWidth() }}
            transition={{ duration: 0.3 }}
            className="bg-white shadow-lg rounded-lg overflow-hidden"
            style={{ maxWidth: getCurrentViewWidth(), minHeight: '600px' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {getPreviewContent()}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Preview Footer */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Live Preview • Updates automatically</span>
          <span>{getCurrentViewWidth()} viewport</span>
        </div>
      </div>
    </div>
  )
}

function ResourcePreview({ courseData }: { courseData?: CourseData }) {
  const resources = courseData?.resources || []
  const processedCount = resources.filter(r => r.status === 'completed').length

  return (
    <div className="p-6 space-y-6">
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Course Resources
        </h2>
        <p className="text-gray-600">
          {resources.length > 0 
            ? `${resources.length} resources uploaded, ${processedCount} processed`
            : 'No resources uploaded yet'
          }
        </p>
      </div>

      {resources.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Uploaded Files</h3>
          {resources.map((resource, index) => (
            <div key={resource.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                resource.status === 'completed' ? 'bg-green-500' :
                resource.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{resource.name}</div>
                <div className="text-xs text-gray-500 capitalize">{resource.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t pt-4">
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Upload comprehensive materials for better course generation</p>
          <p>• Supported formats: PDF, DOCX, TXT, URLs</p>
          <p>• Resources will be processed and analyzed for content extraction</p>
        </div>
      </div>
    </div>
  )
}

function ConfigurationPreview({ courseData }: { courseData?: CourseData }) {
  return (
    <div className="p-6 space-y-6">
      {/* Course Header */}
      <div className="text-center py-6 border-b">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {courseData?.title || 'Course Title'}
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {courseData?.description || 'Course description will appear here when you add it in the configuration step.'}
        </p>
        
        {courseData?.tags && courseData.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {courseData.tags.map((tag, index) => (
              <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Course Details */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-4">
          <div className="flex items-center mb-2">
            <Clock className="h-4 w-4 text-blue-500 mr-2" />
            <span className="font-medium text-sm">Duration</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {courseData?.duration || 2} hours
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center mb-2">
            <BarChart3 className="h-4 w-4 text-purple-500 mr-2" />
            <span className="font-medium text-sm">Difficulty</span>
          </div>
          <div className="text-xl font-bold text-gray-900 capitalize">
            {courseData?.difficulty || 'Not set'}
          </div>
        </Card>
      </div>

      {/* Learning Objectives */}
      {courseData?.objectives && courseData.objectives.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Learning Objectives
          </h3>
          <div className="space-y-2">
            {courseData.objectives.map((objective, index) => (
              <div key={objective.id} className="flex items-start">
                <span className="inline-block w-6 h-6 bg-purple-100 text-purple-600 rounded-full text-xs font-medium flex items-center justify-center mr-3 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-gray-700">{objective.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment Info */}
      {courseData?.assessmentType && courseData.assessmentType !== 'none' && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center mb-2">
            <CheckSquare className="h-4 w-4 text-blue-600 mr-2" />
            <span className="font-medium text-blue-900">Assessments Included</span>
          </div>
          <p className="text-blue-800 text-sm">
            This course will include {courseData.assessmentType === 'both' ? 'quizzes and assignments' : courseData.assessmentType}
          </p>
        </Card>
      )}

      <div className="border-t pt-4">
        <div className="text-xs text-gray-500 space-y-1">
          <p>• This preview shows how your course information will be displayed</p>
          <p>• Continue to the generation step to create the actual course content</p>
          <p>• You can return to edit any of these details at any time</p>
        </div>
      </div>
    </div>
  )
}

function CoursePreview({ courseData }: { courseData?: CourseData }) {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Book className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Ready to Generate!
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Your course is configured and ready for AI generation. The final course will include structured content, activities, and assessments.
        </p>
      </div>

      {/* Generation Summary */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <h3 className="font-semibold text-purple-900 mb-3">What will be generated:</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center text-purple-800">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
            Structured course sessions and modules
          </div>
          <div className="flex items-center text-purple-800">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
            Interactive activities and examples
          </div>
          <div className="flex items-center text-purple-800">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
            Knowledge assessments and quizzes
          </div>
          <div className="flex items-center text-purple-800">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
            Professional course materials ready for export
          </div>
        </div>
      </Card>

      {/* Course Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">
            {courseData?.resources?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Resources</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">
            {courseData?.objectives?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Objectives</div>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Generation typically takes 2-5 minutes depending on content complexity</p>
          <p>• You'll be able to preview and edit the generated content</p>
          <p>• Multiple export formats will be available (HTML, PDF, PowerPoint)</p>
        </div>
      </div>
    </div>
  )
}

function DefaultPreview() {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Eye className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Course Preview
        </h2>
        <p className="text-gray-600">
          Complete the course builder steps to see a preview of your course.
        </p>
      </div>
    </div>
  )
}