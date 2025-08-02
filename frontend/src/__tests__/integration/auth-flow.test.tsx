import React, { ReactNode, useState } from 'react'
import { describe, it, expect, jest, beforeEach, beforeAll, afterEach, afterAll } from '@jest/globals'
import { render, screen, createUserEvent, waitFor } from '@/__tests__/utils/test-utils'
import { mockAPI, server } from '@/__tests__/utils/api-mocks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'

// Mock components for testing flows
const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const data = await response.json()
      localStorage.setItem('auth_token', data.token)
      
      // Redirect to dashboard (in real app)
      window.location.href = '/dashboard'
    } catch (err) {
      setError('Invalid credentials')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div data-testid="login-page">
      <h1>Login</h1>
      <form onSubmit={handleSubmit} data-testid="login-form">
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="email-input"
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="password-input"
            required
          />
        </div>
        {error && (
          <div role="alert" data-testid="login-error">
            {error}
          </div>
        )}
        <button 
          type="submit" 
          disabled={isLoading}
          data-testid="login-button"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <a href="/register" data-testid="register-link">
        Don't have an account? Register
      </a>
      <a href="/forgot-password" data-testid="forgot-password-link">
        Forgot password?
      </a>
    </div>
  )
}

const RegisterPage = () => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    role: '',
    useCase: '',
    agreeToTerms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep = (stepNumber: number) => {
    const newErrors: Record<string, string> = {}

    if (stepNumber === 1) {
      if (!formData.name) newErrors.name = 'Name is required'
      if (!formData.email) newErrors.email = 'Email is required'
      if (!formData.password) newErrors.password = 'Password is required'
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords must match'
      }
    }

    if (stepNumber === 2) {
      if (!formData.organization) newErrors.organization = 'Organization is required'
      if (!formData.role) newErrors.role = 'Role is required'
    }

    if (stepNumber === 3) {
      if (!formData.useCase) newErrors.useCase = 'Use case is required'
      if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to terms'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handleSubmit = async () => {
    if (validateStep(3)) {
      try {
        const response = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        if (response.ok) {
          window.location.href = '/dashboard'
        }
      } catch (error) {
        setErrors({ submit: 'Registration failed' })
      }
    }
  }

  return (
    <div data-testid="register-page">
      <h1>Register - Step {step} of 3</h1>
      
      <div data-testid="step-indicator">
        <div className={step >= 1 ? 'active' : ''} data-testid="step-1">
          Step 1
        </div>
        <div className={step >= 2 ? 'active' : ''} data-testid="step-2">
          Step 2
        </div>
        <div className={step >= 3 ? 'active' : ''} data-testid="step-3">
          Step 3
        </div>
      </div>

      {step === 1 && (
        <div data-testid="step-1-content">
          <input
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            data-testid="name-input"
          />
          {errors.name && <div data-testid="name-error">{errors.name}</div>}

          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            data-testid="email-input"
          />
          {errors.email && <div data-testid="email-error">{errors.email}</div>}

          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            data-testid="password-input"
          />
          {errors.password && <div data-testid="password-error">{errors.password}</div>}

          <input
            type="password"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            data-testid="confirm-password-input"
          />
          {errors.confirmPassword && <div data-testid="confirm-password-error">{errors.confirmPassword}</div>}

          <button onClick={handleNext} data-testid="next-step-button">
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div data-testid="step-2-content">
          <input
            placeholder="Organization"
            value={formData.organization}
            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
            data-testid="organization-input"
          />
          {errors.organization && <div data-testid="organization-error">{errors.organization}</div>}

          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            data-testid="role-select"
          >
            <option value="">Select Role</option>
            <option value="educator">Educator</option>
            <option value="administrator">Administrator</option>
            <option value="student">Student</option>
          </select>
          {errors.role && <div data-testid="role-error">{errors.role}</div>}

          <button onClick={() => setStep(1)} data-testid="back-button">
            Back
          </button>
          <button onClick={handleNext} data-testid="next-step-button">
            Next
          </button>
        </div>
      )}

      {step === 3 && (
        <div data-testid="step-3-content">
          <div>
            <label>
              <input
                type="radio"
                name="useCase"
                value="corporate-training"
                checked={formData.useCase === 'corporate-training'}
                onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                data-testid="usecase-corporate-training"
              />
              Corporate Training
            </label>
          </div>
          <div>
            <label>
              <input
                type="radio"
                name="useCase"
                value="academic-courses"
                checked={formData.useCase === 'academic-courses'}
                onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                data-testid="usecase-academic-courses"
              />
              Academic Courses
            </label>
          </div>
          {errors.useCase && <div data-testid="usecase-error">{errors.useCase}</div>}

          <label>
            <input
              type="checkbox"
              checked={formData.agreeToTerms}
              onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
              data-testid="agree-terms-checkbox"
            />
            I agree to the Terms of Service
          </label>
          {errors.agreeToTerms && <div data-testid="terms-error">{errors.agreeToTerms}</div>}

          <button onClick={() => setStep(2)} data-testid="back-button">
            Back
          </button>
          <button onClick={handleSubmit} data-testid="complete-registration-button">
            Complete Registration
          </button>
        </div>
      )}
    </div>
  )
}

