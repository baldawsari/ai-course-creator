// Create a shared mock queue instance
const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'queue-job-123' }),
  process: jest.fn(),
  on: jest.fn(),
  getJob: jest.fn()
};

// Bull constructor mock
const Bull = jest.fn().mockImplementation((queueName, options) => {
  // Return the same mock queue instance for all queue names
  return mockQueue;
});

// Expose mockQueue for test access
Bull.mockQueue = mockQueue;

module.exports = Bull;