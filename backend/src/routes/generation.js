const express = require('express');
const Joi = require('joi');
const { supabaseAdmin } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandling');
const courseGenerator = require('../services/courseGenerator');
const ragPipeline = require('../services/ragPipeline');
const claudeService = require('../services/claudeService');
const logger = require('../utils/logger');
const Bull = require('bull');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Job queue for generation tasks
const generationQueue = new Bull('generation-tasks', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  }
});

// Validation schemas
const analyzeContentSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  resourceIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  options: Joi.object({
    minQuality: Joi.number().min(0).max(100).default(50),
    includeTopics: Joi.boolean().default(true),
    includeReadability: Joi.boolean().default(true),
    includeRecommendations: Joi.boolean().default(true)
  }).default({})
});

const generateCourseSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  options: Joi.object({
    minQuality: Joi.number().min(0).max(100).default(70),
    useAdvancedGeneration: Joi.boolean().default(true),
    includeAssessments: Joi.boolean().default(true),
    sessionCount: Joi.number().min(1).max(20),
    customPrompts: Joi.object().default({})
  }).default({})
});

const regenerateSchema = Joi.object({
  jobId: Joi.string().uuid().required(),
  sections: Joi.array().items(
    Joi.string().valid('outline', 'sessions', 'assessments', 'activities')
  ).min(1).required(),
  options: Joi.object({
    preserveExisting: Joi.boolean().default(false),
    customPrompts: Joi.object().default({})
  }).default({})
});

// ==================== GENERATION ROUTES ====================

/**
 * POST /generation/analyze - Analyze uploaded content
 */
router.post('/analyze', authenticateToken, requirePermission('generation', 'create'), asyncHandler(async (req, res) => {
  const { error: validationError, value: validatedData } = analyzeContentSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  const { courseId, resourceIds, options } = validatedData;

  // Check course access
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('user_id, title')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:read')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    // Verify resources belong to the course
    const { data: resources, error: resourceError } = await supabaseAdmin
      .from('course_resources')
      .select('*')
      .eq('course_id', courseId)
      .in('id', resourceIds)
      .gte('quality_score', options.minQuality);

    if (resourceError) {
      throw new Error(`Failed to fetch resources: ${resourceError.message}`);
    }

    if (resources.length === 0) {
      return res.status(400).json({ 
        error: 'No valid resources found meeting quality criteria' 
      });
    }

    // Perform content analysis
    const analysis = {
      courseId,
      resourceCount: resources.length,
      qualityDistribution: analyzeQualityDistribution(resources),
      contentTypes: analyzeContentTypes(resources),
      totalWordCount: resources.reduce((sum, r) => sum + (r.quality_report?.wordCount || 0), 0),
      estimatedDuration: estimateContentDuration(resources),
      readability: options.includeReadability ? analyzeReadability(resources) : null,
      topics: options.includeTopics ? await analyzeTopics(resources, courseId) : null,
      recommendations: options.includeRecommendations ? generateAnalysisRecommendations(resources) : null,
      analyzedAt: new Date().toISOString()
    };

    // Cache analysis results
    await supabaseAdmin
      .from('generation_jobs')
      .insert({
        id: uuidv4(),
        course_id: courseId,
        user_id: req.user.id,
        type: 'analysis',
        status: 'completed',
        progress: 100,
        result: analysis,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });

    logger.info(`Content analysis completed for course ${courseId}, ${resources.length} resources analyzed`);
    
    res.json({
      message: 'Content analysis completed',
      analysis
    });
  } catch (error) {
    logger.error('Content analysis failed:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
}));

/**
 * POST /generation/generate - Start course generation
 */
router.post('/generate', authenticateToken, requirePermission('generation', 'create'), asyncHandler(async (req, res) => {
  const { error: validationError, value: validatedData } = generateCourseSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  const { courseId, options } = validatedData;

  // Check course access
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('user_id, title, status')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:update')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if generation is already in progress
  const { data: existingJob } = await supabaseAdmin
    .from('generation_jobs')
    .select('id, status')
    .eq('course_id', courseId)
    .eq('type', 'generation')
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existingJob) {
    return res.status(409).json({
      error: 'Generation already in progress',
      jobId: existingJob.id
    });
  }

  try {
    let jobId;
    
    if (options.useAdvancedGeneration) {
      // Use the enhanced course generator
      const result = await courseGenerator.createGenerationJob(courseId, req.user.id);
      jobId = result.jobId;
    } else {
      // Use basic generation
      jobId = await createBasicGenerationJob(courseId, req.user.id, options);
    }

    logger.info(`Generation job created: ${jobId} for course ${courseId}`);
    
    res.status(202).json({
      message: 'Course generation started',
      jobId,
      statusUrl: `/api/generation/status/${jobId}`,
      resultUrl: `/api/generation/result/${jobId}`
    });
  } catch (error) {
    logger.error('Failed to start course generation:', error);
    res.status(500).json({
      error: 'Failed to start generation',
      message: error.message
    });
  }
}));

