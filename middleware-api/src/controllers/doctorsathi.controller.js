import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import dbService from '../services/db.service.prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * DoctorSathi AI Assistant Controller
 * Handles natural language commands for doctors to automate workflows
 */
class DoctorSathiController {
    /**
     * POST /api/doctorsathi/chat
     * Send message to AI agent and get response
     */
    async chat(req, res) {
        try {
            const { message, threadId } = req.body;
            const userId = req.user?.id;
            const userRole = req.user?.role;

            // Validate request
            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required and must be a non-empty string',
                });
            }

            // Ensure user is a doctor
            if (userRole !== 'doctor') {
                return res.status(403).json({
                    success: false,
                    error: 'DoctorSathi is only available for doctors',
                });
            }

            // Get user info from authenticated request (already populated by auth middleware)
            const userName = req.user.name || req.user.email || 'Doctor';

            // Fetch doctor's context from database
            const doctorContext = await this.fetchDoctorContext(userId);

            // Generate thread ID if not provided
            const effectiveThreadId = threadId || `thread-${userId}-${Date.now()}`;

            // Invoke Python agent
            const agentResponse = await this.invokePythonAgent(
                userId,
                userName,
                message,
                effectiveThreadId,
                doctorContext
            );

            return res.status(200).json({
                success: true,
                response: agentResponse.response,
                threadId: effectiveThreadId,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.error('Error in DoctorSathi chat:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to process your request',
            });
        }
    }

    /**
     * Fetch doctor's context from database
     * @private
     */
    async fetchDoctorContext(userId) {
        try {
            // Get doctor's appointments with patient information
            const appointments = await dbService.prisma.appointment.findMany({
                where: { doctorId: userId },
                take: 10,
                orderBy: { scheduledAt: 'desc' },
                select: {
                    id: true,
                    patientId: true,
                    scheduledAt: true,
                    status: true,
                    type: true,
                    reason: true,
                    notes: true,
                    patient: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            // Get doctor's prescriptions with patient information
            const prescriptions = await dbService.prisma.prescription.findMany({
                where: { doctorId: userId },
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    patientId: true,
                    medication: true,
                    dosage: true,
                    frequency: true,
                    duration: true,
                    instructions: true,
                    status: true,
                    createdAt: true,
                    patient: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            // Get doctor's medical records with patient information
            const records = await dbService.prisma.medicalRecord.findMany({
                where: { doctorId: userId },
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    patientId: true,
                    diagnosis: true,
                    treatment: true,
                    notes: true,
                    recordType: true,
                    createdAt: true,
                    patient: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            // Get lab tests
            const labTests = await dbService.prisma.labTest.findMany({
                where: { doctorId: userId },
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    patientId: true,
                    testType: true,
                    testName: true,
                    status: true,
                    results: true,
                    priority: true,
                    createdAt: true,
                    patient: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            // Get stats
            const totalAppointments = await dbService.prisma.appointment.count({
                where: { doctorId: userId },
            });

            const pendingAppointments = await dbService.prisma.appointment.count({
                where: { doctorId: userId, status: 'pending' },
            });

            const totalPrescriptions = await dbService.prisma.prescription.count({
                where: { doctorId: userId },
            });

            const totalLabTests = await dbService.prisma.labTest.count({
                where: { doctorId: userId },
            });

            return {
                appointments: appointments.map((a) => ({
                    id: a.id,
                    patientId: a.patientId,
                    patientName: a.patient?.name || 'Unknown',
                    patientEmail: a.patient?.email,
                    scheduledAt: a.scheduledAt?.toISOString(),
                    status: a.status,
                    type: a.type,
                    reason: a.reason,
                    notes: a.notes,
                })),
                prescriptions: prescriptions.map((p) => ({
                    id: p.id,
                    patientId: p.patientId,
                    patientName: p.patient?.name || 'Unknown',
                    patientEmail: p.patient?.email,
                    medication: p.medication,
                    dosage: p.dosage,
                    frequency: p.frequency,
                    duration: p.duration,
                    instructions: p.instructions,
                    status: p.status,
                    createdAt: p.createdAt?.toISOString(),
                })),
                records: records.map((r) => ({
                    id: r.id,
                    patientId: r.patientId,
                    patientName: r.patient?.name || 'Unknown',
                    patientEmail: r.patient?.email,
                    diagnosis: r.diagnosis,
                    treatment: r.treatment,
                    notes: r.notes,
                    recordType: r.recordType,
                    createdAt: r.createdAt?.toISOString(),
                })),
                labTests: labTests.map((l) => ({
                    id: l.id,
                    patientId: l.patientId,
                    patientName: l.patient?.name || 'Unknown',
                    patientEmail: l.patient?.email,
                    testType: l.testType,
                    testName: l.testName,
                    status: l.status,
                    results: l.results,
                    priority: l.priority,
                    createdAt: l.createdAt?.toISOString(),
                })),
                stats: {
                    totalAppointments,
                    pendingAppointments,
                    totalPrescriptions,
                    totalLabTests,
                    totalRecords: records.length,
                },
            };
        } catch (error) {
            logger.error('Error fetching doctor context:', error);
            return {
                appointments: [],
                prescriptions: [],
                records: [],
                labTests: [],
                stats: {},
            };
        }
    }

    /**
     * Invoke Python LangGraph agent
     * @private
     */
    async invokePythonAgent(userId, userName, message, threadId, doctorContext) {
        return new Promise((resolve, reject) => {
            try {
                // Path to Python agent
                const pythonAgentPath = path.join(__dirname, '../../python_agent/run_agent.py');

                // Prepare patient context as JSON string
                const contextJson = JSON.stringify(doctorContext);

                // Spawn Python process
                const pythonProcess = spawn('python', [
                    pythonAgentPath,
                    userId,
                    userName,
                    message,
                    threadId,
                    contextJson,
                ]);

                let stdout = '';
                let stderr = '';

                // Collect stdout
                pythonProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                // Collect stderr
                pythonProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                    logger.warn('Python agent stderr:', data.toString());
                });

                // Handle process completion
                pythonProcess.on('close', (code) => {
                    if (code !== 0) {
                        logger.error('Python agent exited with code:', code);
                        logger.error('stderr:', stderr);
                        return reject(new Error(`Python agent failed with exit code ${code}`));
                    }

                    try {
                        // Parse JSON response from stdout
                        const response = JSON.parse(stdout.trim());

                        if (response.error) {
                            return reject(new Error(response.error));
                        }

                        resolve(response);
                    } catch (parseError) {
                        logger.error('Failed to parse Python agent response:', stdout);
                        logger.error('Parse error:', parseError);
                        reject(new Error('Failed to parse agent response'));
                    }
                });

                // Handle process errors
                pythonProcess.on('error', (error) => {
                    logger.error('Failed to start Python agent:', error);
                    reject(new Error('Failed to start Python agent: ' + error.message));
                });

                // Set timeout (30 seconds)
                setTimeout(() => {
                    pythonProcess.kill();
                    reject(new Error('Python agent timeout'));
                }, 30000);
            } catch (error) {
                logger.error('Error invoking Python agent:', error);
                reject(error);
            }
        });
    }
}

export default DoctorSathiController;
