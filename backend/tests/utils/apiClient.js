const request = require('supertest');
const jwt = require('jsonwebtoken');

class APIClient {
  constructor(app) {
    this.app = app;
    this.authToken = null;
    this.apiKey = null;
  }

  // Authentication helpers
  async login(email, password) {
    const response = await request(this.app)
      .post('/api/auth/login')
      .send({ email, password });

    if (response.status === 200 && response.body.token) {
      this.authToken = response.body.token;
      return response.body;
    }

    throw new Error(`Login failed: ${response.body.error || 'Unknown error'}`);
  }

  async register(userData) {
    const response = await request(this.app)
      .post('/api/auth/register')
      .send(userData);

    if (response.status === 201 && response.body.token) {
      this.authToken = response.body.token;
      return response.body;
    }

    throw new Error(`Registration failed: ${response.body.error || 'Unknown error'}`);
  }

  setAuthToken(token) {
    this.authToken = token;
    return this;
  }

  setApiKey(key) {
    this.apiKey = key;
    return this;
  }

  generateTestToken(payload = {}, options = {}) {
    const defaultPayload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(
      { ...defaultPayload, ...payload },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h', ...options }
    );
  }

  // Request builders
  get(path) {
    return this._buildRequest('get', path);
  }

  post(path) {
    return this._buildRequest('post', path);
  }

  put(path) {
    return this._buildRequest('put', path);
  }

  patch(path) {
    return this._buildRequest('patch', path);
  }

  delete(path) {
    return this._buildRequest('delete', path);
  }

  _buildRequest(method, path) {
    const req = request(this.app)[method](path);

    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }

    if (this.apiKey) {
      req.set('X-API-Key', this.apiKey);
    }

    // Add common headers
    req.set('Accept', 'application/json');

    return req;
  }

  // File upload helper
  async uploadFile(filePath, fileBuffer, metadata = {}) {
    const req = this.post('/api/upload')
      .attach('file', fileBuffer, filePath);

    Object.entries(metadata).forEach(([key, value]) => {
      req.field(key, value);
    });

    return req;
  }

  // Batch request helper
  async batchRequests(requests) {
    const results = await Promise.all(
      requests.map(async ({ method, path, data }) => {
        try {
          const response = await this[method](path).send(data);
          return { success: true, response };
        } catch (error) {
          return { success: false, error };
        }
      })
    );

    return results;
  }

  // Health check
  async checkHealth() {
    return this.get('/health');
  }

  // Common API endpoints
  async getProfile() {
    return this.get('/api/profile');
  }

  async updateProfile(data) {
    return this.patch('/api/profile').send(data);
  }

  async listDocuments(query = {}) {
    return this.get('/api/documents').query(query);
  }

  async getDocument(id) {
    return this.get(`/api/documents/${id}`);
  }

  async deleteDocument(id) {
    return this.delete(`/api/documents/${id}`);
  }

  async generateCourse(documentId, config = {}) {
    return this.post('/api/courses/generate').send({
      document_id: documentId,
      ...config,
    });
  }

  async getCourse(id) {
    return this.get(`/api/courses/${id}`);
  }

  async updateCourse(id, data) {
    return this.patch(`/api/courses/${id}`).send(data);
  }

  async deleteCourse(id) {
    return this.delete(`/api/courses/${id}`);
  }

  async exportCourse(id, format = 'html') {
    return this.get(`/api/export/${id}`).query({ format });
  }

  // WebSocket helper for real-time updates
  connectWebSocket(path = '/ws') {
    // This would be implemented with a WebSocket client library
    // Placeholder for WebSocket functionality
    return {
      on: (event, handler) => {},
      emit: (event, data) => {},
      close: () => {},
    };
  }

  // Response assertion helpers
  expectSuccess(response, statusCode = 200) {
    expect(response.status).toBe(statusCode);
    expect(response.body).toBeDefined();
    return response.body;
  }

  expectError(response, statusCode, errorMessage) {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('error');
    if (errorMessage) {
      expect(response.body.error).toContain(errorMessage);
    }
    return response.body;
  }

  expectPaginated(response, expectedFields = ['data', 'total', 'page', 'limit']) {
    expect(response.status).toBe(200);
    expectedFields.forEach(field => {
      expect(response.body).toHaveProperty(field);
    });
    expect(Array.isArray(response.body.data)).toBe(true);
    return response.body;
  }

  // Cleanup
  reset() {
    this.authToken = null;
    this.apiKey = null;
  }
}

// Factory function
function createAPIClient(app) {
  return new APIClient(app);
}

module.exports = {
  APIClient,
  createAPIClient,
};