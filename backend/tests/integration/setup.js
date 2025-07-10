const { initialize } = require('../../src/config/init');
const { testHelpers } = require('../utils/testHelpers');

// Integration test specific setup
process.env.TEST_TYPE = 'integration';

// Initialize configuration for integration tests
let config;

beforeAll(async () => {
  try {
    // Initialize configuration
    config = await initialize();
    
    // Setup test database
    await testHelpers.setupTestDatabase();
    
    console.log('Integration test setup completed');
  } catch (error) {
    console.error('Integration test setup failed:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    // Cleanup test data
    await testHelpers.cleanup();
    
    console.log('Integration test cleanup completed');
  } catch (error) {
    console.error('Integration test cleanup failed:', error);
  }
});

module.exports = {
  getConfig: () => config,
};