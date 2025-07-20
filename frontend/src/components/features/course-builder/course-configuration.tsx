'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, 
  Users, 
  Clock, 
  Target, 
  Settings,
  Plus,
  X,
  GripVertical,
  Image,
  Palette,
  BarChart3,
  CheckSquare,
  Upload
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Objective {
  id: string
  text: string
}

interface CourseData {
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
}

interface CourseConfigurationProps {
  courseData?: CourseData
  onUpdate: (data: Partial<CourseData>) => Promise<void>
}

const difficultyLevels = [
  { value: 'beginner', label: 'Beginner', color: 'bg-green-100 text-green-800' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'advanced', label: 'Advanced', color: 'bg-red-100 text-red-800' }
] as const

const assessmentTypes = [
  { value: 'none', label: 'No Assessments', description: 'Pure content delivery' },
  { value: 'quiz', label: 'Quizzes Only', description: 'Interactive questions throughout' },
  { value: 'assignment', label: 'Assignments Only', description: 'Practical exercises and projects' },
  { value: 'both', label: 'Mixed Assessments', description: 'Combination of quizzes and assignments' }
] as const

const templates = [
  { 
    id: 'classic', 
    name: 'Classic Academic', 
    description: 'Traditional course layout with clear sections',
    preview: '/templates/classic.jpg'
  },
  { 
    id: 'modern', 
    name: 'Modern Interactive', 
    description: 'Contemporary design with engaging elements',
    preview: '/templates/modern.jpg'
  },
  { 
    id: 'minimal', 
    name: 'Minimal Clean', 
    description: 'Simple, distraction-free learning experience',
    preview: '/templates/minimal.jpg'
  },
  { 
    id: 'mobile', 
    name: 'Mobile First', 
    description: 'Optimized for mobile and tablet learning',
    preview: '/templates/mobile.jpg'
  }
]

