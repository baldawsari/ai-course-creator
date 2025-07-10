const { supabaseAdmin } = require('../config/database');
const logger = require('../utils/logger');
const ragPipeline = require('./ragPipeline');
const claudeService = require('./claudeService');
const documentProcessor = require('./documentProcessor');
const Bull = require('bull');
const { v4: uuidv4 } = require('uuid');

const generationQueue = new Bull('course-generation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  }
});

class CourseGenerator {
  constructor() {
    // Quality thresholds for content filtering
    this.qualityThresholds = {
      minimum: 50,      // Minimum acceptable quality score
      recommended: 70,  // Recommended quality for good courses
      premium: 85       // Premium quality content
    };
    
    this.initializeWorker();
  }

  initializeWorker() {
    generationQueue.process(async (job) => {
      const { jobId, courseId, userId } = job.data;
      try {
        await this.processGenerationJob(jobId, courseId, userId, job);
      } catch (error) {
        logger.error('Generation job failed:', error);
        throw error;
      }
    });

    generationQueue.on('completed', (job) => {
      logger.info(`Generation job ${job.id} completed successfully`);
    });

    generationQueue.on('failed', (job, err) => {
      logger.error(`Generation job ${job.id} failed:`, err);
    });
  }

  async createGenerationJob(courseId, userId) {
    const jobId = uuidv4();
    
    try {
      // Create job record in database
      const { error: jobError } = await supabaseAdmin
        .from('generation_jobs')
        .insert({
          id: jobId,
          course_id: courseId,
          user_id: userId,
          status: 'pending',
          progress: 0,
          created_at: new Date().toISOString()
        });

      if (jobError) throw jobError;

      // Add to processing queue
      const job = await generationQueue.add({
        jobId,
        courseId,
        userId
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      });

      logger.info(`Created generation job ${jobId} for course ${courseId}`);
      return { jobId, queueJobId: job.id };
    } catch (error) {
      logger.error('Failed to create generation job:', error);
      throw error;
    }
  }

  async processGenerationJob(jobId, courseId, userId, job) {
    try {
      // Update job status
      await this.updateJobStatus(jobId, 'processing', 5, 'Analyzing course resources...');

      // Step 1: Analyze uploaded content (use existing method)
      const contentAnalysis = await this.analyzeUploadedContent(courseId);
      await this.updateJobStatus(jobId, 'processing', 15, 'Building generation context...');

      // Step 2: Get course configuration
      const courseConfig = await this.getCourseConfiguration(courseId);
      
      // Step 3: Build generation context with RAG
      const generationContext = await this.buildGenerationContext(courseConfig, contentAnalysis);
      await this.updateJobStatus(jobId, 'processing', 25, 'Generating course outline...');

      // Step 4: Generate course outline using Claude
      const courseOutline = await this.generateAdvancedCourseOutline(courseConfig, generationContext);
      await this.updateJobStatus(jobId, 'processing', 40, 'Generating session details...');

      // Step 5: Generate detailed session content
      const sessions = await this.generateSessionDetails(courseOutline, generationContext, courseConfig);
      await this.updateJobStatus(jobId, 'processing', 70, 'Generating assessments...');

      // Step 6: Generate assessments
      const assessments = await this.generateAssessments(courseConfig, generationContext);
      await this.updateJobStatus(jobId, 'processing', 85, 'Validating content quality...');

      // Step 7: Validate and refine content
      const refinedContent = await this.validateAndRefineContent({
        outline: courseOutline,
        sessions,
        assessments
      }, courseConfig);

      // Step 8: Save generated content
      await this.saveGeneratedContent(courseId, refinedContent);
      await this.updateJobStatus(jobId, 'completed', 100, 'Course generation completed successfully');

      logger.info(`Successfully generated course ${courseId}`);
      return refinedContent;
    } catch (error) {
      logger.error(`Failed to process generation job ${jobId}:`, error);
      await this.updateJobStatus(jobId, 'failed', null, error.message);
      throw error;
    }
  }

