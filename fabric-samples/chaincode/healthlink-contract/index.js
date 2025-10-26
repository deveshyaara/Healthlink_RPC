'use strict';

const { Contract } = require('fabric-contract-api');

class HealthLinkContract extends Contract {

  async InitLedger(ctx) {
    console.info('Ledger initialized');
  }

  /* ==================
     PATIENT FUNCTIONS
     ================== */

  async CreatePatient(ctx) {
    // === Get Transient Data ===
    // Sensitive data (name, dob, meta) is passed in the transient map
    const transientMap = ctx.stub.getTransient();
    const transientData = transientMap.get('patient');
    
    if (transientData.length === 0) {
      throw new Error('Patient transient data not found in transaction');
    }
    
    const { patientId, name, dob, metaJson } = JSON.parse(transientData.toString());

    // === Check if patient exists (publicly) ===
    const publicData = await ctx.stub.getState(patientId);
    if (publicData && publicData.length > 0) {
      throw new Error(`Patient ${patientId} already exists`);
    }

    // === Store Private Data ===
    // This data only goes to peers in the collection
    const privateDetails = { patientId, name, dob, meta: JSON.parse(metaJson || '{}') };
    await ctx.stub.putPrivateData('patientPrivateDetails', patientId, Buffer.from(JSON.stringify(privateDetails)));

    // === Store Public Data ===
    // The public ledger only stores the ID and the record list
    const publicPatient = { patientId, records: [] };
    await ctx.stub.putState(patientId, Buffer.from(JSON.stringify(publicPatient)));

    // Emit event
    await ctx.stub.setEvent('PatientCreated', Buffer.from(patientId));
    
    return JSON.stringify(publicPatient);
  }

  async GetPatient(ctx, patientId) {
    // This function only gets the PUBLIC data
    const data = await ctx.stub.getState(patientId);
    if (!data || data.length === 0) {
      throw new Error(`Patient ${patientId} not found`);
    }
    return data.toString();
  }

  async GetPatientPrivateDetails(ctx, patientId) {
    // This function gets the PRIVATE data
    const data = await ctx.stub.getPrivateData('patientPrivateDetails', patientId);
    if (!data || data.length === 0) {
      throw new Error(`Private details for ${patientId} not found`);
    }
    return data.toString();
  }

  /* ==================
     RECORD FUNCTIONS
     ================== */
     
  async AddRecordHash(ctx, patientId, recordId, hash, createdAt) {
    // Get the PUBLIC patient data
    const publicData = await this.GetPatient(ctx, patientId);
    const patient = JSON.parse(publicData);
    
    const rec = { recordId, hash, createdAt };
    patient.records.push(rec);
    
    // Update the PUBLIC patient data
    await ctx.stub.putState(patientId, Buffer.from(JSON.stringify(patient)));
    
    // === Audit (as before) ===
    const timestamp = ctx.stub.getTxTimestamp();
    const tsDate = new Date(timestamp.seconds * 1000 + timestamp.nanos / 1000000);

    const audit = { auditId: ctx.stub.getTxID(), action: 'AddRecord', actor: ctx.clientIdentity.getID(), target: patientId, timestamp: tsDate.toISOString() };
    await ctx.stub.putState(`audit_${audit.auditId}`, Buffer.from(JSON.stringify(audit)));
    await ctx.stub.setEvent('RecordAdded', Buffer.from(JSON.stringify({ patientId, recordId })));
    
    return JSON.stringify(rec);
  }

  /* ==================
     CONSENT/AUDIT FUNCTIONS (Unchanged)
     ================== */

  async CreateConsent(ctx, consentId, patientId, granteeId, scope, createdAt) {
    const c = { consentId, patientId, granteeId, scope, status: 'active', createdAt };
    await ctx.stub.putState(consentId, Buffer.from(JSON.stringify(c)));
    return JSON.stringify(c);
  }

  async RevokeConsent(ctx, consentId, revokedAt) {
    const data = await ctx.stub.getState(consentId);
    if (!data || data.length === 0) throw new Error('Consent not found');
    const consent = JSON.parse(data.toString());
    consent.status = 'revoked';
    consent.revokedAt = revokedAt;
    await ctx.stub.putState(consentId, Buffer.from(JSON.stringify(consent)));
    return JSON.stringify(consent);
  }

  async QueryByPatient(ctx, patientId) {
    // This is now the same as GetPatient
    return this.GetPatient(ctx, patientId);
  }

  async QueryAudit(ctx, auditId) {
    const data = await ctx.stub.getState(`audit_${auditId}`);
    if (!data || data.length === 0) throw new Error('Audit not found');
    return data.toString();
  }
}

module.exports = HealthLinkContract;
module.exports.contracts = [ HealthLinkContract ];
