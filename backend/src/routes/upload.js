const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const bull = require('bull');
const redis = require('redis');

const { supabaseAdmin } = require('../config/database');
const { authenticateUser, requireAuth } = require('../middleware/auth');
const { fileProcessor } = require('../services/fileProcessor');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// Redis client for job queue
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
});

// File processing queue
const fileProcessingQueue = new bull('file processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
});

// File type validation
const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
};

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];

// Multer configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'temp-uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  },
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_FILE_TYPES[file.mimetype]) {
    return cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: PDF, DOC, DOCX, TXT`), false);
  }

  // Check file extension
  const extension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return cb(new Error(`File extension ${extension} not allowed. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }

  // Additional filename validation
  if (file.originalname.length > 255) {
    return cb(new Error('Filename too long (max 255 characters)'), false);
  }

  // Check for suspicious file patterns
  const suspiciousPatterns = [/\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.scr$/i, /\.pif$/i];
  if (suspiciousPatterns.some(pattern => pattern.test(file.originalname))) {
    return cb(new Error('File type not allowed for security reasons'), false);
  }

  cb(null, true);
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
    files: 10, // Maximum 10 files per request
  },
});

// Error handler for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: 'File too large',
          message: `File size must be less than ${(parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024) / 1024 / 1024}MB`,
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Too many files',
          message: 'Maximum 10 files allowed per upload',
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Unexpected field',
          message: 'Unexpected file field in request',
        });
      default:
        return res.status(400).json({
          error: 'Upload error',
          message: error.message,
        });
    }
  }
  
  if (error.message && error.message.includes('not allowed')) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: error.message,
    });
  }

  next(error);
};

// Utility function to clean up temporary files
const cleanupTempFiles = async (files) => {
  if (!files) return;
  
  const filesToClean = Array.isArray(files) ? files : [files];
  
  for (const file of filesToClean) {
    try {
      if (file.path) {
        await fs.unlink(file.path);
      }
    } catch (error) {
      console.warn(`Failed to cleanup temp file ${file.path}:`, error.message);
    }
  }
};

// =============================================
// ROUTE HANDLERS
// =============================================

/**
 * POST /upload/files - Multiple file upload
 * Handles multiple file uploads with progress tracking
 */
router.post('/files', 
  authenticateUser,
  requireAuth,
  upload.array('files', 10),
  handleMulterError,
  asyncHandler(async (req, res) => {
    const uploadedFiles = req.files;
    const userId = req.user.id;
    const courseId = req.body.courseId;

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please select at least one file to upload',
      });
    }

    try {
      // Validate course ownership if courseId provided
      if (courseId) {
        const { data: course, error: courseError } = await supabaseAdmin
          .from('courses')
          .select('user_id')
          .eq('id', courseId)
          .eq('user_id', userId)
          .single();

        if (courseError || !course) {
          await cleanupTempFiles(uploadedFiles);
          return res.status(404).json({
            error: 'Course not found',
            message: 'Course not found or access denied',
          });
        }
      }

      const uploadResults = [];
      const processingJobs = [];

      // Process each file
      for (const file of uploadedFiles) {
        try {
          // Create database record for the file
          const { data: fileRecord, error: dbError } = await supabaseAdmin
            .from('course_resources')
            .insert({
              course_id: courseId,
              file_name: file.originalname,
              file_type: file.mimetype,
              storage_path: file.path,
              status: 'uploaded',
            })
            .select()
            .single();

          if (dbError) {
            console.error('Database error:', dbError);
            await cleanupTempFiles([file]);
            uploadResults.push({
              filename: file.originalname,
              success: false,
              error: 'Database error',
              details: dbError.message,
            });
            continue;
          }

          // Create processing job
          const job = await fileProcessingQueue.add('process-file', {
            fileId: fileRecord.id,
            filePath: file.path,
            fileName: file.originalname,
            fileType: file.mimetype,
            userId: userId,
            courseId: courseId,
          }, {
            attempts: 3,
            delay: 1000,
            removeOnComplete: 100,
            removeOnFail: 50,
          });

          processingJobs.push({
            fileId: fileRecord.id,
            jobId: job.id,
            filename: file.originalname,
          });

          uploadResults.push({
            fileId: fileRecord.id,
            jobId: job.id,
            filename: file.originalname,
            size: file.size,
            type: file.mimetype,
            status: 'uploaded',
            success: true,
          });

        } catch (error) {
          console.error('Error processing file:', error);
          await cleanupTempFiles([file]);
          uploadResults.push({
            filename: file.originalname,
            success: false,
            error: 'Processing error',
            details: error.message,
          });
        }
      }

      res.status(200).json({
        message: `${uploadResults.filter(r => r.success).length}/${uploadedFiles.length} files uploaded successfully`,
        results: uploadResults,
        processingJobs: processingJobs,
      });

    } catch (error) {
      console.error('Upload error:', error);
      await cleanupTempFiles(uploadedFiles);
      res.status(500).json({
        error: 'Upload failed',
        message: error.message,
      });
    }
  })
);

