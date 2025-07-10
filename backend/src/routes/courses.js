const express = require('express');
const Joi = require('joi');
const { supabaseAdmin } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandling');
const courseGenerator = require('../services/courseGenerator');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const courseSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(2000).allow(''),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced').default('intermediate'),
  duration: Joi.string().max(50).default('4 weeks'),
  target_audience: Joi.string().max(500).allow(''),
  prerequisites: Joi.array().items(Joi.string().max(200)).default([]),
  objectives: Joi.array().items(Joi.string().max(300)).default([]),
  tags: Joi.array().items(Joi.string().max(50)).default([]),
  settings: Joi.object().default({})
});

const updateCourseSchema = Joi.object({
  title: Joi.string().min(3).max(200),
  description: Joi.string().max(2000).allow(''),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced'),
  duration: Joi.string().max(50),
  target_audience: Joi.string().max(500).allow(''),
  prerequisites: Joi.array().items(Joi.string().max(200)),
  objectives: Joi.array().items(Joi.string().max(300)),
  tags: Joi.array().items(Joi.string().max(50)),
  settings: Joi.object(),
  status: Joi.string().valid('draft', 'published', 'archived')
});

const sessionSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(2000).allow(''),
  duration_minutes: Joi.number().integer().min(5).max(480).default(60),
  objectives: Joi.array().items(Joi.string().max(300)).default([]),
  content: Joi.object().default({}),
  sequence_number: Joi.number().integer().min(1)
});

const reorderSessionsSchema = Joi.object({
  sessions: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      sequence_number: Joi.number().integer().min(1).required()
    })
  ).min(1).required()
});

// ==================== COURSE CRUD OPERATIONS ====================

/**
 * GET /courses - List user's courses with pagination and filtering
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    level,
    status,
    sortBy = 'created_at',
    sortOrder = 'desc',
    tags
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const maxLimit = Math.min(parseInt(limit), 100);

  let query = supabaseAdmin
    .from('courses')
    .select(`
      id,
      title,
      description,
      level,
      duration,
      target_audience,
      prerequisites,
      objectives,
      tags,
      status,
      created_at,
      updated_at,
      metadata,
      user_profiles!courses_user_id_fkey(username, role),
      course_sessions(count),
      course_resources(count)
    `, { count: 'exact' })
    .eq('user_id', req.user.id);

  // Apply filters
  if (search) {
    query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%`);
  }

  if (level) {
    query = query.eq('level', level);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    query = query.overlaps('tags', tagArray);
  }

  // Apply sorting
  const validSortFields = ['title', 'level', 'status', 'created_at', 'updated_at'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder.toLowerCase() === 'asc' ? true : false;

  query = query.order(sortField, { ascending: order });

  // Apply pagination
  query = query.range(offset, offset + maxLimit - 1);

  const { data: courses, error, count } = await query;

  if (error) {
    logger.error('Failed to fetch courses:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch courses',
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
    pagination: {
      page: parseInt(page),
      limit: maxLimit,
      total: count,
      totalPages: Math.ceil(count / maxLimit),
      hasNext: offset + maxLimit < count,
      hasPrev: offset > 0
    }
  });
}));

/**
 * POST /courses - Create new course
 */
router.post('/', authenticateToken, requirePermission('courses', 'create'), asyncHandler(async (req, res) => {
  const { error: validationError, value: validatedData } = courseSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  const courseData = {
    ...validatedData,
    user_id: req.user.id,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: course, error } = await supabaseAdmin
    .from('courses')
    .insert(courseData)
    .select(`
      *,
      user_profiles!courses_user_id_fkey(username, role)
    `)
    .single();

  if (error) {
    logger.error('Failed to create course:', error);
    return res.status(500).json({
      error: 'Failed to create course',
      message: error.message
    });
  }

  logger.info(`Course created: ${course.id} by user ${req.user.id}`);
  
  res.status(201).json({
    message: 'Course created successfully',
    course: {
      ...course,
      sessionCount: 0,
      resourceCount: 0
    }
  });
}));

