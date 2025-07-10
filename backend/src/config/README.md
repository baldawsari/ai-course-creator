# AI Course Creator - Configuration Management System

A comprehensive configuration management system for the AI Course Creator backend, providing centralized configuration for all services, APIs, security, and monitoring.

## 📁 Configuration Structure

```
src/config/
├── index.js          # Main configuration with environment validation
├── init.js           # Configuration initialization and validation
├── supabase.js       # Supabase database configuration
├── jina.js           # Jina AI embeddings/reranking configuration
├── qdrant.js         # Qdrant vector database configuration
├── claude.js         # Claude AI configuration
├── services.js       # Service configurations (upload, queue, cache)
├── security.js       # Security configurations (CORS, JWT, rate limiting)
├── monitoring.js     # Monitoring configurations (logging, metrics, health)
└── README.md         # This documentation
```

## 🚀 Quick Start

### Basic Usage

```javascript
const { initialize } = require('./config/init');

// Initialize all configurations
const config = await initialize();

// Use specific configurations
const { getClient } = require('./config/supabase');
const { getClient: getClaudeClient } = require('./config/claude');

const supabase = getClient();
const claude = getClaudeClient();
```

### Environment Setup

Create a `.env` file with required variables:

```bash
# Required Environment Variables
NODE_ENV=development
PORT=3000

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# AI Services
ANTHROPIC_API_KEY=sk-ant-your-key
JINA_API_KEY=jina_your-key

# Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-api-key

# Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional
```

## 📋 Configuration Modules

### 1. Main Configuration (`index.js`)

Central configuration hub with environment validation:

```javascript
const { getConfig } = require('./config/index');

const config = getConfig();
console.log(config.env); // 'development', 'production', 'test'
console.log(config.server.port); // 3000
```

**Features:**
- Environment variable validation with Joi schema
- Environment-specific overrides
- Secure credential handling
- Default values for all settings

### 2. API Configurations

#### Supabase Configuration (`supabase.js`)

```javascript
const { getClient, getAdminClient } = require('./config/supabase');

const supabase = getClient();
const admin = getAdminClient();

// Test connection
await testConnection();

// Get table configuration
const tableConfig = getTableConfig('documents');
```

#### Jina AI Configuration (`jina.js`)

```javascript
const { getClient, getEmbeddingModels } = require('./config/jina');

const jina = getClient();
const models = getEmbeddingModels();

// Validate request
validateEmbeddingRequest(texts, 'jina-embeddings-v3');
```

#### Qdrant Configuration (`qdrant.js`)

```javascript
const { getClient, getCollectionConfigs } = require('./config/qdrant');

const qdrant = getClient();
const configs = getCollectionConfigs();

// Validate collection
validateCollectionName('documents');
```

#### Claude AI Configuration (`claude.js`)

```javascript
const { getClient, getModels } = require('./config/claude');

const claude = getClient();
const models = getModels();

// Get prompts
const prompts = getCourseGenerationPrompts();
```

### 3. Service Configurations (`services.js`)

```javascript
const { getUploadConfig, getQueueConfig } = require('./config/services');

const uploadConfig = getUploadConfig();
const queueConfig = getQueueConfig();
```

**Includes:**
- File upload limits and types
- Processing queue settings
- Cache configuration
- Rate limiting rules

### 4. Security Configuration (`security.js`)

```javascript
const { getCORSConfig, getJWTConfig } = require('./config/security');

const corsConfig = getCORSConfig();
const jwtConfig = getJWTConfig();
```

**Features:**
- CORS settings by environment
- Helmet security headers
- JWT configuration
- API key management
- Password policies

### 5. Monitoring Configuration (`monitoring.js`)

```javascript
const { getLoggingConfig, getMetricsConfig } = require('./config/monitoring');

const loggingConfig = getLoggingConfig();
const metricsConfig = getMetricsConfig();
```

**Includes:**
- Logging levels and formats
- Performance monitoring
- Error tracking setup
- Health check configuration
- Audit logging

## 🔧 Environment-Specific Settings

### Development
```javascript
{
  LOG_LEVEL: 'debug',
  ENABLE_DEBUG_ROUTES: true,
  CORS_ORIGIN: '*',
  RATE_LIMIT_MAX_REQUESTS: 1000
}
```

### Production
```javascript
{
  LOG_LEVEL: 'info',
  ENABLE_DEBUG_ROUTES: false,
  CORS_ORIGIN: 'https://your-frontend.com',
  RATE_LIMIT_MAX_REQUESTS: 100,
  ENABLE_HELMET: true
}
```

### Test
```javascript
{
  LOG_LEVEL: 'warn',
  ENABLE_METRICS: false,
  RATE_LIMIT_MAX_REQUESTS: 10000,
  CACHE_TTL: 10
}
```

## 🛡️ Security Features

### JWT Configuration
- HS256 algorithm
- Custom issuer/audience
- Configurable expiration
- Secure secret validation

### API Key Management
- Prefix-based validation
- Scope-based permissions
- Rate limiting per key
- Automatic key rotation support

