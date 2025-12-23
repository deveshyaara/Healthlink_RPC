import Joi from 'joi';
import { ValidationError } from '../utils/errors.js';

/**
 * Validation middleware factory
 * Validates request body, params, or query against a Joi schema
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just the first
      stripUnknown: true, // Remove unknown keys
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return next(new ValidationError('Validation failed', errors));
    }

    // Replace request property with validated value
    req[property] = value;
    next();
  };
};

/**
 * Common validation schemas
 */
export const schemas = {
  // Transaction submission schema
  submitTransaction: Joi.object({
    functionName: Joi.string().required(),
    args: Joi.array().items(Joi.string()).default([]),
    userId: Joi.string().optional(),
    async: Joi.boolean().default(false),
  }),

  // Transaction with transient data schema
  submitPrivateTransaction: Joi.object({
    functionName: Joi.string().required(),
    transientData: Joi.object().required(),
    args: Joi.array().items(Joi.string()).default([]),
    userId: Joi.string().optional(),
  }),

  // Query schema
  queryLedger: Joi.object({
    functionName: Joi.string().required(),
    args: Joi.array().items(Joi.string()).default([]),
    userId: Joi.string().optional(),
  }),

  // Asset ID parameter
  assetId: Joi.object({
    assetId: Joi.string().required(),
  }),

  // Job ID parameter
  jobId: Joi.object({
    jobId: Joi.string().required(),
  }),

  // User registration schema
  registerUser: Joi.object({
    userId: Joi.string().alphanum().min(3).max(30).required(),
    // Allow application roles used by HealthLink and default to patient
    role: Joi.string().valid('patient', 'doctor', 'admin').default('patient'),
    affiliation: Joi.string().default('org1.department1'),
  }),

  // Rich query schema
  richQuery: Joi.object({
    selector: Joi.object().required(),
    fields: Joi.array().items(Joi.string()).optional(),
    sort: Joi.array().items(Joi.object()).optional(),
    limit: Joi.number().integer().min(1).max(1000).optional(),
    skip: Joi.number().integer().min(0).optional(),
    userId: Joi.string().optional(),
  }),

  // Pagination schema
  pagination: Joi.object({
    pageSize: Joi.number().integer().min(1).max(100).default(10),
    bookmark: Joi.string().allow('').default(''),
    userId: Joi.string().optional(),
  }),
};

export default validate;
