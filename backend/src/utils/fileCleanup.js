const fs = require('fs').promises;
const path = require('path');
const { supabaseAdmin } = require('../config/database');

/**
 * File cleanup utility for managing temporary files and storage
 */
class FileCleanup {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp-uploads');
    this.maxTempAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  /**
   * Clean up old temporary files
   */
  async cleanupTempFiles() {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        try {
          const filePath = path.join(this.tempDir, file);
          const stats = await fs.stat(filePath);
          
          // Delete files older than maxTempAge
          if (now - stats.mtime.getTime() > this.maxTempAge) {
            await fs.unlink(filePath);
            cleaned++;
            console.log(`Cleaned up temp file: ${file}`);
          }
        } catch (error) {
          console.warn(`Failed to process temp file ${file}:`, error.message);
        }
      }

      console.log(`Temp cleanup completed: ${cleaned} files removed`);
      return cleaned;

    } catch (error) {
      console.error('Temp cleanup failed:', error.message);
      return 0;
    }
  }

  /**
   * Clean up orphaned database records (files that failed processing)
   */
  async cleanupOrphanedRecords() {
    try {
      const oneDayAgo = new Date(Date.now() - this.maxTempAge);
      
      // Find files stuck in 'uploaded' or 'processing' status for more than 24 hours
      const { data: orphanedFiles, error } = await supabaseAdmin
        .from('course_resources')
        .select('id, storage_path, status')
        .in('status', ['uploaded', 'processing'])
        .lt('created_at', oneDayAgo.toISOString());

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      let cleaned = 0;
      for (const file of orphanedFiles || []) {
        try {
          // Delete from storage if it's a temp file
          if (file.storage_path && file.storage_path.includes('temp-uploads')) {
            try {
              await fs.unlink(file.storage_path);
            } catch (fsError) {
              console.warn(`Failed to delete temp file ${file.storage_path}:`, fsError.message);
            }
          }

          // Update status to failed
          await supabaseAdmin
            .from('course_resources')
            .update({ 
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', file.id);

          cleaned++;
          console.log(`Marked orphaned record as failed: ${file.id}`);

        } catch (recordError) {
          console.warn(`Failed to cleanup record ${file.id}:`, recordError.message);
        }
      }

      console.log(`Orphaned records cleanup completed: ${cleaned} records updated`);
      return cleaned;

    } catch (error) {
      console.error('Orphaned records cleanup failed:', error.message);
      return 0;
    }
  }

  /**
   * Verify storage file integrity
   */
  async verifyStorageIntegrity() {
    try {
      // Get all processed files
      const { data: files, error } = await supabaseAdmin
        .from('course_resources')
        .select('id, storage_path, status')
        .eq('status', 'processed');

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      let verified = 0;
      let issues = 0;

      for (const file of files || []) {
        try {
          if (file.storage_path && file.storage_path.startsWith('courses/')) {
            // Check if file exists in Supabase Storage
            const { data, error: storageError } = await supabaseAdmin.storage
              .from('course-files')
              .list(path.dirname(file.storage_path), {
                search: path.basename(file.storage_path),
              });

            if (storageError || !data || data.length === 0) {
              console.warn(`Storage file not found: ${file.storage_path}`);
              issues++;
              
              // Mark as failed
              await supabaseAdmin
                .from('course_resources')
                .update({ 
                  status: 'failed',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', file.id);
            } else {
              verified++;
            }
          }
        } catch (verifyError) {
          console.warn(`Failed to verify file ${file.id}:`, verifyError.message);
          issues++;
        }
      }

      console.log(`Storage verification completed: ${verified} verified, ${issues} issues found`);
      return { verified, issues };

    } catch (error) {
      console.error('Storage verification failed:', error.message);
      return { verified: 0, issues: 0 };
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats() {
    try {
      // Count temp files
      const tempFiles = await fs.readdir(this.tempDir);
      const tempCount = tempFiles.length;

      // Count database records by status
      const { data: statusCounts, error } = await supabaseAdmin
        .from('course_resources')
        .select('status')
        .then(({ data, error }) => {
          if (error) return { data: null, error };
          
          const counts = data.reduce((acc, record) => {
            acc[record.status] = (acc[record.status] || 0) + 1;
            return acc;
          }, {});
          
          return { data: counts, error: null };
        });

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      return {
        tempFiles: tempCount,
        databaseRecords: statusCounts || {},
        lastCleanup: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Failed to get cleanup stats:', error.message);
      return {
        tempFiles: 0,
        databaseRecords: {},
        lastCleanup: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Run full cleanup process
   */
  async runFullCleanup() {
    console.log('🧹 Starting full cleanup process...');
    
    const results = {
      tempFiles: 0,
      orphanedRecords: 0,
      storageIssues: 0,
      startTime: new Date().toISOString(),
      endTime: null,
      success: true,
    };

    try {
      // Clean temp files
      results.tempFiles = await this.cleanupTempFiles();
      
      // Clean orphaned records
      results.orphanedRecords = await this.cleanupOrphanedRecords();
      
      // Verify storage integrity
      const verification = await this.verifyStorageIntegrity();
      results.storageIssues = verification.issues;

      results.endTime = new Date().toISOString();
      console.log('🎉 Full cleanup completed successfully');
      
      return results;

    } catch (error) {
      console.error('❌ Full cleanup failed:', error.message);
      results.success = false;
      results.error = error.message;
      results.endTime = new Date().toISOString();
      
      return results;
    }
  }
}

// Create singleton instance
const fileCleanup = new FileCleanup();

// Schedule periodic cleanup (if running as main process)
if (require.main === module) {
  // Run cleanup every 6 hours
  const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
  
  console.log('🚀 Starting file cleanup scheduler...');
  
  // Run initial cleanup
  fileCleanup.runFullCleanup();
  
  // Schedule periodic cleanups
  setInterval(() => {
    fileCleanup.runFullCleanup();
  }, CLEANUP_INTERVAL);
  
  console.log(`📅 Cleanup scheduled every ${CLEANUP_INTERVAL / 1000 / 60 / 60} hours`);
}

module.exports = { fileCleanup, FileCleanup };