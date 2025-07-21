const ClaudeService = require('../../../src/services/claudeService');
const { testHelpers } = require('../../utils/testHelpers');
const logger = require('../../../src/utils/logger');

jest.mock('../../../src/utils/logger');
jest.mock('@anthropic-ai/sdk');

describe('ClaudeService', () => {
  let claudeService;
  let mockAnthropicClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAnthropicClient = {
      messages: {
        create: jest.fn()
      }
    };
    
    const Anthropic = require('@anthropic-ai/sdk');
    Anthropic.mockImplementation(() => mockAnthropicClient);
    
    claudeService = new ClaudeService({
      apiKey: 'test-api-key',
      enableCaching: true,
      maxRetries: 2,
      retryDelay: 100
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(claudeService.config.model).toBe('claude-3-5-sonnet-20241022');
      expect(claudeService.config.maxTokens).toBe(4000);
      expect(claudeService.config.temperature).toBe(0.7);
      expect(claudeService.config.enableCaching).toBe(true);
    });

    it('should initialize caches and stats', () => {
      expect(claudeService.responseCache).toBeInstanceOf(Map);
      expect(claudeService.tokenCache).toBeInstanceOf(Map);
      expect(claudeService.usageStats).toEqual({
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        cacheHits: 0,
        errors: 0
      });
    });

    it('should initialize prompt templates', () => {
      expect(claudeService.promptTemplates).toHaveProperty('courseStructure');
      expect(claudeService.promptTemplates).toHaveProperty('sessionDetails');
      expect(claudeService.promptTemplates).toHaveProperty('assessments');
      expect(claudeService.promptTemplates).toHaveProperty('activities');
    });
  });

  describe('generateCourseStructure', () => {
    const mockConfig = {
      title: 'Test Course',
      targetAudience: 'Developers',
      difficulty: 'intermediate',
      duration: '4 weeks',
      description: 'A test course'
    };

    const mockResponse = {
      id: 'msg-123',
      content: [{
        text: JSON.stringify({
          title: 'Test Course',
          sessions: [
            {
              title: 'Session 1',
              learningObjectives: ['Objective 1', 'Objective 2'],
              estimatedDuration: 60,
              topics: ['Topic 1']
            }
          ],
          assessmentStrategy: 'Regular quizzes',
          prerequisites: ['Basic programming'],
          totalDuration: '4 weeks',
          difficulty: 'intermediate'
        })
      }],
      usage: {
        input_tokens: 1000,
        output_tokens: 500
      }
    };

    it('should generate course structure successfully', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse);

      const result = await claudeService.generateCourseStructure(mockConfig);

      expect(result).toHaveProperty('title', 'Test Course');
      expect(result).toHaveProperty('sessions');
      expect(result.sessions).toHaveLength(1);
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: claudeService.config.model,
          max_tokens: claudeService.config.maxTokens,
          temperature: claudeService.config.temperature,
          system: expect.stringContaining('expert instructional designer'),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Test Course')
            })
          ])
        })
      );
    });

    it('should use cache when available', async () => {
      const cacheKey = claudeService.generateCacheKey('course-structure', expect.any(String));
      const cachedResponse = { title: 'Cached Course', sessions: [] };
      claudeService.responseCache.set(cacheKey, cachedResponse);

      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse);

      const result = await claudeService.generateCourseStructure(mockConfig);

      expect(result).toEqual(cachedResponse);
      expect(mockAnthropicClient.messages.create).not.toHaveBeenCalled();
      expect(claudeService.usageStats.cacheHits).toBe(1);
    });

    it('should handle RAG context', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse);

      const ragContext = [
        { content: 'Context 1', score: 0.9 },
        { content: 'Context 2', score: 0.8 }
      ];

      await claudeService.generateCourseStructure(mockConfig, ragContext);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Context 1')
            })
          ])
        })
      );
    });

    it('should validate config before generation', async () => {
      await expect(claudeService.generateCourseStructure({}))
        .rejects.toThrow('Invalid course configuration');

      await expect(claudeService.generateCourseStructure({ title: 'Test' }))
        .rejects.toThrow('Target audience is required');
    });

    it('should handle API errors with retry', async () => {
      const error = new Error('Rate limit exceeded');
      error.status = 429;
      
      mockAnthropicClient.messages.create
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResponse);

      const result = await claudeService.generateCourseStructure(mockConfig);

      expect(result).toHaveProperty('title', 'Test Course');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const error = new Error('API Error');
      mockAnthropicClient.messages.create.mockRejectedValue(error);

      await expect(claudeService.generateCourseStructure(mockConfig))
        .rejects.toThrow('API Error');
      
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(2);
      expect(claudeService.usageStats.errors).toBe(1);
    });
  });

  describe('generateSessionDetails', () => {
    const mockSessionInfo = {
      title: 'Introduction to Testing',
      learningObjectives: ['Understand testing basics', 'Write first test'],
      topics: ['Unit testing', 'Test frameworks'],
      estimatedDuration: 90
    };

    const mockResponse = {
      id: 'msg-456',
      content: [{
        text: JSON.stringify({
          title: 'Introduction to Testing',
          overview: 'Learn testing fundamentals',
          activities: [
            {
              type: 'reading',
              title: 'Introduction to Unit Testing',
              description: 'Read about unit testing basics',
              duration: 15
            }
          ],
          resources: ['Testing Guide', 'Jest Documentation'],
          keyTakeaways: ['Tests prevent bugs', 'TDD improves design']
        })
      }],
      usage: {
        input_tokens: 800,
        output_tokens: 400
      }
    };

    it('should generate session details successfully', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse);

      const result = await claudeService.generateSessionDetails(mockSessionInfo);

      expect(result).toHaveProperty('title', 'Introduction to Testing');
      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('activities');
      expect(result.activities).toHaveLength(1);
    });

    it('should validate session info', async () => {
      await expect(claudeService.generateSessionDetails({}))
        .rejects.toThrow('Invalid session information');

      await expect(claudeService.generateSessionDetails({ title: 'Test' }))
        .rejects.toThrow('Learning objectives are required');
    });

    it('should include course context if provided', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse);

      const courseContext = {
        title: 'Advanced Testing Course',
        difficulty: 'advanced'
      };

      await claudeService.generateSessionDetails(mockSessionInfo, null, courseContext);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Advanced Testing Course')
            })
          ])
        })
      );
    });
  });

  describe('generateAssessments', () => {
    const mockConfig = {
      courseTitle: 'Test Course',
      sessionTitle: 'Session 1',
      learningObjectives: ['Objective 1', 'Objective 2'],
      assessmentType: 'quiz',
      questionCount: 5,
      difficulty: 'intermediate'
    };

    const mockResponse = {
      id: 'msg-789',
      content: [{
        text: JSON.stringify({
          quizzes: [
            {
              title: 'Session 1 Quiz',
              questions: [
                {
                  type: 'multiple_choice',
                  question: 'What is testing?',
                  options: ['A', 'B', 'C', 'D'],
                  correctAnswer: 0,
                  explanation: 'Testing is...'
                }
              ]
            }
          ],
          assignments: [],
          finalExam: {
            title: 'Final Exam',
            format: 'mixed',
            duration: 120,
            questionCount: 30
          }
        })
      }],
      usage: {
        input_tokens: 600,
        output_tokens: 300
      }
    };

    it('should generate assessments successfully', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse);

      const result = await claudeService.generateAssessments(mockConfig);

      expect(result).toHaveProperty('quizzes');
      expect(result).toHaveProperty('assignments');
      expect(result).toHaveProperty('finalExam');
      expect(result.quizzes).toHaveLength(1);
    });

    it('should handle different assessment types', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse);

      const configWithAssignment = {
        ...mockConfig,
        assessmentType: 'assignment'
      };

      await claudeService.generateAssessments(configWithAssignment);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('assignment')
            })
          ])
        })
      );
    });
  });

  describe('generateActivities', () => {
    const mockObjectives = [
      'Learn testing basics',
      'Write unit tests'
    ];

    const mockResponse = {
      id: 'msg-101',
      content: [{
        text: JSON.stringify({
          activities: [
            {
              type: 'hands-on',
              title: 'Write Your First Test',
              description: 'Create a simple unit test',
              learningObjective: 'Write unit tests',
              duration: 30,
              instructions: ['Step 1', 'Step 2'],
              materials: ['Jest', 'Sample code']
            }
          ],
          overview: 'Practical activities to reinforce learning'
        })
      }],
      usage: {
        input_tokens: 500,
        output_tokens: 250
      }
    };

    it('should generate activities successfully', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse);

      const result = await claudeService.generateActivities(mockObjectives);

      expect(result).toHaveProperty('activities');
      expect(result).toHaveProperty('overview');
      expect(result.activities).toHaveLength(1);
      expect(result.activities[0]).toHaveProperty('type', 'hands-on');
    });

    it('should validate objectives', async () => {
      await expect(claudeService.generateActivities([]))
        .rejects.toThrow('At least one learning objective is required');

      await expect(claudeService.generateActivities(null))
        .rejects.toThrow('At least one learning objective is required');
    });
  });

  describe('generateSessionsInParallel', () => {
    const mockSessions = [
      { title: 'Session 1', learningObjectives: ['Obj 1'] },
      { title: 'Session 2', learningObjectives: ['Obj 2'] },
      { title: 'Session 3', learningObjectives: ['Obj 3'] }
    ];

    it('should generate sessions in parallel with batching', async () => {
      const mockResponses = mockSessions.map((session, index) => ({
        id: `msg-${index}`,
        content: [{
          text: JSON.stringify({
            title: session.title,
            overview: `Overview for ${session.title}`,
            activities: []
          })
        }],
        usage: { input_tokens: 100, output_tokens: 50 }
      }));

      mockAnthropicClient.messages.create
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);

      const results = await claudeService.generateSessionsInParallel(mockSessions, null, null, 2);

      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('title', 'Session 1');
      expect(results[1]).toHaveProperty('title', 'Session 2');
      expect(results[2]).toHaveProperty('title', 'Session 3');
    });

    it('should handle errors in parallel generation', async () => {
      mockAnthropicClient.messages.create
        .mockResolvedValueOnce({
          content: [{ text: '{"title": "Session 1", "overview": "Test"}' }],
          usage: { input_tokens: 100, output_tokens: 50 }
        })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          content: [{ text: '{"title": "Session 3", "overview": "Test"}' }],
          usage: { input_tokens: 100, output_tokens: 50 }
        });

      const results = await claudeService.generateSessionsInParallel(mockSessions, null, null, 2);

      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('title', 'Session 1');
      expect(results[1]).toBeNull();
      expect(results[2]).toHaveProperty('title', 'Session 3');
    });
  });

  describe('parseAndValidateResponse', () => {
    it('should parse valid JSON response', () => {
      const validJson = '{"title": "Test", "sessions": []}';
      const result = claudeService.parseAndValidateResponse(validJson, 'course');

      expect(result).toEqual({ title: 'Test', sessions: [] });
    });

    it('should extract JSON from code blocks', () => {
      const withCodeBlock = '```json\n{"title": "Test", "sessions": []}\n```';
      const result = claudeService.parseAndValidateResponse(withCodeBlock, 'course');

      expect(result).toEqual({ title: 'Test', sessions: [] });
    });

    it('should handle responses with extra text', () => {
      const withExtraText = 'Here is the JSON:\n{"title": "Test", "sessions": []}\nEnd of response';
      const result = claudeService.parseAndValidateResponse(withExtraText, 'course');

      expect(result).toEqual({ title: 'Test', sessions: [] });
    });

    it('should repair incomplete JSON', () => {
      const incompleteJson = '{"title": "Test", "sessions": [{"title": "Session 1"';
      const result = claudeService.parseAndValidateResponse(incompleteJson, 'course');

      expect(result).toHaveProperty('title', 'Test');
      expect(result).toHaveProperty('sessions');
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = 'This is not JSON at all';
      
      expect(() => claudeService.parseAndValidateResponse(invalidJson, 'course'))
        .toThrow('Failed to parse Claude response');
    });

    it('should validate response structure', () => {
      const invalidStructure = '{"title": "Test"}';
      
      expect(() => claudeService.parseAndValidateResponse(invalidStructure, 'course'))
        .toThrow('Invalid response structure');
    });
  });

  describe('cache management', () => {
    it('should generate consistent cache keys', () => {
      const key1 = claudeService.generateCacheKey('course', 'test prompt');
      const key2 = claudeService.generateCacheKey('course', 'test prompt');
      const key3 = claudeService.generateCacheKey('course', 'different prompt');

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it('should clear cache', () => {
      claudeService.responseCache.set('key1', 'value1');
      claudeService.tokenCache.set('key2', 'value2');

      claudeService.clearCache();

      expect(claudeService.responseCache.size).toBe(0);
      expect(claudeService.tokenCache.size).toBe(0);
    });
  });

  describe('usage tracking', () => {
    it('should track usage statistics', () => {
      claudeService.updateUsageStats({
        input_tokens: 1000,
        output_tokens: 500
      });

      expect(claudeService.usageStats.totalTokens).toBe(1500);
      expect(claudeService.usageStats.requestCount).toBe(1);
    });

    it('should calculate costs correctly', () => {
      claudeService.updateUsageStats({
        input_tokens: 10000,
        output_tokens: 5000
      });

      const stats = claudeService.getUsageStats();
      expect(stats.totalCost).toBeGreaterThan(0);
    });

    it('should check cost limits', () => {
      claudeService.config.maxCostPerRequest = 0.01;
      claudeService.usageStats.totalCost = 0.02;

      expect(() => claudeService.checkCostLimits())
        .toThrow('Cost limit exceeded');
    });
  });

  describe('health check', () => {
    it('should perform health check successfully', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ text: 'OK' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      const result = await claudeService.healthCheck();

      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('model', claudeService.config.model);
      expect(result).toHaveProperty('responseTime');
    });

    it('should handle health check failure', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(new Error('API Error'));

      const result = await claudeService.healthCheck();

      expect(result).toHaveProperty('status', 'unhealthy');
      expect(result).toHaveProperty('error', 'API Error');
    });
  });

  describe('utility methods', () => {
    it('should create batches correctly', () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const batches = claudeService.createBatches(items, 3);

      expect(batches).toHaveLength(3);
      expect(batches[0]).toEqual([1, 2, 3]);
      expect(batches[1]).toEqual([4, 5, 6]);
      expect(batches[2]).toEqual([7]);
    });

    it('should delay execution', async () => {
      const start = Date.now();
      await claudeService.delay(100);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(90);
      expect(duration).toBeLessThan(150);
    });
  });
});