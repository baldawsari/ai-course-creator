#!/usr/bin/env node

/**
 * Complete End-to-End Workflow Test for AI Course Creator
 * 
 * This script tests the entire pipeline:
 * 1. Authentication and setup
 * 2. File upload and processing
 * 3. Document quality assessment
 * 4. Course creation and management
 * 5. RAG pipeline and content analysis
 * 6. Course generation with Claude AI
 * 7. HTML export with templates
 * 8. Cleanup and verification
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

// Configuration
const CONFIG = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
  testTimeout: 300000, // 5 minutes
  pollingInterval: 2000, // 2 seconds
  testData: {
    course: {
      title: 'Test Course: Introduction to Machine Learning',
      description: 'A comprehensive test course covering machine learning fundamentals',
      level: 'intermediate',
      duration: '6 weeks',
      target_audience: 'Software developers and data scientists',
      prerequisites: ['Basic programming knowledge', 'Mathematics fundamentals'],
      objectives: [
        'Understand machine learning concepts',
        'Implement basic ML algorithms',
        'Evaluate model performance',
        'Deploy ML models in production'
      ],
      tags: ['machine-learning', 'data-science', 'python']
    },
    session: {
      title: 'Introduction to Neural Networks',
      description: 'Overview of neural network architecture and training',
      duration_minutes: 90,
      objectives: ['Understand neural network basics', 'Implement a simple neural network']
    }
  }
};

// Test state
const testState = {
  authToken: null,
  userId: null,
  courseId: null,
  resourceIds: [],
  sessionIds: [],
  generationJobId: null,
  exportJobId: null,
  startTime: Date.now()
};

// Utility functions
const log = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  const elapsed = ((Date.now() - testState.startTime) / 1000).toFixed(1);
  console.log(`[${timestamp}] [${elapsed}s] [${level}] ${message}`);
};

const apiRequest = async (method, endpoint, data = null, headers = {}) => {
  const url = `${CONFIG.baseUrl}${endpoint}`;
  const config = {
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    timeout: 30000
  };

  if (testState.authToken) {
    config.headers.Authorization = `Bearer ${testState.authToken}`;
  }

  if (data) {
    if (data instanceof FormData) {
      config.data = data;
      delete config.headers['Content-Type'];
    } else {
      config.data = data;
    }
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    log(`API Error: ${error.message}`, 'ERROR');
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data, null, 2)}`, 'ERROR');
    }
    throw error;
  }
};

const waitForJob = async (jobType, jobId, statusEndpoint) => {
  log(`Waiting for ${jobType} job ${jobId} to complete...`);
  
  const startTime = Date.now();
  const timeout = CONFIG.testTimeout;
  
  while (Date.now() - startTime < timeout) {
    try {
      const status = await apiRequest('GET', statusEndpoint);
      log(`${jobType} progress: ${status.progress || 0}% - ${status.message || status.status}`);
      
      if (status.status === 'completed') {
        log(`${jobType} job completed successfully`, 'SUCCESS');
        return status;
      }
      
      if (status.status === 'failed') {
        throw new Error(`${jobType} job failed: ${status.message || 'Unknown error'}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, CONFIG.pollingInterval));
    } catch (error) {
      log(`Error checking ${jobType} status: ${error.message}`, 'ERROR');
      throw error;
    }
  }
  
  throw new Error(`${jobType} job timed out after ${timeout / 1000} seconds`);
};

const createTestFile = async (filename, content) => {
  const filePath = path.join(__dirname, 'temp', filename);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
  return filePath;
};

const cleanup = async () => {
  log('Starting cleanup...');
  
  try {
    // Clean up test files
    const tempDir = path.join(__dirname, 'temp');
    try {
      await fs.rmdir(tempDir, { recursive: true });
      log('Temporary files cleaned up');
    } catch (error) {
      log(`Failed to clean up temp files: ${error.message}`, 'WARN');
    }
    
    // Clean up course if created
    if (testState.courseId) {
      try {
        await apiRequest('DELETE', `/courses/${testState.courseId}`);
        log(`Course ${testState.courseId} deleted`);
      } catch (error) {
        log(`Failed to delete course: ${error.message}`, 'WARN');
      }
    }
    
    log('Cleanup completed');
  } catch (error) {
    log(`Cleanup error: ${error.message}`, 'ERROR');
  }
};

// Test functions
const testAuthentication = async () => {
  log('Testing authentication...');
  
  // For testing, we'll create a mock JWT token or use existing auth
  // In production, this would involve actual login
  const mockToken = process.env.TEST_JWT_TOKEN;
  
  if (!mockToken) {
    throw new Error('TEST_JWT_TOKEN environment variable required for testing');
  }
  
  testState.authToken = mockToken;
  testState.userId = 'test-user-id'; // This should be extracted from token in real scenario
  
  log('Authentication successful', 'SUCCESS');
};

const testFileUpload = async () => {
  log('Testing file upload and processing...');
  
  // Create test files
  const testFiles = [
    {
      name: 'ml-fundamentals.txt',
      content: `Machine Learning Fundamentals
      
Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed. This comprehensive guide covers the essential concepts and techniques that form the foundation of modern machine learning.

Key Concepts:
1. Supervised Learning: Learning with labeled examples
2. Unsupervised Learning: Finding patterns in unlabeled data  
3. Reinforcement Learning: Learning through interaction and feedback
4. Feature Engineering: Selecting and transforming input variables
5. Model Evaluation: Assessing performance and generalization

Supervised Learning Algorithms:
- Linear Regression: Predicting continuous values
- Logistic Regression: Binary and multiclass classification
- Decision Trees: Rule-based learning with interpretable models
- Random Forest: Ensemble method combining multiple trees
- Support Vector Machines: Finding optimal decision boundaries
- Neural Networks: Deep learning with multiple layers

Unsupervised Learning Techniques:
- K-Means Clustering: Grouping similar data points
- Hierarchical Clustering: Creating cluster hierarchies
- Principal Component Analysis: Dimensionality reduction
- Association Rules: Finding relationships in data

Model Training Process:
1. Data Collection and Preparation
2. Feature Selection and Engineering
3. Algorithm Selection and Tuning
4. Training and Validation
5. Testing and Evaluation
6. Deployment and Monitoring

Performance Metrics:
- Classification: Accuracy, Precision, Recall, F1-Score, ROC-AUC
- Regression: Mean Squared Error, Mean Absolute Error, R-squared
- Cross-validation: K-fold validation for robust evaluation

Best Practices:
- Start with simple models before complex ones
- Always validate on unseen data
- Address overfitting with regularization
- Consider computational complexity and scalability
- Document your process and results thoroughly

This foundation provides the essential knowledge needed to begin your journey in machine learning and data science.`
    },
    {
      name: 'neural-networks.txt',
      content: `Neural Networks Deep Dive

Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes (neurons) that process information through weighted connections and activation functions.

Architecture Components:
1. Input Layer: Receives raw data
2. Hidden Layers: Process and transform information
3. Output Layer: Produces final predictions
4. Weights and Biases: Learnable parameters
5. Activation Functions: Introduce non-linearity

Common Activation Functions:
- ReLU (Rectified Linear Unit): f(x) = max(0, x)
- Sigmoid: f(x) = 1 / (1 + e^(-x))
- Tanh: f(x) = (e^x - e^(-x)) / (e^x + e^(-x))
- Softmax: Used for multiclass classification

Training Process:
1. Forward Propagation: Input flows through network
2. Loss Calculation: Compare prediction to actual
3. Backpropagation: Calculate gradients
4. Weight Update: Adjust parameters using optimization

Optimization Algorithms:
- Gradient Descent: Basic optimization method
- Stochastic Gradient Descent (SGD): Uses mini-batches
- Adam: Adaptive learning rate method
- RMSprop: Root mean square propagation

Deep Learning Architectures:
- Convolutional Neural Networks (CNNs): For image processing
- Recurrent Neural Networks (RNNs): For sequential data
- Long Short-Term Memory (LSTM): Advanced RNN variant
- Transformer Networks: Attention-based architecture

Regularization Techniques:
- Dropout: Randomly disable neurons during training
- Batch Normalization: Normalize layer inputs
- L1/L2 Regularization: Add penalty terms to loss
- Early Stopping: Stop training when validation loss increases

Practical Implementation:
- Framework Selection: TensorFlow, PyTorch, Keras
- Hardware Considerations: GPU acceleration
- Data Preprocessing: Normalization and augmentation
- Hyperparameter Tuning: Grid search and random search

Applications:
- Image Recognition and Computer Vision
- Natural Language Processing
- Speech Recognition
- Game Playing (AlphaGo, Chess)
- Autonomous Vehicles
- Medical Diagnosis

This comprehensive overview provides the foundation for understanding and implementing neural networks in real-world applications.`
    }
  ];
  
  for (const testFile of testFiles) {
    log(`Creating and uploading ${testFile.name}...`);
    
    // Create test file
    const filePath = await createTestFile(testFile.name, testFile.content);
    
    // Upload file
    const formData = new FormData();
    const fileBuffer = await fs.readFile(filePath);
    formData.append('files', fileBuffer, testFile.name);
    
    const uploadResponse = await apiRequest('POST', '/upload/files', formData);
    log(`Upload response: ${JSON.stringify(uploadResponse, null, 2)}`);
    
    if (uploadResponse.jobIds && uploadResponse.jobIds.length > 0) {
      // Wait for processing to complete
      for (const jobId of uploadResponse.jobIds) {
        await waitForJob('Upload', jobId, `/upload/status/${jobId}`);
      }
      
      // Get processed file info
      const statusResponse = await apiRequest('GET', `/upload/status/${uploadResponse.jobIds[0]}`);
      if (statusResponse.resourceId) {
        testState.resourceIds.push(statusResponse.resourceId);
      }
    }
  }
  
  log(`Successfully uploaded and processed ${testFiles.length} files`, 'SUCCESS');
};

const testCourseManagement = async () => {
  log('Testing course management...');
  
  // Create course
  log('Creating course...');
  const courseResponse = await apiRequest('POST', '/courses', CONFIG.testData.course);
  testState.courseId = courseResponse.course.id;
  log(`Course created with ID: ${testState.courseId}`, 'SUCCESS');
  
  // Add resources to course
  if (testState.resourceIds.length > 0) {
    log('Adding resources to course...');
    await apiRequest('POST', `/courses/${testState.courseId}/resources`, {
      resourceIds: testState.resourceIds
    });
    log('Resources added to course', 'SUCCESS');
  }
  
  // Create session
  log('Creating course session...');
  const sessionResponse = await apiRequest('POST', `/courses/${testState.courseId}/sessions`, CONFIG.testData.session);
  testState.sessionIds.push(sessionResponse.session.id);
  log(`Session created with ID: ${sessionResponse.session.id}`, 'SUCCESS');
  
  // Get course details
  log('Retrieving course details...');
  const courseDetails = await apiRequest('GET', `/courses/${testState.courseId}`);
  log(`Course details retrieved: ${courseDetails.course.title}`, 'SUCCESS');
  
  // List courses
  log('Testing course listing...');
  const courseList = await apiRequest('GET', '/courses?limit=5');
  log(`Retrieved ${courseList.courses.length} courses`, 'SUCCESS');
};

const testContentAnalysis = async () => {
  log('Testing content analysis...');
  
  if (testState.resourceIds.length === 0) {
    log('No resources available for analysis', 'WARN');
    return;
  }
  
  const analysisResponse = await apiRequest('POST', '/generation/analyze', {
    courseId: testState.courseId,
    resourceIds: testState.resourceIds,
    options: {
      minQuality: 50,
      includeTopics: true,
      includeReadability: true,
      includeRecommendations: true
    }
  });
  
  log('Content analysis completed:', 'SUCCESS');
  log(`- Total resources: ${analysisResponse.analysis.resourceCount}`);
  log(`- Average quality: ${analysisResponse.analysis.qualityDistribution.averageScore}`);
  log(`- Total word count: ${analysisResponse.analysis.totalWordCount}`);
  log(`- Estimated duration: ${analysisResponse.analysis.estimatedDuration.formatted}`);
  
  if (analysisResponse.analysis.topics && analysisResponse.analysis.topics.length > 0) {
    log(`- Top topics: ${analysisResponse.analysis.topics.slice(0, 3).map(t => t.topic).join(', ')}`);
  }
};

const testCourseGeneration = async () => {
  log('Testing course generation...');
  
  // Start generation
  const generationResponse = await apiRequest('POST', '/generation/generate', {
    courseId: testState.courseId,
    options: {
      minQuality: 50,
      useAdvancedGeneration: true,
      includeAssessments: true,
      sessionCount: 4
    }
  });
  
  testState.generationJobId = generationResponse.jobId;
  log(`Generation job started: ${testState.generationJobId}`);
  
  // Wait for generation to complete
  await waitForJob('Generation', testState.generationJobId, `/generation/status/${testState.generationJobId}`);
  
  // Get generation result
  log('Retrieving generation result...');
  const result = await apiRequest('GET', `/generation/result/${testState.generationJobId}`);
  
  log('Course generation completed successfully:', 'SUCCESS');
  log(`- Course title: ${result.result.course?.title || 'N/A'}`);
  log(`- Sessions generated: ${result.result.course?.sessionCount || 0}`);
  log(`- Resources used: ${result.result.course?.resourceCount || 0}`);
};

const testExportSystem = async () => {
  log('Testing export system...');
  
  // Get available templates
  log('Retrieving export templates...');
  const templates = await apiRequest('GET', '/export/templates');
  log(`Available templates: ${templates.templates.map(t => t.name).join(', ')}`);
  
  // Start HTML export
  log('Starting HTML export...');
  const exportResponse = await apiRequest('POST', '/export/html', {
    courseId: testState.courseId,
    template: 'modern',
    options: {
      format: 'multi-page',
      includeAssets: true,
      includeAssessments: true,
      theme: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d'
      },
      branding: {
        organizationName: 'Test Organization'
      }
    }
  });
  
  testState.exportJobId = exportResponse.exportId;
  log(`Export job started: ${testState.exportJobId}`);
  
  // Wait for export to complete
  await waitForJob('Export', testState.exportJobId, `/export/status/${testState.exportJobId}`);
  
  // Get export status
  log('Retrieving export details...');
  const exportStatus = await apiRequest('GET', `/export/status/${testState.exportJobId}`);
  
  log('Export completed successfully:', 'SUCCESS');
  log(`- File size: ${exportStatus.fileSize ? (exportStatus.fileSize / 1024).toFixed(1) + ' KB' : 'Unknown'}`);
  log(`- Download URL: ${exportStatus.downloadUrl}`);
  
  // Test export history
  log('Testing export history...');
  const history = await apiRequest('GET', '/export/history?limit=5');
  log(`Export history retrieved: ${history.exports.length} exports`);
};

const testMetricsAndAnalytics = async () => {
  log('Testing metrics and analytics...');
  
  // Get generation metrics
  try {
    const generationMetrics = await apiRequest('GET', '/generation/metrics?timeframe=7d');
    log('Generation metrics retrieved:', 'SUCCESS');
    log(`- Total jobs: ${generationMetrics.summary.totalJobs}`);
    log(`- Success rate: ${generationMetrics.summary.successRate}`);
    log(`- Average completion time: ${generationMetrics.summary.averageCompletionTime}s`);
  } catch (error) {
    log(`Metrics test failed (expected if no historical data): ${error.message}`, 'WARN');
  }
};

const runHealthChecks = async () => {
  log('Running health checks...');
  
  const healthChecks = [
    { name: 'Server Health', endpoint: '/health' },
    { name: 'Database Health', endpoint: '/health/db' },
    { name: 'Vector Service Health', endpoint: '/health/vector' },
    { name: 'Claude Service Health', endpoint: '/health/claude' }
  ];
  
  for (const check of healthChecks) {
    try {
      const response = await apiRequest('GET', check.endpoint);
      log(`${check.name}: ${response.status || 'OK'}`, 'SUCCESS');
    } catch (error) {
      log(`${check.name}: Failed - ${error.message}`, 'ERROR');
    }
  }
};

// Main test execution
const runEndToEndTest = async () => {
  console.log('🚀 Starting AI Course Creator End-to-End Test\n');
  
  try {
    // Pre-test health checks
    await runHealthChecks();
    console.log('');
    
    // Authentication
    await testAuthentication();
    console.log('');
    
    // File upload and processing
    await testFileUpload();
    console.log('');
    
    // Course management
    await testCourseManagement();
    console.log('');
    
    // Content analysis
    await testContentAnalysis();
    console.log('');
    
    // Course generation
    await testCourseGeneration();
    console.log('');
    
    // Export system
    await testExportSystem();
    console.log('');
    
    // Metrics and analytics
    await testMetricsAndAnalytics();
    console.log('');
    
    // Final summary
    const totalTime = ((Date.now() - testState.startTime) / 1000).toFixed(1);
    log(`🎉 End-to-end test completed successfully in ${totalTime}s`, 'SUCCESS');
    
    log('\n📊 Test Summary:');
    log(`- Course ID: ${testState.courseId}`);
    log(`- Resources processed: ${testState.resourceIds.length}`);
    log(`- Sessions created: ${testState.sessionIds.length}`);
    log(`- Generation job: ${testState.generationJobId}`);
    log(`- Export job: ${testState.exportJobId}`);
    
  } catch (error) {
    log(`❌ End-to-end test failed: ${error.message}`, 'ERROR');
    throw error;
  } finally {
    await cleanup();
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  log('Test interrupted, cleaning up...', 'WARN');
  await cleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (error) => {
  log(`Unhandled rejection: ${error.message}`, 'ERROR');
  await cleanup();
  process.exit(1);
});

// Run the test if called directly
if (require.main === module) {
  runEndToEndTest()
    .then(() => {
      log('All tests passed! ✅', 'SUCCESS');
      process.exit(0);
    })
    .catch((error) => {
      log(`Test suite failed: ${error.message}`, 'ERROR');
      process.exit(1);
    });
}

module.exports = {
  runEndToEndTest,
  testState,
  CONFIG
};