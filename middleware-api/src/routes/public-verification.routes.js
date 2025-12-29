import express from 'express';
import dbService from '../services/db.service.prisma.js';
import logger from '../utils/logger.js';

const router = express.Router();

function getPrismaClient() {
    if (dbService && dbService.isReady && dbService.isReady()) {
        return dbService.prisma;
    }
    throw new Error('Database not connected');
}

/**
 * @route   GET /api/public/verify/prescription/:prescriptionId
 * @desc    Public endpoint to verify prescription details (for pharmacy use)
 * @access  Public (no authentication required)
 */
router.get('/prescription/:prescriptionId', async (req, res, next) => {
    try {
        const { prescriptionId } = req.params;

        logger.info('=== PUBLIC VERIFICATION REQUEST ===');
        logger.info('Prescription ID:', prescriptionId);

        if (!prescriptionId) {
            return res.status(400).json({
                success: false,
                error: 'Prescription ID is required',
            });
        }

        // Check database connection
        let db;
        try {
            db = getPrismaClient();
            logger.info('✅ Database connection successful');
        } catch (dbError) {
            logger.error('❌ Database connection failed:', dbError);
            return res.status(503).json({
                success: false,
                error: 'Service temporarily unavailable. Please try again later.',
            });
        }

        // First, try to find the prescription without includes to see if it exists at all
        try {
            const prescriptionExists = await db.prescription.findUnique({
                where: { prescriptionId },
            });

            logger.info('Raw prescription lookup result:', prescriptionExists ? 'FOUND' : 'NOT FOUND');
            if (prescriptionExists) {
                logger.info('Prescription data:', JSON.stringify(prescriptionExists, null, 2));
            }
        } catch (checkError) {
            logger.error('Error checking prescription existence:', checkError);
        }

        // Fetch prescription with minimal patient data
        let prescription;
        try {
            logger.info('Attempting full query with includes...');
            prescription = await db.prescription.findUnique({
                where: { prescriptionId },
                include: {
                    doctor: {
                        select: {
                            id: true,
                            fullName: true,
                            doctorSpecialization: true,
                            doctorLicenseNumber: true,
                        },
                    },
                    patient: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            if (prescription) {
                logger.info('✅ Prescription found with includes');
                logger.info('Doctor data:', prescription.doctor);
                logger.info('Patient data:', prescription.patient);
            } else {
                logger.warn('❌ Prescription NOT found with includes');
            }
        } catch (queryError) {
            logger.error('❌ Database query failed:', queryError);
            logger.error('Error details:', queryError.message);
            logger.error('Stack:', queryError.stack);
            return res.status(500).json({
                success: false,
                error: 'Failed to retrieve prescription',
            });
        }

        if (!prescription) {
            logger.info('404 Response: Prescription not found for ID:', prescriptionId);
            return res.status(404).json({
                success: false,
                error: 'Prescription not found',
            });
        }

        // Check if prescription is expired
        const isExpired = prescription.expiryDate && new Date(prescription.expiryDate) < new Date();

        // Return only public-safe data
        const publicData = {
            prescriptionId: prescription.prescriptionId,
            medication: prescription.medication,
            dosage: prescription.dosage,
            instructions: prescription.instructions,
            status: prescription.status,
            expiryDate: prescription.expiryDate,
            isExpired,
            createdAt: prescription.createdAt,
            doctor: {
                name: prescription.doctor?.fullName || 'Unknown',
                specialization: prescription.doctor?.doctorSpecialization,
                licenseNumber: prescription.doctor?.doctorLicenseNumber,
            },
            patient: {
                name: prescription.patient?.name || 'Patient',
            },
            verifiedAt: new Date().toISOString(),
        };

        // Log verification attempt (for audit trail)
        logger.info('✅ Prescription verified successfully', {
            prescriptionId,
            timestamp: new Date().toISOString(),
            ip: req.ip,
        });

        res.status(200).json({
            success: true,
            data: publicData,
        });
    } catch (error) {
        logger.error('❌ Prescription verification failed with unexpected error:', error);
        logger.error('Error message:', error.message);
        logger.error('Stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
        });
    }
});

/**
 * @route   GET /api/public/verify/appointment/:appointmentId
 * @desc    Public endpoint to verify appointment details
 * @access  Public (no authentication required)
 */
router.get('/appointment/:appointmentId', async (req, res, next) => {
    try {
        const { appointmentId } = req.params;

        if (!appointmentId) {
            return res.status(400).json({
                success: false,
                error: 'Appointment ID is required',
            });
        }

        const db = getPrismaClient();

        const appointment = await db.appointment.findUnique({
            where: { appointmentId },
            include: {
                doctor: {
                    select: {
                        id: true,
                        fullName: true,
                        specialization: true,
                    },
                },
                patient: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found',
            });
        }

        // Return only public-safe data
        const publicData = {
            appointmentId: appointment.appointmentId,
            title: appointment.title,
            scheduledAt: appointment.scheduledAt,
            status: appointment.status,
            doctor: {
                name: appointment.doctor?.fullName || 'Unknown',
                specialization: appointment.doctor?.specialization,
            },
            patient: {
                name: appointment.patient?.name || 'Patient',
            },
            verifiedAt: new Date().toISOString(),
        };

        logger.info('Appointment verified', {
            appointmentId,
            timestamp: new Date().toISOString(),
            ip: req.ip,
        });

        res.status(200).json({
            success: true,
            data: publicData,
        });
    } catch (error) {
        logger.error('Appointment verification failed:', error);
        next(error);
    }
});

export default router;
