const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class TestHelpers {
  constructor() {
    this.tempFiles = [];
    this.mockData = {};
  }

  // File system helpers
  async createTempFile(filename, content, dir = './test-uploads') {
    const filePath = path.join(dir, filename);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content);
    this.tempFiles.push(filePath);
    return filePath;
  }

  async cleanupTempFiles() {
    for (const file of this.tempFiles) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // File already deleted
      }
    }
    this.tempFiles = [];
  }

  // Mock data generators
  generateMockUser(overrides = {}) {
    return {
      id: crypto.randomUUID(),
      email: `test-${Date.now()}@example.com`,
      full_name: 'Test User',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  generateMockDocument(overrides = {}) {
    return {
      id: crypto.randomUUID(),
      title: 'Test Document',
      content: 'This is test content for the document.',
      file_path: '/test/path/document.pdf',
      file_type: 'pdf',
      file_size: 1024,
      user_id: crypto.randomUUID(),
      status: 'processed',
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  generateMockCourse(overrides = {}) {
    return {
      id: crypto.randomUUID(),
      title: 'Test Course',
      description: 'This is a test course description.',
      content: {
        modules: [
          {
            title: 'Module 1',
            description: 'First module',
            lessons: ['Lesson 1', 'Lesson 2'],
            objectives: ['Objective 1', 'Objective 2'],
          },
        ],
      },
      document_id: crypto.randomUUID(),
      user_id: crypto.randomUUID(),
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  generateMockVector(dimension = 768) {
    return Array.from({ length: dimension }, () => Math.random());
  }

  generateMockChunks(count = 5) {
    return Array.from({ length: count }, (_, i) => ({
      id: crypto.randomUUID(),
      content: `This is chunk ${i + 1} content.`,
      metadata: {
        page: i + 1,
        section: `Section ${i + 1}`,
      },
      vector: this.generateMockVector(),
    }));
  }

  // API request helpers
  createMockRequest(overrides = {}) {
    return {
      body: {},
      query: {},
      params: {},
      headers: {
        'content-type': 'application/json',
      },
      user: null,
      file: null,
      files: null,
      ...overrides,
    };
  }

  createMockResponse() {
    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.headers['content-type'] = 'application/json';
        this.body = data;
        return this;
      },
      send: function(data) {
        this.body = data;
        return this;
      },
      setHeader: function(name, value) {
        this.headers[name.toLowerCase()] = value;
        return this;
      },
      end: jest.fn(),
    };
    return res;
  }

  createMockNext() {
    return jest.fn();
  }

  // Database helpers
  async setupTestDatabase() {
    // Mock database setup
    return {
      cleanup: async () => {
        // Cleanup logic
      },
    };
  }

  // External service mocks
  createMockSupabaseClient() {
    return {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: this.generateMockUser() }, error: null }),
        signUp: jest.fn().mockResolvedValue({ data: { user: this.generateMockUser() }, error: null }),
        signIn: jest.fn().mockResolvedValue({ data: { session: { access_token: 'mock-token' } }, error: null }),
      },
    };
  }

  createMockClaudeClient() {
    return {
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ text: JSON.stringify({ title: 'Mock Course', modules: [] }) }],
        }),
      },
    };
  }

  createMockJinaClient() {
    return {
      post: jest.fn().mockResolvedValue({
        data: {
          data: [{ embedding: this.generateMockVector() }],
        },
      }),
    };
  }

  createMockQdrantClient() {
    return {
      createCollection: jest.fn().mockResolvedValue(true),
      getCollection: jest.fn().mockResolvedValue({ vectors_count: 0 }),
      upsert: jest.fn().mockResolvedValue({ operation_id: 1, status: 'completed' }),
      search: jest.fn().mockResolvedValue([
        { id: '1', score: 0.9, payload: { content: 'Mock content' } },
      ]),
      delete: jest.fn().mockResolvedValue({ operation_id: 2, status: 'completed' }),
    };
  }

  // Assertion helpers
  expectValidationError(error, field) {
    expect(error).toBeDefined();
    expect(error.message).toContain(field);
  }

  expectApiError(response, statusCode, message) {
    expect(response.statusCode).toBe(statusCode);
    expect(response.body).toHaveProperty('error');
    if (message) {
      expect(response.body.error).toContain(message);
    }
  }

  expectApiSuccess(response, data) {
    expect(response.statusCode).toBe(200);
    if (data) {
      expect(response.body).toMatchObject(data);
    }
  }

  // Performance testing helpers
  async measureExecutionTime(fn) {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6; // Convert to milliseconds
    return { result, duration };
  }

  async measureMemoryUsage(fn) {
    const before = process.memoryUsage();
    const result = await fn();
    const after = process.memoryUsage();
    
    return {
      result,
      memory: {
        heapUsed: after.heapUsed - before.heapUsed,
        external: after.external - before.external,
        rss: after.rss - before.rss,
      },
    };
  }

  // Cleanup
  async cleanup() {
    await this.cleanupTempFiles();
    this.mockData = {};
  }
}

// Singleton instance
const testHelpers = new TestHelpers();

module.exports = {
  testHelpers,
  ...testHelpers,
  cleanup: () => testHelpers.cleanup(),
};