// Unit test specific setup
process.env.TEST_TYPE = 'unit';

// Mock all external dependencies for unit tests
jest.mock('@supabase/supabase-js');
jest.mock('@anthropic-ai/sdk');
jest.mock('@qdrant/js-client-rest');
jest.mock('bull');
jest.mock('axios');

console.log('Unit test setup completed');