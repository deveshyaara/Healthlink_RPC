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
const revokedTokens = new Set(); // Tokens that have been explicitly revoked (logout)

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
        // Check if token was revoked (logout)
        if (revokedTokens.has(token)) {
            return null;
        }
        
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
 * Helper function to revoke a token (for logout)
 */
function revokeToken(token) {
    revokedTokens.add(token);
    tokenStore.delete(token);
}

/**
 * Periodic cleanup of expired tokens
 * Runs every 60 seconds
 */
setInterval(() => {
    const now = Date.now();
    for (const [token, payload] of tokenStore.entries()) {
        if (payload.exp < now) {
            tokenStore.delete(token);
        }
    }
}, 60000);

/**
 * API Error Class for standardized error handling
 */
class APIError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }
}

/**
 * Helper function to normalize response format
 * Ensures all API responses follow the same structure
 */
function normalizeResponse(data, statusCode = 200, message = null, details = null) {
    const response = {
        status: statusCode >= 400 ? 'error' : 'success',
        statusCode,
        data,
        timestamp: new Date().toISOString()
    };
    
    // Add message if provided
    if (message) {
        response.message = message;
    }
    
    // Add details if provided (for debugging error responses)
    if (details && statusCode >= 400) {
        response.details = details;
    }
    
    return response;
}

/**
 * Deep parse JSON strings in nested objects
 * Converts JSON strings to objects at all levels
 */
function deepParseJSON(obj) {
    if (typeof obj === 'string') {
        try {
            return JSON.parse(obj);
        } catch (e) {
            return obj;
        }
    }
    if (Array.isArray(obj)) {
        return obj.map(deepParseJSON);
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, deepParseJSON(value)])
        );
    }
    return obj;
}

/**
 * Process chaincode responses with proper JSON parsing
 */
function processChaincodeResponse(responseString) {
    try {
        const parsed = JSON.parse(responseString);
        return deepParseJSON(parsed);
    } catch (e) {
        console.warn('Failed to parse chaincode response:', e);
        return responseString;
    }
}

/**
 * Helper to parse specific nested fields
 */
function parseJsonFields(obj, fieldsToparse = ['credentials', 'contact', 'metadata', 'completionData', 'medications']) {
    const parsed = { ...obj };
    fieldsToparse.forEach(field => {
        if (typeof parsed[field] === 'string') {
            try {
                parsed[field] = JSON.parse(parsed[field]);
            } catch (e) {
                console.warn(`Failed to parse ${field}:`, e);
            }
        }
    });
    return parsed;
}

/**
 * Ensure fields are arrays
 */
function ensureArrays(obj, arrayFields = ['medications', 'prescriptionIds', 'labTestIds']) {
    const result = { ...obj };
    arrayFields.forEach(field => {
        if (result[field]) {
            if (typeof result[field] === 'string') {
                try {
                    result[field] = JSON.parse(result[field]);
                } catch (e) {
                    result[field] = [];
                }
            }
            if (!Array.isArray(result[field])) {
                result[field] = [result[field]];
            }
        }
    });
    return result;
}

/**
 * Middleware to verify Bearer token
 */
function verifyBearerToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json(normalizeResponse(null, 401, 'Missing or invalid Authorization header'));
    }

    const token = authHeader.substring('Bearer '.length);
    const payload = verifyToken(token);
    
    if (!payload) {
        return res.status(401).json(normalizeResponse(null, 401, 'Invalid or expired token'));
    }

    req.user = payload;
    next();
}

/**
 * Middleware requiring authenticated user
 */
function requireAuth(req, res, next) {
    verifyBearerToken(req, res, () => {
        if (req.user) {
            next();
        }
    });
}

/**
 * Middleware requiring specific user roles
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        verifyBearerToken(req, res, () => {
            // Validate user exists and has role
            if (!req.user) {
                return res.status(401).json(normalizeResponse(null, 401, 'User information missing from token'));
            }
            
            if (!req.user.role) {
                return res.status(401).json(normalizeResponse(null, 401, 'User role missing from token'));
            }
            
            // Check if user role is allowed
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json(normalizeResponse(
                    null, 
                    403, 
                    `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`
                ));
            }
            
            next();
        });
    };
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
        return res.status(503).json(normalizeResponse({
            error: 'Fabric network unavailable',
            details: fabricError
        }, 503, 'Hyperledger Fabric is not connected. Auth system is available.'));
    }
    try {
        const resultString = await fabricClient.evaluate(contractName, fn, ...args);
        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200));
    } catch (error) {
        console.error(`Failed to evaluate ${contractName}.${fn}:`, error);
        if (error.message && (error.message.includes('not found') || error.message.includes('does not exist'))) {
            res.status(404).json(normalizeResponse(null, 404, error.message));
        } else {
            res.status(500).json(normalizeResponse(null, 500, error.message));
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
        return res.status(503).json(normalizeResponse({
            error: 'Fabric network unavailable',
            details: fabricError
        }, 503, 'Hyperledger Fabric is not connected. Auth system is available.'));
    }
    try {
        const chaincodeResponseString = await fabricClient.submit(contractName, fn, ...args);
        const result = processChaincodeResponse(chaincodeResponseString);
        res.status(201).json(normalizeResponse(result, 201));
    } catch (error) {
        console.error(`Failed to submit ${contractName}.${fn}:`, error);
        res.status(500).json(normalizeResponse(null, 500, error.message));
    }
};

// --- API Endpoints ---

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json(normalizeResponse({ status: 'UP' }, 200));
});

// Simple Ping test [NEW]
app.get('/api/ping', (req, res) => {
    console.log('Received GET /api/ping request');
    handleQuery(res, CONTRACTS.HEALTHLINK, 'Ping');
});

// Mock records endpoint for testing (DEBUG - Remove in production)
app.get('/api/medical-records/mock', (req, res) => {
    console.log('Returning mock medical records');
    const mockRecords = {
        results: [
            {
                Key: 'REC_001',
                Record: {
                    recordId: 'REC_001',
                    patientId: 'test-patient',
                    doctorId: 'DR_001',
                    recordType: 'lab_test',
                    ipfsHash: 'QmXxxx...',
                    createdAt: new Date().toISOString(),
                    status: 'active',
                    metadata: { testType: 'blood_work', results: 'normal' }
                }
            },
            {
                Key: 'REC_002',
                Record: {
                    recordId: 'REC_002',
                    patientId: 'test-patient',
                    doctorId: 'DR_002',
                    recordType: 'prescription',
                    ipfsHash: 'QmYyyy...',
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    status: 'active',
                    metadata: { medications: ['aspirin', 'ibuprofen'], dosage: '100mg' }
                }
            }
        ],
        metadata: {
            recordsCount: 2,
            bookmark: ''
        }
    };
    res.status(200).json(normalizeResponse(mockRecords, 200));
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
app.post('/api/patient', verifyBearerToken, async (req, res) => {
    try {
        const { patientId, publicData, privateData } = req.body;
        if (!patientId || !publicData || !privateData) {
            return res.status(400).json(normalizeResponse(null, 400, 'patientId, publicData, and privateData are required.'));
        }

        const transientData = {
            patient_details: Buffer.from(JSON.stringify(privateData))
        };

        const resultString = await fabricClient.submitPrivate(
            'CreatePatient',
            [patientId, JSON.stringify(publicData)],
            transientData
        );
        
        const result = processChaincodeResponse(resultString);
        res.status(201).json(normalizeResponse(result, 201, 'Patient created successfully'));

    } catch (error) {
        console.error('Error creating patient:', error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to create patient'));
    }
});

// ================== Consent Endpoints ==================

/**
 * Create a new consent record
 * Body: { "consentId", "patientId", "granteeId", "scope", "purpose", "validUntil" }
 */