/**
 * GET /generation/status/:jobId - Check generation status
 */
router.get('/status/:jobId', authenticateToken, asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  try {
    const status = await getJobStatus(jobId, req.user.id);
    
    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId,
      status: status.status,
      progress: status.progress,
      message: status.message,
      type: status.type,
      createdAt: status.created_at,
      updatedAt: status.updated_at,
      completedAt: status.completed_at,
      failedAt: status.failed_at,
      estimatedCompletion: estimateCompletion(status),
      metrics: await getJobMetrics(jobId)
    });
  } catch (error) {
    logger.error('Failed to get generation status:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message
    });
  }
}));

/**
 * GET /generation/result/:jobId - Get generation result
 */
router.get('/result/:jobId', authenticateToken, asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  try {
    const job = await getJobStatus(jobId, req.user.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Job not completed',
        status: job.status,
        progress: job.progress
      });
    }

    // Get detailed course data if generation was successful
    let result = job.result;
    
    if (job.type === 'generation') {
      const { data: course, error } = await supabaseAdmin
        .from('courses')
        .select(`
          *,
          course_sessions(*),
          course_resources(*)
        `)
        .eq('id', job.course_id)
        .single();

      if (!error && course) {
        // Sort sessions by sequence
        if (course.course_sessions) {
          course.course_sessions.sort((a, b) => a.sequence_number - b.sequence_number);
        }

        result = {
          ...result,
          course: {
            ...course,
            sessionCount: course.course_sessions?.length || 0,
            resourceCount: course.course_resources?.length || 0
          }
        };
      }
    }

    res.json({
      jobId,
      type: job.type,
      completedAt: job.completed_at,
      result
    });
  } catch (error) {
    logger.error('Failed to get generation result:', error);
    res.status(500).json({
      error: 'Failed to get result',
      message: error.message
    });
  }
}));

/**
 * POST /generation/regenerate - Regenerate specific sections
 */
router.post('/regenerate', authenticateToken, requirePermission('generation', 'create'), asyncHandler(async (req, res) => {
  const { error: validationError, value: validatedData } = regenerateSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  const { jobId, sections, options } = validatedData;

  // Check if original job exists and user has access
  const originalJob = await getJobStatus(jobId, req.user.id);
  
  if (!originalJob || originalJob.type !== 'generation') {
    return res.status(404).json({ error: 'Original generation job not found' });
  }

  if (originalJob.status !== 'completed') {
    return res.status(400).json({ 
      error: 'Original job must be completed before regeneration' 
    });
  }

  try {
    // Create regeneration job
    const regenerationJobId = uuidv4();
    
    const { error: jobError } = await supabaseAdmin
      .from('generation_jobs')
      .insert({
        id: regenerationJobId,
        course_id: originalJob.course_id,
        user_id: req.user.id,
        type: 'regeneration',
        status: 'pending',
        progress: 0,
        metadata: {
          originalJobId: jobId,
          sections,
          options,
          preserveExisting: options.preserveExisting
        },
        created_at: new Date().toISOString()
      });

    if (jobError) throw jobError;

    // Add to processing queue
    await generationQueue.add('regenerate-sections', {
      jobId: regenerationJobId,
      originalJobId: jobId,
      courseId: originalJob.course_id,
      userId: req.user.id,
      sections,
      options
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    logger.info(`Regeneration job created: ${regenerationJobId} for sections: ${sections.join(', ')}`);
    
    res.status(202).json({
      message: 'Section regeneration started',
      jobId: regenerationJobId,
      originalJobId: jobId,
      sections,
      statusUrl: `/api/generation/status/${regenerationJobId}`
    });
  } catch (error) {
    logger.error('Failed to start regeneration:', error);
    res.status(500).json({
      error: 'Failed to start regeneration',
      message: error.message
    });
  }
}));

/**
 * GET /generation/metrics - Get generation metrics and analytics
 */
router.get('/metrics', authenticateToken, requirePermission('generation', 'read'), asyncHandler(async (req, res) => {
  const { 
    timeframe = '7d',
    courseId,
    groupBy = 'day'
  } = req.query;

  try {
    const timeframeDays = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    }[timeframe] || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    let query = supabaseAdmin
      .from('generation_jobs')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('created_at', startDate.toISOString());

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data: jobs, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    const metrics = {
      summary: {
        totalJobs: jobs.length,
        completedJobs: jobs.filter(j => j.status === 'completed').length,
        failedJobs: jobs.filter(j => j.status === 'failed').length,
        inProgressJobs: jobs.filter(j => ['pending', 'processing'].includes(j.status)).length,
        averageCompletionTime: calculateAverageCompletionTime(jobs.filter(j => j.status === 'completed')),
        successRate: jobs.length > 0 ? (jobs.filter(j => j.status === 'completed').length / jobs.length * 100).toFixed(1) + '%' : '0%'
      },
      byType: groupJobsByType(jobs),
      timeline: groupJobsByTime(jobs, groupBy),
      recentJobs: jobs.slice(0, 10).map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        createdAt: job.created_at,
        completedAt: job.completed_at
      }))
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get generation metrics:', error);
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error.message
    });
  }
}));

