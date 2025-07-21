const HTMLExporter = require('../../../src/services/htmlExporter');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

jest.mock('fs').promises;
jest.mock('handlebars');
jest.mock('archiver');
jest.mock('uuid');

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock supabase
jest.mock('../../../src/config/database', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        }))
      }))
    }))
  }
}));

describe('HTMLExporter', () => {
  let htmlExporter;
  let mockArchive;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock file system
    fs.mkdir = jest.fn().mockResolvedValue();
    fs.readFile = jest.fn();
    fs.writeFile = jest.fn().mockResolvedValue();
    fs.readdir = jest.fn().mockResolvedValue([]);
    fs.stat = jest.fn().mockResolvedValue({ isDirectory: () => false });
    fs.copyFile = jest.fn().mockResolvedValue();
    fs.rm = jest.fn().mockResolvedValue();
    
    // Mock archiver
    mockArchive = {
      pipe: jest.fn(),
      directory: jest.fn(),
      finalize: jest.fn().mockResolvedValue(),
      on: jest.fn()
    };
    archiver.create = jest.fn().mockReturnValue(mockArchive);
    
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
      const { supabaseAdmin } = require('../../../src/config/database');
      
      // Mock course fetch
      supabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: mockCourse,
        error: null
      });
      
      // Mock sessions fetch
      supabaseAdmin.from().select().eq().order.mockResolvedValue({
        data: mockCourse.sessions,
        error: null
      });
      
      // Mock template file
      fs.readFile.mockResolvedValue('<html><body>{{title}}</body></html>');
    });

    it('should generate single-page HTML export', async () => {
      const result = await htmlExporter.generateHTMLExport('course-123', 'modern');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('exportId', 'mock-uuid-123');
      expect(result).toHaveProperty('path');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should generate multi-page HTML export', async () => {
      const result = await htmlExporter.generateHTMLExport('course-123', 'modern', {
        exportType: 'multi-page'
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('exportId');
      expect(result).toHaveProperty('files');
      expect(result.files).toHaveProperty('index');
      expect(result.files).toHaveProperty('sessions');
    });

    it('should accept course data object', async () => {
      const result = await htmlExporter.generateHTMLExport(mockCourse, 'modern');

      expect(result).toHaveProperty('success', true);
      // Should not fetch from database
      expect(supabaseAdmin.from().select().eq().single).not.toHaveBeenCalled();
    });

    it('should create archive when requested', async () => {
      const result = await htmlExporter.generateHTMLExport('course-123', 'modern', {
        createArchive: true
      });

      expect(archiver.create).toHaveBeenCalledWith('zip', expect.any(Object));
      expect(result).toHaveProperty('archivePath');
    });

    it('should handle template not found', async () => {
      htmlExporter.validateTemplate = jest.fn().mockRejectedValue(
        new Error('Template not found')
      );

      await expect(htmlExporter.generateHTMLExport('course-123', 'nonexistent'))
        .rejects.toThrow('Failed to generate HTML export');
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

      expect(result).toHaveProperty('title', 'Test Course');
      expect(result).toHaveProperty('descriptionHTML');
      expect(result).toHaveProperty('sessions');
      expect(result.sessions[0]).toHaveProperty('processedContent');
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

      const template = await htmlExporter.loadTemplate('modern');

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('modern-template.html'),
        'utf8'
      );
      expect(handlebars.compile).toHaveBeenCalled();
    });

    it('should use cached template', async () => {
      fs.readFile.mockResolvedValue('<html>{{title}}</html>');

      await htmlExporter.loadTemplate('modern');
      await htmlExporter.loadTemplate('modern');

      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should use default template on error', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));

      const template = await htmlExporter.loadTemplate('nonexistent');

      expect(template).toBeDefined();
    });
  });

  describe('generateTemplateCSS', () => {
    it('should generate CSS for template', async () => {
      const css = await htmlExporter.generateTemplateCSS('modern');

      expect(css).toContain(':root');
      expect(css).toContain('--primary-color');
    });

    it('should apply customizations', async () => {
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
      const outputStream = { on: jest.fn() };
      fs.createWriteStream = jest.fn().mockReturnValue(outputStream);

      const archivePath = await htmlExporter.createArchive('/output/dir', 'export-123');

      expect(archiver.create).toHaveBeenCalledWith('zip', expect.any(Object));
      expect(mockArchive.directory).toHaveBeenCalledWith('/output/dir', false);
      expect(mockArchive.finalize).toHaveBeenCalled();
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
        { duration: 60 },
        { duration: 90 },
        { duration: 45 }
      ];

      const total = htmlExporter.calculateTotalDuration(sessions);

      expect(total).toBe(195);
    });

    it('should generate course summary', () => {
      const courseData = {
        title: 'Test Course',
        description: 'Course description'
      };
      const sessions = [
        { duration: 60, activities: [1, 2] },
        { duration: 90, activities: [3] }
      ];

      const summary = htmlExporter.generateCourseSummary(courseData, sessions);

      expect(summary).toHaveProperty('title', 'Test Course');
      expect(summary).toHaveProperty('sessionCount', 2);
      expect(summary).toHaveProperty('totalDuration', 150);
      expect(summary).toHaveProperty('totalActivities', 3);
    });

    it('should escape HTML', () => {
      const escaped = htmlExporter.escapeHtml('<script>alert("XSS")</script>');
      
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });
  });

  describe('cleanup', () => {
    it('should clean up export directory', async () => {
      await htmlExporter.cleanup('export-123');

      expect(fs.rm).toHaveBeenCalledWith(
        expect.stringContaining('export-123'),
        { recursive: true, force: true }
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      fs.rm.mockRejectedValue(new Error('Directory not found'));

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

    it('should skip directories', async () => {
      fs.readdir.mockResolvedValue(['assets', 'style.css']);
      fs.stat
        .mockResolvedValueOnce({ isDirectory: () => true })
        .mockResolvedValueOnce({ isDirectory: () => false });

      await htmlExporter.copyTemplateAssets('modern', '/output/dir');

      expect(fs.copyFile).toHaveBeenCalledTimes(1);
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
});