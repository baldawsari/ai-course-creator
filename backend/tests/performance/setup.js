// Performance test specific setup
process.env.TEST_TYPE = 'performance';
process.env.NODE_ENV = 'test';

// Increase timeouts for performance tests
jest.setTimeout(300000); // 5 minutes

// Performance test configuration
const performanceConfig = {
  loadTest: {
    duration: 30000, // 30 seconds
    concurrency: 10,
    rampUp: 5000, // 5 seconds
  },
  stressTest: {
    duration: 60000, // 1 minute
    concurrency: 50,
    rampUp: 10000, // 10 seconds
  },
  thresholds: {
    responseTime: {
      p95: 2000, // 95th percentile < 2s
      p99: 5000, // 99th percentile < 5s
      average: 1000, // Average < 1s
    },
    memory: {
      maxHeapUsed: 500 * 1024 * 1024, // 500MB
      maxRSS: 1024 * 1024 * 1024, // 1GB
    },
    errorRate: 0.01, // < 1% error rate
  },
};

global.performanceConfig = performanceConfig;

console.log('Performance test setup completed with config:', performanceConfig);