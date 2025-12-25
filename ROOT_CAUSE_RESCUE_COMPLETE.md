# 🚨 Vercel Deployment Root Cause Rescue - Complete Analysis & Fix Guide

**Generated:** 2025-01-XX  
**Status:** Ready for Implementation

---

## Executive Summary

This document provides a complete root cause analysis and fix guide for the HealthLink distributed system deployment. The application consists of:
- **Frontend:** Next.js application (Vercel)
- **Backend:** Node.js/Express Middleware (Render)
- **Database:** Supabase PostgreSQL (with transaction pooler)
- **Blockchain:** Ethereum Sepolia testnet

### Critical Issues Identified

1. ✅ **Security Risk:** `.env.production` files committed to repository (exposed secrets)
2. ✅ **Connection Failure:** Frontend may point to `localhost` instead of production backend
3. ✅ **Serverless Configuration:** Backend `vercel.json` exists but needs verification
4. ✅ **Timeout Issues:** Blockchain transactions may exceed 10s default timeout

---

## Step 1: Security & Config Audit (The "Env" Fix)

### 1.1 Analysis: How Environment Variables Are Loaded

#### Frontend (Next.js)
- **Location:** `frontend/src/lib/env-utils.ts`, `frontend/src/config/api.config.ts`
- **Behavior:**
  - Next.js automatically loads `NEXT_PUBLIC_*` variables from `process.env` at build time
  - Vercel injects environment variables from Dashboard into `process.env` during build
  - **CRITICAL:** `.env.production` files in the repo are **NOT** read by Vercel deployments
  - Fallback logic defaults to `localhost:4000` if `NEXT_PUBLIC_API_URL` is not set

#### Backend (Express)
- **Location:** `middleware-api/src/config/index.js`
- **Behavior:**
  ```javascript
  // Only loads .env files in local development
  if (process.env.VERCEL !== '1') {
    const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
    dotenv.config({ path: envPath });
  }
  ```
  - ✅ **CORRECT:** Backend already checks for Vercel environment and skips `.env` files
  - Environment variables must be set in Vercel Dashboard

### 1.2 Root Cause: Vercel Environment Variable Loading

**The Problem:**
- Vercel deployments **DO NOT** read `.env.production` files from the repository
- Environment variables must be configured in **Vercel Dashboard → Project Settings → Environment Variables**
- Files found in repository:
  - `frontend/.env.production` ❌
  - `middleware-api/.env.production` ❌
  - `frontend/.next/standalone/.env.production` ❌

**The Fix:**
1. Remove `.env.production` files from repository (security risk)
2. Add all required variables to Vercel Dashboard for each project

### 1.3 Required Environment Variables

#### **Frontend Project (Vercel Project A)**

Go to: **Vercel Dashboard → [Your Frontend Project] → Settings → Environment Variables**

Add these variables (set for **Production**, **Preview**, and **Development**):

| Variable Name | Example Value | Environment | Notes |
|--------------|---------------|-------------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com` | Production, Preview, Development | **⚠️ CRITICAL: Replace with actual Render backend URL** |
| `NEXT_PUBLIC_ETHEREUM_RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY` | Production, Preview, Development | Sepolia RPC endpoint |
| `NEXT_PUBLIC_CHAIN_ID` | `11155111` | Production, Preview, Development | Sepolia chain ID |
| `NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS` | `0xA94AFCbFF804527315391EA52890c826f897A757` | Production, Preview, Development | Main contract |
| `NEXT_PUBLIC_CONTRACT_PATIENT_RECORDS` | `0xC6b6412fcf144Ce107eD79935cdBEfDC5cE1Cc8F` | Production, Preview, Development | Patient records contract |
| `NEXT_PUBLIC_CONTRACT_APPOINTMENTS` | `0x1A3F11F1735bB703587274478EEc323dC180304a` | Production, Preview, Development | Appointments contract |
| `NEXT_PUBLIC_CONTRACT_PRESCRIPTIONS` | `0xBC5BfBF99CE6087034863149B04A2593E562854b` | Production, Preview, Development | Prescriptions contract |
| `NEXT_PUBLIC_CONTRACT_DOCTOR_CREDENTIALS` | `0x7415A95125b64Ed491088FFE153a8D7773Fb1859` | Production, Preview, Development | Doctor credentials contract |
| `NEXT_PUBLIC_WS_URL` | `wss://your-backend.onrender.com` | Production, Preview, Development | WebSocket URL (optional) |

