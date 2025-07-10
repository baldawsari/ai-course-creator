#!/usr/bin/env node

/**
 * Master Test Runner for AI Course Creator
 * 
 * This script orchestrates all testing phases:
 * 1. Environment verification
 * 2. Component testing
 * 3. Integration testing
 * 4. End-to-end workflow testing
 * 5. Performance validation
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const TEST_PHASES = {
  'setup': {
    name: 'Environment Setup',
    description: 'Verify environment and configuration',
    timeout: 30000
  },
  'health': {
    name: 'Health Checks',
    description: 'Verify all services are running',
    timeout: 30000
  },
  'component': {
    name: 'Component Tests',
    description: 'Test individual components',
    timeout: 180000
  },
  'integration': {
    name: 'Integration Tests',
    description: 'Test service integration',
    timeout: 300000
  },
  'e2e': {
    name: 'End-to-End Tests',
    description: 'Complete workflow testing',
    timeout: 600000
  },
  'performance': {
    name: 'Performance Tests',
    description: 'Validate system performance',
    timeout: 180000
  }
};

const testState = {
  startTime: Date.now(),
  currentPhase: null,
  results: [],
  errors: []
};

const log = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  const elapsed = ((Date.now() - testState.startTime) / 1000).toFixed(1);
  const phase = testState.currentPhase ? `[${testState.currentPhase}]` : '';
  console.log(`[${timestamp}] [${elapsed}s] ${phase} [${level}] ${message}`);
};

const runCommand = async (command, args = [], options = {}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env }
    });
    
    let stdout = '';
    let stderr = '';
    
    if (options.silent) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }
    
    const timeoutId = options.timeout ? setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Command timed out after ${options.timeout}ms`));
    }, options.timeout) : null;
    
    child.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (code === 0) {
        resolve({ code, stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}${stderr ? ': ' + stderr : ''}`));
      }
    });
    
    child.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    });
  });
};

const checkEnvironment = async () => {
  log('Checking environment configuration...');
  
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'ANTHROPIC_API_KEY',
    'JINA_API_KEY'
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Check if required files exist
  const requiredFiles = [
    'backend/package.json',
    'backend/src/app.js',
    'backend/src/services/courseGenerator.js',
    'backend/src/routes/courses.js'
  ];
  
  for (const file of requiredFiles) {
    try {
      await fs.access(path.join(process.cwd(), file));
    } catch (error) {
      throw new Error(`Required file not found: ${file}`);
    }
  }
  
  log('Environment check passed', 'SUCCESS');
};

const runHealthChecks = async () => {
  log('Running health checks...');
  
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
  
  const healthEndpoints = [
    '/health',
    '/health/db',
    '/health/vector',
    '/health/claude'
  ];
  
  for (const endpoint of healthEndpoints) {
    try {
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        timeout: 10000
      });
      
      const status = response.data.status || 'OK';
      log(`Health check ${endpoint}: ${status}`, 'SUCCESS');
      
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      log(`Health check ${endpoint}: FAILED - ${errorMsg}`, 'ERROR');
      throw new Error(`Health check failed for ${endpoint}`);
    }
  }
  
  log('All health checks passed', 'SUCCESS');
};

const runComponentTests = async () => {
  log('Running component tests...');
  
  const componentTests = [
    'rag',
    'claude',
    'vector',
    'vector-fix'
  ];
  
  for (const test of componentTests) {
    try {
      log(`Running component test: ${test}`);
      await runCommand('node', ['test-components.js', test], {
        timeout: 60000,
        silent: false
      });
      log(`Component test ${test} passed`, 'SUCCESS');
    } catch (error) {
      log(`Component test ${test} failed: ${error.message}`, 'ERROR');
      testState.errors.push(`Component test ${test}: ${error.message}`);
    }
  }
  
  log('Component tests completed');
};

const runIntegrationTests = async () => {
  log('Running integration tests...');
  
  const integrationTests = [
    'db',
    'auth',
    'upload',
    'document',
    'vector-service',
    'claude-service'
  ];
  
  for (const test of integrationTests) {
    try {
      log(`Running integration test: ${test}`);
      await runCommand('node', ['test-components.js', test], {
        timeout: 90000,
        silent: false
      });
      log(`Integration test ${test} passed`, 'SUCCESS');
    } catch (error) {
      log(`Integration test ${test} failed: ${error.message}`, 'ERROR');
      testState.errors.push(`Integration test ${test}: ${error.message}`);
    }
  }
  
  log('Integration tests completed');
};

const runEndToEndTests = async () => {
  log('Running end-to-end workflow test...');
  
  try {
    await runCommand('node', ['test-end-to-end-workflow.js'], {
      timeout: 600000,
      silent: false
    });
    log('End-to-end test passed', 'SUCCESS');
  } catch (error) {
    log(`End-to-end test failed: ${error.message}`, 'ERROR');
    testState.errors.push(`End-to-end test: ${error.message}`);
    throw error;
  }
};

const runPerformanceTests = async () => {
  log('Running performance validation...');
  
  // Basic performance tests
  const tests = [
    {
      name: 'API Response Time',
      test: async () => {
        const start = Date.now();
        await axios.get(`${process.env.API_BASE_URL || 'http://localhost:3000/api'}/health`);
        const duration = Date.now() - start;
        
        if (duration > 5000) {
          throw new Error(`API response too slow: ${duration}ms`);
        }
        
        log(`API response time: ${duration}ms`, 'SUCCESS');
      }
    },
    {
      name: 'Memory Usage Check',
      test: async () => {
        const memUsage = process.memoryUsage();
        const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        
        log(`Memory usage: ${memMB}MB`, 'INFO');
        
        if (memMB > 1000) {
          log(`High memory usage: ${memMB}MB`, 'WARN');
        }
      }
    }
  ];
  
  for (const test of tests) {
    try {
      await test.test();
      log(`Performance test ${test.name} passed`, 'SUCCESS');
    } catch (error) {
      log(`Performance test ${test.name} failed: ${error.message}`, 'ERROR');
      testState.errors.push(`Performance test ${test.name}: ${error.message}`);
    }
  }
  
  log('Performance tests completed');
};

const generateReport = () => {
  const totalTime = ((Date.now() - testState.startTime) / 1000).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 AI COURSE CREATOR TEST REPORT');
  console.log('='.repeat(60));
  
  console.log(`\n📊 Summary:`);
  console.log(`- Total execution time: ${totalTime}s`);
  console.log(`- Test phases completed: ${testState.results.length}`);
  console.log(`- Errors encountered: ${testState.errors.length}`);
  
  if (testState.results.length > 0) {
    console.log(`\n✅ Completed Phases:`);
    testState.results.forEach(result => {
      console.log(`  ${result.phase}: ${result.status} (${result.duration}s)`);
    });
  }
  
  if (testState.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    testState.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (testState.errors.length === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ The AI Course Creator system is working correctly.');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log(`⚠️  ${testState.errors.length} issue(s) need attention.`);
  }
  
  console.log('='.repeat(60));
};

const runTestPhase = async (phaseName, phaseFunction) => {
  testState.currentPhase = phaseName;
  const phaseStartTime = Date.now();
  
  try {
    log(`Starting phase: ${TEST_PHASES[phaseName].name}`);
    
    await phaseFunction();
    
    const duration = ((Date.now() - phaseStartTime) / 1000).toFixed(1);
    testState.results.push({
      phase: TEST_PHASES[phaseName].name,
      status: 'PASSED',
      duration
    });
    
    log(`Phase completed: ${TEST_PHASES[phaseName].name} (${duration}s)`, 'SUCCESS');
    
  } catch (error) {
    const duration = ((Date.now() - phaseStartTime) / 1000).toFixed(1);
    testState.results.push({
      phase: TEST_PHASES[phaseName].name,
      status: 'FAILED',
      duration
    });
    
    log(`Phase failed: ${TEST_PHASES[phaseName].name} - ${error.message}`, 'ERROR');
    testState.errors.push(`${TEST_PHASES[phaseName].name}: ${error.message}`);
    
    // Don't throw - continue with other phases
  } finally {
    testState.currentPhase = null;
  }
};

const main = async () => {
  console.log('🚀 Starting AI Course Creator Test Suite\n');
  
  const args = process.argv.slice(2);
  const selectedPhases = args.length > 0 ? args : Object.keys(TEST_PHASES);
  
  log(`Running test phases: ${selectedPhases.join(', ')}`);
  
  // Setup phase
  if (selectedPhases.includes('setup')) {
    await runTestPhase('setup', checkEnvironment);
  }
  
  // Health checks
  if (selectedPhases.includes('health')) {
    await runTestPhase('health', runHealthChecks);
  }
  
  // Component tests
  if (selectedPhases.includes('component')) {
    await runTestPhase('component', runComponentTests);
  }
  
  // Integration tests
  if (selectedPhases.includes('integration')) {
    await runTestPhase('integration', runIntegrationTests);
  }
  
  // End-to-end tests
  if (selectedPhases.includes('e2e')) {
    await runTestPhase('e2e', runEndToEndTests);
  }
  
  // Performance tests
  if (selectedPhases.includes('performance')) {
    await runTestPhase('performance', runPerformanceTests);
  }
  
  // Generate final report
  generateReport();
  
  // Exit with appropriate code
  const hasFailures = testState.errors.length > 0;
  process.exit(hasFailures ? 1 : 0);
};

const showUsage = () => {
  console.log(`
🧪 AI Course Creator Master Test Runner

Usage:
  node run-tests.js [phase1] [phase2] ...

Available Test Phases:
`);

  Object.entries(TEST_PHASES).forEach(([key, phase]) => {
    console.log(`  ${key.padEnd(12)} - ${phase.description}`);
  });

  console.log(`
Examples:
  node run-tests.js                    # Run all phases
  node run-tests.js setup health       # Run only setup and health
  node run-tests.js component e2e      # Run component and e2e tests
  node run-tests.js health e2e         # Quick validation

Prerequisites:
  ✅ Backend server running
  ✅ All required services (Redis, Qdrant, etc.)
  ✅ Environment variables configured
  ✅ API keys for external services
`);
};

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Handle interruption
process.on('SIGINT', () => {
  log('Test execution interrupted', 'WARN');
  generateReport();
  process.exit(1);
});

// Run tests
if (require.main === module) {
  main().catch((error) => {
    log(`Test execution failed: ${error.message}`, 'ERROR');
    generateReport();
    process.exit(1);
  });
}

module.exports = {
  runTestPhase,
  checkEnvironment,
  runHealthChecks,
  generateReport
};