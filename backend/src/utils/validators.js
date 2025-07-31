const { URL } = require('url');
const path = require('path');
const logger = require('./logger');

/**
 * Validation utilities for file, course configuration, URL, and content quality validation
 */

// File validation constants
const ALLOWED_FILE_TYPES = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain'],
  md: ['text/markdown', 'text/x-markdown'],
  csv: ['text/csv'],
  json: ['application/json']
};

const ALLOWED_EXTENSIONS = Object.keys(ALLOWED_FILE_TYPES).concat(['doc']);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MIN_FILE_SIZE = 10; // 10 bytes

// Course configuration constants
const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
const COURSE_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'hi', 'ru'];
const MIN_COURSE_DURATION = 1; // 1 hour
const MAX_COURSE_DURATION = 200; // 200 hours
const MAX_SESSIONS = 50;
const MIN_SESSIONS = 1;

// Content quality thresholds
const QUALITY_THRESHOLDS = {
  premium: 85,
  recommended: 70,
  minimum: 50
};

/**
 * Validate file type and size
 * @param {Object} file - File object from multer
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateFile(file, options = {}) {
  const errors = [];
  const warnings = [];

  try {
    // Check if file exists
    if (!file) {
      errors.push('No file provided');
      return { valid: false, errors, warnings };
    }

    // Check required file properties
    if (!file.mimetype) {
      errors.push('File mimetype is required');
    }
    if (!file.originalname) {
      errors.push('File originalname is required');
    }
    if (file.size === undefined || file.size === null) {
      errors.push('File size is required');
    }

    // Validate file size
    const maxSize = options.maxSize || MAX_FILE_SIZE;
    const minSize = options.minSize || MIN_FILE_SIZE;

    if (file.size > maxSize) {
      errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`);
    }

    if (file.size < minSize) {
      errors.push(`File size (${formatFileSize(file.size)}) is below minimum required size (${formatFileSize(minSize)})`);
    }

    // Validate file type
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    const allowedTypes = options.allowedTypes || ALLOWED_FILE_TYPES;
    const allowedExtensions = options.allowedExtensions || ALLOWED_EXTENSIONS;

    if (!allowedExtensions.includes(ext)) {
      errors.push(`File extension '${ext}' is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }

    // Validate MIME type if available
    if (file.mimetype && allowedTypes[ext]) {
      const validMimeTypes = Array.isArray(allowedTypes[ext]) ? allowedTypes[ext] : [allowedTypes[ext]];
      if (!validMimeTypes.includes(file.mimetype)) {
        warnings.push(`File MIME type '${file.mimetype}' doesn't match expected types for .${ext}: ${validMimeTypes.join(', ')}`);
      }
    }

    // Check for suspicious file characteristics
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      errors.push('File name contains suspicious path characters');
    }

    // Validate file name length
    if (file.originalname.length > 255) {
      errors.push('File name is too long (max 255 characters)');
    }

    // Add file metadata validation
    const metadata = {
      extension: ext,
      size: file.size,
      humanSize: formatFileSize(file.size),
      mimetype: file.mimetype || 'unknown',
      originalName: file.originalname
    };

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata
    };
  } catch (error) {
    logger.error('File validation error:', error);
    return {
      valid: false,
      errors: ['File validation failed: ' + error.message],
      warnings
    };
  }
}

/**
 * Validate course configuration
 * @param {Object} config - Course configuration object
 * @returns {Object} Validation result
 */
