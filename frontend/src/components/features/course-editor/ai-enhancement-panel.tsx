'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Lightbulb,
  BookOpen,
  Users,
  Trophy,
  MessageSquare,
  CheckCircle,
  XCircle,
  RefreshCw,
  Copy,
  Wand2,
  Brain,
  Target,
  Zap,
  FileText,
  Code,
  Image,
  Play,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Session, Activity } from '@/types/course'

interface AISuggestion {
  id: string
  type: 'enhance' | 'add_example' | 'improve_clarity' | 'generate_activity' | 'create_assessment'
  title: string
  description: string
  content: string
  confidence: number
  status: 'pending' | 'applied' | 'rejected'
  originalContent?: string
  metadata?: Record<string, any>
}

interface AIEnhancementPanelProps {
  courseId: string
  selectedSession: Session | null
  selectedActivity: string | null
  onApplySuggestion: (suggestion: AISuggestion) => void
}

const suggestionTypes = [
  {
    id: 'enhance',
    label: 'Enhance Content',
    icon: Wand2,
    color: 'text-purple-600',
    description: 'Improve writing, add details, fix grammar'
  },
  {
    id: 'add_example',
    label: 'Add Examples',
    icon: Lightbulb,
    color: 'text-yellow-600',
    description: 'Add practical examples and use cases'
  },
  {
    id: 'improve_clarity',
    label: 'Improve Clarity',
    icon: Target,
    color: 'text-blue-600',
    description: 'Make content clearer and easier to understand'
  },
  {
    id: 'generate_activity',
    label: 'Generate Activities',
    icon: Trophy,
    color: 'text-green-600',
    description: 'Create interactive exercises and activities'
  },
  {
    id: 'create_assessment',
    label: 'Create Assessments',
    icon: BookOpen,
    color: 'text-red-600',
    description: 'Generate quizzes and assessment questions'
  }
]

