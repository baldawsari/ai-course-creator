const request = require('supertest');
const express = require('express');
const { supabaseAdmin } = require('../../../src/config/database');
const courseGenerator = require('../../../src/services/courseGenerator');
const logger = require('../../../src/utils/logger');

// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/services/courseGenerator');
jest.mock('../../../src/utils/logger');

// Import the app after mocking
const coursesRouter = require('../../../src/routes/courses');

describe('Courses API Integration Tests', () => {
  let app;
  let mockSupabase;

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
    app.use('/courses', coursesRouter);
    
    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn()
    };
    
    supabaseAdmin.from.mockReturnValue(mockSupabase);
    
    // Mock logger
    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();
  });

  describe('GET /courses', () => {
    const mockCourses = [
      {
        id: 'course-1',
        title: 'Test Course 1',
        description: 'Description 1',
        level: 'beginner',
        status: 'published',
        user_profiles: { username: 'testuser', role: 'instructor' },
        course_sessions: [{ count: 5 }],
        course_resources: [{ count: 3 }]
      },
      {
        id: 'course-2',
        title: 'Test Course 2',
        description: 'Description 2',
        level: 'advanced',
        status: 'draft',
        user_profiles: { username: 'testuser', role: 'instructor' },
        course_sessions: [{ count: 8 }],
        course_resources: [{ count: 2 }]
      }
    ];

    it('should list user courses with default pagination', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockCourses,
        error: null,
        count: 2
      });

      const response = await request(app)
        .get('/courses')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'course-1',
            title: 'Test Course 1',
            sessionCount: 5,
            resourceCount: 3
          })
        ]),
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1
        }
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should filter courses by search term', async () => {
      mockSupabase.range.mockResolvedValue({
        data: [mockCourses[0]],
        error: null,
        count: 1
      });

      await request(app)
        .get('/courses?search=Test Course 1')
        .expect(200);

      expect(mockSupabase.or).toHaveBeenCalledWith(
        expect.stringContaining('title.ilike.%Test Course 1%')
      );
    });

    it('should filter courses by level', async () => {
      mockSupabase.range.mockResolvedValue({
        data: [mockCourses[0]],
        error: null,
        count: 1
      });

      await request(app)
        .get('/courses?level=beginner')
        .expect(200);

      expect(mockSupabase.eq).toHaveBeenCalledWith('level', 'beginner');
    });

    it('should handle database errors', async () => {
      mockSupabase.range.mockResolvedValue({
        data: null,
        error: new Error('Database error')
      });

      const response = await request(app)
        .get('/courses')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /courses', () => {
    const newCourse = {
      title: 'New Test Course',
      description: 'A new course for testing',
      level: 'intermediate',
      duration: '6 weeks',
      target_audience: 'Developers',
      prerequisites: ['Basic programming'],
      objectives: ['Learn testing', 'Write tests'],
      tags: ['testing', 'javascript']
    };

    it('should create a new course', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'course-123', ...newCourse, user_id: 'user-123' },
        error: null
      });

      const response = await request(app)
        .post('/courses')
        .send(newCourse)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: 'course-123',
          title: 'New Test Course'
        })
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Test Course',
          user_id: 'user-123'
        })
      );
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/courses')
        .send({ description: 'Missing title' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.details).toContain('title');
    });

    it('should validate field lengths', async () => {
      const response = await request(app)
        .post('/courses')
        .send({ title: 'ab' }) // Too short
        .expect(400);

      expect(response.body.details).toContain('at least 3 characters');
    });
  });

  describe('GET /courses/:id', () => {
    const mockCourse = {
      id: 'course-123',
      title: 'Test Course',
      description: 'Course description',
      level: 'intermediate',
      user_id: 'user-123',
      course_sessions: [
        { id: 'session-1', title: 'Session 1', sequence_number: 1 },
        { id: 'session-2', title: 'Session 2', sequence_number: 2 }
      ],
      course_resources: [
        { id: 'resource-1', title: 'Resource 1', type: 'document' }
      ]
    };

    it('should get course details', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockCourse,
        error: null
      });

      const response = await request(app)
        .get('/courses/course-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: 'course-123',
          title: 'Test Course',
          sessions: expect.arrayContaining([
            expect.objectContaining({ title: 'Session 1' })
          ]),
          resources: expect.arrayContaining([
            expect.objectContaining({ title: 'Resource 1' })
          ])
        })
      });
    });

    it('should return 404 for non-existent course', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null
      });

      const response = await request(app)
        .get('/courses/non-existent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Course not found'
      });
    });

    it('should prevent accessing other users courses', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { ...mockCourse, user_id: 'other-user' },
        error: null
      });

      const response = await request(app)
        .get('/courses/course-123')
        .expect(403);

      expect(response.body).toEqual({
        error: 'Access denied'
      });
    });
  });

  describe('PUT /courses/:id', () => {
    const updateData = {
      title: 'Updated Course Title',
      description: 'Updated description',
      status: 'published'
    };

    it('should update course', async () => {
      // First check ownership
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'course-123', user_id: 'user-123' },
        error: null
      });

      // Then update
      mockSupabase.single.mockResolvedValue({
        data: { id: 'course-123', ...updateData },
        error: null
      });

      const response = await request(app)
        .put('/courses/course-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          title: 'Updated Course Title'
        })
      });

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Course Title',
          updated_at: expect.any(String)
        })
      );
    });

    it('should validate update fields', async () => {
      const response = await request(app)
        .put('/courses/course-123')
        .send({ level: 'expert' }) // Invalid level
        .expect(400);

      expect(response.body.details).toContain('level');
    });
  });

  describe('DELETE /courses/:id', () => {
    it('should delete course', async () => {
      // Check ownership
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'course-123', user_id: 'user-123' },
        error: null
      });

      // Delete course
      mockSupabase.eq.mockResolvedValue({
        data: null,
        error: null
      });

      const response = await request(app)
        .delete('/courses/course-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Course deleted successfully'
      });

      expect(mockSupabase.delete).toHaveBeenCalled();
    });

    it('should prevent deleting other users courses', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'course-123', user_id: 'other-user' },
        error: null
      });

      const response = await request(app)
        .delete('/courses/course-123')
        .expect(403);

      expect(response.body).toEqual({
        error: 'Access denied'
      });
    });
  });

  describe('Course Sessions', () => {
    describe('GET /courses/:id/sessions', () => {
      it('should list course sessions', async () => {
        const mockSessions = [
          { id: 'session-1', title: 'Session 1', sequence_number: 1 },
          { id: 'session-2', title: 'Session 2', sequence_number: 2 }
        ];

        // Check course ownership
        mockSupabase.maybeSingle.mockResolvedValueOnce({
          data: { id: 'course-123', user_id: 'user-123' },
          error: null
        });

        // Get sessions
        mockSupabase.order.mockResolvedValue({
          data: mockSessions,
          error: null
        });

        const response = await request(app)
          .get('/courses/course-123/sessions')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockSessions
        });
      });
    });

    describe('POST /courses/:id/sessions', () => {
      const newSession = {
        title: 'New Session',
        description: 'Session description',
        duration_minutes: 90,
        objectives: ['Learn something new'],
        content: { type: 'lecture' }
      };

      it('should create new session', async () => {
        // Check ownership
        mockSupabase.maybeSingle.mockResolvedValueOnce({
          data: { id: 'course-123', user_id: 'user-123' },
          error: null
        });

        // Get max sequence number
        mockSupabase.order.mockResolvedValueOnce({
          data: [{ sequence_number: 2 }],
          error: null
        });

        // Insert session
        mockSupabase.single.mockResolvedValue({
          data: { id: 'session-123', ...newSession, sequence_number: 3 },
          error: null
        });

        const response = await request(app)
          .post('/courses/course-123/sessions')
          .send(newSession)
          .expect(201);

        expect(response.body.data).toMatchObject({
          title: 'New Session',
          sequence_number: 3
        });
      });
    });

    describe('POST /courses/:id/sessions/reorder', () => {
      it('should reorder sessions', async () => {
        const reorderData = {
          sessions: [
            { id: 'session-2', sequence_number: 1 },
            { id: 'session-1', sequence_number: 2 }
          ]
        };

        // Check ownership
        mockSupabase.maybeSingle.mockResolvedValueOnce({
          data: { id: 'course-123', user_id: 'user-123' },
          error: null
        });

        // Mock transaction
        mockSupabase.eq.mockResolvedValue({
          data: null,
          error: null
        });

        const response = await request(app)
          .post('/courses/course-123/sessions/reorder')
          .send(reorderData)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Sessions reordered successfully'
        });
      });
    });
  });

  describe('Course Generation', () => {
    describe('POST /courses/:id/generate', () => {
      it('should start course generation', async () => {
        const generateConfig = {
          documentId: 'doc-123',
          config: {
            difficulty: 'intermediate',
            duration: '4 weeks'
          }
        };

        // Check ownership
        mockSupabase.maybeSingle.mockResolvedValueOnce({
          data: { id: 'course-123', user_id: 'user-123' },
          error: null
        });

        // Mock generation
        courseGenerator.generateCourse.mockResolvedValue({
          jobId: 'job-123',
          status: 'processing'
        });

        const response = await request(app)
          .post('/courses/course-123/generate')
          .send(generateConfig)
          .expect(202);

        expect(response.body).toEqual({
          success: true,
          jobId: 'job-123',
          message: 'Course generation started'
        });
      });
    });

    describe('GET /courses/:id/generation/:jobId', () => {
      it('should get generation status', async () => {
        courseGenerator.getJobStatus.mockResolvedValue({
          status: 'completed',
          progress: 100,
          result: { sessions: 10 }
        });

        const response = await request(app)
          .get('/courses/course-123/generation/job-123')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          status: 'completed',
          progress: 100,
          result: { sessions: 10 }
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/courses')
        .send({ title: 123 }) // Wrong type
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should handle database connection errors', async () => {
      supabaseAdmin.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/courses')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});