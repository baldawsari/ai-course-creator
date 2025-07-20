import { describe, it, expect } from '@jest/globals'
import {
  validateForm,
  validateFile,
  isValidUrl,
  isValidEmail,
  getPasswordStrength,
  validateContent,
  sanitizeHtml,
  loginSchema,
  courseConfigSchema,
  registerSchema,
} from '../validation'

describe('validation utilities', () => {
  describe('validateForm', () => {
    it('should validate successful form submission', () => {
      const validData = {
        email: 'test@example.com',
        password: 'strongpassword123',
        rememberMe: true,
      }

      const result = validateForm(loginSchema, validData)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
      expect(result.errors).toBeUndefined()
    })

    it('should return validation errors for invalid data', () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // too short
      }

      const result = validateForm(loginSchema, invalidData)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.email).toContain('Invalid email address')
      expect(result.errors?.password).toContain('Password must be at least 8 characters')
    })

    it('should validate course configuration', () => {
      const validCourse = {
        title: 'JavaScript Fundamentals',
        description: 'Learn the basics of JavaScript programming',
        difficulty: 'beginner' as const,
        estimatedDuration: 120,
        learningObjectives: ['Understand variables', 'Learn functions'],
        targetAudience: 'Software developers',
      }

      const result = validateForm(courseConfigSchema, validCourse)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validCourse)
    })

    it('should validate registration data', () => {
      const validRegistration = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePassword123',
        confirmPassword: 'SecurePassword123',
        organization: 'Tech Corp',
        role: 'educator' as const,
        useCase: 'corporate-training' as const,
        agreeToTerms: true,
      }

      const result = validateForm(registerSchema, validRegistration)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validRegistration)
    })

    it('should fail registration validation for mismatched passwords', () => {
      const invalidRegistration = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securepassword123',
        confirmPassword: 'differentpassword',
        organization: 'Tech Corp',
        role: 'educator' as const,
        useCase: 'corporate-training' as const,
        agreeToTerms: true,
      }

      const result = validateForm(registerSchema, invalidRegistration)
      
      expect(result.success).toBe(false)
      expect(result.errors?.confirmPassword).toContain('Passwords must match')
    })
  })

  describe('validateFile', () => {
    const createMockFile = (name: string, size: number, type: string) => {
      // Create minimal content but set size property for testing
      const content = 'test content'
      const file = new File([content], name, { type, lastModified: Date.now() })
      // Override size property to match requested size for test
      Object.defineProperty(file, 'size', { value: size, writable: false, configurable: true })
      return file
    }

    it('should validate a valid PDF file', () => {
      const file = createMockFile('document.pdf', 1024 * 1024, 'application/pdf')
      
      const result = validateFile(file)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject files that are too large', () => {
      const file = createMockFile('large.pdf', 100 * 1024 * 1024, 'application/pdf') // 100MB
      
      const result = validateFile(file, { maxSize: 50 * 1024 * 1024 })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('File size exceeds maximum allowed size (50MB)')
    })

    it('should reject unsupported file types', () => {
      const file = createMockFile('script.exe', 1024, 'application/octet-stream')
      
      const result = validateFile(file, {
        allowedTypes: ['application/pdf', 'text/plain'],
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('File type not supported')
    })

    it('should reject files with malicious extensions', () => {
      const file = createMockFile('document.pdf.exe', 1024, 'application/pdf')
      
      const result = validateFile(file, { checkMaliciousExtensions: true })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Potentially malicious file extension detected')
    })

    it('should validate file names with special characters', () => {
      const file = createMockFile('my document (v2).pdf', 1024, 'application/pdf')
      
      const result = validateFile(file)
      
      expect(result.valid).toBe(true)
      expect(result.sanitizedName).toBe('my_document_v2.pdf')
    })

    it('should reject empty files', () => {
      const file = createMockFile('empty.pdf', 0, 'application/pdf')
      
      const result = validateFile(file)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('File cannot be empty')
    })
  })

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://sub.example.com/path?query=value',
        'https://example.com:8080/path',
        'https://127.0.0.1:3000',
      ]

      validUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(true)
      })
    })

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com', // unsupported protocol
        'javascript:alert(1)', // malicious
        'file:///local/file', // local file
        '',
        'https://',
        'example.com', // missing protocol
      ]

      invalidUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(false)
      })
    })

    it('should validate URLs with custom options', () => {
      expect(isValidUrl('ftp://example.com', { allowedProtocols: ['http', 'https', 'ftp'] })).toBe(true)
      expect(isValidUrl('https://localhost', { allowLocalhost: true })).toBe(true)
      expect(isValidUrl('https://localhost', { allowLocalhost: false })).toBe(false)
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'admin@subdomain.example.com',
        '123@example.com',
      ]

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..double.dot@example.com',
        'user@.example.com',
        'user@example.',
        '',
        'user name@example.com', // space
      ]

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false)
      })
    })
  })

  describe('getPasswordStrength', () => {
    it('should return low strength for weak passwords', () => {
      const weakPasswords = ['123', 'password', 'abc123']
      
      weakPasswords.forEach(password => {
        const strength = getPasswordStrength(password)
        expect(strength.score).toBeLessThan(30)
        expect(strength.level).toBe('weak')
      })
    })

    it('should return medium strength for moderate passwords', () => {
      const moderatePasswords = ['Password123', 'mypassword1']
      
      moderatePasswords.forEach(password => {
        const strength = getPasswordStrength(password)
        expect(strength.score).toBeGreaterThanOrEqual(30)
        expect(strength.score).toBeLessThan(70)
        expect(strength.level).toBe('medium')
      })
    })

    it('should return high strength for strong passwords', () => {
      const strongPasswords = ['StrongP@ssw0rd!', 'MyV3ryStr0ng!P@ssw0rd']
      
      strongPasswords.forEach(password => {
        const strength = getPasswordStrength(password)
        expect(strength.score).toBeGreaterThanOrEqual(70)
        expect(strength.level).toBe('strong')
      })
    })

    it('should provide helpful feedback', () => {
      const weakPassword = '123'
      const strength = getPasswordStrength(weakPassword)
      
      expect(strength.feedback).toContain('Add uppercase letters')
      expect(strength.feedback).toContain('Add lowercase letters')
      expect(strength.feedback).toContain('Add special characters')
      expect(strength.feedback).toContain('Use at least 8 characters')
    })
  })

  describe('validateContent', () => {
    it('should validate clean content', () => {
      const content = 'This is a clean piece of content about JavaScript programming.'
      
      const result = validateContent(content)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect profanity', () => {
      const content = 'This content contains damn inappropriate language.'
      
      const result = validateContent(content, { checkProfanity: true })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Content contains potentially inappropriate language')
    })

    it('should validate content length', () => {
      const shortContent = 'Too short'
      const longContent = 'A'.repeat(10000)
      
      const shortResult = validateContent(shortContent, { minLength: 50 })
      const longResult = validateContent(longContent, { maxLength: 5000 })
      
      expect(shortResult.valid).toBe(false)
      expect(shortResult.errors).toContain('Content must be at least 50 characters')
      
      expect(longResult.valid).toBe(false)
      expect(longResult.errors).toContain('Content must not exceed 5000 characters')
    })

    it('should check for required words', () => {
      const content = 'This content talks about programming concepts.'
      
      const result = validateContent(content, { 
        requireWords: ['JavaScript', 'functions'] 
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Content must include: JavaScript, functions')
    })

    it('should check for forbidden words', () => {
      const content = 'This content mentions deprecated features and legacy code.'
      
      const result = validateContent(content, { 
        forbiddenWords: ['deprecated', 'legacy'] 
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Content contains forbidden words: deprecated, legacy')
    })
  })

  describe('sanitizeHtml', () => {
    it('should preserve safe HTML tags', () => {
      const html = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>'
      
      const sanitized = sanitizeHtml(html)
      
      expect(sanitized).toBe('<p>This is <strong>bold</strong> and <em>italic</em> text.</p>')
    })

    it('should remove dangerous HTML tags', () => {
      const dangerousHtml = '<p>Safe content</p><script>alert("xss")</script><iframe src="evil.com"></iframe>'
      
      const sanitized = sanitizeHtml(dangerousHtml)
      
      expect(sanitized).toBe('<p>Safe content</p>')
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('<iframe>')
    })

    it('should remove dangerous attributes', () => {
      const htmlWithEvents = '<p onclick="alert(1)">Click me</p><a href="javascript:alert(1)">Link</a>'
      
      const sanitized = sanitizeHtml(htmlWithEvents)
      
      expect(sanitized).not.toContain('onclick')
      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).toContain('<p>Click me</p>')
    })

    it('should preserve allowed attributes', () => {
      const html = '<a href="https://example.com" title="Example">Link</a>'
      
      const sanitized = sanitizeHtml(html)
      
      expect(sanitized).toContain('href="https://example.com"')
      expect(sanitized).toContain('title="Example"')
    })

    it('should handle malformed HTML gracefully', () => {
      const malformedHtml = '<p>Unclosed paragraph<div>Nested incorrectly</p></div>'
      
      const sanitized = sanitizeHtml(malformedHtml)
      
      // Should not throw and should return something reasonable
      expect(typeof sanitized).toBe('string')
      expect(sanitized.length).toBeGreaterThan(0)
    })
  })
})