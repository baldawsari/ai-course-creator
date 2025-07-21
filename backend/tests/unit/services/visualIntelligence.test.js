const VisualIntelligence = require('../../../src/services/visualIntelligence');

describe('VisualIntelligence Service', () => {
  let visualIntelligence;

  beforeEach(() => {
    visualIntelligence = new VisualIntelligence();
  });

  describe('Content Analysis', () => {
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
      expect(analysis.confidence).toBeGreaterThan(0.6);
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
    });

    test('should handle empty content gracefully', async () => {
      const analysis = await visualIntelligence.analyzeContent('');

      expect(analysis).toBeDefined();
      expect(analysis.confidence).toBe(0);
    });

    test('should cache analysis results', async () => {
      const content = 'Test content for caching';
      
      // First call
      const analysis1 = await visualIntelligence.analyzeContent(content);
      
      // Second call - should be cached
      const analysis2 = await visualIntelligence.analyzeContent(content);

      expect(analysis1).toEqual(analysis2);
      expect(visualIntelligence.visualCache.size).toBe(1);
    });
  });

  describe('Visual Generation', () => {
    test('should generate infographic SVG', async () => {
      const content = [
        'Feature 1: Advanced analytics',
        'Feature 2: Real-time monitoring',
        'Feature 3: Custom dashboards'
      ];

      const result = await visualIntelligence.generateVisual(content, 'infographic', {
        title: 'Key Features',
        width: 800,
        height: 600
      });

      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('viewBox="0 0 800 600"');
      expect(result.svg).toContain('Key Features');
      expect(result.type).toBe('infographic');
      expect(result.metadata.quality).toBeGreaterThan(70);
    });

    test('should generate flowchart SVG', async () => {
      const steps = [
        { text: 'Start' },
        { text: 'Process Data' },
        { text: 'Analyze Results' },
        { text: 'Generate Report' },
        { text: 'End' }
      ];

      const result = await visualIntelligence.generateVisual(steps, 'flowchart');

      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('rect'); // Nodes
      expect(result.svg).toContain('path'); // Connections
      expect(result.svg).toContain('marker'); // Arrowheads
    });

    test('should generate data visualization SVG', async () => {
      const data = [
        { label: 'Q1', value: 100 },
        { label: 'Q2', value: 150 },
        { label: 'Q3', value: 130 },
        { label: 'Q4', value: 180 }
      ];

      const result = await visualIntelligence.generateVisual(
        data,
        'data-visualization',
        { title: 'Quarterly Revenue' }
      );

      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('rect'); // Bar chart elements
      expect(result.svg).toContain('Quarterly Revenue');
    });

    test('should generate timeline SVG', async () => {
      const events = [
        { date: '2020', title: 'Project Start' },
        { date: '2021', title: 'First Release' },
        { date: '2022', title: 'Major Update' }
      ];

      const result = await visualIntelligence.generateVisual(events, 'timeline');

      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('line'); // Timeline line
      expect(result.svg).toContain('circle'); // Event markers
      expect(result.svg).toContain('2020');
      expect(result.svg).toContain('2021');
      expect(result.svg).toContain('2022');
    });

    test('should generate comparison chart SVG', async () => {
      const comparison = [
        {
          name: 'Option A',
          features: ['Feature 1', 'Feature 2', 'Feature 3']
        },
        {
          name: 'Option B',
          features: ['Feature 1', 'Feature 4', 'Feature 5']
        }
      ];

      const result = await visualIntelligence.generateVisual(
        comparison,
        'comparison-chart'
      );

      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('Option A');
      expect(result.svg).toContain('Option B');
    });

    test('should handle invalid visual type', async () => {
      const content = 'Test content';
      
      const result = await visualIntelligence.generateVisual(
        content,
        'invalid-type'
      );

      // Should fallback to generic diagram
      expect(result.svg).toContain('<svg');
      expect(result.type).toBe('invalid-type');
    });

    test('should escape XML special characters', async () => {
      const content = [
        'Item with <special> & "characters"',
        'Another item with \'quotes\''
      ];

      const result = await visualIntelligence.generateVisual(
        content,
        'infographic'
      );

      expect(result.svg).toContain('&lt;special&gt;');
      expect(result.svg).toContain('&amp;');
      expect(result.svg).toContain('&quot;');
    });
  });

  describe('Pattern Detection', () => {
    test('should calculate pattern confidence correctly', () => {
      const patterns = visualIntelligence.detectContentPatterns(
        'Step 1: First\nStep 2: Second\nStep 3: Third'
      );

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].type).toBe('process');
      expect(patterns[0].confidence).toBeGreaterThan(0);
      expect(patterns[0].confidence).toBeLessThanOrEqual(1);
    });

    test('should detect multiple patterns in mixed content', () => {
      const content = `
        Follow these steps:
        1. First step
        2. Second step
        
        Results show 85% improvement
        Revenue increased to $2.5M
      `;

      const patterns = visualIntelligence.detectContentPatterns(content);
      const types = patterns.map(p => p.type);

      expect(types).toContain('process');
      expect(types).toContain('data');
    });
  });

  describe('Icon Selection', () => {
    test('should find appropriate icons for content', () => {
      expect(visualIntelligence.findBestIcon('Learn programming')).toBe('learn');
      expect(visualIntelligence.findBestIcon('Database management')).toBe('database');
      expect(visualIntelligence.findBestIcon('AI and machine learning')).toBe('ai');
      expect(visualIntelligence.findBestIcon('Growth metrics')).toBe('growth');
      expect(visualIntelligence.findBestIcon('Random text')).toBe('star'); // Default
    });

    test('should suggest relevant icons based on content type', () => {
      const icons = visualIntelligence.suggestIcons('Data analytics dashboard', 'data');
      
      expect(icons).toContain('chart');
      expect(icons).toContain('analytics');
      expect(icons).toContain('metrics');
    });
  });

  describe('Color Palettes', () => {
    test('should have all required color palettes', () => {
      const palettes = visualIntelligence.colorPalettes;
      
      expect(palettes).toHaveProperty('tech');
      expect(palettes).toHaveProperty('business');
      expect(palettes).toHaveProperty('creative');
      expect(palettes).toHaveProperty('academic');
      expect(palettes).toHaveProperty('default');
    });

    test('should have complete color scheme for each palette', () => {
      Object.values(visualIntelligence.colorPalettes).forEach(palette => {
        expect(palette).toHaveProperty('primary');
        expect(palette).toHaveProperty('secondary');
        expect(palette).toHaveProperty('accent');
        expect(palette).toHaveProperty('gradient');
        expect(palette).toHaveProperty('text');
        expect(palette).toHaveProperty('background');
      });
    });
  });

  describe('Text Processing', () => {
    test('should wrap text correctly', () => {
      const text = 'This is a very long text that needs to be wrapped';
      const lines = visualIntelligence.wrapText(text, 20);

      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(20);
      });
    });

    test('should extract list elements from various formats', () => {
      const bulletList = `
        • Item 1
        • Item 2
        - Item 3
        * Item 4
      `;

      const elements = visualIntelligence.extractListElements(bulletList);
      expect(elements.length).toBe(4);
    });

    test('should extract numbered list elements', () => {
      const numberedList = `
        1. First item
        2. Second item
        3. Third item
      `;

      const elements = visualIntelligence.extractListElements(numberedList);
      expect(elements.length).toBe(3);
      expect(elements[0]).toBe('First item');
    });
  });

  describe('Quality Assessment', () => {
    test('should assess visual quality based on features', () => {
      const simpleeSvg = '<svg><rect /></svg>';
      const quality1 = visualIntelligence.assessVisualQuality(simpleeSvg, 'chart');
      
      const richSvg = `
        <svg viewBox="0 0 800 600">
          <defs>
            <linearGradient id="grad">
              <stop offset="0%" />
            </linearGradient>
            <filter id="shadow" />
          </defs>
          <rect fill="url(#grad)" />
          <text text-anchor="middle">Test</text>
          <animate />
        </svg>
      `;
      const quality2 = visualIntelligence.assessVisualQuality(richSvg, 'chart');

      expect(quality2).toBeGreaterThan(quality1);
      expect(quality2).toBeGreaterThan(85);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing Claude service gracefully', async () => {
      // VisualIntelligence already handles missing Claude service
      const vi = new VisualIntelligence();
      vi.claudeService = null;

      const analysis = await vi.analyzeContent('Test content');
      expect(analysis).toBeDefined();
      // Should still work with pattern-based analysis
    });

    test('should handle visual generation errors', async () => {
      // Force an error by passing invalid data
      await expect(
        visualIntelligence.generateVisual(null, null)
      ).rejects.toThrow();
    });
  });
});

describe('VisualIntelligence Integration', () => {
  test('should generate complete visual report for course data', async () => {
    const vi = new VisualIntelligence();
    const courseData = {
      title: 'AI Fundamentals',
      objectives: [
        'Understand AI concepts',
        'Learn machine learning',
        'Build neural networks'
      ],
      sessions: [
        {
          title: 'Introduction to AI',
          content: 'Step 1: Learn basics\nStep 2: Practice\nStep 3: Build projects',
          activities: [
            { type: 'lecture', title: 'Overview' },
            { type: 'quiz', title: 'Knowledge Check' }
          ]
        }
      ]
    };

    // Test objectives visual
    const objectivesVisual = await vi.generateVisual(
      courseData.objectives,
      'infographic',
      { title: 'Learning Objectives' }
    );
    
    expect(objectivesVisual.svg).toContain('Learning Objectives');
    expect(objectivesVisual.metadata.quality).toBeGreaterThan(70);

    // Test session content analysis
    const sessionAnalysis = await vi.analyzeContent(
      courseData.sessions[0].content
    );
    
    expect(sessionAnalysis.primaryVisual.type).toBe('flowchart');
  });
});