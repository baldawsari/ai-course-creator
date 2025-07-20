'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText,
  Search,
  Brain,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Stage {
  id: string
  name: string
  icon: React.ElementType
  status: 'pending' | 'active' | 'completed' | 'error'
  progress: number
  message?: string
}

export default function GenerationProgressPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.jobId as string
  
  const [stages, setStages] = useState<Stage[]>([
    {
      id: 'document_analysis',
      name: 'Document Analysis',
      icon: FileText,
      status: 'active',
      progress: 25,
      message: 'Analyzing uploaded documents...'
    },
    {
      id: 'content_extraction',
      name: 'Content Extraction',
      icon: Search,
      status: 'pending',
      progress: 0,
      message: ''
    },
    {
      id: 'rag_processing',
      name: 'RAG Processing',
      icon: Brain,
      status: 'pending',
      progress: 0,
      message: ''
    },
    {
      id: 'ai_generation',
      name: 'AI Generation',
      icon: Sparkles,
      status: 'pending',
      progress: 0,
      message: ''
    }
  ])
  
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'error' }>>([
    { timestamp: new Date().toISOString(), message: 'Course generation started', type: 'info' },
    { timestamp: new Date().toISOString(), message: 'Processing uploaded documents...', type: 'info' }
  ])
  
  const [ragContext, setRagContext] = useState<Array<{ chunk: string; relevance: number }>>([])
  const [previewContent, setPreviewContent] = useState<string>('')
  const [isComplete, setIsComplete] = useState(false)
  const [courseId, setCourseId] = useState<string | null>(null)

  // Simulate progress updates
  useEffect(() => {
    const simulateProgress = () => {
      let currentStageIndex = 0
      
      const progressInterval = setInterval(() => {
        setStages(prevStages => {
          const newStages = [...prevStages]
          const activeStage = newStages.find(s => s.status === 'active')
          
          if (!activeStage) return prevStages
          
          const activeIndex = newStages.findIndex(s => s.id === activeStage.id)
          
          // Update progress
          newStages[activeIndex].progress = Math.min(100, newStages[activeIndex].progress + 10)
          
          // Stage complete
          if (newStages[activeIndex].progress >= 100) {
            newStages[activeIndex].status = 'completed'
            
            // Add log
            setLogs(prev => [...prev, {
              timestamp: new Date().toISOString(),
              message: `${newStages[activeIndex].name} completed`,
              type: 'success'
            }])
            
            // Move to next stage
            if (activeIndex < newStages.length - 1) {
              newStages[activeIndex + 1].status = 'active'
              newStages[activeIndex + 1].message = `Processing ${newStages[activeIndex + 1].name.toLowerCase()}...`
              
              setLogs(prev => [...prev, {
                timestamp: new Date().toISOString(),
                message: `Starting ${newStages[activeIndex + 1].name}`,
                type: 'info'
              }])
            } else {
              // All stages complete
              clearInterval(progressInterval)
              setIsComplete(true)
              setCourseId('course-123')
              
              setLogs(prev => [...prev, {
                timestamp: new Date().toISOString(),
                message: 'Course generation completed successfully!',
                type: 'success'
              }])
            }
          }
          
          return newStages
        })
        
        // Add RAG context samples
        if (Math.random() > 0.7) {
          setRagContext(prev => [...prev, {
            chunk: `Sample content chunk ${prev.length + 1}: This is relevant content extracted from your documents...`,
            relevance: Math.random() * 0.5 + 0.5
          }].slice(-5)) // Keep last 5 chunks
        }
        
        // Update preview
        setPreviewContent(prev => prev + '\n' + `Generated content line ${prev.split('\n').length + 1}...`)
      }, 1000)
      
      return () => clearInterval(progressInterval)
    }
    
    const cleanup = simulateProgress()
    return cleanup
  }, [])

  const getOverallProgress = () => {
    const totalProgress = stages.reduce((sum, stage) => sum + stage.progress, 0)
    return Math.round(totalProgress / stages.length)
  }

  const handleNavigateToCourse = () => {
    if (courseId) {
      router.push(`/courses/${courseId}/edit`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" data-testid="generation-progress">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Course Generation in Progress
          </h1>
          <p className="text-gray-600">
            Job ID: {jobId} • Estimated time: 3-5 minutes
          </p>
        </div>

        {/* Overall Progress */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Overall Progress</h2>
              <p className="text-sm text-gray-600">
                {isComplete ? 'Generation complete!' : 'Processing your course content...'}
              </p>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {getOverallProgress()}%
            </div>
          </div>
          <Progress value={getOverallProgress()} className="h-3" />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Processing Stages */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6" data-testid="processing-stages">
              <h3 className="text-lg font-semibold mb-4">Processing Stages</h3>
              <div className="space-y-4">
                <AnimatePresence>
                  {stages.map((stage, index) => (
                    <motion.div
                      key={stage.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className={cn(
                        "flex items-center space-x-4 p-4 rounded-lg border",
                        stage.status === 'active' && "bg-purple-50 border-purple-200",
                        stage.status === 'completed' && "bg-green-50 border-green-200",
                        stage.status === 'error' && "bg-red-50 border-red-200",
                        stage.status === 'pending' && "bg-gray-50 border-gray-200"
                      )}>
                        <div className={cn(
                          "p-3 rounded-full",
                          stage.status === 'active' && "bg-purple-100",
                          stage.status === 'completed' && "bg-green-100",
                          stage.status === 'error' && "bg-red-100",
                          stage.status === 'pending' && "bg-gray-100"
                        )}>
                          {stage.status === 'active' && (
                            <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
                          )}
                          {stage.status === 'completed' && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                          {stage.status === 'error' && (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          )}
                          {stage.status === 'pending' && (
                            <stage.icon className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">{stage.name}</h4>
                            <span className="text-sm text-gray-600">{stage.progress}%</span>
                          </div>
                          {stage.message && (
                            <p className="text-sm text-gray-600 mb-2">{stage.message}</p>
                          )}
                          <Progress value={stage.progress} className="h-2" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </Card>

            {/* Real-time Logs */}
            <Card className="p-6" data-testid="real-time-logs">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Real-time Logs
              </h3>
              <ScrollArea className="h-64 bg-gray-900 rounded-lg p-4">
                <div className="space-y-1 font-mono text-xs">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start space-x-2",
                        log.type === 'error' && "text-red-400",
                        log.type === 'success' && "text-green-400",
                        log.type === 'info' && "text-gray-300"
                      )}
                    >
                      <span className="text-gray-500">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* RAG Context & Preview */}
          <div className="space-y-6">
            {/* RAG Context Viewer */}
            <Card className="p-6" data-testid="rag-context-viewer">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                RAG Context
              </h3>
              <div className="space-y-2">
                {ragContext.length === 0 ? (
                  <p className="text-sm text-gray-500">Waiting for context extraction...</p>
                ) : (
                  ragContext.map((context, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="secondary" className="text-xs">
                          Chunk {index + 1}
                        </Badge>
                        <span className="text-xs text-gray-600">
                          Relevance: {Math.round(context.relevance * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 line-clamp-2">
                        {context.chunk}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Preview Panel */}
            <Card className="p-6" data-testid="preview-panel">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Sparkles className="h-5 w-5 mr-2" />
                Live Preview
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {previewContent || 'Waiting for content generation...'}
                </pre>
              </div>
            </Card>

            {/* Completion Actions */}
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="p-6 bg-green-50 border-green-200">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <h4 className="font-semibold text-green-900 mb-2">
                      Course Generated Successfully!
                    </h4>
                    <p className="text-sm text-green-700 mb-4">
                      Your course is ready for editing and customization
                    </p>
                    <Button
                      onClick={handleNavigateToCourse}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Go to Course Editor
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}