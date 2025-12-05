/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

const { Contract } = require('fabric-contract-api');

class HealthlinkContract extends Contract {

    // Helper function to create and log an audit record for a transaction.
    async _createAuditRecord(ctx, action, targetId, details) {
        const txId = ctx.stub.getTxID();
        const actorId = ctx.clientIdentity.getID();
        const timestamp = new Date(ctx.stub.getTxTimestamp().seconds * 1000).toISOString();

        const auditRecord = {
            docType: 'audit',
            auditId: txId,
            actorId: actorId,
            action: action,
            targetId: targetId,
            timestamp: timestamp,
            details: details,
        };

        // Use a key that incorporates the transaction ID for easy lookup
        const auditKey = `audit_${txId}`;
        await ctx.stub.putState(auditKey, Buffer.from(JSON.stringify(auditRecord)));
    }

    // CreatePatient stores sensitive patient details in a private data collection.
    async CreatePatient(ctx, patientId, patientDetails) {
        const privateData = JSON.parse(patientDetails);
        const transientMap = ctx.stub.getTransient();
        if (!transientMap || !transientMap.get('patient_details')) {
            throw new Error('Patient details must be provided in transient data.');
        }

        const transientPatientDetails = transientMap.get('patient_details').toBuffer().toString('utf8');
        
        await ctx.stub.putPrivateData('patientPrivateDetails', patientId, Buffer.from(transientPatientDetails));

        const patientRecord = {
            docType: 'patient',
            patientId: patientId,
            ...privateData, // Publicly visible data
        };
        await ctx.stub.putState(patientId, Buffer.from(JSON.stringify(patientRecord)));

        // Create audit log
        await this._createAuditRecord(ctx, 'CreatePatient', patientId, { publicData: patientRecord });

        return JSON.stringify({ patient: patientRecord, txId: ctx.stub.getTxID() });
    }

    // AddRecordHash adds a new health record hash to the ledger for a given patient.
    async AddRecordHash(ctx, patientId, recordId, recordHash) {
        const patientAsBytes = await ctx.stub.getState(patientId);
        if (!patientAsBytes || patientAsBytes.length === 0) {
            throw new Error(`Patient with ID ${patientId} does not exist.`);
        }
        const patient = JSON.parse(patientAsBytes.toString());

        if (!patient.recordHashes) {
            patient.recordHashes = {};
        }
        patient.recordHashes[recordId] = recordHash;

        await ctx.stub.putState(patientId, Buffer.from(JSON.stringify(patient)));

        // Create audit log
        await this._createAuditRecord(ctx, 'AddRecordHash', patientId, { recordId, recordHash });

        return JSON.stringify({ patient: patient, txId: ctx.stub.getTxID() });
    }

    // --- Consent Management Functions ---

    // CreateConsent records a new consent grant on the ledger.
    async CreateConsent(ctx, consentId, patientId, granteeId, scope, purpose, validUntil) {
        const consent = {
            docType: 'consent',
            consentId: consentId,
            patientId: patientId,
            granteeId: granteeId,
            scope: scope,
            purpose: purpose,
            validUntil: validUntil,
            status: 'active',
            created: new Date(ctx.stub.getTxTimestamp().seconds * 1000).toISOString(),
        };

        await ctx.stub.putState(consentId, Buffer.from(JSON.stringify(consent)));

        // Create audit log
        await this._createAuditRecord(ctx, 'CreateConsent', consentId, { patientId, granteeId });

        return JSON.stringify({ consent: consent, txId: ctx.stub.getTxID() });
    }

    // RevokeConsent changes the status of an existing consent to 'revoked'.
    async RevokeConsent(ctx, consentId) {
        const consentAsBytes = await ctx.stub.getState(consentId);
        if (!consentAsBytes || consentAsBytes.length === 0) {
            throw new Error(`Consent with ID ${consentId} does not exist.`);
        }
        const consent = JSON.parse(consentAsBytes.toString());

        if (consent.docType !== 'consent') {
             throw new Error(`Asset ${consentId} is not a consent record.`);
        }

        consent.status = 'revoked';
        consent.revoked = new Date(ctx.stub.getTxTimestamp().seconds * 1000).toISOString();

        await ctx.stub.putState(consentId, Buffer.from(JSON.stringify(consent)));

        // Create audit log
        await this._createAuditRecord(ctx, 'RevokeConsent', consentId, {});

        return JSON.stringify({ consent: consent, txId: ctx.stub.getTxID() });
    }

    // GetConsent retrieves a single consent record by its ID.
    async GetConsent(ctx, consentId) {
        const consentAsBytes = await ctx.stub.getState(consentId);
        if (!consentAsBytes || consentAsBytes.length === 0) {
            throw new Error(`Consent ${consentId} does not exist`);
        }
        return consentAsBytes.toString();
    }

    // GetConsentsByPatient retrieves all consents for a specific patient using a Mango query.
    async GetConsentsByPatient(ctx, patientId) {
        const queryString = {
            selector: {
                docType: 'consent',
                patientId: patientId,
            },
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const allResults = [];
        let result = await iterator.next();
        while (!result.done) {
            const res = result.value;
            const jsonRes = {};
            jsonRes.Key = res.key;
            try {
                jsonRes.Record = JSON.parse(res.value.toString('utf8'));
            } catch (err) {
                console.log(err);
                jsonRes.Record = res.value.toString('utf8');
            }
            allResults.push(jsonRes);
            result = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(allResults);
    }

    // --- Audit Query Function ---

    // GetAuditRecord retrieves a single audit log by its transaction ID.
    async GetAuditRecord(ctx, auditId) {
        const auditKey = `audit_${auditId}`;
        const auditAsBytes = await ctx.stub.getState(auditKey);
        if (!auditAsBytes || auditAsBytes.length === 0) {
            throw new Error(`Audit record with ID ${auditId} does not exist`);
        }
        // CORRECTED: The record is already a string, no need to parse.
        return auditAsBytes.toString();
    }
}

module.exports.contracts = [HealthlinkContract];
