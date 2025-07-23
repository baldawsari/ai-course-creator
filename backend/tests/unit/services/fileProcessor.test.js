// Mock environment variables first
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.JINA_API_KEY = 'test-jina-key';

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
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: Buffer.from('test'), error: null })
      }))
    }
  }
}));

jest.mock('../../../src/config/database-simple', () => ({
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
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: Buffer.from('test'), error: null })
      }))
    }
  }
}));

jest.mock('../../../src/config/qdrant', () => ({
  qdrantConfig: {
    getClient: jest.fn()
  }
}));

jest.mock('pdf-parse', () => jest.fn());
jest.mock('mammoth', () => ({
  extractRawText: jest.fn(),
  convertToHtml: jest.fn(),
  images: {
    imgElement: jest.fn(() => () => ({ src: 'data:image/png;base64,test' }))
  }
}));

jest.mock('puppeteer', () => ({
  launch: jest.fn()
}));

jest.mock('../../../src/services/jinaClient', () => {
  return jest.fn().mockImplementation(() => ({
    embeddings: jest.fn().mockResolvedValue({
      data: [
        { embedding: [0.1, 0.2, 0.3] },
        { embedding: [0.4, 0.5, 0.6] }
      ]
    })
  }));
});

jest.mock('../../../src/services/documentProcessor', () => ({
  DocumentProcessor: jest.fn()
}));

jest.mock('../../../src/services/ragPipeline', () => ({
  retrieveRelevantContent: jest.fn(),
  ingestDocuments: jest.fn(),
  updateDocument: jest.fn(),
  deleteDocument: jest.fn(),
  healthCheck: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    access: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    writeFile: jest.fn()
  }
}));

const { fileProcessor } = require('../../../src/services/fileProcessor');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const puppeteer = require('puppeteer');
const { DocumentProcessor } = require('../../../src/services/documentProcessor');
const { supabaseAdmin } = require('../../../src/config/database');

