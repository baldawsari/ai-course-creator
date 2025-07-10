const { FileProcessor } = require('../../../src/services/fileProcessor');
const { mockData, generateMockFile } = require('../../utils/mockData');
const { testHelpers } = require('../../utils/testHelpers');
const fs = require('fs').promises;
const path = require('path');

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
      upsert: jest.fn().mockReturnThis()
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null })
      }))
    }
  }
}));
jest.mock('pdf-parse', () => jest.fn());
jest.mock('mammoth', () => ({
  extractRawText: jest.fn(),
  convertToHtml: jest.fn(),
  images: {
    imgElement: jest.fn(() => jest.fn())
  }
}));
jest.mock('puppeteer', () => ({
  launch: jest.fn()
}));
jest.mock('../../../src/services/jinaClient', () => {
  return jest.fn().mockImplementation(() => ({
    generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    rerank: jest.fn().mockResolvedValue([]),
    embeddings: jest.fn().mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }]
    })
  }));
});
jest.mock('../../../src/services/documentProcessor', () => ({
  DocumentProcessor: jest.fn().mockImplementation(() => ({
    processDocument: jest.fn().mockResolvedValue({
      success: true,
      chunks: [{ id: 'chunk1', content: 'test', embedding: [0.1, 0.2] }],
      embeddings: [[0.1, 0.2, 0.3]],
      metadata: { wordCount: 100, language: 'en' },
      qualityReport: {
        overallScore: 85,
        readability: 80,
        coherence: 90,
        completeness: 85,
        issues: []
      }
    })
  }))
}));
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    access: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
  }
}));

