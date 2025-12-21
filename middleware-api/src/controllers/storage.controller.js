import StorageService from '../services/storage.service.js';
import logger from '../utils/logger.js';

/**
 * Storage Controller
 *
 * Handles file upload and retrieval endpoints
 * Acts as Content-Addressable Storage (CAS) API
 */

/**
 * Upload file endpoint
 * POST /api/storage/upload
 *
 * Accepts: multipart/form-data with 'file' field
 * Returns: { hash, size, metadata }
 *
 * Security: File is encrypted at rest using AES-256-GCM
 */
export const uploadFile = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'No file uploaded',
        error: {
          code: 'NO_FILE',
          details: 'Please provide a file in the request',
        },
      });
    }

    const file = req.file;

    // Prepare metadata
    const metadata = {
      originalName: file.originalname,
      mimeType: file.mimetype,
      fieldName: file.fieldname,
      encoding: file.encoding,
      size: file.size,
      uploadedBy: req.user?.userId || 'anonymous', // From JWT middleware
      uploadedByRole: req.user?.role || 'unknown',
    };

    // Upload file using storage service (now takes file path instead of buffer)
    const result = await StorageService.getInstance().uploadFile(file.path, metadata);

    logger.info(`File uploaded: ${result.hash} (${result.isDuplicate ? 'duplicate' : 'new'})`);

    return res.status(result.isDuplicate ? 200 : 201).json({
      status: 'success',
      statusCode: result.isDuplicate ? 200 : 201,
      message: result.isDuplicate
        ? 'File already exists (deduplicated)'
        : 'File uploaded and encrypted successfully',
      data: {
        hash: result.hash,
        size: result.size,
        isDuplicate: result.isDuplicate,
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        encrypted: true,
        downloadUrl: `/api/storage/${result.hash}`,
      },
    });
  } catch (error) {
    logger.error('❌ Upload file error:', error);
    return res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: 'File upload failed',
      error: {
        code: 'UPLOAD_FAILED',
        details: error.message,
      },
    });
  }
};

/**
 * Download/View file endpoint
 * GET /api/storage/:hash
 *
 * Returns: File stream with correct MIME type
 */
export const getFile = async (req, res) => {
  try {
    const { hash } = req.params;

    // Validate hash format
    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Invalid hash format',
        error: {
          code: 'INVALID_HASH',
          details: 'Hash must be 64 hexadecimal characters (SHA-256)',
        },
      });
    }

    // Get file metadata first
    const metadata = await StorageService.getInstance().getMetadata(hash);

    if (!metadata) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'File not found',
        error: {
          code: 'FILE_NOT_FOUND',
          details: `No file found with hash: ${hash}`,
        },
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${metadata.originalName}"`);
    res.setHeader('X-Content-Hash', hash);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year (immutable)

    // Stream file to response
    const fileStream = StorageService.getInstance().getFileStream(hash);

    fileStream.on('error', (error) => {
      logger.error('❌ Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          status: 'error',
          statusCode: 500,
          message: 'File streaming failed',
          error: {
            code: 'STREAM_ERROR',
            details: error.message,
          },
        });
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    logger.error('❌ Get file error:', error);

    if (!res.headersSent) {
      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'File retrieval failed',
        error: {
          code: 'RETRIEVAL_FAILED',
          details: error.message,
        },
      });
    }
  }
};

/**
 * Get file metadata only (without downloading)
 * GET /api/storage/:hash/metadata
 */
export const getMetadata = async (req, res) => {
  try {
    const { hash } = req.params;

    const metadata = await StorageService.getInstance().getMetadata(hash);

    if (!metadata) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Metadata not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      statusCode: 200,
      data: metadata,
    });
  } catch (error) {
    logger.error('❌ Get metadata error:', error);
    return res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: 'Failed to retrieve metadata',
      error: {
        code: 'METADATA_ERROR',
        details: error.message,
      },
    });
  }
};

/**
 * Get storage statistics (admin only)
 * GET /api/storage/stats
 */
export const getStats = async (req, res) => {
  try {
    // TODO: Add admin-only middleware check
    const stats = StorageService.getInstance().getStats();

    return res.status(200).json({
      status: 'success',
      statusCode: 200,
      data: stats,
    });
  } catch (error) {
    logger.error('❌ Get stats error:', error);
    return res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: 'Failed to retrieve statistics',
      error: {
        code: 'STATS_ERROR',
        details: error.message,
      },
    });
  }
};

/**
 * Delete file (admin only)
 * DELETE /api/storage/:hash
 */
export const deleteFile = async (req, res) => {
  try {
    // TODO: Add admin-only middleware check
    const { hash } = req.params;

    const deleted = await StorageService.getInstance().deleteFile(hash);

    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'File not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'File deleted successfully',
      data: { hash },
    });
  } catch (error) {
    logger.error('❌ Delete file error:', error);
    return res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: 'File deletion failed',
      error: {
        code: 'DELETE_FAILED',
        details: error.message,
      },
    });
  }
};
