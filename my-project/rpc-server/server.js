import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FabricClient } from './fabric-client.js';

// --- Server Setup ---
const app = express();

// Determine allowed origins based on environment
let allowedOrigins = ['http://localhost:3000', 'http://localhost:9002'];

// GitHub Codespace environment detection
if (process.env.CODESPACE_NAME) {
    // In Codespace: add the codespace domain
    const codespaceName = process.env.CODESPACE_NAME;
    const codespaceRegion = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'github.dev';
    allowedOrigins.push(`https://${codespaceName}-9002.${codespaceRegion}`);
    allowedOrigins.push(`https://${codespaceName}-4000.${codespaceRegion}`);
}

// Add any FRONTEND_ORIGIN from environment
if (process.env.FRONTEND_ORIGIN) {
    allowedOrigins.push(process.env.FRONTEND_ORIGIN);
}

console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

// Allow cross-origin requests from the frontend (adjust origins as needed)
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Log unallowed origins for debugging
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('CORS not allowed'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.use(express.json()); // Parse JSON bodies

const PORT = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- In-Memory User Store (Session Storage) ---
// In production, use a proper database
const userStore = new Map(); // Map to store users by email
const tokenStore = new Map(); // Map to store valid tokens

/**
 * Helper function to generate a token
 */
function generateToken(userId, email, role) {
    const payload = {
        userId: userId,
        email: email,
        role: role,
        iat: Date.now(),
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hour expiration
    };
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    tokenStore.set(token, payload);
    return token;
}

/**
 * Helper function to verify token
 */
function verifyToken(token) {
    try {
        const payload = tokenStore.get(token);
        if (!payload) {
            return null;
        }
        
        // Check expiration
        if (payload.exp < Date.now()) {
            tokenStore.delete(token);
            return null;
        }
        
        return payload;
    } catch (error) {
        return null;
    }
}

/**
 * Middleware to verify Bearer token
 */
function verifyBearerToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring('Bearer '.length);
    const payload = verifyToken(token);
    
    if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = payload;
    next();
}

// --- Fabric Client Setup ---
const ccpPath = path.resolve(__dirname, 'connection-org1.json');
const walletPath = path.resolve(__dirname, 'wallet');
const userId = 'admin';
const channelName = 'mychannel';

// Contract names
const CONTRACTS = {
    HEALTHLINK: 'healthlink',
    PATIENT_RECORDS: 'patient-records',
    DOCTOR_CREDENTIALS: 'doctor-credentials',
    APPOINTMENT: 'appointment',
    PRESCRIPTION: 'prescription'
};

const fabricClient = new FabricClient(ccpPath, walletPath, userId, channelName);

// Fabric client initialization flag
let fabricInitialized = false;
let fabricError = null;

// Non-blocking Fabric initialization - allows server to start even if Fabric isn't ready
(async () => {
    try {
        await fabricClient.init();
        fabricInitialized = true;
        console.log('✓ Fabric client initialized successfully.');
    } catch (error) {
        fabricInitialized = false;
        fabricError = error.message;
        console.warn('⚠ Fabric network unavailable. Auth system will run in standalone mode.');
        console.warn('  Error:', error.message);
        console.warn('  To use Hyperledger features, start the Fabric network with: cd fabric-samples/test-network && ./network.sh up');
    }
})();

/**
 * Helper to handle query operations (evaluateTransaction)
 * @param {Object} res - Express response object
 * @param {string} contractName - Name of the contract
 * @param {string} fn - Function name to call
 * @param {Array} args - Arguments to pass to the function
 */
