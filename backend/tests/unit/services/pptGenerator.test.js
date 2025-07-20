/**
 * @jest-environment node
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Mock dependencies
jest.mock('pptxgenjs', () => {
  return class MockPPTXGen {
    constructor() {
      this.slides = [];
      this.title = '';
      this.subject = '';
      this.author = '';
      this.layout = '';
      this.rtlMode = false;
    }
    
    addSlide() {
      const slide = {
        background: null,
        texts: [],
        addText: function(text, options) {
          this.texts.push({ text, options });
        }
      };
      this.slides.push(slide);
      return slide;
    }
    
    async writeFile(options) {
      // Simulate file creation
      const filePath = options.fileName;
      const mockFs = require('fs').promises;
      await mockFs.writeFile(filePath, 'mock pptx content');
      return filePath;
    }
    
    defineSlideMaster() {
      return {};
    }
  };
});

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../../src/config/database', () => ({
  supabaseAdmin: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.pptx' } })
      })
    }
  }
}));

jest.mock('../../../src/utils/errors', () => ({
  ValidationError: class ValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ValidationError';
    }
  },
  FileProcessingError: class FileProcessingError extends Error {
    constructor(message) {
      super(message);
      this.name = 'FileProcessingError';
    }
  }
}));

jest.mock('../../../src/utils/async', () => ({
  withRetry: jest.fn().mockImplementation(async (fn) => fn())
}));

// Mock fs.mkdir to prevent actual directory creation
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock file content')),
    stat: jest.fn().mockResolvedValue({ size: 1024 }),
    unlink: jest.fn().mockResolvedValue(undefined)
  }
}));

// Import the service after mocking
const PPTGenerator = require('../../../src/services/pptGenerator');

describe('PPTGenerator Service', () => {
  let pptGenerator;
  let mockCourse;

  beforeEach(() => {
    pptGenerator = new PPTGenerator();
    
    // Mock course data
    mockCourse = {
      id: uuidv4(),
      title: 'Test Course',
      description: 'A comprehensive test course',
      instructor: 'Test Instructor',
      objectives: ['Learn testing', 'Master PowerPoint generation'],
      sessions: [
        {
          id: uuidv4(),
          title: 'Introduction to Testing',
          description: 'Basic testing concepts',
          content: JSON.stringify({
            content: 'This session covers testing fundamentals',
            objectives: ['Understand testing', 'Write test cases'],
            keyPoints: ['Testing is important', 'Always test your code']
          }),
          estimated_duration: 60,
          activities: [
            {
              id: uuidv4(),
              title: 'Hands-on Exercise',
              description: 'Practice writing tests',
              content: JSON.stringify({
                instructions: 'Write a simple test case',
                questions: [
                  {
                    question: 'What is unit testing?',
                    options: ['Testing individual units', 'Testing the whole system']
                  }
                ]
              }),
              estimated_duration: 30
            }
          ],
          assessments: [
            {
              id: uuidv4(),
              question: 'What is the purpose of testing?',
              type: 'multiple_choice'
            }
          ]
        },
        {
          id: uuidv4(),
          title: 'Advanced Testing',
          description: 'Advanced testing techniques',
          content: 'This session covers advanced testing concepts',
          estimated_duration: 90,
          activities: [
            {
              id: uuidv4(),
              title: 'Integration Testing',
              description: 'Learn integration testing',
              content: 'Integration testing content',
              estimated_duration: 45
            }
          ]
        }
      ]
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct default options', () => {
      expect(pptGenerator.defaultOptions).toEqual({
        title: 'AI Course Creator',
        subject: 'Generated Course Material',
        author: 'AI Course Creator',
        layout: 'LAYOUT_16x9',
        rtlMode: false
      });
    });

    it('should have slide templates defined', () => {
      expect(pptGenerator.slideTemplates).toHaveProperty('title');
      expect(pptGenerator.slideTemplates).toHaveProperty('content');
      expect(pptGenerator.slideTemplates).toHaveProperty('section');
      expect(pptGenerator.slideTemplates).toHaveProperty('activity');
    });

    it('should initialize output directory', () => {
      expect(pptGenerator.outputPath).toContain('temp/ppts');
    });
  });

  describe('generatePowerPoint', () => {
    it('should generate a PowerPoint presentation successfully', async () => {
      const template = 'modern';
      const options = {
        includeTOC: true,
        includeSummary: true,
        branding: {
          organizationName: 'Test Organization'
        }
      };

      const result = await pptGenerator.generatePowerPoint(mockCourse, template, options);

      expect(result).toHaveProperty('pptId');
      expect(result).toHaveProperty('pptPath');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('slideCount');
      expect(result.pptPath).toContain('.pptx');
    });

    it('should handle course with no sessions', async () => {
      const courseWithoutSessions = {
        ...mockCourse,
        sessions: []
      };

      const result = await pptGenerator.generatePowerPoint(courseWithoutSessions, 'modern');

      expect(result).toHaveProperty('pptId');
      expect(result).toHaveProperty('pptPath');
    });

    it('should apply custom branding options', async () => {
      const options = {
        branding: {
          colorScheme: {
            primary: '#ff0000',
            secondary: '#00ff00'
          },
          fontFamily: 'Arial'
        }
      };

      const result = await pptGenerator.generatePowerPoint(mockCourse, 'modern', options);

      expect(result).toHaveProperty('pptId');
      expect(result).toHaveProperty('pptPath');
    });

    it('should upload to storage when requested', async () => {
      const options = {
        uploadToStorage: true
      };

      const result = await pptGenerator.generatePowerPoint(mockCourse, 'modern', options);

      expect(result).toHaveProperty('storageUrl');
      expect(result.storageUrl).toBe('https://example.com/test.pptx');
    });

    it('should handle file write errors gracefully', async () => {
      // Mock fs.writeFile to throw an error
      const fs = require('fs');
      const originalWriteFile = fs.promises.writeFile;
      fs.promises.writeFile = jest.fn().mockRejectedValue(new Error('File write failed'));

      try {
        await expect(pptGenerator.generatePowerPoint(mockCourse, 'modern')).rejects.toThrow('PowerPoint generation failed');
      } finally {
        // Restore original function
        fs.promises.writeFile = originalWriteFile;
      }
    });
  });

  describe('generateSlides', () => {
    it('should generate all slide types', async () => {
      const pptxgen = require('pptxgenjs');
      const ppt = new pptxgen();
      
      await pptGenerator.generateSlides(ppt, mockCourse, 'modern', {
        includeTOC: true,
        includeSummary: true
      });

      // Should have generated multiple slides
      expect(ppt.slides.length).toBeGreaterThan(0);
    });

    it('should skip TOC when includeTOC is false', async () => {
      const pptxgen = require('pptxgenjs');
      const ppt = new pptxgen();
      
      await pptGenerator.generateSlides(ppt, mockCourse, 'modern', {
        includeTOC: false
      });

      // Should still have slides, just not TOC
      expect(ppt.slides.length).toBeGreaterThan(0);
    });

    it('should skip summary when includeSummary is false', async () => {
      const pptxgen = require('pptxgenjs');
      const ppt = new pptxgen();
      
      await pptGenerator.generateSlides(ppt, mockCourse, 'modern', {
        includeSummary: false
      });

      expect(ppt.slides.length).toBeGreaterThan(0);
    });
  });

  describe('createTitleSlide', () => {
    it('should create a title slide with course information', async () => {
      const pptxgen = require('pptxgenjs');
      const ppt = new pptxgen();
      
      await pptGenerator.createTitleSlide(ppt, mockCourse, 'modern');

      expect(ppt.slides.length).toBe(1);
      const slide = ppt.slides[0];
      expect(slide.texts.length).toBeGreaterThan(0);
      expect(slide.texts[0].text).toBe(mockCourse.title);
    });

    it('should handle course without description', async () => {
      const courseWithoutDescription = {
        ...mockCourse,
        description: null
      };

      const pptxgen = require('pptxgenjs');
      const ppt = new pptxgen();
      
      await pptGenerator.createTitleSlide(ppt, courseWithoutDescription, 'modern');

      expect(ppt.slides.length).toBe(1);
    });
  });

  describe('createSessionSlides', () => {
    it('should create slides for a session with activities', async () => {
      const pptxgen = require('pptxgenjs');
      const ppt = new pptxgen();
      
      await pptGenerator.createSessionSlides(ppt, mockCourse.sessions[0], 1, 'modern', {});

      expect(ppt.slides.length).toBeGreaterThan(0);
    });

    it('should handle session without activities', async () => {
      const sessionWithoutActivities = {
        ...mockCourse.sessions[0],
        activities: []
      };

      const pptxgen = require('pptxgenjs');
      const ppt = new pptxgen();
      
      await pptGenerator.createSessionSlides(ppt, sessionWithoutActivities, 1, 'modern', {});

      expect(ppt.slides.length).toBeGreaterThan(0);
    });
  });

  describe('processContentForSlide', () => {
    it('should process JSON content correctly', () => {
      const jsonContent = JSON.stringify({
        content: 'Test content',
        keyPoints: ['Point 1', 'Point 2'],
        objectives: ['Objective 1', 'Objective 2']
      });

      const result = pptGenerator.processContentForSlide(jsonContent);

      expect(result).toContain('Test content');
      expect(result).toContain('Key Points:');
      expect(result).toContain('Point 1');
      expect(result).toContain('Point 2');
      expect(result).toContain('Objectives:');
      expect(result).toContain('Objective 1');
      expect(result).toContain('Objective 2');
    });

    it('should process plain text content', () => {
      const plainText = 'This is plain text content';

      const result = pptGenerator.processContentForSlide(plainText);

      expect(result).toBe(plainText);
    });

    it('should handle empty content', () => {
      const result = pptGenerator.processContentForSlide('');

      expect(result).toBe('');
    });

    it('should handle null content', () => {
      const result = pptGenerator.processContentForSlide(null);

      expect(result).toBe('');
    });
  });

  describe('processActivityContent', () => {
    it('should process activity content with instructions and questions', () => {
      const activity = {
        content: JSON.stringify({
          instructions: 'Follow these steps',
          questions: [
            { question: 'What is testing?' },
            { question: 'Why is it important?' }
          ],
          steps: ['Step 1', 'Step 2']
        })
      };

      const result = pptGenerator.processActivityContent(activity);

      expect(result).toContain('Instructions:');
      expect(result).toContain('Follow these steps');
      expect(result).toContain('Questions:');
      expect(result).toContain('What is testing?');
      expect(result).toContain('Why is it important?');
      expect(result).toContain('Steps:');
      expect(result).toContain('Step 1');
      expect(result).toContain('Step 2');
    });

    it('should handle activity without content', () => {
      const activity = {};

      const result = pptGenerator.processActivityContent(activity);

      expect(result).toBe('');
    });
  });

  describe('cleanText', () => {
    it('should remove markdown formatting', () => {
      const markdownText = '**Bold text** and *italic text* and `code text`';

      const result = pptGenerator.cleanText(markdownText);

      expect(result).toBe('Bold text and italic text and code text');
    });

    it('should normalize line breaks', () => {
      const textWithMultipleBreaks = 'Line 1\n\n\n\nLine 2';

      const result = pptGenerator.cleanText(textWithMultipleBreaks);

      expect(result).toBe('Line 1\n\nLine 2');
    });

    it('should handle empty text', () => {
      const result = pptGenerator.cleanText('');

      expect(result).toBe('');
    });

    it('should handle null text', () => {
      const result = pptGenerator.cleanText(null);

      expect(result).toBe('');
    });
  });

  describe('applyBranding', () => {
    it('should apply branding options', async () => {
      const pptxgen = require('pptxgenjs');
      const ppt = new pptxgen();
      
      const branding = {
        colorScheme: {
          primary: '#ff0000',
          secondary: '#00ff00'
        },
        fontFamily: 'Arial',
        logo: 'https://example.com/logo.png'
      };

      await pptGenerator.applyBranding(ppt, 'modern', branding);

      expect(pptGenerator.brandingLogo).toBe(branding.logo);
      expect(pptGenerator.defaultFontFamily).toBe(branding.fontFamily);
    });

    it('should handle empty branding options', async () => {
      const pptxgen = require('pptxgenjs');
      const ppt = new pptxgen();
      
      await pptGenerator.applyBranding(ppt, 'modern', {});

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('updateColorScheme', () => {
    it('should update slide template colors', () => {
      const colorScheme = {
        primary: '#ff0000',
        secondary: '#00ff00',
        background: '#ffffff'
      };

      pptGenerator.updateColorScheme(colorScheme);

      expect(pptGenerator.slideTemplates.section.background.fill).toBe('ff0000');
      expect(pptGenerator.slideTemplates.activity.accentColor).toBe('00ff00');
      expect(pptGenerator.slideTemplates.content.background.fill).toBe('ffffff');
    });

    it('should handle color scheme with hash prefix', () => {
      const colorScheme = {
        primary: '#ff0000'
      };

      pptGenerator.updateColorScheme(colorScheme);

      expect(pptGenerator.slideTemplates.section.background.fill).toBe('ff0000');
    });
  });

  describe('calculateTotalDuration', () => {
    it('should calculate total duration for sessions', () => {
      const total = pptGenerator.calculateTotalDuration(mockCourse.sessions);

      expect(total).toBe(150); // 60 + 90
    });

    it('should handle null sessions', () => {
      const total = pptGenerator.calculateTotalDuration(null);

      expect(total).toBe(0);
    });

    it('should handle sessions without duration', () => {
      const sessions = [
        { title: 'Session 1' },
        { title: 'Session 2' }
      ];

      const total = pptGenerator.calculateTotalDuration(sessions);

      expect(total).toBe(0);
    });
  });

  describe('calculateTotalActivities', () => {
    it('should calculate total number of activities', () => {
      const total = pptGenerator.calculateTotalActivities(mockCourse.sessions);

      expect(total).toBe(2); // 1 + 1
    });

    it('should handle null sessions', () => {
      const total = pptGenerator.calculateTotalActivities(null);

      expect(total).toBe(0);
    });

    it('should handle sessions without activities', () => {
      const sessions = [
        { title: 'Session 1' },
        { title: 'Session 2' }
      ];

      const total = pptGenerator.calculateTotalActivities(sessions);

      expect(total).toBe(0);
    });
  });

  describe('getFileSize', () => {
    it('should return file size', async () => {
      const size = await pptGenerator.getFileSize('/mock/path/file.pptx');

      expect(size).toBe(1024);
    });

    it('should return 0 for non-existent file', async () => {
      // Mock fs.stat to throw error
      const fs = require('fs');
      fs.promises.stat.mockRejectedValueOnce(new Error('File not found'));

      const size = await pptGenerator.getFileSize('/non/existent/file.pptx');

      expect(size).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should clean up temporary files', async () => {
      const pptId = 'test-ppt-id';

      await pptGenerator.cleanup(pptId);

      const fs = require('fs');
      expect(fs.promises.unlink).toHaveBeenCalledWith(expect.stringContaining(`${pptId}.pptx`));
    });

    it('should handle cleanup errors gracefully', async () => {
      // Mock fs.unlink to throw error
      const fs = require('fs');
      fs.promises.unlink.mockRejectedValueOnce(new Error('Cleanup failed'));

      const pptId = 'test-ppt-id';

      await expect(pptGenerator.cleanup(pptId)).resolves.not.toThrow();
    });
  });

  describe('uploadToSupabase', () => {
    it('should upload PowerPoint to Supabase storage', async () => {
      const mockPptPath = '/mock/path/test.pptx';
      const mockCourseId = 'test-course-id';
      const mockPptId = 'test-ppt-id';

      const result = await pptGenerator.uploadToSupabase(mockPptPath, mockCourseId, mockPptId);

      expect(result).toBe('https://example.com/test.pptx');
    });

    it('should handle upload errors', async () => {
      // Mock supabase to return error
      const { supabaseAdmin } = require('../../../src/config/database');
      supabaseAdmin.storage.from.mockReturnValueOnce({
        upload: jest.fn().mockResolvedValue({ data: null, error: new Error('Upload failed') })
      });

      const mockPptPath = '/mock/path/test.pptx';
      const mockCourseId = 'test-course-id';
      const mockPptId = 'test-ppt-id';

      await expect(pptGenerator.uploadToSupabase(mockPptPath, mockCourseId, mockPptId))
        .rejects.toThrow('Supabase upload failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing course data gracefully', async () => {
      const emptyCourse = {
        id: 'test-id',
        title: 'Test Course'
      };

      const result = await pptGenerator.generatePowerPoint(emptyCourse, 'modern');

      expect(result).toHaveProperty('pptId');
      expect(result).toHaveProperty('pptPath');
    });

    it('should handle invalid JSON content', () => {
      const invalidJson = 'invalid json content';

      const result = pptGenerator.processContentForSlide(invalidJson);

      expect(result).toBe(invalidJson);
    });

    it('should handle different template types', async () => {
      const templates = ['modern', 'classic', 'minimal', 'interactive', 'professional'];

      for (const template of templates) {
        const result = await pptGenerator.generatePowerPoint(mockCourse, template);
        expect(result).toHaveProperty('pptId');
        expect(result).toHaveProperty('pptPath');
      }
    });
  });
});