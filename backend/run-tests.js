#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test suite configuration
const testSuites = {
  unit: {
    name: 'Unit Tests',
    pattern: 'tests/unit/**/*.test.js',
    timeout: 30000,
    coverage: true,
  },
  integration: {
    name: 'Integration Tests',
    pattern: 'tests/integration/**/*.test.js',
    timeout: 60000,
    coverage: false,
  },
  performance: {
    name: 'Performance Tests',
    pattern: 'tests/performance/**/*.test.js',
    timeout: 300000,
    coverage: false,
  },
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  suite: 'all',
  coverage: false,
  watch: false,
  verbose: false,
  bail: false,
  parallel: false,
};

// Parse flags
args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    if (value !== undefined) {
      options[key] = value;
    } else {
      options[key] = true;
    }
  } else if (!options.suite || options.suite === 'all') {
    options.suite = arg;
  }
});

function printUsage() {
  console.log(`
🧪 AI Course Creator Test Runner

Usage: node run-tests.js [suite] [options]

Test Suites:
  unit          Run unit tests only
  integration   Run integration tests only
  performance   Run performance tests only
  all           Run all test suites (default)

Options:
  --coverage    Generate coverage report
  --watch       Run tests in watch mode
  --verbose     Verbose output
  --bail        Stop on first test failure
  --parallel    Run tests in parallel
  --help        Show this help message

Examples:
  node run-tests.js unit --coverage
  node run-tests.js integration --verbose
  node run-tests.js --coverage --bail
  node run-tests.js performance
`);
}

function buildJestCommand(suite, opts) {
  const jestBin = path.join(__dirname, 'node_modules', '.bin', 'jest');
  const configFile = path.join(__dirname, 'tests', 'jest.config.js');
  
  const command = [jestBin];
  const jestArgs = [];

  // Add config file
  jestArgs.push('--config', configFile);

  // Add test pattern based on suite
  if (suite !== 'all' && testSuites[suite]) {
    jestArgs.push('--selectProjects', suite);
    jestArgs.push('--testTimeout', testSuites[suite].timeout.toString());
  }

  // Add options
  if (opts.coverage || (testSuites[suite] && testSuites[suite].coverage)) {
    jestArgs.push('--coverage');
    jestArgs.push('--coverageReporters', 'text', 'lcov', 'html');
  }

  if (opts.watch) {
    jestArgs.push('--watch');
  }

  if (opts.verbose) {
    jestArgs.push('--verbose');
  }

  if (opts.bail) {
    jestArgs.push('--bail');
  }

  if (opts.parallel) {
    jestArgs.push('--maxWorkers', '50%');
  } else {
    jestArgs.push('--runInBand');
  }

  // Additional Jest options
  jestArgs.push('--forceExit');
  jestArgs.push('--detectOpenHandles');

  return { command: command[0], args: jestArgs };
}

function runTests(suite, opts) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running ${testSuites[suite]?.name || 'All Tests'}...\n`);

    const { command, args } = buildJestCommand(suite, opts);
    
    console.log(`Command: ${command} ${args.join(' ')}\n`);

    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: __dirname,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        FORCE_COLOR: '1',
      },
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${testSuites[suite]?.name || 'Tests'} completed successfully!`);
        resolve();
      } else {
        console.log(`\n❌ ${testSuites[suite]?.name || 'Tests'} failed with exit code ${code}`);
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`\n💥 Failed to start test process: ${error.message}`);
      reject(error);
    });
  });
}

async function runAllTests(opts) {
  const suites = ['unit', 'integration'];
  
  // Only run performance tests if explicitly requested or running all
  if (opts.suite === 'all' || opts.suite === 'performance') {
    suites.push('performance');
  }

  for (const suite of suites) {
    try {
      await runTests(suite, { ...opts, suite });
      console.log(`\n${'='.repeat(50)}`);
    } catch (error) {
      if (opts.bail) {
        console.log('\n🛑 Stopping due to test failure (--bail option)');
        process.exit(1);
      }
      console.log(`\n⚠️ ${testSuites[suite].name} failed, continuing with next suite...\n`);
    }
  }
}

function setupTestEnvironment() {
  const envFile = path.join(__dirname, 'tests', '.env.test');
  
  if (!fs.existsSync(envFile)) {
    console.log('⚠️ Test environment file not found at tests/.env.test');
    console.log('Please copy tests/.env.test.example to tests/.env.test and configure it');
    return false;
  }

  // Load test environment variables
  require('dotenv').config({ path: envFile });
  
  return true;
}

async function main() {
  if (options.help) {
    printUsage();
    return;
  }

  // Setup test environment
  if (!setupTestEnvironment()) {
    process.exit(1);
  }

  console.log('🧪 AI Course Creator Test Runner');
  console.log('================================');
  console.log(`Environment: ${process.env.NODE_ENV || 'test'}`);
  console.log(`Suite: ${options.suite}`);
  console.log(`Options: ${JSON.stringify(options, null, 2)}`);

  try {
    if (options.suite === 'all') {
      await runAllTests(options);
    } else if (testSuites[options.suite]) {
      await runTests(options.suite, options);
    } else {
      console.error(`❌ Unknown test suite: ${options.suite}`);
      console.error('Available suites: unit, integration, performance, all');
      process.exit(1);
    }

    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error(`\n💥 Test execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test execution terminated');
  process.exit(143);
});

// Run main function
main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});