function validateCourseConfig(config) {
  const errors = [];
  const warnings = [];

  try {
    // Required fields
    if (!config.title || config.title.trim().length === 0) {
      errors.push('Course title is required');
    } else if (config.title.length > 200) {
      errors.push('Course title is too long (max 200 characters)');
    }

    if (!config.description || config.description.trim().length === 0) {
      errors.push('Course description is required');
    } else if (config.description.length > 2000) {
      errors.push('Course description is too long (max 2000 characters)');
    }

    // Validate level
    if (config.level && !COURSE_LEVELS.includes(config.level)) {
      errors.push(`Invalid course level. Must be one of: ${COURSE_LEVELS.join(', ')}`);
    }

    // Validate language
    if (config.language && !COURSE_LANGUAGES.includes(config.language)) {
      warnings.push(`Unsupported language code '${config.language}'. Supported languages: ${COURSE_LANGUAGES.join(', ')}`);
    }

    // Validate duration
    if (config.duration !== undefined) {
      const duration = Number(config.duration);
      if (isNaN(duration)) {
        errors.push('Course duration must be a number');
      } else if (duration < MIN_COURSE_DURATION) {
        errors.push(`Course duration must be at least ${MIN_COURSE_DURATION} hour(s)`);
      } else if (duration > MAX_COURSE_DURATION) {
        errors.push(`Course duration cannot exceed ${MAX_COURSE_DURATION} hours`);
      }
    }

    // Validate sessions
    if (config.sessionCount !== undefined) {
      const sessionCount = Number(config.sessionCount);
      if (isNaN(sessionCount)) {
        errors.push('Session count must be a number');
      } else if (sessionCount < MIN_SESSIONS) {
        errors.push(`Course must have at least ${MIN_SESSIONS} session(s)`);
      } else if (sessionCount > MAX_SESSIONS) {
        errors.push(`Course cannot have more than ${MAX_SESSIONS} sessions`);
      }
    }

    // Validate objectives
    if (config.objectives) {
      if (!Array.isArray(config.objectives)) {
        errors.push('Course objectives must be an array');
      } else if (config.objectives.length === 0) {
        warnings.push('Course has no learning objectives defined');
      } else if (config.objectives.length > 20) {
        warnings.push('Course has too many objectives (recommended: 3-10)');
      }
    }

    // Validate prerequisites
    if (config.prerequisites) {
      if (!Array.isArray(config.prerequisites)) {
        errors.push('Course prerequisites must be an array');
      } else if (config.prerequisites.length > 10) {
        warnings.push('Course has too many prerequisites (recommended: 0-5)');
      }
    }

    // Validate tags
    if (config.tags) {
      if (!Array.isArray(config.tags)) {
        errors.push('Course tags must be an array');
      } else {
        config.tags.forEach((tag, index) => {
          if (typeof tag !== 'string') {
            errors.push(`Tag at index ${index} must be a string`);
          } else if (tag.length > 50) {
            warnings.push(`Tag '${tag}' is too long (max 50 characters)`);
          }
        });
      }
    }

    // Create sanitized config
    const sanitized = {
      title: config.title?.trim().substring(0, 200),
      description: config.description?.trim().substring(0, 2000),
      level: config.level || 'intermediate',
      language: config.language || 'en',
      duration: Number(config.duration) || 10,
      sessionCount: Number(config.sessionCount) || 5,
      objectives: Array.isArray(config.objectives) ? config.objectives.slice(0, 20) : [],
      prerequisites: Array.isArray(config.prerequisites) ? config.prerequisites.slice(0, 10) : [],
      tags: Array.isArray(config.tags) ? config.tags.slice(0, 20).map(t => t.substring(0, 50)) : []
    };

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitized
    };
  } catch (error) {
    logger.error('Course config validation error:', error);
    return {
      valid: false,
      errors: ['Course configuration validation failed: ' + error.message],
      warnings
    };
  }
}