/**
 * GET /courses/:id - Get course details
 */
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: course, error } = await supabaseAdmin
    .from('courses')
    .select(`
      *,
      user_profiles!courses_user_id_fkey(username, role),
      course_sessions(
        id,
        title,
        description,
        duration_minutes,
        sequence_number,
        objectives,
        created_at
      ),
      course_resources(
        id,
        file_name,
        file_type,
        file_size,
        quality_score,
        status,
        upload_date
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Course not found' });
    }
    logger.error('Failed to fetch course:', error);
    return res.status(500).json({
      error: 'Failed to fetch course',
      message: error.message
    });
  }

  // Check permissions
  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:manage')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Sort sessions by sequence number
  if (course.course_sessions) {
    course.course_sessions.sort((a, b) => a.sequence_number - b.sequence_number);
  }

  res.json({
    course: {
      ...course,
      sessionCount: course.course_sessions?.length || 0,
      resourceCount: course.course_resources?.length || 0
    }
  });
}));

/**
 * PUT /courses/:id - Update course
 */
router.put('/:id', authenticateToken, requirePermission('courses', 'update'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const { error: validationError, value: validatedData } = updateCourseSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  // Check if course exists and user has permission
  const { data: existingCourse, error: fetchError } = await supabaseAdmin
    .from('courses')
    .select('user_id')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Course not found' });
    }
    return res.status(500).json({ error: 'Failed to fetch course' });
  }

  if (existingCourse.user_id !== req.user.id && !req.user.permissions.includes('courses:manage')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const updateData = {
    ...validatedData,
    updated_at: new Date().toISOString()
  };

  const { data: course, error } = await supabaseAdmin
    .from('courses')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      user_profiles!courses_user_id_fkey(username, role)
    `)
    .single();

  if (error) {
    logger.error('Failed to update course:', error);
    return res.status(500).json({
      error: 'Failed to update course',
      message: error.message
    });
  }

  logger.info(`Course updated: ${id} by user ${req.user.id}`);
  res.json({
    message: 'Course updated successfully',
    course
  });
}));

/**
 * DELETE /courses/:id - Delete course
 */
router.delete('/:id', authenticateToken, requirePermission('courses', 'delete'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if course exists and user has permission
  const { data: existingCourse, error: fetchError } = await supabaseAdmin
    .from('courses')
    .select('user_id, title')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Course not found' });
    }
    return res.status(500).json({ error: 'Failed to fetch course' });
  }

  if (existingCourse.user_id !== req.user.id && !req.user.permissions.includes('courses:manage')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Delete course (cascading deletes will handle related records)
  const { error } = await supabaseAdmin
    .from('courses')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error('Failed to delete course:', error);
    return res.status(500).json({
      error: 'Failed to delete course',
      message: error.message
    });
  }

  logger.info(`Course deleted: ${id} (${existingCourse.title}) by user ${req.user.id}`);
  res.json({ message: 'Course deleted successfully' });
}));

// ==================== RESOURCE MANAGEMENT ====================

/**
 * GET /courses/:id/resources - List course resources
 */
router.get('/:id/resources', authenticateToken, asyncHandler(async (req, res) => {
  const { id: courseId } = req.params;
  const { 
    minQuality,
    fileType,
    status,
    sortBy = 'upload_date',
    sortOrder = 'desc' 
  } = req.query;

  // Check course access
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('user_id')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:read')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  let query = supabaseAdmin
    .from('course_resources')
    .select('*')
    .eq('course_id', courseId);

  // Apply filters
  if (minQuality) {
    query = query.gte('quality_score', parseInt(minQuality));
  }

  if (fileType) {
    query = query.eq('file_type', fileType);
  }

  if (status) {
    query = query.eq('status', status);
  }

  // Apply sorting
  const validSortFields = ['file_name', 'quality_score', 'upload_date', 'file_size'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'upload_date';
  const order = sortOrder.toLowerCase() === 'asc' ? true : false;

  query = query.order(sortField, { ascending: order });

  const { data: resources, error } = await query;

  if (error) {
    logger.error('Failed to fetch course resources:', error);
    return res.status(500).json({
      error: 'Failed to fetch resources',
      message: error.message
    });
  }

  res.json({
    resources,
    summary: {
      total: resources.length,
      processed: resources.filter(r => r.status === 'processed').length,
      averageQuality: resources.length > 0 
        ? Math.round(resources.reduce((sum, r) => sum + (r.quality_score || 0), 0) / resources.length * 10) / 10
        : 0
    }
  });
}));

/**
 * POST /courses/:id/resources - Add resources to course
 */
router.post('/:id/resources', authenticateToken, requirePermission('resources', 'create'), asyncHandler(async (req, res) => {
  const { id: courseId } = req.params;
  const { resourceIds } = req.body;

  if (!Array.isArray(resourceIds) || resourceIds.length === 0) {
    return res.status(400).json({ 
      error: 'resourceIds must be a non-empty array' 
    });
  }

  // Check course exists and user has permission
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('user_id')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:update')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Update resources to link them to the course
  const { data: updatedResources, error } = await supabaseAdmin
    .from('course_resources')
    .update({ course_id: courseId })
    .in('id', resourceIds)
    .eq('user_id', req.user.id) // Ensure user owns the resources
    .select('*');

  if (error) {
    logger.error('Failed to add resources to course:', error);
    return res.status(500).json({
      error: 'Failed to add resources',
      message: error.message
    });
  }

  logger.info(`Added ${updatedResources.length} resources to course ${courseId}`);
  res.json({
    message: `Successfully added ${updatedResources.length} resources to course`,
    resources: updatedResources
  });
}));

/**
 * DELETE /courses/:id/resources/:resourceId - Remove resource from course
 */
router.delete('/:id/resources/:resourceId', authenticateToken, requirePermission('resources', 'delete'), asyncHandler(async (req, res) => {
  const { id: courseId, resourceId } = req.params;

  // Check course exists and user has permission
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('user_id')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:update')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Remove resource from course (set course_id to null)
  const { data: updatedResource, error } = await supabaseAdmin
    .from('course_resources')
    .update({ course_id: null })
    .eq('id', resourceId)
    .eq('course_id', courseId)
    .eq('user_id', req.user.id)
    .select('file_name')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Resource not found in this course' });
    }
    logger.error('Failed to remove resource from course:', error);
    return res.status(500).json({
      error: 'Failed to remove resource',
      message: error.message
    });
  }

  logger.info(`Removed resource ${resourceId} from course ${courseId}`);
  res.json({ 
    message: `Resource "${updatedResource.file_name}" removed from course` 
  });
}));

