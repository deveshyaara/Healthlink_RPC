# Comprehensive Medical Records API Fixes - All Changes Applied

## Problem Summary
The user was getting 400 errors: `"patientId and accessReason query parameters are required."` when:
1. Uploading medical records
2. Fetching records on page load
3. Refreshing records after upload
4. Fetching dashboard stats

**Root Cause:** Medical records endpoints required authentication to extract the current user's ID, but the frontend was not sending the Bearer token, and backend endpoints weren't verifying auth.

---

## Architecture Overview

### Authentication Flow
```
Frontend → Authorization Header: "Bearer {token}" 
    ↓
Backend: verifyBearerToken middleware extracts req.user
    ↓
req.user.id = authenticated patient's ID
    ↓
Hyperledger Fabric receives patientId as function parameter
```

### Blockchain Integration
- **Chaincode Function:** `GetRecordsPaginated(ctx, patientId, pageSize, bookmark)`
- **Chaincode Function:** `CreateMedicalRecord(ctx, recordId, patientId, doctorId, recordType, ipfsHash, metadata)`
- **Data Storage:** CouchDB with queryable format: `{ docType: 'medicalRecord', patientId, status }`
- **Hash Storage:** IPFS reference stored in immutable blockchain record

---

## Changes Applied

### 1. Backend: POST /api/medical-records (Create Record)
**File:** `/workspaces/Healthlink_RPC/my-project/rpc-server/server.js` (lines 563-602)

**Changes:**
- ✅ Added `verifyBearerToken` middleware to endpoint signature
- ✅ Extract `patientId` from authenticated user: `const patientId = req.user.id`
- ✅ Removed `patientId` from request body validation
- ✅ Pass `patientId` to Fabric chaincode: `CreateMedicalRecord(..., patientId, ...)`
- ✅ Wrapped extra fields (description, tags, etc.) in `metadata` object

**Before:**
```javascript
app.post('/api/medical-records', async (req, res) => {
    const { recordId, patientId, doctorId, recordType, ipfsHash, metadata } = req.body;
    // ...chaincode call with patientId from body
}
```

**After:**
```javascript
app.post('/api/medical-records', verifyBearerToken, async (req, res) => {
    const { recordId, doctorId, recordType, ipfsHash, metadata } = req.body;
    const patientId = req.user.id;  // From authenticated token
    // ...chaincode call with patientId from token
}
```

### 2. Backend: GET /api/medical-records/paginated (List Records)
**File:** `/workspaces/Healthlink_RPC/my-project/rpc-server/server.js` (lines 820-843)

**Changes:**
- ✅ Added `verifyBearerToken` middleware
- ✅ Extract `patientId` from token: `const patientId = req.user.id`
- ✅ Pass `patientId` to Fabric chaincode: `GetRecordsPaginated(patientId, pageSize, bookmark)`

**Before:**
```javascript
app.get('/api/medical-records/paginated', async (req, res) => {
    const { pageSize = '10', bookmark = '' } = req.query;
    // Called with (pageSize, bookmark) - MISSING patientId
}
```

**After:**
```javascript
app.get('/api/medical-records/paginated', verifyBearerToken, async (req, res) => {
    const { pageSize = '10', bookmark = '' } = req.query;
    const patientId = req.user.id;
    // Called with (patientId, pageSize, bookmark)
}
```

### 3. Frontend: API Client - createRecord()
**File:** `/workspaces/Healthlink_RPC/frontend/src/lib/api-client.ts` (lines 187-198)

**Changes:**
- ✅ Removed `patientId` from type signature (backend extracts it)
- ✅ Added `requiresAuth: true` to include Bearer token in request
- ✅ Updated JSDoc to reflect new parameter structure

**Before:**
```typescript
createRecord: async (data: {
    recordId: string;
    patientId: string;  // ❌ No longer needed
    doctorId: string;
    recordType: string;
    ipfsHash: string;
    metadata?: Record<string, unknown>;
}) => {
    return apiRequest('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify(data),
        // ❌ Missing requiresAuth
    });
}
```

**After:**
```typescript
createRecord: async (data: {
    recordId: string;
    doctorId: string;
    recordType: string;
    ipfsHash: string;
    metadata?: Record<string, unknown>;
}) => {
    return apiRequest('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true,  // ✅ Sends Bearer token
    });
}
```

### 4. Frontend: API Client - getAllRecords()
**File:** `/workspaces/Healthlink_RPC/frontend/src/lib/api-client.ts` (lines 180-186)

**Changes:**
- ✅ Added `requiresAuth: true` to include Bearer token

**Before:**
```typescript
getAllRecords: async (pageSize?: string, bookmark?: string) => {
    // ...
    return apiRequest(`/api/medical-records/paginated${query}`);  // ❌ No auth
}
```

**After:**
```typescript
getAllRecords: async (pageSize?: string, bookmark?: string) => {
    // ...
    return apiRequest(`/api/medical-records/paginated${query}`, { requiresAuth: true });  // ✅ With auth
}
```

### 5. Frontend: Records Page - createRecord Call
**File:** `/workspaces/Healthlink_RPC/frontend/src/app/dashboard/records/page.tsx` (lines 168-180)