**Contract Addresses Source:** `frontend/public/contracts/deployment-addresses.json`

#### **Backend Project (Render)**

Go to: **Render Dashboard → [Your Backend Service] → Environment**

Add these variables in Render Dashboard:

| Variable Name | Example Value | Environment | Notes |
|--------------|---------------|-------------|-------|
| `NODE_ENV` | `production` | Production | |
| `PORT` | `3001` | Production | Render auto-assigns, but set for consistency |
| `API_VERSION` | `v1` | Production, Preview, Development | |
| `ETHEREUM_RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY` | Production, Preview, Development | Sepolia RPC endpoint |
| `CHAIN_ID` | `11155111` | Production, Preview, Development | Sepolia chain ID |
| `PRIVATE_KEY` | `0x...` | Production | **⚠️ SECURITY: Rotate if exposed in repo** |
| `CORS_ORIGIN` | `https://your-frontend.vercel.app,http://localhost:3000,http://localhost:9002` | Production | **⚠️ CRITICAL: Replace with actual Vercel frontend URL** |
| `JWT_SECRET` | `[GENERATE_SECURE_STRING]` | Production | **⚠️ CRITICAL: Generate new 64+ character random string** |
| `JWT_EXPIRY` | `24h` | Production, Preview, Development | |
| `ENCRYPTION_KEY` | `[GENERATE_64_HEX_CHARS]` | Production | **⚠️ CRITICAL: Generate new 64-character hex string** |
| `ENCRYPTION_ALGORITHM` | `aes-256-gcm` | Production, Preview, Development | |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | Production | **⚠️ SECURITY: Service role key (never expose to frontend)** |
| `DATABASE_URL` | `postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true` | Production | **✅ MUST use port 6543 (transaction pooler)** |
| `DIRECT_URL` | `postgresql://...@pooler.supabase.com:5432/postgres` | Production | Direct connection for migrations (port 5432) |
| `PINATA_API_KEY` | `[YOUR_KEY]` | Production | IPFS storage (optional) |
| `PINATA_SECRET_API_KEY` | `[YOUR_SECRET]` | Production | IPFS storage (optional) |
| `GEMINI_API_KEY` | `[YOUR_KEY]` | Production | AI chat features (optional) |
| `GOOGLE_API_KEY` | `[YOUR_KEY]` | Production | AI chat features (optional) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Production, Preview, Development | |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Production, Preview, Development | 15 minutes |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Production, Preview, Development | |
| `LOG_LEVEL` | `info` | Production, Preview, Development | |
| `REDIS_HOST` | `[YOUR_REDIS_HOST]` | Production | Optional (for Bull queue) |
| `REDIS_PORT` | `6379` | Production | Optional |
| `REDIS_PASSWORD` | `[YOUR_PASSWORD]` | Production | Optional |

**Note:** `ETHERSCAN_API_KEY` is not used in the codebase and is not required.

### 1.4 Generate Secure Secrets

Run these commands to generate secure secrets:

```powershell
# Generate JWT_SECRET (64+ characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate ENCRYPTION_KEY (64 hex characters = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.5 Remove .env.production Files from Repository

**Script to Remove Files:**

```powershell
# Run the provided script
.\remove-env-production.ps1
```

**Or manually:**
```powershell
Remove-Item -Path "frontend\.env.production" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "middleware-api\.env.production" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "frontend\.next\standalone\.env.production" -Force -ErrorAction SilentlyContinue
```

**If files were committed to git:**
```bash
# Remove from git tracking (keeps local file)
git rm --cached frontend/.env.production
git rm --cached middleware-api/.env.production

# Commit the removal
git commit -m "Security: Remove .env.production files from repository"

