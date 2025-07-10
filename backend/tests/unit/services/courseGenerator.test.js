const CourseGenerator = require('../../../src/services/courseGenerator');
const { mockData, SAMPLE_COURSE_STRUCTURE } = require('../../utils/mockData');
const { testHelpers } = require('../../utils/testHelpers');

describe('CourseGenerator Service', () => {
  let courseGenerator;
  let mockClaudeClient;
  let mockRAGPipeline;
  let mockSupabase;

  beforeEach(() => {
    mockClaudeClient = testHelpers.createMockClaudeClient();
    mockRAGPipeline = {
      search: jest.fn(),
      processDocument: jest.fn(),
    };
    mockSupabase = testHelpers.createMockSupabaseClient();

    courseGenerator = new CourseGenerator({
      claudeClient: mockClaudeClient,
      ragPipeline: mockRAGPipeline,
      supabase: mockSupabase,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCourse', () => {
    it('should generate a course successfully', async () => {
      const documentId = 'doc-123';
      const userId = 'user-123';
      const config = {
        difficulty: 'intermediate',
        duration: '4 weeks',
      };

      // Mock document retrieval
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: documentId,
          content: mockData.SAMPLE_PDF_CONTENT,
          collection_name: 'test_collection',
        },
        error: null,
      });

      // Mock RAG search
      mockRAGPipeline.search.mockResolvedValue([
        { content: 'Relevant content 1', score: 0.9 },
        { content: 'Relevant content 2', score: 0.85 },
      ]);

      // Mock Claude response
      mockClaudeClient.messages.create.mockResolvedValue({
        content: [{ text: JSON.stringify(SAMPLE_COURSE_STRUCTURE) }],
      });

      // Mock course save
      mockSupabase.from().insert().single.mockResolvedValueOnce({
        data: {
          id: 'course-123',
          title: SAMPLE_COURSE_STRUCTURE.title,
          content: SAMPLE_COURSE_STRUCTURE,
        },
        error: null,
      });

      const result = await courseGenerator.generateCourse(documentId, userId, config);

      expect(result).toHaveProperty('id', 'course-123');
      expect(result).toHaveProperty('title', SAMPLE_COURSE_STRUCTURE.title);
      expect(mockRAGPipeline.search).toHaveBeenCalled();
      expect(mockClaudeClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          messages: expect.any(Array),
        })
      );
    });

    it('should handle missing document', async () => {
      const documentId = 'non-existent';
      const userId = 'user-123';

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Document not found' },
      });

      await expect(courseGenerator.generateCourse(documentId, userId))
        .rejects.toThrow('Document not found');
    });

    it('should handle Claude API errors', async () => {
      const documentId = 'doc-123';
      const userId = 'user-123';

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: documentId, content: 'Test content' },
        error: null,
      });

      mockRAGPipeline.search.mockResolvedValue([{ content: 'Test', score: 0.8 }]);
      mockClaudeClient.messages.create.mockRejectedValue(new Error('API rate limit'));

      await expect(courseGenerator.generateCourse(documentId, userId))
        .rejects.toThrow('API rate limit');
    });

    it('should handle invalid course structure from Claude', async () => {
      const documentId = 'doc-123';
      const userId = 'user-123';

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: documentId, content: 'Test content' },
        error: null,
      });

      mockRAGPipeline.search.mockResolvedValue([{ content: 'Test', score: 0.8 }]);
      mockClaudeClient.messages.create.mockResolvedValue({
        content: [{ text: 'Invalid JSON response' }],
      });

      await expect(courseGenerator.generateCourse(documentId, userId))
        .rejects.toThrow('Invalid course structure');
    });
  });

  describe('generateModuleContent', () => {
    it('should generate content for a specific module', async () => {
      const moduleTitle = 'Introduction to Machine Learning';
      const context = 'Machine learning basics and fundamentals';

      mockClaudeClient.messages.create.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            title: moduleTitle,
            content: '<h1>Introduction to Machine Learning</h1><p>Content here...</p>',
            examples: ['Example 1', 'Example 2'],
            activities: ['Activity 1'],
            keyTakeaways: ['Key point 1', 'Key point 2'],
          }),
        }],
      });

      const result = await courseGenerator.generateModuleContent(moduleTitle, context);

      expect(result).toHaveProperty('title', moduleTitle);
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('examples');
      expect(result).toHaveProperty('activities');
      expect(result).toHaveProperty('keyTakeaways');
    });
  });

  describe('generateAssessment', () => {
    it('should generate assessment questions', async () => {
      const courseId = 'course-123';
      const moduleTitle = 'Machine Learning Basics';

      mockClaudeClient.messages.create.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            questions: [
              {
                type: 'multiple_choice',
                question: 'What is machine learning?',
                options: ['A', 'B', 'C', 'D'],
                correct: 0,
                explanation: 'ML is...',
              },
              {
                type: 'true_false',
                question: 'ML requires labeled data',
                correct: false,
                explanation: 'Not all ML requires labels',
              },
            ],
          }),
        }],
      });

      const result = await courseGenerator.generateAssessment(courseId, moduleTitle);

      expect(result).toHaveProperty('questions');
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]).toHaveProperty('type', 'multiple_choice');
      expect(result.questions[1]).toHaveProperty('type', 'true_false');
    });
  });

  describe('buildPrompt', () => {
    it('should build a comprehensive prompt with context', () => {
      const template = 'Create a course about {topic}';
      const context = {
        topic: 'Machine Learning',
        additionalContext: ['Context 1', 'Context 2'],
      };

      const prompt = courseGenerator.buildPrompt(template, context);

      expect(prompt).toContain('Machine Learning');
      expect(prompt).toContain('Context 1');
      expect(prompt).toContain('Context 2');
    });
  });

  describe('validateCourseStructure', () => {
    it('should validate a correct course structure', () => {
      const valid = courseGenerator.validateCourseStructure(SAMPLE_COURSE_STRUCTURE);
      expect(valid).toBe(true);
    });

    it('should reject invalid structures', () => {
      const invalidStructures = [
        {}, // Empty
        { title: 'Only Title' }, // Missing modules
        { title: 'Test', modules: [] }, // Empty modules
        { title: 'Test', modules: [{ title: 'Module' }] }, // Module missing fields
      ];

      invalidStructures.forEach(structure => {
        expect(courseGenerator.validateCourseStructure(structure)).toBe(false);
      });
    });
  });

  describe('enrichContentWithRAG', () => {
    it('should enrich content with relevant information', async () => {
      const content = 'Basic machine learning concepts';
      const collectionName = 'test_collection';

      mockRAGPipeline.search.mockResolvedValue([
        { content: 'Supervised learning uses labeled data', score: 0.9 },
        { content: 'Unsupervised learning finds patterns', score: 0.85 },
      ]);

      const enriched = await courseGenerator.enrichContentWithRAG(content, collectionName);

      expect(enriched).toContain(content);
      expect(enriched).toContain('Supervised learning');
      expect(enriched).toContain('Unsupervised learning');
      expect(mockRAGPipeline.search).toHaveBeenCalledWith(
        content,
        collectionName,
        expect.any(Object)
      );
    });

    it('should handle no RAG results', async () => {
      const content = 'Original content';
      const collectionName = 'test_collection';

      mockRAGPipeline.search.mockResolvedValue([]);

      const enriched = await courseGenerator.enrichContentWithRAG(content, collectionName);

      expect(enriched).toBe(content);
    });
  });

  describe('saveCourse', () => {
    it('should save course to database', async () => {
      const courseData = {
        title: 'Test Course',
        content: SAMPLE_COURSE_STRUCTURE,
        document_id: 'doc-123',
        user_id: 'user-123',
      };

      mockSupabase.from().insert().single.mockResolvedValueOnce({
        data: { id: 'course-123', ...courseData },
        error: null,
      });

      const saved = await courseGenerator.saveCourse(courseData);

      expect(saved).toHaveProperty('id', 'course-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('courses');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: courseData.title,
          status: 'completed',
        })
      );
    });

    it('should handle save errors', async () => {
      const courseData = {
        title: 'Test Course',
        content: {},
        document_id: 'doc-123',
        user_id: 'user-123',
      };

      mockSupabase.from().insert().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(courseGenerator.saveCourse(courseData))
        .rejects.toThrow('Database error');
    });
  });

  describe('updateCourseStatus', () => {
    it('should update course generation status', async () => {
      const courseId = 'course-123';
      const status = 'processing';

      mockSupabase.from().update().eq().single.mockResolvedValueOnce({
        data: { id: courseId, status },
        error: null,
      });

      await courseGenerator.updateCourseStatus(courseId, status);

      expect(mockSupabase.update).toHaveBeenCalledWith({ status });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', courseId);
    });
  });
});