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

// A self-invoking function to initialize the client on startup
(async () => {
    try {
        await fabricClient.init();
        console.log('Fabric client initialized successfully.');
    } catch (error) {
        console.error('Failed to initialize Fabric client:', error);
        process.exit(1);
    }
})();

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
        const { patientId, publicData, privateData } = req.body;
        if (!patientId || !publicData || !privateData) {
            return res.status(400).json({ error: 'patientId, publicData, and privateData are required.' });
        }

        const transientData = {
            patient_details: Buffer.from(JSON.stringify(privateData))
        };

        const resultString = await fabricClient.submitPrivate(
            'CreatePatient',
            [patientId, JSON.stringify(publicData)],
            transientData
        );
        
        const result = JSON.parse(resultString); // Parse the JSON response from chaincode
        res.status(201).json({ message: 'Patient created successfully', ...result });

    } catch (error) {
        console.error('Error creating patient:', error);
        res.status(500).json({ error: 'Failed to create patient', details: error.message });
    }
});

// ================== Consent Endpoints ==================

/**
 * Create a new consent record
 * Body: { "consentId", "patientId", "granteeId", "scope", "purpose", "validUntil" }
 */
app.post('/api/consents', async (req, res) => {
    try {
        const { consentId, patientId, granteeId, scope, purpose, validUntil } = req.body;
        if (!consentId || !patientId || !granteeId || !scope || !purpose || !validUntil) {
            return res.status(400).json({ error: 'consentId, patientId, granteeId, scope, purpose, and validUntil are required.' });
        }

        // CORRECTED: Arguments are now passed individually, not in an array.
        const resultString = await fabricClient.submit(
            'healthlink-contract',
            'CreateConsent',
            consentId, 
            patientId, 
            granteeId, 
            scope, 
            purpose, 
            validUntil
        );

        const result = JSON.parse(resultString);
        res.status(201).json({ message: 'Consent created successfully', ...result });

    } catch (error) {
        console.error('Error creating consent:', error);
        res.status(500).json({ error: 'Failed to create consent', details: error.message });
    }
});

/**
 * Get a specific consent by its ID
 */
app.get('/api/consents/:id', async (req, res) => {
    try {
        const consentId = req.params.id;

        // CORRECTED: The 'consentId' argument is passed directly.
        const resultString = await fabricClient.evaluate(
            'healthlink-contract', 
            'GetConsent', 
            consentId
        );
        res.status(200).json(JSON.parse(resultString));
    } catch (error) {
        console.error(`Error getting consent ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to get consent', details: error.message });
    }
});

/**
 * Get all consents for a specific patient
 */
app.get('/api/patient/:id/consents', async (req, res) => {
    try {
        const patientId = req.params.id;

        // CORRECT: Pass function name, then arguments array
        const resultString = await fabricClient.evaluate('healthlink-contract', 'GetConsentsByPatient', [patientId]);
        
        res.status(200).json(JSON.parse(resultString));
    } catch (error) {
        console.error(`Error getting consents for patient ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to get consents', details: error.message });
    }
});

/**
 * Revoke a consent
 */
app.patch('/api/consents/:id/revoke', async (req, res) => {
    try {
        const consentId = req.params.id;

        // CORRECT: Pass function name, then arguments array
        const resultString = await fabricClient.submit('healthlink-contract', 'RevokeConsent', [consentId]);
        
        const result = JSON.parse(resultString);
        res.status(200).json({ message: 'Consent revoked successfully', ...result });
    } catch (error) {
        console.error(`Error revoking consent ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to revoke consent', details: error.message });
    }
});

// Get audit record for a transaction
app.get('/api/audit/:txId', async (req, res) => {
    try {
        const txId = req.params.txId;

        const resultString = await fabricClient.evaluate('healthlink-contract', 'GetAuditRecord', [txId]);
        
        const result = JSON.parse(resultString);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error getting audit record for ${req.params.txId}:`, error);
        res.status(500).json({ error: 'Failed to get audit record', details: error.message });
    }
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