const handleQuery = async (res, contractName, fn, ...args) => {
    if (!fabricInitialized) {
        return res.status(503).json({ 
            error: 'Fabric network unavailable',
            message: 'Hyperledger Fabric is not connected. Auth system is available.',
            details: fabricError
        });
    }
    try {
        const result = await fabricClient.evaluate(contractName, fn, ...args);
        res.status(200).json(JSON.parse(result));
    } catch (error) {
        console.error(`Failed to evaluate ${contractName}.${fn}:`, error);
        if (error.message && (error.message.includes('not found') || error.message.includes('does not exist'))) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

/**
 * Helper to handle submit operations (submitTransaction)
 * @param {Object} res - Express response object
 * @param {string} contractName - Name of the contract
 * @param {string} fn - Function name to call
 * @param {Array} args - Arguments to pass to the function
 */
const handleSubmit = async (res, contractName, fn, ...args) => {
    if (!fabricInitialized) {
        return res.status(503).json({ 
            error: 'Fabric network unavailable',
            message: 'Hyperledger Fabric is not connected. Auth system is available.',
            details: fabricError
        });
    }
    try {
        const chaincodeResponseString = await fabricClient.submit(contractName, fn, ...args);
        const result = JSON.parse(chaincodeResponseString);
        res.status(201).json(result);
    } catch (error) {
        console.error(`Failed to submit ${contractName}.${fn}:`, error);
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
    handleQuery(res, CONTRACTS.HEALTHLINK, 'Ping');
});


// ================== Patient Endpoints ==================

// Get public patient data
app.get('/api/patient/:id', (req, res) => {
    handleQuery(res, CONTRACTS.HEALTHLINK, 'GetPatient', req.params.id);
});

// Get private patient data
app.get('/api/patient-private/:id', (req, res) => {
    handleQuery(res, CONTRACTS.HEALTHLINK, 'GetPatientPrivateDetails', req.params.id);
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

        const resultString = await fabricClient.submit(
            CONTRACTS.HEALTHLINK,
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
        const resultString = await fabricClient.evaluate(CONTRACTS.HEALTHLINK, 'GetConsent', consentId);
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
        const resultString = await fabricClient.evaluate(CONTRACTS.HEALTHLINK, 'GetConsentsByPatient', patientId);
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
        const resultString = await fabricClient.submit(CONTRACTS.HEALTHLINK, 'RevokeConsent', consentId);
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
        const resultString = await fabricClient.evaluate(CONTRACTS.HEALTHLINK, 'GetAuditRecord', txId);
        const result = JSON.parse(resultString);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error getting audit record for ${req.params.txId}:`, error);
        res.status(500).json({ error: 'Failed to get audit record', details: error.message });
    }
});

// ================== Medical Records Endpoints ==================

/**
 * Create a new medical record
 * POST /api/medical-records
 * Body: { recordId, doctorId, recordType, ipfsHash, metadata }
 * Note: patientId extracted from authenticated user
 */
app.post('/api/medical-records', verifyBearerToken, async (req, res) => {
    try {
        const { recordId, doctorId, recordType, ipfsHash, metadata } = req.body;
        const patientId = req.user.email || req.user.userId;
        
        if (!recordId || !doctorId || !recordType || !ipfsHash) {
            return res.status(400).json({ 
                error: 'recordId, doctorId, recordType, and ipfsHash are required.' 
            });
        }

        const metadataString = metadata ? JSON.stringify(metadata) : '{}';
        
        const resultString = await fabricClient.submit(
            CONTRACTS.PATIENT_RECORDS,
            'CreateMedicalRecord',
            recordId,
            patientId,
            doctorId,
            recordType,
            ipfsHash,
            metadataString
        );

        const result = JSON.parse(resultString);
        res.status(201).json(result);

    } catch (error) {
        console.error('Error creating medical record:', error);
        res.status(500).json({ error: 'Failed to create medical record', details: error.message });
    }
});

/**
 * Get paginated medical records
 * GET /api/medical-records/paginated
 * Query: pageSize, bookmark
 * Requires: Authorization header with Bearer token
 */
app.get('/api/medical-records/paginated', verifyBearerToken, async (req, res) => {
    try {
        const { pageSize = '10', bookmark = '' } = req.query;
        const patientId = req.user.email || req.user.userId;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PATIENT_RECORDS,
            'GetRecordsPaginated',
            patientId,
            pageSize,
            bookmark
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error('Error getting paginated records:', error);
        res.status(500).json({ error: 'Failed to get paginated records', details: error.message });
    }
});

/**
 * Get a medical record by ID
 * GET /api/medical-records/:recordId
 * Query: patientId, accessReason
 */
app.get('/api/medical-records/:recordId', async (req, res) => {
    try {
        const { recordId } = req.params;
        const { patientId, accessReason } = req.query;
        
        if (!patientId || !accessReason) {
            return res.status(400).json({ 
                error: 'patientId and accessReason query parameters are required.' 
            });
        }

        const resultString = await fabricClient.evaluate(
            CONTRACTS.PATIENT_RECORDS,
            'GetMedicalRecord',
            recordId,
            patientId,
            accessReason
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting medical record ${req.params.recordId}:`, error);
        res.status(500).json({ error: 'Failed to get medical record', details: error.message });
    }
});

/**
 * Update a medical record
 * PUT /api/medical-records/:recordId
 * Body: { patientId, ipfsHash, metadata }
 */
app.put('/api/medical-records/:recordId', async (req, res) => {
    try {
        const { recordId } = req.params;
        const { patientId, ipfsHash, metadata } = req.body;
        
        if (!patientId || !ipfsHash) {
            return res.status(400).json({ 
                error: 'patientId and ipfsHash are required.' 
            });
        }

        const metadataString = metadata ? JSON.stringify(metadata) : '{}';
        
        const resultString = await fabricClient.submit(
            CONTRACTS.PATIENT_RECORDS,
            'UpdateMedicalRecord',
            recordId,
            patientId,
            ipfsHash,
            metadataString
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error updating medical record ${req.params.recordId}:`, error);
        res.status(500).json({ error: 'Failed to update medical record', details: error.message });
    }
});

/**
 * Get medical records by patient ID
 * GET /api/medical-records/patient/:patientId
 */
app.get('/api/medical-records/patient/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PATIENT_RECORDS,
            'GetRecordsByPatient',
            patientId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting records for patient ${req.params.patientId}:`, error);
        res.status(500).json({ error: 'Failed to get patient records', details: error.message });
    }
});

/**
 * Get medical records by doctor ID
 * GET /api/medical-records/doctor/:doctorId
 */
app.get('/api/medical-records/doctor/:doctorId', async (req, res) => {
    try {
        const { doctorId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PATIENT_RECORDS,
            'GetRecordsByDoctor',
            doctorId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting records for doctor ${req.params.doctorId}:`, error);
        res.status(500).json({ error: 'Failed to get doctor records', details: error.message });
    }
});

/**
 * Search medical records by tags
 * POST /api/medical-records/search
 * Body: { tags: string[] }
 */
app.post('/api/medical-records/search', async (req, res) => {
    try {
        const { tags } = req.body;
        
        if (!tags || !Array.isArray(tags)) {
            return res.status(400).json({ error: 'tags array is required.' });
        }

        const tagsString = JSON.stringify(tags);
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PATIENT_RECORDS,
            'SearchRecordsByTags',
            tagsString
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error('Error searching medical records:', error);
        res.status(500).json({ error: 'Failed to search medical records', details: error.message });
    }
});

/**
 * Archive a medical record
 * DELETE /api/medical-records/:recordId/archive
 * Body: { patientId }
 */
app.delete('/api/medical-records/:recordId/archive', async (req, res) => {
    try {
        const { recordId } = req.params;
        const { patientId } = req.body;
        
        if (!patientId) {
            return res.status(400).json({ error: 'patientId is required.' });
        }

        const resultString = await fabricClient.submit(
            CONTRACTS.PATIENT_RECORDS,
            'ArchiveMedicalRecord',
            recordId,
            patientId
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error archiving medical record ${req.params.recordId}:`, error);
        res.status(500).json({ error: 'Failed to archive medical record', details: error.message });
    }
});

/**
 * Get access log for a medical record
 * GET /api/medical-records/:recordId/access-log
 */
app.get('/api/medical-records/:recordId/access-log', async (req, res) => {
    try {
        const { recordId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PATIENT_RECORDS,
            'GetRecordAccessLog',
            recordId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting access log for ${req.params.recordId}:`, error);
        res.status(500).json({ error: 'Failed to get access log', details: error.message });
    }
});

/**
 * Get history of a medical record
 * GET /api/medical-records/:recordId/history
 */
app.get('/api/medical-records/:recordId/history', async (req, res) => {
    try {
        const { recordId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PATIENT_RECORDS,
            'GetRecordHistory',
            recordId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting history for ${req.params.recordId}:`, error);
        res.status(500).json({ error: 'Failed to get record history', details: error.message });
    }
});

// ================== Doctor Credentials Endpoints ==================

/**
 * Register a new doctor
 * POST /api/doctors
 * Body: { doctorId, name, specialization, licenseNumber, hospital, credentials, contact }
 */
app.post('/api/doctors', async (req, res) => {
    try {
        const { doctorId, name, specialization, licenseNumber, hospital, credentials, contact } = req.body;
        
        if (!doctorId || !name || !specialization || !licenseNumber || !hospital || !credentials || !contact) {
            return res.status(400).json({ 
                error: 'doctorId, name, specialization, licenseNumber, hospital, credentials, and contact are required.' 
            });
        }

        const credentialsString = JSON.stringify(credentials);
        const contactString = JSON.stringify(contact);
        
        const resultString = await fabricClient.submit(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'RegisterDoctor',
            doctorId,
            name,
            specialization,
            licenseNumber,
            hospital,
            credentialsString,
            contactString
        );

        const result = JSON.parse(resultString);
        res.status(201).json(result);

    } catch (error) {
        console.error('Error registering doctor:', error);
        res.status(500).json({ error: 'Failed to register doctor', details: error.message });
    }
});

/**
 * Verify a doctor
 * POST /api/doctors/:doctorId/verify
 * Body: { status, comments }
 */
app.post('/api/doctors/:doctorId/verify', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { status, comments = '' } = req.body;
        
        if (!status || !['verified', 'rejected'].includes(status)) {
            return res.status(400).json({ 
                error: 'status is required and must be either "verified" or "rejected".' 
            });
        }

        const resultString = await fabricClient.submit(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'VerifyDoctor',
            doctorId,
            status,
            comments
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error verifying doctor ${req.params.doctorId}:`, error);
        res.status(500).json({ error: 'Failed to verify doctor', details: error.message });
    }
});

/**
 * Get doctor profile by ID
 * GET /api/doctors/:doctorId
 */
app.get('/api/doctors/:doctorId', async (req, res) => {
    try {
        const { doctorId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'GetDoctor',
            doctorId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting doctor ${req.params.doctorId}:`, error);
        res.status(500).json({ error: 'Failed to get doctor', details: error.message });
    }
});

