'use strict';

const { Contract } = require('fabric-contract-api');
const { BaseHealthContract } = require('./base-contract');
const { Validators } = require('./validators');
const {
    AssetNotFoundError,
    AssetAlreadyExistsError,
    ValidationError,
    UnauthorizedError
} = require('./errors');/**
 * PatientRecordsContract - Manages medical records with IPFS integration
 * Features:
 * - Medical record creation and updates
 * - IPFS hash storage for off-chain data
 * - Access logging and audit trail
 * - Version control
 * - Privacy-preserving queries
 */
class PatientRecordsContract extends BaseHealthContract {

    /**
     * Create a new medical record
     */
    async CreateMedicalRecord(ctx, recordId, patientId, doctorId, recordType, ipfsHash, metadataJson) {
        console.info('============= START : Create Medical Record ===========');

        // Validate inputs
        this.validateRequiredFields(
            { recordId, patientId, doctorId, recordType, ipfsHash, metadataJson },
            ['recordId', 'patientId', 'doctorId', 'recordType', 'ipfsHash', 'metadataJson']
        );

        // Check if record already exists
        const exists = await this.assetExists(ctx, recordId);
        if (exists) {
            throw new AssetAlreadyExistsError('Medical Record', recordId);
        }

        // Validate IPFS hash
        if (!Validators.isValidIpfsHash(ipfsHash)) {
            throw new ValidationError('Invalid IPFS hash format', 'ipfsHash');
        }

        // Validate record type
        const validTypes = ['lab_result', 'prescription', 'diagnosis', 'imaging', 'consultation', 'surgery', 'other'];
        if (!validTypes.includes(recordType)) {
            throw new ValidationError(`Record type must be one of: ${validTypes.join(', ')}`, 'recordType');
        }

        // Parse and validate metadata
        let metadata;
        try {
            metadata = JSON.parse(metadataJson);
        } catch (error) {
            throw new ValidationError('Invalid JSON format for metadata', 'metadataJson');
        }

        const timestamp = this.getCurrentTimestamp(ctx);
        const callerId = this.getCallerId(ctx);

        const record = {
            docType: 'medicalRecord',
            recordId: recordId,
            patientId: Validators.validatePatientId(patientId),
            doctorId: Validators.validateDoctorId(doctorId),
            recordType: recordType,
            ipfsHash: ipfsHash,
            metadata: metadata,
            version: 1,
            createdAt: timestamp,
            createdBy: callerId,
            updatedAt: timestamp,
            updatedBy: callerId,
            status: 'active',
            accessLog: [],
            isConfidential: metadata.isConfidential || false,
            tags: metadata.tags || []
        };

        // Store record
        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));

        // Create audit trail
        await this.createAuditRecord(ctx, 'CreateMedicalRecord', recordId, 'medicalRecord', {
            patientId: patientId,
            doctorId: doctorId,
            recordType: recordType
        });

        // Emit event
        this.emitEvent(ctx, 'MedicalRecordCreated', {
            recordId: recordId,
            patientId: patientId,
            doctorId: doctorId,
            recordType: recordType,
            timestamp: timestamp
        });

        console.info('============= END : Create Medical Record ===========');
        return JSON.stringify({
            success: true,
            recordId: recordId,
            message: 'Medical record created successfully',
            record: record
        });
    }

    /**
     * Update medical record (creates new version)
     * @param {Context} ctx - Transaction context  
     * @param {string} recordId - Record identifier
     * @param {string} patientId - Patient identifier (for validation)
     * @param {string} ipfsHash - New IPFS hash for updated file
     * @param {string} updatedMetadataJson - JSON string with updated metadata
     */
    async UpdateMedicalRecord(ctx, recordId, patientId, ipfsHash, updatedMetadataJson) {
        console.info('============= START : Update Medical Record ===========');

        // Get existing record
        const record = await this.getAsset(ctx, recordId);

        if (record.docType !== 'medicalRecord') {
            throw new ValidationError('Asset is not a medical record', 'recordId');
        }

        // Validate patient ID matches
        if (record.patientId !== patientId) {
            throw new ValidationError('Patient ID does not match record', 'patientId');
        }

        // Check authorization (only original doctor or patient can update)
        const callerId = this.getCallerId(ctx);
        
        // Parse updated metadata
        let updatedMetadata;
        try {
            updatedMetadata = JSON.parse(updatedMetadataJson);
        } catch (error) {
            throw new ValidationError('Invalid JSON format for updated metadata', 'updatedMetadataJson');
        }

        const timestamp = this.getCurrentTimestamp(ctx);

        // Update record with new IPFS hash and metadata
        record.ipfsHash = ipfsHash;
        record.metadata = { ...record.metadata, ...updatedMetadata };
        record.version += 1;
        record.updatedAt = timestamp;
        record.updatedBy = callerId;

        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));

        // Audit
        await this.createAuditRecord(ctx, 'UpdateMedicalRecord', recordId, 'medicalRecord', {
            version: record.version,
            newIpfsHash: ipfsHash
        });

        // Emit event
        this.emitEvent(ctx, 'MedicalRecordUpdated', {
            recordId: recordId,
            version: record.version,
            timestamp: timestamp
        });

        console.info('============= END : Update Medical Record ===========');
        return JSON.stringify({
            success: true,
            message: 'Medical record updated successfully',
            record: record
        });
    }

    /**
     * Get medical record with access logging
     */
    async GetMedicalRecord(ctx, recordId, accessorId, accessReason) {
        console.info('============= START : Get Medical Record ===========');

        const record = await this.getAsset(ctx, recordId);

        if (record.docType !== 'medicalRecord') {
            throw new ValidationError('Asset is not a medical record', 'recordId');
        }

        const timestamp = this.getCurrentTimestamp(ctx);

        // Log access
        record.accessLog.push({
            accessorId: accessorId,
            accessReason: accessReason || 'View record',
            timestamp: timestamp,
            action: 'view'
        });

        // Keep only last 100 access logs to prevent bloat
        if (record.accessLog.length > 100) {
            record.accessLog = record.accessLog.slice(-100);
        }

        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));

        // Audit
        await this.createAuditRecord(ctx, 'AccessMedicalRecord', recordId, 'medicalRecord', {
            accessorId: accessorId,
            accessReason: accessReason
        });

        console.info('============= END : Get Medical Record ===========');
        return JSON.stringify(record);
    }

    /**
     * Get all medical records for a patient
     * @param {Context} ctx - Transaction context
     * @param {string} patientId - Patient identifier
     * @param {string} recordType - Optional: Filter by record type
     * @param {string} startDate - Optional: Start date filter
     * @param {string} endDate - Optional: End date filter
     */
    async GetRecordsByPatient(ctx, patientId, recordType = '', startDate = '', endDate = '') {
        console.info('============= START : Get Records By Patient ===========');

        const queryString = {
            selector: {
                docType: 'medicalRecord',
                patientId: Validators.validatePatientId(patientId),
                status: 'active'
            },
            sort: [{ createdAt: 'desc' }]
        };

        // Optional filters
        if (recordType && recordType.trim() !== '') {
            queryString.selector.recordType = recordType;
        }

        if (startDate && startDate.trim() !== '' && endDate && endDate.trim() !== '') {
            queryString.selector.createdAt = {
                $gte: startDate,
                $lte: endDate
            };
        }

        const results = await this.getQueryResults(ctx, queryString);

        console.info('============= END : Get Records By Patient ===========');
        return results;
    }

    /**
     * Get records by doctor
     * @param {Context} ctx - Transaction context
     * @param {string} doctorId - Doctor identifier
     * @param {string} startDate - Optional: Start date filter
     * @param {string} endDate - Optional: End date filter
     */
    async GetRecordsByDoctor(ctx, doctorId, startDate = '', endDate = '') {
        console.info('============= START : Get Records By Doctor ===========');

        const queryString = {
            selector: {
                docType: 'medicalRecord',
                doctorId: Validators.validateDoctorId(doctorId),
                status: 'active'
            },
            sort: [{ createdAt: 'desc' }]
        };

        if (startDate && startDate.trim() !== '' && endDate && endDate.trim() !== '') {
            queryString.selector.createdAt = {
                $gte: startDate,
                $lte: endDate
            };
        }

        const results = await this.getQueryResults(ctx, queryString);

        console.info('============= END : Get Records By Doctor ===========');
        return results;
    }

    /**
     * Search records by tags
     */
    async SearchRecordsByTags(ctx, patientId, tags) {
        console.info('============= START : Search Records By Tags ===========');

        const tagsArray = JSON.parse(tags);

        const queryString = {
            selector: {
                docType: 'medicalRecord',
                patientId: Validators.validatePatientId(patientId),
                status: 'active',
                tags: { $in: tagsArray }
            },
            sort: [{ createdAt: 'desc' }]
        };

        const results = await this.getQueryResults(ctx, queryString);

        console.info('============= END : Search Records By Tags ===========');
        return results;
    }

    /**
     * Archive a medical record (soft delete)
     */
    async ArchiveMedicalRecord(ctx, recordId, archiveReason) {
        console.info('============= START : Archive Medical Record ===========');

        const record = await this.getAsset(ctx, recordId);

        if (record.status === 'archived') {
            throw new ValidationError('Record is already archived', 'status');
        }

        const timestamp = this.getCurrentTimestamp(ctx);
        const callerId = this.getCallerId(ctx);

        record.status = 'archived';
        record.archivedAt = timestamp;
        record.archivedBy = callerId;
        record.archiveReason = archiveReason;

        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));

        // Audit
        await this.createAuditRecord(ctx, 'ArchiveMedicalRecord', recordId, 'medicalRecord', {
            archiveReason: archiveReason
        });

        console.info('============= END : Archive Medical Record ===========');
        return JSON.stringify({
            success: true,
            message: 'Medical record archived successfully'
        });
    }

    /**
     * Get access log for a record
     */
    async GetRecordAccessLog(ctx, recordId) {
        console.info('============= START : Get Record Access Log ===========');

        const record = await this.getAsset(ctx, recordId);

        console.info('============= END : Get Record Access Log ===========');
        return JSON.stringify({
            recordId: recordId,
            accessLog: record.accessLog || []
        });
    }

    /**
     * Get record history (all versions)
     */
    async GetRecordHistory(ctx, recordId) {
        console.info('============= START : Get Record History ===========');

        const history = await this.getAssetHistory(ctx, recordId);

        console.info('============= END : Get Record History ===========');
        return history;
    }

    /**
     * Get records with pagination
     */
    async GetRecordsPaginated(ctx, patientId, pageSize, bookmark) {
        console.info('============= START : Get Records Paginated ===========');

        const queryString = {
            selector: {
                docType: 'medicalRecord',
                patientId: Validators.validatePatientId(patientId),
                status: 'active'
            },
            sort: [{ createdAt: 'desc' }]
        };

        const results = await this.getQueryResultsWithPagination(
            ctx,
            queryString,
            parseInt(pageSize),
            bookmark || ''
        );

        console.info('============= END : Get Records Paginated ===========');
        return results;
    }
}

module.exports = PatientRecordsContract;
