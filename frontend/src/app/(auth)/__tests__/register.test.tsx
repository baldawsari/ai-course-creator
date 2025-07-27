import React from 'react'
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, waitFor, createUserEvent } from '@/__tests__/utils/test-utils'
import { server } from '@/__tests__/utils/api-mocks'
import { http, HttpResponse } from 'msw'
import RegisterPage from '../register/page'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'

// Mock the modules
jest.mock('next/navigation')
jest.mock('@/lib/store/auth-store')

const mockPush = jest.fn()
const mockLogin = jest.fn()

describe('Register Page', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup router mock
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    })
    
    // Setup auth store mock
    ;(useAuthStore as unknown as jest.Mock).mockReturnValue({
      login: mockLogin,
      user: null,
      isAuthenticated: false,
    })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('Rendering', () => {
    it('should render the initial registration form with step 1', () => {
      render(<RegisterPage />)
      
      // Check for step indicator
      expect(screen.getByTestId('step-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('step-1')).toHaveClass('active')
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
      
      // Check for step 1 content
      expect(screen.getByText('Create Your Account')).toBeInTheDocument()
      expect(screen.getByTestId('name-input')).toBeInTheDocument()
      expect(screen.getByTestId('email-input')).toBeInTheDocument()
      expect(screen.getByTestId('password-input')).toBeInTheDocument()
      expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument()
    })

    it('should render the app branding', () => {
      render(<RegisterPage />)
      
      expect(screen.getByText('AI Course Creator')).toBeInTheDocument()
      expect(screen.getByText(/Already have an account\?/)).toBeInTheDocument()
      expect(screen.getByText('Sign in here')).toHaveAttribute('href', '/login')
    })

    it('should show all three step indicators', () => {
      render(<RegisterPage />)
      
      expect(screen.getByTestId('step-1')).toBeInTheDocument()
      expect(screen.getByTestId('step-2')).toBeInTheDocument()
      expect(screen.getByTestId('step-3')).toBeInTheDocument()
    })
  })

  describe('Step Navigation', () => {
    it('should navigate to step 2 when step 1 is valid', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      // Fill step 1
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      
      await user.click(screen.getByTestId('next-step-button'))
      
      // Should be on step 2
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
      expect(screen.getByTestId('step-2')).toHaveClass('active')
      expect(screen.getByTestId('organization-input')).toBeInTheDocument()
    })

    it('should navigate back to previous step', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      // Go to step 2
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('next-step-button'))
      
      // Click back
      await user.click(screen.getByText('Previous'))
      
      // Should be back on step 1
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
      expect(screen.getByTestId('name-input')).toHaveValue('John Doe')
    })

    it('should preserve form data when navigating between steps', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      // Fill step 1
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('next-step-button'))
      
      // Fill step 2
      await user.type(screen.getByTestId('organization-input'), 'Test Org')
      await user.click(screen.getByTestId('role-instructor'))
      
      // Go back to step 1
      await user.click(screen.getByText('Previous'))
      
      // Data should be preserved
      expect(screen.getByTestId('name-input')).toHaveValue('John Doe')
      expect(screen.getByTestId('email-input')).toHaveValue('john@example.com')
      
      // Go forward to step 2
      await user.click(screen.getByTestId('next-step-button'))
      
      // Step 2 data should be preserved
      expect(screen.getByTestId('organization-input')).toHaveValue('Test Org')
    })
  })

  describe('Step 1 Validation', () => {
    it('should validate required fields on step 1', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      // Try to proceed without filling fields
      await user.click(screen.getByTestId('next-step-button'))
      
      expect(screen.getByText('Please enter your full name')).toBeInTheDocument()
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument() // Should stay on step 1
    })

    it('should validate email format', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'invalid-email')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      
      await user.click(screen.getByTestId('next-step-button'))
      
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })

    it('should validate password length', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'short')
      await user.type(screen.getByTestId('confirm-password-input'), 'short')
      
      await user.click(screen.getByTestId('next-step-button'))
      
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
    })

    it('should validate password confirmation match', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'different123')
      
      await user.click(screen.getByTestId('next-step-button'))
      
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })

    it('should toggle password visibility', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      const passwordInput = screen.getByTestId('password-input')
      const toggleButton = passwordInput.parentElement?.querySelector('button[type="button"]')
      
      expect(passwordInput).toHaveAttribute('type', 'password')
      
      if (toggleButton) {
        await user.click(toggleButton)
        expect(passwordInput).toHaveAttribute('type', 'text')
      }
    })
  })

  describe('Step 2 Validation', () => {
    it('should validate organization field', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      // Complete step 1
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('next-step-button'))
      
      // Try to proceed without organization
      await user.click(screen.getByTestId('next-step-button'))
      
      expect(screen.getByText('Please enter your organization')).toBeInTheDocument()
    })

    it('should validate role selection', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      // Complete step 1
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('next-step-button'))
      
      // Fill organization but not role
      await user.type(screen.getByTestId('organization-input'), 'Test Org')
      await user.click(screen.getByTestId('next-step-button'))
      
      expect(screen.getByText('Please select your role')).toBeInTheDocument()
    })

    it('should highlight selected role', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      // Navigate to step 2
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('next-step-button'))
      
      const instructorButton = screen.getByTestId('role-instructor')
      await user.click(instructorButton)
      
      expect(instructorButton).toHaveClass('border-[#7C3AED]')
    })
  })

  describe('Step 3 Use Case Selection', () => {
    const navigateToStep3 = async (user: any) => {
      // Complete step 1
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('next-step-button'))
      
      // Complete step 2
      await user.type(screen.getByTestId('organization-input'), 'Test Org')
      await user.click(screen.getByTestId('role-instructor'))
      await user.click(screen.getByTestId('next-step-button'))
    }

    it('should display use case options on step 3', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      await navigateToStep3(user)
      
      expect(screen.getByText('How will you use AI Course Creator?')).toBeInTheDocument()
      expect(screen.getByTestId('usecase-corporate')).toBeInTheDocument()
      expect(screen.getByTestId('usecase-academic')).toBeInTheDocument()
      expect(screen.getByTestId('usecase-certification')).toBeInTheDocument()
      expect(screen.getByTestId('usecase-personal')).toBeInTheDocument()
    })

    it('should select use case and show checkmark', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      await navigateToStep3(user)
      
      const corporateOption = screen.getByTestId('usecase-corporate')
      await user.click(corporateOption)
      
      expect(corporateOption).toHaveClass('border-[#7C3AED]')
      // The checkmark should be visible within the selected option
    })

    it('should show welcome tutorial info', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      await navigateToStep3(user)
      
      expect(screen.getByText('Welcome Tutorial')).toBeInTheDocument()
      expect(screen.getByText(/guided tour of AI Course Creator/)).toBeInTheDocument()
    })
  })

  describe('Registration Submission', () => {
    it('should successfully register with all valid data', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      // Mock successful registration
      server.use(
        http.post('http://localhost:3001/api/auth/register', async () => {
          return HttpResponse.json({
            user: { id: '2', name: 'John Doe', email: 'john@example.com' },
            token: 'mock-jwt-token',
          }, { status: 201 })
        })
      )
      
      // Complete all steps
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('next-step-button'))
      
      await user.type(screen.getByTestId('organization-input'), 'Test Org')
      await user.click(screen.getByTestId('role-instructor'))
      await user.click(screen.getByTestId('next-step-button'))
      
      await user.click(screen.getByTestId('usecase-corporate'))
      await user.click(screen.getByTestId('complete-registration-button'))
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(
          { id: '2', name: 'John Doe', email: 'john@example.com' },
          'mock-jwt-token'
        )
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should show error message on registration failure', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      // Mock failed registration
      server.use(
        http.post('http://localhost:3001/api/auth/register', async () => {
          return HttpResponse.json({
            message: 'Email already exists'
          }, { status: 400 })
        })
      )
      
      // Complete all steps
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('next-step-button'))
      
      await user.type(screen.getByTestId('organization-input'), 'Test Org')
      await user.click(screen.getByTestId('role-instructor'))
      await user.click(screen.getByTestId('next-step-button'))
      
      await user.click(screen.getByTestId('usecase-corporate'))
      await user.click(screen.getByTestId('complete-registration-button'))
      
      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument()
        expect(mockLogin).not.toHaveBeenCalled()
      })
    })

    it('should show loading state during registration', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      // Mock delayed registration response
      server.use(
        http.post('http://localhost:3001/api/auth/register', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return HttpResponse.json({
            user: { id: '2', name: 'John Doe', email: 'john@example.com' },
            token: 'mock-jwt-token',
          }, { status: 201 })
        })
      )
      
      // Complete all steps quickly
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('next-step-button'))
      
      await user.type(screen.getByTestId('organization-input'), 'Test Org')
      await user.click(screen.getByTestId('role-instructor'))
      await user.click(screen.getByTestId('next-step-button'))
      
      await user.click(screen.getByTestId('usecase-corporate'))
      
      const completeButton = screen.getByTestId('complete-registration-button')
      await user.click(completeButton)
      
      expect(completeButton).toBeDisabled()
      expect(screen.getByText('Creating Account...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(completeButton).not.toBeDisabled()
      })
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should render mobile-optimized step indicator', () => {
      render(<RegisterPage />)
      
      expect(screen.getByTestId('mobile-step-indicator')).toBeInTheDocument()
    })

    it('should show mobile-friendly navigation button', () => {
      render(<RegisterPage />)
      
      expect(screen.getByTestId('mobile-next-button')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should clear errors when correcting input', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      // Trigger error
      await user.click(screen.getByTestId('next-step-button'))
      expect(screen.getByText('Please enter your full name')).toBeInTheDocument()
      
      // Fix the error
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      
      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Please enter your full name')).not.toBeInTheDocument()
      })
    })

    it('should handle network errors gracefully', async () => {
      const user = createUserEvent()
      render(<RegisterPage />)
      
      // Mock network error
      server.use(
        http.post('http://localhost:3001/api/auth/register', async () => {
          return HttpResponse.error()
        })
      )
      
      // Complete all steps
      await user.type(screen.getByTestId('name-input'), 'John Doe')
      await user.type(screen.getByTestId('email-input'), 'john@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('next-step-button'))
      
      await user.type(screen.getByTestId('organization-input'), 'Test Org')
      await user.click(screen.getByTestId('role-instructor'))
      await user.click(screen.getByTestId('next-step-button'))
      
      await user.click(screen.getByTestId('usecase-corporate'))
      await user.click(screen.getByTestId('complete-registration-button'))
      
      await waitFor(() => {
        expect(screen.getByText(/error occurred during registration/)).toBeInTheDocument()
      })
    })
  })
})