/**
 * Get doctors by specialization
 * GET /api/doctors/specialization/:specialization
 */
app.get('/api/doctors/specialization/:specialization', async (req, res) => {
    try {
        const { specialization } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'GetDoctorsBySpecialization',
            specialization
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting doctors by specialization ${req.params.specialization}:`, error);
        res.status(500).json({ error: 'Failed to get doctors by specialization', details: error.message });
    }
});

/**
 * Get doctors by hospital
 * GET /api/doctors/hospital/:hospital
 */
app.get('/api/doctors/hospital/:hospital', async (req, res) => {
    try {
        const { hospital } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'GetDoctorsByHospital',
            hospital
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting doctors by hospital ${req.params.hospital}:`, error);
        res.status(500).json({ error: 'Failed to get doctors by hospital', details: error.message });
    }
});

/**
 * Update doctor availability
 * PUT /api/doctors/:doctorId/availability
 * Body: { availability: [] }
 */
app.put('/api/doctors/:doctorId/availability', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { availability } = req.body;
        
        if (!availability || !Array.isArray(availability)) {
            return res.status(400).json({ error: 'availability array is required.' });
        }

        const availabilityString = JSON.stringify(availability);
        
        const resultString = await fabricClient.submit(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'UpdateAvailability',
            doctorId,
            availabilityString
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error updating availability for doctor ${req.params.doctorId}:`, error);
        res.status(500).json({ error: 'Failed to update availability', details: error.message });
    }
});

/**
 * Rate a doctor
 * POST /api/doctors/:doctorId/rate
 * Body: { patientId, rating, review }
 */
app.post('/api/doctors/:doctorId/rate', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { patientId, rating, review = '' } = req.body;
        
        if (!patientId || !rating) {
            return res.status(400).json({ error: 'patientId and rating are required.' });
        }

        const resultString = await fabricClient.submit(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'RateDoctor',
            doctorId,
            patientId,
            rating.toString(),
            review
        );

        const result = JSON.parse(resultString);
        res.status(201).json(result);

    } catch (error) {
        console.error(`Error rating doctor ${req.params.doctorId}:`, error);
        res.status(500).json({ error: 'Failed to rate doctor', details: error.message });
    }
});

/**
 * Get doctor reviews
 * GET /api/doctors/:doctorId/reviews
 */
app.get('/api/doctors/:doctorId/reviews', async (req, res) => {
    try {
        const { doctorId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'GetDoctorReviews',
            doctorId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting reviews for doctor ${req.params.doctorId}:`, error);
        res.status(500).json({ error: 'Failed to get doctor reviews', details: error.message });
    }
});

