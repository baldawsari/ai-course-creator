const express = require('express');
const Joi = require('joi');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const { supabaseAdmin } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandling');
const logger = require('../utils/logger');
const Bull = require('bull');
const { v4: uuidv4 } = require('uuid');

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
router.post('/html', authenticateToken, requirePermission('export', 'create'), asyncHandler(async (req, res) => {
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
 * GET /export/templates - List available templates
 */
router.get('/templates', authenticateToken, asyncHandler(async (req, res) => {
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
router.get('/status/:exportId', authenticateToken, asyncHandler(async (req, res) => {
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
router.get('/download/:exportId', authenticateToken, asyncHandler(async (req, res) => {
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

    const fileName = `${sanitizeFileName(course?.title || 'course')}-${exportJob.template}.zip`;
    
    // Set download headers
    res.setHeader('Content-Type', 'application/zip');
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
router.post('/customize', authenticateToken, requirePermission('export', 'create'), asyncHandler(async (req, res) => {
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
router.get('/history', authenticateToken, asyncHandler(async (req, res) => {
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
    const transformedExports = exports.map(exportJob => ({
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
    }));

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
router.delete('/:exportId', authenticateToken, asyncHandler(async (req, res) => {
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
  // This would contain the actual HTML generation logic
  // For now, this is a placeholder that creates a simple export
  
  const exportDir = path.join(EXPORT_DIR, exportId);
  await fs.mkdir(exportDir, { recursive: true });
  
  // Update progress
  await job.progress(30);
  await updateExportStatus(exportId, 'processing', 30, 'Generating course content...');
  
  // Generate HTML files
  await generateCourseHTML(course, template, options, exportDir, customizations);
  
  // Update progress
  await job.progress(60);
  await updateExportStatus(exportId, 'processing', 60, 'Adding assets and styling...');
  
  // Copy assets if requested
  if (options.includeAssets) {
    await copyAssets(template, exportDir);
  }
  
  // Update progress
  await job.progress(80);
  await updateExportStatus(exportId, 'processing', 80, 'Creating archive...');
  
  // Create ZIP archive
  const zipPath = path.join(EXPORT_DIR, `${exportId}.zip`);
  await createZipArchive(exportDir, zipPath);
  
  // Cleanup temporary directory
  await fs.rmdir(exportDir, { recursive: true });
  
  return `${exportId}.zip`;
}

async function generateCourseHTML(course, template, options, exportDir, customizations) {
  // Sort sessions by sequence
  const sessions = course.course_sessions.sort((a, b) => a.sequence_number - b.sequence_number);
  
  // Generate main HTML structure
  const htmlContent = generateCourseHTMLContent(course, sessions, template, options, customizations);
  
  if (options.format === 'single-page') {
    await fs.writeFile(path.join(exportDir, 'index.html'), htmlContent);
  } else {
    // Multi-page format
    await generateMultiPageHTML(course, sessions, template, options, exportDir, customizations);
  }
}

function generateCourseHTMLContent(course, sessions, template, options, customizations) {
  // This would contain the actual HTML template generation logic
  // Placeholder implementation
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${course.title}</title>
    <link rel="stylesheet" href="assets/css/${template}.css">
</head>
<body>
    <header>
        <h1>${course.title}</h1>
        <p>${course.description}</p>
    </header>
    <main>
        ${sessions.map(session => `
            <section class="session">
                <h2>${session.title}</h2>
                <p>${session.description}</p>
                <div class="content">
                    ${JSON.stringify(session.content)}
                </div>
            </section>
        `).join('')}
    </main>
    <footer>
        <p>Generated with AI Course Creator</p>
    </footer>
</body>
</html>
  `;
}

async function generateMultiPageHTML(course, sessions, template, options, exportDir, customizations) {
  // Generate index page
  const indexContent = generateIndexPage(course, sessions, template, options);
  await fs.writeFile(path.join(exportDir, 'index.html'), indexContent);
  
  // Generate session pages
  for (const session of sessions) {
    const sessionContent = generateSessionPage(session, course, template, options);
    await fs.writeFile(path.join(exportDir, `session-${session.sequence_number}.html`), sessionContent);
  }
}

function generateIndexPage(course, sessions, template, options) {
  // Placeholder index page generator
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${course.title}</title>
    <link rel="stylesheet" href="assets/css/${template}.css">
</head>
<body>
    <header>
        <h1>${course.title}</h1>
        <p>${course.description}</p>
    </header>
    <main>
        <nav class="course-nav">
            <ul>
                ${sessions.map(session => `
                    <li><a href="session-${session.sequence_number}.html">${session.title}</a></li>
                `).join('')}
            </ul>
        </nav>
    </main>
</body>
</html>
  `;
}

function generateSessionPage(session, course, template, options) {
  // Placeholder session page generator
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${session.title} - ${course.title}</title>
    <link rel="stylesheet" href="assets/css/${template}.css">
</head>
<body>
    <header>
        <h1>${session.title}</h1>
        <a href="index.html">← Back to Course</a>
    </header>
    <main>
        <div class="session-content">
            <p>${session.description}</p>
            <div class="content">
                ${JSON.stringify(session.content)}
            </div>
        </div>
    </main>
</body>
</html>
  `;
}

async function copyAssets(template, exportDir) {
  const assetsDir = path.join(exportDir, 'assets');
  await fs.mkdir(assetsDir, { recursive: true });
  
  // Copy CSS
  const cssDir = path.join(assetsDir, 'css');
  await fs.mkdir(cssDir, { recursive: true });
  
  // This would copy actual template assets
  const cssContent = generateTemplateCSS(template);
  await fs.writeFile(path.join(cssDir, `${template}.css`), cssContent);
}

function generateTemplateCSS(template) {
  // Placeholder CSS generator
  const baseCSS = `
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    header { border-bottom: 1px solid #ccc; margin-bottom: 20px; }
    .session { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; }
    .course-nav ul { list-style: none; padding: 0; }
    .course-nav li { margin: 10px 0; }
    .course-nav a { text-decoration: none; color: #007bff; }
  `;
  
  const templateStyles = {
    modern: `
      body { background: #f8f9fa; }
      .session { border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    `,
    classic: `
      body { background: white; }
      .session { border: 2px solid #333; }
    `,
    minimal: `
      body { background: white; font-size: 18px; line-height: 1.6; }
      .session { border: none; border-left: 4px solid #007bff; }
    `
  };
  
  return baseCSS + (templateStyles[template] || '');
}

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