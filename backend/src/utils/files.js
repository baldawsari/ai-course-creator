const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const mime = require('mime-types');
const logger = require('./logger');

/**
 * File utilities for type detection, size calculation, path manipulation, and temporary file management
 */

// File type mappings
const FILE_TYPE_MAPPINGS = {
  // Documents
  'application/pdf': { ext: 'pdf', category: 'document', icon: '📄' },
  'application/msword': { ext: 'doc', category: 'document', icon: '📄' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', category: 'document', icon: '📄' },
  'text/plain': { ext: 'txt', category: 'document', icon: '📝' },
  'text/markdown': { ext: 'md', category: 'document', icon: '📝' },
  'text/x-markdown': { ext: 'md', category: 'document', icon: '📝' },
  'application/rtf': { ext: 'rtf', category: 'document', icon: '📄' },
  
  // Spreadsheets
  'application/vnd.ms-excel': { ext: 'xls', category: 'spreadsheet', icon: '📊' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', category: 'spreadsheet', icon: '📊' },
  'text/csv': { ext: 'csv', category: 'spreadsheet', icon: '📊' },
  
  // Presentations
  'application/vnd.ms-powerpoint': { ext: 'ppt', category: 'presentation', icon: '📽️' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: 'pptx', category: 'presentation', icon: '📽️' },
  
  // Images
  'image/jpeg': { ext: 'jpg', category: 'image', icon: '🖼️' },
  'image/png': { ext: 'png', category: 'image', icon: '🖼️' },
  'image/gif': { ext: 'gif', category: 'image', icon: '🖼️' },
  'image/webp': { ext: 'webp', category: 'image', icon: '🖼️' },
  'image/svg+xml': { ext: 'svg', category: 'image', icon: '🖼️' },
  
  // Code/Data
  'application/json': { ext: 'json', category: 'data', icon: '{ }' },
  'application/xml': { ext: 'xml', category: 'data', icon: '< >' },
  'text/xml': { ext: 'xml', category: 'data', icon: '< >' },
  'application/x-yaml': { ext: 'yaml', category: 'data', icon: '📋' },
  'text/yaml': { ext: 'yml', category: 'data', icon: '📋' },
  
  // Archives
  'application/zip': { ext: 'zip', category: 'archive', icon: '🗜️' },
  'application/x-rar-compressed': { ext: 'rar', category: 'archive', icon: '🗜️' },
  'application/x-7z-compressed': { ext: '7z', category: 'archive', icon: '🗜️' },
  'application/x-tar': { ext: 'tar', category: 'archive', icon: '🗜️' },
  'application/gzip': { ext: 'gz', category: 'archive', icon: '🗜️' }
};

// Size units for formatting
const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/**
 * Detect file type from file path or buffer
 * @param {string|Buffer} input - File path or buffer
 * @param {Object} options - Detection options
 * @returns {Promise<Object>} File type information
 */
async function detectFileType(input, options = {}) {
  try {
    let mimeType = null;
    let extension = null;
    let fileName = null;

    if (typeof input === 'string') {
      // Input is a file path
      fileName = path.basename(input);
      extension = path.extname(input).toLowerCase().substring(1);
      
      // Try to detect MIME type from extension
      mimeType = mime.lookup(input);
      
      // If MIME type detection fails, read file magic number
      if (!mimeType && options.checkMagicNumber !== false) {
        try {
          const buffer = await fs.readFile(input);
          mimeType = detectMimeFromBuffer(buffer);
        } catch (error) {
          logger.warn('Failed to read file for magic number detection:', error.message);
        }
      }
    } else if (Buffer.isBuffer(input)) {
      // Input is a buffer
      mimeType = detectMimeFromBuffer(input);
      
      // Try to get extension from MIME type
      if (mimeType) {
        extension = mime.extension(mimeType);
      }
    }

    // Get file type info from mapping
    const typeInfo = FILE_TYPE_MAPPINGS[mimeType] || {};
    
    // Determine category if not in mapping
    let category = typeInfo.category;
    if (!category && mimeType) {
      if (mimeType.startsWith('text/')) {
        category = 'document';
      } else if (mimeType.startsWith('image/')) {
        category = 'image';
      } else if (mimeType.startsWith('video/')) {
        category = 'video';
      } else if (mimeType.startsWith('audio/')) {
        category = 'audio';
      } else if (mimeType.startsWith('application/')) {
        category = 'application';
      }
    }

    return {
      mimeType: mimeType || 'application/octet-stream',
      extension: extension || typeInfo.ext || 'bin',
      category: category || 'unknown',
      icon: typeInfo.icon || '📎',
      fileName,
      isText: category === 'document' || (mimeType && mimeType.startsWith('text/')),
      isBinary: !category || category === 'image' || category === 'video' || category === 'audio' || category === 'archive'
    };
  } catch (error) {
    logger.error('File type detection error:', error);
    return {
      mimeType: 'application/octet-stream',
      extension: 'bin',
      category: 'unknown',
      icon: '📎',
      isText: false,
      isBinary: true
    };
  }
}

/**
 * Detect MIME type from buffer using magic numbers
 * @param {Buffer} buffer - File buffer
 * @returns {string|null} MIME type
 */
function detectMimeFromBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return null;
  }

  // Check magic numbers
  const magic = buffer.toString('hex', 0, 4).toUpperCase();
  
  // PDF
  if (magic === '25504446') {
    return 'application/pdf';
  }
  
  // ZIP-based formats
  if (magic === '504B0304' || magic === '504B0506' || magic === '504B0708') {
    // Could be ZIP, DOCX, XLSX, etc.
    // Check for specific Office formats by looking for content types
    if (buffer.includes('[Content_Types].xml')) {
      if (buffer.includes('word/')) {
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (buffer.includes('xl/')) {
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (buffer.includes('ppt/')) {
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      }
    }
    return 'application/zip';
  }
  
  // JPEG
  if (magic.startsWith('FFD8FF')) {
    return 'image/jpeg';
  }
  
  // PNG
  if (magic === '89504E47') {
    return 'image/png';
  }
  
  // GIF
  if (magic.startsWith('47494638')) {
    return 'image/gif';
  }
  
  // Check text patterns
  const textBuffer = buffer.slice(0, Math.min(buffer.length, 512));
  const text = textBuffer.toString('utf8', 0, textBuffer.length);
  
  // JSON
  if (text.trimStart().startsWith('{') || text.trimStart().startsWith('[')) {
    try {
      JSON.parse(text);
      return 'application/json';
    } catch (e) {
      // Not valid JSON
    }
  }
  
  // XML/HTML
  if (text.trimStart().startsWith('<?xml') || text.trimStart().startsWith('<')) {
    return 'text/xml';
  }
  
  // Plain text (if mostly printable ASCII)
  const printableChars = text.match(/[\x20-\x7E\t\n\r]/g);
  if (printableChars && printableChars.length / textBuffer.length > 0.8) {
    return 'text/plain';
  }
  
  return null;
}

/**
 * Format file size for human readability
 * @param {number} bytes - File size in bytes
 * @param {Object} options - Formatting options
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes, options = {}) {
  const {
    precision = 2,
    binary = false,
    separator = ' '
  } = options;

  if (bytes === 0) return `0${separator}${SIZE_UNITS[0]}`;
  if (!Number.isFinite(bytes)) return 'Unknown';

  const base = binary ? 1024 : 1000;
  const unitIndex = Math.floor(Math.log(Math.abs(bytes)) / Math.log(base));
  const value = bytes / Math.pow(base, unitIndex);
  
  const formattedValue = value.toFixed(precision);
  const unit = SIZE_UNITS[Math.min(unitIndex, SIZE_UNITS.length - 1)] + (binary && unitIndex > 0 ? 'i' : '');
  
  return `${formattedValue}${separator}${unit}`;
}

/**
 * Calculate total size of files in directory
 * @param {string} dirPath - Directory path
 * @param {Object} options - Calculation options
 * @returns {Promise<Object>} Size information
 */
async function calculateDirectorySize(dirPath, options = {}) {
  const {
    includeHidden = false,
    maxDepth = Infinity,
    filter = () => true
  } = options;

  let totalSize = 0;
  let fileCount = 0;
  let dirCount = 0;

  async function processDirectory(dir, depth = 0) {
    if (depth > maxDepth) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!includeHidden && entry.name.startsWith('.')) continue;

        const fullPath = path.join(dir, entry.name);

        if (!filter(fullPath, entry)) continue;

        if (entry.isDirectory()) {
          dirCount++;
          await processDirectory(fullPath, depth + 1);
        } else if (entry.isFile()) {
          fileCount++;
          try {
            const stats = await fs.stat(fullPath);
            totalSize += stats.size;
          } catch (error) {
            logger.warn(`Failed to stat file ${fullPath}:`, error.message);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to read directory ${dir}:`, error.message);
    }
  }

  await processDirectory(dirPath);

  return {
    totalSize,
    formattedSize: formatFileSize(totalSize),
    fileCount,
    dirCount,
    averageFileSize: fileCount > 0 ? totalSize / fileCount : 0
  };
}

/**
 * Sanitize file name for safe storage
 * @param {string} fileName - Original file name
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized file name
 */
function sanitizeFileName(fileName, options = {}) {
  const {
    maxLength = 255,
    replacement = '_',
    preserveExtension = true
  } = options;

  if (!fileName || typeof fileName !== 'string') {
    return 'unnamed';
  }

  let baseName = fileName;
  let extension = '';

  if (preserveExtension) {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot > 0) {
      extension = fileName.substring(lastDot);
      baseName = fileName.substring(0, lastDot);
    }
  }

  // Remove or replace invalid characters
  let sanitized = baseName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, replacement) // Invalid on Windows
    .replace(/^\.+/, replacement) // No leading dots
    .replace(/[\s.]+$/, '') // No trailing spaces or dots
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  // Handle reserved names (Windows)
  const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  if (reserved.includes(sanitized.toUpperCase())) {
    sanitized = `${replacement}${sanitized}`;
  }

  // Ensure not empty
  if (!sanitized) {
    sanitized = 'file';
  }

  // Add extension back
  let result = sanitized + extension;

  // Enforce max length
  if (result.length > maxLength) {
    const availableLength = maxLength - extension.length;
    sanitized = sanitized.substring(0, Math.max(1, availableLength));
    result = sanitized + extension;
  }

  return result;
}

/**
 * Generate unique file name
 * @param {string} baseName - Base file name
 * @param {Object} options - Generation options
 * @returns {string} Unique file name
 */
function generateUniqueFileName(baseName, options = {}) {
  const {
    separator = '_',
    useTimestamp = true,
    useRandom = true,
    randomLength = 6
  } = options;

  const sanitized = sanitizeFileName(baseName);
  const ext = path.extname(sanitized);
  const nameWithoutExt = path.basename(sanitized, ext);

  let unique = nameWithoutExt;

  if (useTimestamp) {
    unique += `${separator}${Date.now()}`;
  }

  if (useRandom) {
    const random = crypto.randomBytes(randomLength).toString('hex').substring(0, randomLength);
    unique += `${separator}${random}`;
  }

  return unique + ext;
}

/**
 * Create temporary file path
 * @param {Object} options - Path options
 * @returns {Promise<string>} Temporary file path
 */
async function createTempFilePath(options = {}) {
  const {
    prefix = 'tmp',
    suffix = '',
    dir = null,
    extension = '.tmp'
  } = options;

  const tmpDir = dir || require('os').tmpdir();
  const fileName = `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${suffix}${extension}`;
  
  return path.join(tmpDir, fileName);
}

/**
 * Clean up old temporary files
 * @param {string} directory - Directory to clean
 * @param {Object} options - Cleanup options
 * @returns {Promise<Object>} Cleanup results
 */
async function cleanupTempFiles(directory, options = {}) {
  const {
    maxAge = 24 * 60 * 60 * 1000, // 24 hours
    pattern = /^tmp_/,
    dryRun = false
  } = options;

  const now = Date.now();
  const results = {
    scanned: 0,
    deleted: 0,
    failed: 0,
    totalSize: 0
  };

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!pattern.test(entry.name)) continue;

      results.scanned++;

      const filePath = path.join(directory, entry.name);

      try {
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();

        if (age > maxAge) {
          results.totalSize += stats.size;

          if (!dryRun) {
            await fs.unlink(filePath);
            results.deleted++;
            logger.info(`Deleted old temp file: ${entry.name}`);
          }
        }
      } catch (error) {
        results.failed++;
        logger.error(`Failed to process temp file ${entry.name}:`, error.message);
      }
    }
  } catch (error) {
    logger.error('Temp file cleanup error:', error);
  }

  return results;
}

/**
 * Get file metadata
 * @param {string} filePath - File path
 * @returns {Promise<Object>} File metadata
 */
async function getFileMetadata(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const { mimeType, extension, category, icon } = await detectFileType(filePath);

    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      formattedSize: formatFileSize(stats.size),
      mimeType,
      extension,
      category,
      icon,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      permissions: {
        readable: stats.mode & 0o400,
        writable: stats.mode & 0o200,
        executable: stats.mode & 0o100
      }
    };
  } catch (error) {
    logger.error('Failed to get file metadata:', error);
    throw error;
  }
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 * @returns {Promise<void>}
 */
async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Copy file with progress callback
 * @param {string} source - Source file path
 * @param {string} destination - Destination file path
 * @param {Object} options - Copy options
 * @returns {Promise<void>}
 */
async function copyFileWithProgress(source, destination, options = {}) {
  const {
    onProgress = () => {},
    bufferSize = 64 * 1024 // 64KB chunks
  } = options;

  const sourceStats = await fs.stat(source);
  const totalSize = sourceStats.size;
  let copiedSize = 0;

  const readStream = require('fs').createReadStream(source, { highWaterMark: bufferSize });
  const writeStream = require('fs').createWriteStream(destination);

  return new Promise((resolve, reject) => {
    readStream.on('data', (chunk) => {
      copiedSize += chunk.length;
      const progress = (copiedSize / totalSize) * 100;
      onProgress(progress, copiedSize, totalSize);
    });

    readStream.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', resolve);

    readStream.pipe(writeStream);
  });
}

module.exports = {
  detectFileType,
  formatFileSize,
  calculateDirectorySize,
  sanitizeFileName,
  generateUniqueFileName,
  createTempFilePath,
  cleanupTempFiles,
  getFileMetadata,
  ensureDirectory,
  copyFileWithProgress,
  detectMimeFromBuffer,
  FILE_TYPE_MAPPINGS,
  SIZE_UNITS
};