/**
 * Update doctor profile
 * PUT /api/doctors/:doctorId/profile
 * Body: { updates: {} }
 */
app.put('/api/doctors/:doctorId/profile', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { updates } = req.body;
        
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: 'updates object is required.' });
        }

        const updatesString = JSON.stringify(updates);
        
        const resultString = await fabricClient.submit(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'UpdateDoctorProfile',
            doctorId,
            updatesString
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error updating profile for doctor ${req.params.doctorId}:`, error);
        res.status(500).json({ error: 'Failed to update doctor profile', details: error.message });
    }
});

/**
 * Suspend a doctor
 * POST /api/doctors/:doctorId/suspend
 * Body: { reason }
 */
app.post('/api/doctors/:doctorId/suspend', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({ error: 'reason is required.' });
        }

        const resultString = await fabricClient.submit(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'SuspendDoctor',
            doctorId,
            reason
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error suspending doctor ${req.params.doctorId}:`, error);
        res.status(500).json({ error: 'Failed to suspend doctor', details: error.message });
    }
});

/**
 * Search doctors
 * POST /api/doctors/search
 * Body: { criteria: {} }
 */
app.post('/api/doctors/search', async (req, res) => {
    try {
        const { criteria } = req.body;
        
        if (!criteria || typeof criteria !== 'object') {
            return res.status(400).json({ error: 'criteria object is required.' });
        }

        const criteriaString = JSON.stringify(criteria);
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'SearchDoctors',
            criteriaString
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error('Error searching doctors:', error);
        res.status(500).json({ error: 'Failed to search doctors', details: error.message });
    }
});

// ================== PHASE 2: Appointment Endpoints ==================

/**
 * Schedule a new appointment
 * POST /api/appointments
 * Body: { appointmentId, patientId, doctorId, appointmentDate, startTime, endTime, reason }
 */
app.post('/api/appointments', async (req, res) => {
    try {
        const { appointmentId, patientId, doctorId, appointmentDate, startTime, endTime, reason } = req.body;
        
        if (!appointmentId || !patientId || !doctorId || !appointmentDate || !startTime || !endTime || !reason) {
            return res.status(400).json({ error: 'All fields are required: appointmentId, patientId, doctorId, appointmentDate, startTime, endTime, reason' });
        }

        const reasonString = typeof reason === 'object' ? JSON.stringify(reason) : reason;
        
        const resultString = await fabricClient.submit(
            CONTRACTS.APPOINTMENT,
            'ScheduleAppointment',
            appointmentId,
            patientId,
            doctorId,
            appointmentDate,
            startTime,
            endTime,
            reasonString
        );

        const result = JSON.parse(resultString);
        res.status(201).json(result);

    } catch (error) {
        console.error('Error scheduling appointment:', error);
        res.status(500).json({ error: 'Failed to schedule appointment', details: error.message });
    }
});

/**
 * Get appointment details
 * GET /api/appointments/:appointmentId
 */
app.get('/api/appointments/:appointmentId', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.APPOINTMENT,
            'GetAppointment',
            appointmentId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting appointment ${req.params.appointmentId}:`, error);
        if (error.message && error.message.includes('does not exist')) {
            res.status(404).json({ error: 'Appointment not found', details: error.message });
        } else {
            res.status(500).json({ error: 'Failed to get appointment', details: error.message });
        }
    }
});

/**
 * Confirm an appointment
 * POST /api/appointments/:appointmentId/confirm
 */
app.post('/api/appointments/:appointmentId/confirm', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        
        const resultString = await fabricClient.submit(
            CONTRACTS.APPOINTMENT,
            'ConfirmAppointment',
            appointmentId
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error confirming appointment ${req.params.appointmentId}:`, error);
        res.status(500).json({ error: 'Failed to confirm appointment', details: error.message });
    }
});

/**
 * Complete an appointment
 * POST /api/appointments/:appointmentId/complete
 * Body: { diagnosis, notes, prescriptionIds[], labTestIds[] }
 */
app.post('/api/appointments/:appointmentId/complete', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { diagnosis, notes, prescriptionIds, labTestIds } = req.body;
        
        const completionData = {
            diagnosis: diagnosis || '',
            notes: notes || '',
            prescriptionIds: prescriptionIds || [],
            labTestIds: labTestIds || []
        };
        
        const completionDataString = JSON.stringify(completionData);
        
        const resultString = await fabricClient.submit(
            CONTRACTS.APPOINTMENT,
            'CompleteAppointment',
            appointmentId,
            completionDataString
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error completing appointment ${req.params.appointmentId}:`, error);
        res.status(500).json({ error: 'Failed to complete appointment', details: error.message });
    }
});

/**
 * Cancel an appointment
 * POST /api/appointments/:appointmentId/cancel
 * Body: { reason, cancelledBy }
 */
app.post('/api/appointments/:appointmentId/cancel', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { reason, cancelledBy } = req.body;
        
        if (!reason || !cancelledBy) {
            return res.status(400).json({ error: 'reason and cancelledBy are required.' });
        }
        
        const resultString = await fabricClient.submit(
            CONTRACTS.APPOINTMENT,
            'CancelAppointment',
            appointmentId,
            reason,
            cancelledBy
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error cancelling appointment ${req.params.appointmentId}:`, error);
        res.status(500).json({ error: 'Failed to cancel appointment', details: error.message });
    }
});

/**
 * Reschedule an appointment
 * POST /api/appointments/:appointmentId/reschedule
 * Body: { newDate, newStartTime, newEndTime, reason }
 */
