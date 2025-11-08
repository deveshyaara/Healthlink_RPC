'use strict';

const { Contract } = require('fabric-contract-api');
const { BaseHealthContract } = require('./base-contract');
const { Validators } = require('./validators');
const { 
    ValidationError, 
    AssetNotFoundError, 
    ConflictError,
    InvalidStateError,
    UnauthorizedError 
} = require('./errors');

/**
 * PrescriptionContract - Smart contract for managing e-prescriptions
 * 
 * Features:
 * - E-prescription creation and management
 * - Medication validation and dosage verification
 * - Pharmacy dispensing workflow
 * - Refill management and tracking
 * - Drug interaction warnings
 * - Prescription history and audit trail
 * - Multi-medication support
 * - Prescription expiry management
 */
class PrescriptionContract extends BaseHealthContract {

    /**
     * Create a new prescription
     * @param {Context} ctx - Transaction context
     * @param {string} prescriptionId - Unique prescription ID
     * @param {string} patientId - Patient identifier
     * @param {string} doctorId - Prescribing doctor identifier
     * @param {string} medicationsJson - JSON array of medications
     * @param {string} diagnosisJson - JSON with diagnosis details
     * @param {string} appointmentId - Related appointment ID (optional)
     * @returns {Object} Success response with prescription details
     */
    async CreatePrescription(ctx, prescriptionId, patientId, doctorId, medicationsJson, diagnosisJson, appointmentId) {
        console.info('============= START : Create Prescription ===========');
        
        // Validate required fields
        this.validateRequiredFields(
            { prescriptionId, patientId, doctorId, medicationsJson },
            ['prescriptionId', 'patientId', 'doctorId', 'medicationsJson']
        );

        // Validate formats
        Validators.validateId(prescriptionId, 'Prescription ID');
        Validators.validateId(patientId, 'Patient ID');
        Validators.validateId(doctorId, 'Doctor ID');

        // Check if prescription already exists
        const exists = await this.assetExists(ctx, prescriptionId);
        if (exists) {
            throw new ConflictError(`Prescription with ID ${prescriptionId} already exists`);
        }

        // Parse and validate medications
        let medications = [];
        try {
            medications = JSON.parse(medicationsJson);
            if (!Array.isArray(medications) || medications.length === 0) {
                throw new ValidationError('At least one medication is required');
            }

            // Validate each medication
            for (const med of medications) {
                this._validateMedication(med);
            }
        } catch (error) {
            if (error instanceof ValidationError) throw error;
            throw new ValidationError('Invalid medications JSON format');
        }

        // Parse diagnosis
        let diagnosis = {};
        try {
            diagnosis = JSON.parse(diagnosisJson || '{}');
        } catch (error) {
            throw new ValidationError('Invalid diagnosis JSON format');
        }

        // Create prescription object
        const prescription = {
            docType: 'prescription',
            prescriptionId,
            patientId,
            doctorId,
            appointmentId: appointmentId || null,
            medications: medications.map(med => ({
                medicationName: med.name,
                genericName: med.genericName || med.name,
                dosage: med.dosage,
                frequency: med.frequency,
                duration: med.duration,
                durationUnit: med.durationUnit || 'days',
                instructions: med.instructions || '',
                quantity: med.quantity,
                refillsAllowed: med.refillsAllowed || 0,
                refillsRemaining: med.refillsAllowed || 0,
                warnings: med.warnings || [],
                substitutionAllowed: med.substitutionAllowed !== false
            })),
            diagnosis: {
                condition: diagnosis.condition || '',
                icdCode: diagnosis.icdCode || '',
                notes: diagnosis.notes || ''
            },
            status: 'active',
            issuedDate: this.getCurrentTimestamp(ctx),
            expiryDate: this._calculateExpiryDate(ctx, medications),
            createdAt: this.getCurrentTimestamp(ctx),
            createdBy: this.getCallerId(ctx),
            updatedAt: this.getCurrentTimestamp(ctx),
            dispensingRecords: [],
            refillHistory: [],
            isElectronic: true,
            pharmacyId: null,
            dispensedAt: null,
            dispensedBy: null,
            cancelledAt: null,
            cancellationReason: null,
            history: []
        };

        // Save prescription
        await ctx.stub.putState(prescriptionId, Buffer.from(JSON.stringify(prescription)));

        // Create audit record
        await this.createAuditRecord(ctx, {
            action: 'PRESCRIPTION_CREATED',
            prescriptionId,
            patientId,
            doctorId,
            medicationCount: medications.length,
            actor: this.getCallerId(ctx)
        });

        return {
            success: true,
            prescriptionId,
            message: 'Prescription created successfully',
            prescription
        };
    }

