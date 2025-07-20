import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { GenerationJob, GenerationProgress, RAGContext } from '@/types'

interface GenerationFilters {
  status?: string[]
  type?: string[]
  dateRange?: { start: Date; end: Date }
  sortBy?: 'createdAt' | 'updatedAt' | 'status' | 'type'
  sortOrder?: 'asc' | 'desc'
}

interface GenerationMetrics {
  totalJobs: number
  successfulJobs: number
  failedJobs: number
  averageProcessingTime: number
  tokensUsed: number
  creditsUsed: number
}

interface ActiveGeneration {
  jobId: string
  courseId?: string
  progress: GenerationProgress
  stages: GenerationStage[]
  logs: GenerationLog[]
  ragContext: RAGContext[]
  startTime: number
  estimatedCompletion?: number
}

interface GenerationStage {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  startTime?: number
  endTime?: number
  error?: string
}

interface GenerationLog {
  id: string
  level: 'info' | 'warn' | 'error' | 'debug'
  category: 'system' | 'rag' | 'ai' | 'processing'
  message: string
  timestamp: number
  metadata?: Record<string, any>
}

interface GenerationState {
  // Jobs and history
  jobs: GenerationJob[]
  activeGenerations: Map<string, ActiveGeneration>
  isLoading: boolean
  error: string | null
  
  // Filtering and pagination
  filters: GenerationFilters
  pagination: {
    page: number
    limit: number
    total: number
  }
  
  // Metrics and analytics
  metrics: GenerationMetrics
  
  // WebSocket connections
  connections: Map<string, WebSocket>
  
  // Cache
  lastFetch: number | null
  
  // Actions - Job management
  setJobs: (jobs: GenerationJob[]) => void
  addJob: (job: GenerationJob) => void
  updateJob: (jobId: string, updates: Partial<GenerationJob>) => void
  removeJob: (jobId: string) => void
  
  // Actions - Active generations
  startGeneration: (jobId: string, courseId?: string) => void
  updateGeneration: (jobId: string, updates: Partial<ActiveGeneration>) => void
  completeGeneration: (jobId: string, success: boolean, result?: any) => void
  cancelGeneration: (jobId: string) => void
  
  // Actions - Progress tracking
  updateProgress: (jobId: string, progress: Partial<GenerationProgress>) => void
  updateStage: (jobId: string, stageId: string, updates: Partial<GenerationStage>) => void
  addLog: (jobId: string, log: Omit<GenerationLog, 'id' | 'timestamp'>) => void
  updateRAGContext: (jobId: string, context: RAGContext[]) => void
  
  // Actions - WebSocket management
  subscribeToJob: (jobId: string, onUpdate?: (data: any) => void) => () => void
  unsubscribeFromJob: (jobId: string) => void
  
  // Actions - UI state
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilters: (filters: Partial<GenerationFilters>) => void
  setPagination: (pagination: Partial<GenerationState['pagination']>) => void
  
  // Actions - Metrics
  updateMetrics: (metrics: Partial<GenerationMetrics>) => void
  calculateMetrics: () => void
  
  // Computed values
  getActiveGeneration: (jobId: string) => ActiveGeneration | undefined
  getJobById: (jobId: string) => GenerationJob | undefined
  getFilteredJobs: () => GenerationJob[]
  getJobLogs: (jobId: string) => GenerationLog[]
  getJobProgress: (jobId: string) => GenerationProgress | undefined
}

const defaultMetrics: GenerationMetrics = {
  totalJobs: 0,
  successfulJobs: 0,
  failedJobs: 0,
  averageProcessingTime: 0,
  tokensUsed: 0,
  creditsUsed: 0,
}

