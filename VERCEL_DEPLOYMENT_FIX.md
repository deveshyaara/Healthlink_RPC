# Vercel Deployment Root Cause Rescue - Complete Fix Guide

## 🚨 Critical Issues Identified

1. **Security Risk**: `.env.production` files committed to repository (exposed secrets)
2. **Connection Failure**: Frontend pointing to Render backend instead of Vercel backend
3. **Missing Configuration**: No `vercel.json` for Express backend (causes 404 errors)
4. **Timeout Issues**: No `maxDuration` configured for blockchain transactions

---

## Step 1: Security & Config Audit ✅

### Required Environment Variables for Vercel Dashboard

#### **Frontend Project (Vercel Project A)**

Add these in **Vercel Dashboard → Project Settings → Environment Variables**:

| Variable Name | Value | Environment | Notes |
|--------------|-------|-------------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.vercel.app` | Production, Preview, Development | **Replace with your actual Vercel backend URL** |
| `NEXT_PUBLIC_ETHEREUM_RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/wtVyTBINEO9Eoc4Dai8Mg` | Production, Preview, Development | Sepolia RPC endpoint |
| `NEXT_PUBLIC_CHAIN_ID` | `11155111` | Production, Preview, Development | Sepolia chain ID |
| `NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS` | `0xA94AFCbFF804527315391EA52890c826f897A757` | Production, Preview, Development | Main contract |
| `NEXT_PUBLIC_CONTRACT_PATIENT_RECORDS` | `0xC6b6412fcf144Ce107eD79935cdBEfDC5cE1Cc8F` | Production, Preview, Development | Patient records contract |
| `NEXT_PUBLIC_CONTRACT_APPOINTMENTS` | `0x1A3F11F1735bB703587274478EEc323dC180304a` | Production, Preview, Development | Appointments contract |
| `NEXT_PUBLIC_CONTRACT_PRESCRIPTIONS` | `0xBC5BfBF99CE6087034863149B04A2593E562854b` | Production, Preview, Development | Prescriptions contract |
| `NEXT_PUBLIC_CONTRACT_DOCTOR_CREDENTIALS` | `0x7415A95125b64Ed491088FFE153a8D7773Fb1859` | Production, Preview, Development | Doctor credentials contract |

#### **Backend Project (Vercel Project B)**

Add these in **Vercel Dashboard → Project Settings → Environment Variables**:

| Variable Name | Value | Environment | Notes |
|--------------|-------|-------------|-------|
| `NODE_ENV` | `production` | Production | |
| `PORT` | `3001` | Production | Vercel auto-assigns, but set for consistency |
| `API_VERSION` | `v1` | Production, Preview, Development | |
| `ETHEREUM_RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/wtVyTBINEO9Eoc4Dai8Mg` | Production, Preview, Development | Sepolia RPC |
| `CHAIN_ID` | `11155111` | Production, Preview, Development | |
| `PRIVATE_KEY` | `0x0ce524e7a89d96497a0d2ab561be6eca00d0f8a4514d2cf0d33b7907dde4f935` | Production | **⚠️ SECURITY: Rotate this key after fixing deployment** |
| `CORS_ORIGIN` | `https://your-frontend.vercel.app,http://localhost:3000,http://localhost:9002` | Production, Preview, Development | **Replace with your actual Vercel frontend URL** |
| `JWT_SECRET` | `[GENERATE_SECURE_RANDOM_STRING]` | Production | **⚠️ CRITICAL: Generate new secure random string (64+ chars)** |
| `JWT_EXPIRY` | `24h` | Production, Preview, Development | |
| `ENCRYPTION_KEY` | `[GENERATE_64_HEX_CHARS]` | Production | **⚠️ CRITICAL: Generate new 64-character hex string** |
| `ENCRYPTION_ALGORITHM` | `aes-256-gcm` | Production, Preview, Development | |
| `SUPABASE_URL` | `https://wpmgqueyuwuvdcavzthg.supabase.co` | Production, Preview, Development | |
| `SUPABASE_SERVICE_KEY` | `sb_secret_kJXx6swRb4HjzmuVVxg_NQ_VyBiARK4` | Production | **⚠️ SECURITY: Consider rotating** |
| `DATABASE_URL` | `postgresql://postgres.wpmgqueyuwuvdcavzthg:xwr5w2%24JgH%3Fx%40YF@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | Production | **✅ Using port 6543 (transaction pooler) - CORRECT** |
| `DIRECT_URL` | `postgresql://postgres.wpmgqueyuwuvdcavzthg:xwr5w2%24JgH%3Fx%40YF@aws-1-ap-south-1.pooler.supabase.com:5432/postgres` | Production | Direct connection for migrations |
| `PINATA_API_KEY` | `[YOUR_PINATA_KEY]` | Production | IPFS storage (if used) |
| `PINATA_SECRET_API_KEY` | `[YOUR_PINATA_SECRET]` | Production | IPFS storage (if used) |
| `GEMINI_API_KEY` | `AIzaSyDWCu4AJb6BhuLctd_7ne4HIBDbgRBui_g` | Production | AI chat features |
| `GOOGLE_API_KEY` | `AIzaSyDWCu4AJb6BhuLctd_7ne4HIBDbgRBui_g` | Production | AI chat features |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Production, Preview, Development | |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Production, Preview, Development | 15 minutes |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Production, Preview, Development | |
| `LOG_LEVEL` | `info` | Production, Preview, Development | |

