#!/usr/bin/env node

/**
 * Component Test Runner
 * 
 * This script runs individual component tests to verify specific parts
 * of the system without running the full end-to-end workflow
 */

const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

const COMPONENT_TESTS = {
  'rag': {
    name: 'RAG Pipeline',
    script: 'verify-rag-simple.js',
    description: 'Test the complete RAG pipeline with hybrid search'
  },
  'claude': {
    name: 'Claude Service',
    script: 'verify-claude-service.js',
    description: 'Test Claude API integration and course generation'
  },
  'vector': {
    name: 'Vector Service',
    script: 'test-vector-simple.js',
    description: 'Test Qdrant vector database integration'
  },
  'vector-fix': {
    name: 'Vector ID Fix',
    script: 'test-fix-verification.js',
    description: 'Verify vector service ID compatibility fix'
  },
  'claude-simple': {
    name: 'Claude Templates',
    script: 'test-simplified-claude.js',
    description: 'Test simplified Claude JSON templates'
  },
  'claude-basic': {
    name: 'Claude Basic',
    script: 'test-claude-basic.js',
    description: 'Basic Claude API connectivity test'
  },
  'template-quick': {
    name: 'Template Validation',
    script: 'quick-test-simplified.js',
    description: 'Quick template validation test'
  }
};

const runNodeTest = (scriptPath, testName) => {
  return new Promise((resolve, reject) => {
    console.log(`🧪 Running ${testName}...\n`);
    
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${testName} passed\n`);
        resolve();
      } else {
        console.log(`\n❌ ${testName} failed with code ${code}\n`);
        reject(new Error(`${testName} failed`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`\n❌ ${testName} error:`, error.message);
      reject(error);
    });
  });
};

const runNpmTest = (testName, scriptName) => {
  return new Promise((resolve, reject) => {
    console.log(`🧪 Running ${testName}...\n`);
    
    const child = spawn('npm', ['run', scriptName], {
      stdio: 'inherit',
      cwd: path.join(process.cwd(), 'backend')
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${testName} passed\n`);
        resolve();
      } else {
        console.log(`\n❌ ${testName} failed with code ${code}\n`);
        reject(new Error(`${testName} failed`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`\n❌ ${testName} error:`, error.message);
      reject(error);
    });
  });
};

const NPM_TESTS = {
  'db': {
    name: 'Database Tests',
    script: 'test:db',
    description: 'Test database connectivity and schema'
  },
  'auth': {
    name: 'Authentication Tests',
    script: 'test:auth',
    description: 'Test JWT and API key authentication'
  },
  'upload': {
    name: 'Upload Tests',
    script: 'test:upload',
    description: 'Test file upload and processing'
  },
  'document': {
    name: 'Document Processor Tests',
    script: 'test:document-processor',
    description: 'Test document quality assessment and chunking'
  },
  'vector-service': {
    name: 'Vector Service Tests',
    script: 'test:vector-service',
    description: 'Test vector database integration'
  },
  'claude-service': {
    name: 'Claude Service Tests',
    script: 'test:claude-service',
    description: 'Test Claude API integration'
  },
  'server': {
    name: 'Server Tests',
    script: 'test:server',
    description: 'Test server startup and health'
  },
  'all': {
    name: 'All Integration Tests',
    script: 'test:all',
    description: 'Run all backend integration tests'
  }
};

const runSingleTest = async (testKey) => {
  // Check if it's a component test
  if (COMPONENT_TESTS[testKey]) {
    const test = COMPONENT_TESTS[testKey];
    const scriptPath = path.join(process.cwd(), test.script);
    await runNodeTest(scriptPath, test.name);
    return;
  }
  
  // Check if it's an npm test
  if (NPM_TESTS[testKey]) {
    const test = NPM_TESTS[testKey];
    await runNpmTest(test.name, test.script);
    return;
  }
  
  throw new Error(`Unknown test: ${testKey}`);
};

const runMultipleTests = async (testKeys) => {
  let passed = 0;
  let failed = 0;
  const results = [];
  
  for (const testKey of testKeys) {
    try {
      await runSingleTest(testKey);
      passed++;
      results.push({ test: testKey, status: 'PASSED' });
    } catch (error) {
      failed++;
      results.push({ test: testKey, status: 'FAILED', error: error.message });
    }
  }
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log('═'.repeat(50));
  
  results.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${result.test}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log('═'.repeat(50));
  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  
  if (failed > 0) {
    throw new Error(`${failed} test(s) failed`);
  }
};

const showUsage = () => {
  console.log(`
🧪 AI Course Creator Component Test Runner

Usage:
  node test-components.js <test-name> [test-name2] [test-name3] ...
  node test-components.js all-component
  node test-components.js all-npm
  node test-components.js all

Component Tests (Node.js scripts):
`);

  Object.entries(COMPONENT_TESTS).forEach(([key, test]) => {
    console.log(`  ${key.padEnd(15)} - ${test.description}`);
  });

  console.log(`
Backend Integration Tests (npm scripts):
`);

  Object.entries(NPM_TESTS).forEach(([key, test]) => {
    console.log(`  ${key.padEnd(15)} - ${test.description}`);
  });

  console.log(`
Special Commands:
  all-component   - Run all component tests
  all-npm         - Run all npm tests  
  all             - Run all tests
  help            - Show this help

Examples:
  node test-components.js rag claude vector
  node test-components.js db auth upload
  node test-components.js all-component
`);
};

const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('help') || args.includes('--help')) {
    showUsage();
    return;
  }
  
  try {
    if (args.includes('all-component')) {
      await runMultipleTests(Object.keys(COMPONENT_TESTS));
    } else if (args.includes('all-npm')) {
      await runMultipleTests(Object.keys(NPM_TESTS));
    } else if (args.includes('all')) {
      await runMultipleTests([...Object.keys(COMPONENT_TESTS), ...Object.keys(NPM_TESTS)]);
    } else {
      await runMultipleTests(args);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  runSingleTest,
  runMultipleTests,
  COMPONENT_TESTS,
  NPM_TESTS
};