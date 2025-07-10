const request = require('supertest');
const app = require('../../src/app');
const { createAPIClient } = require('../utils/apiClient');
const { testHelpers } = require('../utils/testHelpers');
const { generateMockFile } = require('../utils/mockData');

describe('Load Testing', () => {
  let apiClient;
  let authToken;
  const { loadTest, thresholds } = global.performanceConfig;

  beforeAll(async () => {
    apiClient = createAPIClient(app);
    
    // Setup test user
    const testUser = testHelpers.generateMockUser();
    const { token } = await apiClient.register({
      email: testUser.email,
      password: 'Test123!@#',
      full_name: 'Load Test User',
    });
    authToken = token;
    apiClient.setAuthToken(authToken);
  });

  describe('File Upload Load Test', () => {
    it('should handle concurrent file uploads', async () => {
      const results = [];
      const startTime = Date.now();
      
      console.log(`Starting file upload load test: ${loadTest.concurrency} concurrent uploads for ${loadTest.duration}ms`);

      const workers = Array.from({ length: loadTest.concurrency }, async (_, i) => {
        const workerResults = [];
        const workerStartTime = Date.now() + (i * loadTest.rampUp / loadTest.concurrency);
        
        // Wait for ramp-up
        if (workerStartTime > Date.now()) {
          await testHelpers.delay(workerStartTime - Date.now());
        }

        while (Date.now() - startTime < loadTest.duration) {
          const mockFile = generateMockFile('pdf', {
            originalname: `load-test-${i}-${Date.now()}.pdf`,
          });

          const requestStart = Date.now();
          
          try {
            const response = await apiClient.uploadFile(
              mockFile.originalname,
              mockFile.buffer,
              { title: `Load Test Document ${i}` }
            );

            const duration = Date.now() - requestStart;
            workerResults.push({
              status: response.status,
              duration,
              success: response.status === 201,
              worker: i,
              timestamp: Date.now(),
            });

          } catch (error) {
            const duration = Date.now() - requestStart;
            workerResults.push({
              status: 0,
              duration,
              success: false,
              error: error.message,
              worker: i,
              timestamp: Date.now(),
            });
          }

          // Small delay between requests
          await testHelpers.delay(100);
        }

        return workerResults;
      });

      const workerResults = await Promise.all(workers);
      results.push(...workerResults.flat());

      // Analyze results
      const analysis = analyzeResults(results);
      console.log('File Upload Load Test Results:', analysis);

      // Assertions
      expect(analysis.errorRate).toBeLessThan(thresholds.errorRate);
      expect(analysis.responseTime.p95).toBeLessThan(thresholds.responseTime.p95);
      expect(analysis.responseTime.average).toBeLessThan(thresholds.responseTime.average);
      expect(analysis.totalRequests).toBeGreaterThan(loadTest.concurrency);
    });
  });

  describe('API Endpoint Load Test', () => {
    it('should handle concurrent API requests', async () => {
      const results = [];
      const startTime = Date.now();
      
      console.log(`Starting API load test: ${loadTest.concurrency} concurrent requests for ${loadTest.duration}ms`);

      const workers = Array.from({ length: loadTest.concurrency }, async (_, i) => {
        const workerResults = [];
        const workerStartTime = Date.now() + (i * loadTest.rampUp / loadTest.concurrency);
        
        // Wait for ramp-up
        if (workerStartTime > Date.now()) {
          await testHelpers.delay(workerStartTime - Date.now());
        }

        while (Date.now() - startTime < loadTest.duration) {
          const endpoints = [
            { method: 'get', path: '/api/documents' },
            { method: 'get', path: '/api/auth/profile' },
            { method: 'get', path: '/health' },
          ];

          for (const endpoint of endpoints) {
            const requestStart = Date.now();
            
            try {
              const response = await apiClient[endpoint.method](endpoint.path);
              
              const duration = Date.now() - requestStart;
              workerResults.push({
                endpoint: endpoint.path,
                status: response.status,
                duration,
                success: response.status < 400,
                worker: i,
                timestamp: Date.now(),
              });

            } catch (error) {
              const duration = Date.now() - requestStart;
              workerResults.push({
                endpoint: endpoint.path,
                status: 0,
                duration,
                success: false,
                error: error.message,
                worker: i,
                timestamp: Date.now(),
              });
            }
          }

          await testHelpers.delay(50);
        }

        return workerResults;
      });

      const workerResults = await Promise.all(workers);
      results.push(...workerResults.flat());

      // Analyze results
      const analysis = analyzeResults(results);
      console.log('API Load Test Results:', analysis);

      // Group by endpoint
      const endpointAnalysis = {};
      results.forEach(result => {
        if (!endpointAnalysis[result.endpoint]) {
          endpointAnalysis[result.endpoint] = [];
        }
        endpointAnalysis[result.endpoint].push(result);
      });

      Object.entries(endpointAnalysis).forEach(([endpoint, endpointResults]) => {
        const endpointStats = analyzeResults(endpointResults);
        console.log(`Endpoint ${endpoint}:`, endpointStats);
        
        expect(endpointStats.errorRate).toBeLessThan(thresholds.errorRate);
        expect(endpointStats.responseTime.p95).toBeLessThan(thresholds.responseTime.p95);
      });
    });
  });

  describe('Memory Usage Load Test', () => {
    it('should maintain reasonable memory usage under load', async () => {
      const memorySnapshots = [];
      
      // Baseline memory
      const baseline = process.memoryUsage();
      memorySnapshots.push({ ...baseline, timestamp: Date.now(), phase: 'baseline' });

      // Generate load
      const requests = Array.from({ length: 50 }, async (_, i) => {
        const mockFile = generateMockFile('pdf', {
          originalname: `memory-test-${i}.pdf`,
        });

        return apiClient.uploadFile(mockFile.originalname, mockFile.buffer);
      });

      // Monitor memory during load
      const memoryMonitor = setInterval(() => {
        const memory = process.memoryUsage();
        memorySnapshots.push({ ...memory, timestamp: Date.now(), phase: 'load' });
      }, 1000);

      await Promise.all(requests);
      
      clearInterval(memoryMonitor);

      // Final memory snapshot
      const final = process.memoryUsage();
      memorySnapshots.push({ ...final, timestamp: Date.now(), phase: 'final' });

      // Analyze memory usage
      const peakMemory = memorySnapshots.reduce((peak, snapshot) => ({
        heapUsed: Math.max(peak.heapUsed, snapshot.heapUsed),
        rss: Math.max(peak.rss, snapshot.rss),
        external: Math.max(peak.external, snapshot.external),
      }), { heapUsed: 0, rss: 0, external: 0 });

      console.log('Memory Usage Analysis:', {
        baseline: baseline,
        peak: peakMemory,
        final: final,
        growth: {
          heapUsed: final.heapUsed - baseline.heapUsed,
          rss: final.rss - baseline.rss,
        },
      });

      // Assertions
      expect(peakMemory.heapUsed).toBeLessThan(thresholds.memory.maxHeapUsed);
      expect(peakMemory.rss).toBeLessThan(thresholds.memory.maxRSS);
      
      // Memory shouldn't grow excessively
      const heapGrowth = final.heapUsed - baseline.heapUsed;
      expect(heapGrowth).toBeLessThan(100 * 1024 * 1024); // < 100MB growth
    });
  });

  describe('Database Load Test', () => {
    it('should handle concurrent database operations', async () => {
      const results = [];
      const startTime = Date.now();

      console.log(`Starting database load test: ${loadTest.concurrency} concurrent operations`);

      const workers = Array.from({ length: loadTest.concurrency }, async (_, i) => {
        const workerResults = [];
        
        while (Date.now() - startTime < loadTest.duration) {
          // Mix of read and write operations
          const operations = [
            async () => {
              const response = await apiClient.get('/api/documents');
              return { operation: 'read', success: response.status === 200 };
            },
            async () => {
              const mockFile = generateMockFile('pdf', {
                originalname: `db-load-${i}-${Date.now()}.pdf`,
              });
              const response = await apiClient.uploadFile(mockFile.originalname, mockFile.buffer);
              return { operation: 'write', success: response.status === 201 };
            },
          ];

          for (const operation of operations) {
            const requestStart = Date.now();
            
            try {
              const result = await operation();
              const duration = Date.now() - requestStart;
              
              workerResults.push({
                ...result,
                duration,
                worker: i,
                timestamp: Date.now(),
              });

            } catch (error) {
              const duration = Date.now() - requestStart;
              workerResults.push({
                operation: 'error',
                success: false,
                duration,
                error: error.message,
                worker: i,
                timestamp: Date.now(),
              });
            }
          }

          await testHelpers.delay(100);
        }

        return workerResults;
      });

      const workerResults = await Promise.all(workers);
      results.push(...workerResults.flat());

      // Analyze results
      const analysis = analyzeResults(results);
      console.log('Database Load Test Results:', analysis);

      // Group by operation type
      const operationTypes = ['read', 'write'];
      operationTypes.forEach(opType => {
        const opResults = results.filter(r => r.operation === opType);
        if (opResults.length > 0) {
          const opAnalysis = analyzeResults(opResults);
          console.log(`${opType} operations:`, opAnalysis);
          
          expect(opAnalysis.errorRate).toBeLessThan(thresholds.errorRate);
        }
      });
    });
  });
});

function analyzeResults(results) {
  if (results.length === 0) {
    return { totalRequests: 0, errorRate: 0, responseTime: {} };
  }

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  const durations = results.map(r => r.duration).sort((a, b) => a - b);
  
  return {
    totalRequests: results.length,
    successfulRequests: successful.length,
    failedRequests: failed.length,
    errorRate: failed.length / results.length,
    responseTime: {
      min: Math.min(...durations),
      max: Math.max(...durations),
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p50: percentile(durations, 50),
      p90: percentile(durations, 90),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
    },
    throughput: results.length / ((Math.max(...results.map(r => r.timestamp)) - Math.min(...results.map(r => r.timestamp))) / 1000),
  };
}

function percentile(values, p) {
  const index = Math.ceil((p / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(index, values.length - 1))];
}