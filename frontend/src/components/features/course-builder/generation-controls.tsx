'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Settings, 
  DollarSign, 
  Clock, 
  Zap,
  BarChart3,
  FileText,
  CheckCircle,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface GenerationJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  startTime: Date
  endTime?: Date
  estimatedTokens: number
  actualTokens?: number
  cost?: number
}

interface CourseData {
  title?: string
  description?: string
  resources?: any[]
  objectives?: any[]
  difficulty?: string
  duration?: number
  assessmentType?: string
}

interface GenerationControlsProps {
  courseData?: CourseData
  onGenerate: (options: GenerationOptions) => Promise<void>
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

const modelOptions = [
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    description: 'Fast and efficient, perfect for basic courses',
    tokensPerHour: 15000,
    costPer1KTokens: 0.25,
    speed: 'Fast',
    quality: 'Good',
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    description: 'Balanced performance and quality',
    tokensPerHour: 25000,
    costPer1KTokens: 3.00,
    speed: 'Medium',
    quality: 'Excellent',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    description: 'Highest quality for complex courses',
    tokensPerHour: 35000,
    costPer1KTokens: 15.00,
    speed: 'Slower',
    quality: 'Superior',
    color: 'bg-purple-100 text-purple-800'
  }
] as const

export function GenerationControls({ courseData, onGenerate }: GenerationControlsProps) {
  const [options, setOptions] = useState<GenerationOptions>({
    model: 'claude-3-sonnet',
    creativity: 0.7,
    includeActivities: true,
    includeAssessments: true,
    sessionCount: Math.ceil((courseData?.duration || 2) * 2), // 2 sessions per hour
    interactivityLevel: 'medium',
    customInstructions: ''
  })

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationHistory, setGenerationHistory] = useState<GenerationJob[]>([])
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState(0)

  // Calculate estimates when options change
  useEffect(() => {
    const selectedModel = modelOptions.find(m => m.id === options.model)
    if (!selectedModel || !courseData) return

    const resourceCount = courseData.resources?.length || 0
    const objectiveCount = courseData.objectives?.length || 0
    const baseDuration = courseData.duration || 2

    // Estimate tokens based on content complexity
    const baseTokens = baseDuration * selectedModel.tokensPerHour
    const resourceMultiplier = 1 + (resourceCount * 0.2)
    const objectiveMultiplier = 1 + (objectiveCount * 0.1)
    const sessionMultiplier = options.sessionCount / (baseDuration * 2)
    const activityMultiplier = options.includeActivities ? 1.3 : 1
    const assessmentMultiplier = options.includeAssessments ? 1.2 : 1
    const interactivityMultiplier = 
      options.interactivityLevel === 'high' ? 1.4 :
      options.interactivityLevel === 'medium' ? 1.2 : 1

    const estimatedTokens = Math.round(
      baseTokens * 
      resourceMultiplier * 
      objectiveMultiplier * 
      sessionMultiplier * 
      activityMultiplier * 
      assessmentMultiplier * 
      interactivityMultiplier
    )

    const cost = (estimatedTokens / 1000) * selectedModel.costPer1KTokens
    const timeInMinutes = Math.ceil(estimatedTokens / 1000) // Rough estimate

    setEstimatedCost(cost)
    setEstimatedTime(timeInMinutes)
  }, [options, courseData])

  const handleGenerate = async () => {
    setIsGenerating(true)
    
    const newJob: GenerationJob = {
      id: Date.now().toString(),
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      estimatedTokens: estimatedCost * 1000 / modelOptions.find(m => m.id === options.model)!.costPer1KTokens
    }
    
    setGenerationHistory(prev => [newJob, ...prev])
    
    try {
      await onGenerate(options)
      // Update job status to completed
      setGenerationHistory(prev => 
        prev.map(job => 
          job.id === newJob.id 
            ? { ...job, status: 'completed', progress: 100, endTime: new Date() }
            : job
        )
      )
    } catch (error) {
      // Update job status to failed
      setGenerationHistory(prev => 
        prev.map(job => 
          job.id === newJob.id 
            ? { ...job, status: 'failed', endTime: new Date() }
            : job
        )
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const canGenerate = () => {
    return courseData?.title && 
           courseData?.resources && 
           courseData.resources.length > 0 &&
           courseData?.objectives &&
           courseData.objectives.length > 0
  }

  const getReadinessScore = () => {
    let score = 0
    const checks = [
      { condition: !!courseData?.title, weight: 20, label: 'Course title' },
      { condition: !!courseData?.description, weight: 15, label: 'Course description' },
      { condition: (courseData?.resources?.length || 0) > 0, weight: 25, label: 'Resources uploaded' },
      { condition: (courseData?.objectives?.length || 0) > 0, weight: 20, label: 'Learning objectives' },
      { condition: !!courseData?.difficulty, weight: 10, label: 'Difficulty level' },
      { condition: !!courseData?.assessmentType, weight: 10, label: 'Assessment type' }
    ]
    
    const passedChecks = checks.filter(check => check.condition)
    score = passedChecks.reduce((sum, check) => sum + check.weight, 0)
    
    return { score, checks, passedChecks }
  }

  const readiness = getReadinessScore()

  return (
    <div className="space-y-6" data-testid="generation-controls">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate Course</h2>
        <p className="text-gray-600">
          Configure AI settings and generate your course content.
        </p>
      </div>

      {/* Readiness Check */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            Readiness Check
          </h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">{readiness.score}%</div>
            <div className="text-sm text-gray-500">Ready to generate</div>
          </div>
        </div>

        <div className="space-y-3">
          {readiness.checks.map((check, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                {check.condition ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                )}
                <span className={`text-sm ${check.condition ? 'text-gray-900' : 'text-gray-500'}`}>
                  {check.label}
                </span>
              </div>
              <span className="text-xs text-gray-500">{check.weight}%</span>
            </div>
          ))}
        </div>

        {readiness.score < 100 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <Info className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
              <div className="text-sm text-yellow-800">
                Complete the missing items above to improve generation quality and unlock all features.
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Model Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Model Selection</h3>
        <div className="grid gap-4">
          {modelOptions.map(model => (
            <button
              key={model.id}
              data-testid={`model-${model.id.split('-').pop()}`}
              onClick={() => setOptions(prev => ({ ...prev, model: model.id }))}
              className={`p-4 text-left rounded-lg border-2 transition-all ${
                options.model === model.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${model.color}`}>
                    {model.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ${model.costPer1KTokens}/1K tokens
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Speed: {model.speed}</span>
                  <span>Quality: {model.quality}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">{model.description}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Generation Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Settings</h3>
        
        <div className="space-y-6">
          {/* Session Count */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Number of Sessions: {options.sessionCount}
            </Label>
            <input
              type="range"
              min="1"
              max="20"
              value={options.sessionCount}
              onChange={(e) => setOptions(prev => ({ ...prev, sessionCount: parseInt(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              data-testid="session-count-input"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 session</span>
              <span>20 sessions</span>
            </div>
          </div>

          {/* Creativity Level */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Creativity Level: {Math.round(options.creativity * 100)}%
            </Label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={options.creativity}
              onChange={(e) => setOptions(prev => ({ ...prev, creativity: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              data-testid="creativity-slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Conservative</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Content Options */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={options.includeActivities}
                onChange={(e) => setOptions(prev => ({ ...prev, includeActivities: e.target.checked }))}
                className="mr-3"
                data-testid="include-activities-checkbox"
              />
              <div>
                <div className="font-medium text-sm">Include Activities</div>
                <div className="text-xs text-gray-500">Hands-on exercises and examples</div>
              </div>
            </label>

            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={options.includeAssessments}
                onChange={(e) => setOptions(prev => ({ ...prev, includeAssessments: e.target.checked }))}
                className="mr-3"
                data-testid="include-assessments-checkbox"
              />
              <div>
                <div className="font-medium text-sm">Include Assessments</div>
                <div className="text-xs text-gray-500">Quizzes and knowledge checks</div>
              </div>
            </label>
          </div>

          {/* Interactivity Level */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Interactivity Level
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {(['low', 'medium', 'high'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setOptions(prev => ({ ...prev, interactivityLevel: level }))}
                  className={`p-3 text-center rounded-lg border-2 transition-all ${
                    options.interactivityLevel === level
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm capitalize">{level}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {level === 'low' && 'Basic content delivery'}
                    {level === 'medium' && 'Some interactive elements'}
                    {level === 'high' && 'Highly interactive experience'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="mt-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-purple-600 hover:text-purple-700"
          >
            {showAdvanced ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
            Advanced Options
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-4"
              >
                <div>
                  <Label htmlFor="custom-instructions" className="text-sm font-medium text-gray-700 mb-2 block">
                    Custom Instructions
                  </Label>
                  <textarea
                    id="custom-instructions"
                    rows={3}
                    placeholder="Add specific instructions for content generation..."
                    value={options.customInstructions}
                    onChange={(e) => setOptions(prev => ({ ...prev, customInstructions: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Cost & Time Estimation */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-purple-200">
        <h3 className="text-lg font-semibold text-purple-900 mb-4">Generation Estimate</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">${estimatedCost.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Estimated Cost</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{estimatedTime}min</div>
            <div className="text-sm text-gray-600">Estimated Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{options.sessionCount}</div>
            <div className="text-sm text-gray-600">Sessions</div>
          </div>
        </div>
      </Card>

      {/* Generation Button */}
      <Card className="p-6 text-center">
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={!canGenerate() || isGenerating}
          className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          data-testid="generate-course-button"
        >
          {isGenerating ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Generating Course...
            </div>
          ) : (
            <div className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2" />
              Generate Course with AI
              <Play className="h-5 w-5 ml-2" />
            </div>
          )}
        </Button>

        {!canGenerate() && (
          <p className="text-sm text-gray-500 mt-2">
            Complete the configuration steps to enable generation
          </p>
        )}
      </Card>

      {/* Generation History */}
      {generationHistory.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <History className="h-5 w-5 mr-2" />
            Generation History
          </h3>
          <div className="space-y-3">
            {generationHistory.slice(0, 5).map(job => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    job.status === 'completed' ? 'bg-green-500' :
                    job.status === 'failed' ? 'bg-red-500' :
                    job.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                    'bg-gray-400'
                  }`} />
                  <div>
                    <div className="text-sm font-medium">
                      {job.startTime.toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {job.status === 'completed' && job.actualTokens && 
                        `${job.actualTokens.toLocaleString()} tokens used`}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {job.status === 'processing' ? `${job.progress}%` : job.status}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}