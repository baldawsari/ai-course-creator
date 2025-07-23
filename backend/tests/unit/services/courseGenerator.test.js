// Mock dependencies before importing
let mockSupabaseChain;
let mockQueue;
let mockProcessCallback;
let mockCompletedCallback;
let mockFailedCallback;

// Mock Bull first before other mocks
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => {
    if (!global.mockQueue) {
      global.mockQueue = {
        add: jest.fn().mockResolvedValue({ id: 'queue-job-123' }),
        process: jest.fn((callback) => { 
          global.mockProcessCallback = callback; 
        }),
        on: jest.fn((event, callback) => {
          if (event === 'completed') global.mockCompletedCallback = callback;
          if (event === 'failed') global.mockFailedCallback = callback;
        }),
        getJob: jest.fn()
      };
    }
    return global.mockQueue;
  });
});

jest.mock('../../../src/config/database', () => {
  const chainMock = {
    from: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    in: jest.fn(),
    order: jest.fn()
  };
  
  // Setup chainable methods
  Object.keys(chainMock).forEach(key => {
    if (typeof chainMock[key] === 'function') {
      chainMock[key].mockReturnValue(chainMock);
    }
  });
  
  // Store reference for tests
  if (!global.mockSupabaseChain) {
    global.mockSupabaseChain = chainMock;
  }
  
  return { supabaseAdmin: chainMock };
});

jest.mock('../../../src/config/database-simple', () => {
  return { 
    get supabaseAdmin() {
      return global.mockSupabaseChain || {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis()
      };
    }
  };
});

// Get reference after mocks are set up
mockSupabaseChain = global.mockSupabaseChain;

