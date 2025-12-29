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

        if (!prescriptionId) {
            return res.status(400).json({
                success: false,
                error: 'Prescription ID is required',
            });
        }

        const db = getPrismaClient();

        // Fetch prescription with minimal patient data
        const prescription = await db.prescription.findUnique({
            where: { prescriptionId },
            include: {
                doctor: {
                    select: {
                        id: true,
                        fullName: true,
                        specialization: true,
                        licenseNumber: true,
                    },
                },
                patient: {
                    select: {
                        id: true,
                        name: true,
                        // Explicitly exclude sensitive fields like email, phone, etc.
                    },
                },
            },
        });

        if (!prescription) {
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
                specialization: prescription.doctor?.specialization,
                licenseNumber: prescription.doctor?.licenseNumber,
            },
            patient: {
                name: prescription.patient?.name || 'Patient',
            },
            verifiedAt: new Date().toISOString(),
        };

        // Log verification attempt (for audit trail)
        logger.info('Prescription verified', {
            prescriptionId,
            timestamp: new Date().toISOString(),
            ip: req.ip,
        });

        res.status(200).json({
            success: true,
            data: publicData,
        });
    } catch (error) {
        logger.error('Prescription verification failed:', error);
        next(error);
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
