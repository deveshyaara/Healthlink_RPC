'use strict';

const { Contract } = require('fabric-contract-api');

class PatientRecordsContract extends Contract {

    /**
     * Create a new medical record
     * @param {Context} ctx - Transaction context
     * @param {string} recordId - Unique record identifier
     * @param {string} patientId - Patient identifier
     * @param {string} doctorId - Doctor identifier
     * @param {string} recordType - Type of medical record
     * @param {string} ipfsHash - IPFS hash of the file
     * @param {string} metadata - JSON string of metadata
     */
    async CreateRecord(ctx, recordId, patientId, doctorId, recordType, ipfsHash, metadata) {
        // Check if record already exists
        const exists = await this._recordExists(ctx, recordId);
        if (exists) {
            throw new Error(`Record ${recordId} already exists`);
        }

        // Parse metadata if provided
        let parsedMetadata = {};
        if (metadata) {
            try {
                parsedMetadata = JSON.parse(metadata);
            } catch (error) {
                throw new Error(`Invalid metadata JSON: ${error.message}`);
            }
        }

        // Create record object
        const record = {
            docType: 'medicalRecord',
            recordId: recordId,
            patientId: patientId,
            doctorId: doctorId || 'self-uploaded',
            recordType: recordType,
            ipfsHash: ipfsHash,
            metadata: parsedMetadata,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Store record in blockchain
        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));

        // Create index for patient-based queries
        const indexName = 'patient~record';
        const indexKey = await ctx.stub.createCompositeKey(indexName, [patientId, recordId]);
        await ctx.stub.putState(indexKey, Buffer.from('\u0000'));

        return JSON.stringify(record);
    }

    /**
     * Get a medical record by ID
     */
    async GetRecord(ctx, recordId) {
        const recordBytes = await ctx.stub.getState(recordId);
        
        if (!recordBytes || recordBytes.length === 0) {
            throw new Error(`Record ${recordId} does not exist`);
        }

        return recordBytes.toString();
    }

    /**
     * Get all records for a patient
     */
    async GetRecordsByPatient(ctx, patientId) {
        const results = [];
        const iterator = await ctx.stub.getStateByPartialCompositeKey('patient~record', [patientId]);

        let result = await iterator.next();
        while (!result.done) {
            const compositeKey = result.value.key;
            const splitKey = await ctx.stub.splitCompositeKey(compositeKey);
            const recordId = splitKey.attributes[1];

            try {
                const recordBytes = await ctx.stub.getState(recordId);
                if (recordBytes && recordBytes.length > 0) {
                    const record = JSON.parse(recordBytes.toString());
                    results.push(record);
                }
            } catch (error) {
                console.error(`Error reading record ${recordId}: ${error.message}`);
            }

            result = await iterator.next();
        }

        await iterator.close();
        return JSON.stringify(results);
    }

    /**
     * Update record metadata
     */
    async UpdateRecordMetadata(ctx, recordId, metadata) {
        const exists = await this._recordExists(ctx, recordId);
        if (!exists) {
            throw new Error(`Record ${recordId} does not exist`);
        }

        const recordBytes = await ctx.stub.getState(recordId);
        const record = JSON.parse(recordBytes.toString());

        // Parse and update metadata
        let parsedMetadata = {};
        if (metadata) {
            try {
                parsedMetadata = JSON.parse(metadata);
            } catch (error) {
                throw new Error(`Invalid metadata JSON: ${error.message}`);
            }
        }

        record.metadata = { ...record.metadata, ...parsedMetadata };
        record.updatedAt = new Date().toISOString();

        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));
        return JSON.stringify(record);
    }

    /**
     * Delete a record
     */
    async DeleteRecord(ctx, recordId) {
        const exists = await this._recordExists(ctx, recordId);
        if (!exists) {
            throw new Error(`Record ${recordId} does not exist`);
        }

        // Get record to find patientId for index removal
        const recordBytes = await ctx.stub.getState(recordId);
        const record = JSON.parse(recordBytes.toString());

        // Delete the record
        await ctx.stub.deleteState(recordId);

        // Delete the index
        const indexName = 'patient~record';
        const indexKey = await ctx.stub.createCompositeKey(indexName, [record.patientId, recordId]);
        await ctx.stub.deleteState(indexKey);

        return JSON.stringify({ message: `Record ${recordId} deleted successfully` });
    }

    /**
     * Check if record exists
     */
    async _recordExists(ctx, recordId) {
        const recordBytes = await ctx.stub.getState(recordId);
        return recordBytes && recordBytes.length > 0;
    }

    /**
     * Initialize ledger with sample data (optional, for testing)
     */
    async InitLedger(ctx) {
        console.log('Initializing Patient Records Ledger');
        return JSON.stringify({ message: 'Ledger initialized successfully' });
    }
}

module.exports = PatientRecordsContract;
