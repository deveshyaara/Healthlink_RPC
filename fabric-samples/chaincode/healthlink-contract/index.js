/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';
const { Contract } = require('fabric-contract-api');

class HealthLinkContract extends Contract {

    /**
     * Simple function to verify chaincode is callable.
     */
    async Ping(ctx) {
        console.info('============= PING RECEIVED ===========');
        return JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() });
    }


    /**
     * Creates a new audit record and saves it to the ledger.
     * @param {Context} ctx - The transaction context.
     * @param {string} action - The action being audited (e.g., 'CreatePatient', 'RevokeConsent').
     * @param {string} targetId - The ID of the primary asset being affected (e.g., patientId, consentId).
     * @param {object} details - Any additional details to store.
     */
    async _createAuditRecord(ctx, action, targetId, details = {}) {
        console.info(`Creating audit record for action: ${action}, target: ${targetId}`);
        const txId = ctx.stub.getTxID();
        // Use deterministic timestamp from transaction
        const timestamp = ctx.stub.getTxTimestamp();
        const tsDate = new Date(timestamp.seconds * 1000 + timestamp.nanos / 1000000);
        const actorId = ctx.clientIdentity.getID(); // Get the invoker's identity

        const audit = {
            docType: 'audit',
            auditId: txId, // Use txId as the unique audit ID
            actorId: actorId,
            action: action,
            targetId: targetId,
            timestamp: tsDate.toISOString(),
            details: details,
        };

        const auditKey = `audit_${txId}`;
        console.info(`Putting audit state for key: ${auditKey}`);
        await ctx.stub.putState(auditKey, Buffer.from(JSON.stringify(audit)));
        console.info(`Audit record created successfully for txId: ${txId}`);
    }

    // =================================================================================
    // Patient Functions
    // =================================================================================

    /**
     * Creates a new patient.
     * Sensitive data is passed in the transient map.
     */
    async CreatePatient(ctx) {
        console.info('============= START : CreatePatient ===========');

        // === Get Transient Data ===
        const transientMap = ctx.stub.getTransient();
        if (!transientMap || !transientMap.has('patient')) {
             console.error('Transient data key "patient" not found in transaction');
             throw new Error('Transient data key "patient" not found in transaction');
        }
        const transientData = transientMap.get('patient'); // Now we know the key exists

        if (!transientData || transientData.length === 0) {
             console.error('Patient transient data buffer is empty');
             throw new Error('Patient transient data buffer is empty');
        }
        console.info('Transient data received.');

        let patientInput;
        try {
            patientInput = JSON.parse(transientData.toString());
            console.info('Transient data parsed successfully.');
        } catch (parseError) {
            console.error(`Failed to parse patient transient data: ${parseError.message}`);
            throw new Error(`Failed to parse patient transient data: ${parseError.message}`);
        }

        const { patientId, name, dob, metaJson } = patientInput;
        // Ensure required fields were in the parsed data
        if (!patientId || !name || !dob ) {
             console.error('Parsed patient transient data missing required fields (patientId, name, dob)');
             throw new Error('Parsed patient transient data missing required fields (patientId, name, dob)');
        }
        console.info(`Processing patient creation for ID: ${patientId}`);

        // === Check if patient exists (publicly) ===
        const publicData = await ctx.stub.getState(patientId);
        if (publicData && publicData.length > 0) {
            console.error(`Patient ${patientId} already exists`);
            throw new Error(`Patient ${patientId} already exists`);
        }
        console.info(`Patient ${patientId} does not exist, proceeding.`);

        // === Store Private Data ===
        const privateDetails = {
            patientId: patientId,
            name: name,
            dob: dob,
            meta: JSON.parse(metaJson || '{}') // Safely parse metaJson
        };
        console.info(`Putting private data for patient ${patientId}`);
        await ctx.stub.putPrivateData('patientPrivateDetails', patientId, Buffer.from(JSON.stringify(privateDetails)));
        console.info(`Private data stored successfully.`);

        // === Store Public Data ===
        const publicPatient = {
            docType: 'patient',
            patientId: patientId,
            records: [] // Initialize with empty records array
        };
        console.info(`Putting public state for patient ${patientId}`);
        await ctx.stub.putState(patientId, Buffer.from(JSON.stringify(publicPatient)));
        console.info(`Public state stored successfully.`);

        // === Create Audit Log ===
        await this._createAuditRecord(ctx, 'CreatePatient', patientId, { success: true });

        // === Emit event ===
        console.info(`Setting event 'PatientCreated' for ${patientId}`);
        await ctx.stub.setEvent('PatientCreated', Buffer.from(patientId));

        console.info('============= END : CreatePatient ===========');
        // Return public data + txId
        return JSON.stringify({ patient: publicPatient, txId: ctx.stub.getTxID() });
    }

    /**
     * Gets public patient data.
     */
    async GetPatient(ctx, patientId) {
        console.info(`============= START : GetPatient ${patientId} ===========`);
        const data = await ctx.stub.getState(patientId);
        if (!data || data.length === 0) {
            console.error(`Patient ${patientId} not found`);
            throw new Error(`Patient ${patientId} not found`);
        }
        console.info(`============= END : GetPatient ${patientId} ===========`);
        return data.toString();
    }

    /**
     * Gets private patient details.
     */
    async GetPatientPrivateDetails(ctx, patientId) {
        console.info(`============= START : GetPatientPrivateDetails ${patientId} ===========`);
        const data = await ctx.stub.getPrivateData('patientPrivateDetails', patientId);
        if (!data || data.length === 0) {
            console.error(`Private details for ${patientId} not found`);
            throw new Error(`Private details for ${patientId} not found`);
        }
        console.info(`============= END : GetPatientPrivateDetails ${patientId} ===========`);
        return data.toString();
    }

    /**
     * Adds a record hash to a patient's public file.
     */
    async AddRecordHash(ctx, patientId, recordId, hash, createdAt) {
        console.info(`============= START : AddRecordHash ${patientId}, ${recordId} ===========`);
        const publicData = await this.GetPatient(ctx, patientId); // Reuses GetPatient, includes check
        const patient = JSON.parse(publicData);

        // Check if recordId already exists (optional, depends on requirements)
        // const existingRecord = patient.records.find(r => r.recordId === recordId);
        // if (existingRecord) {
        //     throw new Error(`Record ${recordId} already exists for patient ${patientId}`);
        // }

        const rec = { recordId, hash, createdAt };
        patient.records.push(rec);

        console.info(`Putting updated public state for patient ${patientId}`);
        await ctx.stub.putState(patientId, Buffer.from(JSON.stringify(patient)));
        console.info(`Public state updated successfully.`);

        // Create Audit Log using the correct deterministic timestamp
        await this._createAuditRecord(ctx, 'AddRecordHash', patientId, { recordId: recordId });

        console.info(`Setting event 'RecordAdded' for patient ${patientId}, record ${recordId}`);
        await ctx.stub.setEvent('RecordAdded', Buffer.from(JSON.stringify({ patientId, recordId })));

        console.info(`============= END : AddRecordHash ${patientId}, ${recordId} ===========`);
        return JSON.stringify({ record: rec, txId: ctx.stub.getTxID() });
    }

    // =================================================================================
    // Consent Functions
    // =================================================================================

    /**
     * Creates a new consent record.
     */
    async CreateConsent(ctx, consentId, patientId, granteeId, scope, purpose, validUntil) {
        console.info(`============= START : CreateConsent ${consentId} ===========`);
        const exists = await ctx.stub.getState(consentId);
        if (exists && exists.length > 0) {
            console.error(`Consent ${consentId} already exists`);
            throw new Error(`Consent ${consentId} already exists`);
        }
        console.info(`Consent ${consentId} does not exist, proceeding.`);

        const timestamp = ctx.stub.getTxTimestamp();
        const tsDate = new Date(timestamp.seconds * 1000 + timestamp.nanos / 1000000);

        // Model based on schema [cite: 55]
        const consent = {
            docType: 'consent',
            consentId: consentId,
            patientId: patientId,
            granteeId: granteeId,
            scope: scope,         // e.g., "read_records", "read_private_details"
            purpose: purpose,       // e.g., "Annual Checkup"
            validFrom: tsDate.toISOString(), // Use deterministic timestamp
            validUntil: validUntil,   // ISO 8601 string
            status: 'active',     // 'active', 'revoked', 'expired'
        };

        console.info(`Putting state for consent ${consentId}`);
        await ctx.stub.putState(consentId, Buffer.from(JSON.stringify(consent)));
        console.info(`Consent ${consentId} stored successfully.`);

        // Create Audit Log
        await this._createAuditRecord(ctx, 'CreateConsent', consentId, { patientId: patientId, granteeId: granteeId });

        console.info(`============= END : CreateConsent ${consentId} ===========`);
        return JSON.stringify({ consent: consent, txId: ctx.stub.getTxID() });
    }

    /**
     * Revokes a consent record.
     */
    async RevokeConsent(ctx, consentId) {
        console.info(`============= START : RevokeConsent ${consentId} ===========`);
        const data = await ctx.stub.getState(consentId);
        if (!data || data.length === 0) {
            console.error(`Consent ${consentId} not found`);
            throw new Error(`Consent ${consentId} not found`);
        }
        console.info(`Consent ${consentId} found.`);

        const consent = JSON.parse(data.toString());

        // Basic authorization check - placeholder for real attribute check
        // const actorId = ctx.clientIdentity.getID();
        // console.info(`Attempting revoke by ${actorId} for patient ${consent.patientId}`);
        // if (actorId !== consent.patientId) { // Placeholder logic
        //     throw new Error(`Invoker ${actorId} is not authorized to revoke consent for patient ${consent.patientId}`);
        // }

        if (consent.status === 'revoked') {
            console.warn(`Consent ${consentId} is already revoked`);
            throw new Error(`Consent ${consentId} is already revoked`);
        }

        consent.status = 'revoked';
        const timestamp = ctx.stub.getTxTimestamp();
        consent.revokedAt = new Date(timestamp.seconds * 1000 + timestamp.nanos / 1000000).toISOString(); // Deterministic timestamp
        console.info(`Consent ${consentId} status set to revoked.`);

        console.info(`Putting updated state for consent ${consentId}`);
        await ctx.stub.putState(consentId, Buffer.from(JSON.stringify(consent)));
        console.info(`Consent ${consentId} updated successfully.`);

        // Create Audit Log
        await this._createAuditRecord(ctx, 'RevokeConsent', consentId, { patientId: consent.patientId });

        console.info(`============= END : RevokeConsent ${consentId} ===========`);
        return JSON.stringify({ consent: consent, txId: ctx.stub.getTxID() });
    }

    /**
     * Gets a single consent record by its ID.
     */
    async GetConsent(ctx, consentId) {
        console.info(`============= START : GetConsent ${consentId} ===========`);
        const data = await ctx.stub.getState(consentId);
        if (!data || data.length === 0) {
            console.error(`Consent ${consentId} not found`);
            throw new Error(`Consent ${consentId} not found`);
        }
        console.info(`============= END : GetConsent ${consentId} ===========`);
        return data.toString();
    }

    /**
     * Gets all consents for a specific patient using a rich query.
     * REQUIRES COUCHDB
     */
    async GetConsentsByPatient(ctx, patientId) {
        console.info(`============= START : GetConsentsByPatient ${patientId} ===========`);
        const queryString = {
            selector: {
                docType: 'consent',
                patientId: patientId,
            }
        };
        console.info(`Querying consents with selector: ${JSON.stringify(queryString)}`);

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = [];
        let res = await iterator.next();
        while (!res.done) {
            if (res.value && res.value.value.toString()) {
                try {
                    results.push(JSON.parse(res.value.value.toString()));
                } catch (err) {
                    console.error(`Error parsing consent query result: ${err}`);
                    // Decide whether to skip or throw
                }
            }
            res = await iterator.next();
        }
        await iterator.close();
        console.info(`Found ${results.length} consents for patient ${patientId}`);
        console.info(`============= END : GetConsentsByPatient ${patientId} ===========`);
        return JSON.stringify(results);
    }

    // =================================================================================
    // Audit Functions
    // =================================================================================

    /**
     * Gets an audit record by its ID (which is the transaction ID).
     */
    async GetAuditRecord(ctx, auditId) {
        console.info(`============= START : GetAuditRecord ${auditId} ===========`);
        const auditKey = `audit_${auditId}`;
        const data = await ctx.stub.getState(auditKey);
        if (!data || data.length === 0) {
            console.error(`Audit record ${auditId} (key: ${auditKey}) not found`);
            throw new Error(`Audit record ${auditId} not found`);
        }
        console.info(`============= END : GetAuditRecord ${auditId} ===========`);
        return data.toString();
    }
}

module.exports.contracts = [HealthLinkContract]; // Export the contract class correctly
