/**
 * Lab API Client
 * Frontend API client for laboratory operations
 */

import { fetchApi } from '../api-client';

export const labApi = {
    /**
     * Get all tests for a lab
     */
    getLabTests: async (labId: string, params?: { status?: string; limit?: number; offset?: number }) => {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append('status', params.status);
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.offset) queryParams.append('offset', params.offset.toString());

        const queryString = queryParams.toString();
        const url = `/api/v1/lab/${labId}/tests${queryString ? `?${queryString}` : ''}`;
        return fetchApi<any>(url, { method: 'GET' });
    },

    /**
     * Get pending tests for a lab
     */
    getPendingTests: async (labId: string) => {
        return fetchApi<any>(`/api/v1/lab/${labId}/pending-tests`, { method: 'GET' });
    },

    /**
     * Get specific test details
     */
    getTest: async (labId: string, testId: string) => {
        return fetchApi<any>(`/api/v1/lab/${labId}/tests/${testId}`, { method: 'GET' });
    },

    /**
     * Upload test results
     */
    uploadResults: async (labId: string, testId: string, data: { results: string; notes?: string }) => {
        return fetchApi<any>(`/api/v1/lab/${labId}/tests/${testId}/upload-results`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Update test status
     */
    updateTestStatus: async (labId: string, testId: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => {
        return fetchApi<any>(`/api/v1/lab/${labId}/tests/${testId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    /**
     * Get lab statistics
     */
    getLabStats: async (labId: string) => {
        return fetchApi<any>(`/api/v1/lab/${labId}/stats`, { method: 'GET' });
    },

    /**
     * Get tests by patient
     */
    getTestsByPatient: async (labId: string, patientId: string) => {
        return fetchApi<any>(`/api/v1/lab/${labId}/tests/patient/${patientId}`, { method: 'GET' });
    },
};
