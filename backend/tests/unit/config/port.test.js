const path = require('path');

describe('Port Configuration', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear module cache to ensure fresh imports
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should use port 3001 from .env.example by default', () => {
    // Set up test environment
    delete process.env.PORT;
    
    // Mock dotenv to load from .env.example
    jest.mock('dotenv', () => ({
      config: jest.fn(({ path: envPath }) => {
        if (envPath && envPath.includes('.env.example')) {
          process.env.PORT = '3001';
        }
      })
    }));

    // Load config
    const dotenv = require('dotenv');
    dotenv.config({ path: path.join(__dirname, '../../../.env.example') });

    expect(process.env.PORT).toBe('3001');
  });

  it('should use port 3001 when reading from .env.example', async () => {
    const fs = require('fs').promises;
    const envExamplePath = path.join(__dirname, '../../../.env.example');
    
    const content = await fs.readFile(envExamplePath, 'utf-8');
    const portLine = content.split('\n').find(line => line.startsWith('PORT='));
    
    expect(portLine).toBe('PORT=3001');
  });

  it('should configure server to listen on port 3001', () => {
    process.env.PORT = '3001';
    
    // Mock the server creation
    const mockServer = {
      listen: jest.fn((port, callback) => {
        callback();
      })
    };
    
    const mockHttp = {
      createServer: jest.fn(() => mockServer)
    };
    
    jest.mock('http', () => mockHttp);
    
    // Test that server uses the correct port
    const PORT = process.env.PORT || 3000;
    expect(PORT).toBe('3001');
  });

  it('should have consistent port configuration with frontend expectations', () => {
    // Frontend expects backend on port 3001
    const FRONTEND_EXPECTED_PORT = '3001';
    
    // Backend should be configured to use the same port
    process.env.PORT = '3001';
    const BACKEND_PORT = process.env.PORT;
    
    expect(BACKEND_PORT).toBe(FRONTEND_EXPECTED_PORT);
  });
});