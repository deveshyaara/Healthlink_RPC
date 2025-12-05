# 🔧 HealthLink Pro - Troubleshooting Guide

> **Solutions to the Hard Problems We Solved**

This document compiles solutions to critical issues encountered during development. Each problem includes root cause analysis and step-by-step solutions.

---

## 📋 Table of Contents

1. [DiscoveryService: Access Denied](#1-discoveryservice-access-denied)
2. [ECONNREFUSED - Backend Connection Failed](#2-econnrefused---backend-connection-failed)
3. [Authentication Failed - Global Interceptor Issue](#3-authentication-failed---global-interceptor-issue)
4. [Mock Data in Production](#4-mock-data-in-production)
5. [File Upload - Data Loss Issue](#5-file-upload---data-loss-issue)
6. [Proxy Configuration Not Working](#6-proxy-configuration-not-working)
7. [Chaincode Deployment Failures](#7-chaincode-deployment-failures)
8. [Session Expired on Page Refresh](#8-session-expired-on-page-refresh)

---

## 1. DiscoveryService: Access Denied

### ❌ Problem

```
Error: DiscoveryService: mychannel error: access denied: channel [mychannel] 
creator org [Org1MSP]
```

### 🔍 Root Cause

The Fabric Gateway SDK tries to connect to peers using **localhost** addresses, but inside Docker containers, peers are accessible via their **container names** (e.g., `peer0.org1.example.com`), not `localhost`.

### ✅ Solution

**Step 1: Update Connection Profile**

File: `/middleware-api/config/connection-profile.json`

**BEFORE (BROKEN):**
```json
{
  "peers": {
    "peer0.org1.example.com": {
      "url": "grpcs://localhost:7051"
    }
  }
}
```

**AFTER (FIXED):**
```json
{
  "peers": {
    "peer0.org1.example.com": {
      "url": "grpcs://peer0.org1.example.com:7051",
      "grpcOptions": {
        "ssl-target-name-override": "peer0.org1.example.com"
      }
    }
  }
}
```

**Step 2: Verify Docker Network**

```bash
docker network inspect fabric_test
# Ensure all containers are on the same network
```

**Step 3: Test Connection**

```bash
cd middleware-api
node -e "const gateway = require('./src/services/fabricGateway.service.js'); gateway.connectGateway();"
```

**Expected Output:**
```
✅ Connected to Fabric Gateway
```

---

## 2. ECONNREFUSED - Backend Connection Failed

### ❌ Problem

Frontend console error:
```
Failed to proxy http://localhost:3000/api/auth/login [AggregateError] 
{ code: 'ECONNREFUSED' }
```

### 🔍 Root Cause

The **middleware backend is not running** on port 3000, so the Next.js proxy cannot forward requests.

### ✅ Solution

**Step 1: Check if Backend is Running**

```bash
lsof -i :3000
# If empty → Backend is DOWN
```

**Step 2: Start Backend**

```bash
cd /workspaces/Healthlink_RPC/middleware-api
./start-backend.sh
```

**Step 3: Verify Health Endpoint**

```bash
curl http://localhost:3000/health
```

**Expected Output:**
```json
{
  "status": "UP",
  "timestamp": "2025-12-05T12:00:00.000Z"
}
```

**Step 4: Verify Fabric Network is Running**

```bash
docker ps | grep peer
# Should show 2+ peer containers
```

### 🛡️ Prevention

Add this to your startup routine:
```bash
# Always start backend before frontend
./start.sh  # Starts everything in order
```

---

## 3. Authentication Failed - Global Interceptor Issue

### ❌ Problem

**Scenario:** User tries to login with invalid credentials

**Expected:** Error toast: "Invalid username or password"

**Actual:** User is redirected to `/login?error=session_expired` and sees "Session expired"

### 🔍 Root Cause

The **Global 401 Handler** in `api-client.ts` was treating ALL 401 errors as "session expired" events, including login failures.

**Code (BROKEN):**
```typescript
if (response.status === 401) {
  console.error('Authentication failed - redirecting');
  localStorage.removeItem('auth_token');
  window.location.href = '/login?error=session_expired';
  throw new Error('401: Authentication required');
}
```

### ✅ Solution

**Implement Smart 401 Handling**

File: `/frontend/src/lib/api-client.ts`

**AFTER (FIXED):**
```typescript
if (response.status === 401) {
  // Define auth endpoints that should NOT trigger global logout
  const authEndpoints = ['/auth/login', '/auth/register', '/login', '/register'];
  const isAuthEndpoint = authEndpoints.some(authPath => endpoint.includes(authPath));
  
  if (isAuthEndpoint) {
    // ❌ LOGIN FAILURE - Pass error to UI (don't logout)
    let errorMessage = 'Authentication failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || 'Invalid username or password';
    } catch {}
    throw new Error(errorMessage);  // UI catches this
  } else {
    // ✅ SESSION EXPIRED - Trigger global logout
    console.error('Session expired - redirecting');
    localStorage.removeItem('auth_token');
    window.location.href = '/login?error=session_expired';
    throw new Error('Session expired');
  }
}
```

**How It Works:**
- **Login fails (401)** → Error message shown to user (no redirect)
- **Protected route fails (401)** → Auto-logout and redirect
- **Session expires** → Seamless redirect to login

**Test:**
```bash
# Test 1: Invalid login (should NOT redirect)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@test.com","password":"wrong"}'

# Expected: {"status":"error","message":"Invalid credentials"}

# Test 2: Expired token on protected route (should redirect)
# 1. Login successfully
# 2. Delete token from localStorage
# 3. Try to access /dashboard
# Expected: Redirect to /login?error=session_expired
```

---

## 4. Mock Data in Production

### ❌ Problem

**File uploads were generating mock IPFS hashes:**
```typescript
const mockIpfsHash = `Qm${Math.random().toString(36).substring(7)}`;
```

**Result:**
- Uploaded files were lost after form submission
- Download buttons didn't work
- No actual file storage

### 🔍 Root Cause

The form was designed with **placeholder logic** during development, but the CAS (Content-Addressable Storage) system was never integrated.

### ✅ Solution

**Step 1: Implement CAS Backend**

Created:
- `/middleware-api/src/services/storage.service.js` (SHA-256 hashing)
- `/middleware-api/src/controllers/storage.controller.js` (upload/download handlers)
- `/middleware-api/src/routes/storage.routes.js` (Multer middleware)

**Step 2: Replace Mock Hash with Real API Call**

File: `/frontend/src/components/forms/upload-record-form.tsx`

**BEFORE (MOCK):**
```typescript
const mockIpfsHash = `Qm${Math.random().toString(36).substring(7)}`;
// File data is lost here!
```

**AFTER (REAL):**
```typescript
// Step 1: Upload file to storage API
const formData = new FormData();
formData.append('file', file);

const uploadResponse = await fetch('http://localhost:3000/api/storage/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const { hash: realHash } = await uploadResponse.json();  // Real SHA-256 hash

// Step 2: Store hash on blockchain
await medicalRecordsApi.createRecord({
  title: data.title,
  ipfsHash: realHash,  // ✅ Real hash, not mock
  // ... other fields
});
```

**Step 3: Implement Download Handler**

File: `/frontend/src/app/dashboard/records/page.tsx`

```typescript
const handleDownload = async (hash: string) => {
  const response = await fetch(`http://localhost:3000/api/storage/${hash}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `record-${hash.substring(0, 8)}.pdf`;
  a.click();
};
```

**Verification:**
```bash
# Upload a file
curl -X POST http://localhost:3000/api/storage/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf"

# Response:
# {"hash":"a7b3c9d2e1f...","filename":"test.pdf"}

# Download the file
curl -O http://localhost:3000/api/storage/a7b3c9d2e1f...

# Verify hash matches
sha256sum test.pdf
# Should match the returned hash
```

---

## 5. File Upload - Data Loss Issue

### ❌ Problem

Files uploaded via the form would:
1. Show success message
2. Appear in the records list
3. **But clicking "Download" returned 404**

### 🔍 Root Cause Analysis

**The Problem Chain:**
1. Form generated mock hash → File never actually stored
2. Hash stored on blockchain → But points to non-existent file
3. Download request → 404 because file doesn't exist

### ✅ Solution: Content-Addressable Storage

**Architecture:**
```
Upload Flow:
User → FormData → Multer → SHA-256 → uploads/{hash} → Return hash → Blockchain

Download Flow:
User → Click download → GET /api/storage/{hash} → Read file → Verify hash → Stream to browser
```

**File Storage Structure:**
```
uploads/
├── a7b3c9d2e1f4567890abcdef1234567890abcdef1234567890abcdef12345678
├── b8c4d3e2f5g6789012bcdefg2345678901bcdefg2345678901bcdefg23456789
└── metadata/
    ├── a7b3c9d2e1f4567890abcdef1234567890abcdef1234567890abcdef12345678.json
    └── b8c4d3e2f5g6789012bcdefg2345678901bcdefg2345678901bcdefg23456789.json
```

**Key Features:**
- ✅ **Integrity:** Hash recalculated on download to verify file hasn't been tampered with
- ✅ **Deduplication:** Same file uploaded twice = same hash = single storage
- ✅ **Immutability:** Files cannot be modified (hash would change)

---

## 6. Proxy Configuration Not Working

### ❌ Problem

Frontend makes API call:
```typescript
fetch('/api/auth/login', { method: 'POST', body: {...} })
```

**Expected:** Request proxied to `http://localhost:3000/api/auth/login`

**Actual:** `404 Not Found` or `ECONNREFUSED`

### 🔍 Root Cause

**Two Issues:**
1. `next.config.ts` had NO `rewrites()` function
2. Duplicate `next.config.js` file conflicting with TypeScript config

### ✅ Solution

**Step 1: Remove Duplicate Config**

```bash
cd frontend
mv next.config.js next.config.js.backup
```

**Step 2: Add Proxy Rewrites**

File: `/frontend/next.config.ts`

```typescript
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // ... other config

  // ✅ PROXY CONFIGURATION
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
```

**Step 3: Restart Frontend**

```bash
npm run dev
# Ctrl+C first if already running
```

**Verification:**
```bash
# Check Network tab in browser DevTools
# Request to: http://localhost:9002/api/auth/login
# Should NOT show CORS errors
# Should show response from backend
```

---

## 7. Chaincode Deployment Failures

### ❌ Problem

```
Error: Chaincode installation failed on peer0.org1.example.com
Could not find chaincode with name 'healthlink'
```

### 🔍 Root Cause

Chaincodes not properly packaged or installed on both organizations.

### ✅ Solution

**Step 1: Clean Existing Network**

```bash
cd fabric-samples/test-network
./network.sh down
```

**Step 2: Restart with Fresh Deployment**

```bash
./network.sh up createChannel -ca -s couchdb
./network.sh deployCC -ccn healthlink -ccp ../chaincode/healthlink-contract -ccl javascript -ccv 1.0 -ccs 1
```

**Step 3: Verify Deployment**

```bash
docker ps | grep healthlink
# Should show chaincode containers running
```

**Step 4: Query Installed Chaincodes**

```bash
peer lifecycle chaincode queryinstalled
```

**Expected Output:**
```
Installed chaincodes on peer:
Package ID: healthlink_1.0:89f71a73ab9d7233387e6fc19901d4b7d4758c58b42e94af81e462d81202d2a2, Label: healthlink_1.0
```

---

## 8. Session Expired on Page Refresh

### ❌ Problem

User logs in successfully, but refreshing the page redirects to login.

### 🔍 Root Cause

JWT token stored in `localStorage` but not being retrieved on page load.

### ✅ Solution

**File: `/frontend/src/contexts/auth-context.tsx`**

```typescript
useEffect(() => {
  // Check for existing token on mount
  const token = localStorage.getItem('auth_token');
  if (token) {
    // Validate token by calling /api/auth/me
    authApi.getMe()
      .then(user => setUser(user))
      .catch(() => {
        // Token invalid or expired
        localStorage.removeItem('auth_token');
      });
  }
}, []);
```

---

## 🔍 Debugging Tools

### Check All System Status

```bash
# Run comprehensive health check
cd /workspaces/Healthlink_RPC/middleware-api
./test-backend.sh
```

### View Logs

```bash
# Backend logs
tail -f /workspaces/Healthlink_RPC/middleware-api/backend.log

# Fabric logs
docker logs peer0.org1.example.com

# Frontend logs (in terminal running npm run dev)
```

### Test Endpoints Manually

```bash
# Health check
curl http://localhost:3000/health

# Login (expect 401 for invalid credentials)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Storage upload (needs valid token)
curl -X POST http://localhost:3000/api/storage/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf"
```

---

## 📞 Still Having Issues?

1. **Check Prerequisites:** Docker, Node.js versions
2. **Review Logs:** Backend, Frontend, Docker containers
3. **Run Health Check:** `./test-backend.sh`
4. **Restart Everything:** `./stop.sh && ./start.sh`

---

**Last Updated:** December 5, 2025  
**Version:** 1.0.0