# Push to remote
git push origin main
```

**Add to .gitignore:**
```gitignore
# Environment files
.env
.env.local
.env.production
.env.*.local
```

---

## Step 2: Connection Topology Check (The "Wiring" Fix)

### 2.1 Analysis: Frontend API URL Configuration

**Current State:**
- **File:** `frontend/src/lib/env-utils.ts`
- **Fallback Logic:**
  ```typescript
  export function getApiBaseUrl(): string {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    // Falls back to localhost:4000
    return 'http://localhost:4000';
  }
  ```

**Root Cause:**
- If `NEXT_PUBLIC_API_URL` is not set in Vercel Dashboard, frontend defaults to `localhost:4000`
- This causes all API calls to fail in production (connection refused/timeout)

### 2.2 Root Cause Check: Does NEXT_PUBLIC_API_URL Point to Production?

**The Problem:**
- Frontend code checks `process.env.NEXT_PUBLIC_API_URL` first (✅ correct)
- If not set, falls back to `localhost:4000` (❌ breaks production)
- Vercel does not read `.env.production` files (must use Dashboard)

**The Fix:**
1. ✅ Code is correct (uses environment variable)
2. ⚠️ **ACTION REQUIRED:** Set `NEXT_PUBLIC_API_URL` in Vercel Dashboard to your backend URL:
   - Format: `https://your-backend.vercel.app`
   - **DO NOT** include trailing slash
   - Set for **Production**, **Preview**, and **Development** environments

### 2.3 Verification Steps

After deployment:
1. Check browser console for API errors
2. Verify network requests go to `https://your-backend.vercel.app` (not localhost)
3. Test: `https://your-frontend.vercel.app/api/debug/backend-url` should return backend URL

---

## Step 3: Backend Server Configuration (Render)

### 3.1 Analysis: Current Render Configuration

**File:** `middleware-api/render.yaml`

**Current Configuration:**
- ✅ Service type: Web service
- ✅ Runtime: Node.js
- ✅ Build command: `npm install`
- ✅ Start command: `npm start`
- ✅ Environment variables configured in `render.yaml`

### 3.2 Root Cause Check: Express on Render

**Status:** ✅ **CORRECTLY CONFIGURED**

Render Configuration:
- ✅ Express apps run as standard web services on Render (not serverless)
- ✅ No special routing configuration needed (unlike Vercel)
- ✅ Render supports long-running processes (no 10s timeout limit)
- ✅ Environment variables configured via Render Dashboard or `render.yaml`

**Why This Works:**
- Render runs Express as a persistent web service
- All routes are automatically handled by Express
- No need for `vercel.json` or special routing configuration

### 3.3 Verification

**Test Endpoints:**
1. Health check: `https://your-backend.onrender.com/health`
2. API docs: `https://your-backend.onrender.com/api/v1`
3. Any route: `https://your-backend.onrender.com/api/v1/healthcare/patients`

**If 404 Errors Occur:**
1. Verify `src/server.js` is the correct entry point
2. Check Render build logs for errors
3. Ensure `package.json` has correct `start` script

### 3.4 Timeout Configuration

**Render Benefits:**
- ✅ **No timeout limit** - Render web services can run indefinitely
- ✅ Better for blockchain transactions (no 10s limit like Vercel)
- ✅ Supports long-running operations without special configuration

**Note:** The `middleware-api/vercel.json` file is not needed for Render deployment. It can be kept for potential future Vercel migration, but Render ignores it.

---

## Step 4: Database & Blockchain Connectivity

### 4.1 Database Connection Analysis

**Current Configuration:**
- **Service:** Supabase PostgreSQL
- **Connection String Format:** `postgresql://user:pass@host:port/db?pgbouncer=true`
- **Port:** 6543 (transaction pooler) ✅ **CORRECT**

**Root Cause Check:**
- ✅ **CORRECT:** Using port 6543 (transaction pooler)
- ✅ **CORRECT:** `pgbouncer=true` parameter included
- ⚠️ **VERIFY:** `DATABASE_URL` uses transaction pooler URL (not direct connection)

**Why Transaction Pooler is Critical:**
- Serverless functions create many short-lived connections
- Direct connections (port 5432) exhaust connection pool quickly
- Transaction pooler (port 6543) reuses connections efficiently

**Verification:**
```bash
# Check DATABASE_URL format
echo $DATABASE_URL
# Should contain: :6543/ and ?pgbouncer=true
```

### 4.2 Blockchain Connectivity Analysis

**Current Configuration:**
- **Network:** Ethereum Sepolia testnet
- **RPC URL:** Set via `ETHEREUM_RPC_URL` environment variable
- **Timeout:** 60 seconds (configured in `vercel.json`)