### ⚠️ Security Actions Required

1. **Generate New JWT_SECRET**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Generate New ENCRYPTION_KEY** (64 hex characters):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Remove .env.production files from repository** (see script below)

---

## Step 2: Connection Topology Fix ✅

### Issue
- Frontend `vercel.json` has hardcoded `NEXT_PUBLIC_API_URL` pointing to Render
- Frontend code defaults to `localhost:4000` if env var not set

### Fix Applied
- Removed hardcoded env vars from `frontend/vercel.json`
- Environment variables must be set in Vercel Dashboard (see Step 1)

### Action Required
1. Set `NEXT_PUBLIC_API_URL` in Vercel Dashboard to your backend URL: `https://your-backend.vercel.app`
2. Set `CORS_ORIGIN` in backend to include your frontend URL: `https://your-frontend.vercel.app`

---

## Step 3: Backend Serverless Configuration ✅

### Issue
- No `vercel.json` in `middleware-api/` directory
- Express apps on Vercel require specific routing configuration

### Fix Applied
- Created `middleware-api/vercel.json` with proper Express routing
- Configured `maxDuration` for blockchain transactions (60 seconds - requires Pro plan)

### Configuration Details
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ],
  "functions": {
    "src/server.js": {
      "maxDuration": 60
    }
  }
}
```

**Note**: `maxDuration: 60` requires Vercel Pro plan. If on Hobby plan, transactions may timeout. Consider:
- Using fire-and-forget pattern for blockchain transactions
- Implementing async job queue (Redis/Bull)
- Moving long-running operations to background workers

---

## Step 4: Database & Blockchain Connectivity ✅

### Database Connection ✅
- **Status**: Already using transaction pooler (port 6543) - CORRECT
- `DATABASE_URL` uses `pgbouncer=true` parameter - Good for serverless

### Blockchain Timeout Configuration ✅
- **Status**: Configured `maxDuration: 60` in `vercel.json`
- **Requirement**: Vercel Pro plan for >10s timeouts

### Recommendations
1. **If on Hobby Plan**: Implement async transaction pattern:
   ```javascript
   // Instead of waiting for transaction confirmation
   const tx = await contract.createPatient(...);
   // Return immediately, poll status via separate endpoint
   return { txHash: tx.hash, status: 'pending' };
   ```

2. **Monitor Connection Pooling**: Supabase pooler should handle serverless spikes, but monitor:
   - Connection pool exhaustion errors
   - Consider increasing pool size if needed

---

## Step 5: Remove .env.production Files from Repository

### Script to Remove Files

Run this command to remove `.env.production` files:

```powershell
# Remove .env.production files
Remove-Item -Path "frontend\.env.production" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "middleware-api\.env.production" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "frontend\.next\standalone\.env.production" -Force -ErrorAction SilentlyContinue

