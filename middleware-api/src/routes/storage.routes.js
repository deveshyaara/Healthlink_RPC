import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { authenticateJWT, requireAdmin } from '../middleware/auth.middleware.js';
import * as storageController from '../controllers/storage.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

/**
 * Secure Multer Configuration for HIPAA Compliance
 *
 * Storage: Disk storage (prevents RAM crashes on large files)
 * Limits: 500MB max file size (medical imaging, videos)
 * File Filter: Accept medical document formats + video
 * Security: Files saved to temp/ then encrypted to uploads/
 */

// Temp directory for uploads (before encryption)
const tempDir = process.env.TEMP_DIR
  ? path.join(__dirname, '../../', process.env.TEMP_DIR)
  : path.join(__dirname, '../../temp');

// Configure disk storage (prevents memory crashes)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Use timestamp + random string for temp filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `temp-${uniqueSuffix}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Allowed MIME types for medical documents + video
  const allowedMimeTypes = [
    'application/pdf',              // PDF documents
    'image/jpeg',                   // JPEG images
    'image/jpg',                    // JPG images
    'image/png',                    // PNG images
    'image/gif',                    // GIF images
    'application/msword',           // Word .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word .docx
    'application/vnd.ms-excel',     // Excel .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',      // Excel .xlsx
    'text/plain',                   // Text files
    'application/dicom',            // DICOM medical images
    'image/tiff',                   // TIFF images
    'video/mp4',                    // MP4 videos
    'video/quicktime',              // MOV videos
    'video/x-msvideo',              // AVI videos
    'video/webm',                    // WebM videos
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only medical document formats are allowed.`), false);
  }
};

// Get max file size from env (default 500MB for medical imaging)
const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB) || 500;
const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

const upload = multer({
  storage: storage,  // Disk storage (not memory)
  limits: {
    fileSize: maxFileSizeBytes,  // 500MB default
    files: 1,                     // Single file per request
  },
  fileFilter: fileFilter,
});

/**
 * Storage Routes
 */

// Upload file (authenticated users only)
router.post('/upload', authenticateJWT, upload.single('file'), storageController.uploadFile);

// Download/View file by hash (public or authenticated based on requirements)
// For now, using authentication to ensure only authorized users can access files
router.get('/:hash', authenticateJWT, storageController.getFile);

// Get file metadata without downloading
router.get('/:hash/metadata', authenticateJWT, storageController.getMetadata);

// Get storage statistics (admin only)
router.get('/admin/stats', authenticateJWT, requireAdmin, storageController.getStats);

// Delete file (admin only)
router.delete('/:hash', authenticateJWT, requireAdmin, storageController.deleteFile);

/**
 * Error handler for multer
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    // Multer-specific errors
    let message = 'File upload error';
    let code = 'UPLOAD_ERROR';

    if (error.code === 'LIMIT_FILE_SIZE') {
      message = `File size exceeds ${maxFileSizeMB}MB limit`;
      code = 'FILE_TOO_LARGE';
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files. Only 1 file allowed per request';
      code = 'TOO_MANY_FILES';
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected field name. Use "file" as the field name';
      code = 'INVALID_FIELD_NAME';
    }

    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message,
      error: {
        code,
        details: error.message,
      },
    });
  } else if (error) {
    // Other errors (e.g., file type validation)
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: error.message || 'File upload failed',
      error: {
        code: 'UPLOAD_FAILED',
        details: error.message,
      },
    });
  }
  next();
});

export default router;
