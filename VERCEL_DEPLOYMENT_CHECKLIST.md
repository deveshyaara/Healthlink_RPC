# ✅ Deployment Quick Checklist

**Architecture:**
- **Frontend:** Vercel
- **Backend:** Render

## 🚨 Critical Actions Required

### 1. Security: Remove .env.production Files
```powershell
.\remove-env-production.ps1
```

### 2. Generate Secure Secrets
```powershell
# JWT_SECRET (64+ characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ENCRYPTION_KEY (64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📋 Frontend Environment Variables (Vercel)

**Location:** Vercel Dashboard → [Frontend Project] → Settings → Environment Variables

| Variable | Value | Environments |
|----------|-------|--------------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com` | Production, Preview, Development |
| `NEXT_PUBLIC_ETHEREUM_RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY` | Production, Preview, Development |
| `NEXT_PUBLIC_CHAIN_ID` | `11155111` | Production, Preview, Development |
| `NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS` | `0xA94AFCbFF804527315391EA52890c826f897A757` | Production, Preview, Development |
| `NEXT_PUBLIC_CONTRACT_PATIENT_RECORDS` | `0xC6b6412fcf144Ce107eD79935cdBEfDC5cE1Cc8F` | Production, Preview, Development |
| `NEXT_PUBLIC_CONTRACT_APPOINTMENTS` | `0x1A3F11F1735bB703587274478EEc323dC180304a` | Production, Preview, Development |
| `NEXT_PUBLIC_CONTRACT_PRESCRIPTIONS` | `0xBC5BfBF99CE6087034863149B04A2593E562854b` | Production, Preview, Development |
| `NEXT_PUBLIC_CONTRACT_DOCTOR_CREDENTIALS` | `0x7415A95125b64Ed491088FFE153a8D7773Fb1859` | Production, Preview, Development |

**⚠️ IMPORTANT:** Replace `https://your-backend.onrender.com` with your actual Render backend URL after deployment.

---

## 📋 Backend Environment Variables (Render)

**Location:** Render Dashboard → [Backend Service] → Environment

### Required Variables

| Variable | Value | Environments | Notes |
|----------|-------|--------------|-------|
| `NODE_ENV` | `production` | Production | |
| `PORT` | `3001` | Production | |
| `API_VERSION` | `v1` | All | |
| `ETHEREUM_RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY` | All | |
| `CHAIN_ID` | `11155111` | All | |
| `PRIVATE_KEY` | `0x...` | Production | ⚠️ Rotate if exposed |
| `CORS_ORIGIN` | `https://your-frontend.vercel.app,http://localhost:3000,http://localhost:9002` | Production | ⚠️ Replace with actual Vercel frontend URL |
| `JWT_SECRET` | `[GENERATED]` | Production | ⚠️ Generate new |
| `JWT_EXPIRY` | `24h` | All | |
| `ENCRYPTION_KEY` | `[GENERATED]` | Production | ⚠️ Generate new (64 hex) |
| `ENCRYPTION_ALGORITHM` | `aes-256-gcm` | All | |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | All | |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | Production | ⚠️ Service role key |
| `DATABASE_URL` | `postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true` | Production | ⚠️ **MUST use port 6543** |
| `DIRECT_URL` | `postgresql://...@pooler.supabase.com:5432/postgres` | Production | For migrations only |

### Optional Variables

| Variable | Value | Environments |
|----------|-------|--------------|
| `GEMINI_API_KEY` | `[YOUR_KEY]` | Production |
| `GOOGLE_API_KEY` | `[YOUR_KEY]` | Production |
| `GEMINI_MODEL` | `gemini-2.5-flash` | All |
| `RATE_LIMIT_WINDOW_MS` | `900000` | All |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | All |
| `LOG_LEVEL` | `info` | All |
| `PINATA_API_KEY` | `[YOUR_KEY]` | Production |
| `PINATA_SECRET_API_KEY` | `[YOUR_SECRET]` | Production |

---

## 🚀 Deployment Steps

### Step 1: Deploy Backend (Render)
1. Push code to repository
2. Connect repository to Render (Web Service)
3. Add all backend environment variables in Render Dashboard
4. Deploy
5. **Note the backend URL** (e.g., `https://healthlink-api.onrender.com`)

### Step 2: Deploy Frontend (Vercel)
1. Connect repository to Vercel (Frontend Project)
2. Add all frontend environment variables
3. **Set `NEXT_PUBLIC_API_URL` to your Render backend URL from Step 1**
4. Deploy

### Step 3: Update CORS
1. Go back to Render Dashboard (Backend Service)
2. Update `CORS_ORIGIN` environment variable to include your Vercel frontend URL
3. Redeploy backend (or wait for auto-redeploy)

---

## ✅ Post-Deployment Verification

- [ ] Backend health: `https://your-backend.onrender.com/health` → 200 OK
- [ ] Frontend loads: `https://your-frontend.vercel.app` → No errors
- [ ] API connection: Frontend can call backend (check browser network tab)
- [ ] No CORS errors in browser console
- [ ] Blockchain transactions work (or timeout gracefully)
- [ ] Database operations work
- [ ] Check Vercel function logs for errors

---

## 🔧 Configuration Files Status

- ✅ `middleware-api/render.yaml` - Render configuration (backend on Render)
- ✅ `frontend/vercel.json` - Vercel configuration (frontend on Vercel)
- ✅ Backend checks `VERCEL` environment variable (skips .env files when on Vercel)

---

## 🐛 Common Issues & Fixes

### 404 on API Calls
- ✅ Verify `src/server.js` is correct entry point
- ✅ Check `package.json` start script
- ✅ Check Render build logs

### CORS Errors
- ✅ Verify `CORS_ORIGIN` includes Vercel frontend URL (no trailing slash)
- ✅ Redeploy backend after updating

### Timeout Errors
- ✅ Render free tier has 15-minute timeout (usually sufficient)
- ✅ Check Render service logs for timeout errors
- ✅ Consider async transaction pattern for very long operations

### Database Connection Errors
- ✅ Verify `DATABASE_URL` uses port **6543** (not 5432)
- ✅ Ensure `?pgbouncer=true` parameter

### Env Vars Not Loading
- ✅ Variables must be set in Vercel Dashboard (not just code)
- ✅ Redeploy after adding variables
- ✅ Check variable names (case-sensitive)

---

## 📚 Full Documentation

See `ROOT_CAUSE_RESCUE_COMPLETE.md` for detailed analysis and troubleshooting.

