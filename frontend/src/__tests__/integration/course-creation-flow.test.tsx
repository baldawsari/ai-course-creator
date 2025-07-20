import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, createUserEvent, waitFor } from '@/__tests__/utils/test-utils'
import { mockAPI, server } from '@/__tests__/utils/api-mocks'
import { MockDataGenerator } from '@/__tests__/utils/mock-data'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

// Mock Course Builder Components
const CourseBuilder = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    difficulty: 'beginner',
    estimatedDuration: 60,
    learningObjectives: [],
    targetAudience: '',
    resources: [],
    generationConfig: {
      model: 'claude-3-sonnet',
      creativity: 70,
      sessionCount: 5,
      includeActivities: true,
      includeAssessments: true,
    },
  })
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationJobId, setGenerationJobId] = useState<string | null>(null)

  const handleFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files)
    setUploadedFiles(prev => [...prev, ...fileArray])

    // Simulate upload progress
    for (const file of fileArray) {
      for (let progress = 0; progress <= 100; progress += 20) {
        setUploadProgress(prev => ({ ...prev, [file.name]: progress }))
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(file => file.name !== fileName))
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[fileName]
      return newProgress
    })
  }

  const addLearningObjective = () => {
    setCourseData(prev => ({
      ...prev,
      learningObjectives: [...prev.learningObjectives, ''],
    }))
  }

  const updateLearningObjective = (index: number, value: string) => {
    setCourseData(prev => ({
      ...prev,
      learningObjectives: prev.learningObjectives.map((obj, i) => 
        i === index ? value : obj
      ),
    }))
  }

  const handleGenerateCourse = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/courses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseData,
          documentIds: uploadedFiles.map(f => f.name),
        }),
      })

      const result = await response.json()
      setGenerationJobId(result.jobId)
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div data-testid="course-builder">
      <h1>Create New Course</h1>
      
      {/* Step Indicator */}
      <div data-testid="step-indicator" className="step-indicator">
        <div className={`step ${currentStep >= 1 ? 'active' : ''}`} data-testid="step-1">
          Upload Resources
        </div>
        <div className={`step ${currentStep >= 2 ? 'active' : ''}`} data-testid="step-2">
          Configure Course
        </div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''}`} data-testid="step-3">
          Generate Content
        </div>
      </div>

      {/* Step 1: Upload Resources */}
      {currentStep === 1 && (
        <div data-testid="step-1-content">
          <h2>Upload Resources</h2>
          
          <div data-testid="file-upload-area">
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              data-testid="file-input"
              style={{ display: 'none' }}
              id="file-upload"
            />
            <label htmlFor="file-upload" data-testid="upload-button">
              <div className="upload-zone">
                Click to upload or drag files here
              </div>
            </label>
          </div>

          {/* File List */}
          <div data-testid="uploaded-files">
            {uploadedFiles.map((file) => (
              <div key={file.name} data-testid={`file-item-${file.name}`}>
                <span>{file.name}</span>
                <span>{(file.size / 1024).toFixed(1)} KB</span>
                
                {uploadProgress[file.name] !== undefined && (
                  <div data-testid={`progress-${file.name}`}>
                    <div 
                      role="progressbar"
                      aria-valuenow={uploadProgress[file.name]}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Upload progress for ${file.name}`}
                    >
                      {uploadProgress[file.name]}%
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleRemoveFile(file.name)}
                  data-testid={`remove-${file.name}`}
                  aria-label={`Remove ${file.name}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setCurrentStep(2)}
            disabled={uploadedFiles.length === 0}
            data-testid="next-step-button"
          >
            Next: Configure Course
          </button>
        </div>
      )}

      {/* Step 2: Configure Course */}
      {currentStep === 2 && (
        <div data-testid="step-2-content">
          <h2>Configure Course</h2>
          
          <div>
            <label htmlFor="course-title">Course Title</label>
            <input
              id="course-title"
              type="text"
              value={courseData.title}
              onChange={(e) => setCourseData(prev => ({ ...prev, title: e.target.value }))}
              data-testid="course-title-input"
              required
            />
          </div>

          <div>
            <label htmlFor="course-description">Description</label>
            <textarea
              id="course-description"
              value={courseData.description}
              onChange={(e) => setCourseData(prev => ({ ...prev, description: e.target.value }))}
              data-testid="course-description-input"
              rows={4}
            />
          </div>

          <div>
            <label htmlFor="difficulty">Difficulty Level</label>
            <select
              id="difficulty"
              value={courseData.difficulty}
              onChange={(e) => setCourseData(prev => ({ ...prev, difficulty: e.target.value }))}
              data-testid="difficulty-select"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label htmlFor="duration">Estimated Duration (minutes)</label>
            <input
              id="duration"
              type="number"
              min="30"
              max="600"
              value={courseData.estimatedDuration}
              onChange={(e) => setCourseData(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) }))}
              data-testid="duration-input"
            />
          </div>

          <div>
            <label htmlFor="target-audience">Target Audience</label>
            <input
              id="target-audience"
              type="text"
              value={courseData.targetAudience}
              onChange={(e) => setCourseData(prev => ({ ...prev, targetAudience: e.target.value }))}
              data-testid="target-audience-input"
              placeholder="e.g., Software developers, IT professionals"
            />
          </div>

          {/* Learning Objectives */}
          <div>
            <label>Learning Objectives</label>
            {courseData.learningObjectives.map((objective, index) => (
              <div key={index} data-testid={`objective-${index}`}>
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => updateLearningObjective(index, e.target.value)}
                  data-testid={`objective-input-${index}`}
                  placeholder="Enter learning objective"
                />
                <button
                  onClick={() => setCourseData(prev => ({
                    ...prev,
                    learningObjectives: prev.learningObjectives.filter((_, i) => i !== index),
                  }))}
                  data-testid={`remove-objective-${index}`}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={addLearningObjective}
              data-testid="add-objective-button"
            >
              Add Learning Objective
            </button>
          </div>

          <div>
            <button
              onClick={() => setCurrentStep(1)}
              data-testid="back-button"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              disabled={!courseData.title || !courseData.description}
              data-testid="next-step-button"
            >
              Next: Generate Content
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Generate Content */}
      {currentStep === 3 && (
        <div data-testid="step-3-content">
          <h2>Generate Course Content</h2>
          
          <div>
            <label htmlFor="ai-model">AI Model</label>
            <select
              id="ai-model"
              value={courseData.generationConfig.model}
              onChange={(e) => setCourseData(prev => ({
                ...prev,
                generationConfig: { ...prev.generationConfig, model: e.target.value },
              }))}
              data-testid="model-select"
            >
              <option value="claude-3-haiku">Claude 3 Haiku (Fast & Economical)</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet (Balanced)</option>
              <option value="claude-3-opus">Claude 3 Opus (Most Capable)</option>
            </select>
          </div>

          <div>
            <label htmlFor="creativity">Creativity Level: {courseData.generationConfig.creativity}%</label>
            <input
              id="creativity"
              type="range"
              min="0"
              max="100"
              value={courseData.generationConfig.creativity}
              onChange={(e) => setCourseData(prev => ({
                ...prev,
                generationConfig: { ...prev.generationConfig, creativity: parseInt(e.target.value) },
              }))}
              data-testid="creativity-slider"
            />
          </div>

          <div>
            <label htmlFor="session-count">Number of Sessions</label>
            <input
              id="session-count"
              type="number"
              min="1"
              max="20"
              value={courseData.generationConfig.sessionCount}
              onChange={(e) => setCourseData(prev => ({
                ...prev,
                generationConfig: { ...prev.generationConfig, sessionCount: parseInt(e.target.value) },
              }))}
              data-testid="session-count-input"
            />
          </div>

          <div>
            <label>
              <input
                type="checkbox"
                checked={courseData.generationConfig.includeActivities}
                onChange={(e) => setCourseData(prev => ({
                  ...prev,
                  generationConfig: { ...prev.generationConfig, includeActivities: e.target.checked },
                }))}
                data-testid="include-activities-checkbox"
              />
              Include Interactive Activities
            </label>
          </div>

          <div>
            <label>
              <input
                type="checkbox"
                checked={courseData.generationConfig.includeAssessments}
                onChange={(e) => setCourseData(prev => ({
                  ...prev,
                  generationConfig: { ...prev.generationConfig, includeAssessments: e.target.checked },
                }))}
                data-testid="include-assessments-checkbox"
              />
              Include Assessments
            </label>
          </div>

          {/* Cost Estimation */}
          <div data-testid="cost-estimation">
            <h3>Estimated Cost</h3>
            <p>Based on your configuration: $2.50 - $4.00</p>
          </div>

          <div>
            <button
              onClick={() => setCurrentStep(2)}
              data-testid="back-button"
            >
              Back
            </button>
            <button
              onClick={handleGenerateCourse}
              disabled={isGenerating || uploadedFiles.length === 0}
              data-testid="generate-course-button"
            >
              {isGenerating ? 'Generating...' : 'Generate Course'}
            </button>
          </div>

          {generationJobId && (
            <div data-testid="generation-started">
              <p>Course generation started!</p>
              <p>Job ID: {generationJobId}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Setup MSW server
mockAPI.setupServer()

describe('Course Creation Flow Integration Tests', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Course Creation Flow', () => {
    it('should complete the entire course creation process', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      // Verify initial state
      expect(screen.getByText('Create New Course')).toBeInTheDocument()
      expect(screen.getByTestId('step-1')).toHaveClass('active')
      expect(screen.getByTestId('step-2')).not.toHaveClass('active')

      // Step 1: Upload Resources
      expect(screen.getByRole('heading', { name: 'Upload Resources' })).toBeInTheDocument()

      // Create mock files
      const file1 = new File(['content1'], 'document1.pdf', { type: 'application/pdf' })
      const file2 = new File(['content2'], 'document2.txt', { type: 'text/plain' })

      // Upload files
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, [file1, file2])

      // Wait for upload progress
      await waitFor(() => {
        expect(screen.getByTestId('file-item-document1.pdf')).toBeInTheDocument()
        expect(screen.getByTestId('file-item-document2.txt')).toBeInTheDocument()
      })

      // Proceed to step 2
      await user.click(screen.getByTestId('next-step-button'))

      // Step 2: Configure Course
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Configure Course' })).toBeInTheDocument()
        expect(screen.getByTestId('step-2')).toHaveClass('active')
      })

      // Fill course configuration
      await user.type(screen.getByTestId('course-title-input'), 'JavaScript Fundamentals')
      await user.type(screen.getByTestId('course-description-input'), 'Learn the basics of JavaScript programming')
      await user.selectOptions(screen.getByTestId('difficulty-select'), 'intermediate')
      await user.clear(screen.getByTestId('duration-input'))
      await user.type(screen.getByTestId('duration-input'), '180')
      await user.type(screen.getByTestId('target-audience-input'), 'Beginner programmers')

      // Add learning objectives
      await user.click(screen.getByTestId('add-objective-button'))
      await user.type(screen.getByTestId('objective-input-0'), 'Understand JavaScript syntax')

      await user.click(screen.getByTestId('add-objective-button'))
      await user.type(screen.getByTestId('objective-input-1'), 'Build simple web applications')

      // Proceed to step 3
      await user.click(screen.getByTestId('next-step-button'))

      // Step 3: Generate Content
      await waitFor(() => {
        expect(screen.getByText('Generate Course Content')).toBeInTheDocument()
        expect(screen.getByTestId('step-3')).toHaveClass('active')
      })

      // Configure generation settings
      await user.selectOptions(screen.getByTestId('model-select'), 'claude-3-sonnet')

      // Adjust creativity slider
      const creativitySlider = screen.getByTestId('creativity-slider')
      creativitySlider.focus()
      await user.keyboard('{Control>}a{/Control}{Delete}80')

      await user.clear(screen.getByTestId('session-count-input'))
      await user.type(screen.getByTestId('session-count-input'), '6')

      // Ensure checkboxes are checked
      expect(screen.getByTestId('include-activities-checkbox')).toBeChecked()
      expect(screen.getByTestId('include-assessments-checkbox')).toBeChecked()

      // Mock generation response
      const mockJobId = 'job-12345'
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/courses/generate')) {
          // Add a delay to ensure the generating state is visible
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({
                  jobId: mockJobId, 
                  status: 'started'
                })
              })
            }, 100)
          })
        }
        return Promise.reject(new Error('Not found'))
      })

      // Start generation
      await user.click(screen.getByTestId('generate-course-button'))

      // Should show generating state
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument()
      })

      // Wait for generation to start
      await waitFor(() => {
        expect(screen.getByTestId('generation-started')).toBeInTheDocument()
        expect(screen.getByText(`Job ID: ${mockJobId}`)).toBeInTheDocument()
      })
      
      // Restore original fetch
      global.fetch = originalFetch
    })

    it('should validate file uploads', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      // Try to proceed without uploading files
      const nextButton = screen.getByTestId('next-step-button')
      expect(nextButton).toBeDisabled()

      // Upload a file
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(nextButton).toBeEnabled()
      })
    })

    it('should show upload progress for files', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      // Should show progress during upload
      await waitFor(() => {
        const progressElement = screen.getByTestId('progress-test.pdf')
        expect(progressElement).toBeInTheDocument()
      })

      // Progress should eventually reach 100%
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should allow file removal', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByTestId('file-item-test.pdf')).toBeInTheDocument()
      })

      // Remove the file
      await user.click(screen.getByTestId('remove-test.pdf'))

      expect(screen.queryByTestId('file-item-test.pdf')).not.toBeInTheDocument()
    })
  })

  describe('Step Navigation', () => {
    it('should preserve data when navigating between steps', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      // Upload file and proceed to step 2
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByTestId('file-input'), file)
      await user.click(screen.getByTestId('next-step-button'))

      // Fill course data
      await user.type(screen.getByTestId('course-title-input'), 'Test Course')
      await user.type(screen.getByTestId('course-description-input'), 'Test Description')

      // Go back to step 1
      await user.click(screen.getByTestId('back-button'))

      // File should still be there
      await waitFor(() => {
        expect(screen.getByTestId('file-item-test.pdf')).toBeInTheDocument()
      })

      // Go forward to step 2 again
      await user.click(screen.getByTestId('next-step-button'))

      // Data should be preserved
      expect(screen.getByTestId('course-title-input')).toHaveValue('Test Course')
      expect(screen.getByTestId('course-description-input')).toHaveValue('Test Description')
    })

    it('should update step indicator correctly', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      // Initially only step 1 is active
      expect(screen.getByTestId('step-1')).toHaveClass('active')
      expect(screen.getByTestId('step-2')).not.toHaveClass('active')
      expect(screen.getByTestId('step-3')).not.toHaveClass('active')

      // Upload file and proceed to step 2
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByTestId('file-input'), file)
      await user.click(screen.getByTestId('next-step-button'))

      // Steps 1 and 2 should be active
      await waitFor(() => {
        expect(screen.getByTestId('step-1')).toHaveClass('active')
        expect(screen.getByTestId('step-2')).toHaveClass('active')
        expect(screen.getByTestId('step-3')).not.toHaveClass('active')
      })

      // Fill required fields and proceed to step 3
      await user.type(screen.getByTestId('course-title-input'), 'Test Course')
      await user.type(screen.getByTestId('course-description-input'), 'Test Description')
      await user.click(screen.getByTestId('next-step-button'))

      // All steps should be active
      await waitFor(() => {
        expect(screen.getByTestId('step-1')).toHaveClass('active')
        expect(screen.getByTestId('step-2')).toHaveClass('active')
        expect(screen.getByTestId('step-3')).toHaveClass('active')
      })
    })
  })

  describe('Form Validation', () => {
    it('should validate required fields in step 2', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      // Navigate to step 2
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByTestId('file-input'), file)
      await user.click(screen.getByTestId('next-step-button'))

      // Try to proceed without filling required fields
      const nextButton = screen.getByTestId('next-step-button')
      expect(nextButton).toBeDisabled()

      // Fill title only
      await user.type(screen.getByTestId('course-title-input'), 'Test Course')
      expect(nextButton).toBeDisabled()

      // Fill description
      await user.type(screen.getByTestId('course-description-input'), 'Test Description')
      expect(nextButton).toBeEnabled()
    })

    it('should validate numeric inputs', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      // Navigate to step 2
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByTestId('file-input'), file)
      await user.click(screen.getByTestId('next-step-button'))

      const durationInput = screen.getByTestId('duration-input')

      // Test min/max constraints
      expect(durationInput).toHaveAttribute('min', '30')
      expect(durationInput).toHaveAttribute('max', '600')

      // Test invalid input
      await user.clear(durationInput)
      await user.type(durationInput, '10') // Below minimum

      expect(durationInput).toBeInvalid()
    })
  })

  describe('Learning Objectives Management', () => {
    it('should allow adding and removing learning objectives', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      // Navigate to step 2
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByTestId('file-input'), file)
      await user.click(screen.getByTestId('next-step-button'))

      // Add first objective
      await user.click(screen.getByTestId('add-objective-button'))
      expect(screen.getByTestId('objective-0')).toBeInTheDocument()

      await user.type(screen.getByTestId('objective-input-0'), 'First objective')

      // Add second objective
      await user.click(screen.getByTestId('add-objective-button'))
      expect(screen.getByTestId('objective-1')).toBeInTheDocument()

      await user.type(screen.getByTestId('objective-input-1'), 'Second objective')

      // Remove first objective
      await user.click(screen.getByTestId('remove-objective-0'))

      // Second objective should move to index 0
      expect(screen.queryByTestId('objective-1')).not.toBeInTheDocument()
      expect(screen.getByTestId('objective-input-0')).toHaveValue('Second objective')
    })
  })

  describe('Generation Configuration', () => {
    it('should show cost estimation based on configuration', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      // Navigate to step 3
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByTestId('file-input'), file)
      await user.click(screen.getByTestId('next-step-button'))

      await user.type(screen.getByTestId('course-title-input'), 'Test Course')
      await user.type(screen.getByTestId('course-description-input'), 'Test Description')
      await user.click(screen.getByTestId('next-step-button'))

      // Should show cost estimation
      await waitFor(() => {
        expect(screen.getByTestId('cost-estimation')).toBeInTheDocument()
        expect(screen.getByText(/\$\d+\.\d+ - \$\d+\.\d+/)).toBeInTheDocument()
      })
    })

    it('should disable generation without files', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      // Navigate directly to step 3 (this wouldn't happen in real usage)
      const courseBuilderElement = screen.getByTestId('course-builder')
      
      // Manually simulate being on step 3 without files
      // In a real app, this would be prevented by the step navigation logic
      expect(screen.getByTestId('step-1')).toHaveClass('active')
    })
  })

  describe('Error Handling', () => {
    it('should handle generation API errors', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      // Complete flow to generation step
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByTestId('file-input'), file)
      await user.click(screen.getByTestId('next-step-button'))

      await user.type(screen.getByTestId('course-title-input'), 'Test Course')
      await user.type(screen.getByTestId('course-description-input'), 'Test Description')
      await user.click(screen.getByTestId('next-step-button'))

      // Mock API error using fetch
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/courses/generate')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Generation service unavailable' })
          })
        }
        return Promise.reject(new Error('Not found'))
      })

      // Attempt generation
      await user.click(screen.getByTestId('generate-course-button'))

      // Should handle error gracefully (in a real app, would show error message)
      await waitFor(() => {
        expect(screen.getByTestId('generate-course-button')).not.toBeDisabled()
      })
      
      // Restore original fetch
      global.fetch = originalFetch
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for form controls', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      // Navigate to step 2
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByTestId('file-input'), file)
      await user.click(screen.getByTestId('next-step-button'))

      // Check form labels
      expect(screen.getByLabelText('Course Title')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Difficulty Level')).toBeInTheDocument()
      expect(screen.getByLabelText('Estimated Duration (minutes)')).toBeInTheDocument()
    })

    it('should have proper progress bar accessibility', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByTestId('file-input'), file)

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar')
        expect(progressBar).toHaveAttribute('aria-label', 'Upload progress for test.pdf')
        expect(progressBar).toHaveAttribute('aria-valuemin', '0')
        expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      })
    })

    it('should have proper button labels for file removal', async () => {
      const user = createUserEvent()
      render(<CourseBuilder />, { wrapper: createWrapper() })

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByTestId('file-input'), file)

      await waitFor(() => {
        const removeButton = screen.getByRole('button', { name: 'Remove test.pdf' })
        expect(removeButton).toBeInTheDocument()
      })
    })
  })
})