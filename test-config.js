#!/usr/bin/env node

/**
 * Test Configuration and Setup Script
 * 
 * This script helps configure and run the end-to-end tests
 */

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const CONFIG_TEMPLATE = `# AI Course Creator Test Configuration
# Copy this to .env and update with your actual values

# API Configuration
API_BASE_URL=http://localhost:3000/api
NODE_ENV=test

# Test Authentication
# For testing, you can use a mock JWT token or create one via your auth system
TEST_JWT_TOKEN=your_test_jwt_token_here
TEST_USER_ID=test-user-id

# Database Configuration (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# AI Services
ANTHROPIC_API_KEY=your_anthropic_api_key
JINA_API_KEY=your_jina_api_key

# Vector Database (Qdrant)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key

# Redis (for queues)
REDIS_HOST=localhost
REDIS_PORT=6379

# Document Processing
MAX_CHUNK_SIZE=1000
MIN_CHUNK_SIZE=100
OVERLAP_SIZE=50
QUALITY_MINIMUM=50
QUALITY_RECOMMENDED=70
QUALITY_PREMIUM=85

# Test Configuration
TEST_TIMEOUT=300000
TEST_POLLING_INTERVAL=2000
LOG_LEVEL=info
`;

const PACKAGE_JSON_SCRIPTS = {
  "test:e2e": "node test-end-to-end-workflow.js",
  "test:e2e:verbose": "LOG_LEVEL=debug node test-end-to-end-workflow.js",
  "test:setup": "node test-config.js setup",
  "test:health": "node test-config.js health"
};

const setupTestEnvironment = async () => {
  console.log('🔧 Setting up test environment...\n');
  
  try {
    // Create .env.test file if it doesn't exist
    const envTestPath = path.join(process.cwd(), '.env.test');
    try {
      await fs.access(envTestPath);
      console.log('✅ .env.test file already exists');
    } catch (error) {
      await fs.writeFile(envTestPath, CONFIG_TEMPLATE);
      console.log('✅ Created .env.test file with template configuration');
      console.log('📝 Please update .env.test with your actual configuration values');
    }
    
    // Create temp directory for test files
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    console.log('✅ Created temp directory for test files');
    
    // Check package.json for test scripts
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }
      
      let scriptsAdded = 0;
      for (const [scriptName, scriptCommand] of Object.entries(PACKAGE_JSON_SCRIPTS)) {
        if (!packageJson.scripts[scriptName]) {
          packageJson.scripts[scriptName] = scriptCommand;
          scriptsAdded++;
        }
      }
      
      if (scriptsAdded > 0) {
        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log(`✅ Added ${scriptsAdded} test scripts to package.json`);
      } else {
        console.log('✅ Test scripts already exist in package.json');
      }
    } catch (error) {
      console.log('⚠️  Could not update package.json:', error.message);
    }
    
    console.log('\n🎯 Test environment setup complete!');
    console.log('\nNext steps:');
    console.log('1. Update .env.test with your configuration');
    console.log('2. Ensure your backend server is running');
    console.log('3. Run: npm run test:e2e');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
};

const runHealthCheck = async () => {
  console.log('🏥 Running health check...\n');
  
  const axios = require('axios');
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
  
  const healthChecks = [
    { name: 'Server', endpoint: '/health' },
    { name: 'Database', endpoint: '/health/db' },
    { name: 'Vector Service', endpoint: '/health/vector' },
    { name: 'Claude Service', endpoint: '/health/claude' },
    { name: 'Redis', endpoint: '/health/redis' }
  ];
  
  console.log(`Testing endpoints at: ${baseUrl}\n`);
  
  for (const check of healthChecks) {
    try {
      const response = await axios.get(`${baseUrl}${check.endpoint}`, {
        timeout: 10000
      });
      
      const status = response.data.status || 'OK';
      const details = response.data.details ? ` (${response.data.details})` : '';
      console.log(`✅ ${check.name}: ${status}${details}`);
      
    } catch (error) {
      const statusCode = error.response?.status || 'No response';
      const message = error.response?.data?.message || error.message;
      console.log(`❌ ${check.name}: Failed - ${statusCode} - ${message}`);
    }
  }
  
  console.log('\n📊 Health check complete');
};

const showUsage = () => {
  console.log(`
🧪 AI Course Creator Test Configuration

Usage:
  node test-config.js <command>

Commands:
  setup    - Set up test environment and configuration
  health   - Run health check on all services
  help     - Show this usage information

Environment Setup:
  1. Run 'setup' to create test configuration
  2. Update .env.test with your values
  3. Ensure backend services are running
  4. Run 'npm run test:e2e' to execute tests

Test Scripts (added to package.json):
  npm run test:e2e         - Run end-to-end tests
  npm run test:e2e:verbose - Run with debug logging
  npm run test:setup       - Setup test environment
  npm run test:health      - Run health checks

Required Services:
  ✅ Backend API server (Express)
  ✅ Supabase database
  ✅ Redis server
  ✅ Qdrant vector database
  ✅ Anthropic API access
  ✅ Jina AI API access
`);
};

// Command handling
const command = process.argv[2];

switch (command) {
  case 'setup':
    setupTestEnvironment();
    break;
  case 'health':
    runHealthCheck();
    break;
  case 'help':
  case '--help':
  case '-h':
    showUsage();
    break;
  default:
    if (command) {
      console.log(`❌ Unknown command: ${command}\n`);
    }
    showUsage();
    break;
}