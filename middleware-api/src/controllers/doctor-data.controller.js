/**
 * Doctor Data Controller
 * Handles data retrieval for doctor-specific queries
 * Queries by doctorId instead of patientId
 */

import { getPrismaClient } from '../services/db.service.prisma.js';
import logger from '../utils/logger.js';

class DoctorDataController {
    /**
     * Get all appointments for current doctor
     * GET /api/doctor/appointments
     */
    async getAppointments(req, res, next) {
        try {
            const doctorId = req.user?.userId || req.user?.id;

            if (!doctorId) {
                return res.status(401).json({
                    success: false,
                    error: 'Doctor authentication required'
                });
            }

            logger.info(`Fetching appointments for doctor: ${doctorId}`);

            const db = getPrismaClient();

            // Query appointments WHERE doctor_id matches this doctor's user ID
            const appointments = await db.appointment?.findMany({
                where: { doctorId: doctorId },
                include: {
                    patient: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            walletAddress: true
                        }
                    },
                    doctor: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true
                        }
                    }
                },
                orderBy: { scheduledAt: 'desc' }
            }) || [];

            logger.info(`Found ${appointments.length} appointments for doctor ${doctorId}`);

            res.json({
                success: true,
                data: appointments,
                appointments: appointments, // Alias for compatibility
                count: appointments.length
            });
        } catch (error) {
            logger.error('Failed to fetch doctor appointments:', error);
            next(error);
        }
    }

    /**
     * Get all prescriptions for current doctor
     * GET /api/doctor/prescriptions
     */
    async getPrescriptions(req, res, next) {
        try {
            const doctorId = req.user?.userId || req.user?.id;

            if (!doctorId) {
                return res.status(401).json({
                    success: false,
                    error: 'Doctor authentication required'
                });
            }

            logger.info(`Fetching prescriptions for doctor: ${doctorId}`);

            const db = getPrismaClient();

            // Query prescriptions WHERE doctor_id matches this doctor's user ID
            const prescriptions = await db.prescription?.findMany({
                where: { doctorId: doctorId },
                include: {
                    patient: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            walletAddress: true
                        }
                    },
                    doctor: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }) || [];

            logger.info(`Found ${prescriptions.length} prescriptions for doctor ${doctorId}`);

            res.json({
                success: true,
                data: prescriptions,
                prescriptions: prescriptions, // Alias for compatibility
                count: prescriptions.length
            });
        } catch (error) {
            logger.error('Failed to fetch doctor prescriptions:', error);
            next(error);
        }
    }

    /**
     * Get all medical records for current doctor
     * GET /api/doctor/medical-records
     */
    async getMedicalRecords(req, res, next) {
        try {
            const doctorId = req.user?.userId || req.user?.id;

            if (!doctorId) {
                return res.status(401).json({
                    success: false,
                    error: 'Doctor authentication required'
                });
            }

            logger.info(`Fetching medical records for doctor: ${doctorId}`);

            const db = getPrismaClient();

            // Query medical records WHERE doctor_id matches this doctor's user ID
            const records = await db.medicalRecord?.findMany({
                where: { doctorId: doctorId },
                include: {
                    patient: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            walletAddress: true
                        }
                    },
                    doctor: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }) || [];

            logger.info(`Found ${records.length} medical records for doctor ${doctorId}`);

            res.json({
                success: true,
                data: records,
                records: records, // Alias for compatibility
                count: records.length
            });
        } catch (error) {
            logger.error('Failed to fetch doctor medical records:', error);
            next(error);
        }
    }

    /**
     * Get all lab tests for current doctor
     * GET /api/doctor/lab-tests
     */
    async getLabTests(req, res, next) {
        try {
            const doctorId = req.user?.userId || req.user?.id;

            if (!doctorId) {
                return res.status(401).json({
                    success: false,
                    error: 'Doctor authentication required'
                });
            }

            logger.info(`Fetching lab tests for doctor: ${doctorId}`);

            const db = getPrismaClient();

            // Query lab tests WHERE doctor_id matches this doctor's user ID
            const labTests = await db.labTest?.findMany({
                where: { doctorId: doctorId },
                include: {
                    patient: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            walletAddress: true
                        }
                    },
                    doctor: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }) || [];

            logger.info(`Found ${labTests.length} lab tests for doctor ${doctorId}`);

            res.json({
                success: true,
                data: labTests,
                labTests: labTests, // Alias for compatibility
                count: labTests.length
            });
        } catch (error) {
            logger.error('Failed to fetch doctor lab tests:', error);
            next(error);
        }
    }

    /**
     * Get all patients for current doctor
     * GET /api/doctor/patients
     */
    async getPatients(req, res, next) {
        try {
            const doctorId = req.user?.userId || req.user?.id;

            if (!doctorId) {
                return res.status(401).json({
                    success: false,
                    error: 'Doctor authentication required'
                });
            }

            logger.info(`Fetching patients for doctor: ${doctorId}`);

            const db = getPrismaClient();

            // Get unique patients from appointments created by this doctor
            const appointments = await db.appointment?.findMany({
                where: { doctorId: doctorId },
                distinct: ['patientId'],
                include: {
                    patient: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    fullName: true,
                                    isActive: true
                                }
                            }
                        }
                    }
                }
            }) || [];

            const patients = appointments.map(appt => ({
                id: appt.patient.id,
                email: appt.patient.email,
                name: appt.patient.name,
                walletAddress: appt.patient.walletAddress,
                userId: appt.patient.userId,
                isActive: appt.patient.user?.isActive || false,
                createdAt: appt.patient.createdAt
            }));

            logger.info(`Found ${patients.length} patients for doctor ${doctorId}`);

            res.json({
                success: true,
                data: patients,
                patients: patients,
                count: patients.length
            });
        } catch (error) {
            logger.error('Failed to fetch doctor patients:', error);
            next(error);
        }
    }
}

export default new DoctorDataController();
