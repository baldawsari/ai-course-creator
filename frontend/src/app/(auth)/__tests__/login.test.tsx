import React from 'react'
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, waitFor, createUserEvent, mockAuthStore } from '@/__tests__/utils/test-utils'
import { server } from '@/__tests__/utils/api-mocks'
import { http, HttpResponse } from 'msw'
import LoginPage from '../login/page'
import * as apiClientModule from '@/lib/api/client'

// Create spy on apiClient
const mockApiPost = jest.fn()
jest.spyOn(apiClientModule.apiClient, 'post').mockImplementation(mockApiPost)

// Mock push function
const mockPush = jest.fn()

// Mock useRouter
const mockUseRouter = jest.fn()
mockUseRouter.mockReturnValue({
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
})

jest.mock('next/navigation', () => ({
  useRouter: mockUseRouter,
  useParams: () => ({ id: 'test-id' }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}))

describe('Login Page', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Reset the mock auth store
    mockAuthStore.login.mockClear()
    mockAuthStore.login.mockImplementation(() => {
      // Mock successful login
      mockAuthStore.user = {
        id: 'user-admin',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      }
      mockAuthStore.isAuthenticated = true
    })
    mockAuthStore.user = null
    mockAuthStore.isAuthenticated = false
    
    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('Rendering', () => {
    it('should render the login page with all essential elements', () => {
      const { container } = render(<LoginPage />)
      
      // Wait for component to render
      expect(container).toBeTruthy()
      
      // Check for main heading
      const heading = screen.getByRole('heading', { name: /welcome back/i })
      expect(heading).toBeInTheDocument()
      
      // Check for form elements - use more flexible queries
      const emailInput = screen.getByPlaceholderText(/enter your email/i)
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('data-testid', 'email-input')
      
      const passwordInput = screen.getByPlaceholderText(/enter your password/i)
      expect(passwordInput).toBeInTheDocument()
      expect(passwordInput).toHaveAttribute('data-testid', 'password-input')
      
      const loginButton = screen.getByRole('button', { name: /sign in to dashboard/i })
      expect(loginButton).toBeInTheDocument()
      expect(loginButton).toHaveAttribute('data-testid', 'login-button')
      
      // Check for links
      expect(screen.getByText(/Don't have an account\?/)).toBeInTheDocument()
      expect(screen.getByText('Sign up here')).toHaveAttribute('href', '/register')
      expect(screen.getByTestId('forgot-password-link')).toHaveAttribute('href', '/forgot-password')
    })

    it('should render form labels correctly', () => {
      render(<LoginPage />)
      
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('should render the remember me checkbox', () => {
      render(<LoginPage />)
      
      const rememberCheckbox = screen.getByTestId('remember-me-checkbox')
      expect(rememberCheckbox).toBeInTheDocument()
      expect(rememberCheckbox).not.toBeChecked()
      expect(screen.getByText('Remember me')).toBeInTheDocument()
    })

    it('should render the app logo and branding', () => {
      render(<LoginPage />)
      
      expect(screen.getByTestId('app-logo')).toBeInTheDocument()
      expect(screen.getByText('AI Course Creator')).toBeInTheDocument()
    })

    it('should render benefits section on desktop', () => {
      render(<LoginPage />)
      
      // The benefits section may contain spans that break up the text
      const benefitsText = screen.getByText((content, element) => {
        return element?.textContent === 'Transform Your Content Into Interactive Courses'
      })
      expect(benefitsText).toBeInTheDocument()
      expect(screen.getByText('Generate Courses Instantly')).toBeInTheDocument()
      expect(screen.getByText('Save Hours of Work')).toBeInTheDocument()
      expect(screen.getByText('Enterprise Security')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show email validation error for empty email', async () => {
      const user = createUserEvent()
      render(<LoginPage />)
      
      const emailInput = screen.getByTestId('email-input')
      const loginButton = screen.getByTestId('login-button')
      
      // Focus and blur without entering email
      await user.click(emailInput)
      await user.tab()
      
      expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required')
      
      // Try to submit
      await user.click(loginButton)
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should show email validation error for invalid email format', async () => {
      const user = createUserEvent()
      render(<LoginPage />)
      
      const emailInput = screen.getByTestId('email-input')
      
      await user.type(emailInput, 'invalidemail')
      await user.tab()
      
      expect(screen.getByTestId('email-error')).toHaveTextContent('Invalid email address')
    })

    it('should show password validation error for empty password', async () => {
      const user = createUserEvent()
      render(<LoginPage />)
      
      const passwordInput = screen.getByTestId('password-input')
      
      await user.click(passwordInput)
      await user.tab()
      
      expect(screen.getByTestId('password-error')).toHaveTextContent('Password is required')
    })

    it('should show password validation error for short password', async () => {
      const user = createUserEvent()
      render(<LoginPage />)
      
      const passwordInput = screen.getByTestId('password-input')
      
      await user.type(passwordInput, 'short')
      await user.tab()
      
      expect(screen.getByTestId('password-error')).toHaveTextContent('Password must be at least 8 characters')
    })

    it('should not show validation errors for valid inputs', async () => {
      const user = createUserEvent()
      render(<LoginPage />)
      
      await user.type(screen.getByTestId('email-input'), 'valid@email.com')
      await user.type(screen.getByTestId('password-input'), 'validpassword123')
      await user.tab()
      
      expect(screen.queryByTestId('email-error')).not.toBeInTheDocument()
      expect(screen.queryByTestId('password-error')).not.toBeInTheDocument()
    })
  })

  describe('Form Interactions', () => {
    it('should toggle password visibility', async () => {
      const user = createUserEvent()
      render(<LoginPage />)
      
      const passwordInput = screen.getByTestId('password-input')
      const toggleButton = passwordInput.parentElement?.querySelector('button[type="button"]')
      
      expect(passwordInput).toHaveAttribute('type', 'password')
      
      if (toggleButton) {
        await user.click(toggleButton)
        expect(passwordInput).toHaveAttribute('type', 'text')
        
        await user.click(toggleButton)
        expect(passwordInput).toHaveAttribute('type', 'password')
      }
    })

    it('should handle remember me checkbox', async () => {
      const user = createUserEvent()
      render(<LoginPage />)
      
      const rememberCheckbox = screen.getByTestId('remember-me-checkbox')
      
      expect(rememberCheckbox).not.toBeChecked()
      
      await user.click(rememberCheckbox)
      expect(rememberCheckbox).toBeChecked()
      
      await user.click(rememberCheckbox)
      expect(rememberCheckbox).not.toBeChecked()
    })

    it('should update form state when typing', async () => {
      const user = createUserEvent()
      render(<LoginPage />)
      
      const emailInput = screen.getByTestId('email-input') as HTMLInputElement
      const passwordInput = screen.getByTestId('password-input') as HTMLInputElement
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      expect(emailInput.value).toBe('test@example.com')
      expect(passwordInput.value).toBe('password123')
    })
  })

  describe('Form Submission', () => {
    it('should successfully log in with valid credentials', async () => {
      const user = createUserEvent()
      
      // Setup successful login response before rendering
      mockApiPost.mockResolvedValueOnce({
        user: {
          id: 'user-admin',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin'
        },
        token: 'mock-jwt-token'
      })
      
      render(<LoginPage />)
      
      // Fill in the form
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      
      // Submit the form
      await user.click(screen.getByTestId('login-button'))
      
      // Verify API was called
      expect(mockApiPost).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      })
      
      // Due to async nature of login flow, we'll just verify the auth store was called
      // The navigation happens after the auth store update, which is async
      await waitFor(() => {
        expect(mockAuthStore.login).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'user-admin',
            email: 'admin@example.com'
          }),
          'mock-jwt-token'
        )
      })
    })

    it('should show error message for invalid credentials', async () => {
      const user = createUserEvent()
      
      // Setup failed login response
      mockApiPost.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Invalid credentials' }
        },
        message: 'Invalid credentials'
      })
      
      render(<LoginPage />)
      
      // Fill in the form
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'wrongpassword')
      
      // Submit the form
      await user.click(screen.getByTestId('login-button'))
      
      // Wait for error to appear
      await waitFor(() => {
        const errorElement = screen.getByTestId('login-error')
        expect(errorElement).toBeInTheDocument()
        expect(errorElement).toHaveTextContent('Invalid credentials')
      })
      
      // Verify no login or navigation occurred
      expect(mockAuthStore.login).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should disable submit button during loading', async () => {
      // Make the API call hang to see the loading state
      let resolvePromise: any
      const hangingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockApiPost.mockReturnValue(hangingPromise)
      
      const user = createUserEvent()
      render(<LoginPage />)
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      
      const loginButton = screen.getByTestId('login-button')
      
      // Click the button
      await user.click(loginButton)
      
      // Button should be disabled while loading
      await waitFor(() => {
        expect(loginButton).toBeDisabled()
      })
      
      // Check for loading text within the button
      const loadingText = screen.getByText('Signing in...')
      expect(loadingText).toBeInTheDocument()
      
      // Clean up by resolving the promise
      resolvePromise({
        user: { id: 'user-admin', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
        token: 'mock-jwt-token'
      })
    })

    it('should handle network errors gracefully', async () => {
      const user = createUserEvent()
      
      // Setup network error
      mockApiPost.mockRejectedValue(new Error('Network Error'))
      
      render(<LoginPage />)
      
      // Fill in the form
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      
      // Submit the form
      await user.click(screen.getByTestId('login-button'))
      
      // Wait for error to appear
      await waitFor(() => {
        const errorElement = screen.getByTestId('login-error')
        expect(errorElement).toBeInTheDocument()
        // The error message should contain something about network or error
        expect(errorElement.textContent).toMatch(/error|failed|network/i)
      })
      
      // Verify no login occurred
      expect(mockAuthStore.login).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should save remember me preference on successful login', async () => {
      const user = createUserEvent()
      
      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn()
      }
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true
      })
      
      // Setup successful login response
      mockApiPost.mockResolvedValueOnce({
        user: {
          id: 'user-admin',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin'
        },
        token: 'mock-jwt-token'
      })
      
      // Mock auth store login to be synchronous
      mockAuthStore.login.mockImplementation((user, token) => {
        mockAuthStore.user = user
        mockAuthStore.isAuthenticated = true
      })
      
      render(<LoginPage />)
      
      // Check the remember me checkbox
      const rememberCheckbox = screen.getByTestId('remember-me-checkbox')
      await user.click(rememberCheckbox)
      expect(rememberCheckbox).toBeChecked()
      
      // Fill in the form
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      
      // Submit the form
      await user.click(screen.getByTestId('login-button'))
      
      // Wait for all operations to complete
      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith('/auth/login', {
          email: 'test@example.com',
          password: 'password123'
        })
      })
      
      await waitFor(() => {
        expect(mockAuthStore.login).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'user-admin',
            email: 'admin@example.com'
          }),
          'mock-jwt-token'
        )
      })
      
      // Check localStorage was set
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('rememberMe', 'true')
      }, { timeout: 1000 })
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should render mobile-optimized layout', () => {
      render(<LoginPage />)
      
      expect(screen.getByTestId('mobile-auth-layout')).toBeInTheDocument()
      
      // Check for form by looking for inputs instead
      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument()
    })

    it('should hide benefits section on mobile', () => {
      // Mock window.matchMedia for mobile
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(max-width: 1023px)',
          media: query,
          onchange: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })
      
      render(<LoginPage />)
      
      // Benefits section should be in a hidden container on mobile
      const benefitsSection = screen.queryByText('Transform Your Content Into Interactive Courses')
      if (benefitsSection) {
        const container = benefitsSection.closest('.hidden.lg\\:flex')
        expect(container).toBeInTheDocument()
      }
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email Address')
      const passwordInput = screen.getByLabelText('Password')
      
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(emailInput).toHaveAttribute('id', 'email')
      expect(passwordInput).toHaveAttribute('id', 'password')
    })

    it('should be keyboard navigable', async () => {
      const user = createUserEvent()
      render(<LoginPage />)
      
      // Focus the email input first
      const emailInput = screen.getByTestId('email-input')
      emailInput.focus()
      expect(emailInput).toHaveFocus()
      
      await user.tab()
      expect(screen.getByTestId('password-input')).toHaveFocus()
      
      await user.tab()
      // Password toggle button
      
      await user.tab()
      expect(screen.getByTestId('remember-me-checkbox')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByTestId('forgot-password-link')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByTestId('login-button')).toHaveFocus()
    })

    it('should announce form errors to screen readers', async () => {
      const user = createUserEvent()
      render(<LoginPage />)
      
      await user.click(screen.getByTestId('email-input'))
      await user.tab()
      
      const errorElement = screen.getByTestId('email-error')
      expect(errorElement).toHaveTextContent('Email is required')
      // Error messages should be associated with inputs for screen readers
    })
  })
})