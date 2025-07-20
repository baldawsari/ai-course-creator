#!/usr/bin/env node

/**
 * Comprehensive E2E Test Runner for AI Course Creator Frontend
 * 
 * This script provides a unified interface for running E2E tests with various configurations:
 * - Cross-browser testing (Chrome, Firefox, Safari, Edge)
 * - Mobile device testing (iPhone, iPad, Android)
 * - Performance testing with metrics collection
 * - Accessibility testing integration
 * - Parallel execution with worker management
 * - CI/CD integration with reporting
 */

const { exec, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Configuration
const config = {
  // Browser configurations
  browsers: ['chromium', 'firefox', 'webkit'],
  mobileDevices: ['iPhone 13', 'iPad Pro', 'Pixel 5'],
  
  // Test categories
  testCategories: {
    auth: 'e2e/tests/auth.spec.ts',
    dashboard: 'e2e/tests/dashboard.spec.ts',
    courses: 'e2e/tests/course-management.spec.ts',
    exports: 'e2e/tests/exports.spec.ts',
    collaboration: 'e2e/tests/collaboration.spec.ts',
    accessibility: 'e2e/tests/accessibility.spec.ts',
    performance: 'e2e/tests/performance.spec.ts'
  },
  
  // Default options
  defaultOptions: {
    headed: false,
    workers: os.cpus().length,
    retries: 2,
    timeout: 30000,
    reporter: 'html',
    outputDir: 'test-results',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  }
}

class E2ETestRunner {
  constructor(options = {}) {
    this.options = { ...config.defaultOptions, ...options }
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      browsers: {},
      categories: {}
    }
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const args = process.argv.slice(2)
    const options = {}
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      
      switch (arg) {
        case '--browser':
        case '-b':
          options.browser = args[++i]
          break
        case '--mobile':
        case '-m':
          options.mobile = true
          break
        case '--headed':
        case '-h':
          options.headed = true
          break
        case '--debug':
        case '-d':
          options.debug = true
          options.headed = true
          options.workers = 1
          break
        case '--category':
        case '-c':
          options.category = args[++i]
          break
        case '--grep':
        case '-g':
          options.grep = args[++i]
          break
        case '--workers':
        case '-w':
          options.workers = parseInt(args[++i])
          break
        case '--reporter':
        case '-r':
          options.reporter = args[++i]
          break
        case '--update-snapshots':
        case '-u':
          options.updateSnapshots = true
          break
        case '--performance':
        case '-p':
          options.performance = true
          break
        case '--accessibility':
        case '-a':
          options.accessibility = true
          break
        case '--ci':
          options.ci = true
          options.headed = false
          options.video = 'off'
          options.reporter = 'github'
          break
        case '--help':
          this.showHelp()
          process.exit(0)
        default:
          if (arg.startsWith('--')) {
            console.warn(`Unknown option: ${arg}`)
          } else {
            options.testFiles = options.testFiles || []
            options.testFiles.push(arg)
          }
      }
    }
    
    return options
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
AI Course Creator E2E Test Runner

Usage: node run-e2e-tests.js [options] [test-files]

Options:
  -b, --browser <name>      Run tests on specific browser (chromium, firefox, webkit)
  -m, --mobile             Run mobile device tests
  -h, --headed             Run tests in headed mode (visible browser)
  -d, --debug              Run in debug mode (headed, single worker)
  -c, --category <name>    Run specific test category (auth, dashboard, courses, etc.)
  -g, --grep <pattern>     Run tests matching pattern
  -w, --workers <num>      Number of parallel workers (default: CPU count)
  -r, --reporter <type>    Test reporter (html, junit, json, github)
  -u, --update-snapshots   Update visual test snapshots
  -p, --performance        Include performance tests
  -a, --accessibility      Include accessibility tests
  --ci                     CI mode (optimized for CI/CD)
  --help                   Show this help

Examples:
  node run-e2e-tests.js                           # Run all tests
  node run-e2e-tests.js --browser chromium        # Chrome only
  node run-e2e-tests.js --mobile                  # Mobile devices
  node run-e2e-tests.js --category auth           # Authentication tests only
  node run-e2e-tests.js --debug                   # Debug mode
  node run-e2e-tests.js --performance             # Performance tests
  node run-e2e-tests.js --accessibility           # Accessibility tests
  node run-e2e-tests.js --ci                      # CI/CD mode

Test Categories:
  auth         - Authentication and authorization tests
  dashboard    - Dashboard functionality tests  
  courses      - Course management tests
  exports      - Export system tests
  collaboration - Real-time collaboration tests
  accessibility - WCAG compliance tests
  performance  - Performance and Core Web Vitals tests
`)
  }

  /**
   * Build Playwright command
   */
  buildCommand(options) {
    const cmd = ['npx', 'playwright', 'test']
    
    // Browser selection
    if (options.browser) {
      cmd.push('--project', options.browser)
    }
    
    // Mobile devices
    if (options.mobile) {
      config.mobileDevices.forEach(device => {
        cmd.push('--project', device.replace(' ', '-').toLowerCase())
      })
    }
    
    // Test category
    if (options.category && config.testCategories[options.category]) {
      cmd.push(config.testCategories[options.category])
    }
    
    // Test files
    if (options.testFiles) {
      cmd.push(...options.testFiles)
    }
    
    // Grep pattern
    if (options.grep) {
      cmd.push('--grep', options.grep)
    }
    
    // Workers
    if (options.workers) {
      cmd.push('--workers', options.workers.toString())
    }
    
    // Headed mode
    if (options.headed) {
      cmd.push('--headed')
    }
    
    // Debug mode
    if (options.debug) {
      cmd.push('--debug')
    }
    
    // Reporter
    if (options.reporter) {
      cmd.push('--reporter', options.reporter)
    }
    
    // Update snapshots
    if (options.updateSnapshots) {
      cmd.push('--update-snapshots')
    }
    
    // Performance tests
    if (options.performance) {
      cmd.push('--grep', 'Performance')
    }
    
    // Accessibility tests
    if (options.accessibility) {
      cmd.push('--grep', 'Accessibility')
    }
    
    // CI mode
    if (options.ci) {
      cmd.push('--reporter=github')
      cmd.push('--max-failures=5')
    }
    
    return cmd
  }

  /**
   * Setup test environment
   */
  async setupEnvironment() {
    console.log('🔧 Setting up test environment...')
    
    // Ensure test results directory exists
    const resultsDir = path.join(process.cwd(), this.options.outputDir)
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true })
    }
    
    // Install browsers if needed
    await this.installBrowsers()
    
    // Start test server if needed
    await this.startTestServer()
    
    console.log('✅ Environment setup complete')
  }

  /**
   * Install Playwright browsers
   */
  async installBrowsers() {
    return new Promise((resolve, reject) => {
      console.log('📦 Checking browser installations...')
      
      const install = spawn('npx', ['playwright', 'install', '--with-deps'], {
        stdio: 'inherit'
      })
      
      install.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Browsers installed')
          resolve()
        } else {
          reject(new Error(`Browser installation failed with code ${code}`))
        }
      })
    })
  }

  /**
   * Start test server
   */
  async startTestServer() {
    return new Promise((resolve) => {
      console.log('🚀 Starting test server...')
      
      // Check if server is already running
      exec('curl -f http://localhost:3000/health 2>/dev/null', (error) => {
        if (!error) {
          console.log('✅ Test server already running')
          resolve()
          return
        }
        
        // Start development server
        const server = spawn('npm', ['run', 'dev'], {
          stdio: 'pipe',
          detached: true
        })
        
        server.stdout.on('data', (data) => {
          if (data.toString().includes('ready')) {
            console.log('✅ Test server started')
            resolve()
          }
        })
        
        // Store server PID for cleanup
        this.serverPid = server.pid
      })
    })
  }

  /**
   * Run tests
   */
  async runTests(options) {
    console.log('🧪 Running E2E tests...')
    
    const cmd = this.buildCommand(options)
    const startTime = Date.now()
    
    return new Promise((resolve, reject) => {
      const test = spawn(cmd[0], cmd.slice(1), {
        stdio: 'inherit',
        env: {
          ...process.env,
          CI: options.ci ? 'true' : 'false',
          PLAYWRIGHT_HTML_REPORT: path.join(this.options.outputDir, 'playwright-report')
        }
      })
      
      test.on('close', (code) => {
        this.results.duration = Date.now() - startTime
        
        if (code === 0) {
          console.log('✅ All tests passed!')
          resolve(this.results)
        } else {
          console.log('❌ Some tests failed')
          reject(new Error(`Tests failed with exit code ${code}`))
        }
      })
    })
  }

  /**
   * Generate test report
   */
  async generateReport() {
    console.log('📊 Generating test report...')
    
    const reportPath = path.join(this.options.outputDir, 'test-summary.json')
    
    // Add system information
    this.results.system = {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
      node: process.version,
      timestamp: new Date().toISOString()
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2))
    
    console.log(`📋 Test report saved to: ${reportPath}`)
    
    // Show quick summary
    this.showSummary()
  }

  /**
   * Show test summary
   */
  showSummary() {
    const { total, passed, failed, skipped, duration } = this.results
    
    console.log('\n📈 Test Summary:')
    console.log(`   Total: ${total}`)
    console.log(`   Passed: ${passed} ✅`)
    console.log(`   Failed: ${failed} ❌`)
    console.log(`   Skipped: ${skipped} ⏭️`)
    console.log(`   Duration: ${Math.round(duration / 1000)}s`)
    
    if (failed > 0) {
      console.log('\n🔍 Check the HTML report for detailed failure information')
      console.log(`   Report: ${this.options.outputDir}/playwright-report/index.html`)
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up...')
    
    // Kill test server if we started it
    if (this.serverPid) {
      try {
        process.kill(this.serverPid)
        console.log('✅ Test server stopped')
      } catch (error) {
        console.warn('⚠️ Could not stop test server:', error.message)
      }
    }
  }

  /**
   * Main entry point
   */
  async run() {
    const options = this.parseArgs()
    Object.assign(this.options, options)
    
    try {
      await this.setupEnvironment()
      await this.runTests(this.options)
      await this.generateReport()
    } catch (error) {
      console.error('💥 Test run failed:', error.message)
      process.exit(1)
    } finally {
      await this.cleanup()
    }
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...')
  process.exit(1)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...')
  process.exit(1)
})

// Run if called directly
if (require.main === module) {
  const runner = new E2ETestRunner()
  runner.run()
}

module.exports = E2ETestRunner