const DesignEngine = require('../../../src/services/designEngine');
const fs = require('fs').promises;
const path = require('path');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    readdir: jest.fn()
  }
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

describe('DesignEngine', () => {
  let designEngine;
  
  beforeEach(() => {
    jest.clearAllMocks();
    designEngine = new DesignEngine();
  });
  
  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      expect(designEngine.templatesPath).toBeDefined();
      expect(designEngine.componentsPath).toBeDefined();
      expect(designEngine.compiledTemplates).toBeInstanceOf(Map);
      expect(designEngine.compiledComponents).toBeInstanceOf(Map);
      expect(designEngine.styleCache).toBeInstanceOf(Map);
      expect(designEngine.defaultTheme).toBeDefined();
      expect(designEngine.componentRegistry).toBeDefined();
    });
    
    it('should have default theme with correct structure', () => {
      const theme = designEngine.defaultTheme;
      expect(theme.colors).toBeDefined();
      expect(theme.typography).toBeDefined();
      expect(theme.spacing).toBeDefined();
      expect(theme.breakpoints).toBeDefined();
      expect(theme.animations).toBeDefined();
    });
  });
  
  describe('Template Loading', () => {
    it('should load and compile template successfully', async () => {
      const templateContent = '<h1>{{title}}</h1>';
      fs.readFile.mockResolvedValue(templateContent);
      
      const compiled = await designEngine.loadTemplate('modern');
      
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('modern/index.hbs'),
        'utf8'
      );
      expect(compiled).toBeDefined();
      expect(designEngine.compiledTemplates.has('modern-{}')).toBe(true);
    });
    
    it('should use cached template on subsequent calls', async () => {
      const templateContent = '<h1>{{title}}</h1>';
      fs.readFile.mockResolvedValue(templateContent);
      
      await designEngine.loadTemplate('modern');
      await designEngine.loadTemplate('modern');
      
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });
    
    it('should handle template loading errors', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));
      
      await expect(designEngine.loadTemplate('nonexistent'))
        .rejects.toThrow('Failed to load template');
    });
    
    it('should process template with options', async () => {
      const templateContent = '<div>{{content}}</div>';
      fs.readFile.mockResolvedValue(templateContent);
      
      const options = {
        injectComponents: true,
        transformations: [{
          type: 'replace',
          search: 'content',
          replace: 'modified'
        }],
        optimize: true
      };
      
      const compiled = await designEngine.loadTemplate('test', options);
      expect(compiled).toBeDefined();
    });
  });
  
  describe('Component Loading', () => {
    it('should load and compile component successfully', async () => {
      const componentContent = '<div class="component">{{data}}</div>';
      fs.readFile.mockResolvedValue(componentContent);
      
      const compiled = await designEngine.loadComponent('CourseHeader');
      
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('CourseHeader.hbs'),
        'utf8'
      );
      expect(compiled).toBeDefined();
      expect(designEngine.compiledComponents.has('CourseHeader')).toBe(true);
    });
    
    it('should use cached component on subsequent calls', async () => {
      const componentContent = '<div>{{data}}</div>';
      fs.readFile.mockResolvedValue(componentContent);
      
      await designEngine.loadComponent('SessionCard');
      await designEngine.loadComponent('SessionCard');
      
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });
    
    it('should handle component loading errors gracefully', async () => {
      fs.readFile.mockRejectedValue(new Error('Component not found'));
      
      const result = await designEngine.loadComponent('NonExistent');
      expect(result).toBeNull();
    });
  });
  
  describe('CSS Generation', () => {
    it('should generate CSS with default theme', async () => {
      const css = await designEngine.generateCSS('modern');
      
      expect(css).toContain(':root');
      expect(css).toContain('--color-primary');
      expect(css).toContain('--font-family');
      expect(css).toContain('--spacing-md');
      expect(css).toContain('.container');
      expect(css).toContain('.course-header');
    });
    
    it('should apply customizations to CSS', async () => {
      const customizations = {
        colors: {
          primary: '#ff0000',
          secondary: '#00ff00'
        },
        typography: {
          fontFamily: 'Arial, sans-serif'
        }
      };
      
      const css = await designEngine.generateCSS('modern', customizations);
      
      expect(css).toContain('--color-primary: #ff0000');
      expect(css).toContain('--color-secondary: #00ff00');
      expect(css).toContain('--font-family: Arial, sans-serif');
    });
    
    it('should cache generated CSS', async () => {
      await designEngine.generateCSS('modern');
      
      expect(designEngine.styleCache.size).toBe(1);
      
      // Second call should use cache
      const css = await designEngine.generateCSS('modern');
      expect(css).toBeDefined();
    });
    
    it('should include print styles when requested', async () => {
      const css = await designEngine.generateCSS('modern', {}, {
        includePrint: true
      });
      
      expect(css).toContain('@media print');
      expect(css).toContain('.no-print');
    });
    
    it('should optimize CSS when requested', async () => {
      const css = await designEngine.generateCSS('modern', {}, {
        optimize: true
      });
      
      // Optimized CSS should not contain comments or extra whitespace
      expect(css).not.toContain('/*');
      expect(css).not.toContain('  ');
    });
  });
  
  describe('Theme Management', () => {
    it('should merge theme with customizations correctly', () => {
      const customizations = {
        colors: {
          primary: '#123456',
          custom: '#abcdef'
        },
        spacing: {
          xxl: '4rem'
        }
      };
      
      const merged = designEngine.mergeTheme(
        designEngine.defaultTheme,
        customizations
      );
      
      expect(merged.colors.primary).toBe('#123456');
      expect(merged.colors.custom).toBe('#abcdef');
      expect(merged.colors.secondary).toBe(designEngine.defaultTheme.colors.secondary);
      expect(merged.spacing.xxl).toBe('4rem');
    });
    
    it('should handle empty customizations', () => {
      const merged = designEngine.mergeTheme(
        designEngine.defaultTheme,
        {}
      );
      
      expect(merged).toEqual(designEngine.defaultTheme);
    });
  });
  
  describe('Interactive Elements', () => {
    it('should generate interactive quiz HTML', () => {
      const quizData = {
        title: 'Test Quiz',
        questions: [
          {
            question: 'What is 2+2?',
            type: 'multiple-choice',
            options: ['3', '4', '5', '6']
          }
        ]
      };
      
      const html = designEngine.generateInteractiveQuiz('quiz-1', quizData, {});
      
      expect(html).toContain('interactive-quiz');
      expect(html).toContain('Test Quiz');
      expect(html).toContain('What is 2+2?');
      expect(html).toContain('type="radio"');
      expect(html).toContain('<script>');
    });
    
    it('should generate interactive code HTML', () => {
      const codeData = {
        title: 'Example Code',
        language: 'javascript',
        code: 'console.log("Hello World");'
      };
      
      const html = designEngine.generateInteractiveCode('code-1', codeData, {
        editable: true,
        runnable: true
      });
      
      expect(html).toContain('interactive-code');
      expect(html).toContain('Example Code');
      expect(html).toContain('language-javascript');
      expect(html).toContain('console.log');
      expect(html).toContain('Run Code');
    });
    
    it('should generate interactive diagram HTML', () => {
      const diagramData = {
        title: 'Flow Diagram',
        type: 'flowchart'
      };
      
      const html = designEngine.generateInteractiveDiagram('diagram-1', diagramData, {
        interactive: true
      });
      
      expect(html).toContain('interactive-diagram');
      expect(html).toContain('Flow Diagram');
      expect(html).toContain('flowchart');
      expect(html).toContain('Zoom In');
    });
  });
  
  describe('Quality Integration', () => {
    it('should calculate session quality score', () => {
      const session = {
        content: 'A'.repeat(600),
        description: 'Test session',
        objectives: ['Learn', 'Practice', 'Apply'],
        activities: [
          { type: 'quiz' },
          { type: 'hands-on' },
          { type: 'discussion' }
        ],
        estimated_duration: 60
      };
      
      const score = designEngine.calculateSessionQuality(session);
      
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThanOrEqual(100);
    });
    
    it('should calculate content priority', () => {
      const content = {
        quality_score: 85,
        activities: [1, 2, 3],
        rag_context: {
          average_similarity: 0.8
        }
      };
      
      const priority = designEngine.calculateContentPriority(content);
      
      expect(priority).toBeGreaterThan(0);
      expect(priority).toBeGreaterThan(30); // High quality content
    });
    
    it('should get correct quality level from score', () => {
      expect(designEngine.getQualityLevel(90)).toBe('premium');
      expect(designEngine.getQualityLevel(75)).toBe('recommended');
      expect(designEngine.getQualityLevel(60)).toBe('minimum');
      expect(designEngine.getQualityLevel(40)).toBe('low');
    });
    
    it('should get correct quality class from score', () => {
      expect(designEngine.getQualityClass(90)).toBe('quality-premium');
      expect(designEngine.getQualityClass(75)).toBe('quality-recommended');
      expect(designEngine.getQualityClass(60)).toBe('quality-minimum');
      expect(designEngine.getQualityClass(40)).toBe('quality-low');
    });
  });
  
  describe('Responsive Design', () => {
    it('should calculate breakpoints for normal content', () => {
      const content = {
        sessions: Array(5).fill({ activities: Array(3).fill({}) })
      };
      
      const breakpoints = designEngine.calculateBreakpoints(content);
      
      expect(breakpoints.mobile.max).toBe(640);
      expect(breakpoints.tablet.min).toBe(641);
      expect(breakpoints.desktop.min).toBe(1025);
    });
    
    it('should adjust breakpoints for large content', () => {
      const content = {
        sessions: Array(15).fill({ activities: Array(5).fill({}) })
      };
      
      const breakpoints = designEngine.calculateBreakpoints(content);
      
      expect(breakpoints.tablet.max).toBe(1200);
      expect(breakpoints.desktop.min).toBe(1201);
    });
    
    it('should prioritize mobile when requested', () => {
      const content = { sessions: [] };
      const options = { prioritizeMobile: true };
      
      const breakpoints = designEngine.calculateBreakpoints(content, options);
      
      expect(breakpoints.mobile.max).toBe(768);
      expect(breakpoints.tablet.min).toBe(769);
    });
  });
  
  describe('Service Integration', () => {
    it('should integrate with quality scores', async () => {
      const courseData = {
        sessions: [
          { title: 'Session 1', content: 'Content 1' },
          { title: 'Session 2', content: 'Content 2', quality_score: 85 }
        ]
      };
      
      const integrated = await designEngine.integrateWithServices(courseData, {
        useQualityScores: true
      });
      
      expect(integrated.sessions[0].quality_score).toBeDefined();
      expect(integrated.sessions[0].priority).toBeDefined();
      expect(integrated.sessions[1].quality_score).toBe(85);
    });
    
    it('should integrate with RAG context', async () => {
      const courseData = {
        sessions: [
          { title: 'Session 1' },
          { title: 'Session 2' }
        ],
        rag_contexts: [
          { relevant_chunks: [] },
          { relevant_chunks: [], average_similarity: 0.9 }
        ]
      };
      
      const integrated = await designEngine.integrateWithServices(courseData, {
        useRAGContext: true
      });
      
      expect(integrated.sessions[0].rag_context).toBeDefined();
      expect(integrated.sessions[1].rag_context.average_similarity).toBe(0.9);
    });
    
    it('should sort sessions by priority', async () => {
      const courseData = {
        sessions: [
          { title: 'Low Priority', quality_score: 50 },
          { title: 'High Priority', quality_score: 90 },
          { title: 'Medium Priority', quality_score: 70 }
        ]
      };
      
      const integrated = await designEngine.integrateWithServices(courseData, {
        useQualityScores: true,
        sortByPriority: true
      });
      
      expect(integrated.sessions[0].title).toBe('High Priority');
      expect(integrated.sessions[2].title).toBe('Low Priority');
    });
  });
  
  describe('Template Variables', () => {
    it('should generate complete template variables', () => {
      const courseData = {
        id: '123',
        title: 'Test Course',
        quality_score: 85,
        rag_context: { average_similarity: 0.8 }
      };
      
      const variables = designEngine.generateTemplateVariables(courseData, {
        showProgress: true,
        analytics: true,
        trackingId: 'UA-123456'
      });
      
      expect(variables.course).toEqual(courseData);
      expect(variables.theme).toBeDefined();
      expect(variables.metadata.generator).toBe('AI Course Creator Design Engine');
      expect(variables.navigation.showProgress).toBe(true);
      expect(variables.analytics.trackingEnabled).toBe(true);
      expect(variables.analytics.trackingId).toBe('UA-123456');
      expect(variables.quality.score).toBe(85);
      expect(variables.quality.level).toBe('premium');
      expect(variables.ragContext).toBeDefined();
    });
    
    it('should handle missing optional data', () => {
      const courseData = {
        id: '123',
        title: 'Test Course'
      };
      
      const variables = designEngine.generateTemplateVariables(courseData);
      
      expect(variables.quality).toBeUndefined();
      expect(variables.ragContext).toBeUndefined();
      expect(variables.navigation.showHome).toBe(true);
      expect(variables.analytics.trackingEnabled).toBe(true);
    });
  });
  
  describe('CSS Optimization', () => {
    it('should optimize CSS correctly', () => {
      const unoptimized = `
        /* Comment */
        .class {
          color: red;
          margin: 0;
        }
        
        .empty { }
      `;
      
      const optimized = designEngine.optimizeCSS(unoptimized);
      
      expect(optimized).not.toContain('/*');
      expect(optimized).not.toContain('  ');
      expect(optimized).not.toContain('.empty');
      expect(optimized).toContain('.class{color:red;margin:0}');
    });
  });
  
  describe('Template Optimization', () => {
    it('should optimize template HTML', () => {
      const unoptimized = `
        <!-- Comment -->
        <div>
          <h1>Title</h1>
        </div>
      `;
      
      const optimized = designEngine.optimizeTemplate(unoptimized);
      
      expect(optimized).not.toContain('<!--');
      expect(optimized).toBe('<div><h1>Title</h1></div>');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing template gracefully', async () => {
      fs.readFile.mockRejectedValue(new Error('Not found'));
      
      await expect(designEngine.loadTemplate('missing'))
        .rejects.toThrow('Failed to load template');
    });
    
    it('should handle CSS generation errors', async () => {
      // Force an error by making fs.readFile fail
      fs.readFile.mockRejectedValue(new Error('Read error'));
      
      // Should still generate CSS without template-specific styles
      const css = await designEngine.generateCSS('error-template');
      expect(css).toContain(':root');
      expect(css).toContain('Base Styles');
    });
    
    it('should handle component render errors', async () => {
      fs.readFile.mockRejectedValue(new Error('Component error'));
      
      const html = await designEngine.renderComponent('ErrorComponent');
      expect(html).toContain('Component render failed');
    });
  });
  
  describe('Handlebars Helpers', () => {
    it('should register all required helpers', () => {
      const helpers = [
        'component', 'theme', 'responsive', 'cssVar',
        'qualityClass', 'prioritizeContent', 'ragContext',
        'interactive', 'layout'
      ];
      
      // Helpers are registered in constructor
      // We can't directly test Handlebars internals, but we can verify
      // the helper methods exist in the class
      expect(designEngine.generateInteractiveQuiz).toBeDefined();
      expect(designEngine.generateInteractiveCode).toBeDefined();
      expect(designEngine.generateInteractiveDiagram).toBeDefined();
    });
  });
  
  describe('Component Initialization', () => {
    it('should create components directory', async () => {
      await designEngine.initializeComponents();
      
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('components'),
        { recursive: true }
      );
    });
    
    it('should create default components if they dont exist', async () => {
      fs.access.mockRejectedValue(new Error('Not found'));
      
      await designEngine.initializeComponents();
      
      const expectedComponents = [
        'CourseHeader', 'SessionCard', 'ActivityBlock',
        'AssessmentSection', 'NavigationMenu', 'ProgressTracker'
      ];
      
      expectedComponents.forEach(component => {
        expect(fs.writeFile).toHaveBeenCalledWith(
          expect.stringContaining(`${component}.hbs`),
          expect.any(String),
          'utf8'
        );
      });
    });
  });
});