export const useGenerationStore = create<GenerationState>()(
  persist(
    (set, get) => ({
      // Initial state
      jobs: [],
      activeGenerations: new Map(),
      isLoading: false,
      error: null,
      filters: {
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
      },
      metrics: defaultMetrics,
      connections: new Map(),
      lastFetch: null,

      // Job management
      setJobs: (jobs: GenerationJob[]) => {
        set({ 
          jobs, 
          lastFetch: Date.now(),
          pagination: { ...get().pagination, total: jobs.length } 
        })
        get().calculateMetrics()
      },

      addJob: (job: GenerationJob) => {
        set((state) => ({
          jobs: [job, ...state.jobs],
          pagination: { ...state.pagination, total: state.pagination.total + 1 }
        }))
        get().calculateMetrics()
      },

      updateJob: (jobId: string, updates: Partial<GenerationJob>) => {
        set((state) => ({
          jobs: state.jobs.map(job =>
            job.id === jobId ? { ...job, ...updates } : job
          ),
        }))
        get().calculateMetrics()
      },

      removeJob: (jobId: string) => {
        set((state) => ({
          jobs: state.jobs.filter(job => job.id !== jobId),
          pagination: { ...state.pagination, total: state.pagination.total - 1 }
        }))
        
        // Clean up active generation
        const { activeGenerations } = get()
        if (activeGenerations.has(jobId)) {
          activeGenerations.delete(jobId)
          set({ activeGenerations: new Map(activeGenerations) })
        }
        
        get().calculateMetrics()
      },

      // Active generation management
      startGeneration: (jobId: string, courseId?: string) => {
        const initialStages: GenerationStage[] = [
          { id: 'analysis', name: 'Document Analysis', status: 'pending', progress: 0 },
          { id: 'extraction', name: 'Content Extraction', status: 'pending', progress: 0 },
          { id: 'processing', name: 'AI Processing', status: 'pending', progress: 0 },
          { id: 'generation', name: 'Structure Generation', status: 'pending', progress: 0 },
        ]

        const activeGeneration: ActiveGeneration = {
          jobId,
          courseId,
          progress: {
            stage: 'analysis',
            progress: 0,
            currentTask: 'Initializing...',
            estimatedTimeRemaining: null,
            tokensUsed: 0,
          },
          stages: initialStages,
          logs: [],
          ragContext: [],
          startTime: Date.now(),
        }

        const { activeGenerations } = get()
        activeGenerations.set(jobId, activeGeneration)
        set({ activeGenerations: new Map(activeGenerations) })

        // Update job status
        get().updateJob(jobId, { status: 'processing' })
      },

      updateGeneration: (jobId: string, updates: Partial<ActiveGeneration>) => {
        const { activeGenerations } = get()
        const generation = activeGenerations.get(jobId)
        
        if (generation) {
          const updated = { ...generation, ...updates }
          activeGenerations.set(jobId, updated)
          set({ activeGenerations: new Map(activeGenerations) })
        }
      },

      completeGeneration: (jobId: string, success: boolean, result?: any) => {
        const { activeGenerations } = get()
        const generation = activeGenerations.get(jobId)
        
        if (generation) {
          // Update job status
          get().updateJob(jobId, { 
            status: success ? 'completed' : 'failed',
            completedAt: new Date().toISOString(),
            result: result || null,
            processingTime: Date.now() - generation.startTime,
          })

          // Clean up active generation
          activeGenerations.delete(jobId)
          set({ activeGenerations: new Map(activeGenerations) })
          
          // Unsubscribe from WebSocket
          get().unsubscribeFromJob(jobId)
        }

        get().calculateMetrics()
      },

      cancelGeneration: (jobId: string) => {
        const { activeGenerations } = get()
        
        // Update job status
        get().updateJob(jobId, { 
          status: 'cancelled',
          completedAt: new Date().toISOString(),
        })

        // Clean up active generation
        if (activeGenerations.has(jobId)) {
          activeGenerations.delete(jobId)
          set({ activeGenerations: new Map(activeGenerations) })
        }
        
        // Unsubscribe from WebSocket
        get().unsubscribeFromJob(jobId)

        get().calculateMetrics()
      },

      // Progress tracking
      updateProgress: (jobId: string, progress: Partial<GenerationProgress>) => {
        const { activeGenerations } = get()
        const generation = activeGenerations.get(jobId)
        
        if (generation) {
          generation.progress = { ...generation.progress, ...progress }
          activeGenerations.set(jobId, generation)
          set({ activeGenerations: new Map(activeGenerations) })
        }
      },

      updateStage: (jobId: string, stageId: string, updates: Partial<GenerationStage>) => {
        const { activeGenerations } = get()
        const generation = activeGenerations.get(jobId)
        
        if (generation) {
          generation.stages = generation.stages.map(stage =>
            stage.id === stageId ? { ...stage, ...updates } : stage
          )
          activeGenerations.set(jobId, generation)
          set({ activeGenerations: new Map(activeGenerations) })
        }
      },

      addLog: (jobId: string, log: Omit<GenerationLog, 'id' | 'timestamp'>) => {
        const { activeGenerations } = get()
        const generation = activeGenerations.get(jobId)
        
        if (generation) {
          const newLog: GenerationLog = {
            ...log,
            id: `log_${Date.now()}_${Math.random()}`,
            timestamp: Date.now(),
          }
          
          generation.logs = [newLog, ...generation.logs].slice(0, 1000) // Keep last 1000 logs
          activeGenerations.set(jobId, generation)
          set({ activeGenerations: new Map(activeGenerations) })
        }
      },

      updateRAGContext: (jobId: string, context: RAGContext[]) => {
        const { activeGenerations } = get()
        const generation = activeGenerations.get(jobId)
        
        if (generation) {
          generation.ragContext = context
          activeGenerations.set(jobId, generation)
          set({ activeGenerations: new Map(activeGenerations) })
        }
      },

      // WebSocket management
      subscribeToJob: (jobId: string, onUpdate?: (data: any) => void) => {
        const { connections } = get()
        
        // Don't create duplicate connections
        if (connections.has(jobId)) {
          return () => {}
        }

        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/jobs/${jobId}`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log(`Connected to job ${jobId}`)
          get().addLog(jobId, {
            level: 'info',
            category: 'system',
            message: 'Connected to generation service',
          })
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            // Handle different message types
            switch (data.type) {
              case 'progress':
                get().updateProgress(jobId, data.progress)
                break
              case 'stage_update':
                get().updateStage(jobId, data.stageId, data.stage)
                break
              case 'log':
                get().addLog(jobId, data.log)
                break
              case 'rag_context':
                get().updateRAGContext(jobId, data.context)
                break
              case 'complete':
                get().completeGeneration(jobId, data.success, data.result)
                break
              case 'error':
                get().addLog(jobId, {
                  level: 'error',
                  category: 'system',
                  message: data.message || 'Generation error occurred',
                })
                break
            }

            // Call custom update handler
            if (onUpdate) {
              onUpdate(data)
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        ws.onerror = (error) => {
          console.error(`WebSocket error for job ${jobId}:`, error)
          get().addLog(jobId, {
            level: 'error',
            category: 'system',
            message: 'Connection error occurred',
          })
        }

        ws.onclose = () => {
          console.log(`Disconnected from job ${jobId}`)
          connections.delete(jobId)
          set({ connections: new Map(connections) })
        }

        // Store connection
        connections.set(jobId, ws)
        set({ connections: new Map(connections) })

        // Return cleanup function
        return () => {
          ws.close()
          connections.delete(jobId)
          set({ connections: new Map(connections) })
        }
      },

      unsubscribeFromJob: (jobId: string) => {
        const { connections } = get()
        const ws = connections.get(jobId)
        
        if (ws) {
          ws.close()
          connections.delete(jobId)
          set({ connections: new Map(connections) })
        }
      },

      // UI state management
      setLoading: (isLoading: boolean) => {
        set({ isLoading, error: isLoading ? null : get().error })
      },

      setError: (error: string | null) => {
        set({ error, isLoading: false })
      },

      setFilters: (filters: Partial<GenerationFilters>) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
          pagination: { ...state.pagination, page: 1 }, // Reset to first page
        }))
      },

      setPagination: (pagination: Partial<GenerationState['pagination']>) => {
        set((state) => ({
          pagination: { ...state.pagination, ...pagination },
        }))
      },

      // Metrics calculation
      updateMetrics: (metrics: Partial<GenerationMetrics>) => {
        set((state) => ({
          metrics: { ...state.metrics, ...metrics },
        }))
      },

      calculateMetrics: () => {
        const { jobs } = get()
        
        const metrics: GenerationMetrics = {
          totalJobs: jobs.length,
          successfulJobs: jobs.filter(job => job.status === 'completed').length,
          failedJobs: jobs.filter(job => job.status === 'failed').length,
          averageProcessingTime: 0,
          tokensUsed: jobs.reduce((sum, job) => sum + (job.tokensUsed || 0), 0),
          creditsUsed: jobs.reduce((sum, job) => sum + (job.creditsUsed || 0), 0),
        }

        // Calculate average processing time
        const completedJobs = jobs.filter(job => job.processingTime)
        if (completedJobs.length > 0) {
          metrics.averageProcessingTime = completedJobs.reduce(
            (sum, job) => sum + (job.processingTime || 0), 0
          ) / completedJobs.length
        }

        set({ metrics })
      },

      // Computed values
      getActiveGeneration: (jobId: string) => {
        return get().activeGenerations.get(jobId)
      },

      getJobById: (jobId: string) => {
        return get().jobs.find(job => job.id === jobId)
      },

      getFilteredJobs: () => {
        const { jobs, filters } = get()
        let filtered = [...jobs]

        // Apply status filter
        if (filters.status?.length) {
          filtered = filtered.filter(job => filters.status!.includes(job.status))
        }

        // Apply type filter
        if (filters.type?.length) {
          filtered = filtered.filter(job => filters.type!.includes(job.type))
        }

        // Apply date range filter
        if (filters.dateRange) {
          const { start, end } = filters.dateRange
          filtered = filtered.filter(job => {
            const jobDate = new Date(job.createdAt)
            return jobDate >= start && jobDate <= end
          })
        }

        // Apply sorting
        if (filters.sortBy) {
          filtered.sort((a, b) => {
            const aVal = a[filters.sortBy!]
            const bVal = b[filters.sortBy!]
            
            if (filters.sortOrder === 'desc') {
              return bVal > aVal ? 1 : -1
            }
            return aVal > bVal ? 1 : -1
          })
        }

        return filtered
      },

      getJobLogs: (jobId: string) => {
        const generation = get().getActiveGeneration(jobId)
        return generation?.logs || []
      },

      getJobProgress: (jobId: string) => {
        const generation = get().getActiveGeneration(jobId)
        return generation?.progress
      },
    }),
    {
      name: 'generation-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        jobs: state.jobs,
        filters: state.filters,
        pagination: state.pagination,
        metrics: state.metrics,
        lastFetch: state.lastFetch,
      }),
    }
  )
)

// Utility hooks
export const useActiveGenerations = () => useGenerationStore(state => 
  Array.from(state.activeGenerations.values())
)

export const useGenerationMetrics = () => useGenerationStore(state => state.metrics)

export const useJobProgress = (jobId: string) => useGenerationStore(state => 
  state.getJobProgress(jobId)
)

export const useJobLogs = (jobId: string) => useGenerationStore(state => 
  state.getJobLogs(jobId)
)

// Cleanup WebSocket connections on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const { connections } = useGenerationStore.getState()
    connections.forEach(ws => ws.close())
  })
}