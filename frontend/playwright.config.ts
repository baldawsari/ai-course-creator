import { defineConfig, devices } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e/tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI 
    ? [
        ['github'],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['html', { open: 'never', outputFolder: 'test-results/playwright-report' }]
      ]
    : [
        ['html', { open: 'on-failure' }],
        ['list']
      ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video recording on failure */
    video: 'retain-on-failure',
    
    /* Timeout for each action */
    actionTimeout: 10000,
    
    /* Timeout for navigation */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    /* Desktop browsers */
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      testMatch: [
        'auth.spec.ts',
        'dashboard.spec.ts', 
        'course-management.spec.ts',
        'exports.spec.ts',
        'collaboration.spec.ts'
      ]
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: [
        'auth.spec.ts',
        'dashboard.spec.ts',
        'course-management.spec.ts'
      ]
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: [
        'auth.spec.ts',
        'dashboard.spec.ts',
        'course-management.spec.ts'
      ]
    },

    /* Microsoft Edge */
    {
      name: 'edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge' 
      },
      testMatch: [
        'auth.spec.ts',
        'dashboard.spec.ts'
      ]
    },

    /* Mobile devices */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: [
        'auth.spec.ts',
        'dashboard.spec.ts',
        'course-management.spec.ts'
      ]
    },

    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      testMatch: [
        'auth.spec.ts',
        'dashboard.spec.ts'
      ]
    },

    {
      name: 'tablet-ipad',
      use: { ...devices['iPad Pro'] },
      testMatch: [
        'dashboard.spec.ts',
        'course-management.spec.ts'
      ]
    },

    /* Performance testing project */
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-features=NetworkService',
            '--enable-features=NetworkServiceLogging',
            '--log-level=0'
          ]
        }
      },
      testMatch: ['performance.spec.ts'],
      timeout: 120000 // 2 minutes for performance tests
    },

    /* Accessibility testing project */
    {
      name: 'accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        colorScheme: 'light'
      },
      testMatch: ['accessibility.spec.ts']
    },

    /* High contrast accessibility testing */
    {
      name: 'accessibility-dark',
      use: { 
        ...devices['Desktop Chrome'],
        colorScheme: 'dark'
      },
      testMatch: ['accessibility.spec.ts']
    },

    /* Collaboration testing with real-time features */
    {
      name: 'collaboration',
      use: { 
        ...devices['Desktop Chrome'],
        permissions: ['microphone', 'camera', 'notifications']
      },
      testMatch: ['collaboration.spec.ts'],
      timeout: 90000 // Extended timeout for real-time features
    }
  ],

  /* Test timeout */
  timeout: 60000,
  
  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  /* Output directory */
  outputDir: 'test-results/',
  
  /* Global setup */
  // globalSetup: require.resolve('./e2e/global-setup.ts'),
  
  /* Global teardown */
  // globalTeardown: require.resolve('./e2e/global-teardown.ts'),
})