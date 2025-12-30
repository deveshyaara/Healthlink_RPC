/**
 * Compliance & Audit Service
 * Generates HIPAA/GDPR compliance reports and monitors for violations
 */

import dbService from './db.service.prisma.js';
import logger from '../utils/logger.js';

class ComplianceService {
    /**
     * Generate HIPAA compliance report
     */
    async generateHIPAAReport(startDate, endDate, userId) {
        try {
            logger.info(`Generating HIPAA report from ${startDate} to ${endDate}`);

            const auditData = await this.getAuditData(startDate, endDate);

            const report = {
                reportType: 'HIPAA',
                metadata: {
                    dateRange: { start: startDate, end: endDate },
                    generatedAt: new Date(),
                    totalRecords: auditData.length,
                },

                summary: {
                    totalAccesses: auditData.length,
                    uniqueUsers: new Set(auditData.map(d => d.userId)).size,
                    dataAccesses: auditData.filter(d => d.action === 'DATA_ACCESS').length,
                    consentsGranted: auditData.filter(d => d.action === 'CONSENT_GRANTED').length,
                    consentsRevoked: auditData.filter(d => d.action === 'CONSENT_REVOKED').length,
                    emergencyAccesses: auditData.filter(d => d.emergency).length,
                    violations: auditData.filter(d => !this.isCompliant(d)).length,
                },

                violations: this.detectViolations(auditData),
                accessByUser: this.groupByUser(auditData),
                accessByResource: this.groupByResource(auditData),
                consentTracking: this.analyzeConsents(auditData),
                securityEvents: this.getSecurityEvents(auditData),
            };

            // Save report to database
            const savedReport = await dbService.prisma.complianceReport.create({
                data: {
                    reportType: 'HIPAA',
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    generatedBy: userId,
                    totalRecords: report.summary.totalAccesses,
                    violationsCount: report.summary.violations,
                    reportData: report,
                },
            });

            logger.info(`✅ HIPAA report generated: ${savedReport.id}`);
            return { ...report, reportId: savedReport.id };

        } catch (error) {
            logger.error('Failed to generate HIPAA report:', error);
            throw error;
        }
    }

    /**
     * Generate GDPR compliance report
     */
    async generateGDPRReport(startDate, endDate, userId) {
        try {
            logger.info(`Generating GDPR report from ${startDate} to ${endDate}`);

            const auditData = await this.getAuditData(startDate, endDate);

            const report = {
                reportType: 'GDPR',
                metadata: {
                    dateRange: { start: startDate, end: endDate },
                    generatedAt: new Date(),
                    totalRecords: auditData.length,
                },

                summary: {
                    dataProcessingActivities: auditData.length,
                    rightToAccess: auditData.filter(d => d.action === 'DATA_ACCESS').length,
                    rightToErasure: auditData.filter(d => d.action === 'DATA_DELETE').length,
                    rightToPortability: auditData.filter(d => d.action === 'EXPORT_DATA').length,
                    consents: auditData.filter(d => d.action === 'CONSENT_GRANTED').length,
                    breaches: auditData.filter(d => !d.success).length,
                },

                dataProcessing: this.analyzeDataProcessing(auditData),
                legalBasis: this.analyzeLegalBasis(auditData),
                dataSubjectRights: this.analyzeDataSubjectRights(auditData),
                internationalTransfers: this.analyzeInternationalTransfers(auditData),
            };

            // Save report to database
            const savedReport = await dbService.prisma.complianceReport.create({
                data: {
                    reportType: 'GDPR',
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    generatedBy: userId,
                    totalRecords: report.summary.dataProcessingActivities,
                    violationsCount: report.summary.breaches,
                    reportData: report,
                },
            });

            logger.info(`✅ GDPR report generated: ${savedReport.id}`);
            return { ...report, reportId: savedReport.id };

        } catch (error) {
            logger.error('Failed to generate GDPR report:', error);
            throw error;
        }
    }

