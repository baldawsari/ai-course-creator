const {
  validateFile,
  validateCourseConfig,
  validateURL,
  validateContentQuality,
  validateEmail,
  validatePassword,
} = require('../../../src/utils/validators');
const { mockData } = require('../../utils/mockData');

describe('Validation Utilities', () => {
  describe('validateFile', () => {
    it('should validate allowed file types', () => {
      const validFiles = [
        { mimetype: 'application/pdf', size: 1024 * 1024, originalname: 'test.pdf' },
        { mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 512 * 1024, originalname: 'test.docx' },
        { mimetype: 'text/plain', size: 100 * 1024, originalname: 'test.txt' },
      ];

      validFiles.forEach(file => {
        const result = validateFile(file);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid file types', () => {
      const invalidFiles = [
        { mimetype: 'application/x-executable', size: 1024, originalname: 'test.exe' },
        { mimetype: 'image/jpeg', size: 1024, originalname: 'test.jpg' },
        { mimetype: 'video/mp4', size: 1024, originalname: 'test.mp4' },
      ];

      invalidFiles.forEach(file => {
        const result = validateFile(file);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should enforce file size limits', () => {
      const oversizedFile = {
        mimetype: 'application/pdf',
        size: 100 * 1024 * 1024, // 100MB
        originalname: 'large.pdf',
      };

      const result = validateFile(oversizedFile);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('large') || error.includes('size'))).toBe(true);
    });

    it('should validate file structure', () => {
      const result1 = validateFile({});
      expect(result1.valid).toBe(false);
      
      const result2 = validateFile({ 
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
        size: 1024
      });
      expect(result2.valid).toBe(true);
      
      const result3 = validateFile({ 
        size: 1024,
        originalname: 'test.pdf'
      });
      expect(result3.valid).toBe(false);
    });
  });

  describe('validateCourseConfig', () => {
    it('should validate correct course configuration', () => {
      const validConfigs = [
        { 
          title: 'Introduction to Programming',
          description: 'Learn the basics of programming',
          level: 'beginner', 
          duration: 40,
          modules: 5 
        },
        { 
          title: 'Advanced JavaScript',
          description: 'Master advanced JavaScript concepts',
          level: 'intermediate', 
          duration: 80,
          modules: 8 
        },
      ];

      validConfigs.forEach(config => {
        const result = validateCourseConfig(config);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid difficulty levels', () => {
      const invalidConfig = {
        level: 'master',  // Invalid level
        duration: 10,
        sessionCount: 5,
      };

      const result = validateCourseConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid course level. Must be one of: beginner, intermediate, advanced, expert');
    });

    it('should validate duration format', () => {
      const invalidDurations = [
        { level: 'beginner', duration: 'two weeks', sessionCount: 5 },
        { level: 'beginner', duration: 0, sessionCount: 5 },
        { level: 'beginner', duration: 300, sessionCount: 5 },
      ];

      invalidDurations.forEach(config => {
        const result = validateCourseConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should validate module count', () => {
      const invalidModules = [
        { level: 'beginner', duration: 10, sessionCount: 0 },
        { level: 'beginner', duration: 10, sessionCount: 60 },
        { level: 'beginner', duration: 10, sessionCount: -1 },
      ];

      invalidModules.forEach(config => {
        const result = validateCourseConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateURL', () => {
    it('should validate correct URLs', () => {
      const validURLs = [
        'https://example.com',
        'https://sub.domain.com/path',
        'https://example.com/path?query=value',
      ];

      validURLs.forEach(url => {
        const result = validateURL(url);
        expect(result.valid).toBe(true);
      });

      // Test localhost with allowPrivate option
      const localhostResult = validateURL('http://localhost:3000', { allowPrivate: true });
      expect(localhostResult.valid).toBe(true);
    });

    it('should reject invalid URLs', () => {
      const invalidURLs = [
        'not-a-url',
        'ftp://example.com',
        'javascript:alert(1)',
        '../../../etc/passwd',
        '',
        null,
      ];

      invalidURLs.forEach(url => {
        const result = validateURL(url);
        expect(result.valid).toBe(false);
      });
    });

    it('should validate URL with specific protocols', () => {
      const result1 = validateURL('https://example.com', { allowedProtocols: ['https:'] });
      expect(result1.valid).toBe(true);
      
      const result2 = validateURL('http://example.com', { allowedProtocols: ['https:'] });
      expect(result2.valid).toBe(false);
    });
  });

  describe('validateContentQuality', () => {
    it('should validate high quality content', () => {
      const result = validateContentQuality(90);
      expect(result.valid).toBe(true);
      expect(result.metadata.tier).toBe('premium');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate medium quality content', () => {
      const result = validateContentQuality(75);
      expect(result.valid).toBe(true);
      expect(result.metadata.tier).toBe('recommended');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject low quality content', () => {
      const result = validateContentQuality(35);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('below required minimum threshold');
      expect(result.warnings).toContain('Content quality is below minimum acceptable threshold');
    });

    it('should identify specific quality issues', () => {
      const result = validateContentQuality(63, {
        components: {
          readability: 45,
          coherence: 60,
          completeness: 70,
          formatting: 65
        }
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Low readability score - content may be difficult to understand');
    });

    it('should handle missing scores', () => {
      const result = validateContentQuality(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Quality score must be a number');
    });

    it('should validate score ranges', () => {
      const result1 = validateContentQuality(-10);
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('Quality score must be between 0 and 100');
      
      const result2 = validateContentQuality(150);
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('Quality score must be between 0 and 100');
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'user+tag@example.co.uk',
        'user123@subdomain.example.com',
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example',
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'Test123!@#',
        'P@ssw0rd123',
        'Secure$Pass123',
      ];

      strongPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.strength).toBe('strong');
      });
    });

    it('should identify weak passwords', () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        'Test',
      ];

      weakPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.issues).not.toEqual([]);
      });
    });

    it('should check password requirements', () => {
      const testCases = [
        { password: 'test', issue: 'length' },
        { password: 'testtest', issue: 'uppercase' },
        { password: 'TESTTEST', issue: 'lowercase' },
        { password: 'TestTest', issue: 'number' },
        { password: 'TestTest1', issue: 'special' },
      ];

      testCases.forEach(({ password, issue }) => {
        const result = validatePassword(password);
        expect(result.issues).toContain(issue);
      });
    });
  });
});