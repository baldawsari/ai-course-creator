/**
 * Demo script for Visual Intelligence features
 * Run with: node demo-visual-intelligence.js
 */

const VisualIntelligence = require('./src/services/visualIntelligence');
const DesignEngine = require('./src/services/designEngine');
const fs = require('fs').promises;
const path = require('path');

async function runDemo() {
  console.log('🎨 AI Course Creator - Visual Intelligence Demo\n');

  // Initialize services
  const visualIntelligence = new VisualIntelligence();
  const designEngine = new DesignEngine();

  // Create output directory
  const outputDir = path.join(__dirname, 'demo-output');
  await fs.mkdir(outputDir, { recursive: true });

  console.log('1️⃣  Generating Infographic from Learning Objectives...');
  
  // Demo 1: Infographic
  const objectives = [
    'Master JavaScript fundamentals and ES6+ features',
    'Build responsive web applications with React',
    'Implement RESTful APIs with Node.js and Express',
    'Deploy applications to cloud platforms',
    'Apply best practices for code quality and testing'
  ];

  const infographicResult = await visualIntelligence.generateVisual(
    objectives,
    'infographic',
    {
      title: 'Full-Stack Development Learning Path',
      width: 800,
      height: 600,
      context: { theme: 'tech' }
    }
  );

  await fs.writeFile(
    path.join(outputDir, 'infographic.svg'),
    infographicResult.svg
  );
  console.log(`   ✅ Saved: infographic.svg (Quality: ${infographicResult.metadata.quality}%)\n`);

  console.log('2️⃣  Generating Flowchart from Process Steps...');
  
  // Demo 2: Flowchart
  const processSteps = [
    { text: 'User Registration', number: 1 },
    { text: 'Email Verification', number: 2 },
    { text: 'Profile Setup', number: 3 },
    { text: 'Course Selection', number: 4 },
    { text: 'Begin Learning', number: 5 }
  ];

  const flowchartResult = await visualIntelligence.generateVisual(
    processSteps,
    'flowchart',
    {
      title: 'User Onboarding Flow',
      context: { theme: 'business' }
    }
  );

  await fs.writeFile(
    path.join(outputDir, 'flowchart.svg'),
    flowchartResult.svg
  );
  console.log(`   ✅ Saved: flowchart.svg (Quality: ${flowchartResult.metadata.quality}%)\n`);

  console.log('3️⃣  Generating Data Visualization from Metrics...');
  
  // Demo 3: Data Visualization
  const performanceData = [
    { label: 'JavaScript', value: 85 },
    { label: 'React', value: 92 },
    { label: 'Node.js', value: 78 },
    { label: 'Database', value: 70 },
    { label: 'DevOps', value: 65 }
  ];

  const chartResult = await visualIntelligence.generateVisual(
    performanceData,
    'data-visualization',
    {
      title: 'Skill Assessment Results',
      context: { chartType: 'bar' }
    }
  );

  await fs.writeFile(
    path.join(outputDir, 'chart.svg'),
    chartResult.svg
  );
  console.log(`   ✅ Saved: chart.svg (Quality: ${chartResult.metadata.quality}%)\n`);

  console.log('4️⃣  Generating Timeline Visualization...');
  
  // Demo 4: Timeline
  const courseTimeline = [
    { date: 'Week 1', title: 'JavaScript Basics' },
    { date: 'Week 2-3', title: 'Advanced JavaScript' },
    { date: 'Week 4-5', title: 'React Fundamentals' },
    { date: 'Week 6-7', title: 'Node.js & Express' },
    { date: 'Week 8', title: 'Final Project' }
  ];

  const timelineResult = await visualIntelligence.generateVisual(
    courseTimeline,
    'timeline',
    {
      title: 'Course Schedule',
      context: { theme: 'academic' }
    }
  );

  await fs.writeFile(
    path.join(outputDir, 'timeline.svg'),
    timelineResult.svg
  );
  console.log(`   ✅ Saved: timeline.svg (Quality: ${timelineResult.metadata.quality}%)\n`);

  console.log('5️⃣  AI Content Analysis Demo...');
  
  // Demo 5: Content Analysis
  const sampleContent = `
    Our comprehensive course covers the following key areas:
    
    Step 1: Foundation - Learn core programming concepts
    Step 2: Frontend - Master modern JavaScript and React
    Step 3: Backend - Build APIs with Node.js
    Step 4: Database - Work with SQL and NoSQL
    Step 5: Deployment - Launch to production
    
    By the end, you'll have built 5 real projects with a 95% 
    student satisfaction rate and average completion time of 8 weeks.
  `;

  const analysis = await visualIntelligence.analyzeContent(sampleContent);
  console.log('   📊 Content Analysis Results:');
  console.log(`      - Recommended Visual: ${analysis.primaryVisual?.type || 'none'}`);
  console.log(`      - Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);
  console.log(`      - Alternative Visuals: ${analysis.alternativeVisuals.map(v => v.type).join(', ') || 'none'}\n`);

  console.log('6️⃣  Generating Complete Visual Report for Course...');
  
  // Demo 6: Complete Course Visual Report
  const mockCourseData = {
    id: 'demo-course',
    title: 'Full-Stack Web Development Bootcamp',
    total_duration: 480,
    objectives: objectives,
    sessions: [
      {
        id: 'session-1',
        title: 'JavaScript Fundamentals',
        estimated_duration: 120,
        content: 'Learn variables, functions, objects, and ES6 features',
        activities: [
          { type: 'lecture', title: 'Introduction to JavaScript' },
          { type: 'hands-on', title: 'Build a Calculator' },
          { type: 'quiz', title: 'JavaScript Basics Quiz' }
        ]
      },
      {
        id: 'session-2',
        title: 'React Development',
        estimated_duration: 180,
        content: 'Components, state, props, hooks, and routing',
        activities: [
          { type: 'lecture', title: 'React Core Concepts' },
          { type: 'hands-on', title: 'Build a Todo App' },
          { type: 'project', title: 'Create a Portfolio Site' }
        ]
      }
    ]
  };

  const visualReport = await designEngine.generateVisualReport(mockCourseData, {
    theme: 'tech',
    includeSessionVisuals: true
  });

  await fs.writeFile(
    path.join(outputDir, 'visual-report.json'),
    JSON.stringify(visualReport, null, 2)
  );

  // Create HTML gallery
  let galleryHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Intelligence Demo Gallery</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 40px;
      background: #f8fafc;
      color: #1f2937;
    }
    h1 {
      text-align: center;
      color: #3b82f6;
      margin-bottom: 40px;
    }
    .visual-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 30px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .visual-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .visual-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: #1f2937;
    }
    .visual-container {
      width: 100%;
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      overflow: hidden;
    }
    .visual-container svg {
      width: 100%;
      height: auto;
    }
    .stats {
      text-align: center;
      margin: 40px 0;
      padding: 20px;
      background: #eff6ff;
      border-radius: 8px;
    }
    .stats h2 {
      color: #1e40af;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <h1>🎨 Visual Intelligence Demo Gallery</h1>
  
  <div class="stats">
    <h2>Visual Report Summary</h2>
    <p>Total Visuals Generated: ${visualReport.visuals.length}</p>
    <p>Overall Quality Score: ${visualReport.overallQuality}%</p>
    <p>Course: ${mockCourseData.title}</p>
  </div>

  <div class="visual-grid">
`;

  // Add each visual to the gallery
  for (const visual of visualReport.visuals) {
    galleryHtml += `
    <div class="visual-card">
      <h3 class="visual-title">${visual.title}</h3>
      <div class="visual-container">
        ${visual.svg}
      </div>
      <p style="text-align: center; color: #6b7280; margin-top: 12px;">
        Type: ${visual.type} | Quality: ${visual.quality}%
      </p>
    </div>
`;
  }

  galleryHtml += `
  </div>
  
  <div style="text-align: center; margin-top: 60px; color: #6b7280;">
    <p>Generated by AI Course Creator - Visual Intelligence Engine</p>
    <p>View individual SVG files in the demo-output directory</p>
  </div>
</body>
</html>
`;

  await fs.writeFile(
    path.join(outputDir, 'gallery.html'),
    galleryHtml
  );
  
  console.log(`   ✅ Generated visual report with ${visualReport.visuals.length} visuals`);
  console.log(`   ✅ Overall quality score: ${visualReport.overallQuality}%`);
  console.log(`   ✅ Saved: visual-report.json and gallery.html\n`);

  console.log('✨ Demo Complete!');
  console.log(`📁 All outputs saved to: ${outputDir}`);
  console.log('📊 Open gallery.html in your browser to view all generated visuals');
}

// Run the demo
runDemo().catch(error => {
  console.error('❌ Demo failed:', error);
  process.exit(1);
});