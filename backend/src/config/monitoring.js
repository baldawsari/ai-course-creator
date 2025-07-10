const { getMonitoringConfig, IS_PRODUCTION, IS_DEVELOPMENT } = require('./index');

class MonitoringConfig {
  constructor() {
    this.config = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    this.config = getMonitoringConfig();
    this.validateConfig();
    this.initialized = true;
    
    console.log('Monitoring configuration initialized');
  }

  validateConfig() {
    if (!this.config || typeof this.config !== 'object') {
      throw new Error('Monitoring configuration is invalid');
    }

    this.validateLoggingConfig();
    this.validateMetricsConfig();
    this.validateErrorTrackingConfig();
    this.validatePerformanceConfig();
  }

  validateLoggingConfig() {
    const { logging } = this.config;
    
    if (!logging || typeof logging !== 'object') {
      throw new Error('Logging configuration is invalid');
    }

    const validLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLevels.includes(logging.level)) {
      throw new Error(`Logging level must be one of: ${validLevels.join(', ')}`);
    }

    const validFormats = ['json', 'combined', 'dev'];
    if (!validFormats.includes(logging.format)) {
      throw new Error(`Logging format must be one of: ${validFormats.join(', ')}`);
    }
  }

  validateMetricsConfig() {
    const { metrics } = this.config;
    
    if (!metrics || typeof metrics !== 'object') {
      throw new Error('Metrics configuration is invalid');
    }

    if (typeof metrics.enabled !== 'boolean') {
      throw new Error('Metrics enabled must be a boolean');
    }

    if (metrics.enabled && (!metrics.port || typeof metrics.port !== 'number' || metrics.port <= 0)) {
      throw new Error('Metrics port must be a positive number when metrics are enabled');
    }
  }

  validateErrorTrackingConfig() {
    const { errorTracking } = this.config;
    
    if (!errorTracking || typeof errorTracking !== 'object') {
      throw new Error('Error tracking configuration is invalid');
    }

    if (typeof errorTracking.enabled !== 'boolean') {
      throw new Error('Error tracking enabled must be a boolean');
    }
  }

  validatePerformanceConfig() {
    const { performance } = this.config;
    
    if (!performance || typeof performance !== 'object') {
      throw new Error('Performance configuration is invalid');
    }

    if (typeof performance.enableCompression !== 'boolean') {
      throw new Error('Performance enable compression must be a boolean');
    }
  }

  getLoggingConfig() {
    const { logging } = this.config;
    
    return {
      level: logging.level,
      format: logging.format,
      silent: false,
      handleExceptions: true,
      handleRejections: true,
      exitOnError: false,
      transports: {
        console: {
          enabled: true,
          level: logging.level,
          format: logging.format,
          colorize: IS_DEVELOPMENT,
          timestamp: true,
        },
        file: {
          enabled: IS_PRODUCTION,
          level: 'info',
          filename: `${logging.dir}/application.log`,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true,
          zippedArchive: true,
        },
        error: {
          enabled: true,
          level: 'error',
          filename: `${logging.dir}/error.log`,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true,
          zippedArchive: true,
        },
        http: {
          enabled: logging.enableMorgan,
          format: IS_PRODUCTION ? 'combined' : 'dev',
          filename: `${logging.dir}/access.log`,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        },
      },
      meta: {
        service: 'ai-course-creator',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        instance: process.env.INSTANCE_ID || 'local',
      },
    };
  }

  getMetricsConfig() {
    const { metrics } = this.config;
    
    if (!metrics.enabled) {
      return { enabled: false };
    }

    return {
      enabled: true,
      port: metrics.port,
      path: '/metrics',
      collectDefaultMetrics: true,
      defaultLabels: {
        service: 'ai-course-creator',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        instance: process.env.INSTANCE_ID || 'local',
      },
      customMetrics: {
        httpRequestDuration: {
          name: 'http_request_duration_seconds',
          help: 'Duration of HTTP requests in seconds',
          labelNames: ['method', 'route', 'status_code'],
          buckets: [0.1, 0.5, 1, 2, 5, 10],
        },
        httpRequestTotal: {
          name: 'http_requests_total',
          help: 'Total number of HTTP requests',
          labelNames: ['method', 'route', 'status_code'],
        },
        documentProcessingDuration: {
          name: 'document_processing_duration_seconds',
          help: 'Duration of document processing in seconds',
          labelNames: ['type', 'size_category'],
          buckets: [1, 5, 10, 30, 60, 300],
        },
        courseGenerationDuration: {
          name: 'course_generation_duration_seconds',
          help: 'Duration of course generation in seconds',
          labelNames: ['model', 'complexity'],
          buckets: [10, 30, 60, 120, 300, 600],
        },
        queueJobsTotal: {
          name: 'queue_jobs_total',
          help: 'Total number of queue jobs',
          labelNames: ['queue', 'status'],
        },
        vectorOperationDuration: {
          name: 'vector_operation_duration_seconds',
          help: 'Duration of vector operations in seconds',
          labelNames: ['operation', 'collection'],
          buckets: [0.1, 0.5, 1, 2, 5, 10],
        },
      },
    };
  }

  getErrorTrackingConfig() {
    const { errorTracking } = this.config;
    
    if (!errorTracking.enabled) {
      return { enabled: false };
    }

    return {
      enabled: true,
      captureUnhandledRejections: true,
      captureUncaughtExceptions: true,
      beforeSend: (event, hint) => {
        // Filter out sensitive information
        if (event.request) {
          delete event.request.headers;
          delete event.request.cookies;
        }
        
        if (event.extra) {
          delete event.extra.password;
          delete event.extra.token;
          delete event.extra.api_key;
        }
        
        return event;
      },
      tags: {
        service: 'ai-course-creator',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      integrations: {
        http: true,
        fs: true,
        console: true,
        modules: true,
        onUncaughtException: true,
        onUnhandledRejection: true,
      },
    };
  }

  getPerformanceConfig() {
    const { performance } = this.config;
    
    return {
      compression: {
        enabled: performance.enableCompression,
        threshold: 1024,
        level: 6,
        memLevel: 8,
        strategy: 'DEFAULT_STRATEGY',
      },
      responseTime: {
        enabled: true,
        digits: 3,
        header: 'X-Response-Time',
        suffix: true,
      },
      requestId: {
        enabled: true,
        header: 'X-Request-ID',
        generator: () => {
          return require('crypto').randomUUID();
        },
      },
      timeout: {
        server: 30000,
        request: 30000,
        keepAlive: 5000,
      },
      limits: {
        jsonPayload: '10mb',
        urlencoded: '10mb',
        raw: '10mb',
        text: '10mb',
      },
    };
  }

  getHealthCheckConfig() {
    return {
      enabled: true,
      path: '/health',
      checks: {
        database: {
          enabled: true,
          timeout: 5000,
          critical: true,
        },
        redis: {
          enabled: true,
          timeout: 3000,
          critical: false,
        },
        qdrant: {
          enabled: true,
          timeout: 5000,
          critical: true,
        },
        externalAPIs: {
          enabled: true,
          timeout: 10000,
          critical: false,
          apis: ['anthropic', 'jina'],
        },
        storage: {
          enabled: true,
          timeout: 2000,
          critical: false,
        },
      },
      response: {
        healthy: {
          status: 200,
          message: 'OK',
        },
        unhealthy: {
          status: 503,
          message: 'Service Unavailable',
        },
      },
    };
  }

  getAuditConfig() {
    return {
      enabled: IS_PRODUCTION,
      events: {
        auth: {
          login: true,
          logout: true,
          register: true,
          passwordChange: true,
        },
        documents: {
          upload: true,
          delete: true,
          process: true,
        },
        courses: {
          create: true,
          update: true,
          delete: true,
          export: true,
        },
        admin: {
          userActions: true,
          systemChanges: true,
        },
      },
      storage: {
        type: 'database',
        table: 'audit_logs',
        retention: 90, // days
      },
      fields: {
        required: ['timestamp', 'user_id', 'action', 'resource', 'ip_address'],
        optional: ['user_agent', 'metadata', 'result'],
      },
    };
  }

  getConfig() {
    return {
      initialized: this.initialized,
      logging: this.getLoggingConfig(),
      metrics: this.getMetricsConfig(),
      errorTracking: this.getErrorTrackingConfig(),
      performance: this.getPerformanceConfig(),
      healthCheck: this.getHealthCheckConfig(),
      audit: this.getAuditConfig(),
    };
  }
}

const monitoringConfig = new MonitoringConfig();

module.exports = {
  monitoringConfig,
  initialize: () => monitoringConfig.initialize(),
  getLoggingConfig: () => monitoringConfig.getLoggingConfig(),
  getMetricsConfig: () => monitoringConfig.getMetricsConfig(),
  getErrorTrackingConfig: () => monitoringConfig.getErrorTrackingConfig(),
  getPerformanceConfig: () => monitoringConfig.getPerformanceConfig(),
  getHealthCheckConfig: () => monitoringConfig.getHealthCheckConfig(),
  getAuditConfig: () => monitoringConfig.getAuditConfig(),
  getConfig: () => monitoringConfig.getConfig(),
};