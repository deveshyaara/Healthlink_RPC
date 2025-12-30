import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/v1/activity/recent
 * @desc    Get recent activity across the system
 * @access  Private
 */
router.get('/recent', authenticateJWT, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Get recent appointments
        const appointments = await prisma.appointment.findMany({
            where: userRole === 'patient'
                ? { patientId: userId }
                : userRole === 'doctor'
                    ? { doctorId: userId }
                    : {},
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
                appointmentId: true,
                createdAt: true,
                doctorId: true,
                patientId: true,
            },
        });

        // Get recent prescriptions
        const prescriptions = await prisma.prescription.findMany({
            where: userRole === 'patient'
                ? { patientId: userId }
                : userRole === 'doctor'
                    ? { doctorId: userId }
                    : {},
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
                prescriptionId: true,
                createdAt: true,
                doctorId: true,
                patientId: true,
            },
        });

        // Get recent medical records
        const records = await prisma.medicalRecord.findMany({
            where: userRole === 'patient'
                ? { patientId: userId }
                : userRole === 'doctor'
                    ? { doctorId: userId }
                    : {},
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
                recordId: true,
                createdAt: true,
                doctorId: true,
                patientId: true,
                recordType: true,
            },
        });

        // Get recent consents
        const consents = await prisma.consent.findMany({
            where: userRole === 'patient'
                ? { patientId: userId }
                : {},
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
                consentId: true,
                createdAt: true,
                patientId: true,
                granteeId: true,
            },
        });

        // Combine and format activities
        const activities = [
            ...appointments.map(a => ({
                id: a.appointmentId,
                type: 'appointment',
                description: 'Appointment scheduled',
                user: a.doctorId,
                timestamp: a.createdAt,
            })),
            ...prescriptions.map(p => ({
                id: p.prescriptionId,
                type: 'prescription',
                description: 'Prescription created',
                user: p.doctorId,
                timestamp: p.createdAt,
            })),
            ...records.map(r => ({
                id: r.recordId,
                type: 'record',
                description: `Medical record uploaded: ${r.recordType}`,
                user: r.doctorId,
                timestamp: r.createdAt,
            })),
            ...consents.map(c => ({
                id: c.consentId,
                type: 'consent',
                description: 'Consent granted',
                user: c.granteeId,
                timestamp: c.createdAt,
            })),
        ];

        // Sort by timestamp and limit
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const recentActivities = activities.slice(0, limit);

        // Format timestamps
        const formattedActivities = recentActivities.map(activity => ({
            ...activity,
            timestamp: formatTimeAgo(activity.timestamp),
        }));

        res.json({
            success: true,
            activities: formattedActivities,
        });
    } catch (error) {
        console.error('Activity fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent activity',
            error: error.message,
        });
    }
});

// Helper function to format time ago
function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
}

export default router;
