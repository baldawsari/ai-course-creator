const cluster = require('cluster');
const logger = require('./logger');

/**
 * Performance utilities for execution time measurement, memory tracking, rate limiting, and caching
 */

/**
 * Timer class for measuring execution time
 */
class Timer {
  constructor(name = 'Timer') {
    this.name = name;
    this.startTime = null;
    this.endTime = null;
    this.splits = [];
  }

  /**
   * Start the timer
   * @returns {Timer} Timer instance for chaining
   */
  start() {
    this.startTime = process.hrtime.bigint();
    this.endTime = null;
    this.splits = [];
    return this;
  }

  /**
   * Add a split time
   * @param {string} label - Split label
   * @returns {Timer} Timer instance for chaining
   */
  split(label = 'Split') {
    if (!this.startTime) {
      throw new Error('Timer not started');
    }

    const currentTime = process.hrtime.bigint();
    const elapsed = Number(currentTime - this.startTime) / 1000000; // Convert to milliseconds

    this.splits.push({
      label,
      elapsed,
      timestamp: new Date()
    });

    return this;
  }

  /**
   * Stop the timer
   * @returns {number} Elapsed time in milliseconds
   */
  stop() {
    if (!this.startTime) {
      throw new Error('Timer not started');
    }

    this.endTime = process.hrtime.bigint();
    const elapsed = Number(this.endTime - this.startTime) / 1000000;

    logger.info(`Timer ${this.name} completed in ${elapsed.toFixed(2)}ms`, {
      timer: this.name,
      elapsed,
      splits: this.splits
    });

    return elapsed;
  }

  /**
   * Get current elapsed time without stopping
   * @returns {number} Current elapsed time in milliseconds
   */
  getElapsed() {
    if (!this.startTime) {
      return 0;
    }

    const currentTime = this.endTime || process.hrtime.bigint();
    return Number(currentTime - this.startTime) / 1000000;
  }
}

/**
 * Measure execution time of a function
 * @param {Function} fn - Function to measure
 * @param {string} name - Timer name
 * @returns {Promise<Object>} Result with timing information
 */
async function measureTime(fn, name = 'Function') {
  const timer = new Timer(name).start();
  
  try {
    const result = await fn();
    const elapsed = timer.stop();
    
    return {
      result,
      elapsed,
      success: true
    };
  } catch (error) {
    const elapsed = timer.getElapsed();
    logger.error(`Function ${name} failed after ${elapsed.toFixed(2)}ms:`, error);
    
    return {
      error,
      elapsed,
      success: false
    };
  }
}

/**
 * Memory tracking utility
 */
class MemoryTracker {
  constructor(options = {}) {
    this.name = options.name || 'MemoryTracker';
    this.interval = options.interval || 1000; // 1 second
    this.maxSamples = options.maxSamples || 100;
    this.samples = [];
    this.intervalId = null;
    this.isTracking = false;
  }

  /**
   * Start memory tracking
   * @returns {MemoryTracker} Tracker instance for chaining
   */
  start() {
    if (this.isTracking) {
      return this;
    }

    this.isTracking = true;
    this.samples = [];
    
    this.intervalId = setInterval(() => {
      this.takeSample();
    }, this.interval);

    logger.info(`Memory tracking started for ${this.name}`);
    return this;
  }

  /**
   * Take a memory sample
   */
  takeSample() {
    const memUsage = process.memoryUsage();
    const sample = {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers || 0
    };

    this.samples.push(sample);

    // Remove old samples if we exceed max
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  /**
   * Stop memory tracking
   * @returns {Object} Memory statistics
   */
  stop() {
    if (!this.isTracking) {
      return this.getStats();
    }

    this.isTracking = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const stats = this.getStats();
    logger.info(`Memory tracking stopped for ${this.name}`, stats);
    
    return stats;
  }

  /**
   * Get memory statistics
   * @returns {Object} Memory statistics
   */
  getStats() {
    if (this.samples.length === 0) {
      return { samples: 0 };
    }

    const heapUsedValues = this.samples.map(s => s.heapUsed);
    const rssValues = this.samples.map(s => s.rss);

    return {
      samples: this.samples.length,
      duration: this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp,
      heapUsed: {
        min: Math.min(...heapUsedValues),
        max: Math.max(...heapUsedValues),
        avg: heapUsedValues.reduce((a, b) => a + b, 0) / heapUsedValues.length,
        current: heapUsedValues[heapUsedValues.length - 1]
      },
      rss: {
        min: Math.min(...rssValues),
        max: Math.max(...rssValues),
        avg: rssValues.reduce((a, b) => a + b, 0) / rssValues.length,
        current: rssValues[rssValues.length - 1]
      },
      formatted: {
        heapUsedMax: this.formatBytes(Math.max(...heapUsedValues)),
        rssMax: this.formatBytes(Math.max(...rssValues))
      }
    };
  }

  /**
   * Format bytes for human readability
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

/**
 * Rate limiter using token bucket algorithm
 */
class RateLimiter {
  constructor(options = {}) {
    this.maxTokens = options.maxTokens || 100;
    this.refillRate = options.refillRate || 10; // tokens per second
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.requests = new Map(); // Track requests per identifier
  }

  /**
   * Check if request is allowed
   * @param {string} identifier - Request identifier (IP, user ID, etc.)
   * @param {number} cost - Token cost for this request
   * @returns {Object} Rate limit result
   */
  checkLimit(identifier, cost = 1) {
    this.refillTokens();

    const requestData = this.requests.get(identifier) || { tokens: this.maxTokens, lastRequest: Date.now() };
    
    // Refill tokens for this identifier
    const now = Date.now();
    const timePassed = (now - requestData.lastRequest) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    requestData.tokens = Math.min(this.maxTokens, requestData.tokens + tokensToAdd);
    requestData.lastRequest = now;

    // Check if request is allowed
    if (requestData.tokens >= cost) {
      requestData.tokens -= cost;
      this.requests.set(identifier, requestData);
      
      return {
        allowed: true,
        tokensRemaining: Math.floor(requestData.tokens),
        retryAfter: null
      };
    } else {
      // Calculate retry after time
      const tokensNeeded = cost - requestData.tokens;
      const retryAfter = Math.ceil(tokensNeeded / this.refillRate);
      
      return {
        allowed: false,
        tokensRemaining: Math.floor(requestData.tokens),
        retryAfter
      };
    }
  }

  /**
   * Refill global token bucket
   */
  refillTokens() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Reset rate limit for identifier
   * @param {string} identifier - Identifier to reset
   */
  reset(identifier) {
    this.requests.delete(identifier);
  }

  /**
   * Get current stats
   * @returns {Object} Rate limiter statistics
   */
  getStats() {
    return {
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
      globalTokens: Math.floor(this.tokens),
      activeIdentifiers: this.requests.size
    };
  }
}

/**
 * Simple in-memory cache with TTL support
 */
class Cache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute
    this.data = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };

