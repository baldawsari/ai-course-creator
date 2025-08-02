import { Job } from 'bull';
import { supabaseAdmin } from '../../config/database';
const htmlExporter = require('../../services/htmlExporter');
const pdfGenerator = require('../../services/pdfGenerator');
const pptGenerator = require('../../services/pptGenerator');
import * as fs from 'fs/promises';

interface CourseExportData {
  exportId: string;
  courseId: string;
  userId: string;
  format: 'html' | 'pdf' | 'pptx';
  options: {
    includeNotes?: boolean;
    includeExercises?: boolean;
    includeAnswers?: boolean;
    template?: string;
  };
}

export async function exportCourseJob(job: Job<CourseExportData>) {
  const { exportId, courseId, userId, format, options } = job.data;

  try {
    // Update job progress
    await job.progress(10);

    // Update export status
    await supabaseAdmin
      .from('course_exports')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', exportId);

    // Fetch course data
    await job.progress(20);
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      throw new Error('Course not found');
    }

    // Generate export based on format
    await job.progress(40);
    let exportPath: string;
    let fileSize: number;

    switch (format) {
      case 'html':
        exportPath = await htmlExporter.exportCourse(course, options);
        break;
      case 'pdf':
        exportPath = await pdfGenerator.generatePDF(course, options);
        break;
      case 'pptx':
        exportPath = await pptGenerator.generatePresentation(course, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    await job.progress(70);

    // Get file stats
    const stats = await fs.stat(exportPath);
    fileSize = stats.size;

    // Upload to storage
    await job.progress(80);
    const fileName = `${course.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${format}`;
    const storagePath = `exports/${userId}/${courseId}/${fileName}`;

    const fileBuffer = await fs.readFile(exportPath);
    const { error: uploadError } = await supabaseAdmin.storage
      .from('course-exports')
      .upload(storagePath, fileBuffer, {
        contentType: getContentType(format),
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('course-exports')
      .getPublicUrl(storagePath);

    // Update export record
    await job.progress(90);
    await supabaseAdmin
      .from('course_exports')
      .update({
        status: 'completed',
        file_url: urlData.publicUrl,
        file_size: fileSize,
        storage_path: storagePath,
        completed_at: new Date().toISOString(),
      })
      .eq('id', exportId);

    // Clean up temporary file
    await fs.unlink(exportPath).catch(console.error);

    await job.progress(100);

    return {
      success: true,
      exportId,
      fileUrl: urlData.publicUrl,
      fileSize,
      format,
    };
  } catch (error) {
    console.error('Course export error:', error);

    // Update export status to failed
    await supabaseAdmin
      .from('course_exports')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', exportId);

    throw error;
  }
}

function getContentType(format: string): string {
  switch (format) {
    case 'html':
      return 'text/html';
    case 'pdf':
      return 'application/pdf';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    default:
      return 'application/octet-stream';
  }
}