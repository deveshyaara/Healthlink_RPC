import { inspect } from 'util';

/**
 * Error Serialization Utilities
 * Handles circular references and complex object serialization safely
 */

/**
 * Safe stringify with circular reference handling
 * Uses util.inspect for robust serialization of complex objects
 * 
 * @param {any} obj - Object to stringify
 * @param {number} depth - Maximum depth (default: 2)
 * @returns {string} JSON-safe string representation
 */
export function safeStringify(obj, depth = 2) {
  if (obj === null || obj === undefined) {
    return String(obj);
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return String(obj);
  }

  try {
    // First attempt: standard JSON.stringify
    return JSON.stringify(obj);
  } catch (circularError) {
    // Fallback: Use util.inspect for circular structures
    try {
      return inspect(obj, {
        depth,
        maxArrayLength: 10,
        breakLength: Infinity,
        compact: true,
        sorted: false,
        getters: false,
      });
    } catch (inspectError) {
      // Final fallback: manual object stringification
      return String(obj);
    }
  }
}

/**
 * Serialize error object safely
 * Handles Redis errors, Fabric SDK errors, and native Error objects
 * 
 * @param {Error} error - Error object to serialize
 * @returns {Object} Safe error representation
 */
export function serializeError(error) {
  if (!error) {
    return null;
  }

  // Base error properties
  const serialized = {
    message: error.message || 'Unknown error',
    name: error.name || 'Error',
    type: error.type || error.constructor?.name || 'Error',
  };

  // Add stack trace (truncated for safety)
  if (error.stack) {
    serialized.stack = error.stack.split('\n').slice(0, 10).join('\n');
  }

  // Add status code if present
  if (error.statusCode) {
    serialized.statusCode = error.statusCode;
  }

  // Handle nested errors safely
  if (error.originalError) {
    try {
      serialized.originalError = serializeError(error.originalError);
    } catch {
      serialized.originalError = String(error.originalError);
    }
  }

  // Handle previous errors (Redis MaxRetriesPerRequestError)
  if (error.previousErrors && Array.isArray(error.previousErrors)) {
    try {
      serialized.previousErrors = error.previousErrors.slice(0, 3).map(err => ({
        message: err?.message || String(err),
        name: err?.name || 'Error',
      }));
    } catch {
      serialized.previousErrors = 'Multiple previous errors';
    }
  }

  // Handle chaincode-specific messages
  if (error.chaincodeMessage) {
    serialized.chaincodeMessage = String(error.chaincodeMessage);
  }

  // Handle validation errors
  if (error.errors && Array.isArray(error.errors)) {
    try {
      serialized.details = error.errors.map(e => ({
        field: e.field || e.path?.join('.'),
        message: e.message || String(e),
      }));
    } catch {
      serialized.details = 'Validation errors present';
    }
  }

  return serialized;
}

/**
 * Create safe JSON response from error
 * Ensures no circular references in HTTP responses
 * 
 * @param {Error} error - Error to convert
 * @param {boolean} includeStack - Include stack trace (default: false)
 * @returns {Object} JSON-serializable error object
 */
export function createSafeErrorResponse(error, includeStack = false) {
  const serialized = serializeError(error);

  const response = {
    message: serialized.message,
    type: serialized.type,
    statusCode: serialized.statusCode || 500,
  };

  // Only include stack in development
  if (includeStack && serialized.stack) {
    response.stack = serialized.stack;
  }

  // Include additional details if present
  if (serialized.details) {
    response.details = serialized.details;
  }

  if (serialized.chaincodeMessage) {
    response.chaincodeMessage = serialized.chaincodeMessage;
  }

  if (serialized.originalError?.message) {
    response.originalErrorMessage = serialized.originalError.message;
  }

  return response;
}

/**
 * Extract Fabric-specific error information
 * Parses Fabric SDK error messages for specific error types
 * 
 * @param {Error} error - Fabric error
 * @returns {Object} Parsed error info
 */
export function parseFabricErrorDetails(error) {
  const message = error?.message || String(error);
  
  const patterns = {
    IDENTITY_NOT_FOUND: /identity.*not found/i,
    MVCC_CONFLICT: /MVCC_READ_CONFLICT|mvcc.*conflict/i,
    ENDORSEMENT_FAILURE: /endorsement.*failed|endorsement policy not satisfied/i,
    TIMEOUT: /timeout|timed out/i,
    CONNECTION_FAILED: /connection refused|ECONNREFUSED|failed to connect/i,
    CHAINCODE_ERROR: /chaincode.*error|chaincode.*failed/i,
    PEER_UNAVAILABLE: /peer.*unavailable|UNAVAILABLE/i,
    UNAUTHORIZED: /unauthorized|permission denied/i,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(message)) {
      return {
        type,
        matched: true,
        originalMessage: message,
      };
    }
  }

  return {
    type: 'UNKNOWN',
    matched: false,
    originalMessage: message,
  };
}

export default {
  safeStringify,
  serializeError,
  createSafeErrorResponse,
  parseFabricErrorDetails,
};
