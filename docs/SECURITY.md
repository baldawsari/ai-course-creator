# AI Course Creator - Security Best Practices

This document outlines security best practices and configurations for deploying and maintaining the AI Course Creator application in production environments.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Security](#api-security)
4. [Database Security](#database-security)
5. [File Upload Security](#file-upload-security)
6. [Environment Variables & Secrets](#environment-variables--secrets)
7. [Network Security](#network-security)
8. [Security Headers](#security-headers)
9. [Dependency Management](#dependency-management)
10. [Monitoring & Incident Response](#monitoring--incident-response)
11. [Security Checklist](#security-checklist)

## Security Overview

The AI Course Creator implements defense-in-depth security strategies across multiple layers:

- **Authentication**: JWT-based with Supabase Auth
- **Authorization**: Role-based access control (RBAC) with Row Level Security (RLS)
- **Data Protection**: Encryption in transit and at rest
- **Input Validation**: Comprehensive validation and sanitization
- **Rate Limiting**: Protection against abuse and DoS attacks
- **Monitoring**: Real-time security event tracking

## Authentication & Authorization

### JWT Configuration

```javascript
// Secure JWT configuration
const jwtConfig = {
  secret: process.env.JWT_SECRET, // Minimum 256-bit entropy
  expiresIn: process.env.JWT_EXPIRE_TIME || '7d',
  algorithm: 'HS256',
  issuer: 'ai-course-creator',
  audience: 'ai-course-users'
};
```

**Best Practices:**
- Generate cryptographically secure JWT secrets:
  ```bash
  openssl rand -base64 32
  ```
- Use different secrets for each environment
- Implement token refresh mechanism
- Store tokens securely (httpOnly cookies preferred)

### Password Security

```javascript
// Bcrypt configuration
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

// Password requirements
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  preventCommonPasswords: true
};
```

**Implementation:**
- Enforce strong password policies
- Use bcrypt with appropriate salt rounds (12+ for production)
- Implement password history to prevent reuse
- Add rate limiting to login attempts

### Session Management

```javascript
// Express session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    httpOnly: true, // Prevent XSS
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24 hours
    sameSite: 'strict' // CSRF protection
  },
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: 86400 // 24 hours
  })
}));
```

### Role-Based Access Control (RBAC)

```sql
-- Example RLS policies for Supabase
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Only admins can delete users"
  ON users FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin');
```

## API Security

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// General API rate limiting
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
```

### Input Validation & Sanitization

```javascript
const validator = require('validator');
const xss = require('xss');

// Input validation middleware
const validateInput = (req, res, next) => {
  // Sanitize all string inputs
  Object.keys(req.body).forEach(key => {
    if (typeof req.body[key] === 'string') {
      req.body[key] = xss(req.body[key]);
      req.body[key] = validator.escape(req.body[key]);
    }
  });
  
  // Validate specific fields
  if (req.body.email && !validator.isEmail(req.body.email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  if (req.body.url && !validator.isURL(req.body.url, { protocols: ['http', 'https'] })) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  
  next();
};
```

### API Key Security

```javascript
// API key validation middleware
const validateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // Hash API keys before storage
  const hashedKey = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
  
  const validKey = await db.query(
    'SELECT * FROM api_keys WHERE key_hash = $1 AND expires_at > NOW()',
    [hashedKey]
  );
  
  if (!validKey) {
    return res.status(401).json({ error: 'Invalid or expired API key' });
  }
  
  // Log API key usage
  await logApiKeyUsage(validKey.id, req.ip);
  
  next();
};
```

## Database Security

### Connection Security

```javascript
// Secure database connection
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'ai-course-creator'
      }
    }
  }
);
```

### SQL Injection Prevention

```javascript
// Always use parameterized queries
// Good - Parameterized query
const user = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail)
  .single();

// Bad - String concatenation (vulnerable to SQL injection)
// const query = `SELECT * FROM users WHERE email = '${userEmail}'`;

// For complex queries, use prepared statements
const { data, error } = await supabase.rpc('get_user_courses', {
  user_id: userId,
  status: 'active'
});
```

### Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Course access policy
CREATE POLICY "Users can access own courses"
  ON courses
  FOR ALL
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM course_enrollments 
      WHERE course_id = courses.id 
      AND user_id = auth.uid()
    )
  );

-- Document access policy
CREATE POLICY "Documents accessible via course enrollment"
  ON documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = documents.course_id 
      AND (
        courses.user_id = auth.uid() 
        OR 
        EXISTS (
          SELECT 1 FROM course_enrollments 
          WHERE course_id = courses.id 
          AND user_id = auth.uid()
        )
      )
    )
  );
```

## File Upload Security

### File Type Validation

```javascript
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/')
  },
  filename: (req, file, cb) => {
    // Generate random filename to prevent path traversal
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomName}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Whitelist allowed MIME types
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    // Additional magic number validation
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB
    files: 1
  }
});
```

### File Content Scanning

```javascript
const FileType = require('file-type');
const readChunk = require('read-chunk');

async function validateFileContent(filepath) {
  // Verify file type by reading file headers
  const buffer = await readChunk(filepath, 0, 4100);
  const fileType = await FileType.fromBuffer(buffer);
  
  const allowedTypes = ['pdf', 'docx', 'doc', 'txt'];
  
  if (!fileType || !allowedTypes.includes(fileType.ext)) {
    throw new Error('File content does not match allowed types');
  }
  
  // Additional content scanning
  // - Check for embedded executables
  // - Scan for malware signatures
  // - Validate file structure
  
  return true;
}
```

### Storage Security

```javascript
// Secure file storage
async function storeFile(file, userId) {
  // Generate secure path
  const userHash = crypto
    .createHash('sha256')
    .update(userId)
    .digest('hex')
    .substring(0, 8);
  
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString('hex');
  const securePath = `${userHash}/${timestamp}-${randomStr}`;
  
  // Store with restricted permissions
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(securePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.mimetype
    });
  
  // Set access permissions
  await setFilePermissions(securePath, userId);
  
  return securePath;
}
```

## Environment Variables & Secrets

### Secret Management

```bash
# Development - Use .env files with proper permissions
chmod 600 .env
chmod 600 backend/.env

# Production - Use secret management service
# AWS Secrets Manager example
aws secretsmanager create-secret \
  --name ai-course-creator/production \
  --secret-string file://production-secrets.json

# Kubernetes secrets
kubectl create secret generic ai-course-secrets \
  --from-env-file=.env.production
```

### Environment Variable Security

```javascript
// Validate required environment variables on startup
const requiredEnvVars = {
  SUPABASE_URL: 'URL',
  SUPABASE_SERVICE_KEY: 'string',
  JWT_SECRET: 'string:min:32',
  ANTHROPIC_API_KEY: 'string:prefix:sk-ant',
  NODE_ENV: 'enum:development,production,test'
};

function validateEnvironment() {
  const errors = [];
  
  Object.entries(requiredEnvVars).forEach(([key, validation]) => {
    const value = process.env[key];
    
    if (!value) {
      errors.push(`Missing required env var: ${key}`);
      return;
    }
    
    // Validate format
    const [type, ...rules] = validation.split(':');
    
    if (type === 'URL' && !isValidUrl(value)) {
      errors.push(`Invalid URL for ${key}`);
    }
    
    if (rules.includes('min') && value.length < parseInt(rules[1])) {
      errors.push(`${key} must be at least ${rules[1]} characters`);
    }
  });
  
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }
}
```

## Network Security

### HTTPS Configuration

```nginx
# Nginx SSL configuration
server {
    listen 443 ssl http2;
    server_name courses.yourdomain.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;
    
    # Session configuration
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
}
```

### CORS Configuration

```javascript
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',');
    
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'CORS policy violation: Origin not allowed';
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
```

## Security Headers

### Express Security Headers

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.anthropic.com", "wss://"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true,
}));
```

### Additional Security Headers

```javascript
// Custom security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent content type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Feature policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
});
```

## Dependency Management

### Regular Updates

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Check outdated packages
npm outdated

# Update dependencies
npm update

# Use npm-check-updates for major updates
npx npm-check-updates -u
```

