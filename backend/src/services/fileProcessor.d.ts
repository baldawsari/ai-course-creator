export interface FileProcessorOptions {
  fileId: string;
  filePath: string;
  fileName: string;
  fileType: string;
  userId: string;
  courseId: string;
  onProgress?: (progress: number) => void;
}

export interface UrlProcessorOptions {
  resourceId: string;
  url: string;
  title?: string;
  userId: string;
  courseId: string;
  onProgress?: (progress: number) => void;
}

export interface ProcessingResult {
  fileId?: string;
  resourceId?: string;
  fileName?: string;
  url?: string;
  title?: string;
  contentLength: number;
  wordCount: number;
  storagePath: string;
  metadata: Record<string, any>;
  status: string;
  qualityScore?: number;
}

declare class FileProcessor {
  supportedTypes: Record<string, Function>;
  chunksCache?: Record<string, any[]>;

  constructor();

  getDocumentProcessor(): any | null;

  processFile(options: FileProcessorOptions): Promise<ProcessingResult>;
  processUrl(options: UrlProcessorOptions): Promise<ProcessingResult>;
  
  processPDF(filePath: string, fileName: string, onProgress?: Function): Promise<{ text: string; metadata: any }>;
  processWord(filePath: string, fileName: string, onProgress?: Function): Promise<{ text: string; metadata: any }>;
  processText(filePath: string, fileName: string, onProgress?: Function): Promise<{ text: string; metadata: any }>;
  processURL(url: string, title: string, onProgress?: Function): Promise<{ text: string; metadata: any }>;

  uploadToStorage(filePath: string, fileName: string, courseId: string): Promise<string>;
  saveContentToStorage(content: string, fileName: string, courseId: string): Promise<string>;
  
  generateEmbeddings(resourceId: string, content: string, onProgress?: Function): Promise<any[]>;
  generateEmbeddingsForChunks(resourceId: string, chunks: any[], onProgress?: Function): Promise<any[]>;
  
  cleanExtractedContent(content: string): string;
  chunkContent(content: string, maxChunkSize?: number): Array<{ text: string; start: number; end: number }>;
  
  updateFileStatus(fileId: string, status: string): Promise<void>;
  getMimeType(fileName: string): string;
  validateFile(filePath: string): Promise<boolean>;
}

export const fileProcessor: FileProcessor;
export { FileProcessor };