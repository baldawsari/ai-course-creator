import { test, expect } from '@playwright/test'
import { TestHelpers } from '../utils/test-helpers'

test.describe('Export System E2E Tests', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await helpers.login()
  })

  test('should export course to HTML format', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    // Open export modal
    await page.click('[data-testid="export-button"]')
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible()
    
    // Select HTML format
    await page.check('[data-testid="export-format-html"]')
    await page.selectOption('[data-testid="template-select"]', 'modern')
    await page.check('[data-testid="include-toc"]')
    
    // Mock export job
    await helpers.mockApiResponse('**/export/html/course-123', {
      jobId: 'export-job-123',
      status: 'started'
    })
    
    await page.click('[data-testid="start-export-button"]')
    
    // Check export progress
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible()
    
    // Mock job completion
    await helpers.mockApiResponse('**/jobs/export-job-123', {
      id: 'export-job-123',
      status: 'completed',
      result: {
        downloadUrl: '/downloads/course-123.html',
        previewUrl: '/preview/course-123.html'
      }
    })
    
    // Simulate progress updates
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('export-progress', {
        detail: { jobId: 'export-job-123', progress: 100, status: 'completed' }
      }))
    })
    
    await expect(page.locator('[data-testid="export-complete"]')).toBeVisible()
    await expect(page.locator('[data-testid="download-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="preview-button"]')).toBeVisible()
  })

  test('should export course to PDF format', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    await page.click('[data-testid="export-button"]')
    
    // Select PDF format with custom options
    await page.check('[data-testid="export-format-pdf"]')
    await page.selectOption('[data-testid="pdf-page-size"]', 'A4')
    await page.selectOption('[data-testid="pdf-orientation"]', 'portrait')
    await page.check('[data-testid="pdf-include-cover"]')
    await page.check('[data-testid="pdf-include-toc"]')
    
    // Mock PDF export
    await helpers.mockApiResponse('**/export/pdf/course-123', {
      jobId: 'pdf-export-job-456',
      status: 'started'
    })
    
    await page.click('[data-testid="start-export-button"]')
    
    // Check PDF-specific progress indicators
    await expect(page.locator('[data-testid="pdf-generation-status"]')).toBeVisible()
    
    // Mock completion
    await helpers.mockApiResponse('**/jobs/pdf-export-job-456', {
      id: 'pdf-export-job-456',
      status: 'completed',
      result: {
        downloadUrl: '/downloads/course-123.pdf',
        fileSize: '2.5 MB',
        pages: 45
      }
    })
    
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('export-progress', {
        detail: { 
          jobId: 'pdf-export-job-456', 
          progress: 100, 
          status: 'completed',
          metadata: { pages: 45, fileSize: '2.5 MB' }
        }
      }))
    })
    
    await expect(page.locator('[data-testid="pdf-export-complete"]')).toBeVisible()
    await expect(page.locator('[data-testid="pdf-metadata"]')).toContainText('45 pages')
    await expect(page.locator('[data-testid="pdf-metadata"]')).toContainText('2.5 MB')
  })

  test('should export course to PowerPoint format', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    await page.click('[data-testid="export-button"]')
    
    // Select PowerPoint format
    await page.check('[data-testid="export-format-pptx"]')
    await page.selectOption('[data-testid="pptx-template"]', 'professional')
    await page.selectOption('[data-testid="pptx-aspect-ratio"]', '16:9')
    await page.check('[data-testid="pptx-include-speaker-notes"]')
    
    // Mock PowerPoint export
    await helpers.mockApiResponse('**/export/pptx/course-123', {
      jobId: 'pptx-export-job-789',
      status: 'started'
    })
    
    await page.click('[data-testid="start-export-button"]')
    
    // Check PowerPoint-specific progress
    await expect(page.locator('[data-testid="pptx-generation-status"]')).toBeVisible()
    
    // Mock completion
    await helpers.mockApiResponse('**/jobs/pptx-export-job-789', {
      id: 'pptx-export-job-789',
      status: 'completed',
      result: {
        downloadUrl: '/downloads/course-123.pptx',
        slides: 28,
        fileSize: '15.3 MB'
      }
    })
    
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('export-progress', {
        detail: { 
          jobId: 'pptx-export-job-789', 
          progress: 100, 
          status: 'completed',
          metadata: { slides: 28, fileSize: '15.3 MB' }
        }
      }))
    })
    
    await expect(page.locator('[data-testid="pptx-export-complete"]')).toBeVisible()
    await expect(page.locator('[data-testid="pptx-metadata"]')).toContainText('28 slides')
  })

  test('should export course bundle with multiple formats', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    await page.click('[data-testid="export-button"]')
    
    // Select multiple formats for bundle export
    await page.check('[data-testid="export-format-html"]')
    await page.check('[data-testid="export-format-pdf"]')
    await page.check('[data-testid="export-format-pptx"]')
    
    // Configure options for each format
    await page.selectOption('[data-testid="html-template-select"]', 'modern')
    await page.selectOption('[data-testid="pdf-page-size"]', 'A4')
    await page.selectOption('[data-testid="pptx-template"]', 'minimal')
    
    // Mock bundle export
    await helpers.mockApiResponse('**/export/bundle/course-123', {
      jobId: 'bundle-export-job-123',
      status: 'started',
      formats: ['html', 'pdf', 'pptx']
    })
    
    await page.click('[data-testid="start-export-button"]')
    
    // Check bundle export progress
    await expect(page.locator('[data-testid="bundle-export-progress"]')).toBeVisible()
    
    // Should show progress for each format
    await expect(page.locator('[data-testid="format-progress-html"]')).toBeVisible()
    await expect(page.locator('[data-testid="format-progress-pdf"]')).toBeVisible()
    await expect(page.locator('[data-testid="format-progress-pptx"]')).toBeVisible()
    
    // Simulate progressive completion
    await page.evaluate(() => {
      // HTML completes first
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('export-progress', {
          detail: { 
            jobId: 'bundle-export-job-123',
            format: 'html',
            progress: 100,
            status: 'completed'
          }
        }))
      }, 500)
      
      // PDF completes second
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('export-progress', {
          detail: { 
            jobId: 'bundle-export-job-123',
            format: 'pdf',
            progress: 100,
            status: 'completed'
          }
        }))
      }, 1000)
      
      // PowerPoint completes last
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('export-progress', {
          detail: { 
            jobId: 'bundle-export-job-123',
            format: 'pptx',
            progress: 100,
            status: 'completed'
          }
        }))
        
        // Bundle complete
        window.dispatchEvent(new CustomEvent('export-progress', {
          detail: { 
            jobId: 'bundle-export-job-123',
            progress: 100,
            status: 'completed',
            bundleComplete: true
          }
        }))
      }, 1500)
    })
    
    // Wait for all formats to complete
    await expect(page.locator('[data-testid="format-status-html-complete"]')).toBeVisible()
    await expect(page.locator('[data-testid="format-status-pdf-complete"]')).toBeVisible()
    await expect(page.locator('[data-testid="format-status-pptx-complete"]')).toBeVisible()
    
    // Bundle should be ready
    await expect(page.locator('[data-testid="bundle-export-complete"]')).toBeVisible()
    await expect(page.locator('[data-testid="download-bundle-button"]')).toBeVisible()
  })

  test('should handle export errors gracefully', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    await page.click('[data-testid="export-button"]')
    await page.check('[data-testid="export-format-pdf"]')
    
    // Mock export failure
    await helpers.mockApiError('**/export/pdf/course-123', 500, 'Export service unavailable')
    
    await page.click('[data-testid="start-export-button"]')
    
    // Should show error message
    await expect(page.locator('[data-testid="export-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-error"]')).toContainText('Export service unavailable')
    
    // Should offer retry option
    await expect(page.locator('[data-testid="retry-export-button"]')).toBeVisible()
    
    // Test retry functionality
    await helpers.mockApiResponse('**/export/pdf/course-123', {
      jobId: 'retry-export-job-456',
      status: 'started'
    })
    
    await page.click('[data-testid="retry-export-button"]')
    
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible()
  })

  test('should manage export history and downloads', async ({ page }) => {
    await page.goto('/exports')
    
    // Mock export history
    await helpers.mockApiResponse('**/exports*', {
      exports: [
        {
          id: 'export-1',
          courseId: 'course-123',
          courseTitle: 'JavaScript Fundamentals',
          format: 'html',
          status: 'completed',
          downloadUrl: '/downloads/js-fundamentals.html',
          createdAt: '2024-01-15T10:30:00Z',
          fileSize: '2.1 MB'
        },
        {
          id: 'export-2',
          courseId: 'course-123',
          courseTitle: 'JavaScript Fundamentals',
          format: 'pdf',
          status: 'completed',
          downloadUrl: '/downloads/js-fundamentals.pdf',
          createdAt: '2024-01-14T15:45:00Z',
          fileSize: '5.8 MB'
        },
        {
          id: 'export-3',
          courseId: 'course-456',
          courseTitle: 'React Advanced',
          format: 'bundle',
          status: 'processing',
          progress: 65,
          createdAt: '2024-01-15T11:00:00Z'
        }
      ]
    })
    
    await page.reload()
    
    // Check export history display
    await expect(page.locator('[data-testid="export-item"]')).toHaveCount(3)
    
    // Check completed exports
    const completedExport = page.locator('[data-testid="export-item-export-1"]')
    await expect(completedExport.locator('[data-testid="export-status-completed"]')).toBeVisible()
    await expect(completedExport.locator('[data-testid="download-link"]')).toBeVisible()
    await expect(completedExport).toContainText('2.1 MB')
    
    // Check processing export
    const processingExport = page.locator('[data-testid="export-item-export-3"]')
    await expect(processingExport.locator('[data-testid="export-status-processing"]')).toBeVisible()
    await expect(processingExport.locator('[data-testid="progress-bar"]')).toBeVisible()
    
    // Test download functionality
    await completedExport.locator('[data-testid="download-link"]').click()
    
    // Should trigger download (in real scenario)
    // For testing, we just verify the click was handled
    await page.waitForTimeout(100)
  })

  test('should handle bulk export operations', async ({ page }) => {
    await page.goto('/exports')
    
    // Mock multiple exports
    await helpers.mockApiResponse('**/exports*', {
      exports: Array.from({ length: 10 }, (_, i) => ({
        id: `export-${i}`,
        courseId: `course-${i}`,
        courseTitle: `Course ${i}`,
        format: i % 3 === 0 ? 'html' : i % 3 === 1 ? 'pdf' : 'pptx',
        status: 'completed',
        downloadUrl: `/downloads/course-${i}.zip`,
        createdAt: new Date(Date.now() - i * 86400000).toISOString()
      }))
    })
    
    await page.reload()
    
    // Select multiple exports
    await page.check('[data-testid="select-export-export-1"]')
    await page.check('[data-testid="select-export-export-2"]')
    await page.check('[data-testid="select-export-export-3"]')
    
    // Check bulk actions
    await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible()
    await expect(page.locator('[data-testid="selected-count"]')).toContainText('3 selected')
    
    // Test bulk download
    await page.click('[data-testid="bulk-download-button"]')
    
    // Should show bulk download progress
    await expect(page.locator('[data-testid="bulk-download-progress"]')).toBeVisible()
    
    // Test bulk delete
    await page.click('[data-testid="bulk-delete-button"]')
    await expect(page.locator('[data-testid="bulk-delete-confirmation"]')).toBeVisible()
    
    await helpers.mockApiResponse('**/exports/bulk-delete', { deleted: 3 })
    
    await page.click('[data-testid="confirm-bulk-delete"]')
    
    await helpers.waitForToast('3 exports deleted successfully')
  })

  test('should provide export analytics and insights', async ({ page }) => {
    await page.goto('/exports')
    
    // Navigate to analytics tab
    await page.click('[data-testid="analytics-tab"]')
    
    // Mock analytics data
    await helpers.mockApiResponse('**/exports/analytics', {
      totalExports: 156,
      formatBreakdown: {
        html: 62,
        pdf: 58,
        pptx: 36
      },
      monthlyExports: [
        { month: 'Dec 2023', count: 23 },
        { month: 'Jan 2024', count: 31 },
        { month: 'Feb 2024', count: 28 }
      ],
      popularCourses: [
        { courseId: 'course-123', title: 'JavaScript Fundamentals', exportCount: 15 },
        { courseId: 'course-456', title: 'React Advanced', exportCount: 12 }
      ],
      averageFileSize: {
        html: '2.3 MB',
        pdf: '5.7 MB',
        pptx: '12.1 MB'
      }
    })
    
    await page.reload()
    await page.click('[data-testid="analytics-tab"]')
    
    // Check analytics display
    await expect(page.locator('[data-testid="total-exports-stat"]')).toContainText('156')
    await expect(page.locator('[data-testid="format-breakdown-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="monthly-exports-chart"]')).toBeVisible()
    
    // Check format statistics
    await expect(page.locator('[data-testid="html-export-count"]')).toContainText('62')
    await expect(page.locator('[data-testid="pdf-export-count"]')).toContainText('58')
    await expect(page.locator('[data-testid="pptx-export-count"]')).toContainText('36')
    
    // Check popular courses
    await expect(page.locator('[data-testid="popular-course-course-123"]')).toContainText('JavaScript Fundamentals')
    await expect(page.locator('[data-testid="popular-course-course-123"]')).toContainText('15 exports')
  })

  test('should handle export sharing and distribution', async ({ page }) => {
    await page.goto('/exports')
    
    const exportItem = page.locator('[data-testid="export-item-export-1"]')
    await exportItem.hover()
    await exportItem.locator('[data-testid="share-button"]').click()
    
    // Check sharing modal
    await expect(page.locator('[data-testid="share-modal"]')).toBeVisible()
    
    // Generate share link
    await page.click('[data-testid="generate-share-link"]')
    
    // Mock share link generation
    await helpers.mockApiResponse('**/exports/export-1/share', {
      shareUrl: 'https://app.example.com/shared/export-1-abcd1234',
      expiresAt: '2024-02-15T10:30:00Z',
      accessCount: 0
    })
    
    await expect(page.locator('[data-testid="share-link"]')).toBeVisible()
    await expect(page.locator('[data-testid="share-link"]')).toContainText('shared/export-1-abcd1234')
    
    // Test copy link
    await page.click('[data-testid="copy-link-button"]')
    await helpers.waitForToast('Link copied to clipboard')
    
    // Test email sharing
    await page.click('[data-testid="email-share-tab"]')
    await page.fill('[data-testid="email-recipients"]', 'colleague@example.com')
    await page.fill('[data-testid="email-message"]', 'Please review this course export')
    
    await helpers.mockApiResponse('**/exports/export-1/email', { sent: true })
    
    await page.click('[data-testid="send-email-button"]')
    await helpers.waitForToast('Email sent successfully')
  })
})

