# AI Course Creator Backend Setup Guide

## Prerequisites

1. **Node.js 18+** and npm
2. **Supabase Project** - Create one at [supabase.com](https://supabase.com)
3. **Redis** - For rate limiting (can use Docker)
4. **Qdrant** - Vector database (optional for initial testing)

## Step 1: Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update `.env` with your credentials:

### Required Supabase Configuration:
```env
# Get these from your Supabase project settings
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### Required API Keys:
```env
# Get from Anthropic Console
ANTHROPIC_API_KEY=your-anthropic-api-key

# Get from Jina AI
JINA_API_KEY=your-jina-api-key
```

### JWT Secret:
```env
# Generate a secure random string
JWT_SECRET=your-super-secret-jwt-key
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Database Setup

1. **Run the database migrations:**
```bash
npm run migration:run
```

This will create:
- All required tables
- Row Level Security policies
- Storage buckets
- Indexes and functions

2. **Verify migrations:**
```bash
npm run test:db
```

## Step 4: Redis Setup (for Rate Limiting)

### Option 1: Using Docker
```bash
docker run -d -p 6379:6379 redis:alpine
```

### Option 2: Using Homebrew (macOS)
```bash
brew install redis
brew services start redis
```

### Option 3: Using apt (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

## Step 5: Run Tests

1. **Test Database Connectivity:**
```bash
npm run test:db
```

Expected output:
- ✅ Environment variables are set
- ✅ Database health check passed
- ✅ Basic query executed successfully
- ✅ Storage buckets configured

2. **Test Authentication System:**
```bash
npm run test:auth
```

Expected output:
- ✅ Test user created/authenticated
- ✅ JWT verification working
- ✅ API key system functional
- ✅ Role permissions configured

## Step 6: Start the Development Server

```bash
npm run dev
```

The server will start on http://localhost:3000

## Step 7: Verify API Endpoints

1. **Health Check:**
```bash
curl http://localhost:3000/health
```

2. **API Documentation:**
```bash
curl http://localhost:3000/api
```

## Common Issues and Solutions

### Issue: "relation does not exist" errors
**Solution:** Run migrations first: `npm run migration:run`

### Issue: Redis connection failed
**Solution:** Ensure Redis is running: `redis-cli ping` should return "PONG"

### Issue: JWT verification fails
**Solution:** Check that your Supabase JWT secret matches the one in your project settings

### Issue: Rate limiting not working
**Solution:** Verify Redis connection and that `REDIS_HOST` and `REDIS_PORT` are correct

## Optional: Qdrant Setup

For vector search functionality:

1. **Using Docker:**
```bash
docker run -p 6333:6333 qdrant/qdrant
```

2. **Update .env:**
```env
QDRANT_URL=http://localhost:6333
```

## Next Steps

1. **Create your first user** through Supabase Auth UI or API
2. **Assign user role** (admin/instructor/student) in the user_profiles table
3. **Start building courses!**

## Development Scripts

```bash
# Run development server with hot reload
npm run dev

# Run production build
npm run build
npm start

# Run tests
npm test

# Check TypeScript types
npm run typecheck

# Lint code
npm run lint

# Format code
npm run format
```

## Production Deployment

See the `Dockerfile` for containerized deployment or use:

```bash
npm run build
NODE_ENV=production npm start
```

## Need Help?

1. Check the logs in your terminal
2. Verify all environment variables are set correctly
3. Ensure all services (Supabase, Redis) are running
4. Check the migration status with `npm run test:db`

Happy coding! 🚀