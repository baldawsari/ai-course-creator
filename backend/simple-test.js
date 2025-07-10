#!/usr/bin/env node

// Simple test runner to check error tests
const { exec } = require('child_process');

// Setup environment
process.env.NODE_ENV = 'test';

// Run specific test
const testCommand = `npx jest tests/unit/utils/errors.test.js --testEnvironment=node --setupFiles=tests/setup.js --no-coverage --verbose`;

console.log('Running error tests...');
console.log('Command:', testCommand);

exec(testCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error);
    console.error('Stderr:', stderr);
  }
  console.log('Stdout:', stdout);
  process.exit(error ? 1 : 0);
});