import { Job } from 'bull';
import { supabaseAdmin } from '../../config/database';
const { DocumentProcessor } = require('../../services/documentProcessor');
const { vectorService } = require('../../services/vectorService');

interface FileProcessingData {
  fileId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  userId: string;
  courseId?: string;
}

export async function processFileJob(job: Job<FileProcessingData>) {
  const { fileId, fileName, filePath, fileType, userId, courseId } = job.data;

  try {
    // Update job progress
    await job.progress(10);

    // Update file status to processing
    await supabaseAdmin
      .from('uploaded_files')
      .update({ 
        status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', fileId);

    // Process the document
    await job.progress(20);
    const processor = new DocumentProcessor();
    const { chunks, metadata } = await processor.processDocument({
      filePath,
      fileType,
      options: {
        chunkSize: 1000,
        chunkOverlap: 200,
        splitByHeading: true,
      }
    });

    await job.progress(50);

    // Generate embeddings and store in vector database
    const collection = courseId ? `course_${courseId}` : `user_${userId}`;
    
    // Initialize vector service and create collection if needed
    await vectorService.initialize();
    await vectorService.createCollection(collection);
    
    // Convert chunks to vector format and store
    const vectors = chunks.map((chunk: any, index: number) => ({
      id: `${fileId}_chunk_${index}`,
      vector: chunk.embedding || [], // Embeddings will be generated by the service
      payload: {
        content: chunk.content,
        fileId,
        fileName,
        userId,
        courseId,
        chunkIndex: index,
        metadata: chunk.metadata || {},
        ...metadata,
      }
    }));
    
    await vectorService.insertVectors(collection, vectors);

    await job.progress(80);

    // Update file record with processing results
    await supabaseAdmin
      .from('uploaded_files')
      .update({
        status: 'completed',
        processing_completed_at: new Date().toISOString(),
        metadata: {
          totalChunks: chunks.length,
          documentMetadata: metadata,
        },
      })
      .eq('id', fileId);

    await job.progress(100);

    return {
      success: true,
      fileId,
      chunksProcessed: chunks.length,
      metadata,
    };
  } catch (error) {
    console.error('File processing error:', error);

    // Update file status to failed
    await supabaseAdmin
      .from('uploaded_files')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        processing_completed_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    throw error;
  }
}