    // Start cleanup interval
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const item = this.data.get(key);
    
    if (!item) {
      this.stats.misses++;
      return undefined;
    }

    if (item.expires && Date.now() > item.expires) {
      this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    return item.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Cache} Cache instance for chaining
   */
  set(key, value, ttl = this.defaultTTL) {
    // Check if we need to evict items
    if (this.data.size >= this.maxSize && !this.data.has(key)) {
      this.evictLRU();
    }

    const expires = ttl > 0 ? Date.now() + ttl : null;
    
    this.data.set(key, {
      value,
      expires,
      accessed: Date.now()
    });

    // Set expiration timer
    if (expires) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttl);
      
      this.timers.set(key, timer);
    }

    this.stats.sets++;
    return this;
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    const deleted = this.data.delete(key);
    
    if (deleted) {
      const timer = this.timers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
      this.stats.deletes++;
    }

    return deleted;
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {boolean} True if exists and not expired
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.data.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  /**
   * Evict least recently used item
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.data.entries()) {
      if (item.accessed < oldestTime) {
        oldestTime = item.accessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, item] of this.data.entries()) {
      if (item.expires && now > item.expires) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.data.size,
      maxSize: this.maxSize
    };
  }

  /**
   * Destroy cache and cleanup
   */
  destroy() {
    this.clear();
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

/**
 * System performance monitor
 */
class PerformanceMonitor {
  constructor(options = {}) {
    this.monitorInterval = options.monitorInterval || 5000; // 5 seconds
    this.memoryThreshold = options.memoryThreshold || 500 * 1024 * 1024; // 500MB
    this.callbacks = {
      memoryWarning: options.onMemoryWarning || (() => {}),
      performance: options.onPerformance || (() => {})
    };
    this.isMonitoring = false;
    this.intervalId = null;
  }

  /**
   * Start performance monitoring
   */
  start() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    this.intervalId = setInterval(() => {
      this.checkPerformance();
    }, this.monitorInterval);

    logger.info('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Performance monitoring stopped');
  }

  /**
   * Check current performance metrics
   */
  checkPerformance() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics = {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        usage: (memUsage.heapUsed / memUsage.heapTotal * 100).toFixed(2)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      timestamp: Date.now()
    };

    // Check memory threshold
    if (memUsage.heapUsed > this.memoryThreshold) {
      this.callbacks.memoryWarning(metrics);
      logger.warn('Memory usage exceeds threshold', {
        heapUsed: memUsage.heapUsed,
        threshold: this.memoryThreshold,
        usage: metrics.memory.usage + '%'
      });
    }

    this.callbacks.performance(metrics);
  }

  /**
   * Get current system metrics
   * @returns {Object} Current system metrics
   */
  getMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        usage: (memUsage.heapUsed / memUsage.heapTotal * 100).toFixed(2) + '%'
      },
      uptime: process.uptime(),
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version
    };
  }
}

/**
 * Create a debounced function that measures execution time
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Function} Debounced function
 */
function createDebouncedProfiler(fn, delay = 300) {
  let timeoutId;
  let executionCount = 0;

  return function debouncedProfiler(...args) {
    clearTimeout(timeoutId);
    
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        executionCount++;
        const timer = new Timer(`DebouncedFunction_${executionCount}`).start();
        
        try {
          const result = await fn.apply(this, args);
          timer.stop();
          resolve(result);
        } catch (error) {
          timer.stop();
          reject(error);
        }
      }, delay);
    });
  };
}

module.exports = {
  Timer,
  MemoryTracker,
  RateLimiter,
  Cache,
  PerformanceMonitor,
  measureTime,
  createDebouncedProfiler
};