export function AIEnhancementPanel({
  courseId,
  selectedSession,
  selectedActivity,
  onApplySuggestion
}: AIEnhancementPanelProps) {
  const [activeTab, setActiveTab] = useState('suggestions')
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [selectedSuggestionType, setSelectedSuggestionType] = useState<string>('enhance')

  // Mock suggestions for demo
  useEffect(() => {
    if (selectedSession && selectedActivity) {
      setSuggestions([
        {
          id: '1',
          type: 'enhance',
          title: 'Enhance Introduction',
          description: 'Add more engaging opening and context',
          content: 'Welcome to this comprehensive lesson on JavaScript fundamentals. In today\'s fast-paced digital world, JavaScript has become the backbone of modern web development...',
          confidence: 0.89,
          status: 'pending',
          originalContent: 'Introduction to JavaScript basics.'
        },
        {
          id: '2',
          type: 'add_example',
          title: 'Add Practical Example',
          description: 'Include a real-world code example',
          content: '```javascript\n// Example: Creating a simple todo list\nconst todos = [];\n\nfunction addTodo(task) {\n  todos.push({ id: Date.now(), task, completed: false });\n}\n\naddTodo("Learn JavaScript");\nconsole.log(todos);\n```',
          confidence: 0.92,
          status: 'pending'
        },
        {
          id: '3',
          type: 'generate_activity',
          title: 'Interactive Quiz',
          description: 'Create a quiz to test understanding',
          content: 'Quiz: JavaScript Fundamentals\n\n1. What is the correct way to declare a variable in JavaScript?\na) var name = "John"\nb) variable name = "John"\nc) let name = "John"\nd) Both a and c\n\nCorrect answer: d',
          confidence: 0.85,
          status: 'pending'
        }
      ])
    }
  }, [selectedSession, selectedActivity])

  const generateSuggestions = async (type: string) => {
    setIsGenerating(true)
    
    // Simulate AI generation
    setTimeout(() => {
      const newSuggestion: AISuggestion = {
        id: Date.now().toString(),
        type: type as any,
        title: `Generated ${suggestionTypes.find(t => t.id === type)?.label}`,
        description: `AI-generated suggestion for ${type}`,
        content: 'This is a sample AI-generated content enhancement...',
        confidence: Math.random() * 0.3 + 0.7,
        status: 'pending'
      }
      
      setSuggestions(prev => [newSuggestion, ...prev])
      setIsGenerating(false)
    }, 2000)
  }

  const applySuggestion = (suggestion: AISuggestion) => {
    setSuggestions(prev => 
      prev.map(s => 
        s.id === suggestion.id 
          ? { ...s, status: 'applied' } 
          : s
      )
    )
    onApplySuggestion(suggestion)
  }

  const rejectSuggestion = (suggestionId: string) => {
    setSuggestions(prev => 
      prev.map(s => 
        s.id === suggestionId 
          ? { ...s, status: 'rejected' } 
          : s
      )
    )
  }

  const renderSuggestionCard = (suggestion: AISuggestion) => {
    const suggestionType = suggestionTypes.find(t => t.id === suggestion.type)
    const Icon = suggestionType?.icon || Sparkles

    return (
      <motion.div
        key={suggestion.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className={cn(
          "p-4 transition-all duration-200 hover:shadow-md",
          suggestion.status === 'applied' && "border-green-200 bg-green-50",
          suggestion.status === 'rejected' && "border-red-200 bg-red-50 opacity-60"
        )}>
          <div className="flex items-start space-x-3">
            <div className={cn(
              "p-2 rounded-lg",
              suggestionType?.color.replace('text-', 'bg-').replace('600', '100'),
              suggestionType?.color
            )}>
              <Icon className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">
                  {suggestion.title}
                </h4>
                <Badge 
                  variant="secondary"
                  className={cn(
                    suggestion.confidence > 0.8 && "bg-green-100 text-green-700",
                    suggestion.confidence > 0.6 && suggestion.confidence <= 0.8 && "bg-yellow-100 text-yellow-700",
                    suggestion.confidence <= 0.6 && "bg-red-100 text-red-700"
                  )}
                >
                  {Math.round(suggestion.confidence * 100)}%
                </Badge>
              </div>
              
              <p className="text-xs text-gray-600 mb-3">
                {suggestion.description}
              </p>
              
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="text-xs text-gray-600 mb-1">Preview:</div>
                <div className="text-sm text-gray-900 line-clamp-3">
                  {suggestion.content}
                </div>
              </div>
              
              {suggestion.originalContent && (
                <div className="bg-red-50 rounded-lg p-3 mb-3">
                  <div className="text-xs text-red-600 mb-1">Original:</div>
                  <div className="text-sm text-gray-700 line-clamp-2">
                    {suggestion.originalContent}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {suggestion.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => applySuggestion(suggestion)}
                        className="h-7 px-3 text-xs"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Apply
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => rejectSuggestion(suggestion.id)}
                        className="h-7 px-3 text-xs"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  
                  {suggestion.status === 'applied' && (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Applied
                    </Badge>
                  )}
                  
                  {suggestion.status === 'rejected' && (
                    <Badge variant="destructive" className="text-xs">
                      <XCircle className="h-3 w-3 mr-1" />
                      Rejected
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy content</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  if (!selectedSession) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">AI Assistant Ready</h3>
          <p className="text-gray-500 text-sm">Select content to get AI-powered suggestions and enhancements.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suggestions" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="generate" className="text-xs">
              <Wand2 className="h-3 w-3 mr-1" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Chat
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="suggestions" className="flex-1 flex flex-col mt-0">
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">
                    Content Suggestions
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => generateSuggestions('enhance')}
                    disabled={isGenerating}
                    className="h-7 px-3 text-xs"
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Refresh
                  </Button>
                </div>

                <AnimatePresence>
                  {suggestions.map(renderSuggestionCard)}
                </AnimatePresence>

                {suggestions.length === 0 && !isGenerating && (
                  <div className="text-center py-8">
                    <Lightbulb className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      No suggestions yet. Select content and click refresh to get AI suggestions.
                    </p>
                  </div>
                )}

                {isGenerating && (
                  <Card className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="animate-pulse bg-purple-100 p-2 rounded-lg">
                        <Brain className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          Generating suggestions...
                        </div>
                        <div className="text-xs text-gray-600">
                          AI is analyzing your content and creating enhancements
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="generate" className="flex-1 flex flex-col mt-0">
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Generate Content
              </h3>
              
              <div className="grid grid-cols-1 gap-2 mb-4">
                {suggestionTypes.map((type) => {
                  const Icon = type.icon
                  const isSelected = selectedSuggestionType === type.id
                  
                  return (
                    <Button
                      key={type.id}
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedSuggestionType(type.id)}
                      className="justify-start h-auto p-3"
                    >
                      <Icon className={cn("h-4 w-4 mr-3", type.color)} />
                      <div className="text-left">
                        <div className="text-sm font-medium">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </Button>
                  )
                })}
              </div>
              
              <Button
                onClick={() => generateSuggestions(selectedSuggestionType)}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Custom Request
              </h4>
              <Textarea
                placeholder="Describe what you'd like me to create or improve..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="min-h-[80px] mb-3"
              />
              <Button
                variant="outline"
                disabled={!customPrompt.trim() || isGenerating}
                className="w-full"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Request
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <div className="bg-purple-600 p-1 rounded">
                      <Brain className="h-3 w-3 text-white" />
                    </div>
                    <div className="text-sm text-gray-900">
                      Hi! I'm your AI writing assistant. I can help you improve your content, add examples, create activities, and more. What would you like to work on?
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
            
            <div className="border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Ask me anything about your content..."
                  className="flex-1"
                />
                <Button size="sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}