export function CourseConfiguration({ courseData, onUpdate }: CourseConfigurationProps) {
  const [newObjective, setNewObjective] = useState('')
  const [newTag, setNewTag] = useState('')
  const [draggedObjective, setDraggedObjective] = useState<string | null>(null)

  const handleBasicInfoChange = async (field: keyof CourseData, value: any) => {
    await onUpdate({ [field]: value })
  }

  const handleAddObjective = async () => {
    if (!newObjective.trim()) return
    
    const newObj: Objective = {
      id: Date.now().toString(),
      text: newObjective.trim()
    }
    
    const updatedObjectives = [...(courseData?.objectives || []), newObj]
    await onUpdate({ objectives: updatedObjectives })
    setNewObjective('')
  }

  const handleRemoveObjective = async (objectiveId: string) => {
    const updatedObjectives = courseData?.objectives?.filter(obj => obj.id !== objectiveId) || []
    await onUpdate({ objectives: updatedObjectives })
  }

  const handleObjectiveChange = async (objectiveId: string, newText: string) => {
    const updatedObjectives = courseData?.objectives?.map(obj => 
      obj.id === objectiveId ? { ...obj, text: newText } : obj
    ) || []
    await onUpdate({ objectives: updatedObjectives })
  }

  const handleAddTag = async () => {
    if (!newTag.trim()) return
    
    const updatedTags = [...(courseData?.tags || []), newTag.trim()]
    await onUpdate({ tags: updatedTags })
    setNewTag('')
  }

  const handleRemoveTag = async (tagIndex: number) => {
    const updatedTags = courseData?.tags?.filter((_, index) => index !== tagIndex) || []
    await onUpdate({ tags: updatedTags })
  }

  const handleDurationChange = async (value: number) => {
    await onUpdate({ duration: Math.max(0.5, Math.min(100, value)) })
  }

  const sections = [
    {
      id: 'basic',
      title: 'Basic Information',
      icon: BookOpen,
      description: 'Course title, description, and thumbnail'
    },
    {
      id: 'objectives',
      title: 'Learning Objectives',
      icon: Target,
      description: 'What students will learn and achieve'
    },
    {
      id: 'audience',
      title: 'Target Audience',
      icon: Users,
      description: 'Who this course is designed for'
    },
    {
      id: 'structure',
      title: 'Course Structure',
      icon: BarChart3,
      description: 'Duration, difficulty, and assessments'
    },
    {
      id: 'template',
      title: 'Design Template',
      icon: Palette,
      description: 'Choose the visual style for your course'
    }
  ]

  return (
    <div className="space-y-8" data-testid="course-configuration">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure Course</h2>
        <p className="text-gray-600">
          Define your course structure, learning objectives, and target audience.
        </p>
      </div>

      {/* Configuration Sections */}
      <div className="space-y-6">
        {sections.map((section, index) => {
          const Icon = section.icon
          
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden">
                {/* Section Header */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                      <p className="text-sm text-gray-600">{section.description}</p>
                    </div>
                  </div>
                </div>

                {/* Section Content */}
                <div className="p-6">
                  {section.id === 'basic' && (
                    <div className="space-y-6">
                      {/* Course Title */}
                      <div>
                        <Label htmlFor="course-title" className="text-sm font-medium text-gray-700 mb-2 block">
                          Course Title *
                        </Label>
                        <Input
                          id="course-title"
                          data-testid="course-title"
                          type="text"
                          placeholder="Enter your course title"
                          value={courseData?.title || ''}
                          onChange={(e) => handleBasicInfoChange('title', e.target.value)}
                          className="text-lg font-medium"
                        />
                      </div>

                      {/* Course Description */}
                      <div>
                        <Label htmlFor="course-description" className="text-sm font-medium text-gray-700 mb-2 block">
                          Course Description *
                        </Label>
                        <textarea
                          id="course-description"
                          data-testid="course-description"
                          rows={4}
                          placeholder="Provide a detailed description of your course content and goals..."
                          value={courseData?.description || ''}
                          onChange={(e) => handleBasicInfoChange('description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      {/* Course Thumbnail */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Course Thumbnail
                        </Label>
                        <div className="flex items-center space-x-4">
                          <div className="w-24 h-16 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                            {courseData?.thumbnail ? (
                              <img 
                                src={courseData.thumbnail} 
                                alt="Course thumbnail" 
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Image className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            <Upload className="h-4 w-4 mr-1" />
                            Upload Image
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {section.id === 'objectives' && (
                    <div className="space-y-4">
                      {/* Existing Objectives */}
                      {courseData?.objectives && courseData.objectives.length > 0 && (
                        <div className="space-y-3">
                          <AnimatePresence>
                            {courseData.objectives.map((objective, index) => (
                              <motion.div
                                key={objective.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                              >
                                <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                                <div className="flex-1">
                                  <Input
                                    data-testid={`objective-input-${index}`}
                                    value={objective.text}
                                    onChange={(e) => handleObjectiveChange(objective.id, e.target.value)}
                                    placeholder={`Learning objective ${index + 1}`}
                                    className="border-none bg-transparent p-0 focus:ring-0"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveObjective(objective.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Add New Objective */}
                      <div className="flex items-center space-x-3">
                        <Input
                          data-testid="objective-input-new"
                          value={newObjective}
                          onChange={(e) => setNewObjective(e.target.value)}
                          placeholder="Add a learning objective..."
                          onKeyPress={(e) => e.key === 'Enter' && handleAddObjective()}
                        />
                        <Button data-testid="add-objective-button" onClick={handleAddObjective} disabled={!newObjective.trim()}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>

                      <div className="text-sm text-gray-500">
                        <p>Examples:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Understand the fundamentals of React development</li>
                          <li>Build interactive web applications using modern tools</li>
                          <li>Deploy applications to production environments</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {section.id === 'audience' && (
                    <div className="space-y-4">
                      {/* Target Audience Tags */}
                      {courseData?.tags && courseData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {courseData.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full"
                            >
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(index)}
                                className="ml-2 text-purple-600 hover:text-purple-800"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Add Target Audience */}
                      <div className="flex items-center space-x-3">
                        <Input
                          data-testid="target-audience"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add target audience (e.g., 'Web Developers', 'Students')"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                        />
                        <Button onClick={handleAddTag} disabled={!newTag.trim()}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>

                      <div className="text-sm text-gray-500">
                        <p>Common audiences:</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {['Beginners', 'Students', 'Professionals', 'Developers', 'Managers', 'Consultants'].map(audience => (
                            <button
                              key={audience}
                              onClick={() => setNewTag(audience)}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              {audience}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {section.id === 'structure' && (
                    <div className="space-y-6">
                      {/* Duration */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">
                          Estimated Duration
                        </Label>
                        <div className="flex items-center space-x-4">
                          <input
                            type="range"
                            min="0.5"
                            max="100"
                            step="0.5"
                            value={courseData?.duration || 2}
                            onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                          <div className="flex items-center space-x-2 min-w-0">
                            <Input
                              type="number"
                              data-testid="duration-input"
                              value={courseData?.duration || 2}
                              onChange={(e) => handleDurationChange(parseFloat(e.target.value) || 2)}
                              className="w-20 text-center"
                              min="0.5"
                              max="100"
                              step="0.5"
                            />
                            <span className="text-sm text-gray-500">hours</span>
                          </div>
                        </div>
                      </div>

                      {/* Difficulty Level */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">
                          Difficulty Level
                        </Label>
                        <div className="grid grid-cols-3 gap-3">
                          {difficultyLevels.map(level => (
                            <button
                              key={level.value}
                              data-testid={`difficulty-${level.value}`}
                              onClick={() => handleBasicInfoChange('difficulty', level.value)}
                              className={`p-3 text-center rounded-lg border-2 transition-all ${
                                courseData?.difficulty === level.value
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-1 ${level.color}`}>
                                {level.label}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Assessment Type */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">
                          Assessment Type
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          {assessmentTypes.map(type => (
                            <button
                              key={type.value}
                              onClick={() => handleBasicInfoChange('assessmentType', type.value)}
                              className={`p-4 text-left rounded-lg border-2 transition-all ${
                                courseData?.assessmentType === type.value
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="font-medium text-sm text-gray-900 mb-1">
                                {type.label}
                              </div>
                              <div className="text-xs text-gray-500">
                                {type.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {section.id === 'template' && (
                    <div>
                      <div className="grid grid-cols-2 gap-4">
                        {templates.map(template => (
                          <button
                            key={template.id}
                            onClick={() => handleBasicInfoChange('template', template.id)}
                            className={`p-4 text-left rounded-lg border-2 transition-all ${
                              courseData?.template === template.id
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                              <Image className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="font-medium text-sm text-gray-900 mb-1">
                              {template.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {template.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Configuration Summary */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <h3 className="font-medium text-purple-900 mb-4">Configuration Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-purple-600 font-medium">Title</div>
            <div className="text-gray-700">{courseData?.title || 'Not set'}</div>
          </div>
          <div>
            <div className="text-purple-600 font-medium">Duration</div>
            <div className="text-gray-700">{courseData?.duration || 2} hours</div>
          </div>
          <div>
            <div className="text-purple-600 font-medium">Objectives</div>
            <div className="text-gray-700">{courseData?.objectives?.length || 0} defined</div>
          </div>
          <div>
            <div className="text-purple-600 font-medium">Difficulty</div>
            <div className="text-gray-700 capitalize">{courseData?.difficulty || 'Not set'}</div>
          </div>
        </div>
      </Card>

      {/* Next Step Button */}
      <div className="flex justify-end mt-6">
        <Button
          size="lg"
          disabled={!courseData?.title || !courseData?.description || (courseData?.objectives?.length || 0) === 0}
          data-testid="next-step-button"
          className="bg-purple-600 hover:bg-purple-700"
        >
          Next Step
        </Button>
      </div>
    </div>
  )
}