const express = require('express');
const Joi = require('joi');
const { supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandling');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'avatars');
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Validation schemas
const updateProfileSchema = Joi.object({
  full_name: Joi.string().max(255),
  username: Joi.string().alphanum().min(3).max(30),
  bio: Joi.string().max(500).allow(''),
  website: Joi.string().uri().allow(''),
  location: Joi.string().max(100).allow(''),
  metadata: Joi.object(),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'auto'),
    language: Joi.string().max(10),
    notifications: Joi.object({
      email: Joi.boolean(),
      push: Joi.boolean(),
      sms: Joi.boolean()
    })
  })
});

/**
 * GET /api/profile - Get current user profile
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select(`
      *,
      courses:courses(count),
      api_keys:api_keys(count)
    `)
    .eq('id', req.user.id)
    .single();

  if (error) {
    logger.error('Failed to fetch user profile:', error);
    return res.status(500).json({
      error: 'Failed to fetch profile',
      message: error.message
    });
  }

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  // Transform the response
  const transformedProfile = {
    ...profile,
    courseCount: profile.courses?.[0]?.count || 0,
    apiKeyCount: profile.api_keys?.[0]?.count || 0,
    courses: undefined,
    api_keys: undefined
  };

  res.json({
    profile: transformedProfile
  });
}));

/**
 * PUT /api/profile - Update profile
 */
router.put('/', authenticateToken, asyncHandler(async (req, res) => {
  const { error: validationError, value: validatedData } = updateProfileSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => d.message)
    });
  }

  // Check if username is taken (if changing username)
  if (validatedData.username) {
    const { data: existingUser } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('username', validatedData.username)
      .neq('id', req.user.id)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }
  }

  const updateData = {
    ...validatedData,
    updated_at: new Date().toISOString()
  };

  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .update(updateData)
    .eq('id', req.user.id)
    .select('*')
    .single();

  if (error) {
    logger.error('Failed to update user profile:', error);
    return res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }

  logger.info(`Profile updated for user ${req.user.id}`);
  res.json({
    message: 'Profile updated successfully',
    profile
  });
}));

/**
 * POST /api/profile/avatar - Upload avatar
 */
router.post('/avatar', authenticateToken, upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Get current profile to delete old avatar
  const { data: currentProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('avatar_url')
    .eq('id', req.user.id)
    .single();

  // Delete old avatar file if exists
  if (currentProfile?.avatar_url && currentProfile.avatar_url.startsWith('/uploads/')) {
    const oldAvatarPath = path.join(process.cwd(), currentProfile.avatar_url);
    try {
      await fs.unlink(oldAvatarPath);
    } catch (err) {
      logger.warn(`Failed to delete old avatar: ${err.message}`);
    }
  }

  // Update profile with new avatar URL
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  
  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.user.id)
    .select('id, avatar_url')
    .single();

  if (error) {
    // Delete uploaded file on error
    await fs.unlink(req.file.path);
    logger.error('Failed to update avatar URL:', error);
    return res.status(500).json({
      error: 'Failed to update avatar',
      message: error.message
    });
  }

  logger.info(`Avatar uploaded for user ${req.user.id}`);
  res.json({
    message: 'Avatar uploaded successfully',
    avatarUrl
  });
}));

/**
 * GET /api/profile/usage - Get usage statistics
 */
router.get('/usage', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get course statistics
  const { data: courseStats, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('status')
    .eq('user_id', userId);

  if (courseError) {
    logger.error('Failed to fetch course stats:', courseError);
    return res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }

  // Get resource statistics
  const { data: resourceStats, error: resourceError } = await supabaseAdmin
    .from('course_resources')
    .select('file_size, status, courses!inner(user_id)')
    .eq('courses.user_id', userId);

  if (resourceError) {
    logger.error('Failed to fetch resource stats:', resourceError);
    return res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }

  // Get generation job statistics
  const { data: jobStats, error: jobError } = await supabaseAdmin
    .from('generation_jobs')
    .select('status, created_at, courses!inner(user_id)')
    .eq('courses.user_id', userId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

  if (jobError) {
    logger.error('Failed to fetch job stats:', jobError);
    return res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }

  // Calculate statistics
  const usage = {
    courses: {
      total: courseStats.length,
      byStatus: courseStats.reduce((acc, course) => {
        acc[course.status] = (acc[course.status] || 0) + 1;
        return acc;
      }, {}),
      draft: courseStats.filter(c => c.status === 'draft').length,
      published: courseStats.filter(c => c.status === 'published').length,
      archived: courseStats.filter(c => c.status === 'archived').length
    },
    resources: {
      total: resourceStats.length,
      totalSize: resourceStats.reduce((sum, r) => sum + (r.file_size || 0), 0),
      processed: resourceStats.filter(r => r.status === 'processed').length,
      pending: resourceStats.filter(r => r.status === 'uploaded' || r.status === 'processing').length
    },
    generation: {
      totalJobs: jobStats.length,
      completed: jobStats.filter(j => j.status === 'completed').length,
      failed: jobStats.filter(j => j.status === 'failed').length,
      pending: jobStats.filter(j => j.status === 'pending' || j.status === 'running').length,
      last30Days: jobStats.length
    },
    storage: {
      used: resourceStats.reduce((sum, r) => sum + (r.file_size || 0), 0),
      limit: 5 * 1024 * 1024 * 1024, // 5GB default limit
      percentage: Math.round((resourceStats.reduce((sum, r) => sum + (r.file_size || 0), 0) / (5 * 1024 * 1024 * 1024)) * 100 * 100) / 100
    },
    lastActivity: new Date().toISOString()
  };

  // Add human-readable storage sizes
  usage.storage.usedFormatted = formatBytes(usage.storage.used);
  usage.storage.limitFormatted = formatBytes(usage.storage.limit);

  res.json({ usage });
}));

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;