/**
 * POST /upload/url - URL processing
 * Processes web URLs and extracts content
 */
router.post('/url',
  authenticateUser,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { url, courseId, title } = req.body;
    const userId = req.user.id;

    if (!url) {
      return res.status(400).json({
        error: 'URL required',
        message: 'Please provide a valid URL',
      });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'Please provide a valid URL format',
      });
    }

    try {
      // Validate course ownership if courseId provided
      if (courseId) {
        const { data: course, error: courseError } = await supabaseAdmin
          .from('courses')
          .select('user_id')
          .eq('id', courseId)
          .eq('user_id', userId)
          .single();

        if (courseError || !course) {
          return res.status(404).json({
            error: 'Course not found',
            message: 'Course not found or access denied',
          });
        }
      }

      // Create database record for the URL
      const { data: urlRecord, error: dbError } = await supabaseAdmin
        .from('course_resources')
        .insert({
          course_id: courseId,
          file_name: title || new URL(url).hostname,
          file_type: 'text/html',
          storage_path: url,
          status: 'uploaded',
        })
        .select()
        .single();

      if (dbError) {
        return res.status(500).json({
          error: 'Database error',
          message: dbError.message,
        });
      }

      // Create URL processing job
      const job = await fileProcessingQueue.add('process-url', {
        resourceId: urlRecord.id,
        url: url,
        title: title,
        userId: userId,
        courseId: courseId,
      }, {
        attempts: 3,
        delay: 2000,
        removeOnComplete: 100,
        removeOnFail: 50,
      });

      res.status(200).json({
        message: 'URL processing started',
        resourceId: urlRecord.id,
        jobId: job.id,
        url: url,
        status: 'processing',
      });

    } catch (error) {
      console.error('URL processing error:', error);
      res.status(500).json({
        error: 'URL processing failed',
        message: error.message,
      });
    }
  })
);

/**
 * GET /upload/status/:jobId - Upload progress
 * Gets the status of a file processing job
 */
router.get('/status/:jobId',
  authenticateUser,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    try {
      const job = await fileProcessingQueue.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          error: 'Job not found',
          message: 'Processing job not found',
        });
      }

      const jobState = await job.getState();
      const progress = job.progress();
      
      let result = null;
      if (jobState === 'completed') {
        result = job.returnvalue;
      }

      let error = null;
      if (jobState === 'failed') {
        error = job.failedReason;
      }

      res.status(200).json({
        jobId: job.id,
        status: jobState,
        progress: progress,
        data: job.data,
        result: result,
        error: error,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
      });

    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        error: 'Status check failed',
        message: error.message,
      });
    }
  })
);

/**
 * DELETE /upload/:fileId - File deletion
 * Deletes an uploaded file and its data
 */
