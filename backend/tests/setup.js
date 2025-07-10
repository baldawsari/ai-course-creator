// Global test setup
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.test') });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.ENABLE_METRICS = 'false';

// Mock console methods to reduce noise during tests
if (process.env.SILENCE_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Global test utilities
global.testUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  generateId: () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  },
  
  mockDate: (date) => {
    const RealDate = Date;
    global.Date = class extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          return new RealDate(date);
        }
        return new RealDate(...args);
      }
      static now() {
        return new RealDate(date).getTime();
      }
    };
  },
  
  restoreDate: () => {
    global.Date = Date;
  },
};

// Mock external services by default
jest.mock('@supabase/supabase-js');
jest.mock('@anthropic-ai/sdk');
jest.mock('@qdrant/js-client-rest');
jest.mock('bull');