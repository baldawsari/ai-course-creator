const express = require('express');
const Joi = require('joi');
const { supabaseAdmin } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandling');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const updateSessionSchema = Joi.object({
  title: Joi.string().min(3).max(200),
  description: Joi.string().max(2000).allow(''),
  duration_minutes: Joi.number().integer().min(5).max(480),
  objectives: Joi.array().items(Joi.string().max(300)),
  content: Joi.object()
});

const reorderSessionsSchema = Joi.object({
  sessions: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      sequence_number: Joi.number().integer().min(1).required()
    })
  ).min(1).required()
});

const activitySchema = Joi.object({
  id: Joi.string().uuid(),
  type: Joi.string().valid('lecture', 'quiz', 'assignment', 'discussion', 'lab', 'reading').required(),
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(2000).allow(''),
  duration_minutes: Joi.number().integer().min(5).max(240),
  content: Joi.object(),
  order: Joi.number().integer().min(0)
});

// ==================== SESSION OPERATIONS ====================

/**
 * PUT /api/sessions/:id - Update session
 */
router.put('/:id', authenticateToken, requirePermission('courses', 'update'), asyncHandler(async (req, res) => {
  const { id: sessionId } = req.params;
  
  const { error: validationError, value: validatedData } = updateSessionSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  // Check session exists and user has permission
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('course_sessions')
    .select('*, courses!inner(user_id)')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.courses.user_id !== req.user.id && !req.user.permissions.includes('courses:manage')) {
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

  logger.info(`Session updated: ${sessionId}`);
  res.json({
    message: 'Session updated successfully',
    session: updatedSession
  });
}));

/**
 * DELETE /api/sessions/:id - Delete session
 */
router.delete('/:id', authenticateToken, requirePermission('courses', 'delete'), asyncHandler(async (req, res) => {
  const { id: sessionId } = req.params;

  // Check session exists and user has permission
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('course_sessions')
    .select('title, sequence_number, course_id, courses!inner(user_id)')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.courses.user_id !== req.user.id && !req.user.permissions.includes('courses:manage')) {
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
    .eq('course_id', session.course_id)
    .gt('sequence_number', session.sequence_number);

  logger.info(`Session deleted: ${sessionId} (${session.title})`);
  res.json({ message: `Session "${session.title}" deleted successfully` });
}));

/**
 * PUT /api/sessions/:id/reorder - Reorder sessions
 */
router.put('/:id/reorder', authenticateToken, requirePermission('courses', 'update'), asyncHandler(async (req, res) => {
  const { id: sessionId } = req.params;
  const { newPosition } = req.body;

  if (!newPosition || newPosition < 1) {
    return res.status(400).json({ error: 'Invalid position' });
  }

  // Get session and verify permissions
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('course_sessions')
    .select('*, courses!inner(user_id)')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.courses.user_id !== req.user.id && !req.user.permissions.includes('courses:manage')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const oldPosition = session.sequence_number;
  
  if (oldPosition === newPosition) {
    return res.json({ message: 'Session already at that position' });
  }

  // Get all sessions for the course
  const { data: allSessions, error: fetchError } = await supabaseAdmin
    .from('course_sessions')
    .select('id, sequence_number')
    .eq('course_id', session.course_id)
    .order('sequence_number');

  if (fetchError) {
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }

  // Reorder sessions
  const updates = [];
  
  if (newPosition > oldPosition) {
    // Moving down: shift sessions up
    allSessions.forEach(s => {
      if (s.sequence_number > oldPosition && s.sequence_number <= newPosition) {
        updates.push({
          id: s.id,
          sequence_number: s.sequence_number - 1
        });
      }
    });
  } else {
    // Moving up: shift sessions down
    allSessions.forEach(s => {
      if (s.sequence_number >= newPosition && s.sequence_number < oldPosition) {
        updates.push({
          id: s.id,
          sequence_number: s.sequence_number + 1
        });
      }
    });
  }

  // Add the moved session
  updates.push({
    id: sessionId,
    sequence_number: newPosition
  });

  // Update all affected sessions
  const updatePromises = updates.map(update => 
    supabaseAdmin
      .from('course_sessions')
      .update({ 
        sequence_number: update.sequence_number,
        updated_at: new Date().toISOString()
      })
      .eq('id', update.id)
  );

  const results = await Promise.all(updatePromises);
  const errors = results.filter(result => result.error);
  
  if (errors.length > 0) {
    logger.error('Failed to reorder sessions:', errors);
    return res.status(500).json({
      error: 'Failed to reorder sessions',
      details: errors.map(e => e.error.message)
    });
  }

  logger.info(`Session ${sessionId} moved from position ${oldPosition} to ${newPosition}`);
  res.json({ message: 'Session reordered successfully' });
}));

// ==================== ACTIVITY OPERATIONS ====================

/**
 * GET /api/sessions/:sessionId/activities - List session activities
 */
