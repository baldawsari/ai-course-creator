import Bull from 'bull';
import { env } from '../config/environment';
import { processFileJob } from './processors/fileProcessor';
import { generateCourseJob } from './processors/courseGenerator';
import { exportCourseJob } from './processors/courseExporter';

// Queue configuration
const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.BULL_REDIS_DB || 1,
};

// Create queues
export const fileProcessingQueue = new Bull('file-processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const courseGenerationQueue = new Bull('course-generation', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 50,
    attempts: 2,
    timeout: 300000, // 5 minutes
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const courseExportQueue = new Bull('course-export', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    timeout: 120000, // 2 minutes
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
});

// Process jobs
fileProcessingQueue.process(env.QUEUE_CONCURRENCY || 5, processFileJob);
courseGenerationQueue.process(2, generateCourseJob); // Lower concurrency for heavy AI tasks
courseExportQueue.process(env.QUEUE_CONCURRENCY || 5, exportCourseJob);

// Queue event handlers
fileProcessingQueue.on('completed', (job) => {
  console.log(`File processing job ${job.id} completed for file: ${job.data.fileName}`);
});

fileProcessingQueue.on('failed', (job, err) => {
  console.error(`File processing job ${job?.id} failed:`, err);
});

courseGenerationQueue.on('completed', (job) => {
  console.log(`Course generation job ${job.id} completed for course: ${job.data.courseId}`);
});

courseGenerationQueue.on('failed', (job, err) => {
  console.error(`Course generation job ${job?.id} failed:`, err);
});

courseExportQueue.on('completed', (job) => {
  console.log(`Course export job ${job.id} completed for format: ${job.data.format}`);
});

courseExportQueue.on('failed', (job, err) => {
  console.error(`Course export job ${job?.id} failed:`, err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing queues...');
  
  await Promise.all([
    fileProcessingQueue.close(),
    courseGenerationQueue.close(),
    courseExportQueue.close(),
  ]);
  
  process.exit(0);
});

// Start worker
console.log('🚀 Worker started and listening for jobs...');
console.log(`📦 Redis connection: ${env.REDIS_HOST}:${env.REDIS_PORT}`);
console.log(`⚡ Processing with concurrency: ${env.QUEUE_CONCURRENCY || 5}`);

// Keep the process alive
process.stdin.resume();