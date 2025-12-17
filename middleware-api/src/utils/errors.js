/**
 * Custom Error Classes for different error scenarios
 */

/**
 * Base Application Error
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Blockchain-specific errors
 */
export class BlockchainError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, true);
    this.originalError = originalError;
    this.type = 'BLOCKCHAIN_ERROR';
  }
}

/**
 * MVCC Read Conflict Error
 */
export class MVCCConflictError extends BlockchainError {
  constructor(message = 'MVCC Read Conflict detected') {
    super(message);
    this.statusCode = 409; // Conflict
    this.type = 'MVCC_CONFLICT';
  }
}

/**
 * Peer Unavailable Error
 */
export class PeerUnavailableError extends BlockchainError {
  constructor(message = 'Peer is unavailable') {
    super(message);
    this.statusCode = 503; // Service Unavailable
    this.type = 'PEER_UNAVAILABLE';
  }
}

/**
 * Chaincode Error
 */
export class ChaincodeError extends BlockchainError {
  constructor(message, chaincodeMessage = '') {
    super(message);
    this.statusCode = 400;
    this.chaincodeMessage = chaincodeMessage;
    this.type = 'CHAINCODE_ERROR';
  }
}

/**
 * Validation Error
 */
export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, true);
    this.errors = errors;
    this.type = 'VALIDATION_ERROR';
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, true);
    this.type = 'NOT_FOUND';
  }
}

/**
 * Unauthorized Error
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, true);
    this.type = 'UNAUTHORIZED';
  }
}

/**
 * Parse Fabric SDK errors and return appropriate custom error
 */
export const parseFabricError = (error) => {
  const errorMessage = error.message || error.toString();

  // MVCC Read Conflict
  if (errorMessage.includes('MVCC_READ_CONFLICT')) {
    return new MVCCConflictError(errorMessage);
  }

  // Peer unavailable
  if (errorMessage.includes('CONNECTION_REFUSED') ||
      errorMessage.includes('UNAVAILABLE') ||
      errorMessage.includes('failed to connect')) {
    return new PeerUnavailableError(errorMessage);
  }

  // Chaincode error
  if (errorMessage.includes('chaincode') ||
      errorMessage.includes('transaction returned with failure')) {
    return new ChaincodeError('Chaincode execution failed', errorMessage);
  }

  // Default blockchain error
  return new BlockchainError(errorMessage, error);
};
