const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
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
let logger, supabaseAdmin, ValidationError, ProcessingError, withRetry, VisualIntelligence;

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
  const errors = require('../utils/errors');
  ValidationError = errors.ValidationError;
  ProcessingError = errors.FileProcessingError;
} catch {
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

// Import VisualIntelligence for AI-powered visual generation
try {
  VisualIntelligence = require('./visualIntelligence');
} catch (error) {
  logger.warn('VisualIntelligence service not available:', error);
  VisualIntelligence = null;
}

/**
 * Design Engine Service
 * 
 * Advanced template and component management system for AI Course Creator.
 * Integrates with existing services to provide dynamic content rendering,
 * style generation, and responsive design calculations.
 */
class DesignEngine {
  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
    this.componentsPath = path.join(__dirname, '../components');
    this.compiledTemplates = new Map();
    this.compiledComponents = new Map();
    this.styleCache = new Map();
    this.markedInitialized = false;
    
    // Initialize VisualIntelligence if available
    this.visualIntelligence = VisualIntelligence ? new VisualIntelligence() : null;
    
    // Default theme configuration
    this.defaultTheme = {
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1f2937',
        textSecondary: '#6b7280',
        border: '#e5e7eb'
      },
      typography: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSizeBase: '16px',
        lineHeight: 1.6,
        headingFontFamily: 'inherit',
        headingLineHeight: 1.2
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        xxl: '3rem'
      },
      breakpoints: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        xxl: '1536px'
      },
      animations: {
        duration: '300ms',
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }
    };
    
    // Component registry
    this.componentRegistry = {
      'course-header': 'CourseHeader',
      'session-card': 'SessionCard',
      'activity-block': 'ActivityBlock',
      'assessment-section': 'AssessmentSection',
      'navigation-menu': 'NavigationMenu',
      'progress-tracker': 'ProgressTracker',
      'content-block': 'ContentBlock',
      'interactive-quiz': 'InteractiveQuiz',
      'code-snippet': 'CodeSnippet',
      'media-player': 'MediaPlayer',
      'discussion-forum': 'DiscussionForum',
      'resource-library': 'ResourceLibrary'
    };
    
    // Template variables registry
    this.templateVariables = new Set([
      'course', 'sessions', 'activities', 'user', 'options',
      'theme', 'navigation', 'analytics', 'metadata'
    ]);
    
    // Initialize Handlebars helpers
    this.registerHandlebarsHelpers();
    
    // Initialize default components
    this.initializeComponents();
  }

  /**
   * Ensure marked is initialized
   */
  async ensureMarkedInitialized() {
    if (!this.markedInitialized) {
      marked = await initMarked();
      this.markedInitialized = true;
    }
  }

  /**
   * Initialize built-in components
   */
  async initializeComponents() {
    try {
      await fs.mkdir(this.componentsPath, { recursive: true });
      
      // Create default components if they don't exist
      const defaultComponents = {
        'CourseHeader': this.getDefaultCourseHeaderComponent(),
        'SessionCard': this.getDefaultSessionCardComponent(),
        'ActivityBlock': this.getDefaultActivityBlockComponent(),
        'AssessmentSection': this.getDefaultAssessmentSectionComponent(),
        'NavigationMenu': this.getDefaultNavigationMenuComponent(),
        'ProgressTracker': this.getDefaultProgressTrackerComponent()
      };
      
      for (const [name, content] of Object.entries(defaultComponents)) {
        const componentPath = path.join(this.componentsPath, `${name}.hbs`);
        try {
          await fs.access(componentPath);
        } catch {
          await fs.writeFile(componentPath, content, 'utf8');
        }
      }
    } catch (error) {
      logger.error('Failed to initialize components:', error);
    }
  }

  /**
   * Register custom Handlebars helpers
   */
  registerHandlebarsHelpers() {
    // Component helper
    handlebars.registerHelper('component', (componentName, options) => {
      const component = this.compiledComponents.get(componentName);
      if (!component) {
        logger.warn(`Component not found: ${componentName}`);
        return '';
      }
      return new handlebars.SafeString(component(options.hash));
    });
    
    // Theme helper
    handlebars.registerHelper('theme', (path) => {
      const keys = path.split('.');
      let value = this.currentTheme || this.defaultTheme;
      for (const key of keys) {
        value = value[key];
        if (!value) break;
      }
      return value || '';
    });
    
    // Responsive helper
    handlebars.registerHelper('responsive', (breakpoint, options) => {
      const breakpoints = (this.currentTheme || this.defaultTheme).breakpoints;
      return `@media (min-width: ${breakpoints[breakpoint]})`;
    });
    
    // CSS variable helper
    handlebars.registerHelper('cssVar', (name, value) => {
      return new handlebars.SafeString(`var(--${name}, ${value})`);
    });
    
    // Quality score helper
    handlebars.registerHelper('qualityClass', (score) => {
      if (score >= 85) return 'quality-premium';
      if (score >= 70) return 'quality-recommended';
      if (score >= 50) return 'quality-minimum';
      return 'quality-low';
    });
    
    // Content prioritization helper
    handlebars.registerHelper('prioritizeContent', (content, qualityScore) => {
      if (qualityScore >= 85) {
        return new handlebars.SafeString(`<div class="priority-high">${content}</div>`);
      } else if (qualityScore >= 70) {
        return new handlebars.SafeString(`<div class="priority-medium">${content}</div>`);
      }
      return new handlebars.SafeString(`<div class="priority-low">${content}</div>`);
    });
    
    // RAG context helper
    handlebars.registerHelper('ragContext', (context) => {
      if (!context || !context.relevant_chunks) return '';
      
      let html = '<div class="rag-context">';
      html += '<h4>Related Context</h4>';
      html += '<ul class="context-list">';
      
      context.relevant_chunks.forEach(chunk => {
        html += `<li class="context-item" data-score="${chunk.similarity_score}">`;
        html += `<span class="context-text">${chunk.text}</span>`;
        html += `<span class="context-score">${Math.round(chunk.similarity_score * 100)}% match</span>`;
        html += '</li>';
      });
      
      html += '</ul></div>';
      return new handlebars.SafeString(html);
    });
    
    // Interactive element helper
    handlebars.registerHelper('interactive', (type, data, options) => {
      const interactiveId = `interactive-${uuidv4().substring(0, 8)}`;
      let html = '';
      
      switch (type) {
        case 'quiz':
          html = this.generateInteractiveQuiz(interactiveId, data, options.hash);
          break;
        case 'code':
          html = this.generateInteractiveCode(interactiveId, data, options.hash);
          break;
        case 'diagram':
          html = this.generateInteractiveDiagram(interactiveId, data, options.hash);
          break;
        default:
          html = `<div id="${interactiveId}" class="interactive-${type}">${data}</div>`;
      }
      
      return new handlebars.SafeString(html);
    });
    
    // AI Visual helper - generates intelligent visuals from content
    handlebars.registerHelper('aiVisual', async (content, options) => {
      if (!this.visualIntelligence) {
        return new handlebars.SafeString('<!-- Visual Intelligence not available -->');
      }
      
      try {
        const visualType = options.hash.type || 'auto';
        const result = await this.visualIntelligence.generateVisual(
          content,
          visualType,
          options.hash
        );
        return new handlebars.SafeString(result.svg);
      } catch (error) {
        logger.error('AI visual generation failed:', error);
        return new handlebars.SafeString('<!-- Visual generation failed -->');
      }
    });
    
    // Smart content transformation helper
    handlebars.registerHelper('smartTransform', async (content, options) => {
      if (!this.visualIntelligence) {
        return new handlebars.SafeString(content);
      }
      
      try {
        const analysis = await this.visualIntelligence.analyzeContent(content);
        
        // If high confidence for visual representation, generate it
        if (analysis.confidence > 0.7 && analysis.primaryVisual) {
          const result = await this.visualIntelligence.generateVisual(
            content,
            analysis.primaryVisual.type,
            { recommendations: analysis }
          );
          return new handlebars.SafeString(result.svg);
        }
        
        // Otherwise return original content
        return new handlebars.SafeString(content);
      } catch (error) {
        logger.error('Smart transform failed:', error);
        return new handlebars.SafeString(content);
      }
    });
    
    // Layout helper
    handlebars.registerHelper('layout', (type, options) => {
      const layouts = {
        'grid': 'display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;',
        'flex': 'display: flex; flex-wrap: wrap; gap: 1rem;',
        'masonry': 'column-count: 3; column-gap: 1rem;',
        'sidebar': 'display: grid; grid-template-columns: 300px 1fr; gap: 2rem;'
      };
      
      return new handlebars.SafeString(`style="${layouts[type] || ''}""`);
    });

    // Markdown helper
    handlebars.registerHelper('markdown', (text) => {
      if (!text) return '';
      // Simple markdown processing as fallback
      const processed = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
      return new handlebars.SafeString(processed);
    });

    // Format duration helper
    handlebars.registerHelper('formatDuration', (minutes) => {
      if (!minutes) return '0 min';
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
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

    // Array helpers
    handlebars.registerHelper('length', (array) => {
      return Array.isArray(array) ? array.length : 0;
    });

    handlebars.registerHelper('eachWithIndex', function(array, options) {
      let result = '';
      if (Array.isArray(array)) {
        for (let i = 0; i < array.length; i++) {
          result += options.fn({ ...array[i], index: i });
        }
      }
      return result;
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

    // Conditional helpers
    handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });

    // JSON helper
    handlebars.registerHelper('json', (context) => {
      return JSON.stringify(context);
    });

    // Unique ID helper
    handlebars.registerHelper('uniqueId', () => {
      return `id-${uuidv4().substring(0, 8)}`;
    });
  }

  /**
   * Load and compile template with caching
   */
  async loadTemplate(templateName, options = {}) {
    try {
      // Check cache first
      const cacheKey = `${templateName}-${JSON.stringify(options)}`;
      if (this.compiledTemplates.has(cacheKey)) {
        return this.compiledTemplates.get(cacheKey);
      }
      
      // Load template
      const templatePath = path.join(this.templatesPath, templateName, 'index.hbs');
      const templateContent = await fs.readFile(templatePath, 'utf8');
      
      // Process template with options
      const processedTemplate = await this.processTemplate(templateContent, options);
      
      // Compile template
      const compiled = handlebars.compile(processedTemplate);
      
      // Cache compiled template
      this.compiledTemplates.set(cacheKey, compiled);
      
      return compiled;
    } catch (error) {
      throw new ProcessingError(`Failed to load template ${templateName}: ${error.message}`);
    }
  }

  /**
   * Process template content
   */
  async processTemplate(templateContent, options) {
    let processed = templateContent;
    
    // Inject dynamic components
    if (options.injectComponents) {
      processed = await this.injectDynamicComponents(processed, options.components);
    }
    
    // Apply template transformations
    if (options.transformations) {
      processed = await this.applyTransformations(processed, options.transformations);
    }
    
    // Optimize for performance
    if (options.optimize) {
      processed = this.optimizeTemplate(processed);
    }
    
    return processed;
  }

  /**
   * Load and compile component
   */
  async loadComponent(componentName) {
    try {
      if (this.compiledComponents.has(componentName)) {
        return this.compiledComponents.get(componentName);
      }
      
      const componentPath = path.join(this.componentsPath, `${componentName}.hbs`);
      const componentContent = await fs.readFile(componentPath, 'utf8');
      
      const compiled = handlebars.compile(componentContent);
      this.compiledComponents.set(componentName, compiled);
      
      return compiled;
    } catch (error) {
      logger.error(`Failed to load component ${componentName}:`, error);
      return null;
    }
  }

  /**
   * Generate dynamic CSS based on theme and customizations
   */
  async generateCSS(templateName, customizations = {}, options = {}) {
    try {
      const cacheKey = `${templateName}-${JSON.stringify(customizations)}`;
      
      // Check cache
      if (this.styleCache.has(cacheKey) && !options.noCache) {
        return this.styleCache.get(cacheKey);
      }
      
      // Merge theme with customizations
      const theme = this.mergeTheme(this.defaultTheme, customizations);
      this.currentTheme = theme;
      
      // Generate CSS variables
      let css = this.generateCSSVariables(theme);
      
      // Add base styles
      css += this.generateBaseStyles(theme);
      
      // Add component styles
      css += await this.generateComponentStyles(theme);
      
      // Add template-specific styles
      css += await this.generateTemplateStyles(templateName, theme);
      
      // Add responsive styles
      css += this.generateResponsiveStyles(theme);
      
      // Add animation styles
      css += this.generateAnimationStyles(theme);
      
      // Apply optimizations
      if (options.optimize) {
        css = this.optimizeCSS(css);
      }
      
      // Add print styles
      if (options.includePrint) {
        css += this.generatePrintStyles(theme);
      }
      
      // Cache the result
      this.styleCache.set(cacheKey, css);
      
      return css;
    } catch (error) {
      throw new ProcessingError(`CSS generation failed: ${error.message}`);
    }
  }

  /**
   * Generate CSS variables from theme
   */
  generateCSSVariables(theme) {
    let css = ':root {\n';
    
    // Colors
    for (const [key, value] of Object.entries(theme.colors)) {
      css += `  --color-${key}: ${value};\n`;
    }
    
    // Typography
    css += `  --font-family: ${theme.typography.fontFamily};\n`;
    css += `  --font-size-base: ${theme.typography.fontSizeBase};\n`;
    css += `  --line-height: ${theme.typography.lineHeight};\n`;
    css += `  --heading-font-family: ${theme.typography.headingFontFamily};\n`;
    css += `  --heading-line-height: ${theme.typography.headingLineHeight};\n`;
    
    // Spacing
    for (const [key, value] of Object.entries(theme.spacing)) {
      css += `  --spacing-${key}: ${value};\n`;
    }
    
    // Animations
    css += `  --animation-duration: ${theme.animations.duration};\n`;
    css += `  --animation-easing: ${theme.animations.easing};\n`;
    
    css += '}\n\n';
    
    return css;
  }

  /**
   * Generate base styles
   */
  generateBaseStyles(theme) {
    return `
/* Base Styles */
* {
  box-sizing: border-box;
}

html {
  font-size: var(--font-size-base);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  padding: 0;
  font-family: var(--font-family);
  line-height: var(--line-height);
  color: var(--color-text);
  background-color: var(--color-background);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--heading-font-family);
  line-height: var(--heading-line-height);
  color: var(--color-text);
  margin-top: 0;
  margin-bottom: var(--spacing-md);
}

h1 { font-size: 2.5rem; }
h2 { font-size: 2rem; }
h3 { font-size: 1.75rem; }
h4 { font-size: 1.5rem; }
h5 { font-size: 1.25rem; }
h6 { font-size: 1rem; }

p {
  margin-top: 0;
  margin-bottom: var(--spacing-md);
}

a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color var(--animation-duration) var(--animation-easing);
}

a:hover {
  color: var(--color-secondary);
  text-decoration: underline;
}

/* Container */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-xl);
}

/* Surface */
.surface {
  background-color: var(--color-surface);
  border-radius: 0.5rem;
  padding: var(--spacing-xl);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Card */
.card {
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  transition: transform var(--animation-duration) var(--animation-easing);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Buttons */
.btn {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: 1rem;
  font-weight: 500;
  text-align: center;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all var(--animation-duration) var(--animation-easing);
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--color-secondary);
}

.btn-secondary {
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background-color: var(--color-border);
}

/* Quality Indicators */
.quality-premium {
  border-left: 4px solid var(--color-success);
}

.quality-recommended {
  border-left: 4px solid var(--color-primary);
}

.quality-minimum {
  border-left: 4px solid var(--color-warning);
}

.quality-low {
  border-left: 4px solid var(--color-danger);
}

/* Priority Indicators */
.priority-high {
  background-color: rgba(34, 197, 94, 0.1);
  padding: var(--spacing-md);
  border-radius: 0.375rem;
  margin-bottom: var(--spacing-md);
}

.priority-medium {
  background-color: rgba(59, 130, 246, 0.1);
  padding: var(--spacing-md);
  border-radius: 0.375rem;
  margin-bottom: var(--spacing-md);
}

.priority-low {
  background-color: rgba(107, 114, 128, 0.1);
  padding: var(--spacing-md);
  border-radius: 0.375rem;
  margin-bottom: var(--spacing-md);
}
`;
  }

  /**
   * Generate component styles
   */
  async generateComponentStyles(theme) {
    let css = '\n/* Component Styles */\n';
    
    // Course Header
    css += `
.course-header {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  padding: var(--spacing-xxl) var(--spacing-xl);
  border-radius: 0.75rem;
  margin-bottom: var(--spacing-xl);
  position: relative;
  overflow: hidden;
}

.course-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  transform: rotate(45deg);
}

.course-header .course-title {
  font-size: 3rem;
  margin-bottom: var(--spacing-md);
  position: relative;
  z-index: 1;
}

.course-header .course-meta {
  display: flex;
  gap: var(--spacing-xl);
  font-size: 1.125rem;
  opacity: 0.9;
  position: relative;
  z-index: 1;
}
`;
    
    // Session Card
    css += `
.session-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
  transition: all var(--animation-duration) var(--animation-easing);
  position: relative;
}

.session-card:hover {
  transform: translateX(4px);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
}

.session-card .session-number {
  position: absolute;
  top: var(--spacing-lg);
  right: var(--spacing-lg);
  width: 3rem;
  height: 3rem;
  background: var(--color-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.session-card .session-title {
  font-size: 1.5rem;
  margin-bottom: var(--spacing-sm);
  color: var(--color-text);
}

.session-card .session-activities {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.session-card .activity-tag {
  background: var(--color-surface);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
`;
    
    // Activity Block
    css += `
.activity-block {
  background: var(--color-surface);
  border-left: 4px solid var(--color-primary);
  padding: var(--spacing-lg);
  margin: var(--spacing-lg) 0;
  border-radius: 0.375rem;
}

.activity-block .activity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.activity-block .activity-type {
  display: inline-block;
  background: var(--color-primary);
  color: white;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.activity-block .activity-duration {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.activity-block .activity-content {
  color: var(--color-text);
}

.activity-block.type-quiz {
  border-left-color: var(--color-warning);
}

.activity-block.type-hands-on {
  border-left-color: var(--color-success);
}

.activity-block.type-discussion {
  border-left-color: var(--color-secondary);
}
`;
    
    // Progress Tracker
    css += `
.progress-tracker {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--color-surface);
  z-index: 1000;
}

.progress-tracker .progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  transition: width var(--animation-duration) var(--animation-easing);
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-surface);
  border-radius: 0.5rem;
  margin-bottom: var(--spacing-xl);
}

.progress-indicator .progress-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.progress-indicator .progress-visual {
  flex: 1;
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.progress-indicator .progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width var(--animation-duration) var(--animation-easing);
}
`;
    
    // Navigation Menu
    css += `
.navigation-menu {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: var(--spacing-lg);
  position: sticky;
  top: var(--spacing-xl);
}

.navigation-menu .nav-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: var(--spacing-md);
  color: var(--color-text);
}

.navigation-menu .nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.navigation-menu .nav-item {
  margin-bottom: var(--spacing-sm);
}

.navigation-menu .nav-link {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--color-text-secondary);
  border-radius: 0.375rem;
  transition: all var(--animation-duration) var(--animation-easing);
}

.navigation-menu .nav-link:hover {
  background: var(--color-surface);
  color: var(--color-primary);
  text-decoration: none;
}

.navigation-menu .nav-link.active {
  background: var(--color-primary);
  color: white;
}

.navigation-menu .nav-link .nav-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: var(--color-surface);
  border-radius: 50%;
  margin-right: var(--spacing-sm);
  font-size: 0.75rem;
  font-weight: 600;
}

.navigation-menu .nav-link.active .nav-number {
  background: rgba(255, 255, 255, 0.2);
}
`;
    
    return css;
  }

  /**
   * Generate template-specific styles
   */
  async generateTemplateStyles(templateName, theme) {
    try {
      const templateStylesPath = path.join(this.templatesPath, templateName, 'styles.css');
      let templateStyles = '';
      
      try {
        templateStyles = await fs.readFile(templateStylesPath, 'utf8');
      } catch {
        // Template-specific styles are optional
      }
      
      // Process template styles with theme variables
      if (templateStyles) {
        templateStyles = this.processTemplateStyles(templateStyles, theme);
      }
      
      return `\n/* Template-Specific Styles (${templateName}) */\n${templateStyles}`;
    } catch (error) {
      logger.warn(`Failed to load template styles for ${templateName}:`, error);
      return '';
    }
  }

  /**
   * Generate responsive styles
   */
  generateResponsiveStyles(theme) {
    const breakpoints = theme.breakpoints;
    
    return `
/* Responsive Styles */
@media (max-width: ${breakpoints.md}) {
  .container {
    padding: var(--spacing-lg);
  }
  
  .course-header .course-title {
    font-size: 2rem;
  }
  
  .course-header .course-meta {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .session-card {
    padding: var(--spacing-lg);
  }
  
  .navigation-menu {
    position: static;
    margin-bottom: var(--spacing-xl);
  }
}

@media (max-width: ${breakpoints.sm}) {
  .container {
    padding: var(--spacing-md);
  }
  
  h1 { font-size: 1.75rem; }
  h2 { font-size: 1.5rem; }
  h3 { font-size: 1.25rem; }
  h4 { font-size: 1.125rem; }
  
  .course-header {
    padding: var(--spacing-xl) var(--spacing-lg);
  }
  
  .activity-block {
    padding: var(--spacing-md);
  }
}

@media (min-width: ${breakpoints.lg}) {
  .container {
    padding: var(--spacing-xxl);
  }
  
  .two-column-layout {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: var(--spacing-xxl);
  }
  
  .three-column-layout {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-xl);
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0f172a;
    --color-surface: #1e293b;
    --color-text: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-border: #334155;
  }
  
  .course-header {
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  }
  
  .card {
    background-color: var(--color-surface);
  }
  
  .btn-secondary {
    background-color: var(--color-surface);
    border-color: var(--color-border);
  }
  
  .btn-secondary:hover {
    background-color: var(--color-border);
  }
}
`;
  }

  /**
   * Generate animation styles
   */
  generateAnimationStyles(theme) {
    return `
/* Animation Styles */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-fade-in {
  animation: fadeIn var(--animation-duration) var(--animation-easing) forwards;
}

.animate-slide-in {
  animation: slideIn var(--animation-duration) var(--animation-easing) forwards;
}

.animate-pulse {
  animation: pulse 2s infinite;
}

/* Stagger animations for lists */
.stagger-animation > * {
  opacity: 0;
  animation: fadeIn var(--animation-duration) var(--animation-easing) forwards;
}

.stagger-animation > *:nth-child(1) { animation-delay: 0ms; }
.stagger-animation > *:nth-child(2) { animation-delay: 50ms; }
.stagger-animation > *:nth-child(3) { animation-delay: 100ms; }
.stagger-animation > *:nth-child(4) { animation-delay: 150ms; }
.stagger-animation > *:nth-child(5) { animation-delay: 200ms; }
.stagger-animation > *:nth-child(6) { animation-delay: 250ms; }
.stagger-animation > *:nth-child(7) { animation-delay: 300ms; }
.stagger-animation > *:nth-child(8) { animation-delay: 350ms; }
.stagger-animation > *:nth-child(9) { animation-delay: 400ms; }
.stagger-animation > *:nth-child(10) { animation-delay: 450ms; }

/* Loading states */
.loading {
  position: relative;
  overflow: hidden;
}

.loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
`;
  }

  /**
   * Generate print styles
   */
  generatePrintStyles(theme) {
    return `
/* Print Styles */
@media print {
  body {
    font-size: 12pt;
    line-height: 1.5;
    color: black;
    background: white;
  }
  
  .container {
    max-width: 100%;
    padding: 0;
  }
  
  .no-print,
  .navigation-menu,
  .progress-tracker,
  .btn,
  .interactive-element {
    display: none !important;
  }
  
  .course-header {
    background: none;
    color: black;
    border-bottom: 3px solid black;
    padding: 0 0 1rem 0;
    margin-bottom: 2rem;
  }
  
  .session-card {
    border: 1px solid #ccc;
    page-break-inside: avoid;
    margin-bottom: 1rem;
  }
  
  .activity-block {
    border: 1px solid #999;
    page-break-inside: avoid;
    margin: 1rem 0;
  }
  
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
    color: black;
  }
  
  a {
    color: black;
    text-decoration: underline;
  }
  
  a[href^="http"]:after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
  }
  
  @page {
    margin: 2cm;
  }
}
`;
  }

  /**
   * Merge theme with customizations
   */
  mergeTheme(baseTheme, customizations) {
    const merged = JSON.parse(JSON.stringify(baseTheme));
    
    // Merge colors
    if (customizations.colors) {
      Object.assign(merged.colors, customizations.colors);
    }
    
    // Merge typography
    if (customizations.typography) {
      Object.assign(merged.typography, customizations.typography);
    }
    
    // Merge spacing
    if (customizations.spacing) {
      Object.assign(merged.spacing, customizations.spacing);
    }
    
    // Merge breakpoints
    if (customizations.breakpoints) {
      Object.assign(merged.breakpoints, customizations.breakpoints);
    }
    
    // Merge animations
    if (customizations.animations) {
      Object.assign(merged.animations, customizations.animations);
    }
    
    return merged;
  }

  /**
   * Process template styles with theme variables
   */
  processTemplateStyles(styles, theme) {
    // Replace theme placeholders
    let processed = styles;
    
    // Replace color placeholders
    for (const [key, value] of Object.entries(theme.colors)) {
      const regex = new RegExp(`\\{\\{color\\.${key}\\}\\}`, 'g');
      processed = processed.replace(regex, value);
    }
    
    // Replace spacing placeholders
    for (const [key, value] of Object.entries(theme.spacing)) {
      const regex = new RegExp(`\\{\\{spacing\\.${key}\\}\\}`, 'g');
      processed = processed.replace(regex, value);
    }
    
    // Replace typography placeholders
    for (const [key, value] of Object.entries(theme.typography)) {
      const regex = new RegExp(`\\{\\{typography\\.${key}\\}\\}`, 'g');
      processed = processed.replace(regex, value);
    }
    
    return processed;
  }

  /**
   * Optimize CSS for production
   */
  optimizeCSS(css) {
    // Remove comments
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove extra whitespace
    css = css.replace(/\s+/g, ' ');
    
    // Remove unnecessary spaces around symbols
    css = css.replace(/\s*([{}:;,])\s*/g, '$1');
    
    // Remove trailing semicolons before closing braces
    css = css.replace(/;}/g, '}');
    
    // Remove empty rules
    css = css.replace(/[^{}]+\{\s*\}/g, '');
    
    return css.trim();
  }

  /**
   * Optimize template for performance
   */
  optimizeTemplate(template) {
    // Remove HTML comments
    template = template.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove extra whitespace between tags
    template = template.replace(/>\s+</g, '><');
    
    // Trim whitespace
    template = template.trim();
    
    return template;
  }

  /**
   * Inject dynamic components into template
   */
  async injectDynamicComponents(template, components) {
    let processed = template;
    
    for (const component of components) {
      const placeholder = `{{component:${component.name}}}`;
      if (processed.includes(placeholder)) {
        const componentHtml = await this.renderComponent(component.name, component.data);
        processed = processed.replace(placeholder, componentHtml);
      }
    }
    
    return processed;
  }

  /**
   * Apply template transformations
   */
  async applyTransformations(template, transformations) {
    let processed = template;
    
    for (const transformation of transformations) {
      switch (transformation.type) {
        case 'replace':
          processed = processed.replace(
            new RegExp(transformation.search, 'g'),
            transformation.replace
          );
          break;
        case 'inject':
          processed = processed.replace(
            transformation.marker,
            transformation.content
          );
          break;
        case 'wrap':
          processed = processed.replace(
            new RegExp(transformation.search, 'g'),
            `${transformation.before}$1${transformation.after}`
          );
          break;
      }
    }
    
    return processed;
  }

  /**
   * Render component with data
   */
  async renderComponent(componentName, data = {}) {
    try {
      const component = await this.loadComponent(componentName);
      if (!component) {
        return `<!-- Component not found: ${componentName} -->`;
      }
      
      return component(data);
    } catch (error) {
      logger.error(`Failed to render component ${componentName}:`, error);
      return `<!-- Component render failed: ${componentName} -->`;
    }
  }

  /**
   * Generate interactive quiz HTML
   */
  generateInteractiveQuiz(id, data, options) {
    const questions = data.questions || [];
    let html = `<div id="${id}" class="interactive-quiz">`;
    
    html += '<div class="quiz-header">';
    html += `<h3 class="quiz-title">${data.title || 'Quiz'}</h3>`;
    html += `<div class="quiz-progress">Question <span class="current">1</span> of <span class="total">${questions.length}</span></div>`;
    html += '</div>';
    
    html += '<div class="quiz-questions">';
    questions.forEach((question, index) => {
      html += `<div class="quiz-question" data-question="${index}" ${index === 0 ? '' : 'style="display:none;"'}>`;
      html += `<h4>${question.question}</h4>`;
      
      if (question.type === 'multiple-choice') {
        html += '<div class="quiz-options">';
        question.options.forEach((option, optIndex) => {
          html += `
            <label class="quiz-option">
              <input type="radio" name="question-${index}" value="${optIndex}">
              <span class="option-text">${option}</span>
            </label>
          `;
        });
        html += '</div>';
      } else if (question.type === 'true-false') {
        html += `
          <div class="quiz-options">
            <label class="quiz-option">
              <input type="radio" name="question-${index}" value="true">
              <span class="option-text">True</span>
            </label>
            <label class="quiz-option">
              <input type="radio" name="question-${index}" value="false">
              <span class="option-text">False</span>
            </label>
          </div>
        `;
      }
      
      html += `<div class="quiz-feedback" style="display:none;"></div>`;
      html += '</div>';
    });
    html += '</div>';
    
    html += `
      <div class="quiz-controls">
        <button class="btn btn-secondary quiz-prev" disabled>Previous</button>
        <button class="btn btn-primary quiz-next">Next</button>
        <button class="btn btn-primary quiz-submit" style="display:none;">Submit Quiz</button>
      </div>
    `;
    
    html += '</div>';
    
    // Add quiz script
    html += `
      <script>
      (function() {
        const quiz = document.getElementById('${id}');
        let currentQuestion = 0;
        const questions = quiz.querySelectorAll('.quiz-question');
        const prevBtn = quiz.querySelector('.quiz-prev');
        const nextBtn = quiz.querySelector('.quiz-next');
        const submitBtn = quiz.querySelector('.quiz-submit');
        
        function showQuestion(index) {
          questions.forEach((q, i) => {
            q.style.display = i === index ? 'block' : 'none';
          });
          
          quiz.querySelector('.current').textContent = index + 1;
          
          prevBtn.disabled = index === 0;
          nextBtn.style.display = index === questions.length - 1 ? 'none' : 'inline-block';
          submitBtn.style.display = index === questions.length - 1 ? 'inline-block' : 'none';
        }
        
        prevBtn.addEventListener('click', () => {
          if (currentQuestion > 0) {
            currentQuestion--;
            showQuestion(currentQuestion);
          }
        });
        
        nextBtn.addEventListener('click', () => {
          if (currentQuestion < questions.length - 1) {
            currentQuestion++;
            showQuestion(currentQuestion);
          }
        });
        
        submitBtn.addEventListener('click', () => {
          alert('Quiz submitted!');
        });
      })();
      </script>
    `;
    
    return html;
  }

  /**
   * Generate interactive code HTML
   */
  generateInteractiveCode(id, data, options) {
    const language = data.language || 'javascript';
    const code = data.code || '';
    const editable = options.editable !== false;
    
    let html = `<div id="${id}" class="interactive-code">`;
    
    if (data.title) {
      html += `<div class="code-header">`;
      html += `<h4 class="code-title">${data.title}</h4>`;
      html += `<span class="code-language">${language}</span>`;
      html += `</div>`;
    }
    
    html += `<div class="code-editor ${editable ? 'editable' : ''}">`;
    html += `<pre><code class="language-${language}">${this.escapeHtml(code)}</code></pre>`;
    html += `</div>`;
    
    if (options.runnable) {
      html += `
        <div class="code-controls">
          <button class="btn btn-primary run-code">Run Code</button>
          <button class="btn btn-secondary reset-code">Reset</button>
        </div>
        <div class="code-output" style="display:none;">
          <h5>Output:</h5>
          <pre class="output-content"></pre>
        </div>
      `;
    }
    
    html += '</div>';
    
    return html;
  }

  /**
   * Generate interactive diagram HTML
   */
  async generateInteractiveDiagram(id, data, options) {
    const type = data.type || 'flowchart';
    
    let html = `<div id="${id}" class="interactive-diagram" data-type="${type}">`;
    
    if (data.title) {
      html += `<h4 class="diagram-title">${data.title}</h4>`;
    }
    
    html += `<div class="diagram-container">`;
    
    // Use VisualIntelligence for AI-powered diagrams
    if (this.visualIntelligence) {
      try {
        const result = await this.visualIntelligence.generateVisual(
          data,
          type,
          { ...options, interactive: true }
        );
        html += result.svg;
      } catch (error) {
        logger.warn('AI diagram generation failed, using fallback:', error);
        // Fallback to simple diagrams
        if (type === 'flowchart') {
          html += await this.generateFlowchartHTML(data);
        } else if (type === 'mindmap') {
          html += this.generateMindmapHTML(data);
        } else if (type === 'sequence') {
          html += this.generateSequenceHTML(data);
        }
      }
    } else {
      // No VisualIntelligence, use simple fallbacks
      if (type === 'flowchart') {
        html += await this.generateFlowchartHTML(data);
      } else if (type === 'mindmap') {
        html += this.generateMindmapHTML(data);
      } else if (type === 'sequence') {
        html += this.generateSequenceHTML(data);
      }
    }
    
    html += `</div>`;
    
    if (options.interactive) {
      html += `
        <div class="diagram-controls">
          <button class="btn btn-secondary zoom-in">Zoom In</button>
          <button class="btn btn-secondary zoom-out">Zoom Out</button>
          <button class="btn btn-secondary reset-view">Reset View</button>
        </div>
      `;
    }
    
    html += '</div>';
    
    return html;
  }

  /**
   * Generate flowchart HTML
   */
  generateFlowchartHTML(data) {
    // Note: This is a simple placeholder. Visual Intelligence integration
    // happens at a higher level in generateInteractiveDiagram
    
    // Fallback to simple SVG
    return `
      <svg viewBox="0 0 800 600" class="flowchart-svg">
        <!-- Add flowchart elements here -->
        <rect x="350" y="50" width="100" height="60" rx="5" fill="var(--color-primary)" />
        <text x="400" y="85" text-anchor="middle" fill="white">Start</text>
      </svg>
    `;
  }

  /**
   * Generate mindmap HTML
   */
  generateMindmapHTML(data) {
    return `<div class="mindmap-placeholder">Mindmap visualization</div>`;
  }

  /**
   * Generate sequence diagram HTML
   */
  generateSequenceHTML(data) {
    return `<div class="sequence-placeholder">Sequence diagram</div>`;
  }

  /**
   * Escape HTML for safe rendering
   */
  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Get default component templates
   */
  getDefaultCourseHeaderComponent() {
    return `<header class="course-header {{qualityClass course.quality_score}}">
  {{#if logo}}
  <img src="{{logo}}" alt="Course Logo" class="course-logo">
  {{/if}}
  
  <div class="course-header-content">
    <h1 class="course-title">{{course.title}}</h1>
    
    {{#if course.description}}
    <p class="course-description">{{{markdown course.description}}}</p>
    {{/if}}
    
    <div class="course-meta">
      {{#if course.instructor}}
      <span class="course-instructor">
        <i class="icon-user"></i> {{course.instructor}}
      </span>
      {{/if}}
      
      <span class="course-duration">
        <i class="icon-clock"></i> {{formatDuration totalDuration}}
      </span>
      
      <span class="course-sessions">
        <i class="icon-book"></i> {{totalSessions}} Sessions
      </span>
      
      {{#if course.difficulty}}
      <span class="course-difficulty difficulty-{{course.difficulty}}">
        <i class="icon-signal"></i> {{capitalize course.difficulty}}
      </span>
      {{/if}}
    </div>
    
    {{#if course.objectives}}
    <div class="course-objectives">
      <h3>Learning Objectives</h3>
      <ul>
        {{#each course.objectives}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
    </div>
    {{/if}}
  </div>
  
  {{#if showProgress}}
  <div class="course-progress">
    <div class="progress-visual">
      <div class="progress-fill" style="width: {{progress}}%"></div>
    </div>
    <span class="progress-text">{{progress}}% Complete</span>
  </div>
  {{/if}}
</header>`;
  }

  getDefaultSessionCardComponent() {
    return `<div class="session-card {{qualityClass quality_score}}" data-session-id="{{id}}">
  <div class="session-number">{{sessionNumber}}</div>
  
  <div class="session-content">
    <h3 class="session-title">{{title}}</h3>
    
    {{#if description}}
    <p class="session-description">{{{markdown description}}}</p>
    {{/if}}
    
    <div class="session-meta">
      <span class="session-duration">
        <i class="icon-clock"></i> {{formatDuration estimated_duration}}
      </span>
      
      {{#if activities}}
      <span class="session-activities">
        <i class="icon-tasks"></i> {{length activities}} Activities
      </span>
      {{/if}}
    </div>
    
    {{#if showActivities}}
    <div class="session-activities-preview">
      {{#each activities}}
      <span class="activity-tag type-{{type}}">{{title}}</span>
      {{/each}}
    </div>
    {{/if}}
    
    {{#if actionUrl}}
    <a href="{{actionUrl}}" class="btn btn-primary session-action">
      {{#if actionText}}{{actionText}}{{else}}View Session{{/if}}
    </a>
    {{/if}}
  </div>
  
  {{#if ragContext}}
  {{ragContext ragContext}}
  {{/if}}
</div>`;
  }

  getDefaultActivityBlockComponent() {
    return `<div class="activity-block type-{{type}} {{qualityClass quality_score}}">
  <div class="activity-header">
    <div class="activity-info">
      <h4 class="activity-title">{{title}}</h4>
      <span class="activity-type">{{capitalize type}}</span>
    </div>
    
    <div class="activity-meta">
      {{#if estimated_duration}}
      <span class="activity-duration">
        <i class="icon-clock"></i> {{formatDuration estimated_duration}}
      </span>
      {{/if}}
      
      {{#if difficulty}}
      <span class="activity-difficulty difficulty-{{difficulty}}">
        {{capitalize difficulty}}
      </span>
      {{/if}}
    </div>
  </div>
  
  {{#if description}}
  <div class="activity-description">
    {{{markdown description}}}
  </div>
  {{/if}}
  
  <div class="activity-content">
    {{#ifEquals type "quiz"}}
      {{interactive "quiz" content}}
    {{/ifEquals}}
    
    {{#ifEquals type "code"}}
      {{interactive "code" content editable=true runnable=true}}
    {{/ifEquals}}
    
    {{#ifEquals type "discussion"}}
      <div class="discussion-prompt">
        {{{content}}}
      </div>
    {{/ifEquals}}
    
    {{#ifEquals type "hands-on"}}
      <div class="hands-on-content">
        {{{content}}}
      </div>
    {{/ifEquals}}
    
    {{#ifEquals type "default"}}
      {{{content}}}
    {{/ifEquals}}
  </div>
  
  {{#if resources}}
  <div class="activity-resources">
    <h5>Resources</h5>
    <ul>
      {{#each resources}}
      <li><a href="{{url}}" target="_blank">{{title}}</a></li>
      {{/each}}
    </ul>
  </div>
  {{/if}}
</div>`;
  }

  getDefaultAssessmentSectionComponent() {
    return `<section class="assessment-section">
  <div class="assessment-header">
    <h3 class="assessment-title">{{title}}</h3>
    
    <div class="assessment-meta">
      <span class="assessment-type">{{type}}</span>
      <span class="assessment-duration">{{formatDuration duration}}</span>
      {{#if passing_score}}
      <span class="assessment-passing">Passing Score: {{passing_score}}%</span>
      {{/if}}
    </div>
  </div>
  
  {{#if instructions}}
  <div class="assessment-instructions">
    <h4>Instructions</h4>
    {{{markdown instructions}}}
  </div>
  {{/if}}
  
  <div class="assessment-content">
    {{#if questions}}
    <div class="assessment-questions">
      {{#eachWithIndex questions}}
      <div class="assessment-question">
        <h5>Question {{add index 1}}</h5>
        <p class="question-text">{{question}}</p>
        
        {{#ifEquals type "multiple-choice"}}
        <div class="question-options">
          {{#each options}}
          <label class="option">
            <input type="radio" name="q{{../index}}" value="{{@index}}">
            <span>{{this}}</span>
          </label>
          {{/each}}
        </div>
        {{/ifEquals}}
        
        {{#ifEquals type "short-answer"}}
        <textarea class="answer-input" placeholder="Enter your answer..."></textarea>
        {{/ifEquals}}
        
        {{#if points}}
        <span class="question-points">{{points}} points</span>
        {{/if}}
      </div>
      {{/eachWithIndex}}
    </div>
    {{/if}}
  </div>
  
  <div class="assessment-actions">
    <button class="btn btn-primary submit-assessment">Submit Assessment</button>
    {{#if allow_save}}
    <button class="btn btn-secondary save-progress">Save Progress</button>
    {{/if}}
  </div>
</section>`;
  }

  getDefaultNavigationMenuComponent() {
    return `<nav class="navigation-menu">
  <h3 class="nav-title">{{#if title}}{{title}}{{else}}Course Navigation{{/if}}</h3>
  
  <ul class="nav-list">
    {{#if showHome}}
    <li class="nav-item">
      <a href="{{homeUrl}}" class="nav-link {{#if isHome}}active{{/if}}">
        <i class="icon-home"></i>
        <span>Course Overview</span>
      </a>
    </li>
    {{/if}}
    
    {{#each sessions}}
    <li class="nav-item">
      <a href="{{url}}" class="nav-link {{#if active}}active{{/if}}">
        <span class="nav-number">{{sessionNumber}}</span>
        <span class="nav-text">{{title}}</span>
        {{#if completed}}
        <i class="icon-check"></i>
        {{/if}}
      </a>
      
      {{#if showActivities}}
      <ul class="nav-sublist">
        {{#each activities}}
        <li class="nav-subitem">
          <a href="{{url}}" class="nav-sublink {{#if active}}active{{/if}}">
            <i class="icon-{{type}}"></i>
            <span>{{title}}</span>
          </a>
        </li>
        {{/each}}
      </ul>
      {{/if}}
    </li>
    {{/each}}
    
    {{#if showResources}}
    <li class="nav-item">
      <a href="{{resourcesUrl}}" class="nav-link {{#if isResources}}active{{/if}}">
        <i class="icon-folder"></i>
        <span>Resources</span>
      </a>
    </li>
    {{/if}}
    
    {{#if showAssessments}}
    <li class="nav-item">
      <a href="{{assessmentsUrl}}" class="nav-link {{#if isAssessments}}active{{/if}}">
        <i class="icon-clipboard"></i>
        <span>Assessments</span>
      </a>
    </li>
    {{/if}}
  </ul>
  
  {{#if showProgress}}
  <div class="nav-progress">
    <div class="progress-bar">
      <div class="progress-fill" style="width: {{progress}}%"></div>
    </div>
    <span class="progress-text">{{progress}}% Complete</span>
  </div>
  {{/if}}
</nav>`;
  }

  getDefaultProgressTrackerComponent() {
    return `<div class="progress-tracker-component">
  {{#if showOverall}}
  <div class="overall-progress">
    <h4>Overall Progress</h4>
    <div class="progress-indicator">
      <div class="progress-visual">
        <div class="progress-fill" style="width: {{overallProgress}}%"></div>
      </div>
      <span class="progress-text">{{overallProgress}}% Complete</span>
    </div>
  </div>
  {{/if}}
  
  {{#if showSessions}}
  <div class="session-progress">
    <h4>Session Progress</h4>
    <div class="progress-list">
      {{#each sessions}}
      <div class="progress-item">
        <span class="progress-label">{{title}}</span>
        <div class="progress-bar-small">
          <div class="progress-fill" style="width: {{progress}}%"></div>
        </div>
        <span class="progress-value">{{progress}}%</span>
      </div>
      {{/each}}
    </div>
  </div>
  {{/if}}
  
  {{#if showStats}}
  <div class="progress-stats">
    <div class="stat-item">
      <span class="stat-value">{{completedSessions}}</span>
      <span class="stat-label">Sessions Completed</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">{{completedActivities}}</span>
      <span class="stat-label">Activities Completed</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">{{timeSpent}}</span>
      <span class="stat-label">Time Spent</span>
    </div>
    {{#if averageScore}}
    <div class="stat-item">
      <span class="stat-value">{{averageScore}}%</span>
      <span class="stat-label">Average Score</span>
    </div>
    {{/if}}
  </div>
  {{/if}}
  
  {{#if showAchievements}}
  <div class="achievements">
    <h4>Achievements</h4>
    <div class="achievement-list">
      {{#each achievements}}
      <div class="achievement-item {{#if earned}}earned{{/if}}">
        <i class="icon-{{icon}}"></i>
        <span class="achievement-name">{{name}}</span>
      </div>
      {{/each}}
    </div>
  </div>
  {{/if}}
</div>`;
  }

  /**
   * Calculate responsive breakpoints
   */
  calculateBreakpoints(content, options = {}) {
    const breakpoints = {
      mobile: { min: 0, max: 640 },
      tablet: { min: 641, max: 1024 },
      desktop: { min: 1025, max: 1920 },
      wide: { min: 1921, max: Infinity }
    };
    
    // Calculate content density
    const contentLength = JSON.stringify(content).length;
    const sessionCount = content.sessions ? content.sessions.length : 0;
    const activityCount = content.sessions ? 
      content.sessions.reduce((total, session) => 
        total + (session.activities ? session.activities.length : 0), 0) : 0;
    
    // Adjust breakpoints based on content
    if (sessionCount > 10 || activityCount > 50) {
      // For large courses, optimize for navigation
      breakpoints.tablet.max = 1200;
      breakpoints.desktop.min = 1201;
    }
    
    if (options.prioritizeMobile) {
      breakpoints.mobile.max = 768;
      breakpoints.tablet.min = 769;
    }
    
    return breakpoints;
  }

  /**
   * Generate template variables
   */
  generateTemplateVariables(courseData, options = {}) {
    const variables = {
      course: courseData,
      theme: this.currentTheme || this.defaultTheme,
      options: options,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        generator: 'AI Course Creator Design Engine'
      },
      navigation: {
        showHome: options.showHome !== false,
        showResources: options.showResources !== false,
        showAssessments: options.showAssessments !== false,
        showProgress: options.showProgress !== false
      },
      analytics: {
        trackingEnabled: options.analytics !== false,
        trackingId: options.trackingId || null
      }
    };
    
    // Add quality-based variables
    if (courseData.quality_score) {
      variables.quality = {
        score: courseData.quality_score,
        level: this.getQualityLevel(courseData.quality_score),
        class: this.getQualityClass(courseData.quality_score)
      };
    }
    
    // Add RAG context if available
    if (courseData.rag_context) {
      variables.ragContext = courseData.rag_context;
    }
    
    return variables;
  }

  /**
   * Get quality level from score
   */
  getQualityLevel(score) {
    if (score >= 85) return 'premium';
    if (score >= 70) return 'recommended';
    if (score >= 50) return 'minimum';
    return 'low';
  }

  /**
   * Get quality class from score
   */
  getQualityClass(score) {
    return `quality-${this.getQualityLevel(score)}`;
  }

  /**
   * Integrate with existing services
   */
  async integrateWithServices(courseData, options = {}) {
    const integrated = { ...courseData };
    
    // Integrate quality scores
    if (options.useQualityScores && courseData.sessions) {
      integrated.sessions = courseData.sessions.map(session => ({
        ...session,
        quality_score: session.quality_score || this.calculateSessionQuality(session),
        priority: this.calculateContentPriority(session)
      }));
    }
    
    // Integrate RAG context
    if (options.useRAGContext && courseData.rag_contexts) {
      integrated.sessions = integrated.sessions.map((session, index) => ({
        ...session,
        rag_context: courseData.rag_contexts[index] || null
      }));
    }
    
    // Sort by priority if requested
    if (options.sortByPriority) {
      integrated.sessions.sort((a, b) => b.priority - a.priority);
    }
    
    return integrated;
  }

  /**
   * Calculate session quality score
   */
  calculateSessionQuality(session) {
    let score = 50; // Base score
    
    // Content completeness
    if (session.content && session.content.length > 500) score += 10;
    if (session.description) score += 5;
    if (session.objectives && session.objectives.length > 0) score += 10;
    
    // Activities
    if (session.activities) {
      score += Math.min(session.activities.length * 5, 20);
      
      // Activity diversity
      const activityTypes = new Set(session.activities.map(a => a.type));
      score += Math.min(activityTypes.size * 5, 15);
    }
    
    // Time estimation
    if (session.estimated_duration) score += 5;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate content priority
   */
  calculateContentPriority(content) {
    let priority = 0;
    
    // Quality score weight
    if (content.quality_score) {
      priority += content.quality_score * 0.4;
    }
    
    // Content depth weight
    const contentLength = JSON.stringify(content).length;
    priority += Math.min(contentLength / 1000, 30);
    
    // Activity count weight
    if (content.activities) {
      priority += Math.min(content.activities.length * 5, 20);
    }
    
    // RAG relevance weight
    if (content.rag_context && content.rag_context.average_similarity) {
      priority += content.rag_context.average_similarity * 10;
    }
    
    return Math.round(priority);
  }

  /**
   * Process content with AI visual enhancement
   * Analyzes content and automatically adds visual representations
   */
  async enhanceContentWithVisuals(content, options = {}) {
    if (!this.visualIntelligence) {
      logger.warn('Visual Intelligence not available, returning original content');
      return content;
    }

    try {
      logger.info('Enhancing content with AI-powered visuals');
      
      // Process different content types
      if (typeof content === 'string') {
        return await this.enhanceTextContent(content, options);
      } else if (typeof content === 'object') {
        return await this.enhanceStructuredContent(content, options);
      }
      
      return content;
    } catch (error) {
      logger.error('Content visual enhancement failed:', error);
      return content; // Return original on error
    }
  }

  /**
   * Enhance text content with visuals
   */
  async enhanceTextContent(text, options) {
    const analysis = await this.visualIntelligence.analyzeContent(text, options.context);
    
    // If no visual opportunities found, return original
    if (!analysis.primaryVisual || analysis.confidence < 0.6) {
      return text;
    }
    
    // Generate the visual
    const visual = await this.visualIntelligence.generateVisual(
      text,
      analysis.primaryVisual.type,
      {
        recommendations: analysis,
        ...options
      }
    );
    
    // Return enhanced content with visual
    return `
      <div class="ai-enhanced-content">
        <div class="visual-representation">
          ${visual.svg}
        </div>
        <div class="original-content">
          ${text}
        </div>
      </div>
    `;
  }

  /**
   * Enhance structured content (course data) with visuals
   */
  async enhanceStructuredContent(content, options) {
    const enhanced = { ...content };
    
    // Enhance course objectives with infographic
    if (content.objectives && Array.isArray(content.objectives)) {
      try {
        const objectivesVisual = await this.visualIntelligence.generateVisual(
          content.objectives,
          'infographic',
          {
            title: 'Learning Objectives',
            context: { theme: 'academic' },
            ...options
          }
        );
        enhanced.objectivesVisual = objectivesVisual.svg;
      } catch (error) {
        logger.warn('Failed to generate objectives visual:', error);
      }
    }
    
    // Enhance sessions
    if (content.sessions && Array.isArray(content.sessions)) {
      enhanced.sessions = await Promise.all(
        content.sessions.map(async (session) => {
          const enhancedSession = { ...session };
          
          // Analyze session content for visual opportunities
          if (session.content) {
            const analysis = await this.visualIntelligence.analyzeContent(
              session.content,
              { type: 'session', ...options.context }
            );
            
            if (analysis.confidence > 0.7 && analysis.primaryVisual) {
              try {
                const visual = await this.visualIntelligence.generateVisual(
                  session.content,
                  analysis.primaryVisual.type,
                  { recommendations: analysis }
                );
                enhancedSession.contentVisual = visual.svg;
              } catch (error) {
                logger.warn(`Failed to generate visual for session ${session.id}:`, error);
              }
            }
          }
          
          // Enhance activities
          if (session.activities && Array.isArray(session.activities)) {
            enhancedSession.activities = await this.enhanceActivities(
              session.activities,
              options
            );
          }
          
          return enhancedSession;
        })
      );
    }
    
    // Add course overview visualization if we have enough data
    if (enhanced.sessions && enhanced.sessions.length > 3) {
      try {
        const overviewData = {
          title: content.title,
          sessions: enhanced.sessions.map(s => ({
            title: s.title,
            duration: s.estimated_duration,
            activities: s.activities ? s.activities.length : 0
          }))
        };
        
        const overviewVisual = await this.visualIntelligence.generateVisual(
          overviewData,
          'timeline',
          {
            title: 'Course Overview',
            context: { theme: options.theme || 'default' }
          }
        );
        enhanced.overviewVisual = overviewVisual.svg;
      } catch (error) {
        logger.warn('Failed to generate course overview visual:', error);
      }
    }
    
    return enhanced;
  }

  /**
   * Enhance activities with appropriate visuals
   */
  async enhanceActivities(activities, options) {
    return Promise.all(
      activities.map(async (activity) => {
        const enhanced = { ...activity };
        
        // Skip if already has visual content
        if (activity.visual || activity.diagram) {
          return enhanced;
        }
        
        // Determine if activity would benefit from visualization
        if (activity.type === 'quiz' && activity.questions) {
          // Quiz activities might get a progress visualization
          try {
            const quizData = {
              title: activity.title,
              questionCount: activity.questions.length,
              estimatedTime: activity.estimated_duration
            };
            
            const visual = await this.visualIntelligence.generateVisual(
              quizData,
              'infographic',
              {
                context: { type: 'quiz-overview' },
                width: 400,
                height: 200
              }
            );
            enhanced.overviewVisual = visual.svg;
          } catch (error) {
            logger.debug('Quiz visual generation failed:', error);
          }
        } else if (activity.content) {
          // Analyze activity content for visual opportunities
          const analysis = await this.visualIntelligence.analyzeContent(
            activity.content,
            { type: 'activity', activityType: activity.type }
          );
          
          if (analysis.confidence > 0.75 && analysis.primaryVisual) {
            try {
              const visual = await this.visualIntelligence.generateVisual(
                activity.content,
                analysis.primaryVisual.type,
                {
                  recommendations: analysis,
                  width: 600,
                  height: 400
                }
              );
              enhanced.contentVisual = visual.svg;
            } catch (error) {
              logger.debug(`Activity visual generation failed for ${activity.id}:`, error);
            }
          }
        }
        
        return enhanced;
      })
    );
  }

  /**
   * Generate comprehensive visual report for course
   */
  async generateVisualReport(courseData, options = {}) {
    if (!this.visualIntelligence) {
      throw new ProcessingError('Visual Intelligence service not available');
    }
    
    const report = {
      courseId: courseData.id,
      generatedAt: new Date().toISOString(),
      visuals: []
    };
    
    try {
      // 1. Course Overview Infographic
      const overviewVisual = await this.visualIntelligence.generateVisual(
        {
          title: courseData.title,
          duration: courseData.total_duration,
          sessions: courseData.sessions ? courseData.sessions.length : 0,
          objectives: courseData.objectives ? courseData.objectives.length : 0,
          difficulty: courseData.difficulty
        },
        'infographic',
        {
          title: 'Course Overview',
          context: { theme: 'academic' },
          width: 800,
          height: 600
        }
      );
      report.visuals.push({
        type: 'overview',
        title: 'Course Overview',
        svg: overviewVisual.svg,
        quality: overviewVisual.metadata.quality
      });
      
      // 2. Learning Path Flowchart
      if (courseData.sessions && courseData.sessions.length > 0) {
        const pathData = courseData.sessions.map((s, i) => ({
          text: s.title,
          number: i + 1,
          duration: s.estimated_duration
        }));
        
        const pathVisual = await this.visualIntelligence.generateVisual(
          pathData,
          'flowchart',
          {
            title: 'Learning Path',
            context: { theme: options.theme || 'tech' }
          }
        );
        report.visuals.push({
          type: 'learning-path',
          title: 'Learning Path',
          svg: pathVisual.svg,
          quality: pathVisual.metadata.quality
        });
      }
      
      // 3. Activity Distribution Chart
      const activityTypes = {};
      if (courseData.sessions) {
        courseData.sessions.forEach(session => {
          if (session.activities) {
            session.activities.forEach(activity => {
              activityTypes[activity.type] = (activityTypes[activity.type] || 0) + 1;
            });
          }
        });
      }
      
      if (Object.keys(activityTypes).length > 0) {
        const chartData = Object.entries(activityTypes).map(([type, count]) => ({
          label: type.charAt(0).toUpperCase() + type.slice(1),
          value: count
        }));
        
        const chartVisual = await this.visualIntelligence.generateVisual(
          chartData,
          'data-visualization',
          {
            title: 'Activity Distribution',
            context: { chartType: 'bar' }
          }
        );
        report.visuals.push({
          type: 'activity-distribution',
          title: 'Activity Distribution',
          svg: chartVisual.svg,
          quality: chartVisual.metadata.quality
        });
      }
      
      // 4. Session-specific visuals
      if (courseData.sessions && options.includeSessionVisuals) {
        for (const session of courseData.sessions.slice(0, 5)) { // Limit to first 5
          const sessionAnalysis = await this.visualIntelligence.analyzeContent(
            session.content || session,
            { type: 'session' }
          );
          
          if (sessionAnalysis.confidence > 0.7) {
            const sessionVisual = await this.visualIntelligence.generateVisual(
              session.content || session,
              sessionAnalysis.primaryVisual.type,
              {
                title: session.title,
                recommendations: sessionAnalysis
              }
            );
            report.visuals.push({
              type: 'session',
              sessionId: session.id,
              title: session.title,
              visualType: sessionAnalysis.primaryVisual.type,
              svg: sessionVisual.svg,
              quality: sessionVisual.metadata.quality
            });
          }
        }
      }
      
      // Calculate overall visual quality
      report.overallQuality = Math.round(
        report.visuals.reduce((sum, v) => sum + v.quality, 0) / report.visuals.length
      );
      
      return report;
    } catch (error) {
      logger.error('Visual report generation failed:', error);
      throw new ProcessingError(`Failed to generate visual report: ${error.message}`);
    }
  }
}

module.exports = DesignEngine;