router.delete('/:fileId',
  authenticateUser,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const userId = req.user.id;

    try {
      // Get file record with ownership check
      const { data: fileRecord, error: fetchError } = await supabaseAdmin
        .from('course_resources')
        .select(`
          *,
          courses!inner(user_id)
        `)
        .eq('id', fileId)
        .single();

      if (fetchError || !fileRecord) {
        return res.status(404).json({
          error: 'File not found',
          message: 'File not found or access denied',
        });
      }

      // Check ownership
      if (fileRecord.courses.user_id !== userId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to delete this file',
        });
      }

      // Delete from Supabase Storage if it's a storage path
      if (fileRecord.storage_path && fileRecord.storage_path.startsWith('courses/')) {
        try {
          const { error: storageError } = await supabaseAdmin.storage
            .from('course-files')
            .remove([fileRecord.storage_path]);

          if (storageError) {
            console.warn('Storage deletion warning:', storageError);
          }
        } catch (storageError) {
          console.warn('Storage deletion failed:', storageError);
        }
      }

      // Delete temporary file if it exists
      if (fileRecord.storage_path && fileRecord.storage_path.includes('temp-uploads')) {
        try {
          await fs.unlink(fileRecord.storage_path);
        } catch (cleanupError) {
          console.warn('Temp file cleanup failed:', cleanupError);
        }
      }

      // Delete related embeddings
      const { error: embeddingsError } = await supabaseAdmin
        .from('content_embeddings')
        .delete()
        .eq('resource_id', fileId);

      if (embeddingsError) {
        console.warn('Embeddings deletion warning:', embeddingsError);
      }

      // Delete file record
      const { error: deleteError } = await supabaseAdmin
        .from('course_resources')
        .delete()
        .eq('id', fileId);

      if (deleteError) {
        return res.status(500).json({
          error: 'Deletion failed',
          message: deleteError.message,
        });
      }

      res.status(200).json({
        message: 'File deleted successfully',
        fileId: fileId,
      });

    } catch (error) {
      console.error('File deletion error:', error);
      res.status(500).json({
        error: 'Deletion failed',
        message: error.message,
      });
    }
  })
);

/**
 * GET /upload/list - List uploaded files
 * Gets list of uploaded files for a course or user
 */
router.get('/list',
  authenticateUser,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { courseId, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    try {
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = supabaseAdmin
        .from('course_resources')
        .select(`
          *,
          courses!inner(id, title, user_id)
        `)
        .eq('courses.user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data: files, error, count } = await query;

      if (error) {
        return res.status(500).json({
          error: 'Query failed',
          message: error.message,
        });
      }

      res.status(200).json({
        files: files || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / parseInt(limit)),
        },
      });

    } catch (error) {
      console.error('File list error:', error);
      res.status(500).json({
        error: 'Failed to fetch files',
        message: error.message,
      });
    }
  })
);

// =============================================
// QUEUE JOB PROCESSING
// =============================================

// Process file upload jobs
fileProcessingQueue.process('process-file', async (job) => {
  const { fileId, filePath, fileName, fileType, userId, courseId } = job.data;
  
  try {
    job.progress(10);
    
    // Process the file using fileProcessor service
    const result = await fileProcessor.processFile({
      fileId,
      filePath,
      fileName,
      fileType,
      userId,
      courseId,
      onProgress: (progress) => {
        job.progress(10 + (progress * 0.8)); // Scale progress to 10-90%
      },
    });

    job.progress(100);
    return result;

  } catch (error) {
    console.error('File processing job failed:', error);
    
    // Update database status to failed
    await supabaseAdmin
      .from('course_resources')
      .update({ 
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    throw error;
  }
});

// Process URL jobs
fileProcessingQueue.process('process-url', async (job) => {
  const { resourceId, url, title, userId, courseId } = job.data;
  
  try {
    job.progress(10);
    
    // Process the URL using fileProcessor service
    const result = await fileProcessor.processUrl({
      resourceId,
      url,
      title,
      userId,
      courseId,
      onProgress: (progress) => {
        job.progress(10 + (progress * 0.8)); // Scale progress to 10-90%
      },
    });

    job.progress(100);
    return result;

  } catch (error) {
    console.error('URL processing job failed:', error);
    
    // Update database status to failed
    await supabaseAdmin
      .from('course_resources')
      .update({ 
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', resourceId);

    throw error;
  }
});

// Queue event handlers
fileProcessingQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed successfully:`, result);
});

fileProcessingQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

fileProcessingQueue.on('stalled', (job) => {
  console.warn(`Job ${job.id} stalled`);
});

module.exports = router;