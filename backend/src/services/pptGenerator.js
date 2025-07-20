const fs = require('fs').promises;
const path = require('path');
const pptxgen = require('pptxgenjs');
const { v4: uuidv4 } = require('uuid');

// Import dependencies with fallbacks
let logger, supabaseAdmin, ValidationError, FileProcessingError, withRetry;

try {
  logger = require('../utils/logger');
} catch {
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };
}

try {
  supabaseAdmin = require('../config/database').supabaseAdmin;
} catch {
  // Mock supabase admin for testing
  supabaseAdmin = {
    storage: {
      from: () => ({
        upload: () => ({ data: null, error: null }),
        download: () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    }
  };
}

try {
  const errors = require('../utils/errors');
  ValidationError = errors.ValidationError;
  FileProcessingError = errors.FileProcessingError;
} catch (error) {
  ValidationError = class ValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ValidationError';
    }
  };
  
  FileProcessingError = class FileProcessingError extends Error {
    constructor(message) {
      super(message);
      this.name = 'FileProcessingError';
    }
  };
}

try {
  withRetry = require('../utils/async').withRetry;
} catch {
  withRetry = async (fn, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };
}

/**
 * PowerPoint Generator Service
 * 
 * Provides PowerPoint generation functionality for the AI Course Creator.
 * Integrates with existing services for Bull queue async processing,
 * and Supabase for storage.
 */
class PPTGenerator {
  constructor() {
    this.outputPath = path.join(__dirname, '../../temp/ppts');
    this.templateCache = new Map();
    
    // Default PowerPoint options
    this.defaultOptions = {
      title: 'AI Course Creator',
      subject: 'Generated Course Material',
      author: 'AI Course Creator',
      layout: 'LAYOUT_16x9',
      rtlMode: false
    };
    
    // Slide templates configuration
    this.slideTemplates = {
      title: {
        background: { fill: '363636' },
        titleStyle: { fontSize: 44, color: 'FFFFFF', bold: true },
        subtitleStyle: { fontSize: 24, color: 'CCCCCC' }
      },
      content: {
        background: { fill: 'FFFFFF' },
        titleStyle: { fontSize: 32, color: '363636', bold: true },
        contentStyle: { fontSize: 18, color: '444444' }
      },
      section: {
        background: { fill: '4A90E2' },
        titleStyle: { fontSize: 36, color: 'FFFFFF', bold: true },
        subtitleStyle: { fontSize: 20, color: 'FFFFFF' }
      },
      activity: {
        background: { fill: 'F5F5F5' },
        titleStyle: { fontSize: 28, color: '363636', bold: true },
        contentStyle: { fontSize: 16, color: '555555' },
        accentColor: '2ECC71'
      }
    };
    
    // Initialize output directory
    this.initializeDirectories();
  }

