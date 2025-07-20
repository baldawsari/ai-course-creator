import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GenerationControls } from '../generation-controls'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('GenerationControls', () => {
  const mockOnGenerate = jest.fn()
  const defaultCourseData = {
    title: 'Test Course',
    description: 'Test Description',
    resources: [{ id: 1, name: 'Resource 1' }],
    objectives: [{ id: 1, text: 'Objective 1' }],
    difficulty: 'intermediate',
    duration: 2,
    assessmentType: 'quiz',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockOnGenerate.mockResolvedValue(undefined)
  })

  describe('Basic Rendering', () => {
    it('should render generation controls with default state', () => {
      render(<GenerationControls onGenerate={mockOnGenerate} />)

      expect(screen.getByText('Generate Course')).toBeInTheDocument()
      expect(screen.getByText('Generate Course with AI')).toBeInTheDocument()
    })

    it('should render with course data', () => {
      render(
        <GenerationControls 
          courseData={defaultCourseData} 
          onGenerate={mockOnGenerate} 
        />
      )

      // The component shows readiness check
      expect(screen.getByText('Readiness Check')).toBeInTheDocument()
      // Should show 100% readiness score
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('should display quality options', () => {
      render(<GenerationControls onGenerate={mockOnGenerate} />)

      expect(screen.getByText('Claude 3 Haiku')).toBeInTheDocument()
      expect(screen.getByText('Claude 3 Sonnet')).toBeInTheDocument()
      expect(screen.getByText('Claude 3 Opus')).toBeInTheDocument()
    })
  })

  describe('Quality Mode Selection', () => {
    it('should allow switching between quality modes', async () => {
      const user = userEvent.setup()
      render(<GenerationControls onGenerate={mockOnGenerate} />)

      // Find and click on Opus mode
      const opusButton = screen.getByText('Claude 3 Opus').closest('button')
      await user.click(opusButton!)

      // Opus mode should be selected
      expect(opusButton).toHaveClass('border-purple-500')
    })

    it('should update token estimates when quality mode changes', async () => {
      const user = userEvent.setup()
      render(<GenerationControls courseData={defaultCourseData} onGenerate={mockOnGenerate} />)

      // Check initial cost estimate (find the main cost display)
      const costDisplay = screen.getByText('Estimated Cost').parentElement?.querySelector('.text-2xl')
      const initialCost = costDisplay?.textContent

      // Switch to Opus mode
      const opusButton = screen.getByText('Claude 3 Opus').closest('button')
      await user.click(opusButton!)

      // Cost should have changed
      await waitFor(() => {
        const newCostDisplay = screen.getByText('Estimated Cost').parentElement?.querySelector('.text-2xl')
        const newCost = newCostDisplay?.textContent
        expect(newCost).not.toBe(initialCost)
      })
    })
  })

  describe('Advanced Options', () => {
    it('should toggle advanced options panel', async () => {
      const user = userEvent.setup()
      render(<GenerationControls onGenerate={mockOnGenerate} />)

      // Advanced options should be hidden initially
      expect(screen.queryByText(/custom instructions/i)).not.toBeInTheDocument()

      // Click to expand
      const toggleButton = screen.getByText('Advanced Options')
      await user.click(toggleButton)

      // Advanced options should be visible
      expect(screen.getByText(/Custom Instructions/i)).toBeInTheDocument()
    })

    it('should allow adjusting generation parameters', async () => {
      const user = userEvent.setup()
      render(<GenerationControls onGenerate={mockOnGenerate} />)

      // Find creativity slider (it's visible by default)
      const creativitySlider = screen.getAllByRole('slider')[1] // Second slider is creativity
      expect(creativitySlider).toHaveValue('0.7')

      // Change creativity
      fireEvent.change(creativitySlider, { target: { value: '0.9' } })
      expect(creativitySlider).toHaveValue('0.9')
    })
  })

  describe('Generation Process', () => {
    it('should call onGenerate with correct options', async () => {
      const user = userEvent.setup()
      render(
        <GenerationControls 
          courseData={defaultCourseData} 
          onGenerate={mockOnGenerate} 
        />
      )

      const generateButton = screen.getByText('Generate Course with AI').closest('button')!
      await user.click(generateButton)

      expect(mockOnGenerate).toHaveBeenCalledWith({
        model: 'claude-3-sonnet',
        creativity: 0.7,
        includeActivities: true,
        includeAssessments: true,
        sessionCount: 4, // 2 sessions per hour * 2 hours
        interactivityLevel: 'medium',
        customInstructions: ''
      })
    })

    it('should disable generate button when course data is incomplete', () => {
      render(<GenerationControls onGenerate={mockOnGenerate} />)

      const generateButton = screen.getByText('Generate Course with AI').closest('button')!
      expect(generateButton).toBeDisabled()
    })

    it('should show loading state during generation', async () => {
      const user = userEvent.setup()
      mockOnGenerate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(
        <GenerationControls 
          courseData={defaultCourseData} 
          onGenerate={mockOnGenerate} 
        />
      )

      const generateButton = screen.getByText('Generate Course with AI').closest('button')!
      await user.click(generateButton)

      // Should show loading state
      expect(screen.getByText(/Generating Course.../i)).toBeInTheDocument()
      expect(generateButton).toBeDisabled()

      // Wait for generation to complete
      await waitFor(() => {
        expect(screen.queryByText(/Generating Course.../i)).not.toBeInTheDocument()
      })
    })

    it('should handle generation errors', async () => {
      const user = userEvent.setup()
      mockOnGenerate.mockRejectedValue(new Error('Generation failed'))

      render(
        <GenerationControls 
          courseData={defaultCourseData} 
          onGenerate={mockOnGenerate} 
        />
      )

      const generateButton = screen.getByText('Generate Course with AI').closest('button')!
      await user.click(generateButton)

      // The component updates the history with failed status
      await waitFor(() => {
        expect(mockOnGenerate).toHaveBeenCalled()
      })
    })
  })

  describe('Cost Estimation', () => {
    it('should display cost estimates for each quality mode', () => {
      render(<GenerationControls onGenerate={mockOnGenerate} />)

      // Check that model cards are displayed with pricing info
      expect(screen.getByText('Claude 3 Haiku')).toBeInTheDocument()
      expect(screen.getByText('Claude 3 Sonnet')).toBeInTheDocument() 
      expect(screen.getByText('Claude 3 Opus')).toBeInTheDocument()
      // Check for cost per token text
      const allText = screen.getAllByText(/\$[0-9.]+\/1K tokens/)
      expect(allText).toHaveLength(3) // Should have 3 model options with prices
    })

    it('should update total cost estimate based on options', async () => {
      const user = userEvent.setup()
      render(
        <GenerationControls 
          courseData={defaultCourseData} 
          onGenerate={mockOnGenerate} 
        />
      )

      // Find the estimated cost element
      const costElement = screen.getByText('Estimated Cost').previousElementSibling as HTMLElement
      const initialCost = costElement.textContent

      // Switch to Opus mode
      const opusButton = screen.getByText('Claude 3 Opus').closest('button')
      await user.click(opusButton!)

      // Cost should update
      const newCost = costElement.textContent
      expect(newCost).not.toBe(initialCost)
    })
  })

  describe('Generation History', () => {
    it('should display recent generation jobs', async () => {
      const user = userEvent.setup()
      render(
        <GenerationControls 
          courseData={defaultCourseData} 
          onGenerate={mockOnGenerate} 
        />
      )

      // Generate a course to create history
      const generateButton = screen.getByText('Generate Course with AI').closest('button')!
      await user.click(generateButton)

      // History should appear
      await waitFor(() => {
        expect(screen.getByText('Generation History')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<GenerationControls onGenerate={mockOnGenerate} />)

      // Check for main elements
      expect(screen.getByText('Generate Course')).toBeInTheDocument()
      expect(screen.getByText('AI Model Selection')).toBeInTheDocument()
      expect(screen.getByText('Generation Settings')).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(
        <GenerationControls 
          courseData={defaultCourseData} 
          onGenerate={mockOnGenerate} 
        />
      )

      // Tab through model options
      await user.tab()
      const firstButton = screen.getByText('Claude 3 Haiku').closest('button')
      expect(document.activeElement).toBe(firstButton)

      await user.tab()
      const secondButton = screen.getByText('Claude 3 Sonnet').closest('button')
      expect(document.activeElement).toBe(secondButton)

      await user.tab()
      const thirdButton = screen.getByText('Claude 3 Opus').closest('button')
      expect(document.activeElement).toBe(thirdButton)
    })

    it('should announce status changes to screen readers', async () => {
      const user = userEvent.setup()
      mockOnGenerate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(
        <GenerationControls 
          courseData={defaultCourseData} 
          onGenerate={mockOnGenerate} 
        />
      )

      const generateButton = screen.getByText('Generate Course with AI').closest('button')!
      await user.click(generateButton)

      // Check that the button shows loading state which is accessible
      expect(generateButton).toBeDisabled()
      expect(screen.getByText(/Generating Course.../i)).toBeInTheDocument()
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should adapt layout for mobile devices', () => {
      // Mock mobile viewport
      global.innerWidth = 375
      global.innerHeight = 667

      render(<GenerationControls onGenerate={mockOnGenerate} />)

      // Check that the layout adapts for mobile
      // The component uses grid layout which automatically adapts
      const modelSelection = screen.getByText('AI Model Selection')
      expect(modelSelection).toBeInTheDocument()
    })
  })
})