/**
 * Validate and sanitize URL
 * @param {string} url - URL to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateURL(url, options = {}) {
  const errors = [];
  const warnings = [];

  try {
    // Check if URL is provided
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      errors.push('URL is required and must be a non-empty string');
      return { valid: false, errors, warnings };
    }

    // Try to parse URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url.trim());
    } catch (e) {
      errors.push('Invalid URL format');
      return { valid: false, errors, warnings };
    }

    // Validate protocol
    const allowedProtocols = options.allowedProtocols || ['http:', 'https:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      errors.push(`Invalid protocol '${parsedUrl.protocol}'. Allowed protocols: ${allowedProtocols.join(', ')}`);
    }

    // Check for localhost/private IPs (security consideration)
    const hostname = parsedUrl.hostname.toLowerCase();
    const privatePatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./
    ];

    const isPrivate = privatePatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return hostname === pattern;
      }
      return pattern.test(hostname);
    });

    if (isPrivate && !options.allowPrivate) {
      errors.push('URLs pointing to private/local addresses are not allowed');
    }

    // Validate domain blacklist
    if (options.blacklist && Array.isArray(options.blacklist)) {
      const isBlacklisted = options.blacklist.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );
      if (isBlacklisted) {
        errors.push(`Domain '${hostname}' is blacklisted`);
      }
    }

    // Validate domain whitelist
    if (options.whitelist && Array.isArray(options.whitelist)) {
      const isWhitelisted = options.whitelist.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );
      if (!isWhitelisted) {
        errors.push(`Domain '${hostname}' is not in the whitelist`);
      }
    }

    // Check URL length
    if (url.length > 2048) {
      warnings.push('URL is very long (>2048 characters) and may cause issues');
    }

    // Create sanitized URL
    const sanitized = {
      original: url.trim(),
      normalized: parsedUrl.href,
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
      hash: parsedUrl.hash
    };

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitized
    };
  } catch (error) {
    logger.error('URL validation error:', error);
    return {
      valid: false,
      errors: ['URL validation failed: ' + error.message],
      warnings
    };
  }
}

/**
 * Validate content quality score
 * @param {number} score - Quality score (0-100)
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateContentQuality(score, options = {}) {
  const errors = [];
  const warnings = [];
  const recommendations = [];

  try {
    // Validate score is a number
    const qualityScore = Number(score);
    if (isNaN(qualityScore)) {
      errors.push('Quality score must be a number');
      return { valid: false, errors, warnings };
    }

    // Validate score range
    if (qualityScore < 0 || qualityScore > 100) {
      errors.push('Quality score must be between 0 and 100');
      return { valid: false, errors, warnings };
    }

    // Get thresholds
    const thresholds = options.thresholds || QUALITY_THRESHOLDS;
    const requiredLevel = options.requiredLevel || 'minimum';

    // Determine quality tier
    let tier;
    if (qualityScore >= thresholds.premium) {
      tier = 'premium';
    } else if (qualityScore >= thresholds.recommended) {
      tier = 'recommended';
    } else if (qualityScore >= thresholds.minimum) {
      tier = 'acceptable';
    } else {
      tier = 'below_threshold';
    }

    // Check if meets required level
    const meetsRequirement = qualityScore >= thresholds[requiredLevel];
    if (!meetsRequirement) {
      errors.push(`Content quality score (${qualityScore}) is below required ${requiredLevel} threshold (${thresholds[requiredLevel]})`);
    }

    // Add warnings and recommendations based on tier
    if (tier === 'below_threshold') {
      warnings.push('Content quality is below minimum acceptable threshold');
      recommendations.push('Consider improving content readability and coherence');
      recommendations.push('Check for formatting issues or incomplete content');
      recommendations.push('Ensure content is properly structured with clear sections');
    } else if (tier === 'acceptable') {
      warnings.push('Content quality is acceptable but could be improved');
      recommendations.push('Consider adding more detailed explanations');
      recommendations.push('Improve content organization and flow');
    } else if (tier === 'recommended') {
      recommendations.push('Content quality is good, minor improvements possible');
    }

    // Additional checks based on quality components
    if (options.components) {
      const { readability, coherence, completeness, formatting } = options.components;

      if (readability < 60) {
        warnings.push('Low readability score - content may be difficult to understand');
        recommendations.push('Simplify complex sentences and use clearer language');
      }

      if (coherence < 70) {
        warnings.push('Low coherence score - content flow could be improved');
        recommendations.push('Ensure logical progression between sections');
      }

      if (completeness < 80) {
        warnings.push('Content appears incomplete');
        recommendations.push('Add missing sections or expand existing content');
      }

      if (formatting < 70) {
        warnings.push('Formatting issues detected');
        recommendations.push('Improve content structure with proper headings and paragraphs');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations,
      metadata: {
        score: qualityScore,
        tier,
        meetsRequirement,
        thresholds
      }
    };
  } catch (error) {
    logger.error('Content quality validation error:', error);
    return {
      valid: false,
      errors: ['Content quality validation failed: ' + error.message],
      warnings
    };
  }
}

/**
 * Format file size for human readability
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Validate array of items with a validator function
 * @param {Array} items - Array of items to validate
 * @param {Function} validator - Validator function for each item
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateArray(items, validator, options = {}) {
  const errors = [];
  const warnings = [];
  const validItems = [];
  const invalidItems = [];

  if (!Array.isArray(items)) {
    errors.push('Input must be an array');
    return { valid: false, errors, warnings, validItems, invalidItems };
  }

  const maxItems = options.maxItems || 100;
  if (items.length > maxItems) {
    errors.push(`Too many items (${items.length}). Maximum allowed: ${maxItems}`);
  }

  items.forEach((item, index) => {
    const result = validator(item, options);
    if (result.valid) {
      validItems.push({ index, item, result });
    } else {
      invalidItems.push({ index, item, result });
      errors.push(`Item ${index}: ${result.errors.join(', ')}`);
    }
    if (result.warnings && result.warnings.length > 0) {
      warnings.push(`Item ${index}: ${result.warnings.join(', ')}`);
    }
  });

  return {
    valid: invalidItems.length === 0 && errors.length === 0,
    errors,
    warnings,
    validItems,
    invalidItems,
    summary: {
      total: items.length,
      valid: validItems.length,
      invalid: invalidItems.length
    }
  };
}

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const trimmedEmail = email.trim();
  
  // Basic checks
  if (trimmedEmail.length > 254) return false; // Max email length per RFC
  if (trimmedEmail.startsWith('@') || trimmedEmail.endsWith('@')) return false;
  if (trimmedEmail.includes('..')) return false; // No consecutive dots
  if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) return false;
  
  // Split into local and domain parts
  const atIndex = trimmedEmail.lastIndexOf('@');
  if (atIndex === -1) return false;
  
  const localPart = trimmedEmail.substring(0, atIndex);
  const domainPart = trimmedEmail.substring(atIndex + 1);
  
  // Validate local part
  if (localPart.length === 0 || localPart.length > 64) return false;
  
  // Validate domain part - must have at least one dot for TLD
  if (domainPart.length === 0 || domainPart.length > 253) return false;
  if (!domainPart.includes('.')) return false; // Must have TLD
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) return false;
  if (domainPart.startsWith('-') || domainPart.endsWith('-')) return false;
  
  // More thorough regex check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  
  return emailRegex.test(trimmedEmail);
}

/**
 * Validate password strength and requirements
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with strength assessment
 */
