/**
 * Chat Controller
 * Handles AI chatbot interactions using Google Gemini API directly
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';
import dbService from '../services/db.service.prisma.js';

class ChatController {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.initializeGemini();
  }

  /**
   * Initialize Google Gemini AI
   */
  initializeGemini() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        logger.warn('GEMINI_API_KEY not found - chat functionality will be limited');
        return;
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        generationConfig: {
          temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.2'),
          maxOutputTokens: 1000,
        },
      });

      logger.info('Google Gemini AI initialized for chat');
    } catch (error) {
      logger.error('Failed to initialize Gemini AI:', error);
    }
  }

  /**
   * @route   POST /api/chat
   * @desc    Send message to AI agent and get response
   * @access  Private (requires authentication)
   */
  async sendMessage(req, res) {
    const { message, thread_id } = req.body;
    const userId = req.user?.userId || 'anonymous';
    const userName = req.user?.name || 'User';
    const userRole = req.user?.role || 'patient';

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Message is required',
        error: {
          code: 'MISSING_MESSAGE',
          details: 'Message cannot be empty',
        },
      });
    }

    if (!this.model) {
      return res.status(503).json({
        status: 'error',
        statusCode: 503,
        message: 'AI service unavailable',
        error: {
          code: 'AI_UNAVAILABLE',
          details: 'Gemini API key not configured',
        },
      });
    }

    try {
      // Fetch user context from Database
      let contextData = {
        appointments: [],
        prescriptions: [],
        records: [],
      };

      try {
        if (dbService && dbService.isReady && dbService.isReady()) {
          const db = dbService.prisma;
          const userEmail = req.user?.email;
          let patientId = userId; // Default to userId

          if (userRole === 'patient') {
            // Try to find patient record by email to get correct patient ID
            if (userEmail && db.patientWalletMapping) {
              const patientRecord = await db.patientWalletMapping.findUnique({
                where: { email: userEmail }
              });
              if (patientRecord) {
                patientId = patientRecord.id;
              }
            }

            // Fetch Appointments
            if (db.appointment) {
              const appointments = await db.appointment.findMany({
                where: {
                  patientId: patientId,
                  scheduledAt: { gte: new Date() }
                },
                orderBy: { scheduledAt: 'asc' },
                take: 5,
                include: { doctor: { select: { fullName: true } } }
              });
              contextData.appointments = appointments.map(a => ({
                date: a.scheduledAt,
                title: a.title,
                doctor: a.doctor?.fullName,
                status: a.status
              }));
            }

            // Fetch Prescriptions
            if (db.prescription) {
              const prescriptions = await db.prescription.findMany({
                where: { patientId: patientId, status: 'ACTIVE' },
                orderBy: { createdAt: 'desc' },
                take: 5,
              });
              contextData.prescriptions = prescriptions.map(p => ({
                medication: p.medication,
                dosage: p.dosage,
                instructions: p.instructions,
                expiry: p.expiryDate
              }));
            }
          }
        }
      } catch (dbError) {
        logger.warn('Failed to fetch DB context for chat:', dbError);
        // Continue without context
      }

      // Create healthcare-focused system prompt
      const systemPrompt = `You are a helpful healthcare AI assistant for HealthLink.

You are speaking with ${userName} (${userRole}).

USER CONTEXT (From Database):
Appointments: ${JSON.stringify(contextData.appointments)}
Active Prescriptions: ${JSON.stringify(contextData.prescriptions)}

IMPORTANT GUIDELINES:
1. Be empathetic, supportive, and professional
2. NEVER provide medical diagnoses or prescribe medications
3. NEVER give specific medical advice or treatment recommendations
4. If the user asks for medical advice, direct them to consult their healthcare provider
5. You can help with general health information, appointment scheduling questions, and platform navigation
6. Use the provided context to answer questions about their schedule or medications ("When is my next appointment?").
7. Always remind users that you are an AI assistant, not a medical professional

Keep responses concise but helpful.`;

      // Generate response using Gemini
      const chat = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: 'Hello, I need help with HealthLink.' }],
          },
          {
            role: 'model',
            parts: [{ text: systemPrompt }],
          },
        ],
      });

      const result = await chat.sendMessage(message);
      const aiResponse = result.response.text();

      logger.info('AI chat response generated', {
        userId,
        messageLength: message.length,
        responseLength: aiResponse.length,
      });

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        data: {
          response: aiResponse,
          user_id: userId,
          thread_id: thread_id || `thread-${userId}`,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      logger.error('Failed to generate AI response:', error);

      res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Failed to generate AI response: ' + error.message,
        error: {
          code: 'AI_ERROR',
          details: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
      });
    }
  }

  /**
   * @route   GET /api/chat/health
   * @desc    Check if AI service is accessible
   * @access  Public
   */
  async healthCheck(req, res) {
    try {
      const isAvailable = !!this.model;

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        data: {
          service: 'HealthLink AI Chat',
          available: isAvailable,
          model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Health check failed:', error);

      res.status(503).json({
        status: 'error',
        statusCode: 503,
        message: 'AI service health check failed',
        error: {
          code: 'HEALTH_CHECK_FAILED',
          details: 'Unable to verify AI service status',
        },
      });
    }
  }
}

// Singleton instance
let chatControllerInstance = null;

/**
 * Get or create chat controller instance
 * @returns {ChatController}
 */
export const getChatControllerInstance = () => {
  if (!chatControllerInstance) {
    chatControllerInstance = new ChatController();
  }
  return chatControllerInstance;
};

// Export singleton instance as default
export default getChatControllerInstance();
