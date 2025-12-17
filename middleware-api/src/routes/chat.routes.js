/**
 * Chat Routes
 * AI chatbot endpoints powered by LangGraph Python agent
 *
 * Security: Requires authentication for sending messages
 */

import express from 'express';
import chatController from '../controllers/chat.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/chat
 * @desc    Send message to AI agent and get personalized response
 * @access  Private
 * @body    { message: string, thread_id?: string }
 */
router.post('/', authenticateJWT, chatController.sendMessage.bind(chatController));

/**
 * @route   GET /api/chat/health
 * @desc    Check if Python agent is accessible
 * @access  Public
 */
router.get('/health', chatController.healthCheck.bind(chatController));

export default router;