    /**
     * Get prescription details
     * @param {Context} ctx - Transaction context
     * @param {string} prescriptionId - Prescription ID
     * @returns {Object} Prescription details
     */
    async GetPrescription(ctx, prescriptionId) {
        Validators.validateId(prescriptionId, 'Prescription ID');

        const prescription = await this.getAsset(ctx, prescriptionId);
        if (!prescription || prescription.docType !== 'prescription') {
            throw new AssetNotFoundError('Prescription', prescriptionId);
        }

        return prescription;
    }

    /**
     * Dispense prescription at pharmacy
     * @param {Context} ctx - Transaction context
     * @param {string} prescriptionId - Prescription ID
     * @param {string} pharmacyId - Pharmacy identifier
     * @param {string} pharmacistId - Pharmacist identifier
     * @param {string} dispensingDetailsJson - JSON with dispensing details
     * @returns {Object} Success response
     */
    async DispensePrescription(ctx, prescriptionId, pharmacyId, pharmacistId, dispensingDetailsJson = '{}') {
        Validators.validateId(prescriptionId, 'Prescription ID');
        Validators.validateId(pharmacyId, 'Pharmacy ID');
        Validators.validateId(pharmacistId, 'Pharmacist ID');

        const prescription = await this.getAsset(ctx, prescriptionId);
        if (!prescription || prescription.docType !== 'prescription') {
            throw new AssetNotFoundError('Prescription', prescriptionId);
        }

        if (prescription.status !== 'active') {
            throw new InvalidStateError(
                `Cannot dispense prescription with status: ${prescription.status}`,
                'INVALID_STATUS'
            );
        }

        // Check if prescription is expired
        if (new Date(prescription.expiryDate) < new Date()) {
            throw new InvalidStateError('Prescription has expired', 'PRESCRIPTION_EXPIRED');
        }

        // Parse dispensing details
        let details = {};
        try {
            details = JSON.parse(dispensingDetailsJson);
        } catch (error) {
            throw new ValidationError('Invalid dispensing details JSON format');
        }

        // Create dispensing record
        const dispensingRecord = {
            pharmacyId,
            pharmacistId,
            dispensedAt: this.getCurrentTimestamp(ctx),
            medicationsDispensed: details.medications || prescription.medications.map(m => m.medicationName),
            notes: details.notes || '',
            partialDispense: details.partial || false,
            dispensingMethod: details.method || 'in-person'
        };

        // Update prescription
        prescription.dispensingRecords.push(dispensingRecord);
        
        if (!details.partial) {
            prescription.status = 'dispensed';
            prescription.pharmacyId = pharmacyId;
            prescription.dispensedAt = this.getCurrentTimestamp(ctx);
            prescription.dispensedBy = pharmacistId;
        }

        prescription.updatedAt = this.getCurrentTimestamp(ctx);
        prescription.history.push({
            action: details.partial ? 'partially_dispensed' : 'dispensed',
            timestamp: this.getCurrentTimestamp(ctx),
            by: pharmacistId,
            pharmacy: pharmacyId
        });

        await ctx.stub.putState(prescriptionId, Buffer.from(JSON.stringify(prescription)));

        await this.createAuditRecord(ctx, {
            action: 'PRESCRIPTION_DISPENSED',
            prescriptionId,
            pharmacyId,
            pharmacistId,
            partial: details.partial || false,
            actor: this.getCallerId(ctx)
        });

        return {
            success: true,
            message: details.partial ? 'Prescription partially dispensed' : 'Prescription dispensed successfully',
            prescription
        };
    }

