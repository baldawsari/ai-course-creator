const Bull = require('bull');
const natural = require('natural');
const langdetect = require('langdetect');
const readability = require('readability-scores');
const crypto = require('crypto');
const { encode } = require('gpt-3-encoder');
const winston = require('winston');
const { performance } = require('perf_hooks');
const { supabaseAdmin } = require('../config/database');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize Bull queue
const documentQueue = new Bull('document-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    connectTimeout: 5000,
    maxRetriesPerRequest: 1
  }
});

// Configure queue events
documentQueue.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

documentQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

class DocumentProcessor {
  constructor() {
    this.tokenizer = new natural.SentenceTokenizer();
    this.tfidf = new natural.TfIdf();
    this.supportedEncodings = ['utf8', 'utf16le', 'latin1', 'base64', 'ascii'];
    this.maxChunkSize = 1000; // tokens
    this.minChunkSize = 100; // tokens
    this.overlapSize = 50; // tokens
  }

  /**
   * Main processing pipeline entry point
   */
  async processDocument(document, options = {}) {
    const startTime = performance.now();
    const processingId = crypto.randomUUID();
    
    logger.info(`Starting document processing: ${processingId}`, {
      documentId: document.id,
      type: document.type,
      size: document.content?.length
    });

    try {
      // Step 1: Document ingestion and validation
      const validatedDoc = await this.ingestDocument(document);
      
      // Step 2: Text preprocessing
      const preprocessedDoc = await this.preprocessText(validatedDoc);
      
      // Step 3: Content chunking
      const chunks = await this.chunkContent(preprocessedDoc, options.chunkingStrategy || 'semantic');
      
      // Step 4: Quality assessment
      const qualityReport = await this.assessQuality(preprocessedDoc, chunks);
      
      // Step 5: Store results
      const result = await this.storeProcessingResults({
        documentId: document.id,
        processingId,
        preprocessedContent: preprocessedDoc,
        chunks,
        qualityReport,
        metadata: {
          processingTime: performance.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });

      logger.info(`Document processing completed: ${processingId}`, {
        duration: performance.now() - startTime,
        chunksCreated: chunks.length,
        qualityScore: qualityReport.overallScore
      });

      return result;
    } catch (error) {
      logger.error(`Document processing failed: ${processingId}`, error);
      throw error;
    }
  }

  /**
   * Document ingestion workflow
   */
  async ingestDocument(document) {
    logger.debug('Starting document ingestion', { documentId: document.id });

    // Validate document structure
    if (!document.content || typeof document.content !== 'string') {
      throw new Error('Invalid document content');
    }

    // Sanitize content
    let sanitizedContent = this.sanitizeContent(document.content);

    // Extract metadata
    const metadata = await this.extractMetadata(document, sanitizedContent);

    // Analyze content structure
    const structure = this.analyzeContentStructure(sanitizedContent);

    return {
      ...document,
      content: sanitizedContent,
      metadata,
      structure,
      originalLength: document.content.length,
      sanitizedLength: sanitizedContent.length
    };
  }

  /**
   * Sanitize content for processing
   */
  sanitizeContent(content) {
    // Remove null bytes
    let sanitized = content.replace(/\0/g, '');
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    // Remove control characters (except newlines and tabs)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Handle special quotes and dashes
    sanitized = sanitized
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D"]/g, "'")  // Replace smart quotes and regular quotes with single quotes
      .replace(/[\u2013\u2014—]/g, '-');  // Replace em dashes and en dashes with regular dashes
    
    return sanitized;
  }

  /**
   * Extract metadata from document
   */
  async extractMetadata(document, content) {
    const metadata = {
      title: document.title || this.extractTitle(content),
      language: this.detectLanguage(content),
      wordCount: content.split(/\s+/).length,
      characterCount: content.length,
      estimatedReadingTime: Math.ceil(content.split(/\s+/).length / 200), // minutes
      extractedAt: new Date().toISOString()
    };

    // Extract key phrases
    const keyPhrases = this.extractKeyPhrases(content);
    if (keyPhrases.length > 0) {
      metadata.keyPhrases = keyPhrases;
    }

    return metadata;
  }

  /**
   * Extract title from content
   */
  extractTitle(content) {
    // Try to find a title-like pattern at the beginning
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length < 100 && firstLine.length > 5) {
        return firstLine;
      }
    }
    return 'Untitled Document';
  }

  /**
   * Detect language using langdetect
   */
  detectLanguage(content) {
    try {
      const sampleText = content.substring(0, 1000);
      const detectedLang = langdetect.detectOne(sampleText);
      return detectedLang || 'en';
    } catch (error) {
      logger.warn('Language detection failed', error);
      return 'en'; // Default to English
    }
  }

  /**
   * Extract key phrases using TF-IDF
   */
  extractKeyPhrases(content, limit = 10) {
    this.tfidf.addDocument(content);
    const terms = [];
    
    this.tfidf.listTerms(0).forEach((item) => {
      if (item.term.length > 3 && !this.isStopWord(item.term)) {
        terms.push({
          term: item.term,
          score: item.tfidf
        });
      }
    });

    return terms
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(t => t.term);
  }

  /**
   * Check if word is a stop word
   */
  isStopWord(word) {
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
      'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
      'do', 'at', 'this', 'but', 'his', 'by', 'from'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Analyze content structure
   */
  analyzeContentStructure(content) {
    const lines = content.split('\n');
    const structure = {
      totalLines: lines.length,
      paragraphs: 0,
      sentences: 0,
      headings: [],
      lists: 0,
      codeBlocks: 0
    };

    let inCodeBlock = false;
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      
      // Count paragraphs
      if (trimmed.length > 0 && !inCodeBlock) {
        structure.paragraphs++;
      }
      
      // Detect headings (simple heuristic)
      if (trimmed.match(/^#+\s/) || trimmed.match(/^[A-Z][^.!?]*:$/)) {
        structure.headings.push(trimmed);
      }
      
      // Detect lists
      if (trimmed.match(/^[-*+]\s/) || trimmed.match(/^\d+\.\s/)) {
        structure.lists++;
      }
      
      // Detect code blocks
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        if (!inCodeBlock) structure.codeBlocks++;
      }
    });

    // Count sentences
    const sentences = this.tokenizer.tokenize(content);
    structure.sentences = sentences.length;

    return structure;
  }

  /**
   * Text preprocessing pipeline
   */
  async preprocessText(document) {
    logger.debug('Starting text preprocessing', { documentId: document.id });

    let processedContent = document.content;

    // Normalize encoding
    processedContent = this.normalizeEncoding(processedContent);

    // Handle special characters
    processedContent = this.handleSpecialCharacters(processedContent);

    // Remove duplicates
    processedContent = this.deduplicateContent(processedContent);

    // Additional language-specific processing
    if (document.metadata.language !== 'en') {
      processedContent = await this.processNonEnglishContent(
        processedContent, 
        document.metadata.language
      );
    }

    return {
      ...document,
      content: processedContent,
      preprocessing: {
        originalLength: document.content.length,
        processedLength: processedContent.length,
        reductionRatio: 1 - (processedContent.length / document.content.length)
      }
    };
  }

  /**
   * Normalize text encoding
   */
  normalizeEncoding(text) {
    // Convert to UTF-8 if needed
    try {
      // Attempt to decode and re-encode to ensure UTF-8
      const buffer = Buffer.from(text);
      return buffer.toString('utf8');
    } catch (error) {
      logger.warn('Encoding normalization failed, using original text', error);
      return text;
    }
  }

  /**
   * Handle special characters
   */
  handleSpecialCharacters(text) {
    // Replace common problematic characters
    return text
      .replace(/\u00A0/g, ' ') // Non-breaking spaces
      .replace(/\u200B/g, '') // Zero-width spaces
      .replace(/\uFEFF/g, '') // Zero-width no-break spaces
      .replace(/[\u2028\u2029]/g, '\n'); // Line/paragraph separators
  }

  /**
   * Remove duplicate content
   */
  deduplicateContent(text) {
    const paragraphs = text.split(/\n\n+/);
    const seen = new Set();
    const unique = [];

    paragraphs.forEach(para => {
      const normalized = para.trim().toLowerCase();
      const hash = crypto.createHash('md5').update(normalized).digest('hex');
      
      if (!seen.has(hash) && normalized.length > 20) {
        seen.add(hash);
        unique.push(para);
      }
    });

    return unique.join('\n\n');
  }

  /**
   * Process non-English content
   */
  async processNonEnglishContent(text, language) {
    // Placeholder for language-specific processing
    // In production, this would integrate with language-specific tools
    logger.info(`Processing ${language} content`);
    return text;
  }

  /**
   * Content chunking strategies
   */
  async chunkContent(document, strategy = 'semantic') {
    logger.debug(`Chunking content using ${strategy} strategy`, { 
      documentId: document.id 
    });

    let chunks;
    
    switch (strategy) {
      case 'semantic':
        chunks = await this.semanticChunking(document.content);
        break;
      case 'fixed':
        chunks = this.fixedSizeChunking(document.content);
        break;
      case 'sentence':
        chunks = this.sentenceBoundaryChunking(document.content);
        break;
      case 'paragraph':
        chunks = this.paragraphBasedChunking(document.content);
        break;
      default:
        chunks = await this.semanticChunking(document.content);
    }

    // Add metadata to chunks
    return chunks.map((chunk, index) => ({
      id: crypto.randomUUID(),
      documentId: document.id,
      index,
      content: chunk.content,
      tokens: chunk.tokens,
      strategy,
      metadata: {
        ...chunk.metadata,
        position: {
          start: chunk.start,
          end: chunk.end
        }
      }
    }));
  }

  /**
   * Semantic chunking based on content coherence
   */
  async semanticChunking(content) {
    const sentences = this.tokenizer.tokenize(content);
    const chunks = [];
    let currentChunk = [];
    let currentTokens = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const tokens = encode(sentence).length;

      // Check if adding this sentence exceeds max chunk size
      if (currentTokens + tokens > this.maxChunkSize && currentChunk.length > 0) {
        // Save current chunk
        const chunk = this.createChunk(currentChunk.join(' '), content);
        if (chunk) chunks.push(chunk);
        
        // Start new chunk with overlap
        const overlapSentences = this.getOverlapSentences(currentChunk);
        currentChunk = [...overlapSentences, sentence];
        currentTokens = encode(currentChunk.join(' ')).length;
      } else {
        currentChunk.push(sentence);
        currentTokens += tokens;
      }

      // Check for semantic boundaries (e.g., paragraph breaks)
      if (this.isSemanticBoundary(sentence, sentences[i + 1])) {
        if (currentTokens >= this.minChunkSize) {
          const chunk = this.createChunk(currentChunk.join(' '), content);
          if (chunk) chunks.push(chunk);
          currentChunk = [];
          currentTokens = 0;
        }
      }
    }

    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      const chunk = this.createChunk(currentChunk.join(' '), content);
      if (chunk) chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Fixed-size chunking with overlap
   */
  fixedSizeChunking(content) {
    const chunks = [];
    const tokens = encode(content);
    const stepSize = this.maxChunkSize - this.overlapSize;

    for (let i = 0; i < tokens.length; i += stepSize) {
      const chunkTokens = tokens.slice(i, i + this.maxChunkSize);
      const chunkText = this.decodeTokens(chunkTokens);
      
      chunks.push({
        content: chunkText,
        tokens: chunkTokens.length,
        start: i,
        end: Math.min(i + this.maxChunkSize, tokens.length),
        metadata: {
          method: 'fixed-size',
          sentences: 1,
          words: chunkText.split(/\s+/).length
        }
      });
    }

    return chunks;
  }

  /**
   * Sentence boundary chunking
   */
  sentenceBoundaryChunking(content) {
    const sentences = this.tokenizer.tokenize(content);
    const chunks = [];
    let currentChunk = [];
    let currentTokens = 0;

    sentences.forEach((sentence) => {
      const tokens = encode(sentence).length;
      
      if (currentTokens + tokens > this.maxChunkSize && currentChunk.length > 0) {
        chunks.push(this.createChunk(currentChunk.join(' '), content));
        currentChunk = [sentence];
        currentTokens = tokens;
      } else {
        currentChunk.push(sentence);
        currentTokens += tokens;
      }
    });

    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(currentChunk.join(' '), content));
    }

    return chunks;
  }

  /**
   * Paragraph-based chunking
   */
  paragraphBasedChunking(content) {
    const paragraphs = content.split(/\n\n+/);
    const chunks = [];
    let currentChunk = [];
    let currentTokens = 0;

    paragraphs.forEach((paragraph) => {
      const tokens = encode(paragraph).length;
      
      if (tokens > this.maxChunkSize) {
        // Split large paragraphs
        if (currentChunk.length > 0) {
          chunks.push(this.createChunk(currentChunk.join('\n\n'), content));
          currentChunk = [];
          currentTokens = 0;
        }
        
        // Use sentence chunking for large paragraphs
        const subChunks = this.sentenceBoundaryChunking(paragraph);
        chunks.push(...subChunks);
      } else if (currentTokens + tokens > this.maxChunkSize && currentChunk.length > 0) {
        chunks.push(this.createChunk(currentChunk.join('\n\n'), content));
        currentChunk = [paragraph];
        currentTokens = tokens;
      } else {
        currentChunk.push(paragraph);
        currentTokens += tokens;
      }
    });

    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(currentChunk.join('\n\n'), content));
    }

    return chunks;
  }

  /**
   * Create chunk object with metadata
   */
  createChunk(chunkContent, fullContent) {
    // Clean up chunk content
    chunkContent = chunkContent.trim();
    
    // Skip empty chunks
    if (!chunkContent) {
      return null;
    }
    
    const tokens = encode(chunkContent);
    
    // Find start position more reliably by normalizing whitespace
    const normalizedFull = fullContent.replace(/\s+/g, ' ').trim();
    const normalizedChunk = chunkContent.replace(/\s+/g, ' ').trim();
    let start = normalizedFull.indexOf(normalizedChunk);
    
    // If exact match not found, try approximate matching
    if (start === -1) {
      const words = normalizedChunk.split(' ').slice(0, 5); // First 5 words
      const searchPattern = words.join(' ');
      start = normalizedFull.indexOf(searchPattern);
      if (start === -1) start = 0; // Fallback to start
    }
    
    return {
      content: chunkContent,
      tokens: tokens.length,
      start,
      end: start + chunkContent.length,
      metadata: {
        sentences: this.tokenizer.tokenize(chunkContent).length,
        words: chunkContent.split(/\s+/).length
      }
    };
  }

  /**
   * Get overlap sentences for semantic continuity
   */
  getOverlapSentences(sentences) {
    if (sentences.length <= 2) return sentences;
    
    // Take last 2-3 sentences based on their token count
    let overlapTokens = 0;
    const overlap = [];
    
    for (let i = sentences.length - 1; i >= 0 && overlapTokens < this.overlapSize; i--) {
      const tokens = encode(sentences[i]).length;
      overlap.unshift(sentences[i]);
      overlapTokens += tokens;
    }
    
    return overlap;
  }

  /**
   * Check if there's a semantic boundary between sentences
   */
  isSemanticBoundary(currentSentence, nextSentence) {
    if (!nextSentence) return true;
    
    // Check for paragraph indicators
    if (currentSentence.endsWith(':') || 
        nextSentence.match(/^\d+\./) ||
        nextSentence.match(/^[A-Z][A-Z\s]+$/)) {
      return true;
    }
    
    return false;
  }

  /**
   * Decode tokens back to text (simplified)
   */
  decodeTokens(tokens) {
    // This is a simplified version - in production, use proper decoder
    return tokens.join('');
  }

  /**
   * Quality assessment
   */
  async assessQuality(document, chunks) {
    logger.debug('Assessing content quality', { documentId: document.id });

    const assessments = {
      readability: this.assessReadability(document.content),
      coherence: await this.assessCoherence(chunks),
      completeness: this.assessCompleteness(document, chunks),
      errors: this.detectErrors(document.content)
    };

    // Calculate overall score
    const overallScore = this.calculateOverallQuality(assessments);

    return {
      ...assessments,
      overallScore,
      recommendations: this.generateQualityRecommendations(assessments)
    };
  }

  /**
   * Assess readability using various metrics
   */
  assessReadability(content) {
    try {
      const scores = readability(content);
      const metrics = {
        fleschKincaid: scores.fleschKincaid,
        fleschEase: scores.flesch,
        gunningFog: scores.gunningFog,
        smog: scores.smog,
        ari: scores.ari,
        colemanLiau: scores.colemanLiau
      };

      // Normalize scores to 0-100 scale
      const normalizedScore = this.normalizeReadabilityScore(metrics);

      return {
        score: normalizedScore,
        metrics,
        level: this.getReadabilityLevel(normalizedScore)
      };
    } catch (error) {
      logger.warn('Readability assessment failed', error);
      return {
        score: 50,
        metrics: {},
        level: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Normalize readability scores
   */
  normalizeReadabilityScore(metrics) {
    // Flesch Reading Ease is already 0-100
    const fleschEase = metrics.fleschEase || 50;
    
    // Convert grade levels to 0-100 scale (assuming grade 1-20 range)
    const gradeScores = [
      metrics.fleschKincaid,
      metrics.gunningFog,
      metrics.smog,
      metrics.ari,
      metrics.colemanLiau
    ].filter(score => score !== undefined);

    if (gradeScores.length === 0) return fleschEase;

    const avgGrade = gradeScores.reduce((a, b) => a + b, 0) / gradeScores.length;
    const gradeScore = Math.max(0, Math.min(100, (20 - avgGrade) * 5));

    // Combine Flesch ease and grade scores
    return (fleschEase + gradeScore) / 2;
  }

  /**
   * Get readability level description
   */
  getReadabilityLevel(score) {
    if (score >= 90) return 'very easy';
    if (score >= 80) return 'easy';
    if (score >= 70) return 'fairly easy';
    if (score >= 60) return 'standard';
    if (score >= 50) return 'fairly difficult';
    if (score >= 30) return 'difficult';
    return 'very difficult';
  }

  /**
   * Assess content coherence
   */
  async assessCoherence(chunks) {
    const coherenceScores = [];

    for (let i = 0; i < chunks.length - 1; i++) {
      const similarity = this.calculateSimilarity(
        chunks[i].content,
        chunks[i + 1].content
      );
      coherenceScores.push(similarity);
    }

    const avgCoherence = coherenceScores.length > 0
      ? coherenceScores.reduce((a, b) => a + b, 0) / coherenceScores.length
      : 1;

    return {
      score: avgCoherence * 100,
      chunkScores: coherenceScores,
      interpretation: this.interpretCoherence(avgCoherence)
    };
  }

  /**
   * Calculate text similarity (simplified cosine similarity)
   */
  calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Interpret coherence score
   */
  interpretCoherence(score) {
    if (score >= 0.7) return 'highly coherent';
    if (score >= 0.5) return 'moderately coherent';
    if (score >= 0.3) return 'somewhat coherent';
    return 'low coherence';
  }

  /**
   * Assess content completeness
   */
  assessCompleteness(document, chunks) {
    const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
    const avgChunkSize = totalTokens / chunks.length;
    
    const completeness = {
      totalChunks: chunks.length,
      totalTokens,
      avgChunkSize,
      coverage: this.calculateCoverage(document, chunks),
      distribution: this.analyzeDistribution(chunks)
    };

    completeness.score = this.calculateCompletenessScore(completeness);
    
    return completeness;
  }

  /**
   * Calculate content coverage
   */
  calculateCoverage(document, chunks) {
    const originalLength = document.content.length;
    const chunkedLength = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
    
    return {
      percentage: (chunkedLength / originalLength) * 100,
      missing: originalLength - chunkedLength
    };
  }

  /**
   * Analyze chunk distribution
   */
  analyzeDistribution(chunks) {
    const sizes = chunks.map(c => c.tokens);
    const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const variance = sizes.reduce((sum, size) => sum + Math.pow(size - mean, 2), 0) / sizes.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      stdDev,
      uniformity: 1 - (stdDev / mean), // Higher is more uniform
      min: Math.min(...sizes),
      max: Math.max(...sizes)
    };
  }

  /**
   * Calculate completeness score
   */
  calculateCompletenessScore(completeness) {
    const coverageScore = Math.min(completeness.coverage.percentage, 100);
    const uniformityScore = completeness.distribution.uniformity * 100;
    
    return (coverageScore + uniformityScore) / 2;
  }

  /**
   * Detect errors in content
   */
  detectErrors(content) {
    const errors = [];

    // Check for encoding issues
    if (content.includes('�')) {
      errors.push({
        type: 'encoding',
        severity: 'medium',
        message: 'Potential encoding issues detected'
      });
    }

    // Check for excessive special characters
    const specialCharRatio = (content.match(/[^\w\s]/g) || []).length / content.length;
    if (specialCharRatio > 0.3) {
      errors.push({
        type: 'formatting',
        severity: 'low',
        message: 'High ratio of special characters'
      });
    }

    // Check for truncated content
    const trimmedContent = content.trim();
    if (trimmedContent.endsWith('...') || trimmedContent.endsWith('…')) {
      errors.push({
        type: 'truncation',
        severity: 'high',
        message: 'Content appears to be truncated'
      });
    }

    // Check for repeated content
    const lines = content.split('\n');
    const duplicates = lines.filter((line, index) => 
      lines.indexOf(line) !== index && line.length > 50
    );
    
    if (duplicates.length > 5) {
      errors.push({
        type: 'duplication',
        severity: 'medium',
        message: `Found ${duplicates.length} duplicate lines`
      });
    }

    return errors;
  }

  /**
   * Calculate overall quality score
   */
  calculateOverallQuality(assessments) {
    const weights = {
      readability: 0.3,
      coherence: 0.3,
      completeness: 0.3,
      errors: 0.1
    };

    const errorPenalty = Math.min(assessments.errors.length * 5, 30);
    
    const weightedScore = 
      (assessments.readability.score * weights.readability) +
      (assessments.coherence.score * weights.coherence) +
      (assessments.completeness.score * weights.completeness) -
      errorPenalty;

    return Math.max(0, Math.min(100, weightedScore));
  }

  /**
   * Generate quality recommendations
   */
  generateQualityRecommendations(assessments) {
    const recommendations = [];

    if (assessments.readability.score < 50) {
      recommendations.push({
        area: 'readability',
        priority: 'high',
        suggestion: 'Consider simplifying complex sentences and reducing technical jargon'
      });
    }

    if (assessments.coherence.score < 60) {
      recommendations.push({
        area: 'coherence',
        priority: 'medium',
        suggestion: 'Improve transitions between sections for better flow'
      });
    }

    if (assessments.completeness.coverage.percentage < 95) {
      recommendations.push({
        area: 'completeness',
        priority: 'high',
        suggestion: 'Some content may have been lost during processing'
      });
    }

    assessments.errors.forEach(error => {
      if (error.severity === 'high') {
        recommendations.push({
          area: 'errors',
          priority: 'high',
          suggestion: `Fix ${error.type}: ${error.message}`
        });
      }
    });

    return recommendations;
  }

  /**
   * Store processing results
   */
  async storeProcessingResults(results) {
    try {
      // Store in Supabase
      const { data, error } = await supabaseAdmin
        .from('content_embeddings')
        .insert({
          document_id: results.documentId,
          processing_id: results.processingId,
          chunks: results.chunks,
          quality_report: results.qualityReport,
          metadata: results.metadata,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update document status
      await supabaseAdmin
        .from('course_resources')
        .update({
          processing_status: 'completed',
          processing_metadata: {
            processingId: results.processingId,
            chunksCreated: results.chunks.length,
            qualityScore: results.qualityReport.overallScore,
            processingTime: results.metadata.processingTime
          },
          processed_at: new Date().toISOString()
        })
        .eq('id', results.documentId);

      return data;
    } catch (error) {
      logger.error('Failed to store processing results', error);
      throw error;
    }
  }

  /**
   * Create async processing job
   */
  async createProcessingJob(document, options = {}) {
    const job = await documentQueue.add('process-document', {
      document,
      options,
      timestamp: new Date().toISOString()
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: false,
      removeOnFail: false
    });

    logger.info(`Created processing job: ${job.id}`, {
      documentId: document.id
    });

    return job;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    const job = await documentQueue.getJob(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn
    };
  }

  /**
   * Update job progress
   */
  async updateJobProgress(job, progress, message) {
    await job.progress(progress);
    await job.log(message);
    
    logger.debug(`Job ${job.id} progress: ${progress}%`, { message });
  }
}

// Process jobs
documentQueue.process('process-document', async (job) => {
  const processor = new DocumentProcessor();
  
  try {
    // Update progress
    await processor.updateJobProgress(job, 10, 'Starting document processing');
    
    // Process document
    const result = await processor.processDocument(job.data.document, job.data.options);
    
    // Final progress update
    await processor.updateJobProgress(job, 100, 'Processing completed');
    
    return result;
  } catch (error) {
    logger.error(`Job ${job.id} failed:`, error);
    throw error;
  }
});

module.exports = {
  DocumentProcessor,
  documentQueue
};