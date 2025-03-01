import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';

// Mock the storage implementation for testing
jest.mock('../../server/storage', () => ({
  storage: {
    getAllDocumentationFiles: jest.fn().mockResolvedValue([
      { id: 1, path: '/test/file1.md', content: '# Test File 1', lastUpdated: new Date().toISOString() },
      { id: 2, path: '/test/file2.md', content: '# Test File 2', lastUpdated: new Date().toISOString() }
    ]),
    getRepositoryConfig: jest.fn().mockResolvedValue({
      id: 1, 
      url: 'https://github.com/test/repo',
      branch: 'main',
      lastSynced: new Date().toISOString(),
      isActive: true
    })
  }
}));

describe('API Routes', () => {
  let app: express.Express;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterAll((done) => {
    if (server && server.close) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('Health Endpoint', () => {
    it('responds with status 200', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('Documentation Endpoints', () => {
    it('retrieves all documentation files', async () => {
      const response = await request(app).get('/api/admin/documentation');
      expect(response.status).toBe(200);
      expect(response.body.files).toHaveLength(2);
      expect(response.body.files[0]).toHaveProperty('path', '/test/file1.md');
    });
  });

  describe('Repository Endpoints', () => {
    it('retrieves repository configuration', async () => {
      const response = await request(app).get('/api/admin/repository');
      expect(response.status).toBe(200);
      expect(response.body.config).toHaveProperty('url', 'https://github.com/test/repo');
    });
  });
});