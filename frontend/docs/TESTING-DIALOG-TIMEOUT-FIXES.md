# Testing Dialog and Timeout Fixes Guide

This guide documents the comprehensive fixes implemented to address the common testing issues:
1. **Timeout Issues**: Tests failing with 5-second timeouts waiting for elements
2. **Dialog/Modal Rendering**: Dialogs not appearing in DOM during tests

## Summary of Changes

### 1. Enhanced Test Setup (`src/__tests__/setup.tsx`)

#### Increased Global Timeout
```typescript
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 10000, // Increased from 5000ms to 10000ms
})
```

#### Improved Portal Configuration
The setup now creates multiple portal roots to handle various Radix UI components:
```typescript
const portalIds = [
  'radix-0',              // Default radix portal
  'radix-1', 'radix-2',   // Additional radix portals
  'radix-:r0:', 'radix-:r1:', // Common Radix UI ID patterns
  'dialog-portal-root',    // Custom dialog portal
  'modal-portal-root',     // Custom modal portal
]
```

#### Added DOM Interaction Mocks
```typescript
// Mock for Radix UI pointer interactions
document.elementFromPoint = jest.fn(() => document.body)
```

### 2. Dialog Test Helpers (`src/__tests__/utils/dialog-helpers.ts`)

Created specialized utilities for testing dialogs:

#### `waitForDialog(testId, options)`
Waits for a dialog to appear with multiple portal location checks:
```typescript
const dialog = await waitForDialog('delete-confirmation-dialog', {
  timeout: 10000,
  debug: false // Set to true for troubleshooting
})
```

#### `createEnhancedUser()`
Creates a user event instance optimized for testing:
```typescript
const user = createEnhancedUser() // No delay, disabled pointer checks
```

#### `waitForAsync(callback, options)`
Enhanced async waiting with configurable timeout:
```typescript
await waitForAsync(() => {
  expect(element).toBeInTheDocument()
}, { timeout: 10000 })
```

### 3. Improved Test Patterns

#### Before (Problematic Pattern)
```typescript
it('opens dialog', async () => {
  const user = createUserEvent()
  render(<Component />)
  
  await user.click(screen.getByTestId('trigger'))
  
  // This often times out
  await waitFor(() => {
    expect(screen.getByTestId('dialog')).toBeInTheDocument()
  })
})
```

#### After (Improved Pattern)
```typescript
it('opens dialog', async () => {
  const user = createEnhancedUser()
  render(<Component />)
  
  // Use findBy for async element discovery
  const trigger = await screen.findByTestId('trigger')
  await user.click(trigger)
  
  // Use specialized dialog helper
  const dialog = await waitForDialog('dialog', { debug: false })
  expect(dialog).toBeInTheDocument()
})
```

## How to Apply These Fixes

### Step 1: Import Enhanced Utilities
```typescript
import { 
  render, 
  screen, 
  waitForDialog,
  waitForAsync,
  createEnhancedUser
} from '@/__tests__/utils/test-utils'
```

### Step 2: Use Enhanced User Events
Replace `createUserEvent()` with `createEnhancedUser()`:
```typescript
const user = createEnhancedUser()
```

### Step 3: Use findBy* for Async Elements
Replace `getBy*` with `findBy*` when elements might not be immediately available:
```typescript
// Before
const button = screen.getByTestId('button')

// After
const button = await screen.findByTestId('button')
```

### Step 4: Use Dialog Helpers for Modals
```typescript
// Wait for dialog to appear
const dialog = await waitForDialog('my-dialog')

// Debug if needed
const dialog = await waitForDialog('my-dialog', { debug: true })
```

### Step 5: Use Enhanced Async Waiting
```typescript
await waitForAsync(() => {
  // Complex assertions
}, { timeout: 10000 })
```

## Debugging Tips

### 1. Enable Debug Mode
```typescript
const dialog = await waitForDialog('dialog-id', { debug: true })
```

### 2. Check Portal State
```typescript
import { debugPortals } from '@/__tests__/utils/test-utils'

// In your test
debugPortals() // Logs portal information
```

### 3. Common Issues and Solutions

#### Dialog Not Found
- Ensure the dialog has a `data-testid` attribute
- Check if the dialog is actually being triggered (state update)
- Try increasing timeout or enabling debug mode

#### Timeout Errors
- Use `findBy*` instead of `getBy*` for async elements
- Increase timeout in waitForAsync calls
- Check if state updates are happening synchronously

#### Multiple Elements Found
- Use more specific queries or test IDs
- Use `getAllBy*` and select the specific index

## Best Practices

1. **Always use enhanced user events** for better reliability
2. **Prefer findBy* queries** for elements that appear after interactions
3. **Use dialog helpers** for any modal/dialog testing
4. **Set appropriate timeouts** based on component complexity
5. **Enable debug mode** when troubleshooting failures

## Example: Complete Dialog Test

```typescript
import { describe, it, expect } from '@jest/globals'
import { 
  render, 
  screen, 
  waitForDialog,
  createEnhancedUser 
} from '@/__tests__/utils/test-utils'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('opens and closes delete dialog', async () => {
    const user = createEnhancedUser()
    render(<MyComponent />)
    
    // Open dialog
    const deleteButton = await screen.findByTestId('delete-button')
    await user.click(deleteButton)
    
    // Wait for dialog
    const dialog = await waitForDialog('delete-dialog')
    expect(dialog).toBeInTheDocument()
    
    // Verify content
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    
    // Close dialog
    const cancelButton = screen.getByTestId('cancel-button')
    await user.click(cancelButton)
    
    // Verify dialog closed
    await waitFor(() => {
      expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument()
    })
  })
})
```

## Migration Guide

To update existing tests:

1. Replace imports to use test-utils
2. Change `createUserEvent()` to `createEnhancedUser()`
3. Update `getBy*` to `findBy*` for async elements
4. Replace manual dialog waits with `waitForDialog()`
5. Use `waitForAsync()` for complex async assertions
6. Add debug flags when tests fail to gather more information

These improvements provide a more robust testing environment that handles the complexities of modern React components, especially those using portals and async state updates.