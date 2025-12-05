# ✅ HealthLink Backend - Start & Verification Guide

**Date:** December 5, 2025  
**Status:** ✅ COMPLETE - Backend Running Successfully

---

## 📋 TASK 1: ROBUST START SCRIPT ✅

### Quick Start (Recommended)

```bash
cd /workspaces/Healthlink_RPC/middleware-api
./start-backend.sh
```

**What it does:**
- ✅ Verifies `wallet/` directory exists
- ✅ Verifies `connection-profile.json` exists
- ✅ Checks if port 3000 is already in use
- ✅ Installs dependencies if missing
- ✅ Starts server with clear "LISTENING ON PORT 3000" message

### Alternative: Background Mode

```bash
cd /workspaces/Healthlink_RPC/middleware-api
nohup node src/server.js > backend.log 2>&1 &
```

**View logs:**
```bash
tail -f /workspaces/Healthlink_RPC/middleware-api/backend.log
```

**Stop backend:**
```bash
pkill -f "node.*server.js"
```

### Expected Output

```
╔════════════════════════════════════════════════════════════╗
║   HealthLink Middleware API Server                        ║
║   Environment: development                                ║
║   HTTP Port: 3000                                         ║
║   WebSocket Port: 4001                                    ║
║   API Version: v1                                         ║
║                                                            ║
║   HTTP API: http://localhost:3000                         ║
║   WebSocket: ws://localhost:4001/ws                       ║
║   Health Check: http://localhost:3000/health              ║
╚════════════════════════════════════════════════════════════╝

✅ Server started successfully
```

---

## 📋 TASK 2: PROXY CONFIGURATION ✅

### Fixed File: `/workspaces/Healthlink_RPC/frontend/next.config.ts`

**Before (BROKEN - No Proxy):**
```typescript
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // ❌ NO REWRITES - Requests fail with ECONNREFUSED
};
```

**After (FIXED - Proxy Enabled):**
```typescript
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  
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
```

**How It Works:**
```
User → http://localhost:9002/api/auth/login
       ↓ (Next.js rewrites)
Backend → http://localhost:3000/api/auth/login
```

**Removed Duplicate:**
- Backed up `/workspaces/Healthlink_RPC/frontend/next.config.js.backup`
- Now using only `next.config.ts`

### Restart Frontend (After Config Change)

```bash
cd /workspaces/Healthlink_RPC/frontend
# Kill existing process (Ctrl+C)
npm run dev
```

---

## 📋 TASK 3: HEALTH CHECK COMMANDS ✅

### Automated Health Check Script

```bash
cd /workspaces/Healthlink_RPC/middleware-api
./test-backend.sh
```

**Tests performed:**
1. ✅ Health endpoint (`/health`)
2. ✅ Login endpoint (`/api/auth/login`)
3. ✅ Register endpoint (`/api/auth/register`)
4. ✅ Network status (blockchain connection)
5. ✅ Port 3000 listening verification

### Manual Health Check Commands

**1. Basic Health Check:**
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "UP",
  "timestamp": "2025-12-05T12:04:13.766Z",
  "service": "healthlink-middleware-api",
  "version": "1.0.0"
}
```

**2. Test Login Endpoint:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

**Expected Response (401 for invalid credentials):**
```json
{
  "status": "error",
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": {
    "code": "AUTH_FAILED",
    "details": "Invalid credentials"
  }
}
```

**3. Test Register Endpoint:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "SecurePass123!",
    "role": "patient"
  }'
```

**Expected Response (201 Created):**
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "Registration successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "johndoeexamplecom",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "patient"
    }
  }
}
```

**4. Check if Backend is Running:**
```bash
lsof -i :3000
# OR
ps aux | grep "node.*server.js" | grep -v grep
```

**5. View Backend Logs:**
```bash
tail -f /workspaces/Healthlink_RPC/middleware-api/backend.log
```

---

## 📋 TASK 4: AUTH ENDPOINTS VERIFICATION ✅

### Confirmed Route Structure

**File:** `/workspaces/Healthlink_RPC/middleware-api/src/server.js`

```javascript
// Line 143: Auth routes registered correctly
app.use('/api/auth', authRoutes);
```

**File:** `/workspaces/Healthlink_RPC/middleware-api/src/routes/auth.routes.js`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user + blockchain identity | Public |
| POST | `/api/auth/login` | Login with email/password, returns JWT | Public |
| POST | `/api/auth/logout` | Logout (client-side token removal) | Private |
| GET | `/api/auth/me` | Get current user profile | Private |
| POST | `/api/auth/refresh` | Refresh JWT token | Private |
| POST | `/api/auth/change-password` | Change password | Private |

### Frontend API Client Alignment

**File:** `/workspaces/Healthlink_RPC/frontend/src/lib/api-client.ts`

```typescript
export const authApi = {
  register: async (data: { name: string; email: string; password: string; role: string }) => {
    return apiRequest<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: false,
    });
  },

  login: async (credentials: { email: string; password: string }) => {
    return apiRequest<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      requiresAuth: false,
    });
  },
};
```

**✅ Routes are perfectly aligned:**
- Frontend calls: `/api/auth/login` → Proxy → Backend: `/api/auth/login`
- Frontend calls: `/api/auth/register` → Proxy → Backend: `/api/auth/register`

---

## 🎯 FINAL VERIFICATION CHECKLIST

### Backend Status
- ✅ Port 3000 is listening
- ✅ Health endpoint returns `200 OK`
- ✅ Auth login endpoint returns `401` (correct error for invalid credentials)
- ✅ Auth register endpoint creates users and returns JWT token
- ✅ Wallet directory exists
- ✅ Connection profile exists

### Frontend Status
- ✅ Running on port 9002
- ✅ `next.config.ts` has proxy rewrites
- ✅ No duplicate config files
- ✅ API client configured correctly

### Integration Test
```bash
# 1. Start backend (if not already running)
cd /workspaces/Healthlink_RPC/middleware-api
./start-backend.sh

