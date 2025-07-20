# PDF Generator Service Usage Guide

The PDF Generator service provides HTML to PDF conversion functionality for the AI Course Creator, with support for custom styling, table of contents, headers/footers, and Bull queue integration.

## Features

✅ **HTML to PDF Conversion** using Puppeteer  
✅ **Template Support** - works with existing templates (modern, classic, minimal, etc.)  
✅ **Table of Contents** generation from course structure  
✅ **Custom Headers/Footers** with page numbering  
✅ **Bookmarks** from course sessions  
✅ **Bull Queue Integration** for async processing  
✅ **Supabase Storage** upload support  
✅ **Custom Styling** with themes and colors  

## API Usage

### Generate PDF Export

```bash
POST /api/export/pdf
```

**Request Body:**
```json
{
  "courseId": "uuid-of-course",
  "template": "modern",
  "options": {
    "format": "A4",
    "orientation": "portrait",
    "includeTableOfContents": true,
    "includePageNumbers": true,
    "includeHeaderFooter": true,
    "optimize": false,
    "uploadToStorage": false,
    "customizations": {
      "primaryColor": "#007bff",
      "fontFamily": "Inter, sans-serif",
      "logo": "https://example.com/logo.png",
      "headerText": "Course Material",
      "footerText": "Confidential"
    },
    "pdfOptions": {
      "margin": {
        "top": "1in",
        "bottom": "1in",
        "left": "0.75in",
        "right": "0.75in"
      },
      "printBackground": true
    }
  }
}
```

**Response:**
```json
{
  "message": "PDF export started",
  "exportId": "uuid-of-export-job",
  "template": "modern",
  "statusUrl": "/api/export/status/{exportId}",
  "downloadUrl": "/api/export/download/{exportId}"
}
```

### Check Export Status

```bash
GET /api/export/status/{exportId}
```

**Response:**
```json
{
  "exportId": "uuid",
  "status": "completed",
  "progress": 100,
  "message": "PDF export completed",
  "type": "pdf",
  "downloadReady": true,
  "downloadUrl": "/api/export/download/{exportId}",
  "fileSize": 356716,
  "fileName": "course-modern.pdf"
}
```

### Download Generated PDF

```bash
GET /api/export/download/{exportId}
```

Returns the PDF file with appropriate headers for download.

## Direct Service Usage

### Basic PDF Generation

```javascript
const PDFGenerator = require('./src/services/pdfGenerator');

const pdfGenerator = new PDFGenerator();

const result = await pdfGenerator.generatePDF(courseData, 'modern', {
  pdfOptions: {
    format: 'A4',
    printBackground: true
  }
});

console.log('PDF generated:', result.pdfPath);
```

### PDF from HTML

```javascript
const htmlContent = `
  <html>
    <head><title>Test PDF</title></head>
    <body><h1>Hello PDF!</h1></body>
  </html>
`;

const result = await pdfGenerator.generatePDFFromHTML(htmlContent, {
  pdfOptions: { format: 'A4' }
});
```

### Custom Styling

```javascript
const result = await pdfGenerator.generatePDF(courseData, 'modern', {
  customizations: {
    primaryColor: '#ff6b6b',
    fontFamily: 'Georgia, serif'
  },
  pdfOptions: {
    format: 'Letter',
    margin: { top: '1.5in', bottom: '1.5in' }
  }
});
```

## Available Templates

- **modern** - Clean, modern design with responsive layout
- **classic** - Traditional course layout with serif fonts
- **minimal** - Clean, distraction-free reading experience  
- **interactive** - Rich visual elements (optimized for print)
- **mobile-first** - Optimized layout for smaller formats

## PDF Options

### Page Formats
- `A4` (default)
- `Letter` 
- `Legal`

### Margins
```javascript
margin: {
  top: "1in",
  bottom: "1in", 
  left: "0.75in",
  right: "0.75in"
}
```

### Custom Headers/Footers
```javascript
headerTemplate: '<div style="font-size: 10px;">Custom Header</div>',
footerTemplate: '<div style="font-size: 10px;">Page <span class="pageNumber"></span></div>'
```

## Testing

Run the comprehensive test suite:

```bash
node test-pdf-generator.js
```

Test the API endpoints:

```bash
node test-pdf-api.js
```

## Generated PDF Structure

1. **Cover Page** - Course title, description, instructor, generation date
2. **Table of Contents** - Hierarchical session/activity listing with page numbers
3. **Course Content** - Sessions with formatted activities, code examples, quizzes
4. **Page Headers/Footers** - Custom branding and page numbering

## Content Processing

The service handles various content types:

- **Markdown** - Converted to formatted HTML
- **JSON Objects** - Structured content like quizzes, code examples
- **Mixed Content** - Automatic detection and appropriate formatting

### Quiz Content Example
```json
{
  "questions": [
    {
      "question": "What is JavaScript?",
      "type": "multiple-choice", 
      "options": ["A language", "A framework", "A database"]
    }
  ]
}
```

### Code Content Example  
```json
{
  "instructions": "Write a function to greet users",
  "code": "function greet(name) { return `Hello, ${name}!`; }",
  "language": "javascript"
}
```

## Error Handling

All operations include comprehensive error handling:

- **FileProcessingError** - PDF generation failures
- **ValidationError** - Invalid input parameters
- **Browser Launch Issues** - Automatic system Chrome detection
- **Memory Management** - Proper cleanup of browser instances

## Performance Considerations

- **Browser Reuse** - Single browser instance for multiple PDFs
- **Memory Management** - Automatic cleanup after operations
- **Queue Processing** - Background processing with Bull
- **Optimization** - Optional PDF compression (placeholder for future enhancement)

## Requirements

- Node.js 16+
- Puppeteer 24.x
- Chrome/Chromium browser (automatically detected)
- Redis (for Bull queue)
- Supabase (for storage)

The service automatically detects system Chrome installations and falls back to Puppeteer's bundled Chromium if needed.