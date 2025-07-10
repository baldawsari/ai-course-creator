const { initializeConfig } = require('./index');
const { initialize: initializeSupabase } = require('./supabase');
const { initialize: initializeJina } = require('./jina');
const { initialize: initializeQdrant } = require('./qdrant');
const { initialize: initializeClaude } = require('./claude');
const { initialize: initializeServices } = require('./services');
const { initialize: initializeSecurity } = require('./security');
const { initialize: initializeMonitoring } = require('./monitoring');

class ConfigurationInitializer {
  constructor() {
    this.initialized = false;
    this.config = null;
    this.initializationOrder = [
      'main',
      'security',
      'monitoring',
      'services',
      'supabase',
      'jina',
      'qdrant',
      'claude',
    ];
  }

  async initialize() {
    if (this.initialized) {
      return this.config;
    }

    console.log('🔧 Initializing AI Course Creator configuration...');
    
    try {
      // Initialize configurations in order
      for (const configName of this.initializationOrder) {
        await this.initializeConfig(configName);
      }

      // Get final configuration
      this.config = this.getFinalConfig();
      this.initialized = true;

      console.log('✅ Configuration initialization completed successfully');
      this.logConfigurationSummary();
      
      return this.config;
    } catch (error) {
      console.error('❌ Configuration initialization failed:', error.message);
      throw error;
    }
  }

  async initializeConfig(configName) {
    console.log(`   Initializing ${configName} configuration...`);
    
    try {
      switch (configName) {
        case 'main':
          initializeConfig();
          break;
        case 'security':
          initializeSecurity();
          break;
        case 'monitoring':
          initializeMonitoring();
          break;
        case 'services':
          initializeServices();
          break;
        case 'supabase':
          initializeSupabase();
          break;
        case 'jina':
          initializeJina();
          break;
        case 'qdrant':
          initializeQdrant();
          break;
        case 'claude':
          initializeClaude();
          break;
        default:
          throw new Error(`Unknown configuration: ${configName}`);
      }
      
      console.log(`   ✓ ${configName} configuration initialized`);
    } catch (error) {
      console.error(`   ✗ ${configName} configuration failed: ${error.message}`);
      throw error;
    }
  }

  getFinalConfig() {
    const { getConfig } = require('./index');
    const { getConfig: getSupabaseConfig } = require('./supabase');
    const { getConfig: getJinaConfig } = require('./jina');
    const { getConfig: getQdrantConfig } = require('./qdrant');
    const { getConfig: getClaudeConfig } = require('./claude');
    const { getConfig: getServicesConfig } = require('./services');
    const { getConfig: getSecurityConfig } = require('./security');
    const { getConfig: getMonitoringConfig } = require('./monitoring');

    return {
      main: getConfig(),
      supabase: getSupabaseConfig(),
      jina: getJinaConfig(),
      qdrant: getQdrantConfig(),
      claude: getClaudeConfig(),
      services: getServicesConfig(),
      security: getSecurityConfig(),
      monitoring: getMonitoringConfig(),
      meta: {
        initialized: true,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    };
  }

  logConfigurationSummary() {
    const config = this.config;
    
    console.log('\n📋 Configuration Summary:');
    console.log(`   Environment: ${config.main.env}`);
    console.log(`   Server: ${config.main.server.host}:${config.main.server.port}`);
    console.log(`   Database: ${config.supabase.hasServiceKey ? '✓' : '✗'} Supabase`);
    console.log(`   Vector DB: ${config.qdrant.initialized ? '✓' : '✗'} Qdrant`);
    console.log(`   AI Services: ${config.claude.initialized ? '✓' : '✗'} Claude, ${config.jina.initialized ? '✓' : '✗'} Jina`);
    console.log(`   Security: ${config.security.initialized ? '✓' : '✗'} Enabled`);
    console.log(`   Monitoring: ${config.monitoring.initialized ? '✓' : '✗'} Enabled`);
    
    if (config.main.isDevelopment) {
      console.log(`   Development: Debug routes enabled, Dev logging enabled`);
    }
    
    if (config.main.isProduction) {
      console.log(`   Production: Security hardened, Compression enabled`);
    }
  }

  async validateConnections() {
    console.log('🔍 Validating external connections...');
    
    const { testConnection: testSupabase } = require('./supabase');
    const { testConnection: testJina } = require('./jina');
    const { testConnection: testQdrant } = require('./qdrant');
    const { testConnection: testClaude } = require('./claude');

    const tests = [
      { name: 'Supabase', test: testSupabase },
      { name: 'Jina AI', test: testJina },
      { name: 'Qdrant', test: testQdrant },
      { name: 'Claude AI', test: testClaude },
    ];

    const results = {};
    
    for (const { name, test } of tests) {
      try {
        console.log(`   Testing ${name} connection...`);
        const result = await test();
        results[name] = result;
        console.log(`   ${result ? '✓' : '✗'} ${name} connection ${result ? 'successful' : 'failed'}`);
      } catch (error) {
        results[name] = false;
        console.log(`   ✗ ${name} connection failed: ${error.message}`);
      }
    }

    const failedConnections = Object.entries(results)
      .filter(([_, success]) => !success)
      .map(([name, _]) => name);

    if (failedConnections.length > 0) {
      console.log(`\n⚠️  Some connections failed: ${failedConnections.join(', ')}`);
      console.log('   The server will start but some features may not work properly.');
    } else {
      console.log('\n✅ All external connections validated successfully');
    }

    return results;
  }

  getConfig() {
    if (!this.initialized) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
    return this.config;
  }

  isInitialized() {
    return this.initialized;
  }
}

// Create singleton instance
const configInitializer = new ConfigurationInitializer();

module.exports = {
  configInitializer,
  initialize: () => configInitializer.initialize(),
  validateConnections: () => configInitializer.validateConnections(),
  getConfig: () => configInitializer.getConfig(),
  isInitialized: () => configInitializer.isInitialized(),
};