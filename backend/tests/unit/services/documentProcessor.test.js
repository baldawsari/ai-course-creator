const { DocumentProcessor, documentQueue } = require('../../../src/services/documentProcessor');
const { supabaseAdmin } = require('../../../src/config/database');
const Bull = require('bull');
const natural = require('natural');
const { encode } = require('gpt-3-encoder');
const langdetect = require('langdetect');
const readability = require('readability-scores');

jest.mock('../../../src/config/database', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}));
jest.mock('bull');
jest.mock('langdetect');
jest.mock('readability-scores');
jest.mock('winston', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    Console: jest.fn()
  }
}));

describe('DocumentProcessor', () => {
  let documentProcessor;
  let mockSupabase;
  let mockQueue;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockQueue = {
      on: jest.fn(),
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      getJob: jest.fn(),
      process: jest.fn()
    };
    
    Bull.mockReturnValue(mockQueue);
    
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null })
    };
    
    supabaseAdmin.from.mockReturnValue(mockSupabase);
    
    // Mock langdetect
    langdetect.detectOne.mockReturnValue('en');
    
    // Mock readability-scores
    readability.mockReturnValue({
      flesch: 60,
      fleschKincaid: 10,
      gunningFog: 10,
      smog: 8,
      ari: 9,
      colemanLiau: 9
    });
    
    documentProcessor = new DocumentProcessor();
  });

  describe('constructor', () => {
    it('should initialize with correct defaults', () => {
      expect(documentProcessor.maxChunkSize).toBe(1000);
      expect(documentProcessor.minChunkSize).toBe(100);
      expect(documentProcessor.overlapSize).toBe(50);
      expect(documentProcessor.tokenizer).toBeInstanceOf(natural.SentenceTokenizer);
      expect(documentProcessor.tfidf).toBeInstanceOf(natural.TfIdf);
    });
  });

  describe('processDocument', () => {
    const mockDocument = {
      id: 'doc-123',
      type: 'pdf',
      content: 'This is a test document with some content. It has multiple sentences. This is the third sentence.',
      userId: 'user-123'
    };

    it('should process document successfully', async () => {
      // Mock storeProcessingResults response
      mockSupabase.insert.mockResolvedValue({ data: { id: 'stored-123' }, error: null });
      
      const result = await documentProcessor.processDocument(mockDocument);

      expect(result).toBeDefined();
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(mockSupabase.update).toHaveBeenCalled();
      // Check that from was called with correct tables
      expect(supabaseAdmin.from).toHaveBeenCalledWith('content_embeddings');
      expect(supabaseAdmin.from).toHaveBeenCalledWith('course_resources');
    });

    it('should handle document validation failure', async () => {
      const invalidDoc = { id: 'doc-123', content: null };

      await expect(documentProcessor.processDocument(invalidDoc))
        .rejects.toThrow('Invalid document content');
    });

    it('should use custom chunking strategy', async () => {
      const options = { chunkingStrategy: 'fixed' };
      const result = await documentProcessor.processDocument(mockDocument, options);

      expect(result).toBeDefined();
    });
  });

  describe('ingestDocument', () => {
    it('should ingest document and extract metadata', async () => {
      const document = {
        id: 'doc-123',
        content: 'Test Document Title\n\nThis is the document content.'
      };

      const result = await documentProcessor.ingestDocument(document);

      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('structure');
      expect(result).toHaveProperty('originalLength', document.content.length);
      expect(result.content).not.toContain('\0'); // Null bytes removed
    });

    it('should throw error for invalid content', async () => {
      const document = { id: 'doc-123', content: null };

      await expect(documentProcessor.ingestDocument(document))
        .rejects.toThrow('Invalid document content');
    });
  });

  describe('sanitizeContent', () => {
    it('should remove null bytes', () => {
      const content = 'Hello\0World';
      const sanitized = documentProcessor.sanitizeContent(content);

      expect(sanitized).toBe('HelloWorld'); // Null byte removed, not replaced with space
    });

    it('should normalize whitespace', () => {
      const content = '  Hello   \n\n  World  ';
      const sanitized = documentProcessor.sanitizeContent(content);

      expect(sanitized).toBe('Hello World');
    });

    it('should remove control characters', () => {
      const content = 'Hello\x01\x02World';
      const sanitized = documentProcessor.sanitizeContent(content);

      expect(sanitized).not.toContain('\x01');
      expect(sanitized).not.toContain('\x02');
    });
  });

  describe('extractMetadata', () => {
    it('should extract title from content', async () => {
      const content = 'Document Title\n\nThis is the body of the document.';
      const metadata = await documentProcessor.extractMetadata({}, content);

      expect(metadata).toHaveProperty('title', 'Document Title');
    });

    it('should detect language', async () => {
      const content = 'This is an English document with multiple sentences.';
      const metadata = await documentProcessor.extractMetadata({}, content);

      expect(metadata).toHaveProperty('language', 'en');
    });

    it('should handle language detection failure', async () => {
      // Mock langdetect to throw error
      langdetect.detectOne.mockImplementation(() => {
        throw new Error('Language detection failed');
      });

      const content = 'Test content';
      const metadata = await documentProcessor.extractMetadata({}, content);

      expect(metadata.language).toBe('en'); // Should default to 'en'

      // Restore mock
      langdetect.detectOne.mockReturnValue('en');
    });

    it('should extract key phrases', async () => {
      const content = 'Machine learning is a subset of artificial intelligence. Machine learning algorithms build models.';
      const metadata = await documentProcessor.extractMetadata({}, content);

      expect(metadata).toHaveProperty('keyPhrases');
      expect(Array.isArray(metadata.keyPhrases)).toBe(true);
    });

    it('should extract metadata with existing title', async () => {
      const document = { title: 'Existing Title' };
      const content = 'Document content goes here.';
      const metadata = await documentProcessor.extractMetadata(document, content);

      expect(metadata.title).toBe('Existing Title');
    });

    it('should calculate reading time', async () => {
      const content = Array(1000).fill('word').join(' '); // 1000 words
      const metadata = await documentProcessor.extractMetadata({}, content);

      expect(metadata.estimatedReadingTime).toBe(5); // 1000 words / 200 wpm = 5 minutes
    });
  });

  describe('analyzeContentStructure', () => {
    it('should detect paragraphs', () => {
      const content = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const structure = documentProcessor.analyzeContentStructure(content);

      expect(structure.paragraphs).toBe(3);
    });

    it('should detect headings', () => {
      const content = '# Heading 1\n\nContent\n\n## Heading 2\n\nMore content';
      const structure = documentProcessor.analyzeContentStructure(content);

      expect(structure.headings.length).toBeGreaterThan(0);
      expect(structure.headings).toContain('# Heading 1');
      expect(structure.headings).toContain('## Heading 2');
    });

    it('should detect lists', () => {
      const content = 'Items:\n- Item 1\n- Item 2\n\nNumbered:\n1. First\n2. Second';
      const structure = documentProcessor.analyzeContentStructure(content);

      expect(structure.lists).toBeGreaterThan(0);
    });

    it('should detect code blocks', () => {
      const content = 'Text\n\n```\ncode here\n```\n\nMore text';
      const structure = documentProcessor.analyzeContentStructure(content);

      expect(structure.codeBlocks).toBe(1);
    });
  });

  describe('preprocessText', () => {
    it('should normalize and deduplicate content', async () => {
      const document = {
        content: 'Test content. Test content. Another sentence.',
        metadata: { language: 'en' }
      };

      const result = await documentProcessor.preprocessText(document);

      expect(result.processedContent).toBeDefined();
      expect(result.stats).toHaveProperty('originalLength');
      expect(result.stats).toHaveProperty('processedLength');
    });

    it('should handle special characters', async () => {
      const document = {
        content: 'Test "smart quotes" and —em dash',
        metadata: { language: 'en' }
      };

      const result = await documentProcessor.preprocessText(document);

      expect(result.processedContent).toContain('"');
      expect(result.processedContent).toContain('--');
    });
  });

  describe('chunkContent', () => {
    const mockDocument = {
      content: 'This is sentence one. This is sentence two. This is sentence three. This is sentence four. This is sentence five.',
      processedContent: 'This is sentence one. This is sentence two. This is sentence three. This is sentence four. This is sentence five.'
    };

    describe('semantic chunking', () => {
      it('should create semantic chunks with overlap', async () => {
        const chunks = await documentProcessor.chunkContent(mockDocument, 'semantic');

        expect(chunks.length).toBeGreaterThan(0);
        chunks.forEach(chunk => {
          expect(chunk).toHaveProperty('content');
          expect(chunk).toHaveProperty('metadata');
          expect(chunk).toHaveProperty('tokens');
        });
      });

      it('should respect min and max chunk sizes', async () => {
        documentProcessor.maxChunkSize = 50;
        documentProcessor.minChunkSize = 10;

        const chunks = await documentProcessor.chunkContent(mockDocument, 'semantic');

        chunks.forEach(chunk => {
          expect(chunk.tokens).toBeGreaterThanOrEqual(10);
          expect(chunk.tokens).toBeLessThanOrEqual(50);
        });
      });
    });

    describe('fixed size chunking', () => {
      it('should create fixed size chunks', async () => {
        const chunks = await documentProcessor.chunkContent(mockDocument, 'fixed');

        expect(chunks.length).toBeGreaterThan(0);
        // Check that chunks have consistent size (except possibly the last one)
        for (let i = 0; i < chunks.length - 1; i++) {
          expect(chunks[i].tokens).toBeCloseTo(documentProcessor.maxChunkSize, 50);
        }
      });
    });

    describe('sentence boundary chunking', () => {
      it('should chunk at sentence boundaries', async () => {
        const chunks = await documentProcessor.chunkContent(mockDocument, 'sentence');

        expect(chunks.length).toBeGreaterThan(0);
        chunks.forEach(chunk => {
          expect(chunk.content).toMatch(/\.$/);
        });
      });
    });

    describe('paragraph based chunking', () => {
      it('should chunk by paragraphs', async () => {
        const paragraphDoc = {
          content: 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.',
          processedContent: 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.'
        };

        const chunks = await documentProcessor.chunkContent(paragraphDoc, 'paragraph');

        expect(chunks.length).toBe(3);
      });
    });
  });

  describe('assessQuality', () => {
    const mockDocument = {
      content: 'This is a well-written document. It has good readability. The content is coherent and complete.',
      processedContent: 'This is a well-written document. It has good readability. The content is coherent and complete.'
    };

    const mockChunks = [
      { content: 'This is a well-written document.', tokens: 6 },
      { content: 'It has good readability.', tokens: 5 },
      { content: 'The content is coherent and complete.', tokens: 7 }
    ];

    it('should assess document quality', async () => {
      const quality = await documentProcessor.assessQuality(mockDocument, mockChunks);

      expect(quality).toHaveProperty('readability');
      expect(quality).toHaveProperty('coherence');
      expect(quality).toHaveProperty('completeness');
      expect(quality).toHaveProperty('errors');
      expect(quality).toHaveProperty('overallScore');
      expect(quality).toHaveProperty('recommendations');
    });

    it('should detect encoding errors', async () => {
      const errorDoc = {
        content: 'This has � encoding issues',
        processedContent: 'This has � encoding issues'
      };

      const quality = await documentProcessor.assessQuality(errorDoc, mockChunks);

      expect(quality.errors).toContainEqual(
        expect.objectContaining({
          type: 'encoding',
          severity: 'high'
        })
      );
    });

    it('should provide quality recommendations', async () => {
      const lowQualityDoc = {
        content: 'Bad.',
        processedContent: 'Bad.'
      };

      const quality = await documentProcessor.assessQuality(lowQualityDoc, [{ content: 'Bad.', tokens: 1 }]);

      expect(quality.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('createChunk', () => {
    it('should create chunk with metadata', () => {
      const chunk = documentProcessor.createChunk('Test content', 'Full document with test content');

      expect(chunk).toHaveProperty('content', 'Test content');
      expect(chunk).toHaveProperty('metadata');
      expect(chunk.metadata).toHaveProperty('position');
      expect(chunk.metadata).toHaveProperty('length');
      expect(chunk).toHaveProperty('tokens');
      expect(chunk).toHaveProperty('hash');
    });

    it('should return null for empty content', () => {
      const chunk = documentProcessor.createChunk('', 'Full document');

      expect(chunk).toBeNull();
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate similarity between texts', () => {
      const similarity1 = documentProcessor.calculateSimilarity(
        'The cat sat on the mat',
        'The cat sat on the mat'
      );
      expect(similarity1).toBe(1);

      const similarity2 = documentProcessor.calculateSimilarity(
        'The cat sat on the mat',
        'The dog ran in the park'
      );
      expect(similarity2).toBeLessThan(0.5);
    });
  });

  describe('queue operations', () => {
    it('should create processing job', async () => {
      const document = { id: 'doc-123', content: 'Test' };
      const job = await documentProcessor.createProcessingJob(document);

      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: document.id,
          document
        }),
        expect.any(Object)
      );
      expect(job).toHaveProperty('id', 'job-123');
    });

    it('should get job status', async () => {
      const mockJob = {
        id: 'job-123',
        progress: jest.fn().mockReturnValue(50),
        toJSON: jest.fn().mockReturnValue({
          id: 'job-123',
          progress: 50,
          processedOn: Date.now()
        })
      };

      mockQueue.getJob.mockResolvedValue(mockJob);

      const status = await documentProcessor.getJobStatus('job-123');

      expect(status).toHaveProperty('exists', true);
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('progress', 50);
    });

    it('should handle missing job', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      const status = await documentProcessor.getJobStatus('non-existent');

      expect(status).toHaveProperty('exists', false);
    });
  });

  describe('utility methods', () => {
    it('should detect stop words', () => {
      expect(documentProcessor.isStopWord('the')).toBe(true);
      expect(documentProcessor.isStopWord('machine')).toBe(false);
    });

    it('should detect semantic boundaries', () => {
      const boundary1 = documentProcessor.isSemanticBoundary(
        'End of paragraph.',
        'New paragraph starts here.'
      );
      expect(boundary1).toBe(true);

      const boundary2 = documentProcessor.isSemanticBoundary(
        'This is a sentence',
        'and this continues it.'
      );
      expect(boundary2).toBe(false);
    });

    it('should normalize readability scores', () => {
      const metrics = {
        flesch: 60,
        fog: 10,
        smog: 8,
        ari: 9
      };

      const score = documentProcessor.normalizeReadabilityScore(metrics);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should interpret coherence scores', () => {
      expect(documentProcessor.interpretCoherence(0.9)).toBe('highly coherent');
      expect(documentProcessor.interpretCoherence(0.7)).toBe('highly coherent');
      expect(documentProcessor.interpretCoherence(0.5)).toBe('moderately coherent');
      expect(documentProcessor.interpretCoherence(0.3)).toBe('somewhat coherent');
    });

    it('should interpret very low coherence', () => {
      expect(documentProcessor.interpretCoherence(0.1)).toBe('low coherence');
    });
  });

  describe('normalizeEncoding', () => {
    it('should normalize text encoding to UTF-8', () => {
      const text = 'Test text with special chars';
      const normalized = documentProcessor.normalizeEncoding(text);
      
      expect(normalized).toBe(text);
    });

    it('should handle encoding errors gracefully', () => {
      // Mock Buffer to throw error
      const originalBuffer = global.Buffer;
      global.Buffer.from = jest.fn().mockImplementation(() => {
        throw new Error('Encoding error');
      });

      const text = 'Test text';
      const normalized = documentProcessor.normalizeEncoding(text);
      
      expect(normalized).toBe(text);
      
      // Restore Buffer
      global.Buffer = originalBuffer;
    });
  });

  describe('handleSpecialCharacters', () => {
    it('should replace non-breaking spaces', () => {
      const text = 'Hello\u00A0World';
      const result = documentProcessor.handleSpecialCharacters(text);
      
      expect(result).toBe('Hello World');
    });

    it('should remove zero-width spaces', () => {
      const text = 'Hello\u200BWorld';
      const result = documentProcessor.handleSpecialCharacters(text);
      
      expect(result).toBe('HelloWorld');
    });

    it('should handle line separators', () => {
      const text = 'Line1\u2028Line2\u2029Line3';
      const result = documentProcessor.handleSpecialCharacters(text);
      
      expect(result).toBe('Line1\nLine2\nLine3');
    });
  });

  describe('deduplicateContent', () => {
    it('should remove duplicate paragraphs', () => {
      const text = 'First paragraph is unique.\n\nThis paragraph is duplicated.\n\nThis paragraph is duplicated.\n\nLast paragraph is unique.';
      const result = documentProcessor.deduplicateContent(text);
      
      expect(result).not.toMatch(/This paragraph is duplicated.*This paragraph is duplicated/s);
      expect(result).toContain('First paragraph is unique');
      expect(result).toContain('Last paragraph is unique');
    });

    it('should skip short paragraphs', () => {
      const text = 'Long enough paragraph here.\n\nShort.\n\nShort.\n\nAnother long paragraph here.';
      const result = documentProcessor.deduplicateContent(text);
      
      // Short paragraphs should be preserved even if duplicate
      expect(result.split('\n\n').length).toBe(4);
    });
  });

  describe('processNonEnglishContent', () => {
    it('should process non-English content', async () => {
      const text = 'Texto en español';
      const result = await documentProcessor.processNonEnglishContent(text, 'es');
      
      expect(result).toBe(text); // Currently just returns the text
    });
  });

  describe('getOverlapSentences', () => {
    it('should get overlap sentences for continuity', () => {
      const sentences = ['First sentence.', 'Second sentence.', 'Third sentence.', 'Fourth sentence.'];
      const overlap = documentProcessor.getOverlapSentences(sentences);
      
      expect(overlap.length).toBeGreaterThan(0);
      expect(overlap.length).toBeLessThan(sentences.length);
    });

    it('should return all sentences if 2 or fewer', () => {
      const sentences = ['First sentence.', 'Second sentence.'];
      const overlap = documentProcessor.getOverlapSentences(sentences);
      
      expect(overlap).toEqual(sentences);
    });
  });

  describe('decodeTokens', () => {
    it('should decode tokens to text', () => {
      const tokens = ['Hello', ' ', 'World'];
      const result = documentProcessor.decodeTokens(tokens);
      
      expect(result).toBe('Hello World');
    });
  });

  describe('calculateCoverage', () => {
    it('should calculate content coverage', () => {
      const document = { content: 'This is the full document content.' };
      const chunks = [
        { content: 'This is the full' },
        { content: 'document content.' }
      ];
      
      const coverage = documentProcessor.calculateCoverage(document, chunks);
      
      expect(coverage.percentage).toBeGreaterThan(90);
      expect(coverage.missing).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeDistribution', () => {
    it('should analyze chunk distribution', () => {
      const chunks = [
        { tokens: 100 },
        { tokens: 110 },
        { tokens: 90 },
        { tokens: 105 }
      ];
      
      const distribution = documentProcessor.analyzeDistribution(chunks);
      
      expect(distribution.mean).toBeCloseTo(101.25);
      expect(distribution.uniformity).toBeGreaterThan(0.8);
      expect(distribution.min).toBe(90);
      expect(distribution.max).toBe(110);
    });
  });

  describe('calculateCompletenessScore', () => {
    it('should calculate completeness score', () => {
      const completeness = {
        coverage: { percentage: 95 },
        distribution: { uniformity: 0.9 }
      };
      
      const score = documentProcessor.calculateCompletenessScore(completeness);
      
      expect(score).toBeCloseTo(92.5);
    });
  });

  describe('generateQualityRecommendations', () => {
    it('should generate recommendations for low readability', () => {
      const assessments = {
        readability: { score: 30 },
        coherence: { score: 80 },
        completeness: { coverage: { percentage: 98 } },
        errors: []
      };
      
      const recommendations = documentProcessor.generateQualityRecommendations(assessments);
      
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          area: 'readability',
          priority: 'high'
        })
      );
    });

    it('should generate recommendations for low coherence', () => {
      const assessments = {
        readability: { score: 70 },
        coherence: { score: 40 },
        completeness: { coverage: { percentage: 98 } },
        errors: []
      };
      
      const recommendations = documentProcessor.generateQualityRecommendations(assessments);
      
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          area: 'coherence',
          priority: 'medium'
        })
      );
    });

    it('should generate recommendations for low coverage', () => {
      const assessments = {
        readability: { score: 70 },
        coherence: { score: 70 },
        completeness: { coverage: { percentage: 85 } },
        errors: []
      };
      
      const recommendations = documentProcessor.generateQualityRecommendations(assessments);
      
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          area: 'completeness',
          priority: 'high'
        })
      );
    });

    it('should generate recommendations for high severity errors', () => {
      const assessments = {
        readability: { score: 70 },
        coherence: { score: 70 },
        completeness: { coverage: { percentage: 98 } },
        errors: [
          { type: 'truncation', severity: 'high', message: 'Content truncated' }
        ]
      };
      
      const recommendations = documentProcessor.generateQualityRecommendations(assessments);
      
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          area: 'errors',
          priority: 'high',
          suggestion: 'Fix truncation: Content truncated'
        })
      );
    });
  });

  describe('storeProcessingResults', () => {
    it('should store processing results successfully', async () => {
      const results = {
        documentId: 'doc-123',
        processingId: 'proc-123',
        chunks: [{ content: 'chunk1' }, { content: 'chunk2' }],
        qualityReport: { overallScore: 85 },
        metadata: { processingTime: 1000 }
      };

      mockSupabase.insert.mockResolvedValue({ data: { id: 'embed-123' }, error: null });

      const data = await documentProcessor.storeProcessingResults(results);

      expect(mockSupabase.from).toHaveBeenCalledWith('content_embeddings');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          document_id: 'doc-123',
          processing_id: 'proc-123',
          chunks: results.chunks,
          quality_report: results.qualityReport
        })
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('course_resources');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          processing_status: 'completed',
          processing_metadata: expect.objectContaining({
            processingId: 'proc-123',
            chunksCreated: 2,
            qualityScore: 85
          })
        })
      );
    });

    it('should handle store errors', async () => {
      const results = {
        documentId: 'doc-123',
        processingId: 'proc-123',
        chunks: [],
        qualityReport: {},
        metadata: {}
      };

      mockSupabase.insert.mockResolvedValue({ data: null, error: new Error('Database error') });

      await expect(documentProcessor.storeProcessingResults(results))
        .rejects.toThrow('Database error');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for existing job', async () => {
      const mockJob = {
        id: 'job-123',
        getState: jest.fn().mockResolvedValue('completed'),
        progress: jest.fn().mockReturnValue(100),
        data: { documentId: 'doc-123' },
        returnvalue: { success: true },
        failedReason: null,
        timestamp: Date.now(),
        processedOn: Date.now(),
        finishedOn: Date.now()
      };

      mockQueue.getJob.mockResolvedValue(mockJob);

      const status = await documentProcessor.getJobStatus('job-123');

      expect(status).toMatchObject({
        id: 'job-123',
        state: 'completed',
        progress: 100,
        data: { documentId: 'doc-123' }
      });
    });

    it('should throw error for non-existent job', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(documentProcessor.getJobStatus('non-existent'))
        .rejects.toThrow('Job not found');
    });
  });

  describe('updateJobProgress', () => {
    it('should update job progress', async () => {
      const mockJob = {
        progress: jest.fn(),
        log: jest.fn()
      };

      await documentProcessor.updateJobProgress(mockJob, 50, 'Processing...');

      expect(mockJob.progress).toHaveBeenCalledWith(50);
      expect(mockJob.log).toHaveBeenCalledWith('Processing...');
    });
  });

  describe('queue worker', () => {
    let mockProcessor;
    let processCallback;

    beforeEach(() => {
      // Capture the process callback
      processCallback = mockQueue.process.mock.calls.find(call => call[0] === 'process-document')?.[1];
    });

    it('should process jobs in queue', async () => {
      // Re-import to trigger queue setup
      jest.resetModules();
      const { documentQueue } = require('../../../src/services/documentProcessor');
      
      // Mock job
      const mockJob = {
        id: 'job-123',
        data: {
          document: { id: 'doc-123', content: 'Test content' },
          options: { chunkingStrategy: 'semantic' }
        }
      };

      // Mock updateJobProgress
      DocumentProcessor.prototype.updateJobProgress = jest.fn();
      DocumentProcessor.prototype.processDocument = jest.fn().mockResolvedValue({ success: true });

      // Get process callback
      const processFn = Bull.mock.results[0].value.process.mock.calls[0][1];
      
      const result = await processFn(mockJob);

      expect(result).toEqual({ success: true });
    });
  });
});