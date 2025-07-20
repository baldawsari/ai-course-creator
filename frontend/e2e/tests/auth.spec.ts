import { test, expect } from '@playwright/test'
import { TestHelpers } from '../utils/test-helpers'

test.describe('Authentication Flow', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Debug: log the page content
    const pageContent = await page.content()
    console.log('Page title:', await page.title())
    console.log('Page URL:', page.url())
    
    // Check page elements
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="forgot-password-link"]')).toBeVisible()
    
    // Check brand elements
    await expect(page.locator('[data-testid="app-logo"]')).toBeVisible()
    await expect(page.getByText('AI Course Creator')).toBeVisible()
  })

  test('should show validation errors for invalid input', async ({ page }) => {
    await page.goto('/login')
    
    // Try to submit empty form
    await page.click('[data-testid="login-button"]')
    
    // Check for validation messages
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
    
    // Enter invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.click('[data-testid="login-button"]')
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email')
    
    // Enter valid email but short password
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', '123')
    await page.click('[data-testid="login-button"]')
    await expect(page.locator('[data-testid="password-error"]')).toContainText('at least 8 characters')
  })

  test('should handle login with invalid credentials', async ({ page }) => {
    // Mock API error response before navigating
    await helpers.mockApiError('**/api/auth/login', 401, 'Invalid credentials')
    
    await page.goto('/login')
    
    await page.fill('[data-testid="email-input"]', 'wrong@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')
    
    // Check for error message (no toast, just the login error)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials')
  })

  test('should successfully login with valid credentials', async ({ page }) => {
    // Mock successful login response before navigating
    await helpers.mockApiResponse('**/api/auth/login', {
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      token: 'fake-jwt-token',
    })
    
    await page.goto('/login')
    
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword123')
    await page.click('[data-testid="login-button"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
  })

  test('should display registration page correctly', async ({ page }) => {
    await page.goto('/register')
    
    // Check step indicator
    await expect(page.locator('[data-testid="step-indicator"]')).toBeVisible()
    await expect(page.locator('[data-testid="step-1"]')).toHaveClass(/active/)
    
    // Check form fields for step 1
    await expect(page.locator('[data-testid="name-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="confirm-password-input"]')).toBeVisible()
  })

  test('should complete multi-step registration', async ({ page }) => {
    await page.goto('/register')
    
    // Step 1: Basic information
    await page.fill('[data-testid="name-input"]', 'Test User')
    await page.fill('[data-testid="email-input"]', 'newuser@example.com')
    await page.fill('[data-testid="password-input"]', 'strongpassword123')
    await page.fill('[data-testid="confirm-password-input"]', 'strongpassword123')
    await page.click('[data-testid="next-step-button"]')
    
    // Step 2: Organization details
    await expect(page.locator('[data-testid="step-2"]')).toHaveClass(/active/)
    await page.fill('[data-testid="organization-input"]', 'Test Organization')
    await page.click('[data-testid="role-instructor"]')
    await page.click('[data-testid="next-step-button"]')
    
    // Step 3: Use case selection
    await expect(page.locator('[data-testid="step-3"]')).toHaveClass(/active/)
    await page.click('[data-testid="usecase-corporate"]')
    
    // Mock successful registration
    await helpers.mockApiResponse('**/auth/register', {
      user: { id: '2', email: 'newuser@example.com', name: 'Test User' },
      token: 'fake-jwt-token',
    })
    
    await page.click('[data-testid="complete-registration-button"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await helpers.waitForToast('Registration successful')
  })

  test('should handle forgot password flow', async ({ page }) => {
    await page.goto('/login')
    await page.click('[data-testid="forgot-password-link"]')
    
    // Should navigate to forgot password page
    await expect(page).toHaveURL('/forgot-password')
    await expect(page.locator('[data-testid="forgot-password-form"]')).toBeVisible()
    
    // Mock successful reset request
    await helpers.mockApiResponse('**/auth/forgot-password', {
      message: 'Reset instructions sent to your email',
    })
    
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.click('[data-testid="send-reset-button"]')
    
    // Check success state
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Reset instructions sent')
  })

  test('should logout successfully', async ({ page }) => {
    // First login
    await helpers.login()
    
    // Verify we're logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    
    // Logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login')
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })

  test('should handle session expiry', async ({ page }) => {
    // Mock expired session
    await helpers.mockApiError('**/api/auth/me', 401, 'Token expired')
    
    await page.goto('/dashboard')
    
    // Should redirect to login
    await expect(page).toHaveURL('/login')
    // Note: Since toast component is not implemented with data-testid,
    // we're just checking the redirect behavior
  })

  test('should remember user preference', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword123')
    await page.check('[data-testid="remember-me-checkbox"]')
    
    // Mock successful login
    await helpers.mockApiResponse('**/auth/login', {
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      token: 'fake-jwt-token',
    })
    
    await page.click('[data-testid="login-button"]')
    
    // Check that remember me was processed
    const localStorage = await page.evaluate(() => window.localStorage.getItem('rememberMe'))
    expect(localStorage).toBe('true')
  })
})

test.describe('Authentication - Mobile', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test('should display mobile login correctly', async ({ page }) => {
    await page.goto('/login')
    
    // Check mobile layout - mobile-auth-layout is already added to the main div
    await expect(page.locator('[data-testid="mobile-auth-layout"]')).toBeVisible()
    // The login form has both data-testid attributes combined
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
    
    // Check touch-friendly elements
    const loginButton = page.locator('[data-testid="login-button"]')
    const buttonHeight = await loginButton.evaluate(el => el.getBoundingClientRect().height)
    expect(buttonHeight).toBeGreaterThanOrEqual(44) // Minimum touch target size
  })

  test('should handle mobile registration flow', async ({ page }) => {
    await page.goto('/register')
    
    // Check mobile step indicator
    await expect(page.locator('[data-testid="mobile-step-indicator"]')).toBeVisible()
    
    // Complete step 1 with mobile-optimized form
    await page.fill('[data-testid="name-input"]', 'Mobile User')
    await page.fill('[data-testid="email-input"]', 'mobile@example.com')
    await page.fill('[data-testid="password-input"]', 'mobilepassword123')
    await page.fill('[data-testid="confirm-password-input"]', 'mobilepassword123')
    
    // Use mobile navigation
    await page.click('[data-testid="mobile-next-button"]')
    
    // Verify step transition
    await expect(page.locator('[data-testid="step-2"]')).toHaveClass(/active/)
  })
})