const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const { supabaseAdmin } = require('../config/database');
const JinaClient = require('./jinaClient');
// const { DocumentProcessor } = require('./documentProcessor');

// Initialize Jina client
const jinaClient = new JinaClient(process.env.JINA_API_KEY);

// Initialize document processor lazily
let documentProcessor;

class FileProcessor {
  constructor() {
    this.supportedTypes = {
      'application/pdf': this.processPDF.bind(this),
      'application/msword': this.processWord.bind(this),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': this.processWord.bind(this),
      'text/plain': this.processText.bind(this),
      'text/html': this.processURL.bind(this),
    };
  }

  /**
   * Get document processor instance (lazy loading)
   */
  getDocumentProcessor() {
    if (!documentProcessor) {
      try {
        const { DocumentProcessor } = require('./documentProcessor');
        documentProcessor = new DocumentProcessor();
      } catch (error) {
        console.warn('DocumentProcessor not available:', error.message);
        return null;
      }
    }
    return documentProcessor;
  }

  /**
   * Main file processing function
   * @param {Object} options - Processing options
   * @param {string} options.fileId - Database file ID
   * @param {string} options.filePath - Local file path
   * @param {string} options.fileName - Original filename
   * @param {string} options.fileType - MIME type
   * @param {string} options.userId - User ID
   * @param {string} options.courseId - Course ID
   * @param {Function} options.onProgress - Progress callback
   */
  async processFile(options) {
    const { fileId, filePath, fileName, fileType, userId, courseId, onProgress } = options;
    
    try {
      // Update status to processing
      await this.updateFileStatus(fileId, 'processing');
      onProgress && onProgress(5);

      // Check if file exists
      try {
        await fsPromises.access(filePath);
      } catch (error) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Get file stats
      const stats = await fsPromises.stat(filePath);
      const fileSize = stats.size;

      onProgress && onProgress(10);

      // Process based on file type
      const processor = this.supportedTypes[fileType];
      if (!processor) {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      const extractedContent = await processor(filePath, fileName, onProgress);
      onProgress && onProgress(60);

      // Upload to Supabase Storage
      const storagePath = await this.uploadToStorage(filePath, fileName, courseId);
      onProgress && onProgress(70);

      // Clean and validate content
      const cleanedContent = this.cleanExtractedContent(extractedContent.text);
      if (!cleanedContent || cleanedContent.length < 10) {
        throw new Error('No meaningful content extracted from file');
      }

      // Process document with advanced pipeline (if available)
      const docProcessor = this.getDocumentProcessor();
      let processingResult = null;
      
      if (docProcessor) {
        try {
          processingResult = await docProcessor.processDocument({
            id: fileId,
            content: cleanedContent,
            type: fileType,
            title: fileName,
            metadata: extractedContent.metadata || {}
          }, {
            chunkingStrategy: 'semantic' // Use semantic chunking by default
          });
        } catch (error) {
          console.warn('Advanced document processing failed, using fallback:', error.message);
        }
      }

      onProgress && onProgress(80);

      // Update database with extracted content, storage path, and quality metrics
      const updateData = {
        extracted_content: cleanedContent,
        storage_path: storagePath,
        status: 'processed',
        updated_at: new Date().toISOString(),
      };

      if (processingResult) {
        updateData.quality_score = processingResult.qualityReport.overallScore;
        updateData.quality_report = processingResult.qualityReport;
        updateData.processing_metadata = {
          chunks: processingResult.chunks.length,
          language: processingResult.metadata.language,
          readabilityLevel: processingResult.qualityReport.readability.level,
          processingTime: processingResult.metadata.processingTime
        };
      }

      await supabaseAdmin
        .from('course_resources')
        .update(updateData)
        .eq('id', fileId);

      onProgress && onProgress(90);

      // Generate embeddings
      if (processingResult && processingResult.chunks) {
        // Store chunks for embeddings generation
        this.chunksCache = this.chunksCache || {};
        this.chunksCache[fileId] = processingResult.chunks;
        
        // Generate embeddings for the chunks
        await this.generateEmbeddingsForChunks(fileId, processingResult.chunks, onProgress);
      } else {
        // Fallback to legacy embedding generation
        await this.generateEmbeddings(fileId, cleanedContent, onProgress);
      }
      onProgress && onProgress(95);

      // Clean up temporary file
      try {
        await fsPromises.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError);
      }

      onProgress && onProgress(100);

      return {
        fileId,
        fileName,
        contentLength: cleanedContent.length,
        wordCount: cleanedContent.split(/\s+/).length,
        storagePath,
        metadata: extractedContent.metadata || {},
        status: 'processed',
      };

    } catch (error) {
      console.error('File processing error:', error);
      
      // Update status to failed
      await this.updateFileStatus(fileId, 'failed');
      
      // Clean up temporary file
      try {
        await fsPromises.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError);
      }

      throw error;
    }
  }

  /**
   * Process URL content
   * @param {Object} options - Processing options
   */
  async processUrl(options) {
    const { resourceId, url, title, userId, courseId, onProgress } = options;
    
    try {
      // Update status to processing
      await this.updateFileStatus(resourceId, 'processing');
      onProgress && onProgress(5);

      // Process the URL
      const extractedContent = await this.processURL(url, title || 'Web Content', onProgress);
      onProgress && onProgress(60);

      // Clean and validate content
      const cleanedContent = this.cleanExtractedContent(extractedContent.text);
      if (!cleanedContent || cleanedContent.length < 10) {
        throw new Error('No meaningful content extracted from URL');
      }

      // Process document with advanced pipeline (if available)
      const docProcessor = this.getDocumentProcessor();
      let processingResult = null;
      
      if (docProcessor) {
        try {
          processingResult = await docProcessor.processDocument({
            id: resourceId,
            content: cleanedContent,
            type: 'text/html',
            title: title || extractedContent.metadata?.title || 'Web Content',
            metadata: extractedContent.metadata || {}
          }, {
            chunkingStrategy: 'semantic'
          });
        } catch (error) {
          console.warn('Advanced document processing failed, using fallback:', error.message);
        }
      }

      // Save content to Supabase Storage as text file
      const storagePath = await this.saveContentToStorage(cleanedContent, `${title || 'web-content'}.txt`, courseId);
      onProgress && onProgress(70);

      // Update database with extracted content and quality metrics
      const updateData = {
        extracted_content: cleanedContent,
        storage_path: storagePath,
        status: 'processed',
        updated_at: new Date().toISOString(),
      };

      if (processingResult) {
        updateData.quality_score = processingResult.qualityReport.overallScore;
        updateData.quality_report = processingResult.qualityReport;
        updateData.processing_metadata = {
          chunks: processingResult.chunks.length,
          language: processingResult.metadata.language,
          readabilityLevel: processingResult.qualityReport.readability.level,
          processingTime: processingResult.metadata.processingTime
        };
      }

      await supabaseAdmin
        .from('course_resources')
        .update(updateData)
        .eq('id', resourceId);

      onProgress && onProgress(80);

      // Generate embeddings
      if (processingResult && processingResult.chunks) {
        // Store chunks for embeddings generation
        this.chunksCache = this.chunksCache || {};
        this.chunksCache[resourceId] = processingResult.chunks;
        
        // Generate embeddings for the chunks
        await this.generateEmbeddingsForChunks(resourceId, processingResult.chunks, onProgress);
      } else {
        // Fallback to legacy embedding generation
        await this.generateEmbeddings(resourceId, cleanedContent, onProgress);
      }
      onProgress && onProgress(95);

      onProgress && onProgress(100);

      return {
        resourceId,
        url,
        title,
        contentLength: cleanedContent.length,
        wordCount: cleanedContent.split(/\s+/).length,
        storagePath,
        metadata: extractedContent.metadata || {},
        status: 'processed',
      };

    } catch (error) {
      console.error('URL processing error:', error);
      
      // Update status to failed
      await this.updateFileStatus(resourceId, 'failed');
      
      throw error;
    }
  }

  /**
   * Process PDF files using pdf-parse
   * @param {string} filePath - Path to PDF file
   * @param {string} fileName - Original filename
   * @param {Function} onProgress - Progress callback
   */
  async processPDF(filePath, fileName, onProgress) {
    try {
      onProgress && onProgress(20);
      
      // Read the PDF file
      const dataBuffer = await fsPromises.readFile(filePath);
      onProgress && onProgress(30);

      // Parse PDF with options
      const options = {
        // Normalize whitespace
        normalizeWhitespace: true,
        // Don't render the page as image
        renderPage: null,
        // Maximum length of content to extract
        max: 0, // 0 means no limit
      };

      const pdfData = await pdfParse(dataBuffer, options);
      onProgress && onProgress(50);

      // Extract metadata
      const metadata = {
        title: pdfData.info?.Title || fileName,
        author: pdfData.info?.Author || null,
        subject: pdfData.info?.Subject || null,
        creator: pdfData.info?.Creator || null,
        producer: pdfData.info?.Producer || null,
        creationDate: pdfData.info?.CreationDate || null,
        modDate: pdfData.info?.ModDate || null,
        pages: pdfData.numpages || 0,
        version: pdfData.version || null,
      };

      // Validate extracted text
      if (!pdfData.text || pdfData.text.trim().length === 0) {
        throw new Error('No text content found in PDF. The file might be scanned images or corrupted.');
      }

      return {
        text: pdfData.text,
        metadata: metadata,
        pages: pdfData.numpages,
      };

    } catch (error) {
      if (error.message.includes('Invalid PDF')) {
        throw new Error('Invalid or corrupted PDF file');
      } else if (error.message.includes('Password')) {
        throw new Error('PDF is password protected');
      } else if (error.message.includes('No text content')) {
        throw error;
      } else {
        throw new Error(`PDF processing failed: ${error.message}`);
      }
    }
  }

  /**
   * Process Word documents using mammoth
   * @param {string} filePath - Path to Word file
   * @param {string} fileName - Original filename
   * @param {Function} onProgress - Progress callback
   */
  async processWord(filePath, fileName, onProgress) {
    try {
      onProgress && onProgress(20);
      
      // Check if it's a .doc or .docx file
      const extension = path.extname(fileName).toLowerCase();
      
      if (extension === '.doc') {
        // For .doc files, we'll extract what we can but with limitations
        console.warn('.doc files have limited support. Consider converting to .docx for better results.');
      }

      // Mammoth options for better text extraction
      const options = {
        styleMap: [
          // Preserve heading styles
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh",
          // Preserve list items
          "p[style-name='List Paragraph'] => li:fresh",
          // Bold and italic
          "b => strong",
          "i => em",
        ],
        convertImage: mammoth.images.imgElement(function(image) {
          // Handle images - for now we'll just note their presence
          return image.read("base64").then(function(imageBuffer) {
            return {
              src: "data:" + image.contentType + ";base64," + imageBuffer
            };
          });
        }),
      };

      // Extract text and HTML
      const result = /** @type {any} */ (await mammoth.extractRawText({ path: filePath }, options));
      onProgress && onProgress(40);

      // Also extract HTML for structure preservation
      const htmlResult = /** @type {any} */ (await mammoth.convertToHtml({ path: filePath }, options));
      onProgress && onProgress(50);

      // Validate extracted text
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('No text content found in Word document. The file might be empty or corrupted.');
      }

      // Log any warnings from mammoth
      if (result.messages && result.messages.length > 0) {
        console.warn('Word processing warnings:', result.messages);
      }

      // Extract metadata
      const stats = await fsPromises.stat(filePath);
      const metadata = {
        title: fileName,
        fileSize: stats.size,
        extractedAt: new Date().toISOString(),
        warnings: result.messages || [],
        hasImages: htmlResult.value.includes('<img') || htmlResult.value.includes('data:image'),
        wordCount: result.value.split(/\s+/).filter(word => word.length > 0).length,
      };

      return {
        text: result.value,
        html: htmlResult.value,
        metadata: metadata,
      };

    } catch (error) {
      if (error.message.includes('not a valid zip file')) {
        throw new Error('Invalid Word document format. File may be corrupted.');
      } else if (error.message.includes('No text content')) {
        throw error;
      } else {
        throw new Error(`Word document processing failed: ${error.message}`);
      }
    }
  }

  /**
   * Process text files
   * @param {string} filePath - Path to text file
   * @param {string} fileName - Original filename
   * @param {Function} onProgress - Progress callback
   */
  async processText(filePath, fileName, onProgress) {
    try {
      onProgress && onProgress(20);
      
      // Read the text file with proper encoding detection
      let content;
      try {
        // Try UTF-8 first
        content = await fsPromises.readFile(filePath, 'utf8');
      } catch (error) {
        // If UTF-8 fails, try with latin1 and then convert
        console.warn('UTF-8 reading failed, trying latin1:', error.message);
        const buffer = await fsPromises.readFile(filePath);
        content = buffer.toString('latin1');
      }

      onProgress && onProgress(40);

      // Validate content
      if (!content || content.trim().length === 0) {
        throw new Error('Text file is empty or contains no readable content');
      }

      // Basic content cleaning for text files
      const cleanedContent = content
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\r/g, '\n')   // Handle old Mac line endings
        .replace(/\n{3,}/g, '\n\n') // Reduce excessive blank lines
        .trim();

      const stats = await fsPromises.stat(filePath);
      const metadata = {
        title: fileName,
        fileSize: stats.size,
        encoding: 'utf8',
        lineCount: cleanedContent.split('\n').length,
        wordCount: cleanedContent.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: cleanedContent.length,
      };

      onProgress && onProgress(50);

      return {
        text: cleanedContent,
        metadata: metadata,
      };

    } catch (error) {
      throw new Error(`Text file processing failed: ${error.message}`);
    }
  }

  /**
   * Process URL content using Puppeteer
   * @param {string} url - URL to scrape
   * @param {string} title - Page title
   * @param {Function} onProgress - Progress callback
   */
  async processURL(url, title, onProgress) {
    let browser;
    
    try {
      onProgress && onProgress(20);
      
      // Launch browser with optimized settings
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
        timeout: 30000,
      });

      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      onProgress && onProgress(30);

      // Set timeouts and navigation options
      await page.setDefaultNavigationTimeout(30000);
      await page.setDefaultTimeout(10000);

      // Navigate to the URL with retry logic
      let retries = 3;
      while (retries > 0) {
        try {
          await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
          });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            throw new Error(`Failed to load URL after 3 attempts: ${error.message}`);
          }
          console.warn(`Retry ${4 - retries} failed for ${url}:`, error.message);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      onProgress && onProgress(45);

      // Wait for content to load
      try {
        await page.waitForSelector('body', { timeout: 10000 });
      } catch (error) {
        console.warn('Body selector timeout, continuing anyway');
      }

      // Extract page information
      const pageData = await page.evaluate(() => {
        // Remove scripts, styles, and other non-content elements
        const elementsToRemove = ['script', 'style', 'nav', 'header', 'footer', 'aside', '.ad', '.advertisement', '.popup'];
        elementsToRemove.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el.remove());
        });

        // Get page title
        const pageTitle = document.title || 'Untitled Page';
        
        // Get meta description
        const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
        
        // Get main content
        let content = '';
        
        // Try to find main content area
        const mainSelectors = ['main', 'article', '[role="main"]', '.content', '.main-content', '#content', '#main'];
        let mainContent = null;
        
        for (const selector of mainSelectors) {
          mainContent = document.querySelector(selector);
          if (mainContent) break;
        }
        
        // If no main content found, use body
        if (!mainContent) {
          mainContent = document.body;
        }
        
        // Extract text content
        content = mainContent.innerText || mainContent.textContent || '';
        
        // Clean up the content
        content = content
          .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
          .replace(/\n\s*\n/g, '\n') // Remove empty lines
          .trim();

        // Get headings for structure
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
          level: parseInt(h.tagName.charAt(1)),
          text: h.textContent.trim(),
        }));

        return {
          title: pageTitle,
          description: metaDescription,
          content: content,
          headings: headings,
          url: window.location.href,
        };
      });

      onProgress && onProgress(55);

      // Validate extracted content
      if (!pageData.content || pageData.content.trim().length < 10) {
        throw new Error('No meaningful content extracted from URL. The page might be empty or require JavaScript.');
      }

      // Get page screenshot for reference (optional)
      let screenshot = null;
      try {
        screenshot = await page.screenshot({ 
          type: 'png',
          fullPage: false,
          clip: { x: 0, y: 0, width: 1280, height: 720 }
        });
      } catch (screenshotError) {
        console.warn('Screenshot capture failed:', screenshotError);
      }

      const metadata = {
        title: pageData.title,
        description: pageData.description,
        url: pageData.url,
        extractedAt: new Date().toISOString(),
        headings: pageData.headings,
        wordCount: pageData.content.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: pageData.content.length,
        hasScreenshot: !!screenshot,
      };

      onProgress && onProgress(60);

      return {
        text: pageData.content,
        metadata: metadata,
        screenshot: screenshot,
      };

    } catch (error) {
      if (error.message.includes('net::ERR_')) {
        throw new Error(`Network error accessing URL: ${error.message}`);
      } else if (error.message.includes('timeout')) {
        throw new Error('URL processing timed out. The website may be slow or unresponsive.');
      } else {
        throw new Error(`URL processing failed: ${error.message}`);
      }
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.warn('Browser close error:', closeError);
        }
      }
    }
  }

  /**
   * Upload file to Supabase Storage
   * @param {string} filePath - Local file path
   * @param {string} fileName - Original filename
   * @param {string} courseId - Course ID for organization
   */
  async uploadToStorage(filePath, fileName, courseId) {
    try {
      const fileBuffer = await fsPromises.readFile(filePath);
      const fileExt = path.extname(fileName);
      const cleanFileName = path.basename(fileName, fileExt).replace(/[^a-zA-Z0-9-_]/g, '_');
      const storageFileName = `${cleanFileName}_${Date.now()}${fileExt}`;
      const storagePath = courseId ? `courses/${courseId}/${storageFileName}` : `uploads/${storageFileName}`;

      const { data, error } = await supabaseAdmin.storage
        .from('course-files')
        .upload(storagePath, fileBuffer, {
          contentType: this.getMimeType(fileName),
          upsert: false,
        });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      return storagePath;

    } catch (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Failed to upload file to storage: ${error.message}`);
    }
  }

  /**
   * Save content as text file to Supabase Storage
   * @param {string} content - Text content to save
   * @param {string} fileName - Filename
   * @param {string} courseId - Course ID for organization
   */
  async saveContentToStorage(content, fileName, courseId) {
    try {
      const cleanFileName = fileName.replace(/[^a-zA-Z0-9-_.]/g, '_');
      const storageFileName = `${path.basename(cleanFileName, '.txt')}_${Date.now()}.txt`;
      const storagePath = courseId ? `courses/${courseId}/${storageFileName}` : `uploads/${storageFileName}`;

      const { data, error } = await supabaseAdmin.storage
        .from('course-files')
        .upload(storagePath, content, {
          contentType: 'text/plain',
          upsert: false,
        });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      return storagePath;

    } catch (error) {
      console.error('Content storage error:', error);
      throw new Error(`Failed to save content to storage: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for chunks using Jina AI
   * @param {string} resourceId - Resource ID
   * @param {Array} chunks - Processed chunks from DocumentProcessor
   * @param {Function} onProgress - Progress callback
   */
  async generateEmbeddingsForChunks(resourceId, chunks, onProgress) {
    try {
      onProgress && onProgress(85);

      const embeddings = [];
      
      // Process chunks in batches
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        try {
          // Get embeddings from Jina AI
          const response = await jinaClient.embeddings(batch.map(chunk => chunk.content), {
            model: 'jina-embeddings-v3',
            task: 'retrieval.passage',
            dimensions: 1024,
          });

          // Store embeddings in database
          for (let j = 0; j < batch.length; j++) {
            const chunk = batch[j];
            const embedding = response.data[j]?.embedding;
            
            if (embedding) {
              await supabaseAdmin
                .from('content_embeddings')
                .insert({
                  resource_id: resourceId,
                  chunk_index: chunk.index,
                  chunk_text: chunk.content,
                  embedding: embedding,
                  metadata: {
                    ...chunk.metadata,
                    tokens: chunk.tokens,
                    strategy: chunk.strategy,
                    position: {
                      start: chunk.metadata.position.start,
                      end: chunk.metadata.position.end
                    }
                  },
                  created_at: new Date().toISOString(),
                });
              
              embeddings.push({
                chunkIndex: chunk.index,
                text: chunk.content,
                embedding: embedding,
              });
            }
          }
        } catch (batchError) {
          console.error(`Embedding batch ${i}-${i + batch.length} failed:`, batchError);
          // Continue with next batch even if one fails
        }
      }

      console.log(`Generated ${embeddings.length} embeddings for resource ${resourceId}`);
      return embeddings;

    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for content using Jina AI (legacy method)
   * @param {string} resourceId - Resource ID
   * @param {string} content - Text content
   * @param {Function} onProgress - Progress callback
   */
  async generateEmbeddings(resourceId, content, onProgress) {
    try {
      // Split content into chunks for embedding
      const chunks = this.chunkContent(content);
      onProgress && onProgress(85);

      const embeddings = [];
      
      // Process chunks in batches
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        try {
          // Get embeddings from Jina AI
          const response = await jinaClient.embeddings(batch.map(chunk => chunk.text), {
            model: 'jina-embeddings-v3',
            task: 'retrieval.passage',
            dimensions: 1024,
          });

          // Store embeddings in database
          for (let j = 0; j < batch.length; j++) {
            const chunkIndex = i + j;
            const embedding = response.data[j]?.embedding;
            
            if (embedding) {
              await supabaseAdmin
                .from('content_embeddings')
                .insert({
                  resource_id: resourceId,
                  chunk_index: chunkIndex,
                  chunk_text: batch[j].text,
                  metadata: {
                    startIndex: batch[j].startIndex,
                    endIndex: batch[j].endIndex,
                    wordCount: batch[j].wordCount,
                  },
                  // Note: Supabase doesn't support vector columns in this schema
                  // You might need to store embeddings separately or use a vector database
                });
            }
          }

        } catch (embeddingError) {
          console.warn(`Embedding batch ${i / batchSize + 1} failed:`, embeddingError);
          // Continue with next batch rather than failing completely
        }
      }

      onProgress && onProgress(90);

    } catch (error) {
      console.warn('Embedding generation failed:', error);
      // Don't throw error here - embeddings are nice to have but not critical
    }
  }

  /**
   * Chunk content for embedding generation
   * @param {string} content - Text content to chunk
   * @param {number} maxChunkSize - Maximum chunk size in characters
   */
  chunkContent(content, maxChunkSize = 1000) {
    const chunks = [];
    const sentences = content.split(/[.!?]+/);
    
    let currentChunk = '';
    let startIndex = 0;
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;
      
      if (potentialChunk.length > maxChunkSize && currentChunk) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          startIndex: startIndex,
          endIndex: startIndex + currentChunk.length,
          wordCount: currentChunk.split(/\s+/).length,
        });
        
        // Start new chunk
        startIndex = startIndex + currentChunk.length;
        currentChunk = trimmedSentence;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        startIndex: startIndex,
        endIndex: startIndex + currentChunk.length,
        wordCount: currentChunk.split(/\s+/).length,
      });
    }
    
    return chunks;
  }

  /**
   * Clean extracted content
   * @param {string} content - Raw extracted content
   */
  cleanExtractedContent(content) {
    if (!content) return '';
    
    return content
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce excessive line breaks
      .replace(/[^\S\n]+/g, ' ') // Replace non-newline whitespace with single space
      .trim();
  }

  /**
   * Update file status in database
   * @param {string} fileId - File ID
   * @param {string} status - New status
   */
  async updateFileStatus(fileId, status) {
    try {
      await supabaseAdmin
        .from('course_resources')
        .update({ 
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId);
    } catch (error) {
      console.error('Status update failed:', error);
    }
  }

  /**
   * Get MIME type from filename
   * @param {string} fileName - Filename
   */
  getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Validate file before processing
   * @param {string} filePath - File path to validate
   * @param {string} fileType - Expected MIME type
   */
  async validateFile(filePath, fileType) {
    try {
      const stats = await fsPromises.stat(filePath);
      
      // Check file size (max 50MB)
      if (stats.size > 50 * 1024 * 1024) {
        throw new Error('File size exceeds 50MB limit');
      }
      
      // Check if file is readable
      await fsPromises.access(filePath, fs.constants.R_OK);
      
      return true;
    } catch (error) {
      throw new Error(`File validation failed: ${error.message}`);
    }
  }
}

// Export singleton instance
const fileProcessor = new FileProcessor();
module.exports = { fileProcessor, FileProcessor };