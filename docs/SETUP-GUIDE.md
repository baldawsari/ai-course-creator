# AI Course Creator - Quick Setup Guide

This guide will help you get the AI Course Creator application running on your local machine.

## Current Status

The application is **NOT READY TO USE** out of the box. Several critical services and configurations need to be set up first.

## Prerequisites

Before starting, ensure you have:
- Node.js 18.x or higher
- npm 9.x or higher
- macOS/Linux (for local Redis) or Docker
- Credit card (for paid services like Anthropic)

## Quick Setup Steps

### Phase 1: Local Services Setup (15 minutes)

#### 1. Install and Start Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**Using Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

#### 2. Create Frontend Environment File

```bash
cd frontend
cp .env.local.example .env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
NEXT_PUBLIC_APP_NAME=AI Course Creator
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Phase 2: External Services Setup (30 minutes)

#### 1. Supabase Setup (Database & Auth)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project:
   - Choose a region close to you
   - Set a strong database password
   - Wait for project to initialize (~2 minutes)
3. Get your credentials:
   - Go to Settings → API
   - Copy: Project URL, anon/public key, service_role key

#### 2. Anthropic Claude API (AI Generation)

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Add payment method (required)
3. Go to API Keys section
4. Create new API key and copy it

#### 3. Jina AI API (Embeddings)

1. Sign up at [jina.ai](https://jina.ai)
2. Go to Dashboard → API Keys
3. Create new key (free tier available)
4. Copy the API key

#### 4. Update Backend Configuration

Edit `backend/.env` with your actual values:
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here

# AI Services
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
JINA_API_KEY=jina_xxxxx

# Security (generate a random string)
JWT_SECRET=your-random-32-char-string-here
```

Generate JWT secret:
```bash
openssl rand -base64 32
```

### Phase 3: Database & Application Setup (20 minutes)

#### 1. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

#### 2. Run Database Migrations

```bash
cd backend
npm run migration:run
```

#### 3. Start All Services

Open 3 terminal windows:

**Terminal 1 - Backend API:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Background Worker:**
```bash
cd backend
npm run worker
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

### Phase 4: Verification

1. Open http://localhost:3000 in your browser
2. Try to register a new account
3. Upload a test document (PDF or DOCX)
4. Create a test course

## Common Issues & Solutions

### Issue: "Cannot connect to Redis"
**Solution:** Ensure Redis is running: `redis-cli ping` should return `PONG`

### Issue: "Supabase connection failed"
**Solution:** 
- Verify your Supabase URL and keys are correct
- Check if your Supabase project is active
- Ensure no extra spaces in environment variables

### Issue: "Frontend shows API errors"
**Solution:**
- Verify backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
- Look for CORS errors in browser console

### Issue: "File upload fails"
**Solution:**
- Ensure the worker process is running
- Check Redis connection
- Verify file size is under 50MB

### Issue: "Course generation fails"
**Solution:**
- Verify Anthropic API key is valid and has credits
- Check Jina AI key is active
- Ensure Qdrant is running (port 6333)

## Service Status Checklist

Run these commands to verify all services:

```bash
# Check Redis
redis-cli ping

# Check Backend API
curl http://localhost:3001/health

# Check Frontend
curl http://localhost:3000

# Check Qdrant
curl http://localhost:6333/collections

# Check ports
lsof -i :3000,3001,6333,6379
```

## Next Steps

Once everything is running:

1. **Development:** 
   - Backend API: http://localhost:3001
   - Frontend: http://localhost:3000
   - API Documentation: See `docs/API.md`

2. **Testing:**
   - Run backend tests: `cd backend && npm test`
   - Run frontend tests: `cd frontend && npm test`

3. **Production Deployment:**
   - See `docs/DEPLOYMENT.md` for production setup
   - Configure proper SSL certificates
   - Set up monitoring and backups

## Environment Variables Reference

For a complete list of all environment variables and their descriptions, see:
- `docs/ENVIRONMENT.md` - Comprehensive environment variable documentation
- `backend/.env.example` - Backend example configuration
- `frontend/.env.local.example` - Frontend example configuration

## Need Help?

1. Check the logs in each terminal for specific errors
2. Ensure all required environment variables are set
3. Verify external service credentials are valid
4. Check that all ports are available (3000, 3001, 6333, 6379)

Remember: The app will not work properly until ALL services are configured and running!