router.get('/:sessionId/activities', authenticateToken, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  // Get session and check permissions
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('course_sessions')
    .select('activities, courses!inner(user_id)')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.courses.user_id !== req.user.id && !req.user.permissions.includes('courses:read')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const activities = session.activities || [];
  
  res.json({
    activities,
    summary: {
      total: activities.length,
      byType: activities.reduce((acc, activity) => {
        acc[activity.type] = (acc[activity.type] || 0) + 1;
        return acc;
      }, {}),
      totalDuration: activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0)
    }
  });
}));

/**
 * POST /api/sessions/:sessionId/activities - Create activity
 */
router.post('/:sessionId/activities', authenticateToken, requirePermission('courses', 'update'), asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  const { error: validationError, value: validatedData } = activitySchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  // Get session and check permissions
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('course_sessions')
    .select('activities, courses!inner(user_id)')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.courses.user_id !== req.user.id && !req.user.permissions.includes('courses:update')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Add activity to session
  const activities = session.activities || [];
  const newActivity = {
    ...validatedData,
    id: validatedData.id || require('uuid').v4(),
    created_at: new Date().toISOString()
  };

  // Set order if not provided
  if (newActivity.order === undefined) {
    newActivity.order = activities.length;
  }

  activities.push(newActivity);

  // Update session with new activities
  const { data: updatedSession, error } = await supabaseAdmin
    .from('course_sessions')
    .update({ 
      activities,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    .select('activities')
    .single();

  if (error) {
    logger.error('Failed to create activity:', error);
    return res.status(500).json({
      error: 'Failed to create activity',
      message: error.message
    });
  }

  logger.info(`Activity created in session ${sessionId}`);
  res.status(201).json({
    message: 'Activity created successfully',
    activity: newActivity
  });
}));

/**
 * PUT /api/activities/:id - Update activity
 */
router.put('/activities/:id', authenticateToken, requirePermission('courses', 'update'), asyncHandler(async (req, res) => {
  const { id: activityId } = req.params;
  
  const { error: validationError, value: validatedData } = activitySchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  // Find session containing this activity
  const { data: sessions, error: searchError } = await supabaseAdmin
    .from('course_sessions')
    .select('id, activities, courses!inner(user_id)')
    .contains('activities', JSON.stringify([{ id: activityId }]));

  if (searchError || !sessions || sessions.length === 0) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  const session = sessions[0];

  if (session.courses.user_id !== req.user.id && !req.user.permissions.includes('courses:update')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Update activity in activities array
  const activities = session.activities || [];
  const activityIndex = activities.findIndex(a => a.id === activityId);
  
  if (activityIndex === -1) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  activities[activityIndex] = {
    ...activities[activityIndex],
    ...validatedData,
    id: activityId,
    updated_at: new Date().toISOString()
  };

  // Update session with modified activities
  const { data: updatedSession, error } = await supabaseAdmin
    .from('course_sessions')
    .update({ 
      activities,
      updated_at: new Date().toISOString()
    })
    .eq('id', session.id)
    .select('activities')
    .single();

  if (error) {
    logger.error('Failed to update activity:', error);
    return res.status(500).json({
      error: 'Failed to update activity',
      message: error.message
    });
  }

  logger.info(`Activity ${activityId} updated in session ${session.id}`);
  res.json({
    message: 'Activity updated successfully',
    activity: activities[activityIndex]
  });
}));

/**
 * DELETE /api/activities/:id - Delete activity
 */
router.delete('/activities/:id', authenticateToken, requirePermission('courses', 'delete'), asyncHandler(async (req, res) => {
  const { id: activityId } = req.params;

  // Find session containing this activity
  const { data: sessions, error: searchError } = await supabaseAdmin
    .from('course_sessions')
    .select('id, activities, courses!inner(user_id)')
    .contains('activities', JSON.stringify([{ id: activityId }]));

  if (searchError || !sessions || sessions.length === 0) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  const session = sessions[0];

  if (session.courses.user_id !== req.user.id && !req.user.permissions.includes('courses:delete')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Remove activity from activities array
  const activities = session.activities || [];
  const activityIndex = activities.findIndex(a => a.id === activityId);
  
  if (activityIndex === -1) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  const deletedActivity = activities[activityIndex];
  activities.splice(activityIndex, 1);

  // Reorder remaining activities
  activities.forEach((activity, index) => {
    if (activity.order > deletedActivity.order) {
      activity.order = activity.order - 1;
    }
  });

  // Update session with modified activities
  const { error } = await supabaseAdmin
    .from('course_sessions')
    .update({ 
      activities,
      updated_at: new Date().toISOString()
    })
    .eq('id', session.id);

  if (error) {
    logger.error('Failed to delete activity:', error);
    return res.status(500).json({
      error: 'Failed to delete activity',
      message: error.message
    });
  }

  logger.info(`Activity ${activityId} deleted from session ${session.id}`);
  res.json({ 
    message: `Activity "${deletedActivity.title}" deleted successfully` 
  });
}));

module.exports = router;