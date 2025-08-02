import { Job } from 'bull';
import { supabaseAdmin } from '../../config/database';
const courseGenerator = require('../../services/courseGenerator');
const { ragPipeline } = require('../../services/ragPipeline');

interface CourseGenerationData {
  courseId: string;
  userId: string;
  title: string;
  description: string;
  learningObjectives: string[];
  targetAudience: string;
  duration: number;
  resourceIds: string[];
  settings: {
    depth: 'beginner' | 'intermediate' | 'advanced';
    includeExercises: boolean;
    includeQuizzes: boolean;
    visualComplexity: 'simple' | 'moderate' | 'detailed';
  };
}

export async function generateCourseJob(job: Job<CourseGenerationData>) {
  const { courseId, userId: _userId, title, resourceIds, settings } = job.data;

  try {
    // Update job progress
    await job.progress(5);

    // Update course status
    await supabaseAdmin
      .from('courses')
      .update({
        generation_status: 'processing',
        generation_started_at: new Date().toISOString(),
      })
      .eq('id', courseId);

    // Initialize RAG pipeline
    await job.progress(10);
    const collection = `course_${courseId}`;
    await ragPipeline.initialize(collection);

    // Retrieve and analyze uploaded documents
    await job.progress(20);
    const relevantContent = await ragPipeline.retrieveRelevantContent(
      `Course content for: ${title}`,
      {
        topK: 50,
        minScore: 0.7,
      }
    );

    // Generate course structure
    await job.progress(40);
    const courseStructure = await courseGenerator.generateCourseStructure({
      title: job.data.title,
      description: job.data.description,
      learningObjectives: job.data.learningObjectives,
      targetAudience: job.data.targetAudience,
      duration: job.data.duration,
      depth: settings.depth,
      relevantContent,
    });

    // Generate content for each module
    await job.progress(60);
    const modules = await courseGenerator.generateModules(
      courseStructure,
      relevantContent,
      settings
    );

    // Generate assessments if requested
    let assessments = null;
    if (settings.includeQuizzes || settings.includeExercises) {
      await job.progress(80);
      assessments = await courseGenerator.generateAssessments(
        modules,
        settings
      );
    }

    // Save generated content
    await job.progress(90);
    const content = {
      structure: courseStructure,
      modules,
      assessments,
      metadata: {
        generatedAt: new Date().toISOString(),
        settings,
        sourceDocuments: resourceIds.length,
      },
    };

    await supabaseAdmin
      .from('courses')
      .update({
        content,
        generation_status: 'completed',
        generation_completed_at: new Date().toISOString(),
      })
      .eq('id', courseId);

    await job.progress(100);

    return {
      success: true,
      courseId,
      modulesGenerated: modules.length,
      assessmentsGenerated: assessments?.length || 0,
    };
  } catch (error) {
    console.error('Course generation error:', error);

    // Update course status to failed
    await supabaseAdmin
      .from('courses')
      .update({
        generation_status: 'failed',
        generation_error: error instanceof Error ? error.message : 'Unknown error',
        generation_completed_at: new Date().toISOString(),
      })
      .eq('id', courseId);

    throw error;
  }
}