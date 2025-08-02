const express = require('express');
const Joi = require('joi');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const { supabaseAdmin } = require('../config/database');
const { authenticateUser, requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandling');
const logger = require('../utils/logger');
const Bull = require('bull');
const { v4: uuidv4 } = require('uuid');
const HTMLExporter = require('../services/htmlExporter');
const PDFGenerator = require('../services/pdfGenerator');
const PPTGenerator = require('../services/pptGenerator');

const router = express.Router();

// Job queue for export tasks
const exportQueue = new Bull('export-tasks', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  }
});

// Export directory
const EXPORT_DIR = process.env.EXPORT_DIR || path.join(process.cwd(), 'exports');
const TEMPLATE_DIR = path.join(__dirname, '../templates');

// Initialize HTML Exporter, PDF Generator, and PPT Generator
const htmlExporter = new HTMLExporter();
const pdfGenerator = new PDFGenerator();
const pptGenerator = new PPTGenerator();

// Validation schemas
const htmlExportSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  template: Joi.string().valid(
    'modern', 'classic', 'minimal', 'interactive', 'mobile-first'
  ).default('modern'),
  options: Joi.object({
    format: Joi.string().valid('single-page', 'multi-page', 'scorm').default('multi-page'),
    includeAssets: Joi.boolean().default(true),
    includeVideos: Joi.boolean().default(false),
    includeAssessments: Joi.boolean().default(true),
    includeNavigation: Joi.boolean().default(true),
    theme: Joi.object({
      primaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#007bff'),
      secondaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#6c757d'),
      fontFamily: Joi.string().default('Inter, sans-serif'),
      fontSize: Joi.string().valid('small', 'medium', 'large').default('medium')
    }).default({}),
    branding: Joi.object({
      logo: Joi.string().uri(),
      organizationName: Joi.string().max(100),
      customCSS: Joi.string().max(10000),
      footer: Joi.string().max(500)
    }).default({})
  }).default({})
});

const pdfExportSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  template: Joi.string().valid(
    'modern', 'classic', 'minimal', 'interactive', 'mobile-first'
  ).default('modern'),
  options: Joi.object({
    format: Joi.string().valid('A4', 'Letter', 'Legal').default('A4'),
    orientation: Joi.string().valid('portrait', 'landscape').default('portrait'),
    includeTableOfContents: Joi.boolean().default(true),
    includePageNumbers: Joi.boolean().default(true),
    includeHeaderFooter: Joi.boolean().default(true),
    optimize: Joi.boolean().default(false),
    uploadToStorage: Joi.boolean().default(false),
    customizations: Joi.object({
      primaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#007bff'),
      fontFamily: Joi.string().default('Inter, sans-serif'),
      logo: Joi.string().uri(),
      headerText: Joi.string().max(100),
      footerText: Joi.string().max(100)
    }).default({}),
    pdfOptions: Joi.object({
      margin: Joi.object({
        top: Joi.string().default('1in'),
        bottom: Joi.string().default('1in'),
        left: Joi.string().default('0.75in'),
        right: Joi.string().default('0.75in')
      }),
      printBackground: Joi.boolean().default(true),
      preferCSSPageSize: Joi.boolean().default(false)
    }).default({})
  }).default({})
});

const pptExportSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  template: Joi.string().valid(
    'modern', 'classic', 'minimal', 'interactive', 'professional'
  ).default('modern'),
  options: Joi.object({
    layout: Joi.string().valid('16x9', '4x3').default('16x9'),
    includeTOC: Joi.boolean().default(true),
    includeSummary: Joi.boolean().default(true),
    includeActivities: Joi.boolean().default(true),
    includeAssessments: Joi.boolean().default(true),
    slidesPerSession: Joi.number().integer().min(1).max(10).default(3),
    uploadToStorage: Joi.boolean().default(false),
    branding: Joi.object({
      logo: Joi.string().uri(),
      organizationName: Joi.string().max(100),
      colorScheme: Joi.object({
        primary: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#007bff'),
        secondary: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#6c757d'),
        background: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#ffffff')
      }).default({}),
      fontFamily: Joi.string().default('Arial')
    }).default({}),
    pptOptions: Joi.object({
      title: Joi.string().max(100),
      subject: Joi.string().max(200),
      author: Joi.string().max(100),
      rtlMode: Joi.boolean().default(false)
    }).default({})
  }).default({})
});

const bundleExportSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  formats: Joi.array().items(
    Joi.string().valid('html', 'pdf', 'ppt')
  ).min(1).max(3).required(),
  template: Joi.string().valid(
    'modern', 'classic', 'minimal', 'interactive', 'professional'
  ).default('modern'),
  options: Joi.object({
    // HTML options
    htmlOptions: Joi.object({
      format: Joi.string().valid('single-page', 'multi-page', 'scorm').default('multi-page'),
      includeAssets: Joi.boolean().default(true),
      includeVideos: Joi.boolean().default(false),
      includeAssessments: Joi.boolean().default(true),
      includeNavigation: Joi.boolean().default(true),
      theme: Joi.object({
        primaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#007bff'),
        secondaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#6c757d'),
        fontFamily: Joi.string().default('Inter, sans-serif'),
        fontSize: Joi.string().valid('small', 'medium', 'large').default('medium')
      }).default({}),
      branding: Joi.object({
        logo: Joi.string().uri(),
        organizationName: Joi.string().max(100),
        customCSS: Joi.string().max(10000),
        footer: Joi.string().max(500)
      }).default({})
    }).default({}),
    // PDF options
    pdfOptions: Joi.object({
      format: Joi.string().valid('A4', 'Letter', 'Legal').default('A4'),
      orientation: Joi.string().valid('portrait', 'landscape').default('portrait'),
      includeTableOfContents: Joi.boolean().default(true),
      includePageNumbers: Joi.boolean().default(true),
      includeHeaderFooter: Joi.boolean().default(true),
      optimize: Joi.boolean().default(false),
      customizations: Joi.object({
        primaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#007bff'),
        fontFamily: Joi.string().default('Inter, sans-serif'),
        logo: Joi.string().uri(),
        headerText: Joi.string().max(100),
        footerText: Joi.string().max(100)
      }).default({})
    }).default({}),
    // PowerPoint options
    pptOptions: Joi.object({
      layout: Joi.string().valid('16x9', '4x3').default('16x9'),
      includeTOC: Joi.boolean().default(true),
      includeSummary: Joi.boolean().default(true),
      includeActivities: Joi.boolean().default(true),
      includeAssessments: Joi.boolean().default(true),
      slidesPerSession: Joi.number().integer().min(1).max(10).default(3),
      branding: Joi.object({
        logo: Joi.string().uri(),
        organizationName: Joi.string().max(100),
        colorScheme: Joi.object({
          primary: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#007bff'),
          secondary: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#6c757d'),
          background: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#ffffff')
        }).default({}),
        fontFamily: Joi.string().default('Arial')
      }).default({})
    }).default({})
  }).default({})
});

const customizeExportSchema = Joi.object({
  exportId: Joi.string().uuid().required(),
  customizations: Joi.object({
    template: Joi.string(),
    theme: Joi.object(),
    branding: Joi.object(),
    layout: Joi.object({
      sidebar: Joi.boolean(),
      headerStyle: Joi.string().valid('fixed', 'static', 'hidden'),
      footerStyle: Joi.string().valid('fixed', 'static', 'hidden')
    }),
    content: Joi.object({
      showObjectives: Joi.boolean(),
      showPrerequisites: Joi.boolean(),
      showDuration: Joi.boolean(),
      showProgress: Joi.boolean()
    })
  }).required()
});

// ==================== EXPORT ROUTES ====================

/**
 * POST /export/html - Generate HTML export
 */
