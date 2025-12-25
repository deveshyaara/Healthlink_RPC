import { useState, useCallback } from 'react';
import ethereumService, { Patient, MedicalRecord, Consent } from '../services/ethereum.service';

import { extractErrorMessage } from './error-utils';

export function useHealthcare() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPatient = useCallback(async (
    patientAddress: string,
    name: string,
    age: number,
    gender: string,
    ipfsHash: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const receipt = await ethereumService.createPatient(patientAddress, name, age, gender, ipfsHash);
      return receipt;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to create patient');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPatient = useCallback(async (patientAddress: string): Promise<Patient> => {
    setIsLoading(true);
    setError(null);
    try {
      const patient = await ethereumService.getPatient(patientAddress);
      return patient;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to get patient');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createMedicalRecord = useCallback(async (
    recordId: string,
    patientId: string,
    doctorId: string,
    recordType: string,
    ipfsHash: string,
    metadata: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const receipt = await ethereumService.createMedicalRecord(
        recordId, patientId, doctorId, recordType, ipfsHash, metadata
      );
      return receipt;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to create medical record');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMedicalRecord = useCallback(async (recordId: string): Promise<MedicalRecord> => {
    setIsLoading(true);
    setError(null);
    try {
      const record = await ethereumService.getMedicalRecord(recordId);
      return record;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to get medical record');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRecordsByPatient = useCallback(async (patientId: string): Promise<string[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const records = await ethereumService.getRecordsByPatient(patientId);
      return records;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to get patient records');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createConsent = useCallback(async (
    consentId: string,
    patientId: string,
    doctorAddress: string,
    validityDays: number
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const receipt = await ethereumService.createConsent(
        consentId, patientId, doctorAddress, validityDays
      );
      return receipt;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to create consent');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getConsent = useCallback(async (consentId: string): Promise<Consent> => {
    setIsLoading(true);
    setError(null);
    try {
      const consent = await ethereumService.getConsent(consentId);
      return consent;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to get consent');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Revoke a consent (on-chain)
   */
  const revokeConsent = useCallback(async (consentId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const tx = await (ethereumService as any).revokeConsent(consentId);
      return tx;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to revoke consent');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAppointment = useCallback(async (
    appointmentId: string,
    patientId: string,
    doctorAddress: string,
    timestamp: number,
    reason: string,
    notes: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const receipt = await ethereumService.createAppointment(
        appointmentId, patientId, doctorAddress, timestamp, reason, notes
      );
      return receipt;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to create appointment');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPrescription = useCallback(async (
    prescriptionId: string,
    patientId: string,
    doctorAddress: string,
    medication: string,
    dosage: string,
    expiryTimestamp: number
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const receipt = await ethereumService.createPrescription(
        prescriptionId, patientId, doctorAddress, medication, dosage, expiryTimestamp
      );
      return receipt;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to create prescription');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerDoctor = useCallback(async (
    doctorAddress: string,
    name: string,
    specialization: string,
    licenseNumber: string,
    hospitalAffiliation: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const receipt = await ethereumService.registerDoctor(
        doctorAddress, name, specialization, licenseNumber, hospitalAffiliation
      );
      return receipt;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to register doctor');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getVerifiedDoctors = useCallback(async (): Promise<string[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const doctors = await ethereumService.getVerifiedDoctors();
      return doctors;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to get verified doctors');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createPatient,
    getPatient,
    createMedicalRecord,
    getMedicalRecord,
    getRecordsByPatient,
    createConsent,
    getConsent,
    revokeConsent,
    createAppointment,
    createPrescription,
    registerDoctor,
    getVerifiedDoctors,
  };
}
