import React from 'react'
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, waitFor, createUserEvent } from '@/__tests__/utils/test-utils'
import { server } from '@/__tests__/utils/api-mocks'
import { http, HttpResponse } from 'msw'
import ForgotPasswordPage from '../forgot-password/page'

describe('Forgot Password Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('Rendering', () => {
    it('should render the forgot password form', () => {
      render(<ForgotPasswordPage />)
      
      expect(screen.getByText('Forgot Your Password?')).toBeInTheDocument()
      expect(screen.getByText("No worries! Enter your email and we'll send you a reset link.")).toBeInTheDocument()
      expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument()
    })

    it('should render email input field', () => {
      render(<ForgotPasswordPage />)
      
      const emailInput = screen.getByTestId('email-input')
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    })

    it('should render submit button', () => {
      render(<ForgotPasswordPage />)
      
      const submitButton = screen.getByTestId('send-reset-button')
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveTextContent('Send Reset Link')
    })

    it('should render back to login link', () => {
      render(<ForgotPasswordPage />)
      
      const backLink = screen.getByText('Back to Sign In')
      expect(backLink).toBeInTheDocument()
      expect(backLink.closest('a')).toHaveAttribute('href', '/login')
    })

    it('should render sign up link', () => {
      render(<ForgotPasswordPage />)
      
      expect(screen.getByText("Don't have an account?")).toBeInTheDocument()
      const signUpLink = screen.getByText('Sign up here')
      expect(signUpLink).toBeInTheDocument()
      expect(signUpLink).toHaveAttribute('href', '/register')
    })

    it('should render app branding', () => {
      render(<ForgotPasswordPage />)
      
      expect(screen.getByText('AI Course Creator')).toBeInTheDocument()
    })

    it('should render help text under email input', () => {
      render(<ForgotPasswordPage />)
      
      expect(screen.getByText("We'll send a password reset link to this email")).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should successfully send reset link', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      server.use(
        http.post('http://localhost:3001/auth/forgot-password', async () => {
          return HttpResponse.json({
            message: 'Password reset instructions sent to your email'
          }, { status: 200 })
        })
      )
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.click(screen.getByTestId('send-reset-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument()
        expect(screen.getByText('Check Your Email')).toBeInTheDocument()
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })
    })

    it('should show loading state during submission', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      server.use(
        http.post('http://localhost:3001/auth/forgot-password', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return HttpResponse.json({
            message: 'Password reset instructions sent'
          }, { status: 200 })
        })
      )
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      
      const submitButton = screen.getByTestId('send-reset-button')
      await user.click(submitButton)
      
      expect(submitButton).toBeDisabled()
      expect(screen.getByText('Sending Reset Link...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('should show error message on failure', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      server.use(
        http.post('http://localhost:3001/auth/forgot-password', async () => {
          return HttpResponse.json({
            message: 'Email not found'
          }, { status: 404 })
        })
      )
      
      await user.type(screen.getByTestId('email-input'), 'notfound@example.com')
      await user.click(screen.getByTestId('send-reset-button'))
      
      await waitFor(() => {
        expect(screen.getByText('Email not found')).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      server.use(
        http.post('http://localhost:3001/auth/forgot-password', async () => {
          return HttpResponse.error()
        })
      )
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.click(screen.getByTestId('send-reset-button'))
      
      await waitFor(() => {
        expect(screen.getByText(/An error occurred/)).toBeInTheDocument()
      })
    })

    it('should validate email format', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      const emailInput = screen.getByTestId('email-input') as HTMLInputElement
      const submitButton = screen.getByTestId('send-reset-button')
      
      // Try with invalid email
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      // Browser validation should prevent submission
      expect(emailInput).toBeInvalid()
    })

    it('should require email field', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      const submitButton = screen.getByTestId('send-reset-button')
      await user.click(submitButton)
      
      const emailInput = screen.getByTestId('email-input') as HTMLInputElement
      expect(emailInput).toBeInvalid()
      expect(emailInput).toBeRequired()
    })
  })

  describe('Success State', () => {
    it('should show success message with email', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      server.use(
        http.post('http://localhost:3001/auth/forgot-password', async () => {
          return HttpResponse.json({
            message: 'Success'
          }, { status: 200 })
        })
      )
      
      const testEmail = 'user@example.com'
      await user.type(screen.getByTestId('email-input'), testEmail)
      await user.click(screen.getByTestId('send-reset-button'))
      
      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument()
        expect(screen.getByText(testEmail)).toBeInTheDocument()
        expect(screen.getByText(/We've sent a password reset link/)).toBeInTheDocument()
      })
    })

    it('should show back to login button in success state', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      server.use(
        http.post('http://localhost:3001/auth/forgot-password', async () => {
          return HttpResponse.json({ message: 'Success' }, { status: 200 })
        })
      )
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.click(screen.getByTestId('send-reset-button'))
      
      await waitFor(() => {
        const backButton = screen.getByRole('link', { name: /Back to Sign In/i })
        expect(backButton).toBeInTheDocument()
        expect(backButton).toHaveAttribute('href', '/login')
      })
    })

    it('should allow user to try again from success state', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      server.use(
        http.post('http://localhost:3001/auth/forgot-password', async () => {
          return HttpResponse.json({ message: 'Success' }, { status: 200 })
        })
      )
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.click(screen.getByTestId('send-reset-button'))
      
      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument()
      })
      
      // Click try again
      await user.click(screen.getByText('try again'))
      
      // Should be back to form
      expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument()
      expect(screen.queryByText('Check Your Email')).not.toBeInTheDocument()
    })

    it('should show spam folder reminder', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      server.use(
        http.post('http://localhost:3001/auth/forgot-password', async () => {
          return HttpResponse.json({ message: 'Success' }, { status: 200 })
        })
      )
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.click(screen.getByTestId('send-reset-button'))
      
      await waitFor(() => {
        expect(screen.getByText(/Check your spam folder/)).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    it('should update email input value', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      const emailInput = screen.getByTestId('email-input') as HTMLInputElement
      const testEmail = 'test@example.com'
      
      await user.type(emailInput, testEmail)
      
      expect(emailInput.value).toBe(testEmail)
    })

    it('should clear form on successful submission', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      server.use(
        http.post('http://localhost:3001/auth/forgot-password', async () => {
          return HttpResponse.json({ message: 'Success' }, { status: 200 })
        })
      )
      
      const emailInput = screen.getByTestId('email-input') as HTMLInputElement
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByTestId('send-reset-button'))
      
      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument()
      })
      
      // Go back to form
      await user.click(screen.getByText('try again'))
      
      // Email input should be cleared
      expect(screen.getByTestId('email-input')).toHaveValue('')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ForgotPasswordPage />)
      
      const emailInput = screen.getByLabelText('Email Address')
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('id', 'email')
      expect(emailInput).toHaveAttribute('name', 'email')
    })

    it('should be keyboard navigable', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      // Tab to email input
      await user.tab()
      expect(screen.getByTestId('email-input')).toHaveFocus()
      
      // Tab to submit button
      await user.tab()
      expect(screen.getByTestId('send-reset-button')).toHaveFocus()
      
      // Tab to back link
      await user.tab()
      expect(screen.getByText('Back to Sign In')).toHaveFocus()
    })

    it('should support form submission with Enter key', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      server.use(
        http.post('http://localhost:3001/auth/forgot-password', async () => {
          return HttpResponse.json({ message: 'Success' }, { status: 200 })
        })
      )
      
      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')
      await user.keyboard('[Enter]')
      
      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument()
      })
    })
  })

  describe('Visual Elements', () => {
    it('should show mail icon in email input', () => {
      render(<ForgotPasswordPage />)
      
      const emailInputContainer = screen.getByTestId('email-input').parentElement
      const mailIcon = emailInputContainer?.querySelector('svg')
      expect(mailIcon).toBeInTheDocument()
    })

    it('should show success icon in success state', async () => {
      const user = createUserEvent()
      render(<ForgotPasswordPage />)
      
      server.use(
        http.post('http://localhost:3001/auth/forgot-password', async () => {
          return HttpResponse.json({ message: 'Success' }, { status: 200 })
        })
      )
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.click(screen.getByTestId('send-reset-button'))
      
      await waitFor(() => {
        // Look for CheckCircle icon in success message
        const successMessage = screen.getByTestId('success-message')
        const successIcon = successMessage.querySelector('svg')
        expect(successIcon).toBeInTheDocument()
      })
    })
  })
})