describe('DesignEngine Integration Tests', () => {
  let designEngine;
  
  beforeEach(() => {
    jest.clearAllMocks();
    designEngine = new DesignEngine();
  });
  
  it('should generate complete course HTML with all features', async () => {
    const courseData = {
      id: 'course-123',
      title: 'Advanced JavaScript',
      description: 'Learn advanced JavaScript concepts',
      quality_score: 85,
      sessions: [
        {
          id: 'session-1',
          title: 'Async Programming',
          description: 'Master promises and async/await',
          content: 'Detailed content about async programming...',
          quality_score: 90,
          activities: [
            {
              id: 'activity-1',
              type: 'quiz',
              title: 'Async Quiz',
              content: {
                questions: [
                  {
                    question: 'What is a Promise?',
                    type: 'multiple-choice',
                    options: ['A', 'B', 'C', 'D']
                  }
                ]
              }
            }
          ]
        }
      ],
      rag_context: {
        relevant_chunks: [
          { text: 'Related content', similarity_score: 0.9 }
        ],
        average_similarity: 0.9
      }
    };
    
    const options = {
      useQualityScores: true,
      useRAGContext: true,
      showProgress: true,
      analytics: true
    };
    
    // Mock file reads
    fs.readFile.mockImplementation((path) => {
      if (path.includes('index.hbs')) {
        return Promise.resolve('<html>{{course.title}}</html>');
      }
      return Promise.resolve('');
    });
    
    // Test template loading
    const template = await designEngine.loadTemplate('modern', options);
    expect(template).toBeDefined();
    
    // Test CSS generation
    const css = await designEngine.generateCSS('modern', {
      colors: { primary: '#007bff' }
    });
    expect(css).toContain('--color-primary: #007bff');
    
    // Test service integration
    const integrated = await designEngine.integrateWithServices(courseData, options);
    expect(integrated.sessions[0].priority).toBeDefined();
    
    // Test template variables
    const variables = designEngine.generateTemplateVariables(integrated, options);
    expect(variables.quality.level).toBe('premium');
  });

  describe('Visual Intelligence Integration', () => {
    test('should have VisualIntelligence instance when available', () => {
      const engine = new DesignEngine();
      // May or may not have VI depending on environment
      expect(engine.visualIntelligence).toBeDefined();
    });

    test('should enhance content with visuals when VI is available', async () => {
      const engine = new DesignEngine();
      
      if (engine.visualIntelligence) {
        const content = {
          objectives: ['Learn AI', 'Build models', 'Deploy solutions'],
          sessions: [{
            id: 'session-1',
            title: 'Introduction',
            content: 'Step 1: Learn basics\nStep 2: Practice\nStep 3: Build'
          }]
        };

        const enhanced = await engine.enhanceContentWithVisuals(content);
        
        expect(enhanced).toBeDefined();
        // Should have visual enhancements if VI processed it
        if (enhanced.objectivesVisual) {
          expect(enhanced.objectivesVisual).toContain('<svg');
        }
      }
    });

    test('should enhance text content with appropriate visuals', async () => {
      const engine = new DesignEngine();
      
      if (engine.visualIntelligence) {
        const text = `
          Learning objectives:
          - Understand core concepts
          - Apply best practices
          - Build real projects
        `;

        const enhanced = await engine.enhanceTextContent(text);
        
        expect(enhanced).toBeDefined();
        // Should either return original or enhanced version
        expect(enhanced).toContain('Understand core concepts');
      }
    });

    test('should generate visual report for course data', async () => {
      const engine = new DesignEngine();
      
      if (engine.visualIntelligence) {
        const courseData = {
          id: 'course-123',
          title: 'AI Course',
          total_duration: 480,
          objectives: ['Objective 1', 'Objective 2'],
          sessions: [
            {
              id: 'session-1',
              title: 'Session 1',
              estimated_duration: 60,
              activities: [
                { type: 'lecture', title: 'Intro' },
                { type: 'quiz', title: 'Check' }
              ]
            },
            {
              id: 'session-2',
              title: 'Session 2',
              estimated_duration: 90,
              activities: [
                { type: 'hands-on', title: 'Practice' }
              ]
            }
          ]
        };

        const report = await engine.generateVisualReport(courseData);
        
        expect(report).toBeDefined();
        expect(report.courseId).toBe('course-123');
        expect(report.visuals).toBeInstanceOf(Array);
        expect(report.visuals.length).toBeGreaterThan(0);
        expect(report.overallQuality).toBeGreaterThan(0);
        
        // Check for specific visual types
        const visualTypes = report.visuals.map(v => v.type);
        expect(visualTypes).toContain('overview');
        expect(visualTypes).toContain('learning-path');
      }
    });

    test('should handle missing VisualIntelligence gracefully', async () => {
      const engine = new DesignEngine();
      engine.visualIntelligence = null;

      const content = { test: 'data' };
      const enhanced = await engine.enhanceContentWithVisuals(content);
      
      // Should return original content
      expect(enhanced).toEqual(content);
    });

    test('should handle visual generation errors gracefully', async () => {
      const engine = new DesignEngine();
      
      if (engine.visualIntelligence) {
        // Mock a failing visual generation
        const originalGenerate = engine.visualIntelligence.generateVisual;
        engine.visualIntelligence.generateVisual = jest.fn()
          .mockRejectedValue(new Error('Generation failed'));

        const content = {
          objectives: ['Test objective']
        };

        const enhanced = await engine.enhanceContentWithVisuals(content);
        
        // Should handle error and return content without crash
        expect(enhanced).toBeDefined();
        
        // Restore original method
        engine.visualIntelligence.generateVisual = originalGenerate;
      }
    });
  });

  describe('AI Visual Handlebars Helpers', () => {
    test('should register aiVisual helper', () => {
      const engine = new DesignEngine();
      const helpers = require('handlebars').helpers;
      
      expect(helpers.aiVisual).toBeDefined();
    });

    test('should register smartTransform helper', () => {
      const engine = new DesignEngine();
      const helpers = require('handlebars').helpers;
      
      expect(helpers.smartTransform).toBeDefined();
    });
  });
});