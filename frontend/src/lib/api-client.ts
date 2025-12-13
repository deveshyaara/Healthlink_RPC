/**
 * API Client for HealthLink Pro Frontend
 * Standardized client matching backend routes EXACTLY
 */

import { getApiBaseUrl } from './env-utils';
import { logger } from './logger';

// ========================================
// TYPES
// ========================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'patient' | 'doctor' | 'admin';
    avatar?: string;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// ========================================
// BASE FETCH WRAPPER
// ========================================

/**
 * Base fetch wrapper with comprehensive error handling
 * Handles 404s gracefully for dashboard stats
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  handleNotFound: boolean = false
): Promise<T> {
  const apiUrl = getApiBaseUrl();
  const url = `${apiUrl}${endpoint}`;

  // Get token from localStorage if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include',
    mode: 'cors',
  };

  try {
    logger.log('[API Client] Making request to:', url);
    logger.log('[API Client] Method:', config.method || 'GET');

    const response = await fetch(url, config);

    logger.log('[API Client] Response status:', response.status);

    // Handle 404 gracefully if requested (for dashboard stats)
    if (response.status === 404 && handleNotFound) {
      logger.log('[API Client] 404 - Returning empty array');
      return [] as T;
    }

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      if (isJson) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || `HTTP ${response.status}: ${response.statusText}`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    // Return parsed JSON if response has content
    if (isJson && response.status !== 204) {
      const jsonResponse = await response.json();
      logger.log('[API Client] Raw response:', jsonResponse);

      // Backend wraps responses in { status, data, message } format
      // Extract the data field if it exists
      const extracted = jsonResponse.data || jsonResponse;
      logger.log('[API Client] Extracted data:', extracted);
      logger.log('[API Client] Has token:', !!extracted.token);
      logger.log('[API Client] Has user:', !!extracted.user);

      return extracted;
    }

    // Return empty object for 204 No Content
    return {} as T;
  } catch (error) {
    logger.error('[API Client] Request failed:', error);
    throw error;
  }
}

/**
 * Upload file with FormData (special handling needed)
 */
async function uploadFile(endpoint: string, formData: FormData): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const url = `${apiUrl}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Do NOT set Content-Type for FormData - browser will set it with boundary

  const config: RequestInit = {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
    mode: 'cors',
  };

  try {
    console.log('[API Client] Uploading file to:', url);
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorResponse = await response.json();
      throw new Error(errorResponse.message || `Upload failed: ${response.statusText}`);
    }

    const jsonResponse = await response.json();
    return jsonResponse.data || jsonResponse;
  } catch (error) {
    console.error('[API Client] Upload failed:', error);
    throw error;
  }
}

// ========================================
// AUTHENTICATION API
// ========================================

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    return fetchApi<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    return fetchApi<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  logout: async (): Promise<void> => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  },
};

// ========================================
// MEDICAL RECORDS API
// ========================================

export const medicalRecordsApi = {
  /**
   * Get all medical records for current user
   * Backend route: GET /api/medical-records
   * Function: GetRecordsByPatient
   */
  getAll: async (): Promise<any[]> => {
    return fetchApi<any[]>('/api/medical-records', { method: 'GET' }, true);
  },

  /**
   * Alias for getAll() for backward compatibility
   */
  getAllRecords: async (): Promise<any[]> => {
    return fetchApi<any[]>('/api/medical-records', { method: 'GET' }, true);
  },

  /**
   * Get specific record by ID
   * Backend route: GET /api/medical-records/:recordId
   * Function: GetRecord
   */
  getById: async (recordId: string): Promise<any> => {
    return fetchApi<any>(`/api/medical-records/${recordId}`, { method: 'GET' });
  },

  /**
   * Alias for getById() with custom description
   */
  getRecord: async (recordId: string, _description?: string): Promise<any> => {
    return fetchApi<any>(`/api/medical-records/${recordId}`, { method: 'GET' });
  },

  /**
   * Create new medical record
   * Backend route: POST /api/medical-records
   * Function: CreateRecord
   */
  create: async (recordData: any): Promise<any> => {
    return fetchApi<any>('/api/medical-records', {
      method: 'POST',
      body: JSON.stringify(recordData),
    });
  },

  /**
   * Get records by patient ID (for doctors)
   * Backend route: GET /api/medical-records/patient/:patientId
   * Function: GetRecordsByPatient
   */
  getByPatient: async (patientId: string): Promise<any[]> => {
    return fetchApi<any[]>(`/api/medical-records/patient/${patientId}`, { method: 'GET' }, true);
  },
};

// Alias for compatibility
export const recordsApi = medicalRecordsApi;

// ========================================
// APPOINTMENTS API
// ========================================

export const appointmentsApi = {
  /**
   * Get all appointments for current user
   * Backend route: GET /api/appointments
   * Function: GetAppointmentsByPatient or GetAppointmentsByDoctor (role-based)
   */
  getAll: async (): Promise<any[]> => {
    return fetchApi<any[]>('/api/appointments', { method: 'GET' }, true);
  },

  /**
   * Create new appointment
   * Backend route: POST /api/appointments
   * Function: CreateAppointment
   */
  create: async (appointmentData: any): Promise<any> => {
    return fetchApi<any>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  },

  /**
   * Update appointment
   * Backend route: PUT /api/appointments/:id
   * Function: UpdateAppointment
   */
  update: async (id: string, updateData: any): Promise<any> => {
    return fetchApi<any>(`/api/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  /**
   * Cancel appointment
   * Backend route: POST /api/appointments/:id/cancel
   * Function: CancelAppointment
   */
  cancel: async (id: string): Promise<any> => {
    return fetchApi<any>(`/api/appointments/${id}/cancel`, {
      method: 'POST',
    });
  },
};

