import { test, expect } from '@playwright/test'
import { TestHelpers } from '../utils/test-helpers'

test.describe('Accessibility Tests', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test('should meet WCAG 2.1 AA standards on login page', async ({ page }) => {
    await page.goto('/login')
    
    // Check basic accessibility
    await helpers.checkAccessibility()
    
    // Check color contrast
    const loginButton = page.locator('[data-testid="login-button"]')
    const styles = await loginButton.evaluate((el) => {
      const computed = window.getComputedStyle(el)
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color
      }
    })
    
    // Should have sufficient contrast (this is a basic check - real testing would use contrast calculation)
    expect(styles.backgroundColor).not.toBe(styles.color)
    
    // Check form labels
    await expect(page.locator('label[for="email"]')).toBeVisible()
    await expect(page.locator('label[for="password"]')).toBeVisible()
    
    // Check ARIA attributes
    const emailInput = page.locator('[data-testid="email-input"]')
    await expect(emailInput).toHaveAttribute('type', 'email')
    await expect(emailInput).toHaveAttribute('required')
    
    const passwordInput = page.locator('[data-testid="password-input"]')
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await expect(passwordInput).toHaveAttribute('required')
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login')
    
    // Test tab order
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="forgot-password-link"]')).toBeFocused()
    
    // Test form submission with Enter
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    
    await page.keyboard.press('Enter')
    // Should trigger form submission
  })

  test('should provide proper focus indicators', async ({ page }) => {
    await page.goto('/login')
    
    // Check focus styles
    const emailInput = page.locator('[data-testid="email-input"]')
    await emailInput.focus()
    
    const focusStyles = await emailInput.evaluate((el) => {
      const computed = window.getComputedStyle(el)
      return {
        outline: computed.outline,
        outlineWidth: computed.outlineWidth,
        boxShadow: computed.boxShadow
      }
    })
    
    // Should have visible focus indicator
    expect(
      focusStyles.outline !== 'none' || 
      focusStyles.outlineWidth !== '0px' || 
      focusStyles.boxShadow !== 'none'
    ).toBe(true)
  })

  test('should handle screen reader announcements', async ({ page }) => {
    await page.goto('/login')
    
    // Test error announcements
    await helpers.mockApiError('**/auth/login', 401, 'Invalid credentials')
    
    await page.fill('[data-testid="email-input"]', 'wrong@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')
    
    // Should have role="alert" for screen reader announcement
    await expect(page.locator('[role="alert"]')).toBeVisible()
    await expect(page.locator('[role="alert"]')).toContainText('Invalid credentials')
  })

  test('should support high contrast mode', async ({ page }) => {
    // Enable high contrast mode
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
    await page.goto('/login')
    
    // Check that elements are still visible and usable
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
    
    // Check contrast in high contrast mode
    const button = page.locator('[data-testid="login-button"]')
    const buttonStyles = await button.evaluate((el) => {
      const computed = window.getComputedStyle(el)
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        border: computed.border
      }
    })
    
    // Should have clear visual distinction
    expect(buttonStyles.backgroundColor).not.toBe('transparent')
    expect(buttonStyles.color).not.toBe(buttonStyles.backgroundColor)
  })

  test('should support reduced motion preferences', async ({ page }) => {
    // Enable reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/dashboard')
    
    // Check that animations are disabled or reduced
    const animatedElement = page.locator('[data-testid="stats-card"]')
    const animationStyles = await animatedElement.evaluate((el) => {
      const computed = window.getComputedStyle(el)
      return {
        animationDuration: computed.animationDuration,
        transitionDuration: computed.transitionDuration
      }
    })
    
    // Animations should be instant or very short
    expect(
      animationStyles.animationDuration === '0s' ||
      parseFloat(animationStyles.animationDuration) < 0.2
    ).toBe(true)
  })

  test('should handle zoom levels correctly', async ({ page }) => {
    await helpers.login()
    await page.goto('/dashboard')
    
    // Test 200% zoom
    await page.setViewportSize({ width: 640, height: 480 }) // Simulate 200% zoom on 1280x960
    
    // Check that content is still accessible
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    
    // Check that mobile layout activates if needed
    const isMobileLayout = await page.locator('[data-testid="mobile-layout"]').isVisible()
    
    if (isMobileLayout) {
      // Mobile navigation should be available
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
    }
    
    // Test 400% zoom (very high zoom)
    await page.setViewportSize({ width: 320, height: 240 })
    
    // Content should still be usable
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible()
  })

  test('should provide proper heading structure', async ({ page }) => {
    await helpers.login()
    await page.goto('/dashboard')
    
    // Check heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents()
    const headingLevels = await page.locator('h1, h2, h3, h4, h5, h6').all()
    
    // Should have at least one h1
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThanOrEqual(1)
    
    // Check logical heading order
    const tagNames = await Promise.all(
      headingLevels.map(heading => heading.evaluate(el => el.tagName.toLowerCase()))
    )
    
    // First heading should be h1
    expect(tagNames[0]).toBe('h1')
    
    // Check that heading levels don't skip (e.g., h1 -> h3)
    for (let i = 1; i < tagNames.length; i++) {
      const currentLevel = parseInt(tagNames[i].charAt(1))
      const previousLevel = parseInt(tagNames[i - 1].charAt(1))
      const levelDifference = currentLevel - previousLevel
      
      expect(levelDifference).toBeLessThanOrEqual(1)
    }
  })

  test('should provide meaningful alt text for images', async ({ page }) => {
    await helpers.login()
    await page.goto('/courses')
    
    // Mock courses with images
    await helpers.mockApiResponse('**/courses*', {
      courses: [
        {
          id: 'course-1',
          title: 'JavaScript Fundamentals',
          thumbnail: '/thumbnails/js-course.jpg'
        }
      ]
    })
    
    await page.reload()
    
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const src = await img.getAttribute('src')
      
      // All images should have alt text
      expect(alt).toBeTruthy()
      
      // Alt text should be meaningful (not just filename)
      if (alt && src) {
        const filename = src.split('/').pop()?.split('.')[0] || ''
        expect(alt.toLowerCase()).not.toBe(filename.toLowerCase())
        expect(alt.length).toBeGreaterThan(2)
      }
    }
  })

  test('should support form validation with accessible error messages', async ({ page }) => {
    await page.goto('/register')
    
    // Try to submit without filling required fields
    await page.click('[data-testid="next-step-button"]')
    
    // Check error messages
    const nameError = page.locator('[data-testid="name-error"]')
    const emailError = page.locator('[data-testid="email-error"]')
    
    await expect(nameError).toBeVisible()
    await expect(emailError).toBeVisible()
    
    // Check ARIA attributes
    const nameInput = page.locator('[data-testid="name-input"]')
    const emailInput = page.locator('[data-testid="email-input"]')
    
    // Should have aria-invalid
    await expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    
    // Should have aria-describedby linking to error message
    const nameAriaDescribedBy = await nameInput.getAttribute('aria-describedby')
    const emailAriaDescribedBy = await emailInput.getAttribute('aria-describedby')
    
    expect(nameAriaDescribedBy).toBeTruthy()
    expect(emailAriaDescribedBy).toBeTruthy()
    
    // Error elements should have matching IDs
    await expect(page.locator(`#${nameAriaDescribedBy}`)).toBeVisible()
    await expect(page.locator(`#${emailAriaDescribedBy}`)).toBeVisible()
  })

  test('should provide accessible modal dialogs', async ({ page }) => {
    await helpers.login()
    await page.goto('/courses')
    
    // Open a modal dialog
    await page.click('[data-testid="create-course-button"]')
    
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    
    // Check modal accessibility
    await expect(modal).toHaveAttribute('aria-labelledby')
    await expect(modal).toHaveAttribute('aria-describedby')
    
    // Focus should be trapped in modal
    await page.keyboard.press('Tab')
    const focusedElement = await page.locator(':focus').first()
    const isInsideModal = await focusedElement.evaluate((el) => {
      const modal = document.querySelector('[role="dialog"]')
      return modal?.contains(el) || false
    })
    expect(isInsideModal).toBe(true)
    
    // Escape should close modal
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()
  })

  test('should provide accessible table data', async ({ page }) => {
    await helpers.login()
    await page.goto('/exports')
    
    // Mock export data
    await helpers.mockApiResponse('**/exports*', {
      exports: [
        { id: '1', filename: 'course-1.html', format: 'HTML', status: 'completed' },
        { id: '2', filename: 'course-2.pdf', format: 'PDF', status: 'processing' }
      ]
    })
    
    await page.reload()
    
    const table = page.locator('table').first()
    
    if (await table.isVisible()) {
      // Check table structure
      await expect(table.locator('thead')).toBeVisible()
      await expect(table.locator('tbody')).toBeVisible()
      
      // Check table headers
      const headers = table.locator('th')
      const headerCount = await headers.count()
      
      for (let i = 0; i < headerCount; i++) {
        const header = headers.nth(i)
        const scope = await header.getAttribute('scope')
        expect(scope).toBe('col')
      }
      
      // Check table caption or aria-label
      const caption = await table.locator('caption').isVisible()
      const ariaLabel = await table.getAttribute('aria-label')
      const ariaLabelledBy = await table.getAttribute('aria-labelledby')
      
      expect(caption || ariaLabel || ariaLabelledBy).toBeTruthy()
    }
  })

  test('should support voice control and speech recognition', async ({ page }) => {
    await helpers.login()
    await page.goto('/courses/new')
    
    // Check that form fields have proper labels for voice control
    const titleInput = page.locator('[data-testid="course-title-input"]')
    const descriptionTextarea = page.locator('[data-testid="course-description-input"]')
    
    // Should have accessible names
    const titleName = await titleInput.getAttribute('aria-label') || 
                     await page.locator('label[for="course-title"]').textContent()
    const descriptionName = await descriptionTextarea.getAttribute('aria-label') || 
                           await page.locator('label[for="course-description"]').textContent()
    
    expect(titleName).toBeTruthy()
    expect(descriptionName).toBeTruthy()
    
    // Names should be descriptive
    expect(titleName?.toLowerCase()).toContain('title')
    expect(descriptionName?.toLowerCase()).toContain('description')
  })

  test('should handle internationalization accessibility', async ({ page }) => {
    await page.goto('/login')
    
    // Check lang attribute
    const htmlLang = await page.getAttribute('html', 'lang')
    expect(htmlLang).toBeTruthy()
    expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/) // Valid language code
    
    // Check text direction
    const direction = await page.getAttribute('html', 'dir')
    expect(['ltr', 'rtl', null]).toContain(direction)
    
    // If there's mixed language content, check for lang attributes
    const elements = await page.locator('[lang]').all()
    for (const element of elements) {
      const lang = await element.getAttribute('lang')
      expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/)
    }
  })
})

