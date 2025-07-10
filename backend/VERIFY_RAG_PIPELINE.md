# RAG Pipeline Verification Guide

This guide will help you verify the RAG pipeline with sample documents and set up Qdrant with proper authentication.

## 1. Getting Qdrant API Key

### Option A: Local Qdrant (Development)
For local development, you don't need an API key:

```bash
# Run Qdrant locally with Docker
docker run -p 6333:6333 -p 6334:6334 \
    -v $(pwd)/qdrant_storage:/qdrant/storage:z \
    qdrant/qdrant

# Your .env configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
```

### Option B: Qdrant Cloud (Production)
1. Sign up at [cloud.qdrant.io](https://cloud.qdrant.io)
2. Create a new cluster
3. Get your API key from the cluster dashboard
4. Update your .env:

```bash
QDRANT_URL=https://xyz-example.eu-central.aws.cloud.qdrant.io
QDRANT_API_KEY=your-api-key-here
```

### Option C: Self-Hosted Qdrant with Authentication
```bash
# docker-compose.yml
version: '3.4'
services:
  qdrant:
    image: qdrant/qdrant:latest
    restart: always
    container_name: qdrant
    ports:
      - 6333:6333
      - 6334:6334
    expose:
      - 6333
      - 6334
      - 6335
    configs:
      - source: qdrant_config
        target: /qdrant/config/production.yaml
    volumes:
      - ./qdrant_data:/qdrant/storage

configs:
  qdrant_config:
    content: |
      service:
        api_key: ${QDRANT_API_KEY}
```

## 2. Environment Setup

Create or update your `.env` file:

```bash
# Required for RAG Pipeline
JINA_API_KEY=your-jina-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION_NAME=course_documents
QDRANT_VECTOR_SIZE=1024
QDRANT_MAX_BATCH_SIZE=100
QDRANT_ENABLE_QUANTIZATION=false

# Document Processing
MAX_CHUNK_SIZE=1000
MIN_CHUNK_SIZE=100
OVERLAP_SIZE=50
QUALITY_MINIMUM=50
QUALITY_RECOMMENDED=70
QUALITY_PREMIUM=85
```

## 3. Verify Installation

```bash
# Install dependencies
npm install

# Run database migrations
npm run migration:run

# Test Qdrant connection
npm run test:vector-service
```

## 4. Sample Document Verification Script

Create `verify-rag-pipeline.js`:

```javascript
const { ragPipeline } = require('./src/services/ragPipeline');
const { vectorService } = require('./src/services/vectorService');
const { documentProcessor } = require('./src/services/documentProcessor');
const fs = require('fs').promises;
const path = require('path');

async function verifySampleDocuments() {
  console.log('🚀 Starting RAG Pipeline Verification...\n');

  try {
    // Step 1: Check services health
    console.log('1️⃣ Checking service health...');
    const ragHealth = await ragPipeline.healthCheck();
    const vectorHealth = await vectorService.healthCheck();
    
    console.log('RAG Pipeline:', ragHealth.status);
    console.log('Vector Service:', vectorHealth.healthy ? 'healthy' : 'unhealthy');
    
    if (!vectorHealth.healthy) {
      throw new Error('Vector service is not healthy. Check Qdrant connection.');
    }

    // Step 2: Create test collection
    const collectionName = `test_rag_${Date.now()}`;
    console.log(`\n2️⃣ Creating collection: ${collectionName}`);
    
    await vectorService.createCollection(collectionName, {
      vectorSize: 1024,
      distance: 'Cosine'
    });

    // Step 3: Prepare sample documents
    console.log('\n3️⃣ Preparing sample documents...');
    const sampleDocuments = [
      {
        text: `Introduction to Machine Learning
        
        Machine learning is a subset of artificial intelligence (AI) that provides systems the ability to automatically learn and improve from experience without being explicitly programmed. Machine learning focuses on the development of computer programs that can access data and use it to learn for themselves.
        
        The process of learning begins with observations or data, such as examples, direct experience, or instruction, in order to look for patterns in data and make better decisions in the future based on the examples that we provide. The primary aim is to allow the computers to learn automatically without human intervention or assistance and adjust actions accordingly.
        
        Machine learning algorithms are often categorized as supervised or unsupervised. Supervised learning algorithms can apply what has been learned in the past to new data using labeled examples to predict future events. Unsupervised learning algorithms are used when the information used to train is neither classified nor labeled.`,
        metadata: {
          title: 'Introduction to Machine Learning',
          resource_id: 'doc_001',
          quality_score: 85,
          language: 'en',
          category: 'AI/ML'
        }
      },
      {
        text: `Deep Learning Fundamentals
        
        Deep learning is part of a broader family of machine learning methods based on artificial neural networks with representation learning. Learning can be supervised, semi-supervised or unsupervised.
        
        Deep-learning architectures such as deep neural networks, deep belief networks, recurrent neural networks and convolutional neural networks have been applied to fields including computer vision, machine vision, speech recognition, natural language processing, audio recognition, social network filtering, machine translation, bioinformatics, drug design, medical image analysis, material inspection and board game programs, where they have produced results comparable to and in some cases surpassing human expert performance.
        
        Artificial neural networks (ANNs) were inspired by information processing and distributed communication nodes in biological systems. ANNs have various differences from biological brains. Specifically, neural networks tend to be static and symbolic, while the biological brain of most living organisms is dynamic (plastic) and analog.`,
        metadata: {
          title: 'Deep Learning Fundamentals',
          resource_id: 'doc_002',
          quality_score: 92,
          language: 'en',
          category: 'AI/ML'
        }
      },
      {
        text: `Natural Language Processing Overview
        
        Natural language processing (NLP) is a subfield of linguistics, computer science, and artificial intelligence concerned with the interactions between computers and human language, in particular how to program computers to process and analyze large amounts of natural language data.
        
        The goal is a computer capable of understanding the contents of documents, including the contextual nuances of the language within them. The technology can then accurately extract information and insights contained in the documents as well as categorize and organize the documents themselves.
        
        Challenges in natural language processing frequently involve speech recognition, natural language understanding, and natural language generation. Recent advances in deep learning have dramatically improved the performance of NLP systems across many tasks.`,
        metadata: {
          title: 'Natural Language Processing',
          resource_id: 'doc_003',
          quality_score: 78,
          language: 'en',
          category: 'AI/ML'
        }
      }
    ];

    // Step 4: Process documents
    console.log('\n4️⃣ Processing documents with quality assessment...');
    for (const doc of sampleDocuments) {
      const processed = await documentProcessor.processDocument(
        doc.text,
        doc.metadata
      );
      console.log(`- ${doc.metadata.title}: Quality ${processed.qualityScore}/100`);
    }

    // Step 5: Ingest documents into RAG pipeline
    console.log('\n5️⃣ Ingesting documents into RAG pipeline...');
    const ingestionResult = await ragPipeline.ingestDocuments(
      sampleDocuments,
      'test_course_001',
      {
        qualityThreshold: 70,
        chunkStrategy: 'semantic'
      }
    );

    console.log(`✅ Ingested ${ingestionResult.success.length} documents`);
    console.log(`📊 Total chunks created: ${ingestionResult.totalChunks}`);
    console.log(`⭐ Average quality: ${ingestionResult.averageQuality.toFixed(2)}`);

    // Step 6: Test retrieval with different queries
    console.log('\n6️⃣ Testing retrieval with sample queries...');
    
    const queries = [
      'What is machine learning?',
      'How do neural networks work?',
      'Explain natural language processing',
      'What are the types of machine learning algorithms?'
    ];

    for (const query of queries) {
      console.log(`\n🔍 Query: "${query}"`);
      
      // Test hybrid search
      const results = await ragPipeline.retrieveRelevantContent(query, {
        topK: 3,
        enableReranking: true,
        minQuality: 70
      });

      console.log(`Found ${results.results.length} relevant chunks:`);
      results.results.forEach((result, idx) => {
        console.log(`  ${idx + 1}. Score: ${result.score?.toFixed(3)} | Quality: ${result.metadata.quality_score} | From: ${result.metadata.title}`);
        console.log(`     Preview: ${result.text.substring(0, 100)}...`);
      });
    }

    // Step 7: Test vector service directly
    console.log('\n7️⃣ Testing vector service search...');
    
    // Generate a query embedding
    const queryEmbedding = await ragPipeline.generateQueryEmbedding('machine learning algorithms');
    
    // Search similar vectors
    const vectorResults = await vectorService.searchSimilar(
      collectionName,
      queryEmbedding,
      {
        courseId: 'test_course_001',
        minQuality: 70
      },
      5
    );

    console.log(`\nVector search found ${vectorResults.results.length} results`);

    // Step 8: Test filtering
    console.log('\n8️⃣ Testing advanced filtering...');
    
    const filteredResults = await vectorService.searchSimilar(
      collectionName,
      queryEmbedding,
      {
        custom: [{
          key: 'category',
          match: { value: 'AI/ML' }
        }],
        minQuality: 80
      },
      3
    );

    console.log(`Filtered search found ${filteredResults.results.length} high-quality AI/ML results`);

    // Step 9: Get collection statistics
    console.log('\n9️⃣ Collection statistics:');
    const collectionInfo = await vectorService.getCollectionInfo(collectionName);
    console.log(`- Total vectors: ${collectionInfo.vectorCount}`);
    console.log(`- Status: ${collectionInfo.status}`);
    console.log(`- Indexed vectors: ${collectionInfo.indexedVectorsCount}`);

    console.log('\n✅ RAG Pipeline verification completed successfully!');
    console.log(`📝 Test collection: ${collectionName}`);
    console.log('💡 You can now use this collection for further testing or delete it.');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run verification
verifySampleDocuments();
```

## 5. Run Verification

```bash
# Make sure Qdrant is running (local or cloud)
# Then run the verification script
node verify-rag-pipeline.js
```

## 6. Expected Output

You should see output similar to:

```
🚀 Starting RAG Pipeline Verification...

1️⃣ Checking service health...
RAG Pipeline: healthy
Vector Service: healthy

2️⃣ Creating collection: test_rag_1703456789

3️⃣ Preparing sample documents...

4️⃣ Processing documents with quality assessment...
- Introduction to Machine Learning: Quality 85/100
- Deep Learning Fundamentals: Quality 92/100
- Natural Language Processing: Quality 78/100

5️⃣ Ingesting documents into RAG pipeline...
✅ Ingested 3 documents
📊 Total chunks created: 12
⭐ Average quality: 85.00

6️⃣ Testing retrieval with sample queries...

🔍 Query: "What is machine learning?"
Found 3 relevant chunks:
  1. Score: 0.892 | Quality: 85 | From: Introduction to Machine Learning
     Preview: Machine learning is a subset of artificial intelligence (AI) that provides systems the ability to...
  2. Score: 0.756 | Quality: 92 | From: Deep Learning Fundamentals
     Preview: Deep learning is part of a broader family of machine learning methods based on artificial neural...
  3. Score: 0.623 | Quality: 78 | From: Natural Language Processing
     Preview: Natural language processing (NLP) is a subfield of linguistics, computer science, and artificial...

[Additional query results...]

7️⃣ Testing vector service search...
Vector search found 5 results

8️⃣ Testing advanced filtering...
Filtered search found 2 high-quality AI/ML results

9️⃣ Collection statistics:
- Total vectors: 12
- Status: green
- Indexed vectors: 12

✅ RAG Pipeline verification completed successfully!
📝 Test collection: test_rag_1703456789
💡 You can now use this collection for further testing or delete it.
```

## 7. Troubleshooting

### Common Issues:

1. **Connection refused to Qdrant**
   - Ensure Qdrant is running: `docker ps | grep qdrant`
   - Check URL in .env file
   - Verify port 6333 is not blocked

2. **Jina API errors**
   - Verify your JINA_API_KEY is valid
   - Check API limits/quotas
   - Ensure internet connectivity

3. **Vector dimension mismatch**
   - Jina embeddings v4 uses 1024 dimensions by default
   - Ensure QDRANT_VECTOR_SIZE=1024 in .env

4. **Quality threshold filtering**
   - Lower quality threshold if documents are being rejected
   - Check document processing logs for quality scores

## 8. Performance Testing

For production verification with larger datasets:

```javascript
// generate-test-data.js
const fs = require('fs').promises;

async function generateTestDocuments(count = 1000) {
  const documents = [];
  const topics = ['AI', 'ML', 'NLP', 'CV', 'RL'];
  
  for (let i = 0; i < count; i++) {
    documents.push({
      text: `Document ${i}: ${generateRandomText(500)}`,
      metadata: {
        title: `Test Document ${i}`,
        resource_id: `doc_${i}`,
        quality_score: 50 + Math.random() * 50,
        language: 'en',
        category: topics[i % topics.length]
      }
    });
  }
  
  await fs.writeFile(
    'test-documents.json',
    JSON.stringify(documents, null, 2)
  );
  
  console.log(`Generated ${count} test documents`);
}

function generateRandomText(words) {
  const vocabulary = ['machine', 'learning', 'algorithm', 'data', 'model', 
                      'training', 'neural', 'network', 'deep', 'artificial',
                      'intelligence', 'pattern', 'recognition', 'classification',
                      'regression', 'clustering', 'supervised', 'unsupervised'];
  
  let text = '';
  for (let i = 0; i < words; i++) {
    text += vocabulary[Math.floor(Math.random() * vocabulary.length)] + ' ';
  }
  return text.trim();
}

generateTestDocuments(1000);
```

## 9. Next Steps

After successful verification:

1. **Production Setup**
   - Use Qdrant Cloud for production
   - Enable authentication and TLS
   - Configure proper resource limits

2. **Performance Optimization**
   - Enable quantization for large datasets
   - Tune HNSW parameters
   - Implement caching strategies

3. **Monitoring**
   - Set up health check endpoints
   - Monitor vector operation metrics
   - Track quality scores and retrieval performance

4. **Integration**
   - Connect to course generation pipeline
   - Implement user-specific collections
   - Add real-time indexing for new documents