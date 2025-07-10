# Document Processor Usage Guide

This guide shows how to use the advanced document processing pipeline with quality assessment and smart chunking.

## Quick Start

The document processor is automatically integrated into the file upload pipeline. When you upload files, they are processed with:

- **Quality Assessment**: Readability, coherence, and error detection
- **Smart Chunking**: Semantic, sentence, paragraph, or fixed-size strategies
- **Language Detection**: Automatic language identification
- **Content Preprocessing**: Encoding normalization and deduplication

## Basic Usage

### 1. Upload and Process Files

Files uploaded through the API are automatically processed:

```bash
# Upload files
curl -X POST "http://localhost:3000/api/upload/files" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@document.pdf" \
  -F "courseId=course-uuid"
```

### 2. Check Processing Status

```javascript
// Check processing status
const response = await fetch('/api/upload/status/job-id');
const status = await response.json();

console.log(status.progress); // 0-100
console.log(status.state);    // 'waiting', 'active', 'completed', 'failed'
```

### 3. View Quality Metrics

```javascript
// Get processed resource with quality metrics
const { data } = await supabase
  .from('course_resources')
  .select('*')
  .eq('id', 'resource-id')
  .single();

console.log('Quality Score:', data.quality_score);
console.log('Readability Level:', data.quality_report.readability.level);
console.log('Coherence Score:', data.quality_report.coherence.score);
console.log('Processing Time:', data.processing_metadata.processingTime);
```

## Advanced Usage

### 1. Manual Document Processing

```javascript
const { DocumentProcessor } = require('./src/services/documentProcessor');

const processor = new DocumentProcessor();

// Process a document manually
const result = await processor.processDocument({
  id: 'doc-id',
  content: 'Your document content here...',
  type: 'text/plain',
  title: 'Document Title'
}, {
  chunkingStrategy: 'semantic' // 'semantic', 'fixed', 'sentence', 'paragraph'
});

console.log('Quality Score:', result.qualityReport.overallScore);
console.log('Chunks Created:', result.chunks.length);
```

### 2. Quality-Based Course Generation

```javascript
const courseGenerator = require('./src/services/courseGenerator');

// Generate course with quality filtering
const course = await courseGenerator.generateCourse({
  courseId: 'course-uuid',
  minQualityScore: 70, // Only use resources with score >= 70
  includeRecommendations: true
});

console.log('Course Quality:', course.qualityAnalysis.qualityLevel);
console.log('Resources Used:', course.resourcesUsed);
console.log('Recommendations:', course.structure.recommendations);
```

### 3. Get Resources by Quality Tier

```javascript
// Get premium quality resources (score >= 85)
const premiumResources = await courseGenerator.getResourcesByQualityTier(
  'course-uuid', 
  'premium'
);

// Get recommended quality resources (score 70-84)
const recommendedResources = await courseGenerator.getResourcesByQualityTier(
  'course-uuid', 
  'recommended'
);
```

## Quality Metrics Explained

### Quality Score (0-100)
- **85-100**: Premium quality, professional-grade content
- **70-84**: Recommended quality for effective learning
- **50-69**: Acceptable quality, may need improvements
- **0-49**: Below threshold, consider replacing or improving

### Quality Report Structure

```javascript
{
  readability: {
    score: 75.2,
    level: "fairly easy",
    metrics: {
      fleschKincaid: 8.5,
      fleschEase: 75.2,
      gunningFog: 9.1
    }
  },
  coherence: {
    score: 82.1,
    interpretation: "highly coherent"
  },
  completeness: {
    score: 95.3,
    coverage: { percentage: 98.5 },
    distribution: { uniformity: 0.85 }
  },
  errors: [
    {
      type: "encoding",
      severity: "medium", 
      message: "Potential encoding issues detected"
    }
  ],
  overallScore: 78.6,
  recommendations: [
    {
      area: "readability",
      priority: "medium",
      suggestion: "Consider simplifying complex sentences"
    }
  ]
}
```

## Chunking Strategies

### 1. Semantic Chunking (Recommended)
- Preserves content coherence
- Maintains topic boundaries
- Variable chunk sizes based on content structure

```javascript
const chunks = await processor.chunkContent(document, 'semantic');
```

### 2. Fixed-Size Chunking
- Consistent token count per chunk
- Good for uniform processing
- Includes overlap for continuity

```javascript
const chunks = await processor.chunkContent(document, 'fixed');
```

### 3. Sentence Boundary Chunking
- Preserves complete sentences
- Good for readability
- Natural breaking points

```javascript
const chunks = await processor.chunkContent(document, 'sentence');
```