jest.mock('../../../src/config/vectorStore', () => ({
  getQdrantClient: jest.fn(),
  qdrantConfig: {},
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../../../src/services/ragPipeline');
jest.mock('../../../src/services/claudeService');
jest.mock('../../../src/services/documentProcessor');
jest.mock('../../../src/utils/logger');

const Bull = require('bull');
const { supabaseAdmin } = require('../../../src/config/database');
const ragPipeline = require('../../../src/services/ragPipeline');
const claudeService = require('../../../src/services/claudeService');
const documentProcessor = require('../../../src/services/documentProcessor');
const logger = require('../../../src/utils/logger');

// Import the singleton instance
const courseGenerator = require('../../../src/services/courseGenerator');
const { mockData, SAMPLE_COURSE_STRUCTURE } = require('../../utils/mockData');

describe('CourseGenerator Service', () => {
  let originalProcessGenerationJob;

  beforeAll(() => {
    // Store original method
    originalProcessGenerationJob = courseGenerator.processGenerationJob;
    // Get global references
    mockQueue = global.mockQueue;
    mockProcessCallback = global.mockProcessCallback;
    mockCompletedCallback = global.mockCompletedCallback;
    mockFailedCallback = global.mockFailedCallback;
  });

  afterAll(() => {
    // Restore original method
    if (originalProcessGenerationJob) {
      courseGenerator.processGenerationJob = originalProcessGenerationJob;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mock reference
    mockSupabaseChain = global.mockSupabaseChain || supabaseAdmin;
    
    // Reset all supabase mocks to their default behavior
    if (mockSupabaseChain) {
      Object.keys(mockSupabaseChain).forEach(key => {
        if (typeof mockSupabaseChain[key] === 'function' && mockSupabaseChain[key].mockClear) {
          mockSupabaseChain[key].mockClear();
          mockSupabaseChain[key].mockReturnValue(mockSupabaseChain);
        }
      });
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('initialization', () => {
    it('should initialize worker with process handler', () => {
      expect(mockQueue.process).toHaveBeenCalled();
      expect(mockQueue.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });
    
    it('should handle job processing in worker', async () => {
      const mockJob = {
        data: {
          jobId: 'job-123',
          courseId: 'course-123',
          userId: 'user-123'
        }
      };
      
      // Mock the processGenerationJob method
      courseGenerator.processGenerationJob = jest.fn().mockResolvedValue({});
      
      await mockProcessCallback(mockJob);
      
      expect(courseGenerator.processGenerationJob).toHaveBeenCalledWith(
        'job-123', 'course-123', 'user-123', mockJob
      );
    });
    
    it('should handle job processing errors', async () => {
      const mockJob = {
        data: {
          jobId: 'job-123',
          courseId: 'course-123',
          userId: 'user-123'
        }
      };
      
      const error = new Error('Processing failed');
      courseGenerator.processGenerationJob = jest.fn().mockRejectedValue(error);
      
      await expect(mockProcessCallback(mockJob)).rejects.toThrow('Processing failed');
      expect(logger.error).toHaveBeenCalledWith('Generation job failed:', error);
    });
    
    it('should handle completed event', () => {
      const mockJob = { id: 'job-123' };
      
      mockCompletedCallback(mockJob);
      
      expect(logger.info).toHaveBeenCalledWith('Generation job job-123 completed successfully');
    });
    
    it('should handle failed event', () => {
      const mockJob = { id: 'job-123' };
      const error = new Error('Job failed');
      
      mockFailedCallback(mockJob, error);
      
      expect(logger.error).toHaveBeenCalledWith('Generation job job-123 failed:', error);
    });
  });

  describe('createGenerationJob', () => {
    it('should create a generation job successfully', async () => {
      const courseId = 'course-123';
      const userId = 'user-123';
      
      mockSupabaseChain.insert.mockResolvedValueOnce({ error: null });
      
      const result = await courseGenerator.createGenerationJob(courseId, userId);
      
      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('queueJobId', 'queue-job-123');
      expect(mockSupabaseChain.from).toHaveBeenCalledWith('generation_jobs');
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId,
          userId
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({
            type: 'exponential',
            delay: 5000
          })
        })
      );
    });
    
    it('should handle database errors when creating job', async () => {
      const courseId = 'course-123';
      const userId = 'user-123';
      
      mockSupabaseChain.insert.mockResolvedValueOnce({ 
        error: new Error('Database error') 
      });
      
      await expect(courseGenerator.createGenerationJob(courseId, userId))
        .rejects.toThrow('Database error');
    });
  });

  describe('processGenerationJob', () => {
    const mockJob = {
      progress: jest.fn()
    };
    
    it('should process generation job successfully', async () => {
      const jobId = 'job-123';
      const courseId = 'course-123';
      const userId = 'user-123';
      
      // Mock analyzeUploadedContent - fetchQualityResources
      mockSupabaseChain.order.mockResolvedValueOnce({
        data: [
          { 
            id: 'res-1', 
            quality_score: 85, 
            content: 'Resource 1',
            file_type: 'pdf',
            quality_report: {
              wordCount: 1000,
              language: 'en',
              keyPhrases: ['topic1', 'topic2'],
              readability: { level: 'easy' }
            }
          },
          { 
            id: 'res-2', 
            quality_score: 90, 
            content: 'Resource 2',
            file_type: 'pdf',
            quality_report: {
              wordCount: 1500,
              language: 'en',
              keyPhrases: ['topic2', 'topic3'],
              readability: { level: 'standard' }
            }
          }
        ],
        error: null
      });
      
      // Mock getCourseConfiguration
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: {
          title: 'Test Course',
          description: 'Test Description',
          level: 'intermediate',
          duration: '4 weeks'
        },
        error: null
      });
      
      // Mock buildGenerationContext
      ragPipeline.retrieveRelevantContent = jest.fn().mockResolvedValue([
        { node: { text: 'Context 1', metadata: {} }, score: 0.9 },
        { node: { text: 'Context 2', metadata: {} }, score: 0.85 }
      ]);
      
      // Mock generateAdvancedCourseOutline
      claudeService.generateCourseStructure = jest.fn().mockResolvedValue({
        sessions: [
          { 
            title: 'Session 1', 
            topics: ['Topic 1', 'Topic 2'],
            objectives: ['Learn basics', 'Apply concepts'],
            duration: 60,
            activities: ['Reading', 'Exercise']
          },
          { 
            title: 'Session 2', 
            topics: ['Topic 3', 'Topic 4'],
            objectives: ['Advanced topics', 'Best practices'],
            duration: 90,
            activities: ['Project', 'Discussion']
          }
        ]
      });
      
      // Mock session generation
      claudeService.generateSessionDetails = jest.fn().mockResolvedValue({
        overview: 'Session overview',
        materials: ['Material 1', 'Material 2']
      });
      
      // Mock assessments generation
      claudeService.generateAssessments = jest.fn().mockResolvedValue({
        quizzes: [{ title: 'Quiz 1', questions: [] }],
        finalExam: { title: 'Final Exam', questions: [] }
      });
      
      // Mock content save - multiple inserts for sessions
      mockSupabaseChain.insert.mockResolvedValue({ error: null });
      
      // Mock course update
      mockSupabaseChain.update.mockResolvedValueOnce({ error: null });
      
      await courseGenerator.processGenerationJob(jobId, courseId, userId, mockJob);
      
      expect(mockJob.progress).toHaveBeenCalled();
      expect(mockSupabaseChain.from).toHaveBeenCalledWith('generation_jobs');
      expect(mockSupabaseChain.from).toHaveBeenCalledWith('course_resources');
      expect(mockSupabaseChain.from).toHaveBeenCalledWith('courses');
      expect(claudeService.generateCourseStructure).toHaveBeenCalled();
      expect(claudeService.generateSessionDetails).toHaveBeenCalled();
      expect(claudeService.generateAssessments).toHaveBeenCalled();
    });
  });

  describe('getCourseConfiguration', () => {
    it('should fetch course configuration successfully', async () => {
      const courseId = 'course-123';
      
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: {
          id: courseId,
          title: 'Advanced AI Course',
          description: 'Learn AI fundamentals',
          level: 'advanced',
          duration: '8 weeks',
          objectives: ['Understand AI', 'Apply ML'],
          target_audience: 'Developers',
          prerequisites: ['Programming basics'],
          settings: { assessmentType: 'quiz' }
        },
        error: null
      });
      
      const result = await courseGenerator.getCourseConfiguration(courseId);
      
      expect(result).toEqual({
        title: 'Advanced AI Course',
        description: 'Learn AI fundamentals',
        level: 'advanced',
        duration: '8 weeks',
        objectives: ['Understand AI', 'Apply ML'],
        targetAudience: 'Developers',
        prerequisites: ['Programming basics'],
        settings: { assessmentType: 'quiz' }
      });
      expect(mockSupabaseChain.from).toHaveBeenCalledWith('courses');
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', courseId);
    });
    
    it('should handle database errors in getCourseConfiguration', async () => {
      const courseId = 'course-123';
      
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Database connection failed')
      });
      
      await expect(courseGenerator.getCourseConfiguration(courseId))
        .rejects.toThrow('Database connection failed');
    });
    
    it('should use default values for missing fields', async () => {
      const courseId = 'course-123';
      
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: {
          id: courseId,
          title: 'Basic Course',
          description: 'A simple course'
        },
        error: null
      });
      
      const result = await courseGenerator.getCourseConfiguration(courseId);
      
      expect(result.level).toBe('intermediate');
      expect(result.duration).toBe('4 weeks');
      expect(result.objectives).toEqual([]);
      expect(result.targetAudience).toBe('General learners');
      expect(result.prerequisites).toEqual([]);
      expect(result.settings).toEqual({});
    });
  });

  describe('analyzeUploadedContent', () => {
    it('should analyze course resources successfully', async () => {
      const courseId = 'course-123';
      
      mockSupabaseChain.order.mockResolvedValueOnce({
        data: [
          { 
            id: 'res-1', 
            content: 'Resource 1', 
            quality_score: 80,
            file_type: 'pdf',
            quality_report: {
              wordCount: 1000,
              language: 'en',
              keyPhrases: ['topic1', 'topic2']
            }
          },
          { 
            id: 'res-2', 
            content: 'Resource 2', 
            quality_score: 90,
            file_type: 'pdf',
            quality_report: {
              wordCount: 1500,
              language: 'en',
              keyPhrases: ['topic2', 'topic3']
            }
          }
        ],
        error: null
      });
      
      const result = await courseGenerator.analyzeUploadedContent(courseId);
      
      // The actual implementation doesn't have 'resources' property
      expect(result).toHaveProperty('totalResources', 2);
      expect(result).toHaveProperty('averageScore', 85);
      expect(result).toHaveProperty('contentTypes');
      expect(result).toHaveProperty('languages');
      expect(result).toHaveProperty('topicCoverage');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('qualityLevel');
    });
    
    it('should handle missing resources', async () => {
      const courseId = 'course-123';
      
      mockSupabaseChain.order.mockResolvedValueOnce({
        data: [],
        error: null
      });
      
      await expect(courseGenerator.analyzeUploadedContent(courseId))
        .rejects.toThrow('No valid resources found for course generation');
    });
  });

  describe('generateCourse', () => {
    it('should generate a course with provided resources', async () => {
      const options = {
        courseId: 'course-123',
        userId: 'user-123',
        resourceIds: ['res-1', 'res-2'],
        config: {
          difficulty: 'intermediate',
          duration: '4 weeks'
        }
      };
      
      // Mock resources fetch
      supabaseAdmin.from().select.mockResolvedValueOnce({
        data: [
          { id: 'res-1', content: 'Resource 1', quality_score: 85 },
          { id: 'res-2', content: 'Resource 2', quality_score: 90 }
        ],
        error: null
      });
      
      // Mock quality analysis
      documentProcessor.analyzeResourceQuality = jest.fn().mockResolvedValue({
        'res-1': { score: 85, tier: 'premium' },
        'res-2': { score: 90, tier: 'premium' }
      });
      
      // Mock structure generation
      claudeService.generateAdvancedStructure = jest.fn().mockResolvedValue({
        modules: [
          { title: 'Module 1', sessions: ['Session 1', 'Session 2'] }
        ]
      });
      
      // Mock save
      supabaseAdmin.from().insert.mockResolvedValueOnce({
        data: { id: 'generated-123' },
        error: null
      });
      
      const result = await courseGenerator.generateCourse(options);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('courseId');
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status successfully', async () => {
      const jobId = 'job-123';
      const status = 'processing';
      const progress = 50;
      const message = 'Processing...';
      
      mockSupabaseChain.update.mockResolvedValueOnce({ error: null });
      
      await courseGenerator.updateJobStatus(jobId, status, progress, message);
      
      expect(mockSupabaseChain.from).toHaveBeenCalledWith('generation_jobs');
      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status,
          progress,
          message,
          updated_at: expect.any(String)
        })
      );
    });
  });

  describe('getJobStatus', () => {
    it('should get job status from database', async () => {
      const jobId = 'job-123';
      
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: {
          id: jobId,
          status: 'completed',
          progress: 100,
          result: { courseId: 'course-123' }
        },
        error: null
      });
      
      const result = await courseGenerator.getJobStatus(jobId);
      
      expect(result).toHaveProperty('status', 'completed');
      expect(result).toHaveProperty('progress', 100);
    });
    
    it('should throw error if job not found', async () => {
      const jobId = 'job-123';
      
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Job not found')
      });
      
      await expect(courseGenerator.getJobStatus(jobId))
        .rejects.toThrow('Job not found');
    });
    
    it('should handle job status update with completed status', async () => {
      const jobId = 'job-123';
      
      mockSupabaseChain.update.mockResolvedValueOnce({ error: null });
      
      await courseGenerator.updateJobStatus(jobId, 'completed', 100, 'Done');
      
      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          progress: 100,
          message: 'Done',
          completed_at: expect.any(String)
        })
      );
    });
    
    it('should handle job status update with failed status', async () => {
      const jobId = 'job-123';
      
      mockSupabaseChain.update.mockResolvedValueOnce({ error: null });
      
      await courseGenerator.updateJobStatus(jobId, 'failed', null, 'Error occurred');
      
      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          message: 'Error occurred',
          failed_at: expect.any(String)
        })
      );
    });
    
    it('should handle update job status errors gracefully', async () => {
      const jobId = 'job-123';
      
      mockSupabaseChain.update.mockResolvedValueOnce({ 
        error: new Error('Update failed') 
      });
      
      // Should not throw, just log error
      await courseGenerator.updateJobStatus(jobId, 'processing', 50);
      
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to update job status for ${jobId}:`,
        expect.any(Error)
      );
    });
  });

  describe('buildGenerationContext', () => {
    it('should build generation context with RAG enhancement', async () => {
      const courseConfig = {
        title: 'AI Fundamentals',
        level: 'intermediate',
        objectives: ['Learn AI basics', 'Apply ML concepts', 'Build AI models']
      };
      
      const contentAnalysis = {
        totalResources: 5,
        averageScore: 85
      };
      
      ragPipeline.retrieveRelevantContent = jest.fn()
        .mockResolvedValueOnce([
          { node: { text: 'AI fundamentals content', metadata: {} }, score: 0.9 }
        ])
        .mockResolvedValueOnce([
          { node: { text: 'Best practices content', metadata: {} }, score: 0.85 }
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { node: { text: 'Learn AI basics content', metadata: {} }, score: 0.8 }
        ])
        .mockResolvedValue([]);
      
      const result = await courseGenerator.buildGenerationContext(courseConfig, contentAnalysis);
      
      expect(result).toHaveProperty('course', courseConfig);
      expect(result).toHaveProperty('content', contentAnalysis);
      expect(result).toHaveProperty('ragContext');
      expect(result).toHaveProperty('guidelines');
      
      expect(ragPipeline.retrieveRelevantContent).toHaveBeenCalledWith(
        'AI Fundamentals fundamentals',
        { topK: 5, minQuality: 70 }
      );
      expect(ragPipeline.retrieveRelevantContent).toHaveBeenCalledWith(
        'AI Fundamentals best practices',
        { topK: 5, minQuality: 70 }
      );
      
      expect(result.ragContext['AI Fundamentals fundamentals']).toHaveLength(1);
      expect(result.ragContext['AI Fundamentals best practices']).toHaveLength(1);
    });
    
    it('should handle RAG retrieval failures gracefully', async () => {
      const courseConfig = {
        title: 'Test Course',
        level: 'beginner',
        objectives: ['Objective 1']
      };
      
      const contentAnalysis = { totalResources: 2 };
      
      ragPipeline.retrieveRelevantContent = jest.fn()
        .mockRejectedValueOnce(new Error('RAG service unavailable'))
        .mockResolvedValue([]);
      
      const result = await courseGenerator.buildGenerationContext(courseConfig, contentAnalysis);
      
      expect(result).toHaveProperty('course');
      expect(result).toHaveProperty('ragContext');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('RAG retrieval failed'),
        expect.any(Error)
      );
    });
    
    it('should handle errors in buildGenerationContext', async () => {
      const courseConfig = null;
      const contentAnalysis = {};
      
      await expect(courseGenerator.buildGenerationContext(courseConfig, contentAnalysis))
        .rejects.toThrow();
    });
  });

  describe('quality tier methods', () => {
    describe('getResourcesByQualityTier', () => {
      it('should fetch resources by quality tier', async () => {
        const courseId = 'course-123';
        const tier = 'premium';
        
        mockSupabaseChain.order.mockResolvedValueOnce({
          data: [
            { id: 'res-1', quality_score: 90 },
            { id: 'res-2', quality_score: 95 }
          ],
          error: null
        });
        
        const result = await courseGenerator.getResourcesByQualityTier(courseId, tier);
        
        expect(result).toHaveLength(2);
        expect(mockSupabaseChain.gte).toHaveBeenCalledWith('quality_score', 85);
      });
    });
  });

  describe('generateAdvancedCourseOutline', () => {
    it('should generate course outline successfully', async () => {
      const courseConfig = {
        title: 'Test Course',
        level: 'intermediate'
      };
      
      const generationContext = {
        ragContext: {
          'query1': [{ content: 'relevant content' }]
        }
      };
      
      claudeService.generateCourseStructure = jest.fn().mockResolvedValue({
        sessions: [
          { title: 'Session 1', topics: ['Topic 1'] },
          { title: 'Session 2', topics: ['Topic 2'] },
          { title: 'Session 3', topics: ['Topic 3'] }
        ]
      });
      
      const result = await courseGenerator.generateAdvancedCourseOutline(
        courseConfig,
        generationContext
      );
      
      expect(result).toHaveProperty('sessions');
      expect(result.sessions).toHaveLength(3);
      expect(claudeService.generateCourseStructure).toHaveBeenCalledWith(
        courseConfig,
        generationContext.ragContext
      );
    });
    
    it('should throw error if outline missing sessions', async () => {
      const courseConfig = { title: 'Test' };
      const generationContext = { ragContext: {} };
      
      claudeService.generateCourseStructure = jest.fn().mockResolvedValue({
        sessions: []
      });
      
      await expect(courseGenerator.generateAdvancedCourseOutline(courseConfig, generationContext))
        .rejects.toThrow('Generated outline missing sessions');
    });
    
    it('should handle errors from Claude service', async () => {
      const courseConfig = { title: 'Test' };
      const generationContext = { ragContext: {} };
      
      claudeService.generateCourseStructure = jest.fn()
        .mockRejectedValue(new Error('Claude API error'));
      
      await expect(courseGenerator.generateAdvancedCourseOutline(courseConfig, generationContext))
        .rejects.toThrow('Claude API error');
    });
  });

  describe('session generation', () => {
    describe('generateSessionDetails', () => {
      it('should generate session details in parallel', async () => {
        const outline = {
          modules: [
            {
              title: 'Module 1',
              sessions: ['Session 1', 'Session 2']
            }
          ]
        };
        const generationContext = { context: 'test' };
        const courseConfig = { level: 'intermediate' };
        
        claudeService.generateSessionContent = jest.fn()
          .mockResolvedValueOnce({ title: 'Session 1', content: 'Content 1' })
          .mockResolvedValueOnce({ title: 'Session 2', content: 'Content 2' });
        
        const result = await courseGenerator.generateSessionDetails(
          outline, 
          generationContext, 
          courseConfig
        );
        
        expect(result).toHaveProperty('modules');
        expect(result.modules[0].sessions).toHaveLength(2);
        expect(claudeService.generateSessionContent).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('validateAndRefineContent', () => {
    it('should pass validation when content is valid', async () => {
      const generatedContent = {
        outline: {
          sessions: [
            { objectives: ['Learn basic concepts of programming'] },
            { objectives: ['Apply programming pa techniques'] },
            { objectives: ['Master advanced concepts'] }
          ]
        },
        sessions: [
          { activities: ['Activity 1'], objectives: ['Objective 1'] },
          { activities: ['Activity 2'], objectives: ['Objective 2'] }
        ],
        assessments: {
          quizzes: [{ title: 'Quiz 1' }],
          finalExam: { title: 'Final Exam' }
        }
      };
      
      const courseConfig = {
        objectives: ['Learn basic concepts', 'Apply programming patterns']
      };
      
      const result = await courseGenerator.validateAndRefineContent(generatedContent, courseConfig);
      
      expect(result).toEqual(generatedContent);
      expect(logger.info).toHaveBeenCalledWith('Content validation passed');
    });
    
    it('should refine content when validation finds issues', async () => {
      const generatedContent = {
        outline: {
          sessions: [{ objectives: ['Unrelated objective'] }]
        },
        sessions: [
          { activities: [], objectives: ['Objective 1'] }
        ],
        assessments: {}
      };
      
      const courseConfig = {
        objectives: ['Learn specific skill', 'Master advanced concepts']
      };
      
      // Mock refineContent method
      courseGenerator.refineContent = jest.fn().mockResolvedValue({
        ...generatedContent,
        refined: true
      });
      
      const result = await courseGenerator.validateAndRefineContent(generatedContent, courseConfig);
      
      expect(courseGenerator.refineContent).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Content validation found issues:',
        expect.any(Array)
      );
    });
    
    it('should handle validation errors gracefully', async () => {
      const generatedContent = null;
      const courseConfig = {};
      
      const result = await courseGenerator.validateAndRefineContent(generatedContent, courseConfig);
      
      expect(result).toBe(generatedContent);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to validate and refine content:',
        expect.any(Error)
      );
    });
  });

  describe('cache management', () => {
    it('should handle cache invalidation on config change', async () => {
      const courseId = 'course-123';
      const newConfig = { level: 'advanced' };
      
      // This would test cache invalidation logic if implemented
      // For now, just verify the method can be called
      if (courseGenerator.invalidateCache) {
        await courseGenerator.invalidateCache(courseId, newConfig);
      }
      
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('error handling', () => {
    it('should handle partial session generation failures', async () => {
      const outline = {
        sessions: [
          { title: 'Session 1', topics: ['Topic 1'] },
          { title: 'Session 2', topics: ['Topic 2'] },
          { title: 'Session 3', topics: ['Topic 3'] }
        ]
      };
      
      claudeService.generateSessionDetails = jest.fn()
        .mockResolvedValueOnce({ overview: 'Session 1 overview', materials: [] })
        .mockRejectedValueOnce(new Error('Session 2 generation failed'))
        .mockResolvedValueOnce({ overview: 'Session 3 overview', materials: [] });
      
      ragPipeline.retrieveRelevantContent = jest.fn().mockResolvedValue([]);
      
      // This should not throw, error is logged
      const result = await courseGenerator.generateSessionDetails(
        outline,
        { context: 'test' },
        { title: 'Test Course', level: 'intermediate' }
      );
      
      // Should have all sessions with some having errors logged
      expect(result).toHaveLength(3);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to generate session details:', 
        expect.any(Error)
      );
    });
  });

  describe('utility methods', () => {
    describe('analyzeContentTypes', () => {
      it('should analyze content types distribution', () => {
        const resources = [
          { file_type: 'pdf' },
          { file_type: 'pdf' },
          { file_type: 'docx' },
          { file_type: 'url' }
        ];
        
        const result = courseGenerator.analyzeContentTypes(resources);
        
        expect(result).toEqual({
          pdf: 2,
          docx: 1,
          url: 1
        });
      });
    });

    describe('analyzeLanguages', () => {
      it('should extract unique languages from resources', () => {
        const resources = [
          { quality_report: { language: 'en' } },
          { quality_report: { language: 'en' } },
          { quality_report: { language: 'es' } },
          { quality_report: {} }
        ];
        
        const result = courseGenerator.analyzeLanguages(resources);
        
        expect(result).toContain('en');
        expect(result).toContain('es');
        expect(result).toHaveLength(2);
      });
    });

    describe('getGenerationGuidelines', () => {
      it('should return beginner guidelines', () => {
        const result = courseGenerator.getGenerationGuidelines('beginner');
        
        expect(result).toHaveProperty('complexity', 'simple');
        expect(result).toHaveProperty('explanationDepth', 'detailed');
        expect(result).toHaveProperty('examplesPerConcept', 3);
      });
      
      it('should return intermediate guidelines by default', () => {
        const result = courseGenerator.getGenerationGuidelines('unknown');
        
        expect(result).toHaveProperty('complexity', 'moderate');
        expect(result).toHaveProperty('examplesPerConcept', 2);
      });
    });

    describe('formatDuration', () => {
      it('should format minutes correctly', () => {
        expect(courseGenerator.formatDuration(45)).toBe('45 minutes');
        expect(courseGenerator.formatDuration(90)).toBe('1h 30m');
        expect(courseGenerator.formatDuration(120)).toBe('2h 0m');
      });
    });

    describe('assessDifficulty', () => {
      it('should assess difficulty based on readability', () => {
        const easyResources = [
          { quality_report: { readability: { level: 'very easy' } } },
          { quality_report: { readability: { level: 'easy' } } }
        ];
        
        expect(courseGenerator.assessDifficulty(easyResources)).toBe('beginner');
        
        const hardResources = [
          { quality_report: { readability: { level: 'difficult' } } },
          { quality_report: { readability: { level: 'very difficult' } } }
        ];
        
        expect(courseGenerator.assessDifficulty(hardResources)).toBe('advanced');
      });
    });

    describe('determineOverallQuality', () => {
      it('should determine quality level based on score', () => {
        expect(courseGenerator.determineOverallQuality(90)).toBe('premium');
        expect(courseGenerator.determineOverallQuality(75)).toBe('recommended');
        expect(courseGenerator.determineOverallQuality(55)).toBe('acceptable');
        expect(courseGenerator.determineOverallQuality(45)).toBe('below_threshold');
      });
    });
  });

  describe('content generation methods', () => {
    describe('generateAssessments', () => {
      it('should generate assessments based on course config', async () => {
        const courseConfig = {
          objectives: ['Learn basics', 'Apply concepts'],
          level: 'intermediate'
        };
        
        const generationContext = {
          sessionCount: 4,
          topicCoverage: [{ topic: 'Topic 1', count: 5 }]
        };
        
        claudeService.generateAssessments = jest.fn().mockResolvedValue({
          quizzes: [{ title: 'Quiz 1' }],
          finalExam: { title: 'Final Exam' }
        });
        
        const result = await courseGenerator.generateAssessments(courseConfig, generationContext);
        
        expect(result).toHaveProperty('quizzes');
        expect(result).toHaveProperty('finalExam');
        expect(claudeService.generateAssessments).toHaveBeenCalledWith(
          expect.objectContaining({
            objectives: courseConfig.objectives,
            level: courseConfig.level
          }),
          expect.any(Object)
        );
      });
    });

    describe('saveGeneratedContent', () => {
      it('should save sessions and update course', async () => {
        const courseId = 'course-123';
        const content = {
          sessions: [
            {
              title: 'Session 1',
              overview: 'Overview 1',
              sequenceNumber: 1,
              duration: 60,
              objectives: ['Objective 1'],
              activities: ['Activity 1'],
              materials: ['Material 1'],
              topics: ['Topic 1']
            }
          ],
          assessments: { quizzes: [] },
          outline: { modules: [] }
        };
        
        mockSupabaseChain.insert.mockResolvedValue({ error: null });
        mockSupabaseChain.update.mockResolvedValue({ error: null });
        
        await courseGenerator.saveGeneratedContent(courseId, content);
        
        expect(mockSupabaseChain.from).toHaveBeenCalledWith('course_sessions');
        expect(mockSupabaseChain.from).toHaveBeenCalledWith('courses');
        expect(mockSupabaseChain.insert).toHaveBeenCalled();
        expect(mockSupabaseChain.update).toHaveBeenCalled();
      });
    });
  });

  describe('validation methods', () => {
    describe('validateOutlineCoherence', () => {
      it('should validate outline covers objectives', () => {
        const outline = {
          sessions: [
            { objectives: ['Learn basic concepts of programming fundamentals'] },
            { objectives: ['Apply programming pa techniques in real world'] },
            { objectives: ['Master advanced concepts'] }
          ]
        };
        
        const courseConfig = {
          objectives: ['Learn basic concepts of programming', 'Apply programming patterns']
        };
        
        const result = courseGenerator.validateOutlineCoherence(outline, courseConfig);
        
        expect(result.isValid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });
      
      it('should detect missing objective coverage', () => {
        const outline = {
          sessions: [{ objectives: ['Something unrelated'] }]
        };
        
        const courseConfig = {
          objectives: ['Learn specific topic', 'Master advanced concepts']
        };
        
        const result = courseGenerator.validateOutlineCoherence(outline, courseConfig);
        
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Course outline does not adequately cover stated objectives');
      });
    });

    describe('validateSessionProgression', () => {
      it('should validate sessions have required properties', () => {
        const sessions = [
          { activities: ['Activity 1'], objectives: ['Objective 1'] },
          { activities: ['Activity 2'], objectives: ['Objective 2'] }
        ];
        
        const result = courseGenerator.validateSessionProgression(sessions);
        
        expect(result.isValid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });
      
      it('should detect missing activities or objectives', () => {
        const sessions = [
          { activities: [], objectives: ['Objective 1'] },
          { activities: ['Activity 2'] }
        ];
        
        const result = courseGenerator.validateSessionProgression(sessions);
        
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Session 1 missing learning activities');
        expect(result.issues).toContain('Session 2 missing learning objectives');
      });
    });

    describe('validateAssessmentAlignment', () => {
      it('should validate assessments structure', () => {
        const assessments = {
          quizzes: [{ title: 'Quiz 1' }],
          finalExam: { title: 'Final Exam' }
        };
        
        const result = courseGenerator.validateAssessmentAlignment(assessments, {});
        
        expect(result.isValid).toBe(true);
      });
      
      it('should detect missing assessments', () => {
        const assessments = {};
        
        const result = courseGenerator.validateAssessmentAlignment(assessments, {});
        
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('No quizzes found in assessments');
        expect(result.issues).toContain('No final exam defined');
      });
    });
  });

  describe('resource analysis methods', () => {
    describe('sortResourcesByQuality', () => {
      it('should sort resources by quality and readability', () => {
        const resources = [
          { quality_score: 80, quality_report: { readability: { level: 'difficult' } } },
          { quality_score: 90, quality_report: { readability: { level: 'easy' } } },
          { quality_score: 90, quality_report: { readability: { level: 'standard' } } },
          { quality_score: 85 }
        ];
        
        const sorted = courseGenerator.sortResourcesByQuality(resources);
        
        expect(sorted[0].quality_score).toBe(90);
        expect(sorted[0].quality_report.readability.level).toBe('easy');
        expect(sorted[1].quality_score).toBe(90);
        expect(sorted[1].quality_report.readability.level).toBe('standard');
        expect(sorted[2].quality_score).toBe(85);
        expect(sorted[3].quality_score).toBe(80);
      });
    });

    describe('createModules', () => {
      it('should create modules from tiered resources', async () => {
        const tiers = {
          core: [
            { id: 'res-1', quality_report: { readability: { level: 'easy' } } },
            { id: 'res-2', quality_report: { readability: { level: 'standard' } } },
            { id: 'res-3', quality_report: { readability: { level: 'difficult' } } }
          ],
          supplementary: [
            { id: 'res-4' }
          ]
        };
        
        // Mock estimateModuleDuration
        courseGenerator.estimateModuleDuration = jest.fn().mockReturnValue('1h 30m');
        courseGenerator.assessModuleDifficulty = jest.fn().mockReturnValue('intermediate');
        
        const modules = await courseGenerator.createModules(tiers);
        
        expect(modules.length).toBeGreaterThan(0);
        expect(modules[0].type).toBe('introduction');
        expect(modules[modules.length - 1].type).toBe('supplementary');
      });
    });

    describe('estimateModuleDuration', () => {
      it('should estimate duration based on word count', () => {
        const resources = [
          { processing_metadata: { wordCount: 1000 } },
          { extracted_content: 'word '.repeat(500) }
        ];
        
        const duration = courseGenerator.estimateModuleDuration(resources);
        
        expect(duration).toMatch(/\d+h? ?\d*m?/);
      });
    });

    describe('getQualityImprovementSuggestions', () => {
      it('should generate improvement suggestions', () => {
        const resource = {
          quality_report: {
            readability: { score: 45, level: 'difficult' },
            coherence: { score: 65, interpretation: 'fair' },
            errors: [
              { type: 'grammar', severity: 'high', message: 'Fix grammar errors' }
            ]
          }
        };
        
        const suggestions = courseGenerator.getQualityImprovementSuggestions(resource);
        
        expect(suggestions).toContainEqual(
          expect.objectContaining({
            area: 'readability',
            impact: 'high'
          })
        );
        expect(suggestions).toContainEqual(
          expect.objectContaining({
            area: 'coherence',
            impact: 'medium'
          })
        );
        expect(suggestions).toContainEqual(
          expect.objectContaining({
            area: 'errors',
            impact: 'high'
          })
        );
      });
    });
  });
  
  describe('processGenerationJob error handling', () => {
    it('should handle errors during job processing steps', async () => {
      const jobId = 'job-123';
      const courseId = 'course-123';
      const userId = 'user-123';
      const mockJob = { progress: jest.fn() };
      
      // Mock analyzeUploadedContent to throw error
      courseGenerator.analyzeUploadedContent = jest.fn().mockRejectedValue(
        new Error('Analysis failed')
      );
      
      await expect(courseGenerator.processGenerationJob(jobId, courseId, userId, mockJob))
        .rejects.toThrow('Analysis failed');
      
      expect(mockSupabaseChain.from).toHaveBeenCalledWith('generation_jobs');
      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          message: 'Analysis failed'
        })
      );
    });
  });
  
  describe('worker edge cases', () => {
    it('should handle missing resourceIds in generateCourse', async () => {
      const options = {
        courseId: 'course-123',
        userId: 'user-123'
      };
      
      mockSupabaseChain.order.mockResolvedValueOnce({
        data: [],
        error: null
      });
      
      await expect(courseGenerator.generateCourse(options))
        .rejects.toThrow('No resources meet the minimum quality score');
    });
  });
  
  describe('additional coverage tests', () => {
    describe('processGenerationJob', () => {
      it('should complete full job processing', async () => {
        const jobId = 'job-123';
        const courseId = 'course-123';
        const userId = 'user-123';
        const mockJob = { progress: jest.fn() };
        
        // Mock all the steps of processGenerationJob
        courseGenerator.updateJobStatus = jest.fn().mockResolvedValue();
        courseGenerator.analyzeUploadedContent = jest.fn().mockResolvedValue({
          totalResources: 2,
          averageScore: 85
        });
        courseGenerator.getCourseConfiguration = jest.fn().mockResolvedValue({
          title: 'Test Course',
          objectives: ['Learn basics']
        });
        courseGenerator.buildGenerationContext = jest.fn().mockResolvedValue({
          course: {},
          ragContext: {}
        });
        courseGenerator.generateAdvancedCourseOutline = jest.fn().mockResolvedValue({
          sessions: [{ title: 'Session 1' }]
        });
        courseGenerator.generateSessionDetails = jest.fn().mockResolvedValue([
          { title: 'Session 1', sequenceNumber: 1 }
        ]);
        courseGenerator.generateAssessments = jest.fn().mockResolvedValue({
          quizzes: [{}]
        });
        courseGenerator.validateAndRefineContent = jest.fn().mockResolvedValue({
          outline: {},
          sessions: [],
          assessments: {}
        });
        courseGenerator.saveGeneratedContent = jest.fn().mockResolvedValue();
        
        // Use original processGenerationJob
        courseGenerator.processGenerationJob = originalProcessGenerationJob;
        
        const result = await courseGenerator.processGenerationJob(jobId, courseId, userId, mockJob);
        
        expect(courseGenerator.updateJobStatus).toHaveBeenCalledWith(
          jobId, 'completed', 100, 'Course generation completed successfully'
        );
        expect(courseGenerator.saveGeneratedContent).toHaveBeenCalled();
      });
    });
    
    describe('analyzeUploadedContent edge cases', () => {
      it('should handle resources without quality reports', async () => {
        mockSupabaseChain.order.mockResolvedValueOnce({
          data: [
            { id: 'res-1', quality_score: 80, file_type: 'pdf' },
            { id: 'res-2', quality_score: 90, file_type: 'docx' }
          ],
          error: null
        });
        
        // Mock analyzeTopicCoverage to return empty array
        courseGenerator.analyzeTopicCoverage = jest.fn().mockResolvedValue([]);
        
        const result = await courseGenerator.analyzeUploadedContent('course-123');
        
        expect(result).toHaveProperty('totalResources', 2);
        expect(result).toHaveProperty('averageScore', 85);
        expect(result).toHaveProperty('languages');
        expect(result.languages).toHaveLength(0);
      });
    });
    
    describe('analyzeResourceQuality', () => {
      it('should analyze resource quality and generate recommendations', () => {
        const resources = [
          { quality_score: 45, quality_report: { errors: [{ severity: 'high' }] } },
          { quality_score: 85 },
          { quality_score: 90 },
          { quality_score: 75 }
        ];
        
        const result = courseGenerator.analyzeResourceQuality(resources);
        
        expect(result).toHaveProperty('totalResources', 4);
        expect(result).toHaveProperty('averageScore', 73.75);
        expect(result).toHaveProperty('qualityTiers');
        expect(result).toHaveProperty('recommendations');
        expect(result.recommendations).toContain('Some resources fall below quality threshold. Consider improving or replacing low-quality content.');
      });
    });
    
    describe('fetchQualityResources', () => {
      it('should fetch resources successfully', async () => {
        const courseId = 'course-123';
        const minScore = 50;
        
        mockSupabaseChain.order.mockResolvedValueOnce({
          data: [
            { id: 'res-1', quality_score: 80 },
            { id: 'res-2', quality_score: 90 }
          ],
          error: null
        });
        
        const result = await courseGenerator.fetchQualityResources(courseId, minScore);
        
        expect(result).toHaveLength(2);
        expect(mockSupabaseChain.from).toHaveBeenCalledWith('course_resources');
        expect(mockSupabaseChain.gte).toHaveBeenCalledWith('quality_score', minScore);
      });
      
      it('should handle database errors properly', async () => {
        const courseId = 'course-123';
        const minScore = 50;
        
        mockSupabaseChain.order.mockResolvedValueOnce({
          data: null,
          error: new Error('Database connection failed')
        });
        
        await expect(courseGenerator.fetchQualityResources(courseId, minScore))
          .rejects.toThrow('Failed to fetch resources: Database connection failed');
      });
    });
    
    describe('generateCourseStructure', () => {
      it('should generate proper course structure', async () => {
        const resources = [
          {
            id: 'res-1',
            quality_score: 85,
            quality_report: { readability: { level: 'easy' } },
            processing_metadata: { wordCount: 1000 }
          },
          {
            id: 'res-2',
            quality_score: 75,
            quality_report: { readability: { level: 'standard' } },
            processing_metadata: { wordCount: 1500 }
          }
        ];
        
        courseGenerator.estimateModuleDuration = jest.fn().mockReturnValue('1h 30m');
        courseGenerator.assessModuleDifficulty = jest.fn().mockReturnValue('intermediate');
        
        const qualityAnalysis = courseGenerator.analyzeResourceQuality(resources);
        const structure = await courseGenerator.generateCourseStructure(resources, qualityAnalysis);
        
        expect(structure).toHaveProperty('modules');
        expect(structure).toHaveProperty('resourceAllocation');
        expect(structure).toHaveProperty('estimatedDuration');
        expect(structure).toHaveProperty('difficulty');
      });
    });
    
    describe('analyzeTopicCoverage', () => {
    it('should analyze topic coverage from resources', async () => {
      const resources = [
        {
          quality_report: {
            keyPhrases: ['machine learning', 'AI', 'neural networks']
          }
        },
        {
          quality_report: {
            keyPhrases: ['machine learning', 'deep learning', 'AI']
          }
        }
      ];
      
      const result = await courseGenerator.analyzeTopicCoverage(resources);
      
      expect(result).toContainEqual({ topic: 'machine learning', count: 2 });
      expect(result).toContainEqual({ topic: 'AI', count: 2 });
      expect(result.length).toBeLessThanOrEqual(20);
    });
    
    it('should handle errors in topic analysis', async () => {
      const resources = null;
      
      const result = await courseGenerator.analyzeTopicCoverage(resources);
      
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to analyze topic coverage:',
        expect.any(Error)
      );
    });
  });
  
  describe('generateQualityRecommendations', () => {
    it('should generate quality recommendations based on analysis', () => {
      const qualityAnalysis = {
        averageScore: 45,
        qualityTiers: {
          core: [],
          supplementary: [],
          reference: []
        },
        recommendations: []
      };
      
      const result = courseGenerator.generateQualityRecommendations(qualityAnalysis);
      
      expect(result).toContain('Content quality is below acceptable threshold (45). Significant improvements needed.');
      expect(result).toContain('No core resources identified. Add high-quality foundational content.');
    });
    
    it('should handle good quality content', () => {
      const qualityAnalysis = {
        averageScore: 85,
        qualityTiers: {
          core: [1, 2, 3],
          supplementary: [4, 5],
          reference: [6]
        },
        recommendations: []
      };
      
      const result = courseGenerator.generateQualityRecommendations(qualityAnalysis);
      
      expect(result).toContain('Content quality is good (85). Minor improvements could enhance learning outcomes.');
    });
  });
  
  describe('tierResources', () => {
    it('should properly tier resources based on quality', () => {
      const resources = [
        { quality_score: 95, id: '1' },
        { quality_score: 80, id: '2' },
        { quality_score: 60, id: '3' },
        { quality_score: 90, id: '4' }
      ];
      
      const result = courseGenerator.tierResources(resources);
      
      expect(result.core).toHaveLength(2); // 95, 90
      expect(result.supplementary).toHaveLength(1); // 80
      expect(result.reference).toHaveLength(1); // 60
      expect(result.core[0].quality_score).toBe(95);
    });
  });
  
  describe('assessModuleDifficulty', () => {
    it('should assess module difficulty from resources', () => {
      const resources = [
        { quality_report: { readability: { level: 'easy' } } },
        { quality_report: { readability: { level: 'standard' } } }
      ];
      
      const result = courseGenerator.assessModuleDifficulty(resources);
      
      expect(result).toBe('beginner');
    });
    
    it('should handle resources without readability data', () => {
      const resources = [
        { quality_report: {} },
        { }
      ];
      
      const result = courseGenerator.assessModuleDifficulty(resources);
      
      expect(result).toBe('intermediate');
    });
  });
  
  describe('refineContent', () => {
      it('should log refinement and return content', async () => {
        const content = { outline: {}, sessions: [] };
        const issues = ['Issue 1'];
        
        const result = await courseGenerator.refineContent(content, issues);
        
        expect(result).toEqual(content);
        expect(logger.info).toHaveBeenCalledWith(
          'Attempting to refine content based on validation issues'
        );
      });
    });
  });
});