### Dependency Security Policy

```json
// package.json
{
  "scripts": {
    "security-check": "npm audit && snyk test",
    "update-check": "npm outdated",
    "update-minor": "npm update",
    "update-major": "npx npm-check-updates -u"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### Lock File Security

```bash
# Always commit lock files
git add package-lock.json

# Verify integrity
npm ci

# Clean install for production
npm ci --production
```

## Monitoring & Incident Response

### Security Event Logging

```javascript
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'ai-course-security' },
  transports: [
    new winston.transports.File({ 
      filename: 'security.log',
      level: 'info' 
    }),
    new winston.transports.File({ 
      filename: 'security-error.log',
      level: 'error' 
    })
  ]
});

// Log security events
function logSecurityEvent(event, details) {
  securityLogger.info({
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
}

// Usage
logSecurityEvent('LOGIN_ATTEMPT', {
  userId: user.id,
  ip: req.ip,
  success: true,
  userAgent: req.headers['user-agent']
});
```

### Real-time Monitoring

```javascript
// Monitor suspicious activities
const suspiciousPatterns = {
  rapidRequests: 10, // requests per second
  failedLogins: 5,   // failed attempts
  largePayloads: 10 * 1024 * 1024, // 10MB
};

// Track and alert
async function monitorSuspiciousActivity(req) {
  const key = `suspicious:${req.ip}`;
  const count = await redis.incr(key);
  await redis.expire(key, 60); // 1 minute window
  
  if (count > suspiciousPatterns.rapidRequests) {
    await alertSecurityTeam({
      type: 'RAPID_REQUESTS',
      ip: req.ip,
      count: count,
      endpoint: req.path
    });
  }
}
```

### Incident Response Plan

1. **Detection**
   - Automated alerts for security events
   - Regular log analysis
   - User reports

2. **Assessment**
   - Determine scope and severity
   - Identify affected systems/data
   - Document timeline

3. **Containment**
   - Isolate affected systems
   - Revoke compromised credentials
   - Block malicious IPs

4. **Eradication**
   - Remove malicious code
   - Patch vulnerabilities
   - Update security controls

5. **Recovery**
   - Restore from clean backups
   - Verify system integrity
   - Monitor for recurrence

6. **Lessons Learned**
   - Document incident
   - Update security procedures
   - Implement preventive measures

## Security Checklist

### Pre-deployment Security Checklist

- [ ] **Authentication & Authorization**
  - [ ] Strong JWT secret generated
  - [ ] Password policy enforced
  - [ ] Session management configured
  - [ ] RLS policies tested

- [ ] **API Security**
  - [ ] Rate limiting enabled
  - [ ] Input validation implemented
  - [ ] API keys properly managed
  - [ ] CORS configured correctly

- [ ] **Database Security**
  - [ ] Connection encrypted (SSL/TLS)
  - [ ] RLS enabled on all tables
  - [ ] Service key protected
  - [ ] Regular backups configured

- [ ] **File Security**
  - [ ] File type validation
  - [ ] Size limits enforced
  - [ ] Secure storage paths
  - [ ] Access controls implemented

- [ ] **Network Security**
  - [ ] HTTPS enforced
  - [ ] SSL certificates valid
  - [ ] Security headers configured
  - [ ] Firewall rules set

- [ ] **Monitoring**
  - [ ] Security logging enabled
  - [ ] Alert system configured
  - [ ] Incident response plan ready
  - [ ] Regular security audits scheduled

### Regular Security Tasks

**Daily:**
- Review security logs
- Check for failed login attempts
- Monitor API usage patterns

**Weekly:**
- Run dependency vulnerability scan
- Review user access logs
- Check SSL certificate expiry

**Monthly:**
- Update dependencies
- Review and rotate API keys
- Security training/awareness

**Quarterly:**
- Penetration testing
- Security audit
- Update incident response plan

## Conclusion

Security is an ongoing process, not a one-time configuration. Regular monitoring, updates, and improvements are essential to maintain a secure application. Always follow the principle of least privilege and defense in depth.

For security concerns or incidents, contact the security team immediately at security@yourdomain.com.