app.post('/api/appointments/:appointmentId/reschedule', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { newDate, newStartTime, newEndTime, reason } = req.body;
        
        if (!newDate || !newStartTime || !newEndTime || !reason) {
            return res.status(400).json({ error: 'newDate, newStartTime, newEndTime, and reason are required.' });
        }
        
        const resultString = await fabricClient.submit(
            CONTRACTS.APPOINTMENT,
            'RescheduleAppointment',
            appointmentId,
            newDate,
            newStartTime,
            newEndTime,
            reason
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error rescheduling appointment ${req.params.appointmentId}:`, error);
        res.status(500).json({ error: 'Failed to reschedule appointment', details: error.message });
    }
});

/**
 * Mark appointment as no-show
 * POST /api/appointments/:appointmentId/no-show
 */
app.post('/api/appointments/:appointmentId/no-show', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        
        const resultString = await fabricClient.submit(
            CONTRACTS.APPOINTMENT,
            'MarkNoShow',
            appointmentId
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error marking appointment ${req.params.appointmentId} as no-show:`, error);
        res.status(500).json({ error: 'Failed to mark appointment as no-show', details: error.message });
    }
});

/**
 * Get patient's appointments
 * GET /api/patients/:patientId/appointments
 */
app.get('/api/patients/:patientId/appointments', async (req, res) => {
    try {
        const { patientId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.APPOINTMENT,
            'GetPatientAppointments',
            patientId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting appointments for patient ${req.params.patientId}:`, error);
        res.status(500).json({ error: 'Failed to get patient appointments', details: error.message });
    }
});

/**
 * Get doctor's appointments
 * GET /api/doctors/:doctorId/appointments
 */
app.get('/api/doctors/:doctorId/appointments', async (req, res) => {
    try {
        const { doctorId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.APPOINTMENT,
            'GetDoctorAppointments',
            doctorId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting appointments for doctor ${req.params.doctorId}:`, error);
        res.status(500).json({ error: 'Failed to get doctor appointments', details: error.message });
    }
});

/**
 * Get appointments by date range
 * POST /api/appointments/date-range
 * Body: { startDate, endDate, doctorId? }
 */
app.post('/api/appointments/date-range', async (req, res) => {
    try {
        const { startDate, endDate, doctorId } = req.body;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required.' });
        }
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.APPOINTMENT,
            'GetAppointmentsByDateRange',
            startDate,
            endDate,
            doctorId || ''
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error('Error getting appointments by date range:', error);
        res.status(500).json({ error: 'Failed to get appointments by date range', details: error.message });
    }
});

/**
 * Get doctor's schedule for a specific date
 * GET /api/doctors/:doctorId/schedule/:date
 */
app.get('/api/doctors/:doctorId/schedule/:date', async (req, res) => {
    try {
        const { doctorId, date } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.APPOINTMENT,
            'GetDoctorSchedule',
            doctorId,
            date
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting schedule for doctor ${req.params.doctorId} on ${req.params.date}:`, error);
        res.status(500).json({ error: 'Failed to get doctor schedule', details: error.message });
    }
});

/**
 * Search appointments
 * POST /api/appointments/search
 * Body: { criteria: {} }
 */
app.post('/api/appointments/search', async (req, res) => {
    try {
        const { criteria } = req.body;
        
        if (!criteria || typeof criteria !== 'object') {
            return res.status(400).json({ error: 'criteria object is required.' });
        }

        const criteriaString = JSON.stringify(criteria);
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.APPOINTMENT,
            'SearchAppointments',
            criteriaString
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error('Error searching appointments:', error);
        res.status(500).json({ error: 'Failed to search appointments', details: error.message });
    }
});

/**
 * Add reminder to appointment
 * POST /api/appointments/:appointmentId/reminders
 * Body: { type, sentAt, method }
 */
app.post('/api/appointments/:appointmentId/reminders', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { type, sentAt, method } = req.body;
        
        if (!type || !sentAt || !method) {
            return res.status(400).json({ error: 'type, sentAt, and method are required.' });
        }
        
        const reminderData = { type, sentAt, method };
        const reminderDataString = JSON.stringify(reminderData);
        
        const resultString = await fabricClient.submit(
            CONTRACTS.APPOINTMENT,
            'AddReminder',
            appointmentId,
            reminderDataString
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error adding reminder to appointment ${req.params.appointmentId}:`, error);
        res.status(500).json({ error: 'Failed to add reminder', details: error.message });
    }
});

/**
 * Get appointment history (audit trail)
 * GET /api/appointments/:appointmentId/history
 */
app.get('/api/appointments/:appointmentId/history', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.APPOINTMENT,
            'GetAppointmentHistory',
            appointmentId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting history for appointment ${req.params.appointmentId}:`, error);
        res.status(500).json({ error: 'Failed to get appointment history', details: error.message });
    }
});

// ================== PHASE 2: Prescription Endpoints ==================

/**
 * Create a new prescription
 * POST /api/prescriptions
 * Body: { prescriptionId, patientId, doctorId, medications[], diagnosis, appointmentId? }
 */
app.post('/api/prescriptions', async (req, res) => {
    try {
        const { prescriptionId, patientId, doctorId, medications, diagnosis, appointmentId } = req.body;
        
        if (!prescriptionId || !patientId || !doctorId || !medications || !diagnosis) {
            return res.status(400).json({ error: 'prescriptionId, patientId, doctorId, medications, and diagnosis are required' });
        }

        const medicationsString = JSON.stringify(medications);
        const diagnosisString = typeof diagnosis === 'object' ? JSON.stringify(diagnosis) : diagnosis;
        
        const resultString = await fabricClient.submit(
            CONTRACTS.PRESCRIPTION,
            'CreatePrescription',
            prescriptionId,
            patientId,
            doctorId,
            medicationsString,
            diagnosisString,
            appointmentId || ''
        );

        const result = JSON.parse(resultString);
        res.status(201).json(result);

    } catch (error) {
        console.error('Error creating prescription:', error);
        res.status(500).json({ error: 'Failed to create prescription', details: error.message });
    }
});

/**
 * Get prescription details
 * GET /api/prescriptions/:prescriptionId
 */
app.get('/api/prescriptions/:prescriptionId', async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'GetPrescription',
            prescriptionId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting prescription ${req.params.prescriptionId}:`, error);
        if (error.message && error.message.includes('does not exist')) {
            res.status(404).json({ error: 'Prescription not found', details: error.message });
        } else {
            res.status(500).json({ error: 'Failed to get prescription', details: error.message });
        }
    }
});