# Verify removal
Write-Host "Checking for remaining .env.production files..."
Get-ChildItem -Path . -Filter ".env.production" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

### Git Commands (if files were committed)

```bash
# Remove from git tracking
git rm --cached frontend/.env.production
git rm --cached middleware-api/.env.production

# Commit the removal
git commit -m "Security: Remove .env.production files from repository"

# Push to remote
git push origin main
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Generate new `JWT_SECRET` (64+ character random string)
- [ ] Generate new `ENCRYPTION_KEY` (64 hex characters)
- [ ] Remove `.env.production` files from repository
- [ ] Commit code changes (vercel.json files)

### Vercel Frontend Project (Project A)
- [ ] Add all `NEXT_PUBLIC_*` environment variables to Vercel Dashboard
- [ ] Set `NEXT_PUBLIC_API_URL` to your Vercel backend URL
- [ ] Deploy frontend project

### Vercel Backend Project (Project B)
- [ ] Add all backend environment variables to Vercel Dashboard
- [ ] Set `CORS_ORIGIN` to include your frontend URL
- [ ] Verify `DATABASE_URL` uses port 6543 (transaction pooler)
- [ ] Deploy backend project
- [ ] Verify backend URL (e.g., `https://your-backend.vercel.app/health`)

### Post-Deployment Verification
- [ ] Test frontend → backend connection
- [ ] Verify CORS headers allow frontend origin
- [ ] Test blockchain transaction (check timeout behavior)
- [ ] Monitor Vercel function logs for errors
- [ ] Check database connection pool usage

### Security Follow-up
- [ ] Rotate `PRIVATE_KEY` if it was exposed
- [ ] Rotate `SUPABASE_SERVICE_KEY` if needed
- [ ] Review Vercel environment variable access permissions
- [ ] Enable Vercel environment variable encryption if available

---

## Troubleshooting

### Issue: 404 Errors on Backend API Calls
**Solution**: Verify `vercel.json` exists in `middleware-api/` and routes are configured correctly.

### Issue: CORS Errors
**Solution**: 
1. Check `CORS_ORIGIN` includes your frontend URL
2. Verify frontend URL matches exactly (no trailing slash)

### Issue: Timeout Errors on Blockchain Transactions
**Solution**: 
1. Verify Vercel Pro plan is active (for 60s timeout)
2. Consider implementing async transaction pattern
3. Check `maxDuration` in `vercel.json`

### Issue: Database Connection Errors
**Solution**:
1. Verify `DATABASE_URL` uses port 6543 (pooler)
2. Check Supabase connection pool limits
3. Verify `pgbouncer=true` parameter in connection string

### Issue: Environment Variables Not Loading
**Solution**:
1. Verify variables are set in Vercel Dashboard (not just in code)
2. Check variable names match exactly (case-sensitive)
3. Redeploy after adding new variables
4. For `NEXT_PUBLIC_*` vars, ensure they're set for Production environment

---

## Summary of Code Changes

1. ✅ **frontend/vercel.json**: Removed hardcoded env vars (must use Vercel Dashboard)
2. ✅ **middleware-api/vercel.json**: Created with Express routing and timeout config
3. ✅ **Script**: Created to remove `.env.production` files

---

## Next Steps

1. **Immediate**: Add all environment variables to Vercel Dashboard
2. **Immediate**: Remove `.env.production` files from repository
3. **Immediate**: Deploy both projects to Vercel
4. **Follow-up**: Rotate exposed secrets (PRIVATE_KEY, JWT_SECRET, ENCRYPTION_KEY)
5. **Follow-up**: Monitor deployment logs and fix any remaining issues

---

**Generated**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Status**: Ready for deployment after environment variables are configured in Vercel Dashboard

