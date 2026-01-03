import { spawn } from 'child_process';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import dbService from '../services/db.service.prisma.js';
import { validateActionData } from '../types/actions.js';
import actionExecutor from '../services/action-executor.service.js';

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
            const doctorContext = await this.fetchDoctorContext(userId, userName);

            // Generate thread ID if not provided
            const effectiveThreadId = threadId || `thread - ${userId} -${Date.now()} `;

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
                actions: agentResponse.actions || [],  // Include actions
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
     * POST /api/doctorsathi/execute
     * Execute AI-generated action
     */
    async executeAction(req, res) {
        try {
            const { actionId, actionType, actionData } = req.body;
            const userId = req.user?.id;
            const userRole = req.user?.role;

            // Validate request
            if (!actionType || !actionData) {
                return res.status(400).json({
                    success: false,
                    error: 'Action type and data are required',
                });
            }

            // Verify user is a doctor
            if (userRole !== 'doctor') {
                return res.status(403).json({
                    success: false,
                    error: 'Only doctors can execute actions',
                });
            }

            logger.info('Executing action', { actionId, actionType, doctorId: userId });

            // Validate action data
            const validation = validateActionData(actionType, actionData);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid action data',
                    errors: validation.errors,
                });
            }

            // Execute action
            const result = await actionExecutor.executeAction(
                { type: actionType, data: actionData },
                userId
            );

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: result.message,
                });
            }

            logger.info('Action executed successfully', { actionId, result: result.data });

            return res.status(200).json({
                success: true,
                message: result.message,
                data: result.data,
            });
        } catch (error) {
            logger.error('Error executing action:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to execute action',
            });
        }
    }

    /**
     * Fetch doctor's context from database
     * @private
     */
    async fetchDoctorContext(userId, userName = 'Doctor') {
        try {
            // Get doctor's appointments with patient information
            const appointments = await dbService.prisma.appointment.findMany({
                where: { doctorId: userId },
                take: 10,
                orderBy: { scheduledAt: 'desc' },
                select: {
                    id: true,
                    appointmentId: true,
                    patientId: true,
                    title: true,
                    description: true,
                    scheduledAt: true,
                    status: true,
                    notes: true,
                    location: true,
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
                    prescriptionId: true,
                    patientId: true,
                    medication: true,
                    dosage: true,
                    instructions: true,
                    expiryDate: true,
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
                    recordId: true,
                    patientId: true,
                    title: true,
                    description: true,
                    recordType: true,
                    ipfsHash: true,
                    fileName: true,
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
                    testId: true,
                    patientId: true,
                    testName: true,
                    testType: true,
                    results: true,
                    status: true,
                    performedAt: true,
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
            // Get all unique patients for this doctor
            const patientIds = new Set();
            appointments.forEach(a => patientIds.add(a.patientId));
            prescriptions.forEach(p => patientIds.add(p.patientId));
            records.forEach(r => patientIds.add(r.patientId));
            labTests.forEach(l => patientIds.add(l.patientId));

            const patients = await dbService.prisma.patientWalletMapping.findMany({
                where: {
                    id: { in: Array.from(patientIds) },
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    walletAddress: true,
                },
            });

            // Get stats
            const totalAppointments = await dbService.prisma.appointment.count({
                where: { doctorId: userId },
            });

            const pendingAppointments = await dbService.prisma.appointment.count({
                where: {
                    doctorId: userId,
                    status: 'SCHEDULED'  // Valid enum value for pending appointments
                },
            });

            const totalPrescriptions = await dbService.prisma.prescription.count({
                where: { doctorId: userId },
            });

            const totalLabTests = await dbService.prisma.labTest.count({
                where: { doctorId: userId },
            });

            return {
                name: userName || 'Doctor',  // Add doctor's name for the AI
                appointments: appointments.map((a) => ({
                    id: a.id,
                    appointmentId: a.appointmentId,
                    patientId: a.patientId,
                    patientName: a.patient?.name || 'Unknown',
                    patientEmail: a.patient?.email,
                    title: a.title,
                    description: a.description,
                    scheduledAt: a.scheduledAt?.toISOString(),
                    status: a.status,
                    notes: a.notes,
                    location: a.location,
                })),
                prescriptions: prescriptions.map((p) => ({
                    id: p.id,
                    prescriptionId: p.prescriptionId,
                    patientId: p.patientId,
                    patientName: p.patient?.name || 'Unknown',
                    patientEmail: p.patient?.email,
                    medication: p.medication,
                    dosage: p.dosage,
                    instructions: p.instructions,
                    expiryDate: p.expiryDate?.toISOString(),
                    status: p.status,
                    createdAt: p.createdAt?.toISOString(),
                })),
                records: records.map((r) => ({
                    id: r.id,
                    recordId: r.recordId,
                    patientId: r.patientId,
                    patientName: r.patient?.name || 'Unknown',
                    patientEmail: r.patient?.email,
                    title: r.title,
                    description: r.description,
                    recordType: r.recordType,
                    ipfsHash: r.ipfsHash,
                    fileName: r.fileName,
                    createdAt: r.createdAt?.toISOString(),
                })),
                labTests: labTests.map((l) => ({
                    id: l.id,
                    testId: l.testId,
                    patientId: l.patientId,
                    patientName: l.patient?.name || 'Unknown',
                    patientEmail: l.patient?.email,
                    testName: l.testName,
                    testType: l.testType,
                    results: l.results,
                    status: l.status,
                    performedAt: l.performedAt?.toISOString(),
                    createdAt: l.createdAt?.toISOString(),
                })),
                patients: patients.map((p) => ({
                    id: p.id,
                    name: p.name,
                    email: p.email,
                    walletAddress: p.walletAddress,
                })),
                stats: {
                    totalPatients: patients.length,
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
            let timeout;  // Declare timeout variable

            try {
                // Path to Python agent
                const pythonAgentPath = path.join(__dirname, '../../python_agent/run_agent.py');

                // Prepare patient context as JSON string
                const contextJson = JSON.stringify(doctorContext);

                // Debug: Log context being sent to Python
                logger.info(`Doctor context being sent to Python agent: `, {
                    patientsCount: doctorContext.patients?.length || 0,
                    appointmentsCount: doctorContext.appointments?.length || 0,
                    prescriptionsCount: doctorContext.prescriptions?.length || 0,
                    recordsCount: doctorContext.records?.length || 0,
                    labTestsCount: doctorContext.labTests?.length || 0,
                    stats: doctorContext.stats
                });

                // Try different Python executables (Windows/Unix compatibility)
                const pythonExecutables = process.platform === 'win32'
                    ? ['python', 'py', 'python3']  // Windows order
                    : ['python3', 'python'];       // Unix order

                let pythonProcess = null;
                let lastError = null;

                // Try to spawn with each executable
                for (const pythonCmd of pythonExecutables) {
                    try {
                        pythonProcess = spawn(pythonCmd, [
                            pythonAgentPath,
                            userId,
                            userName,
                            message,
                            threadId,
                            contextJson,
                        ]);

                        // Successfully spawned, break the loop
                        break;
                    } catch (spawnError) {
                        lastError = spawnError;
                        logger.warn(`Failed to spawn with ${pythonCmd}: `, spawnError.message);
                        continue;
                    }
                }

                if (!pythonProcess) {
                    const errorMsg = 'Python is not installed or not in PATH. Please install Python 3.8+ and ensure it is accessible.';
                    logger.error(errorMsg);
                    return reject(new Error(errorMsg));
                }

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
                        return reject(new Error(`Python agent failed with exit code ${code} `));
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
                    clearTimeout(timeout); // Clear timeout on error
                    logger.error('Failed to start Python agent:', error);
                    reject(new Error('Failed to start Python agent: ' + error.message));
                });

                // Timeout after 60 seconds (increased for LLM processing)
                timeout = setTimeout(() => {
                    pythonProcess.kill();
                    reject(new Error('Python agent timeout'));
                }, 60000);
            } catch (error) {
                logger.error('Error invoking Python agent:', error);
                reject(error);
            }
        });
    }
}

export default DoctorSathiController;
