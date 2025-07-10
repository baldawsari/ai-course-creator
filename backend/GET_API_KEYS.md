# Getting API Keys for RAG Pipeline

## 1. Jina AI API Key (Required for Embeddings & Reranking)

### Sign up for Jina AI:
1. Visit [jina.ai](https://jina.ai)
2. Click "Sign Up" or "Get Started"
3. Create an account (free tier available)
4. Go to [cloud.jina.ai](https://cloud.jina.ai)
5. Navigate to "API Keys" section
6. Create a new API key
7. Copy the key and add to your `.env`:
   ```
   JINA_API_KEY=jina_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Free Tier Limits:
- 1 million tokens for embeddings per month
- 100k reranking requests per month
- Rate limit: 500 requests per minute

## 2. Qdrant Setup Options

### Option A: Local Qdrant (No API Key Required)
```bash
# Using Docker (Recommended)
docker run -p 6333:6333 -p 6334:6334 \
    -v $(pwd)/qdrant_storage:/qdrant/storage:z \
    qdrant/qdrant

# Your .env settings:
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
```

### Option B: Qdrant Cloud (Free Tier Available)
1. Visit [cloud.qdrant.io](https://cloud.qdrant.io)
2. Sign up for free account
3. Create a new cluster:
   - Choose region (closest to you)
   - Select "Free" tier (1GB RAM, 0.5 vCPU)
   - Name your cluster
4. Once created, get your credentials:
   - Cluster URL: `https://xyz-example.eu-central.aws.cloud.qdrant.io`
   - API Key: Click "API Keys" → "Create API Key"
5. Update your `.env`:
   ```
   QDRANT_URL=https://xyz-example.eu-central.aws.cloud.qdrant.io
   QDRANT_API_KEY=your-qdrant-api-key
   ```

### Free Tier Limits:
- 1GB RAM
- 0.5 vCPU
- 4GB storage
- Perfect for development and small projects

## 3. Quick Setup Script

Create `setup-api-keys.js`:

```javascript
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function setupApiKeys() {
  console.log('🔑 RAG Pipeline API Key Setup\n');
  
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  
  // Read existing .env if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Jina API Key
  console.log('1. Jina AI API Key');
  console.log('   Get it from: https://cloud.jina.ai');
  const jinaKey = await question('   Enter your Jina API Key: ');
  
  // Qdrant Setup
  console.log('\n2. Qdrant Setup');
  console.log('   a) Local (no key needed)');
  console.log('   b) Qdrant Cloud');
  const qdrantChoice = await question('   Choose (a/b): ');
  
  let qdrantUrl = 'http://localhost:6333';
  let qdrantKey = '';
  
  if (qdrantChoice.toLowerCase() === 'b') {
    console.log('   Get credentials from: https://cloud.qdrant.io');
    qdrantUrl = await question('   Enter Qdrant URL: ');
    qdrantKey = await question('   Enter Qdrant API Key: ');
  }
  
  // Update .env content
  const updates = {
    JINA_API_KEY: jinaKey,
    QDRANT_URL: qdrantUrl,
    QDRANT_API_KEY: qdrantKey
  };
  
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }
  
  // Write .env file
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  
  console.log('\n✅ API keys configured in .env file');
  console.log('\nNext steps:');
  console.log('1. Run: npm install');
  console.log('2. Run: node verify-rag-pipeline.js');
  
  rl.close();
}

setupApiKeys().catch(console.error);
```

Run with: `node setup-api-keys.js`

## 4. Verify Your Setup

After setting up your API keys:

```bash
# 1. Install dependencies
npm install

# 2. Run quick verification
node verify-rag-pipeline.js

# 3. Run comprehensive tests
npm run test:vector-service
```

## 5. Environment Variables Reference

Complete `.env` template:

```bash
# AI Services (Required)
JINA_API_KEY=jina_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION_NAME=course_documents
QDRANT_VECTOR_SIZE=1024
QDRANT_DISTANCE=Cosine
QDRANT_MAX_BATCH_SIZE=100
QDRANT_MAX_CONCURRENT_BATCHES=5
QDRANT_ENABLE_QUANTIZATION=false

# Document Processing
MAX_CHUNK_SIZE=1000
MIN_CHUNK_SIZE=100
OVERLAP_SIZE=50
QUALITY_MINIMUM=50
QUALITY_RECOMMENDED=70
QUALITY_PREMIUM=85

# Other required variables...
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key
JWT_SECRET=your-jwt-secret
```

## 6. Troubleshooting

### Jina AI Issues:
- **401 Unauthorized**: Check API key is correct
- **429 Too Many Requests**: You've hit rate limits
- **Network Error**: Check internet connection

### Qdrant Issues:
- **Connection Refused**: Make sure Qdrant is running
- **401 Unauthorized**: Check API key for cloud instances
- **Vector Dimension Mismatch**: Ensure QDRANT_VECTOR_SIZE=1024

### Quick Diagnostics:
```bash
# Test Jina API
curl -X POST https://api.jina.ai/v1/embeddings \
  -H "Authorization: Bearer YOUR_JINA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": ["test"], "model": "jina-embeddings-v4"}'

# Test Qdrant (local)
curl http://localhost:6333/collections

# Test Qdrant (cloud)
curl https://your-cluster.qdrant.io/collections \
  -H "api-key: YOUR_QDRANT_API_KEY"
```

## 7. Cost Considerations

### Free Tier Limits:
- **Jina AI**: 1M embedding tokens/month, 100k reranks/month
- **Qdrant Cloud**: 1GB RAM, 4GB storage
- **Total Cost**: $0 for development/small projects

### When to Upgrade:
- Processing >1000 documents/day
- Need >4GB vector storage
- Require higher rate limits
- Production deployment

### Cost Optimization Tips:
- Enable quantization for large datasets
- Use batch operations
- Cache frequently accessed embeddings
- Implement smart chunking strategies