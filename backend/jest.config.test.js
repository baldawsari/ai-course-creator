// Simple Jest configuration for testing
module.exports = {
  displayName: 'AI Course Creator Tests',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/*.test.js',
    '**/*.spec.js',
  ],
  collectCoverageFrom: [
    '../src/**/*.js',
    '!../src/**/*.test.js',
    '!../src/**/*.spec.js',
    '!../src/index.js',
    '!../src/config/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEnv.js'],
  testTimeout: 30000,
  maxWorkers: '50%',
  verbose: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^@config/(.*)$': '<rootDir>/../src/config/$1',
    '^@services/(.*)$': '<rootDir>/../src/services/$1',
    '^@utils/(.*)$': '<rootDir>/../src/utils/$1',
    '^@routes/(.*)$': '<rootDir>/../src/routes/$1',
  },
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  globals: {
    'NODE_ENV': 'test',
  },
};