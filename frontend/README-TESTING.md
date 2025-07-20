# AI Course Creator Frontend - Testing Guide

## Overview

This comprehensive testing guide covers all aspects of testing for the AI Course Creator frontend application. The testing strategy includes unit tests, integration tests, end-to-end tests, accessibility testing, performance testing, and visual regression testing.

## Testing Architecture

### Test Types

1. **Unit Tests** - Jest + React Testing Library
   - Component tests with accessibility validation
   - Utility function tests
   - Custom React hooks tests
   - Store/state management tests

2. **Integration Tests** - Jest + React Testing Library
   - User flow tests
   - API integration tests
   - Form validation tests

3. **End-to-End Tests** - Playwright
   - Critical user journeys
   - Cross-browser testing
   - Mobile device testing
   - Real-time collaboration testing

4. **Performance Tests** - Playwright + Custom metrics
   - Core Web Vitals measurement
   - Load time optimization
   - Memory usage monitoring
   - Bundle size analysis

5. **Accessibility Tests** - Playwright + axe-core
   - WCAG 2.1 AA compliance
   - Screen reader compatibility
   - Keyboard navigation
   - Color contrast validation

6. **Visual Tests** - Storybook + Chromatic
   - Component documentation
   - Visual regression testing
   - Cross-browser visual consistency

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm ci

# Install Playwright browsers
npm run playwright:install
```

### Running Tests

```bash
# Unit and integration tests
npm test                    # Run all Jest tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report

# E2E tests
npm run test:e2e           # All E2E tests
npm run test:e2e:headed    # With visible browser
npm run test:e2e:debug     # Debug mode (single worker)
npm run test:e2e:mobile    # Mobile devices only
npm run test:e2e:performance  # Performance tests
npm run test:e2e:accessibility # Accessibility tests

# Storybook
npm run storybook          # Start Storybook dev server
npm run build-storybook    # Build static Storybook
```

## Test Structure

### Directory Organization

```
frontend/
├── src/
│   ├── __tests__/              # Test setup and utilities
│   │   ├── setup.ts           # Global test setup
│   │   ├── integration/       # Integration tests
│   │   └── utils/             # Test utilities and mocks
│   ├── components/
│   │   └── **/__tests__/      # Component tests
│   ├── lib/
│   │   └── **/__tests__/      # Utility and hook tests
│   └── hooks/
│       └── __tests__/         # Hook tests
├── e2e/                       # E2E tests
│   ├── tests/                 # Test specifications
│   ├── utils/                 # E2E test helpers
│   ├── fixtures/              # Test data files
│   └── global-setup.ts        # Global E2E setup
├── .storybook/               # Storybook configuration
└── test-results/             # Test output and reports
```

### Test Categories

#### Unit Tests (`src/**/__tests__/`)

**Utility Tests**
- `validation.test.ts` - Form and data validation
- `formatting.test.ts` - Date, number, text formatting
- `analytics.test.ts` - Analytics and tracking

**Component Tests**
- `button.test.tsx` - UI component testing
- `course-card.test.tsx` - Complex component testing
- `file-uploader.test.tsx` - File handling components

**Hook Tests**
- `use-api.test.ts` - API integration hooks
- `mobile.test.ts` - Mobile-specific hooks

#### Integration Tests (`src/__tests__/integration/`)

- `auth-flow.test.tsx` - Complete authentication flows
- `course-creation-flow.test.tsx` - Multi-step course creation

#### E2E Tests (`e2e/tests/`)

- `auth.spec.ts` - Authentication and authorization
- `dashboard.spec.ts` - Dashboard functionality
- `course-management.spec.ts` - Course CRUD operations
- `exports.spec.ts` - Export system testing
- `collaboration.spec.ts` - Real-time collaboration
- `accessibility.spec.ts` - WCAG compliance testing
- `performance.spec.ts` - Performance metrics

## Testing Patterns

### Component Testing Pattern

```typescript
import { describe, it, expect } from '@jest/globals'
import { render, screen, createUserEvent } from '@/__tests__/utils/test-utils'
import { ComponentName } from '../component-name'

describe('ComponentName', () => {
  const defaultProps = {
    // Define default props
  }

  it('should render correctly', () => {
    render(<ComponentName {...defaultProps} />)
    expect(screen.getByText('Expected text')).toBeInTheDocument()
  })

  it('should handle user interactions', async () => {
    const user = createUserEvent()
    const onAction = jest.fn()
    
    render(<ComponentName {...defaultProps} onAction={onAction} />)
    
    await user.click(screen.getByRole('button'))
    expect(onAction).toHaveBeenCalled()
  })

  it('should be accessible', async () => {
    render(<ComponentName {...defaultProps} />)
    
    // Check ARIA attributes
    expect(screen.getByRole('button')).toHaveAttribute('aria-label')
    
    // Test keyboard navigation
    await user.tab()
    expect(screen.getByRole('button')).toHaveFocus()
  })
})
```

### E2E Testing Pattern

```typescript
import { test, expect } from '@playwright/test'
import { TestHelpers } from '../utils/test-helpers'

test.describe('Feature Name', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await helpers.login()
  })

  test('should complete user journey', async ({ page }) => {
    await page.goto('/feature')
    
    // Test user interactions
    await page.click('[data-testid="action-button"]')
    
    // Verify results
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
  })
})
```

## Test Utilities

### Mock Data Generation

```typescript
import { MockDataGenerator } from '@/__tests__/utils/mock-data'

const mockUser = MockDataGenerator.user({
  email: 'test@example.com',
  name: 'Test User'
})

