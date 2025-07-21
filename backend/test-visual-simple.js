/**
 * Simple test for Visual Intelligence
 */

const VisualIntelligence = require('./src/services/visualIntelligence');

async function test() {
  const vi = new VisualIntelligence();
  
  console.log('Testing simple infographic generation...\n');
  
  // Simple list data
  const data = [
    'Learn JavaScript',
    'Master React',
    'Build APIs'
  ];
  
  const result = await vi.generateVisual(data, 'infographic', {
    title: 'Learning Path',
    width: 400,
    height: 300
  });
  
  console.log('Generated SVG (first 500 chars):');
  console.log(result.svg.substring(0, 500) + '...\n');
  
  console.log('Metadata:');
  console.log(result.metadata);
  
  // Save to file
  require('fs').writeFileSync('test-infographic.svg', result.svg);
  console.log('\nSaved to test-infographic.svg');
}

test().catch(console.error);