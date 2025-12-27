/**
 * API Client for HealthLink Pro Frontend
 * Standardized client matching backend routes EXACTLY
 */

import { getApiBaseUrl } from './env-utils';
import { logger } from './logger';
import { authUtils } from './auth-utils';
import type { AppointmentStatus } from '@/types';

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
  details?: unknown;
}

// Medical Record Types
export interface MedicalRecord {
  id?: string;
  recordId?: string;
  patientId: string;
  doctorId?: string;
  doctor?: string;
  doctorName?: string;
  attending?: string;
  diagnosis?: string;
  treatment?: string;
  fileName?: string;
  name?: string;
  ipfsHash?: string;
  hash?: string;
  recordType?: string;
  metadata?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMedicalRecordRequest {
  [key: string]: unknown; // Flexible to match different API expectations
}

// Patient Types
export interface Patient {
  id?: string;
  patientId: string;
  email?: string;
  name?: string;
  age?: number;
  gender?: string;
  walletAddress?: string;
  ipfsHash?: string;
  publicData: {
    name: string;
    age: number;
    gender: string;
    ipfsHash: string;
  };
  exists?: boolean;
  createdAt?: string | number;
  updatedAt?: string;
}

export interface CreatePatientRequest {
  email: string;
  name: string;
  age: number;
  gender: string;
  walletAddress: string;
}

// Doctor Types
export interface Doctor {
  id?: string;
  doctorId?: string;
  address: string;
  name: string;
  email: string;
  specialization?: string;
  walletAddress?: string;
  licenseNumber?: string;
  verified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DoctorRegistrationRequest {
  name: string;
  email: string;
  specialization: string;
  walletAddress: string;
  licenseNumber: string;
}
export interface Appointment {
  id?: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  doctor?: string;
  doctorName?: string;
  appointmentDate: string;
  appointmentTime: string;
  time?: number;
  status: AppointmentStatus;
  type: string;
  notes?: string;
  details?: string;
  prescriptionIds?: string[];
  labTestIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAppointmentRequest {
  appointmentId: string;
  // Either a patient wallet ID or their email. Backend resolves email to patientId.
  patientId?: string;
  patientEmail?: string;
  doctorAddress: string;
  timestamp: number;
  reason?: string;
  notes?: string;
}

export interface UpdateAppointmentRequest {
  status?: AppointmentStatus;
  notes?: string;
}

// Prescription Types
export interface Prescription {
  prescriptionId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  instructions: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePrescriptionRequest {
  [key: string]: unknown; // Flexible to match different API expectations
}

export interface UpdatePrescriptionRequest {
  medication?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

// Consent Types
export interface Consent {
  consentId: string;
  patientId: string;
  granteeId: string;
  scope: string;
  purpose: string;
  validUntil: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GrantConsentRequest {
  granteeEmail: string;
  scope: string;
  purpose: string;
  validUntil: string;
}

// Lab Test Types
export interface LabTest {
  labTestId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  testType: string;
  testName: string;
  instructions: string;
  priority: 'routine' | 'urgent' | 'asap';
  status?: 'pending' | 'completed' | 'cancelled';
  results?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLabTestRequest {
  patientEmail: string;
  testType: string;
  testName: string;
  priority: 'routine' | 'urgent' | 'asap';
  instructions?: string;
}

// Dashboard Stats Types
export interface DashboardStats {
  totalPatients: number;
  totalAppointments: number;
  totalPrescriptions: number;
  totalRecords: number;
  activeRecords: number;
  pendingConsents: number;
  auditEvents24h: number;
  unreadNotifications: number;
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

  // Get token from centralized auth utility
  const token = authUtils.getToken();

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
    console.log('🔑 [API Client] Auth token present - will be sent with request to:', endpoint);
  } else if (!endpoint.startsWith('/api/auth') && !endpoint.startsWith('/api/storage') && !endpoint.startsWith('/api/public') && !endpoint.startsWith('/api/health')) {
    console.warn('⚠️ [API Client] No auth token found for request to:', endpoint);
  }

  // Warn when there's no auth token for requests that are likely protected
  if (!token && !endpoint.startsWith('/api/auth') && !endpoint.startsWith('/api/storage') && !endpoint.startsWith('/api/public')) {
    logger.warn(`[API Client] No auth token present for request to ${endpoint}`);
  }

  // Add user id header if available (used by blockchain endpoints and middleware)
  try {
    const userId = authUtils.getUserId ? authUtils.getUserId() : null;
    if (userId) {
      defaultHeaders['X-User-ID'] = userId;
    }
  } catch (_e) {
    // ignore if localStorage not available
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    mode: 'cors',
  };