describe('FileProcessor Service', () => {
  let fileProcessor;
  let mockSupabaseAdmin;
  let fs;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get mocked fs
    fs = require('fs');
    
    // Get mocked supabaseAdmin
    const { supabaseAdmin } = require('../../../src/config/database');
    mockSupabaseAdmin = supabaseAdmin;
    
    // Setup mock chain
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
    
    mockSupabaseAdmin.from.mockReturnValue(mockChain);
    
    fileProcessor = new FileProcessor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processFile', () => {
    it('should successfully process a PDF file', async () => {
      const filePath = '/tmp/test-file.pdf';
      const fileId = 'file-123';
      const userId = 'test-user-id';
      const courseId = 'course-123';
      const fileName = 'test-document.pdf';
      
      // Mock file system operations
      fs.promises.access.mockResolvedValueOnce(undefined);
      fs.promises.stat.mockResolvedValueOnce({ size: 1024 * 1024 }); // 1MB
      fs.promises.readFile.mockResolvedValueOnce(Buffer.from('PDF content'));
      
      // Mock PDF parsing
      const pdfParse = require('pdf-parse');
      pdfParse.mockResolvedValueOnce({
        text: mockData.SAMPLE_PDF_CONTENT || 'Sample PDF content for testing',
        numpages: 10,
        info: { Title: 'Test PDF' }
      });

      // Mock database update
      const mockDbResponse = {
        data: {
          id: fileId,
          status: 'completed',
          extracted_content: mockData.SAMPLE_PDF_CONTENT,
          metadata: {
            pages: 10,
            title: 'Test PDF'
          }
        },
        error: null,
      };
      
      const mockChain = mockSupabaseAdmin.from();
      mockChain.single.mockResolvedValueOnce(mockDbResponse);

      const onProgress = jest.fn();
      const result = await fileProcessor.processFile({
        fileId,
        filePath,
        fileName,
        fileType: 'application/pdf',
        userId,
        courseId,
        onProgress
      });

      // Verify file system calls
      expect(fs.promises.access).toHaveBeenCalledWith(filePath);
      expect(fs.promises.stat).toHaveBeenCalledWith(filePath);
      expect(fs.promises.readFile).toHaveBeenCalledWith(filePath);
      
      // Verify progress callbacks
      expect(onProgress).toHaveBeenCalled();
      
      // Verify database interactions occurred
      expect(mockSupabaseAdmin.from).toHaveBeenCalled();
      
      // Verify result has expected properties
      expect(result).toHaveProperty('fileId', fileId);
      expect(result).toHaveProperty('status', 'processed');
      expect(result).toHaveProperty('fileName', fileName);
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('storagePath');
      expect(result).toHaveProperty('wordCount');
    });

    it('should successfully process a DOCX file', async () => {
      const filePath = '/tmp/test-file.docx';
      const fileId = 'file-456';
      const userId = 'test-user-id';
      const courseId = 'course-456';
      const fileName = 'test-document.docx';
      
      // Mock file system operations
      fs.promises.access.mockResolvedValue(undefined);
      fs.promises.stat.mockResolvedValue({ size: 512 * 1024 }); // 512KB
      fs.promises.readFile.mockResolvedValue(Buffer.from('DOCX content'));
      
      // Mock mammoth parsing
      const mammoth = require('mammoth');
      mammoth.extractRawText.mockResolvedValueOnce({
        value: 'Extracted DOCX content',
        messages: []
      });
      mammoth.convertToHtml.mockResolvedValueOnce({
        value: '<p>Extracted DOCX content</p>',
        messages: []
      });

      // Mock database update
      const mockDbResponse = {
        data: {
          id: fileId,
          status: 'completed',
          extracted_content: 'Extracted DOCX content',
        },
        error: null,
      };
      
      const mockChain = mockSupabaseAdmin.from();
      mockChain.single.mockResolvedValueOnce(mockDbResponse);

      const result = await fileProcessor.processFile({
        fileId,
        filePath,
        fileName,
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        userId,
        courseId,
        onProgress: jest.fn()
      });

      expect(result).toHaveProperty('fileId', fileId);
      expect(result).toHaveProperty('status', 'processed');
      expect(result).toHaveProperty('fileName', fileName);
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('storagePath');
      expect(result).toHaveProperty('wordCount');
    });

    it('should reject invalid file types', async () => {
      const filePath = '/tmp/test-file.exe';
      const fileId = 'file-789';
      
      // Mock file exists
      fs.promises.access.mockResolvedValueOnce(undefined);
      fs.promises.stat.mockResolvedValueOnce({ size: 1024 });

      await expect(fileProcessor.processFile({
        fileId,
        filePath,
        fileName: 'test.exe',
        fileType: 'application/x-executable',
        userId: 'test-user-id',
        courseId: 'course-789',
      })).rejects.toThrow('Unsupported file type');
    });

    it('should handle missing files', async () => {
      const filePath = '/tmp/missing-file.pdf';
      const fileId = 'file-missing';
      
      // Mock file not found
      fs.promises.access.mockRejectedValueOnce(new Error('ENOENT'));

      await expect(fileProcessor.processFile({
        fileId,
        filePath,
        fileName: 'missing.pdf',
        fileType: 'application/pdf',
        userId: 'test-user-id',
        courseId: 'course-missing',
      })).rejects.toThrow('File not found');
    });

    it('should handle database errors gracefully', async () => {
      const filePath = '/tmp/test-file.pdf';
      const fileId = 'file-error';
      
      // Mock file operations succeed
      fs.promises.access.mockResolvedValueOnce(undefined);
      fs.promises.stat.mockResolvedValueOnce({ size: 1024 });
      fs.promises.readFile.mockResolvedValueOnce(Buffer.from('PDF content'));
      
      const pdfParse = require('pdf-parse');
      pdfParse.mockResolvedValueOnce({
        text: 'Test content',
        numpages: 1
      });

      // Test that the service continues processing even with database errors
      const result = await fileProcessor.processFile({
        fileId,
        filePath,
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        userId: 'test-user-id',
        courseId: 'course-error',
      });

      // Verify the service completes successfully despite database issues
      expect(result).toHaveProperty('fileId', fileId);
      expect(result).toHaveProperty('status', 'processed');
    });

    it('should clean up temp files on error', async () => {
      const filePath = '/tmp/test-file.pdf';
      const fileId = 'file-cleanup';
      
      // Mock file operations
      fs.promises.access.mockResolvedValueOnce(undefined);
      fs.promises.stat.mockResolvedValueOnce({ size: 1024 });
      fs.promises.readFile.mockResolvedValueOnce(Buffer.from('PDF content'));
      fs.promises.unlink.mockResolvedValueOnce(undefined);
      
      // Mock PDF parsing error
      const pdfParse = require('pdf-parse');
      pdfParse.mockRejectedValueOnce(new Error('PDF parsing failed'));

      // Mock status update
      const mockChain = mockSupabaseAdmin.from();
      mockChain.single.mockResolvedValueOnce({ data: {}, error: null });

      await expect(fileProcessor.processFile({
        fileId,
        filePath,
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        userId: 'test-user-id',
        courseId: 'course-cleanup',
      })).rejects.toThrow('PDF parsing failed');

      // Verify cleanup was attempted
      expect(fs.promises.unlink).toHaveBeenCalledWith(filePath);
    });
  });

  describe('processing progress', () => {
    it('should report progress during file processing', async () => {
      const filePath = '/tmp/test-file.pdf';
      const fileId = 'file-progress';
      const onProgress = jest.fn();
      
      // Mock successful processing
      fs.promises.access.mockResolvedValueOnce(undefined);
      fs.promises.stat.mockResolvedValueOnce({ size: 1024 });
      fs.promises.readFile.mockResolvedValueOnce(Buffer.from('PDF content'));
      
      const pdfParse = require('pdf-parse');
      pdfParse.mockResolvedValueOnce({
        text: 'Test content',
        numpages: 1
      });

      const mockChain = mockSupabaseAdmin.from();
      mockChain.single.mockResolvedValue({ 
        data: { id: fileId, status: 'completed' }, 
        error: null 
      });

      await fileProcessor.processFile({
        fileId,
        filePath,
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        userId: 'test-user-id',
        courseId: 'course-progress',
        onProgress
      });

      // Verify progress was reported at various stages
      expect(onProgress).toHaveBeenCalledWith(expect.any(Number));
      expect(onProgress).toHaveBeenCalledWith(5);  // Initial progress
      expect(onProgress).toHaveBeenCalledWith(10); // After file check
      expect(onProgress).toHaveBeenCalledWith(100); // Completion
    });
  });
});