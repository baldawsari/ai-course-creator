const request = require('supertest');
const app = require('../../../src/app');
const { createAPIClient } = require('../../utils/apiClient');
const { mockData } = require('../../utils/mockData');
const { testHelpers } = require('../../utils/testHelpers');

describe('Authentication API Integration Tests', () => {
  let apiClient;
  let testUser;

  beforeAll(() => {
    apiClient = createAPIClient(app);
  });

  beforeEach(async () => {
    testUser = testHelpers.generateMockUser({
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!@#',
    });
  });

  afterEach(async () => {
    apiClient.reset();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await apiClient
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          full_name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await apiClient
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          full_name: 'Test User',
        });

      // Attempt duplicate registration
      const response = await apiClient
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: 'Different123!',
          full_name: 'Another User',
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should validate email format', async () => {
      const response = await apiClient
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: testUser.password,
          full_name: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should enforce password requirements', async () => {
      const weakPasswords = ['123456', 'password', 'test', 'Test123'];

      for (const password of weakPasswords) {
        const response = await apiClient
          .post('/api/auth/register')
          .send({
            email: `test-${Date.now()}@example.com`,
            password,
            full_name: 'Test User',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('password');
      }
    });

    it('should require all fields', async () => {
      const incompleteData = [
        { email: testUser.email, password: testUser.password }, // Missing full_name
        { email: testUser.email, full_name: 'Test User' }, // Missing password
        { password: testUser.password, full_name: 'Test User' }, // Missing email
      ];

      for (const data of incompleteData) {
        const response = await apiClient
          .post('/api/auth/register')
          .send(data);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register user for login tests
      await apiClient.register({
        email: testUser.email,
        password: testUser.password,
        full_name: 'Test User',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await apiClient
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject invalid password', async () => {
      const response = await apiClient
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const response = await apiClient
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle case-insensitive email', async () => {
      const response = await apiClient
        .post('/api/auth/login')
        .send({
          email: testUser.email.toUpperCase(),
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(testUser.email.toLowerCase());
    });

    it('should include token expiry information', async () => {
      const response = await apiClient
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.expiresIn).toBeGreaterThan(0);
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken;

    beforeEach(async () => {
      const { token } = await apiClient.register({
        email: testUser.email,
        password: testUser.password,
        full_name: 'Test User',
      });
      authToken = token;
    });

    it('should get user profile with valid token', async () => {
      const response = await apiClient
        .setAuthToken(authToken)
        .get('/api/auth/profile');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      const response = await apiClient
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No token provided');
    });

    it('should reject invalid token', async () => {
      const response = await apiClient
        .setAuthToken('invalid-token')
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid token');
    });

    it('should reject expired token', async () => {
      const expiredToken = apiClient.generateTestToken(
        { sub: 'test-user', email: testUser.email },
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await apiClient
        .setAuthToken(expiredToken)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('expired');
    });
  });

  describe('PATCH /api/auth/profile', () => {
    let authToken;

    beforeEach(async () => {
      const { token } = await apiClient.register({
        email: testUser.email,
        password: testUser.password,
        full_name: 'Test User',
      });
      authToken = token;
      apiClient.setAuthToken(authToken);
    });

    it('should update user profile', async () => {
      const updateData = {
        full_name: 'Updated Name',
        avatar_url: 'https://example.com/avatar.jpg',
      };

      const response = await apiClient
        .patch('/api/auth/profile')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.user.full_name).toBe(updateData.full_name);
      expect(response.body.user.avatar_url).toBe(updateData.avatar_url);
    });

    it('should not allow email update', async () => {
      const response = await apiClient
        .patch('/api/auth/profile')
        .send({
          email: 'newemail@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should validate update data', async () => {
      const response = await apiClient
        .patch('/api/auth/profile')
        .send({
          full_name: '', // Empty name
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;

    beforeEach(async () => {
      const { token } = await apiClient.register({
        email: testUser.email,
        password: testUser.password,
        full_name: 'Test User',
      });
      authToken = token;
    });

    it('should logout successfully', async () => {
      const response = await apiClient
        .setAuthToken(authToken)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('logged out');
    });

    it('should invalidate token after logout', async () => {
      // Logout
      await apiClient
        .setAuthToken(authToken)
        .post('/api/auth/logout');

      // Try to use the same token
      const response = await apiClient
        .setAuthToken(authToken)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh authentication token', async () => {
      const { token: oldToken } = await apiClient.register({
        email: testUser.email,
        password: testUser.password,
        full_name: 'Test User',
      });

      const response = await apiClient
        .setAuthToken(oldToken)
        .post('/api/auth/refresh');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).not.toBe(oldToken);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit authentication endpoints', async () => {
      const requests = [];
      
      // Make many requests quickly
      for (let i = 0; i < 25; i++) {
        requests.push(
          apiClient.post('/api/auth/login').send({
            email: 'test@example.com',
            password: 'wrong',
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0].body).toHaveProperty('error');
      expect(rateLimited[0].body.error).toContain('Too many requests');
    });
  });
});