const { v4: uuidv4 } = require('uuid');

// Import dependencies with fallbacks
let logger, claudeService, ValidationError, ProcessingError, withRetry;

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
  claudeService = require('./claudeService');
} catch {
  logger.warn('Claude service not available, using mock implementation');
  claudeService = null;
}

try {
  const errors = require('../utils/errors');
  ValidationError = errors.ValidationError;
  ProcessingError = errors.ProcessingError;
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

/**
 * Visual Intelligence Service
 * 
 * AI-powered visual content generation for course materials.
 * Analyzes content and automatically creates appropriate visual representations
 * including infographics, charts, diagrams, and visual hierarchies.
 */
class VisualIntelligence {
  constructor() {
    this.visualCache = new Map();
    this.iconLibrary = this.initializeIconLibrary();
    this.colorPalettes = this.initializeColorPalettes();
    this.visualPatterns = this.initializeVisualPatterns();
    this.claudeService = claudeService;
  }

  /**
   * Initialize icon library with semantic mappings
   */
  initializeIconLibrary() {
    return {
      // Tech & Programming
      'programming': 'M12 2L2 7L12 12L22 7L12 2Z',
      'ai': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
      'database': 'M12 2C6.48 2 2 4.69 2 8s4.48 6 10 6 10-2.69 10-6-4.48-6-10-6zM12 12c-5.52 0-10-2.69-10-6v6c0 3.31 4.48 6 10 6s10-2.69 10-6v-6c0 3.31-4.48 6-10 6z',
      'cloud': 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',
      'code': 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
      'api': 'M12 2L2 12h3v8h14v-8h3L12 2zm0 3.5L18.5 12H16v6H8v-6H5.5L12 5.5z',
      
      // Learning & Education
      'learn': 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
      'book': 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z',
      'idea': 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
      'target': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
      'growth': 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
      
      // Process & Flow
      'process': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
      'flow': 'M12 2l-5.5 9h11z M17.5 11L12 20l-5.5-9z',
      'cycle': 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
      'arrow': 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
      
      // Data & Analytics
      'chart': 'M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z',
      'analytics': 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z',
      'metrics': 'M16 11V3H8v6H2v12h20V11h-6zm-6-6h4v4h-4V5zm-6 6h4v4H4v-4zm16 8H4v-2h16v2z',
      
      // General
      'check': 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
      'star': 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
      'warning': 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
      'info': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
      'question': 'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z'
    };
  }

  /**
   * Initialize color palettes for different content types
   */
  initializeColorPalettes() {
    return {
      'tech': {
        primary: '#3b82f6',
        secondary: '#1e40af',
        accent: '#60a5fa',
        gradient: ['#3b82f6', '#1e40af'],
        text: '#1f2937',
        background: '#f0f9ff'
      },
      'business': {
        primary: '#10b981',
        secondary: '#059669',
        accent: '#34d399',
        gradient: ['#10b981', '#059669'],
        text: '#1f2937',
        background: '#f0fdf4'
      },
      'creative': {
        primary: '#f59e0b',
        secondary: '#d97706',
        accent: '#fbbf24',
        gradient: ['#f59e0b', '#d97706'],
        text: '#1f2937',
        background: '#fffbeb'
      },
      'academic': {
        primary: '#8b5cf6',
        secondary: '#7c3aed',
        accent: '#a78bfa',
        gradient: ['#8b5cf6', '#7c3aed'],
        text: '#1f2937',
        background: '#faf5ff'
      },
      'default': {
        primary: '#6366f1',
        secondary: '#4f46e5',
        accent: '#818cf8',
        gradient: ['#6366f1', '#4f46e5'],
        text: '#1f2937',
        background: '#f8fafc'
      }
    };
  }

  /**
   * Initialize visual patterns for content analysis
   */
  initializeVisualPatterns() {
    return {
      list: {
        patterns: [
          /^[\s]*[-*•]\s+/gm,
          /^[\s]*\d+\.\s+/gm,
          /<ul>/i,
          /<ol>/i
        ],
        visualType: 'infographic',
        minItems: 3,
        maxItems: 10
      },
      process: {
        patterns: [
          /step\s+\d+/gi,
          /first.*then.*finally/gi,
          /phase\s+\d+/gi,
          /stage\s+\d+/gi,
          /\d+\.\s*\w+.*\n\s*\d+\.\s*\w+/g
        ],
        visualType: 'flowchart',
        minSteps: 3
      },
      comparison: {
        patterns: [
          /versus|vs\.|compared to/gi,
          /pros.*cons/gi,
          /advantages.*disadvantages/gi,
          /before.*after/gi
        ],
        visualType: 'comparison-chart'
      },
      data: {
        patterns: [
          /\d+%/g,
          /\$[\d,]+/g,
          /\d+\s*(users|customers|sales|revenue)/gi,
          /statistics|metrics|analytics/gi
        ],
        visualType: 'data-visualization'
      },
      timeline: {
        patterns: [
          /\d{4}/g,
          /(january|february|march|april|may|june|july|august|september|october|november|december)/gi,
          /timeline|history|evolution/gi,
          /\d+\s*(years?|months?|days?)\s*(ago|later)/gi
        ],
        visualType: 'timeline'
      },
      hierarchy: {
        patterns: [
          /parent.*child/gi,
          /main.*sub/gi,
          /category.*subcategory/gi,
          /level\s+\d+/gi
        ],
        visualType: 'hierarchy-diagram'
      }
    };
  }

  /**
   * Analyze content and determine appropriate visual representation
   */
  async analyzeContent(content, context = {}) {
    try {
      logger.info('Analyzing content for visual opportunities');

      // Check cache
      const cacheKey = this.generateCacheKey(content, context);
      if (this.visualCache.has(cacheKey)) {
        return this.visualCache.get(cacheKey);
      }

      // Detect content patterns
      const detectedPatterns = this.detectContentPatterns(content);
      
      // If AI service is available, get enhanced analysis
      let aiAnalysis = null;
      if (this.claudeService) {
        aiAnalysis = await this.getAIContentAnalysis(content, detectedPatterns, context);
      }

      // Determine visual recommendations
      const recommendations = this.generateVisualRecommendations(
        content,
        detectedPatterns,
        aiAnalysis,
        context
      );

      // Cache the result
      this.visualCache.set(cacheKey, recommendations);

      return recommendations;
    } catch (error) {
      logger.error('Content analysis failed:', error);
      throw new ProcessingError(`Visual analysis failed: ${error.message}`);
    }
  }

  /**
   * Detect content patterns that suggest visual opportunities
   */
  detectContentPatterns(content) {
    const detected = [];
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    for (const [patternType, config] of Object.entries(this.visualPatterns)) {
      let matchCount = 0;
      let matches = [];

      for (const pattern of config.patterns) {
        const patternMatches = contentStr.match(pattern);
        if (patternMatches) {
          matchCount += patternMatches.length;
          matches = matches.concat(patternMatches);
        }
      }

      if (matchCount > 0) {
        detected.push({
          type: patternType,
          confidence: this.calculatePatternConfidence(matchCount, contentStr.length),
          visualType: config.visualType,
          matches: matches.slice(0, 5) // Sample matches
        });
      }
    }

    // Sort by confidence
    detected.sort((a, b) => b.confidence - a.confidence);

    return detected;
  }

  /**
   * Get AI-enhanced content analysis
   */
  async getAIContentAnalysis(content, detectedPatterns, context) {
    try {
      const prompt = `Analyze this content and suggest the best visual representation:

Content: ${typeof content === 'string' ? content : JSON.stringify(content, null, 2)}

Detected patterns: ${JSON.stringify(detectedPatterns.map(p => p.type))}

Context: ${JSON.stringify(context)}

Provide a JSON response with:
1. bestVisualType: The most appropriate visual type (infographic, flowchart, chart, diagram, timeline)
2. elements: Array of key elements to include in the visual
3. theme: Suggested theme (tech, business, creative, academic, default)
4. layout: Suggested layout approach
5. iconSuggestions: Relevant icons for the content
6. colorScheme: Specific color recommendations
7. complexity: low, medium, or high
8. reasoning: Brief explanation of your choices`;

      let response;
      if (withRetry) {
        response = await withRetry(async () => {
          return await this.claudeService.analyzeContent(prompt);
        });
      } else {
        response = await this.claudeService.analyzeContent(prompt);
      }

      return JSON.parse(response);
    } catch (error) {
      logger.warn('AI analysis failed, using fallback:', error);
      return null;
    }
  }

  /**
   * Generate visual recommendations based on analysis
   */
  generateVisualRecommendations(content, detectedPatterns, aiAnalysis, context) {
    const recommendations = {
      primaryVisual: null,
      alternativeVisuals: [],
      elements: [],
      theme: 'default',
      complexity: 'medium',
      confidence: 0
    };

    // Use AI analysis if available
    if (aiAnalysis) {
      recommendations.primaryVisual = {
        type: aiAnalysis.bestVisualType,
        elements: aiAnalysis.elements,
        layout: aiAnalysis.layout,
        icons: aiAnalysis.iconSuggestions,
        colorScheme: aiAnalysis.colorScheme || this.colorPalettes[aiAnalysis.theme]
      };
      recommendations.theme = aiAnalysis.theme;
      recommendations.complexity = aiAnalysis.complexity;
      recommendations.confidence = 0.9;
      recommendations.reasoning = aiAnalysis.reasoning;
    } else if (detectedPatterns.length > 0) {
      // Fallback to pattern-based recommendations
      const topPattern = detectedPatterns[0];
      recommendations.primaryVisual = {
        type: topPattern.visualType,
        elements: this.extractElementsFromContent(content, topPattern.type),
        layout: this.determineLayout(topPattern.type),
        icons: this.suggestIcons(content, topPattern.type),
        colorScheme: this.colorPalettes[context.theme || 'default']
      };
      recommendations.confidence = topPattern.confidence;
      
      // Add alternatives
      recommendations.alternativeVisuals = detectedPatterns.slice(1, 3).map(pattern => ({
        type: pattern.visualType,
        confidence: pattern.confidence
      }));
    }

    return recommendations;
  }

  /**
   * Generate SVG visual based on recommendations
   */
  async generateVisual(content, visualType, options = {}) {
    try {
      logger.info(`Generating ${visualType} visual`);

      // Get visual recommendations if not provided
      const recommendations = options.recommendations || 
        await this.analyzeContent(content, options.context);

      // Select appropriate generator
      let svg;
      switch (visualType) {
        case 'infographic':
          svg = await this.generateInfographic(content, recommendations, options);
          break;
        case 'flowchart':
          svg = await this.generateFlowchart(content, recommendations, options);
          break;
        case 'chart':
        case 'data-visualization':
          svg = await this.generateDataVisualization(content, recommendations, options);
          break;
        case 'timeline':
          svg = await this.generateTimeline(content, recommendations, options);
          break;
        case 'comparison-chart':
          svg = await this.generateComparisonChart(content, recommendations, options);
          break;
        case 'hierarchy-diagram':
          svg = await this.generateHierarchyDiagram(content, recommendations, options);
          break;
        case 'diagram':
        default:
          svg = await this.generateGenericDiagram(content, recommendations, options);
      }

      return {
        svg,
        type: visualType,
        recommendations,
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0.0',
          quality: this.assessVisualQuality(svg, visualType)
        }
      };
    } catch (error) {
      logger.error(`Visual generation failed for ${visualType}:`, error);
      throw new ProcessingError(`Failed to generate ${visualType}: ${error.message}`);
    }
  }

  /**
   * Generate an infographic from list content
   */
  async generateInfographic(content, recommendations, options) {
    const elements = recommendations.primaryVisual?.elements || 
      this.extractListElements(content);
    const colorScheme = recommendations.primaryVisual?.colorScheme || 
      this.colorPalettes[recommendations.theme];
    
    const width = options.width || 800;
    const height = options.height || 600;
    const padding = 40;
    const itemHeight = 80;
    const iconSize = 40;
    
    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add gradient definition
    svg += `
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colorScheme.gradient[0]};stop-opacity:0.1" />
          <stop offset="100%" style="stop-color:${colorScheme.gradient[1]};stop-opacity:0.05" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.1"/>
        </filter>
      </defs>
    `;
    
    // Background
    svg += `<rect width="${width}" height="${height}" fill="${colorScheme.background}" />`;
    svg += `<rect width="${width}" height="${height}" fill="url(#bgGradient)" />`;
    
    // Title
    if (options.title) {
      svg += `
        <text x="${width/2}" y="${padding + 20}" 
              text-anchor="middle" 
              font-size="28" 
              font-weight="bold" 
              fill="${colorScheme.text}">
          ${this.escapeXml(options.title)}
        </text>
      `;
    }
    
    // Generate items
    const startY = options.title ? padding + 60 : padding + 20;
    const itemsPerColumn = Math.floor((height - startY - padding) / itemHeight);
    const columns = Math.ceil(elements.length / itemsPerColumn);
    const columnWidth = (width - padding * 2) / columns;
    
    elements.forEach((element, index) => {
      const column = Math.floor(index / itemsPerColumn);
      const row = index % itemsPerColumn;
      const x = padding + column * columnWidth;
      const y = startY + row * itemHeight;
      
      // Item container
      svg += `<g transform="translate(${x}, ${y})">`;
      
      // Background shape
      svg += `
        <rect x="0" y="0" 
              width="${columnWidth - 20}" 
              height="${itemHeight - 15}" 
              rx="8" 
              fill="white" 
              filter="url(#shadow)" />
      `;
      
      // Icon circle
      const iconKey = this.findBestIcon(element.text || element);
      const iconPath = this.iconLibrary[iconKey] || this.iconLibrary['star'];
      svg += `
        <circle cx="${iconSize/2 + 10}" 
                cy="${(itemHeight - 15)/2}" 
                r="${iconSize/2}" 
                fill="${colorScheme.primary}" />
        <path d="${iconPath}" 
              fill="white" 
              transform="translate(${10 + iconSize/4}, ${(itemHeight - 15)/2 - iconSize/4}) scale(${iconSize/24})" />
      `;
      
      // Text
      const text = element.text || element;
      const truncatedText = text.length > 40 ? text.substring(0, 37) + '...' : text;
      svg += `
        <text x="${iconSize + 25}" 
              y="${(itemHeight - 15)/2 + 5}" 
              font-size="16" 
              fill="${colorScheme.text}">
          ${this.escapeXml(truncatedText)}
        </text>
      `;
      
      svg += `</g>`;
    });
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * Generate a flowchart from process content
   */
  async generateFlowchart(content, recommendations, options) {
    const steps = recommendations.primaryVisual?.elements || 
      this.extractProcessSteps(content);
    const colorScheme = recommendations.primaryVisual?.colorScheme || 
      this.colorPalettes[recommendations.theme];
    
    const width = options.width || 800;
    const height = options.height || 600;
    const nodeWidth = 160;
    const nodeHeight = 60;
    const spacing = 100;
    
    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add definitions
    svg += `
      <defs>
        <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${colorScheme.primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colorScheme.secondary};stop-opacity:1" />
        </linearGradient>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="${colorScheme.primary}" />
        </marker>
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.2"/>
        </filter>
      </defs>
    `;
    
    // Background
    svg += `<rect width="${width}" height="${height}" fill="${colorScheme.background}" />`;
    
    // Calculate layout
    const cols = Math.ceil(Math.sqrt(steps.length));
    const rows = Math.ceil(steps.length / cols);
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    
    const nodes = [];
    steps.forEach((step, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = cellWidth * col + cellWidth / 2 - nodeWidth / 2;
      const y = cellHeight * row + cellHeight / 2 - nodeHeight / 2;
      
      nodes.push({ x, y, width: nodeWidth, height: nodeHeight, text: step });
      
      // Draw node
      const nodeType = index === 0 ? 'start' : index === steps.length - 1 ? 'end' : 'process';
      const rx = nodeType === 'start' || nodeType === 'end' ? nodeHeight / 2 : 8;
      
      svg += `
        <rect x="${x}" y="${y}" 
              width="${nodeWidth}" 
              height="${nodeHeight}" 
              rx="${rx}" 
              fill="${nodeType === 'process' ? 'url(#nodeGradient)' : colorScheme.accent}" 
              filter="url(#shadow)" />
      `;
      
      // Add text
      const text = step.text || step;
      const lines = this.wrapText(text, 20);
      lines.forEach((line, lineIndex) => {
        svg += `
          <text x="${x + nodeWidth/2}" 
                y="${y + nodeHeight/2 - (lines.length - 1) * 8 + lineIndex * 16}" 
                text-anchor="middle" 
                font-size="14" 
                fill="white">
            ${this.escapeXml(line)}
          </text>
        `;
      });
    });
    
    // Draw connections
    for (let i = 0; i < nodes.length - 1; i++) {
      const from = nodes[i];
      const to = nodes[i + 1];
      
      // Calculate connection path
      const fromX = from.x + from.width / 2;
      const fromY = from.y + from.height;
      const toX = to.x + to.width / 2;
      const toY = to.y;
      
      svg += `
        <path d="M ${fromX} ${fromY} L ${fromX} ${fromY + 20} 
                 L ${toX} ${toY - 20} L ${toX} ${toY}" 
              stroke="${colorScheme.primary}" 
              stroke-width="2" 
              fill="none" 
              marker-end="url(#arrowhead)" />
      `;
    }
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * Generate data visualization (charts)
   */
  async generateDataVisualization(content, recommendations, options) {
    const data = recommendations.primaryVisual?.elements || 
      this.extractDataPoints(content);
    const colorScheme = recommendations.primaryVisual?.colorScheme || 
      this.colorPalettes[recommendations.theme];
    
    const width = options.width || 800;
    const height = options.height || 400;
    const padding = 60;
    
    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Background
    svg += `<rect width="${width}" height="${height}" fill="${colorScheme.background}" />`;
    
    if (data.length === 0) {
      svg += `<text x="${width/2}" y="${height/2}" text-anchor="middle" fill="${colorScheme.text}">No data available</text>`;
      svg += `</svg>`;
      return svg;
    }
    
    // Determine chart type based on data
    const hasNumericValues = data.every(d => !isNaN(parseFloat(d.value)));
    
    if (hasNumericValues) {
      // Bar chart for numeric data
      const maxValue = Math.max(...data.map(d => parseFloat(d.value)));
      const barWidth = (width - padding * 2) / data.length - 10;
      const scale = (height - padding * 2) / maxValue;
      
      // Y-axis
      svg += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="${colorScheme.text}" stroke-width="2" />`;
      
      // X-axis
      svg += `<line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="${colorScheme.text}" stroke-width="2" />`;
      
      // Bars
      data.forEach((item, index) => {
        const value = parseFloat(item.value);
        const barHeight = value * scale;
        const x = padding + index * (barWidth + 10) + 5;
        const y = height - padding - barHeight;
        
        svg += `
          <rect x="${x}" y="${y}" 
                width="${barWidth}" 
                height="${barHeight}" 
                fill="${colorScheme.primary}" 
                opacity="0.8">
            <animate attributeName="height" 
                     from="0" to="${barHeight}" 
                     dur="0.5s" 
                     begin="${index * 0.1}s" />
            <animate attributeName="y" 
                     from="${height - padding}" to="${y}" 
                     dur="0.5s" 
                     begin="${index * 0.1}s" />
          </rect>
        `;
        
        // Value label
        svg += `
          <text x="${x + barWidth/2}" y="${y - 5}" 
                text-anchor="middle" 
                font-size="12" 
                fill="${colorScheme.text}">
            ${value}
          </text>
        `;
        
        // Category label
        const label = item.label || `Item ${index + 1}`;
        svg += `
          <text x="${x + barWidth/2}" y="${height - padding + 20}" 
                text-anchor="middle" 
                font-size="12" 
                fill="${colorScheme.text}"
                transform="rotate(-45 ${x + barWidth/2} ${height - padding + 20})">
            ${this.escapeXml(label)}
          </text>
        `;
      });
    } else {
      // Pie chart for categorical data
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - padding;
      
      let currentAngle = -90; // Start from top
      const total = data.length;
      
      data.forEach((item, index) => {
        const angle = 360 / total;
        const endAngle = currentAngle + angle;
        
        const startRad = (currentAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        
        const x1 = centerX + radius * Math.cos(startRad);
        const y1 = centerY + radius * Math.sin(startRad);
        const x2 = centerX + radius * Math.cos(endRad);
        const y2 = centerY + radius * Math.sin(endRad);
        
        const largeArc = angle > 180 ? 1 : 0;
        
        const color = this.getColorFromPalette(colorScheme, index);
        
        svg += `
          <path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z"
                fill="${color}"
                opacity="0.8">
            <animate attributeName="opacity" 
                     from="0" to="0.8" 
                     dur="0.5s" 
                     begin="${index * 0.1}s" />
          </path>
        `;
        
        // Label
        const midAngle = (currentAngle + endAngle) / 2;
        const midRad = (midAngle * Math.PI) / 180;
        const labelX = centerX + (radius * 0.7) * Math.cos(midRad);
        const labelY = centerY + (radius * 0.7) * Math.sin(midRad);
        
        svg += `
          <text x="${labelX}" y="${labelY}" 
                text-anchor="middle" 
                font-size="14" 
                fill="white"
                font-weight="bold">
            ${this.escapeXml(item.label || item.value)}
          </text>
        `;
        
        currentAngle = endAngle;
      });
    }
    
    // Title
    if (options.title) {
      svg += `
        <text x="${width/2}" y="30" 
              text-anchor="middle" 
              font-size="24" 
              font-weight="bold" 
              fill="${colorScheme.text}">
          ${this.escapeXml(options.title)}
        </text>
      `;
    }
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * Generate timeline visualization
   */
  async generateTimeline(content, recommendations, options) {
    const events = recommendations.primaryVisual?.elements || 
      this.extractTimelineEvents(content);
    const colorScheme = recommendations.primaryVisual?.colorScheme || 
      this.colorPalettes[recommendations.theme];
    
    const width = options.width || 800;
    const height = options.height || 400;
    const padding = 60;
    const lineY = height / 2;
    
    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Background
    svg += `<rect width="${width}" height="${height}" fill="${colorScheme.background}" />`;
    
    // Timeline line
    svg += `
      <line x1="${padding}" y1="${lineY}" 
            x2="${width - padding}" y2="${lineY}" 
            stroke="${colorScheme.primary}" 
            stroke-width="3" />
    `;
    
    // Events
    const eventSpacing = (width - padding * 2) / (events.length - 1 || 1);
    
    events.forEach((event, index) => {
      const x = padding + index * eventSpacing;
      const isAbove = index % 2 === 0;
      const y = isAbove ? lineY - 80 : lineY + 80;
      
      // Event line
      svg += `
        <line x1="${x}" y1="${lineY}" 
              x2="${x}" y2="${isAbove ? lineY - 20 : lineY + 20}" 
              stroke="${colorScheme.primary}" 
              stroke-width="2" />
      `;
      
      // Event circle
      svg += `
        <circle cx="${x}" cy="${lineY}" 
                r="8" 
                fill="${colorScheme.accent}" 
                stroke="${colorScheme.primary}" 
                stroke-width="2" />
      `;
      
      // Event box
      const boxWidth = 120;
      const boxHeight = 50;
      svg += `
        <rect x="${x - boxWidth/2}" y="${y - boxHeight/2}" 
              width="${boxWidth}" 
              height="${boxHeight}" 
              rx="5" 
              fill="white" 
              stroke="${colorScheme.primary}" 
              stroke-width="2" />
      `;
      
      // Event text
      const date = event.date || `Event ${index + 1}`;
      const title = event.title || event.text || '';
      
      svg += `
        <text x="${x}" y="${y - 10}" 
              text-anchor="middle" 
              font-size="12" 
              font-weight="bold" 
              fill="${colorScheme.text}">
          ${this.escapeXml(date)}
        </text>
      `;
      
      if (title) {
        const lines = this.wrapText(title, 15);
        lines.slice(0, 2).forEach((line, lineIndex) => {
          svg += `
            <text x="${x}" y="${y + 10 + lineIndex * 15}" 
                  text-anchor="middle" 
                  font-size="11" 
                  fill="${colorScheme.text}">
              ${this.escapeXml(line)}
            </text>
          `;
        });
      }
    });
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * Generate comparison chart
   */
  async generateComparisonChart(content, recommendations, options) {
    const items = recommendations.primaryVisual?.elements || 
      this.extractComparisonItems(content);
    const colorScheme = recommendations.primaryVisual?.colorScheme || 
      this.colorPalettes[recommendations.theme];
    
    const width = options.width || 800;
    const height = options.height || 500;
    const padding = 40;
    
    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Background
    svg += `<rect width="${width}" height="${height}" fill="${colorScheme.background}" />`;
    
    // Assuming we have 2 items to compare
    const columnWidth = (width - padding * 3) / 2;
    
    items.slice(0, 2).forEach((item, index) => {
      const x = padding + index * (columnWidth + padding);
      const color = index === 0 ? colorScheme.primary : colorScheme.secondary;
      
      // Column header
      svg += `
        <rect x="${x}" y="${padding}" 
              width="${columnWidth}" 
              height="60" 
              fill="${color}" 
              rx="8" />
      `;
      
      svg += `
        <text x="${x + columnWidth/2}" y="${padding + 35}" 
              text-anchor="middle" 
              font-size="20" 
              font-weight="bold" 
              fill="white">
          ${this.escapeXml(item.name || `Option ${index + 1}`)}
        </text>
      `;
      
      // Features/points
      const features = item.features || item.points || [];
      features.forEach((feature, featureIndex) => {
        const y = padding + 80 + featureIndex * 60;
        
        svg += `
          <g transform="translate(${x}, ${y})">
            <rect x="10" y="0" 
                  width="${columnWidth - 20}" 
                  height="50" 
                  fill="white" 
                  stroke="${color}" 
                  stroke-width="2" 
                  rx="5" />
            <circle cx="30" cy="25" r="8" fill="${color}" />
            <path d="M 26 25 L 28 28 L 34 22" 
                  stroke="white" 
                  stroke-width="2" 
                  fill="none" />
            <text x="50" y="30" 
                  font-size="14" 
                  fill="${colorScheme.text}">
              ${this.escapeXml(feature.text || feature)}
            </text>
          </g>
        `;
      });
    });
    
    // Title
    if (options.title) {
      svg += `
        <text x="${width/2}" y="25" 
              text-anchor="middle" 
              font-size="24" 
              font-weight="bold" 
              fill="${colorScheme.text}">
          ${this.escapeXml(options.title)}
        </text>
      `;
    }
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * Generate hierarchy diagram
   */
  async generateHierarchyDiagram(content, recommendations, options) {
    const hierarchy = recommendations.primaryVisual?.elements || 
      this.extractHierarchy(content);
    const colorScheme = recommendations.primaryVisual?.colorScheme || 
      this.colorPalettes[recommendations.theme];
    
    const width = options.width || 800;
    const height = options.height || 600;
    const nodeWidth = 150;
    const nodeHeight = 50;
    const levelSpacing = 120;
    
    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Background
    svg += `<rect width="${width}" height="${height}" fill="${colorScheme.background}" />`;
    
    // Simple tree layout
    const renderNode = (node, x, y, level = 0) => {
      // Node rectangle
      const color = level === 0 ? colorScheme.primary : 
                    level === 1 ? colorScheme.secondary : 
                    colorScheme.accent;
      
      svg += `
        <rect x="${x - nodeWidth/2}" y="${y - nodeHeight/2}" 
              width="${nodeWidth}" 
              height="${nodeHeight}" 
              fill="${color}" 
              rx="5" />
      `;
      
      // Node text
      const text = node.name || node.text || node;
      const lines = this.wrapText(text, 18);
      lines.forEach((line, index) => {
        svg += `
          <text x="${x}" y="${y + (index - (lines.length - 1) / 2) * 16}" 
                text-anchor="middle" 
                font-size="14" 
                fill="white">
            ${this.escapeXml(line)}
          </text>
        `;
      });
      
      // Render children
      if (node.children && node.children.length > 0) {
        const childSpacing = width / (node.children.length + 1);
        node.children.forEach((child, index) => {
          const childX = childSpacing * (index + 1);
          const childY = y + levelSpacing;
          
          // Connection line
          svg += `
            <line x1="${x}" y1="${y + nodeHeight/2}" 
                  x2="${childX}" y2="${childY - nodeHeight/2}" 
                  stroke="${colorScheme.primary}" 
                  stroke-width="2" />
          `;
          
          renderNode(child, childX, childY, level + 1);
        });
      }
    };
    
    // Start rendering from root
    if (hierarchy.length > 0) {
      renderNode(hierarchy[0], width / 2, 60, 0);
    }
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * Generate generic diagram as fallback
   */
  async generateGenericDiagram(content, recommendations, options) {
    // Fallback to a simple visualization
    return this.generateInfographic(content, recommendations, options);
  }

  /**
   * Helper: Extract list elements from content
   */
  extractListElements(content) {
    if (Array.isArray(content)) {
      return content.slice(0, 10);
    }
    
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const listItems = [];
    
    // Extract bullet points
    const bulletPattern = /^[\s]*[-*•]\s+(.+)$/gm;
    let match;
    while ((match = bulletPattern.exec(text)) !== null) {
      listItems.push(match[1].trim());
    }
    
    // Extract numbered lists
    const numberedPattern = /^[\s]*\d+\.\s+(.+)$/gm;
    while ((match = numberedPattern.exec(text)) !== null) {
      listItems.push(match[1].trim());
    }
    
    return listItems.slice(0, 10);
  }

  /**
   * Helper: Extract process steps from content
   */
  extractProcessSteps(content) {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const steps = [];
    
    // Common step patterns
    const patterns = [
      /step\s+(\d+)[:\s]+(.+)/gi,
      /(\d+)\.\s+(.+)/g,
      /first[,:\s]+(.+)/gi,
      /then[,:\s]+(.+)/gi,
      /finally[,:\s]+(.+)/gi,
      /next[,:\s]+(.+)/gi
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        steps.push({
          text: match[2] || match[1],
          number: match[1] || steps.length + 1
        });
      }
    });
    
    return steps.slice(0, 8);
  }

  /**
   * Helper: Extract data points from content
   */
  extractDataPoints(content) {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const dataPoints = [];
    
    // Extract percentages
    const percentPattern = /(\w+)\s*:\s*(\d+(?:\.\d+)?)\s*%/g;
    let match;
    while ((match = percentPattern.exec(text)) !== null) {
      dataPoints.push({
        label: match[1],
        value: parseFloat(match[2])
      });
    }
    
    // Extract numbers with labels
    const numberPattern = /(\w+)\s*:\s*(\d+(?:,\d{3})*(?:\.\d+)?)/g;
    while ((match = numberPattern.exec(text)) !== null) {
      dataPoints.push({
        label: match[1],
        value: parseFloat(match[2].replace(/,/g, ''))
      });
    }
    
    return dataPoints.slice(0, 10);
  }

  /**
   * Helper: Extract timeline events
   */
  extractTimelineEvents(content) {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const events = [];
    
    // Extract years with context
    const yearPattern = /(\d{4})\s*[-:]\s*(.+?)(?=[,\.]|$)/g;
    let match;
    while ((match = yearPattern.exec(text)) !== null) {
      events.push({
        date: match[1],
        title: match[2].trim()
      });
    }
    
    // Extract months
    const monthPattern = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\s*[-:]\s*(.+?)(?=[,\.]|$)/gi;
    while ((match = monthPattern.exec(text)) !== null) {
      events.push({
        date: `${match[1]} ${match[2]}`,
        title: match[3].trim()
      });
    }
    
    return events.slice(0, 8);
  }

  /**
   * Helper: Extract comparison items
   */
  extractComparisonItems(content) {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    
    // Look for pros/cons pattern
    const prosMatch = text.match(/pros[:\s]*([\s\S]*?)(?=cons|$)/i);
    const consMatch = text.match(/cons[:\s]*([\s\S]*?)(?=pros|$)/i);
    
    if (prosMatch || consMatch) {
      return [
        {
          name: 'Pros',
          features: prosMatch ? this.extractListElements(prosMatch[1]) : []
        },
        {
          name: 'Cons',
          features: consMatch ? this.extractListElements(consMatch[1]) : []
        }
      ];
    }
    
    // Look for versus pattern
    const vsMatch = text.match(/(.+?)\s+(?:vs|versus|compared to)\s+(.+)/i);
    if (vsMatch) {
      return [
        { name: vsMatch[1].trim(), features: [] },
        { name: vsMatch[2].trim(), features: [] }
      ];
    }
    
    return [];
  }

  /**
   * Helper: Extract hierarchy
   */
  extractHierarchy(content) {
    // Simple hierarchy extraction - would need more sophisticated parsing in production
    if (typeof content === 'object' && content.hierarchy) {
      return [content.hierarchy];
    }
    
    return [{
      name: 'Root',
      children: [
        { name: 'Child 1', children: [] },
        { name: 'Child 2', children: [] }
      ]
    }];
  }

  /**
   * Helper: Find best matching icon for content
   */
  findBestIcon(text) {
    const lowerText = text.toLowerCase();
    
    // Check for direct matches
    for (const [key, path] of Object.entries(this.iconLibrary)) {
      if (lowerText.includes(key)) {
        return key;
      }
    }
    
    // Check for related terms
    const iconMappings = {
      'learn': ['education', 'study', 'training'],
      'code': ['programming', 'development', 'software'],
      'data': ['database', 'information', 'analytics'],
      'process': ['workflow', 'procedure', 'method'],
      'growth': ['increase', 'improve', 'progress'],
      'idea': ['concept', 'innovation', 'creative']
    };
    
    for (const [icon, terms] of Object.entries(iconMappings)) {
      if (terms.some(term => lowerText.includes(term))) {
        return icon;
      }
    }
    
    return 'star'; // Default icon
  }

  /**
   * Helper: Wrap text to fit width
   */
  wrapText(text, maxLength) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + ' ' + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /**
   * Helper: Get color from palette
   */
  getColorFromPalette(colorScheme, index) {
    const colors = [
      colorScheme.primary,
      colorScheme.secondary,
      colorScheme.accent,
      '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
    ];
    return colors[index % colors.length];
  }

  /**
   * Helper: Escape XML special characters
   */
  escapeXml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Helper: Calculate pattern confidence
   */
  calculatePatternConfidence(matchCount, textLength) {
    const density = matchCount / (textLength / 100);
    return Math.min(density * 20, 100) / 100;
  }

  /**
   * Helper: Generate cache key
   */
  generateCacheKey(content, context) {
    const contentHash = typeof content === 'string' ? 
      content.substring(0, 100) : 
      JSON.stringify(content).substring(0, 100);
    return `${contentHash}-${JSON.stringify(context)}`;
  }

  /**
   * Assess visual quality
   */
  assessVisualQuality(svg, visualType) {
    let score = 70; // Base score
    
    // Check for required elements
    if (svg.includes('<defs>')) score += 5; // Has definitions
    if (svg.includes('gradient')) score += 5; // Uses gradients
    if (svg.includes('filter')) score += 5; // Has filters/effects
    if (svg.includes('animate')) score += 5; // Has animations
    if (svg.includes('text-anchor')) score += 5; // Proper text alignment
    if (svg.includes('viewBox')) score += 5; // Responsive sizing
    
    // Visual type specific checks
    switch (visualType) {
      case 'infographic':
        if (svg.includes('circle') || svg.includes('rect')) score += 5;
        break;
      case 'flowchart':
        if (svg.includes('marker') && svg.includes('path')) score += 5;
        break;
      case 'chart':
        if (svg.includes('rect') || svg.includes('path')) score += 5;
        break;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Determine layout based on content type
   */
  determineLayout(contentType) {
    const layouts = {
      'list': 'grid',
      'process': 'linear',
      'comparison': 'side-by-side',
      'data': 'chart',
      'timeline': 'horizontal',
      'hierarchy': 'tree'
    };
    return layouts[contentType] || 'grid';
  }

  /**
   * Suggest icons based on content and type
   */
  suggestIcons(content, contentType) {
    const suggestions = [];
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const lowerText = text.toLowerCase();
    
    // Type-specific suggestions
    const typeIcons = {
      'list': ['check', 'star', 'arrow'],
      'process': ['flow', 'process', 'cycle'],
      'comparison': ['versus', 'balance', 'compare'],
      'data': ['chart', 'analytics', 'metrics'],
      'timeline': ['clock', 'calendar', 'history'],
      'hierarchy': ['tree', 'organization', 'structure']
    };
    
    if (typeIcons[contentType]) {
      suggestions.push(...typeIcons[contentType]);
    }
    
    // Content-based suggestions
    Object.keys(this.iconLibrary).forEach(icon => {
      if (lowerText.includes(icon)) {
        suggestions.push(icon);
      }
    });
    
    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Get element extraction based on content type
   */
  extractElementsFromContent(content, contentType) {
    switch (contentType) {
      case 'list':
        return this.extractListElements(content);
      case 'process':
        return this.extractProcessSteps(content);
      case 'data':
        return this.extractDataPoints(content);
      case 'timeline':
        return this.extractTimelineEvents(content);
      case 'comparison':
        return this.extractComparisonItems(content);
      case 'hierarchy':
        return this.extractHierarchy(content);
      default:
        return this.extractListElements(content);
    }
  }
}

module.exports = VisualIntelligence;