  async initializeDirectories() {
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to initialize PPT directories:', error);
    }
  }

  /**
   * Generate PowerPoint presentation from course data
   */
  async generatePowerPoint(course, template = 'modern', options = {}) {
    try {
      logger.info(`Starting PowerPoint generation for course ${course.id} with template ${template}`);
      
      const pptId = options.pptId || uuidv4();
      const pptOptions = { ...this.defaultOptions, ...options.pptOptions };
      
      // Create new presentation
      const ppt = new pptxgen();
      
      // Set presentation properties
      ppt.title = course.title || pptOptions.title;
      ppt.subject = pptOptions.subject;
      ppt.author = pptOptions.author;
      ppt.layout = pptOptions.layout;
      ppt.rtlMode = pptOptions.rtlMode;
      
      // Apply template and branding
      await this.applyBranding(ppt, template, options.branding);
      
      // Generate slides
      await this.generateSlides(ppt, course, template, options);
      
      // Save presentation
      const pptPath = await this.savePowerPoint(ppt, pptId);
      
      // Upload to Supabase if requested
      let storageUrl = null;
      if (options.uploadToStorage) {
        storageUrl = await this.uploadToSupabase(pptPath, course.id, pptId);
      }
      
      logger.info(`PowerPoint generation completed: ${pptId}`);
      
      return {
        pptId,
        pptPath,
        storageUrl,
        size: await this.getFileSize(pptPath),
        slideCount: await this.getSlideCount(ppt)
      };
      
    } catch (error) {
      logger.error(`PowerPoint generation failed for course ${course.id}:`, error);
      throw new FileProcessingError(`PowerPoint generation failed: ${error.message}`);
    }
  }

  /**
   * Generate all slides for the presentation
   */
  async generateSlides(ppt, course, template, options) {
    try {
      // Title slide
      await this.createTitleSlide(ppt, course, template);
      
      // Table of contents slide
      if (options.includeTOC !== false) {
        await this.createTOCSlide(ppt, course, template);
      }
      
      // Course overview slide
      if (course.description || course.objectives) {
        await this.createOverviewSlide(ppt, course, template);
      }
      
      // Session slides
      if (course.sessions && Array.isArray(course.sessions)) {
        for (let i = 0; i < course.sessions.length; i++) {
          const session = course.sessions[i];
          await this.createSessionSlides(ppt, session, i + 1, template, options);
        }
      }
      
      // Summary slide
      if (options.includeSummary !== false) {
        await this.createSummarySlide(ppt, course, template);
      }
      
    } catch (error) {
      throw new FileProcessingError(`Slide generation failed: ${error.message}`);
    }
  }

  /**
   * Create title slide
   */
  async createTitleSlide(ppt, course, template) {
    const slideTemplate = this.slideTemplates.title;
    const slide = ppt.addSlide();
    
    // Apply background
    slide.background = slideTemplate.background;
    
    // Add title
    slide.addText(course.title || 'Untitled Course', {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1.5,
      fontSize: slideTemplate.titleStyle.fontSize,
      color: slideTemplate.titleStyle.color,
      bold: slideTemplate.titleStyle.bold,
      align: 'center'
    });
    
    // Add subtitle/description
    if (course.description) {
      slide.addText(this.cleanText(course.description), {
        x: 0.5,
        y: 4.2,
        w: 9,
        h: 1,
        fontSize: slideTemplate.subtitleStyle.fontSize,
        color: slideTemplate.subtitleStyle.color,
        align: 'center'
      });
    }
    
    // Add instructor name if available
    if (course.instructor) {
      slide.addText(`Instructor: ${course.instructor}`, {
        x: 0.5,
        y: 5.5,
        w: 9,
        h: 0.5,
        fontSize: 16,
        color: 'CCCCCC',
        align: 'center'
      });
    }
    
    // Add generated date
    slide.addText(`Generated: ${new Date().toLocaleDateString()}`, {
      x: 8,
      y: 6.8,
      w: 1.5,
      h: 0.3,
      fontSize: 12,
      color: 'AAAAAA',
      align: 'right'
    });
  }

  /**
   * Create table of contents slide
   */
  async createTOCSlide(ppt, course, template) {
    const slideTemplate = this.slideTemplates.content;
    const slide = ppt.addSlide();
    
    // Apply background
    slide.background = slideTemplate.background;
    
    // Add title
    slide.addText('Table of Contents', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 1,
      fontSize: slideTemplate.titleStyle.fontSize,
      color: slideTemplate.titleStyle.color,
      bold: slideTemplate.titleStyle.bold,
      align: 'center'
    });
    
    // Add sessions list
    if (course.sessions && Array.isArray(course.sessions)) {
      const tocItems = course.sessions.map((session, index) => {
        const duration = session.estimated_duration ? ` (${session.estimated_duration} min)` : '';
        return `${index + 1}. ${session.title}${duration}`;
      });
      
      slide.addText(tocItems.join('\n'), {
        x: 1,
        y: 2,
        w: 8,
        h: 4,
        fontSize: 20,
        color: slideTemplate.contentStyle.color,
        bullet: { type: 'number' },
        lineSpacing: 32
      });
    }
  }

  /**
   * Create course overview slide
   */
  async createOverviewSlide(ppt, course, template) {
    const slideTemplate = this.slideTemplates.content;
    const slide = ppt.addSlide();
    
    // Apply background
    slide.background = slideTemplate.background;
    
    // Add title
    slide.addText('Course Overview', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 1,
      fontSize: slideTemplate.titleStyle.fontSize,
      color: slideTemplate.titleStyle.color,
      bold: slideTemplate.titleStyle.bold,
      align: 'center'
    });
    
    let yPosition = 2;
    
    // Add description
    if (course.description) {
      slide.addText('Description:', {
        x: 1,
        y: yPosition,
        w: 8,
        h: 0.5,
        fontSize: 22,
        color: slideTemplate.titleStyle.color,
        bold: true
      });
      
      slide.addText(this.cleanText(course.description), {
        x: 1,
        y: yPosition + 0.6,
        w: 8,
        h: 1.5,
        fontSize: 18,
        color: slideTemplate.contentStyle.color,
        wrap: true
      });
      
      yPosition += 2.5;
    }
    
    // Add objectives
    if (course.objectives && Array.isArray(course.objectives)) {
      slide.addText('Learning Objectives:', {
        x: 1,
        y: yPosition,
        w: 8,
        h: 0.5,
        fontSize: 22,
        color: slideTemplate.titleStyle.color,
        bold: true
      });
      
      slide.addText(course.objectives.join('\n'), {
        x: 1,
        y: yPosition + 0.6,
        w: 8,
        h: 2,
        fontSize: 18,
        color: slideTemplate.contentStyle.color,
        bullet: true,
        lineSpacing: 28
      });
    }
  }

  /**
   * Create slides for a session
   */
  async createSessionSlides(ppt, session, sessionNumber, template, options) {
    try {
      // Session title slide
      await this.createSessionTitleSlide(ppt, session, sessionNumber, template);
      
      // Session content slide
      if (session.content) {
        await this.createSessionContentSlide(ppt, session, sessionNumber, template);
      }
      
      // Activity slides
      if (session.activities && Array.isArray(session.activities)) {
        for (let i = 0; i < session.activities.length; i++) {
          const activity = session.activities[i];
          await this.createActivitySlide(ppt, activity, sessionNumber, i + 1, template);
        }
      }
      
      // Assessment slides
      if (session.assessments && Array.isArray(session.assessments)) {
        await this.createAssessmentSlides(ppt, session.assessments, sessionNumber, template);
      }
      
    } catch (error) {
      throw new FileProcessingError(`Session slide creation failed: ${error.message}`);
    }
  }

  /**
   * Create session title slide
   */
  async createSessionTitleSlide(ppt, session, sessionNumber, template) {
    const slideTemplate = this.slideTemplates.section;
    const slide = ppt.addSlide();
    
    // Apply background
    slide.background = slideTemplate.background;
    
    // Add session number
    slide.addText(`Session ${sessionNumber}`, {
      x: 0.5,
      y: 2,
      w: 9,
      h: 0.8,
      fontSize: 28,
      color: slideTemplate.subtitleStyle.color,
      align: 'center'
    });
    
    // Add session title
    slide.addText(session.title || `Session ${sessionNumber}`, {
      x: 0.5,
      y: 3,
      w: 9,
      h: 1.5,
      fontSize: slideTemplate.titleStyle.fontSize,
      color: slideTemplate.titleStyle.color,
      bold: slideTemplate.titleStyle.bold,
      align: 'center'
    });
    
    // Add duration if available
    if (session.estimated_duration) {
      slide.addText(`Duration: ${session.estimated_duration} minutes`, {
        x: 0.5,
        y: 4.8,
        w: 9,
        h: 0.5,
        fontSize: 18,
        color: slideTemplate.subtitleStyle.color,
        align: 'center'
      });
    }
  }

  /**
   * Create session content slide
   */
  async createSessionContentSlide(ppt, session, sessionNumber, template) {
    const slideTemplate = this.slideTemplates.content;
    const slide = ppt.addSlide();
    
    // Apply background
    slide.background = slideTemplate.background;
    
    // Add title
    slide.addText(`${session.title} - Content`, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 1,
      fontSize: slideTemplate.titleStyle.fontSize,
      color: slideTemplate.titleStyle.color,
      bold: slideTemplate.titleStyle.bold,
      align: 'center'
    });
    
    // Process and add content
    const processedContent = this.processContentForSlide(session.content);
    if (processedContent) {
      slide.addText(processedContent, {
        x: 1,
        y: 2,
        w: 8,
        h: 4.5,
        fontSize: slideTemplate.contentStyle.fontSize,
        color: slideTemplate.contentStyle.color,
        wrap: true,
        lineSpacing: 24
      });
    }
  }

  /**
   * Create activity slide
   */
  async createActivitySlide(ppt, activity, sessionNumber, activityNumber, template) {
    const slideTemplate = this.slideTemplates.activity;
    const slide = ppt.addSlide();
    
    // Apply background
    slide.background = slideTemplate.background;
    
    // Add activity header
    slide.addText(`Activity ${sessionNumber}.${activityNumber}`, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 20,
      color: slideTemplate.accentColor,
      bold: true,
      align: 'center'
    });
    
    // Add activity title
    slide.addText(activity.title || `Activity ${activityNumber}`, {
      x: 0.5,
      y: 1,
      w: 9,
      h: 1,
      fontSize: slideTemplate.titleStyle.fontSize,
      color: slideTemplate.titleStyle.color,
      bold: slideTemplate.titleStyle.bold,
      align: 'center'
    });
    
    // Add activity content
    const processedContent = this.processActivityContent(activity);
    if (processedContent) {
      slide.addText(processedContent, {
        x: 1,
        y: 2.5,
        w: 8,
        h: 3.5,
        fontSize: slideTemplate.contentStyle.fontSize,
        color: slideTemplate.contentStyle.color,
        wrap: true,
        lineSpacing: 22
      });
    }
    
    // Add duration if available
    if (activity.estimated_duration) {
      slide.addText(`Duration: ${activity.estimated_duration} minutes`, {
        x: 7,
        y: 6.2,
        w: 2.5,
        h: 0.3,
        fontSize: 14,
        color: slideTemplate.accentColor,
        align: 'right'
      });
    }
  }

  /**
   * Create assessment slides
   */
  async createAssessmentSlides(ppt, assessments, sessionNumber, template) {
    const slideTemplate = this.slideTemplates.content;
    const slide = ppt.addSlide();
    
    // Apply background
    slide.background = slideTemplate.background;
    
    // Add title
    slide.addText(`Session ${sessionNumber} - Assessment`, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 1,
      fontSize: slideTemplate.titleStyle.fontSize,
      color: slideTemplate.titleStyle.color,
      bold: slideTemplate.titleStyle.bold,
      align: 'center'
    });
    
    // Add assessment items
    const assessmentText = assessments.map((assessment, index) => {
      return `${index + 1}. ${assessment.question || assessment.title || 'Assessment item'}`;
    }).join('\n\n');
    
    slide.addText(assessmentText, {
      x: 1,
      y: 2,
      w: 8,
      h: 4,
      fontSize: 18,
      color: slideTemplate.contentStyle.color,
      wrap: true,
      lineSpacing: 28
    });
  }

  /**
   * Create summary slide
   */
  async createSummarySlide(ppt, course, template) {
    const slideTemplate = this.slideTemplates.section;
    const slide = ppt.addSlide();
    
    // Apply background
    slide.background = slideTemplate.background;
    
    // Add title
    slide.addText('Course Summary', {
      x: 0.5,
      y: 2,
      w: 9,
      h: 1,
      fontSize: slideTemplate.titleStyle.fontSize,
      color: slideTemplate.titleStyle.color,
      bold: slideTemplate.titleStyle.bold,
      align: 'center'
    });
    
    // Add summary points
    const summaryPoints = [
      `Total Sessions: ${course.sessions ? course.sessions.length : 0}`,
      `Total Activities: ${this.calculateTotalActivities(course.sessions)}`,
      `Estimated Duration: ${this.calculateTotalDuration(course.sessions)} minutes`
    ];
    
    slide.addText(summaryPoints.join('\n'), {
      x: 2,
      y: 3.5,
      w: 6,
      h: 2,
      fontSize: 22,
      color: slideTemplate.subtitleStyle.color,
      bullet: true,
      lineSpacing: 32,
      align: 'center'
    });
    
    // Add thank you message
    slide.addText('Thank you for your attention!', {
      x: 0.5,
      y: 6,
      w: 9,
      h: 0.5,
      fontSize: 20,
      color: slideTemplate.subtitleStyle.color,
      align: 'center'
    });
  }

  /**
   * Apply branding to presentation
   */
  async applyBranding(ppt, templateName, brandingOptions = {}) {
    try {
      // Set master slide properties
      const masterSlide = ppt.defineSlideMaster({
        title: 'MASTER_SLIDE',
        background: { fill: brandingOptions.backgroundColor || 'FFFFFF' }
      });
      
      // Apply custom color scheme if provided
      if (brandingOptions.colorScheme) {
        this.updateColorScheme(brandingOptions.colorScheme);
      }
      
      // Add logo if provided
      if (brandingOptions.logo) {
        // Note: In a real implementation, you would handle logo placement
        // For now, we'll just store the logo path for later use
        this.brandingLogo = brandingOptions.logo;
      }
      
      // Apply custom fonts if provided
      if (brandingOptions.fontFamily) {
        this.updateFontFamily(brandingOptions.fontFamily);
      }
      
    } catch (error) {
      logger.warn(`Branding application failed: ${error.message}`);
    }
  }

  /**
   * Update color scheme for templates
   */
  updateColorScheme(colorScheme) {
    if (colorScheme.primary) {
      this.slideTemplates.section.background.fill = colorScheme.primary.replace('#', '');
    }
    if (colorScheme.secondary) {
      this.slideTemplates.activity.accentColor = colorScheme.secondary.replace('#', '');
    }
    if (colorScheme.background) {
      this.slideTemplates.content.background.fill = colorScheme.background.replace('#', '');
    }
  }

  /**
   * Update font family for templates
   */
  updateFontFamily(fontFamily) {
    // Note: pptxgenjs has limited font support
    // In a real implementation, you would map common fonts to supported ones
    this.defaultFontFamily = fontFamily;
  }

  /**
   * Process content for slide display
   */
  processContentForSlide(content) {
    if (!content) return '';
    
    try {
      // If content is JSON, parse and format
      if (typeof content === 'string' && content.trim().startsWith('{')) {
        const parsed = JSON.parse(content);
        return this.formatJSONContentForSlide(parsed);
      }
      
      // Process as plain text
      return this.cleanText(content);
    } catch {
      return this.cleanText(content);
    }
  }

  /**
   * Format JSON content for slide
   */
  formatJSONContentForSlide(content) {
    let formatted = '';
    
    if (content.content) {
      formatted += this.cleanText(content.content);
    }
    
    if (content.keyPoints && Array.isArray(content.keyPoints)) {
      formatted += '\n\nKey Points:\n';
      formatted += content.keyPoints.map(point => `• ${point}`).join('\n');
    }
    
    if (content.objectives && Array.isArray(content.objectives)) {
      formatted += '\n\nObjectives:\n';
      formatted += content.objectives.map(obj => `• ${obj}`).join('\n');
    }
    
    return formatted;
  }

  /**
   * Process activity content for slide
   */
  processActivityContent(activity) {
    if (!activity.content) return '';
    
    try {
      if (typeof activity.content === 'string' && activity.content.trim().startsWith('{')) {
        const parsed = JSON.parse(activity.content);
        return this.formatActivityContentForSlide(parsed);
      }
      
      return this.cleanText(activity.content);
    } catch {
      return this.cleanText(activity.content);
    }
  }

  /**
   * Format activity content for slide
   */
  formatActivityContentForSlide(content) {
    let formatted = '';
    
    if (content.instructions) {
      formatted += 'Instructions:\n';
      formatted += this.cleanText(content.instructions);
    }
    
    if (content.questions && Array.isArray(content.questions)) {
      formatted += '\n\nQuestions:\n';
      content.questions.forEach((question, index) => {
        formatted += `${index + 1}. ${question.question || question}\n`;
      });
    }
    
    if (content.steps && Array.isArray(content.steps)) {
      formatted += '\n\nSteps:\n';
      content.steps.forEach((step, index) => {
        formatted += `${index + 1}. ${step}\n`;
      });
    }
    
    return formatted;
  }

  /**
   * Clean text for PowerPoint display
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
      .replace(/`(.*?)`/g, '$1') // Remove code markdown
      .replace(/\n\n+/g, '\n\n') // Normalize line breaks
      .trim();
  }

  /**
   * Save PowerPoint presentation
   */
  async savePowerPoint(ppt, pptId) {
    try {
      const pptPath = path.join(this.outputPath, `${pptId}.pptx`);
      
      // Save presentation
      await ppt.writeFile({ fileName: pptPath });
      
      return pptPath;
    } catch (error) {
      throw new FileProcessingError(`PowerPoint save failed: ${error.message}`);
    }
  }

  /**
   * Upload PowerPoint to Supabase storage
   */
  async uploadToSupabase(pptPath, courseId, pptId) {
    try {
      const fileBuffer = await fs.readFile(pptPath);
      const fileName = `courses/${courseId}/exports/${pptId}.pptx`;
      
      const { data, error } = await supabaseAdmin.storage
        .from('course-exports')
        .upload(fileName, fileBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          cacheControl: '3600'
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('course-exports')
        .getPublicUrl(fileName);
      
      return publicUrl;
      
    } catch (error) {
      throw new FileProcessingError(`Supabase upload failed: ${error.message}`);
    }
  }

  /**
   * Calculate total duration
   */
  calculateTotalDuration(sessions) {
    if (!sessions) return 0;
    return sessions.reduce((total, session) => {
      return total + (session.estimated_duration || 0);
    }, 0);
  }

  /**
   * Calculate total activities
   */
  calculateTotalActivities(sessions) {
    if (!sessions) return 0;
    return sessions.reduce((total, session) => {
      return total + (session.activities?.length || 0);
    }, 0);
  }

  /**
   * Get file size
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Get slide count
   */
  async getSlideCount(ppt) {
    // Note: pptxgenjs doesn't directly expose slide count
    // This is an estimation based on the slides we added
    return ppt.slides ? ppt.slides.length : 0;
  }

  /**
   * Clean up temporary files
   */
  async cleanup(pptId) {
    try {
      const pptPath = path.join(this.outputPath, `${pptId}.pptx`);
      await fs.unlink(pptPath);
      logger.info(`Cleanup completed for PowerPoint: ${pptId}`);
    } catch (error) {
      logger.warn(`Cleanup failed for PowerPoint ${pptId}: ${error.message}`);
    }
  }
}

module.exports = PPTGenerator;