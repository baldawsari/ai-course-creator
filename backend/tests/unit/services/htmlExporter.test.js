// Mock fs module first before any imports
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(),
    readFile: jest.fn(),
    writeFile: jest.fn().mockResolvedValue(),
    readdir: jest.fn().mockResolvedValue([]),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
    copyFile: jest.fn().mockResolvedValue(),
    rm: jest.fn().mockResolvedValue(),
    rmdir: jest.fn().mockResolvedValue(),
    unlink: jest.fn().mockResolvedValue(),
    access: jest.fn()
  },
  createWriteStream: jest.fn()
}));

jest.mock('handlebars');
jest.mock('archiver', () => {
  const mockArchive = {
    pipe: jest.fn(),
    directory: jest.fn(),
    finalize: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    pointer: jest.fn().mockReturnValue(1024)
  };
  return jest.fn(() => mockArchive);
});
jest.mock('uuid');

const HTMLExporter = require('../../../src/services/htmlExporter');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock error classes
jest.mock('../../../src/utils/errors', () => ({
  ValidationError: class ValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ValidationError';
    }
  },
  ProcessingError: class ProcessingError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ProcessingError';
    }
  }
}));

// Mock async utilities
jest.mock('../../../src/utils/async', () => ({
  withRetry: jest.fn((fn) => fn())
}));

// Mock supabase

jest.mock('../../../src/config/database', () => {
  // Need to define mockSupabaseChain inside the mock factory
  const chain = {
    from: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    in: jest.fn()
  };
  
  // Make chain methods return 'this' for chaining
  chain.from.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  
  // Store reference globally
  global.mockSupabaseChain = chain;
  
  return {
    supabaseAdmin: chain
  };
});