/**
 * Dispense a prescription
 * POST /api/prescriptions/:prescriptionId/dispense
 * Body: { pharmacyId, dispensedBy, quantitiesDispensed[], notes? }
 */
app.post('/api/prescriptions/:prescriptionId/dispense', async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const { pharmacyId, dispensedBy, quantitiesDispensed, notes } = req.body;
        
        if (!pharmacyId || !dispensedBy || !quantitiesDispensed) {
            return res.status(400).json({ error: 'pharmacyId, dispensedBy, and quantitiesDispensed are required.' });
        }
        
        const dispensingData = {
            pharmacyId,
            dispensedBy,
            quantitiesDispensed,
            notes: notes || ''
        };
        
        const dispensingDataString = JSON.stringify(dispensingData);
        
        const resultString = await fabricClient.submit(
            CONTRACTS.PRESCRIPTION,
            'DispensePrescription',
            prescriptionId,
            dispensingDataString
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error dispensing prescription ${req.params.prescriptionId}:`, error);
        res.status(500).json({ error: 'Failed to dispense prescription', details: error.message });
    }
});

/**
 * Refill a prescription
 * POST /api/prescriptions/:prescriptionId/refill
 * Body: { pharmacyId, dispensedBy, quantitiesDispensed[], notes? }
 */
app.post('/api/prescriptions/:prescriptionId/refill', async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const { pharmacyId, dispensedBy, quantitiesDispensed, notes } = req.body;
        
        if (!pharmacyId || !dispensedBy || !quantitiesDispensed) {
            return res.status(400).json({ error: 'pharmacyId, dispensedBy, and quantitiesDispensed are required.' });
        }
        
        const refillData = {
            pharmacyId,
            dispensedBy,
            quantitiesDispensed,
            notes: notes || ''
        };
        
        const refillDataString = JSON.stringify(refillData);
        
        const resultString = await fabricClient.submit(
            CONTRACTS.PRESCRIPTION,
            'RefillPrescription',
            prescriptionId,
            refillDataString
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error refilling prescription ${req.params.prescriptionId}:`, error);
        res.status(500).json({ error: 'Failed to refill prescription', details: error.message });
    }
});

/**
 * Cancel a prescription
 * POST /api/prescriptions/:prescriptionId/cancel
 * Body: { reason }
 */
app.post('/api/prescriptions/:prescriptionId/cancel', async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({ error: 'reason is required.' });
        }
        
        const resultString = await fabricClient.submit(
            CONTRACTS.PRESCRIPTION,
            'CancelPrescription',
            prescriptionId,
            reason
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error cancelling prescription ${req.params.prescriptionId}:`, error);
        res.status(500).json({ error: 'Failed to cancel prescription', details: error.message });
    }
});

/**
 * Get patient's prescriptions
 * GET /api/patients/:patientId/prescriptions
 */
app.get('/api/patients/:patientId/prescriptions', async (req, res) => {
    try {
        const { patientId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'GetPatientPrescriptions',
            patientId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting prescriptions for patient ${req.params.patientId}:`, error);
        res.status(500).json({ error: 'Failed to get patient prescriptions', details: error.message });
    }
});

/**
 * Get doctor's prescriptions
 * GET /api/doctors/:doctorId/prescriptions
 */
app.get('/api/doctors/:doctorId/prescriptions', async (req, res) => {
    try {
        const { doctorId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'GetDoctorPrescriptions',
            doctorId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting prescriptions for doctor ${req.params.doctorId}:`, error);
        res.status(500).json({ error: 'Failed to get doctor prescriptions', details: error.message });
    }
});

/**
 * Get active prescriptions for a patient
 * GET /api/patients/:patientId/prescriptions/active
 */
app.get('/api/patients/:patientId/prescriptions/active', async (req, res) => {
    try {
        const { patientId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'GetActivePrescriptions',
            patientId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting active prescriptions for patient ${req.params.patientId}:`, error);
        res.status(500).json({ error: 'Failed to get active prescriptions', details: error.message });
    }
});

/**
 * Get pharmacy's dispensed prescriptions
 * GET /api/pharmacies/:pharmacyId/prescriptions
 */
app.get('/api/pharmacies/:pharmacyId/prescriptions', async (req, res) => {
    try {
        const { pharmacyId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'GetPharmacyPrescriptions',
            pharmacyId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting prescriptions for pharmacy ${req.params.pharmacyId}:`, error);
        res.status(500).json({ error: 'Failed to get pharmacy prescriptions', details: error.message });
    }
});

/**
 * Search prescriptions by medication
 * GET /api/prescriptions/search/medication/:medicationName
 */
app.get('/api/prescriptions/search/medication/:medicationName', async (req, res) => {
    try {
        const { medicationName } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'SearchByMedication',
            medicationName
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error searching prescriptions by medication ${req.params.medicationName}:`, error);
        res.status(500).json({ error: 'Failed to search prescriptions by medication', details: error.message });
    }
});

/**
 * Verify prescription authenticity
 * GET /api/prescriptions/:prescriptionId/verify
 */
