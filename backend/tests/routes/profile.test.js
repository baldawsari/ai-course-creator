const request = require('supertest');
const app = require('../../src/app');
const { supabaseAdmin } = require('../../src/config/database');

// Mock dependencies
jest.mock('../../src/config/database');
jest.mock('../../src/utils/logger');

describe('Profile Routes', () => {
  let authToken;
  const userId = 'test-user-id';

  beforeEach(() => {
    authToken = 'valid-jwt-token';
    jest.clearAllMocks();
  });

  describe('GET /api/profile', () => {
    it('should return user profile successfully', async () => {
      const mockProfile = {
        id: userId,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'instructor',
        courses: [{ count: 5 }],
        api_keys: [{ count: 2 }]
      };

      supabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        })
      });

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.profile).toMatchObject({
        id: userId,
        email: 'test@example.com',
        full_name: 'Test User',
        courseCount: 5,
        apiKeyCount: 2
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/profile')
        .expect(401);
    });
  });

  describe('PUT /api/profile', () => {
    it('should update profile successfully', async () => {
      const updateData = {
        full_name: 'Updated Name',
        bio: 'New bio'
      };

      const updatedProfile = {
        ...updateData,
        id: userId,
        email: 'test@example.com'
      };

      supabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            neq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedProfile, error: null })
            })
          })
        })
      });

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.profile).toMatchObject(updatedProfile);
    });

    it('should return 409 if username already taken', async () => {
      const updateData = {
        username: 'existinguser'
      };

      supabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            neq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: { id: 'other-user-id' }, 
                error: null 
              })
            })
          })
        })
      });

      await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(409);
    });
  });

  describe('GET /api/profile/usage', () => {
    it('should return usage statistics', async () => {
      const mockCourses = [
        { status: 'published' },
        { status: 'draft' },
        { status: 'published' }
      ];

      const mockResources = [
        { file_size: 1024 * 1024, status: 'processed' },
        { file_size: 2048 * 1024, status: 'processed' }
      ];

      const mockJobs = [
        { status: 'completed' },
        { status: 'failed' },
        { status: 'completed' }
      ];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'courses') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockCourses, error: null })
            })
          };
        } else if (table === 'course_resources') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockResources, error: null })
            })
          };
        } else if (table === 'generation_jobs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({ data: mockJobs, error: null })
              })
            })
          };
        }
      });

      const response = await request(app)
        .get('/api/profile/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.usage).toMatchObject({
        courses: {
          total: 3,
          published: 2,
          draft: 1
        },
        resources: {
          total: 2,
          processed: 2
        },
        generation: {
          totalJobs: 3,
          completed: 2,
          failed: 1
        }
      });
    });
  });
});