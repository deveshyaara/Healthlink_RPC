'use strict';

const { Contract } = require('fabric-contract-api');

/**
 * BaseHealthContract - Shared functionality for all HealthLink contracts
 * Provides common methods for querying, auditing, and access control
 */
class BaseHealthContract extends Contract {

    /**
     * Initialize contract
     */
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    /**
     * Check if an asset exists
     */
    async assetExists(ctx, assetId) {
        const assetBytes = await ctx.stub.getState(assetId);
        return assetBytes && assetBytes.length > 0;
    }

    /**
     * Get asset by ID with error handling
     */
    async getAsset(ctx, assetId) {
        const assetBytes = await ctx.stub.getState(assetId);
        if (!assetBytes || assetBytes.length === 0) {
            throw new Error(`Asset ${assetId} does not exist`);
        }
        return JSON.parse(assetBytes.toString());
    }

    /**
     * Execute rich query with CouchDB
     */
    async executeQuery(ctx, queryString) {
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = [];
        let result = await iterator.next();
        
        while (!result.done) {
            const record = {
                Key: result.value.key,
                Record: JSON.parse(result.value.value.toString('utf8'))
            };
            results.push(record);
            result = await iterator.next();
        }
        
        await iterator.close();
        return results;
    }

    /**
     * Get query results as array
     */
    async getQueryResults(ctx, queryString) {
        const results = await this.executeQuery(ctx, queryString);
        return JSON.stringify(results);
    }

    /**
     * Create audit record for all transactions
     */
    async createAuditRecord(ctx, action, targetId, targetType, details) {
        const txId = ctx.stub.getTxID();
        const timestamp = ctx.stub.getTxTimestamp();
        const clientId = ctx.clientIdentity.getID();
        const mspId = ctx.clientIdentity.getMSPID();

        const auditRecord = {
            docType: 'audit',
            auditId: `audit_${txId}`,
            txId: txId,
            action: action,
            targetId: targetId,
            targetType: targetType,
            actorId: clientId,
            mspId: mspId,
            timestamp: new Date(timestamp.seconds * 1000).toISOString(),
            details: details || {}
        };

        await ctx.stub.putState(auditRecord.auditId, Buffer.from(JSON.stringify(auditRecord)));
        return auditRecord;
    }

    /**
     * Get audit records for a specific target
     */
    async getAuditRecordsForTarget(ctx, targetId) {
        const queryString = {
            selector: {
                docType: 'audit',
                targetId: targetId
            },
            sort: [{ timestamp: 'desc' }]
        };

        return await this.getQueryResults(ctx, queryString);
    }

    /**
     * Emit event
     */
    emitEvent(ctx, eventName, payload) {
        ctx.stub.setEvent(eventName, Buffer.from(JSON.stringify(payload)));
    }

    /**
     * Get current timestamp
     */
    getCurrentTimestamp(ctx) {
        const timestamp = ctx.stub.getTxTimestamp();
        return new Date(timestamp.seconds * 1000).toISOString();
    }

    /**
     * Get caller identity
     */
    getCallerId(ctx) {
        return ctx.clientIdentity.getID();
    }

    /**
     * Get caller MSP ID
     */
    getCallerMSP(ctx) {
        return ctx.clientIdentity.getMSPID();
    }

    /**
     * Check if caller has specific attribute
     */
    hasAttribute(ctx, attributeName) {
        return ctx.clientIdentity.assertAttributeValue(attributeName, 'true');
    }

    /**
     * Get attribute value
     */
    getAttributeValue(ctx, attributeName) {
        return ctx.clientIdentity.getAttributeValue(attributeName);
    }

    /**
     * Validate required fields
     * Can be called as:
     * - validateRequiredFields({field1, field2}) - validates all keys in object
     * - validateRequiredFields(data, ['field1', 'field2']) - validates specific fields
     */
    validateRequiredFields(fields, fieldNames) {
        // If no field names provided, validate all keys in the fields object
        const fieldsToValidate = fieldNames || Object.keys(fields);
        
        for (const fieldName of fieldsToValidate) {
            if (!fields[fieldName]) {
                throw new Error(`${fieldName} is required`);
            }
        }
    }

    /**
     * Get asset history
     */
    async getAssetHistory(ctx, assetId) {
        const iterator = await ctx.stub.getHistoryForKey(assetId);
        const history = [];
        let result = await iterator.next();

        while (!result.done) {
            const record = {
                txId: result.value.txId,
                timestamp: new Date(result.value.timestamp.seconds * 1000).toISOString(),
                isDelete: result.value.isDelete,
                value: result.value.isDelete ? null : JSON.parse(result.value.value.toString('utf8'))
            };
            history.push(record);
            result = await iterator.next();
        }

        await iterator.close();
        return JSON.stringify(history);
    }

    /**
     * Pagination support
     */
    async getQueryResultsWithPagination(ctx, queryString, pageSize, bookmark) {
        const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(
            JSON.stringify(queryString),
            pageSize,
            bookmark
        );

        const results = [];
        let result = await iterator.next();

        while (!result.done) {
            results.push({
                Key: result.value.key,
                Record: JSON.parse(result.value.value.toString('utf8'))
            });
            result = await iterator.next();
        }

        await iterator.close();

        return JSON.stringify({
            results: results,
            metadata: {
                recordsCount: metadata.fetchedRecordsCount,
                bookmark: metadata.bookmark
            }
        });
    }
}

module.exports = { BaseHealthContract };