// ==================== HELPER FUNCTIONS ====================

function analyzeQualityDistribution(resources) {
  const distribution = {
    premium: resources.filter(r => r.quality_score >= 85).length,
    recommended: resources.filter(r => r.quality_score >= 70 && r.quality_score < 85).length,
    acceptable: resources.filter(r => r.quality_score >= 50 && r.quality_score < 70).length,
    below: resources.filter(r => r.quality_score < 50).length
  };

  const avgScore = resources.reduce((sum, r) => sum + r.quality_score, 0) / resources.length;

  return {
    ...distribution,
    averageScore: Math.round(avgScore * 10) / 10,
    total: resources.length
  };
}

function analyzeContentTypes(resources) {
  const types = {};
  resources.forEach(r => {
    types[r.file_type] = (types[r.file_type] || 0) + 1;
  });
  return types;
}

function estimateContentDuration(resources) {
  const totalWords = resources.reduce((sum, r) => sum + (r.quality_report?.wordCount || 0), 0);
  const readingMinutes = totalWords / 200; // 200 words per minute
  const courseMinutes = readingMinutes * 1.5; // Add time for exercises

  return {
    reading: Math.round(readingMinutes),
    course: Math.round(courseMinutes),
    formatted: formatDuration(courseMinutes)
  };
}

function analyzeReadability(resources) {
  const scores = resources
    .map(r => r.quality_report?.readability?.score)
    .filter(score => score !== undefined);

  if (scores.length === 0) return null;

  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  return {
    averageScore: Math.round(avgScore * 10) / 10,
    level: getReadabilityLevel(avgScore),
    distribution: groupReadabilityScores(scores)
  };
}

async function analyzeTopics(resources, courseId) {
  try {
    const topics = new Map();
    
    for (const resource of resources) {
      const keyPhrases = resource.quality_report?.keyPhrases || [];
      keyPhrases.forEach(phrase => {
        topics.set(phrase, (topics.get(phrase) || 0) + 1);
      });
    }

    return Array.from(topics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([topic, count]) => ({ topic, count }));
  } catch (error) {
    logger.warn('Topic analysis failed:', error);
    return [];
  }
}

function generateAnalysisRecommendations(resources) {
  const recommendations = [];
  const avgQuality = resources.reduce((sum, r) => sum + r.quality_score, 0) / resources.length;

  if (avgQuality < 70) {
    recommendations.push({
      type: 'quality',
      priority: 'high',
      message: 'Consider improving content quality before generation'
    });
  }

  if (resources.length < 3) {
    recommendations.push({
      type: 'content',
      priority: 'medium',
      message: 'Add more resources for comprehensive course coverage'
    });
  }

  const wordCounts = resources.map(r => r.quality_report?.wordCount || 0);
  const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);

  if (totalWords < 5000) {
    recommendations.push({
      type: 'length',
      priority: 'medium',
      message: 'Content may be too brief for a comprehensive course'
    });
  }

  return recommendations;
}

async function createBasicGenerationJob(courseId, userId, options) {
  const jobId = uuidv4();
  
  const { error } = await supabaseAdmin
    .from('generation_jobs')
    .insert({
      id: jobId,
      course_id: courseId,
      user_id: userId,
      type: 'generation',
      status: 'pending',
      progress: 0,
      metadata: options,
      created_at: new Date().toISOString()
    });

  if (error) throw error;

  // Add to basic generation queue
  await generationQueue.add('basic-generation', {
    jobId,
    courseId,
    userId,
    options
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  });

  return jobId;
}