    /**
     * Process prescription refill
     * @param {Context} ctx - Transaction context
     * @param {string} prescriptionId - Prescription ID
     * @param {string} pharmacyId - Pharmacy ID
     * @param {string} medicationsJson - JSON array of medications to refill
     * @returns {Object} Success response
     */
    async RefillPrescription(ctx, prescriptionId, pharmacyId, medicationsJson) {
        Validators.validateId(prescriptionId, 'Prescription ID');
        Validators.validateId(pharmacyId, 'Pharmacy ID');

        const prescription = await this.getAsset(ctx, prescriptionId);
        if (!prescription || prescription.docType !== 'prescription') {
            throw new AssetNotFoundError('Prescription', prescriptionId);
        }

        if (prescription.status === 'cancelled') {
            throw new InvalidStateError('Cannot refill cancelled prescription', 'PRESCRIPTION_CANCELLED');
        }

        if (new Date(prescription.expiryDate) < new Date()) {
            throw new InvalidStateError('Prescription has expired', 'PRESCRIPTION_EXPIRED');
        }

        // Parse medications to refill
        let medicationsToRefill = [];
        try {
            medicationsToRefill = JSON.parse(medicationsJson);
        } catch (error) {
            throw new ValidationError('Invalid medications JSON format');
        }

        // Process refills
        const refilledMeds = [];
        for (const medName of medicationsToRefill) {
            const medication = prescription.medications.find(m => m.medicationName === medName);
            
            if (!medication) {
                throw new ValidationError(`Medication not found in prescription: ${medName}`);
            }

            if (medication.refillsRemaining <= 0) {
                throw new InvalidStateError(
                    `No refills remaining for medication: ${medName}`,
                    'NO_REFILLS_REMAINING'
                );
            }

            medication.refillsRemaining -= 1;
            refilledMeds.push(medName);
        }

        // Create refill record
        const refillRecord = {
            refillDate: this.getCurrentTimestamp(ctx),
            pharmacyId,
            medications: refilledMeds,
            refillNumber: prescription.refillHistory.length + 1
        };

        prescription.refillHistory.push(refillRecord);
        prescription.updatedAt = this.getCurrentTimestamp(ctx);
        prescription.history.push({
            action: 'refilled',
            timestamp: this.getCurrentTimestamp(ctx),
            pharmacy: pharmacyId,
            medications: refilledMeds
        });

        await ctx.stub.putState(prescriptionId, Buffer.from(JSON.stringify(prescription)));

        await this.createAuditRecord(ctx, {
            action: 'PRESCRIPTION_REFILLED',
            prescriptionId,
            pharmacyId,
            medications: refilledMeds,
            actor: this.getCallerId(ctx)
        });

        return {
            success: true,
            message: 'Prescription refilled successfully',
            refilledMedications: refilledMeds,
            prescription
        };
    }

    /**
     * Cancel a prescription
     * @param {Context} ctx - Transaction context
     * @param {string} prescriptionId - Prescription ID
     * @param {string} reason - Cancellation reason
     * @returns {Object} Success response
     */
    async CancelPrescription(ctx, prescriptionId, reason) {
        Validators.validateId(prescriptionId, 'Prescription ID');

        if (!reason || reason.trim().length === 0) {
            throw new ValidationError('Cancellation reason is required');
        }

        const prescription = await this.getAsset(ctx, prescriptionId);
        if (!prescription || prescription.docType !== 'prescription') {
            throw new AssetNotFoundError('Prescription', prescriptionId);
        }

        if (prescription.status === 'cancelled') {
            throw new InvalidStateError('Prescription is already cancelled', 'ALREADY_CANCELLED');
        }

        const previousStatus = prescription.status;
        prescription.status = 'cancelled';
        prescription.cancelledAt = this.getCurrentTimestamp(ctx);
        prescription.cancellationReason = reason;
        prescription.updatedAt = this.getCurrentTimestamp(ctx);

        prescription.history.push({
            action: 'cancelled',
            timestamp: this.getCurrentTimestamp(ctx),
            by: this.getCallerId(ctx),
            previousStatus,
            reason
        });

        await ctx.stub.putState(prescriptionId, Buffer.from(JSON.stringify(prescription)));

        await this.createAuditRecord(ctx, {
            action: 'PRESCRIPTION_CANCELLED',
            prescriptionId,
            reason,
            actor: this.getCallerId(ctx)
        });

        return {
            success: true,
            message: 'Prescription cancelled successfully',
            prescription
        };
    }