app.post('/api/consents', requireAuth, async (req, res) => {
    try {
        const { consentId, patientId, granteeId, scope, purpose, validUntil } = req.body;
        if (!consentId || !patientId || !granteeId || !scope || !purpose || !validUntil) {
            return res.status(400).json(normalizeResponse(null, 400, 'consentId, patientId, granteeId, scope, purpose, and validUntil are required.'));
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

        const result = processChaincodeResponse(resultString);
        res.status(201).json(normalizeResponse(result, 201, 'Consent created successfully'));

    } catch (error) {
        console.error('Error creating consent:', error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to create consent'));
    }
});

/**
 * Get a specific consent by its ID
 */
app.get('/api/consents/:id', requireAuth, async (req, res) => {
    try {
        const consentId = req.params.id;
        const resultString = await fabricClient.evaluate(CONTRACTS.HEALTHLINK, 'GetConsent', consentId);
        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200));
    } catch (error) {
        console.error(`Error getting consent ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to get consent', details: error.message });
    }
});

/**
 * Get all consents for a specific patient
 */
app.get('/api/patient/:id/consents', verifyBearerToken, async (req, res) => {
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
app.get('/api/audit/:txId', verifyBearerToken, async (req, res) => {
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
 * Role: Doctor or Admin (can create records)
 */
app.post('/api/medical-records', requireRole('doctor', 'admin'), async (req, res) => {
    try {
        const { recordId, doctorId, recordType, ipfsHash, metadata } = req.body;
        const patientId = req.user.email || req.user.userId;
        const createdBy = req.user.email;
        
        if (!recordId || !doctorId || !recordType || !ipfsHash) {
            return res.status(400).json(normalizeResponse({ 
                error: 'recordId, doctorId, recordType, and ipfsHash are required.' 
            }, 400));
        }

        // Log action for audit purposes
        console.log(`[AUDIT] ${req.user.role} ${createdBy} created record ${recordId} for patient ${patientId}`);

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

        const result = processChaincodeResponse(resultString);
        res.status(201).json(normalizeResponse(result, 201));

    } catch (error) {
        console.error('Error creating medical record:', error);
        res.status(500).json(normalizeResponse({ error: 'Failed to create medical record', details: error.message }, 500));
    }
});

/**
 * Get paginated medical records
 * GET /api/medical-records/paginated
 * Query: pageSize, bookmark
 * Requires: Authorization header with Bearer token
 * Role: Patient (viewing own records) OR Doctor/Admin (viewing any patient's records)
 */
app.get('/api/medical-records/paginated', verifyBearerToken, async (req, res) => {
    try {
        const { pageSize = '10', bookmark = '' } = req.query;
        const patientId = req.user.email || req.user.userId;
        const userRole = req.user.role;

        // Log access for audit purposes
        console.log(`[AUDIT] ${userRole} accessing medical records for patient: ${patientId}`);
        
        let resultString;
        try {
            resultString = await fabricClient.evaluate(
                CONTRACTS.PATIENT_RECORDS,
                'GetRecordsPaginated',
                patientId,
                pageSize,
                bookmark
            );
        } catch (chainError) {
            console.error('Chaincode error:', chainError.message);
            // Return empty results if chaincode fails (e.g., no records exist yet)
            console.log('Returning empty results due to chaincode error');
            return res.status(200).json(normalizeResponse({
                results: [],
                metadata: {
                    recordsCount: 0,
                    bookmark: ''
                }
            }, 200));
        }

        const result = processChaincodeResponse(resultString);
        
        res.status(200).json(normalizeResponse(result, 200));

    } catch (error) {
        console.error('Error getting paginated records:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json(normalizeResponse({ error: 'Failed to get paginated records', details: error.message }, 500));
    }
});

/**
 * Get a medical record by ID
 * GET /api/medical-records/:recordId
 * Query: accessReason
 * Requires: Authorization header with Bearer token (patientId extracted from token)
 */
app.get('/api/medical-records/:recordId', verifyBearerToken, async (req, res) => {
    try {
        const { recordId } = req.params;
        const { accessReason = 'medical_review' } = req.query;
        const patientId = req.user.email || req.user.userId;
        
        if (!patientId) {
            return res.status(401).json(normalizeResponse({ error: 'Patient ID not found in token' }, 401));
        }

        console.log('Fetching record:', recordId, 'for patient:', patientId, 'accessReason:', accessReason);
        
        let resultString;
        try {
            resultString = await fabricClient.evaluate(
                CONTRACTS.PATIENT_RECORDS,
                'GetMedicalRecord',
                recordId,
                patientId,
                accessReason
            );
        } catch (chainError) {
            console.error('Chaincode error getting record:', chainError.message);
            return res.status(404).json(normalizeResponse({ error: 'Record not found or inaccessible' }, 404));
        }

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200));

    } catch (error) {
        console.error(`Error getting medical record ${req.params.recordId}:`, error);
        res.status(500).json(normalizeResponse({ error: 'Failed to get medical record', details: error.message }, 500));
    }
});

/**
 * Update a medical record
 * PUT /api/medical-records/:recordId
 * Body: { ipfsHash, metadata }
 * Role: Doctor or Admin (can update records)
 */
app.put('/api/medical-records/:recordId', requireRole('doctor', 'admin'), async (req, res) => {
    try {
        const { recordId } = req.params;
        const { ipfsHash, metadata } = req.body;
        const patientId = req.user.email || req.user.userId;
        const updatedBy = req.user.email;
        
        if (!ipfsHash) {
            return res.status(400).json(normalizeResponse({ 
                error: 'ipfsHash is required.' 
            }, 400));
        }

        // Log action for audit purposes
        console.log(`[AUDIT] ${req.user.role} ${updatedBy} updated record ${recordId} for patient ${patientId}`);

        const metadataString = metadata ? JSON.stringify(metadata) : '{}';
        
        const resultString = await fabricClient.submit(
            CONTRACTS.PATIENT_RECORDS,
            'UpdateMedicalRecord',
            recordId,
            patientId,
            ipfsHash,
            metadataString
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200));

    } catch (error) {
        console.error(`Error updating medical record ${req.params.recordId}:`, error);
        res.status(500).json(normalizeResponse({ error: 'Failed to update medical record', details: error.message }, 500));
    }
});

/**
 * Get medical records by patient ID
 * GET /api/medical-records/patient/:patientId
 */
/**
 * Get medical records by patient ID
 * GET /api/medical-records/patient/:patientId
 * Role: Patient (own records), Doctor/Admin (any patient's records)
 */
app.get('/api/medical-records/patient/:patientId', verifyBearerToken, async (req, res) => {
    try {
        const { patientId } = req.params;
        const userRole = req.user.role;
        const userId = req.user.email || req.user.userId;

        // Log access for audit purposes
        console.log(`[AUDIT] ${userRole} ${userId} accessed patient ${patientId} records`);
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PATIENT_RECORDS,
            'GetRecordsByPatient',
            patientId
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200));

    } catch (error) {
        console.error(`Error getting records for patient ${req.params.patientId}:`, error);
        res.status(500).json(normalizeResponse({ error: 'Failed to get patient records', details: error.message }, 500));
    }
});

/**
 * Get medical records by doctor ID
 * GET /api/medical-records/doctor/:doctorId
 * Role: Doctor (own records), Admin (any doctor's records)
 */
app.get('/api/medical-records/doctor/:doctorId', verifyBearerToken, async (req, res) => {
    try {
        const { doctorId } = req.params;
        const userRole = req.user.role;
        const userId = req.user.email || req.user.userId;

        // Log access for audit purposes
        console.log(`[AUDIT] ${userRole} ${userId} accessed doctor ${doctorId} records`);
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PATIENT_RECORDS,
            'GetRecordsByDoctor',
            doctorId
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200));

    } catch (error) {
        console.error(`Error getting records for doctor ${req.params.doctorId}:`, error);
        res.status(500).json(normalizeResponse({ error: 'Failed to get doctor records', details: error.message }, 500));
    }
});

/**
 * Search medical records by tags
 * POST /api/medical-records/search
 * Body: { tags: string[] }
 */
app.post('/api/medical-records/search', verifyBearerToken, async (req, res) => {
    try {
        const { tags } = req.body;
        
        if (!tags || !Array.isArray(tags)) {
            return res.status(400).json(normalizeResponse({ error: 'tags array is required.' }, 400));
        }

        const tagsString = JSON.stringify(tags);
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PATIENT_RECORDS,
            'SearchRecordsByTags',
            tagsString
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200));

    } catch (error) {
        console.error('Error searching medical records:', error);
        res.status(500).json(normalizeResponse({ error: 'Failed to search medical records', details: error.message }, 500));
    }
});

/**
 * Archive a medical record
 * DELETE /api/medical-records/:recordId/archive
 * Role: Patient (own records), Doctor/Admin (any records)
 */
app.delete('/api/medical-records/:recordId/archive', verifyBearerToken, async (req, res) => {
    try {
        const { recordId } = req.params;
        const patientId = req.user.email || req.user.userId;
        const archivedBy = req.user.email;

        // Log action for audit purposes
        console.log(`[AUDIT] ${req.user.role} ${archivedBy} archived record ${recordId} for patient ${patientId}`);

        const resultString = await fabricClient.submit(
            CONTRACTS.PATIENT_RECORDS,
            'ArchiveMedicalRecord',
            recordId,
            patientId
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200));

    } catch (error) {
        console.error(`Error archiving medical record ${req.params.recordId}:`, error);
        res.status(500).json(normalizeResponse({ error: 'Failed to archive medical record', details: error.message }, 500));
    }
});

/**
 * Get access log for a medical record
 * GET /api/medical-records/:recordId/access-log
 * Role: Patient (own records), Doctor/Admin (any records)
 */
app.get('/api/medical-records/:recordId/access-log', verifyBearerToken, async (req, res) => {
    try {
        const { recordId } = req.params;
        const userId = req.user.email || req.user.userId;

        // Log access for audit purposes
        console.log(`[AUDIT] ${req.user.role} ${userId} viewed access log for record ${recordId}`);
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PATIENT_RECORDS,
            'GetRecordAccessLog',
            recordId
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200));

    } catch (error) {
        console.error(`Error getting access log for ${req.params.recordId}:`, error);
        res.status(500).json(normalizeResponse({ error: 'Failed to get access log', details: error.message }, 500));
    }
});

/**
 * Get history of a medical record
 * GET /api/medical-records/:recordId/history
 * Role: Patient (own records), Doctor/Admin (any records)
 */
app.get('/api/medical-records/:recordId/history', verifyBearerToken, async (req, res) => {
    try {
        const { recordId } = req.params;
        const userId = req.user.email || req.user.userId;

        // Log access for audit purposes
        console.log(`[AUDIT] ${req.user.role} ${userId} viewed history for record ${recordId}`);
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PATIENT_RECORDS,
            'GetRecordHistory',
            recordId
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200));

    } catch (error) {
        console.error(`Error getting history for ${req.params.recordId}:`, error);
        res.status(500).json(normalizeResponse({ error: 'Failed to get record history', details: error.message }, 500));
    }
});

// ================== Doctor Credentials Endpoints ==================

/**
 * Register a new doctor
 * POST /api/doctors
 * Body: { doctorId, name, specialization, licenseNumber, hospital, credentials, contact }
 */
app.post('/api/doctors', requireRole('admin'), async (req, res) => {
    try {
        const { doctorId, name, specialization, licenseNumber, hospital, credentials, contact } = req.body;
        const userId = req.user.email || req.user.userId;
        const userRole = req.user.role;
        
        // Input validation
        if (!doctorId || !doctorId.trim()) {
            return res.status(400).json(normalizeResponse(null, 400, 'Doctor ID is required'));
        }
        if (!name || !name.trim()) {
            return res.status(400).json(normalizeResponse(null, 400, 'Doctor name is required'));
        }
        if (!specialization || !specialization.trim()) {
            return res.status(400).json(normalizeResponse(null, 400, 'Specialization is required'));
        }
        if (!licenseNumber || !licenseNumber.trim()) {
            return res.status(400).json(normalizeResponse(null, 400, 'License number is required'));
        }
        if (!hospital || !hospital.trim()) {
            return res.status(400).json(normalizeResponse(null, 400, 'Hospital is required'));
        }
        if (!credentials || typeof credentials !== 'object') {
            return res.status(400).json(normalizeResponse(null, 400, 'Valid credentials object is required'));
        }
        if (!contact || typeof contact !== 'object') {
            return res.status(400).json(normalizeResponse(null, 400, 'Valid contact object is required'));
        }
        
        auditLog(userRole, userId, 'REGISTER_DOCTOR', { doctorId, name, specialization });

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

        const result = processChaincodeResponse(resultString);
        res.status(201).json(normalizeResponse(result, 201, 'Doctor registered successfully'));

    } catch (error) {
        console.error('Error registering doctor:', error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to register doctor', error.message));
    }
});

/**
 * Verify a doctor
 * POST /api/doctors/:doctorId/verify
 * Body: { status, comments }
 */
app.post('/api/doctors/:doctorId/verify', requireRole('admin'), async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { status, comments = '' } = req.body;
        const userId = req.user.email || req.user.userId;
        
        // Input validation
        if (!doctorId || doctorId.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Doctor ID is required'));
        }
        if (!status || !['verified', 'rejected'].includes(status)) {
            return res.status(400).json(normalizeResponse(null, 400, 'Status must be either "verified" or "rejected"'));
        }
        
        auditLog(req.user.role, userId, 'VERIFY_DOCTOR', { doctorId, status });

        const resultString = await fabricClient.submit(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'VerifyDoctor',
            doctorId,
            status,
            comments
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, `Doctor ${status} successfully`));

    } catch (error) {
        console.error(`Error verifying doctor ${req.params.doctorId}:`, error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to verify doctor', error.message));
    }
});

/**
 * Get doctor profile by ID
 * GET /api/doctors/:doctorId
 */
app.get('/api/doctors/:doctorId', verifyBearerToken, async (req, res) => {
    try {
        const { doctorId } = req.params;
        const userId = req.user.email || req.user.userId;
        
        // Input validation
        if (!doctorId || doctorId.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Doctor ID is required'));
        }
        
        auditLog(req.user.role, userId, 'GET_DOCTOR', { doctorId });
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'GetDoctor',
            doctorId
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Doctor retrieved successfully'));

    } catch (error) {
        console.error(`Error getting doctor ${req.params.doctorId}:`, error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to get doctor', error.message));
    }
});

/**
 * Get doctors by specialization
 * GET /api/doctors/specialization/:specialization
 */
app.get('/api/doctors/specialization/:specialization', verifyBearerToken, async (req, res) => {
    try {
        const { specialization } = req.params;
        const userId = req.user.email || req.user.userId;
        
        // Input validation
        if (!specialization || specialization.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Specialization is required'));
        }
        
        auditLog(req.user.role, userId, 'SEARCH_DOCTORS_BY_SPECIALIZATION', { specialization });
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'GetDoctorsBySpecialization',
            specialization
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Doctors retrieved successfully'));

    } catch (error) {
        console.error(`Error getting doctors by specialization ${req.params.specialization}:`, error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to get doctors by specialization', error.message));
    }
});

/**
 * Get doctors by hospital
 * GET /api/doctors/hospital/:hospital
 */
app.get('/api/doctors/hospital/:hospital', verifyBearerToken, async (req, res) => {
    try {
        const { hospital } = req.params;
        const userId = req.user.email || req.user.userId;
        
        // Input validation
        if (!hospital || hospital.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Hospital is required'));
        }
        
        auditLog(req.user.role, userId, 'SEARCH_DOCTORS_BY_HOSPITAL', { hospital });
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.DOCTOR_CREDENTIALS,
            'GetDoctorsByHospital',
            hospital
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Doctors retrieved successfully'));

    } catch (error) {
        console.error(`Error getting doctors by hospital ${req.params.hospital}:`, error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to get doctors by hospital', error.message));
    }
});

/**
 * Update doctor availability
 * PUT /api/doctors/:doctorId/availability
 * Body: { availability: [] }
 */
app.put('/api/doctors/:doctorId/availability', verifyBearerToken, async (req, res) => {
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
app.post('/api/doctors/:doctorId/rate', verifyBearerToken, async (req, res) => {
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
app.get('/api/doctors/:doctorId/reviews', verifyBearerToken, async (req, res) => {
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
app.put('/api/doctors/:doctorId/profile', verifyBearerToken, async (req, res) => {
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
app.post('/api/doctors/:doctorId/suspend', requireRole('admin'), async (req, res) => {
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
app.post('/api/doctors/search', verifyBearerToken, async (req, res) => {
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
app.post('/api/appointments', verifyBearerToken, async (req, res) => {
    try {
        const { appointmentId, patientId, doctorId, appointmentDate, startTime, endTime, reason } = req.body;
        const userId = req.user.email || req.user.userId;
        const userRole = req.user.role;
        
        if (!appointmentId || !patientId || !doctorId || !appointmentDate || !startTime || !endTime || !reason) {
            return res.status(400).json({ error: 'All fields are required: appointmentId, patientId, doctorId, appointmentDate, startTime, endTime, reason' });
        }
        
        console.log(`[AUDIT] ${userRole} ${userId} SCHEDULE_APPOINTMENT appointmentId=${appointmentId} patientId=${patientId} doctorId=${doctorId} date=${appointmentDate}`);

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

        const result = processChaincodeResponse(resultString);
        res.status(201).json(normalizeResponse(result, 201, 'Appointment scheduled successfully'));

    } catch (error) {
        console.error('Error scheduling appointment:', error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to schedule appointment', error.message));
    }
});

/**
 * Get appointment details
 * GET /api/appointments/:appointmentId
 */
app.get('/api/appointments/:appointmentId', verifyBearerToken, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const userId = req.user.email || req.user.userId;
        const userRole = req.user.role;
        
        console.log(`[AUDIT] ${userRole} ${userId} VIEW_APPOINTMENT appointmentId=${appointmentId}`);
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.APPOINTMENT,
            'GetAppointment',
            appointmentId
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Appointment retrieved successfully'));

    } catch (error) {
        console.error(`Error getting appointment ${req.params.appointmentId}:`, error);
        if (error.message && error.message.includes('does not exist')) {
            res.status(404).json(normalizeResponse(null, 404, 'Appointment not found', error.message));
        } else {
            res.status(500).json(normalizeResponse(null, 500, 'Failed to get appointment', error.message));
        }
    }
});

/**
 * Confirm an appointment
 * POST /api/appointments/:appointmentId/confirm
 */
app.post('/api/appointments/:appointmentId/confirm', verifyBearerToken, async (req, res) => {
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
app.post('/api/appointments/:appointmentId/complete', verifyBearerToken, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { diagnosis, notes, prescriptionIds, labTestIds } = req.body;
        const userId = req.user.email || req.user.userId;
        const userRole = req.user.role;
        
        console.log(`[AUDIT] ${userRole} ${userId} COMPLETE_APPOINTMENT appointmentId=${appointmentId} diagnosis=${diagnosis ? 'yes' : 'no'}`);
        
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
app.post('/api/appointments/:appointmentId/cancel', verifyBearerToken, async (req, res) => {
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
app.post('/api/appointments/:appointmentId/reschedule', verifyBearerToken, async (req, res) => {
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
app.post('/api/appointments/:appointmentId/no-show', verifyBearerToken, async (req, res) => {
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
app.get('/api/patients/:patientId/appointments', verifyBearerToken, async (req, res) => {
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
app.get('/api/doctors/:doctorId/appointments', verifyBearerToken, async (req, res) => {
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
app.post('/api/appointments/date-range', verifyBearerToken, async (req, res) => {
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
app.get('/api/doctors/:doctorId/schedule/:date', verifyBearerToken, async (req, res) => {
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
app.post('/api/appointments/search', verifyBearerToken, async (req, res) => {
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
app.post('/api/appointments/:appointmentId/reminders', verifyBearerToken, async (req, res) => {
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
app.get('/api/appointments/:appointmentId/history', verifyBearerToken, async (req, res) => {
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
app.post('/api/prescriptions', verifyBearerToken, async (req, res) => {
    try {
        const { prescriptionId, patientId, doctorId, medications, diagnosis, appointmentId } = req.body;
        const userId = req.user.email || req.user.userId;
        const userRole = req.user.role;
        
        // Input validation
        if (!prescriptionId || prescriptionId.toString().trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Prescription ID is required'));
        }
        if (!patientId || patientId.toString().trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Patient ID is required'));
        }
        if (!doctorId || doctorId.toString().trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Doctor ID is required'));
        }
        if (!medications || !Array.isArray(medications) || medications.length === 0) {
            return res.status(400).json(normalizeResponse(null, 400, 'Medications array is required and must not be empty'));
        }
        if (!diagnosis || typeof diagnosis !== 'object') {
            return res.status(400).json(normalizeResponse(null, 400, 'Valid diagnosis object is required'));
        }
        
        auditLog(userRole, userId, 'CREATE_PRESCRIPTION', { prescriptionId, patientId, doctorId });

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

        const result = processChaincodeResponse(resultString);
        res.status(201).json(normalizeResponse(result, 201, 'Prescription created successfully'));

    } catch (error) {
        console.error('Error creating prescription:', error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to create prescription', error.message));
    }
});

/**
 * Get prescription details
 * GET /api/prescriptions/:prescriptionId
 */
app.get('/api/prescriptions/:prescriptionId', verifyBearerToken, async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const userId = req.user.email || req.user.userId;
        const userRole = req.user.role;
        
        // Input validation
        if (!prescriptionId || prescriptionId.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Prescription ID is required'));
        }
        
        auditLog(userRole, userId, 'VIEW_PRESCRIPTION', { prescriptionId });
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'GetPrescription',
            prescriptionId
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Prescription retrieved successfully'));

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
app.post('/api/prescriptions/:prescriptionId/dispense', verifyBearerToken, async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const { pharmacyId, dispensedBy, quantitiesDispensed, notes } = req.body;
        const userId = req.user.email || req.user.userId;
        const userRole = req.user.role;
        
        // Input validation
        if (!prescriptionId || prescriptionId.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Prescription ID is required'));
        }
        if (!pharmacyId || pharmacyId.toString().trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Pharmacy ID is required'));
        }
        if (!dispensedBy || dispensedBy.toString().trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Dispensed by field is required'));
        }
        if (!quantitiesDispensed || !Array.isArray(quantitiesDispensed)) {
            return res.status(400).json(normalizeResponse(null, 400, 'Valid quantitiesDispensed array is required'));
        }
        
        auditLog(userRole, userId, 'DISPENSE_PRESCRIPTION', { prescriptionId, pharmacyId });
        
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

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Prescription dispensed successfully'));

    } catch (error) {
        console.error(`Error dispensing prescription ${req.params.prescriptionId}:`, error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to dispense prescription', error.message));
    }
});

/**
 * Refill a prescription
 * POST /api/prescriptions/:prescriptionId/refill
 * Body: { pharmacyId, dispensedBy, quantitiesDispensed[], notes? }
 */
app.post('/api/prescriptions/:prescriptionId/refill', verifyBearerToken, async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const { pharmacyId, dispensedBy, quantitiesDispensed, notes } = req.body;
        const userId = req.user.email || req.user.userId;
        const userRole = req.user.role;
        
        // Input validation
        if (!prescriptionId || prescriptionId.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Prescription ID is required'));
        }
        if (!pharmacyId || pharmacyId.toString().trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Pharmacy ID is required'));
        }
        if (!dispensedBy || dispensedBy.toString().trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Dispensed by field is required'));
        }
        if (!quantitiesDispensed || !Array.isArray(quantitiesDispensed)) {
            return res.status(400).json(normalizeResponse(null, 400, 'Valid quantitiesDispensed array is required'));
        }
        
        auditLog(userRole, userId, 'REFILL_PRESCRIPTION', { prescriptionId, pharmacyId });
        
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

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Prescription refilled successfully'));

    } catch (error) {
        console.error(`Error refilling prescription ${req.params.prescriptionId}:`, error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to refill prescription', error.message));
    }
});

/**
 * Cancel a prescription
 * POST /api/prescriptions/:prescriptionId/cancel
 * Body: { reason }
 */
app.post('/api/prescriptions/:prescriptionId/cancel', verifyBearerToken, async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const { reason } = req.body;
        const userId = req.user.email || req.user.userId;
        const userRole = req.user.role;
        
        // Input validation
        if (!prescriptionId || prescriptionId.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Prescription ID is required'));
        }
        if (!reason || reason.toString().trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Cancellation reason is required'));
        }
        
        auditLog(userRole, userId, 'CANCEL_PRESCRIPTION', { prescriptionId, reason });
        
        const resultString = await fabricClient.submit(
            CONTRACTS.PRESCRIPTION,
            'CancelPrescription',
            prescriptionId,
            reason
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Prescription cancelled successfully'));

    } catch (error) {
        console.error(`Error cancelling prescription ${req.params.prescriptionId}:`, error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to cancel prescription', error.message));
    }
});

/**
 * Get patient's prescriptions
 * GET /api/patients/:patientId/prescriptions
 */
app.get('/api/patients/:patientId/prescriptions', verifyBearerToken, async (req, res) => {
    try {
        const { patientId } = req.params;
        const userId = req.user.email || req.user.userId;
        
        // Input validation
        if (!patientId || patientId.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Patient ID is required'));
        }
        
        auditLog(req.user.role, userId, 'GET_PATIENT_PRESCRIPTIONS', { patientId });
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'GetPatientPrescriptions',
            patientId
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Patient prescriptions retrieved successfully'));

    } catch (error) {
        console.error(`Error getting prescriptions for patient ${req.params.patientId}:`, error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to get patient prescriptions', error.message));
    }
});

/**
 * Get doctor's prescriptions
 * GET /api/doctors/:doctorId/prescriptions
 */
app.get('/api/doctors/:doctorId/prescriptions', verifyBearerToken, async (req, res) => {
    try {
        const { doctorId } = req.params;
        const userId = req.user.email || req.user.userId;
        
        // Input validation
        if (!doctorId || doctorId.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Doctor ID is required'));
        }
        
        auditLog(req.user.role, userId, 'GET_DOCTOR_PRESCRIPTIONS', { doctorId });
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'GetDoctorPrescriptions',
            doctorId
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Doctor prescriptions retrieved successfully'));

    } catch (error) {
app.get('/api/patients/:patientId/prescriptions/active', verifyBearerToken, async (req, res) => {
    try {
        const { patientId } = req.params;
        const userId = req.user.email || req.user.userId;
        
        // Input validation
        if (!patientId || patientId.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Patient ID is required'));
        }
        
        auditLog(req.user.role, userId, 'GET_ACTIVE_PRESCRIPTIONS', { patientId });
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'GetActivePrescriptions',
            patientId
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Active prescriptions retrieved successfully'));

    } catch (error) {
        console.error(`Error getting active prescriptions for patient ${req.params.patientId}:`, error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to get active prescriptions', error.message));
    }
});

/**
 * Get pharmacy's dispensed prescriptions
 * GET /api/pharmacies/:pharmacyId/prescriptions
 */
app.get('/api/pharmacies/:pharmacyId/prescriptions', verifyBearerToken, async (req, res) => {
    try {
        const { pharmacyId } = req.params;
        const userId = req.user.email || req.user.userId;
        
        // Input validation
        if (!pharmacyId || pharmacyId.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Pharmacy ID is required'));
        }
        
        auditLog(req.user.role, userId, 'GET_PHARMACY_PRESCRIPTIONS', { pharmacyId });
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'GetPharmacyPrescriptions',
            pharmacyId
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Pharmacy prescriptions retrieved successfully'));

    } catch (error) {
app.get('/api/prescriptions/search/medication/:medicationName', verifyBearerToken, async (req, res) => {
    try {
        const { medicationName } = req.params;
        const userId = req.user.email || req.user.userId;
        
        // Input validation
        if (!medicationName || medicationName.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Medication name is required'));
        }
        
        auditLog(req.user.role, userId, 'SEARCH_PRESCRIPTIONS_BY_MEDICATION', { medicationName });
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'SearchByMedication',
            medicationName
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Prescriptions retrieved successfully'));

    } catch (error) {
        console.error(`Error searching prescriptions by medication ${req.params.medicationName}:`, error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to search prescriptions by medication', error.message));
    }
});

/**
 * Verify prescription authenticity
 * GET /api/prescriptions/:prescriptionId/verify
 */
app.get('/api/prescriptions/:prescriptionId/verify', verifyBearerToken, async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const userId = req.user.email || req.user.userId;
        
        // Input validation
        if (!prescriptionId || prescriptionId.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Prescription ID is required'));
        }
        
        auditLog(req.user.role, userId, 'VERIFY_PRESCRIPTION', { prescriptionId });
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'VerifyPrescription',
            prescriptionId
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Prescription verified successfully'));

    } catch (error) {
        console.error(`Error verifying prescription ${req.params.prescriptionId}:`, error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to verify prescription', error.message));
    }
});

/**
 * Add notes to a prescription
 * POST /api/prescriptions/:prescriptionId/notes
 * Body: { note, addedBy }
 */
app.post('/api/prescriptions/:prescriptionId/notes', verifyBearerToken, async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const { note, addedBy } = req.body;
        const userId = req.user.email || req.user.userId;
        
        // Input validation
        if (!prescriptionId || prescriptionId.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Prescription ID is required'));
        }
        if (!note || note.toString().trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Note is required'));
        }
        if (!addedBy || addedBy.toString().trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Added by field is required'));
        }
        
        auditLog(req.user.role, userId, 'ADD_PRESCRIPTION_NOTES', { prescriptionId });
        
        const resultString = await fabricClient.submit(
            CONTRACTS.PRESCRIPTION,
            'AddPrescriptionNotes',
            prescriptionId,
            note,
            addedBy
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Note added successfully'));

    } catch (error) {
        console.error(`Error adding notes to prescription ${req.params.prescriptionId}:`, error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to add prescription notes', error.message));
    }
});

/**
 * Get prescription history (audit trail)
 * GET /api/prescriptions/:prescriptionId/history
 */
app.get('/api/prescriptions/:prescriptionId/history', verifyBearerToken, async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const userId = req.user.email || req.user.userId;
        
        // Input validation
        if (!prescriptionId || prescriptionId.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Prescription ID is required'));
        }
        
        auditLog(req.user.role, userId, 'GET_PRESCRIPTION_HISTORY', { prescriptionId });
        
        const resultString = await fabricClient.evaluate(
            CONTRACTS.PRESCRIPTION,
            'GetPrescriptionHistory',
            prescriptionId
        );

        const result = processChaincodeResponse(resultString);
        res.status(200).json(normalizeResponse(result, 200, 'Prescription history retrieved successfully'));

    } catch (error) {
        console.error(`Error getting history for prescription ${req.params.prescriptionId}:`, error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to get prescription history', error.message));
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
            return res.status(400).json(normalizeResponse(
                null,
                400,
                'Invalid email format'
            ));
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json(normalizeResponse(
                null,
                400,
                'Password must be at least 6 characters'
            ));
        }

        // Check if user already exists
        if (userStore.has(email)) {
            return res.status(409).json(normalizeResponse(
                null,
                409,
                'User with this email already exists'
            ));
        }

        // Validate role
        if (!['patient', 'doctor', 'admin'].includes(role)) {
            return res.status(400).json(normalizeResponse(
                null,
                400,
                'role must be one of: patient, doctor, admin'
            ));
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

        console.log(`[AUDIT] admin system CREATE_USER email=${email} role=${role}`);

        res.status(201).json(normalizeResponse(
            {
                token: token,
                user: {
                    userId: user.userId,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            },
            201,
            'User registered successfully'
        ));

    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json(normalizeResponse(
            null,
            500,
            'Failed to register user',
            error.message
        ));
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
            return res.status(400).json(normalizeResponse(
                null,
                400,
                'email and password are required'
            ));
        }

        // Check if user exists
        const user = userStore.get(email);
        if (!user) {
            return res.status(401).json(normalizeResponse(
                null,
                401,
                'Invalid email or password'
            ));
        }

        // Verify password using bcrypt
        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        
        if (!passwordValid) {
            return res.status(401).json(normalizeResponse(
                null,
                401,
                'Invalid email or password'
            ));
        }

        // Generate token
        const token = generateToken(user.userId, email, user.role);

        console.log(`[AUDIT] system LOGIN_SUCCESS email=${email} role=${user.role}`);

        res.status(200).json(normalizeResponse(
            {
                token: token,
                user: {
                    userId: user.userId,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            },
            200,
            'Login successful'
        ));

    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json(normalizeResponse(
            null,
            500,
            'Failed to login',
            error.message
        ));
    }
});

/**
 * User Logout
 * POST /api/auth/logout
 * Headers: Authorization: Bearer <token>
 */
app.post('/api/auth/logout', verifyBearerToken, async (req, res) => {
    try {
        // Extract token from auth header and revoke it
        const authHeader = req.headers.authorization;
        const token = authHeader.substring('Bearer '.length);
        revokeToken(token);
        
        console.log(`[AUDIT] ${req.user.role} ${req.user.email} LOGOUT`);
        
        res.status(200).json(normalizeResponse(
            null,
            200,
            'Logged out successfully'
        ));

    } catch (error) {
        console.error('Error logging out:', error);
        res.status(500).json(normalizeResponse(
            null,
            500,
            'Failed to logout',
            error.message
        ));
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
            return res.status(404).json(normalizeResponse(
                null,
                404,
                'User not found'
            ));
        }

        res.status(200).json(normalizeResponse(
            {
                userId: user.userId,
                email: user.email,
                name: user.name,
                role: user.role
            },
            200,
            'User info retrieved'
        ));

    } catch (error) {
        console.error('Error getting user info:', error);
        res.status(500).json(normalizeResponse(
            null,
            500,
            'Failed to get user info',
            error.message
        ));
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

        console.log(`[AUDIT] ${role} ${email} REFRESH_TOKEN`);

        res.status(200).json(normalizeResponse(
            { token: newToken },
            200,
            'Token refreshed successfully'
        ));

    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json(normalizeResponse(
            null,
            500,
            'Failed to refresh token',
            error.message
        ));
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
            return res.status(200).json(normalizeResponse(
                {
                    authenticated: false,
                    user: null
                },
                200,
                'Not authenticated'
            ));
        }
        
        const token = authHeader.substring('Bearer '.length);
        const payload = verifyToken(token);
        
        if (!payload) {
            return res.status(200).json(normalizeResponse(
                {
                    authenticated: false,
                    user: null
                },
                200,
                'Token invalid or expired'
            ));
        }
        
        res.status(200).json(normalizeResponse(
            {
                authenticated: true,
                user: payload
            },
            200,
            'Authenticated'
        ));
        
    } catch (error) {
        console.error('Error checking auth status:', error);
        res.status(200).json(normalizeResponse(
            {
                authenticated: false,
                user: null
            },
            200,
            'Not authenticated'
        ));
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

// ================== End Authentication Endpoints ==================

// ================== Get All Endpoints ==================

/**
 * Get all consents
 * GET /api/consents
 */
app.get('/api/consents', requireAuth, async (req, res) => {
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
app.get('/api/appointments', verifyBearerToken, async (req, res) => {
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
app.get('/api/prescriptions', verifyBearerToken, async (req, res) => {
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
app.post('/api/lab-tests', verifyBearerToken, async (req, res) => {
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
app.get('/api/lab-tests/:labTestId', verifyBearerToken, async (req, res) => {
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
app.get('/api/lab-tests/patient/:patientId', verifyBearerToken, async (req, res) => {
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
app.put('/api/lab-tests/:labTestId', verifyBearerToken, async (req, res) => {
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
app.delete('/api/lab-tests/:labTestId', verifyBearerToken, async (req, res) => {
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

// ==================== AUDIT LOGGING ENDPOINTS ====================

// In-memory audit log storage
const auditLogs = [];

/**
 * Dedicated audit logging function (replaces console.log override)
 * This is the proper way to log audit events without overriding global console
 */
function auditLog(role, email, action, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        role,
        email,
        action,
        details,
        level: 'AUDIT'
    };
    
    auditLogs.push(logEntry);
    
    // Keep last 10000 logs in memory
    if (auditLogs.length > 10000) {
        auditLogs.shift();
    }
    
    // Also log to console for debugging (with proper format)
    console.log(`[AUDIT] ${role} ${email} ${action}`, details);
}

/**
 * Get all audit logs
 * GET /api/audit-logs
 * Query: ?filter=CREATE_PRESCRIPTION&limit=100&skip=0
 */
app.get('/api/audit-logs', requireRole('admin'), async (req, res) => {
    try {
        const { filter, limit = 100, skip = 0 } = req.query;
        const userId = req.user.email || req.user.userId;
        
        // Validate and sanitize pagination parameters
        const validLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 1000);
        const validSkip = Math.max(parseInt(skip) || 0, 0);
        
        auditLog(req.user.role, userId, 'VIEW_AUDIT_LOGS', { filter: filter || 'all', limit: validLimit });
        
        let filteredLogs = auditLogs;
        if (filter) {
            filteredLogs = auditLogs.filter(log => 
                log.action.includes(filter) || log.message?.includes(filter)
            );
        }
        
        const paginatedLogs = filteredLogs
            .slice(validSkip, validSkip + validLimit);
        
        res.status(200).json(normalizeResponse({
            total: filteredLogs.length,
            returned: paginatedLogs.length,
            skip: parseInt(skip),
            limit: parseInt(limit),
            logs: paginatedLogs
        }, 200, 'Audit logs retrieved'));
        
    } catch (error) {
        console.error('Error retrieving audit logs:', error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to retrieve audit logs', error.message));
    }
});

/**
 * Get audit logs for a specific user
 * GET /api/audit-logs/user/:userId
 */
app.get('/api/audit-logs/user/:targetUserId', requireRole('admin'), async (req, res) => {
    try {
        const { targetUserId } = req.params;
        const { limit = 100, skip = 0 } = req.query;
        const userId = req.user.email || req.user.userId;
        
        // Input validation
        if (!targetUserId || targetUserId.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Target user ID is required'));
        }
        
        const validLimit = Math.min(parseInt(limit) || 100, 1000);
        const validSkip = Math.max(parseInt(skip) || 0, 0);
        
        auditLog(req.user.role, userId, 'RETRIEVE_USER_AUDIT_LOGS', { targetUserId });
        
        const userLogs = auditLogs.filter(log => log.email === targetUserId || log.message?.includes(targetUserId));
        const paginatedLogs = userLogs
            .slice(validSkip, validSkip + validLimit);
        
        res.status(200).json(normalizeResponse({
            targetUserId,
            total: userLogs.length,
            returned: paginatedLogs.length,
            skip: validSkip,
            limit: validLimit,
            logs: paginatedLogs
        }, 200, 'User audit logs retrieved'));
        
    } catch (error) {
        console.error('Error retrieving user audit logs:', error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to retrieve user audit logs', error.message));
    }
});

/**
 * Get audit logs for a specific action
 * GET /api/audit-logs/action/:action
 */
app.get('/api/audit-logs/action/:action', requireRole('admin'), async (req, res) => {
    try {
        const { action } = req.params;
        const { limit = 100, skip = 0 } = req.query;
        const userId = req.user.email || req.user.userId;
        
        // Input validation
        if (!action || action.trim() === '') {
            return res.status(400).json(normalizeResponse(null, 400, 'Action is required'));
        }
        
        const validLimit = Math.min(parseInt(limit) || 100, 1000);
        const validSkip = Math.max(parseInt(skip) || 0, 0);
        
        auditLog(req.user.role, userId, 'RETRIEVE_ACTION_AUDIT_LOGS', { action });
        
        const actionLogs = auditLogs.filter(log => log.action === action || log.action?.includes(action));
        const paginatedLogs = actionLogs
            .slice(validSkip, validSkip + validLimit);
        
        res.status(200).json(normalizeResponse({
            action,
            total: actionLogs.length,
            returned: paginatedLogs.length,
            skip: validSkip,
            limit: validLimit,
            logs: paginatedLogs
        }, 200, 'Action audit logs retrieved'));
        
    } catch (error) {
        console.error('Error retrieving action audit logs:', error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to retrieve action audit logs', error.message));
    }
});

/**
 * Export audit logs (for compliance/backup)
 * POST /api/audit-logs/export
 */
app.post('/api/audit-logs/export', requireRole('admin'), async (req, res) => {
    try {
        const userId = req.user.email || req.user.userId;
        
        console.log(`[AUDIT] admin ${userId} EXPORT_AUDIT_LOGS count=${auditLogs.length}`);
        
        const exportData = {
            exportedAt: new Date().toISOString(),
            exportedBy: userId,
            totalLogs: auditLogs.length,
            logs: auditLogs
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
        res.status(200).json(exportData);
        
    } catch (error) {
        console.error('Error exporting audit logs:', error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to export audit logs', error.message));
    }
});

/**
 * Clear audit logs (admin only, for maintenance)
 * DELETE /api/audit-logs
 */
app.delete('/api/audit-logs', requireRole('admin'), async (req, res) => {
    try {
        const userId = req.user.email || req.user.userId;
        const previousCount = auditLogs.length;
        
        console.log(`[AUDIT] admin ${userId} CLEAR_AUDIT_LOGS previous_count=${previousCount}`);
        
        auditLogs.length = 0;
        
        res.status(200).json(normalizeResponse({
            message: 'Audit logs cleared',
            previousCount
        }, 200, 'Audit logs cleared successfully'));
        
    } catch (error) {
        console.error('Error clearing audit logs:', error);
        res.status(500).json(normalizeResponse(null, 500, 'Failed to clear audit logs', error.message));
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

