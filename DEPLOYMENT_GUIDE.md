# 🚀 HealthLink Deployment Guide

Complete deployment guide for HealthLink distributed system.

## Architecture Overview

- **Frontend:** Next.js application deployed on **Vercel**
- **Backend:** Express.js API deployed on **Render**
- **Database:** Supabase PostgreSQL (with transaction pooler)
- **Blockchain:** Ethereum Sepolia testnet

---

## Prerequisites

1. **Accounts Required:**
   - Vercel account (for frontend)
   - Render account (for backend)
   - Supabase account (for database)
   - Alchemy/Infura account (for Ethereum RPC)

2. **Repository Setup:**
   - Code pushed to GitHub/GitLab/Bitbucket
   - Repository accessible by both Vercel and Render

---

## Step 1: Database Setup (Supabase)

1. Create a new Supabase project
2. Get your connection strings:
   - **Transaction Pooler URL** (port 6543) - for serverless functions
   - **Direct URL** (port 5432) - for migrations
3. Note your `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

**Important:** Use the transaction pooler URL (port 6543) for `DATABASE_URL` in production.

---

## Step 2: Backend Deployment (Render)

### 2.1 Create Render Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your repository
4. Configure:
   - **Name:** `healthlink-middleware-api`
   - **Region:** Choose closest to your users
   - **Branch:** `main` (or your production branch)
   - **Root Directory:** `middleware-api`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid for better performance)

### 2.2 Set Environment Variables

Go to **Environment** tab and add:

**Required Variables:**
```
NODE_ENV=production
PORT=3001
API_VERSION=v1

# Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...@pooler.supabase.com:5432/postgres

# Security (Generate new values!)
JWT_SECRET=[GENERATE_64_CHAR_STRING]
JWT_EXPIRY=24h
ENCRYPTION_KEY=[GENERATE_64_HEX_CHARS]
ENCRYPTION_ALGORITHM=aes-256-gcm

# Ethereum
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
CHAIN_ID=11155111
PRIVATE_KEY=0x-your-private-key

# Contracts
CONTRACT_HEALTHLINK=0xA94AFCbFF804527315391EA52890c826f897A757
CONTRACT_PATIENT_RECORDS=0xC6b6412fcf144Ce107eD79935cdBEfDC5cE1Cc8F
CONTRACT_APPOINTMENTS=0x1A3F11F1735bB703587274478EEc323dC180304a
CONTRACT_PRESCRIPTIONS=0xBC5BfBF99CE6087034863149B04A2593E562854b
CONTRACT_DOCTOR_CREDENTIALS=0x7415A95125b64Ed491088FFE153a8D7773Fb1859

# CORS (Update after frontend deployment)
CORS_ORIGIN=http://localhost:3000,http://localhost:9002
```

**Optional Variables:**
```
GEMINI_API_KEY=your-key
GOOGLE_API_KEY=your-key
GEMINI_MODEL=gemini-2.5-flash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### 2.3 Deploy

1. Click "Save Changes"
2. Render will automatically deploy
3. Wait for deployment to complete
4. **Note your backend URL:** `https://your-service.onrender.com`

### 2.4 Verify Backend

Test the health endpoint:
```bash
curl https://your-service.onrender.com/health
```

Should return: `{"status":"ok"}`

---

## Step 3: Frontend Deployment (Vercel)

### 3.1 Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)

### 3.2 Set Environment Variables

Go to **Settings** → **Environment Variables** and add:

**Required Variables:**
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS=0xA94AFCbFF804527315391EA52890c826f897A757
NEXT_PUBLIC_CONTRACT_PATIENT_RECORDS=0xC6b6412fcf144Ce107eD79935cdBEfDC5cE1Cc8F
NEXT_PUBLIC_CONTRACT_APPOINTMENTS=0x1A3F11F1735bB703587274478EEc323dC180304a
NEXT_PUBLIC_CONTRACT_PRESCRIPTIONS=0xBC5BfBF99CE6087034863149B04A2593E562854b
NEXT_PUBLIC_CONTRACT_DOCTOR_CREDENTIALS=0x7415A95125b64Ed491088FFE153a8D7773Fb1859
```

**Set for:** Production, Preview, and Development

### 3.3 Deploy

1. Click "Deploy"
2. Wait for build to complete
3. **Note your frontend URL:** `https://your-project.vercel.app`

---

## Step 4: Update CORS Configuration

After both deployments are complete:

1. Go back to **Render Dashboard** → Your Backend Service
2. Go to **Environment** tab
3. Update `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=https://your-frontend.vercel.app,http://localhost:3000,http://localhost:9002
   ```
4. Save changes (Render will auto-redeploy)

---

## Step 5: Post-Deployment Verification

### 5.1 Backend Health Check
```bash
curl https://your-backend.onrender.com/health
```

### 5.2 Frontend Health Check
```bash
curl https://your-frontend.vercel.app/api/health
```

### 5.3 Test API Connection
1. Open frontend in browser
2. Open browser DevTools → Network tab
3. Verify API calls go to your Render backend URL
4. Check for CORS errors in console

### 5.4 Test Blockchain Connection
1. Connect MetaMask wallet
2. Switch to Sepolia testnet
3. Test a simple transaction

---

## Troubleshooting

### Backend Returns 404
- Verify `src/server.js` is the entry point
- Check `package.json` has correct `start` script
- Review Render build logs

### CORS Errors
- Verify `CORS_ORIGIN` includes exact frontend URL (no trailing slash)
- Ensure backend is redeployed after CORS update
- Check browser console for exact error message

### Environment Variables Not Loading
- Verify variables are set in correct dashboard (Vercel/Render)
- Check variable names are exact (case-sensitive)
- Redeploy after adding variables
- For `NEXT_PUBLIC_*` vars, ensure they're set for Production environment

### Database Connection Errors
- Verify `DATABASE_URL` uses port **6543** (transaction pooler)
- Ensure `?pgbouncer=true` parameter is included
- Check Supabase connection pool limits

### Timeout Errors
- Render free tier has 15-minute timeout (usually sufficient)
- Check Render service logs for timeout errors
- Consider async transaction pattern for very long operations

---

## Security Checklist

- [ ] Removed `.env.production` files from repository
- [ ] Generated new `JWT_SECRET` (not default)
- [ ] Generated new `ENCRYPTION_KEY` (64 hex characters)
- [ ] Rotated `PRIVATE_KEY` if it was exposed
- [ ] Set strong `SUPABASE_SERVICE_KEY` (never expose to frontend)
- [ ] Verified `.gitignore` excludes all `.env*` files
- [ ] Reviewed Vercel/Render access permissions
- [ ] Enabled environment variable encryption if available

---

## Maintenance

### Updating Environment Variables

**Render:**
1. Go to Service → Environment
2. Update variable
3. Save (auto-redeploys)

**Vercel:**
1. Go to Project → Settings → Environment Variables
2. Update variable
3. Redeploy (or wait for next deployment)

### Monitoring

- **Render:** Check service logs in dashboard
- **Vercel:** Check function logs in dashboard
- **Supabase:** Monitor database usage and connection pool

---

## Support

For detailed troubleshooting, see:
- `ROOT_CAUSE_RESCUE_COMPLETE.md` - Complete root cause analysis
- `VERCEL_DEPLOYMENT_CHECKLIST.md` - Quick reference checklist

---

**Last Updated:** 2025-01-XX