    /**
     * Get prescriptions by patient
     * @param {Context} ctx - Transaction context
     * @param {string} patientId - Patient ID
     * @returns {Array} List of prescriptions
     */
    async GetPatientPrescriptions(ctx, patientId) {
        Validators.validateId(patientId, 'Patient ID');

        const query = {
            selector: {
                docType: 'prescription',
                patientId
            },
            sort: [{ issuedDate: 'desc' }]
        };

        return await this.executeQuery(ctx, query);
    }

    /**
     * Get prescriptions by doctor
     * @param {Context} ctx - Transaction context
     * @param {string} doctorId - Doctor ID
     * @returns {Array} List of prescriptions
     */
    async GetDoctorPrescriptions(ctx, doctorId) {
        Validators.validateId(doctorId, 'Doctor ID');

        const query = {
            selector: {
                docType: 'prescription',
                doctorId
            },
            sort: [{ issuedDate: 'desc' }]
        };

        return await this.executeQuery(ctx, query);
    }

    /**
     * Get active prescriptions for a patient
     * @param {Context} ctx - Transaction context
     * @param {string} patientId - Patient ID
     * @returns {Array} List of active prescriptions
     */
    async GetActivePrescriptions(ctx, patientId) {
        Validators.validateId(patientId, 'Patient ID');

        const query = {
            selector: {
                docType: 'prescription',
                patientId,
                status: 'active',
                expiryDate: { $gt: this.getCurrentTimestamp(ctx) }
            },
            sort: [{ issuedDate: 'desc' }]
        };

        return await this.executeQuery(ctx, query);
    }

    /**
     * Get prescriptions by pharmacy
     * @param {Context} ctx - Transaction context
     * @param {string} pharmacyId - Pharmacy ID
     * @returns {Array} List of prescriptions
     */
    async GetPharmacyPrescriptions(ctx, pharmacyId) {
        Validators.validateId(pharmacyId, 'Pharmacy ID');

        const query = {
            selector: {
                docType: 'prescription',
                pharmacyId
            },
            sort: [{ dispensedAt: 'desc' }]
        };

        return await this.executeQuery(ctx, query);
    }

    /**
     * Search prescriptions by medication
     * @param {Context} ctx - Transaction context
     * @param {string} medicationName - Medication name to search for
     * @returns {Array} List of prescriptions
     */
    async SearchByMedication(ctx, medicationName) {
        if (!medicationName || medicationName.trim().length === 0) {
            throw new ValidationError('Medication name is required');
        }

        const query = {
            selector: {
                docType: 'prescription',
                'medications': {
                    $elemMatch: {
                        medicationName: { $regex: `(?i)${medicationName}` }
                    }
                }
            },
            sort: [{ issuedDate: 'desc' }]
        };

        return await this.executeQuery(ctx, query);
    }

    /**
     * Get prescription history (audit trail)
     * @param {Context} ctx - Transaction context
     * @param {string} prescriptionId - Prescription ID
     * @returns {Array} History of changes
     */
    async GetPrescriptionHistory(ctx, prescriptionId) {
        Validators.validateId(prescriptionId, 'Prescription ID');

        const history = await this.getAssetHistory(ctx, prescriptionId);
        return history;
    }

