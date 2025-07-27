import React from 'react'
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, waitFor, createUserEvent, mockAuthStore } from '@/__tests__/utils/test-utils'
import { server } from '@/__tests__/utils/api-mocks'
import { http, HttpResponse } from 'msw'
import LoginPage from '../login/page'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'

const mockPush = jest.fn()
const mockLogin = jest.fn()

// Get the router mock from the setup
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
}

// Override the useRouter mock for this test file
;(useRouter as any).mockReturnValue = jest.fn().mockReturnValue(mockRouter)

describe('Login Page', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Update the mock auth store login function
    mockAuthStore.login = mockLogin
    
    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('Rendering', () => {
    it('should render the login page with all essential elements', () => {
      render(<LoginPage />)
      
      // Check for main heading
      expect(screen.getByText('Welcome Back')).toBeInTheDocument()
      
      // Check for form elements
      expect(screen.getByTestId('login-form')).toBeInTheDocument()
      expect(screen.getByTestId('email-input')).toBeInTheDocument()
      expect(screen.getByTestId('password-input')).toBeInTheDocument()
      expect(screen.getByTestId('login-button')).toBeInTheDocument()
      
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
      
      expect(screen.getByText('Transform Your Content Into Interactive Courses')).toBeInTheDocument()
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
      render(<LoginPage />)
      
      // Setup successful login response
      server.use(
        http.post('http://localhost:3001/api/auth/login', async () => {
          return HttpResponse.json({
            user: { id: '1', name: 'Test User', email: 'test@example.com' },
            token: 'mock-jwt-token',
          }, { status: 200 })
        })
      )
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('login-button'))
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(
          { id: '1', name: 'Test User', email: 'test@example.com' },
          'mock-jwt-token'
        )
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should show error message for invalid credentials', async () => {
      const user = createUserEvent()
      render(<LoginPage />)
      
      // Setup failed login response
      server.use(
        http.post('http://localhost:3001/api/auth/login', async () => {
          return HttpResponse.json({
            message: 'Invalid credentials'
          }, { status: 401 })
        })
      )
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'wrongpassword')
      await user.click(screen.getByTestId('login-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent('Invalid credentials')
        expect(mockLogin).not.toHaveBeenCalled()
        expect(mockPush).not.toHaveBeenCalled()
      })
    })

    it('should disable submit button during loading', async () => {
      const user = createUserEvent()
      render(<LoginPage />)
      
      // Setup a delayed response
      server.use(
        http.post('http://localhost:3001/api/auth/login', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return HttpResponse.json({
            user: { id: '1', name: 'Test User', email: 'test@example.com' },
            token: 'mock-jwt-token',
          }, { status: 200 })
        })
      )
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      
      const loginButton = screen.getByTestId('login-button')
      await user.click(loginButton)
      
      // Button should be disabled and show loading state
      expect(loginButton).toBeDisabled()
      expect(screen.getByText('Signing in...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(loginButton).not.toBeDisabled()
        expect(screen.queryByText('Signing in...')).not.toBeInTheDocument()
      })
    })

    it('should handle network errors gracefully', async () => {
      const user = createUserEvent()
      render(<LoginPage />)
      
      // Setup network error
      server.use(
        http.post('http://localhost:3001/api/auth/login', async () => {
          return HttpResponse.error()
        })
      )
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('login-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toBeInTheDocument()
        expect(mockLogin).not.toHaveBeenCalled()
      })
    })

    it('should save remember me preference on successful login', async () => {
      const user = createUserEvent()
      render(<LoginPage />)
      
      server.use(
        http.post('http://localhost:3001/api/auth/login', async () => {
          return HttpResponse.json({
            user: { id: '1', name: 'Test User', email: 'test@example.com' },
            token: 'mock-jwt-token',
          }, { status: 200 })
        })
      )
      
      await user.click(screen.getByTestId('remember-me-checkbox'))
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('login-button'))
      
      await waitFor(() => {
        expect(localStorage.getItem('rememberMe')).toBe('true')
      })
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should render mobile-optimized layout', () => {
      render(<LoginPage />)
      
      expect(screen.getByTestId('mobile-auth-layout')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-login-form')).toBeInTheDocument()
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
      
      // Tab through form elements
      await user.tab()
      expect(screen.getByTestId('email-input')).toHaveFocus()
      
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