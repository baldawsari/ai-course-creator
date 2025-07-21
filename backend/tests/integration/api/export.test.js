const request = require('supertest');
const express = require('express');
const { supabaseAdmin } = require('../../../src/config/database');
const Bull = require('bull');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../../src/utils/logger');
const HTMLExporter = require('../../../src/services/htmlExporter');
const PDFGenerator = require('../../../src/services/pdfGenerator');
const PPTGenerator = require('../../../src/services/pptGenerator');

// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('bull');
jest.mock('fs').promises;
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/services/htmlExporter');
jest.mock('../../../src/services/pdfGenerator');
jest.mock('../../../src/services/pptGenerator');

// Import the app after mocking
const exportRouter = require('../../../src/routes/export');

describe('Export API Integration Tests', () => {
  let app;
  let mockSupabase;
  let mockQueue;
  let mockHTMLExporter;
  let mockPDFGenerator;
  let mockPPTGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'instructor'
      };
      next();
    });
    
    // Mock permission middleware
    jest.mock('../../../src/middleware/auth', () => ({
      authenticateToken: (req, res, next) => next(),
      requirePermission: () => (req, res, next) => next()
    }));
    
    // Mount routes
    app.use('/export', exportRouter);
    
    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    };
    
    supabaseAdmin.from.mockReturnValue(mockSupabase);
    supabaseAdmin.storage = {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockResolvedValue({ data: { path: 'exports/test.pdf' }, error: null }),
      download: jest.fn().mockResolvedValue({ data: Buffer.from('file content'), error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.pdf' } })
    };
    
    // Setup Bull queue mock
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      getJob: jest.fn(),
      on: jest.fn()
    };
    Bull.mockReturnValue(mockQueue);
    
    // Setup service mocks
    mockHTMLExporter = {
      generateHTMLExport: jest.fn().mockResolvedValue({
        success: true,
        exportId: 'export-123',
        path: '/exports/html/export-123.html',
        archivePath: '/exports/html/export-123.zip'
      })
    };
    HTMLExporter.mockImplementation(() => mockHTMLExporter);
    
    mockPDFGenerator = {
      generatePDF: jest.fn().mockResolvedValue({
        success: true,
        pdfId: 'pdf-123',
        path: '/exports/pdf/pdf-123.pdf',
        fileSize: 1024000,
        storageUrl: 'https://example.com/pdf-123.pdf'
      })
    };
    PDFGenerator.mockImplementation(() => mockPDFGenerator);
    
    mockPPTGenerator = {
      generatePPT: jest.fn().mockResolvedValue({
        success: true,
        pptId: 'ppt-123',
        path: '/exports/ppt/ppt-123.pptx',
        fileSize: 2048000,
        slideCount: 25
      })
    };
    PPTGenerator.mockImplementation(() => mockPPTGenerator);
    
    // Mock file system
    fs.mkdir = jest.fn().mockResolvedValue();
    fs.readFile = jest.fn().mockResolvedValue(Buffer.from('file content'));
    fs.stat = jest.fn().mockResolvedValue({ size: 1024000 });
    fs.unlink = jest.fn().mockResolvedValue();
    
    // Mock logger
    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();
  });

  describe('POST /export/html', () => {
    const exportRequest = {
      courseId: 'course-123',
      template: 'modern',
      options: {
        format: 'multi-page',
        includeAssets: true,
        theme: {
          primaryColor: '#007bff'
        }
      }
    };

    it('should export course as HTML', async () => {
      // Mock course fetch
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'course-123',
          title: 'Test Course',
          user_id: 'user-123'
        },
        error: null
      });

      const response = await request(app)
        .post('/export/html')
        .send(exportRequest)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        exportId: 'export-123',
        downloadUrl: expect.stringContaining('/export/download/export-123'),
        format: 'html',
        message: 'HTML export completed successfully'
      });

      expect(mockHTMLExporter.generateHTMLExport).toHaveBeenCalledWith(
        'course-123',
        'modern',
        expect.objectContaining({
          format: 'multi-page'
        }),
        expect.any(String)
      );
    });

    it('should validate template name', async () => {
      const response = await request(app)
        .post('/export/html')
        .send({
          courseId: 'course-123',
          template: 'invalid-template'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should check course ownership', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'course-123',
          user_id: 'other-user'
        },
        error: null
      });

      const response = await request(app)
        .post('/export/html')
        .send(exportRequest)
        .expect(403);

      expect(response.body).toEqual({
        error: 'Access denied'
      });
    });

    it('should handle export errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'course-123', user_id: 'user-123' },
        error: null
      });

      mockHTMLExporter.generateHTMLExport.mockRejectedValue(
        new Error('Export failed')
      );

      const response = await request(app)
        .post('/export/html')
        .send(exportRequest)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /export/pdf', () => {
    const exportRequest = {
      courseId: 'course-123',
      template: 'classic',
      options: {
        format: 'A4',
        orientation: 'portrait',
        includeTableOfContents: true,
        uploadToStorage: true
      }
    };

    it('should export course as PDF', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'course-123',
          title: 'Test Course',
          user_id: 'user-123'
        },
        error: null
      });

      const response = await request(app)
        .post('/export/pdf')
        .send(exportRequest)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        pdfId: 'pdf-123',
        downloadUrl: expect.stringContaining('/export/download/pdf-123'),
        storageUrl: 'https://example.com/pdf-123.pdf',
        format: 'pdf',
        fileSize: 1024000,
        message: 'PDF export completed successfully'
      });

      expect(mockPDFGenerator.generatePDF).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'course-123'
        }),
        'classic',
        expect.objectContaining({
          format: 'A4',
          uploadToStorage: true
        })
      );
    });

    it('should validate PDF options', async () => {
      const response = await request(app)
        .post('/export/pdf')
        .send({
          courseId: 'course-123',
          options: {
            format: 'InvalidFormat'
          }
        })
        .expect(400);

      expect(response.body.details).toContain('format');
    });
  });

  describe('POST /export/ppt', () => {
    const exportRequest = {
      courseId: 'course-123',
      template: 'professional',
      options: {
        aspectRatio: '16:9',
        includeNotes: true,
        slidesPerSession: 5
      }
    };

    it('should export course as PowerPoint', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'course-123',
          title: 'Test Course',
          user_id: 'user-123'
        },
        error: null
      });

      const response = await request(app)
        .post('/export/ppt')
        .send(exportRequest)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        pptId: 'ppt-123',
        downloadUrl: expect.stringContaining('/export/download/ppt-123'),
        format: 'pptx',
        fileSize: 2048000,
        slideCount: 25,
        message: 'PowerPoint export completed successfully'
      });

      expect(mockPPTGenerator.generatePPT).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'course-123'
        }),
        'professional',
        expect.objectContaining({
          slidesPerSession: 5
        })
      );
    });
  });

  describe('POST /export/bundle', () => {
    const bundleRequest = {
      courseId: 'course-123',
      formats: ['html', 'pdf'],
      options: {
        html: {
          template: 'modern',
          format: 'single-page'
        },
        pdf: {
          template: 'classic',
          format: 'A4'
        }
      }
    };

    it('should create export bundle', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'course-123',
          title: 'Test Course',
          user_id: 'user-123'
        },
        error: null
      });

      // Mock both exports
      mockHTMLExporter.generateHTMLExport.mockResolvedValue({
        success: true,
        path: '/exports/html/export-123.html'
      });

      mockPDFGenerator.generatePDF.mockResolvedValue({
        success: true,
        path: '/exports/pdf/pdf-123.pdf'
      });

      const response = await request(app)
        .post('/export/bundle')
        .send(bundleRequest)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        bundleId: expect.any(String),
        exports: expect.objectContaining({
          html: expect.objectContaining({
            success: true
          }),
          pdf: expect.objectContaining({
            success: true
          })
        }),
        downloadUrl: expect.stringContaining('/export/download/'),
        message: 'Export bundle created successfully'
      });
    });

    it('should validate formats array', async () => {
      const response = await request(app)
        .post('/export/bundle')
        .send({
          courseId: 'course-123',
          formats: ['invalid-format']
        })
        .expect(400);

      expect(response.body.details).toContain('formats');
    });
  });

  describe('GET /export/templates', () => {
    it('should list available templates', async () => {
      const response = await request(app)
        .get('/export/templates')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        templates: expect.arrayContaining([
          expect.objectContaining({
            id: 'modern',
            name: 'Modern',
            supportedFormats: expect.arrayContaining(['html', 'pdf', 'ppt'])
          })
        ])
      });
    });

    it('should filter templates by format', async () => {
      const response = await request(app)
        .get('/export/templates?format=pdf')
        .expect(200);

      expect(response.body.templates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            supportedFormats: expect.arrayContaining(['pdf'])
          })
        ])
      );
    });
  });

  describe('GET /export/status/:exportId', () => {
    it('should get export status from queue', async () => {
      const mockJob = {
        id: 'job-123',
        progress: jest.fn().mockReturnValue(75),
        toJSON: jest.fn().mockReturnValue({
          id: 'job-123',
          data: { exportId: 'export-123' },
          progress: 75,
          processedOn: Date.now()
        })
      };

      mockQueue.getJob.mockResolvedValue(mockJob);

      const response = await request(app)
        .get('/export/status/export-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        status: 'processing',
        progress: 75,
        exportId: 'export-123'
      });
    });

    it('should get completed export status', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'export-123',
          status: 'completed',
          downloadUrl: 'https://example.com/export.pdf',
          fileSize: 1024000,
          format: 'pdf'
        },
        error: null
      });

      const response = await request(app)
        .get('/export/status/export-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        status: 'completed',
        downloadUrl: 'https://example.com/export.pdf',
        fileSize: 1024000,
        format: 'pdf'
      });
    });
  });

  describe('GET /export/download/:exportId', () => {
    it('should download export file', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'export-123',
          format: 'pdf',
          filePath: '/exports/pdf/export-123.pdf',
          fileName: 'Test Course.pdf',
          user_id: 'user-123'
        },
        error: null
      });

      fs.stat.mockResolvedValue({ size: 1024000 });
      fs.readFile.mockResolvedValue(Buffer.from('PDF content'));

      const response = await request(app)
        .get('/export/download/export-123')
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('Test Course.pdf');
      expect(response.body).toEqual(Buffer.from('PDF content'));
    });

    it('should download from storage URL', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'export-123',
          format: 'pdf',
          storageUrl: 'https://storage.example.com/export.pdf',
          user_id: 'user-123'
        },
        error: null
      });

      supabaseAdmin.storage.from().download.mockResolvedValue({
        data: Buffer.from('PDF from storage'),
        error: null
      });

      const response = await request(app)
        .get('/export/download/export-123')
        .expect(200);

      expect(response.body).toEqual(Buffer.from('PDF from storage'));
    });

    it('should prevent downloading other users exports', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'export-123',
          user_id: 'other-user'
        },
        error: null
      });

      const response = await request(app)
        .get('/export/download/export-123')
        .expect(403);

      expect(response.body).toEqual({
        error: 'Access denied'
      });
    });
  });

  describe('POST /export/customize', () => {
    const customizeRequest = {
      courseId: 'course-123',
      format: 'pdf',
      template: 'modern',
      customizations: {
        primaryColor: '#ff0000',
        logo: 'https://example.com/logo.png',
        customCSS: '.title { font-size: 24px; }'
      }
    };

    it('should create customized export', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'course-123',
          user_id: 'user-123'
        },
        error: null
      });

      const response = await request(app)
        .post('/export/customize')
        .send(customizeRequest)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        exportId: expect.any(String),
        format: 'pdf',
        downloadUrl: expect.stringContaining('/export/download/'),
        message: 'Customized export created successfully'
      });
    });

    it('should validate customization options', async () => {
      const response = await request(app)
        .post('/export/customize')
        .send({
          courseId: 'course-123',
          format: 'pdf',
          customizations: {
            primaryColor: 'invalid-color'
          }
        })
        .expect(400);

      expect(response.body.details).toContain('primaryColor');
    });
  });

  describe('GET /export/history', () => {
    it('should list user export history', async () => {
      const mockExports = [
        {
          id: 'export-1',
          format: 'pdf',
          courseName: 'Course 1',
          created_at: '2024-01-01T00:00:00Z',
          fileSize: 1024000,
          status: 'completed'
        },
        {
          id: 'export-2',
          format: 'html',
          courseName: 'Course 2',
          created_at: '2024-01-02T00:00:00Z',
          fileSize: 512000,
          status: 'completed'
        }
      ];

      mockSupabase.limit.mockResolvedValue({
        data: mockExports,
        error: null
      });

      const response = await request(app)
        .get('/export/history')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        exports: mockExports
      });
    });

    it('should filter by format', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null
      });

      await request(app)
        .get('/export/history?format=pdf')
        .expect(200);

      expect(mockSupabase.eq).toHaveBeenCalledWith('format', 'pdf');
    });
  });

  describe('DELETE /export/:exportId', () => {
    it('should delete export', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'export-123',
          user_id: 'user-123',
          filePath: '/exports/export-123.pdf',
          storageUrl: 'https://storage.example.com/export-123.pdf'
        },
        error: null
      });

      mockSupabase.eq.mockResolvedValue({
        data: null,
        error: null
      });

      const response = await request(app)
        .delete('/export/export-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Export deleted successfully'
      });

      expect(fs.unlink).toHaveBeenCalledWith('/exports/export-123.pdf');
    });

    it('should prevent deleting other users exports', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'export-123',
          user_id: 'other-user'
        },
        error: null
      });

      const response = await request(app)
        .delete('/export/export-123')
        .expect(403);

      expect(response.body).toEqual({
        error: 'Access denied'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors', async () => {
      HTMLExporter.mockImplementation(() => {
        throw new Error('Service initialization failed');
      });

      const response = await request(app)
        .post('/export/html')
        .send({ courseId: 'course-123' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle file system errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'export-123', filePath: '/exports/test.pdf', user_id: 'user-123' },
        error: null
      });

      fs.readFile.mockRejectedValue(new Error('File not found'));

      const response = await request(app)
        .get('/export/download/export-123')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Export file not found'
      });
    });
  });
});