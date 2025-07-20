export interface Course {
  id: string
  title: string
  description: string
  sessions: Session[]
  createdAt: string
  updatedAt: string
  status: CourseStatus
  documentIds: string[]
  userId: string
  metadata?: CourseMetadata
}

export interface Session {
  id: string
  title: string
  description: string
  activities: Activity[]
  order: number
  duration?: number
  objectives?: string[]
}

export interface Activity {
  id: string
  type: ActivityType
  title: string
  content: string
  order: number
  metadata?: ActivityMetadata
}

export type CourseStatus = 'draft' | 'generating' | 'completed' | 'failed' | 'published'

export type ActivityType = 'text' | 'quiz' | 'exercise' | 'video' | 'image' | 'code' | 'discussion'

export interface CourseMetadata {
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  estimatedDuration: number
  language: string
  thumbnail?: string
}

export interface ActivityMetadata {
  points?: number
  timeLimit?: number
  attempts?: number
  resources?: string[]
  [key: string]: any
}

export interface CourseGenerationConfig {
  title: string
  description: string
  documentIds: string[]
  options: {
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    sessionCount: number
    includeQuizzes: boolean
    includeExercises: boolean
    language: string
    tone: 'formal' | 'casual' | 'academic'
  }
}

export interface CourseExportOptions {
  format: 'html' | 'pdf' | 'powerpoint' | 'bundle'
  template?: string
  customization?: {
    colors?: {
      primary?: string
      secondary?: string
      accent?: string
    }
    fonts?: {
      heading?: string
      body?: string
    }
    branding?: {
      logo?: string
      organizationName?: string
    }
  }
}