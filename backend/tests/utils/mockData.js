const crypto = require('crypto');

// Sample PDF content
const SAMPLE_PDF_CONTENT = `
Introduction to Machine Learning

Machine learning is a subset of artificial intelligence that focuses on building systems that learn from data. 
Rather than being explicitly programmed to perform a task, these systems improve their performance through experience.

Chapter 1: Supervised Learning
Supervised learning is the most common type of machine learning. In this approach, the algorithm learns from labeled training data.

Chapter 2: Unsupervised Learning
Unsupervised learning deals with unlabeled data. The algorithm tries to find patterns and structures in the data without guidance.

Chapter 3: Reinforcement Learning
Reinforcement learning is about taking suitable action to maximize reward in a particular situation.
`;

// Sample course structure
const SAMPLE_COURSE_STRUCTURE = {
  title: 'Introduction to Machine Learning',
  description: 'A comprehensive course on machine learning fundamentals',
  modules: [
    {
      title: 'Module 1: Introduction',
      description: 'Overview of machine learning concepts',
      lessons: [
        'What is Machine Learning?',
        'Types of Machine Learning',
        'Applications of ML',
      ],
      objectives: [
        'Understand basic ML concepts',
        'Identify different types of ML',
      ],
      assessment: 'Multiple choice quiz',
      duration: '2 hours',
    },
    {
      title: 'Module 2: Supervised Learning',
      description: 'Deep dive into supervised learning algorithms',
      lessons: [
        'Linear Regression',
        'Logistic Regression',
        'Decision Trees',
      ],
      objectives: [
        'Implement supervised learning algorithms',
        'Evaluate model performance',
      ],
      assessment: 'Programming assignment',
      duration: '4 hours',
    },
  ],
};

// Mock data generators
const mockData = {
  // User data
  users: {
    valid: {
      email: 'test@example.com',
      password: 'Test123!@#',
      full_name: 'Test User',
    },
    invalid: {
      email: 'invalid-email',
      password: '123',
      full_name: '',
    },
  },

  // File data
  files: {
    pdf: {
      name: 'test-document.pdf',
      mimetype: 'application/pdf',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from(SAMPLE_PDF_CONTENT),
    },
    docx: {
      name: 'test-document.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 512 * 1024, // 512KB
      buffer: Buffer.from('Mock DOCX content'),
    },
    invalid: {
      name: 'test.exe',
      mimetype: 'application/x-msdownload',
      size: 1024,
      buffer: Buffer.from('Invalid file'),
    },
    oversized: {
      name: 'large.pdf',
      mimetype: 'application/pdf',
      size: 100 * 1024 * 1024, // 100MB
      buffer: Buffer.alloc(100 * 1024 * 1024),
    },
  },

  // Document processing data
  documents: {
    chunks: [
      {
        content: 'Machine learning is a subset of artificial intelligence.',
        metadata: { page: 1, section: 'Introduction' },
      },
      {
        content: 'Supervised learning uses labeled training data.',
        metadata: { page: 2, section: 'Chapter 1' },
      },
      {
        content: 'Unsupervised learning finds patterns in unlabeled data.',
        metadata: { page: 3, section: 'Chapter 2' },
      },
    ],
    qualityScores: {
      high: {
        readability: 85,
        complexity: 75,
        coherence: 90,
        overall: 83,
      },
      medium: {
        readability: 65,
        complexity: 60,
        coherence: 70,
        overall: 65,
      },
      low: {
        readability: 40,
        complexity: 35,
        coherence: 45,
        overall: 40,
      },
    },
  },

  // Course generation data
  courses: {
    structure: SAMPLE_COURSE_STRUCTURE,
    prompt: 'Create a comprehensive course on machine learning',
    invalidStructure: {
      title: 'Invalid Course',
      // Missing required fields
    },
  },

  // Vector data
  vectors: {
    embeddings: [
      Array.from({ length: 768 }, () => Math.random()),
      Array.from({ length: 768 }, () => Math.random()),
      Array.from({ length: 768 }, () => Math.random()),
    ],
    searchQuery: 'What is supervised learning?',
    searchResults: [
      {
        id: crypto.randomUUID(),
        score: 0.95,
        content: 'Supervised learning uses labeled training data.',
      },
      {
        id: crypto.randomUUID(),
        score: 0.87,
        content: 'Machine learning is a subset of artificial intelligence.',
      },
    ],
  },

  // API responses
  responses: {
    claude: {
      success: {
        content: [
          {
            text: JSON.stringify(SAMPLE_COURSE_STRUCTURE),
          },
        ],
      },
      error: {
        error: {
          type: 'invalid_request_error',
          message: 'Invalid API key',
        },
      },
    },
    jina: {
      embeddings: {
        data: [
          { embedding: Array.from({ length: 768 }, () => Math.random()) },
        ],
      },
      rerank: {
        results: [
          { index: 0, relevance_score: 0.95 },
          { index: 2, relevance_score: 0.87 },
          { index: 1, relevance_score: 0.65 },
        ],
      },
    },
  },

  // Performance test data
  performance: {
    largeDocument: {
      content: 'Lorem ipsum dolor sit amet. '.repeat(10000),
      chunks: 100,
    },
    bulkDocuments: Array.from({ length: 50 }, (_, i) => ({
      id: crypto.randomUUID(),
      title: `Document ${i + 1}`,
      content: `This is the content of document ${i + 1}.`,
    })),
  },

  // Error scenarios
  errors: {
    database: {
      code: 'PGRST116',
      message: 'Database connection failed',
    },
    validation: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [
        { field: 'email', message: 'Invalid email format' },
      ],
    },
    auth: {
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    },
  },
};

// Helper functions
function generateMockFile(type = 'pdf', customData = {}) {
  const baseFile = mockData.files[type] || mockData.files.pdf;
  return {
    ...baseFile,
    ...customData,
    path: `/tmp/${baseFile.name}`,
    originalname: baseFile.name,
  };
}

function generateMockChunks(count = 10) {
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    content: `This is chunk ${i + 1} with sample content about machine learning.`,
    metadata: {
      page: Math.floor(i / 3) + 1,
      section: `Section ${Math.floor(i / 3) + 1}`,
      position: i,
    },
    vector: Array.from({ length: 768 }, () => Math.random()),
  }));
}

function generateMockSearchResults(query, count = 5) {
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    score: 0.95 - (i * 0.1),
    content: `Result ${i + 1} for query: ${query}`,
    metadata: {
      source: `document_${i + 1}`,
      page: i + 1,
    },
  }));
}

module.exports = {
  mockData,
  generateMockFile,
  generateMockChunks,
  generateMockSearchResults,
  SAMPLE_PDF_CONTENT,
  SAMPLE_COURSE_STRUCTURE,
};