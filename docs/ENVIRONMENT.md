# AI Course Creator - Environment Variables Reference

This document provides comprehensive documentation for all environment variables used in the AI Course Creator application.

## Table of Contents

1. [Overview](#overview)
2. [Required Variables](#required-variables)
3. [Optional Variables](#optional-variables)
4. [Environment-Specific Configurations](#environment-specific-configurations)
5. [Obtaining API Keys](#obtaining-api-keys)
6. [Security Best Practices](#security-best-practices)

## Overview

Environment variables are used to configure the application for different environments (development, staging, production) without modifying code. They are loaded from `.env` files using the `dotenv` package.

### File Structure
- `/backend/.env` - Backend service configuration
- `/.env` - Root configuration (if needed)
- `/frontend/.env.local` - Frontend configuration (Next.js)

### Loading Priority
1. System environment variables (highest priority)
2. `.env.production` (in production)
3. `.env.local` (git-ignored, for local overrides)
4. `.env` (base configuration)

## Required Variables

These variables MUST be set for the application to function properly.

### Database Configuration (Supabase)

#### SUPABASE_URL
- **Description**: Your Supabase project URL
- **Format**: `https://[project-id].supabase.co`
- **Example**: `https://xyzcompany.supabase.co`
- **How to obtain**: From your Supabase project dashboard → Settings → API

#### SUPABASE_ANON_KEY
- **Description**: Public anonymous key for client-side operations
- **Format**: JWT token string
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **How to obtain**: Supabase dashboard → Settings → API → anon/public key
- **Security**: Safe to expose in frontend code

#### SUPABASE_SERVICE_KEY
- **Description**: Service role key for server-side operations with elevated privileges
- **Format**: JWT token string
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **How to obtain**: Supabase dashboard → Settings → API → service_role key
- **Security**: ⚠️ NEVER expose in frontend code or commit to version control

### AI Services

#### ANTHROPIC_API_KEY
- **Description**: API key for Claude AI integration (course generation)
- **Format**: `sk-ant-api...`
- **Example**: `sk-ant-api03-xxxxxxxxxxx`
- **How to obtain**: 
  1. Sign up at [console.anthropic.com](https://console.anthropic.com)
  2. Navigate to API Keys section
  3. Create new API key
- **Rate limits**: Check your plan's limits
- **Security**: Keep confidential, monitor usage

#### JINA_API_KEY
- **Description**: API key for Jina AI services (embeddings and reranking)
- **Format**: `jina_...`
- **Example**: `jina_1234567890abcdef`
- **How to obtain**:
  1. Sign up at [jina.ai](https://jina.ai)
  2. Go to Dashboard → API Keys
  3. Generate new key
- **Usage**: Document embeddings and semantic search
- **Free tier**: Available with rate limits

### Vector Database

#### QDRANT_URL
- **Description**: Qdrant vector database endpoint
- **Format**: `http://host:port` or `https://host`
- **Example**: 
  - Local: `http://localhost:6333`
  - Cloud: `https://xyz-abc.aws.qdrant.io`
- **Default**: `http://localhost:6333`
- **Setup**: 
  - Local: Run with Docker `docker run -p 6333:6333 qdrant/qdrant`
  - Cloud: Use Qdrant Cloud service

#### QDRANT_API_KEY
- **Description**: Authentication key for Qdrant (required for cloud instances)
- **Format**: String token
- **Example**: `your-qdrant-api-key`
- **Required**: Only for Qdrant Cloud deployments
- **How to obtain**: From Qdrant Cloud dashboard

### Authentication

#### JWT_SECRET
- **Description**: Secret key for signing JWT tokens
- **Format**: Random string (minimum 32 characters)
- **Example**: `a7f3b8c9d2e1f4g5h6i7j8k9l0m1n2o3`
- **Generation**: 
  ```bash
  # Generate secure random string
  openssl rand -base64 32
  # or
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Security**: ⚠️ MUST be unique per environment, never reuse

### Server Configuration

#### NODE_ENV
- **Description**: Application environment
- **Format**: `development` | `production` | `test`
- **Default**: `development`
- **Impact**: Affects logging, error handling, performance optimizations

#### PORT
- **Description**: Backend server port
- **Format**: Number
- **Default**: `3001`
- **Example**: `3001`, `8080`

#### FRONTEND_URL
- **Description**: Frontend application URL for CORS configuration
- **Format**: Full URL without trailing slash
- **Example**: 
  - Development: `http://localhost:5173`
  - Production: `https://courses.yourdomain.com`
- **Usage**: CORS whitelist, redirect URLs

### Queue System (Redis)

#### REDIS_HOST
- **Description**: Redis server hostname
- **Format**: Hostname or IP address
- **Default**: `localhost`
- **Example**: `redis.yourdomain.com`, `10.0.0.5`

#### REDIS_PORT
- **Description**: Redis server port
- **Format**: Number
- **Default**: `6379`
- **Example**: `6379`, `6380`

## Optional Variables

These variables have sensible defaults but can be customized for your needs.

### Redis Configuration (Extended)

#### REDIS_PASSWORD
- **Description**: Redis authentication password
- **Format**: String
- **Default**: Empty (no authentication)
- **Example**: `your-redis-password`
- **When required**: Production deployments, cloud Redis

#### REDIS_DB
- **Description**: Redis database number
- **Format**: Number (0-15)
- **Default**: `0`
- **Usage**: Separate environments or applications

#### REDIS_TLS_ENABLED
- **Description**: Enable TLS/SSL for Redis connection
- **Format**: `true` | `false`
- **Default**: `false`
- **When to enable**: Cloud Redis instances (AWS ElastiCache, Redis Labs)

### Bull Queue Configuration

#### BULL_REDIS_HOST
- **Description**: Dedicated Redis host for Bull queues
- **Format**: Hostname or IP
- **Default**: Uses `REDIS_HOST`
- **Usage**: Separate queue Redis from cache Redis

#### BULL_REDIS_PORT
- **Description**: Redis port for Bull queues
- **Format**: Number
- **Default**: Uses `REDIS_PORT`

#### BULL_REDIS_DB
- **Description**: Redis database for queues
- **Format**: Number (0-15)
- **Default**: `1`
- **Best practice**: Use different DB than cache

#### QUEUE_CONCURRENCY
- **Description**: Number of jobs processed simultaneously
- **Format**: Number
- **Default**: `5`
- **Tuning**: Based on server resources and job complexity

### File Upload Configuration

#### MAX_FILE_SIZE
- **Description**: Maximum file upload size in bytes
- **Format**: Number
- **Default**: `52428800` (50MB)
- **Example**: 
  - 10MB: `10485760`
  - 100MB: `104857600`
- **Note**: Also configure in Nginx/proxy

#### ALLOWED_FILE_TYPES
- **Description**: Comma-separated list of allowed MIME types
- **Format**: MIME types
- **Default**: `application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain`
- **Supported types**:
  - PDF: `application/pdf`
  - DOCX: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - DOC: `application/msword`
  - TXT: `text/plain`

### Authentication Configuration

#### JWT_EXPIRE_TIME
- **Description**: JWT token expiration time
- **Format**: Zeit/ms compatible string
- **Default**: `7d`
- **Examples**: `1h`, `24h`, `7d`, `30d`
- **Security**: Shorter = more secure, longer = better UX

#### BCRYPT_SALT_ROUNDS
- **Description**: Bcrypt hashing complexity
- **Format**: Number (4-31)
- **Default**: `10`
- **Trade-off**: Higher = more secure but slower
- **Recommendation**: 10-12 for production

#### SESSION_SECRET
- **Description**: Express session secret
- **Format**: Random string
- **Default**: Generated from JWT_SECRET
- **Generation**: Same as JWT_SECRET

#### SESSION_MAX_AGE
- **Description**: Session cookie lifetime in milliseconds
- **Format**: Number
- **Default**: `86400000` (24 hours)
- **Examples**:
  - 1 hour: `3600000`
  - 1 week: `604800000`

### Rate Limiting

#### RATE_LIMIT_WINDOW_MS
- **Description**: Time window for rate limiting in milliseconds
- **Format**: Number
- **Default**: `900000` (15 minutes)
- **Example**: 
  - 5 minutes: `300000`
  - 1 hour: `3600000`

#### RATE_LIMIT_MAX_REQUESTS
- **Description**: Maximum requests per window
- **Format**: Number
- **Default**: `100`
- **Tuning**: Based on expected usage patterns

### Logging Configuration

#### LOG_LEVEL
- **Description**: Minimum log level to output
- **Format**: `error` | `warn` | `info` | `debug`
- **Default**: `info`
- **Production**: Usually `warn` or `error`

#### LOG_FORMAT
- **Description**: Log output format
- **Format**: `json` | `combined` | `common` | `dev`
- **Default**: `combined`
- **Production**: `json` for structured logging

### CORS Configuration

#### CORS_ALLOWED_ORIGINS
- **Description**: Comma-separated list of allowed origins
- **Format**: URLs without trailing slash
- **Default**: `http://localhost:5173,http://localhost:3001`
- **Example**: `https://app.yourdomain.com,https://api.yourdomain.com`
- **Security**: Be specific, avoid wildcards in production

### Email Configuration (Optional)

#### EMAIL_HOST
- **Description**: SMTP server hostname
- **Format**: Hostname
- **Default**: `smtp.gmail.com`
- **Examples**: 
  - SendGrid: `smtp.sendgrid.net`
  - AWS SES: `email-smtp.us-east-1.amazonaws.com`

#### EMAIL_PORT
- **Description**: SMTP server port
- **Format**: Number
- **Default**: `587`
- **Common ports**:
  - 587: TLS/STARTTLS
  - 465: SSL
  - 25: Unencrypted (not recommended)

#### EMAIL_USER
- **Description**: SMTP authentication username
- **Format**: Email or username
- **Example**: `notifications@yourdomain.com`

#### EMAIL_PASS
- **Description**: SMTP authentication password
- **Format**: String
- **Security**: Use app-specific passwords when available

#### EMAIL_FROM
- **Description**: Default sender address
- **Format**: `Name <email@domain.com>`
- **Default**: `AI Course Creator <noreply@aicourse.com>`
- **Example**: `YourCompany <courses@yourdomain.com>`

### Monitoring and Error Tracking

#### SENTRY_DSN
- **Description**: Sentry error tracking DSN
- **Format**: Sentry DSN URL
- **Example**: `https://abc123@o123456.ingest.sentry.io/123456`
- **How to obtain**: Create project at [sentry.io](https://sentry.io)
- **Benefits**: Real-time error tracking and alerting

#### SENTRY_ENVIRONMENT
- **Description**: Environment tag for Sentry
- **Format**: String
- **Default**: Value of `NODE_ENV`
- **Example**: `production`, `staging`

#### ENABLE_METRICS
- **Description**: Enable Prometheus metrics endpoint
- **Format**: `true` | `false`
- **Default**: `true`
- **Endpoint**: `/metrics` on METRICS_PORT

#### METRICS_PORT
- **Description**: Port for metrics endpoint
- **Format**: Number
- **Default**: `9090`
- **Usage**: Prometheus scraping

### Document Processing

#### MAX_CHUNK_SIZE
- **Description**: Maximum size for document chunks (tokens)
- **Format**: Number
- **Default**: `1000`
- **Impact**: Affects search accuracy and API costs

#### MIN_CHUNK_SIZE
- **Description**: Minimum size for document chunks (tokens)
- **Format**: Number
- **Default**: `100`
- **Purpose**: Avoid too-small chunks

#### OVERLAP_SIZE
- **Description**: Token overlap between chunks
- **Format**: Number
- **Default**: `50`
- **Purpose**: Maintain context between chunks

#### QUALITY_MINIMUM
- **Description**: Minimum quality score threshold
- **Format**: Number (0-100)
- **Default**: `50`
- **Usage**: Filter low-quality content

#### QUALITY_RECOMMENDED
- **Description**: Recommended quality score
- **Format**: Number (0-100)
- **Default**: `70`
- **Usage**: Warn users about quality

#### QUALITY_PREMIUM
- **Description**: Premium quality threshold
- **Format**: Number (0-100)
- **Default**: `85`
- **Usage**: Identify high-quality content

### Testing Configuration

#### ENABLE_FULL_TEST_SUITE
- **Description**: Run extended test suite
- **Format**: `true` | `false`
- **Default**: `false`
- **Usage**: CI/CD pipelines

## Environment-Specific Configurations

### Development Environment
```bash
NODE_ENV=development
LOG_LEVEL=debug
LOG_FORMAT=dev
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001
RATE_LIMIT_MAX_REQUESTS=1000  # More lenient for development
```

### Production Environment
```bash
NODE_ENV=production
LOG_LEVEL=warn
LOG_FORMAT=json
CORS_ALLOWED_ORIGINS=https://courses.yourdomain.com
RATE_LIMIT_MAX_REQUESTS=100
REDIS_TLS_ENABLED=true
EMAIL_HOST=smtp.sendgrid.net
SENTRY_DSN=https://your-sentry-dsn
ENABLE_METRICS=true
```

### Testing Environment
```bash
NODE_ENV=test
LOG_LEVEL=error
ENABLE_FULL_TEST_SUITE=true
JWT_SECRET=test-jwt-secret
SUPABASE_URL=http://localhost:54321
```

## Obtaining API Keys

### Supabase Setup
1. **Create Account**: Sign up at [supabase.com](https://supabase.com)
2. **Create Project**: 
   - Choose region closest to your users
   - Set strong database password
   - Note the project URL and keys
3. **Configure Database**:
   - Enable Row Level Security
   - Run migrations
   - Set up authentication

### Anthropic Claude API
1. **Sign Up**: Register at [console.anthropic.com](https://console.anthropic.com)
2. **Verify Account**: Complete email verification
3. **Add Payment**: Required for API access
4. **Generate Key**: 
   - Go to API Keys section
   - Create new key with descriptive name
   - Copy immediately (shown once)
5. **Monitor Usage**: Check dashboard for usage and limits

### Jina AI Setup
1. **Register**: Sign up at [jina.ai](https://jina.ai)
2. **Access Dashboard**: Navigate to developer dashboard
3. **Create API Key**: 
   - Click "Create New Key"
   - Name it appropriately
   - Select required permissions
4. **Test Key**: Use provided examples to verify

### Qdrant Cloud (Optional)
1. **Sign Up**: Register at [cloud.qdrant.io](https://cloud.qdrant.io)
2. **Create Cluster**: 
   - Choose region
   - Select plan (free tier available)
3. **Get Credentials**:
   - Note cluster URL
   - Copy API key
4. **Configure Collection**: Create via API or UI

## Security Best Practices

### Key Management
1. **Never Commit Secrets**: 
   - Add `.env` to `.gitignore`
   - Use `.env.example` for templates
   - Review commits for accidental exposure

2. **Use Environment-Specific Keys**:
   - Separate keys for dev/staging/prod
   - Rotate keys regularly
   - Monitor key usage

3. **Secure Storage**:
   - Use secret management services (AWS Secrets Manager, HashiCorp Vault)
   - Encrypt `.env` files at rest
   - Limit access to production keys

### Environment Variable Security
```bash
# Generate strong secrets
openssl rand -base64 32

# Set restrictive permissions
chmod 600 .env

# Use different values per environment
JWT_SECRET_DEV != JWT_SECRET_PROD
```

### Validation and Defaults
```javascript
// Example validation in code
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY',
  'ANTHROPIC_API_KEY',
  'JWT_SECRET'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

### Monitoring and Auditing
1. **Log Access**: Track which services use which keys
2. **Monitor Usage**: Set up alerts for unusual activity
3. **Regular Audits**: Review and rotate keys quarterly
4. **Incident Response**: Have process for compromised keys

## Troubleshooting

### Common Issues

**Missing Required Variables**
```
Error: Missing required environment variable: SUPABASE_URL
```
**Solution**: Ensure all required variables are set in `.env`

**Invalid API Keys**
```
Error: Anthropic API error: Invalid API key
```
**Solution**: Verify key is correct and active in provider dashboard

**Connection Issues**
```
Error: Redis connection failed: ECONNREFUSED
```
**Solution**: Check host/port configuration and service status

**Permission Errors**
```
Error: Supabase error: permission denied for table users
```
**Solution**: Verify service key is used for admin operations

### Debugging Tips
1. **Print Configuration** (dev only):
   ```javascript
   console.log('Loaded config:', {
     nodeEnv: process.env.NODE_ENV,
     port: process.env.PORT,
     // Don't log sensitive values!
   });
   ```

2. **Validate Early**: Check all required vars on startup

3. **Use Defaults Wisely**: Provide sensible defaults for optional vars

4. **Environment Checking**:
   ```bash
   # List all environment variables
   printenv | grep -E '^(SUPABASE|ANTHROPIC|JWT)'
   ```

Remember: Environment variables are the primary way to configure the application for different deployment scenarios. Proper management of these variables is crucial for security and functionality.