router.post('/html', authenticateUser, asyncHandler(async (req, res) => {
  const { error: validationError, value: validatedData } = htmlExportSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  const { courseId, template, options } = validatedData;

  // Check course access and get course data
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select(`
      *,
      course_sessions(*),
      course_resources(*)
    `)
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:read')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if course has content
  if (!course.course_sessions || course.course_sessions.length === 0) {
    return res.status(400).json({ 
      error: 'Course has no sessions to export' 
    });
  }

  try {
    const exportId = uuidv4();
    
    // Create export job record
    const { error: jobError } = await supabaseAdmin
      .from('export_jobs')
      .insert({
        id: exportId,
        course_id: courseId,
        user_id: req.user.id,
        type: 'html',
        status: 'pending',
        progress: 0,
        template,
        options,
        created_at: new Date().toISOString()
      });

    if (jobError) throw jobError;

    // Add to export queue
    await exportQueue.add('html-export', {
      exportId,
      courseId,
      userId: req.user.id,
      template,
      options,
      course
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    logger.info(`HTML export job created: ${exportId} for course ${courseId}`);
    
    res.status(202).json({
      message: 'HTML export started',
      exportId,
      template,
      statusUrl: `/api/export/status/${exportId}`,
      downloadUrl: `/api/export/download/${exportId}`
    });
  } catch (error) {
    logger.error('Failed to start HTML export:', error);
    res.status(500).json({
      error: 'Failed to start export',
      message: error.message
    });
  }
}));

/**
 * POST /export/pdf - Generate PDF export
 */
router.post('/pdf', authenticateUser, asyncHandler(async (req, res) => {
  const { error: validationError, value: validatedData } = pdfExportSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  const { courseId, template, options } = validatedData;

  // Check course access and get course data
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select(`
      *,
      course_sessions(*),
      course_resources(*)
    `)
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:read')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if course has content
  if (!course.course_sessions || course.course_sessions.length === 0) {
    return res.status(400).json({ 
      error: 'Course has no sessions to export' 
    });
  }

  try {
    const exportId = uuidv4();
    
    // Create export job record
    const { error: jobError } = await supabaseAdmin
      .from('export_jobs')
      .insert({
        id: exportId,
        course_id: courseId,
        user_id: req.user.id,
        type: 'pdf',
        status: 'pending',
        progress: 0,
        template,
        options,
        created_at: new Date().toISOString()
      });

    if (jobError) throw jobError;

    // Add to export queue
    await exportQueue.add('pdf-export', {
      exportId,
      courseId,
      userId: req.user.id,
      template,
      options,
      course
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    logger.info(`PDF export job created: ${exportId} for course ${courseId}`);
    
    res.status(202).json({
      message: 'PDF export started',
      exportId,
      template,
      statusUrl: `/api/export/status/${exportId}`,
      downloadUrl: `/api/export/download/${exportId}`
    });
  } catch (error) {
    logger.error('Failed to start PDF export:', error);
    res.status(500).json({
      error: 'Failed to start export',
      message: error.message
    });
  }
}));

/**
 * POST /export/ppt - Generate PowerPoint export
 */
router.post('/ppt', authenticateUser, asyncHandler(async (req, res) => {
  const { error: validationError, value: validatedData } = pptExportSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  const { courseId, template, options } = validatedData;

  // Check course access and get course data
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select(`
      *,
      course_sessions(*),
      course_resources(*)
    `)
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:read')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if course has content
  if (!course.course_sessions || course.course_sessions.length === 0) {
    return res.status(400).json({ 
      error: 'Course has no sessions to export' 
    });
  }

  try {
    const exportId = uuidv4();
    
    // Create export job record
    const { error: jobError } = await supabaseAdmin
      .from('export_jobs')
      .insert({
        id: exportId,
        course_id: courseId,
        user_id: req.user.id,
        type: 'ppt',
        status: 'pending',
        progress: 0,
        template,
        options,
        created_at: new Date().toISOString()
      });

    if (jobError) throw jobError;

    // Add to export queue
    await exportQueue.add('ppt-export', {
      exportId,
      courseId,
      userId: req.user.id,
      template,
      options,
      course
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    logger.info(`PowerPoint export job created: ${exportId} for course ${courseId}`);
    
    res.status(202).json({
      message: 'PowerPoint export started',
      exportId,
      template,
      statusUrl: `/api/export/status/${exportId}`,
      downloadUrl: `/api/export/download/${exportId}`
    });
  } catch (error) {
    logger.error('Failed to start PowerPoint export:', error);
    res.status(500).json({
      error: 'Failed to start export',
      message: error.message
    });
  }
}));

/**
 * POST /export/bundle - Generate multiple format bundle export
 */
router.post('/bundle', authenticateUser, asyncHandler(async (req, res) => {
  const { error: validationError, value: validatedData } = bundleExportSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  const { courseId, formats, template, options } = validatedData;

  // Check course access and get course data
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select(`
      *,
      course_sessions(*),
      course_resources(*)
    `)
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:read')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if course has content
  if (!course.course_sessions || course.course_sessions.length === 0) {
    return res.status(400).json({ 
      error: 'Course has no sessions to export' 
    });
  }

  try {
    const exportId = uuidv4();
    
    // Create export job record
    const { error: jobError } = await supabaseAdmin
      .from('export_jobs')
      .insert({
        id: exportId,
        course_id: courseId,
        user_id: req.user.id,
        type: 'bundle',
        status: 'pending',
        progress: 0,
        template,
        options: { ...options, formats },
        metadata: { formats },
        created_at: new Date().toISOString()
      });

    if (jobError) throw jobError;

    // Add to export queue
    await exportQueue.add('bundle-export', {
      exportId,
      courseId,
      userId: req.user.id,
      template,
      formats,
      options,
      course
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    logger.info(`Bundle export job created: ${exportId} for course ${courseId} with formats: ${formats.join(', ')}`);
    
    res.status(202).json({
      message: 'Bundle export started',
      exportId,
      template,
      formats,
      statusUrl: `/api/export/status/${exportId}`,
      downloadUrl: `/api/export/download/${exportId}`
    });
  } catch (error) {
    logger.error('Failed to start bundle export:', error);
    res.status(500).json({
      error: 'Failed to start export',
      message: error.message
    });
  }
}));

/**
 * GET /export/templates - List available templates
 */
router.get('/templates', authenticateUser, asyncHandler(async (req, res) => {
  try {
    const templates = [
      {
        id: 'modern',
        name: 'Modern',
        description: 'Clean, modern design with responsive layout',
        preview: '/api/export/templates/modern/preview.png',
        features: ['Responsive', 'Dark mode', 'Progress tracking', 'Interactive elements'],
        recommended: true
      },
      {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional course layout with sidebar navigation',
        preview: '/api/export/templates/classic/preview.png',
        features: ['Sidebar navigation', 'Print-friendly', 'High contrast'],
        recommended: false
      },
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Clean, distraction-free reading experience',
        preview: '/api/export/templates/minimal/preview.png',
        features: ['Minimal design', 'Fast loading', 'Mobile optimized'],
        recommended: false
      },
      {
        id: 'interactive',
        name: 'Interactive',
        description: 'Rich interactive elements and animations',
        preview: '/api/export/templates/interactive/preview.png',
        features: ['Animations', 'Interactive quizzes', 'Gamification', 'Media rich'],
        recommended: false
      },
      {
        id: 'mobile-first',
        name: 'Mobile First',
        description: 'Optimized for mobile learning experience',
        preview: '/api/export/templates/mobile-first/preview.png',
        features: ['Mobile optimized', 'Touch friendly', 'Offline capable', 'PWA ready'],
        recommended: false
      }
    ];

    // Add usage statistics
    const { data: exportStats } = await supabaseAdmin
      .from('export_jobs')
      .select('template')
      .eq('user_id', req.user.id)
      .eq('type', 'html');

    const templateUsage = {};
    exportStats?.forEach(job => {
      templateUsage[job.template] = (templateUsage[job.template] || 0) + 1;
    });

    const templatesWithStats = templates.map(template => ({
      ...template,
      usageCount: templateUsage[template.id] || 0
    }));

    res.json({
      templates: templatesWithStats,
      defaultTemplate: 'modern'
    });
  } catch (error) {
    logger.error('Failed to get templates:', error);
    res.status(500).json({
      error: 'Failed to get templates',
      message: error.message
    });
  }
}));

/**
 * GET /export/status/:exportId - Check export status
 */
router.get('/status/:exportId', authenticateUser, asyncHandler(async (req, res) => {
  const { exportId } = req.params;

  try {
    const { data: exportJob, error } = await supabaseAdmin
      .from('export_jobs')
      .select('*')
      .eq('id', exportId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !exportJob) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    const response = {
      exportId,
      status: exportJob.status,
      progress: exportJob.progress,
      message: exportJob.message,
      type: exportJob.type,
      template: exportJob.template,
      createdAt: exportJob.created_at,
      updatedAt: exportJob.updated_at,
      completedAt: exportJob.completed_at,
      failedAt: exportJob.failed_at
    };

    // Add download info if completed
    if (exportJob.status === 'completed' && exportJob.file_path) {
      response.downloadReady = true;
      response.downloadUrl = `/api/export/download/${exportId}`;
      response.fileSize = await getFileSize(exportJob.file_path);
      response.fileName = path.basename(exportJob.file_path);
    }

    // Add estimated completion time
    if (['pending', 'processing'].includes(exportJob.status)) {
      response.estimatedCompletion = estimateExportCompletion(exportJob);
    }

    res.json(response);
  } catch (error) {
    logger.error('Failed to get export status:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message
    });
  }
}));

/**
 * GET /export/download/:exportId - Download generated files
 */
router.get('/download/:exportId', authenticateUser, asyncHandler(async (req, res) => {
  const { exportId } = req.params;

  try {
    const { data: exportJob, error } = await supabaseAdmin
      .from('export_jobs')
      .select('*')
      .eq('id', exportId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !exportJob) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    if (exportJob.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Export not completed',
        status: exportJob.status,
        progress: exportJob.progress
      });
    }

    if (!exportJob.file_path) {
      return res.status(404).json({ error: 'Export file not found' });
    }

    const filePath = path.join(EXPORT_DIR, exportJob.file_path);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (fileError) {
      return res.status(404).json({ error: 'Export file no longer available' });
    }

    // Get course title for filename
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('title')
      .eq('id', exportJob.course_id)
      .single();

    // Determine file extension and content type based on export type
    let fileExtension, contentType;
    
    if (exportJob.type === 'pdf') {
      fileExtension = 'pdf';
      contentType = 'application/pdf';
    } else if (exportJob.type === 'ppt') {
      fileExtension = 'pptx';
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else if (exportJob.type === 'bundle') {
      fileExtension = 'zip';
      contentType = 'application/zip';
    } else {
      // HTML and custom HTML exports
      fileExtension = 'zip';
      contentType = 'application/zip';
    }
    
    const fileName = `${sanitizeFileName(course?.title || 'course')}-${exportJob.template}.${fileExtension}`;
    
    // Set download headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Update download stats
    await supabaseAdmin
      .from('export_jobs')
      .update({ 
        downloaded_at: new Date().toISOString(),
        download_count: (exportJob.download_count || 0) + 1
      })
      .eq('id', exportId);

    // Stream file to response
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

    logger.info(`Export downloaded: ${exportId} by user ${req.user.id}`);
  } catch (error) {
    logger.error('Failed to download export:', error);
    res.status(500).json({
      error: 'Failed to download export',
      message: error.message
    });
  }
}));

/**
 * POST /export/customize - Custom export with options
 */
router.post('/customize', authenticateUser, asyncHandler(async (req, res) => {
  const { error: validationError, value: validatedData } = customizeExportSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  const { exportId, customizations } = validatedData;

  // Check if original export exists
  const { data: originalExport, error: exportError } = await supabaseAdmin
    .from('export_jobs')
    .select('*')
    .eq('id', exportId)
    .eq('user_id', req.user.id)
    .single();

  if (exportError || !originalExport) {
    return res.status(404).json({ error: 'Original export not found' });
  }

  try {
    const customExportId = uuidv4();
    
    // Merge original options with customizations
    const mergedOptions = {
      ...originalExport.options,
      ...customizations
    };

    // Create custom export job
    const { error: jobError } = await supabaseAdmin
      .from('export_jobs')
      .insert({
        id: customExportId,
        course_id: originalExport.course_id,
        user_id: req.user.id,
        type: 'html-custom',
        status: 'pending',
        progress: 0,
        template: customizations.template || originalExport.template,
        options: mergedOptions,
        metadata: {
          originalExportId: exportId,
          customizations
        },
        created_at: new Date().toISOString()
      });

    if (jobError) throw jobError;

    // Add to export queue
    await exportQueue.add('html-custom-export', {
      exportId: customExportId,
      originalExportId: exportId,
      courseId: originalExport.course_id,
      userId: req.user.id,
      template: customizations.template || originalExport.template,
      options: mergedOptions,
      customizations
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    logger.info(`Custom export job created: ${customExportId} based on ${exportId}`);
    
    res.status(202).json({
      message: 'Custom export started',
      exportId: customExportId,
      originalExportId: exportId,
      customizations,
      statusUrl: `/api/export/status/${customExportId}`,
      downloadUrl: `/api/export/download/${customExportId}`
    });
  } catch (error) {
    logger.error('Failed to start custom export:', error);
    res.status(500).json({
      error: 'Failed to start custom export',
      message: error.message
    });
  }
}));

/**
 * GET /export/history - Get user's export history
 */
router.get('/history', authenticateUser, asyncHandler(async (req, res) => {
  const { 
    page = 1,
    limit = 20,
    status,
    type,
    courseId
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const maxLimit = Math.min(parseInt(limit), 100);

  try {
    let query = supabaseAdmin
      .from('export_jobs')
      .select(`
        *,
        courses!export_jobs_course_id_fkey(title)
      `, { count: 'exact' })
      .eq('user_id', req.user.id);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + maxLimit - 1);

    const { data: exports, error, count } = await query;

    if (error) throw error;

    // Transform data
    const transformedExports = await Promise.all(exports.map(async exportJob => ({
      id: exportJob.id,
      courseId: exportJob.course_id,
      courseTitle: exportJob.courses?.title,
      type: exportJob.type,
      template: exportJob.template,
      status: exportJob.status,
      progress: exportJob.progress,
      createdAt: exportJob.created_at,
      completedAt: exportJob.completed_at,
      downloadCount: exportJob.download_count || 0,
      fileSize: exportJob.file_path ? await getFileSize(path.join(EXPORT_DIR, exportJob.file_path)) : null
    })));

    res.json({
      exports: transformedExports,
      pagination: {
        page: parseInt(page),
        limit: maxLimit,
        total: count,
        totalPages: Math.ceil(count / maxLimit),
        hasNext: offset + maxLimit < count,
        hasPrev: offset > 0
      }
    });
  } catch (error) {
    logger.error('Failed to get export history:', error);
    res.status(500).json({
      error: 'Failed to get export history',
      message: error.message
    });
  }
}));

/**
 * DELETE /export/:exportId - Delete export and files
 */
router.delete('/:exportId', authenticateUser, asyncHandler(async (req, res) => {
  const { exportId } = req.params;

  try {
    const { data: exportJob, error } = await supabaseAdmin
      .from('export_jobs')
      .select('*')
      .eq('id', exportId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !exportJob) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    // Delete file if exists
    if (exportJob.file_path) {
      const filePath = path.join(EXPORT_DIR, exportJob.file_path);
      try {
        await fs.unlink(filePath);
      } catch (fileError) {
        logger.warn(`Failed to delete export file: ${filePath}`, fileError);
      }
    }

    // Delete job record
    await supabaseAdmin
      .from('export_jobs')
      .delete()
      .eq('id', exportId);

    logger.info(`Export deleted: ${exportId} by user ${req.user.id}`);
    res.json({ message: 'Export deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete export:', error);
    res.status(500).json({
      error: 'Failed to delete export',
      message: error.message
    });
  }
}));

// ==================== HELPER FUNCTIONS ====================

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    return null;
  }
}

function sanitizeFileName(fileName) {
  return fileName
    .replace(/[^a-z0-9\-_\s]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .substring(0, 50);
}

function estimateExportCompletion(exportJob) {
  const baseEstimate = {
    'html': 120, // 2 minutes
    'html-custom': 180, // 3 minutes
    'pdf': 150, // 2.5 minutes
    'ppt': 90, // 1.5 minutes
    'bundle': 300, // 5 minutes (multiple formats)
    'scorm': 300 // 5 minutes
  };

  const estimate = baseEstimate[exportJob.type] || 120;
  
  if (exportJob.progress === 0) {
    return `~${Math.ceil(estimate / 60)} minutes`;
  }

  const elapsed = (new Date() - new Date(exportJob.created_at)) / 1000;
  const estimatedTotal = (elapsed / exportJob.progress) * 100;
  const remaining = Math.max(0, estimatedTotal - elapsed);

  if (remaining < 60) {
    return 'Less than 1 minute';
  } else if (remaining < 3600) {
    return `~${Math.ceil(remaining / 60)} minutes`;
  } else {
    return `~${Math.ceil(remaining / 3600)} hours`;
  }
}

// ==================== QUEUE WORKERS ====================

// HTML Export Worker
exportQueue.process('html-export', async (job) => {
  const { exportId, courseId, userId, template, options, course } = job.data;
  
  try {
    await updateExportStatus(exportId, 'processing', 10, 'Starting HTML generation...');
    
    // Generate HTML export
    const exportPath = await generateHTMLExport(course, template, options, exportId, job);
    
    await updateExportStatus(exportId, 'completed', 100, 'Export completed', exportPath);
    
    logger.info(`HTML export completed: ${exportId}`);
  } catch (error) {
    await updateExportStatus(exportId, 'failed', null, error.message);
    throw error;
  }
});

// Custom HTML Export Worker
exportQueue.process('html-custom-export', async (job) => {
  const { exportId, originalExportId, courseId, userId, template, options, customizations } = job.data;
  
  try {
    await updateExportStatus(exportId, 'processing', 10, 'Starting custom HTML generation...');
    
    // Get course data
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select(`
        *,
        course_sessions(*),
        course_resources(*)
      `)
      .eq('id', courseId)
      .single();

    // Generate custom HTML export
    const exportPath = await generateHTMLExport(course, template, options, exportId, job, customizations);
    
    await updateExportStatus(exportId, 'completed', 100, 'Custom export completed', exportPath);
    
    logger.info(`Custom HTML export completed: ${exportId}`);
  } catch (error) {
    await updateExportStatus(exportId, 'failed', null, error.message);
    throw error;
  }
});

// PDF Export Worker
exportQueue.process('pdf-export', async (job) => {
  const { exportId, courseId, userId, template, options, course } = job.data;
  
  try {
    await updateExportStatus(exportId, 'processing', 10, 'Starting PDF generation...');
    
    // Generate PDF export
    const exportPath = await generatePDFExport(course, template, options, exportId, job);
    
    await updateExportStatus(exportId, 'completed', 100, 'PDF export completed', exportPath);
    
    logger.info(`PDF export completed: ${exportId}`);
  } catch (error) {
    await updateExportStatus(exportId, 'failed', null, error.message);
    throw error;
  }
});

// PowerPoint Export Worker
exportQueue.process('ppt-export', async (job) => {
  const { exportId, courseId, userId, template, options, course } = job.data;
  
  try {
    await updateExportStatus(exportId, 'processing', 10, 'Starting PowerPoint generation...');
    
    // Generate PowerPoint export
    const exportPath = await generatePPTExport(course, template, options, exportId, job);
    
    await updateExportStatus(exportId, 'completed', 100, 'PowerPoint export completed', exportPath);
    
    logger.info(`PowerPoint export completed: ${exportId}`);
  } catch (error) {
    await updateExportStatus(exportId, 'failed', null, error.message);
    throw error;
  }
});

// Bundle Export Worker
exportQueue.process('bundle-export', async (job) => {
  const { exportId, courseId, userId, template, formats, options, course } = job.data;
  
  try {
    await updateExportStatus(exportId, 'processing', 10, 'Starting bundle generation...');
    
    // Generate bundle export
    const exportPath = await generateBundleExport(course, template, formats, options, exportId, job);
    
    await updateExportStatus(exportId, 'completed', 100, 'Bundle export completed', exportPath);
    
    logger.info(`Bundle export completed: ${exportId} with formats: ${formats.join(', ')}`);
  } catch (error) {
    await updateExportStatus(exportId, 'failed', null, error.message);
    throw error;
  }
});

async function updateExportStatus(exportId, status, progress, message, filePath = null) {
  const updates = {
    status,
    updated_at: new Date().toISOString()
  };

  if (progress !== null) updates.progress = progress;
  if (message) updates.message = message;
  if (filePath) updates.file_path = filePath;
  if (status === 'completed') updates.completed_at = new Date().toISOString();
  if (status === 'failed') updates.failed_at = new Date().toISOString();

  await supabaseAdmin
    .from('export_jobs')
    .update(updates)
    .eq('id', exportId);
}

async function generateHTMLExport(course, template, options, exportId, job, customizations = null) {
  try {
    // Update progress
    await job.progress(20);
    await updateExportStatus(exportId, 'processing', 20, 'Initializing HTML export...');
    
    // Prepare export options
    const exportOptions = {
      ...options,
      exportType: options.format === 'single-page' ? 'single-page' : 'multi-page',
      customizations: customizations || options.theme || {},
      createArchive: true
    };
    
    // Update progress
    await job.progress(30);
    await updateExportStatus(exportId, 'processing', 30, 'Generating HTML content...');
    
    // Use the HTML exporter service
    const result = await htmlExporter.generateHTMLExport(
      course.id,
      template,
      exportOptions,
      exportId
    );
    
    // Update progress
    await job.progress(70);
    await updateExportStatus(exportId, 'processing', 70, 'Creating archive...');
    
    // Move the archive to the expected location
    const finalArchivePath = path.join(EXPORT_DIR, `${exportId}.zip`);
    if (result.archivePath && result.archivePath !== finalArchivePath) {
      await fs.rename(result.archivePath, finalArchivePath);
    }
    
    // Update progress
    await job.progress(90);
    await updateExportStatus(exportId, 'processing', 90, 'Finalizing export...');
    
    // Cleanup temporary files
    if (result.outputPath) {
      await fs.rmdir(result.outputPath, { recursive: true }).catch(() => {});
    }
    
    return `${exportId}.zip`;
  } catch (error) {
    logger.error(`HTML export failed for ${exportId}:`, error);
    throw error;
  }
}

async function generatePDFExport(course, template, options, exportId, job) {
  try {
    // Update progress
    await job.progress(20);
    await updateExportStatus(exportId, 'processing', 20, 'Initializing PDF export...');
    
    // Update progress
    await job.progress(30);
    await updateExportStatus(exportId, 'processing', 30, 'Generating PDF content...');
    
    // Use the PDF generator service
    const result = await pdfGenerator.generatePDF(
      course,
      template,
      {
        ...options,
        pdfId: exportId
      }
    );
    
    // Update progress
    await job.progress(80);
    await updateExportStatus(exportId, 'processing', 80, 'Finalizing PDF...');
    
    // Move the PDF to the expected location
    const finalPdfPath = path.join(EXPORT_DIR, `${exportId}.pdf`);
    if (result.pdfPath && result.pdfPath !== finalPdfPath) {
      await fs.rename(result.pdfPath, finalPdfPath);
    }
    
    // Update progress
    await job.progress(90);
    await updateExportStatus(exportId, 'processing', 90, 'PDF export complete...');
    
    return `${exportId}.pdf`;
  } catch (error) {
    logger.error(`PDF export failed for ${exportId}:`, error);
    throw error;
  }
}

async function generatePPTExport(course, template, options, exportId, job) {
  try {
    // Update progress
    await job.progress(20);
    await updateExportStatus(exportId, 'processing', 20, 'Initializing PowerPoint export...');
    
    // Prepare export options
    const exportOptions = {
      ...options,
      pptId: exportId,
      uploadToStorage: options.uploadToStorage || false,
      branding: options.branding || {}
    };
    
    // Update progress
    await job.progress(30);
    await updateExportStatus(exportId, 'processing', 30, 'Generating PowerPoint slides...');
    
    // Use the PowerPoint generator service
    const result = await pptGenerator.generatePowerPoint(
      course,
      template,
      exportOptions
    );
    
    // Update progress
    await job.progress(80);
    await updateExportStatus(exportId, 'processing', 80, 'Finalizing PowerPoint...');
    
    // Move the PowerPoint to the expected location
    const finalPptPath = path.join(EXPORT_DIR, `${exportId}.pptx`);
    if (result.pptPath && result.pptPath !== finalPptPath) {
      await fs.rename(result.pptPath, finalPptPath);
    }
    
    // Update progress
    await job.progress(90);
    await updateExportStatus(exportId, 'processing', 90, 'PowerPoint export complete...');
    
    return `${exportId}.pptx`;
  } catch (error) {
    logger.error(`PowerPoint export failed for ${exportId}:`, error);
    throw error;
  }
}

async function generateBundleExport(course, template, formats, options, exportId, job) {
  try {
    const bundleDir = path.join(EXPORT_DIR, `bundle-${exportId}`);
    await fs.mkdir(bundleDir, { recursive: true });
    
    const formatProgress = 80 / formats.length; // Reserve 20% for final packaging
    let currentProgress = 20;
    
    const generatedFiles = [];
    
    for (let i = 0; i < formats.length; i++) {
      const format = formats[i];
      const startProgress = currentProgress;
      const endProgress = currentProgress + formatProgress;
      
      await updateExportStatus(exportId, 'processing', startProgress, `Generating ${format.toUpperCase()} export...`);
      
      try {
        let filePath;
        let fileName;
        
        if (format === 'html') {
          // Generate HTML export
          const htmlOptions = {
            ...options.htmlOptions,
            exportType: options.htmlOptions?.format === 'single-page' ? 'single-page' : 'multi-page',
            createArchive: false // We'll create our own bundle archive
          };
          
          const result = await htmlExporter.generateHTMLExport(
            course.id,
            template,
            htmlOptions,
            `${exportId}-html`
          );
          
          // Move HTML output to bundle directory
          fileName = `${sanitizeFileName(course.title || 'course')}-${template}-html`;
          filePath = path.join(bundleDir, fileName);
          
          if (result.outputPath) {
            await fs.rename(result.outputPath, filePath);
          }
          
          generatedFiles.push({ format: 'html', fileName, path: filePath });
          
        } else if (format === 'pdf') {
          // Generate PDF export
          const pdfOptions = {
            ...options.pdfOptions,
            pdfId: `${exportId}-pdf`
          };
          
          const result = await pdfGenerator.generatePDF(
            course,
            template,
            pdfOptions
          );
          
          // Move PDF to bundle directory
          fileName = `${sanitizeFileName(course.title || 'course')}-${template}.pdf`;
          filePath = path.join(bundleDir, fileName);
          
          if (result.pdfPath) {
            await fs.rename(result.pdfPath, filePath);
          }
          
          generatedFiles.push({ format: 'pdf', fileName, path: filePath });
          
        } else if (format === 'ppt') {
          // Generate PowerPoint export
          const pptOptions = {
            ...options.pptOptions,
            pptId: `${exportId}-ppt`,
            uploadToStorage: false
          };
          
          const result = await pptGenerator.generatePowerPoint(
            course,
            template,
            pptOptions
          );
          
          // Move PowerPoint to bundle directory
          fileName = `${sanitizeFileName(course.title || 'course')}-${template}.pptx`;
          filePath = path.join(bundleDir, fileName);
          
          if (result.pptPath) {
            await fs.rename(result.pptPath, filePath);
          }
          
          generatedFiles.push({ format: 'ppt', fileName, path: filePath });
        }
        
        currentProgress = endProgress;
        await job.progress(currentProgress);
        
      } catch (formatError) {
        logger.error(`Failed to generate ${format} in bundle ${exportId}:`, formatError);
        // Continue with other formats but log the error
        generatedFiles.push({ 
          format, 
          fileName: `${format}-export-failed.txt`, 
          error: formatError.message 
        });
      }
    }
    
    // Create bundle archive
    await updateExportStatus(exportId, 'processing', 85, 'Creating bundle archive...');
    
    const bundleArchivePath = path.join(EXPORT_DIR, `${exportId}.zip`);
    await createZipArchive(bundleDir, bundleArchivePath);
    
    // Add bundle manifest
    const manifest = {
      exportId,
      courseId: course.id,
      courseTitle: course.title,
      template,
      formats,
      generatedFiles: generatedFiles.map(f => ({
        format: f.format,
        fileName: f.fileName,
        success: !f.error,
        error: f.error || null
      })),
      createdAt: new Date().toISOString()
    };
    
    const manifestPath = path.join(bundleDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    
    // Recreate archive with manifest
    await createZipArchive(bundleDir, bundleArchivePath);
    
    // Cleanup bundle directory
    await fs.rmdir(bundleDir, { recursive: true }).catch(() => {});
    
    await job.progress(95);
    await updateExportStatus(exportId, 'processing', 95, 'Bundle export finalized...');
    
    return `${exportId}.zip`;
  } catch (error) {
    logger.error(`Bundle export failed for ${exportId}:`, error);
    throw error;
  }
}

// Helper function to create archive if needed
async function createZipArchive(sourceDir, zipPath) {
  const output = require('fs').createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  return new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// Ensure export directory exists
fs.mkdir(EXPORT_DIR, { recursive: true }).catch(console.error);

module.exports = router;