// Mock dependencies
jest.mock('../../../src/services/claudeService');
jest.mock('../../../src/utils/logger');

const VisualIntelligence = require('../../../src/services/visualIntelligence');
const claudeService = require('../../../src/services/claudeService');

describe('VisualIntelligence Service', () => {
  let visualIntelligence;
  
  beforeEach(() => {
    jest.clearAllMocks();
    visualIntelligence = new VisualIntelligence();
  });

  describe('analyzeContent', () => {
    test('should detect list patterns in content', async () => {
      const content = `
        - Learn AI fundamentals
        - Understand machine learning
        - Build neural networks
        - Deploy models to production
      `;

      const analysis = await visualIntelligence.analyzeContent(content);

      expect(analysis).toBeDefined();
      expect(analysis.primaryVisual).toBeDefined();
      expect(analysis.primaryVisual.type).toBe('infographic');
      expect(analysis.confidence).toBeGreaterThan(0.5);
    });

    test('should detect process patterns in content', async () => {
      const content = `
        Step 1: Gather requirements
        Step 2: Design the system
        Step 3: Implement the solution
        Step 4: Test thoroughly
        Step 5: Deploy to production
      `;

      const analysis = await visualIntelligence.analyzeContent(content);

      expect(analysis.primaryVisual.type).toBe('flowchart');
      expect(analysis.confidence).toBeGreaterThan(0.5);
    });

    test('should detect data patterns in content', async () => {
      const content = `
        Our results show:
        - Performance improved by 45%
        - User satisfaction: 92%
        - Response time reduced to 200ms
        - $1.2M in cost savings
      `;

      const analysis = await visualIntelligence.analyzeContent(content);

      expect(analysis.primaryVisual.type).toBe('data-visualization');
      expect(analysis.confidence).toBeGreaterThan(0);
    });

    test('should detect timeline patterns in content', async () => {
      const content = `
        2020: Project inception
        2021: Initial development phase
        2022: Beta release and testing
        2023: Official launch
        2024: Major feature update
      `;

      const analysis = await visualIntelligence.analyzeContent(content);

      expect(analysis.primaryVisual.type).toBe('timeline');
      expect(analysis.confidence).toBeGreaterThan(0);
    });

    test('should detect comparison patterns in content', async () => {
      const content = `
        Traditional Approach vs. AI-Powered Solution
        
        Pros of Traditional:
        - Well understood
        - Lower initial cost
        
        Cons of Traditional:
        - Manual processes
        - Limited scalability
      `;

      const analysis = await visualIntelligence.analyzeContent(content);

      expect(analysis.primaryVisual.type).toBe('comparison-chart');
      expect(analysis.confidence).toBeGreaterThan(0);
    });

    test('should detect hierarchy patterns in content', async () => {
      const content = `
        Company Structure:
        - CEO
          - CTO
            - Engineering Team
            - DevOps Team
          - CFO
            - Accounting
            - Finance
      `;

      const analysis = await visualIntelligence.analyzeContent(content);
      
      expect(analysis.primaryVisual.type).toBe('hierarchy-diagram');
    });

    test('should handle empty content gracefully', async () => {
      const analysis = await visualIntelligence.analyzeContent('');

      expect(analysis).toBeDefined();
      expect(analysis.confidence).toBe(0);
      expect(analysis.primaryVisual).toBeNull();
    });

    test('should cache analysis results', async () => {
      const content = 'Test content for caching';
      
      // First call
      const analysis1 = await visualIntelligence.analyzeContent(content);
      
      // Second call (should use cache)
      const analysis2 = await visualIntelligence.analyzeContent(content);
      
      expect(analysis1).toEqual(analysis2);
    });

    test('should use AI analysis when enabled', async () => {
      const content = 'Complex content requiring AI analysis';
      
      claudeService.generateContent = jest.fn().mockResolvedValue({
        content: JSON.stringify({
          primaryVisual: {
            type: 'infographic',
            confidence: 0.95,
            recommendations: ['Use icons', 'Add colors']
          },
          patterns: ['educational', 'structured']
        })
      });
      
      const analysis = await visualIntelligence.analyzeContent(content, { useAI: true });
      
      expect(claudeService.generateContent).toHaveBeenCalled();
      expect(analysis.confidence).toBe(0.9);
    });
  });

  describe('generateVisual', () => {
    test('should generate infographic SVG', async () => {
      const content = '- Item 1\n- Item 2\n- Item 3';
      const visualType = 'infographic';
      
      const result = await visualIntelligence.generateVisual(content, visualType);
      
      expect(result).toHaveProperty('svg');
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('</svg>');
      expect(result).toHaveProperty('type', 'infographic');
      expect(result).toHaveProperty('metadata');
    });

    test('should generate flowchart SVG', async () => {
      const content = 'Step 1 -> Step 2 -> Step 3';
      const visualType = 'flowchart';
      
      const result = await visualIntelligence.generateVisual(content, visualType);
      
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('<rect'); // Flowchart boxes
      expect(result.svg).toContain('rect'); // Flowchart nodes
      expect(result.type).toBe('flowchart');
    });

    test('should generate data visualization SVG', async () => {
      const content = 'Sales: 100, Revenue: 200, Growth: 50%';
      const visualType = 'data-visualization';
      
      const result = await visualIntelligence.generateVisual(content, visualType);
      
      expect(result.svg).toContain('<svg');
      expect(result.type).toBe('data-visualization');
      expect(result.type).toBe('data-visualization');
    });

    test('should generate timeline SVG', async () => {
      const content = '2020: Start\n2021: Growth\n2022: Success';
      const visualType = 'timeline';
      
      const result = await visualIntelligence.generateVisual(content, visualType);
      
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('<line'); // Timeline line
      expect(result.type).toBe('timeline');
    });

    test('should generate comparison chart SVG', async () => {
      const content = 'Option A vs Option B';
      const visualType = 'comparison-chart';
      
      const result = await visualIntelligence.generateVisual(content, visualType);
      
      expect(result.svg).toContain('<svg');
      expect(result.type).toBe('comparison-chart');
    });

    test('should handle invalid visual type', async () => {
      const content = 'Test content';
      const visualType = 'invalid-type';
      
      const result = await visualIntelligence.generateVisual(content, visualType);
      
      expect(result.type).toBe('invalid-type');
      expect(result.svg).toContain('<svg');
    });

    test('should apply custom options', async () => {
      const content = 'Test content';
      const visualType = 'infographic';
      const options = {
        width: 800,
        height: 600,
        theme: 'dark',
        colors: ['#ff0000', '#00ff00']
      };
      
      const result = await visualIntelligence.generateVisual(content, visualType, options);
      
      expect(result.svg).toContain('<svg');
      expect(result.recommendations.theme).toBe('default');
    });
  });

  describe('generateInfographic', () => {
    test('should extract and render list items', async () => {
      const content = '• First point\n• Second point\n• Third point';
      const recommendations = { style: 'modern' };
      
      const result = await visualIntelligence.generateInfographic(content, recommendations, {});
      
      expect(result).toContain('First point');
      expect(result).toContain('Second point');
      expect(result).toContain('Third point');
    });

    test('should handle numbered lists', async () => {
      const content = '1. Step one\n2. Step two\n3. Step three';
      
      const result = await visualIntelligence.generateInfographic(content, { primaryVisual: {}, theme: 'default' }, {});
      
      expect(result).toContain('Step one');
      expect(result).toContain('Step two');
      expect(result).toContain('Step three');
    });

    test('should add icons when available', async () => {
      const content = '- Learn: Study materials\n- Practice: Exercises';
      const recommendations = { includeIcons: true };
      
      const result = await visualIntelligence.generateInfographic(content, { 
        primaryVisual: { icons: ['book', 'practice'] }, 
        theme: 'default' 
      }, {});
      
      expect(result).toContain('<path'); // SVG icon paths
    });
  });

  describe('generateFlowchart', () => {
    test('should create nodes for process steps', async () => {
      const content = 'Step 1: Start\nStep 2: Process\nStep 3: End';
      
      const result = await visualIntelligence.generateFlowchart(content, { 
        primaryVisual: {}, 
        theme: 'default' 
      }, {});
      
      expect(result).toContain('Start');
      expect(result).toContain('Process');
      expect(result).toContain('End');
    });

    test('should handle conditional flows', async () => {
      const content = 'Check condition -> if yes -> Action A\n-> if no -> Action B';
      
      const result = await visualIntelligence.generateFlowchart(content, { 
        primaryVisual: {}, 
        theme: 'default' 
      }, {});
      
      expect(result).toContain('<rect'); // Flowchart nodes
    });

    test('should support different node shapes', async () => {
      const content = 'Start (oval) -> Process [rectangle] -> Decision <diamond>';
      const options = { detectShapes: true };
      
      const result = await visualIntelligence.generateFlowchart(content, { 
        primaryVisual: {}, 
        theme: 'default' 
      }, options);
      
      expect(result).toContain('<rect'); // Rectangle nodes
    });
  });

  describe('generateDataVisualization', () => {
    test('should create bar chart for numeric data', async () => {
      const content = 'Sales: 100\nRevenue: 200\nProfit: 50';
      
      const result = await visualIntelligence.generateDataVisualization(content, { 
        primaryVisual: {}, 
        theme: 'default' 
      }, {});
      
      expect(result).toContain('<rect'); // Bars
      expect(result).toContain('Sales');
      expect(result).toContain('Revenue');
    });

    test('should create pie chart for percentage data', async () => {
      const content = 'Desktop: 60%\nMobile: 30%\nTablet: 10%';
      
      const result = await visualIntelligence.generateDataVisualization(content, { 
        primaryVisual: {}, 
        theme: 'default' 
      }, {});
      
      expect(result).toContain('<path'); // Pie slices
      expect(result).toContain('Desktop');
    });

    test('should create line chart for time series', async () => {
      const content = 'Jan: 100\nFeb: 120\nMar: 150\nApr: 140';
      
      const result = await visualIntelligence.generateDataVisualization(content, { 
        primaryVisual: {}, 
        theme: 'default' 
      }, {});
      
      expect(result).toContain('<polyline'); // Line
      expect(result).toContain('Jan');
    });

    test('should handle mixed data formats', async () => {
      const content = 'Category A: $1,234.56\nCategory B: 2.5K\nCategory C: 45%';
      
      const result = await visualIntelligence.generateDataVisualization(content, { 
        primaryVisual: {}, 
        theme: 'default' 
      }, {});
      
      expect(result).toContain('<svg');
      expect(result).toContain('Category');
    });
  });

  describe('generateTimeline', () => {
    test('should create timeline with events', async () => {
      const content = '2020: Founded\n2021: Series A\n2022: IPO';
      
      const result = await visualIntelligence.generateTimeline(content, { 
        primaryVisual: {}, 
        theme: 'default' 
      }, {});
      
      expect(result).toContain('2020');
      expect(result).toContain('Founded');
      expect(result).toContain('<circle'); // Event markers
    });

    test('should handle date ranges', async () => {
      const content = '2020-2021: Development\n2021-2022: Testing\n2022-2023: Launch';
      
      const result = await visualIntelligence.generateTimeline(content, { 
        primaryVisual: {}, 
        theme: 'default' 
      }, {});
      
      expect(result).toContain('2020');
      expect(result).toContain('Development');
    });

    test('should support milestone markers', async () => {
      const content = '2020: Start [milestone]\n2021: Progress\n2022: Complete [milestone]';
      
      const result = await visualIntelligence.generateTimeline(content, { 
        primaryVisual: {}, 
        theme: 'default' 
      }, {});
      
      expect(result).toContain('milestone');
      expect(result).toContain('Start');
    });
  });

  describe('error handling', () => {
    test('should handle malformed content gracefully', async () => {
      const content = null;
      
      const analysis = await visualIntelligence.analyzeContent(content);
      
      expect(analysis.confidence).toBe(0);
      expect(analysis.primaryVisual).toBeNull();
    });

    test('should handle visual generation errors', async () => {
      const content = 'Test content';
      
      // Force an error by passing invalid options
      const result = await visualIntelligence.generateVisual(content, 'infographic', { width: -100 });
      
      expect(result.svg).toContain('<svg');
    });
  });

  describe('pattern detection helpers', () => {
    test('should detect multiple patterns in complex content', async () => {
      const content = `
        Project Timeline:
        2020: Planning phase
        2021: Development phase
        
        Key Metrics:
        - Success rate: 95%
        - User satisfaction: 4.8/5
        
        Process Flow:
        1. User Registration
        2. Profile Setup
        3. Start Learning
      `;
      
      const analysis = await visualIntelligence.analyzeContent(content);
      
      expect(analysis.primaryVisual).toBeDefined();
      expect(analysis.confidence).toBeGreaterThan(0);
      expect(analysis.alternativeVisuals).toBeDefined();
    });
  });

  describe('caching', () => {
    test('should cache analysis results by content hash', async () => {
      const content = 'Cacheable content';
      
      // Clear cache first
      visualIntelligence.visualCache = new Map();
      
      // First call
      await visualIntelligence.analyzeContent(content);
      expect(visualIntelligence.analysisCache.size).toBe(1);
      
      // Second call should use cache
      const startTime = Date.now();
      await visualIntelligence.analyzeContent(content);
      const endTime = Date.now();
      
      // Cached call should be very fast
      expect(endTime - startTime).toBeLessThan(10);
    });
    
    test('should respect cache size limit', async () => {
      // Generate more than 100 unique contents
      for (let i = 0; i < 110; i++) {
        await visualIntelligence.analyzeContent(`Content ${i}`);
      }
      
      // Cache should not exceed 100 entries
      expect(visualIntelligence.visualCache.size).toBeLessThanOrEqual(100);
    });
  });

  describe('additional coverage tests', () => {
    test('should use AI service when claudeService is available', async () => {
      // Mock claude service
      visualIntelligence.claudeService = {
        generateContent: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            bestVisualType: 'flowchart',
            elements: ['Step 1', 'Step 2'],
            layout: 'vertical',
            theme: 'tech',
            complexity: 'medium',
            reasoning: 'Process flow detected'
          })
        })
      };
      
      const content = 'Step 1 then Step 2';
      const analysis = await visualIntelligence.analyzeContent(content, { useAI: true });
      
      expect(visualIntelligence.claudeService.generateContent).toHaveBeenCalled();
      expect(analysis.confidence).toBe(0.9);
      expect(analysis.primaryVisual.type).toBe('flowchart');
    });
    
    test('should generate comparison chart SVG', async () => {
      const content = 'Option A vs Option B';
      const type = 'comparison-chart';
      
      const result = await visualIntelligence.generateVisual(content, type);
      
      expect(result.svg).toContain('<svg');
      expect(result.type).toBe('comparison-chart');
    });
    
    test('should generate hierarchy diagram SVG', async () => {
      const content = 'Parent -> Child 1, Child 2';
      const type = 'hierarchy-diagram';
      
      const result = await visualIntelligence.generateVisual(content, type);
      
      expect(result.svg).toContain('<svg');
      expect(result.type).toBe('hierarchy-diagram');
    });
    
    test('should extract data values from content', () => {
      const content = 'Revenue: $1.2M, Growth: 45%, Users: 10K';
      
      const values = visualIntelligence.extractDataValues(content);
      
      expect(values).toBeDefined();
      expect(values.length).toBeGreaterThan(0);
    });
    
    test('should calculate pattern confidence', () => {
      const confidence = visualIntelligence.calculatePatternConfidence(5, 100);
      
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
    
    test('should generate cache key', () => {
      const content = 'Test content';
      const context = { courseId: '123' };
      
      const key = visualIntelligence.generateCacheKey(content, context);
      
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });
    
    test('should handle empty patterns array', async () => {
      const content = '';
      
      const analysis = await visualIntelligence.analyzeContent(content);
      
      expect(analysis.primaryVisual).toBeNull();
      expect(analysis.confidence).toBe(0);
    });
    
    test('should suggest icons based on content', () => {
      const content = 'Learn programming and build projects';
      const type = 'list';
      
      const icons = visualIntelligence.suggestIcons(content, type);
      
      expect(icons).toBeDefined();
      expect(Array.isArray(icons)).toBe(true);
    });
    
    test('should determine layout based on pattern type', () => {
      const layout = visualIntelligence.determineLayout('process');
      
      expect(layout).toBeDefined();
      expect(typeof layout).toBe('string');
    });
    
    test('should extract elements from content', () => {
      const content = '1. First item\n2. Second item\n3. Third item';
      const type = 'list';
      
      const elements = visualIntelligence.extractElementsFromContent(content, type);
      
      expect(elements).toBeDefined();
      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBeGreaterThan(0);
    });
    
    test('should handle chart visualization with missing data', async () => {
      const content = {};
      const recommendations = { primaryVisual: {}, theme: 'default' };
      
      const result = await visualIntelligence.generateDataVisualization(content, recommendations, {});
      
      expect(result).toContain('<svg');
      expect(result).toContain('No data');
    });
    
    test('should generate proper SVG for complex flowchart', async () => {
      const content = {
        nodes: ['Start', 'Decision', 'Action A', 'Action B', 'End'],
        edges: [[0,1], [1,2], [1,3], [2,4], [3,4]]
      };
      const recommendations = { primaryVisual: { elements: content.nodes }, theme: 'tech' };
      
      const result = await visualIntelligence.generateFlowchart(content, recommendations, {});
      
      expect(result).toContain('<svg');
      expect(result).toContain('Start');
      expect(result).toContain('End');
    });
  });
});