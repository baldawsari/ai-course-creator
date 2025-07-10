const request = require('supertest');
const app = require('../../../src/app');
const { createAPIClient } = require('../../utils/apiClient');
const { mockData, generateMockFile } = require('../../utils/mockData');
const { testHelpers } = require('../../utils/testHelpers');
const fs = require('fs').promises;
const path = require('path');

describe('File Upload API Integration Tests', () => {
  let apiClient;
  let authToken;
  let testUser;

  beforeAll(async () => {
    apiClient = createAPIClient(app);
    
    // Create test user and get auth token
    testUser = testHelpers.generateMockUser();
    const { token } = await apiClient.register({
      email: testUser.email,
      password: 'Test123!@#',
      full_name: testUser.full_name,
    });
    authToken = token;
  });

  beforeEach(() => {
    apiClient.setAuthToken(authToken);
  });

  afterEach(async () => {
    await testHelpers.cleanupTempFiles();
  });

  describe('POST /api/upload', () => {
    it('should upload PDF file successfully', async () => {
      const mockFile = generateMockFile('pdf');
      
      const response = await apiClient
        .uploadFile(mockFile.originalname, mockFile.buffer, {
          title: 'Test PDF Document',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('document');
      expect(response.body.document).toHaveProperty('id');
      expect(response.body.document.title).toBe('Test PDF Document');
      expect(response.body.document.file_type).toBe('pdf');
      expect(response.body.document.status).toBe('processing');
    });

    it('should upload DOCX file successfully', async () => {
      const mockFile = generateMockFile('docx');
      
      const response = await apiClient
        .uploadFile(mockFile.originalname, mockFile.buffer, {
          title: 'Test DOCX Document',
        });

      expect(response.status).toBe(201);
      expect(response.body.document.file_type).toBe('docx');
    });

    it('should reject invalid file types', async () => {
      const mockFile = generateMockFile('invalid');
      
      const response = await apiClient
        .uploadFile(mockFile.originalname, mockFile.buffer);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('file type');
    });

    it('should reject oversized files', async () => {
      const mockFile = generateMockFile('oversized');
      
      const response = await apiClient
        .uploadFile(mockFile.originalname, mockFile.buffer);

      expect(response.status).toBe(413);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('File too large');
    });

    it('should require authentication', async () => {
      const mockFile = generateMockFile('pdf');
      
      const response = await request(app)
        .post('/api/upload')
        .attach('file', mockFile.buffer, mockFile.originalname);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing file', async () => {
      const response = await apiClient
        .post('/api/upload')
        .field('title', 'Test Document');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No file');
    });

    it('should validate metadata', async () => {
      const mockFile = generateMockFile('pdf');
      
      const response = await apiClient
        .uploadFile(mockFile.originalname, mockFile.buffer, {
          title: '', // Empty title
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('title');
    });

    it('should sanitize file names', async () => {
      const mockFile = generateMockFile('pdf', {
        originalname: '../../../etc/passwd.pdf',
      });
      
      const response = await apiClient
        .uploadFile(mockFile.originalname, mockFile.buffer);

      expect(response.status).toBe(201);
      expect(response.body.document.title).not.toContain('..');
      expect(response.body.document.title).not.toContain('/');
    });

    it('should handle concurrent uploads', async () => {
      const files = [
        generateMockFile('pdf', { originalname: 'file1.pdf' }),
        generateMockFile('pdf', { originalname: 'file2.pdf' }),
        generateMockFile('docx', { originalname: 'file3.docx' }),
      ];

      const responses = await Promise.all(
        files.map(file => 
          apiClient.uploadFile(file.originalname, file.buffer)
        )
      );

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('document');
      });
    });

    it('should track upload progress', async () => {
      const mockFile = generateMockFile('pdf');
      
      const response = await apiClient
        .uploadFile(mockFile.originalname, mockFile.buffer);

      expect(response.body).toHaveProperty('jobId');
      
      // Check job status
      const statusResponse = await apiClient
        .get(`/api/jobs/${response.body.jobId}`);
      
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body).toHaveProperty('status');
      expect(['processing', 'completed', 'failed']).toContain(statusResponse.body.status);
    });
  });

  describe('POST /api/upload/url', () => {
    it('should process URL content', async () => {
      const response = await apiClient
        .post('/api/upload/url')
        .send({
          url: 'https://example.com/article',
          title: 'Web Article',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('document');
      expect(response.body.document.source_type).toBe('url');
    });

    it('should validate URL format', async () => {
      const response = await apiClient
        .post('/api/upload/url')
        .send({
          url: 'not-a-valid-url',
          title: 'Invalid URL',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid URL');
    });

    it('should reject dangerous URLs', async () => {
      const dangerousUrls = [
        'file:///etc/passwd',
        'javascript:alert(1)',
        'ftp://internal-server',
      ];

      for (const url of dangerousUrls) {
        const response = await apiClient
          .post('/api/upload/url')
          .send({ url, title: 'Test' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('URL');
      }
    });

    it('should handle URL fetch errors', async () => {
      const response = await apiClient
        .post('/api/upload/url')
        .send({
          url: 'https://non-existent-domain-123456.com',
          title: 'Non-existent',
        });

      expect(response.status).toBe(502);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to fetch');
    });
  });

  describe('GET /api/documents', () => {
    beforeEach(async () => {
      // Upload some test documents
      const files = [
        generateMockFile('pdf', { originalname: 'doc1.pdf' }),
        generateMockFile('pdf', { originalname: 'doc2.pdf' }),
        generateMockFile('docx', { originalname: 'doc3.docx' }),
      ];

      await Promise.all(
        files.map(file => 
          apiClient.uploadFile(file.originalname, file.buffer)
        )
      );
    });

    it('should list user documents', async () => {
      const response = await apiClient.get('/api/documents');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('documents');
      expect(Array.isArray(response.body.documents)).toBe(true);
      expect(response.body.documents.length).toBeGreaterThanOrEqual(3);
    });

    it('should support pagination', async () => {
      const response = await apiClient
        .get('/api/documents')
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('documents');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 2);
      expect(response.body.documents.length).toBeLessThanOrEqual(2);
    });

    it('should filter by status', async () => {
      const response = await apiClient
        .get('/api/documents')
        .query({ status: 'processing' });

      expect(response.status).toBe(200);
      response.body.documents.forEach(doc => {
        expect(doc.status).toBe('processing');
      });
    });

    it('should search documents', async () => {
      const response = await apiClient
        .get('/api/documents')
        .query({ search: 'doc1' });

      expect(response.status).toBe(200);
      expect(response.body.documents.length).toBeGreaterThan(0);
      expect(response.body.documents[0].title).toContain('doc1');
    });

    it('should sort documents', async () => {
      const response = await apiClient
        .get('/api/documents')
        .query({ sort: 'created_at', order: 'desc' });

      expect(response.status).toBe(200);
      
      // Check if properly sorted
      const dates = response.body.documents.map(d => new Date(d.created_at));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1].getTime()).toBeGreaterThanOrEqual(dates[i].getTime());
      }
    });
  });

  describe('DELETE /api/documents/:id', () => {
    let documentId;

    beforeEach(async () => {
      const mockFile = generateMockFile('pdf');
      const response = await apiClient
        .uploadFile(mockFile.originalname, mockFile.buffer);
      documentId = response.body.document.id;
    });

    it('should delete document', async () => {
      const response = await apiClient
        .delete(`/api/documents/${documentId}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await apiClient
        .get(`/api/documents/${documentId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should not delete other users documents', async () => {
      // Create another user
      const otherUser = await apiClient.register({
        email: 'other@example.com',
        password: 'Test123!@#',
        full_name: 'Other User',
      });

      // Try to delete with other user's token
      const response = await apiClient
        .setAuthToken(otherUser.token)
        .delete(`/api/documents/${documentId}`);

      expect(response.status).toBe(404);
    });

    it('should handle non-existent document', async () => {
      const response = await apiClient
        .delete('/api/documents/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should cleanup associated data', async () => {
      // Generate a course from the document first
      await apiClient
        .post('/api/courses/generate')
        .send({ document_id: documentId });

      // Delete the document
      const response = await apiClient
        .delete(`/api/documents/${documentId}`);

      expect(response.status).toBe(204);

      // Check that associated courses are also deleted
      const coursesResponse = await apiClient
        .get('/api/courses')
        .query({ document_id: documentId });

      expect(coursesResponse.body.courses).toHaveLength(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit file uploads', async () => {
      const mockFile = generateMockFile('pdf');
      const requests = [];

      // Try to upload many files quickly
      for (let i = 0; i < 15; i++) {
        requests.push(
          apiClient.uploadFile(
            `file${i}.pdf`,
            mockFile.buffer
          )
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0].body.error).toContain('Too many');
    });
  });
});