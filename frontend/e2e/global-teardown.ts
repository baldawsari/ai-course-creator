import { FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...')
  
  try {
    // Clean up auth state file
    const authStatePath = path.join(__dirname, 'auth-state.json')
    if (fs.existsSync(authStatePath)) {
      fs.unlinkSync(authStatePath)
      console.log('Cleaned up auth state file')
    }
    
    // Clean up any test data if needed
    await cleanupTestData()
    
    console.log('✅ Global teardown completed successfully')
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
  }
}

async function cleanupTestData() {
  // Add any cleanup logic here
  // For example, cleaning up test courses, documents, etc.
  console.log('Test data cleanup completed')
}

export default globalTeardown