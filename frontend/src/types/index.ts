// HealthLink Pro - TypeScript Type Definitions
// Purpose: Replace 'any' types with proper interfaces

import { LucideIcon } from 'lucide-react';

// ============================================================================
// Base Types (defined first to avoid use-before-define)
// ============================================================================

export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'GOVERNMENT';

export interface BlockchainEventPayload {
  transactionId: string;
  chaincodeName: string;
  functionName: string;
  data: Record<string, unknown>;
}

export interface ApiError {
  code?: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Medical Records
// ============================================================================

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  treatment: string;
  medications: string;
  notes?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  fabricTransactionId?: string;
}

export interface MedicalRecordInput {
  patientId: string;
  diagnosis: string;
  treatment: string;
  medications: string;
  notes?: string;
}

// ============================================================================
// Prescriptions
// ============================================================================

export interface Prescription {
  id: string;
  recordId: string;
  patientId: string;
  doctorId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  fabricTransactionId?: string;
}

// ============================================================================
// Blockchain Events
// ============================================================================

export interface BlockchainEvent {
  eventName: string;
  payload: BlockchainEventPayload;
  timestamp: number;
  blockNumber?: number;
}

// ============================================================================
// Navigation
// ============================================================================

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[];
  badge?: string | number;
  description?: string;
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

// ============================================================================
// User & Authentication
// ============================================================================

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  fabricEnrollmentId: string;

  // Doctor fields
  doctorLicenseNumber?: string;
  doctorSpecialization?: string;
  doctorHospitalAffiliation?: string;
  doctorVerificationStatus?: 'PENDING' | 'VERIFIED' | 'SUSPENDED';

  // Patient fields
  patientDateOfBirth?: string;
  patientBloodGroup?: string;
  patientEmergencyContact?: string;

  // Account status
  isActive: boolean;
  emailVerified: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  fullName: string;
  role: UserRole;
  phoneNumber?: string;

  // Optional doctor fields
  doctorLicenseNumber?: string;
  doctorSpecialization?: string;

  // Optional patient fields
  patientDateOfBirth?: string;
  patientBloodGroup?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: User;
  };
}

// ============================================================================
// API Responses
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: ApiError;
}

// ============================================================================
// Dashboard Stats
// ============================================================================

export interface DashboardStats {
  totalRecords: number;
  recentRecords: number;
  upcomingAppointments: number;
  activePrescriptions: number;
  pendingConsents: number;
  labResults: number;
}

// ============================================================================
// Blockchain Transaction
// ============================================================================

export interface BlockchainTransaction {
  transactionId: string;
  timestamp: string;
  chaincodeName: string;
  functionName: string;
  args: string[];
  status: 'pending' | 'committed' | 'failed';
  blockNumber?: number;
  validationCode?: number;
}

// ============================================================================
// File Upload
// ============================================================================

export interface FileUploadResponse {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  encryptionKey: string;
}

// ============================================================================
// Form Data
// ============================================================================

export interface PrescriptionFormData {
  recordId: string;
  patientId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface AppointmentFormData {
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  notes?: string;
}

// ============================================================================
// Appointment Statuses (match database enum in Prisma)
// ============================================================================
export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;
