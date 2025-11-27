/**
 * API Client for Backend Communication
 * This file contains utility functions for making API requests to the backend
 * 
 * NOTE: In GitHub Codespace, uses port-forwarded URL (https://{codespace}-4000.github.dev)
 * In local dev, uses http://localhost:4000 or Next.js proxy
 */

import type { User } from '@/contexts/auth-context';
import { getApiBaseUrl } from './env-utils';

// Dynamic URL detection at runtime
let API_BASE_URL = '';

// Initialize on first use (avoids SSR issues)
function getBaseUrl(): string {
  if (!API_BASE_URL) {
    API_BASE_URL = getApiBaseUrl();
  }
  return API_BASE_URL;
}

// Get token for authenticated requests
const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

type ApiRequestOptions = RequestInit & { requiresAuth?: boolean };

/**
 * Generic API request handler with optional Bearer token support
 */
async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;
  const { requiresAuth = false, ...requestOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(requestOptions.headers as Record<string, string>),
  };

  // Add Bearer token for protected endpoints
  if (requiresAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token available');
    }
  }

  try {
    const response = await fetch(url, {
      ...requestOptions,
      headers,
    });

    if (!response.ok) {
      let errorMessage = 'API request failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || response.statusText;
      } catch {
        errorMessage = response.statusText || `HTTP ${response.status}`;
      }
      throw new Error(`${response.status}: ${errorMessage}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('API request error:', message);
    throw new Error(message);
  }
}

/**
 * Authentication API
 */
export const authApi = {
  register: async (data: { name: string; email: string; password: string; role: string }) => {
    return apiRequest<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login: async (credentials: { email: string; password: string }) => {
    return apiRequest<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  logout: async () => {
    return apiRequest('/api/auth/logout', {
      method: 'POST',
      requiresAuth: true,
    });
  },

  getMe: async () => {
    return apiRequest<{ message: string; user: User }>('/api/auth/me', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  refreshToken: async () => {
    return apiRequest<{ message: string; token: string }>('/api/auth/refresh', {
      method: 'POST',
      requiresAuth: true,
    });
  },
};

/**
 * Doctors API
 */
export const doctorsApi = {
  registerDoctor: async (data: {
    doctorId: string;
    name: string;
    specialization: string;
    licenseNumber: string;
    hospital: string;
    credentials: { degree: string };
    contact: { email: string; phone: string };
  }) => {
    return apiRequest('/api/doctors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getDoctor: async (doctorId: string) => {
    return apiRequest(`/api/doctors/${doctorId}`);
  },

  verifyDoctor: async (doctorId: string, data: { status: string; comments: string }) => {
    return apiRequest(`/api/doctors/${doctorId}/verify`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  suspendDoctor: async (doctorId: string, data: { reason: string }) => {
    return apiRequest(`/api/doctors/${doctorId}/suspend`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateDoctorProfile: async (doctorId: string, data: { updates: { phone?: string; email?: string } }) => {
    return apiRequest(`/api/doctors/${doctorId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getDoctorsBySpecialization: async (specialization: string) => {
    return apiRequest(`/api/doctors/specialization/${encodeURIComponent(specialization)}`);
  },

  getDoctorsByHospital: async (hospital: string) => {
    return apiRequest(`/api/doctors/hospital/${encodeURIComponent(hospital)}`);
  },
};

/**
 * Medical Records API
 */
export const medicalRecordsApi = {
  getAllRecords: async (pageSize?: string, bookmark?: string) => {
    const params = new URLSearchParams();
    if (pageSize) params.append('pageSize', pageSize);
    if (bookmark) params.append('bookmark', bookmark);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/medical-records/paginated${query}`, { requiresAuth: true });
  },

  createRecord: async (data: {
    recordId: string;
    doctorId: string;
    recordType: string;
    ipfsHash: string;
    metadata?: Record<string, unknown>;
  }) => {
    return apiRequest('/api/medical-records', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  getRecord: async (recordId: string, patientId: string, accessReason: string) => {
    return apiRequest(`/api/medical-records/${recordId}?patientId=${patientId}&accessReason=${accessReason}`);
  },

  updateRecord: async (recordId: string, data: { patientId: string; ipfsHash: string; metadata?: Record<string, unknown> }) => {
    return apiRequest(`/api/medical-records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getRecordsByPatient: async (patientId: string) => {
    return apiRequest(`/api/medical-records/patient/${patientId}`);
  },

  getRecordsByDoctor: async (doctorId: string) => {
    return apiRequest(`/api/medical-records/doctor/${doctorId}`);
  },

  searchRecords: async (tags: string[]) => {
    return apiRequest('/api/medical-records/search', {
      method: 'POST',
      body: JSON.stringify({ tags }),
    });
  },

  archiveRecord: async (recordId: string, patientId: string) => {
    return apiRequest(`/api/medical-records/${recordId}/archive`, {
      method: 'DELETE',
      body: JSON.stringify({ patientId }),
    });
  },

  getRecordAccessLog: async (recordId: string) => {
    return apiRequest(`/api/medical-records/${recordId}/access-log`);
  },

  getRecordHistory: async (recordId: string) => {
    return apiRequest(`/api/medical-records/${recordId}/history`);
  },
};

/**
 * Consents API
 */
export const consentsApi = {
  getAllConsents: async () => {
    return apiRequest('/api/consents');
  },

  createConsent: async (data: {
    consentId: string;
    patientId: string;
    granteeId: string;
    scope: string;
    purpose: string;
    validUntil: string;
  }) => {
    return apiRequest('/api/consents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getConsent: async (consentId: string) => {
    return apiRequest(`/api/consents/${consentId}`);
  },

  getPatientConsents: async (patientId: string) => {
    return apiRequest(`/api/patient/${patientId}/consents`);
  },

  revokeConsent: async (consentId: string, data: { reason: string }) => {
    return apiRequest(`/api/consents/${consentId}/revoke`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Appointments API
 */
export const appointmentsApi = {
  scheduleAppointment: async (data: {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    reason: string;
  }) => {
    return apiRequest('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getAllAppointments: async () => {
    return apiRequest('/api/appointments');
  },

  getAppointment: async (appointmentId: string) => {
    return apiRequest(`/api/appointments/${appointmentId}`);
  },

  confirmAppointment: async (appointmentId: string) => {
    return apiRequest(`/api/appointments/${appointmentId}/confirm`, {
      method: 'POST',
    });
  },

  completeAppointment: async (appointmentId: string, data: {
    diagnosis?: string;
    notes?: string;
    prescriptionIds?: string[];
    labTestIds?: string[];
  }) => {
    return apiRequest(`/api/appointments/${appointmentId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  cancelAppointment: async (appointmentId: string, data: {
    reason: string;
    cancelledBy: string;
  }) => {
    return apiRequest(`/api/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  rescheduleAppointment: async (appointmentId: string, data: {
    newDate: string;
    newStartTime: string;
    newEndTime: string;
    reason: string;
  }) => {
    return apiRequest(`/api/appointments/${appointmentId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  markNoShow: async (appointmentId: string) => {
    return apiRequest(`/api/appointments/${appointmentId}/no-show`, {
      method: 'POST',
    });
  },

  getPatientAppointments: async (patientId: string) => {
    return apiRequest(`/api/patients/${patientId}/appointments`);
  },

  getDoctorAppointments: async (doctorId: string) => {
    return apiRequest(`/api/doctors/${doctorId}/appointments`);
  },

  getAppointmentsByDateRange: async (data: {
    startDate: string;
    endDate: string;
    doctorId?: string;
  }) => {
    return apiRequest('/api/appointments/date-range', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getDoctorSchedule: async (doctorId: string, date: string) => {
    return apiRequest(`/api/doctors/${doctorId}/schedule/${date}`);
  },

  searchAppointments: async (criteria: Record<string, unknown>) => {
    return apiRequest('/api/appointments/search', {
      method: 'POST',
      body: JSON.stringify({ criteria }),
    });
  },

  addReminder: async (appointmentId: string, data: {
    type: string;
    sentAt: string;
    method: string;
  }) => {
    return apiRequest(`/api/appointments/${appointmentId}/reminders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getAppointmentHistory: async (appointmentId: string) => {
    return apiRequest(`/api/appointments/${appointmentId}/history`);
  },
};

export const prescriptionsApi = {
  getAllPrescriptions: async () => {
    return apiRequest('/api/prescriptions');
  },

  createPrescription: async (data: {
    prescriptionId: string;
    patientId: string;
    doctorId: string;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      quantity: number;
      instructions: string;
    }>;
    diagnosis?: string;
    appointmentId?: string;
  }) => {
    return apiRequest('/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getPrescription: async (prescriptionId: string) => {
    return apiRequest(`/api/prescriptions/${prescriptionId}`);
  },

  dispensePrescription: async (prescriptionId: string, data: {
    pharmacyId: string;
    dispensedBy: string;
    quantitiesDispensed: number[];
    notes?: string;
  }) => {
    return apiRequest(`/api/prescriptions/${prescriptionId}/dispense`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  refillPrescription: async (prescriptionId: string, data: {
    pharmacyId: string;
    dispensedBy: string;
    quantitiesDispensed: number[];
    notes?: string;
  }) => {
    return apiRequest(`/api/prescriptions/${prescriptionId}/refill`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  cancelPrescription: async (prescriptionId: string, data: {
    reason: string;
  }) => {
    return apiRequest(`/api/prescriptions/${prescriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getPatientPrescriptions: async (patientId: string) => {
    return apiRequest(`/api/patients/${patientId}/prescriptions`);
  },

  getDoctorPrescriptions: async (doctorId: string) => {
    return apiRequest(`/api/doctors/${doctorId}/prescriptions`);
  },

  getActivePrescriptions: async (patientId: string) => {
    return apiRequest(`/api/patients/${patientId}/prescriptions/active`);
  },

  searchByMedication: async (medicationName: string) => {
    return apiRequest(`/api/prescriptions/search/medication/${encodeURIComponent(medicationName)}`);
  },

  verifyPrescription: async (prescriptionId: string) => {
    return apiRequest(`/api/prescriptions/${prescriptionId}/verify`);
  },

  addNotes: async (prescriptionId: string, data: {
    note: string;
    addedBy: string;
  }) => {
    return apiRequest(`/api/prescriptions/${prescriptionId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getPrescriptionHistory: async (prescriptionId: string) => {
    return apiRequest(`/api/prescriptions/${prescriptionId}/history`);
  },
};

export const labTestsApi = {
  orderLabTest: async (data: {
    labTestId: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    testType: string;
    testName: string;
    instructions: string;
    priority: 'routine' | 'urgent' | 'asap';
  }) => {
    return apiRequest('/api/lab-tests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getLabTest: async (labTestId: string) => {
    return apiRequest(`/api/lab-tests/${labTestId}`);
  },

  getAllLabTests: async () => {
    return apiRequest('/api/lab-tests');
  },

  updateLabTestResult: async (labTestId: string, data: {
    results: string;
    status: 'pending' | 'completed' | 'cancelled';
    notes?: string;
  }) => {
    return apiRequest(`/api/lab-tests/${labTestId}/result`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export const dashboardApi = {
  getStats: async () => {
    // Return dashboard overview stats
    // Note: Most stats are placeholders since full data requires authenticated user context (patientId)
    // In a production system, the backend would return these stats for the authenticated user
    try {
      const allRecords = await medicalRecordsApi.getAllRecords();
      const recordsData = allRecords as { records?: unknown[] };
      
      return {
        activeRecords: recordsData.records ? recordsData.records.length : 0,
        pendingConsents: 0, // Requires authenticated user's patientId - would be fetched from user context
        auditEvents24h: 0, // No audit endpoint available
        unreadNotifications: 0, // No notifications API available
      };
    } catch (error) {
      // If medical records fetch fails, return zeros - this is fine for initial dashboard load
      console.warn('Dashboard stats fetch partially failed (this is normal):', error);
      return {
        activeRecords: 0,
        pendingConsents: 0,
        auditEvents24h: 0,
        unreadNotifications: 0,
      };
    }
  },
};

/**
 * Audit Trail API
 */
export const auditApi = {
  getAuditRecord: async (txId: string) => {
    return apiRequest(`/api/audit/${txId}`);
  },

  getAllLogs: async () => {
    // No endpoint for all logs, return empty array
    return [];
  },
};

/**
 * Token management helpers
 */
export const tokenManager = {
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      // Also set as cookie for middleware
      document.cookie = `auth_token=${token}; path=/; max-age=86400; samesite=strict`;
    }
  },

  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  },

  removeToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      // Also remove cookie
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  },
};
