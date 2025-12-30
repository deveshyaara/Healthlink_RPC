/**
 * Compliance Controller
 * Handles HIPAA/GDPR compliance reporting and audit trail access
 */

import complianceService from '../services/compliance.service.js';
import logger from '../utils/logger.js';

class ComplianceController {
    /**
     * Generate HIPAA compliance report
     * POST /api/compliance/hipaa
     */
    async generateHIPAAReport(req, res) {
        try {
            const { startDate, endDate, format = 'json' } = req.body;
            const userId = req.user?.userId || req.user?.id;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Start date and end date are required',
                });
            }

            const report = await complianceService.generateHIPAAReport(
                startDate,
                endDate,
                userId
            );

            if (format === 'json') {
                res.json({
                    success: true,
                    report,
                });
            } else {
                // Future: Generate PDF/Excel
                res.json({
                    success: true,
                    message: 'PDF/Excel export coming soon',
                    report,
                });
            }
        } catch (error) {
            logger.error('HIPAA report generation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate HIPAA report',
            });
        }
    }

    /**
     * Generate GDPR compliance report
     * POST /api/compliance/gdpr
     */
    async generateGDPRReport(req, res) {
        try {
            const { startDate, endDate, format = 'json' } = req.body;
            const userId = req.user?.userId || req.user?.id;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Start date and end date are required',
                });
            }

            const report = await complianceService.generateGDPRReport(
                startDate,
                endDate,
                userId
            );

            if (format === 'json') {
                res.json({
                    success: true,
                    report,
                });
            } else {
                res.json({
                    success: true,
                    message: 'PDF/Excel export coming soon',
                    report,
                });
            }
        } catch (error) {
            logger.error('GDPR report generation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate GDPR report',
            });
        }
    }

    /**
     * Get compliance statistics
     * GET /api/compliance/stats
     */
    async getStats(req, res) {
        try {
            const stats = await complianceService.getComplianceStats();

            res.json({
                success: true,
                stats,
            });
        } catch (error) {
            logger.error('Get compliance stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve compliance statistics',
            });
        }
    }

    /**
     * Detect real-time violations
     * GET /api/compliance/violations
     */
    async getViolations(req, res) {
        try {
            const violations = await complianceService.detectRealtimeViolations();

            res.json({
                success: true,
                violations,
                count: violations.length,
            });
        } catch (error) {
            logger.error('Get violations error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve violations',
            });
        }
    }

    /**
     * Get audit logs with filters
     * GET /api/compliance/audit-logs
     */
    async getAuditLogs(req, res) {
        try {
            const { startDate, endDate, userId, action, resourceType, page = 1, limit = 50 } = req.query;

            const where = {};

            if (startDate && endDate) {
                where.timestamp = {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                };
            }

            if (userId) where.userId = userId;
            if (action) where.action = action;
            if (resourceType) where.resourceType = resourceType;

            const db = await import('../services/db.service.prisma.js');
            const prisma = db.default.prisma;

            const [logs, total] = await Promise.all([
                prisma.auditLog.findMany({
                    where,
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                role: true,
                            },
                        },
                    },
                    orderBy: { timestamp: 'desc' },
                    skip: (page - 1) * limit,
                    take: parseInt(limit),
                }),
                prisma.auditLog.count({ where }),
            ]);

            res.json({
                success: true,
                logs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            logger.error('Get audit logs error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve audit logs',
            });
        }
    }

    /**
     * Get saved compliance reports
     * GET /api/compliance/reports
     */
    async getReports(req, res) {
        try {
            const { reportType } = req.query;

            const db = await import('../services/db.service.prisma.js');
            const prisma = db.default.prisma;

            const where = {};
            if (reportType) where.reportType = reportType;

            const reports = await prisma.complianceReport.findMany({
                where,
                include: {
                    generatedByUser: {
                        select: {
                            fullName: true,
                            email: true,
                        },
                    },
                },
                orderBy: { generatedAt: 'desc' },
                take: 20,
            });

            res.json({
                success: true,
                reports,
            });
        } catch (error) {
            logger.error('Get reports error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve reports',
            });
        }
    }
}

export default new ComplianceController();
