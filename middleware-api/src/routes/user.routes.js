import express from 'express';
import userController from '../controllers/user.controller.js';
import adminController from '../controllers/admin.controller.js';
import { authenticateJWT, requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Admin only
 */
router.get('/', authenticateJWT, requireAdmin, adminController.getUsers.bind(adminController));

/**
 * @route   POST /api/users/invite
 * @desc    Send user invitation
 * @access  Admin only
 */
router.post('/invite', authenticateJWT, requireAdmin, userController.sendInvitation.bind(userController));

/**
 * @route   GET /api/users/invitations
 * @desc    List pending invitations
 * @access  Admin only
 */
router.get('/invitations', authenticateJWT, requireAdmin, userController.listInvitations.bind(userController));

/**
 * @route   POST /api/users/invitations/:token/accept
 * @desc    Accept user invitation
 * @access  Public
 */
router.post('/invitations/:token/accept', userController.acceptInvitation.bind(userController));

/**
 * @route   DELETE /api/users/invitations/:id
 * @desc    Cancel invitation
 * @access  Admin only
 */
router.delete('/invitations/:id', authenticateJWT, requireAdmin, userController.cancelInvitation.bind(userController));

export default router;
