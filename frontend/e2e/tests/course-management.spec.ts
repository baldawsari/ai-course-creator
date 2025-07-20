import { test, expect } from '@playwright/test'
import { TestHelpers } from '../utils/test-helpers'

test.describe('Course Management', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await helpers.login()
  })

  test('should display courses page correctly', async ({ page }) => {
    await helpers.goToCourses()
    
    // Check page elements
    await expect(page.locator('[data-testid="courses-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="create-course-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="courses-grid"]')).toBeVisible()
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-dropdown"]')).toBeVisible()
  })

  test('should create a new course successfully', async ({ page }) => {
    await helpers.goToCourses()
    
    // Click create course button
    await page.click('[data-testid="create-course-button"]')
    await expect(page).toHaveURL('/courses/new')
    
    // Step 1: Upload resources
    await expect(page.locator('[data-testid="resource-upload"]')).toBeVisible()
    
    // Mock file upload
    await helpers.uploadFile('[data-testid="file-upload-input"]', '../fixtures/sample-document.pdf')
    await helpers.waitForToast('Document uploaded successfully')
    
    // Proceed to next step
    await page.click('[data-testid="next-step-button"]')
    
    // Step 2: Configure course
    await expect(page.locator('[data-testid="course-configuration"]')).toBeVisible()
    
    await helpers.fillForm({
      'course-title': 'Test Course Title',
      'course-description': 'This is a test course description',
      'target-audience': 'Software developers, IT professionals',
    })
    
    // Set course options (difficulty is button-based, not select)
    await page.click('[data-testid="difficulty-intermediate"]')
    await page.fill('[data-testid="duration-input"]', '120')
    
    // Add learning objectives
    await page.click('[data-testid="add-objective-button"]')
    await page.fill('[data-testid="objective-input-0"]', 'Learn fundamental concepts')
    await page.click('[data-testid="add-objective-button"]')
    await page.fill('[data-testid="objective-input-1"]', 'Apply knowledge in practice')
    
    await page.click('[data-testid="next-step-button"]')
    
    // Step 3: Generation settings
    await expect(page.locator('[data-testid="generation-controls"]')).toBeVisible()
    
    // Select AI model
    await page.click('[data-testid="model-sonnet"]')
    
    // Configure generation options
    await page.fill('[data-testid="creativity-slider"]', '70')
    await page.fill('[data-testid="session-count-input"]', '5')
    await page.check('[data-testid="include-activities-checkbox"]')
    await page.check('[data-testid="include-assessments-checkbox"]')
    
    // Mock course generation
    await helpers.mockApiResponse('**/courses/generate', {
      jobId: 'job-123',
      courseId: 'course-123',
      status: 'started',
    })
    
    await page.click('[data-testid="generate-course-button"]')
    
    // Should navigate to generation progress page
    await expect(page).toHaveURL(/\/generation\/job-123/)
    await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible()
  })

  test('should handle course generation progress', async ({ page }) => {
    // Navigate directly to generation progress
    await page.goto('/generation/job-123')
    
    // Mock WebSocket connection for real-time updates
    await page.evaluate(() => {
      // Mock WebSocket
      const mockWS = {
        send: () => {},
        close: () => {},
        addEventListener: (event: string, handler: Function) => {
          if (event === 'message') {
            // Simulate progress updates
            setTimeout(() => handler({ data: JSON.stringify({
              type: 'stage_update',
              data: { stage: 'document_analysis', progress: 25 }
            })}), 1000)
            
            setTimeout(() => handler({ data: JSON.stringify({
              type: 'stage_update', 
              data: { stage: 'content_extraction', progress: 50 }
            })}), 2000)
            
            setTimeout(() => handler({ data: JSON.stringify({
              type: 'complete',
              data: { courseId: 'course-123' }
            })}), 3000)
          }
        }
      }
      ;(window as any).WebSocket = function() { return mockWS }
    })
    
    // Check initial state
    await expect(page.locator('[data-testid="processing-stages"]')).toBeVisible()
    await expect(page.locator('[data-testid="real-time-logs"]')).toBeVisible()
    await expect(page.locator('[data-testid="rag-context-viewer"]')).toBeVisible()
    await expect(page.locator('[data-testid="preview-panel"]')).toBeVisible()
    
    // Wait for completion
    await helpers.waitForProgressComplete()
    
    // Should redirect to course editor
    await expect(page).toHaveURL('/courses/course-123/edit')
  })

  test('should edit course content', async ({ page }) => {
    // Mock course data
    await helpers.mockApiResponse('**/courses/course-123', {
      id: 'course-123',
      title: 'Test Course',
      sessions: [
        {
          id: 'session-1',
          title: 'Introduction',
          activities: [
            { id: 'activity-1', title: 'Overview', type: 'lesson' }
          ]
        }
      ]
    })
    
    await page.goto('/courses/course-123/edit')
    
    // Check editor layout
    await expect(page.locator('[data-testid="course-editor"]')).toBeVisible()
    await expect(page.locator('[data-testid="session-board"]')).toBeVisible()
    await expect(page.locator('[data-testid="content-editor"]')).toBeVisible()
    
    // Edit session title
    const sessionCard = page.locator('[data-testid="session-card-session-1"]')
    await sessionCard.click()
    await sessionCard.locator('[data-testid="edit-title-button"]').click()
    await sessionCard.locator('[data-testid="title-input"]').fill('Updated Introduction')
    await sessionCard.locator('[data-testid="save-title-button"]').click()
    
    // Add new activity
    await sessionCard.locator('[data-testid="add-activity-button"]').click()
    await page.fill('[data-testid="activity-title-input"]', 'New Activity')
    await page.selectOption('[data-testid="activity-type-select"]', 'exercise')
    await page.click('[data-testid="create-activity-button"]')
    
    // Edit activity content
    const newActivity = page.locator('[data-testid="activity-card-activity-2"]')
    await newActivity.click()
    
    await expect(page.locator('[data-testid="content-editor"]')).toBeVisible()
    await page.fill('[data-testid="content-textarea"]', 'This is the updated activity content.')
    
    // Auto-save should trigger
    await helpers.waitForToast('Auto-saved')
  })

  test('should handle course export', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    // Open export options
    await page.click('[data-testid="export-button"]')
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible()
    
    // Select export formats
    await page.check('[data-testid="export-html-checkbox"]')
    await page.check('[data-testid="export-pdf-checkbox"]')
    
    // Configure export options
    await page.selectOption('[data-testid="template-select"]', 'modern')
    await page.check('[data-testid="include-toc-checkbox"]')
    
    // Mock export request
    await helpers.mockApiResponse('**/export/bundle/course-123', {
      jobId: 'export-job-123',
      status: 'started',
    })
    
    await page.click('[data-testid="start-export-button"]')
    
    // Check export progress
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible()
    
    // Mock completion
    await helpers.mockApiResponse('**/jobs/export-job-123', {
      id: 'export-job-123',
      status: 'completed',
      downloadUrl: '/downloads/course-export.zip',
    })
    
    await helpers.waitForToast('Export completed')
    
    // Download should be available
    await expect(page.locator('[data-testid="download-button"]')).toBeVisible()
  })

  test('should search and filter courses', async ({ page }) => {
    await helpers.goToCourses()
    
    // Mock courses data
    await helpers.mockApiResponse('**/courses*', {
      courses: [
        { id: '1', title: 'JavaScript Fundamentals', status: 'published', difficulty: 'beginner' },
        { id: '2', title: 'Advanced React', status: 'draft', difficulty: 'advanced' },
        { id: '3', title: 'Node.js Backend', status: 'published', difficulty: 'intermediate' },
      ],
      total: 3,
    })
    
    // Test search
    await helpers.search('JavaScript')
    await expect(page.locator('[data-testid="course-card-1"]')).toBeVisible()
    await expect(page.locator('[data-testid="course-card-2"]')).not.toBeVisible()
    
    // Clear search
    await helpers.clearSearch()
    
    // Test filters
    await page.click('[data-testid="filter-dropdown"]')
    await page.click('[data-testid="filter-status-published"]')
    
    await expect(page.locator('[data-testid="course-card-1"]')).toBeVisible()
    await expect(page.locator('[data-testid="course-card-3"]')).toBeVisible()
    await expect(page.locator('[data-testid="course-card-2"]')).not.toBeVisible()
    
    // Test difficulty filter
    await page.click('[data-testid="filter-difficulty-beginner"]')
    await expect(page.locator('[data-testid="course-card-1"]')).toBeVisible()
    await expect(page.locator('[data-testid="course-card-3"]')).not.toBeVisible()
  })

  test('should delete course with confirmation', async ({ page }) => {
    await helpers.goToCourses()
    
    // Mock single course
    await helpers.mockApiResponse('**/courses*', {
      courses: [
        { id: '1', title: 'Course to Delete', status: 'draft' },
      ],
      total: 1,
    })
    
    const courseCard = page.locator('[data-testid="course-card-1"]')
    await courseCard.hover()
    await courseCard.locator('[data-testid="course-menu-button"]').click()
    await page.click('[data-testid="delete-course-option"]')
    
    // Check confirmation dialog
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible()
    await expect(page.locator('[data-testid="course-title-text"]')).toContainText('Course to Delete')
    
    // Mock deletion
    await helpers.mockApiResponse('**/courses/1', { success: true })
    
    await page.click('[data-testid="confirm-delete-button"]')
    
    await helpers.waitForToast('Course deleted successfully')
    await expect(courseCard).not.toBeVisible()
  })

  test('should handle bulk course operations', async ({ page }) => {
    await helpers.goToCourses()
    
    // Mock multiple courses
    await helpers.mockApiResponse('**/courses*', {
      courses: [
        { id: '1', title: 'Course 1', status: 'draft' },
        { id: '2', title: 'Course 2', status: 'draft' },
        { id: '3', title: 'Course 3', status: 'published' },
      ],
      total: 3,
    })
    
    // Select multiple courses
    await page.check('[data-testid="select-course-1"]')
    await page.check('[data-testid="select-course-2"]')
    
    // Check bulk actions appear
    await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible()
    await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 selected')
    
    // Test bulk delete
    await page.click('[data-testid="bulk-delete-button"]')
    await expect(page.locator('[data-testid="bulk-delete-confirmation"]')).toBeVisible()
    
    // Mock bulk deletion
    await helpers.mockApiResponse('**/courses/bulk', { success: true, deleted: 2 })
    
    await page.click('[data-testid="confirm-bulk-delete-button"]')
    
    await helpers.waitForToast('2 courses deleted successfully')
  })
})