// ========================================
// PRESCRIPTIONS API
// ========================================

export const prescriptionsApi = {
  /**
   * Get all prescriptions for current user
   * Backend route: GET /api/prescriptions
   * Function: GetPrescriptionsByPatient or GetPrescriptionsByDoctor
   */
  getAll: async (): Promise<any[]> => {
    return fetchApi<any[]>('/api/prescriptions', { method: 'GET' }, true);
  },

  /**
   * Create new prescription
   * Backend route: POST /api/prescriptions
   * Function: CreatePrescription
   */
  create: async (prescriptionData: any): Promise<any> => {
    return fetchApi<any>('/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify(prescriptionData),
    });
  },

  /**
   * Update prescription
   * Backend route: PUT /api/prescriptions/:id
   * Function: UpdatePrescription
   */
  update: async (id: string, updateData: any): Promise<any> => {
    return fetchApi<any>(`/api/prescriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },
};

// ========================================
// CONSENTS API
// ========================================

export const consentsApi = {
  /**
   * Get all consents for current user
   * Backend route: GET /api/consents
   * Function: GetConsentsByPatient
   */
  getAll: async (): Promise<any[]> => {
    return fetchApi<any[]>('/api/consents', { method: 'GET' }, true);
  },

  /**
   * Get specific consent by ID
   * Backend route: GET /api/consents/:consentId
   * Function: GetConsent
   */
  getById: async (consentId: string): Promise<any> => {
    return fetchApi<any>(`/api/consents/${consentId}`, { method: 'GET' });
  },

  /**
   * Create/grant new consent
   * Backend route: POST /api/consents
   * Function: CreateConsent
   */
  grant: async (consentData: any): Promise<any> => {
    return fetchApi<any>('/api/consents', {
      method: 'POST',
      body: JSON.stringify(consentData),
    });
  },

  /**
   * Revoke consent
   * Backend route: PATCH /api/consents/:consentId/revoke
   * Function: RevokeConsent
   */
  revoke: async (consentId: string): Promise<any> => {
    return fetchApi<any>(`/api/consents/${consentId}/revoke`, {
      method: 'PATCH',
    });
  },
};

// Alias for compatibility
export const consentApi = consentsApi;

// ========================================
// STORAGE API (File Upload)
// ========================================

export const storageApi = {
  /**
   * Upload file to storage
   * Backend route: POST /api/storage/upload
   * Returns: { hash: string } - SHA-256 hash of uploaded file
   */
  upload: async (file: File): Promise<{ hash: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadFile('/api/storage/upload', formData);
  },

  /**
   * Download file by hash
   * Backend route: GET /api/storage/:hash
   * Returns: Blob of the file
   */
  download: async (hash: string): Promise<Blob> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await fetch(`${API_BASE_URL}/api/storage/${hash}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Download failed: ${response.statusText} - ${errorText}`);
    }

    return await response.blob();
  },

  /**
   * Get file metadata
   * Backend route: GET /api/storage/:hash/metadata
   */
  getMetadata: async (hash: string): Promise<any> => {
    return fetchApi<any>(`/api/storage/${hash}/metadata`, { method: 'GET' });
  },
};

// ========================================
// LEGACY ALIASES FOR BACKWARD COMPATIBILITY
// ========================================

// These aliases maintain backward compatibility with existing code
export const getAllAppointments = appointmentsApi.getAll;
export const getAllRecords = medicalRecordsApi.getAll;
export const getAllPrescriptions = prescriptionsApi.getAll;
export const getAllConsents = consentsApi.getAll;

// ========================================
// STUB APIS (Not Yet Implemented)
// ========================================

// These are placeholder APIs for features not yet implemented in backend
// They prevent import errors in pages that reference them

export const auditApi = {
  getAll: async (): Promise<any[]> => {
    console.warn('[API Client] auditApi.getAll() not yet implemented');
    return [];
  },
  getById: async (_id: string): Promise<any> => {
    console.warn('[API Client] auditApi.getById() not yet implemented');
    throw new Error('Audit API not yet implemented');
  },
};

export const labTestsApi = {
  getAll: async (): Promise<any[]> => {
    console.warn('[API Client] labTestsApi.getAll() not yet implemented');
    return [];
  },
  getById: async (_id: string): Promise<any> => {
    console.warn('[API Client] labTestsApi.getById() not yet implemented');
    throw new Error('Lab Tests API not yet implemented');
  },
  create: async (_data: any): Promise<any> => {
    console.warn('[API Client] labTestsApi.create() not yet implemented');
    throw new Error('Lab Tests API not yet implemented');
  },
};

export const dashboardApi = {
  getStats: async (): Promise<any> => {
    console.warn('[API Client] dashboardApi.getStats() not yet implemented');
    // Return empty stats to prevent dashboard crashes
    return {
      totalPatients: 0,
      totalAppointments: 0,
      totalPrescriptions: 0,
      totalRecords: 0,
    };
  },
};

console.log('[API Client] Initialized with base URL:', getApiBaseUrl());