async function getJobStatus(jobId, userId) {
  const { data: job, error } = await supabaseAdmin
    .from('generation_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return job;
}

async function getJobMetrics(jobId) {
  try {
    // Get basic metrics for the job
    const job = await supabaseAdmin
      .from('generation_jobs')
      .select('created_at, updated_at, completed_at, failed_at, metadata')
      .eq('id', jobId)
      .single();

    if (job.error) return null;

    const metrics = {
      duration: null,
      tokensUsed: job.data?.metadata?.tokensUsed || 0,
      apiCalls: job.data?.metadata?.apiCalls || 0
    };

    if (job.data?.completed_at) {
      const duration = new Date(job.data.completed_at) - new Date(job.data.created_at);
      metrics.duration = Math.round(duration / 1000); // seconds
    }

    return metrics;
  } catch (error) {
    logger.warn('Failed to get job metrics:', error);
    return null;
  }
}

function estimateCompletion(status) {
  if (status.status === 'completed' || status.status === 'failed') {
    return null;
  }

  if (status.progress === 0) {
    return 'Estimating...';
  }

  const elapsed = new Date() - new Date(status.created_at);
  const estimatedTotal = (elapsed / status.progress) * 100;
  const remaining = estimatedTotal - elapsed;

  if (remaining < 60000) { // Less than 1 minute
    return 'Less than 1 minute';
  } else if (remaining < 3600000) { // Less than 1 hour
    return `${Math.ceil(remaining / 60000)} minutes`;
  } else {
    return `${Math.ceil(remaining / 3600000)} hours`;
  }
}

function calculateAverageCompletionTime(completedJobs) {
  if (completedJobs.length === 0) return 0;

  const durations = completedJobs
    .filter(job => job.completed_at && job.created_at)
    .map(job => new Date(job.completed_at) - new Date(job.created_at));

  const avgDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  return Math.round(avgDuration / 1000); // Return in seconds
}

function groupJobsByType(jobs) {
  const groups = {};
  jobs.forEach(job => {
    if (!groups[job.type]) {
      groups[job.type] = { total: 0, completed: 0, failed: 0 };
    }
    groups[job.type].total++;
    if (job.status === 'completed') groups[job.type].completed++;
    if (job.status === 'failed') groups[job.type].failed++;
  });
  return groups;
}

function groupJobsByTime(jobs, groupBy) {
  const groups = {};
  
  jobs.forEach(job => {
    const date = new Date(job.created_at);
    let key;
    
    if (groupBy === 'hour') {
      key = date.toISOString().substring(0, 13) + ':00:00.000Z';
    } else if (groupBy === 'day') {
      key = date.toISOString().substring(0, 10);
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().substring(0, 10);
    }
    
    if (!groups[key]) {
      groups[key] = { total: 0, completed: 0, failed: 0 };
    }
    
    groups[key].total++;
    if (job.status === 'completed') groups[key].completed++;
    if (job.status === 'failed') groups[key].failed++;
  });
  
  return groups;
}

function getReadabilityLevel(score) {
  if (score >= 90) return 'Very Easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly Easy';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly Difficult';
  if (score >= 30) return 'Difficult';
  return 'Very Difficult';
}

function groupReadabilityScores(scores) {
  const ranges = {
    'Very Easy (90-100)': 0,
    'Easy (80-89)': 0,
    'Fairly Easy (70-79)': 0,
    'Standard (60-69)': 0,
    'Fairly Difficult (50-59)': 0,
    'Difficult (30-49)': 0,
    'Very Difficult (0-29)': 0
  };

  scores.forEach(score => {
    if (score >= 90) ranges['Very Easy (90-100)']++;
    else if (score >= 80) ranges['Easy (80-89)']++;
    else if (score >= 70) ranges['Fairly Easy (70-79)']++;
    else if (score >= 60) ranges['Standard (60-69)']++;
    else if (score >= 50) ranges['Fairly Difficult (50-59)']++;
    else if (score >= 30) ranges['Difficult (30-49)']++;
    else ranges['Very Difficult (0-29)']++;
  });

  return ranges;
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

// Initialize queue workers
generationQueue.process('basic-generation', async (job) => {
  // Basic generation processing would go here
  // This is a simplified version
  logger.info(`Processing basic generation job: ${job.data.jobId}`);
});

generationQueue.process('regenerate-sections', async (job) => {
  // Section regeneration processing would go here
  logger.info(`Processing regeneration job: ${job.data.jobId} for sections: ${job.data.sections.join(', ')}`);
});

module.exports = router;