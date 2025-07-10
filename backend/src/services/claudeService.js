/**
 * Claude API Service for Course Generation
 * 
 * This service provides comprehensive course generation capabilities using Anthropic's Claude API.
 * It includes prompt engineering utilities, template systems, and optimization features.
 * 
 * Features:
 * - Anthropic SDK integration with proper configuration
 * - Advanced prompt engineering with template system
 * - Token counting and optimization
 * - Response caching and parallel generation
 * - Comprehensive error handling and retry logic
 * - Cost tracking and usage limits
 */

const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

class ClaudeService {
  constructor(config = {}) {
    this.config = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: config.model || 'claude-3-5-sonnet-20241022',
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.7,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      rateLimitDelay: config.rateLimitDelay || 1000,
      enableCaching: config.enableCaching !== false,
      maxCostPerRequest: config.maxCostPerRequest || 5.0, // USD
      ...config
    };

    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      maxRetries: this.config.maxRetries,
    });

    // Initialize caches
    this.responseCache = new Map();
    this.tokenCache = new Map();
    
    // Usage tracking
    this.usageStats = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0,
      cacheHits: 0,
      errors: 0
    };

    // Prompt templates
    this.promptTemplates = this.initializePromptTemplates();
    
    logger.info('ClaudeService initialized', {
      model: this.config.model,
      enableCaching: this.config.enableCaching,
      maxTokens: this.config.maxTokens
    });
  }

  /**
   * Initialize prompt templates for different course generation tasks
   */
  initializePromptTemplates() {
    return {
      courseStructure: {
        system: `You are an expert instructional designer specializing in creating comprehensive course structures. 
Your task is to generate detailed course outlines that are pedagogically sound, engaging, and aligned with learning objectives.

Guidelines:
- Follow adult learning principles and instructional design best practices
- Create clear learning progressions from basic to advanced concepts
- Include practical applications and real-world examples
- Ensure assessments align with learning objectives
- Consider different learning styles and accessibility needs
- Provide realistic time estimates for each component`,

        user: `Create a comprehensive course structure based on the following requirements:

**Course Configuration:**
{courseConfig}

**Available Content Context:**
{ragContext}

**Requirements:**
1. Generate a complete course outline with 5-12 sessions
2. Each session should have clear learning objectives (2-4 per session)
3. Include estimated duration for each session (30-180 minutes)
4. Suggest appropriate difficulty progression
5. Recommend assessment types and timing
6. Include prerequisite knowledge requirements
7. Suggest practical activities and exercises

**Output Format:**
Return ONLY a valid JSON object (no additional text before or after) with this simplified structure:
{
  "title": "string",
  "description": "string",
  "duration": "string",
  "level": "beginner|intermediate|advanced",
  "objectives": ["string", "string", "string"],
  "sessions": [
    {
      "number": 1,
      "title": "string",
      "duration": "string",
      "topics": ["string", "string"],
      "objectives": ["string", "string"]
    },
    {
      "number": 2,
      "title": "string", 
      "duration": "string",
      "topics": ["string", "string"],
      "objectives": ["string", "string"]
    }
  ]
}`
      },

      sessionDetails: {
        system: `You are an expert course content developer specializing in creating detailed session content.
Your task is to develop comprehensive session materials that are engaging, practical, and pedagogically effective.

Guidelines:
- Create detailed content that achieves the session's learning objectives
- Include multiple teaching methods (explanation, demonstration, practice, assessment)
- Provide practical examples and real-world applications
- Design interactive activities that reinforce learning
- Include assessment opportunities throughout the session
- Consider timing and pacing for optimal learning retention`,

        user: `Create detailed content for the following course session:

**Session Information:**
{sessionInfo}

**Available Content Context:**
{ragContext}

**Course Context:**
{courseContext}

**Requirements:**
1. Develop comprehensive session content that achieves all learning objectives
2. Create a detailed session plan with timing
3. Include multiple content delivery methods
4. Design 2-3 interactive activities
5. Provide assessment opportunities
6. Include practical exercises and examples
7. Suggest resources and materials needed

**Output Format:**
Return ONLY a valid JSON object (no additional text before or after) with this simplified structure:
{
  "title": "string",
  "overview": "string",
  "duration": "string",
  "objectives": ["string", "string"],
  "activities": [
    {
      "name": "string",
      "type": "lecture|exercise|discussion",
      "duration": "string",
      "description": "string"
    },
    {
      "name": "string", 
      "type": "exercise|assessment",
      "duration": "string",
      "description": "string"
    }
  ],
  "materials": ["string", "string"],
  "homework": "string"
}`
      },

      assessments: {
        system: `You are an expert assessment designer specializing in creating comprehensive evaluation methods.
Your task is to design assessments that accurately measure learning outcomes and provide meaningful feedback.

Guidelines:
- Align assessments with learning objectives using Bloom's taxonomy
- Include both formative and summative assessment types
- Design assessments for different learning preferences
- Provide clear evaluation criteria and rubrics
- Include self-assessment and peer assessment opportunities
- Consider practical application and real-world relevance
- Ensure assessments are fair, valid, and reliable`,

        user: `Create comprehensive assessments for the following course:

**Course Configuration:**
{courseConfig}

**Content Context:**
{ragContext}

**Requirements:**
1. Design formative assessments for ongoing learning evaluation
2. Create summative assessments for final evaluation
3. Include variety in assessment types (quiz, project, presentation, etc.)
4. Provide detailed rubrics and evaluation criteria
5. Suggest self-assessment and peer assessment opportunities
6. Include practical application assessments
7. Consider different learning styles and accessibility needs

**Output Format:**
Return ONLY a valid JSON object (no additional text before or after) with this simplified structure:
{
  "overview": "string",
  "quizzes": [
    {
      "title": "string",
      "timing": "string",
      "duration": "string",
      "weight": "string"
    }
  ],
  "assignments": [
    {
      "title": "string",
      "type": "project|presentation|essay",
      "duration": "string",
      "weight": "string"
    }
  ],
  "finalExam": {
    "included": true,
    "duration": "string",
    "weight": "string",
    "format": "written|practical|oral"
  }
}`
      },

      activities: {
        system: `You are an expert learning activity designer specializing in creating engaging and effective educational activities.
Your task is to design interactive activities that reinforce learning and promote skill development.

Guidelines:
- Design activities that directly support learning objectives
- Include variety in activity types (individual, group, hands-on, digital)
- Consider different learning styles and preferences
- Provide clear instructions and expected outcomes
- Include reflection and debriefing opportunities
- Ensure activities are practical and applicable
- Consider time constraints and resource requirements`,

        user: `Create engaging learning activities for the following course content:

**Learning Objectives:**
{objectives}

**Content Context:**
{ragContext}

**Course Context:**
{courseContext}

**Requirements:**
1. Design 5-8 varied learning activities
2. Include individual and group activities
3. Provide hands-on and practical exercises
4. Include reflection and discussion opportunities
5. Consider different learning styles
6. Provide clear instructions and materials needed
7. Include timing and expected outcomes

**Output Format:**
Return ONLY a valid JSON object (no additional text before or after) with this simplified structure:
{
  "overview": "string",
  "activities": [
    {
      "title": "string",
      "type": "individual|group|hands-on",
      "duration": "string",
      "description": "string",
      "materials": ["string", "string"]
    },
    {
      "title": "string",
      "type": "discussion|exercise",
      "duration": "string", 
      "description": "string",
      "materials": ["string"]
    }
  ],
  "totalTime": "string"
}`
      }
    };
  }

  /**
   * Generate course structure based on configuration and context
   */
  async generateCourseStructure(config, context = null) {
    const operationId = `course-structure-${Date.now()}`;
    
    try {
      logger.info('Generating course structure', {
        operationId,
        courseTitle: config.title,
        targetAudience: config.targetAudience
      });

      // Validate inputs
      this.validateCourseConfig(config);
      
      // Prepare context
      const ragContext = this.prepareRagContext(context);
      const courseConfig = this.prepareCourseConfig(config);

      // Generate prompt
      const prompt = this.promptTemplates.courseStructure.user
        .replace('{courseConfig}', JSON.stringify(courseConfig, null, 2))
        .replace('{ragContext}', ragContext);

      // Check cache
      const cacheKey = this.generateCacheKey('course-structure', prompt);
      if (this.config.enableCaching && this.responseCache.has(cacheKey)) {
        this.usageStats.cacheHits++;
        logger.info('Course structure cache hit', { operationId });
        return this.responseCache.get(cacheKey);
      }

      // Generate with Claude
      const response = await this.generateWithRetry({
        system: this.promptTemplates.courseStructure.system,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      }, operationId);

      // Parse and validate response
      const parsedResponse = this.parseAndValidateResponse(response.content[0].text, 'courseStructure');
      
      // Cache response
      if (this.config.enableCaching) {
        this.responseCache.set(cacheKey, parsedResponse);
      }

      // Update usage stats
      this.updateUsageStats(response.usage);

      logger.info('Course structure generated successfully', {
        operationId,
        sessionCount: parsedResponse.sessions?.length || 0,
        tokensUsed: response.usage.output_tokens
      });

      return parsedResponse;

    } catch (error) {
      this.usageStats.errors++;
      logger.error('Course structure generation failed', {
        operationId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Course structure generation failed: ${error.message}`);
    }
  }

  /**
   * Generate detailed session content
   */
  async generateSessionDetails(sessionInfo, context = null, courseContext = null) {
    const operationId = `session-details-${Date.now()}`;
    
    try {
      logger.info('Generating session details', {
        operationId,
        sessionTitle: sessionInfo.title,
        sessionNumber: sessionInfo.sessionNumber
      });

      // Validate inputs
      this.validateSessionInfo(sessionInfo);
      
      // Prepare context
      const ragContext = this.prepareRagContext(context);
      const sessionData = JSON.stringify(sessionInfo, null, 2);
      const courseData = courseContext ? JSON.stringify(courseContext, null, 2) : 'Not provided';

      // Generate prompt
      const prompt = this.promptTemplates.sessionDetails.user
        .replace('{sessionInfo}', sessionData)
        .replace('{ragContext}', ragContext)
        .replace('{courseContext}', courseData);

      // Check cache
      const cacheKey = this.generateCacheKey('session-details', prompt);
      if (this.config.enableCaching && this.responseCache.has(cacheKey)) {
        this.usageStats.cacheHits++;
        logger.info('Session details cache hit', { operationId });
        return this.responseCache.get(cacheKey);
      }

      // Generate with Claude
      const response = await this.generateWithRetry({
        system: this.promptTemplates.sessionDetails.system,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      }, operationId);

      // Parse and validate response
      const parsedResponse = this.parseAndValidateResponse(response.content[0].text, 'sessionDetails');
      
      // Cache response
      if (this.config.enableCaching) {
        this.responseCache.set(cacheKey, parsedResponse);
      }

      // Update usage stats
      this.updateUsageStats(response.usage);

      logger.info('Session details generated successfully', {
        operationId,
        activitiesCount: parsedResponse.detailedContent?.practicalExercises?.length || 0,
        tokensUsed: response.usage.output_tokens
      });

      return parsedResponse;

    } catch (error) {
      this.usageStats.errors++;
      logger.error('Session details generation failed', {
        operationId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Session details generation failed: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive assessments
   */
  async generateAssessments(config, context = null) {
    const operationId = `assessments-${Date.now()}`;
    
    try {
      logger.info('Generating assessments', {
        operationId,
        courseTitle: config.title
      });

      // Validate inputs
      this.validateCourseConfig(config);
      
      // Prepare context
      const ragContext = this.prepareRagContext(context);
      const courseConfig = this.prepareCourseConfig(config);

      // Generate prompt
      const prompt = this.promptTemplates.assessments.user
        .replace('{courseConfig}', JSON.stringify(courseConfig, null, 2))
        .replace('{ragContext}', ragContext);

      // Check cache
      const cacheKey = this.generateCacheKey('assessments', prompt);
      if (this.config.enableCaching && this.responseCache.has(cacheKey)) {
        this.usageStats.cacheHits++;
        logger.info('Assessments cache hit', { operationId });
        return this.responseCache.get(cacheKey);
      }

      // Generate with Claude
      const response = await this.generateWithRetry({
        system: this.promptTemplates.assessments.system,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      }, operationId);

      // Parse and validate response
      const parsedResponse = this.parseAndValidateResponse(response.content[0].text, 'assessments');
      
      // Cache response
      if (this.config.enableCaching) {
        this.responseCache.set(cacheKey, parsedResponse);
      }

      // Update usage stats
      this.updateUsageStats(response.usage);

      logger.info('Assessments generated successfully', {
        operationId,
        formativeCount: parsedResponse.formativeAssessments?.length || 0,
        summativeCount: parsedResponse.summativeAssessments?.length || 0,
        tokensUsed: response.usage.output_tokens
      });

      return parsedResponse;

    } catch (error) {
      this.usageStats.errors++;
      logger.error('Assessments generation failed', {
        operationId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Assessments generation failed: ${error.message}`);
    }
  }

  /**
   * Generate learning activities
   */
  async generateActivities(objectives, context = null, courseContext = null) {
    const operationId = `activities-${Date.now()}`;
    
    try {
      logger.info('Generating learning activities', {
        operationId,
        objectivesCount: objectives.length
      });

      // Validate inputs
      if (!objectives || !Array.isArray(objectives) || objectives.length === 0) {
        throw new Error('Learning objectives are required and must be a non-empty array');
      }
      
      // Prepare context
      const ragContext = this.prepareRagContext(context);
      const objectivesData = JSON.stringify(objectives, null, 2);
      const courseData = courseContext ? JSON.stringify(courseContext, null, 2) : 'Not provided';

      // Generate prompt
      const prompt = this.promptTemplates.activities.user
        .replace('{objectives}', objectivesData)
        .replace('{ragContext}', ragContext)
        .replace('{courseContext}', courseData);

      // Check cache
      const cacheKey = this.generateCacheKey('activities', prompt);
      if (this.config.enableCaching && this.responseCache.has(cacheKey)) {
        this.usageStats.cacheHits++;
        logger.info('Activities cache hit', { operationId });
        return this.responseCache.get(cacheKey);
      }

      // Generate with Claude
      const response = await this.generateWithRetry({
        system: this.promptTemplates.activities.system,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      }, operationId);

      // Parse and validate response
      const parsedResponse = this.parseAndValidateResponse(response.content[0].text, 'activities');
      
      // Cache response
      if (this.config.enableCaching) {
        this.responseCache.set(cacheKey, parsedResponse);
      }

      // Update usage stats
      this.updateUsageStats(response.usage);

      logger.info('Activities generated successfully', {
        operationId,
        activitiesCount: parsedResponse.activities?.length || 0,
        tokensUsed: response.usage.output_tokens
      });

      return parsedResponse;

    } catch (error) {
      this.usageStats.errors++;
      logger.error('Activities generation failed', {
        operationId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Activities generation failed: ${error.message}`);
    }
  }

  /**
   * Generate multiple sessions in parallel
   */
  async generateSessionsInParallel(sessions, context = null, courseContext = null, concurrency = 3) {
    const operationId = `parallel-sessions-${Date.now()}`;
    
    try {
      logger.info('Generating sessions in parallel', {
        operationId,
        sessionCount: sessions.length,
        concurrency
      });

      // Split sessions into batches
      const batches = this.createBatches(sessions, concurrency);
      const results = [];

      for (const batch of batches) {
        const batchPromises = batch.map(session => 
          this.generateSessionDetails(session, context, courseContext)
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches to respect rate limits
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.delay(this.config.rateLimitDelay);
        }
      }

      logger.info('Parallel session generation completed', {
        operationId,
        successCount: results.length,
        totalSessions: sessions.length
      });

      return results;

    } catch (error) {
      this.usageStats.errors++;
      logger.error('Parallel session generation failed', {
        operationId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Parallel session generation failed: ${error.message}`);
    }
  }

  /**
   * Generate with retry logic and error handling
   */
  async generateWithRetry(params, operationId) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Check cost limits
        this.checkCostLimits();
        
        // Log attempt
        logger.debug('Claude API request attempt', {
          operationId,
          attempt,
          model: this.config.model,
          maxTokens: params.max_tokens
        });

        // Make request
        const response = await this.client.messages.create({
          model: this.config.model,
          ...params
        });

        // Update request count
        this.usageStats.requestCount++;

        return response;

      } catch (error) {
        lastError = error;
        
        logger.warn('Claude API request failed', {
          operationId,
          attempt,
          error: error.message,
          type: error.type
        });

        // Don't retry on certain errors
        if (error.type === 'authentication_error' || 
            error.type === 'permission_error' ||
            error.type === 'invalid_request_error') {
          throw error;
        }

        // Wait before retry
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Parse and validate API response
   */
  parseAndValidateResponse(content, type) {
    let jsonStr = null;
    
    try {
      // Try to extract JSON from response with multiple strategies
      
      // Strategy 1: Look for JSON between triple backticks (with or without language)
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      } else {
        // Strategy 2: Find JSON by looking for opening and closing braces
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = content.substring(firstBrace, lastBrace + 1);
        } else {
          // Strategy 3: Find the first complete JSON object with regex
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonStr = jsonMatch[0];
          }
        }
      }

      // Strategy 4: If still no JSON, check if entire content might be JSON
      if (!jsonStr && content.trim().startsWith('{')) {
        jsonStr = content.trim();
      }

      if (!jsonStr) {
        // Log more helpful debugging info
        logger.error('No JSON found in response', {
          contentLength: content.length,
          firstChars: content.substring(0, 100),
          hasOpenBrace: content.includes('{'),
          hasCloseBrace: content.includes('}')
        });
        throw new Error('No JSON found in response');
      }

      // Try multiple parsing strategies
      let parsed = null;
      
      // Strategy 1: Direct parsing
      try {
        parsed = JSON.parse(jsonStr);
      } catch (firstError) {
        // Strategy 2: Clean and parse
        try {
          const cleanedJson = this.cleanJsonString(jsonStr);
          parsed = JSON.parse(cleanedJson);
        } catch (secondError) {
          // Strategy 3: Aggressive repair
          try {
            const repairedJson = this.repairJsonString(jsonStr);
            parsed = JSON.parse(repairedJson);
          } catch (thirdError) {
            // If all strategies fail, use the first error for clarity
            throw firstError;
          }
        }
      }
      
      // Basic validation based on type
      this.validateResponseStructure(parsed, type);
      
      return parsed;

    } catch (error) {
      logger.error('Response parsing failed', {
        error: error.message,
        type,
        contentLength: content.length,
        contentPreview: content.substring(0, 200),
        jsonStrPreview: jsonStr ? jsonStr.substring(0, 500) : 'No JSON extracted'
      });
      
      // Log the full content for debugging if it's not too long
      if (content.length < 5000) {
        logger.debug('Full response content', { content });
      }
      
      throw new Error(`Response parsing failed: ${error.message}`);
    }
  }

  /**
   * Clean JSON string to fix common issues
   */
  cleanJsonString(jsonStr) {
    // Remove trailing commas before closing brackets/braces
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix missing commas between array elements (more comprehensive)
    jsonStr = jsonStr.replace(/"\s*\n\s*"/g, '",\n"');
    jsonStr = jsonStr.replace(/}\s*\n\s*{/g, '},\n{');
    jsonStr = jsonStr.replace(/]\s*\n\s*\[/g, '],\n[');
    
    // Fix missing commas after closing braces/brackets in arrays/objects
    jsonStr = jsonStr.replace(/}\s*\n\s*"([^"]+)":/g, '},\n"$1":');
    jsonStr = jsonStr.replace(/]\s*\n\s*"([^"]+)":/g, '],\n"$1":');
    
    // Remove any non-JSON content after the last closing brace
    const lastBraceIndex = jsonStr.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      jsonStr = jsonStr.substring(0, lastBraceIndex + 1);
    }
    
    // Try to balance braces if needed
    const openBraces = (jsonStr.match(/\{/g) || []).length;
    const closeBraces = (jsonStr.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      jsonStr += '}';
    }
    
    return jsonStr;
  }

  /**
   * Aggressively repair JSON string for malformed responses
   */
  repairJsonString(jsonStr) {
    // First apply basic cleaning
    jsonStr = this.cleanJsonString(jsonStr);
    
    // More aggressive repairs
    
    // 1. Fix unescaped quotes in string values (improved regex)
    jsonStr = jsonStr.replace(/": "([^"]*[^\\])"([^"]*)",/g, '": "$1\\"$2",');
    
    // 2. Fix incomplete strings that might be cut off
    jsonStr = jsonStr.replace(/":\s*"([^"]*?)$/gm, '": "$1"');
    
    // 3. Fix incomplete objects/arrays by adding missing closing elements
    const lines = jsonStr.split('\n');
    const stack = [];
    let repaired = [];
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      repaired.push(line);
      
      // Track opening braces/brackets more accurately
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const prevChar = j > 0 ? line[j-1] : '';
        
        // Handle string boundaries
        if (char === '"' && !escapeNext) {
          inString = !inString;
        }
        
        // Handle escape sequences
        escapeNext = (char === '\\' && !escapeNext);
        
        // Only track braces/brackets outside of strings
        if (!inString) {
          if (char === '{' || char === '[') {
            stack.push(char);
          } else if (char === '}' || char === ']') {
            if (stack.length > 0) {
              stack.pop();
            }
          }
        }
      }
    }
    
    // Close any unclosed structures
    while (stack.length > 0) {
      const opener = stack.pop();
      if (opener === '{') {
        repaired.push('}');
      } else if (opener === '[') {
        repaired.push(']');
      }
    }
    
    let result = repaired.join('\n');
    
    // 4. Fix missing commas in arrays/objects (improved patterns)
    // Between object properties
    result = result.replace(/("\w+":\s*"[^"]*")\s*\n\s*("\w+":\s*)/g, '$1,\n$2');
    result = result.replace(/("\w+":\s*\d+)\s*\n\s*("\w+":\s*)/g, '$1,\n$2');
    result = result.replace(/("\w+":\s*(?:true|false|null))\s*\n\s*("\w+":\s*)/g, '$1,\n$2');
    
    // Between array elements
    result = result.replace(/("\w+")\s*\n\s*(")/g, '$1,\n$2');
    result = result.replace(/(\d+)\s*\n\s*(\d+)/g, '$1,\n$2');
    result = result.replace(/(true|false|null)\s*\n\s*(true|false|null|"|\d)/g, '$1,\n$2');
    
    // After closing brackets/braces in objects
    result = result.replace(/(\])\s*\n\s*("[\w\s]+":\s*)/g, '$1,\n$2');
    result = result.replace(/(\})\s*\n\s*("[\w\s]+":\s*)/g, '$1,\n$2');
    
    // 5. Remove trailing commas again after repairs
    result = result.replace(/,(\s*[}\]])/g, '$1');
    
    // 6. Fix common boolean/null issues
    result = result.replace(/:\s*True\b/gi, ': true');
    result = result.replace(/:\s*False\b/gi, ': false');
    result = result.replace(/:\s*None\b/gi, ': null');
    
    return result;
  }

  /**
   * Validate response structure based on type
   */
  validateResponseStructure(parsed, type) {
    const validators = {
      courseStructure: (obj) => {
        // More lenient validation - only check for sessions array
        if (!obj.sessions || !Array.isArray(obj.sessions)) {
          // Try to fix common issues
          if (obj.sessions === null || obj.sessions === undefined) {
            obj.sessions = [];
          } else if (typeof obj.sessions === 'object' && !Array.isArray(obj.sessions)) {
            // Convert object to array
            obj.sessions = Object.values(obj.sessions);
          }
          
          // If still not an array, throw error
          if (!Array.isArray(obj.sessions)) {
            throw new Error('Invalid course structure: sessions must be an array');
          }
        }
        
        // Ensure title exists (use default if missing)
        if (!obj.title) {
          obj.title = 'Untitled Course';
        }
      },
      sessionDetails: (obj) => {
        // More lenient validation - ensure activities is an array
        if (!obj.activities || !Array.isArray(obj.activities)) {
          if (obj.activities === null || obj.activities === undefined) {
            obj.activities = [];
          } else if (typeof obj.activities === 'object' && !Array.isArray(obj.activities)) {
            obj.activities = Object.values(obj.activities);
          }
          
          if (!Array.isArray(obj.activities)) {
            throw new Error('Invalid session details: activities must be an array');
          }
        }
        
        // Ensure title exists
        if (!obj.title) {
          obj.title = 'Untitled Session';
        }
      },
      assessments: (obj) => {
        // Ensure required fields exist with defaults
        if (!obj.overview) {
          obj.overview = 'Assessment overview pending';
        }
        
        // Ensure arrays exist
        if (!obj.quizzes || !Array.isArray(obj.quizzes)) {
          obj.quizzes = [];
        }
        if (!obj.assignments || !Array.isArray(obj.assignments)) {
          obj.assignments = [];
        }
        
        // Ensure finalExam object exists
        if (!obj.finalExam) {
          obj.finalExam = {
            included: false,
            duration: '0 hours',
            weight: '0%',
            format: 'written'
          };
        }
      },
      activities: (obj) => {
        // Ensure activities array exists
        if (!obj.activities || !Array.isArray(obj.activities)) {
          if (obj.activities === null || obj.activities === undefined) {
            obj.activities = [];
          } else if (typeof obj.activities === 'object' && !Array.isArray(obj.activities)) {
            obj.activities = Object.values(obj.activities);
          }
          
          if (!Array.isArray(obj.activities)) {
            throw new Error('Invalid activities: activities must be an array');
          }
        }
        
        // Ensure overview exists
        if (!obj.overview) {
          obj.overview = 'Activities overview pending';
        }
      }
    };

    const validator = validators[type];
    if (validator) {
      validator(parsed);
    }
  }

  /**
   * Prepare RAG context for prompt injection
   */
  prepareRagContext(context) {
    if (!context || !Array.isArray(context) || context.length === 0) {
      return 'No additional context provided.';
    }

    const formattedContext = context.map((item, index) => {
      return `**Source ${index + 1}** (Quality: ${item.quality_score || 'N/A'}):\n${item.content || item.text || 'No content'}\n`;
    }).join('\n');

    return `**Available Content Sources:**\n${formattedContext}`;
  }

  /**
   * Prepare course configuration for prompt injection
   */
  prepareCourseConfig(config) {
    return {
      title: config.title || 'Untitled Course',
      description: config.description || 'No description provided',
      targetAudience: config.targetAudience || 'General audience',
      difficultyLevel: config.difficultyLevel || 'intermediate',
      duration: config.duration || 'To be determined',
      format: config.format || 'Online',
      learningObjectives: config.learningObjectives || [],
      topics: config.topics || [],
      constraints: config.constraints || {},
      preferences: config.preferences || {}
    };
  }

  /**
   * Validate course configuration
   */
  validateCourseConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Course configuration is required and must be an object');
    }

    if (!config.title || typeof config.title !== 'string') {
      throw new Error('Course title is required and must be a string');
    }

    if (!config.targetAudience || typeof config.targetAudience !== 'string') {
      throw new Error('Target audience is required and must be a string');
    }
  }

  /**
   * Validate session information
   */
  validateSessionInfo(sessionInfo) {
    if (!sessionInfo || typeof sessionInfo !== 'object') {
      throw new Error('Session information is required and must be an object');
    }

    if (!sessionInfo.title || typeof sessionInfo.title !== 'string') {
      throw new Error('Session title is required and must be a string');
    }

    if (!sessionInfo.learningObjectives || !Array.isArray(sessionInfo.learningObjectives)) {
      throw new Error('Session learning objectives are required and must be an array');
    }
  }

  /**
   * Generate cache key for response caching
   */
  generateCacheKey(type, prompt) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(prompt).digest('hex');
    return `${type}-${hash}`;
  }

  /**
   * Update usage statistics
   */
  updateUsageStats(usage) {
    this.usageStats.totalTokens += (usage.input_tokens || 0) + (usage.output_tokens || 0);
    
    // Rough cost calculation (approximate pricing)
    const inputCost = (usage.input_tokens || 0) * 0.003 / 1000;
    const outputCost = (usage.output_tokens || 0) * 0.015 / 1000;
    this.usageStats.totalCost += inputCost + outputCost;
  }

  /**
   * Check cost limits before making requests
   */
  checkCostLimits() {
    if (this.usageStats.totalCost > this.config.maxCostPerRequest) {
      throw new Error(`Cost limit exceeded: $${this.usageStats.totalCost.toFixed(4)} > $${this.config.maxCostPerRequest}`);
    }
  }

  /**
   * Create batches for parallel processing
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Delay utility for rate limiting
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return {
      ...this.usageStats,
      cacheSize: this.responseCache.size,
      cacheHitRate: this.usageStats.requestCount > 0 ? 
        (this.usageStats.cacheHits / this.usageStats.requestCount * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Clear response cache
   */
  clearCache() {
    this.responseCache.clear();
    this.tokenCache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Health check for the service
   */
  async healthCheck() {
    try {
      // Test with a simple request
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });

      return {
        status: 'healthy',
        model: this.config.model,
        responseTime: Date.now(),
        usageStats: this.getUsageStats()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        model: this.config.model,
        usageStats: this.getUsageStats()
      };
    }
  }
}

module.exports = ClaudeService;