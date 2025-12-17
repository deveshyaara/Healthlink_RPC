# Render Deployment Guide - Environment Variables Setup

## 🚨 Critical: Set Environment Variables in Render Dashboard

Your deployment is failing because environment variables are not configured. Follow these steps:

## Step 1: Access Render Dashboard

1. Go to https://dashboard.render.com
2. Select your `healthlink-middleware-api` service
3. Click **"Environment"** tab in the left sidebar

## Step 2: Add Required Environment Variables

Click **"Add Environment Variable"** and add each of these:

### 🔴 CRITICAL - Must Set These First:

```bash
# Security - GENERATE A SECURE RANDOM STRING!
JWT_SECRET=<Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_EXPIRY=24h

# Database - Copy from .env.production
SUPABASE_URL=https://wpmgqueyuwuvdcavzthg.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_kJXx6swRb4HjzmuVVxg_NQ_VyBiARK4
DATABASE_URL=postgresql://postgres.wpmgqueyuwuvdcavzthg:xwr5w2%24JgH%3Fx%40YF@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.wpmgqueyuwuvdcavzthg:xwr5w2%24JgH%3Fx%40YF@aws-1-ap-south-1.pooler.supabase.com:5432/postgres

# Encryption - Copy from .env.production
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### 🟡 Server Configuration:

```bash
NODE_ENV=production
PORT=3001
API_VERSION=v1
```

### 🟡 Ethereum Configuration:

```bash
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/wtVyTBINEO9Eoc4Dai8Mg
CHAIN_ID=11155111
PRIVATE_KEY=0x0ce524e7a89d96497a0d2ab561be6eca00d0f8a4514d2cf0d33b7907dde4f935
```

### 🟡 Smart Contracts:

```bash
CONTRACT_HEALTHLINK=0xA94AFCbFF804527315391EA52890c826f897A757
CONTRACT_PATIENT_RECORDS=0xC6b6412fcf144Ce107eD79935cdBEfDC5cE1Cc8F
CONTRACT_APPOINTMENTS=0x1A3F11F1735bB703587274478EEc323dC180304a
CONTRACT_PRESCRIPTIONS=0xBC5BfBF99CE6087034863149B04A2593E562854b
CONTRACT_DOCTOR_CREDENTIALS=0x7415A95125b64Ed491088FFE153a8D7773Fb1859
```

### 🟢 AI Agent (Optional - for chatbot):

```bash
GOOGLE_API_KEY=AIzaSyDWCu4AJb6BhuLctd_7ne4HIBDbgRBui_g
GEMINI_API_KEY=AIzaSyDWCu4AJb6BhuLctd_7ne4HIBDbgRBui_g
GEMINI_MODEL=gemini-2.5-flash
LLM_TEMPERATURE=0.2
```

### 🟢 Optional Settings:

```bash
# CORS - Update with your Vercel frontend URL
CORS_ORIGIN=https://healthlink-rpc.vercel.app,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_ATTEMPTS=5

# File Storage
UPLOADS_DIR=./uploads
TEMP_DIR=./temp
MAX_FILE_SIZE_MB=500
ENCRYPTION_ALGORITHM=aes-256-gcm

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# WebSocket
WS_PORT=4001
```

## Step 3: Generate Secure JWT_SECRET

Run this command locally to generate a secure JWT_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as the `JWT_SECRET` value in Render.

## Step 4: Save and Redeploy

1. Click **"Save Changes"** at the bottom
2. Render will automatically redeploy with the new environment variables
3. Wait for the deployment to complete

## Step 5: Verify Deployment

Once deployed, check the logs for:
- ✅ "Environment validation complete"
- ✅ "Ethereum service initialized successfully"
- ✅ "Supabase database connected successfully"
- ✅ "Server started successfully"

## Common Issues:

### Issue: "JWT_SECRET must be set in production environment"
**Solution:** You didn't set JWT_SECRET or used the default value. Generate a new one.

### Issue: "Missing required environment variables"
**Solution:** Check Step 2 and ensure all CRITICAL variables are set.

### Issue: "Database connection failed"
**Solution:** Verify DATABASE_URL and SUPABASE credentials are correct.

## Environment Variables Checklist:

- [ ] JWT_SECRET (generated securely)
- [ ] SUPABASE_URL
- [ ] SUPABASE_SERVICE_KEY
- [ ] DATABASE_URL
- [ ] DIRECT_URL
- [ ] ENCRYPTION_KEY
- [ ] ETHEREUM_RPC_URL
- [ ] PRIVATE_KEY
- [ ] All CONTRACT_* addresses
- [ ] CORS_ORIGIN (with your frontend URL)
- [ ] NODE_ENV=production

## Next Steps After Successful Deployment:

1. Test the API health endpoint: `https://your-app.onrender.com/health`
2. Test authentication: `POST /api/auth/login`
3. Update your frontend `API_BASE_URL` to point to Render URL
4. Test the AI chatbot: `POST /api/chat`

## Security Notes:

⚠️ **NEVER** commit `.env.production` to git
⚠️ **ALWAYS** use Render's environment variables feature
⚠️ **ROTATE** JWT_SECRET regularly in production
⚠️ **USE** AWS Secrets Manager or similar for PRIVATE_KEY in real production

---

Need help? Check Render docs: https://render.com/docs/environment-variables
