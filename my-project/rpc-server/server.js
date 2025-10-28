import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { FabricClient } from './fabric-client.js';

// --- Server Setup ---
const app = express();
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON bodies

const PORT = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Fabric Client Setup ---
// These paths assume your server.js is in backend/rpc-server/
// and connection-org1.json and wallet/ are in the same directory.
const ccpPath = path.resolve(__dirname, 'connection-org1.json');
const walletPath = path.resolve(__dirname, 'wallet');
const userId = 'admin'; // Using the admin identity
const channelName = 'mychannel';
const chaincodeName = 'healthlink';

const fabricClient = new FabricClient(ccpPath, walletPath, userId, channelName);

// --- Helper Function for API Responses ---
const handleQuery = async (res, fn, ...args) => {
    try {
        const result = await fabricClient.evaluate(chaincodeName, fn, args);
        res.status(200).json(JSON.parse(result));
    } catch (error) {
        console.error(`Failed to evaluate ${fn}:`, error);
        // Distinguish between chaincode 'not found' errors and connection errors
        if (error.message && (error.message.includes('not found') || error.message.includes('does not exist'))) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

const handleSubmit = async (res, fn, ...args) => {
    try {
        // The fabricClient.submit now returns the chaincode response (which is a stringified JSON)
        const chaincodeResponseString = await fabricClient.submit(chaincodeName, fn, args);
        // The chaincode response itself contains { payload: ..., txId: ... }
        const result = JSON.parse(chaincodeResponseString);
        res.status(201).json(result); // Use 201 Created for successful writes
    } catch (error) {
        console.error(`Failed to submit ${fn}:`, error);
        res.status(500).json({ error: error.message });
    }
};

// --- API Endpoints ---

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

// Simple Ping test [NEW]
app.get('/api/ping', (req, res) => {
    console.log('Received GET /api/ping request');
    // Use handleQuery, Ping takes no args
    handleQuery(res, 'Ping');
});


// ================== Patient Endpoints ==================

// Get public patient data
app.get('/api/patient/:id', (req, res) => {
    handleQuery(res, 'GetPatient', req.params.id);
});

// Get private patient data
app.get('/api/patient-private/:id', (req, res) => {
    handleQuery(res, 'GetPatientPrivateDetails', req.params.id);
});

// Create a new patient
app.post('/api/patient', async (req, res) => {
    try {
        const patientPrivateData = req.body;
        if (!patientPrivateData.patientId) {
            return res.status(400).json({ error: 'patientId is required' });
        }

        const transientData = { patient: patientPrivateData };
        // Use submitPrivate from your FabricClient
        const chaincodeResponseString = await fabricClient.submitPrivate(chaincodeName, 'CreatePatient', transientData);
        // Chaincode response contains { patient: publicPatient, txId: ... }
        const result = JSON.parse(chaincodeResponseString);
        res.status(201).json(result);

    } catch (error) {
        console.error('Failed to create patient:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================== Consent Endpoints ==================

/**
 * Create a new consent record
 * Body: { "consentId", "patientId", "granteeId", "scope", "purpose", "validUntil" }
 */
app.post('/api/consents', (req, res) => {
    const { consentId, patientId, granteeId, scope, purpose, validUntil } = req.body;
    if (!consentId || !patientId || !granteeId || !scope || !purpose || !validUntil) {
        return res.status(400).json({ error: 'Missing required fields for consent' });
    }
    // Note: handleSubmit expects args as separate params, not an array
    handleSubmit(res, 'CreateConsent', consentId, patientId, granteeId, scope, purpose, validUntil);
});

/**
 * Get a specific consent by its ID
 */
app.get('/api/consents/:id', (req, res) => {
    handleQuery(res, 'GetConsent', req.params.id);
});

/**
 * Get all consents for a specific patient
 */
app.get('/api/patient/:id/consents', (req, res) => {
    handleQuery(res, 'GetConsentsByPatient', req.params.id);
});

/**
 * Revoke a consent
 */
app.patch('/api/consents/:id/revoke', (req, res) => {
    handleSubmit(res, 'RevokeConsent', req.params.id);
});

// ================== Audit Endpoints ==================

/**
 * Get an audit record by its transaction ID
 */
app.get('/api/audit/:txid', (req, res) => {
    handleQuery(res, 'GetAuditRecord', req.params.txid);
});


// --- Start Server ---
async function startServer() {
    try {
        console.log('Initializing Fabric client...');
        await fabricClient.init(); // Connect to the gateway ONCE
        console.log('Fabric client initialized.');

        app.listen(PORT, () => {
            console.log(`HealthLink Pro API server listening on http://localhost:${PORT}`);
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
          console.log('Shutting down server...');
          if (fabricClient) {
            fabricClient.disconnect();
          }
          process.exit(0);
        });

    } catch (error) {
        console.error('Failed to start server or init Fabric client:', error);
        process.exit(1);
    }
}

startServer();