**Root Cause Check:**
- ✅ **CORRECT:** `maxDuration: 60` configured in `vercel.json`
- ⚠️ **REQUIRES:** Vercel Pro plan for >10s timeout
- ⚠️ **VERIFY:** `ETHEREUM_RPC_URL` is set in Vercel Dashboard

**Potential Issues:**
1. **Timeout Errors:** If on Hobby plan, transactions may timeout after 10s
2. **RPC Rate Limiting:** Free RPC endpoints may have rate limits
3. **Network Congestion:** Sepolia testnet can be slow during peak times

**Recommendations:**
1. Use paid RPC provider (Alchemy, Infura) for better reliability
2. Implement async transaction pattern for long-running operations
3. Monitor Vercel function logs for timeout errors

### 4.3 Connection Pooling Best Practices

**Supabase Transaction Pooler:**
- ✅ Use port **6543** (transaction pooler)
- ✅ Include `?pgbouncer=true` parameter
- ✅ Use `DIRECT_URL` (port 5432) only for migrations

**Example Connection Strings:**
```
# Transaction Pooler (for serverless)
DATABASE_URL=postgresql://user:pass@aws-1-region.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct Connection (for migrations only)
DIRECT_URL=postgresql://user:pass@aws-1-region.pooler.supabase.com:5432/postgres
```

---

## Complete Deployment Checklist

### Pre-Deployment (Code Changes)

- [ ] **Security:** Remove `.env.production` files from repository
  ```powershell
  .\remove-env-production.ps1
  ```
- [ ] **Git:** Commit removal if files were tracked
  ```bash
  git rm --cached frontend/.env.production middleware-api/.env.production
  git commit -m "Security: Remove .env.production files"
  ```
- [ ] **Verify:** `middleware-api/vercel.json` exists and is correct
- [ ] **Verify:** `frontend/vercel.json` exists (Next.js auto-detects, but good to have)

### Vercel Dashboard Configuration

#### Frontend Project (Project A)

- [ ] Add `NEXT_PUBLIC_API_URL` = `https://your-backend.vercel.app` (Production, Preview, Development)
- [ ] Add `NEXT_PUBLIC_ETHEREUM_RPC_URL` = `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`
- [ ] Add `NEXT_PUBLIC_CHAIN_ID` = `11155111`
- [ ] Add `NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS` = `0xA94AFCbFF804527315391EA52890c826f897A757`
- [ ] Add `NEXT_PUBLIC_CONTRACT_PATIENT_RECORDS` = `0xC6b6412fcf144Ce107eD79935cdBEfDC5cE1Cc8F`
- [ ] Add `NEXT_PUBLIC_CONTRACT_APPOINTMENTS` = `0x1A3F11F1735bB703587274478EEc323dC180304a`
- [ ] Add `NEXT_PUBLIC_CONTRACT_PRESCRIPTIONS` = `0xBC5BfBF99CE6087034863149B04A2593E562854b`
- [ ] Add `NEXT_PUBLIC_CONTRACT_DOCTOR_CREDENTIALS` = `0x7415A95125b64Ed491088FFE153a8D7773Fb1859`
- [ ] Add `NEXT_PUBLIC_WS_URL` = `wss://your-backend.vercel.app` (optional)

#### Backend Project (Project B)

- [ ] Generate new `JWT_SECRET` (64+ character random string)
- [ ] Generate new `ENCRYPTION_KEY` (64 hex characters)
- [ ] Add `NODE_ENV` = `production` (Production only)
- [ ] Add `PORT` = `3001` (Production)
- [ ] Add `API_VERSION` = `v1`
- [ ] Add `ETHEREUM_RPC_URL` = `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`
- [ ] Add `CHAIN_ID` = `11155111`
- [ ] Add `PRIVATE_KEY` = `0x...` (⚠️ Rotate if exposed)
- [ ] Add `CORS_ORIGIN` = `https://your-frontend.vercel.app,http://localhost:3000,http://localhost:9002`
- [ ] Add `JWT_SECRET` = `[GENERATED_SECURE_STRING]`
- [ ] Add `JWT_EXPIRY` = `24h`
- [ ] Add `ENCRYPTION_KEY` = `[GENERATED_64_HEX_CHARS]`
- [ ] Add `ENCRYPTION_ALGORITHM` = `aes-256-gcm`
- [ ] Add `SUPABASE_URL` = `https://xxxxx.supabase.co`
- [ ] Add `SUPABASE_SERVICE_KEY` = `eyJ...`
- [ ] Add `DATABASE_URL` = `postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true` (⚠️ Verify port 6543)
- [ ] Add `DIRECT_URL` = `postgresql://...@pooler.supabase.com:5432/postgres` (for migrations)
- [ ] Add `GEMINI_API_KEY` = `[YOUR_KEY]` (optional)
- [ ] Add `GOOGLE_API_KEY` = `[YOUR_KEY]` (optional)
- [ ] Add `GEMINI_MODEL` = `gemini-2.5-flash`
- [ ] Add `RATE_LIMIT_WINDOW_MS` = `900000`
- [ ] Add `RATE_LIMIT_MAX_REQUESTS` = `100`
- [ ] Add `LOG_LEVEL` = `info`