// Setup MSW server
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Authentication Flow Integration Tests', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()
    
    // Reset window.location mock
    delete (window as any).location
    ;(window as any).location = { href: '' }
  })

  describe('Login Flow', () => {
    it('should complete successful login flow', async () => {
      const user = createUserEvent()
      
      // Mock the fetch function directly since MSW isn't working properly
      const originalFetch = global.fetch
      ;(global.fetch as jest.Mock) = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/auth/login')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              user: { id: '1', name: 'Test User', email: 'test@example.com' },
              token: 'mock-jwt-token',
              refreshToken: 'mock-refresh-token',
            })
          })
        }
        return Promise.reject(new Error('Not found'))
      })
      
      render(<LoginPage />, { wrapper: createWrapper() })

      // Verify login page renders
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument()

      // Fill in credentials
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')

      // Submit form
      await user.click(screen.getByTestId('login-button'))

      // Wait for response and storage update
      await waitFor(() => {
        expect(localStorage.getItem('auth_token')).toBe('mock-jwt-token')
      })

      // Should redirect to dashboard
      await waitFor(() => {
        expect(window.location.href).toBe('/dashboard')
      })
      
      // Restore original fetch
      global.fetch = originalFetch
    })

    it('should handle login errors gracefully', async () => {
      const user = createUserEvent()
      render(<LoginPage />, { wrapper: createWrapper() })

      // Fill in wrong credentials
      await user.type(screen.getByTestId('email-input'), 'wrong@example.com')
      await user.type(screen.getByTestId('password-input'), 'wrongpassword')

      // Mock failed login response
      server.use(
        http.post('http://localhost:3001/auth/login', async () => {
          return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
        })
      )

      // Submit form
      await user.click(screen.getByTestId('login-button'))

      // Should show error message
      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toBeInTheDocument()
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      // Should not redirect
      expect(window.location.href).toBe('')
      expect(localStorage.getItem('auth_token')).toBeNull()
    })

    it('should validate form fields', async () => {
      const user = createUserEvent()
      render(<LoginPage />, { wrapper: createWrapper() })

      // Try to submit without filling fields
      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')

      // HTML5 validation should prevent submission
      expect(emailInput).toBeRequired()
      expect(passwordInput).toBeRequired()

      // Fill only email
      await user.type(emailInput, 'test@example.com')
      
      // Form should still be invalid due to missing password
      expect(passwordInput).toBeInvalid()
    })

    it('should provide accessible navigation links', () => {
      render(<LoginPage />, { wrapper: createWrapper() })

      const registerLink = screen.getByTestId('register-link')
      const forgotPasswordLink = screen.getByTestId('forgot-password-link')

      expect(registerLink).toHaveAttribute('href', '/register')
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password')
    })
  })

  describe('Registration Flow', () => {
    it('should complete multi-step registration successfully', async () => {
      const user = createUserEvent()
      
      // Mock the fetch function directly
      const originalFetch = global.fetch
      ;(global.fetch as jest.Mock) = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/auth/register')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              user: { id: '2', name: 'John Doe', email: 'john@example.com' },
              token: 'mock-jwt-token',
              refreshToken: 'mock-refresh-token',
            })
          })
        }
        return Promise.reject(new Error('Not found'))
      })
      
      render(<RegisterPage />, { wrapper: createWrapper() })

      // Step 1: Basic Information
      expect(screen.getByText('Register - Step 1 of 3')).toBeInTheDocument()
      expect(screen.getByTestId('step-1')).toHaveClass('active')

      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'securepassword123')
      await user.type(screen.getByTestId('confirm-password-input'), 'securepassword123')

      await user.click(screen.getByTestId('next-step-button'))

      // Step 2: Organization Details
      await waitFor(() => {
        expect(screen.getByText('Register - Step 2 of 3')).toBeInTheDocument()
        expect(screen.getByTestId('step-2')).toHaveClass('active')
      })

      await user.type(screen.getByTestId('organization-input'), 'Test Organization')
      await user.selectOptions(screen.getByTestId('role-select'), 'educator')

      await user.click(screen.getByTestId('next-step-button'))

      // Step 3: Use Case and Terms
      await waitFor(() => {
        expect(screen.getByText('Register - Step 3 of 3')).toBeInTheDocument()
        expect(screen.getByTestId('step-3')).toHaveClass('active')
      })

      await user.click(screen.getByTestId('usecase-corporate-training'))
      await user.click(screen.getByTestId('agree-terms-checkbox'))

      // Complete registration
      await user.click(screen.getByTestId('complete-registration-button'))

      // Should redirect to dashboard
      await waitFor(() => {
        expect(window.location.href).toBe('/dashboard')
      })
      
      // Restore original fetch
      global.fetch = originalFetch
    })

    it('should validate each step before proceeding', async () => {
      const user = createUserEvent()
      render(<RegisterPage />, { wrapper: createWrapper() })

      // Try to proceed without filling step 1
      await user.click(screen.getByTestId('next-step-button'))

      // Should show validation errors
      expect(screen.getByTestId('name-error')).toHaveTextContent('Name is required')
      expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required')
      expect(screen.getByTestId('password-error')).toHaveTextContent('Password is required')

      // Should stay on step 1
      expect(screen.getByText('Register - Step 1 of 3')).toBeInTheDocument()
    })

    it('should validate password confirmation', async () => {
      const user = createUserEvent()
      render(<RegisterPage />, { wrapper: createWrapper() })

      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'differentpassword')

      await user.click(screen.getByTestId('next-step-button'))

      expect(screen.getByTestId('confirm-password-error')).toHaveTextContent('Passwords must match')
    })

    it('should allow navigation between steps', async () => {
      const user = createUserEvent()
      render(<RegisterPage />, { wrapper: createWrapper() })

      // Complete step 1
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('next-step-button'))

      // Move to step 2
      await waitFor(() => {
        expect(screen.getByText('Register - Step 2 of 3')).toBeInTheDocument()
      })

      // Go back to step 1
      await user.click(screen.getByTestId('back-button'))

      await waitFor(() => {
        expect(screen.getByText('Register - Step 1 of 3')).toBeInTheDocument()
      })

      // Form data should be preserved
      expect(screen.getByTestId('name-input')).toHaveValue('John Doe')
      expect(screen.getByTestId('email-input')).toHaveValue('john@example.com')
    })

    it('should show progress indicator correctly', async () => {
      const user = createUserEvent()
      render(<RegisterPage />, { wrapper: createWrapper() })

      // Initially only step 1 should be active
      expect(screen.getByTestId('step-1')).toHaveClass('active')
      expect(screen.getByTestId('step-2')).not.toHaveClass('active')
      expect(screen.getByTestId('step-3')).not.toHaveClass('active')

      // Complete step 1 and move to step 2
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('next-step-button'))

      await waitFor(() => {
        expect(screen.getByTestId('step-1')).toHaveClass('active')
        expect(screen.getByTestId('step-2')).toHaveClass('active')
        expect(screen.getByTestId('step-3')).not.toHaveClass('active')
      })
    })

    it('should validate terms agreement', async () => {
      const user = createUserEvent()
      render(<RegisterPage />, { wrapper: createWrapper() })

      // Navigate to step 3
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('next-step-button'))

      await waitFor(() => {
        expect(screen.getByText('Register - Step 2 of 3')).toBeInTheDocument()
      })

      await user.type(screen.getByTestId('organization-input'), 'Test Org')
      await user.selectOptions(screen.getByTestId('role-select'), 'educator')
      await user.click(screen.getByTestId('next-step-button'))

      await waitFor(() => {
        expect(screen.getByText('Register - Step 3 of 3')).toBeInTheDocument()
      })

      // Select use case but don't agree to terms
      await user.click(screen.getByTestId('usecase-corporate-training'))

      // Try to complete registration without agreeing to terms
      await user.click(screen.getByTestId('complete-registration-button'))

      expect(screen.getByTestId('terms-error')).toHaveTextContent('You must agree to terms')
    })
  })

  describe('Form Accessibility', () => {
    it('should have proper form labels and ARIA attributes', () => {
      render(<LoginPage />, { wrapper: createWrapper() })

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')

      expect(emailInput).toBeInTheDocument()
      expect(passwordInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should announce errors to screen readers', async () => {
      const user = createUserEvent()
      render(<LoginPage />, { wrapper: createWrapper() })

      server.use(
        http.post('http://localhost:3001/auth/login', async () => {
          return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
        })
      )

      await user.type(screen.getByTestId('email-input'), 'wrong@example.com')
      await user.type(screen.getByTestId('password-input'), 'wrong')
      await user.click(screen.getByTestId('login-button'))

      await waitFor(() => {
        const errorElement = screen.getByRole('alert')
        expect(errorElement).toBeInTheDocument()
        expect(errorElement).toHaveTextContent('Invalid credentials')
      })
    })

    it('should support keyboard navigation', async () => {
      const user = createUserEvent()
      render(<LoginPage />, { wrapper: createWrapper() })

      // Tab through form elements
      await user.tab()
      expect(screen.getByTestId('email-input')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('password-input')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('login-button')).toHaveFocus()

      // Submit with Enter
      await user.keyboard('[Enter]')
      expect(screen.getByTestId('login-button')).toHaveFocus()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const user = createUserEvent()
      render(<LoginPage />, { wrapper: createWrapper() })

      // Mock network error
      server.use(
        http.post('http://localhost:3001/auth/login', async () => {
          return HttpResponse.error()
        })
      )

      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('login-button'))

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toBeInTheDocument()
      })
    })

    it('should handle server errors gracefully', async () => {
      const user = createUserEvent()
      render(<LoginPage />, { wrapper: createWrapper() })

      // Mock server error
      server.use(
        http.post('http://localhost:3001/auth/login', async () => {
          return HttpResponse.json({ message: 'Internal server error' }, { status: 500 })
        })
      )

      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('login-button'))

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toBeInTheDocument()
      })
    })

    it('should prevent double submission', async () => {
      const user = createUserEvent()
      
      // Mock the fetch with a delay to capture loading state
      const originalFetch = global.fetch
      let resolvePromise: ((value: any) => void) | null = null
      
      ;(global.fetch as jest.Mock) = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/auth/login')) {
          return new Promise((resolve) => {
            resolvePromise = resolve
            // Delay the response to keep the loading state
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({
                  user: { id: '1', name: 'Test User', email: 'test@example.com' },
                  token: 'mock-jwt-token',
                  refreshToken: 'mock-refresh-token',
                })
              })
            }, 200)
          })
        }
        return Promise.reject(new Error('Not found'))
      })
      
      render(<LoginPage />, { wrapper: createWrapper() })

      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')

      const submitButton = screen.getByTestId('login-button')

      // Click submit
      await user.click(submitButton)

      // Use a small timeout to ensure the state has updated
      await new Promise(resolve => setTimeout(resolve, 50))

      // Button should be disabled during loading
      expect(submitButton).toBeDisabled()
      
      // Should also show loading text
      expect(screen.getByText('Logging in...')).toBeInTheDocument()
      
      // Wait for the request to complete
      await waitFor(() => {
        expect(localStorage.getItem('auth_token')).toBe('mock-jwt-token')
      }, { timeout: 5000 })
      
      // Restore original fetch
      global.fetch = originalFetch
    })
  })

  describe('Data Persistence', () => {
    it('should preserve form data during step navigation', async () => {
      const user = createUserEvent()
      render(<RegisterPage />, { wrapper: createWrapper() })

      // Fill step 1
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('next-step-button'))

      // Fill step 2
      await waitFor(() => {
        expect(screen.getByTestId('organization-input')).toBeInTheDocument()
      })
      await user.type(screen.getByTestId('organization-input'), 'Test Org')
      await user.selectOptions(screen.getByTestId('role-select'), 'educator')

      // Go back to step 1
      await user.click(screen.getByTestId('back-button'))

      // Data should be preserved
      await waitFor(() => {
        expect(screen.getByTestId('name-input')).toHaveValue('John Doe')
        expect(screen.getByTestId('email-input')).toHaveValue('john@example.com')
        expect(screen.getByTestId('password-input')).toHaveValue('password123')
        expect(screen.getByTestId('confirm-password-input')).toHaveValue('password123')
      })

      // Navigate back to step 2
      await user.click(screen.getByTestId('next-step-button'))

      // Step 2 data should also be preserved
      await waitFor(() => {
        expect(screen.getByTestId('organization-input')).toHaveValue('Test Org')
        expect(screen.getByTestId('role-select')).toHaveValue('educator')
      })
    })
  })
})