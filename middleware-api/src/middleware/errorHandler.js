import logger from '../utils/logger.js';
import { parseFabricErrorDetails } from '../utils/errorSerializer.js';

/**
 * Global Error Handler Middleware
 * Handles circular JSON references and standardizes error responses
 * Maps various errors to standardized JSON format
 */
const errorHandler = (err, req, res, _next) => {
  // Parse Fabric-specific error patterns (legacy support)
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
  let code = err.code || err.type || fabricDetails.type || 'SERVER_ERROR';
  let details = {};

  // Map Web3/Ethereum specific errors
  if (err.code === 'ACTION_REJECTED' || err.message?.includes('User denied transaction signature')) {
    statusCode = 400;
    message = 'Transaction was rejected by user';
    code = 'USER_REJECTED';
  } else if (err.message?.includes('insufficient funds')) {
    statusCode = 400;
    message = 'Insufficient funds for transaction';
    code = 'INSUFFICIENT_FUNDS';
  } else if (err.message?.includes('nonce too low') || err.message?.includes('replacement transaction underpriced')) {
    statusCode = 409;
    message = 'Transaction nonce conflict, please retry';
    code = 'NONCE_CONFLICT';
  } else if (err.message?.includes('Smart Contract Logic Reverted')) {
    statusCode = 400;
    message = 'Transaction failed due to contract logic';
    code = 'CONTRACT_REVERT';
    details = { reason: err.message };
  } else if (err.message?.includes('network error') || err.message?.includes('connection')) {
    statusCode = 503;
    message = 'Blockchain network temporarily unavailable';
    code = 'NETWORK_ERROR';
  }

  // Map Fabric-specific errors to HTTP status codes (legacy)
  if (fabricDetails.matched) {
    switch (fabricDetails.type) {
      case 'IDENTITY_NOT_FOUND':
        statusCode = 404;
        code = 'NOT_FOUND';
        message = err.message || 'Identity not found in wallet';
        break;
      case 'MVCC_CONFLICT':
        statusCode = 409;
        code = 'MVCC_CONFLICT';
        message = 'Transaction conflict detected. Please retry the operation.';
        break;
      case 'PEER_UNAVAILABLE':
      case 'CONNECTION_FAILED':
        statusCode = 503;
        code = 'PEER_UNAVAILABLE';
        message = 'Blockchain network is currently unavailable. Please try again later.';
        break;
      case 'ENDORSEMENT_FAILURE':
        statusCode = 400;
        code = 'ENDORSEMENT_FAILURE';
        message = 'Transaction endorsement failed. Check transaction parameters.';
        break;
      case 'CHAINCODE_ERROR':
        statusCode = 400;
        code = 'CHAINCODE_ERROR';
        message = err.message || 'Chaincode execution failed';
        break;
      case 'TIMEOUT':
        statusCode = 504;
        code = 'TIMEOUT';
        message = 'Blockchain operation timed out. Please try again.';
        break;
      case 'UNAUTHORIZED':
        statusCode = 401;
        code = 'UNAUTHORIZED';
        message = err.message || 'Unauthorized access to blockchain resource';
        break;
    }
  }

  // Handle application-defined error types
  if (err.type === 'BLOCKCHAIN_ERROR') {
    statusCode = err.statusCode || 500;
    message = err.message;
    code = 'BLOCKCHAIN_ERROR';
  } else if (err.type === 'VALIDATION_ERROR') {
    statusCode = 400;
    message = err.message;
    code = 'VALIDATION_ERROR';
  } else if (err.type === 'NOT_FOUND') {
    statusCode = 404;
    message = err.message;
    code = 'NOT_FOUND';
  } else if (err.type === 'UNAUTHORIZED') {
    statusCode = 401;
    message = err.message;
    code = 'UNAUTHORIZED';
  }

  // Create standardized error response
  const errorResponse = {
    success: false,
    error: message,
    code: code,
    details: details,
  };

  // Add technical details in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.details = {
      ...details,
      stack: err.stack,
      originalMessage: err.message,
    };
  }

  // Safely send response
  try {
    res.status(statusCode).json(errorResponse);
  } catch (jsonError) {
    // Fallback for extreme cases
    res.status(500).json({
      success: false,
      error: 'Error response could not be serialized',
      code: 'SERIALIZATION_ERROR',
      details: {},
    });
  }
};

export default errorHandler;
