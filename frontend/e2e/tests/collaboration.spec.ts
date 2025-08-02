import { test, expect } from '@playwright/test'
import { TestHelpers } from '../utils/test-helpers'

test.describe('Real-time Collaboration', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await helpers.login()
  })

  test('should establish WebSocket connection for real-time updates', async ({ page, context }) => {
    await page.goto('/courses/course-123/edit')
    
    // Mock WebSocket connection
    await page.evaluate(() => {
      class MockWebSocket extends EventTarget {
        readyState = WebSocket.OPEN
        url: string
        
        constructor(url: string) {
          super()
          this.url = url
          
          // Simulate connection open
          setTimeout(() => {
            this.dispatchEvent(new Event('open'))
          }, 100)
        }
        
        send(data: string) {
          // Echo back for testing
          setTimeout(() => {
            this.dispatchEvent(new MessageEvent('message', { data }))
          }, 50)
        }
        
        close() {
          this.readyState = WebSocket.CLOSED as 3
          this.dispatchEvent(new Event('close'))
        }
      }
      
      (window as any).WebSocket = MockWebSocket
    })
    
    // Check WebSocket connection indicator
    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible()
    
    // Verify connection info
    const connectionInfo = await page.locator('[data-testid="connection-info"]').textContent()
    expect(connectionInfo).toContain('Connected')
  })

  test('should show live user presence indicators', async ({ page, context }) => {
    await page.goto('/courses/course-123/edit')
    
    // Mock user presence data
    await page.evaluate(() => {
      const mockPresence = {
        users: [
          {
            id: 'user-1',
            name: 'John Doe',
            avatar: '/avatars/john.jpg',
            cursor: { x: 100, y: 150 },
            selection: { start: 45, end: 67 },
            isTyping: true
          },
          {
            id: 'user-2', 
            name: 'Jane Smith',
            avatar: '/avatars/jane.jpg',
            cursor: { x: 200, y: 250 },
            selection: null,
            isTyping: false
          }
        ]
      }
      
      // Dispatch presence update
      window.dispatchEvent(new CustomEvent('presence-update', { 
        detail: mockPresence 
      }))
    })
    
    // Check user presence indicators
    await expect(page.locator('[data-testid="user-presence"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-avatar-user-1"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-avatar-user-2"]')).toBeVisible()
    
    // Check typing indicator
    await expect(page.locator('[data-testid="typing-indicator-user-1"]')).toBeVisible()
    await expect(page.locator('[data-testid="typing-indicator-user-1"]')).toContainText('John Doe is typing...')
    
    // Check user count
    const userCount = await page.locator('[data-testid="online-users-count"]').textContent()
    expect(userCount).toContain('2')
  })

  test('should sync content changes in real-time', async ({ page, context }) => {
    await page.goto('/courses/course-123/edit')
    
    // Simulate receiving content update from another user
    await page.evaluate(() => {
      const contentUpdate = {
        type: 'content-change',
        sessionId: 'session-1',
        activityId: 'activity-1',
        changes: {
          content: 'Updated content from another user',
          timestamp: Date.now(),
          userId: 'user-2'
        }
      }
      
      window.dispatchEvent(new CustomEvent('content-update', {
        detail: contentUpdate
      }))
    })
    
    // Check that content was updated
    await expect(page.locator('[data-testid="activity-content-activity-1"]')).toContainText('Updated content from another user')
    
    // Check change indicator
    await expect(page.locator('[data-testid="live-update-indicator"]')).toBeVisible()
    
    // Make local change and verify it's sent
    const contentEditor = page.locator('[data-testid="content-editor"]')
    await contentEditor.fill('Local change from current user')
    
    // Should trigger outgoing change event
    await page.waitForTimeout(500) // Debounce delay
    
    // Check auto-save indicator
    await expect(page.locator('[data-testid="auto-save-status"]')).toContainText('Saved')
  })

  test('should handle collaborative cursor tracking', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    // Enable cursor tracking
    await page.evaluate(() => {
      document.addEventListener('mousemove', (e) => {
        window.dispatchEvent(new CustomEvent('cursor-move', {
          detail: { x: e.clientX, y: e.clientY }
        }))
      })
    })
    
    // Simulate remote cursor movement
    await page.evaluate(() => {
      const remoteCursor = {
        userId: 'user-2',
        name: 'Jane Smith',
        x: 300,
        y: 200,
        color: '#3B82F6'
      }
      
      window.dispatchEvent(new CustomEvent('remote-cursor', {
        detail: remoteCursor
      }))
    })
    
    // Check remote cursor indicator
    await expect(page.locator('[data-testid="remote-cursor-user-2"]')).toBeVisible()
    
    // Move local cursor
    await page.mouse.move(150, 100)
    
    // Should update cursor position
    const cursorElement = page.locator('[data-testid="local-cursor"]')
    if (await cursorElement.isVisible()) {
      const position = await cursorElement.evaluate((el) => {
        const rect = el.getBoundingClientRect()
        return { x: rect.left, y: rect.top }
      })
      
      expect(position.x).toBeCloseTo(150, 10)
      expect(position.y).toBeCloseTo(100, 10)
    }
  })

  test('should manage collaborative text selection', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    const textEditor = page.locator('[data-testid="rich-text-editor"]')
    
    // Make a text selection
    await textEditor.click()
    await page.keyboard.down('Shift')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.up('Shift')
    
    // Should show local selection
    const selection = await page.evaluate(() => {
      const sel = window.getSelection()
      return sel ? {
        text: sel.toString(),
        start: sel.rangeCount > 0 ? sel.getRangeAt(0).startOffset : 0,
        end: sel.rangeCount > 0 ? sel.getRangeAt(0).endOffset : 0
      } : null
    })
    
    expect(selection?.text).toBeTruthy()
    
    // Simulate remote selection
    await page.evaluate(() => {
      const remoteSelection = {
        userId: 'user-2',
        name: 'Jane Smith',
        start: 10,
        end: 25,
        text: 'collaborative text',
        color: '#EF4444'
      }
      
      window.dispatchEvent(new CustomEvent('remote-selection', {
        detail: remoteSelection
      }))
    })
    
    // Check remote selection indicator
    await expect(page.locator('[data-testid="remote-selection-user-2"]')).toBeVisible()
  })

  test('should handle conflict resolution', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    // Simulate conflicting changes
    await page.evaluate(() => {
      const conflict = {
        type: 'content-conflict',
        localChange: {
          content: 'Local version of content',
          timestamp: Date.now() - 1000,
          userId: 'current-user'
        },
        remoteChange: {
          content: 'Remote version of content',
          timestamp: Date.now(),
          userId: 'user-2'
        },
        sessionId: 'session-1',
        activityId: 'activity-1'
      }
      
      window.dispatchEvent(new CustomEvent('content-conflict', {
        detail: conflict
      }))
    })
    
    // Should show conflict resolution dialog
    await expect(page.locator('[data-testid="conflict-resolution-modal"]')).toBeVisible()
    
    // Check conflict options
    await expect(page.locator('[data-testid="accept-local-changes"]')).toBeVisible()
    await expect(page.locator('[data-testid="accept-remote-changes"]')).toBeVisible()
    await expect(page.locator('[data-testid="merge-changes"]')).toBeVisible()
    
    // Choose to accept remote changes
    await page.click('[data-testid="accept-remote-changes"]')
    
    // Should update content and close modal
    await expect(page.locator('[data-testid="conflict-resolution-modal"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="activity-content-activity-1"]')).toContainText('Remote version of content')
  })

  test('should provide comment and annotation system', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    // Add a comment
    const textContent = page.locator('[data-testid="session-content"]')
    await textContent.click({ position: { x: 100, y: 50 } })
    
    // Right-click to open context menu
    await textContent.click({ button: 'right', position: { x: 100, y: 50 } })
    
    await page.click('[data-testid="add-comment-option"]')
    
    // Check comment form
    await expect(page.locator('[data-testid="comment-form"]')).toBeVisible()
    
    await page.fill('[data-testid="comment-text"]', 'This section needs clarification')
    await page.click('[data-testid="submit-comment"]')
    
    // Should show comment indicator
    await expect(page.locator('[data-testid="comment-indicator"]')).toBeVisible()
    
    // Click to view comment
    await page.click('[data-testid="comment-indicator"]')
    
    await expect(page.locator('[data-testid="comment-thread"]')).toBeVisible()
    await expect(page.locator('[data-testid="comment-content"]')).toContainText('This section needs clarification')
    
    // Reply to comment
    await page.fill('[data-testid="reply-text"]', 'I agree, let me update this')
    await page.click('[data-testid="submit-reply"]')
    
    // Should show reply
    await expect(page.locator('[data-testid="comment-reply"]')).toBeVisible()
    await expect(page.locator('[data-testid="comment-reply"]')).toContainText('I agree, let me update this')
  })

  test('should show activity feed for collaborative actions', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    // Check activity feed panel
    await expect(page.locator('[data-testid="activity-feed-panel"]')).toBeVisible()
    
    // Mock activity feed updates
    await page.evaluate(() => {
      const activities = [
        {
          id: 'activity-1',
          type: 'content_edited',
          user: { name: 'John Doe', avatar: '/avatars/john.jpg' },
          message: 'edited Session 1: Introduction',
          timestamp: Date.now() - 300000, // 5 minutes ago
          target: { sessionId: 'session-1', activityId: 'activity-1' }
        },
        {
          id: 'activity-2',
          type: 'comment_added',
          user: { name: 'Jane Smith', avatar: '/avatars/jane.jpg' },
          message: 'added a comment to Session 2',
          timestamp: Date.now() - 600000, // 10 minutes ago
          target: { sessionId: 'session-2' }
        },
        {
          id: 'activity-3',
          type: 'session_created',
          user: { name: 'Mike Johnson', avatar: '/avatars/mike.jpg' },
          message: 'created Session 3: Advanced Topics',
          timestamp: Date.now() - 900000, // 15 minutes ago
          target: { sessionId: 'session-3' }
        }
      ]
      
      window.dispatchEvent(new CustomEvent('activity-feed-update', {
        detail: { activities }
      }))
    })
    
    // Check activity items
    await expect(page.locator('[data-testid="activity-item"]')).toHaveCount(3)
    
    // Check activity details
    const firstActivity = page.locator('[data-testid="activity-item"]').first()
    await expect(firstActivity).toContainText('John Doe')
    await expect(firstActivity).toContainText('edited Session 1')
    
    // Click activity to navigate
    await firstActivity.click()
    
    // Should navigate to relevant content
    await expect(page.locator('[data-testid="session-1"]')).toHaveClass(/highlighted/)
  })

  test('should handle offline collaboration and sync', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    // Simulate going offline
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
      window.dispatchEvent(new Event('offline'))
    })
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
    await expect(page.locator('[data-testid="offline-indicator"]')).toContainText('Working offline')
    
    // Make changes while offline
    const editor = page.locator('[data-testid="content-editor"]')
    await editor.fill('Changes made while offline')
    
    // Should queue changes locally
    await expect(page.locator('[data-testid="pending-changes-indicator"]')).toBeVisible()
    await expect(page.locator('[data-testid="pending-changes-count"]')).toContainText('1')
    
    // Simulate coming back online
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
      window.dispatchEvent(new Event('online'))
    })
    
    // Should show syncing indicator
    await expect(page.locator('[data-testid="syncing-indicator"]')).toBeVisible()
    
    // Wait for sync to complete
    await expect(page.locator('[data-testid="sync-complete-indicator"]')).toBeVisible()
    await expect(page.locator('[data-testid="pending-changes-indicator"]')).not.toBeVisible()
  })

  test('should handle permission-based collaboration', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    // Mock user permissions
    await page.evaluate(() => {
      const permissions = {
        canEdit: true,
        canComment: true,
        canDelete: false,
        canInvite: false,
        role: 'editor'
      }
      
      window.dispatchEvent(new CustomEvent('permissions-update', {
        detail: permissions
      }))
    })
    
    // Check available actions based on permissions
    await expect(page.locator('[data-testid="edit-content-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="add-comment-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="delete-session-button"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="invite-collaborator-button"]')).not.toBeVisible()
    
    // Test permission change
    await page.evaluate(() => {
      const newPermissions = {
        canEdit: false,
        canComment: true,
        canDelete: false,
        canInvite: false,
        role: 'viewer'
      }
      
      window.dispatchEvent(new CustomEvent('permissions-update', {
        detail: newPermissions
      }))
    })
    
    // Should update UI accordingly
    await expect(page.locator('[data-testid="edit-content-button"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="read-only-indicator"]')).toBeVisible()
  })

  test('should support collaborative session management', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    // Check session board
    await expect(page.locator('[data-testid="session-board"]')).toBeVisible()
    
    // Simulate real-time session reordering by another user
    await page.evaluate(() => {
      const sessionUpdate = {
        type: 'session-reorder',
        courseId: 'course-123',
        newOrder: ['session-2', 'session-1', 'session-3'],
        userId: 'user-2',
        timestamp: Date.now()
      }
      
      window.dispatchEvent(new CustomEvent('session-update', {
        detail: sessionUpdate
      }))
    })
    
    // Should update session order
    const sessionBoard = page.locator('[data-testid="session-board"]')
    const firstSession = sessionBoard.locator('[data-testid="session-card"]').first()
    await expect(firstSession).toHaveAttribute('data-session-id', 'session-2')
    
    // Add new session
    await page.click('[data-testid="add-session-button"]')
    await page.fill('[data-testid="session-title-input"]', 'New Collaborative Session')
    await page.click('[data-testid="create-session-button"]')
    
    // Should broadcast session creation
    await expect(page.locator('[data-testid="session-card"]')).toHaveCount(4)
    
    // Other users should see the new session (simulated)
    await page.evaluate(() => {
      const newSessionNotification = {
        type: 'session-created',
        user: { name: 'Current User' },
        session: {
          id: 'session-4',
          title: 'New Collaborative Session'
        }
      }
      
      window.dispatchEvent(new CustomEvent('collaboration-notification', {
        detail: newSessionNotification
      }))
    })
    
    await helpers.waitForToast('New session created')
  })
})

