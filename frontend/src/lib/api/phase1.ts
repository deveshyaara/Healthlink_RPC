/**
 * Phase 1 API Integration Layer
 * Centralized API calls for pharmacy, hospital, and insurance features
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Helper function to make authenticated API calls
async function apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = localStorage.getItem('token');

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

// =============================================================================
// Pharmacy APIs
// =============================================================================

export const pharmacyAPI = {
    /**
     * Register a new pharmacy (admin only)
     */
    register: async (data: {
        name: string;
        licenseNumber: string;
        address: string;
        phone?: string;
        email?: string;
    }) => {
        return apiCall('/api/v1/pharmacy/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Get pharmacy by ID
     */
    getPharmacy: async (pharmacyId: string) => {
        return apiCall(`/api/v1/pharmacy/${pharmacyId}`, {
            method: 'GET',
        });
    },

    /**
     * List all pharmacies
     */
    list: async (params?: { isActive?: boolean; limit?: number; offset?: number }) => {
        const query = new URLSearchParams(params as any).toString();
        return apiCall(`/api/v1/pharmacy?${query}`, {
            method: 'GET',
        });
    },

    /**
     * Verify prescription by QR code or ID
     */
    verifyPrescription: async (pharmacyId: string, data: {
        prescriptionId: string;
        qrCodeHash?: string;
    }) => {
        return apiCall(`/api/v1/pharmacy/${pharmacyId}/verify-prescription`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Dispense a verified prescription
     */
    dispensePrescription: async (pharmacyId: string, data: {
        prescriptionId: string;
    }) => {
        return apiCall(`/api/v1/pharmacy/${pharmacyId}/dispense`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Get pharmacy inventory
     */
    getInventory: async (pharmacyId: string, params?: { limit?: number; offset?: number }) => {
        const query = new URLSearchParams(params as any).toString();
        return apiCall(`/api/v1/pharmacy/${pharmacyId}/inventory?${query}`, {
            method: 'GET',
        });
    },

    /**
     * Add or update drug in inventory
     */
    updateInventory: async (pharmacyId: string, data: {
        drugName: string;
        batchNumber: string;
        quantity: number;
        expiryDate: string;
        manufacturer?: string;
        pricePerUnit?: number;
    }) => {
        return apiCall(`/api/v1/pharmacy/${pharmacyId}/inventory`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Get inventory alerts
     */
    getInventoryAlerts: async (pharmacyId: string) => {
        return apiCall(`/api/v1/pharmacy/${pharmacyId}/inventory/alerts`, {
            method: 'GET',
        });
    },

    /**
     * Get dispensing history
     */
    getDispensingHistory: async (pharmacyId: string, params?: { limit?: number; offset?: number }) => {
        const query = new URLSearchParams(params as any).toString();
        return apiCall(`/api/v1/pharmacy/${pharmacyId}/dispensed?${query}`, {
            method: 'GET',
        });
    },
};

// =============================================================================
// Hospital APIs
// =============================================================================

export const hospitalAPI = {
    /**
     * Register a new hospital (admin only)
     */
    register: async (data: {
        name: string;
        registrationNumber: string;
        type: string;
        address: string;
        phone?: string;
        email?: string;
    }) => {
        return apiCall('/api/v1/hospital/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * List all hospitals
     */
    list: async (params?: { isActive?: boolean; type?: string; limit?: number; offset?: number }) => {
        const query = new URLSearchParams(params as any).toString();
        return apiCall(`/api/v1/hospital?${query}`, {
            method: 'GET',
        });
    },

    /**
     * Get hospital by ID
     */
    getHospital: async (hospitalId: string) => {
        return apiCall(`/api/v1/hospital/${hospitalId}`, {
            method: 'GET',
        });
    },

    /**
     * Update hospital details
     */
    updateHospital: async (hospitalId: string, data: any) => {
        return apiCall(`/api/v1/hospital/${hospitalId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    /**
     * Add department to hospital
     */
    addDepartment: async (hospitalId: string, data: {
        name: string;
        description?: string;
        headDoctorId?: string;
    }) => {
        return apiCall(`/api/v1/hospital/${hospitalId}/departments`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * List hospital departments
     */
    getDepartments: async (hospitalId: string) => {
        return apiCall(`/api/v1/hospital/${hospitalId}/departments`, {
            method: 'GET',
        });
    },

    /**
     * Update department
     */
    updateDepartment: async (hospitalId: string, departmentId: string, data: any) => {
        return apiCall(`/api/v1/hospital/${hospitalId}/departments/${departmentId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    /**
     * Add staff member to hospital
     */
    addStaff: async (hospitalId: string, data: { userId: string }) => {
        return apiCall(`/api/v1/hospital/${hospitalId}/staff`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * List hospital staff
     */
    getStaff: async (hospitalId: string, params?: { role?: string }) => {
        const query = new URLSearchParams(params as any).toString();
        return apiCall(`/api/v1/hospital/${hospitalId}/staff?${query}`, {
            method: 'GET',
        });
    },

    /**
     * Remove staff member from hospital
     */
    removeStaff: async (hospitalId: string, userId: string) => {
        return apiCall(`/api/v1/hospital/${hospitalId}/staff/${userId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Get hospital analytics
     */
    getAnalytics: async (hospitalId: string) => {
        return apiCall(`/api/v1/hospital/${hospitalId}/analytics`, {
            method: 'GET',
        });
    },
};

// =============================================================================
// Insurance APIs
// =============================================================================

export const insuranceAPI = {
    /**
     * Register insurance provider (admin only)
     */
    registerProvider: async (data: {
        name: string;
        registrationNumber: string;
        contactEmail: string;
        contactPhone?: string;
    }) => {
        return apiCall('/api/v1/insurance/providers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * List insurance providers
     */
    listProviders: async (params?: { isActive?: boolean }) => {
        const query = new URLSearchParams(params as any).toString();
        return apiCall(`/api/v1/insurance/providers?${query}`, {
            method: 'GET',
        });
    },

    /**
     * Create insurance policy
     */
    createPolicy: async (data: {
        policyNumber: string;
        providerId: string;
        patientId: string;
        coverageAmount: number;
        validFrom: string;
        validUntil: string;
    }) => {
        return apiCall('/api/v1/insurance/policies', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Get patient's insurance policies
     */
    getPatientPolicies: async (patientId: string) => {
        return apiCall(`/api/v1/insurance/policies/patient/${patientId}`, {
            method: 'GET',
        });
    },

    /**
     * Submit insurance claim
     */
    submitClaim: async (data: {
        policyId: string;
        claimedAmount: number;
        supportingDocs?: string[];
    }) => {
        return apiCall('/api/v1/insurance/claims', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Get claim by ID
     */
    getClaim: async (claimId: string) => {
        return apiCall(`/api/v1/insurance/claims/${claimId}`, {
            method: 'GET',
        });
    },

    /**
     * List claims
     */
    listClaims: async (params?: { status?: string; limit?: number; offset?: number }) => {
        const query = new URLSearchParams(params as any).toString();
        return apiCall(`/api/v1/insurance/claims?${query}`, {
            method: 'GET',
        });
    },

    /**
     * Verify claim (insurance role)
     */
    verifyClaim: async (claimId: string) => {
        return apiCall(`/api/v1/insurance/claims/${claimId}/verify`, {
            method: 'PATCH',
        });
    },

    /**
     * Approve claim with amount (insurance role)
     */
    approveClaim: async (claimId: string, data: { approvedAmount: number }) => {
        return apiCall(`/api/v1/insurance/claims/${claimId}/approve`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    /**
     * Reject claim (insurance role)
     */
    rejectClaim: async (claimId: string, data: { reason: string }) => {
        return apiCall(`/api/v1/insurance/claims/${claimId}/reject`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },
};

export default {
    pharmacy: pharmacyAPI,
    hospital: hospitalAPI,
    insurance: insuranceAPI,
};