# 2. In another terminal, start frontend
cd /workspaces/Healthlink_RPC/frontend
npm run dev

# 3. Open browser
http://localhost:9002/login

# 4. Try registering a new user
http://localhost:9002/signup
```

**Expected Result:**
- ✅ No more `ECONNREFUSED` errors
- ✅ Login form shows "Invalid credentials" for wrong password (not a proxy error)
- ✅ Register form creates user and redirects to dashboard

---

## 🚨 TROUBLESHOOTING

### Issue: `ECONNREFUSED` on `/api/auth/login`

**Diagnosis:**
```bash
lsof -i :3000
# If empty → Backend is not running
```

**Solution:**
```bash
cd /workspaces/Healthlink_RPC/middleware-api
./start-backend.sh
```

### Issue: `404 Not Found` on auth endpoints

**Diagnosis:**
```bash
curl http://localhost:3000/api/auth/login
# Should NOT return 404
```

**Solution:**
- Check `server.js` has: `app.use('/api/auth', authRoutes)`
- Restart backend

### Issue: Proxy not working after config change

**Solution:**
```bash
# Restart Next.js dev server
cd /workspaces/Healthlink_RPC/frontend
# Ctrl+C to kill
npm run dev
```

### Issue: Backend crashes on startup

**Check logs:**
```bash
cat /workspaces/Healthlink_RPC/middleware-api/backend.log
```

**Common causes:**
- Missing `wallet/` directory → Run Fabric network first
- Missing `connection-profile.json` → Copy from Fabric network
- Port 3000 already in use → Kill existing process: `pkill -f "node.*server.js"`

---

## 📊 SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                       │
│                  http://localhost:9002                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ POST /api/auth/login
                     │ POST /api/auth/register
                     ↓
┌─────────────────────────────────────────────────────────┐
│              NEXT.JS FRONTEND (Port 9002)               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  next.config.ts - Rewrites Configuration        │  │
│  │                                                   │  │
│  │  async rewrites() {                              │  │
│  │    return {                                      │  │
│  │      beforeFiles: [                              │  │
│  │        {                                         │  │
│  │          source: '/api/:path*',                  │  │
│  │          destination: 'http://localhost:3000/...'│  │
│  │        }                                         │  │
│  │      ]                                           │  │
│  │    };                                            │  │
│  │  }                                               │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Proxied to http://localhost:3000/api/...
                     ↓
┌─────────────────────────────────────────────────────────┐
│         NODE.JS MIDDLEWARE API (Port 3000)              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  server.js                                       │  │
│  │  ├─ app.use('/api/auth', authRoutes)            │  │
│  │  ├─ app.use('/api/storage', storageRoutes)      │  │
│  │  └─ app.use('/api/v1', transactionRoutes)       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  routes/auth.routes.js                           │  │
│  │  ├─ POST /register → authController.register     │  │
│  │  ├─ POST /login    → authController.login        │  │
│  │  └─ GET  /me       → authController.getMe        │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Fabric Gateway SDK
                     ↓
┌─────────────────────────────────────────────────────────┐
│       HYPERLEDGER FABRIC NETWORK (Peers/Orderers)       │
│  ├─ healthlink-contract                                 │
│  ├─ patient-records-contract                            │
│  ├─ doctor-credentials-contract                         │
│  ├─ appointment-contract                                │
│  └─ prescription-contract                               │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 KEY FILES CREATED/MODIFIED

### Created Files ✅
1. `/workspaces/Healthlink_RPC/middleware-api/start-backend.sh`
   - Robust startup script with prerequisite checks

2. `/workspaces/Healthlink_RPC/middleware-api/test-backend.sh`
   - Comprehensive health check script

3. `/workspaces/Healthlink_RPC/middleware-api/API_ROUTES.md`
   - Complete API documentation

4. `/workspaces/Healthlink_RPC/middleware-api/DEPLOYMENT_SUMMARY.md` (this file)
   - Complete deployment guide

### Modified Files ✅
1. `/workspaces/Healthlink_RPC/frontend/next.config.ts`
   - Added proxy rewrites configuration

2. `/workspaces/Healthlink_RPC/frontend/next.config.js`
   - Backed up to `.backup` (removed duplicate)

---

## 🎉 SUCCESS CRITERIA

All tasks completed successfully:

✅ **Task 1:** Robust start script created (`start-backend.sh`)  
✅ **Task 2:** Proxy configuration fixed (`next.config.ts`)  
✅ **Task 3:** Health check commands verified (`test-backend.sh`)  
✅ **Task 4:** Auth endpoints verified and documented  

**Current Status:**
- ✅ Backend running on port 3000
- ✅ Health endpoint returning 200 OK
- ✅ Auth login endpoint returning proper 401 errors
- ✅ Auth register endpoint creating users successfully
- ✅ Frontend proxy configured correctly
- ✅ Integration ready for testing

**Next Steps:**
1. Open browser: `http://localhost:9002/login`
2. Test registration: Create new user
3. Test login: Use registered credentials
4. Verify dashboard access

---

**Generated:** December 5, 2025  
**Project:** HealthLink RPC  
**Backend Status:** ✅ RUNNING  
**Frontend Status:** ✅ RUNNING  
**Integration Status:** ✅ READY
