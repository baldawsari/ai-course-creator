const express = require('express');
const Joi = require('joi');
const { supabaseAdmin } = require('../config/database');
const { 
  authenticateUser, 
  requireAuth, 
  refreshSession,
  rateLimitByUser 
} = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandling');

const router = express.Router();

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'instructor', 'student').default('student'),
  organization: Joi.string().max(100).optional(),
  useCase: Joi.string().max(500).optional()
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// ==================== AUTHENTICATION ENDPOINTS ====================

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', 
  rateLimitByUser({ max: 5, windowMs: 15 * 60 * 1000, message: 'Too many login attempts. Please try again later.' }),
  asyncHandler(async (req, res) => {
    const { error: validationError, value: validatedData } = loginSchema.validate(req.body);
    
    if (validationError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.details.map(d => d.message)
      });
    }

    const { email, password } = validatedData;

    try {
      // Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        console.error('Failed to fetch user profile:', profileError);
        return res.status(500).json({
          error: 'Authentication failed',
          message: 'Unable to fetch user profile'
        });
      }

      // Return user data with tokens
      res.json({
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          role: profile.role,
          organization: profile.metadata?.organization,
          metadata: profile.metadata
        },
        token: authData.session.access_token,
        refreshToken: authData.session.refresh_token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Authentication failed',
        message: 'An error occurred during login'
      });
    }
  })
);

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register',
  rateLimitByUser({ max: 3, windowMs: 60 * 60 * 1000, message: 'Too many registration attempts. Please try again later.' }),
  asyncHandler(async (req, res) => {
    const { error: validationError, value: validatedData } = registerSchema.validate(req.body);
    
    if (validationError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.details.map(d => d.message)
      });
    }

    const { email, password, name, role, organization, useCase } = validatedData;

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          return res.status(409).json({
            error: 'User already exists',
            message: 'An account with this email already exists'
          });
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('User creation failed');
      }

      // Create user profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email,
          full_name: name,
          role,
          metadata: {
            organization,
            useCase,
            registeredAt: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (profileError) {
        // Rollback auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      // Return user data with tokens
      res.status(201).json({
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          role: profile.role,
          organization: profile.metadata?.organization,
          metadata: profile.metadata
        },
        token: authData.session.access_token,
        refreshToken: authData.session.refresh_token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'An error occurred during registration'
      });
    }
  })
);

/**
 * POST /api/auth/refresh
 * Refresh authentication tokens
 */
router.post('/refresh',
  rateLimitByUser({ max: 10, windowMs: 15 * 60 * 1000 }),
  asyncHandler(async (req, res) => {
    const { error: validationError, value: validatedData } = refreshTokenSchema.validate(req.body);
    
    if (validationError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.details.map(d => d.message)
      });
    }

    const { refreshToken } = validatedData;

    try {
      // Use the refreshSession helper from auth middleware
      const { accessToken, refreshToken: newRefreshToken } = await refreshSession(refreshToken);

      res.json({
        token: accessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        error: 'Token refresh failed',
        message: 'Invalid or expired refresh token'
      });
    }
  })
);

/**
 * POST /api/auth/logout
 * Logout user and clear tokens
 */
router.post('/logout',
  authenticateUser,
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      // Sign out from Supabase if we have a token
      if (req.token) {
        await supabaseAdmin.auth.signOut(req.token);
      }

      // Return success response
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if Supabase logout fails, we still return success
      // as the client will clear tokens anyway
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    }
  })
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me',
  authenticateUser,
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      // Get full user profile
      const { data: profile, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', req.user.id)
        .single();

      if (error || !profile) {
        return res.status(404).json({
          error: 'User not found',
          message: 'Unable to fetch user profile'
        });
      }

      // Return user data
      res.json({
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        role: profile.role,
        organization: profile.metadata?.organization,
        metadata: profile.metadata,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      });
    } catch (error) {
      console.error('Fetch user error:', error);
      res.status(500).json({
        error: 'Failed to fetch user',
        message: 'An error occurred while fetching user profile'
      });
    }
  })
);

module.exports = router;