  try {
    const response = await fetch(url, config);

    // Handle 404 gracefully if requested (for dashboard stats)
    if (response.status === 404 && handleNotFound) {
      return [] as T;
    }

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      if (isJson) {
        const errorResponse = await response.json();
        // Backend now returns { success: false, error: 'message' }
        const errMessage = (errorResponse && (errorResponse.error || errorResponse.message)) || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(typeof errMessage === 'string' ? errMessage : JSON.stringify(errMessage));
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    // Return parsed JSON if response has content
    if (isJson && response.status !== 204) {
      const jsonResponse = await response.json();
      logger.log('[API Client] Raw response:', jsonResponse);

      // New flat response format: { success: true|false, ... }
      if (jsonResponse && typeof jsonResponse === 'object' && Object.prototype.hasOwnProperty.call(jsonResponse, 'success')) {
        if (jsonResponse.success === true) {
          // Return the flat payload directly to callers
          return jsonResponse as unknown as T;
        }

        // success === false -> throw standardized error
        const err = jsonResponse.error || jsonResponse.message || JSON.stringify(jsonResponse);
        throw new Error(typeof err === 'string' ? err : JSON.stringify(err));
      }

      // Backwards-compat: extract nested JSend-style data
      const extracted = jsonResponse.data || jsonResponse;
      logger.log('[API Client] Extracted data:', extracted);
      logger.log('[API Client] Has token:', !!(extracted && (extracted as any).token));
      logger.log('[API Client] Has user:', !!(extracted && (extracted as any).user));

      return extracted as unknown as T;
    }

    // Return empty object for 204 No Content
    return {} as T;
  } catch (error) {
    logger.error('[API Client] Request failed:', error);
    throw error;
  }
}

/**
 * Upload file with FormData (with progress support)
 */
async function uploadFile(endpoint: string, formData: FormData, onProgress?: (progress: number) => void): Promise<{ hash: string }> {
  const apiUrl = getApiBaseUrl();
  const url = `${apiUrl}${endpoint}`;
  const token = authUtils.getToken();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', url);

    // Set headers
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    // Handle progress
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      };
    }

    // Handle response
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const jsonResponse = JSON.parse(xhr.responseText);
          // Handle new flat response format
          if (jsonResponse && typeof jsonResponse === 'object' && Object.prototype.hasOwnProperty.call(jsonResponse, 'success')) {
            if (jsonResponse.success === true) {
              resolve(jsonResponse as any);
              return;
            }

            const err = jsonResponse.error || jsonResponse.message || JSON.stringify(jsonResponse);
            reject(new Error(typeof err === 'string' ? err : JSON.stringify(err)));
            return;
          }

          const result = jsonResponse.data || jsonResponse;
          resolve(result);
        } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
          reject(new Error('Invalid JSON response from upload endpoint'));
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          reject(new Error(errorResponse.message || `Upload failed: ${xhr.statusText}`));
        } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      }
    };

    // Handle errors
    xhr.onerror = () => {
      reject(new Error('Network error during upload'));
    };

    // Send the request
    xhr.send(formData);
  });
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
      authUtils.removeToken();
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
   * Backend routes:
   * - For patients: GET /api/patient/medical-records
   * - For doctors: GET /api/doctor/medical-records
   * Automatically selects correct endpoint based on user role
   */
  getAll: async (): Promise<any[]> => {
    // Get user role from localStorage
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    const role = user.role?.toLowerCase();

    // Determine endpoint based on role
    const endpoint = role === 'doctor' ? '/api/doctor/medical-records' : '/api/patient/medical-records';

    const response = await fetchApi<{ success: boolean; records?: any[]; data?: any[] }>(endpoint, { method: 'GET' }, true);
    // Backend returns {success: true, records: [...], data: [...]}
    return response.records || response.data || (Array.isArray(response) ? response : []);
  },

  /**
   * Alias for getAll() for backward compatibility
   */
  getAllRecords: async (): Promise<any[]> => {
    return medicalRecordsApi.getAll();
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
  create: async (recordData: CreateMedicalRecordRequest): Promise<MedicalRecord> => {
    return fetchApi<MedicalRecord>('/api/medical-records', {
      method: 'POST',
      body: JSON.stringify(recordData),
    });
  },

  /**
   * Get records by patient ID (for doctors)
   * Backend route: GET /api/medical-records/patient/:patientId
   * Function: GetRecordsByPatient
   */
  getByPatient: async (patientId: string): Promise<MedicalRecord[]> => {
    const response = await fetchApi<{ success: boolean; records?: MedicalRecord[]; data?: MedicalRecord[] }>(`/api/medical-records/patient/${patientId}`, { method: 'GET' }, true);
    // Backend returns {success: true, records: [...], data: [...]}
    return response.records || response.data || (Array.isArray(response) ? response : []);
  },
};

