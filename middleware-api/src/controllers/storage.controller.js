import StorageService from '../services/storage.service.js';
import logger from '../utils/logger.js';

/**
 * Storage Controller
 *
 * Handles file upload and retrieval endpoints
 * Storage: Pinata IPFS for medical records
 */

/**
 * Upload file endpoint
 * POST /api/storage/upload
 *
 * Accepts: multipart/form-data with 'file' field
 * Returns: { hash: IPFS_CID, size, metadata }
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

    // Upload file to Pinata IPFS
    const result = await StorageService.getInstance().uploadFile(file.path, metadata);

    logger.info(`File uploaded to Pinata: ${result.hash}`);

    return res.status(201).json({
      status: 'success',
      statusCode: 201,
      message: 'File uploaded to IPFS successfully',
      data: {
        hash: result.hash,  // IPFS CID
        size: result.size,
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        ipfs: true,
        downloadUrl: `/api/storage/${result.hash}`,
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${result.hash}`,
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
 * Returns: File stream from Pinata IPFS gateway
 * Accepts IPFS CIDs (Qm... or bafy...)
 */
export const getFile = async (req, res) => {
  try {
    const { hash } = req.params;

    // Validate hash exists
    if (!hash || hash.length < 10) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Invalid hash format',
        error: {
          code: 'INVALID_HASH',
          details: 'IPFS CID is required',
        },
      });
    }

    logger.info(`Fetching file from Pinata IPFS: ${hash}`);

    // Try to get metadata for filename
    let metadata;
    try {
      metadata = await StorageService.getInstance().getMetadata(hash);
    } catch (err) {
      logger.warn(`No local metadata for ${hash}`);
    }

    // Fetch from Pinata IPFS Gateway
    const pinataGatewayUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
    const fetchResponse = await fetch(pinataGatewayUrl);

    if (!fetchResponse.ok) {
      logger.error(`Pinata gateway error: ${fetchResponse.status} ${fetchResponse.statusText}`);
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'File not found on IPFS',
        error: {
          code: 'FILE_NOT_FOUND',
          details: `No file found with IPFS CID: ${hash}`,
        },
      });
    }

    // Set appropriate headers
    const contentType = metadata?.mimeType || fetchResponse.headers.get('content-type') || 'application/octet-stream';
    const filename = metadata?.originalName || `file-${hash.substring(0, 12)}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('X-Content-Hash', hash);
    res.setHeader('X-Storage-Type', 'ipfs');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year (immutable)

    // Stream the response from Pinata to client
    const buffer = await fetchResponse.arrayBuffer();
    res.send(Buffer.from(buffer));

    logger.info(`✅ Successfully served file from Pinata: ${hash}`);

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
    const stats = StorageService.getInstance().getStats();

    return res.status(200).json({
      status: 'success',
      statusCode: 200,
      data: {
        ...stats,
        storageType: 'pinata-ipfs',
        note: 'Files are stored on Pinata IPFS, not local storage'
      },
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
 * Note: This only deletes local metadata. Files on IPFS are immutable.
 */
export const deleteFile = async (req, res) => {
  try {
    const { hash } = req.params;

    // We can only delete local metadata, not IPFS files
    const deleted = await StorageService.getInstance().deleteFile(hash);

    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Metadata not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Local metadata deleted (IPFS file remains immutable)',
      data: { hash },
    });
  } catch (error) {
    logger.error('❌ Delete file error:', error);
    return res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: 'Metadata deletion failed',
      error: {
        code: 'DELETE_FAILED',
        details: error.message,
      },
    });
  }
};
