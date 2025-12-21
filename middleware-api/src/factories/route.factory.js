/**
 * Dynamic Route Factory
 * Auto-generates Express routes from configuration
 * Handles request mapping, validation, and chaincode invocation
 */

import express from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import { getGatewayInstance } from '../services/fabricGateway.service.js';
import logger from '../utils/logger.js';

/**
 * Extract value from nested object using dot notation path
 * e.g., 'body.user.name' -> req.body.user.name
 */
function getNestedValue(obj, path) {
  if (!path) {return undefined;}

  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Map request data to chaincode arguments based on configuration
 */
function mapRequestToArgs(req, paramMapping) {
  const args = [];
  const mappingEntries = Object.entries(paramMapping);

  for (const [_argName, sourcePath] of mappingEntries) {
    let value;

    // Handle special cases for auto-injection
    if (sourcePath.startsWith('user.')) {
      // Inject from authenticated user
      const userKey = sourcePath.substring(5); // Remove 'user.' prefix
      value = req.user ? req.user[userKey] : undefined;
    } else {
      // Extract from request
      value = getNestedValue(req, sourcePath);
    }

    // Convert objects/arrays to JSON strings for chaincode
    if (typeof value === 'object' && value !== null) {
      value = JSON.stringify(value);
    }

    // Convert to string (chaincode expects string args)
    args.push(value !== undefined && value !== null ? String(value) : '');
  }

  return args;
}

/**
 * Validate request body against Joi schema
 */
function validateRequest(schema, data) {
  if (!schema) {
    return { valid: true };
  }

  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return {
      valid: false,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    };
  }

  return { valid: true, value };
}

/**
 * Create Express route handler for a chaincode function
 */
function createRouteHandler(config) {
  return async (req, res) => {
    try {
      // Validate request body if schema provided
      if (config.validation) {
        const validation = validateRequest(config.validation, req.body);
        if (!validation.valid) {
          return res.status(400).json({
            status: 'error',
            statusCode: 400,
            message: 'Validation failed',
            error: {
              code: 'VALIDATION_ERROR',
              details: validation.errors,
            },
          });
        }
      }

      // Map request parameters to chaincode arguments
      const args = mapRequestToArgs(req, config.paramMapping);

      // Determine which user identity to use
      const userId = req.user ? req.user.userId : 'admin';

      // Get channel name (default to healthlink-channel)
      const _channelName = config.channel || 'healthlink-channel';

      // Get gateway instance
      const fabricGateway = await getGatewayInstance(userId);

      // Get the chaincode name from route config
      const chaincodeName = config.chaincode || 'healthlink';

      // Invoke chaincode function
      let result;

      if (config.method === 'GET' || config.function.startsWith('Get') || config.function.startsWith('Query')) {
        // Read-only query
        result = await fabricGateway.evaluateTransactionFromChaincode(
          chaincodeName,
          config.function,
          ...args,
        );
      } else {
        // State-changing transaction
        result = await fabricGateway.submitTransactionToChaincode(
          chaincodeName,
          config.function,
          ...args,
        );
      }

      // Parse result if it's a JSON string
      let parsedResult;
      try {
        parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      } catch {
        parsedResult = result;
      }

      // Return standardized response
      return res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: `${config.function} executed successfully`,
        data: parsedResult,
      });

    } catch (error) {
      // Enhanced error logging for debugging
      logger.error(`Route handler error [${config.method} ${config.path}]:`, {
        error: error.message,
        stack: error.stack,
        function: config.function,
        chaincode: config.chaincode,
      });

      // Handle specific error types
      if (error.message.includes('Identity not found')) {
        return res.status(401).json({
          status: 'error',
          statusCode: 401,
          message: 'Blockchain identity not found',
          error: {
            code: 'IDENTITY_ERROR',
            details: 'User must be registered on blockchain',
          },
        });
      }

      if (error.message.includes('does not exist')) {
        // For GET requests that query lists, return empty array instead of 404
        // This handles new users with no data gracefully
        if (config.method === 'GET' && (
          config.function.includes('GetAll') ||
          config.function.includes('GetByPatient') ||
          config.function.includes('GetConsents') ||
          config.function.includes('Query')
        )) {
          logger.info(`Empty ledger for ${config.function} - returning empty array`);
          return res.status(200).json({
            status: 'success',
            statusCode: 200,
            message: `No ${config.function.replace('Get', '').toLowerCase()} found`,
            data: [],
          });
        }

        // For single resource GET, return 404
        return res.status(404).json({
          status: 'error',
          statusCode: 404,
          message: 'Resource not found',
          error: {
            code: 'NOT_FOUND',
            details: error.message,
          },
        });
      }

      // Generic error response
      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Chaincode execution failed',
        error: {
          code: 'CHAINCODE_ERROR',
          details: error.message,
          function: config.function,
          chaincode: config.chaincode,
        },
      });
    }
  };
}

