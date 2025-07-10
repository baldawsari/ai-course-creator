const logger = require('./logger');

/**
 * Async utilities for promise handling, retry logic, timeout handling, and parallel processing
 */

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after timeout
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute function with timeout
 * @param {Function} fn - Async function to execute
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} errorMessage - Error message on timeout
 * @returns {Promise} Promise that resolves with function result or rejects on timeout
 */
async function withTimeout(fn, timeout, errorMessage = 'Operation timed out') {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeout);
  });

  return Promise.race([fn(), timeoutPromise]);
}

/**
 * Retry configuration options
 * @typedef {Object} RetryOptions
 * @property {number} maxAttempts - Maximum number of retry attempts
 * @property {number} initialDelay - Initial delay in milliseconds
 * @property {number} maxDelay - Maximum delay in milliseconds
 * @property {number} factor - Exponential backoff factor
 * @property {boolean} jitter - Add random jitter to delays
 * @property {Function} shouldRetry - Function to determine if should retry
 * @property {Function} onRetry - Callback on each retry attempt
 */

/**
 * Calculate exponential backoff delay with optional jitter
 * @param {number} attempt - Current attempt number
 * @param {Object} options - Retry options
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt, options) {
  const { initialDelay = 1000, maxDelay = 30000, factor = 2, jitter = true } = options;
  
  let delay = Math.min(initialDelay * Math.pow(factor, attempt - 1), maxDelay);
  
  if (jitter) {
    // Add random jitter (±25% of delay)
    const jitterAmount = delay * 0.25;
    delay += (Math.random() - 0.5) * 2 * jitterAmount;
  }
  
  return Math.max(0, delay);
}

/**
 * Retry async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {RetryOptions} options - Retry configuration
 * @returns {Promise} Promise that resolves with function result
 */
async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    shouldRetry = () => true,
    onRetry = () => {}
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn(attempt);
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if should retry
      if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }
      
      // Calculate delay
      const delay = calculateBackoffDelay(attempt, options);
      
      // Call retry callback
      onRetry(error, attempt, delay);
      
      // Log retry attempt
      logger.info(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
        error: error.message,
        attempt,
        delay
      });
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Execute functions in parallel with concurrency limit
 * @param {Array<Function>} tasks - Array of async functions
 * @param {number} concurrency - Maximum concurrent executions
 * @returns {Promise<Array>} Array of results
 */
async function parallel(tasks, concurrency = 5) {
  if (!Array.isArray(tasks)) {
    throw new Error('Tasks must be an array');
  }
  
  if (tasks.length === 0) {
    return [];
  }
  
  const results = new Array(tasks.length);
  const executing = [];
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const promise = task().then(result => {
      results[i] = { success: true, result };
    }).catch(error => {
      results[i] = { success: false, error };
    });
    
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p.resolved), 1);
    }
  }
  
  await Promise.all(executing);
  return results;
}

/**
 * Execute functions in sequence
 * @param {Array<Function>} tasks - Array of async functions
 * @returns {Promise<Array>} Array of results
 */
async function sequence(tasks) {
  if (!Array.isArray(tasks)) {
    throw new Error('Tasks must be an array');
  }
  
  const results = [];
  
  for (const task of tasks) {
    try {
      const result = await task();
      results.push({ success: true, result });
    } catch (error) {
      results.push({ success: false, error });
    }
  }
  
  return results;
}

/**
 * Execute array of items with async processor function, with concurrency control
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} Array of results
 */
async function processInBatches(items, processor, options = {}) {
  const {
    batchSize = 10,
    concurrency = 5,
    onProgress = () => {},
    stopOnError = false
  } = options;
  
  const results = [];
  const errors = [];
  let processed = 0;
  
  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, items.length));
    
    // Create tasks for current batch
    const tasks = batch.map((item, index) => async () => {
      try {
        const result = await processor(item, i + index);
        processed++;
        onProgress(processed, items.length);
        return result;
      } catch (error) {
        errors.push({ item, index: i + index, error });
        if (stopOnError) {
          throw error;
        }
        return null;
      }
    });
    
    // Process batch with concurrency limit
    const batchResults = await parallel(tasks, concurrency);
    results.push(...batchResults);
  }
  
  return {
    results: results.filter(r => r.success).map(r => r.result),
    errors,
    processed,
    total: items.length
  };
}

/**
 * Debounce function execution
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay = 300) {
  let timeoutId;
  
  return function debounced(...args) {
    clearTimeout(timeoutId);
    
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn.apply(this, args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}

/**
 * Throttle function execution
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Minimum time between executions in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(fn, limit = 300) {
  let inThrottle;
  let lastResult;
  
  return async function throttled(...args) {
    if (!inThrottle) {
      inThrottle = true;
      
      try {
        lastResult = await fn.apply(this, args);
      } finally {
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    }
    
    return lastResult;
  };
}

/**
 * Create a promise that can be resolved/rejected externally
 * @returns {Object} Object with promise and resolve/reject functions
 */
function createDeferred() {
  let resolve, reject;
  
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  
  return { promise, resolve, reject };
}

/**
 * Queue for sequential async operations
 */
class AsyncQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 1;
    this.queue = [];
    this.running = 0;
    this.paused = false;
  }
  
  /**
   * Add task to queue
   * @param {Function} task - Async function to execute
   * @returns {Promise} Promise that resolves when task completes
   */
  async add(task) {
    const deferred = createDeferred();
    
    this.queue.push({
      task,
      deferred
    });
    
    this.process();
    
    return deferred.promise;
  }
  
  /**
   * Process queue
   */
  async process() {
    if (this.paused || this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }
    
    this.running++;
    
    const { task, deferred } = this.queue.shift();
    
    try {
      const result = await task();
      deferred.resolve(result);
    } catch (error) {
      deferred.reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }
  
  /**
   * Pause queue processing
   */
  pause() {
    this.paused = true;
  }
  
  /**
   * Resume queue processing
   */
  resume() {
    this.paused = false;
    this.process();
  }
  
  /**
   * Clear queue
   */
  clear() {
    this.queue.forEach(({ deferred }) => {
      deferred.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
  
  /**
   * Get queue size
   * @returns {number} Number of items in queue
   */
  size() {
    return this.queue.length;
  }
  
  /**
   * Check if queue is empty
   * @returns {boolean} True if queue is empty
   */
  isEmpty() {
    return this.queue.length === 0 && this.running === 0;
  }
}

/**
 * Circuit breaker for handling failing operations
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.nextAttemptTime = null;
  }
  
  /**
   * Execute function with circuit breaker protection
   * @param {Function} fn - Function to execute
   * @returns {Promise} Function result
   */
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  /**
   * Handle successful execution
   */
  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failures = 0;
      this.successCount = 0;
      logger.info('Circuit breaker transitioned to CLOSED');
    }
    
    if (this.state === 'CLOSED') {
      this.successCount++;
    }
  }
  
  /**
   * Handle failed execution
   */
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      logger.warn('Circuit breaker transitioned to OPEN');
    } else if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      logger.warn('Circuit breaker transitioned to OPEN due to failure threshold');
    }
  }
  
  /**
   * Get circuit breaker state
   * @returns {Object} Current state information
   */
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }
  
  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }
}

module.exports = {
  sleep,
  withTimeout,
  retry,
  parallel,
  sequence,
  processInBatches,
  debounce,
  throttle,
  createDeferred,
  AsyncQueue,
  CircuitBreaker,
  calculateBackoffDelay
};