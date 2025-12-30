/**
 * Compliance API Client
 * Frontend client for HIPAA/GDPR compliance and audit trail
 */

import { authUtils } from '../auth-utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Helper function to make authenticated API calls
async function apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = authUtils.getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

export const complianceAPI = {
    /**
     * Generate HIPAA compliance report
     */
    async generateHIPAAReport(startDate: string, endDate: string, format: 'json' | 'pdf' = 'json'): Promise<any> {
        return apiCall('/api/compliance/hipaa', {
            method: 'POST',
            body: JSON.stringify({ startDate, endDate, format }),
        });
    },

    /**
     * Generate GDPR compliance report
     */
    async generateGDPRReport(startDate: string, endDate: string, format: 'json' | 'pdf' = 'json'): Promise<any> {
        return apiCall('/api/compliance/gdpr', {
            method: 'POST',
            body: JSON.stringify({ startDate, endDate, format }),
        });
    },

    /**
     * Get compliance statistics (last 30 days)
     */
    async getStats(): Promise<{
        totalAccesses: number;
        consents: number;
        violations: number;
        users: number;
    }> {
        return apiCall('/api/compliance/stats', {
            method: 'GET',
        });
    },

    /**
     * Get real-time violations (last 24 hours)
     */
    async getViolations(): Promise<any> {
        return apiCall('/api/compliance/violations', {
            method: 'GET',
        });
    },

    /**
     * Get audit logs with filters
     */
    async getAuditLogs(params?: {
        startDate?: string;
        endDate?: string;
        userId?: string;
        action?: string;
        resourceType?: string;
        page?: number;
        limit?: number;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    queryParams.append(key, value.toString());
                }
            });
        }

        return apiCall(`/api/compliance/audit-logs?${queryParams.toString()}`, {
            method: 'GET',
        });
    },

    /**
     * Get saved compliance reports
     */
    async getSavedReports(reportType?: 'HIPAA' | 'GDPR'): Promise<any> {
        const params = reportType ? `?reportType=${reportType}` : '';
        return apiCall(`/api/compliance/reports${params}`, {
            method: 'GET',
        });
    },
};