describe('HTMLExporter', () => {
  let htmlExporter;
  let mockArchive;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all fs mocks
    fs.mkdir.mockResolvedValue();
    fs.readFile.mockResolvedValue('<html>{{title}}</html>');
    fs.writeFile.mockResolvedValue();
    fs.readdir.mockResolvedValue([]);
    fs.stat.mockResolvedValue({ isDirectory: () => false });
    fs.copyFile.mockResolvedValue();
    fs.rmdir.mockResolvedValue();
    fs.unlink.mockResolvedValue();
    fs.access.mockResolvedValue();
    
    // Get mock archive instance
    mockArchive = archiver();
    
    // Mock handlebars
    handlebars.compile = jest.fn().mockReturnValue((data) => `<html>${JSON.stringify(data)}</html>`);
    handlebars.registerHelper = jest.fn();
    handlebars.SafeString = class {
      constructor(string) {
        this.string = string;
      }
      toString() {
        return this.string;
      }
    };
    
    // Mock uuid
    uuidv4.mockReturnValue('mock-uuid-123');
    
    htmlExporter = new HTMLExporter();
  });

  describe('constructor', () => {
    it('should initialize with correct paths and register helpers', () => {
      expect(htmlExporter.templatesPath).toContain('templates');
      expect(htmlExporter.outputPath).toContain('temp/exports');
      expect(htmlExporter.compiledTemplates).toBeInstanceOf(Map);
      expect(handlebars.registerHelper).toHaveBeenCalled();
    });
  });

  describe('generateHTMLExport', () => {
    const mockCourse = {
      id: 'course-123',
      title: 'Test Course',
      description: 'A test course',
      sessions: [
        {
          id: 'session-1',
          title: 'Session 1',
          content: '{"content": "Session 1 content"}',
          duration: 60,
          order_index: 0
        }
      ]
    };

    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();
      
      // Get the global mock reference
      const mockChain = global.mockSupabaseChain;
      
      // Mock course fetch - when fetching course details
      mockChain.single.mockResolvedValueOnce({
        data: mockCourse,
        error: null
      });
      
      // Mock sessions fetch - when fetching sessions
      mockChain.order.mockResolvedValueOnce({
        data: mockCourse.sessions,
        error: null
      });
      
      // Mock template file
      fs.readFile.mockResolvedValue('<html><body>{{title}}</body></html>');
    });

    it('should generate single-page HTML export', async () => {
      // Mock generateSinglePageHTML to be called
      htmlExporter.generateSinglePageHTML = jest.fn().mockResolvedValue({
        exportId: 'mock-uuid-123',
        outputPath: '/output/mock-uuid-123',
        type: 'single-page',
        htmlPath: '/output/mock-uuid-123/index.html',
        cssPath: '/output/mock-uuid-123/assets/css/style.css'
      });
      
      const result = await htmlExporter.generateHTMLExport('course-123', 'modern');

      expect(result).toHaveProperty('exportId', 'mock-uuid-123');
      expect(result).toHaveProperty('outputPath');
      expect(result).toHaveProperty('type', 'single-page');
      expect(htmlExporter.generateSinglePageHTML).toHaveBeenCalled();
    });

    it('should generate multi-page HTML export', async () => {
      // Mock generateMultiPageHTML to be called
      htmlExporter.generateMultiPageHTML = jest.fn().mockResolvedValue({
        exportId: 'mock-uuid-123',
        outputPath: '/output/mock-uuid-123',
        type: 'multi-page',
        indexPath: '/output/mock-uuid-123/index.html',
        sessionPaths: ['/output/mock-uuid-123/session-1.html']
      });
      
      const result = await htmlExporter.generateHTMLExport('course-123', 'modern', {
        exportType: 'multi-page'
      });

      expect(result).toHaveProperty('exportId');
      expect(result).toHaveProperty('type', 'multi-page');
      expect(result).toHaveProperty('indexPath');
      expect(result).toHaveProperty('sessionPaths');
      expect(htmlExporter.generateMultiPageHTML).toHaveBeenCalled();
    });

    it('should accept course data object', async () => {
      // Mock methods needed for direct course data
      htmlExporter.processContent = jest.fn().mockResolvedValue({
        sessions: [],
        totalDuration: 0,
        summary: {}
      });
      htmlExporter.generateSinglePageHTML = jest.fn().mockResolvedValue({
        exportId: 'mock-uuid-123',
        outputPath: '/output/mock-uuid-123',
        type: 'single-page'
      });

      const result = await htmlExporter.generateHTMLExport(mockCourse, 'modern');

      expect(result).toHaveProperty('exportId');
      expect(result).toHaveProperty('type', 'single-page');
      // Should not call fetchCourseData
      expect(htmlExporter.processContent).toHaveBeenCalledWith(mockCourse, {});
    });

    it('should create archive when requested', async () => {
      // Mock necessary methods
      htmlExporter.generateSinglePageHTML = jest.fn().mockResolvedValue({
        exportId: 'mock-uuid-123',
        outputPath: '/output/mock-uuid-123',
        type: 'single-page'
      });
      htmlExporter.createArchive = jest.fn().mockResolvedValue('/output/mock-uuid-123.zip');

      const result = await htmlExporter.generateHTMLExport('course-123', 'modern', {
        createArchive: true
      });

      expect(htmlExporter.createArchive).toHaveBeenCalledWith('/output/mock-uuid-123', 'mock-uuid-123');
      expect(result).toHaveProperty('archivePath');
    });

    it('should handle template not found', async () => {
      htmlExporter.validateTemplate = jest.fn().mockRejectedValue(
        new Error('Template not found')
      );

      await expect(htmlExporter.generateHTMLExport('course-123', 'nonexistent'))
        .rejects.toThrow('HTML export failed');
    });
  });

  describe('processContent', () => {
    it('should process course content with markdown', async () => {
      const courseData = {
        title: 'Test Course',
        description: '**Bold** description',
        sessions: [
          {
            title: 'Session 1',
            content: '{"content": "Session content", "keyPoints": ["Point 1"]}',
            activities: []
          }
        ]
      };

      const result = await htmlExporter.processContent(courseData);

      expect(result).toHaveProperty('sessions');
      expect(result).toHaveProperty('totalDuration');
      expect(result).toHaveProperty('summary');
      expect(result.sessions[0]).toHaveProperty('content');
      expect(result.sessions[0]).toHaveProperty('description');
    });

    it('should handle sessions without activities', async () => {
      const courseData = {
        sessions: [{ title: 'Session 1', content: 'Plain content' }]
      };

      const result = await htmlExporter.processContent(courseData);

      expect(result.sessions[0]).toHaveProperty('activities', []);
    });
  });

  describe('processSessionContent', () => {
    it('should process plain text content', () => {
      const content = 'This is plain text content';
      const result = htmlExporter.processSessionContent(content);

      expect(result).toContain('This is plain text content');
    });

    it('should process JSON content', () => {
      const content = JSON.stringify({
        content: 'Main content',
        keyPoints: ['Point 1', 'Point 2'],
        objectives: ['Objective 1']
      });

      const result = htmlExporter.processSessionContent(content);

      expect(result).toContain('Learning Objectives');
      expect(result).toContain('Objective 1');
      expect(result).toContain('Key Points');
      expect(result).toContain('Point 1');
    });

    it('should handle malformed JSON', () => {
      const content = '{invalid json';
      const result = htmlExporter.processSessionContent(content);

      expect(result).toContain('{invalid json');
    });
  });

  describe('loadTemplate', () => {
    it('should load and compile template', async () => {
      fs.readFile.mockResolvedValue('<html>{{title}}</html>');
      fs.access.mockResolvedValue(); // Template exists

      const template = await htmlExporter.loadTemplate('modern');

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('index.hbs'),
        'utf8'
      );
      expect(template).toHaveProperty('name', 'modern');
      expect(template).toHaveProperty('content');
    });

    it('should use cached template', async () => {
      fs.readFile.mockResolvedValue('<html>{{title}}</html>');
      fs.access.mockResolvedValue();

      await htmlExporter.loadTemplate('modern');
      // Clear mock to ensure we can count calls
      fs.readFile.mockClear();
      
      await htmlExporter.loadTemplate('modern');

      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should handle template not found error', async () => {
      fs.access.mockRejectedValue(new Error('File not found'));

      await expect(htmlExporter.loadTemplate('modern'))
        .rejects.toThrow('Template not found');
    });
  });

  describe('generateTemplateCSS', () => {
    it('should generate CSS for template', async () => {
      // Mock no CSS file exists, so it uses default
      fs.readFile.mockRejectedValue(new Error('File not found'));
      
      const css = await htmlExporter.generateTemplateCSS('modern');

      expect(css).toContain(':root');
      expect(css).toContain('--primary-color');
    });

    it('should apply customizations', async () => {
      // Mock reading CSS file
      fs.readFile.mockResolvedValue(':root { --primary-color: #000; }');
      
      const customizations = {
        primaryColor: '#ff0000',
        fontFamily: 'Arial',
        customCSS: '.custom { color: blue; }'
      };

      const css = await htmlExporter.generateTemplateCSS('modern', customizations);

      expect(css).toContain('--primary-color: #ff0000');
      expect(css).toContain('font-family: Arial');
      expect(css).toContain('.custom { color: blue; }');
    });
  });

  describe('createArchive', () => {
    it('should create ZIP archive', async () => {
      const mockFs = require('fs');
      const outputStream = { 
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(callback, 0);
          }
        })
      };
      mockFs.createWriteStream = jest.fn().mockReturnValue(outputStream);

      // Mock archiver to have pointer method
      mockArchive.pointer = jest.fn().mockReturnValue(1024);

      const archivePath = await htmlExporter.createArchive('/output/dir', 'export-123');

      expect(mockFs.createWriteStream).toHaveBeenCalledWith(
        expect.stringContaining('export-123.zip')
      );
      expect(archiver).toHaveBeenCalledWith('zip', expect.any(Object));
      expect(mockArchive.directory).toHaveBeenCalledWith('/output/dir', false);
      expect(mockArchive.finalize).toHaveBeenCalled();
      expect(archivePath).toContain('export-123.zip');
    });

    it('should handle archive creation errors', async () => {
      mockArchive.finalize.mockRejectedValue(new Error('Archive failed'));

      await expect(htmlExporter.createArchive('/output/dir', 'export-123'))
        .rejects.toThrow('Failed to create archive');
    });
  });

  describe('handlebars helpers', () => {
    beforeEach(() => {
      htmlExporter.registerHandlebarsHelpers();
    });

    it('should register markdown helper', () => {
      expect(handlebars.registerHelper).toHaveBeenCalledWith('markdown', expect.any(Function));
    });

    it('should register formatDuration helper', () => {
      expect(handlebars.registerHelper).toHaveBeenCalledWith('formatDuration', expect.any(Function));
      
      // Test the helper function
      const helper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'formatDuration'
      )[1];
      
      expect(helper(90)).toBe('1h 30m');
      expect(helper(45)).toBe('45m');
      expect(helper(0)).toBe('0 min');
    });

    it('should register uniqueId helper', () => {
      expect(handlebars.registerHelper).toHaveBeenCalledWith('uniqueId', expect.any(Function));
    });
  });

  describe('utility methods', () => {
    it('should calculate total duration', () => {
      const sessions = [
        { estimated_duration: 60 },
        { estimated_duration: 90 },
        { estimated_duration: 45 }
      ];

      const total = htmlExporter.calculateTotalDuration(sessions);

      expect(total).toBe(195);
    });

    it('should generate course summary', () => {
      const courseData = {
        title: 'Test Course',
        description: 'Course description',
        difficulty: 'Advanced'
      };
      const sessions = [
        { title: 'Session 1', estimated_duration: 60, activities: [1, 2] },
        { title: 'Session 2', estimated_duration: 90, activities: [3] }
      ];

      const summary = htmlExporter.generateCourseSummary(courseData, sessions);

      expect(summary).toHaveProperty('totalSessions', 2);
      expect(summary).toHaveProperty('totalDuration', 150);
      expect(summary).toHaveProperty('totalActivities', 3);
      expect(summary).toHaveProperty('difficulty', 'Advanced');
      expect(summary).toHaveProperty('topics');
      expect(summary.topics).toEqual(['Session 1', 'Session 2']);
    });

    it('should escape HTML', () => {
      const escaped = htmlExporter.escapeHtml('<script>alert("XSS")</script>');
      
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      fs.rmdir = jest.fn().mockResolvedValue();
      fs.unlink = jest.fn().mockResolvedValue();
    });

    it('should clean up export directory', async () => {
      await htmlExporter.cleanup('export-123');

      expect(fs.rmdir).toHaveBeenCalledWith(
        expect.stringContaining('export-123'),
        { recursive: true }
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      fs.rmdir.mockRejectedValue(new Error('Directory not found'));
      fs.unlink.mockRejectedValue(new Error('File not found'));

      // Should not throw
      await expect(htmlExporter.cleanup('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('copyTemplateAssets', () => {
    it('should copy template assets', async () => {
      fs.readdir.mockResolvedValue(['style.css', 'script.js']);
      fs.stat.mockResolvedValue({ isDirectory: () => false });

      await htmlExporter.copyTemplateAssets('modern', '/output/dir');

      expect(fs.copyFile).toHaveBeenCalledTimes(2);
    });

    it('should skip directories and handle missing assets', async () => {
      // Mock missing assets directory
      fs.access.mockRejectedValue(new Error('Directory not found'));

      await htmlExporter.copyTemplateAssets('modern', '/output/dir');

      // Should not copy any files when assets directory is missing
      expect(fs.copyFile).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle database errors', async () => {
      const { supabaseAdmin } = require('../../../src/config/database');
      supabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: null,
        error: new Error('Database error')
      });

      await expect(htmlExporter.generateHTMLExport('course-123', 'modern'))
        .rejects.toThrow('Course not found');
    });

    it('should handle invalid template names', async () => {
      await expect(htmlExporter.validateTemplate('../../etc/passwd'))
        .rejects.toThrow('Unsupported template');
    });
  });

  describe('initializeDirectories', () => {
    it('should create output and template directories', async () => {
      await htmlExporter.initializeDirectories();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('temp/exports'),
        { recursive: true }
      );
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('templates'),
        { recursive: true }
      );
    });

    it('should handle directory creation errors', async () => {
      fs.mkdir.mockRejectedValue(new Error('Permission denied'));

      // Should not throw
      await expect(htmlExporter.initializeDirectories()).resolves.not.toThrow();
    });
  });

  describe('formatActivityContent', () => {
    it('should format activity with instructions and questions', () => {
      const content = {
        instructions: 'Complete the following **exercise**',
        questions: [
          {
            question: 'What is Node.js?',
            options: ['A JavaScript runtime', 'A database', 'A framework']
          },
          {
            question: 'What is Express?',
            options: ['A web framework', 'A testing library']
          }
        ]
      };

      const result = htmlExporter.formatActivityContent(content);

      expect(result).toContain('activity-instructions');
      expect(result).toContain('Complete the following <strong>exercise</strong>');
      expect(result).toContain('Question 1');
      expect(result).toContain('What is Node.js?');
      expect(result).toContain('A JavaScript runtime');
      expect(result).toContain('Question 2');
    });

    it('should handle empty activity content', () => {
      const result = htmlExporter.formatActivityContent(null);
      expect(result).toBe('');
    });

    it('should handle activity with only instructions', () => {
      const content = { instructions: 'Read the following' };
      const result = htmlExporter.formatActivityContent(content);

      expect(result).toContain('activity-instructions');
      expect(result).not.toContain('activity-questions');
    });
  });

  describe('generateSinglePageHTML', () => {
    const mockCourse = {
      id: 'course-123',
      title: 'Test Course',
      description: 'A test course'
    };
    const mockProcessedContent = {
      sessions: [
        {
          title: 'Session 1',
          content: 'Session content',
          activities: []
        }
      ],
      totalDuration: 60,
      summary: { totalSessions: 1 }
    };
    const mockTemplate = {
      name: 'modern',
      content: '<html>{{course.title}}</html>'
    };

    beforeEach(() => {
      htmlExporter.generateTemplateCSS = jest.fn().mockResolvedValue('/* CSS */');
      htmlExporter.copyTemplateAssets = jest.fn().mockResolvedValue();
      htmlExporter.copyCourseAssets = jest.fn().mockResolvedValue();
    });

    it('should generate single-page HTML with all components', async () => {
      const result = await htmlExporter.generateSinglePageHTML(
        mockCourse,
        mockProcessedContent,
        mockTemplate,
        {},
        'export-123'
      );

      expect(result).toHaveProperty('exportId', 'export-123');
      expect(result).toHaveProperty('type', 'single-page');
      expect(result).toHaveProperty('htmlPath');
      expect(result).toHaveProperty('cssPath');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('index.html'),
        expect.any(String),
        'utf8'
      );
    });

    it('should generate visual report when DesignEngine is available', async () => {
      htmlExporter.designEngine = {
        generateCSS: jest.fn().mockResolvedValue('/* Design CSS */'),
        generateVisualReport: jest.fn().mockResolvedValue({
          overallQuality: 85,
          visuals: [{ title: 'Chart 1', svg: '<svg></svg>', quality: 90 }]
        })
      };

      await htmlExporter.generateSinglePageHTML(
        mockCourse,
        mockProcessedContent,
        mockTemplate,
        { generateVisualReport: true },
        'export-123'
      );

      expect(htmlExporter.designEngine.generateVisualReport).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('visual-report.json'),
        expect.any(String)
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('visual-gallery.html'),
        expect.any(String)
      );
    });

    it('should handle DesignEngine CSS generation failure gracefully', async () => {
      htmlExporter.designEngine = {
        generateCSS: jest.fn().mockRejectedValue(new Error('CSS generation failed'))
      };

      await expect(htmlExporter.generateSinglePageHTML(
        mockCourse,
        mockProcessedContent,
        mockTemplate,
        {},
        'export-123'
      )).resolves.not.toThrow();
    });
  });

  describe('generateMultiPageHTML', () => {
    const mockCourse = {
      id: 'course-123',
      title: 'Test Course'
    };
    const mockProcessedContent = {
      sessions: [
        { title: 'Session 1', content: 'Content 1' },
        { title: 'Session 2', content: 'Content 2' }
      ]
    };
    const mockTemplate = {
      name: 'modern',
      content: '<html>{{course.title}}</html>',
      sessionContent: '<html>{{session.title}}</html>'
    };

    beforeEach(() => {
      htmlExporter.generateTemplateCSS = jest.fn().mockResolvedValue('/* CSS */');
      htmlExporter.copyTemplateAssets = jest.fn().mockResolvedValue();
      htmlExporter.copyCourseAssets = jest.fn().mockResolvedValue();
    });

    it('should generate multi-page HTML with index and session pages', async () => {
      const result = await htmlExporter.generateMultiPageHTML(
        mockCourse,
        mockProcessedContent,
        mockTemplate,
        {},
        'export-123'
      );

      expect(result).toHaveProperty('type', 'multi-page');
      expect(result).toHaveProperty('indexPath');
      expect(result).toHaveProperty('sessionPaths');
      expect(result.sessionPaths).toHaveLength(2);
      
      // Verify index page
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('index.html'),
        expect.any(String),
        'utf8'
      );
      
      // Verify session pages
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('session-1.html'),
        expect.any(String),
        'utf8'
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('session-2.html'),
        expect.any(String),
        'utf8'
      );
    });

    it('should use main template for sessions if no session template', async () => {
      const templateNoSession = { ...mockTemplate, sessionContent: null };
      
      await htmlExporter.generateMultiPageHTML(
        mockCourse,
        mockProcessedContent,
        templateNoSession,
        {},
        'export-123'
      );

      expect(handlebars.compile).toHaveBeenCalledWith(mockTemplate.content);
    });
  });

  describe('fetchCourseData with alternative tables', () => {
    it('should try alternative session table names', async () => {
      const { supabaseAdmin } = require('../../../src/config/database');
      
      // Mock course fetch
      supabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: { id: 'course-123', title: 'Test' },
        error: null
      });
      
      // First sessions table fails
      supabaseAdmin.from().select().eq().order
        .mockRejectedValueOnce(new Error('Table not found'))
        .mockResolvedValueOnce({
          data: [{ id: 'session-1', title: 'Session 1' }],
          error: null
        });

      const result = await htmlExporter.fetchCourseData('course-123');

      expect(result.sessions).toHaveLength(1);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('sessions');
      expect(supabaseAdmin.from).toHaveBeenCalledWith('course_sessions');
    });

    it('should try alternative activity table names', async () => {
      const { supabaseAdmin } = require('../../../src/config/database');
      
      // Setup course and sessions
      supabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: { id: 'course-123' },
        error: null
      });
      
      supabaseAdmin.from().select().eq().order.mockResolvedValue({
        data: [{ id: 'session-1' }],
        error: null
      });
      
      // First activities table fails, then alternative works
      supabaseAdmin.from().select().eq().order
        .mockRejectedValueOnce(new Error('Table not found'))
        .mockResolvedValueOnce({
          data: [{ id: 'activity-1' }],
          error: null
        });

      const result = await htmlExporter.fetchCourseData('course-123');

      expect(result.sessions[0].activities).toHaveLength(1);
    });
  });

  describe('getDefaultCSS', () => {
    it('should return CSS for all template types', () => {
      const templates = ['modern', 'classic', 'minimal', 'interactive', 'mobile-first'];
      
      templates.forEach(template => {
        const css = htmlExporter.getDefaultCSS(template);
        expect(css).toContain('body');
        expect(css).toContain('.container');
        expect(css).toContain('.session');
      });
    });

    it('should return modern CSS for unknown template', () => {
      const css = htmlExporter.getDefaultCSS('unknown');
      expect(css).toContain(':root');
      expect(css).toContain('--primary-color');
    });
  });

  describe('copyDirectory', () => {
    beforeEach(() => {
      fs.readdir = jest.fn();
      fs.stat = jest.fn();
      fs.copyFile = jest.fn().mockResolvedValue();
    });

    it('should copy files and directories recursively', async () => {
      fs.readdir
        .mockResolvedValueOnce(['file1.js', 'subdir'])
        .mockResolvedValueOnce(['file2.js']);
      
      fs.stat
        .mockResolvedValueOnce({ isDirectory: () => false })
        .mockResolvedValueOnce({ isDirectory: () => true })
        .mockResolvedValueOnce({ isDirectory: () => false });

      await htmlExporter.copyDirectory('/src', '/dest');

      expect(fs.copyFile).toHaveBeenCalledWith('/src/file1.js', '/dest/file1.js');
      expect(fs.copyFile).toHaveBeenCalledWith('/src/subdir/file2.js', '/dest/subdir/file2.js');
    });

    it('should handle copy errors', async () => {
      fs.readdir.mockRejectedValue(new Error('Read failed'));

      await expect(htmlExporter.copyDirectory('/src', '/dest'))
        .rejects.toThrow('Directory copy failed');
    });
  });

  describe('generateVisualGallery', () => {
    it('should generate HTML gallery from visual report', () => {
      const visualReport = {
        overallQuality: 85,
        visuals: [
          {
            title: 'Data Flow Diagram',
            type: 'flowchart',
            visualType: 'diagram',
            quality: 90,
            svg: '<svg><circle cx="50" cy="50" r="40"/></svg>'
          },
          {
            title: 'Statistics Chart',
            type: 'chart',
            quality: 75,
            svg: '<svg><rect width="100" height="100"/></svg>'
          }
        ]
      };

      const html = htmlExporter.generateVisualGallery(visualReport);

      expect(html).toContain('Course Visual Gallery');
      expect(html).toContain('Overall Quality: 85%');
      expect(html).toContain('Data Flow Diagram');
      expect(html).toContain('Type: diagram');
      expect(html).toContain('quality-high');
      expect(html).toContain('Statistics Chart');
      expect(html).toContain('quality-medium');
      expect(html).toContain('<svg><circle');
    });

    it('should handle low quality visuals', () => {
      const visualReport = {
        overallQuality: 60,
        visuals: [
          { title: 'Low Quality Visual', quality: 50, svg: '<svg></svg>' }
        ]
      };

      const html = htmlExporter.generateVisualGallery(visualReport);
      expect(html).toContain('quality-low');
    });
  });

  describe('additional handlebars helpers', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      htmlExporter.registerHandlebarsHelpers();
    });

    it('should register ifEquals helper', () => {
      const helper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'ifEquals'
      )[1];
      
      const options = {
        fn: jest.fn().mockReturnValue('equal'),
        inverse: jest.fn().mockReturnValue('not equal')
      };
      
      expect(helper.call({}, 'a', 'a', options)).toBe('equal');
      expect(helper.call({}, 'a', 'b', options)).toBe('not equal');
    });

    it('should register eachWithIndex helper', () => {
      const helper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'eachWithIndex'
      )[1];
      
      const array = [{ name: 'Item 1' }, { name: 'Item 2' }];
      const options = {
        fn: (context) => `${context.index}: ${context.name}\n`
      };
      
      const result = helper.call({}, array, options);
      expect(result).toContain('0: Item 1');
      expect(result).toContain('1: Item 2');
    });

    it('should register json helper', () => {
      const helper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'json'
      )[1];
      
      const obj = { foo: 'bar', num: 42 };
      expect(helper(obj)).toBe('{"foo":"bar","num":42}');
    });

    it('should register math helpers', () => {
      const addHelper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'add'
      )[1];
      const subHelper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'sub'
      )[1];
      const multiplyHelper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'multiply'
      )[1];
      const divideHelper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'divide'
      )[1];
      
      expect(addHelper(5, 3)).toBe(8);
      expect(subHelper(10, 4)).toBe(6);
      expect(multiplyHelper(3, 7)).toBe(21);
      expect(divideHelper(20, 4)).toBe(5);
      expect(divideHelper(10, 0)).toBe(0); // Division by zero
    });

    it('should register comparison helpers', () => {
      const ltHelper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'lt'
      )[1];
      const gtHelper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'gt'
      )[1];
      const lteHelper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'lte'
      )[1];
      const gteHelper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'gte'
      )[1];
      
      expect(ltHelper(3, 5)).toBe(true);
      expect(ltHelper(5, 3)).toBe(false);
      expect(gtHelper(5, 3)).toBe(true);
      expect(lteHelper(3, 3)).toBe(true);
      expect(gteHelper(3, 3)).toBe(true);
    });

    it('should register array length helper', () => {
      const helper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'length'
      )[1];
      
      expect(helper([1, 2, 3])).toBe(3);
      expect(helper([])).toBe(0);
      expect(helper(null)).toBe(0);
      expect(helper('not array')).toBe(0);
    });

    it('should register string helpers', () => {
      const capitalizeHelper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'capitalize'
      )[1];
      const truncateHelper = handlebars.registerHelper.mock.calls.find(
        call => call[0] === 'truncate'
      )[1];
      
      expect(capitalizeHelper('hello')).toBe('Hello');
      expect(capitalizeHelper('')).toBe('');
      expect(capitalizeHelper(null)).toBe('');
      
      expect(truncateHelper('This is a long string', 10)).toBe('This is a ...');
      expect(truncateHelper('Short', 10)).toBe('Short');
      expect(truncateHelper(null, 10)).toBe('');
    });
  });

  describe('processContent edge cases', () => {
    it('should handle sessions with empty activities array', async () => {
      const courseData = {
        sessions: [
          { title: 'Session 1', content: 'Content', activities: [] }
        ]
      };

      const result = await htmlExporter.processContent(courseData);
      
      expect(result.sessions[0].activities).toEqual([]);
    });

    it('should handle sessions with null content', async () => {
      const courseData = {
        sessions: [
          { title: 'Session 1', content: null, activities: [] }
        ]
      };

      const result = await htmlExporter.processContent(courseData);
      
      expect(result.sessions[0].content).toBe('');
    });
  });

  describe('generateHTMLExport comprehensive scenarios', () => {
    it('should handle options without createArchive', async () => {
      // Mock necessary methods
      htmlExporter.fetchCourseData = jest.fn().mockResolvedValue({
        id: 'course-123',
        title: 'Test',
        sessions: []
      });
      htmlExporter.processContent = jest.fn().mockResolvedValue({
        sessions: [],
        totalDuration: 0,
        summary: {}
      });
      htmlExporter.generateSinglePageHTML = jest.fn().mockResolvedValue({
        exportId: 'mock-uuid-123',
        outputPath: '/output/mock-uuid-123',
        type: 'single-page'
      });

      const result = await htmlExporter.generateHTMLExport('course-123', 'modern', {
        createArchive: false
      });

      expect(result).toHaveProperty('exportId');
      expect(result).not.toHaveProperty('archivePath');
      // createArchive should not be called when option is false
      expect(result.archivePath).toBeUndefined();
    });

    it('should use custom exportId when provided', async () => {
      // Mock necessary methods
      htmlExporter.fetchCourseData = jest.fn().mockResolvedValue({
        id: 'course-123',
        title: 'Test',
        sessions: []
      });
      htmlExporter.processContent = jest.fn().mockResolvedValue({
        sessions: [],
        totalDuration: 0,
        summary: {}
      });
      htmlExporter.generateSinglePageHTML = jest.fn().mockResolvedValue({
        exportId: 'custom-export-id',
        outputPath: '/output/custom-export-id',
        type: 'single-page'
      });
      htmlExporter.createArchive = jest.fn().mockResolvedValue('/output/custom-export-id.zip');

      const result = await htmlExporter.generateHTMLExport(
        'course-123', 
        'modern', 
        {},
        'custom-export-id'
      );

      expect(result.exportId).toBe('custom-export-id');
    });
  });

  describe('ensureMarkedInitialized', () => {
    it('should initialize marked module once', async () => {
      // Reset the flag
      htmlExporter.markedInitialized = false;
      
      await htmlExporter.ensureMarkedInitialized();
      expect(htmlExporter.markedInitialized).toBe(true);
      
      // Second call should not reinitialize
      await htmlExporter.ensureMarkedInitialized();
      expect(htmlExporter.markedInitialized).toBe(true);
    });
  });

  describe('error scenarios', () => {
    it('should handle ProcessingError for single-page generation failure', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(htmlExporter.generateSinglePageHTML(
        {}, {}, { name: 'test', content: 'test' }, {}, 'export-123'
      )).rejects.toThrow('Single-page HTML generation failed');
    });

    it('should handle ProcessingError for multi-page generation failure', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(htmlExporter.generateMultiPageHTML(
        {}, { sessions: [] }, { name: 'test', content: 'test' }, {}, 'export-123'
      )).rejects.toThrow('Multi-page HTML generation failed');
    });
  });
});