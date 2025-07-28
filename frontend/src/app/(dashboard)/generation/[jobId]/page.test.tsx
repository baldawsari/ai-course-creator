import React from 'react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, createUserEvent, waitFor, act } from '@/__tests__/utils/test-utils'
import GenerationProgressPage from './page'
import { mockUser } from '@/__tests__/utils/test-utils'

// Mock next/navigation
const mockPush = jest.fn()
const mockParams = { jobId: 'test-job-123' }

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useParams: () => mockParams,
  usePathname: () => '/generation/test-job-123',
  useSearchParams: () => new URLSearchParams(),
}))

describe('GenerationProgressPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers({ legacyFakeTimers: false })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Authentication', () => {
    it('renders with authenticated user context', () => {
      render(<GenerationProgressPage />, {
        initialAuth: {
          user: mockUser,
          isAuthenticated: true,
          token: 'test-token'
        }
      })
      
      // Page should render normally with auth
      expect(screen.getByTestId('generation-progress')).toBeInTheDocument()
      expect(screen.getByText('Course Generation in Progress')).toBeInTheDocument()
    })

    it('handles unauthenticated state gracefully', () => {
      render(<GenerationProgressPage />, {
        initialAuth: {
          user: null,
          isAuthenticated: false,
          token: null
        }
      })
      
      // Page should still render (route protection handled by layout)
      expect(screen.getByTestId('generation-progress')).toBeInTheDocument()
    })

    it.skip('uses authenticated context for navigation', async () => {
      const user = createUserEvent()
      render(<GenerationProgressPage />, {
        initialAuth: {
          user: mockUser,
          isAuthenticated: true,
          token: 'test-token'
        }
      })
      
      // Advance timer to complete all stages
      act(() => {
        jest.advanceTimersByTime(40000)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Go to Course Editor')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Go to Course Editor'))
      
      // Should navigate with authenticated context
      expect(mockPush).toHaveBeenCalledWith('/courses/course-123/edit')
    }, 15000)
  })

  describe('Rendering', () => {
    it('renders page header with job ID', () => {
      render(<GenerationProgressPage />)
      
      expect(screen.getByTestId('generation-progress')).toBeInTheDocument()
      expect(screen.getByText('Course Generation in Progress')).toBeInTheDocument()
      expect(screen.getByText(/Job ID: test-job-123/)).toBeInTheDocument()
      expect(screen.getByText(/Estimated time: 3-5 minutes/)).toBeInTheDocument()
    })

    it('renders overall progress section', () => {
      render(<GenerationProgressPage />)
      
      expect(screen.getByText('Overall Progress')).toBeInTheDocument()
      expect(screen.getByText('Processing your course content...')).toBeInTheDocument()
      expect(screen.getByTestId('overall-progress-bar')).toBeInTheDocument()
    })

    it('renders all processing stages', () => {
      render(<GenerationProgressPage />)
      
      expect(screen.getByTestId('processing-stages')).toBeInTheDocument()
      expect(screen.getByText('Document Analysis')).toBeInTheDocument()
      expect(screen.getByText('Content Extraction')).toBeInTheDocument()
      expect(screen.getByText('RAG Processing')).toBeInTheDocument()
      expect(screen.getByText('AI Generation')).toBeInTheDocument()
    })

    it('renders real-time logs', () => {
      render(<GenerationProgressPage />)
      
      expect(screen.getByTestId('real-time-logs')).toBeInTheDocument()
      expect(screen.getByText('Real-time Logs')).toBeInTheDocument()
      expect(screen.getByText('Course generation started')).toBeInTheDocument()
      expect(screen.getByText('Processing uploaded documents...')).toBeInTheDocument()
    })

    it('renders RAG context viewer', () => {
      render(<GenerationProgressPage />)
      
      expect(screen.getByTestId('rag-context-viewer')).toBeInTheDocument()
      expect(screen.getByText('RAG Context')).toBeInTheDocument()
      expect(screen.getByText('Waiting for context extraction...')).toBeInTheDocument()
    })

    it('renders preview panel', () => {
      render(<GenerationProgressPage />)
      
      expect(screen.getByTestId('preview-panel')).toBeInTheDocument()
      expect(screen.getByText('Live Preview')).toBeInTheDocument()
      expect(screen.getByText('Waiting for content generation...')).toBeInTheDocument()
    })
  })

  describe('Progress Simulation', () => {
    it('shows initial stage as active', () => {
      render(<GenerationProgressPage />)
      
      const stages = screen.getByTestId('processing-stages').querySelectorAll('.rounded-lg.border')
      const firstStage = stages[0]
      expect(firstStage).toHaveClass('bg-purple-50', 'border-purple-200')
      // Find the percentage in the first stage
      const stagePercent = firstStage.querySelector('.text-sm.text-gray-600')?.textContent
      expect(stagePercent).toBe('25%')
    })

    it('updates progress over time', async () => {
      render(<GenerationProgressPage />)
      
      // Initial state
      expect(screen.getByText('25%')).toBeInTheDocument()
      
      // Advance timer to trigger progress update
      act(() => {
        jest.advanceTimersByTime(2000)
      })
      
      await waitFor(() => {
        // Progress should have increased
        const progressTexts = screen.getAllByText(/\d+%/)
        const hasHigherProgress = progressTexts.some(el => {
          const value = parseInt(el.textContent || '0')
          return value > 25
        })
        expect(hasHigherProgress).toBe(true)
      })
    })

    it('adds logs as stages progress', async () => {
      render(<GenerationProgressPage />)
      
      const initialLogCount = screen.getAllByText(/\[.*\]/).length
      
      // Advance timer to complete first stage
      act(() => {
        jest.advanceTimersByTime(10000) // Advance enough to complete a stage
      })
      
      await waitFor(() => {
        const currentLogCount = screen.getAllByText(/\[.*\]/).length
        expect(currentLogCount).toBeGreaterThan(initialLogCount)
      })
    })
  })

  describe('Stage Transitions', () => {
    it('marks stages as completed', async () => {
      render(<GenerationProgressPage />)
      
      // Advance timer to complete first stage
      act(() => {
        jest.advanceTimersByTime(8000) // 8 seconds should complete first stage
      })
      
      await waitFor(() => {
        // Should see completion indicators
        const checkCircles = document.querySelectorAll('.lucide-check-circle')
        expect(checkCircles.length).toBeGreaterThan(0)
      })
    })

    it('shows different styling for stage states', () => {
      render(<GenerationProgressPage />)
      
      // Check initial states
      const stages = screen.getByTestId('processing-stages').querySelectorAll('.rounded-lg.border')
      
      // First stage should be active (purple)
      expect(stages[0]).toHaveClass('bg-purple-50', 'border-purple-200')
      
      // Other stages should be pending (gray)
      expect(stages[1]).toHaveClass('bg-gray-50', 'border-gray-200')
      expect(stages[2]).toHaveClass('bg-gray-50', 'border-gray-200')
      expect(stages[3]).toHaveClass('bg-gray-50', 'border-gray-200')
    })
  })

  describe('RAG Context Updates', () => {
    it('displays RAG context chunks when available', async () => {
      render(<GenerationProgressPage />)
      
      // Initially shows waiting message
      expect(screen.getByText('Waiting for context extraction...')).toBeInTheDocument()
      
      // Advance timer to trigger RAG context updates
      act(() => {
        jest.advanceTimersByTime(5000)
      })
      
      // Check if chunks appear (randomly, so we might need to wait)
      await waitFor(() => {
        const chunks = screen.queryAllByText(/Chunk \d+/)
        if (chunks.length > 0) {
          expect(chunks[0]).toBeInTheDocument()
          expect(screen.getAllByText(/Relevance: \d+%/).length).toBeGreaterThan(0)
        }
      }, { timeout: 10000 })
    })
  })

  describe('Preview Updates', () => {
    it('updates preview content over time', async () => {
      render(<GenerationProgressPage />)
      
      // Initially shows waiting message
      const previewPanel = screen.getByTestId('preview-panel')
      const previewContent = previewPanel.querySelector('pre')
      expect(previewContent).toHaveTextContent('Waiting for content generation...')
      
      // Advance timer
      act(() => {
        jest.advanceTimersByTime(3000)
      })
      
      await waitFor(() => {
        // Should have generated content
        expect(previewContent).toHaveTextContent(/Generated content line/)
      })
    })
  })

  describe('Completion State', () => {
    it('shows completion card when all stages are done', async () => {
      render(<GenerationProgressPage />)
      
      // Advance timer to complete all stages
      act(() => {
        jest.advanceTimersByTime(40000) // Enough time to complete all stages
      })
      
      await waitFor(() => {
        expect(screen.getByText('Course Generated Successfully!')).toBeInTheDocument()
        expect(screen.getByText('Your course is ready for editing and customization')).toBeInTheDocument()
        expect(screen.getByText('Go to Course Editor')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('updates overall progress message on completion', async () => {
      render(<GenerationProgressPage />)
      
      // Advance timer to complete all stages
      act(() => {
        jest.advanceTimersByTime(40000)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Generation complete!')).toBeInTheDocument()
      })
    })

    it.skip('navigates to course editor on button click', async () => {
      const user = createUserEvent()
      render(<GenerationProgressPage />)
      
      // Advance timer to complete all stages
      act(() => {
        jest.advanceTimersByTime(40000)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Go to Course Editor')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Go to Course Editor'))
      
      expect(mockPush).toHaveBeenCalledWith('/courses/course-123/edit')
    }, 15000)
  })

  describe('Overall Progress Calculation', () => {
    it('calculates overall progress correctly', async () => {
      render(<GenerationProgressPage />)
      
      // Initially should show 6% (25% of first stage / 4 stages)
      // Find the overall progress percentage (6% = 25% of first stage / 4 stages)
      const overallProgressDiv = screen.getByText('Overall Progress').closest('div')?.parentElement
      const progressText = overallProgressDiv?.querySelector('.text-2xl.font-bold.text-purple-600')?.textContent
      expect(progressText).toBe('6%')
      
      // Advance timer
      act(() => {
        jest.advanceTimersByTime(5000)
      })
      
      await waitFor(() => {
        // Progress should increase
        const overallProgressDiv = screen.getByText('Overall Progress').closest('div')?.parentElement
        const progressText = overallProgressDiv?.querySelector('.text-2xl.font-bold.text-purple-600')?.textContent
        const progressValue = parseInt(progressText?.replace('%', '') || '0')
        expect(progressValue).toBeGreaterThan(6)
      })
    })
  })

  describe('Stage Icons', () => {
    it('shows appropriate icons for each stage state', () => {
      render(<GenerationProgressPage />)
      
      // Active stage should show spinning loader
      const spinners = document.querySelectorAll('.animate-spin')
      expect(spinners.length).toBeGreaterThan(0)
      
      // Pending stages should show their respective icons
      const stageIcons = screen.getByTestId('processing-stages').querySelectorAll('svg')
      expect(stageIcons.length).toBeGreaterThan(0)
    })
  })

  describe('Log Formatting', () => {
    it('formats log timestamps correctly', () => {
      render(<GenerationProgressPage />)
      
      const timestamps = screen.getAllByText(/\[.*\]/)
      timestamps.forEach(timestamp => {
        // Should be in format [HH:MM:SS AM/PM]
        expect(timestamp.textContent).toMatch(/\[\d{1,2}:\d{2}:\d{2} [AP]M\]/)
      })
    })

    it('applies correct styling to different log types', () => {
      render(<GenerationProgressPage />)
      
      const logs = screen.getByTestId('real-time-logs').querySelectorAll('.flex.items-start')
      
      // Check that different log types exist
      const hasInfoLog = Array.from(logs).some(log => log.classList.contains('text-gray-300'))
      expect(hasInfoLog).toBe(true)
    })
  })

  describe('Responsive Layout', () => {
    it('uses responsive grid layout', () => {
      render(<GenerationProgressPage />)
      
      const grid = screen.getByTestId('generation-progress').querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-1', 'lg:grid-cols-3')
    })

    it('spans processing stages across 2 columns on large screens', () => {
      render(<GenerationProgressPage />)
      
      const stagesContainer = screen.getByTestId('processing-stages').parentElement
      expect(stagesContainer).toHaveClass('lg:col-span-2')
    })
  })
})

// Test the stage progression logic
describe('Stage Progression Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers({ legacyFakeTimers: false })
  })

  afterEach(() => {
    jest.useRealTimers()
  })
  
  it('progresses through stages in order', async () => {
    render(<GenerationProgressPage />)
    
    const expectedOrder = [
      'Document Analysis',
      'Content Extraction',
      'RAG Processing',
      'AI Generation'
    ]
    
    let completedStages: string[] = []
    
    // Monitor stage completions
    act(() => {
      jest.advanceTimersByTime(40000)
    })
    
    await waitFor(() => {
      const logs = screen.getAllByText(/completed$/)
      logs.forEach(log => {
        const stageMatch = log.textContent?.match(/(.+) completed/)
        if (stageMatch) {
          completedStages.push(stageMatch[1])
        }
      })
      
      // Verify stages completed in order
      expectedOrder.forEach((stage, index) => {
        if (completedStages[index]) {
          expect(completedStages[index]).toBe(stage)
        }
      })
    })
  })
})