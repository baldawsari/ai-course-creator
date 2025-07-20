'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Eye, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Download
} from 'lucide-react'
import { GenerationProgress as GenerationProgressType, GenerationControls } from '@/types'
import { useGenerationProgress } from '@/hooks/useGenerationProgress'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { ProcessingStages } from './processing-stages'
import { RealTimeUpdates } from './real-time-updates'
import { RAGContextViewer } from './rag-context-viewer'
import { PreviewGeneration } from './preview-generation'

interface GenerationProgressProps {
  jobId: string
  onComplete?: (progress: GenerationProgressType) => void
  onError?: (error: string) => void
  onCancel?: () => void
  className?: string
}

type TabType = 'stages' | 'logs' | 'rag' | 'preview'

const tabs = [
  { id: 'stages' as TabType, label: 'Pipeline', icon: Play },
  { id: 'logs' as TabType, label: 'Logs', icon: Eye },
  { id: 'rag' as TabType, label: 'RAG Context', icon: Settings },
  { id: 'preview' as TabType, label: 'Preview', icon: Download }
]

export function GenerationProgress({
  jobId,
  onComplete,
  onError,
  onCancel,
  className
}: GenerationProgressProps) {
  const [activeTab, setActiveTab] = useState<TabType>('stages')
  const [isExpanded, setIsExpanded] = useState(false)
  const [startTime] = useState(new Date())

  const {
    progress,
    logs,
    isConnected,
    connectionError,
    pauseGeneration,
    resumeGeneration,
    cancelGeneration
  } = useGenerationProgress({
    jobId,
    onComplete,
    onError
  })

  // Calculate elapsed time
  const [elapsedTime, setElapsedTime] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  // Auto-switch tabs based on progress
  useEffect(() => {
    if (!progress) return

    // Switch to logs if there are new error logs
    const recentErrors = logs.filter(log => 
      log.level === 'error' && 
      Date.now() - log.timestamp.getTime() < 5000
    )
    if (recentErrors.length > 0 && activeTab === 'stages') {
      setActiveTab('logs')
    }

    // Switch to preview when content starts generating
    if (progress.previewSessions.length > 0 && activeTab === 'stages') {
      setActiveTab('preview')
    }

    // Switch to RAG when context is available
    if (progress.ragContext.length > 0 && activeTab === 'stages' && progress.previewSessions.length === 0) {
      setActiveTab('rag')
    }
  }, [progress, logs, activeTab])

  const controls: GenerationControls = {
    onPause: pauseGeneration,
    onResume: resumeGeneration,
    onCancel: () => {
      cancelGeneration()
      onCancel?.()
    },
    onRetry: () => window.location.reload(),
    onViewLogs: () => setActiveTab('logs'),
    onExpandStage: (stageId: string) => {
      // Implementation for expanding specific stages
      console.log('Expand stage:', stageId)
    }
  }

  const tabCounts = useMemo(() => {
    if (!progress) return {}
    
    return {
      logs: logs.length,
      rag: progress.ragContext.length,
      preview: progress.previewSessions.length
    }
  }, [progress, logs])

  const getTabBadgeColor = (tabId: TabType) => {
    if (!progress) return ''
    
    switch (tabId) {
      case 'logs':
        const errorCount = logs.filter(log => log.level === 'error').length
        return errorCount > 0 ? 'bg-red-500' : logs.length > 0 ? 'bg-blue-500' : ''
      case 'rag':
        return progress.ragContext.length > 0 ? 'bg-green-500' : ''
      case 'preview':
        const completedSessions = progress.previewSessions.filter(s => s.status === 'completed').length
        return completedSessions > 0 ? 'bg-purple-500' : progress.previewSessions.length > 0 ? 'bg-yellow-500' : ''
      default:
        return ''
    }
  }

  if (!progress) {
    return (
      <div className={cn("flex items-center justify-center p-12", className)}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
          <div>
            <h3 className="font-semibold">Connecting to Generation Service</h3>
            <p className="text-sm text-muted-foreground">Initializing your course generation...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with overall progress */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Title and overall status */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Course Generation Progress</h2>
              <p className="text-sm text-muted-foreground">
                Job ID: {jobId}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={progress.isComplete ? "success" : progress.hasError ? "destructive" : "default"}>
                {progress.isComplete ? 'Complete' : progress.hasError ? 'Error' : 'In Progress'}
              </Badge>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8"
              >
                {isExpanded ? (
                  <><Minimize2 className="h-3 w-3 mr-1" /> Minimize</>
                ) : (
                  <><Maximize2 className="h-3 w-3 mr-1" /> Expand</>
                )}
              </Button>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(progress.overallProgress)}%</span>
            </div>
            
            <div className="w-full bg-muted/20 rounded-full h-3 overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  progress.isComplete ? 'bg-success' :
                  progress.hasError ? 'bg-destructive' :
                  'bg-gradient-to-r from-primary to-accent'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${progress.overallProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Error message */}
          {progress.hasError && progress.errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
            >
              <p className="text-sm text-destructive">{progress.errorMessage}</p>
            </motion.div>
          )}
        </div>
      </Card>

      {/* Tabs Navigation */}
      <Card className="overflow-hidden">
        <div className="border-b border-border">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex">
              {tabs.map(tab => {
                const IconComponent = tab.icon
                const count = tabCounts[tab.id as keyof typeof tabCounts]
                const badgeColor = getTabBadgeColor(tab.id)
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                      "border-b-2 hover:text-foreground",
                      activeTab === tab.id 
                        ? "border-primary text-primary" 
                        : "border-transparent text-muted-foreground"
                    )}
                  >
                    <IconComponent className="h-4 w-4" />
                    {tab.label}
                    
                    {count !== undefined && count > 0 && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs h-5 px-1 ml-1",
                          badgeColor && `text-white ${badgeColor}`
                        )}
                      >
                        {count}
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
            
            {/* Tab controls */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
                  const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
                  setActiveTab(tabs[prevIndex].id)
                }}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
                  const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0
                  setActiveTab(tabs[nextIndex].id)
                }}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className={cn("transition-all duration-300", isExpanded ? "min-h-[600px]" : "min-h-[400px]")}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              {activeTab === 'stages' && (
                <ProcessingStages stages={progress.stages} />
              )}
              
              {activeTab === 'logs' && (
                <RealTimeUpdates
                  logs={logs}
                  isConnected={isConnected}
                  connectionError={connectionError}
                  controls={controls}
                  isPaused={progress.isPaused}
                  canPause={progress.canPause}
                  canCancel={progress.canCancel}
                  estimatedCompletion={progress.estimatedCompletion}
                  elapsedTime={elapsedTime}
                />
              )}
              
              {activeTab === 'rag' && (
                <RAGContextViewer
                  contexts={progress.ragContext}
                  knowledgeGraph={progress.knowledgeGraph}
                />
              )}
              
              {activeTab === 'preview' && (
                <PreviewGeneration sessions={progress.previewSessions} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </Card>
    </div>
  )
}

// Export all components for direct usage
export { ProcessingStages } from './processing-stages'
export { RealTimeUpdates } from './real-time-updates'
export { RAGContextViewer } from './rag-context-viewer'
export { PreviewGeneration } from './preview-generation'