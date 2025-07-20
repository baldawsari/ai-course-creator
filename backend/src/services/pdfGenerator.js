const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const { v4: uuidv4 } = require('uuid');

// Import dependencies with fallbacks
let logger, supabaseAdmin, ValidationError, FileProcessingError, withRetry, DesignEngine;

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

try {
  DesignEngine = require('./designEngine');
} catch {
  // DesignEngine is optional for enhanced styling
  DesignEngine = null;
}

/**
 * PDF Generator Service
 * 
 * Provides HTML to PDF conversion functionality for the AI Course Creator.
 * Integrates with existing services for styling, Bull queue for async processing,
 * and Supabase for storage.
 */
class PDFGenerator {
  constructor() {
    this.outputPath = path.join(__dirname, '../../temp/pdfs');
    this.templateCache = new Map();
    this.browserInstance = null;
    this.designEngine = DesignEngine ? new DesignEngine() : null;
    
    // Default PDF options
    this.defaultOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1in',
        bottom: '1in',
        left: '0.75in',
        right: '0.75in'
      },
      displayHeaderFooter: true,
      headerTemplate: this.getDefaultHeaderTemplate(),
      footerTemplate: this.getDefaultFooterTemplate(),
      preferCSSPageSize: false
    };
    
    // Initialize output directory
    this.initializeDirectories();
  }

  async initializeDirectories() {
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to initialize PDF directories:', error);
    }
  }

  /**
   * Get default header template
   */
  getDefaultHeaderTemplate() {
    return `
      <div style="font-size: 10px; margin: 0 20px; width: 100%; text-align: center;">
        <span class="title"></span>
      </div>
    `;
  }

  /**
   * Get default footer template
   */
  getDefaultFooterTemplate() {
    return `
      <div style="font-size: 10px; margin: 0 20px; width: 100%; display: flex; justify-content: space-between;">
        <span class="date"></span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `;
  }

  /**
   * Generate PDF from course data
   */
  async generatePDF(course, template, options = {}) {
    try {
      logger.info(`Starting PDF generation for course ${course.id} with template ${template}`);
      
      const pdfId = options.pdfId || uuidv4();
      const pdfOptions = { ...this.defaultOptions, ...options.pdfOptions };
      
      // Generate HTML content
      let htmlContent;
      // Use basic HTML generation for now to avoid design engine dependency issues
      htmlContent = await this.generateBasicHTML(course, template, options);
      
      // Convert HTML to PDF
      const pdfPath = await this.convertHTMLToPDF(htmlContent, pdfOptions, pdfId);
      
      // Optimize PDF if requested
      if (options.optimize) {
        await this.optimizePDF(pdfPath);
      }
      
      // Upload to Supabase if requested
      let storageUrl = null;
      if (options.uploadToStorage) {
        storageUrl = await this.uploadToSupabase(pdfPath, course.id, pdfId);
      }
      
      logger.info(`PDF generation completed: ${pdfId}`);
      
      return {
        pdfId,
        pdfPath,
        storageUrl,
        size: await this.getFileSize(pdfPath),
        pages: await this.getPageCount(pdfPath)
      };
      
    } catch (error) {
      logger.error(`PDF generation failed for course ${course.id}:`, error);
      throw new FileProcessingError(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Generate PDF from HTML content
   */
  async generatePDFFromHTML(htmlContent, options = {}) {
    try {
      const pdfId = options.pdfId || uuidv4();
      const pdfOptions = { ...this.defaultOptions, ...options };
      
      // Convert HTML to PDF
      const pdfPath = await this.convertHTMLToPDF(htmlContent, pdfOptions, pdfId);
      
      // Optimize if requested
      if (options.optimize) {
        await this.optimizePDF(pdfPath);
      }
      
      return {
        pdfId,
        pdfPath,
        size: await this.getFileSize(pdfPath),
        pages: await this.getPageCount(pdfPath)
      };
      
    } catch (error) {
      throw new FileProcessingError(`PDF generation from HTML failed: ${error.message}`);
    }
  }

  /**
   * Generate enhanced HTML using design engine
   */
  async generateEnhancedHTML(course, template, options) {
    try {
      // Load template
      const compiledTemplate = await this.designEngine.loadTemplate(template, options);
      
      // Generate CSS
      const css = await this.designEngine.generateCSS(template, options.customizations, {
        optimize: true,
        includePrint: true
      });
      
      // Prepare template data
      const templateData = await this.prepareTemplateData(course, options);
      
      // Generate HTML
      const bodyHtml = compiledTemplate(templateData);
      
      // Combine with CSS and structure
      return this.wrapHTMLWithStyles(bodyHtml, css, course.title);
      
    } catch (error) {
      throw new FileProcessingError(`Enhanced HTML generation failed: ${error.message}`);
    }
  }

  /**
   * Generate basic HTML without design engine
   */
  async generateBasicHTML(course, template, options) {
    try {
      // Load basic template
      const templateContent = await this.loadBasicTemplate(template);
      const compiledTemplate = handlebars.compile(templateContent);
      
      // Prepare template data
      const templateData = await this.prepareTemplateData(course, options);
      
      // Generate HTML
      const bodyHtml = compiledTemplate(templateData);
      
      // Get basic CSS
      const css = this.getBasicCSS(template);
      
      // Combine with CSS and structure
      return this.wrapHTMLWithStyles(bodyHtml, css, course.title);
      
    } catch (error) {
      throw new FileProcessingError(`Basic HTML generation failed: ${error.message}`);
    }
  }

  /**
   * Prepare template data for rendering
   */
  async prepareTemplateData(course, options) {
    const data = {
      course: {
        ...course,
        generatedAt: new Date().toISOString(),
        exportFormat: 'PDF'
      },
      options: options,
      toc: this.generateTableOfContents(course),
      totalDuration: this.calculateTotalDuration(course.sessions),
      totalActivities: this.calculateTotalActivities(course.sessions)
    };
    
    // Process sessions for better formatting
    if (course.sessions && Array.isArray(course.sessions)) {
      data.sessions = course.sessions.map((session, index) => ({
        ...session,
        sessionNumber: index + 1,
        formattedContent: this.formatContent(session.content),
        activities: Array.isArray(session.activities) ? session.activities.map(activity => ({
          ...activity,
          formattedContent: this.formatContent(activity.content)
        })) : []
      }));
    } else {
      data.sessions = [];
    }
    
    return data;
  }

  /**
   * Generate table of contents
   */
  generateTableOfContents(course) {
    const toc = [];
    
    if (course.sessions) {
      course.sessions.forEach((session, index) => {
        toc.push({
          title: session.title,
          level: 1,
          pageNumber: null, // Will be filled by PDF engine
          sessionNumber: index + 1,
          children: session.activities?.map((activity, actIndex) => ({
            title: activity.title,
            level: 2,
            activityNumber: actIndex + 1
          })) || []
        });
      });
    }
    
    return toc;
  }

  /**
   * Convert HTML to PDF using Puppeteer
   */
  async convertHTMLToPDF(htmlContent, pdfOptions, pdfId) {
    let browser = null;
    let page = null;
    
    try {
      // Launch browser
      browser = await this.getBrowser();
      page = await browser.newPage();
      
      // Set content
      await page.setContent(htmlContent, {
        waitUntil: ['networkidle0', 'domcontentloaded']
      });
      
      // Wait for any dynamic content
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate PDF path
      const pdfPath = path.join(this.outputPath, `${pdfId}.pdf`);
      
      // Create PDF with options
      await page.pdf({
        path: pdfPath,
        ...pdfOptions
      });
      
      // Close page
      await page.close();
      
      return pdfPath;
      
    } catch (error) {
      if (page) await page.close();
      throw new FileProcessingError(`PDF conversion failed: ${error.message}`);
    }
  }

  /**
   * Get or create browser instance
   */
  async getBrowser() {
    if (!this.browserInstance) {
      // Try to find system Chrome installation
      const executablePaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser'
      ];
      
      let executablePath = null;
      const fs = require('fs');
      
      for (const path of executablePaths) {
        try {
          if (fs.existsSync(path)) {
            executablePath = path;
            break;
          }
        } catch {}
      }
      
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      };
      
      // Use system Chrome if found
      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }
      
      this.browserInstance = await puppeteer.launch(launchOptions);
    }
    return this.browserInstance;
  }

  /**
   * Optimize PDF for smaller file size
   */
  async optimizePDF(pdfPath) {
    try {
      // Note: Real PDF optimization would require additional libraries
      // like ghostscript or pdf-lib. This is a placeholder.
      logger.info(`PDF optimization requested for: ${pdfPath}`);
      
      // For now, just return the original path
      // In production, you would:
      // 1. Compress images
      // 2. Remove duplicate fonts
      // 3. Optimize object streams
      // 4. Apply compression
      
      return pdfPath;
      
    } catch (error) {
      logger.warn(`PDF optimization failed: ${error.message}`);
      return pdfPath;
    }
  }

  /**
   * Upload PDF to Supabase storage
   */
  async uploadToSupabase(pdfPath, courseId, pdfId) {
    try {
      const fileBuffer = await fs.readFile(pdfPath);
      const fileName = `courses/${courseId}/exports/${pdfId}.pdf`;
      
      const { data, error } = await supabaseAdmin.storage
        .from('course-exports')
        .upload(fileName, fileBuffer, {
          contentType: 'application/pdf',
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
   * Wrap HTML content with styles and structure
   */
  wrapHTMLWithStyles(bodyHtml, css, title) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
    ${css}
    
    /* PDF-specific styles */
    @media print {
      .page-break {
        page-break-after: always;
      }
      
      .no-page-break {
        page-break-inside: avoid;
      }
      
      .toc-entry {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
      }
      
      .toc-dots {
        flex: 1;
        border-bottom: 1px dotted #333;
        margin: 0 0.5rem;
      }
      
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }
      
      .session {
        page-break-before: always;
      }
      
      .session:first-child {
        page-break-before: auto;
      }
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>
    `;
  }

  /**
   * Load basic template
   */
  async loadBasicTemplate(templateName) {
    // Check cache
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }
    
    // Return default template
    const template = this.getDefaultPDFTemplate();
    this.templateCache.set(templateName, template);
    return template;
  }

  /**
   * Get default PDF template
   */
  getDefaultPDFTemplate() {
    return `
<div class="pdf-container">
  {{!-- Cover Page --}}
  <div class="cover-page">
    <h1 class="course-title">{{course.title}}</h1>
    {{#if course.description}}
    <p class="course-description">{{course.description}}</p>
    {{/if}}
    {{#if course.instructor}}
    <p class="course-instructor">Instructor: {{course.instructor}}</p>
    {{/if}}
    <p class="generated-date">Generated on {{formatDate course.generatedAt}}</p>
  </div>
  
  <div class="page-break"></div>
  
  {{!-- Table of Contents --}}
  <div class="table-of-contents">
    <h2>Table of Contents</h2>
    <div class="toc-list">
      {{#each toc}}
      <div class="toc-entry toc-level-{{level}}">
        <span class="toc-title">{{sessionNumber}}. {{title}}</span>
        <span class="toc-dots"></span>
        <span class="toc-page">{{pageNumber}}</span>
      </div>
      {{#each children}}
      <div class="toc-entry toc-level-{{level}}">
        <span class="toc-title">{{../sessionNumber}}.{{activityNumber}} {{title}}</span>
        <span class="toc-dots"></span>
        <span class="toc-page">{{pageNumber}}</span>
      </div>
      {{/each}}
      {{/each}}
    </div>
  </div>
  
  <div class="page-break"></div>
  
  {{!-- Course Content --}}
  <div class="course-content">
    {{#each sessions}}
    <div class="session no-page-break">
      <h2 class="session-title">Session {{sessionNumber}}: {{title}}</h2>
      
      {{#if description}}
      <div class="session-description">
        {{{description}}}
      </div>
      {{/if}}
      
      {{#if objectives}}
      <div class="session-objectives">
        <h3>Learning Objectives</h3>
        <ul>
          {{#each objectives}}
          <li>{{this}}</li>
          {{/each}}
        </ul>
      </div>
      {{/if}}
      
      {{#if formattedContent}}
      <div class="session-content">
        {{{formattedContent}}}
      </div>
      {{/if}}
      
      {{#if activities}}
      <div class="session-activities">
        <h3>Activities</h3>
        {{#each activities}}
        <div class="activity no-page-break">
          <h4>{{title}}</h4>
          {{#if description}}
          <p class="activity-description">{{{description}}}</p>
          {{/if}}
          {{#if formattedContent}}
          <div class="activity-content">
            {{{formattedContent}}}
          </div>
          {{/if}}
          {{#if estimated_duration}}
          <p class="activity-duration">Duration: {{estimated_duration}} minutes</p>
          {{/if}}
        </div>
        {{/each}}
      </div>
      {{/if}}
    </div>
    
    {{#unless @last}}
    <div class="page-break"></div>
    {{/unless}}
    {{/each}}
  </div>
</div>
    `;
  }

  /**
   * Get basic CSS for PDF
   */
  getBasicCSS(template) {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
      }
      
      .pdf-container {
        max-width: 100%;
        margin: 0 auto;
      }
      
      .cover-page {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        text-align: center;
        padding: 2rem;
      }
      
      .course-title {
        font-size: 3rem;
        margin-bottom: 2rem;
        color: #1a1a1a;
      }
      
      .course-description {
        font-size: 1.25rem;
        color: #666;
        max-width: 600px;
        margin-bottom: 2rem;
      }
      
      .course-instructor {
        font-size: 1.125rem;
        color: #666;
        margin-bottom: 1rem;
      }
      
      .generated-date {
        font-size: 0.875rem;
        color: #999;
      }
      
      .table-of-contents {
        padding: 2rem;
      }
      
      .table-of-contents h2 {
        font-size: 2rem;
        margin-bottom: 2rem;
        text-align: center;
      }
      
      .toc-entry {
        margin-bottom: 0.75rem;
        display: flex;
        align-items: baseline;
      }
      
      .toc-level-2 {
        margin-left: 2rem;
      }
      
      .toc-title {
        flex-shrink: 0;
      }
      
      .toc-page {
        flex-shrink: 0;
        margin-left: 0.5rem;
      }
      
      .course-content {
        padding: 2rem;
      }
      
      .session {
        margin-bottom: 3rem;
      }
      
      .session-title {
        font-size: 2rem;
        color: #1a1a1a;
        margin-bottom: 1.5rem;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 1rem;
      }
      
      .session-description {
        font-size: 1.125rem;
        color: #666;
        margin-bottom: 1.5rem;
      }
      
      .session-objectives {
        background: #f8fafc;
        padding: 1.5rem;
        border-radius: 0.5rem;
        margin-bottom: 2rem;
      }
      
      .session-objectives h3 {
        font-size: 1.25rem;
        margin-bottom: 1rem;
        color: #1a1a1a;
      }
      
      .session-objectives ul {
        margin: 0;
        padding-left: 1.5rem;
      }
      
      .session-objectives li {
        margin-bottom: 0.5rem;
      }
      
      .session-content {
        margin-bottom: 2rem;
      }
      
      .activity {
        background: #f8fafc;
        padding: 1.5rem;
        border-left: 4px solid #3b82f6;
        margin-bottom: 1.5rem;
      }
      
      .activity h4 {
        font-size: 1.125rem;
        color: #1a1a1a;
        margin-bottom: 1rem;
      }
      
      .activity-description {
        color: #666;
        margin-bottom: 1rem;
      }
      
      .activity-duration {
        font-size: 0.875rem;
        color: #999;
        margin-top: 1rem;
      }
      
      h1, h2, h3, h4, h5, h6 {
        margin-top: 0;
      }
      
      p {
        margin-top: 0;
        margin-bottom: 1rem;
      }
      
      ul, ol {
        margin-top: 0;
        margin-bottom: 1rem;
      }
      
      code {
        background: #f3f4f6;
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-family: 'Courier New', Courier, monospace;
      }
      
      pre {
        background: #f3f4f6;
        padding: 1rem;
        border-radius: 0.5rem;
        overflow-x: auto;
      }
      
      pre code {
        background: none;
        padding: 0;
      }
      
      blockquote {
        border-left: 4px solid #e5e7eb;
        padding-left: 1rem;
        margin: 1rem 0;
        color: #666;
        font-style: italic;
      }
    `;
  }

  /**
   * Format content for PDF display
   */
  formatContent(content) {
    if (!content) return '';
    
    // If content is already an object, format it directly
    if (typeof content === 'object' && content !== null) {
      return this.formatJSONContentForPDF(content);
    }
    
    // Convert to string if not already
    const contentStr = typeof content === 'string' ? content : String(content);
    
    try {
      // If content is JSON string, parse and format
      if (contentStr.trim().startsWith('{')) {
        const parsed = JSON.parse(contentStr);
        return this.formatJSONContentForPDF(parsed);
      }
      
      // Process as markdown/text
      return this.processMarkdownForPDF(contentStr);
    } catch {
      return this.processMarkdownForPDF(contentStr);
    }
  }

  /**
   * Format JSON content for PDF
   */
  formatJSONContentForPDF(content) {
    let formatted = '';
    
    // Handle instructions
    if (content.instructions) {
      formatted += `<div class="instructions">${this.processMarkdownForPDF(content.instructions)}</div>`;
    }
    
    // Handle regular content
    if (content.content) {
      formatted += this.processMarkdownForPDF(content.content);
    }
    
    // Handle code content
    if (content.code) {
      formatted += '<h4>Code Example</h4>';
      formatted += `<pre><code class="language-${content.language || 'javascript'}">${this.escapeHtml(content.code)}</code></pre>`;
    }
    
    // Handle quiz questions
    if (content.questions && Array.isArray(content.questions)) {
      formatted += '<h4>Questions</h4>';
      content.questions.forEach((question, index) => {
        formatted += `<div class="question">`;
        formatted += `<h5>Question ${index + 1}: ${this.escapeHtml(question.question)}</h5>`;
        
        if (question.options && Array.isArray(question.options)) {
          formatted += '<ul class="quiz-options">';
          question.options.forEach((option, optIndex) => {
            formatted += `<li>${String.fromCharCode(65 + optIndex)}. ${this.escapeHtml(option)}</li>`;
          });
          formatted += '</ul>';
        }
        
        formatted += '</div>';
      });
    }
    
    // Handle key points
    if (content.keyPoints && Array.isArray(content.keyPoints)) {
      formatted += '<h4>Key Points</h4><ul>';
      content.keyPoints.forEach(point => {
        formatted += `<li>${this.escapeHtml(point)}</li>`;
      });
      formatted += '</ul>';
    }
    
    // Handle examples
    if (content.examples && Array.isArray(content.examples)) {
      formatted += '<h4>Examples</h4>';
      content.examples.forEach(example => {
        formatted += `<div class="example">${this.processMarkdownForPDF(example)}</div>`;
      });
    }
    
    return formatted;
  }

  /**
   * Process markdown for PDF
   */
  processMarkdownForPDF(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Basic markdown processing
    return text
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
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
   * Get page count (estimated)
   */
  async getPageCount(pdfPath) {
    // Note: Actual page count would require a PDF parsing library
    // This is an estimation based on file size
    const size = await this.getFileSize(pdfPath);
    return Math.max(1, Math.ceil(size / 50000)); // Rough estimate
  }

  /**
   * Escape HTML
   */
  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Close browser instance
   */
  async closeBrowser() {
    if (this.browserInstance) {
      await this.browserInstance.close();
      this.browserInstance = null;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup(pdfId) {
    try {
      const pdfPath = path.join(this.outputPath, `${pdfId}.pdf`);
      await fs.unlink(pdfPath);
      logger.info(`Cleanup completed for PDF: ${pdfId}`);
    } catch (error) {
      logger.warn(`Cleanup failed for PDF ${pdfId}: ${error.message}`);
    }
  }
}

// Register Handlebars helpers
handlebars.registerHelper('formatDate', (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

module.exports = PDFGenerator;