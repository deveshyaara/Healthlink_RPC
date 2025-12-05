import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import { createSafeErrorResponse, parseFabricErrorDetails } from '../utils/errorSerializer.js';

/**
 * Global Error Handler Middleware
 * Handles circular JSON references and Fabric-specific errors
 * Maps Fabric errors to appropriate HTTP status codes
 */
const errorHandler = (err, req, res, next) => {
  // Parse Fabric-specific error patterns
  const fabricDetails = parseFabricErrorDetails(err);
  
  // Log error safely (handles circular references)
  logger.error('Error occurred:', {
    message: err.message,
    type: err.type || fabricDetails.type,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    fabricErrorType: fabricDetails.type,
  });

  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let type = err.type || fabricDetails.type || 'SERVER_ERROR';

  // Map Fabric-specific errors to HTTP status codes
  if (fabricDetails.matched) {
    switch (fabricDetails.type) {
      case 'IDENTITY_NOT_FOUND':
        statusCode = 404;
        type = 'NOT_FOUND';
        message = err.message || 'Identity not found in wallet';
        break;
      case 'MVCC_CONFLICT':
        statusCode = 409;
        type = 'MVCC_CONFLICT';
        message = 'Transaction conflict detected. Please retry the operation.';
        break;
      case 'PEER_UNAVAILABLE':
      case 'CONNECTION_FAILED':
        statusCode = 503;
        type = 'PEER_UNAVAILABLE';
        message = 'Blockchain network is currently unavailable. Please try again later.';
        break;
      case 'ENDORSEMENT_FAILURE':
        statusCode = 400;
        type = 'ENDORSEMENT_FAILURE';
        message = 'Transaction endorsement failed. Check transaction parameters.';
        break;
      case 'CHAINCODE_ERROR':
        statusCode = 400;
        type = 'CHAINCODE_ERROR';
        message = err.message || 'Chaincode execution failed';
        break;
      case 'TIMEOUT':
        statusCode = 504;
        type = 'TIMEOUT';
        message = 'Blockchain operation timed out. Please try again.';
        break;
      case 'UNAUTHORIZED':
        statusCode = 401;
        type = 'UNAUTHORIZED';
        message = err.message || 'Unauthorized access to blockchain resource';
        break;
    }
  }

  // Handle application-defined error types
  if (err.type === 'BLOCKCHAIN_ERROR') {
    statusCode = err.statusCode || 500;
    message = err.message;
  } else if (err.type === 'VALIDATION_ERROR') {
    statusCode = 400;
    message = err.message;
  } else if (err.type === 'NOT_FOUND') {
    statusCode = 404;
    message = err.message;
  } else if (err.type === 'UNAUTHORIZED') {
    statusCode = 401;
    message = err.message;
  }

  // Create safe error response (handles circular references)
  const isProduction = process.env.NODE_ENV === 'production';
  const safeError = createSafeErrorResponse(err, !isProduction);
  
  const errorResponse = {
    success: false,
    error: {
      type,
      message,
      statusCode,
      ...safeError,
    },
  };

  // Safely send response (guaranteed no circular JSON)
  try {
    res.status(statusCode).json(errorResponse);
  } catch (jsonError) {
    // Fallback for extreme cases
    res.status(500).json({
      success: false,
      error: {
        type: 'SERIALIZATION_ERROR',
        message: 'Error response could not be serialized',
        statusCode: 500,
      },
    });
  }
};

export default errorHandler;