### 4. Paragraph-Based Chunking
- Maintains paragraph integrity
- Best for structured documents
- Logical content grouping

```javascript
const chunks = await processor.chunkContent(document, 'paragraph');
```

## Integration Examples

### 1. File Upload with Quality Validation

```javascript
// In your upload route
app.post('/api/upload/files', upload.array('files'), async (req, res) => {
  const files = req.files;
  const results = [];
  
  for (const file of files) {
    // File gets processed automatically
    const result = await fileProcessor.processFile({
      fileId: file.id,
      filePath: file.path,
      fileName: file.originalname,
      fileType: file.mimetype,
      userId: req.user.id,
      courseId: req.body.courseId
    });
    
    // Check quality score
    if (result.qualityScore < 50) {
      console.warn(`Low quality file: ${file.originalname} (score: ${result.qualityScore})`);
    }
    
    results.push(result);
  }
  
  res.json(results);
});
```

### 2. Quality Dashboard

```javascript
// Get quality statistics for a course
const { data: stats } = await supabase
  .from('course_quality_stats')
  .select('*')
  .eq('course_id', courseId)
  .single();

console.log(`
Course Quality Dashboard:
- Total Resources: ${stats.total_resources}
- Premium Quality: ${stats.premium_resources}
- Average Score: ${stats.avg_quality_score}
- Quality Range: ${stats.min_quality_score} - ${stats.max_quality_score}
`);
```

### 3. Content Improvement Suggestions

```javascript
// Get improvement suggestions for low-quality resources
const lowQualityResources = await supabase
  .from('course_resources')
  .select('*')
  .eq('course_id', courseId)
  .lt('quality_score', 70);

for (const resource of lowQualityResources.data) {
  const suggestions = courseGenerator.getQualityImprovementSuggestions(resource);
  console.log(`${resource.title}:`, suggestions);
}
```

## API Endpoints

### Quality Endpoints

```bash
# Get course quality statistics
GET /api/courses/:courseId/quality

# Get resources by quality tier
GET /api/courses/:courseId/resources?quality=premium

# Get quality improvement suggestions
GET /api/resources/:resourceId/suggestions
```

### Processing Endpoints

```bash
# Check processing status
GET /api/upload/status/:jobId

# Reprocess with different strategy
POST /api/resources/:resourceId/reprocess
{
  "chunkingStrategy": "semantic",
  "qualityThreshold": 70
}
```

## Configuration

### Environment Variables

```bash
# Document Processing
REDIS_HOST=localhost           # For async job queue
REDIS_PORT=6379               # Redis port
MAX_CHUNK_SIZE=1000           # Maximum tokens per chunk
MIN_CHUNK_SIZE=100            # Minimum tokens per chunk
OVERLAP_SIZE=50               # Token overlap between chunks

# Quality Thresholds
QUALITY_MINIMUM=50            # Minimum acceptable quality
QUALITY_RECOMMENDED=70        # Recommended quality threshold
QUALITY_PREMIUM=85            # Premium quality threshold
```

### Customizing Quality Thresholds

```javascript
// Update thresholds in database
await supabase
  .from('quality_thresholds')
  .update({ min_score: 75 })
  .eq('name', 'recommended');
```

## Troubleshooting

### Common Issues

1. **Low Quality Scores**
   - Check for encoding issues in source documents
   - Ensure content is in readable format
   - Remove duplicate or irrelevant content

2. **Processing Failures**
   - Verify Redis is running for async processing
   - Check file formats are supported
   - Ensure sufficient disk space for temporary files

3. **Language Detection Issues**
   - Provide longer text samples for better detection
   - Manually specify language if auto-detection fails

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev
```

### Testing

```bash
# Test document processor
npm run test:document-processor

# Test file upload integration
npm run test:upload
```

## Best Practices

1. **Quality Standards**
   - Set minimum quality threshold based on course requirements
   - Regularly review and improve low-quality content
   - Use quality metrics to guide content creation

2. **Chunking Strategy**
   - Use semantic chunking for most content
   - Use fixed-size for uniform processing requirements
   - Consider document type when choosing strategy

3. **Performance**
   - Process files asynchronously for large uploads
   - Monitor queue performance and adjust batch sizes
   - Cache processing results to avoid reprocessing

4. **Monitoring**
   - Track quality score distributions
   - Monitor processing times and failures
   - Set up alerts for consistently low-quality uploads

## Next Steps

- Implement custom quality scoring algorithms
- Add support for additional file formats
- Create quality-based content recommendations
- Integrate with LLM-based content improvement