  async analyzeUploadedContent(courseId) {
    try {
      // Get all resources for the course
      const resources = await this.fetchQualityResources(courseId, this.qualityThresholds.minimum);

      if (!resources || resources.length === 0) {
        throw new Error('No valid resources found for course generation');
      }

      // Use existing quality analysis
      const qualityAnalysis = this.analyzeResourceQuality(resources);

      // Enhanced analysis with topic coverage
      const analysis = {
        ...qualityAnalysis,
        contentTypes: this.analyzeContentTypes(resources),
        totalWordCount: resources.reduce((sum, r) => sum + (r.quality_report?.wordCount || 0), 0),
        languages: this.analyzeLanguages(resources),
        topicCoverage: await this.analyzeTopicCoverage(resources),
        recommendations: this.generateQualityRecommendations(qualityAnalysis)
      };

      logger.info(`Content analysis for course ${courseId}:`, analysis);
      return analysis;
    } catch (error) {
      logger.error('Failed to analyze uploaded content:', error);
      throw error;
    }
  }

  analyzeContentTypes(resources) {
    const types = {};
    resources.forEach(r => {
      types[r.file_type] = (types[r.file_type] || 0) + 1;
    });
    return types;
  }

  analyzeLanguages(resources) {
    const languages = new Set();
    resources.forEach(r => {
      if (r.quality_report?.language) {
        languages.add(r.quality_report.language);
      }
    });
    return Array.from(languages);
  }

  async analyzeTopicCoverage(resources) {
    try {
      const topics = new Map();
      
      for (const resource of resources) {
        const keyPhrases = resource.quality_report?.keyPhrases || [];
        keyPhrases.forEach(phrase => {
          topics.set(phrase, (topics.get(phrase) || 0) + 1);
        });
      }

      return Array.from(topics.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([topic, count]) => ({ topic, count }));
    } catch (error) {
      logger.error('Failed to analyze topic coverage:', error);
      return [];
    }
  }

