import express from 'express';
import DoctorSathiController from '../controllers/doctorsathi.controller.js';
import { authenticateJWT, requireDoctor } from '../middleware/auth.middleware.js';

const router = express.Router();
const controller = new DoctorSathiController();

// Bind controller methods to preserve 'this' context
Object.getOwnPropertyNames(Object.getPrototypeOf(controller)).forEach((name) => {
    if (name !== 'constructor' && typeof controller[name] === 'function') {
        controller[name] = controller[name].bind(controller);
    }
});

/**
 * @route   POST /api/doctorsathi/chat
 * @desc    Send message to DoctorSathi AI agent
 * @access  Private (Doctor only)
 */
router.post('/chat', authenticateJWT, requireDoctor, controller.chat);

/**
 * @route   POST /api/doctorsathi/execute
 * @desc    Execute AI-generated action
 * @access  Private (Doctor only)
 */
router.post('/execute', authenticateJWT, requireDoctor, controller.executeAction);

export default router;