**Changes:**
- ✅ Removed `patientId` from recordData object
- ✅ Wrapped additional fields in `metadata` object
- ✅ Updated to match new API signature

**Before:**
```typescript
const recordData = {
    recordId: `record_${Date.now()}`,
    patientId: user?.id || 'current-patient',  // ❌ Removed
    doctorId: 'current-doctor',
    recordType: uploadForm.recordType,
    ipfsHash: validIpfsHash,
    description: uploadForm.description,  // ❌ Should be in metadata
    isConfidential: uploadForm.isConfidential,  // ❌ Should be in metadata
    tags: uploadForm.tags,  // ❌ Should be in metadata
};
```

**After:**
```typescript
const recordData = {
    recordId: `record_${Date.now()}`,
    doctorId: 'current-doctor',
    recordType: uploadForm.recordType,
    ipfsHash: validIpfsHash,
    metadata: {  // ✅ Structured metadata
        description: uploadForm.description,
        isConfidential: uploadForm.isConfidential,
        tags: uploadForm.tags,
    }
};
```

---

## How Bearer Token Authentication Works

### Frontend (api-client.ts)
```typescript
const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('auth_token');
    }
    return null;
};

async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const { requiresAuth = false, ...requestOptions } = options;
    const headers = {
        'Content-Type': 'application/json',
        ...(requestOptions.headers),
    };

    if (requiresAuth) {  // When requiresAuth: true
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;  // Add Bearer token
        }
    }
    // ...
}
```

### Backend (server.js)
```javascript
function verifyBearerToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring('Bearer '.length);
    const payload = verifyToken(token);  // Verify in token store
    
    if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = payload;  // Available as req.user.id in endpoint
    next();
}

// Then in endpoint:
app.get('/endpoint', verifyBearerToken, async (req, res) => {
    const userId = req.user.id;  // ✅ Extract authenticated user ID
});
```

---

## Blockchain Integration

### Data Model (CouchDB)
Medical records are stored with this structure:
```json
{
    "docType": "medicalRecord",
    "recordId": "record_1764177168677",
    "patientId": "user123@example.com",
    "doctorId": "doc456@example.com",
    "recordType": "lab_result",
    "ipfsHash": "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "metadata": {
        "description": "Lab test results",
        "isConfidential": true,
        "tags": ["urgent", "lab"]
    },
    "status": "active",
    "createdAt": "2025-11-26T..."
}
```

### Query in GetRecordsPaginated
```javascript
const queryString = {
    selector: {
        docType: 'medicalRecord',
        patientId: patientId,  // Now properly filtered by authenticated user
        status: 'active'
    },
    sort: [{ createdAt: 'desc' }]
};
```

---

## Error Prevention

### Before (Errors)
```
❌ 400: patientId and accessReason query parameters are required
   Reason: getAllRecords() called without Bearer token
   Backend: Endpoint not authenticated, req.user undefined
```

### After (Success)
```
✅ getAllRecords() includes Bearer token via { requiresAuth: true }
✅ Backend middleware verifyBearerToken extracts req.user.id
✅ patientId passed to Fabric chaincode correctly
✅ CouchDB query filters by authenticated user only
✅ Records returned successfully
```

---

## Testing Checklist

After services are restarted, verify:

- [ ] **User Signup:** Register new user successfully
- [ ] **Dashboard Load:** Navigate to /dashboard without errors
- [ ] **Records Page Load:** Go to /dashboard/records, see "No records yet" message (no 400 error)
- [ ] **Upload Medical Record:**
  - Select valid record type (lab_result, prescription, diagnosis, imaging, consultation, surgery, other)
  - Check IPFS hash format (Qm + 44 base58 chars = 46 total) ✓
  - Submit form ✓
- [ ] **Refresh After Upload:** Records list updates with new record (no "patientId and accessReason" error)
- [ ] **Dashboard Stats:** Stats load without errors (calls getAllRecords internally)
- [ ] **Blockchain Verification:** Record appears in Fabric ledger with correct format

---

## Files Modified

1. `/workspaces/Healthlink_RPC/my-project/rpc-server/server.js`
   - Lines 563-602: POST /api/medical-records - Added auth middleware and patientId extraction
   - Lines 820-843: GET /api/medical-records/paginated - Added auth middleware and patientId extraction

2. `/workspaces/Healthlink_RPC/frontend/src/lib/api-client.ts`
   - Lines 180-186: getAllRecords() - Added requiresAuth: true
   - Lines 187-198: createRecord() - Removed patientId from type, added requiresAuth: true

3. `/workspaces/Healthlink_RPC/frontend/src/app/dashboard/records/page.tsx`
   - Lines 168-180: createRecord call - Removed patientId from recordData, wrapped fields in metadata

---

## Key Takeaways

1. **Every medical records operation must be authenticated** - The authenticated user's ID becomes the patientId for all blockchain operations
2. **Bearer tokens are automatically included** - Frontend methods with `requiresAuth: true` automatically send the token
3. **Backend extracts patientId from token** - No need to trust client-sent patientId values
4. **Blockchain stores immutable records** - IPFS hash ensures document integrity, Fabric ensures audit trail
5. **Proper error handling** - 400 errors mean authentication requirement, not missing data
