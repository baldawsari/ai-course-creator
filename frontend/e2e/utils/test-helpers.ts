import { Page, Locator, expect } from '@playwright/test'
import path from 'path'

export class TestHelpers {
  constructor(private page: Page) {}

  // Navigation helpers
  async goToDashboard() {
    await this.page.goto('/dashboard')
    await this.page.waitForSelector('[data-testid="dashboard"]')
  }

  async goToCourses() {
    await this.page.goto('/courses')
    await this.page.waitForSelector('[data-testid="courses-page"]')
  }

  async goToSettings() {
    await this.page.goto('/settings')
    await this.page.waitForSelector('[data-testid="settings-page"]')
  }

  // Authentication helpers
  async login(email = 'test@example.com', password = 'testpassword123') {
    await this.page.goto('/login')
    await this.page.fill('[data-testid="email-input"]', email)
    await this.page.fill('[data-testid="password-input"]', password)
    await this.page.click('[data-testid="login-button"]')
    await this.page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 })
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]')
    await this.page.click('[data-testid="logout-button"]')
    await this.page.waitForSelector('[data-testid="login-form"]')
  }

  // Course management helpers
  async createCourse(title: string, description?: string) {
    await this.page.click('[data-testid="create-course-button"]')
    await this.page.fill('[data-testid="course-title-input"]', title)
    
    if (description) {
      await this.page.fill('[data-testid="course-description-input"]', description)
    }
    
    await this.page.click('[data-testid="save-course-button"]')
    await this.page.waitForSelector(`[data-testid="course-${title}"]`)
    
    return title
  }

  async deleteCourse(courseTitle: string) {
    const courseCard = this.page.locator(`[data-testid="course-${courseTitle}"]`)
    await courseCard.hover()
    await courseCard.locator('[data-testid="course-menu-button"]').click()
    await this.page.click('[data-testid="delete-course-button"]')
    await this.page.click('[data-testid="confirm-delete-button"]')
    await expect(courseCard).not.toBeVisible()
  }

  // File upload helpers
  async uploadFile(inputSelector: string, filePath: string) {
    const fileInput = this.page.locator(inputSelector)
    await fileInput.setInputFiles(path.resolve(__dirname, filePath))
  }

  async uploadMultipleFiles(inputSelector: string, filePaths: string[]) {
    const fileInput = this.page.locator(inputSelector)
    const resolvedPaths = filePaths.map(p => path.resolve(__dirname, p))
    await fileInput.setInputFiles(resolvedPaths)
  }

  // Form helpers
  async fillForm(formData: Record<string, string>) {
    for (const [fieldName, value] of Object.entries(formData)) {
      const input = this.page.locator(`[data-testid="${fieldName}-input"]`)
      await input.fill(value)
    }
  }

  async submitForm(submitButtonSelector = '[data-testid="submit-button"]') {
    await this.page.click(submitButtonSelector)
  }

  // Wait helpers
  async waitForToast(message?: string, timeout = 5000) {
    const toastSelector = '[data-testid="toast"]'
    await this.page.waitForSelector(toastSelector, { timeout })
    
    if (message) {
      await expect(this.page.locator(toastSelector)).toContainText(message)
    }
  }

  async waitForLoadingToFinish(timeout = 10000) {
    await this.page.waitForSelector('[data-testid="loading-spinner"]', { 
      state: 'hidden', 
      timeout 
    })
  }

  async waitForProgressComplete(timeout = 30000) {
    await this.page.waitForSelector('[data-testid="progress-complete"]', { timeout })
  }

  // Modal helpers
  async openModal(triggerSelector: string) {
    await this.page.click(triggerSelector)
    await this.page.waitForSelector('[data-testid="modal"]')
  }

  async closeModal() {
    await this.page.keyboard.press('Escape')
    await this.page.waitForSelector('[data-testid="modal"]', { state: 'hidden' })
  }

  async confirmDialog(message?: string) {
    if (message) {
      await expect(this.page.locator('[data-testid="dialog-message"]')).toContainText(message)
    }
    await this.page.click('[data-testid="confirm-button"]')
  }

  // Search helpers
  async search(query: string, searchInputSelector = '[data-testid="search-input"]') {
    await this.page.fill(searchInputSelector, query)
    await this.page.keyboard.press('Enter')
    await this.waitForLoadingToFinish()
  }

  async clearSearch(searchInputSelector = '[data-testid="search-input"]') {
    await this.page.fill(searchInputSelector, '')
    await this.page.keyboard.press('Enter')
    await this.waitForLoadingToFinish()
  }

  // Accessibility helpers
  async checkAccessibility() {
    // Check for basic accessibility attributes
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').count()
    expect(headings).toBeGreaterThan(0)

    // Check for alt text on images
    const images = this.page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      expect(alt).toBeTruthy()
    }

    // Check for form labels
    const inputs = this.page.locator('input[type="text"], input[type="email"], input[type="password"], textarea')
    const inputCount = await inputs.count()
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      const id = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const ariaLabelledBy = await input.getAttribute('aria-labelledby')
      
      if (id) {
        const label = this.page.locator(`label[for="${id}"]`)
        const hasLabel = await label.count() > 0
        expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy()
      }
    }
  }

  // Performance helpers
  async measurePageLoad() {
    const startTime = Date.now()
    await this.page.waitForLoadState('networkidle')
    const endTime = Date.now()
    return endTime - startTime
  }

  async checkPerformanceMetrics() {
    const performanceMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      }
    })
    
    return performanceMetrics
  }

  // Mobile helpers
  async swipeLeft(element: Locator) {
    const box = await element.boundingBox()
    if (box) {
      await this.page.mouse.move(box.x + box.width - 10, box.y + box.height / 2)
      await this.page.mouse.down()
      await this.page.mouse.move(box.x + 10, box.y + box.height / 2)
      await this.page.mouse.up()
    }
  }

  async swipeRight(element: Locator) {
    const box = await element.boundingBox()
    if (box) {
      await this.page.mouse.move(box.x + 10, box.y + box.height / 2)
      await this.page.mouse.down()
      await this.page.mouse.move(box.x + box.width - 10, box.y + box.height / 2)
      await this.page.mouse.up()
    }
  }

  async longPress(element: Locator, duration = 1000) {
    await element.hover()
    await this.page.mouse.down()
    await this.page.waitForTimeout(duration)
    await this.page.mouse.up()
  }

  // Drag and drop helpers
  async dragAndDrop(source: Locator, target: Locator) {
    await source.dragTo(target)
  }

  // Screenshot helpers
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    })
  }

  async compareScreenshot(name: string) {
    await expect(this.page).toHaveScreenshot(`${name}.png`)
  }

  // Network helpers
  async interceptNetworkRequests() {
    const requests: any[] = []
    
    this.page.on('request', (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
      })
    })
    
    return requests
  }

  async mockApiResponse(url: string, response: any) {
    await this.page.route(url, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    })
  }

  async mockApiError(url: string, status = 500, message = 'Server Error') {
    await this.page.route(url, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: message }),
      })
    })
  }
}