test.describe('Export System - Performance', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await helpers.login()
  })

  test('should handle large course exports efficiently', async ({ page }) => {
    await page.goto('/courses/large-course-789/edit')
    
    // Mock large course data
    await helpers.mockApiResponse('**/courses/large-course-789', {
      id: 'large-course-789',
      title: 'Comprehensive Programming Course',
      sessions: Array.from({ length: 50 }, (_, i) => ({
        id: `session-${i}`,
        title: `Session ${i + 1}`,
        activities: Array.from({ length: 10 }, (_, j) => ({
          id: `activity-${i}-${j}`,
          title: `Activity ${j + 1}`,
          content: 'A'.repeat(5000) // Large content
        }))
      }))
    })
    
    await page.click('[data-testid="export-button"]')
    await page.check('[data-testid="export-format-pdf"]')
    
    const startTime = Date.now()
    
    await helpers.mockApiResponse('**/export/pdf/large-course-789', {
      jobId: 'large-export-job-123',
      status: 'started',
      estimatedTime: 120000 // 2 minutes
    })
    
    await page.click('[data-testid="start-export-button"]')
    
    // Should show appropriate progress for large export
    await expect(page.locator('[data-testid="large-export-indicator"]')).toBeVisible()
    await expect(page.locator('[data-testid="estimated-time"]')).toContainText('2 minutes')
    
    const exportTime = Date.now() - startTime
    expect(exportTime).toBeLessThan(1000) // Initial response should be fast
  })

  test('should handle concurrent export requests', async ({ page }) => {
    await page.goto('/exports')
    
    // Mock multiple concurrent exports
    const exportPromises = []
    
    for (let i = 0; i < 5; i++) {
      exportPromises.push(
        helpers.mockApiResponse(`**/export/html/course-${i}`, {
          jobId: `concurrent-export-${i}`,
          status: 'queued',
          queuePosition: i + 1
        })
      )
    }
    
    await Promise.all(exportPromises)
    
    // Should handle queue display
    await expect(page.locator('[data-testid="export-queue"]')).toBeVisible()
    await expect(page.locator('[data-testid="queue-position"]')).toBeVisible()
    
    // Should process exports efficiently
    const processedCount = await page.locator('[data-testid="export-item"]').count()
    expect(processedCount).toBeGreaterThan(0)
  })
})