export interface Document {
  id: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  uploadedAt: string
  processedAt?: string
  status: DocumentStatus
  userId: string
  chunks?: DocumentChunk[]
  metadata?: DocumentMetadata
}

export interface DocumentChunk {
  id: string
  content: string
  order: number
  metadata?: ChunkMetadata
}

export interface ChunkMetadata {
  pageNumber?: number
  section?: string
  quality?: number
  similarity?: number
  [key: string]: any
}

export interface DocumentMetadata {
  title?: string
  author?: string
  subject?: string
  keywords?: string[]
  pageCount?: number
  wordCount?: number
  language?: string
  extractedText?: string
  contentType?: string
}

export type DocumentStatus = 'uploading' | 'processing' | 'completed' | 'failed'

export interface DocumentUploadResponse {
  documents: Document[]
  jobId: string
}

export interface DocumentProcessingJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  message?: string
  createdAt: string
  completedAt?: string
  error?: string
}