app.get('/api/prescriptions/:prescriptionId/verify', async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'VerifyPrescription',
            prescriptionId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error verifying prescription ${req.params.prescriptionId}:`, error);
        res.status(500).json({ error: 'Failed to verify prescription', details: error.message });
    }
});

/**
 * Add notes to a prescription
 * POST /api/prescriptions/:prescriptionId/notes
 * Body: { note, addedBy }
 */
app.post('/api/prescriptions/:prescriptionId/notes', async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const { note, addedBy } = req.body;
        
        if (!note || !addedBy) {
            return res.status(400).json({ error: 'note and addedBy are required.' });
        }
        
        const resultString = await fabricClient.submit(
            CONTRACTS.PRESCRIPTION,
            'AddPrescriptionNotes',
            prescriptionId,
            note,
            addedBy
        );

        const result = JSON.parse(resultString);
        res.status(200).json(result);

    } catch (error) {
        console.error(`Error adding notes to prescription ${req.params.prescriptionId}:`, error);
        res.status(500).json({ error: 'Failed to add prescription notes', details: error.message });
    }
});

/**
 * Get prescription history (audit trail)
 * GET /api/prescriptions/:prescriptionId/history
 */
app.get('/api/prescriptions/:prescriptionId/history', async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'GetPrescriptionHistory',
            prescriptionId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(`Error getting history for prescription ${req.params.prescriptionId}:`, error);
        res.status(500).json({ error: 'Failed to get prescription history', details: error.message });
    }
});

// ================== Authentication Endpoints ==================

/**
 * User Registration
 * POST /api/auth/register
 * Body: { "email", "password", "name", "role" }
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        
        if (!email || !password || !name || !role) {
            return res.status(400).json({ 
                error: 'email, password, name, and role are required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Invalid email format' 
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters' 
            });
        }

        // Check if user already exists
        if (userStore.has(email)) {
            return res.status(409).json({ 
                error: 'User with this email already exists' 
            });
        }

        // Validate role
        if (!['patient', 'doctor', 'admin'].includes(role)) {
            return res.status(400).json({ 
                error: 'role must be one of: patient, doctor, admin' 
            });
        }

        // Create new user
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const user = {
            userId: userId,
            email: email,
            name: name,
            role: role,
            passwordHash: await bcrypt.hash(password, 10),
            createdAt: new Date().toISOString()
        };

        userStore.set(email, user);

        // Generate token
        const token = generateToken(userId, email, role);

        console.log(`User registered successfully: ${email} (${role})`);

        res.status(201).json({
            message: 'User registered successfully',
            token: token,
            user: {
                userId: user.userId,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ 
            error: 'Failed to register user', 
            details: error.message 
        });
    }
});

/**
 * User Login
 * POST /api/auth/login
 * Body: { "email", "password" }
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'email and password are required' 
            });
        }

        // Check if user exists
        const user = userStore.get(email);
        if (!user) {
            return res.status(401).json({ 
                error: 'Invalid email or password' 
            });
        }

        // Verify password using bcrypt
        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        
        if (!passwordValid) {
            return res.status(401).json({ 
                error: 'Invalid email or password' 
            });
        }

        // Generate token
        const token = generateToken(user.userId, email, user.role);

        console.log(`User logged in successfully: ${email}`);

        res.status(200).json({
            message: 'Login successful',
            token: token,
            user: {
                userId: user.userId,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ 
            error: 'Failed to login', 
            details: error.message 
        });
    }
});

/**
 * User Logout
 * POST /api/auth/logout
 * Headers: Authorization: Bearer <token>
 */
app.post('/api/auth/logout', verifyBearerToken, async (req, res) => {
    try {
        // In a real system, we'd invalidate the token
        // For now, the client just removes it from localStorage
        console.log(`User logged out: ${req.user.email}`);
        
        res.status(200).json({
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Error logging out:', error);
        res.status(500).json({ 
            error: 'Failed to logout', 
            details: error.message 
        });
    }
});

/**
 * Get Current User Info
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 */
app.get('/api/auth/me', verifyBearerToken, async (req, res) => {
    try {
        const user = userStore.get(req.user.email);
        
        if (!user) {
            return res.status(404).json({ 
                error: 'User not found' 
            });
        }

        res.status(200).json({
            message: 'User info retrieved',
            user: {
                userId: user.userId,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error getting user info:', error);
        res.status(500).json({ 
            error: 'Failed to get user info', 
            details: error.message 
        });
    }
});

/**
 * Refresh Token
 * POST /api/auth/refresh
 * Headers: Authorization: Bearer <token>
 */
app.post('/api/auth/refresh', verifyBearerToken, async (req, res) => {
    try {
        const { email, role, userId } = req.user;
        
        // Generate new token
        const newToken = generateToken(userId, email, role);

        res.status(200).json({
            message: 'Token refreshed successfully',
            token: newToken
        });

    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json({ 
            error: 'Failed to refresh token', 
            details: error.message 
        });
    }
});

/**
 * Check Authentication Status
 * GET /api/auth/status
 */
app.get('/api/auth/status', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(200).json({
                authenticated: false,
                user: null
            });
        }

        const token = authHeader.substring('Bearer '.length);
        const payload = verifyToken(token);
        
        if (!payload) {
            return res.status(200).json({
                authenticated: false,
                user: null
            });
        }

        const user = userStore.get(payload.email);
        
        res.status(200).json({
            authenticated: true,
            user: {
                userId: user.userId,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error checking auth status:', error);
        res.status(200).json({
            authenticated: false,
            user: null
        });
    }
});

// ================== End Authentication Endpoints ==================

// ================== Get All Endpoints ==================

/**
 * Get all consents
 * GET /api/consents
 */
app.get('/api/consents', async (req, res) => {
    try {
        // Query all consents from the ledger
        const resultString = await fabricClient.evaluate(
            CONTRACTS.HEALTHLINK,
            'GetAllConsents'
        );
        res.status(200).json(JSON.parse(resultString));
    } catch (error) {
        console.error('Error getting all consents:', error);
        res.status(500).json({ 
            error: 'Failed to get consents', 
            details: error.message 
        });
    }
});

/**
 * Get all appointments
 * GET /api/appointments
 */
app.get('/api/appointments', async (req, res) => {
    try {
        // Query all appointments from the ledger
        const resultString = await fabricClient.evaluate(
            CONTRACTS.APPOINTMENT,
            'GetAllAppointments'
        );
        res.status(200).json(JSON.parse(resultString));
    } catch (error) {
        console.error('Error getting all appointments:', error);
        res.status(500).json({ 
            error: 'Failed to get appointments', 
            details: error.message 
        });
    }
});

/**
 * Get all prescriptions
 * GET /api/prescriptions
 */
app.get('/api/prescriptions', async (req, res) => {
    try {
        // Query all prescriptions from the ledger
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'GetAllPrescriptions'
        );
        res.status(200).json(JSON.parse(resultString));
    } catch (error) {
        console.error('Error getting all prescriptions:', error);
        res.status(500).json({ 
            error: 'Failed to get prescriptions', 
            details: error.message 
        });
    }
});

// ================== Lab Tests Endpoints ==================

/**
 * Create a lab test
 * POST /api/lab-tests
 * Body: { "labTestId", "patientId", "testType", "testName", "result", "normalRange", "unit" }
 */
app.post('/api/lab-tests', async (req, res) => {
    try {
        const { labTestId, patientId, testType, testName, result, normalRange, unit } = req.body;
        
        if (!labTestId || !patientId || !testType || !testName) {
            return res.status(400).json({ 
                error: 'labTestId, patientId, testType, and testName are required' 
            });
        }

        // Store lab test in ledger (using HEALTHLINK contract for now)
        const resultString = await fabricClient.submit(
            CONTRACTS.HEALTHLINK,
            'CreateLabTest',
            labTestId,
            patientId,
            testType,
            testName,
            result || '',
            normalRange || '',
            unit || '',
            new Date().toISOString()
        );

        const labTest = JSON.parse(resultString);
        res.status(201).json({
            message: 'Lab test created successfully',
            ...labTest
        });

    } catch (error) {
        console.error('Error creating lab test:', error);
        res.status(500).json({ 
            error: 'Failed to create lab test', 
            details: error.message 
        });
    }
});

/**
 * Get a specific lab test
 * GET /api/lab-tests/:labTestId
 */
app.get('/api/lab-tests/:labTestId', async (req, res) => {
    try {
        const { labTestId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.HEALTHLINK,
            'GetLabTest',
            labTestId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error('Error getting lab test:', error);
        res.status(500).json({ 
            error: 'Failed to get lab test', 
            details: error.message 
        });
    }
});

/**
 * Get all lab tests for a patient
 * GET /api/lab-tests/patient/:patientId
 */
app.get('/api/lab-tests/patient/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.HEALTHLINK,
            'GetPatientLabTests',
            patientId
        );

        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error('Error getting patient lab tests:', error);
        res.status(500).json({ 
            error: 'Failed to get patient lab tests', 
            details: error.message 
        });
    }
});

/**
 * Update a lab test
 * PUT /api/lab-tests/:labTestId
 * Body: { "result", "normalRange", "unit", "status" }
 */
app.put('/api/lab-tests/:labTestId', async (req, res) => {
    try {
        const { labTestId } = req.params;
        const { result, normalRange, unit, status } = req.body;
        
        const resultString = await fabricClient.submit(
            CONTRACTS.HEALTHLINK,
            'UpdateLabTest',
            labTestId,
            result || '',
            normalRange || '',
            unit || '',
            status || 'completed'
        );

        const labTest = JSON.parse(resultString);
        res.status(200).json({
            message: 'Lab test updated successfully',
            ...labTest
        });

    } catch (error) {
        console.error('Error updating lab test:', error);
        res.status(500).json({ 
            error: 'Failed to update lab test', 
            details: error.message 
        });
    }
});

/**
 * Delete a lab test
 * DELETE /api/lab-tests/:labTestId
 */
app.delete('/api/lab-tests/:labTestId', async (req, res) => {
    try {
        const { labTestId } = req.params;
        
        const resultString = await fabricClient.submit(
            CONTRACTS.HEALTHLINK,
            'DeleteLabTest',
            labTestId
        );

        res.status(200).json({
            message: 'Lab test deleted successfully',
            ...JSON.parse(resultString)
        });

    } catch (error) {
        console.error('Error deleting lab test:', error);
        res.status(500).json({ 
            error: 'Failed to delete lab test', 
            details: error.message 
        });
    }
});

// --- Start Server ---
async function startServer() {
    try {
        // Start server immediately (don't wait for Fabric)
        app.listen(PORT, () => {
            console.log(`\n✅ HealthLink Pro API server listening on http://localhost:${PORT}`);
            console.log(`📊 Services Status:`);
            console.log(`   • Auth System: ✅ READY`);
            console.log(`   • Hyperledger Fabric: ${fabricInitialized ? '✅ CONNECTED' : '⚠ OFFLINE (optional)'}`);
            if (!fabricInitialized) {
                console.log(`\n💡 To enable Hyperledger features, start the Fabric network:`);
                console.log(`   cd fabric-samples/test-network`);
                console.log(`   ./network.sh up createChannel -ca -s couchdb\n`);
            } else {
                console.log('');
            }
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
          console.log('\nShutting down server...');
          if (fabricClient) {
            fabricClient.disconnect();
          }
          process.exit(0);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
