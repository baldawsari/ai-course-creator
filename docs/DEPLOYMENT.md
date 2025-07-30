# AI Course Creator - Production Deployment Guide

This guide provides comprehensive instructions for deploying the AI Course Creator application to production environments.

## Table of Contents

1. [Pre-deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Deployment Options](#deployment-options)
5. [Post-deployment Verification](#post-deployment-verification)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)

## Pre-deployment Checklist

Before deploying to production, ensure all items are completed:

### Environment Variables
- [ ] All required environment variables are set (see [ENVIRONMENT.md](./ENVIRONMENT.md))
- [ ] Production API keys are obtained and configured
- [ ] JWT secret is generated with proper entropy
- [ ] Database connection strings are configured

### Database
- [ ] Supabase project is created and configured
- [ ] Database migrations are ready to run
- [ ] RLS policies are properly configured
- [ ] Backup strategy is in place

### Security
- [ ] HTTPS is configured (SSL certificates obtained)
- [ ] CORS is properly configured for production domains
- [ ] Rate limiting is enabled and tuned
- [ ] Security headers are configured
- [ ] API keys are stored securely

### Infrastructure
- [ ] Redis is available for queues and caching
- [ ] Qdrant vector database is deployed
- [ ] Sufficient server resources (CPU, RAM, storage)
- [ ] Domain names are configured

## Environment Setup

### 1. System Requirements

**Minimum Server Requirements:**
- CPU: 4 cores (8 cores recommended)
- RAM: 8GB (16GB recommended)
- Storage: 50GB SSD (100GB+ recommended)
- OS: Ubuntu 20.04+ or compatible Linux distribution

**Required Software:**
- Node.js 18.x or higher
- npm 9.x or higher
- Redis 6.x or higher
- PostgreSQL 14+ (via Supabase)
- Nginx or similar reverse proxy

### 2. Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Redis
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install build essentials
sudo apt install build-essential git -y

# Install PM2 for process management
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /var/www/ai-course-creator
sudo chown $USER:$USER /var/www/ai-course-creator
```

### 3. Clone and Configure Application

```bash
# Clone the repository
cd /var/www/ai-course-creator
git clone https://github.com/your-org/ai-course-creator.git .

# Install dependencies
npm install --production
cd frontend && npm install --production && cd ..

# Create environment files
cp backend/.env.example backend/.env
cp .env.example .env
```

## Database Setup

### 1. Supabase Project Creation

1. Create a new Supabase project at [app.supabase.com](https://app.supabase.com)
2. Note down your project credentials:
   - Project URL
   - Anon Key
   - Service Role Key
   - Database Connection String

### 2. Configure Database Connection

Edit `backend/.env`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. Run Database Migrations

```bash
# Navigate to backend directory
cd backend

# Run all migrations
npm run migration:run

# Verify migrations
npm run migration:status
```

### 4. Configure Row Level Security (RLS)

The migrations automatically set up RLS policies. Verify in Supabase dashboard:
- All tables have RLS enabled
- Policies are correctly configured for user access
- Service role has appropriate permissions

## Deployment Options

### Option 1: Traditional VPS Deployment with PM2

**1. Build the Application**
```bash
# Build backend
cd /var/www/ai-course-creator/backend
npm run build

# Build frontend
cd /var/www/ai-course-creator/frontend
npm run build
```

**2. Configure PM2**
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'ai-course-backend',
      script: './backend/dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'ai-course-worker',
      script: './backend/dist/worker.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log'
    },
    {
      name: 'ai-course-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log'
    }
  ]
};
```

**3. Start Services**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**4. Configure Nginx**
Create `/etc/nginx/sites-available/ai-course-creator`:
```nginx
upstream backend {
    server localhost:3001;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for long-running requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # File uploads
    client_max_body_size 50M;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/ai-course-creator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: Docker Deployment

**1. Create Docker Compose Configuration**
Create `docker-compose.production.yml`:
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  qdrant:
    image: qdrant/qdrant
    restart: always
    volumes:
      - qdrant_data:/qdrant/storage
    environment:
      - QDRANT__SERVICE__API_KEY=${QDRANT_API_KEY}

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    depends_on:
      - redis
      - qdrant
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - QDRANT_URL=http://qdrant:6333
    env_file:
      - ./backend/.env
    volumes:
      - uploads:/app/uploads

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: npm run worker
    restart: always
    depends_on:
      - redis
      - qdrant
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - QDRANT_URL=http://qdrant:6333
    env_file:
      - ./backend/.env

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    depends_on:
      - backend
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://your-domain.com/api

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

volumes:
  redis_data:
  qdrant_data:
  uploads:
```

**2. Deploy with Docker**
```bash
# Build and start services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Scale workers if needed
docker-compose -f docker-compose.production.yml up -d --scale worker=3
```

### Option 3: Platform-Specific Deployments

#### Vercel (Frontend Only)
1. Connect GitHub repository to Vercel
2. Configure build settings:
   - Framework: Next.js
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/.next`
3. Set environment variables in Vercel dashboard

#### Railway
1. Create new project in Railway
2. Add services:
   - Redis
   - PostgreSQL (instead of Supabase if preferred)
   - Web service for backend
   - Web service for frontend
3. Configure environment variables
4. Deploy using Railway CLI or GitHub integration

#### Heroku
1. Create Heroku app
2. Add buildpacks:
   ```bash
   heroku buildpacks:add heroku/nodejs
   ```
3. Configure Procfile:
   ```
   web: cd backend && npm start
   worker: cd backend && npm run worker
   ```
4. Deploy using Git or GitHub integration

## Post-deployment Verification

### 1. Health Checks

```bash
# Check backend health
curl https://your-domain.com/api/health

# Check frontend
curl https://your-domain.com

# Verify Redis connection
redis-cli ping

# Check PM2 status (if using PM2)
pm2 status
```

### 2. Test Core Functionality

- [ ] User registration and login
- [ ] File upload and processing
- [ ] Course generation
- [ ] Document search
- [ ] Export functionality

### 3. Monitor Logs

```bash
# PM2 logs
pm2 logs

# Docker logs
docker-compose logs -f

# System logs
sudo journalctl -u nginx -f
```

## Monitoring and Maintenance

### 1. Set Up Monitoring

**Application Monitoring:**
- Configure error tracking (e.g., Sentry)
- Set up uptime monitoring (e.g., UptimeRobot)
- Enable application metrics collection

**Server Monitoring:**
```bash
# Install monitoring tools
sudo apt install htop iotop -y

# Monitor resources
htop  # CPU and memory
iotop # Disk I/O
```

### 2. Automated Backups

Create backup script `/opt/backup-ai-course.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backups/ai-course-creator"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database (via Supabase dashboard or API)
# Supabase provides automatic backups

# Backup uploaded files
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/ai-course-creator/uploads

# Backup environment files
tar -czf $BACKUP_DIR/env_$DATE.tar.gz /var/www/ai-course-creator/**/.env

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /opt/backup-ai-course.sh
```

### 3. Updates and Maintenance

**Regular Updates:**
```bash
# Update application
cd /var/www/ai-course-creator
git pull origin main
npm install --production
cd frontend && npm install --production && npm run build
cd ../backend && npm run build

# Restart services
pm2 restart all
```

**Security Updates:**
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# System updates
sudo apt update && sudo apt upgrade -y
```

## Troubleshooting

### Common Issues

**1. Backend won't start**
- Check logs: `pm2 logs ai-course-backend`
- Verify environment variables
- Check Redis connection
- Ensure database migrations ran successfully

**2. File uploads failing**
- Check directory permissions: `ls -la uploads/`
- Verify max file size in Nginx config
- Check available disk space: `df -h`

**3. Course generation timing out**
- Check worker logs: `pm2 logs ai-course-worker`
- Verify AI API keys are valid
- Check Redis queue status
- Increase timeout values if needed

**4. Database connection issues**
- Verify Supabase credentials
- Check network connectivity to Supabase
- Review RLS policies in Supabase dashboard

**5. High memory usage**
- Review PM2 cluster settings
- Check for memory leaks in logs
- Adjust Node.js memory limits:
  ```bash
  NODE_OPTIONS="--max-old-space-size=4096"
  ```

### Debug Commands

```bash
# Check service status
systemctl status nginx
pm2 status

# View error logs
tail -f /var/log/nginx/error.log
pm2 logs --err

# Test database connection
cd backend && npm run test:db

# Check disk usage
df -h
du -sh /var/www/ai-course-creator/*

# Monitor network connections
netstat -tulpn | grep LISTEN
```

### Getting Help

If you encounter issues not covered here:
1. Check application logs for specific error messages
2. Review the [SECURITY.md](./SECURITY.md) guide for security-related issues
3. Consult the [ENVIRONMENT.md](./ENVIRONMENT.md) for environment variable details
4. Open an issue on GitHub with:
   - Error messages
   - Steps to reproduce
   - Environment details
   - Relevant log excerpts

## Next Steps

After successful deployment:
1. Configure monitoring and alerting
2. Set up regular backups
3. Review and implement security best practices from [SECURITY.md](./SECURITY.md)
4. Plan for scaling based on usage patterns
5. Document any custom configurations for your team