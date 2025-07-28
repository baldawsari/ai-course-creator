import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Helper utilities for testing Radix UI dialogs and modals
 */

export interface DialogTestOptions {
  timeout?: number
  debug?: boolean
}

/**
 * Wait for a dialog to appear in the DOM with better error handling
 */
export async function waitForDialog(
  testId: string,
  options: DialogTestOptions = {}
) {
  const { timeout = 10000, debug = false } = options

  if (debug) {
    console.log('Waiting for dialog:', testId)
    console.log('Current DOM:', document.body.innerHTML)
  }

  try {
    const element = await waitFor(
      () => {
        // Check all possible portal locations
        const portalSelectors = [
          `[data-testid="${testId}"]`,
          `#radix-0 [data-testid="${testId}"]`,
          `[data-radix-portal] [data-testid="${testId}"]`,
          `body > div[data-testid="${testId}"]`,
        ]

        for (const selector of portalSelectors) {
          const el = document.querySelector(selector)
          if (el) return el
        }

        // Also check using screen queries
        try {
          return screen.getByTestId(testId)
        } catch {
          // Continue checking
        }

        throw new Error(`Dialog ${testId} not found`)
      },
      { timeout }
    )

    if (debug) {
      console.log('Dialog found:', element)
    }

    return element
  } catch (error) {
    if (debug) {
      console.error('Failed to find dialog:', testId)
      console.error('Final DOM state:', document.body.innerHTML)
      console.error('Portal roots:', document.querySelectorAll('[data-radix-portal]'))
    }
    throw error
  }
}

/**
 * Open a dialog by clicking a trigger and wait for it to appear
 */
export async function openDialog(
  triggerTestId: string,
  dialogTestId: string,
  options: DialogTestOptions = {}
) {
  const user = userEvent.setup()
  
  // Click the trigger
  const trigger = screen.getByTestId(triggerTestId)
  await user.click(trigger)

  // Wait for dialog to appear
  return await waitForDialog(dialogTestId, options)
}

/**
 * Close a dialog using the escape key
 */
export async function closeDialogWithEscape(dialogTestId: string) {
  const user = userEvent.setup()
  
  // Ensure dialog is present
  const dialog = await screen.findByTestId(dialogTestId)
  
  // Press escape
  await user.keyboard('{Escape}')
  
  // Wait for dialog to disappear
  await waitFor(() => {
    expect(screen.queryByTestId(dialogTestId)).not.toBeInTheDocument()
  })
}

/**
 * Wait for async operations with better timeout handling
 */
export async function waitForAsync<T>(
  callback: () => T | Promise<T>,
  options: { timeout?: number; interval?: number } = {}
): Promise<T> {
  const { timeout = 10000, interval = 50 } = options

  return waitFor(callback, { timeout, interval })
}

/**
 * Enhanced user event setup with common defaults
 */
export function createEnhancedUser() {
  return userEvent.setup({
    delay: null, // Remove delay for faster tests
    pointerEventsCheck: 0, // Disable pointer events check for jsdom
  })
}

/**
 * Wait for element to be interactive (visible and enabled)
 */
export async function waitForInteractive(
  element: HTMLElement | (() => HTMLElement),
  options: { timeout?: number } = {}
) {
  const { timeout = 5000 } = options

  await waitFor(
    () => {
      const el = typeof element === 'function' ? element() : element
      
      if (!el) throw new Error('Element not found')
      if (el.getAttribute('disabled') !== null) throw new Error('Element is disabled')
      if (el.getAttribute('aria-disabled') === 'true') throw new Error('Element is aria-disabled')
      
      // Check if element is visible
      const styles = window.getComputedStyle(el)
      if (styles.display === 'none') throw new Error('Element is hidden')
      if (styles.visibility === 'hidden') throw new Error('Element is not visible')
      if (parseFloat(styles.opacity) === 0) throw new Error('Element has zero opacity')
      
      return el
    },
    { timeout }
  )
}

/**
 * Debug helper to log current portal state
 */
export function debugPortals() {
  console.log('=== Portal Debug Info ===')
  console.log('Body children:', document.body.children.length)
  console.log('Portal roots:', document.querySelectorAll('[data-radix-portal]').length)
  console.log('Dialog elements:', document.querySelectorAll('[role="dialog"]').length)
  console.log('Full body HTML:', document.body.innerHTML)
  console.log('========================')
}