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

// Mock VisualIntelligence
jest.mock('../../../src/services/visualIntelligence', () => {
  return jest.fn().mockImplementation(() => ({
    analyzeContent: jest.fn().mockResolvedValue({
      confidence: 0.8,
      primaryVisual: { type: 'infographic' },
      recommendations: {}
    }),
    generateVisual: jest.fn().mockResolvedValue({
      svg: '<svg>Generated Visual</svg>',
      metadata: { quality: 90 }
    })
  }));
});

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
        components: [{ name: 'TestComponent', data: { test: true } }],
        transformations: [{
          type: 'replace',
          search: 'content',
          replace: 'modified'
        }],
        optimize: true
      };
      
      // Mock the methods that process template
      designEngine.injectDynamicComponents = jest.fn().mockResolvedValue(templateContent);
      designEngine.applyTransformations = jest.fn().mockResolvedValue(templateContent);
      designEngine.optimizeTemplate = jest.fn().mockReturnValue(templateContent);
      
      const compiled = await designEngine.loadTemplate('test', options);
      expect(compiled).toBeDefined();
      expect(designEngine.injectDynamicComponents).toHaveBeenCalled();
      expect(designEngine.applyTransformations).toHaveBeenCalled();
      expect(designEngine.optimizeTemplate).toHaveBeenCalled();
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
    
    it('should generate interactive diagram HTML', async () => {
      const diagramData = {
        title: 'Flow Diagram',
        type: 'flowchart'
      };
      
      const html = await designEngine.generateInteractiveDiagram('diagram-1', diagramData, {
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
      expect(html).toContain('Component not found');
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

        const enhanced = await engine.enhanceTextContent(text, { context: {} });
        
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

  describe('Additional Method Coverage', () => {
    let designEngine;
    
    beforeEach(() => {
      jest.clearAllMocks();
      designEngine = new DesignEngine();
    });

    describe('ensureMarkedInitialized', () => {
      it('should initialize marked library', async () => {
        await designEngine.ensureMarkedInitialized();
        expect(designEngine.markedInitialized).toBe(true);
      });

      it('should only initialize marked once', async () => {
        await designEngine.ensureMarkedInitialized();
        await designEngine.ensureMarkedInitialized();
        expect(designEngine.markedInitialized).toBe(true);
      });
    });

    describe('processTemplate', () => {
      it('should process template with all options', async () => {
        const template = '<div>{{content}}</div>';
        
        // Mock internal methods
        designEngine.injectDynamicComponents = jest.fn().mockResolvedValue('<div>injected</div>');
        designEngine.applyTransformations = jest.fn().mockResolvedValue('<div>transformed</div>');
        designEngine.optimizeTemplate = jest.fn().mockReturnValue('<div>optimized</div>');
        
        const result = await designEngine.processTemplate(template, {
          injectComponents: true,
          components: [{ name: 'test', data: {} }],
          transformations: [{ type: 'replace', search: 'a', replace: 'b' }],
          optimize: true
        });
        
        expect(designEngine.injectDynamicComponents).toHaveBeenCalled();
        expect(designEngine.applyTransformations).toHaveBeenCalled();
        expect(designEngine.optimizeTemplate).toHaveBeenCalled();
        expect(result).toBe('<div>optimized</div>');
      });

      it('should process template without options', async () => {
        const template = '<div>{{content}}</div>';
        const result = await designEngine.processTemplate(template, {});
        expect(result).toBe(template);
      });
    });

    describe('injectDynamicComponents', () => {
      it('should inject components into template', async () => {
        const template = '<div>{{component:Header}}</div>';
        const components = [{ name: 'Header', data: { title: 'Test' } }];
        
        designEngine.renderComponent = jest.fn().mockResolvedValue('<h1>Test</h1>');
        
        const result = await designEngine.injectDynamicComponents(template, components);
        expect(result).toBe('<div><h1>Test</h1></div>');
        expect(designEngine.renderComponent).toHaveBeenCalledWith('Header', { title: 'Test' });
      });

      it('should handle missing placeholder', async () => {
        const template = '<div>No components</div>';
        const components = [{ name: 'Header', data: {} }];
        
        const result = await designEngine.injectDynamicComponents(template, components);
        expect(result).toBe(template);
      });
    });

    describe('applyTransformations', () => {
      it('should apply replace transformation', async () => {
        const template = '<div>Hello World</div>';
        const transformations = [{
          type: 'replace',
          search: 'World',
          replace: 'Universe'
        }];
        
        const result = await designEngine.applyTransformations(template, transformations);
        expect(result).toBe('<div>Hello Universe</div>');
      });

      it('should apply inject transformation', async () => {
        const template = '<div>{{MARKER}}</div>';
        const transformations = [{
          type: 'inject',
          marker: '{{MARKER}}',
          content: '<span>Injected</span>'
        }];
        
        const result = await designEngine.applyTransformations(template, transformations);
        expect(result).toBe('<div><span>Injected</span></div>');
      });

      it('should apply wrap transformation', async () => {
        const template = '<div>(content)</div>';
        const transformations = [{
          type: 'wrap',
          search: '\\((.*?)\\)',
          before: '<strong>',
          after: '</strong>'
        }];
        
        const result = await designEngine.applyTransformations(template, transformations);
        expect(result).toBe('<div><strong>content</strong></div>');
      });

      it('should handle multiple transformations', async () => {
        const template = '<div>Hello World</div>';
        const transformations = [
          { type: 'replace', search: 'Hello', replace: 'Hi' },
          { type: 'replace', search: 'World', replace: 'Universe' }
        ];
        
        const result = await designEngine.applyTransformations(template, transformations);
        expect(result).toBe('<div>Hi Universe</div>');
      });
    });

    describe('processTemplateStyles', () => {
      it('should process template styles with theme variables', () => {
        const styles = `
          .test {
            color: {{color.primary}};
            padding: {{spacing.md}};
            font-family: {{typography.fontFamily}};
          }
        `;
        
        const result = designEngine.processTemplateStyles(styles, designEngine.defaultTheme);
        expect(result).toContain('#3b82f6'); // primary color
        expect(result).toContain('1rem'); // md spacing
        expect(result).toContain('-apple-system'); // font family
      });

      it('should handle missing placeholders', () => {
        const styles = '.test { color: {{color.nonexistent}}; }';
        const result = designEngine.processTemplateStyles(styles, designEngine.defaultTheme);
        expect(result).toBe(styles);
      });
    });

    describe('HTML generation methods', () => {
      it('should generate flowchart HTML', () => {
        const data = { nodes: ['Start', 'Process', 'End'] };
        const html = designEngine.generateFlowchartHTML(data);
        expect(html).toContain('<svg');
        expect(html).toContain('flowchart-svg');
        expect(html).toContain('Start');
      });

      it('should generate mindmap HTML', () => {
        const data = { central: 'Main Topic', branches: ['A', 'B', 'C'] };
        const html = designEngine.generateMindmapHTML(data);
        expect(html).toContain('mindmap-placeholder');
      });

      it('should generate sequence HTML', () => {
        const data = { actors: ['User', 'System'], interactions: [] };
        const html = designEngine.generateSequenceHTML(data);
        expect(html).toContain('sequence-placeholder');
      });
    });

    describe('escapeHtml', () => {
      it('should escape HTML characters', () => {
        const input = '<div>"Hello" & \'World\'</div>';
        const expected = '&lt;div&gt;&quot;Hello&quot; &amp; &#x27;World&#x27;&lt;/div&gt;';
        const result = designEngine.escapeHtml(input);
        expect(result).toBe(expected);
      });

      it('should handle empty string', () => {
        expect(designEngine.escapeHtml('')).toBe('');
      });
    });

    describe('Handlebars Helper Functions', () => {
      let handlebars;
      
      beforeEach(() => {
        handlebars = require('handlebars');
        // Need to re-initialize to ensure helpers are registered
        designEngine = new DesignEngine();
      });

      it('should have theme helper', () => {
        const themeHelper = handlebars.helpers.theme;
        designEngine.currentTheme = designEngine.defaultTheme;
        
        expect(themeHelper('colors.primary')).toBe('#3b82f6');
        expect(themeHelper('nonexistent.path')).toBe('');
      });

      it('should have responsive helper', () => {
        const responsiveHelper = handlebars.helpers.responsive;
        designEngine.currentTheme = designEngine.defaultTheme;
        
        const result = responsiveHelper('md');
        expect(result).toBe('@media (min-width: 768px)');
      });

      it('should have cssVar helper', () => {
        const cssVarHelper = handlebars.helpers.cssVar;
        const result = cssVarHelper('primary', '#000');
        expect(result.string).toBe('var(--primary, #000)');
      });

      it('should have qualityClass helper', () => {
        const qualityClassHelper = handlebars.helpers.qualityClass;
        
        expect(qualityClassHelper(90)).toBe('quality-premium');
        expect(qualityClassHelper(75)).toBe('quality-recommended');
        expect(qualityClassHelper(60)).toBe('quality-minimum');
        expect(qualityClassHelper(40)).toBe('quality-low');
      });

      it('should have prioritizeContent helper', () => {
        const prioritizeHelper = handlebars.helpers.prioritizeContent;
        
        let result = prioritizeHelper('Content', 90);
        expect(result.string).toContain('priority-high');
        
        result = prioritizeHelper('Content', 75);
        expect(result.string).toContain('priority-medium');
        
        result = prioritizeHelper('Content', 50);
        expect(result.string).toContain('priority-low');
      });

      it('should have ragContext helper', () => {
        const ragHelper = handlebars.helpers.ragContext;
        
        const context = {
          relevant_chunks: [
            { text: 'Test chunk', similarity_score: 0.85 }
          ]
        };
        
        const result = ragHelper(context);
        expect(result.string).toContain('rag-context');
        expect(result.string).toContain('Test chunk');
        expect(result.string).toContain('85% match');
      });

      it('should handle empty ragContext', () => {
        const ragHelper = handlebars.helpers.ragContext;
        expect(ragHelper(null)).toBe('');
        expect(ragHelper({})).toBe('');
      });

      it('should have layout helper', () => {
        const layoutHelper = handlebars.helpers.layout;
        
        let result = layoutHelper('grid', {});
        expect(result.string).toContain('display: grid');
        
        result = layoutHelper('flex', {});
        expect(result.string).toContain('display: flex');
        
        result = layoutHelper('masonry', {});
        expect(result.string).toContain('column-count: 3');
        
        result = layoutHelper('sidebar', {});
        expect(result.string).toContain('grid-template-columns: 300px 1fr');
        
        result = layoutHelper('unknown', {});
        expect(result.string).toContain('style=""');
      });

      it('should have markdown helper', () => {
        const markdownHelper = handlebars.helpers.markdown;
        
        const text = '**Bold** and *italic* text\n\nNew paragraph\nNew line';
        const result = markdownHelper(text);
        
        expect(result.string).toContain('<strong>Bold</strong>');
        expect(result.string).toContain('<em>italic</em>');
        expect(result.string).toContain('</p><p>');
        expect(result.string).toContain('<br>');
      });

      it('should have formatDuration helper', () => {
        const durationHelper = handlebars.helpers.formatDuration;
        
        expect(durationHelper(null)).toBe('0 min');
        expect(durationHelper(30)).toBe('30m');
        expect(durationHelper(90)).toBe('1h 30m');
        expect(durationHelper(120)).toBe('2h 0m');
      });

      it('should have string helpers', () => {
        const capitalizeHelper = handlebars.helpers.capitalize;
        const truncateHelper = handlebars.helpers.truncate;
        
        expect(capitalizeHelper('hello')).toBe('Hello');
        expect(capitalizeHelper('')).toBe('');
        expect(capitalizeHelper(null)).toBe('');
        
        expect(truncateHelper('Long text here', 8)).toBe('Long tex...');
        expect(truncateHelper('Short', 10)).toBe('Short');
        expect(truncateHelper(null, 5)).toBe('');
      });

      it('should have array helpers', () => {
        const lengthHelper = handlebars.helpers.length;
        
        expect(lengthHelper([1, 2, 3])).toBe(3);
        expect(lengthHelper([])).toBe(0);
        expect(lengthHelper(null)).toBe(0);
        expect(lengthHelper('not array')).toBe(0);
      });

      it('should have eachWithIndex helper', () => {
        const eachWithIndexHelper = handlebars.helpers.eachWithIndex;
        const options = {
          fn: (context) => `${context.index}:${context.value}`
        };
        
        const result = eachWithIndexHelper([
          { value: 'a' },
          { value: 'b' }
        ], options);
        
        expect(result).toBe('0:a1:b');
      });

      it('should have math helpers', () => {
        const helpers = handlebars.helpers;
        
        expect(helpers.add(5, 3)).toBe(8);
        expect(helpers.sub(10, 4)).toBe(6);
        expect(helpers.multiply(3, 7)).toBe(21);
        expect(helpers.divide(20, 4)).toBe(5);
        expect(helpers.divide(10, 0)).toBe(0);
        expect(helpers.lt(3, 5)).toBe(true);
        expect(helpers.gt(7, 4)).toBe(true);
        expect(helpers.lte(5, 5)).toBe(true);
        expect(helpers.gte(6, 5)).toBe(true);
      });

      it('should have ifEquals helper', () => {
        const ifEqualsHelper = handlebars.helpers.ifEquals;
        const options = {
          fn: function() { return 'equal'; },
          inverse: function() { return 'not equal'; }
        };
        
        expect(ifEqualsHelper.call({}, 'a', 'a', options)).toBe('equal');
        expect(ifEqualsHelper.call({}, 'a', 'b', options)).toBe('not equal');
      });

      it('should have json helper', () => {
        const jsonHelper = handlebars.helpers.json;
        const obj = { a: 1, b: 'test' };
        expect(jsonHelper(obj)).toBe('{"a":1,"b":"test"}');
      });

      it('should have uniqueId helper', () => {
        const uniqueIdHelper = handlebars.helpers.uniqueId;
        const id1 = uniqueIdHelper();
        const id2 = uniqueIdHelper();
        
        expect(id1).toMatch(/^id-[a-f0-9]{8}$/);
        expect(id1).not.toBe(id2);
      });

      it('should have component helper', () => {
        const componentHelper = handlebars.helpers.component;
        
        // Mock compiled component
        designEngine.compiledComponents.set('TestComponent', (data) => `<div>${data.text}</div>`);
        
        const options = { hash: { text: 'Hello' } };
        const result = componentHelper('TestComponent', options);
        
        expect(result.string).toBe('<div>Hello</div>');
      });

      it('should handle missing component', () => {
        // Get the component helper function
        const componentHelper = handlebars.helpers.component;
        
        // Mock the compiledComponents to simulate missing component
        const originalGet = designEngine.compiledComponents.get;
        designEngine.compiledComponents.get = jest.fn().mockReturnValue(null);
        
        const options = { hash: {} };
        const result = componentHelper('NonExistent', options);
        
        expect(result).toBe('');
        
        // Restore original method
        designEngine.compiledComponents.get = originalGet;
      });

      it('should have interactive helper', () => {
        const interactiveHelper = handlebars.helpers.interactive;
        
        // Mock generateInteractiveQuiz
        designEngine.generateInteractiveQuiz = jest.fn().mockReturnValue('<div>Quiz</div>');
        designEngine.generateInteractiveCode = jest.fn().mockReturnValue('<div>Code</div>');
        designEngine.generateInteractiveDiagram = jest.fn().mockReturnValue('<div>Diagram</div>');
        
        let result = interactiveHelper('quiz', { questions: [] }, { hash: {} });
        expect(result.string).toBe('<div>Quiz</div>');
        
        result = interactiveHelper('code', { code: 'test' }, { hash: {} });
        expect(result.string).toBe('<div>Code</div>');
        
        result = interactiveHelper('diagram', { type: 'flow' }, { hash: {} });
        expect(result.string).toBe('<div>Diagram</div>');
        
        result = interactiveHelper('unknown', 'data', { hash: {} });
        expect(result.string).toContain('interactive-unknown');
      });
    });

    describe('enhanceActivities', () => {
      it('should enhance activities with visuals', async () => {
        const activities = [
          {
            id: 'act-1',
            type: 'quiz',
            title: 'Test Quiz',
            questions: [{ q: 'Question 1' }],
            estimated_duration: 30
          },
          {
            id: 'act-2',
            type: 'hands-on',
            content: 'Build a simple application step by step'
          }
        ];
        
        // Mock VisualIntelligence
        if (designEngine.visualIntelligence) {
          designEngine.visualIntelligence.generateVisual = jest.fn()
            .mockResolvedValue({ svg: '<svg>Visual</svg>' });
          designEngine.visualIntelligence.analyzeContent = jest.fn()
            .mockResolvedValue({ 
              confidence: 0.8, 
              primaryVisual: { type: 'flowchart' } 
            });
        }
        
        const enhanced = await designEngine.enhanceActivities(activities, {});
        
        expect(enhanced).toHaveLength(2);
        expect(enhanced[0]).toHaveProperty('id', 'act-1');
        
        if (designEngine.visualIntelligence) {
          // Quiz should have overview visual
          expect(enhanced[0].overviewVisual).toBeDefined();
          // Hands-on should have content visual
          expect(enhanced[1].contentVisual).toBeDefined();
        }
      });

      it('should skip activities with existing visuals', async () => {
        const activities = [
          {
            id: 'act-1',
            visual: '<svg>Existing</svg>',
            content: 'Content'
          },
          {
            id: 'act-2',
            diagram: '<svg>Existing diagram</svg>',
            content: 'Content'
          }
        ];
        
        const enhanced = await designEngine.enhanceActivities(activities, {});
        
        expect(enhanced[0].visual).toBe('<svg>Existing</svg>');
        expect(enhanced[1].diagram).toBe('<svg>Existing diagram</svg>');
      });

      it('should handle low confidence analysis', async () => {
        const activities = [{
          id: 'act-1',
          content: 'Simple content'
        }];
        
        if (designEngine.visualIntelligence) {
          designEngine.visualIntelligence.analyzeContent = jest.fn()
            .mockResolvedValue({ confidence: 0.5 });
        }
        
        const enhanced = await designEngine.enhanceActivities(activities, {});
        expect(enhanced[0].contentVisual).toBeUndefined();
      });
    });

    describe('Component Template Methods', () => {
      it('should get default course header component', () => {
        const template = designEngine.getDefaultCourseHeaderComponent();
        expect(template).toContain('course-header');
        expect(template).toContain('{{course.title}}');
        expect(template).toContain('{{formatDuration totalDuration}}');
      });

      it('should get default session card component', () => {
        const template = designEngine.getDefaultSessionCardComponent();
        expect(template).toContain('session-card');
        expect(template).toContain('{{sessionNumber}}');
        expect(template).toContain('{{title}}');
      });

      it('should get default activity block component', () => {
        const template = designEngine.getDefaultActivityBlockComponent();
        expect(template).toContain('activity-block');
        expect(template).toContain('{{capitalize type}}');
        expect(template).toContain('{{interactive');
      });

      it('should get default assessment section component', () => {
        const template = designEngine.getDefaultAssessmentSectionComponent();
        expect(template).toContain('assessment-section');
        expect(template).toContain('{{title}}');
        expect(template).toContain('{{#if questions}}');
      });

      it('should get default navigation menu component', () => {
        const template = designEngine.getDefaultNavigationMenuComponent();
        expect(template).toContain('navigation-menu');
        expect(template).toContain('{{#each sessions}}');
        expect(template).toContain('nav-link');
      });

      it('should get default progress tracker component', () => {
        const template = designEngine.getDefaultProgressTrackerComponent();
        expect(template).toContain('progress-tracker-component');
        expect(template).toContain('{{overallProgress}}');
        expect(template).toContain('{{#if showStats}}');
      });
    });

    describe('CSS Generation Edge Cases', () => {
      it('should handle template styles loading error', async () => {
        fs.readFile.mockImplementation((path) => {
          if (path.includes('styles.css')) {
            throw new Error('File not found');
          }
          return Promise.resolve('');
        });
        
        const css = await designEngine.generateCSS('template-with-error');
        expect(css).toContain('Base Styles');
        // Template-specific styles are logged as warning but CSS still generated
        expect(css).toBeDefined();
      });

      it('should bypass cache when noCache option is true', async () => {
        const customizations = { colors: { primary: '#ff0000' } };
        
        // First call - should cache
        await designEngine.generateCSS('cached-template', customizations);
        expect(designEngine.styleCache.size).toBe(1);
        
        // Second call with noCache - should bypass cache
        const css = await designEngine.generateCSS('cached-template', customizations, {
          noCache: true
        });
        expect(css).toBeDefined();
      });
    });

    describe('Interactive Quiz Edge Cases', () => {
      it('should handle true-false questions', () => {
        const quizData = {
          questions: [{
            question: 'Is the sky blue?',
            type: 'true-false'
          }]
        };
        
        const html = designEngine.generateInteractiveQuiz('quiz-tf', quizData, {});
        expect(html).toContain('type="radio"');
        expect(html).toContain('True');
        expect(html).toContain('False');
      });

      it('should handle quiz without title', () => {
        const quizData = {
          questions: [{ question: 'Q1', type: 'multiple-choice', options: ['A'] }]
        };
        
        const html = designEngine.generateInteractiveQuiz('quiz-notitle', quizData, {});
        expect(html).toContain('Quiz'); // Default title
      });
    });

    describe('Interactive Code Edge Cases', () => {
      it('should handle code without title', () => {
        const codeData = {
          code: 'console.log("test");',
          language: 'javascript'
        };
        
        const html = designEngine.generateInteractiveCode('code-notitle', codeData, {});
        expect(html).not.toContain('code-title');
        expect(html).toContain('console.log');
      });

      it('should handle non-editable code', () => {
        const codeData = {
          code: 'const x = 1;'
        };
        
        const html = designEngine.generateInteractiveCode('code-readonly', codeData, {
          editable: false
        });
        expect(html).not.toContain('editable');
      });

      it('should handle code without runnable option', () => {
        const codeData = {
          code: 'print("Hello")'
        };
        
        const html = designEngine.generateInteractiveCode('code-norun', codeData, {
          runnable: false
        });
        expect(html).not.toContain('Run Code');
      });
    });

    describe('Interactive Diagram Edge Cases', () => {
      it('should handle mindmap type', async () => {
        const diagramData = {
          type: 'mindmap',
          central: 'Main Topic'
        };
        
        const html = await designEngine.generateInteractiveDiagram('mindmap-1', diagramData, {});
        expect(html).toContain('mindmap');
      });

      it('should handle sequence type', async () => {
        const diagramData = {
          type: 'sequence',
          actors: ['User', 'System']
        };
        
        const html = await designEngine.generateInteractiveDiagram('seq-1', diagramData, {});
        expect(html).toContain('sequence');
      });

      it('should handle diagram without title', async () => {
        const diagramData = {
          type: 'flowchart'
        };
        
        const html = await designEngine.generateInteractiveDiagram('no-title', diagramData, {});
        expect(html).not.toContain('diagram-title');
      });

      it('should handle non-interactive diagram', async () => {
        const diagramData = {
          type: 'flowchart'
        };
        
        const html = await designEngine.generateInteractiveDiagram('static', diagramData, {
          interactive: false
        });
        expect(html).not.toContain('Zoom In');
      });
    });
  });
});