/**
 * Lab Controller
 * Handles laboratory operations: test result uploads, status updates, test management
 */

import logger from '../utils/logger.js';
import dbService from '../services/db.service.prisma.js';

class LabController {
    /**
     * Get all tests assigned to a specific lab
     * GET /api/v1/lab/:labId/tests
     */
    async getLabTests(req, res) {
        try {
            const { labId } = req.params;
            const { status, limit = 50, offset = 0 } = req.query;

            const where = { labId };
            if (status) {
                where.status = status.toUpperCase();
            }

            const tests = await dbService.prisma.labTest.findMany({
                where,
                take: parseInt(limit),
                skip: parseInt(offset),
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                    doctor: {
                        select: {
                            fullName: true,
                            email: true,
                        },
                    },
                },
            });

            const total = await dbService.prisma.labTest.count({ where });

            res.json({
                status: 'success',
                data: tests,
                pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
            });
        } catch (error) {
            logger.error('Failed to get lab tests:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve lab tests',
            });
        }
    }

    /**
     * Get pending tests for a lab
     * GET /api/v1/lab/:labId/pending-tests
     */
    async getPendingTests(req, res) {
        try {
            const { labId } = req.params;

            const tests = await dbService.prisma.labTest.findMany({
                where: {
                    labId,
                    status: 'PENDING',
                },
                orderBy: { createdAt: 'asc' },
                include: {
                    patient: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                    doctor: {
                        select: {
                            fullName: true,
                            email: true,
                        },
                    },
                },
            });

            res.json({
                status: 'success',
                data: tests,
            });
        } catch (error) {
            logger.error('Failed to get pending tests:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve pending tests',
            });
        }
    }

    /**
     * Get a specific test by ID
     * GET /api/v1/lab/:labId/tests/:testId
     */
    async getTest(req, res) {
        try {
            const { testId } = req.params;

            const test = await dbService.prisma.labTest.findUnique({
                where: { testId },
                include: {
                    patient: {
                        select: {
                            name: true,
                            email: true,
                            walletAddress: true,
                        },
                    },
                    doctor: {
                        select: {
                            fullName: true,
                            email: true,
                            doctorSpecialization: true,
                        },
                    },
                    lab: {
                        select: {
                            fullName: true,
                            email: true,
                        },
                    },
                },
            });

            if (!test) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Lab test not found',
                });
            }

            res.json({
                status: 'success',
                data: test,
            });
        } catch (error) {
            logger.error('Failed to get lab test:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve lab test',
            });
        }
    }

    /**
     * Upload test results
     * POST /api/v1/lab/:labId/tests/:testId/upload-results
     */
    async uploadResults(req, res) {
        try {
            const { testId } = req.params;
            const { results, notes } = req.body;
            const labStaffId = req.user.userId;

            if (!results) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Test results are required',
                });
            }

            // Check if test exists and is assigned to this lab
            const test = await dbService.prisma.labTest.findUnique({
                where: { testId },
            });

            if (!test) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Lab test not found',
                });
            }

            // Update test with results
            const updatedTest = await dbService.prisma.labTest.update({
                where: { testId },
                data: {
                    results,
                    status: 'COMPLETED',
                    performedAt: new Date(),
                    updatedAt: new Date(),
                },
                include: {
                    patient: true,
                    doctor: true,
                },
            });

            logger.info(`✅ Lab results uploaded for test: ${testId} by staff: ${labStaffId}`);

            // TODO: Send notification to doctor and patient about completed results
            // await notificationService.notifyTestCompleted(updatedTest);

            res.json({
                status: 'success',
                message: 'Test results uploaded successfully',
                data: updatedTest,
            });
        } catch (error) {
            logger.error('Failed to upload test results:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to upload test results',
            });
        }
    }

    /**
     * Update test status
     * PATCH /api/v1/lab/:labId/tests/:testId/status
     */
    async updateTestStatus(req, res) {
        try {
            const { testId } = req.params;
            const { status } = req.body;

            const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    status: 'error',
                    message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
                });
            }

            const test = await dbService.prisma.labTest.update({
                where: { testId },
                data: {
                    status,
                    updatedAt: new Date(),
                    ...(status === 'IN_PROGRESS' && { performedAt: new Date() }),
                },
            });

            logger.info(`✅ Lab test ${testId} status updated to: ${status}`);

            res.json({
                status: 'success',
                message: 'Test status updated successfully',
                data: test,
            });
        } catch (error) {
            logger.error('Failed to update test status:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to update test status',
            });
        }
    }

    /**
     * Get lab statistics
     * GET /api/v1/lab/:labId/stats
     */
    async getLabStats(req, res) {
        try {
            const { labId } = req.params;

            const [total, pending, inProgress, completed] = await Promise.all([
                dbService.prisma.labTest.count({ where: { labId } }),
                dbService.prisma.labTest.count({ where: { labId, status: 'PENDING' } }),
                dbService.prisma.labTest.count({ where: { labId, status: 'IN_PROGRESS' } }),
                dbService.prisma.labTest.count({ where: { labId, status: 'COMPLETED' } }),
            ]);

            res.json({
                status: 'success',
                data: {
                    total,
                    pending,
                    inProgress,
                    completed,
                },
            });
        } catch (error) {
            logger.error('Failed to get lab stats:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve lab statistics',
            });
        }
    }

    /**
     * Search tests by patient
     * GET /api/v1/lab/:labId/tests/patient/:patientId
     */
    async getTestsByPatient(req, res) {
        try {
            const { labId, patientId } = req.params;

            const tests = await dbService.prisma.labTest.findMany({
                where: {
                    labId,
                    patientId,
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    doctor: {
                        select: {
                            fullName: true,
                            doctorSpecialization: true,
                        },
                    },
                },
            });

            res.json({
                status: 'success',
                data: tests,
            });
        } catch (error) {
            logger.error('Failed to get tests by patient:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve patient tests',
            });
        }
    }
}

export default new LabController();