// ==================== SESSION MANAGEMENT ====================

/**
 * GET /courses/:id/sessions - List course sessions
 */
router.get('/:id/sessions', authenticateToken, asyncHandler(async (req, res) => {
  const { id: courseId } = req.params;

  // Check course access
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('user_id')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:read')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { data: sessions, error } = await supabaseAdmin
    .from('course_sessions')
    .select('*')
    .eq('course_id', courseId)
    .order('sequence_number', { ascending: true });

  if (error) {
    logger.error('Failed to fetch course sessions:', error);
    return res.status(500).json({
      error: 'Failed to fetch sessions',
      message: error.message
    });
  }

  res.json({
    sessions,
    summary: {
      total: sessions.length,
      totalDuration: sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
    }
  });
}));

/**
 * POST /courses/:id/sessions - Add session to course
 */
router.post('/:id/sessions', authenticateToken, requirePermission('courses', 'update'), asyncHandler(async (req, res) => {
  const { id: courseId } = req.params;
  
  const { error: validationError, value: validatedData } = sessionSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  // Check course exists and user has permission
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('user_id')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:update')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Get next sequence number if not provided
  let sequenceNumber = validatedData.sequence_number;
  if (!sequenceNumber) {
    const { data: lastSession } = await supabaseAdmin
      .from('course_sessions')
      .select('sequence_number')
      .eq('course_id', courseId)
      .order('sequence_number', { ascending: false })
      .limit(1)
      .single();

    sequenceNumber = (lastSession?.sequence_number || 0) + 1;
  }

  const sessionData = {
    ...validatedData,
    course_id: courseId,
    sequence_number: sequenceNumber,
    created_at: new Date().toISOString()
  };

  const { data: session, error } = await supabaseAdmin
    .from('course_sessions')
    .insert(sessionData)
    .select('*')
    .single();

  if (error) {
    logger.error('Failed to create session:', error);
    return res.status(500).json({
      error: 'Failed to create session',
      message: error.message
    });
  }

  logger.info(`Session created: ${session.id} for course ${courseId}`);
  res.status(201).json({
    message: 'Session created successfully',
    session
  });
}));

/**
 * PUT /courses/:id/sessions/:sessionId - Update session
 */