test.describe('Accessibility Tests - Mobile', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test('should meet mobile accessibility standards', async ({ page }) => {
    await page.goto('/login')
    
    // Check touch target sizes
    const touchTargets = page.locator('button, a, input[type="submit"], input[type="button"]')
    const targetCount = await touchTargets.count()
    
    for (let i = 0; i < Math.min(targetCount, 10); i++) { // Check first 10 targets
      const target = touchTargets.nth(i)
      const box = await target.boundingBox()
      
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44) // WCAG minimum touch target
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
    }
    
    // Check spacing between touch targets
    const buttons = await page.locator('button').all()
    for (let i = 0; i < buttons.length - 1; i++) {
      const button1 = await buttons[i].boundingBox()
      const button2 = await buttons[i + 1].boundingBox()
      
      if (button1 && button2) {
        const verticalDistance = Math.abs(button1.y - button2.y)
        const horizontalDistance = Math.abs(button1.x - button2.x)
        
        if (verticalDistance < 50 && horizontalDistance < 50) {
          // Buttons are close, check minimum spacing
          expect(Math.min(verticalDistance, horizontalDistance)).toBeGreaterThanOrEqual(8)
        }
      }
    }
  })

  test('should support mobile screen readers', async ({ page }) => {
    await helpers.login()
    await page.goto('/dashboard')
    
    // Check for mobile-specific ARIA landmarks
    await expect(page.locator('[role="main"]')).toBeVisible()
    await expect(page.locator('[role="navigation"]')).toBeVisible()
    
    // Check mobile navigation accessibility
    const mobileNav = page.locator('[data-testid="mobile-navigation"]')
    
    if (await mobileNav.isVisible()) {
      await expect(mobileNav).toHaveAttribute('role', 'navigation')
      await expect(mobileNav).toHaveAttribute('aria-label')
      
      // Check menu button
      const menuButton = page.locator('[data-testid="mobile-menu-button"]')
      if (await menuButton.isVisible()) {
        await expect(menuButton).toHaveAttribute('aria-expanded')
        await expect(menuButton).toHaveAttribute('aria-controls')
      }
    }
  })

  test('should handle mobile form accessibility', async ({ page }) => {
    await page.goto('/register')
    
    // Check mobile form adaptations
    const form = page.locator('[data-testid="registration-form"]')
    
    // Input types should be appropriate for mobile
    const emailInput = form.locator('[type="email"]')
    const telInput = form.locator('[type="tel"]')
    
    await expect(emailInput).toHaveAttribute('autocomplete', 'email')
    
    if (await telInput.isVisible()) {
      await expect(telInput).toHaveAttribute('autocomplete', 'tel')
    }
    
    // Check for mobile-friendly input modes
    const inputs = await form.locator('input').all()
    for (const input of inputs) {
      const type = await input.getAttribute('type')
      const inputMode = await input.getAttribute('inputmode')
      
      if (type === 'email' && inputMode) {
        expect(inputMode).toBe('email')
      }
      if (type === 'tel' && inputMode) {
        expect(inputMode).toBe('tel')
      }
    }
  })
})