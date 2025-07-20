const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

// Import marked with fallback for ES module issue
let marked;
async function initMarked() {
  if (!marked) {
    try {
      marked = await import('marked');
      if (marked.marked) marked = marked.marked;
    } catch (error) {
      // Simple markdown fallback
      marked = {
        parse: (text) => text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n/g, '<br>')
      };
    }
  }
  return marked;
}

// Import dependencies with fallbacks
let logger, supabaseAdmin, ValidationError, ProcessingError;

try {
  logger = require('../utils/logger');
} catch (error) {
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error
  };
}

try {
  supabaseAdmin = require('../config/database').supabaseAdmin;
} catch (error) {
  // Mock supabase admin for testing
  supabaseAdmin = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: null, error: new Error('Database not available') }),
          order: () => ({ data: [], error: null })
        })
      })
    })
  };
}

try {
  const errors = require('../utils/errors');
  ValidationError = errors.ValidationError;
  ProcessingError = errors.ProcessingError;
} catch (error) {
  ValidationError = class ValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ValidationError';
    }
  };
  
  ProcessingError = class ProcessingError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ProcessingError';
    }
  };
}

// Import withRetry if available, otherwise create a simple implementation
let withRetry;
try {
  withRetry = require('../utils/async').withRetry;
} catch (error) {
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

class HTMLExporter {
  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
    this.outputPath = path.join(__dirname, '../../temp/exports');
    this.compiledTemplates = new Map();
    this.templateAssets = new Map();
    this.markedInitialized = false;
    
    // Ensure output directory exists
    this.initializeDirectories();
    
    // Register Handlebars helpers
    this.registerHandlebarsHelpers();
  }

  async initializeDirectories() {
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
      await fs.mkdir(this.templatesPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to initialize directories:', error);
    }
  }

  async ensureMarkedInitialized() {
    if (!this.markedInitialized) {
      marked = await initMarked();
      this.markedInitialized = true;
    }
  }

  registerHandlebarsHelpers() {
    // Helper to render markdown content
    handlebars.registerHelper('markdown', (text) => {
      if (!text) return '';
      // Simple markdown processing as fallback
      const processed = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
      return new handlebars.SafeString(processed);
    });

    // Helper to format duration
    handlebars.registerHelper('formatDuration', (minutes) => {
      if (!minutes) return '0 min';
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    });

    // Helper to generate unique IDs
    handlebars.registerHelper('uniqueId', () => {
      return `id-${uuidv4().substring(0, 8)}`;
    });

    // Helper for conditional rendering
    handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });

    // Helper for array iteration with index
    handlebars.registerHelper('eachWithIndex', function(array, options) {
      let result = '';
      for (let i = 0; i < array.length; i++) {
        result += options.fn({ ...array[i], index: i });
      }
      return result;
    });

    // Helper for JSON stringification
    handlebars.registerHelper('json', (context) => {
      return JSON.stringify(context);
    });

    // Math helpers
    handlebars.registerHelper('add', (a, b) => a + b);
    handlebars.registerHelper('sub', (a, b) => a - b);
    handlebars.registerHelper('multiply', (a, b) => a * b);
    handlebars.registerHelper('divide', (a, b) => b !== 0 ? a / b : 0);
    handlebars.registerHelper('lt', (a, b) => a < b);
    handlebars.registerHelper('gt', (a, b) => a > b);
    handlebars.registerHelper('lte', (a, b) => a <= b);
    handlebars.registerHelper('gte', (a, b) => a >= b);

    // Array helpers
    handlebars.registerHelper('length', (array) => {
      return Array.isArray(array) ? array.length : 0;
    });

    // String helpers
    handlebars.registerHelper('capitalize', (str) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    handlebars.registerHelper('truncate', (str, length) => {
      if (!str) return '';
      return str.length > length ? str.substring(0, length) + '...' : str;
    });
  }

  /**
   * Main export function
   */
  async generateHTMLExport(courseId, templateName, options = {}, exportId = null) {
    try {
      logger.info(`Starting HTML export for course ${courseId} with template ${templateName}`);
      
      // Generate unique export ID if not provided
      exportId = exportId || uuidv4();
      
      // Fetch course data - if courseId is an object, use it directly (for testing)
      let courseData;
      if (typeof courseId === 'object' && courseId.id) {
        courseData = courseId;
      } else {
        courseData = await this.fetchCourseData(courseId);
      }
      
      // Validate template
      await this.validateTemplate(templateName);
      
      // Load and compile template
      const template = await this.loadTemplate(templateName);
      
      // Process course content
      const processedContent = await this.processContent(courseData, options);
      
      // Generate HTML based on export type
      let result;
      if (options.exportType === 'multi-page') {
        result = await this.generateMultiPageHTML(
          courseData,
          processedContent,
          template,
          options,
          exportId
        );
      } else {
        result = await this.generateSinglePageHTML(
          courseData,
          processedContent,
          template,
          options,
          exportId
        );
      }
      
      // Create ZIP archive if requested
      if (options.createArchive !== false) {
        result.archivePath = await this.createArchive(result.outputPath, exportId);
      }
      
      logger.info(`HTML export completed successfully: ${exportId}`);
      return result;
      
    } catch (error) {
      logger.error(`HTML export failed for course ${courseId}:`, error);
      throw new ProcessingError(`HTML export failed: ${error.message}`);
    }
  }

  /**
   * Generate single-page HTML export
   */
  async generateSinglePageHTML(courseData, processedContent, template, options, exportId) {
    try {
      const outputDir = path.join(this.outputPath, exportId);
      await fs.mkdir(outputDir, { recursive: true });
      
      // Prepare template data
      const templateData = {
        course: courseData,
        sessions: processedContent.sessions,
        options: options,
        exportId: exportId,
        generatedAt: new Date().toISOString(),
        templateName: template.name,
        customizations: options.customizations || {}
      };
      
      // Compile main template
      const compiledTemplate = handlebars.compile(template.content);
      const html = compiledTemplate(templateData);
      
      // Generate CSS
      const css = await this.generateTemplateCSS(template.name, options.customizations);
      
      // Copy assets
      await this.copyTemplateAssets(template.name, outputDir);
      
      // Write files
      const htmlPath = path.join(outputDir, 'index.html');
      const cssPath = path.join(outputDir, 'assets/css/style.css');
      
      await fs.mkdir(path.dirname(cssPath), { recursive: true });
      await fs.writeFile(htmlPath, html, 'utf8');
      await fs.writeFile(cssPath, css, 'utf8');
      
      // Copy course assets (images, videos, etc.)
      await this.copyCourseAssets(courseData, outputDir);
      
      return {
        exportId,
        outputPath: outputDir,
        htmlPath,
        cssPath,
        type: 'single-page'
      };
      
    } catch (error) {
      throw new ProcessingError(`Single-page HTML generation failed: ${error.message}`);
    }
  }

  /**
   * Generate multi-page HTML export
   */
  async generateMultiPageHTML(courseData, processedContent, template, options, exportId) {
    try {
      const outputDir = path.join(this.outputPath, exportId);
      await fs.mkdir(outputDir, { recursive: true });
      
      // Create assets directory
      const assetsDir = path.join(outputDir, 'assets');
      const cssDir = path.join(assetsDir, 'css');
      await fs.mkdir(cssDir, { recursive: true });
      
      // Generate CSS
      const css = await this.generateTemplateCSS(template.name, options.customizations);
      await fs.writeFile(path.join(cssDir, 'style.css'), css, 'utf8');
      
      // Copy template assets
      await this.copyTemplateAssets(template.name, outputDir);
      
      // Load page templates
      const indexTemplate = handlebars.compile(template.content);
      const sessionTemplate = handlebars.compile(template.sessionContent || template.content);
      
      // Generate index page
      const indexData = {
        course: courseData,
        sessions: processedContent.sessions,
        options: options,
        exportId: exportId,
        isIndexPage: true
      };
      
      const indexHtml = indexTemplate(indexData);
      await fs.writeFile(path.join(outputDir, 'index.html'), indexHtml, 'utf8');
      
      // Generate session pages
      const sessionPaths = [];
      for (let i = 0; i < processedContent.sessions.length; i++) {
        const session = processedContent.sessions[i];
        const sessionData = {
          course: courseData,
          session: session,
          sessionIndex: i,
          totalSessions: processedContent.sessions.length,
          options: options,
          exportId: exportId,
          isSessionPage: true
        };
        
        const sessionHtml = sessionTemplate(sessionData);
        const sessionPath = path.join(outputDir, `session-${i + 1}.html`);
        await fs.writeFile(sessionPath, sessionHtml, 'utf8');
        sessionPaths.push(sessionPath);
      }
      
      // Copy course assets
      await this.copyCourseAssets(courseData, outputDir);
      
      return {
        exportId,
        outputPath: outputDir,
        indexPath: path.join(outputDir, 'index.html'),
        sessionPaths,
        type: 'multi-page'
      };
      
    } catch (error) {
      throw new ProcessingError(`Multi-page HTML generation failed: ${error.message}`);
    }
  }

  /**
   * Fetch course data from database
   */
  async fetchCourseData(courseId) {
    try {
      return await withRetry(async () => {
        // Fetch course details
        const { data: course, error: courseError } = await supabaseAdmin
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();
        
        if (courseError) throw courseError;
        if (!course) throw new ValidationError(`Course not found: ${courseId}`);
        
        // Fetch sessions - try different table names
        let sessions = [];
        try {
          const { data: sessionsData, error: sessionsError } = await supabaseAdmin
            .from('sessions')
            .select('*')
            .eq('course_id', courseId)
            .order('session_order');
          
          if (sessionsError) {
            // Try alternative table name
            const { data: altSessionsData, error: altSessionsError } = await supabaseAdmin
              .from('course_sessions')
              .select('*')
              .eq('course_id', courseId)
              .order('sequence_number');
            
            if (altSessionsError) throw altSessionsError;
            sessions = altSessionsData || [];
          } else {
            sessions = sessionsData || [];
          }
        } catch (tableError) {
          logger.warn('Sessions table not found, using empty sessions array');
          sessions = [];
        }
        
        // Fetch activities for each session
        for (const session of sessions) {
          try {
            const { data: activities, error: activitiesError } = await supabaseAdmin
              .from('activities')
              .select('*')
              .eq('session_id', session.id)
              .order('activity_order');
            
            if (activitiesError) {
              // Try alternative table name
              const { data: altActivities, error: altActivitiesError } = await supabaseAdmin
                .from('session_activities')
                .select('*')
                .eq('session_id', session.id)
                .order('sequence_number');
              
              session.activities = altActivitiesError ? [] : (altActivities || []);
            } else {
              session.activities = activities || [];
            }
          } catch {
            session.activities = [];
          }
        }
        
        return {
          ...course,
          sessions: sessions || []
        };
      });
    } catch (error) {
      throw new ProcessingError(`Failed to fetch course data: ${error.message}`);
    }
  }

  /**
   * Process course content for template rendering
   */
  async processContent(courseData, options) {
    try {
      const processedSessions = courseData.sessions.map(session => ({
        ...session,
        content: this.processSessionContent(session.content),
        description: this.processMarkdown(session.description),
        activities: session.activities.map(activity => ({
          ...activity,
          content: this.processActivityContent(activity.content),
          description: this.processMarkdown(activity.description)
        }))
      }));
      
      return {
        sessions: processedSessions,
        totalDuration: this.calculateTotalDuration(processedSessions),
        summary: this.generateCourseSummary(courseData, processedSessions)
      };
    } catch (error) {
      throw new ProcessingError(`Content processing failed: ${error.message}`);
    }
  }

  /**
   * Process session content
   */
  processSessionContent(content) {
    if (!content) return '';
    
    try {
      // If content is JSON, parse and format
      if (typeof content === 'string' && content.trim().startsWith('{')) {
        const parsed = JSON.parse(content);
        return this.formatJSONContent(parsed);
      }
      
      // Process as markdown
      return this.processMarkdown(content);
    } catch (error) {
      // If parsing fails, treat as plain text/markdown
      return this.processMarkdown(content);
    }
  }

  /**
   * Process activity content
   */
  processActivityContent(content) {
    if (!content) return '';
    
    try {
      if (typeof content === 'string' && content.trim().startsWith('{')) {
        const parsed = JSON.parse(content);
        return this.formatActivityContent(parsed);
      }
      
      return this.processMarkdown(content);
    } catch (error) {
      return this.processMarkdown(content);
    }
  }

  /**
   * Process markdown content
   */
  processMarkdown(text) {
    if (!text) return '';
    // Simple markdown processing
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Format JSON content for display
   */
  formatJSONContent(content) {
    if (!content) return '';
    
    let formatted = '';
    
    if (content.title) {
      formatted += `<h2>${content.title}</h2>\n`;
    }
    
    if (content.objectives && content.objectives.length > 0) {
      formatted += '<h3>Learning Objectives</h3>\n<ul>\n';
      content.objectives.forEach(obj => {
        formatted += `<li>${obj}</li>\n`;
      });
      formatted += '</ul>\n';
    }
    
    if (content.content) {
      formatted += this.processMarkdown(content.content);
    }
    
    if (content.keyPoints && content.keyPoints.length > 0) {
      formatted += '<h3>Key Points</h3>\n<ul>\n';
      content.keyPoints.forEach(point => {
        formatted += `<li>${point}</li>\n`;
      });
      formatted += '</ul>\n';
    }
    
    return formatted;
  }

  /**
   * Format activity content for display
   */
  formatActivityContent(content) {
    if (!content) return '';
    
    let formatted = '';
    
    if (content.instructions) {
      formatted += `<div class="activity-instructions">${this.processMarkdown(content.instructions)}</div>\n`;
    }
    
    if (content.questions && content.questions.length > 0) {
      formatted += '<div class="activity-questions">\n';
      content.questions.forEach((question, index) => {
        formatted += `<div class="question">\n`;
        formatted += `<h4>Question ${index + 1}</h4>\n`;
        formatted += `<p>${question.question}</p>\n`;
        
        if (question.options && question.options.length > 0) {
          formatted += '<ul class="options">\n';
          question.options.forEach(option => {
            formatted += `<li>${option}</li>\n`;
          });
          formatted += '</ul>\n';
        }
        
        formatted += '</div>\n';
      });
      formatted += '</div>\n';
    }
    
    return formatted;
  }

  /**
   * Load and compile template
   */
  async loadTemplate(templateName) {
    try {
      // Check if template is already compiled
      if (this.compiledTemplates.has(templateName)) {
        return this.compiledTemplates.get(templateName);
      }
      
      // Load template files
      const templateDir = path.join(this.templatesPath, templateName);
      const templatePath = path.join(templateDir, 'index.hbs');
      const sessionTemplatePath = path.join(templateDir, 'session.hbs');
      
      // Check if template exists
      try {
        await fs.access(templatePath);
      } catch {
        throw new ValidationError(`Template not found: ${templateName}`);
      }
      
      // Read template content
      const content = await fs.readFile(templatePath, 'utf8');
      let sessionContent = null;
      
      try {
        sessionContent = await fs.readFile(sessionTemplatePath, 'utf8');
      } catch {
        // Session template is optional
      }
      
      const template = {
        name: templateName,
        content,
        sessionContent
      };
      
      // Cache compiled template
      this.compiledTemplates.set(templateName, template);
      
      return template;
    } catch (error) {
      throw new ProcessingError(`Template loading failed: ${error.message}`);
    }
  }

  /**
   * Validate template exists and is supported
   */
  async validateTemplate(templateName) {
    const supportedTemplates = ['modern', 'classic', 'minimal', 'interactive', 'mobile-first'];
    
    if (!supportedTemplates.includes(templateName)) {
      throw new ValidationError(`Unsupported template: ${templateName}`);
    }
    
    const templateDir = path.join(this.templatesPath, templateName);
    
    try {
      await fs.access(templateDir);
    } catch {
      throw new ValidationError(`Template directory not found: ${templateName}`);
    }
  }

  /**
   * Generate CSS for template with customizations
   */
  async generateTemplateCSS(templateName, customizations = {}) {
    try {
      const templateDir = path.join(this.templatesPath, templateName);
      const cssPath = path.join(templateDir, 'style.css');
      
      let css = '';
      
      try {
        css = await fs.readFile(cssPath, 'utf8');
      } catch {
        // If no CSS file, use default
        css = this.getDefaultCSS(templateName);
      }
      
      // Apply customizations
      if (customizations.primaryColor) {
        css = css.replace(/:root\s*\{([^}]*)\}/g, (match, content) => {
          return `:root { ${content} --primary-color: ${customizations.primaryColor}; }`;
        });
      }
      
      if (customizations.fontFamily) {
        css += `\n\nbody { font-family: ${customizations.fontFamily}, sans-serif; }`;
      }
      
      if (customizations.customCSS) {
        css += '\n\n/* Custom CSS */\n' + customizations.customCSS;
      }
      
      return css;
    } catch (error) {
      throw new ProcessingError(`CSS generation failed: ${error.message}`);
    }
  }

  /**
   * Get default CSS for template
   */
  getDefaultCSS(templateName) {
    const defaultStyles = {
      modern: `
        :root {
          --primary-color: #3b82f6;
          --secondary-color: #64748b;
          --background-color: #ffffff;
          --text-color: #1f2937;
          --border-color: #e5e7eb;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: var(--text-color);
          background-color: var(--background-color);
          margin: 0;
          padding: 0;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .course-header {
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
          padding: 3rem 2rem;
          border-radius: 0.5rem;
          margin-bottom: 2rem;
        }
        
        .session {
          background: white;
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .activity {
          background: #f8fafc;
          border-left: 4px solid var(--primary-color);
          padding: 1rem;
          margin: 1rem 0;
          border-radius: 0.25rem;
        }
      `,
      classic: `
        body {
          font-family: Georgia, serif;
          line-height: 1.8;
          color: #333;
          background-color: #fafafa;
          margin: 0;
          padding: 0;
        }
        
        .container {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }
        
        .course-header {
          border-bottom: 3px solid #8b4513;
          padding-bottom: 2rem;
          margin-bottom: 2rem;
        }
        
        .session {
          border-bottom: 1px solid #ddd;
          padding: 2rem 0;
        }
        
        .activity {
          background: #f9f9f9;
          border: 1px solid #ddd;
          padding: 1rem;
          margin: 1rem 0;
        }
      `,
      minimal: `
        body {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: white;
          margin: 0;
          padding: 0;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .course-header {
          margin-bottom: 3rem;
        }
        
        .session {
          margin-bottom: 3rem;
        }
        
        .activity {
          margin: 2rem 0;
          padding-left: 2rem;
          border-left: 2px solid #eee;
        }
      `,
      interactive: `
        body {
          font-family: 'Inter', sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 0;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .course-header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 3rem;
          margin-bottom: 2rem;
        }
        
        .session {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 2rem;
          transition: transform 0.3s ease;
        }
        
        .session:hover {
          transform: translateY(-5px);
        }
        
        .activity {
          background: rgba(103, 126, 234, 0.1);
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin: 1rem 0;
          transition: background-color 0.3s ease;
        }
        
        .activity:hover {
          background: rgba(103, 126, 234, 0.2);
        }
      `,
      'mobile-first': `
        body {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        
        .container {
          padding: 1rem;
        }
        
        .course-header {
          background: #007AFF;
          color: white;
          padding: 2rem 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .session {
          background: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-bottom: 1rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .activity {
          background: #f8f9fa;
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
        }
        
        @media (min-width: 768px) {
          .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
          }
          
          .course-header {
            padding: 3rem 2rem;
          }
          
          .session {
            padding: 2rem;
          }
        }
      `
    };
    
    return defaultStyles[templateName] || defaultStyles.modern;
  }

  /**
   * Copy template assets to output directory
   */
  async copyTemplateAssets(templateName, outputDir) {
    try {
      const templateDir = path.join(this.templatesPath, templateName);
      const assetsDir = path.join(templateDir, 'assets');
      const outputAssetsDir = path.join(outputDir, 'assets');
      
      // Create output assets directory
      await fs.mkdir(outputAssetsDir, { recursive: true });
      
      try {
        await fs.access(assetsDir);
        await this.copyDirectory(assetsDir, outputAssetsDir);
      } catch {
        // No assets directory, skip
      }
    } catch (error) {
      logger.warn(`Failed to copy template assets: ${error.message}`);
    }
  }

  /**
   * Copy course assets (images, videos, etc.)
   */
  async copyCourseAssets(courseData, outputDir) {
    try {
      const assetsDir = path.join(outputDir, 'assets', 'course');
      await fs.mkdir(assetsDir, { recursive: true });
      
      // TODO: Implement course asset copying
      // This would involve fetching assets from Supabase storage
      // and copying them to the output directory
      
    } catch (error) {
      logger.warn(`Failed to copy course assets: ${error.message}`);
    }
  }

  /**
   * Create ZIP archive of exported content
   */
  async createArchive(outputDir, exportId) {
    try {
      const archivePath = path.join(this.outputPath, `${exportId}.zip`);
      const archive = archiver('zip', { zlib: { level: 9 } });
      const stream = require('fs').createWriteStream(archivePath);
      
      return new Promise((resolve, reject) => {
        archive
          .directory(outputDir, false)
          .on('error', reject)
          .pipe(stream);
        
        stream.on('close', () => {
          logger.info(`Archive created: ${archivePath} (${archive.pointer()} bytes)`);
          resolve(archivePath);
        });
        
        archive.finalize();
      });
    } catch (error) {
      throw new ProcessingError(`Archive creation failed: ${error.message}`);
    }
  }

  /**
   * Copy directory recursively
   */
  async copyDirectory(src, dest) {
    try {
      await fs.mkdir(dest, { recursive: true });
      const items = await fs.readdir(src);
      
      for (const item of items) {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        const stat = await fs.stat(srcPath);
        
        if (stat.isDirectory()) {
          await this.copyDirectory(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    } catch (error) {
      throw new ProcessingError(`Directory copy failed: ${error.message}`);
    }
  }

  /**
   * Calculate total course duration
   */
  calculateTotalDuration(sessions) {
    return sessions.reduce((total, session) => {
      return total + (session.estimated_duration || 0);
    }, 0);
  }

  /**
   * Generate course summary
   */
  generateCourseSummary(courseData, sessions) {
    return {
      totalSessions: sessions.length,
      totalActivities: sessions.reduce((total, session) => total + session.activities.length, 0),
      totalDuration: this.calculateTotalDuration(sessions),
      difficulty: courseData.difficulty || 'Intermediate',
      topics: sessions.map(session => session.title).slice(0, 5)
    };
  }

  /**
   * Clean up temporary files
   */
  async cleanup(exportId) {
    try {
      const outputDir = path.join(this.outputPath, exportId);
      const archivePath = path.join(this.outputPath, `${exportId}.zip`);
      
      await fs.rmdir(outputDir, { recursive: true });
      
      try {
        await fs.unlink(archivePath);
      } catch {
        // Archive might not exist
      }
      
      logger.info(`Cleanup completed for export: ${exportId}`);
    } catch (error) {
      logger.warn(`Cleanup failed for export ${exportId}: ${error.message}`);
    }
  }
}

module.exports = HTMLExporter;