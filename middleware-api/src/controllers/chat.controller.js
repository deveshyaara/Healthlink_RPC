/**
 * Chat Controller
 * Handles AI chatbot interactions using Python LangGraph agent via child_process
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ChatController {
  /**
   * @route   POST /api/chat
   * @desc    Send message to AI agent and get response
   * @access  Private (requires authentication)
   */
  async sendMessage(req, res) {
    try {
      const { message, thread_id } = req.body;
      const userId = req.user?.userId || 'anonymous';
      const userName = req.user?.name || 'User';

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

      // Path to Python agent entry script
      const pythonScriptPath = path.join(__dirname, '../../python_agent/run_agent.py');
      // Arguments for Python script - include user name for personalization
      const args = [
        pythonScriptPath,
        userId.toString(),
        userName,
        message,
      ];
      if (thread_id) {
        args.push(thread_id);
      }

      // Spawn Python process with timeout
      const PYTHON_TIMEOUT = 30000; // 30 seconds
      const pythonProcess = spawn('python', args, {
        env: {
          ...process.env,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY,
          GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
          LLM_TEMPERATURE: process.env.LLM_TEMPERATURE || '0.2',
          PYTHONIOENCODING: 'utf-8',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Set timeout to kill process if it takes too long
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        logger.error('Python process timeout', { userId, message: message.substring(0, 100) });
        return res.status(504).json({
          status: 'error',
          statusCode: 504,
          message: 'Agent response timeout',
          error: {
            code: 'TIMEOUT',
            details: 'AI agent took too long to respond',
          },
        });
      }, PYTHON_TIMEOUT);

      let stdout = '';
      let stderr = '';

      // Capture stdout (agent response)
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Capture stderr (errors and logs)
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          logger.error('Python agent error:', { stderr, userId });
          return res.status(500).json({
            status: 'error',
            statusCode: 500,
            message: 'Failed to generate AI response',
            error: {
              code: 'AGENT_ERROR',
              details: stderr || 'Python process failed',
            },
          });
        }

        try {
          // Parse JSON response from Python agent
          const agentResponse = JSON.parse(stdout);

          if (agentResponse.error) {
            return res.status(500).json({
              status: 'error',
              statusCode: 500,
              message: 'Agent returned an error',
              error: {
                code: 'AGENT_EXECUTION_ERROR',
                details: agentResponse.error,
              },
            });
          }

          return res.status(200).json({
            status: 'success',
            statusCode: 200,
            message: 'Message processed successfully',
            data: {
              response: agentResponse.response,
              thread_id: agentResponse.thread_id,
              user_id: agentResponse.user_id,
              patient_context: agentResponse.patient_context,
            },
          });

        } catch (parseError) {
          logger.error('Failed to parse Python response:', { stdout, parseError: parseError.message, userId });
          return res.status(500).json({
            status: 'error',
            statusCode: 500,
            message: 'Failed to parse agent response',
            error: {
              code: 'PARSE_ERROR',
              details: parseError.message,
            },
          });
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        logger.error('Failed to start Python process:', { error: error.message, userId });
        return res.status(500).json({
          status: 'error',
          statusCode: 500,
          message: 'Failed to start AI agent',
          error: {
            code: 'PROCESS_ERROR',
            details: error.message,
          },
        });
      });

    } catch (error) {
      logger.error('Chat controller error:', { error: error.message, stack: error.stack });
      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Internal server error',
        error: {
          code: 'INTERNAL_ERROR',
          details: error.message,
        },
      });
    }
  }

  /**
   * @route   GET /api/chat/health
   * @desc    Check if Python agent is accessible
   * @access  Public
   */
  async healthCheck(req, res) {
    try {
      // Simple check to see if Python is available
      const pythonProcess = spawn('python', ['--version']);
      let version = '';
      pythonProcess.stdout.on('data', (data) => {
        version += data.toString();
      });
      pythonProcess.stderr.on('data', (data) => {
        version += data.toString();
      });
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          return res.status(200).json({
            status: 'success',
            statusCode: 200,
            message: 'Chat agent is healthy',
            data: {
              python_version: version.trim(),
              gemini_configured: !!process.env.GEMINI_API_KEY,
            },
          });
        } else {
          return res.status(500).json({
            status: 'error',
            statusCode: 500,
            message: 'Python is not available',
            error: {
              code: 'PYTHON_NOT_FOUND',
              details: 'Python interpreter not found in system PATH',
            },
          });
        }
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Health check failed',
        error: {
          code: 'HEALTH_CHECK_ERROR',
          details: error.message,
        },
      });
    }
  }
}

export default new ChatController();
