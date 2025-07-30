const express = require('express');
const { supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandling');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/dashboard/stats - Get dashboard statistics
 */
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get course statistics
  const { data: courses, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('id, status, created_at, updated_at')
    .eq('user_id', userId);

  if (courseError) {
    logger.error('Failed to fetch course stats:', courseError);
    return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }

  // Get session statistics
  const { data: sessions, error: sessionError } = await supabaseAdmin
    .from('course_sessions')
    .select('id, duration_minutes, courses!inner(user_id)')
    .eq('courses.user_id', userId);

  if (sessionError) {
    logger.error('Failed to fetch session stats:', sessionError);
    return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }

  // Get resource statistics
  const { data: resources, error: resourceError } = await supabaseAdmin
    .from('course_resources')
    .select('id, file_size, status, quality_score, created_at, courses!inner(user_id)')
    .eq('courses.user_id', userId);

  if (resourceError) {
    logger.error('Failed to fetch resource stats:', resourceError);
    return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }

  // Get generation job statistics
  const { data: jobs, error: jobError } = await supabaseAdmin
    .from('generation_jobs')
    .select('id, status, created_at, courses!inner(user_id)')
    .eq('courses.user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  if (jobError) {
    logger.error('Failed to fetch job stats:', jobError);
    return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }

  // Calculate statistics
  const stats = {
    overview: {
      totalCourses: courses.length,
      activeCourses: courses.filter(c => c.status === 'published').length,
      draftCourses: courses.filter(c => c.status === 'draft').length,
      totalSessions: sessions.length,
      totalResources: resources.length,
      totalDuration: sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
    },
    recent: {
      coursesCreatedThisWeek: courses.filter(c => new Date(c.created_at) >= sevenDaysAgo).length,
      coursesUpdatedThisWeek: courses.filter(c => new Date(c.updated_at) >= sevenDaysAgo).length,
      resourcesUploadedThisWeek: resources.filter(r => new Date(r.created_at) >= sevenDaysAgo).length,
      generationsThisMonth: jobs.length
    },
    resources: {
      total: resources.length,
      processed: resources.filter(r => r.status === 'processed').length,
      processing: resources.filter(r => r.status === 'processing').length,
      failed: resources.filter(r => r.status === 'failed').length,
      totalSize: resources.reduce((sum, r) => sum + (r.file_size || 0), 0),
      averageQuality: resources.length > 0 
        ? Math.round(resources.reduce((sum, r) => sum + (r.quality_score || 0), 0) / resources.length * 10) / 10
        : 0
    },
    generation: {
      total: jobs.length,
      successful: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      pending: jobs.filter(j => j.status === 'pending' || j.status === 'running').length,
      successRate: jobs.length > 0 
        ? Math.round((jobs.filter(j => j.status === 'completed').length / jobs.length) * 100)
        : 0
    },
    trends: {
      coursesByMonth: calculateMonthlyTrend(courses, 'created_at', 6),
      generationsByWeek: calculateWeeklyTrend(jobs, 'created_at', 4)
    }
  };

  res.json({ stats });
}));

/**
 * GET /api/dashboard/recent - Get recent courses
 */
router.get('/recent', authenticateToken, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const maxLimit = Math.min(parseInt(limit), 50);

  const { data: courses, error } = await supabaseAdmin
    .from('courses')
    .select(`
      id,
      title,
      description,
      status,
      level,
      created_at,
      updated_at,
      course_sessions(count),
      course_resources(count)
    `)
    .eq('user_id', req.user.id)
    .order('updated_at', { ascending: false })
    .limit(maxLimit);

  if (error) {
    logger.error('Failed to fetch recent courses:', error);
    return res.status(500).json({
      error: 'Failed to fetch recent courses',
      message: error.message
    });
  }

  // Transform data to include counts
  const transformedCourses = courses.map(course => ({
    ...course,
    sessionCount: course.course_sessions?.[0]?.count || 0,
    resourceCount: course.course_resources?.[0]?.count || 0,
    course_sessions: undefined,
    course_resources: undefined
  }));

  res.json({
    courses: transformedCourses,
    total: transformedCourses.length
  });
}));