router.put('/:id/sessions/:sessionId', authenticateToken, requirePermission('courses', 'update'), asyncHandler(async (req, res) => {
  const { id: courseId, sessionId } = req.params;
  
  const { error: validationError, value: validatedData } = sessionSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  // Check course and session exist and user has permission
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('course_sessions')
    .select('course_id, courses!inner(user_id)')
    .eq('id', sessionId)
    .eq('course_id', courseId)
    .single();

  if (sessionError || !session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.courses.user_id !== req.user.id && !req.user.permissions.includes('courses:update')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const updateData = {
    ...validatedData,
    updated_at: new Date().toISOString()
  };

  const { data: updatedSession, error } = await supabaseAdmin
    .from('course_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select('*')
    .single();

  if (error) {
    logger.error('Failed to update session:', error);
    return res.status(500).json({
      error: 'Failed to update session',
      message: error.message
    });
  }

  logger.info(`Session updated: ${sessionId} in course ${courseId}`);
  res.json({
    message: 'Session updated successfully',
    session: updatedSession
  });
}));

/**
 * DELETE /courses/:id/sessions/:sessionId - Delete session
 */
router.delete('/:id/sessions/:sessionId', authenticateToken, requirePermission('courses', 'update'), asyncHandler(async (req, res) => {
  const { id: courseId, sessionId } = req.params;

  // Check course and session exist and user has permission
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('course_sessions')
    .select('title, sequence_number, courses!inner(user_id)')
    .eq('id', sessionId)
    .eq('course_id', courseId)
    .single();

  if (sessionError || !session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.courses.user_id !== req.user.id && !req.user.permissions.includes('courses:update')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Delete session
  const { error } = await supabaseAdmin
    .from('course_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    logger.error('Failed to delete session:', error);
    return res.status(500).json({
      error: 'Failed to delete session',
      message: error.message
    });
  }

  // Reorder remaining sessions
  await supabaseAdmin
    .from('course_sessions')
    .update({ 
      sequence_number: supabaseAdmin.raw('sequence_number - 1'),
      updated_at: new Date().toISOString()
    })
    .eq('course_id', courseId)
    .gt('sequence_number', session.sequence_number);

  logger.info(`Session deleted: ${sessionId} (${session.title}) from course ${courseId}`);
  res.json({ message: `Session "${session.title}" deleted successfully` });
}));

/**
 * POST /courses/:id/sessions/reorder - Reorder sessions
 */
router.post('/:id/sessions/reorder', authenticateToken, requirePermission('courses', 'update'), asyncHandler(async (req, res) => {
  const { id: courseId } = req.params;
  
  const { error: validationError, value: validatedData } = reorderSessionsSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  // Check course exists and user has permission
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('user_id')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:update')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Verify all sessions belong to the course
  const sessionIds = validatedData.sessions.map(s => s.id);
  const { data: existingSessions, error: sessionError } = await supabaseAdmin
    .from('course_sessions')
    .select('id')
    .eq('course_id', courseId)
    .in('id', sessionIds);

  if (sessionError || existingSessions.length !== sessionIds.length) {
    return res.status(400).json({ error: 'Invalid session IDs provided' });
  }

  // Update sequence numbers
  const updatePromises = validatedData.sessions.map(session => 
    supabaseAdmin
      .from('course_sessions')
      .update({ 
        sequence_number: session.sequence_number,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.id)
      .eq('course_id', courseId)
  );

  const results = await Promise.all(updatePromises);
  
  // Check for errors
  const errors = results.filter(result => result.error);
  if (errors.length > 0) {
    logger.error('Failed to reorder sessions:', errors);
    return res.status(500).json({
      error: 'Failed to reorder sessions',
      details: errors.map(e => e.error.message)
    });
  }

  logger.info(`Sessions reordered for course ${courseId}`);
  res.json({ message: 'Sessions reordered successfully' });
}));

// ==================== GENERATION AND EXPORT ====================

/**
 * POST /courses/:id/generate - Start course generation
 */
router.post('/:id/generate', authenticateToken, requirePermission('generation', 'create'), asyncHandler(async (req, res) => {
  const { id: courseId } = req.params;

  // Check course exists and user has permission
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('user_id, title')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:update')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const { jobId } = await courseGenerator.createGenerationJob(courseId, req.user.id);
    
    logger.info(`Generation job created: ${jobId} for course ${courseId}`);
    res.status(202).json({
      message: 'Course generation started',
      jobId,
      statusUrl: `/api/courses/${courseId}/generation/${jobId}`
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
 * GET /courses/:id/generation/:jobId - Get generation status
 */
router.get('/:id/generation/:jobId', authenticateToken, asyncHandler(async (req, res) => {
  const { id: courseId, jobId } = req.params;

  // Check course access
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('user_id')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (course.user_id !== req.user.id && !req.user.permissions.includes('courses:read')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const status = await courseGenerator.getJobStatus(jobId);
    res.json({ status });
  } catch (error) {
    logger.error('Failed to get generation status:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message
    });
  }
}));

/**
 * GET /courses/:id/export - Export course data
 */
router.get('/:id/export', authenticateToken, asyncHandler(async (req, res) => {
  const { id: courseId } = req.params;
  const { format = 'json' } = req.query;

  // Check course access
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

  // Sort sessions by sequence
  if (course.course_sessions) {
    course.course_sessions.sort((a, b) => a.sequence_number - b.sequence_number);
  }

  const exportData = {
    course: {
      ...course,
      course_sessions: undefined,
      course_resources: undefined
    },
    sessions: course.course_sessions || [],
    resources: course.course_resources || [],
    exportedAt: new Date().toISOString(),
    exportedBy: req.user.id
  };

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="course-${courseId}.json"`);
    res.json(exportData);
  } else {
    res.status(400).json({ error: 'Unsupported export format' });
  }
}));

module.exports = router;