// Alias for compatibility
export const recordsApi = medicalRecordsApi;

// ========================================
// PATIENTS API
// ========================================

export const patientsApi = {
  /**
   * Get all patients (for doctors/admin)
   * Backend route: GET /api/v1/healthcare/patients
   * Function: GetAllPatients
   */
  getAll: async (): Promise<Patient[]> => {
    const response = await fetchApi<{ success: boolean; patients?: Patient[]; data?: Patient[] }>('/api/v1/healthcare/patients', { method: 'GET' }, true);
    // Extract array from response - backend returns {success: true, patients: [...], data: [...]}
    return response.patients || response.data || [];
  },

  /**
   * Create new patient
   * Backend route: POST /api/v1/healthcare/patients
   * Function: CreatePatient
   */
  create: async (patientData: CreatePatientRequest): Promise<Patient> => {
    return fetchApi<Patient>('/api/v1/healthcare/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  },

  /**
   * Get patient information
   * Backend route: GET /api/v1/healthcare/patients/:patientId
   * Function: GetPatient
   */
  get: async (patientId: string): Promise<Patient> => {
    return fetchApi<Patient>(`/api/v1/healthcare/patients/${patientId}`, { method: 'GET' });
  },
};

// ========================================
// APPOINTMENTS API
// ========================================

export const appointmentsApi = {
  /**
   * Get all appointments for current user
   * Backend routes:
   * - For patients: GET /api/patient/appointments
   * - For doctors: GET /api/doctor/appointments
   * Automatically selects correct endpoint based on user role
   */
  getAll: async (): Promise<Appointment[]> => {
    // Get user role from localStorage
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    const role = user.role?.toLowerCase();

    // Determine endpoint based on role
    const endpoint = role === 'doctor' ? '/api/doctor/appointments' : '/api/patient/appointments';

    const response = await fetchApi<{ success: boolean; appointments?: Appointment[]; data?: Appointment[] }>(endpoint, { method: 'GET' }, true);
    // Backend returns {success: true, appointments: [...], data: [...]}
    return response.appointments || response.data || (Array.isArray(response) ? response : []);
  },

  /**
   * Get appointment by ID
   * Backend route: GET /api/appointments/:appointmentId
   */
  getById: async (appointmentId: string): Promise<Appointment> => {
    return fetchApi<Appointment>(`/api/appointments/${appointmentId}`, { method: 'GET' });
  },

  /**
   * Create new appointment
   * Backend route: POST /api/v1/healthcare/appointments
   * Function: CreateAppointment
   */
  create: async (appointmentData: CreateAppointmentRequest): Promise<Appointment> => {
    return fetchApi<Appointment>('/api/v1/healthcare/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  },

  /**
   * Update appointment
   * Backend route: PUT /api/appointments/:appointmentId
   * Function: UpdateAppointment
   */
  update: async (appointmentId: string, updateData: UpdateAppointmentRequest): Promise<Appointment> => {
    return fetchApi<Appointment>(`/api/appointments/${appointmentId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  /**
   * Cancel appointment
   * Backend route: POST /api/appointments/:appointmentId/cancel
   * Function: CancelAppointment
   */
  cancel: async (appointmentId: string): Promise<any> => {
    return fetchApi<any>(`/api/appointments/${appointmentId}/cancel`, {
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
   * Backend routes:
   * - For patients: GET /api/patient/prescriptions
   * - For doctors: GET /api/doctor/prescriptions
   * Automatically selects correct endpoint based on user role
   */
  getAll: async (): Promise<Prescription[]> => {
    // Get user role from localStorage
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    const role = user.role?.toLowerCase();

    // Determine endpoint based on role
    const endpoint = role === 'doctor' ? '/api/doctor/prescriptions' : '/api/patient/prescriptions';

    const response = await fetchApi<{ success: boolean; prescriptions?: Prescription[]; data?: Prescription[] }>(endpoint, { method: 'GET' }, true);
    // Backend returns {success: true, prescriptions: [...], data: [...]}
    return response.prescriptions || response.data || (Array.isArray(response) ? response : []);
  },

  /**
   * Get prescription by ID
   * Backend route: GET /api/prescriptions/:prescriptionId
   */
  getById: async (prescriptionId: string): Promise<Prescription> => {
    return fetchApi<Prescription>(`/api/prescriptions/${prescriptionId}`, { method: 'GET' });
  },

  /**
   * Create new prescription
   * Backend route: POST /api/v1/healthcare/prescriptions
   * Function: CreatePrescription
   */
  create: async (prescriptionData: CreatePrescriptionRequest): Promise<Prescription> => {
    return fetchApi<Prescription>('/api/v1/healthcare/prescriptions', {
      method: 'POST',
      body: JSON.stringify(prescriptionData),
    });
  },

  /**
   * Update prescription
   * Backend route: PUT /api/prescriptions/:prescriptionId
   * Function: UpdatePrescription
   */
  update: async (prescriptionId: string, updateData: UpdatePrescriptionRequest): Promise<Prescription> => {
    return fetchApi<Prescription>(`/api/prescriptions/${prescriptionId}`, {
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
   * Backend route: GET /api/patient/consents
   * Function: GetConsentsByPatient
   */
  getAll: async (): Promise<Consent[]> => {
    return fetchApi<Consent[]>('/api/patient/consents', { method: 'GET' }, true);
  },

  /**
   * Get specific consent by ID
   * Backend route: GET /api/patient/consents/:consentId
   * Function: GetConsent
   */
  getById: async (consentId: string): Promise<Consent> => {
    return fetchApi<Consent>(`/api/patient/consents/${consentId}`, { method: 'GET' });
  },

  /**
   * Create/grant new consent
   * Backend route: POST /api/v1/healthcare/consents
   * Function: CreateConsent
   */
  grant: async (consentData: GrantConsentRequest): Promise<Consent> => {
    return fetchApi<Consent>('/api/v1/healthcare/consents', {
      method: 'POST',
      body: JSON.stringify(consentData),
    });
  },

  /**
   * Revoke consent
   * Backend route: PATCH /api/patient/consents/:consentId/revoke
   * Function: RevokeConsent
   */
  revoke: async (consentId: string): Promise<any> => {
    return fetchApi<any>(`/api/patient/consents/${consentId}/revoke`, {
      method: 'PATCH',
    });
  },
};

// Alias for compatibility
export const consentApi = consentsApi;

// ========================================
// DOCTORS API (Admin Functions)
// ========================================

export const doctorsApi = {
  /**
   * Register a new doctor
   * Backend route: POST /api/v1/healthcare/doctors
   * Function: RegisterDoctor
   */
  register: async (doctorData: DoctorRegistrationRequest): Promise<Doctor> => {
    return fetchApi<Doctor>('/api/v1/healthcare/doctors', {
      method: 'POST',
      body: JSON.stringify(doctorData),
    });
  },

  /**
   * Verify a doctor
   * Backend route: POST /api/v1/healthcare/doctors/:doctorAddress/verify
   * Function: VerifyDoctor
   */
  verify: async (doctorAddress: string): Promise<Doctor> => {
    return fetchApi<Doctor>(`/api/v1/healthcare/doctors/${doctorAddress}/verify`, {
      method: 'POST',
    });
  },

  /**
   * Get all verified doctors
   * Backend route: GET /api/v1/healthcare/doctors/verified
   * Function: GetVerifiedDoctors
   */
  getVerified: async (): Promise<Doctor[]> => {
    return fetchApi<Doctor[]>('/api/v1/healthcare/doctors/verified', { method: 'GET' });
  },
};

// ========================================
// WALLET API (Identity Management)
// ========================================

export const walletApi = {
  /**
   * Get all wallet identities
   * Backend route: GET /api/v1/wallet/identities
   * Function: ListIdentities
   */
  getIdentities: async (params?: { page?: number; pageSize?: number; search?: string }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.pageSize) {
      queryParams.append('pageSize', params.pageSize.toString());
    }
    if (params?.search) {
      queryParams.append('search', params.search);
    }

    const queryString = queryParams.toString();
    const url = queryString ? `/api/v1/wallet/identities?${queryString}` : '/api/v1/wallet/identities';

    return fetchApi<any>(url, { method: 'GET' });
  },

  /**
   * Get wallet identity by user ID
   * Backend route: GET /api/v1/wallet/identity/:userId
   * Function: GetIdentity
   */
  getIdentity: async (userId: string): Promise<any> => {
    return fetchApi<any>(`/api/v1/wallet/identity/${userId}`, { method: 'GET' });
  },

  /**
   * Register and enroll a new user
   * Backend route: POST /api/v1/wallet/register
   * Function: RegisterUser
   */
  register: async (userData: { userId: string; role: string; affiliation?: string }): Promise<any> => {
    return fetchApi<any>('/api/v1/wallet/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Enroll admin user
   * Backend route: POST /api/v1/wallet/enroll-admin
   * Function: EnrollAdmin
   */
  enrollAdmin: async (): Promise<any> => {
    return fetchApi<any>('/api/v1/wallet/enroll-admin', {
      method: 'POST',
    });
  },
};

// ========================================

// ========================================
// CHAT API (AI Assistant)
// ========================================

export const chatApi = {
  /**
   * Send message to AI chat assistant
   * Backend route: POST /api/chat
   * Function: SendChatMessage
   */
  sendMessage: async (message: string): Promise<any> => {
    return fetchApi<any>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
};

// ========================================
// HEALTH API (System Health Check)
// ========================================
// STORAGE API (File Upload)
// ========================================

export const storageApi = {
  /**
   * Upload file to storage
   * Backend route: POST /api/storage/upload
   * Returns: { hash: string } - SHA-256 hash of uploaded file
   */
  upload: async (file: File, onProgress?: (progress: number) => void): Promise<{ hash: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadFile('/api/storage/upload', formData, onProgress);
  },

  /**
   * Download file by hash
   * Backend route: GET /api/storage/:hash
   * Returns: Blob of the file
   */
  download: async (hash: string): Promise<Blob> => {
    const token = authUtils.getToken();
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/storage/${hash}`, {
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

// Audit Log Types
export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  metadata?: Record<string, any>;
  created_at: string;
  ip_address?: string;
}

export const auditApi = {
  /**
   * Get all audit logs
   * Backend route: GET /api/v1/audit/logs
   */
  getAll: async (params?: { limit?: number; offset?: number }): Promise<AuditLog[]> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const url = queryString ? `/api/v1/audit/logs?${queryString}` : '/api/v1/audit/logs';

    return fetchApi<AuditLog[]>(url, { method: 'GET' }, true);
  },

  /**
   * Get audit log by ID
   * Backend route: GET /api/v1/audit/logs/:id
   */
  getById: async (id: string): Promise<AuditLog> => {
    return fetchApi<AuditLog>(`/api/v1/audit/logs/${id}`, { method: 'GET' });
  },
};

export const labTestsApi = {
  /**
   * Get all lab tests for current user (role-based)
   * Backend route: GET /api/v1/healthcare/lab-tests or /api/doctor/lab-tests or /api/patient/lab-tests
   */
  getAll: async (): Promise<LabTest[]> => {
    try {
      const response = await fetchApi<any>('/api/v1/healthcare/lab-tests', { method: 'GET' });
      // Handle both array and object responses
      if (Array.isArray(response)) {
        return response;
      }
      return response?.data || response?.labTests || [];
    } catch (error) {
      logger.error('Failed to fetch lab tests:', error);
      return [];
    }
  },

  /**
   * Get lab test by ID
   * Backend route: GET /api/v1/healthcare/lab-tests/:id
   */
  getById: async (id: string): Promise<LabTest> => {
    return fetchApi<LabTest>(`/api/v1/healthcare/lab-tests/${id}`, { method: 'GET' });
  },

  /**
   * Create new lab test order
   * Backend route: POST /api/v1/healthcare/lab-tests
   */
  create: async (data: CreateLabTestRequest): Promise<LabTest> => {
    return fetchApi<LabTest>('/api/v1/healthcare/lab-tests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update lab test results (for lab technicians)
   * Backend route: PATCH /api/v1/healthcare/lab-tests/:id
   */
  updateResults: async (id: string, results: string, status: string): Promise<LabTest> => {
    return fetchApi<LabTest>(`/api/v1/healthcare/lab-tests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ results, status }),
    });
  },
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    return fetchApi<DashboardStats>('/api/v1/admin/stats', { method: 'GET' });
  },
};

export const usersApi = {
  getUsers: async (): Promise<any[]> => {
    return fetchApi<any[]>('/api/users', { method: 'GET' });
  },

  invite: async (invitationData: { email: string; role: 'patient' | 'doctor' }): Promise<any> => {
    return fetchApi<any>('/api/users/invite', {
      method: 'POST',
      body: JSON.stringify(invitationData),
    });
  },

  getInvitations: async (): Promise<any[]> => {
    return fetchApi<any[]>('/api/users/invitations', { method: 'GET' }, true);
  },
};

// ========================================
// HEALTH API (System Health Check)
// ========================================

export const healthApi = {
  /**
   * Check backend health status
   * Backend route: GET /api/health
   * Function: HealthCheck
   */
  check: async (): Promise<any> => {
    return fetchApi<any>('/api/health', { method: 'GET' });
  },
};

logger.info('[API Client] Initialized with base URL:', getApiBaseUrl());