/**
 * Generate Express router from routes configuration
 */
export function createDynamicRouter(routesConfig) {
  const router = express.Router();

  // Track routes for logging
  const registeredRoutes = [];

  for (const config of routesConfig) {
    const middlewares = [];

    // Add authentication middleware if required
    if (config.auth !== false) {
      middlewares.push(authenticateJWT);
    }

    // Add role-based access control if specified
    if (config.roles && config.roles.length > 0) {
      middlewares.push(requireRole(...config.roles));
    }

    // Create route handler
    const handler = createRouteHandler(config);

    // Register route with Express
    const method = config.method.toLowerCase();
    const path = config.path;

    if (typeof router[method] === 'function') {
      router[method](path, ...middlewares, handler);

      registeredRoutes.push({
        method: config.method,
        path,
        chaincode: config.chaincode,
        function: config.function,
        auth: config.auth !== false,
        roles: config.roles || [],
      });
    } else {
      logger.warn(`Unsupported HTTP method: ${config.method} for path ${path}`);
    }
  }

  // Log registered routes (dev mode)
  if (process.env.NODE_ENV !== 'production') {
    logger.info('\n=== Dynamic Routes Registered ===');
    registeredRoutes.forEach(route => {
      const authInfo = route.auth ? `🔒 ${route.roles.join(', ') || 'authenticated'}` : '🌐 public';
      logger.info(`${route.method.padEnd(6)} ${route.path.padEnd(40)} → ${route.chaincode}.${route.function} (${authInfo})`);
    });
    logger.info('=================================\n');
  }

  return router;
}

/**
 * Create a simplified route for direct chaincode access
 * Useful for functions not yet mapped in config
 */
export function createGenericChaincodeRouter() {
  const router = express.Router();

  /**
   * Generic chaincode invocation endpoint
   * POST /api/chaincode/invoke
   */
  router.post('/invoke', authenticateJWT, async (req, res) => {
    try {
      const { channelName, chaincodeName, functionName, args } = req.body;

      if (!channelName || !chaincodeName || !functionName) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'Missing required parameters',
          error: {
            code: 'MISSING_PARAMS',
            details: 'channelName, chaincodeName, and functionName are required',
          },
        });
      }

      const userId = req.user.userId;
      const fabricGateway = await getGatewayInstance(userId);
      const result = await fabricGateway.submitTransaction(
        userId,
        channelName,
        chaincodeName,
        functionName,
        ...(args || []),
      );

      return res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Transaction executed successfully',
        data: typeof result === 'string' ? JSON.parse(result) : result,
      });
    } catch (error) {
      logger.error('Generic chaincode invocation error:', error);
      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Chaincode invocation failed',
        error: {
          code: 'INVOCATION_ERROR',
          details: error.message,
        },
      });
    }
  });

  /**
   * Generic chaincode query endpoint
   * POST /api/chaincode/query
   */
  router.post('/query', authenticateJWT, async (req, res) => {
    try {
      const { channelName, chaincodeName, functionName, args } = req.body;

      if (!channelName || !chaincodeName || !functionName) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'Missing required parameters',
          error: {
            code: 'MISSING_PARAMS',
            details: 'channelName, chaincodeName, and functionName are required',
          },
        });
      }

      const userId = req.user.userId;
      const fabricGateway = await getGatewayInstance(userId);
      const result = await fabricGateway.evaluateTransaction(
        userId,
        channelName,
        chaincodeName,
        functionName,
        ...(args || []),
      );

      return res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Query executed successfully',
        data: typeof result === 'string' ? JSON.parse(result) : result,
      });
    } catch (error) {
      logger.error('Generic chaincode query error:', error);
      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Chaincode query failed',
        error: {
          code: 'QUERY_ERROR',
          details: error.message,
        },
      });
    }
  });

  return router;
}

export default {
  createDynamicRouter,
  createGenericChaincodeRouter,
};