describe('FileProcessor Service', () => {
  let mockDocumentProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DocumentProcessor
    mockDocumentProcessor = {
      processDocument: jest.fn().mockResolvedValue({
        chunks: [
          { 
            index: 0,
            content: 'test chunk', 
            tokens: 10,
            strategy: 'semantic',
            metadata: { position: { start: 0, end: 10 } }
          }
        ],
        qualityReport: {
          overallScore: 85,
          readability: { level: 'intermediate' }
        },
        metadata: { 
          language: 'en',
          processingTime: 1000
        }
      })
    };
    DocumentProcessor.mockImplementation(() => mockDocumentProcessor);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processFile', () => {
    const mockFileOptions = {
      filePath: '/tmp/test.pdf',
      fileName: 'test.pdf',
      fileType: 'application/pdf',
      courseId: 'course-123',
      userId: 'user-123',
      fileId: 'file-123'
    };
    
    let mockFromResult;
    
    beforeEach(() => {
      mockFromResult = {
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
        upsert: jest.fn().mockReturnThis()
      };
      supabaseAdmin.from.mockReturnValue(mockFromResult);
    });

    it('should process PDF file successfully', async () => {
      fs.access.mockResolvedValue();
      fs.stat.mockResolvedValue({ size: 1024000 }); // 1MB
      fs.readFile.mockResolvedValue(Buffer.from('PDF content'));
      fs.unlink.mockResolvedValue();
      
      pdfParse.mockResolvedValue({
        text: 'Extracted PDF text content',
        numpages: 5,
        info: { Title: 'Test PDF' }
      });
      
      // Mock the getDocumentProcessor method
      fileProcessor.getDocumentProcessor = jest.fn().mockReturnValue(mockDocumentProcessor);
      
      const result = await fileProcessor.processFile(mockFileOptions);
      
      expect(result).toHaveProperty('fileId', 'file-123');
      expect(result).toHaveProperty('fileName', 'test.pdf');
      expect(result).toHaveProperty('contentLength');
      expect(result).toHaveProperty('wordCount');
      expect(result).toHaveProperty('status', 'processed');
      expect(pdfParse).toHaveBeenCalled();
      expect(supabaseAdmin.from).toHaveBeenCalledWith('course_resources');
    });

    it('should process Word document successfully', async () => {
      const wordOptions = {
        ...mockFileOptions,
        fileName: 'test.docx',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };
      
      fs.access.mockResolvedValue();
      fs.stat.mockResolvedValue({ size: 512000 }); // 500KB
      fs.readFile.mockResolvedValue(Buffer.from('Word content'));
      fs.unlink.mockResolvedValue();
      
      mammoth.extractRawText.mockResolvedValue({
        value: 'Extracted Word text content'
      });
      mammoth.convertToHtml.mockResolvedValue({
        value: '<p>Extracted Word HTML</p>'
      });
      
      const result = await fileProcessor.processFile(wordOptions);
      
      expect(result).toHaveProperty('fileId', 'file-123');
      expect(result).toHaveProperty('status', 'processed');
      expect(mammoth.extractRawText).toHaveBeenCalled();
    });
    
    it('should process text file successfully', async () => {
      const textOptions = {
        ...mockFileOptions,
        fileName: 'test.txt',
        fileType: 'text/plain'
      };
      
      fs.access.mockResolvedValue();
      fs.stat.mockResolvedValue({ size: 1024 }); // 1KB
      fs.readFile.mockResolvedValue('Plain text content');
      fs.unlink.mockResolvedValue();
      
      const result = await fileProcessor.processFile(textOptions);
      
      expect(result).toHaveProperty('fileId', 'file-123');
      expect(result).toHaveProperty('status', 'processed');
      expect(result.contentLength).toBeGreaterThan(0);
    });
    
    it('should handle large files', async () => {
      fs.access.mockResolvedValue();
      fs.stat.mockResolvedValue({ size: 51 * 1024 * 1024 }); // 51MB (over 50MB limit)
      
      await expect(fileProcessor.validateFile(mockFileOptions.filePath, mockFileOptions.fileType))
        .rejects.toThrow('File validation failed: File size exceeds 50MB limit');
    });
    
    it('should handle unsupported file types', async () => {
      const unsupportedOptions = {
        ...mockFileOptions,
        fileName: 'test.exe',
        fileType: 'application/x-executable'
      };
      
      fs.access.mockResolvedValue();
      fs.stat.mockResolvedValue({ size: 1024 });
      
      await expect(fileProcessor.processFile(unsupportedOptions))
        .rejects.toThrow('Unsupported file type');
    });
    
    it('should update file status on error', async () => {
      fs.stat.mockRejectedValue(new Error('File not found'));
      
      await expect(fileProcessor.processFile(mockFileOptions))
        .rejects.toThrow('File not found');
      
      expect(supabaseAdmin.from).toHaveBeenCalledWith('course_resources');
      expect(mockFromResult.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed'
        })
      );
    });
  });

  describe('processUrl', () => {
    const mockUrlOptions = {
      resourceId: 'resource-123',
      url: 'https://example.com/article',
      title: 'Test Article',
      courseId: 'course-123',
      userId: 'user-123'
    };
    
    let mockBrowser;
    let mockPage;
    
    beforeEach(() => {
      mockPage = {
        goto: jest.fn(),
        evaluate: jest.fn(),
        close: jest.fn(),
        setViewport: jest.fn(),
        setUserAgent: jest.fn(),
        setDefaultNavigationTimeout: jest.fn(),
        setDefaultTimeout: jest.fn(),
        waitForSelector: jest.fn(),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('screenshot'))
      };
      
      mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };
      
      puppeteer.launch.mockResolvedValue(mockBrowser);
    });
    
    it('should process URL successfully', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        title: 'Article Title',
        description: 'Article description',
        content: 'Article content text that is long enough to be meaningful',
        headings: [{ level: 1, text: 'Main Heading' }],
        url: 'https://example.com/article'
      });
      
      // Mock getDocumentProcessor
      fileProcessor.getDocumentProcessor = jest.fn().mockReturnValue(mockDocumentProcessor);
      
      const result = await fileProcessor.processUrl(mockUrlOptions);
      
      expect(result).toHaveProperty('resourceId', 'resource-123');
      expect(result).toHaveProperty('url', 'https://example.com/article');
      expect(result).toHaveProperty('status', 'processed');
      expect(puppeteer.launch).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalledWith(mockUrlOptions.url, expect.any(Object));
      expect(mockBrowser.close).toHaveBeenCalled();
    });
    
    it('should handle URL processing errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Network error'));
      
      await expect(fileProcessor.processUrl(mockUrlOptions))
        .rejects.toThrow();
      
      expect(mockBrowser.close).toHaveBeenCalled();
    });
    
    it('should handle empty content from URL', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        title: 'Empty Page',
        description: '',
        content: '',
        headings: [],
        url: 'https://example.com/empty'
      });
      
      await expect(fileProcessor.processUrl(mockUrlOptions))
        .rejects.toThrow('No meaningful content extracted from URL');
    });
  });

  describe('generateEmbeddingsForChunks', () => {
    it('should generate embeddings for chunks', async () => {
      const resourceId = 'resource-123';
      const chunks = [
        { 
          index: 0,
          content: 'Chunk 1 content', 
          tokens: 10,
          strategy: 'semantic',
          metadata: { position: { start: 0, end: 15 } }
        },
        { 
          index: 1,
          content: 'Chunk 2 content', 
          tokens: 10,
          strategy: 'semantic',
          metadata: { position: { start: 16, end: 31 } }
        }
      ];
      const onProgress = jest.fn();
      
      const result = await fileProcessor.generateEmbeddingsForChunks(
        resourceId, 
        chunks, 
        onProgress
      );
      
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('content_embeddings');
      expect(onProgress).toHaveBeenCalled();
    });
    
    it('should handle empty chunks', async () => {
      const result = await fileProcessor.generateEmbeddingsForChunks(
        'resource-123',
        []
      );
      
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(0);
    });
    
    it('should batch large chunk sets', async () => {
      const chunks = Array(25).fill(null).map((_, i) => ({
        index: i,
        content: `Chunk ${i} content`,
        tokens: 10,
        strategy: 'semantic',
        metadata: { position: { start: i * 20, end: (i + 1) * 20 } }
      }));
      
      const result = await fileProcessor.generateEmbeddingsForChunks('resource-123', chunks);
      
      // Result array only contains successfully processed chunks
      expect(result.length).toBeGreaterThan(0);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('content_embeddings');
    });
  });

  describe('processPDF', () => {
    it('should extract text from PDF', async () => {
      const filePath = '/tmp/test.pdf';
      const fileName = 'test.pdf';
      const onProgress = jest.fn();
      
      fs.readFile.mockResolvedValue(Buffer.from('PDF content'));
      pdfParse.mockResolvedValue({
        text: 'Extracted PDF text',
        numpages: 10,
        info: {
          Title: 'PDF Title',
          Author: 'PDF Author'
        }
      });
      
      const result = await fileProcessor.processPDF(filePath, fileName, onProgress);
      
      expect(result).toHaveProperty('text', 'Extracted PDF text');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('pages', 10);
      expect(result.metadata).toHaveProperty('title', 'PDF Title');
      expect(onProgress).toHaveBeenCalledWith(20);
      expect(onProgress).toHaveBeenCalledWith(30);
      expect(onProgress).toHaveBeenCalledWith(50);
    });
    
    it('should handle PDF parsing errors', async () => {
      fs.readFile.mockResolvedValue(Buffer.from('Invalid PDF'));
      pdfParse.mockRejectedValue(new Error('Invalid PDF format'));
      
      await expect(fileProcessor.processPDF('/tmp/bad.pdf', 'bad.pdf'))
        .rejects.toThrow('Invalid or corrupted PDF file');
    });
  });

  describe('processWord', () => {
    it('should extract text from Word document', async () => {
      const filePath = '/tmp/test.docx';
      const fileName = 'test.docx';
      const onProgress = jest.fn();
      
      fs.stat.mockResolvedValue({ size: 100 });
      fs.readFile.mockResolvedValue(Buffer.from('Word content'));
      mammoth.extractRawText.mockResolvedValue({
        value: 'Extracted Word text',
        messages: []
      });
      mammoth.convertToHtml.mockResolvedValue({
        value: '<p>Extracted Word HTML</p>',
        messages: []
      });
      
      const result = await fileProcessor.processWord(filePath, fileName, onProgress);
      
      expect(result).toHaveProperty('text', 'Extracted Word text');
      expect(result).toHaveProperty('html', '<p>Extracted Word HTML</p>');
      expect(result).toHaveProperty('metadata');
      expect(onProgress).toHaveBeenCalledWith(20);
    });
    
    it('should handle Word processing errors', async () => {
      fs.readFile.mockResolvedValue(Buffer.from('Invalid Word'));
      mammoth.extractRawText.mockRejectedValue(new Error('Invalid format'));
      
      await expect(fileProcessor.processWord('/tmp/bad.docx', 'bad.docx'))
        .rejects.toThrow('Word document processing failed: Invalid format');
    });
  });

  describe('uploadToStorage', () => {
    let mockStorageResult;
    
    beforeEach(() => {
      mockStorageResult = {
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: Buffer.from('test'), error: null })
      };
      supabaseAdmin.storage.from.mockReturnValue(mockStorageResult);
    });
    
    it('should upload file to storage', async () => {
      const filePath = '/tmp/test.pdf';
      const fileName = 'test.pdf';
      const courseId = 'course-123';
      
      fs.readFile.mockResolvedValue(Buffer.from('File content'));
      
      const result = await fileProcessor.uploadToStorage(filePath, fileName, courseId);
      
      expect(result).toMatch(/^courses\/course-123\/.+\.pdf$/);
      expect(supabaseAdmin.storage.from).toHaveBeenCalledWith('course-files');
      expect(mockStorageResult.upload).toHaveBeenCalledWith(
        expect.stringContaining(`courses/${courseId}/`),
        expect.any(Buffer),
        expect.objectContaining({
          contentType: 'application/pdf'
        })
      );
    });
    
    it('should handle upload errors', async () => {
      fs.readFile.mockResolvedValue(Buffer.from('File content'));
      supabaseAdmin.storage.from().upload.mockResolvedValue({
        data: null,
        error: new Error('Storage error')
      });
      
      mockStorageResult.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage error' }
      });
      
      await expect(fileProcessor.uploadToStorage('/tmp/test.pdf', 'test.pdf', 'course-123'))
        .rejects.toThrow('Failed to upload file to storage: Storage upload failed: Storage error');
    });
  });

  describe('validateFile', () => {
    it('should validate files successfully', async () => {
      fs.stat.mockResolvedValue({ size: 1024 * 1024 }); // 1MB
      fs.access.mockResolvedValue();
      
      const result = await fileProcessor.validateFile('/tmp/test.pdf', 'application/pdf');
      expect(result).toBe(true);
    });
    
    it('should handle file access errors', async () => {
      fs.stat.mockRejectedValue(new Error('File not found'));
      
      await expect(fileProcessor.validateFile('/tmp/missing.pdf', 'application/pdf'))
        .rejects.toThrow('File validation failed: File not found');
    });
    
    it('should validate large files', async () => {
      fs.stat.mockResolvedValue({ size: 51 * 1024 * 1024 }); // 51MB
      fs.access.mockResolvedValue();
      
      await expect(fileProcessor.validateFile('/tmp/large.pdf', 'application/pdf'))
        .rejects.toThrow('File validation failed: File size exceeds 50MB limit');
    });
  });

  describe('error handling and retries', () => {
    let mockFromResult;
    
    beforeEach(() => {
      mockFromResult = {
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
        upsert: jest.fn().mockReturnThis()
      };
      supabaseAdmin.from.mockReturnValue(mockFromResult);
    });
    
    it('should update status on processing failure', async () => {
      const options = {
        filePath: '/tmp/test.pdf',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        courseId: 'course-123',
        userId: 'user-123',
        fileId: 'file-123'
      };
      
      fs.access.mockRejectedValue(new Error('File not found'));
      
      await expect(fileProcessor.processFile(options))
        .rejects.toThrow('File not found');
      
      expect(supabaseAdmin.from).toHaveBeenCalledWith('course_resources');
      expect(mockFromResult.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed'
        })
      );
    });
  });

  describe('progress tracking', () => {
    it('should report progress during file processing', async () => {
      const onProgress = jest.fn();
      const options = {
        filePath: '/tmp/test.txt',
        fileName: 'test.txt',
        fileType: 'text/plain',
        courseId: 'course-123',
        userId: 'user-123',
        fileId: 'file-123',
        onProgress
      };
      
      // Mock storage upload
      const mockStorageResult = {
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: Buffer.from('test'), error: null })
      };
      supabaseAdmin.storage.from.mockReturnValue(mockStorageResult);
      
      fs.access.mockResolvedValue();
      fs.stat.mockResolvedValue({ size: 1024 });
      fs.readFile.mockResolvedValue('Text content');
      fs.unlink.mockResolvedValue();
      
      await fileProcessor.processFile(options);
      
      // Progress should be called with numeric values
      expect(onProgress).toHaveBeenCalledWith(5);
      expect(onProgress).toHaveBeenCalledWith(10);
      expect(onProgress).toHaveBeenCalledWith(60);
      expect(onProgress).toHaveBeenCalledWith(70);
      expect(onProgress).toHaveBeenCalledWith(100);
    });
  });

  describe('processText', () => {
    it('should process text file successfully', async () => {
      const filePath = '/tmp/test.txt';
      const fileName = 'test.txt';
      const onProgress = jest.fn();
      
      fs.readFile.mockResolvedValue('Plain text content\r\n\r\nWith multiple lines');
      fs.stat.mockResolvedValue({ size: 50 });
      
      const result = await fileProcessor.processText(filePath, fileName, onProgress);
      
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('wordCount', 6); // 'Plain text content With multiple lines'
      expect(onProgress).toHaveBeenCalledWith(20);
      expect(onProgress).toHaveBeenCalledWith(40);
      expect(onProgress).toHaveBeenCalledWith(50);
    });
    
    it('should handle empty text files', async () => {
      fs.readFile.mockResolvedValue('   ');
      
      await expect(fileProcessor.processText('/tmp/empty.txt', 'empty.txt'))
        .rejects.toThrow('Text file is empty or contains no readable content');
    });
  });

  describe('cleanExtractedContent', () => {
    it('should clean extracted content', () => {
      const dirtyContent = '  Hello   world\n\n\n\nTest  content  ';
      const cleaned = fileProcessor.cleanExtractedContent(dirtyContent);
      
      expect(cleaned).toBe('Hello world Test content'); // cleanExtractedContent removes all multiple whitespace
    });
    
    it('should handle empty content', () => {
      const cleaned = fileProcessor.cleanExtractedContent('');
      expect(cleaned).toBe('');
    });
    
    it('should handle null content', () => {
      const cleaned = fileProcessor.cleanExtractedContent(null);
      expect(cleaned).toBe('');
    });
  });

  describe('chunkContent', () => {
    it('should chunk content by sentences', () => {
      const content = 'First sentence. Second sentence! Third sentence? Fourth sentence.';
      const chunks = fileProcessor.chunkContent(content, 30);
      
      expect(chunks).toHaveLength(4); // 4 sentences in the content
      expect(chunks[0].text).toBe('First sentence');
      expect(chunks[0]).toHaveProperty('startIndex');
      expect(chunks[0]).toHaveProperty('endIndex');
      expect(chunks[0]).toHaveProperty('wordCount');
    });
    
    it('should handle content without sentence breaks', () => {
      const content = 'This is a very long text without any sentence breaks that should be chunked based on size';
      const chunks = fileProcessor.chunkContent(content, 50);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(content.trim());
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types', () => {
      expect(fileProcessor.getMimeType('test.pdf')).toBe('application/pdf');
      expect(fileProcessor.getMimeType('test.doc')).toBe('application/msword');
      expect(fileProcessor.getMimeType('test.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(fileProcessor.getMimeType('test.txt')).toBe('text/plain');
      expect(fileProcessor.getMimeType('test.unknown')).toBe('application/octet-stream');
    });
  });

  describe('updateFileStatus', () => {
    let mockFromResult;
    
    beforeEach(() => {
      mockFromResult = {
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
        upsert: jest.fn().mockReturnThis()
      };
      supabaseAdmin.from.mockReturnValue(mockFromResult);
    });
    
    it('should update file status in database', async () => {
      await fileProcessor.updateFileStatus('file-123', 'processed');
      
      expect(supabaseAdmin.from).toHaveBeenCalledWith('course_resources');
      expect(mockFromResult.update).toHaveBeenCalledWith({
        status: 'processed',
        updated_at: expect.any(String)
      });
      expect(mockFromResult.eq).toHaveBeenCalledWith('id', 'file-123');
    });
  });

  describe('saveContentToStorage', () => {
    let mockStorageResult;
    
    beforeEach(() => {
      mockStorageResult = {
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: Buffer.from('test'), error: null })
      };
      supabaseAdmin.storage.from.mockReturnValue(mockStorageResult);
    });
    
    it('should save content to storage', async () => {
      const content = 'Test content to save';
      const fileName = 'content.txt';
      const courseId = 'course-123';
      
      const result = await fileProcessor.saveContentToStorage(content, fileName, courseId);
      
      expect(result).toMatch(/^courses\/course-123\/.+\.txt$/);
      expect(supabaseAdmin.storage.from).toHaveBeenCalledWith('course-files');
      expect(mockStorageResult.upload).toHaveBeenCalledWith(
        expect.stringContaining(`courses/${courseId}/`),
        content,
        expect.objectContaining({
          contentType: 'text/plain'
        })
      );
    });
  });

  describe('getDocumentProcessor', () => {
    it('should return document processor instance', () => {
      const docProcessor = fileProcessor.getDocumentProcessor();
      expect(docProcessor).toBeDefined();
      expect(docProcessor).toHaveProperty('processDocument');
    });
    
    it('should return cached instance on subsequent calls', () => {
      const first = fileProcessor.getDocumentProcessor();
      const second = fileProcessor.getDocumentProcessor();
      expect(first).toBe(second);
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for legacy content', async () => {
      const resourceId = 'resource-123';
      const content = 'This is test content for embedding generation. It should be chunked properly.';
      const onProgress = jest.fn();
      
      await fileProcessor.generateEmbeddings(resourceId, content, onProgress);
      
      expect(supabaseAdmin.from).toHaveBeenCalledWith('content_embeddings');
      expect(onProgress).toHaveBeenCalledWith(85);
      expect(onProgress).toHaveBeenCalledWith(90);
    });
    
    it('should handle embedding generation errors gracefully', async () => {
      const resourceId = 'resource-123';
      const content = 'Test content';
      
      // Mock JinaClient to throw error
      const mockJinaClient = require('../../../src/services/jinaClient');
      mockJinaClient.mockImplementation(() => ({
        embeddings: jest.fn().mockRejectedValue(new Error('Embedding API error'))
      }));
      
      // Should not throw error, just log warning
      await expect(fileProcessor.generateEmbeddings(resourceId, content))
        .resolves.not.toThrow();
    });
  });

  describe('processURL - additional scenarios', () => {
    let mockBrowser;
    let mockPage;
    
    beforeEach(() => {
      mockPage = {
        goto: jest.fn(),
        evaluate: jest.fn(),
        close: jest.fn(),
        setViewport: jest.fn(),
        setUserAgent: jest.fn(),
        setDefaultNavigationTimeout: jest.fn(),
        setDefaultTimeout: jest.fn(),
        waitForSelector: jest.fn(),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('screenshot'))
      };
      
      mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };
      
      puppeteer.launch.mockResolvedValue(mockBrowser);
    });
    
    it('should handle waitForSelector timeout', async () => {
      mockPage.waitForSelector.mockRejectedValue(new Error('Timeout'));
      mockPage.evaluate.mockResolvedValue({
        title: 'Page Title',
        description: 'Page description',
        content: 'Page content that is long enough',
        headings: [],
        url: 'https://example.com'
      });
      
      const result = await fileProcessor.processURL('https://example.com', 'Test Page');
      
      expect(result).toHaveProperty('text', 'Page content that is long enough');
      expect(mockPage.waitForSelector).toHaveBeenCalled();
    });
    
    it('should retry navigation on failure', async () => {
      mockPage.goto
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce();
      
      mockPage.evaluate.mockResolvedValue({
        title: 'Page Title',
        description: 'Page description',
        content: 'Page content after retry',
        headings: [],
        url: 'https://example.com'
      });
      
      const result = await fileProcessor.processURL('https://example.com', 'Test Page');
      
      expect(result).toHaveProperty('text', 'Page content after retry');
      expect(mockPage.goto).toHaveBeenCalledTimes(3);
    });
    
    it('should handle screenshot failure gracefully', async () => {
      mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));
      mockPage.evaluate.mockResolvedValue({
        title: 'Page Title',
        description: 'Page description',
        content: 'Page content without screenshot',
        headings: [],
        url: 'https://example.com'
      });
      
      const result = await fileProcessor.processURL('https://example.com', 'Test Page');
      
      expect(result).toHaveProperty('text', 'Page content without screenshot');
      expect(result.metadata).toHaveProperty('hasScreenshot', false);
    });
  });

  describe('processFile - additional scenarios', () => {
    it('should handle file processing without document processor', async () => {
      const options = {
        filePath: '/tmp/test.txt',
        fileName: 'test.txt',
        fileType: 'text/plain',
        courseId: 'course-123',
        userId: 'user-123',
        fileId: 'file-123'
      };
      
      // Mock getDocumentProcessor to return null
      fileProcessor.getDocumentProcessor = jest.fn().mockReturnValue(null);
      
      // Mock storage
      const mockStorageResult = {
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null })
      };
      supabaseAdmin.storage.from.mockReturnValue(mockStorageResult);
      
      fs.access.mockResolvedValue();
      fs.stat.mockResolvedValue({ size: 1024 });
      fs.readFile.mockResolvedValue('Text content');
      fs.unlink.mockResolvedValue();
      
      const result = await fileProcessor.processFile(options);
      
      expect(result).toHaveProperty('status', 'processed');
      expect(fileProcessor.getDocumentProcessor).toHaveBeenCalled();
    });
    
    it('should handle document processor failure gracefully', async () => {
      const options = {
        filePath: '/tmp/test.txt',
        fileName: 'test.txt',
        fileType: 'text/plain',
        courseId: 'course-123',
        userId: 'user-123',
        fileId: 'file-123'
      };
      
      // Mock document processor to throw error
      mockDocumentProcessor.processDocument.mockRejectedValue(new Error('Processing failed'));
      fileProcessor.getDocumentProcessor = jest.fn().mockReturnValue(mockDocumentProcessor);
      
      // Mock storage
      const mockStorageResult = {
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null })
      };
      supabaseAdmin.storage.from.mockReturnValue(mockStorageResult);
      
      fs.access.mockResolvedValue();
      fs.stat.mockResolvedValue({ size: 1024 });
      fs.readFile.mockResolvedValue('Text content');
      fs.unlink.mockResolvedValue();
      
      const result = await fileProcessor.processFile(options);
      
      expect(result).toHaveProperty('status', 'processed');
      // Should fall back to basic processing
    });
  });
});