function validatePassword(password) {
  const issues = [];
  const recommendations = [];
  
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      strength: 'invalid',
      issues: ['Password is required']
    };
  }
  
  // Check minimum length
  if (password.length < 8) {
    issues.push('length');
    recommendations.push('Password must be at least 8 characters');
  }
  
  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    issues.push('uppercase');
    recommendations.push('Include at least one uppercase letter');
  }
  
  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    issues.push('lowercase');
    recommendations.push('Include at least one lowercase letter');
  }
  
  // Check for numbers
  if (!/[0-9]/.test(password)) {
    issues.push('number');
    recommendations.push('Include at least one number');
  }
  
  // Check for special characters
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    issues.push('special');
    recommendations.push('Include at least one special character');
  }
  
  // Determine password strength
  let strength;
  if (issues.length === 0) {
    strength = 'strong';
  } else if (issues.length <= 2) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }
  
  return {
    isValid: issues.length === 0,
    strength,
    issues,
    recommendations,
    score: Math.max(0, 100 - (issues.length * 20))
  };
}

module.exports = {
  validateFile,
  validateCourseConfig,
  validateURL,
  validateContentQuality,
  validateArray,
  validateEmail,
  validatePassword,
  formatFileSize,
  ALLOWED_FILE_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  COURSE_LEVELS,
  COURSE_LANGUAGES,
  QUALITY_THRESHOLDS
};