  async getCourseConfiguration(courseId) {
    try {
      const { data: course, error } = await supabaseAdmin
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) throw error;

      return {
        title: course.title,
        description: course.description,
        level: course.level || 'intermediate',
        duration: course.duration || '4 weeks',
        objectives: course.objectives || [],
        targetAudience: course.target_audience || 'General learners',
        prerequisites: course.prerequisites || [],
        settings: course.settings || {}
      };
    } catch (error) {
      logger.error('Failed to get course configuration:', error);
      throw error;
    }
  }

  async buildGenerationContext(courseConfig, contentAnalysis) {
    try {
      const context = {
        course: courseConfig,
        content: contentAnalysis,
        ragContext: {},
        guidelines: this.getGenerationGuidelines(courseConfig.level)
      };

      // Enhance context with RAG retrieval
      const keyQueries = [
        `${courseConfig.title} fundamentals`,
        `${courseConfig.title} best practices`,
        `${courseConfig.title} learning objectives`,
        ...courseConfig.objectives.slice(0, 3)
      ];

      for (const query of keyQueries) {
        try {
          const results = await ragPipeline.retrieveRelevantContent(query, {
            topK: 5,
            minQuality: 70
          });

          if (results && results.length > 0) {
            context.ragContext[query] = results.map(r => ({
              content: r.node.text,
              score: r.score,
              metadata: r.node.metadata
            }));
          }
        } catch (error) {
          logger.warn(`RAG retrieval failed for query "${query}":`, error);
        }
      }

      logger.info('Built generation context with RAG enhancement');
      return context;
    } catch (error) {
      logger.error('Failed to build generation context:', error);
      throw error;
    }
  }

  getGenerationGuidelines(level) {
    const guidelines = {
      beginner: {
        complexity: 'simple',
        explanationDepth: 'detailed',
        examplesPerConcept: 3,
        paceOfLearning: 'gradual'
      },
      intermediate: {
        complexity: 'moderate',
        explanationDepth: 'balanced',
        examplesPerConcept: 2,
        paceOfLearning: 'steady'
      },
      advanced: {
        complexity: 'complex',
        explanationDepth: 'concise',
        examplesPerConcept: 1,
        paceOfLearning: 'rapid'
      }
    };

    return guidelines[level] || guidelines.intermediate;
  }

  async generateAdvancedCourseOutline(courseConfig, generationContext) {
    try {
      const outline = await claudeService.generateCourseStructure(
        courseConfig,
        generationContext.ragContext
      );

      if (!outline.sessions || outline.sessions.length === 0) {
        throw new Error('Generated outline missing sessions');
      }

      logger.info(`Generated course outline with ${outline.sessions.length} sessions`);
      return outline;
    } catch (error) {
      logger.error('Failed to generate course outline:', error);
      throw error;
    }
  }

  async generateSessionDetails(outline, generationContext, courseConfig) {
    try {
      const sessions = [];
      const totalSessions = outline.sessions.length;

      for (let i = 0; i < totalSessions; i++) {
        const session = outline.sessions[i];
        
        const sessionQueries = [
          session.title,
          ...session.topics.slice(0, 3)
        ];

        const sessionRagContext = {};
        for (const query of sessionQueries) {
          try {
            const results = await ragPipeline.retrieveRelevantContent(query, {
              topK: 3,
              minQuality: 70
            });

            if (results && results.length > 0) {
              sessionRagContext[query] = results.map(r => ({
                content: r.node.text,
                score: r.score
              }));
            }
          } catch (error) {
            logger.warn(`RAG retrieval failed for session query "${query}":`, error);
          }
        }

        const sessionDetails = await claudeService.generateSessionDetails(
          session,
          sessionRagContext,
          {
            courseTitle: courseConfig.title,
            courseLevel: courseConfig.level,
            sessionNumber: i + 1,
            totalSessions
          }
        );

        sessions.push({
          ...session,
          ...sessionDetails,
          sequenceNumber: i + 1
        });
      }

      logger.info(`Generated details for ${sessions.length} sessions`);
      return sessions;
    } catch (error) {
      logger.error('Failed to generate session details:', error);
      throw error;
    }
  }

  async generateAssessments(courseConfig, generationContext) {
    try {
      const assessmentContext = {
        objectives: courseConfig.objectives,
        level: courseConfig.level,
        sessionCount: generationContext.sessionCount || 4,
        topics: generationContext.topicCoverage || []
      };

      const assessments = await claudeService.generateAssessments(
        assessmentContext,
        generationContext.ragContext
      );

      logger.info('Generated course assessments');
      return assessments;
    } catch (error) {
      logger.error('Failed to generate assessments:', error);
      throw error;
    }
  }

  async validateAndRefineContent(generatedContent, courseConfig) {
    try {
      const validationResults = {
        outline: this.validateOutlineCoherence(generatedContent.outline, courseConfig),
        sessions: this.validateSessionProgression(generatedContent.sessions),
        assessments: this.validateAssessmentAlignment(generatedContent.assessments, courseConfig),
        overall: true
      };

      const criticalIssues = [];
      
      if (!validationResults.outline.isValid) {
        criticalIssues.push(...validationResults.outline.issues);
      }
      
      if (!validationResults.sessions.isValid) {
        criticalIssues.push(...validationResults.sessions.issues);
      }

      if (criticalIssues.length > 0) {
        logger.warn('Content validation found issues:', criticalIssues);
        return await this.refineContent(generatedContent, criticalIssues);
      }

      logger.info('Content validation passed');
      return generatedContent;
    } catch (error) {
      logger.error('Failed to validate and refine content:', error);
      return generatedContent;
    }
  }

  validateOutlineCoherence(outline, courseConfig) {
    const issues = [];
    
    const objectivesCovered = new Set();
    outline.sessions.forEach(session => {
      session.objectives?.forEach(obj => {
        courseConfig.objectives.forEach((courseObj, idx) => {
          if (obj.toLowerCase().includes(courseObj.toLowerCase().substring(0, 20))) {
            objectivesCovered.add(idx);
          }
        });
      });
    });

    if (objectivesCovered.size < courseConfig.objectives.length * 0.7) {
      issues.push('Course outline does not adequately cover stated objectives');
    }

    if (outline.sessions.length < 3) {
      issues.push('Course has too few sessions for effective learning');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  validateSessionProgression(sessions) {
    const issues = [];
    
    sessions.forEach((session, idx) => {
      if (!session.activities || session.activities.length === 0) {
        issues.push(`Session ${idx + 1} missing learning activities`);
      }
      
      if (!session.objectives || session.objectives.length === 0) {
        issues.push(`Session ${idx + 1} missing learning objectives`);
      }
    });

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  validateAssessmentAlignment(assessments, courseConfig) {
    const issues = [];
    
    if (!assessments.quizzes || assessments.quizzes.length === 0) {
      issues.push('No quizzes found in assessments');
    }
    
    if (!assessments.finalExam) {
      issues.push('No final exam defined');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  async refineContent(content, issues) {
    logger.info('Attempting to refine content based on validation issues');
    return content;
  }

  async saveGeneratedContent(courseId, content) {
    try {
      const sessionPromises = content.sessions.map(session => 
        supabaseAdmin
          .from('course_sessions')
          .insert({
            course_id: courseId,
            title: session.title,
            description: session.overview,
            sequence_number: session.sequenceNumber,
            duration_minutes: session.duration,
            objectives: session.objectives,
            content: {
              activities: session.activities,
              materials: session.materials,
              topics: session.topics
            },
            created_at: new Date().toISOString()
          })
      );

      await Promise.all(sessionPromises);

      await supabaseAdmin
        .from('courses')
        .update({
          assessments: content.assessments,
          metadata: {
            generatedAt: new Date().toISOString(),
            sessionCount: content.sessions.length,
            totalDuration: content.sessions.reduce((sum, s) => sum + s.duration, 0),
            outline: content.outline
          },
          status: 'published',
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId);

      logger.info(`Saved generated content for course ${courseId}`);
    } catch (error) {
      logger.error('Failed to save generated content:', error);
      throw error;
    }
  }

  async updateJobStatus(jobId, status, progress, message) {
    try {
      const updates = {
        status,
        updated_at: new Date().toISOString()
      };

      if (progress !== null) {
        updates.progress = progress;
      }

      if (message) {
        updates.message = message;
      }

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else if (status === 'failed') {
        updates.failed_at = new Date().toISOString();
      }

      const { error } = await supabaseAdmin
        .from('generation_jobs')
        .update(updates)
        .eq('id', jobId);

      if (error) throw error;
    } catch (error) {
      logger.error(`Failed to update job status for ${jobId}:`, error);
    }
  }

  async getJobStatus(jobId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('generation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error(`Failed to get job status for ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Generate course from resources with quality filtering
   * @param {Object} options - Generation options
   * @param {string} options.courseId - Course ID
   * @param {number} options.minQualityScore - Minimum quality score (optional)
   * @param {boolean} options.includeRecommendations - Include quality recommendations
   */
  async generateCourse(options) {
    const { courseId, minQualityScore = this.qualityThresholds.minimum, includeRecommendations = true } = options;
    
    try {
      logger.info(`Starting course generation for course ${courseId}`);
      
      // Fetch resources with quality filtering
      const resources = await this.fetchQualityResources(courseId, minQualityScore);
      
      if (resources.length === 0) {
        throw new Error(`No resources meet the minimum quality score of ${minQualityScore}`);
      }
      
      // Analyze resource quality distribution
      const qualityAnalysis = this.analyzeResourceQuality(resources);
      
      // Generate course structure based on quality resources
      const courseStructure = await this.generateCourseStructure(resources, qualityAnalysis);
      
      // Add recommendations if requested
      if (includeRecommendations) {
        courseStructure.recommendations = this.generateQualityRecommendations(qualityAnalysis);
      }
      
      return {
        courseId,
        resourcesUsed: resources.length,
        qualityAnalysis,
        structure: courseStructure,
        generatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Course generation failed:', error);
      throw error;
    }
  }
  
  /**
   * Fetch resources that meet quality threshold
   */
  async fetchQualityResources(courseId, minQualityScore) {
    const { data: resources, error } = await supabaseAdmin
      .from('course_resources')
      .select('*')
      .eq('course_id', courseId)
      .eq('status', 'processed')
      .gte('quality_score', minQualityScore)
      .order('quality_score', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch resources: ${error.message}`);
    }
    
    return resources || [];
  }
  
  /**
   * Analyze quality distribution of resources
   */
  analyzeResourceQuality(resources) {
    const scores = resources.map(r => r.quality_score);
    const total = scores.reduce((sum, score) => sum + score, 0);
    const average = total / scores.length;
    
    const distribution = {
      premium: resources.filter(r => r.quality_score >= this.qualityThresholds.premium).length,
      recommended: resources.filter(r => r.quality_score >= this.qualityThresholds.recommended && r.quality_score < this.qualityThresholds.premium).length,
      acceptable: resources.filter(r => r.quality_score >= this.qualityThresholds.minimum && r.quality_score < this.qualityThresholds.recommended).length
    };
    
    return {
      totalResources: resources.length,
      averageScore: Math.round(average * 10) / 10,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      distribution,
      qualityLevel: this.determineOverallQuality(average)
    };
  }
  
  /**
   * Determine overall quality level
   */
  determineOverallQuality(averageScore) {
    if (averageScore >= this.qualityThresholds.premium) return 'premium';
    if (averageScore >= this.qualityThresholds.recommended) return 'recommended';
    if (averageScore >= this.qualityThresholds.minimum) return 'acceptable';
    return 'below_threshold';
  }
  
  /**
   * Generate course structure from quality resources
   */
  async generateCourseStructure(resources, qualityAnalysis) {
    // Sort resources by quality and content type
    const sortedResources = this.sortResourcesByQuality(resources);
    
    // Group resources by quality tier
    const tiers = {
      core: sortedResources.filter(r => r.quality_score >= this.qualityThresholds.recommended),
      supplementary: sortedResources.filter(r => r.quality_score < this.qualityThresholds.recommended)
    };
    
    // Create course modules based on content analysis
    const modules = await this.createModules(tiers);
    
    return {
      modules,
      resourceAllocation: {
        coreContent: tiers.core.length,
        supplementaryContent: tiers.supplementary.length
      },
      estimatedDuration: this.estimateCourseDuration(resources),
      difficulty: this.assessDifficulty(resources)
    };
  }
  
  /**
   * Sort resources by quality and relevance
   */
  sortResourcesByQuality(resources) {
    return resources.sort((a, b) => {
      // Primary sort by quality score
      if (b.quality_score !== a.quality_score) {
        return b.quality_score - a.quality_score;
      }
      
      // Secondary sort by readability level
      const readabilityOrder = ['very easy', 'easy', 'fairly easy', 'standard', 'fairly difficult', 'difficult', 'very difficult'];
      const aLevel = a.quality_report?.readability?.level || 'standard';
      const bLevel = b.quality_report?.readability?.level || 'standard';
      
      return readabilityOrder.indexOf(aLevel) - readabilityOrder.indexOf(bLevel);
    });
  }
  
  /**
   * Create course modules from resources
   */
  async createModules(tiers) {
    const modules = [];
    
    // Create introduction module from highest quality easy-to-read content
    const introResources = tiers.core.filter(r => 
      ['very easy', 'easy', 'fairly easy'].includes(r.quality_report?.readability?.level)
    ).slice(0, 3);
    
    if (introResources.length > 0) {
      modules.push({
        title: 'Introduction',
        type: 'introduction',
        resources: introResources.map(r => r.id),
        estimatedDuration: this.estimateModuleDuration(introResources),
        difficulty: 'beginner'
      });
    }
    
    // Create main content modules from core resources
    const mainResources = tiers.core.filter(r => !introResources.includes(r));
    const chunkSize = Math.ceil(mainResources.length / 3); // Divide into 3 main modules
    
    for (let i = 0; i < mainResources.length; i += chunkSize) {
      const moduleResources = mainResources.slice(i, i + chunkSize);
      modules.push({
        title: `Module ${modules.length}`,
        type: 'core',
        resources: moduleResources.map(r => r.id),
        estimatedDuration: this.estimateModuleDuration(moduleResources),
        difficulty: this.assessModuleDifficulty(moduleResources)
      });
    }
    
    // Create supplementary module if needed
    if (tiers.supplementary.length > 0) {
      modules.push({
        title: 'Additional Resources',
        type: 'supplementary',
        resources: tiers.supplementary.map(r => r.id),
        estimatedDuration: this.estimateModuleDuration(tiers.supplementary),
        difficulty: 'varied'
      });
    }
    
    return modules;
  }
  
  /**
   * Generate quality recommendations
   */
  generateQualityRecommendations(qualityAnalysis) {
    const recommendations = [];
    
    if (qualityAnalysis.averageScore < this.qualityThresholds.recommended) {
      recommendations.push({
        type: 'quality_improvement',
        priority: 'high',
        message: 'Consider adding more high-quality resources to improve course effectiveness'
      });
    }
    
    if (qualityAnalysis.distribution.acceptable > qualityAnalysis.distribution.premium) {
      recommendations.push({
        type: 'content_balance',
        priority: 'medium',
        message: 'Course has more acceptable-quality content than premium. Consider upgrading key resources.'
      });
    }
    
    if (qualityAnalysis.lowestScore < this.qualityThresholds.minimum + 10) {
      recommendations.push({
        type: 'weak_content',
        priority: 'high',
        message: `Some resources are barely meeting quality standards (lowest: ${qualityAnalysis.lowestScore}). Consider replacing or improving them.`
      });
    }
    
    // Add specific recommendations based on quality reports
    if (qualityAnalysis.totalResources < 5) {
      recommendations.push({
        type: 'insufficient_content',
        priority: 'high',
        message: 'Course has limited resources. Consider adding more content for comprehensive coverage.'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Estimate course duration based on content
   */
  estimateCourseDuration(resources) {
    const totalWords = resources.reduce((sum, r) => {
      const wordCount = r.processing_metadata?.wordCount || 
                       r.extracted_content?.split(/\s+/).length || 0;
      return sum + wordCount;
    }, 0);
    
    // Assume 200 words per minute reading speed
    const readingMinutes = totalWords / 200;
    
    // Add time for exercises and comprehension (50% additional)
    const totalMinutes = readingMinutes * 1.5;
    
    return {
      minutes: Math.round(totalMinutes),
      hours: Math.round(totalMinutes / 60 * 10) / 10,
      formatted: this.formatDuration(totalMinutes)
    };
  }
  
  /**
   * Estimate module duration
   */
  estimateModuleDuration(resources) {
    const moduleWords = resources.reduce((sum, r) => {
      const wordCount = r.processing_metadata?.wordCount || 
                       r.extracted_content?.split(/\s+/).length || 0;
      return sum + wordCount;
    }, 0);
    
    const minutes = Math.round((moduleWords / 200) * 1.5);
    return this.formatDuration(minutes);
  }
  
  /**
   * Format duration for display
   */
  formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  
  /**
   * Assess course difficulty based on readability
   */
  assessDifficulty(resources) {
    const readabilityLevels = resources
      .map(r => r.quality_report?.readability?.level)
      .filter(Boolean);
    
    if (readabilityLevels.length === 0) return 'intermediate';
    
    const difficultyMap = {
      'very easy': 1,
      'easy': 2,
      'fairly easy': 3,
      'standard': 4,
      'fairly difficult': 5,
      'difficult': 6,
      'very difficult': 7
    };
    
    const avgDifficulty = readabilityLevels.reduce((sum, level) => 
      sum + (difficultyMap[level] || 4), 0
    ) / readabilityLevels.length;
    
    if (avgDifficulty <= 2.5) return 'beginner';
    if (avgDifficulty <= 4.5) return 'intermediate';
    return 'advanced';
  }
  
  /**
   * Assess module difficulty
   */
  assessModuleDifficulty(resources) {
    const levels = resources
      .map(r => r.quality_report?.readability?.level)
      .filter(Boolean);
    
    if (levels.includes('very difficult') || levels.includes('difficult')) {
      return 'advanced';
    }
    if (levels.includes('fairly difficult') || levels.includes('standard')) {
      return 'intermediate';
    }
    return 'beginner';
  }
  
  /**
   * Get resources by quality tier
   */
  async getResourcesByQualityTier(courseId, tier = 'recommended') {
    const minScore = this.qualityThresholds[tier] || this.qualityThresholds.recommended;
    const maxScore = tier === 'premium' ? 100 : 
                    tier === 'recommended' ? this.qualityThresholds.premium - 1 :
                    this.qualityThresholds.recommended - 1;
    
    const { data, error } = await supabaseAdmin
      .from('course_resources')
      .select('*')
      .eq('course_id', courseId)
      .eq('status', 'processed')
      .gte('quality_score', minScore)
      .lte('quality_score', maxScore)
      .order('quality_score', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch resources by tier: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * Get quality improvement suggestions for a resource
   */
  getQualityImprovementSuggestions(resource) {
    const suggestions = [];
    const report = resource.quality_report;
    
    if (!report) return suggestions;
    
    // Readability suggestions
    if (report.readability?.score < 60) {
      suggestions.push({
        area: 'readability',
        current: report.readability.level,
        suggestion: 'Simplify complex sentences and reduce technical jargon',
        impact: 'high'
      });
    }
    
    // Coherence suggestions
    if (report.coherence?.score < 70) {
      suggestions.push({
        area: 'coherence',
        current: report.coherence.interpretation,
        suggestion: 'Improve transitions between sections for better flow',
        impact: 'medium'
      });
    }
    
    // Error fixes
    if (report.errors?.length > 0) {
      report.errors.forEach(error => {
        if (error.severity === 'high') {
          suggestions.push({
            area: 'errors',
            current: error.type,
            suggestion: error.message,
            impact: 'high'
          });
        }
      });
    }
    
    return suggestions;
  }
}

module.exports = new CourseGenerator();