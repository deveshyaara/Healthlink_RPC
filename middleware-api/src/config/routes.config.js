/**
 * Dynamic Routes Configuration
 * Maps REST endpoints to Hyperledger Fabric chaincode functions
 *
 * Configuration Structure:
 * {
 *   path: string - REST endpoint path
 *   method: string - HTTP method (GET, POST, PUT, DELETE, PATCH)
 *   chaincode: string - Chaincode name
 *   function: string - Chaincode function name
 *   channel: string - Channel name (optional, defaults to healthlink-channel)
 *   auth: boolean - Requires authentication (default: true)
 *   roles: string[] - Allowed roles (optional)
 *   paramMapping: object - Maps request params to chaincode args
 *   validation: object - Joi validation schema
 * }
 */

import Joi from 'joi';

export const routesConfig = [
  // ==========================================
  // DOCTORS ENDPOINTS
  // ==========================================
  {
    path: '/doctors',
    method: 'POST',
    chaincode: 'doctor-credentials-contract',
    function: 'RegisterDoctor',
    channel: 'mychannel',
    auth: false,
    paramMapping: {
      doctorId: 'body.doctorId',
      name: 'body.name',
      specialization: 'body.specialization',
      licenseNumber: 'body.licenseNumber',
      hospital: 'body.hospital',
      credentials: 'body.credentials', // JSON stringified
      contact: 'body.contact', // JSON stringified
    },
    validation: Joi.object({
      doctorId: Joi.string().required(),
      name: Joi.string().required(),
      specialization: Joi.string().required(),
      licenseNumber: Joi.string().required(),
      hospital: Joi.string().required(),
      credentials: Joi.object({
        degree: Joi.string().required(),
      }).required(),
      contact: Joi.object({
        email: Joi.string().email().required(),
        phone: Joi.string().required(),
      }).required(),
    }),
  },
  {
    path: '/doctors/:doctorId',
    method: 'GET',
    chaincode: 'doctor-credentials-contract',
    function: 'GetDoctor',
    channel: 'mychannel',
    auth: false,
    paramMapping: {
      doctorId: 'params.doctorId',
    },
  },
  {
    path: '/doctors/:doctorId/verify',
    method: 'POST',
    chaincode: 'doctor-credentials-contract',
    function: 'VerifyDoctor',
    channel: 'mychannel',
    auth: true,
    roles: ['admin'],
    paramMapping: {
      doctorId: 'params.doctorId',
      status: 'body.status',
      comments: 'body.comments',
    },
    validation: Joi.object({
      status: Joi.string().valid('verified', 'rejected').required(),
      comments: Joi.string().optional(),
    }),
  },
  {
    path: '/doctors/:doctorId/suspend',
    method: 'POST',
    chaincode: 'doctor-credentials-contract',
    function: 'SuspendDoctor',
    channel: 'mychannel',
    auth: true,
    roles: ['admin'],
    paramMapping: {
      doctorId: 'params.doctorId',
      reason: 'body.reason',
    },
    validation: Joi.object({
      reason: Joi.string().required(),
    }),
  },

  // ==========================================
  // MEDICAL RECORDS ENDPOINTS
  // ==========================================
  {
    path: '/medical-records',
    method: 'POST',
    chaincode: 'patient-records',
    function: 'CreateRecord',
    channel: 'mychannel',
    auth: true,
    roles: ['doctor', 'admin', 'patient'], // ✅ Allow patients to upload their own records
    paramMapping: {
      recordId: 'body.recordId',
      patientId: 'body.patientId',
      doctorId: 'user.userId',
      recordType: 'body.recordType',
      ipfsHash: 'body.ipfsHash',
      metadata: 'body.metadata', // Will be JSON stringified
    },
    validation: Joi.object({
      recordId: Joi.string().required(),
      patientId: Joi.string().required(),
      ipfsHash: Joi.string().required(),
      recordType: Joi.string().optional(),
      metadata: Joi.object().optional(),
    }),
  },
  {
    path: '/medical-records',
    method: 'GET',
    chaincode: 'patient-records',
    function: 'GetRecordsByPatient',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      patientId: 'user.userId',
    },
  },
  {
    path: '/medical-records/:recordId',
    method: 'GET',
    chaincode: 'patient-records',
    function: 'GetRecord',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      recordId: 'params.recordId',
    },
  },
  {
    path: '/medical-records/patient/:patientId',
    method: 'GET',
    chaincode: 'patient-records',
    function: 'GetRecordsByPatient',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      patientId: 'params.patientId',
    },
  },
  {
    path: '/medical-records/paginated',
    method: 'GET',
    chaincode: 'patient-records',
    function: 'GetAllRecordsPaginated',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      pageSize: 'query.pageSize',
      bookmark: 'query.bookmark',
    },
  },

  // ==========================================
  // APPOINTMENTS ENDPOINTS
  // ==========================================
  {
    path: '/appointments',
    method: 'POST',
    chaincode: 'appointment-contract',
    function: 'ScheduleAppointment',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      appointmentId: 'body.appointmentId',
      patientId: 'body.patientId',
      doctorId: 'body.doctorId',
      appointmentDate: 'body.appointmentDate',
      startTime: 'body.startTime',
      endTime: 'body.endTime',
      reason: 'body.reason',
    },
    validation: Joi.object({
      appointmentId: Joi.string().required(),
      patientId: Joi.string().required(),
      doctorId: Joi.string().required(),
      appointmentDate: Joi.string().required(),
      startTime: Joi.string().required(),
      endTime: Joi.string().required(),
      reason: Joi.string().required(),
    }),
  },
  {
    path: '/appointments/:appointmentId',
    method: 'GET',
    chaincode: 'appointment-contract',
    function: 'GetAppointment',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      appointmentId: 'params.appointmentId',
    },
  },
  {
    path: '/appointments',
    method: 'GET',
    chaincode: 'appointment-contract',
    function: 'GetAllAppointments',
    channel: 'mychannel',
    auth: true,
    paramMapping: {},
  },
  {
    path: '/appointments/:appointmentId/confirm',
    method: 'POST',
    chaincode: 'appointment-contract',
    function: 'ConfirmAppointment',
    channel: 'mychannel',
    auth: true,
    roles: ['doctor', 'receptionist', 'admin'],
    paramMapping: {
      appointmentId: 'params.appointmentId',
    },
  },
  {
    path: '/appointments/:appointmentId/complete',
    method: 'POST',
    chaincode: 'appointment-contract',
    function: 'CompleteAppointment',
    channel: 'mychannel',
    auth: true,
    roles: ['doctor', 'admin'],
    paramMapping: {
      appointmentId: 'params.appointmentId',
      diagnosis: 'body.diagnosis',
      notes: 'body.notes',
    },
  },
  {
    path: '/appointments/:appointmentId/cancel',
    method: 'POST',
    chaincode: 'appointment-contract',
    function: 'CancelAppointment',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      appointmentId: 'params.appointmentId',
      reason: 'body.reason',
      cancelledBy: 'user.userId',
    },
    validation: Joi.object({
      reason: Joi.string().required(),
    }),
  },
  {
    path: '/patients/:patientId/appointments',
    method: 'GET',
    chaincode: 'appointment-contract',
    function: 'GetPatientAppointments',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      patientId: 'params.patientId',
    },
  },
  {
    path: '/doctors/:doctorId/appointments',
    method: 'GET',
    chaincode: 'appointment-contract',
    function: 'GetDoctorAppointments',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      doctorId: 'params.doctorId',
    },
  },

  // ==========================================
  // PRESCRIPTIONS ENDPOINTS
  // ==========================================
  {
    path: '/prescriptions',
    method: 'POST',
    chaincode: 'prescription-contract',
    function: 'CreatePrescription',
    channel: 'mychannel',
    auth: true,
    roles: ['doctor', 'admin'],
    paramMapping: {
      prescriptionId: 'body.prescriptionId',
      patientId: 'body.patientId',
      doctorId: 'body.doctorId',
      medications: 'body.medications', // JSON stringified array
      diagnosis: 'body.diagnosis',
      appointmentId: 'body.appointmentId',
    },
    validation: Joi.object({
      prescriptionId: Joi.string().required(),
      patientId: Joi.string().required(),
      doctorId: Joi.string().required(),
      medications: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          dosage: Joi.string().required(),
          frequency: Joi.string().required(),
          duration: Joi.string().required(),
          quantity: Joi.number().required(),
          instructions: Joi.string().required(),
        }),
      ).required(),
      diagnosis: Joi.string().optional(),
      appointmentId: Joi.string().optional(),
    }),
  },
  {
    path: '/prescriptions/:prescriptionId',
    method: 'GET',
    chaincode: 'prescription-contract',
    function: 'GetPrescription',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      prescriptionId: 'params.prescriptionId',
    },
  },
  {
    path: '/prescriptions',
    method: 'GET',
    chaincode: 'prescription-contract',
    function: 'GetAllPrescriptions',
    channel: 'mychannel',
    auth: true,
    paramMapping: {},
  },
  {
    path: '/prescriptions/:prescriptionId/dispense',
    method: 'POST',
    chaincode: 'prescription-contract',
    function: 'DispensePrescription',
    channel: 'mychannel',
    auth: true,
    roles: ['pharmacist', 'admin'],
    paramMapping: {
      prescriptionId: 'params.prescriptionId',
      pharmacyId: 'body.pharmacyId',
      dispensedBy: 'body.dispensedBy',
      notes: 'body.notes',
    },
    validation: Joi.object({
      pharmacyId: Joi.string().required(),
      dispensedBy: Joi.string().required(),
      notes: Joi.string().optional(),
    }),
  },
  {
    path: '/patients/:patientId/prescriptions',
    method: 'GET',
    chaincode: 'prescription-contract',
    function: 'GetPatientPrescriptions',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      patientId: 'params.patientId',
    },
  },
  {
    path: '/doctors/:doctorId/prescriptions',
    method: 'GET',
    chaincode: 'prescription-contract',
    function: 'GetDoctorPrescriptions',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      doctorId: 'params.doctorId',
    },
  },

  // ==========================================
  // LAB TESTS ENDPOINTS
  // ==========================================
  {
    path: '/lab-tests',
    method: 'POST',
    chaincode: 'lab-test-contract',
    function: 'OrderLabTest',
    channel: 'mychannel',
    auth: true,
    roles: ['doctor', 'admin'],
    paramMapping: {
      labTestId: 'body.labTestId',
      appointmentId: 'body.appointmentId',
      patientId: 'body.patientId',
      doctorId: 'body.doctorId',
      testType: 'body.testType',
      testName: 'body.testName',
      instructions: 'body.instructions',
      priority: 'body.priority',
    },
    validation: Joi.object({
      labTestId: Joi.string().required(),
      appointmentId: Joi.string().required(),
      patientId: Joi.string().required(),
      doctorId: Joi.string().required(),
      testType: Joi.string().required(),
      testName: Joi.string().required(),
      instructions: Joi.string().required(),
      priority: Joi.string().valid('routine', 'urgent', 'asap').required(),
    }),
  },
  {
    path: '/lab-tests/:labTestId',
    method: 'GET',
    chaincode: 'lab-test-contract',
    function: 'GetLabTest',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      labTestId: 'params.labTestId',
    },
  },
  {
    path: '/lab-tests',
    method: 'GET',
    chaincode: 'lab-test-contract',
    function: 'GetAllLabTests',
    channel: 'mychannel',
    auth: true,
    paramMapping: {},
  },
  {
    path: '/lab-tests/:labTestId/result',
    method: 'PUT',
    chaincode: 'lab-test-contract',
    function: 'UpdateLabTestResult',
    channel: 'mychannel',
    auth: true,
    roles: ['lab-technician', 'admin'],
    paramMapping: {
      labTestId: 'params.labTestId',
      results: 'body.results',
      status: 'body.status',
      notes: 'body.notes',
    },
    validation: Joi.object({
      results: Joi.string().required(),
      status: Joi.string().valid('pending', 'completed', 'cancelled').required(),
      notes: Joi.string().optional(),
    }),
  },

  // ==========================================
  // INSURANCE CLAIMS ENDPOINTS
  // ==========================================
  {
    path: '/claims',
    method: 'POST',
    chaincode: 'insurance-claims-contract',
    function: 'SubmitClaim',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      claimId: 'body.claimId',
      patientId: 'body.patientId',
      providerId: 'body.providerId',
      insuranceId: 'body.insuranceId',
      amount: 'body.amount',
      description: 'body.description',
    },
  },
  {
    path: '/claims/:claimId',
    method: 'GET',
    chaincode: 'insurance-claims-contract',
    function: 'GetClaim',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      claimId: 'params.claimId',
    },
  },

  // ==========================================
  // CONSENTS ENDPOINTS
  // ==========================================
  {
    path: '/consents',
    method: 'GET',
    chaincode: 'healthlink-contract',
    function: 'GetConsentsByPatient',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      patientId: 'user.userId', // Auto-inject from JWT (Me pattern)
    },
  },
  {
    path: '/consents',
    method: 'POST',
    chaincode: 'healthlink-contract',
    function: 'CreateConsent',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      consentId: 'body.consentId',
      patientId: 'user.userId', // Auto-inject from JWT
      granteeId: 'body.granteeId',
      scope: 'body.scope',
      purpose: 'body.purpose',
      validUntil: 'body.validUntil',
    },
    validation: Joi.object({
      consentId: Joi.string().required(),
      granteeId: Joi.string().required(),
      scope: Joi.string().required(),
      purpose: Joi.string().required(),
      validUntil: Joi.string().isoDate().required(),
    }),
  },
  {
    path: '/consents/:consentId',
    method: 'GET',
    chaincode: 'healthlink-contract',
    function: 'GetConsent',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      consentId: 'params.consentId',
    },
  },
  {
    path: '/consents/:consentId/revoke',
    method: 'PATCH',
    chaincode: 'healthlink-contract',
    function: 'RevokeConsent',
    channel: 'mychannel',
    auth: true,
    paramMapping: {
      consentId: 'params.consentId',
    },
    validation: Joi.object({
      reason: Joi.string().optional(),
    }),
  },
];

export default routesConfig;
