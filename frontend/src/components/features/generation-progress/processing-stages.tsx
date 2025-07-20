'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Search, 
  Brain, 
  Building2, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Lightbulb
} from 'lucide-react'
import { ProcessingStages as ProcessingStagesType, GenerationStage } from '@/types'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface ProcessingStagesProps {
  stages: ProcessingStagesType
  className?: string
}

const stageIcons = {
  documentAnalysis: FileText,
  contentExtraction: Search,
  aiProcessing: Brain,
  structureGeneration: Building2
}

const stageColors = {
  pending: 'text-muted-foreground',
  processing: 'text-primary',
  completed: 'text-success',
  error: 'text-destructive'
}

const stageBgColors = {
  pending: 'bg-muted/10',
  processing: 'bg-primary/10',
  completed: 'bg-success/10',
  error: 'bg-destructive/10'
}

const stageBorderColors = {
  pending: 'border-muted/20',
  processing: 'border-primary/30',
  completed: 'border-success/30',
  error: 'border-destructive/30'
}

function StageIcon({ stage }: { stage: GenerationStage }) {
  const IconComponent = stageIcons[stage.id as keyof typeof stageIcons] || FileText
  
  if (stage.status === 'completed') {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="relative"
      >
        <CheckCircle className="h-6 w-6 text-success" />
      </motion.div>
    )
  }
  
  if (stage.status === 'error') {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="relative"
      >
        <AlertCircle className="h-6 w-6 text-destructive" />
      </motion.div>
    )
  }
  
  if (stage.status === 'processing') {
    return (
      <motion.div
        className="relative"
        animate={stage.animation === 'spin' ? { rotate: 360 } : {}}
        transition={stage.animation === 'spin' ? { 
          duration: 2, 
          repeat: Infinity, 
          ease: 'linear' 
        } : {}}
      >
        <IconComponent 
          className={cn(
            "h-6 w-6",
            stageColors[stage.status],
            stage.animation === 'pulse' && 'animate-pulse'
          )} 
        />
        {stage.animation === 'spin' && (
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        )}
      </motion.div>
    )
  }
  
  return (
    <IconComponent className={cn("h-6 w-6", stageColors[stage.status])} />
  )
}

function ProgressBar({ stage }: { stage: GenerationStage }) {
  return (
    <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
      <motion.div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          stage.status === 'completed' ? 'bg-success' :
          stage.status === 'processing' ? 'bg-primary' :
          stage.status === 'error' ? 'bg-destructive' :
          'bg-muted'
        )}
        initial={{ width: 0 }}
        animate={{ width: `${stage.progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  )
}

function PipelineConnector({ 
  isActive, 
  isCompleted 
}: { 
  isActive: boolean
  isCompleted: boolean 
}) {
  return (
    <div className="relative flex items-center justify-center w-12 h-8">
      <div className={cn(
        "w-full h-0.5 transition-all duration-700",
        isCompleted ? 'bg-success' :
        isActive ? 'bg-primary' :
        'bg-muted/30'
      )}>
        {isActive && (
          <motion.div
            className="h-full bg-primary/60"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
      
      {/* Animated dots for active connector */}
      {isActive && (
        <motion.div
          className="absolute w-2 h-2 bg-primary rounded-full"
          animate={{
            x: [-24, 24],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      )}
    </div>
  )
}

function StageCard({ stage, showTips = false }: { 
  stage: GenerationStage
  showTips?: boolean 
}) {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 min-w-0"
    >
      <Card className={cn(
        "p-4 border-2 transition-all duration-300",
        stageBgColors[stage.status],
        stageBorderColors[stage.status],
        stage.status === 'processing' && 'shadow-lg shadow-primary/20'
      )}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <StageIcon stage={stage} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">
                {stage.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {stage.description}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-xs font-medium">
                {stage.progress}%
              </div>
              {stage.estimatedTimeRemaining && stage.status === 'processing' && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(stage.estimatedTimeRemaining)}
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <ProgressBar stage={stage} />

          {/* Tips (expandable) */}
          <AnimatePresence>
            {showTips && stage.tips && stage.tips.length > 0 && stage.status === 'processing' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-muted/20 pt-3"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Lightbulb className="h-3 w-3" />
                  <span className="font-medium">Tip</span>
                </div>
                <div className="space-y-1">
                  {stage.tips.map((tip, index) => (
                    <motion.p
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="text-xs text-muted-foreground"
                    >
                      • {tip}
                    </motion.p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  )
}

export function ProcessingStages({ stages, className }: ProcessingStagesProps) {
  const stageArray = Object.values(stages)
  const currentStageIndex = stageArray.findIndex(stage => stage.status === 'processing')
  const completedStages = stageArray.filter(stage => stage.status === 'completed').length
  const totalStages = stageArray.length

  const overallProgress = (completedStages / totalStages) * 100

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overall Progress Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-lg font-semibold">Course Generation Pipeline</h2>
          <motion.div
            key={overallProgress}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-sm text-muted-foreground"
          >
            ({completedStages}/{totalStages} completed)
          </motion.div>
        </div>
        
        <div className="w-full max-w-md mx-auto bg-muted/20 rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Desktop Layout - Horizontal Pipeline */}
      <div className="hidden md:block">
        <div className="flex items-center gap-4">
          {stageArray.map((stage, index) => (
            <React.Fragment key={stage.id}>
              <StageCard 
                stage={stage} 
                showTips={stage.status === 'processing'} 
              />
              {index < stageArray.length - 1 && (
                <PipelineConnector
                  isActive={
                    (stage.status === 'completed' && stageArray[index + 1].status === 'processing') ||
                    (stage.status === 'processing' && stage.progress > 80)
                  }
                  isCompleted={stage.status === 'completed' && stageArray[index + 1].status === 'completed'}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Mobile Layout - Vertical Stack */}
      <div className="md:hidden space-y-4">
        {stageArray.map((stage, index) => (
          <div key={stage.id} className="space-y-3">
            <StageCard 
              stage={stage} 
              showTips={stage.status === 'processing'} 
            />
            {index < stageArray.length - 1 && stage.status === 'completed' && (
              <div className="flex justify-center">
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  className="w-0.5 h-8 bg-success rounded-full"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Celebration Animation for Completion */}
      <AnimatePresence>
        {completedStages === totalStages && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center py-6"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                repeatType: 'reverse'
              }}
              className="text-4xl mb-2"
            >
              🎉
            </motion.div>
            <h3 className="text-lg font-semibold text-success">
              Course Generation Complete!
            </h3>
            <p className="text-sm text-muted-foreground">
              Your course content has been successfully generated
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}