test.describe('Course Management - Mobile', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await helpers.login()
  })

  test('should handle mobile course creation', async ({ page }) => {
    await helpers.goToCourses()
    
    // Check mobile layout
    await expect(page.locator('[data-testid="mobile-courses-layout"]')).toBeVisible()
    
    // Use floating action button
    await page.click('[data-testid="mobile-fab-create-course"]')
    
    // Check mobile course builder
    await expect(page.locator('[data-testid="mobile-course-builder"]')).toBeVisible()
    
    // Test mobile file upload
    await page.click('[data-testid="mobile-upload-button"]')
    await helpers.uploadFile('[data-testid="mobile-file-input"]', '../fixtures/sample-document.pdf')
    
    // Check mobile progress indicator
    await expect(page.locator('[data-testid="mobile-upload-progress"]')).toBeVisible()
  })

  test('should handle mobile course editing with touch gestures', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    // Check mobile editor layout
    await expect(page.locator('[data-testid="mobile-editor-layout"]')).toBeVisible()
    
    const sessionCard = page.locator('[data-testid="session-card-session-1"]')
    
    // Test swipe gesture
    await helpers.swipeLeft(sessionCard)
    await expect(page.locator('[data-testid="swipe-actions"]')).toBeVisible()
    
    // Test long press
    await helpers.longPress(sessionCard)
    await expect(page.locator('[data-testid="context-menu"]')).toBeVisible()
  })
})