/**
 * Authentication Routes
 * JWT-based authentication endpoints
 * 
 * Security: Protected with strict rate limiting (5 attempts per 15 min)
 */

import express from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user with password and blockchain identity
 * @access  Public
 * @security Rate limited (5 attempts per 15 min)
 */
router.post('/register', authLimiter, authController.register.bind(authController));

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 * @security Rate limited (5 attempts per 15 min)
 */
router.post('/login', authLimiter, authController.login.bind(authController));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticateJWT, authController.logout.bind(authController));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateJWT, authController.getMe.bind(authController));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh', authenticateJWT, authController.refreshToken.bind(authController));

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticateJWT, authController.changePassword.bind(authController));

export default router;
