# Vercel Deployment Checklist

## Quick Reference Checklist

### ✅ Code Changes (Already Applied)
- [x] Removed hardcoded env vars from `frontend/vercel.json`
- [x] Created `middleware-api/vercel.json` with Express routing
- [x] Updated backend config to handle Vercel environment variables
- [x] Created script to remove `.env.production` files

### 🔧 Vercel Dashboard Configuration

#### Frontend Project (Vercel Project A)
Go to: **Project Settings → Environment Variables**

Add these variables (set for **Production**, **Preview**, and **Development**):

```
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/wtVyTBINEO9Eoc4Dai8Mg
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS=0xA94AFCbFF804527315391EA52890c826f897A757
NEXT_PUBLIC_CONTRACT_HEALTHLINK=0xA94AFCbFF804527315391EA52890c826f897A757
NEXT_PUBLIC_CONTRACT_PATIENT_RECORDS=0xC6b6412fcf144Ce107eD79935cdBEfDC5cE1Cc8F
NEXT_PUBLIC_CONTRACT_APPOINTMENTS=0x1A3F11F1735bB703587274478EEc323dC180304a
NEXT_PUBLIC_CONTRACT_PRESCRIPTIONS=0xBC5BfBF99CE6087034863149B04A2593E562854b
NEXT_PUBLIC_CONTRACT_DOCTOR_CREDENTIALS=0x7415A95125b64Ed491088FFE153a8D7773Fb1859
```

**⚠️ IMPORTANT**: Replace `https://your-backend.vercel.app` with your actual Vercel backend URL after deployment.

#### Backend Project (Vercel Project B)
Go to: **Project Settings → Environment Variables**

Add these variables (set for **Production**, **Preview**, and **Development**):

```
NODE_ENV=production
PORT=3001
API_VERSION=v1
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/wtVyTBINEO9Eoc4Dai8Mg
CHAIN_ID=11155111
PRIVATE_KEY=0x0ce524e7a89d96497a0d2ab561be6eca00d0f8a4514d2cf0d33b7907dde4f935
CORS_ORIGIN=https://your-frontend.vercel.app,http://localhost:3000,http://localhost:9002
JWT_SECRET=[GENERATE_NEW_SECURE_STRING]
JWT_EXPIRY=24h
ENCRYPTION_KEY=[GENERATE_64_HEX_CHARS]
ENCRYPTION_ALGORITHM=aes-256-gcm
SUPABASE_URL=https://wpmgqueyuwuvdcavzthg.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_kJXx6swRb4HjzmuVVxg_NQ_VyBiARK4
DATABASE_URL=postgresql://postgres.wpmgqueyuwuvdcavzthg:xwr5w2%24JgH%3Fx%40YF@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.wpmgqueyuwuvdcavzthg:xwr5w2%24JgH%3Fx%40YF@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
GEMINI_API_KEY=AIzaSyDWCu4AJb6BhuLctd_7ne4HIBDbgRBui_g
GOOGLE_API_KEY=AIzaSyDWCu4AJb6BhuLctd_7ne4HIBDbgRBui_g
GEMINI_MODEL=gemini-2.5-flash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

**⚠️ IMPORTANT**: 
- Replace `https://your-frontend.vercel.app` with your actual Vercel frontend URL
- Generate new `JWT_SECRET` and `ENCRYPTION_KEY` (see commands below)

### 🔐 Generate Secure Secrets

Run these commands to generate secure secrets:

```powershell
# Generate JWT_SECRET (64+ characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate ENCRYPTION_KEY (64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 🗑️ Remove .env.production Files

Run the provided script:

```powershell
.\remove-env-production.ps1
```

Or manually:
```powershell
Remove-Item frontend\.env.production -Force
Remove-Item middleware-api\.env.production -Force
```

If files were committed to git:
```bash
git rm --cached frontend/.env.production
git rm --cached middleware-api/.env.production
git commit -m "Security: Remove .env.production files"
```

### 🚀 Deployment Steps

1. **Deploy Backend First**
   - Push code to repository
   - Connect repository to Vercel (Project B)
   - Add all backend environment variables
   - Deploy and note the backend URL (e.g., `https://healthlink-api.vercel.app`)

2. **Deploy Frontend**
   - Connect repository to Vercel (Project A)
   - Add all frontend environment variables
   - **Set `NEXT_PUBLIC_API_URL` to your backend URL from step 1**
   - Deploy

3. **Update CORS**
   - Go back to Backend Project (Project B)
   - Update `CORS_ORIGIN` to include your frontend URL
   - Redeploy backend

### ✅ Post-Deployment Verification

- [ ] Backend health check: `https://your-backend.vercel.app/health`
- [ ] Frontend loads without errors
- [ ] API calls from frontend to backend work
- [ ] No CORS errors in browser console
- [ ] Blockchain transactions work (or timeout gracefully)
- [ ] Database connections work
- [ ] Check Vercel function logs for errors

### 🐛 Troubleshooting

**404 on API calls**: Check `middleware-api/vercel.json` exists and routes are correct

**CORS errors**: Verify `CORS_ORIGIN` includes exact frontend URL (no trailing slash)

**Timeout errors**: Verify Vercel Pro plan for 60s timeout, or implement async transactions

**Env vars not loading**: Ensure variables are set in Vercel Dashboard (not just code), and redeploy

---

See `VERCEL_DEPLOYMENT_FIX.md` for detailed documentation.

