import { chromium, FullConfig } from '@playwright/test'
import path from 'path'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...')
  
  // Launch browser for setup
  const browser = await chromium.launch()
  const baseURL = config.projects[0].use?.baseURL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  
  try {
    // Navigate to the application
    await page.goto('/')
    
    // Wait for the app to be ready
    await page.waitForSelector('body', { timeout: 30000 })
    
    // Create test user if needed
    await setupTestUser(page, baseURL)
    
    // Save authentication state for tests
    await page.context().storageState({ 
      path: path.join(__dirname, 'auth-state.json') 
    })
    
    console.log('✅ Global setup completed successfully')
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

async function setupTestUser(page: any, baseURL: string = 'http://localhost:3000') {
  try {
    // Check if we're already logged in
    const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible().catch(() => false)
    
    if (isLoggedIn) {
      console.log('User already logged in')
      return
    }
    
    // Navigate to login page
    await page.goto(`${baseURL}/login`)
    
    // Fill login form with test credentials
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for successful login
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 })
    
    console.log('Test user logged in successfully')
  } catch (error) {
    console.log('Login failed, user might not exist or login flow changed:', error)
    // Don't throw here as the app might not have authentication set up yet
  }
}

export default globalSetup