test.describe('Collaboration - Performance', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await helpers.login()
  })

  test('should handle high-frequency collaboration updates efficiently', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    // Simulate rapid collaboration updates
    const startTime = Date.now()
    
    await page.evaluate(() => {
      let updateCount = 0
      const interval = setInterval(() => {
        if (updateCount >= 100) {
          clearInterval(interval)
          return
        }
        
        window.dispatchEvent(new CustomEvent('content-update', {
          detail: {
            type: 'cursor-move',
            userId: `user-${updateCount % 5}`,
            x: Math.random() * 500,
            y: Math.random() * 300,
            timestamp: Date.now()
          }
        }))
        
        updateCount++
      }, 10) // 100 updates per second
    })
    
    // Wait for updates to complete
    await page.waitForTimeout(2000)
    
    const endTime = Date.now()
    const processingTime = endTime - startTime
    
    // Should handle updates efficiently
    expect(processingTime).toBeLessThan(3000)
    
    // UI should remain responsive
    await page.click('[data-testid="content-editor"]')
    await page.keyboard.type('Performance test')
    
    const typedContent = await page.locator('[data-testid="content-editor"]').inputValue()
    expect(typedContent).toContain('Performance test')
  })

  test('should optimize WebSocket message handling', async ({ page }) => {
    await page.goto('/courses/course-123/edit')
    
    let messageCount = 0
    
    // Monitor WebSocket messages
    await page.evaluate(() => {
      (window as any).wsMessageCount = 0
      
      const originalWebSocket = window.WebSocket
      window.WebSocket = class extends originalWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols)
          
          this.addEventListener('message', () => {
            (window as any).wsMessageCount++
          })
        }
      } as any
    })
    
    // Generate collaboration activity
    await page.evaluate(() => {
      // Simulate multiple users making changes
      for (let i = 0; i < 50; i++) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('collaboration-message', {
            detail: {
              type: 'content-change',
              userId: `user-${i % 3}`,
              sessionId: 'session-1',
              change: `Change ${i}`,
              timestamp: Date.now()
            }
          }))
        }, i * 50)
      }
    })
    
    await page.waitForTimeout(3000)
    
    // Check message handling efficiency
    messageCount = await page.evaluate(() => (window as any).wsMessageCount)
    
    // Should process messages without overwhelming the client
    expect(messageCount).toBeLessThan(100) // Some batching/throttling should occur
  })
})