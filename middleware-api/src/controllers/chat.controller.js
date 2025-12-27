/**
 * Chat Controller - LangGraph Agent Integration
 * Properly integrated Python LangGraph agent with Node.js backend
 * No patchwork - production-ready implementation
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import dbService from '../services/db.service.prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ChatController {
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python';
    this.agentScriptPath = path.join(__dirname, '../../python_agent/run_agent.py');
    this.initTimeout = 30000; // 30 seconds timeout for agent initialization
    this.checkPythonAgent();
  }

  /**
   * Verify Python agent is accessible on startup
   */
  async checkPythonAgent() {
    try {
      const testProcess = spawn(this.pythonPath, ['--version']);

      testProcess.on('error', (err) => {
        logger.error('Python runtime not found:', err);
        logger.warn('Chat functionality will be limited - Python agent not available');
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          logger.info(`Python runtime found: ${this.pythonPath}`);
          logger.info(`LangGraph agent path: ${this.agentScriptPath}`);
        } else {
          logger.warn('Python runtime check failed - chat may not work');
        }
      });
    } catch (error) {
      logger.error('Failed to check Python runtime:', error);
    }
  }

  /**
   * Fetch patient context from database
   * Returns real patient data for LangGraph agent
   */
  async fetchPatientContext(userId, userRole, userEmail) {
    try {
      if (!dbService || !dbService.isReady || !dbService.isReady()) {
        logger.warn('Database not ready - returning empty context');
        return {};
      }

      const db = dbService.prisma;
      const context = {
        appointments: [],
        prescriptions: [],
        records: [],
        diagnoses: [],
        medications: [],
      };

      if (userRole === 'patient') {
        // Find patient record
        const patient = await db.patientWalletMapping?.findFirst({
          where: { userId: userId },
          include: {
            user: {
              select: {
                email: true,
                fullName: true,
              },
            },
          },
        });

        if (patient) {
          // Fetch appointments
          const appointments = await db.appointment?.findMany({
            where: { patientId: patient.id },
            orderBy: { scheduledAt: 'desc' },
            take: 5,
            select: {
              appointmentId: true,
              scheduledAt: true,
              status: true,
              notes: true,
            },
          }) || [];

          // Fetch prescriptions
          const prescriptions = await db.prescription?.findMany({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              prescriptionId: true,
              medication: true,
              dosage: true,
              instructions: true,
              createdAt: true,
            },
          }) || [];

          // Fetch medical records
          const records = await db.medicalRecord?.findMany({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              recordId: true,
              diagnosis: true,
              treatment: true,
              createdAt: true,
            },
          }) || [];

          context.appointments = appointments;
          context.prescriptions = prescriptions;
          context.records = records;

          // Extract unique diagnoses and medications
          context.diagnoses = [...new Set(records.map(r => r.diagnosis).filter(Boolean))];
          context.medications = [...new Set(prescriptions.map(p => p.medication).filter(Boolean))];
        }
      } else if (userRole === 'doctor') {
        // For doctors, provide summary stats
        const appointmentCount = await db.appointment?.count({
          where: { doctorId: userId },
        }) || 0;

        const prescriptionCount = await db.prescription?.count({
          where: { doctorId: userId },
        }) || 0;

        context.stats = {
          totalAppointments: appointmentCount,
          totalPrescriptions: prescriptionCount,
          role: 'doctor',
        };
      }

      return context;

    } catch (error) {
      logger.error('Failed to fetch patient context:', error);
      return {};
    }
  }

  /**
   * Invoke Python LangGraph agent via child process
   * @param {string} userId - User ID
   * @param {string} userName - User display name
   * @param {string} message - User message
   * @param {string} threadId - Conversation thread ID
   * @param {object} patientContext - Patient medical context
   * @returns {Promise<object>} Agent response
   */
  async invokePythonAgent(userId, userName, message, threadId, patientContext = {}) {
    return new Promise((resolve, reject) => {
      const contextJson = JSON.stringify(patientContext);

      logger.info(`Invoking Python agent for user: ${userId}`);

      // Spawn Python process with arguments
      const python = spawn(this.pythonPath, [
        this.agentScriptPath,
        userId,
        userName,
        message,
        threadId || `thread-${userId}`,
        contextJson,
      ], {
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1', // Disable Python output buffering
        },
      });

      let dataString = '';
      let errorString = '';

      // Collect stdout data
      python.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      // Collect stderr data
      python.stderr.on('data', (data) => {
        errorString += data.toString();
        logger.warn('Python agent stderr:', data.toString());
      });

      // Handle process errors
      python.on('error', (error) => {
        logger.error('Failed to spawn Python agent:', error);
        reject(new Error(`Failed to start Python agent: ${error.message}`));
      });

      // Handle process exit
      python.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Python agent exited with code ${code}`);
          logger.error('stderr:', errorString);
          reject(new Error(`Python agent failed with exit code ${code}`));
          return;
        }

        try {
          const result = JSON.parse(dataString);

          if (result.error) {
            logger.error('Python agent returned error:', result.error);
            reject(new Error(result.error));
            return;
          }

          logger.info(`Python agent response received for user: ${userId}`);
          resolve(result);

        } catch (parseError) {
          logger.error('Failed to parse Python agent response:', parseError);
          logger.error('Raw output:', dataString);
          reject(new Error('Invalid response from Python agent'));
        }
      });

      // Set timeout
      const timeout = setTimeout(() => {
        python.kill();
        reject(new Error('Python agent timed out'));
      }, this.initTimeout);

      python.on('close', () => clearTimeout(timeout));
    });
  }

  /**
   * @route   POST /api/chat
   * @desc    Send message to LangGraph AI agent and get response
   * @access  Private (requires authentication)
   */
  async sendMessage(req, res) {
    const { message, thread_id } = req.body;
    const userId = req.user?.userId || req.user?.id || 'anonymous';
    const userName = req.user?.name || req.user?.fullName || 'User';
    const userRole = req.user?.role || 'patient';
    const userEmail = req.user?.email;

    // Validate input
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

    try {
      // Fetch real patient context from database
      logger.info(`Fetching patient context for user: ${userId}`);
      const patientContext = await this.fetchPatientContext(userId, userRole, userEmail);

      // Invoke Python LangGraph agent
      const result = await this.invokePythonAgent(
        userId,
        userName,
        message,
        thread_id,
        patientContext,
      );

      // Save conversation to database
      try {
        if (dbService && dbService.isReady && dbService.isReady()) {
          const db = dbService.prisma;

          await db.chatMessage?.create({
            data: {
              userId: userId,
              role: 'user',
              content: message,
              threadId: result.thread_id || thread_id,
              metadata: JSON.stringify({ userRole }),
            },
          }).catch(err => logger.warn('Failed to save user message:', err));

          await db.chatMessage?.create({
            data: {
              userId: userId,
              role: 'assistant',
              content: result.response,
              threadId: result.thread_id || thread_id,
              metadata: JSON.stringify({ patientContextUsed: !!patientContext }),
            },
          }).catch(err => logger.warn('Failed to save AI response:', err));
        }
      } catch (dbError) {
        // Don't fail the request if DB save fails
        logger.error('Failed to save chat history:', dbError);
      }

      // Return success response
      return res.status(200).json({
        status: 'success',
        statusCode: 200,
        data: {
          response: result.response,
          thread_id: result.thread_id,
          user_id: result.user_id,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          agent: 'langgraph',
          contextProvided: Object.keys(patientContext).length > 0,
        },
      });

    } catch (error) {
      logger.error('Chat request failed:', error);

      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Failed to process your message',
        error: {
          code: 'AGENT_ERROR',
          details: error.message,
        },
      });
    }
  }

  /**
   * @route   GET /api/chat/health
   * @desc    Check if Python LangGraph agent is accessible
   * @access  Public
   */
  async healthCheck(req, res) {
    try {
      // Test Python agent with simple message
      const testResult = await this.invokePythonAgent(
        'health-check',
        'System',
        'Hello, are you working?',
        'health-check-thread',
        {},
      );

      return res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Python LangGraph agent is healthy',
        data: {
          pythonPath: this.pythonPath,
          agentScriptPath: this.agentScriptPath,
          testResponse: testResult.response?.substring(0, 100) + '...',
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      logger.error('Python agent health check failed:', error);

      return res.status(503).json({
        status: 'error',
        statusCode: 503,
        message: 'Python LangGraph agent is unavailable',
        error: {
          code: 'AGENT_UNAVAILABLE',
          details: error.message,
        },
      });
    }
  }
}

export default new ChatController();