    /**
     * Verify prescription authenticity
     * @param {Context} ctx - Transaction context
     * @param {string} prescriptionId - Prescription ID
     * @returns {Object} Verification result
     */
    async VerifyPrescription(ctx, prescriptionId) {
        Validators.validateId(prescriptionId, 'Prescription ID');

        const prescription = await this.getAsset(ctx, prescriptionId);
        if (!prescription || prescription.docType !== 'prescription') {
            return {
                valid: false,
                message: 'Prescription not found',
                prescriptionId
            };
        }

        const isExpired = new Date(prescription.expiryDate) < new Date();
        const isValid = prescription.status === 'active' && !isExpired;

        return {
            valid: isValid,
            prescriptionId,
            status: prescription.status,
            isExpired,
            expiryDate: prescription.expiryDate,
            patientId: prescription.patientId,
            doctorId: prescription.doctorId,
            issuedDate: prescription.issuedDate,
            message: isValid ? 'Prescription is valid' : 'Prescription is not valid'
        };
    }

    /**
     * Update prescription notes
     * @param {Context} ctx - Transaction context
     * @param {string} prescriptionId - Prescription ID
     * @param {string} notes - Additional notes
     * @returns {Object} Success response
     */
    async AddPrescriptionNotes(ctx, prescriptionId, notes) {
        Validators.validateId(prescriptionId, 'Prescription ID');

        if (!notes || notes.trim().length === 0) {
            throw new ValidationError('Notes cannot be empty');
        }

        const prescription = await this.getAsset(ctx, prescriptionId);
        if (!prescription || prescription.docType !== 'prescription') {
            throw new AssetNotFoundError('Prescription', prescriptionId);
        }

        if (!prescription.additionalNotes) {
            prescription.additionalNotes = [];
        }

        prescription.additionalNotes.push({
            note: notes,
            addedAt: this.getCurrentTimestamp(ctx),
            addedBy: this.getCallerId(ctx)
        });

        prescription.updatedAt = this.getCurrentTimestamp(ctx);

        await ctx.stub.putState(prescriptionId, Buffer.from(JSON.stringify(prescription)));

        return {
            success: true,
            message: 'Notes added successfully',
            prescription
        };
    }

    // ==================== Private Helper Methods ====================

    /**
     * Validate medication object
     * @private
     */
    _validateMedication(med) {
        if (!med.name || med.name.trim().length === 0) {
            throw new ValidationError('Medication name is required');
        }

        if (!med.dosage || med.dosage.trim().length === 0) {
            throw new ValidationError('Medication dosage is required');
        }

        if (!med.frequency || med.frequency.trim().length === 0) {
            throw new ValidationError('Medication frequency is required');
        }

        if (!med.duration || isNaN(med.duration) || med.duration <= 0) {
            throw new ValidationError('Valid medication duration is required');
        }

        if (!med.quantity || isNaN(med.quantity) || med.quantity <= 0) {
            throw new ValidationError('Valid medication quantity is required');
        }

        if (med.refillsAllowed !== undefined) {
            if (isNaN(med.refillsAllowed) || med.refillsAllowed < 0) {
                throw new ValidationError('Refills allowed must be a non-negative number');
            }
        }
    }

    /**
     * Calculate prescription expiry date
     * @private
     */
    _calculateExpiryDate(ctx, medications) {
        // Find the longest duration
        let maxDuration = 0;
        for (const med of medications) {
            let durationInDays = parseInt(med.duration);
            
            // Convert to days if needed
            if (med.durationUnit === 'weeks') {
                durationInDays *= 7;
            } else if (med.durationUnit === 'months') {
                durationInDays *= 30;
            }

            if (durationInDays > maxDuration) {
                maxDuration = durationInDays;
            }
        }

        // Add 30 days buffer for refills using deterministic timestamp
        const txTimestamp = ctx.stub.getTxTimestamp();
        const expiryDate = new Date(txTimestamp.seconds * 1000);
        expiryDate.setDate(expiryDate.getDate() + maxDuration + 30);

        return expiryDate.toISOString();
    }
}

module.exports = PrescriptionContract;