/**
 * GET /api/dashboard/activity - Get activity feed
 */
router.get('/activity', authenticateToken, asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const maxLimit = Math.min(parseInt(limit), 100);
  const userId = req.user.id;

  // Create activity feed from various sources
  const activities = [];

  // Get recent course activities
  const { data: courseActivities } = await supabaseAdmin
    .from('courses')
    .select('id, title, status, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(maxLimit);

  if (courseActivities) {
    courseActivities.forEach(course => {
      // Course creation
      activities.push({
        type: 'course_created',
        timestamp: course.created_at,
        data: {
          courseId: course.id,
          courseTitle: course.title
        },
        message: `Created course "${course.title}"`
      });

      // Course status changes
      if (course.status === 'published' && course.updated_at !== course.created_at) {
        activities.push({
          type: 'course_published',
          timestamp: course.updated_at,
          data: {
            courseId: course.id,
            courseTitle: course.title
          },
          message: `Published course "${course.title}"`
        });
      }
    });
  }

  // Get recent resource uploads
  const { data: resourceActivities } = await supabaseAdmin
    .from('course_resources')
    .select('id, file_name, file_type, created_at, courses!inner(title, user_id)')
    .eq('courses.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(maxLimit);

  if (resourceActivities) {
    resourceActivities.forEach(resource => {
      activities.push({
        type: 'resource_uploaded',
        timestamp: resource.created_at,
        data: {
          resourceId: resource.id,
          fileName: resource.file_name,
          fileType: resource.file_type,
          courseTitle: resource.courses?.title
        },
        message: `Uploaded ${resource.file_name} to "${resource.courses?.title}"`
      });
    });
  }

  // Get recent generation jobs
  const { data: jobActivities } = await supabaseAdmin
    .from('generation_jobs')
    .select('id, status, created_at, updated_at, courses!inner(title, user_id)')
    .eq('courses.user_id', userId)
    .in('status', ['completed', 'failed'])
    .order('updated_at', { ascending: false })
    .limit(maxLimit);

  if (jobActivities) {
    jobActivities.forEach(job => {
      if (job.status === 'completed') {
        activities.push({
          type: 'generation_completed',
          timestamp: job.updated_at,
          data: {
            jobId: job.id,
            courseTitle: job.courses?.title
          },
          message: `Course generation completed for "${job.courses?.title}"`
        });
      } else if (job.status === 'failed') {
        activities.push({
          type: 'generation_failed',
          timestamp: job.updated_at,
          data: {
            jobId: job.id,
            courseTitle: job.courses?.title
          },
          message: `Course generation failed for "${job.courses?.title}"`
        });
      }
    });
  }

  // Sort activities by timestamp
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply pagination
  const paginatedActivities = activities.slice(parseInt(offset), parseInt(offset) + maxLimit);

  res.json({
    activities: paginatedActivities,
    pagination: {
      offset: parseInt(offset),
      limit: maxLimit,
      total: activities.length,
      hasMore: parseInt(offset) + maxLimit < activities.length
    }
  });
}));

// Helper functions
function calculateMonthlyTrend(items, dateField, months) {
  const trend = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const count = items.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate && itemDate <= endDate;
    }).length;

    trend.push({
      month: startDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
      count
    });
  }

  return trend;
}

function calculateWeeklyTrend(items, dateField, weeks) {
  const trend = [];
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const startDate = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    
    const count = items.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate && itemDate < endDate;
    }).length;

    trend.push({
      week: `Week ${weeks - i}`,
      startDate: startDate.toISOString().split('T')[0],
      count
    });
  }

  return trend;
}

module.exports = router;