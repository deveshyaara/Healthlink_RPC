/**
 * Rate Limiter Middleware
 *
 * Provides different rate limiting strategies for different endpoints
 * to protect against brute force attacks and DoS
 */

import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 *
 * Configuration:
 * - Window: 15 minutes
 * - Max attempts: 5 (configurable via env)
 * - Successful requests don't count against limit
 */
export const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS) || 5, // Only 5 attempts
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
    res.status(429).json({
      status: 'error',
      statusCode: 429,
      message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes',
      },
    });
  },
});

/**
 * General API rate limiter
 * Applied to all other API endpoints
 *
 * Configuration:
 * - Window: 15 minutes
 * - Max requests: 100
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
    res.status(429).json({
      status: 'error',
      statusCode: 429,
      message: 'Too many requests from this IP, please try again later.',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes',
      },
    });
  },
});