### Deployment Steps

1. **Deploy Backend First (Render)**
   - [ ] Push code to repository
   - [ ] Connect repository to Render (Web Service)
   - [ ] Add all backend environment variables in Render Dashboard
   - [ ] Deploy and note the backend URL (e.g., `https://healthlink-api.onrender.com`)

2. **Deploy Frontend (Vercel)**
   - [ ] Connect repository to Vercel (Frontend Project)
   - [ ] Add all frontend environment variables
   - [ ] **Set `NEXT_PUBLIC_API_URL` to your Render backend URL from step 1**
   - [ ] Deploy

3. **Update CORS**
   - [ ] Go back to Render Dashboard (Backend Service)
   - [ ] Update `CORS_ORIGIN` environment variable to include your Vercel frontend URL
   - [ ] Redeploy backend (or wait for auto-redeploy)

### Post-Deployment Verification

- [ ] **Backend Health Check:** `https://your-backend.onrender.com/health` returns 200
- [ ] **Frontend Loads:** `https://your-frontend.vercel.app` loads without errors
- [ ] **API Connection:** Frontend can call backend APIs (check browser network tab)
- [ ] **CORS:** No CORS errors in browser console
- [ ] **Blockchain:** Test blockchain transaction (or verify timeout behavior)
- [ ] **Database:** Test database operations (create user, query records)
- [ ] **Logs:** Check Vercel function logs for errors

### Security Follow-up

- [ ] **Rotate Secrets:** If `.env.production` was committed, rotate:
  - [ ] `PRIVATE_KEY` (generate new wallet)
  - [ ] `JWT_SECRET` (generate new secret)
  - [ ] `ENCRYPTION_KEY` (generate new key)
  - [ ] `SUPABASE_SERVICE_KEY` (if exposed, rotate in Supabase dashboard)
- [ ] **Review Access:** Review Vercel environment variable access permissions
- [ ] **Enable Encryption:** Enable Vercel environment variable encryption if available

---

## Troubleshooting Guide

### Issue: 404 Errors on Backend API Calls

**Symptoms:** All API calls return 404 Not Found

**Root Cause:** Express server not starting correctly or wrong entry point

**Solution:**
1. Verify `src/server.js` is the correct entry point
2. Check `package.json` has correct `start` script: `"start": "node src/server.js"`
3. Check Render build logs for errors
4. Verify Express routes are properly configured

---

### Issue: CORS Errors

**Symptoms:** Browser console shows CORS policy errors

**Root Cause:** `CORS_ORIGIN` doesn't include frontend URL

**Solution:**
1. Check `CORS_ORIGIN` in Vercel Dashboard (Backend Project)
2. Ensure frontend URL is included: `https://your-frontend.vercel.app`
3. **No trailing slash** in URLs
4. Separate multiple origins with commas
5. Redeploy backend after updating

---

### Issue: Timeout Errors on Blockchain Transactions

**Symptoms:** API calls timeout during blockchain operations

**Root Cause:** Render free tier may have request timeout limits

**Solution:**
1. **Render Free Tier:** Has 15-minute service timeout (usually sufficient)
2. **If timeout occurs:** Check Render service logs for timeout errors
3. **Consider:** Implement async transaction pattern for very long operations:
   ```javascript
   // Return immediately with transaction hash
   const tx = await contract.createPatient(...);
   return { txHash: tx.hash, status: 'pending' };
   
   // Poll status via separate endpoint
   GET /api/v1/transactions/:txHash/status
   ```