### CORS Configuration
- Environment-specific origins
- Credential support
- Header whitelisting
- Preflight optimization

### Rate Limiting
- IP-based limiting
- API key exemptions
- Sliding window
- Custom error responses

## 📊 Monitoring & Observability

### Logging
- Structured JSON logging
- Multiple transports (console, file, error)
- Request/response logging
- Error tracking

### Metrics
- Prometheus-compatible metrics
- HTTP request metrics
- Business metrics (document processing, course generation)
- Queue metrics

### Health Checks
- Database connectivity
- External API health
- Storage availability
- Custom health checks

## 🔄 Configuration Validation

### Connection Testing
```javascript
const { validateConnections } = require('./config/init');

const results = await validateConnections();
console.log(results);
// {
//   'Supabase': true,
//   'Jina AI': true,
//   'Qdrant': true,
//   'Claude AI': true
// }
```

### Schema Validation
All configurations use Joi schemas for validation:

```javascript
const schema = Joi.object({
  SUPABASE_URL: Joi.string().uri().required(),
  ANTHROPIC_API_KEY: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  // ... more validations
});
```

## 🎯 Usage Examples

### Express App Integration
```javascript
const express = require('express');
const { initialize } = require('./config/init');
const { getCORSConfig } = require('./config/security');
const { getLoggingConfig } = require('./config/monitoring');

const app = express();

// Initialize configuration
const config = await initialize();

// Apply CORS
app.use(cors(getCORSConfig()));

// Setup logging
const logger = winston.createLogger(getLoggingConfig());
```

### Queue Worker Setup
```javascript
const { getQueueConfig } = require('./config/services');
const Bull = require('bull');

const queueConfig = getQueueConfig();
const processQueue = new Bull('document-processing', queueConfig.redis);

processQueue.process(queueConfig.jobs['document-processing']);
```

### Database Connection
```javascript
const { getClient } = require('./config/supabase');

const supabase = getClient();
const { data, error } = await supabase
  .from('documents')
  .select('*')
  .limit(10);
```

## 🚨 Error Handling

### Configuration Errors
```javascript
try {
  await initialize();
} catch (error) {
  console.error('Configuration failed:', error.message);
  process.exit(1);
}
```

### Connection Failures
```javascript
const { testConnection } = require('./config/supabase');

if (!await testConnection()) {
  console.warn('Database connection failed, using fallback');
}
```

## 📈 Performance Optimizations

### Caching
- Redis-based caching
- Configurable TTL
- Size limits
- Cache invalidation

### Compression
- gzip compression
- Configurable threshold
- Multiple strategies

### Rate Limiting
- Memory-efficient sliding window
- Redis-backed persistence
- Configurable limits per endpoint

## 🔐 Security Best Practices

1. **Environment Variables**: Never commit secrets to version control
2. **API Keys**: Use prefixed keys with limited scopes
3. **JWT Secrets**: Minimum 32 characters, regularly rotated
4. **CORS**: Restrict origins in production
5. **Rate Limiting**: Implement per-endpoint limits
6. **Helmet**: Enable security headers in production

## 🎛️ Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port |
| `SUPABASE_URL` | Yes | - | Supabase database URL |
| `SUPABASE_ANON_KEY` | Yes | - | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | Yes | - | Supabase service key |
| `ANTHROPIC_API_KEY` | Yes | - | Claude AI API key |
| `JINA_API_KEY` | Yes | - | Jina AI API key |
| `QDRANT_URL` | Yes | - | Qdrant vector database URL |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `REDIS_HOST` | No | `localhost` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |

### Default Values

| Setting | Development | Production | Test |
|---------|-------------|------------|------|
| Log Level | `debug` | `info` | `warn` |
| CORS Origin | `*` | Configured | `*` |
| Rate Limit | 1000/15min | 100/15min | 10000/15min |
| Debug Routes | Enabled | Disabled | Disabled |
| Compression | Enabled | Enabled | Disabled |
| Metrics | Enabled | Enabled | Disabled |

## 🔍 Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```bash
   Error: Missing required environment variables: ANTHROPIC_API_KEY
   ```
   Solution: Set all required environment variables

2. **Invalid JWT Secret**
   ```bash
   Error: JWT_SECRET must be at least 32 characters long
   ```
   Solution: Generate a secure 32+ character secret

3. **Database Connection Failed**
   ```bash
   Error: Supabase connection test failed
   ```
   Solution: Check Supabase URL and keys

4. **Configuration Validation Failed**
   ```bash
   Error: Configuration validation failed: PORT must be a number
   ```
   Solution: Ensure environment variables are properly typed

### Debug Mode

Enable debug logging:
```bash
NODE_ENV=development LOG_LEVEL=debug npm start
```

## 📚 Related Documentation

- [System Architecture](../docs/ARCHITECTURE.md)
- [API Documentation](../docs/API.md)
- [Testing Guide](../docs/TESTING.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)

---

For more information, see the main project documentation in [CLAUDE.md](../../CLAUDE.md).