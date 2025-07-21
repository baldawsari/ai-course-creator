const PDFGenerator = require('../../../src/services/pdfGenerator');
const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const { v4: uuidv4 } = require('uuid');

jest.mock('fs').promises;
jest.mock('puppeteer');
jest.mock('handlebars');
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
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockResolvedValue({ data: null, error: null }),
      download: jest.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/pdf' } })
    }
  }
}));

describe('PDFGenerator', () => {
  let pdfGenerator;
  let mockBrowser;
  let mockPage;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock file system
    fs.mkdir = jest.fn().mockResolvedValue();
    fs.readFile = jest.fn();
    fs.unlink = jest.fn().mockResolvedValue();
    fs.stat = jest.fn().mockResolvedValue({ size: 1024000 });
    
    // Mock puppeteer
    mockPage = {
      setContent: jest.fn(),
      emulateMediaType: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from('PDF content')),
      close: jest.fn()
    };
    
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn()
    };
    
    puppeteer.launch = jest.fn().mockResolvedValue(mockBrowser);
    
    // Mock handlebars
    handlebars.compile = jest.fn().mockReturnValue((data) => `<html>${JSON.stringify(data)}</html>`);
    
    // Mock uuid
    uuidv4.mockReturnValue('mock-uuid-123');
    
    pdfGenerator = new PDFGenerator();
  });

  afterEach(async () => {
    await pdfGenerator.closeBrowser();
  });

  describe('constructor', () => {
    it('should initialize with correct defaults', () => {
      expect(pdfGenerator.outputPath).toContain('temp/pdfs');
      expect(pdfGenerator.templateCache).toBeInstanceOf(Map);
      expect(pdfGenerator.defaultOptions).toHaveProperty('format', 'A4');
      expect(pdfGenerator.defaultOptions).toHaveProperty('printBackground', true);
    });
  });

  describe('generatePDF', () => {
    const mockCourse = {
      id: 'course-123',
      title: 'Test Course',
      description: 'A test course',
      sessions: [
        {
          id: 'session-1',
          title: 'Session 1',
          content: { content: 'Session 1 content' },
          duration: 60
        }
      ]
    };

    it('should generate PDF from course data', async () => {
      fs.readFile.mockResolvedValue('<html><body>{{title}}</body></html>');

      const result = await pdfGenerator.generatePDF(mockCourse, 'modern');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('pdfId', 'mock-uuid-123');
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('fileSize', 1024000);
      expect(mockPage.setContent).toHaveBeenCalled();
      expect(mockPage.pdf).toHaveBeenCalled();
    });

    it('should use design engine when available', async () => {
      pdfGenerator.designEngine = {
        enhanceHTMLForPDF: jest.fn().mockResolvedValue('<html>Enhanced HTML</html>')
      };

      fs.readFile.mockResolvedValue('<html><body>{{title}}</body></html>');

      await pdfGenerator.generatePDF(mockCourse, 'modern', { useDesignEngine: true });

      expect(pdfGenerator.designEngine.enhanceHTMLForPDF).toHaveBeenCalled();
    });

    it('should optimize PDF when requested', async () => {
      fs.readFile.mockResolvedValue('<html><body>{{title}}</body></html>');
      
      // Mock exec for optimization
      const childProcess = require('child_process');
      childProcess.exec = jest.fn().mockImplementation((cmd, cb) => cb(null, 'optimized'));

      await pdfGenerator.generatePDF(mockCourse, 'modern', { optimize: true });

      expect(childProcess.exec).toHaveBeenCalledWith(
        expect.stringContaining('gs'),
        expect.any(Function)
      );
    });

    it('should upload to storage when requested', async () => {
      fs.readFile.mockResolvedValue('<html><body>{{title}}</body></html>');

      const result = await pdfGenerator.generatePDF(mockCourse, 'modern', { 
        uploadToStorage: true 
      });

      expect(result).toHaveProperty('storageUrl', 'https://example.com/pdf');
      expect(pdfGenerator.uploadToSupabase).toHaveBeenCalled();
    });

    it('should handle template loading errors', async () => {
      fs.readFile.mockRejectedValue(new Error('Template not found'));

      await expect(pdfGenerator.generatePDF(mockCourse, 'nonexistent'))
        .rejects.toThrow('Failed to generate PDF');
    });
  });

  describe('generatePDFFromHTML', () => {
    const htmlContent = '<html><body><h1>Test PDF</h1></body></html>';

    it('should generate PDF from HTML content', async () => {
      const result = await pdfGenerator.generatePDFFromHTML(htmlContent);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('pdfId');
      expect(result).toHaveProperty('path');
      expect(mockPage.setContent).toHaveBeenCalledWith(htmlContent, { waitUntil: 'networkidle0' });
    });

    it('should apply custom options', async () => {
      const customOptions = {
        format: 'Letter',
        landscape: true,
        margin: { top: '0.5in', bottom: '0.5in' }
      };

      await pdfGenerator.generatePDFFromHTML(htmlContent, customOptions);

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'Letter',
          landscape: true,
          margin: expect.objectContaining({ top: '0.5in' })
        })
      );
    });

    it('should handle conversion errors', async () => {
      mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

      await expect(pdfGenerator.generatePDFFromHTML(htmlContent))
        .rejects.toThrow('Failed to generate PDF from HTML');
    });
  });

  describe('prepareTemplateData', () => {
    it('should prepare course data for template', async () => {
      const course = {
        title: 'Test Course',
        sessions: [
          { title: 'Session 1', duration: 60, content: { content: 'Content 1' } },
          { title: 'Session 2', duration: 90, content: { content: 'Content 2' } }
        ]
      };

      const result = await pdfGenerator.prepareTemplateData(course, {});

      expect(result).toHaveProperty('title', 'Test Course');
      expect(result).toHaveProperty('tableOfContents');
      expect(result).toHaveProperty('totalDuration', 150);
      expect(result).toHaveProperty('sessionCount', 2);
      expect(result.sessions[0]).toHaveProperty('formattedContent');
    });

    it('should handle missing sessions', async () => {
      const course = { title: 'Test Course' };

      const result = await pdfGenerator.prepareTemplateData(course, {});

      expect(result).toHaveProperty('sessions', []);
      expect(result).toHaveProperty('totalDuration', 0);
      expect(result).toHaveProperty('sessionCount', 0);
    });
  });

  describe('generateTableOfContents', () => {
    it('should generate table of contents', () => {
      const course = {
        sessions: [
          { id: 's1', title: 'Introduction', sessionNumber: 1 },
          { id: 's2', title: 'Advanced Topics', sessionNumber: 2 }
        ]
      };

      const toc = pdfGenerator.generateTableOfContents(course);

      expect(toc).toHaveLength(2);
      expect(toc[0]).toEqual({
        title: 'Introduction',
        anchor: 's1',
        level: 1,
        sessionNumber: 1
      });
    });

    it('should handle empty sessions', () => {
      const toc = pdfGenerator.generateTableOfContents({ sessions: [] });

      expect(toc).toEqual([]);
    });
  });

  describe('formatContent', () => {
    it('should format string content', () => {
      const content = 'This is plain text content';
      const formatted = pdfGenerator.formatContent(content);

      expect(formatted).toContain('This is plain text content');
    });

    it('should format JSON object content', () => {
      const content = {
        content: 'Main content',
        keyPoints: ['Point 1', 'Point 2'],
        examples: ['Example 1']
      };

      const formatted = pdfGenerator.formatContent(content);

      expect(formatted).toContain('Main content');
      expect(formatted).toContain('Key Points');
      expect(formatted).toContain('Point 1');
      expect(formatted).toContain('Examples');
    });

    it('should format quiz questions', () => {
      const content = {
        questions: [
          {
            question: 'What is 2+2?',
            options: ['3', '4', '5'],
            correctAnswer: 1
          }
        ]
      };

      const formatted = pdfGenerator.formatContent(content);

      expect(formatted).toContain('What is 2+2?');
      expect(formatted).toContain('A) 3');
      expect(formatted).toContain('B) 4');
    });

    it('should handle code content', () => {
      const content = {
        code: 'console.log("Hello World");'
      };

      const formatted = pdfGenerator.formatContent(content);

      expect(formatted).toContain('<pre><code>');
      expect(formatted).toContain('console.log("Hello World");');
    });
  });

  describe('browser management', () => {
    it('should launch browser on first use', async () => {
      await pdfGenerator.getBrowser();

      expect(puppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
          args: expect.arrayContaining(['--no-sandbox'])
        })
      );
    });

    it('should reuse browser instance', async () => {
      const browser1 = await pdfGenerator.getBrowser();
      const browser2 = await pdfGenerator.getBrowser();

      expect(browser1).toBe(browser2);
      expect(puppeteer.launch).toHaveBeenCalledTimes(1);
    });

    it('should close browser properly', async () => {
      await pdfGenerator.getBrowser();
      await pdfGenerator.closeBrowser();

      expect(mockBrowser.close).toHaveBeenCalled();
      expect(pdfGenerator.browserInstance).toBeNull();
    });
  });

  describe('uploadToSupabase', () => {
    it('should upload PDF to Supabase storage', async () => {
      const mockBuffer = Buffer.from('PDF content');
      fs.readFile.mockResolvedValue(mockBuffer);

      const { supabaseAdmin } = require('../../../src/config/database');
      supabaseAdmin.storage.from().upload.mockResolvedValue({
        data: { path: 'pdfs/course-123/mock-uuid-123.pdf' },
        error: null
      });

      const result = await pdfGenerator.uploadToSupabase(
        '/path/to/pdf.pdf',
        'course-123',
        'mock-uuid-123'
      );

      expect(result).toBe('https://example.com/pdf');
      expect(supabaseAdmin.storage.from).toHaveBeenCalledWith('exports');
      expect(supabaseAdmin.storage.from().upload).toHaveBeenCalledWith(
        'pdfs/course-123/mock-uuid-123.pdf',
        mockBuffer,
        expect.objectContaining({
          contentType: 'application/pdf',
          cacheControl: '3600'
        })
      );
    });

    it('should handle upload errors', async () => {
      fs.readFile.mockResolvedValue(Buffer.from('PDF'));
      
      const { supabaseAdmin } = require('../../../src/config/database');
      supabaseAdmin.storage.from().upload.mockResolvedValue({
        data: null,
        error: new Error('Upload failed')
      });

      await expect(pdfGenerator.uploadToSupabase('/path/to/pdf.pdf', 'course-123', 'pdf-123'))
        .rejects.toThrow('Failed to upload PDF');
    });
  });

  describe('cleanup', () => {
    it('should clean up temporary files', async () => {
      await pdfGenerator.cleanup('mock-uuid-123');

      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('mock-uuid-123.pdf')
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      fs.unlink.mockRejectedValue(new Error('File not found'));

      // Should not throw
      await expect(pdfGenerator.cleanup('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('template caching', () => {
    it('should cache loaded templates', async () => {
      fs.readFile.mockResolvedValue('<html>Template</html>');

      const template1 = await pdfGenerator.loadBasicTemplate('modern');
      const template2 = await pdfGenerator.loadBasicTemplate('modern');

      expect(template1).toBe(template2);
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should use default template if file not found', async () => {
      fs.readFile.mockRejectedValue(new Error('Not found'));

      const template = await pdfGenerator.loadBasicTemplate('nonexistent');

      expect(template).toContain('<!DOCTYPE html>');
      expect(template).toContain('{{title}}');
    });
  });

  describe('utility methods', () => {
    it('should escape HTML correctly', () => {
      const escaped = pdfGenerator.escapeHtml('<script>alert("XSS")</script>');
      
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('should process markdown for PDF', () => {
      const markdown = '**Bold** _italic_ `code`';
      const processed = pdfGenerator.processMarkdownForPDF(markdown);

      expect(processed).toContain('<strong>Bold</strong>');
      expect(processed).toContain('<em>italic</em>');
      expect(processed).toContain('<code>code</code>');
    });

    it('should calculate total duration', () => {
      const sessions = [
        { duration: 60 },
        { duration: 90 },
        { duration: 45 }
      ];

      const total = pdfGenerator.calculateTotalDuration(sessions);

      expect(total).toBe(195);
    });

    it('should calculate total activities', () => {
      const sessions = [
        { content: { activities: ['a1', 'a2'] } },
        { content: { activities: ['a3'] } },
        { content: {} }
      ];

      const total = pdfGenerator.calculateTotalActivities(sessions);

      expect(total).toBe(3);
    });
  });
});