4. **Upgrade:** Render paid plans have no timeout limits

---

### Issue: Database Connection Errors

**Symptoms:** Database queries fail with connection errors

**Root Cause:** Using direct connection (port 5432) instead of pooler (port 6543)

**Solution:**
1. Verify `DATABASE_URL` uses port **6543** (transaction pooler)
2. Ensure `?pgbouncer=true` parameter is included
3. Check Supabase connection pool limits
4. Use `DIRECT_URL` (port 5432) only for migrations

**Example:**
```
✅ CORRECT: postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true
❌ WRONG:   postgresql://...@pooler.supabase.com:5432/postgres
```

---

### Issue: Environment Variables Not Loading

**Symptoms:** `process.env.VARIABLE_NAME` is undefined in production

**Root Cause:** Variables not set in Vercel Dashboard

**Solution:**
1. **Verify:** Variables are set in Vercel Dashboard (not just in code)
2. **Check Names:** Variable names are case-sensitive and match exactly
3. **Redeploy:** Redeploy after adding new variables
4. **For `NEXT_PUBLIC_*`:** Ensure they're set for Production environment
5. **Check Build Logs:** Vercel build logs show which variables are available

**Common Mistakes:**
- Setting variables in code but not in Dashboard
- Typos in variable names (e.g., `NEXT_PUBLIC_API_URL` vs `NEXT_PUBLIC_APIURL`)
- Setting variables for wrong environment (e.g., only Development, not Production)

---

### Issue: Frontend Points to localhost

**Symptoms:** Network requests go to `http://localhost:4000` instead of backend URL

**Root Cause:** `NEXT_PUBLIC_API_URL` not set in Vercel Dashboard

**Solution:**
1. Add `NEXT_PUBLIC_API_URL` to Vercel Dashboard (Frontend Project)
2. Set value to: `https://your-backend.vercel.app`
3. Set for Production, Preview, and Development
4. Redeploy frontend

**Verification:**
- Check browser network tab: requests should go to backend URL
- Test: `https://your-frontend.vercel.app/api/debug/backend-url`

---

## Summary of Code Changes

### Files Modified/Created

1. ✅ **`middleware-api/render.yaml`** - Render configuration (backend on Render)
2. ✅ **`frontend/vercel.json`** - Vercel configuration (frontend on Vercel)
3. ✅ **`remove-env-production.ps1`** - Script to remove `.env.production` files
4. ✅ **`ROOT_CAUSE_RESCUE_COMPLETE.md`** - This document

**Note:** `middleware-api/vercel.json` exists but is not used for Render deployment. It can be kept for potential future Vercel migration.

### Files to Remove (Security)

- ❌ `frontend/.env.production` - **REMOVE**
- ❌ `middleware-api/.env.production` - **REMOVE**
- ❌ `frontend/.next/standalone/.env.production` - **REMOVE**

---

## Next Steps

1. **Immediate (Before Deployment):**
   - [ ] Run `.\remove-env-production.ps1` to remove `.env.production` files
   - [ ] Generate new `JWT_SECRET` and `ENCRYPTION_KEY`
   - [ ] Commit code changes (if any)

2. **Dashboard Configuration:**
   - [ ] Add all environment variables to Vercel (Frontend Project)
   - [ ] Add all environment variables to Render (Backend Service)
   - [ ] Deploy Backend on Render first, note the URL
   - [ ] Update Frontend `NEXT_PUBLIC_API_URL` with Render backend URL
   - [ ] Deploy Frontend on Vercel
   - [ ] Update Backend `CORS_ORIGIN` in Render with Vercel frontend URL
   - [ ] Redeploy Backend (or wait for auto-redeploy)

3. **Post-Deployment:**
   - [ ] Verify all endpoints work
   - [ ] Test blockchain transactions
   - [ ] Monitor Vercel function logs
   - [ ] Rotate exposed secrets (if `.env.production` was committed)

4. **Security Follow-up:**
   - [ ] Rotate `PRIVATE_KEY` if exposed
   - [ ] Rotate `JWT_SECRET` if exposed
   - [ ] Rotate `ENCRYPTION_KEY` if exposed
   - [ ] Review Vercel access permissions

---

**Status:** ✅ Ready for deployment after environment variables are configured in Vercel Dashboard

**Last Updated:** 2025-01-XX

