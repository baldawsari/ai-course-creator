export interface GenerationStage {
  id: string
  name: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  startTime?: Date
  endTime?: Date
  estimatedTimeRemaining?: number
  icon: string
  animation?: 'spin' | 'pulse' | 'bounce' | 'fade'
  tips?: string[]
}

export interface ProcessingStages {
  documentAnalysis: GenerationStage
  contentExtraction: GenerationStage
  aiProcessing: GenerationStage
  structureGeneration: GenerationStage
}

export interface GenerationLog {
  id: string
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  data?: Record<string, any>
  category: 'system' | 'rag' | 'ai' | 'processing'
}

export interface RAGContext {
  id: string
  type: 'concept' | 'chunk' | 'document'
  content: string
  relevanceScore: number
  sourceDocument?: string
  chunkIndex?: number
  extractedConcepts?: string[]
  relationships?: RAGRelationship[]
}

export interface RAGRelationship {
  source: string
  target: string
  type: 'semantic' | 'hierarchical' | 'contextual'
  strength: number
}

export interface KnowledgeGraphNode {
  id: string
  label: string
  type: 'concept' | 'document' | 'chunk'
  size: number
  color: string
  x?: number
  y?: number
}

export interface KnowledgeGraphEdge {
  source: string
  target: string
  type: string
  weight: number
  color: string
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[]
  edges: KnowledgeGraphEdge[]
}

export interface PreviewSession {
  id: string
  title: string
  description?: string
  duration?: number
  activities: PreviewActivity[]
  status: 'generating' | 'completed' | 'error'
  qualityScore?: number
  fadeInDelay?: number
}

export interface PreviewActivity {
  id: string
  type: 'lesson' | 'exercise' | 'quiz' | 'discussion' | 'assignment'
  title: string
  content: string
  estimatedDuration?: number
  qualityScore?: number
  status: 'generating' | 'completed' | 'error'
}

export interface GenerationProgress {
  jobId: string
  stages: ProcessingStages
  overallProgress: number
  isComplete: boolean
  hasError: boolean
  errorMessage?: string
  startTime: Date
  estimatedCompletion?: Date
  logs: GenerationLog[]
  ragContext: RAGContext[]
  knowledgeGraph?: KnowledgeGraph
  previewSessions: PreviewSession[]
  canPause: boolean
  canCancel: boolean
  isPaused: boolean
}

export interface GenerationProgressUpdate {
  type: 'stage_update' | 'log' | 'rag_context' | 'preview_update' | 'complete' | 'error'
  data: any
  timestamp: Date
}

export interface GenerationControls {
  onPause: () => void
  onResume: () => void
  onCancel: () => void
  onRetry: () => void
  onViewLogs: () => void
  onExpandStage: (stageId: string) => void
}

export interface GenerationMetrics {
  tokensProcessed: number
  documentsAnalyzed: number
  conceptsExtracted: number
  sessionsGenerated: number
  averageQualityScore: number
  processingSpeed: number
}