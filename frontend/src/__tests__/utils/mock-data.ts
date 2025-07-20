import { faker } from '@faker-js/faker'

// Base types for mock data
export interface MockUser {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  organization?: string
  createdAt: string
  updatedAt: string
}

export interface MockCourse {
  id: string
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedDuration: number
  status: 'draft' | 'generating' | 'published' | 'archived'
  userId: string
  sessions: MockSession[]
  metadata: {
    studentCount?: number
    completionRate?: number
    averageRating?: number
    generationProgress?: number
    lastAccessed?: string
  }
  createdAt: string
  updatedAt: string
}

export interface MockSession {
  id: string
  title: string
  description: string
  order: number
  courseId: string
  activities: MockActivity[]
  estimatedDuration: number
  objectives: string[]
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface MockActivity {
  id: string
  title: string
  description: string
  type: 'lesson' | 'exercise' | 'quiz' | 'discussion' | 'assignment'
  order: number
  sessionId: string
  content: string
  estimatedDuration: number
  difficulty: 'easy' | 'medium' | 'hard'
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface MockDocument {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  status: 'uploading' | 'processing' | 'processed' | 'error'
  userId: string
  path: string
  metadata: {
    pages?: number
    wordCount?: number
    language?: string
    extractedText?: string
  }
  createdAt: string
  updatedAt: string
}

export interface MockJob {
  id: string
  type: 'course_generation' | 'content_generation' | 'export'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  userId: string
  courseId?: string
  metadata: {
    totalSteps?: number
    currentStep?: number
    estimatedCompletion?: string
    logs?: Array<{
      timestamp: string
      level: 'info' | 'warn' | 'error' | 'debug'
      message: string
      category?: string
    }>
  }
  createdAt: string
  updatedAt: string
}

// Mock data generators
export class MockDataGenerator {
  static user(overrides: Partial<MockUser> = {}): MockUser {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      avatar: faker.image.avatar(),
      role: faker.helpers.arrayElement(['owner', 'admin', 'editor', 'viewer']),
      organization: faker.company.name(),
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides,
    }
  }

  static course(overrides: Partial<MockCourse> = {}): MockCourse {
    const sessionCount = faker.number.int({ min: 3, max: 8 })
    const sessions = Array.from({ length: sessionCount }, (_, index) =>
      this.session({ order: index + 1, courseId: overrides.id || faker.string.uuid() })
    )
    
    return {
      id: faker.string.uuid(),
      title: faker.lorem.words({ min: 2, max: 6 }),
      description: faker.lorem.paragraph(),
      difficulty: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced']),
      estimatedDuration: faker.number.int({ min: 60, max: 480 }),
      status: faker.helpers.arrayElement(['draft', 'generating', 'published', 'archived']),
      userId: faker.string.uuid(),
      sessions,
      metadata: {
        studentCount: faker.number.int({ min: 0, max: 1000 }),
        completionRate: faker.number.int({ min: 60, max: 100 }),
        averageRating: faker.number.float({ min: 3.0, max: 5.0, precision: 0.1 }),
        lastAccessed: faker.date.recent().toISOString(),
      },
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides,
    }
  }

  static session(overrides: Partial<MockSession> = {}): MockSession {
    const activityCount = faker.number.int({ min: 2, max: 6 })
    const sessionId = overrides.id || faker.string.uuid()
    const activities = Array.from({ length: activityCount }, (_, index) =>
      this.activity({ order: index + 1, sessionId })
    )

    return {
      id: sessionId,
      title: faker.lorem.words({ min: 2, max: 4 }),
      description: faker.lorem.paragraph(),
      order: faker.number.int({ min: 1, max: 10 }),
      courseId: faker.string.uuid(),
      activities,
      estimatedDuration: faker.number.int({ min: 20, max: 90 }),
      objectives: Array.from(
        { length: faker.number.int({ min: 2, max: 4 }) },
        () => faker.lorem.sentence()
      ),
      metadata: {},
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides,
    }
  }

  static activity(overrides: Partial<MockActivity> = {}): MockActivity {
    return {
      id: faker.string.uuid(),
      title: faker.lorem.words({ min: 2, max: 5 }),
      description: faker.lorem.paragraph(),
      type: faker.helpers.arrayElement(['lesson', 'exercise', 'quiz', 'discussion', 'assignment']),
      order: faker.number.int({ min: 1, max: 10 }),
      sessionId: faker.string.uuid(),
      content: faker.lorem.paragraphs(3),
      estimatedDuration: faker.number.int({ min: 5, max: 30 }),
      difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
      metadata: {},
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides,
    }
  }

  static document(overrides: Partial<MockDocument> = {}): MockDocument {
    const filename = faker.system.fileName()
    const fileExtension = faker.helpers.arrayElement(['pdf', 'docx', 'txt', 'md'])
    
    return {
      id: faker.string.uuid(),
      filename: `${filename}.${fileExtension}`,
      originalName: `${faker.lorem.words(2)}.${fileExtension}`,
      mimeType: {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain',
        md: 'text/markdown',
      }[fileExtension],
      size: faker.number.int({ min: 1024, max: 10485760 }), // 1KB to 10MB
      status: faker.helpers.arrayElement(['uploading', 'processing', 'processed', 'error']),
      userId: faker.string.uuid(),
      path: `/uploads/${faker.string.uuid()}/${filename}.${fileExtension}`,
      metadata: {
        pages: fileExtension === 'pdf' ? faker.number.int({ min: 1, max: 100 }) : undefined,
        wordCount: faker.number.int({ min: 100, max: 10000 }),
        language: 'en',
        extractedText: faker.lorem.paragraphs(5),
      },
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides,
    }
  }

  static job(overrides: Partial<MockJob> = {}): MockJob {
    const logs = Array.from(
      { length: faker.number.int({ min: 5, max: 20 }) },
      () => ({
        timestamp: faker.date.recent().toISOString(),
        level: faker.helpers.arrayElement(['info', 'warn', 'error', 'debug'] as const),
        message: faker.lorem.sentence(),
        category: faker.helpers.arrayElement(['system', 'rag', 'ai', 'processing']),
      })
    )

    return {
      id: faker.string.uuid(),
      type: faker.helpers.arrayElement(['course_generation', 'content_generation', 'export']),
      status: faker.helpers.arrayElement(['pending', 'running', 'completed', 'failed', 'cancelled']),
      progress: faker.number.int({ min: 0, max: 100 }),
      userId: faker.string.uuid(),
      courseId: faker.string.uuid(),
      metadata: {
        totalSteps: 4,
        currentStep: faker.number.int({ min: 1, max: 4 }),
        estimatedCompletion: faker.date.future().toISOString(),
        logs,
      },
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides,
    }
  }

  // Generate collections
  static users(count: number, overrides: Partial<MockUser> = {}): MockUser[] {
    return Array.from({ length: count }, () => this.user(overrides))
  }

  static courses(count: number, overrides: Partial<MockCourse> = {}): MockCourse[] {
    return Array.from({ length: count }, () => this.course(overrides))
  }

  static documents(count: number, overrides: Partial<MockDocument> = {}): MockDocument[] {
    return Array.from({ length: count }, () => this.document(overrides))
  }

  static jobs(count: number, overrides: Partial<MockJob> = {}): MockJob[] {
    return Array.from({ length: count }, () => this.job(overrides))
  }

  // Realistic scenario generators
  static courseWithProgress(): MockCourse {
    return this.course({
      status: 'generating',
      metadata: {
        generationProgress: faker.number.int({ min: 10, max: 90 }),
        studentCount: 0,
        completionRate: 0,
        averageRating: 0,
      },
    })
  }

  static popularCourse(): MockCourse {
    return this.course({
      status: 'published',
      metadata: {
        studentCount: faker.number.int({ min: 100, max: 2000 }),
        completionRate: faker.number.int({ min: 80, max: 95 }),
        averageRating: faker.number.float({ min: 4.0, max: 5.0, precision: 0.1 }),
        lastAccessed: faker.date.recent().toISOString(),
      },
    })
  }

  static failedJob(): MockJob {
    return this.job({
      status: 'failed',
      progress: faker.number.int({ min: 10, max: 90 }),
      metadata: {
        totalSteps: 4,
        currentStep: faker.number.int({ min: 1, max: 3 }),
        logs: [
          {
            timestamp: faker.date.recent().toISOString(),
            level: 'error',
            message: 'Document processing failed: Unable to extract text from corrupted PDF',
            category: 'processing',
          },
          {
            timestamp: faker.date.recent().toISOString(),
            level: 'info',
            message: 'Retrying document processing...',
            category: 'system',
          },
          {
            timestamp: faker.date.recent().toISOString(),
            level: 'error',
            message: 'Maximum retry attempts exceeded',
            category: 'system',
          },
        ],
      },
    })
  }
}

// Pre-generated mock data sets for consistent testing
export const MOCK_DATA = {
  users: {
    admin: MockDataGenerator.user({
      id: 'user-admin',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
    }),
    editor: MockDataGenerator.user({
      id: 'user-editor',
      email: 'editor@example.com',
      name: 'Editor User',
      role: 'editor',
    }),
    viewer: MockDataGenerator.user({
      id: 'user-viewer',
      email: 'viewer@example.com',
      name: 'Viewer User',
      role: 'viewer',
    }),
  },
  courses: {
    published: MockDataGenerator.course({
      id: 'course-published',
      title: 'JavaScript Fundamentals',
      status: 'published',
      difficulty: 'beginner',
    }),
    draft: MockDataGenerator.course({
      id: 'course-draft',
      title: 'React Advanced Patterns',
      status: 'draft',
      difficulty: 'advanced',
    }),
    generating: MockDataGenerator.courseWithProgress(),
    popular: MockDataGenerator.popularCourse(),
  },
  documents: {
    pdf: MockDataGenerator.document({
      id: 'doc-pdf',
      filename: 'javascript-guide.pdf',
      mimeType: 'application/pdf',
      status: 'processed',
    }),
    docx: MockDataGenerator.document({
      id: 'doc-docx',
      filename: 'course-outline.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      status: 'processed',
    }),
    processing: MockDataGenerator.document({
      id: 'doc-processing',
      filename: 'large-document.pdf',
      status: 'processing',
    }),
  },
  jobs: {
    running: MockDataGenerator.job({
      id: 'job-running',
      status: 'running',
      progress: 45,
    }),
    completed: MockDataGenerator.job({
      id: 'job-completed',
      status: 'completed',
      progress: 100,
    }),
    failed: MockDataGenerator.failedJob(),
  },
}