    /**
     * Get audit data for specified date range
     */
    async getAuditData(startDate, endDate) {
        return await dbService.prisma.auditLog.findMany({
            where: {
                timestamp: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                    },
                },
                consent: true,
            },
            orderBy: { timestamp: 'desc' },
        });
    }

    /**
     * Check if access is HIPAA compliant
     */
    isCompliant(auditLog) {
        // No consent for sensitive data access
        if (auditLog.action === 'DATA_ACCESS' &&
            auditLog.resourceType === 'PATIENT_RECORD' &&
            !auditLog.consentId &&
            !auditLog.emergency) {
            return false;
        }

        // Admin accessing patient records without reason
        if (auditLog.user.role === 'ADMIN' &&
            auditLog.resourceType === 'PATIENT_RECORD' &&
            !auditLog.emergency) {
            return false;
        }

        // Access outside business hours without emergency flag
        const hour = new Date(auditLog.timestamp).getHours();
        if ((hour < 6 || hour > 22) &&
            !auditLog.emergency &&
            auditLog.action === 'DATA_ACCESS') {
            return false;
        }

        return true;
    }

    /**
     * Detect compliance violations
     */
    detectViolations(auditData) {
        const violations = [];

        for (const log of auditData) {
            if (!this.isCompliant(log)) {
                violations.push({
                    timestamp: log.timestamp,
                    user: log.user.fullName,
                    userId: log.userId,
                    action: log.action,
                    resource: `${log.resourceType}:${log.resourceId}`,
                    reason: this.getViolationReason(log),
                    severity: this.getViolationSeverity(log),
                });
            }
        }

        return violations;
    }

    /**
     * Get violation reason
     */
    getViolationReason(log) {
        if (log.action === 'DATA_ACCESS' && !log.consentId && !log.emergency) {
            return 'Access without patient consent';
        }

        if (log.user.role === 'ADMIN' && log.resourceType === 'PATIENT_RECORD') {
            return 'Admin accessing patient records without authorization';
        }

        const hour = new Date(log.timestamp).getHours();
        if ((hour < 6 || hour > 22) && !log.emergency) {
            return 'Access outside business hours without emergency flag';
        }

        return 'Unknown violation';
    }

    /**
     * Get violation severity
     */
    getViolationSeverity(log) {
        if (!log.consentId && log.action === 'DATA_ACCESS') {
            return 'HIGH';
        }
        if (log.user.role === 'ADMIN') {
            return 'CRITICAL';
        }
        return 'MEDIUM';
    }

    /**
     * Group audit data by user
     */
    groupByUser(auditData) {
        const grouped = {};

        for (const log of auditData) {
            if (!grouped[log.userId]) {
                grouped[log.userId] = {
                    user: log.user.fullName,
                    role: log.user.role,
                    email: log.user.email,
                    totalActions: 0,
                    actions: {},
                };
            }

            grouped[log.userId].totalActions++;
            grouped[log.userId].actions[log.action] =
                (grouped[log.userId].actions[log.action] || 0) + 1;
        }

        return Object.values(grouped);
    }

    /**
     * Group audit data by resource
     */
    groupByResource(auditData) {
        const grouped = {};

        for (const log of auditData) {
            const key = log.resourceType;
            if (!grouped[key]) {
                grouped[key] = {
                    resourceType: log.resourceType,
                    totalAccesses: 0,
                    uniqueUsers: new Set(),
                };
            }

            grouped[key].totalAccesses++;
            grouped[key].uniqueUsers.add(log.userId);
        }

        return Object.values(grouped).map(item => ({
            ...item,
            uniqueUsers: item.uniqueUsers.size,
        }));
    }

    /**
     * Analyze consent tracking
     */
    analyzeConsents(auditData) {
        return {
            granted: auditData.filter(d => d.action === 'CONSENT_GRANTED').length,
            revoked: auditData.filter(d => d.action === 'CONSENT_REVOKED').length,
            withConsent: auditData.filter(d => d.consentId).length,
            withoutConsent: auditData.filter(d =>
                d.action === 'DATA_ACCESS' && !d.consentId && !d.emergency
            ).length,
        };
    }

    /**
     * Get security events
     */
    getSecurityEvents(auditData) {
        return {
            failedAttempts: auditData.filter(d => !d.success).length,
            emergencyAccesses: auditData.filter(d => d.emergency).length,
            deletions: auditData.filter(d => d.action === 'DATA_DELETE').length,
            exports: auditData.filter(d => d.action === 'EXPORT_DATA').length,
        };
    }

    /**
     * GDPR: Analyze data processing activities
     */
    analyzeDataProcessing(auditData) {
        const processing = {};

        for (const log of auditData) {
            const purpose = this.getProcessingPurpose(log.action);
            if (!processing[purpose]) {
                processing[purpose] = {
                    purpose,
                    count: 0,
                    legalBasis: this.getLegalBasis(log),
                };
            }
            processing[purpose].count++;
        }

        return Object.values(processing);
    }

    /**
     * Get processing purpose for GDPR
     */
    getProcessingPurpose(action) {
        const purposes = {
            DATA_CREATE: 'Healthcare Service Provision',
            DATA_ACCESS: 'Healthcare Service Provision',
            DATA_UPDATE: 'Record Maintenance',
            CONSENT_GRANTED: 'Consent Management',
            EXPORT_DATA: 'Data Portability',
        };
        return purposes[action] || 'Other';
    }

    /**
     * Get legal basis for processing
     */
    getLegalBasis(log) {
        if (log.consentId) return 'Consent';
        if (log.emergency) return 'Vital Interests';
        if (log.user.role === 'DOCTOR') return 'Contract (Healthcare Services)';
        return 'Legitimate Interest';
    }

    /**
     * Analyze data subject rights
     */
    analyzeDataSubjectRights(auditData) {
        return {
            rightToAccess: auditData.filter(d => d.action === 'DATA_ACCESS').length,
            rightToRectification: auditData.filter(d => d.action === 'DATA_UPDATE').length,
            rightToErasure: auditData.filter(d => d.action === 'DATA_DELETE').length,
            rightToDataPortability: auditData.filter(d => d.action === 'EXPORT_DATA').length,
        };
    }

    /**
     * Analyze legal basis
     */
    analyzeLegalBasis(auditData) {
        const basis = {
            consent: 0,
            contract: 0,
            legalObligation: 0,
            vitalInterests: 0,
            legitimateInterest: 0,
        };

        for (const log of auditData) {
            const legal = this.getLegalBasis(log);
            if (legal.includes('Consent')) basis.consent++;
            else if (legal.includes('Contract')) basis.contract++;
            else if (legal.includes('Vital')) basis.vitalInterests++;
            else basis.legitimateInterest++;
        }

        return basis;
    }

    /**
     * Analyze international transfers (placeholder)
     */
    analyzeInternationalTransfers(auditData) {
        // Would check IP address geolocation
        return {
            total: 0,
            countries: [],
            safeguards: 'Standard Contractual Clauses',
        };
    }

    /**
     * Real-time violation detection
     */
    async detectRealtimeViolations() {
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const auditData = await this.getAuditData(last24Hours, new Date());

        return this.detectViolations(auditData);
    }

    /**
     * Get compliance statistics
     */
    async getComplianceStats() {
        const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [
            totalAccesses,
            consents,
            violations,
            uniqueUsers,
        ] = await Promise.all([
            dbService.prisma.auditLog.count({
                where: { timestamp: { gte: last30Days } },
            }),
            dbService.prisma.auditLog.count({
                where: {
                    timestamp: { gte: last30Days },
                    action: 'CONSENT_GRANTED',
                },
            }),
            dbService.prisma.auditLog.count({
                where: {
                    timestamp: { gte: last30Days },
                    success: false,
                },
            }),
            dbService.prisma.auditLog.findMany({
                where: { timestamp: { gte: last30Days } },
                select: { userId: true },
                distinct: ['userId'],
            }),
        ]);

        return {
            totalAccesses,
            consents,
            violations,
            users: uniqueUsers.length,
        };
    }
}

export default new ComplianceService();