const mockCourse = MockDataGenerator.course({
  title: 'Test Course',
  difficulty: 'beginner'
})
```

### API Mocking

```typescript
import { mockAPI } from '@/__tests__/utils/api-mocks'

// Mock successful response
mockAPI.mockSuccessfulLogin()

// Mock specific endpoint
mockAPI.mockApiResponse('/courses', { courses: [] })

// Mock error response
mockAPI.mockApiError('/courses', 500, 'Server error')
```

### WebSocket Mocking

```typescript
import { MockWebSocket } from '@/__tests__/utils/websocket-mocks'

// Replace WebSocket in tests
beforeEach(() => {
  (window as any).WebSocket = MockWebSocket
})
```

## Browser and Device Coverage

### Desktop Browsers
- **Chrome/Chromium** - Full test suite
- **Firefox** - Core functionality tests
- **Safari/WebKit** - Core functionality tests
- **Edge** - Authentication and dashboard tests

### Mobile Devices
- **Mobile Chrome (Pixel 5)** - Core functionality
- **Mobile Safari (iPhone 13)** - Core functionality
- **Tablet (iPad Pro)** - Dashboard and course management

### Screen Sizes
- **Large Desktop** - 1920x1080
- **Standard Desktop** - 1280x720
- **Tablet** - 768x1024
- **Mobile** - 375x667

## Performance Testing

### Core Web Vitals Thresholds

- **First Contentful Paint (FCP)** - < 1.8 seconds
- **Largest Contentful Paint (LCP)** - < 2.5 seconds
- **Cumulative Layout Shift (CLS)** - < 0.1
- **First Input Delay (FID)** - < 100ms

### Bundle Size Budgets

- **JavaScript** - < 1MB total
- **CSS** - < 200KB total
- **Images** - Lazy loading with WebP/AVIF support

## Accessibility Testing

### WCAG 2.1 AA Compliance

- **Color Contrast** - Minimum 4.5:1 ratio
- **Keyboard Navigation** - All interactive elements
- **Screen Reader Support** - Proper ARIA labels
- **Focus Management** - Visible focus indicators
- **Text Alternatives** - Alt text for images

### Testing Tools

- **axe-core** - Automated accessibility testing
- **Playwright** - Manual accessibility checks
- **Screen Reader Testing** - NVDA, JAWS, VoiceOver simulation

## CI/CD Integration

### GitHub Actions Workflow

The E2E testing pipeline runs on:
- **Push to main/develop** - Full test suite
- **Pull requests** - Core tests
- **Nightly schedule** - Comprehensive testing
- **Manual trigger** - On-demand testing

### Test Reports

- **HTML Report** - Interactive test results
- **JUnit XML** - CI/CD integration
- **JSON Results** - Programmatic analysis
- **Coverage Reports** - Code coverage metrics

### Artifacts

- **Screenshots** - Failure diagnostics
- **Videos** - Test execution recordings
- **Traces** - Detailed execution traces
- **Performance Metrics** - Core Web Vitals data

## Local Development

### Debug Mode

```bash
# Debug E2E tests with visible browser
npm run test:e2e:debug

# Run specific test file
npx playwright test auth.spec.ts --debug

# Update visual snapshots
npx playwright test --update-snapshots
```

### Watch Mode

```bash
# Watch unit tests
npm run test:watch

# Watch Storybook changes
npm run storybook
```

### Coverage Analysis

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

## Best Practices

### Test Writing Guidelines

1. **Descriptive Test Names** - Clearly describe what is being tested
2. **Arrange-Act-Assert** - Structure tests logically
3. **Test User Behavior** - Focus on user interactions, not implementation
4. **Accessibility First** - Include accessibility checks in all tests
5. **Performance Aware** - Monitor test execution time
6. **Data-TestId Usage** - Use semantic test identifiers

### Test Data Management

1. **Deterministic Data** - Use consistent, predictable test data
2. **Isolated Tests** - Each test should be independent
3. **Cleanup** - Reset state between tests
4. **Mock External Dependencies** - Avoid network calls in unit tests

### Maintenance

1. **Regular Updates** - Keep test dependencies current
2. **Flaky Test Monitoring** - Address intermittent failures
3. **Coverage Goals** - Maintain >80% code coverage
4. **Performance Monitoring** - Track test execution time

## Troubleshooting

### Common Issues

**Test Timeouts**
```bash
# Increase timeout in playwright.config.ts
timeout: 60000
```

**Flaky Tests**
```bash
# Add retries
retries: process.env.CI ? 3 : 1
```

**Browser Installation Issues**
```bash
# Reinstall browsers
npx playwright install --with-deps
```

**Memory Issues**
```bash
# Reduce parallel workers
workers: process.env.CI ? 2 : 1
```

### Debug Tools

- **Playwright Inspector** - Interactive debugging
- **Chrome DevTools** - Browser debugging
- **Jest Debug** - Unit test debugging
- **VS Code Extensions** - Integrated testing

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Storybook Documentation](https://storybook.js.org/docs)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Core Web Vitals](https://web.dev/vitals/)

---

## Summary

This comprehensive testing setup provides:

✅ **Complete Coverage** - Unit, integration, E2E, performance, and accessibility tests
✅ **Cross-Browser Support** - Chrome, Firefox, Safari, Edge
✅ **Mobile Testing** - iPhone, iPad, Android devices
✅ **CI/CD Integration** - Automated testing pipeline
✅ **Developer Experience** - Easy-to-use scripts and debug tools
✅ **Quality Assurance** - High standards for performance and accessibility

The testing infrastructure ensures the AI Course Creator frontend maintains high quality, accessibility compliance, and optimal performance across all supported platforms and devices.